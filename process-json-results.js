// process-json-results.js - Process race results from JSON files
// This is a separate processing pipeline for JSON results from the TPVirtual API
// Keeps CSV processing (process-results.js) completely untouched

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const awardsCalc = require('./awards-calculation');
const storyGen = require('./story-generator');
const { AWARD_CREDIT_MAP, PER_EVENT_CREDIT_CAP, COMPLETION_BONUS_CC } = require('./currency-config');
const { UNLOCK_DEFINITIONS, getUnlockById } = require('./unlock-config');
const { EVENT_NAMES, EVENT_TYPES, OPTIONAL_EVENTS, STAGE_REQUIREMENTS, TIME_BASED_EVENTS } = require('./event-config');
const { parseJSON, hasPowerData } = require('./json-parser');

// Import narrative system modules
const { NARRATIVE_DATABASE } = require('./narrative-database.js');
const { StorySelector } = require('./story-selector.js');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize narrative story selector
const narrativeSelector = new StorySelector();
narrativeSelector.initialize(NARRATIVE_DATABASE);
console.log('📖 Narrative system initialized');

// Event maximum points lookup (from Career Mode spreadsheet)
const EVENT_MAX_POINTS = {
  1: 65,   // Coast and Roast Crit
  2: 95,   // Island Classic
  3: 50,   // The Forest Velodrome Elimination
  4: 50,   // Coastal Loop Time Challenge
  5: 80,   // North Lake Points Race
  6: 50,   // Easy Hill Climb
  7: 70,   // Flat Eight Criterium
  8: 185,  // The Grand Gilbert Fondo
  9: 85,   // Base Camp Classic
  10: 70,  // Beach and Pine TT
  11: 60,  // South Lake Points Race
  12: 145, // Unbound - Little Egypt
  13: 120, // Local Tour Stage 1
  14: 95,  // Local Tour Stage 2
  15: 135, // Local Tour Stage 3
  102: 40  // The Leveller
};

/**
 * Check if an event is a special event (not part of regular season progression)
 */
function isSpecialEvent(eventNumber) {
  return eventNumber > 100;
}

/**
 * Get next tour event to complete
 */
function getNextTourEvent(tourProgress = {}) {
  if (!tourProgress.event13Completed) return 13;
  if (!tourProgress.event14Completed) return 14;
  if (!tourProgress.event15Completed) return 15;
  return null;
}

/**
 * Check if an event is valid for a given stage
 */
