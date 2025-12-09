// reset-user-results.js - Clear all user results data, keeping only core profile info

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function resetUserResults() {
  console.log('🔄 Starting user results reset...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    console.log(`Found ${totalUsers} users to reset\n`);
    
    let processed = 0;
    const batch = db.batch();
    
    for (const userDoc of usersSnapshot.docs) {
      const userRef = db.collection('users').doc(userDoc.id);
      const userData = userDoc.data();
      
      console.log(`Resetting user: ${userData.name || userDoc.id}`);
      
      // Fields to KEEP (core profile info)
      const fieldsToKeep = {
        name: userData.name || '',
        email: userData.email || '',
        uid: userData.uid || userDoc.id,
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        team: userData.team || '',
        gender: userData.gender || null,
        country: userData.country || null,
        ageBand: userData.ageBand || null,
        photoURL: userData.photoURL || null,
        arr: userData.arr || null
      };
      
      // Clear all other fields (results, points, standings, etc)
      batch.set(userRef, {
        ...fieldsToKeep,
        // Reset all results fields
        currentStage: 0,
        completedStages: [],
        totalPoints: 0,
        totalEvents: 0,
        totalWins: 0,
        totalPodiums: 0,
        careerWins: 0,
        careerPodiums: 0,
        // Clear all event results (events 1-15)
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
        // Clear DNS flags
        event14DNS: admin.firestore.FieldValue.delete(),
        event15DNS: admin.firestore.FieldValue.delete(),
        event14DNSReason: admin.firestore.FieldValue.delete(),
        event15DNSReason: admin.firestore.FieldValue.delete(),
        // Clear season data
        season1Standings: [],
        season1Complete: false,
        season1Rank: null,
        season1CompletionDate: admin.firestore.FieldValue.delete(),
        currentSeason: 1,
        // Clear tour progress
        tourProgress: admin.firestore.FieldValue.delete(),
        localTourStatus: admin.firestore.FieldValue.delete(),
        usedOptionalEvents: [],
        // Clear rival tracking data
        rivalData: admin.firestore.FieldValue.delete(),
        // Clear awards
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
          seasonChampion: 0,
          seasonRunnerUp: 0,
          seasonThirdPlace: 0
        }
      });
      
      processed++;
      
      // Commit batch every 500 operations (Firestore limit)
      if (processed % 500 === 0) {
        await batch.commit();
        console.log(`  ✓ Committed batch (${processed}/${totalUsers})`);
      }
    }
    
    // Commit any remaining operations
    if (processed % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n✅ Successfully reset ${processed} users`);
    console.log('Users retain: uid, name, email, photoURL, team, arr, gender, country, ageBand');
    console.log('Cleared: all results, points, awards, standings, season data, rival data\n');
    
  } catch (error) {
    console.error('❌ Error resetting users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  resetUserResults()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { resetUserResults };
