// api-client.js - TPVirtual API Client (Placeholder)
// This module will handle fetching results from the TPVirtual API when it goes live

const https = require('https');

/**
 * API Configuration
 * Environment variables should be set in GitHub secrets when API goes live
 */
const API_CONFIG = {
  baseUrl: process.env.TPVIRTUAL_API_URL || 'https://api.tpvirtual.com',
  apiKey: process.env.TPVIRTUAL_API_KEY || '',
  timeout: 30000,  // 30 second timeout
  retryAttempts: 3,
  retryDelay: 2000  // 2 seconds between retries
};

/**
 * Fetch results for a specific event from TPVirtual API
 * @param {number} eventId - TPVirtual event ID
 * @param {number} penId - Pen identifier (1-5)
 * @returns {Promise<Array>} JSON results array
 */
async function fetchEventResults(eventId, penId) {
  // TODO: Implement when API endpoint is available
  // Placeholder implementation
  throw new Error('API not yet available. Use JSON file upload instead.');

  /*
  const url = `${API_CONFIG.baseUrl}/events/${eventId}/results?pen=${penId}`;

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Accept': 'application/json'
      },
      timeout: API_CONFIG.timeout
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
  */
}

/**
 * Check for new results since last fetch
 * @param {Date} sinceTimestamp - Fetch results after this time
 * @returns {Promise<Array>} Array of new events with results
 */
async function checkForNewResults(sinceTimestamp) {
  // TODO: Implement when API endpoint is available
  throw new Error('API not yet available.');

  /*
  const url = `${API_CONFIG.baseUrl}/events/recent?since=${sinceTimestamp.toISOString()}`;
  // ... implementation
  */
}

/**
 * Validate API response structure
 * @param {Array} response - API response
 * @returns {boolean} True if valid
 */
function validateApiResponse(response) {
  if (!Array.isArray(response)) {
    return false;
  }

  if (response.length === 0) {
    return true;  // Empty results are valid
  }

  // Check first result has required fields
  const required = ['position', 'playerId', 'firstName', 'lastName', 'time', 'distance'];
  const firstResult = response[0];

  return required.every(field => field in firstResult);
}

/**
 * Map TPVirtual event ID to Career Mode event number
 * This mapping will need to be configured based on actual event IDs
 * @param {number} tpvEventId - TPVirtual event ID
 * @returns {number|null} Career Mode event number, or null if not mapped
 */
function mapEventIdToCareerEvent(tpvEventId) {
  // TODO: Populate with actual mappings when known
  const EVENT_MAPPING = {
    // TPVirtual Event ID -> Career Mode Event Number
    // Example: 91955: 1,  // Coast and Roast Crit
    // Example: 92225: 2,  // Island Classic
  };

  return EVENT_MAPPING[tpvEventId] || null;
}

/**
 * Get the pen ID from a TPVirtual event
 * @param {number} tpvEventId - TPVirtual event ID
 * @returns {number} Pen ID (1-5)
 */
function getPenFromEventId(tpvEventId) {
  // TODO: Implement logic to determine pen from event ID
  // This may be embedded in the event ID or need to be fetched from metadata
  return 1;  // Default to pen 1
}

// Export for Node.js
module.exports = {
  API_CONFIG,
  fetchEventResults,
  checkForNewResults,
  validateApiResponse,
  mapEventIdToCareerEvent,
  getPenFromEventId
};
