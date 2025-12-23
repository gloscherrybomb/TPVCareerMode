// Special Events Page Logic
import { firebaseConfig } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loadingState = document.getElementById('loadingState');
const loginPrompt = document.getElementById('loginPrompt');
const eventsContent = document.getElementById('eventsContent');
const eventsGrid = document.getElementById('eventsGrid');

// Special event definitions (linked to unlock-config.js and event-data.js)
const SPECIAL_EVENTS = [
    {
        id: 102,
        unlockId: null,
        unlockField: null,
        name: 'The Leveller',
        icon: '⚖️',
        description: 'An all-rounder points race to find your ranking fast. Great for new racers to bag Career Points and Cadence Credits early!',
        reward: '+40 Career Points',
        bonusCC: 'Standard CC',
        type: 'Points Race',
        unlockMethod: 'free',  // Available immediately to all users
        cost: 0
    },
    {
        id: 101,
        unlockId: 'singapore-criterium',
        unlockField: 'hasSingaporeCriterium',
        name: 'Singapore Criterium',
        icon: '🇸🇬',
        description: 'An exclusive night race through the illuminated streets of Marina Bay. Reserved for riders who prove their commitment.',
        reward: '+60 Career Points',
        bonusCC: '+50 CC',
        type: 'Criterium',
        unlockMethod: 'store', // 'store', 'achievement', 'seasonal'
        cost: 800
    }
];

// Track current user data
let currentUserData = null;

// Handle auth state changes
onAuthStateChanged(auth, async (user) => {
    // Hide loading state
    if (loadingState) {
        loadingState.style.display = 'none';
    }

    if (user) {
        // User is logged in - show events content
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (eventsContent) eventsContent.style.display = 'block';

        // Fetch user data to check unlocks
        await loadUserData(user.uid);
        renderSpecialEvents();
    } else {
        // User is not logged in - show login prompt
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (eventsContent) eventsContent.style.display = 'none';
        currentUserData = null;
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Render special events based on unlock status
function renderSpecialEvents() {
    if (!eventsGrid) return;

    // Find the placeholder for unlockable events
    const unlockedSection = document.getElementById('unlockedEventsSection');
    if (!unlockedSection) return;

    // Clear and rebuild the unlocked events section
    unlockedSection.innerHTML = '';

    SPECIAL_EVENTS.forEach(event => {
        // Free events are always unlocked, others check the unlock field
        const isFreeEvent = event.unlockMethod === 'free';
        const isUnlocked = isFreeEvent || (currentUserData && currentUserData[event.unlockField]);
        const card = createEventCard(event, isUnlocked, isFreeEvent);
        unlockedSection.appendChild(card);
    });
}

// Create an event card element
function createEventCard(event, isUnlocked, isFreeEvent = false) {
    const card = document.createElement('div');
    card.className = `special-event-card ${isUnlocked ? 'unlocked' : 'locked'}`;

    if (isUnlocked) {
        // Unlocked/Available card - clickable, leads to event detail
        const badgeText = isFreeEvent ? 'Available' : 'Unlocked';
        card.innerHTML = `
            <div class="event-badge available">${badgeText}</div>
            <div class="event-icon">${event.icon}</div>
            <h3 class="event-title">${event.name}</h3>
            <p class="event-description">${event.description}</p>
            <div class="event-meta">
                <span class="event-reward">🏆 ${event.reward}</span>
                <span class="event-type">${event.type}</span>
            </div>
            <div class="event-status">
                <button class="btn btn-primary btn-view-event">View Event</button>
            </div>
        `;

        // Add click handler to navigate to event detail
        card.addEventListener('click', () => {
            window.location.href = `event-detail.html?id=${event.id}`;
        });
        card.style.cursor = 'pointer';
    } else {
        // Locked card - shows how to unlock
        const unlockText = event.unlockMethod === 'store'
            ? `Unlock in Store for ${event.cost} CC`
            : 'Complete requirements to unlock';

        card.innerHTML = `
            <div class="event-badge locked-badge">Locked</div>
            <div class="event-icon locked-icon">${event.icon}</div>
            <h3 class="event-title">${event.name}</h3>
            <p class="event-description">${event.description}</p>
            <div class="event-meta">
                <span class="event-reward">🏆 ${event.reward}</span>
                <span class="event-type">${event.type}</span>
            </div>
            <div class="event-status">
                <span class="status-text">${unlockText}</span>
                ${event.unlockMethod === 'store' ? '<a href="store.html" class="btn btn-secondary btn-small">Go to Store</a>' : ''}
            </div>
        `;
    }

    return card;
}

// Expose for potential external use
window.renderSpecialEvents = renderSpecialEvents;
