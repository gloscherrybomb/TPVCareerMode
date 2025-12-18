/**
 * Regenerate Narratives Script
 *
 * Clears a user's narrative history and regenerates stories for all completed events.
 * This is useful when narrative generation logic has been updated and you want
 * users to see the improved narratives.
 *
 * Usage:
 *   node regenerate-narratives.js --user <uid>     # Regenerate for specific user
 *   node regenerate-narratives.js                   # Regenerate for all users
 *   node regenerate-narratives.js --dry-run        # Preview without making changes
 */

const admin = require('firebase-admin');

// Import narrative system modules from root
const storyGen = require('../../story-generator.js');
const { NARRATIVE_DATABASE } = require('../../narrative-database.js');
const { StorySelector } = require('../../story-selector.js');

// Parse command line arguments
const args = process.argv.slice(2);
const userArg = args.find(arg => arg.startsWith('--user='))?.split('=')[1]
             || args[args.indexOf('--user') + 1];
const dryRun = args.includes('--dry-run');

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize narrative selector
const narrativeSelector = new StorySelector();
narrativeSelector.initialize(NARRATIVE_DATABASE);

// Event names for logging
const EVENT_NAMES = {
  1: 'The Opener',
  2: 'Mountain Madness',
  3: 'Optional Event',
  4: 'Rolling Thunder',
  5: 'Peak Power',
  6: 'Optional Event',
  7: 'Tempo Trial',
  8: 'Optional Event',
  9: 'Velodrome Vendetta',
  10: 'The Grind',
  11: 'The Switchback',
  12: 'Road Warriors',
  13: 'Local Tour Stage 1',
  14: 'Local Tour Stage 2',
  15: 'Local Tour Stage 3'
};

/**
 * Clear narrative history for a user from both collections
 */
async function clearNarrativeHistory(uid) {
  let totalCleared = 0;

  // 1. Clear from riders/{uid}/narrative_history subcollection
  const ridersHistoryRef = db.collection('riders').doc(uid).collection('narrative_history');
  const ridersSnapshot = await ridersHistoryRef.get();

  if (!ridersSnapshot.empty) {
    const batch = db.batch();
    ridersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!dryRun) {
      await batch.commit();
    }
    console.log(`   ${dryRun ? '[DRY RUN] Would clear' : 'Cleared'} ${ridersSnapshot.size} entries from riders/${uid}/narrative_history`);
    totalCleared += ridersSnapshot.size;
  }

  // 2. Clear from users/{uid}/narrative_history subcollection (if exists)
  const usersHistoryRef = db.collection('users').doc(uid).collection('narrative_history');
  const usersSnapshot = await usersHistoryRef.get();

  if (!usersSnapshot.empty) {
    const batch = db.batch();
    usersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!dryRun) {
      await batch.commit();
    }
    console.log(`   ${dryRun ? '[DRY RUN] Would clear' : 'Cleared'} ${usersSnapshot.size} entries from users/${uid}/narrative_history`);
    totalCleared += usersSnapshot.size;
  }

  // 3. Clear narrativeHistory field on users document (if exists)
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data().narrativeHistory) {
    if (!dryRun) {
      await db.collection('users').doc(uid).update({
        narrativeHistory: admin.firestore.FieldValue.delete()
      });
    }
    console.log(`   ${dryRun ? '[DRY RUN] Would clear' : 'Cleared'} narrativeHistory field from users/${uid}`);
    totalCleared++;
  }

  if (totalCleared === 0) {
    console.log(`   No narrative history to clear`);
  }

  return totalCleared;
}

/**
 * Get completed events for a user in order
 */
function getCompletedEvents(userData) {
  const events = [];

  for (let i = 1; i <= 15; i++) {
    const eventKey = `event${i}Results`;
    if (userData[eventKey] && userData[eventKey].position) {
      events.push({
        eventNumber: i,
        results: userData[eventKey]
      });
    }
  }

  return events;
}

/**
 * Calculate season data at a specific point in time
 */
function calculateSeasonDataAtEvent(userData, completedEvents, currentEventIndex) {
  // Get events completed UP TO this point (not including current)
  const priorEvents = completedEvents.slice(0, currentEventIndex);
  const currentEvent = completedEvents[currentEventIndex];

  // Calculate stats from prior events
  let totalPoints = 0;
  let totalWins = 0;
  let totalPodiums = 0;
  const recentResults = [];

  priorEvents.forEach(e => {
    totalPoints += e.results.points || 0;
    if (e.results.position === 1) totalWins++;
    if (e.results.position <= 3) totalPodiums++;
    recentResults.unshift(e.results.position);
  });

  // Add current event
  totalPoints += currentEvent.results.points || 0;
  if (currentEvent.results.position === 1) totalWins++;
  if (currentEvent.results.position <= 3) totalPodiums++;
  recentResults.unshift(currentEvent.results.position);

  // Keep only recent results (last 5)
  const recent = recentResults.slice(0, 5);

  // Check for streak (2+ consecutive wins or podiums)
  const isOnStreak = recent.length >= 2 && recent[0] <= 3 && recent[1] <= 3;

  // Calculate next stage
  const stagesCompleted = currentEventIndex + 1;
  const nextStage = stagesCompleted < 15 ? stagesCompleted + 1 : null;

  // Determine next event number
  let nextEventNumber = null;
  if (nextStage) {
    // Find what the next completed event was, or use stage number as fallback
    if (currentEventIndex + 1 < completedEvents.length) {
      nextEventNumber = completedEvents[currentEventIndex + 1].eventNumber;
    } else {
      nextEventNumber = nextStage; // Fallback
    }
  }

  // Get completed optional events up to this point
  const completedOptionalEvents = priorEvents
    .filter(e => [3, 6, 8].includes(e.eventNumber))
    .map(e => e.eventNumber);

  return {
    stagesCompleted: stagesCompleted,
    totalPoints: totalPoints,
    totalWins: totalWins,
    totalPodiums: totalPodiums,
    nextStageNumber: nextStage,
    nextEventNumber: nextEventNumber,
    isNextStageChoice: nextStage ? [3, 6, 8].includes(nextStage) : false,
    completedOptionalEvents: completedOptionalEvents,
    recentResults: recent,
    isOnStreak: isOnStreak,
    seasonPosition: null,
    topRivals: userData.topRivals || [],
    rivalEncounters: [],
    personality: userData.personality || null,
    racesCompleted: currentEventIndex
  };
}

