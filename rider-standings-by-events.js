#!/usr/bin/env node

/**
 * Generate Rider Position Report - By Events Completed
 * Shows each human rider's position within their respective event count group
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

  // Convert to array
  const allRiders = Array.from(riderMap.values());

  return allRiders;
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

/**
 * Generate the report
 */
function generateReport() {
  console.log('================================================================================');
  console.log('SEASON 1 - HUMAN RIDER STANDINGS BY EVENTS COMPLETED');
  console.log('Each rider\'s position within their respective event count group');
  console.log('================================================================================');
  console.log();

  const allRiders = buildStandings();

  // Filter to only humans
  const humanRiders = allRiders.filter(r => !r.isBot);

  console.log(`Total Human Riders: ${humanRiders.length}`);
  console.log();

  // Group riders by number of events completed
  const ridersByEventCount = new Map();

  for (const rider of allRiders) {
    const eventCount = rider.eventsCompleted;
    if (!ridersByEventCount.has(eventCount)) {
      ridersByEventCount.set(eventCount, []);
    }
    ridersByEventCount.get(eventCount).push(rider);
  }

  // Sort each group by total points
  for (const [eventCount, riders] of ridersByEventCount.entries()) {
    riders.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Print header
  console.log('-'.repeat(100));
  console.log(
    'Rider Name'.padEnd(35) +
    'Team'.padEnd(25) +
    'Races'.padEnd(8) +
    'Points'.padEnd(10) +
    'Position'
  );
  console.log('-'.repeat(100));

  // Print each human rider with their position in their event count group
  humanRiders
    .sort((a, b) => {
      // Sort by points descending
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.name.localeCompare(b.name);
    })
    .forEach(rider => {
      const eventCount = rider.eventsCompleted;
      const groupRiders = ridersByEventCount.get(eventCount);
      const position = groupRiders.findIndex(r => r.playerId === rider.playerId) + 1;
      const totalInGroup = groupRiders.length;
      const suffix = getOrdinalSuffix(position);

      const name = rider.name.substring(0, 33);
      const team = (rider.team || 'Independent').substring(0, 23);
      const races = rider.eventsCompleted.toString();
      const points = rider.totalPoints.toString();
      const positionDisplay = `${position}${suffix} of ${totalInGroup}`;

      console.log(
        name.padEnd(35) +
        team.padEnd(25) +
        races.padEnd(8) +
        points.padEnd(10) +
        positionDisplay
      );
    });

  console.log('-'.repeat(100));
  console.log();

  // Print summary by event count
  console.log('================================================================================');
  console.log('SUMMARY BY EVENTS COMPLETED');
  console.log('================================================================================');
  console.log();

  const eventCounts = Array.from(ridersByEventCount.keys()).sort((a, b) => b - a);

  for (const eventCount of eventCounts) {
    const groupRiders = ridersByEventCount.get(eventCount);
    const humanInGroup = groupRiders.filter(r => !r.isBot);

    if (humanInGroup.length === 0) continue;

    console.log(`\n${eventCount} Event${eventCount !== 1 ? 's' : ''} Completed - ${humanInGroup.length} human rider${humanInGroup.length !== 1 ? 's' : ''} (out of ${groupRiders.length} total):`);
    console.log('-'.repeat(100));

    humanInGroup.forEach(rider => {
      const position = groupRiders.findIndex(r => r.playerId === rider.playerId) + 1;
      const suffix = getOrdinalSuffix(position);

      console.log(
        `  ${position}${suffix}`.padEnd(8) +
        rider.name.padEnd(35) +
        `${rider.totalPoints} points`.padEnd(15) +
        (rider.team || 'Independent')
      );
    });
  }

  console.log('\n');
  console.log('================================================================================');
  console.log('REPORT COMPLETE');
  console.log('================================================================================');
}

// Run the report
generateReport();
