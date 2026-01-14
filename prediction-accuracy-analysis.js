/**
 * Prediction Accuracy Analysis Report
 *
 * This script analyzes the accuracy of event rating predictions vs actual finish positions.
 * It processes all race results from the race_results directory and generates statistics
 * broken down by ARR band.
 */

const fs = require('fs');
const path = require('path');

// ARR Band definitions (matching json-parser.js)
function getARRBand(arr) {
    if (arr >= 1900) return 'Diamond 1';
    if (arr >= 1850) return 'Diamond 2';
    if (arr >= 1800) return 'Diamond 3';
    if (arr >= 1750) return 'Diamond 4';
    if (arr >= 1500) return 'Platinum 1';
    if (arr >= 1400) return 'Platinum 2';
    if (arr >= 1300) return 'Platinum 3';
    if (arr >= 1200) return 'Gold 1';
    if (arr >= 1100) return 'Gold 2';
    if (arr >= 1000) return 'Gold 3';
    if (arr >= 900) return 'Silver 1';
    if (arr >= 800) return 'Silver 2';
    if (arr >= 700) return 'Silver 3';
    if (arr >= 600) return 'Bronze 1';
    if (arr >= 500) return 'Bronze 2';
    if (arr >= 300) return 'Bronze 3';
    return 'Unranked';
}

// Simplified band grouping for analysis
function getARRBandGroup(arr) {
    if (arr >= 1750) return 'Diamond';
    if (arr >= 1300) return 'Platinum';
    if (arr >= 1000) return 'Gold';
    if (arr >= 700) return 'Silver';
    if (arr >= 300) return 'Bronze';
    return 'Unranked';
}

// Calculate predicted position from event ratings
function calculatePredictedPositions(results) {
    // Filter to finishers with valid ratings
    const finishers = results.filter(r => !r.isDNF && r.position !== 32767 && r.rating != null);

    // Sort by rating descending (higher rating = better predicted finish)
    const sorted = [...finishers].sort((a, b) => b.rating - a.rating);

    // Assign predicted positions
    const predictedPositions = new Map();
    sorted.forEach((rider, index) => {
        predictedPositions.set(rider.playerId, index + 1);
    });

    return predictedPositions;
}

// Recursively find all JSON files in directory
function findJsonFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...findJsonFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.json')) {
            files.push(fullPath);
        }
    }

    return files;
}

// Main analysis function
function analyzeResults() {
    const resultsDir = path.join(__dirname, 'race_results');
    const jsonFiles = findJsonFiles(resultsDir);

    console.log(`Found ${jsonFiles.length} result files to analyze\n`);

    const allAnalysis = [];
    let totalRiders = 0;
    let totalRaces = 0;

    for (const file of jsonFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));

            if (!data.results || !Array.isArray(data.results)) continue;

            const results = data.results;
            const predictedPositions = calculatePredictedPositions(results);

            // Analyze each finisher
            for (const rider of results) {
                if (rider.isDNF || rider.position === 32767 || !rider.rating) continue;

                const predictedPos = predictedPositions.get(rider.playerId);
                if (!predictedPos) continue;

                const actualPos = rider.position;
                const diff = actualPos - predictedPos; // Positive = finished worse than predicted

                allAnalysis.push({
                    eventKey: data.metadata?.eventKey,
                    eventName: data.metadata?.eventName,
                    playerId: rider.playerId,
                    name: `${rider.firstName} ${rider.lastName}`,
                    arr: rider.arr,
                    arrBand: getARRBand(rider.arr),
                    arrBandGroup: getARRBandGroup(rider.arr),
                    eventRating: rider.rating,
                    predictedPosition: predictedPos,
                    actualPosition: actualPos,
                    difference: diff,
                    absoluteDiff: Math.abs(diff),
                    isBot: rider.isBot,
                    fieldSize: results.filter(r => !r.isDNF && r.position !== 32767).length
                });

                totalRiders++;
            }

            totalRaces++;
        } catch (err) {
            console.error(`Error processing ${file}: ${err.message}`);
        }
    }

    console.log(`Analyzed ${totalRiders} rider results across ${totalRaces} races\n`);

    return allAnalysis;
}

