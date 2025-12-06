// unified-story-generator-enhanced.js - Context-aware narrative generation
// Generates cohesive 2-3 paragraph stories with race type awareness, GC context, and dynamic race analysis
// IMPROVED VERSION with better race type handling, winner names, time gaps, and stage race context

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
    raceContext,
    narrativeSelector  // Pass narrativeSelector to access the database
  });

  return story;
}

/**
 * Get race-specific context including type, GC data, and race dynamics
 */
async function getRaceContext(eventNumber, raceData, seasonData, db) {
  // Event type mapping - EXPANDED with more specific types
  const EVENT_TYPES = {
    1: 'criterium', 
    2: 'road race', 
    3: 'track elimination', 
    4: 'time trial',
    5: 'points race', 
    6: 'hill climb', 
    7: 'criterium', 
    8: 'gran fondo',
    9: 'hill climb', 
    10: 'time trial', 
    11: 'points race', 
    12: 'gravel race',
    13: 'stage race', 
    14: 'stage race', 
    15: 'stage race'
  };

  const raceType = EVENT_TYPES[eventNumber] || 'road race';
  
  // Stage race specific info
  let stageInfo = null;
  if ([13, 14, 15].includes(eventNumber)) {
    stageInfo = {
      stageNumber: eventNumber === 13 ? 1 : eventNumber === 14 ? 2 : 3,
      isFirstStage: eventNumber === 13,
      isMiddleStage: eventNumber === 14,
      isQueenStage: eventNumber === 15,
      isFinalStage: eventNumber === 15,
      totalStages: 3
    };
  }

  // Determine race dynamics from time gaps - IMPROVED
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
 * Analyze race dynamics based on time gaps - IMPROVED with better thresholds
 */
function analyzeRaceDynamics(raceData, raceType) {
  const { position, winMargin, lossMargin } = raceData;
  
  // Time trials and hill climbs are always solo efforts
  if (raceType === 'time trial' || raceType === 'hill climb') {
    return 'time trial';
  }

  // Track elimination is different format
  if (raceType === 'track elimination') {
    return 'elimination';
  }

  // For winners - analyze how they won
  if (position === 1) {
    if (winMargin > 60) return 'solo victory';      // Over 1 minute clear - dominant solo
    if (winMargin > 30) return 'breakaway win';     // 30-60 seconds - successful break
    if (winMargin > 5) return 'small group sprint'; // 5-30 seconds - small group finish
    return 'bunch sprint';                          // < 5 seconds - mass sprint
  }

  // For non-winners - what kind of race was it?
  if (lossMargin < 1) return 'photo finish';        // Same time essentially
  if (lossMargin < 5) return 'bunch sprint';        // In the main sprint
  if (lossMargin < 30) return 'small group';        // In a small group behind
  if (lossMargin < 60) return 'chase group';        // In the chase group
  if (lossMargin < 120) return 'second group';      // Well behind in second group
  return 'back of pack';                            // Very far back
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
function buildUnifiedNarrative({ introMoment, raceData, seasonData, raceContext, narrativeSelector }) {
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
    
    // Add a transition sentence based on performance and race type - IMPROVED
    if (raceContext.raceType === 'time trial') {
      if (performanceTier === 'win') {
        paragraph1 += `At ${eventName}, it was time to prove your power against the clock.`;
      } else if (performanceTier === 'podium') {
        paragraph1 += `${eventName} would test your FTP and pacing discipline.`;
      } else {
        paragraph1 += `${eventName} would reveal exactly where your fitness stands—no hiding in a time trial.`;
      }
    } else if (raceContext.raceType === 'track elimination') {
      paragraph1 += `The Forest Velodrome Elimination demanded perfect positioning lap after lap.`;
    } else if (raceContext.stageInfo?.isFirstStage) {
      paragraph1 += `The Local Tour's opening stage was where the GC battle would begin—set your mark early or spend three days chasing.`;
    } else if (raceContext.stageInfo?.isMiddleStage) {
      paragraph1 += `Stage 2 of the Local Tour—the GC is taking shape, and today's result could shift everything.`;
    } else if (raceContext.stageInfo?.isQueenStage) {
      paragraph1 += `The queen stage. The final chapter of the Local Tour and the last chance to make a move on GC. This is where it would all be decided.`;
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

  // PARAGRAPH 2: Race performance with type-specific context - IMPROVED
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
 * Generate contextual opening when no narrative moment exists - IMPROVED
 */
function generateContextualOpening(raceData, seasonData, raceContext) {
  const { eventNumber, eventName, position } = raceData;
  const { stagesCompleted } = seasonData;
  const { raceType, stageInfo } = raceContext;
  
  // First race
  if (eventNumber === 1) {
    return `This is it—your first race. ${eventName} marks the beginning of everything you've been working toward. The nerves are real, the competition is fierce, but you're here. You're racing.`;
  }
  
  // Stage race openings - IMPROVED
  if (stageInfo?.isFirstStage) {
    return `The Local Tour begins with ${eventName}. Three stages over three days, one overall classification. This opening stage sets the tone—not just for your GC position, but for how the entire tour will unfold. Start strong or spend the next two days chasing.`;
  }
  
  if (stageInfo?.isMiddleStage) {
    return `Stage 2 of the Local Tour—the middle act where the GC story continues to develop. Yesterday's result is done; today's result will reshape the standings. The race lead can change hands, time gaps can be extended or closed. Everything is still in play.`;
  }
  
  if (stageInfo?.isQueenStage) {
    return `The queen stage. The final stage of the Local Tour and the deciding day for the overall classification. Whatever GC gap you have—whether you're defending or attacking—this is where the tour will be won or lost. The hardest climbs, the deepest suffering, the final reckoning.`;
  }
  
  // Race type specific openings - IMPROVED
  if (raceType === 'time trial') {
    return `${eventName}: just you, your bike, and the clock. No tactics, no drafting, no hiding in the wheels. This is pure power and pacing discipline—your FTP laid bare for everyone to see. The numbers don't lie.`;
  }
  
  if (raceType === 'track elimination') {
    return `The Forest Velodrome Elimination—a simple format with brutal execution. Last rider across the line each lap is eliminated. Do that for 20 laps until only one rider remains. No room for error, no time to rest, just relentless positioning and the constant threat of elimination.`;
  }
  
  if (raceType === 'hill climb') {
    return `${eventName} strips racing down to its purest form: you versus gravity. No tactics, no draft, no clever positioning. Just the road pointing upward and the question of whether your legs are strong enough to go fast while everything burns.`;
  }

  if (raceType === 'points race') {
    return `${eventName} isn't about one decisive moment—it's about accumulating points across multiple sprint banners. You need to be sharp for every intermediate sprint, positioned well each time, and smart about when to commit fully versus when to conserve. Consistency wins points races.`;
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
 * Generate detailed race performance paragraph with type-specific context - SIGNIFICANTLY IMPROVED
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
    secondPlaceName,
    gcPosition,
    gcGap
  } = raceData;

  const performanceTier = determinePerformanceTier(position);
  const placeDiff = predictedPosition - position;
  const { raceType, stageInfo, raceDynamics } = raceContext;
  
  let performance = '';

  // ========== WINS ==========
  if (performanceTier === 'win') {
    
    // TIME TRIAL WINS - Solo effort against the clock
    if (raceType === 'time trial') {
      if (earnedDarkHorse) {
        performance = `The predictions had you down for ${predictedPosition}th, but predictions don't account for perfect pacing and sustained threshold power. You started controlled, built into your rhythm by the halfway point, and held the watts all the way to the finish. When the results came through—first place, ${formatGapText(winMargin)} clear of second. This is the kind of solo effort that proves you have the engine to compete.`;
      } else if (earnedDomination) {
        performance = `${eventName} was a statement ride. From the first kilometer you were on pace, power numbers sitting exactly where they needed to be. The gap grew steadily as weaker riders faded, and you crossed the line ${formatGapText(winMargin)} clear of the field. First place. In a time trial, that margin means you had significantly more FTP—the numbers don't lie.`;
      } else {
        performance = `Twenty minutes of threshold power, perfectly paced from start to finish. No tactics, no draft, just raw FTP and pacing discipline. You finished ${formatGapText(winMargin)} ahead of second place—first overall. Time trials reveal exactly where your fitness stands, and today you had the strongest legs in the field.`;
      }
    }
    
    // TRACK ELIMINATION WINS
    else if (raceType === 'track elimination') {
      performance = `The Forest Velodrome Elimination is brutal in its simplicity—last rider every lap is eliminated until only one remains. You stayed near the front the entire race, never drifted back, covered every surge and acceleration. Lap by lap, riders were pulled from the track. Twenty laps of high-intensity efforts, constant vigilance, and perfect positioning. When the final bell rang and the last elimination was made, only you remained. Winner. The sharpest bike handling and the deepest reserves won out.`;
    }
    
    // HILL CLIMB WINS
    else if (raceType === 'hill climb') {
      if (earnedDomination) {
        performance = `${eventName} was pure domination. You started at a sustainable pace and simply rode away from everyone else as the gradient increased. By the top, you'd put ${formatGapText(winMargin)} into second place. First overall. Hill climbs don't lie about climbing strength—you had more watts-per-kilo than anyone else today.`;
      } else {
        performance = `The road pointed up, and you had the legs to go fast. Smooth pedaling, controlled breathing, sustainable power output all the way to the summit. First place, ${formatGapText(winMargin)} ahead of the next climber. In a hill climb there's nowhere to hide—you versus gravity, and you won.`;
      }
    }
    
    // STAGE RACE WINS - GC context is critical
    else if (stageInfo) {
      if (earnedDomination) {
        performance = `Stage ${stageInfo.stageNumber} wasn't just a win—it was a statement of intent. ${getDynamicsText(raceDynamics, true, winMargin)} You dominated from the start and crossed the line ${formatGapText(winMargin)} clear of second place.`;
        if (gcPosition) {
          if (gcPosition === 1) {
            performance += ` Crucially, you now wear the race leader's jersey${gcGap === 0 ? '' : `, having taken the GC lead`}.`;
            if (stageInfo.isFinalStage) {
              performance += ` With the queen stage complete, the Local Tour is yours—stage winner and overall classification champion.`;
            } else {
              performance += ` ${stageInfo.totalStages - stageInfo.stageNumber} ${stageInfo.totalStages - stageInfo.stageNumber === 1 ? 'stage' : 'stages'} remain, and you're in the strongest position possible.`;
            }
          } else {
            performance += ` You're now ${gcPosition}${getOrdinal(gcPosition)} in GC, ${formatGapText(gcGap)} ${gcGap > 0 ? 'behind the leader' : 'ahead'}.`;
            if (stageInfo.isFinalStage) {
              performance += ` The Local Tour ends with you on the podium—a successful three days of racing.`;
            }
          }
        }
      } else if (earnedCloseCall || raceDynamics === 'bunch sprint' || raceDynamics === 'small group sprint') {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `Stage ${stageInfo.stageNumber} came down to a sprint finish. ${dynamicsText} You timed it perfectly, found the gap, and hit the line first${winMargin < 1 ? ' by mere centimeters' : ` with ${formatGapText(winMargin)} to spare`}.`;
        if (gcPosition && gcPosition <= 3) {
          performance += ` More importantly, you're now ${gcPosition === 1 ? 'wearing the leader\'s jersey' : `${gcPosition}${getOrdinal(gcPosition)} overall`}${gcGap > 0 ? `, ${formatGapText(gcGap)} ${gcPosition === 1 ? 'ahead' : 'behind the leader'}` : ''}.`;
          if (stageInfo.isFinalStage) {
            performance += ` The Local Tour is complete, and you've ${gcPosition === 1 ? 'won the overall classification' : 'secured a podium finish on GC'}.`;
          }
        }
      } else {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `Stage ${stageInfo.stageNumber} victory! ${dynamicsText} First across the line.`;
        if (gcPosition) {
          if (gcPosition === 1) {
            performance += ` You now lead the Local Tour${gcGap > 0 ? ` by ${formatGapText(gcGap)}` : ''}.`;
            if (stageInfo.isFinalStage) {
              performance += ` With the queen stage won, the overall classification is yours—Local Tour champion.`;
            } else {
              performance += ` ${stageInfo.totalStages - stageInfo.stageNumber} more ${stageInfo.totalStages - stageInfo.stageNumber === 1 ? 'stage' : 'stages'} to defend this lead.`;
            }
          } else {
            performance += ` On GC, you're ${gcPosition}${getOrdinal(gcPosition)}${gcGap > 0 ? `, ${formatGapText(gcGap)} from the lead` : ''}.`;
          }
        }
      }
    }
    
    // STANDARD RACE WINS - with better dynamics analysis
    else {
      if (earnedDarkHorse) {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `Nobody predicted this. Coming into ${eventName}, you were forecasted for ${predictedPosition}th—respectable, but not threatening. ${dynamicsText} First place. Winner. Dark horse. The kind of result that changes how you see yourself as a racer.`;
      } else if (earnedDomination) {
        if (raceDynamics === 'solo victory') {
          performance = `${eventName} was complete domination. You went clear early and never looked back, building the gap relentlessly until you crossed the line over a minute ahead of second place. This wasn't about tactics or luck—this was about having the legs to ride away from the entire field and solo to victory.`;
        } else {
          performance = `${eventName} wasn't just a win—it was a statement. ${getDynamicsText(raceDynamics, true, winMargin)} You crushed the field, finishing ${formatGapText(winMargin)} clear. The kind of dominant performance that gets remembered.`;
        }
      } else if (earnedCloseCall || raceDynamics === 'bunch sprint' || raceDynamics === 'photo finish') {
        performance = `${eventName} came down to an absolute sprint finish—chaotic, desperate, and decided by millimeters. Multiple riders hit the line together, every ounce of power squeezed from exhausted legs. You emerged with the victory by ${winMargin < 1 ? 'a bike length' : `less than ${Math.ceil(winMargin)} seconds`}. Races this close are as much about bike handling and positioning as pure power. Today it went your way.`;
      } else if (placeDiff >= 5) {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `The predictions had you down for ${predictedPosition}th at ${eventName}, but you had other plans. ${dynamicsText} First place—exceeding expectations and proving you belong at the front of the race.`;
      } else {
        const dynamicsText = getDynamicsText(raceDynamics, true, winMargin);
        performance = `${eventName} played out well and you executed your race plan flawlessly. ${dynamicsText} First across the line. This is what good form and smart racing look like.`;
      }
    }
  }
  
  // ========== PODIUMS ==========
  else if (performanceTier === 'podium') {
    
    // TIME TRIAL PODIUMS
    if (raceType === 'time trial') {
      const gap = lossMargin;
      performance = `${eventName} demanded perfect pacing and maximum sustained power. You delivered a strong ride, finishing ${position === 2 ? 'second' : 'third'} place, ${formatGapText(gap)} behind ${winnerName || 'the winner'}. In a time trial, that gap represents pure power difference—${winnerName || 'they'} had slightly more FTP today, but you left everything out there. ${position === 2 ? 'A silver medal' : 'A bronze medal'} in a pure power test is a solid result.`;
    }
    
    // HILL CLIMB PODIUMS
    else if (raceType === 'hill climb') {
      performance = `${eventName} was a test of climbing strength, and you proved you can suffer uphill. ${position === 2 ? 'Second place' : 'Third place'}, ${formatGapText(lossMargin)} behind ${winnerName || 'the winner'}. ${winnerName || 'They'} had stronger legs on the climbs today, but a podium finish on a hill climb means you can climb at a competitive level.`;
    }
    
    // STAGE RACE PODIUMS
    else if (stageInfo) {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `Stage ${stageInfo.stageNumber}: ${position === 2 ? 'second' : 'third'} place. ${dynamicsText}`;
      if (gcPosition && gcPosition <= 5) {
        performance += ` On the overall classification, you're now ${gcPosition}${getOrdinal(gcPosition)}${gcGap > 0 ? `, ${formatGapText(gcGap)} behind the race leader` : ''}.`;
        if (stageInfo.isFinalStage) {
          performance += ` The Local Tour is complete—you've ${gcPosition <= 3 ? 'secured a podium finish on GC' : 'finished in the top 5 overall'}, a solid result across three days of racing.`;
        } else {
          performance += ` ${stageInfo.totalStages - stageInfo.stageNumber} more ${stageInfo.totalStages - stageInfo.stageNumber === 1 ? 'stage' : 'stages'} remain—everything is still to race for.`;
        }
      } else {
        performance += ` The stage podium is a good result, though the GC battle is happening elsewhere.`;
      }
    }
    
    // STANDARD RACE PODIUMS
    else if (earnedPhotoFinish || raceDynamics === 'bunch sprint' || raceDynamics === 'photo finish') {
      performance = `${eventName} produced a sprint finish so close it needed photo review. Multiple riders crossed the line in a desperate, chaotic finale. You finished ${position === 2 ? 'second' : 'third'}, ${lossMargin < 1 ? 'by mere centimeters' : `just ${formatGapText(lossMargin)} back`}. ${winnerName ? `${winnerName} took the win, but only barely.` : 'The winner edged it, but only barely.'} Podium finishes earned through photo finishes are testament to explosive finishing speed.`;
    } else if (placeDiff >= 5) {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `Coming into ${eventName}, you were predicted for ${predictedPosition}th, but you had other plans. ${dynamicsText} ${position === 2 ? 'Second place' : 'Third place'}—a podium finish that exceeded expectations significantly.`;
    } else {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `${eventName} delivered a solid ${position === 2 ? 'second' : 'third'} place finish. ${dynamicsText} ${winnerName ? `${winnerName} took the victory, but you were right there.` : 'Not every podium is dramatic—some are just the product of consistent, smart racing.'}`;
    }
  }
  
  // ========== TOP 10 ==========
  else if (performanceTier === 'top10') {
    
    // TIME TRIAL TOP 10
    if (raceType === 'time trial') {
      performance = `${eventName} resulted in ${position}${getOrdinal(position)} place. Your pacing was disciplined and power output was solid, but others simply had more watts today. Still, a top-10 finish in a time trial means your engine is competitive at this level. The FTP numbers are there; it's about continuing to build threshold power.`;
    }
    
    // STAGE RACE TOP 10
    else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber}: ${position}${getOrdinal(position)} place. A solid result that keeps you in the race.`;
      if (gcPosition && gcPosition <= 10) {
        performance += ` You're ${gcPosition}${getOrdinal(gcPosition)} in the overall standings${gcGap > 0 ? `, ${formatGapText(gcGap)} down from the lead` : ''}.`;
        if (stageInfo.isFinalStage) {
          performance += ` The Local Tour is complete with a top-10 GC finish—you raced consistently across three days.`;
        } else {
          performance += ` The GC is still fluid with ${stageInfo.totalStages - stageInfo.stageNumber} more ${stageInfo.totalStages - stageInfo.stageNumber === 1 ? 'stage' : 'stages'}—plenty of racing left.`;
        }
      }
    }
    
    // STANDARD RACE TOP 10
    else if (placeDiff >= 5) {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `${eventName} produced ${position}${getOrdinal(position)} place—significantly better than the predicted ${predictedPosition}th. ${dynamicsText} You rode tactically smart, conserved energy when needed, and had enough left to finish strong. Top-10 finishes like this build momentum and bank valuable points.`;
    } else {
      const dynamicsText = getDynamicsText(raceDynamics, false, lossMargin);
      performance = `${eventName}: ${position}${getOrdinal(position)} place. ${dynamicsText} You stayed competitive throughout and finished roughly where predictions suggested. Solid, consistent results like this accumulate points and build the foundation for a successful season.`;
    }
  }
  
  // ========== MIDPACK ==========
  else if (performanceTier === 'midpack') {
    
    // TIME TRIAL MIDPACK
    if (raceType === 'time trial') {
      performance = `${eventName} was a reality check. You paced it as best you could, focused on your breathing and power output, but the threshold just wasn't there today. ${position}${getOrdinal(position)} place. Time trials are brutally honest about fitness—you need more FTP to move up in these events. Back to the training plan.`;
    }
    
    // STAGE RACE MIDPACK
    else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber} didn't go to plan—${position}${getOrdinal(position)} place. The race split apart and you found yourself in the second group, unable to bridge across to the leaders.`;
      if (gcPosition) {
        performance += ` That puts you ${gcPosition}${getOrdinal(gcPosition)} overall, ${formatGapText(gcGap)} behind the GC leader.`;
        if (stageInfo.isFinalStage) {
          performance += ` The Local Tour is complete, though the overall classification was decided elsewhere.`;
        } else {
          performance += ` ${stageInfo.totalStages - stageInfo.stageNumber} more ${stageInfo.totalStages - stageInfo.stageNumber === 1 ? 'stage' : 'stages'} to try and climb back into contention.`;
        }
      }
    }
    
    // STANDARD RACE MIDPACK
    else {
      const splitPhrase = getRaceSplitPhrase(raceType);
      performance = `${eventName} was tougher than expected—${position}${getOrdinal(position)} place. The race ${splitPhrase} early and you found yourself in the second group, chasing but never quite bridging the gap. ${lossMargin ? `You finished ${formatGapText(lossMargin)} behind the winner.` : ''} Days like this happen in racing. The key is learning from them and coming back stronger.`;
    }
  }
  
  // ========== BACK OF PACK ==========
  else {
    
    // TIME TRIAL BACK
    if (raceType === 'time trial') {
      performance = `${eventName} was a struggle from start to finish. Pacing felt off, power wasn't there, and the result reflects it: ${position}${getOrdinal(position)} place${lossMargin ? `, ${formatGapText(lossMargin)} behind the winner` : ''}. Time trials are humbling—they show you exactly where your fitness stands with nowhere to hide. This is valuable data for training. Back to building FTP.`;
    }
    
    // TRACK ELIMINATION BACK
    else if (raceType === 'track elimination') {
      performance = `The Forest Velodrome Elimination was brutal today. You tried to stay near the front, but positioning mistakes compound quickly in this format. Eliminated with several laps still to go. Track racing demands perfection—one lap in the wrong position and you're out. It's a harsh format, but you learn fast from mistakes here.`;
    }
    
    // STAGE RACE BACK
    else if (stageInfo) {
      performance = `Stage ${stageInfo.stageNumber} was one of those days where nothing quite clicked—${position}${getOrdinal(position)} place. Whether it was fatigue from previous stages, bad positioning in the key moments, or just being off form, the result wasn't what you wanted. The Local Tour is harder than it looks when you're racing for GC.`;
      if (stageInfo.isFinalStage) {
        performance += ` The three-day tour is complete, and while the results weren't what you hoped for, you finished all three stages and gained valuable experience in stage racing.`;
      }
    }
    
    // STANDARD RACE BACK
    else {
      performance = `${eventName} was one of those days where nothing quite clicked—${position}${getOrdinal(position)} place${lossMargin ? `, ${formatGapText(lossMargin)} behind the leaders` : ''}. Whether it was fatigue, bad positioning, or just being off form, the result stung more than expected. But here's the thing about racing: bad days make you better if you learn from them. You finished the race. That matters. Analyze what went wrong, adjust the training, and come back stronger.`;
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
    case 'time trial': return 'pacing discipline';
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
    case 'gravel race': return 'hit the rough gravel sections';
    case 'time trial': return 'demanded sustained power';
    case 'track elimination': return 'eliminated riders lap by lap';
    default: return 'broke apart';
  }
}

