// Settings Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { getInitials } from './utils.js';
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
            console.error('User document not found');
            showLoginPrompt();
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
        photoPreview.src = data.photoURL;
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
    const discordEnabled = document.getElementById('discordEnabled');
    const webhookUrl = document.getElementById('discordWebhookUrl');
    const webhookSection = document.getElementById('webhookSection');

    if (discordEnabled) {
        discordEnabled.checked = data.discordNotificationsEnabled || false;

        // Show/hide webhook section based on toggle state
        if (webhookSection) {
            webhookSection.style.display = discordEnabled.checked ? 'block' : 'none';
        }
    }

    if (webhookUrl) {
        webhookUrl.value = data.discordWebhookUrl || '';
    }
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
// DISCORD WEBHOOK SETTINGS
// ============================================================================

// Validate Discord webhook URL format
function isValidDiscordWebhook(url) {
    if (!url) return false;
    const pattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    return pattern.test(url);
}

async function saveDiscordSettings() {
    const discordEnabled = document.getElementById('discordEnabled').checked;
    const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();

    // Validate webhook URL if enabled
    if (discordEnabled && !isValidDiscordWebhook(webhookUrl)) {
        showWebhookStatus('Invalid Discord webhook URL. Please check the format.', 'error');
        return;
    }

    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            discordNotificationsEnabled: discordEnabled,
            discordWebhookUrl: discordEnabled ? webhookUrl : null
        });

        userData.discordNotificationsEnabled = discordEnabled;
        userData.discordWebhookUrl = discordEnabled ? webhookUrl : null;

        showWebhookStatus('Discord settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving Discord settings:', error);
        showWebhookStatus('Error saving settings. Please try again.', 'error');
    }
}

async function sendTestNotification() {
    const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();

    if (!isValidDiscordWebhook(webhookUrl)) {
        showWebhookStatus('Please enter a valid webhook URL first', 'error');
        return;
    }

    showWebhookStatus('Sending test notification...', 'loading');

    try {
        const testEmbed = {
            title: 'Test Notification - TPV Career Mode',
            description: 'Your Discord notifications are set up correctly! You will receive race result notifications here.',
            color: 0x45CAFF, // Blue
            fields: [
                {
                    name: 'Position',
                    value: '5th',
                    inline: true
                },
                {
                    name: 'Points',
                    value: '45 (+3 bonus)',
                    inline: true
                },
                {
                    name: 'Race Recap',
                    value: 'This is what your race notifications will look like. The recap will include a short summary of your race performance...',
                    inline: false
                }
            ],
            footer: {
                text: 'TPV Career Mode'
            },
            timestamp: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                embeds: [testEmbed],
                components: [{
                    type: 1,
                    components: [{
                        type: 2,
                        style: 5,
                        label: 'View Full Results',
                        url: 'https://tpvcareermode.com/profile.html'
                    }]
                }]
            })
        });

        if (response.ok) {
            showWebhookStatus('Test notification sent! Check your Discord channel.', 'success');
        } else if (response.status === 404) {
            showWebhookStatus('Webhook not found. It may have been deleted from Discord.', 'error');
        } else if (response.status === 429) {
            showWebhookStatus('Rate limited. Please wait a moment and try again.', 'error');
        } else {
            showWebhookStatus(`Failed to send: ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
        showWebhookStatus('Error sending test. Check that the webhook URL is correct.', 'error');
    }
}

function showWebhookStatus(message, type) {
    const statusEl = document.getElementById('webhookStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `webhook-status ${type}`;
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
    const webhookSection = document.getElementById('webhookSection');
    const saveWebhookBtn = document.getElementById('saveWebhookBtn');
    const testWebhookBtn = document.getElementById('testWebhookBtn');

    // Toggle webhook section visibility
    if (discordEnabled && webhookSection) {
        discordEnabled.addEventListener('change', async () => {
            webhookSection.style.display = discordEnabled.checked ? 'block' : 'none';

            // If disabling, save immediately
            if (!discordEnabled.checked) {
                await saveDiscordSettings();
            }
        });
    }

    // Save webhook button
    if (saveWebhookBtn) {
        saveWebhookBtn.addEventListener('click', saveDiscordSettings);
    }

    // Test webhook button
    if (testWebhookBtn) {
        testWebhookBtn.addEventListener('click', sendTestNotification);
    }
}

// ============================================================================
// SETUP GUIDE TOGGLE
// ============================================================================

function initSetupGuide() {
    const toggleBtn = document.getElementById('setupGuideToggle');
    const content = document.getElementById('setupGuideContent');

    if (!toggleBtn || !content) return;

    toggleBtn.addEventListener('click', () => {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        toggleBtn.classList.toggle('expanded', !isExpanded);
    });
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
    initSetupGuide();

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
