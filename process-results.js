/**
 * Process a single result for a user
 */
async function processUserResult(uid, eventInfo, results) {
  const { season, event: eventNumber } = eventInfo;

  const FLEX_EVENTS = [6, 7, 8, 9, 10, 11, 12];

  // Helper: get Date from stored event results (Firestore Timestamp or Date)
  const getEventDate = (userData, eventNum) => {
    const res = userData[`event${eventNum}Results`];
    if (!res || !res.processedAt) return null;
    const ts = res.processedAt;
    return typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  };

  // Helper: is this event allowed at the user's current stage?
  const isEventAllowedForStage = (stage, eventNumber, completedStages, userData) => {
    switch (stage) {
      case 1:
        // (Assuming) stage 1 = event 1
        return eventNumber === 1;

      case 2:
        // (Assuming) stage 2 = event 2
        return eventNumber === 2;

      case 3:
        // Stage 3: any of events 6–12
        return FLEX_EVENTS.includes(eventNumber);

      case 4:
        // Stage 4 has to be event 3
        return eventNumber === 3;

      case 5:
        // Stage 5 has to be event 4
        return eventNumber === 4;

      case 6:
        // Stage 6: any of 6–12 that they haven't already done
        return FLEX_EVENTS.includes(eventNumber) && !completedStages.includes(eventNumber);

      case 7:
        // Stage 7 has to be event 5
        return eventNumber === 5;

      case 8:
        // Stage 8: any remaining 6–12 that they haven't already done
        return FLEX_EVENTS.includes(eventNumber) && !completedStages.includes(eventNumber);

      case 9: {
        // Stage 9: Local Tour events 13,14,15 in order
        const has13 = completedStages.includes(13);
        const has14 = completedStages.includes(14);
        const has15 = completedStages.includes(15);

        // Must do 13 → 14 → 15 in that order
        if (!has13) {
          return eventNumber === 13;
        }
        if (has13 && !has14) {
          return eventNumber === 14;
        }
        if (has13 && has14 && !has15) {
          return eventNumber === 15;
        }
        // All done, no more Local Tour events
        return false;
      }

      default:
        // No further stages defined yet
        return false;
    }
  };

  // Helper: compute next stage after successfully processing this event
  const getNextStage = (currentStage, eventNumber, completedStages) => {
    switch (currentStage) {
      case 1:
        // Stage 1 -> event 1 -> stage 2
        return 2;

      case 2:
        // Stage 2 -> event 2 -> stage 3
        return 3;

      case 3:
        // Any of 6–12 moves you to stage 4
        if (FLEX_EVENTS.includes(eventNumber)) return 4;
        return currentStage;

      case 4:
        // Stage 4 -> event 3 -> stage 5
        if (eventNumber === 3) return 5;
        return currentStage;

      case 5:
        // Stage 5 -> event 4 -> stage 6
        if (eventNumber === 4) return 6;
        return currentStage;

      case 6:
        // Stage 6 -> any new 6–12 -> stage 7
        if (FLEX_EVENTS.includes(eventNumber)) return 7;
        return currentStage;

      case 7:
        // Stage 7 -> event 5 -> stage 8
        if (eventNumber === 5) return 8;
        return currentStage;

      case 8:
        // Stage 8 -> any remaining 6–12 -> stage 9
        if (FLEX_EVENTS.includes(eventNumber)) return 9;
        return currentStage;

      case 9: {
        // Stage 9: Local Tour; stay in stage 9 until 13,14,15 all done.
        const has13 = completedStages.includes(13) || eventNumber === 13;
        const has14 = completedStages.includes(14) || eventNumber === 14;
        const has15 = completedStages.includes(15) || eventNumber === 15;

        if (has13 && has14 && has15 && eventNumber === 15) {
          // Finished the tour – move to stage 10 (or whatever "next" is)
          return 10;
        }
        // Still in the Local Tour phase
        return 9;
      }

      default:
        return currentStage;
    }
  };

  // Query for user by uid field (not document ID)
  const usersQuery = await db.collection('users')
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (usersQuery.empty) {
    console.log(`❌ User with uid ${uid} not found in database`);
    console.log(`   Make sure the user has signed up on the website and their uid field is set`);
    return;
  }

  // Get the user document
  const userDoc = usersQuery.docs[0];
  const userRef = userDoc.ref;
  const userData = userDoc.data();

  console.log(`   Found user: ${userData.name || uid} (Document ID: ${userDoc.id})`);

  const currentStage = userData.currentStage || 1;
  const completedStages = userData.completedStages || [];

  // First, basic stage/event validity
  if (!isEventAllowedForStage(currentStage, eventNumber, completedStages, userData)) {
    console.log(
      `Event ${eventNumber} is not valid for user ${uid} at stage ${currentStage}, skipping`
    );
    return;
  }

  // Extra rule: for stage 9 (Local Tour), enforce 3 consecutive days for 13→14→15
  if (currentStage === 9 && [13, 14, 15].includes(eventNumber)) {
    const now = new Date();

    if (eventNumber === 14) {
      const d13 = getEventDate(userData, 13);
      if (!d13) {
        console.log(`Cannot process event 14 for ${uid} – event 13 not recorded`);
        return;
      }
      const diffDays = Math.floor((now - d13) / (1000 * 60 * 60 * 24));
      if (diffDays !== 1) {
        console.log(`Event 14 for ${uid} is not on the day after event 13, skipping`);
        return;
      }
    }

    if (eventNumber === 15) {
      const d14 = getEventDate(userData, 14);
      if (!d14) {
        console.log(`Cannot process event 15 for ${uid} – event 14 not recorded`);
        return;
      }
      const diffDays = Math.floor((now - d14) / (1000 * 60 * 60 * 24));
      if (diffDays !== 1) {
        console.log(`Event 15 for ${uid} is not on the day after event 14, skipping`);
        return;
      }
    }
  }

  // Find user's result in CSV (first occurrence only)
  const userResult = results.find(r => r.UID === uid);
  if (!userResult) {
    console.log(`User ${uid} not found in results, skipping`);
    return;
  }

  // Check if already processed (if event results exist and position matches)
  const existingResults = userData[`event${eventNumber}Results`];
  if (existingResults && existingResults.position === parseInt(userResult.Position)) {
    console.log(`Event ${eventNumber} already processed for user ${uid}, skipping`);
    return;
  }

  const position = parseInt(userResult.Position);
  if (isNaN(position) || userResult.Position === 'DNF') {
    console.log(`User ${uid} has DNF or invalid position, awarding 0 points`);
    // Store DNF result but don't award points
    await userRef.update({
      [`event${eventNumber}Results`]: {
        position: 'DNF',
        time: parseFloat(userResult.Time) || 0,
        arr: parseInt(userResult.ARR) || 0,
        points: 0,
        distance: parseFloat(userResult.Distance) || 0,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      team: userResult.Team || '' // Update team even on DNF
    });
    return;
  }

  // Calculate predicted position based on EventRating
  const predictedPosition = calculatePredictedPosition(results, uid);

  // Calculate points (including bonus points)
  const pointsResult = calculatePoints(position, eventNumber, predictedPosition);
  const { points, bonusPoints } = pointsResult;

  // Check if earned punching medal (beat prediction by 10+ places)
  let earnedPunchingMedal = false;
  if (predictedPosition) {
    const placesBeaten = predictedPosition - position;
    earnedPunchingMedal = placesBeaten >= 10;
  }

  // Check if earned Giant Killer medal (beat highest-rated rider)
  const earnedGiantKillerMedal = checkGiantKiller(results, uid);

  // Prepare event results
  const eventResults = {
    position: position,
    time: parseFloat(userResult.Time) || 0,
    arr: parseInt(userResult.ARR) || 0,
    arrBand: userResult.ARRBand || '',
    eventRating: parseInt(userResult.EventRating) || null,
    predictedPosition: predictedPosition,
    points: points,
    bonusPoints: bonusPoints,
    earnedPunchingMedal: earnedPunchingMedal,
    earnedGiantKillerMedal: earnedGiantKillerMedal,
    distance: parseFloat(userResult.Distance) || 0,
    deltaTime: parseFloat(userResult.DeltaTime) || 0,
    eventPoints: parseInt(userResult.Points) || null, // Points race points (for display only)
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Build season standings with all racers from CSV
  const seasonStandings = await buildSeasonStandings(results, userData, eventNumber, uid);

  // Calculate the user's new total points (includes bonus points)
  const newTotalPoints = (userData.totalPoints || 0) + points;

  // IMPORTANT: Update the user's entry in standings to use their actual total points
  const userStandingIndex = seasonStandings.findIndex(s => s.uid === uid);
  if (userStandingIndex !== -1) {
    seasonStandings[userStandingIndex].points = newTotalPoints;
    console.log(`   Updated user standing with correct total points: ${newTotalPoints} (includes all bonuses)`);
  }

  // Re-sort standings after updating user's points
  seasonStandings.sort((a, b) => b.points - a.points);

  // Compute next stage using the helper
  const nextStage = getNextStage(currentStage, eventNumber, completedStages);

  // Update user document
  const updates = {
    [`event${eventNumber}Results`]: eventResults,
    currentStage: nextStage,
    totalPoints: newTotalPoints,
    totalEvents: (userData.totalEvents || 0) + 1,
    [`season${season}Standings`]: seasonStandings,
    team: userResult.Team || '' // Update team from latest race result
  };

  // Add to completedStages if not already there
  if (!completedStages.includes(eventNumber)) {
    updates.completedStages = admin.firestore.FieldValue.arrayUnion(eventNumber);
  }

  await userRef.update(updates);

  const bonusLog = bonusPoints > 0 ? ` (including +${bonusPoints} bonus)` : '';
  const predictionLog = predictedPosition ? ` | Predicted: ${predictedPosition}` : '';
  const punchingLog = earnedPunchingMedal ? ' 🥊 PUNCHING MEDAL!' : '';
  const giantKillerLog = earnedGiantKillerMedal ? ' ⚔️ GIANT KILLER!' : '';
  console.log(
    `✅ Processed event ${eventNumber} for user ${uid}: ` +
    `Position ${position}${predictionLog}, Points ${points}${bonusLog}${punchingLog}${giantKillerLog}`
  );

  // Update results summary collection
  await updateResultsSummary(season, eventNumber, results);
}