/**
 * Get dynamics-based narrative text - IMPROVED with winner names
 */
function getDynamicsText(raceDynamics, isWinner, gap, winnerName = null) {
  const gapText = gap ? formatGapText(gap) : '';
  
  if (isWinner) {
    switch (raceDynamics) {
      case 'solo victory':
        return `You went clear and rode solo to victory, building an insurmountable gap of ${gapText}.`;
      case 'breakaway win':
        return `You made it into the winning breakaway and held off the chase to finish ${gapText} clear.`;
      case 'small group sprint':
        return `A small group contested the finish, and you emerged victorious${gap && gap < 5 ? ' in a tight sprint' : ''}.`;
      case 'bunch sprint':
        return `The race came down to a mass bunch sprint—chaos, power, and positioning all coming together in the final meters.`;
      case 'time trial':
        return `Perfect pacing and sustained power.`;
      default:
        return `You executed perfectly when it mattered.`;
    }
  } else {
    const winnerText = winnerName ? `${winnerName} took the win` : 'The winner prevailed';
    switch (raceDynamics) {
      case 'bunch sprint':
      case 'photo finish':
        return `${winnerText} in a bunch sprint by ${gapText}.`;
      case 'small group sprint':
      case 'small group':
        return `You were in the front group, but ${winnerText.toLowerCase()}, finishing ${gapText} ahead.`;
      case 'chase group':
        return `The leaders went clear and you finished in the chase group, ${gapText} back.`;
      case 'second group':
        return `You finished in the second group, ${gapText} behind the leaders.`;
      case 'breakaway win':
        return `The breakaway stayed clear, and you finished ${gapText} behind.`;
      case 'solo victory':
        return `${winnerText} in a solo effort, ${gapText} ahead of the field.`;
      case 'time trial':
        return `In a time trial, that's a power difference of ${gapText}.`;
      default:
        return `You finished ${gapText} behind ${winnerName || 'the winner'}.`;
    }
  }
}

