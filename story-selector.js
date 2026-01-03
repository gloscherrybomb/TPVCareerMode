// story-selector.js - Intelligent narrative selection engine
// Selects appropriate story elements based on context and tracks what each rider has seen

/**
 * Story Selection Engine
 * - Evaluates trigger conditions to find relevant stories
 * - Weights stories based on context fit
 * - Tracks which stories each rider has seen to ensure uniqueness
 * - Handles Firebase storage of rider narrative history
 */

// Emotional tone constants for narrative consistency
const EMOTIONAL_TONES = {
  TRIUMPHANT: 'triumphant',   // Wins, breakthroughs, dominant performances
  POSITIVE: 'positive',       // Good results, progress, building momentum
  NEUTRAL: 'neutral',         // Factual, descriptive, season context
  REFLECTIVE: 'reflective',   // Learning moments, analytical
  STRUGGLING: 'struggling',   // Setbacks, poor results, disappointment
  RESILIENT: 'resilient'      // Bouncing back, determination despite difficulty
};

// Category to default emotional tone mapping
const CATEGORY_TONES = {
  breakthrough: EMOTIONAL_TONES.TRIUMPHANT,
  setback: EMOTIONAL_TONES.STRUGGLING,
  seasonOpening: EMOTIONAL_TONES.NEUTRAL,
  earlyCareer: EMOTIONAL_TONES.POSITIVE,
  midSeason: EMOTIONAL_TONES.NEUTRAL,
  lateSeasonIntros: EMOTIONAL_TONES.NEUTRAL,
  lifestyle: EMOTIONAL_TONES.NEUTRAL,
  motivation: EMOTIONAL_TONES.POSITIVE,
  equipment: EMOTIONAL_TONES.NEUTRAL,
  weather: EMOTIONAL_TONES.NEUTRAL,
  travel: EMOTIONAL_TONES.NEUTRAL,
  localColor: EMOTIONAL_TONES.NEUTRAL,
  rivalry: EMOTIONAL_TONES.POSITIVE,
  personalityDriven: EMOTIONAL_TONES.POSITIVE,
  contributorExclusive: EMOTIONAL_TONES.POSITIVE,
  postRaceTransitions: EMOTIONAL_TONES.REFLECTIVE,
  specialEvents: EMOTIONAL_TONES.POSITIVE
};

// Tone transition penalties (from -> to = penalty score reduction)
// Higher penalty = more jarring transition to avoid
const TONE_TRANSITION_PENALTIES = {
  [EMOTIONAL_TONES.STRUGGLING]: {
    [EMOTIONAL_TONES.TRIUMPHANT]: 25,  // Struggling -> Triumphant is very jarring
    [EMOTIONAL_TONES.POSITIVE]: 10,    // Struggling -> Positive is somewhat jarring
    [EMOTIONAL_TONES.RESILIENT]: 0     // Struggling -> Resilient is natural progression
  },
  [EMOTIONAL_TONES.TRIUMPHANT]: {
    [EMOTIONAL_TONES.STRUGGLING]: 20,  // Triumphant -> Struggling is jarring (unless bad result)
    [EMOTIONAL_TONES.REFLECTIVE]: 5    // Triumphant -> Reflective is slightly jarring
  },
  [EMOTIONAL_TONES.NEUTRAL]: {},       // Neutral transitions smoothly to anything
  [EMOTIONAL_TONES.POSITIVE]: {
    [EMOTIONAL_TONES.STRUGGLING]: 15   // Positive -> Struggling needs context
  },
  [EMOTIONAL_TONES.REFLECTIVE]: {},    // Reflective transitions smoothly
  [EMOTIONAL_TONES.RESILIENT]: {}      // Resilient transitions smoothly
};

