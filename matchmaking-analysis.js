/**
 * Matchmaking Effectiveness Analysis
 *
 * Instead of measuring prediction accuracy (which is affected by race variance),
 * this analyzes whether matchmaking is effective by checking if results balance out over time.
 *
 * Key insight: In cycling, a rider might miss prediction by 20 positions due to race dynamics
 * (breakaways, sprints, tactics). That's not bad matchmaking - that's racing.
 * Good matchmaking means: over multiple races, the ups and downs should balance out.
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// ARR Band definitions
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
    const finishers = results.filter(r => !r.isDNF && r.position !== 32767 && r.rating != null);
    const sorted = [...finishers].sort((a, b) => b.rating - a.rating);
    const predictedPositions = new Map();
    sorted.forEach((rider, index) => {
        predictedPositions.set(rider.playerId, index + 1);
    });
    return predictedPositions;
}

// Recursively find all JSON files
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

// Recursively find all CSV files
function findCsvFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...findCsvFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.csv')) {
            files.push(fullPath);
        }
    }
    return files;
}

// Parse CSV file (handles TPVirtual format with title lines)
function parseCSV(csvContent) {
    return new Promise((resolve, reject) => {
        let processedContent = csvContent;
        let lines = csvContent.split('\n');

        // Remove first 2 lines if they contain "OVERALL INDIVIDUAL RESULTS:"
        if (lines[0].includes('OVERALL INDIVIDUAL RESULTS')) {
            lines = lines.slice(2);
            processedContent = lines.join('\n');
        }

        Papa.parse(processedContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

// Extract timestamp from filename
function extractTimestampFromFilename(filePath) {
    const match = filePath.match(/_(\d{8})_(\d{6})\.(csv|json)$/);
    if (!match) {
        return null;
    }
    const dateStr = match[1]; // YYYYMMDD
    const timeStr = match[2]; // HHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    const second = timeStr.substring(4, 6);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`);
}

// Convert CSV row to result format
function csvRowToResult(row) {
    return {
        playerId: row.UID,
        firstName: row.Name?.split(' ')[0] || '',
        lastName: row.Name?.split(' ').slice(1).join(' ') || '',
        position: parseInt(row.Position),
        isDNF: false, // CSV doesn't include DNFs
        rating: parseFloat(row.EventRating) || null,
        arr: parseInt(row.ARR) || null,
        isBot: row.Gender === 'Bot'
    };
}

// Main analysis
async function analyzeMatchmaking() {
    const resultsDir = path.join(__dirname, 'race_results');
    const jsonFiles = findJsonFiles(resultsDir);
    const csvFiles = findCsvFiles(resultsDir);

    console.log(`Processing ${jsonFiles.length} JSON files and ${csvFiles.length} CSV files...\n`);

    // Collect all results with timestamps
    const allResults = [];

    // Process JSON files
    for (const file of jsonFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (!data.results || !Array.isArray(data.results)) continue;

            const results = data.results;
            const predictedPositions = calculatePredictedPositions(results);
            const raceDate = new Date(data.metadata?.completedAt || data.metadata?.raceDate);
            const fieldSize = results.filter(r => !r.isDNF && r.position !== 32767).length;

            for (const rider of results) {
                if (rider.isDNF || rider.position === 32767 || !rider.rating) continue;

                const predictedPos = predictedPositions.get(rider.playerId);
                if (!predictedPos) continue;

                const actualPos = rider.position;
                const diff = actualPos - predictedPos;

                // Calculate percentile finish (0 = won, 100 = last)
                const percentileFinish = ((actualPos - 1) / (fieldSize - 1)) * 100;
                const expectedPercentile = ((predictedPos - 1) / (fieldSize - 1)) * 100;

                // Track if this is a win (ceiling effect applies)
                const isWin = actualPos === 1;
                // Track if predicted to win - if so, ceiling effect makes balance unmeasurable
                const predictedWin = predictedPos === 1;
                // Ceiling-affected: won the race, so true overperformance is unknown
                const ceilingAffected = isWin;

                allResults.push({
                    playerId: rider.playerId,
                    name: `${rider.firstName} ${rider.lastName}`,
                    isBot: rider.isBot,
                    arr: rider.arr,
                    arrBand: getARRBandGroup(rider.arr),
                    raceDate,
                    eventKey: data.metadata?.eventKey,
                    predictedPos,
                    actualPos,
                    difference: diff,
                    fieldSize,
                    percentileFinish,
                    expectedPercentile,
                    percentileDiff: percentileFinish - expectedPercentile,
                    isWin,
                    predictedWin,
                    ceilingAffected,
                    source: 'json'
                });
            }
        } catch (err) {
            console.error(`Error processing JSON ${file}: ${err.message}`);
        }
    }

    // Process CSV files
    for (const file of csvFiles) {
        try {
            const csvContent = fs.readFileSync(file, 'utf8');
            const csvData = await parseCSV(csvContent);

            if (!csvData || csvData.length === 0) continue;

            // Convert CSV rows to results format
            const results = csvData.map(csvRowToResult).filter(r => r.rating != null);

            const predictedPositions = calculatePredictedPositions(results);
            const raceDate = extractTimestampFromFilename(file) || new Date(fs.statSync(file).mtime);
            const fieldSize = results.filter(r => !r.isDNF && r.position !== 32767).length;
            const eventKey = csvData[0]?.EventKey || path.basename(file);

            for (const rider of results) {
                if (rider.isDNF || rider.position === 32767 || !rider.rating) continue;

                const predictedPos = predictedPositions.get(rider.playerId);
                if (!predictedPos) continue;

                const actualPos = rider.position;
                const diff = actualPos - predictedPos;

                // Calculate percentile finish
                const percentileFinish = ((actualPos - 1) / (fieldSize - 1)) * 100;
                const expectedPercentile = ((predictedPos - 1) / (fieldSize - 1)) * 100;

                const isWin = actualPos === 1;
                const predictedWin = predictedPos === 1;
                const ceilingAffected = isWin;

                allResults.push({
                    playerId: rider.playerId,
                    name: `${rider.firstName} ${rider.lastName}`,
                    isBot: rider.isBot,
                    arr: rider.arr,
                    arrBand: getARRBandGroup(rider.arr),
                    raceDate,
                    eventKey,
                    predictedPos,
                    actualPos,
                    difference: diff,
                    fieldSize,
                    percentileFinish,
                    expectedPercentile,
                    percentileDiff: percentileFinish - expectedPercentile,
                    isWin,
                    predictedWin,
                    ceilingAffected,
                    source: 'csv'
                });
            }
        } catch (err) {
            console.error(`Error processing CSV ${file}: ${err.message}`);
        }
    }

    // Sort all results by date
    allResults.sort((a, b) => a.raceDate - b.raceDate);

    // Group by player and build cumulative trends
    const playerResults = new Map();

    for (const result of allResults) {
        if (!playerResults.has(result.playerId)) {
            playerResults.set(result.playerId, {
                playerId: result.playerId,
                name: result.name,
                isBot: result.isBot,
                currentARR: result.arr,
                currentBand: result.arrBand,
                races: []
            });
        }

        const player = playerResults.get(result.playerId);
        const prevCumulative = player.races.length > 0
            ? player.races[player.races.length - 1].cumulativeDiff
            : 0;

        player.races.push({
            raceNumber: player.races.length + 1,
            eventKey: result.eventKey,
            date: result.raceDate,
            predictedPos: result.predictedPos,
            actualPos: result.actualPos,
            difference: result.difference,
            cumulativeDiff: prevCumulative + result.difference,
            fieldSize: result.fieldSize,
            percentileFinish: result.percentileFinish,
            expectedPercentile: result.expectedPercentile,
            isWin: result.isWin,
            ceilingAffected: result.ceilingAffected
        });

        // Update current ARR/band to most recent
        player.currentARR = result.arr;
        player.currentBand = result.arrBand;
    }

    return playerResults;
}

// Calculate balance metrics for a player
function calculateBalanceMetrics(player) {
    const races = player.races;
    if (races.length === 0) return null;

    const differences = races.map(r => r.difference);
    const cumulativeFinal = races[races.length - 1].cumulativeDiff;

    // Count wins (ceiling-affected results)
    const wins = races.filter(r => r.isWin).length;
    const winRate = (wins / races.length) * 100;

    // Calculate metrics excluding wins (non-ceiling-affected)
    const nonWinRaces = races.filter(r => !r.isWin);
    const nonWinDiffs = nonWinRaces.map(r => r.difference);
    const nonWinAvgDiff = nonWinDiffs.length > 0
        ? nonWinDiffs.reduce((a, b) => a + b, 0) / nonWinDiffs.length
        : null;

    // Average difference (should be near 0 for balanced)
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;

    // How often does cumulative cross zero? (more crossings = more balanced)
    let zeroCrossings = 0;
    for (let i = 1; i < races.length; i++) {
        const prev = races[i-1].cumulativeDiff;
        const curr = races[i].cumulativeDiff;
        if ((prev <= 0 && curr > 0) || (prev >= 0 && curr < 0)) {
            zeroCrossings++;
        }
    }

    // Drift rate: final cumulative / number of races
    const driftRate = cumulativeFinal / races.length;

    // Volatility: standard deviation of differences
    const variance = differences.reduce((acc, d) => acc + Math.pow(d - avgDiff, 2), 0) / differences.length;
    const volatility = Math.sqrt(variance);

    // Balance score: how close to zero is the average? (0-100, higher = better balanced)
    // Using a sigmoid-like function where avgDiff near 0 = high score
    const balanceScore = Math.max(0, 100 - Math.abs(avgDiff) * 10);

    // Flag if trend assessment is uncertain due to many wins
    const ceilingWarning = wins > 0;
    const highWinRate = winRate >= 50;

    // Trend direction - use overall avg if high win rate (>50%), otherwise use non-win avg
    // When win rate is high, non-win sample is too small to be representative
    const trendMetric = (highWinRate || nonWinAvgDiff === null) ? avgDiff : nonWinAvgDiff;
    let trend = 'balanced';
    if (trendMetric < -2) trend = 'overperforming';  // Consistently beating predictions
    if (trendMetric > 2) trend = 'underperforming';  // Consistently missing predictions

    return {
        raceCount: races.length,
        avgDifference: avgDiff,
        nonWinAvgDiff,
        cumulativeFinal,
        driftRate,
        volatility,
        zeroCrossings,
        balanceScore,
        trend,
        wins,
        winRate,
        ceilingWarning,
        highWinRate
    };
}

// Generate analysis data for dashboard
function generateDashboardData(playerResults) {
    // Filter to humans only with at least 2 races
    const humanPlayers = [...playerResults.values()]
        .filter(p => !p.isBot && p.races.length >= 2);

    console.log(`Found ${humanPlayers.length} human riders with 2+ races\n`);

    // Calculate metrics for each player
    const playerMetrics = humanPlayers.map(player => {
        const metrics = calculateBalanceMetrics(player);
        return {
            ...player,
            metrics
        };
    }).filter(p => p.metrics);

    // Sort by race count descending for display
    playerMetrics.sort((a, b) => b.races.length - a.races.length);

    // Summary statistics
    const totalPlayers = playerMetrics.length;
    const balancedCount = playerMetrics.filter(p => p.metrics.trend === 'balanced').length;
    const overperformingCount = playerMetrics.filter(p => p.metrics.trend === 'overperforming').length;
    const underperformingCount = playerMetrics.filter(p => p.metrics.trend === 'underperforming').length;

    const validBalanceScores = playerMetrics.filter(p => !isNaN(p.metrics.balanceScore));
    const avgBalanceScore = validBalanceScores.length > 0
        ? validBalanceScores.reduce((a, p) => a + p.metrics.balanceScore, 0) / validBalanceScores.length
        : 0;

    // Band analysis - are certain bands systematically off?
    const bandStats = {};
    for (const player of playerMetrics) {
        const band = player.currentBand;
        if (!bandStats[band]) {
            bandStats[band] = { players: 0, totalAvgDiff: 0, totalRaces: 0, validPlayerCount: 0 };
        }
        bandStats[band].players++;
        if (!isNaN(player.metrics.avgDifference)) {
            bandStats[band].totalAvgDiff += player.metrics.avgDifference;
            bandStats[band].validPlayerCount++;
        }
        bandStats[band].totalRaces += player.metrics.raceCount;
    }

    for (const band in bandStats) {
        bandStats[band].avgDiff = bandStats[band].validPlayerCount > 0
            ? bandStats[band].totalAvgDiff / bandStats[band].validPlayerCount
            : 0;
    }

    return {
        summary: {
            totalPlayers,
            balancedCount,
            balancedPct: (balancedCount / totalPlayers * 100).toFixed(1),
            overperformingCount,
            overperformingPct: (overperformingCount / totalPlayers * 100).toFixed(1),
            underperformingCount,
            underperformingPct: (underperformingCount / totalPlayers * 100).toFixed(1),
            avgBalanceScore: avgBalanceScore.toFixed(1)
        },
        bandStats,
        players: playerMetrics.map(p => ({
            playerId: p.playerId,
            name: p.name,
            band: p.currentBand,
            arr: p.currentARR,
            raceCount: p.metrics.raceCount,
            avgDiff: p.metrics.avgDifference.toFixed(2),
            nonWinAvgDiff: p.metrics.nonWinAvgDiff !== null ? p.metrics.nonWinAvgDiff.toFixed(2) : null,
            cumulativeFinal: p.metrics.cumulativeFinal,
            driftRate: p.metrics.driftRate.toFixed(2),
            balanceScore: p.metrics.balanceScore.toFixed(0),
            trend: p.metrics.trend,
            wins: p.metrics.wins,
            winRate: p.metrics.winRate.toFixed(0),
            ceilingWarning: p.metrics.ceilingWarning,
            highWinRate: p.metrics.highWinRate,
            // Include race-by-race data for charts
            races: p.races.map(r => ({
                raceNum: r.raceNumber,
                diff: r.difference,
                cumulative: r.cumulativeDiff,
                date: r.date.toISOString().split('T')[0],
                isWin: r.isWin
            }))
        }))
    };
}

// Main execution
async function main() {
    console.log('Matchmaking Effectiveness Analysis\n');
    console.log('='.repeat(50));

    const playerResults = await analyzeMatchmaking();
    const dashboardData = generateDashboardData(playerResults);

    // Save data for dashboard
    const outputPath = path.join(__dirname, 'matchmaking_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(dashboardData, null, 2));
    console.log(`\nDashboard data saved to: ${outputPath}`);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('MATCHMAKING EFFECTIVENESS SUMMARY');
    console.log('='.repeat(50));
    console.log(`\nTotal Human Riders (2+ races): ${dashboardData.summary.totalPlayers}`);
    console.log(`\nBalance Distribution:`);
    console.log(`  Balanced (avg diff within ±2):    ${dashboardData.summary.balancedCount} (${dashboardData.summary.balancedPct}%)`);
    console.log(`  Overperforming (beating preds):   ${dashboardData.summary.overperformingCount} (${dashboardData.summary.overperformingPct}%)`);
    console.log(`  Underperforming (missing preds):  ${dashboardData.summary.underperformingCount} (${dashboardData.summary.underperformingPct}%)`);
    console.log(`\nAverage Balance Score: ${dashboardData.summary.avgBalanceScore}/100`);

    console.log(`\nBy ARR Band:`);
    const bands = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Unranked'];
    for (const band of bands) {
        const stats = dashboardData.bandStats[band];
        if (stats) {
            const direction = stats.avgDiff < -1 ? '(overperforming)' : stats.avgDiff > 1 ? '(underperforming)' : '(balanced)';
            console.log(`  ${band.padEnd(10)}: ${stats.players} riders, avg diff ${stats.avgDiff.toFixed(2)} ${direction}`);
        }
    }

    console.log('\nTop riders by race count:');
    dashboardData.players.slice(0, 10).forEach((p, i) => {
        const arrow = p.trend === 'overperforming' ? '↑' : p.trend === 'underperforming' ? '↓' : '→';
        const winInfo = p.wins > 0 ? ` [${p.wins} wins - ceiling effect]` : '';
        console.log(`  ${i+1}. ${p.name.padEnd(25)} ${p.raceCount} races, cumulative: ${p.cumulativeFinal > 0 ? '+' : ''}${p.cumulativeFinal}, trend: ${arrow} ${p.trend}${winInfo}`);
    });

    // Ceiling effect summary
    const playersWithWins = dashboardData.players.filter(p => p.wins > 0);
    const totalWins = playersWithWins.reduce((a, p) => a + p.wins, 0);
    console.log(`\nCeiling Effect Note:`);
    console.log(`  ${playersWithWins.length} riders have ${totalWins} total wins where true overperformance is unmeasurable.`);
    console.log(`  Riders with many wins may appear "balanced" but could be significantly underrated.`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
