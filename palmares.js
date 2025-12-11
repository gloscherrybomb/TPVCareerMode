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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;
let allResults = [];
let filteredResults = [];
let currentSort = { column: 'date', direction: 'desc' };
let interviewHistory = [];

// Event metadata
const EVENT_DATA = {
    1: { name: "Coast and Roast Crit", type: "criterium" },
    2: { name: "Island Classic", type: "road race" },
    3: { name: "Track Showdown", type: "track elimination" },
    4: { name: "City Sprint TT", type: "time trial" },
    5: { name: "The Capital Kermesse", type: "points race" },
    6: { name: "Mt. Sterling TT", type: "hill climb" },
    7: { name: "North Lake Points Race", type: "points race" },
    8: { name: "Heartland Gran Fondo", type: "gran fondo" },
    9: { name: "Highland Loop", type: "hill climb" },
    10: { name: "Riverside Time Trial", type: "time trial" },
    11: { name: "Southern Sky Twilight", type: "points race" },
    12: { name: "Dirtroads and Glory", type: "gravel race" },
    13: { name: "Heritage Highway", type: "road race" },
    14: { name: "Mountain Shadow Classic", type: "road race" },
    15: { name: "Bayview Breakaway Crit", type: "criterium" }
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
    gcBronze: { name: "GC Bronze Trophy", icon: "🥉" }
};

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

// Fetch interview history for personality timeline
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
                personalityBefore: data.personalityBefore,
                personalityAfter: data.personalityAfter,
                personalityDelta: data.personalityDelta,
                selectedResponse: data.selectedResponse,
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

        // Fetch interview history for personality timeline
        interviewHistory = await fetchInterviewHistory(user.uid);

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
    document.getElementById('statAvg').textContent = userData.averageFinish?.toFixed(1) || '0.0';
    document.getElementById('statPoints').textContent = userData.totalPoints || 0;
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

            posText = `${pos}${getOrdinalSuffix(pos)}`;
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

    // Performance
    const winRate = allResults.length > 0 ? ((userData.totalWins || 0) / completedResults.length * 100).toFixed(1) : 0;
    const podiumRate = allResults.length > 0 ? ((userData.totalPodiums || 0) / completedResults.length * 100).toFixed(1) : 0;
    const top10Rate = allResults.length > 0 ? ((userData.totalTop10s || 0) / completedResults.length * 100).toFixed(1) : 0;

    document.getElementById('perfWins').textContent = `${userData.totalWins || 0} (${winRate}%)`;
    document.getElementById('perfPodiums').textContent = `${userData.totalPodiums || 0} (${podiumRate}%)`;
    document.getElementById('perfTop10').textContent = `${userData.totalTop10s || 0} (${top10Rate}%)`;
    document.getElementById('perfAvgFinish').textContent = userData.averageFinish?.toFixed(1) || '0.0';

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
    document.getElementById('racesVsStronger').textContent = competitionStats.racesVsStronger;
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

// Display personality timeline
function displayPersonalityTimeline() {
    const currentPersonality = userData.personality || {};

    // Hide section if no personality data at all
    if (interviewHistory.length === 0 && Object.keys(currentPersonality).length === 0) {
        document.getElementById('personalitySection').style.display = 'none';
        return;
    }

    document.getElementById('personalitySection').style.display = 'block';

    const timeline = document.getElementById('personalityTimeline');
    timeline.innerHTML = '';

    // Show initial personality if we have interview history
    if (interviewHistory.length > 0) {
        const initialSnapshot = document.createElement('div');
        initialSnapshot.className = 'personality-snapshot';

        // Get first interview's "before" state as initial
        const firstInterview = interviewHistory[0];
        const initialPersonality = firstInterview.personalityBefore || {
            confidence: 50, humility: 50, aggression: 50,
            professionalism: 50, showmanship: 50, resilience: 50
        };

        initialSnapshot.innerHTML = `
            <div class="snapshot-header">Initial Personality (Career Start)</div>
            <div class="trait-changes">
                ${Object.entries(initialPersonality).map(([trait, value]) => `
                    <div class="trait-change">
                        <span class="trait-name">${capitalize(trait)}:</span>
                        <span class="trait-values">${Math.round(value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        timeline.appendChild(initialSnapshot);
    }

    // Show each interview's personality change
    interviewHistory.forEach((interview) => {
        const changeDiv = document.createElement('div');
        changeDiv.className = 'personality-snapshot';

        const before = interview.personalityBefore || {};
        const after = interview.personalityAfter || {};
        const delta = interview.personalityDelta || {};

        // Build changes HTML
        let changesHTML = '';
        Object.keys(delta).forEach(trait => {
            const change = delta[trait];
            if (change !== 0) {
                const oldVal = Math.round(before[trait] || 50);
                const newVal = Math.round(after[trait] || 50);
                const diffClass = change > 0 ? 'positive' : 'negative';
                const diffText = change > 0 ? `+${change}` : change;

                changesHTML += `
                    <div class="trait-change">
                        <span class="trait-name">${capitalize(trait)}:</span>
                        <span class="trait-values">
                            ${oldVal} → ${newVal}
                            <span class="trait-diff ${diffClass}">(${diffText})</span>
                        </span>
                    </div>
                `;
            }
        });

        // Get response style/badge if available
        const responseStyle = interview.selectedResponse?.badge || interview.selectedResponse?.style || '';

        changeDiv.innerHTML = `
            <div class="snapshot-header">Event ${interview.eventNumber}</div>
            <div class="snapshot-event">${EVENT_DATA[interview.eventNumber]?.name || 'Unknown Event'}${responseStyle ? ` • ${responseStyle}` : ''}</div>
            <div class="trait-changes">${changesHTML || '<div class="stat-row-text">No significant changes</div>'}</div>
        `;

        timeline.appendChild(changeDiv);
    });

    // Show current personality at the end
    if (Object.keys(currentPersonality).length > 0) {
        const currentDiv = document.createElement('div');
        currentDiv.className = 'personality-snapshot';

        // Valid personality traits
        const validTraits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];
        const filteredTraits = Object.entries(currentPersonality)
            .filter(([trait]) => validTraits.includes(trait.toLowerCase()));

        // Calculate persona based on dominant trait
        const persona = calculatePersona(filteredTraits);

        currentDiv.innerHTML = `
            <div class="snapshot-header">Current Personality ${persona ? `• ${persona}` : ''}</div>
            <div class="trait-changes">
                ${filteredTraits.map(([trait, value]) => `
                    <div class="trait-change">
                        <span class="trait-name">${capitalize(trait)}:</span>
                        <span class="trait-values">${Math.round(value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        timeline.appendChild(currentDiv);
    }
}

// Calculate persona based on personality traits
function calculatePersona(traits) {
    if (traits.length === 0) return null;

    // Find dominant trait
    let maxValue = 0;
    let dominantTrait = null;

    traits.forEach(([trait, value]) => {
        if (value > maxValue) {
            maxValue = value;
            dominantTrait = trait.toLowerCase();
        }
    });

    // Map traits to personas (simplified version)
    const personaMap = {
        confidence: "The Bold Contender",
        humility: "The Quiet Achiever",
        aggression: "The Fierce Competitor",
        professionalism: "The Disciplined Racer",
        showmanship: "The Crowd Favorite",
        resilience: "The Determined Fighter"
    };

    return personaMap[dominantTrait] || null;
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
