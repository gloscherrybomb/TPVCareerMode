#!/usr/bin/env node

/**
 * reprocess-results.js - Reset and reprocess all race results
 * 
 * This script:
 * 1. Clears all event-related data from user documents
 * 2. Clears the results collection (optional)
 * 3. Reprocesses all CSV files in event order
 * 
 * Usage:
 *   node reprocess-results.js                    # Reprocess all results
 *   node reprocess-results.js --dry-run          # Preview changes
 *   node reprocess-results.js --reset-only       # Only reset, don't reprocess
 *   node reprocess-results.js --user UID         # Reprocess specific user only
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  season: 1,
  user: null,
  dryRun: false,
  resetOnly: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--season' && args[i + 1]) {
    options.season = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--user' && args[i + 1]) {
    options.user = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--reset-only') {
    options.resetOnly = true;
  }
}

// ============================================================================
// STAGE PROGRESSION CONFIGURATION (must match process-results.js)
// ============================================================================

const EVENT_MAX_POINTS = {
  1: 65, 2: 95, 3: 50, 4: 50, 5: 80, 6: 50, 7: 70, 8: 185, 9: 85,
  10: 70, 11: 60, 12: 145, 13: 120, 14: 95, 15: 135
};

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

// ============================================================================
// HELPER FUNCTIONS (must match process-results.js)
// ============================================================================

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

function getNextTourEvent(tourProgress = {}) {
  if (!tourProgress.event13Completed) return 13;
  if (!tourProgress.event14Completed) return 14;
  if (!tourProgress.event15Completed) return 15;
  return null;
}

function areConsecutiveDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const d1Start = new Date(Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate()));
  const d2Start = new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate()));
  
  const diffTime = d2Start.getTime() - d1Start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}

function calculateNextStage(currentStage, tourProgress = {}) {
  if (currentStage < 9) {
    return currentStage + 1;
  }
  
  if (currentStage === 9) {
    if (tourProgress.event13Completed && tourProgress.event14Completed && tourProgress.event15Completed) {
      return 10;
    }
    return 9;
  }
  
  return currentStage + 1;
}

function calculatePoints(position, eventNumber, predictedPosition) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber] || 100;
  
  if (position > 40) {
    return { points: 0, bonusPoints: 0 };
  }
  
  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  
  let podiumBonus = 0;
  if (position === 1) podiumBonus = 5;
  else if (position === 2) podiumBonus = 3;
  else if (position === 3) podiumBonus = 2;
  
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

function calculatePredictedPosition(results, userUid) {
  const finishers = results.filter(r => 
    r.Position !== 'DNF' && 
    r.EventRating && 
    !isNaN(parseInt(r.EventRating))
  );
  
  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  
  const predictedIndex = finishers.findIndex(r => r.UID === userUid);
  return predictedIndex === -1 ? null : predictedIndex + 1;
}

function checkGiantKiller(results, userUid) {
  const userResult = results.find(r => r.UID === userUid);
  if (!userResult || userResult.Position === 'DNF' || !userResult.EventRating) {
    return false;
  }
  
  const userPosition = parseInt(userResult.Position);
  if (isNaN(userPosition)) return false;
  
  const finishers = results.filter(r => 
    r.Position !== 'DNF' && 
    r.EventRating && 
    !isNaN(parseInt(r.EventRating))
  );
  
  if (finishers.length === 0) return false;
  
  finishers.sort((a, b) => parseInt(b.EventRating) - parseInt(a.EventRating));
  
  const giant = finishers[0];
  const giantPosition = parseInt(giant.Position);
  
  if (giant.UID === userUid) return false;
  
  return userPosition < giantPosition;
}

function isBot(uid, gender) {
  return gender === 'Bot' || (uid && uid.startsWith('Bot'));
}

function parseCSV(csvContent) {
  return new Promise((resolve, reject) => {
    let processedContent = csvContent;
    const lines = csvContent.split('\n');
    
    if (lines[0].includes('OVERALL INDIVIDUAL RESULTS')) {
      processedContent = lines.slice(2).join('\n');
    }
    
    Papa.parse(processedContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    });
  });
}

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

// ============================================================================
// RESET FUNCTIONS
// ============================================================================

async function resetUserData(userRef, userData, season) {
  const updates = {};
  
  // Remove all event results (events 1-15)
  for (let i = 1; i <= 15; i++) {
    const key = `event${i}Results`;
    if (userData[key]) {
      updates[key] = admin.firestore.FieldValue.delete();
    }
  }
  
  // Reset progress fields
  updates.currentStage = 1;
  updates.totalPoints = 0;
  updates.totalEvents = 0;
  updates.completedStages = [];
  updates.usedOptionalEvents = [];
  updates.tourProgress = {};
  updates[`season${season}Standings`] = admin.firestore.FieldValue.delete();
  
  if (!options.dryRun) {
    await userRef.update(updates);
  }
  
  return Object.keys(updates).length;
}

async function resetAllUsers(season) {
  console.log(`\n🗑️  Resetting all users for season ${season}...\n`);
  
  const usersSnapshot = await db.collection('users').get();
  let usersReset = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const fieldsCleared = await resetUserData(userDoc.ref, userData, season);
    console.log(`   ✅ ${userData.name || userDoc.id}: Reset ${fieldsCleared} fields`);
    usersReset++;
  }
  
  return usersReset;
}

async function clearResultsCollection(season) {
  console.log(`\n🗑️  Clearing results collection for season ${season}...\n`);
  
  let cleared = 0;
  
  // Clear events 1-15
  for (let eventNum = 1; eventNum <= 15; eventNum++) {
    const resultDocId = `season${season}_event${eventNum}`;
    try {
      const resultDoc = await db.collection('results').doc(resultDocId).get();
      
      if (resultDoc.exists) {
        if (!options.dryRun) {
          await resultDoc.ref.delete();
        }
        console.log(`   ✅ Deleted ${resultDocId}`);
        cleared++;
      }
    } catch (error) {
      console.error(`   ❌ Error clearing ${resultDocId}:`, error.message);
    }
  }
  
  return cleared;
}

// ============================================================================
// REPROCESSING FUNCTIONS
// ============================================================================

async function findAllCSVFiles(season) {
  const baseDir = `race_results/season_${season}`;
  const csvFiles = [];
  
  if (!fs.existsSync(baseDir)) {
    console.log(`   ⚠️  Directory ${baseDir} not found`);
    return csvFiles;
  }
  
  // Find all event directories
  const eventDirs = fs.readdirSync(baseDir)
    .filter(d => d.startsWith('event_'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('event_', ''));
      const numB = parseInt(b.replace('event_', ''));
      return numA - numB;
    });
  
  for (const eventDir of eventDirs) {
    const eventPath = path.join(baseDir, eventDir);
    const eventNum = parseInt(eventDir.replace('event_', ''));
    
    // Find CSV files in this event directory
    const files = fs.readdirSync(eventPath)
      .filter(f => f.endsWith('.csv'));
    
    for (const file of files) {
      csvFiles.push({
        path: path.join(eventPath, file),
        season: season,
        event: eventNum
      });
    }
  }
  
  return csvFiles;
}

async function buildSeasonStandings(results, eventNumber, completedEvents, currentUserTotals, currentUid) {
  const numCompletedEvents = completedEvents.length;
  const standingsMap = new Map();
  
  // Process all racers from current event
  results.forEach(result => {
    const uid = result.UID;
    const name = result.Name;
    const position = parseInt(result.Position);
    
    if (result.Position === 'DNF' || isNaN(position)) return;
    
    const pointsResult = calculatePoints(position, eventNumber);
    const points = pointsResult.points;
    const arr = parseInt(result.ARR) || 0;
    const team = result.Team || '';
    const isBotRacer = isBot(uid, result.Gender);
    const key = isBotRacer ? name : uid;
    const isCurrentUser = uid === currentUid;
    
    // For current user, use authoritative totals
    if (isCurrentUser && currentUserTotals.totalPoints !== undefined) {
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
      const racer = standingsMap.get(key);
      racer.points = (racer.points || 0) + points;
      racer.events = (racer.events || 0) + 1;
      racer.arr = arr;
      racer.team = team || racer.team;
    } else {
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
  
  // Build bot tracking from all completed events
  const allBots = new Map();
  
  for (const evtNum of completedEvents) {
    const resultDocId = `season1_event${evtNum}`;
    try {
      const resultDoc = await db.collection('results').doc(resultDocId).get();
      if (resultDoc.exists) {
        const eventResults = resultDoc.data().results || [];
        eventResults.forEach(result => {
          const isBotRacer = isBot(result.uid, result.isBot ? 'Bot' : '');
          if (isBotRacer && result.position !== 'DNF') {
            const botName = result.name;
            const arr = result.arr || 900;
            
            if (!allBots.has(botName)) {
              allBots.set(botName, { name: botName, arr: arr, actualEvents: new Set() });
            }
            allBots.get(botName).actualEvents.add(evtNum);
            allBots.get(botName).arr = arr;
          }
        });
      }
    } catch (error) {
      // Ignore errors - results may not exist yet
    }
  }
  
  // Also add bots from current results
  results.forEach(result => {
    const isBotRacer = isBot(result.UID, result.Gender);
    if (isBotRacer && result.Position !== 'DNF') {
      const botName = result.Name;
      const arr = parseInt(result.ARR) || 900;
      
      if (!allBots.has(botName)) {
        allBots.set(botName, { name: botName, arr: arr, actualEvents: new Set() });
      }
      allBots.get(botName).actualEvents.add(eventNumber);
      allBots.get(botName).arr = arr;
    }
  });
  
  // Simulate bot results for missing events
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
    9: 13   // Local Tour (simplified)
  };
  
  const CHOICE_STAGES = [3, 6, 8];
  const OPTIONAL_EVENT_IDS = [6, 7, 8, 9, 10, 11, 12];
  const numStagesCompleted = numCompletedEvents;
  
  for (const [botName, botInfo] of allBots.entries()) {
    if (!standingsMap.has(botName)) {
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
    const botUsedOptionals = new Set();
    let simulatedPoints = 0;
    
    for (let stage = 1; stage <= numStagesCompleted; stage++) {
      let eventNumForStage;
      
      if (CHOICE_STAGES.includes(stage)) {
        // For choice stages, pick a random event from available optionals
        const availableOptionals = OPTIONAL_EVENT_IDS.filter(id => !botUsedOptionals.has(id));
        if (availableOptionals.length > 0) {
          const randomIndex = Math.floor(getSeededRandom(botName, stage) * availableOptionals.length);
          eventNumForStage = availableOptionals[randomIndex];
          botUsedOptionals.add(eventNumForStage);
        } else {
          eventNumForStage = 6;
        }
      } else {
        eventNumForStage = STAGE_TO_EVENT[stage];
      }
      
      if (eventNumForStage && !botInfo.actualEvents.has(eventNumForStage)) {
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNumForStage);
        const points = calculatePoints(simulatedPosition, eventNumForStage).points;
        simulatedPoints += points;
      }
    }
    
    botStanding.points += simulatedPoints;
    botStanding.events = numCompletedEvents;
  }
  
  // Ensure all bots have correct event count
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      racer.events = numCompletedEvents;
    }
  }
  
  // Sort by points
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => b.points - a.points);
  
  return standings;
}

async function processResultsForUser(userDoc, csvFiles, season) {
  const userData = userDoc.data();
  const userUid = userData.uid;
  const userName = userData.name || userUid;
  
  console.log(`\n   📊 Processing results for ${userName}...`);
  
  // Track user's progress as we process
  let currentStage = 1;
  let totalPoints = 0;
  let totalEvents = 0;
  let completedStages = [];
  let usedOptionalEvents = [];
  let tourProgress = {};
  let beatPredictionStreak = 0; // For Hot Streak award
  
  const updates = {};
  
  // Process each CSV in order
  for (const csvFile of csvFiles) {
    const eventNumber = csvFile.event;
    
    // Read and parse CSV
    let csvContent;
    try {
      csvContent = fs.readFileSync(csvFile.path, 'utf8');
    } catch (error) {
      console.log(`      ⚠️  Could not read ${csvFile.path}`);
      continue;
    }
    
    const results = await parseCSV(csvContent);
    
    // Find user in results
    const userResult = results.find(r => r.UID === userUid);
    if (!userResult) {
      continue; // User not in this event
    }
    
    // Check if this event is valid for current stage
    const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
    
    if (!validation.valid) {
      console.log(`      ⚠️  Event ${eventNumber} skipped: ${validation.reason}`);
      continue;
    }
    
    const position = parseInt(userResult.Position);
    if (isNaN(position) || userResult.Position === 'DNF') {
      console.log(`      ⚠️  Event ${eventNumber}: DNF`);
      continue;
    }
    
    // Calculate points
    const predictedPosition = calculatePredictedPosition(results, userUid);
    const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
    let { points, bonusPoints } = pointsResult;
    
    // Check medals
    let earnedPunchingMedal = false;
    if (predictedPosition) {
      const placesBeaten = predictedPosition - position;
      earnedPunchingMedal = placesBeaten >= 10;
    }
    const earnedGiantKillerMedal = checkGiantKiller(results, userUid);
    
    // Bullseye: finish exactly at predicted position
    const earnedBullseyeMedal = predictedPosition && position === predictedPosition;
    
    // Hot Streak: beat prediction 3 events in a row
    // Track if current event beats prediction
    const beatPrediction = predictedPosition && position < predictedPosition;
    if (beatPrediction) {
      beatPredictionStreak++;
    } else {
      beatPredictionStreak = 0;
    }
    const earnedHotStreakMedal = beatPredictionStreak >= 3;
    
    // Handle optional events
    if (OPTIONAL_EVENTS.includes(eventNumber)) {
      usedOptionalEvents.push(eventNumber);
    }
    
    // Handle tour events
    let consecutiveDaysFailed = false;
    if (validation.isTour) {
      // For reprocessing, we use the stored processedAt timestamp from results collection
      // or current time if not available
      const resultDoc = await db.collection('results').doc(`season${season}_event${eventNumber}`).get();
      const eventProcessedAt = resultDoc.exists ? resultDoc.data().processedAt?.toDate() : new Date();
      
      if (eventNumber === 13) {
        tourProgress.event13Completed = true;
        tourProgress.event13Date = eventProcessedAt.toISOString();
      } else if (eventNumber === 14) {
        if (tourProgress.event13Date) {
          const isConsecutive = areConsecutiveDays(tourProgress.event13Date, eventProcessedAt);
          if (!isConsecutive) {
            points = 0;
            consecutiveDaysFailed = true;
          }
        }
        tourProgress.event14Completed = true;
        tourProgress.event14Date = eventProcessedAt.toISOString();
        tourProgress.event14ConsecutiveFailed = consecutiveDaysFailed;
      } else if (eventNumber === 15) {
        if (tourProgress.event14Date) {
          const isConsecutive = areConsecutiveDays(tourProgress.event14Date, eventProcessedAt);
          if (!isConsecutive) {
            points = 0;
            consecutiveDaysFailed = true;
          }
        }
        tourProgress.event15Completed = true;
        tourProgress.event15Date = eventProcessedAt.toISOString();
        tourProgress.event15ConsecutiveFailed = consecutiveDaysFailed;
      }
    }
    
    // Update totals
    totalPoints += points;
    totalEvents += 1;
    completedStages.push(eventNumber);
    
    // Store event results
    updates[`event${eventNumber}Results`] = {
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
      earnedBullseyeMedal: earnedBullseyeMedal,
      earnedHotStreakMedal: earnedHotStreakMedal,
      consecutiveDaysFailed: consecutiveDaysFailed,
      distance: parseFloat(userResult.Distance) || 0,
      deltaTime: parseFloat(userResult.DeltaTime) || 0,
      eventPoints: parseInt(userResult.Points) || null,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate next stage
    currentStage = calculateNextStage(currentStage, tourProgress);
    
    console.log(`      ✅ Event ${eventNumber}: P${position}, +${points}pts (Stage → ${currentStage})`);
  }
  
  // Build final standings
  if (completedStages.length > 0) {
    const lastEventNum = completedStages[completedStages.length - 1];
    const lastCsvFile = csvFiles.find(f => f.event === lastEventNum);
    
    if (lastCsvFile) {
      const csvContent = fs.readFileSync(lastCsvFile.path, 'utf8');
      const results = await parseCSV(csvContent);
      
      const seasonStandings = await buildSeasonStandings(
        results, 
        lastEventNum, 
        completedStages,
        { totalPoints, totalEvents },
        userUid
      );
      
      updates[`season${season}Standings`] = seasonStandings;
    }
  }
  
  // Set final user state
  updates.currentStage = currentStage;
  updates.totalPoints = totalPoints;
  updates.totalEvents = totalEvents;
  updates.completedStages = completedStages;
  updates.usedOptionalEvents = usedOptionalEvents;
  updates.tourProgress = tourProgress;
  
  // Apply updates
  if (!options.dryRun) {
    await userDoc.ref.update(updates);
  }
  
  console.log(`      📈 Final: ${totalEvents} events, ${totalPoints} points, stage ${currentStage}`);
  
  return { totalEvents, totalPoints };
}

async function updateResultsSummary(season, eventNumber, results) {
  const summaryRef = db.collection('results').doc(`season${season}_event${eventNumber}`);
  
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
  
  // Check Giant Killer for a specific result
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
  
  const validResults = results
    .filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)))
    .map(r => {
      const position = parseInt(r.Position);
      const predictedPosition = calculatePredictedPositionForResult(r.UID);
      const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
      
      // Check for medals
      let earnedPunchingMedal = false;
      if (predictedPosition) {
        const placesBeaten = predictedPosition - position;
        earnedPunchingMedal = placesBeaten >= 10;
      }
      const earnedGiantKillerMedal = checkGiantKillerForResult(r.UID, position);
      
      // Bullseye: finish exactly at predicted position
      const earnedBullseyeMedal = predictedPosition && position === predictedPosition;
      
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
        points: pointsResult.points,
        bonusPoints: pointsResult.bonusPoints,
        earnedPunchingMedal: earnedPunchingMedal,
        earnedGiantKillerMedal: earnedGiantKillerMedal,
        earnedBullseyeMedal: earnedBullseyeMedal,
        isBot: isBot(r.UID, r.Gender)
      };
    });
  
  if (!options.dryRun) {
    await summaryRef.set({
      season: season,
      event: eventNumber,
      totalParticipants: validResults.length,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      results: validResults
    });
  }
  
  console.log(`   ✅ Updated results summary for event ${eventNumber}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🔄 TPV Career Mode - Results Reprocessor\n');
  console.log('=' .repeat(60));
  
  if (options.dryRun) {
    console.log('📝 DRY RUN MODE - No changes will be made\n');
  }
  
  console.log('Options:', options);
  console.log('');
  
  const season = options.season;
  
  // Step 1: Reset all user data
  console.log('STEP 1: Resetting user data...');
  const usersReset = await resetAllUsers(season);
  console.log(`   Reset ${usersReset} users\n`);
  
  // Step 2: Clear results collection
  console.log('STEP 2: Clearing results collection...');
  const resultsCleared = await clearResultsCollection(season);
  console.log(`   Cleared ${resultsCleared} result documents\n`);
  
  if (options.resetOnly) {
    console.log('✅ Reset complete (--reset-only flag set, skipping reprocessing)\n');
    return;
  }
  
  // Step 3: Find all CSV files
  console.log('STEP 3: Finding CSV files...');
  const csvFiles = await findAllCSVFiles(season);
  console.log(`   Found ${csvFiles.length} CSV files\n`);
  
  if (csvFiles.length === 0) {
    console.log('⚠️  No CSV files found. Nothing to reprocess.\n');
    return;
  }
  
  // List files
  for (const file of csvFiles) {
    console.log(`   - Event ${file.event}: ${file.path}`);
  }
  console.log('');
  
  // Step 4: Update results summaries first
  console.log('STEP 4: Updating results summaries...');
  for (const csvFile of csvFiles) {
    try {
      const csvContent = fs.readFileSync(csvFile.path, 'utf8');
      const results = await parseCSV(csvContent);
      await updateResultsSummary(season, csvFile.event, results);
    } catch (error) {
      console.log(`   ❌ Error processing event ${csvFile.event}:`, error.message);
    }
  }
  console.log('');
  
  // Step 5: Process each user
  console.log('STEP 5: Processing user results...');
  
  let query = db.collection('users');
  if (options.user) {
    query = query.where('uid', '==', options.user);
  }
  
  const usersSnapshot = await query.get();
  let usersProcessed = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    await processResultsForUser(userDoc, csvFiles, season);
    usersProcessed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Reprocessing Complete\n');
  console.log(`   Users reset: ${usersReset}`);
  console.log(`   Results cleared: ${resultsCleared}`);
  console.log(`   CSV files processed: ${csvFiles.length}`);
  console.log(`   Users reprocessed: ${usersProcessed}`);
  
  if (options.dryRun) {
    console.log('\n   ℹ️  This was a dry run. Run without --dry-run to apply changes.');
  }
  
  console.log('=' .repeat(60) + '\n');
}

// Run
main().then(() => {
  console.log('✅ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
