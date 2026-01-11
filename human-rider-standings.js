#!/usr/bin/env node

/**
 * Generate Season Standings Position Report for Human Riders
 * Shows each human rider's overall position in Season 1 standings
 */

const fs = require('fs');
const path = require('path');

// Event max points configuration
const EVENT_MAX_POINTS = {
  1: 65, 2: 95, 3: 50, 4: 50, 5: 80, 6: 50, 7: 70, 8: 185,
  9: 85, 10: 70, 11: 60, 12: 145, 13: 120, 14: 95, 15: 135, 102: 40
};

function calculatePoints(position, eventNumber) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber];
  if (!maxPoints) return Math.max(0, 100 - (position - 1) * 2);

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

function readEventResults(eventDir) {
  const results = [];
  if (!fs.existsSync(eventDir)) return results;

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

function buildStandings() {
  const riderMap = new Map();
  const resultsDir = path.join(__dirname, 'race_results', 'season_1');

  const eventDirs = fs.readdirSync(resultsDir)
    .filter(dir => dir.startsWith('event_'))
    .map(dir => ({
      dir: path.join(resultsDir, dir),
      eventNum: parseInt(dir.replace('event_', ''))
    }))
    .sort((a, b) => a.eventNum - b.eventNum);

  for (const { dir, eventNum } of eventDirs) {
    const results = readEventResults(dir);
    if (results.length === 0) continue;

    const uniqueRiders = new Set();
    for (const result of results) {
      const position = result.position;
      if (position === 'DNF' || typeof position !== 'number') continue;

      const playerId = result.playerId;
      const name = `${result.firstName} ${result.lastName}`.trim();
      const team = result.teamName || '';
      const isBot = result.isBot || false;
      const points = calculatePoints(position, eventNum);

      if (!riderMap.has(playerId)) {
        riderMap.set(playerId, {
          playerId, name, team, isBot,
          totalPoints: 0,
          eventsCompleted: 0
        });
      }

      const rider = riderMap.get(playerId);
      if (!uniqueRiders.has(playerId)) {
        uniqueRiders.add(playerId);
        rider.totalPoints += points;
        rider.eventsCompleted++;
        if (team) rider.team = team;
      }
    }
  }

  const standings = Array.from(riderMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.eventsCompleted - b.eventsCompleted;
  });

  return standings;
}

function getOrdinalSuffix(num) {
  const j = num % 10, k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function generateReport() {
  console.log('='.repeat(80));
  console.log('SEASON 1 - HUMAN RIDER STANDINGS POSITIONS');
  console.log('Each rider\'s overall position in the Season 1 standings');
  console.log('='.repeat(80));
  console.log();

  const standings = buildStandings();
  const humanRiders = standings.filter(r => !r.isBot);

  console.log(`Total Human Riders: ${humanRiders.length}\n`);

  humanRiders.forEach(rider => {
    const position = standings.findIndex(r => r.playerId === rider.playerId) + 1;
    const suffix = getOrdinalSuffix(position);
    const races = rider.eventsCompleted === 1 ? '1 race' : `${rider.eventsCompleted} races`;

    console.log(`${rider.name}, ${races}, ${position}${suffix} place`);
  });

  console.log();
  console.log('='.repeat(80));
}

generateReport();
