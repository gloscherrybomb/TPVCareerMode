// season-data-helpers.js
// Unified read/write functions for season data in TPV Career Mode
// Handles dual storage pattern: S1 at root level, S2+ nested under seasons.*

// Import season config if in Node.js environment
let seasonConfigModule;
if (typeof require !== 'undefined') {
  try {
    seasonConfigModule = require('./season-config.js');
  } catch (e) {
    // Module not available, will use window.seasonConfig in browser
  }
}

// Get season config (works in both Node.js and browser)
function getSeasonConfigModule() {
  if (seasonConfigModule) return seasonConfigModule;
  if (typeof window !== 'undefined' && window.seasonConfig) return window.seasonConfig;
  throw new Error('season-config.js not loaded');
}

// ============================================================================
// EVENT RESULTS - READ
// ============================================================================

/**
 * Get event results for a specific event
 * Handles dual storage: S1 at root level, S2+ nested
 * @param {object} userData - User document from Firestore
 * @param {number} eventNumber - The event ID
 * @returns {object|null} - Event results or null if not found
 */
function getEventResults(userData, eventNumber) {
  if (!userData) return null;

  const config = getSeasonConfigModule();
  const seasonId = config.getSeasonForEvent(eventNumber);

  // Special events are stored at root level with eventXXXResults pattern
  if (seasonId === null) {
    return userData[`event${eventNumber}Results`] || null;
  }

  // Season 1: stored at root level (backward compatible)
  if (seasonId === 1) {
    return userData[`event${eventNumber}Results`] || null;
  }

  // Season 2+: stored in nested structure
  return userData?.seasons?.[`season${seasonId}`]?.[`event${eventNumber}Results`] || null;
}

/**
 * Check if an event has been completed (has results)
 * @param {object} userData - User document from Firestore
 * @param {number} eventNumber - The event ID
 * @returns {boolean} - Whether the event has been completed
 */
function hasEventResults(userData, eventNumber) {
  const results = getEventResults(userData, eventNumber);
  return results !== null && results.position !== undefined;
}

/**
 * Get all event results for a specific season
 * @param {object} userData - User document from Firestore
 * @param {number} seasonId - The season ID
 * @returns {object} - Map of eventId -> results
 */
function getSeasonEventResults(userData, seasonId) {
  if (!userData) return {};

  const config = getSeasonConfigModule();
  const season = config.getSeasonConfig(seasonId);
  if (!season || !season.events) return {};

  const results = {};

  for (const eventId of Object.keys(season.events)) {
    const eventResults = getEventResults(userData, parseInt(eventId));
    if (eventResults) {
      results[eventId] = eventResults;
    }
  }

  return results;
}

// ============================================================================
// SEASON DATA - READ
// ============================================================================

/**
 * Get season-specific data for a user
 * Returns structured data regardless of storage location
 * @param {object} userData - User document from Firestore
 * @param {number} seasonId - The season ID
 * @returns {object|null} - Season data or null
 */
function getSeasonData(userData, seasonId) {
  if (!userData) return null;

  // Season 1: data stored at root level
  if (seasonId === 1) {
    return {
      complete: userData.season1Complete || false,
      rank: userData.season1Rank || null,
      standings: userData.season1Standings || null,
      currentStage: userData.currentStage || 1,
      completedStages: userData.completedStages || [],
      completedOptionalEvents: userData.completedOptionalEvents || [],
      choiceSelections: userData.choiceSelections || {},
      usedOptionalEvents: userData.usedOptionalEvents || [],
      totalPoints: userData.totalPoints || 0,
      completionDate: userData.season1CompletionDate || null,
      completionStory: userData.season1CompletionStory || null
    };
  }

  // Season 2+: data stored in nested structure
  const seasonData = userData?.seasons?.[`season${seasonId}`];
  if (!seasonData) {
    return null; // Season hasn't been started
  }

  return {
    complete: seasonData.complete || false,
    rank: seasonData.rank || null,
    standings: seasonData.standings || null,
    currentStage: seasonData.currentStage || 1,
    completedStages: seasonData.completedStages || [],
    completedOptionalEvents: seasonData.completedOptionalEvents || [],
    choiceSelections: seasonData.choiceSelections || {},
    usedOptionalEvents: seasonData.usedOptionalEvents || [],
    totalPoints: seasonData.totalPoints || 0,
    completionDate: seasonData.completionDate || null,
    completionStory: seasonData.completionStory || null
  };
}

/**
 * Get season progress as a percentage
 * @param {object} userData - User document from Firestore
 * @param {number} seasonId - The season ID
 * @returns {number} - Progress percentage (0-100)
 */
