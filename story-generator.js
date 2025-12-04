// story-generator.js - Generate personalized race story text with longer, more detailed paragraphs

// Event name mappings
const EVENT_NAMES = {
  1: "Coast and Roast Crit",
  2: "Island Classic",
  3: "The Forest Velodrome Elimination",
  4: "Coastal Loop Time Challenge",
  5: "North Lake Points Race",
  6: "Easy Hill Climb",
  7: "Flat Eight Criterium",
  8: "The Grand Gilbert Fondo",
  9: "Base Camp Classic",
  10: "Beach and Pine TT",
  11: "South Lake Points Race",
  12: "Unbound - Little Egypt",
  13: "Local Tour Stage 1",
  14: "Local Tour Stage 2",
  15: "Local Tour Stage 3"
};

// Event characteristics for context
const EVENT_TYPES = {
  1: "criterium",
  2: "road race",
  3: "track elimination",
  4: "time trial",
  5: "points race",
  6: "hill climb",
  7: "criterium",
  8: "gran fondo",
  9: "mountain stage",
  10: "time trial",
  11: "points race",
  12: "gravel race",
  13: "stage race",
  14: "stage race",
  15: "stage race"
};

/**
 * Generate race recap paragraph based on performance
 * These are LONG paragraphs (5-7 sentences each) for immersive storytelling
 */
