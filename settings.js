// Settings Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { getInitials, getHighResPhotoURL } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let userData = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const loginPrompt = document.getElementById('loginPrompt');
const settingsContent = document.getElementById('settingsContent');

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

function showLoadingState() {
    loadingState.style.display = 'block';
    loginPrompt.style.display = 'none';
    settingsContent.style.display = 'none';
}

function showLoginPrompt() {
    loadingState.style.display = 'none';
    loginPrompt.style.display = 'block';
    settingsContent.style.display = 'none';
}

function showSettingsContent() {
    loadingState.style.display = 'none';
    loginPrompt.style.display = 'none';
    settingsContent.style.display = 'block';
}

// ============================================================================
// SETTINGS LOADING
// ============================================================================

async function loadSettings(user) {
    showLoadingState();

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
            userData = userDoc.data();
            populateSettings(userData);
            showSettingsContent();
        } else {
            console.log('User document not found. Redirecting to complete profile setup.');
            alert('Please complete your profile setup by entering your TPV UID.');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showLoginPrompt();
    }
}

function populateSettings(data) {
    // Populate display name
    const nameInput = document.getElementById('settingsName');
    if (nameInput) {
        nameInput.value = data.name || '';
    }

    // Populate profile photo
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    const photoInitials = document.getElementById('photoInitials');

    if (data.photoURL) {
        // Use 200px thumbnail for 100px display (2x for retina)
        photoPreview.src = getHighResPhotoURL(data.photoURL, 200);
        photoPreview.classList.add('visible');
        photoPlaceholder.classList.add('hidden');
    } else {
        photoPreview.classList.remove('visible');
        photoPlaceholder.classList.remove('hidden');
        if (photoInitials && data.name) {
            photoInitials.textContent = getInitials(data.name);
        }
    }

    // Populate Discord settings
    populateDiscordSettings(data);
}

// ============================================================================
// NAME SAVING
// ============================================================================

async function saveName() {
    const nameInput = document.getElementById('settingsName');
    const newName = nameInput.value.trim();

    if (!newName) {
        showStatus('Please enter a display name', 'error');
        return;
    }

    if (newName.length > 50) {
        showStatus('Name must be 50 characters or less', 'error');
        return;
    }

    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            name: newName
        });

        userData.name = newName;

        // Update photo initials if no photo
        const photoPlaceholder = document.getElementById('photoPlaceholder');
        const photoInitials = document.getElementById('photoInitials');
        if (photoPlaceholder && !photoPlaceholder.classList.contains('hidden')) {
            photoInitials.textContent = getInitials(newName);
        }

        showStatus('Name saved successfully', 'success');
    } catch (error) {
        console.error('Error saving name:', error);
        showStatus('Error saving name. Please try again.', 'error');
    }
}

// ============================================================================
// PHOTO UPLOAD
// ============================================================================

async function handlePhotoUpload(file) {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showStatus('Please upload an image file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showStatus('Image size must be less than 5MB', 'error');
        return;
    }

    try {
        showLoadingState();

        // Create a reference to the storage location
        const storageRef = ref(storage, `profile-photos/${currentUser.uid}`);

        // Upload the file
        await uploadBytes(storageRef, file);

        // Get the download URL
        const photoURL = await getDownloadURL(storageRef);

        // Update user document in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: photoURL
        });

        // Update local state
        userData.photoURL = photoURL;

        // Update UI
        const photoPreview = document.getElementById('photoPreview');
        const photoPlaceholder = document.getElementById('photoPlaceholder');

        photoPreview.src = photoURL;
        photoPreview.classList.add('visible');
        photoPlaceholder.classList.add('hidden');

        showSettingsContent();
        showStatus('Profile photo updated successfully', 'success');
    } catch (error) {
        console.error('Error uploading photo:', error);
        showStatus('Error uploading photo. Please try again.', 'error');
        showSettingsContent();
    }
}

function initPhotoUpload() {
    const uploadBtn = document.getElementById('uploadPhotoBtn');
    const fileInput = document.getElementById('photoUpload');

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handlePhotoUpload(file);
        }
    });
}

// ============================================================================
// DISCORD BOT LINKING
// ============================================================================

