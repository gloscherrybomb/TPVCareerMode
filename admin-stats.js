// Usage Statistics Admin Page
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
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 20;
let currentPeriod = 'weekly';
let currentTrendDays = 7;
let analyticsData = {};

// Page name display labels
const PAGE_LABELS = {
    home: 'Home',
    events: 'Events',
    profile: 'Profile',
    palmares: 'Palmares',
    standings: 'Standings',
    resultsFeed: 'Results Feed'
};

// Initialize Firebase
async function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        console.log('Firebase initialized for Usage Stats');

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const isAdmin = await checkAdminStatus(user.uid);

                if (isAdmin) {
                    currentUser = user;
                    showAdminContent();
                    await loadAllUserData();
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

// Normalize date from various formats
function normalizeDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate(); // Firestore Timestamp
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    return null;
}

// Get the last activity date for a user
function getLastActivity(user) {
    let lastActivity = null;
    let lastEventName = null;

    // Check events 1-15 and special events 101, 102
    const eventNumbers = [...Array(15).keys()].map(i => i + 1).concat([101, 102]);

    for (const eventNum of eventNumbers) {
        const eventResults = user[`event${eventNum}Results`];
        if (eventResults) {
            const raceDate = eventResults.raceDate || eventResults.processedAt;
            if (raceDate) {
                const date = normalizeDate(raceDate);
                if (date && (!lastActivity || date > lastActivity)) {
                    lastActivity = date;
                    lastEventName = eventNum > 100 ? `Special ${eventNum}` : `Event ${eventNum}`;
                }
            }
        }
    }

    return { lastActivity, lastEventName };
}

// Get the registration date for a user
function getRegistrationDate(user) {
    // Try createdAt first
    if (user.createdAt) {
        return normalizeDate(user.createdAt);
    }

    // Fall back to earliest event date
    let earliestDate = null;
    const eventNumbers = [...Array(15).keys()].map(i => i + 1).concat([101, 102]);

    for (const eventNum of eventNumbers) {
        const eventResults = user[`event${eventNum}Results`];
        if (eventResults) {
            const raceDate = eventResults.raceDate || eventResults.processedAt;
            if (raceDate) {
                const date = normalizeDate(raceDate);
                if (date && (!earliestDate || date < earliestDate)) {
                    earliestDate = date;
                }
            }
        }
    }

    return earliestDate;
}

// Count events completed by a user
function getEventCount(user) {
    if (user.season1Events) return user.season1Events;
    if (user.careerEvents) return user.careerEvents;

    // Count manually
    let count = 0;
    const eventNumbers = [...Array(15).keys()].map(i => i + 1).concat([101, 102]);
    for (const eventNum of eventNumbers) {
        if (user[`event${eventNum}Results`]) {
            count++;
        }
    }
    return count;
}

// Load all user data and calculate metrics
async function loadAllUserData() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = [];

        usersSnapshot.forEach(docSnapshot => {
            // Skip bot users
            if (!docSnapshot.id.startsWith('Bot')) {
                const userData = docSnapshot.data();
                const { lastActivity, lastEventName } = getLastActivity(userData);
                const registrationDate = getRegistrationDate(userData);
                const eventCount = getEventCount(userData);

                allUsers.push({
                    id: docSnapshot.id,
                    name: userData.name || 'Unknown',
                    uid: userData.uid || docSnapshot.id,
                    currentStage: userData.currentStage || 1,
                    currentSeason: userData.currentSeason || 1,
                    eventCount,
                    lastActivity,
                    lastEventName,
                    registrationDate,
                    hasEvent15: !!userData.event15Results,
                    ...userData
                });
            }
        });

        console.log(`Loaded ${allUsers.length} users`);

        // Update all displays
        updateKeyStats();
        updateRetentionMetrics();
        updateRegistrationChart();
        applyFiltersAndSearch();

        // Load site analytics
        await loadAnalyticsData();

    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Get date string in YYYY-MM-DD format
function getDateString(date) {
    return date.toISOString().split('T')[0];
}