function generateRaceRecap(data) {
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
    earnedZeroToHero,
    isFirstRace
  } = data;

  const eventType = EVENT_TYPES[eventNumber];
  const placeDiff = predictedPosition - position;
  
  // Determine performance tier
  let tier;
  if (position === 1) tier = 'win';
  else if (position <= 3) tier = 'podium';
  else if (position <= 10) tier = 'top10';
  else if (position <= 20) tier = 'midpack';
  else tier = 'back';

  // Determine prediction accuracy
  let predictionTier;
  if (placeDiff >= 10) predictionTier = 'crushed';
  else if (placeDiff >= 5) predictionTier = 'beat';
  else if (Math.abs(placeDiff) <= 1) predictionTier = 'matched';
  else if (placeDiff < 0 && placeDiff >= -5) predictionTier = 'worse';
  else predictionTier = 'much_worse';

  // Build the paragraph - aiming for 5-7 sentences
  let recap = '';

  // WINS - Long, detailed paragraphs
  if (tier === 'win') {
    if (earnedDarkHorse) {
      recap += `Nobody saw this coming. ${eventName} was supposed to be a day for others to shine—predictions had you finishing ${predictedPosition}th, well off the pace. But racing isn't run on spreadsheets and algorithms. Whatever the alchemy, you rode possessed. When the lead group splintered, you were there. When the attacks came, you covered them. And when it came down to the finale—a desperate, all-or-nothing lunge for the line—you found an extra gear that nobody knew you had. The shock on faces at the finish line was palpable. P1. Winner. Giant-slayer. The rider they didn't see coming just stole the show.`;
    } else if (earnedDomination) {
      if (predictionTier === 'matched') {
        recap += `${eventName} played out exactly as you'd hoped it would. From the opening lap, you settled into a rhythm that felt comfortable, controlled, and—as it turned out—untouchable. The predictions had you down for a win, and you delivered on that expectation with authority. As the race progressed, you didn't just win—you dominated. The gap grew with every lap, every climb, every acceleration, until you crossed the line over a minute clear of the field. By the final stages, you could focus on bringing it home clean rather than fighting for every second. Sometimes racing is about suffering through close calls and desperate sprints. Today wasn't one of those days. Today was about doing your job efficiently and riding away with the result you came for.`;
      } else {
        recap += `The predictions had you down for a ${predictedPosition}th place finish at ${eventName}, but those numbers don't account for good legs and better timing. From early on, it was clear this was going to be your day. You didn't just edge out the competition—you crushed them. As the race progressed, the gap grew relentlessly, lap after lap, climb after climb, until you crossed the line over a minute clear of second place. It wasn't just a victory; it was a statement of intent that echoed throughout the field. When the decisive moments arrived, you were always there, always positioned perfectly, always with something left in reserve. This is the kind of performance that gets remembered, the kind that makes competitors check their tactics and wonder if they're racing the same sport.`;
      }
    } else if (earnedCloseCall) {
      recap += `${eventName} came down to the wire in the most dramatic fashion possible. From the moment the flag dropped, it was clear this would be a battle—multiple riders with the legs to win, nobody willing to concede an inch. You were in the mix throughout, trading places with the leaders, covering every attack, positioning yourself for the final showdown. The sprint was chaotic, desperate, and decided by millimeters. Coming out of the final corner, three or four riders hit the line together, engines red-lined, everything on the line. Somehow you emerged with the victory by less than half a second. Inches separated you from second place, but in racing, inches are all you need. It's the kind of finish that'll have you rewatching the replay a dozen times, simultaneously exhilarating and nerve-wracking, proof that when it matters most, you can deliver under the highest pressure.`;
    } else if (predictionTier === 'beat' || predictionTier === 'crushed') {
      recap += `The predictions had you down for a ${predictedPosition}th place finish at ${eventName}, but those numbers don't account for good legs and better timing. From early on, it was clear this was going to be your day. You positioned yourself perfectly in the early phases, conserving energy while staying alert to any moves. When the decisive moments arrived, you were always there, always with something left in reserve. The race split into smaller groups as the strongest riders pushed the pace, and you covered every acceleration with confidence. By the final stages, the gap had grown to a comfortable margin, and you could focus on bringing it home clean rather than scrambling in a desperate sprint. Sometimes you have to earn a win through suffering and chaos. Today, you earned it through intelligent racing and superior form.`;
    } else {
      recap += `${eventName} unfolded with the kind of control you dream about. Every move felt calculated, every effort measured, and by the time the finish line approached, the result was never in doubt. The predictions had suggested this might be your day, and you delivered with precision. From the opening moments, you settled into a rhythm that felt comfortable yet powerful, reading the race perfectly and responding to every challenge with confidence. When others attacked, you covered. When the pace slowed, you stayed vigilant. And when the moment came to make your own move, you had the reserves to commit fully and ride away from the field. Sometimes racing is about suffering through close calls and desperate sprints. Today wasn't one of those days. Today was about doing your job efficiently and riding away with the result you came for.`;
    }
  }
  
  // PODIUMS - Long paragraphs
  else if (tier === 'podium') {
    if (earnedPhotoFinish) {
      recap += `They say the margins between success and heartbreak can be measured in fractions of a second, and ${eventName} proved it in the most visceral way possible. This was a race decided by millimeters, by who could throw their bike the furthest across the line, by who wanted it just slightly more in that final desperate moment. You were there in the finale, sprinting for everything, trading paint with the leaders through the last corner. The line approached at terrifying speed, and you threw everything into one last surge. When the dust settled, you'd crossed in ${position === 2 ? 'second' : 'third'} place by the narrowest of margins—close enough to smell victory, far enough to know you came up just short. It's the kind of finish that'll play in your head for days—simultaneously satisfying and frustrating, proof of your competitiveness but a reminder of how fine the margins are at this level. Still, you fought, you committed, and you left everything on the tarmac. There's honor in that, even when the result doesn't quite match the effort.`;
    } else if (predictionTier === 'beat' || predictionTier === 'crushed') {
      recap += `${eventName} was a day to be proud of. The predictions suggested you'd finish around ${predictedPosition}th, well out of contention for the podium, but you had other ideas. From the moment things got serious, you were in the mix, trading places with the leaders and proving you belonged at the sharp end. The race unfolded in waves of attacks and counter-attacks, and you covered every significant move with determination. When the final selection was made, you were there—not quite with enough to challenge for the win, but strong enough to hold off those behind and secure ${position === 2 ? 'second' : 'third'} place. A podium is a podium, and there's genuine satisfaction in being up there even if you couldn't quite reach the top step. That's racing. Some days you have everything needed to win, and some days you have everything needed to podium. Today was the latter, and that's nothing to be disappointed about.`;
    } else if (position === 2) {
      recap += `${eventName} rewarded smart racing, though not quite with the prize you were hoping for. You positioned yourself well throughout the race, reading the moves, staying with the strongest riders, and avoiding the chaos that caught others out. As the race reached its climax, you were right there in the mix, sensing an opportunity for victory. In the sprint, you gave everything—lunging for the line, engines red-lined, fighting for every centimeter. Second place. Close enough to see victory, far enough to know you came up just short. The winner had just slightly more on the day, just that extra fraction of speed or better positioning or fresher legs. It stings to come so close, but second place in a competitive field is still a strong result. You proved you can compete at the front, proved you have the tactical sense and physical strength to be in contention. Victory will come.`;
    } else {
      recap += `${eventName} rewarded smart racing and good positioning. You approached the race with a clear plan: stay out of trouble, conserve energy in the early phases, and be ready when the race reached its decisive moments. That plan worked perfectly. You avoided the crashes and chaos that caught others out, stayed with the main group through the challenging sections, and when the final selection was made, you were there. Not quite with enough to challenge for the win—the strongest riders had just slightly more on the day—but strong enough to hold off those behind and secure third place. A podium is a podium, and there's satisfaction in being up there even if you couldn't quite reach the top step. That's racing. You did your job, executed your plan, and came away with a result that adds solid points to your tally and proves you're competitive at this level.`;
    }
  }
  
  // TOP 10 - Moderate length
  else if (tier === 'top10') {
    if (predictionTier === 'beat') {
      recap += `A solid performance at ${eventName}. The predictions had you further down the order, somewhere in the mid-twenties, but you rode a tactically sound race that delivered better than expected. You stayed with the main group when it mattered, positioning yourself well through the technical sections and responding when the pace ramped up. When the decisive moves came, you couldn't quite go with the very strongest riders, but you held your ground and finished inside the top ten. Not every race needs to deliver a podium or a dramatic victory. Sometimes a solid, consistent performance that exceeds expectations is exactly what the season requires. You banked points, gained valuable experience, and showed you can compete in the middle of a strong field. That's progress.`;
    } else if (predictionTier === 'worse') {
      if (isFirstRace) {
        recap += `${eventName} didn't quite deliver the result you were hoping for in your season opener. The predictions had you finishing higher up the order, maybe even threatening for a podium, but racing has a way of humbling expectations. You were in contention for much of the race, positioned well and feeling reasonably strong, but when the decisive moves came—when the strongest riders made their attacks—you couldn't quite respond. The gap opened, slowly at first, then more decisively, and you had to settle into your own pace and focus on salvaging what you could. Still, a top-ten finish in your first outing is a respectable start. It's not the result that'll make headlines, but you've established a baseline, gained valuable experience, and banked your first points. That's a foundation to build on.`;
      } else {
        recap += `${eventName} didn't quite deliver the result you were hoping for. The predictions had you finishing higher up the order, maybe even threatening for a podium, but racing has a way of humbling expectations. You were in contention for much of the race, positioned well and feeling reasonably strong, but when the decisive moves came—when the strongest riders made their attacks—you couldn't quite respond. The gap opened, slowly at first, then more decisively, and you had to settle into your own pace and focus on salvaging what you could. Still, a top-ten finish keeps you in the conversation. It's not the result that'll make headlines, but it's another race completed, more experience gained, and points added to your tally. That counts for something.`;
      }
    } else {
      recap += `${eventName} was about consistency and smart positioning rather than heroics. You rode within yourself, avoiding unnecessary risks and conserving energy for when it mattered most. The race unfolded predictably—the strongest riders controlling things from the front, the pack staying together through the early phases, then splitting as the pace increased. You stayed out of trouble, positioned yourself reasonably well, and when the final selection was made, you were in the group that finished in the top ten. It's not the kind of result that generates excitement or changes your season trajectory, but it's solid, professional racing. You banked points, stayed competitive, and lived to fight another day. Sometimes that's enough.`;
    }
  }
  
  // MID-PACK - Moderate length  
  else if (tier === 'midpack') {
    if (earnedZeroToHero) {
      recap += `What a turnaround. After struggling badly in your previous outing, ${eventName} was a statement of resilience and determination. You came into this race with questions to answer and doubts to silence. The early phases were nervous—you could feel the weight of that last poor result sitting on your shoulders—but as the race developed, so did your confidence. You found your rhythm, started responding to moves rather than being dropped by them, and gradually worked your way up through the field. The result—${position}th place—might not look spectacular on paper, but context matters. After where you were last time, this represents significant progress. You proved you can bounce back, that one bad day doesn't define your season, and that you have the mental strength to turn things around when they're not going well.`;
    } else if (predictionTier === 'beat') {
      recap += `${eventName} was a quiet success. The predictions suggested you'd finish well back in the pack, struggling to stay with the main group, but through steady riding and good positioning, you worked your way into the mid-pack. Not spectacular, but solid progress. You stayed out of trouble in the early chaos, found a group that was riding at a sustainable pace, and worked efficiently to maintain your position throughout the race. When others around you faded or made mistakes, you stayed consistent. The result won't generate headlines, but it exceeds expectations and adds decent points to your season total. That's the kind of race that builds a solid foundation for better results to come.`;
    } else {
      recap += `${eventName} was one of those races where you stay in the mix without ever threatening the front runners. The result—${position}th place—reflects a day of steady work without the breakthrough needed to crack the top positions. You were never in serious trouble, never at risk of being dropped completely, but you also couldn't find the extra gear required to move up when the pace increased. The strongest riders rode away from you on the climbs or in the final kilometers, and you had to settle for being part of the main chase group. It's not disappointing, exactly—you rode to your current capabilities—but it's also not the step forward you're looking for. Still, you completed the race, banked some points, and gained more experience. That's valuable even when the result doesn't excite.`;
    }
  }
  
  // BACK OF FIELD - Honest but measured
  else {
    if (predictionTier === 'much_worse') {
      recap += `${eventName} was a struggle from start to finish. Nothing clicked today—the legs weren't there, the positioning was off, and by the time the race reached its climax, you were just trying to limit the damage and get to the finish line. The predictions had you competing in the mid-pack, but racing had other plans. You lost touch with the main group earlier than you'd hoped, found yourself isolated or in a struggling group, and had to dig deep just to complete the distance. It's the kind of day every racer experiences at some point—when form, luck, and circumstance all conspire against you. The only silver lining is that you finished. Tough days are part of racing, and what matters most is how you respond in the next one. This isn't who you are; it's just where you were today.`;
    } else {
      recap += `Sometimes racing doesn't go your way, and ${eventName} was one of those days. Despite your best efforts and intentions, you couldn't find the form needed to stay with the front groups or even the main pack. The gap opened early and never closed, leaving you in survival mode for much of the race. You tried to respond when others accelerated, but the legs simply didn't have it today. Eventually you had to accept your position, focus on getting to the finish line with dignity, and extract whatever small lessons you could from a disappointing performance. Every race is a learning experience, even the tough ones. Today taught you where you need to improve, what it takes to compete at this level, and that resilience matters as much as results. You'll come back from this.`;
    }
  }

  return recap;
}

