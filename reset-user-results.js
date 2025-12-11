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
        usedOptionalEvents: [],
        totalPoints: 0,
        totalEvents: 0,
        totalWins: 0,
        totalPodiums: 0,
        totalTop10s: 0,
        bestFinish: null,
        averageFinish: null,
        winRate: 0,
        podiumRate: 0,
        careerWins: 0,
        careerPodiums: 0,

        // Reset awards
        awards: {
          gold: 0,
          silver: 0,
          bronze: 0,
          punchingMedal: 0,
          giantKiller: 0,
          bullseye: 0,
          hotStreak: 0,
          domination: 0,
          closeCall: 0,
          photoFinish: 0,
          darkHorse: 0,
          zeroToHero: 0,
          gcGold: 0,
          gcSilver: 0,
          gcBronze: 0,
          lanternRouge: 0,
          seasonChampion: 0,
          seasonRunnerUp: 0,
          seasonThirdPlace: 0
        },

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
        season1CelebrationViewed: false,
        localTourStatus: admin.firestore.FieldValue.delete(),
        localTourGCPosition: admin.firestore.FieldValue.delete(),
        currentSeason: 1,

        // Tour progress
        tourProgress: admin.firestore.FieldValue.delete(),

        // Rivals
        rivals: admin.firestore.FieldValue.delete(),
        rivalWins: admin.firestore.FieldValue.delete(),
        rivalLosses: admin.firestore.FieldValue.delete(),
        rivalData: admin.firestore.FieldValue.delete(),

        // Lifetime stats (reset for palmares)
        lifetimeStats: admin.firestore.FieldValue.delete(),
        personalityHistory: admin.firestore.FieldValue.delete(),

        // Personality awards (reset these too)
        personalityAwards: admin.firestore.FieldValue.delete()

        // NOTE: personality and interviewHistory are PRESERVED
        // NOTE: interviews collection documents are PRESERVED
      });
    }

    // Commit all user updates
    await batch.commit();
    console.log("✅ All user documents reset successfully!");

    // NOTE: Interview documents are PRESERVED - users won't need to re-answer questions
    console.log('✅ Interview documents preserved - users can continue from existing personality profiles');

    // Delete narrative history for all riders
    console.log('Deleting narrative history...');
    const ridersSnapshot = await db.collection('riders').get();
    console.log(`Found ${ridersSnapshot.size} rider documents`);

    let totalNarrativesDeleted = 0;
    let ridersWithNarratives = 0;

    if (!ridersSnapshot.empty) {
      for (const riderDoc of ridersSnapshot.docs) {
        try {
          const narrativeHistorySnapshot = await riderDoc.ref.collection('narrative_history').get();
          const narrativeCount = narrativeHistorySnapshot.size;

          if (!narrativeHistorySnapshot.empty) {
            console.log(`  Rider ${riderDoc.id}: Found ${narrativeCount} narrative history documents`);
            ridersWithNarratives++;

            const narrativeBatch = db.batch();
            narrativeHistorySnapshot.docs.forEach(doc => {
              narrativeBatch.delete(doc.ref);
            });
            await narrativeBatch.commit();
            totalNarrativesDeleted += narrativeCount;
            console.log(`  ✅ Deleted ${narrativeCount} narratives for rider ${riderDoc.id}`);
          }
        } catch (error) {
          console.error(`  ❌ Error deleting narratives for rider ${riderDoc.id}:`, error);
        }
      }
      console.log(`✅ Narrative history cleared: ${totalNarrativesDeleted} documents deleted from ${ridersWithNarratives} riders`);
    } else {
      console.log('No rider documents found');
    }

    console.log("✅ Complete reset finished successfully!");

  } catch (error) {
    console.error("❌ Error resetting users:", error);
    throw error;
  }
}

resetUserResults();