class StorySelector {
  constructor() {
    this.narrativeDB = null;
    this.riderNarrativeHistory = {}; // Cache of what stories this rider has seen
    this.riderEmotionalState = {};   // Track last emotional tone per rider
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
    // Skip loading history when SKIP_NARRATIVE_HISTORY is set (useful for testing/reprocessing)
    // This allows all stories to be selected as if they've never been seen
    if (process.env.SKIP_NARRATIVE_HISTORY === 'true') {
      console.log(`   ⏭️ Skipping narrative history load for rider ${riderId} (SKIP_NARRATIVE_HISTORY=true)`);
      this.riderNarrativeHistory[riderId] = {};
      return {};
    }

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
    // Skip marking stories as used when SKIP_NARRATIVE_HISTORY is set (useful for testing/reprocessing)
    if (process.env.SKIP_NARRATIVE_HISTORY === 'true') {
      console.log(`   ⏭️ Skipping narrative history update for ${storyId} (SKIP_NARRATIVE_HISTORY=true)`);
      return;
    }

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

    // Check event number (used by special events)
    if (triggers.eventNumber !== undefined) {
      if (Array.isArray(triggers.eventNumber)) {
        if (!triggers.eventNumber.includes(context.eventNumber)) {
          return false;
        }
      } else if (triggers.eventNumber !== context.eventNumber) {
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

    // Check total points threshold (supports array of exact values or single minimum)
    if (triggers.totalPoints !== undefined) {
      if (Array.isArray(triggers.totalPoints)) {
        // Must be within one of the specified ranges (treat as minimums)
        const matchesRange = triggers.totalPoints.some(minPoints =>
          context.totalPoints >= minPoints && context.totalPoints < minPoints + 100
        );
        if (!matchesRange) return false;
      } else if (context.totalPoints < triggers.totalPoints) {
        return false;
      }
    }

    // Check total podiums (supports array of exact values)
    if (triggers.totalPodiums !== undefined) {
      if (Array.isArray(triggers.totalPodiums)) {
        if (!triggers.totalPodiums.includes(context.totalPodiums)) {
          return false;
        }
      } else if (context.totalPodiums < triggers.totalPodiums) {
        return false;
      }
    }

    // Check total wins (supports array of exact values)
    if (triggers.totalWins !== undefined) {
      if (Array.isArray(triggers.totalWins)) {
        if (!triggers.totalWins.includes(context.totalWins)) {
          return false;
        }
      } else if (context.totalWins < triggers.totalWins) {
        return false;
      }
    }

    // Check stages completed (supports array of exact values)
    if (triggers.stagesCompleted !== undefined) {
      const stagesCompleted = context.stagesCompleted || context.racesCompleted || 1;
      if (Array.isArray(triggers.stagesCompleted)) {
        if (!triggers.stagesCompleted.includes(stagesCompleted)) {
          return false;
        }
      } else if (stagesCompleted < triggers.stagesCompleted) {
        return false;
      }
    }

    // Check recent position (most recent race result must be in specified range)
    if (triggers.recentPosition !== undefined) {
      const recentPosition = context.recentResults?.[0] || context.position;
      if (Array.isArray(triggers.recentPosition)) {
        if (!triggers.recentPosition.includes(recentPosition)) {
          return false;
        }
      } else if (recentPosition > triggers.recentPosition) {
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
      const streakLength = this.countConsecutiveWins(context.recentResults);
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

    // Check if interview completion required (for personality-driven stories)
    // Personality-driven stories should only appear after user has done at least one interview
    if (triggers.requiresInterview !== undefined) {
      const interviewsCompleted = context.interviewsCompleted || 0;
      if (triggers.requiresInterview && interviewsCompleted < 1) {
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
   * Get the emotional tone of a story
   * Uses story's explicit tone, or derives from category
   */
  getStoryEmotionalTone(story, category) {
    // If story has explicit emotional tone, use it
    if (story.emotionalTone) {
      return story.emotionalTone;
    }

    // Derive from category default
    return CATEGORY_TONES[category] || EMOTIONAL_TONES.NEUTRAL;
  }

  /**
   * Get the last emotional tone for a rider
   */
  getRiderEmotionalState(riderId) {
    return this.riderEmotionalState[riderId] || EMOTIONAL_TONES.NEUTRAL;
  }

  /**
   * Set the emotional state for a rider after story selection
   */
  setRiderEmotionalState(riderId, tone) {
    this.riderEmotionalState[riderId] = tone;
    console.log(`Emotional state for rider ${riderId}: ${tone}`);
  }

  /**
   * Calculate emotional transition penalty
   * Returns a penalty score to subtract for jarring transitions
   */
  calculateTransitionPenalty(fromTone, toTone, context) {
    // If this is event 1, no penalty (fresh start)
    if (context.eventNumber === 1) return 0;

    // Get base penalty from transition matrix
    const fromPenalties = TONE_TRANSITION_PENALTIES[fromTone] || {};
    let penalty = fromPenalties[toTone] || 0;

    // Context-aware adjustments:
    // If result matches the tone shift, reduce penalty
    if (toTone === EMOTIONAL_TONES.STRUGGLING && context.performanceTier === 'back') {
      // Bad result justifies struggling tone even after positive
      penalty = Math.max(0, penalty - 10);
    }
    if (toTone === EMOTIONAL_TONES.TRIUMPHANT && context.performanceTier === 'win') {
      // Win justifies triumphant tone even after struggling
      penalty = Math.max(0, penalty - 15);
    }
    if (toTone === EMOTIONAL_TONES.RESILIENT && fromTone === EMOTIONAL_TONES.STRUGGLING) {
      // Resilient after struggling is actually encouraged
      penalty = -5; // Bonus instead of penalty
    }

    return penalty;
  }

  /**
   * Calculate relevance score for a story based on context match
   * Higher score = more relevant to current situation
   * @param {object} story - The story to score
   * @param {object} context - Current race/season context
   * @param {number} categoryBonus - Bonus score for category priority
   * @param {string} riderId - Optional rider ID for emotional state tracking
   * @param {string} category - Optional category name for emotional tone derivation
   */
  scoreStory(story, context, categoryBonus = 0, riderId = null, category = null) {
    let score = categoryBonus;
    const triggers = story.triggers;

    // Apply emotional transition penalty if we have rider and category info
    if (riderId && category) {
      const lastTone = this.getRiderEmotionalState(riderId);
      const storyTone = this.getStoryEmotionalTone(story, category);
      const penalty = this.calculateTransitionPenalty(lastTone, storyTone, context);
      score -= penalty;
    }

    // Base weight contribution (0.3 - 1.0 range normalized to 0-10 points)
    score += (story.weight || 0.5) * 10;

    // Specific trigger matches earn bonus points

    // Race number match (specific is better than range)
    if (triggers.raceNumber !== undefined) {
      if (Array.isArray(triggers.raceNumber)) {
        if (triggers.raceNumber.includes(context.eventNumber)) {
          score += 5; // Matches one of several events
        }
      } else if (triggers.raceNumber === context.eventNumber) {
        score += 10; // Exact single event match
      }
    }

    // Event number match (used by special events)
    if (triggers.eventNumber !== undefined) {
      if (Array.isArray(triggers.eventNumber)) {
        if (triggers.eventNumber.includes(context.eventNumber)) {
          score += 5; // Matches one of several events
        }
      } else if (triggers.eventNumber === context.eventNumber) {
        score += 10; // Exact single event match
      }
    }

    // Performance tier match
    if (triggers.performanceTier !== undefined) {
      if (triggers.performanceTier === context.performanceTier) {
        score += 15; // Exact tier match
      } else if (Array.isArray(triggers.performanceTier) &&
                 triggers.performanceTier.includes(context.performanceTier)) {
        score += 8; // One of several tiers
      } else if (triggers.performanceTier === 'any' ||
                 (Array.isArray(triggers.performanceTier) && triggers.performanceTier.includes('any'))) {
        score += 2; // Generic match
      }
    }

    // Prediction improvement bonus (exceeded expectations)
    if (triggers.improvementFromPrediction !== undefined) {
      const improvement = context.predictedPosition - context.position;
      if (improvement >= triggers.improvementFromPrediction) {
        score += 12 + Math.min(improvement - triggers.improvementFromPrediction, 10); // Extra for beating by more
      }
    }

    // Consecutive results bonuses
    if (triggers.consecutiveGoodResults !== undefined) {
      const count = this.countConsecutiveGoodResults(context.recentResults);
      if (count >= triggers.consecutiveGoodResults) {
        score += 10 + (count - triggers.consecutiveGoodResults) * 2; // Extra for longer streaks
      }
    }

    if (triggers.consecutivePodiums !== undefined) {
      const count = this.countConsecutivePodiums(context.recentResults);
      if (count >= triggers.consecutivePodiums) {
        score += 15 + (count - triggers.consecutivePodiums) * 3; // High value for podium streaks
      }
    }

    // Total points threshold (scaled bonus based on how much they exceed)
    if (triggers.totalPoints !== undefined) {
      const minPoints = Array.isArray(triggers.totalPoints) ? Math.min(...triggers.totalPoints) : triggers.totalPoints;
      if (context.totalPoints >= minPoints) {
        score += 5 + Math.min((context.totalPoints - minPoints) / 50, 10);
      }
    }

    // Total podiums match (exact match is more valuable)
    if (triggers.totalPodiums !== undefined) {
      if (Array.isArray(triggers.totalPodiums)) {
        if (triggers.totalPodiums.includes(context.totalPodiums)) {
          score += 12; // Exact match bonus
        }
      } else if (context.totalPodiums >= triggers.totalPodiums) {
        score += 8;
      }
    }

    // Total wins match
    if (triggers.totalWins !== undefined) {
      if (Array.isArray(triggers.totalWins)) {
        if (triggers.totalWins.includes(context.totalWins)) {
          score += 12; // Exact match bonus
        }
      } else if (context.totalWins >= triggers.totalWins) {
        score += 8;
      }
    }

    // Stages completed match (season phase relevance)
    if (triggers.stagesCompleted !== undefined) {
      const stagesCompleted = context.stagesCompleted || context.racesCompleted || 1;
      if (Array.isArray(triggers.stagesCompleted)) {
        if (triggers.stagesCompleted.includes(stagesCompleted)) {
          score += 10; // Exact stage match
        }
      } else if (stagesCompleted >= triggers.stagesCompleted) {
        score += 5;
      }
    }

    // Recent position match (current form awareness)
    if (triggers.recentPosition !== undefined) {
      const recentPosition = context.recentResults?.[0] || context.position;
      if (Array.isArray(triggers.recentPosition)) {
        if (triggers.recentPosition.includes(recentPosition)) {
          score += 10; // Form-appropriate story
        }
      } else if (recentPosition <= triggers.recentPosition) {
        score += 8;
      }
    }

    // First win is a special moment
    if (triggers.isFirstWin === true && context.isFirstWin === true) {
      score += 25; // Very high priority for first win stories
    }

    // Worse result than predicted
    if (triggers.isWorseResult === true && context.isWorseResult === true) {
      score += 12;
    }

    // Personality trait matches (bonus scales with trait strength)
    if (triggers.personalityMin && context.personality) {
      let personalityBonus = 0;
      let matchCount = 0;
      for (const [trait, minValue] of Object.entries(triggers.personalityMin)) {
        const userValue = context.personality[trait] || 50;
        if (userValue >= minValue) {
          matchCount++;
          // Bonus scales with how much they exceed the minimum
          personalityBonus += 5 + Math.min((userValue - minValue) / 5, 10);
        }
      }
      if (matchCount === Object.keys(triggers.personalityMin).length) {
        score += personalityBonus; // Only add if ALL personality requirements met
      }
    }

    // Rival history bonus
    if (triggers.requiresRivalHistory && context.topRivals && context.topRivals.length > 0) {
      score += 8 + Math.min(context.topRivals.length * 2, 6); // More rivals = more relevant
    }

    // Contributor exclusive content
    if (triggers.requiresContributor && context.isContributor) {
      score += 15; // High priority for contributor content
    }

    // Winning streak
    if (triggers.requiresStreak) {
      const streakLength = this.countConsecutiveWins(context.recentResults);
      if (streakLength >= triggers.requiresStreak) {
        score += 15 + (streakLength - triggers.requiresStreak) * 5;
      }
    }

    // Minimum races completed (experience-appropriate stories)
    if (triggers.minRacesCompleted !== undefined) {
      const racesCompleted = context.racesCompleted || context.stagesCompleted || 1;
      if (racesCompleted >= triggers.minRacesCompleted) {
        score += 3; // Small bonus for experience-gated content
      }
    }

    return score;
  }

  /**
   * Select the best story from a category based on context and novelty
   * Uses relevance scoring instead of random selection
   */
  selectFromCategory(riderId, category, context, categoryBonus = 0) {
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

    // Score all candidates (with emotional transition awareness)
    const scoredCandidates = candidates.map(story => ({
      story,
      score: this.scoreStory(story, context, categoryBonus, riderId, category)
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Get top candidates within 10% of highest score for tie-breaking
    const topScore = scoredCandidates[0].score;
    const threshold = topScore * 0.9;
    const topCandidates = scoredCandidates.filter(c => c.score >= threshold);

    // Random selection among top candidates for variety
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    console.log(`Selected story ${selected.story.id} with score ${selected.score.toFixed(1)} (${topCandidates.length} top candidates)`);
    return selected.story;
  }

  /**
   * Get all candidate stories from multiple categories, scored
   * Includes claim validation to filter out stories with invalid claims
   */
  getAllScoredCandidates(riderId, categories, context) {
    const allCandidates = [];
    let claimValidationFailures = 0;

    for (const { category, bonus } of categories) {
      const stories = this.narrativeDB[category];
      if (!stories || stories.length === 0) continue;

      for (const story of stories) {
        // Skip if already seen
        if (this.hasRiderSeenStory(riderId, story.id)) continue;

        // Check triggers
        if (!this.evaluateTriggers(story, context)) continue;

        // Validate that story claims are consistent with user's actual stats
        if (!this.validateStoryClaims(story.text, context)) {
          claimValidationFailures++;
          continue;
        }

        // Score and add to candidates (with emotional transition awareness)
        const score = this.scoreStory(story, context, bonus, riderId, category);
        allCandidates.push({ story, category, score });
      }
    }

    if (claimValidationFailures > 0) {
      console.log(`Claim validation: filtered out ${claimValidationFailures} stories with invalid claims`);
    }

    return allCandidates;
  }

  /**
   * Generate a complete intro paragraph by selecting appropriate stories
   * Uses relevance scoring across all categories instead of random percentages
   */
  async generateIntroStory(riderId, context, db) {
    // Ensure we have the narrative history loaded
    if (!this.riderNarrativeHistory[riderId]) {
      await this.loadRiderHistory(riderId, db);
    }

    let introParagraph = '';

    // Event 1: Always start with season opening
    if (context.eventNumber === 1) {
      const opening = this.selectFromCategory(riderId, 'seasonOpening', context, 20);
      if (opening) {
        introParagraph = opening.text.replace('{eventName}', context.eventName);
        await this.markStoryUsed(riderId, opening.id, context.eventNumber, db);
        // Set initial emotional state
        this.setRiderEmotionalState(riderId, EMOTIONAL_TONES.NEUTRAL);
      }
      return introParagraph;
    }

    // Special Events (eventNumber >= 100): Use dedicated specialEvents category
    if (context.eventNumber >= 100) {
      const specialStory = this.selectFromCategory(riderId, 'specialEvents', context, 30);
      if (specialStory) {
        introParagraph = this.applyVariableSubstitution(specialStory.text, context);
        await this.markStoryUsed(riderId, specialStory.id, context.eventNumber, db);
        this.setRiderEmotionalState(riderId, this.getStoryEmotionalTone(specialStory, 'specialEvents'));
      }
      return introParagraph.trim();
    }

    // Build list of relevant categories with priority bonuses
    // Higher bonus = more likely to be selected when scores are close
    const categories = [];

    // === CONTEXTUAL PRIORITY CATEGORIES (highest bonuses) ===

    // First win is a special moment - highest priority
    if (context.isFirstWin) {
      categories.push({ category: 'breakthrough', bonus: 50 });
    }
    // Other breakthrough moments
    else if ((context.performanceTier === 'win' && context.totalWins <= 2) ||
             (context.performanceTier === 'podium' && this.countConsecutivePodiums(context.recentResults) >= 3)) {
      categories.push({ category: 'breakthrough', bonus: 35 });
    }

    // Setback moments for poor performances
    if (context.performanceTier === 'back' && (context.predictedPosition - context.position < -5)) {
      categories.push({ category: 'setback', bonus: 35 });
    }

    // === PERSONALITY-DRIVEN (bonus scales with trait strength) ===
    if (context.personality && context.racesCompleted >= 3) {
      const strongTraits = Object.values(context.personality).filter(v => v >= 65);
      const veryStrongTraits = Object.values(context.personality).filter(v => v >= 80);

      if (veryStrongTraits.length > 0) {
        // Very strong personality = high priority
        categories.push({ category: 'personalityDriven', bonus: 30 + veryStrongTraits.length * 5 });
      } else if (strongTraits.length > 0) {
        // Strong personality = moderate priority
        categories.push({ category: 'personalityDriven', bonus: 15 + strongTraits.length * 3 });
      }
    }

    // === CONTRIBUTOR EXCLUSIVE ===
    if (context.isContributor) {
      categories.push({ category: 'contributorExclusive', bonus: 25 });
    }

    // === SEASON PHASE CATEGORIES ===
    if (context.eventNumber >= 2 && context.eventNumber <= 5) {
      categories.push({ category: 'earlyCareer', bonus: 10 });
      categories.push({ category: 'lifestyle', bonus: 5 });
    } else if (context.eventNumber >= 6 && context.eventNumber <= 10) {
      categories.push({ category: 'midSeason', bonus: 10 });
      categories.push({ category: 'motivation', bonus: 8 });
    } else if (context.eventNumber >= 11) {
      categories.push({ category: 'lateSeasonIntros', bonus: 12 });
    }

    // === SUPPLEMENTARY CATEGORIES (always available, lower priority) ===
    categories.push({ category: 'localColor', bonus: 3 });
    categories.push({ category: 'equipment', bonus: 2 });
    categories.push({ category: 'weather', bonus: 2 });
    categories.push({ category: 'travel', bonus: 2 });

    // Performance-specific extras
    if (context.performanceTier === 'win' || context.performanceTier === 'podium') {
      categories.push({ category: 'rivalry', bonus: 8 });
    }

    // Get all candidates from all categories, scored
    const allCandidates = this.getAllScoredCandidates(riderId, categories, context);

    if (allCandidates.length === 0) {
      console.log(`No story candidates found for rider ${riderId} at event ${context.eventNumber}`);
      return '';
    }

    // Sort by score (highest first)
    allCandidates.sort((a, b) => b.score - a.score);

    // Get top candidates within 15% of highest score for variety
    const topScore = allCandidates[0].score;
    const threshold = topScore * 0.85;
    const topCandidates = allCandidates.filter(c => c.score >= threshold);

    // Random selection among top candidates
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    console.log(`Story selection: chose ${selected.story.id} (${selected.category}) with score ${selected.score.toFixed(1)}`);
    console.log(`  Top ${topCandidates.length} candidates from ${allCandidates.length} total (threshold: ${threshold.toFixed(1)})`);

    // Apply variable substitution and mark as used
    introParagraph = this.applyVariableSubstitution(selected.story.text, context);
    await this.markStoryUsed(riderId, selected.story.id, context.eventNumber, db);

    // Update emotional state for next story selection
    const selectedTone = this.getStoryEmotionalTone(selected.story, selected.category);
    this.setRiderEmotionalState(riderId, selectedTone);

    return introParagraph.trim();
  }

  /**
   * Select a post-race transition moment from the database
   * Returns a short transition phrase
   * Used in the two-part narrative structure
   */
  async selectTransitionMoment(riderId, context, db) {
    // Try to select from postRaceTransitions category
    const transition = this.selectFromCategory(riderId, 'postRaceTransitions', context, 10);

    if (!transition) {
      // Fallback: return a lifestyle-rich transition based on performance
      // These include their own opener (no separate connector needed)
      const tier = context.performanceTier || 'midpack';
      const stagesCompleted = context.stagesCompleted || 1;

      // Different fallbacks for first race vs later races
      if (stagesCompleted <= 1) {
        const firstRaceFallbacks = {
          win: "Back home, you couldn't stop smiling. Your first race, and a win. This was actually happening.",
          podium: "That evening you kept looking at the podium photo. Your first race, and a podium. Unreal.",
          top10: "You told the race story to anyone who'd listen that evening. Your first race, a solid result.",
          midpack: "Lying in bed that night, you replayed every moment. Your first race was done. The addiction had begun.",
          back: "That evening you processed your debut, already planning what to do differently next time."
        };
        return firstRaceFallbacks[tier] || firstRaceFallbacks.midpack;
      }

      const fallbacks = {
        win: [
          "The victory celebration ran long that evening. Tomorrow's recovery ride could wait.",
          "You found yourself replaying the winning moment over and over. Still didn't feel real.",
          "The evening was spent fielding congratulatory messages. This never gets old.",
          "You slept well that night, the satisfaction of victory still warming your thoughts.",
          "That evening, everything just felt right. This is why you race."
        ],
        podium: [
          "That podium photo was already your phone wallpaper. No shame.",
          "The podium spot earned tonight would fuel training for weeks to come.",
          "You kept looking at the result on your phone. Third feels good.",
          "The evening passed in a happy blur, the podium finish still sinking in.",
          "You drifted off replaying the key moments that earned you that podium spot."
        ],
        top10: [
          "A solid evening of recovery followed a solid race. Balance in all things.",
          "You reviewed the race data that evening, satisfied with the day's work.",
          "The top ten finish deserved a relaxed evening. You'd earned it.",
          "That night you slept the sleep of someone who'd raced well and finished strong.",
          "The evening was quiet, but the satisfaction of a good result lingered."
        ],
        midpack: [
          "An unremarkable evening followed an unremarkable result. Tomorrow's another day.",
          "You processed the day's racing while scrolling through cycling content.",
          "The result wasn't what you'd hoped for, but the legs would be better next time.",
          "An evening of recovery—physical and mental—followed the day's efforts.",
          "You wound down with familiar routines, the race already fading into memory."
        ],
        back: [
          "A quiet evening gave space to process the day's disappointment.",
          "The result stung, but tomorrow would bring fresh perspective.",
          "You let the frustration of the day dissipate slowly through the evening.",
          "Not every race goes to plan. The evening was about accepting that.",
          "The long drive home gave time to think about what went wrong and how to fix it."
        ]
      };
      const tierFallbacks = fallbacks[tier] || fallbacks.midpack;
      return tierFallbacks[Math.floor(Math.random() * tierFallbacks.length)];
    }

    // Mark as used and apply variable substitution
    await this.markStoryUsed(riderId, transition.id, context.eventNumber, db);

    // Update emotional state for transition moments
    const transitionTone = this.getStoryEmotionalTone(transition, 'postRaceTransitions');
    this.setRiderEmotionalState(riderId, transitionTone);

    return this.applyVariableSubstitution(transition.text, context);
  }

  /**
   * Apply variable substitution to story text
   */
  applyVariableSubstitution(text, context) {
    return text
      .replace(/{eventName}/g, context.eventName || 'the race')
      .replace(/{totalWins}/g, context.totalWins || 0)
      .replace(/{totalPodiums}/g, context.totalPodiums || 0)
      .replace(/{totalPoints}/g, context.totalPoints || 0)
      .replace(/{position}/g, context.position || '?')
      .replace(/{predictedPosition}/g, context.predictedPosition || '?')
      .replace(/{seasonRank}/g, context.seasonRank || '?')
      .replace(/{racesCompleted}/g, context.racesCompleted || context.stagesCompleted || 1)
      .replace(/{eventNumber}/g, context.eventNumber || '?');
  }

  /**
   * Validate that a story's text claims are consistent with user's actual stats
   * Returns true if story is valid for this context, false if it makes invalid claims
   */
  validateStoryClaims(storyText, context) {
    const text = storyText.toLowerCase();
    const totalWins = context.totalWins || 0;
    const totalPodiums = context.totalPodiums || 0;
    const racesCompleted = context.racesCompleted || context.stagesCompleted || 1;

    // Check win-related claims
    if (text.includes('winning streak') || text.includes('consecutive victories') || text.includes('consecutive wins')) {
      // Winning streak requires 2+ consecutive wins
      const consecutiveWins = this.countConsecutiveWins(context.recentResults);
      if (consecutiveWins < 2) {
        console.log(`Claim validation failed: "winning streak" but only ${consecutiveWins} consecutive wins`);
        return false;
      }
    }

    if (text.includes('multiple wins') || text.includes('multiple victories')) {
      if (totalWins < 2) {
        console.log(`Claim validation failed: "multiple wins" but only ${totalWins} wins`);
        return false;
      }
    }

    if ((text.includes('your win') || text.includes('your victory') || text.includes('you won')) &&
        !text.includes('if you') && !text.includes('whether you')) {
      // References to past wins require at least 1 win
      if (totalWins < 1 && context.position !== 1) {
        console.log(`Claim validation failed: references past win but ${totalWins} total wins`);
        return false;
      }
    }

    // Check podium-related claims
    if (text.includes('podiums') || text.includes('podium finishes')) {
      // Plural "podiums" requires 2+
      if (totalPodiums < 2) {
        console.log(`Claim validation failed: "podiums" (plural) but only ${totalPodiums} podiums`);
        return false;
      }
    }

    if (text.includes('multiple podium') || text.includes('several podium')) {
      if (totalPodiums < 2) {
        console.log(`Claim validation failed: "multiple/several podiums" but only ${totalPodiums} podiums`);
        return false;
      }
    }

    // Check experience-related claims
    if (text.includes('seasons of experience') || text.includes('years of racing')) {
      // Don't make multi-season claims in season 1
      // This is always first season in current implementation
      console.log(`Claim validation failed: multi-season experience claim in first season`);
      return false;
    }

    if (text.includes('veteran') || text.includes('experienced racer')) {
      // "Veteran" claims require significant races
      if (racesCompleted < 8) {
        console.log(`Claim validation failed: "veteran" but only ${racesCompleted} races completed`);
        return false;
      }
    }

    // Check consistency claims
    if (text.includes('consistent front-runner') || text.includes('consistently at the front')) {
      // Need evidence of consistent front-running (3+ top 10s)
      const topTenCount = (context.recentResults || []).filter(p => p <= 10).length;
      if (topTenCount < 3) {
        console.log(`Claim validation failed: "consistent front-runner" but only ${topTenCount} top-10s in recent results`);
        return false;
      }
    }

    // Check rivalry claims
    if (text.includes('your rival') || text.includes('your nemesis') || text.includes('ongoing rivalry')) {
      if (!context.topRivals || context.topRivals.length === 0) {
        console.log(`Claim validation failed: rivalry claims but no rivals`);
        return false;
      }
    }

    return true;
  }

  /**
   * Count consecutive wins from recent results
   */
  countConsecutiveWins(recentResults) {
    if (!recentResults || !Array.isArray(recentResults)) return 0;

    let count = 0;
    for (const result of recentResults) {
      if (result === 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
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
