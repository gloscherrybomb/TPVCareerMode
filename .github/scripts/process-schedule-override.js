/**
 * Process Schedule Override
 *
 * One-off script to process a specific cloned schedule that was skipped
 * due to hash mismatch. This bypasses hash validation for approved cases.
 *
 * Usage: node .github/scripts/process-schedule-override.js <scheduleKey> <careerEventId>
 * Example: node .github/scripts/process-schedule-override.js 57625 1
 */

const fs = require('fs');
const path = require('path');

const PROCESSED_KEYS_FILE = path.join(__dirname, '..', '..', 'processed-event-keys.json');
const RACE_RESULTS_DIR = path.join(__dirname, '..', '..', 'race_results');
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

// Reverse mapping: Career Mode Event ID -> Parent Schedule Key
const EVENT_TO_PARENT_KEY = {};
for (const [parentKey, eventInfo] of Object.entries(SCHEDULE_KEY_TO_EVENT)) {
    EVENT_TO_PARENT_KEY[eventInfo.id] = parseInt(parentKey);
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
 * Fetch schedule data from API using base64 param
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
 * Generate filename for JSON results
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
            raceDate,
            fetchedAt: new Date().toISOString(),
            source: 'api',
            // Mark as manually processed override
            manualOverride: true,
            overrideReason: 'Hash mismatch - approved for processing'
        },
        results
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
    return filePath;
}

/**
 * Find cloned schedule in parent schedule data
 */
function findClonedSchedule(scheduleData, targetScheduleKey) {
    const clonedSchedules = scheduleData.clonedSchedules || [];

    for (const schedule of clonedSchedules) {
        if (schedule.scheduleKey === targetScheduleKey) {
            return schedule;
        }
    }

    return null;
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: node process-schedule-override.js <scheduleKey> <careerEventId>');
        console.log('Example: node process-schedule-override.js 57625 1');
        process.exit(1);
    }

    const targetScheduleKey = parseInt(args[0]);
    const careerEventId = parseInt(args[1]);

    if (isNaN(targetScheduleKey) || isNaN(careerEventId)) {
        console.error('Error: scheduleKey and careerEventId must be numbers');
        process.exit(1);
    }

    // Get parent schedule key for this event
    const parentScheduleKey = EVENT_TO_PARENT_KEY[careerEventId];
    if (!parentScheduleKey) {
        console.error(`Error: No parent schedule key found for career event ${careerEventId}`);
        console.log('Valid event IDs:', Object.keys(EVENT_TO_PARENT_KEY).join(', '));
        process.exit(1);
    }

    const eventInfo = SCHEDULE_KEY_TO_EVENT[parentScheduleKey];

    console.log('=== Process Schedule Override ===\n');
    console.log(`Target Schedule Key: ${targetScheduleKey}`);
    console.log(`Career Event: ${careerEventId} (${eventInfo.name})`);
    console.log(`Parent Schedule Key: ${parentScheduleKey}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Load processed keys
    const { set: processedKeys, data: processedKeysData } = loadProcessedKeys();

    // First, we need to find the cloned schedule to get its access code and details
    // We'll construct the base64 param for the parent schedule
    console.log('Fetching parent schedule to find cloned schedule details...');

    // Construct base64 param - this is a simplified version, we need the actual param
    // from event-data.js. For now, let's try to fetch directly with the schedule key

    // Try fetching results directly first (some schedules may not need access code)
    console.log(`\nAttempting to fetch results for schedule ${targetScheduleKey}...`);

    try {
        const allResults = await fetchResults(targetScheduleKey, null);

        if (!allResults || allResults.length === 0) {
            console.log('No results found for this schedule key.');
            console.log('\nThis could mean:');
            console.log('  - The schedule has not been completed yet');
            console.log('  - An access code is required (not implemented in this basic version)');
            process.exit(1);
        }

        console.log(`Retrieved ${allResults.length} total results`);

        // Group results by pen
        const resultsByPen = {};
        for (const result of allResults) {
            if (!resultsByPen[result.pen]) {
                resultsByPen[result.pen] = [];
            }
            resultsByPen[result.pen].push(result);
        }

        const pens = Object.keys(resultsByPen);
        console.log(`Found results for ${pens.length} pen(s): ${pens.join(', ')}`);

        // Process each pen
        const savedFiles = [];
        const newEventKeys = [];

        for (const [pen, penResults] of Object.entries(resultsByPen)) {
            // Use the eventKey from the first result if available, otherwise construct one
            const eventKey = penResults[0].eventKey || `${targetScheduleKey}_${pen}`;

            if (processedKeys.has(eventKey)) {
                console.log(`\nPen ${pen} (eventKey ${eventKey}): Already processed - SKIPPING`);
                continue;
            }

            console.log(`\nPen ${pen} (eventKey ${eventKey}): ${penResults.length} results - PROCESSING`);

            // Save results
            const filePath = saveResults(
                careerEventId,
                eventKey,
                parseInt(pen),
                penResults,
                {
                    scheduleKey: targetScheduleKey,
                    accessCode: null,
                    name: eventInfo.name,
                    completedAt: penResults[0].completedAt || new Date().toISOString()
                }
            );

            savedFiles.push(filePath);
            newEventKeys.push(eventKey);
            console.log(`  Saved: ${path.basename(filePath)}`);
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

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('=== SUMMARY ===');
        console.log('='.repeat(50));
        console.log(`\nSchedule Key: ${targetScheduleKey}`);
        console.log(`Event: ${careerEventId} (${eventInfo.name})`);
        console.log(`Files saved: ${savedFiles.length}`);

        if (savedFiles.length > 0) {
            console.log('\nSaved files:');
            for (const file of savedFiles) {
                console.log(`  ${path.relative(process.cwd(), file)}`);
            }
            console.log('\nNOTE: Run the process-json-results workflow to process these results.');
        } else {
            console.log('\nNo new files were saved (all pens already processed).');
        }

        console.log('\n=== Complete ===');

    } catch (error) {
        console.error(`\nError fetching results: ${error.message}`);
        console.log('\nIf an access code is required, you may need to:');
        console.log('  1. Find the access code from the parent schedule');
        console.log('  2. Modify this script to include it');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
