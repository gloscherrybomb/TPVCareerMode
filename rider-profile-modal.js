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
            }
            
            .rider-profile-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
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
    const totalPoints = data.totalPoints || 0;
    const totalEvents = data.totalEvents || 0;
    const completedStages = data.completedStages || [];
    const completedOptionalEvents = data.completedOptionalEvents || [];
    
    // Read wins, podiums, and awards directly from user document
    const wins = data.totalWins || 0;
    const podiums = data.totalPodiums || 0;
    
    // Get initials for avatar placeholder
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Get profile photo URL if exists (use high-res version for Google photos)
    const photoURL = getHighResPhotoURL(data.photoURL, 300);
    
    // Use stored average finish (already calculated and stored)
    const avgFinish = data.averageFinish ? Math.round(data.averageFinish) : 'N/A';
    
    // Get awards from user document
    const awards = data.awards || {};
    
    // Convert awards object to array format for display
    const awardsList = [];
    
    // Award configuration with icons and names
    const awardConfig = {
        // Race medals
        gold: { icon: '🥇', name: 'Gold Medal' },
        silver: { icon: '🥈', name: 'Silver Medal' },
        bronze: { icon: '🥉', name: 'Bronze Medal' },
        
        // GC trophies
        gcGold: { icon: '🏆', name: 'GC Winner' },
        gcSilver: { icon: '🥈', name: 'GC Second' },
        gcBronze: { icon: '🥉', name: 'GC Third' },
        
        // Season trophies (MOST PRESTIGIOUS!)
        seasonChampion: { icon: '🏆', name: 'Season Champion' },
        seasonRunnerUp: { icon: '🥈', name: 'Season Runner-Up' },
        seasonThirdPlace: { icon: '🥉', name: 'Season Third Place' },
        
        // Special achievements
        punchingMedal: { icon: '🥊', name: 'Punching Above Weight' },
        giantKiller: { icon: '⚔️', name: 'Giant Killer' },
        bullseye: { icon: '🎯', name: 'Bullseye' },
        hotStreak: { icon: '🔥', name: 'Hot Streak' },
        domination: { icon: '👑', name: 'Domination' },
        closeCall: { icon: '😅', name: 'Close Call' },
        photoFinish: { icon: '📸', name: 'Photo Finish' },
        darkHorse: { icon: '🐴', name: 'Dark Horse' },
        zeroToHero: { icon: '🦸', name: 'Zero to Hero' },
        lanternRouge: { icon: '🏮', name: 'Lantern Rouge' },
        
        // New special awards
        perfectSeason: { icon: '💯', name: 'Perfect Season' },
        podiumStreak: { icon: '📈', name: 'Podium Streak' },
        specialist: { icon: '⭐', name: 'Specialist' },
        allRounder: { icon: '🌟', name: 'All-Rounder' },
        comeback: { icon: '🔄', name: 'Comeback Kid' }
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
    
    const eventsPerSeason = 9; // 6 mandatory + 3 optional that must be completed
    const currentSeasonEvents = completedStages.length + completedOptionalEvents.length;
    const currentSeasonProgressPercent = Math.min((currentSeasonEvents / eventsPerSeason) * 100, 100);

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
    const moneyBagsRow = hasMoneyBags ? `
        <div class="money-bags-flair-row">
            <span class="money-bags-icon">💰</span>
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
                    <span class="rider-profile-meta-label" style="margin-top: 0.25rem;">${currentSeasonEvents} / ${eventsPerSeason} events completed</span>
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
                <div class="rider-stat-label">Total Points</div>
                <div class="rider-stat-value">${totalPoints}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Events</div>
                <div class="rider-stat-value">${totalEvents}</div>
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
                <div class="rider-stat-value">${data.totalTop10s || 0}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Best Finish</div>
                <div class="rider-stat-value">${data.bestFinish ? `${data.bestFinish}${getOrdinalSuffix(data.bestFinish)}` : 'N/A'}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Avg Finish</div>
                <div class="rider-stat-value">${avgFinish}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Win Rate</div>
                <div class="rider-stat-value">${data.winRate !== undefined ? data.winRate + '%' : 'N/A'}</div>
            </div>
            <div class="rider-stat-card">
                <div class="rider-stat-label">Podium Rate</div>
                <div class="rider-stat-value">${data.podiumRate !== undefined ? data.podiumRate + '%' : 'N/A'}</div>
            </div>
        </div>
    `;
    
    // Add awards section if rider has awards
    if (awardsList && awardsList.length > 0) {
        html += `
            <div class="rider-awards-section">
                <h3 class="rider-awards-title">🏆 Awards & Achievements</h3>
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
        html += `
            <div class="rider-awards-section">
                <h3 class="rider-awards-title">🏆 Awards & Achievements</h3>
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
