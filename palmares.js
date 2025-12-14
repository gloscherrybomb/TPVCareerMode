// Palmares Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { formatTime, getOrdinalSuffix, formatDate } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getPersonaLabel } from './interview-engine.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;
let allResults = [];
let filteredResults = [];
let currentSort = { column: 'date', direction: 'desc' };
let interviewHistory = [];

// Personality chart state
let chartDataPoints = [];
let visibleTraits = {
    confidence: true,
    humility: true,
    aggression: true,
    professionalism: true,
    showmanship: true,
    resilience: true
};
let hoveredEventIndex = null;
let clickedEventIndex = null;

// Event sequence for mapping event numbers to stage numbers
// Total: 11 stages (Stage 9 has 3 sub-stages for the Local Tour)
const EVENT_SEQUENCE = [
    { stage: 1, eventId: 1 },
    { stage: 2, eventId: 2 },
    { stage: 3, eventId: null }, // choice
    { stage: 4, eventId: 3 },
    { stage: 5, eventId: 4 },
    { stage: 6, eventId: null }, // choice
    { stage: 7, eventId: 5 },
    { stage: 8, eventId: null }, // choice
    { stage: 9, eventId: 13 },  // Local Tour Stage 1
    { stage: 10, eventId: 14 }, // Local Tour Stage 2
    { stage: 11, eventId: 15 }  // Local Tour Stage 3
];

// Event metadata
const EVENT_DATA = {
    1: { name: "Coast and Roast Crit", type: "criterium" },
    2: { name: "Island Classic", type: "road race" },
    3: { name: "The Forest Velodrome Elimination", type: "track elimination" },
    4: { name: "Coastal Loop Time Challenge", type: "time trial" },
    5: { name: "North Lake Points Race", type: "points race" },
    6: { name: "Easy Hill Climb", type: "hill climb" },
    7: { name: "Flat Eight Criterium", type: "criterium" },
    8: { name: "The Grand Gilbert Fondo", type: "gran fondo" },
    9: { name: "Base Camp Classic", type: "road race" },
    10: { name: "Beach and Pine TT", type: "time trial" },
    11: { name: "South Lake Points Race", type: "points race" },
    12: { name: "Unbound - Little Egypt", type: "gravel race" },
    13: { name: "Local Tour Stage 1", type: "stage race" },
    14: { name: "Local Tour Stage 2", type: "stage race" },
    15: { name: "Local Tour Stage 3", type: "stage race" }
};

// Award display names with icons
const AWARD_NAMES = {
    gold: { name: "Gold Medal (1st)", icon: "🥇" },
    silver: { name: "Silver Medal (2nd)", icon: "🥈" },
    bronze: { name: "Bronze Medal (3rd)", icon: "🥉" },
    punchingMedal: { name: "Punching Above Weight", icon: "🥊" },
    giantKiller: { name: "Giant Killer", icon: "⚔️" },
    bullseye: { name: "Bullseye", icon: "🎯" },
    hotStreak: { name: "Hot Streak", icon: "🔥" },
    domination: { name: "Domination", icon: "👑" },
    closeCall: { name: "Close Call", icon: "😰" },
    photoFinish: { name: "Photo Finish", icon: "📸" },
    darkHorse: { name: "Dark Horse", icon: "🐴" },
    zeroToHero: { name: "Zero to Hero", icon: "🦸" },
    gcGold: { name: "GC Gold Trophy", icon: "🏆" },
    gcSilver: { name: "GC Silver Trophy", icon: "🥈" },
    gcBronze: { name: "GC Bronze Trophy", icon: "🥉" },
    gluttonForPunishment: { name: "Glutton for Punishment", icon: "🎖️" }
};

// Helper function to get stage number for an event
// Returns null for choice events (6-12) which don't have a fixed stage display
function getStageForEvent(eventNum) {
    const stageMapping = {
        1: 1,   // Stage 1: Event 1 (fixed)
        2: 2,   // Stage 2: Event 2 (fixed)
        3: 4,   // Stage 4: Event 3 (fixed)
        4: 5,   // Stage 5: Event 4 (fixed)
        5: 7,   // Stage 7: Event 5 (fixed)
        13: 9,  // Stage 9: Event 13 (tour)
        14: 9,  // Stage 9: Event 14 (tour)
        15: 9   // Stage 9: Event 15 (tour)
    };

    return stageMapping[eventNum] || null; // Events 6-12 return null (choice events)
}

// Helper function to check if an event is a choice event (stages 3, 6, or 8)
function isChoiceEvent(eventNum) {
    return eventNum >= 6 && eventNum <= 12;
}

// Show/hide sections
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('palmaresContent').style.display = 'none';
}

function showLoginPrompt() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
    document.getElementById('palmaresContent').style.display = 'none';
}

function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('palmaresContent').style.display = 'block';
}

// Fetch interview history for personality chart
async function fetchInterviewHistory(userId) {
    try {
        const interviewsRef = collection(db, 'interviews');
        const q = query(
            interviewsRef,
            where('userId', '==', userId),
            orderBy('eventNumber', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const interviews = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            interviews.push({
                eventNumber: data.eventNumber,
                personalityAfter: data.personalityAfter,
                timestamp: data.timestamp
            });
        });

        return interviews;
    } catch (error) {
        console.error('Error fetching interview history:', error);
        return [];
    }
}

