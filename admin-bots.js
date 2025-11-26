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

// ------- Country / Flag helpers -------

// Display names for ISO region codes
const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Custom pseudo-countries for UK nations (not ISO-3166)
const customCountries = [
    { code: "ENG", name: "England" },
    { code: "SCO", name: "Scotland" },
    { code: "WLS", name: "Wales" },
    { code: "NIR", name: "Northern Ireland" }
];

/**
 * Returns a human-readable country name for a given code.
 * Falls back to the code itself if no name is found.
 */
function getCountryName(code) {
    if (!code) return '';
    const upper = code.toUpperCase();

    // Check custom UK nations
    const custom = customCountries.find(c => c.code === upper);
    if (custom) return custom.name;

    const name = countryDisplayNames.of(upper);
    return name && name !== upper ? name : upper;
}

/**
 * Emoji flag generator for ISO codes (used as a fallback where SVGs aren’t available,
 * and in the <select> where images are not supported).
 */
function getEmojiFlag(countryCode) {
    return countryCode
        .toUpperCase()
        .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}

/**
 * Returns HTML string for a flag icon using SVG, falling back to emoji.
 * - For 2-letter ISO codes: uses SVG from assets/flags/{lowercase}.svg
 * - For ENG/SCO/WLS: uses england.svg / scotland.svg / wales.svg
 * - For NIR: uses emoji
 */
function getCountryFlag(code) {
    if (!code) return '🌍';

    const upper = code.toUpperCase();

    // Custom UK nations → custom SVGs (except NIR which stays emoji)
    if (upper === 'ENG') {
        return `<img class="flag-icon" src="assets/flags/england.svg" alt="England flag" loading="lazy">`;
    }
    if (upper === 'SCO') {
        return `<img class="flag-icon" src="assets/flags/scotland.svg" alt="Scotland flag" loading="lazy">`;
    }
    if (upper === 'WLS') {
        return `<img class="flag-icon" src="assets/flags/wales.svg" alt="Wales flag" loading="lazy">`;
    }
    if (upper === 'NIR') {
        // If you later add northern-ireland.svg, you can swap this to an <img> too.
        return '🚩';
    }

    // 2-letter ISO code → use SVG if possible
    if (upper.length === 2) {
        const name = getCountryName(upper);
        // IMPORTANT: path relative to admin-bots.html
        const src = `assets/flags/${upper.toLowerCase()}.svg`;
        return `<img class="flag-icon" src="${src}" alt="${name} flag" loading="lazy">`;
    }

    // Fallback to emoji for anything else
    try {
        return getEmojiFlag(upper);
    } catch {
        return '🌍';
    }
}

/**
 * Populates the nationality <select> with:
 *  - All valid ISO countries (using Intl.DisplayNames)
 *  - Custom UK nations (ENG, SCO, WLS, NIR)
 * The <select> shows emoji + name (since images are not supported in <option>),
 * but we still store the 2–3 letter code in value.
 */
function loadAllCountries() {
    const select = document.getElementById('botNationality');
    if (!select) return;

    select.innerHTML = '<option value="">Select nationality</option>';

    const entries = [];

    // --- ISO countries ---
    const isoCodes = Array.from({ length: 26 * 26 }, (_, i) => {
        const first = 65 + Math.floor(i / 26);
        const second = 65 + (i % 26);
        return String.fromCharCode(first) + String.fromCharCode(second);
    }).filter(code => {
        const name = countryDisplayNames.of(code);
        return !!name && name !== code;
    });

    isoCodes.forEach(code => {
        const name = countryDisplayNames.of(code);
        const emoji = getEmojiFlag(code);
        entries.push({
            code,
            name,
            label: `${emoji} ${name}`
        });
    });

    // --- Custom UK nations ---
    customCountries.forEach(c => {
        let emoji = '';
        if (c.code === 'ENG') emoji = '🏴 ';
        else if (c.code === 'SCO') emoji = '🏴 ';
        else if (c.code === 'WLS') emoji = '🏴 ';
        else if (c.code === 'NIR') emoji = '🚩 ';

        entries.push({
            code: c.code,
            name: c.name,
            label: `${emoji}${c.name}`
        });
    });

    // Sort by country name
    entries.sort((a, b) => a.name.localeCompare(b.name));

    // Add to <select>
    for (const entry of entries) {
        const option = document.createElement('option');
        option.value = entry.code;
        option.textContent = entry.label;
        select.appendChild(option);
    }
}

