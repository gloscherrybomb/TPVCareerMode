// Award Statistics Admin Page
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let app;
let auth;
let db;
let currentUser = null;
let awardStats = {};
let filteredAwards = [];

// Award definitions (matching awards-config.js)
const AWARD_DEFINITIONS = {
    goldMedal: { id: 'goldMedal', title: 'Gold Medal', icon: '🥇', description: 'Win a race', calculationType: 'event', storageKey: 'gold' },
    silverMedal: { id: 'silverMedal', title: 'Silver Medal', icon: '🥈', description: 'Finish 2nd', calculationType: 'event', storageKey: 'silver' },
    bronzeMedal: { id: 'bronzeMedal', title: 'Bronze Medal', icon: '🥉', description: 'Finish 3rd', calculationType: 'event', storageKey: 'bronze' },
    lanternRouge: { id: 'lanternRouge', title: 'Lantern Rouge', icon: '🏮', description: 'Finish last among finishers', calculationType: 'event', storageKey: 'lanternRouge' },
    punchingMedal: { id: 'punchingMedal', title: 'Punching Above', icon: '🥊', description: 'Beat prediction by 10+ places', calculationType: 'event', storageKey: 'punchingMedal' },
    giantKillerMedal: { id: 'giantKillerMedal', title: 'Giant Killer', icon: '⚔️', description: 'Beat the highest-rated rider', calculationType: 'event', storageKey: 'giantKiller' },
    bullseyeMedal: { id: 'bullseyeMedal', title: 'Bullseye', icon: '🎯', description: 'Finish exactly at predicted position', calculationType: 'event', storageKey: 'bullseye' },
    hotStreakMedal: { id: 'hotStreakMedal', title: 'Hot Streak', icon: '🔥', description: 'Beat prediction 3 races in a row', calculationType: 'event', storageKey: 'hotStreak' },
    domination: { id: 'domination', title: 'Domination', icon: '💪', description: 'Win by more than a minute', calculationType: 'event', storageKey: 'domination' },
    closeCall: { id: 'closeCall', title: 'Close Call', icon: '😅', description: 'Win by less than 0.5 seconds', calculationType: 'event', storageKey: 'closeCall' },
    photoFinish: { id: 'photoFinish', title: 'Photo Finish', icon: '📸', description: 'Finish within 0.2s of winner', calculationType: 'event', storageKey: 'photoFinish' },
    overrated: { id: 'overrated', title: 'Overrated', icon: '📉', description: 'Finish worse than predicted 5+ times', calculationType: 'career', storageKey: 'overrated' },
    darkHorse: { id: 'darkHorse', title: 'Dark Horse', icon: '🐴', description: 'Win when predicted 15th or worse', calculationType: 'event', storageKey: 'darkHorse' },
    backToBack: { id: 'backToBack', title: 'Back to Back', icon: '🔁', description: 'Win 2 races in a row', calculationType: 'career', storageKey: 'backToBack' },
    weekendWarrior: { id: 'weekendWarrior', title: 'Weekend Warrior', icon: '🏁', description: 'Complete 5+ events on weekends', calculationType: 'career', storageKey: 'weekendWarrior' },
    zeroToHero: { id: 'zeroToHero', title: 'Zero to Hero', icon: '🦸', description: 'Bottom 20% one event, top 20% next', calculationType: 'career', storageKey: 'zeroToHero' },
    trophyCollector: { id: 'trophyCollector', title: 'Trophy Collector', icon: '🏆', description: 'Podium 5+ times', calculationType: 'career', storageKey: 'trophyCollector' },
    technicalIssues: { id: 'technicalIssues', title: 'Technical Issues', icon: '🔧', description: 'DNF 3+ times', calculationType: 'career', storageKey: 'technicalIssues' },
    gcGoldMedal: { id: 'gcGoldMedal', title: 'GC Winner', icon: '🏆', description: 'Win the overall General Classification', calculationType: 'event', storageKey: 'gcGold' },
    gcSilverMedal: { id: 'gcSilverMedal', title: 'GC Second', icon: '🥈', description: 'Finish 2nd in GC', calculationType: 'event', storageKey: 'gcSilver' },
    gcBronzeMedal: { id: 'gcBronzeMedal', title: 'GC Third', icon: '🥉', description: 'Finish 3rd in GC', calculationType: 'event', storageKey: 'gcBronze' },
    seasonChampion: { id: 'seasonChampion', title: 'Season Champion', icon: '🏆', description: 'Win the overall season standings', calculationType: 'season', storageKey: 'seasonChampion' },
    seasonRunnerUp: { id: 'seasonRunnerUp', title: 'Season Runner-Up', icon: '🥈', description: 'Finish 2nd in season', calculationType: 'season', storageKey: 'seasonRunnerUp' },
    seasonThirdPlace: { id: 'seasonThirdPlace', title: 'Season Third Place', icon: '🥉', description: 'Finish 3rd in season', calculationType: 'season', storageKey: 'seasonThirdPlace' },
    perfectSeason: { id: 'perfectSeason', title: 'Perfect Season', icon: '💯', description: 'Win every event in a season', calculationType: 'season', storageKey: 'perfectSeason' },
    podiumStreak: { id: 'podiumStreak', title: 'Podium Streak', icon: '📈', description: 'Top 3 in 5+ consecutive races', calculationType: 'career', storageKey: 'podiumStreak' },
    specialist: { id: 'specialist', title: 'Specialist', icon: '⭐', description: 'Win 3+ events of the same type', calculationType: 'career', storageKey: 'specialist' },
    allRounder: { id: 'allRounder', title: 'All-Rounder', icon: '🌟', description: 'Win at least one event of 5+ different types', calculationType: 'career', storageKey: 'allRounder' },
    comeback: { id: 'comeback', title: 'Comeback Kid', icon: '🔄', description: 'Finish top 5 after bottom half previous race', calculationType: 'event', storageKey: 'comeback' },
    windTunnel: { id: 'windTunnel', title: 'Wind Tunnel', icon: '🌬️', description: 'Top 5 in TT when predicted outside top 5', calculationType: 'event', storageKey: 'windTunnel' },
    theAccountant: { id: 'theAccountant', title: 'The Accountant', icon: '🧮', description: 'Score more points than the line winner', calculationType: 'event', storageKey: 'theAccountant' },
    theEqualizer: { id: 'theEqualizer', title: 'The Equalizer', icon: '🎚️', description: 'Complete The Leveller special event', calculationType: 'event', storageKey: 'theEqualizer' },
    singaporeSling: { id: 'singaporeSling', title: 'Singapore Sling', icon: '🍸', description: 'Podium at the Singapore Criterium', calculationType: 'event', storageKey: 'singaporeSling' },
    powerSurge: { id: 'powerSurge', title: 'Power Surge', icon: '💥', description: 'Max power 30%+ above average, top 10', calculationType: 'event', storageKey: 'powerSurge' },
    steadyEddie: { id: 'steadyEddie', title: 'Steady Eddie', icon: '📊', description: 'NP within 1% of average power', calculationType: 'event', storageKey: 'steadyEddie' },
    blastOff: { id: 'blastOff', title: 'Blast Off', icon: '🚀', description: 'Break 1300W max power (one-time)', calculationType: 'career', storageKey: 'blastOff' },
    smoothOperator: { id: 'smoothOperator', title: 'Smooth Operator', icon: '🎵', description: 'Smallest % diff between AP and NP in top 5', calculationType: 'event', storageKey: 'smoothOperator' },
    bunchKick: { id: 'bunchKick', title: 'Bunch Kick', icon: '💢', description: 'Highest max power in group sprint', calculationType: 'event', storageKey: 'bunchKick' },
    fanFavourite: { id: 'fanFavourite', title: 'Fan Favourite', icon: '💜', description: 'Receive 100 high-5s from community', calculationType: 'career', storageKey: 'fanFavourite' },
    gluttonForPunishment: { id: 'gluttonForPunishment', title: 'Glutton for Punishment', icon: '🎖️', description: 'Reset and restart after completing season', calculationType: 'career', storageKey: 'gluttonForPunishment' }
};