function isEventValidForStage(eventNumber, currentStage, usedOptionalEvents = [], tourProgress = {}) {
  if (isSpecialEvent(eventNumber)) {
    return { valid: true, isSpecialEvent: true };
  }

  const stageReq = STAGE_REQUIREMENTS[currentStage];
  if (!stageReq) {
    return { valid: false, reason: `Invalid stage: ${currentStage}` };
  }

  if (stageReq.type === 'fixed') {
    if (eventNumber === stageReq.eventId) {
      return { valid: true };
    }
    return { valid: false, reason: `Stage ${currentStage} requires event ${stageReq.eventId}` };
  }

  if (stageReq.type === 'choice') {
    if (!stageReq.eventIds.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} is not valid for stage ${currentStage}` };
    }
    if (usedOptionalEvents.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} already used` };
    }
    return { valid: true };
  }

  if (stageReq.type === 'tour') {
    if (!stageReq.eventIds.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} is not part of the Local Tour` };
    }
    const nextExpected = getNextTourEvent(tourProgress);
    if (nextExpected === null) {
      return { valid: false, reason: 'Local Tour already completed' };
    }
    if (eventNumber !== nextExpected) {
      return { valid: false, reason: `Expected event ${nextExpected} next in tour` };
    }
    return { valid: true, isTour: true };
  }

  return { valid: false, reason: 'Unknown stage type' };
}

/**
 * Calculate points based on finishing position
 */
function calculatePoints(position, eventNumber, predictedPosition) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber];

  if (!maxPoints) {
    console.warn(`No max points defined for event ${eventNumber}, using 100`);
    return { points: Math.max(0, 100 - (position - 1) * 2), bonusPoints: 0 };
  }

  // Event 3 special case: elimination race
  if (eventNumber === 3) {
    if (position > 20) return { points: 0, bonusPoints: 0 };
    const basePoints = 45 - (position - 1) * (35 / 19);
    let podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;
    let bonusPoints = calculatePredictionBonus(position, predictedPosition);
    return { points: Math.round(basePoints + podiumBonus + bonusPoints), bonusPoints };
  }

  if (position > 40) return { points: 0, bonusPoints: 0 };

  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  let podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;
  let bonusPoints = calculatePredictionBonus(position, predictedPosition);

  return { points: Math.round(basePoints + podiumBonus + bonusPoints), bonusPoints };
}

function calculatePredictionBonus(position, predictedPosition) {
  if (!predictedPosition) return 0;
  const placesBeaten = predictedPosition - position;
  if (placesBeaten >= 9) return 5;
  if (placesBeaten >= 7) return 4;
  if (placesBeaten >= 5) return 3;
  if (placesBeaten >= 3) return 2;
  if (placesBeaten >= 1) return 1;
  return 0;
}

/**
 * Calculate predicted position based on EventRating
 */
function calculatePredictedPosition(results, userUid) {
  const finishers = results.filter(r =>
    r.Position !== 'DNF' && r.EventRating && !isNaN(parseInt(r.EventRating))
  );
  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  const predictedIndex = finishers.findIndex(r => r.UID === userUid);
  return predictedIndex === -1 ? null : predictedIndex + 1;
}

/**
 * Check if user earned Giant Killer medal
 * Giant Killer: User finishes ahead of the rider with the highest EventRating
 */
function checkGiantKiller(results, userUid) {
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF') {
    console.log(`   Giant Killer: User ${userUid} not eligible (DNF or not found)`);
    return false;
  }
  if (userResult.EventRating === undefined || userResult.EventRating === null) {
    console.log(`   Giant Killer: User ${userUid} has no EventRating`);
    return false;
  }

  const userPosition = parseInt(userResult.Position);
  if (isNaN(userPosition)) return false;

  // Filter to finishers with valid EventRating (including 0)
  const finishers = results.filter(r =>
    r.Position !== 'DNF' &&
    r.EventRating !== undefined &&
    r.EventRating !== null &&
    !isNaN(parseInt(r.EventRating))
  );
  if (finishers.length === 0) {
    console.log(`   Giant Killer: No finishers with EventRating found`);
    return false;
  }

  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  const giant = finishers[0];

  console.log(`   Giant Killer check: User pos=${userPosition} (ER=${userResult.EventRating}), Giant=${giant.Name} (ER=${giant.EventRating}, pos=${giant.Position})`);

  if (giant.UID === userUid) {
    console.log(`   Giant Killer: User IS the giant (highest rated), not eligible`);
    return false;
  }

  const giantPosition = parseInt(giant.Position);
  const earned = userPosition < giantPosition;
  console.log(`   Giant Killer result: ${earned ? 'EARNED' : 'not earned'} (user pos ${userPosition} ${earned ? '<' : '>='} giant pos ${giantPosition})`);

  return earned;
}

/**
 * Determine event category based on event type
 */
function getEventCategory(eventType) {
  if (eventType === 'criterium') return 'criterium';
  if (eventType === 'time trial') return 'time trial';
  if (eventType === 'track elimination' || eventType === 'points race') return 'track';
  if (eventType === 'hill climb') return 'climbing';
  if (eventType === 'gravel race') return 'gravel';
  return 'road';
}

/**
 * Check if UID is a bot
 */
function isBot(uid, gender) {
  return gender === 'Bot' || !!(uid && uid.startsWith && uid.startsWith('Bot'));
}

/**
 * Calculate next stage after completing current stage
 */
function calculateNextStage(currentStage, tourProgress = {}) {
  if (currentStage < 9) return currentStage + 1;
  if (currentStage === 9) {
    if (tourProgress.event13Completed && tourProgress.event14Completed && tourProgress.event15Completed) {
      return 9; // Season complete
    }
    return 9;
  }
  return currentStage;
}

// ================== PERSONALITY RECOVERY ==================

/**
 * Recover personality from interview history if missing from user document.
 * This handles cases where user data was reset but interview records remain.
 */
async function recoverPersonalityIfNeeded(userId, userData, userRef) {
  // If personality exists, return it
  if (userData.personality) {
    return userData.personality;
  }

  console.log(`   ⚠️ Personality missing for user ${userId}, checking interview history...`);

  // Check if user has interview history
  const interviewHistory = userData.interviewHistory;
  if (!interviewHistory || !interviewHistory.totalInterviews || interviewHistory.totalInterviews === 0) {
    console.log(`   ℹ️ No interview history found, using default personality`);
    return null;
  }

  // Try to recover from interview documents
  const lastEventNum = interviewHistory.lastInterviewEventNumber;
  if (!lastEventNum) {
    console.log(`   ⚠️ Interview history exists but no lastInterviewEventNumber`);
    return null;
  }

  try {
    // Query interviews for this user
    // This gets the most recently completed event's interview, not highest event number
    // Note: We fetch all and sort client-side to avoid needing a compound index
    const interviewsSnapshot = await db.collection('interviews')
      .where('userId', '==', userId)
      .get();

    if (interviewsSnapshot.empty) {
      console.log(`   ⚠️ No interview documents found for user ${userId}`);
      return null;
    }

    // Sort by timestamp descending (most recent first) and get the latest
    const sortedDocs = interviewsSnapshot.docs.sort((a, b) => {
      const aTime = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
      const bTime = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
      return bTime - aTime; // Descending
    });

    const latestInterview = sortedDocs[0].data();
    if (latestInterview.personalityAfter) {
      console.log(`   ✅ RECOVERED personality from interview for event ${latestInterview.eventNumber}`);

      // Update user document with recovered personality
      await userRef.update({
        personality: latestInterview.personalityAfter
      });
      console.log(`   ✅ Saved recovered personality to user document`);

      return latestInterview.personalityAfter;
    }
  } catch (error) {
    console.error(`   ❌ Error recovering personality:`, error.message);
  }

  return null;
}

// ================== UNLOCK SYSTEM ==================

/**
 * Evaluate whether a given unlock should trigger for this event
 * Returns { triggered: boolean, reason: string }
 */
function evaluateUnlockTrigger(unlockId, context) {
  const { position, predictedPosition, marginToWinner, gapToWinner, eventCategory, eventNumber, totalFinishers, userARR, results, topRivals, rivalEncounters } = context;

  // Time-based conditions are not valid for elimination races (Event 3) or time challenges (Event 4)
  const isTimeIrrelevant = eventNumber === 3 || TIME_BASED_EVENTS.includes(eventNumber);

  switch (unlockId) {
    case 'paceNotes':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: Math.abs(predictedPosition - position) <= 5,
        reason: 'Finished within +/-5 places of prediction'
      };
    case 'teamCarRecon':
      // For time-irrelevant races, only use position-based trigger
      if (isTimeIrrelevant) {
        return {
          triggered: position <= 10,
          reason: 'Top 10 finish'
        };
      }
      return {
        triggered: position <= 10 || (typeof marginToWinner === 'number' && marginToWinner < 45),
        reason: 'Top 10 or close gap to winner'
      };
    case 'sprintPrimer':
      return {
        triggered: position <= 8,
        reason: 'Strong sprint/segment or top 8 finish'
      };
    case 'aeroWheels':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: (predictedPosition - position >= 5) && position <= 15,
        reason: 'Beat prediction by 5+ and finish top 15'
      };
    case 'cadenceNutrition':
      // Time-based only - doesn't trigger for time-irrelevant races
      if (isTimeIrrelevant) {
        return { triggered: false, reason: 'Time gaps not applicable for this race type' };
      }
      return {
        triggered: typeof gapToWinner === 'number' && gapToWinner <= 20,
        reason: 'Within 20s of winner'
      };
    case 'soigneurSession':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: predictedPosition <= 5 && position <= 5,
        reason: 'Predicted and finished top 5'
      };
    case 'preRaceMassage':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: predictedPosition <= 10 && position <= 3,
        reason: 'Predicted top 10 and podium'
      };
    case 'climbingGears':
      return {
        triggered: eventCategory === 'climbing' && position <= 5,
        reason: 'Climbing day top 5'
      };
    case 'aggroRaceKit':
      // For time-irrelevant races, only use position-based trigger
      if (isTimeIrrelevant) {
        return {
          triggered: position <= 5,
          reason: 'Top 5 finish'
        };
      }
      return {
        triggered: position <= 5 || (position <= 10 && typeof marginToWinner === 'number' && marginToWinner < 20),
        reason: 'Top 5, or top 10 within 20s'
      };
    case 'tightPackWin': {
      // Time-based only - doesn't trigger for time-irrelevant races
      if (isTimeIrrelevant) {
        return { triggered: false, reason: 'Time gaps not applicable for this race type' };
      }
      const top10 = (results || []).slice(0, 10).map(r => parseFloat(r.Time)).filter(t => !isNaN(t));
      const tight = top10.length === 10 && (Math.max(...top10) - Math.min(...top10)) <= 5;
      return {
        triggered: position === 1 && tight,
        reason: 'Won in a tight 5s top-10 finish'
      };
    }
    case 'domestiqueHelp': {
      const higherARRRider = results.find(r => r.arr > userARR && r.position > position);
      return {
        triggered: Boolean(higherARRRider) && position <= 5,
        reason: 'Beat highest ARR rider and top 5'
      };
    }
    case 'recoveryBoots':
      return {
        triggered: eventNumber >= 13 && eventNumber <= 15 && position <= 5,
        reason: 'Tour stage top 5'
      };
    case 'directorsTablet':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: (predictedPosition - position >= 8) || (predictedPosition >= 10 && position <= 3),
        reason: 'Big beat vs prediction or podium from deep prediction'
      };
    case 'beatPredictionByAny':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: predictedPosition - position > 0,
        reason: 'Beat prediction'
      };
    case 'winSprint':
      return {
        triggered: position === 1,
        reason: 'Won the race'
      };
    case 'finishTop10':
      return {
        triggered: position <= 10,
        reason: 'Finished in top 10'
      };
    case 'completeRace':
      return {
        triggered: position !== 'DNF' && typeof position === 'number',
        reason: 'Completed the race'
      };
    case 'podiumFinish':
      return {
        triggered: position <= 3,
        reason: 'Podium finish'
      };
    case 'winOrBeatBy5':
      if (!predictedPosition) {
        return {
          triggered: position === 1,
          reason: 'Won the race'
        };
      }
      return {
        triggered: position === 1 || (predictedPosition - position >= 5),
        reason: 'Win or aggressive beat of prediction'
      };
    case 'top15Finish':
      return {
        triggered: position <= 15,
        reason: 'Consistent top 15 finish'
      };
    case 'withinPrediction':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: Math.abs(predictedPosition - position) <= 3,
        reason: 'Finished within 3 places of prediction'
      };
    case 'win':
      return {
        triggered: position === 1,
        reason: 'Won the race'
      };
    case 'beatPrediction3':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: predictedPosition - position >= 3,
        reason: 'Beat prediction by 3+'
      };
    case 'top10':
      return {
        triggered: position <= 10,
        reason: 'Finished top 10'
      };
    case 'beatTopRival': {
      if (!topRivals || topRivals.length === 0 || !results) {
        return { triggered: false };
      }
      const top3RivalUids = topRivals.slice(0, 3).map(r => r.botUid);
      const beatRival = results.find(r => {
        return top3RivalUids.includes(r.uid) && r.position > position;
      });
      if (beatRival) {
        const rivalName = beatRival.name || 'rival';
        return {
          triggered: true,
          reason: `Beat top rival ${rivalName}`
        };
      }
      return { triggered: false };
    }
    default:
      return { triggered: false };
  }
}

/**
 * Determine which unlocks to trigger (all that meet conditions) based on equipped and cooldowns
 */
function selectUnlocksToApply(equippedIds, cooldowns, context) {
  const triggered = [];

  for (const id of equippedIds) {
    const unlock = getUnlockById(id);
    if (!unlock) continue;

    // Simple boolean cooldown: skip if resting (triggered last race)
    if (cooldowns && cooldowns[id] === true) {
      continue;
    }

    // Check personality requirements (if defined)
    if (unlock.requiredPersonality) {
      let meetsRequirement = true;
      for (const [trait, required] of Object.entries(unlock.requiredPersonality)) {
        const userTraitValue = context.personality?.[trait] || 0;
        if (userTraitValue < required) {
          meetsRequirement = false;
          break;
        }
      }
      if (!meetsRequirement) {
        continue; // Skip this unlock if personality requirement not met
      }
    }

    // Check balanced personality requirement (all traits 45-65)
    if (unlock.requiredBalanced) {
      if (!context.personality) {
        continue; // Can't check balance without personality data
      }
      const traitValues = Object.values(context.personality);
      const isBalanced = traitValues.length > 0 && traitValues.every(v => v >= 45 && v <= 65);
      if (!isBalanced) {
        continue; // Skip if not balanced
      }
    }

    const result = evaluateUnlockTrigger(id, context);
    if (result.triggered) {
      triggered.push({
        unlock,
        reason: result.reason || unlock.description
      });
    }
  }

  // Apply at most two highest-value unlocks
  return triggered
    .sort((a, b) => (b.unlock.pointsBonus || 0) - (a.unlock.pointsBonus || 0))
    .slice(0, 2);
}

// ================== STORY GENERATION HELPERS ==================

/**
 * Get list of completed optional events for story generation
 */
function getCompletedOptionalEvents(userData, currentEventNumber) {
  const OPTIONAL_EVENT_LIST = [6, 7, 8, 9, 10, 11, 12];
  const completedOptionals = [];

  for (const eventNum of OPTIONAL_EVENT_LIST) {
    if (userData[`event${eventNum}Results`]) {
      completedOptionals.push(eventNum);
    }
  }

  // Don't count current event as completed yet
  const currentEventIndex = completedOptionals.indexOf(currentEventNumber);
  if (currentEventIndex !== -1) {
    completedOptionals.splice(currentEventIndex, 1);
  }

  return completedOptionals;
}

/**
 * Get next event number based on next stage
 */
function getNextEventNumber(nextStage, tourProgress = {}) {
  const STAGE_TO_EVENT_MAP = {
    1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 13
  };

  if (STAGE_TO_EVENT_MAP[nextStage]) {
    return STAGE_TO_EVENT_MAP[nextStage];
  }

  // For choice stages (3, 6, 8), return next stage number as placeholder
  return nextStage;
}

// ================== CAREER STATISTICS ==================

/**
 * Calculate career statistics from all event results
 */
async function calculateCareerStats(userData) {
  const stats = {
    totalRaces: 0,
    totalWins: 0,
    totalPodiums: 0,
    totalTop10s: 0,
    bestFinish: null,
    positions: [],
    awards: {
      gold: 0,
      silver: 0,
      bronze: 0,
      punchingMedal: 0,
      giantKiller: 0,
      bullseye: 0,
      hotStreak: 0,
      domination: 0,
      closeCall: 0,
      photoFinish: 0,
      darkHorse: 0,
      zeroToHero: 0,
      gcGold: 0,
      gcSilver: 0,
      gcBronze: 0,
      lanternRouge: 0
    }
  };

  // Iterate through all possible events
  for (let eventNum = 1; eventNum <= 15; eventNum++) {
    const eventResults = userData[`event${eventNum}Results`];

    if (eventResults && eventResults.position && eventResults.position !== 'DNF') {
      const position = eventResults.position;

      // Count races
      stats.totalRaces++;

      // Track positions for average calculation
      stats.positions.push(position);

      // Count wins and podiums
      if (position === 1) {
        stats.totalWins++;
        stats.awards.gold++;
      }
      if (position === 2) {
        stats.awards.silver++;
      }
      if (position === 3) {
        stats.awards.bronze++;
      }
      if (position <= 3) {
        stats.totalPodiums++;
      }

      // Count top 10s
      if (position <= 10) {
        stats.totalTop10s++;
      }

      // Track best finish
      if (stats.bestFinish === null || position < stats.bestFinish) {
        stats.bestFinish = position;
      }

      // Count special awards
      if (eventResults.earnedPunchingMedal) {
        stats.awards.punchingMedal++;
      }
      if (eventResults.earnedGiantKillerMedal) {
        stats.awards.giantKiller++;
      }
      if (eventResults.earnedBullseyeMedal) {
        stats.awards.bullseye++;
      }
      if (eventResults.earnedHotStreakMedal) {
        stats.awards.hotStreak++;
      }
      if (eventResults.earnedDomination) {
        stats.awards.domination++;
      }
      if (eventResults.earnedCloseCall) {
        stats.awards.closeCall++;
      }
      if (eventResults.earnedPhotoFinish) {
        stats.awards.photoFinish++;
      }
      if (eventResults.earnedDarkHorse) {
        stats.awards.darkHorse++;
      }
      if (eventResults.earnedZeroToHero) {
        stats.awards.zeroToHero++;
      }
      if (eventResults.earnedGCGoldMedal) {
        stats.awards.gcGold++;
      }
      if (eventResults.earnedGCSilverMedal) {
        stats.awards.gcSilver++;
      }
      if (eventResults.earnedGCBronzeMedal) {
        stats.awards.gcBronze++;
      }
    }
  }

  // Calculate derived stats
  if (stats.totalRaces > 0) {
    // Average finish position
    const totalPositions = stats.positions.reduce((sum, pos) => sum + pos, 0);
    stats.averageFinish = parseFloat((totalPositions / stats.totalRaces).toFixed(1));

    // Win rate (percentage)
    stats.winRate = parseFloat(((stats.totalWins / stats.totalRaces) * 100).toFixed(1));

    // Podium rate (percentage)
    stats.podiumRate = parseFloat(((stats.totalPodiums / stats.totalRaces) * 100).toFixed(1));
  } else {
    stats.averageFinish = null;
    stats.winRate = 0;
    stats.podiumRate = 0;
  }

  return stats;
}

// ================== SEASON STANDINGS HELPERS ==================

/**
 * Deterministic random number generator using bot UID and event as seed
 */
function getSeededRandom(botName, eventNumber) {
  let hash = 0;
  const seed = `${botName}-${eventNumber}`;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(Math.abs(hash)) * 10000;
  return x - Math.floor(x);
}

/**
 * Simulate a race position for a bot based on their ARR/rating
 */
function simulatePosition(botName, arr, eventNumber, fieldSize = 50) {
  let expectedPosition;
  if (arr >= 1400) {
    expectedPosition = 5;
  } else if (arr >= 1200) {
    expectedPosition = 12;
  } else if (arr >= 1000) {
    expectedPosition = 20;
  } else if (arr >= 800) {
    expectedPosition = 30;
  } else {
    expectedPosition = 40;
  }

  const randomOffset = Math.floor(getSeededRandom(botName, eventNumber) * 20) - 10;
  let simulatedPosition = expectedPosition + randomOffset;
  simulatedPosition = Math.max(1, Math.min(fieldSize, simulatedPosition));

  return simulatedPosition;
}

/**
 * Fetch all results from events 1 through currentEvent
 */
async function getAllPreviousEventResults(season, currentEvent, userUid) {
  const allEventResults = {};

  for (let eventNum = 1; eventNum <= currentEvent; eventNum++) {
    try {
      const docRef = db.collection('results').doc(`season${season}_event${eventNum}_${userUid}`);
      const docSnapshot = await docRef.get();

      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        if (data.results && Array.isArray(data.results)) {
          allEventResults[eventNum] = data.results;
        }
      }
    } catch (error) {
      console.log(`   Warning: Could not fetch results for event ${eventNum}:`, error.message);
    }
  }

  return allEventResults;
}

/**
 * Build season standings including all racers
 * Includes simulated results for bots to keep standings competitive
 */
async function buildSeasonStandings(results, userData, eventNumber, currentUid, userActualPoints) {
  const season = 1;
  const existingStandings = userData[`season${season}Standings`] || [];

  // Get list of events the user has actually completed
  const completedEventNumbers = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`]) {
      completedEventNumbers.push(i);
    }
  }
  if (!completedEventNumbers.includes(eventNumber)) {
    completedEventNumbers.push(eventNumber);
  }
  completedEventNumbers.sort((a, b) => a - b);

  console.log(`   User has completed events: [${completedEventNumbers.join(', ')}]`);

  // Calculate user's correct total points from stored event results
  let userCorrectPreviousPoints = 0;
  for (let i = 1; i <= 15; i++) {
    if (i === eventNumber) continue;
    const eventResults = userData[`event${i}Results`];
    if (eventResults && typeof eventResults.points === 'number') {
      userCorrectPreviousPoints += eventResults.points;
    }
  }
  console.log(`   User's correct points from previous events: ${userCorrectPreviousPoints}`);

  // Create a map of existing racers
  const standingsMap = new Map();
  existingStandings.forEach(racer => {
    if (typeof racer.points === 'string' && racer.points.includes('[object Object]')) {
      const numericPart = racer.points.replace(/\[object Object\]/g, '');
      racer.points = parseInt(numericPart) || 0;
    } else if (typeof racer.points === 'object') {
      racer.points = racer.points.points || 0;
    }
    racer.points = Number(racer.points) || 0;
    if (racer.uid === undefined) {
      racer.uid = null;
    }
    standingsMap.set(racer.uid || racer.name, racer);
  });

  // Process all racers from CURRENT event results
  results.forEach(result => {
    const uid = result.UID || null;
    const name = result.Name;
    const position = parseInt(result.Position);

    if (result.Position === 'DNF' || isNaN(position)) {
      return;
    }

    const pointsResult = calculatePoints(position, eventNumber);
    let points = pointsResult.points;
    const arr = parseInt(result.ARR) || 0;
    const team = result.Team || '';
    const isBotRacer = isBot(uid, result.Gender);
    const isCurrentUserResult = uid === currentUid;

    if (isCurrentUserResult && userActualPoints !== undefined) {
      points = userActualPoints;
      console.log(`   Using user's actual points for current event (including bonus): ${points}`);
    }

    const key = isBotRacer ? name : uid;

    if (standingsMap.has(key)) {
      const racer = standingsMap.get(key);
      if (isCurrentUserResult) {
        racer.points = userCorrectPreviousPoints + points;
        racer.events = completedEventNumbers.length;
      } else {
        racer.points = (racer.points || 0) + points;
        racer.events = (racer.events || 0) + 1;
      }
      racer.arr = arr;
      racer.team = team || racer.team;
      if (!racer.uid) {
        racer.uid = uid;
      }
    } else {
      let totalPoints = points;
      let eventCount = 1;
      if (isCurrentUserResult) {
        totalPoints = userCorrectPreviousPoints + points;
        eventCount = completedEventNumbers.length;
      }
      standingsMap.set(key, {
        name: name,
        uid: uid,
        arr: arr,
        team: team,
        events: eventCount,
        points: totalPoints,
        isBot: isBotRacer,
        isCurrentUser: isCurrentUserResult
      });
    }
  });

  // Backfill bots with simulated results
  console.log('   Backfilling bot results...');
  const allEventResults = await getAllPreviousEventResults(season, eventNumber, currentUid);
  allEventResults[eventNumber] = results;

  const allBots = new Map();

  for (const [eventNum, eventResults] of Object.entries(allEventResults)) {
    eventResults.forEach(result => {
      const isBotRacer = isBot(result.UID || result.uid, result.Gender);
      if (isBotRacer && result.Position !== 'DNF' && result.position !== 'DNF') {
        const botName = result.Name || result.name;
        const botUid = result.UID || result.uid;
        const arr = parseInt(result.ARR || result.arr) || 900;

        if (!allBots.has(botName)) {
          allBots.set(botName, {
            name: botName,
            uid: botUid,
            arr: arr,
            actualEvents: new Set()
          });
        }
        allBots.get(botName).actualEvents.add(parseInt(eventNum));
        allBots.get(botName).arr = arr;
        allBots.get(botName).uid = botUid;
      }
    });
  }

  console.log(`   Found ${allBots.size} unique bots across all events`);

  for (const [botName, botInfo] of allBots.entries()) {
    if (!standingsMap.has(botName)) {
      standingsMap.set(botName, {
        name: botName,
        uid: botInfo.uid || null,
        arr: botInfo.arr,
        team: '',
        events: 0,
        points: 0,
        isBot: true,
        isCurrentUser: false
      });
    }

    const botStanding = standingsMap.get(botName);
    if (!botStanding.uid && botInfo.uid) {
      botStanding.uid = botInfo.uid;
    }

    botStanding.points = 0;
    let simulatedEvents = 0;

    for (const eventNum of completedEventNumbers) {
      if (botInfo.actualEvents.has(eventNum)) {
        const eventResults = allEventResults[eventNum] || [];
        const botResult = eventResults.find(r => (r.Name || r.name) === botName);
        if (botResult) {
          const position = parseInt(botResult.Position || botResult.position);
          if (!isNaN(position) && (botResult.Position !== 'DNF' && botResult.position !== 'DNF')) {
            const pointsResult = calculatePoints(position, eventNum);
            botStanding.points += pointsResult.points;
          }
        }
      } else {
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNum);
        const points = calculatePoints(simulatedPosition, eventNum).points;
        botStanding.points += points;
        simulatedEvents++;
      }
    }

    botStanding.events = completedEventNumbers.length;
    botStanding.simulatedEvents = simulatedEvents;
  }

  // Ensure all bots have correct events count
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      racer.events = completedEventNumbers.length;
    }
  }

  console.log(`   Simulated results for ${allBots.size} bots`);

  // Convert to array and sort
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => b.points - a.points);

  // Limit to 80 bots, stratified by points
  const MAX_BOTS = 80;
  const QUINTILES = 5;
  const BOTS_PER_QUINTILE = MAX_BOTS / QUINTILES;

  const humans = standings.filter(r => !r.isBot);
  const bots = standings.filter(r => r.isBot);

  let finalStandings;

  if (bots.length <= MAX_BOTS) {
    finalStandings = standings;
  } else {
    console.log(`   Limiting bots from ${bots.length} to ${MAX_BOTS}`);
    const quintileSize = Math.ceil(bots.length / QUINTILES);
    const selectedBots = [];

    for (let q = 0; q < QUINTILES; q++) {
      const start = q * quintileSize;
      const end = Math.min(start + quintileSize, bots.length);
      const quintileBots = bots.slice(start, end);
      const selected = quintileBots.slice(0, BOTS_PER_QUINTILE);
      selectedBots.push(...selected);
    }

    finalStandings = [...humans, ...selectedBots];
    finalStandings.sort((a, b) => b.points - a.points);
  }

  // Final sanitization for Firestore
  finalStandings.forEach(racer => {
    if (racer.uid === undefined) racer.uid = null;
    if (racer.name === undefined) racer.name = null;
    if (racer.team === undefined) racer.team = '';
    if (racer.arr === undefined) racer.arr = 0;
    if (racer.points === undefined) racer.points = 0;
    if (racer.events === undefined) racer.events = 0;
  });

  return finalStandings;
}

/**
 * Check if season is complete and mark it, award season podium trophies
 */
