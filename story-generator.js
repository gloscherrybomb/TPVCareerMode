// story-generator.js v3.0 - Comprehensive race story generation
// Features: Narrative database integration (277 stories), race-type awareness, detailed recaps, varied closings

// Import shared event configuration
const { EVENT_NAMES, EVENT_TYPES, OPTIONAL_EVENTS } = require('./event-config');

/**
 * Format number as ordinal (1st, 2nd, 3rd, 21st, 22nd, 23rd, etc.)
 * @param {number} num - The number to format
 * @returns {string} The number with ordinal suffix (e.g., "1st", "21st")
 */
function formatOrdinal(num) {
  if (!num || typeof num !== 'number' || !Number.isInteger(num) || num < 1) return '';
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}

/**
 * Determine performance tier based on position
 * @param {number|string} position - The finishing position (or 'DNF')
 * @returns {string} The tier: 'win', 'podium', 'top10', 'midpack', or 'back'
 */
function getPerformanceTier(position) {
  if (position === 'DNF' || !position) return 'back';
  if (position === 1) return 'win';
  if (position <= 3) return 'podium';
  if (position <= 10) return 'top10';
  if (position <= 20) return 'midpack';
  return 'back';
}

/**
 * Helper to randomly pick from an array of variants
 * @param {Array} variants - Array of variant strings
 * @returns {*} A randomly selected element from the array
 */
function pickRandom(variants) {
  return variants[Math.floor(Math.random() * variants.length)];
}

// Optional event descriptions by type (local - specific to narrative generation)
const OPTIONAL_EVENT_INFO = {
  6: { type: "hill climb", shortDesc: "climb" },
  7: { type: "criterium", shortDesc: "criterium" },
  8: { type: "gran fondo", shortDesc: "endurance challenge" },
  9: { type: "hill climb", shortDesc: "mountain stage" },
  10: { type: "time trial", shortDesc: "time trial" },
  11: { type: "points race", shortDesc: "points race" },
  12: { type: "gravel race", shortDesc: "gravel race" }
};

/**
 * Get a default transition phrase when narrative database selection fails
 * These are generic fallbacks - the real variety comes from the database
 */
function getDefaultTransition(tier) {
  const defaults = {
    win: "The victory was still sinking in as you headed home, already thinking about what comes next.",
    podium: "The podium finish left you buzzing as the evening wound down.",
    top10: "A solid result to process on the drive home.",
    midpack: "The race replayed itself in your mind on the way home.",
    back: "A tough day, but tomorrow's another opportunity."
  };
  return defaults[tier] || defaults.midpack;
}

/**
 * Analyze race dynamics based on time gaps and position
 * Returns enhanced context about how the race finished
 *
 * Bunch sprint: Many riders within ~5s of winner (field together)
 * Small group: Winner + few riders broke away together (tight gaps within, big gap behind)
 * Solo/breakaway: Winner alone or with clear gap
 * Chase group: User's group finishing together but significantly behind winner(s)
 *
 * Note: For elimination races (event 3) and time challenges (event 4), time-based
 * dynamics are not meaningful and position-based dynamics are returned instead.
 */
function analyzeRaceDynamics(raceData) {
  const { position, winMargin, lossMargin, eventNumber } = raceData;

  // For elimination races and time trials, times don't reflect normal race dynamics
  // Handle each type with appropriate terminology

  // Event 3: Elimination race - riders eliminated at intervals
  if (eventNumber === 3) {
    if (position === 1) return { type: 'elimination_winner', gap: 0, description: 'survived to the end' };
    if (position <= 3) return { type: 'elimination_podium', gap: 0, description: 'finished on the podium' };
    if (position <= 10) return { type: 'elimination_top10', gap: 0, description: 'solid finish' };
    return { type: 'elimination_finish', gap: 0, description: 'finished the race' };
  }

  // Event 4: Time trial - distance covered in fixed time determines position
  if (eventNumber === 4) {
    if (position === 1) return { type: 'tt_winner', gap: 0, description: 'set the fastest time' };
    if (position <= 3) return { type: 'tt_podium', gap: 0, description: 'posted a podium time' };
    if (position <= 10) return { type: 'tt_top10', gap: 0, description: 'solid time trial' };
    return { type: 'tt_finish', gap: 0, description: 'completed the time trial' };
  }

  if (position === 1 && winMargin > 0) {
    // Winner's perspective - how they won
    if (winMargin > 60) return { type: 'solo_victory', gap: winMargin, description: 'rode away solo' };
    if (winMargin > 30) return { type: 'breakaway_win', gap: winMargin, description: 'broke clear' };
    if (winMargin > 10) return { type: 'small_group', gap: winMargin, description: 'won from a small group' };
    // Small margin = bunch sprint (many riders close together)
    return { type: 'bunch_sprint', gap: winMargin, description: 'won the bunch sprint' };
  }

  if (position > 1 && lossMargin > 0) {
    // Non-winner's perspective - how they finished
    if (lossMargin < 1) return { type: 'photo_finish', gap: lossMargin, description: 'photo finish' };
    // Within 5 seconds of winner = part of bunch sprint (field together)
    if (lossMargin < 5) return { type: 'bunch_sprint', gap: lossMargin, description: 'bunch sprint' };
    // 5-30 seconds = small group finished together but clear gap to winner(s)
    if (lossMargin < 30) return { type: 'small_gap', gap: lossMargin, description: 'small group' };
    // 30-90 seconds = chase group (together with others, but chasing leaders)
    if (lossMargin < 90) return { type: 'chase_group', gap: lossMargin, description: 'chase group' };
    // 90+ seconds = significantly behind
    return { type: 'well_back', gap: lossMargin, description: 'well behind' };
  }

  return { type: 'unknown', gap: 0, description: '' };
}

/**
 * Format time gap into readable text with context-aware descriptions
 */
function formatGapText(seconds, context = 'neutral') {
  if (!seconds || seconds === 0) return '';
  
  // Very close finishes
  if (seconds < 0.3) return 'inches';
  if (seconds < 0.5) return 'a bike throw';
  if (seconds < 1) return 'less than a second';
  
  // Small gaps - use exact seconds for sprint contexts
  if (seconds < 5) {
    const rounded = Math.round(seconds);
    return context === 'sprint' ? `${rounded} second${rounded !== 1 ? 's' : ''}` : `${rounded} seconds`;
  }
  
  // Medium gaps - mix exact and descriptive
  if (seconds < 10) {
    const rounded = Math.round(seconds);
    return context === 'dramatic' ? `${rounded} crucial seconds` : `${rounded} seconds`;
  }
  
  if (seconds < 20) {
    const rounded = Math.round(seconds);
    return `${rounded} seconds`;
  }
  
  if (seconds < 30) {
    return `${Math.round(seconds)} seconds`;
  }
  
  // Larger gaps - use descriptive language
  if (seconds < 40) return 'half a minute';
  if (seconds < 50) return 'around 45 seconds';
  if (seconds < 60) return 'nearly a minute';
  
  // Very large gaps - minutes format
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  
  if (minutes === 1 && secs < 5) return 'just over a minute';
  if (minutes === 1 && secs < 30) return `${minutes}:${secs.toString().padStart(2, '0')}`;
  if (minutes === 1) return 'over a minute and a half';
  if (minutes === 2 && secs < 5) return 'just over two minutes';
  if (minutes < 3) return `${minutes}:${secs.toString().padStart(2, '0')}`;
  if (minutes < 5) return `over ${minutes} minutes`;
  if (minutes < 10) return `around ${minutes} minutes`;
  if (minutes < 15) return `over ${minutes} minutes`;
  if (minutes < 30) return `nearly ${Math.round(minutes / 5) * 5} minutes`;
  if (minutes < 45) return 'over half an hour';
  if (minutes < 60) return 'nearly an hour';

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours === 1 && remainingMins < 15) return 'just over an hour';
  if (hours === 1) return `over an hour`;
  return `over ${hours} hours`;
}

/**
 * Get a descriptive phrase for a time gap
 */
function getGapDescription(seconds, ahead = true) {
  if (!seconds || seconds === 0) return '';
  
  if (seconds < 1) return ahead ? 'by the narrowest of margins' : 'just behind';
  if (seconds < 3) return ahead ? 'in a tight sprint' : 'in the same sprint';
  if (seconds < 10) return ahead ? 'with a small gap' : 'not far behind';
  if (seconds < 30) return ahead ? 'with a comfortable margin' : 'chasing hard';
  if (seconds < 60) return ahead ? 'with a decisive gap' : 'well back';
  
  return ahead ? 'with a commanding lead' : 'far behind';
}

/**
 * Select a variant based on event number and context
 * Prioritizes contextually appropriate variants while maintaining some variety
 */
function selectVariant(eventNumber, position, variantCount, context = {}) {
  // Base seed for some determinism
  const seed = eventNumber * 100 + position;
  
  // Context-based prioritization
  const {
    hasWinnerName = false,
    hasLargeGap = false,  // gap > 30s
    predictionTier = 'matched'
  } = context;
  
  // If we have strong context signals, bias toward relevant variants
  if (predictionTier === 'beat' || predictionTier === 'crushed') {
    // Use variants 0 or 1 for beat-predictions content
    return seed % 2;
  }
  
  if (hasLargeGap && variantCount >= 3) {
    // Use variants that mention gaps (typically 1, 2, or 3)
    const gapVariants = [1, 2, 3];
    return gapVariants[seed % gapVariants.length];
  }
  
  if (hasWinnerName && variantCount >= 3) {
    // Use variants that can mention winner names (typically 0, 1, 4)
    // Apply modulo when selecting to avoid out-of-bounds, not when building array
    const nameVariants = [0, 1, Math.min(4, variantCount - 1)];
    return nameVariants[seed % nameVariants.length];
  }
  
  // Default: use standard modulo for variety
  return seed % variantCount;
}

/**
 * Build winner context text (helper to avoid nested template literals)
 */
function buildWinnerText(hasWinnerName, winnerName, gapText, suffix = '') {
  const winner = hasWinnerName ? winnerName : 'The winner';
  if (gapText) {
    return `${winner} finished ${gapText} ahead${suffix}`;
  }
  return `${winner} rode away${suffix}`;
}

/**
 * Generate intro paragraph using narrative database
 * Falls back to generic intro if database unavailable
 */
async function generateIntroParagraph(raceData, seasonData, riderId, narrativeSelector, db) {
  // If narrative database is available, try to use it
  if (narrativeSelector && narrativeSelector.generateIntroStory) {
    try {
      const narrativeContext = {
        eventNumber: raceData.eventNumber,
        eventName: raceData.eventName,
        position: raceData.position,
        predictedPosition: raceData.predictedPosition,
        performanceTier: raceData.position === 1 ? 'win' :
                        raceData.position <= 3 ? 'podium' :
                        raceData.position <= 10 ? 'top10' :
                        raceData.position <= 20 ? 'midpack' : 'back',
        // DEPRECATED: totalPoints from seasonData is season-specific (from season1Points)
        totalPoints: seasonData.totalPoints,
        totalWins: seasonData.totalWins,
        totalPodiums: seasonData.totalPodiums || 0,
        recentResults: seasonData.recentResults || [],
        isFirstWin: raceData.position === 1 && seasonData.totalWins === 1,
        isWorseResult: raceData.position > raceData.predictedPosition + 3,
        raceType: EVENT_TYPES[raceData.eventNumber],
        isContributor: seasonData.isContributor || false,
        // Additional context for improved story selection
        racesCompleted: seasonData.stagesCompleted || 1,
        stagesCompleted: seasonData.stagesCompleted || 1,
        personality: seasonData.personality || null,
        topRivals: seasonData.topRivals || [],
        seasonRank: seasonData.seasonPosition || null,
        // Interview gating - personality stories require at least 1 interview
        interviewsCompleted: seasonData.interviewsCompleted || 0
      };
      
      const introMoment = await narrativeSelector.generateIntroStory(
        riderId,
        narrativeContext,
        db
      );
      
      if (introMoment) {
        console.log(`   ✓ Using narrative database intro moment`);
        return introMoment;
      }
    } catch (error) {
      console.log(`   ⚠️ Narrative database unavailable (${error.message}), using generic intro`);
    }
  }
  
  // Fallback: Generate generic intro
  return generateGenericIntro(raceData, seasonData);
}

/**
 * Generate generic intro when narrative database unavailable
 */
function generateGenericIntro(raceData, seasonData) {
  const { eventName, isFirstRace } = raceData;
  const eventType = EVENT_TYPES[raceData.eventNumber];
  
  if (isFirstRace) {
    return `The pre-race jitters for ${eventName} were real—your first event of the season, your first chance to see how the winter training paid off. Standing on the start line surrounded by competitors, some familiar faces from last season and many unknowns, you felt that familiar cocktail of nervousness and excitement that comes with racing.`;
  }
  
  // Race-type specific intros
  if (eventType === 'time trial') {
    return `The night before ${eventName}, you couldn't stop thinking about pacing strategy. Time trials are mentally exhausting even before they start—knowing that every watt matters, that there's no pack to hide in, that the clock will reveal exactly how strong you are that day.`;
  }
  
  if (eventType === 'track elimination') {
    return `The velodrome atmosphere before ${eventName} was electric—the wooden boards echoing with warmups, riders practicing their positioning on the banking, everyone knowing that one lap of inattention could end their day early.`;
  }
  
  if (eventType === 'hill climb') {
    return `Looking up at the climb before ${eventName}, you ran through your strategy one more time. Hill climbs are brutally honest—there's nowhere to hide when it's just you and gravity, nowhere to recover when the gradient kicks up.`;
  }
  
  if (eventType === 'stage race') {
    const stageNum = raceData.eventNumber - 12;
    if (stageNum === 1) {
      return `The Local Tour was finally here. Three stages over three days—this wasn't just about today's result but about managing effort across multiple days, about racing smart when your legs are already tired from yesterday.`;
    } else if (stageNum === 2) {
      return `Waking up on Stage 2 of the Local Tour, you could feel yesterday's effort still in your legs. That deep fatigue that comes from racing hard less than 24 hours ago, the knowledge that you need to do it again today and tomorrow.`;
    } else {
      return `The queen stage. Two days of racing in your legs, and the hardest day still ahead. The Local Tour comes down to this—one last effort to defend or improve your GC position.`;
    }
  }
  
  // Generic intro
  return `The days leading up to ${eventName} had been about preparation and anticipation. You'd studied the course, planned your strategy, done the training—now it was time to execute and see where you stood against the field.`;
}

