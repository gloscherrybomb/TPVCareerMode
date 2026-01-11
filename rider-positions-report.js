#!/usr/bin/env node

/**
 * Generate Individual Rider Position Report
 * Shows where each rider is positioned in their Season 1 standings
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

/**
 * Calculate points based on finishing position
 */
function calculatePoints(position, eventNumber) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber];

  if (!maxPoints) {
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

  // Process each event
  for (const { dir, eventNum } of eventDirs) {
    const results = readEventResults(dir);

    if (results.length === 0) {
      continue;
    }

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
          eventsCompleted: 0
        });
      }

      const rider = riderMap.get(playerId);

      // Only count each rider once per event (take their best result if multiple pens)
      if (!uniqueRiders.has(playerId)) {
        uniqueRiders.add(playerId);
        rider.totalPoints += points;
        rider.eventsCompleted++;

        // Update ARR and team to latest
        rider.arr = arr;
        if (team) rider.team = team;
      }
    }
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
 * Generate the position report
 */
function generateReport() {
  console.log('================================================================================');
  console.log('SEASON 1 - RIDER POSITION REPORT');
  console.log('Each rider\'s current position in the seasonal standings');
  console.log('================================================================================');
  console.log();

  const standings = buildStandings();

  console.log(`Total Riders in Season 1 Standings: ${standings.length}`);
  console.log();

  // Print header
  console.log('-'.repeat(110));
  console.log(
    'Position'.padEnd(10) +
    'Rider Name'.padEnd(30) +
    'Team'.padEnd(20) +
    'ARR'.padEnd(6) +
    'Events'.padEnd(8) +
    'Points'.padEnd(8) +
    'Type'
  );
  console.log('-'.repeat(110));

  // Print all riders with their position
  standings.forEach((rider, index) => {
    const position = (index + 1).toString();
    const suffix = getOrdinalSuffix(index + 1);
    const positionDisplay = `${position}${suffix}`;
    const name = rider.name.substring(0, 28);
    const team = (rider.team || 'Independent').substring(0, 18);
    const arr = rider.arr.toString();
    const events = rider.eventsCompleted.toString();
    const points = rider.totalPoints.toString();
    const type = rider.isBot ? 'Bot' : 'Human';

    console.log(
      positionDisplay.padEnd(10) +
      name.padEnd(30) +
      team.padEnd(20) +
      arr.padEnd(6) +
      events.padEnd(8) +
      points.padEnd(8) +
      type
    );
  });

  console.log('-'.repeat(110));
  console.log();
  console.log('================================================================================');
  console.log('SUMMARY BY TYPE');
  console.log('================================================================================');
  console.log();

  const humans = standings.filter(r => !r.isBot);
  const bots = standings.filter(r => r.isBot);

  console.log(`Human Riders (${humans.length}):`);
  console.log('-'.repeat(110));
  humans.forEach(rider => {
    const position = standings.findIndex(r => r.playerId === rider.playerId) + 1;
    const suffix = getOrdinalSuffix(position);
    console.log(
      `  ${position}${suffix}`.padEnd(10) +
      rider.name.padEnd(30) +
      `${rider.totalPoints} points`.padEnd(15) +
      `${rider.eventsCompleted} events`.padEnd(12) +
      (rider.team || 'Independent')
    );
  });

  console.log();
  console.log('================================================================================');
  console.log('REPORT COMPLETE');
  console.log('================================================================================');
}

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

// Run the report
generateReport();
