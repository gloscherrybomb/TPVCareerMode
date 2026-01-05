// Awards Calculation Helpers for TPV Career Mode
// Functions to calculate whether awards have been earned

/**
 * Check if Domination award earned (win by more than 60 seconds)
 * @param {number} position - finishing position
 * @param {number} winnerTime - winner's time in seconds
 * @param {number} secondPlaceTime - 2nd place time in seconds
 * @returns {boolean}
 */
function checkDomination(position, winnerTime, secondPlaceTime) {
  if (position !== 1) return false;
  if (!winnerTime || !secondPlaceTime) return false;
  
  const margin = secondPlaceTime - winnerTime;
  return margin > 60; // More than 60 seconds
}

/**
 * Check if Close Call award earned (win by less than 0.5 seconds)
 * @param {number} position - finishing position
 * @param {number} winnerTime - winner's time in seconds
 * @param {number} secondPlaceTime - 2nd place time in seconds
 * @returns {boolean}
 */
function checkCloseCall(position, winnerTime, secondPlaceTime) {
  if (position !== 1) return false;
  if (!winnerTime || !secondPlaceTime) return false;
  
  const margin = secondPlaceTime - winnerTime;
  return margin < 0.5 && margin > 0; // Less than 0.5 seconds
}

/**
 * Check if Photo Finish award earned (finish within 0.2s of winner)
 * Can be earned by anyone finishing within 0.2s of the winner, INCLUDING the winner
 * if they win by less than 0.2s from 2nd place
 * @param {number} position - finishing position
 * @param {number} userTime - user's time in seconds
 * @param {number} winnerTime - winner's time in seconds
 * @param {number} secondPlaceTime - 2nd place time in seconds (for when user is winner)
 * @returns {boolean}
 */
function checkPhotoFinish(position, userTime, winnerTime, secondPlaceTime) {
  if (!userTime) return false;
  
  // If user is the winner, check margin to 2nd place
  if (position === 1) {
    if (!secondPlaceTime) return false;
    const margin = secondPlaceTime - userTime;
    return margin <= 0.2; // Won by 0.2s or less
  }
  
  // If user is not the winner, check margin to winner
  if (!winnerTime) return false;
  const margin = userTime - winnerTime;
  return margin <= 0.2; // Within 0.2 seconds of winner
}

/**
 * Check if Dark Horse award earned (win when predicted 15th or worse)
 * @param {number} position - finishing position
 * @param {number} predictedPosition - predicted finishing position
 * @returns {boolean}
 */
function checkDarkHorse(position, predictedPosition) {
  if (position !== 1) return false;
  if (!predictedPosition) return false;
  
  return predictedPosition >= 15;
}

/**
 * Check if Zero to Hero award earned (bottom 20% one event, top 20% next)
 * This requires checking two consecutive events
 * @param {Object} prevEvent - previous event result {position, totalFinishers}
 * @param {Object} currentEvent - current event result {position, totalFinishers}
 * @returns {boolean}
 */
function checkZeroToHero(prevEvent, currentEvent) {
  if (!prevEvent || !currentEvent) return false;
  if (!prevEvent.position || !prevEvent.totalFinishers) return false;
  if (!currentEvent.position || !currentEvent.totalFinishers) return false;
  
  // Calculate percentiles
  const prevPercentile = (prevEvent.position / prevEvent.totalFinishers) * 100;
  const currentPercentile = (currentEvent.position / currentEvent.totalFinishers) * 100;
  
  // Bottom 20% = 80-100th percentile, Top 20% = 0-20th percentile
  const wasBottomTwenty = prevPercentile >= 80;
  const isTopTwenty = currentPercentile <= 20;
  
  return wasBottomTwenty && isTopTwenty;
}

/**
 * Calculate career-based awards from all event results
 * @param {Array} allEventResults - array of all event results for the user
 * @returns {Object} - awards earned { awardId: count }
 */
function calculateCareerAwards(allEventResults) {
  const awards = {
    overrated: 0,
    backToBack: 0,
    weekendWarrior: 0,
    zeroToHero: 0,
    trophyCollector: 0,
    technicalIssues: 0
  };
  
  // Track various stats
  let worseThanPredicted = 0;
  let podiumCount = 0;
  let dnfCount = 0;
  let consecutiveWins = 0;
  let weekendEvents = 0;
  let lastWasWin = false;

  // Sort events by completion timestamp to check consecutive results in completion order
  // Prefer raceDate (actual race date) over processedAt (when result was processed)
  const sortedEvents = [...allEventResults].sort((a, b) => {
    const aDate = a.raceDate || a.processedAt || a.completedAt;
    const bDate = b.raceDate || b.processedAt || b.completedAt;
    const aTime = aDate ? (aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime()) : 0;
    const bTime = bDate ? (bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime()) : 0;
    return aTime - bTime; // Ascending - oldest first for consecutive award calculation
  });
  
  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    
    // Overrated: worse than predicted
    if (event.predictedPosition && event.position > event.predictedPosition) {
      worseThanPredicted++;
    }
    
    // Podium count
    if (event.position >= 1 && event.position <= 3) {
      podiumCount++;
    }
    
    // DNF count
    if (event.position === 'DNF' || event.position === 0) {
      dnfCount++;
    }
    
    // Back to Back wins
    if (event.position === 1) {
      if (lastWasWin) {
        consecutiveWins++;
        if (consecutiveWins === 1) {
          awards.backToBack++;
        }
      } else {
        consecutiveWins = 0;
      }
      lastWasWin = true;
    } else {
      consecutiveWins = 0;
      lastWasWin = false;
    }
    
    // Weekend Warrior (if event has timestamp, check if Saturday/Sunday)
    if (event.processedAt || event.completedAt) {
      const date = new Date(event.processedAt || event.completedAt);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
        weekendEvents++;
      }
    }
    
    // Zero to Hero (check with previous event)
    if (i > 0) {
      const prevEvent = sortedEvents[i - 1];
      if (checkZeroToHero(
        { position: prevEvent.position, totalFinishers: prevEvent.totalFinishers },
        { position: event.position, totalFinishers: event.totalFinishers }
      )) {
        awards.zeroToHero++;
      }
    }
  }
  
  // Award thresholds
  if (worseThanPredicted >= 5) {
    awards.overrated = 1;
  }
  
  if (weekendEvents >= 5) {
    awards.weekendWarrior = 1;
  }
  
  if (podiumCount >= 5) {
    awards.trophyCollector = 1;
  }
  
  if (dnfCount >= 3) {
    awards.technicalIssues = 1;
  }
  
  return awards;
}

