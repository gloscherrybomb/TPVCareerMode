// Standings Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { getARRBand, getCountryCode2 } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { makeNameClickable } from './bot-profile-modal.js';
import { initRiderProfileModal, makeRiderNameClickable } from './rider-profile-modal.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize rider profile modal
initRiderProfileModal(db);

let currentUser = null;
let currentUserData = null;

// Season switcher state
let standingsSeasonSwitcher = null;
let viewingSeason = 1;

// Filter state
let filters = {
    gender: 'all',
    ageGroup: 'all',
    country: 'all',
    searchTerm: ''
};

// Pagination state for global rankings
const RANKINGS_PER_PAGE = 50;
let currentRankingsPage = 1;
let allGlobalRankings = []; // Store fetched data for display
let lastVisibleDoc = null; // Cursor for Firestore pagination
let hasMoreRankings = true; // Track if more data is available
let isLoadingMoreRankings = false; // Prevent duplicate loads
let totalRegisteredUsers = null; // Total count of registered (non-bot) users

// Initialize season switcher for standings
function initStandingsSeasonSwitcher() {
    if (!window.SeasonSwitcher) {
        console.warn('SeasonSwitcher not loaded');
        return;
    }

    // Get initial viewing season from URL or localStorage
    viewingSeason = window.getViewingSeasonFromUrl ?
        window.getViewingSeasonFromUrl(1) : 1;

    standingsSeasonSwitcher = new window.SeasonSwitcher({
        containerId: 'standingsSeasonSwitcher',
        userData: currentUserData,
        currentSeason: currentUserData?.currentSeason || 1,
        viewingSeason: viewingSeason,
        showLabels: true,
        mode: 'compact',
        onSeasonChange: handleStandingsSeasonChange
    });

    standingsSeasonSwitcher.render();
    updateStandingsTitle();
}

// Handle season change from the switcher
function handleStandingsSeasonChange(newSeason) {
    console.log(`Standings: Season ${newSeason} selected`);
    viewingSeason = newSeason;

    updateStandingsTitle();
    updateStandingsHistoryBanner();
    renderSeasonStandings(true); // Force refresh for new season
}

// Update the season standings title
function updateStandingsTitle() {
    const title = document.getElementById('seasonStandingsTitle');
    if (!title) return;

    const seasonConfig = window.seasonConfig?.getSeasonConfig?.(viewingSeason);
    if (seasonConfig) {
        title.textContent = `${seasonConfig.name} - ${seasonConfig.subtitle}`;
    } else {
        title.textContent = `Season ${viewingSeason}`;
    }
}

