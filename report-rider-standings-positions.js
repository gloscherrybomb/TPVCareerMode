#!/usr/bin/env node

/**
 * Generate Season 1 Rider Standings Position Report
 * Queries Firestore to get each human rider's exact position as shown on their standings page
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Main function to generate the report
 */
async function generateReport() {
  console.log('='.repeat(80));
  console.log('SEASON 1 - HUMAN RIDER STANDINGS POSITIONS');
  console.log('Each rider\'s exact position as shown on their standings page');
  console.log('='.repeat(80));
  console.log();

  try {
    // Fetch all users from Firestore
    console.log('Fetching users from Firestore...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users\n`);

    const humanRiders = [];
    let skippedBots = 0;
    let noStandingsData = 0;
    let notFoundInStandings = 0;

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;

      // Skip bot users
      if (uid.startsWith('Bot')) {
        skippedBots++;
        continue;
      }

      const userData = userDoc.data();

      // Try stored rank first (if season is complete)
      let position = userData.season1Rank || null;
      let standings = userData.season1Standings || [];
      let eventsCompleted = 0;
      let totalPoints = 0;

      // If no stored rank, calculate from standings array
      if (!position && standings.length > 0) {
        const userIndex = standings.findIndex(r => r.uid === uid || r.isCurrentUser === true);

        if (userIndex === -1) {
          console.warn(`Warning: User ${userData.name || uid} not found in their own standings array`);
          notFoundInStandings++;
          continue;
        }

        position = userIndex + 1;

        // Get user's entry from standings
        const userEntry = standings[userIndex];
        eventsCompleted = userEntry.events || 0;
        totalPoints = userEntry.points || 0;
      } else if (position) {
        // Has stored rank, get events/points from standings if available
        const userEntry = standings.find(r => r.uid === uid || r.isCurrentUser === true);
        if (userEntry) {
          eventsCompleted = userEntry.events || 0;
          totalPoints = userEntry.points || 0;
        }
      } else {
        // No position and no standings
        noStandingsData++;
        continue;
      }

      humanRiders.push({
        name: userData.name || 'Unknown',
        uid: uid,
        position: position,
        totalRiders: standings.length,
        eventsCompleted: eventsCompleted,
        totalPoints: totalPoints
      });
    }

    console.log(`Processed ${humanRiders.length} human riders`);
    console.log(`Skipped ${skippedBots} bot users`);
    console.log(`Skipped ${noStandingsData} users with no standings data`);
    if (notFoundInStandings > 0) {
      console.log(`Warning: ${notFoundInStandings} users not found in their own standings`);
    }
    console.log();

    // Sort by position
    humanRiders.sort((a, b) => a.position - b.position);

    console.log('-'.repeat(80));
    console.log();

    // Generate output
    humanRiders.forEach(rider => {
      const suffix = getOrdinalSuffix(rider.position);
      const races = rider.eventsCompleted === 1 ? '1 race' : `${rider.eventsCompleted} races`;
      console.log(`${rider.name}, ${races}, ${rider.position}${suffix} place`);
    });

    console.log();
    console.log('-'.repeat(80));
    console.log(`Total: ${humanRiders.length} human riders`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  } finally {
    // Clean up Firebase connection
    await admin.app().delete();
  }
}

// Run the report
generateReport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
