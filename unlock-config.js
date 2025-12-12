// unlock-config.js
// Shared unlock catalog for Cadence Credits preview

const UNLOCK_DEFINITIONS = [
  // Tier 120
  {
    id: 'paceNotes',
    name: 'Pace Notes Earbud',
    cost: 120,
    tier: 120,
    pointsBonus: 3,
    trigger: 'predictedWithinOne',
    description: 'Finish at predicted ±1 place',
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
  // Tier 200
  {
    id: 'aeroWheels',
    name: 'Aero Wheels',
    cost: 200,
    tier: 200,
    pointsBonus: 6,
    trigger: 'beatPrediction5',
    description: 'Beat prediction by 5+ places',
    emoji: '🛞'
  },
  {
    id: 'cadenceNutrition',
    name: 'Cadence Nutrition',
    cost: 200,
    tier: 200,
    pointsBonus: 5,
    trigger: 'gapUnder20',
    description: 'Finish within 20s of winner',
    emoji: '🥤'
  },
  {
    id: 'soigneurSession',
    name: 'Soigneur Session',
    cost: 200,
    tier: 200,
    pointsBonus: 5,
    trigger: 'predictedTop5AndFinishTop5',
    description: 'Predicted top 5 and finish top 5',
    emoji: '💆'
  },
  // Tier 300
  {
    id: 'preRaceMassage',
    name: 'Pre-Race Massage',
    cost: 300,
    tier: 300,
    pointsBonus: 7,
    trigger: 'predictedTopHalfAndPodium',
    description: 'Predicted top half and podium',
    emoji: '👐'
  },
  {
    id: 'climbingGears',
    name: 'Climbing Gears Tune',
    cost: 300,
    tier: 300,
    pointsBonus: 8,
    trigger: 'climbBeatBestClimber',
    description: 'Climbing event and beat top climber',
    emoji: '🧗'
  },
  {
    id: 'aggroRaceKit',
    name: 'Aggro Race Kit',
    cost: 300,
    tier: 300,
    pointsBonus: 7,
    trigger: 'top5OrSprintAndTop10',
    description: 'Finish top 5 or win sprint and top 10',
    emoji: '🔥'
  },
  // Tier 400
  {
    id: 'domestiqueHelp',
    name: 'Domestique Help',
    cost: 400,
    tier: 400,
    pointsBonus: 10,
    trigger: 'beatHighestARR',
    description: 'Beat highest ARR rider',
    emoji: '🫡'
  },
  {
    id: 'recoveryBoots',
    name: 'Recovery Boots',
    cost: 400,
    tier: 400,
    pointsBonus: 8,
    trigger: 'tourBackToBackTop8',
    description: 'Tour stage, top 8 on back-to-back',
    emoji: '🧦'
  },
  {
    id: 'directorsTablet',
    name: "Director's Tactics Tablet",
    cost: 400,
    tier: 400,
    pointsBonus: 9,
    trigger: 'beatPrediction8OrPodiumFrom10th',
    description: 'Beat prediction by 8+ or podium when predicted 10th+',
    emoji: '📋'
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