/**
 * Normalize nationality from CSV or other free-form input into:
 *  - 2-letter ISO code (e.g. GB, FR)
 *  - or one of ENG, SCO, WLS, NIR
 * Returns '' if it can't resolve to a valid code.
 */
function normalizeNationality(raw) {
    if (!raw) return '';
    let v = String(raw).trim();
    if (!v) return '';

    const lower = v.toLowerCase();

    // 2-letter ISO code (any case)
    if (/^[a-z]{2}$/i.test(v)) {
        return v.toUpperCase();
    }

    // Common names / synonyms → custom codes or GB
    const directMap = {
        'england': 'ENG',
        'scotland': 'SCO',
        'wales': 'WLS',
        'northern ireland': 'NIR',
        'great britain': 'GB',
        'united kingdom': 'GB',
        'uk': 'GB',
        'britain': 'GB'
    };
    if (directMap[lower]) {
        return directMap[lower];
    }

    // Try to match against ISO country names via Intl.DisplayNames
    // (slow-ish but fine for CSV import scale)
    const isoCodes = Array.from({ length: 26 * 26 }, (_, i) => {
        const first = 65 + Math.floor(i / 26);
        const second = 65 + (i % 26);
        return String.fromCharCode(first) + String.fromCharCode(second);
    });

    for (const code of isoCodes) {
        const name = countryDisplayNames.of(code);
        if (name && name.toLowerCase() === lower) {
            return code;
        }
    }

    // No match found
    console.warn('Unrecognized nationality value:', raw);
    return '';
}

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
        snapshot.forEach((docSnap) => {
            allProfiles.push({
                id: docSnap.id,
                ...docSnap.data()
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
        const flagHtml = getCountryFlag(profile.nationality);
        
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
                        <span class="profile-flag">${flagHtml}</span>
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

// ===== AI IMAGE PROMPT GENERATOR =====

// Nationality to ethnicity mapping for prompt generation
const nationalityToEthnicity = {
    'BER': 'African-Bermudan, dark brown skin',
    'BM': 'African-Bermudan, dark brown skin',
    'SCO': 'Scottish, fair skin',
    'FRA': 'French, light olive skin',
    'FR': 'French, light olive skin',
    'CHN': 'Chinese, East Asian features',
    'CN': 'Chinese, East Asian features',
    'BRA': 'Brazilian, tan skin, South American features',
    'BR': 'Brazilian, tan skin, South American features',
    'ISV': 'Caribbean, dark brown skin',
    'VG': 'Caribbean, dark brown skin',
    'CZE': 'Czech, fair skin, Eastern European features',
    'CZ': 'Czech, fair skin, Eastern European features',
    'ISR': 'Israeli, olive skin, Middle Eastern features',
    'IL': 'Israeli, olive skin, Middle Eastern features',
    'ENG': 'English, fair to medium skin',
    'FIN': 'Finnish, fair skin, Nordic features',
    'FI': 'Finnish, fair skin, Nordic features',
    'NZL': 'New Zealand, mixed ethnicity, tan skin',
    'NZ': 'New Zealand, mixed ethnicity, tan skin',
    'ITA': 'Italian, olive skin, Mediterranean features',
    'IT': 'Italian, olive skin, Mediterranean features',
    'ESP': 'Spanish, olive skin, Mediterranean features',
    'ES': 'Spanish, olive skin, Mediterranean features',
    'IRL': 'Irish, fair skin with freckles',
    'IE': 'Irish, fair skin with freckles',
    'KOR': 'Korean, East Asian features',
    'KR': 'Korean, East Asian features',
    'ALG': 'Algerian, olive to tan skin, North African features',
    'DZ': 'Algerian, olive to tan skin, North African features',
    'AND': 'Andorran, olive skin, Mediterranean features',
    'AD': 'Andorran, olive skin, Mediterranean features',
    'UKR': 'Ukrainian, fair skin, Eastern European features',
    'UA': 'Ukrainian, fair skin, Eastern European features',
    'GER': 'German, fair to medium skin',
    'DE': 'German, fair to medium skin',
    'MAS': 'Malaysian, Southeast Asian features, tan skin',
    'MY': 'Malaysian, Southeast Asian features, tan skin',
    'AUT': 'Austrian, fair to medium skin',
    'AT': 'Austrian, fair to medium skin',
    'USA': 'American, diverse features',
    'US': 'American, diverse features',
    'GBR': 'British, fair to medium skin',
    'GB': 'British, fair to medium skin',
    'NED': 'Dutch, fair to medium skin',
    'NL': 'Dutch, fair to medium skin',
    'SUI': 'Swiss, fair to medium skin',
    'CH': 'Swiss, fair to medium skin',
    'BEL': 'Belgian, fair to medium skin',
    'BE': 'Belgian, fair to medium skin',
    'DEN': 'Danish, fair skin, Nordic features',
    'DK': 'Danish, fair skin, Nordic features',
    'SWE': 'Swedish, fair skin, Nordic features',
    'SE': 'Swedish, fair skin, Nordic features',
    'NOR': 'Norwegian, fair skin, Nordic features',
    'NO': 'Norwegian, fair skin, Nordic features',
    'POL': 'Polish, fair to medium skin, Eastern European features',
    'PL': 'Polish, fair to medium skin, Eastern European features',
    'POR': 'Portuguese, olive skin, Mediterranean features',
    'PT': 'Portuguese, olive skin, Mediterranean features',
    'AUS': 'Australian, diverse features',
    'AU': 'Australian, diverse features',
    'CAN': 'Canadian, diverse features',
    'CA': 'Canadian, diverse features',
    'JPN': 'Japanese, East Asian features',
    'JP': 'Japanese, East Asian features',
    'MEX': 'Mexican, tan skin, Latin American features',
    'MX': 'Mexican, tan skin, Latin American features',
    'ARG': 'Argentinian, diverse features, South American',
    'AR': 'Argentinian, diverse features, South American',
    'RSA': 'South African, diverse features',
    'ZA': 'South African, diverse features',
};

// Generate AI image prompt based on bot details
window.generateImagePrompt = function() {
    // Get form values
    const name = document.getElementById('botName').value.trim();
    const nationality = document.getElementById('botNationality').value.toUpperCase();
    const gender = document.getElementById('botGender').value;
    const team = document.getElementById('botTeam').value.trim() || 'Independent';
    const arr = parseInt(document.getElementById('botArr').value);
    
    // Validate required fields
    if (!name || !nationality || !gender) {
        alert('Please fill in Name, Nationality, and Gender first');
        return;
    }
    
    // Get ethnicity description
    const ethnicityDesc = nationalityToEthnicity[nationality] || 'diverse features';
    
    // Determine age range based on ARR (rough estimate)
    let ageRange = 'late 20s to early 30s';
    if (arr < 1000) {
        ageRange = 'early to mid 20s';
    } else if (arr > 1200) {
        ageRange = 'late 30s to early 40s';
    }
    
    // Hair style based on gender
    const hairStyle = gender === 'Female' ? 'ponytail' : 'short athletic haircut';
    const genderDesc = gender === 'Female' ? 'female cyclist' : 'male cyclist';
    
    // Build prompt
    const prompt = `Professional cycling portrait, cartoon illustration style, ${ethnicityDesc}, ${genderDesc} in ${ageRange}, ${hairStyle}, athletic build, wearing ${team} team cycling jersey, confident expression, studio lighting, head and shoulders portrait, digital art, vibrant colors, clean gradient background, professional sports photography style, 4K quality`;
    
    // Display prompt
    document.getElementById('generatedPrompt').textContent = prompt;
    document.getElementById('imagePromptResult').style.display = 'block';
    
    console.log('Generated prompt:', prompt);
};

// Copy prompt to clipboard
window.copyPromptToClipboard = function() {
    const prompt = document.getElementById('generatedPrompt').textContent;
    
    navigator.clipboard.writeText(prompt).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#00ba7c';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
};

// ===== IMAGE RESIZING =====

// Resize image if larger than 800x800
async function resizeImageIfNeeded(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                
                console.log(`Original image size: ${width}x${height}`);
                
                // If image is 800x800 or smaller, return original
                if (width <= 800 && height <= 800) {
                    console.log('Image is already 800x800 or smaller, no resize needed');
                    resolve(file);
                    return;
                }
                
                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Target dimensions (800x800)
                const targetWidth = 800;
                const targetHeight = 800;
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                // Calculate aspect ratios
                const imgAspect = width / height;
                const canvasAspect = targetWidth / targetHeight;
                
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                
                // Cover-fit: fill canvas, crop excess
                if (imgAspect > canvasAspect) {
                    // Image is wider - fit height, crop sides
                    drawHeight = targetHeight;
                    drawWidth = width * (targetHeight / height);
                    offsetX = (targetWidth - drawWidth) / 2;
                } else {
                    // Image is taller - fit width, crop top/bottom
                    drawWidth = targetWidth;
                    drawHeight = height * (targetWidth / width);
                    offsetY = (targetHeight - drawHeight) / 2;
                }
                
                // Draw resized image
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create image blob'));
                        return;
                    }
                    
                    // Create new File object with original name
                    const resizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    console.log(`Resized to 800x800, size: ${(resizedFile.size / 1024).toFixed(2)}KB (was ${(file.size / 1024).toFixed(2)}KB)`);
                    resolve(resizedFile);
                }, 'image/jpeg', 0.85); // 85% quality
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

// Image selection
document.getElementById('botImage').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 5MB before resizing)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        e.target.value = '';
        return;
    }
    
    // Validate file type
    if (!file.type.match('image/(jpeg|png|webp)')) {
        alert('Image must be JPG, PNG, or WebP');
        e.target.value = '';
        return;
    }
    
    try {
        // Resize image if needed
        const processedFile = await resizeImageIfNeeded(file);
        
        selectedImage = processedFile;
        document.getElementById('imageFileName').textContent = file.name + 
            (processedFile !== file ? ' (resized to 800x800)' : '');
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('previewImg').src = ev.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(processedFile);
    } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image: ' + error.message);
        e.target.value = '';
    }
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
    const flagHtml = getCountryFlag(nationality);
    const nationalityName = getCountryName(nationality);
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
                    <div class="modal-meta-value">
                        <span class="profile-flag">${flagHtml}</span>
                        <span>${nationalityName}</span>
                    </div>
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
            (profile.nationality && profile.nationality.toLowerCase().includes(term)) ||
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Populate nationality select with all countries + UK nations
    loadAllCountries();

    // Search/filter inside nationality dropdown
    const searchInput = document.getElementById('botNationalitySearch');
    const select = document.getElementById('botNationality');

    if (searchInput && select) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();

            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];

                // Always show the placeholder
                if (i === 0) {
                    option.hidden = false;
                    continue;
                }

                const text = option.textContent.toLowerCase();
                option.hidden = term && !text.includes(term);
            }
        });
    }

    // Firebase & CSV handlers
    initializeFirebase();
    
    // CSV upload handler
    document.getElementById('csvFile').addEventListener('change', handleCSVUpload);
    
    // Download template
    document.getElementById('downloadTemplate').addEventListener('click', (e) => {
        e.preventDefault();
        downloadCSVTemplate();
    });
});

