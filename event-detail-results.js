// event-detail-results.js - Display event results on event detail page

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { makeNameClickable } from './bot-profile-modal.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDo-g0UhDCB8QWRXQ0iapVHQEgA4X7jt4o",
  authDomain: "careermodelogin.firebaseapp.com",
  projectId: "careermodelogin",
  storageBucket: "careermodelogin.firebasestorage.app",
  messagingSenderId: "599516805754",
  appId: "1:599516805754:web:7f5c6bbebb8b454a81d9c3",
  measurementId: "G-Y8BQ4F6H4V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let eventNumber = null;

/**
 * Get event number from URL parameters
 */
function getEventNumber() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id')) || 1;
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format delta time with +/- sign
 */
function formatDeltaTime(seconds) {
    if (seconds === 0) return '—';
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    return seconds > 0 ? `+${timeStr}` : `-${timeStr}`;
}

/**
 * Get ARR band label
 */
function getARRBand(arr) {
    if (!arr || arr < 300) return 'Unranked';
    
    // Diamond: 1500-2000
    if (arr >= 1900) return 'Diamond 5';
    if (arr >= 1800) return 'Diamond 4';
    if (arr >= 1700) return 'Diamond 3';
    if (arr >= 1600) return 'Diamond 2';
    if (arr >= 1500) return 'Diamond 1';
    
    // Platinum: 1200-1499
    if (arr >= 1400) return 'Platinum 3';
    if (arr >= 1300) return 'Platinum 2';
    if (arr >= 1200) return 'Platinum 1';
    
    // Gold: 900-1199
    if (arr >= 1100) return 'Gold 3';
    if (arr >= 1000) return 'Gold 2';
    if (arr >= 900) return 'Gold 1';
    
    // Silver: 600-899
    if (arr >= 800) return 'Silver 3';
    if (arr >= 700) return 'Silver 2';
    if (arr >= 600) return 'Silver 1';
    
    // Bronze: 300-599
    if (arr >= 500) return 'Bronze 3';
    if (arr >= 400) return 'Bronze 2';
    if (arr >= 300) return 'Bronze 1';
    
    return 'Unranked';
}

/**
 * Show pre-race sections (story, route, scoring, cta)
 */
function showPreRaceSections() {
    const sectionsToShow = [
        '.event-story',
        '.event-route',
        '.event-scoring',
        '.event-cta'
    ];
    
    sectionsToShow.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.style.display = 'block';
        }
    });
}

/**
 * Load and display event results
 */