async function checkAndMarkSeasonComplete(userRef, userData, eventNumber, recentUpdates, seasonStandings) {
  const earnedSeasonAwards = [];
  const currentData = { ...userData, ...recentUpdates };

  console.log(`\n🔍 Checking season completion for event ${eventNumber}...`);

  // Season 1 is complete when:
  // 1. Event 15 is completed with results
  // 2. OR Event 14 or 15 are marked as DNS
  const event15Complete = currentData.event15Results &&
                         currentData.event15Results.position &&
                         currentData.event15Results.position !== 'DNF';
  const event14DNS = currentData.event14DNS === true;
  const event15DNS = currentData.event15DNS === true;
  const isSeasonComplete = event15Complete || event14DNS || event15DNS;

  // If season is already marked complete, skip
  if (currentData.season1Complete === true) {
    console.log('   Season already marked complete, skipping trophy awards');
    return earnedSeasonAwards;
  }

  // If season is not yet complete, skip
  if (!isSeasonComplete) {
    console.log('   Season not yet complete');
    return earnedSeasonAwards;
  }

  console.log('🏆 Season 1 is now COMPLETE for this user!');

  // Get user's season rank from the season standings
  const userRank = seasonStandings.findIndex(r => r.uid === userData.uid) + 1;

  if (userRank === 0 || userRank > seasonStandings.length) {
    console.log('   User not found in season standings');
  } else {
    console.log(`   User's season rank: ${userRank} out of ${seasonStandings.length}`);
  }

  // Prepare season completion updates
  const seasonUpdates = {
    season1Complete: true,
    season1CompletionDate: admin.firestore.FieldValue.serverTimestamp(),
    season1Rank: userRank,
    localTourStatus: event14DNS || event15DNS ? 'dnf' : 'completed',
    currentSeason: 1
  };

  // Award season podium trophies
  if (userRank === 1) {
    console.log('   🏆 SEASON CHAMPION! Awarding Season Champion trophy');
    seasonUpdates['awards.seasonChampion'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'seasonChampion', category: 'season', intensity: 'ultraFlashy' });
  } else if (userRank === 2) {
    console.log('   🥈 SEASON RUNNER-UP! Awarding Season Runner-Up trophy');
    seasonUpdates['awards.seasonRunnerUp'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'seasonRunnerUp', category: 'season', intensity: 'ultraFlashy' });
  } else if (userRank === 3) {
    console.log('   🥉 SEASON THIRD PLACE! Awarding Season Third Place trophy');
    seasonUpdates['awards.seasonThirdPlace'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'seasonThirdPlace', category: 'season', intensity: 'ultraFlashy' });
  }

  // Check for special season achievement awards
  console.log('   Checking for special achievement awards...');

  // PERFECT SEASON - Win every event
  let isPerfectSeason = true;
  for (let i = 1; i <= 15; i++) {
    const eventResults = currentData[`event${i}Results`];
    if (!eventResults || eventResults.position !== 1) {
      isPerfectSeason = false;
      break;
    }
  }
  if (isPerfectSeason) {
    console.log('   💯 PERFECT SEASON! Won every single event!');
    seasonUpdates['awards.perfectSeason'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'perfectSeason', category: 'season', intensity: 'ultraFlashy' });
  }

  // SPECIALIST - Win 3+ events of the same type
  const eventTypeWins = {};
  for (let i = 1; i <= 15; i++) {
    const eventResults = currentData[`event${i}Results`];
    if (eventResults && eventResults.position === 1) {
      const eventType = EVENT_TYPES[i];
      eventTypeWins[eventType] = (eventTypeWins[eventType] || 0) + 1;
    }
  }

  const maxWinsInType = Math.max(...Object.values(eventTypeWins), 0);
  if (maxWinsInType >= 3) {
    const specialistType = Object.keys(eventTypeWins).find(t => eventTypeWins[t] === maxWinsInType);
    console.log(`   ⭐ SPECIALIST! Won ${maxWinsInType} ${specialistType} events`);
    seasonUpdates['awards.specialist'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'specialist', category: 'season', intensity: 'ultraFlashy' });
  }

  // ALL-ROUNDER - Win at least one event of 5+ different types
  const uniqueTypesWon = Object.keys(eventTypeWins).length;
  if (uniqueTypesWon >= 5) {
    console.log(`   🌟 ALL-ROUNDER! Won ${uniqueTypesWon} different event types`);
    seasonUpdates['awards.allRounder'] = admin.firestore.FieldValue.increment(1);
    earnedSeasonAwards.push({ awardId: 'allRounder', category: 'season', intensity: 'ultraFlashy' });
  }

  // Update user document with season completion
  await userRef.update(seasonUpdates);

  return earnedSeasonAwards;
}

/**
 * Update bot profile ARRs from race results
 */
async function updateBotARRs(season, event, results) {
  console.log('   Updating bot ARRs...');

  let botsFound = 0;
  let botsUpdated = 0;
  let botsNotFound = 0;

  for (const result of results) {
    const uid = result.UID;
    const arr = parseInt(result.ARR);

    if (!isBot(uid, result.Gender)) {
      continue;
    }

    if (!arr || isNaN(arr) || arr < 0) {
      continue;
    }

    botsFound++;

    try {
      const botProfileRef = db.collection('botProfiles').doc(uid);
      const botProfileDoc = await botProfileRef.get();

      if (!botProfileDoc.exists) {
        botsNotFound++;
        continue;
      }

      await botProfileRef.update({
        arr: arr,
        lastARRUpdate: admin.firestore.FieldValue.serverTimestamp(),
        lastEventId: `season${season}_event${event}`
      });

      botsUpdated++;
    } catch (error) {
      console.error(`   Error updating bot ${uid}:`, error.message);
    }
  }

  if (botsFound > 0) {
    console.log(`   Bot ARR updates: ${botsUpdated} updated, ${botsNotFound} profiles not found`);
  }
}

/**
 * Process pending bot profile requests from Firestore
 */
async function processBotProfileRequests() {
  try {
    console.log('\n📋 Checking for pending bot profile requests...');

    const requestsSnapshot = await db.collection('botProfileRequests')
      .where('processed', '==', false)
      .get();

    if (requestsSnapshot.empty) {
      console.log('   No pending bot profile requests');
      return;
    }

    console.log(`   Found ${requestsSnapshot.size} pending request(s)`);

    const requestsFilePath = path.join(__dirname, 'bot-profile-requests', 'requests.txt');
    const dirPath = path.dirname(requestsFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let appendedCount = 0;
    let deletedCount = 0;

    for (const doc of requestsSnapshot.docs) {
      const request = doc.data();

      const botProfileDoc = await db.collection('botProfiles').doc(request.botUid).get();

      if (botProfileDoc.exists) {
        console.log(`   Bot profile already exists for ${request.botName}, removing request...`);
        await db.collection('botProfileRequests').doc(doc.id).delete();
        deletedCount++;
        continue;
      }

      const timestamp = new Date(request.timestamp).toISOString().replace('T', ' ').split('.')[0] + ' UTC';
      const entry = `
================================================================================
Request submitted: ${timestamp}
Firestore Document ID: ${doc.id}
Submitted by User UID: ${request.userUid}
Bot UID: ${request.botUid}
Bot Name: ${request.botName}
Bot Team: ${request.botTeam || 'Independent'}
Bot ARR: ${request.botArr}
Bot Country: ${request.botCountry}
Interesting Fact: ${request.interestFact}
================================================================================
`;

      fs.appendFileSync(requestsFilePath, entry, 'utf8');

      await db.collection('botProfileRequests').doc(doc.id).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      appendedCount++;
      console.log(`   Processed request for ${request.botName} (${request.botUid})`);
    }

    console.log(`   Appended ${appendedCount} request(s) to ${requestsFilePath}`);
    if (deletedCount > 0) {
      console.log(`   Removed ${deletedCount} duplicate request(s)`);
    }

  } catch (error) {
    console.error('Error processing bot profile requests:', error);
  }
}

// ================== POWER AWARD CHECKS ==================

/**
 * Check if Power Surge award earned (max power 30%+ above avg, top 10)
 */
function checkPowerSurge(position, userResult) {
  if (position > 10) return false;
  if (!userResult.AvgPower || !userResult.MaxPower) return false;
  return (userResult.MaxPower / userResult.AvgPower) >= 1.3;
}

/**
 * Check if Steady Eddie award earned (NP within 1% of avg power)
 */
function checkSteadyEddie(userResult) {
  if (!userResult.AvgPower || !userResult.NrmPower) return false;
  const percentDiff = Math.abs(userResult.NrmPower - userResult.AvgPower) / userResult.AvgPower * 100;
  return percentDiff <= 1;
}

/**
 * Check if Blast Off award earned (1300W+ max power, one-time)
 */
function checkBlastOff(userResult, hasAlreadyEarned) {
  if (hasAlreadyEarned) return false;
  if (!userResult.MaxPower) return false;
  return userResult.MaxPower >= 1300;
}

// ================== POWER RECORDS TRACKING ==================

/**
 * Update power records after each event
 */
function updatePowerRecords(existingRecords, eventResults, eventNumber, distance) {
  const records = existingRecords || {};
  const eventName = EVENT_NAMES[eventNumber] || `Event ${eventNumber}`;
  const now = new Date().toISOString();

  // Max power ever
  if (eventResults.maxPower && (!records.maxPowerEver || eventResults.maxPower > records.maxPowerEver.value)) {
    records.maxPowerEver = { value: eventResults.maxPower, eventNumber, eventName, date: now };
  }

  // Best avg power (any race)
  if (eventResults.avgPower && (!records.bestAvgPower || eventResults.avgPower > records.bestAvgPower.value)) {
    records.bestAvgPower = { value: eventResults.avgPower, eventNumber, eventName, date: now };
  }

  // Best NP (any race)
  if (eventResults.nrmPower && (!records.bestNrmPower || eventResults.nrmPower > records.bestNrmPower.value)) {
    records.bestNrmPower = { value: eventResults.nrmPower, eventNumber, eventName, date: now };
  }

  // Distance-based records (20km+)
  if (distance >= 20000) {
    if (eventResults.avgPower && (!records.bestAvgPower20km || eventResults.avgPower > records.bestAvgPower20km.value)) {
      records.bestAvgPower20km = { value: eventResults.avgPower, eventNumber, eventName, distance, date: now };
    }
    if (eventResults.nrmPower && (!records.bestNrmPower20km || eventResults.nrmPower > records.bestNrmPower20km.value)) {
      records.bestNrmPower20km = { value: eventResults.nrmPower, eventNumber, eventName, distance, date: now };
    }
  }

  // Distance-based records (40km+)
  if (distance >= 40000) {
    if (eventResults.avgPower && (!records.bestAvgPower40km || eventResults.avgPower > records.bestAvgPower40km.value)) {
      records.bestAvgPower40km = { value: eventResults.avgPower, eventNumber, eventName, distance, date: now };
    }
    if (eventResults.nrmPower && (!records.bestNrmPower40km || eventResults.nrmPower > records.bestNrmPower40km.value)) {
      records.bestNrmPower40km = { value: eventResults.nrmPower, eventNumber, eventName, distance, date: now };
    }
  }

  return records;
}

// ================== RIVAL TRACKING ==================

/**
 * Calculate rival encounters for this race
 * Finds all bots within 30 seconds of user's time (or 500m for time challenges) and records the encounter
 * For Event 3 (elimination race), skip entirely as times are meaningless
 * For time-based events (e.g., Event 4), use distance-based detection since all riders finish at the same time
 */
function calculateRivalEncounters(results, userUid, userPosition, userTime, eventNumber, userDistance) {
  const encounters = [];

  // Skip for elimination race - times are meaningless
  if (eventNumber === 3) {
    return encounters;
  }

  // Find user's result
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF') {
    return encounters;
  }

  // For time-based events (e.g., Event 4), use distance-based rival detection
  if (TIME_BASED_EVENTS.includes(eventNumber)) {
    results.forEach(result => {
      const botUid = result.UID;
      const botPosition = parseInt(result.Position);
      const botDistance = parseFloat(result.Distance) || 0;

      // Skip if not a bot, DNF, or invalid data
      if (!isBot(botUid, result.Gender) || result.Position === 'DNF' || isNaN(botPosition)) {
        return;
      }

      // Calculate distance gap
      const distanceGap = Math.abs(userDistance - botDistance);

      // Only track if within 500 meters (reasonable gap for 20min effort)
      if (distanceGap <= 500) {
        encounters.push({
          botUid: botUid,
          botName: result.Name,
          botTeam: result.Team || '',
          botCountry: result.Country || '',
          botArr: parseInt(result.ARR) || 0,
          timeGap: null, // null indicates time gap is not meaningful for this event type
          distanceGap: distanceGap,
          userFinishedAhead: userPosition < botPosition,
          botPosition: botPosition,
          userPosition: userPosition
        });
      }
    });

    return encounters;
  }

  // Regular events - use time-based detection
  results.forEach(result => {
    const botUid = result.UID;
    const botTime = parseFloat(result.Time);
    const botPosition = parseInt(result.Position);
    const botDistance = parseFloat(result.Distance) || 0;

    // Skip if not a bot, DNF, or invalid data
    if (!isBot(botUid, result.Gender) || result.Position === 'DNF' || isNaN(botTime) || isNaN(botPosition)) {
      return;
    }

    // Calculate time gap
    const timeGap = Math.abs(userTime - botTime);

    // Only track if within 30 seconds
    if (timeGap <= 30) {
      encounters.push({
        botUid: botUid,
        botName: result.Name,
        botTeam: result.Team || '',
        botCountry: result.Country || '',
        botArr: parseInt(result.ARR) || 0,
        timeGap: timeGap,
        distanceGap: Math.abs(userDistance - botDistance),
        userFinishedAhead: userPosition < botPosition,
        botPosition: botPosition,
        userPosition: userPosition
      });
    }
  });

  return encounters;
}

/**
 * Update user's rival data with new encounters
 * Returns updated rivalData object
 */
function updateRivalData(existingRivalData, encounters, eventNumber) {
  // Initialize rivalData if not exists
  const rivalData = existingRivalData || {
    encounters: {},
    topRivals: []
  };

  // Ensure encounters object exists
  if (!rivalData.encounters) {
    rivalData.encounters = {};
  }

  // Update each encounter
  encounters.forEach(encounter => {
    const botUid = encounter.botUid;
    // timeGap is null for time-based events (e.g., time challenges) where time gaps are meaningless
    const hasValidTimeGap = encounter.timeGap !== null && encounter.timeGap !== undefined;

    // Initialize bot encounter data if doesn't exist (first encounter with this rival)
    if (!rivalData.encounters[botUid]) {
      rivalData.encounters[botUid] = {
        botName: encounter.botName,
        botTeam: encounter.botTeam,
        botCountry: encounter.botCountry,
        botArr: encounter.botArr,
        races: 1,  // This IS a race, so start at 1
        userWins: encounter.userFinishedAhead ? 1 : 0,
        botWins: encounter.userFinishedAhead ? 0 : 1,
        // Only set gap stats if we have a valid time gap (not a time-based event)
        totalGap: hasValidTimeGap ? encounter.timeGap : 0,
        avgGap: hasValidTimeGap ? encounter.timeGap : null,
        closestGap: hasValidTimeGap ? encounter.timeGap : null,
        racesWithTimeGap: hasValidTimeGap ? 1 : 0,  // Track how many races have valid time gaps
        lastRace: eventNumber
      };
    } else {
      // Entry already exists - check if this is a new race or reprocessing the same race
      const botData = rivalData.encounters[botUid];
      const isNewRace = botData.lastRace !== eventNumber;

      if (isNewRace) {
        // This is a new race with this rival - increment counters
        botData.races += 1;

        if (encounter.userFinishedAhead) {
          botData.userWins += 1;
        } else {
          botData.botWins += 1;
        }

        // Only update gap stats if we have a valid time gap
        if (hasValidTimeGap) {
          botData.totalGap = (botData.totalGap || 0) + encounter.timeGap;
          botData.racesWithTimeGap = (botData.racesWithTimeGap || 0) + 1;
        }
      } else if (hasValidTimeGap) {
        // Reprocessing same event with valid time gap - recalculate the gap for this race
        // Remove old contribution and add new one
        const racesWithGap = botData.racesWithTimeGap || botData.races;
        if (racesWithGap > 0) {
          const oldContribution = botData.totalGap / racesWithGap;
          botData.totalGap = botData.totalGap - oldContribution + encounter.timeGap;
        }
      }

      // Update derived stats only if we have races with valid time gaps
      const racesWithGap = botData.racesWithTimeGap || 0;
      if (racesWithGap > 0) {
        botData.avgGap = botData.totalGap / racesWithGap;
        if (hasValidTimeGap) {
          botData.closestGap = botData.closestGap !== null
            ? Math.min(botData.closestGap, encounter.timeGap)
            : encounter.timeGap;
        }
      }

      botData.lastRace = eventNumber;

      // Update bot info (in case it changed)
      botData.botName = encounter.botName;
      botData.botTeam = encounter.botTeam;
      botData.botCountry = encounter.botCountry;
      botData.botArr = encounter.botArr;
    }
  });

  return rivalData;
}