// Initialize Firebase
async function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        console.log('Firebase initialized for Award Stats');

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const isAdmin = await checkAdminStatus(user.uid);

                if (isAdmin) {
                    currentUser = user;
                    showAdminContent();
                    await loadAwardStatistics();
                } else {
                    showUnauthorized();
                }
            } else {
                showUnauthorized();
            }
        });

    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

// Check if user is admin
async function checkAdminStatus(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.isAdmin === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Show/hide UI sections
function showAdminContent() {
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('unauthorized').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
}

function showUnauthorized() {
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('unauthorized').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
}

// Load award statistics from all users
async function loadAwardStatistics() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));

        // Initialize stats for each award
        awardStats = {};
        for (const [awardId, config] of Object.entries(AWARD_DEFINITIONS)) {
            awardStats[awardId] = {
                ...config,
                totalEarned: 0,
                uniqueRiders: 0
            };
        }

        // Track unique riders who have earned any award
        const ridersWithAnyAward = new Set();

        // Iterate through users and aggregate
        usersSnapshot.forEach(docSnapshot => {
            // Skip bot users
            if (docSnapshot.id.startsWith('Bot')) return;

            const userData = docSnapshot.data();
            const awards = userData.awards || {};

            let userHasAnyAward = false;

            // Check each award type
            for (const [awardId, config] of Object.entries(AWARD_DEFINITIONS)) {
                const storageKey = config.storageKey;
                const count = awards[storageKey] || 0;

                if (count > 0) {
                    awardStats[awardId].totalEarned += count;
                    awardStats[awardId].uniqueRiders += 1;
                    userHasAnyAward = true;
                }
            }

            if (userHasAnyAward) {
                ridersWithAnyAward.add(docSnapshot.id);
            }
        });

        console.log(`Loaded award stats from ${usersSnapshot.size} users`);

        // Update summary stats
        updateSummaryStats(ridersWithAnyAward.size);

        // Apply filters and render
        applyFiltersAndSort();

    } catch (error) {
        console.error('Error loading award statistics:', error);
        document.getElementById('awardsGrid').innerHTML =
            '<p style="color: var(--text-secondary); text-align: center;">Error loading award statistics. Please try again.</p>';
    }
}

