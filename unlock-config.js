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
    emoji: '📻',
    personalityBonus: { professionalism: 5 }
  },
  {
    id: 'professionalAttitude',
    name: 'Professional Mindset Course',
    cost: 250,
    tier: 200,
    pointsBonus: 5,
    trigger: 'completeRace',
    description: 'Complete race → +5 pts & +5 Professionalism',
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







