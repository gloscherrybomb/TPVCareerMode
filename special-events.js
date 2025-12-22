// Special Events Page Logic
import { firebaseConfig } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const loadingState = document.getElementById('loadingState');
const loginPrompt = document.getElementById('loginPrompt');
const eventsContent = document.getElementById('eventsContent');

// Handle auth state changes
onAuthStateChanged(auth, (user) => {
    // Hide loading state
    if (loadingState) {
        loadingState.style.display = 'none';
    }

    if (user) {
        // User is logged in - show events content
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (eventsContent) eventsContent.style.display = 'block';
    } else {
        // User is not logged in - show login prompt
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (eventsContent) eventsContent.style.display = 'none';
    }
});

// Future: Functions for loading and rendering special events from Firestore
// async function loadSpecialEvents() { ... }
// function renderEventCard(event) { ... }
// function handleEventSignup(eventId) { ... }