// Update summary stats cards
function updateSummaryStats(uniqueEarnersCount) {
    const totalAwardTypes = Object.keys(AWARD_DEFINITIONS).length;
    const totalAwarded = Object.values(awardStats).reduce((sum, a) => sum + a.totalEarned, 0);

    document.getElementById('totalAwardTypes').textContent = totalAwardTypes;
    document.getElementById('totalAwarded').textContent = totalAwarded.toLocaleString();
    document.getElementById('uniqueEarners').textContent = uniqueEarnersCount;
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const sortBy = document.getElementById('sortSelect').value;
    const filterBy = document.getElementById('filterSelect').value;

    // Convert to array and filter
    filteredAwards = Object.values(awardStats).filter(award => {
        if (filterBy === 'all') return true;
        if (filterBy === 'event') return award.calculationType === 'event';
        if (filterBy === 'career') return award.calculationType === 'career';
        if (filterBy === 'season') return award.calculationType === 'season';
        if (filterBy === 'earned') return award.totalEarned > 0;
        if (filterBy === 'unearned') return award.totalEarned === 0;
        return true;
    });

    // Sort
    filteredAwards.sort((a, b) => {
        switch (sortBy) {
            case 'total-desc':
                return b.totalEarned - a.totalEarned;
            case 'total-asc':
                return a.totalEarned - b.totalEarned;
            case 'riders-desc':
                return b.uniqueRiders - a.uniqueRiders;
            case 'riders-asc':
                return a.uniqueRiders - b.uniqueRiders;
            case 'name-asc':
                return a.title.localeCompare(b.title);
            default:
                return b.totalEarned - a.totalEarned;
        }
    });

    // Update count display
    document.getElementById('filteredCount').textContent =
        `Showing ${filteredAwards.length} of ${Object.keys(AWARD_DEFINITIONS).length} awards`;

    // Render
    renderAwardsGrid();
}

// Render awards grid
function renderAwardsGrid() {
    const container = document.getElementById('awardsGrid');

    if (filteredAwards.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">No awards match the current filter.</p>';
        return;
    }

    container.innerHTML = filteredAwards.map(award => `
        <div class="award-card type-${award.calculationType}">
            <div class="award-header">
                <div class="award-icon">${award.icon}</div>
                <div class="award-title-section">
                    <div class="award-title">${escapeHtml(award.title)}</div>
                    <span class="award-type-badge ${award.calculationType}">${award.calculationType}</span>
                </div>
            </div>
            <div class="award-description">${escapeHtml(award.description)}</div>
            <div class="award-stats">
                <div class="award-stat">
                    <div class="award-stat-value">${award.totalEarned.toLocaleString()}</div>
                    <div class="award-stat-label">Times Earned</div>
                </div>
                <div class="award-stat">
                    <div class="award-stat-value">${award.uniqueRiders}</div>
                    <div class="award-stat-label">Unique Riders</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();

    // Sort dropdown
    document.getElementById('sortSelect').addEventListener('change', () => {
        applyFiltersAndSort();
    });

    // Filter dropdown
    document.getElementById('filterSelect').addEventListener('change', () => {
        applyFiltersAndSort();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        btn.textContent = 'Refreshing...';
        btn.disabled = true;
        await loadAwardStatistics();
        btn.textContent = 'Refresh Data';
        btn.disabled = false;
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
});