// Calculate statistics for a group
function calculateStats(data) {
    if (data.length === 0) return null;

    const diffs = data.map(d => d.difference);
    const absDiffs = data.map(d => d.absoluteDiff);

    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = arr => {
        const m = mean(arr);
        return Math.sqrt(arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / arr.length);
    };

    // Sort for percentiles
    const sortedAbsDiffs = [...absDiffs].sort((a, b) => a - b);
    const percentile = (arr, p) => arr[Math.floor(arr.length * p / 100)];

    // Count exact predictions
    const exactPredictions = diffs.filter(d => d === 0).length;
    const within1 = absDiffs.filter(d => d <= 1).length;
    const within3 = absDiffs.filter(d => d <= 3).length;
    const within5 = absDiffs.filter(d => d <= 5).length;

    // Count better/worse than predicted
    const betterThanPredicted = diffs.filter(d => d < 0).length;
    const worseThanPredicted = diffs.filter(d => d > 0).length;

    return {
        count: data.length,
        meanDiff: mean(diffs),
        meanAbsDiff: mean(absDiffs),
        stdDev: stdDev(diffs),
        median: percentile(sortedAbsDiffs, 50),
        p75: percentile(sortedAbsDiffs, 75),
        p90: percentile(sortedAbsDiffs, 90),
        p95: percentile(sortedAbsDiffs, 95),
        maxDiff: Math.max(...absDiffs),
        minDiff: Math.min(...diffs),
        maxAbsDiff: Math.max(...absDiffs),
        exactPredictions,
        exactPct: (exactPredictions / data.length * 100),
        within1,
        within1Pct: (within1 / data.length * 100),
        within3,
        within3Pct: (within3 / data.length * 100),
        within5,
        within5Pct: (within5 / data.length * 100),
        betterThanPredicted,
        betterPct: (betterThanPredicted / data.length * 100),
        worseThanPredicted,
        worsePct: (worseThanPredicted / data.length * 100)
    };
}

// Generate ASCII histogram
function generateHistogram(data, bucketSize = 1, maxBuckets = 21) {
    const diffs = data.map(d => d.difference);
    const minVal = Math.max(Math.min(...diffs), -10);
    const maxVal = Math.min(Math.max(...diffs), 10);

    const buckets = {};
    for (let i = minVal; i <= maxVal; i++) {
        buckets[i] = 0;
    }

    diffs.forEach(d => {
        const bucket = Math.max(minVal, Math.min(maxVal, d));
        buckets[bucket]++;
    });

    const maxCount = Math.max(...Object.values(buckets));
    const barWidth = 50;

    let histogram = '\n  Distribution of Prediction Errors (Actual - Predicted):\n';
    histogram += '  Negative = Finished BETTER than predicted, Positive = Finished WORSE\n\n';

    for (let i = minVal; i <= maxVal; i++) {
        const count = buckets[i];
        const barLength = Math.round((count / maxCount) * barWidth);
        const bar = '#'.repeat(barLength);
        const label = i === 0 ? '  0 (exact)' : (i > 0 ? ` +${i}` : ` ${i}`);
        histogram += `  ${label.padStart(11)}: ${bar} (${count})\n`;
    }

    return histogram;
}

