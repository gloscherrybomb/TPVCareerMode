// event-detail-results.js - Display event results on event detail page

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

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
    if (arr >= 1200) return 'Gold 3';
    if (arr >= 1100) return 'Gold 2';
    if (arr >= 1000) return 'Gold 1';
    if (arr >= 900) return 'Silver 3';
    if (arr >= 800) return 'Silver 2';
    if (arr >= 700) return 'Silver 1';
    return 'Bronze';
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
        // Fetch results summary from Firestore
        const resultsRef = doc(db, 'results', `season1_event${eventNumber}`);
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

        // Get current user's UID
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        const userUid = userData?.uid;

        // Build results table
        let tableHTML = `
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Rider</th>
                            <th>Team</th>
                            <th>Time</th>
                            <th>ARR</th>
                            <th>Points</th>
                            ${results[0].eventPoints !== null ? '<th>PR Pts</th>' : ''}
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

            tableHTML += `
                <tr class="${rowClass}">
                    <td class="rank-cell">
                        <span class="rank-number ${rankClass}">${result.position}</span>
                    </td>
                    <td class="name-cell">
                        <span class="rider-name">${result.name}</span>
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
                    ${result.eventPoints !== null ? `<td class="event-points-cell">${result.eventPoints}</td>` : ''}
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        // Add explanation for points races if applicable
        if (results[0].eventPoints !== null) {
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
        if (user) {
            await loadEventResults();
        }
    });
});

// Make loadEventResults available globally
window.loadEventResults = loadEventResults;
