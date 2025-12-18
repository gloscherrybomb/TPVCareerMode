const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

/**
 * Extract timestamp from CSV filename
 * Pattern: _YYYYMMDD_HHMMSS.csv
 * Returns timestamp in milliseconds, or 0 if not found
 */
function extractTimestampFromFilename(filePath) {
  const match = filePath.match(/_(\d{8})_(\d{6})\.csv$/);
  if (!match) {
    return 0;
  }

  const dateStr = match[1]; // YYYYMMDD
  const timeStr = match[2]; // HHMMSS

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = timeStr.substring(0, 2);
  const minute = timeStr.substring(2, 4);
  const second = timeStr.substring(4, 6);

  const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  return new Date(isoString).getTime();
}

/**
 * Find CSV file for a given season/event and return its timestamp
 * Looks in race_results/season_X/event_Y/ directory
 */
function getEventCsvTimestamp(season, eventNumber) {
  const eventDir = path.join('race_results', `season_${season}`, `event_${eventNumber}`);

  if (!fs.existsSync(eventDir)) {
    return 0;
  }

  // Find CSV files in the directory
  const files = fs.readdirSync(eventDir).filter(f => f.endsWith('.csv'));

  if (files.length === 0) {
    return 0;
  }

  // Get the most recent CSV file by timestamp in filename
  let latestTimestamp = 0;
  for (const file of files) {
    const timestamp = extractTimestampFromFilename(file);
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
    }
  }

  // If no timestamp in filename, use file modification time
  if (latestTimestamp === 0) {
    for (const file of files) {
      try {
        const stats = fs.statSync(path.join(eventDir, file));
        if (stats.mtime.getTime() > latestTimestamp) {
          latestTimestamp = stats.mtime.getTime();
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  return latestTimestamp;
}

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

    // Collect all events with their CSV timestamps for chronological sorting
    const eventsToProcess = [];
    for (const [eventNumStr, eventData] of Object.entries(userUnlocks.events)) {
      const eventNumber = parseInt(eventNumStr);
      const csvTimestamp = getEventCsvTimestamp(1, eventNumber); // Season 1

      eventsToProcess.push({
        eventNumber,
        eventData,
        csvTimestamp
      });
    }

    // Sort by CSV timestamp (chronological order - oldest first)
    eventsToProcess.sort((a, b) => a.csvTimestamp - b.csvTimestamp);

    console.log(`   Processing ${eventsToProcess.length} events in chronological order:`);
    eventsToProcess.forEach((evt, idx) => {
      const date = evt.csvTimestamp ? new Date(evt.csvTimestamp).toISOString() : 'no timestamp';
      console.log(`     ${idx + 1}. Event ${evt.eventNumber} (${date})`);
    });

    // Track cooldowns as we process events in order
    let activeCooldowns = {};
    let skippedDueToCooldown = 0;

    for (const { eventNumber, eventData, csvTimestamp } of eventsToProcess) {
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

        // Still track these unlocks for cooldown (they were applied previously)
        if (eventResults.unlockBonusesApplied) {
          activeCooldowns = {}; // Clear previous cooldowns
          for (const unlock of eventResults.unlockBonusesApplied) {
            activeCooldowns[unlock.id] = true;
          }
        }
        continue;
      }

      // Calculate total unlock bonus, respecting cooldowns
      let totalUnlockBonus = 0;
      const unlockBonusesApplied = [];
      const skippedUnlocks = [];

      for (const unlock of eventData.unlocks) {
        // Check if this unlock is on cooldown
        if (activeCooldowns[unlock.id]) {
          skippedUnlocks.push(unlock.id);
          skippedDueToCooldown++;
          continue;
        }

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

      // Log skipped unlocks due to cooldown
      if (skippedUnlocks.length > 0) {
        console.log(`   ⏸️ Event ${eventNumber}: Skipped ${skippedUnlocks.join(', ')} (on cooldown)`);
      }

      // Update cooldowns for next event - only the unlocks we just applied
      activeCooldowns = {};
      for (const unlock of unlockBonusesApplied) {
        activeCooldowns[unlock.id] = true;
      }

      // Skip if no unlocks to apply (all were on cooldown)
      if (unlockBonusesApplied.length === 0) {
        console.log(`   ⚠️ Event ${eventNumber}: No unlocks to apply (all on cooldown)`);
        skippedEvents++;
        continue;
      }

      const newPoints = eventResults.points + totalUnlockBonus;
      const newBonusPoints = (eventResults.bonusPoints || 0) + totalUnlockBonus;

      const unlockNames = unlockBonusesApplied.map(u => u.id).join(", ");
      console.log(`   ✅ Event ${eventNumber}: +${totalUnlockBonus} pts (${unlockNames})`);

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

    if (skippedDueToCooldown > 0) {
      console.log(`   📊 Skipped ${skippedDueToCooldown} unlock(s) due to cooldown violations`);
    }

    // After processing all events for this user, update cooldowns based on most recent event
    // Use CSV timestamps for accurate chronological ordering
    // IMPORTANT: Look at ALL completed events, not just those with unlocks
    // If the most recent event had no unlocks applied (e.g., all were on cooldown), cooldowns should be clear
    if (!dryRun) {
      // Re-fetch latest user data
      const latestUserDoc = await userRef.get();
      const latestUserData = latestUserDoc.data();

      // Find ALL completed events and their CSV timestamps
      const allCompletedEvents = [];
      for (let i = 1; i <= 15; i++) {
        const evtResults = latestUserData[`event${i}Results`];
        if (evtResults) {
          // Use CSV timestamp for chronological ordering
          const csvTimestamp = getEventCsvTimestamp(1, i);
          const unlockIds = (evtResults.unlockBonusesApplied || []).map(u => u.id);
          allCompletedEvents.push({
            eventNumber: i,
            timestamp: csvTimestamp,
            unlockIds: unlockIds
          });
        }
      }

      if (allCompletedEvents.length > 0) {
        // Sort by CSV timestamp descending to find most recent
        allCompletedEvents.sort((a, b) => b.timestamp - a.timestamp);
        const mostRecentEvent = allCompletedEvents[0];

        // Set cooldowns for unlocks applied to the most recent event
        // If no unlocks were applied (all on cooldown), this will be empty - unlocks are now available
        const newCooldowns = {};
        for (const unlockId of mostRecentEvent.unlockIds) {
          newCooldowns[unlockId] = true;
        }

        // Update user's cooldowns
        await userRef.update({
          'unlocks.cooldowns': newCooldowns
        });

        const cooldownUnlocks = mostRecentEvent.unlockIds.length > 0
          ? mostRecentEvent.unlockIds.join(', ')
          : 'none (unlocks available)';
        console.log(`   🔄 Set cooldowns from most recent event ${mostRecentEvent.eventNumber}: ${cooldownUnlocks}`);
      } else {
        // No completed events - clear cooldowns
        await userRef.update({
          'unlocks.cooldowns': {}
        });
        console.log(`   🔄 No completed events found, cleared cooldowns`);
      }
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