/**
 * Identify top 10 rivals based on rivalry score
 * Rivalry score considers:
 * - Number of races (weighted with power function for repeated encounters)
 * - Average time gap (closer = better)
 * - Head-to-head competitiveness (50-50 win ratio = stronger rivalry)
 * Higher score = closer racing more often with competitive results = bigger rival
 *
 * Note: Rivals must have at least one race with valid time gap data to be scored.
 * Encounters from time-based events (where avgGap is null) don't contribute to scoring.
 */
function identifyTopRivals(rivalData) {
  if (!rivalData || !rivalData.encounters) {
    return [];
  }

  // Calculate rivalry score for each bot
  const rivalScores = Object.keys(rivalData.encounters).map(botUid => {
    const data = rivalData.encounters[botUid];

    // Skip rivals that have no valid time gap data (only encountered in time-based events)
    // avgGap will be null if all encounters were from time-based events
    if (data.avgGap === null || data.avgGap === undefined) {
      return {
        botUid: botUid,
        score: 0,  // No score for rivals without time gap data
        races: data.races
      };
    }

    // Base score: more races (weighted heavily) and closer gaps = higher
    // Using races^1.5 to strongly favor repeated encounters
    const baseScore = Math.pow(data.races, 1.5) / (data.avgGap + 1);

    // Competitiveness bonus: closer head-to-head record = stronger rivalry
    // winRatio of 0.5 = perfectly competitive, 0 or 1 = one-sided
    const winRatio = data.userWins / data.races;
    const competitiveness = 1 - Math.abs(winRatio - 0.5) * 2; // 0 to 1 scale

    // Apply competitiveness as a bonus multiplier (1x to 1.5x)
    // A 50-50 rivalry gets 50% bonus, one-sided rivalry gets no bonus
    const competitivenessMultiplier = 1 + competitiveness * 0.5;

    const rivalryScore = baseScore * competitivenessMultiplier;

    return {
      botUid: botUid,
      score: rivalryScore,
      races: data.races
    };
  });

  // Sort by rivalry score (descending) and return top 10 UIDs
  // Filter out zero-score rivals (those with only time-based encounters)
  const topRivals = rivalScores
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(r => r.botUid);

  return topRivals;
}

// ================== LIFETIME STATS ==================

// Event metadata for distance and climbing calculations
const EVENT_METADATA = {
  1: { distance: 14.9, climbing: 123 },
  2: { distance: 30.5, climbing: 156 },
  3: { distance: 8.0, climbing: 0 },  // Track elimination - indoor velodrome
  4: { distance: 0, climbing: 0 },    // Time challenge - distance varies per rider
  5: { distance: 8.0, climbing: 0 },  // Points race - indoor velodrome
  6: { distance: 5.7, climbing: 127 },
  7: { distance: 16.9, climbing: 202 },
  8: { distance: 92.3, climbing: 1054 },
  9: { distance: 18.0, climbing: 339 },
  10: { distance: 17.1, climbing: 180 },
  11: { distance: 8.0, climbing: 0 },  // Points race - indoor velodrome
  12: { distance: 38.0, climbing: 493 },
  13: { distance: 35.2, climbing: 174 },
  14: { distance: 27.3, climbing: 169 },
  15: { distance: 28.1, climbing: 471 },
  101: { distance: 14.9, climbing: 0 },  // Singapore Criterium
  102: { distance: 8.0, climbing: 0 }    // The Leveller
};

/**
 * Calculate biggest giant beaten
 */
function calculateBiggestGiant(results, userUid, userPosition, userARR, eventNumber, currentBiggest) {
  if (!userARR) return currentBiggest;

  // Find all opponents user beat (those with higher position number)
  const beaten = results
    .filter(r => {
      const pos = parseInt(r.Position);
      const arr = parseInt(r.ARR);
      return r.UID !== userUid && !isNaN(pos) && pos > userPosition && arr > 0;
    })
    .map(r => ({
      name: r.Name || null,
      arr: parseInt(r.ARR),
      uid: r.UID || null
    }));

  if (beaten.length === 0) return currentBiggest;

  // Find opponent with highest ARR
  const highestBeaten = beaten.reduce((max, rider) =>
    rider.arr > max.arr ? rider : max
  , beaten[0]);

  // Only update if this is a bigger giant than previous record
  if (!currentBiggest || highestBeaten.arr > currentBiggest.opponentARR) {
    return {
      opponentName: highestBeaten.name,
      opponentARR: highestBeaten.arr,
      eventNumber: eventNumber,
      eventName: EVENT_NAMES[eventNumber] || `Event ${eventNumber}`,
      date: new Date().toISOString(),
      userARR: userARR,
      arrDifference: highestBeaten.arr - userARR
    };
  }

  return currentBiggest;
}

/**
 * Calculate best prediction performance
 */
function calculateBestPrediction(eventResults, eventNumber, currentBest) {
  if (!eventResults.predictedPosition) return currentBest;

  const difference = eventResults.predictedPosition - eventResults.position;

  // Only track positive differences (beat prediction)
  if (difference > 0 && (!currentBest || difference > currentBest.difference)) {
    return {
      eventNumber: eventNumber,
      eventName: EVENT_NAMES[eventNumber] || `Event ${eventNumber}`,
      predicted: eventResults.predictedPosition,
      actual: eventResults.position,
      difference: difference,
      date: new Date().toISOString()
    };
  }

  return currentBest;
}

/**
 * Calculate highest ARR achieved
 */
function calculateHighestARR(currentARR, eventNumber, existing) {
  if (!currentARR) return existing;

  if (!existing || currentARR > existing.value) {
    return {
      value: currentARR,
      eventNumber: eventNumber,
      eventName: EVENT_NAMES[eventNumber] || `Event ${eventNumber}`,
      date: new Date().toISOString()
    };
  }

  return existing;
}

/**
 * Calculate biggest win margin
 * For elimination races (event 3) and time-based events (e.g., event 4), margin isn't meaningful
 */
function calculateBiggestWinMargin(position, results, eventNumber, currentBiggest) {
  if (position !== 1) return currentBiggest;

  // For elimination races and time-based events, margin isn't meaningful
  const isTimeIrrelevant = eventNumber === 3 || TIME_BASED_EVENTS.includes(eventNumber);

  if (isTimeIrrelevant) {
    // Only use this win if there's no current biggest win
    if (!currentBiggest) {
      return {
        eventNumber: eventNumber,
        eventName: EVENT_NAMES[eventNumber] || `Event ${eventNumber}`,
        marginSeconds: 0,
        date: new Date().toISOString()
      };
    }
    return currentBiggest;
  }

  // Find first and second place times
  const sortedResults = results
    .filter(r => !isNaN(parseFloat(r.Time)))
    .map(r => ({
      position: parseInt(r.Position),
      time: parseFloat(r.Time)
    }))
    .sort((a, b) => a.position - b.position);

  if (sortedResults.length < 2) return currentBiggest;

  const winnerTime = sortedResults[0].time;
  const secondTime = sortedResults[1].time;
  const margin = secondTime - winnerTime;

  if (!currentBiggest || margin > currentBiggest.marginSeconds) {
    return {
      eventNumber: eventNumber,
      eventName: EVENT_NAMES[eventNumber] || `Event ${eventNumber}`,
      marginSeconds: margin,
      date: new Date().toISOString()
    };
  }

  return currentBiggest;
}

// ================== GC CALCULATION ==================

/**
 * Deterministic random number generator using bot UID and event as seed
 */
function getSeededRandom(botName, eventNumber) {
  let hash = 0;
  const seed = `${botName}-${eventNumber}`;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(Math.abs(hash)) * 10000;
  return x - Math.floor(x);
}

/**
 * Simulate a race position for a bot based on their ARR/rating
 */
function simulatePosition(botName, arr, eventNumber, fieldSize = 50) {
  let expectedPosition;
  if (arr >= 1400) expectedPosition = 5;
  else if (arr >= 1200) expectedPosition = 12;
  else if (arr >= 1000) expectedPosition = 20;
  else if (arr >= 800) expectedPosition = 30;
  else expectedPosition = 40;

  const randomOffset = Math.floor(getSeededRandom(botName, eventNumber) * 20) - 10;
  let simulatedPosition = expectedPosition + randomOffset;
  return Math.max(1, Math.min(fieldSize, simulatedPosition));
}

/**
 * Simulate a race time for a bot based on times of riders with similar ARR
 * @param {string} botUid - Bot's unique identifier (for seeded random)
 * @param {number} botARR - Bot's ARR rating
 * @param {Array} stageResults - Array of actual race results for the stage
 * @param {number} eventNum - Event number (for seeded random)
 * @returns {number|null} - Simulated time in seconds, or null if fallback needed
 */
function simulateTimeFromARR(botUid, botARR, stageResults, eventNum) {
  // Get actual results with valid times and ARR
  // Note: r.arr >= 0 allows ARR=0 (unranked riders), which was previously excluded by truthy check
  const validResults = (stageResults || [])
    .filter(r => r.time && parseFloat(r.time) > 0 && r.arr !== undefined && r.arr !== null && r.position !== 'DNF')
    .map(r => ({ arr: parseInt(r.arr) || 1000, time: parseFloat(r.time) }));

  if (validResults.length === 0) {
    return null; // Fallback to position-based method
  }

  // Find riders within ARR range (start tight, expand if needed)
  let arrRange = 50;
  let similarRiders = [];

  while (similarRiders.length < 2 && arrRange <= 300) {
    similarRiders = validResults.filter(r =>
      Math.abs(r.arr - botARR) <= arrRange
    );
    arrRange += 50;
  }

  // If still no matches after expanding range, use closest ARR riders
  if (similarRiders.length === 0) {
    validResults.sort((a, b) =>
      Math.abs(a.arr - botARR) - Math.abs(b.arr - botARR)
    );
    similarRiders = validResults.slice(0, 3);
  }

  // Sort times from fastest to slowest
  const times = similarRiders.map(r => r.time).sort((a, b) => a - b);

  // For stage races (events 13-15), pick a random time from the full range
  // This simulates good days and bad days, preventing unrealistically consistent performance
  const isStageRace = eventNum >= 13 && eventNum <= 15;

  let baseTime;
  if (isStageRace && times.length >= 2) {
    // Pick a random time from the full range of similar riders
    // Use seeded random to be deterministic
    const randomIndex = Math.floor(getSeededRandom(botUid, eventNum) * times.length);
    baseTime = times[randomIndex];

    // Add additional variance (±5%) to spread times further
    const extraVariance = (getSeededRandom(botUid + '_extra', eventNum) - 0.5) * 0.10;
    baseTime = baseTime * (1 + extraVariance);
  } else {
    // For non-stage races, use median with small variance (original behavior)
    const medianTime = times[Math.floor(times.length / 2)];
    const variance = (getSeededRandom(botUid, eventNum) - 0.5) * 0.02;
    baseTime = medianTime * (1 + variance);
  }

  return baseTime;
}

/**
 * Calculate General Classification (GC) for stage race (events 13, 14, 15)
 * @param {number} season - Season number
 * @param {string} userUid - User's UID
 * @param {number} upToEvent - Event number to calculate GC through (13, 14, or 15)
 * @param {Object} currentUserResult - Current user's result (for stages not yet stored)
 * @param {Array} currentEventResults - Full results from current event (for stages not yet stored)
 */
