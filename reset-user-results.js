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

      // Fields to KEEP (core profile info + personality data)
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
        // PRESERVE personality and interview data
        personality: userData.personality || null,
        interviewHistory: userData.interviewHistory || null,
        personalitySnapshots: userData.personalitySnapshots || null,
      };

      // UPDATE the user, deleting and replacing fields
      batch.update(userRef, {
        ...fieldsToKeep,

        // Reset main scoring fields
        currentStage: 0,
        completedStages: [],
        usedOptionalEvents: [],
        // Career statistics (all events including special)
        careerPoints: 0,
        careerEvents: 0,
        careerWins: 0,
        careerPodiums: 0,
        careerTop10s: 0,
        careerBestFinish: null,
        careerAvgFinish: null,
        careerWinRate: 0,
        careerPodiumRate: 0,
        // Season 1 statistics
        season1Events: 0,
        season1Wins: 0,
        season1Podiums: 0,
        season1Top10s: 0,
        season1Points: 0,
        season1BestFinish: null,
        season1AvgFinish: null,
        season1WinRate: 0,
        season1PodiumRate: 0,

        // DELETE old fields (replaced by career*/season1* fields above)
        totalEvents: admin.firestore.FieldValue.delete(),
        totalWins: admin.firestore.FieldValue.delete(),
        totalPodiums: admin.firestore.FieldValue.delete(),
        totalTop10s: admin.firestore.FieldValue.delete(),
        totalPoints: admin.firestore.FieldValue.delete(),
        bestFinish: admin.firestore.FieldValue.delete(),
        averageFinish: admin.firestore.FieldValue.delete(),
        winRate: admin.firestore.FieldValue.delete(),
        podiumRate: admin.firestore.FieldValue.delete(),

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
          seasonThirdPlace: 0,
          // Season special awards
          perfectSeason: 0,
          podiumStreak: 0,
          specialist: 0,
          allRounder: 0,
          comeback: 0,
          gluttonForPunishment: 0,
          // Event-specific awards
          windTunnel: 0,
          theAccountant: 0,
          // Special event awards
          theEqualizer: 0,
          singaporeSling: 0,
          // Power-based awards
          powerSurge: 0,
          steadyEddie: 0,
          blastOff: 0,
          // Career milestone awards
          backToBack: 0,
          weekendWarrior: 0,
          trophyCollector: 0,
          technicalIssues: 0,
          overrated: 0
        },

        // Reset one-time award flags (these prevent re-earning)
        hasEarnedBlastOff: false,

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

        // Special event results (101 = Singapore Criterium, 102 = The Leveller)
        event101Results: admin.firestore.FieldValue.delete(),
        event102Results: admin.firestore.FieldValue.delete(),

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
        personalityAwards: admin.firestore.FieldValue.delete(),

        // Cadence Credits currency - calculate spent from inventory + slots
        // Balance starts negative to account for purchases, CC earned during re-processing will add to it
        currency: (() => {
          // Item costs lookup
          const ITEM_COSTS = {
            paceNotes: 100, teamCarRecon: 120, sprintPrimer: 120,
            aeroWheels: 200, cadenceNutrition: 200, soigneurSession: 200,
            preRaceMassage: 300, windTunnel: 300, altitudeAcclim: 300,
            signatureMove: 500, contractBonus: 500, fanFavorite: 500,
            climbingGears: 300, aggroRaceKit: 300, tightPackWin: 300,
            domestiqueHelp: 400, recoveryBoots: 400, rivalSlayer: 400,
            mentalCoach: 250, aggressionKit: 250, tacticalRadio: 250, professionalAttitude: 250,
            confidenceBooster: 350, aggressorHelmet: 350, teamLeaderJersey: 350, calmAnalyst: 350,
            humbleChampion: 350, showmanGear: 350, comebackKing: 350, balancedApproach: 500
          };

          // Calculate spent on inventory items
          const inventory = userData.unlocks?.inventory || [];
          const itemSpent = inventory.reduce((sum, itemId) => sum + (ITEM_COSTS[itemId] || 0), 0);

          // Calculate spent on extra slots (slot 2 = 400, slot 3 = 1200)
          const slotCount = userData.unlocks?.slotCount || 1;
          let slotSpent = 0;
          if (slotCount >= 2) slotSpent += 400;
          if (slotCount >= 3) slotSpent += 1200;

          const totalSpent = itemSpent + slotSpent;
          console.log(`   User ${userData.name}: inventory spent=${itemSpent}, slots spent=${slotSpent}, total=${totalSpent}`);

          return {
            balance: -totalSpent,  // Negative balance, will be offset by CC earned during re-processing
            totalEarned: 0,
            transactions: []
          };
        })(),

        // Cadence Credits unlocks - PRESERVE all shop state
        unlocks: {
          inventory: userData.unlocks?.inventory || [],  // Keep purchased items
          equipped: userData.unlocks?.equipped || [],    // Keep equipped items
          slotCount: userData.unlocks?.slotCount || 1,   // Keep purchased slots
          cooldowns: {}   // Clear cooldowns on reset (no races completed yet)
        }

        // NOTE: personality and interviewHistory are PRESERVED
        // NOTE: interviews collection documents are PRESERVED
        // NOTE: Purchased shop items (unlocks) are PRESERVED
      });
    }

    // Commit all user updates
    await batch.commit();
    console.log("✅ All user documents reset successfully!");

    // NOTE: Interview documents are PRESERVED - users won't need to re-answer questions
    console.log('✅ Interview documents preserved - users can continue from existing personality profiles');

    // Delete all results collection documents (race results with bot times)
    console.log('Deleting results collection...');
    const resultsSnapshot = await db.collection('results').get();
    console.log(`Found ${resultsSnapshot.size} results documents`);

    if (!resultsSnapshot.empty) {
      // Firestore batch has a limit of 500 operations, so we need to batch in chunks
      const BATCH_SIZE = 500;
      let deletedCount = 0;

      for (let i = 0; i < resultsSnapshot.docs.length; i += BATCH_SIZE) {
        const chunk = resultsSnapshot.docs.slice(i, i + BATCH_SIZE);
        const resultsBatch = db.batch();
        chunk.forEach(doc => {
          resultsBatch.delete(doc.ref);
        });
        await resultsBatch.commit();
        deletedCount += chunk.length;
        console.log(`   Deleted ${deletedCount}/${resultsSnapshot.size} results documents...`);
      }
      console.log(`✅ Results collection cleared: ${deletedCount} documents deleted`);
    } else {
      console.log('No results documents found');
    }

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
