#!/usr/bin/env node
// build-season-standings.js - Standalone script to build season standings
// Replicates the exact logic from process-json-results.js buildSeasonStandings function
// Works without Firestore - reads from local race_results files only

const fs = require('fs');
const path = require('path');

// Event maximum points lookup (from Career Mode spreadsheet)
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
 * Calculate points for a position in an event
 */
function calculatePoints(position, eventNumber) {
  const maxPoints = EVENT_MAX_POINTS[eventNumber];

  if (!maxPoints) {
    console.warn(`No max points defined for event ${eventNumber}, using 100`);
    return { points: Math.max(0, 100 - (position - 1) * 2), bonusPoints: 0 };
  }

  // Event 3 special case: elimination race
  if (eventNumber === 3) {
    if (position > 20) return { points: 0, bonusPoints: 0 };
    const basePoints = 45 - (position - 1) * (35 / 19);
    let podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;
    return { points: Math.round(basePoints + podiumBonus), bonusPoints: 0 };
  }

  if (position > 40) return { points: 0, bonusPoints: 0 };

  const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
  let podiumBonus = position === 1 ? 5 : position === 2 ? 3 : position === 3 ? 2 : 0;

  return { points: Math.round(basePoints + podiumBonus), bonusPoints: 0 };
}

/**
 * Check if UID is a bot
 */
function isBot(uid, gender) {
  return gender === 'Bot' || !!(uid && uid.startsWith && uid.startsWith('Bot'));
}

/**
 * Seeded random number generator for consistent bot simulation
 */
function getSeededRandom(botName, eventNumber) {
  let hash = 0;
  const seed = `${botName}-${eventNumber}`;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(Math.abs(hash)) * 10000;
  return x - Math.floor(x);
}

/**
 * Simulate a race position for a bot based on their ARR/rating
 */
function simulatePosition(botName, arr, eventNumber, fieldSize = 50) {
  let expectedPosition;
  if (arr >= 1400) {
    expectedPosition = 5;
  } else if (arr >= 1200) {
    expectedPosition = 12;
  } else if (arr >= 1000) {
    expectedPosition = 20;
  } else if (arr >= 800) {
    expectedPosition = 30;
  } else {
    expectedPosition = 40;
  }

  const randomOffset = Math.floor(getSeededRandom(botName, eventNumber) * 20) - 10;
  let simulatedPosition = expectedPosition + randomOffset;
  simulatedPosition = Math.max(1, Math.min(fieldSize, simulatedPosition));

  return simulatedPosition;
}

/**
 * Load all results from local JSON files for all events
 */
function getAllEventResultsFromFiles(season, raceResultsDir) {
  const allEventResults = {};

  for (let eventNum = 1; eventNum <= 15; eventNum++) {
    const eventDir = path.join(raceResultsDir, `season_${season}`, `event_${eventNum}`);

    if (!fs.existsSync(eventDir)) {
      continue;
    }

    const files = fs.readdirSync(eventDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Combine all results from all JSON files for this event
    const eventResults = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(eventDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.results && Array.isArray(data.results)) {
          // Normalize the result format to match process-json-results.js expectations
          const normalizedResults = data.results.map(r => ({
            Position: r.position,
            Name: `${r.firstName} ${r.lastName}`.trim(),
            UID: r.playerId,
            ARR: r.arr || r.rating,
            Team: r.teamName || '',
            Gender: r.isBot ? 'Bot' : (r.gender === '2' ? 'Male' : 'Female'),
            position: r.position,
            name: `${r.firstName} ${r.lastName}`.trim(),
            uid: r.playerId,
            arr: r.arr || r.rating
          }));

          eventResults.push(...normalizedResults);
        }
      } catch (error) {
        console.log(`   Warning: Could not read ${file}:`, error.message);
      }
    }

    if (eventResults.length > 0) {
      allEventResults[eventNum] = eventResults;
    }
  }

  return allEventResults;
}

/**
 * Build season standings for a specific human rider
 * Replicates the exact logic from process-json-results.js buildSeasonStandings
 */
