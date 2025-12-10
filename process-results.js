// process-results.js - Process race results CSVs and update Firestore

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const admin = require('firebase-admin');
const awardsCalc = require('./awards-calculation');
const storyGen = require('./story-generator');

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
 * Determine performance tier from position
 */
function determinePerformanceTier(position) {
  if (position === 1) return 'win';
  if (position <= 3) return 'podium';
  if (position <= 10) return 'top10';
  if (position <= 20) return 'midpack';
  return 'back';
}

// Event types for each event in Season 1
const EVENT_TYPES = {
  1: 'criterium', 2: 'road race', 3: 'track elimination', 4: 'time trial',
  5: 'points race', 6: 'hill climb', 7: 'criterium', 8: 'gran fondo',
  9: 'hill climb', 10: 'time trial', 11: 'points race', 12: 'gravel race',
  13: 'road race', 14: 'road race', 15: 'time trial'
};

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

// Stage requirements for Career Mode progression
const STAGE_REQUIREMENTS = {
  1: { type: 'fixed', eventId: 1 },
  2: { type: 'fixed', eventId: 2 },
  3: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  4: { type: 'fixed', eventId: 3 },
  5: { type: 'fixed', eventId: 4 },
  6: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  7: { type: 'fixed', eventId: 5 },
  8: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  9: { type: 'tour', eventIds: [13, 14, 15] }
};

const OPTIONAL_EVENTS = [6, 7, 8, 9, 10, 11, 12];

/**
 * Check if an event is valid for a given stage
 */
function isEventValidForStage(eventNumber, currentStage, usedOptionalEvents = [], tourProgress = {}) {
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
  
  // Stage 9 is the tour - stay at stage 9 until all 3 events complete
  if (currentStage === 9) {
    if (tourProgress.event13Completed && tourProgress.event14Completed && tourProgress.event15Completed) {
      return 9; // Season complete - no stage 10
    }
    return 9; // Stay at stage 9 until all tour events done
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
  15: 135  // Local Tour Stage 3
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
  
  // Only positions 1-40 score points
  if (position > 40) {
    return { points: 0, bonusPoints: 0 };
  }
  
  // Calculate base points
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
  return gender === 'Bot' || (uid && uid.startsWith('Bot'));
}

/**
 * Calculate rival encounters for this race
 * Finds all bots within 30 seconds of user's time and records the encounter
 */
function calculateRivalEncounters(results, userUid, userPosition, userTime) {
  const encounters = [];

  // Find user's result
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF') {
    return encounters;
  }

  // Check all other racers
  results.forEach(result => {
    const botUid = result.UID;
    const botTime = parseFloat(result.Time);
    const botPosition = parseInt(result.Position);

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

    // Initialize bot encounter data if doesn't exist
    if (!rivalData.encounters[botUid]) {
      rivalData.encounters[botUid] = {
        botName: encounter.botName,
        botTeam: encounter.botTeam,
        botCountry: encounter.botCountry,
        botArr: encounter.botArr,
        races: 0,
        userWins: 0,
        botWins: 0,
        totalGap: 0,
        avgGap: 0,
        closestGap: Infinity,
        lastRace: eventNumber
      };
    }

    const botData = rivalData.encounters[botUid];

    // Update stats
    botData.races += 1;
    botData.totalGap += encounter.timeGap;
    botData.avgGap = botData.totalGap / botData.races;
    botData.closestGap = Math.min(botData.closestGap, encounter.timeGap);
    botData.lastRace = eventNumber;

    // Update wins/losses
    if (encounter.userFinishedAhead) {
      botData.userWins += 1;
    } else {
      botData.botWins += 1;
    }

    // Update bot info (in case it changed)
    botData.botName = encounter.botName;
    botData.botTeam = encounter.botTeam;
    botData.botCountry = encounter.botCountry;
    botData.botArr = encounter.botArr;
  });

  return rivalData;
}

/**
 * Identify top 3 rivals based on rivalry score
 * Rivalry score = (number of races together) / (average gap + 1)
 * Higher score = closer racing more often = bigger rival
 */
