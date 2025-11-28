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
    icon: '👊',
    description: 'Beat prediction by 10+ places',
    calculationType: 'event'
  },
  giantKillerMedal: {
    id: 'giantKillerMedal',
    title: 'Giant Killer',
    icon: '🗡️',
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
    description: 'Beat prediction 3 events in a row',
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
    description: 'Finish within 0.1s of winner (or win by less than 0.1s)',
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
    description: 'Complete 5+ weekend events',
    calculationType: 'career'
  },
  
  // NEW: Progression awards (career)
  zeroToHero: {
    id: 'zeroToHero',
    title: 'Zero to Hero',
    icon: '🚀',
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