// Generate the report
function generateReport(analysis) {
    const stats = calculateStats(analysis);
    const humanOnly = analysis.filter(d => !d.isBot);
    const humanStats = calculateStats(humanOnly);
    const botOnly = analysis.filter(d => d.isBot);
    const botStats = calculateStats(botOnly);

    // Group by ARR band
    const bandGroups = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Unranked'];
    const statsByBand = {};

    for (const band of bandGroups) {
        const bandData = analysis.filter(d => d.arrBandGroup === band);
        statsByBand[band] = calculateStats(bandData);
    }

    // Build report
    let report = `
================================================================================
                    PREDICTION ACCURACY ANALYSIS REPORT
================================================================================
                         TPV Career Mode - Season 1
                         Generated: ${new Date().toISOString()}
================================================================================

PURPOSE
-------
This report analyzes the accuracy of the event rating prediction system.
Event Rating is used to predict expected finish position based on rider rating.
The goal is to identify patterns and areas for improvement.

METHODOLOGY
-----------
1. For each race, riders are ranked by their Event Rating (descending)
2. This ranking becomes their "Predicted Position" (1st = highest rating)
3. We compare Predicted Position to Actual Position
4. Difference = Actual - Predicted (negative = beat prediction, positive = missed it)

================================================================================
                            OVERALL STATISTICS
================================================================================

Total Results Analyzed: ${stats.count.toLocaleString()}
  - Human Riders: ${humanStats?.count.toLocaleString() || 0}
  - Bot Riders: ${botStats?.count.toLocaleString() || 0}

PREDICTION ACCURACY
-------------------
                              All Riders    Humans Only    Bots Only
                              ----------    -----------    ---------
Mean Absolute Error (MAE):    ${stats.meanAbsDiff.toFixed(2).padStart(10)}    ${(humanStats?.meanAbsDiff || 0).toFixed(2).padStart(11)}    ${(botStats?.meanAbsDiff || 0).toFixed(2).padStart(9)}
Mean Signed Error:            ${stats.meanDiff.toFixed(2).padStart(10)}    ${(humanStats?.meanDiff || 0).toFixed(2).padStart(11)}    ${(botStats?.meanDiff || 0).toFixed(2).padStart(9)}
Standard Deviation:           ${stats.stdDev.toFixed(2).padStart(10)}    ${(humanStats?.stdDev || 0).toFixed(2).padStart(11)}    ${(botStats?.stdDev || 0).toFixed(2).padStart(9)}
Median Absolute Error:        ${stats.median.toFixed(0).padStart(10)}    ${(humanStats?.median || 0).toFixed(0).padStart(11)}    ${(botStats?.median || 0).toFixed(0).padStart(9)}

PERCENTILES (Absolute Error)
----------------------------
75th Percentile:              ${stats.p75.toFixed(0).padStart(10)}    ${(humanStats?.p75 || 0).toFixed(0).padStart(11)}    ${(botStats?.p75 || 0).toFixed(0).padStart(9)}
90th Percentile:              ${stats.p90.toFixed(0).padStart(10)}    ${(humanStats?.p90 || 0).toFixed(0).padStart(11)}    ${(botStats?.p90 || 0).toFixed(0).padStart(9)}
95th Percentile:              ${stats.p95.toFixed(0).padStart(10)}    ${(humanStats?.p95 || 0).toFixed(0).padStart(11)}    ${(botStats?.p95 || 0).toFixed(0).padStart(9)}
Maximum Error:                ${stats.maxAbsDiff.toFixed(0).padStart(10)}    ${(humanStats?.maxAbsDiff || 0).toFixed(0).padStart(11)}    ${(botStats?.maxAbsDiff || 0).toFixed(0).padStart(9)}

PREDICTION HIT RATES
--------------------
Exact Predictions:            ${stats.exactPct.toFixed(1).padStart(9)}%    ${(humanStats?.exactPct || 0).toFixed(1).padStart(10)}%    ${(botStats?.exactPct || 0).toFixed(1).padStart(8)}%
Within 1 Position:            ${stats.within1Pct.toFixed(1).padStart(9)}%    ${(humanStats?.within1Pct || 0).toFixed(1).padStart(10)}%    ${(botStats?.within1Pct || 0).toFixed(1).padStart(8)}%
Within 3 Positions:           ${stats.within3Pct.toFixed(1).padStart(9)}%    ${(humanStats?.within3Pct || 0).toFixed(1).padStart(10)}%    ${(botStats?.within3Pct || 0).toFixed(1).padStart(8)}%
Within 5 Positions:           ${stats.within5Pct.toFixed(1).padStart(9)}%    ${(humanStats?.within5Pct || 0).toFixed(1).padStart(10)}%    ${(botStats?.within5Pct || 0).toFixed(1).padStart(8)}%

DIRECTION OF ERRORS
-------------------
Finished BETTER than predicted: ${stats.betterPct.toFixed(1)}% (${stats.betterThanPredicted.toLocaleString()} riders)
Finished WORSE than predicted:  ${stats.worsePct.toFixed(1)}% (${stats.worseThanPredicted.toLocaleString()} riders)
Finished EXACTLY as predicted:  ${stats.exactPct.toFixed(1)}% (${stats.exactPredictions.toLocaleString()} riders)

${generateHistogram(analysis)}

================================================================================
                        ACCURACY BY ARR BAND
================================================================================

This section shows prediction accuracy broken down by rider ARR level.
Key questions: Are predictions more accurate for higher or lower rated riders?

`;

    // Table header for ARR bands
    report += `ARR Band      Count     MAE    Std Dev    Exact%   Within3%   Within5%   Avg Diff
---------     -----     ---    -------    ------   --------   --------   --------
`;

    for (const band of bandGroups) {
        const s = statsByBand[band];
        if (!s) continue;

        report += `${band.padEnd(12)}  ${s.count.toString().padStart(5)}   ${s.meanAbsDiff.toFixed(2).padStart(5)}    ${s.stdDev.toFixed(2).padStart(7)}    ${s.exactPct.toFixed(1).padStart(5)}%    ${s.within3Pct.toFixed(1).padStart(6)}%    ${s.within5Pct.toFixed(1).padStart(6)}%    ${(s.meanDiff > 0 ? '+' : '') + s.meanDiff.toFixed(2).padStart(6)}
`;
    }

    // Detailed breakdown by sub-band
    report += `

DETAILED BREAKDOWN BY ARR SUB-BAND
----------------------------------
`;

    const subBands = ['Diamond 1', 'Diamond 2', 'Diamond 3', 'Diamond 4',
                      'Platinum 1', 'Platinum 2', 'Platinum 3',
                      'Gold 1', 'Gold 2', 'Gold 3',
                      'Silver 1', 'Silver 2', 'Silver 3',
                      'Bronze 1', 'Bronze 2', 'Bronze 3', 'Unranked'];

    report += `Sub-Band        Count     MAE    Exact%   Within3%   Avg Diff   Better%   Worse%
--------        -----     ---    ------   --------   --------   -------   ------
`;

    for (const subBand of subBands) {
        const subBandData = analysis.filter(d => d.arrBand === subBand);
        const s = calculateStats(subBandData);
        if (!s || s.count < 10) continue;

        report += `${subBand.padEnd(14)}  ${s.count.toString().padStart(5)}   ${s.meanAbsDiff.toFixed(2).padStart(5)}    ${s.exactPct.toFixed(1).padStart(5)}%    ${s.within3Pct.toFixed(1).padStart(6)}%    ${(s.meanDiff > 0 ? '+' : '') + s.meanDiff.toFixed(2).padStart(6)}    ${s.betterPct.toFixed(1).padStart(6)}%   ${s.worsePct.toFixed(1).padStart(5)}%
`;
    }

    // Field size analysis
    report += `

================================================================================
                      ACCURACY BY FIELD SIZE
================================================================================

How does field size affect prediction accuracy?

`;

    const fieldSizeBuckets = [
        { min: 1, max: 10, label: '1-10 riders' },
        { min: 11, max: 20, label: '11-20 riders' },
        { min: 21, max: 30, label: '21-30 riders' },
        { min: 31, max: 40, label: '31-40 riders' },
        { min: 41, max: 50, label: '41-50 riders' },
        { min: 51, max: 100, label: '51+ riders' }
    ];

    report += `Field Size       Count     MAE    Exact%   Within3%   Within5%
----------       -----     ---    ------   --------   --------
`;

    for (const bucket of fieldSizeBuckets) {
        const bucketData = analysis.filter(d => d.fieldSize >= bucket.min && d.fieldSize <= bucket.max);
        const s = calculateStats(bucketData);
        if (!s) continue;

        report += `${bucket.label.padEnd(15)}  ${s.count.toString().padStart(5)}   ${s.meanAbsDiff.toFixed(2).padStart(5)}    ${s.exactPct.toFixed(1).padStart(5)}%    ${s.within3Pct.toFixed(1).padStart(6)}%    ${s.within5Pct.toFixed(1).padStart(6)}%
`;
    }

    // Worst predictions analysis
    report += `

================================================================================
                      LARGEST PREDICTION ERRORS
================================================================================

Top 20 cases where prediction was furthest from actual result:

`;

    const sortedByError = [...analysis].sort((a, b) => b.absoluteDiff - a.absoluteDiff).slice(0, 20);

    report += `Rider Name                  ARR Band      Predicted   Actual   Error   Event
----------                  --------      ---------   ------   -----   -----
`;

    for (const r of sortedByError) {
        const errorStr = r.difference > 0 ? `+${r.difference}` : r.difference.toString();
        report += `${r.name.substring(0, 26).padEnd(26)}  ${r.arrBand.padEnd(12)}  ${r.predictedPosition.toString().padStart(9)}   ${r.actualPosition.toString().padStart(6)}   ${errorStr.padStart(5)}   ${(r.eventKey || 'N/A').toString().substring(0, 10)}
`;
    }

    // Summary and recommendations
    report += `

================================================================================
                    KEY FINDINGS & RECOMMENDATIONS
================================================================================

SUMMARY OF FINDINGS
-------------------
1. Overall Mean Absolute Error: ${stats.meanAbsDiff.toFixed(2)} positions
   - This means on average, predictions are off by ~${Math.round(stats.meanAbsDiff)} positions

2. Prediction Bias: ${stats.meanDiff > 0 ? 'Predictions tend to be OPTIMISTIC (riders finish worse than predicted)' : stats.meanDiff < 0 ? 'Predictions tend to be PESSIMISTIC (riders finish better than predicted)' : 'Predictions are well-balanced'}
   - Mean signed error: ${stats.meanDiff > 0 ? '+' : ''}${stats.meanDiff.toFixed(2)} positions

3. Accuracy Rates:
   - ${stats.exactPct.toFixed(1)}% of predictions are exactly correct
   - ${stats.within3Pct.toFixed(1)}% of predictions are within 3 positions
   - ${stats.within5Pct.toFixed(1)}% of predictions are within 5 positions

4. Human vs Bot Performance:
   ${humanStats && botStats ? `- Humans have MAE of ${humanStats.meanAbsDiff.toFixed(2)} vs Bots at ${botStats.meanAbsDiff.toFixed(2)}
   - ${humanStats.meanAbsDiff > botStats.meanAbsDiff ? 'Human results are LESS predictable than bots' : 'Human results are MORE predictable than bots'}` : '- Insufficient data for comparison'}

ARR BAND INSIGHTS
-----------------
`;

    // Find best and worst performing bands
    const validBandStats = bandGroups.map(b => ({ band: b, stats: statsByBand[b] })).filter(x => x.stats && x.stats.count >= 100);
    if (validBandStats.length > 0) {
        const bestBand = validBandStats.reduce((a, b) => a.stats.meanAbsDiff < b.stats.meanAbsDiff ? a : b);
        const worstBand = validBandStats.reduce((a, b) => a.stats.meanAbsDiff > b.stats.meanAbsDiff ? a : b);

        report += `- MOST accurate predictions: ${bestBand.band} (MAE: ${bestBand.stats.meanAbsDiff.toFixed(2)})
- LEAST accurate predictions: ${worstBand.band} (MAE: ${worstBand.stats.meanAbsDiff.toFixed(2)})
`;
    }

    report += `

POTENTIAL AREAS FOR IMPROVEMENT
-------------------------------
1. Consider adjusting rating weights for specific ARR bands showing higher errors
2. Analyze event types separately (crits, road races, TTs) for different patterns
3. Factor in recent form or race-specific attributes
4. Review cases with errors > 10 positions for common patterns

================================================================================
                              END OF REPORT
================================================================================
`;

    return report;
}

