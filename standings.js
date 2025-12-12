// Standings Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { getARRBand, getCountryCode2 } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { makeNameClickable } from './bot-profile-modal.js';
import { initRiderProfileModal, makeRiderNameClickable } from './rider-profile-modal.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize rider profile modal
initRiderProfileModal(db);

let currentUser = null;

// Filter state
let filters = {
    gender: 'all',
    ageGroup: 'all',
    country: 'all'
};

// Apply filters to rankings
function applyFilters(rankings) {
    return rankings.filter(racer => {
        // Gender filter
        if (filters.gender !== 'all' && racer.gender !== filters.gender) {
            return false;
        }
        
        // Age group filter (uses ageBand from user profile)
        if (filters.ageGroup !== 'all' && racer.ageBand !== filters.ageGroup) {
            return false;
        }
        
        // Country filter
        if (filters.country !== 'all' && racer.country !== filters.country) {
            return false;
        }
        
        return true;
    });
}

// Populate country filter options
function populateCountryFilter(rankings) {
    const countryFilter = document.getElementById('countryFilter');
    if (!countryFilter) {
        console.warn('Country filter element not found');
        return;
    }
    
    const countries = new Set();
    rankings.forEach(racer => {
        if (racer.country) {
            countries.add(racer.country);
        }
    });
    
    const currentValue = countryFilter.value;
    
    // Clear existing options except "All Countries"
    countryFilter.innerHTML = '<option value="all">All Countries</option>';
    
    // Add country options sorted alphabetically
    Array.from(countries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (currentValue !== 'all' && countries.has(currentValue)) {
        countryFilter.value = currentValue;
    }
}

// NOTE: Dummy data function below is no longer used - real standings calculated from results
// Keeping for reference but can be deleted

/*
// Dummy season standings data (DEPRECATED - now using real results)
function generateDummySeasonStandings(userName, userArr) {
    const botRacers = [
        { uid: "Bot001", name: "Stephen Burgess", arr: 1280, team: "Formix" },
        { uid: "Bot002", name: "Adam Stuart", arr: 1256, team: "" },
        { uid: "Bot003", name: "Damien Fournier", arr: 1119, team: "Fujikai" },
        { uid: "Bot004", name: "Enchen Vong", arr: 1113, team: "Monova" },
        { uid: "Bot005", name: "Jean Francois", arr: 1013, team: "" },
        { uid: "Bot006", name: "Lucca Cardoso", arr: 1112, team: "Patriot" },
        { uid: "Bot007", name: "Roy Jackson", arr: 1121, team: "" },
        { uid: "Bot008", name: "Katerina Dodig", arr: 1031, team: "Formix" },
        { uid: "Bot009", name: "Benjamin Rosenberg", arr: 1047, team: "" },
        { uid: "Bot010", name: "Odell Hartman", arr: 1001, team: "Fable" },
        { uid: "Bot011", name: "Eliel Niskanen", arr: 1087, team: "Optech" },
        { uid: "Bot012", name: "Bradley Xiong", arr: 1065, team: "" },
        { uid: "Bot013", name: "Alonzo Fontana", arr: 1005, team: "Windsail" },
        { uid: "Bot014", name: "Juan Miguel", arr: 1022, team: "Zonkify" },
        { uid: "Bot015", name: "Ethan Flynn", arr: 1236, team: "Hinal" },
        { uid: "Bot016", name: "Ki Ham", arr: 1000, team: "" },
        { uid: "Bot017", name: "Omar Sahraoui", arr: 1026, team: "" },
        { uid: "Bot018", name: "Antonio Martins", arr: 1141, team: "Nuvio" },
        { uid: "Bot019", name: "Danylo Semenyuk", arr: 1004, team: "Delta" },
        { uid: "Bot020", name: "Anaïs Michel", arr: 1118, team: "Base" },
        { uid: "Bot021", name: "Paul Zimmermann", arr: 1091, team: "Ampex" },
        { uid: "Bot022", name: "Hannu Lehtinen", arr: 1128, team: "" },
        { uid: "Bot023", name: "Miriam Locatelli", arr: 1034, team: "Eckleson" },
        { uid: "Bot024", name: "Archie Macleod", arr: 1060, team: "Windsail" },
        { uid: "Bot025", name: "Raymond Benoit", arr: 1127, team: "" }
    ];

    // Generate standings with realistic point distributions
    const standings = botRacers.map((racer, index) => {
        // Generate events completed (between 1-3 for variety)
        const eventsCompleted = Math.floor(Math.random() * 3) + 1;
        
        // Generate points based on ARR and events (higher ARR = more points typically)
        const avgPointsPerEvent = Math.floor((racer.arr / 1000) * 70) + Math.floor(Math.random() * 30);
        const points = avgPointsPerEvent * eventsCompleted;
        
        return {
            uid: racer.uid,
            name: racer.name,
            arr: racer.arr,
            team: racer.team,
            events: eventsCompleted,
            points: points,
            isBot: true,
            isCurrentUser: false
        };
    });

    // Add current user (position around 9th place)
    const userEvents = 2; // User has completed 2 events
    const userPoints = 130; // From their progress
    standings.splice(8, 0, {
        uid: currentUser?.uid || "user",
        name: userName || "You",
        arr: userArr || 1196,
        team: "Chaos",
        events: userEvents,
        points: userPoints,
        isBot: false,
        isCurrentUser: true
    });

    // Sort by points (descending)
    standings.sort((a, b) => b.points - a.points);

    return standings;
}
*/

// Calculate real season standings from results
async function calculateRealSeasonStandings(season = 1) {
    console.log('Calculating real season standings from results...');
    
    // Object to accumulate points for each rider
    const riderStats = {};
    
    // Fetch results for all events in the season
    // Assuming events 1-9 for now (can be made dynamic)
    const eventCount = 9;
    
    for (let eventNum = 1; eventNum <= eventCount; eventNum++) {
        const resultDocId = `season${season}_event${eventNum}`;
        
        try {
            const resultDoc = await getDoc(doc(db, 'results', resultDocId));
            
            if (resultDoc.exists()) {
                const resultData = resultDoc.data();
                const results = resultData.results || [];
                
                console.log(`Event ${eventNum}: Found ${results.length} results`);
                
                // Process each result
                results.forEach(result => {
                    const uid = result.uid;
                    const points = result.points || 0;
                    
                    if (!riderStats[uid]) {
                        riderStats[uid] = {
                            uid: uid,
                            name: result.name,
                            team: result.team || '',
                            arr: result.arr || 0,
                            events: 0,
                            points: 0,
                            isCurrentUser: false,
                            isBot: result.isBot || false
                        };
                    }
                    
                    riderStats[uid].events += 1;
                    riderStats[uid].points += points;
                });
            }
        } catch (error) {
            console.log(`No results for event ${eventNum}`);
        }
    }
    
    // Convert to array and sort by points
    const standings = Object.values(riderStats);
    standings.sort((a, b) => b.points - a.points);
    
    console.log(`Calculated standings for ${standings.length} riders`);
    
    // Mark current user
    if (currentUser) {
        standings.forEach(rider => {
            if (rider.uid === currentUser.uid) {
                rider.isCurrentUser = true;
            }
        });
    }
    
    return standings;
}

// Render Season Standings
async function renderSeasonStandings(forceRefresh = false) {
    const seasonContent = document.getElementById('seasonStandings');

    if (!currentUser) {
        // User not logged in
        seasonContent.innerHTML = `
            <div class="login-prompt">
                <div class="login-prompt-icon">🔒</div>
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your season standings.</p>
                <button class="btn btn-primary" onclick="document.getElementById('loginBtn').click()">
                    Log In
                </button>
            </div>
        `;
        return;
    }

    let standings = [];
    let userData = null;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cachedData = localStorage.getItem(SEASON_STANDINGS_CACHE_KEY + '_' + currentUser.uid);
        const cacheTimestamp = localStorage.getItem(SEASON_STANDINGS_TIMESTAMP_KEY + '_' + currentUser.uid);
        const now = Date.now();

        if (cachedData && cacheTimestamp) {
            const cacheAge = now - parseInt(cacheTimestamp);
            if (cacheAge < CACHE_DURATION) {
                console.log(`📦 Using cached season standings (${Math.round(cacheAge / 1000)}s old)`);
                const cached = JSON.parse(cachedData);
                standings = cached.standings;
                userData = cached.userData;

                // Skip to rendering
                await renderSeasonStandingsTable(standings, userData, seasonContent);
                return;
            }
        }
    }

    // Cache miss or expired - fetch from Firestore
    console.log('🔄 Fetching fresh season standings from Firestore...');

    // Show loading state
    seasonContent.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            <p style="color: var(--text-secondary);">Loading season standings...</p>
        </div>
    `;

    // Fetch user data
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    userData = userDoc.data();

    // Use stored season standings (includes backfilled bot results)
    standings = userData.season1Standings || [];

    // Store in cache
    localStorage.setItem(
        SEASON_STANDINGS_CACHE_KEY + '_' + currentUser.uid,
        JSON.stringify({ standings, userData })
    );
    localStorage.setItem(
        SEASON_STANDINGS_TIMESTAMP_KEY + '_' + currentUser.uid,
        Date.now().toString()
    );
    console.log(`✅ Cached season standings for user ${currentUser.uid}`);

    // Render the table
    await renderSeasonStandingsTable(standings, userData, seasonContent);
}

// Separate function to render the season standings table
async function renderSeasonStandingsTable(standings, userData, seasonContent) {
    // Debug: Check if user's points in standings matches their totalPoints
    const userInStandings = standings.find(s => s.uid === currentUser.uid);
    if (userInStandings && userData) {
        console.log('User points comparison:');
        console.log('  - In season1Standings:', userInStandings.points);
        console.log('  - totalPoints field:', userData.totalPoints);
        console.log('  - Match:', userInStandings.points === userData.totalPoints ? '✅' : '❌');
    }

    // Clean up any malformed points data
    standings = standings.map(racer => {
        // Clean up any malformed points (convert "[object Object]41" to number)
        if (typeof racer.points === 'string' && racer.points.includes('[object Object]')) {
            // Extract any numeric portion
            const numericPart = racer.points.replace(/\[object Object\]/g, '');
            racer.points = parseInt(numericPart) || 0;
        } else if (typeof racer.points === 'object' && racer.points !== null) {
            // If points is an object, extract the points property
            racer.points = racer.points.points || 0;
        }
        // Ensure points is a number
        racer.points = Number(racer.points) || 0;
        return racer;
    });
    
    // Sort by points (descending)
    standings.sort((a, b) => b.points - a.points);
    
    // Fallback: Calculate from results if no stored standings
    if (standings.length === 0) {
        console.log('No stored standings found, calculating from results...');
        standings = await calculateRealSeasonStandings(1);
    } else {
        console.log('Using stored season standings with backfilled data');
    }
    
    // Mark current user
    if (currentUser) {
        standings.forEach(rider => {
            if (rider.uid === currentUser.uid) {
                rider.isCurrentUser = true;
            }
        });
    }
    
    if (standings.length === 0) {
        seasonContent.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Results Yet</h3>
                <p style="color: var(--text-secondary);">Season standings will appear once events are completed</p>
            </div>
        `;
        return;
    }

    // Debug logging
    console.log('Season Standings - First 3 racers:', standings.slice(0, 3));
    console.log('Season Standings - Sample bot:', standings.find(r => r.isBot));

    // Build table HTML
    let tableHTML = `
        <div class="standings-table-container">
            <div class="standings-table-wrapper">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Rider</th>
                            <th>Team</th>
                            <th>ARR</th>
                            <th>Events</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    standings.forEach((racer, index) => {
        const rank = index + 1;
        const rowClass = racer.isCurrentUser ? 'current-user-row' : '';
        const teamDisplay = racer.team || '<span class="no-team">—</span>';
        
        // Podium class for top 3
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-gold';
        else if (rank === 2) rankClass = 'rank-silver';
        else if (rank === 3) rankClass = 'rank-bronze';
        
        tableHTML += `
            <tr class="${rowClass}">
                <td class="rank-cell">
                    <span class="rank-number ${rankClass}">${rank}</span>
                </td>
                <td class="name-cell">
                    <span class="rider-name">${makeNameClickable(racer.name, racer.uid, racer.isBot)}</span>
                    ${racer.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                </td>
                <td class="team-cell">${teamDisplay}</td>
                <td class="arr-cell">
                    <span class="arr-value">${racer.arr}</span>
                    <span class="arr-band">${getARRBand(racer.arr)}</span>
                </td>
                <td class="events-cell">${racer.events}</td>
                <td class="points-cell">
                    <span class="points-value">${racer.points}</span>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
            </div>
        </div>
    `;

    seasonContent.innerHTML = tableHTML;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const GLOBAL_RANKINGS_CACHE_KEY = 'globalRankings';
const GLOBAL_RANKINGS_TIMESTAMP_KEY = 'globalRankingsTimestamp';
const SEASON_STANDINGS_CACHE_KEY = 'seasonStandings';
const SEASON_STANDINGS_TIMESTAMP_KEY = 'seasonStandingsTimestamp';

// Render Global Rankings
async function renderGlobalRankings(forceRefresh = false) {
    const globalContent = document.getElementById('individualRankings');

    try {
        let rankings = [];

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = localStorage.getItem(GLOBAL_RANKINGS_CACHE_KEY);
            const cacheTimestamp = localStorage.getItem(GLOBAL_RANKINGS_TIMESTAMP_KEY);
            const now = Date.now();

            if (cachedData && cacheTimestamp) {
                const cacheAge = now - parseInt(cacheTimestamp);
                if (cacheAge < CACHE_DURATION) {
                    console.log(`📦 Using cached global rankings (${Math.round(cacheAge / 1000)}s old)`);
                    rankings = JSON.parse(cachedData);
                    console.log('Global Rankings - Total racers:', rankings.length);
                    console.log('Global Rankings - First racer:', rankings[0]);

                    // Mark current user
                    if (currentUser) {
                        rankings = rankings.map(r => ({
                            ...r,
                            isCurrentUser: r.uid === currentUser.uid
                        }));
                    }

                    // Skip to rendering
                    renderGlobalRankingsTable(rankings, globalContent);
                    return rankings;
                }
            }
        }

        // Cache miss or expired - fetch from Firestore
        console.log('🔄 Fetching fresh global rankings from Firestore...');

        // Fetch top 100 users by totalPoints (careerPoints not yet implemented)
        // TODO: Switch to careerPoints once all users have this field
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('totalPoints', 'desc'),
            limit(100)
        );
        console.log('📡 Executing Firestore query...');
        const usersSnapshot = await getDocs(usersQuery);
        console.log(`📊 Firestore returned ${usersSnapshot.size} documents`);

        rankings = [];
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            // Use totalPoints for now (careerPoints will be used once implemented)
            const points = data.totalPoints || 0;
            rankings.push({
                uid: doc.id,
                name: data.name || 'Unknown',
                team: data.team || '',
                season: data.currentSeason || 1,
                events: data.totalEvents || (data.completedStages?.length || 0),
                points: points,
                gender: data.gender || null,
                ageBand: data.ageBand || null,
                country: data.country || null,
                isCurrentUser: currentUser && doc.id === currentUser.uid
            });
        });
        console.log(`✅ Processed ${rankings.length} rankings from Firestore`);

        // Store in cache only if we have data
        if (rankings.length > 0) {
            localStorage.setItem(GLOBAL_RANKINGS_CACHE_KEY, JSON.stringify(rankings));
            localStorage.setItem(GLOBAL_RANKINGS_TIMESTAMP_KEY, Date.now().toString());
            console.log(`✅ Cached ${rankings.length} global rankings`);
        } else {
            console.warn('⚠️ Not caching global rankings - no data returned from Firestore');
        }

        // Populate country filter with available countries
        populateCountryFilter(rankings);

        // Render the table
        renderGlobalRankingsTable(rankings, globalContent);
        return rankings; // Return rankings for team calculations
    } catch (error) {
        console.error('Error loading global rankings:', error);
        globalContent.innerHTML = `
            <div class="error-state">
                <p>Error loading rankings. Please try again later.</p>
            </div>
        `;
        return [];
    }
}

// Separate function to render the global rankings table
function renderGlobalRankingsTable(rankings, globalContent) {
    console.log('renderGlobalRankingsTable - Input rankings:', rankings.length);
    console.log('renderGlobalRankingsTable - Current filters:', filters);

    // Apply filters
    const filteredRankings = applyFilters(rankings);
    console.log('renderGlobalRankingsTable - After filters:', filteredRankings.length);

    // Sort by total points (descending)
    filteredRankings.sort((a, b) => b.points - a.points);

    // Build table HTML
    let tableHTML = `
        <div class="standings-table-container">
                <div class="standings-table-wrapper">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Rider</th>
                                <th>Season</th>
                                <th>Events</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (filteredRankings.length === 0) {
            tableHTML += `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p>No riders match the selected filters.</p>
                    </td>
                </tr>
            `;
        } else {
            filteredRankings.forEach((racer, index) => {
                const rank = index + 1;
                const rowClass = racer.isCurrentUser ? 'current-user-row' : '';
                
                // Podium class for top 3
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';
                
                // Determine if this is a bot or human rider
                const isBot = racer.uid.startsWith('Bot');

                // Make name clickable with appropriate modal
                let nameHTML;
                if (isBot) {
                    nameHTML = makeNameClickable(racer.name, racer.uid);
                } else {
                    nameHTML = makeRiderNameClickable(racer.name, racer.uid, false);
                }

                // Get country flag for human riders
                let countryFlagHTML = '';
                if (!isBot && racer.country) {
                    const countryCode2 = getCountryCode2(racer.country);
                    if (countryCode2) {
                        countryFlagHTML = `<img src="assets/flags/${countryCode2}.svg" alt="${racer.country}" class="country-flag-small" title="${racer.country}">`;
                    }
                }

                tableHTML += `
                    <tr class="${rowClass}">
                        <td class="rank-cell">
                            <span class="rank-number ${rankClass}">${rank}</span>
                        </td>
                        <td class="name-cell">
                            <span class="rider-name">${nameHTML}</span>
                            ${countryFlagHTML}
                            ${racer.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                        </td>
                        <td class="season-cell">Season ${racer.season}</td>
                        <td class="events-cell">${racer.events}</td>
                        <td class="points-cell">
                            <span class="points-value">${racer.points}</span>
                        </td>
                    </tr>
                `;
            });
        }

    tableHTML += `
                </tbody>
            </table>
            </div>
        </div>
    `;

    globalContent.innerHTML = tableHTML;
}

