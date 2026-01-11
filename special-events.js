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
    },
    {
        id: 103,
        unlockId: null,
        unlockField: null,
        name: 'Valentine\'s Invitational',
        icon: '💝',
        description: 'Prove your dedication on the iconic Bosberg climb while others celebrate romance. Our first fixed-schedule race on Belgian roads features human competitors across multiple timeslots.',
        reward: '+80 Career Points',
        bonusCC: 'TBC',
        type: 'Road Race',
        unlockMethod: 'admin-only',  // Only visible to admins in Coming Soon
        cost: 0,
        hasMultipleTimeslots: true
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
    // Find the containers
    const availableSection = document.getElementById('availableEventsSection');
    const comingSoonSection = document.querySelector('.coming-soon-placeholder');
    if (!availableSection) return;

    // Clear and rebuild sections
    availableSection.innerHTML = '';

    // Check if user is admin
    const isAdmin = currentUserData?.isAdmin === true;

    // Track events for different sections
    let comingSoonEvents = [];
    let completedEvents = [];

    SPECIAL_EVENTS.forEach(event => {
        // Free events are always available, others check the unlock field
        const isFreeEvent = event.unlockMethod === 'free';
        const isAdminOnly = event.unlockMethod === 'admin-only';
        const isUnlocked = isFreeEvent || (currentUserData && currentUserData[event.unlockField]);

        // Check if user has completed this event
        const hasCompleted = currentUserData && currentUserData[`event${event.id}Results`];

        if (isAdminOnly && isAdmin) {
            // Admin-only events shown in Coming Soon for admins
            comingSoonEvents.push(event);
        } else if (hasCompleted) {
            // Completed events go to Completed section
            completedEvents.push(event);
        } else if (isUnlocked) {
            // Regular unlocked events shown in Available Now
            const card = createEventCard(event, isFreeEvent);
            availableSection.appendChild(card);
        }
    });

    // Render Coming Soon section
    if (comingSoonSection) {
        if (comingSoonEvents.length > 0) {
            // Replace placeholder with admin preview events
            const comingSoonGrid = document.createElement('div');
            comingSoonGrid.className = 'special-events-grid';
            comingSoonEvents.forEach(event => {
                const card = createComingSoonCard(event, true); // true = admin preview
                comingSoonGrid.appendChild(card);
            });
            comingSoonSection.innerHTML = '';
            comingSoonSection.appendChild(comingSoonGrid);
        } else {
            // Show default placeholder
            comingSoonSection.innerHTML = '<p>More special events coming soon!</p>';
        }
    }

    // Render Completed Events section
    const completedSection = document.getElementById('completedEventsSection');
    const completedGrid = document.getElementById('completedEventsGrid');
    if (completedSection && completedGrid) {
        if (completedEvents.length > 0) {
            // Show completed events section
            completedSection.style.display = 'block';
            completedGrid.innerHTML = '';
            completedEvents.forEach(event => {
                const card = createCompletedEventCard(event);
                completedGrid.appendChild(card);
            });
        } else {
            // Hide section if no completed events
            completedSection.style.display = 'none';
        }
    }
}

