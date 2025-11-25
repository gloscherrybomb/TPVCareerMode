// Bot Profile Admin Page
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let auth;
let db;
let storage;
let currentUser = null;
let allProfiles = [];
let editingProfile = null;
let selectedImage = null;

// Initialize Firebase services
async function initializeFirebase() {
    try {
        // Wait for Firebase to be initialized by app.js
        await new Promise((resolve) => {
            const checkFirebase = setInterval(() => {
                if (window.firebaseApp) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        });
        
        auth = getAuth(window.firebaseApp);
        db = getFirestore(window.firebaseApp);
        storage = getStorage(window.firebaseApp);
        
        console.log('Firebase services initialized');
        
        // Check authentication
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user is admin
                const isAdmin = await checkAdminStatus(user.uid);
                
                if (isAdmin) {
                    currentUser = user;
                    showAdminContent();
                    await loadProfiles();
                } else {
                    showUnauthorized();
                }
            } else {
                showUnauthorized();
            }
        });
        
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        showError('Failed to initialize. Please refresh the page.');
    }
}

// Check if user is admin
async function checkAdminStatus(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.isAdmin === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Show/hide UI sections
function showAdminContent() {
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('unauthorized').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
}

function showUnauthorized() {
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('unauthorized').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
}

function showError(message) {
    document.getElementById('authCheck').innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <p style="color: var(--text-primary);">${message}</p>
        </div>
    `;
}

// Load all profiles
async function loadProfiles() {
    try {
        const profilesRef = collection(db, 'botProfiles');
        const snapshot = await getDocs(profilesRef);
        
        allProfiles = [];
        snapshot.forEach((doc) => {
            allProfiles.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by name
        allProfiles.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Loaded ${allProfiles.length} profiles`);
        renderProfilesList(allProfiles);
        updateProfileCount();
        
    } catch (error) {
        console.error('Error loading profiles:', error);
        const listContainer = document.getElementById('profilesList');
        listContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Error loading profiles</p>';
    }
}