// Show/hide history banner when viewing a past completed season
function updateStandingsHistoryBanner() {
    const banner = document.getElementById('standingsHistoryBanner');
    if (!banner) return;

    if (standingsSeasonSwitcher && standingsSeasonSwitcher.isViewingHistory()) {
        const seasonConfig = window.seasonConfig?.getSeasonConfig?.(viewingSeason);
        const seasonName = seasonConfig ?
            `${seasonConfig.name} - ${seasonConfig.subtitle}` :
            `Season ${viewingSeason}`;

        banner.innerHTML = `
            <div class="season-history-banner">
                <span class="season-history-banner__text">
                    <strong>Viewing History:</strong> ${seasonName} (Completed)
                </span>
                ${window.createReturnToCurrentButton ?
                    window.createReturnToCurrentButton(standingsSeasonSwitcher.currentSeason, (s) => {
                        standingsSeasonSwitcher.update({ viewingSeason: s });
                        handleStandingsSeasonChange(s);
                    }) : ''
                }
            </div>
        `;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

// Update season switcher when user data is available
function updateStandingsSeasonSwitcherWithUserData(userData) {
    currentUserData = userData;

    if (!standingsSeasonSwitcher) {
        initStandingsSeasonSwitcher();
    }

    if (standingsSeasonSwitcher) {
        const currentSeason = userData?.currentSeason || 1;
        standingsSeasonSwitcher.update({
            userData: userData,
            currentSeason: currentSeason,
            viewingSeason: viewingSeason
        });
        updateStandingsHistoryBanner();
    }
}

// Apply filters to rankings
function applyFilters(rankings) {
    return rankings.filter(racer => {
        // Name search filter
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const nameMatch = racer.name.toLowerCase().includes(searchLower);
            if (!nameMatch) {
                return false;
            }
        }

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
        const lockedIcon = window.TPVIcons ? window.TPVIcons.getIcon('locked', { size: 'xl' }) : '🔒';
        seasonContent.innerHTML = `
            <div class="login-prompt">
                <div class="login-prompt-icon">${lockedIcon}</div>
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

    // Cache key includes season number
    const cacheKey = `${SEASON_STANDINGS_CACHE_KEY}_s${viewingSeason}_${currentUser.uid}`;
    const timestampKey = `${SEASON_STANDINGS_TIMESTAMP_KEY}_s${viewingSeason}_${currentUser.uid}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(timestampKey);
        const now = Date.now();

        if (cachedData && cacheTimestamp) {
            const cacheAge = now - parseInt(cacheTimestamp);
            if (cacheAge < CACHE_DURATION) {
                console.log(`📦 Using cached season ${viewingSeason} standings (${Math.round(cacheAge / 1000)}s old)`);
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
    console.log(`🔄 Fetching fresh season ${viewingSeason} standings from Firestore...`);

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

    // Get standings for the selected season using season data helpers
    if (window.seasonDataHelpers?.getSeasonData) {
        const seasonData = window.seasonDataHelpers.getSeasonData(userData, viewingSeason);
        standings = seasonData?.standings || [];
    } else {
        // Fallback: direct access based on season number
        if (viewingSeason === 1) {
            standings = userData.season1Standings || [];
        } else {
            standings = userData?.seasons?.[`season${viewingSeason}`]?.standings || [];
        }
    }

    // Store in cache
    localStorage.setItem(
        cacheKey,
        JSON.stringify({ standings, userData })
    );
    localStorage.setItem(
        timestampKey,
        Date.now().toString()
    );
    console.log(`✅ Cached season ${viewingSeason} standings for user ${currentUser.uid}`);

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
        console.log(`No stored standings found for season ${viewingSeason}, calculating from results...`);
        standings = await calculateRealSeasonStandings(viewingSeason);
    } else {
        console.log(`Using stored season ${viewingSeason} standings with backfilled data`);
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
        const statsIcon = window.TPVIcons ? window.TPVIcons.getIcon('stats', { size: 'xl' }) : '📊';
        seasonContent.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${statsIcon}</div>
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
const TOTAL_USERS_CACHE_KEY = 'totalRegisteredUsers';
const TOTAL_USERS_TIMESTAMP_KEY = 'totalRegisteredUsersTimestamp';

// Fetch total count of registered (non-bot) users
async function fetchTotalRegisteredUsers(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
        const cachedCount = localStorage.getItem(TOTAL_USERS_CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(TOTAL_USERS_TIMESTAMP_KEY);
        const now = Date.now();

        if (cachedCount && cacheTimestamp) {
            const cacheAge = now - parseInt(cacheTimestamp);
            if (cacheAge < CACHE_DURATION) {
                totalRegisteredUsers = parseInt(cachedCount);
                console.log(`📦 Using cached total users count: ${totalRegisteredUsers}`);
                return totalRegisteredUsers;
            }
        }
    }

    try {
        console.log('🔄 Fetching total registered users count...');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let count = 0;

        usersSnapshot.forEach((doc) => {
            // Skip bots
            if (!doc.id.startsWith('Bot')) {
                count++;
            }
        });

        totalRegisteredUsers = count;
        localStorage.setItem(TOTAL_USERS_CACHE_KEY, count.toString());
        localStorage.setItem(TOTAL_USERS_TIMESTAMP_KEY, Date.now().toString());
        console.log(`✅ Total registered users: ${totalRegisteredUsers}`);
        return totalRegisteredUsers;
    } catch (error) {
        console.error('Error fetching total users count:', error);
        return null;
    }
}

// Render Global High Scores with cursor-based pagination
async function renderGlobalRankings(forceRefresh = false, loadMore = false) {
    const globalContent = document.getElementById('individualRankings');

    try {
        // If loading more, don't reset state
        if (!loadMore) {
            // Check cache first (unless force refresh) - only for initial load
            if (!forceRefresh) {
                const cachedData = localStorage.getItem(GLOBAL_RANKINGS_CACHE_KEY);
                const cacheTimestamp = localStorage.getItem(GLOBAL_RANKINGS_TIMESTAMP_KEY);
                const now = Date.now();

                if (cachedData && cacheTimestamp) {
                    const cacheAge = now - parseInt(cacheTimestamp);
                    if (cacheAge < CACHE_DURATION) {
                        console.log(`📦 Using cached global high scores (${Math.round(cacheAge / 1000)}s old)`);
                        const cachedData_parsed = JSON.parse(cachedData);

                        // Handle backwards compatibility - old cache was array, new is object
                        const cachedRankings = Array.isArray(cachedData_parsed)
                            ? { rankings: cachedData_parsed, hasMore: true }
                            : cachedData_parsed;

                        // Filter out bots from cached data (in case cache has old data with bots)
                        let rankings = cachedRankings.rankings.filter(r => !r.uid.startsWith('Bot'));

                        console.log('Global High Scores - Total racers:', rankings.length);

                        // Mark current user
                        if (currentUser) {
                            rankings = rankings.map(r => ({
                                ...r,
                                isCurrentUser: r.uid === currentUser.uid
                            }));
                        }

                        // Restore pagination state from cache
                        allGlobalRankings = rankings;
                        hasMoreRankings = cachedRankings.hasMore;
                        // Note: lastVisibleDoc can't be cached, so we'll need to re-fetch if loading more
                        lastVisibleDoc = null;
                        currentRankingsPage = 1;

                        // Fetch total count (in background, don't block rendering)
                        fetchTotalRegisteredUsers().then(() => {
                            // Re-render to update the count display
                            renderGlobalRankingsTable(globalContent);
                        });

                        // Render the table
                        renderGlobalRankingsTable(globalContent);
                        return rankings;
                    }
                }
            }

            // Reset pagination state for fresh load
            allGlobalRankings = [];
            lastVisibleDoc = null;
            hasMoreRankings = true;
            currentRankingsPage = 1;

            // Fetch total count (in parallel with rankings fetch)
            fetchTotalRegisteredUsers(forceRefresh);
        }

        // Prevent duplicate loads
        if (isLoadingMoreRankings) {
            console.log('⏳ Already loading more rankings, skipping...');
            return allGlobalRankings;
        }
        isLoadingMoreRankings = true;

        // Build query with cursor if loading more
        console.log(loadMore ? '🔄 Loading more rankings...' : '🔄 Fetching global high scores from Firestore...');

        // If loading more but no cursor (e.g., restored from cache), we need to re-fetch from scratch
        if (loadMore && !lastVisibleDoc) {
            console.log('⚠️ No cursor available (loaded from cache). Re-fetching from Firestore...');
            allGlobalRankings = [];
            loadMore = false;
        }

        let usersQuery;
        if (loadMore && lastVisibleDoc) {
            usersQuery = query(
                collection(db, 'users'),
                orderBy('careerPoints', 'desc'),
                startAfter(lastVisibleDoc),
                limit(RANKINGS_PER_PAGE)
            );
        } else {
            usersQuery = query(
                collection(db, 'users'),
                orderBy('careerPoints', 'desc'),
                limit(RANKINGS_PER_PAGE)
            );
        }

        console.log('📡 Executing Firestore query...');
        const usersSnapshot = await getDocs(usersQuery);
        console.log(`📊 Firestore returned ${usersSnapshot.size} documents`);

        // Store the last document for cursor-based pagination
        if (usersSnapshot.docs.length > 0) {
            lastVisibleDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];
        }

        // Check if there are more results
        hasMoreRankings = usersSnapshot.docs.length === RANKINGS_PER_PAGE;

        const newRankings = [];
        usersSnapshot.forEach((doc) => {
            const data = doc.data();

            // Skip bots - global high scores are for human riders only
            if (doc.id.startsWith('Bot')) {
                return;
            }

            // Use careerPoints for global high scores (lifetime achievement)
            const points = data.careerPoints || 0;
            const currentSeason = data.currentSeason || 1;

            // Check if current season is complete (rider finished but hasn't progressed)
            let seasonCompleted = false;
            if (currentSeason === 1) {
                seasonCompleted = data.season1Complete === true;
            } else {
                seasonCompleted = data?.seasons?.[`season${currentSeason}`]?.complete === true;
            }

            newRankings.push({
                uid: doc.id,
                name: data.name || 'Unknown',
                team: data.team || '',
                season: currentSeason,
                seasonCompleted: seasonCompleted,
                events: data.careerTotalEvents || data.completedStages?.length || 0,
                points: points,
                gender: data.gender || null,
                ageBand: data.ageBand || null,
                country: data.country || null,
                isContributor: data.isContributor || false,
                hasMoneyBags: data.hasHighRollerFlair || false,
                isCurrentUser: currentUser && doc.id === currentUser.uid
            });
        });

        // Append new rankings to existing (or set if initial load)
        if (loadMore) {
            allGlobalRankings = [...allGlobalRankings, ...newRankings];
        } else {
            allGlobalRankings = newRankings;
        }

        console.log(`✅ Total rankings loaded: ${allGlobalRankings.length}`);

        // Cache only the initial load
        if (!loadMore && allGlobalRankings.length > 0) {
            const cacheData = {
                rankings: allGlobalRankings,
                hasMore: hasMoreRankings
            };
            localStorage.setItem(GLOBAL_RANKINGS_CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(GLOBAL_RANKINGS_TIMESTAMP_KEY, Date.now().toString());
            console.log(`✅ Cached ${allGlobalRankings.length} global high scores`);
        }

        // Populate country filter with available countries (on initial load)
        if (!loadMore) {
            populateCountryFilter(allGlobalRankings);
        }

        isLoadingMoreRankings = false;

        // Render the table
        renderGlobalRankingsTable(globalContent);
        return allGlobalRankings;
    } catch (error) {
        console.error('Error loading global high scores:', error);
        isLoadingMoreRankings = false;
        globalContent.innerHTML = `
            <div class="error-state">
                <p>Error loading rankings. Please try again later.</p>
            </div>
        `;
        return [];
    }
}

// Separate function to render the global high scores table with pagination
function renderGlobalRankingsTable(globalContent, appendMode = false) {
    console.log('renderGlobalRankingsTable - Total rankings loaded:', allGlobalRankings.length);
    console.log('renderGlobalRankingsTable - Current filters:', filters);
    console.log('renderGlobalRankingsTable - Has more:', hasMoreRankings);

    // Apply filters to loaded rankings
    const filteredRankings = applyFilters(allGlobalRankings);
    console.log('renderGlobalRankingsTable - After filters:', filteredRankings.length);

    // Sort by total points (descending) - data should already be sorted but ensure consistency
    filteredRankings.sort((a, b) => b.points - a.points);

    // Display all loaded rankings (server-side pagination handles limiting)
    const displayRankings = filteredRankings;

    console.log('renderGlobalRankingsTable - Showing:', displayRankings.length);

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

        if (displayRankings.length === 0) {
            const emptyStatsIcon = window.TPVIcons ? window.TPVIcons.getIcon('stats', { size: 'lg' }) : '📊';

            // Check if this is due to search
            const isSearchActive = filters.searchTerm && filters.searchTerm.length > 0;
            const emptyMessage = isSearchActive
                ? `No riders found matching "${filters.searchTerm}"`
                : 'No riders match the selected filters.';
            const emptySubMessage = isSearchActive
                ? 'Try a different search term or clear the search.'
                : 'Try adjusting your filter selections.';

            tableHTML += `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">${emptyStatsIcon}</div>
                        <p><strong>${emptyMessage}</strong></p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">${emptySubMessage}</p>
                    </td>
                </tr>
            `;
        } else {
            displayRankings.forEach((racer, index) => {
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

                // Contributor badge
                const contributorBadge = racer.isContributor ? '<span class="contributor-badge" title="TPV Contributor">' + (window.TPVIcons ? window.TPVIcons.getIcon('contributorStar', { size: 'xs' }) : '⭐') + '</span>' : '';

                // Money Bags indicator
                const moneyBagsIcon = window.TPVIcons ? window.TPVIcons.getIcon('moneyBag', { size: 'sm' }) : '💰';
                const moneyBagsIndicator = racer.hasMoneyBags ? `<span class="money-bags-indicator" title="Money Bags">${moneyBagsIcon}</span>` : '';

                tableHTML += `
                    <tr class="${rowClass}">
                        <td class="rank-cell">
                            <span class="rank-number ${rankClass}">${rank}</span>
                        </td>
                        <td class="name-cell">
                            <span class="rider-name">${nameHTML}</span>
                            ${moneyBagsIndicator}
                            ${contributorBadge}
                            ${countryFlagHTML}
                            ${racer.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                        </td>
                        <td class="season-cell">Season ${racer.season}${racer.seasonCompleted ? '<span class="season-completed-marker" title="Season completed">*</span>' : ''}</td>
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

    // Add pagination controls
    const showLoadMore = hasMoreRankings && !isLoadingMoreRankings;
    let statusText;
    if (totalRegisteredUsers !== null) {
        statusText = `Showing ${displayRankings.length} of ${totalRegisteredUsers} riders`;
    } else if (hasMoreRankings) {
        statusText = `Showing ${displayRankings.length} riders`;
    } else {
        statusText = `Showing all ${displayRankings.length} riders`;
    }

    tableHTML += `
        <div id="rankingsPaginationControls" class="pagination-controls" style="display: ${displayRankings.length > 0 ? 'flex' : 'none'}; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; padding: 1rem;">
            <button id="loadMoreRankingsBtn" class="btn btn-secondary" style="display: ${showLoadMore ? 'inline-block' : 'none'};">
                Load More Rankings
            </button>
            <span id="rankingsPaginationStatus" class="pagination-status" style="color: var(--text-secondary); font-size: 0.9rem;">
                ${statusText}
            </span>
        </div>
    `;

    globalContent.innerHTML = tableHTML;

    // Attach event listener to Load More button
    const loadMoreBtn = document.getElementById('loadMoreRankingsBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', handleLoadMoreRankings);
    }
}

// Handle Load More button click - fetch next batch from Firestore
async function handleLoadMoreRankings() {
    // Fetch next batch from Firestore (loadMore = true)
    await renderGlobalRankings(false, true);
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
                points: data.careerPoints || 0,
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
            const emptyTrophyIcon = window.TPVIcons ? window.TPVIcons.getIcon('trophy', { size: 'lg' }) : '🏆';
            tableHTML += `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-icon">${emptyTrophyIcon}</div>
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

    // Function to switch tabs
    function switchToTab(tab) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        const targetButton = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (targetButton) targetButton.classList.add('active');

        if (tab === 'season') {
            seasonContent.classList.add('active');
            globalContent.classList.remove('active');
        } else if (tab === 'global') {
            seasonContent.classList.remove('active');
            globalContent.classList.add('active');
        }
    }

    // Check URL hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash === 'season' || hash === 'global') {
        switchToTab(hash);
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchToTab(tab);
            // Update URL hash without scrolling
            history.replaceState(null, null, `#${tab}`);
        });
    });
}

// Initialize on auth state change
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // Load user data for season switcher
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                updateStandingsSeasonSwitcherWithUserData(userData);
            }
        } catch (err) {
            console.warn('Error loading user data for season switcher:', err);
        }
    }

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
    initStandingsSeasonSwitcher(); // Initialize season switcher
    renderSeasonStandings();
    renderGlobalRankings().catch(err => console.error('Error rendering global high scores:', err));
    renderTeamRankings();
});

