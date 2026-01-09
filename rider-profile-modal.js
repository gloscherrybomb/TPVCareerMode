// Rider Profile Modal for Human Riders
// Shows rider profile when clicking on a human rider name in global standings

import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { drawPersonalityChart } from './profile-personality.js';
import { getPersonaLabel } from './interview-engine.js';
import { getCountryCode2, getHighResPhotoURL } from './utils.js';

let db;
let modalInitialized = false;

// Get ARR band from rating
function getARRBand(arr) {
    if (!arr || arr < 300) return 'Unranked';
    
    // Diamond: 1600-2000 (4 tiers)
    if (arr >= 1900) return 'Diamond 4';
    if (arr >= 1800) return 'Diamond 3';
    if (arr >= 1700) return 'Diamond 2';
    if (arr >= 1600) return 'Diamond 1';
    
    // Platinum: 1300-1599 (3 tiers)
    if (arr >= 1500) return 'Platinum 3';
    if (arr >= 1400) return 'Platinum 2';
    if (arr >= 1300) return 'Platinum 1';
    
    // Gold: 1000-1299 (3 tiers)
    if (arr >= 1200) return 'Gold 3';
    if (arr >= 1100) return 'Gold 2';
    if (arr >= 1000) return 'Gold 1';
    
    // Silver: 700-999 (3 tiers)
    if (arr >= 900) return 'Silver 3';
    if (arr >= 800) return 'Silver 2';
    if (arr >= 700) return 'Silver 1';
    
    // Bronze: 300-699 (3 tiers)
    if (arr >= 500) return 'Bronze 3';
    if (arr >= 400) return 'Bronze 2';
    if (arr >= 300) return 'Bronze 1';
    
    return 'Unranked';
}