/**
 * CONDENSED NARRATIVES DATABASE (~82 variations)
 * Used for Discord notifications and results feed
 * Each narrative is ~50-70 words with template placeholders
 */
const CONDENSED_NARRATIVES = {
  dnf: [
    "{eventName} ended before you wanted it to. A DNF is never part of the plan, but racing is unforgiving. Zero points, a blank in the standings, and lessons to process.",
    "The day at {eventName} didn't go to plan. Sometimes the race wins, leaving you with nothing but a DNF and the long drive home replaying what went wrong.",
    "A mechanical? A crash? Whatever happened at {eventName}, the result is the same: DNF. No points, no finish, just the bitter taste of unfinished business.",
    "Racing owes you nothing, and {eventName} proved it. A DNF cuts deep—all that preparation, all that effort, and you're left standing by the roadside watching others ride past.",
    "{eventName} joins the list of races that didn't go your way. DNF. The letters sting, but every rider knows this feeling. It's not about falling down—it's about showing up again."
  ],

  win: {
    darkHorse: [
      "Nobody saw this coming. The predictions had you finishing {predictedPosition} at {eventName}—an afterthought, mid-pack at best. But racing isn't run on spreadsheets. {dynamicsText} P1. The upset of the day.",
      "From {predictedPosition} predicted to P1 at {eventName}. You weren't supposed to be in the mix, let alone winning. Sometimes the race rewards those who refuse to accept their place in the pecking order.",
      "The spreadsheets had you at {predictedPosition}. Reality had other ideas. {eventName} became your statement race—proving that predictions mean nothing once the flag drops. First place, against all expectations.",
      "Call it an upset, call it a breakthrough—{eventName} rewrote the script. From {predictedPosition} predicted to standing on the top step. The kind of result that changes how others see you.",
      "When you lined up at {eventName}, nobody was watching you. Predicted {predictedPosition}, easy to overlook. {dynamicsText} Now everyone knows your name. P1—the dark horse delivers."
    ],

    domination: [
      "{eventName} was a statement ride. From the early kilometers, you rode with the confidence of someone who knew they had the legs. {dynamicsText} The kind of day where fitness, tactics, and timing align perfectly.",
      "Some victories are earned in the final meters. This one at {eventName} was earned from the gun. You controlled the race, dictated the tempo, and {dynamicsText} Dominance personified.",
      "Total control at {eventName}. You made the race look easy—not because it was, but because you were simply better today. {dynamicsText} A masterclass in racing.",
      "{eventName} belonged to you from the moment you clipped in. When you have legs like this, the race becomes a formality. {dynamicsText} First place, never in doubt.",
      "Days like {eventName} are what you train for. Everything clicked—the legs, the tactics, the timing. {dynamicsText} You didn't just win; you showed everyone what you're capable of."
    ],

    closeCall: [
      "{eventName} came down to the wire in the most dramatic fashion. {dynamicsText} You emerged with the win{gapTextSuffix}. Inches separated glory from frustration, and this time, the inches went your way.",
      "Heart-stopping doesn't begin to describe the finish at {eventName}. {dynamicsText} You got the win{gapTextSuffix}—the smallest of margins making the biggest of differences.",
      "The kind of finish at {eventName} that makes cycling addictive. {dynamicsText} When the photo came through, your number was first{gapTextSuffix}. Breathe. You won.",
      "{eventName} was decided by millimeters. The sprint was desperate, bodies and bikes tangled at the line. {dynamicsText} First place{gapTextSuffix}. You'll take it—narrowly.",
      "Bike throw. Photo finish. An agonizing wait at {eventName}. {dynamicsText} Your name came up first{gapTextSuffix}. The kind of victory that ages you, but you wouldn't trade it."
    ],

    default: [
      "{eventName} delivered the result you came for. You rode with purpose from the start, staying patient when others burned matches early, positioning yourself for the finale. {dynamicsText} First place.",
      "Victory at {eventName}. You executed the plan, rode smart when it mattered, and finished where you wanted to be—on the top step. {dynamicsText} P1, mission accomplished.",
      "First place at {eventName}. Not luck, not circumstance—you earned this one through smart racing and strong legs. {dynamicsText} The win goes to those who want it most.",
      "{eventName} goes in the win column. You read the race well, stayed out of trouble, and delivered when it counted. {dynamicsText} First is first, and today first is you.",
      "The work paid off at {eventName}. When the race reached its decisive moment, you were ready. {dynamicsText} Victory—the result that justifies all the training.",
      "Top step at {eventName}. You raced with confidence, made the right moves at the right times, and crossed the line first. {dynamicsText} This is why you race.",
      "{eventName} produced exactly what you came for: P1. Smart racing, good positioning, and the legs to back it up when it mattered. {dynamicsText} Winner's circle.",
      "Another day, another victory—{eventName} proved the form is real. {dynamicsText} First place. The kind of result that builds momentum."
    ]
  },

  podium: {
    second: {
      photoFinish: [
        "So close at {eventName}. The finish came down to a desperate sprint—{dynamicsText} You crossed the line{gapTextSuffix}, close enough to taste victory, far enough to know you came up short. Second, but it stings.",
        "Inches from glory at {eventName}. The photo finish went the wrong way—{dynamicsText} P2 when P1 was right there{gapTextSuffix}. Racing can be cruel.",
        "{eventName} was decided at the line. You threw your bike, gave everything, and came up just short{gapTextSuffix}. Second place in a photo finish—so close, yet so far.",
        "The cruelest second place at {eventName}. A bike length, a wheel, maybe less{gapTextSuffix}. {dynamicsText} P2 when victory was there for the taking."
      ],
      default: [
        "Second at {eventName}. You rode a tactically smart race, positioning yourself well through the key moments. {winnerText} had the edge when it mattered{winnerGapSuffix}. Still, second is second—solid points.",
        "P2 at {eventName}. You were in the fight until the end, just not quite strong enough to take the top step{gapTextSuffix}. A podium finish and points in the bank.",
        "Runner-up at {eventName}. The winner was slightly stronger today, but you were right there challenging{gapTextSuffix}. Second place—frustrating and encouraging in equal measure.",
        "A strong ride at {eventName} nets you second place. {winnerText} proved too good{winnerGapSuffix}, but you showed you belong at the front of this field.",
        "{eventName} rewarded consistent, smart racing with P2. Not the win, but proof you can compete with the best{gapTextSuffix}. The podium is the podium.",
        "Second place at {eventName}. Close enough to the victory to hurt, good enough to stand on the podium. {winnerText} had the legs today{winnerGapSuffix}. Next time."
      ]
    },
    third: {
      beatPredictions: [
        "The predictions had you finishing around {predictedPosition} at {eventName}, well off the podium. But racing doesn't follow spreadsheets. Third place—ahead of where anyone expected.",
        "From {predictedPosition} predicted to P3 at {eventName}. You exceeded expectations and earned a podium spot through determination and smart racing. Better than anyone thought possible.",
        "Predicted {predictedPosition}, finished third at {eventName}. The numbers said you'd be mid-pack; the race said otherwise. Form on the day matters more than pre-race predictions.",
        "A surprise podium at {eventName}. Nobody had you finishing P3 from a prediction of {predictedPosition}, but you rode above yourself and made the box."
      ],
      default: [
        "{eventName} rewarded smart, patient racing. You stayed out of trouble, moved up when it mattered, and claimed the final podium spot{gapTextSuffix}. Third isn't first, but you stood on the podium.",
        "Third place at {eventName}. You fought for every position in the finale and secured a spot on the podium{gapTextSuffix}. Solid points and proof of good form.",
        "P3 at {eventName}. The podium was the target, and you delivered. {dynamicsText} Three steps, and you're on one of them{gapTextSuffix}.",
        "{eventName} yields a podium finish. You rode smart, positioned well, and took third when others faded{gapTextSuffix}. Mission accomplished.",
        "Bronze at {eventName}. Not the color you wanted, but a podium is a podium. You raced well and earned your spot{gapTextSuffix}.",
        "Third place at {eventName}. You gave everything in the finale and held on for a podium spot{gapTextSuffix}. Points earned, result banked."
      ]
    }
  },

  top10: {
    beatPredictions: [
      "A solid {position} at {eventName}—better than the {predictedPosition} the predictions suggested. You rode smart and finished stronger than expected.",
      "{position} at {eventName}, well ahead of the {predictedPosition} prediction. The form is clearly better than the numbers suggested—encouraging signs.",
      "Predicted {predictedPosition}, finished {position} at {eventName}. When the race unfolded, you were ready to capitalize and beat expectations.",
      "The spreadsheet said {predictedPosition}. The result at {eventName} says {position}. Racing rewards those who outperform their billing.",
      "From {predictedPosition} predicted to {position} at {eventName}. A result that shows the trajectory is upward. Better than expected, and better still to come."
    ],

    worseThanExpected: [
      "{position} at {eventName}—not the result you were hoping for. When the race split, you couldn't quite go with the strongest riders. Still points, but below expectations.",
      "Finishing {position} at {eventName} leaves you wanting more. Predicted {predictedPosition}, the legs just weren't there when it mattered. A day to forget.",
      "{position} at {eventName}. The predictions had you higher at {predictedPosition}, but racing rarely goes to script. Points earned, but room for improvement.",
      "Below expectations at {eventName} with {position}. You were predicted {predictedPosition}, and the gap between expectation and reality stings.",
      "{position} at {eventName}—not what you came for. Predicted {predictedPosition}, you missed the key move and had to settle for chasing shadows."
    ],

    default: [
      "{position} at {eventName}. {dynamicsText} A solid result that keeps the season moving forward.",
      "A respectable {position} at {eventName}. Not spectacular, but far from a disaster. {dynamicsText} Points in the bank.",
      "{position} at {eventName}. You stayed with the front selection and finished in the mix{gapTextSuffix}. Steady progress.",
      "Finishing {position} at {eventName}. The top 10 is respectable—{dynamicsText} Building toward bigger things.",
      "{position} at {eventName}. Neither brilliant nor disappointing—a workmanlike result that keeps things ticking over{gapTextSuffix}.",
      "Top 10 at {eventName} with {position}. {dynamicsText} Consistent, competitive, and moving in the right direction."
    ]
  },

  midpack: {
    beatPredictions: [
      "{position} at {eventName}—better than the {predictedPosition} predicted, which counts for something. Part of a day spent learning and competing.",
      "Predicted {predictedPosition}, finished {position} at {eventName}. Not headline-worthy, but better than expected. Small victories matter.",
      "{position} at {eventName}, beating the {predictedPosition} prediction. In the middle of the pack, but trending the right way.",
      "A {position} that beats the {predictedPosition} prediction at {eventName}. Outperforming expectations, even if the result itself is modest."
    ],

    default: [
      "{position} at {eventName}. Not the result you wanted, but you stayed in the race and gathered experience. Points banked, lessons learned.",
      "Mid-pack at {eventName} with {position}. The leaders finished {gapText} up the road. Not every race is your race, but you showed up and competed.",
      "{position} at {eventName}. A quiet day in the bunch, finishing where the road took you. Sometimes racing is about survival as much as success.",
      "Finishing {position} at {eventName}. The top end was out of reach today, but you're still racing, still learning, still building.",
      "{position} at {eventName}. An anonymous result, but there's value in every finish. The experience counts even when the position doesn't."
    ]
  },

  back: {
    beatPredictions: [
      "{position} at {eventName}—well ahead of the {predictedPosition} predicted. Not a headline result, but significantly better than expected. Progress is progress.",
      "Predicted {predictedPosition}, finished {position} at {eventName}. The numbers are still modest, but you beat expectations. That's something to build on.",
      "From {predictedPosition} predicted to {position} at {eventName}. Still toward the back, but further forward than anyone expected. Small steps.",
      "{position} at {eventName}, beating the {predictedPosition} prediction. Not where you want to be, but better than where you were supposed to be."
    ],

    default: [
      "A tough day at {eventName}, finishing {position}. The leaders were {gapText} up the road. Sometimes racing delivers hard lessons. The question is what you do with them.",
      "{position} at {eventName}. A day to forget, deep in the results sheet. But you finished, and finishing is something.",
      "Bringing up the rear at {eventName} with {position}. The race was decided far ahead—you finished{gapTextSuffix}. Days like this test your resolve.",
      "{position} at {eventName}. Well off the pace, watching the race unfold from behind. Tough, but you crossed the line.",
      "Finishing {position} at {eventName}. A humbling result, but every finish adds to the experience bank. The road back to the front starts with showing up."
    ]
  }
};

/**
 * Select a random narrative from an array and process templates
 */
function selectCondensedNarrative(templates, data) {
  const index = Math.floor(Math.random() * templates.length);
  return processCondensedTemplate(templates[index], data);
}

/**
 * Process template placeholders in condensed narratives
 */
function processCondensedTemplate(template, data) {
  const {
    eventName,
    position,
    predictedPosition,
    gapText,
    winnerName,
    dynamicsText,
    gapTextSuffix,
    winnerGapSuffix
  } = data;

  return template
    .replace(/\{eventName\}/g, eventName || 'the race')
    .replace(/\{position\}/g, formatOrdinal(position))
    .replace(/\{predictedPosition\}/g, formatOrdinal(predictedPosition))
    .replace(/\{gapText\}/g, gapText || '')
    .replace(/\{gapTextSuffix\}/g, gapTextSuffix || '')
    .replace(/\{winnerGapSuffix\}/g, winnerGapSuffix || '')
    .replace(/\{winnerText\}/g, winnerName && winnerName !== 'the winner' ? winnerName : 'The winner')
    .replace(/\{dynamicsText\}/g, dynamicsText || '');
}

/**
 * Generate CONDENSED race recap (~50-70 words)
 * Shorter version without self-contained conclusions
 * Used in the two-part narrative structure
 */