// Initialize filter event listeners
function initFilters() {
    const genderFilter = document.getElementById('genderFilter');
    const ageGroupFilter = document.getElementById('ageGroupFilter');
    const countryFilter = document.getElementById('countryFilter');
    const clearButton = document.getElementById('clearFilters');
    const riderSearchInput = document.getElementById('riderSearchInput');
    const clearRiderSearch = document.getElementById('clearRiderSearch');
    const jumpToMeBtn = document.getElementById('jumpToMeBtn');

    // Helper to re-render with pagination reset (uses cached data if available)
    function applyFilterAndRender() {
        currentRankingsPage = 1; // Reset pagination when filters change
        if (allGlobalRankings.length > 0) {
            // Use cached data - just re-render
            const globalContent = document.getElementById('individualRankings');
            renderGlobalRankingsTable(globalContent);
        } else {
            // No cached data yet - fetch fresh
            renderGlobalRankings().catch(err => console.error('Error rendering global high scores:', err));
        }
    }

    // Gender filter change
    genderFilter.addEventListener('change', () => {
        filters.gender = genderFilter.value;
        applyFilterAndRender();
    });

    // Age group filter change
    ageGroupFilter.addEventListener('change', () => {
        filters.ageGroup = ageGroupFilter.value;
        applyFilterAndRender();
    });

    // Country filter change
    countryFilter.addEventListener('change', () => {
        filters.country = countryFilter.value;
        applyFilterAndRender();
    });

    // Search input handling with debounce
    if (riderSearchInput) {
        let searchTimeout;
        riderSearchInput.addEventListener('input', (e) => {
            const value = e.target.value;

            // Show/hide clear button
            if (clearRiderSearch) {
                clearRiderSearch.classList.toggle('visible', value.length > 0);
            }

            // Debounce the search (300ms delay)
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filters.searchTerm = value.trim();
                applyFilterAndRender();
            }, 300);
        });
    }

    // Clear search button
    if (clearRiderSearch) {
        clearRiderSearch.addEventListener('click', () => {
            if (riderSearchInput) {
                riderSearchInput.value = '';
            }
            clearRiderSearch.classList.remove('visible');
            filters.searchTerm = '';
            applyFilterAndRender();
        });
    }

    // Jump to Me button
    if (jumpToMeBtn) {
        jumpToMeBtn.addEventListener('click', handleJumpToMe);
    }

    // Clear all filters (including search)
    clearButton.addEventListener('click', () => {
        filters = {
            gender: 'all',
            ageGroup: 'all',
            country: 'all',
            searchTerm: ''
        };
        genderFilter.value = 'all';
        ageGroupFilter.value = 'all';
        countryFilter.value = 'all';

        // Clear search input
        if (riderSearchInput) {
            riderSearchInput.value = '';
        }
        if (clearRiderSearch) {
            clearRiderSearch.classList.remove('visible');
        }

        applyFilterAndRender();
    });
}