// Load and display palmares
async function loadPalmares(user) {
    showLoadingState();

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            showLoginPrompt();
            return;
        }

        userData = userDoc.data();

        // Fetch interview history for personality chart
        interviewHistory = await fetchInterviewHistory(userData.uid);

        // Collect all event results
        allResults = [];
        for (let i = 1; i <= 15; i++) {
            const eventResults = userData[`event${i}Results`];
            if (eventResults) {
                allResults.push({
                    eventNum: i,
                    eventName: EVENT_DATA[i]?.name || `Event ${i}`,
                    eventType: EVENT_DATA[i]?.type || 'unknown',
                    position: eventResults.position,
                    time: eventResults.time,
                    arr: eventResults.arr,
                    predictedPosition: eventResults.predictedPosition,
                    points: eventResults.points || 0,
                    bonusPoints: eventResults.bonusPoints || 0,
                    earnedCadenceCredits: eventResults.earnedCadenceCredits || 0,
                    earnedPunchingMedal: eventResults.earnedPunchingMedal,
                    earnedGiantKillerMedal: eventResults.earnedGiantKillerMedal,
                    earnedBullseyeMedal: eventResults.earnedBullseyeMedal,
                    earnedHotStreakMedal: eventResults.earnedHotStreakMedal,
                    earnedDomination: eventResults.earnedDomination,
                    earnedCloseCall: eventResults.earnedCloseCall,
                    earnedPhotoFinish: eventResults.earnedPhotoFinish,
                    earnedDarkHorse: eventResults.earnedDarkHorse,
                    earnedZeroToHero: eventResults.earnedZeroToHero,
                    processedAt: eventResults.processedAt
                });
            }
        }

        // Display all sections
        displayHeader();
        displayKeyStats();
        displayKeyAchievements();

        // Apply default filter and display results
        filteredResults = [...allResults];
        applySort();
        displayResultsTable();

        displayDetailedStats();
        displayAwardsTable();
        displayPersonalityTimeline();
        displayRivalsTable();

        showContent();
    } catch (error) {
        console.error('Error loading palmares:', error);
        showLoginPrompt();
    }
}

// Display header
function displayHeader() {
    document.getElementById('riderName').textContent = userData.name || 'Unknown Rider';
    document.getElementById('riderTeam').textContent = userData.team || 'No Team';
    document.getElementById('riderARR').textContent = userData.arr || '—';
    document.getElementById('currentSeason').textContent = '1';
    document.getElementById('totalEvents').textContent = allResults.length;

    // Set photo if available
    if (userData.photoURL) {
        const photo = document.getElementById('riderPhoto');
        photo.src = userData.photoURL;
        photo.style.display = 'block';
    }
}

// Display key stats bar
function displayKeyStats() {
    const dnfCount = allResults.filter(r => r.position === 'DNF').length;
    const completedResults = allResults.filter(r => r.position !== 'DNF');

    document.getElementById('statRaces').textContent = allResults.length;
    document.getElementById('statWins').textContent = userData.totalWins || 0;
    document.getElementById('statPodiums').textContent = userData.totalPodiums || 0;
    document.getElementById('statTop10').textContent = userData.totalTop10s || 0;
    document.getElementById('statDNF').textContent = dnfCount;
    document.getElementById('statAvg').textContent = Math.round(userData.averageFinish) || '0';
    document.getElementById('statPoints').textContent = userData.totalPoints || 0;
    document.getElementById('statCadenceCoins').textContent = userData.currency?.totalEarned || 0;
    document.getElementById('statARR').textContent = userData.arr || 0;
}

// Display key achievements
function displayKeyAchievements() {
    const lifetime = userData.lifetimeStats || {};

    // Best vs Expected
    const bestPred = lifetime.bestVsPrediction;
    if (bestPred) {
        document.querySelector('#achievementBestPred .achievement-text').innerHTML =
            `Best vs Expected: <strong>+${bestPred.difference} places</strong> (${bestPred.eventName})`;
    } else {
        document.querySelector('#achievementBestPred .achievement-text').innerHTML =
            `Best vs Expected: <strong>—</strong>`;
    }

    // Biggest Win
    const bigWin = lifetime.biggestWin;
    if (bigWin) {
        document.querySelector('#achievementBiggestWin .achievement-text').innerHTML =
            `Biggest Win: <strong>${formatTime(bigWin.marginSeconds)} margin</strong> (${bigWin.eventName})`;
    } else {
        document.querySelector('#achievementBiggestWin .achievement-text').innerHTML =
            `Biggest Win: <strong>—</strong>`;
    }

    // Highest ARR
    const highARR = lifetime.highestARR;
    if (highARR) {
        document.querySelector('#achievementHighestARR .achievement-text').innerHTML =
            `Highest ARR: <strong>${highARR.value}</strong> (${highARR.eventName})`;
    } else {
        document.querySelector('#achievementHighestARR .achievement-text').innerHTML =
            `Highest ARR: <strong>—</strong>`;
    }

    // Biggest Giant Beaten
    const giant = lifetime.biggestGiantBeaten;
    if (giant) {
        document.querySelector('#achievementBiggestGiant .achievement-text').innerHTML =
            `Biggest Giant Beaten: <strong>Beat ARR ${giant.opponentARR}</strong> (${giant.opponentName})`;
    } else {
        document.querySelector('#achievementBiggestGiant .achievement-text').innerHTML =
            `Biggest Giant Beaten: <strong>—</strong>`;
    }
}