async function calculateGC(season, userUid, upToEvent = 15, currentUserResult = null, currentEventResults = null) {
  console.log(`   Calculating GC through event ${upToEvent}...`);

  const stageNumbers = [];
  if (upToEvent >= 13) stageNumbers.push(13);
  if (upToEvent >= 14) stageNumbers.push(14);
  if (upToEvent >= 15) stageNumbers.push(15);

  const stageResults = {};

  for (const eventNum of stageNumbers) {
    try {
      const querySnapshot = await db.collection('results')
        .where(admin.firestore.FieldPath.documentId(), '>=', `season${season}_event${eventNum}_`)
        .where(admin.firestore.FieldPath.documentId(), '<', `season${season}_event${eventNum}_\uf8ff`)
        .get();

      if (!querySnapshot.empty) {
        const allResults = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.results && Array.isArray(data.results)) {
            allResults.push(...data.results);
          }
        });

        const uniqueResults = [];
        const seenUIDs = new Set();
        allResults.forEach(r => {
          if (!seenUIDs.has(r.uid)) {
            seenUIDs.add(r.uid);
            uniqueResults.push(r);
          }
        });

        stageResults[eventNum] = uniqueResults;
        console.log(`   Event ${eventNum}: Found ${uniqueResults.length} riders (from Firebase)`);
      }
    } catch (error) {
      console.log(`   Warning: Could not fetch results for event ${eventNum}:`, error.message);
    }
  }

  // If current event results provided and not already in stageResults, add them
  if (currentEventResults && currentEventResults.length > 0 && !stageResults[upToEvent]) {
    // Transform current event results to match Firebase format (lowercase field names)
    const transformedResults = currentEventResults
      .filter(r => r.Position !== 'DNF' && r.Time && parseFloat(r.Time) > 0)
      .map(r => ({
        uid: r.UID || '',
        name: r.Name || '',
        team: r.Team || '',
        arr: parseInt(r.ARR) || 0,
        position: parseInt(r.Position) || 999,
        time: parseFloat(r.Time) || 0,
        gender: r.Gender || 'Unknown'
      }));

    stageResults[upToEvent] = transformedResults;
    console.log(`   Event ${upToEvent}: Using ${transformedResults.length} riders from current event results`);
  }

  const availableStages = Object.keys(stageResults).map(k => parseInt(k));

  if (availableStages.length === 0) {
    console.log('   ⚠️ No stage results available for GC calculation');
    return null;
  }

  const allRiders = new Map();

  if (currentUserResult) {
    allRiders.set(userUid, {
      uid: userUid,
      name: currentUserResult.name,
      team: currentUserResult.team || '',
      arr: currentUserResult.arr || 1000,
      isBot: false,
      actualStages: new Set([upToEvent]),
      stageResults: {
        [upToEvent]: { position: currentUserResult.position, time: currentUserResult.time, isActual: true }
      }
    });
  }

  availableStages.forEach(eventNum => {
    stageResults[eventNum].forEach(r => {
      if (currentUserResult && r.uid === userUid && eventNum === upToEvent) return;

      if (!allRiders.has(r.uid)) {
        allRiders.set(r.uid, {
          uid: r.uid,
          name: r.name,
          team: r.team,
          arr: r.arr || 1000,
          isBot: isBot(r.uid, r.gender),
          actualStages: new Set(),
          stageResults: {}
        });
      }
      const rider = allRiders.get(r.uid);
      const actualTime = parseFloat(r.time) || 0;

      // Skip results with zero/invalid times - they can't contribute to GC
      if (actualTime <= 0) {
        console.log(`   ⚠️ Skipping ${r.name} (${r.uid}) for event ${eventNum} - invalid time: ${r.time}`);
        return;
      }

      rider.actualStages.add(eventNum);
      rider.stageResults[eventNum] = { position: r.position, time: actualTime, isActual: true };

      // Flag suspiciously low times (less than 30 minutes for a stage race)
      if (actualTime < 1800) {
        console.log(`   ⚠️ SUSPICIOUS: ${r.name} (${r.uid}) has time ${actualTime.toFixed(1)}s for event ${eventNum} - too fast!`);
      }
    });
  });

  // Simulate missing stages for bots
  const botDNS = new Set();
  if (availableStages.includes(14)) {
    allRiders.forEach((rider, uid) => {
      if (rider.isBot && !rider.actualStages.has(14)) {
        if (getSeededRandom(uid, 14) < 0.05) {
          botDNS.add(uid);
        }
      }
    });
  }

  // Pre-calculate actual time ranges for each stage (for fallback simulation)
  const stageTimeRanges = {};
  stageNumbers.forEach(eventNum => {
    const actualTimes = stageResults[eventNum]
      ?.filter(r => r.time && parseFloat(r.time) > 0 && r.position !== 'DNF')
      .map(r => parseFloat(r.time))
      .sort((a, b) => a - b) || [];

    if (actualTimes.length > 0) {
      stageTimeRanges[eventNum] = {
        minTime: actualTimes[0],
        maxTime: actualTimes[actualTimes.length - 1],
        hasValidTimes: true
      };
      console.log(`   Stage ${eventNum}: Time range ${actualTimes[0].toFixed(0)}s - ${actualTimes[actualTimes.length - 1].toFixed(0)}s (${actualTimes.length} riders)`);
    } else {
      stageTimeRanges[eventNum] = { hasValidTimes: false };
      console.log(`   ⚠️ Stage ${eventNum}: No valid times found for simulation`);
    }
  });

  allRiders.forEach((rider, uid) => {
    if (rider.isBot && !botDNS.has(uid)) {
      stageNumbers.forEach(eventNum => {
        if (!rider.actualStages.has(eventNum)) {
          // Check if we have valid times for this stage
          const timeRange = stageTimeRanges[eventNum];
          if (!timeRange?.hasValidTimes) {
            // No valid times for this stage - can't simulate, mark as DNS
            botDNS.add(uid);
            return;
          }

          const fieldSize = stageResults[eventNum]?.length || 50;
          const simulatedPosition = simulatePosition(uid, rider.arr, eventNum, fieldSize);

          // Simulate time based on riders with similar ARR (more realistic)
          let simulatedTime = simulateTimeFromARR(uid, rider.arr, stageResults[eventNum], eventNum);

          // Fallback to position-based interpolation using ACTUAL stage time range
          if (!simulatedTime) {
            const { minTime, maxTime } = timeRange;
            const positionRatio = (simulatedPosition - 1) / Math.max(1, fieldSize - 1);
            simulatedTime = minTime + (maxTime - minTime) * positionRatio;
          }

          rider.stageResults[eventNum] = { position: simulatedPosition, time: simulatedTime, isActual: false, isSimulated: true };
        }
      });
    }
  });

  const gcStandings = [];

  allRiders.forEach(rider => {
    const stagesCompleted = Object.keys(rider.stageResults).length;
    if (stagesCompleted === stageNumbers.length && !botDNS.has(rider.uid)) {
      let cumulativeTime = 0;
      let actualStagesCount = 0;
      let hasInvalidTime = false;

      stageNumbers.forEach(eventNum => {
        const result = rider.stageResults[eventNum];
        if (result) {
          // Time of 0 or missing is invalid - can't include in GC
          if (!result.time || result.time <= 0) {
            hasInvalidTime = true;
          } else {
            cumulativeTime += result.time;
          }
          if (result.isActual) actualStagesCount++;
        }
      });

      // Skip riders with any invalid/zero stage times
      if (hasInvalidTime) {
        return;
      }

      gcStandings.push({
        uid: rider.uid,
        name: rider.name,
        team: rider.team,
        arr: rider.arr,
        isBot: rider.isBot,
        cumulativeTime,
        stage13Time: rider.stageResults[13]?.time || 0,
        stage14Time: rider.stageResults[14]?.time || 0,
        stage15Time: rider.stageResults[15]?.time || 0,
        stagesCompleted: stageNumbers.length,
        actualStagesRaced: actualStagesCount
      });
    }
  });

  gcStandings.sort((a, b) => a.cumulativeTime - b.cumulativeTime);

  gcStandings.forEach((rider, index) => {
    rider.gcPosition = index + 1;
    rider.gapToLeader = index === 0 ? 0 : rider.cumulativeTime - gcStandings[0].cumulativeTime;
  });

  // Debug: Log top 10 GC standings to diagnose impossible times
  console.log(`   🔍 GC Debug - Top 10 standings:`);
  const minPossibleTime = Object.values(stageTimeRanges).reduce((sum, r) => sum + (r.minTime || 0), 0);
  console.log(`   Minimum possible GC time: ${minPossibleTime.toFixed(0)}s`);
  gcStandings.slice(0, 10).forEach((r, i) => {
    const rider = allRiders.get(r.uid);
    const s13 = rider?.stageResults[13];
    const s14 = rider?.stageResults[14];
    const s15 = rider?.stageResults[15];
    console.log(`   ${i+1}. ${r.name} (${r.uid}): ${r.cumulativeTime.toFixed(0)}s total`);
    console.log(`      S13: ${s13?.time?.toFixed(0) || 'N/A'}s ${s13?.isActual ? '(ACTUAL)' : s13?.isSimulated ? '(SIM)' : ''}`);
    console.log(`      S14: ${s14?.time?.toFixed(0) || 'N/A'}s ${s14?.isActual ? '(ACTUAL)' : s14?.isSimulated ? '(SIM)' : ''}`);
    console.log(`      S15: ${s15?.time?.toFixed(0) || 'N/A'}s ${s15?.isActual ? '(ACTUAL)' : s15?.isSimulated ? '(SIM)' : ''}`);
  });
  // Also log user's position
  const userStanding = gcStandings.find(r => r.uid === userUid);
  if (userStanding) {
    const userRider = allRiders.get(userUid);
    console.log(`   User (${userStanding.gcPosition}): ${userStanding.name}: ${userStanding.cumulativeTime.toFixed(0)}s total`);
    console.log(`      S13: ${userRider?.stageResults[13]?.time?.toFixed(0) || 'N/A'}s ${userRider?.stageResults[13]?.isActual ? '(ACTUAL)' : '(SIM)'}`);
    console.log(`      S14: ${userRider?.stageResults[14]?.time?.toFixed(0) || 'N/A'}s ${userRider?.stageResults[14]?.isActual ? '(ACTUAL)' : '(SIM)'}`);
    console.log(`      S15: ${userRider?.stageResults[15]?.time?.toFixed(0) || 'N/A'}s ${userRider?.stageResults[15]?.isActual ? '(ACTUAL)' : '(SIM)'}`);
  }

  const userGC = gcStandings.find(r => r.uid === userUid);
  let gcAwards = { gcGoldMedal: false, gcSilverMedal: false, gcBronzeMedal: false };
  let gcBonusPoints = 0;

  if (upToEvent === 15 && userGC) {
    if (userGC.gcPosition === 1) { gcAwards.gcGoldMedal = true; gcBonusPoints = 50; }
    else if (userGC.gcPosition === 2) { gcAwards.gcSilverMedal = true; gcBonusPoints = 35; }
    else if (userGC.gcPosition === 3) { gcAwards.gcBronzeMedal = true; gcBonusPoints = 25; }
  }

  return {
    standings: gcStandings,
    stagesIncluded: stageNumbers.length,
    isProvisional: upToEvent < 15,
    userGC,
    awards: gcAwards,
    bonusPoints: gcBonusPoints
  };
}

// ================== MAIN PROCESSING ==================

/**
 * Parse folder path to extract season and event number
 */
function parseEventPath(filePath) {
  const match = filePath.match(/season_(\d+)\/event_(\d+)/);
  if (!match) {
    throw new Error(`Invalid path format: ${filePath}`);
  }
  return {
    season: parseInt(match[1]),
    event: parseInt(match[2])
  };
}

/**
 * Process a single result for a user (JSON version with power data)
 */
