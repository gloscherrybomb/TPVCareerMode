/**
 * Replace CSV Results with JSON from API
 *
 * One-off script to fetch JSON results from the API for all existing CSV files.
 * Preserves the original timestamp from CSV filenames for correct ordering.
 *
 * Run locally: node .github/scripts/replace-csv-with-json.js
 */

const fs = require('fs');
const path = require('path');

const RACE_RESULTS_DIR = path.join(__dirname, '..', '..', 'race_results');
const EVENT_DATA_FILE = path.join(__dirname, '..', '..', 'event-data.js');
const SCHEDULE_API_URL = 'https://tpvirtualhub.com/api/schedule/report?o=';
const RESULTS_API_URL = 'https://tpvirtualhub.com/api/schedule/results?scheduleKey=';

// Career Mode Event ID to parent scheduleKey mapping
const CAREER_EVENT_TO_SCHEDULE = {
    1: { scheduleKey: 52431, name: 'Coast and Roast Crit' },
    2: { scheduleKey: 51139, name: 'Island Classic' },
    3: { scheduleKey: 52477, name: 'Forest Velodrome Elimination' },
    4: { scheduleKey: 52494, name: 'Coastal Loop Time Challenge' },
    5: { scheduleKey: 53303, name: 'North Lake Points Race' },
    6: { scheduleKey: 52462, name: 'Easy Hill Climb' },
    7: { scheduleKey: 52463, name: 'Flat Eight Criterium' },
    8: { scheduleKey: 52464, name: 'Grand Gilbert Fondo' },
    9: { scheduleKey: 51601, name: 'Base Camp Classic' },
    10: { scheduleKey: 52465, name: 'Beach and Pine TT' },
    11: { scheduleKey: 52466, name: 'South Lake Points Race' },
    12: { scheduleKey: 52458, name: 'Unbound Little Egypt' },
    13: { scheduleKey: 52497, name: 'Local Tour Stage 1' },
    14: { scheduleKey: 52498, name: 'Local Tour Stage 2' },
    15: { scheduleKey: 52499, name: 'Local Tour Stage 3' },
    102: { scheduleKey: 53321, name: 'The Leveller' }
};

// Cache for schedule data to avoid repeated API calls
const scheduleCache = {};

/**
 * Load event scheduleUrls from event-data.js
 */