// CSV Template Download
function downloadCSVTemplate() {
    const template = `uid,name,team,arr,gender,nationality,backstory,imageUrl,age,ridingStyle
Bot123ABC,Marco DiCicco,Formix,1250,Male,IT,"Born in Tuscany where he hauled cheese wheels uphill daily. Now he climbs mountains instead.

His teammates call him The Wheel for his consistency though some suspect it's because he smells like Parmesan.",https://example.com/marco.jpg,28,Climber
Bot456DEF,Sarah Thompson,Swift Racing,1380,Female,GB,"Started cycling to escape her job as a competitive tea taster in Yorkshire. Discovered she had extraordinary endurance.

She once rode 200km to prove British weather builds character. Her Instagram posts about finding your inner brew have gone viral.",https://example.com/sarah.jpg,32,All-Rounder`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bot-profiles-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Handle CSV Upload
async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('csvFileName').textContent = file.name;
    
    try {
        const text = await file.text();
        const profiles = parseCSV(text);
        
        if (profiles.length === 0) {
            alert('No valid profiles found in CSV');
            return;
        }
        
        await batchUploadProfiles(profiles);
        
    } catch (error) {
        console.error('Error reading CSV:', error);
        alert('Error reading CSV file: ' + error.message);
    }
}

// Parse CSV
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const profiles = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle quoted fields with commas
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        // Create profile object
        const profile = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            // Replace \n\n with actual line breaks
            if (header === 'backstory') {
                value = value.replace(/\\n\\n/g, '\n\n');
            }
            // Normalize nationality
            if (header === 'nationality') {
                value = normalizeNationality(value);
            }
            // Convert numeric fields
            if (header === 'arr' || header === 'age') {
                value = value ? parseInt(value) : null;
            }
            profile[header] = value;
        });
        
        // Validate required fields
        if (profile.uid && profile.name && profile.team && profile.arr && 
            profile.gender && profile.nationality && profile.backstory) {
            profiles.push(profile);
        } else {
            console.warn('Skipping invalid profile row (required field missing or nationality invalid):', profile);
        }
    }
    
    return profiles;
}