async function processUserResult(uid, eventInfo, results, raceTimestamp) {
  const { season, event: eventNumber } = eventInfo;

  // Query for user by uid field
  const usersQuery = await db.collection('users')
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (usersQuery.empty) {
    console.log(`❌ User with uid ${uid} not found in database`);
    return { unlockBonusPoints: 0, unlockBonusesApplied: [] };
  }

  const userDoc = usersQuery.docs[0];
  const userRef = userDoc.ref;
  let userData = userDoc.data();

  console.log(`   Found user: ${userData.name || uid} (Document ID: ${userDoc.id})`);

  // Recover personality from interview history if missing
  const recoveredPersonality = await recoverPersonalityIfNeeded(uid, userData, userRef);
  if (recoveredPersonality && !userData.personality) {
    userData.personality = recoveredPersonality;
  }

  const currentStage = userData.currentStage || 1;
  const usedOptionalEvents = userData.usedOptionalEvents || [];
  const tourProgress = userData.tourProgress || {};

  // Validate event
  const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
  const isSpecialEventResult = validation.isSpecialEvent === true;

  if (!validation.valid) {
    console.log(`❌ Event ${eventNumber} not valid for user at stage ${currentStage}: ${validation.reason}`);
    return { unlockBonusPoints: 0, unlockBonusesApplied: [] };
  }

  if (isSpecialEventResult) {
    console.log(`⭐ Event ${eventNumber} is SPECIAL - career points only, no stage progression`);
  }

  // Find user's result
  const userResult = results.find(r => r.UID === uid);
  if (!userResult) {
    console.log(`User ${uid} not found in results, skipping`);
    return { unlockBonusPoints: 0, unlockBonusesApplied: [] };
  }

  // Check if already processed
  const existingResults = userData[`event${eventNumber}Results`];
  if (existingResults && existingResults.position === parseInt(userResult.Position)) {
    console.log(`Event ${eventNumber} already processed for user ${uid}, skipping`);
    return { unlockBonusPoints: 0, unlockBonusesApplied: [] };
  }

  let position = parseInt(userResult.Position);
  const isDNF = isNaN(position) || userResult.Position === 'DNF';

  if (isDNF) {
    console.log(`User ${uid} has DNF, awarding 0 points`);
    position = null;
  }

  const predictedPosition = calculatePredictedPosition(results, uid);

  // Calculate points
  let points = 0;
  let bonusPoints = 0;
  if (!isDNF) {
    const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
    points = pointsResult.points;
    bonusPoints = pointsResult.bonusPoints;
  }

  // Initialize award flags
  let earnedPunchingMedal = false;
  let earnedGiantKillerMedal = false;
  let earnedBullseyeMedal = false;
  let earnedHotStreakMedal = false;
  let earnedDomination = false;
  let earnedCloseCall = false;
  let earnedPhotoFinish = false;
  let earnedDarkHorse = false;
  let earnedZeroToHero = false;
  let earnedWindTunnel = false;
  let earnedTheAccountant = false;
  let earnedLanternRouge = false;
  let earnedComeback = false;

  // Power awards
  let earnedPowerSurge = false;
  let earnedSteadyEddie = false;
  let earnedBlastOff = false;

  if (!isDNF) {
    // Prediction awards
    if (predictedPosition) {
      earnedPunchingMedal = (predictedPosition - position) >= 10;
      // Bullseye: finish exactly as predicted
      earnedBullseyeMedal = position === predictedPosition;
    }
    earnedGiantKillerMedal = checkGiantKiller(results, uid);

    // Time-based awards
    const times = awardsCalc.getTimesFromResults(
      results.map(r => ({
        position: parseInt(r.Position),
        time: parseFloat(r.Time)
      })).filter(r => !isNaN(r.position)),
      position
    );

    // Time-based awards should NOT be awarded for elimination races or time-based events
    const isTimeIrrelevant = eventNumber === 3 || TIME_BASED_EVENTS.includes(eventNumber);
    earnedDomination = isTimeIrrelevant ? false : awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
    earnedCloseCall = isTimeIrrelevant ? false : awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
    earnedPhotoFinish = isTimeIrrelevant ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime, times.secondPlaceTime);
    earnedDarkHorse = awardsCalc.checkDarkHorse(position, predictedPosition);

    const eventType = EVENT_TYPES[eventNumber] || 'road race';
    earnedWindTunnel = awardsCalc.checkWindTunnel(position, predictedPosition, eventType);

    if (eventType === 'points race') {
      const userEventPoints = parseInt(userResult.Points) || 0;
      const userTime = parseFloat(userResult.Time) || 0;
      earnedTheAccountant = awardsCalc.checkTheAccountant(userTime, userEventPoints, results);
    }

    // Lantern Rouge: finish last among finishers
    const finishers = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)));
    const lastPosition = Math.max(...finishers.map(r => parseInt(r.Position)));
    earnedLanternRouge = position === lastPosition && finishers.length > 1;

    // Hot Streak: beat prediction 3 events in a row
    if (predictedPosition && position < predictedPosition) {
      // Check last 2 events for prediction beats
      let streak = 1; // Current event beats prediction
      for (let i = eventNumber - 1; i >= Math.max(1, eventNumber - 2); i--) {
        const prevResults = userData[`event${i}Results`];
        if (prevResults && prevResults.predictedPosition && prevResults.position < prevResults.predictedPosition) {
          streak++;
        } else {
          break;
        }
      }
      earnedHotStreakMedal = streak >= 3;
    }

    // Zero to Hero: bottom 20% one event, top 20% next
    if (eventNumber > 1) {
      const prevEventResults = userData[`event${eventNumber - 1}Results`];
      if (prevEventResults && prevEventResults.position && prevEventResults.position !== 'DNF') {
        const currentFinishers = finishers.length;
        earnedZeroToHero = awardsCalc.checkZeroToHero(
          { position: prevEventResults.position, totalFinishers: 50 }, // Approximate prev
          { position: position, totalFinishers: currentFinishers }
        );
      }
    }

    // Comeback: top 5 after bottom half finish
    if (position <= 5 && eventNumber > 1) {
      const prevEventResults = userData[`event${eventNumber - 1}Results`];
      if (prevEventResults && prevEventResults.position && prevEventResults.position !== 'DNF') {
        const totalRiders = finishers.length;
        const bottomHalf = totalRiders / 2;
        if (prevEventResults.position > bottomHalf) {
          earnedComeback = true;
        }
      }
    }

    // POWER AWARDS (only if power data available)
    if (userResult.AvgPower || userResult.MaxPower) {
      earnedPowerSurge = checkPowerSurge(position, userResult);
      earnedSteadyEddie = checkSteadyEddie(userResult);
      earnedBlastOff = checkBlastOff(userResult, userData.hasEarnedBlastOff || false);

      if (earnedPowerSurge) console.log(`   💥 Power Surge earned!`);
      if (earnedSteadyEddie) console.log(`   📊 Steady Eddie earned!`);
      if (earnedBlastOff) console.log(`   🚀 BLAST OFF earned! (${userResult.MaxPower}W)`);
    }
  }

  const eventType = EVENT_TYPES[eventNumber] || 'road race';
  const eventCategory = getEventCategory(eventType);
  const distance = parseFloat(userResult.Distance) || 0;

  // GC awards for tour events (13, 14, 15)
  let gcBonusPoints = 0;
  let gcAwards = { gcGoldMedal: false, gcSilverMedal: false, gcBronzeMedal: false };
  let gcResults = null;

  if (validation.isTour && !isDNF) {
    console.log('   🏁 Tour stage complete - calculating current GC...');
    const currentUserResult = {
      name: userResult.Name,
      team: userResult.Team || '',
      arr: parseInt(userResult.ARR) || 1000,
      position: position,
      time: parseFloat(userResult.Time) || 0
    };
    // Pass full results array so GC can use current event data before it's stored to Firebase
    gcResults = await calculateGC(season, uid, eventNumber, currentUserResult, results);

    if (gcResults && eventNumber === 15) {
      gcBonusPoints = gcResults.bonusPoints;
      gcAwards = gcResults.awards;
      points += gcBonusPoints;
      if (gcBonusPoints > 0) {
        console.log(`   💰 GC bonus points added: +${gcBonusPoints}`);
      }
    }
  }

  // Calculate win/loss margins for unlock context and story generation
  const sortedFinishers = results
    .filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)))
    .sort((a, b) => parseInt(a.Position) - parseInt(b.Position));

  const winnerResult = sortedFinishers[0];
  const secondResult = sortedFinishers[1];
  const winnerName = winnerResult?.Name || 'Unknown';
  const secondPlaceName = secondResult?.Name || null;
  const winnerTime = parseFloat(winnerResult?.Time) || 0;
  const secondTime = parseFloat(secondResult?.Time) || 0;
  const userTime = parseFloat(userResult.Time) || 0;
  const marginToWinner = position === 1 ? 0 : userTime - winnerTime;
  const winMargin = position === 1 && secondTime ? secondTime - winnerTime : 0;

  // Calculate rival encounters BEFORE unlock context (needed for rival-based triggers)
  const rivalEncounters = calculateRivalEncounters(results, uid, position, userTime, eventNumber, distance);
  const existingRivalData = userData.rivalData || null;
  const updatedRivalData = updateRivalData(existingRivalData, rivalEncounters, eventNumber);
  const topRivals = identifyTopRivals(updatedRivalData);
  updatedRivalData.topRivals = topRivals;

  // ================== UNLOCK BONUS HANDLING ==================
  const skipUnlocks = process.env.SKIP_UNLOCKS === 'true';
  let unlockBonusPoints = 0;
  let unlockBonusesApplied = [];
  const previousCooldowns = { ...(userData.unlocks?.cooldowns || {}) };
  const newCooldowns = {};

  if (!skipUnlocks && !isDNF && !isSpecialEventResult) {
    const equipped = Array.isArray(userData.unlocks?.equipped) ? userData.unlocks.equipped : [];
    const slotCount = userData.unlocks?.slotCount || 1;
    const equippedToUse = equipped.slice(0, slotCount).filter(Boolean);

    if (equippedToUse.length > 0) {
      // Sanitize results for unlock context
      const sanitizedResults = sortedFinishers.map(r => ({
        position: parseInt(r.Position),
        arr: parseInt(r.ARR) || 0,
        uid: r.UID || null,
        name: r.Name || null
      }));

      // Build unlock context
      const unlockContext = {
        position,
        predictedPosition,
        marginToWinner: position === 1 ? winMargin : marginToWinner,
        gapToWinner: position === 1 ? 0 : marginToWinner,
        eventCategory,
        eventNumber,
        totalFinishers: sortedFinishers.length,
        userARR: parseInt(userResult.ARR) || 0,
        results: sanitizedResults,
        topRivals: updatedRivalData.topRivals || [],
        rivalEncounters: rivalEncounters,
        personality: userData.personality || null
      };

      // Check triggers
      const triggeredUnlocks = selectUnlocksToApply(equippedToUse, previousCooldowns, unlockContext);
      if (triggeredUnlocks.length > 0) {
        triggeredUnlocks.forEach(selectedUnlock => {
          const unlockPoints = selectedUnlock.unlock.pointsBonus || 0;
          unlockBonusPoints += unlockPoints;
          unlockBonusesApplied.push({
            id: selectedUnlock.unlock.id,
            name: selectedUnlock.unlock.name,
            emoji: selectedUnlock.unlock.emoji || '🎯',
            emojiFallback: selectedUnlock.unlock.emojiFallback || null,
            pointsAdded: unlockPoints,
            reason: selectedUnlock.reason
          });
          newCooldowns[selectedUnlock.unlock.id] = true;
          console.log(`   💎 Unlock applied (${selectedUnlock.unlock.name}): +${unlockPoints} pts`);

          // Apply personality bonus if defined
          if (selectedUnlock.unlock.personalityBonus) {
            const currentPersonality = userData.personality || {
              confidence: 50, aggression: 50, professionalism: 50,
              humility: 50, showmanship: 50, resilience: 50
            };
            for (const [trait, bonus] of Object.entries(selectedUnlock.unlock.personalityBonus)) {
              currentPersonality[trait] = Math.min(100, (currentPersonality[trait] || 50) + bonus);
            }
            userData.personality = currentPersonality;
            console.log(`   🧠 Personality bonus applied: +${JSON.stringify(selectedUnlock.unlock.personalityBonus)}`);
          }
        });

        // Add unlock bonus to points
        points += unlockBonusPoints;
        bonusPoints += unlockBonusPoints;
      }
    }
  }

  // Prepare event results WITH power data
  const eventResults = {
    position: isDNF ? 'DNF' : position,
    isDNF: isDNF,
    stageNumber: isSpecialEventResult ? null : currentStage,
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
    arrBand: userResult.ARRBand || '',
    eventRating: parseInt(userResult.EventRating) || null,
    predictedPosition: predictedPosition,
    eventType: eventType,
    eventCategory: eventCategory,
    points: points,
    bonusPoints: bonusPoints,
    unlockBonusPoints: unlockBonusPoints,
    unlockBonusesApplied: unlockBonusesApplied,
    distance: distance,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null,

    // Standard awards
    earnedPunchingMedal: earnedPunchingMedal,
    earnedGiantKillerMedal: earnedGiantKillerMedal,
    earnedBullseyeMedal: earnedBullseyeMedal,
    earnedHotStreakMedal: earnedHotStreakMedal,
    earnedDomination: earnedDomination,
    earnedCloseCall: earnedCloseCall,
    earnedPhotoFinish: earnedPhotoFinish,
    earnedDarkHorse: earnedDarkHorse,
    earnedZeroToHero: earnedZeroToHero,
    earnedWindTunnel: earnedWindTunnel,
    earnedTheAccountant: earnedTheAccountant,
    earnedLanternRouge: earnedLanternRouge,
    earnedComeback: earnedComeback,

    // POWER DATA
    avgPower: userResult.AvgPower || null,
    maxPower: userResult.MaxPower || null,
    nrmPower: userResult.NrmPower || null,
    avgHr: userResult.AvgHR || null,
    maxHr: userResult.MaxHR || null,

    // POWER AWARDS
    earnedPowerSurge: earnedPowerSurge,
    earnedSteadyEddie: earnedSteadyEddie,
    earnedBlastOff: earnedBlastOff,

    // GC AWARDS (tour events only)
    earnedGCGoldMedal: gcAwards.gcGoldMedal,
    earnedGCSilverMedal: gcAwards.gcSilverMedal,
    earnedGCBronzeMedal: gcAwards.gcBronzeMedal,
    gcBonusPoints: gcBonusPoints,

    // Track awards for notification system
    earnedAwards: [],

    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    raceDate: raceTimestamp ? new Date(raceTimestamp).toISOString() : null,
    dataSource: 'json'  // Track that this came from JSON
  };

  // Track optional events
  const newUsedOptionalEvents = [...usedOptionalEvents];
  if (!isSpecialEventResult && OPTIONAL_EVENTS.includes(eventNumber) && !usedOptionalEvents.includes(eventNumber)) {
    newUsedOptionalEvents.push(eventNumber);
  }

  // Update tour progress
  const newTourProgress = { ...tourProgress };
  if (!isSpecialEventResult && validation.isTour) {
    if (eventNumber === 13) {
      newTourProgress.event13Completed = true;
      newTourProgress.event13Date = new Date().toISOString();
    } else if (eventNumber === 14) {
      newTourProgress.event14Completed = true;
      newTourProgress.event14Date = new Date().toISOString();
    } else if (eventNumber === 15) {
      newTourProgress.event15Completed = true;
      newTourProgress.event15Date = new Date().toISOString();
    }
  }

  // Calculate next stage
  const nextStage = isSpecialEventResult ? currentStage : calculateNextStage(currentStage, newTourProgress);

  // Update power records
  const updatedPowerRecords = updatePowerRecords(userData.powerRecords, eventResults, eventNumber, distance);

  // NOTE: rivalEncounters, existingRivalData, updatedRivalData, and topRivals
  // are calculated earlier (before unlock context) to support rival-based unlock triggers

  // Build season standings (only for non-special events)
  let seasonStandings = [];
  if (!isSpecialEventResult) {
    console.log('   📊 Building season standings...');
    seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid, points);
    console.log(`   Season standings built with ${seasonStandings.length} racers`);
  }

  // Log rival encounters
  if (rivalEncounters.length > 0) {
    const proximityDesc = eventNumber === 4 ? 'within 500m' : 'within 30 seconds';
    console.log(`   🤝 Rival encounters: ${rivalEncounters.length} bot(s) ${proximityDesc}`);
  }

  // Add rival encounters to eventResults for potential story generation
  eventResults.rivalEncounters = rivalEncounters;

  // ================== STORY GENERATION ==================
  // Calculate context needed for story generation
  // Build array of completed events with timestamps for proper ordering
  const completedEvents = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`]) {
      const evtData = userData[`event${i}Results`];
      const timestamp = evtData.raceDate || evtData.processedAt;
      const timestampMs = timestamp ? (timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()) : 0;
      completedEvents.push({ eventNum: i, timestamp: timestampMs });
    }
  }

  // Sort by completion timestamp (oldest first)
  completedEvents.sort((a, b) => a.timestamp - b.timestamp);
  const completedEventNumbers = completedEvents.map(e => e.eventNum);

  // Recent results for form analysis (last 3 completed events by timestamp)
  const recentResults = completedEventNumbers.slice(-3).map(evtNum => {
    const evtData = userData[`event${evtNum}Results`];
    return evtData ? evtData.position : null;
  }).filter(p => p !== null);
  recentResults.push(position); // Add current race

  // Check if on winning streak
  const isOnStreak = recentResults.length >= 2 && recentResults.every(p => p === 1);

  // Count total podiums and wins
  let totalPodiums = 0;
  let totalWins = 0;
  for (let i = 1; i <= 15; i++) {
    const evtData = userData[`event${i}Results`];
    if (evtData && evtData.position <= 3) totalPodiums++;
    if (evtData && evtData.position === 1) totalWins++;
  }
  if (position <= 3) totalPodiums++;
  if (position === 1) totalWins++;

  // Calculate next event number
  const nextEventNumber = eventNumber === 15 ? null : getNextEventNumber(nextStage, newTourProgress);

  // Generate story using narrative system
  let unifiedStory = '';
  try {
    const storyResult = await storyGen.generateRaceStory(
      {
        eventNumber: eventNumber,
        position: isDNF ? 'DNF' : position,
        predictedPosition: predictedPosition,
        winMargin: winMargin,
        lossMargin: marginToWinner,
        earnedDomination: earnedDomination,
        earnedCloseCall: earnedCloseCall,
        earnedPhotoFinish: earnedPhotoFinish,
        earnedDarkHorse: earnedDarkHorse,
        earnedZeroToHero: earnedZeroToHero,
        winnerName: winnerName,
        secondPlaceName: secondPlaceName,
        gcPosition: gcResults?.userGC?.gcPosition || null,
        gcGap: gcResults?.userGC?.gapToLeader || null,
        // JSON-exclusive: power data for story
        avgPower: userResult.AvgPower || null,
        nrmPower: userResult.NrmPower || null,
        maxPower: userResult.MaxPower || null
      },
      {
        stagesCompleted: completedEventNumbers.length + 1,
        totalPoints: (userData.totalPoints || 0) + points,
        totalWins: totalWins,
        nextStageNumber: nextStage,
        nextEventNumber: nextEventNumber,
        isNextStageChoice: [3, 6, 8].includes(nextStage),
        completedOptionalEvents: getCompletedOptionalEvents(userData, eventNumber),
        recentResults: recentResults,
        isOnStreak: isOnStreak,
        totalPodiums: totalPodiums,
        seasonPosition: null,
        topRivals: updatedRivalData.topRivals || [],
        rivalEncounters: rivalEncounters,
        personality: userData.personality || null,
        racesCompleted: completedEventNumbers.length,
        interviewsCompleted: userData.interviewHistory?.totalInterviews || 0
      },
      uid,
      narrativeSelector,
      db
    );

    unifiedStory = storyResult.recap;

    if (unifiedStory) {
      console.log(`   📖 Generated story (${unifiedStory.split('\n\n').length} paragraphs)`);
    }
  } catch (storyError) {
    console.error(`   ⚠️ Story generation error: ${storyError.message}`);
  }

  // Store story in event results
  eventResults.story = unifiedStory;
  eventResults.timestamp = admin.firestore.FieldValue.serverTimestamp();

  // Check for DNS on Local Tour stages (36-hour window enforcement)
  const dnsFlags = {};
  if (eventNumber >= 13 && eventNumber <= 15) {
    // Check if previous tour stage was completed in time
    if (eventNumber === 14 && userData.event13Results) {
      const event13Timestamp = userData.event13Results?.timestamp;
      if (event13Timestamp != null) {
        const event13Time = typeof event13Timestamp.toMillis === 'function'
          ? event13Timestamp.toMillis()
          : event13Timestamp;
        const now = Date.now();
        const hoursSinceEvent13 = (now - event13Time) / (1000 * 60 * 60);

        if (hoursSinceEvent13 > 36) {
          console.log(`   ⚠️ WARNING: Event 14 completed ${hoursSinceEvent13.toFixed(1)} hours after Event 13 (>36hr window)`);
          dnsFlags.event14DNS = true;
          dnsFlags.event14DNSReason = `Completed ${hoursSinceEvent13.toFixed(1)} hours after Stage 1 (36hr limit exceeded)`;
        }
      }
    }

    if (eventNumber === 15 && userData.event14Results) {
      const event14Timestamp = userData.event14Results?.timestamp;
      if (event14Timestamp != null) {
        const event14Time = typeof event14Timestamp.toMillis === 'function'
          ? event14Timestamp.toMillis()
          : event14Timestamp;
        const now = Date.now();
        const hoursSinceEvent14 = (now - event14Time) / (1000 * 60 * 60);

        if (hoursSinceEvent14 > 36) {
          console.log(`   ⚠️ WARNING: Event 15 completed ${hoursSinceEvent14.toFixed(1)} hours after Event 14 (>36hr window)`);
          dnsFlags.event15DNS = true;
          dnsFlags.event15DNSReason = `Completed ${hoursSinceEvent14.toFixed(1)} hours after Stage 2 (36hr limit exceeded)`;
        }
      }
    }
  }

  // Calculate lifetime statistics
  const existingLifetime = userData.lifetimeStats || {};
  const eventMeta = EVENT_METADATA[eventNumber] || { distance: 0, climbing: 0 };
  const userARR = parseInt(userResult.ARR) || 0;

  // Update cumulative totals
  const newLifetimeStats = {
    totalDistance: (existingLifetime.totalDistance || 0) + eventMeta.distance,
    totalClimbing: (existingLifetime.totalClimbing || 0) + eventMeta.climbing,
    totalRaceTime: (existingLifetime.totalRaceTime || 0) + (eventResults.time || 0),
    totalDNFs: isDNF ? (existingLifetime.totalDNFs || 0) + 1 : (existingLifetime.totalDNFs || 0)
  };

  // Track biggest giant beaten (only add if not undefined)
  if (!isDNF) {
    const biggestGiant = calculateBiggestGiant(results, uid, position, userARR, eventNumber, existingLifetime.biggestGiantBeaten);
    if (biggestGiant !== undefined) {
      newLifetimeStats.biggestGiantBeaten = biggestGiant;
    }

    // Track best vs prediction (only add if not undefined)
    const bestPred = calculateBestPrediction(eventResults, eventNumber, existingLifetime.bestVsPrediction);
    if (bestPred !== undefined) {
      newLifetimeStats.bestVsPrediction = bestPred;
    }

    // Track highest ARR (only add if not undefined)
    const highARR = calculateHighestARR(userARR, eventNumber, existingLifetime.highestARR);
    if (highARR !== undefined) {
      newLifetimeStats.highestARR = highARR;
    }

    // Track biggest win margin (only add if not undefined)
    const bigWin = calculateBiggestWinMargin(position, results, eventNumber, existingLifetime.biggestWin);
    if (bigWin !== undefined) {
      newLifetimeStats.biggestWin = bigWin;
    }
  }

  // Calculate career statistics from all event results (including current)
  const tempUserData = { ...userData };
  tempUserData[`event${eventNumber}Results`] = eventResults;
  const careerStats = await calculateCareerStats(tempUserData);

  // Prepare update object
  const updateData = {
    [`event${eventNumber}Results`]: eventResults,
    // Career statistics
    careerPoints: (userData.careerPoints || 0) + points,
    totalEvents: (userData.totalEvents || 0) + 1,
    careerWins: careerStats.totalWins,
    careerPodiums: careerStats.totalPodiums,
    totalTop10s: careerStats.totalTop10s,
    bestFinish: careerStats.bestFinish,
    averageFinish: careerStats.averageFinish,
    winRate: careerStats.winRate,
    podiumRate: careerStats.podiumRate,
    // User profile fields
    arr: eventResults.arr,
    team: userResult.Team || '',
    gender: userResult.Gender || null,
    country: userResult.Country || null,
    ageBand: userResult.AgeBand || null,
    // Other tracking
    totalPoints: admin.firestore.FieldValue.increment(points),
    powerRecords: updatedPowerRecords,
    rivalData: updatedRivalData,
    lifetimeStats: newLifetimeStats
  };

  // Stage progression (only for non-special events)
  if (!isSpecialEventResult) {
    updateData.currentStage = nextStage;
    updateData.usedOptionalEvents = newUsedOptionalEvents;
    updateData.completedOptionalEvents = newUsedOptionalEvents;  // Alias for frontend compatibility
    updateData.tourProgress = newTourProgress;
    updateData[`season${season}Standings`] = seasonStandings;

    // Add to completedStages (store the STAGE number, not event number)
    const completedStages = userData.completedStages || [];
    if (!completedStages.includes(currentStage)) {
      updateData.completedStages = admin.firestore.FieldValue.arrayUnion(currentStage);
    }
  }

  // Update unlock cooldowns (only if not skipping unlocks)
  if (!skipUnlocks) {
    updateData['unlocks.cooldowns'] = newCooldowns;
  }

  // Add DNS flags if any (for tour stage timing violations)
  Object.assign(updateData, dnsFlags);

  // Update personality if changed (from unlock bonuses)
  if (userData.personality) {
    updateData.personality = userData.personality;
  }

  // Award increments and earnedAwards population
  if (!isDNF) {
    // Podium medals
    if (position === 1) {
      updateData['awards.gold'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'goldMedal', category: 'podium', intensity: 'subtle' });
    }
    if (position === 2) {
      updateData['awards.silver'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'silverMedal', category: 'podium', intensity: 'subtle' });
    }
    if (position === 3) {
      updateData['awards.bronze'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'bronzeMedal', category: 'podium', intensity: 'subtle' });
    }

    // Special medals
    if (earnedPunchingMedal) {
      updateData['awards.punchingMedal'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'punchingMedal', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedGiantKillerMedal) {
      updateData['awards.giantKiller'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'giantKillerMedal', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedBullseyeMedal) {
      updateData['awards.bullseye'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'bullseyeMedal', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedHotStreakMedal) {
      updateData['awards.hotStreak'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'hotStreakMedal', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedDomination) {
      updateData['awards.domination'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'domination', category: 'performance', intensity: 'flashy' });
    }
    if (earnedCloseCall) {
      updateData['awards.closeCall'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'closeCall', category: 'performance', intensity: 'flashy' });
    }
    if (earnedPhotoFinish) {
      updateData['awards.photoFinish'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'photoFinish', category: 'performance', intensity: 'flashy' });
    }
    if (earnedDarkHorse) {
      updateData['awards.darkHorse'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'darkHorse', category: 'performance', intensity: 'flashy' });
    }
    if (earnedZeroToHero) {
      updateData['awards.zeroToHero'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'zeroToHero', category: 'performance', intensity: 'flashy' });
    }
    if (earnedWindTunnel) {
      updateData['awards.windTunnel'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'windTunnel', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedTheAccountant) {
      updateData['awards.theAccountant'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'theAccountant', category: 'event_special', intensity: 'moderate' });
    }
    if (earnedLanternRouge) {
      updateData['awards.lanternRouge'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'lanternRouge', category: 'event_special', intensity: 'subtle' });
    }
    if (earnedComeback) {
      updateData['awards.comeback'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'comeback', category: 'event_special', intensity: 'moderate' });
    }

    // Power awards
    if (earnedPowerSurge) {
      updateData['awards.powerSurge'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'powerSurge', category: 'performance', intensity: 'moderate' });
    }
    if (earnedSteadyEddie) {
      updateData['awards.steadyEddie'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'steadyEddie', category: 'performance', intensity: 'moderate' });
    }
    if (earnedBlastOff) {
      updateData['awards.blastOff'] = admin.firestore.FieldValue.increment(1);
      updateData.hasEarnedBlastOff = true;  // Prevent earning again
      eventResults.earnedAwards.push({ awardId: 'blastOff', category: 'performance', intensity: 'flashy' });
    }

    // PODIUM STREAK - 5 consecutive top 3 finishes
    if (position <= 3) {
      const recentPositions = [];
      for (let i = 1; i <= 15; i++) {
        const evtData = userData[`event${i}Results`];
        if (evtData && evtData.position && evtData.position !== 'DNF') {
          recentPositions.push(evtData.position);
        }
      }
      // Add current position
      recentPositions.push(position);

      // Check if last 5 results are all top 3
      if (recentPositions.length >= 5) {
        const last5 = recentPositions.slice(-5);
        const allPodiums = last5.every(pos => typeof pos === 'number' && pos <= 3);

        if (allPodiums) {
          console.log('   📈 PODIUM STREAK! 5 consecutive top 3 finishes');
          updateData['awards.podiumStreak'] = admin.firestore.FieldValue.increment(1);
          eventResults.earnedAwards.push({ awardId: 'podiumStreak', category: 'performance', intensity: 'flashy' });
        }
      }
    }
  }

  // BACK TO BACK - Win 2 races in a row
  if (position === 1) {
    const previousPositions = [];
    for (let i = 1; i <= 15; i++) {
      if (userData[`event${i}Results`] && userData[`event${i}Results`].position) {
        previousPositions.push(userData[`event${i}Results`].position);
      }
    }
    if (previousPositions.length > 0 && previousPositions[previousPositions.length - 1] === 1) {
      console.log('   🔁 BACK TO BACK! 2 consecutive wins');
      updateData['awards.backToBack'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'backToBack', category: 'performance', intensity: 'flashy' });
    }
  }

  // TROPHY COLLECTOR - Podium 5+ times (one-time award)
  if (position <= 3) {
    const currentTrophyCollector = userData.awards?.trophyCollector || 0;
    if (currentTrophyCollector === 0 && totalPodiums >= 5) {
      console.log('   🏆 TROPHY COLLECTOR! 5+ podium finishes');
      updateData['awards.trophyCollector'] = 1;
      eventResults.earnedAwards.push({ awardId: 'trophyCollector', category: 'performance', intensity: 'moderate' });
    }
  }

  // WEEKEND WARRIOR - Complete 5+ events (one-time award)
  const totalEventsCompleted = (userData.totalEvents || 0) + 1;
  const currentWeekendWarrior = userData.awards?.weekendWarrior || 0;
  if (currentWeekendWarrior === 0 && totalEventsCompleted >= 5) {
    console.log('   🏁 WEEKEND WARRIOR! 5+ events completed');
    updateData['awards.weekendWarrior'] = 1;
    eventResults.earnedAwards.push({ awardId: 'weekendWarrior', category: 'performance', intensity: 'moderate' });
  }

  // OVERRATED - Finish worse than predicted 5+ times (one-time award)
  if (!isDNF && predictedPosition && position > predictedPosition) {
    let worseThanPredicted = 1;
    for (let i = 1; i <= 15; i++) {
      const evtData = userData[`event${i}Results`];
      if (evtData && evtData.position && evtData.predictedPosition &&
          evtData.position > evtData.predictedPosition) {
        worseThanPredicted++;
      }
    }
    const currentOverrated = userData.awards?.overrated || 0;
    if (currentOverrated === 0 && worseThanPredicted >= 5) {
      console.log('   📉 OVERRATED! Finished worse than predicted 5+ times');
      updateData['awards.overrated'] = 1;
      eventResults.earnedAwards.push({ awardId: 'overrated', category: 'event_special', intensity: 'subtle' });
    }
  }

  // TECHNICAL ISSUES - DNF 3+ times (one-time award)
  if (isDNF) {
    let dnfCount = 1;
    for (let i = 1; i <= 15; i++) {
      const evtData = userData[`event${i}Results`];
      if (evtData && (evtData.position === null || evtData.position === 'DNF')) {
        dnfCount++;
      }
    }
    const currentTechnicalIssues = userData.awards?.technicalIssues || 0;
    if (currentTechnicalIssues === 0 && dnfCount >= 3) {
      console.log('   🔧 TECHNICAL ISSUES! 3+ DNFs');
      updateData['awards.technicalIssues'] = 1;
      eventResults.earnedAwards.push({ awardId: 'technicalIssues', category: 'event_special', intensity: 'subtle' });
    }
  }

  // Special Event Awards
  // Use parseInt for type-safe comparison (eventNumber may be string from some sources)
  const eventNum = parseInt(eventNumber);
  console.log(`   Special event check: eventNumber=${eventNumber} (type: ${typeof eventNumber}), parsed=${eventNum}`);

  // The Equalizer - awarded for completing The Leveller (event 102)
  if (eventNum === 102) {
    console.log('   🎚️ THE LEVELLER completed! Awarding The Equalizer');
    updateData['awards.theEqualizer'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'theEqualizer', category: 'event_special', intensity: 'moderate' });
  }

  // Singapore Sling - awarded for podium at Singapore Criterium (event 101)
  if (eventNum === 101 && position <= 3 && !isDNF) {
    console.log('   🍸 SINGAPORE CRITERIUM podium! Awarding Singapore Sling');
    updateData['awards.singaporeSling'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'singaporeSling', category: 'event_special', intensity: 'flashy' });
  }

  // GC trophies (only on Event 15 - final tour stage)
  if (eventNumber === 15 && gcAwards) {
    if (gcAwards.gcGoldMedal) {
      console.log('   🏆 GC WINNER! Awarding GC Gold trophy');
      updateData['awards.gcGold'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcGoldMedal', category: 'gc', intensity: 'flashy' });
    }
    if (gcAwards.gcSilverMedal) {
      console.log('   🥈 GC SECOND! Awarding GC Silver trophy');
      updateData['awards.gcSilver'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcSilverMedal', category: 'gc', intensity: 'flashy' });
    }
    if (gcAwards.gcBronzeMedal) {
      console.log('   🥉 GC THIRD! Awarding GC Bronze trophy');
      updateData['awards.gcBronze'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcBronzeMedal', category: 'gc', intensity: 'flashy' });
    }
  }

  // Add GC results to eventResults for display
  if (gcResults) {
    eventResults.gcResults = {
      standings: gcResults.standings,
      userGCPosition: gcResults.userGC?.gcPosition || null,
      userGCTime: gcResults.userGC?.cumulativeTime || null,
      userGCGap: gcResults.userGC?.gapToLeader || null,
      stagesIncluded: gcResults.stagesIncluded,
      isProvisional: gcResults.isProvisional
    };
  }

  // Calculate Cadence Credits
  let earnedCC = 0;
  const awardList = [];

  if (!isDNF) {
    // Podium medals
    if (position === 1) { earnedCC += AWARD_CREDIT_MAP.goldMedal || 0; awardList.push('goldMedal'); }
    if (position === 2) { earnedCC += AWARD_CREDIT_MAP.silverMedal || 0; awardList.push('silverMedal'); }
    if (position === 3) { earnedCC += AWARD_CREDIT_MAP.bronzeMedal || 0; awardList.push('bronzeMedal'); }

    // Special medals
    if (earnedPunchingMedal) { earnedCC += AWARD_CREDIT_MAP.punchingMedal || 0; awardList.push('punchingMedal'); }
    if (earnedGiantKillerMedal) { earnedCC += AWARD_CREDIT_MAP.giantKillerMedal || 0; awardList.push('giantKillerMedal'); }
    if (earnedBullseyeMedal) { earnedCC += AWARD_CREDIT_MAP.bullseyeMedal || 0; awardList.push('bullseyeMedal'); }
    if (earnedHotStreakMedal) { earnedCC += AWARD_CREDIT_MAP.hotStreakMedal || 0; awardList.push('hotStreakMedal'); }
    if (earnedDomination) { earnedCC += AWARD_CREDIT_MAP.domination || 0; awardList.push('domination'); }
    if (earnedCloseCall) { earnedCC += AWARD_CREDIT_MAP.closeCall || 0; awardList.push('closeCall'); }
    if (earnedPhotoFinish) { earnedCC += AWARD_CREDIT_MAP.photoFinish || 0; awardList.push('photoFinish'); }
    if (earnedDarkHorse) { earnedCC += AWARD_CREDIT_MAP.darkHorse || 0; awardList.push('darkHorse'); }
    if (earnedZeroToHero) { earnedCC += AWARD_CREDIT_MAP.zeroToHero || 0; awardList.push('zeroToHero'); }
    if (earnedWindTunnel) { earnedCC += AWARD_CREDIT_MAP.windTunnel || 0; awardList.push('windTunnel'); }
    if (earnedTheAccountant) { earnedCC += AWARD_CREDIT_MAP.theAccountant || 0; awardList.push('theAccountant'); }
    if (earnedLanternRouge) { earnedCC += AWARD_CREDIT_MAP.lanternRouge || 0; awardList.push('lanternRouge'); }
    if (earnedComeback) { earnedCC += AWARD_CREDIT_MAP.comeback || 0; awardList.push('comeback'); }

    // Power awards CC
    if (earnedPowerSurge) { earnedCC += AWARD_CREDIT_MAP.powerSurge || 25; awardList.push('powerSurge'); }
    if (earnedSteadyEddie) { earnedCC += AWARD_CREDIT_MAP.steadyEddie || 30; awardList.push('steadyEddie'); }
    if (earnedBlastOff) { earnedCC += AWARD_CREDIT_MAP.blastOff || 50; awardList.push('blastOff'); }
  }

  // Special event awards CC (use parseInt for type-safe comparison)
  if (parseInt(eventNumber) === 102) {
    earnedCC += AWARD_CREDIT_MAP.theEqualizer || 0;
    awardList.push('theEqualizer');
  }
  if (parseInt(eventNumber) === 101 && position <= 3 && !isDNF) {
    earnedCC += AWARD_CREDIT_MAP.singaporeSling || 0;
    awardList.push('singaporeSling');
  }

  // GC awards CC (only on event 15)
  if (parseInt(eventNumber) === 15 && gcAwards) {
    if (gcAwards.gcGoldMedal) { earnedCC += AWARD_CREDIT_MAP.gcGoldMedal || 0; awardList.push('gcGoldMedal'); }
    if (gcAwards.gcSilverMedal) { earnedCC += AWARD_CREDIT_MAP.gcSilverMedal || 0; awardList.push('gcSilverMedal'); }
    if (gcAwards.gcBronzeMedal) { earnedCC += AWARD_CREDIT_MAP.gcBronzeMedal || 0; awardList.push('gcBronzeMedal'); }
  }

  // Special case: The Leveller (theEqualizer) always gets completion bonus on top of award
  // For all other events, completion bonus is only given if no awards earned
  const hasTheEqualizer = awardList.includes('theEqualizer');

  if (hasTheEqualizer) {
    // The Leveller: 30CC award + 20CC completion bonus = 50CC total
    earnedCC += COMPLETION_BONUS_CC;
  } else if (awardList.length === 0 && !isDNF) {
    // Other events: completion bonus only if no awards
    earnedCC = COMPLETION_BONUS_CC;
  }

  // Cap credits
  earnedCC = Math.min(earnedCC, PER_EVENT_CREDIT_CAP);
  updateData.cadenceCredits = admin.firestore.FieldValue.increment(earnedCC);

  // Check for season completion and award season trophies
  const earnedSeasonAwards = await checkAndMarkSeasonComplete(
    userRef, userData, eventNumber, updateData, seasonStandings
  );
  if (earnedSeasonAwards && earnedSeasonAwards.length > 0) {
    console.log(`   Adding ${earnedSeasonAwards.length} season award(s) to event${eventNumber}Results`);
    eventResults.earnedAwards.push(...earnedSeasonAwards);
    updateData[`event${eventNumber}Results`] = eventResults;
  }

  // Update user document
  await userRef.update(updateData);

  console.log(`   ✅ Processed: Position ${isDNF ? 'DNF' : position}, Points: ${points}, CC: ${earnedCC}`);
  if (userResult.AvgPower) {
    console.log(`   ⚡ Power: Avg ${userResult.AvgPower}W, NP ${userResult.NrmPower}W, Max ${userResult.MaxPower}W`);
  }

  // Return unlock data for updateResultsSummary
  return { unlockBonusPoints, unlockBonusesApplied };
}

/**
 * Extract race date from a JSON file for sorting
 */
function getRaceDateFromFile(filePath) {
  try {
    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const parsedJson = JSON.parse(jsonContent);

    if (parsedJson.metadata && parsedJson.metadata.raceDate) {
      return new Date(parsedJson.metadata.raceDate).getTime();
    }

    // Fallback: try to extract date from filename (format: YYYYMMDD_HHMMSS)
    const match = filePath.match(/_(\d{8})_(\d{6})\.json$/);
    if (match) {
      const dateStr = match[1];
      const timeStr = match[2];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = timeStr.substring(0, 2);
      const min = timeStr.substring(2, 4);
      const sec = timeStr.substring(4, 6);
      return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`).getTime();
    }

    return Date.now(); // Default to now if no date found
  } catch (error) {
    console.warn(`   ⚠️ Could not extract date from ${filePath}: ${error.message}`);
    return Date.now();
  }
}

