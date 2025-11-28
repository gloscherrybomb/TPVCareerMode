// process-results.js - Process race results CSVs and update Firestore

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const admin = require('firebase-admin');
const awardsCalc = require('./awards-calculation');

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
  
  // Check if this is the user's next event
  const currentStage = userData.currentStage || 1;
  if (currentStage !== eventNumber) {
    console.log(`Event ${eventNumber} is not next for user ${uid} (currently on stage ${currentStage}), skipping`);
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
  const earnedPhotoFinish = awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime, times.secondPlaceTime);
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
    earnedDomination: earnedDomination,
    earnedCloseCall: earnedCloseCall,
    earnedPhotoFinish: earnedPhotoFinish,
    earnedDarkHorse: earnedDarkHorse,
    earnedZeroToHero: earnedZeroToHero,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Build season standings with all racers from CSV
  const seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid);
  
  // Update user document
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    currentStage: eventNumber + 1, // Unlock next event
    totalPoints: (userData.totalPoints || 0) + points,
    totalEvents: (userData.totalEvents || 0) + 1,
    [`season${season}Standings`]: seasonStandings,
    team: userResult.Team || '' // Update team from latest race result
  };
  
  // Add to completedStages if not already there
  const completedStages = userData.completedStages || [];
  if (!completedStages.includes(eventNumber)) {
    updates.completedStages = admin.firestore.FieldValue.arrayUnion(eventNumber);
  }
  
  await userRef.update(updates);
  
  const bonusLog = bonusPoints > 0 ? ` (including +${bonusPoints} bonus)` : '';
  const predictionLog = predictedPosition ? ` | Predicted: ${predictedPosition}` : '';
  const punchingLog = earnedPunchingMedal ? ' 🥊 PUNCHING MEDAL!' : '';
  const giantKillerLog = earnedGiantKillerMedal ? ' âš”ï¸ GIANT KILLER!' : '';
  console.log(`âœ… Processed event ${eventNumber} for user ${uid}: Position ${position}${predictionLog}, Points ${points}${bonusLog}${punchingLog}${giantKillerLog}`);
  
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
 * Fetch all results from events 1 through currentEvent
 */
async function getAllPreviousEventResults(season, currentEvent) {
  const allEventResults = {};
  
  for (let eventNum = 1; eventNum <= currentEvent; eventNum++) {
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
 */
async function buildSeasonStandings(results, userData, eventNumber, currentUid) {
  const season = 1;
  const existingStandings = userData[`season${season}Standings`] || [];
  
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
    
    if (standingsMap.has(key)) {
      // Update existing racer
      const racer = standingsMap.get(key);
      racer.points = (racer.points || 0) + points;
      racer.events = (racer.events || 0) + 1;
      racer.arr = arr; // Update to most recent ARR
      racer.team = team || racer.team; // Keep team if exists
    } else {
      // Add new racer
      // For bots, create a name-based identifier that can be used for profile lookup
      const botUid = isBotRacer ? `Bot_${name.replace(/[^a-zA-Z0-9]/g, '_')}` : uid;
      standingsMap.set(key, {
        name: name,
        uid: botUid,
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
  // Get all results from events 1 through current
  console.log('   Backfilling bot results...');
  const allEventResults = await getAllPreviousEventResults(season, eventNumber);
  
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
  
  // For each bot, simulate missing events and update standings
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
    
    // Calculate simulated points for missing events
    let simulatedPoints = 0;
    let simulatedEvents = 0;
    
    for (let eventNum = 1; eventNum <= eventNumber; eventNum++) {
      if (!botInfo.actualEvents.has(eventNum)) {
        // Bot didn't participate in this event, simulate it
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNum);
        const points = calculatePoints(simulatedPosition, eventNum).points; // Base points only, no bonus
        simulatedPoints += points;
        simulatedEvents++;
      }
    }
    
    // Update bot standing with simulated results
    botStanding.points += simulatedPoints;
    botStanding.events = eventNumber; // All bots now show as having completed all events
    botStanding.simulatedEvents = simulatedEvents; // Track how many were simulated
  }
  
  // IMPORTANT: Ensure ALL bots in standings (not just those in allBots) have correct events count
  // This handles any edge cases where bots might be in standings but not in allBots
  let botsUpdatedCount = 0;
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      // Make sure all bots show the current event number
      racer.events = eventNumber;
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
      const earnedPhotoFinish = awardsCalc.checkPhotoFinish(position, times.userTime, times.winnerTime, times.secondPlaceTime);
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
