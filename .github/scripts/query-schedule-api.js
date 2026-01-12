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

// Special events with fixed timeslots - query based on date windows
// These events have pre-scheduled race times and are queried directly by scheduleKey
const TIMED_SCHEDULE_CONFIG = {
    103: {
        eventName: "Valentine's Invitational",
        races: [
            { scheduleKey: 57080, timeslotId: 1, raceStart: '2026-02-13T12:30:00Z', raceEnd: '2026-02-13T14:30:00Z' },
            { scheduleKey: 57078, timeslotId: 2, raceStart: '2026-02-13T19:00:00Z', raceEnd: '2026-02-13T21:30:00Z' },
            { scheduleKey: 57079, timeslotId: 3, raceStart: '2026-02-14T09:00:00Z', raceEnd: '2026-02-14T11:30:00Z' },
            { scheduleKey: 57080, timeslotId: 4, raceStart: '2026-02-14T14:00:00Z', raceEnd: '2026-02-14T16:30:00Z' }
        ],
        eventEndDate: '2026-02-15T00:00:00Z'  // Stop querying after this date
    }
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
            accessCode: metadata.accessCode,
            eventName: metadata.name,
            completedAt: metadata.completedAt,
            raceDate,  // Used by process-json-results.js for ordering
            fetchedAt: new Date().toISOString(),
            source: 'api',
            // Include timeslotId for timed events (like Valentine's Invitational)
            ...(metadata.timeslotId && { timeslotId: metadata.timeslotId })
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

    // Query timed special events (like Valentine's Invitational)
    const now = new Date();
    for (const [careerEventId, eventConfig] of Object.entries(TIMED_SCHEDULE_CONFIG)) {
        const eventEndDate = new Date(eventConfig.eventEndDate);

        // Skip if event has ended
        if (now >= eventEndDate) {
            console.log(`\nTimed Event ${careerEventId} (${eventConfig.eventName}): Past end date, skipping`);
            continue;
        }

        console.log(`\nQuerying Timed Event ${careerEventId} (${eventConfig.eventName})...`);

        // Group races by scheduleKey to avoid duplicate API calls
        const racesByScheduleKey = {};
        for (const race of eventConfig.races) {
            const raceStart = new Date(race.raceStart);

            // Only query if race start time has passed
            if (now >= raceStart) {
                if (!racesByScheduleKey[race.scheduleKey]) {
                    racesByScheduleKey[race.scheduleKey] = [];
                }
                racesByScheduleKey[race.scheduleKey].push(race);
            }
        }

        if (Object.keys(racesByScheduleKey).length === 0) {
            console.log(`  No races active yet (before first race start time)`);
            continue;
        }

        // Query each unique scheduleKey once
        for (const [scheduleKey, races] of Object.entries(racesByScheduleKey)) {
            try {
                console.log(`  Querying scheduleKey ${scheduleKey} for timeslots: ${races.map(r => r.timeslotId).join(', ')}...`);

                // Fetch results directly using the scheduleKey
                const allResults = await fetchResults(parseInt(scheduleKey), null);

                if (!allResults || allResults.length === 0) {
                    console.log(`    No results yet`);
                    continue;
                }

                console.log(`    Retrieved ${allResults.length} total results`);

                // Group results by pen
                const resultsByPen = {};
                for (const result of allResults) {
                    if (!resultsByPen[result.pen]) {
                        resultsByPen[result.pen] = [];
                    }
                    resultsByPen[result.pen].push(result);
                }

                // For each pen, determine which timeslot it belongs to based on timestamp
                for (const [pen, penResults] of Object.entries(resultsByPen)) {
                    // Get the race completion time from the first result's timestamp or metadata
                    // We'll use a synthetic eventKey based on scheduleKey + pen + timeslot
                    const firstResult = penResults[0];

                    // For duplicate scheduleKeys (like 57080), match to correct timeslot by checking time windows
                    let matchedRace = null;
                    if (races.length === 1) {
                        // Only one race for this scheduleKey, use it
                        matchedRace = races[0];
                    } else {
                        // Multiple races share this scheduleKey, need to determine by time
                        // Since we don't have completedAt in results, we check if there's already a
                        // processed result for the earlier timeslot
                        const eventKeyBase = `${scheduleKey}_${pen}`;

                        // Sort races by start time
                        const sortedRaces = [...races].sort((a, b) =>
                            new Date(a.raceStart).getTime() - new Date(b.raceStart).getTime()
                        );

                        // Check which timeslots have already been processed
                        for (const race of sortedRaces) {
                            const eventKey = `${eventKeyBase}_ts${race.timeslotId}`;
                            if (!processedKeys.has(eventKey)) {
                                matchedRace = race;
                                break;
                            }
                        }
                    }

                    if (!matchedRace) {
                        console.log(`    Pen ${pen}: All timeslots already processed`);
                        continue;
                    }

                    // Create a unique eventKey for this pen + timeslot combination
                    const eventKey = `${scheduleKey}_${pen}_ts${matchedRace.timeslotId}`;

                    if (processedKeys.has(eventKey)) {
                        console.log(`    Pen ${pen} (timeslot ${matchedRace.timeslotId}): Already processed`);
                        continue;
                    }

                    console.log(`    Pen ${pen} (timeslot ${matchedRace.timeslotId}): ${penResults.length} results - NEW`);

                    // Add to allNewRaces for processing
                    allNewRaces.push({
                        careerEventId: parseInt(careerEventId),
                        eventKey: eventKey,
                        pen: parseInt(pen),
                        scheduleKey: parseInt(scheduleKey),
                        accessCode: null,
                        completedAt: new Date().toISOString(), // Use current time as approximation
                        name: eventConfig.eventName,
                        timeslotId: matchedRace.timeslotId,
                        penToEventKey: { [pen]: eventKey },
                        // Pre-fetched results to avoid re-fetching
                        prefetchedResults: penResults
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.log(`    Error: ${error.message}`);
                errors.push({ eventId: careerEventId, scheduleKey, error: error.message });
            }
        }
    }

    // Process new races - fetch results and save as JSON
    const savedFiles = [];
    const newEventKeys = [];

    if (allNewRaces.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('=== FETCHING RESULTS ===');
        console.log('='.repeat(50) + '\n');

        // Separate pre-fetched races (from timed events) from regular races
        const prefetchedRaces = allNewRaces.filter(r => r.prefetchedResults);
        const regularRaces = allNewRaces.filter(r => !r.prefetchedResults);

        // Process pre-fetched results (from timed events like Valentine's)
        for (const race of prefetchedRaces) {
            console.log(`Saving pre-fetched results for Event ${race.careerEventId} (${race.name})...`);
            console.log(`  Pen ${race.pen} (eventKey ${race.eventKey}, timeslot ${race.timeslotId}): ${race.prefetchedResults.length} results`);

            const filePath = saveResults(
                race.careerEventId,
                race.eventKey,
                race.pen,
                race.prefetchedResults,
                {
                    scheduleKey: race.scheduleKey,
                    accessCode: race.accessCode,
                    name: race.name,
                    completedAt: race.completedAt,
                    timeslotId: race.timeslotId
                }
            );
            savedFiles.push(filePath);
            newEventKeys.push(race.eventKey);
            console.log(`  Saved: ${path.basename(filePath)}`);
        }

        // Group regular races by scheduleKey to minimize API calls
        const racesByScheduleKey = {};
        for (const race of regularRaces) {
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
                                accessCode: race.accessCode,
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
            // Sort numerically for numbers, alphabetically for strings
            processedKeysData.processedEventKeys.sort((a, b) => {
                const aNum = typeof a === 'number' ? a : parseInt(a);
                const bNum = typeof b === 'number' ? b : parseInt(b);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return String(a).localeCompare(String(b));
            });
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