/**
 * Get times for award calculations from results array
 * @param {Array} results - all results from an event
 * @param {number} position - user's position
 * @returns {Object} - {winnerTime, secondPlaceTime, userTime}
 */
function getTimesFromResults(results, position) {
  // Sort by position
  const sortedResults = results
    .filter(r => r.position && r.position !== 'DNF' && !isNaN(parseInt(r.position)))
    .sort((a, b) => parseInt(a.position) - parseInt(b.position));
  
  const winnerTime = sortedResults[0]?.time || null;
  const secondPlaceTime = sortedResults[1]?.time || null;
  const userResult = sortedResults.find(r => parseInt(r.position) === position);
  const userTime = userResult?.time || null;
  
  return { winnerTime, secondPlaceTime, userTime };
}

/**
 * Check if Wind Tunnel award earned (top 5 in time trial when predicted outside top 5)
 * @param {number} position - finishing position
 * @param {number} predictedPosition - predicted finishing position
 * @param {string} eventType - event type from EVENT_TYPES
 * @returns {boolean}
 */
function checkWindTunnel(position, predictedPosition, eventType) {
  // Must be a time trial (not hill climb or other event types)
  if (eventType !== 'time trial') return false;
  // Must finish top 5
  if (position > 5) return false;
  // Must have been predicted outside top 5
  if (!predictedPosition || predictedPosition <= 5) return false;
  return true;
}

/**
 * Check if The Accountant award earned (more points than the rider who crossed the line first)
 * In a points race, Position is determined by accumulated points, but this award compares
 * the user's points against the rider who physically crossed the finish line first (fastest time)
 * @param {number} userTime - user's finish time
 * @param {number} userEventPoints - user's event points from Points column
 * @param {Array} results - all results from the event
 * @returns {boolean}
 */
function checkTheAccountant(userTime, userEventPoints, results) {
  // Must have event points
  if (!userEventPoints) return false;

  // Find the rider who crossed the finish line first (fastest time)
  const finishers = results
    .filter(r => r.Position !== 'DNF' && parseFloat(r.Time) > 0)
    .sort((a, b) => parseFloat(a.Time) - parseFloat(b.Time));

  if (finishers.length === 0) return false;

  const firstAcrossLine = finishers[0];
  const firstAcrossLineTime = parseFloat(firstAcrossLine.Time);
  const firstAcrossLinePoints = parseInt(firstAcrossLine.Points) || 0;

  // User must not be the rider who crossed first (otherwise nothing special)
  if (userTime === firstAcrossLineTime) return false;

  // User must have more points than the rider who crossed first
  return userEventPoints > firstAcrossLinePoints;
}

// ================== POWER AWARD CHECKS ==================

/**
 * Check if Power Surge award earned (max power 30%+ above avg, top 10)
 * @param {number} position - finishing position
 * @param {Object} userResult - user's result with power data
 * @returns {boolean}
 */
function checkPowerSurge(position, userResult) {
  if (position > 10) return false;
  if (!userResult.AvgPower || !userResult.MaxPower) return false;
  return (parseFloat(userResult.MaxPower) / parseFloat(userResult.AvgPower)) >= 1.3;
}

/**
 * Check if Steady Eddie award earned (NP within 1% of avg power)
 * @param {Object} userResult - user's result with power data
 * @returns {boolean}
 */
function checkSteadyEddie(userResult) {
  if (!userResult.AvgPower || !userResult.NrmPower) return false;
  const percentDiff = Math.abs(userResult.NrmPower - userResult.AvgPower) / userResult.AvgPower * 100;
  return percentDiff <= 1;
}

/**
 * Check if Blast Off award earned (1300W+ max power, one-time)
 * @param {Object} userResult - user's result with power data
 * @param {boolean} hasAlreadyEarned - whether user has already earned this award
 * @returns {boolean}
 */
function checkBlastOff(userResult, hasAlreadyEarned) {
  if (hasAlreadyEarned) return false;
  if (!userResult.MaxPower) return false;
  return parseFloat(userResult.MaxPower) >= 1300;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkDomination,
    checkCloseCall,
    checkPhotoFinish,
    checkDarkHorse,
    checkZeroToHero,
    calculateCareerAwards,
    getTimesFromResults,
    checkWindTunnel,
    checkTheAccountant,
    checkPowerSurge,
    checkSteadyEddie,
    checkBlastOff
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.awardsCalculation = {
    checkDomination,
    checkCloseCall,
    checkPhotoFinish,
    checkDarkHorse,
    checkZeroToHero,
    calculateCareerAwards,
    getTimesFromResults,
    checkWindTunnel,
    checkTheAccountant,
    checkPowerSurge,
    checkSteadyEddie,
    checkBlastOff
  };
}