// Render team rankings (top 5 riders per team)
async function renderTeamRankings() {
    const teamContent = document.getElementById('teamRankings');
    
    try {
        // Fetch all users from Firestore
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        const riders = [];
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            const team = data.team ? data.team.trim() : '';
            
            // Skip riders without teams or on "Independent"
            if (!team || team.toLowerCase() === 'independent' || team.toLowerCase() === 'no team') {
                return;
            }
            
            riders.push({
                uid: doc.id,
                name: data.name || 'Unknown',
                team: team,
                points: data.totalPoints || 0,
                isCurrentUser: currentUser && doc.id === currentUser.uid
            });
        });
        
        // Group riders by team
        const teamMap = new Map();
        riders.forEach(rider => {
            if (!teamMap.has(rider.team)) {
                teamMap.set(rider.team, []);
            }
            teamMap.get(rider.team).push(rider);
        });
        
        // Calculate team rankings
        const teamRankings = [];
        const currentUserTeam = currentUser ? riders.find(r => r.isCurrentUser)?.team : null;
        
        teamMap.forEach((members, teamName) => {
            // Sort members by points descending
            members.sort((a, b) => b.points - a.points);
            
            // Get top 5 riders
            const top5 = members.slice(0, 5);
            
            // Sum top 5 points
            const totalPoints = top5.reduce((sum, rider) => sum + rider.points, 0);
            
            teamRankings.push({
                team: teamName,
                totalPoints: totalPoints,
                totalMembers: members.length,
                top5Riders: top5,
                isCurrentUserTeam: teamName === currentUserTeam
            });
        });
        
        // Sort teams by total points
        teamRankings.sort((a, b) => b.totalPoints - a.totalPoints);
        
        // Build table HTML
        let tableHTML = `
            <div class="standings-table-container">
                <div class="standings-table-wrapper">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Team</th>
                                <th>Members</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (teamRankings.length === 0) {
            tableHTML += `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">🏆</div>
                        <p>No teams yet. Join a team to compete!</p>
                    </td>
                </tr>
            `;
        } else {
            teamRankings.forEach((team, index) => {
                const rank = index + 1;
                const rowClass = team.isCurrentUserTeam ? 'current-user-team-row' : '';
                
                // Podium class for top 3
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';
                
                // Build top 5 riders list
                const top5HTML = team.top5Riders.map(rider => 
                    `<span class="team-rank-member">
                        <span class="team-rank-member-name">${rider.name}</span>
                        (<span class="team-rank-member-points">${rider.points}</span>)
                    </span>`
                ).join(', ');
                
                tableHTML += `
                    <tr class="${rowClass}">
                        <td class="rank-cell">
                            <span class="rank-number ${rankClass}">${rank}</span>
                        </td>
                        <td class="name-cell">
                            <div class="team-rank-name">
                                ${team.team}
                                ${team.isCurrentUserTeam ? '<span class="your-team-badge">YOUR TEAM</span>' : ''}
                            </div>
                            <div class="team-rank-top5">
                                Top 5: ${top5HTML}
                            </div>
                        </td>
                        <td class="team-rank-members">${team.totalMembers} rider${team.totalMembers !== 1 ? 's' : ''}</td>
                        <td class="points-cell">
                            <span class="points-value">${team.totalPoints}</span>
                        </td>
                    </tr>
                `;
            });
        }
        
        tableHTML += `
                    </tbody>
                </table>
                </div>
            </div>
        `;
        
        teamContent.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error loading team rankings:', error);
        teamContent.innerHTML = `
            <div class="error-state">
                <p>Error loading team rankings. Please try again later.</p>
            </div>
        `;
    }
}

// Sub-tab switching (for Individual vs Team rankings)
function initSubTabs() {
    const subTabButtons = document.querySelectorAll('.sub-tab-btn');
    const individualContent = document.getElementById('individualRankings');
    const teamContent = document.getElementById('teamRankings');
    
    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const subtab = button.dataset.subtab;
            
            // Update active button
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide content
            if (subtab === 'individual') {
                individualContent.classList.add('active');
                teamContent.classList.remove('active');
            } else if (subtab === 'team') {
                individualContent.classList.remove('active');
                teamContent.classList.add('active');
            }
        });
    });
}

// getARRBand function now imported from utils.js

// Tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const seasonContent = document.getElementById('seasonContent');
    const globalContent = document.getElementById('globalContent');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide content
            if (tab === 'season') {
                seasonContent.classList.add('active');
                globalContent.classList.remove('active');
            } else {
                seasonContent.classList.remove('active');
                globalContent.classList.add('active');
            }
        });
    });
}

// Initialize on auth state change
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    // Render all content
    await renderSeasonStandings();
    await renderGlobalRankings();
    await renderTeamRankings();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSubTabs();
    initFilters();
    renderSeasonStandings();
    renderGlobalRankings().catch(err => console.error('Error rendering global rankings:', err));
    renderTeamRankings();
});

// Initialize filter event listeners
function initFilters() {
    const genderFilter = document.getElementById('genderFilter');
    const ageGroupFilter = document.getElementById('ageGroupFilter');
    const countryFilter = document.getElementById('countryFilter');
    const clearButton = document.getElementById('clearFilters');
    
    // Gender filter change
    genderFilter.addEventListener('change', () => {
        filters.gender = genderFilter.value;
        renderGlobalRankings().catch(err => console.error('Error rendering global rankings:', err));
    });

    // Age group filter change
    ageGroupFilter.addEventListener('change', () => {
        filters.ageGroup = ageGroupFilter.value;
        renderGlobalRankings().catch(err => console.error('Error rendering global rankings:', err));
    });

    // Country filter change
    countryFilter.addEventListener('change', () => {
        filters.country = countryFilter.value;
        renderGlobalRankings().catch(err => console.error('Error rendering global rankings:', err));
    });

    // Clear all filters
    clearButton.addEventListener('click', () => {
        filters = {
            gender: 'all',
            ageGroup: 'all',
            country: 'all'
        };
        genderFilter.value = 'all';
        ageGroupFilter.value = 'all';
        countryFilter.value = 'all';
        renderGlobalRankings().catch(err => console.error('Error rendering global rankings:', err));
    });
}

// Make functions available globally
window.renderSeasonStandings = renderSeasonStandings;
window.renderGlobalRankings = renderGlobalRankings;
window.renderTeamRankings = renderTeamRankings;
