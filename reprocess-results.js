#!/usr/bin/env node

/**
 * reprocess-results.js - Reprocess existing race results to add new fields
 * 
 * This script fetches results from Firestore and reprocesses them through
 * the same logic as process-results.js, but specifically for updating existing
 * results with new features like bonus points, predictions, and medals.
 * 
 * Usage:
 *   node reprocess-results.js                    # Reprocess all results
 *   node reprocess-results.js --event 1          # Reprocess specific event
 *   node reprocess-results.js --season 1         # Reprocess entire season
 *   node reprocess-results.js --user UID         # Reprocess specific user
 *   node reprocess-results.js --event 1 --dry-run # Preview changes
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  event: null,
  season: 1,
  user: null,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--event' && args[i + 1]) {
    options.event = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--season' && args[i + 1]) {
    options.season = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--user' && args[i + 1]) {
    options.user = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Event maximum points lookup
const EVENT_MAX_POINTS = {
  1: 65, 2: 95, 3: 50, 4: 50, 5: 80, 6: 50, 7: 70, 8: 185, 9: 85,
  10: 70, 11: 60, 12: 145, 13: 120, 14: 95, 15: 135
};

/**
 * Calculate points with bonus
 */
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

/**
 * Calculate predicted position from EventRating
 */
function calculatePredictedPosition(results, userUid) {
  const finishers = results.filter(r => 
    r.position !== 'DNF' && 
    r.eventRating && 
    !isNaN(parseInt(r.eventRating))
  );
  
  finishers.sort((a, b) => parseInt(b.eventRating) - parseInt(a.eventRating));
  
  const predictedIndex = finishers.findIndex(r => r.uid === userUid);
  return predictedIndex === -1 ? null : predictedIndex + 1;
}

/**
 * Check if user earned Giant Killer medal
 */
function checkGiantKiller(results, userUid) {
  const userResult = results.find(r => r.uid === userUid);
  if (!userResult || userResult.position === 'DNF' || !userResult.eventRating) {
    return false;
  }
  
  const userPosition = typeof userResult.position === 'number' ? 
    userResult.position : parseInt(userResult.position);
  
  if (isNaN(userPosition)) return false;
  
  const finishers = results.filter(r => 
    r.position !== 'DNF' && 
    r.eventRating && 
    !isNaN(parseInt(r.eventRating))
  );
  
  if (finishers.length === 0) return false;
  
  finishers.sort((a, b) => parseInt(b.eventRating) - parseInt(a.eventRating));
  
  const giant = finishers[0];
  const giantPosition = typeof giant.position === 'number' ? 
    giant.position : parseInt(giant.position);
  
  if (giant.uid === userUid) return false;
  
  return userPosition < giantPosition;
}

/**
 * Reprocess a single event's results
 */
