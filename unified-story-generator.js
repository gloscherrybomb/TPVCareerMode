// unified-story-generator-enhanced.js - Context-aware narrative generation
// Generates cohesive 2-3 paragraph stories with race type awareness, GC context, and dynamic race analysis

/**
 * Generate a unified story that flows naturally across 2-3 paragraphs
 * Enhanced with race type awareness and contextual details
 * 
 * Paragraph 1: Personal context/moment leading into race
 * Paragraph 2: Race performance with type-specific details and race dynamics
 * Paragraph 3: Season/GC implications and what's next (conditional)
 */
async function generateUnifiedStory(raceData, seasonData, riderId, narrativeSelector, db, storyGen) {
  const eventName = storyGen.EVENT_NAMES[raceData.eventNumber] || `Event ${raceData.eventNumber}`;
  
  // Get race type and context
  const raceContext = await getRaceContext(raceData.eventNumber, raceData, seasonData, db);
  
  // Build narrative context
  const narrativeContext = {
    eventNumber: raceData.eventNumber,
    eventName: eventName,
    position: raceData.position,
    predictedPosition: raceData.predictedPosition,
    performanceTier: determinePerformanceTier(raceData.position),
    totalPoints: seasonData.totalPoints,
    totalWins: seasonData.totalWins,
    recentResults: seasonData.recentResults || [],
    isFirstWin: raceData.position === 1 && seasonData.totalWins === 1,
    isWorseResult: raceData.position > raceData.predictedPosition + 3,
    raceType: raceContext.raceType
  };

  // Get personalized intro moment from narrative database
  let introMoment = '';
  try {
    introMoment = await narrativeSelector.generateIntroStory(
      riderId,
      narrativeContext,
      db
    );
  } catch (error) {
    console.log(`   ⚠️ No intro moment selected: ${error.message}`);
  }

  // Generate the unified story with race context
  const story = buildUnifiedNarrative({
    introMoment,
    raceData: {
      ...raceData,
      eventName,
      isFirstRace: seasonData.stagesCompleted === 1
    },
    seasonData: {
      ...seasonData,
      nextEventName: storyGen.EVENT_NAMES[seasonData.nextEventNumber] || `Event ${seasonData.nextEventNumber}`
    },
    raceContext
  });

  return story;
}

/**
 * Get race-specific context including type, GC data, and race dynamics
 */
async function getRaceContext(eventNumber, raceData, seasonData, db) {
  // Event type mapping
  const EVENT_TYPES = {
    1: 'criterium', 2: 'road race', 3: 'track elimination', 4: 'time trial',
    5: 'points race', 6: 'hill climb', 7: 'criterium', 8: 'gran fondo',
    9: 'hill climb', 10: 'time trial', 11: 'points race', 12: 'gravel race',
    13: 'stage race', 14: 'stage race', 15: 'stage race'
  };

  const raceType = EVENT_TYPES[eventNumber] || 'road race';
  
  // Stage race specific info
  let stageInfo = null;
  if ([13, 14, 15].includes(eventNumber)) {
    stageInfo = {
      stageNumber: eventNumber === 13 ? 1 : eventNumber === 14 ? 2 : 3,
      isFirstStage: eventNumber === 13,
      isQueenStage: eventNumber === 15,
      totalStages: 3
    };
  }

  // Determine race dynamics from time gaps
  let raceDynamics = 'unknown';
  if (raceData.winMargin !== undefined && raceData.lossMargin !== undefined) {
    raceDynamics = analyzeRaceDynamics(raceData, raceType);
  }

  return {
    raceType,
    stageInfo,
    raceDynamics
  };
}

/**
 * Analyze race dynamics based on time gaps
 */
function analyzeRaceDynamics(raceData, raceType) {
  const { position, winMargin, lossMargin } = raceData;
  
  // Time trials are always solo efforts
  if (raceType === 'time trial') {
    return 'time trial';
  }

  // For winners
  if (position === 1) {
    if (winMargin > 60) return 'solo victory';  // Over 1 minute clear
    if (winMargin > 30) return 'breakaway win';  // 30-60 seconds
    if (winMargin > 5) return 'small group';     // 5-30 seconds
    return 'bunch sprint';                        // < 5 seconds
  }

  // For non-winners
  if (lossMargin < 5) return 'bunch sprint';
  if (lossMargin < 30) return 'small group';
  if (lossMargin < 60) return 'breakaway';
  return 'chasing group';
}

