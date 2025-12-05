// narrative-integration.js - Integration layer for dynamic story system
// Connects the new narrative database with existing story-generator.js

/**
 * Enhanced Story Generator with Dynamic Narratives
 * 
 * This enhances the existing story-generator.js with:
 * 1. Personalized intro paragraphs from narrative database
 * 2. Tracking of which stories each rider has seen
 * 3. Context-aware story selection
 * 4. Seamless fallback to original system
 */

class NarrativeIntegration {
  constructor() {
    this.storySelector = null;
    this.initialized = false;
  }

  /**
   * Initialize the narrative system
   */
  async initialize(firebase) {
    try {
      // Load narrative database
      if (typeof window !== 'undefined' && window.narrativeDatabase) {
        const { NARRATIVE_DATABASE } = window.narrativeDatabase;
        
        // Initialize story selector
        this.storySelector = new window.StorySelector();
        this.storySelector.initialize(NARRATIVE_DATABASE);
        
        this.initialized = true;
        console.log('Narrative integration initialized successfully');
        return true;
      } else {
        console.warn('Narrative database not loaded, using original story system');
        return false;
      }
    } catch (error) {
      console.error('Error initializing narrative integration:', error);
      return false;
    }
  }

  /**
   * Generate enhanced race story with dynamic intro
   */
  async generateEnhancedStory(raceData, seasonData, riderId, db) {
    // If not initialized, fall back to original system
    if (!this.initialized || !this.storySelector) {
      console.log('Using original story system (narrative system not initialized)');
      return this.fallbackToOriginalStory(raceData, seasonData);
    }

    try {
      // Build context for story selection
      const context = this.storySelector.buildContext(raceData, seasonData);
      
      // Generate dynamic intro paragraph
      const introStory = await this.storySelector.generateIntroStory(riderId, context, db);
      
      // Get original race recap and season context
      const originalStory = this.fallbackToOriginalStory(raceData, seasonData);
      
      // Combine: Dynamic intro + Original recap + Original context
      if (introStory) {
        return {
          intro: introStory, // NEW: Personalized intro paragraph
          recap: originalStory.recap,
          context: originalStory.context
        };
      } else {
        // No suitable intro found, use original system entirely
        return originalStory;
      }
      
    } catch (error) {
      console.error('Error generating enhanced story:', error);
      return this.fallbackToOriginalStory(raceData, seasonData);
    }
  }

  /**
   * Fallback to original story generation
   */
  fallbackToOriginalStory(raceData, seasonData) {
    // Use existing story-generator.js function
    if (typeof window !== 'undefined' && window.storyGenerator) {
      return window.storyGenerator.generateRaceStory(raceData, seasonData);
    }
    
    // Ultimate fallback
    return {
      recap: 'Race complete.',
      context: 'Continue racing to build your career.'
    };
  }

  /**
   * Get rider's story statistics
   */
  async getRiderStoryStats(riderId, db) {
    if (!this.storySelector) return null;
    
    const history = await this.storySelector.loadRiderHistory(riderId, db);
    
    const stats = {
      totalStoriesSeen: Object.keys(history).length,
      storiesByEvent: {},
      categoryCounts: {}
    };

    Object.entries(history).forEach(([storyId, data]) => {
      // Count by event
      if (!stats.storiesByEvent[data.eventNumber]) {
        stats.storiesByEvent[data.eventNumber] = 0;
      }
      stats.storiesByEvent[data.eventNumber]++;

      // Count by category (extract from story ID prefix)
      const category = storyId.split('_')[0];
      if (!stats.categoryCounts[category]) {
        stats.categoryCounts[category] = 0;
      }
      stats.categoryCounts[category]++;
    });

    return stats;
  }

  /**
   * Preview available stories for a context (debugging/admin tool)
   */
  previewAvailableStories(context) {
    if (!this.storySelector || !this.storySelector.narrativeDB) {
      return { error: 'Narrative system not initialized' };
    }

    const available = {};
    
    Object.keys(this.storySelector.narrativeDB).forEach(category => {
      const matching = this.storySelector.narrativeDB[category].filter(story => 
        this.storySelector.evaluateTriggers(story, context)
      );
      
      if (matching.length > 0) {
        available[category] = matching.map(s => ({
          id: s.id,
          weight: s.weight,
          preview: s.text.substring(0, 100) + '...'
        }));
      }
    });

    return available;
  }

  /**
   * Clear rider narrative history (for season reset)
   */
  async resetRiderNarratives(riderId, db) {
    if (!this.storySelector) {
      console.warn('Cannot reset narratives - story selector not initialized');
      return false;
    }

    try {
      await this.storySelector.clearRiderHistory(riderId, db);
      console.log(`Reset narrative history for rider ${riderId}`);
      return true;
    } catch (error) {
      console.error('Error resetting rider narratives:', error);
      return false;
    }
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.narrativeIntegration = new NarrativeIntegration();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NarrativeIntegration };
}