// Export human-only stats as JSON for dashboard
function exportHumanStats(analysis) {
    const humanOnly = analysis.filter(d => !d.isBot);
    const botOnly = analysis.filter(d => d.isBot);

    const humanStats = calculateStats(humanOnly);
    const botStats = calculateStats(botOnly);

    // Human stats by ARR band
    const bandGroups = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Unranked'];
    const humanStatsByBand = {};
    for (const band of bandGroups) {
        const bandData = humanOnly.filter(d => d.arrBandGroup === band);
        humanStatsByBand[band] = calculateStats(bandData);
    }

    // Distribution for humans only (buckets of 2, range -20 to +20)
    const humanDistribution = {};
    // Create buckets: -20 or less, -19 to -18, -17 to -16, ... 0, +1 to +2, ... +19 to +20, +20 or more
    const buckets = [
        { key: '-20', label: '-20 or less', filter: d => d.difference <= -20 },
        { key: '-18', label: '-19 to -18', filter: d => d.difference >= -19 && d.difference <= -18 },
        { key: '-16', label: '-17 to -16', filter: d => d.difference >= -17 && d.difference <= -16 },
        { key: '-14', label: '-15 to -14', filter: d => d.difference >= -15 && d.difference <= -14 },
        { key: '-12', label: '-13 to -12', filter: d => d.difference >= -13 && d.difference <= -12 },
        { key: '-10', label: '-11 to -10', filter: d => d.difference >= -11 && d.difference <= -10 },
        { key: '-8', label: '-9 to -8', filter: d => d.difference >= -9 && d.difference <= -8 },
        { key: '-6', label: '-7 to -6', filter: d => d.difference >= -7 && d.difference <= -6 },
        { key: '-4', label: '-5 to -4', filter: d => d.difference >= -5 && d.difference <= -4 },
        { key: '-2', label: '-3 to -2', filter: d => d.difference >= -3 && d.difference <= -2 },
        { key: '0', label: '-1 to 0', filter: d => d.difference >= -1 && d.difference <= 0 },
        { key: '2', label: '+1 to +2', filter: d => d.difference >= 1 && d.difference <= 2 },
        { key: '4', label: '+3 to +4', filter: d => d.difference >= 3 && d.difference <= 4 },
        { key: '6', label: '+5 to +6', filter: d => d.difference >= 5 && d.difference <= 6 },
        { key: '8', label: '+7 to +8', filter: d => d.difference >= 7 && d.difference <= 8 },
        { key: '10', label: '+9 to +10', filter: d => d.difference >= 9 && d.difference <= 10 },
        { key: '12', label: '+11 to +12', filter: d => d.difference >= 11 && d.difference <= 12 },
        { key: '14', label: '+13 to +14', filter: d => d.difference >= 13 && d.difference <= 14 },
        { key: '16', label: '+15 to +16', filter: d => d.difference >= 15 && d.difference <= 16 },
        { key: '18', label: '+17 to +18', filter: d => d.difference >= 17 && d.difference <= 18 },
        { key: '20', label: '+19 to +20', filter: d => d.difference >= 19 && d.difference <= 20 },
        { key: '22', label: '+21 or more', filter: d => d.difference >= 21 }
    ];

    buckets.forEach(b => {
        humanDistribution[b.key] = {
            label: b.label,
            count: humanOnly.filter(b.filter).length,
            countNoDiamond: humanOnly.filter(d => !d.arrBandGroup.includes('Diamond')).filter(b.filter).length
        };
    });

    return {
        human: humanStats,
        bot: botStats,
        humanByBand: humanStatsByBand,
        humanDistribution
    };
}