/**
 * Determine performance tier
 */
function determinePerformanceTier(position) {
  if (position === 1) return 'win';
  if (position <= 3) return 'podium';
  if (position <= 10) return 'top10';
  if (position <= 20) return 'midpack';
  return 'back';
}

/**
 * Build unified narrative by merging intro moment with race story
 */
function buildUnifiedNarrative({ introMoment, raceData, seasonData, raceContext }) {
  const {
    eventNumber,
    eventName,
    position,
    predictedPosition,
    winMargin,
    lossMargin,
    earnedDomination,
    earnedCloseCall,
    earnedPhotoFinish,
    earnedDarkHorse,
    winnerName,
    secondPlaceName,
    gcPosition,
    gcGap
  } = raceData;

  const performanceTier = determinePerformanceTier(position);
  const placeDiff = predictedPosition - position;
  
  // PARAGRAPH 1: Intro moment transitioning into race setup
  let paragraph1 = '';
  
  if (introMoment) {
    // Use the narrative moment and bridge into the race
    paragraph1 = introMoment + ' ';
    
    // Add a transition sentence based on performance and race type
    if (raceContext.raceType === 'time trial') {
      if (performanceTier === 'win') {
        paragraph1 += `At ${eventName}, it was time to put that power to the test.`;
      } else {
        paragraph1 += `${eventName} would be the ultimate test of pacing and power.`;
      }
    } else if (raceContext.stageInfo?.isFirstStage) {
      paragraph1 += `Stage 1 of the Local Tour was where the GC battle would begin.`;
    } else if (raceContext.stageInfo?.isQueenStage) {
      paragraph1 += `The queen stage of the Local Tour—this is where the overall would be decided.`;
    } else {
      // Standard transitions based on performance
      if (performanceTier === 'win') {
        paragraph1 += `And at ${eventName}, everything came together.`;
      } else if (performanceTier === 'podium') {
        paragraph1 += `At ${eventName}, it was time to prove it.`;
      } else if (performanceTier === 'back') {
        paragraph1 += `${eventName} would test that resolve in ways you didn't expect.`;
      } else {
        paragraph1 += `${eventName} was the next challenge in this journey.`;
      }
    }
  } else {
    // Fallback: generate contextual opening
    paragraph1 = generateContextualOpening(raceData, seasonData, raceContext);
  }

  // PARAGRAPH 2: Race performance with type-specific context
  let paragraph2 = generateRacePerformance(raceData, raceContext);

  // PARAGRAPH 3: Season/GC context and forward look (conditional)
  let paragraph3 = '';
  if (shouldIncludeSeasonContext(seasonData, raceContext)) {
    paragraph3 = generateSeasonImplications(raceData, seasonData, raceContext);
  }

  // Combine paragraphs
  const paragraphs = [paragraph1, paragraph2];
  if (paragraph3) paragraphs.push(paragraph3);
  
  return paragraphs.join('\n\n');
}

/**
 * Generate contextual opening when no narrative moment exists
 */
