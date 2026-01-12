// currency-config.js
// Shared configuration for Cadence Credits preview

const FEATURE_FLAG_KEY = 'previewCadenceCredits';

// Award -> Cadence Credits mapping
const AWARD_CREDIT_MAP = {
  goldMedal: 50,
  silverMedal: 35,
  bronzeMedal: 25,
  punchingMedal: 30,
  giantKillerMedal: 40,
  bullseyeMedal: 15,
  hotStreakMedal: 25,
  darkHorse: 35,
  zeroToHero: 35,
  domination: 40,
  closeCall: 25,
  photoFinish: 30,
  gcGoldMedal: 80,
  gcSilverMedal: 60,
  gcBronzeMedal: 45,
  seasonChampion: 120,
  seasonRunnerUp: 80,
  seasonThirdPlace: 60,
  perfectSeason: 150,
  podiumStreak: 50,
  backToBack: 50,
  weekendWarrior: 20,
  trophyCollector: 20,
  specialist: 20,
  allRounder: 25,
  comeback: 25,
  lanternRouge: 10,
  overrated: 5,
  technicalIssues: 5,
  windTunnel: 25,
  theAccountant: 30,
  theEqualizer: 30,  // Special event award - 30CC + 20CC completion bonus = 50CC for The Leveller
  singaporeSling: 30,  // Singapore Criterium podium bonus
  valentineChampion2026: 80,  // Valentine's Invitational 1st place
  valentinePodium2026: 50,    // Valentine's Invitational podium
  // Power-based awards
  powerSurge: 25,
  steadyEddie: 30,
  blastOff: 50,
  smoothOperator: 30,
  bunchKick: 30,
  // Community award
  fanFavourite: 50,
  // Season reset award
  gluttonForPunishment: 100
};

// Safety cap per event to avoid runaway stacking in preview
const PER_EVENT_CREDIT_CAP = 150;

// Bonus CC for completing a race when no awards are earned
const COMPLETION_BONUS_CC = 20;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEATURE_FLAG_KEY,
    AWARD_CREDIT_MAP,
    PER_EVENT_CREDIT_CAP,
    COMPLETION_BONUS_CC
  };
}

if (typeof window !== 'undefined') {
  window.currencyConfig = {
    FEATURE_FLAG_KEY,
    AWARD_CREDIT_MAP,
    PER_EVENT_CREDIT_CAP,
    COMPLETION_BONUS_CC
  };
}
