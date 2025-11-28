// Event Sequence Manager for TPV Career Mode Season 1
// Now with Firebase Firestore integration

// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Define the event sequence
const eventSequence = [
    {
        stage: 1,
        type: 'mandatory',
        eventId: 1,
        name: 'Coast and Roast Crit',
        icon: 'ðŸ”„'
    },
    {
        stage: 2,
        type: 'mandatory',
        eventId: 2,
        name: 'Island Classic',
        icon: 'ðŸš´'
    },
    {
        stage: 3,
        type: 'choice',
        name: 'Optional Event Choice #1',
        icon: 'ðŸŽ¯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12] // IDs of optional events
    },
    {
        stage: 4,
        type: 'mandatory',
        eventId: 3,
        name: 'The Forest Velodrome Elimination',
        icon: 'ðŸŸï¸'
    },
    {
        stage: 5,
        type: 'mandatory',
        eventId: 4,
        name: 'Coastal Loop Time Challenge',
        icon: 'â±ï¸'
    },
    {
        stage: 6,
        type: 'choice',
        name: 'Optional Event Choice #2',
        icon: 'ðŸŽ¯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12]
    },
    {
        stage: 7,
        type: 'mandatory',
        eventId: 5,
        name: 'North Lake Points Race',
        icon: 'ðŸŽ¯'
    },
    {
        stage: 8,
        type: 'choice',
        name: 'Optional Event Choice #3',
        icon: 'ðŸŽ¯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12]
    },
    {
        stage: 9,
        type: 'mandatory',
        eventId: 13,
        name: 'Local Tour',
        icon: 'ðŸ†'
    }
];

// User progress state with Firebase integration
class ProgressManager {
    constructor() {
        this.storageKey = 'tpv_career_progress';
        this.isAdmin = false;
        this.currentUser = null;
        this.progress = {
            currentStage: 1,
            completedStages: [],
            completedOptionalEvents: [],
            choiceSelections: {},
            totalPoints: 0
        };
        
        // Initialize Firebase
        this.auth = getAuth();
        this.db = getFirestore();
        
        // Listen for auth state changes
        this.initAuthListener();
    }

    initAuthListener() {
        onAuthStateChanged(this.auth, async (user) => {
            this.currentUser = user;
            if (user) {
                console.log('User logged in, loading progress from Firestore');
                await this.loadProgress();
            } else {
                console.log('User logged out, using default progress');
                this.loadLocalProgress();
            }
            
            // Trigger UI update if needed
            if (typeof window.updateProgressUI === 'function') {
                window.updateProgressUI();
            }
        });
    }