// Display results table
function displayResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    filteredResults.forEach(result => {
        const row = document.createElement('tr');

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = result.processedAt ? formatDate(result.processedAt.toDate?.() || result.processedAt) : '—';
        row.appendChild(dateCell);

        // Event (clickable)
        const eventCell = document.createElement('td');
        const eventLink = document.createElement('a');
        eventLink.href = `event-results.html?id=${result.eventNum}`;
        eventLink.className = 'event-link';
        eventLink.textContent = result.eventName;
        eventCell.appendChild(eventLink);
        row.appendChild(eventCell);

        // Season
        const seasonCell = document.createElement('td');
        const isChoice = isChoiceEvent(result.eventNum);
        if (isChoice) {
            seasonCell.textContent = '1';
            seasonCell.className = 'choice-event-marker';
        } else {
            seasonCell.textContent = '1'; // Currently all events are in Season 1
        }
        row.appendChild(seasonCell);

        // Stage
        const stageCell = document.createElement('td');
        const stageNum = getStageForEvent(result.eventNum);
        if (stageNum !== null) {
            stageCell.textContent = stageNum;
        } else {
            // Choice events show "Choice" instead of a stage number
            stageCell.textContent = 'Choice';
            stageCell.className = 'choice-event-marker';
        }
        row.appendChild(stageCell);

        // Mark the entire row as choice event if applicable
        if (isChoice) {
            row.classList.add('choice-event-row');
        }

        // Position
        const posCell = document.createElement('td');
        const pos = result.position;
        let posClass = 'pos-cell';
        let posText = '';

        if (pos === 'DNF') {
            posClass += ' pos-dnf';
            posText = 'DNF';
        } else {
            if (pos === 1) posClass += ' pos-win';
            else if (pos === 2) posClass += ' pos-silver';
            else if (pos === 3) posClass += ' pos-bronze';
            else if (pos <= 10) posClass += ' pos-top10';

            posText = pos + getOrdinalSuffix(pos);
        }

        posCell.className = posClass;
        posCell.textContent = posText;
        row.appendChild(posCell);

        // vs Predicted
        const vsPredCell = document.createElement('td');
        if (result.predictedPosition && pos !== 'DNF') {
            const diff = result.predictedPosition - pos;
            let vsPredClass = 'vs-pred-neutral';
            let vsPredText = '0';

            if (diff > 0) {
                vsPredClass = 'vs-pred-positive';
                vsPredText = `+${diff}`;
            } else if (diff < 0) {
                vsPredClass = 'vs-pred-negative';
                vsPredText = `${diff}`;
            }

            vsPredCell.className = vsPredClass;
            vsPredCell.textContent = vsPredText;
        } else {
            vsPredCell.textContent = '—';
        }
        row.appendChild(vsPredCell);

        // ARR
        const arrCell = document.createElement('td');
        arrCell.className = 'stat-row-value';
        arrCell.textContent = result.arr || '—';
        row.appendChild(arrCell);

        // Points
        const pointsCell = document.createElement('td');
        pointsCell.className = 'stat-row-value';
        pointsCell.textContent = result.points + (result.bonusPoints || 0);
        row.appendChild(pointsCell);

        // Awards
        const awardsCell = document.createElement('td');
        awardsCell.className = 'awards-cell';
        const medals = [];

        // Add podium medals based on position
        if (pos === 1) medals.push('🥇');
        else if (pos === 2) medals.push('🥈');
        else if (pos === 3) medals.push('🥉');

        // Add special medals
        if (result.earnedPunchingMedal) medals.push('🥊');
        if (result.earnedGiantKillerMedal) medals.push('⚔️');
        if (result.earnedBullseyeMedal) medals.push('🎯');
        if (result.earnedHotStreakMedal) medals.push('🔥');
        if (result.earnedDomination) medals.push('👑');
        if (result.earnedCloseCall) medals.push('😰');
        if (result.earnedPhotoFinish) medals.push('📸');
        if (result.earnedDarkHorse) medals.push('🐴');
        if (result.earnedZeroToHero) medals.push('🦸');
        awardsCell.textContent = medals.join(' ');
        row.appendChild(awardsCell);

        // Cadence Coins
        const ccCell = document.createElement('td');
        ccCell.className = 'cc-cell stat-row-value';
        ccCell.textContent = result.earnedCadenceCredits || 0;
        row.appendChild(ccCell);

        tbody.appendChild(row);
    });

    // Update result count
    document.getElementById('resultCount').textContent = filteredResults.length;
    document.getElementById('totalResults').textContent = allResults.length;
}