// Render profiles list
function renderProfilesList(profiles) {
    const listContainer = document.getElementById('profilesList');
    
    if (profiles.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚴</div>
                <h3>No Profiles Yet</h3>
                <p>Create your first bot profile using the form</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = profiles.map(profile => {
        const arrBadge = getARRBadge(profile.arr);
        const flag = getCountryFlag(profile.nationality);
        
        return `
            <div class="profile-item" data-profile-id="${profile.id}">
                <div class="profile-item-image">
                    ${profile.imageUrl 
                        ? `<img src="${profile.imageUrl}" alt="${profile.name}">` 
                        : `<div class="profile-item-placeholder">🚴</div>`
                    }
                </div>
                <div class="profile-item-info">
                    <div class="profile-item-name">${profile.name}</div>
                    <div class="profile-item-meta">
                        <span>${profile.team}</span>
                        <span class="${arrBadge.class}">${profile.arr}</span>
                        <span>${flag}</span>
                    </div>
                </div>
                <div class="profile-item-actions">
                    <button class="btn btn-secondary btn-small" onclick="editProfile('${profile.id}')">Edit</button>
                    <button class="btn btn-secondary btn-small" onclick="confirmDeleteProfile('${profile.id}')" style="background: #dc3545;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Update profile count
function updateProfileCount() {
    document.getElementById('profileCount').textContent = allProfiles.length;
}

// Handle form submission
document.getElementById('botProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');
    const formMessage = document.getElementById('formMessage');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitSpinner.style.display = 'inline-block';
    formMessage.style.display = 'none';
    
    try {
        // Get form data
        const uid = document.getElementById('botUid').value.trim();
        const name = document.getElementById('botName').value.trim();
        const team = document.getElementById('botTeam').value.trim();
        const arr = parseInt(document.getElementById('botArr').value);
        const gender = document.getElementById('botGender').value;
        const nationality = document.getElementById('botNationality').value;
        const age = document.getElementById('botAge').value ? parseInt(document.getElementById('botAge').value) : null;
        const ridingStyle = document.getElementById('botRidingStyle').value || null;
        const backstory = document.getElementById('botBackstory').value.trim();
        
        let imageUrl = editingProfile ? editingProfile.imageUrl : null;
        
        // Upload image if new one selected
        if (selectedImage) {
            const imageRef = ref(storage, `bot-profiles/${uid}.jpg`);
            await uploadBytes(imageRef, selectedImage);
            imageUrl = await getDownloadURL(imageRef);
        }
        
        // Validate image URL
        if (!imageUrl) {
            throw new Error('Profile image is required');
        }
        
        // Create profile object
        const profile = {
            uid,
            name,
            team,
            arr,
            gender,
            nationality,
            backstory,
            imageUrl,
            updatedAt: new Date().toISOString()
        };
        
        // Add optional fields
        if (age) profile.age = age;
        if (ridingStyle) profile.ridingStyle = ridingStyle;
        
        // Save to Firestore
        await setDoc(doc(db, 'botProfiles', uid), profile);
        
        // Show success message
        formMessage.className = 'form-message success';
        formMessage.textContent = editingProfile 
            ? 'Profile updated successfully!' 
            : 'Profile created successfully!';
        formMessage.style.display = 'block';
        
        // Reset form
        setTimeout(() => {
            resetForm();
            loadProfiles();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        formMessage.className = 'form-message error';
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.style.display = 'block';
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitSpinner.style.display = 'none';
    }
});

// Edit profile
window.editProfile = function(profileId) {
    const profile = allProfiles.find(p => p.id === profileId);
    if (!profile) return;
    
    editingProfile = profile;
    
    // Populate form
    document.getElementById('botUid').value = profile.uid;
    document.getElementById('botUid').disabled = true; // Can't change UID
    document.getElementById('botName').value = profile.name;
    document.getElementById('botTeam').value = profile.team;
    document.getElementById('botArr').value = profile.arr;
    document.getElementById('botGender').value = profile.gender;
    document.getElementById('botNationality').value = profile.nationality;
    document.getElementById('botAge').value = profile.age || '';
    document.getElementById('botRidingStyle').value = profile.ridingStyle || '';
    document.getElementById('botBackstory').value = profile.backstory;
    updateCharCount();
    
    // Show existing image
    if (profile.imageUrl) {
        document.getElementById('existingImage').style.display = 'block';
        document.getElementById('existingImg').src = profile.imageUrl;
    }
    
    // Update form title
    document.getElementById('formTitle').textContent = 'Edit Bot Profile';
    document.getElementById('resetForm').style.display = 'inline-block';
    document.getElementById('submitText').textContent = 'Update Profile';
    
    // Scroll to form
    document.querySelector('.admin-form-container').scrollIntoView({ behavior: 'smooth' });
};

// Delete profile
window.confirmDeleteProfile = function(profileId) {
    const profile = allProfiles.find(p => p.id === profileId);
    if (!profile) return;
    
    const modal = document.getElementById('deleteModal');
    const deleteInfo = document.getElementById('deleteProfileInfo');
    
    deleteInfo.innerHTML = `
        <strong>${profile.name}</strong><br>
        <small style="color: var(--text-secondary);">${profile.team} • ARR ${profile.arr}</small>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Set up delete handler
    document.getElementById('confirmDelete').onclick = async () => {
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'botProfiles', profile.uid));
            
            // Try to delete image from Storage (may fail if image doesn't exist)
            try {
                const imageRef = ref(storage, `bot-profiles/${profile.uid}.jpg`);
                await deleteObject(imageRef);
            } catch (err) {
                console.log('Image deletion skipped:', err.message);
            }
            
            // Reload profiles
            await loadProfiles();
            
            // Close modal
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
        } catch (error) {
            console.error('Error deleting profile:', error);
            alert('Error deleting profile: ' + error.message);
        }
    };
};

// Reset form
window.resetForm = function() {
    document.getElementById('botProfileForm').reset();
    document.getElementById('botUid').disabled = false;
    document.getElementById('formTitle').textContent = 'Add New Bot Profile';
    document.getElementById('resetForm').style.display = 'none';
    document.getElementById('submitText').textContent = 'Save Profile';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('existingImage').style.display = 'none';
    document.getElementById('formMessage').style.display = 'none';
    document.getElementById('imageFileName').textContent = 'No file chosen';
    editingProfile = null;
    selectedImage = null;
    updateCharCount();
};

document.getElementById('resetForm').addEventListener('click', resetForm);

// Image selection
document.getElementById('botImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB');
        e.target.value = '';
        return;
    }
    
    // Validate file type
    if (!file.type.match('image/(jpeg|png|webp)')) {
        alert('Image must be JPG, PNG, or WebP');
        e.target.value = '';
        return;
    }
    
    selectedImage = file;
    document.getElementById('imageFileName').textContent = file.name;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
});

// Clear image
window.clearImage = function() {
    document.getElementById('botImage').value = '';
    document.getElementById('imageFileName').textContent = 'No file chosen';
    document.getElementById('imagePreview').style.display = 'none';
    selectedImage = null;
};

