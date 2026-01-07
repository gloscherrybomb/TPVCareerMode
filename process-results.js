// process-results.js - Process race results CSVs and update Firestore

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const admin = require('firebase-admin');
const awardsCalc = require('./awards-calculation');
const storyGen = require('./story-generator');
const { AWARD_CREDIT_MAP, PER_EVENT_CREDIT_CAP, COMPLETION_BONUS_CC } = require('./currency-config');
const { UNLOCK_DEFINITIONS, getUnlockById } = require('./unlock-config');
const { EVENT_NAMES, EVENT_TYPES, OPTIONAL_EVENTS, STAGE_REQUIREMENTS, TIME_BASED_EVENTS } = require('./event-config');

// Import narrative system modules
const { NARRATIVE_DATABASE } = require('./narrative-database.js');
const { StorySelector } = require('./story-selector.js');
// Note: story-generator.js v3.0 has all functionality - unified-story-generator.js no longer needed

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

/**
 * Recover personality from interview history if missing from user document.
 * This handles cases where user data was reset but interview records remain.
 * @param {string} userId - The TPV UID of the user
 * @param {Object} userData - Current user data from Firestore
 * @param {FirebaseFirestore.DocumentReference} userRef - Reference to user document
 * @returns {Object} - The recovered/existing personality object
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

/**
 * Determine performance tier from position
 */
function determinePerformanceTier(position) {
  if (position === 1) return 'win';
  if (position <= 3) return 'podium';
  if (position <= 10) return 'top10';
  if (position <= 20) return 'midpack';
  return 'back';
}

// EVENT_TYPES imported from event-config.js

/**
 * Determine event category based on event type
 */
function getEventCategory(eventType) {
  if (eventType === 'criterium') return 'criterium';
  if (eventType === 'time trial') return 'time trial';
  if (eventType === 'track elimination' || eventType === 'points race') return 'track';
  if (eventType === 'hill climb') return 'climbing';
  if (eventType === 'gravel race') return 'gravel';
  return 'road'; // Default for road race, gran fondo, etc.
}

// STAGE_REQUIREMENTS and OPTIONAL_EVENTS imported from event-config.js

// EVENT_NAMES imported from event-config.js

/**
 * Calculate biggest giant beaten from race results
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
 * so we store 0 margin - they'll only show as biggest win if no other wins exist
 */
function calculateBiggestWinMargin(position, results, eventNumber, currentBiggest) {
  if (position !== 1) return currentBiggest;

  // For elimination races and time-based events, margin isn't meaningful
  // Store with 0 margin so they don't compete with real margin-based wins
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

/**
 * Check if an event is a special event (not part of regular season progression)
 */
function isSpecialEvent(eventNumber) {
  // Special events are event IDs > 100 (e.g., 101 = Singapore Criterium)
  return eventNumber > 100;
}

/**
 * Check if an event is valid for a given stage
 */
function isEventValidForStage(eventNumber, currentStage, usedOptionalEvents = [], tourProgress = {}) {
  // Special events are always valid but don't affect season progression
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
    return { valid: false, reason: `Stage ${currentStage} requires event ${stageReq.eventId}, not event ${eventNumber}` };
  }
  
  if (stageReq.type === 'choice') {
    if (!stageReq.eventIds.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} is not a valid choice for stage ${currentStage}` };
    }
    if (usedOptionalEvents.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} has already been used in a previous stage` };
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
      return { valid: false, reason: `Local Tour must be completed in order. Expected event ${nextExpected}` };
    }
    
    return { valid: true, isTour: true };
  }
  
  return { valid: false, reason: 'Unknown stage type' };
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
 * Check if two dates are consecutive days
 */
function areConsecutiveDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const d1Start = new Date(Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate()));
  const d2Start = new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate()));
  
  const diffTime = d2Start.getTime() - d1Start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}

/**
 * Calculate next stage after completing current stage
 */
function calculateNextStage(currentStage, tourProgress = {}) {
  if (currentStage < 9) {
    return currentStage + 1;
  }
  
  // Stage 9 is the tour finale - stay at 9 regardless of completion status
  // Season completion is tracked separately via the season1Complete flag
  if (currentStage >= 9) {
    return 9;
  }

  return currentStage;
}

/**
 * Parse folder path to extract season and event number
 * Example: race_results/season_1/event_1/results.csv -> { season: 1, event: 1 }
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
 * Extract timestamp from filename if present
 * Pattern: _YYYYMMDD_HHMMSS.csv
 * Example: results_20241204_103045.csv -> 2024-12-04T10:30:45.000Z
 * Returns null if no timestamp found
 */
function extractTimestampFromFilename(filePath) {
  const match = filePath.match(/_(\d{8})_(\d{6})\.csv$/);
  if (!match) {
    return null;
  }
  
  const dateStr = match[1]; // YYYYMMDD
  const timeStr = match[2]; // HHMMSS
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = timeStr.substring(0, 2);
  const minute = timeStr.substring(2, 4);
  const second = timeStr.substring(4, 6);
  
  // Construct ISO string and parse
  const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  const timestamp = new Date(isoString);
  
  return timestamp.getTime();
}

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
  // Special events (IDs > 100)
  102: 40  // The Leveller
};

/**
 * Calculate points based on finishing position using Career Mode formula
 * 
 * Formula: points = (maxPoints/2) + (40 - position) * ((maxPoints - 10)/78) + podiumBonus + bonusPoints
 * 
 * Podium bonuses:
 * - 1st place: +5
 * - 2nd place: +3
 * - 3rd place: +2
 * - Other: +0
 * 
 * Bonus points for beating EventRating prediction:
 * - Beat by 1-2 places: +1 point
 * - Beat by 3-4 places: +2 points
 * - Beat by 5-6 places: +3 points
 * - Beat by 7-8 places: +4 points
 * - Beat by 9+ places: +5 points
 * 
 * Only positions 1-40 score points. Position > 40 or DNF = 0 points.
 */
function calculatePoints(position, eventNumber, predictedPosition) {
  // Get max points for this event
  const maxPoints = EVENT_MAX_POINTS[eventNumber];
  
  if (!maxPoints) {
    console.warn(`No max points defined for event ${eventNumber}, using 100`);
    return { points: Math.max(0, 100 - (position - 1) * 2), bonusPoints: 0 }; // Fallback
  }

  // Event 3 special case: 20-participant elimination race
  // Linear scaling from 50 (1st) to 10 (20th) with podium bonuses
  if (eventNumber === 3) {
    if (position > 20) {
      return { points: 0, bonusPoints: 0 };
    }

    // Base points: linear from 45 (pos 1) to 10 (pos 20)
    const basePoints = 45 - (position - 1) * (35 / 19);

    // Podium bonus
    let podiumBonus = 0;
    if (position === 1) podiumBonus = 5;
    else if (position === 2) podiumBonus = 3;
    else if (position === 3) podiumBonus = 2;

    // Calculate bonus points for beating prediction
    let bonusPoints = 0;
    if (predictedPosition) {
      const placesBeaten = predictedPosition - position;
      if (placesBeaten >= 9) bonusPoints = 5;
      else if (placesBeaten >= 7) bonusPoints = 4;
      else if (placesBeaten >= 5) bonusPoints = 3;
      else if (placesBeaten >= 3) bonusPoints = 2;
      else if (placesBeaten >= 1) bonusPoints = 1;
    }

    const totalPoints = Math.round(basePoints + podiumBonus + bonusPoints);
    return { points: totalPoints, bonusPoints };
  }

  // Only positions 1-40 score points (standard events)
  if (position > 40) {
    return { points: 0, bonusPoints: 0 };
  }

  // Calculate base points (standard formula)
  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  
  // Calculate podium bonus
  let podiumBonus = 0;
  if (position === 1) podiumBonus = 5;
  else if (position === 2) podiumBonus = 3;
  else if (position === 3) podiumBonus = 2;
  
  // Calculate bonus points for beating prediction
  let bonusPoints = 0;
  if (predictedPosition) {
    const placesBeaten = predictedPosition - position; // Positive if finished better than predicted
    
    if (placesBeaten >= 9) {
      bonusPoints = 5;
    } else if (placesBeaten >= 7) {
      bonusPoints = 4;
    } else if (placesBeaten >= 5) {
      bonusPoints = 3;
    } else if (placesBeaten >= 3) {
      bonusPoints = 2;
    } else if (placesBeaten >= 1) {
      bonusPoints = 1;
    }
  }
  
  // Total points (rounded to nearest integer)
  const totalPoints = Math.round(basePoints + podiumBonus + bonusPoints);
  
  return { points: totalPoints, bonusPoints };
}

/**
 * Calculate predicted position based on EventRating
 * Higher EventRating = better predicted position
 */
function calculatePredictedPosition(results, userUid) {
  // Filter out DNF results and sort by EventRating (descending)
  const finishers = results.filter(r => r.Position !== 'DNF' && r.EventRating && !isNaN(parseInt(r.EventRating)));
  
  // Sort by EventRating descending (highest rating = predicted 1st)
  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  
  // Find user's predicted position (1-indexed)
  const predictedIndex = finishers.findIndex(r => r.UID === userUid);
  
  if (predictedIndex === -1) {
    return null; // User not found or no EventRating
  }
  
  return predictedIndex + 1; // Return 1-indexed position
}

/**
 * Check if user earned Giant Killer medal by beating the highest-rated rider
 */
function checkGiantKiller(results, userUid) {
  // Find user's result
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF' || !userResult.EventRating) {
    return false;
  }
  
  const userPosition = parseInt(userResult.Position);
  if (isNaN(userPosition)) {
    return false;
  }
  
  // Find the rider with the highest EventRating (excluding DNFs)
  const finishers = results.filter(r => 
    r.Position !== 'DNF' && 
    r.EventRating && 
    !isNaN(parseInt(r.EventRating))
  );
  
  if (finishers.length === 0) {
    return false;
  }
  
  // Sort by EventRating descending
  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  
  // Get the "giant" (highest-rated rider)
  const giant = finishers[0];
  const giantPosition = parseInt(giant.Position);
  
  // Check if user beat the giant (finished ahead)
  // User must not BE the giant themselves
  if (giant.UID === userUid) {
    return false; // Can't be a giant killer if you're the giant!
  }
  
  return userPosition < giantPosition;
}

/**
 * Check if UID is a bot
 */
function isBot(uid, gender) {
  return gender === 'Bot' || !!(uid && uid.startsWith && uid.startsWith('Bot'));
}

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

/**
 * Get list of optional events the user has completed so far
 * Optional events are: 6, 7, 8, 9, 10, 11, 12 (events 6-12)
 * These can be completed at stages 3, 6, or 8
 * @param {Object} userData - User document data
 * @param {number} currentEventNumber - Current event being processed
 * @returns {Array<number>} Array of completed optional event numbers
 */
function getCompletedOptionalEvents(userData, currentEventNumber) {
  const OPTIONAL_EVENTS = [6, 7, 8, 9, 10, 11, 12];
  const completedOptionals = [];
  
  console.log(`Checking completed optional events for user (current event: ${currentEventNumber}):`);
  
  // Check each optional event to see if it's been completed
  for (const eventNum of OPTIONAL_EVENTS) {
    // If this event has results stored, it was completed
    if (userData[`event${eventNum}Results`]) {
      console.log(`  ✓ Event ${eventNum} completed`);
      completedOptionals.push(eventNum);
    }
  }
  
  // If we're currently processing an optional event, don't count it as "completed" yet
  // (since we're generating the story for completing it right now)
  const currentEventIndex = completedOptionals.indexOf(currentEventNumber);
  if (currentEventIndex !== -1) {
    console.log(`  ⚠️  Removing event ${currentEventNumber} (currently being processed)`);
    completedOptionals.splice(currentEventIndex, 1);
  }
  
  console.log(`  📊 Final completed optionals: [${completedOptionals.join(', ')}]`);
  
  return completedOptionals;
}

