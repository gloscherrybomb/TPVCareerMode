// process-json-results.js - Process race results from JSON files
// This is a separate processing pipeline for JSON results from the TPVirtual API
// Keeps CSV processing (process-results.js) completely untouched

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const awardsCalc = require('./awards-calculation');
const { AWARD_CREDIT_MAP, PER_EVENT_CREDIT_CAP, COMPLETION_BONUS_CC } = require('./currency-config');
const { EVENT_NAMES, EVENT_TYPES, OPTIONAL_EVENTS, STAGE_REQUIREMENTS } = require('./event-config');
const { parseJSON, hasPowerData } = require('./json-parser');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
    return;
  }

  const userDoc = usersQuery.docs[0];
  const userRef = userDoc.ref;
  const userData = userDoc.data();

  console.log(`   Found user: ${userData.name || uid} (Document ID: ${userDoc.id})`);

  const currentStage = userData.currentStage || 1;
  const usedOptionalEvents = userData.usedOptionalEvents || [];
  const tourProgress = userData.tourProgress || {};

  // Validate event
  const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);
  const isSpecialEventResult = validation.isSpecialEvent === true;

  if (!validation.valid) {
    console.log(`❌ Event ${eventNumber} not valid for user at stage ${currentStage}: ${validation.reason}`);
    return;
  }

  if (isSpecialEventResult) {
    console.log(`⭐ Event ${eventNumber} is SPECIAL - career points only, no stage progression`);
  }

  // Find user's result
  const userResult = results.find(r => r.UID === uid);
  if (!userResult) {
    console.log(`User ${uid} not found in results, skipping`);
    return;
  }

  // Check if already processed
  const existingResults = userData[`event${eventNumber}Results`];
  if (existingResults && existingResults.position === parseInt(userResult.Position)) {
    console.log(`Event ${eventNumber} already processed for user ${uid}, skipping`);
    return;
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
  let earnedDomination = false;
  let earnedCloseCall = false;
  let earnedPhotoFinish = false;
  let earnedDarkHorse = false;
  let earnedWindTunnel = false;
  let earnedTheAccountant = false;

  // Power awards
  let earnedPowerSurge = false;
  let earnedSteadyEddie = false;
  let earnedBlastOff = false;

  if (!isDNF) {
    // Prediction awards
    if (predictedPosition) {
      earnedPunchingMedal = (predictedPosition - position) >= 10;
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
    distance: distance,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null,

    // Standard awards
    earnedPunchingMedal: earnedPunchingMedal,
    earnedGiantKillerMedal: earnedGiantKillerMedal,
    earnedDomination: earnedDomination,
    earnedCloseCall: earnedCloseCall,
    earnedPhotoFinish: earnedPhotoFinish,
    earnedDarkHorse: earnedDarkHorse,
    earnedWindTunnel: earnedWindTunnel,
    earnedTheAccountant: earnedTheAccountant,

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

  // Prepare update object
  const updateData = {
    [`event${eventNumber}Results`]: eventResults,
    totalPoints: admin.firestore.FieldValue.increment(points),
    powerRecords: updatedPowerRecords
  };

  // Stage progression (only for non-special events)
  if (!isSpecialEventResult) {
    updateData.currentStage = nextStage;
    updateData.usedOptionalEvents = newUsedOptionalEvents;
    updateData.tourProgress = newTourProgress;
  }

  // Award increments
  if (!isDNF) {
    if (position === 1) updateData['awards.gold'] = admin.firestore.FieldValue.increment(1);
    if (position === 2) updateData['awards.silver'] = admin.firestore.FieldValue.increment(1);
    if (position === 3) updateData['awards.bronze'] = admin.firestore.FieldValue.increment(1);
    if (earnedPunchingMedal) updateData['awards.punchingMedal'] = admin.firestore.FieldValue.increment(1);
    if (earnedGiantKillerMedal) updateData['awards.giantKillerMedal'] = admin.firestore.FieldValue.increment(1);
    if (earnedDomination) updateData['awards.domination'] = admin.firestore.FieldValue.increment(1);
    if (earnedCloseCall) updateData['awards.closeCall'] = admin.firestore.FieldValue.increment(1);
    if (earnedPhotoFinish) updateData['awards.photoFinish'] = admin.firestore.FieldValue.increment(1);
    if (earnedDarkHorse) updateData['awards.darkHorse'] = admin.firestore.FieldValue.increment(1);
    if (earnedWindTunnel) updateData['awards.windTunnel'] = admin.firestore.FieldValue.increment(1);
    if (earnedTheAccountant) updateData['awards.theAccountant'] = admin.firestore.FieldValue.increment(1);

    // Power awards
    if (earnedPowerSurge) updateData['awards.powerSurge'] = admin.firestore.FieldValue.increment(1);
    if (earnedSteadyEddie) updateData['awards.steadyEddie'] = admin.firestore.FieldValue.increment(1);
    if (earnedBlastOff) {
      updateData['awards.blastOff'] = admin.firestore.FieldValue.increment(1);
      updateData.hasEarnedBlastOff = true;  // Prevent earning again
    }
  }

  // Calculate Cadence Credits
  let earnedCC = 0;
  const awardList = [];

  if (!isDNF) {
    if (position === 1) { earnedCC += AWARD_CREDIT_MAP.goldMedal || 0; awardList.push('goldMedal'); }
    if (position === 2) { earnedCC += AWARD_CREDIT_MAP.silverMedal || 0; awardList.push('silverMedal'); }
    if (position === 3) { earnedCC += AWARD_CREDIT_MAP.bronzeMedal || 0; awardList.push('bronzeMedal'); }
    if (earnedPunchingMedal) { earnedCC += AWARD_CREDIT_MAP.punchingMedal || 0; awardList.push('punchingMedal'); }
    if (earnedGiantKillerMedal) { earnedCC += AWARD_CREDIT_MAP.giantKillerMedal || 0; awardList.push('giantKillerMedal'); }
    if (earnedDomination) { earnedCC += AWARD_CREDIT_MAP.domination || 0; awardList.push('domination'); }
    if (earnedCloseCall) { earnedCC += AWARD_CREDIT_MAP.closeCall || 0; awardList.push('closeCall'); }
    if (earnedPhotoFinish) { earnedCC += AWARD_CREDIT_MAP.photoFinish || 0; awardList.push('photoFinish'); }
    if (earnedDarkHorse) { earnedCC += AWARD_CREDIT_MAP.darkHorse || 0; awardList.push('darkHorse'); }
    if (earnedWindTunnel) { earnedCC += AWARD_CREDIT_MAP.windTunnel || 0; awardList.push('windTunnel'); }
    if (earnedTheAccountant) { earnedCC += AWARD_CREDIT_MAP.theAccountant || 0; awardList.push('theAccountant'); }

    // Power awards CC
    if (earnedPowerSurge) { earnedCC += AWARD_CREDIT_MAP.powerSurge || 25; awardList.push('powerSurge'); }
    if (earnedSteadyEddie) { earnedCC += AWARD_CREDIT_MAP.steadyEddie || 30; awardList.push('steadyEddie'); }
    if (earnedBlastOff) { earnedCC += AWARD_CREDIT_MAP.blastOff || 50; awardList.push('blastOff'); }
  }

  // Completion bonus if no awards
  if (awardList.length === 0 && !isDNF) {
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
      const results = parseJSON(rawResults);

      console.log(`   Found ${results.length} results in JSON`);

      if (hasPowerData(results)) {
        console.log(`   ⚡ Power data available`);
      }

      // Find human UIDs
      const humanUids = results
        .filter(r => !r.IsBot)
        .map(r => r.UID)
        .filter((uid, index, self) => uid && self.indexOf(uid) === index);

      console.log(`   Found ${humanUids.length} human racer(s): ${humanUids.join(', ')}`);

      // Process each human's result
      const raceTimestamp = Date.now();
      for (const uid of humanUids) {
        await processUserResult(uid, eventInfo, results, raceTimestamp);
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