function getSeasonProgress(userData, seasonId) {
  const config = getSeasonConfigModule();
  const season = config.getSeasonConfig(seasonId);
  if (!season || !season.stageCount) return 0;

  const seasonData = getSeasonData(userData, seasonId);
  if (!seasonData) return 0;

  const completedCount = seasonData.completedStages.length;
  return Math.round((completedCount / season.stageCount) * 100);
}

/**
 * Get season statistics summary for a completed season
 * Uses stored Firebase values as the source of truth for main stats
 * @param {object} userData - User document from Firestore
 * @param {number} seasonId - The season ID
 * @returns {object|null} - Season stats or null
 */
function getSeasonStats(userData, seasonId) {
  const config = getSeasonConfigModule();
  const season = config.getSeasonConfig(seasonId);
  if (!season || !season.events) return null;

  const seasonData = getSeasonData(userData, seasonId);
  if (!seasonData) return null;

  // Get stored season stats from Firebase (source of truth)
  let storedStats;
  if (seasonId === 1) {
    storedStats = {
      events: userData.season1Events || 0,
      wins: userData.season1Wins || 0,
      podiums: userData.season1Podiums || 0,
      topTens: userData.season1Top10s || 0,
      points: userData.season1Points || 0,
      bestFinish: userData.season1BestFinish || null,
      avgFinish: userData.season1AvgFinish || null
    };
  } else {
    // Season 2+ stats are stored in nested structure
    const seasonKey = `season${seasonId}`;
    const nestedData = userData?.seasons?.[seasonKey] || {};
    storedStats = {
      events: nestedData.events || 0,
      wins: nestedData.wins || 0,
      podiums: nestedData.podiums || 0,
      topTens: nestedData.top10s || 0,
      points: nestedData.points || 0,
      bestFinish: nestedData.bestFinish || null,
      avgFinish: nestedData.avgFinish || null
    };
  }

  // Only calculate worstFinish and totalCadenceCredits from event results (not stored)
  const eventResults = getSeasonEventResults(userData, seasonId);
  const positions = [];
  let totalCC = 0;

  for (const [eventId, results] of Object.entries(eventResults)) {
    if (results && results.position && results.position !== 'DNF') {
      positions.push(parseInt(results.position));
      totalCC += (results.earnedCadenceCredits || 0) + (results.unlockBonusPoints || 0);
    }
  }

  if (storedStats.events === 0 && positions.length === 0) return null;

  return {
    eventsCompleted: storedStats.events,
    bestFinish: storedStats.bestFinish,
    worstFinish: positions.length > 0 ? Math.max(...positions) : null,
    averageFinish: storedStats.avgFinish,
    wins: storedStats.wins,
    podiums: storedStats.podiums,
    topTens: storedStats.topTens,
    totalPoints: storedStats.points,
    totalCadenceCredits: totalCC,
    finalRank: seasonData.rank,
    completionDate: seasonData.completionDate,
    completionStory: seasonData.completionStory
  };
}

// ============================================================================
// CAREER DATA - READ
// ============================================================================

/**
 * Get career-wide statistics (across all seasons)
 * @param {object} userData - User document from Firestore
 * @returns {object} - Career stats
 */
function getCareerStats(userData) {
  if (!userData) {
    return {
      careerPoints: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerEvents: 0,
      careerTop10s: 0,
      careerBestFinish: null,
      careerAvgFinish: null,
      careerWinRate: 0,
      careerPodiumRate: 0,
      seasonsCompleted: 0
    };
  }

  return {
    careerPoints: userData.careerPoints || 0,
    careerWins: userData.careerWins || 0,
    careerPodiums: userData.careerPodiums || 0,
    careerEvents: userData.careerEvents || 0,
    careerTop10s: userData.careerTop10s || 0,
    careerBestFinish: userData.careerBestFinish || null,
    careerAvgFinish: userData.careerAvgFinish || null,
    careerWinRate: userData.careerWinRate || 0,
    careerPodiumRate: userData.careerPodiumRate || 0,
    seasonsCompleted: getSeasonConfigModule().getCompletedSeasons(userData).length
  };
}

/**
 * Get all event results across all seasons (for palmares)
 * Returns results in chronological order by race date
 * @param {object} userData - User document from Firestore
 * @returns {object[]} - Array of {eventId, seasonId, results} objects
 */
