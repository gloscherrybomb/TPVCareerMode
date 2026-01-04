/**
 * Populate Processed Event Keys
 *
 * One-off script to scan existing CSV files in race_results/ and
 * populate processed-event-keys.json with all eventKeys that have
 * already been processed.
 *
 * Run locally: node .github/scripts/populate-processed-keys.js
 */

const fs = require('fs');
const path = require('path');

const RACE_RESULTS_DIR = path.join(__dirname, '..', '..', 'race_results');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'processed-event-keys.json');

function findCsvFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
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

function extractEventKey(filename) {
    // Pattern: TPVirtual-Results-Event{eventKey}-Pen{N}_{date}_{time}.csv
    const match = filename.match(/Event(\d+)-Pen/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

function main() {
    console.log('=== Populate Processed Event Keys ===\n');
    console.log(`Scanning: ${RACE_RESULTS_DIR}`);

    // Find all CSV files
    const csvFiles = findCsvFiles(RACE_RESULTS_DIR);
    console.log(`Found ${csvFiles.length} CSV file(s)\n`);

    // Extract eventKeys from filenames
    const eventKeys = new Set();
    const fileDetails = [];

    for (const filePath of csvFiles) {
        const filename = path.basename(filePath);
        const eventKey = extractEventKey(filename);

        if (eventKey) {
            eventKeys.add(eventKey);
            fileDetails.push({ filename, eventKey });
        } else {
            console.log(`  Warning: Could not extract eventKey from: ${filename}`);
        }
    }

    // Sort eventKeys for readability
    const sortedKeys = Array.from(eventKeys).sort((a, b) => a - b);

    // Create output object
    const output = {
        lastUpdated: new Date().toISOString(),
        description: "Tracks eventKeys that have already been processed from CSV files",
        processedEventKeys: sortedKeys
    };

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

    // Print summary
    console.log('=== Summary ===');
    console.log(`Total CSV files scanned: ${csvFiles.length}`);
    console.log(`Unique eventKeys extracted: ${sortedKeys.length}`);
    console.log(`\nEventKeys: ${sortedKeys.join(', ')}`);
    console.log(`\nOutput written to: ${OUTPUT_FILE}`);
    console.log('\n=== Complete ===');
}

main();
