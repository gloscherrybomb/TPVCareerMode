// process-results.js - Process race results CSVs and update Firestore

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
 * Stage progression rules:
 * Stage 1: event_1 (Coast and Roast Crit)
 * Stage 2: event_2 (Island Classic)
 * Stage 3: any of events 6-12 (first use)
 * Stage 4: event_3 (The Forest Velodrome Elimination)
 * Stage 5: event_4 (Coastal Loop Time Challenge)
 * Stage 6: any of events 6-12 (second use, different from stage 3)
 * Stage 7: event_5 (North Lake Points Race)
 * Stage 8: any of events 6-12 (third use, different from stages 3 & 6)
 * Stage 9: events 13, 14, 15 in order on consecutive calendar days
 */
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
 * Check if an event is valid for the user's current stage
 * @returns {object} { valid: boolean, reason?: string, isTour?: boolean }
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
      return { valid: false, reason: `Event ${eventNumber} is not a valid choice for stage ${currentStage}. Valid events: ${stageReq.eventIds.join(', ')}` };
    }
    if (usedOptionalEvents.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} has already been used in a previous stage` };
    }
    return { valid: true };
  }
  
  if (stageReq.type === 'tour') {
    if (!stageReq.eventIds.includes(eventNumber)) {
      return { valid: false, reason: `Event ${eventNumber} is not part of the Local Tour (stage 9). Required events: 13, 14, 15` };
    }
    
    // Check if this is the next expected tour event
    const nextExpected = getNextTourEvent(tourProgress);
    if (nextExpected === null) {
      return { valid: false, reason: 'Local Tour already completed' };
    }
    if (eventNumber !== nextExpected) {
      return { valid: false, reason: `Local Tour must be completed in order. Expected event ${nextExpected}, got event ${eventNumber}` };
    }
    
    return { valid: true, isTour: true };
  }
  
  return { valid: false, reason: 'Unknown stage type' };
}

/**
 * Get the next expected tour event for stage 9
 * @returns {number|null} Next event ID (13, 14, or 15) or null if tour completed
 */
function getNextTourEvent(tourProgress = {}) {
  if (!tourProgress.event13Completed) return 13;
  if (!tourProgress.event14Completed) return 14;
  if (!tourProgress.event15Completed) return 15;
  return null; // Tour completed
}

/**
 * Check if two dates are consecutive calendar days
 * @param {Date|string|number} date1 - First date (earlier)
 * @param {Date|string|number} date2 - Second date (later)
 * @returns {boolean} True if date2 is exactly one calendar day after date1
 */
function areConsecutiveDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Reset to start of day (UTC) for both
  const d1Start = new Date(Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate()));
  const d2Start = new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate()));
  
  // Calculate difference in days
  const diffTime = d2Start.getTime() - d1Start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}

/**
 * Determine the next stage after completing an event
 * @returns {number} The next stage number
 */
function calculateNextStage(currentStage, tourProgress = {}) {
  if (currentStage < 9) {
    return currentStage + 1;
  }
  
  // Stage 9 (tour) - check if all events completed
  if (currentStage === 9) {
    if (tourProgress.event13Completed && tourProgress.event14Completed && tourProgress.event15Completed) {
      return 10; // Tour completed, move to stage 10 (or season complete)
    }
    return 9; // Stay on stage 9 until tour is complete
  }
  
  return currentStage + 1;
}

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
  
  // Get user's current progression state
  const currentStage = userData.currentStage || 1;
  const usedOptionalEvents = userData.usedOptionalEvents || [];
  const tourProgress = userData.tourProgress || {};
  
  console.log(`   Current stage: ${currentStage}, Used optional events: [${usedOptionalEvents.join(', ')}]`);
  
  // Validate if this event is valid for the user's current stage
  const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
  
  if (!validation.valid) {
    console.log(`   ⚠️ Event ${eventNumber} is not valid for user ${uid}: ${validation.reason}`);
    return;
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
  const { points, bonusPoints } = pointsResult;
  
  // Check if earned punching medal (beat prediction by 10+ places)
  let earnedPunchingMedal = false;
  if (predictedPosition) {
    const placesBeaten = predictedPosition - position;
    earnedPunchingMedal = placesBeaten >= 10;
  }
  
  // Check if earned Giant Killer medal (beat highest-rated rider)
  const earnedGiantKillerMedal = checkGiantKiller(results, uid);
  
  // Prepare event results
  const eventResults = {
    position: position,
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
    arrBand: userResult.ARRBand || '',
    eventRating: parseInt(userResult.EventRating) || null,
    predictedPosition: predictedPosition,
    points: points,
    bonusPoints: bonusPoints,
    earnedPunchingMedal: earnedPunchingMedal,
    earnedGiantKillerMedal: earnedGiantKillerMedal,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Build list of completed events (previous + current)
  const previouslyCompletedEvents = userData.completedStages || [];
  const allCompletedEvents = previouslyCompletedEvents.includes(eventNumber) 
    ? previouslyCompletedEvents 
    : [...previouslyCompletedEvents, eventNumber];
  
  // Determine stage progression and handle special cases
  let newTourProgress = { ...tourProgress };
  let newUsedOptionalEvents = [...usedOptionalEvents];
  let finalPoints = points;
  let consecutiveDaysFailed = false;
  
  // Handle optional events (stages 3, 6, 8)
  if (OPTIONAL_EVENTS.includes(eventNumber)) {
    newUsedOptionalEvents.push(eventNumber);
    console.log(`   Added event ${eventNumber} to used optional events: [${newUsedOptionalEvents.join(', ')}]`);
  }
  
  // Handle tour events (stage 9)
  if (validation.isTour) {
    const now = new Date();
    
    if (eventNumber === 13) {
      // First tour event - just record the date
      newTourProgress.event13Completed = true;
      newTourProgress.event13Date = now.toISOString();
      console.log(`   Tour Stage 1 completed on ${now.toISOString()}`);
    } else if (eventNumber === 14) {
      // Second tour event - check consecutive day from event 13
      if (tourProgress.event13Date) {
        const isConsecutive = areConsecutiveDays(tourProgress.event13Date, now);
        if (!isConsecutive) {
          console.log(`   Warning: Tour Stage 2 NOT on consecutive day from Stage 1. Points: 0`);
          finalPoints = 0;
          consecutiveDaysFailed = true;
          eventResults.points = 0;
          eventResults.consecutiveDaysFailed = true;
        } else {
          console.log(`   Tour Stage 2 is on consecutive day from Stage 1`);
        }
      }
      newTourProgress.event14Completed = true;
      newTourProgress.event14Date = now.toISOString();
      newTourProgress.event14ConsecutiveFailed = consecutiveDaysFailed;
    } else if (eventNumber === 15) {
      // Third tour event - check consecutive day from event 14
      if (tourProgress.event14Date) {
        const isConsecutive = areConsecutiveDays(tourProgress.event14Date, now);
        if (!isConsecutive) {
          console.log(`   Warning: Tour Stage 3 NOT on consecutive day from Stage 2. Points: 0`);
          finalPoints = 0;
          consecutiveDaysFailed = true;
          eventResults.points = 0;
          eventResults.consecutiveDaysFailed = true;
        } else {
          console.log(`   Tour Stage 3 is on consecutive day from Stage 2`);
        }
      }
      newTourProgress.event15Completed = true;
      newTourProgress.event15Date = now.toISOString();
      newTourProgress.event15ConsecutiveFailed = consecutiveDaysFailed;
    }
  }
  
  // Calculate the user's new authoritative totals (AFTER finalPoints is determined)
  const newTotalPoints = (userData.totalPoints || 0) + finalPoints;
  const newTotalEvents = (userData.totalEvents || 0) + 1;
  
  // Build season standings with all racers from CSV, using authoritative user totals
  const currentUserTotals = {
    totalPoints: newTotalPoints,
    totalEvents: newTotalEvents
  };
  const seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid, allCompletedEvents, currentUserTotals);
  
  // Calculate next stage
  const nextStage = calculateNextStage(currentStage, newTourProgress);
  
  // Update user document
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    currentStage: nextStage,
    totalPoints: newTotalPoints,
    totalEvents: newTotalEvents,
    [`season${season}Standings`]: seasonStandings,
    team: userResult.Team || '' // Update team from latest race result
  };
  
  // Update optional events tracking if changed
  if (newUsedOptionalEvents.length !== usedOptionalEvents.length) {
    updates.usedOptionalEvents = newUsedOptionalEvents;
  }
  
  // Update tour progress if on stage 9
  if (validation.isTour) {
    updates.tourProgress = newTourProgress;
  }
  
  // Add to completedStages if not already there
  const completedStages = userData.completedStages || [];
  if (!completedStages.includes(eventNumber)) {
    updates.completedStages = admin.firestore.FieldValue.arrayUnion(eventNumber);
  }
  
  await userRef.update(updates);
  
  const bonusLog = bonusPoints > 0 ? ` (including +${bonusPoints} bonus)` : '';
  const predictionLog = predictedPosition ? ` | Predicted: ${predictedPosition}` : '';
  const punchingLog = earnedPunchingMedal ? ' PUNCHING MEDAL!' : '';
  const giantKillerLog = earnedGiantKillerMedal ? ' GIANT KILLER!' : '';
  const consecutiveLog = consecutiveDaysFailed ? ' CONSECUTIVE DAYS FAILED' : '';
  const stageLog = ` | Stage: ${currentStage} -> ${nextStage}`;
  console.log(`Processed event ${eventNumber} for user ${uid}: Position ${position}${predictionLog}, Points ${finalPoints}${bonusLog}${punchingLog}${giantKillerLog}${consecutiveLog}${stageLog}`);
  
  // Update results summary collection
  await updateResultsSummary(season, eventNumber, results);
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
  
  // Add randomness: Â±10 positions
  const randomOffset = Math.floor(getSeededRandom(botName, eventNumber) * 20) - 10;
  let simulatedPosition = expectedPosition + randomOffset;
  
  // Clamp to valid range
  simulatedPosition = Math.max(1, Math.min(fieldSize, simulatedPosition));
  
  return simulatedPosition;
}

/**
 * Fetch results for specific events only (not a range)
 */
async function getEventResults(season, eventNumbers) {
  const allEventResults = {};
  
  for (const eventNum of eventNumbers) {
    const resultDocId = `season${season}_event${eventNum}`;
    try {
      const resultDoc = await db.collection('results').doc(resultDocId).get();
      if (resultDoc.exists()) {
        const data = resultDoc.data();
        allEventResults[eventNum] = data.results || [];
      }
    } catch (error) {
      console.log(`   Warning: Could not fetch ${resultDocId}:`, error.message);
    }
  }
  
  return allEventResults;
}

/**
 * Build season standings including all racers from CSV
 * Now includes simulated results for bots to keep standings competitive
 * @param {Array} results - Current event results
 * @param {Object} userData - User's data from Firestore
 * @param {number} eventNumber - Current event number being processed
 * @param {string} currentUid - Current user's UID
 * @param {Array} completedEvents - Array of event numbers the user has completed (including current)
 * @param {Object} currentUserTotals - The current user's authoritative totals { totalPoints, totalEvents }
 */
async function buildSeasonStandings(results, userData, eventNumber, currentUid, completedEvents = [], currentUserTotals = {}) {
  const season = 1;
  const existingStandings = userData[`season${season}Standings`] || [];
  
  // Ensure current event is in completedEvents
  if (!completedEvents.includes(eventNumber)) {
    completedEvents = [...completedEvents, eventNumber];
  }
  
  const numCompletedEvents = completedEvents.length;
  console.log(`   Building standings for ${numCompletedEvents} completed events: [${completedEvents.join(', ')}]`);
  
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
    
    // For the current user, use authoritative data from Firebase
    const isCurrentUser = uid === currentUid;
    
    if (isCurrentUser && currentUserTotals.totalPoints !== undefined) {
      // Use authoritative totals for current user
      standingsMap.set(key, {
        name: name,
        uid: uid,
        arr: arr,
        team: team,
        events: currentUserTotals.totalEvents,
        points: currentUserTotals.totalPoints,
        isBot: false,
        isCurrentUser: true
      });
    } else if (standingsMap.has(key)) {
      // Update existing racer (for bots and other humans)
      const racer = standingsMap.get(key);
      racer.points = (racer.points || 0) + points;
      racer.events = (racer.events || 0) + 1;
      racer.arr = arr; // Update to most recent ARR
      racer.team = team || racer.team; // Keep team if exists
    } else {
      // Add new racer
      standingsMap.set(key, {
        name: name,
        uid: isBotRacer ? null : uid,
        arr: arr,
        team: team,
        events: 1,
        points: points,
        isBot: isBotRacer,
        isCurrentUser: isCurrentUser
      });
    }
  });
  
  // Now backfill bots with simulated results
  // Get results for completed events only (not a range)
  console.log('   Backfilling bot results...');
  const allEventResults = await getEventResults(season, completedEvents);
  
  // IMPORTANT: Also include current event's results (not yet in Firestore)
  // The 'results' parameter contains the current event being processed
  allEventResults[eventNumber] = results;
  
  // Build a map of all unique bots and track which events they participated in
  const allBots = new Map(); // botName -> { arr, actualEvents: Set<eventNum> }
  
  for (const [eventNum, eventResults] of Object.entries(allEventResults)) {
    eventResults.forEach(result => {
      const isBotRacer = isBot(result.UID || result.uid, result.Gender);
      if (isBotRacer && result.Position !== 'DNF' && result.position !== 'DNF') {
        const botName = result.Name || result.name;
        const arr = parseInt(result.ARR || result.arr) || 900;
        
        if (!allBots.has(botName)) {
          allBots.set(botName, {
            name: botName,
            arr: arr,
            actualEvents: new Set()
          });
        }
        
        // Track which event this bot actually participated in
        allBots.get(botName).actualEvents.add(parseInt(eventNum));
        
        // Update ARR to most recent
        allBots.get(botName).arr = arr;
      }
    });
  }
  
  console.log(`   Found ${allBots.size} unique bots across all events`);
  
  // Stage to event mapping for mandatory stages
  const STAGE_TO_EVENT = {
    1: 1,   // Coast and Roast Crit
    2: 2,   // Island Classic
    // 3: choice from 6-12
    4: 3,   // Forest Velodrome Elimination
    5: 4,   // Coastal Loop Time Challenge
    // 6: choice from 6-12
    7: 5,   // North Lake Points Race
    // 8: choice from 6-12
    9: 13   // Local Tour (simplified - just event 13 for now)
  };
  
  const CHOICE_STAGES = [3, 6, 8];
  const OPTIONAL_EVENT_IDS = [6, 7, 8, 9, 10, 11, 12];
  
  // Determine number of stages completed based on currentStage
  // completedEvents length = number of stages completed
  const numStagesCompleted = numCompletedEvents;
  
  // For each bot, simulate results for all completed stages
  for (const [botName, botInfo] of allBots.entries()) {
    if (!standingsMap.has(botName)) {
      // Bot not in standings yet, add them
      standingsMap.set(botName, {
        name: botName,
        uid: null,
        arr: botInfo.arr,
        team: '',
        events: 0,
        points: 0,
        isBot: true,
        isCurrentUser: false
      });
    }
    
    const botStanding = standingsMap.get(botName);
    
    // Track which optional events this bot has "used"
    const botUsedOptionals = new Set();
    
    // Calculate simulated points for each stage
    let simulatedPoints = 0;
    let simulatedEvents = 0;
    
    for (let stage = 1; stage <= numStagesCompleted; stage++) {
      let eventNumForStage;
      
      if (CHOICE_STAGES.includes(stage)) {
        // For choice stages, pick a random event from available optionals
        // Use seeded random so same bot picks same event consistently
        const availableOptionals = OPTIONAL_EVENT_IDS.filter(id => !botUsedOptionals.has(id));
        if (availableOptionals.length > 0) {
          const randomIndex = Math.floor(getSeededRandom(botName, stage) * availableOptionals.length);
          eventNumForStage = availableOptionals[randomIndex];
          botUsedOptionals.add(eventNumForStage);
        } else {
          // Fallback - shouldn't happen with only 3 choice stages and 7 options
          eventNumForStage = 6;
        }
      } else {
        // Fixed stage - use the mapped event
        eventNumForStage = STAGE_TO_EVENT[stage];
      }
      
      // Check if bot actually participated in this event
      if (eventNumForStage && !botInfo.actualEvents.has(eventNumForStage)) {
        // Bot didn't participate in this event, simulate it
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNumForStage);
        const points = calculatePoints(simulatedPosition, eventNumForStage).points;
        simulatedPoints += points;
        simulatedEvents++;
      }
    }
    
    // Update bot standing with simulated results
    botStanding.points += simulatedPoints;
    botStanding.events = numCompletedEvents; // Bots show same number of events as human
    botStanding.simulatedEvents = simulatedEvents; // Track how many were simulated
  }
  
  // IMPORTANT: Ensure ALL bots in standings (not just those in allBots) have correct events count
  // This handles any edge cases where bots might be in standings but not in allBots
  let botsUpdatedCount = 0;
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      // Make sure all bots show the correct number of completed events
      racer.events = numCompletedEvents;
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
      
      if (!botProfileDoc.exists()) {
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
      
      console.log(`   âœ“ Updated ${uid} ARR: ${arr}`);
      botsUpdated++;
      
    } catch (error) {
      console.error(`   âœ— Error updating bot ${uid}:`, error.message);
    }
  }
  
  if (botsFound > 0) {
    console.log(`   Bot ARR updates: ${botsUpdated} updated, ${botsNotFound} profiles not found`);
  }
}

/**
 * Update results summary collection (for quick access to full results)
 */
async function updateResultsSummary(season, event, results) {
  const summaryRef = db.collection('results').doc(`season${season}_event${event}`);
  
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
        eventPoints: parseInt(r.Points) || null,
        isBot: isBot(r.UID, r.Gender)
      };
    });
  
  await summaryRef.set({
    season: season,
    event: event,
    totalParticipants: validResults.length,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    results: validResults
  });
  
  console.log(`âœ… Updated results summary for season ${season} event ${event}`);
  
  // Update bot ARRs from these results
  await updateBotARRs(season, event, results);
}

/**
 * Main processing function
 */
async function processResults(csvFiles) {
  console.log(`Processing ${csvFiles.length} CSV file(s)...`);
  
  for (const filePath of csvFiles) {
    try {
      console.log(`\nðŸ“„ Processing: ${filePath}`);
      
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
      
    } catch (error) {
      console.error(`âŒ Error processing ${filePath}:`, error);
    }
  }
  
  console.log('\nâœ… All results processed!');
}

// Main execution
(async () => {
  try {
    const filesArg = process.argv[2];
    const csvFiles = JSON.parse(filesArg);
    
    if (!csvFiles || csvFiles.length === 0) {
      console.log('No CSV files to process');
      process.exit(0);
    }
    
    await processResults(csvFiles);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

module.exports = { processResults, calculatePoints };