/**
 * Calculate General Classification (GC) for stage race (events 13, 14, 15)
 * Returns GC standings with cumulative times and awards
 * Can calculate partial GC (after stage 1 or 2) or final GC (after stage 3)
 * @param {number} season - Season number
 * @param {string} userUid - User's UID
 * @param {number} upToEvent - Event number to calculate GC through (13, 14, or 15)
 * @param {Object} currentUserResult - Current user's result (for stages not yet stored)
 * @param {Array} currentEventResults - Full results from current event (for stages not yet stored)
 */
async function calculateGC(season, userUid, upToEvent = 15, currentUserResult = null, currentEventResults = null) {
  console.log(`   Calculating GC through event ${upToEvent}...`);

  // Determine which stages to include
  const stageNumbers = [];
  if (upToEvent >= 13) stageNumbers.push(13);
  if (upToEvent >= 14) stageNumbers.push(14);
  if (upToEvent >= 15) stageNumbers.push(15);

  // Fetch results from all stages by querying all result documents for each event
  const stageResults = {};
  const failedStages = [];

  for (const eventNum of stageNumbers) {
    try {
      // Query all result documents for this event (format: season1_event13_*)
      const querySnapshot = await db.collection('results')
        .where(admin.firestore.FieldPath.documentId(), '>=', `season${season}_event${eventNum}_`)
        .where(admin.firestore.FieldPath.documentId(), '<', `season${season}_event${eventNum}_\uf8ff`)
        .get();

      if (!querySnapshot.empty) {
        // Collect all results from all users
        const allResults = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.results && Array.isArray(data.results)) {
            allResults.push(...data.results);
          }
        });

        // De-duplicate by UID (in case same rider appears in multiple result docs)
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
      console.log(`   ⚠️ Warning: Could not fetch results for event ${eventNum}:`, error.message);
      failedStages.push(eventNum);
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

  // Log if any stages failed to load
  if (failedStages.length > 0) {
    console.log(`   ⚠️ GC calculation incomplete - missing data for events: ${failedStages.join(', ')}`);
  }

  const availableStages = Object.keys(stageResults).map(k => parseInt(k));

  if (availableStages.length === 0) {
    console.log('   ⚠️ No stage results available for GC calculation');
    return null;
  }
  
  console.log(`   Found ${availableStages.length} completed stage(s)`);
  
  // Collect all unique riders who appeared in ANY stage
  const allRiders = new Map();
  
  // If current user result is provided, add them first
  if (currentUserResult) {
    console.log(`   ℹ️  Including current user result for event ${upToEvent}`);
    allRiders.set(userUid, {
      uid: userUid,
      name: currentUserResult.name,
      team: currentUserResult.team || '',
      arr: currentUserResult.arr || 1000,
      isBot: false,
      actualStages: new Set([upToEvent]),
      stageResults: {
        [upToEvent]: {
          position: currentUserResult.position,
          time: currentUserResult.time,
          isActual: true
        }
      }
    });
  }
  
  availableStages.forEach(eventNum => {
    stageResults[eventNum].forEach(r => {
      // Skip if this is the current user's current event (already added above)
      if (currentUserResult && r.uid === userUid && eventNum === upToEvent) {
        return; // Already added this result
      }
      
      if (!allRiders.has(r.uid)) {
        allRiders.set(r.uid, {
          uid: r.uid,
          name: r.name,
          team: r.team,
          arr: r.arr || 1000, // Default ARR if missing
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

      // Mark this stage as actually raced
      rider.actualStages.add(eventNum);
      rider.stageResults[eventNum] = {
        position: r.position,
        time: actualTime,
        isActual: true
      };
    });
  });
  
  console.log(`   Processing ${allRiders.size} unique riders (including simulations)`);
  
  // Determine DNS for bots (5% chance on Event 14, carries to Event 15)
  const botDNS = new Set();
  if (availableStages.includes(14)) {
    allRiders.forEach((rider, uid) => {
      if (rider.isBot && !rider.actualStages.has(14)) {
        // 5% chance of DNS on Event 14
        const dnsRoll = getSeededRandom(uid, 14);
        if (dnsRoll < 0.05) {
          botDNS.add(uid);
          console.log(`   🚫 Bot ${uid} simulated DNS on Event 14`);
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
      const medianTime = actualTimes[Math.floor(actualTimes.length / 2)];
      stageTimeRanges[eventNum] = {
        minTime: actualTimes[0],
        maxTime: actualTimes[actualTimes.length - 1],
        medianTime: medianTime,
        hasValidTimes: true
      };
      console.log(`   Stage ${eventNum}: Time range ${actualTimes[0].toFixed(0)}s - ${actualTimes[actualTimes.length - 1].toFixed(0)}s, median ${medianTime.toFixed(0)}s (${actualTimes.length} riders)`);
    } else {
      stageTimeRanges[eventNum] = { hasValidTimes: false };
      console.log(`   ⚠️ Stage ${eventNum}: No valid times found for simulation`);
    }
  });

  // Simulate missing stages for bots (not humans, not DNS bots)
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

          // Simulate this stage for this bot
          const fieldSize = stageResults[eventNum]?.length || 50;
          const simulatedPosition = simulatePosition(uid, rider.arr, eventNum, fieldSize);

          // Simulate time based on riders with similar ARR
          let simulatedTime = simulateTimeFromARR(uid, rider.arr, stageResults[eventNum], eventNum);

          // Fallback to position-based interpolation using ACTUAL stage time range
          if (!simulatedTime) {
            const { minTime, maxTime } = timeRange;
            const positionRatio = (simulatedPosition - 1) / Math.max(1, fieldSize - 1);
            simulatedTime = minTime + (maxTime - minTime) * positionRatio;
          }

          // Clamp simulated time to never be faster than the actual stage minimum
          const { minTime, medianTime } = timeRange;
          if (simulatedTime < minTime) {
            simulatedTime = minTime;
          }

          // IMPORTANT: Blend simulated times toward the median to prevent clustering at minimum
          // Bots who didn't actually race a stage shouldn't get "best case" times
          // Use 50/50 blend between ARR-based time and median time
          simulatedTime = (simulatedTime + medianTime) / 2;

          rider.stageResults[eventNum] = {
            position: simulatedPosition,
            time: simulatedTime,
            isActual: false,
            isSimulated: true
          };
        }
      });
    }
  });
  
  // Calculate GC for riders who completed all stages (actual or simulated)
  const gcStandings = [];

  allRiders.forEach(rider => {
    // Count stages (actual + simulated)
    const stagesCompleted = Object.keys(rider.stageResults).length;
    const requiredStages = stageNumbers.length;

    // Only include riders who have results for ALL stages
    // (either actual or simulated, but not DNS)
    if (stagesCompleted === requiredStages && !botDNS.has(rider.uid)) {
      let cumulativeTime = 0;
      let actualStagesCount = 0;
      let simulatedStagesCount = 0;
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
          if (result.isActual) {
            actualStagesCount++;
          } else {
            simulatedStagesCount++;
          }
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
        cumulativeTime: cumulativeTime,
        stage13Time: rider.stageResults[13]?.time || 0,
        stage14Time: rider.stageResults[14]?.time || 0,
        stage15Time: rider.stageResults[15]?.time || 0,
        stagesCompleted: requiredStages,
        actualStagesRaced: actualStagesCount,
        simulatedStages: simulatedStagesCount
      });
    }
  });
  
  // Sort by cumulative time (lowest = best)
  gcStandings.sort((a, b) => a.cumulativeTime - b.cumulativeTime);
  
  // Assign GC positions and calculate gaps
  gcStandings.forEach((rider, index) => {
    rider.gcPosition = index + 1;
    if (index === 0) {
      rider.gapToLeader = 0;
    } else {
      rider.gapToLeader = rider.cumulativeTime - gcStandings[0].cumulativeTime;
    }
  });
  
  const realRiders = gcStandings.filter(r => r.actualStagesRaced === stageNumbers.length).length;
  const simulatedRiders = gcStandings.filter(r => r.simulatedStages > 0).length;
  console.log(`   ✓ GC calculated: ${gcStandings.length} total riders (${realRiders} completed all stages, ${simulatedRiders} with simulated results)`);
  
  // Calculate GC awards and bonus points for the user (only on final stage)
  const userGC = gcStandings.find(r => r.uid === userUid);
  let gcAwards = {
    gcGoldMedal: false,
    gcSilverMedal: false,
    gcBronzeMedal: false
  };
  let gcBonusPoints = 0;
  
  // Only award GC trophies and bonus points after the final stage (event 15)
  if (upToEvent === 15 && userGC) {
    if (userGC.gcPosition === 1) {
      gcAwards.gcGoldMedal = true;
      gcBonusPoints = 50;
      console.log('   🏆 User won GC! (+50 bonus points)');
    } else if (userGC.gcPosition === 2) {
      gcAwards.gcSilverMedal = true;
      gcBonusPoints = 35;
      console.log('   🥈 User 2nd in GC (+35 bonus points)');
    } else if (userGC.gcPosition === 3) {
      gcAwards.gcBronzeMedal = true;
      gcBonusPoints = 25;
      console.log('   🥉 User 3rd in GC (+25 bonus points)');
    }
  }
  
  return {
    standings: gcStandings,
    userGC: userGC,
    awards: gcAwards,
    bonusPoints: gcBonusPoints,
    stagesIncluded: stageNumbers.length,
    isProvisional: upToEvent < 15  // Mark as provisional if not final
  };
}

/**
 * Parse CSV and extract results
 */