/**
 * Generate season context paragraph
 * These are also LONG paragraphs (5-7 sentences) with forward-looking content
 */
function generateSeasonContext(data) {
  const {
    stagesCompleted,
    totalPoints,
    nextStageNumber,
    nextEventNumber,
    nextEventName,
    recentResults,
    isOnStreak,
    totalPodiums,
    seasonPosition
  } = data;

  // Special case: If this is the final stage (stage 9 = Local Tour complete) and season is complete
  // Return empty context - the season wrap-up will be shown separately
  if (stagesCompleted === 9 && data.isSeasonComplete) {
    return '';
  }

  let context = '';

  // Opening - season progress (1-2 sentences)
  if (stagesCompleted === 1) {
    context += `One stage down, and your season is officially underway. `;
  } else if (stagesCompleted === 2) {
    context += `Two stages completed now, and the season is starting to take shape. `;
  } else if (stagesCompleted === 3) {
    context += `Three stages in the books, and patterns are beginning to emerge. `;
  } else if (stagesCompleted <= 5) {
    context += `With ${stagesCompleted} stages completed, you're approaching the midpoint of the season. `;
  } else if (stagesCompleted <= 7) {
    context += `Past the halfway mark now, with ${stagesCompleted} stages complete and the season taking clear shape. `;
  } else {
    context += `The season is entering its final stretch with ${stagesCompleted} stages in the books. `;
  }

  // Points assessment - special case for first race
  if (stagesCompleted === 1) {
    // First race only - no talk of consistency yet
    if (totalPoints >= 90) {
      context += `Starting strong with ${totalPoints} points from your opening race shows you came ready to compete. `;
    } else if (totalPoints >= 60) {
      context += `With ${totalPoints} points from your debut, you've made a solid start to the campaign. `;
    } else {
      context += `Your opening race yielded ${totalPoints} points—a foundation to build on as the season unfolds. `;
    }
  } else if (totalPoints < 100) {
    context += `With ${totalPoints} points on the board, you're building a foundation—not through any single spectacular result, but through consistent effort and smart racing. `;
  } else if (totalPoints < 200) {
    context += `Your tally of ${totalPoints} points represents solid, steady work across multiple events. `;
  } else if (totalPoints < 350) {
    context += `${totalPoints} points accumulated—a respectable total that reflects consistent racing and calculated risk-taking. `;
  } else if (totalPoints < 500) {
    context += `With ${totalPoints} points banked, you've built a substantial total that puts you in strong position. `;
  } else {
    context += `A hefty total of ${totalPoints} points puts you in rarified air. `;
  }

  // Form analysis based on recent results and achievements (2-3 sentences)
  // Special case: First race - no consistency talk yet
  if (stagesCompleted === 1) {
    // First race - focus on getting started, learning, setting baseline
    if (recentResults && recentResults[0] === 1) {
      context += `Winning your season opener is the best possible start—it establishes you as a threat from the very beginning and sets the tone for everything that follows. You've proven you can deliver when it counts, and that confidence is invaluable heading into the rest of the campaign. `;
    } else if (recentResults && recentResults[0] <= 3) {
      context += `Opening with a podium is an excellent way to start the season. You've shown you can compete at the front immediately, and that's a strong foundation to build on. `;
    } else if (recentResults && recentResults[0] <= 10) {
      context += `A top-ten finish in your opener shows you're ready to compete, even if you haven't quite found your best form yet. The first race is as much about learning—understanding the competition, gauging your fitness, figuring out what works—as it is about results. `;
    } else {
      context += `Every season has to start somewhere, and your opener has given you a baseline to work from. You've learned where you stand relative to the field, what areas need work, and what you can build on. That knowledge is the foundation for improvement. `;
    }
  } else if (isOnStreak && recentResults && recentResults[0] === 1) {
    context += `The winning streak you're currently riding has caught everyone's attention—back-to-back victories aren't luck, they're form, and right now your form is undeniable. You've found that elusive combination of confidence, fitness, and tactical sharpness that turns good riders into dangerous ones. The question everyone's asking is how long you can maintain this momentum, and right now, there's no reason to think it'll end soon. `;
  } else if (totalPodiums >= 5) {
    context += `Multiple trips to the podium have defined your season—five or more top-three finishes is the hallmark of genuine consistency. You've proven you can compete at the front across different types of events and conditions. That kind of reliability is what builds successful campaigns. `;
  } else if (totalPodiums >= 3) {
    context += `Several podium finishes have given your season real substance. You're not just making up the numbers—you're competing for the top spots more often than not. `;
  } else if (recentResults && recentResults.length >= 2) {
    const lastTwo = recentResults.slice(0, 2);
    const improving = lastTwo[0] < lastTwo[1];
    if (improving) {
      context += `Your recent form shows clear improvement—each race seems to bring better results than the last, suggesting you're finding your rhythm and learning what works. The trajectory is pointing upward, which is exactly what you want to see at this stage of the season. `;
    } else if (lastTwo[0] > 20 && lastTwo[1] > 20) {
      context += `Recent results haven't quite delivered what you're capable of, but that's the thing about racing—form comes and goes, and one good result can change everything. You're gaining experience with each outing, and that experience will pay dividends when it clicks. `;
    } else {
      context += `Your recent results show you're competitive without being dominant, consistently in the mix without quite breaking through to the very front. That's not a bad place to be—it means you're close, and close can become breakthrough with continued work. `;
    }
  } else {
    context += `You're building your season steadily, banking points and gaining experience with each event. `;
  }

  // Strategic/tactical context about next event (2-3 sentences)
  const nextEventType = EVENT_TYPES[nextEventNumber];
  
  if (nextStageNumber === 3 || nextStageNumber === 6 || nextStageNumber === 8) {
    context += `Stage ${nextStageNumber} presents an interesting choice from the optional events, giving you tactical flexibility to play to your strengths. `;
  }
  
  if (nextEventType === 'time trial') {
    context += `${nextEventName} awaits at Stage ${nextStageNumber}, a pure test against the clock where there's nowhere to hide and no teammates to lean on. It's just you, the bike, and the relentless ticking of the timer. This is where mental strength matters as much as physical power—the ability to sustain maximum effort when every instinct screams to back off. `;
  } else if (nextEventType === 'criterium') {
    context += `Stage ${nextStageNumber} brings ${nextEventName}, a fast and technical criterium where positioning and timing matter as much as raw power. These races are chess matches played at 40 kilometers per hour—you need to read the moves before they happen, position yourself perfectly coming out of corners, and have the snap to respond when the crucial accelerations come. `;
  } else if (nextEventType === 'hill climb') {
    context += `Next up: ${nextEventName} at Stage ${nextStageNumber}, where the road points upward and only the strongest climbers thrive. There's nowhere to hide on climbs—no drafting, no tactics, just you against gravity and everyone else suffering alongside you. The riders who love these events are a special breed, and you'll find out if you're one of them. `;
  } else if (nextEventType === 'gran fondo' || nextEventType === 'gravel race') {
    context += `${nextEventName} looms at Stage ${nextStageNumber}—a long-distance test of endurance, tactics, and mental resilience. These events aren't won in a single moment but across hours of sustained effort, through accumulated small decisions that either leave you fresh for the finale or spent too early. Patience and pacing are everything. `;
  } else if (nextEventType === 'points race') {
    context += `Stage ${nextStageNumber} is ${nextEventName}, a points race where consistency across multiple sprints matters more than a single explosive effort. You'll need to be alert for every intermediate sprint, positioned well each time, and smart about when to commit fully versus when to take what you can get. It's about accumulation rather than one decisive moment. `;
  } else if (nextEventType === 'track elimination') {
    context += `${nextEventName} awaits at Stage ${nextStageNumber}—a velodrome elimination race where one moment of inattention can end your day. The format is unforgiving: every lap, the last rider across the line is eliminated, and this continues until only the winner remains. You'll need sharp positioning, constant vigilance, and the ability to respond instantly when someone else makes a move. `;
  } else if (nextEventType === 'road race') {
    context += `Stage ${nextStageNumber} brings ${nextEventName}, a classic road race where tactics, teamwork, and individual strength all play their part. These events can unfold in countless ways—early breakaways, late attacks, sprint finishes—and you'll need to read the race correctly and be ready for anything. `;
  } else if (nextEventType === 'stage race') {
    if (nextEventNumber === 13) {
      context += `The Local Tour begins at Stage ${nextStageNumber}, a three-stage challenge that will test your ability to perform day after day. Stage racing is different from one-day events—you need to manage effort across multiple days, recover quickly, and stay mentally sharp when fatigue accumulates. It's as much about consistency as peak performance. `;
    } else {
      context += `${nextEventName} continues the Local Tour—you're into the multi-day grind now where recovery, consistency, and mental resilience separate the contenders from the pretenders. `;
    }
  } else {
    context += `Stage ${nextStageNumber} brings ${nextEventName}, the next challenge in a season that's far from over. `;
  }

  // Closing - motivational/forward-looking (1-2 sentences)
  if (stagesCompleted <= 3) {
    context += `The season is still young, with plenty of racing ahead, but you're learning what you're capable of and where you can push harder. `;
  } else if (stagesCompleted <= 6) {
    context += `With the season past halfway, there's still time to make moves, to bank more points, and to climb higher in the standings. `;
  } else {
    context += `The season is entering its closing chapters, and every stage from here carries extra weight. `;
  }

  if (isOnStreak) {
    context += `Given your current form, it's an opportunity to keep the momentum rolling and see just how far this winning streak can go. The season isn't decided by any single race, and right now, you're exactly where you need to be to make a serious push toward the top.`;
  } else if (recentResults && recentResults[0] <= 5) {
    context += `You're racing well, competing at the sharp end, and showing you belong in the conversation with the strongest riders. The season isn't decided by any single race, and right now, you're exactly where you need to be to make a push when it counts most.`;
  } else if (recentResults && recentResults[0] >= 25) {
    context += `The results haven't matched your hopes yet, but that's the thing about racing—one good result can change everything and shift momentum completely. You're gaining experience with each race, and that experience becomes wisdom that produces better results. Keep showing up, keep working, and the breakthrough will come.`;
  } else {
    context += `Not every result will be spectacular, and not every race will be a breakthrough, but consistency builds campaigns and dedication produces improvement. The season is far from over, and you're in a good place to tackle whatever comes next.`;
  }

  return context;
}

