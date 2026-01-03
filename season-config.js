// season-config.js
// Season configuration and helper functions for TPV Career Mode
// Single source of truth for season definitions and progression rules

// ============================================================================
// SEASON DEFINITIONS
// ============================================================================

const SEASON_DEFINITIONS = {
  1: {
    id: 1,
    name: "Season 1",
    subtitle: "Local Amateur",
    eventRange: { start: 1, end: 15 },
    stageCount: 9,

    // Stage requirements (copied from event-config.js for completeness)
    stageRequirements: {
      1: { type: 'fixed', eventId: 1 },
      2: { type: 'fixed', eventId: 2 },
      3: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
      4: { type: 'fixed', eventId: 3 },
      5: { type: 'fixed', eventId: 4 },
      6: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
      7: { type: 'fixed', eventId: 5 },
      8: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
      9: { type: 'tour', eventIds: [13, 14, 15] }
    },

    // Event names for this season
    events: {
      1: { name: 'Coast and Roast Crit', type: 'criterium', distance: '23.4 km' },
      2: { name: 'Island Classic', type: 'road race', distance: '36.5 km' },
      3: { name: 'The Forest Velodrome Elimination', type: 'track elimination', distance: '10 km' },
      4: { name: 'Coastal Loop Time Challenge', type: 'time trial', distance: '~10.7 km' },
      5: { name: 'North Lake Points Race', type: 'points race', distance: '19.6 km' },
      6: { name: 'Easy Hill Climb', type: 'hill climb', distance: '9.6 km' },
      7: { name: 'Flat Eight Criterium', type: 'criterium', distance: '25.7 km' },
      8: { name: 'The Grand Gilbert Fondo', type: 'gran fondo', distance: '52.6 km' },
      9: { name: 'Base Camp Classic', type: 'hill climb', distance: '25.9 km' },
      10: { name: 'Beach and Pine TT', type: 'time trial', distance: '25.3 km' },
      11: { name: 'South Lake Points Race', type: 'points race', distance: '21.8 km' },
      12: { name: 'Unbound - Little Egypt', type: 'gravel race', distance: '38 km' },
      13: { name: 'Local Tour Stage 1', type: 'stage race', distance: '35.2 km' },
      14: { name: 'Local Tour Stage 2', type: 'stage race', distance: '27.3 km' },
      15: { name: 'Local Tour Stage 3', type: 'stage race', distance: '28.1 km' }
    },

    // Optional events pool for choice stages
    optionalEvents: [6, 7, 8, 9, 10, 11, 12],

    // Tour events (final stage)
    tourEvents: [13, 14, 15],

    // Time-based events (distance varies)
    timeBasedEvents: [4],

    // Season is always unlocked (first season)
    unlockRequirements: null,

    // Season completion check function
    completionField: 'season1Complete',

    // Status
    status: 'released',
    releaseDate: '2024-11-01'
  },

  2: {
    id: 2,
    name: "Season 2",
    subtitle: "Continental Pro",
    eventRange: { start: 16, end: 30 },
    stageCount: null,  // TBD - will be defined when S2 content is ready
    stageRequirements: null,  // TBD
    events: null,  // TBD
    optionalEvents: null,  // TBD
    tourEvents: null,  // TBD
    timeBasedEvents: null,  // TBD

    unlockRequirements: {
      previousSeason: 1,
      requireComplete: true
    },

    completionField: 'season2Complete',

    status: 'coming_soon',
    releaseDate: 'Spring 2026'
  },

  3: {
    id: 3,
    name: "Season 3",
    subtitle: "Pro Continental",
    eventRange: { start: 31, end: 45 },
    stageCount: null,
    stageRequirements: null,
    events: null,
    optionalEvents: null,
    tourEvents: null,
    timeBasedEvents: null,

    unlockRequirements: {
      previousSeason: 2,
      requireComplete: true
    },

    completionField: 'season3Complete',

    status: 'coming_soon',
    releaseDate: 'Summer 2026'
  },

  4: {
    id: 4,
    name: "Season 4",
    subtitle: "World Tour",
    eventRange: { start: 46, end: 60 },
    stageCount: null,
    stageRequirements: null,
    events: null,
    optionalEvents: null,
    tourEvents: null,
    timeBasedEvents: null,

    unlockRequirements: {
      previousSeason: 3,
      requireComplete: true
    },

    completionField: 'season4Complete',

    status: 'coming_soon',
    releaseDate: 'Fall 2026'
  },

  5: {
    id: 5,
    name: "Season 5",
    subtitle: "Legends",
    eventRange: { start: 61, end: 75 },
    stageCount: null,
    stageRequirements: null,
    events: null,
    optionalEvents: null,
    tourEvents: null,
    timeBasedEvents: null,

    unlockRequirements: {
      previousSeason: 4,
      requireComplete: true
    },

    completionField: 'season5Complete',

    status: 'coming_soon',
    releaseDate: 'Winter 2026'
  }
};