function buildSeasonStandingsForRider(allEventResults, riderUid, riderName, completedEvents) {
  const season = 1;

  console.log(`\n📊 Building standings for ${riderName} (${riderUid})`);
  console.log(`   Rider has completed events: [${completedEvents.join(', ')}]`);

  // Create a map of standings
  const standingsMap = new Map();

  // Calculate rider's correct total points from stored event results
  let riderTotalPoints = 0;
  for (const eventNum of completedEvents) {
    const eventResults = allEventResults[eventNum];
    if (!eventResults) continue;

    const riderResult = eventResults.find(r => r.UID === riderUid || r.uid === riderUid);
    if (riderResult) {
      const position = parseInt(riderResult.Position || riderResult.position);
      if (!isNaN(position) && riderResult.Position !== 'DNF' && riderResult.position !== 'DNF') {
        const pointsResult = calculatePoints(position, eventNum);
        riderTotalPoints += pointsResult.points;
      }
    }
  }

  console.log(`   Rider's total points: ${riderTotalPoints}`);

  // Add the rider to standings
  standingsMap.set(riderUid, {
    name: riderName,
    uid: riderUid,
    arr: 0, // Will be updated from results
    team: '',
    events: completedEvents.length,
    points: riderTotalPoints,
    isBot: false,
    isCurrentUser: true
  });

  // Process all racers from all events rider has completed
  for (const eventNum of completedEvents) {
    const eventResults = allEventResults[eventNum];
    if (!eventResults) continue;

    eventResults.forEach(result => {
      const uid = result.UID || result.uid || null;
      const name = result.Name || result.name;
      const position = parseInt(result.Position || result.position);

      if (result.Position === 'DNF' || result.position === 'DNF' || isNaN(position)) {
        return;
      }

      const pointsResult = calculatePoints(position, eventNum);
      let points = pointsResult.points;
      const arr = parseInt(result.ARR || result.arr) || 0;
      const team = result.Team || result.team || '';
      const isBotRacer = isBot(uid, result.Gender);
      const isRider = uid === riderUid;

      // Skip the rider - we've already calculated their points correctly
      if (isRider) {
        const racer = standingsMap.get(riderUid);
        racer.arr = arr;
        racer.team = team;
        return;
      }

      const key = isBotRacer ? name : uid;

      if (standingsMap.has(key)) {
        const racer = standingsMap.get(key);
        racer.points = (racer.points || 0) + points;
        racer.events = (racer.events || 0) + 1;
        racer.arr = arr;
        racer.team = team || racer.team;
        if (!racer.uid) {
          racer.uid = uid;
        }
      } else {
        standingsMap.set(key, {
          name: name,
          uid: uid,
          arr: arr,
          team: team,
          events: 1,
          points: points,
          isBot: isBotRacer,
          isCurrentUser: false
        });
      }
    });
  }

  // Backfill bots with simulated results
  console.log('   Backfilling bot results...');

  const allBots = new Map();

  // Find all unique bots across all events
  for (const [eventNum, eventResults] of Object.entries(allEventResults)) {
    eventResults.forEach(result => {
      const isBotRacer = isBot(result.UID || result.uid, result.Gender);
      if (isBotRacer && result.Position !== 'DNF' && result.position !== 'DNF') {
        const botName = result.Name || result.name;
        const botUid = result.UID || result.uid;
        const arr = parseInt(result.ARR || result.arr) || 900;

        if (!allBots.has(botName)) {
          allBots.set(botName, {
            name: botName,
            uid: botUid,
            arr: arr,
            actualEvents: new Set()
          });
        }
        allBots.get(botName).actualEvents.add(parseInt(eventNum));
        allBots.get(botName).arr = arr;
        allBots.get(botName).uid = botUid;
      }
    });
  }

  console.log(`   Found ${allBots.size} unique bots across all events`);

  // Simulate bot results for events they didn't participate in
  for (const [botName, botInfo] of allBots.entries()) {
    if (!standingsMap.has(botName)) {
      standingsMap.set(botName, {
        name: botName,
        uid: botInfo.uid || null,
        arr: botInfo.arr,
        team: '',
        events: 0,
        points: 0,
        isBot: true,
        isCurrentUser: false
      });
    }

    const botStanding = standingsMap.get(botName);
    if (!botStanding.uid && botInfo.uid) {
      botStanding.uid = botInfo.uid;
    }

    // Recalculate bot points for all rider's completed events
    botStanding.points = 0;
    let simulatedEvents = 0;

    for (const eventNum of completedEvents) {
      if (botInfo.actualEvents.has(eventNum)) {
        // Bot actually raced - use real result
        const eventResults = allEventResults[eventNum] || [];
        const botResult = eventResults.find(r => (r.Name || r.name) === botName);
        if (botResult) {
          const position = parseInt(botResult.Position || botResult.position);
          if (!isNaN(position) && (botResult.Position !== 'DNF' && botResult.position !== 'DNF')) {
            const pointsResult = calculatePoints(position, eventNum);
            botStanding.points += pointsResult.points;
          }
        }
      } else {
        // Bot didn't race - simulate result
        const simulatedPosition = simulatePosition(botName, botInfo.arr, eventNum);
        const points = calculatePoints(simulatedPosition, eventNum).points;
        botStanding.points += points;
        simulatedEvents++;
      }
    }

    botStanding.events = completedEvents.length;
    botStanding.simulatedEvents = simulatedEvents;
  }

  // Ensure all bots have correct events count
  for (const [key, racer] of standingsMap.entries()) {
    if (racer.isBot) {
      racer.events = completedEvents.length;
    }
  }

  console.log(`   Simulated results for ${allBots.size} bots`);

  // Convert to array and sort by points
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => b.points - a.points);

  // Limit to 80 bots, stratified by points (quintile stratification)
  const MAX_BOTS = 80;
  const QUINTILES = 5;
  const BOTS_PER_QUINTILE = MAX_BOTS / QUINTILES;

  const humans = standings.filter(r => !r.isBot);
  const bots = standings.filter(r => r.isBot);

  let finalStandings;

  if (bots.length <= MAX_BOTS) {
    finalStandings = standings;
  } else {
    console.log(`   Limiting bots from ${bots.length} to ${MAX_BOTS} with quintile stratification`);
    const quintileSize = Math.ceil(bots.length / QUINTILES);
    const selectedBots = [];

    for (let q = 0; q < QUINTILES; q++) {
      const start = q * quintileSize;
      const end = Math.min(start + quintileSize, bots.length);
      const quintileBots = bots.slice(start, end);
      const selected = quintileBots.slice(0, BOTS_PER_QUINTILE);
      selectedBots.push(...selected);
    }

    finalStandings = [...humans, ...selectedBots];
    finalStandings.sort((a, b) => b.points - a.points);
  }

  // Find rider's position in final standings
  const riderPosition = finalStandings.findIndex(r => r.uid === riderUid) + 1;

  return {
    standings: finalStandings,
    riderPosition: riderPosition,
    riderName: riderName,
    riderEvents: completedEvents.length,
    riderPoints: riderTotalPoints
  };
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  const n = Math.round(num);
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Main function to build standings for all human riders
 */