function generateRaceRecapCondensed(data) {
  const {
    eventNumber,
    eventName,
    position,
    predictedPosition,
    winMargin,
    lossMargin,
    winnerName,
    earnedDarkHorse,
    earnedDomination,
    earnedCloseCall
  } = data;

  const isDNF = position === 'DNF';
  const placeDiff = predictedPosition - position;
  const dynamics = analyzeRaceDynamics(data);
  const hasWinnerName = winnerName && winnerName !== 'the winner';
  const gapText = formatGapText(position === 1 ? winMargin : lossMargin);

  // Build dynamic text based on race dynamics
  const getDynamicsText = (pos) => {
    if (dynamics.type === 'bunch_sprint') {
      const sprintTexts = [
        'The sprint was chaos, riders everywhere, and you timed it perfectly.',
        'When the sprint opened up, you found the gap and powered through.',
        'The bunch sprint was a mess of elbows and wheels—you navigated it perfectly.',
        'In the chaos of the final sprint, your positioning proved decisive.'
      ];
      return sprintTexts[Math.floor(Math.random() * sprintTexts.length)];
    }
    if (dynamics.type === 'solo_victory') {
      if (gapText) {
        return `You attacked and rode away solo, finishing ${gapText} clear.`;
      }
      return 'You attacked at the right moment and never looked back.';
    }
    if (dynamics.type === 'photo_finish') {
      return 'Multiple riders hit the line together, bikes thrown forward.';
    }
    if (dynamics.type === 'chase_group') {
      return gapText ? `The front group rode away with ${gapText} on the chase.` : 'You finished in the chase group.';
    }
    if (pos === 1 && gapText) {
      return `When the race reached its decisive moment, you proved strongest, winning by ${gapText}.`;
    }
    if (pos === 1) {
      return 'When the race reached its decisive moment, you were ready.';
    }
    if (gapText) {
      return `You finished ${gapText} behind the winner.`;
    }
    return 'You crossed the line with the group.';
  };

  // Build gap suffix for templates (user perspective - "you were X behind")
  const getGapSuffix = () => {
    if (!gapText) return '';
    if (position === 1) return ` by ${gapText}`;
    return `, ${gapText} behind`;
  };

  // Build winner gap suffix for templates (winner perspective - "winner finished X ahead")
  const getWinnerGapSuffix = () => {
    if (!gapText || position === 1) return '';
    return `, finishing ${gapText} ahead`;
  };

  // Template data for narrative processing
  const templateData = {
    eventName,
    position,
    predictedPosition,
    gapText,
    gapTextSuffix: getGapSuffix(),
    winnerGapSuffix: getWinnerGapSuffix(),
    winnerName,
    dynamicsText: getDynamicsText(position)
  };

  // Handle DNF
  if (isDNF) {
    return selectCondensedNarrative(CONDENSED_NARRATIVES.dnf, templateData);
  }

  // Determine tier
  const tier = getPerformanceTier(position);

  // WIN condensed recaps
  if (tier === 'win') {
    if (earnedDarkHorse) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.win.darkHorse, templateData);
    }
    if (earnedDomination) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.win.domination, templateData);
    }
    if (earnedCloseCall) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.win.closeCall, templateData);
    }
    return selectCondensedNarrative(CONDENSED_NARRATIVES.win.default, templateData);
  }

  // PODIUM condensed recaps
  if (tier === 'podium') {
    if (position === 2) {
      if (dynamics.type === 'photo_finish' || lossMargin < 1) {
        return selectCondensedNarrative(CONDENSED_NARRATIVES.podium.second.photoFinish, templateData);
      }
      return selectCondensedNarrative(CONDENSED_NARRATIVES.podium.second.default, templateData);
    }
    // 3rd place
    if (placeDiff >= 5) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.podium.third.beatPredictions, templateData);
    }
    return selectCondensedNarrative(CONDENSED_NARRATIVES.podium.third.default, templateData);
  }

  // TOP 10 condensed recaps
  if (tier === 'top10') {
    if (placeDiff >= 5) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.top10.beatPredictions, templateData);
    }
    if (placeDiff <= -3) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.top10.worseThanExpected, templateData);
    }
    return selectCondensedNarrative(CONDENSED_NARRATIVES.top10.default, templateData);
  }

  // MIDPACK condensed recaps
  if (tier === 'midpack') {
    if (placeDiff >= 5) {
      return selectCondensedNarrative(CONDENSED_NARRATIVES.midpack.beatPredictions, templateData);
    }
    return selectCondensedNarrative(CONDENSED_NARRATIVES.midpack.default, templateData);
  }

  // BACK condensed recaps
  if (placeDiff >= 10) {
    return selectCondensedNarrative(CONDENSED_NARRATIVES.back.beatPredictions, templateData);
  }
  return selectCondensedNarrative(CONDENSED_NARRATIVES.back.default, templateData);
}

