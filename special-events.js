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
    // Find the container for available events
    const availableSection = document.getElementById('availableEventsSection');
    if (!availableSection) return;

    // Clear and rebuild the available events section
    availableSection.innerHTML = '';

    SPECIAL_EVENTS.forEach(event => {
        // Free events are always available, others check the unlock field
        const isFreeEvent = event.unlockMethod === 'free';
        const isUnlocked = isFreeEvent || (currentUserData && currentUserData[event.unlockField]);

        // Only show events that are available (free or purchased)
        if (isUnlocked) {
            const card = createEventCard(event, isFreeEvent);
            availableSection.appendChild(card);
        }
    });
}

// Create an event card element for available events
function createEventCard(event, isFreeEvent = false) {
    const card = document.createElement('div');
    card.className = 'special-event-card unlocked';

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

    return card;
}

// Setup explainer section collapse toggle
function setupExplainerToggle() {
    const section = document.getElementById('explainerSection');
    const toggle = document.getElementById('explainerToggle');
    const icon = section?.querySelector('.explainer-collapse-icon');

    if (!section || !toggle) return;

    // Load saved state from localStorage (default: collapsed)
    const savedState = localStorage.getItem('specialEventsExplainerCollapsed');
    const isCollapsed = savedState === null ? true : savedState === 'true';

    if (isCollapsed) {
        section.classList.add('collapsed');
        if (icon) icon.textContent = '▶';
    } else {
        section.classList.remove('collapsed');
        if (icon) icon.textContent = '▼';
    }

    // Add click handler
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentlyCollapsed = section.classList.contains('collapsed');

        if (currentlyCollapsed) {
            section.classList.remove('collapsed');
            if (icon) icon.textContent = '▼';
        } else {
            section.classList.add('collapsed');
            if (icon) icon.textContent = '▶';
        }

        // Save state
        localStorage.setItem('specialEventsExplainerCollapsed', !currentlyCollapsed);
    });
}

// Initialize toggle on page load
document.addEventListener('DOMContentLoaded', setupExplainerToggle);

// Expose for potential external use
window.renderSpecialEvents = renderSpecialEvents;
