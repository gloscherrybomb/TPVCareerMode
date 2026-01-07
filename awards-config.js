// Awards Configuration for TPV Career Mode
// This file defines all available awards and their calculation criteria

/**
 * Award definitions with calculation criteria
 * Each award specifies:
 * - id: unique identifier
 * - title: display name
 * - icon: emoji icon
 * - description: what the award is for
 * - calculationType: 'event' (per-event) or 'career' (across multiple events)
 */

const AWARD_DEFINITIONS = {
  // Podium awards (per event)
  goldMedal: {
    id: 'goldMedal',
    title: 'Gold Medal',
    icon: '🥇',
    description: 'Win a race',
    calculationType: 'event'
  },
  silverMedal: {
    id: 'silverMedal',
    title: 'Silver Medal',
    icon: '🥈',
    description: 'Finish 2nd',
    calculationType: 'event'
  },
  bronzeMedal: {
    id: 'bronzeMedal',
    title: 'Bronze Medal',
    icon: '🥉',
    description: 'Finish 3rd',
    calculationType: 'event'
  },
  
  // Special position awards (per event)
  lanternRouge: {
    id: 'lanternRouge',
    title: 'Lantern Rouge',
    icon: '🏮',
    description: 'Finish last among finishers',
    calculationType: 'event'
  },
  
  // Performance vs prediction awards (per event)
  punchingMedal: {
    id: 'punchingMedal',
    title: 'Punching Above',
    icon: '🥊',
    description: 'Beat prediction by 10+ places',
    calculationType: 'event'
  },
  giantKillerMedal: {
    id: 'giantKillerMedal',
    title: 'Giant Killer',
    icon: '⚔️',
    description: 'Beat the highest-rated rider',
    calculationType: 'event'
  },
  bullseyeMedal: {
    id: 'bullseyeMedal',
    title: 'Bullseye',
    icon: '🎯',
    description: 'Finish exactly at predicted position',
    calculationType: 'event'
  },
  hotStreakMedal: {
    id: 'hotStreakMedal',
    title: 'Hot Streak',
    icon: '🔥',
    description: 'Beat prediction 3 races in a row',
    calculationType: 'event'
  },
  
  // NEW: Margin of victory awards (per event)
  domination: {
    id: 'domination',
    title: 'Domination',
    icon: '💪',
    description: 'Win by more than a minute',
    calculationType: 'event'
  },
  closeCall: {
    id: 'closeCall',
    title: 'Close Call',
    icon: '😅',
    description: 'Win by less than 0.5 seconds',
    calculationType: 'event'
  },
  photoFinish: {
    id: 'photoFinish',
    title: 'Photo Finish',
    icon: '📸',
    description: 'Finish within 0.2s of winner',
    calculationType: 'event'
  },
  
  // NEW: Prediction performance awards (career)
  overrated: {
    id: 'overrated',
    title: 'Overrated',
    icon: '📉',
    description: 'Finish worse than predicted 5+ times',
    calculationType: 'career'
  },
  darkHorse: {
    id: 'darkHorse',
    title: 'Dark Horse',
    icon: '🐴',
    description: 'Win when predicted 15th or worse',
    calculationType: 'event'
  },
  
  // NEW: Consistency awards (career)
  backToBack: {
    id: 'backToBack',
    title: 'Back to Back',
    icon: '🔁',
    description: 'Win 2 races in a row',
    calculationType: 'career'
  },
  weekendWarrior: {
    id: 'weekendWarrior',
    title: 'Weekend Warrior',
    icon: '🏁',
    description: 'Complete 5+ events on weekends (Saturday or Sunday)',
    calculationType: 'career'
  },
  
  // NEW: Progression awards (career)
  zeroToHero: {
    id: 'zeroToHero',
    title: 'Zero to Hero',
    icon: '🦸',
    description: 'Bottom 20% one event, top 20% next',
    calculationType: 'career'
  },
  trophyCollector: {
    id: 'trophyCollector',
    title: 'Trophy Collector',
    icon: '🏆',
    description: 'Podium 5+ times',
    calculationType: 'career'
  },
  
  // NEW: Reliability awards (career)
  technicalIssues: {
    id: 'technicalIssues',
    title: 'Technical Issues',
    icon: '🔧',
    description: 'DNF 3+ times',
    calculationType: 'career'
  },
  
  // GC (General Classification) awards for stage races
  gcGoldMedal: {
    id: 'gcGoldMedal',
    title: 'GC Winner',
    icon: '🏆',
    description: 'Win the overall General Classification',
    calculationType: 'event'
  },
  gcSilverMedal: {
    id: 'gcSilverMedal',
    title: 'GC Second',
    icon: '🥈',
    description: 'Finish 2nd in overall General Classification',
    calculationType: 'event'
  },
  gcBronzeMedal: {
    id: 'gcBronzeMedal',
    title: 'GC Third',
    icon: '🥉',
    description: 'Finish 3rd in overall General Classification',
    calculationType: 'event'
  },
  
  // Season Overall Podium Trophies
  seasonChampion: {
    id: 'seasonChampion',
    title: 'Season Champion',
    icon: '🏆',
    description: 'Win the overall season standings',
    calculationType: 'season'
  },
  seasonRunnerUp: {
    id: 'seasonRunnerUp',
    title: 'Season Runner-Up',
    icon: '🥈',
    description: 'Finish 2nd in overall season standings',
    calculationType: 'season'
  },
  seasonThirdPlace: {
    id: 'seasonThirdPlace',
    title: 'Season Third Place',
    icon: '🥉',
    description: 'Finish 3rd in overall season standings',
    calculationType: 'season'
  },
  
  // Fun/Special Awards
  perfectSeason: {
    id: 'perfectSeason',
    title: 'Perfect Season',
    icon: '💯',
    description: 'Win every event in a season',
    calculationType: 'season'
  },
  podiumStreak: {
    id: 'podiumStreak',
    title: 'Podium Streak',
    icon: '📈',
    description: 'Finish top 3 in 5+ consecutive races',
    calculationType: 'career'
  },
  specialist: {
    id: 'specialist',
    title: 'Specialist',
    icon: '⭐',
    description: 'Win 3+ events of the same type',
    calculationType: 'career'
  },
  allRounder: {
    id: 'allRounder',
    title: 'All-Rounder',
    icon: '🌟',
    description: 'Win at least one event of 5+ different types',
    calculationType: 'career'
  },
  comeback: {
    id: 'comeback',
    title: 'Comeback Kid',
    icon: '🔄',
    description: 'Finish top 5 after finishing in the bottom half of the previous race',
    calculationType: 'event'
  },

  // Time Trial Awards
  windTunnel: {
    id: 'windTunnel',
    title: 'Wind Tunnel',
    icon: '🌬️',
    description: 'Finish top 5 in a time trial when predicted outside top 5',
    calculationType: 'event'
  },

  // Points Race Awards
  theAccountant: {
    id: 'theAccountant',
    title: 'The Accountant',
    icon: '🧮',
    description: 'Score more points than the rider who crossed the line first',
    calculationType: 'event'
  },

  // Special Event Awards
  theEqualizer: {
    id: 'theEqualizer',
    title: 'The Equalizer',
    icon: '🎚️',
    description: 'Complete The Leveller special event',
    calculationType: 'event'
  },
  singaporeSling: {
    id: 'singaporeSling',
    title: 'Singapore Sling',
    icon: '🍸',
    description: 'Podium at the Singapore Criterium',
    calculationType: 'event'
  },

  // Power-based awards (requires JSON results with power data)
  powerSurge: {
    id: 'powerSurge',
    title: 'Power Surge',
    icon: '💥',
    description: 'Max power exceeds average by 30%+ and finish top 10',
    calculationType: 'event'
  },
  steadyEddie: {
    id: 'steadyEddie',
    title: 'Steady Eddie',
    icon: '📊',
    description: 'Normalized power within 1% of average power',
    calculationType: 'event'
  },
  blastOff: {
    id: 'blastOff',
    title: 'Blast Off',
    icon: '🚀',
    description: 'Break 1300W max power (one-time achievement)',
    calculationType: 'career'
  },
  smoothOperator: {
    id: 'smoothOperator',
    title: 'Smooth Operator',
    icon: '🎵',
    description: 'Smallest difference between average and normalized power in top 5',
    calculationType: 'event'
  },
  bunchKick: {
    id: 'bunchKick',
    title: 'Bunch Kick',
    icon: '💢',
    description: 'Highest max power in a group sprint finish (3+ riders within 3 seconds)',
    calculationType: 'event'
  },

  // Community award
  fanFavourite: {
    id: 'fanFavourite',
    title: 'Fan Favourite',
    icon: '💜',
    description: 'Receive 100 high-5s from the community',
    calculationType: 'career'
  },

  // Season reset award
  gluttonForPunishment: {
    id: 'gluttonForPunishment',
    title: 'Glutton for Punishment',
    icon: '🎖️',
    description: 'Reset and restart the season after completing it',
    calculationType: 'career'
  }
};

// Helper to get all award IDs
function getAllAwardIds() {
  return Object.keys(AWARD_DEFINITIONS);
}

// Helper to get award by ID
function getAwardDefinition(awardId) {
  return AWARD_DEFINITIONS[awardId];
}

// Helper to get all event-based awards
function getEventBasedAwards() {
  return Object.values(AWARD_DEFINITIONS)
    .filter(award => award.calculationType === 'event')
    .map(award => award.id);
}

// Helper to get all career-based awards
function getCareerBasedAwards() {
  return Object.values(AWARD_DEFINITIONS)
    .filter(award => award.calculationType === 'career')
    .map(award => award.id);
}

// Export for Node.js (process-results.js, reprocess-results.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AWARD_DEFINITIONS,
    getAllAwardIds,
    getAwardDefinition,
    getEventBasedAwards,
    getCareerBasedAwards
  };
}

// Export for browser (profile.js, event-detail-results.js)
if (typeof window !== 'undefined') {
  window.AWARD_DEFINITIONS = AWARD_DEFINITIONS;
  window.awardsConfig = {
    getAllAwardIds,
    getAwardDefinition,
    getEventBasedAwards,
    getCareerBasedAwards
  };
}