function identifyTopRivals(rivalData) {
  if (!rivalData || !rivalData.encounters) {
    return [];
  }

  // Calculate rivalry score for each bot
  const rivalScores = Object.keys(rivalData.encounters).map(botUid => {
    const data = rivalData.encounters[botUid];
    // Score favors more races and closer gaps
    const rivalryScore = data.races / (data.avgGap + 1);
    return {
      botUid: botUid,
      score: rivalryScore,
      races: data.races
    };
  });

  // Sort by rivalry score (descending) and return top 3 UIDs
  const topRivals = rivalScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
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
 */
async function calculateGC(season, userUid, upToEvent = 15, currentUserResult = null) {
  console.log(`   Calculating GC through event ${upToEvent}...`);
  
  // Determine which stages to include
  const stageNumbers = [];
  if (upToEvent >= 13) stageNumbers.push(13);
  if (upToEvent >= 14) stageNumbers.push(14);
  if (upToEvent >= 15) stageNumbers.push(15);
  
  // Fetch results from all stages by querying all result documents for each event
  const stageResults = {};
  
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
      // Mark this stage as actually raced
      const rider = allRiders.get(r.uid);
      rider.actualStages.add(eventNum);
      rider.stageResults[eventNum] = {
        position: r.position,
        time: parseFloat(r.time) || 0,
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
  
  // Simulate missing stages for bots (not humans, not DNS bots)
  allRiders.forEach((rider, uid) => {
    if (rider.isBot && !botDNS.has(uid)) {
      stageNumbers.forEach(eventNum => {
        if (!rider.actualStages.has(eventNum)) {
          // Simulate this stage for this bot
          const fieldSize = stageResults[eventNum]?.length || 50;
          const simulatedPosition = simulatePosition(uid, rider.arr, eventNum, fieldSize);
          
          // Convert position to approximate time based on event characteristics
          // Use the median time from actual results as baseline
          const actualTimes = stageResults[eventNum]
            ?.filter(r => r.time && r.position !== 'DNF')
            .map(r => parseFloat(r.time))
            .sort((a, b) => a - b) || [3600];
          
          const medianTime = actualTimes[Math.floor(actualTimes.length / 2)] || 3600;
          const maxTime = actualTimes[actualTimes.length - 1] || 4000;
          
          // Scale time based on simulated position
          // Better positions = closer to median, worse = closer to max
          const positionRatio = (simulatedPosition - 1) / fieldSize;
          const simulatedTime = medianTime + (maxTime - medianTime) * positionRatio;
          
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
      
      stageNumbers.forEach(eventNum => {
        const result = rider.stageResults[eventNum];
        if (result) {
          cumulativeTime += result.time;
          if (result.isActual) {
            actualStagesCount++;
          } else {
            simulatedStagesCount++;
          }
        }
      });
      
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
    const lines = csvContent.split('\n');
    
    if (lines[0].includes('OVERALL INDIVIDUAL RESULTS')) {
      // Skip first 2 lines (title + blank)
      processedContent = lines.slice(2).join('\n');
      console.log('   Detected TPVirtual CSV format, skipping title lines');
    }
    
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
 */
async function processUserResult(uid, eventInfo, results) {
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
  
  // Get user's current stage and used optional events
  const currentStage = userData.currentStage || 1;
  const usedOptionalEvents = userData.usedOptionalEvents || [];
  const tourProgress = userData.tourProgress || {};
  
  // Validate if this event is valid for the user's current stage
  const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
  
  if (!validation.valid) {
    console.log(`❌ Event ${eventNumber} is not valid for user ${uid} at stage ${currentStage}`);
    console.log(`   Reason: ${validation.reason}`);
    console.log(`   This result will NOT be processed or stored.`);
    return;
  }
  
  console.log(`✅ Event ${eventNumber} is valid for stage ${currentStage}`);
  
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
  
  const position = parseInt(userResult.Position);
  if (isNaN(position) || userResult.Position === 'DNF') {
    console.log(`User ${uid} has DNF or invalid position, awarding 0 points`);
    // Store DNF result but don't award points
    await userRef.update({
      [`event${eventNumber}Results`]: {
        position: 'DNF',
        time: parseFloat(userResult.Time) || 0,
        arr: parseInt(userResult.ARR) || 0,
        points: 0,
        distance: parseFloat(userResult.Distance) || 0,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      team: userResult.Team || '' // Update team even on DNF
    });
    return;
  }
  
  // Calculate predicted position based on EventRating
  const predictedPosition = calculatePredictedPosition(results, uid);
  
  // Calculate points (including bonus points)
  const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
  let { points, bonusPoints } = pointsResult;
  
  // Check if earned punching medal (beat prediction by 10+ places)
  let earnedPunchingMedal = false;
  if (predictedPosition) {
    const placesBeaten = predictedPosition - position;
    earnedPunchingMedal = placesBeaten >= 10;
  }
  
  // Check if earned Giant Killer medal (beat highest-rated rider)
  const earnedGiantKillerMedal = checkGiantKiller(results, uid);
  
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
  const earnedDomination = awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
  const earnedCloseCall = awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
  
  // Photo Finish should not be awarded for time challenge events (where everyone does the same time)
  // Event 4 is Coastal Loop Time Challenge (20 minutes)
  const isTimeChallenge = eventNumber === 4;
  const earnedPhotoFinish = isTimeChallenge ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime);
  
  const earnedDarkHorse = awardsCalc.checkDarkHorse(position, predictedPosition);
  
  // Zero to Hero requires previous event data
  let earnedZeroToHero = false;
  if (eventNumber > 1) {
    const prevEventResults = userData[`event${eventNumber - 1}Results`];
    if (prevEventResults && prevEventResults.position && prevEventResults.position !== 'DNF') {
      // Get total finishers for both events from results
      const currentFinishers = results.filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position))).length;
      // We need previous event's total finishers - we'll approximate from standings or use null
      earnedZeroToHero = awardsCalc.checkZeroToHero(
        { position: prevEventResults.position, totalFinishers: 50 }, // Approximate
        { position: position, totalFinishers: currentFinishers }
      );
    }
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
  
  if (validation.isTour) {
    console.log('   🏁 Tour stage complete - calculating current GC...');
    // Pass current user's result so they're included in GC even before data is stored
    const currentUserResult = {
      name: userResult.Name,
      team: userResult.Team || '',
      arr: parseInt(userResult.ARR) || 1000,
      position: position,
      time: parseFloat(userResult.Time) || 0
    };
    gcResults = await calculateGC(season, uid, eventNumber, currentUserResult);
    
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
    position: position,
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
    earnedGCGoldMedal: gcAwards.gcGoldMedal,
    earnedGCSilverMedal: gcAwards.gcSilverMedal,
    earnedGCBronzeMedal: gcAwards.gcBronzeMedal,
    gcBonusPoints: gcBonusPoints,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    earnedAwards: [], // NEW: Track awards for notification system
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Build season standings with all racers from CSV
  const seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid);
  
  // Track if this is an optional event
  const newUsedOptionalEvents = [...usedOptionalEvents];
  if (OPTIONAL_EVENTS.includes(eventNumber) && !usedOptionalEvents.includes(eventNumber)) {
    newUsedOptionalEvents.push(eventNumber);
  }
  
  // Update tour progress if this is a tour event
  const newTourProgress = { ...tourProgress };
  if (validation.isTour) {
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
  const nextStage = calculateNextStage(currentStage, newTourProgress);
  
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
  const completedEventNumbers = [];
  for (let i = 1; i <= 15; i++) {
    if (userData[`event${i}Results`]) {
      completedEventNumbers.push(i);
    }
  }
  const previousEventNumber = completedEventNumbers.length > 0 ? completedEventNumbers[completedEventNumbers.length - 1] : null;
  
  // Determine next event number based on next stage
  let nextEventNumber = nextStage;
  const STAGE_REQUIREMENTS_MAP = {
    1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 13
  };
  if (STAGE_REQUIREMENTS_MAP[nextStage]) {
    nextEventNumber = STAGE_REQUIREMENTS_MAP[nextStage];
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

  // Calculate rival encounters for this race (must be before story generation)
  const rivalEncounters = calculateRivalEncounters(
    results,
    uid,
    position,
    parseFloat(userResult.Time) || 0
  );

  // Update rival data (must be before story generation)
  const existingRivalData = userData.rivalData || null;
  const updatedRivalData = updateRivalData(existingRivalData, rivalEncounters, eventNumber);

  // Identify top 3 rivals
  const topRivals = identifyTopRivals(updatedRivalData);
  updatedRivalData.topRivals = topRivals;

  // Log rival encounters
  if (rivalEncounters.length > 0) {
    console.log(`   🤝 Rival encounters: ${rivalEncounters.length} bot(s) within 30s`);
  }

  // Generate story using v3.0 story generator (has all features built-in)
  let unifiedStory = '';

  // Debug: Log GC data if available
  if (gcResults) {
    console.log(`   📊 GC Data available: userGC position = ${gcResults.userGC?.gcPosition || 'null'}, gap = ${gcResults.userGC?.gapToLeader || 'null'}s`);
  }

  const storyResult = await storyGen.generateRaceStory(
    {
      eventNumber: eventNumber,
      position: position,
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
      racesCompleted: (userData.completedStages || []).length
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
  
  // Check for DNS on Local Tour stages (24-hour window enforcement)
  const dnsFlags = {};
  if (eventNumber >= 13 && eventNumber <= 15) {
    // Check if previous tour stage was completed in time
    if (eventNumber === 14 && userData.event13Results) {
      // Check if event 13 was done more than 24 hours ago
      const event13Timestamp = userData.event13Results.timestamp;
      if (event13Timestamp) {
        const event13Time = event13Timestamp.toMillis ? event13Timestamp.toMillis() : event13Timestamp;
        const now = Date.now();
        const hoursSinceEvent13 = (now - event13Time) / (1000 * 60 * 60);
        
        if (hoursSinceEvent13 > 24) {
          console.log(`   ⚠️ WARNING: Event 14 completed ${hoursSinceEvent13.toFixed(1)} hours after Event 13 (>24hr window)`);
          dnsFlags.event14DNS = true;
          dnsFlags.event14DNSReason = `Completed ${hoursSinceEvent13.toFixed(1)} hours after Stage 1 (24hr limit exceeded)`;
        }
      }
    }
    
    if (eventNumber === 15 && userData.event14Results) {
      // Check if event 14 was done more than 24 hours ago
      const event14Timestamp = userData.event14Results.timestamp;
      if (event14Timestamp) {
        const event14Time = event14Timestamp.toMillis ? event14Timestamp.toMillis() : event14Timestamp;
        const now = Date.now();
        const hoursSinceEvent14 = (now - event14Time) / (1000 * 60 * 60);
        
        if (hoursSinceEvent14 > 24) {
          console.log(`   ⚠️ WARNING: Event 15 completed ${hoursSinceEvent14.toFixed(1)} hours after Event 14 (>24hr window)`);
          dnsFlags.event15DNS = true;
          dnsFlags.event15DNSReason = `Completed ${hoursSinceEvent14.toFixed(1)} hours after Stage 2 (24hr limit exceeded)`;
        }
      }
    }
  }
  
  // Calculate career statistics from all event results (including current)
  const tempUserData = { ...userData };
  tempUserData[`event${eventNumber}Results`] = eventResults;
  const careerStats = await calculateCareerStats(tempUserData);

  // Update user document
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    currentStage: nextStage,
    totalPoints: (userData.totalPoints || 0) + points,
    totalEvents: (userData.totalEvents || 0) + 1,
    totalWins: careerStats.totalWins,
    totalPodiums: careerStats.totalPodiums,
    totalTop10s: careerStats.totalTop10s,
    bestFinish: careerStats.bestFinish,
    averageFinish: careerStats.averageFinish,
    winRate: careerStats.winRate,
    podiumRate: careerStats.podiumRate,
    // Note: awards are updated via individual field increments below
    arr: eventResults.arr, // Store most recent ARR
    [`season${season}Standings`]: seasonStandings,
    team: userResult.Team || '',
    gender: userResult.Gender || null,
    country: userResult.Country || null,
    ageBand: userResult.AgeBand || null,
    usedOptionalEvents: newUsedOptionalEvents,
    tourProgress: newTourProgress,
    rivalData: updatedRivalData, // Add rival data
    ...dnsFlags // Add DNS flags if any
  };
  
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
  
  // Merge event awards into updates
  Object.assign(updates, eventAwards);
  
  // Add to completedStages (store the STAGE number, not event number)
  const completedStages = userData.completedStages || [];
  if (!completedStages.includes(currentStage)) {
    updates.completedStages = admin.firestore.FieldValue.arrayUnion(currentStage);
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
    }
  }
  
  // COMEBACK KID - Top 5 after bottom half finish
  if (recentPositions.length >= 2 && position <= 5) {
    const previousPosition = recentPositions[recentPositions.length - 2];
    const totalRiders = results.length;
    const bottomHalf = totalRiders / 2;

    if (previousPosition > bottomHalf) {
      console.log(`   🔄 COMEBACK KID! Top 5 finish after position ${previousPosition}`);
      updates['awards.comeback'] = admin.firestore.FieldValue.increment(1);
      eventResults.earnedAwards.push({ awardId: 'comeback', category: 'event_special', intensity: 'moderate' });
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

  await userRef.update(updates);

  const bonusLog = bonusPoints > 0 ? ` (including +${bonusPoints} bonus)` : '';
  const predictionLog = predictedPosition ? ` | Predicted: ${predictedPosition}` : '';
  const punchingLog = earnedPunchingMedal ? ' PUNCHING MEDAL!' : '';
  const giantKillerLog = earnedGiantKillerMedal ? ' GIANT KILLER!' : '';
  console.log(`Processed event ${eventNumber} for user ${uid}: Position ${position}${predictionLog}, Points ${points}${bonusLog}${punchingLog}${giantKillerLog}`);
  console.log(`   Stage ${currentStage} complete -> Stage ${nextStage}`);
  
  // Update results summary collection (per-user)
  await updateResultsSummary(season, eventNumber, results, uid);
}

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
      // Note: Lantern Rouge would need access to total finishers
      // We'll calculate this during results processing, not here
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
 */
async function buildSeasonStandings(results, userData, eventNumber, currentUid) {
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
    
    standingsMap.set(racer.uid || racer.name, racer);
  });
  
  // Process all racers from CURRENT event CSV
  results.forEach(result => {
    const uid = result.UID;
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
    const points = pointsResult.points; // Extract numeric value
    const arr = parseInt(result.ARR) || 0;
    const team = result.Team || '';
    const isBotRacer = isBot(uid, result.Gender);
    
    // Use UID for humans, name for bots (bots may not have persistent UIDs)
    const key = isBotRacer ? name : uid;
    
    if (standingsMap.has(key)) {
      // Update existing racer
      const racer = standingsMap.get(key);
      racer.points = (racer.points || 0) + points;
      racer.events = (racer.events || 0) + 1;
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
      standingsMap.set(key, {
        name: name,
        uid: uid, // Use actual UID from CSV
        arr: arr,
        team: team,
        events: 1,
        points: points,
        isBot: isBotRacer,
        isCurrentUser: uid === currentUid
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
  
  return standings;
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
 */
async function updateResultsSummary(season, event, results, userUid) {
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
  
  // Filter valid results (no DNFs for summary)
  const validResults = results
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
      
      const earnedDomination = awardsCalc.checkDomination(position, times.winnerTime, times.secondPlaceTime);
      const earnedCloseCall = awardsCalc.checkCloseCall(position, times.winnerTime, times.secondPlaceTime);
      
      // Photo Finish should not be awarded for time challenge events (where everyone does the same time)
      // Event 4 is Coastal Loop Time Challenge (20 minutes)
      const isTimeChallenge = event === 4;
      const earnedPhotoFinish = isTimeChallenge ? false : awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime);
      
      const earnedDarkHorse = awardsCalc.checkDarkHorse(position, predictedPosition);
      
      return {
        position: position,
        name: r.Name,
        uid: r.UID,
        team: r.Team || '',
        arr: parseInt(r.ARR) || 0,
        arrBand: r.ARRBand || '',
        eventRating: parseInt(r.EventRating) || null,
        predictedPosition: predictedPosition,
        time: parseFloat(r.Time) || 0,
        points: points,
        bonusPoints: bonusPoints,
        earnedPunchingMedal: earnedPunchingMedal,
        earnedGiantKillerMedal: earnedGiantKillerMedal,
        earnedDomination: earnedDomination,
        earnedCloseCall: earnedCloseCall,
        earnedPhotoFinish: earnedPhotoFinish,
        earnedDarkHorse: earnedDarkHorse,
        eventPoints: parseInt(r.Points) || null,
        isBot: isBot(r.UID, r.Gender)
      };
    });
  
  await summaryRef.set({
    season: season,
    event: event,
    userUid: userUid,
    totalParticipants: validResults.length,
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
    console.log('   ⚠️ User not found in season standings');
  } else {
    console.log(`   User's season rank: ${userRank} out of ${seasonStandings.length}`);
  }
  
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
        await processUserResult(uid, eventInfo, results);
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

    // Get all unprocessed bot profile requests
    const requestsSnapshot = await db.collection('botProfileRequests')
      .where('processed', '==', false)
      .get();

    if (requestsSnapshot.empty) {
      console.log('   No pending bot profile requests');
      return;
    }

    console.log(`   Found ${requestsSnapshot.size} pending request(s)`);

    // Prepare the text file path
    const requestsFilePath = path.join(__dirname, 'bot-profile-requests', 'requests.txt');

    // Ensure directory exists
    const dirPath = path.dirname(requestsFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Append each request to the file
    let appendedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;

    for (const doc of requestsSnapshot.docs) {
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
      console.log(`   🗑️  Removed ${deletedCount} duplicate request(s) (bot profiles already exist)`);
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