// Export data to CSV for further analysis
function exportToCSV(analysis) {
    const headers = [
        'EventKey', 'PlayerID', 'Name', 'IsBot', 'ARR', 'ARRBand', 'ARRBandGroup',
        'EventRating', 'PredictedPosition', 'ActualPosition', 'Difference', 'AbsoluteDiff', 'FieldSize'
    ];

    let csv = headers.join(',') + '\n';

    for (const r of analysis) {
        csv += [
            r.eventKey,
            r.playerId,
            `"${r.name}"`,
            r.isBot,
            r.arr,
            r.arrBand,
            r.arrBandGroup,
            r.eventRating,
            r.predictedPosition,
            r.actualPosition,
            r.difference,
            r.absoluteDiff,
            r.fieldSize
        ].join(',') + '\n';
    }

    return csv;
}

// Main execution
console.log('Starting Prediction Accuracy Analysis...\n');

const analysis = analyzeResults();

if (analysis.length === 0) {
    console.log('No results found to analyze.');
    process.exit(1);
}

const report = generateReport(analysis);
const reportPath = path.join(__dirname, 'PREDICTION_ACCURACY_REPORT.txt');
fs.writeFileSync(reportPath, report);
console.log(`\nReport saved to: ${reportPath}`);

// Export CSV for further analysis
const csv = exportToCSV(analysis);
const csvPath = path.join(__dirname, 'prediction_accuracy_data.csv');
fs.writeFileSync(csvPath, csv);
console.log(`CSV data exported to: ${csvPath}`);

