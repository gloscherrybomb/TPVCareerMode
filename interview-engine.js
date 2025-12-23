// interview-engine.js - Question generation and selection logic for post-race interviews

import { INTERVIEW_QUESTIONS } from './interview-questions.js';
import { INTERVIEW_RESPONSES } from './interview-responses.js';

/**
 * PERSONALITY PROGRESSION SYSTEM
 * ==============================
 *
 * Traits range from 0-100, starting at 50 (neutral)
 *
 * WITHIN A SEASON:
 * - Interview responses adjust traits by +1 to +5 (typically +3-4)
 * - Diminishing returns apply at high values:
 *   - 70-79: Changes reduced to 75% effectiveness
 *   - 80+: Changes reduced to 50% effectiveness
 * - This naturally plateaus traits around 85-90 for consistent players
 *
 * BETWEEN SEASONS:
 * - Traits drift 35% back toward neutral (50)
 * - Example: Confidence 85 → starts next season at 73
 * - Maintains personality tendency but creates room for continued growth
 * - Requires consistent interview choices to maintain high trait values
 *
 * This creates a sustainable multi-season system where:
 * - Personality feels "sticky" (doesn't reset completely)
 * - Always room for development and change
 * - High traits can be maintained but require effort
 * - Players can shift personality over time if desired
 */

/**
 * Default personality values for new users
 */
export function getDefaultPersonality() {
    return {
        confidence: 50,
        humility: 50,
        aggression: 50,
        professionalism: 50,
        showmanship: 50,
        resilience: 50,
        lastUpdated: new Date()
    };
}

/**
 * Build race context from event results for interview question selection
 */
export function buildRaceContext(userResult, allResults, userData, seasonData) {
    const isDNF = userResult.position === 'DNF';
    const context = {
        position: userResult.position,
        isDNF: isDNF,
        totalRiders: allResults.length,
        predicted: userResult.predicted || null,
        beatPredictionBy: !isDNF && userResult.predicted ? (userResult.predicted - userResult.position) : 0,
        worseThanPredictionBy: !isDNF && userResult.predicted ? (userResult.position - userResult.predicted) : 0,

        // Time gaps
        winMargin: userResult.position === 1 && allResults[1] ?
            Math.abs(allResults[1].time - userResult.time) : null,
        lossMargin: userResult.position > 1 && allResults[0] ?
            Math.abs(allResults[0].time - userResult.time) : null,

        // Rival information (if applicable)
        rivalEncounter: false,
        rivalName: null,
        rivalGap: null,
        userWon: null,
        userLost: null,
        totalEncounters: 0,
        h2hWins: 0,
        firstEncounter: false,

        // Season context
        racesCompleted: seasonData?.racesCompleted || 1,
        careerWins: userData?.totalWins || 0,
        careerPodiums: userData?.totalPodiums || 0,
        consecutiveWins: seasonData?.consecutiveWins || 0,
        consecutivePodiums: seasonData?.consecutivePodiums || 0,
        recentRacesBelowExpectation: seasonData?.recentBelowExpectation || 0,

        // Event metadata
        eventType: userResult.eventType || 'road race',
        eventCategory: userResult.eventCategory || 'road',
        isSeasonFinale: seasonData?.isSeasonFinale || false
    };

    // Check for rival encounters in results
    if (userData?.rivals && userData.rivals.length > 0) {
        const rival = userData.rivals[0]; // Primary rival
        const rivalResult = allResults.find(r => r.name === rival.name);

        if (rivalResult) {
            context.rivalEncounter = true;
            context.rivalName = rival.name;
            context.rivalGap = Math.abs(userResult.time - rivalResult.time);
            context.userWon = userResult.position < rivalResult.position;
            context.userLost = userResult.position > rivalResult.position;
            context.totalEncounters = rival.encounters || 1;
            context.h2hWins = rival.userWins || 0;
            context.firstEncounter = rival.encounters === 1;
        }
    }

    return context;
}

/**
 * Check if a trigger condition matches the race context
 */
function checkTrigger(trigger, value, context) {
    if (typeof trigger === 'number') {
        return value === trigger;
    }

    if (typeof trigger === 'string') {
        return value === trigger;
    }

    if (typeof trigger === 'boolean') {
        return value === trigger;
    }

    if (Array.isArray(trigger)) {
        return trigger.includes(value);
    }

    // Special trigger types
    if (trigger.greaterThan !== undefined) {
        return value > trigger.greaterThan;
    }

    if (trigger.lessThan !== undefined) {
        return value < trigger.lessThan;
    }

    if (trigger.between !== undefined) {
        return value >= trigger.between[0] && value <= trigger.between[1];
    }

    return false;
}

/**
 * Check if all triggers for a question are satisfied
 */
