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
   * Calculate relevance score for a story based on context match
   * Higher score = more relevant to current situation
   */
  scoreStory(story, context, categoryBonus = 0) {
    let score = categoryBonus;
    const triggers = story.triggers;

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
      const streakLength = context.recentResults ?
        context.recentResults.filter(p => p === 1).length : 0;
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

    // Score all candidates
    const scoredCandidates = candidates.map(story => ({
      story,
      score: this.scoreStory(story, context, categoryBonus)
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

        // Score and add to candidates
        const score = this.scoreStory(story, context, bonus);
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
      }
      return introParagraph;
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

    return introParagraph.trim();
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