// Handle "Jump to Me" button click
function handleJumpToMe() {
    // Check if user is logged in
    if (!currentUser) {
        showJumpToMeMessage('Please log in to find your position');
        return;
    }

    // Find current user row in the Global High Scores section
    const globalContent = document.getElementById('globalContent');
    const currentUserRow = globalContent ? globalContent.querySelector('.current-user-row') : null;

    if (!currentUserRow) {
        // User not in currently displayed rankings
        showJumpToMeMessage('Load more results or clear filters to find your position');
        return;
    }

    // Scroll to the row
    currentUserRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    // Add highlight flash animation
    currentUserRow.classList.add('highlight-flash');

    // Remove animation class after completion
    setTimeout(() => {
        currentUserRow.classList.remove('highlight-flash');
    }, 1500);
}

// Show temporary message for Jump to Me button
function showJumpToMeMessage(message) {
    const jumpToMeBtn = document.getElementById('jumpToMeBtn');
    if (!jumpToMeBtn) return;

    // Store original content
    const originalHTML = jumpToMeBtn.innerHTML;

    // Show message state
    jumpToMeBtn.innerHTML = `<span style="font-size: 0.75rem;">${message}</span>`;
    jumpToMeBtn.disabled = true;

    // Restore after 3 seconds
    setTimeout(() => {
        jumpToMeBtn.innerHTML = originalHTML;
        jumpToMeBtn.disabled = false;
    }, 3000);
}

// Make functions available globally
window.renderSeasonStandings = renderSeasonStandings;
window.renderGlobalRankings = renderGlobalRankings;
window.renderTeamRankings = renderTeamRankings;