function generateContextualOpening(raceData, seasonData, raceContext) {
  const { eventNumber, eventName, position } = raceData;
  const { stagesCompleted } = seasonData;
  const { raceType, stageInfo } = raceContext;
  
  // First race
  if (eventNumber === 1) {
    return `This is it—your first race. ${eventName} marks the beginning of everything you've been working toward. The nerves are real, the competition is fierce, but you're here. You're racing.`;
  }
  
  // Stage race openings
  if (stageInfo?.isFirstStage) {
    return `The Local Tour begins with ${eventName}. Three stages, one overall classification. This first stage sets the tone—not just for your GC position, but for how the next two days will unfold.`;
  }
  
  if (stageInfo?.stageNumber === 2) {
    return `Stage 2 of the Local Tour. Yesterday's result matters, but today's result matters more. The GC is fluid, time gaps can change, and every second counts.`;
  }
  
  if (stageInfo?.isQueenStage) {
    return `The queen stage. The GC will be decided today on the hardest climbs of the Local Tour. Whatever gap you have—defending or attacking—this is where it all comes down to suffering and strength.`;
  }
  
  // Race type specific openings
  if (raceType === 'time trial') {
    return `${eventName}: just you, your bike, and the clock. No tactics, no drafting, no hiding. Pure power and pacing discipline.`;
  }
  
  if (raceType === 'track elimination') {
    return `The Forest Velodrome Elimination—last rider each lap is out. No room for error, no time to rest, just relentless positioning and repeated high-intensity efforts.`;
  }
  
  if (raceType === 'hill climb') {
    return `${eventName} is a simple equation: you versus gravity. The road goes up, and either you have the legs to go fast or you don't.`;
  }
  
  // Default openings by season position
  if (stagesCompleted <= 3) {
    return `Each race teaches you something new. ${eventName} was another lesson in what it takes to compete at this level.`;
  }
  
  if (stagesCompleted >= 10) {
    return `The season is winding down, but the racing intensity hasn't. ${eventName} mattered just as much as the first race—maybe more.`;
  }
  
  return `${eventName} arrived, and you were ready to race.`;
}

/**
 * Generate detailed race performance paragraph with type-specific context
 */
