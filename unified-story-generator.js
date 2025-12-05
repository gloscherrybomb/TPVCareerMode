// unified-story-generator.js - Generates cohesive 2-3 paragraph stories
// Merges narrative intro, race performance, and season context into flowing narrative

/**
 * Generate a unified story that flows naturally across 2-3 paragraphs
 * Paragraph 1: Personal context/moment leading into race
 * Paragraph 2: Race performance and immediate aftermath
 * Paragraph 3: Season implications and what's next (optional - for mid/late season)
 */
async function generateUnifiedStory(raceData, seasonData, riderId, narrativeSelector, db, storyGen) {
  const eventName = storyGen.EVENT_NAMES[raceData.eventNumber] || `Event ${raceData.eventNumber}`;
  
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
    isWorseResult: raceData.position > raceData.predictedPosition + 3
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

  // Generate the unified story
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
    }
  });

  return story;
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
function buildUnifiedNarrative({ introMoment, raceData, seasonData }) {
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
    earnedDarkHorse
  } = raceData;

  const performanceTier = determinePerformanceTier(position);
  const placeDiff = predictedPosition - position;
  
  // PARAGRAPH 1: Intro moment transitioning into race setup
  let paragraph1 = '';
  
  if (introMoment) {
    // Use the narrative moment and bridge into the race
    paragraph1 = introMoment + ' ';
    
    // Add a transition sentence based on performance
    if (performanceTier === 'win') {
      paragraph1 += `And at ${eventName}, everything came together.`;
    } else if (performanceTier === 'podium') {
      paragraph1 += `At ${eventName}, it was time to prove it.`;
    } else if (performanceTier === 'back') {
      paragraph1 += `${eventName} would test that resolve in ways you didn't expect.`;
    } else {
      paragraph1 += `${eventName} was the next challenge in this journey.`;
    }
  } else {
    // Fallback: generate contextual opening
    paragraph1 = generateContextualOpening(raceData, seasonData);
  }

  // PARAGRAPH 2: Race performance - detailed and specific
  let paragraph2 = generateRacePerformance(raceData);

  // PARAGRAPH 3: Season context and forward look (conditional - not for every race)
  let paragraph3 = '';
  if (shouldIncludeSeasonContext(seasonData)) {
    paragraph3 = generateSeasonImplications(raceData, seasonData);
  }

  // Combine paragraphs
  const paragraphs = [paragraph1, paragraph2];
  if (paragraph3) paragraphs.push(paragraph3);
  
  return paragraphs.join('\n\n');
}

/**
 * Generate contextual opening when no narrative moment exists
 */
function generateContextualOpening(raceData, seasonData) {
  const { eventNumber, eventName, position } = raceData;
  const { stagesCompleted } = seasonData;
  
  if (eventNumber === 1) {
    return `This is it—your first race. ${eventName} marks the beginning of everything you've been working toward. The nerves are real, the competition is fierce, but you're here. You're racing.`;
  }
  
  if (stagesCompleted <= 3) {
    return `Each race teaches you something new. ${eventName} was another lesson in what it takes to compete at this level.`;
  }
  
  if (stagesCompleted >= 10) {
    return `The season is winding down, but the racing intensity hasn't. ${eventName} mattered just as much as the first race—maybe more.`;
  }
  
  return `${eventName} arrived, and you were ready to race.`;
}

/**
 * Generate detailed race performance paragraph
 */