// Export human-focused stats as JSON
const humanFocusedStats = exportHumanStats(analysis);
const jsonPath = path.join(__dirname, 'human_prediction_stats.json');
fs.writeFileSync(jsonPath, JSON.stringify(humanFocusedStats, null, 2));
console.log(`Human-focused stats exported to: ${jsonPath}`);

// Print summary to console
console.log('\n' + '='.repeat(60));
console.log('QUICK SUMMARY');
console.log('='.repeat(60));
const stats = analysis.length > 0 ? {
    count: analysis.length,
    mae: analysis.reduce((a, b) => a + b.absoluteDiff, 0) / analysis.length,
    exact: analysis.filter(d => d.difference === 0).length / analysis.length * 100,
    within3: analysis.filter(d => d.absoluteDiff <= 3).length / analysis.length * 100
} : null;

if (stats) {
    console.log(`Total Results: ${stats.count.toLocaleString()}`);
    console.log(`Mean Absolute Error: ${stats.mae.toFixed(2)} positions`);
    console.log(`Exact Predictions: ${stats.exact.toFixed(1)}%`);
    console.log(`Within 3 Positions: ${stats.within3.toFixed(1)}%`);
}
console.log('\nSee PREDICTION_ACCURACY_REPORT.txt for full analysis.');