function populateDiscordSettings(data) {
    const discordEnabled = document.getElementById('discordEnabled');
    const discordLinkSection = document.getElementById('discordLinkSection');
    const discordUnlinkedState = document.getElementById('discordUnlinkedState');
    const discordLinkedState = document.getElementById('discordLinkedState');
    const userUidDisplay = document.getElementById('userUidDisplay');
    const discordLinkedInfo = document.getElementById('discordLinkedInfo');

    // Show user's UID for copying
    if (userUidDisplay && data.uid) {
        userUidDisplay.textContent = data.uid;
    }

    // Set enabled toggle
    if (discordEnabled) {
        discordEnabled.checked = data.discordNotificationsEnabled || false;
    }

    // Show/hide link section based on toggle state
    if (discordLinkSection) {
        discordLinkSection.style.display = discordEnabled.checked ? 'block' : 'none';
    }

    // Show linked or unlinked state
    if (data.discordUserId) {
        // User has linked their Discord
        if (discordUnlinkedState) discordUnlinkedState.style.display = 'none';
        if (discordLinkedState) discordLinkedState.style.display = 'block';

        // Show linked date if available
        if (discordLinkedInfo && data.discordLinkedAt) {
            const linkedDate = data.discordLinkedAt.toDate ?
                data.discordLinkedAt.toDate() :
                new Date(data.discordLinkedAt);
            const formattedDate = linkedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            discordLinkedInfo.textContent = `Linked on ${formattedDate}`;
        }
    } else {
        // User has not linked
        if (discordUnlinkedState) discordUnlinkedState.style.display = 'block';
        if (discordLinkedState) discordLinkedState.style.display = 'none';
    }
}

async function saveDiscordEnabled() {
    const discordEnabled = document.getElementById('discordEnabled').checked;
    const discordLinkSection = document.getElementById('discordLinkSection');

    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            discordNotificationsEnabled: discordEnabled
        });

        userData.discordNotificationsEnabled = discordEnabled;

        // Show/hide link section
        if (discordLinkSection) {
            discordLinkSection.style.display = discordEnabled ? 'block' : 'none';
        }

        showDiscordStatus(
            discordEnabled ? 'Discord notifications enabled' : 'Discord notifications disabled',
            'success'
        );
    } catch (error) {
        console.error('Error saving Discord settings:', error);
        showDiscordStatus('Error saving settings. Please try again.', 'error');
    }
}

function showDiscordStatus(message, type) {
    const statusEl = document.getElementById('discordStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `discord-status ${type}`;
    statusEl.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

function initDiscordSettings() {
    const discordEnabled = document.getElementById('discordEnabled');
    const copyUidBtn = document.getElementById('copyUidBtn');

    // Toggle handler
    if (discordEnabled) {
        discordEnabled.addEventListener('change', saveDiscordEnabled);
    }

    // Copy UID button
    if (copyUidBtn) {
        copyUidBtn.addEventListener('click', async () => {
            const uid = document.getElementById('userUidDisplay').textContent;
            if (uid && uid !== 'Loading...') {
                try {
                    await navigator.clipboard.writeText(uid);
                    showDiscordStatus('UID copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = uid;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showDiscordStatus('UID copied to clipboard!', 'success');
                }
            }
        });
    }
}

// ============================================================================
// READABLE FONT PREFERENCE
// ============================================================================

const READABLE_FONT_KEY = 'tpv_readable_font';

function initReadableFontToggle() {
    const toggle = document.getElementById('readableFontToggle');
    if (!toggle) return;

    // Load saved preference
    const enabled = localStorage.getItem(READABLE_FONT_KEY) === 'true';
    toggle.checked = enabled;
    applyReadableFont(enabled);

    // Handle toggle changes
    toggle.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        localStorage.setItem(READABLE_FONT_KEY, isEnabled);
        applyReadableFont(isEnabled);
        showStatus(
            isEnabled ? 'Readable font enabled' : 'Readable font disabled',
            'success'
        );
    });
}

function applyReadableFont(enabled) {
    document.body.classList.toggle('readable-font', enabled);
}

// ============================================================================
// STATUS NOTIFICATIONS
// ============================================================================

function showStatus(message, type) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    // Style the toast
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: rgba(34, 197, 94, 0.9); color: white;' : ''}
        ${type === 'error' ? 'background: rgba(239, 68, 68, 0.9); color: white;' : ''}
    `;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        await loadSettings(user);
    } else {
        showLoginPrompt();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initPhotoUpload();
    initDiscordSettings();
    initReadableFontToggle();

    // Name save button
    const saveNameBtn = document.getElementById('saveNameBtn');
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', saveName);
    }

    // Also save name on Enter key
    const nameInput = document.getElementById('settingsName');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveName();
            }
        });
    }
});