// Batch Upload Profiles
async function batchUploadProfiles(profiles) {
    const progressSection = document.getElementById('csvProgress');
    const progressBar = document.getElementById('csvProgressBar');
    const progressText = document.getElementById('csvProgressText');
    const resultsSection = document.getElementById('csvResults');
    
    progressSection.style.display = 'block';
    resultsSection.style.display = 'block';
    resultsSection.innerHTML = '';
    
    let completed = 0;
    const results = [];
    
    for (const profile of profiles) {
        try {
            // Ensure nationality is normalized (in case this function is used with other sources)
            const nationality = normalizeNationality(profile.nationality);
            if (!nationality) {
                throw new Error('Invalid nationality code in CSV (could not resolve to ISO or ENG/SCO/WLS/NIR)');
            }

            // Create profile object
            const profileData = {
                uid: profile.uid,
                name: profile.name,
                team: profile.team,
                arr: profile.arr,
                gender: profile.gender,
                nationality,
                backstory: profile.backstory,
                imageUrl: profile.imageUrl || '',
                updatedAt: new Date().toISOString()
            };
            
            // Add optional fields
            if (profile.age) profileData.age = profile.age;
            if (profile.ridingStyle) profileData.ridingStyle = profile.ridingStyle;
            
            // Save to Firestore
            await setDoc(doc(db, 'botProfiles', profile.uid), profileData);
            
            results.push({
                success: true,
                name: profile.name,
                message: 'Successfully created'
            });
            
        } catch (error) {
            console.error('Error creating profile:', profile.name, error);
            results.push({
                success: false,
                name: profile.name,
                message: error.message
            });
        }
        
        completed++;
        const progress = (completed / profiles.length) * 100;
        progressBar.style.width = progress + '%';
        progressText.textContent = `Processing: ${completed}/${profiles.length}`;
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Display results
    resultsSection.innerHTML = results.map(result => `
        <div class="csv-result-item ${result.success ? 'success' : 'error'}">
            <strong>${result.name}:</strong> ${result.message}
        </div>
    `).join('');
    
    // Reload profiles list
    await loadProfiles();
    
    // Reset file input
    document.getElementById('csvFile').value = '';
    document.getElementById('csvFileName').textContent = 'No file chosen';
}
