// debug-unlock-issue.js
// Diagnostic script to investigate Sprint Primer unlock issue
// Usage: node debug-unlock-issue.js <user-uid>

const admin = require('firebase-admin');
const { UNLOCK_DEFINITIONS, getUnlockById } = require('./unlock-config');

// Initialize Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not set');
  console.log('   Set it with: $env:FIREBASE_SERVICE_ACCOUNT = Get-Content firebase-key.json -Raw');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function investigateUnlockIssue(userUid) {
  console.log('\n🔍 UNLOCK ISSUE INVESTIGATION');
  console.log('='.repeat(60));

  // Find user by UID
  let userQuery;
  if (userUid) {
    userQuery = await db.collection('users').where('uid', '==', userUid).limit(1).get();
  } else {
    // Default: find the user from the Unbound race (Ludvig Karlberg)
    userQuery = await db.collection('users').where('uid', '==', 'DE77F095D134721E').limit(1).get();
  }

  if (userQuery.empty) {
    console.error(`❌ User not found with UID: ${userUid || 'DE77F095D134721E'}`);
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();

  console.log(`\n👤 USER: ${userData.name || 'Unknown'}`);
  console.log(`   UID: ${userData.uid}`);
  console.log(`   Current Stage: ${userData.currentStage || 1}`);

  // Check unlock configuration
  console.log('\n📦 UNLOCK CONFIGURATION:');
  const unlocks = userData.unlocks || {};
  const equipped = unlocks.equipped || [];
  const slotCount = unlocks.slotCount || 1;
  const cooldowns = unlocks.cooldowns || {};
  const owned = unlocks.owned || [];

  console.log(`   Slot Count: ${slotCount}`);
  console.log(`   Equipped (all): ${JSON.stringify(equipped)}`);
  console.log(`   Equipped (active - first ${slotCount}): ${JSON.stringify(equipped.slice(0, slotCount))}`);
  console.log(`   Owned: ${JSON.stringify(owned)}`);
  console.log(`   Current Cooldowns: ${JSON.stringify(cooldowns)}`);

  // Check if sprintPrimer is equipped and in active slot
  const sprintPrimerIndex = equipped.indexOf('sprintPrimer');
  const isSprintPrimerEquipped = sprintPrimerIndex !== -1;
  const isSprintPrimerActive = sprintPrimerIndex !== -1 && sprintPrimerIndex < slotCount;
  const isSprintPrimerOnCooldown = cooldowns['sprintPrimer'] === true;

  console.log('\n💨 SPRINT PRIMER STATUS:');
  console.log(`   Owned: ${owned.includes('sprintPrimer')}`);
  console.log(`   Equipped: ${isSprintPrimerEquipped} (at index ${sprintPrimerIndex})`);
  console.log(`   In Active Slot: ${isSprintPrimerActive} (slot ${sprintPrimerIndex + 1} of ${slotCount})`);
  console.log(`   Currently On Cooldown: ${isSprintPrimerOnCooldown}`);

  // Check Event 12 (Unbound) results
  console.log('\n🏁 EVENT 12 (UNBOUND) RESULTS:');
  const event12Results = userData.event12Results;
  if (event12Results) {
    console.log(`   Position: ${event12Results.position}`);
    console.log(`   Points: ${event12Results.points}`);
    console.log(`   Bonus Points: ${event12Results.bonusPoints || 0}`);
    console.log(`   Unlock Bonus Points: ${event12Results.unlockBonusPoints || 0}`);
    console.log(`   Unlocks Applied: ${JSON.stringify(event12Results.unlockBonusesApplied || [])}`);
    console.log(`   Predicted Position: ${event12Results.predictedPosition || 'N/A'}`);

    // Calculate what prediction bonus would be
    if (event12Results.predictedPosition && event12Results.position) {
      const placesBeaten = event12Results.predictedPosition - event12Results.position;
      let expectedPredictionBonus = 0;
      if (placesBeaten >= 9) expectedPredictionBonus = 5;
      else if (placesBeaten >= 7) expectedPredictionBonus = 4;
      else if (placesBeaten >= 5) expectedPredictionBonus = 3;
      else if (placesBeaten >= 3) expectedPredictionBonus = 2;
      else if (placesBeaten >= 1) expectedPredictionBonus = 1;

      console.log(`   Places Beaten vs Prediction: ${placesBeaten}`);
      console.log(`   Expected Prediction Bonus: +${expectedPredictionBonus}`);
    }
  } else {
    console.log('   ❌ No Event 12 results found');
  }

  // Check previous events for cooldown context
  console.log('\n📜 RECENT EVENT HISTORY (checking for cooldown source):');
  const eventNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const completedEvents = [];

  for (const eventNum of eventNumbers) {
    const eventResults = userData[`event${eventNum}Results`];
    if (eventResults && eventResults.position) {
      completedEvents.push({
        eventNum,
        position: eventResults.position,
        unlockBonusPoints: eventResults.unlockBonusPoints || 0,
        unlockBonusesApplied: eventResults.unlockBonusesApplied || [],
        raceDate: eventResults.raceDate || eventResults.processedAt
      });
    }
  }

  // Sort by date if available
  completedEvents.sort((a, b) => {
    if (!a.raceDate || !b.raceDate) return a.eventNum - b.eventNum;
    return new Date(a.raceDate) - new Date(b.raceDate);
  });

  completedEvents.forEach((event, idx) => {
    const unlockNames = event.unlockBonusesApplied.map(u => u.name || u.id).join(', ') || 'None';
    const hadSprintPrimer = event.unlockBonusesApplied.some(u => u.id === 'sprintPrimer');
    console.log(`   ${idx + 1}. Event ${event.eventNum}: P${event.position}, Unlock Bonus: +${event.unlockBonusPoints} [${unlockNames}]${hadSprintPrimer ? ' ⚠️ SPRINT PRIMER USED' : ''}`);
  });

  // Find the event before Event 12
  const event12Index = completedEvents.findIndex(e => e.eventNum === 12);
  if (event12Index > 0) {
    const previousEvent = completedEvents[event12Index - 1];
    const usedSprintPrimerPreviously = previousEvent.unlockBonusesApplied.some(u => u.id === 'sprintPrimer');

    console.log('\n⚠️ EVENT BEFORE UNBOUND:');
    console.log(`   Event ${previousEvent.eventNum}: Position ${previousEvent.position}`);
    console.log(`   Unlocks Applied: ${JSON.stringify(previousEvent.unlockBonusesApplied)}`);
    console.log(`   Sprint Primer Used: ${usedSprintPrimerPreviously}`);

    if (usedSprintPrimerPreviously) {
      console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
      console.log('   Sprint Primer was triggered in the previous event!');
      console.log('   It was on COOLDOWN during Unbound, so it could not trigger.');
    }
  }

  // Diagnosis summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY:');

  const issues = [];

  if (!owned.includes('sprintPrimer')) {
    issues.push('Sprint Primer is not owned');
  }
  if (!isSprintPrimerEquipped) {
    issues.push('Sprint Primer is not equipped');
  }
  if (isSprintPrimerEquipped && !isSprintPrimerActive) {
    issues.push(`Sprint Primer is in slot ${sprintPrimerIndex + 1} but user only has ${slotCount} active slot(s)`);
  }
  if (isSprintPrimerOnCooldown) {
    issues.push('Sprint Primer is currently on cooldown (triggered in previous race)');
  }

  // Check if it should have triggered for Event 12
  if (event12Results && event12Results.position <= 8) {
    console.log(`   ✓ Position ${event12Results.position} qualifies for Sprint Primer (top 8)`);
  }

  if (issues.length === 0) {
    console.log('   ✓ No obvious issues found - Sprint Primer should have triggered');
    console.log('   🔍 Further investigation needed - check processing logs');
  } else {
    console.log('   Issues found:');
    issues.forEach(issue => console.log(`   ❌ ${issue}`));
  }

  // Show what the expected points should have been
  if (event12Results) {
    const sprintPrimerDef = getUnlockById('sprintPrimer');
    const expectedUnlockBonus = sprintPrimerDef ? sprintPrimerDef.pointsBonus : 4;
    const actualUnlockBonus = event12Results.unlockBonusPoints || 0;

    console.log('\n💰 POINTS BREAKDOWN:');
    console.log(`   Total Points Earned: ${event12Results.points}`);
    console.log(`   Bonus Points (includes prediction + unlock): ${event12Results.bonusPoints || 0}`);
    console.log(`   Unlock Bonus Actually Applied: +${actualUnlockBonus}`);
    console.log(`   Expected from Sprint Primer: +${expectedUnlockBonus}`);
    console.log(`   Difference: ${expectedUnlockBonus - actualUnlockBonus} points`);
  }

  console.log('\n');
  process.exit(0);
}

// Get user UID from command line or use default
const userUid = process.argv[2] || null;
investigateUnlockIssue(userUid).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