function generateRacePerformance(raceData) {
  const {
    eventName,
    position,
    predictedPosition,
    earnedDomination,
    earnedCloseCall,
    earnedPhotoFinish,
    earnedDarkHorse
  } = raceData;

  const performanceTier = determinePerformanceTier(position);
  const placeDiff = predictedPosition - position;
  
  let performance = '';

  // WINS
  if (performanceTier === 'win') {
    if (earnedDarkHorse) {
      performance = `Nobody predicted this. Coming into ${eventName}, you were forecasted for ${predictedPosition}th—respectable, but not threatening. But from the opening moments, something felt different. Your legs had that rare, perfect feeling where every pedal stroke translates to speed. When the race split apart, you were there. When attacks came, you covered them. And when it came down to the finale, you had more left than anyone else. First place. Winner. The kind of result that changes how you see yourself as a racer.`;
    } else if (earnedDomination) {
      performance = `${eventName} wasn't just a win—it was a statement. From early in the race, you established control and never let go. The gap grew steadily, relentlessly, until you crossed the line over a minute clear of second place. This wasn't about luck or tactics; this was about having the legs to dominate and the confidence to execute. Some wins are hard-fought battles. This one was a clinic.`;
    } else if (earnedCloseCall) {
      performance = `${eventName} came down to the absolute wire—a sprint finish so close that for a split second, you genuinely didn't know if you'd won. Multiple riders hit the line together, engines redlined, every ounce of power squeezed from exhausted legs. When the official results came through showing you in first by less than half a second, the relief and elation hit simultaneously. Races this close are decided by millimeters and milliseconds. Today, they went your way.`;
    } else if (placeDiff >= 5) {
      performance = `The predictions had you down for ${predictedPosition}th at ${eventName}, but those numbers didn't account for the form you brought to the line. From the gun, you rode smart and aggressive, positioning perfectly and capitalizing on every opportunity. By the time the finish approached, you'd opened a gap that held to the line. First place—better than predicted, better than hoped. This is what good form and smart racing produces.`;
    } else {
      performance = `${eventName} played out almost exactly as anticipated, and you executed flawlessly. The predictions suggested you had a shot at the win, and you delivered with control and precision. From start to finish, you raced with the confidence of someone who knew they belonged at the front. When the decisive moment came, you were ready, and you took it. This is what consistency and preparation look like—turning potential into results.`;
    }
  }
  
  // PODIUMS
  else if (performanceTier === 'podium') {
    if (earnedPhotoFinish) {
      performance = `${eventName} produced one of those finishes that'll be remembered—a genuine photo finish with multiple riders crossing the line in a desperate, chaotic sprint. You threw everything into that final push, bike swaying, lungs burning, vision narrowing to just the line ahead. ${position === 2 ? 'Second place' : 'Third place'} by centimeters. So close to the win you could taste it, but podium finishes are earned, not given. You raced hard, you suffered well, and you earned your place.`;
    } else if (placeDiff >= 5) {
      performance = `Coming into ${eventName}, you were predicted for ${predictedPosition}th, but you had other ideas. Through smart positioning and strong legs, you worked your way into the sharp end of the race and held your place through the finale. ${position === 2 ? 'Second place' : 'Third place'}—a podium finish that exceeded expectations and showed you're capable of more than the numbers suggest. These are the results that build momentum.`;
    } else {
      performance = `${eventName} delivered a solid podium finish in ${position === 2 ? 'second' : 'third'} place. You raced intelligently throughout, stayed near the front when it mattered, and had the legs to finish strong. Not every podium is dramatic; some are just the product of good racing and consistent effort. This was one of those—professional, controlled, and exactly the kind of result you need to build a successful season.`;
    }
  }
  
  // TOP 10
  else if (performanceTier === 'top10') {
    if (placeDiff >= 5) {
      performance = `${eventName} produced a ${position}th place finish—significantly better than the predicted ${predictedPosition}th. You rode a tactically smart race, conserved energy when needed, and had enough left to push hard when the race broke apart. Top-10 finishes like this, especially when beating predictions, are the foundation of a strong season. Not flashy, but valuable.`;
    } else {
      performance = `${eventName} resulted in a ${position}th place finish. You stayed competitive throughout, never got dropped from the main group, and finished roughly where predictions suggested. These solid, consistent results might not make headlines, but they accumulate points and build the foundation for a successful campaign.`;
    }
  }
  
  // MIDPACK
  else if (performanceTier === 'midpack') {
    performance = `${eventName} was tougher than expected, with a ${position}th place finish. The race split early and you found yourself in the second group, chasing but never quite bridging the gap. Days like this happen to everyone—the key is learning from them, identifying where things went wrong, and coming back stronger. Not every result will be spectacular, but every race teaches you something.`;
  }
  
  // BACK OF PACK
  else {
    performance = `${eventName} was one of those days where nothing quite clicked—a ${position}th place finish that stung more than you expected. Whether it was fatigue, bad positioning, or just being off form, the result wasn't what you wanted. But here's the thing about racing: bad days make you better. They show you where you need to improve, teach you humility, and make the good days feel that much sweeter. You finished the race. That matters. Tomorrow you'll be stronger.`;
  }

  return performance;
}

/**
 * Determine if we should include season context paragraph
 */
function shouldIncludeSeasonContext(seasonData) {
  const { stagesCompleted } = seasonData;
  
  // Always include for first race
  if (stagesCompleted === 1) return true;
  
  // Include every other race in early season (2-5)
  if (stagesCompleted >= 2 && stagesCompleted <= 5) {
    return stagesCompleted % 2 === 0; // Even numbered stages
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
function generateSeasonImplications(raceData, seasonData) {
  const { position } = raceData;
  const {
    stagesCompleted,
    nextEventName,
    nextEventNumber,
    totalPoints,
    isOnStreak,
    recentResults
  } = seasonData;

  let implications = '';
  
  // First race
  if (stagesCompleted === 1) {
    implications = `One race down, many more to go. ${nextEventName} arrives at Stage ${nextEventNumber}, and the season is just beginning. Every race from here builds on the last—lessons learned, fitness gained, confidence accumulated. The journey is underway.`;
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
    implications += `${nextEventName} awaits at Stage ${nextEventNumber}—another opportunity to test your limits and push for better results. The season is young, the points are accumulating, and there's plenty of racing ahead to make your mark.`;
  } else if (stagesCompleted <= 10) {
    implications += `${nextEventName} comes next at Stage ${nextEventNumber}, and you're past the season's halfway point. The standings are taking shape, but there's still time to climb, still chances to prove yourself. Keep racing, keep pushing, keep showing up.`;
  } else {
    implications += `The season is in its final stretch, and ${nextEventName} at Stage ${nextEventNumber} is one of the last opportunities to bank points and chase results. Every race matters now. Every place counts. This is where seasons are defined.`;
  }

  return implications;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateUnifiedStory, determinePerformanceTier };
} else if (typeof window !== 'undefined') {
  window.unifiedStoryGenerator = { generateUnifiedStory, determinePerformanceTier };
}