// Character count
document.getElementById('botBackstory').addEventListener('input', updateCharCount);

function updateCharCount() {
    const text = document.getElementById('botBackstory').value;
    document.getElementById('charCount').textContent = text.length;
}

// Preview modal
document.getElementById('previewBtn').addEventListener('click', () => {
    const name = document.getElementById('botName').value.trim();
    const team = document.getElementById('botTeam').value.trim();
    const arr = parseInt(document.getElementById('botArr').value) || 0;
    const nationality = document.getElementById('botNationality').value;
    const age = document.getElementById('botAge').value;
    const ridingStyle = document.getElementById('botRidingStyle').value;
    const backstory = document.getElementById('botBackstory').value.trim();
    
    if (!name || !team || !arr || !nationality || !backstory) {
        alert('Please fill in all required fields before previewing');
        return;
    }
    
    const arrBadge = getARRBadge(arr);
    const flag = getCountryFlag(nationality);
    const backstoryParagraphs = backstory.split('\n\n').map(p => `<p>${p}</p>`).join('');
    
    const previewImageSrc = selectedImage 
        ? URL.createObjectURL(selectedImage) 
        : (editingProfile && editingProfile.imageUrl ? editingProfile.imageUrl : '');
    
    const modalBody = document.getElementById('previewModalBody');
    modalBody.innerHTML = `
        <div class="modal-profile-header">
            ${previewImageSrc 
                ? `<img src="${previewImageSrc}" alt="${name}">` 
                : `<div class="modal-profile-header-placeholder">🚴</div>`
            }
        </div>
        <div class="modal-profile-details">
            <h2 class="modal-profile-name">${name}</h2>
            <div class="modal-profile-meta">
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Team</div>
                    <div class="modal-meta-value">${team}</div>
                </div>
                <div class="modal-meta-item">
                    <div class="modal-meta-label">ARR</div>
                    <div class="modal-meta-value arr-value ${arrBadge.class}">${arr}</div>
                </div>
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Nationality</div>
                    <div class="modal-meta-value">${flag} ${nationality}</div>
                </div>
                ${age ? `
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Age</div>
                    <div class="modal-meta-value">${age}</div>
                </div>
                ` : ''}
                ${ridingStyle ? `
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Riding Style</div>
                    <div class="modal-meta-value">${ridingStyle}</div>
                </div>
                ` : ''}
            </div>
            <div class="modal-profile-backstory">
                <h3 class="modal-backstory-title">Backstory</h3>
                <div class="modal-backstory-text">
                    ${backstoryParagraphs}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('previewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Search profiles
document.getElementById('searchProfiles').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    
    if (!term) {
        renderProfilesList(allProfiles);
        return;
    }
    
    const filtered = allProfiles.filter(profile => {
        return (
            profile.name.toLowerCase().includes(term) ||
            profile.team.toLowerCase().includes(term) ||
            profile.nationality.toLowerCase().includes(term) ||
            profile.uid.toLowerCase().includes(term)
        );
    });
    
    renderProfilesList(filtered);
});

// Modal close handlers
document.getElementById('previewModalClose').addEventListener('click', () => {
    document.getElementById('previewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

document.getElementById('previewModalOverlay').addEventListener('click', () => {
    document.getElementById('previewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

document.getElementById('deleteModalClose').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

document.getElementById('deleteModalOverlay').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Helper functions
function getARRBadge(arr) {
    if (arr >= 1451) return { class: 'arr-badge-platinum', label: 'Platinum' };
    if (arr >= 1321) return { class: 'arr-badge-gold', label: 'Gold' };
    if (arr >= 1196) return { class: 'arr-badge-silver', label: 'Silver' };
    return { class: 'arr-badge-bronze', label: 'Bronze' };
}

function getCountryFlag(countryCode) {
    const flags = {
        'GB': '🇬🇧', 'US': '🇺🇸', 'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹',
        'DE': '🇩🇪', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AU': '🇦🇺', 'CA': '🇨🇦',
        'JP': '🇯🇵', 'CN': '🇨🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷',
        'CL': '🇨🇱', 'CO': '🇨🇴', 'DK': '🇩🇰', 'SE': '🇸🇪', 'NO': '🇳🇴',
        'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'AT': '🇦🇹', 'CH': '🇨🇭',
        'PT': '🇵🇹', 'IE': '🇮🇪', 'NZ': '🇳🇿', 'SG': '🇸🇬', 'KR': '🇰🇷'
    };
    return flags[countryCode] || '🌍';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
});