function main() {
  const season = 1;
  const raceResultsDir = path.join(__dirname, 'race_results');

  console.log('🏁 Building Season Standings from Local Files');
  console.log('============================================\n');

  // Load all event results from files
  console.log('📂 Loading all event results from files...');
  const allEventResults = getAllEventResultsFromFiles(season, raceResultsDir);

  const eventsFound = Object.keys(allEventResults).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`✅ Loaded results for events: [${eventsFound.join(', ')}]\n`);

  // Find all unique human riders across all events
  const humanRiders = new Map();

  for (const [eventNum, eventResults] of Object.entries(allEventResults)) {
    eventResults.forEach(result => {
      const uid = result.UID || result.uid;
      const name = result.Name || result.name;
      const isBotRacer = isBot(uid, result.Gender);

      if (!isBotRacer && uid) {
        if (!humanRiders.has(uid)) {
          humanRiders.set(uid, {
            uid: uid,
            name: name,
            completedEvents: []
          });
        }

        const eventNumInt = parseInt(eventNum);
        if (!humanRiders.get(uid).completedEvents.includes(eventNumInt)) {
          humanRiders.get(uid).completedEvents.push(eventNumInt);
        }
      }
    });
  }

  console.log(`👥 Found ${humanRiders.size} unique human riders\n`);

  // Build standings for each human rider
  const allRiderStandings = [];

  for (const [uid, riderInfo] of humanRiders.entries()) {
    riderInfo.completedEvents.sort((a, b) => a - b);

    const result = buildSeasonStandingsForRider(
      allEventResults,
      uid,
      riderInfo.name,
      riderInfo.completedEvents
    );

    allRiderStandings.push({
      name: result.riderName,
      events: result.riderEvents,
      position: result.riderPosition,
      points: result.riderPoints
    });

    console.log(`   ✅ ${result.riderName}: ${result.riderEvents} races, ${result.riderPosition}${getOrdinalSuffix(result.riderPosition)} place (${result.riderPoints} pts)`);
  }

  // Sort by position and display final results
  console.log('\n\n📋 FINAL STANDINGS SUMMARY');
  console.log('==========================\n');

  allRiderStandings.sort((a, b) => a.position - b.position);

  allRiderStandings.forEach(rider => {
    console.log(`${rider.name}, ${rider.events} race${rider.events !== 1 ? 's' : ''}, ${rider.position}${getOrdinalSuffix(rider.position)} place`);
  });

  console.log('\n✅ Done!\n');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { buildSeasonStandingsForRider, getAllEventResultsFromFiles };