// Special events (career-wide, outside season progression)
const SPECIAL_EVENTS = {
  101: { name: 'Singapore Criterium', type: 'criterium', distance: null },
  102: { name: 'The Leveller', type: 'points race', distance: '17.5 km' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the season number for a given event ID
 * @param {number} eventId - The event ID
 * @returns {number|null} - Season number (1-5) or null for special events
 */
function getSeasonForEvent(eventId) {
  // Special events are outside seasons
  if (eventId >= 100) {
    return null;
  }

  for (const [seasonId, season] of Object.entries(SEASON_DEFINITIONS)) {
    if (eventId >= season.eventRange.start && eventId <= season.eventRange.end) {
      return parseInt(seasonId);
    }
  }

  return null;
}

/**
 * Get the index of an event within its season (1-based)
 * For example: event 23 in Season 2 (events 16-30) would return 8
 * @param {number} eventId - The event ID
 * @returns {number|null} - Index within season (1-based) or null
 */
function getEventIndexInSeason(eventId) {
  const seasonId = getSeasonForEvent(eventId);
  if (!seasonId) return null;

  const season = SEASON_DEFINITIONS[seasonId];
  return eventId - season.eventRange.start + 1;
}

/**
 * Get the full season configuration for a given season ID
 * @param {number} seasonId - The season ID (1-5)
 * @returns {object|null} - Season configuration or null
 */
function getSeasonConfig(seasonId) {
  return SEASON_DEFINITIONS[seasonId] || null;
}

/**
 * Check if a user can access a given season
 * @param {object} userData - User data from Firestore
 * @param {number} seasonId - The season ID to check access for
 * @returns {boolean} - Whether the user can access this season
 */
function canUserAccessSeason(userData, seasonId) {
  const season = SEASON_DEFINITIONS[seasonId];
  if (!season) return false;

  // Season not released yet
  if (season.status !== 'released') {
    return false;
  }

  // First season is always accessible
  if (!season.unlockRequirements) {
    return true;
  }

  // Check if previous season is complete
  const prevSeasonId = season.unlockRequirements.previousSeason;
  const prevSeason = SEASON_DEFINITIONS[prevSeasonId];

  if (season.unlockRequirements.requireComplete) {
    // Check the completion field for the previous season
    const completionField = prevSeason.completionField;
    return userData[completionField] === true;
  }

  return true;
}

/**
 * Check if a season is complete for a user
 * @param {object} userData - User data from Firestore
 * @param {number} seasonId - The season ID to check
 * @returns {boolean} - Whether the season is complete
 */
function isSeasonComplete(userData, seasonId) {
  const season = SEASON_DEFINITIONS[seasonId];
  if (!season) return false;

  // For Season 1, check root level field
  if (seasonId === 1) {
    return userData.season1Complete === true;
  }

  // For Season 2+, check nested structure
  return userData?.seasons?.[`season${seasonId}`]?.complete === true;
}

/**
 * Get the user's current active season
 * @param {object} userData - User data from Firestore
 * @returns {number} - The current season number (defaults to 1)
 */
function getCurrentSeason(userData) {
  return userData?.currentSeason || 1;
}

/**
 * Get all seasons a user has completed
 * @param {object} userData - User data from Firestore
 * @returns {number[]} - Array of completed season IDs
 */
function getCompletedSeasons(userData) {
  const completed = [];

  for (const seasonId of Object.keys(SEASON_DEFINITIONS)) {
    if (isSeasonComplete(userData, parseInt(seasonId))) {
      completed.push(parseInt(seasonId));
    }
  }

  return completed;
}

/**
 * Get event name for any event (including special events)
 * @param {number} eventId - The event ID
 * @returns {string} - Event name or fallback
 */
function getEventName(eventId) {
  // Check special events first
  if (SPECIAL_EVENTS[eventId]) {
    return SPECIAL_EVENTS[eventId].name;
  }

  // Find in season events
  const seasonId = getSeasonForEvent(eventId);
  if (seasonId) {
    const season = SEASON_DEFINITIONS[seasonId];
    if (season.events && season.events[eventId]) {
      return season.events[eventId].name;
    }
  }

  return `Event ${eventId}`;
}

/**
 * Check if an event is a special event (career-wide, outside seasons)
 * @param {number} eventId - The event ID
 * @returns {boolean} - Whether it's a special event
 */
function isSpecialEvent(eventId) {
  return eventId >= 100;
}

/**
 * Get all released seasons
 * @returns {object[]} - Array of released season configs
 */
function getReleasedSeasons() {
  return Object.values(SEASON_DEFINITIONS).filter(s => s.status === 'released');
}

/**
 * Get all seasons (for displaying in UI with coming soon indicators)
 * @returns {object[]} - Array of all season configs
 */
function getAllSeasons() {
  return Object.values(SEASON_DEFINITIONS);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEASON_DEFINITIONS,
    SPECIAL_EVENTS,
    getSeasonForEvent,
    getEventIndexInSeason,
    getSeasonConfig,
    canUserAccessSeason,
    isSeasonComplete,
    getCurrentSeason,
    getCompletedSeasons,
    getEventName,
    isSpecialEvent,
    getReleasedSeasons,
    getAllSeasons
  };
}

// Export for browser (window object)
if (typeof window !== 'undefined') {
  window.seasonConfig = {
    SEASON_DEFINITIONS,
    SPECIAL_EVENTS,
    getSeasonForEvent,
    getEventIndexInSeason,
    getSeasonConfig,
    canUserAccessSeason,
    isSeasonComplete,
    getCurrentSeason,
    getCompletedSeasons,
    getEventName,
    isSpecialEvent,
    getReleasedSeasons,
    getAllSeasons
  };
}