function generateRacePerformance(raceData, raceContext) {
  const {
    eventName,
    position,
    predictedPosition,
    winMargin,
    lossMargin,
    earnedDomination,
    earnedCloseCall,
    earnedPhotoFinish,
    earnedDarkHorse,
    winnerName,
    gcPosition,
    gcGap
  } = raceData;

  const performanceTier = determinePerformanceTier(position);
  const placeDiff = predictedPosition - position;
  const { raceType, stageInfo, raceDynamics } = raceContext;
  
  let performance = '';

  // WINS
  if (performanceTier === 'win') {
    // Time Trial Wins
    if (raceType === 'time trial') {
      if (earnedDarkHorse) {
        performance = `The predictions had you down for ${predictedPosition}th, but predictions don't account for perfect pacing and threshold power sustained for the full duration. You started controlled, built into your rhythm, and held the watts to the finish. When the results came through—first place, clear of the field. This is the kind of solo effort that proves you have the engine.`;
      } else {
        performance = `${eventName} was all about you versus the clock. Twenty minutes of threshold power, perfectly paced from start to finish. No tactics, no draft, just raw FTP laid bare. First place. The numbers don't lie—you had the strongest legs today.`;
      }
    }
    // Track Elimination Wins
    else if (raceType === 'track elimination') {
      performance = `The Forest Velodrome Elimination is brutal—last rider every lap until only one remains. You stayed near the front every single lap, never drifted back, covered every surge. Lap after lap, riders were pulled until finally, it was just you. Winner. The sharpest positioning and the deepest reserves won out.`;
    }
    // Stage Race Wins
    else if (stageInfo) {
      if (earnedDomination) {
        performance = `Stage ${stageInfo.stageNumber} wasn't just a win—it was a statement. You dominated from early on, establishing control and never letting go. First across the line with a significant gap.`;
        if (gcPosition) {
          performance += ` More importantly, you now ${gcPosition === 1 ? 'lead the overall classification' : `sit ${gcPosition}${getOrdinal(gcPosition)} in GC`}${gcGap > 0 ? `, ${formatGapText(gcGap)} behind the leader` : ''}.`;
        } else {
          performance += ` The GC implications are significant—every second gained today matters for the overall.`;
        }
      } else {
        performance = `Stage ${stageInfo.stageNumber} victory! You timed your effort perfectly, had the legs when it mattered, and crossed the line first.`;
        if (gcPosition && gcPosition <= 3) {
          performance += ` Crucially, you're now ${gcPosition === 1 ? 'in the race leader\'s jersey' : `${gcPosition}${getOrdinal(gcPosition)} overall`}${gcGap > 0 ? `, just ${formatGapText(gcGap)} behind the leader` : ''}. The Local Tour is very much on.`;
        } else {
          performance += ` The stage win is yours, and you've strengthened your GC position significantly.`;
        }
      }
    }
    // Standard Race Wins with dynamics
    else {
      if (earnedDarkHorse) {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `Nobody predicted this. Coming into ${eventName}, you were forecasted for ${predictedPosition}th—respectable, but not threatening. ${dynamicsText} First place. Winner. The kind of result that changes how you see yourself as a racer.`;
      } else if (earnedDomination) {
        performance = `${eventName} wasn't just a win—it was a statement. You went clear ${getRaceTypeAction(raceType)} and never looked back. The gap grew steadily until you crossed the line over a minute clear of second place. This wasn't about luck or tactics; this was about having the legs to dominate.`;
      } else if (earnedCloseCall) {
        performance = `${eventName} came down to the absolute wire—a ${raceType === 'criterium' ? 'criterium sprint' : 'bunch sprint'} so close that for a split second, you genuinely didn't know if you'd won. Multiple riders hit the line together, engines redlined, every ounce of power squeezed from exhausted legs. First by less than half a second. Races this close are decided by millimeters. Today, they went your way.`;
      } else if (placeDiff >= 5) {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `The predictions had you down for ${predictedPosition}th at ${eventName}, but those numbers didn't account for the form you brought. ${dynamicsText} First place—better than predicted, better than hoped.`;
      } else {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `${eventName} played out well, and you executed flawlessly. ${dynamicsText} First across the line. This is what consistency and preparation look like.`;
      }
    }
  }
  
  // PODIUMS
  else if (performanceTier === 'podium') {
    if (raceType === 'time trial') {
      performance = `${eventName} demanded perfect pacing and you delivered. ${position === 2 ? 'Second place' : 'Third place'}—just ${formatGapText(lossMargin)} behind the winner. In a time trial, that gap represents pure power difference. You left everything out there.`;
    } else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber} produced a podium finish in ${position === 2 ? 'second' : 'third'} place.`;
      if (gcPosition && gcPosition <= 5) {
        performance += ` On GC, you're now ${gcPosition}${getOrdinal(gcPosition)} overall${gcGap > 0 ? `, ${formatGapText(gcGap)} behind the leader` : ''}. ${stageInfo.stageNumber < 3 ? 'Still everything to race for in the stages ahead.' : 'The overall classification is decided, but this podium finish matters.'}`;
      } else {
        performance += ` The stage result is solid, though the overall GC battle is elsewhere.`;
      }
    } else if (earnedPhotoFinish) {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `${eventName} produced one of those finishes that'll be remembered—a genuine photo finish with multiple riders crossing the line in a desperate, chaotic sprint. ${dynamicsText} ${position === 2 ? 'Second place' : 'Third place'} by centimeters. So close to the win you could taste it, but podium finishes are earned, not given.`;
    } else if (placeDiff >= 5) {
      performance = `Coming into ${eventName}, you were predicted for ${predictedPosition}th, but you had other ideas. Through smart ${getRaceTypeRacing(raceType)}, you worked your way into the sharp end and held your place. ${position === 2 ? 'Second place' : 'Third place'}—a podium finish that exceeded expectations.`;
    } else {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `${eventName} delivered a solid podium finish in ${position === 2 ? 'second' : 'third'} place. ${dynamicsText} Not every podium is dramatic; some are just the product of good racing and consistent effort.`;
    }
  }
  
  // TOP 10
  else if (performanceTier === 'top10') {
    if (raceType === 'time trial') {
      performance = `${eventName} resulted in a ${position}${getOrdinal(position)} place finish. Your power numbers were solid, pacing discipline held, but others simply had more watts today. Still, a top-10 in a time trial means your engine is competitive.`;
    } else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber}: ${position}${getOrdinal(position)} place. A solid result that keeps you in the race.`;
      if (gcPosition) {
        performance += ` You're ${gcPosition}${getOrdinal(gcPosition)} in the overall standings${gcGap > 0 ? `, ${formatGapText(gcGap)} down` : ''}. ${stageInfo.stageNumber < 3 ? 'The GC is still fluid—everything depends on the stages ahead.' : 'The overall is decided, but you finished the tour strong.'}`;
      }
    } else if (placeDiff >= 5) {
      performance = `${eventName} produced a ${position}${getOrdinal(position)} place finish—significantly better than the predicted ${predictedPosition}th. You rode tactically smart, conserved energy when needed, and had enough left to push hard when the race ${getRaceSplitPhrase(raceType)}. Top-10 finishes like this build momentum.`;
    } else {
      performance = `${eventName} resulted in a ${position}${getOrdinal(position)} place finish. You stayed competitive throughout, never got dropped from the main group, and finished roughly where predictions suggested. These solid, consistent results accumulate points and build the foundation for a successful campaign.`;
    }
  }
  
  // MIDPACK
  else if (performanceTier === 'midpack') {
    if (raceType === 'time trial') {
      performance = `${eventName} was a reality check. You paced it as best you could, but the power just wasn't there today. ${position}${getOrdinal(position)} place. Time trials don't lie about fitness—you need more FTP to move up in these events.`;
    } else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber} didn't go to plan—${position}${getOrdinal(position)} place. The race split apart and you found yourself in the second group.`;
      if (gcPosition) {
        performance += ` That puts you ${gcPosition}${getOrdinal(gcPosition)} overall, ${formatGapText(gcGap)} behind. ${stageInfo.stageNumber < 3 ? 'You\'ll need something special in the remaining stages to climb back into contention.' : 'The overall was decided elsewhere, but you finished the tour.'}`;
      }
    } else {
      performance = `${eventName} was tougher than expected, with a ${position}${getOrdinal(position)} place finish. The race ${getRaceSplitPhrase(raceType)} early and you found yourself in the second group, chasing but never quite bridging the gap. Days like this happen—the key is learning from them.`;
    }
  }
  
  // BACK OF PACK
  else {
    if (raceType === 'time trial') {
      performance = `${eventName} was a struggle from start to finish. Pacing felt off, power wasn't there, and the result reflects it: ${position}${getOrdinal(position)} place. Time trials are humbling—they show you exactly where your fitness stands. Back to training.`;
    } else if (raceType === 'track elimination') {
      performance = `The Forest Velodrome Elimination was brutal today. You tried to stay near the front, but positioning mistakes add up quickly. Out with several laps still to go. Track racing demands perfection—you'll learn from this.`;
    } else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber} was one of those days where nothing quite clicked—${position}${getOrdinal(position)} place. Whether it was fatigue from previous stages, bad positioning, or just being off form, the result wasn't what you wanted. The Local Tour is harder than it looks.`;
    } else {
      performance = `${eventName} was one of those days where nothing quite clicked—a ${position}${getOrdinal(position)} place finish that stung more than you expected. Whether it was fatigue, bad positioning, or just being off form, the result wasn't what you wanted. But here's the thing about racing: bad days make you better. You finished the race. That matters.`;
    }
  }

  return performance;
}

