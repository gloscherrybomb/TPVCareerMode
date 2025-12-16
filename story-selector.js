// story-selector.js - Intelligent narrative selection engine
// Selects appropriate story elements based on context and tracks what each rider has seen

/**
 * Story Selection Engine
 * - Evaluates trigger conditions to find relevant stories
 * - Weights stories based on context fit
 * - Tracks which stories each rider has seen to ensure uniqueness
 * - Handles Firebase storage of rider narrative history
 */

class StorySelector {
  constructor() {
    this.narrativeDB = null;
    this.riderNarrativeHistory = {}; // Cache of what stories this rider has seen
  }

  /**
   * Initialize with narrative database
   */
  initialize(narrativeDatabase) {
    this.narrativeDB = narrativeDatabase;
  }

  /**
   * Load rider's narrative history from Firebase
   */
  async loadRiderHistory(riderId, db) {
    try {
      const historyRef = db.collection('riders').doc(riderId).collection('narrative_history');
      const snapshot = await historyRef.get();
      
      this.riderNarrativeHistory[riderId] = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        this.riderNarrativeHistory[riderId][doc.id] = {
          usedAt: data.usedAt,
          eventNumber: data.eventNumber,
          context: data.context
        };
      });
      
      console.log(`Loaded narrative history for rider ${riderId}:`, Object.keys(this.riderNarrativeHistory[riderId]).length, 'stories seen');
      return this.riderNarrativeHistory[riderId];
    } catch (error) {
      console.error('Error loading rider narrative history:', error);
      this.riderNarrativeHistory[riderId] = {};
      return {};
    }
  }

  /**
   * Mark a story as used for a specific rider
   */
  async markStoryUsed(riderId, storyId, eventNumber, db) {
    try {
      const historyRef = db.collection('riders').doc(riderId).collection('narrative_history').doc(storyId);
      
      await historyRef.set({
        usedAt: new Date().toISOString(),
        eventNumber: eventNumber,
        timestamp: Date.now()
      });

      // Update local cache
      if (!this.riderNarrativeHistory[riderId]) {
        this.riderNarrativeHistory[riderId] = {};
      }
      this.riderNarrativeHistory[riderId][storyId] = {
        usedAt: new Date().toISOString(),
        eventNumber: eventNumber
      };

      console.log(`Marked story ${storyId} as used for rider ${riderId} at event ${eventNumber}`);
    } catch (error) {
      console.error('Error marking story as used:', error);
    }
  }

  /**
   * Check if rider has seen a specific story
   */
  hasRiderSeenStory(riderId, storyId) {
    return this.riderNarrativeHistory[riderId] && 
           this.riderNarrativeHistory[riderId][storyId] !== undefined;
  }

  /**
   * Evaluate if a story's triggers match the current context
   */
  evaluateTriggers(story, context) {
    const triggers = story.triggers;
    
    // Check race number
    if (triggers.raceNumber !== undefined) {
      if (Array.isArray(triggers.raceNumber)) {
        if (!triggers.raceNumber.includes(context.eventNumber)) {
          return false;
        }
      } else if (triggers.raceNumber !== context.eventNumber) {
        return false;
      }
    }

    // Check performance tier
    if (triggers.performanceTier !== undefined) {
      if (Array.isArray(triggers.performanceTier)) {
        if (!triggers.performanceTier.includes(context.performanceTier) && 
            !triggers.performanceTier.includes('any')) {
          return false;
        }
      } else if (triggers.performanceTier !== 'any' && 
                 triggers.performanceTier !== context.performanceTier) {
        return false;
      }
    }

    // Check improvement from prediction
    if (triggers.improvementFromPrediction !== undefined) {
      const improvement = context.predictedPosition - context.position;
      if (improvement < triggers.improvementFromPrediction) {
        return false;
      }
    }

    // Check consecutive good results
    if (triggers.consecutiveGoodResults !== undefined) {
      const count = this.countConsecutiveGoodResults(context.recentResults);
      if (count < triggers.consecutiveGoodResults) {
        return false;
      }
    }

    // Check consecutive podiums
    if (triggers.consecutivePodiums !== undefined) {
      const count = this.countConsecutivePodiums(context.recentResults);
      if (count < triggers.consecutivePodiums) {
        return false;
      }
    }

    // Check total points threshold
    if (triggers.totalPoints !== undefined) {
      if (context.totalPoints < triggers.totalPoints) {
        return false;
      }
    }

    // Check if first win
    if (triggers.isFirstWin !== undefined) {
      if (triggers.isFirstWin !== context.isFirstWin) {
        return false;
      }
    }

    // Check if worse than predicted
    if (triggers.predictedMuchBetter !== undefined) {
      const diff = context.position - context.predictedPosition;
      if (triggers.predictedMuchBetter && diff < 5) {
        return false;
      }
    }

    // Check if worse result than expected
    if (triggers.isWorseResult !== undefined) {
      if (triggers.isWorseResult !== context.isWorseResult) {
        return false;
      }
    }

    // NEW CONTEXTUAL TRIGGERS - Added for adaptive narrative accuracy

    // Check minimum races completed
    if (triggers.minRacesCompleted !== undefined) {
      const racesCompleted = context.stagesCompleted || 1;
      if (racesCompleted < triggers.minRacesCompleted) {
        return false;
      }
    }

    // Exclude first race
    if (triggers.excludeFirstRace && context.stagesCompleted === 1) {
      return false;
    }

    // Require previous results (multiple races)
    if (triggers.requiresPreviousResults) {
      if (!context.recentResults || context.recentResults.length < 2) {
        return false;
      }
    }

    // Require bad previous result (for comeback narratives)
    if (triggers.requiresBadPreviousResult) {
      if (!context.recentResults || context.recentResults.length < 2) {
        return false;
      }
      const previousResult = context.recentResults[context.recentResults.length - 2];
      if (previousResult <= 15) {
        return false;  // Previous race wasn't bad enough for comeback narrative
      }
    }

    // Require rival history
    if (triggers.requiresRivalHistory) {
      if (!context.topRivals || context.topRivals.length === 0) {
        return false;
      }
    }

    // Require win streak (minimum consecutive wins)
    if (triggers.requiresStreak) {
      const streakLength = context.recentResults ?
        context.recentResults.filter(p => p === 1).length : 0;
      if (streakLength < triggers.requiresStreak) {
        return false;
      }
    }

    // Check personality minimum thresholds
    if (triggers.personalityMin && context.personality) {
      for (const [trait, minValue] of Object.entries(triggers.personalityMin)) {
        const userValue = context.personality[trait] || 50;
        if (userValue < minValue) {
          return false;
        }
      }
    }

    // Check minimum races completed
    if (triggers.minRacesCompleted !== undefined) {
      const racesCompleted = context.racesCompleted || 0;
      if (racesCompleted < triggers.minRacesCompleted) {
        return false;
      }
    }

    // Check contributor status (for contributor-exclusive content)
    if (triggers.requiresContributor !== undefined) {
      if (triggers.requiresContributor && !context.isContributor) {
        return false;
      }
    }

    return true;
  }

  /**
   * Count consecutive good results (top 10)
   */
  countConsecutiveGoodResults(recentResults) {
    if (!recentResults || !Array.isArray(recentResults)) return 0;
    
    let count = 0;
    for (const result of recentResults) {
      if (result <= 10) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Count consecutive podiums
   */
  countConsecutivePodiums(recentResults) {
    if (!recentResults || !Array.isArray(recentResults)) return 0;
    
    let count = 0;
    for (const result of recentResults) {
      if (result <= 3) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Select the best story from a category based on context and novelty
   */
  selectFromCategory(riderId, category, context) {
    const stories = this.narrativeDB[category];
    if (!stories || stories.length === 0) return null;

    // Filter to stories that match triggers and haven't been seen
    const candidates = stories.filter(story => {
      // Skip if already seen by this rider
      if (this.hasRiderSeenStory(riderId, story.id)) {
        return false;
      }
      
      // Check if triggers match
      return this.evaluateTriggers(story, context);
    });

    if (candidates.length === 0) {
      console.log(`No unused stories in category ${category} match context for rider ${riderId}`);
      return null;
    }

    // Weight candidates and select probabilistically
    const totalWeight = candidates.reduce((sum, story) => sum + (story.weight || 0.5), 0);
    let random = Math.random() * totalWeight;
    
    for (const story of candidates) {
      random -= (story.weight || 0.5);
      if (random <= 0) {
        return story;
      }
    }

    // Fallback to first candidate
    return candidates[0];
  }

  /**
   * Generate a complete intro paragraph by selecting appropriate stories
   */
  async generateIntroStory(riderId, context, db) {
    // Ensure we have the narrative history loaded
    if (!this.riderNarrativeHistory[riderId]) {
      await this.loadRiderHistory(riderId, db);
    }

    let selectedStories = [];
    let introParagraph = '';

    // Event 1: Always start with season opening
    if (context.eventNumber === 1) {
      const opening = this.selectFromCategory(riderId, 'seasonOpening', context);
      if (opening) {
        selectedStories.push(opening);
        introParagraph = opening.text.replace('{eventName}', context.eventName);
        await this.markStoryUsed(riderId, opening.id, context.eventNumber, db);
      }
      return introParagraph;
    }

    // Determine which story categories are appropriate
    let categories = [];

    // PRIORITY: Personality-driven stories (if user has completed interviews and has developed personality)
    if (context.personality && context.racesCompleted >= 3) {
      // Check if any personality traits are strong (>= 65)
      const hasStrongPersonality = Object.values(context.personality).some(value => value >= 65);

      if (hasStrongPersonality) {
        // 40% chance to use personality-driven story
        if (Math.random() < 0.4) {
          categories.push('personalityDriven');
        }
      }
    }

    // CONTRIBUTOR EXCLUSIVE: 20% chance for contributors to get exclusive story
    if (context.isContributor && Math.random() < 0.2) {
      categories.unshift('contributorExclusive');
    }

    // Early career stories for events 2-5
    if (context.eventNumber >= 2 && context.eventNumber <= 5) {
      categories.push('earlyCareer');
      // 30% chance to add lifestyle element
      if (Math.random() < 0.3) {
        categories.push('lifestyle');
      }
    }

    // Mid season stories for events 6-10
    else if (context.eventNumber >= 6 && context.eventNumber <= 10) {
      categories.push('midSeason');
      // 20% chance for motivation moment
      if (Math.random() < 0.2) {
        categories.push('motivation');
      }
    }

    // Late season for events 11+
    else if (context.eventNumber >= 11) {
      categories.push('lateSeasonIntros');
    }

    // Add breakthrough moments for exceptional performances
    if (context.isFirstWin ||
        (context.performanceTier === 'win' && context.totalWins <= 2) ||
        (context.performanceTier === 'podium' && this.countConsecutivePodiums(context.recentResults) >= 3)) {
      categories.unshift('breakthrough'); // Put breakthrough first priority
    }

    // Add setback moments for poor performances
    if (context.performanceTier === 'back' &&
        (context.predictedPosition - context.position < -5)) {
      categories.unshift('setback');
    }

    // Add local color for specific events (30% chance)
    if (Math.random() < 0.3) {
      categories.push('localColor');
    }

    // Select one story from the appropriate categories
    for (const category of categories) {
      const story = this.selectFromCategory(riderId, category, context);
      if (story) {
        selectedStories.push(story);
        let text = story.text.replace('{eventName}', context.eventName);
        introParagraph += text + ' ';
        await this.markStoryUsed(riderId, story.id, context.eventNumber, db);
        break; // Only use one intro story per race
      }
    }

    return introParagraph.trim();
  }

  /**
   * Build complete context object from race data
   */
  buildContext(raceData, seasonData) {
    // Determine performance tier
    let performanceTier;
    if (raceData.position === 1) performanceTier = 'win';
    else if (raceData.position <= 3) performanceTier = 'podium';
    else if (raceData.position <= 10) performanceTier = 'top10';
    else if (raceData.position <= 20) performanceTier = 'midpack';
    else performanceTier = 'back';

    return {
      eventNumber: raceData.eventNumber,
      eventName: raceData.eventName,
      position: raceData.position,
      predictedPosition: raceData.predictedPosition || 15,
      performanceTier: performanceTier,
      totalPoints: seasonData.totalPoints || 0,
      totalWins: seasonData.totalWins || 0,
      recentResults: seasonData.recentResults || [],
      isFirstWin: performanceTier === 'win' && seasonData.totalWins <= 1,
      isWorseResult: raceData.position > (raceData.predictedPosition || 15) + 3
    };
  }

  /**
   * Clear all narrative history for a rider (for testing or season reset)
   */
  async clearRiderHistory(riderId, db) {
    try {
      const historyRef = db.collection('riders').doc(riderId).collection('narrative_history');
      const snapshot = await historyRef.get();
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      this.riderNarrativeHistory[riderId] = {};
      console.log(`Cleared all narrative history for rider ${riderId}`);
    } catch (error) {
      console.error('Error clearing rider narrative history:', error);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorySelector };
} else if (typeof window !== 'undefined') {
  window.StorySelector = StorySelector;
}
