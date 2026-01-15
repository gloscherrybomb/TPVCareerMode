// Contributor Admin Page
import { firebaseConfig } from './firebase-config.js';
import { escapeHtml } from './utils.js';
import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let app;
let auth;
let db;
let currentUser = null;
let allUsers = [];

// Initialize Firebase
async function initFirebase() {
    try {
        // Initialize Firebase app
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        console.log('Firebase initialized for Contributor Admin');

        // Check authentication
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user is admin
                const isAdmin = await checkAdminStatus(user.uid);

                if (isAdmin) {
                    currentUser = user;
                    showAdminContent();
                    await loadStats();
                    await loadRecentContributors();
                } else {
                    showUnauthorized();
                }
            } else {
                showUnauthorized();
            }
        });

    } catch (error) {
        console.error('Error initializing Firebase:', error);
        showToast('Failed to initialize. Please refresh the page.', 'error');
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

// Load stats
async function loadStats() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let totalUsers = 0;
        let totalContributors = 0;

        usersSnapshot.forEach(doc => {
            // Skip bot users
            if (!doc.id.startsWith('Bot')) {
                totalUsers++;
                const data = doc.data();
                if (data.isContributor) {
                    totalContributors++;
                }
            }
        });

        document.getElementById('totalContributors').textContent = totalContributors;
        document.getElementById('totalUsers').textContent = totalUsers;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent contributors
async function loadRecentContributors() {
    const container = document.getElementById('recentContributors');

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const contributors = [];

        usersSnapshot.forEach(docSnapshot => {
            const data = docSnapshot.data();
            if (data.isContributor && !docSnapshot.id.startsWith('Bot')) {
                contributors.push({
                    id: docSnapshot.id,
                    ...data
                });
            }
        });

        // Sort by contributorSince (newest first)
        contributors.sort((a, b) => {
            const aTime = a.contributorSince?.toMillis?.() || 0;
            const bTime = b.contributorSince?.toMillis?.() || 0;
            return bTime - aTime;
        });

        if (contributors.length === 0) {
            container.innerHTML = '<div class="no-results">No contributors yet</div>';
            return;
        }

        container.innerHTML = contributors.map(user => renderUserCard(user)).join('');
        attachCardListeners();
    } catch (error) {
        console.error('Error loading contributors:', error);
        container.innerHTML = '<div class="no-results">Error loading contributors</div>';
    }
}

