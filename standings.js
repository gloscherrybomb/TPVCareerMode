// Standings Page Logic for TPV Career Mode

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

// Dummy season standings data (will be replaced with real data from CSV processing)
function generateDummySeasonStandings(userName, userArr) {
    const botRacers = [
        { uid: "Bot001", name: "Stephen Burgess", arr: 1280, team: "Formix" },
        { uid: "Bot002", name: "Adam Stuart", arr: 1256, team: "" },
        { uid: "Bot003", name: "Damien Fournier", arr: 1119, team: "Fujikai" },
        { uid: "Bot004", name: "Enchen Vong", arr: 1113, team: "Monova" },
        { uid: "Bot005", name: "Jean Francois", arr: 1013, team: "" },
        { uid: "Bot006", name: "Lucca Cardoso", arr: 1112, team: "Patriot" },
        { uid: "Bot007", name: "Roy Jackson", arr: 1121, team: "" },
        { uid: "Bot008", name: "Katerina Dodig", arr: 1031, team: "Formix" },
        { uid: "Bot009", name: "Benjamin Rosenberg", arr: 1047, team: "" },
        { uid: "Bot010", name: "Odell Hartman", arr: 1001, team: "Fable" },
        { uid: "Bot011", name: "Eliel Niskanen", arr: 1087, team: "Optech" },
        { uid: "Bot012", name: "Bradley Xiong", arr: 1065, team: "" },
        { uid: "Bot013", name: "Alonzo Fontana", arr: 1005, team: "Windsail" },
        { uid: "Bot014", name: "Juan Miguel", arr: 1022, team: "Zonkify" },
        { uid: "Bot015", name: "Ethan Flynn", arr: 1236, team: "Hinal" },
        { uid: "Bot016", name: "Ki Ham", arr: 1000, team: "" },
        { uid: "Bot017", name: "Omar Sahraoui", arr: 1026, team: "" },
        { uid: "Bot018", name: "Antonio Martins", arr: 1141, team: "Nuvio" },
        { uid: "Bot019", name: "Danylo Semenyuk", arr: 1004, team: "Delta" },
        { uid: "Bot020", name: "Anaïs Michel", arr: 1118, team: "Base" },
        { uid: "Bot021", name: "Paul Zimmermann", arr: 1091, team: "Ampex" },
        { uid: "Bot022", name: "Hannu Lehtinen", arr: 1128, team: "" },
        { uid: "Bot023", name: "Miriam Locatelli", arr: 1034, team: "Eckleson" },
        { uid: "Bot024", name: "Archie Macleod", arr: 1060, team: "Windsail" },
        { uid: "Bot025", name: "Raymond Benoit", arr: 1127, team: "" }
    ];

    // Generate standings with realistic point distributions
    const standings = botRacers.map((racer, index) => {
        // Generate events completed (between 1-3 for variety)
        const eventsCompleted = Math.floor(Math.random() * 3) + 1;
        
        // Generate points based on ARR and events (higher ARR = more points typically)
        const avgPointsPerEvent = Math.floor((racer.arr / 1000) * 70) + Math.floor(Math.random() * 30);
        const points = avgPointsPerEvent * eventsCompleted;
        
        return {
            uid: racer.uid,
            name: racer.name,
            arr: racer.arr,
            team: racer.team,
            events: eventsCompleted,
            points: points,
            isBot: true,
            isCurrentUser: false
        };
    });

    // Add current user (position around 9th place)
    const userEvents = 2; // User has completed 2 events
    const userPoints = 130; // From their progress
    standings.splice(8, 0, {
        uid: currentUser?.uid || "user",
        name: userName || "You",
        arr: userArr || 1196,
        team: "Chaos",
        events: userEvents,
        points: userPoints,
        isBot: false,
        isCurrentUser: true
    });

    // Sort by points (descending)
    standings.sort((a, b) => b.points - a.points);

    return standings;
}

