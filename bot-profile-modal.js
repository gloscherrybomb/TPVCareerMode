// Reusable Bot Profile Modal
// Import this module on any page to enable bot profile viewing
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let db;
let modalInitialized = false;

// Initialize modal
function initializeBotModal() {
    if (modalInitialized) return;
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal" id="botProfileModal">
            <div class="modal-overlay" id="botProfileModalOverlay"></div>
            <div class="modal-content profile-modal-content">
                <button class="modal-close" id="botProfileModalClose">&times;</button>
                <div id="botProfileModalBody" class="profile-modal-body">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('botProfileModalClose').addEventListener('click', closeBotModal);
    document.getElementById('botProfileModalOverlay').addEventListener('click', closeBotModal);
    
    // Add required CSS if not already present
    if (!document.getElementById('bot-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'bot-modal-styles';
        styles.textContent = `
            .bot-name-link {
                color: var(--accent-blue);
                cursor: pointer;
                text-decoration: none;
                transition: color 0.3s ease;
            }
            .bot-name-link:hover {
                color: var(--text-primary);
                text-decoration: underline;
            }
        `;
        document.head.appendChild(styles);
    }
    
    modalInitialized = true;
}

// Initialize Firestore
async function initializeFirestore() {
    if (db) return;
    
    // Wait for Firebase to be initialized
    await new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebaseApp) {
                clearInterval(checkFirebase);
                resolve();
            }
        }, 100);
    });
    
    db = getFirestore(window.firebaseApp);
}

// Open bot profile modal
async function openBotProfile(botUid) {
    console.log('Opening bot profile:', botUid);
    
    // Initialize modal if needed
    initializeBotModal();
    
    // Initialize Firestore if needed
    await initializeFirestore();
    
    const modal = document.getElementById('botProfileModal');
    const modalBody = document.getElementById('botProfileModalBody');
    
    // Show modal with loading state
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading profile...</p>
        </div>
    `;
    
    try {
        // Fetch profile from Firestore
        const profileDoc = await getDoc(doc(db, 'botProfiles', botUid));
        
        if (!profileDoc.exists()) {
            // Profile not found
            modalBody.innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🚴</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Profile Not Available</h3>
                    <p style="color: var(--text-secondary);">This rider's profile hasn't been added yet.</p>
                </div>
            `;
            return;
        }
        
        const profile = profileDoc.data();
        
        // Render profile
        const arrBadge = getARRBadge(profile.arr);
        const flag = getCountryFlag(profile.nationality);
        const backstoryParagraphs = profile.backstory 
            ? profile.backstory.split('\n\n').map(p => `<p>${p}</p>`).join('') 
            : '<p>No backstory available.</p>';
        
        modalBody.innerHTML = `
            <div class="modal-profile-header">
                ${profile.imageUrl 
                    ? `<img src="${profile.imageUrl}" alt="${profile.name}">` 
                    : `<div class="modal-profile-header-placeholder">🚴</div>`
                }
            </div>
            <div class="modal-profile-details">
                <h2 class="modal-profile-name">${profile.name}</h2>
                <div class="modal-profile-meta">
                    <div class="modal-meta-item">
                        <div class="modal-meta-label">Team</div>
                        <div class="modal-meta-value">${profile.team || 'No Team'}</div>
                    </div>
                    <div class="modal-meta-item">
                        <div class="modal-meta-label">ARR</div>
                        <div class="modal-meta-value arr-value ${arrBadge.class}">${profile.arr}</div>
                    </div>
                    ${profile.nationality ? `
                    <div class="modal-meta-item">
                        <div class="modal-meta-label">Nationality</div>
                        <div class="modal-meta-value">${flag} ${profile.nationality}</div>
                    </div>
                    ` : ''}
                    ${profile.age ? `
                    <div class="modal-meta-item">
                        <div class="modal-meta-label">Age</div>
                        <div class="modal-meta-value">${profile.age}</div>
                    </div>
                    ` : ''}
                    ${profile.ridingStyle ? `
                    <div class="modal-meta-item">
                        <div class="modal-meta-label">Riding Style</div>
                        <div class="modal-meta-value">${profile.ridingStyle}</div>
                    </div>
                    ` : ''}
                </div>
                ${profile.backstory ? `
                <div class="modal-profile-backstory">
                    <h3 class="modal-backstory-title">Backstory</h3>
                    <div class="modal-backstory-text">
                        ${backstoryParagraphs}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading bot profile:', error);
        modalBody.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Error Loading Profile</h3>
                <p style="color: var(--text-secondary);">${error.message}</p>
            </div>
        `;
    }
}

// Close bot profile modal
function closeBotModal() {
    const modal = document.getElementById('botProfileModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Check if rider is a bot (UID starts with "Bot")
function isBot(uid) {
    return uid && uid.startsWith('Bot');
}

// Make rider name clickable if it's a bot
function makeNameClickable(name, uid) {
    if (isBot(uid)) {
        return `<span class="bot-name-link" onclick="window.openBotProfile('${uid}')">${name}</span>`;
    }
    return name;
}

// Helper functions
function getARRBadge(arr) {
    if (arr >= 1451) return { class: 'arr-badge-platinum', label: 'Platinum' };
    if (arr >= 1321) return { class: 'arr-badge-gold', label: 'Gold' };
    if (arr >= 1196) return { class: 'arr-badge-silver', label: 'Silver' };
    return { class: 'arr-badge-bronze', label: 'Bronze' };
}

function getCountryFlag(countryCode) {
    if (!countryCode) return '';
    
    const flags = {
        'GB': '🇬🇧', 'US': '🇺🇸', 'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹',
        'DE': '🇩🇪', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AU': '🇦🇺', 'CA': '🇨🇦',
        'JP': '🇯🇵', 'CN': '🇨🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷',
        'CL': '🇨🇱', 'CO': '🇨🇴', 'DK': '🇩🇰', 'SE': '🇸🇪', 'NO': '🇳🇴',
        'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'AT': '🇦🇹', 'CH': '🇨🇭',
        'PT': '🇵🇹', 'IE': '🇮🇪', 'NZ': '🇳🇿', 'SG': '🇸🇬', 'KR': '🇰🇷'
    };
    
    return flags[countryCode.toUpperCase()] || '🌍';
}

// Expose functions globally
window.openBotProfile = openBotProfile;
window.closeBotModal = closeBotModal;
window.isBot = isBot;
window.makeNameClickable = makeNameClickable;

// Auto-initialize modal when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBotModal);
} else {
    initializeBotModal();
}

export { openBotProfile, closeBotModal, isBot, makeNameClickable };
