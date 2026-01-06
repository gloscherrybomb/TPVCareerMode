/**
 * Query Schedule API
 *
 * Polls the TPVirtualHub Schedule API for each Career Mode event,
 * fetches results for new completed races, and saves them as JSON files.
 *
 * Run locally: node .github/scripts/query-schedule-api.js
 */

const fs = require('fs');
const path = require('path');

const PROCESSED_KEYS_FILE = path.join(__dirname, '..', '..', 'processed-event-keys.json');
const EVENT_DATA_FILE = path.join(__dirname, '..', '..', 'event-data.js');
const RACE_RESULTS_DIR = path.join(__dirname, '..', '..', 'race_results');
const HASH_MISMATCHES_FILE = path.join(__dirname, '..', '..', 'hash-mismatches.json');
const SCHEDULE_API_URL = 'https://tpvirtualhub.com/api/schedule/report?o=';
const RESULTS_API_URL = 'https://tpvirtualhub.com/api/schedule/results?scheduleKey=';

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
 */
function loadEventData() {
    const content = fs.readFileSync(EVENT_DATA_FILE, 'utf8');
    const events = [];
    const seenIds = new Set();

    const eventBlockPattern = /(\d+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;
    while ((match = eventBlockPattern.exec(content)) !== null) {
        const eventId = parseInt(match[1], 10);
        const eventContent = match[2];

        const urlMatch = eventContent.match(/scheduleUrl:\s*["']([^"']+)["']/);

        if (urlMatch && !seenIds.has(eventId)) {
            seenIds.add(eventId);
            events.push({
                id: eventId,
                scheduleUrl: urlMatch[1]
            });
        }
    }

    events.sort((a, b) => a.id - b.id);
    return events;
}

/**
 * Load processed event keys
 */
function loadProcessedKeys() {
    if (!fs.existsSync(PROCESSED_KEYS_FILE)) {
        console.log('Warning: processed-event-keys.json not found. Creating empty set.');
        return { set: new Set(), data: { processedEventKeys: [] } };
    }

    const content = fs.readFileSync(PROCESSED_KEYS_FILE, 'utf8');
    const data = JSON.parse(content);
    return { set: new Set(data.processedEventKeys || []), data };
}

/**
 * Save processed event keys
 */
function saveProcessedKeys(data) {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROCESSED_KEYS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Load hash mismatches log
 */
function loadHashMismatches() {
    if (!fs.existsSync(HASH_MISMATCHES_FILE)) {
        return { mismatches: [] };
    }
    const content = fs.readFileSync(HASH_MISMATCHES_FILE, 'utf8');
    return JSON.parse(content);
}

/**
 * Save hash mismatch to log file
 */
function logHashMismatch(mismatch) {
    const data = loadHashMismatches();
    data.mismatches.push(mismatch);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(HASH_MISMATCHES_FILE, JSON.stringify(data, null, 2), 'utf8');
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
    const url = SCHEDULE_API_URL + base64Param;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch results from API
 */
async function fetchResults(scheduleKey, accessCode) {
    let url = RESULTS_API_URL + scheduleKey;
    if (accessCode) {
        url += `&accessKey=${accessCode}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Extract completed races from schedule data
 * Returns races grouped by scheduleKey with pen -> eventKey mapping
 * Validates hash to ensure race settings haven't been modified
 */
function extractCompletedRaces(scheduleData, careerEventId) {
    const completedRaces = [];
    const hashMismatches = [];
    const clonedSchedules = scheduleData.clonedSchedules || [];
    const parentOptionsHash = scheduleData.optionsHash;

    for (const schedule of clonedSchedules) {
        if (schedule.state === 'completed' && schedule.events) {
            // Validate hash - scheduleOptionsHash should match parent optionsHash
            const scheduleHash = schedule.scheduleOptionsHash;
            if (scheduleHash !== parentOptionsHash) {
                // Hash mismatch detected - log and skip this schedule
                const mismatch = {
                    detectedAt: new Date().toISOString(),
                    careerEventId,
                    eventName: scheduleData.name,
                    parentScheduleKey: scheduleData.scheduleKey,
                    clonedScheduleKey: schedule.scheduleKey,
                    expectedHash: parentOptionsHash,
                    actualHash: scheduleHash,
                    scheduleName: schedule.name,
                    scheduleStartTime: schedule.startTime,
                    events: schedule.events.map(e => ({
                        eventKey: e.eventKey,
                        pen: e.pen,
                        completedAt: e.completedAt
                    }))
                };
                hashMismatches.push(mismatch);
                continue; // Skip this schedule - do not process results
            }

            // Build pen -> eventKey mapping for this schedule
            const penToEventKey = {};
            for (const event of schedule.events) {
                penToEventKey[event.pen] = event.eventKey;
            }

            for (const event of schedule.events) {
                completedRaces.push({
                    careerEventId,
                    eventKey: event.eventKey,
                    pen: event.pen,
                    scheduleKey: schedule.scheduleKey,
                    accessCode: schedule.accessCode,
                    completedAt: event.completedAt,
                    name: scheduleData.name,
                    penToEventKey
                });
            }
        }
    }

    return { completedRaces, hashMismatches };
}

/**
 * Generate filename for JSON results
 * Uses completedAt from schedule API if available, otherwise current time
 */
function generateFilename(eventKey, pen, completedAt) {
    const date = completedAt ? new Date(completedAt) : new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
    return `TPVirtual-Results-Event${eventKey}-Pen${pen}_${dateStr}_${timeStr}.json`;
}

/**
 * Save results to JSON file
 */
function saveResults(careerEventId, eventKey, pen, results, metadata) {
    // Create directory if needed
    const eventDir = path.join(RACE_RESULTS_DIR, 'season_1', `event_${careerEventId}`);
    if (!fs.existsSync(eventDir)) {
        fs.mkdirSync(eventDir, { recursive: true });
    }

    // Generate filename using completedAt for timestamp
    const filename = generateFilename(eventKey, pen, metadata.completedAt);
    const filePath = path.join(eventDir, filename);

    // Derive raceDate from completedAt or current time
    const raceDate = metadata.completedAt
        ? new Date(metadata.completedAt).toISOString()
        : new Date().toISOString();

    // Create output object with metadata and results
    const output = {
        metadata: {
            eventKey,
            pen,
            careerEventId,
            scheduleKey: metadata.scheduleKey,
            eventName: metadata.name,
            completedAt: metadata.completedAt,
            raceDate,  // Used by process-json-results.js for ordering
            fetchedAt: new Date().toISOString(),
            source: 'api'
        },
        results
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
    return filePath;
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
    const { set: processedKeys, data: processedKeysData } = loadProcessedKeys();
    console.log(`Found ${processedKeys.size} already processed eventKeys\n`);

    // Query each event
    const allNewRaces = [];
    const allHashMismatches = [];
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

            const parentScheduleKey = scheduleData.scheduleKey;
            const eventInfo = SCHEDULE_KEY_TO_EVENT[parentScheduleKey] || { id: event.id, name: 'Unknown' };

            const { completedRaces, hashMismatches } = extractCompletedRaces(scheduleData, eventInfo.id);

            // Track hash mismatches for logging
            if (hashMismatches.length > 0) {
                console.log(`  WARNING: ${hashMismatches.length} race(s) with HASH MISMATCH (skipped)`);
                allHashMismatches.push(...hashMismatches);
            }

            const newRaces = completedRaces.filter(race => !processedKeys.has(race.eventKey));

            if (newRaces.length > 0) {
                console.log(`  Found ${newRaces.length} NEW completed race(s)`);
                allNewRaces.push(...newRaces);
            } else {
                console.log(`  No new completed races`);
            }

            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.log(`  Error: ${error.message}`);
            errors.push({ eventId: event.id, error: error.message });
        }
    }

    // Process new races - fetch results and save as JSON
    const savedFiles = [];
    const newEventKeys = [];

    if (allNewRaces.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('=== FETCHING RESULTS ===');
        console.log('='.repeat(50) + '\n');

        // Group races by scheduleKey to minimize API calls
        const racesByScheduleKey = {};
        for (const race of allNewRaces) {
            if (!racesByScheduleKey[race.scheduleKey]) {
                racesByScheduleKey[race.scheduleKey] = {
                    accessCode: race.accessCode,
                    races: []
                };
            }
            racesByScheduleKey[race.scheduleKey].races.push(race);
        }

        for (const [scheduleKey, { accessCode, races }] of Object.entries(racesByScheduleKey)) {
            try {
                console.log(`Fetching results for scheduleKey ${scheduleKey}${accessCode ? ` (accessCode: ${accessCode})` : ''}...`);
                const allResults = await fetchResults(scheduleKey, accessCode);
                console.log(`  Retrieved ${allResults.length} total results`);

                // Process each pen/eventKey in this schedule
                for (const race of races) {
                    // Filter results for this specific pen
                    const penResults = allResults.filter(r => r.pen === race.pen);
                    console.log(`  Pen ${race.pen} (eventKey ${race.eventKey}): ${penResults.length} results`);

                    if (penResults.length > 0) {
                        const filePath = saveResults(
                            race.careerEventId,
                            race.eventKey,
                            race.pen,
                            penResults,
                            {
                                scheduleKey: race.scheduleKey,
                                name: race.name,
                                completedAt: race.completedAt
                            }
                        );
                        savedFiles.push(filePath);
                        newEventKeys.push(race.eventKey);
                        console.log(`  Saved: ${path.basename(filePath)}`);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.log(`  Error fetching results: ${error.message}`);
                errors.push({ scheduleKey, error: error.message });
            }
        }

        // Update processed keys
        if (newEventKeys.length > 0) {
            console.log('\nUpdating processed event keys...');
            for (const key of newEventKeys) {
                if (!processedKeysData.processedEventKeys.includes(key)) {
                    processedKeysData.processedEventKeys.push(key);
                }
            }
            processedKeysData.processedEventKeys.sort((a, b) => a - b);
            saveProcessedKeys(processedKeysData);
            console.log(`Added ${newEventKeys.length} new eventKey(s) to processed list`);
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('=== SUMMARY ===');
    console.log('='.repeat(50));

    if (allNewRaces.length === 0) {
        console.log('\nNo new completed races found.');
    } else {
        console.log(`\nNew completed races: ${allNewRaces.length}`);
        console.log(`Results files saved: ${savedFiles.length}`);

        if (savedFiles.length > 0) {
            console.log('\nSaved files:');
            for (const file of savedFiles) {
                console.log(`  ${path.relative(RACE_RESULTS_DIR, file)}`);
            }
        }
    }

    if (errors.length > 0) {
        console.log(`\nEncountered ${errors.length} error(s):`);
        for (const err of errors) {
            console.log(`  ${err.eventId || err.scheduleKey}: ${err.error}`);
        }
    }

    // Log hash mismatches to file
    if (allHashMismatches.length > 0) {
        console.log(`\nHASH MISMATCHES DETECTED: ${allHashMismatches.length}`);
        console.log('These races have been SKIPPED and logged to hash-mismatches.json');
        for (const mismatch of allHashMismatches) {
            console.log(`  - Event ${mismatch.careerEventId} (${mismatch.eventName}): scheduleKey ${mismatch.clonedScheduleKey}`);
            console.log(`    Expected hash: ${mismatch.expectedHash}, Actual: ${mismatch.actualHash}`);
            // Log each mismatch to the file
            logHashMismatch(mismatch);
        }
    }

    console.log('\n=== Complete ===');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
