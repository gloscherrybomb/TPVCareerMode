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

/**
 * Extract unlock history from all users
 *
 * This script extracts which unlocks were applied to which events for all users.
 * The output can be used to re-apply unlocks after resetting and reprocessing results.
 *
 * Usage: node extract-unlock-history.js [outputFile] [userUid]
 *
 * Arguments:
 *   outputFile - Optional: Output JSON file path (default: unlock-history.json)
 *   userUid    - Optional: Extract only for a specific user UID
 *
 * Examples:
 *   node extract-unlock-history.js                           # Extract all users
 *   node extract-unlock-history.js unlock-history.json       # Specify output file
 *   node extract-unlock-history.js unlock-history.json ABC123 # Specific user
 */
async function extractUnlockHistory() {
  const args = process.argv.slice(2);
  const outputFile = args[0] || "unlock-history.json";
  const specificUserUid = args[1] || null;

  console.log("\n📋 Extracting unlock history...\n");

  if (specificUserUid) {
    console.log(`   Filtering for user: ${specificUserUid}`);
  }

  try {
    // Query users
    let query = db.collection("users");

    if (specificUserUid) {
      // Try to find by uid field
      query = query.where("uid", "==", specificUserUid);
    }

    const usersSnapshot = await query.get();

    if (usersSnapshot.empty) {
      console.log("❌ No users found");
      process.exit(1);
    }

    console.log(`   Found ${usersSnapshot.size} user(s)\n`);

    const unlockHistory = {
      extractedAt: new Date().toISOString(),
      totalUsers: 0,
      totalUnlockApplications: 0,
      users: {}
    };

    let usersWithUnlocks = 0;
    let totalApplications = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userUid = userData.uid || userDoc.id;
      const userName = userData.name || "Unknown";

      const userUnlocks = {
        name: userName,
        events: {}
      };

      let hasUnlocks = false;

      // Check each event (1-15) for unlock applications
      for (let eventNum = 1; eventNum <= 15; eventNum++) {
        const eventResults = userData[`event${eventNum}Results`];

        if (eventResults && eventResults.unlockBonusesApplied && eventResults.unlockBonusesApplied.length > 0) {
          hasUnlocks = true;

          userUnlocks.events[eventNum] = {
            position: eventResults.position,
            unlocks: eventResults.unlockBonusesApplied.map(unlock => ({
              id: unlock.id,
              name: unlock.name,
              pointsAdded: unlock.pointsAdded,
              reason: unlock.reason || "Unknown"
            }))
          };

          totalApplications += eventResults.unlockBonusesApplied.length;
        }
      }

      if (hasUnlocks) {
        unlockHistory.users[userUid] = userUnlocks;
        usersWithUnlocks++;

        // Log user's unlock summary
        const eventCount = Object.keys(userUnlocks.events).length;
        console.log(`   ✓ ${userName} (${userUid}): ${eventCount} event(s) with unlocks`);

        for (const [eventNum, eventData] of Object.entries(userUnlocks.events)) {
          const unlockNames = eventData.unlocks.map(u => u.id).join(", ");
          console.log(`     Event ${eventNum}: ${unlockNames}`);
        }
      }
    }

    unlockHistory.totalUsers = usersWithUnlocks;
    unlockHistory.totalUnlockApplications = totalApplications;

    // Write to file
    fs.writeFileSync(outputFile, JSON.stringify(unlockHistory, null, 2));

    console.log(`\n✅ Extraction complete!`);
    console.log(`   Users with unlocks: ${usersWithUnlocks}`);
    console.log(`   Total unlock applications: ${totalApplications}`);
    console.log(`   Output file: ${outputFile}`);

  } catch (error) {
    console.error("❌ Error extracting unlock history:", error);
    process.exit(1);
  }
}

extractUnlockHistory();
