#!/usr/bin/env node

/**
 * Generate Season 1 Rider Standings Report
 * Analyzes all race results and creates a comprehensive standings report
 */

const fs = require('fs');
const path = require('path');

// Event max points configuration
const EVENT_MAX_POINTS = {
  1: 65,   // Coast and Roast Crit
  2: 95,   // Island Classic
  3: 50,   // The Forest Velodrome Elimination
  4: 50,   // Coastal Loop Time Challenge
  5: 80,   // North Lake Points Race
  6: 50,   // Easy Hill Climb
  7: 70,   // Flat Eight Criterium
  8: 185,  // The Grand Gilbert Fondo
  9: 85,   // Base Camp Classic
  10: 70,  // Beach and Pine TT
  11: 60,  // South Lake Points Race
  12: 145, // Unbound - Little Egypt
  13: 120, // Local Tour Stage 1
  14: 95,  // Local Tour Stage 2
  15: 135, // Local Tour Stage 3
  102: 40  // The Leveller
};

const EVENT_DISPLAY_NAMES = {
  1: 'Coast and Roast Crit',
  2: 'Island Classic',
  3: 'The Forest Velodrome Elimination',
  4: 'Coastal Loop Time Challenge',
  5: 'North Lake Points Race',
  6: 'Easy Hill Climb',
  7: 'Flat Eight Criterium',
  8: 'The Grand Gilbert Fondo',
  9: 'Base Camp Classic',
  10: 'Beach and Pine TT',
  11: 'South Lake Points Race',
  12: 'Unbound - Little Egypt',
  13: 'Local Tour Stage 1',
  14: 'Local Tour Stage 2',
  15: 'Local Tour Stage 3',
  102: 'The Leveller'
};

/**
 * Calculate points based on finishing position
 */
function calculatePoints(position, eventNumber) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber];

  if (!maxPoints) {
    console.warn(`No max points defined for event ${eventNumber}, using 100`);
    return Math.max(0, 100 - (position - 1) * 2);
  }

  // Event 3 special case: elimination race
  if (eventNumber === 3) {
    if (position > 20) return 0;
    const basePoints = 45 - (position - 1) * (35 / 19);
    const podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;
    return Math.round(basePoints + podiumBonus);
  }

  if (position > 40) return 0;

  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  const podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;

  return Math.round(basePoints + podiumBonus);
}

/**
 * Read all race results from a specific event directory
 */
function readEventResults(eventDir) {
  const results = [];

  if (!fs.existsSync(eventDir)) {
    return results;
  }

  const files = fs.readdirSync(eventDir);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(eventDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (data.results && Array.isArray(data.results)) {
        results.push(...data.results);
      }
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }

  return results;
}

/**
 * Process all events and build standings
 */