// Apply filtering
function applyFilters() {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;
    const categoryFilter = document.getElementById('filterCategory').value;

    filteredResults = allResults.filter(result => {
        // Search filter
        if (searchTerm && !result.eventName.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Type filter
        if (typeFilter === 'wins' && result.position !== 1) return false;
        if (typeFilter === 'podiums' && (result.position > 3 || result.position === 'DNF')) return false;
        if (typeFilter === 'top10' && (result.position > 10 || result.position === 'DNF')) return false;
        if (typeFilter === 'dnf' && result.position !== 'DNF') return false;

        // Category filter
        if (categoryFilter !== 'all' && result.eventType !== categoryFilter) return false;

        return true;
    });

    applySort();
    displayResultsTable();
}

// Apply sorting
function applySort() {
    const { column, direction } = currentSort;

    filteredResults.sort((a, b) => {
        let aVal, bVal;

        switch (column) {
            case 'date':
                aVal = a.eventNum;
                bVal = b.eventNum;
                break;
            case 'event':
                aVal = a.eventName;
                bVal = b.eventName;
                break;
            case 'season':
                // All events are currently in season 1, so sort by event number
                aVal = a.eventNum;
                bVal = b.eventNum;
                break;
            case 'stage':
                // Choice events (6-12) sort after numbered stages (using 999)
                aVal = getStageForEvent(a.eventNum) || 999;
                bVal = getStageForEvent(b.eventNum) || 999;
                break;
            case 'position':
                aVal = a.position === 'DNF' ? 999 : a.position;
                bVal = b.position === 'DNF' ? 999 : b.position;
                break;
            case 'vspred':
                aVal = a.predictedPosition ? (a.predictedPosition - (a.position === 'DNF' ? 0 : a.position)) : -999;
                bVal = b.predictedPosition ? (b.predictedPosition - (b.position === 'DNF' ? 0 : b.position)) : -999;
                break;
            case 'arr':
                aVal = a.arr || 0;
                bVal = b.arr || 0;
                break;
            case 'points':
                aVal = a.points + (a.bonusPoints || 0);
                bVal = b.points + (b.bonusPoints || 0);
                break;
            case 'cc':
                aVal = a.earnedCadenceCredits || 0;
                bVal = b.earnedCadenceCredits || 0;
                break;
            default:
                return 0;
        }

        if (typeof aVal === 'string') {
            return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });

    // Update sort indicators
    document.querySelectorAll('.palmares-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    const activeHeader = document.querySelector(`th[data-sort="${column}"]`);
    if (activeHeader) {
        activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

// Calculate competition statistics from rival data and results
function calculateCompetitionStats() {
    const userARR = userData.arr || 0;
    const rivalData = userData.rivalData || {};
    const encounters = rivalData.encounters || {};

    // If no rival data, return placeholders
    if (Object.keys(encounters).length === 0) {
        return {
            avgOpponentARR: null,
            racesVsStronger: '0 (0%)',
            winRateVsStronger: '—',
            winRateVsWeaker: '—'
        };
    }

    // Calculate stats from rival encounters
    let totalOpponentARR = 0;
    let totalRaces = 0;
    let racesVsStronger = 0;
    let winsVsStronger = 0;
    let racesVsWeaker = 0;
    let winsVsWeaker = 0;

    Object.values(encounters).forEach(rival => {
        const opponentARR = rival.botArr || 0;
        const races = rival.races || 0;
        const wins = rival.userWins || 0;

        if (opponentARR > 0 && races > 0) {
            totalOpponentARR += opponentARR * races;
            totalRaces += races;

            // Check if opponent is stronger or weaker
            if (opponentARR > userARR) {
                racesVsStronger += races;
                winsVsStronger += wins;
            } else if (opponentARR < userARR) {
                racesVsWeaker += races;
                winsVsWeaker += wins;
            }
        }
    });

    // Calculate averages and percentages
    const avgOpponentARR = totalRaces > 0 ? Math.round(totalOpponentARR / totalRaces) : null;
    const pctVsStronger = totalRaces > 0 ? ((racesVsStronger / totalRaces) * 100).toFixed(0) : 0;
    const winRateVsStronger = racesVsStronger > 0 ? ((winsVsStronger / racesVsStronger) * 100).toFixed(1) : '—';
    const winRateVsWeaker = racesVsWeaker > 0 ? ((winsVsWeaker / racesVsWeaker) * 100).toFixed(1) : '—';

    return {
        avgOpponentARR: avgOpponentARR,
        racesVsStronger: `${racesVsStronger} (${pctVsStronger}%)`,
        winRateVsStronger: winRateVsStronger !== '—' ? `${winRateVsStronger}%` : '—',
        winRateVsWeaker: winRateVsWeaker !== '—' ? `${winRateVsWeaker}%` : '—'
    };
}

// Display detailed statistics
function displayDetailedStats() {
    const lifetime = userData.lifetimeStats || {};
    const completedResults = allResults.filter(r => r.position !== 'DNF');
    const dnfCount = allResults.length - completedResults.length;

    // Career Totals
    document.getElementById('totalDistance').textContent =
        `${(lifetime.totalDistance || 0).toFixed(1)} km`;
    document.getElementById('totalClimbing').textContent =
        `${Math.round(lifetime.totalClimbing || 0)} m`;

    const totalSeconds = lifetime.totalRaceTime || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('totalRaceTime').textContent = `${hours}h ${minutes}m`;

    document.getElementById('eventsCompleted').textContent =
        `${completedResults.length} / ${allResults.length}`;
    document.getElementById('completionRate').textContent =
        `${allResults.length > 0 ? ((completedResults.length / allResults.length) * 100).toFixed(0) : 100}%`;

    const totalCareerCC = userData.currency?.totalEarned || 0;
    document.getElementById('totalCareerCC').textContent = `${totalCareerCC.toLocaleString()} CC`;

    // Performance
    const winRate = allResults.length > 0 ? ((userData.totalWins || 0) / completedResults.length * 100).toFixed(1) : 0;
    const podiumRate = allResults.length > 0 ? ((userData.totalPodiums || 0) / completedResults.length * 100).toFixed(1) : 0;
    const top10Rate = allResults.length > 0 ? ((userData.totalTop10s || 0) / completedResults.length * 100).toFixed(1) : 0;

    document.getElementById('perfWins').textContent = `${userData.totalWins || 0} (${winRate}%)`;
    document.getElementById('perfPodiums').textContent = `${userData.totalPodiums || 0} (${podiumRate}%)`;
    document.getElementById('perfTop10').textContent = `${userData.totalTop10s || 0} (${top10Rate}%)`;
    document.getElementById('perfAvgFinish').textContent = Math.round(userData.averageFinish) || '0';

    const bestFinish = userData.bestFinish || null;
    document.getElementById('perfBestFinish').textContent = bestFinish ?
        `${bestFinish}${getOrdinalSuffix(bestFinish)}` : '—';

    const worstFinish = completedResults.length > 0 ?
        Math.max(...completedResults.map(r => r.position)) : null;
    document.getElementById('perfWorstFinish').textContent = worstFinish ?
        `${worstFinish}${getOrdinalSuffix(worstFinish)}` : '—';

    // Consistency - Calculate streaks
    const streaks = calculateStreaks(completedResults);
    document.getElementById('longestTop10Streak').textContent = streaks.top10;
    document.getElementById('longestPodiumStreak').textContent = streaks.podium;
    document.getElementById('longestNoDNFStreak').textContent = streaks.noDNF;

    // Competition Analysis
    const competitionStats = calculateCompetitionStats();
    document.getElementById('avgOpponentARR').textContent = competitionStats.avgOpponentARR || '—';
    document.getElementById('winRateVsStronger').textContent = competitionStats.winRateVsStronger;
    document.getElementById('winRateVsWeaker').textContent = competitionStats.winRateVsWeaker;

    // Specialty
    const typeStats = calculateTypeStats(completedResults);
    document.getElementById('bestRaceType').textContent = typeStats.bestType || '—';
    document.getElementById('versatilityScore').textContent = `${typeStats.versatility} / 10`;

    // Event type distribution
    const distEl = document.getElementById('eventTypeDistribution');
    distEl.innerHTML = '';
    Object.entries(typeStats.distribution).forEach(([type, stats]) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span class="stat-row-label">${capitalize(type)}:</span>
            <span class="stat-row-value">${stats.total} races (${stats.wins}W, ${stats.podiums}P, ${stats.top10}T10)</span>
        `;
        distEl.appendChild(row);
    });
}

// Calculate streaks
function calculateStreaks(results) {
    const sorted = [...results].sort((a, b) => a.eventNum - b.eventNum);

    let top10Streak = 0, maxTop10 = 0;
    let podiumStreak = 0, maxPodium = 0;
    let noDNFStreak = allResults.length > 0 ? allResults.length - allResults.filter(r => r.position === 'DNF').length : 0;

    sorted.forEach(result => {
        if (result.position <= 10) {
            top10Streak++;
            maxTop10 = Math.max(maxTop10, top10Streak);
        } else {
            top10Streak = 0;
        }

        if (result.position <= 3) {
            podiumStreak++;
            maxPodium = Math.max(maxPodium, podiumStreak);
        } else {
            podiumStreak = 0;
        }
    });

    return {
        top10: maxTop10,
        podium: maxPodium,
        noDNF: noDNFStreak
    };
}

// Calculate type statistics
function calculateTypeStats(results) {
    const distribution = {};
    let totalTypes = 0;
    let typesWithWins = 0;
    let typesWithPodiums = 0;

    results.forEach(result => {
        const type = result.eventType;
        if (!distribution[type]) {
            distribution[type] = { total: 0, wins: 0, podiums: 0, top10: 0 };
            totalTypes++;
        }

        distribution[type].total++;
        if (result.position === 1) distribution[type].wins++;
        if (result.position <= 3) distribution[type].podiums++;
        if (result.position <= 10) distribution[type].top10++;
    });

    // Find best type by win rate, fall back to podium rate, then top10 rate
    let bestType = null;
    let bestWinRate = 0;
    let bestPodiumType = null;
    let bestPodiumRate = 0;
    let bestTop10Type = null;
    let bestTop10Rate = 0;

    Object.entries(distribution).forEach(([type, stats]) => {
        const winRate = stats.total > 0 ? stats.wins / stats.total : 0;
        const podiumRate = stats.total > 0 ? stats.podiums / stats.total : 0;
        const top10Rate = stats.total > 0 ? stats.top10 / stats.total : 0;

        // Track best win rate
        if (winRate > bestWinRate || (winRate === bestWinRate && winRate > 0 && !bestType)) {
            bestWinRate = winRate;
            bestType = `${capitalize(type)} (${(winRate * 100).toFixed(0)}% wins)`;
        }

        // Track best podium rate
        if (podiumRate > bestPodiumRate || (podiumRate === bestPodiumRate && podiumRate > 0 && !bestPodiumType)) {
            bestPodiumRate = podiumRate;
            bestPodiumType = `${capitalize(type)} (${(podiumRate * 100).toFixed(0)}% podiums)`;
        }

        // Track best top10 rate
        if (top10Rate > bestTop10Rate || (top10Rate === bestTop10Rate && top10Rate > 0 && !bestTop10Type)) {
            bestTop10Rate = top10Rate;
            bestTop10Type = `${capitalize(type)} (${(top10Rate * 100).toFixed(0)}% top 10)`;
        }

        if (stats.wins > 0) typesWithWins++;
        if (stats.podiums > 0) typesWithPodiums++;
    });

    // Fallback hierarchy: wins -> podiums -> top10
    if (!bestType && bestPodiumType) {
        bestType = bestPodiumType;
    }
    if (!bestType && bestTop10Type) {
        bestType = bestTop10Type;
    }

    // Versatility score: prioritize win variety, then podium variety, then event participation
    let baseScore = typesWithWins;
    if (typesWithWins === 0) {
        baseScore = typesWithPodiums;
    }
    if (baseScore === 0) {
        baseScore = Object.keys(distribution).length;
    }
    const versatility = totalTypes > 0 ? Math.round((baseScore / totalTypes) * 10) : 0;

    return { distribution, bestType, versatility };
}

// Display awards table
function displayAwardsTable() {
    const awards = userData.awards || {};
    const tbody = document.getElementById('awardsTableBody');
    tbody.innerHTML = '';

    // Filter out awards with 0 count and sort by count
    const awardEntries = Object.entries(awards)
        .filter(([key, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    if (awardEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No awards earned yet</td></tr>';
        return;
    }

    awardEntries.forEach(([key, count]) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const awardInfo = AWARD_NAMES[key];
        if (awardInfo) {
            nameCell.textContent = `${awardInfo.icon} ${awardInfo.name}`;
        } else {
            nameCell.textContent = key;
        }
        row.appendChild(nameCell);

        const countCell = document.createElement('td');
        countCell.className = 'stat-row-value';
        countCell.textContent = count;
        row.appendChild(countCell);

        tbody.appendChild(row);
    });
}

// Map event number to stage number based on user's choice selections
function mapEventToStage(eventNumber, choiceSelections) {
    // Handle starting point
    if (eventNumber === 0) return 0;

    // Convert to number for consistent comparison
    const eventNum = parseInt(eventNumber);

    // Check mandatory stages (including Local Tour stages 9-11)
    for (const seq of EVENT_SEQUENCE) {
        if (seq.eventId === eventNum) {
            return seq.stage;
        }
    }

    // Check choice stages (stages 3, 6, 8)
    for (const [stageNum, eventId] of Object.entries(choiceSelections)) {
        // Convert both to numbers for comparison
        if (parseInt(eventId) === eventNum) {
            console.log(`Mapped event ${eventNum} to stage ${stageNum} via choiceSelections`);
            return parseInt(stageNum);
        }
    }

    // Fallback - couldn't find mapping
    console.warn(`Could not map event ${eventNum} to a stage. choiceSelections:`, choiceSelections);
    return eventNum; // Use event number as fallback
}

// Display personality evolution chart
function displayPersonalityTimeline() {
    const currentPersonality = userData.personality || {};

    // Hide section if no personality data
    if (interviewHistory.length === 0 && Object.keys(currentPersonality).length === 0) {
        document.getElementById('personalitySection').style.display = 'none';
        return;
    }

    document.getElementById('personalitySection').style.display = 'block';

    // Display current persona
    const personaDiv = document.getElementById('currentPersona');
    const persona = getPersonaLabel(currentPersonality);
    personaDiv.innerHTML = `
        <div class="persona-label">${persona || 'The Rising Talent'}</div>
        <div class="persona-subtitle">Current Personality Profile</div>
    `;

    // Get user's choice selections
    // choiceSelections maps stage number -> event ID for choice stages
    // usedOptionalEvents is an array where index 0 -> stage 3, index 1 -> stage 6, index 2 -> stage 8
    let choiceSelections = userData.choiceSelections || {};
    const usedOptionalEvents = userData.usedOptionalEvents || [];

    // Build choiceSelections from usedOptionalEvents if needed
    if (Object.keys(choiceSelections).length === 0 && usedOptionalEvents.length > 0) {
        const choiceStages = [3, 6, 8];
        usedOptionalEvents.forEach((eventId, index) => {
            if (index < choiceStages.length) {
                choiceSelections[choiceStages[index]] = eventId;
            }
        });
    }

    console.log('Choice selections for personality chart:', choiceSelections);

    // Build data points for chart (start at 50 for all traits)
    const dataPoints = [{
        eventNumber: 0,
        stageNumber: 0,
        confidence: 50,
        humility: 50,
        aggression: 50,
        professionalism: 50,
        showmanship: 50,
        resilience: 50
    }];

    // Add interview data points (these represent personality AFTER each event)
    interviewHistory.forEach(interview => {
        if (interview.personalityAfter) {
            const stageNumber = mapEventToStage(interview.eventNumber, choiceSelections);
            dataPoints.push({
                eventNumber: interview.eventNumber,
                stageNumber: stageNumber,
                ...interview.personalityAfter
            });
        }
    });

    // Store data points globally for interactivity
    chartDataPoints = dataPoints;

    // Setup interactivity first (which clones the canvas)
    setupChartInteractivity();

    // Then draw the chart on the fresh canvas
    drawPersonalityChart(dataPoints);
}

// Draw line chart showing personality evolution
function drawPersonalityChart(dataPoints) {
    const canvas = document.getElementById('personalityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart configuration
    const padding = { top: 40, right: 120, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Trait configuration with colors
    const traits = [
        { name: 'confidence', label: 'Confidence', color: '#ff1b6b' },
        { name: 'humility', label: 'Humility', color: '#45caff' },
        { name: 'aggression', label: 'Aggression', color: '#ff6b35' },
        { name: 'professionalism', label: 'Professionalism', color: '#7fff7f' },
        { name: 'showmanship', label: 'Showmanship', color: '#ffd700' },
        { name: 'resilience', label: 'Resilience', color: '#9d4edd' }
    ];

    // Smart sampling based on data points
    let sampledPoints = dataPoints;
    if (dataPoints.length > 15) {
        sampledPoints = sampleDataPoints(dataPoints, 15);
    }

    // Get min and max stage numbers for X axis
    const minStage = Math.min(...sampledPoints.map(p => p.stageNumber));
    const maxStage = Math.max(...sampledPoints.map(p => p.stageNumber));

    // Find min and max values across all traits for dynamic Y-axis scaling
    let minValue = 100;
    let maxValue = 0;

    traits.forEach(trait => {
        sampledPoints.forEach(point => {
            const value = point[trait.name] || 50;
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
        });
    });

    // Add padding to Y-axis range (10% above and below)
    const valueRange = maxValue - minValue;
    const yPadding = Math.max(5, valueRange * 0.15); // At least 5 points padding
    minValue = Math.max(0, minValue - yPadding);
    maxValue = Math.min(100, maxValue + yPadding);

    // Ensure minimum range of 20 points for readability
    if (maxValue - minValue < 20) {
        const midpoint = (maxValue + minValue) / 2;
        minValue = Math.max(0, midpoint - 10);
        maxValue = Math.min(100, midpoint + 10);
    }

    // Round to nice numbers
    minValue = Math.floor(minValue / 5) * 5;
    maxValue = Math.ceil(maxValue / 5) * 5;

    // Helper functions for coordinate conversion
    const xScale = (stageNum) => {
        if (maxStage === minStage) return padding.left + chartWidth / 2;
        return padding.left + ((stageNum - minStage) / (maxStage - minStage)) * chartWidth;
    };

    const yScale = (value) => {
        return padding.top + chartHeight - (((value - minValue) / (maxValue - minValue)) * chartHeight);
    };

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (5 lines total)
    const gridLines = 5;
    for (let i = 0; i < gridLines; i++) {
        const y = padding.top + (chartHeight / (gridLines - 1)) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Y-axis labels (show actual values based on dynamic scale)
        const value = maxValue - ((maxValue - minValue) / (gridLines - 1)) * i;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '12px Exo 2, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(value).toString(), padding.left - 10, y);
    }

    // Vertical grid lines (stages)
    const stageStep = Math.max(1, Math.ceil((maxStage - minStage) / 10));
    for (let stage = minStage; stage <= maxStage; stage += stageStep) {
        const x = xScale(stage);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();

        // X-axis labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '12px Exo 2, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(stage === 0 ? 'Start' : `Stage ${stage}`, x, padding.top + chartHeight + 10);
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw trait lines (only visible traits)
    traits.forEach(trait => {
        if (!visibleTraits[trait.name]) return; // Skip hidden traits

        ctx.strokeStyle = trait.color;
        ctx.lineWidth = 3;
        ctx.beginPath();

        sampledPoints.forEach((point, index) => {
            const x = xScale(point.stageNumber);
            const y = yScale(point[trait.name] || 50);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw points
        sampledPoints.forEach(point => {
            const x = xScale(point.stageNumber);
            const y = yScale(point[trait.name] || 50);

            ctx.fillStyle = trait.color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Draw hover highlight if hovering (or clicked)
    const highlightIndex = clickedEventIndex !== null ? clickedEventIndex : hoveredEventIndex;
    if (highlightIndex !== null && highlightIndex < sampledPoints.length) {
        const hoveredPoint = sampledPoints[highlightIndex];
        const x = xScale(hoveredPoint.stageNumber);

        // Draw vertical line at hovered event
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight points at this event
        traits.forEach(trait => {
            if (!visibleTraits[trait.name]) return;

            const y = yScale(hoveredPoint[trait.name] || 50);

            // Draw larger highlight circle
            ctx.strokeStyle = trait.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.stroke();

            // Fill center
            ctx.fillStyle = trait.color;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw legend (with clickable interaction hint)
    const legendX = padding.left + chartWidth + 20;
    let legendY = padding.top + 20;

    traits.forEach(trait => {
        const isVisible = visibleTraits[trait.name];

        // Color swatch
        ctx.fillStyle = isVisible ? trait.color : 'rgba(128, 128, 128, 0.3)';
        ctx.fillRect(legendX, legendY - 6, 20, 12);

        // Add border to indicate clickable
        ctx.strokeStyle = isVisible ? trait.color : 'rgba(128, 128, 128, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY - 6, 20, 12);

        // Label
        ctx.fillStyle = isVisible ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '13px Exo 2, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labelText = isVisible ? trait.label : trait.label + ' (hidden)';
        ctx.fillText(labelText, legendX + 28, legendY);

        legendY += 25;
    });

    // Add "Click to toggle" hint at bottom of legend
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Exo 2, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Click to toggle', legendX, legendY + 10);

    // Store legend bounds for click detection
    canvas.dataset.legendX = legendX;
    canvas.dataset.legendY = padding.top + 20;
    canvas.dataset.legendWidth = 100;
    canvas.dataset.legendItemHeight = 25;
}

// Smart sampling of data points to avoid overcrowding
function sampleDataPoints(points, maxPoints) {
    if (points.length <= maxPoints) return points;

    // Always include first and last point
    const sampled = [points[0]];
    const step = (points.length - 2) / (maxPoints - 2);

    for (let i = 1; i < maxPoints - 1; i++) {
        const index = Math.round(i * step);
        sampled.push(points[index]);
    }

    sampled.push(points[points.length - 1]);
    return sampled;
}

// Setup chart interactivity (click for tooltips, legend toggle)
function setupChartInteractivity() {
    const canvas = document.getElementById('personalityChart');
    if (!canvas) return;

    // Remove existing listeners
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    const freshCanvas = document.getElementById('personalityChart');

    // Click for tooltips and legend toggle
    freshCanvas.addEventListener('click', handleChartClick);

    // Change cursor over data points and legend
    freshCanvas.addEventListener('mousemove', handleCursorChange);

    // Hide tooltip on scroll or window events
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
}

// Find the data point index near the click position
function findDataPointAtPosition(canvasX, canvasY, canvas) {
    const padding = { top: 40, right: 120, bottom: 50, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    // Check if click is in chart area
    if (canvasX < padding.left || canvasX > padding.left + chartWidth ||
        canvasY < padding.top || canvasY > padding.top + chartHeight) {
        return null;
    }

    // Find nearest stage point
    const sampledPoints = chartDataPoints.length > 15 ? sampleDataPoints(chartDataPoints, 15) : chartDataPoints;
    const minStage = Math.min(...sampledPoints.map(p => p.stageNumber));
    const maxStage = Math.max(...sampledPoints.map(p => p.stageNumber));

    if (maxStage === minStage) return null;

    // Convert mouse X to stage number
    const stageProgress = (canvasX - padding.left) / chartWidth;
    const stageNumber = minStage + stageProgress * (maxStage - minStage);

    // Find closest point
    let closestIndex = 0;
    let closestDistance = Infinity;

    sampledPoints.forEach((point, index) => {
        const distance = Math.abs(point.stageNumber - stageNumber);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    // Only return if click is reasonably close (within 5% of chart width)
    const threshold = (maxStage - minStage) * 0.05;
    if (closestDistance < threshold) {
        return closestIndex;
    }

    return null;
}

// Show tooltip with event details (static position)
function showTooltip(dataPoint, canvas) {
    // Remove existing tooltip
    hideTooltip();

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'chartTooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.background = 'rgba(20, 24, 36, 0.98)';
    tooltip.style.border = '2px solid rgba(69, 202, 255, 0.8)';
    tooltip.style.borderRadius = '8px';
    tooltip.style.padding = '1rem';
    tooltip.style.pointerEvents = 'auto';
    tooltip.style.zIndex = '10000';
    tooltip.style.fontSize = '0.9rem';
    tooltip.style.fontFamily = 'Exo 2, sans-serif';
    tooltip.style.color = '#ffffff';
    tooltip.style.minWidth = '220px';
    tooltip.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';

    // Build tooltip content
    const eventName = EVENT_DATA[dataPoint.eventNumber]?.name || (dataPoint.eventNumber === 0 ? 'Career Start' : `Event ${dataPoint.eventNumber}`);
    const stageLabel = dataPoint.stageNumber === 0 ? 'Career Start' : `Stage ${dataPoint.stageNumber}`;

    let content = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
                <div style="font-weight: 700; color: #45caff; font-family: Orbitron, sans-serif; font-size: 1rem;">${eventName}</div>
                <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); margin-top: 0.25rem;">${stageLabel}</div>
            </div>
            <button id="closeTooltip" style="background: none; border: none; color: #45caff; font-size: 1.5rem; cursor: pointer; padding: 0; width: 24px; height: 24px; line-height: 1;">&times;</button>
        </div>
    `;

    const traits = [
        { name: 'confidence', label: 'Confidence', color: '#ff1b6b' },
        { name: 'humility', label: 'Humility', color: '#45caff' },
        { name: 'aggression', label: 'Aggression', color: '#ff6b35' },
        { name: 'professionalism', label: 'Professionalism', color: '#7fff7f' },
        { name: 'showmanship', label: 'Showmanship', color: '#ffd700' },
        { name: 'resilience', label: 'Resilience', color: '#9d4edd' }
    ];

    traits.forEach(trait => {
        if (visibleTraits[trait.name]) {
            const value = Math.round(dataPoint[trait.name] || 50);
            content += `
                <div style="display: flex; justify-content: space-between; margin-top: 0.4rem;">
                    <span style="color: ${trait.color};">● ${trait.label}:</span>
                    <span style="font-weight: 700;">${value}</span>
                </div>
            `;
        }
    });

    tooltip.innerHTML = content;

    // Position tooltip in center of screen
    document.body.appendChild(tooltip);
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${(window.innerWidth - tooltipRect.width) / 2}px`;
    tooltip.style.top = `${Math.max(100, (window.innerHeight - tooltipRect.height) / 2)}px`;

    // Add close button event listener
    document.getElementById('closeTooltip').addEventListener('click', hideTooltip);

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', handleTooltipClickAway, true);
    }, 100);
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('chartTooltip');
    if (tooltip) {
        tooltip.remove();
    }
    // Remove click-away listener
    document.removeEventListener('click', handleTooltipClickAway, true);

    // Reset clicked state and redraw chart
    if (clickedEventIndex !== null) {
        clickedEventIndex = null;
        if (chartDataPoints && chartDataPoints.length > 0) {
            drawPersonalityChart(chartDataPoints);
        }
    }
}

// Handle clicks away from tooltip
function handleTooltipClickAway(event) {
    const tooltip = document.getElementById('chartTooltip');
    if (tooltip && !tooltip.contains(event.target)) {
        hideTooltip();
    }
}

// Handle chart clicks (for data points and legend toggle)
function handleChartClick(event) {
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Scale for canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    // Get legend bounds
    const legendX = parseFloat(canvas.dataset.legendX || 0);
    const legendY = parseFloat(canvas.dataset.legendY || 0);
    const legendWidth = parseFloat(canvas.dataset.legendWidth || 100);
    const legendItemHeight = parseFloat(canvas.dataset.legendItemHeight || 25);

    // Check if click is in legend area
    if (canvasX >= legendX && canvasX <= legendX + legendWidth) {
        const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];

        traits.forEach((trait, index) => {
            const itemY = legendY + (index * legendItemHeight);
            if (canvasY >= itemY - 12 && canvasY <= itemY + 12) {
                // Toggle trait visibility
                visibleTraits[trait] = !visibleTraits[trait];

                // Ensure at least one trait is visible
                const visibleCount = Object.values(visibleTraits).filter(v => v).length;
                if (visibleCount === 0) {
                    visibleTraits[trait] = true; // Restore the one we just tried to hide
                }

                // Redraw chart
                drawPersonalityChart(chartDataPoints);
            }
        });
        return; // Don't check for data point clicks if we clicked legend
    }

    // Check if click is on a data point
    const dataPointIndex = findDataPointAtPosition(canvasX, canvasY, canvas);
    if (dataPointIndex !== null) {
        const sampledPoints = chartDataPoints.length > 15 ? sampleDataPoints(chartDataPoints, 15) : chartDataPoints;
        clickedEventIndex = dataPointIndex;
        drawPersonalityChart(chartDataPoints);
        showTooltip(sampledPoints[dataPointIndex], canvas);
    } else {
        // Click on empty space - hide tooltip if showing
        if (clickedEventIndex !== null) {
            hideTooltip();
        }
    }
}

// Handle cursor change over legend
function handleCursorChange(event) {
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const legendX = parseFloat(canvas.dataset.legendX || 0);
    const legendY = parseFloat(canvas.dataset.legendY || 0);
    const legendWidth = parseFloat(canvas.dataset.legendWidth || 100);
    const legendItemHeight = parseFloat(canvas.dataset.legendItemHeight || 25);

    // Check if hovering legend
    const overLegend = canvasX >= legendX && canvasX <= legendX + legendWidth &&
                       canvasY >= legendY - 12 && canvasY <= legendY + (6 * legendItemHeight);

    canvas.style.cursor = overLegend ? 'pointer' : 'default';
}

// Display rivals table
function displayRivalsTable() {
    const rivalData = userData.rivalData || {};
    const topRivals = rivalData.topRivals || [];
    const encounters = rivalData.encounters || {};

    if (topRivals.length === 0) {
        document.getElementById('rivalsSection').style.display = 'none';
        return;
    }

    document.getElementById('rivalsSection').style.display = 'block';

    const tbody = document.getElementById('rivalsTableBody');
    tbody.innerHTML = '';

    // topRivals is an array of UIDs, not objects
    topRivals.forEach(rivalUid => {
        const encounterData = encounters[rivalUid] || {};
        const wins = encounterData.userWins || 0;
        const losses = encounterData.botWins || 0;
        const total = encounterData.races || 0;
        const winPct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${encounterData.botName || 'Unknown'}</td>
            <td>${total}</td>
            <td>${wins}-${losses}</td>
            <td>${winPct}%</td>
            <td>${encounterData.botArr || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Utility function
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Event listeners
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await loadPalmares(user);
    } else {
        showLoginPrompt();
    }
});

// Filter and sort event listeners
document.getElementById('searchFilter')?.addEventListener('input', applyFilters);
document.getElementById('filterType')?.addEventListener('change', applyFilters);
document.getElementById('filterCategory')?.addEventListener('change', applyFilters);

// Sortable table headers
document.querySelectorAll('.palmares-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.dataset.sort;
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'desc';
        }
        applySort();
        displayResultsTable();
    });
});