    async loadProgress() {
        if (!this.currentUser) {
            this.loadLocalProgress();
            return;
        }

        try {
            const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // completedStages from Firebase contains EVENT IDs, not stage numbers
                // usedOptionalEvents contains which optional events (6-12) were used
                const completedEventIds = userData.completedStages || [];
                const usedOptionalEvents = userData.usedOptionalEvents || [];
                
                // Build choiceSelections from usedOptionalEvents
                // Map which optional event was used for which choice stage
                const choiceSelections = {};
                usedOptionalEvents.forEach((eventId, index) => {
                    // Choice stages are 3, 6, 8 (index 0, 1, 2)
                    const choiceStages = [3, 6, 8];
                    if (index < choiceStages.length) {
                        choiceSelections[choiceStages[index]] = eventId;
                    }
                });
                
                this.progress = {
                    currentStage: userData.currentStage || 1,
                    completedEventIds: completedEventIds, // Store the raw event IDs
                    completedOptionalEvents: usedOptionalEvents,
                    choiceSelections: choiceSelections,
                    totalPoints: userData.totalPoints || 0
                };
                console.log('Progress loaded from Firestore:', this.progress);
                
                // Force UI update after Firebase load
                if (typeof window.updateProgressUI === 'function') {
                    console.log('Triggering UI update with currentStage:', this.progress.currentStage);
                    window.updateProgressUI();
                }
            } else {
                console.log('No user document found, using defaults');
                this.progress = {
                    currentStage: 1,
                    completedEventIds: [],
                    completedOptionalEvents: [],
                    choiceSelections: {},
                    totalPoints: 0
                };
            }
        } catch (error) {
            console.error('Error loading progress from Firestore:', error);
            this.loadLocalProgress();
        }
    }

    loadLocalProgress() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.progress = JSON.parse(saved);
            // Ensure completedEventIds exists for backward compatibility
            if (!this.progress.completedEventIds) {
                this.progress.completedEventIds = this.progress.completedStages || [];
            }
        } else {
            this.progress = {
                currentStage: 1,
                completedEventIds: [],
                completedOptionalEvents: [],
                choiceSelections: {},
                totalPoints: 0
            };
        }
        console.log('Progress loaded from localStorage:', this.progress);
    }

    async saveProgress() {
        // Always save to localStorage as backup
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));

        // If user is logged in, save to Firestore
        if (this.currentUser) {
            try {
                await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                    currentStage: this.progress.currentStage,
                    completedStages: this.progress.completedStages,
                    completedOptionalEvents: this.progress.completedOptionalEvents,
                    choiceSelections: this.progress.choiceSelections,
                    totalPoints: this.progress.totalPoints
                });
                console.log('Progress saved to Firestore');
            } catch (error) {
                console.error('Error saving progress to Firestore:', error);
                alert('Warning: Progress saved locally but could not sync to cloud. Please try again later.');
            }
        } else {
            console.log('Progress saved to localStorage only (user not logged in)');
        }
    }

    getCurrentStage() {
        return this.progress.currentStage;
    }

    getTotalPoints() {
        return this.progress.totalPoints;
    }

    addPoints(points) {
        this.progress.totalPoints += points;
    }

    isStageCompleted(stage) {
        // A stage is completed if we're past it (currentStage > stage)
        return this.progress.currentStage > stage;
    }

    isStageUnlocked(stage) {
        // Admin can access everything
        if (this.isAdmin) return true;
        
        // Stage 1 is always unlocked
        if (stage === 1) return true;
        
        // Check if previous stage is completed
        return this.isStageCompleted(stage - 1);
    }

    isOptionalEventAvailable(eventId) {
        // Check if this optional event hasn't been used yet
        return !this.progress.completedOptionalEvents.includes(eventId);
    }

    async completeStage(stage, optionalEventId = null, points = 0) {
        if (!this.progress.completedStages.includes(stage)) {
            this.progress.completedStages.push(stage);
        }
        
        // Add points if provided
        if (points > 0) {
            this.progress.totalPoints += points;
        }
        
        // If this was a choice stage, record which event was selected
        if (optionalEventId) {
            this.progress.choiceSelections[stage] = optionalEventId;
            if (!this.progress.completedOptionalEvents.includes(optionalEventId)) {
                this.progress.completedOptionalEvents.push(optionalEventId);
            }
        }
        
        // Move to next stage if current
        if (stage === this.progress.currentStage) {
            this.progress.currentStage = Math.min(stage + 1, 10); // Cap at stage 10
        }
        
        await this.saveProgress();
    }

    getAvailableOptionalEvents(choiceStage) {
        const stageInfo = eventSequence.find(s => s.stage === choiceStage);
        if (!stageInfo || stageInfo.type !== 'choice') return [];
        
        // Filter out events that have already been used
        return stageInfo.availableEvents.filter(eventId => 
            this.isOptionalEventAvailable(eventId)
        );
    }

    setAdminMode(isAdmin) {
        this.isAdmin = isAdmin;
        console.log('Admin mode:', isAdmin ? 'ON' : 'OFF');
    }

    async resetProgress() {
        this.progress = {
            currentStage: 1,
            completedStages: [],
            completedOptionalEvents: [],
            choiceSelections: {},
            totalPoints: 0
        };
        
        localStorage.removeItem(this.storageKey);
        await this.saveProgress();
        console.log('Progress reset');
    }

    // Get the event ID for a choice stage (either selected or null)
    getChoiceSelection(stage) {
        return this.progress.choiceSelections[stage] || null;
    }

    // Get completed stages count (stages 1 through currentStage - 1)
    getCompletedStagesCount() {
        return Math.max(0, this.progress.currentStage - 1);
    }

    // Get progress percentage
    getProgressPercentage() {
        return Math.round((this.progress.completedStages.length / 9) * 100);
    }
}

// Global progress manager instance
const progressManager = new ProgressManager();

// Helper function to get stage info
function getStageInfo(stage) {
    return eventSequence.find(s => s.stage === stage);
}

// Helper function to get stage status
function getStageStatus(stage) {
    if (progressManager.isStageCompleted(stage)) {
        return 'completed';
    } else if (progressManager.isStageUnlocked(stage)) {
        return 'unlocked';
    } else {
        return 'locked';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        eventSequence, 
        progressManager, 
        getStageInfo, 
        getStageStatus 
    };
}

// Make available globally for browser (since this is now a module)
window.eventSequence = eventSequence;
window.progressManager = progressManager;
window.getStageInfo = getStageInfo;
window.getStageStatus = getStageStatus;