function buildStandings() {
  const riderMap = new Map();
  const resultsDir = path.join(__dirname, 'race_results', 'season_1');

  // Find all event directories
  const eventDirs = fs.readdirSync(resultsDir)
    .filter(dir => dir.startsWith('event_'))
    .map(dir => {
      const eventNum = parseInt(dir.replace('event_', ''));
      return { dir: path.join(resultsDir, dir), eventNum };
    })
    .sort((a, b) => a.eventNum - b.eventNum);

  console.log(`Found ${eventDirs.length} events to process\n`);

  // Process each event
  for (const { dir, eventNum } of eventDirs) {
    console.log(`Processing Event ${eventNum}: ${EVENT_DISPLAY_NAMES[eventNum] || 'Unknown'}...`);
    const results = readEventResults(dir);

    if (results.length === 0) {
      console.log(`  No results found`);
      continue;
    }

    console.log(`  Found ${results.length} race finishers`);

    // Track unique riders in this event
    const uniqueRiders = new Set();

    for (const result of results) {
      const position = result.position;

      // Skip DNFs
      if (position === 'DNF' || typeof position !== 'number') {
        continue;
      }

      const playerId = result.playerId;
      const name = `${result.firstName} ${result.lastName}`.trim();
      const team = result.teamName || '';
      const arr = result.arr || 0;
      const isBot = result.isBot || false;

      // Calculate points for this position
      const points = calculatePoints(position, eventNum);

      // Use playerId as unique identifier
      if (!riderMap.has(playerId)) {
        riderMap.set(playerId, {
          playerId,
          name,
          team,
          arr,
          isBot,
          totalPoints: 0,
          eventsCompleted: 0,
          eventResults: []
        });
      }

      const rider = riderMap.get(playerId);

      // Only count each rider once per event (take their best result if multiple pens)
      if (!uniqueRiders.has(playerId)) {
        uniqueRiders.add(playerId);
        rider.totalPoints += points;
        rider.eventsCompleted++;
        rider.eventResults.push({
          eventNum,
          position,
          points
        });

        // Update ARR and team to latest
        rider.arr = arr;
        if (team) rider.team = team;
      }
    }

    console.log(`  Processed ${uniqueRiders.size} unique riders`);
  }

  // Convert to array and sort by total points
  const standings = Array.from(riderMap.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // Tie-breaker: fewer events is better (higher points per event)
      return a.eventsCompleted - b.eventsCompleted;
    });

  return standings;
}

/**
 * Generate the report
 */
function generateReport() {
  console.log('='.repeat(80));
  console.log('SEASON 1 RIDER STANDINGS REPORT');
  console.log('='.repeat(80));
  console.log();

  const standings = buildStandings();

  console.log('\n');
  console.log('='.repeat(80));
  console.log('FINAL STANDINGS');
  console.log('='.repeat(80));
  console.log();

  console.log(`Total Riders: ${standings.length}`);
  console.log(`Bots: ${standings.filter(r => r.isBot).length}`);
  console.log(`Human Riders: ${standings.filter(r => !r.isBot).length}`);
  console.log();

  // Print header
  console.log('-'.repeat(100));
  console.log(
    'Rank'.padEnd(6) +
    'Rider Name'.padEnd(30) +
    'Team'.padEnd(20) +
    'ARR'.padEnd(6) +
    'Events'.padEnd(8) +
    'Points'.padEnd(8) +
    'Type'
  );
  console.log('-'.repeat(100));

  // Print all riders
  standings.forEach((rider, index) => {
    const rank = (index + 1).toString();
    const name = rider.name.substring(0, 28);
    const team = (rider.team || '').substring(0, 18);
    const arr = rider.arr.toString();
    const events = rider.eventsCompleted.toString();
    const points = rider.totalPoints.toString();
    const type = rider.isBot ? 'Bot' : 'Human';

    console.log(
      rank.padEnd(6) +
      name.padEnd(30) +
      team.padEnd(20) +
      arr.padEnd(6) +
      events.padEnd(8) +
      points.padEnd(8) +
      type
    );
  });

  console.log('-'.repeat(100));
  console.log();

  // Print top 10 detail
  console.log('='.repeat(80));
  console.log('TOP 10 RIDERS - DETAILED BREAKDOWN');
  console.log('='.repeat(80));
  console.log();

  standings.slice(0, 10).forEach((rider, index) => {
    console.log(`\n${index + 1}. ${rider.name} (${rider.isBot ? 'Bot' : 'Human'})`);
    console.log(`   Team: ${rider.team || 'Independent'}`);
    console.log(`   ARR: ${rider.arr}`);
    console.log(`   Total Points: ${rider.totalPoints}`);
    console.log(`   Events Completed: ${rider.eventsCompleted}`);
    console.log(`   Event History:`);

    rider.eventResults.forEach(result => {
      console.log(`     Event ${result.eventNum}: Position ${result.position} - ${result.points} points`);
    });
  });

  console.log('\n');
  console.log('='.repeat(80));
  console.log('REPORT COMPLETE');
  console.log('='.repeat(80));
}

// Run the report
generateReport();
