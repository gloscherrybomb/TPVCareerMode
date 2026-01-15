// Unlock Statistics Admin Page
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
let unlockStats = {};
let filteredUnlocks = [];
let UNLOCK_DEFINITIONS = [];

// Initialize Firebase
async function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        console.log('Firebase initialized for Unlock Stats');

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const isAdmin = await checkAdminStatus(user.uid);

                if (isAdmin) {
                    currentUser = user;
                    showAdminContent();
                    await loadUnlockStatistics();
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

// Load unlock statistics from all users
async function loadUnlockStatistics() {
    try {
        // Load unlock definitions
        UNLOCK_DEFINITIONS = (window.unlockConfig && window.unlockConfig.UNLOCK_DEFINITIONS) || [];

        if (UNLOCK_DEFINITIONS.length === 0) {
            console.error('No unlock definitions found');
            document.getElementById('unlocksGrid').innerHTML =
                '<p style="color: var(--text-secondary); text-align: center;">Error: Unlock definitions not loaded.</p>';
            return;
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));

        // Initialize stats for each unlock
        unlockStats = {};
        UNLOCK_DEFINITIONS.forEach(unlock => {
            unlockStats[unlock.id] = {
                ...unlock,
                owners: 0,
                timesTriggered: 0
            };
        });

        // Track users who own at least one unlock
        const usersWithUnlocks = new Set();

        // Iterate through users and aggregate
        usersSnapshot.forEach(docSnapshot => {
            // Skip bot users
            if (docSnapshot.id.startsWith('Bot')) return;

            const userData = docSnapshot.data();
            const inventory = userData.unlocks?.inventory || [];

            // Count regular unlock purchases
            inventory.forEach(unlockId => {
                if (unlockStats[unlockId]) {
                    unlockStats[unlockId].owners += 1;
                    usersWithUnlocks.add(docSnapshot.id);
                }
            });

            // Count special item purchases (stored as boolean flags)
            if (userData.hasHighRollerFlair === true && unlockStats['money-bags']) {
                unlockStats['money-bags'].owners += 1;
                usersWithUnlocks.add(docSnapshot.id);
            }
            if (userData.hasSingaporeCriterium === true && unlockStats['singapore-criterium']) {
                unlockStats['singapore-criterium'].owners += 1;
                usersWithUnlocks.add(docSnapshot.id);
            }

            // Count unlock triggers from event results
            for (let eventNum = 1; eventNum <= 15; eventNum++) {
                const eventResults = userData[`event${eventNum}Results`];
                if (eventResults && eventResults.unlockBonusesApplied) {
                    eventResults.unlockBonusesApplied.forEach(appliedUnlock => {
                        const unlockId = appliedUnlock.id;
                        if (unlockStats[unlockId]) {
                            unlockStats[unlockId].timesTriggered += 1;
                        }
                    });
                }
            }
        });

        console.log(`Loaded unlock stats from ${usersSnapshot.size} users`);

        // Update summary stats
        updateSummaryStats(usersWithUnlocks.size);

        // Apply filters and render
        applyFiltersAndSort();

    } catch (error) {
        console.error('Error loading unlock statistics:', error);
        document.getElementById('unlocksGrid').innerHTML =
            '<p style="color: var(--text-secondary); text-align: center;">Error loading unlock statistics. Please try again.</p>';
    }
}

