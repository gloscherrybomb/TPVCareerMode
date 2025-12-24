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
const { EVENT_NAMES, EVENT_TYPES, OPTIONAL_EVENTS, STAGE_REQUIREMENTS } = require('./event-config');
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
 */
function checkGiantKiller(results, userUid) {
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF' || !userResult.EventRating) return false;

  const userPosition = parseInt(userResult.Position);
  if (isNaN(userPosition)) return false;

  const finishers = results.filter(r =>
    r.Position !== 'DNF' && r.EventRating && !isNaN(parseInt(r.EventRating))
  );
  if (finishers.length === 0) return false;

  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  const giant = finishers[0];
  if (giant.UID === userUid) return false;

  return userPosition < parseInt(giant.Position);
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
    // Query interviews for this user, ordered by event number descending
    const interviewsSnapshot = await db.collection('interviews')
      .where('userId', '==', userId)
      .orderBy('eventNumber', 'desc')
      .limit(1)
      .get();

    if (interviewsSnapshot.empty) {
      console.log(`   ⚠️ No interview documents found for user ${userId}`);
      return null;
    }

    const latestInterview = interviewsSnapshot.docs[0].data();
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

  switch (unlockId) {
    case 'paceNotes':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: Math.abs(predictedPosition - position) <= 5,
        reason: 'Finished within +/-5 places of prediction'
      };
    case 'teamCarRecon':
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
      return {
        triggered: position <= 5 || (position <= 10 && typeof marginToWinner === 'number' && marginToWinner < 20),
        reason: 'Top 5, or top 10 within 20s'
      };
    case 'tightPackWin': {
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
 * Finds all bots within 30 seconds of user's time (or 500m for time challenges)
 * For Event 3 (elimination race), skip entirely as times are meaningless
 * For Event 4 (time challenge), use distance-based detection since all riders finish at the same time
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

  // For time challenge (Event 4), use distance-based rival detection
  if (eventNumber === 4) {
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
          timeGap: 0, // Not meaningful for time challenge
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
        totalGap: encounter.timeGap,
        avgGap: encounter.timeGap,
        closestGap: encounter.timeGap,
        lastRace: eventNumber
      };
    } else {
      // Entry already exists - check if this is a new race or reprocessing the same race
      const botData = rivalData.encounters[botUid];
      const isNewRace = botData.lastRace !== eventNumber;

      if (isNewRace) {
        // This is a new race with this rival - increment counters
        botData.races += 1;
        botData.totalGap += encounter.timeGap;

        if (encounter.userFinishedAhead) {
          botData.userWins += 1;
        } else {
          botData.botWins += 1;
        }
      } else {
        // Reprocessing same event - recalculate the gap for this race
        // Remove old contribution and add new one
        const oldContribution = botData.totalGap / botData.races;
        botData.totalGap = botData.totalGap - oldContribution + encounter.timeGap;
      }

      // Update derived stats and metadata
      botData.avgGap = botData.totalGap / botData.races;
      botData.closestGap = Math.min(botData.closestGap, encounter.timeGap);
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
 */
function identifyTopRivals(rivalData) {
  if (!rivalData || !rivalData.encounters) {
    return [];
  }

  // Calculate rivalry score for each bot
  const rivalScores = Object.keys(rivalData.encounters).map(botUid => {
    const data = rivalData.encounters[botUid];

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
  const topRivals = rivalScores
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
 * For elimination races (event 3) and time trials (event 4), margin isn't meaningful
 */
function calculateBiggestWinMargin(position, results, eventNumber, currentBiggest) {
  if (position !== 1) return currentBiggest;

  // For elimination races and time trials, margin isn't meaningful
  const isTimeIrrelevant = eventNumber === 3 || eventNumber === 4;

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
 * Calculate General Classification (GC) for stage race (events 13, 14, 15)
 */
async function calculateGC(season, userUid, upToEvent = 15, currentUserResult = null) {
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
        console.log(`   Event ${eventNum}: Found ${uniqueResults.length} riders`);
      }
    } catch (error) {
      console.log(`   Warning: Could not fetch results for event ${eventNum}:`, error.message);
    }
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
      rider.actualStages.add(eventNum);
      rider.stageResults[eventNum] = { position: r.position, time: parseFloat(r.time) || 0, isActual: true };
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

  allRiders.forEach((rider, uid) => {
    if (rider.isBot && !botDNS.has(uid)) {
      stageNumbers.forEach(eventNum => {
        if (!rider.actualStages.has(eventNum)) {
          const fieldSize = stageResults[eventNum]?.length || 50;
          const simulatedPosition = simulatePosition(uid, rider.arr, eventNum, fieldSize);

          const actualTimes = stageResults[eventNum]
            ?.filter(r => r.time && r.position !== 'DNF')
            .map(r => parseFloat(r.time))
            .sort((a, b) => a - b) || [3600];

          const medianTime = actualTimes[Math.floor(actualTimes.length / 2)] || 3600;
          const maxTime = actualTimes[actualTimes.length - 1] || 4000;
          const positionRatio = (simulatedPosition - 1) / fieldSize;
          const simulatedTime = medianTime + (maxTime - medianTime) * positionRatio;

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

      stageNumbers.forEach(eventNum => {
        const result = rider.stageResults[eventNum];
        if (result) {
          cumulativeTime += result.time;
          if (result.isActual) actualStagesCount++;
        }
      });

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

    const isTimeIrrelevant = eventNumber === 3 || eventNumber === 4;
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
    gcResults = await calculateGC(1, uid, eventNumber, currentUserResult);

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
        topRivals: userData.rivalData?.topRivals || [],
        rivalEncounters: []
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
    stageNumber: currentStage,
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
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

  // Calculate rival encounters (must be before user document update)
  // userTime already defined above for margin calculations
  const rivalEncounters = calculateRivalEncounters(results, uid, position, userTime, eventNumber, distance);

  // Update rival data
  const existingRivalData = userData.rivalData || null;
  const updatedRivalData = updateRivalData(existingRivalData, rivalEncounters, eventNumber);

  // Identify top 10 rivals
  const topRivals = identifyTopRivals(updatedRivalData);
  updatedRivalData.topRivals = topRivals;

  // Log rival encounters
  if (rivalEncounters.length > 0) {
    const proximityDesc = eventNumber === 4 ? 'within 500m' : 'within 30 seconds';
    console.log(`   🤝 Rival encounters: ${rivalEncounters.length} bot(s) ${proximityDesc}`);
  }

  // Add rival encounters to eventResults for potential story generation
  eventResults.rivalEncounters = rivalEncounters;

  // ================== STORY GENERATION ==================
  // Calculate context needed for story generation
  const completedEventNumbers = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`]) {
      completedEventNumbers.push(i);
    }
  }

  // Recent results for form analysis
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

  // Prepare update object
  const updateData = {
    [`event${eventNumber}Results`]: eventResults,
    totalPoints: admin.firestore.FieldValue.increment(points),
    powerRecords: updatedPowerRecords,
    rivalData: updatedRivalData,
    lifetimeStats: newLifetimeStats
  };

  // Stage progression (only for non-special events)
  if (!isSpecialEventResult) {
    updateData.currentStage = nextStage;
    updateData.usedOptionalEvents = newUsedOptionalEvents;
    updateData.tourProgress = newTourProgress;
  }

  // Update unlock cooldowns
  updateData['unlocks.cooldowns'] = newCooldowns;

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
      eventResults.earnedAwards.push({ awardId: 'powerSurge', category: 'power', intensity: 'moderate' });
    }
    if (earnedSteadyEddie) {
      updateData['awards.steadyEddie'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'steadyEddie', category: 'power', intensity: 'moderate' });
    }
    if (earnedBlastOff) {
      updateData['awards.blastOff'] = admin.firestore.FieldValue.increment(1);
      updateData.hasEarnedBlastOff = true;  // Prevent earning again
      eventResults.earnedAwards.push({ awardId: 'blastOff', category: 'power', intensity: 'flashy' });
    }
  }

  // Special Event Awards
  // The Equalizer - awarded for completing The Leveller (event 102)
  if (eventNumber === 102) {
    console.log('   🎚️ THE LEVELLER completed! Awarding The Equalizer');
    updateData['awards.theEqualizer'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'theEqualizer', category: 'special_event', intensity: 'moderate' });
  }

  // Singapore Sling - awarded for podium at Singapore Criterium (event 101)
  if (eventNumber === 101 && position <= 3 && !isDNF) {
    console.log('   🍸 SINGAPORE CRITERIUM podium! Awarding Singapore Sling');
    updateData['awards.singaporeSling'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'singaporeSling', category: 'special_event', intensity: 'high' });
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

  // Special event awards CC
  if (eventNumber === 102) {
    earnedCC += AWARD_CREDIT_MAP.theEqualizer || 0;
    awardList.push('theEqualizer');
  }
  if (eventNumber === 101 && position <= 3 && !isDNF) {
    earnedCC += AWARD_CREDIT_MAP.singaporeSling || 0;
    awardList.push('singaporeSling');
  }

  // GC awards CC (only on event 15)
  if (eventNumber === 15 && gcAwards) {
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
 * Main processing function for JSON files
 */
async function processJSONResults(jsonFiles) {
  console.log(`\n🔷 Processing ${jsonFiles.length} JSON file(s)...`);

  for (const filePath of jsonFiles) {
    try {
      console.log(`\n📄 Processing: ${filePath}`);

      const eventInfo = parseEventPath(filePath);
      console.log(`   Season ${eventInfo.season}, Event ${eventInfo.event}`);

      // Read and parse JSON
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const rawResults = JSON.parse(jsonContent);
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

      const raceTimestamp = Date.now();

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
      // - Event 4: Time challenge (everyone does the same target time)
      const isTimeIrrelevant = event === 3 || event === 4;

      const earnedDomination = isTimeIrrelevant ? false : awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
      const earnedCloseCall = isTimeIrrelevant ? false : awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
      const earnedPhotoFinish = isTimeIrrelevant ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime);

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
