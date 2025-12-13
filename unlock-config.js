// unlock-config.js
// Shared unlock catalog for Cadence Credits preview

const UNLOCK_DEFINITIONS = [
  // Tier 120
  {
    id: 'paceNotes',
    name: 'Pace Notes Earbud',
    cost: 100,
    tier: 120,
    pointsBonus: 3,
    trigger: 'predictedWithinFive',
    description: 'Finish within +/-5 places of prediction',
    narrative: 'Your DS whispers race intel through this sleek earbud—splits, rivals\' positions, tactical adjustments. When you execute the plan perfectly, the points flow.',
    emoji: '🗒️'
  },
  {
    id: 'teamCarRecon',
    name: 'Team Car Recon',
    cost: 120,
    tier: 120,
    pointsBonus: 4,
    trigger: 'top10OrCloseGap',
    description: 'Finish top 10 or lose <45s to winner',
    narrative: 'The team car scouts ahead, radioing back crucial course info—wind direction, attack points, dangerous corners. Stay close to the front and reap the rewards.',
    emoji: '🚗'
  },
  {
    id: 'sprintPrimer',
    name: 'Sprint Primer',
    cost: 120,
    tier: 120,
    pointsBonus: 4,
    trigger: 'segmentOrTop8',
    description: 'Win a sprint/segment or finish top 8',
    narrative: 'Pre-race caffeine gel hits different when you know the sprint. Whether it\'s a town line or the finish banner, light it up and claim your bonus.',
    emoji: '💨'
  },
  // Tier 200 (moderate)
  {
    id: 'aeroWheels',
    name: 'Aero Wheels',
    cost: 200,
    tier: 200,
    pointsBonus: 6,
    trigger: 'beatPrediction5Top10',
    description: 'Beat prediction by 5+ and finish top 10',
    narrative: 'Carbon fiber spins smooth and silent, slicing through air like a hot knife through butter. When you exceed expectations and crack the top 10, these wheels pay dividends.',
    emoji: '🛞'
  },
  {
    id: 'cadenceNutrition',
    name: 'Cadence Nutrition',
    cost: 200,
    tier: 200,
    pointsBonus: 5,
    trigger: 'gapUnder15',
    description: 'Finish within 15s of winner',
    narrative: 'Science in a bottle—perfectly timed carbs and electrolytes keep you firing on all cylinders. Hang with the leaders and this formula rewards your effort.',
    emoji: '🥤'
  },
  {
    id: 'soigneurSession',
    name: 'Soigneur Session',
    cost: 200,
    tier: 200,
    pointsBonus: 5,
    trigger: 'predictedTop5AndFinishTop5',
    description: 'Predicted top 5 and finish top 3',
    narrative: 'Magic hands work out the lactic acid and tension. When you\'re predicted among the best and deliver on that promise, the deep tissue work pays off in points.',
    emoji: '💆'
  },
  // Tier 300 (hard)
  {
    id: 'preRaceMassage',
    name: 'Pre-Race Massage',
    cost: 300,
    tier: 300,
    pointsBonus: 7,
    trigger: 'predictedTop8AndPodium',
    description: 'Predicted top 8 and finish on the podium',
    narrative: 'Warm oil and expert pressure loosen every muscle fiber before the gun fires. Predicted to contend and standing on the podium? That\'s the sweet spot.',
    emoji: '👐'
  },
  {
    id: 'climbingGears',
    name: 'Climbing Gears Tune',
    cost: 300,
    tier: 300,
    pointsBonus: 8,
    trigger: 'climbTop3',
    description: 'Climbing event and finish top 3',
    narrative: 'Lightweight cassette, perfectly dialed derailleurs—when gravity turns against you, these gears keep you dancing uphill. Summit podiums pay premium points.',
    emoji: '🧗'
  },
  {
    id: 'aggroRaceKit',
    name: 'Aggro Race Kit',
    cost: 300,
    tier: 300,
    pointsBonus: 7,
    trigger: 'top5OrTop10Gap10',
    description: 'finish top 3, or top 10 within 10s of winner',
    narrative: 'Loud kit, louder racing. This eye-catching jersey says you\'re here to attack, not survive. When you back up the boldness with results, the commissaires take notice.',
    emoji: '🔥'
  },
    {
    id: 'tightPackWin',
    name: 'Tight Pack Victory',
    cost: 300,
    tier: 300,
    pointsBonus: 8,
    trigger: 'winTightField',
    description: 'Win when top 10 finish within 5s',
    narrative: 'Chaos. Elbows. Screaming lungs. Ten riders within 5 seconds and you take the line first. When margins are razor-thin, winning from the chaos is art.',
    emoji: '🏁'
  },  // Tier 400
  {
    id: 'domestiqueHelp',
    name: 'Domestique Help',
    cost: 400,
    tier: 400,
    pointsBonus: 10,
    trigger: 'beatHighestARRAndPodium',
    description: 'Beat highest ARR rider and finish top 3',
    narrative: 'Your domestique sacrifices their race to shelter you from wind, chase down breaks, deliver bottles. When you repay their loyalty by slaying giants and podiuming, everyone wins.',
    emoji: '🫡'
  },
  {
    id: 'recoveryBoots',
    name: 'Recovery Boots',
    cost: 400,
    tier: 400,
    pointsBonus: 8,
    trigger: 'tourBackToBackPodiums',
    description: 'Tour stage and finish top 3',
    narrative: 'Compression technology flushes metabolic waste and speeds recovery between brutal tour stages. Back-to-back podiums in stage races? These boots are why.',
    emoji: '🧦'
  },

  {
    id: 'rivalSlayer',
    name: 'Rival Slayer',
    cost: 400,
    tier: 400,
    pointsBonus: 10,
    trigger: 'beatTopRival',
    description: 'Beat any of your top 3 rivals',
    narrative: 'You know their racing style, their strengths, their tells. When you cross the line ahead of one of your top rivals, the psychological victory is worth its weight in points.',
    emoji: '⚔️'
  },
  // Personality-Based Unlocks
  {
    id: 'mentalCoach',
    name: 'Mental Coach Session',
    cost: 250,
    tier: 200,
    pointsBonus: 5,
    trigger: 'beatPredictionByAny',
    description: 'Beat prediction → +6 pts & +5 Confidence',
    narrative: 'Weekly sessions with a sports psychologist rebuild your self-belief brick by brick. When you start outperforming predictions, that confidence becomes unstoppable.',
    emoji: '🧠',
    personalityBonus: { confidence: 5 }
  },
  {
    id: 'aggressionKit',
    name: 'Aggression Training Kit',
    cost: 250,
    tier: 200,
    pointsBonus: 6,
    trigger: 'winSprint',
    description: 'Win a sprint → +6 pts & +5 Aggression',
    narrative: 'Explosive intervals, gym sessions, controlled anger. This program teaches you to unleash fury when it counts. Win sprints, earn respect, build aggression.',
    emoji: '💪',
    personalityBonus: { aggression: 5 }
  },
  {
    id: 'tacticalRadio',
    name: 'Tactical Team Radio',
    cost: 250,
    tier: 200,
    pointsBonus: 5,
    trigger: 'finishTop10',
    description: 'Finish top 10 → +5 pts & +5 Professionalism',
    narrative: 'Clear comms, calm updates, tactical awareness. Consistent top-10s prove you\'re a reliable professional the team can count on race after race.',
    emoji: '📻',
    personalityBonus: { professionalism: 5 }
  },
  {
    id: 'professionalAttitude',
    name: 'Professional Mindset Course',
    cost: 250,
    tier: 200,
    pointsBonus: 5,
    trigger: 'withinPrediction',
    description: 'Finish within ±3 of prediction → +5 pts & +5 Professionalism',
    narrative: 'Consistency is professionalism. Hit your marks, execute the plan, deliver predictable results. Sponsors and teams love a rider they can count on.',
    emoji: '👔',
    personalityBonus: { professionalism: 5 }
  },
  {
    id: 'confidenceBooster',
    name: 'Champion\'s Mindset',
    cost: 350,
    tier: 300,
    pointsBonus: 8,
    trigger: 'podiumFinish',
    description: 'Requires 70+ Confidence. Podium → +8 pts',
    narrative: 'You believe you belong on that podium before the race even starts. That unshakable confidence turns good rides into great ones. Champions think like champions.',
    emoji: '👑',
    requiredPersonality: { confidence: 70 }
  },
  {
    id: 'aggressorHelmet',
    name: 'Aggressor\'s Helmet',
    cost: 350,
    tier: 300,
    pointsBonus: 8,
    trigger: 'winOrBeatBy5',
    description: 'Requires 70+ Aggression. Win or beat prediction by 5+ → +8 pts',
    narrative: 'Fear is fuel. This helmet reminds you that playing it safe wins nothing. Attack, exceed expectations, take what\'s yours. Aggression rewarded.',
    emoji: '⚔️',
    requiredPersonality: { aggression: 70 }
  },
  {
    id: 'teamLeaderJersey',
    name: 'Team Leader\'s Jersey',
    cost: 350,
    tier: 300,
    pointsBonus: 7,
    trigger: 'top15Finish',
    description: 'Requires 70+ Professionalism. Finish top 15 → +7 pts',
    narrative: 'Wearing the leader\'s number means responsibility. Deliver consistent top-15s and the team builds around you. Professionalism earns loyalty.',
    emoji: '🤝',
    requiredPersonality: { professionalism: 70 }
  },
  {
    id: 'calmAnalyst',
    name: 'Calm Analyst System',
    cost: 350,
    tier: 300,
    pointsBonus: 7,
    trigger: 'withinPrediction',
    description: 'Requires 70+ Professionalism. Finish within 3 of prediction → +7 pts',
    narrative: 'Power data, heart rate zones, race models—the numbers don\'t lie. When you race by the book and hit your predicted result, data-driven discipline pays off.',
    emoji: '🎯',
    requiredPersonality: { professionalism: 70 }
  },
  // New personality unlocks
  {
    id: 'humbleChampion',
    name: 'Humble Champion\'s Kit',
    cost: 350,
    tier: 300,
    pointsBonus: 7,
    trigger: 'podiumFinish',
    description: 'Requires 70+ Humility. Podium finish → +7 pts',
    narrative: 'Let your legs do the talking. No trash talk, no showboating—just pure results. When humility meets podiums, respect follows.',
    emoji: '🙏',
    requiredPersonality: { humility: 70 }
  },
  {
    id: 'showmanGear',
    name: 'Showman\'s Performance Kit',
    cost: 350,
    tier: 300,
    pointsBonus: 10,
    trigger: 'win',
    description: 'Requires 70+ Showmanship. Win → +10 pts',
    narrative: 'Victory salutes, celebratory wheelies, fan engagement—you know how to put on a show. When you win with flair, the cameras love you and so do the commissaires.',
    emoji: '🎭',
    requiredPersonality: { showmanship: 70 }
  },
  {
    id: 'comebackKing',
    name: 'Comeback King\'s Badge',
    cost: 350,
    tier: 300,
    pointsBonus: 8,
    trigger: 'beatPrediction3',
    description: 'Requires 70+ Resilience. Beat prediction by 3+ → +8 pts',
    narrative: 'Predicted to struggle? Doubted? Written off? Good. That chip on your shoulder fuels the comeback. Resilience means proving them all wrong.',
    emoji: '💪',
    requiredPersonality: { resilience: 70 }
  },
  {
    id: 'balancedApproach',
    name: 'Balanced Approach Module',
    cost: 500,
    tier: 400,
    pointsBonus: 6,
    trigger: 'top10',
    description: 'Requires balanced personality (all traits 45-65). Finish top 10 → +6 pts',
    narrative: 'No extremes, no weaknesses—just well-rounded excellence. When all your personality traits sit in harmony, consistent top-10s become your signature.',
    emoji: '⚖️',
    requiredBalanced: true
  }
];

function getUnlockById(id) {
  return UNLOCK_DEFINITIONS.find(u => u.id === id);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UNLOCK_DEFINITIONS,
    getUnlockById
  };
}

if (typeof window !== 'undefined') {
  window.unlockConfig = {
    UNLOCK_DEFINITIONS,
    getUnlockById
  };
}