function parseCSV(csvContent) {
  return new Promise((resolve, reject) => {
    // Remove the first 2 lines if they contain "OVERALL INDIVIDUAL RESULTS:"
    // TPVirtual CSVs have a title line and blank line before the actual headers
    let processedContent = csvContent;
    let lines = csvContent.split('\n');

    if (lines[0].includes('OVERALL INDIVIDUAL RESULTS')) {
      // Skip first 2 lines (title + blank)
      lines = lines.slice(2);
      console.log('   Detected TPVirtual CSV format, skipping title lines');
    }

    // Truncate at INTERMEDIATE LOCATION RESULTS section (different column structure)
    const intermediateIndex = lines.findIndex(line => line.includes('INTERMEDIATE LOCATION RESULTS'));
    if (intermediateIndex !== -1) {
      lines = lines.slice(0, intermediateIndex);
      console.log('   Truncating before INTERMEDIATE LOCATION RESULTS section');
    }

    processedContent = lines.join('\n');

    Papa.parse(processedContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Process a single result for a user
 * @param {string} uid - User's TPV UID
 * @param {Object} eventInfo - Event info containing season and event number
 * @param {Array} results - All race results from CSV
 * @param {number} raceTimestamp - Timestamp of the race (from filename or file modification time)
 */
async function processUserResult(uid, eventInfo, results, raceTimestamp) {
  const { season, event: eventNumber } = eventInfo;
  
  // Query for user by uid field (not document ID)
  const usersQuery = await db.collection('users')
    .where('uid', '==', uid)
    .limit(1)
    .get();
  
  if (usersQuery.empty) {
    console.log(`âŒ User with uid ${uid} not found in database`);
    console.log(`   Make sure the user has signed up on the website and their uid field is set`);
    return;
  }
  
  // Get the user document
  const userDoc = usersQuery.docs[0];
  const userRef = userDoc.ref;
  const userData = userDoc.data();

  console.log(`   Found user: ${userData.name || uid} (Document ID: ${userDoc.id})`);

  // Recover personality from interview history if missing (handles post-reset scenarios)
  const recoveredPersonality = await recoverPersonalityIfNeeded(uid, userData, userRef);
  if (recoveredPersonality && !userData.personality) {
    userData.personality = recoveredPersonality;
  }
  
  // Get user's current stage and used optional events
  const currentStage = userData.currentStage || 1;
  const usedOptionalEvents = userData.usedOptionalEvents || [];
  const tourProgress = userData.tourProgress || {};
  
  // Validate if this event is valid for the user's current stage
  const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
  const isSpecialEventResult = validation.isSpecialEvent === true;

  if (!validation.valid) {
    console.log(`❌ Event ${eventNumber} is not valid for user ${uid} at stage ${currentStage}`);
    console.log(`   Reason: ${validation.reason}`);
    console.log(`   This result will NOT be processed or stored.`);
    return;
  }

  if (isSpecialEventResult) {
    console.log(`⭐ Event ${eventNumber} is a SPECIAL EVENT - will add career points only, no stage progression`);
  } else {
    console.log(`✅ Event ${eventNumber} is valid for stage ${currentStage}`);
  }
  
  // Find user's result in CSV (first occurrence only)
  const userResult = results.find(r => r.UID === uid);
  if (!userResult) {
    console.log(`User ${uid} not found in results, skipping`);
    return;
  }
  
  // Check if already processed (if event results exist and position matches)
  const existingResults = userData[`event${eventNumber}Results`];
  if (existingResults && existingResults.position === parseInt(userResult.Position)) {
    console.log(`Event ${eventNumber} already processed for user ${uid}, skipping`);
    return;
  }
  
  let position = parseInt(userResult.Position);
  const isDNF = isNaN(position) || userResult.Position === 'DNF';

  if (isDNF) {
    console.log(`User ${uid} has DNF or invalid position, awarding 0 points`);
    position = null; // Use null for DNF position in calculations
  }

  // Calculate predicted position (based on EventRating, available even for DNF)
  const predictedPosition = calculatePredictedPosition(results, uid);

  // Calculate points (0 for DNF)
  let points = 0;
  let bonusPoints = 0;

  if (!isDNF) {
    const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
    points = pointsResult.points;
    bonusPoints = pointsResult.bonusPoints;
  }
  
  // Initialize award flags (all false for DNF)
  let earnedPunchingMedal = false;
  let earnedGiantKillerMedal = false;
  let earnedDomination = false;
  let earnedCloseCall = false;
  let earnedPhotoFinish = false;
  let earnedDarkHorse = false;
  let earnedZeroToHero = false;
  let earnedWindTunnel = false;
  let earnedTheAccountant = false;
  let earnedBullseyeMedal = false;
  let earnedHotStreakMedal = false;
  let earnedLanternRouge = false;
  // Note: earnedComeback is set directly on eventResults object at award calculation time

  // Only calculate awards for non-DNF results
  if (!isDNF) {
    // Check if earned punching medal (beat prediction by 10+ places)
    if (predictedPosition) {
      const placesBeaten = predictedPosition - position;
      earnedPunchingMedal = placesBeaten >= 10;
    }

    // Check if earned Giant Killer medal (beat highest-rated rider)
    earnedGiantKillerMedal = checkGiantKiller(results, uid);

    // NEW AWARDS CALCULATIONS
    // Get times for margin-based awards
    const times = awardsCalc.getTimesFromResults(
      results.map(r => ({
        position: parseInt(r.Position),
        time: parseFloat(r.Time)
      })).filter(r => !isNaN(r.position)),
      position
    );

    // Check margin-based awards
    // Time-based awards should NOT be awarded for:
    // - Event 3: Elimination race (times don't reflect racing - riders eliminated at intervals)
    // - Time-based events (e.g., Event 4): All riders finish at the same clock time, distance varies
    const isTimeIrrelevant = eventNumber === 3 || TIME_BASED_EVENTS.includes(eventNumber);

    earnedDomination = isTimeIrrelevant ? false : awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
    earnedCloseCall = isTimeIrrelevant ? false : awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
    earnedPhotoFinish = isTimeIrrelevant ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime, times.secondPlaceTime);

    earnedDarkHorse = awardsCalc.checkDarkHorse(position, predictedPosition);

    // Wind Tunnel: top 5 in time trial when predicted outside top 5
    const eventType = EVENT_TYPES[eventNumber] || 'road race';
    earnedWindTunnel = awardsCalc.checkWindTunnel(position, predictedPosition, eventType);

    // The Accountant: more points than the rider who crossed the line first in points race
    if (eventType === 'points race') {
      const userEventPoints = parseInt(userResult.Points) || 0;
      const userTime = parseFloat(userResult.Time) || 0;
      earnedTheAccountant = awardsCalc.checkTheAccountant(userTime, userEventPoints, results);
    }

    // Zero to Hero requires previous event data
    if (eventNumber > 1) {
      const prevEventResults = userData[`event${eventNumber - 1}Results`];
      if (prevEventResults && prevEventResults.position && prevEventResults.position !== 'DNF') {
        // Get total finishers for both events from results
        const currentFinishers = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position))).length;
        // Use stored totalFinishers from previous event if available, otherwise use current event's count as estimate
        const prevFinishers = prevEventResults.totalFinishers || currentFinishers;
        earnedZeroToHero = awardsCalc.checkZeroToHero(
          { position: prevEventResults.position, totalFinishers: prevFinishers },
          { position: position, totalFinishers: currentFinishers }
        );
      }
    }

    // Bullseye - exact predicted position match
    if (predictedPosition && position === predictedPosition) {
      earnedBullseyeMedal = true;
      console.log('   🎯 BULLSEYE! Finished exactly at predicted position');
    }

    // Hot Streak - 3 consecutive wins
    if (position === 1) {
      let consecutiveWins = 1; // Current win counts
      for (let i = eventNumber - 1; i >= 1; i--) {
        const prevResult = userData[`event${i}Results`];
        if (prevResult && prevResult.position === 1) {
          consecutiveWins++;
        } else {
          break;
        }
      }
      if (consecutiveWins >= 3) {
        earnedHotStreakMedal = true;
        console.log(`   🔥 HOT STREAK! ${consecutiveWins} consecutive wins`);
      }
    }

    // Lantern Rouge - last place finisher (not DNF)
    const finishersForLantern = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)));
    if (position === finishersForLantern.length) {
      earnedLanternRouge = true;
      console.log('   🏮 LANTERN ROUGE! Last place finish');
    }

    // Note: Comeback is calculated in career awards section (Top 5 after bottom half finish)
  }
  
  // Initialize GC awards (will be populated later for tour stages)
  let gcBonusPoints = 0;
  let gcAwards = {
    gcGoldMedal: false,
    gcSilverMedal: false,
    gcBronzeMedal: false
  };
  
  // Calculate GC if this is any tour stage (events 13, 14, or 15)
  // MUST happen BEFORE creating eventResults so gcAwards are set correctly
  let gcResults = null;
  
  if (validation.isTour && !isDNF) {
    console.log('   🏁 Tour stage complete - calculating current GC...');
    // Pass current user's result so they're included in GC even before data is stored
    // Note: DNF results skip GC calculation as they don't have a valid position
    const currentUserResult = {
      name: userResult.Name,
      team: userResult.Team || '',
      arr: parseInt(userResult.ARR) || 1000,
      position: position,
      time: parseFloat(userResult.Time) || 0
    };
    // Pass full results array so GC can use current event data before it's stored to Firebase
    gcResults = await calculateGC(season, uid, eventNumber, currentUserResult, results);
    
    if (gcResults) {
      // Only add bonus points on final stage (event 15)
      if (eventNumber === 15) {
        gcBonusPoints = gcResults.bonusPoints;
        gcAwards = gcResults.awards;
        
        // Add GC bonus points to total points
        points += gcBonusPoints;
        if (gcBonusPoints > 0) {
          console.log(`   💰 GC bonus points added: +${gcBonusPoints}`);
        }
      }
    }
  }
  
  // Prepare event results
  // Get event type and category
  const eventType = EVENT_TYPES[eventNumber] || 'road race';
  const eventCategory = getEventCategory(eventType);

  const eventResults = {
    position: isDNF ? 'DNF' : position,
    isDNF: isDNF,
    stageNumber: currentStage, // Track which stage this was completed as
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
    arrBand: userResult.ARRBand || '',
    eventRating: parseInt(userResult.EventRating) || null,
    predictedPosition: predictedPosition,
    eventType: eventType,
    eventCategory: eventCategory,
    points: points,
    bonusPoints: bonusPoints,
    earnedPunchingMedal: earnedPunchingMedal,
    earnedGiantKillerMedal: earnedGiantKillerMedal,
    earnedDomination: earnedDomination,
    earnedCloseCall: earnedCloseCall,
    earnedPhotoFinish: earnedPhotoFinish,
    earnedDarkHorse: earnedDarkHorse,
    earnedZeroToHero: earnedZeroToHero,
    earnedWindTunnel: earnedWindTunnel,
    earnedTheAccountant: earnedTheAccountant,
    earnedBullseyeMedal: earnedBullseyeMedal,
    earnedHotStreakMedal: earnedHotStreakMedal,
    earnedLanternRouge: earnedLanternRouge,
    earnedComeback: false, // Set to true later if comeback award is earned (line ~2079)
    earnedGCGoldMedal: gcAwards.gcGoldMedal,
    earnedGCSilverMedal: gcAwards.gcSilverMedal,
    earnedGCBronzeMedal: gcAwards.gcBronzeMedal,
    gcBonusPoints: gcBonusPoints,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    totalFinishers: results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position))).length, // For Zero to Hero calculation
    earnedAwards: [], // NEW: Track awards for notification system
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    raceDate: raceTimestamp ? new Date(raceTimestamp).toISOString() : null // Actual race date from filename
  };

  // NOTE: buildSeasonStandings() moved to after unlock processing (around line 1415)
  // to ensure points includes unlock bonus

  // Track if this is an optional event (skip for special events)
  const newUsedOptionalEvents = [...usedOptionalEvents];
  if (!isSpecialEventResult && OPTIONAL_EVENTS.includes(eventNumber) && !usedOptionalEvents.includes(eventNumber)) {
    newUsedOptionalEvents.push(eventNumber);
  }

  // Update tour progress if this is a tour event (skip for special events)
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

  // Calculate next stage (special events don't advance stage)
  const nextStage = isSpecialEventResult ? currentStage : calculateNextStage(currentStage, newTourProgress);
  
  // Generate story text for this race result
  // Calculate win margin or margin to winner
  const sortedResults = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)))
    .sort((a, b) => parseInt(a.Position) - parseInt(b.Position));
  
  let winMargin = 0;
  let marginToWinner = 0;
  
  if (position === 1 && sortedResults.length >= 2) {
    const secondPlace = sortedResults[1];
    winMargin = parseFloat(secondPlace.Time) - parseFloat(userResult.Time);
  } else if (position > 1 && sortedResults.length >= 1) {
    const winner = sortedResults[0];
    marginToWinner = parseFloat(userResult.Time) - parseFloat(winner.Time);
  }
  
  // Extract winner and second place names for narrative context
  let winnerName = null;
  let secondPlaceName = null;
  if (sortedResults.length >= 1) {
    winnerName = sortedResults[0].Name || 'the winner';
  }
  if (sortedResults.length >= 2) {
    secondPlaceName = sortedResults[1].Name || null;
  }
  
  // Find previous event number and all completed events for story context
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
  const previousEventNumber = completedEventNumbers.length > 0 ? completedEventNumbers[completedEventNumbers.length - 1] : null;
  
  // Determine next event number based on next stage
  // Fixed stages map to specific events; choice stages (3, 6, 8) are null (player chooses)
  const STAGE_TO_EVENT_MAP = {
    1: 1,    // Stage 1 -> Event 1 (Coast and Roast Crit)
    2: 2,    // Stage 2 -> Event 2 (Island Classic)
    3: null, // Stage 3 -> Player choice (events 6-12)
    4: 3,    // Stage 4 -> Event 3 (Track Elimination)
    5: 4,    // Stage 5 -> Event 4 (Time Trial)
    6: null, // Stage 6 -> Player choice (events 6-12)
    7: 5,    // Stage 7 -> Event 5 (Points Race)
    8: null, // Stage 8 -> Player choice (events 6-12)
    9: 13    // Stage 9 -> Event 13 (Tour Stage 1, then 14, 15)
  };
  let nextEventNumber = STAGE_TO_EVENT_MAP[nextStage] !== undefined
    ? STAGE_TO_EVENT_MAP[nextStage]
    : null;

  // Cadence Credits system enabled for all users
  // SKIP_UNLOCKS only skips unlock trigger processing (bonus points from equipped items)
  // CC earning from awards always happens regardless of SKIP_UNLOCKS
  const skipUnlocks = process.env.SKIP_UNLOCKS === 'true';

  if (skipUnlocks) {
    console.log(`   ⏭️ Skipping unlock trigger processing (SKIP_UNLOCKS=true)`);
    console.log(`   💰 CC earning from awards will still be processed`);
  }

  // Calculate rival data ONCE (used for both unlocks and story generation)
  // This must be outside the skipUnlocks block since story generation always needs it
  const rivalEncounters = calculateRivalEncounters(
    results,
    uid,
    position,
    parseFloat(userResult.Time) || 0,
    eventNumber,
    parseFloat(userResult.Distance) || 0
  );
  const existingRivalData = userData.rivalData || null;
  const updatedRivalData = updateRivalData(existingRivalData, rivalEncounters, eventNumber);
  const topRivals = identifyTopRivals(updatedRivalData);
  updatedRivalData.topRivals = topRivals;

  // Log rival encounters
  if (rivalEncounters.length > 0) {
    const proximityDesc = eventNumber === 4 ? 'within 500m' : 'within 30s';
    console.log(`   🤝 Rival encounters: ${rivalEncounters.length} bot(s) ${proximityDesc}`);
  }

  // Apply unlock bonuses (one per race) - only if not skipping
  let unlockBonusPoints = 0;
  let unlockBonusesApplied = [];
  // Cooldowns use simple boolean: true = resting this race, cleared after race completes
  const previousCooldowns = { ...(userData.unlocks?.cooldowns || {}) };
  const newCooldowns = {}; // Start fresh - only triggered unlocks will be set to true

  if (!skipUnlocks && !isDNF) {
    // Skip unlocks for DNF results - no bonus points awarded
    const equipped = Array.isArray(userData.unlocks?.equipped) ? userData.unlocks.equipped : [];
    const slotCount = userData.unlocks?.slotCount || 1;
    const equippedToUse = equipped.slice(0, slotCount).filter(Boolean);

    const sanitizedResults = sortedResults.map(r => ({
      position: parseInt(r.Position),
      arr: parseInt(r.ARR) || 0,
      uid: r.UID || null,
      name: r.Name || null
    })).filter(r => !isNaN(r.position));

    const unlockContext = {
      position,
      predictedPosition,
      marginToWinner: position === 1 ? winMargin : marginToWinner,
      gapToWinner: position === 1 ? 0 : marginToWinner,
      eventCategory,
      eventNumber,
      totalFinishers: sortedResults.length,
      userARR: parseInt(userResult.ARR) || 0,
      results: sanitizedResults,
      topRivals: topRivals,
      rivalEncounters: rivalEncounters,
      personality: userData.personality || null
    };

    // Check triggers - pass previousCooldowns to exclude resting unlocks
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
        // Set cooldown for this unlock (simple boolean - resting for next race)
        newCooldowns[selectedUnlock.unlock.id] = true;

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

        console.log(`   💎 Unlock applied (${selectedUnlock.unlock.name}): +${unlockPoints} pts`);
      });

      // Apply total bonus to points/breakdown
      points += unlockBonusPoints;
      bonusPoints += unlockBonusPoints;
    }

    // Attach to event results for display
    eventResults.points = points;
    eventResults.bonusPoints = bonusPoints;
    eventResults.unlockBonusPoints = unlockBonusPoints;
    eventResults.unlockBonusesApplied = unlockBonusesApplied;
  }

  // Build season standings with all racers from CSV (skip for special events)
  // IMPORTANT: This must be after unlock processing so points includes unlock bonus
  let seasonStandings = null;
  if (!isSpecialEventResult) {
    seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid, points);
  } else {
    console.log(`   ⭐ Skipping season standings for special event`);
  }

  // After event 15, there is no next event - season is complete
  if (eventNumber === 15) {
    nextEventNumber = null;
  }
  
  // Collect recent results for form analysis
  const recentResults = completedEventNumbers.slice(-3).map(evtNum => {
    const evtData = userData[`event${evtNum}Results`];
    return evtData ? evtData.position : null;
  }).filter(p => p !== null);
  recentResults.push(position); // Add current race
  
  // Check if on winning streak
  const isOnStreak = recentResults.length >= 2 && recentResults.every(p => p === 1);
  
  // Count total podiums
  let totalPodiums = 0;
  for (let i = 1; i <= 15; i++) {
    const evtData = userData[`event${i}Results`];
    if (evtData && evtData.position <= 3) {
      totalPodiums++;
    }
  }
  if (position <= 3) totalPodiums++; // Include current race
  
  // Count total wins for isFirstWin detection
  let totalWins = 0;
  for (let i = 1; i <= 15; i++) {
    const evtData = userData[`event${i}Results`];
    if (evtData && evtData.position === 1) {
      totalWins++;
    }
  }
  if (position === 1) totalWins++; // Include current race

  // Note: rivalEncounters, updatedRivalData, and topRivals are calculated earlier (before unlock processing)
  // to ensure consistent data is used for both unlocks and story generation

  // Generate story using v3.0 story generator (has all features built-in)
  let unifiedStory = '';

  // Debug: Log GC data if available
  if (gcResults) {
    console.log(`   📊 GC Data available: userGC position = ${gcResults.userGC?.gcPosition || 'null'}, gap = ${gcResults.userGC?.gapToLeader || 'null'}s`);
  }

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
      gcGap: gcResults?.userGC?.gapToLeader || null
    },
    {
      stagesCompleted: (userData.completedStages || []).length + 1,
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
      // Rival data for story generation
      topRivals: updatedRivalData.topRivals || [],
      rivalEncounters: rivalEncounters,
      // Personality data for story generation
      personality: userData.personality || null,
      racesCompleted: (userData.completedStages || []).length,
      // Interview completion for personality-driven story gating
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
  
  // Store unified story (single field instead of separate recap/context)
  eventResults.story = unifiedStory;
  eventResults.timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  // Add GC results to event results if this is a tour stage
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
  
  console.log(`   📖 Generated race story`);
  
  // Check for DNS on Local Tour stages (36-hour window enforcement)
  const dnsFlags = {};
  if (eventNumber >= 13 && eventNumber <= 15) {
    // Check if previous tour stage was completed in time
    if (eventNumber === 14 && userData.event13Results) {
      // Check if event 13 was done more than 36 hours ago
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
      // Check if event 14 was done more than 36 hours ago
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
  
  // Calculate career statistics from all event results (including current)
  const tempUserData = { ...userData };
  tempUserData[`event${eventNumber}Results`] = eventResults;
  const careerStats = await calculateCareerStats(tempUserData);
  const seasonStats = await calculateSeasonStats(tempUserData, 1);

  // Event metadata for distance/climbing tracking
  const eventMetadata = {
    1: { distance: 23.4, climbing: 124 },
    2: { distance: 36.5, climbing: 122 },
    3: { distance: 10.0, climbing: 0 },
    4: { distance: 10.7, climbing: 50 },
    5: { distance: 19.6, climbing: 388 },
    6: { distance: 9.6, climbing: 174 },
    7: { distance: 25.7, climbing: 117 },
    8: { distance: 52.6, climbing: 667 },
    9: { distance: 25.9, climbing: 295 },
    10: { distance: 25.3, climbing: 160 },
    11: { distance: 21.8, climbing: 119 },
    12: { distance: 38.0, climbing: 493 },
    13: { distance: 35.2, climbing: 174 },
    14: { distance: 27.3, climbing: 169 },
    15: { distance: 28.1, climbing: 471 }
  };

  // Calculate lifetime statistics
  const existingLifetime = userData.lifetimeStats || {};
  const eventMeta = eventMetadata[eventNumber] || { distance: 0, climbing: 0 };

  // Update cumulative totals (always present)
  const newLifetimeStats = {
    totalDistance: (existingLifetime.totalDistance || 0) + eventMeta.distance,
    totalClimbing: (existingLifetime.totalClimbing || 0) + eventMeta.climbing,
    totalRaceTime: (existingLifetime.totalRaceTime || 0) + (eventResults.time || 0),
    totalDNFs: existingLifetime.totalDNFs || 0 // Will increment separately for DNFs
  };

  // Track biggest giant beaten (only add if not undefined)
  const biggestGiant = calculateBiggestGiant(results, uid, position, eventResults.arr, eventNumber, existingLifetime.biggestGiantBeaten);
  if (biggestGiant !== undefined) {
    newLifetimeStats.biggestGiantBeaten = biggestGiant;
  }

  // Track best vs prediction (only add if not undefined)
  const bestPred = calculateBestPrediction(eventResults, eventNumber, existingLifetime.bestVsPrediction);
  if (bestPred !== undefined) {
    newLifetimeStats.bestVsPrediction = bestPred;
  }

  // Track highest ARR (only add if not undefined)
  const highARR = calculateHighestARR(eventResults.arr, eventNumber, existingLifetime.highestARR);
  if (highARR !== undefined) {
    newLifetimeStats.highestARR = highARR;
  }

  // Track biggest win margin (only add if not undefined)
  const bigWin = calculateBiggestWinMargin(position, results, eventNumber, existingLifetime.biggestWin);
  if (bigWin !== undefined) {
    newLifetimeStats.biggestWin = bigWin;
  }

  // Ensure unlock fields present for compatibility (always set defaults if not already set)
  eventResults.unlockBonusPoints = eventResults.unlockBonusPoints || 0;
  eventResults.unlockBonusesApplied = eventResults.unlockBonusesApplied || [];

  // NOTE: Cadence Credits calculation moved to AFTER awards are added (after line 1710+)

  // Update user document
  // Special events only add career points, not season points or progression
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    // Career statistics (all events including special)
    careerPoints: (userData.careerPoints || 0) + points,
    careerTotalEvents: careerStats.totalEventsParticipated, // All events including DNF
    careerEvents: careerStats.totalRaces, // Only finished races (for rate calculations)
    careerWins: careerStats.totalWins,
    careerPodiums: careerStats.totalPodiums,
    careerTop10s: careerStats.totalTop10s,
    careerBestFinish: careerStats.bestFinish,
    careerAvgFinish: careerStats.averageFinish,
    careerWinRate: careerStats.winRate,
    careerPodiumRate: careerStats.podiumRate,
    // Note: awards are updated via individual field increments below
    arr: eventResults.arr, // Store most recent ARR
    team: userResult.Team || '',
    gender: userResult.Gender || null,
    country: userResult.Country || null,
    ageBand: userResult.AgeBand || null,
    rivalData: updatedRivalData, // Add rival data
    lifetimeStats: newLifetimeStats, // Add lifetime statistics
    ...dnsFlags // Add DNS flags if any
  };

  // Only update season-related fields for regular events (not special events)
  if (!isSpecialEventResult) {
    updates.currentStage = nextStage;
    updates[`season${season}Standings`] = seasonStandings;
    updates.usedOptionalEvents = newUsedOptionalEvents;
    updates.completedOptionalEvents = newUsedOptionalEvents;  // Alias for frontend compatibility
    updates.tourProgress = newTourProgress;

    // Season 1 statistics (only season events, not special events)
    updates.season1TotalEvents = seasonStats.totalEventsParticipated; // All events including DNF
    updates.season1Events = seasonStats.totalRaces; // Only finished races (for rate calculations)
    updates.season1Wins = seasonStats.totalWins;
    updates.season1Podiums = seasonStats.totalPodiums;
    updates.season1Top10s = seasonStats.totalTop10s;
    updates.season1Points = seasonStats.totalPoints;
    updates.season1BestFinish = seasonStats.bestFinish;
    updates.season1AvgFinish = seasonStats.averageFinish;
    updates.season1WinRate = seasonStats.winRate;
    updates.season1PodiumRate = seasonStats.podiumRate;
  }

  if (!skipUnlocks) {
    // Unlock cooldowns - only update when processing unlocks
    // Save new cooldowns (only triggered unlocks are set to true, others are cleared)
    updates['unlocks.cooldowns'] = newCooldowns;
  }

  // Update personality if changed (from unlock bonuses)
  if (userData.personality) {
    updates.personality = userData.personality;
  }

  // NOTE: Currency updates happen AFTER awards are added (around line 1800+)
  
  // Track awards earned in THIS event specifically
  // We'll increment these in Firebase
  const eventAwards = {};

  // Race position awards (if earned this event)
  if (position === 1) {
    eventAwards['awards.gold'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'goldMedal', category: 'podium', intensity: 'subtle' });
  } else if (position === 2) {
    eventAwards['awards.silver'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'silverMedal', category: 'podium', intensity: 'subtle' });
  } else if (position === 3) {
    eventAwards['awards.bronze'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'bronzeMedal', category: 'podium', intensity: 'subtle' });
  }

  // Special medals earned this event
  if (earnedPunchingMedal) {
    eventAwards['awards.punchingMedal'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'punchingMedal', category: 'event_special', intensity: 'moderate' });
  }
  if (earnedGiantKillerMedal) {
    eventAwards['awards.giantKiller'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'giantKillerMedal', category: 'event_special', intensity: 'moderate' });
  }
  if (eventResults.earnedBullseyeMedal) {
    eventAwards['awards.bullseye'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'bullseyeMedal', category: 'event_special', intensity: 'moderate' });
  }
  if (eventResults.earnedHotStreakMedal) {
    eventAwards['awards.hotStreak'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'hotStreakMedal', category: 'event_special', intensity: 'moderate' });
  }
  if (eventResults.earnedDomination) {
    eventAwards['awards.domination'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'domination', category: 'performance', intensity: 'flashy' });
  }
  if (eventResults.earnedCloseCall) {
    eventAwards['awards.closeCall'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'closeCall', category: 'performance', intensity: 'flashy' });
  }
  if (eventResults.earnedPhotoFinish) {
    eventAwards['awards.photoFinish'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'photoFinish', category: 'performance', intensity: 'flashy' });
  }
  if (eventResults.earnedDarkHorse) {
    eventAwards['awards.darkHorse'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'darkHorse', category: 'performance', intensity: 'flashy' });
  }
  if (eventResults.earnedZeroToHero) {
    eventAwards['awards.zeroToHero'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'zeroToHero', category: 'performance', intensity: 'flashy' });
  }
  if (eventResults.earnedWindTunnel) {
    eventAwards['awards.windTunnel'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'windTunnel', category: 'event_special', intensity: 'moderate' });
  }
  if (eventResults.earnedTheAccountant) {
    eventAwards['awards.theAccountant'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'theAccountant', category: 'event_special', intensity: 'moderate' });
  }
  if (earnedLanternRouge) {
    eventAwards['awards.lanternRouge'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'lanternRouge', category: 'event_special', intensity: 'subtle' });
  }

  // GC trophies (only on Event 15)
  if (eventNumber === 15) {
    console.log(`   🔍 Checking GC trophy awards...`);
    console.log(`      earnedGCGoldMedal: ${eventResults.earnedGCGoldMedal}`);
    console.log(`      earnedGCSilverMedal: ${eventResults.earnedGCSilverMedal}`);
    console.log(`      earnedGCBronzeMedal: ${eventResults.earnedGCBronzeMedal}`);

    if (eventResults.earnedGCGoldMedal) {
      console.log('   🏆 GC WINNER! Awarding GC Gold trophy');
      eventAwards['awards.gcGold'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcGoldMedal', category: 'gc', intensity: 'flashy' });
    }
    if (eventResults.earnedGCSilverMedal) {
      console.log('   🥈 GC SECOND! Awarding GC Silver trophy');
      eventAwards['awards.gcSilver'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcSilverMedal', category: 'gc', intensity: 'flashy' });
    }
    if (eventResults.earnedGCBronzeMedal) {
      console.log('   🥉 GC THIRD! Awarding GC Bronze trophy');
      eventAwards['awards.gcBronze'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'gcBronzeMedal', category: 'gc', intensity: 'flashy' });
    }
  }

  // Special Event Awards
  // The Equalizer - awarded for completing The Leveller (event 102)
  if (eventNumber === 102) {
    console.log('   🎚️ THE LEVELLER completed! Awarding The Equalizer');
    eventAwards['awards.theEqualizer'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'theEqualizer', category: 'event_special', intensity: 'moderate' });
  }

  // Singapore Sling - awarded for podium at Singapore Criterium (event 101)
  if (eventNumber === 101 && position <= 3 && !isDNF) {
    console.log('   🍸 SINGAPORE CRITERIUM podium! Awarding Singapore Sling');
    eventAwards['awards.singaporeSling'] = admin.firestore.FieldValue.increment(1);
    eventResults.earnedAwards.push({ awardId: 'singaporeSling', category: 'event_special', intensity: 'flashy' });
  }

  // Merge event awards into updates
  Object.assign(updates, eventAwards);
  
  // Add to completedStages (store the STAGE number, not event number)
  // Skip for special events - they don't count as season stages
  if (!isSpecialEventResult) {
    const completedStages = userData.completedStages || [];
    if (!completedStages.includes(currentStage)) {
      updates.completedStages = admin.firestore.FieldValue.arrayUnion(currentStage);
    }
  }
  
  // Check for special event-based awards
  
  // PODIUM STREAK - 5 consecutive top 3 finishes
  // Get the last 4 event results (before this one)
  const recentPositions = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`] && userData[`event${i}Results`].position) {
      recentPositions.push(userData[`event${i}Results`].position);
    }
  }
  
  // Add current position
  recentPositions.push(position);
  
  // Check if last 5 results are all top 3
  if (recentPositions.length >= 5) {
    const last5 = recentPositions.slice(-5);
    const allPodiums = last5.every(pos => pos <= 3);

    if (allPodiums) {
      console.log('   📈 PODIUM STREAK! 5 consecutive top 3 finishes');
      updates['awards.podiumStreak'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'podiumStreak', category: 'performance', intensity: 'flashy' });
    }
  }
  
  // COMEBACK KID - Top 5 after bottom half finish
  if (recentPositions.length >= 2 && position <= 5) {
    const previousPosition = recentPositions[recentPositions.length - 2];
    // Use finishers only (exclude DNFs) for accurate bottom half calculation
    const totalFinishers = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position))).length;
    const bottomHalf = totalFinishers / 2;

    if (previousPosition > bottomHalf) {
      console.log(`   🔄 COMEBACK KID! Top 5 finish after position ${previousPosition}`);
      updates['awards.comeback'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedComeback = true;
      eventResults.earnedAwards.push({ awardId: 'comeback', category: 'event_special', intensity: 'moderate' });
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
      updates['awards.backToBack'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'backToBack', category: 'performance', intensity: 'flashy' });
    }
  }

  // TROPHY COLLECTOR - Podium 5+ times (one-time award)
  if (position <= 3) {
    const currentTrophyCollector = userData.awards?.trophyCollector || 0;
    if (currentTrophyCollector === 0 && totalPodiums >= 5) {
      console.log('   🏆 TROPHY COLLECTOR! 5+ podium finishes');
      updates['awards.trophyCollector'] = 1;
      eventResults.earnedAwards.push({ awardId: 'trophyCollector', category: 'performance', intensity: 'moderate' });
    }
  }

  // WEEKEND WARRIOR - Complete 5+ weekend events (Saturday/Sunday) (one-time award)
  const currentWeekendWarrior = userData.awards?.weekendWarrior || 0;
  if (currentWeekendWarrior === 0) {
    // Count weekend events from previous results
    // Use raceDate if available (actual race date), otherwise fall back to processedAt
    let weekendEventCount = 0;
    for (let i = 1; i <= 15; i++) {
      const evtData = userData[`event${i}Results`];
      if (evtData) {
        // Prefer raceDate (actual race date from filename) over processedAt (when results were processed)
        let date = null;
        if (evtData.raceDate) {
          date = new Date(evtData.raceDate);
        } else if (evtData.processedAt) {
          date = evtData.processedAt.toDate ? evtData.processedAt.toDate() : new Date(evtData.processedAt);
        }
        if (date) {
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
            weekendEventCount++;
          }
        }
      }
    }
    // Check if current event is on a weekend - use race timestamp if available
    const currentRaceDate = raceTimestamp ? new Date(raceTimestamp) : new Date();
    const currentDayOfWeek = currentRaceDate.getDay();
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
      weekendEventCount++;
    }

    if (weekendEventCount >= 5) {
      console.log(`   🏁 WEEKEND WARRIOR! ${weekendEventCount} weekend events completed`);
      updates['awards.weekendWarrior'] = 1;
      eventResults.earnedAwards.push({ awardId: 'weekendWarrior', category: 'performance', intensity: 'moderate' });
    }
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
      updates['awards.overrated'] = 1;
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
      updates['awards.technicalIssues'] = 1;
      eventResults.earnedAwards.push({ awardId: 'technicalIssues', category: 'event_special', intensity: 'subtle' });
    }
  }

  // Check if season is now complete and get season awards (BEFORE saving updates)
  const earnedSeasonAwards = await checkAndMarkSeasonComplete(userRef, userData, eventNumber, updates, seasonStandings);

  // Add season awards to eventResults (if event 15 or if season completed via DNS)
  if (earnedSeasonAwards && earnedSeasonAwards.length > 0) {
    console.log(`   Adding ${earnedSeasonAwards.length} season award(s) to event${eventNumber}Results`);
    eventResults.earnedAwards.push(...earnedSeasonAwards);
    // Update the eventResults in updates object to include season awards
    updates[`event${eventNumber}Results`] = eventResults;
  }

  // Calculate Cadence Credits from awards
  // MUST be done AFTER all awards are added to eventResults.earnedAwards
  // CC earning always happens regardless of SKIP_UNLOCKS
  let earnedCadenceCredits = 0;
  let cadenceCreditTransaction = null;
  const existingTransactions = userData.currency?.transactions || [];

  const awardIds = (eventResults.earnedAwards || []).map(a => a.awardId);
  earnedCadenceCredits = calculateCadenceCreditsFromAwards(awardIds);

  // Special case: The Leveller (theEqualizer) always gets completion bonus on top of award
  // For other events, completion bonus is added if awards earned are below 20 CC
  // This ensures riders always earn at least 20 CC from any race
  let ccSource = 'awards';
  const hasTheEqualizer = awardIds.includes('theEqualizer');

  if (hasTheEqualizer) {
    // The Leveller: 30CC award + 20CC completion bonus = 50CC total
    earnedCadenceCredits += COMPLETION_BONUS_CC;
    ccSource = 'awards'; // Still mark as awards since theEqualizer is the primary source
  } else if (earnedCadenceCredits < COMPLETION_BONUS_CC) {
    // Add completion bonus if awards earned are below the threshold
    // e.g., overrated (5 CC) + completion bonus (20 CC) = 25 CC
    earnedCadenceCredits += COMPLETION_BONUS_CC;
    ccSource = earnedCadenceCredits === COMPLETION_BONUS_CC ? 'completion' : 'awards';
  }

  const txId = `cc_event_${eventNumber}`;
  const alreadyProcessed = existingTransactions.some(t => t.id === txId);

  // Firestore doesn't allow serverTimestamp() inside arrayUnion payloads; capture a concrete Timestamp instead.
  const txTimestamp = admin.firestore.Timestamp.now();

  if (!alreadyProcessed && earnedCadenceCredits > 0) {
    cadenceCreditTransaction = {
      id: txId,
      type: 'earn',
      delta: earnedCadenceCredits,
      source: ccSource,
      eventNumber: eventNumber,
      awardIds: awardIds,
      timestamp: txTimestamp
    };
  } else if (alreadyProcessed) {
    console.log(`   ✓ Cadence Credits already awarded for event ${eventNumber}, skipping.`);
    earnedCadenceCredits = 0;
  }

  // Add CC earned to event results for display
  eventResults.earnedCadenceCredits = earnedCadenceCredits;
  eventResults.ccSource = ccSource; // Track source for UI display

  // Currency updates
  const currentBalance = userData.currency?.balance || 0;
  if (earnedCadenceCredits > 0) {
    updates['currency.balance'] = currentBalance + earnedCadenceCredits;
    const currentTotalEarned = userData.currency?.totalEarned || 0;
    updates['currency.totalEarned'] = currentTotalEarned + earnedCadenceCredits;
    if (ccSource === 'completion') {
      console.log(`   💰 Awarding ${earnedCadenceCredits} CC for race completion (new balance: ${currentBalance + earnedCadenceCredits})`);
    } else {
      console.log(`   💰 Awarding ${earnedCadenceCredits} CC from ${awardIds.length} awards (new balance: ${currentBalance + earnedCadenceCredits})`);
    }
  }
  if (cadenceCreditTransaction) {
    updates['currency.transactions'] = admin.firestore.FieldValue.arrayUnion(cadenceCreditTransaction);
  }

  // Update eventResults in updates object to include CC
  updates[`event${eventNumber}Results`] = eventResults;

  await userRef.update(updates);

  const bonusLog = bonusPoints > 0 ? ` (including +${bonusPoints} bonus)` : '';
  const predictionLog = predictedPosition ? ` | Predicted: ${predictedPosition}` : '';
  const punchingLog = earnedPunchingMedal ? ' PUNCHING MEDAL!' : '';
  const giantKillerLog = earnedGiantKillerMedal ? ' GIANT KILLER!' : '';
  console.log(`Processed event ${eventNumber} for user ${uid}: Position ${position}${predictionLog}, Points ${points}${bonusLog}${punchingLog}${giantKillerLog}`);
  console.log(`   Stage ${currentStage} complete -> Stage ${nextStage}`);
  
  // Update results summary collection (per-user)
  // Pass unlock bonus data so user's result includes unlock points
  await updateResultsSummary(season, eventNumber, results, uid, unlockBonusPoints, unlockBonusesApplied);
}

/**
 * Calculate career statistics from all event results
 */
async function calculateCareerStats(userData) {
  const stats = {
    totalEventsParticipated: 0, // All events including DNF
    totalRaces: 0, // Only finished races (excludes DNF) - used for rate calculations
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
  
  // Iterate through all possible events (season 1: 1-15, special events: 101-110)
  const eventNumbers = [
    ...Array.from({length: 15}, (_, i) => i + 1),   // Season 1: events 1-15
    ...Array.from({length: 10}, (_, i) => i + 101)  // Special events: 101-110
  ];

  for (const eventNum of eventNumbers) {
    const eventResults = userData[`event${eventNum}Results`];

    // Count all events participated (including DNF)
    if (eventResults && eventResults.position) {
      stats.totalEventsParticipated++;
    }

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
      // Note: Lantern Rouge would need access to total finishers
      // We'll calculate this during results processing, not here
    }
  }
  
  // Calculate derived stats
  if (stats.totalRaces > 0) {
    // Average finish position (only counts finished races - DNFs don't have a position)
    const totalPositions = stats.positions.reduce((sum, pos) => sum + pos, 0);
    stats.averageFinish = parseFloat((totalPositions / stats.totalRaces).toFixed(1));
  } else {
    stats.averageFinish = null;
  }

  // Win rate and podium rate use total events participated (including DNFs)
  // A DNF counts as a failure to win/podium
  if (stats.totalEventsParticipated > 0) {
    stats.winRate = parseFloat(((stats.totalWins / stats.totalEventsParticipated) * 100).toFixed(1));
    stats.podiumRate = parseFloat(((stats.totalPodiums / stats.totalEventsParticipated) * 100).toFixed(1));
  } else {
    stats.winRate = 0;
    stats.podiumRate = 0;
  }

  return stats;
}

/**
 * Calculate season-specific statistics (only events 1-15 for season 1)
 * Does not include special events
 */
async function calculateSeasonStats(userData, seasonNumber = 1) {
  const stats = {
    totalEventsParticipated: 0, // All events including DNF
    totalRaces: 0, // Only finished races (excludes DNF) - used for rate calculations
    totalWins: 0,
    totalPodiums: 0,
    totalTop10s: 0,
    totalPoints: 0,
    bestFinish: null,
    positions: []
  };

  // Season 1 events are 1-15
  const startEvent = 1;
  const endEvent = 15;

  for (let eventNum = startEvent; eventNum <= endEvent; eventNum++) {
    const eventResults = userData[`event${eventNum}Results`];

    // Count all events participated (including DNF)
    if (eventResults && eventResults.position) {
      stats.totalEventsParticipated++;
    }

    if (eventResults && eventResults.position && eventResults.position !== 'DNF') {
      const position = eventResults.position;

      // Count races
      stats.totalRaces++;

      // Track positions for average calculation
      stats.positions.push(position);

      // Count wins
      if (position === 1) {
        stats.totalWins++;
      }

      // Count podiums
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

      // Add points from this event
      if (eventResults.points) {
        stats.totalPoints += eventResults.points;
      }
    }
  }

  // Calculate derived stats
  if (stats.totalRaces > 0) {
    // Average finish position (only counts finished races - DNFs don't have a position)
    const totalPositions = stats.positions.reduce((sum, pos) => sum + pos, 0);
    stats.averageFinish = parseFloat((totalPositions / stats.totalRaces).toFixed(1));
  } else {
    stats.averageFinish = null;
  }

  // Win rate and podium rate use total events participated (including DNFs)
  // A DNF counts as a failure to win/podium
  if (stats.totalEventsParticipated > 0) {
    stats.winRate = parseFloat(((stats.totalWins / stats.totalEventsParticipated) * 100).toFixed(1));
    stats.podiumRate = parseFloat(((stats.totalPodiums / stats.totalEventsParticipated) * 100).toFixed(1));
  } else {
    stats.winRate = 0;
    stats.podiumRate = 0;
  }

  return stats;
}

/**
 * Deterministic random number generator using bot UID and event as seed
 */
function getSeededRandom(botName, eventNumber) {
  // Create a simple hash from bot name and event
  let hash = 0;
  const seed = `${botName}-${eventNumber}`;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return a number between 0 and 1
  const x = Math.sin(Math.abs(hash)) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculate Cadence Credits from earned awards
 */
function calculateCadenceCreditsFromAwards(earnedAwardIds = []) {
  const total = earnedAwardIds.reduce((sum, id) => {
    const value = AWARD_CREDIT_MAP[id] || 0;
    return sum + value;
  }, 0);

  return Math.min(total, PER_EVENT_CREDIT_CAP);
}

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
      // Beat someone with higher ARR who finished behind you
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

    // Personality-based unlocks
    case 'beatPredictionByAny':
      if (!predictedPosition) return { triggered: false };
      return {
        triggered: predictedPosition - position > 0,
        reason: 'Beat prediction'
      };
    case 'winSprint':
      // No sprint data available, use win as proxy
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
      // Beat any of the top 3 rivals
      if (!topRivals || topRivals.length === 0 || !results) {
        return { triggered: false };
      }

      // Get top 3 rival UIDs (topRivals is already an array of UID strings from identifyTopRivals)
      const top3RivalUids = topRivals.slice(0, 3);

      // Check if any of the top 3 rivals finished behind the user
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
 * @param {string[]} equippedIds - IDs of equipped unlocks
 * @param {Object} cooldowns - Map of unlock ID to boolean (true = resting this race)
 * @param {Object} context - Race context for evaluating triggers
 */
function selectUnlocksToApply(equippedIds, cooldowns, context) {
  const triggered = [];

  for (const id of equippedIds) {
    const unlock = getUnlockById(id);
    if (!unlock) {
      console.log(`   ⚠️ Warning: Equipped unlock '${id}' not found in unlock definitions`);
      continue;
    }

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
      if (!meetsRequirement) continue;
    }

    // Check balanced personality requirement (all traits 45-65)
    if (unlock.requiredBalanced) {
      if (!context.personality) continue;
      const traitValues = Object.values(context.personality);
      const isBalanced = traitValues.length > 0 && traitValues.every(v => v >= 45 && v <= 65);
      if (!isBalanced) continue;
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

/**
 * Simulate a race position for a bot based on their ARR/rating
 */
function simulatePosition(botName, arr, eventNumber, fieldSize = 50) {
  // Determine expected position range based on ARR
  // Higher ARR = better expected position
  let expectedPosition;
  
  if (arr >= 1400) {
    expectedPosition = 5;  // Top riders
  } else if (arr >= 1200) {
    expectedPosition = 12; // Strong riders
  } else if (arr >= 1000) {
    expectedPosition = 20; // Mid-pack
  } else if (arr >= 800) {
    expectedPosition = 30; // Back of pack
  } else {
    expectedPosition = 40; // Tail end
  }
  
  // Add randomness: ±10 positions
  const randomOffset = Math.floor(getSeededRandom(botName, eventNumber) * 20) - 10;
  let simulatedPosition = expectedPosition + randomOffset;
  
  // Clamp to valid range
  simulatedPosition = Math.max(1, Math.min(fieldSize, simulatedPosition));
  
  return simulatedPosition;
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

    // Add additional variance (±1%) to spread times slightly
    const extraVariance = (getSeededRandom(botUid + '_extra', eventNum) - 0.5) * 0.02;
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
 * Fetch all results from events 1 through currentEvent
 */
async function getAllPreviousEventResults(season, currentEvent, userUid) {
  const allEventResults = {};
  
  for (let eventNum = 1; eventNum <= currentEvent; eventNum++) {
    try {
      // Query only THIS USER's result document for this event
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
 * Build season standings including all racers from CSV
 * Now includes simulated results for bots to keep standings competitive
 * Only simulates events that the user has actually completed (not all events up to current number)
 * @param {Array} results - CSV results for current event
 * @param {Object} userData - User's Firestore document data
 * @param {number} eventNumber - Current event number
 * @param {string} currentUid - Current user's UID
 * @param {number} userActualPoints - User's actual points for this event (including bonus points)
 */
async function buildSeasonStandings(results, userData, eventNumber, currentUid, userActualPoints) {
  const season = 1;
  const existingStandings = userData[`season${season}Standings`] || [];
  
  // Get list of events the user has actually completed (from all eventXResults fields)
  const completedEventNumbers = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`]) {
      completedEventNumbers.push(i);
    }
  }
  // Add current event being processed
  if (!completedEventNumbers.includes(eventNumber)) {
    completedEventNumbers.push(eventNumber);
  }
  completedEventNumbers.sort((a, b) => a - b);
  
  console.log(`   User has completed events: [${completedEventNumbers.join(', ')}]`);

  // Calculate user's correct total points from stored event results (includes bonus points)
  // This fixes any accumulated discrepancy from past events
  let userCorrectPreviousPoints = 0;
  for (let i = 1; i <= 15; i++) {
    // Skip current event - that will be added separately with userActualPoints
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
    // Clean up any malformed points (convert "[object Object]41" to number)
    if (typeof racer.points === 'string' && racer.points.includes('[object Object]')) {
      // Extract any numeric portion
      const numericPart = racer.points.replace(/\[object Object\]/g, '');
      racer.points = parseInt(numericPart) || 0;
    } else if (typeof racer.points === 'object') {
      // If points is an object, extract the points property
      racer.points = racer.points.points || 0;
    }
    // Ensure points is a number
    racer.points = Number(racer.points) || 0;

    // Sanitize uid: convert undefined to null for Firestore compatibility
    if (racer.uid === undefined) {
      racer.uid = null;
    }

    standingsMap.set(racer.uid || racer.name, racer);
  });
  
  // Process all racers from CURRENT event CSV
  results.forEach(result => {
    const uid = result.UID || null;  // Convert undefined to null for Firestore compatibility
    const name = result.Name;
    const position = parseInt(result.Position);
    
    // Debug logging for bot UIDs
    if (result.Gender === 'Bot' || (uid && uid.startsWith && uid.startsWith('Bot'))) {
      console.log(`  🤖 Bot detected: name="${name}", uid="${uid}", gender="${result.Gender}"`);
    }
    
    // Skip DNFs and invalid positions
    if (result.Position === 'DNF' || isNaN(position)) {
      return;
    }
    
    const pointsResult = calculatePoints(position, eventNumber);
    let points = pointsResult.points; // Extract numeric value
    const arr = parseInt(result.ARR) || 0;
    const team = result.Team || '';
    const isBotRacer = isBot(uid, result.Gender);
    const isCurrentUserResult = uid === currentUid;

    // For current user, use actual points (including bonus) instead of calculated base points
    if (isCurrentUserResult && userActualPoints !== undefined) {
      points = userActualPoints;
      console.log(`   💰 Using user's actual points for current event (including bonus): ${points}`);
    }

    // Use UID for humans, name for bots (bots may not have persistent UIDs)
    const key = isBotRacer ? name : uid;

    if (standingsMap.has(key)) {
      // Update existing racer
      const racer = standingsMap.get(key);

      // For current user, reset to correct total from stored event results
      // This fixes any accumulated discrepancy from past events
      if (isCurrentUserResult) {
        racer.points = userCorrectPreviousPoints + points;
        racer.events = completedEventNumbers.length; // Correct events count from stored results
        console.log(`   ✅ User standings points corrected: ${userCorrectPreviousPoints} (previous) + ${points} (current) = ${racer.points} (${racer.events} events)`);
      } else {
        racer.points = (racer.points || 0) + points;
        racer.events = (racer.events || 0) + 1;
      }
      racer.arr = arr; // Update to most recent ARR
      racer.team = team || racer.team; // Keep team if exists
      
      // Backfill UID if missing (for old standings that had null UIDs)
      if (!racer.uid) {
        console.log(`  🔧 Backfilling UID for ${name}: null → ${uid}`);
        racer.uid = uid;
      }
    } else {
      // Add new racer - use the UID from CSV (already in correct format like Bot711)
      if (isBotRacer) {
        console.log(`  ➕ Adding new bot to standings: ${name} with UID: ${uid}`);
      }

      // For current user, include points from ALL stored event results
      let totalPoints = points;
      let eventCount = 1;
      if (isCurrentUserResult) {
        totalPoints = userCorrectPreviousPoints + points;
        eventCount = completedEventNumbers.length;
        console.log(`   ✅ New user entry with correct points: ${userCorrectPreviousPoints} (previous) + ${points} (current) = ${totalPoints} (${eventCount} events)`);
      }

      standingsMap.set(key, {
        name: name,
        uid: uid, // Use actual UID from CSV
        arr: arr,
        team: team,
        events: eventCount,
        points: totalPoints,
        isBot: isBotRacer,
        isCurrentUser: isCurrentUserResult
      });
    }
  });
  
  // Now backfill bots with simulated results
  // Get all results from events 1 through current FOR THIS USER ONLY
  console.log('   Backfilling bot results...');
  const allEventResults = await getAllPreviousEventResults(season, eventNumber, currentUid);
  
  // IMPORTANT: Also include current event's results (not yet in Firestore)
  // The 'results' parameter contains the current event being processed
  allEventResults[eventNumber] = results;
  
  // Build a map of all unique bots and track which events they participated in
  const allBots = new Map(); // botName -> { uid, arr, actualEvents: Set<eventNum> }
  
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
        
        // Track which event this bot actually participated in
        allBots.get(botName).actualEvents.add(parseInt(eventNum));
        
        // Update ARR and UID to most recent
        allBots.get(botName).arr = arr;
        allBots.get(botName).uid = botUid;
      }
    });
  }
  
  console.log(`   Found ${allBots.size} unique bots across all events`);
  
  // For each bot, simulate missing events and update standings
  for (const [botName, botInfo] of allBots.entries()) {
    if (!standingsMap.has(botName)) {
      // Bot not in standings yet, add them with their actual UID
      standingsMap.set(botName, {
        name: botName,
        uid: botInfo.uid || null,  // Use UID from their race results
        arr: botInfo.arr,
        team: '',
        events: 0,
        points: 0,
        isBot: true,
        isCurrentUser: false
      });
    }
    
    const botStanding = standingsMap.get(botName);
    
    // Backfill UID if it was null but we now have it
    if (!botStanding.uid && botInfo.uid) {
      botStanding.uid = botInfo.uid;
    }
    
    // CRITICAL: Reset bot points to prevent accumulation bug
    // Bot points will be recalculated from scratch below
    botStanding.points = 0;
    
    // Calculate points for all completed events (real + simulated)
    let simulatedEvents = 0;
    
    for (const eventNum of completedEventNumbers) {
      if (botInfo.actualEvents.has(eventNum)) {
        // Bot participated - their points should be in allEventResults
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
        // Bot didn't participate - simulate it
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNum);
        const points = calculatePoints(simulatedPosition, eventNum).points;
        botStanding.points += points;
        simulatedEvents++;
      }
    }
    
    botStanding.events = completedEventNumbers.length;
    botStanding.simulatedEvents = simulatedEvents;
  }
  
  // IMPORTANT: Ensure ALL bots in standings (not just those in allBots) have correct events count
  // This handles any edge cases where bots might be in standings but not in allBots
  let botsUpdatedCount = 0;
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      // Make sure all bots show the same event count as user's completed events
      racer.events = completedEventNumbers.length;
      botsUpdatedCount++;
    }
  }
  
  console.log(`   Simulated results for ${allBots.size} bots`);
  console.log(`   Updated events count for ${botsUpdatedCount} total bots in standings`);
  
  // Convert back to array and sort by points
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => b.points - a.points);

  // Limit to 80 bots, stratified by points to maintain ability diversity
  const MAX_BOTS = 80;
  const QUINTILES = 5;
  const BOTS_PER_QUINTILE = MAX_BOTS / QUINTILES; // 16

  const humans = standings.filter(r => !r.isBot);
  const bots = standings.filter(r => r.isBot);

  let finalStandings;

  if (bots.length <= MAX_BOTS) {
    // No filtering needed
    console.log(`   Bot count (${bots.length}) within limit of ${MAX_BOTS}, keeping all`);
    finalStandings = standings;
  } else {
    // Stratify bots into quintiles and take 16 from each
    console.log(`   Limiting bots from ${bots.length} to ${MAX_BOTS} (stratified by points)`);

    // Bots are already sorted by points (descending) from standings sort
    const quintileSize = Math.ceil(bots.length / QUINTILES);
    const selectedBots = [];

    for (let q = 0; q < QUINTILES; q++) {
      const start = q * quintileSize;
      const end = Math.min(start + quintileSize, bots.length);
      const quintileBots = bots.slice(start, end);

      // Take up to 16 from this quintile (they're already sorted by points within quintile)
      const selected = quintileBots.slice(0, BOTS_PER_QUINTILE);
      selectedBots.push(...selected);

      console.log(`   Quintile ${q + 1}: ${quintileBots.length} bots, selected ${selected.length}`);
    }

    console.log(`   Total bots selected: ${selectedBots.length}`);

    // Recombine humans + selected bots and re-sort
    finalStandings = [...humans, ...selectedBots];
    finalStandings.sort((a, b) => b.points - a.points);
  }

  // Final sanitization: ensure no undefined values for Firestore compatibility
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
 * Update bot profile ARRs from race results
 */