/**
 * Regenerate narrative for a single event
 */
async function regenerateEventNarrative(uid, userData, completedEvents, eventIndex) {
  const event = completedEvents[eventIndex];
  const eventNumber = event.eventNumber;
  const results = event.results;

  console.log(`   Event ${eventNumber} (${EVENT_NAMES[eventNumber]}): Position ${results.position}`);

  // Build race data
  const raceData = {
    eventNumber: eventNumber,
    position: results.position,
    predictedPosition: results.predictedPosition || 15,
    winMargin: results.winMargin || null,
    lossMargin: results.lossMargin || null,
    earnedDomination: results.earnedDomination || false,
    earnedCloseCall: results.earnedCloseCall || false,
    earnedPhotoFinish: results.earnedPhotoFinish || false,
    earnedDarkHorse: results.earnedDarkHorse || false,
    earnedZeroToHero: results.earnedZeroToHero || false,
    winnerName: results.winnerName || null,
    secondPlaceName: results.secondPlaceName || null,
    gcPosition: results.gcResults?.userGCPosition || null,
    gcGap: results.gcResults?.userGC?.gapToLeader || null
  };

  // Calculate season data at this point
  const seasonData = calculateSeasonDataAtEvent(userData, completedEvents, eventIndex);

  // Load fresh narrative history (will be empty after clearing, then build up)
  await narrativeSelector.loadRiderHistory(uid, db);

  // Generate the story
  const storyResult = await storyGen.generateRaceStory(
    raceData,
    seasonData,
    uid,
    narrativeSelector,
    db
  );

  if (storyResult && storyResult.recap) {
    // Update the event results with new story in 'users' collection
    if (!dryRun) {
      const updateKey = `event${eventNumber}Results.story`;
      await db.collection('users').doc(uid).update({
        [updateKey]: storyResult.recap
      });
    }

    const paragraphs = storyResult.recap.split('\n\n').length;
    console.log(`      ${dryRun ? '[DRY RUN] Would generate' : 'Generated'} story (${paragraphs} paragraphs)`);
    return true;
  } else {
    console.log(`      Warning: No story generated`);
    return false;
  }
}

/**
 * Regenerate all narratives for a user
 */
async function regenerateUserNarratives(uid) {
  console.log(`\nProcessing user: ${uid}`);

  // Get user data from 'users' collection (where event results are stored)
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    console.log(`   User not found in 'users' collection`);
    return { success: false, reason: 'not_found' };
  }

  const userData = userDoc.data();
  const userName = userData.name || uid;
  console.log(`   Name: ${userName}`);

  // Get completed events
  const completedEvents = getCompletedEvents(userData);
  if (completedEvents.length === 0) {
    console.log(`   No completed events - skipping`);
    return { success: true, eventsProcessed: 0 };
  }

  console.log(`   Found ${completedEvents.length} completed events`);

  // Clear narrative history first
  await clearNarrativeHistory(uid);

  // Regenerate story for each event in order
  let eventsProcessed = 0;
  for (let i = 0; i < completedEvents.length; i++) {
    const success = await regenerateEventNarrative(uid, userData, completedEvents, i);
    if (success) eventsProcessed++;
  }

  console.log(`   Completed: ${eventsProcessed}/${completedEvents.length} events regenerated`);
  return { success: true, eventsProcessed };
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Narrative Regeneration Script');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  let usersProcessed = 0;
  let totalEventsRegenerated = 0;

  if (userArg) {
    // Single user mode
    console.log(`\nTarget: Single user (${userArg})`);
    const result = await regenerateUserNarratives(userArg);
    if (result.success) {
      usersProcessed = 1;
      totalEventsRegenerated = result.eventsProcessed || 0;
    }
  } else {
    // All users mode
    console.log('\nTarget: All users');

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);

    for (const doc of usersSnapshot.docs) {
      const result = await regenerateUserNarratives(doc.id);
      if (result.success) {
        usersProcessed++;
        totalEventsRegenerated += result.eventsProcessed || 0;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Users processed: ${usersProcessed}`);
  console.log(`Events regenerated: ${totalEventsRegenerated}`);
  if (dryRun) {
    console.log('\n*** DRY RUN - No actual changes were made ***');
  }
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
