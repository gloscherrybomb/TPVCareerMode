const admin = require("firebase-admin");

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Unlock configuration (must match unlock-config.js)
const UNLOCK_CONFIG = {
  paceNotes: { name: 'Pace Notes', pointsBonus: 3, emoji: '📋' },
  teamCarRecon: { name: 'Team Car Recon', pointsBonus: 4, emoji: '🚗' },
  sprintPrimer: { name: 'Sprint Primer', pointsBonus: 3, emoji: '⚡' },
  aeroWheels: { name: 'Aero Wheels', pointsBonus: 5, emoji: '🎡' },
  cadenceNutrition: { name: 'Cadence Nutrition', pointsBonus: 4, emoji: '🍌' },
  soigneurSession: { name: 'Soigneur Session', pointsBonus: 4, emoji: '💆' },
  preRaceMassage: { name: 'Pre-Race Massage', pointsBonus: 5, emoji: '🙌' },
  windTunnel: { name: 'Wind Tunnel Session', pointsBonus: 6, emoji: '💨' },
  altitudeAcclim: { name: 'Altitude Camp', pointsBonus: 6, emoji: '🏔️' },
  signatureMove: { name: 'Signature Move', pointsBonus: 8, emoji: '✨' },
  contractBonus: { name: 'Contract Bonus', pointsBonus: 7, emoji: '📝' },
  fanFavorite: { name: 'Fan Favorite', pointsBonus: 7, emoji: '🎉' },
  climbingGears: { name: 'Climbing Gears', pointsBonus: 5, emoji: '⛰️' },
  aggroRaceKit: { name: 'Aggro Race Kit', pointsBonus: 5, emoji: '🔥' },
  tightPackWin: { name: 'Tight Pack Win', pointsBonus: 5, emoji: '🎯' },
  domestiqueHelp: { name: 'Domestique Help', pointsBonus: 6, emoji: '🤝' },
  recoveryBoots: { name: 'Recovery Boots', pointsBonus: 6, emoji: '🦵' },
  rivalSlayer: { name: 'Rival Slayer', pointsBonus: 6, emoji: '⚔️' },
  mentalCoach: { name: 'Mental Coach', pointsBonus: 4, emoji: '🧠' },
  aggressionKit: { name: 'Aggression Kit', pointsBonus: 4, emoji: '😤' },
  tacticalRadio: { name: 'Tactical Radio', pointsBonus: 4, emoji: '📻' },
  professionalAttitude: { name: 'Professional Attitude', pointsBonus: 4, emoji: '👔' },
  confidenceBooster: { name: 'Confidence Booster', pointsBonus: 5, emoji: '💪' },
  aggressorHelmet: { name: 'Aggressor Helmet', pointsBonus: 5, emoji: '🪖' },
  teamLeaderJersey: { name: 'Team Leader Jersey', pointsBonus: 5, emoji: '👕' },
  calmAnalyst: { name: 'Calm Analyst', pointsBonus: 5, emoji: '🧘' },
  humbleChampion: { name: 'Humble Champion', pointsBonus: 5, emoji: '🏆' },
  showmanGear: { name: 'Showman Gear', pointsBonus: 5, emoji: '🎭' },
  comebackKing: { name: 'Comeback King', pointsBonus: 5, emoji: '👑' },
  balancedApproach: { name: 'Balanced Approach', pointsBonus: 7, emoji: '⚖️' }
};

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

    // Get user document
    const userRef = db.collection('users').doc(userUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`❌ User ${userUid} not found`);
      process.exit(1);
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
      totalPoints: totalPointsFromEvents,
      careerPoints: totalPointsFromEvents,
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