function getAllEventResults(userData) {
  if (!userData) return [];

  const config = getSeasonConfigModule();
  const allResults = [];

  // Get Season 1 results (events 1-15)
  for (let eventId = 1; eventId <= 15; eventId++) {
    const results = getEventResults(userData, eventId);
    if (results && results.position !== undefined) {
      allResults.push({
        eventId,
        seasonId: 1,
        eventName: config.getEventName(eventId),
        results
      });
    }
  }

  // Get Season 2+ results (if they exist)
  if (userData.seasons) {
    for (const [seasonKey, seasonData] of Object.entries(userData.seasons)) {
      const seasonId = parseInt(seasonKey.replace('season', ''));
      const season = config.getSeasonConfig(seasonId);
      if (!season) continue;

      for (let eventId = season.eventRange.start; eventId <= season.eventRange.end; eventId++) {
        const results = seasonData[`event${eventId}Results`];
        if (results && results.position !== undefined) {
          allResults.push({
            eventId,
            seasonId,
            eventName: config.getEventName(eventId),
            results
          });
        }
      }
    }
  }

  // Get special event results (101, 102, etc.)
  for (const eventId of Object.keys(config.SPECIAL_EVENTS)) {
    const results = userData[`event${eventId}Results`];
    if (results && results.position !== undefined) {
      allResults.push({
        eventId: parseInt(eventId),
        seasonId: null,
        eventName: config.getEventName(parseInt(eventId)),
        isSpecialEvent: true,
        results
      });
    }
  }

  // Sort by race date (most recent first) or processedAt as fallback
  allResults.sort((a, b) => {
    const dateA = a.results.raceDate?.toDate?.() || a.results.processedAt?.toDate?.() || new Date(0);
    const dateB = b.results.raceDate?.toDate?.() || b.results.processedAt?.toDate?.() || new Date(0);
    return dateB - dateA;
  });

  return allResults;
}

// ============================================================================
// FIRESTORE PATHS - WRITE HELPERS
// ============================================================================

/**
 * Get the Firestore field path for storing event results
 * @param {number} eventNumber - The event ID
 * @returns {string} - Firestore field path
 */
function getEventResultsPath(eventNumber) {
  const config = getSeasonConfigModule();
  const seasonId = config.getSeasonForEvent(eventNumber);

  // Special events and Season 1: root level
  if (seasonId === null || seasonId === 1) {
    return `event${eventNumber}Results`;
  }

  // Season 2+: nested path
  return `seasons.season${seasonId}.event${eventNumber}Results`;
}

/**
 * Get the Firestore field path for season-specific data
 * @param {number} seasonId - The season ID
 * @param {string} field - The field name (e.g., 'currentStage', 'completedStages')
 * @returns {string} - Firestore field path
 */
function getSeasonFieldPath(seasonId, field) {
  // Season 1: root level
  if (seasonId === 1) {
    // Map standardized field names to S1 field names
    const fieldMap = {
      'complete': 'season1Complete',
      'rank': 'season1Rank',
      'standings': 'season1Standings',
      'completionDate': 'season1CompletionDate',
      'completionStory': 'season1CompletionStory',
      'currentStage': 'currentStage',
      'completedStages': 'completedStages',
      'completedOptionalEvents': 'completedOptionalEvents',
      'choiceSelections': 'choiceSelections',
      'usedOptionalEvents': 'usedOptionalEvents',
      'totalPoints': 'totalPoints'
    };
    return fieldMap[field] || field;
  }

  // Season 2+: nested path
  return `seasons.season${seasonId}.${field}`;
}

/**
 * Build an update object for Firestore with proper paths
 * @param {number} seasonId - The season ID
 * @param {object} updates - Object with field:value pairs to update
 * @returns {object} - Firestore update object with proper paths
 */
function buildSeasonUpdate(seasonId, updates) {
  const updateObj = {};

  for (const [field, value] of Object.entries(updates)) {
    const path = getSeasonFieldPath(seasonId, field);
    updateObj[path] = value;
  }

  return updateObj;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Read functions
    getEventResults,
    hasEventResults,
    getSeasonEventResults,
    getSeasonData,
    getSeasonProgress,
    getSeasonStats,
    getCareerStats,
    getAllEventResults,
    // Write helpers
    getEventResultsPath,
    getSeasonFieldPath,
    buildSeasonUpdate
  };
}

// Export for browser (window object)
if (typeof window !== 'undefined') {
  window.seasonDataHelpers = {
    // Read functions
    getEventResults,
    hasEventResults,
    getSeasonEventResults,
    getSeasonData,
    getSeasonProgress,
    getSeasonStats,
    getCareerStats,
    getAllEventResults,
    // Write helpers
    getEventResultsPath,
    getSeasonFieldPath,
    buildSeasonUpdate
  };
}