// Update summary stats cards
function updateSummaryStats(activeUsersCount) {
    const totalUnlockTypes = UNLOCK_DEFINITIONS.length;
    const totalPurchases = Object.values(unlockStats).reduce((sum, u) => sum + u.owners, 0);
    const totalTriggers = Object.values(unlockStats).reduce((sum, u) => sum + u.timesTriggered, 0);

    document.getElementById('totalUnlockTypes').textContent = totalUnlockTypes;
    document.getElementById('totalPurchases').textContent = totalPurchases.toLocaleString();
    document.getElementById('totalTriggers').textContent = totalTriggers.toLocaleString();
    document.getElementById('activeUsers').textContent = activeUsersCount;
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const sortBy = document.getElementById('sortSelect').value;
    const filterBy = document.getElementById('filterSelect').value;

    // Convert to array and filter
    filteredUnlocks = Object.values(unlockStats).filter(unlock => {
        if (filterBy === 'all') return true;

        // Tier filters
        if (filterBy === 'tier-120') return unlock.tier === 120;
        if (filterBy === 'tier-200') return unlock.tier === 200;
        if (filterBy === 'tier-300') return unlock.tier === 300;
        if (filterBy === 'tier-400') return unlock.tier === 400;
        if (filterBy === 'tier-special') return unlock.isFlair || unlock.isSpecialEvent;

        // Purchase filters
        if (filterBy === 'owned') return unlock.owners > 0;
        if (filterBy === 'never-purchased') return unlock.owners === 0;

        // Trigger filters
        if (filterBy === 'triggered') return unlock.timesTriggered > 0;
        if (filterBy === 'never-triggered') return unlock.timesTriggered === 0;

        return true;
    });

    // Sort
    filteredUnlocks.sort((a, b) => {
        switch (sortBy) {
            case 'owned-desc':
                return b.owners - a.owners;
            case 'owned-asc':
                return a.owners - b.owners;
            case 'triggers-desc':
                return b.timesTriggered - a.timesTriggered;
            case 'triggers-asc':
                return a.timesTriggered - b.timesTriggered;
            case 'tier-asc':
                return a.tier - b.tier;
            case 'name-asc':
                return a.name.localeCompare(b.name);
            default:
                return b.owners - a.owners;
        }
    });

    // Update count display
    document.getElementById('filteredCount').textContent =
        `Showing ${filteredUnlocks.length} of ${UNLOCK_DEFINITIONS.length} unlocks`;

    // Render
    renderUnlocksGrid();
}

// Get tier class for styling
function getTierClass(unlock) {
    if (unlock.isFlair || unlock.isSpecialEvent) return 'tier-special';
    return `tier-${unlock.tier}`;
}

// Render unlocks grid
function renderUnlocksGrid() {
    const container = document.getElementById('unlocksGrid');

    if (filteredUnlocks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">No unlocks match the current filter.</p>';
        return;
    }

    container.innerHTML = filteredUnlocks.map(unlock => {
        const tierClass = getTierClass(unlock);
        const tierLabel = unlock.isFlair ? 'Flair' : unlock.isSpecialEvent ? 'Special Event' : `Tier ${unlock.tier}`;

        // Try to get icon, fall back to emoji if TPVIcons isn't available
        const iconHtml = (window.TPVIcons && window.TPVIcons.getIconFallback)
            ? window.TPVIcons.getIconFallback(unlock.id)
            : unlock.emoji;

        return `
        <div class="unlock-card ${tierClass}">
            <div class="unlock-header">
                <div class="unlock-icon">${iconHtml}</div>
                <div class="unlock-title-section">
                    <div class="unlock-title">${escapeHtml(unlock.name)}</div>
                    <div class="unlock-badges">
                        <span class="unlock-tier-badge ${tierClass}">${tierLabel}</span>
                        <span class="unlock-cost-badge">${unlock.cost} CC</span>
                    </div>
                </div>
            </div>
            <div class="unlock-description">${escapeHtml(unlock.description)}</div>
            <div class="unlock-stats">
                <div class="unlock-stat">
                    <div class="unlock-stat-value">${unlock.owners}</div>
                    <div class="unlock-stat-label">Owners</div>
                </div>
                <div class="unlock-stat">
                    <div class="unlock-stat-value">${unlock.timesTriggered.toLocaleString()}</div>
                    <div class="unlock-stat-label">Times Triggered</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
        await loadUnlockStatistics();
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