// Search users
async function searchUsers(searchTerm) {
    const container = document.getElementById('searchResults');

    if (!searchTerm || searchTerm.trim().length < 2) {
        container.innerHTML = '<div class="no-results">Enter at least 2 characters to search</div>';
        return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Searching...</p></div>';

    try {
        const searchLower = searchTerm.toLowerCase().trim();
        const searchUpper = searchTerm.toUpperCase().trim();

        // Get all users and filter client-side (Firestore doesn't support case-insensitive search)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const matchingUsers = [];

        usersSnapshot.forEach(docSnapshot => {
            // Skip bots
            if (docSnapshot.id.startsWith('Bot')) return;

            const data = docSnapshot.data();
            const name = (data.name || '').toLowerCase();
            const uid = (data.uid || '').toUpperCase();
            const email = (data.email || '').toLowerCase();

            if (name.includes(searchLower) || uid.includes(searchUpper) || email.includes(searchLower)) {
                matchingUsers.push({
                    id: docSnapshot.id,
                    ...data
                });
            }
        });

        if (matchingUsers.length === 0) {
            container.innerHTML = '<div class="no-results">No users found matching "' + escapeHtml(searchTerm) + '"</div>';
            return;
        }

        // Sort: contributors first, then alphabetically
        matchingUsers.sort((a, b) => {
            if (a.isContributor && !b.isContributor) return -1;
            if (!a.isContributor && b.isContributor) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        container.innerHTML = matchingUsers.slice(0, 20).map(user => renderUserCard(user)).join('');
        attachCardListeners();

        if (matchingUsers.length > 20) {
            container.innerHTML += `<div class="no-results">Showing first 20 of ${matchingUsers.length} results</div>`;
        }
    } catch (error) {
        console.error('Error searching users:', error);
        container.innerHTML = '<div class="no-results">Error searching users</div>';
    }
}

// Render a user card
function renderUserCard(user) {
    const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const contributorSince = user.contributorSince?.toDate?.()
        ? formatDate(user.contributorSince.toDate())
        : '';

    return `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-info">
                <div class="user-avatar">
                    ${user.photoURL
                        ? `<img src="${user.photoURL}" alt="${escapeHtml(user.name)}" onerror="this.parentElement.textContent='${escapeHtml(initials)}'">`
                        : escapeHtml(initials)}
                </div>
                <div class="user-details">
                    <h3>${escapeHtml(user.name || 'Unknown')} ${user.isContributor ? '<span style="color: #ffd700;">' + (window.TPVIcons ? window.TPVIcons.getIcon('contributorStar', { size: 'sm' }) : '⭐') + '</span>' : ''}</h3>
                    <p>UID: ${escapeHtml(user.uid || 'N/A')}</p>
                    ${contributorSince ? `<div class="contributor-since">Contributor since: ${contributorSince}</div>` : ''}
                </div>
            </div>
            <div class="user-status">
                <div class="contributor-badge ${user.isContributor ? '' : 'inactive'}">
                    ${user.isContributor ? (window.TPVIcons ? window.TPVIcons.getIcon('contributorStar', { size: 'xs' }) : '⭐') + ' Contributor' : 'Not a contributor'}
                </div>
                ${user.isContributor
                    ? `<button class="btn-toggle btn-revoke" data-action="revoke" data-user-id="${user.id}" data-user-name="${user.name}">Revoke</button>`
                    : `<button class="btn-toggle btn-grant" data-action="grant" data-user-id="${user.id}" data-user-name="${user.name}">Grant</button>`
                }
            </div>
        </div>
    `;
}

// Format date
function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Attach event listeners to cards
function attachCardListeners() {
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const userId = e.target.dataset.userId;
            const userName = e.target.dataset.userName;

            if (action === 'grant') {
                await grantContributorStatus(userId, userName);
            } else if (action === 'revoke') {
                if (confirm(`Are you sure you want to revoke contributor status from ${userName}?`)) {
                    await revokeContributorStatus(userId, userName);
                }
            }
        });
    });
}

// Grant contributor status
async function grantContributorStatus(userId, userName) {
    try {
        await updateDoc(doc(db, 'users', userId), {
            isContributor: true,
            contributorSince: Timestamp.now()
        });

        showToast(`Granted contributor status to ${userName}`, 'success');

        // Refresh displays
        await loadStats();
        await loadRecentContributors();

        // Re-run search if there's a search term
        const searchTerm = document.getElementById('searchInput').value;
        if (searchTerm) {
            await searchUsers(searchTerm);
        }
    } catch (error) {
        console.error('Error granting contributor status:', error);
        showToast('Failed to grant contributor status', 'error');
    }
}

// Revoke contributor status
async function revokeContributorStatus(userId, userName) {
    try {
        await updateDoc(doc(db, 'users', userId), {
            isContributor: false
        });

        showToast(`Revoked contributor status from ${userName}`, 'success');

        // Refresh displays
        await loadStats();
        await loadRecentContributors();

        // Re-run search if there's a search term
        const searchTerm = document.getElementById('searchInput').value;
        if (searchTerm) {
            await searchUsers(searchTerm);
        }
    } catch (error) {
        console.error('Error revoking contributor status:', error);
        showToast('Failed to revoke contributor status', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();

    // Search button
    document.getElementById('searchBtn').addEventListener('click', () => {
        const searchTerm = document.getElementById('searchInput').value;
        searchUsers(searchTerm);
    });

    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = document.getElementById('searchInput').value;
            searchUsers(searchTerm);
        }
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