async function loadEventResults() {
    if (!currentUser) {
        // Not logged in - show pre-race sections
        showPreRaceSections();
        return;
    }

    const eventResultsSection = document.getElementById('eventResultsSection');
    const eventResultsContent = document.getElementById('eventResultsContent');

    try {
        // Get current user's UID first
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        const userUid = userData?.uid;
        
        if (!userUid) {
            console.error('Could not get user UID');
            eventResultsSection.style.display = 'none';
            showPreRaceSections();
            return;
        }
        
        // Fetch THIS USER's results summary from Firestore
        const resultsRef = doc(db, 'results', `season1_event${eventNumber}_${userUid}`);
        const resultsDoc = await getDoc(resultsRef);

        if (!resultsDoc.exists()) {
            // No results available yet - show pre-race sections
            eventResultsSection.style.display = 'none';
            showPreRaceSections();
            return;
        }

        const resultsData = resultsDoc.data();
        const results = resultsData.results || [];

        if (results.length === 0) {
            eventResultsSection.style.display = 'none';
            showPreRaceSections();
            return;
        }

        // Show results section
        eventResultsSection.style.display = 'block';

        // Hide pre-race sections when results are available
        const sectionsToHide = [
            '.event-story',
            '.event-route',
            '.event-scoring',
            '.event-cta'
        ];
        
        sectionsToHide.forEach(selector => {
            const section = document.querySelector(selector);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Get user's result for this event to extract story (already have userData from above)
        const userEventResults = userData?.[`event${eventNumber}Results`];
        let storyHTML = '';
        
        if (userEventResults && userEventResults.storyRecap && userEventResults.storyContext) {
            storyHTML = `
                <div class="race-story">
                    <div class="story-section">
                        <h3>Race Recap</h3>
                        <p>${userEventResults.storyRecap}</p>
                    </div>
                    <div class="story-section">
                        <h3>Season Context</h3>
                        <p>${userEventResults.storyContext}</p>
                    </div>
                </div>
            `;
        }

        // Build results table
        let tableHTML = storyHTML + `
            <div class="results-table-container">
                <div class="results-table-wrapper">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Rider</th>
                                <th>Team</th>
                                <th>Time</th>
                                <th>ARR</th>
                                <th>Points</th>
                                ${results[0].eventPoints != null ? '<th>PR Pts</th>' : ''}
                                <th>Bonuses</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        results.forEach((result) => {
            const isCurrentUser = result.uid === userUid;
            const rowClass = isCurrentUser ? 'current-user-row' : '';
            const teamDisplay = result.team || '<span class="no-team">—</span>';

            // Podium class for top 3
            let rankClass = '';
            if (result.position === 1) rankClass = 'rank-gold';
            else if (result.position === 2) rankClass = 'rank-silver';
            else if (result.position === 3) rankClass = 'rank-bronze';
            
            // Build bonus cell content
            let bonusHTML = '';
            if (result.bonusPoints && result.bonusPoints > 0) {
                bonusHTML += `<span class="bonus-points" title="Bonus for beating prediction">+${result.bonusPoints}</span>`;
            }
            if (result.earnedPunchingMedal) {
                bonusHTML += `<span class="medal-icon punching" title="Beat prediction by 10+ places">🥊</span>`;
            }
            if (result.earnedGiantKillerMedal) {
                bonusHTML += `<span class="medal-icon giant-killer" title="Beat highest-rated rider">⚔️</span>`;
            }
            if (result.earnedBullseyeMedal) {
                bonusHTML += `<span class="medal-icon bullseye" title="Finished exactly as predicted">🎯</span>`;
            }
            if (result.earnedDomination) {
                bonusHTML += `<span class="medal-icon domination" title="Won by 60+ seconds">💪</span>`;
            }
            if (result.earnedCloseCall) {
                bonusHTML += `<span class="medal-icon close-call" title="Won by less than 0.5s">😅</span>`;
            }
            if (result.earnedPhotoFinish) {
                bonusHTML += `<span class="medal-icon photo-finish" title="Within 0.1s of winner">📸</span>`;
            }
            if (result.earnedDarkHorse) {
                bonusHTML += `<span class="medal-icon dark-horse" title="Won when predicted 15th+">🐴</span>`;
            }
            if (result.earnedZeroToHero) {
                bonusHTML += `<span class="medal-icon zero-to-hero" title="Bottom 20% to top 20%">🚀</span>`;
            }
            if (!bonusHTML) {
                bonusHTML = '<span class="no-bonus">—</span>';
            }

            tableHTML += `
                <tr class="${rowClass}">
                    <td class="rank-cell">
                        <span class="rank-number ${rankClass}">${result.position}</span>
                    </td>
                    <td class="name-cell">
                        <span class="rider-name">${makeNameClickable(result.name, result.uid)}</span>
                        ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                    </td>
                    <td class="team-cell">${teamDisplay}</td>
                    <td class="time-cell">${formatTime(result.time)}</td>
                    <td class="arr-cell">
                        <span class="arr-value">${result.arr}</span>
                        <span class="arr-band">${result.arrBand || getARRBand(result.arr)}</span>
                    </td>
                    <td class="points-cell">
                        <span class="points-value">${result.points}</span>
                    </td>
                    ${result.eventPoints != null ? `<td class="event-points-cell">${result.eventPoints}</td>` : ''}
                    <td class="bonus-cell">${bonusHTML}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
        `;

        // Add explanation for points races if applicable
        if (results[0].eventPoints != null) {
            tableHTML += `
                <div class="results-note">
                    <strong>PR Pts:</strong> Points Race points (used to determine finishing order in points races)
                </div>
            `;
        }

        eventResultsContent.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading event results:', error);
        eventResultsSection.style.display = 'none';
        showPreRaceSections();
    }
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    eventNumber = getEventNumber();

    // Listen for auth changes
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        
        // Update schedule button based on login state
        const scheduleButton = document.getElementById('scheduleButton');
        if (scheduleButton) {
            if (user) {
                scheduleButton.textContent = 'Schedule Event';
                scheduleButton.onclick = null; // Will be handled by event scheduling logic
            } else {
                scheduleButton.textContent = 'Login to Schedule';
                scheduleButton.onclick = (e) => {
                    e.preventDefault();
                    // Trigger the login modal
                    const loginBtn = document.getElementById('loginBtn');
                    if (loginBtn) {
                        loginBtn.click();
                    }
                };
            }
        }
        
        if (user) {
            await loadEventResults();
        }
    });
});

// Make loadEventResults available globally
window.loadEventResults = loadEventResults;