// Load analytics data from Firestore
async function loadAnalyticsData() {
    try {
        const now = new Date();
        const days = Math.max(currentTrendDays, 30); // Load up to 30 days
        analyticsData = {};

        // Fetch analytics docs for the past N days
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = getDateString(date);

            try {
                const docSnap = await getDoc(doc(db, 'analytics', dateStr));
                if (docSnap.exists()) {
                    analyticsData[dateStr] = docSnap.data();
                }
            } catch (e) {
                // Document doesn't exist, skip
            }
        }

        console.log(`Loaded analytics for ${Object.keys(analyticsData).length} days`);

        // Update displays
        updateSiteAnalyticsStats();
        updatePageViewsChart();
        updatePageViewsTrendChart();

    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

// Update site analytics stats (today's data)
function updateSiteAnalyticsStats() {
    const today = getDateString(new Date());
    const todayData = analyticsData[today] || {};

    const pageViews = todayData.totalPageViews || 0;
    const sessions = todayData.sessions || 0;
    const totalDuration = todayData.totalDurationSeconds || 0;

    // Calculate averages
    const avgDuration = sessions > 0 ? Math.floor(totalDuration / sessions) : 0;
    const avgPages = sessions > 0 ? (pageViews / sessions).toFixed(1) : '0';

    // Format duration as minutes:seconds
    const durationMinutes = Math.floor(avgDuration / 60);
    const durationSeconds = avgDuration % 60;
    const durationStr = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

    document.getElementById('todayPageViews').textContent = pageViews;
    document.getElementById('todaySessions').textContent = sessions;
    document.getElementById('avgSessionDuration').textContent = durationStr;
    document.getElementById('avgPagesPerSession').textContent = avgPages;
}

// Update page views by page chart (today)
function updatePageViewsChart() {
    const container = document.getElementById('pageViewsChart');
    const today = getDateString(new Date());
    const todayData = analyticsData[today] || {};
    const pageViews = todayData.pageViews || {};

    const pages = Object.keys(PAGE_LABELS);
    const data = pages.map(page => ({
        page,
        label: PAGE_LABELS[page],
        count: pageViews[page] || 0
    }));

    // Sort by count descending
    data.sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...data.map(d => d.count), 1);

    if (data.every(d => d.count === 0)) {
        container.innerHTML = '<div class="no-data">No page view data for today</div>';
        return;
    }

    let html = '';
    for (const item of data) {
        const percentage = (item.count / maxCount) * 100;
        html += `
            <div class="bar-row">
                <div class="bar-label">${item.label}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                    <div class="bar-value">${item.count}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Update page views trend chart
function updatePageViewsTrendChart() {
    const container = document.getElementById('pageViewsTrendChart');
    const now = new Date();
    const buckets = [];

    for (let i = currentTrendDays - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const dayData = analyticsData[dateStr] || {};

        buckets.push({
            date: dateStr,
            label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            pageViews: dayData.totalPageViews || 0,
            sessions: dayData.sessions || 0
        });
    }

    const maxViews = Math.max(...buckets.map(b => b.pageViews), 1);

    if (buckets.every(b => b.pageViews === 0)) {
        container.innerHTML = '<div class="no-data">No page view trend data available</div>';
        return;
    }

    let html = '';
    for (const bucket of buckets) {
        const percentage = (bucket.pageViews / maxViews) * 100;
        html += `
            <div class="bar-row">
                <div class="bar-label">${bucket.label}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                    <div class="bar-value">${bucket.pageViews}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Update key stats cards
function updateKeyStats() {
    const now = new Date();
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const active7d = allUsers.filter(u => u.lastActivity && u.lastActivity >= day7Ago).length;
    const active30d = allUsers.filter(u => u.lastActivity && u.lastActivity >= day30Ago).length;
    const active90d = allUsers.filter(u => u.lastActivity && u.lastActivity >= day90Ago).length;

    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('active7d').textContent = active7d;
    document.getElementById('active30d').textContent = active30d;
    document.getElementById('active90d').textContent = active90d;
}

// Update retention metrics
function updateRetentionMetrics() {
    const totalUsers = allUsers.length;

    if (totalUsers === 0) {
        document.getElementById('activationRate').textContent = '0%';
        document.getElementById('engagementRate').textContent = '0%';
        document.getElementById('completionRate').textContent = '0%';
        return;
    }

    // Users who completed at least 1 event
    const activatedUsers = allUsers.filter(u => u.eventCount >= 1).length;

    // Users who completed 3+ events
    const engagedUsers = allUsers.filter(u => u.eventCount >= 3).length;

    // Users who completed event 15 (season)
    const completedUsers = allUsers.filter(u => u.hasEvent15).length;

    const activationRate = ((activatedUsers / totalUsers) * 100).toFixed(1);
    const engagementRate = ((engagedUsers / totalUsers) * 100).toFixed(1);
    const completionRate = ((completedUsers / totalUsers) * 100).toFixed(1);

    document.getElementById('activationRate').textContent = activationRate + '%';
    document.getElementById('engagementRate').textContent = engagementRate + '%';
    document.getElementById('completionRate').textContent = completionRate + '%';
}

// Update registration chart
function updateRegistrationChart() {
    const container = document.getElementById('registrationChart');
    const periods = currentPeriod === 'weekly' ? 12 : 6;
    const periodDays = currentPeriod === 'weekly' ? 7 : 30;
    const periodLabel = currentPeriod === 'weekly' ? 'week' : 'month';

    const now = new Date();
    const buckets = [];

    for (let i = periods - 1; i >= 0; i--) {
        const periodEnd = new Date(now.getTime() - i * periodDays * 24 * 60 * 60 * 1000);
        const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

        const count = allUsers.filter(user => {
            if (!user.registrationDate) return false;
            return user.registrationDate >= periodStart && user.registrationDate < periodEnd;
        }).length;

        const label = formatPeriodLabel(periodStart, currentPeriod);
        buckets.push({ label, count, start: periodStart, end: periodEnd });
    }

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    let html = '';
    for (const bucket of buckets) {
        const percentage = (bucket.count / maxCount) * 100;
        html += `
            <div class="bar-row">
                <div class="bar-label">${bucket.label}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                    <div class="bar-value">${bucket.count}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html || '<div class="no-data">No registration data available</div>';
}

// Format period label for chart
function formatPeriodLabel(date, period) {
    if (period === 'weekly') {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } else {
        return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }
}

// Apply filters and search to user table
function applyFiltersAndSearch() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase().trim();
    const filter = document.getElementById('activityFilter').value;

    const now = new Date();
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    filteredUsers = allUsers.filter(user => {
        // Search filter
        if (searchTerm) {
            const nameMatch = (user.name || '').toLowerCase().includes(searchTerm);
            const uidMatch = (user.uid || '').toLowerCase().includes(searchTerm);
            if (!nameMatch && !uidMatch) return false;
        }

        // Activity filter
        if (filter === 'active') {
            return user.lastActivity && user.lastActivity >= day30Ago;
        } else if (filter === 'inactive') {
            return !user.lastActivity || user.lastActivity < day30Ago;
        } else if (filter === 'new') {
            return user.registrationDate && user.registrationDate >= day7Ago;
        }

        return true;
    });

    // Sort by last activity (most recent first), then by name
    filteredUsers.sort((a, b) => {
        if (a.lastActivity && b.lastActivity) {
            return b.lastActivity - a.lastActivity;
        }
        if (a.lastActivity) return -1;
        if (b.lastActivity) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    currentPage = 1;
    renderUserTable();
}

// Render user table with pagination
function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    if (pageUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
    } else {
        const now = new Date();
        const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        tbody.innerHTML = pageUsers.map(user => {
            let statusClass = 'inactive';
            let statusText = 'Inactive';

            if (user.registrationDate && user.registrationDate >= day7Ago) {
                statusClass = 'new';
                statusText = 'New';
            } else if (user.lastActivity && user.lastActivity >= day30Ago) {
                statusClass = 'active';
                statusText = 'Active';
            }

            const lastActivityStr = user.lastActivity
                ? formatDate(user.lastActivity)
                : 'Never';

            return `
                <tr>
                    <td>${escapeHtml(user.name)}</td>
                    <td><code>${escapeHtml(user.uid)}</code></td>
                    <td>${user.eventCount}</td>
                    <td>S${user.currentSeason} / Stage ${user.currentStage}</td>
                    <td>${lastActivityStr}</td>
                    <td><span class="activity-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Update pagination
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Format date for display
function formatDate(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
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

    // Chart period buttons (registration)
    document.querySelectorAll('.chart-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Only affect buttons in the same control group
            e.target.closest('.chart-controls').querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            updateRegistrationChart();
        });
    });

    // Chart trend buttons (page views)
    document.querySelectorAll('.chart-btn[data-trend]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.target.closest('.chart-controls').querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const trend = e.target.dataset.trend;
            currentTrendDays = trend === '30days' ? 30 : 7;
            await loadAnalyticsData();
        });
    });

    // Search input (debounced)
    let searchTimeout;
    document.getElementById('userSearch').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFiltersAndSearch();
        }, 300);
    });

    // Filter dropdown
    document.getElementById('activityFilter').addEventListener('change', () => {
        applyFiltersAndSearch();
    });

    // Pagination buttons
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderUserTable();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderUserTable();
        }
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        btn.textContent = 'Refreshing...';
        btn.disabled = true;
        await loadAllUserData();
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