async function reprocessEvent(season, eventNumber) {
  const resultDocId = `season${season}_event${eventNumber}`;
  
  console.log(`\n📊 Reprocessing ${resultDocId}...`);
  
  try {
    const resultDoc = await db.collection('results').doc(resultDocId).get();
    
    if (!resultDoc.exists()) {
      console.log(`   ⚠️  No results found for ${resultDocId}`);
      return { processed: 0, updated: 0, errors: 0 };
    }
    
    const resultData = resultDoc.data();
    const results = resultData.results || [];
    
    console.log(`   Found ${results.length} results`);
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // Track updated results for the results collection
    const updatedResults = [];
    
    // Process each result
    for (const result of results) {
      try {
        const position = typeof result.position === 'number' ? 
          result.position : parseInt(result.position);
        
        if (isNaN(position) || result.position === 'DNF') {
          updatedResults.push(result); // Keep DNF as-is
          continue;
        }
        
        // Calculate new fields for this result
        const predictedPosition = calculatePredictedPosition(results, result.uid);
        const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
        const { points, bonusPoints } = pointsResult;
        
        let earnedPunchingMedal = false;
        if (predictedPosition) {
          const placesBeaten = predictedPosition - position;
          earnedPunchingMedal = placesBeaten >= 10;
        }
        
        const earnedGiantKillerMedal = checkGiantKiller(results, result.uid);
        
        // Build updated result for results collection
        const updatedResult = {
          ...result,
          eventRating: result.eventRating || null,
          predictedPosition: predictedPosition,
          points: points,
          bonusPoints: bonusPoints,
          earnedPunchingMedal: earnedPunchingMedal,
          earnedGiantKillerMedal: earnedGiantKillerMedal
        };
        
        updatedResults.push(updatedResult);
        
        // Update user document if not a bot
        if (!result.uid || result.uid.startsWith('Bot')) {
          processed++;
          continue; // Skip bots for user document updates
        }
        
        // Find user document
        const usersQuery = await db.collection('users')
          .where('uid', '==', result.uid)
          .limit(1)
          .get();
        
        if (usersQuery.empty) {
          console.log(`   ⚠️  User ${result.uid} not found in database`);
          processed++;
          continue;
        }
        
        const userDoc = usersQuery.docs[0];
        const userData = userDoc.data();
        
        // Build updated event results for user document
        const updatedEventResults = {
          position: position,
          time: result.time || 0,
          arr: result.arr || 0,
          arrBand: result.arrBand || '',
          eventRating: result.eventRating || null,
          predictedPosition: predictedPosition,
          points: points,
          bonusPoints: bonusPoints,
          earnedPunchingMedal: earnedPunchingMedal,
          earnedGiantKillerMedal: earnedGiantKillerMedal,
          distance: result.distance || 0,
          deltaTime: result.deltaTime || 0,
          eventPoints: result.eventPoints || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const existingEventResults = userData[`event${eventNumber}Results`];
        
        // Check if anything changed
        const hasChanges = !existingEventResults || 
          existingEventResults.bonusPoints !== bonusPoints ||
          existingEventResults.predictedPosition !== predictedPosition ||
          existingEventResults.earnedPunchingMedal !== earnedPunchingMedal ||
          existingEventResults.earnedGiantKillerMedal !== earnedGiantKillerMedal;
        
        if (!hasChanges) {
          processed++;
          continue; // No changes needed
        }
        
        // Log what will change
        const changes = [];
        if (!existingEventResults?.bonusPoints && bonusPoints > 0) {
          changes.push(`+${bonusPoints} bonus`);
        }
        if (!existingEventResults?.predictedPosition && predictedPosition) {
          changes.push(`predicted: ${predictedPosition}`);
        }
        if (earnedPunchingMedal && !existingEventResults?.earnedPunchingMedal) {
          changes.push('🥊');
        }
        if (earnedGiantKillerMedal && !existingEventResults?.earnedGiantKillerMedal) {
          changes.push('⚔️');
        }
        
        console.log(`   ✨ ${userData.name || result.uid}: Pos ${position} → ${changes.join(', ')}`);
        
        if (!options.dryRun) {
          // Update user document
          await userDoc.ref.update({
            [`event${eventNumber}Results`]: updatedEventResults
          });
          updated++;
        }
        
        processed++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${result.uid || result.name}:`, error.message);
        updatedResults.push(result); // Keep original on error
        errors++;
      }
    }
    
    // Update the results collection with all updated results
    if (!options.dryRun && updatedResults.length > 0) {
      await db.collection('results').doc(resultDocId).update({
        results: updatedResults,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Updated results collection`);
    }
    
    return { processed, updated, errors };
    
  } catch (error) {
    console.error(`   ❌ Error reprocessing ${resultDocId}:`, error);
    return { processed: 0, updated: 0, errors: 1 };
  }
}

/**
 * Main reprocessing function
 */
async function main() {
  console.log('🔄 TPV Career Mode - Results Reprocessor\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  console.log('Options:', options);
  
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  // Determine which events to reprocess
  const eventsToProcess = [];
  
  if (options.event) {
    eventsToProcess.push({ season: options.season, event: options.event });
  } else {
    // Reprocess all events in the season (1-9 for now)
    for (let i = 1; i <= 9; i++) {
      eventsToProcess.push({ season: options.season, event: i });
    }
  }
  
  // Process each event
  for (const { season, event } of eventsToProcess) {
    const stats = await reprocessEvent(season, event);
    totalProcessed += stats.processed;
    totalUpdated += stats.updated;
    totalErrors += stats.errors;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Reprocessing Complete\n');
  console.log(`   Results checked: ${totalProcessed}`);
  console.log(`   Results updated: ${totalUpdated}`);
  console.log(`   Errors: ${totalErrors}`);
  
  if (options.dryRun) {
    console.log('\n   ℹ️  This was a dry run. Run without --dry-run to apply changes.');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Run the script
main().then(() => {
  console.log('✅ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