/**
 * Format time gap text
 */
function formatGapText(seconds) {
  if (!seconds || seconds === 0) return 'on the same time';
  if (seconds < 1) return 'by a bike length';
  if (seconds < 5) return `${Math.round(seconds)} seconds`;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (secs === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
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
 * Determine if season context paragraph should be included - IMPROVED for stage races
 */
function shouldIncludeSeasonContext(seasonData, raceContext) {
  // Always include context for non-stage races
  if (!raceContext.stageInfo) {
    return true;
  }
  
  // For stage races, only include season context on the final stage
  if (raceContext.stageInfo.isFinalStage) {
    return true;
  }
  
  // Don't include season context for stages 1-2 of the tour
  return false;
}

/**
 * Generate season implications paragraph - IMPROVED for Local Tour context
 */
function generateSeasonImplications(raceData, seasonData, raceContext) {
  const { stageInfo } = raceContext;
  const { 
    totalPoints, 
    totalWins, 
    totalPodiums,
    nextEventNumber,
    nextEventName,
    stagesCompleted,
    recentResults = []
  } = seasonData;

  let context = '';

  // Special handling for the final stage of the Local Tour (Event 15)
  if (stageInfo?.isFinalStage && nextEventNumber === null) {
    // This is the end of both the Local Tour AND the season
    const { gcPosition } = raceData;
    
    context = `With the queen stage complete, the Local Tour is over—and with it, your first season. `;
    
    if (gcPosition === 1) {
      context += `You won the overall classification, proving you can race across multiple days and terrains. `;
    } else if (gcPosition <= 3) {
      context += `A podium finish on the overall classification across three days of racing—that's a successful Local Tour by any measure. `;
    } else {
      context += `The Local Tour taught you what stage racing demands: day-after-day performance, recovery management, and consistency under fatigue. `;
    }
    
    // Season summary
    if (totalWins >= 3) {
      context += `Looking back at the full season: ${totalWins} wins, ${totalPodiums} podium finishes, and ${totalPoints} points. You proved you can win races and compete at the front consistently. `;
    } else if (totalWins >= 1) {
      context += `Your first season produced ${totalWins} ${totalWins === 1 ? 'win' : 'wins'} and ${totalPodiums} podium${totalPodiums === 1 ? '' : 's'}—real results that prove you belong in competitive racing. `;
    } else if (totalPodiums >= 3) {
      context += `While you didn't get a win, ${totalPodiums} podium finishes across the season shows you can compete at the sharp end of races. `;
    } else {
      context += `Your first season is complete. ${totalPoints} points earned, lessons learned in every race. `;
    }
    
    context += `This was about more than results—it was about becoming a racer. Off-season training awaits, and then Season 2.`;
    
    return context;
  }

  // If this is stage 1 or 2 of the Local Tour, we shouldn't be here (shouldIncludeSeasonContext prevents it)
  // But just in case, return empty
  if (stageInfo && !stageInfo.isFinalStage) {
    return '';
  }

  // Standard season context for non-Local Tour races
  // Points/achievements context
  if (totalPoints >= 500) {
    context += `You've accumulated ${totalPoints} points so far—the kind of season total that puts you in championship contention. `;
  } else if (totalPoints >= 300) {
    context += `${totalPoints} points on the season represents consistent top-20 finishes and some strong results. `;
  } else if (totalPoints >= 150) {
    context += `You've banked ${totalPoints} points so far this season—not spectacular, but building steadily. `;
  }

  // Wins/podiums context
  if (totalWins >= 5) {
    context += `Five or more wins already—you're not just racing, you're dominating events. This kind of win rate separates the good from the great. `;
  } else if (totalWins >= 3) {
    context += `Multiple race wins this season have established you as someone who knows how to finish first. You're dangerous in any race format. `;
  } else if (totalWins === 1 || totalWins === 2) {
    context += `${totalWins} ${totalWins === 1 ? 'win' : 'wins'} so far—you've proven you can win races, and that confidence carries into every start line. `;
  } else if (totalPodiums >= 5) {
    context += `Multiple trips to the podium have defined your season—five or more top-three finishes is the hallmark of genuine consistency. `;
  } else if (totalPodiums >= 3) {
    context += `Several podium finishes have given your season real substance. You're competing for the top spots regularly. `;
  }

  // Recent form
  if (recentResults.length >= 2) {
    const lastTwo = recentResults.slice(0, 2);
    const improving = lastTwo[0] < lastTwo[1];
    if (improving && lastTwo[0] <= 5) {
      context += `Your recent form is trending upward—the results are getting better with each race. `;
    } else if (lastTwo[0] > 20 && lastTwo[1] > 20) {
      context += `Recent results haven't delivered what you're capable of, but form is temporary. One good result changes everything. `;
    }
  }

  // Next race preview - IMPROVED with proper stage race handling
  if (nextEventNumber) {
    const EVENT_TYPES = {
      1: 'criterium', 2: 'road race', 3: 'track elimination', 4: 'time trial',
      5: 'points race', 6: 'hill climb', 7: 'criterium', 8: 'gran fondo',
      9: 'hill climb', 10: 'time trial', 11: 'points race', 12: 'gravel race',
      13: 'stage race', 14: 'stage race', 15: 'stage race'
    };
    
    const nextType = EVENT_TYPES[nextEventNumber];
    
    // Local Tour previews
    if (nextEventNumber === 13) {
      context += `The Local Tour begins next—three stages over three days that will test your ability to perform consecutively. Stage racing is a different challenge than one-day events: you need consistency, recovery management, and the mental strength to race hard when your legs are already tired from yesterday. `;
    } else if (nextEventNumber === 14) {
      context += `Local Tour Stage 2 awaits—the GC battle continues tomorrow. Whatever happened in Stage 1 is done; today's result will reshape the overall classification. `;
    } else if (nextEventNumber === 15) {
      context += `The Local Tour concludes with the queen stage—the hardest day and the one that will decide the overall classification. Defend your position or attack for a better one; either way, this is where the tour will be won or lost. `;
    }
    // Other race types
    else if (nextType === 'time trial') {
      context += `Next up: ${nextEventName}, a time trial where there's nowhere to hide. Just you, the bike, and the clock. FTP and pacing discipline will determine the result. `;
    } else if (nextType === 'hill climb') {
      context += `${nextEventName} awaits—a pure climbing test where only the strongest legs prevail. You versus gravity. `;
    } else if (nextType === 'track elimination') {
      context += `The Forest Velodrome Elimination is next—20 laps of high-intensity positioning where one mistake means elimination. `;
    } else if (nextType === 'criterium') {
      context += `${nextEventName} is next—fast, technical criterium racing where positioning and timing matter as much as power. `;
    } else {
      context += `${nextEventName} is the next challenge. `;
    }
  }

  // Closing motivation - SELECT FROM NARRATIVE DATABASE
  const closingText = selectSeasonContextClosing(seasonData, raceData, narrativeSelector);
  if (closingText) {
    context += closingText;
  } else {
    // Fallback if no narrative selected
    const isLateseason = stagesCompleted >= 8;
    if (isLateseason) {
      context += `The season is in its final stages. Every race from here matters. Make them count.`;
    } else if (stagesCompleted >= 5) {
      context += `The season is past halfway, and you're in a good position to make a push toward the top of the standings.`;
    } else {
      context += `The season is still young—plenty of racing ahead, plenty of opportunities to prove yourself.`;
    }
  }

  return context;
}

/**
 * Select a contextual closing from the narrative database
 * Returns varied closing text based on form, season progress, and performance
 */
function selectSeasonContextClosing(seasonData, raceData, narrativeSelector) {
  const {
    stagesCompleted,
    totalPoints,
    totalWins,
    totalPodiums,
    recentResults = [],
    isOnStreak
  } = seasonData;

  const { position } = raceData;
  const recentPosition = recentResults[0] || position;
  
  // Calculate improvement from prediction if available
  const improvementFromPrediction = raceData.predictedPosition ? 
    raceData.predictedPosition - position : 0;

  // Build context for narrative selection
  const narrativeContext = {
    stagesCompleted,
    totalPoints,
    totalWins,
    totalPodiums,
    recentPosition,
    isOnStreak,
    improvementFromPrediction
  };

  // Get the narrative database from narrativeSelector
  let NARRATIVE_DATABASE = null;
  
  // Try different access methods
  if (narrativeSelector && narrativeSelector.narrativeDatabase) {
    NARRATIVE_DATABASE = narrativeSelector.narrativeDatabase;
    console.log('   ✓ Got narrative database from narrativeSelector.narrativeDatabase');
  } else if (narrativeSelector && narrativeSelector.NARRATIVE_DATABASE) {
    NARRATIVE_DATABASE = narrativeSelector.NARRATIVE_DATABASE;
    console.log('   ✓ Got narrative database from narrativeSelector.NARRATIVE_DATABASE');
  } else if (typeof require !== 'undefined') {
    // Try requiring it directly (Node.js environment)
    try {
      const narrativeDb = require('./narrative-database.js');
      NARRATIVE_DATABASE = narrativeDb.NARRATIVE_DATABASE;
      console.log('   ✓ Got narrative database via require');
    } catch (e) {
      console.log('   ⚠️ Could not require narrative-database.js:', e.message);
    }
  } else if (typeof window !== 'undefined' && window.narrativeDatabase) {
    NARRATIVE_DATABASE = window.narrativeDatabase.NARRATIVE_DATABASE;
    console.log('   ✓ Got narrative database from window.narrativeDatabase');
  } else if (typeof global !== 'undefined' && global.NARRATIVE_DATABASE) {
    NARRATIVE_DATABASE = global.NARRATIVE_DATABASE;
    console.log('   ✓ Got narrative database from global.NARRATIVE_DATABASE');
  } else {
    console.log('   ⚠️ Could not find narrative database in any location');
    console.log('   narrativeSelector type:', typeof narrativeSelector);
    if (narrativeSelector) {
      console.log('   narrativeSelector keys:', Object.keys(narrativeSelector));
    }
  }

  if (!NARRATIVE_DATABASE || !NARRATIVE_DATABASE.seasonContextClosing) {
    console.log('   ⚠️ Narrative database not found or missing seasonContextClosing category');
    if (NARRATIVE_DATABASE) {
      console.log('   Available categories:', Object.keys(NARRATIVE_DATABASE));
    }
    return null; // Fallback will be used
  }
  
  console.log(`   ✓ Found ${NARRATIVE_DATABASE.seasonContextClosing.length} season context closings`);

  // Filter matching narratives
  console.log(`   Filtering closings: stages=${stagesCompleted}, points=${totalPoints}, wins=${totalWins}, position=${recentPosition}, streak=${isOnStreak}`);
  
  const matchingNarratives = NARRATIVE_DATABASE.seasonContextClosing.filter(narrative => {
    const triggers = narrative.triggers;
    
    // Check each trigger condition
    if (triggers.isOnStreak !== undefined && triggers.isOnStreak !== isOnStreak) {
      return false;
    }
    
    if (triggers.stagesCompleted && !triggers.stagesCompleted.includes(stagesCompleted)) {
      return false;
    }
    
    if (triggers.totalPoints) {
      const pointsInRange = triggers.totalPoints.some(points => {
        if (typeof points === 'number') {
          return totalPoints >= points && totalPoints < points + 100;
        }
        return false;
      });
      if (!pointsInRange) return false;
    }
    
    if (triggers.totalWins && !triggers.totalWins.includes(totalWins)) {
      return false;
    }
    
    if (triggers.totalPodiums && !triggers.totalPodiums.includes(totalPodiums)) {
      return false;
    }
    
    if (triggers.recentPosition && !triggers.recentPosition.includes(recentPosition)) {
      return false;
    }
    
    if (triggers.improvementFromPrediction && !triggers.improvementFromPrediction.includes(improvementFromPrediction)) {
      return false;
    }
    
    return true;
  });

  console.log(`   Found ${matchingNarratives.length} matching closings`);

  if (matchingNarratives.length === 0) {
    console.log('   ⚠️ No matching closings found, using fallback');
    return null; // Use fallback
  }

  // Weight-based random selection
  const totalWeight = matchingNarratives.reduce((sum, n) => sum + (n.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const narrative of matchingNarratives) {
    random -= (narrative.weight || 1);
    if (random <= 0) {
      console.log(`   ✓ Selected closing: "${narrative.id}"`);
      return narrative.text;
    }
  }
  
  // Fallback to first matching
  console.log(`   ✓ Selected closing (fallback): "${matchingNarratives[0].id}"`);
  return matchingNarratives[0].text;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateUnifiedStory };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.unifiedStoryGenerator = { generateUnifiedStory };
}
