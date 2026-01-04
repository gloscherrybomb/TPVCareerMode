// json-parser.js - Parse JSON results from TPVirtual API
// Transforms API JSON format to internal CSV-compatible format

/**
 * Map gender codes to readable values
 * @param {string} genderCode - "0", "1", or "2"
 * @returns {string} "Male", "Female", or "Bot"
 */
function mapGender(genderCode) {
  switch (genderCode) {
    case '0': return 'Male';
    case '1': return 'Female';
    case '2': return 'Bot';
    default: return 'Unknown';
  }
}

/**
 * Get ARR band category based on rating
 * @param {number} arr - Player's ARR rating
 * @returns {string} ARR band category
 */
function getARRBand(arr) {
  if (!arr || arr < 300) return 'Unranked';

  // Diamond: 1600-2000 (4 tiers)
  if (arr >= 1900) return 'Diamond 4';
  if (arr >= 1800) return 'Diamond 3';
  if (arr >= 1700) return 'Diamond 2';
  if (arr >= 1600) return 'Diamond 1';

  // Platinum: 1300-1599 (3 tiers)
  if (arr >= 1500) return 'Platinum 3';
  if (arr >= 1400) return 'Platinum 2';
  if (arr >= 1300) return 'Platinum 1';

  // Gold: 1000-1299 (3 tiers)
  if (arr >= 1200) return 'Gold 3';
  if (arr >= 1100) return 'Gold 2';
  if (arr >= 1000) return 'Gold 1';

  // Silver: 700-999 (3 tiers)
  if (arr >= 900) return 'Silver 3';
  if (arr >= 800) return 'Silver 2';
  if (arr >= 700) return 'Silver 1';

  // Bronze: 300-699 (3 tiers)
  if (arr >= 500) return 'Bronze 3';
  if (arr >= 400) return 'Bronze 2';
  if (arr >= 300) return 'Bronze 1';

  return 'Unranked';
}

/**
 * Transform a single JSON result object to internal format
 * @param {Object} result - Single JSON result object from API
 * @returns {Object} Result in internal format matching CSV structure
 */
function transformResult(result) {
  // Construct full name from first and last name
  const name = `${result.firstName || ''} ${result.lastName || ''}`.trim();

  // Handle DNF - if isDNF is true or position is 32767 (TPV DNF marker), position should be "DNF"
  const position = (result.isDNF || result.position >= 32767) ? 'DNF' : result.position;

  // Convert time from milliseconds to seconds
  const timeSeconds = result.time ? result.time / 1000 : 0;

  // Convert distance from millimeters to meters
  const distanceMeters = result.distance ? result.distance / 1000 : 0;

  // Convert deltaTime from milliseconds to seconds
  const deltaTimeSeconds = result.deltaTime ? result.deltaTime / 1000 : 0;

  // Map country to uppercase
  const country = result.country ? result.country.toUpperCase() : '';

  return {
    // Core fields matching CSV structure
    Position: position,
    UID: result.playerId || '',
    Name: name,
    Team: result.teamName || '',
    Distance: distanceMeters,
    Time: timeSeconds,
    ARR: result.arr || 0,
    ARRBand: getARRBand(result.arr || 0),
    EventRating: result.rating || 0,
    Gender: mapGender(result.gender),
    Country: country,
    AgeBand: result.ageBand || '',
    DeltaTime: deltaTimeSeconds,
    Points: result.points || 0,  // For points races

    // New power data fields
    AvgPower: result.avgPower || null,
    MaxPower: result.maxPower || null,
    NrmPower: result.nrmPower || null,
    AvgHR: result.avgHr || null,
    MaxHR: result.maxHr || null,

    // Additional fields for internal use
    IsBot: result.isBot || false,
    IsDNF: result.isDNF || false,
    Pen: result.pen || 1,  // Pen/category number for multi-pen events

    // Original delta values (may be useful)
    Delta: result.delta || 0,
    DeltaDistance: result.deltaDistance ? result.deltaDistance / 1000 : 0  // mm to meters
  };
}

/**
 * Parse JSON results from TPVirtual API
 * @param {Array} jsonResults - Raw JSON array from API
 * @returns {Array} Results in internal CSV-compatible format
 */
function parseJSON(jsonResults) {
  if (!Array.isArray(jsonResults)) {
    console.error('parseJSON: Expected array, got', typeof jsonResults);
    return [];
  }

  // Transform all results
  const transformedResults = jsonResults.map(transformResult);

  console.log(`parseJSON: Transformed ${transformedResults.length} results`);
  console.log(`  - Humans: ${transformedResults.filter(r => !r.IsBot).length}`);
  console.log(`  - Bots: ${transformedResults.filter(r => r.IsBot).length}`);
  console.log(`  - DNFs: ${transformedResults.filter(r => r.IsDNF).length}`);

  // Check if power data is present
  const hasPowerData = transformedResults.some(r => r.AvgPower !== null);
  if (hasPowerData) {
    console.log(`  - Power data: Available`);
  }

  return transformedResults;
}

/**
 * Extract power data from a result for storage
 * @param {Object} result - Transformed result object
 * @returns {Object} Power data object, or null if no power data
 */
function extractPowerData(result) {
  if (!result.AvgPower && !result.MaxPower && !result.NrmPower) {
    return null;
  }

  return {
    avgPower: result.AvgPower,
    maxPower: result.MaxPower,
    nrmPower: result.NrmPower,
    avgHr: result.AvgHR,
    maxHr: result.MaxHR
  };
}

/**
 * Check if results array has power data
 * @param {Array} results - Array of transformed results
 * @returns {boolean} True if any result has power data
 */
function hasPowerData(results) {
  return results.some(r => r.AvgPower !== null || r.MaxPower !== null);
}

/**
 * Get human results only (filter out bots)
 * @param {Array} results - Array of transformed results
 * @returns {Array} Only human results
 */
function getHumanResults(results) {
  return results.filter(r => !r.IsBot);
}

/**
 * Get bot results only
 * @param {Array} results - Array of transformed results
 * @returns {Array} Only bot results
 */
function getBotResults(results) {
  return results.filter(r => r.IsBot);
}

// Export for Node.js
module.exports = {
  parseJSON,
  transformResult,
  mapGender,
  extractPowerData,
  hasPowerData,
  getHumanResults,
  getBotResults
};
