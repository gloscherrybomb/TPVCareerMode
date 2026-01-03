// recalculate-personality.js - Recalculate personality from stored interview data
// This script rebuilds personality progression for all users from their interview history

const admin = require("firebase-admin");

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Get default personality values
 */
function getDefaultPersonality() {
  return {
    confidence: 50,
    humility: 50,
    aggression: 50,
    professionalism: 50,
    showmanship: 50,
    resilience: 50,
    lastUpdated: new Date()
  };
}

/**
 * Calculate scaled delta with diminishing returns at high values
 */
function getScaledDelta(currentValue, baseDelta) {
  // No scaling for negative deltas (penalties apply fully)
  if (baseDelta < 0) {
    return baseDelta;
  }

  // Diminishing returns at high values
  if (currentValue >= 80) {
    return Math.round(baseDelta * 0.5); // 50% effectiveness above 80
  }
  if (currentValue >= 70) {
    return Math.round(baseDelta * 0.75); // 75% effectiveness 70-79
  }

  // Full effect below 70
  return baseDelta;
}

/**
 * Apply personality changes from interview response with diminishing returns
 */
function applyPersonalityChanges(currentPersonality, personalityDelta) {
  const updated = { ...currentPersonality };

  Object.entries(personalityDelta).forEach(([trait, change]) => {
    if (trait === 'lastUpdated') return;

    const currentValue = currentPersonality[trait] || 50;

    // Apply diminishing returns scaling
    const scaledChange = getScaledDelta(currentValue, change);
    let newValue = currentValue + scaledChange;

    // Clamp between 0-100
    newValue = Math.max(0, Math.min(100, newValue));

    updated[trait] = newValue;
  });

  updated.lastUpdated = new Date();

  return updated;
}

/**
 * Recalculate personality for a single user from their interviews
 * Also updates the personalityAfter field in each interview document
 */
async function recalculateUserPersonality(userId) {
  // Query all interviews for this user
  // We'll sort by completion timestamp to ensure personality is recalculated in correct order
  // Note: We fetch all and sort in-memory to avoid needing a compound index
  const interviewsSnapshot = await db.collection('interviews')
    .where('userId', '==', userId)
    .get();

  if (interviewsSnapshot.empty) {
    console.log(`   No interviews found for user ${userId}`);
    return null;
  }

  // Sort by timestamp ascending (oldest first) for chronological processing
  const sortedDocs = interviewsSnapshot.docs.sort((a, b) => {
    const aTime = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
    const bTime = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
    return aTime - bTime; // Ascending
  });

  // Start with default personality
  let personality = getDefaultPersonality();
  let interviewCount = 0;
  let lastEventNumber = null;
  const interviewUpdates = [];

  // Apply each interview's personality delta in order
  for (const doc of sortedDocs) {
    const interview = doc.data();

    if (interview.personalityDelta) {
      // Store personality before this interview
      const personalityBefore = { ...personality };

      // Apply the delta
      personality = applyPersonalityChanges(personality, interview.personalityDelta);
      interviewCount++;
      lastEventNumber = interview.eventNumber;

      console.log(`   Event ${interview.eventNumber}: Applied delta, personality now:`,
        `C:${Math.round(personality.confidence)} H:${Math.round(personality.humility)} ` +
        `A:${Math.round(personality.aggression)} P:${Math.round(personality.professionalism)} ` +
        `S:${Math.round(personality.showmanship)} R:${Math.round(personality.resilience)}`);

      // Queue update for this interview document
      interviewUpdates.push({
        ref: doc.ref,
        eventNumber: interview.eventNumber,
        personalityBefore: personalityBefore,
        personalityAfter: { ...personality }
      });
    }
  }

  // Update all interview documents with corrected personalityBefore and personalityAfter
  console.log(`   Updating ${interviewUpdates.length} interview documents...`);
  for (const update of interviewUpdates) {
    await update.ref.update({
      personalityBefore: update.personalityBefore,
      personalityAfter: update.personalityAfter
    });
    console.log(`   ✓ Updated interview for event ${update.eventNumber}`);
  }

  return {
    personality,
    interviewCount,
    lastEventNumber
  };
}

/**
 * Main function to recalculate personality for all users
 */
async function recalculateAllPersonalities() {
  try {
    console.log('Starting personality recalculation...\n');

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log("No users found.");
      return;
    }

    let usersProcessed = 0;
    let usersUpdated = 0;
    let usersSkipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userData.uid;

      if (!userId) {
        console.log(`Skipping user ${userDoc.id}: No UID field`);
        usersSkipped++;
        continue;
      }

      console.log(`\nProcessing user: ${userData.name || userId}`);

      // Recalculate personality from interviews
      const result = await recalculateUserPersonality(userId);

      if (result && result.interviewCount > 0) {
        // Update user document with recalculated personality
        const userRef = db.collection('users').doc(userDoc.id);

        console.log(`   Updating document ID: ${userDoc.id}`);
        console.log(`   New personality values:`, JSON.stringify(result.personality));

        await userRef.update({
          personality: result.personality,
          'interviewHistory.totalInterviews': result.interviewCount,
          'interviewHistory.lastInterviewEventNumber': result.lastEventNumber,
          'interviewHistory.lastInterviewTimestamp': admin.firestore.FieldValue.serverTimestamp()
        });

        // Verify the update by reading back
        const verifyDoc = await userRef.get();
        const verifyData = verifyDoc.data();
        console.log(`   ✅ VERIFIED - Personality in Firestore:`, JSON.stringify(verifyData.personality));

        // Check if values match
        const mismatch = Object.keys(result.personality).some(key => {
          if (key === 'lastUpdated') return false;
          return Math.round(result.personality[key]) !== Math.round(verifyData.personality[key] || 0);
        });

        if (mismatch) {
          console.log(`   ⚠️ WARNING: Personality values don't match after update!`);
          console.log(`   Expected:`, JSON.stringify(result.personality));
          console.log(`   Got:`, JSON.stringify(verifyData.personality));
        }

        usersUpdated++;
      } else {
        console.log(`   ⏭️ Skipped (no interviews)`);
        usersSkipped++;
      }

      usersProcessed++;
    }

    console.log('\n========================================');
    console.log('Personality Recalculation Complete');
    console.log('========================================');
    console.log(`Total users processed: ${usersProcessed}`);
    console.log(`Users updated: ${usersUpdated}`);
    console.log(`Users skipped: ${usersSkipped}`);

  } catch (error) {
    console.error("Error recalculating personalities:", error);
    throw error;
  }
}

// Run the recalculation
recalculateAllPersonalities();