async function updateBotARRs(season, event, results) {
  console.log('   Updating bot ARRs...');
  
  let botsFound = 0;
  let botsUpdated = 0;
  let botsNotFound = 0;
  
  // Process each bot in results
  for (const result of results) {
    const uid = result.UID;
    const arr = parseInt(result.ARR);
    
    // Check if this is a bot
    if (!isBot(uid, result.Gender)) {
      continue;
    }
    
    // Validate ARR
    if (!arr || isNaN(arr) || arr < 0) {
      console.log(`   âš ï¸  Invalid ARR for bot ${uid}: ${result.ARR}`);
      continue;
    }
    
    botsFound++;
    
    try {
      const botProfileRef = db.collection('botProfiles').doc(uid);
      const botProfileDoc = await botProfileRef.get();
      
      if (!botProfileDoc.exists) {
        console.log(`   â„¹ï¸  Bot profile not found for ${uid}, skipping`);
        botsNotFound++;
        continue;
      }
      
      // Update bot profile with latest ARR
      await botProfileRef.update({
        arr: arr,
        lastARRUpdate: admin.firestore.FieldValue.serverTimestamp(),
        lastEventId: `season${season}_event${event}`
      });
      
      console.log(`   ✓ Updated ${uid} ARR: ${arr}`);
      botsUpdated++;
      
    } catch (error) {
      console.error(`   ✗ Error updating bot ${uid}:`, error.message);
    }
  }
  
  if (botsFound > 0) {
    console.log(`   Bot ARR updates: ${botsUpdated} updated, ${botsNotFound} profiles not found`);
  }
}