/**
 * Get race type specific action phrase
 */
function getRaceTypeAction(raceType) {
  switch (raceType) {
    case 'criterium': return 'in the technical corners';
    case 'hill climb': return 'on the climb';
    case 'points race': return 'in the sprint laps';
    case 'gravel race': return 'on the rough sections';
    case 'gran fondo': return 'on the long climbs';
    default: return 'early in the race';
  }
}

/**
 * Get race type specific racing description
 */
function getRaceTypeRacing(raceType) {
  switch (raceType) {
    case 'criterium': return 'cornering and positioning';
    case 'hill climb': return 'climbing and pacing';
    case 'points race': return 'sprint selection';
    case 'track elimination': return 'positioning and awareness';
    case 'gravel race': return 'bike handling and power';
    default: return 'positioning and tactics';
  }
}

/**
 * Get race split phrase based on type
 */
function getRaceSplitPhrase(raceType) {
  switch (raceType) {
    case 'criterium': return 'picked up speed in the corners';
    case 'hill climb': return 'hit the steep sections';
    case 'points race': return 'surged for the sprint points';
    case 'gravel race': return 'hit the rough gravel';
    default: return 'broke apart';
  }
}

/**
 * Get dynamics-based narrative text
 */
function getDynamicsText(dynamics, isWinner, gapSeconds) {
  const gap = formatGapText(gapSeconds);
  
  switch (dynamics) {
    case 'solo victory':
      return `You went clear early and rode solo to the finish, over a minute clear of the field. Nobody could follow when you attacked.`;
    case 'breakaway win':
      return `You made it into the decisive breakaway and had the strongest legs when it mattered. Crossing the line ${gap} clear of the chasers.`;
    case 'small group':
      if (isWinner) {
        return `It came down to a small group sprint—five or six riders all with a chance. You timed it perfectly and took the victory by ${gap}.`;
      } else {
        return `A small group sprint decided it—five or six riders all with a shot. You were in the mix but came up just short, finishing ${gap} behind the winner.`;
      }
    case 'bunch sprint':
      if (isWinner) {
        return `The full pack came to the line together and you won the chaotic bunch sprint. Positioning, timing, and raw power—all three came together perfectly.`;
      } else {
        return `The full pack came to the line together for a massive bunch sprint. You were well-positioned but couldn't quite match the winner's speed in the final meters.`;
      }
    case 'time trial':
      return `In a time trial, every second is earned through sustained power. Pure FTP, perfectly paced.`;
    case 'breakaway':
      return `The race was decided by a breakaway that went clear early. You were in the chasing group, working hard to limit losses, but the gap held.`;
    case 'chasing group':
      return `The race split apart and you found yourself in the main chasing group, working to limit losses but never quite bringing back the leaders.`;
    default:
      return `The race unfolded in typical fashion—fast, tactical, and decided in the final kilometers.`;
  }
}

