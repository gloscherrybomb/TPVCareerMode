const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { UNLOCK_DEFINITIONS } = require('./unlock-config');

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

    // Collect ALL completed events from database (not just those in unlock history)
    // This ensures we properly track cooldown cycles even for events where no unlock triggered
    const eventsToProcess = [];
    for (let i = 1; i <= 15; i++) {
      const eventResults = userData[`event${i}Results`];
      if (eventResults) {
        // Use user's processedAt timestamp or stageNumber for correct chronological order
        // This is more accurate than CSV file timestamps which may reflect other users' completions
        const userTimestamp = eventResults.processedAt ? new Date(eventResults.processedAt).getTime() : 0;
        const stageNumber = eventResults.stageNumber || 0;
        const unlockHistoryData = userUnlocks.events[i.toString()] || null;

        eventsToProcess.push({
          eventNumber: i,
          eventData: unlockHistoryData, // May be null if no unlocks triggered for this event
          userTimestamp,
          stageNumber
        });
      }
    }

    // Also check special events (101, 102, etc.)
    const specialEventIds = [101, 102];
    for (const eventNum of specialEventIds) {
      const eventResults = userData[`event${eventNum}Results`];
      if (eventResults) {
        // Use user's processedAt timestamp for correct chronological order
        const userTimestamp = eventResults.processedAt ? new Date(eventResults.processedAt).getTime() : 0;
        const stageNumber = eventResults.stageNumber || 0;
        const unlockHistoryData = userUnlocks.events[eventNum.toString()] || null;

        eventsToProcess.push({
          eventNumber: eventNum,
          eventData: unlockHistoryData,
          userTimestamp,
          stageNumber,
          isSpecialEvent: true
        });
      }
    }

    // Sort by stageNumber (most reliable) or processedAt timestamp (chronological order - oldest first)
    eventsToProcess.sort((a, b) => {
      // Prefer stageNumber if both have it
      if (a.stageNumber && b.stageNumber) {
        return a.stageNumber - b.stageNumber;
      }
      // Fall back to processedAt timestamp
      return a.userTimestamp - b.userTimestamp;
    });

    const eventsWithUnlocks = eventsToProcess.filter(e => e.eventData !== null).length;
    console.log(`   Processing ${eventsToProcess.length} completed events (${eventsWithUnlocks} with unlock history) in chronological order:`);
    eventsToProcess.forEach((evt, idx) => {
      const date = evt.userTimestamp ? new Date(evt.userTimestamp).toISOString() : 'no timestamp';
      const stageInfo = evt.stageNumber ? `Stage ${evt.stageNumber}` : 'no stage';
      console.log(`     ${idx + 1}. Event ${evt.eventNumber} (${stageInfo}, ${date})`);
    });

    // Track cooldowns as we process events in order
    let activeCooldowns = {};
    let skippedDueToCooldown = 0;

    for (const { eventNumber, eventData, stageNumber } of eventsToProcess) {
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

      // If no unlock history for this event, just clear cooldowns and continue
      // This advances the cooldown cycle - unlocks that were resting are now available
      if (!eventData || !eventData.unlocks || eventData.unlocks.length === 0) {
        console.log(`   ⏭️ Event ${eventNumber}: No unlock history, clearing cooldowns`);
        activeCooldowns = {};
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
        // Calculate new total points from all events (including special events) for career
        let totalPointsFromEvents = 0;
        const allEventIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 101, 102];
        for (const i of allEventIds) {
          const evtResults = userData[`event${i}Results`];
          if (evtResults && typeof evtResults.points === "number") {
            if (i === eventNumber) {
              totalPointsFromEvents += newPoints;
            } else {
              totalPointsFromEvents += evtResults.points;
            }
          }
        }

        // Calculate season 1 points separately (only events 1-15, not special events)
        let season1PointsTotal = 0;
        for (let i = 1; i <= 15; i++) {
          const evtResults = userData[`event${i}Results`];
          if (evtResults && typeof evtResults.points === "number") {
            if (i === eventNumber) {
              season1PointsTotal += newPoints;
            } else {
              season1PointsTotal += evtResults.points;
            }
          }
        }

        // Update season standings
        const season1Standings = userData.season1Standings || [];
        const userStandingIndex = season1Standings.findIndex(s => s.uid === userUid);
        if (userStandingIndex >= 0) {
          season1Standings[userStandingIndex].points = season1PointsTotal;
        }
        season1Standings.sort((a, b) => (b.points || 0) - (a.points || 0));

        // Update user document
        const userUpdates = {
          [`event${eventNumber}Results.points`]: newPoints,
          [`event${eventNumber}Results.bonusPoints`]: newBonusPoints,
          [`event${eventNumber}Results.unlockBonusPoints`]: totalUnlockBonus,
          [`event${eventNumber}Results.unlockBonusesApplied`]: unlockBonusesApplied,
          totalPoints: totalPointsFromEvents,  // DEPRECATED: Kept for backwards compatibility
          careerPoints: totalPointsFromEvents,
          season1Points: season1PointsTotal,
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
    // Use stageNumber or processedAt for accurate chronological ordering per user
    // IMPORTANT: Look at ALL completed events, not just those with unlocks
    // If the most recent event had no unlocks applied (e.g., all were on cooldown), cooldowns should be clear
    if (!dryRun) {
      // Re-fetch latest user data
      const latestUserDoc = await userRef.get();
      const latestUserData = latestUserDoc.data();

      // Find ALL completed events and their timestamps (including special events)
      const allCompletedEvents = [];
      const allEventIdsForCooldown = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 101, 102];
      for (const i of allEventIdsForCooldown) {
        const evtResults = latestUserData[`event${i}Results`];
        if (evtResults) {
          // Use user's stageNumber or processedAt for chronological ordering
          const stageNumber = evtResults.stageNumber || 0;
          const userTimestamp = evtResults.processedAt ? new Date(evtResults.processedAt).getTime() : 0;
          const unlockIds = (evtResults.unlockBonusesApplied || []).map(u => u.id);
          allCompletedEvents.push({
            eventNumber: i,
            stageNumber: stageNumber,
            timestamp: userTimestamp,
            unlockIds: unlockIds
          });
        }
      }

      if (allCompletedEvents.length > 0) {
        // Sort by stageNumber (most reliable) or processedAt timestamp descending to find most recent
        allCompletedEvents.sort((a, b) => {
          // Prefer stageNumber if both have it
          if (a.stageNumber && b.stageNumber) {
            return b.stageNumber - a.stageNumber;
          }
          // Fall back to processedAt timestamp
          return b.timestamp - a.timestamp;
        });
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
        const stageInfo = mostRecentEvent.stageNumber ? `Stage ${mostRecentEvent.stageNumber}` : '';
        console.log(`   🔄 Set cooldowns from most recent event ${mostRecentEvent.eventNumber} (${stageInfo}): ${cooldownUnlocks}`);
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