function checkQuestionTriggers(questionTriggers, context) {
    // Convert trigger object to array of checks
    const triggerChecks = Object.entries(questionTriggers).map(([key, trigger]) => {
        // Handle special trigger keys
        if (key === 'positionIn') {
            return trigger.includes(context.position);
        }

        if (key === 'positionBetween') {
            return context.position >= trigger[0] && context.position <= trigger[1];
        }

        if (key === 'positionGreaterThan') {
            return context.position > trigger;
        }

        if (key === 'positionLessThan') {
            return context.position < trigger;
        }

        if (key === 'beatPredictionBy') {
            return context.beatPredictionBy >= trigger;
        }

        if (key === 'worseThanPredictionBy') {
            return context.worseThanPredictionBy >= trigger;
        }

        if (key === 'winMarginGreaterThan') {
            return context.winMargin && context.winMargin > trigger;
        }

        if (key === 'winMarginLessThan') {
            return context.winMargin && context.winMargin < trigger;
        }

        if (key === 'gapLessThan') {
            return context.rivalGap && context.rivalGap < trigger;
        }

        if (key === 'racesCompletedBetween') {
            return context.racesCompleted >= trigger[0] && context.racesCompleted <= trigger[1];
        }

        if (key === 'consecutiveWins') {
            return context.consecutiveWins >= trigger;
        }

        if (key === 'consecutivePodiums') {
            return context.consecutivePodiums >= trigger;
        }

        if (key === 'careerWins') {
            return context.careerWins === trigger;
        }

        if (key === 'careerPodiums') {
            return context.careerPodiums === trigger;
        }

        if (key === 'h2hWins') {
            return context.h2hWins >= trigger;
        }

        if (key === 'totalEncounters') {
            return context.totalEncounters >= trigger;
        }

        if (key === 'recentRacesBelowExpectation') {
            return context.recentRacesBelowExpectation >= trigger;
        }

        if (key === 'isDNF') {
            return context.isDNF === trigger;
        }

        if (key === 'eventNumber') {
            return context.eventNumber === trigger;
        }

        // Default: check direct context value match
        const contextValue = context[key];
        return checkTrigger(trigger, contextValue, context);
    });

    // All triggers must be satisfied
    return triggerChecks.every(check => check === true);
}

/**
 * Find all eligible questions based on race context
 */
function findEligibleQuestions(context) {
    const eligible = [];

    // Check all question categories
    Object.values(INTERVIEW_QUESTIONS).forEach(category => {
        Object.values(category).forEach(question => {
            if (checkQuestionTriggers(question.triggers, context)) {
                eligible.push(question);
            }
        });
    });

    return eligible;
}

/**
 * Select the best question from eligible questions
 * Priority order:
 * 1. Season milestones (first win, first podium, season finale)
 * 2. Rivalry questions
 * 3. Performance questions
 * 4. Tactical questions
 * 5. Setback questions
 *
 * Now with smart repetition prevention and randomization
 */
