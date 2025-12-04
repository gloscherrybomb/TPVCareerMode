import { getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Get existing Firebase app (already initialized by app.js)
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

/**
 * Format time in seconds to h m s format
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Format gap to leader
 */
function formatGap(gap) {
    if (gap === 0) return '-';
    return `+${formatTime(gap)}`;
}

/**
 * Get ordinal suffix
 */
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

/**
 * Load and display stage cards
 */
async function loadStageCards() {
    if (!currentUser) {
        document.getElementById('stagesProgress').textContent = 'Login to view your progress';
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        const stages = [
            { eventNum: 13, name: "Stage 1: Figure of 8", route: "Figure of 8", distance: "35.2km", climbing: "174m" },
            { eventNum: 14, name: "Stage 2: Loop the Loop", route: "Loop the Loop", distance: "27.3km", climbing: "169m" },
            { eventNum: 15, name: "Stage 3: A Bit of Everything", route: "A Bit of Everything", distance: "28.1km", climbing: "471m" }
        ];

        let completedCount = 0;
        const stagesHTML = stages.map(stage => {
            const results = userData[`event${stage.eventNum}Results`];
            const isDNS = userData[`event${stage.eventNum}DNS`];
            const dnsReason = userData[`event${stage.eventNum}DNSReason`];
            const isCompleted = !!results;
            
            if (isCompleted) completedCount++;

            let statusBadge = '';
            let resultsSection = '';
            let dnsSection = '';

            if (isDNS) {
                statusBadge = '<div class="stage-status-badge dns">⚠️ DNS</div>';
                dnsSection = `
                    <div class="stage-dns-badge">
                        <div class="dns-icon">⚠️</div>
                        <div class="dns-text">
                            <strong>Did Not Start</strong>
                            <span class="dns-reason">${dnsReason || 'Did not start within 24-hour window'}</span>
                        </div>
                    </div>
                `;
            } else if (isCompleted) {
                statusBadge = '<div class="stage-status-badge completed">✓ Completed</div>';
                resultsSection = `
                    <div class="stage-results">
                        <div class="stage-result-item">
                            <span class="result-label">Position</span>
                            <span class="result-value">${results.position}${getOrdinalSuffix(results.position)}</span>
                        </div>
                        <div class="stage-result-item">
                            <span class="result-label">Time</span>
                            <span class="result-value">${formatTime(results.time)}</span>
                        </div>
                    </div>
                `;
            } else {
                statusBadge = '<div class="stage-status-badge upcoming">📅 Upcoming</div>';
            }

            return `
                <div class="stage-card ${isCompleted ? 'completed' : ''} ${isDNS ? 'dns' : ''}" 
                     onclick="window.location.href='event-detail.html?id=${stage.eventNum}'">
                    <div class="stage-card-header">
                        <div class="stage-number">Local Tour ${stage.name}</div>
                        <div class="stage-stats">${stage.distance} • ${stage.climbing}</div>
                    </div>
                    <div class="stage-name">${stage.route}</div>
                    ${statusBadge}
                    ${dnsSection}
                    ${resultsSection}
                    <div class="stage-action">Click to view ${isCompleted ? 'results' : 'details'}</div>
                </div>
            `;
        }).join('');

        document.getElementById('stagesGrid').innerHTML = stagesHTML;
        document.getElementById('stagesProgress').textContent = `${completedCount} of 3 stages completed`;

        // Load GC standings if any results exist
        if (completedCount > 0) {
            await loadGCStandings(userData);
        }

    } catch (error) {
        console.error('Error loading stage cards:', error);
        document.getElementById('stagesProgress').textContent = 'Error loading stages';
    }
}

/**
 * Load and display GC standings
 */
async function loadGCStandings(userData) {
    // Check if we have GC data (from event 13, 14, or 15)
    let gcData = null;
    let stagesCompleted = 0;
    
    if (userData.event15Results?.gcResults) {
        gcData = userData.event15Results.gcResults;
        stagesCompleted = 3;
    } else if (userData.event14Results?.gcResults) {
        gcData = userData.event14Results.gcResults;
        stagesCompleted = 2;
    } else if (userData.event13Results?.gcResults) {
        gcData = userData.event13Results.gcResults;
        stagesCompleted = 1;
    }

    if (!gcData || !gcData.standings || gcData.standings.length === 0) {
        return; // No GC data yet
    }

    // Show GC section
    document.getElementById('gcSection').style.display = 'block';

    // Update description
    let description = '';
    if (stagesCompleted === 1) {
        description = 'Overall standings after Stage 1. Two stages remain.';
    } else if (stagesCompleted === 2) {
        description = 'Overall standings after Stage 2. One stage remains.';
    } else {
        description = 'Final overall standings after all three stages.';
    }
    document.getElementById('gcDescription').textContent = description;

    // Build GC table
    const tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>GC</th>
                    <th>Rider</th>
                    <th>Team</th>
                    <th>Total Time</th>
                    <th>Gap</th>
                    <th>ARR</th>
                </tr>
            </thead>
            <tbody>
                ${gcData.standings.map(rider => {
                    const isCurrentUser = rider.uid === currentUser.uid;
                    const teamDisplay = rider.team || '—';
                    
                    let rankClass = '';
                    let trophyIcon = '';
                    if (stagesCompleted === 3) {
                        if (rider.gcPosition === 1) {
                            rankClass = 'rank-gold';
                            trophyIcon = ' 🏆';
                        } else if (rider.gcPosition === 2) {
                            rankClass = 'rank-silver';
                            trophyIcon = ' 🥈';
                        } else if (rider.gcPosition === 3) {
                            rankClass = 'rank-bronze';
                            trophyIcon = ' 🥉';
                        }
                    }

                    return `
                        <tr class="${isCurrentUser ? 'current-user-row' : ''}">
                            <td class="rank-cell">
                                <span class="rank-number ${rankClass}">${rider.gcPosition}${trophyIcon}</span>
                            </td>
                            <td class="name-cell">
                                <span class="rider-name">${rider.name}</span>
                                ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                            </td>
                            <td class="team-cell">${teamDisplay}</td>
                            <td class="time-cell">${formatTime(rider.cumulativeTime)}</td>
                            <td class="gap-cell">${formatGap(rider.gapToLeader)}</td>
                            <td class="arr-cell">${rider.arr || '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('gcTableContainer').innerHTML = tableHTML;
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        
        if (user) {
            await loadStageCards();
        } else {
            document.getElementById('stagesProgress').textContent = 'Login to view your progress';
        }
    });
});
