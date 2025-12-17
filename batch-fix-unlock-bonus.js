const admin = require("firebase-admin");
const fs = require("fs");

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
 * Batch apply unlock bonuses from a history file
 *
 * This script reads the unlock history JSON file (created by extract-unlock-history.js)
 * and re-applies all unlock bonuses after results have been reset and reprocessed.
 *
 * Usage: node batch-fix-unlock-bonus.js <inputFile> [--dry-run] [--user=UID]
 *
 * Arguments:
 *   inputFile  - Required: The unlock history JSON file
 *   --dry-run  - Optional: Preview changes without applying them
 *   --user=UID - Optional: Only process a specific user
 *
 * Examples:
 *   node batch-fix-unlock-bonus.js unlock-history.json                # Apply all
 *   node batch-fix-unlock-bonus.js unlock-history.json --dry-run      # Preview only
 *   node batch-fix-unlock-bonus.js unlock-history.json --user=ABC123  # Single user
 */
async function batchFixUnlockBonus() {
  const args = process.argv.slice(2);

  if (args.length < 1 || args[0].startsWith("--")) {
    console.log("Usage: node batch-fix-unlock-bonus.js <inputFile> [--dry-run] [--user=UID]");
    console.log("");
    console.log("Arguments:");
    console.log("  inputFile  - The unlock history JSON file (from extract-unlock-history.js)");
    console.log("  --dry-run  - Preview changes without applying them");
    console.log("  --user=UID - Only process a specific user");
    console.log("");
    console.log("Examples:");
    console.log("  node batch-fix-unlock-bonus.js unlock-history.json");
    console.log("  node batch-fix-unlock-bonus.js unlock-history.json --dry-run");
    console.log('  node batch-fix-unlock-bonus.js unlock-history.json --user=ABC123');
    process.exit(1);
  }

  const inputFile = args[0];
  const dryRun = args.includes("--dry-run");
  const userFilter = args.find(a => a.startsWith("--user="))?.split("=")[1] || null;

  console.log("\n🔧 Batch Fix Unlock Bonus\n");
  console.log(`   Input file: ${inputFile}`);
  console.log(`   Dry run: ${dryRun ? "YES (no changes will be made)" : "NO (changes will be applied)"}`);
  if (userFilter) {
    console.log(`   User filter: ${userFilter}`);
  }
  console.log("");

  // Read input file
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const unlockHistory = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  console.log(`   Extracted at: ${unlockHistory.extractedAt}`);
  console.log(`   Total users in file: ${unlockHistory.totalUsers}`);
  console.log(`   Total unlock applications: ${unlockHistory.totalUnlockApplications}`);
  console.log("");

  let processedUsers = 0;
  let processedEvents = 0;
  let skippedEvents = 0;
  let errors = 0;

  const usersToProcess = userFilter
    ? { [userFilter]: unlockHistory.users[userFilter] }
    : unlockHistory.users;

  if (userFilter && !unlockHistory.users[userFilter]) {
    console.error(`❌ User ${userFilter} not found in unlock history file`);
    process.exit(1);
  }

  for (const [userUid, userUnlocks] of Object.entries(usersToProcess)) {
    console.log(`\n👤 Processing ${userUnlocks.name} (${userUid})`);

    // Get user document
    let userRef = db.collection("users").doc(userUid);
    let userDoc = await userRef.get();

    // If not found by document ID, search by uid field
    if (!userDoc.exists) {
      const querySnapshot = await db.collection("users").where("uid", "==", userUid).limit(1).get();

      if (querySnapshot.empty) {
        console.log(`   ⚠️ User not found in database, skipping`);
        errors++;
        continue;
      }

      userDoc = querySnapshot.docs[0];
      userRef = userDoc.ref;
    }

    const userData = userDoc.data();
    processedUsers++;

    for (const [eventNumStr, eventData] of Object.entries(userUnlocks.events)) {
      const eventNumber = parseInt(eventNumStr);
      const eventResults = userData[`event${eventNumber}Results`];

      if (!eventResults) {
        console.log(`   ⚠️ Event ${eventNumber}: No results found, skipping`);
        skippedEvents++;
        continue;
      }

      // Check if event already has unlock bonus (to avoid double-applying)
      if (eventResults.unlockBonusPoints && eventResults.unlockBonusPoints > 0) {
        console.log(`   ⚠️ Event ${eventNumber}: Already has unlock bonus (${eventResults.unlockBonusPoints} pts), skipping`);
        skippedEvents++;
        continue;
      }

      // Calculate total unlock bonus from all unlocks in history
      let totalUnlockBonus = 0;
      const unlockBonusesApplied = [];

      for (const unlock of eventData.unlocks) {
        const config = UNLOCK_CONFIG[unlock.id];
        if (!config) {
          console.log(`   ⚠️ Event ${eventNumber}: Unknown unlock ID ${unlock.id}, using stored points`);
          totalUnlockBonus += unlock.pointsAdded || 0;
          unlockBonusesApplied.push({
            id: unlock.id,
            name: unlock.name || unlock.id,
            emoji: "❓",
            emojiFallback: null,
            pointsAdded: unlock.pointsAdded || 0,
            reason: unlock.reason || "Restored from history"
          });
        } else {
          totalUnlockBonus += config.pointsBonus;
          unlockBonusesApplied.push({
            id: unlock.id,
            name: config.name,
            emoji: config.emoji,
            emojiFallback: null,
            pointsAdded: config.pointsBonus,
            reason: unlock.reason || "Restored from history"
          });
        }
      }

      const newPoints = eventResults.points + totalUnlockBonus;
      const newBonusPoints = (eventResults.bonusPoints || 0) + totalUnlockBonus;

      const unlockNames = unlockBonusesApplied.map(u => u.id).join(", ");
      console.log(`   Event ${eventNumber}: +${totalUnlockBonus} pts (${unlockNames})`);

      if (!dryRun) {
        // Calculate new total points from all events
        let totalPointsFromEvents = 0;
        for (let i = 1; i <= 15; i++) {
          const evtResults = userData[`event${i}Results`];
          if (evtResults && typeof evtResults.points === "number") {
            if (i === eventNumber) {
              totalPointsFromEvents += newPoints;
            } else {
              totalPointsFromEvents += evtResults.points;
            }
          }
        }

        // Update season standings
        const season1Standings = userData.season1Standings || [];
        const userStandingIndex = season1Standings.findIndex(s => s.uid === userUid);
        if (userStandingIndex >= 0) {
          season1Standings[userStandingIndex].points = totalPointsFromEvents;
        }
        season1Standings.sort((a, b) => (b.points || 0) - (a.points || 0));

        // Update user document
        const userUpdates = {
          [`event${eventNumber}Results.points`]: newPoints,
          [`event${eventNumber}Results.bonusPoints`]: newBonusPoints,
          [`event${eventNumber}Results.unlockBonusPoints`]: totalUnlockBonus,
          [`event${eventNumber}Results.unlockBonusesApplied`]: unlockBonusesApplied,
          totalPoints: totalPointsFromEvents,
          careerPoints: totalPointsFromEvents,
          season1Standings: season1Standings
        };

        await userRef.update(userUpdates);

        // Update results summary document
        const summaryRef = db.collection("results").doc(`season1_event${eventNumber}_${userUid}`);
        const summaryDoc = await summaryRef.get();

        if (summaryDoc.exists) {
          const summaryData = summaryDoc.data();
          const results = summaryData.results || [];

          const userResultIndex = results.findIndex(r => r.uid === userUid);
          if (userResultIndex >= 0) {
            results[userResultIndex].points = newPoints;
            results[userResultIndex].bonusPoints = newBonusPoints;
            results[userResultIndex].unlockBonusPoints = totalUnlockBonus;
            results[userResultIndex].unlockBonusesApplied = unlockBonusesApplied;

            await summaryRef.update({ results: results });
          }
        }

        // Re-fetch userData for next iteration to have updated points
        const updatedUserDoc = await userRef.get();
        Object.assign(userData, updatedUserDoc.data());
      }

      processedEvents++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary");
  console.log("=".repeat(50));
  console.log(`   Users processed: ${processedUsers}`);
  console.log(`   Events updated: ${processedEvents}`);
  console.log(`   Events skipped: ${skippedEvents}`);
  console.log(`   Errors: ${errors}`);

  if (dryRun) {
    console.log("\n⚠️ DRY RUN - No changes were made");
    console.log("   Run without --dry-run to apply changes");
  } else {
    console.log("\n✅ Batch fix complete!");
  }
}

batchFixUnlockBonus();