function selectBestQuestion(eligibleQuestions, context, recentQuestions = []) {
    if (eligibleQuestions.length === 0) {
        // Fallback to a generic question if no specific triggers match
        return INTERVIEW_QUESTIONS.performance.top_ten;
    }

    // Filter out recently asked questions (last 3 questions)
    let availableQuestions = eligibleQuestions;
    if (recentQuestions.length > 0) {
        const filteredQuestions = eligibleQuestions.filter(q => !recentQuestions.includes(q.id));

        // Only apply filter if we have other options available
        if (filteredQuestions.length > 0) {
            availableQuestions = filteredQuestions;
        }
    }

    // Priority order (milestones and DNF always take precedence)
    const highPriorityOrder = [
        'dnf',
        'first_win',
        'first_podium',
        'season_finale'
    ];

    // Check high priority questions first (always show these, even if recent)
    for (const questionId of highPriorityOrder) {
        const match = availableQuestions.find(q => q.id === questionId);
        if (match) {
            return match;
        }
    }

    // Medium priority questions (with randomization)
    const mediumPriorityOrder = [
        'winning_streak',
        'podium_streak',
        'rival_first_encounter',
        'rival_close_battle',
        'rival_beat_them',
        'rival_they_won',
        // Special events (high priority when triggered)
        'singapore_win',
        'singapore_podium',
        'singapore_midpack',
        'singapore_tough',
        'leveller_win',
        'leveller_podium',
        'leveller_solid',
        'leveller_struggle'
    ];

    // Collect all matching medium priority questions
    const mediumMatches = [];
    for (const questionId of mediumPriorityOrder) {
        const match = availableQuestions.find(q => q.id === questionId);
        if (match) {
            mediumMatches.push(match);
        }
    }

    // If we have medium priority matches, randomly select one
    if (mediumMatches.length > 0) {
        return mediumMatches[Math.floor(Math.random() * mediumMatches.length)];
    }

    // Low priority questions (performance-based, with randomization)
    const lowPriorityOrder = [
        'win_dominant',
        'win_close',
        'win_standard',
        'podium_beat_prediction',
        'podium_standard',
        'beat_prediction_significantly',
        'top_ten',
        'worse_than_predicted',
        'bad_streak',
        'back_of_pack'
    ];

    // Collect all matching low priority questions
    const lowMatches = [];
    for (const questionId of lowPriorityOrder) {
        const match = availableQuestions.find(q => q.id === questionId);
        if (match) {
            lowMatches.push(match);
        }
    }

    // If we have multiple low priority matches, randomly select one
    if (lowMatches.length > 0) {
        return lowMatches[Math.floor(Math.random() * lowMatches.length)];
    }

    // Fallback: randomly select from any remaining eligible questions
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

/**
 * Substitute variables in question text with race context values
 */
function substituteVariables(text, context) {
    let result = text;

    // Replace all {variable} placeholders
    result = result.replace(/\{(\w+)\}/g, (match, variable) => {
        if (variable === 'position') {
            return formatOrdinal(context.position);
        }

        if (variable === 'predicted') {
            return formatOrdinal(context.predicted);
        }

        if (variable === 'winMargin') {
            return Math.round(context.winMargin);
        }

        if (variable === 'gap') {
            return Math.round(context.rivalGap);
        }

        if (variable === 'rivalName') {
            return context.rivalName;
        }

        if (variable === 'racesCompleted') {
            return context.racesCompleted;
        }

        if (variable === 'winStreak') {
            return context.consecutiveWins;
        }

        if (variable === 'podiumStreak') {
            return context.consecutivePodiums;
        }

        return match; // Return original if no match found
    });

    return result;
}

/**
 * Format number as ordinal (1st, 2nd, 3rd, etc.)
 */
function formatOrdinal(num) {
    if (!num) return '';

    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) {
        return num + 'st';
    }
    if (j === 2 && k !== 12) {
        return num + 'nd';
    }
    if (j === 3 && k !== 13) {
        return num + 'rd';
    }
    return num + 'th';
}

/**
 * Generate interview question and response options based on race context
 */
export function generateInterview(context, recentQuestions = []) {
    // Find all eligible questions
    const eligibleQuestions = findEligibleQuestions(context);

    // Select the best question (with repetition prevention)
    const selectedQuestion = selectBestQuestion(eligibleQuestions, context, recentQuestions);

    // Substitute variables in question text
    const questionText = substituteVariables(selectedQuestion.text, context);

    // Get response options
    const responseOptions = selectedQuestion.responses.map(responseId => {
        const response = INTERVIEW_RESPONSES[responseId];
        if (!response) {
            console.error(`Response ${responseId} not found in database`);
            return null;
        }

        // Substitute variables in response text if needed
        const responseText = substituteVariables(response.text, context);

        return {
            id: response.id,
            text: responseText,
            style: response.style,
            badge: response.badge,
            personalityImpact: response.personalityImpact
        };
    }).filter(r => r !== null);

    return {
        questionId: selectedQuestion.id,
        questionText: questionText,
        responseOptions: responseOptions,
        context: context
    };
}

/**
 * Calculate scaled delta with diminishing returns for high trait values
 * As traits get higher, they become harder to increase
 *
 * @param {number} currentValue - Current trait value (0-100)
 * @param {number} baseDelta - Base personality change amount
 * @returns {number} Scaled delta value
 */
function getScaledDelta(currentValue, baseDelta) {
    // No scaling for negative deltas (penalties apply fully)
    if (baseDelta < 0) {
        return baseDelta;
    }

    // Diminishing returns at high values
    if (currentValue >= 80) {
        return Math.round(baseDelta * 0.5); // 50% effectiveness above 80
    }
    if (currentValue >= 70) {
        return Math.round(baseDelta * 0.75); // 75% effectiveness 70-79
    }

    // Full effect below 70
    return baseDelta;
}

/**
 * Apply personality changes from interview response with diminishing returns
 * Higher trait values are harder to increase (realistic personality development)
 */
export function applyPersonalityChanges(currentPersonality, personalityDelta) {
    const updated = { ...currentPersonality };

    Object.entries(personalityDelta).forEach(([trait, change]) => {
        const currentValue = currentPersonality[trait] || 50;

        // Apply diminishing returns scaling
        const scaledChange = getScaledDelta(currentValue, change);
        let newValue = currentValue + scaledChange;

        // Clamp between 0-100
        newValue = Math.max(0, Math.min(100, newValue));

        updated[trait] = newValue;
    });

    updated.lastUpdated = new Date();

    return updated;
}

