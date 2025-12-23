// event-config.js
// Shared event configuration constants for TPV Career Mode
// Single source of truth for event names, types, and progression rules

// Event names - canonical names for all events
const EVENT_NAMES = {
  1: 'Coast and Roast Crit',
  2: 'Island Classic',
  3: 'The Forest Velodrome Elimination',
  4: 'Coastal Loop Time Challenge',
  5: 'North Lake Points Race',
  6: 'Easy Hill Climb',
  7: 'Flat Eight Criterium',
  8: 'The Grand Gilbert Fondo',
  9: 'Base Camp Classic',
  10: 'Beach and Pine TT',
  11: 'South Lake Points Race',
  12: 'Unbound - Little Egypt',
  13: 'Local Tour Stage 1',
  14: 'Local Tour Stage 2',
  15: 'Local Tour Stage 3',
  // Special events (IDs > 100)
  101: 'Singapore Criterium',
  102: 'The Leveller'
};

// Event types for each event in Season 1
const EVENT_TYPES = {
  1: 'criterium',
  2: 'road race',
  3: 'track elimination',
  4: 'time trial',
  5: 'points race',
  6: 'hill climb',
  7: 'criterium',
  8: 'gran fondo',
  9: 'hill climb',
  10: 'time trial',
  11: 'points race',
  12: 'gravel race',
  13: 'stage race',
  14: 'stage race',
  15: 'stage race',
  // Special events (IDs > 100)
  101: 'criterium',  // Singapore Criterium
  102: 'points race'  // The Leveller
};

// Optional choice events (can be selected at stages 3, 6, or 8)
const OPTIONAL_EVENTS = [6, 7, 8, 9, 10, 11, 12];

// Time-based events (where distance varies based on rider speed, so distance validation is skipped)
const TIME_BASED_EVENTS = [4]; // Event 4: Coastal Loop Time Challenge (20 min)

// Expected distances in meters (for CSV validation)
const EXPECTED_DISTANCES = {
  1: 23400,   // Coast and Roast Crit
  2: 36500,   // Island Classic
  3: 10000,   // Forest Velodrome Elimination
  4: 10700,   // Coastal Loop Time Challenge
  5: 19600,   // North Lake Points Race
  6: 9600,    // Easy Hill Climb
  7: 25700,   // Flat Eight Criterium
  8: 52600,   // Grand Gilbert Fondo
  9: 25900,   // Base Camp Classic
  10: 25300,  // Beach and Pine TT
  11: 21800,  // South Lake Points Race
  12: 38000,  // Unbound Little Egypt
  13: 35200,  // Local Tour Stage 1
  14: 27300,  // Local Tour Stage 2
  15: 28100,  // Local Tour Stage 3
  // Special events
  102: 17500  // The Leveller
};

// Stage requirements for Career Mode progression
const STAGE_REQUIREMENTS = {
  1: { type: 'fixed', eventId: 1 },
  2: { type: 'fixed', eventId: 2 },
  3: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  4: { type: 'fixed', eventId: 3 },
  5: { type: 'fixed', eventId: 4 },
  6: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  7: { type: 'fixed', eventId: 5 },
  8: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
  9: { type: 'tour', eventIds: [13, 14, 15] }
};

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EVENT_NAMES,
    EVENT_TYPES,
    OPTIONAL_EVENTS,
    TIME_BASED_EVENTS,
    EXPECTED_DISTANCES,
    STAGE_REQUIREMENTS
  };
}

// Export for browser (window object)
if (typeof window !== 'undefined') {
  window.eventConfig = {
    EVENT_NAMES,
    EVENT_TYPES,
    OPTIONAL_EVENTS,
    TIME_BASED_EVENTS,
    EXPECTED_DISTANCES,
    STAGE_REQUIREMENTS
  };
}
