// Reusable Bot Profile Modal
// Import this module on any page to enable bot profile viewing
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
                color: var(--accent-blue) !important;
                cursor: pointer !important;
                text-decoration: none;
                transition: color 0.3s ease;
                display: inline;
            }
            .bot-name-link:hover {
                color: var(--text-primary) !important;
                text-decoration: underline;
            }
            .rider-name .bot-name-link {
                color: var(--accent-blue) !important;
            }
            
            /* Modal Profile Styles */
            .profile-modal-content {
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .profile-modal-body {
                padding: 0;
            }
            
            .modal-profile-header {
                position: relative;
                width: 100%;
                height: 400px;
                max-height: 50vh;
                background: linear-gradient(135deg, rgba(255, 27, 107, 0.1), rgba(69, 202, 255, 0.1));
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            .modal-profile-header img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .modal-profile-header-placeholder {
                font-size: 6rem;
            }
            
            .modal-profile-details {
                padding: 2rem;
            }
            
            .modal-profile-name {
                font-family: 'Orbitron', sans-serif;
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
            }
            
            .modal-profile-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 1.5rem;
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .modal-meta-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .modal-meta-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-secondary);
                font-weight: 600;
            }
            
            .modal-meta-value {
                font-size: 1.125rem;
                color: var(--text-primary);
                font-weight: 600;
            }
            
            .modal-meta-value.arr-value {
                font-family: 'Orbitron', sans-serif;
                font-weight: 700;
            }
            
            .modal-profile-backstory {
                margin-bottom: 1.5rem;
            }
            
            .modal-backstory-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
            }
            
            .modal-backstory-text {
                color: var(--text-secondary);
                line-height: 1.8;
                font-size: 1rem;
            }
            
            .modal-backstory-text p {
                margin-bottom: 1rem;
            }
            
            .modal-backstory-text p:last-child {
                margin-bottom: 0;
            }
            
            /* ARR Badge Colors */
            .arr-badge-bronze {
                color: #cd7f32;
            }
            
            .arr-badge-silver {
                color: #c0c0c0;
            }
            
            .arr-badge-gold {
                color: #ffd700;
            }
            
            .arr-badge-platinum {
                background: linear-gradient(135deg, #e5e4e2, #c8c8c8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            /* Loading Spinner */
            .loading-spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4rem 0;
                gap: 1rem;
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-top-color: var(--accent-blue);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .loading-spinner p {
                color: var(--text-secondary);
            }
            
            /* Flag Icons */
            .flag-icon {
                width: 20px;
                height: 14px;
                object-fit: cover;
                vertical-align: middle;
                margin-right: 4px;
                display: inline-block;
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .modal-profile-header {
                    height: 300px;
                }
                
                .modal-profile-name {
                    font-size: 1.5rem;
                }
                
                .modal-profile-details {
                    padding: 1.5rem;
                }
                
                .modal-profile-meta {
                    gap: 1rem;
                }
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
        let profile = null;
        
        // First try direct lookup by uid
        const profileDoc = await getDoc(doc(db, 'botProfiles', botUid));
        
        if (profileDoc.exists()) {
            profile = profileDoc.data();
        } else if (botUid && botUid.startsWith('Bot_')) {
            // UID is in Bot_Name format, try to find by name
            // Convert Bot_Some_Name back to "Some Name"
            const extractedName = botUid.substring(4).replace(/_/g, ' ');
            console.log('Searching for bot by name:', extractedName);
            
            // Search botProfiles collection by name
            const profilesQuery = query(
                collection(db, 'botProfiles'),
                where('name', '==', extractedName)
            );
            const querySnapshot = await getDocs(profilesQuery);
            
            if (!querySnapshot.empty) {
                profile = querySnapshot.docs[0].data();
            }
        }
        
        if (!profile) {
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

// Check if rider is a bot (UID starts with "Bot" or explicit flag)
function isBot(uid, isBotFlag) {
    if (isBotFlag === true) return true;
    return uid && typeof uid === 'string' && uid.startsWith('Bot');
}

// Make rider name clickable if it's a bot
// isBotFlag: optional boolean to explicitly mark as bot (for data that has isBot field)
function makeNameClickable(name, uid, isBotFlag) {
    if (isBot(uid, isBotFlag)) {
        console.log('Making bot name clickable:', name, uid);
        return `<span class="bot-name-link" onclick="window.openBotProfile('${uid}')">${name}</span>`;
    }
    return name;
}

// Helper functions
function getARRBadge(arr) {
    if (!arr || arr < 300) return { class: 'arr-badge-unranked', label: 'Unranked' };
    
    // Diamond: 1500-2000
    if (arr >= 1900) return { class: 'arr-badge-diamond', label: 'Diamond 5' };
    if (arr >= 1800) return { class: 'arr-badge-diamond', label: 'Diamond 4' };
    if (arr >= 1700) return { class: 'arr-badge-diamond', label: 'Diamond 3' };
    if (arr >= 1600) return { class: 'arr-badge-diamond', label: 'Diamond 2' };
    if (arr >= 1500) return { class: 'arr-badge-diamond', label: 'Diamond 1' };
    
    // Platinum: 1200-1499
    if (arr >= 1400) return { class: 'arr-badge-platinum', label: 'Platinum 3' };
    if (arr >= 1300) return { class: 'arr-badge-platinum', label: 'Platinum 2' };
    if (arr >= 1200) return { class: 'arr-badge-platinum', label: 'Platinum 1' };
    
    // Gold: 900-1199
    if (arr >= 1100) return { class: 'arr-badge-gold', label: 'Gold 3' };
    if (arr >= 1000) return { class: 'arr-badge-gold', label: 'Gold 2' };
    if (arr >= 900) return { class: 'arr-badge-gold', label: 'Gold 1' };
    
    // Silver: 600-899
    if (arr >= 800) return { class: 'arr-badge-silver', label: 'Silver 3' };
    if (arr >= 700) return { class: 'arr-badge-silver', label: 'Silver 2' };
    if (arr >= 600) return { class: 'arr-badge-silver', label: 'Silver 1' };
    
    // Bronze: 300-599
    if (arr >= 500) return { class: 'arr-badge-bronze', label: 'Bronze 3' };
    if (arr >= 400) return { class: 'arr-badge-bronze', label: 'Bronze 2' };
    if (arr >= 300) return { class: 'arr-badge-bronze', label: 'Bronze 1' };
    
    return { class: 'arr-badge-unranked', label: 'Unranked' };
}

// Country / Flag helpers (matching admin-bots.js)
const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

const customCountries = [
    { code: "ENG", name: "England" },
    { code: "SCO", name: "Scotland" },
    { code: "WLS", name: "Wales" },
    { code: "NIR", name: "Northern Ireland" }
];

// Map 3-letter codes to 2-letter ISO codes (for flag-icons library)
const iso3ToIso2 = {
    'BER': 'BM',  // Bermuda
    'FRA': 'FR',  // France
    'CZE': 'CZ',  // Czech Republic
    'ISR': 'IL',  // Israel
    'ALG': 'DZ',  // Algeria
    'AND': 'AD',  // Andorra
    'UKR': 'UA',  // Ukraine
    'MAS': 'MY',  // Malaysia
    'AUT': 'AT',  // Austria
    'ISV': 'VG',  // Virgin Islands (British)
    'BRA': 'BR',  // Brazil
    'CHN': 'CN',  // China
    'FIN': 'FI',  // Finland
    'ITA': 'IT',  // Italy
    'ESP': 'ES',  // Spain
    'IRL': 'IE',  // Ireland
    'KOR': 'KR',  // South Korea
    'NZL': 'NZ',  // New Zealand
    'GER': 'DE',  // Germany
    'USA': 'US',  // United States
    'GBR': 'GB',  // Great Britain
    'NED': 'NL',  // Netherlands
    'SUI': 'CH',  // Switzerland
    'BEL': 'BE',  // Belgium
    'DEN': 'DK',  // Denmark
    'SWE': 'SE',  // Sweden
    'NOR': 'NO',  // Norway
    'POL': 'PL',  // Poland
    'POR': 'PT',  // Portugal
    'AUS': 'AU',  // Australia
    'CAN': 'CA',  // Canada
    'JPN': 'JP',  // Japan
    'MEX': 'MX',  // Mexico
    'ARG': 'AR',  // Argentina
    'RSA': 'ZA',  // South Africa
    'COL': 'CO',  // Colombia
    'VEN': 'VE',  // Venezuela
    'CHI': 'CL',  // Chile
    'ECU': 'EC',  // Ecuador
    'PER': 'PE',  // Peru
    'URU': 'UY',  // Uruguay
};

function getCountryName(code) {
    if (!code) return '';
    const upper = code.toUpperCase();
    
    const custom = customCountries.find(c => c.code === upper);
    if (custom) return custom.name;
    
    try {
        // Try 3-letter code first, then 2-letter
        let isoCode = iso3ToIso2[upper] || upper;
        const name = countryDisplayNames.of(isoCode);
        return name && name !== isoCode ? name : upper;
    } catch {
        return upper;
    }
}

function getEmojiFlag(countryCode) {
    return countryCode
        .toUpperCase()
        .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}

function getCountryFlag(code) {
    if (!code) return '🌍';
    
    const upper = code.toUpperCase();
    
    // Custom UK nations â†’ custom SVGs (except NIR which stays emoji)
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
        return '🚩';
    }
    
    // Convert 3-letter code to 2-letter ISO code if needed
    const isoCode = iso3ToIso2[upper] || upper;
    
    // Use SVG from flag-icons library (expects 2-letter lowercase codes)
    if (isoCode.length === 2) {
        const name = getCountryName(upper);
        const src = `assets/flags/${isoCode.toLowerCase()}.svg`;
        return `<img class="flag-icon" src="${src}" alt="${name} flag" loading="lazy">`;
    }
    
    // Fallback to emoji for unrecognized codes
    try {
        return getEmojiFlag(isoCode);
    } catch {
        return '🌍';
    }
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