/**
 * Update results summary collection (for quick access to full results)
 * Each user gets their own results document
 * @param {number} unlockBonusPoints - Bonus points from triggered unlocks (for current user only)
 * @param {Array} unlockBonusesApplied - Array of unlock bonus details (for current user only)
 */
async function updateResultsSummary(season, event, results, userUid, unlockBonusPoints = 0, unlockBonusesApplied = []) {
  // Store results per-user, not shared
  const summaryRef = db.collection('results').doc(`season${season}_event${event}_${userUid}`);
  
  // First calculate predictions for all results
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

      // Calculate new awards
      const times = awardsCalc.getTimesFromResults(
        results.map(r => ({
          position: parseInt(r.Position),
          time: parseFloat(r.Time)
        })).filter(r => !isNaN(r.position)),
        position
      );

      // Time-based awards should NOT be awarded for:
      // - Event 3: Elimination race (times don't reflect racing - riders eliminated at intervals)
      // - Time-based events (e.g., Event 4): All riders finish at the same clock time, distance varies
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
        isBot: isBot(r.UID, r.Gender)
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
        isDNF: true
      };
    });

  // Combine finishers and DNFs (DNFs at end)
  const validResults = [...finishedResults, ...dnfResults];
  
  await summaryRef.set({
    season: season,
    event: event,
    userUid: userUid,
    totalParticipants: finishedResults.length,
    totalDNFs: dnfResults.length,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    results: validResults
  });
  
  console.log(`✅ Updated results summary for season ${season} event ${event}`);
  
  // Update bot ARRs from these results
  await updateBotARRs(season, event, results);
}