function loadEventScheduleUrls() {
    const content = fs.readFileSync(EVENT_DATA_FILE, 'utf8');
    const urls = {};

    const eventBlockPattern = /(\d+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;

    while ((match = eventBlockPattern.exec(content)) !== null) {
        const eventId = parseInt(match[1], 10);
        const eventContent = match[2];
        const urlMatch = eventContent.match(/scheduleUrl:\s*["']([^"']+)["']/);

        if (urlMatch) {
            const base64Match = urlMatch[1].match(/\?o=(.+)$/);
            if (base64Match) {
                urls[eventId] = base64Match[1];
            }
        }
    }

    return urls;
}

/**
 * Fetch schedule data (with caching)
 */
async function fetchScheduleData(base64Param) {
    if (scheduleCache[base64Param]) {
        return scheduleCache[base64Param];
    }

    const url = SCHEDULE_API_URL + base64Param;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    scheduleCache[base64Param] = data;
    return data;
}

/**
 * Find scheduleKey and accessCode for a given eventKey
 */
async function findScheduleInfoForEventKey(eventKey, careerEventId, eventScheduleUrls) {
    const base64Param = eventScheduleUrls[careerEventId];
    if (!base64Param) {
        throw new Error(`No schedule URL for career event ${careerEventId}`);
    }

    const scheduleData = await fetchScheduleData(base64Param);
    const clonedSchedules = scheduleData.clonedSchedules || [];

    for (const schedule of clonedSchedules) {
        if (schedule.events) {
            for (const event of schedule.events) {
                if (event.eventKey === eventKey) {
                    return {
                        scheduleKey: schedule.scheduleKey,
                        accessCode: schedule.accessCode,
                        pen: event.pen,
                        completedAt: event.completedAt,
                        eventName: scheduleData.name
                    };
                }
            }
        }
    }

    throw new Error(`eventKey ${eventKey} not found in schedule for career event ${careerEventId}`);
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
 * Find all CSV files recursively
 */
function findCsvFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findCsvFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.csv')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Parse CSV filename to extract eventKey, pen, and timestamp
 */
function parseCsvFilename(filename) {
    // Pattern: TPVirtual-Results-Event{eventKey}-Pen{pen}_{YYYYMMDD}_{HHMMSS}.csv
    const match = filename.match(/Event(\d+)-Pen(\d+)_(\d{8})_(\d{6})\.csv$/);
    if (!match) {
        return null;
    }

    return {
        eventKey: parseInt(match[1], 10),
        pen: parseInt(match[2], 10),
        dateStr: match[3],
        timeStr: match[4],
        timestamp: `${match[3]}_${match[4]}`
    };
}

/**
 * Extract career event ID from file path
 */
function extractCareerEventId(filePath) {
    const match = filePath.match(/event_(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Convert timestamp string to ISO date
 */
function timestampToIsoDate(dateStr, timeStr) {
    // dateStr: YYYYMMDD, timeStr: HHMMSS
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hours = timeStr.slice(0, 2);
    const minutes = timeStr.slice(2, 4);
    const seconds = timeStr.slice(4, 6);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
}

/**
 * Main function
 */
async function main() {
    console.log('=== Replace CSV with JSON ===\n');
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Load schedule URLs
    console.log('Loading event schedule URLs...');
    const eventScheduleUrls = loadEventScheduleUrls();
    console.log(`Found ${Object.keys(eventScheduleUrls).length} event URLs\n`);

    // Find all CSV files
    console.log('Scanning for CSV files...');
    const csvFiles = findCsvFiles(RACE_RESULTS_DIR);
    console.log(`Found ${csvFiles.length} CSV file(s)\n`);

    // Process each CSV
    const results = {
        success: [],
        skipped: [],
        errors: []
    };

    for (const csvPath of csvFiles) {
        const filename = path.basename(csvPath);
        const parsed = parseCsvFilename(filename);

        if (!parsed) {
            console.log(`⚠️  Cannot parse filename: ${filename}`);
            results.skipped.push({ file: filename, reason: 'Invalid filename format' });
            continue;
        }

        const careerEventId = extractCareerEventId(csvPath);
        if (!careerEventId) {
            console.log(`⚠️  Cannot extract career event ID from path: ${csvPath}`);
            results.skipped.push({ file: filename, reason: 'Cannot determine career event' });
            continue;
        }

        console.log(`\n📄 Processing: ${filename}`);
        console.log(`   Career Event: ${careerEventId}, eventKey: ${parsed.eventKey}, Pen: ${parsed.pen}`);

        try {
            // Find scheduleKey and accessCode
            console.log(`   Finding schedule info...`);
            const scheduleInfo = await findScheduleInfoForEventKey(
                parsed.eventKey,
                careerEventId,
                eventScheduleUrls
            );
            console.log(`   scheduleKey: ${scheduleInfo.scheduleKey}, accessCode: ${scheduleInfo.accessCode || 'none'}`);

            // Fetch results
            console.log(`   Fetching results...`);
            const allResults = await fetchResults(scheduleInfo.scheduleKey, scheduleInfo.accessCode);
            console.log(`   Retrieved ${allResults.length} total results`);

            // Filter by pen
            const penResults = allResults.filter(r => r.pen === parsed.pen);
            console.log(`   Pen ${parsed.pen}: ${penResults.length} results`);

            if (penResults.length === 0) {
                console.log(`   ⚠️  No results for pen ${parsed.pen}, skipping`);
                results.skipped.push({ file: filename, reason: `No results for pen ${parsed.pen}` });
                continue;
            }

            // Create JSON with metadata
            const raceDate = timestampToIsoDate(parsed.dateStr, parsed.timeStr);
            const output = {
                metadata: {
                    eventKey: parsed.eventKey,
                    pen: parsed.pen,
                    careerEventId,
                    scheduleKey: scheduleInfo.scheduleKey,
                    eventName: scheduleInfo.eventName,
                    completedAt: scheduleInfo.completedAt,
                    raceDate,  // From original CSV filename
                    fetchedAt: new Date().toISOString(),
                    source: 'api',
                    replacedCsv: filename
                },
                results: penResults
            };

            // Save JSON with same timestamp as CSV
            const jsonFilename = filename.replace('.csv', '.json');
            const jsonPath = csvPath.replace('.csv', '.json');

            fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');
            console.log(`   ✅ Saved: ${jsonFilename}`);

            results.success.push({
                csv: filename,
                json: jsonFilename,
                resultCount: penResults.length
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            results.errors.push({ file: filename, error: error.message });
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('=== SUMMARY ===');
    console.log('='.repeat(50));
    console.log(`\nSuccessful: ${results.success.length}`);
    console.log(`Skipped: ${results.skipped.length}`);
    console.log(`Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
        console.log('\nErrors:');
        for (const err of results.errors) {
            console.log(`  ${err.file}: ${err.error}`);
        }
    }

    console.log('\n=== Complete ===');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
