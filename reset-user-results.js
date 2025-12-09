const admin = require("firebase-admin");

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// MAIN FUNCTION
async function resetUserResults() {
  try {
    console.log('Fetching all users...');

    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log("❌ No users found.");
      return;
    }

    const batch = db.batch();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      console.log(`Resetting user: ${userData.name || userDoc.id}`);

      const userRef = db.collection('users').doc(userDoc.id);

      // Fields to KEEP (core profile info)
      const fieldsToKeep = {
        name: userData.name || "",
        email: userData.email || "",
        uid: userData.uid || userDoc.id,
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        team: userData.team || "",
        gender: userData.gender || null,
        country: userData.country || null,
        ageBand: userData.ageBand || null,
        photoURL: userData.photoURL || null,
        arr: userData.arr || null,
      };

      // UPDATE the user, deleting and replacing fields
      batch.update(userRef, {
        ...fieldsToKeep,

        // Reset main scoring fields
        currentStage: 0,
        completedStages: [],
        totalPoints: 0,
        totalEvents: 0,
        totalWins: 0,
        totalPodiums: 0,
        careerWins: 0,
        careerPodiums: 0,

        // Delete all event result blocks (1–15)
        event1Results: admin.firestore.FieldValue.delete(),
        event2Results: admin.firestore.FieldValue.delete(),
        event3Results: admin.firestore.FieldValue.delete(),
        event4Results: admin.firestore.FieldValue.delete(),
        event5Results: admin.firestore.FieldValue.delete(),
        event6Results: admin.firestore.FieldValue.delete(),
        event7Results: admin.firestore.FieldValue.delete(),
        event8Results: admin.firestore.FieldValue.delete(),
        event9Results: admin.firestore.FieldValue.delete(),
        event10Results: admin.firestore.FieldValue.delete(),
        event11Results: admin.firestore.FieldValue.delete(),
        event12Results: admin.firestore.FieldValue.delete(),
        event13Results: admin.firestore.FieldValue.delete(),
        event14Results: admin.firestore.FieldValue.delete(),
        event15Results: admin.firestore.FieldValue.delete(),

        // DNS flags
        event14DNS: admin.firestore.FieldValue.delete(),
        event15DNS: admin.firestore.FieldValue.delete(),
        event14DNSReason: admin.firestore.FieldValue.delete(),
        event15DNSReason: admin.firestore.FieldValue.delete(),

        // Season data
        season1Standings: [],
        season1Complete: false,
        season1Rank: null,
        season1CompletionDate: admin.firestore.FieldValue.delete(),
        currentSeason: 1,

        // Tour progress
        tourProgress: admin.firestore.FieldValue.delete(),

        // Rivals
        rivals: admin.firestore.FieldValue.delete(),
        rivalWins: admin.firestore.FieldValue.delete(),
        rivalLosses: admin.firestore.FieldValue.delete()
      });
    }

    // Commit all updates
    await batch.commit();
    console.log("✅ All users reset successfully!");

  } catch (error) {
    console.error("❌ Error resetting users:", error);
    throw error;
  }
}

resetUserResults();