// Get ordinal suffix for position (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Initialize modal
function initializeRiderModal() {
    if (modalInitialized) return;
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal" id="riderProfileModal">
            <div class="modal-overlay" id="riderProfileModalOverlay"></div>
            <div class="modal-content profile-modal-content">
                <button class="modal-close" id="riderProfileModalClose">&times;</button>
                <div id="riderProfileModalBody" class="profile-modal-body">
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
    document.getElementById('riderProfileModalClose').addEventListener('click', closeRiderModal);
    document.getElementById('riderProfileModalOverlay').addEventListener('click', closeRiderModal);
    
    // Add remaining modal CSS if not already present
    if (!document.getElementById('rider-modal-additional-styles')) {
        const styles = document.createElement('style');
        styles.id = 'rider-modal-additional-styles';
        styles.textContent = `
            /* Modal size override for rider profiles */
            .profile-modal-content {
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
            }

            .rider-profile-card {
                background: linear-gradient(135deg, var(--card-gradient-start), var(--card-gradient-end));
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
            }
            
            .rider-profile-header {
                display: flex;
                align-items: center;
                gap: 2rem;
                margin-bottom: 2rem;
            }
            
            .rider-profile-avatar {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(255, 27, 107, 0.3), rgba(69, 202, 255, 0.3));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 3rem;
                font-weight: 700;
                color: var(--text-primary);
                border: 3px solid var(--accent-blue);
                flex-shrink: 0;
                overflow: hidden;
            }

            .rider-profile-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            }
            
            .rider-profile-info {
                flex: 1;
            }
            
            .rider-profile-name {
                font-family: 'Orbitron', sans-serif;
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }
            
            .rider-profile-meta {
                display: flex;
                gap: 1.5rem;
                flex-wrap: wrap;
            }
            
            .rider-profile-meta-item {
                display: flex;
                flex-direction: column;
            }
            
            .rider-profile-meta-label {
                font-size: 0.75rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .rider-profile-meta-value {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--accent-blue);
                font-family: 'Orbitron', sans-serif;
            }
            
            .rider-profile-progress {
                padding-top: 1.5rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .rider-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .rider-stat-card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
                text-align: center;
            }
            
            .rider-stat-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.5rem;
            }
            
            .rider-stat-value {
                font-size: 1.75rem;
                font-weight: 700;
                color: var(--text-primary);
                font-family: 'Orbitron', sans-serif;
            }
            
            .rider-awards-section {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
            }
            
            .rider-awards-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
            }
            
            .rider-awards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 1rem;
            }
            
            .rider-award-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            
            .rider-award-icon {
                font-size: 2.5rem;
                margin-bottom: 0.25rem;
            }
            
            .rider-award-name {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .rider-no-awards {
                text-align: center;
                color: var(--text-secondary);
                font-style: italic;
                padding: 2rem;
            }
            
            .rider-progress-bar {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                height: 8px;
                overflow: hidden;
                margin-top: 0.5rem;
            }
            
            .rider-progress-fill {
                background: linear-gradient(90deg, var(--accent-blue), var(--accent-pink));
                height: 100%;
                transition: width 0.3s ease;
            }

            /* Personality Section */
            .profile-personality-section {
                display: flex;
                gap: 1.5rem;
                padding: 1.5rem;
                background: linear-gradient(135deg, rgba(255, 27, 107, 0.05), rgba(69, 202, 255, 0.05));
                border: 1px solid rgba(255, 27, 107, 0.2);
                border-radius: 16px;
                margin-bottom: 1.5rem;
                align-items: center;
            }

            .personality-chart-container {
                flex-shrink: 0;
                flex-basis: 260px;
            }

            .personality-info {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                flex: 1;
                min-width: 0;
            }

            .personality-label {
                font-size: 0.75rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .personality-value {
                font-size: 1.25rem;
                font-weight: 700;
                background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .personality-meta {
                font-size: 0.875rem;
                color: var(--text-secondary);
                opacity: 0.8;
            }

            @media (max-width: 600px) {
                .profile-personality-section {
                    flex-direction: column;
                    text-align: center;
                }
            }

            /* Contributor Profile Styles */
            .rider-profile-card.contributor-profile {
                position: relative;
                border: 2px solid rgba(255, 215, 0, 0.5);
            }

            .rider-profile-card.contributor-profile::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg,
                    rgba(255, 215, 0, 0.3),
                    rgba(255, 170, 0, 0.1),
                    rgba(255, 215, 0, 0.3),
                    rgba(255, 170, 0, 0.1)
                );
                background-size: 300% 300%;
                border-radius: 14px;
                z-index: -1;
                animation: contributorGlow 4s ease infinite;
            }

            @keyframes contributorGlow {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            .contributor-profile .rider-profile-header::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.15), transparent);
                animation: contributorShimmer 3s ease-in-out infinite;
                pointer-events: none;
            }

            @keyframes contributorShimmer {
                0% { left: -100%; }
                100% { left: 200%; }
            }

            .contributor-profile .rider-profile-header {
                position: relative;
                overflow: hidden;
            }

            .contributor-star-badge {
                display: inline-block;
                margin-left: 0.5rem;
                font-size: 1.2rem;
                color: #ffd700;
                filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));
                vertical-align: middle;
            }

            /* Money Bags Flair Styles */
            .rider-profile-card.money-bags-card {
                position: relative;
                border: 2px solid rgba(34, 197, 94, 0.5);
            }

            .rider-profile-card.money-bags-card::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg,
                    rgba(34, 197, 94, 0.2),
                    rgba(16, 185, 129, 0.1),
                    rgba(34, 197, 94, 0.2),
                    rgba(16, 185, 129, 0.1)
                );
                background-size: 300% 300%;
                border-radius: 14px;
                z-index: -1;
                animation: moneyBagsGlow 4s ease infinite;
            }

            @keyframes moneyBagsGlow {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            .money-bags-flair-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(34, 197, 94, 0.15),
                    transparent);
                border-radius: 20px;
                margin: 1rem 0;
            }

            .money-bags-icon {
                font-size: 1.5rem;
                filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.8));
                animation: moneyBagsIconPulse 2s ease-in-out infinite;
            }

            @keyframes moneyBagsIconPulse {
                0%, 100% {
                    filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.8));
                }
                50% {
                    filter: drop-shadow(0 0 12px rgba(34, 197, 94, 1));
                }
            }

            .money-bags-label {
                color: #22c55e;
                font-weight: 700;
                font-size: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                font-family: 'Orbitron', sans-serif;
            }
        `;
        document.head.appendChild(styles);
    }
    
    modalInitialized = true;
}

