const admin = require("firebase-admin");

/**
 * Batch fix to remove time-based awards from elimination race (event 3)
 *
 * In elimination races, times don't reflect racing performance since riders
 * are eliminated at intervals. Time-based awards should not apply:
 * - earnedPhotoFinish
 * - earnedDomination
 * - earnedCloseCall
 *
 * Usage: node batch-fix-elimination-awards.js [--dry-run]
 */

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function batchFixEliminationAwards() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("\n🔧 Batch Fix: Remove Time-Based Awards from Elimination Race (Event 3)\n");
  console.log(`   Dry run: ${dryRun ? "YES (no changes will be made)" : "NO (changes will be applied)"}`);
  console.log("");

  // Get all users
  const usersSnapshot = await db.collection("users").get();

  let processedUsers = 0;
  let updatedUsers = 0;
  let skippedUsers = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const uid = userData.uid || userDoc.id;
    const displayName = userData.displayName || userData.riderName || uid;

    // Check if user has event3Results
    const event3Results = userData.event3Results;
    if (!event3Results) {
      skippedUsers++;
      continue;
    }

    processedUsers++;

    // Check if any time-based awards are set
    const hasPhotoFinish = event3Results.earnedPhotoFinish === true;
    const hasDomination = event3Results.earnedDomination === true;
    const hasCloseCall = event3Results.earnedCloseCall === true;

    if (!hasPhotoFinish && !hasDomination && !hasCloseCall) {
      console.log(`   ⏭️ ${displayName}: No time-based awards to fix`);
      continue;
    }

    const awardsToRemove = [];
    if (hasPhotoFinish) awardsToRemove.push("photoFinish");
    if (hasDomination) awardsToRemove.push("domination");
    if (hasCloseCall) awardsToRemove.push("closeCall");

    console.log(`   🔧 ${displayName}: Removing ${awardsToRemove.join(", ")}`);

    if (!dryRun) {
      const updates = {};

      if (hasPhotoFinish) {
        updates["event3Results.earnedPhotoFinish"] = false;
      }
      if (hasDomination) {
        updates["event3Results.earnedDomination"] = false;
      }
      if (hasCloseCall) {
        updates["event3Results.earnedCloseCall"] = false;
      }

      await userDoc.ref.update(updates);

      // Also update the results summary document if it exists
      const summaryRef = db.collection("results").doc(`season1_event3_${uid}`);
      const summaryDoc = await summaryRef.get();

      if (summaryDoc.exists) {
        const summaryData = summaryDoc.data();
        const results = summaryData.results || [];

        const userResultIndex = results.findIndex(r => r.uid === uid);
        if (userResultIndex >= 0) {
          if (hasPhotoFinish) results[userResultIndex].earnedPhotoFinish = false;
          if (hasDomination) results[userResultIndex].earnedDomination = false;
          if (hasCloseCall) results[userResultIndex].earnedCloseCall = false;

          await summaryRef.update({ results: results });
        }
      }
    }

    updatedUsers++;
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary");
  console.log("=".repeat(50));
  console.log(`   Users with event 3 results: ${processedUsers}`);
  console.log(`   Users updated: ${updatedUsers}`);
  console.log(`   Users skipped (no event 3): ${skippedUsers}`);

  if (dryRun) {
    console.log("\n⚠️ DRY RUN - No changes were made");
    console.log("   Run without --dry-run to apply changes");
  } else {
    console.log("\n✅ Batch fix complete!");
  }
}

batchFixEliminationAwards();