/**
 * Main processing function for JSON files
 */
async function processJSONResults(jsonFiles) {
  console.log(`\n🔷 Processing ${jsonFiles.length} JSON file(s)...`);

  // Sort files by race date (chronological order) to ensure proper stage progression
  console.log(`\n📅 Sorting files by race date...`);
  const filesWithDates = jsonFiles.map(filePath => ({
    filePath,
    raceDate: getRaceDateFromFile(filePath)
  }));

  filesWithDates.sort((a, b) => a.raceDate - b.raceDate);

  const sortedFiles = filesWithDates.map(f => f.filePath);
  console.log(`   Sorted order:`);
  filesWithDates.forEach((f, i) => {
    console.log(`   ${i + 1}. ${new Date(f.raceDate).toISOString()} - ${f.filePath.split('/').pop()}`);
  });

  for (const filePath of sortedFiles) {
    try {
      console.log(`\n📄 Processing: ${filePath}`);

      const eventInfo = parseEventPath(filePath);
      console.log(`   Season ${eventInfo.season}, Event ${eventInfo.event}`);

      // Read and parse JSON
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const parsedJson = JSON.parse(jsonContent);

      // Handle both formats: wrapped {metadata, results} or flat array
      let rawResults;
      let jsonMetadata = null;
      if (parsedJson.metadata && Array.isArray(parsedJson.results)) {
        // New format with metadata wrapper
        rawResults = parsedJson.results;
        jsonMetadata = parsedJson.metadata;
        console.log(`   📦 JSON format: wrapped (with metadata)`);
        if (jsonMetadata.raceDate) {
          console.log(`   📅 Race date from metadata: ${jsonMetadata.raceDate}`);
        }
      } else if (Array.isArray(parsedJson)) {
        // Old format: flat array
        rawResults = parsedJson;
        console.log(`   📦 JSON format: flat array`);
      } else {
        throw new Error('Invalid JSON format: expected array or {metadata, results}');
      }

      const allResults = parseJSON(rawResults);

      console.log(`   Found ${allResults.length} total results in JSON`);

      if (hasPowerData(allResults)) {
        console.log(`   ⚡ Power data available`);
      }

      // Group results by pen - each pen is a separate race
      const resultsByPen = {};
      allResults.forEach(r => {
        const pen = r.Pen || 1;
        if (!resultsByPen[pen]) resultsByPen[pen] = [];
        resultsByPen[pen].push(r);
      });

      const penNumbers = Object.keys(resultsByPen).map(p => parseInt(p)).sort((a, b) => a - b);
      console.log(`   Found ${penNumbers.length} pen(s): ${penNumbers.join(', ')}`);

      // Filter to pens with at least one human rider
      const pensWithHumans = penNumbers.filter(pen => {
        const penResults = resultsByPen[pen];
        return penResults.some(r => !r.IsBot);
      });

      if (pensWithHumans.length === 0) {
        console.log(`   ⚠️ No pens with human riders found, skipping file`);
        continue;
      }

      console.log(`   Processing ${pensWithHumans.length} pen(s) with human riders: ${pensWithHumans.join(', ')}`);

      // Use raceDate from metadata if available, otherwise use current time
      let raceTimestamp;
      if (jsonMetadata && jsonMetadata.raceDate) {
        raceTimestamp = new Date(jsonMetadata.raceDate).getTime();
        console.log(`   Using race date from metadata: ${jsonMetadata.raceDate}`);
      } else {
        raceTimestamp = Date.now();
        console.log(`   Using current time as race timestamp`);
      }

      // Process each pen as a separate race
      for (const penNumber of pensWithHumans) {
        const penResults = resultsByPen[penNumber];
        console.log(`\n   🏁 Processing Pen ${penNumber} (${penResults.length} riders)`);

        // Find human UIDs in this pen
        const humanUids = penResults
          .filter(r => !r.IsBot)
          .map(r => r.UID)
          .filter((uid, index, self) => uid && self.indexOf(uid) === index);

        console.log(`      Human racer(s) in pen: ${humanUids.join(', ')}`);

        // Process each human's result within this pen's context
        for (const uid of humanUids) {
          // Pass penResults (not allResults) so calculations are pen-specific
          const { unlockBonusPoints, unlockBonusesApplied } = await processUserResult(uid, eventInfo, penResults, raceTimestamp);

          // Update results summary for this user with pen-specific results
          await updateResultsSummary(eventInfo.season, eventInfo.event, penResults, uid, unlockBonusPoints || 0, unlockBonusesApplied || []);
        }
      }

      // Rename JSON to include timestamp
      const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')
        .replace(/\..+/, '')
        .replace('T', '_');

      const hasTimestamp = /(_\d{8}_\d{6})\.json$/.test(filePath);
      if (!hasTimestamp) {
        const newPath = filePath.replace(/\.json$/, `_${timestamp}.json`);
        try {
          fs.renameSync(filePath, newPath);
          console.log(`   📅 Renamed to: ${path.basename(newPath)}`);
        } catch (renameError) {
          console.log(`   ⚠️ Could not rename: ${renameError.message}`);
        }
      }

      // Update bot ARRs based on race results
      try {
        await updateBotARRs(eventInfo.season, eventInfo.event, allResults);
      } catch (botArrError) {
        console.error(`   ⚠️ Bot ARR update error: ${botArrError.message}`);
      }

      // Process any pending bot profile requests
      try {
        await processBotProfileRequests();
      } catch (botProfileError) {
        console.error(`   ⚠️ Bot profile request error: ${botProfileError.message}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  console.log('\n✅ All JSON results processed!');
}

// ================== RESULTS SUMMARY DOCUMENT ==================

/**
 * Update results summary document for event-detail display
 * This stores all results per-user for displaying full race results
 */
async function updateResultsSummary(season, event, results, userUid, unlockBonusPoints = 0, unlockBonusesApplied = []) {
  const summaryRef = db.collection('results').doc(`season${season}_event${event}_${userUid}`);

  // Calculate predictions for all results
  const calculatePredictedPositionForResult = (uid) => {
    const finishers = results.filter(r =>
      r.Position !== 'DNF' &&
      r.EventRating &&
      !isNaN(parseInt(r.EventRating))
    );
    finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
    const predictedIndex = finishers.findIndex(r => r.UID === uid);
    return predictedIndex === -1 ? null : predictedIndex + 1;
  };

  // Check Giant Killer for each result
  const checkGiantKillerForResult = (uid, position) => {
    const result = results.find(r => r.UID === uid);
    if (!result || result.Position === 'DNF' || !result.EventRating) {
      return false;
    }

    const finishers = results.filter(r =>
      r.Position !== 'DNF' &&
      r.EventRating &&
      !isNaN(parseInt(r.EventRating))
    );

    if (finishers.length === 0) return false;

    finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
    const giant = finishers[0];

    if (giant.UID === uid) return false;

    const giantPosition = parseInt(giant.Position);
    return position < giantPosition;
  };

  // Filter valid results (include DNFs at the end)
  const finishedResults = results
    .filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)))
    .map(r => {
      const position = parseInt(r.Position);
      const predictedPosition = calculatePredictedPositionForResult(r.UID);
      const pointsResult = calculatePoints(position, event, predictedPosition);
      const { points, bonusPoints } = pointsResult;

      let earnedPunchingMedal = false;
      if (predictedPosition) {
        const placesBeaten = predictedPosition - position;
        earnedPunchingMedal = placesBeaten >= 10;
      }

      const earnedGiantKillerMedal = checkGiantKillerForResult(r.UID, position);

      // Calculate time-based awards
      const times = awardsCalc.getTimesFromResults(
        results.map(res => ({
          position: parseInt(res.Position),
          time: parseFloat(res.Time)
        })).filter(res => !isNaN(res.position)),
        position
      );

      // Time-based awards should NOT be awarded for:
      // - Event 3: Elimination race (times don't reflect racing)
      // - Time-based events (e.g., Event 4): All riders finish at the same clock time
      const isTimeIrrelevant = event === 3 || TIME_BASED_EVENTS.includes(event);

      const earnedDomination = isTimeIrrelevant ? false : awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
      const earnedCloseCall = isTimeIrrelevant ? false : awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
      const earnedPhotoFinish = isTimeIrrelevant ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime, times.secondPlaceTime);

      const earnedDarkHorse = awardsCalc.checkDarkHorse(position, predictedPosition);

      // Wind Tunnel: top 5 in time trial when predicted outside top 5
      const eventType = EVENT_TYPES[event] || 'road race';
      const earnedWindTunnel = awardsCalc.checkWindTunnel(position, predictedPosition, eventType);

      // The Accountant: more points than the rider who crossed the line first in points race
      let earnedTheAccountant = false;
      if (eventType === 'points race') {
        const userEventPoints = parseInt(r.Points) || 0;
        const userTime = parseFloat(r.Time) || 0;
        earnedTheAccountant = awardsCalc.checkTheAccountant(userTime, userEventPoints, results);
      }

      // For current user, include unlock bonus points
      const isCurrentUser = r.UID === userUid;
      const userUnlockBonus = isCurrentUser ? unlockBonusPoints : 0;

      return {
        position: position,
        name: r.Name || null,
        uid: r.UID || null,
        team: r.Team || '',
        arr: parseInt(r.ARR) || 0,
        arrBand: r.ARRBand || '',
        eventRating: parseInt(r.EventRating) || null,
        predictedPosition: predictedPosition,
        time: parseFloat(r.Time) || 0,
        distance: parseFloat(r.Distance) || 0,
        points: points + userUnlockBonus,
        bonusPoints: bonusPoints + userUnlockBonus,
        unlockBonusPoints: userUnlockBonus,
        unlockBonusesApplied: isCurrentUser ? unlockBonusesApplied : [],
        earnedPunchingMedal: earnedPunchingMedal,
        earnedGiantKillerMedal: earnedGiantKillerMedal,
        earnedDomination: earnedDomination,
        earnedCloseCall: earnedCloseCall,
        earnedPhotoFinish: earnedPhotoFinish,
        earnedDarkHorse: earnedDarkHorse,
        earnedWindTunnel: earnedWindTunnel,
        earnedTheAccountant: earnedTheAccountant,
        eventPoints: parseInt(r.Points) || null,
        isBot: isBot(r.UID, r.Gender),
        // Power data (JSON-only fields)
        avgPower: r.AvgPower || null,
        maxPower: r.MaxPower || null,
        nrmPower: r.NrmPower || null,
        avgHr: r.AvgHR || null,
        maxHr: r.MaxHR || null
      };
    });

  // Include DNF results at the end
  const dnfResults = results
    .filter(r => r.Position === 'DNF')
    .map(r => {
      const isCurrentUser = r.UID === userUid;
      return {
        position: 'DNF',
        name: r.Name || null,
        uid: r.UID || null,
        team: r.Team || '',
        arr: parseInt(r.ARR) || 0,
        arrBand: r.ARRBand || '',
        eventRating: parseInt(r.EventRating) || null,
        predictedPosition: null,
        time: null,
        distance: parseFloat(r.Distance) || 0,
        points: 0,
        bonusPoints: 0,
        unlockBonusPoints: 0,
        unlockBonusesApplied: [],
        earnedPunchingMedal: false,
        earnedGiantKillerMedal: false,
        earnedDomination: false,
        earnedCloseCall: false,
        earnedPhotoFinish: false,
        earnedDarkHorse: false,
        earnedWindTunnel: false,
        earnedTheAccountant: false,
        eventPoints: null,
        isBot: isBot(r.UID, r.Gender),
        isDNF: true,
        // Power data (null for DNFs)
        avgPower: null,
        maxPower: null,
        nrmPower: null,
        avgHr: null,
        maxHr: null
      };
    });

  // Combine finishers and DNFs (DNFs at end)
  const validResults = [...finishedResults, ...dnfResults];

  // Check if results have power data
  const resultsHavePowerData = results.some(r => r.AvgPower || r.MaxPower || r.NrmPower);

  try {
    await summaryRef.set({
      season: season,
      event: event,
      userUid: userUid,
      totalParticipants: finishedResults.length,
      totalDNFs: dnfResults.length,
      hasPowerData: resultsHavePowerData,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      results: validResults
    });
    console.log(`   ✅ Updated results summary for season ${season} event ${event}`);
  } catch (summaryError) {
    console.error(`   ⚠️ Failed to update results summary for ${userUid}: ${summaryError.message}`);
  }
}

// Main execution
(async () => {
  try {
    const filesArg = process.argv[2];
    const jsonFiles = JSON.parse(filesArg);

    if (!jsonFiles || jsonFiles.length === 0) {
      console.log('No JSON files to process');
      process.exit(0);
    }

    await processJSONResults(jsonFiles);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

module.exports = { processJSONResults, calculatePoints };