/**
 * Generate race recap paragraph based on performance
 * ENHANCED VERSION v2.0 with contextual awareness of time gaps, winner names, and race dynamics
 * Features: More variants per tier, better gap awareness, contextual bot name usage
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
    isFirstRace,
    winnerName,
    secondPlaceName,
    gcPosition,
    gcGap,
    recentResults
  } = data;

  const eventType = EVENT_TYPES[eventNumber];
  const isDNF = position === 'DNF';

  // Handle DNF case first
  if (isDNF) {
    const dnfVariants = [
      `${eventName} ended before you wanted it to. A DNF is never part of the plan—nobody lines up hoping to abandon—but racing is unforgiving and sometimes your day ends prematurely. Whether it was mechanical issues, physical problems, or circumstances beyond your control, the result is the same: zero points, a blank space in the standings, and the frustrating knowledge that all your preparation led to nothing today. The only consolation is that every rider experiences this at some point. It's part of the sport's brutal honesty. What matters now is how you respond—whether you let this define you or treat it as a temporary setback on a longer journey.`,

      `The race slipped away from you at ${eventName}. A DNF isn't something you ever plan for, but cycling has a way of delivering harsh lessons when you least expect them. Maybe the body wasn't cooperating, maybe the equipment failed, maybe circumstances simply conspired against you. Whatever the cause, you found yourself unable to finish—crossing no line, earning no points, having nothing to show for the effort you put into getting here. It stings. It's supposed to sting. But every professional rider knows this feeling, knows the hollow disappointment of a race that ended too soon. The measure of a competitor isn't avoiding these moments—it's coming back from them.`,

      `Not every race has a finish line moment, and ${eventName} was one of those days. A DNF sits heavy—no position, no points, just the quiet acknowledgment that today wasn't your day. The reasons almost don't matter in the immediate aftermath. What matters is the emptiness of effort unrewarded, of training and preparation that led to nothing tangible. You'll process the specifics later, figure out what went wrong, implement changes to prevent it happening again. For now, it's just disappointment, the universal experience of every athlete who's ever had to stop before the end. It happens. It hurts. You'll move forward.`
    ];

    return dnfVariants[Math.floor(Math.random() * dnfVariants.length)];
  }

  const placeDiff = predictedPosition - position;
  const dynamics = analyzeRaceDynamics(data);
  const hasWinnerName = winnerName && winnerName !== 'the winner';
  const winnerText = hasWinnerName ? winnerName : 'the winner';

  // Determine performance tier
  const tier = getPerformanceTier(position);

  // Determine prediction accuracy
  let predictionTier;
  if (placeDiff >= 10) predictionTier = 'crushed';
  else if (placeDiff >= 5) predictionTier = 'beat';
  else if (Math.abs(placeDiff) <= 1) predictionTier = 'matched';
  else if (placeDiff < 0 && placeDiff >= -5) predictionTier = 'worse';
  else predictionTier = 'much_worse';
  
  // Helper to format gaps contextually
  const formatGapContextual = (seconds, context = 'neutral') => {
    if (!seconds || seconds === 0) return '';
    
    if (seconds < 1) {
      return context === 'win' ? 'by inches' : 'by a bike length';
    } else if (seconds < 5) {
      return `${Math.round(seconds)} second${Math.round(seconds) === 1 ? '' : 's'}`;
    } else if (seconds < 10) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 30) {
      const rounded = Math.round(seconds);
      return context === 'detailed' ? `${rounded} seconds` : `around ${Math.floor(rounded / 5) * 5} seconds`;
    } else if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 90) {
      return 'just over a minute';
    } else if (seconds < 120) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const mins = Math.floor(seconds / 60);
      return `over ${mins} minute${mins === 1 ? '' : 's'}`;
    }
  };

  let recap = '';

  // ============================================================================
  // WINS - Enhanced with race dynamics, time gaps, and contextual awareness
  // ============================================================================
  if (tier === 'win') {
    if (earnedDarkHorse) {
      const variants = [
        `Nobody saw this coming. ${eventName} was supposed to be a day for others to shine—predictions had you finishing ${formatOrdinal(predictedPosition)}, well off the pace. But racing isn't run on spreadsheets and algorithms. Whatever the alchemy, you rode possessed. When the lead group splintered, you were there. When the attacks came, you covered them. And when it came down to the finale—a desperate, all-or-nothing lunge for the line—you found an extra gear that nobody knew you had. The shock on faces at the finish line was palpable. P1. Winner. Giant-slayer. The rider they didn't see coming just stole the show.`,
        
        `${eventName} will go down as the day you rewrote the script. Predicted ${formatOrdinal(predictedPosition)}—an afterthought, a mid-pack finisher at best. But from the opening moments, something felt different. The legs had snap, the mind had clarity, and when the race reached its critical phase, you were inexplicably still there. ${dynamics.type === 'bunch_sprint' ? 'The sprint came down to a mass finish, and somehow you timed it perfectly, bursting through the chaos to claim victory.' : dynamics.type === 'small_group' ? 'A small group formed at the front, and you were in it—matching the favorites, then beating them.' : 'You attacked when nobody expected it, and the gap just kept growing.'}${winMargin && winMargin > 5 ? ` You finished ${formatGapText(winMargin)} clear.` : ''} The kind of result that makes you believe anything is possible.`,
        
        `They'll be talking about this one for a while. Coming into ${eventName}, you were invisible in the predictions—${formatOrdinal(predictedPosition)}, written off before the start. But racing rewards those who show up and throw everything at it, predictions be damned. ${dynamics.type === 'solo_victory' ? `You attacked hard, rode away solo, and never looked back. ${winMargin ? `By the finish, you'd opened a ${formatGapText(winMargin)} gap.` : 'The gap just kept growing.'}` : dynamics.type === 'breakaway_win' ? `A breakaway formed, and somehow you were in it—the dark horse among the favorites. When it came down to the sprint, you had the fastest finish.` : `The race stayed together until the finale, and when everyone looked around for the winner, it was you—the one they didn't see coming.`} First place. Against all odds. These are the days that define a season.`
      ];
      recap = pickRandom(variants);
      
    } else if (earnedDomination) {
      const gapText = formatGapText(winMargin);
      
      if (eventType === 'time trial') {
        const variants = [
          `${eventName} was a clinic in pacing and power management. From the first pedal stroke, you settled into your threshold rhythm—sustainable but punishing, every watt accounted for. No pack to draft, no tactics to consider, just you versus the clock and everyone else's FTP. ${gapText ? `You crossed the line ${gapText} clear of second place` : 'The margin of victory was decisive'}. Time trials are brutally honest: the strongest rider wins, and today that was you. Pure fitness, perfectly paced, nowhere to hide.`,
          
          `Time trials strip away all the excuses. No team tactics, no draft, no luck—just raw power against the clock. ${eventName} became your proving ground. ${gapText && winMargin > 30 ? `You destroyed the field, finishing ${gapText} ahead of second place.` : gapText ? `Finishing ${gapText} clear of the competition` : 'You dominated from start to finish'}, you showed what happens when form, pacing, and mental focus align perfectly. Every rider goes through the same course, faces the same wind, climbs the same hills. Today, you were simply faster than all of them. That's the beautiful brutality of racing against the clock.`
        ];
        recap = pickRandom(variants);
        
      } else if (eventType === 'hill climb') {
        const variants = [
          `${eventName} turned into a display of climbing dominance. You versus gravity, and gravity lost. From the base of the climb, you found your rhythm—smooth, powerful pedaling, keeping your upper body relaxed while your legs did the work. ${gapText ? `By the summit, you'd opened a ${gapText} gap` : 'The gap grew with every gradient change'}. Hill climbs reward pure power-to-weight and suffering tolerance. Today you had both in abundance.`,
          
          `Some riders fear the climbs. Others embrace them. Today at ${eventName}, you owned them. ${dynamics.type === 'solo_victory' ? `You attacked early and rode away solo—a gutsy move that paid off spectacularly. ${gapText ? `By the summit, you'd put ${gapText} into everyone else.` : 'The gap grew with every pedal stroke.'}` : `The pace was high from the gun, riders getting shelled off the back one by one. You stayed calm, stayed smooth, and when the gradient kicked up further, you accelerated. ${gapText ? `You summited ${gapText} clear.` : 'You crested alone.'}`} When the road points up, the truth comes out. Today, that truth was simple: you're the strongest climber in this field.`
        ];
        recap = pickRandom(variants);
        
      } else if (eventType === 'stage race') {
        const stageText = eventNumber === 13 ? 'opening stage' : eventNumber === 14 ? 'middle stage' : 'queen stage';
        const gcGapText = gcGap ? `, ${formatGapText(gcGap)} behind the leader` : '';
        const variants = [
          `The Local Tour's ${stageText} turned into a statement ride. ${gapText ? `You finished ${gapText} ahead of your closest rival` : 'You rode away from the field'}, putting serious time into everyone else's GC hopes. ${gcPosition ? `This moves you into ${gcPosition === 1 ? 'the GC lead' : `${gcPosition}${gcPosition === 2 ? 'nd' : gcPosition === 3 ? 'rd' : 'th'} on GC${gcPosition > 1 ? gcGapText : ''}`}` : 'The overall classification implications are significant'}. Stage racing rewards consistency, but today was about dominance.`,

          `${eventName} was where you needed to make your mark, and you did so emphatically. ${dynamics.type === 'solo_victory' ? `You attacked solo and rode away from everyone. ${gapText ? `By the finish, you'd gained ${gapText} on your GC rivals.` : 'The time gaps were significant.'}` : `You were part of the winning move, and when it came down to the sprint, you had the legs to take it. ${gapText ? `The ${gapText} gap to the chasers` : 'The time gained'} could prove crucial for GC.`} ${gcPosition === 1 ? `You're now in the race lead` : gcPosition ? `You're sitting ${gcPosition}${gcPosition === 2 ? 'nd' : gcPosition === 3 ? 'rd' : 'th'} overall${gcGapText}` : `Your GC position has improved significantly`}. In stage racing, days like this can define your tour.`
        ];
        recap = pickRandom(variants);
        
      } else {
        const variants = [
          `${eventName} played out exactly as you'd hoped. From the opening lap, you settled into a rhythm that felt comfortable, controlled, and—as it turned out—untouchable. The predictions had you down for a win, and you delivered with authority. ${gapText ? `You crossed the line ${gapText} clear of the field` : 'The gap grew relentlessly'}. ${dynamics.type === 'solo_victory' ? 'You attacked, rode away, and never saw them again.' : dynamics.type === 'breakaway_win' ? 'The breakaway formed, you made it, and then you proved to be the strongest rider in it.' : 'When the sprint opened up, you already knew you had the legs to win it.'} Sometimes racing is about suffering through close calls. Today wasn't one of those days.`,
          
          `The predictions suggested a ${formatOrdinal(predictedPosition)} place finish at ${eventName}, but those numbers don't account for perfect form and better tactics. From early on, you rode with confidence that bordered on clairvoyance. ${dynamics.type === 'solo_victory' ? `You attacked hard, rode away solo, and ${gapText ? `built a ${gapText} cushion` : 'never looked back'}.` : dynamics.type === 'breakaway_win' ? `A strong move went, you made sure you were in it, and when the group hit the finish, you proved strongest. ${gapText ? `The chasers finished ${gapText} behind.` : 'The peloton was long gone.'}` : `You positioned perfectly for the sprint, launched at exactly the right moment, and ${gapText ? `won by ${gapText}` : 'took a decisive victory'}.`} These are the days when everything clicks—fitness, tactics, timing—and the result feels inevitable.`,
          
          `Domination has a feel to it. ${eventName} had that feel from the start. You weren't just racing—you were in control. Every move covered with ease, every acceleration answered with confidence. ${dynamics.type === 'solo_victory' ? `When you went solo, it wasn't desperation—it was calculation. ${gapText ? `By the line, you'd opened ${gapText}.` : 'The gap just grew.'}` : dynamics.type === 'small_group' ? `A small group formed at the front, you were in it, and when it mattered most, you were simply stronger. ${gapText ? `You finished ${gapText} clear.` : 'The win was decisive.'}` : `The bunch sprint felt more like a formality—you timed it perfectly and ${gapText ? `won by ${gapText}` : 'claimed victory clearly'}.`} This is what peak form looks like.`
        ];
        recap = pickRandom(variants);
      }
      
    } else if (earnedCloseCall) {
      const variants = [
        `${eventName} came down to the wire in the most dramatic fashion possible. From the moment the flag dropped, it was clear this would be a battle—multiple riders with the legs to win, nobody willing to concede an inch. You were in the mix throughout, trading places with the leaders, covering every attack, positioning yourself for the final showdown. The sprint was chaotic, desperate, and decided by millimeters. Coming out of the final corner, three or four riders hit the line together, engines red-lined, everything on the line. Somehow you emerged with the victory by less than half a second. Inches separated you from second place, but in racing, inches are all you need. It's the kind of finish that'll have you rewatching the replay a dozen times, simultaneously exhilarating and nerve-wracking, proof that when it matters most, you can deliver under the highest pressure.`,
        
        `Racing doesn't get tighter than this. ${eventName} went down to a photo finish, and when they reviewed the footage, you'd won by ${winMargin && winMargin < 1 ? 'a bike throw' : winMargin ? formatGapText(winMargin) : 'the narrowest of margins'}. ${dynamics.type === 'bunch_sprint' ? 'The entire field came to the line together—twenty riders, thirty riders, all sprinting for the same piece of tarmac.' : 'A small group contested the finale, but the speed was no less intense.'} You were buried in the pack with 200 meters to go, found a gap with 100 to go, and launched everything you had into one desperate final surge. Heart rate maxed, lungs burning, vision narrowing to just the line ahead. You threw your bike at the line and held your breath. When the official result came through—P1—it felt like stealing something precious. Victory by the smallest possible margin. It counts exactly the same as winning by a minute.`,
        
        `They'll remember ${eventName} for years because of how it ended. ${dynamics.type === 'bunch_sprint' ? 'Mass sprint finish, chaos everywhere, twenty riders' : 'Small group sprint, elite riders'}, all converging on the line at maximum speed. You were in the mix but not perfectly positioned—boxed in, having to navigate around fading riders, looking for any gap. With 50 meters left, a tiny space opened. You didn't think, just reacted—diving through, throwing everything into one last acceleration. The line arrived in a blur of bikes and bodies. ${winMargin && winMargin < 1 ? 'They needed the photo to separate you from second place.' : winMargin ? `You'd won by ${formatGapText(winMargin)}—barely anything, but enough.` : 'The margin was razor-thin.'} This is bike racing at its purest: suffering, tactics, timing, and that last bit of something extra when it counts most.`
      ];
      recap = pickRandom(variants);
      
    } else {
      const variants = [
        `${eventName} unfolded with the kind of control you dream about. Every move felt calculated, every effort measured, and by the time the finish line approached, the result was never in doubt. ${predictionTier === 'matched' ? 'The predictions had you down for a win, and you delivered with precision.' : `The predictions suggested ${formatOrdinal(predictedPosition)}, but you had other ideas.`} ${dynamics.type === 'solo_victory' ? `You attacked decisively and rode away solo. ${winMargin ? `By the finish, you'd opened ${formatGapText(winMargin)}.` : 'The gap kept growing.'}` : dynamics.type === 'breakaway_win' ? `The winning move formed, you were in it, and you proved strongest. ${winMargin ? `The chasers were ${formatGapText(winMargin)} back.` : 'The break stayed clear.'}` : `When the sprint opened up, you timed it perfectly and ${winMargin ? `won by ${formatGapText(winMargin)}` : 'claimed a decisive victory'}.`} Sometimes racing is about desperate last-moment saves. Today was about executing a plan and having it work perfectly.`,
        
        `Perfect days exist in bike racing, and ${eventName} was one of them. ${predictionTier === 'beat' || predictionTier === 'crushed' ? `Nobody expected this—predictions had you at ${formatOrdinal(predictedPosition)}—but ` : ''}from the opening moments, you rode with quiet confidence. Never panicked, never dug too deep too early, just patient, intelligent racing. ${dynamics.type === 'solo_victory' ? `When you attacked, it was perfectly timed. Solo to the finish, ${winMargin ? formatGapText(winMargin) : 'a comfortable margin'} ahead.` : dynamics.type === 'bunch_sprint' ? `You positioned yourself perfectly for the sprint, launched at the ideal moment, and ${winMargin ? `won by ${formatGapText(winMargin)}` : 'crossed first'}.` : `A select group formed at the front, and when it came down to it, you were simply the strongest. ${winMargin ? `You finished ${formatGapText(winMargin)} clear.` : 'The win was yours.'}`} These are the days that remind you why you race—when everything aligns and the reward is tangible.`,
        
        `Sometimes you have to take victory, and sometimes it feels like it was yours all along. ${eventName} was the latter. ${dynamics.type === 'solo_victory' ? `You attacked with purpose—not desperation, not hope, but the calm certainty that you had the legs to make it stick. ${winMargin ? `You crossed the line ${formatGapText(winMargin)} clear.` : 'You rode away and never looked back.'}` : dynamics.type === 'small_group' ? `A group of strong riders broke clear, and you were among them. When the sprint came, there was no doubt—you were the fastest. ${winMargin ? `Winning margin: ${formatGapText(winMargin)}.` : 'The result was clear.'}` : `The field came to the line together, but you'd already done the hard work—positioning, timing, reading the race. The sprint was just the formality. ${winMargin ? `Victory by ${formatGapText(winMargin)}.` : 'Clean win.'}`} P1. The only position that truly matters.`,
        
        `Winning ${eventName} felt earned in the best possible way. Not through luck, not through others' mistakes, but through superior riding. ${predictionTier === 'matched' ? 'The predictions suggested you could win, and you validated them.' : predictionTier === 'beat' || predictionTier === 'crushed' ? `The predictions said ${formatOrdinal(predictedPosition)}, but the predictions were wrong.` : 'You came prepared to win.'} ${dynamics.type === 'solo_victory' ? `Your attack was decisive—one hard effort, then time trialing alone to the finish. ${winMargin && winMargin > 30 ? `The gap grew to ${formatGapText(winMargin)}.` : winMargin ? `You finished ${formatGapText(winMargin)} clear.` : 'Nobody could follow.'}` : dynamics.type === 'breakaway_win' ? `You made the decisive move and proved strongest in the break. ${winMargin ? `The peloton finished ${formatGapText(winMargin)} behind.` : 'The break held.'}` : `Perfect positioning, perfect timing, perfect execution in the sprint. ${winMargin ? `Winning margin: ${formatGapText(winMargin)}.` : 'Victory.'}`} One race, one result, one winner. Today, that was you.`
      ];
      recap = pickRandom(variants);
    }
  }
  
  // ============================================================================
  // PODIUM (2nd and 3rd) - Enhanced with 6 variants per position
  // ============================================================================
  else if (tier === 'podium') {
    const gapText = formatGapText(lossMargin, 'sprint');
    const winnerText = hasWinnerName ? winnerName : 'the winner';
    const variant = selectVariant(eventNumber, position, 6, {
      hasWinnerName,
      hasLargeGap: lossMargin > 15,
      predictionTier
    });
    
    if (position === 2) {
      // 2ND PLACE - Always mentions winner and gap when available
      
      if (earnedPhotoFinish || dynamics.type === 'photo_finish') {
        // Photo finish variant
        recap += `Centimeters. That's what separated you from victory at ${eventName}. The race came down to a desperate lunge for the line—multiple riders sprinting flat out, nobody willing to yield an inch. You threw your bike at the finish with everything you had, crossing ${gapText ? `${gapText} behind ${winnerText}` : 'in second place'}. ${lossMargin < 0.5 ? 'They needed the photo to separate first from second.' : 'Close enough to taste the win, far enough to know you came up just short.'} It's the kind of finish that'll replay in your mind for days—simultaneously thrilling and frustrating, proof you can compete at the highest level but a reminder of how fine the margins are. Still, second place in a field this strong is nothing to dismiss. You were in the fight until the very end.`;
      } else if (dynamics.type === 'bunch_sprint' && variant % 3 === 0) {
        // Bunch sprint - close finish
        recap += `${eventName} came down to a mass sprint finish, and you were right there in the thick of it. ${hasWinnerName ? `${winnerText} proved to be the strongest in the final meters, ` : 'The winner had slightly more speed, '} crossing ${gapText ? `${gapText} ahead of you` : 'just ahead'}. ${lossMargin < 3 ? 'It was tight—a matter of positioning and timing as much as raw power.' : 'The sprint was frantic, everyone fighting for position, and you came out of it in second.'} Not the top step, but you were in contention until the line and finished ahead of most of the field. Bunch sprints are chaotic and often decided by luck as much as strength. You rode smartly, positioned well, and nearly pulled it off.`;
      } else if (dynamics.type === 'small_gap' && hasWinnerName && variant % 3 === 1) {
        // Small gap - winner was stronger
        recap += `${winnerText} rode a strong race at ${eventName}, and you couldn't quite match their best effort. ${lossMargin < 15 ? 'You were close—not dropped, not struggling, just slightly less powerful when it mattered most.' : 'The gap opened in the decisive moments, and you had to settle into your own rhythm.'} You crossed the line in second place, ${gapText ? `${gapText} behind` : 'chasing hard to the end'}. It's frustrating to come so close, but second place still means you were the second-strongest rider in the field. ${winnerText} was simply better today, but you were better than everyone else. That counts for something.`;
      } else if (predictionTier === 'beat' || predictionTier === 'crushed') {
        // Better than expected
        recap += `The predictions had you finishing around ${formatOrdinal(predictedPosition)} at ${eventName}, well off the podium. But racing doesn't follow scripts. From early on, you felt strong and rode with confidence. You covered the key moves, positioned yourself intelligently, and when the race reached its climax, you were there with the strongest riders. ${hasWinnerName ? `${winnerText} took the victory, ` : 'The winner rode away, '}but you secured second place${gapText ? `, ${gapText} back,` : ','} ahead of everyone else who started the day as favorites. Beating expectations by this much—turning a predicted mid-pack finish into a podium—shows you're improving faster than even the algorithms realize. Second place feels a lot like a win when you weren't supposed to be anywhere near the front.`;
      } else if (variant % 3 === 2) {
        // Race dynamics variant
        recap += `You gave everything at ${eventName} and came away with second place. ${dynamics.type === 'solo_victory' || dynamics.type === 'breakaway_win' ? `${hasWinnerName ? winnerText + ' rode away' : 'The winner broke clear'} earlier in the race, and despite your best efforts, you couldn't bridge. ${gapText ? `You crossed ${gapText} behind` : 'The gap proved too large'}, leading the chase group home.` : `The finish was competitive, with ${hasWinnerName ? winnerText : 'the eventual winner'} proving just slightly stronger. ${gapText ? `You finished ${gapText} back` : 'The margin was small'}, knowing you'd left everything out there.`} Second isn't first, and that stings, but it's still a podium and proof that you belong among the best in this field. You competed, you fought, you finished on the podium. That's something.`;
      } else {
        // General second place
        recap += `${eventName} rewarded smart racing, though not quite with the prize you were hoping for. You positioned yourself well throughout, reading the moves and staying with the strongest riders. As the race reached its climax, you were right there, sensing an opportunity for victory. ${hasWinnerName ? `${winnerText} had just slightly more on the day—` : 'The winner proved marginally stronger—'}${gapText ? `${gapText} separated you at the line` : 'enough to take the win'}. It stings to come so close. Second place means you were competitive, means you belonged in that final selection, means you're racing at a high level. But it's not first, and that's the only position that truly satisfies. Still, you take the points, the confidence, and move forward.`;
      }
    } else {
      // 3RD PLACE - Varied approach (sometimes mentions winner, sometimes doesn't)
      
      if (earnedPhotoFinish || (dynamics.type === 'photo_finish' && variant % 2 === 0)) {
        // Photo finish for 3rd
        recap += `They say podium is podium, but ${eventName} will sting for a while. The race came down to a photo finish—multiple riders hitting the line together after a desperate sprint. You were in that final group, throwing everything into the last 100 meters, and when the dust settled, you'd claimed third place ${gapText ? `by ${gapText}` : 'by the narrowest of margins'}. ${lossMargin < 2 ? 'Inches separated the top three finishers.' : 'The margins were razor-thin throughout the top positions.'} You were so close to second, maybe even first, but cycling is measured in fractions and today you came up just short. Still, a podium is a podium—even if it's the lowest step, you're up there with the best.`;
      } else if (variant % 3 === 0 && hasWinnerName) {
        // Mentions winner's dominance
        recap += `${winnerText} dominated ${eventName}, and there was nothing anyone could do about it. ${dynamics.type === 'solo_victory' || dynamics.type === 'breakaway_win' ? 'They rode clear and never looked back, leaving the rest of you to race for the remaining podium spots.' : 'They had the power and positioning to control the finish.'} You battled hard for third place, finishing ${gapText ? `${gapText} behind the winner` : 'well back but securing the final podium spot'}. Not every race is winnable when someone else is simply riding at a different level. You did your job—stayed competitive, fought for every position, and earned your spot on the podium alongside the day's strongest riders.`;
      } else if (predictionTier === 'beat' || predictionTier === 'crushed') {
        // Beat predictions
        recap += `The predictions suggested you'd finish around ${formatOrdinal(predictedPosition)} at ${eventName}—nowhere near the podium. But you had other ideas. From the start, you rode aggressively, positioning yourself with the leaders and proving you belonged in the front group. When the race split apart, you made the selection. ${dynamics.type === 'bunch_sprint' ? 'The sprint was chaotic, but you held your position and crossed third.' : dynamics.type === 'small_gap' ? 'You finished with a small group at the front, claiming third place.' : 'You rode smartly, covering moves and finishing in the top three.'} A podium is a podium, and when you weren't even supposed to be close, third place feels like a significant achievement. You proved the predictions wrong and earned your spot among the best.`;
      } else if (variant % 3 === 1) {
        // Own performance focus
        recap += `${eventName} rewarded consistent, intelligent racing with a podium finish. You approached the race with a clear plan: stay out of trouble early, position well through the decisive sections, and be ready when it counted. That plan worked. ${dynamics.type === 'bunch_sprint' ? 'You battled through a chaotic sprint and emerged in third place.' : dynamics.type === 'chase_group' ? `The front riders ${gapText ? `finished ${gapText} ahead` : 'broke clear'}, and you led the chase group home for third.` : 'You fought hard in the finale and secured the final podium spot.'} Third isn't as satisfying as first, but it's still a podium, still solid points, still proof that you can race at this level. Not every day delivers victory, but bringing home a result like this keeps your season on track.`;
      } else if (dynamics.type === 'chase_group' || dynamics.type === 'small_gap') {
        // Gap awareness variant
        recap += `A breakaway decided ${eventName}, and you couldn't make the split. ${dynamics.type === 'chase_group' ? `The front group ${gapText ? `finished ${gapText} ahead` : 'rode clear'}` : `${gapText ? `With ${gapText} to make up` : 'Facing a gap to the leaders'}`}, you led the chase home, driving the pace and trying to minimize the damage. When the line came, you'd secured third place—not the result you were hoping for, but still a podium finish. Cycling is about reading the race and making the right moves at the right times. Today the decisive move happened without you, but you salvaged a good result from a difficult situation. That's professional racing—not every day is perfect, but you take what you can get.`;
      } else {
        // General 3rd place
        const predictionText = predictionTier === 'worse' ? 
          "The predictions had you higher, maybe even threatening for the win, but racing had other plans." : 
          "You rode a solid race,";
        const finishText = dynamics.type === 'bunch_sprint' ? 
          "The sprint came down to a mass finish, and you crossed in third—close to the leaders but not quite able to contest for the win." : 
          "When the strongest riders made their moves, you couldn't quite go with them, but you held firm for third.";
        recap += `Third place at ${eventName}—a podium finish, if not quite the result you were gunning for. ${predictionText} positioning yourself well and staying with the main group through the decisive sections. ${finishText} It's easy to focus on what you didn't achieve—first or second—but a podium is still a podium. You finished ahead of most of the field, earned solid points, and showed you belong among the best. That's progress, even if it doesn't feel like it in the moment.`;
      }
    }
  }
  
  // ============================================================================
  // TOP 10 - Enhanced with 5 variants, time gap awareness
  // ============================================================================
  else if (tier === 'top10') {
    const gapText = formatGapText(lossMargin);
    const variant = selectVariant(eventNumber, position, 5, {
      hasWinnerName,
      hasLargeGap: lossMargin > 30,
      predictionTier
    });
    
    if (predictionTier === 'beat' && variant % 2 === 0) {
      // Beat expectations with gap awareness
      let dynamicsText = '';
      if (dynamics.type === 'well_back' && gapText) {
        dynamicsText = buildWinnerText(hasWinnerName, winnerName, gapText, ', riding at a different level entirely, but ');
      } else if (dynamics.type === 'chase_group') {
        // Mention gap if significant (60+ seconds)
        if (lossMargin >= 60 && gapText) {
          dynamicsText = `The leaders finished ${gapText} ahead, but you led the chase group home and `;
        } else {
          dynamicsText = "You couldn't quite make the front group, but you led the chase home and ";
        }
      }
      recap += `A solid performance at ${eventName}. The predictions had you further back, around ${formatOrdinal(predictedPosition)}, but you rode a tactically smart race that delivered better. ${dynamicsText}you finished ${formatOrdinal(position)}, exceeding expectations and banking solid points. Not every race needs to deliver heroics. Sometimes a result that quietly beats expectations is exactly what the season requires—consistent progress, smart positioning, and gradual improvement.`;
    } else if (predictionTier === 'worse') {
      // Worse than expected
      if (isFirstRace) {
        const chaseText = dynamics.type === 'chase_group' ? 
          (gapText ? `The front group rode away with ${gapText} on the chase, and you couldn't respond.` : "The front group broke clear, and you couldn't respond.") :
          "When the decisive moves came, you couldn't quite match the strongest riders.";
        recap += `${eventName} didn't quite deliver the result you were hoping for in your season opener. The predictions had you finishing higher, maybe around ${formatOrdinal(predictedPosition)}, but racing has a way of humbling expectations. ${chaseText} You finished ${formatOrdinal(position)}, salvaging a top-ten but falling short of where you thought you'd be. Still, it's your first race—establishing a baseline, gathering experience, learning where you stand. That foundation matters, even when the result doesn't excite.`;
      } else {
        const winnerText = (dynamics.type === 'well_back' && gapText) ? 
          buildWinnerText(hasWinnerName, winnerName, gapText, '. ') : '';
        const chaseText = dynamics.type === 'chase_group' ? 
          'You spent the race chasing gaps you could never quite close.' : 
          'The decisive moments came and went without you in position to respond.';
        recap += `${eventName} didn't go to plan. The predictions suggested you'd finish around ${formatOrdinal(predictedPosition)}, threatening for a podium, but you couldn't find the form to match those expectations. ${winnerText}You finished ${formatOrdinal(position)}—a top-ten finish that keeps you in the conversation but falls well short of what you were hoping for. ${chaseText} Not every day delivers, and today was one of those frustrating races where the legs just didn't have it. Points earned, lessons learned, move forward.`;
      }
    } else if (variant % 5 === 2 && (dynamics.type === 'chase_group' || dynamics.type === 'well_back')) {
      // Gap/dynamics awareness
      const winnerStart = hasWinnerName ? `${winnerName} took` : 'Someone took';
      const gapPhrase = gapText ? `finishing ${gapText} ahead of the chase group` : 'riding clear of the field';
      const positionText = dynamics.type === 'chase_group' ? 
        "leading home a group of riders who couldn't make the front split" : 
        'among those who fell short of the winning move';
      recap += `${winnerStart} a strong victory at ${eventName}, ${gapPhrase}. You were in that chase—working hard, trying to minimize losses, racing for the best position available. You finished ${formatOrdinal(position)}, ${positionText}. It's the kind of result that feels incomplete—you raced hard and finished in the top ten, but you were never truly in contention for the podium. Still, consistency matters. You earned points, stayed competitive, and added another completed race to your tally.`;
    } else if (variant % 5 === 3) {
      // Tactical/positioning focus
      recap += `${eventName} was about consistency and smart positioning rather than heroics. You rode within yourself, avoiding unnecessary risks and conserving energy for when it mattered most. ${dynamics.type === 'bunch_sprint' ? 'The finale came down to a mass sprint, and you navigated the chaos to finish ' + position + 'th.' : dynamics.type === 'chase_group' ? 'The race split into groups, and you were in the chase pack, working efficiently to finish ' + position + 'th.' : 'You stayed with the main group, positioned reasonably well, and finished ' + position + 'th when the dust settled.'} ${predictionTier === 'matched' ? 'Right in line with expectations—' : ''}not a result that generates headlines, but solid professional racing. You banked points, stayed competitive, and lived to fight another day. Sometimes that's exactly what's needed.`;
    } else {
      // General top 10
      const predText = predictionTier === 'matched' ? 'The predictions called it correctly—' : 
                      predictionTier === 'worse' ? 'You were hoping for better, but ' : '';
      const dynamicsText = (dynamics.type === 'well_back' && gapText) ?
        `The strongest riders finished ${gapText} ahead, but you did your job among the rest of the field.` :
        dynamics.type === 'chase_group' ? 
          "You couldn't quite make the front group, but you were competitive in the chase." :
          "You weren't quite fast enough to challenge for the podium, but you held firm in the top ten.";
      recap += `A ${formatOrdinal(position)} place finish at ${eventName} keeps you solidly in the points and moving forward. ${predText}you rode a steady race, staying with the main group through the technical sections and holding your position through the finish. ${dynamicsText} Not spectacular, but respectable. You gained experience, earned points, and proved you belong in the middle of a strong field.`;
    }
  }
  
  // ============================================================================
  // MIDPACK (11-20) - Enhanced with 5 variants
  // ============================================================================
  else if (tier === 'midpack') {
    const gapText = formatGapText(lossMargin);
    const variant = selectVariant(eventNumber, position, 5, {
      hasWinnerName,
      hasLargeGap: lossMargin > 60,
      predictionTier
    });
    
    // VALIDATE Zero to Hero: Check that previous result was actually bad (> 20th place)
    const previousResult = recentResults?.[recentResults.length - 2];
    const genuineComebackContext = previousResult && previousResult > 20;

    if (earnedZeroToHero && genuineComebackContext) {
      // Comeback variant - only if previous race was genuinely bad
      const winnerText = (dynamics.type === 'well_back' && gapText) ?
        buildWinnerText(hasWinnerName, winnerName, gapText, ", but that wasn't your concern today.") : '';
      recap += `What a turnaround. After struggling badly in your previous outing, ${eventName} was a statement of resilience. You came into this race with questions to answer and doubts to silence. ${winnerText} Your focus was on competing, on proving you could bounce back. You finished ${formatOrdinal(position)}—not spectacular, but after where you were last time, this represents genuine progress. You proved you can turn things around, that one bad day doesn't define your season, and that you have the mental strength to respond when things go wrong. Context matters, and in context, this was a successful day.`;
    } else if (predictionTier === 'beat' && variant % 3 === 0) {
      // Beat expectations
      const chaseText = dynamics.type === 'chase_group' ? 
        "You couldn't make the front group, but you were competitive in the chase pack." : 
        'You stayed out of trouble, found a group riding at a sustainable pace, and worked efficiently through to the finish.';
      const gapPrefix = (gapText && dynamics.type === 'well_back') ? 
        `The leaders finished ${gapText} ahead, riding at a level you couldn't match, but ` : '';
      recap += `${eventName} was a quiet success. The predictions suggested you'd finish well back in the pack, around ${formatOrdinal(predictedPosition)}, struggling to stay with the main group. But through steady riding and good positioning, you worked your way to ${formatOrdinal(position)} place. ${chaseText} Not spectacular, but solid progress. ${gapPrefix}you exceeded expectations and banked decent points. That's the kind of result that builds a foundation for better days ahead.`;
    } else if (variant % 5 === 1) {
      // Realistic midpack with gap awareness
      const winnerText = (dynamics.type === 'well_back' && gapText) ? 
        buildWinnerText(hasWinnerName, winnerName, gapText, ', ') : '';
      const chaseText = dynamics.type === 'chase_group' ? 
        'You fell into a chase group behind the leaders and worked to minimize the time loss.' : 
        'You found your rhythm, settled in, and focused on getting to the finish.';
      const predText = predictionTier === 'matched' ? 'Right in line with expectations—' : '';
      recap += `${formatOrdinal(position)} place at ${eventName}—firmly in the midpack. ${winnerText}and you were never really in contention to challenge the front runners. You stayed with the main group through the early sections, but when the pace increased, you couldn't respond. ${chaseText} ${predText}not disappointing, but not exciting either. You completed the race, banked some points, and gained more experience. That counts for something, even when the result doesn't generate enthusiasm.`;
    } else if (variant % 5 === 2 && predictionTier === 'worse') {
      // Disappointed with result
      const attackText = dynamics.type === 'well_back' ? 
        'The strongest riders rode away early, and you were left chasing gaps you could never close.' : 
        "When the key moves came, you weren't able to respond with the power needed.";
      const gapSuffix = (gapText && dynamics.type === 'well_back') ? 
        `The leaders were ${gapText} ahead at the finish. ` : '';
      recap += `The predictions had you finishing higher at ${eventName}, maybe around ${formatOrdinal(predictedPosition)}, but the legs didn't have what you were hoping for. ${attackText} You finished ${formatOrdinal(position)}—midpack, respectable enough, but falling short of expectations. ${gapSuffix}It's frustrating to race hard and finish in the middle, knowing you were hoping for better. But not every day delivers. You completed the distance, earned some points, and will regroup for the next one.`;
    } else if (variant % 5 === 3) {
      // Survival/completion focus
      const gapText2 = (dynamics.type === 'well_back' && gapText) ? 
        `They finished ${gapText} ahead. ` : '';
      recap += `${eventName} was about survival more than glory. From early on, it was clear the strongest riders were operating at a different level. ${gapText2}You tried to respond when the pace surged, but the legs weren't there today. Eventually, you settled into your own rhythm—not racing for position anymore, just focusing on reaching the finish line with dignity intact. ${formatOrdinal(position)} place isn't the result you were hoping for, but you completed the distance and gained experience. Racing isn't always about results—sometimes it's about showing up, doing the work, and learning what you need to improve. Today was one of those days.`;
    } else {
      // General midpack
      const predText = predictionTier === 'matched' ? 'Right where the predictions suggested.' : 
                      predictionTier === 'worse' ? 'Not quite where you were hoping to be.' : 
                      'A respectable if unspectacular result.';
      const raceText = dynamics.type === 'chase_group' ? 
        'The front group broke clear, and you were left in the chase pack, working with others who missed the move.' : 
        "You stayed with the main group through most of the race but couldn't find the extra gear needed to move up in the finale.";
      const gapText2 = (gapText && dynamics.type === 'well_back') ? 
        `The leaders finished ${gapText} ahead. ` : '';
      recap += `${eventName} found you solidly in the midpack—${formatOrdinal(position)} place. ${predText} ${raceText} ${gapText2}Not a day for heroics—just steady work, completing the distance, and banking a few points. Progress isn't always linear, and some days are about ticking boxes rather than making breakthroughs.`;
    }
  }
  
  // ============================================================================
  // BACK OF FIELD (21+) - Enhanced with 4 honest but varied variants
  // ============================================================================
  else {
    const gapText = formatGapText(lossMargin);
    const variant = selectVariant(eventNumber, position, 4, {
      hasWinnerName,
      hasLargeGap: lossMargin > 90,
      predictionTier
    });
    
    if (predictionTier === 'much_worse' && variant % 2 === 0) {
      // Well below expectations
      recap += `${eventName} was a struggle from start to finish. The predictions had you competing around ${formatOrdinal(predictedPosition)}, solidly in the mix, but racing had very different plans. ${dynamics.type === 'well_back' && gapText ? `${hasWinnerName ? winnerName : 'The winner'} finished ${gapText} ahead—not that it mattered to your race. ` : ''}Nothing clicked today. The legs weren't there, the positioning was off, and by the time the race reached its climax, you were just trying to limit the damage and reach the finish line. You lost touch with the main group earlier than you'd hoped, found yourself isolated or in a struggling group, and had to dig deep just to complete the distance. ${formatOrdinal(position)} place is honest but painful. Every racer has days like this—when form, luck, and circumstance conspire against you. The only silver lining is that you finished. What matters now is how you respond.`;
    } else if (variant % 4 === 1) {
      // Honest struggle with gap awareness
      recap += `Sometimes racing doesn't go your way, and ${eventName} was emphatically one of those days. ${gapText && dynamics.type === 'well_back' ? `The leaders finished ${gapText} ahead, racing at a level you couldn't even glimpse today. ` : 'The strongest riders rode away early, and you were never in contention. '}Despite your best efforts, you couldn't find the form needed to stay competitive. The gap opened early and never closed, leaving you in survival mode for much of the race. ${formatOrdinal(position)} place stings—there's no sugarcoating it. You tried to respond when others accelerated, but the legs simply didn't have it. Eventually you had to accept your position and focus on getting to the finish line with whatever small dignity remained. Tough days are part of racing. This was one of them.`;
    } else if (variant % 4 === 2 && isFirstRace) {
      // First race reality check
      recap += `${eventName} was a harsh introduction to competitive racing. The predictions might have suggested ${formatOrdinal(predictedPosition)}, but your first race delivered a reality check: you finished ${formatOrdinal(position)}, well back in the field. ${gapText && dynamics.type === 'well_back' ? `The leaders were ${gapText} ahead when you crossed. ` : 'The front of the race rode away and never looked back. '}Racing is humbling, especially when you're just starting. The pace was higher than you expected, the efforts were more sustained, and when it mattered, you simply weren't at the level needed to compete. But everyone starts somewhere, and today was your starting point. You finished. You gained experience. You learned where you stand and what you need to improve. That's valuable, even when the result is painful to process.`;
    } else {
      // General back-of-field
      recap += `${eventName} was one you'd rather forget. ${predictionTier === 'worse' ? `The predictions suggested you'd finish around ${formatOrdinal(predictedPosition)}, but those numbers proved wildly optimistic.` : `You came in hoping to compete, but the reality was harsh.`} ${dynamics.type === 'well_back' && gapText ? `${hasWinnerName ? winnerName : 'The winner'} finished ${gapText} ahead. ` : ''}From early on, you struggled to stay in touch with the pack. When the pace ramped up, you couldn't respond. When others attacked, you had nothing left to give. ${formatOrdinal(position)} place is a result that speaks to a difficult day—legs that didn't cooperate, positioning that never came together, a race that went badly from start to finish. But you finished. That's not nothing. Every race is a data point, every struggle teaches something. Today taught you where you need to work harder. Tomorrow you'll respond.`;
    }
  }
  
  return recap;
}

/**
 * Generate CONDENSED forward look (2-4 sentences)
 * Season-phase aware, concise outlook without repeating recap sentiments
 * Used in the two-part narrative structure
 * For choice stages (3, 6, 8), describes the upcoming choice rather than a specific event
 */
