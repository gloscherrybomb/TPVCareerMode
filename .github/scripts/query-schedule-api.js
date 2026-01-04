/**
 * Query Schedule API
 *
 * Polls the TPVirtualHub Schedule API for each Career Mode event
 * and reports any new completed races that haven't been processed yet.
 *
 * Run locally: node .github/scripts/query-schedule-api.js
 */

const fs = require('fs');
const path = require('path');

const PROCESSED_KEYS_FILE = path.join(__dirname, '..', '..', 'processed-event-keys.json');
const EVENT_DATA_FILE = path.join(__dirname, '..', '..', 'event-data.js');
const API_BASE_URL = 'https://tpvirtualhub.com/api/schedule/report?o=';

// Event mapping: parentScheduleKey -> Career Mode Event ID and Name
const SCHEDULE_KEY_TO_EVENT = {
    52431: { id: 1, name: 'Coast and Roast Crit' },
    51139: { id: 2, name: 'Island Classic' },
    52477: { id: 3, name: 'Forest Velodrome Elimination' },
    52494: { id: 4, name: 'Coastal Loop Time Challenge' },
    53303: { id: 5, name: 'North Lake Points Race' },
    52462: { id: 6, name: 'Easy Hill Climb' },
    52463: { id: 7, name: 'Flat Eight Criterium' },
    52464: { id: 8, name: 'Grand Gilbert Fondo' },
    51601: { id: 9, name: 'Base Camp Classic' },
    52465: { id: 10, name: 'Beach and Pine TT' },
    52466: { id: 11, name: 'South Lake Points Race' },
    52458: { id: 12, name: 'Unbound Little Egypt' },
    52497: { id: 13, name: 'Local Tour Stage 1' },
    52498: { id: 14, name: 'Local Tour Stage 2' },
    52499: { id: 15, name: 'Local Tour Stage 3' },
    53321: { id: 102, name: 'The Leveller' }
};

/**
 * Load event data by parsing the JS file
 * Uses a more robust approach: find each event block and extract its scheduleUrl
 */
function loadEventData() {
    const content = fs.readFileSync(EVENT_DATA_FILE, 'utf8');
    const events = [];
    const seenIds = new Set();

    // Find all event blocks: ID: { ... }
    // Match each event object individually to avoid cross-boundary matching
    const eventBlockPattern = /(\d+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;
    while ((match = eventBlockPattern.exec(content)) !== null) {
        const eventId = parseInt(match[1], 10);
        const eventContent = match[2];

        // Look for scheduleUrl within this specific event block
        const urlMatch = eventContent.match(/scheduleUrl:\s*["']([^"']+)["']/);

        if (urlMatch && !seenIds.has(eventId)) {
            seenIds.add(eventId);
            events.push({
                id: eventId,
                scheduleUrl: urlMatch[1]
            });
        }
    }

    // Sort by event ID for consistent ordering
    events.sort((a, b) => a.id - b.id);

    return events;
}

/**
 * Load processed event keys
 */
function loadProcessedKeys() {
    if (!fs.existsSync(PROCESSED_KEYS_FILE)) {
        console.log('Warning: processed-event-keys.json not found. Creating empty set.');
        return new Set();
    }

    const content = fs.readFileSync(PROCESSED_KEYS_FILE, 'utf8');
    const data = JSON.parse(content);
    return new Set(data.processedEventKeys || []);
}

/**
 * Extract base64 parameter from scheduleUrl
 */
function extractBase64Param(scheduleUrl) {
    const match = scheduleUrl.match(/\?o=(.+)$/);
    return match ? match[1] : null;
}

/**
 * Fetch schedule data from API
 */
async function fetchScheduleData(base64Param) {
    const url = API_BASE_URL + base64Param;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Extract completed races from schedule data
 */
function extractCompletedRaces(scheduleData, careerEventId) {
    const completedRaces = [];

    // Check clonedSchedules for completed races
    const clonedSchedules = scheduleData.clonedSchedules || [];

    for (const schedule of clonedSchedules) {
        if (schedule.state === 'completed' && schedule.events) {
            for (const event of schedule.events) {
                completedRaces.push({
                    careerEventId,
                    eventKey: event.eventKey,
                    pen: event.pen,
                    scheduleKey: schedule.scheduleKey,
                    completedAt: event.completedAt,
                    name: scheduleData.name
                });
            }
        }
    }

    return completedRaces;
}

/**
 * Main function
 */
async function main() {
    console.log('=== Query Schedule API ===\n');
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Load data
    console.log('Loading event data...');
    const events = loadEventData();
    console.log(`Found ${events.length} events with scheduleUrls\n`);

    console.log('Loading processed event keys...');
    const processedKeys = loadProcessedKeys();
    console.log(`Found ${processedKeys.size} already processed eventKeys\n`);

    // Query each event
    const allNewRaces = [];
    const errors = [];

    for (const event of events) {
        const base64Param = extractBase64Param(event.scheduleUrl);
        if (!base64Param) {
            console.log(`Event ${event.id}: Could not extract base64 param`);
            continue;
        }

        try {
            console.log(`Querying Event ${event.id}...`);
            const scheduleData = await fetchScheduleData(base64Param);

            // Get parent scheduleKey for mapping
            const parentScheduleKey = scheduleData.scheduleKey;
            const eventInfo = SCHEDULE_KEY_TO_EVENT[parentScheduleKey] || { id: event.id, name: 'Unknown' };

            // Extract completed races
            const completedRaces = extractCompletedRaces(scheduleData, eventInfo.id);

            // Filter to new races only
            const newRaces = completedRaces.filter(race => !processedKeys.has(race.eventKey));

            if (newRaces.length > 0) {
                console.log(`  Found ${newRaces.length} NEW completed race(s)`);
                allNewRaces.push(...newRaces);
            } else {
                console.log(`  No new completed races`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.log(`  Error: ${error.message}`);
            errors.push({ eventId: event.id, error: error.message });
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('=== SUMMARY ===');
    console.log('='.repeat(50));

    if (allNewRaces.length === 0) {
        console.log('\nNo new completed races found.');
    } else {
        console.log(`\nFound ${allNewRaces.length} NEW completed race(s):\n`);

        // Group by career event
        const byEvent = {};
        for (const race of allNewRaces) {
            if (!byEvent[race.careerEventId]) {
                byEvent[race.careerEventId] = [];
            }
            byEvent[race.careerEventId].push(race);
        }

        for (const [eventId, races] of Object.entries(byEvent)) {
            const eventInfo = Object.values(SCHEDULE_KEY_TO_EVENT).find(e => e.id === parseInt(eventId));
            const eventName = eventInfo ? eventInfo.name : 'Unknown';
            console.log(`Event ${eventId} (${eventName}):`);
            for (const race of races) {
                console.log(`  - eventKey: ${race.eventKey}, pen: ${race.pen}, scheduleKey: ${race.scheduleKey}`);
                if (race.completedAt) {
                    console.log(`    completedAt: ${race.completedAt}`);
                }
            }
            console.log('');
        }
    }

    if (errors.length > 0) {
        console.log(`\nEncountered ${errors.length} error(s):`);
        for (const err of errors) {
            console.log(`  Event ${err.eventId}: ${err.error}`);
        }
    }

    console.log('\n=== Complete ===');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
