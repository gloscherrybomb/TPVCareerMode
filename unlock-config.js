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
    narrative: 'Your DS whispers race intel—splits, rivals, tactics. Execute the plan perfectly.',
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
    narrative: 'The team car scouts ahead, radioing crucial course info. Stay near the front.',
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
    narrative: 'Pre-race caffeine gel hits different when you know the sprint is yours.',
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
    narrative: 'Carbon fiber slicing through air. Exceed expectations and these wheels pay dividends.',
    emoji: '🛞',
    emojiFallback: '⚙️'
  },
  {
    id: 'cadenceNutrition',
    name: 'Cadence Nutrition',
    cost: 200,
    tier: 200,
    pointsBonus: 5,
    trigger: 'gapUnder15',
    description: 'Finish within 15s of winner',
    narrative: 'Perfectly timed carbs and electrolytes. Hang with the leaders for rewards.',
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
    narrative: 'Magic hands work out the tension. Deliver on your promise for bonus points.',
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
    narrative: 'Expert hands loosen every muscle. Predicted to contend, standing on podium.',
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
    narrative: 'Lightweight cassette, dialed derailleurs. Dance uphill to summit podiums.',
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
    narrative: 'Loud kit, louder racing. Here to attack, not survive. Back it up with results.',
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
    narrative: 'Chaos. Elbows. Screaming lungs. Win from the chaos when margins are razor-thin.',
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
    narrative: 'Your domestique sacrifices their race for you. Repay their loyalty with a podium.',
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
    narrative: 'Compression tech speeds recovery between brutal stages. Podium in tours.',
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
    narrative: 'You know their style, their tells. Crossing ahead of rivals is psychological gold.',
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
    narrative: 'Sports psychology rebuilds self-belief. Outperform predictions, build confidence.',
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
    narrative: 'Explosive intervals and controlled fury. Win sprints, earn respect.',
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
    narrative: 'Clear comms, tactical awareness. Consistent top-10s prove reliability.',
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
    narrative: 'Consistency is professionalism. Hit your marks, deliver predictable results.',
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
    narrative: 'Believe you belong on that podium. Champions think like champions.',
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
    narrative: 'Fear is fuel. Playing it safe wins nothing. Attack and take what\'s yours.',
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
    narrative: 'The leader\'s number means responsibility. Deliver and the team builds around you.',
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
    narrative: 'Power data, race models—numbers don\'t lie. Data-driven discipline pays off.',
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
    narrative: 'Let your legs do the talking. No showboating—just results. Humility earns respect.',
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
    narrative: 'Victory salutes, wheelies, fan engagement. Win with flair and the cameras love you.',
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
    narrative: 'Doubted? Written off? Good. That chip on your shoulder fuels the comeback.',
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
    narrative: 'No extremes, no weaknesses—well-rounded excellence. Consistent top-10s are your signature.',
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







