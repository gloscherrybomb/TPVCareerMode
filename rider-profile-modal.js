// Rider Profile Modal for Human Riders
// Shows rider profile when clicking on a human rider name in global standings

import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let db;
let modalInitialized = false;

// Get ARR band from rating
function getARRBand(arr) {
    if (!arr || arr < 300) return 'Unranked';
    
    // Diamond: 1500-2000
    if (arr >= 1900) return 'Diamond 5';
    if (arr >= 1800) return 'Diamond 4';
    if (arr >= 1700) return 'Diamond 3';
    if (arr >= 1600) return 'Diamond 2';
    if (arr >= 1500) return 'Diamond 1';
    
    // Platinum: 1400-1499
    if (arr >= 1450) return 'Platinum 5';
    if (arr >= 1425) return 'Platinum 4';
    if (arr >= 1400) return 'Platinum 3';
    if (arr >= 1375) return 'Platinum 2';
    if (arr >= 1350) return 'Platinum 1';
    
    // Gold: 1200-1349
    if (arr >= 1325) return 'Gold 5';
    if (arr >= 1300) return 'Gold 4';
    if (arr >= 1275) return 'Gold 3';
    if (arr >= 1250) return 'Gold 2';
    if (arr >= 1200) return 'Gold 1';
    
    // Silver: 1000-1199
    if (arr >= 1175) return 'Silver 5';
    if (arr >= 1150) return 'Silver 4';
    if (arr >= 1125) return 'Silver 3';
    if (arr >= 1100) return 'Silver 2';
    if (arr >= 1000) return 'Silver 1';
    
    // Bronze: 700-999
    if (arr >= 950) return 'Bronze 5';
    if (arr >= 900) return 'Bronze 4';
    if (arr >= 850) return 'Bronze 3';
    if (arr >= 800) return 'Bronze 2';
    if (arr >= 700) return 'Bronze 1';
    
    // Iron: 300-699
    if (arr >= 650) return 'Iron 5';
    if (arr >= 600) return 'Iron 4';
    if (arr >= 550) return 'Iron 3';
    if (arr >= 500) return 'Iron 2';
    if (arr >= 300) return 'Iron 1';
    
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
    
    // Add required CSS if not already present
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
        
    } catch (error) {
        console.error('Error loading rider profile:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <p>Error loading rider profile. Please try again.</p>
            </div>
        `;
    }
}

// Calculate rider stats from race results
async function calculateRiderStats(userUID) {
    console.log('Calculating stats for rider:', userUID);
    
    const stats = {
        totalWins: 0,
        totalPodiums: 0,
        awards: {}
    };
    
    // Fetch all results for this user from all events
    const eventCount = 15; // All possible events
    const season = 1;
    
    for (let eventNum = 1; eventNum <= eventCount; eventNum++) {
        // User-specific results collection
        const resultDocId = `season${season}_event${eventNum}_${userUID}`;
        
        try {
            const resultDoc = await getDoc(doc(db, 'results', resultDocId));
            
            if (resultDoc.exists()) {
                const resultData = resultDoc.data();
                const results = resultData.results || [];
                
                // Find user's result in this event
                const userResult = results.find(r => r.uid === userUID);
                
                if (userResult) {
                    const position = userResult.position || 0;
                    
                    if (position > 0) {
                        if (position === 1) {
                            stats.totalWins++;
                        }
                        if (position <= 3) {
                            stats.totalPodiums++;
                        }
                    }
                    
                    // Track all awards
                    if (userResult.earnedPunchingMedal) {
                        stats.awards.punchingMedal = (stats.awards.punchingMedal || 0) + 1;
                    }
                    if (userResult.earnedGiantKillerMedal) {
                        stats.awards.giantKiller = (stats.awards.giantKiller || 0) + 1;
                    }
                    if (userResult.earnedBullseyeMedal) {
                        stats.awards.bullseye = (stats.awards.bullseye || 0) + 1;
                    }
                    if (userResult.earnedHotStreakMedal) {
                        stats.awards.hotStreak = (stats.awards.hotStreak || 0) + 1;
                    }
                    if (userResult.earnedDomination) {
                        stats.awards.domination = (stats.awards.domination || 0) + 1;
                    }
                    if (userResult.earnedCloseCall) {
                        stats.awards.closeCall = (stats.awards.closeCall || 0) + 1;
                    }
                    if (userResult.earnedPhotoFinish) {
                        stats.awards.photoFinish = (stats.awards.photoFinish || 0) + 1;
                    }
                    if (userResult.earnedDarkHorse) {
                        stats.awards.darkHorse = (stats.awards.darkHorse || 0) + 1;
                    }
                    if (userResult.earnedZeroToHero) {
                        stats.awards.zeroToHero = (stats.awards.zeroToHero || 0) + 1;
                    }
                    if (userResult.earnedGCGoldMedal) {
                        stats.awards.gcGold = (stats.awards.gcGold || 0) + 1;
                    }
                    if (userResult.earnedGCSilverMedal) {
                        stats.awards.gcSilver = (stats.awards.gcSilver || 0) + 1;
                    }
                    if (userResult.earnedGCBronzeMedal) {
                        stats.awards.gcBronze = (stats.awards.gcBronze || 0) + 1;
                    }
                    
                    // Medal positions
                    if (position === 1) {
                        stats.awards.gold = (stats.awards.gold || 0) + 1;
                    }
                    if (position === 2) {
                        stats.awards.silver = (stats.awards.silver || 0) + 1;
                    }
                    if (position === 3) {
                        stats.awards.bronze = (stats.awards.bronze || 0) + 1;
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching event ${eventNum} results:`, error);
        }
    }
    
    console.log('Calculated stats:', stats);
    return stats;
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
        
        // Build profile HTML
        const profileHTML = buildRiderProfileHTML(riderData, riderName);
        modalBody.innerHTML = profileHTML;
        
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
    const arr = data.arr || 1000;
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
    
    // Get profile photo URL if exists
    const photoURL = data.photoURL || null;
    
    // Calculate average finish position
    let avgFinish = 'N/A';
    if (completedStages.length > 0) {
        const totalFinish = completedStages.reduce((sum, stage) => sum + (stage.position || 0), 0);
        avgFinish = (totalFinish / completedStages.length).toFixed(1);
    }
    
    // Get awards from user document
    const awards = data.awards || {};
    
    // Convert awards object to array format for display
    const awardsList = [];
    
    // Award configuration with icons and names
    const awardConfig = {
        gold: { icon: '🥇', name: 'Gold Medal' },
        silver: { icon: '🥈', name: 'Silver Medal' },
        bronze: { icon: '🥉', name: 'Bronze Medal' },
        punchingMedal: { icon: '🥊', name: 'Punching Above Weight' },
        giantKiller: { icon: '⚔️', name: 'Giant Killer' },
        bullseye: { icon: '🎯', name: 'Bullseye' },
        hotStreak: { icon: '🔥', name: 'Hot Streak' },
        domination: { icon: '👑', name: 'Domination' },
        closeCall: { icon: '😅', name: 'Close Call' },
        photoFinish: { icon: '📸', name: 'Photo Finish' },
        darkHorse: { icon: '🐴', name: 'Dark Horse' },
        zeroToHero: { icon: '🦸', name: 'Zero to Hero' },
        gcGold: { icon: '🏆', name: 'GC Gold' },
        gcSilver: { icon: '🥈', name: 'GC Silver' },
        gcBronze: { icon: '🥉', name: 'GC Bronze' }
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
    
    // Calculate season progression
    const seasonsCompleted = season - 1; // Current season minus 1
    const eventsPerSeason = 9; // 6 mandatory + 3 optional that must be completed
    const currentSeasonEvents = completedStages.length + completedOptionalEvents.length;
    const currentSeasonProgressPercent = Math.min((currentSeasonEvents / eventsPerSeason) * 100, 100);
    
    let html = `
        <div class="rider-profile-card">
            <div class="rider-profile-header">
                <div class="rider-profile-avatar">
                    ${photoURL ? `<img src="${photoURL}" alt="${displayName}">` : initials}
                </div>
                <div class="rider-profile-info">
                    <h2 class="rider-profile-name">${displayName}</h2>
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
