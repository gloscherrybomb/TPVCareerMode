// Event Sequence Manager for TPV Career Mode Season 1

// Define the event sequence
const eventSequence = [
    {
        stage: 1,
        type: 'mandatory',
        eventId: 1,
        name: 'Coast and Roast Crit',
        icon: '🔄'
    },
    {
        stage: 2,
        type: 'mandatory',
        eventId: 2,
        name: 'Island Classic',
        icon: '🚴'
    },
    {
        stage: 3,
        type: 'choice',
        name: 'Optional Event Choice #1',
        icon: '🎯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12] // IDs of optional events
    },
    {
        stage: 4,
        type: 'mandatory',
        eventId: 3,
        name: 'The Forest Velodrome Elimination',
        icon: '🏟️'
    },
    {
        stage: 5,
        type: 'mandatory',
        eventId: 4,
        name: 'Coastal Loop Time Challenge',
        icon: '⏱️'
    },
    {
        stage: 6,
        type: 'choice',
        name: 'Optional Event Choice #2',
        icon: '🎯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12]
    },
    {
        stage: 7,
        type: 'mandatory',
        eventId: 5,
        name: 'North Lake Points Race',
        icon: '🎯'
    },
    {
        stage: 8,
        type: 'choice',
        name: 'Optional Event Choice #3',
        icon: '🎯',
        availableEvents: [6, 7, 8, 9, 10, 11, 12]
    },
    {
        stage: 9,
        type: 'mandatory',
        eventId: 13,
        name: 'Local Tour',
        icon: '🏆'
    }
];

// User progress state (in real implementation, this comes from backend/database)
// For now, we'll use localStorage to simulate progress
class ProgressManager {
    constructor() {
        this.storageKey = 'tpv_career_progress';
        this.isAdmin = false; // Will be set based on login status
        this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.progress = JSON.parse(saved);
        } else {
            this.progress = {
                currentStage: 1,
                completedStages: [],
                completedOptionalEvents: [],
                choiceSelections: {} // Maps choice stage to selected event ID
            };
            this.saveProgress();
        }
    }

    saveProgress() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }

    getCurrentStage() {
        return this.progress.currentStage;
    }

    isStageCompleted(stage) {
        return this.progress.completedStages.includes(stage);
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

    completeStage(stage, optionalEventId = null) {
        if (!this.progress.completedStages.includes(stage)) {
            this.progress.completedStages.push(stage);
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
            this.progress.currentStage = stage + 1;
        }
        
        this.saveProgress();
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
    }

    resetProgress() {
        localStorage.removeItem(this.storageKey);
        this.loadProgress();
    }

    // Get the event ID for a choice stage (either selected or null)
    getChoiceSelection(stage) {
        return this.progress.choiceSelections[stage] || null;
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