// Close modal
function closeRiderModal() {
    const modal = document.getElementById('riderProfileModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Open modal and load rider profile
async function openRiderProfile(riderUid, riderName) {
    if (!db) {
        console.error('Firestore not initialized');
        return;
    }
    
    initializeRiderModal();
    
    const modal = document.getElementById('riderProfileModal');
    const modalBody = document.getElementById('riderProfileModalBody');
    
    // Show modal with loading state
    modal.classList.add('active');
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading rider profile...</p>
        </div>
    `;
    
    try {
        // Fetch rider data from Firestore
        const riderDoc = await getDoc(doc(db, 'users', riderUid));
        
        if (!riderDoc.exists()) {
            throw new Error('Rider not found');
        }
        
        const riderData = riderDoc.data();
        
        // Build profile HTML (stats are now stored in user document)
        const profileHTML = buildRiderProfileHTML(riderData, riderName);
        modalBody.innerHTML = profileHTML;

        // Draw personality chart if user has interviews
        if (riderData.personality && riderData.interviewHistory?.totalInterviews > 0) {
            // Wait for DOM to render canvas
            setTimeout(() => {
                drawPersonalityChart('riderPersonalityChart', riderData.personality);
            }, 50);
        }

    } catch (error) {
        console.error('Error loading rider profile:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <p>Error loading rider profile. Please try again.</p>
            </div>
        `;
    }
}

// Build rider profile HTML
function buildRiderProfileHTML(data, name) {
    const displayName = data.displayName || name || 'Unknown Rider';
    
    // Get ARR from user document (stored from most recent race)
    let arr = data.arr;
    
    // Fallback: if ARR not in user document yet, get from most recent event result
    if (!arr) {
        for (let eventNum = 15; eventNum >= 1; eventNum--) {
            const eventResults = data[`event${eventNum}Results`];
            if (eventResults && eventResults.arr) {
                arr = eventResults.arr;
                break;
            }
        }
    }
    
    // Default to 1000 only if no ARR found anywhere
    arr = arr || 1000;
    
    const arrBand = getARRBand(arr);
    const team = data.team || 'Independent';
    const season = data.currentSeason || 1;

    // Season progress (for progress bar at top)
    const season1Points = data.season1Points || 0;
    const season1Events = data.season1Events || 0;
    const completedStages = data.completedStages || [];
    const completedOptionalEvents = data.completedOptionalEvents || [];

    // Career stats (for stats section - shows lifetime stats)
    const careerEvents = data.careerTotalEvents || 0;
    const wins = data.careerWins || 0;
    const podiums = data.careerPodiums || 0;
    const careerTop10s = data.careerTop10s || 0;
    const careerBestFinish = data.careerBestFinish || null;
    const careerAvgFinish = data.careerAvgFinish ? Math.round(data.careerAvgFinish) : 'N/A';
    const careerWinRate = data.careerWinRate;
    const careerPodiumRate = data.careerPodiumRate;
    const totalCCEarned = data.currency?.totalEarned || 0;
    const totalHighFivesReceived = data.totalHighFivesReceived || 0;

    // Get initials for avatar placeholder
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Get profile photo URL if exists (use high-res version for Google photos)
    // 400px for 120px display (3.3x for retina)
    const photoURL = getHighResPhotoURL(data.photoURL, 400);
    
    // Get awards from user document
    const awards = data.awards || {};
    
    // Convert awards object to array format for display
    const awardsList = [];
    
    // Helper function to get award icon
    const getAwardIcon = (iconId) => {
        if (window.TPVIcons) {
            return window.TPVIcons.getIcon(iconId, { size: 'lg' });
        }
        // Fallback emoji map
        const fallbacks = {
            gold: '🥇', silver: '🥈', bronze: '🥉', gcGold: '🏆', gcSilver: '🥈', gcBronze: '🥉',
            seasonGold: '🏆', seasonSilver: '🥈', seasonBronze: '🥉', punchingAbove: '🥊',
            giantKiller: '⚔️', bullseye: '🎯', hotStreak: '🔥', domination: '💪',
            closeCall: '😅', photoFinish: '📸', darkHorse: '🐴', zeroToHero: '🦸',
            lanternRouge: '🏮', perfectSeason: '💯', podiumStreak: '📈', specialist: '⭐',
            allRounder: '🌟', comeback: '🔄', windTunnel: '🌬️', theAccountant: '🧮',
            theEqualizer: '🎚️', singaporeSling: '🍸', powerSurge: '💥', steadyEddie: '📊',
            blastOff: '🚀', gluttonForPunishment: '🎖️', backToBack: '🔁', weekendWarrior: '🏁',
            trophy: '🏆', technicalIssues: '🔧', overrated: '📉', fanFavourite: '💜'
        };
        return fallbacks[iconId] || '🏆';
    };

    // Award configuration with icons and names
    const awardConfig = {
        // Race medals
        gold: { icon: getAwardIcon('goldMedal'), name: 'Gold Medal' },
        silver: { icon: getAwardIcon('silverMedal'), name: 'Silver Medal' },
        bronze: { icon: getAwardIcon('bronzeMedal'), name: 'Bronze Medal' },

        // GC trophies
        gcGold: { icon: getAwardIcon('gcGold'), name: 'GC Winner' },
        gcSilver: { icon: getAwardIcon('gcSilver'), name: 'GC Second' },
        gcBronze: { icon: getAwardIcon('gcBronze'), name: 'GC Third' },

        // Season trophies (MOST PRESTIGIOUS!)
        seasonChampion: { icon: getAwardIcon('seasonGold'), name: 'Season Champion' },
        seasonRunnerUp: { icon: getAwardIcon('seasonSilver'), name: 'Season Runner-Up' },
        seasonThirdPlace: { icon: getAwardIcon('seasonBronze'), name: 'Season Third Place' },

        // Special achievements
        punchingMedal: { icon: getAwardIcon('punchingAbove'), name: 'Punching Above Weight' },
        giantKiller: { icon: getAwardIcon('giantKiller'), name: 'Giant Killer' },
        bullseye: { icon: getAwardIcon('bullseye'), name: 'Bullseye' },
        hotStreak: { icon: getAwardIcon('hotStreak'), name: 'Hot Streak' },
        domination: { icon: getAwardIcon('domination'), name: 'Domination' },
        closeCall: { icon: getAwardIcon('closeCall'), name: 'Close Call' },
        photoFinish: { icon: getAwardIcon('photoFinish'), name: 'Photo Finish' },
        darkHorse: { icon: getAwardIcon('darkHorse'), name: 'Dark Horse' },
        zeroToHero: { icon: getAwardIcon('zeroToHero'), name: 'Zero to Hero' },
        lanternRouge: { icon: getAwardIcon('lanternRouge'), name: 'Lantern Rouge' },

        // New special awards
        perfectSeason: { icon: getAwardIcon('perfectSeason'), name: 'Perfect Season' },
        podiumStreak: { icon: getAwardIcon('podiumStreak'), name: 'Podium Streak' },
        specialist: { icon: getAwardIcon('specialist'), name: 'Specialist' },
        allRounder: { icon: getAwardIcon('allRounder'), name: 'All-Rounder' },
        comeback: { icon: getAwardIcon('comeback'), name: 'Comeback Kid' },

        // Event-specific awards
        windTunnel: { icon: getAwardIcon('windTunnel'), name: 'Wind Tunnel' },
        theAccountant: { icon: getAwardIcon('theAccountant'), name: 'The Accountant' },

        // Special event awards
        theEqualizer: { icon: getAwardIcon('theEqualizer'), name: 'The Equalizer' },
        singaporeSling: { icon: getAwardIcon('singaporeSling'), name: 'Singapore Sling' },

        // Power-based awards
        powerSurge: { icon: getAwardIcon('powerSurge'), name: 'Power Surge' },
        steadyEddie: { icon: getAwardIcon('steadyEddie'), name: 'Steady Eddie' },
        blastOff: { icon: getAwardIcon('blastOff'), name: 'Blast Off' },
        smoothOperator: { icon: getAwardIcon('power'), name: 'Smooth Operator' },
        bunchKick: { icon: getAwardIcon('power'), name: 'Bunch Kick' },

        // Other awards
        gluttonForPunishment: { icon: getAwardIcon('gluttonForPunishment'), name: 'Glutton for Punishment' },

        // Career milestone awards
        backToBack: { icon: getAwardIcon('backToBack'), name: 'Back to Back' },
        weekendWarrior: { icon: getAwardIcon('weekendWarrior'), name: 'Weekend Warrior' },
        trophyCollector: { icon: getAwardIcon('trophy'), name: 'Trophy Collector' },
        technicalIssues: { icon: getAwardIcon('technicalIssues'), name: 'Technical Issues' },
        overrated: { icon: getAwardIcon('overrated'), name: 'Overrated' },

        // Community awards
        fanFavourite: { icon: getAwardIcon('fanFavourite'), name: 'Fan Favourite' }
    };
    
    // Build awards list with counts
    Object.entries(awards).forEach(([key, count]) => {
        if (count > 0 && awardConfig[key]) {
            awardsList.push({
                icon: awardConfig[key].icon,
                name: count > 1 ? `${awardConfig[key].name} ×${count}` : awardConfig[key].name
            });
        }
    });
    
    // Calculate seasons completed by checking completion flags
    let seasonsCompleted = 0;
    if (data.season1Complete === true) seasonsCompleted++;
    if (data.season2Complete === true) seasonsCompleted++;
    if (data.season3Complete === true) seasonsCompleted++;
    // Add more seasons as they're released
    
    const stagesPerSeason = 9; // Total stages in a season
    const currentSeasonStages = completedStages.length;
    const currentSeasonProgressPercent = Math.min((currentSeasonStages / stagesPerSeason) * 100, 100);

    // Get country flag if available
    const country = data.country || null;
    const countryCode2 = country ? getCountryCode2(country) : null;
    const countryFlagHTML = countryCode2
        ? `<img src="assets/flags/${countryCode2}.svg" alt="${country}" class="country-flag-profile" title="${country}">`
        : '';

    // Check contributor status
    const isContributor = data.isContributor || false;
    const contributorClass = isContributor ? ' contributor-profile' : '';
    const contributorBadge = isContributor ? '<span class="contributor-star-badge" title="TPV Contributor">&#9733;</span>' : '';

    // Check Money Bags flair status
    const hasMoneyBags = data.hasHighRollerFlair || false;
    const moneyBagsClass = hasMoneyBags ? ' money-bags-card' : '';
    const moneyBagsIcon = window.TPVIcons ? window.TPVIcons.getIcon('moneyBag', { size: 'md' }) : '💰';
    const moneyBagsRow = hasMoneyBags ? `
        <div class="money-bags-flair-row">
            <span class="money-bags-icon">${moneyBagsIcon}</span>
            <span class="money-bags-label">Money Bags</span>
        </div>
    ` : '';

    let html = `
        <div class="rider-profile-card${contributorClass}${moneyBagsClass}">
            <div class="rider-profile-header">
                <div class="rider-profile-avatar">
                    ${photoURL ? `<img src="${photoURL}" alt="${displayName}">` : initials}
                </div>
                <div class="rider-profile-info">
                    <h2 class="rider-profile-name">${displayName}${contributorBadge} ${countryFlagHTML}</h2>
                    <div class="rider-profile-meta">
                        <div class="rider-profile-meta-item">
                            <span class="rider-profile-meta-label">ARR</span>
                            <span class="rider-profile-meta-value">${arr}</span>
                        </div>
                        <div class="rider-profile-meta-item">
                            <span class="rider-profile-meta-label">Band</span>
                            <span class="rider-profile-meta-value">${arrBand}</span>
                        </div>
                        <div class="rider-profile-meta-item">
                            <span class="rider-profile-meta-label">Team</span>
                            <span class="rider-profile-meta-value">${team}</span>
                        </div>
                        <div class="rider-profile-meta-item">
                            <span class="rider-profile-meta-label">Season</span>
                            <span class="rider-profile-meta-value">${season}</span>
                        </div>
                        <div class="rider-profile-meta-item">
                            <span class="rider-profile-meta-label">High 5s</span>
                            <span class="rider-profile-meta-value">&#9995; ${totalHighFivesReceived}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rider-profile-progress">
                <div class="rider-profile-meta-item" style="margin-bottom: 1rem;">
                    <span class="rider-profile-meta-label">Seasons Completed</span>
                    <span class="rider-profile-meta-value">${seasonsCompleted}</span>
                </div>
                <div class="rider-profile-meta-item">
                    <span class="rider-profile-meta-label">Current Season Progress (Season ${season})</span>
                    <div class="rider-progress-bar">
                        <div class="rider-progress-fill" style="width: ${currentSeasonProgressPercent}%"></div>
                    </div>
                    <span class="rider-profile-meta-label" style="margin-top: 0.25rem;">${currentSeasonStages} / ${stagesPerSeason} stages completed</span>
                </div>
            </div>
        </div>

        ${moneyBagsRow}

        ${data.personality && data.interviewHistory?.totalInterviews > 0 ? `
        <div class="profile-personality-section">
            <div class="personality-chart-container">
                <canvas id="riderPersonalityChart" width="260" height="220"></canvas>
            </div>
            <div class="personality-info">
                <div class="personality-label">Media Persona</div>
                <div class="personality-value">"${getPersonaLabel(data.personality)}"</div>
                <div class="personality-meta">${data.interviewHistory.totalInterviews} ${data.interviewHistory.totalInterviews === 1 ? 'interview' : 'interviews'}</div>
            </div>
        </div>
        ` : ''}

        <div class="rider-stats-grid">
            <div class="rider-stat-card">
                <div class="rider-stat-label">Career Points</div>
                <div class="rider-stat-value">${data.careerPoints || 0}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Events</div>
                <div class="rider-stat-value">${careerEvents}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Wins</div>
                <div class="rider-stat-value">${wins}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Podiums</div>
                <div class="rider-stat-value">${podiums}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Top 10s</div>
                <div class="rider-stat-value">${careerTop10s}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Best Finish</div>
                <div class="rider-stat-value">${careerBestFinish ? `${careerBestFinish}${getOrdinalSuffix(careerBestFinish)}` : 'N/A'}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Avg Finish</div>
                <div class="rider-stat-value">${careerAvgFinish}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Win Rate</div>
                <div class="rider-stat-value">${careerWinRate !== undefined ? careerWinRate + '%' : 'N/A'}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Podium Rate</div>
                <div class="rider-stat-value">${careerPodiumRate !== undefined ? careerPodiumRate + '%' : 'N/A'}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Career CC</div>
                <div class="rider-stat-value">${totalCCEarned}</div>
            </div>
        </div>
    `;

    // Add awards section if rider has awards
    if (awardsList && awardsList.length > 0) {
        const headerTrophyIcon = window.TPVIcons ? window.TPVIcons.getIcon('trophy', { size: 'sm' }) : '🏆';
        html += `
            <div class="rider-awards-section">
                <h3 class="rider-awards-title">${headerTrophyIcon} Awards & Achievements</h3>
                <div class="rider-awards-grid">
        `;
        
        awardsList.forEach(award => {
            html += `
                <div class="rider-award-item">
                    <div class="rider-award-icon">${award.icon}</div>
                    <div class="rider-award-name">${award.name}</div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        const headerTrophyIcon = window.TPVIcons ? window.TPVIcons.getIcon('trophy', { size: 'sm' }) : '🏆';
        html += `
            <div class="rider-awards-section">
                <h3 class="rider-awards-title">${headerTrophyIcon} Awards & Achievements</h3>
                <div class="rider-no-awards">No awards earned yet. Keep racing to unlock achievements!</div>
            </div>
        `;
    }
    
    return html;
}

// Make rider name clickable (but not for bots)
export function makeRiderNameClickable(name, uid, isBot = false) {
    // Don't make bot names clickable here - they use the bot modal
    if (isBot || uid.startsWith('Bot')) {
        return name;
    }
    
    return `<span class="rider-name-link" data-rider-uid="${uid}" data-rider-name="${name}">${name}</span>`;
}

// Initialize when page loads
export function initRiderProfileModal(firestoreInstance) {
    db = firestoreInstance;
    
    // Add required CSS immediately
    if (!document.getElementById('rider-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'rider-modal-styles';
        styles.textContent = `
            .rider-name-link {
                color: var(--accent-blue) !important;
                cursor: pointer !important;
                text-decoration: none;
                transition: color 0.3s ease;
                display: inline;
            }
            .rider-name-link:hover {
                color: var(--text-primary) !important;
                text-decoration: underline;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add click event delegation for rider name links
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('rider-name-link')) {
            e.preventDefault();
            const riderUid = e.target.getAttribute('data-rider-uid');
            const riderName = e.target.getAttribute('data-rider-name');
            openRiderProfile(riderUid, riderName);
        }
    });
    
    console.log('✓ Rider profile modal initialized');
}
