const admin = require("firebase-admin");
const { UNLOCK_DEFINITIONS } = require('./unlock-config');

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Build UNLOCK_CONFIG from shared UNLOCK_DEFINITIONS (single source of truth)
const UNLOCK_CONFIG = {};
for (const unlock of UNLOCK_DEFINITIONS) {
  UNLOCK_CONFIG[unlock.id] = {
    name: unlock.name,
    pointsBonus: unlock.pointsBonus,
    emoji: unlock.emoji || '🎯'
  };
}

/**
 * Fix unlock bonus data for a specific user and event
 *
 * Usage: node fix-unlock-bonus.js <userUid> <eventNumber> <unlockId> [reason]
 *
 * Example: node fix-unlock-bonus.js 2FDBB5DD4345DCB5 9 teamCarRecon "Top 10 or close gap to winner"
 */
async function fixUnlockBonus() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('Usage: node fix-unlock-bonus.js <userUid> <eventNumber> <unlockId> [reason]');
    console.log('');
    console.log('Arguments:');
    console.log('  userUid     - The user\'s UID (e.g., 2FDBB5DD4345DCB5)');
    console.log('  eventNumber - The event number (1-15)');
    console.log('  unlockId    - The unlock ID (e.g., teamCarRecon, paceNotes)');
    console.log('  reason      - Optional: The trigger reason (e.g., "Top 10 or close gap to winner")');
    console.log('');
    console.log('Available unlocks:');
    Object.entries(UNLOCK_CONFIG).forEach(([id, config]) => {
      console.log(`  ${id.padEnd(20)} - ${config.name} (+${config.pointsBonus} pts)`);
    });
    process.exit(1);
  }

  const userUid = args[0];
  const eventNumber = parseInt(args[1]);
  const unlockId = args[2];
  const reason = args[3] || 'Manual fix';

  // Validate inputs
  if (isNaN(eventNumber) || eventNumber < 1 || eventNumber > 15) {
    console.error('❌ Event number must be between 1 and 15');
    process.exit(1);
  }

  const unlockConfig = UNLOCK_CONFIG[unlockId];
  if (!unlockConfig) {
    console.error(`❌ Unknown unlock ID: ${unlockId}`);
    console.log('Available unlocks:', Object.keys(UNLOCK_CONFIG).join(', '));
    process.exit(1);
  }

  const unlockBonusPoints = unlockConfig.pointsBonus;

  try {
    console.log(`\n🔧 Fixing unlock bonus for user ${userUid}, event ${eventNumber}`);
    console.log(`   Unlock: ${unlockConfig.name} (${unlockConfig.emoji})`);
    console.log(`   Bonus points: +${unlockBonusPoints}`);
    console.log(`   Reason: ${reason}\n`);

    // Try to get user document by document ID first
    let userRef = db.collection('users').doc(userUid);
    let userDoc = await userRef.get();

    // If not found by document ID, search by uid field
    if (!userDoc.exists) {
      console.log(`   Document ID ${userUid} not found, searching by uid field...`);
      const querySnapshot = await db.collection('users').where('uid', '==', userUid).limit(1).get();

      if (querySnapshot.empty) {
        console.error(`❌ User ${userUid} not found (tried both document ID and uid field)`);
        process.exit(1);
      }

      userDoc = querySnapshot.docs[0];
      userRef = userDoc.ref;
      console.log(`   Found user by uid field, document ID: ${userDoc.id}`);
    }

    const userData = userDoc.data();
    console.log(`✅ Found user: ${userData.name || userUid}`);

    // Get event results
    const eventResults = userData[`event${eventNumber}Results`];
    if (!eventResults) {
      console.error(`❌ Event ${eventNumber} results not found for user`);
      process.exit(1);
    }

    console.log(`\n📊 Current event ${eventNumber} results:`);
    console.log(`   Position: ${eventResults.position}`);
    console.log(`   Points: ${eventResults.points}`);
    console.log(`   Bonus points: ${eventResults.bonusPoints}`);
    console.log(`   Unlock bonus points: ${eventResults.unlockBonusPoints || 0}`);

    // Check if unlock bonus already applied
    if (eventResults.unlockBonusPoints && eventResults.unlockBonusPoints > 0) {
      console.log(`\n⚠️  Warning: This event already has unlock bonus points (${eventResults.unlockBonusPoints})`);
      console.log('   Proceeding will replace the existing unlock bonus.');

      // Calculate the difference
      const existingBonus = eventResults.unlockBonusPoints;
      const pointsDiff = unlockBonusPoints - existingBonus;
      console.log(`   Point difference: ${pointsDiff > 0 ? '+' : ''}${pointsDiff}`);
    }

    // Calculate new values
    const existingUnlockBonus = eventResults.unlockBonusPoints || 0;
    const basePoints = eventResults.points - existingUnlockBonus;
    const baseBonusPoints = eventResults.bonusPoints - existingUnlockBonus;

    const newPoints = basePoints + unlockBonusPoints;
    const newBonusPoints = baseBonusPoints + unlockBonusPoints;

    const unlockBonusesApplied = [{
      id: unlockId,
      name: unlockConfig.name,
      emoji: unlockConfig.emoji,
      emojiFallback: null,
      pointsAdded: unlockBonusPoints,
      reason: reason
    }];

    console.log(`\n📝 New event ${eventNumber} results:`);
    console.log(`   Points: ${eventResults.points} → ${newPoints}`);
    console.log(`   Bonus points: ${eventResults.bonusPoints} → ${newBonusPoints}`);
    console.log(`   Unlock bonus points: ${existingUnlockBonus} → ${unlockBonusPoints}`);

    // Calculate total points from all event results
    let totalPointsFromEvents = 0;
    for (let i = 1; i <= 15; i++) {
      const evtResults = userData[`event${i}Results`];
      if (evtResults && typeof evtResults.points === 'number') {
        if (i === eventNumber) {
          totalPointsFromEvents += newPoints; // Use new points for this event
        } else {
          totalPointsFromEvents += evtResults.points;
        }
      }
    }

    console.log(`\n💰 Points totals:`);
    console.log(`   Current totalPoints: ${userData.totalPoints || 0}`);
    console.log(`   Current careerPoints: ${userData.careerPoints || 0}`);
    console.log(`   Current season1Points: ${userData.season1Points || 0}`);
    console.log(`   Calculated from events: ${totalPointsFromEvents}`);

    // Update season standings
    const season1Standings = userData.season1Standings || [];
    const userStandingIndex = season1Standings.findIndex(s => s.uid === userUid);

    if (userStandingIndex >= 0) {
      const oldStandingPoints = season1Standings[userStandingIndex].points;
      season1Standings[userStandingIndex].points = totalPointsFromEvents;
      console.log(`\n🏆 Season standings:`);
      console.log(`   User standing points: ${oldStandingPoints} → ${totalPointsFromEvents}`);
    } else {
      console.log(`\n⚠️  User not found in season1Standings array`);
    }

    // Sort standings by points descending
    season1Standings.sort((a, b) => (b.points || 0) - (a.points || 0));

    // Update user document
    const userUpdates = {
      [`event${eventNumber}Results.points`]: newPoints,
      [`event${eventNumber}Results.bonusPoints`]: newBonusPoints,
      [`event${eventNumber}Results.unlockBonusPoints`]: unlockBonusPoints,
      [`event${eventNumber}Results.unlockBonusesApplied`]: unlockBonusesApplied,
      totalPoints: totalPointsFromEvents,  // DEPRECATED: Kept for backwards compatibility
      careerPoints: totalPointsFromEvents,
      season1Points: totalPointsFromEvents,
      season1Standings: season1Standings
    };

    await userRef.update(userUpdates);
    console.log(`\n✅ User document updated`);

    // Update results summary document
    const season = 1;
    const summaryRef = db.collection('results').doc(`season${season}_event${eventNumber}_${userUid}`);
    const summaryDoc = await summaryRef.get();

    if (summaryDoc.exists) {
      const summaryData = summaryDoc.data();
      const results = summaryData.results || [];

      const userResultIndex = results.findIndex(r => r.uid === userUid);
      if (userResultIndex >= 0) {
        const oldSummaryPoints = results[userResultIndex].points;
        const oldSummaryBonusPoints = results[userResultIndex].bonusPoints;

        // Update the user's entry in results array
        results[userResultIndex].points = newPoints;
        results[userResultIndex].bonusPoints = newBonusPoints;
        results[userResultIndex].unlockBonusPoints = unlockBonusPoints;
        results[userResultIndex].unlockBonusesApplied = unlockBonusesApplied;

        await summaryRef.update({ results: results });

        console.log(`\n📄 Results summary updated:`);
        console.log(`   Points: ${oldSummaryPoints} → ${newPoints}`);
        console.log(`   Bonus points: ${oldSummaryBonusPoints} → ${newBonusPoints}`);
        console.log(`   Unlock bonus points: ${unlockBonusPoints}`);
      } else {
        console.log(`\n⚠️  User not found in results summary document`);
      }
    } else {
      console.log(`\n⚠️  Results summary document not found: season${season}_event${eventNumber}_${userUid}`);
    }

    console.log(`\n✅ Fix complete! Unlock bonus applied successfully.`);

  } catch (error) {
    console.error('❌ Error fixing unlock bonus:', error);
    process.exit(1);
  }
}

fixUnlockBonus();