/**
 * Calculate personality values for start of new season
 * Traits drift 35% back toward neutral (50) to allow continued growth
 * while maintaining personality tendency from previous season
 *
 * Example: Confidence 85 → drifts to 73 (85 + (50-85) * 0.35)
 *
 * This creates:
 * - Room for growth in new season
 * - Personality "stickiness" (doesn't fully reset)
 * - Need to maintain personality through consistent choices
 *
 * @param {Object} previousSeasonPersonality - Personality at end of previous season
 * @returns {Object} Starting personality for new season
 */
export function calculateSeasonStartPersonality(previousSeasonPersonality) {
    const driftFactor = 0.35; // 35% drift toward neutral
    const newSeasonPersonality = {};

    Object.keys(previousSeasonPersonality).forEach(trait => {
        if (trait === 'lastUpdated') {
            newSeasonPersonality[trait] = new Date();
            return;
        }

        const previousValue = previousSeasonPersonality[trait];
        const driftAmount = (50 - previousValue) * driftFactor;
        const newValue = Math.round(previousValue + driftAmount);

        // Ensure we stay in bounds
        newSeasonPersonality[trait] = Math.max(0, Math.min(100, newValue));
    });

    return newSeasonPersonality;
}

/**
 * Get dominant personality traits (top 2)
 */
export function getDominantTraits(personality) {
    const traits = [
        { name: 'confidence', value: personality.confidence || 50 },
        { name: 'humility', value: personality.humility || 50 },
        { name: 'aggression', value: personality.aggression || 50 },
        { name: 'professionalism', value: personality.professionalism || 50 },
        { name: 'showmanship', value: personality.showmanship || 50 },
        { name: 'resilience', value: personality.resilience || 50 }
    ];

    // Sort by value descending
    traits.sort((a, b) => b.value - a.value);

    return [traits[0].name, traits[1].name];
}

/**
 * Get persona label based on personality profile
 */
export function getPersonaLabel(personality) {
    const dominant = getDominantTraits(personality);

    // Persona mapping based on top 2 traits
    const personas = {
        'confidence-aggression': 'The Bold Competitor',
        'confidence-professionalism': 'The Confident Professional',
        'confidence-showmanship': 'The Charismatic Star',
        'confidence-resilience': 'The Determined Champion',
        'confidence-humility': 'The Grounded Talent',

        'humility-professionalism': 'The Quiet Professional',
        'humility-resilience': 'The Humble Warrior',
        'humility-showmanship': 'The Gracious Entertainer',
        'humility-aggression': 'The Respectful Competitor',

        'aggression-showmanship': 'The Fierce Showman',
        'aggression-resilience': 'The Relentless Fighter',
        'aggression-professionalism': 'The Tactical Aggressor',

        'professionalism-resilience': 'The Consistent Performer',
        'professionalism-showmanship': 'The Polished Entertainer',

        'showmanship-resilience': 'The Dramatic Comeback Kid',

        'resilience-confidence': 'The Confident Climber'
    };

    const key = `${dominant[0]}-${dominant[1]}`;
    const reverseKey = `${dominant[1]}-${dominant[0]}`;

    return personas[key] || personas[reverseKey] || 'The Rising Talent';
}

/**
 * Calculate season context for interview triggers
 */
export function calculateSeasonContext(userData, eventNumber) {
    // Build race history from individual event results (event1Results, event2Results, etc.)
    // Events 1-12 are individual races, 13-15 are tour stages
    const raceHistory = [];
    for (let i = 1; i <= 15; i++) {
        const eventResults = userData?.[`event${i}Results`];
        if (eventResults && eventResults.position) {
            raceHistory.push({
                eventNumber: i,
                position: eventResults.position,
                predictedPosition: eventResults.predictedPosition
            });
        }
    }

    // Count consecutive wins/podiums (from most recent backwards)
    let consecutiveWins = 0;
    let consecutivePodiums = 0;
    let recentBelowExpectation = 0;

    // Look at last 3 races for streaks
    const recentRaces = raceHistory.slice(-3);

    // Count consecutive wins from most recent backwards
    for (let i = raceHistory.length - 1; i >= 0; i--) {
        const race = raceHistory[i];
        if (race.position === 1) {
            consecutiveWins++;
        } else {
            break; // Streak broken
        }
    }

    // Count consecutive podiums from most recent backwards
    for (let i = raceHistory.length - 1; i >= 0; i--) {
        const race = raceHistory[i];
        if (race.position <= 3) {
            consecutivePodiums++;
        } else {
            break; // Streak broken
        }
    }

    // Count below expectation in last 3 races
    for (const race of recentRaces) {
        if (race.predictedPosition && race.position > race.predictedPosition + 3) {
            recentBelowExpectation++;
        }
    }

    return {
        racesCompleted: raceHistory.length,
        consecutiveWins,
        consecutivePodiums,
        recentBelowExpectation,
        isSeasonFinale: eventNumber === 15 // Season 1 ends with event 15 (Local Tour stage 3)
    };
}