// Render Season Standings
async function renderSeasonStandings() {
    const seasonContent = document.getElementById('seasonStandings');
    
    if (!currentUser) {
        // User not logged in
        seasonContent.innerHTML = `
            <div class="login-prompt">
                <div class="login-prompt-icon">🔒</div>
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your season standings.</p>
                <button class="btn btn-primary" onclick="document.getElementById('loginBtn').click()">
                    Log In
                </button>
            </div>
        `;
        return;
    }

    // Fetch user data
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    
    // Check if we have saved season standings, otherwise generate dummy data
    let standings = userData?.season1Standings;
    
    if (!standings) {
        // Generate dummy standings
        standings = generateDummySeasonStandings(userData?.name, userData?.arr || 1196);
        
        // TODO: Save to Firestore (for now just use in memory)
        // await updateDoc(doc(db, 'users', currentUser.uid), { season1Standings: standings });
    }

    // Debug logging
    console.log('Season Standings - First 3 racers:', standings.slice(0, 3));
    console.log('Season Standings - Sample bot:', standings.find(r => r.uid && r.uid.startsWith('Bot')));

    // Build table HTML
    let tableHTML = `
        <div class="standings-table-container">
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Rider</th>
                        <th>Team</th>
                        <th>ARR</th>
                        <th>Events</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
    `;

    standings.forEach((racer, index) => {
        const rank = index + 1;
        const rowClass = racer.isCurrentUser ? 'current-user-row' : '';
        const teamDisplay = racer.team || '<span class="no-team">—</span>';
        
        // Podium class for top 3
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-gold';
        else if (rank === 2) rankClass = 'rank-silver';
        else if (rank === 3) rankClass = 'rank-bronze';
        
        tableHTML += `
            <tr class="${rowClass}">
                <td class="rank-cell">
                    <span class="rank-number ${rankClass}">${rank}</span>
                </td>
                <td class="name-cell">
                    <span class="rider-name">${makeNameClickable(racer.name, racer.uid)}</span>
                    ${racer.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                </td>
                <td class="team-cell">${teamDisplay}</td>
                <td class="arr-cell">
                    <span class="arr-value">${racer.arr}</span>
                    <span class="arr-band">${getARRBand(racer.arr)}</span>
                </td>
                <td class="events-cell">${racer.events}</td>
                <td class="points-cell">
                    <span class="points-value">${racer.points}</span>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    seasonContent.innerHTML = tableHTML;
}

// Render Global Rankings
async function renderGlobalRankings() {
    const globalContent = document.getElementById('globalRankings');
    
    try {
        // Fetch all users from Firestore
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        const rankings = [];
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            rankings.push({
                uid: doc.id,  // Add UID from document ID
                name: data.name || 'Unknown',
                season: data.currentSeason || 1,
                events: data.totalEvents || (data.completedStages?.length || 0),
                points: data.totalPoints || 0,
                isCurrentUser: currentUser && doc.id === currentUser.uid
            });
        });

        // Sort by total points (descending)
        rankings.sort((a, b) => b.points - a.points);

        // Build table HTML
        let tableHTML = `
            <div class="standings-table-container">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Rider</th>
                            <th>Season</th>
                            <th>Events</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (rankings.length === 0) {
            tableHTML += `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p>No riders yet. Be the first to compete!</p>
                    </td>
                </tr>
            `;
        } else {
            rankings.forEach((racer, index) => {
                const rank = index + 1;
                const rowClass = racer.isCurrentUser ? 'current-user-row' : '';
                
                // Podium class for top 3
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';
                
                tableHTML += `
                    <tr class="${rowClass}">
                        <td class="rank-cell">
                            <span class="rank-number ${rankClass}">${rank}</span>
                        </td>
                        <td class="name-cell">
                            <span class="rider-name">${makeNameClickable(racer.name, racer.uid)}</span>
                            ${racer.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                        </td>
                        <td class="season-cell">Season ${racer.season}</td>
                        <td class="events-cell">${racer.events}</td>
                        <td class="points-cell">
                            <span class="points-value">${racer.points}</span>
                        </td>
                    </tr>
                `;
            });
        }

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        globalContent.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error loading global rankings:', error);
        globalContent.innerHTML = `
            <div class="error-state">
                <p>Error loading rankings. Please try again later.</p>
            </div>
        `;
    }
}

// Get ARR band label
function getARRBand(arr) {
    if (arr >= 1200) return 'Gold 3';
    if (arr >= 1100) return 'Gold 2';
    if (arr >= 1000) return 'Gold 1';
    if (arr >= 900) return 'Silver 3';
    if (arr >= 800) return 'Silver 2';
    if (arr >= 700) return 'Silver 1';
    return 'Bronze';
}

// Tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const seasonContent = document.getElementById('seasonContent');
    const globalContent = document.getElementById('globalContent');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide content
            if (tab === 'season') {
                seasonContent.classList.add('active');
                globalContent.classList.remove('active');
            } else {
                seasonContent.classList.remove('active');
                globalContent.classList.add('active');
            }
        });
    });
}

// Initialize on auth state change
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    // Render both tabs
    await renderSeasonStandings();
    await renderGlobalRankings();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    renderSeasonStandings();
    renderGlobalRankings();
});

// Make functions available globally
window.renderSeasonStandings = renderSeasonStandings;
window.renderGlobalRankings = renderGlobalRankings;
