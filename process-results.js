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
 * Calculate points based on finishing position using Career Mode formula
 * 
 * Formula: points = (maxPoints/2) + (40 - position) * ((maxPoints - 10)/78) + podiumBonus
 * 
 * Podium bonuses:
 * - 1st place: +5
 * - 2nd place: +3
 * - 3rd place: +2
 * - Other: +0
 * 
 * Only positions 1-40 score points. Position > 40 or DNF = 0 points.
 */
function calculatePoints(position, eventNumber) {
  // Get max points for this event
  const maxPoints = EVENT_MAX_POINTS[eventNumber];
  
  if (!maxPoints) {
    console.warn(`No max points defined for event ${eventNumber}, using 100`);
    return Math.max(0, 100 - (position - 1) * 2); // Fallback
  }
  
  // Only positions 1-40 score points
  if (position > 40) {
    return 0;
  }
  
  // Calculate base points
  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  
  // Calculate podium bonus
  let podiumBonus = 0;
  if (position === 1) podiumBonus = 5;
  else if (position === 2) podiumBonus = 3;
  else if (position === 3) podiumBonus = 2;
  
  // Total points (rounded to nearest integer)
  return Math.round(basePoints + podiumBonus);
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
    console.log(`❌ User with uid ${uid} not found in database`);
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
      }
    });
    return;
  }
  
  // Calculate points
  const points = calculatePoints(position, eventNumber);
  
  // Prepare event results
  const eventResults = {
    position: position,
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
    arrBand: userResult.ARRBand || '',
    points: points,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Build season standings with all racers from CSV
  const seasonStandings = buildSeasonStandings(results, userData, eventNumber, uid);
  
  // Update user document
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    currentStage: eventNumber + 1, // Unlock next event
    totalPoints: (userData.totalPoints || 0) + points,
    totalEvents: (userData.totalEvents || 0) + 1,
    [`season${season}Standings`]: seasonStandings
  };
  
  // Add to completedStages if not already there
  const completedStages = userData.completedStages || [];
  if (!completedStages.includes(eventNumber)) {
    updates.completedStages = admin.firestore.FieldValue.arrayUnion(eventNumber);
  }
  
  await userRef.update(updates);
  
  console.log(`✅ Processed event ${eventNumber} for user ${uid}: Position ${position}, Points ${points}`);
  
  // Update results summary collection
  await updateResultsSummary(season, eventNumber, results);
}

/**
 * Build season standings including all racers from CSV
 */
function buildSeasonStandings(results, userData, eventNumber, currentUid) {
  const existingStandings = userData[`season${1}Standings`] || [];
  
  // Create a map of existing racers
  const standingsMap = new Map();
  existingStandings.forEach(racer => {
    standingsMap.set(racer.uid || racer.name, racer);
  });
  
  // Process all racers from CSV
  results.forEach(result => {
    const uid = result.UID;
    const name = result.Name;
    const position = parseInt(result.Position);
    
    // Skip DNFs and invalid positions
    if (result.Position === 'DNF' || isNaN(position)) {
      return;
    }
    
    const points = calculatePoints(position, eventNumber);
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
      standingsMap.set(key, {
        name: name,
        uid: isBotRacer ? null : uid,
        arr: arr,
        team: team,
        events: 1,
        points: points,
        isBot: isBotRacer,
        isCurrentUser: uid === currentUid
      });
    }
  });
  
  // Convert back to array and sort by points
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => b.points - a.points);
  
  return standings;
}

/**
 * Update results summary collection (for quick access to full results)
 */
async function updateResultsSummary(season, event, results) {
  const summaryRef = db.collection('results').doc(`season${season}_event${event}`);
  
  // Filter valid results (no DNFs for summary)
  const validResults = results
    .filter(r => r.Position !== 'DNF' && !isNaN(parseInt(r.Position)))
    .map(r => ({
      position: parseInt(r.Position),
      name: r.Name,
      uid: r.UID,
      team: r.Team || '',
      arr: parseInt(r.ARR) || 0,
      arrBand: r.ARRBand || '',
      time: parseFloat(r.Time) || 0,
      points: calculatePoints(parseInt(r.Position), event),
      eventPoints: parseInt(r.Points) || null, // Points race points
      isBot: isBot(r.UID, r.Gender)
    }));
  
  await summaryRef.set({
    season: season,
    event: event,
    totalParticipants: validResults.length,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    results: validResults
  });
  
  console.log(`✅ Updated results summary for season ${season} event ${event}`);
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
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }
  
  console.log('\n✅ All results processed!');
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