function generateForwardLook(seasonData, raceData) {
  const {
    stagesCompleted,
    nextEventNumber,
    nextStageNumber,
    isOnStreak,
    totalPodiums,
    totalWins,
    recentResults,
    isSeasonComplete,
    isNextStageChoice,
    completedOptionalEvents
  } = seasonData;

  // Compute next event name from EVENT_NAMES
  const nextEventName = EVENT_NAMES[nextEventNumber] || `Event ${nextEventNumber}`;

  // Season complete - no forward look needed
  // Note: nextEventNumber is null for choice stages (3, 6, 8), so we must check isNextStageChoice
  if (isSeasonComplete || nextEventNumber > 15 || (!nextEventNumber && !isNextStageChoice)) {
    if (isOnStreak) {
      return "The season ends on a high note. Time to rest, recover, and carry this momentum into the off-season. There will be time to analyze what worked and what to build on for next year.";
    }
    return "The season is complete. Time to rest, reflect on what you've learned, and start thinking about what comes next. Every race has been a lesson, and those lessons compound.";
  }

  // Handle choice stages (3, 6, 8) - don't mention specific event name
  if (isNextStageChoice) {
    const completedOptionals = completedOptionalEvents || [];
    const remainingCount = 7 - completedOptionals.length;

    if (completedOptionals.length === 0) {
      return `Stage ${nextStageNumber} presents your first Rider's Choice—seven different event types to pick from. Each tests different skills and reveals different aspects of your abilities. The decision is yours.`;
    } else if (completedOptionals.length === 1) {
      return `Stage ${nextStageNumber} brings your second Rider's Choice. With ${remainingCount} event types still available, consider what you've learned about your strengths and where you want to grow.`;
    } else {
      return `Stage ${nextStageNumber} is your final Rider's Choice—${remainingCount} event types remain. Pick wisely, as it's the last variable you control before the season's closing stretch.`;
    }
  }

  const nextEventType = EVENT_TYPES[nextEventNumber];
  let forward = '';

  // Race type descriptions for more detail
  const raceTypeDetails = {
    'road race': 'a classic road race where tactics, positioning, and reading the peloton will matter as much as raw power',
    'criterium': 'a fast, technical criterium—tight corners, constant accelerations, and positioning battles that reward alertness and bike handling',
    'time trial': 'a time trial where there\'s nowhere to hide, no draft to find, just you against the clock and your own limits',
    'hill climb': 'a pure climbing test where power-to-weight is everything and the gradient strips away any tactical pretense',
    'points race': 'a points race where consistency across multiple sprints matters more than a single explosive effort',
    'track elimination': 'a velodrome elimination where one moment of inattention can end your race—every lap is survival',
    'gran fondo': 'an endurance challenge where pacing and nutrition will matter as much as fitness',
    'gravel race': 'a gravel race where bike handling on mixed terrain adds another dimension to the competition',
    'mountain stage': 'a mountain stage with sustained climbing that will test your ability to suffer',
    'stage race': 'stage racing where managing effort across multiple days becomes the challenge'
  };

  const typeDetail = raceTypeDetails[nextEventType] || 'another test of your racing abilities';

  // EARLY SEASON (stages 1-3): Exploratory, learning-focused
  if (stagesCompleted <= 3) {
    if (stagesCompleted === 1) {
      forward = `${nextEventName} is next—${typeDetail}. With one race under your belt, you have a baseline to build from. The season is young, and each start line is a chance to learn something new about yourself and this level of competition.`;
    } else {
      forward = `${nextEventName} awaits—${typeDetail}. You're still in the early chapters of this season, gathering data, testing what works, finding your rhythm in the peloton. The picture is starting to form.`;
    }
  }
  // MID SEASON (stages 4-6): Building, patterns forming
  else if (stagesCompleted <= 6) {
    if (nextEventType === 'stage race') {
      forward = `The Local Tour begins with ${nextEventName}—three stages over three days that will define the season's finale. Stage racing demands a different mindset: managing effort, recovering between days, thinking beyond just today's result.`;
    } else {
      forward = `Next up: ${nextEventName}, ${typeDetail}. `;
      if (isOnStreak) {
        forward += `You're carrying real momentum now, and the field is starting to take notice. The question is whether you can sustain this form through the season's middle chapters.`;
      } else if (totalPodiums >= 2) {
        forward += `Your consistency is building a reputation. You're becoming a rider others have to account for, someone who's always in the mix when it matters.`;
      } else {
        forward += `The season is past its opening act now. Patterns are emerging in your racing, and each event offers a chance to refine what's working and fix what isn't.`;
      }
    }
  }
  // LATE SEASON (stages 7+): Focused, results-driven
  else {
    if (nextEventType === 'stage race') {
      const stageNum = nextEventNumber - 12;
      if (stageNum === 1) {
        forward = `The Local Tour begins—three stages that carry the weight of the entire season. Everything you've built, every lesson learned, comes down to these final days. Stage racing rewards the complete rider: fitness, tactics, recovery, and mental resilience all matter.`;
      } else if (stageNum === 2) {
        forward = `Local Tour Stage 2 awaits. Yesterday's effort is in the legs, but the GC picture is still taking shape. Today could reshape the overall standings. Recovery and smart racing will separate those who peak from those who fade.`;
      } else {
        forward = `The queen stage—Local Tour Stage 3. Everything comes down to this. The hardest stage, the final day, the last chance to attack or defend. Whatever happens today is how you'll remember this season.`;
      }
    } else {
      forward = `${nextEventName} is one of the final chances to make a statement—${typeDetail}. The season is entering its closing chapters, and every result from here carries extra weight. There's no time left for dress rehearsals.`;
    }
  }

  return forward;
}