/**
 * Format time gap as readable text
 */
function formatGapText(seconds) {
  if (seconds < 1) return 'less than a second';
  if (seconds < 5) return `${Math.round(seconds)} seconds`;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (secs === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get ordinal suffix
 */
function getOrdinal(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Determine if we should include season context paragraph
 */
function shouldIncludeSeasonContext(seasonData, raceContext) {
  const { stagesCompleted } = seasonData;
  
  // Always include for first race
  if (stagesCompleted === 1) return true;
  
  // Always include for stage races (GC context important)
  if (raceContext.stageInfo) return true;
  
  // Include every other race in early season (2-5)
  if (stagesCompleted >= 2 && stagesCompleted <= 5) {
    return stagesCompleted % 2 === 0;
  }
  
  // Include more often in mid-season (6-10)
  if (stagesCompleted >= 6 && stagesCompleted <= 10) {
    return true;
  }
  
  // Always include in late season (11+)
  if (stagesCompleted >= 11) return true;
  
  return false;
}

/**
 * Generate season implications and forward look
 */
function generateSeasonImplications(raceData, seasonData, raceContext) {
  const { eventNumber, position, gcPosition, gcGap } = raceData;
  const {
    stagesCompleted,
    nextEventName,
    nextEventNumber,
    totalPoints,
    isOnStreak,
    recentResults
  } = seasonData;
  
  const { stageInfo } = raceContext;

  let implications = '';
  
  // Final event of season (Event 15 = Stage 9 complete) - Season over
  if (eventNumber === 15 || stagesCompleted >= 9) {
    // Let stage race GC context handle it for Local Tour
    if (stageInfo && stageInfo.stageNumber === 3) {
      // Will be handled below in stage race section
    } else {
      // Season complete - no forward look
      implications = `That's the season complete. Nine stages, countless kilometers, and you've reached the finish. Whatever the final standings show, you showed up and raced. That's what matters.`;
      return implications;
    }
  }
  
  // First race
  if (stagesCompleted === 1) {
    implications = `One race down, many more to go. ${nextEventName} arrives at Stage 2, and the season is just beginning. Every race from here builds on the last—lessons learned, fitness gained, confidence accumulated. The journey is underway.`;
    return implications;
  }

  // Stage Race GC Context
  if (stageInfo) {
    if (stageInfo.stageNumber === 1) {
      if (gcPosition && gcPosition <= 3) {
        implications = `After Stage 1, you're ${gcPosition === 1 ? 'in the leader\'s jersey' : `${gcPosition}${getOrdinal(gcPosition)} overall`}${gcGap > 0 ? `, ${formatGapText(gcGap)} down` : ''}. Two stages remain in the Local Tour. The GC is tight, the racing will be aggressive, and every second counts. Stage 2 comes next—defend or attack, your choice.`;
      } else {
        implications = `Stage 1 complete, but you're ${gcPosition}${getOrdinal(gcPosition)} in GC, ${formatGapText(gcGap)} behind the leader. That's a significant gap to pull back, but two stages remain. Time bonuses for stage placings can change everything. The Local Tour isn't over yet.`;
      }
    } else if (stageInfo.stageNumber === 2) {
      if (gcPosition && gcPosition <= 3) {
        implications = `Two stages down, one to go. You're ${gcPosition === 1 ? 'still leading the tour' : `${gcPosition}${getOrdinal(gcPosition)} overall`}${gcGap > 0 ? `, ${formatGapText(gcGap)} behind` : ''}. Tomorrow's queen stage will decide everything. The hardest climbing of the tour, on the most fatigued legs. This is where the overall is won or lost.`;
      } else {
        implications = `Two stages down, one to go. The overall GC is out of reach—you're ${gcPosition}${getOrdinal(gcPosition)}—but the queen stage tomorrow is still a chance for a strong finish and a stage win. Pride and points are still on the line.`;
      }
    } else {
      // Stage 3 complete - tour finished AND season finished
      if (gcPosition === 1) {
        implications = `Local Tour champion. Three stages, countless attacks defended, and you held the leader's jersey to the finish. This is what multi-day racing demands: consistency, strength, and the ability to suffer efficiently day after day. The overall classification is yours. And with that, the season is complete.`;
      } else if (gcPosition <= 3) {
        implications = `The Local Tour is complete: ${gcPosition}${getOrdinal(gcPosition)} overall, ${formatGapText(gcGap)} behind the winner. A podium finish in a three-day stage race is an achievement—you proved you can handle the demands of multi-day racing, even if the top step eluded you. The season ends here, and you can be proud of what you accomplished.`;
      } else {
        implications = `The Local Tour is finished. ${gcPosition}${getOrdinal(gcPosition)} overall isn't where you hoped to be, but you completed all three stages and learned what multi-day racing demands. The season is over. The experience matters more than the result, and there's always next season to apply what you've learned.`;
      }
      return implications;
    }
    return implications;
  }

  // Build context based on recent form
  const recentGoodResults = recentResults.filter(r => r <= 10).length;
  const onPodiumStreak = recentResults.every(r => r <= 3) && recentResults.length >= 2;
  
  if (onPodiumStreak) {
    implications = `This is the kind of form that wins championships—consistent podium finishes, race after race. `;
  } else if (recentGoodResults >= 2) {
    implications = `The results are trending in the right direction, and momentum is building. `;
  } else if (position >= 20) {
    implications = `Not every result will be great, and that's the reality of racing. `;
  } else {
    implications = `Steady progress through the season, one race at a time. `;
  }

  // Add forward look
  if (stagesCompleted <= 5) {
    implications += `${nextEventName} awaits at Stage ${stagesCompleted + 1}—another opportunity to test your limits and push for better results. The season is young, the points are accumulating, and there's plenty of racing ahead to make your mark.`;
  } else if (stagesCompleted <= 10) {
    implications += `${nextEventName} comes next at Stage ${stagesCompleted + 1}, and you're past the season's halfway point. The standings are taking shape, but there's still time to climb, still chances to prove yourself. Keep racing, keep pushing, keep showing up.`;
  } else {
    implications += `The season is in its final stretch, and ${nextEventName} at Stage ${stagesCompleted + 1} is one of the last opportunities to bank points and chase results. Every race matters now. Every place counts. This is where seasons are defined.`;
  }

  return implications;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateUnifiedStory, determinePerformanceTier };
} else if (typeof window !== 'undefined') {
  window.unifiedStoryGenerator = { generateUnifiedStory, determinePerformanceTier };
}
