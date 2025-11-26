// Peloton Page - Bot Profiles
import { getFirestore, collection, getDocs, doc, getDoc, query, limit, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let db;
let allProfiles = [];
let displayedProfiles = [];

// Initialize Firestore
async function initializeFirestore() {
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
        
        db = getFirestore(window.firebaseApp);
        console.log('Firestore initialized for peloton page');
        
        // Load profiles
        await loadAllProfiles();
        showRandomProfiles();
    } catch (error) {
        console.error('Error initializing Firestore:', error);
        showError('Unable to load profiles. Please try again later.');
    }
}

// Load all bot profiles from Firestore
async function loadAllProfiles() {
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
        
        console.log(`Loaded ${allProfiles.length} bot profiles`);
    } catch (error) {
        console.error('Error loading profiles:', error);
        throw error;
    }
}

// Show 5 random profiles
function showRandomProfiles() {
    if (allProfiles.length === 0) {
        showNoResults('No bot profiles available yet. Check back soon!');
        return;
    }
    
    // Get 5 random profiles
    const shuffled = [...allProfiles].sort(() => 0.5 - Math.random());
    displayedProfiles = shuffled.slice(0, Math.min(5, shuffled.length));
    
    renderProfiles(displayedProfiles);
}

// Render profile cards
function renderProfiles(profiles) {
    const grid = document.getElementById('profilesGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');
    
    loadingSpinner.style.display = 'none';
    noResults.style.display = 'none';
    
    if (profiles.length === 0) {
        showNoResults();
        return;
    }
    
    grid.innerHTML = profiles.map((profile, index) => {
        const arrBadge = getARRBadge(profile.arr);
        const flag = getCountryFlag(profile.nationality);
        const bioPreview = profile.backstory ? profile.backstory.substring(0, 150) + '...' : 'No backstory available.';
        
        return `
            <div class="profile-card" data-profile-id="${profile.id}" onclick="openProfileModal('${profile.id}')" style="animation-delay: ${index * 0.1}s">
                <div class="profile-image">
                    ${profile.imageUrl 
                        ? `<img src="${profile.imageUrl}" alt="${profile.name}">` 
                        : `<div class="profile-image-placeholder">🚴</div>`
                    }
                    <div class="profile-arr-badge ${arrBadge.class}">
                        ${profile.arr}
                    </div>
                </div>
                <div class="profile-info">
                    <h3 class="profile-name">${profile.name}</h3>
                    <div class="profile-meta">
                        <div class="profile-team">
                            <span>🚴</span>
                            <span>${profile.team || 'No Team'}</span>
                        </div>
                        ${flag ? `<div class="profile-nationality">${flag}</div>` : ''}
                    </div>
                    <p class="profile-bio-preview">${bioPreview}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Show no results message
function showNoResults(message = 'No riders found') {
    const grid = document.getElementById('profilesGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');
    
    loadingSpinner.style.display = 'none';
    grid.innerHTML = '';
    noResults.style.display = 'block';
    noResults.querySelector('p').textContent = message;
}

// Show error message
function showError(message) {
    const grid = document.getElementById('profilesGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    loadingSpinner.style.display = 'none';
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Error Loading Profiles</h3>
            <p style="color: var(--text-secondary);">${message}</p>
        </div>
    `;
}

// Open profile modal
window.openProfileModal = async function(profileId) {
    const profile = allProfiles.find(p => p.id === profileId);
    
    if (!profile) {
        console.error('Profile not found:', profileId);
        return;
    }
    
    const modal = document.getElementById('profileModal');
    const modalBody = document.getElementById('profileModalBody');
    
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
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Search profiles
function searchProfiles(searchTerm) {
    if (!searchTerm.trim()) {
        showRandomProfiles();
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = allProfiles.filter(profile => {
        return (
            profile.name.toLowerCase().includes(term) ||
            (profile.team && profile.team.toLowerCase().includes(term)) ||
            (profile.nationality && profile.nationality.toLowerCase().includes(term))
        );
    });
    
    displayedProfiles = filtered;
    renderProfiles(filtered);
    
    if (filtered.length === 0) {
        showNoResults('Try adjusting your search or browse all riders');
    }
}

// Get ARR badge styling
function getARRBadge(arr) {
    if (arr >= 1451) return { class: 'arr-badge-platinum', label: 'Platinum' };
    if (arr >= 1321) return { class: 'arr-badge-gold', label: 'Gold' };
    if (arr >= 1196) return { class: 'arr-badge-silver', label: 'Silver' };
    return { class: 'arr-badge-bronze', label: 'Bronze' };
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    initializeFirestore();
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        clearSearch.style.display = value ? 'flex' : 'none';
        searchProfiles(value);
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        showRandomProfiles();
    });
    
    // Shuffle button
    document.getElementById('shuffleBtn').addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        showRandomProfiles();
    });
    
    // Modal close handlers
    document.getElementById('profileModalClose').addEventListener('click', closeProfileModal);
    document.getElementById('profileModalOverlay').addEventListener('click', closeProfileModal);
});
