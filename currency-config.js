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
  photoFinish: 20,
  gcGoldMedal: 80,
  gcSilverMedal: 60,
  gcBronzeMedal: 45,
  seasonChampion: 120,
  seasonRunnerUp: 80,
  seasonThirdPlace: 60,
  perfectSeason: 150,
  podiumStreak: 50,
  weekendWarrior: 20,
  trophyCollector: 20,
  specialist: 20,
  allRounder: 25,
  comeback: 25,
  lanternRouge: 10,
  overrated: 5,
  technicalIssues: 5
};

// Safety cap per event to avoid runaway stacking in preview
const PER_EVENT_CREDIT_CAP = 200;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEATURE_FLAG_KEY,
    AWARD_CREDIT_MAP,
    PER_EVENT_CREDIT_CAP
  };
}

if (typeof window !== 'undefined') {
  window.currencyConfig = {
    FEATURE_FLAG_KEY,
    AWARD_CREDIT_MAP,
    PER_EVENT_CREDIT_CAP
  };
}