// Create an event card element for available events
function createEventCard(event, isFreeEvent = false) {
    const card = document.createElement('div');
    card.className = 'special-event-card unlocked';

    const badgeText = isFreeEvent ? 'Available' : 'Unlocked';
    const iconHtml = window.TPVIcons ? window.TPVIcons.getEventIcon(event, 'xl') : event.icon;

    // Get headerImage from specialEventData if available
    const specialEventDataItem = window.specialEventData ? window.specialEventData[event.id] : null;
    const headerImage = specialEventDataItem?.headerImage || null;

    // Build header image or icon HTML
    const headerHtml = headerImage ? `
        <div class="event-header-image-container">
            <img
                src="${headerImage}"
                alt="${event.name}"
                class="event-header-image"
                loading="lazy"
                onerror="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='block';"
            >
        </div>
        <div class="event-icon" style="display: none;">${iconHtml}</div>
    ` : `
        <div class="event-icon">${iconHtml}</div>
    `;

    card.innerHTML = `
        <div class="event-badge available">${badgeText}</div>
        ${headerHtml}
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

// Create a Coming Soon event card (for admin preview)
function createComingSoonCard(event, isAdminPreview = false) {
    const card = document.createElement('div');
    card.className = isAdminPreview ? 'special-event-card admin-preview' : 'special-event-card coming-soon';

    const badgeText = isAdminPreview ? 'Admin Preview' : 'Coming Soon';
    const iconHtml = window.TPVIcons ? window.TPVIcons.getEventIcon(event, 'xl') : event.icon;

    // Get headerImage from specialEventData if available
    const specialEventDataItem = window.specialEventData ? window.specialEventData[event.id] : null;
    const headerImage = specialEventDataItem?.headerImage || null;

    // Build header image or icon HTML
    const headerHtml = headerImage ? `
        <div class="event-header-image-container">
            <img
                src="${headerImage}"
                alt="${event.name}"
                class="event-header-image"
                loading="lazy"
                onerror="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='block';"
            >
        </div>
        <div class="event-icon" style="display: none;">${iconHtml}</div>
    ` : `
        <div class="event-icon">${iconHtml}</div>
    `;

    card.innerHTML = `
        <div class="event-badge ${isAdminPreview ? 'admin-preview' : 'coming-soon'}">${badgeText}</div>
        ${headerHtml}
        <h3 class="event-title">${event.name}</h3>
        <p class="event-description">${event.description}</p>
        <div class="event-meta">
            <span class="event-reward">🏆 ${event.reward}</span>
            <span class="event-type">${event.type}</span>
        </div>
        ${isAdminPreview ? `
            <div class="event-status">
                <button class="btn btn-primary btn-view-event">View Event (Admin)</button>
            </div>
        ` : `
            <div class="event-status">
                <span class="coming-soon-text">Details coming soon</span>
            </div>
        `}
    `;

    // Add click handler only for admin preview
    if (isAdminPreview) {
        card.addEventListener('click', () => {
            window.location.href = `event-detail.html?id=${event.id}`;
        });
        card.style.cursor = 'pointer';
    }

    return card;
}

// Create a Completed event card
function createCompletedEventCard(event) {
    const card = document.createElement('div');
    card.className = 'special-event-card completed';

    const iconHtml = window.TPVIcons ? window.TPVIcons.getEventIcon(event, 'xl') : event.icon;

    // Get headerImage and results from specialEventData
    const specialEventDataItem = window.specialEventData ? window.specialEventData[event.id] : null;
    const headerImage = specialEventDataItem?.headerImage || null;
    const userResults = currentUserData ? currentUserData[`event${event.id}Results`] : null;

    // Build header image or icon HTML
    const headerHtml = headerImage ? `
        <div class="event-header-image-container">
            <img
                src="${headerImage}"
                alt="${event.name}"
                class="event-header-image"
                loading="lazy"
                onerror="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='block';"
            >
        </div>
        <div class="event-icon" style="display: none;">${iconHtml}</div>
    ` : `
        <div class="event-icon">${iconHtml}</div>
    `;

    // Format completion info
    const position = userResults?.position || 'N/A';
    const points = userResults?.points || 0;

    card.innerHTML = `
        <div class="event-badge completed">Completed</div>
        ${headerHtml}
        <h3 class="event-title">${event.name}</h3>
        <p class="event-description">${event.description}</p>
        <div class="event-meta">
            <span class="event-reward">📊 Position: ${position}</span>
            <span class="event-type">🏆 ${points} pts</span>
        </div>
        <div class="event-status">
            <button class="btn btn-secondary btn-view-event">View Results</button>
        </div>
    `;

    // Add click handler to view results
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