/**
 * Check if season is complete and mark it, award season podium trophies
 * @returns {Array} - Array of earned season awards for notifications
 */
async function checkAndMarkSeasonComplete(userRef, userData, eventNumber, recentUpdates, seasonStandings) {
  // Track earned season awards for notifications
  const earnedSeasonAwards = [];

  // Merge recent updates with existing userData for checking
  const currentData = { ...userData, ...recentUpdates };

  console.log(`\n🔍 Checking season completion for event ${eventNumber}...`);
  console.log(`   Event 15 results exist: ${!!currentData.event15Results}`);
  console.log(`   Event 15 position: ${currentData.event15Results?.position}`);
  console.log(`   Event 14 DNS: ${currentData.event14DNS}`);
  console.log(`   Event 15 DNS: ${currentData.event15DNS}`);
  console.log(`   Season already complete: ${currentData.season1Complete}`);

  // Season 1 is complete when:
  // 1. Event 15 is completed with results
  // 2. OR Event 14 or 15 are marked as DNS

  const event15Complete = currentData.event15Results &&
                         currentData.event15Results.position &&
                         currentData.event15Results.position !== 'DNF';
  const event14DNS = currentData.event14DNS === true;
  const event15DNS = currentData.event15DNS === true;

  const isSeasonComplete = event15Complete || event14DNS || event15DNS;

  console.log(`   Is season complete: ${isSeasonComplete}`);

  // If season is already marked complete, skip
  if (currentData.season1Complete === true) {
    console.log('   ⚠️  Season already marked complete, skipping trophy awards');
    return earnedSeasonAwards;
  }

  // If season is not yet complete, skip
  if (!isSeasonComplete) {
    console.log('   ℹ️  Season not yet complete');
    return earnedSeasonAwards;
  }
  
  console.log('🏆 Season 1 is now COMPLETE for this user!');
  
  // Get user's season rank from the season standings we already calculated
  // (which includes all bots and is properly sorted)
  const userRank = seasonStandings.findIndex(r => r.uid === userData.uid) + 1;
  
  if (userRank === 0 || userRank > seasonStandings.length) {
    console.log('   ⚠️ User not found in season standings - skipping season awards');
    return earnedSeasonAwards; // Return early - don't award trophies incorrectly
  }

  console.log(`   User's season rank: ${userRank} out of ${seasonStandings.length}`);
  
  // Prepare season completion updates
  const seasonUpdates = {
    season1Complete: true,
    season1CompletionDate: admin.firestore.FieldValue.serverTimestamp(),
    season1Rank: userRank,
    localTourStatus: event14DNS || event15DNS ? 'dnf' : 'completed',
    currentSeason: 1 // For future use when season 2 launches
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

  // PERFECT SEASON - Win every event (all 15 events with position 1)
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
  const eventTypeWins = {}; // Track wins by event type

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

  // Return earned season awards for notification system
  return earnedSeasonAwards;
}
/**
 * Main processing function
 */
async function processResults(csvFiles) {
  console.log(`Processing ${csvFiles.length} CSV file(s)...`);
  
  // Sort files by timestamp - prefer filename timestamp over file modification time
  // This is important when files are copied and lose their original modification times
  const filesWithStats = csvFiles.map(filePath => {
    // First, try to extract timestamp from filename
    const filenameTimestamp = extractTimestampFromFilename(filePath);
    
    if (filenameTimestamp) {
      return {
        path: filePath,
        timestamp: filenameTimestamp,
        source: 'filename'
      };
    }
    
    // Fall back to file modification time
    try {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        timestamp: stats.mtime.getTime(),
        source: 'file_modified'
      };
    } catch (error) {
      console.error(`⚠️  Could not stat file ${filePath}:`, error.message);
      return {
        path: filePath,
        timestamp: 0, // If both fail, process first
        source: 'none'
      };
    }
  });
  
  // Sort by timestamp (oldest first)
  filesWithStats.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log('Processing order (by timestamp):');
  filesWithStats.forEach((file, index) => {
    const date = new Date(file.timestamp);
    const sourceLabel = file.source === 'filename' ? '📅 filename' : 
                        file.source === 'file_modified' ? '📁 file modified' : 
                        '⚠️  no timestamp';
    console.log(`  ${index + 1}. ${file.path} (${date.toISOString()}) [${sourceLabel}]`);
  });
  console.log('');
  
  for (const fileInfo of filesWithStats) {
    const filePath = fileInfo.path;
    try {
      console.log(`\n📄 Processing: ${filePath}`);
      
      // Parse event info from path
      const eventInfo = parseEventPath(filePath);
      console.log(`   Season ${eventInfo.season}, Event ${eventInfo.event}`);
      
      // Read and parse CSV
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const results = await parseCSV(csvContent);
      
      console.log(`   Found ${results.length} results in CSV`);
      
      // Find all human UIDs in results
      const humanUids = results
        .filter(r => !isBot(r.UID, r.Gender))
        .map(r => r.UID)
        .filter((uid, index, self) => uid && self.indexOf(uid) === index); // Unique UIDs only
      
      console.log(`   Found ${humanUids.length} human racer(s): ${humanUids.join(', ')}`);
      
      // Debug: Show sample of what we found
      if (results.length > 0) {
        const sample = results[0];
        console.log(`   Sample data - Name: ${sample.Name}, Gender: ${sample.Gender}, UID: ${sample.UID}`);
      }
      
      // Process each human's result
      for (const uid of humanUids) {
        await processUserResult(uid, eventInfo, results, fileInfo.timestamp);
      }
      
      // Rename CSV to include timestamp for chronological tracking
      // Format: originalname_YYYYMMDD_HHMMSS.csv
      const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')  // Remove dashes and colons
        .replace(/\..+/, '')   // Remove milliseconds
        .replace('T', '_');    // Replace T with underscore: YYYYMMDD_HHMMSS
      
      // Check if filename already has a timestamp (pattern: _YYYYMMDD_HHMMSS.csv)
      const hasTimestamp = /(_\d{8}_\d{6})\.csv$/.test(filePath);
      
      if (!hasTimestamp) {
        const newPath = filePath.replace(/\.csv$/, `_${timestamp}.csv`);
        try {
          fs.renameSync(filePath, newPath);
          console.log(`   📅 Renamed to: ${path.basename(newPath)}`);
        } catch (renameError) {
          console.log(`   ⚠️  Could not rename CSV (file may be locked): ${renameError.message}`);
        }
      } else {
        console.log(`   📅 CSV already has timestamp, skipping rename`);
      }
      
    } catch (error) {
      console.error(`âŒ Error processing ${filePath}:`, error);
    }
  }
  
  console.log('\nâœ… All results processed!');
}