/**
 * Generate season context paragraph
 * These are also LONG paragraphs (5-7 sentences) with forward-looking content
 */
function generateSeasonContext(data) {
  // DEPRECATED: totalPoints parameter comes from season-specific data (season1Points)
  const {
    stagesCompleted,
    totalPoints,
    nextStageNumber,
    nextEventNumber,
    nextEventName,
    recentResults,
    isOnStreak,
    totalPodiums,
    seasonPosition,
    isNextStageChoice,
    completedOptionalEvents  // Array of event numbers user has already completed
  } = data;

  // Special case: If this is the final stage (stage 9 = Local Tour complete) and season is complete
  // Return empty context - the season wrap-up will be shown separately
  if (stagesCompleted === 9 && data.isSeasonComplete) {
    return '';
  }

  let context = '';

  // Opening - season progress (1-2 sentences)
  // Special handling for Local Tour (events 13-15 are stages 9-11)
  const { eventNumber } = data;
  if (eventNumber === 13) {
    context += `Seven stages complete, and now the Local Tour begins—Stage 9, the three-day challenge that will define your season. `;
  } else if (eventNumber === 14) {
    context += `Local Tour Stage 2 (Stage 10). Day one is done, and today will reshape the GC standings. `;
  } else if (eventNumber === 15) {
    context += `The queen stage—Local Tour Stage 3 (Stage 11), the final day of the tour and the final day of the season. Everything comes down to this. `;
  } else if (stagesCompleted === 1) {
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
    // DIFFERENTIATE: 2 wins = "back-to-back", 3+ wins = "streak"
    const consecutiveWins = recentResults.filter(p => p === 1).length;

    if (consecutiveWins >= 3) {
      // True winning streak (3+ consecutive wins)
      context += `The winning streak you're currently riding has caught everyone's attention—${consecutiveWins} consecutive victories aren't luck, they're form, and right now your form is undeniable. You've found that elusive combination of confidence, fitness, and tactical sharpness that turns good riders into dangerous ones. The question everyone's asking is how long you can maintain this momentum, and right now, there's no reason to think it'll end soon. `;
    } else if (consecutiveWins === 2) {
      // Back-to-back wins (not quite a streak yet)
      context += `Back-to-back victories have given you serious momentum and confidence. You're finding your rhythm, starting to believe you belong at the front, and learning what it takes to win consistently. Two in a row isn't luck—it's the beginning of something. The key now is maintaining this form and pushing for that third win that transforms back-to-back success into a genuine streak. `;
    } else {
      // Fallback (shouldn't normally hit this, but safety)
      context += `Your recent win has given you confidence and momentum. `;
    }
  } else if (totalPodiums >= 5) {
    context += `${totalPodiums} podium finishes have defined your season—that many top-three results is the hallmark of genuine consistency. You've proven you can compete at the front across different types of events and conditions. That kind of reliability is what builds successful campaigns. `;
  } else if (totalPodiums >= 3) {
    context += `${totalPodiums} podium finishes have given your season real substance. You're not just making up the numbers—you're competing for the top spots more often than not. `;
  } else if (totalPodiums === 2) {
    context += `Two podium finishes so far show you can compete at the front when it matters. You're knocking on the door of consistency—one more top-three result and you'll have established yourself as a genuine contender. `;
  } else if (totalPodiums === 1) {
    context += `Your podium finish earlier in the season proved you can compete with the best. Now the challenge is replicating that result and showing it wasn't a one-off. `;
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
  
  console.log(`Story Generator Debug: nextStageNumber=${nextStageNumber}, nextEventNumber=${nextEventNumber}, isNextStageChoice=${isNextStageChoice}, nextEventType=${nextEventType}`);

  // Check for choice stages FIRST before checking if nextEventNumber is null
  // Choice stages have nextEventNumber = null but are NOT the end of the season
  if (isNextStageChoice) {
    // Determine which optional events are still available
    const completedOptionals = completedOptionalEvents || [];
    const remainingOptionals = OPTIONAL_EVENTS.filter(e => !completedOptionals.includes(e));
    const remainingCount = remainingOptionals.length;
    
    console.log(`Story Generator Optional Stage Debug:`);
    console.log(`  nextStageNumber: ${nextStageNumber}`);
    console.log(`  completedOptionalEvents: [${completedOptionals.join(', ')}]`);
    console.log(`  remainingOptionals: [${remainingOptionals.join(', ')}]`);
    console.log(`  remainingCount: ${remainingCount}`);
    
    // Build description of what's been done and what remains
    let choiceContext = '';
    
    if (completedOptionals.length === 0) {
      // First optional stage - all 7 available
      choiceContext = `Stage ${nextStageNumber} presents your first Rider's Choice. Seven different event types are available—hill climbs, time trials, criteriums, endurance challenges, points races, mountain stages, and gravel races. Each tests different skills and reveals different aspects of your abilities. `;
    } else if (completedOptionals.length === 1) {
      // Second optional stage - 6 remaining
      const completedType = OPTIONAL_EVENT_INFO[completedOptionals[0]]?.shortDesc || 'your previous choice';
      choiceContext = `Stage ${nextStageNumber} brings your second Rider's Choice. You've already tackled the ${completedType}, which narrows the field but leaves ${remainingCount} distinct challenges available. You can double down on a similar discipline or deliberately choose something that tests entirely different skills. `;
    } else if (completedOptionals.length === 2) {
      // Third optional stage - 5 remaining
      const types = completedOptionals.map(e => OPTIONAL_EVENT_INFO[e]?.shortDesc || 'event').join(' and the ');
      choiceContext = `Stage ${nextStageNumber} is your final Rider's Choice. With the ${types} behind you, ${remainingCount} event types remain. This is your last chance to fill a gap in your racing resume or to lean into what's been working. The decision matters more now—it's your last controlled variable before the season's final stretch. `;
    }
    
    // Add tactical context about making choices
    const tacticalTexts = [
      `Some riders consistently choose what they're good at, building confidence and maximizing points. Others deliberately select their weakest disciplines, accepting short-term risk for long-term growth. `,
      `Your selection reveals something about your racing philosophy. Playing to strengths is pragmatic and often leads to better results. Attacking weaknesses builds a more complete rider but can be frustrating in the short term. `,
      `The choice says something about your priorities. Maximum points? Choose your strength. Maximum learning? Choose your weakness. Most riders instinctively do one or the other—the best riders consciously decide which serves them better right now. `
    ];
    
    const tacticalIndex = nextStageNumber % tacticalTexts.length;
    choiceContext += tacticalTexts[tacticalIndex];
    
    context += choiceContext;
    
    // Add closing context about season progression
    if (stagesCompleted <= 3) {
      context += `The season is still young, with plenty of racing ahead, but you're learning what you're capable of and where you can push harder. `;
    } else if (stagesCompleted <= 6) {
      context += `The season is approaching its midpoint, and patterns are emerging in your results. `;
    } else {
      context += `The season is entering its closing chapters, and every choice from here shapes your final standing. `;
    }
    
    return context;
  }

  // Now check if season is actually complete (after handling choice stages)
  // Event 15 (Local Tour Stage 3) completes the season (stage 9)
  // Only show "season complete" if nextEventNumber is null and it's NOT a choice stage
  if (nextEventNumber === null || nextEventNumber === undefined || nextEventNumber > 15) {
    // No next event - this was the final race
    // Context about season completion is handled in unified-story-generator
    // Don't add duplicate forward-looking text here
    if (isOnStreak) {
      context += `You finished the season on a strong note, with momentum that will carry into the off-season training. The work doesn't stop—it just changes form. `;
    } else {
      context += `The season is complete. Time to rest, recover, reflect on what worked and what didn't, and prepare for Season 2. `;
    }
    return context;
  }

  if (nextEventType === 'time trial') {
    context += `${nextEventName} awaits at Stage ${nextStageNumber}, a pure test against the clock where there's nowhere to hide and no teammates to lean on. It's just you, the bike, and the relentless ticking of the timer. This is where mental strength matters as much as physical power—the ability to sustain maximum effort when every instinct screams to back off. `;
  } else if (nextEventType === 'criterium') {
    context += `Stage ${nextStageNumber} brings ${nextEventName}, a fast and technical criterium where positioning and timing matter as much as raw power. These races are chess matches played at 40 kilometers per hour—you need to read the moves before they happen, position yourself perfectly coming out of corners, and have the snap to respond when the crucial accelerations come. `;
  } else if (nextEventType === 'hill climb') {
    const isOptionalStage = (nextStageNumber === 3 || nextStageNumber === 6 || nextStageNumber === 8);
    if (isOptionalStage) {
      context += `Stage ${nextStageNumber} points upward—a climb where only the strongest riders thrive. There's nowhere to hide on climbs—no drafting, no tactics, just you against gravity and everyone else suffering alongside you. The riders who love these events are a special breed, and you'll find out if you're one of them. `;
    } else {
      context += `Next up: ${nextEventName} at Stage ${nextStageNumber}, where the road points upward and only the strongest climbers thrive. There's nowhere to hide on climbs—no drafting, no tactics, just you against gravity and everyone else suffering alongside you. The riders who love these events are a special breed, and you'll find out if you're one of them. `;
    }
  } else if (nextEventType === 'gran fondo' || nextEventType === 'gravel race') {
    // For optional event stages, don't mention the specific event name
    const isOptionalStage = (nextStageNumber === 3 || nextStageNumber === 6 || nextStageNumber === 8);
    if (isOptionalStage) {
      context += `Stage ${nextStageNumber} presents a long-distance test of endurance, tactics, and mental resilience. These events aren't won in a single moment but across hours of sustained effort, through accumulated small decisions that either leave you fresh for the finale or spent too early. Patience and pacing are everything. `;
    } else {
      context += `${nextEventName} looms at Stage ${nextStageNumber}—a long-distance test of endurance, tactics, and mental resilience. These events aren't won in a single moment but across hours of sustained effort, through accumulated small decisions that either leave you fresh for the finale or spent too early. Patience and pacing are everything. `;
    }
  } else if (nextEventType === 'points race') {
    context += `Stage ${nextStageNumber} is ${nextEventName}, a points race where consistency across multiple sprints matters more than a single explosive effort. You'll need to be alert for every intermediate sprint, positioned well each time, and smart about when to commit fully versus when to take what you can get. It's about accumulation rather than one decisive moment. `;
  } else if (nextEventType === 'track elimination') {
    const isOptionalStage = (nextStageNumber === 3 || nextStageNumber === 6 || nextStageNumber === 8);
    if (isOptionalStage) {
      context += `Stage ${nextStageNumber} brings a velodrome elimination race where one moment of inattention can end your day. The format is unforgiving: every lap, the last rider across the line is eliminated, and this continues until only the winner remains. You'll need sharp positioning, constant vigilance, and the ability to respond instantly when someone else makes a move. `;
    } else {
      context += `${nextEventName} awaits at Stage ${nextStageNumber}—a velodrome elimination race where one moment of inattention can end your day. The format is unforgiving: every lap, the last rider across the line is eliminated, and this continues until only the winner remains. You'll need sharp positioning, constant vigilance, and the ability to respond instantly when someone else makes a move. `;
    }
  } else if (nextEventType === 'road race') {
    context += `Stage ${nextStageNumber} brings ${nextEventName}, a classic road race where tactics, teamwork, and individual strength all play their part. These events can unfold in countless ways—early breakaways, late attacks, sprint finishes—and you'll need to read the race correctly and be ready for anything. `;
  } else if (nextEventType === 'stage race') {
    if (nextEventNumber === 13) {
      context += `The Local Tour begins at Stage ${nextStageNumber}, a three-stage challenge that will test your ability to perform day after day. Stage racing is different from one-day events—you need to manage effort across multiple days, recover quickly, and stay mentally sharp when fatigue accumulates. It's as much about consistency as peak performance. `;
    } else if (nextEventNumber === 14) {
      context += `Local Tour Stage 2 awaits at Stage ${nextStageNumber}. Yesterday's result is done—today will reshape the GC. You're into the multi-day grind now where recovery, consistency, and mental resilience separate the contenders from the pretenders. `;
    } else if (nextEventNumber === 15) {
      context += `The queen stage arrives at Stage ${nextStageNumber}—Local Tour Stage 3, the final day that will decide the overall classification. This is the hardest stage, the most important stage, the one where the tour will be won or lost. Defend your GC position or attack for a better one. `;
    } else {
      context += `${nextEventName} continues the Local Tour at Stage ${nextStageNumber}—the multi-day grind where recovery and consistency matter as much as peak performance. `;
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

  // CLOSING PARAGRAPHS - Check stage count FIRST to avoid premature consistency claims
  if (stagesCompleted === 1) {
    // First race - no consistency or pattern talk yet
    if (recentResults && recentResults[0] === 1) {
      const closings = [
        `A win in your first race is the best possible start. You've announced yourself, made a statement, and given yourself a foundation of confidence to build on. Now the real work begins.`,
        `First race, first win. That's how seasons of destiny begin. The question now is whether you can back it up—whether this was an announcement of intent or a peak you'll spend the season chasing.`,
        `You couldn't have scripted a better opening. Victory in race one sets the tone, establishes expectations, and puts a target on your back. Embrace the pressure—it means you're doing something right.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else if (recentResults && recentResults[0] <= 5) {
      const closings = [
        `A top-five finish in your season opener is a strong start. You've shown you can compete at this level, and now you have data—what worked, what didn't, where you can push harder. Build on this.`,
        `Opening with a strong result gives you confidence and momentum heading into race two. You've proven you belong in the mix. Now it's about building on that foundation.`,
        `First race done, first lessons learned. A solid opening result gives you something to work with—proof that you can compete here, and a baseline to improve on.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else if (recentResults && recentResults[0] <= 15) {
      const closings = [
        `Your first race is in the books, and now you have something concrete to work with. Every season starts somewhere, and this opener has shown you where you stand and what to work on.`,
        `Race one is done. You've got your bearings now—you know the level of competition, you know what's expected, and you know where you need to improve. The season starts in earnest from here.`,
        `The first race is always about learning as much as racing. You've gathered data, experienced the competition firsthand, and established a baseline. Now the real season begins.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else {
      const closings = [
        `Every racer's journey has to start somewhere. Your opener wasn't what you hoped for, but it's given you clarity on where you stand and what needs work. The season is long—there's time to improve.`,
        `A tough opening race isn't the end—it's information. You've learned things about yourself and the competition that will help you in race two and beyond. Use it.`,
        `The first race didn't go to plan, but that's racing. You're still here, still committed, and you've got a full season ahead to prove what you're capable of. One race doesn't define a campaign.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    }
  } else if (stagesCompleted <= 3) {
    // Early season (races 2-3) - still learning, building, no consistency claims yet
    if (isOnStreak) {
      const closings = [
        `Multiple strong results to start the season—you're building real momentum. It's still early days, but you're giving yourself the best possible platform to build on.`,
        `Back-to-back good performances have set a tone for your season. You're still learning, still adapting, but you're doing it while staying competitive. That's the right approach.`,
        `You've started with intent, and the results are following. The season is young, but you're making every race count. Keep building.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else if (recentResults && recentResults[0] <= 5) {
      const closings = [
        `Another strong result adds to what you're building. The season is still young—plenty of racing ahead—but you're giving yourself a solid foundation to work from.`,
        `You're still in the early stages, still figuring things out, but the results suggest you're figuring them out quickly. Keep learning, keep racing, keep building.`,
        `The season is still taking shape, and so far you're shaping it well. Each race teaches you something, and you're turning those lessons into competitive finishes.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else if (recentResults && recentResults[0] >= 25) {
      const closings = [
        `It's early in the season—there's plenty of time to find your form. Every race teaches something, and tough results often teach the most. Keep showing up.`,
        `The opening races haven't gone to plan, but the season is long. You're still learning, still adapting, and one good result can shift everything. Stay patient.`,
        `Early struggles don't define a season—how you respond to them does. You've got time, you've got races ahead, and you've got lessons from these opening events to apply.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else {
      const closings = [
        `The season is still taking shape, and so are you. Every race teaches something, every result adds data. You're building a foundation—not dramatic, not flashy, but solid.`,
        `The flashes of potential are there—moments in races where everything clicks, where you see what's possible. Now it's about making those moments more frequent, more sustained.`,
        `This is the phase where commitment gets tested. The racing is harder than you expected, the competition fiercer. But you're still showing up, still racing, still pushing. That matters.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    }
  } else if (stagesCompleted >= 8) {
    // Late season - final push, cementing position
    const closings = [
      `The final races carry extra weight—not just for points, but for how you'll remember this season. You're tired, everyone's tired, but this is when champions dig deepest.`,
      `Leave nothing in the tank. The off-season is for rest; the final races are for emptying yourself completely. You'll have months to recover. You'll only have these moments once.`,
      `You've built a solid season position, and now it's about protecting it. Every race matters, every point counts. Finish strong and cement your place in the final standings.`
    ];
    context += closings[Math.floor(Math.random() * closings.length)];
  } else if (isOnStreak) {
    // Mid-season (stages 4-7) + on a winning/podium streak
    const closings = [
      `Right now, you're the rider everyone else is worried about. The momentum is real, the confidence is building, and every start line feels like another opportunity to prove this isn't a fluke—it's who you are.`,
      `Winning changes you. Not your character, but your expectations. You're starting to believe that podiums aren't lucky breaks—they're where you belong. Keep this rolling.`,
      `Success breeds expectation. You've set a standard now, and every race carries the weight of maintaining it. That pressure is good—it means you're doing something worth protecting.`
    ];
    context += closings[Math.floor(Math.random() * closings.length)];
  } else if (recentResults && recentResults[0] <= 5) {
    // Mid-season + strong recent result - check for actual consistency before claiming it
    const topFiveCount = recentResults.filter(r => r <= 5).length;
    const topTenCount = recentResults.filter(r => r <= 10).length;

    if (topFiveCount >= 3) {
      // Multiple top-5s - NOW consistency talk is truly appropriate
      const closings = [
        `You're racing with the kind of consistency that builds careers. Not flashy, not dominant, but reliably competitive. Those steady top-5s accumulate into something significant.`,
        `You're knocking on the door. Top-5 finishes are becoming routine, and that consistency suggests a win isn't far off. Sometimes you have to be patient, keep showing up, and let the breakthrough come to you.`,
        `You've found your rhythm in the peloton. The races don't feel as chaotic anymore, the pace doesn't seem as impossible, and you're reading situations before they develop. Experience is turning into competence.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else if (topTenCount >= 3) {
      // Multiple top-10s but not consistent top-5s
      const closings = [
        `You're establishing yourself as a consistent presence near the front. Not always on the podium, but always competitive, always in the mix when it matters.`,
        `The results are adding up—you're proving you can compete at this level race after race. That reliability is the foundation stronger seasons are built on.`,
        `You've found a level you can sustain. Now it's about pushing that level higher, turning top-tens into top-fives, and top-fives into podiums.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    } else {
      // Good recent result but not enough history for consistency claims
      const closings = [
        `A strong result that shows what you're capable of. The question now is whether you can replicate it, build on it, make it the norm rather than the exception.`,
        `You've shown you can compete at the sharp end. The work ahead is turning flashes of form into sustained performance.`,
        `Results like this prove you belong in the mix. Keep pushing, keep learning, and these performances will become more frequent.`
      ];
      context += closings[Math.floor(Math.random() * closings.length)];
    }
  } else if (recentResults && recentResults[0] >= 25) {
    // Mid-season + poor recent result
    const closings = [
      `One result changes everything. One good race shifts momentum, restores confidence, reminds you why you started. You're one performance away from feeling completely different about this season.`,
      `These tough races are deposits in an experience bank you'll draw on for years. Every struggle teaches resilience, every hard day builds mental toughness. The value isn't always immediate.`,
      `The hardest part of a tough season is continuing to show up. No one would fault you for taking it easy, for protecting your ego. But you're still racing. That takes guts.`
    ];
    context += closings[Math.floor(Math.random() * closings.length)];
  } else {
    // Mid-season default
    const closings = [
      `The season's middle chapters are where campaigns are defined. Not the explosive start, not the dramatic finish, but the sustained effort through the middle miles. You're in the grind now.`,
      `You're developing habits now—pre-race routines, pacing strategies, recovery protocols. These habits, formed in the season's middle, will define how you finish.`,
      `This is a pivotal stretch. Strong results now could launch you into championship contention. Weak results could leave you fighting for scraps in the final races. The middle matters.`
    ];
    context += closings[Math.floor(Math.random() * closings.length)];
  }

  return context;
}

/**
 * Main function to generate complete story
 */

/**
 * Generate INLINE rival phrase for weaving into recap
 * Returns a short phrase (not a full sentence) or empty string
 * Used in the two-part narrative structure
 * For Event 4 (time challenge), uses distance-based phrasing since times are identical
 */
function generateRivalInline(raceData, seasonData) {
  // Check if user has rivals and rival data
  if (!seasonData.topRivals || seasonData.topRivals.length === 0) {
    return null;
  }

  // Check if any rivals were in this race
  const rivalsInRace = [];
  if (seasonData.rivalEncounters && Array.isArray(seasonData.rivalEncounters)) {
    for (const encounter of seasonData.rivalEncounters) {
      if (seasonData.topRivals.includes(encounter.botUid)) {
        rivalsInRace.push(encounter);
      }
    }
  }

  if (rivalsInRace.length === 0) {
    return null;
  }

  // Get the closest/most significant rival
  const rival = rivalsInRace[0];
  const userWon = rival.userFinishedAhead;
  const eventNumber = raceData.eventNumber;

  // For time challenge (Event 4), use distance-based phrasing
  if (eventNumber === 4) {
    const distanceGap = ((rival.distanceGap || 0) / 1000).toFixed(2);
    if (userWon) {
      const phrases = [
        `finishing ${distanceGap}km ahead of rival ${rival.botName}`,
        `with ${rival.botName} covering ${distanceGap}km less`,
        `outpacing ${rival.botName} by ${distanceGap}km`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    } else {
      const phrases = [
        `with rival ${rival.botName} covering ${distanceGap}km more`,
        `trailing ${rival.botName} by ${distanceGap}km`,
        `with ${rival.botName} finishing ${distanceGap}km ahead`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
  }

  // Regular events - use time-based phrasing
  const gap = rival.timeGap != null ? rival.timeGap.toFixed(1) : '0.0';

  // Return inline phrase (to be woven into recap)
  if (userWon) {
    const phrases = [
      `finishing ahead of rival ${rival.botName} by ${gap}s`,
      `with ${rival.botName} ${gap}s behind`,
      `edging out ${rival.botName} by ${gap} seconds`
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  } else {
    const phrases = [
      `with ${rival.botName} finishing ${gap}s ahead`,
      `behind rival ${rival.botName} by ${gap} seconds`,
      `trailing ${rival.botName} by ${gap}s`
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}

/**
 * Generate rival mention if user raced against a rival
 * Checks if any of the user's rivals were in the race (within 30s)
 */
function generateRivalMention(raceData, seasonData) {
  // Check if user has rivals and rival data
  if (!seasonData.topRivals || seasonData.topRivals.length === 0) {
    return '';
  }

  // Check if any rivals were in this race (within 30s)
  const rivalsInRace = [];

  if (seasonData.rivalEncounters && Array.isArray(seasonData.rivalEncounters)) {
    // rivalEncounters contains bots within 30s in this race
    for (const encounter of seasonData.rivalEncounters) {
      // Check if this bot is in user's top 3 rivals
      if (seasonData.topRivals.includes(encounter.botUid)) {
        rivalsInRace.push(encounter);
      }
    }
  }

  if (rivalsInRace.length === 0) {
    return '';
  }

  // Generate mention for the closest/most significant rival
  const rival = rivalsInRace[0]; // Take first (should be closest or most significant)
  const userWon = rival.userFinishedAhead;
  const gap = rival.timeGap != null ? rival.timeGap.toFixed(1) : '0.0';

  // NEW: Check if this is first encounter or ongoing rivalry
  const rivalData = seasonData.encounters?.[rival.botUid];
  const encounterCount = rivalData?.races || 1;
  const h2hWins = rivalData?.userWins || 0;
  const h2hLosses = rivalData?.botWins || 0;

  // Generate different mentions based on encounter history
  const mentions = [];

  if (encounterCount === 1) {
    // FIRST ENCOUNTER - Introductory language
    if (userWon) {
      mentions.push(
        `You battled with ${rival.botName} today, finishing ${gap}s ahead. A competitor to watch.`,
        `${rival.botName} pushed you hard, but you came out ${gap} seconds ahead. They'll be one to keep an eye on.`,
        `A close race with ${rival.botName} today, with you edging ahead by ${gap} seconds. The beginning of a rivalry, perhaps.`
      );
    } else {
      mentions.push(
        `${rival.botName} proved to be formidable competition, finishing ${gap}s ahead.`,
        `A tough battle with ${rival.botName}, who got the better of you by ${gap} seconds. You'll remember that name.`,
        `${rival.botName} was the stronger rider today, finishing ${gap} seconds ahead. A competitor to track going forward.`
      );
    }
  } else {
    // ONGOING RIVALRY - Reference history and H2H record
    const record = `${h2hWins}-${h2hLosses}`;

    if (userWon) {
      mentions.push(
        `Your rivalry with ${rival.botName} continues. You won today by ${gap}s, improving to ${record} in head-to-head matchups.`,
        `Another chapter with ${rival.botName}, this one going your way by ${gap} seconds. You now lead the series ${record}.`,
        `In a battle of familiar foes, you finished ahead of ${rival.botName} by ${gap} seconds. That's ${record} in your favor now.`,
        `${rival.botName}, a frequent competitor, couldn't match you today. You beat them by ${gap}s to make it ${record} head-to-head.`
      );
    } else {
      mentions.push(
        `${rival.botName}, a frequent rival, got the better of you by ${gap}s today. They lead the head-to-head ${record}.`,
        `The battle with ${rival.botName} continues, with them winning by ${gap} seconds. Record: ${record} in their favor.`,
        `Your ongoing rivalry with ${rival.botName} saw them finish ${gap}s ahead. The head-to-head stands at ${record}.`,
        `${rival.botName} edged you out by ${gap} seconds in another close battle. They're up ${record} in your matchups.`
      );
    }
  }

  // Select a random mention for variety
  const selectedMention = mentions[Math.floor(Math.random() * mentions.length)];
  return selectedMention;
}

/**
 * Main function: Generate complete race story
 * v4.0: Two-part narrative structure with condensed recap and transition moments
 * Part 1: Race Story (intro + condensed recap + inline rival) ~120-140 words
 * Part 2: Forward Look (connector + transition + outlook) ~60-80 words
 */
async function generateRaceStory(raceData, seasonData, riderId = null, narrativeSelector = null, db = null) {
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
        context: ''
      };
    } catch (error) {
      console.error('Error generating season complete story:', error);
    }
  }

  // Determine performance tier for connector selection
  const position = raceData.position;
  const tier = getPerformanceTier(position);

  // ========================================
  // PART 1: RACE STORY (~120-140 words)
  // ========================================

  // Generate intro paragraph (uses narrative database if available)
  let introParagraph = '';
  if (riderId && narrativeSelector) {
    introParagraph = await generateIntroParagraph(
      { ...raceData, eventName, isFirstRace: seasonData.stagesCompleted === 1 },
      seasonData,
      riderId,
      narrativeSelector,
      db
    );
  } else {
    introParagraph = generateGenericIntro(
      { ...raceData, eventName, isFirstRace: seasonData.stagesCompleted === 1 },
      seasonData
    );
  }

  // Generate CONDENSED race recap
  const recapData = {
    ...raceData,
    eventName,
    isFirstRace: seasonData.stagesCompleted === 1
  };
  const recapParagraph = generateRaceRecapCondensed(recapData);

  // Generate inline rival phrase (not full paragraph)
  const rivalInline = generateRivalInline(raceData, seasonData);

  // Build Part 1: Weave intro, recap, and rival together
  let raceStory = introParagraph;

  // Add recap with rival woven in if present
  if (rivalInline) {
    // Insert rival phrase before the last sentence of recap
    const sentences = recapParagraph.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const lastSentence = sentences.pop();
      // Remove trailing punctuation from joined sentences before adding comma
      const joinedSentences = sentences.join(' ').replace(/[.!?]$/, '');
      raceStory += ' ' + joinedSentences + ', ' + rivalInline + '. ' + lastSentence;
    } else {
      raceStory += ' ' + recapParagraph.replace(/\.$/, '') + ', ' + rivalInline + '.';
    }
  } else {
    raceStory += ' ' + recapParagraph;
  }

  // ========================================
  // PART 2: FORWARD LOOK (~60-80 words)
  // ========================================

  // Select transition moment from narrative database (now includes its own opener)
  let transitionMoment = '';
  if (riderId && narrativeSelector && narrativeSelector.selectTransitionMoment) {
    try {
      const narrativeContext = {
        eventNumber: raceData.eventNumber,
        eventName: eventName,
        position: raceData.position,
        predictedPosition: raceData.predictedPosition,
        performanceTier: tier,
        totalPoints: seasonData.totalPoints,
        totalWins: seasonData.totalWins,
        totalPodiums: seasonData.totalPodiums || 0,
        recentResults: seasonData.recentResults || [],
        stagesCompleted: seasonData.stagesCompleted || 1,
        isOnStreak: seasonData.isOnStreak || false,
        personality: seasonData.personality || null,
        interviewsCompleted: seasonData.interviewsCompleted || 0
      };
      transitionMoment = await narrativeSelector.selectTransitionMoment(riderId, narrativeContext, db);
    } catch (error) {
      console.log(`   ⚠️ Transition selection failed: ${error.message}`);
    }
  }

  // Generate condensed forward look
  const forwardLook = generateForwardLook(seasonData, raceData);

  // Build Part 2: Transition moment + forward look (no separate connector)
  let forwardSection = transitionMoment || getDefaultTransition(tier);
  forwardSection += ' ' + forwardLook;

  // ========================================
  // COMBINE INTO COMPLETE STORY
  // ========================================
  const completeStory = raceStory.trim() + '\n\n' + forwardSection.trim();

  return {
    recap: completeStory,
    context: ''
  };
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateRaceStory, generateRaceRecapCondensed, EVENT_NAMES };
} else if (typeof window !== 'undefined') {
  window.storyGenerator = { generateRaceStory, generateRaceRecapCondensed, EVENT_NAMES };
}