/**
 * Main function to generate complete story
 */
function generateRaceStory(raceData, seasonData) {
  const eventName = EVENT_NAMES[raceData.eventNumber] || `Event ${raceData.eventNumber}`;
  
  // Special handling for Event 15 when season is complete
  if (raceData.eventNumber === 15 && seasonData.isSeasonComplete && typeof window !== 'undefined' && window.seasonCompletion) {
    console.log('Generating season completion story for Event 15');
    try {
      const seasonCompleteStory = window.seasonCompletion.generateSeasonCompleteStory({
        position: raceData.position,
        seasonRank: seasonData.seasonRank,
        totalPoints: seasonData.totalPoints,
        totalWins: seasonData.totalWins,
        totalPodiums: seasonData.totalPodiums,
        localTourGCPosition: seasonData.localTourGCPosition,
        earnedSeasonPodium: seasonData.seasonRank && seasonData.seasonRank <= 3
      });
      
      return {
        recap: seasonCompleteStory,
        context: '' // No additional context needed for season complete
      };
    } catch (error) {
      console.error('Error generating season complete story:', error);
      // Fall through to regular story generation
    }
  }
  
  const recapData = {
    ...raceData,
    eventName,
    isFirstRace: seasonData.stagesCompleted === 1  // Add flag for first race
  };

  const contextData = {
    ...seasonData,
    nextEventName: EVENT_NAMES[seasonData.nextEventNumber] || `Event ${seasonData.nextEventNumber}`
  };

  return {
    recap: generateRaceRecap(recapData),
    context: generateSeasonContext(contextData)
  };
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateRaceStory, EVENT_NAMES };
} else if (typeof window !== 'undefined') {
  window.storyGenerator = { generateRaceStory, EVENT_NAMES };
}