// Main execution
/**
 * Process pending bot profile requests from Firestore and append to GitHub text file
 */
async function processBotProfileRequests() {
  try {
    console.log('\n📋 Checking for pending bot profile requests...');

    // Prepare the text file path
    const requestsFilePath = path.join(__dirname, 'bot-profile-requests', 'requests.txt');

    // Ensure directory exists
    const dirPath = path.dirname(requestsFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Get all unprocessed bot profile requests
    // Query all documents and filter in code to catch docs without 'processed' field
    const allRequestsSnapshot = await db.collection('botProfileRequests').get();

    // Filter for unprocessed requests (processed === false OR processed field doesn't exist)
    const pendingDocs = allRequestsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.processed === false || data.processed === undefined;
    });

    if (pendingDocs.length === 0) {
      console.log('   No pending bot profile requests in Firestore');
    } else {
      console.log(`   Found ${pendingDocs.length} pending request(s) in Firestore`);

      // Append each request to the file
      let appendedCount = 0;
      let skippedCount = 0;
      let deletedCount = 0;

      for (const doc of pendingDocs) {
        const request = doc.data();

        // Check if bot profile already exists
        const botProfileDoc = await db.collection('botProfiles').doc(request.botUid).get();

        if (botProfileDoc.exists) {
          console.log(`   ⏭️  Bot profile already exists for ${request.botName} (${request.botUid}), removing request...`);

          // Delete the request from Firestore
          await db.collection('botProfileRequests').doc(doc.id).delete();

          deletedCount++;
          skippedCount++;
          continue;
        }

        // Format timestamp
        const timestamp = new Date(request.timestamp).toISOString().replace('T', ' ').split('.')[0] + ' UTC';

        // Format the request entry
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

        // Append to file
        fs.appendFileSync(requestsFilePath, entry, 'utf8');

        // Mark as processed in Firestore
        await db.collection('botProfileRequests').doc(doc.id).update({
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        appendedCount++;
        console.log(`   ✅ Processed request for ${request.botName} (${request.botUid})`);
      }

      console.log(`   📝 Appended ${appendedCount} request(s) to ${requestsFilePath}`);
      if (deletedCount > 0) {
        console.log(`   🗑️  Removed ${deletedCount} duplicate request(s) from Firestore`);
      }
    }

    // Clean up requests.txt - remove entries for bots that now have profiles
    // This runs regardless of whether there were new Firestore requests
    if (fs.existsSync(requestsFilePath)) {
      console.log('   🔍 Checking requests.txt for completed profiles...');

      const fileContent = fs.readFileSync(requestsFilePath, 'utf8');
      const separator = '================================================================================';
      const entries = fileContent.split(separator).filter(entry => entry.trim());

      let removedFromFile = 0;
      const remainingEntries = [];

      for (const entry of entries) {
        // Extract Bot UID from entry
        const botUidMatch = entry.match(/Bot UID:\s*(\S+)/);
        if (!botUidMatch) {
          // Keep entries we can't parse
          remainingEntries.push(entry);
          continue;
        }

        const botUid = botUidMatch[1];
        const botProfileDoc = await db.collection('botProfiles').doc(botUid).get();

        if (botProfileDoc.exists) {
          // Bot profile exists, remove this entry
          const botNameMatch = entry.match(/Bot Name:\s*(.+)/);
          const botName = botNameMatch ? botNameMatch[1].trim() : botUid;
          console.log(`   🗑️  Removing completed request for ${botName} (${botUid}) from file`);
          removedFromFile++;
        } else {
          // Keep this entry
          remainingEntries.push(entry);
        }
      }

      if (removedFromFile > 0) {
        // Rewrite the file with remaining entries
        if (remainingEntries.length > 0) {
          const newContent = remainingEntries.map(entry =>
            separator + entry + separator
          ).join('\n');
          fs.writeFileSync(requestsFilePath, newContent, 'utf8');
        } else {
          // All entries removed, write empty file
          fs.writeFileSync(requestsFilePath, '', 'utf8');
        }
        console.log(`   ✅ Removed ${removedFromFile} completed request(s) from requests.txt`);
      } else {
        console.log('   No completed profiles to remove from requests.txt');
      }
    }

  } catch (error) {
    console.error('❌ Error processing bot profile requests:', error);
    // Don't fail the entire job if this fails
  }
}

(async () => {
  try {
    const filesArg = process.argv[2];
    const csvFiles = JSON.parse(filesArg);

    if (!csvFiles || csvFiles.length === 0) {
      console.log('No CSV files to process');
      process.exit(0);
    }

    await processResults(csvFiles);

    // Process any pending bot profile requests
    await processBotProfileRequests();

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

module.exports = { processResults, calculatePoints };
