// Site Analytics Tracking
// Tracks aggregate page views, sessions, and duration

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Page name mapping
const PAGE_NAMES = {
    'index.html': 'home',
    '': 'home',  // Root path
    '/': 'home',
    'events.html': 'events',
    'profile.html': 'profile',
    'palmares.html': 'palmares',
    'standings.html': 'standings',
    'results-feed.html': 'resultsFeed'
};

// Session timeout in minutes
const SESSION_TIMEOUT = 30;

let app;
let db;
let auth;
let currentUserId = null;
let sessionStartTime = null;
let lastActivityTime = null;
let pagesViewedThisSession = new Set();
let isInitialized = false;

// Get current page name
function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || '';
    return PAGE_NAMES[filename] || PAGE_NAMES[path] || null;
}

// Get today's date string (YYYY-MM-DD)
function getTodayString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Generate session ID
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Get or create session
function getSession() {
    const stored = sessionStorage.getItem('tpv_analytics_session');
    if (stored) {
        const session = JSON.parse(stored);
        const now = Date.now();
        // Check if session has expired (30 min inactivity)
        if (now - session.lastActivity < SESSION_TIMEOUT * 60 * 1000) {
            session.lastActivity = now;
            sessionStorage.setItem('tpv_analytics_session', JSON.stringify(session));
            return session;
        }
    }

    // Create new session
    const newSession = {
        id: generateSessionId(),
        startTime: Date.now(),
        lastActivity: Date.now(),
        pagesViewed: [],
        isNew: true
    };
    sessionStorage.setItem('tpv_analytics_session', JSON.stringify(newSession));
    return newSession;
}

// Update session activity
function updateSessionActivity(pageName) {
    const stored = sessionStorage.getItem('tpv_analytics_session');
    if (stored) {
        const session = JSON.parse(stored);
        session.lastActivity = Date.now();
        if (pageName && !session.pagesViewed.includes(pageName)) {
            session.pagesViewed.push(pageName);
        }
        session.isNew = false;
        sessionStorage.setItem('tpv_analytics_session', JSON.stringify(session));
        return session;
    }
    return null;
}

// Initialize Firebase
async function initAnalytics() {
    if (isInitialized) return;

    try {
        // Check if Firebase is already initialized
        try {
            app = initializeApp(firebaseConfig, 'analytics');
        } catch (e) {
            // App might already exist, try to get it
            const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            try {
                app = getApp('analytics');
            } catch (e2) {
                app = getApp();
            }
        }

        db = getFirestore(app);
        auth = getAuth(app);

        // Listen for auth state to get user ID
        onAuthStateChanged(auth, (user) => {
            currentUserId = user ? user.uid : null;
        });

        isInitialized = true;

        // Track initial page view
        await trackPageView();

        // Set up visibility change listener for session duration
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Set up beforeunload for session end
        window.addEventListener('beforeunload', handleBeforeUnload);

    } catch (error) {
        console.error('Analytics init error:', error);
    }
}

// Track page view
async function trackPageView() {
    const pageName = getCurrentPageName();
    if (!pageName) return; // Not a tracked page

    const session = getSession();
    const isNewSession = session.isNew;

    // Update session with this page
    updateSessionActivity(pageName);

    const today = getTodayString();
    const analyticsRef = doc(db, 'analytics', today);

    try {
        const docSnap = await getDoc(analyticsRef);

        if (docSnap.exists()) {
            // Update existing document
            const updates = {
                totalPageViews: increment(1),
                [`pageViews.${pageName}`]: increment(1),
                lastUpdated: serverTimestamp()
            };

            if (isNewSession) {
                updates.sessions = increment(1);
            }

            await updateDoc(analyticsRef, updates);
        } else {
            // Create new document for today
            const newDoc = {
                date: today,
                totalPageViews: 1,
                pageViews: {
                    home: 0,
                    events: 0,
                    profile: 0,
                    palmares: 0,
                    standings: 0,
                    resultsFeed: 0
                },
                sessions: isNewSession ? 1 : 0,
                totalDurationSeconds: 0,
                avgPagesPerSession: 0,
                lastUpdated: serverTimestamp()
            };
            newDoc.pageViews[pageName] = 1;

            await setDoc(analyticsRef, newDoc);
        }
    } catch (error) {
        console.error('Error tracking page view:', error);
    }
}

// Handle visibility change (tab hidden/shown)
async function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        await recordSessionDuration();
    }
}

// Handle before unload
async function handleBeforeUnload() {
    await recordSessionDuration();
}

// Record session duration
async function recordSessionDuration() {
    const stored = sessionStorage.getItem('tpv_analytics_session');
    if (!stored) return;

    const session = JSON.parse(stored);
    const durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    // Only record if duration is reasonable (< 2 hours)
    if (durationSeconds <= 0 || durationSeconds > 7200) return;

    // Check if we already recorded this session's duration
    const recordedKey = `tpv_duration_recorded_${session.id}`;
    if (localStorage.getItem(recordedKey)) return;

    const today = getTodayString();
    const analyticsRef = doc(db, 'analytics', today);

    try {
        await updateDoc(analyticsRef, {
            totalDurationSeconds: increment(durationSeconds),
            lastUpdated: serverTimestamp()
        });

        // Mark as recorded (expires when localStorage is cleared)
        localStorage.setItem(recordedKey, 'true');

        // Clean up old recorded keys (keep only last 10)
        cleanupRecordedKeys();
    } catch (error) {
        console.error('Error recording session duration:', error);
    }
}

// Clean up old recorded keys
function cleanupRecordedKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tpv_duration_recorded_')) {
            keys.push(key);
        }
    }

    // Remove oldest keys if more than 10
    if (keys.length > 10) {
        keys.slice(0, keys.length - 10).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
    initAnalytics();
}

// Export for manual use if needed
export { trackPageView, initAnalytics };
