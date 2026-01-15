// Profile Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { getInitials, formatTime, getOrdinalSuffix, getARRBand, formatDate, getCountryCode2, getHighResPhotoURL, escapeHtml } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { displayPersonality } from './profile-personality.js';
import { displayPersonalityAwards } from './personality-awards-display.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// Access eventData from global scope (loaded via script tag in HTML)

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;
let userStats = null;

// Season switcher state
let profileSeasonSwitcher = null;
let viewingSeason = 1;

// Initialize profile season switcher
function initProfileSeasonSwitcher() {
    if (!window.SeasonSwitcher) {
        console.warn('SeasonSwitcher not loaded');
        return;
    }

    // Get initial viewing season from URL or localStorage
    viewingSeason = window.getViewingSeasonFromUrl ?
        window.getViewingSeasonFromUrl(userData?.currentSeason || 1) : 1;

    profileSeasonSwitcher = new window.SeasonSwitcher({
        containerId: 'profileSeasonSwitcher',
        userData: userData,
        currentSeason: userData?.currentSeason || 1,
        viewingSeason: viewingSeason,
        showLabels: true,
        mode: 'compact',
        onSeasonChange: handleProfileSeasonChange
    });

    profileSeasonSwitcher.render();
    updateSeasonProgressDisplay();
}

// Handle season change from the switcher
function handleProfileSeasonChange(newSeason) {
    console.log(`Profile: Season ${newSeason} selected`);
    viewingSeason = newSeason;

    updateSeasonStats(viewingSeason);
    updateSeasonAwards(viewingSeason);
    updateSeasonProgressTitle();
    updateSeasonHistoryBanner();
    updateSeasonProgressDisplay();
}

// Update the season progress title
function updateSeasonProgressTitle() {
    const title = document.getElementById('seasonProgressTitle');
    if (!title) return;

    const seasonConfig = window.seasonConfig?.getSeasonConfig?.(viewingSeason);
    const isComplete = window.seasonConfig?.isSeasonComplete?.(userData, viewingSeason);

    if (seasonConfig) {
        title.textContent = isComplete ?
            `${seasonConfig.name} Complete` :
            `${seasonConfig.name} Progress`;
    } else {
        title.textContent = `Season ${viewingSeason} Progress`;
    }
}

// Show/hide history banner when viewing a past completed season
function updateSeasonHistoryBanner() {
    const banner = document.getElementById('profileHistoryBanner');
    if (!banner) return;

    if (profileSeasonSwitcher && profileSeasonSwitcher.isViewingHistory()) {
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
                    window.createReturnToCurrentButton(profileSeasonSwitcher.currentSeason, (s) => {
                        profileSeasonSwitcher.update({ viewingSeason: s });
                        handleProfileSeasonChange(s);
                    }) : ''
                }
            </div>
        `;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

// Update the season progress display based on viewing season
function updateSeasonProgressDisplay() {
    const activeProgress = document.getElementById('activeSeasonProgress');
    const completedSummary = document.getElementById('completedSeasonSummary');

    if (!activeProgress || !completedSummary) return;

    const isComplete = window.seasonConfig?.isSeasonComplete?.(userData, viewingSeason);
    const currentSeason = userData?.currentSeason || 1;
    const isViewingCurrentSeason = viewingSeason === currentSeason;

    if (isComplete && !isViewingCurrentSeason) {
        // Viewing a completed past season - show summary
        activeProgress.style.display = 'none';
        completedSummary.style.display = 'block';
        displayCompletedSeasonSummary(viewingSeason);
    } else {
        // Viewing current (or in-progress) season - show progress
        activeProgress.style.display = 'block';
        completedSummary.style.display = 'none';
        displayActiveSeasonProgress(viewingSeason);
    }

    updateSeasonProgressTitle();
}

// Display progress for active season
function displayActiveSeasonProgress(seasonId) {
    if (!userData) return;

    const seasonConfig = window.seasonConfig?.getSeasonConfig?.(seasonId);
    const seasonData = window.seasonDataHelpers?.getSeasonData?.(userData, seasonId);

    if (!seasonData) {
        // No data for this season
        document.getElementById('currentStage').textContent = 'Stage 1';
        document.getElementById('completedEvents').textContent = '0';
        document.getElementById('progressFill').style.width = '0%';
        return;
    }

    const currentStage = seasonData.currentStage || 1;
    const completedStages = seasonData.completedStages?.length || 0;
    const totalStages = seasonConfig?.stageCount || 9;

    document.getElementById('currentStage').textContent = `Stage ${currentStage}`;
    document.getElementById('completedEvents').textContent = completedStages;

    const progressPercent = Math.round((completedStages / totalStages) * 100);
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
}

// Display summary for completed season
function displayCompletedSeasonSummary(seasonId) {
    const container = document.getElementById('completedSeasonSummary');
    if (!container || !userData) return;

    const seasonConfig = window.seasonConfig?.getSeasonConfig?.(seasonId);
    const seasonStats = window.seasonDataHelpers?.getSeasonStats?.(userData, seasonId);
    const seasonData = window.seasonDataHelpers?.getSeasonData?.(userData, seasonId);

    if (!seasonStats && !seasonData) {
        container.innerHTML = `
            <div class="season-stats-card">
                <p style="text-align: center; color: var(--text-secondary);">
                    No data available for this season.
                </p>
            </div>
        `;
        return;
    }

    const stats = seasonStats || {};
    const data = seasonData || {};

    // Format completion date
    let completionDateStr = 'N/A';
    if (data.completionDate) {
        const date = data.completionDate.toDate ? data.completionDate.toDate() : new Date(data.completionDate);
        completionDateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Get ordinal suffix for rank
    const rankSuffix = data.rank ? getOrdinalSuffix(data.rank) : '';

    container.innerHTML = `
        <div class="season-stats-card">
            <div class="season-stats-card__header">
                <div class="season-stats-card__title">
                    <span class="season-stats-card__title-icon">&#127942;</span>
                    ${seasonConfig?.name || 'Season ' + seasonId} Complete
                </div>
                <div class="season-stats-card__date">
                    Completed: ${completionDateStr}
                </div>
            </div>

            <div class="season-stats-card__grid">
                <div class="season-stats-card__stat season-stats-card__stat--rank">
                    <div class="season-stats-card__stat-value">
                        ${data.rank || '-'}<span class="season-stats-card__rank-suffix">${rankSuffix}</span>
                    </div>
                    <div class="season-stats-card__stat-label">Final Rank</div>
                </div>
                <div class="season-stats-card__stat">
                    <!-- totalPoints fallback for legacy data; prefer stats.totalPoints from season1Points -->
                    <div class="season-stats-card__stat-value">${stats.totalPoints || data.totalPoints || 0}</div>
                    <div class="season-stats-card__stat-label">Total Points</div>
                </div>
                <div class="season-stats-card__stat">
                    <div class="season-stats-card__stat-value">${stats.wins || 0}</div>
                    <div class="season-stats-card__stat-label">Wins</div>
                </div>
                <div class="season-stats-card__stat">
                    <div class="season-stats-card__stat-value">${stats.podiums || 0}</div>
                    <div class="season-stats-card__stat-label">Podiums</div>
                </div>
                <div class="season-stats-card__stat">
                    <div class="season-stats-card__stat-value">${stats.bestFinish || '-'}</div>
                    <div class="season-stats-card__stat-label">Best Finish</div>
                </div>
                <div class="season-stats-card__stat">
                    <div class="season-stats-card__stat-value">${stats.eventsCompleted || '-'}</div>
                    <div class="season-stats-card__stat-label">Events</div>
                </div>
            </div>

            ${data.completionStory ? `
                <div class="season-stats-card__story">
                    <div class="season-stats-card__story-title">Season Wrap-Up</div>
                    <div class="season-stats-card__story-content">${data.completionStory}</div>
                </div>
            ` : ''}
        </div>
    `;
}

// Update season statistics when season changes
function updateSeasonStats(seasonId) {
    const seasonStats = window.seasonDataHelpers?.getSeasonStats?.(userData, seasonId);

    if (!seasonStats) {
        // No data for this season - show defaults
        document.getElementById('seasonRank').textContent = '-';
        document.getElementById('avgFinish').textContent = '-';
        document.getElementById('winRate').textContent = '0%';
        document.getElementById('podiumRate').textContent = '0%';
        document.getElementById('seasonRaces').textContent = '0';
        document.getElementById('seasonWins').textContent = '0';
        document.getElementById('seasonPodiums').textContent = '0';
        document.getElementById('seasonPoints').textContent = '0';
        return;
    }

    // Update season stats display
    document.getElementById('avgFinish').textContent = seasonStats.averageFinish
        ? Math.round(seasonStats.averageFinish) + getOrdinalSuffix(seasonStats.averageFinish)
        : '-';

    // Calculate win rate and podium rate
    const events = seasonStats.eventsCompleted || 0;
    const winRate = events > 0 ? Math.round((seasonStats.wins / events) * 100) : 0;
    const podiumRate = events > 0 ? Math.round((seasonStats.podiums / events) * 100) : 0;

    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('podiumRate').textContent = `${podiumRate}%`;
    document.getElementById('seasonRaces').textContent = events;
    document.getElementById('seasonWins').textContent = seasonStats.wins || 0;
    document.getElementById('seasonPodiums').textContent = seasonStats.podiums || 0;
    document.getElementById('seasonPoints').textContent = seasonStats.totalPoints || 0;

    // Update season rank if available
    if (seasonStats.finalRank) {
        document.getElementById('seasonRank').textContent = `#${seasonStats.finalRank}`;
    }
}

// Update awards display for selected season
function updateSeasonAwards(seasonId) {
    const awards = calculateSeasonAwards(userData, seasonId);
    displayAwards(awards);
}

// Calculate awards earned in a specific season from event results
function calculateSeasonAwards(userData, seasonId) {
    const seasonConfig = window.seasonConfig?.getSeasonConfig?.(seasonId);
    if (!seasonConfig || !seasonConfig.events) return {};

    const awards = {
        gold: 0, silver: 0, bronze: 0, lanternRouge: 0,
        punchingMedal: 0, giantKiller: 0, bullseye: 0, hotStreak: 0,
        domination: 0, closeCall: 0, photoFinish: 0, darkHorse: 0,
        zeroToHero: 0, windTunnel: 0, theAccountant: 0
    };

    // Loop through events in this season
    for (const eventId of Object.keys(seasonConfig.events)) {
        const eventResults = window.seasonDataHelpers?.getEventResults?.(userData, parseInt(eventId));
        if (!eventResults || eventResults.position === 'DNF') continue;

        const position = eventResults.position;

        // Count position-based medals
        if (position === 1) awards.gold++;
        else if (position === 2) awards.silver++;
        else if (position === 3) awards.bronze++;

        // Check for lantern rouge (last place)
        if (eventResults.totalFinishers && position === eventResults.totalFinishers) {
            awards.lanternRouge++;
        }

        // Count earned medals from event results
        if (eventResults.earnedPunchingMedal) awards.punchingMedal++;
        if (eventResults.earnedGiantKillerMedal) awards.giantKiller++;
        if (eventResults.earnedBullseyeMedal) awards.bullseye++;
        if (eventResults.earnedHotStreakMedal) awards.hotStreak++;
        if (eventResults.earnedDomination) awards.domination++;
        if (eventResults.earnedCloseCall) awards.closeCall++;
        if (eventResults.earnedPhotoFinish) awards.photoFinish++;
        if (eventResults.earnedDarkHorse) awards.darkHorse++;
        if (eventResults.earnedZeroToHero) awards.zeroToHero++;
        if (eventResults.earnedWindTunnel) awards.windTunnel++;
        if (eventResults.earnedTheAccountant) awards.theAccountant++;
    }

    return awards;
}

// Show/hide sections based on auth state
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
}

function showLoginPrompt() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
}

function showProfileContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
}

// Calculate user statistics from race results
async function calculateUserStats(userUID, userData) {
    // NOTE: Most career stats are stored in userData and passed in.
    // This function just extracts positions and recent results from event results already in userData.
    
    const stats = {
        positions: [],
        recentResults: [],
        awards: {} // Will be overwritten by stored values
    };
    
    // Extract positions and recent results from userData event results
    for (let eventNum = 1; eventNum <= 15; eventNum++) {
        const eventResults = userData[`event${eventNum}Results`];
        
        if (eventResults && eventResults.position && eventResults.position !== 'DNF') {
            const position = eventResults.position;
            
            // Track positions array (for charts/graphs)
            if (position > 0) {
                stats.positions.push(position);
            }
            
            // Add to recent results
            stats.recentResults.push({
                eventNum: eventNum,
                stageNumber: eventResults.stageNumber || null, // Stage when this event was completed
                eventName: window.eventData?.[eventNum]?.name || `Event ${eventNum}`,
                position: position,
                time: eventResults.time || 'N/A',
                points: eventResults.points || 0,
                bonusPoints: eventResults.bonusPoints || 0,
                unlockBonusPoints: eventResults.unlockBonusPoints || 0,
                earnedCadenceCredits: eventResults.earnedCadenceCredits || 0,
                ccSource: eventResults.ccSource || 'awards',
                predictedPosition: eventResults.predictedPosition || null,
                earnedPunchingMedal: eventResults.earnedPunchingMedal || false,
                earnedGiantKillerMedal: eventResults.earnedGiantKillerMedal || false,
                earnedBullseyeMedal: eventResults.earnedBullseyeMedal || false,
                earnedHotStreakMedal: eventResults.earnedHotStreakMedal || false,
                earnedDomination: eventResults.earnedDomination || false,
                earnedCloseCall: eventResults.earnedCloseCall || false,
                earnedPhotoFinish: eventResults.earnedPhotoFinish || false,
                earnedDarkHorse: eventResults.earnedDarkHorse || false,
                earnedZeroToHero: eventResults.earnedZeroToHero || false,
                raceDate: eventResults.raceDate,
                processedAt: eventResults.processedAt
            });
        }
    }

    // Also check special events (101, 102, etc.)
    const specialEventIds = [101, 102];
    const specialEventNames = {
        101: 'Singapore Criterium',
        102: 'The Leveller'
    };

    for (const eventNum of specialEventIds) {
        const eventResults = userData[`event${eventNum}Results`];

        if (eventResults && eventResults.position && eventResults.position !== 'DNF') {
            const position = eventResults.position;

            if (position > 0) {
                stats.positions.push(position);
            }

            stats.recentResults.push({
                eventNum: eventNum,
                stageNumber: null, // Special events don't have stage numbers
                eventName: specialEventNames[eventNum] || `Special Event ${eventNum}`,
                position: position,
                time: eventResults.time || 'N/A',
                points: eventResults.points || 0,
                bonusPoints: eventResults.bonusPoints || 0,
                unlockBonusPoints: eventResults.unlockBonusPoints || 0,
                earnedCadenceCredits: eventResults.earnedCadenceCredits || 0,
                ccSource: eventResults.ccSource || 'awards',
                predictedPosition: eventResults.predictedPosition || null,
                earnedPunchingMedal: eventResults.earnedPunchingMedal || false,
                earnedGiantKillerMedal: eventResults.earnedGiantKillerMedal || false,
                earnedBullseyeMedal: eventResults.earnedBullseyeMedal || false,
                earnedHotStreakMedal: eventResults.earnedHotStreakMedal || false,
                earnedDomination: eventResults.earnedDomination || false,
                earnedCloseCall: eventResults.earnedCloseCall || false,
                earnedPhotoFinish: eventResults.earnedPhotoFinish || false,
                earnedDarkHorse: eventResults.earnedDarkHorse || false,
                earnedZeroToHero: eventResults.earnedZeroToHero || false,
                isSpecialEvent: true,
                raceDate: eventResults.raceDate,
                processedAt: eventResults.processedAt
            });
        }
    }

    // Sort recent results by completion timestamp (most recent first)
    // Prefer raceDate (actual race date from CSV filename) over processedAt (when results were processed)
    // This ensures results appear in the order they were actually completed, including special events
    stats.recentResults.sort((a, b) => {
        const aDate = a.raceDate || a.processedAt;
        const bDate = b.raceDate || b.processedAt;
        // Convert to timestamp for comparison (handles ISO strings and Firestore timestamps)
        const aTime = aDate ? (aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime()) : 0;
        const bTime = bDate ? (bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime()) : 0;
        return bTime - aTime; // Descending - most recent first
    });

    return stats;
}

// Calculate season ranking from standings data
async function calculateSeasonRanking(userUID, userData) {
    // Use season1Standings from user document - this is the authoritative source
    // that includes simulated bot results
    const standings = userData.season1Standings || [];

    if (standings.length === 0) {
        return { rank: null, total: 0 };
    }
    
    // Standings are already sorted by points (descending)
    // Find user's position by uid only (don't trust isCurrentUser flag)
    const userIndex = standings.findIndex(r => r.uid === userUID);

    if (userIndex === -1) {
        return { rank: null, total: standings.length };
    }
    
    return {
        rank: userIndex + 1,
        total: standings.length
    };
}

// Calculate global ranking (from user documents)
async function calculateGlobalRanking(userUID) {
    try {
        // Get all users and their career points (matches global high scores page)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                uid: doc.id,
                points: data.careerPoints || 0
            });
        });
        
        // Sort by points
        users.sort((a, b) => b.points - a.points);
        
        // Find user's rank
        const userRank = users.findIndex(u => u.uid === userUID) + 1;
        
        return {
            rank: userRank > 0 ? userRank : null,
            total: users.length
        };
    } catch (error) {
        console.error('Error calculating global ranking:', error);
        return { rank: null, total: 0 };
    }
}

// Load and display profile data
async function loadProfile(user) {
    showLoadingState();
    
    try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            console.log('User document not found, creating default document to fix persistence issue');

            // Create default user document to prevent login persistence issues
            const defaultUserData = {
                name: user.displayName || user.email || 'User',
                uid: null, // Will be filled in later via profile/settings
                email: user.email,
                currentStage: 1,
                completedStages: [],
                completedOptionalEvents: [],
                choiceSelections: {},
                totalPoints: 0,  // DEPRECATED: Use season1Points or careerPoints instead
                season1Points: 0,
                careerPoints: 0,
                createdAt: new Date()
            };

            try {
                await setDoc(doc(db, 'users', user.uid), defaultUserData);
                console.log('Default user document created successfully');
                userData = defaultUserData;
            } catch (createError) {
                console.error('Error creating default user document:', createError);
                showLoginPrompt();
                return;
            }
        } else {
            userData = userDoc.data();
        }

        // Store globally for share functionality
        window.currentUserData = userData;

        // Build stats object from stored data and calculated data
        // Stored stats (from results processing): wins, podiums, awards, etc.
        // Calculated stats (from user event results): recent results, positions array
        const calculatedStats = await calculateUserStats(userData.uid, userData);
        
        // Merge stored stats with calculated stats
        userStats = {
            // Career stats (for top quick stats section)
            totalRaces: userData.careerTotalEvents || 0,
            totalWins: userData.careerWins || 0,
            totalPodiums: userData.careerPodiums || 0,
            totalPoints: userData.careerPoints || 0,
            // Season stats (for Season Statistics section)
            seasonRaces: userData.season1TotalEvents || 0,
            seasonWins: userData.season1Wins || 0,
            seasonPodiums: userData.season1Podiums || 0,
            seasonTop10s: userData.season1Top10s || 0,
            seasonPoints: userData.season1Points || 0,
            bestFinish: userData.season1BestFinish || null,
            averageFinish: userData.season1AvgFinish || null,
            winRate: userData.season1WinRate || 0,
            podiumRate: userData.season1PodiumRate || 0,
            arr: userData.arr || null, // ARR stored from most recent race
            awards: userData.awards || calculatedStats.awards, // Prefer stored awards
            // Use calculated stats for data not stored
            positions: calculatedStats.positions,
            recentResults: calculatedStats.recentResults
        };
        
        // Calculate rankings
        const seasonRanking = await calculateSeasonRanking(userData.uid, userData);
        const globalRanking = await calculateGlobalRanking(user.uid);
        
        // Display profile information
        displayProfileInfo(user, userData, userStats, seasonRanking, globalRanking);

        // Display rivals
        displayRivals(userData);

        // Display personality if available
        displayPersonality(userData);

        showProfileContent();
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile. Please try again.');
        showLoadingState();
    }
}

// Display profile information
function displayProfileInfo(user, userData, stats, seasonRanking, globalRanking) {
    // Profile header
    const profileNameEl = document.getElementById('profileName');
    const displayName = userData.name || user.displayName || 'Unknown';
    const contributorBadge = userData.isContributor
        ? ' <span class="profile-contributor-badge" title="Thank you for your contribution to support TPV Career Mode">' + (window.TPVIcons ? window.TPVIcons.getIcon('contributorStar', { size: 'sm' }) : '⭐') + '</span>'
        : '';
    profileNameEl.innerHTML = displayName + contributorBadge;

    // Apply Money Bags flair below profile photo
    const profilePhotoSection = document.querySelector('.profile-photo-section');
    const existingFlair = document.querySelector('.money-bags-flair');

    if (userData.hasHighRollerFlair) {
        // Add flair if it doesn't exist
        if (!existingFlair && profilePhotoSection) {
            const flairElement = document.createElement('div');
            flairElement.className = 'money-bags-flair';
            flairElement.innerHTML = `
                <span class="money-bags-flair-icon">💰</span>
                <span class="money-bags-flair-text">Money Bags</span>
            `;
            profilePhotoSection.appendChild(flairElement);
        }
    } else {
        // Remove flair if it exists
        if (existingFlair) {
            existingFlair.remove();
        }
    }
    document.getElementById('profileUID').textContent = userData.uid || 'No UID';
    document.getElementById('profileTeam').textContent = userData.team || 'No Team';
    
    // Category/Band
    const arrBand = stats.arr ? getARRBand(stats.arr) : 'Unranked';
    document.getElementById('profileCategory').textContent = arrBand;
    
    // Profile photo
    const profilePhoto = document.getElementById('profilePhoto');
    const profilePlaceholder = document.querySelector('.profile-photo-placeholder');
    const initialsSpan = document.getElementById('profileInitials');
    
    initialsSpan.textContent = getInitials(userData.name || user.displayName);
    
    if (userData.photoURL) {
        // Use 400px thumbnail for 150px display (2.67x for retina)
        profilePhoto.src = getHighResPhotoURL(userData.photoURL, 400);
        profilePhoto.classList.add('active');
        profilePlaceholder.classList.add('hide');
    } else {
        profilePhoto.classList.remove('active');
        profilePlaceholder.classList.remove('hide');
    }
    
    // Quick stats
    document.getElementById('totalRaces').textContent = stats.totalRaces;
    document.getElementById('totalWins').textContent = stats.totalWins;
    document.getElementById('totalPodiums').textContent = stats.totalPodiums;
    document.getElementById('totalPoints').textContent = stats.totalPoints;
    
    // Career stats
    if (seasonRanking.rank) {
        document.getElementById('seasonRank').textContent = `#${seasonRanking.rank} / ${seasonRanking.total}`;
    } else {
        document.getElementById('seasonRank').textContent = 'Unranked';
    }
    
    if (globalRanking.rank) {
        document.getElementById('globalRank').textContent = `#${globalRanking.rank} / ${globalRanking.total}`;
    } else {
        document.getElementById('globalRank').textContent = 'Unranked';
    }
    
    document.getElementById('arrRating').textContent = stats.arr ? stats.arr : 'N/A';
    document.getElementById('avgFinish').textContent = stats.averageFinish ? Math.round(stats.averageFinish) + getOrdinalSuffix(stats.averageFinish) : 'N/A';
    document.getElementById('winRate').textContent = `${stats.winRate}%`;
    document.getElementById('podiumRate').textContent = `${stats.podiumRate}%`;

    // Season stats
    document.getElementById('seasonRaces').textContent = stats.seasonRaces;
    document.getElementById('seasonWins').textContent = stats.seasonWins;
    document.getElementById('seasonPodiums').textContent = stats.seasonPodiums;
    document.getElementById('seasonPoints').textContent = stats.seasonPoints;

    // Recent results
    displayRecentResults(stats.recentResults);

    // Season progress (using the season-aware switcher and display)
    initProfileSeasonSwitcher();

    // Awards
    displayAwards(stats.awards);

    // Personality Awards
    if (userData.personalityAwards) {
        displayPersonalityAwards(userData.personalityAwards, userData.personality);
    }

    // Generate and display career summary
    console.log('About to call displayCareerSummary...');
    displayCareerSummary(userData, stats);
    console.log('Returned from displayCareerSummary');
}

// Display recent results
function displayRecentResults(results) {
    const container = document.getElementById('recentResults');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="results-empty">
                <div class="results-empty-icon">🚴</div>
                <p>No race results yet. Complete your first event!</p>
            </div>
        `;
        return;
    }
    
    // Show only the 5 most recent results
    const recentResults = results.slice(0, 5);
    
    let html = '';
    recentResults.forEach(result => {
        const isPodium = result.position <= 3;
        const positionClass = isPodium ? 'podium' : '';
        
        // Build bonus/medal indicators
        let bonusHTML = '';
        const unlockBonus = result.unlockBonusPoints || 0;
        const predictionBonus = (result.bonusPoints || 0) - unlockBonus;

        if (predictionBonus > 0) {
            bonusHTML += `<span class="bonus-indicator" title="Bonus points for beating prediction">+${predictionBonus} bonus</span>`;
        }
        if (unlockBonus > 0) {
            bonusHTML += `<span class="bonus-indicator unlock-bonus" title="Bonus from triggered unlocks">+${unlockBonus} unlock</span>`;
        }
        if (result.earnedPunchingMedal) {
            bonusHTML += `<span class="medal-indicator punching" title="Beat prediction by 10+ places">${getAwardIcon('punchingAbove', 'sm')}</span>`;
        }
        if (result.earnedGiantKillerMedal) {
            bonusHTML += `<span class="medal-indicator giant-killer" title="Beat highest-rated rider">${getAwardIcon('giantKiller', 'sm')}</span>`;
        }
        if (result.earnedBullseyeMedal) {
            bonusHTML += `<span class="medal-indicator bullseye" title="Finished exactly as predicted">${getAwardIcon('bullseye', 'sm')}</span>`;
        }
        if (result.earnedHotStreakMedal) {
            bonusHTML += `<span class="medal-indicator hot-streak" title="Beat prediction 3 events in a row">${getAwardIcon('hotStreak', 'sm')}</span>`;
        }
        if (result.earnedDomination) {
            bonusHTML += `<span class="medal-indicator domination" title="Won by 60+ seconds">${getAwardIcon('domination', 'sm')}</span>`;
        }
        if (result.earnedCloseCall) {
            bonusHTML += `<span class="medal-indicator close-call" title="Won by less than 0.5s">${getAwardIcon('closeCall', 'sm')}</span>`;
        }
        if (result.earnedPhotoFinish) {
            bonusHTML += `<span class="medal-indicator photo-finish" title="Within 0.2s of winner">${getAwardIcon('photoFinish', 'sm')}</span>`;
        }
        if (result.earnedDarkHorse) {
            bonusHTML += `<span class="medal-indicator dark-horse" title="Won when predicted 15th+">${getAwardIcon('darkHorse', 'sm')}</span>`;
        }
        if (result.earnedZeroToHero) {
            bonusHTML += `<span class="medal-indicator zero-to-hero" title="Bottom 20% to top 20%">${getAwardIcon('zeroToHero', 'sm')}</span>`;
        }

        // Add Cadence Coins earned
        if (result.earnedCadenceCredits > 0) {
            const ccIcon = result.ccSource === 'completion' ? getAwardIcon('eventCriterium', 'sm') : getAwardIcon('power', 'sm');
            const ccTitle = result.ccSource === 'completion' ? 'Race completion bonus' : 'Cadence Credits earned';
            bonusHTML += `<span class="cc-earned" title="${ccTitle}">${ccIcon}${result.earnedCadenceCredits} CC</span>`;
        }

        // Format predicted position if available
        let predictionHTML = '';
        if (result.predictedPosition) {
            const placesBeaten = result.predictedPosition - result.position;
            const ordinal = getOrdinalSuffix(result.predictedPosition);

            if (placesBeaten > 0) {
                predictionHTML = `<div class="result-prediction beat">Predicted ${result.predictedPosition}${ordinal} (+${placesBeaten})</div>`;
            } else if (placesBeaten === 0) {
                predictionHTML = `<div class="result-prediction exact">Predicted ${result.predictedPosition}${ordinal} (=)</div>`;
            } else {
                predictionHTML = `<div class="result-prediction missed">Predicted ${result.predictedPosition}${ordinal} (${placesBeaten})</div>`;
            }
        }

        // Format date using shared utility function - prefer raceDate over processedAt
        const displayDate = result.raceDate || result.processedAt;
        const formattedDate = formatDate(displayDate?.toDate?.() || displayDate);

        html += `
            <a href="event-detail.html?id=${result.eventNum}" class="result-card-link">
                <div class="result-card">
                    <div class="result-position ${positionClass}">${result.position}${getOrdinalSuffix(result.position)}</div>
                    <div class="result-info">
                        <div class="result-event">${result.eventName}</div>
                        ${predictionHTML}
                        <div class="result-date">${formattedDate}</div>
                    </div>
                    <div class="result-stats">
                        <div class="result-time">${formatTime(result.time)}</div>
                        <div class="result-points">+${result.points}</div>
                        ${bonusHTML ? `<div class="result-bonuses">${bonusHTML}</div>` : ''}
                    </div>
                </div>
            </a>
        `;
    });
    
    container.innerHTML = html;
}

// Display awards (placeholder for future implementation)
// Helper function to get award icon HTML
function getAwardIcon(iconId, size = 'lg') {
    if (window.TPVIcons) {
        return window.TPVIcons.getIcon(iconId, { size });
    }
    // Fallback if icon system not loaded
    return '';
}

function displayAwards(awards) {
    const container = document.getElementById('awardsContainer');

    // Safety check - if awards is undefined, initialize it as empty object
    if (!awards) {
        awards = {};
    }
    
    // Map old property names to new ones for backwards compatibility
    // New stored format uses: gold, silver, bronze, punchingMedal, giantKiller, etc.
    const mappedAwards = {
        goldMedals: awards.gold || 0,
        silverMedals: awards.silver || 0,
        bronzeMedals: awards.bronze || 0,
        lanternRouge: awards.lanternRouge || 0,
        punchingMedals: awards.punchingMedal || 0,
        giantKillerMedals: awards.giantKiller || 0,
        bullseyeMedals: awards.bullseye || 0,
        hotStreakMedals: awards.hotStreak || 0,
        domination: awards.domination || 0,
        closeCall: awards.closeCall || 0,
        photoFinish: awards.photoFinish || 0,
        overrated: awards.overrated || 0,
        darkHorse: awards.darkHorse || 0,
        backToBack: awards.backToBack || 0,
        weekendWarrior: awards.weekendWarrior || 0,
        zeroToHero: awards.zeroToHero || 0,
        trophyCollector: awards.trophyCollector || 0,
        technicalIssues: awards.technicalIssues || 0,
        fanFavourite: awards.fanFavourite || 0,
        gcGoldMedal: awards.gcGold || 0,
        gcSilverMedal: awards.gcSilver || 0,
        gcBronzeMedal: awards.gcBronze || 0,
        seasonChampion: awards.seasonChampion || 0,
        seasonRunnerUp: awards.seasonRunnerUp || 0,
        seasonThirdPlace: awards.seasonThirdPlace || 0,
        perfectSeason: awards.perfectSeason || 0,
        podiumStreak: awards.podiumStreak || 0,
        specialist: awards.specialist || 0,
        allRounder: awards.allRounder || 0,
        comeback: awards.comeback || 0,
        gluttonForPunishment: awards.gluttonForPunishment || 0,
        // Event-specific awards
        windTunnel: awards.windTunnel || 0,
        theAccountant: awards.theAccountant || 0,
        // Special event awards
        theEqualizer: awards.theEqualizer || 0,
        singaporeSling: awards.singaporeSling || 0,
        // Power-based awards
        powerSurge: awards.powerSurge || 0,
        steadyEddie: awards.steadyEddie || 0,
        blastOff: awards.blastOff || 0
    };

    // Use mapped awards for the rest of the function
    awards = mappedAwards;
    
    // Check if user has any awards (include all award types)
    const totalAwards = awards.goldMedals + awards.silverMedals + awards.bronzeMedals +
                        awards.lanternRouge + awards.punchingMedals + awards.giantKillerMedals +
                        awards.bullseyeMedals + awards.hotStreakMedals +
                        (awards.domination || 0) + (awards.closeCall || 0) + (awards.photoFinish || 0) +
                        (awards.overrated || 0) + (awards.darkHorse || 0) + (awards.backToBack || 0) +
                        (awards.weekendWarrior || 0) + (awards.zeroToHero || 0) +
                        (awards.trophyCollector || 0) + (awards.technicalIssues || 0) + (awards.fanFavourite || 0) +
                        (awards.gcGoldMedal || 0) + (awards.gcSilverMedal || 0) + (awards.gcBronzeMedal || 0) +
                        (awards.seasonChampion || 0) + (awards.seasonRunnerUp || 0) + (awards.seasonThirdPlace || 0) +
                        (awards.perfectSeason || 0) + (awards.podiumStreak || 0) +
                        (awards.specialist || 0) + (awards.allRounder || 0) + (awards.comeback || 0) +
                        (awards.gluttonForPunishment || 0) +
                        (awards.windTunnel || 0) + (awards.theAccountant || 0) +
                        (awards.theEqualizer || 0) + (awards.singaporeSling || 0) +
                        (awards.powerSurge || 0) + (awards.steadyEddie || 0) + (awards.blastOff || 0);
    
    if (totalAwards === 0) {
        container.innerHTML = `
            <div class="awards-empty">
                <div class="awards-empty-icon">${getAwardIcon('trophy')}</div>
                <p>No awards yet. Keep racing to earn achievements!</p>
            </div>
        `;
        return;
    }
    
    // Display trophy cabinet
    let html = '<div class="trophy-cabinet">';
    
    // Gold medals (1st place)
    if (awards.goldMedals > 0) {
        html += `
            <div class="award-card gold">
                <div class="award-icon">${getAwardIcon('goldMedal')}</div>
                <div class="award-count">${awards.goldMedals}x</div>
                <div class="award-title">Gold Medal</div>
                <div class="award-description">1st Place Finish</div>
            </div>
        `;
    }

    // Silver medals (2nd place)
    if (awards.silverMedals > 0) {
        html += `
            <div class="award-card silver">
                <div class="award-icon">${getAwardIcon('silverMedal')}</div>
                <div class="award-count">${awards.silverMedals}x</div>
                <div class="award-title">Silver Medal</div>
                <div class="award-description">2nd Place Finish</div>
            </div>
        `;
    }

    // Bronze medals (3rd place)
    if (awards.bronzeMedals > 0) {
        html += `
            <div class="award-card bronze">
                <div class="award-icon">${getAwardIcon('bronzeMedal')}</div>
                <div class="award-count">${awards.bronzeMedals}x</div>
                <div class="award-title">Bronze Medal</div>
                <div class="award-description">3rd Place Finish</div>
            </div>
        `;
    }
    
    // GC Winner (Tour overall)
    if (awards.gcGoldMedal > 0) {
        html += `
            <div class="award-card gc-gold">
                <div class="award-icon">${getAwardIcon('gcGold')}</div>
                <div class="award-count">${awards.gcGoldMedal}x</div>
                <div class="award-title">GC Winner</div>
                <div class="award-description">Tour Overall Champion</div>
            </div>
        `;
    }

    // GC Second (Tour overall)
    if (awards.gcSilverMedal > 0) {
        html += `
            <div class="award-card gc-silver">
                <div class="award-icon">${getAwardIcon('gcSilver')}</div>
                <div class="award-count">${awards.gcSilverMedal}x</div>
                <div class="award-title">GC Second</div>
                <div class="award-description">Tour Overall 2nd Place</div>
            </div>
        `;
    }

    // GC Third (Tour overall)
    if (awards.gcBronzeMedal > 0) {
        html += `
            <div class="award-card gc-bronze">
                <div class="award-icon">${getAwardIcon('gcBronze')}</div>
                <div class="award-count">${awards.gcBronzeMedal}x</div>
                <div class="award-title">GC Third</div>
                <div class="award-description">Tour Overall 3rd Place</div>
            </div>
        `;
    }
    
    // SEASON OVERALL TROPHIES (Most Prestigious!)
    
    // Season Champion (1st place in season standings)
    if (awards.seasonChampion > 0) {
        html += `
            <div class="award-card season-champion">
                <div class="award-icon">${getAwardIcon('seasonGold')}</div>
                <div class="award-count">${awards.seasonChampion}x</div>
                <div class="award-title">Season Champion</div>
                <div class="award-description">1st Place Overall Season Standings</div>
            </div>
        `;
    }

    // Season Runner-Up (2nd place in season standings)
    if (awards.seasonRunnerUp > 0) {
        html += `
            <div class="award-card season-runnerup">
                <div class="award-icon">${getAwardIcon('seasonSilver')}</div>
                <div class="award-count">${awards.seasonRunnerUp}x</div>
                <div class="award-title">Season Runner-Up</div>
                <div class="award-description">2nd Place Overall Season Standings</div>
            </div>
        `;
    }

    // Season Third Place (3rd place in season standings)
    if (awards.seasonThirdPlace > 0) {
        html += `
            <div class="award-card season-third">
                <div class="award-icon">${getAwardIcon('seasonBronze')}</div>
                <div class="award-count">${awards.seasonThirdPlace}x</div>
                <div class="award-title">Season Third Place</div>
                <div class="award-description">3rd Place Overall Season Standings</div>
            </div>
        `;
    }
    
    // Lantern rouge (last place)
    if (awards.lanternRouge > 0) {
        html += `
            <div class="award-card lantern">
                <div class="award-icon">${getAwardIcon('lanternRouge')}</div>
                <div class="award-count">${awards.lanternRouge}x</div>
                <div class="award-title">Lantern Rouge</div>
                <div class="award-description">Last Place Finish</div>
            </div>
        `;
    }

    // Punching medal (beat prediction by 10+ places)
    if (awards.punchingMedals > 0) {
        html += `
            <div class="award-card punching">
                <div class="award-icon">${getAwardIcon('punchingAbove')}</div>
                <div class="award-count">${awards.punchingMedals}x</div>
                <div class="award-title">Punching Up</div>
                <div class="award-description">Beat Prediction by 10+ Places</div>
            </div>
        `;
    }

    // Giant Killer medal (beat highest-rated rider)
    if (awards.giantKillerMedals > 0) {
        html += `
            <div class="award-card giant-killer">
                <div class="award-icon">${getAwardIcon('giantKiller')}</div>
                <div class="award-count">${awards.giantKillerMedals}x</div>
                <div class="award-title">Giant Killer</div>
                <div class="award-description">Beat Highest-Rated Rider</div>
            </div>
        `;
    }

    // Bullseye medal (finish exactly at predicted position)
    if (awards.bullseyeMedals > 0) {
        html += `
            <div class="award-card bullseye">
                <div class="award-icon">${getAwardIcon('bullseye')}</div>
                <div class="award-count">${awards.bullseyeMedals}x</div>
                <div class="award-title">Bullseye</div>
                <div class="award-description">Finished Exactly as Predicted</div>
            </div>
        `;
    }

    // Hot Streak medal (beat prediction 3 events in a row)
    if (awards.hotStreakMedals > 0) {
        html += `
            <div class="award-card hot-streak">
                <div class="award-icon">${getAwardIcon('hotStreak')}</div>
                <div class="award-count">${awards.hotStreakMedals}x</div>
                <div class="award-title">Hot Streak</div>
                <div class="award-description">Beat Prediction 3x in a Row</div>
            </div>
        `;
    }
    
    // NEW AWARDS
    
    // Domination (win by more than a minute)
    if (awards.domination > 0) {
        html += `
            <div class="award-card domination">
                <div class="award-icon">${getAwardIcon('domination')}</div>
                <div class="award-count">${awards.domination}x</div>
                <div class="award-title">Domination</div>
                <div class="award-description">Won by 60+ Seconds</div>
            </div>
        `;
    }

    // Close Call (win by less than 0.5s)
    if (awards.closeCall > 0) {
        html += `
            <div class="award-card close-call">
                <div class="award-icon">${getAwardIcon('closeCall')}</div>
                <div class="award-count">${awards.closeCall}x</div>
                <div class="award-title">Close Call</div>
                <div class="award-description">Won by Less Than 0.5s</div>
            </div>
        `;
    }

    // Photo Finish (within 0.2s of winner)
    if (awards.photoFinish > 0) {
        html += `
            <div class="award-card photo-finish">
                <div class="award-icon">${getAwardIcon('photoFinish')}</div>
                <div class="award-count">${awards.photoFinish}x</div>
                <div class="award-title">Photo Finish</div>
                <div class="award-description">Within 0.2s of Winner</div>
            </div>
        `;
    }

    // Dark Horse (win when predicted 15th or worse)
    if (awards.darkHorse > 0) {
        html += `
            <div class="award-card dark-horse">
                <div class="award-icon">${getAwardIcon('darkHorse')}</div>
                <div class="award-count">${awards.darkHorse}x</div>
                <div class="award-title">Dark Horse</div>
                <div class="award-description">Won When Predicted 15th+</div>
            </div>
        `;
    }

    // Zero to Hero (bottom 20% to top 20%)
    if (awards.zeroToHero > 0) {
        html += `
            <div class="award-card zero-to-hero">
                <div class="award-icon">${getAwardIcon('zeroToHero')}</div>
                <div class="award-count">${awards.zeroToHero}x</div>
                <div class="award-title">Zero to Hero</div>
                <div class="award-description">Bottom 20% to Top 20%</div>
            </div>
        `;
    }

    // Back to Back (2 wins in a row)
    if (awards.backToBack > 0) {
        html += `
            <div class="award-card back-to-back">
                <div class="award-icon">${getAwardIcon('backToBack')}</div>
                <div class="award-count">${awards.backToBack}x</div>
                <div class="award-title">Back to Back</div>
                <div class="award-description">Won 2 Races in a Row</div>
            </div>
        `;
    }

    // Trophy Collector (5+ podiums)
    if (awards.trophyCollector > 0) {
        html += `
            <div class="award-card trophy-collector">
                <div class="award-icon">${getAwardIcon('trophy')}</div>
                <div class="award-count">${awards.trophyCollector}x</div>
                <div class="award-title">Trophy Collector</div>
                <div class="award-description">5+ Podium Finishes</div>
            </div>
        `;
    }

    // Weekend Warrior (5+ weekend events)
    if (awards.weekendWarrior > 0) {
        html += `
            <div class="award-card weekend-warrior">
                <div class="award-icon">${getAwardIcon('weekendWarrior')}</div>
                <div class="award-count">${awards.weekendWarrior}x</div>
                <div class="award-title">Weekend Warrior</div>
                <div class="award-description">Completed 5+ Weekend Events</div>
            </div>
        `;
    }

    // Overrated (worse than predicted 5+ times)
    if (awards.overrated > 0) {
        html += `
            <div class="award-card overrated">
                <div class="award-icon">${getAwardIcon('overrated')}</div>
                <div class="award-count">${awards.overrated}x</div>
                <div class="award-title">Overrated</div>
                <div class="award-description">Worse Than Predicted 5+ Times</div>
            </div>
        `;
    }

    // Technical Issues (3+ DNFs)
    if (awards.technicalIssues > 0) {
        html += `
            <div class="award-card technical-issues">
                <div class="award-icon">${getAwardIcon('technicalIssues')}</div>
                <div class="award-count">${awards.technicalIssues}x</div>
                <div class="award-title">Technical Issues</div>
                <div class="award-description">3+ DNFs</div>
            </div>
        `;
    }

    // Fan Favourite (100+ high-5s received)
    if (awards.fanFavourite > 0) {
        html += `
            <div class="award-card fan-favourite">
                <div class="award-icon">${getAwardIcon('fanFavourite')}</div>
                <div class="award-count">${awards.fanFavourite}x</div>
                <div class="award-title">Fan Favourite</div>
                <div class="award-description">Received 100 High-5s</div>
            </div>
        `;
    }

    // NEW SPECIAL AWARDS
    
    // Perfect Season (win every event)
    if (awards.perfectSeason > 0) {
        html += `
            <div class="award-card perfect-season">
                <div class="award-icon">${getAwardIcon('perfectSeason')}</div>
                <div class="award-count">${awards.perfectSeason}x</div>
                <div class="award-title">Perfect Season</div>
                <div class="award-description">Won Every Event in a Season</div>
            </div>
        `;
    }

    // Podium Streak (5+ consecutive top 3 finishes)
    if (awards.podiumStreak > 0) {
        html += `
            <div class="award-card podium-streak">
                <div class="award-icon">${getAwardIcon('podiumStreak')}</div>
                <div class="award-count">${awards.podiumStreak}x</div>
                <div class="award-title">Podium Streak</div>
                <div class="award-description">5+ Consecutive Top 3 Finishes</div>
            </div>
        `;
    }

    // Specialist (win 3+ of same type)
    if (awards.specialist > 0) {
        html += `
            <div class="award-card specialist">
                <div class="award-icon">${getAwardIcon('specialist')}</div>
                <div class="award-count">${awards.specialist}x</div>
                <div class="award-title">Specialist</div>
                <div class="award-description">Won 3+ Events of Same Type</div>
            </div>
        `;
    }

    // All-Rounder (win 5+ different event types)
    if (awards.allRounder > 0) {
        html += `
            <div class="award-card all-rounder">
                <div class="award-icon">${getAwardIcon('allRounder')}</div>
                <div class="award-count">${awards.allRounder}x</div>
                <div class="award-title">All-Rounder</div>
                <div class="award-description">Won 5+ Different Event Types</div>
            </div>
        `;
    }

    // Comeback Kid (top 5 after bottom half)
    if (awards.comeback > 0) {
        html += `
            <div class="award-card comeback">
                <div class="award-icon">${getAwardIcon('comeback')}</div>
                <div class="award-count">${awards.comeback}x</div>
                <div class="award-title">Comeback Kid</div>
                <div class="award-description">Top 5 After Bottom Half Finish</div>
            </div>
        `;
    }

    // Glutton for Punishment (reset season and start over)
    if (awards.gluttonForPunishment > 0) {
        html += `
            <div class="award-card glutton-for-punishment">
                <div class="award-icon">${getAwardIcon('gluttonForPunishment')}</div>
                <div class="award-count">${awards.gluttonForPunishment}x</div>
                <div class="award-title">Glutton for Punishment</div>
                <div class="award-description">Reset Season & Started Over</div>
            </div>
        `;
    }

    // Wind Tunnel (top 5 in TT when predicted outside top 5)
    if (awards.windTunnel > 0) {
        html += `
            <div class="award-card wind-tunnel">
                <div class="award-icon">${getAwardIcon('windTunnel')}</div>
                <div class="award-count">${awards.windTunnel}x</div>
                <div class="award-title">Wind Tunnel</div>
                <div class="award-description">Top 5 in TT When Predicted Lower</div>
            </div>
        `;
    }

    // The Accountant (scored more points than line winner)
    if (awards.theAccountant > 0) {
        html += `
            <div class="award-card the-accountant">
                <div class="award-icon">${getAwardIcon('theAccountant')}</div>
                <div class="award-count">${awards.theAccountant}x</div>
                <div class="award-title">The Accountant</div>
                <div class="award-description">Outscored the Line Winner</div>
            </div>
        `;
    }

    // The Equalizer (completed The Leveller special event)
    if (awards.theEqualizer > 0) {
        html += `
            <div class="award-card the-equalizer">
                <div class="award-icon">${getAwardIcon('theEqualizer')}</div>
                <div class="award-count">${awards.theEqualizer}x</div>
                <div class="award-title">The Equalizer</div>
                <div class="award-description">Completed The Leveller</div>
            </div>
        `;
    }

    // Singapore Sling (podium at Singapore Criterium)
    if (awards.singaporeSling > 0) {
        html += `
            <div class="award-card singapore-sling">
                <div class="award-icon">${getAwardIcon('singaporeSling')}</div>
                <div class="award-count">${awards.singaporeSling}x</div>
                <div class="award-title">Singapore Sling</div>
                <div class="award-description">Podium at Singapore Criterium</div>
            </div>
        `;
    }

    // Power Surge (max power 30%+ above average, top 10 finish)
    if (awards.powerSurge > 0) {
        html += `
            <div class="award-card power-surge">
                <div class="award-icon">${getAwardIcon('powerSurge')}</div>
                <div class="award-count">${awards.powerSurge}x</div>
                <div class="award-title">Power Surge</div>
                <div class="award-description">Max Power 30%+ Above Average</div>
            </div>
        `;
    }

    // Steady Eddie (normalized power within 1% of average)
    if (awards.steadyEddie > 0) {
        html += `
            <div class="award-card steady-eddie">
                <div class="award-icon">${getAwardIcon('steadyEddie')}</div>
                <div class="award-count">${awards.steadyEddie}x</div>
                <div class="award-title">Steady Eddie</div>
                <div class="award-description">Perfectly Paced Effort</div>
            </div>
        `;
    }

    // Blast Off (broke 1300W max power)
    if (awards.blastOff > 0) {
        html += `
            <div class="award-card blast-off">
                <div class="award-icon">${getAwardIcon('blastOff')}</div>
                <div class="award-count">${awards.blastOff}x</div>
                <div class="award-title">Blast Off</div>
                <div class="award-description">Broke 1300W Max Power</div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Display rivals section
async function displayRivals(userData) {
    const section = document.getElementById('rivalsSection');
    const container = document.getElementById('rivalsContainer');

    // Check if user has rival data
    if (!userData.rivalData || !userData.rivalData.topRivals || userData.rivalData.topRivals.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const rivalData = userData.rivalData;
    const topRivals = rivalData.topRivals;

    let html = '';

    // Display only top 3 rivals on profile page
    const displayLimit = Math.min(3, topRivals.length);
    for (let i = 0; i < displayLimit; i++) {
        const botUid = topRivals[i];
        const data = rivalData.encounters[botUid];

        if (!data) continue;

        const rankIcons = [getAwardIcon('goldMedal', 'sm'), getAwardIcon('silverMedal', 'sm'), getAwardIcon('bronzeMedal', 'sm')];
        const rankLabel = `${rankIcons[i]} #${i + 1}`;
        const record = `${data.userWins}-${data.botWins}`;
        const winPercentage = data.races > 0 ? ((data.userWins / data.races) * 100).toFixed(0) : 0;

        // Check if bot has profile by trying to fetch from botProfiles
        const hasProfile = await checkBotProfile(botUid);

        // Fetch bot profile for image
        let profileImage = null;
        if (hasProfile) {
            try {
                const botDoc = await getDoc(doc(db, 'botProfiles', botUid));
                if (botDoc.exists()) {
                    profileImage = botDoc.data().imageUrl || null;
                }
            } catch (error) {
                console.error('Error fetching bot profile image:', error);
            }
        }

        // Convert country code to 2-letter format for flag icon
        const countryCode2 = getCountryCode2(data.botCountry);
        const countryDisplay = countryCode2
            ? `<img src="assets/flags/${countryCode2}.svg" alt="${data.botCountry}" class="rival-flag" title="${data.botCountry}">`
            : (data.botCountry || 'Unknown');

        html += `
            <div class="rival-card">
                <div class="rival-header">
                    <div class="rival-info">
                        <div class="rival-photo">
                            ${profileImage
                                ? `<img src="${profileImage}" alt="${data.botName}">`
                                : `<div class="rival-photo-placeholder">${getInitials(data.botName)}</div>`
                            }
                        </div>
                        <div class="rival-rank">${rankLabel}</div>
                        <div class="rival-details">
                            <div class="rival-name" data-bot-uid="${botUid}" data-bot-name="${data.botName}" data-has-profile="${hasProfile}">
                                ${data.botName}
                            </div>
                            <div class="rival-meta">
                                <span class="rival-country">${countryDisplay}</span>
                                <span class="rival-arr">ARR: ${data.botArr}</span>
                            </div>
                        </div>
                    </div>
                    <div class="rival-actions">
                        ${hasProfile
                            ? `<button class="btn-rival-action btn-view-profile" data-bot-uid="${botUid}">View Profile</button>`
                            : `<button class="btn-rival-action btn-request-profile" data-bot-uid="${botUid}" data-bot-name="${data.botName}" data-bot-team="${data.botTeam || ''}" data-bot-arr="${data.botArr}" data-bot-country="${data.botCountry}">Request Profile</button>`
                        }
                    </div>
                </div>
                <div class="rival-stats">
                    <div class="rival-stat races">
                        <div class="rival-stat-value">${data.races}</div>
                        <div class="rival-stat-label">Races Together</div>
                    </div>
                    <div class="rival-stat wins">
                        <div class="rival-stat-value">${data.userWins}</div>
                        <div class="rival-stat-label">Your Wins</div>
                    </div>
                    <div class="rival-stat losses">
                        <div class="rival-stat-value">${data.botWins}</div>
                        <div class="rival-stat-label">Their Wins</div>
                    </div>
                    <div class="rival-stat gap">
                        <div class="rival-stat-value">${data.avgGap.toFixed(1)}s</div>
                        <div class="rival-stat-label">Avg Gap</div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Add event listeners for bot names and buttons
    attachRivalEventListeners();
}

// Check if bot has a profile in Firestore
async function checkBotProfile(botUid) {
    try {
        const botDoc = await getDoc(doc(db, 'botProfiles', botUid));
        return botDoc.exists();
    } catch (error) {
        console.error('Error checking bot profile:', error);
        return false;
    }
}

// Attach event listeners to rival elements
function attachRivalEventListeners() {
    // View Profile buttons
    document.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', () => {
            const botUid = btn.dataset.botUid;
            if (window.openBotProfile) {
                window.openBotProfile(botUid);
            }
        });
    });

    // Request Profile buttons
    document.querySelectorAll('.btn-request-profile').forEach(btn => {
        btn.addEventListener('click', () => {
            const botUid = btn.dataset.botUid;
            const botName = btn.dataset.botName;
            const botTeam = btn.dataset.botTeam;
            const botArr = btn.dataset.botArr;
            const botCountry = btn.dataset.botCountry;
            openProfileRequestModal(botUid, botName, botTeam, botArr, botCountry);
        });
    });
}

// Open profile request modal
function openProfileRequestModal(botUid, botName, botTeam, botArr, botCountry) {
    const modal = document.getElementById('profileRequestModal');

    // Set hidden fields
    document.getElementById('requestBotUid').value = botUid;
    document.getElementById('requestBotTeam').value = botTeam || '';
    document.getElementById('requestBotArr').value = botArr;
    document.getElementById('requestBotCountry').value = botCountry;

    // Set display fields
    document.getElementById('requestBotName').textContent = botName;
    document.getElementById('previewBotName').textContent = botName;
    document.getElementById('previewBotTeam').textContent = botTeam || 'Independent';
    document.getElementById('previewBotArr').textContent = botArr || 'Unknown';
    document.getElementById('previewBotCountry').textContent = botCountry || 'Unknown';

    // Clear textarea
    document.getElementById('interestFact').value = '';

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close profile request modal
function closeProfileRequestModal() {
    const modal = document.getElementById('profileRequestModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle profile request submission
async function handleProfileRequest(e) {
    e.preventDefault();

    const botUid = document.getElementById('requestBotUid').value;
    const botName = document.getElementById('requestBotName').textContent;
    const botTeam = document.getElementById('requestBotTeam').value;
    const botArr = document.getElementById('requestBotArr').value;
    const botCountry = document.getElementById('requestBotCountry').value;
    const interestFact = document.getElementById('interestFact').value.trim();

    if (!currentUser) {
        alert('Please log in to submit a profile request');
        return;
    }

    try {
        // Create request data
        const requestData = {
            timestamp: new Date().toISOString(),
            userUid: currentUser.uid,
            botUid: botUid,
            botName: botName,
            botTeam: botTeam || '',
            botArr: botArr,
            botCountry: botCountry,
            interestFact: interestFact || 'None provided',
            processed: false // Mark as unprocessed
        };

        // Store request in Firestore
        await setDoc(doc(db, 'botProfileRequests', `${botUid}_${Date.now()}`), requestData);

        alert(`Profile request submitted for ${botName}! An admin will review it soon.`);
        closeProfileRequestModal();
    } catch (error) {
        console.error('Error submitting profile request:', error);
        alert('Error submitting request. Please try again.');
    }
}

// Initialize profile request modal
function initProfileRequestModal() {
    const modal = document.getElementById('profileRequestModal');
    const closeBtn = document.getElementById('profileRequestModalClose');
    const overlay = document.getElementById('profileRequestModalOverlay');
    const form = document.getElementById('profileRequestForm');

    if (!modal) return;

    closeBtn?.addEventListener('click', closeProfileRequestModal);
    overlay?.addEventListener('click', closeProfileRequestModal);
    form?.addEventListener('submit', handleProfileRequest);
}

// Generate and display career summary
// Display career summary paragraph
function displayCareerSummary(userData, stats) {
    const container = document.getElementById('careerSummary');

    if (!container) {
        return;
    }

    // Check if we have enough data
    if (!stats || stats.totalRaces === 0) {
        container.textContent = 'Complete your first race to see your career summary.';
        return;
    }

    // Check if career summary generator is loaded
    if (typeof window.careerSummaryGen === 'undefined') {
        console.warn('Career summary generator not loaded');
        container.textContent = 'Your career is just beginning. Complete more races to see your personalized career summary.';
        return;
    }
    
    // Calculate current season stats
    const season = 1;
    const currentSeasonStages = (userData.completedStages || []).length;
    const currentSeasonPoints = userData.season1Points || 0;
    
    // Count current season wins and podiums
    let currentSeasonWins = 0;
    let currentSeasonPodiums = 0;
    
    for (let i = 1; i <= 15; i++) {
        const eventResults = userData[`event${i}Results`];
        if (eventResults) {
            if (eventResults.position === 1) currentSeasonWins++;
            if (eventResults.position <= 3) currentSeasonPodiums++;
        }
    }
    
    // Find career best result
    let careerBestPosition = 999;
    let careerBestEvent = null;
    
    for (let i = 1; i <= 15; i++) {
        const eventResults = userData[`event${i}Results`];
        if (eventResults && eventResults.position < careerBestPosition) {
            careerBestPosition = eventResults.position;
            const eventNames = {
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
                15: 'Local Tour Stage 3'
            };
            careerBestEvent = eventNames[i] || `Event ${i}`;
        }
    }
    
    // Calculate total awards
    const totalAwardsCount = Object.values(stats.awards || {}).reduce((sum, val) => sum + val, 0);

    // Check if season is complete
    const seasonComplete = userData.season1Complete === true;

    // If season is complete, show season review instead of ongoing summary
    if (seasonComplete && window.seasonCompletion) {
        try {
            const reviewText = window.seasonCompletion.generateProfileSeasonReview(userData);
            // Escape HTML first, then convert markdown-style text to HTML
            const escapedText = escapeHtml(reviewText);
            const htmlText = escapedText
                .replace(/## (.*)/g, '<h2>$1</h2>')
                .replace(/### (.*)/g, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            container.innerHTML = '<p>' + htmlText + '</p>';
            return;
        } catch (error) {
            console.error('Error generating season review:', error);
            // Fall through to regular summary
        }
    }
    
    // Build career data object for generator
    const careerData = {
        totalSeasons: 1,
        totalStages: stats.totalRaces || 0,
        totalPoints: stats.totalPoints || 0,
        totalWins: stats.totalWins || 0,
        totalPodiums: stats.totalPodiums || 0,
        totalTop10s: stats.positions ? stats.positions.filter(p => p <= 10).length : 0,
        currentSeasonStages: currentSeasonStages,
        currentSeasonPoints: currentSeasonPoints,
        currentSeasonWins: currentSeasonWins,
        currentSeasonPodiums: currentSeasonPodiums,
        careerBest: {
            position: careerBestPosition < 999 ? careerBestPosition : null,
            eventName: careerBestEvent
        },
        totalAwards: totalAwardsCount,
        recentResults: stats.recentResults ? stats.recentResults.slice(0, 5).map(r => r.position) : [],
        averageFinish: stats.positions && stats.positions.length > 0 ? 
            stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length : null
    };
    
    // Generate and display summary
    try {
        const summary = window.careerSummaryGen.generateCareerSummary(careerData);
        container.textContent = summary;
    } catch (error) {
        console.error('Error generating career summary:', error);
        container.textContent = 'Your career is taking shape, one race at a time. Keep competing to build your story.';
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    console.log('[Profile] Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user (logged out)');
    currentUser = user;

    if (user) {
        await loadProfile(user);
    } else {
        console.log('[Profile] Showing login prompt');
        showLoginPrompt();
    }
});

// Initialize stat card icons with new icon system
function initStatCardIcons() {
    if (!window.TPVIcons) {
        console.warn('TPVIcons not loaded');
        return;
    }

    // Map of stat card containers to their icon IDs
    const statIconMappings = [
        { selector: '.stat-card:nth-child(1) .stat-icon', iconId: 'trophy', size: 'md' }, // Season Ranking
        { selector: '.stat-card:nth-child(2) .stat-icon', iconId: 'podiumStreak', size: 'md' }, // Avg Finish
        { selector: '.stat-card:nth-child(3) .stat-icon', iconId: 'eventCriterium', size: 'md' }, // Races
        { selector: '.stat-card:nth-child(4) .stat-icon', iconId: 'achievement', size: 'md' }, // Points
        { selector: '.stat-card:nth-child(5) .stat-icon', iconId: 'goldMedal', size: 'md' }, // Wins
        { selector: '.stat-card:nth-child(6) .stat-icon', iconId: 'stats', size: 'md' }, // Win Rate
        { selector: '.stat-card:nth-child(7) .stat-icon', iconId: 'goldMedal', size: 'md' }, // Podiums
        { selector: '.stat-card:nth-child(8) .stat-icon', iconId: 'bullseye', size: 'md' } // Podium Rate
    ];

    statIconMappings.forEach(mapping => {
        const iconElement = document.querySelector(mapping.selector);
        if (iconElement) {
            iconElement.innerHTML = window.TPVIcons.getIcon(mapping.iconId, { size: mapping.size });
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initStatCardIcons();
    initShareStats();
    initProfileRequestModal();
});

// ============================================================================
// SHARE STATS FUNCTIONALITY
// ============================================================================

let shareStatsData = null;
let teamCarImage = null;
let selectedTemplate = 'season';
let skipProfilePhoto = false;
let canvasIsTainted = false;

// Icon image cache for canvas rendering
const iconImageCache = {};

/**
 * Load an icon image for canvas drawing
 * @param {string} iconId - The icon ID from ICON_REGISTRY
 * @returns {Promise<HTMLImageElement|null>} The loaded image or null
 */
async function loadIconImage(iconId) {
    if (iconImageCache[iconId]) {
        return iconImageCache[iconId];
    }

    const url = window.TPVIcons ? window.TPVIcons.getIconUrl(iconId) : null;
    if (!url) return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            iconImageCache[iconId] = img;
            resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/**
 * Draw an icon on canvas, falling back to emoji if image fails
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} iconId - The icon ID from ICON_REGISTRY
 * @param {number} x - X position (center)
 * @param {number} y - Y position (center)
 * @param {number} size - Icon size in pixels
 * @param {string} fallbackEmoji - Emoji to use if icon fails to load
 */
async function drawIconOnCanvas(ctx, iconId, x, y, size, fallbackEmoji) {
    const img = await loadIconImage(iconId);

    if (img) {
        ctx.drawImage(img, x - size/2, y - size/2, size, size);
    } else {
        // Fallback to emoji
        ctx.font = `${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fallbackEmoji || '🏆', x, y);
    }
}

function initShareStats() {
    const shareBtn = document.getElementById('shareStatsBtn');
    const modal = document.getElementById('shareStatsModal');
    const modalClose = document.getElementById('shareStatsModalClose');
    const modalOverlay = document.getElementById('shareStatsModalOverlay');
    const downloadBtn = document.getElementById('downloadStatsBtn');
    const templateOptions = document.querySelectorAll('.template-option');
    
    if (!shareBtn || !modal) return;
    
    // Preload team car image (same origin, should be fine)
    teamCarImage = new Image();
    teamCarImage.src = 'tpv-team-car.png';
    
    // Open modal
    shareBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        generateShareImage();
    });
    
    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    
    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);
    
    // Template selection
    templateOptions.forEach(option => {
        option.addEventListener('click', () => {
            templateOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedTemplate = option.dataset.template;
            generateShareImage();
        });
    });
    
    // Download button
    downloadBtn?.addEventListener('click', downloadShareImage);
}

function collectShareData() {
    // Check if profile photo actually exists (has 'active' class when photo is loaded)
    const profilePhotoEl = document.getElementById('profilePhoto');
    const hasProfilePhoto = profilePhotoEl?.classList.contains('active');
    const profilePhotoUrl = hasProfilePhoto ? profilePhotoEl.src : null;

    // Get personality data
    const personaSubtitle = document.getElementById('personaSubtitle')?.textContent || '';
    const persona = personaSubtitle.replace(/"/g, ''); // Remove quotes from persona

    return {
        name: document.getElementById('profileName')?.textContent || 'Rider',
        team: document.getElementById('profileTeam')?.textContent || '',
        totalRaces: document.getElementById('totalRaces')?.textContent || '0',
        totalWins: document.getElementById('totalWins')?.textContent || '0',
        totalPodiums: document.getElementById('totalPodiums')?.textContent || '0',
        totalPoints: document.getElementById('totalPoints')?.textContent || '0',
        seasonRank: document.getElementById('seasonRank')?.textContent || '-',
        arrRating: document.getElementById('arrRating')?.textContent || '-',
        winRate: document.getElementById('winRate')?.textContent || '0%',
        podiumRate: document.getElementById('podiumRate')?.textContent || '0%',
        profilePhotoUrl: profilePhotoUrl,
        awards: collectAwardsData(),
        persona: persona,
        personality: window.currentUserData?.personality || null
    };
}

function collectAwardsData() {
    const awards = [];
    const awardCards = document.querySelectorAll('.award-card');
    
    awardCards.forEach(card => {
        const icon = card.querySelector('.award-icon')?.textContent || '';
        const count = card.querySelector('.award-count')?.textContent || '';
        const title = card.querySelector('.award-title')?.textContent || '';
        if (icon && count) {
            awards.push({ icon, count, title });
        }
    });
    
    return awards;
}

async function generateShareImage() {
    const canvas = document.getElementById('shareCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    
    // Reset taint tracking
    canvasIsTainted = false;
    
    // Collect current stats
    shareStatsData = collectShareData();
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    try {
        // Draw based on selected template
        switch (selectedTemplate) {
            case 'season':
                await drawSeasonTemplate(ctx, width, height);
                break;
            case 'trophy':
                await drawTrophyTemplate(ctx, width, height);
                break;
            case 'champion':
                await drawChampionTemplate(ctx, width, height);
                break;
            case 'personality':
                await drawPersonalityTemplate(ctx, width, height);
                break;
        }
    } catch (e) {
        console.error('Error generating share image:', e);
    }
}

async function drawSeasonTemplate(ctx, width, height) {
    const data = shareStatsData;
    
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0e1a');
    bgGradient.addColorStop(0.3, '#1a1a2e');
    bgGradient.addColorStop(0.7, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Decorative lines
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 300 + i * 300);
        ctx.lineTo(width, 350 + i * 300);
        ctx.stroke();
    }
    
    // TPV Logo text
    ctx.fillStyle = '#ff0080';
    ctx.font = 'bold 72px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TPV', width / 2, 120);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 28px "Exo 2", sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('CAREER MODE', width / 2, 165);
    
    // Profile photo (small, circular)
    await drawProfilePhoto(ctx, width / 2, 320, 100);
    
    // Player name (fitted to max width)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawFittedText(ctx, data.name.toUpperCase(), width / 2, 480, 1000, 52, 32, 'bold', '"Exo 2", sans-serif');

    // Team (fitted to max width)
    if (data.team) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        drawFittedText(ctx, data.team, width / 2, 530, 900, 32, 22, '600', '"Exo 2", sans-serif');
    }
    
    // Season rank highlight
    ctx.fillStyle = '#ff0080';
    ctx.font = 'bold 140px Orbitron, sans-serif';
    ctx.fillText(data.seasonRank, width / 2, 720);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 32px "Exo 2", sans-serif';
    ctx.fillText('SEASON RANK', width / 2, 780);
    
    // Stats grid
    const statsY = 920;
    const statsSpacing = 180;
    
    drawStatBox(ctx, width / 2 - statsSpacing * 1.5, statsY, data.totalRaces, 'RACES');
    drawStatBox(ctx, width / 2 - statsSpacing * 0.5, statsY, data.totalWins, 'WINS');
    drawStatBox(ctx, width / 2 + statsSpacing * 0.5, statsY, data.totalPodiums, 'PODIUMS');
    drawStatBox(ctx, width / 2 + statsSpacing * 1.5, statsY, data.totalPoints, 'POINTS');
    
    // Secondary stats (wider spacing for 3 items)
    const stats2Y = 1150;
    const stats2Spacing = 280;
    drawStatBox(ctx, width / 2 - stats2Spacing, stats2Y, data.winRate, 'WIN RATE');
    drawStatBox(ctx, width / 2, stats2Y, data.arrRating, 'ARR');
    drawStatBox(ctx, width / 2 + stats2Spacing, stats2Y, data.podiumRate, 'PODIUM RATE');
    
    // Awards preview (if any)
    if (data.awards.length > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 28px "Exo 2", sans-serif';
        ctx.fillText('AWARDS', width / 2, 1380);

        const awardStartX = width / 2 - (data.awards.length - 1) * 60;
        const awardsToShow = data.awards.slice(0, 6);
        for (let i = 0; i < awardsToShow.length; i++) {
            const award = awardsToShow[i];
            await drawIconOnCanvas(ctx, award.id, awardStartX + i * 120, 1460, 64, award.icon);
        }
    }
    
    // Team car (centered, above website text)
    await drawTeamCar(ctx, width / 2, height - 200, 0.15);
    
    // Website
    drawWebsite(ctx, width, height);
}

async function drawTrophyTemplate(ctx, width, height) {
    const data = shareStatsData;
    
    // Background gradient (purple theme)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0e1a');
    bgGradient.addColorStop(0.3, '#2d1f3d');
    bgGradient.addColorStop(0.7, '#2d1f3d');
    bgGradient.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Decorative circles
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.1)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 300 + i * 150, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // TPV Logo
    ctx.fillStyle = '#8a2be2';
    ctx.font = 'bold 72px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TPV', width / 2, 120);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 28px "Exo 2", sans-serif';
    ctx.fillText('CAREER MODE', width / 2, 165);
    
    // Trophy icon
    ctx.font = '120px sans-serif';
    ctx.fillText('🏆', width / 2, 320);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Exo 2", sans-serif';
    ctx.fillText('TROPHY CABINET', width / 2, 420);
    
    // Player name (fitted to max width)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    drawFittedText(ctx, data.name.toUpperCase(), width / 2, 490, 1000, 36, 28, '600', '"Exo 2", sans-serif');

    // Awards grid
    if (data.awards.length > 0) {
        const startY = 620;
        const rowHeight = 200;
        const cols = 3;
        const colWidth = width / (cols + 1);

        for (let i = 0; i < data.awards.length; i++) {
            const award = data.awards[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = colWidth + col * colWidth;
            const y = startY + row * rowHeight;

            // Award icon
            ctx.textAlign = 'center';
            await drawIconOnCanvas(ctx, award.id, x, y, 80, award.icon);

            // Count
            ctx.fillStyle = '#8a2be2';
            ctx.font = 'bold 36px Orbitron, sans-serif';
            ctx.fillText(award.count, x, y + 60);

            // Title (fitted to column width)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            drawFittedText(ctx, award.title.toUpperCase(), x, y + 100, 240, 20, 14, '600', '"Exo 2", sans-serif');
        }
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '32px "Exo 2", sans-serif';
        ctx.fillText('Start racing to earn awards!', width / 2, 700);
    }
    
    // Team car (centered, above website text)
    await drawTeamCar(ctx, width / 2, height - 200, 0.15);
    
    // Website
    drawWebsite(ctx, width, height);
}

async function drawChampionTemplate(ctx, width, height) {
    const data = shareStatsData;
    
    // Background gradient (gold theme)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0e1a');
    bgGradient.addColorStop(0.2, '#1a2a1a');
    bgGradient.addColorStop(0.5, '#2a3a1a');
    bgGradient.addColorStop(0.8, '#1a2a1a');
    bgGradient.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Gold rays
    ctx.save();
    ctx.translate(width / 2, 600);
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-100, -1000);
        ctx.lineTo(100, -1000);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
    
    // TPV Logo
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 72px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TPV', width / 2, 120);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 28px "Exo 2", sans-serif';
    ctx.fillText('CAREER MODE', width / 2, 165);
    
    // Profile photo (larger for champion)
    await drawProfilePhoto(ctx, width / 2, 380, 140);
    
    // Player name (fitted to max width)
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    drawFittedText(ctx, data.name.toUpperCase(), width / 2, 590, 1000, 56, 36, 'bold', '"Exo 2", sans-serif');
    
    // Champion text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Orbitron, sans-serif';
    ctx.fillText('CHAMPION', width / 2, 700);
    
    // Big stats
    ctx.font = 'bold 200px Orbitron, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(data.totalWins, width / 2, 950);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 40px "Exo 2", sans-serif';
    ctx.fillText('VICTORIES', width / 2, 1020);
    
    // Other stats in row (wider spacing)
    const statsY = 1180;
    drawStatBox(ctx, width / 4, statsY, data.totalPodiums, 'PODIUMS', '#ffd700');
    drawStatBox(ctx, width / 2, statsY, data.totalPoints, 'POINTS', '#ffd700');
    drawStatBox(ctx, width * 3/4, statsY, data.seasonRank, 'RANK', '#ffd700');
    
    // Awards
    if (data.awards.length > 0) {
        const awardStartX = width / 2 - (Math.min(data.awards.length, 5) - 1) * 70;
        const awardsToShow = data.awards.slice(0, 5);
        for (let i = 0; i < awardsToShow.length; i++) {
            const award = awardsToShow[i];
            await drawIconOnCanvas(ctx, award.id, awardStartX + i * 140, 1420, 72, award.icon);
        }
    }
    
    // Team car (centered, above website text)
    await drawTeamCar(ctx, width / 2, height - 200, 0.15);
    
    // Website
    drawWebsite(ctx, width, height);
}

async function drawPersonalityTemplate(ctx, width, height) {
    const data = shareStatsData;

    // Check if user has personality data
    if (!data.personality || !data.persona) {
        // Draw "no personality data" message
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Complete interviews to', width / 2, height / 2 - 40);
        ctx.fillText('unlock your personality!', width / 2, height / 2 + 40);
        return;
    }

    // Background gradient (purple theme)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0e1a');
    bgGradient.addColorStop(0.3, '#1a1a2e');
    bgGradient.addColorStop(0.5, '#2a1a3e');
    bgGradient.addColorStop(0.7, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative purple lines
    ctx.strokeStyle = 'rgba(176, 106, 243, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 300 + i * 300);
        ctx.lineTo(width, 350 + i * 300);
        ctx.stroke();
    }

    // TPV Logo
    const logoGradient = ctx.createLinearGradient(0, 80, 0, 140);
    logoGradient.addColorStop(0, '#b06af3');
    logoGradient.addColorStop(1, '#ff1b6b');
    ctx.fillStyle = logoGradient;
    ctx.font = 'bold 72px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TPV', width / 2, 120);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 28px "Exo 2", sans-serif';
    ctx.fillText('CAREER MODE', width / 2, 165);

    // Profile photo
    await drawProfilePhoto(ctx, width / 2, 320, 100);

    // Player name (fitted to max width)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawFittedText(ctx, data.name.toUpperCase(), width / 2, 480, 1000, 52, 32, 'bold', '"Exo 2", sans-serif');

    // Team (fitted to max width)
    if (data.team) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        drawFittedText(ctx, data.team, width / 2, 530, 900, 32, 22, '600', '"Exo 2", sans-serif');
    }

    // Persona label with purple gradient (fitted to max width)
    const personaGradient = ctx.createLinearGradient(0, 620, 0, 680);
    personaGradient.addColorStop(0, '#b06af3');
    personaGradient.addColorStop(1, '#ff1b6b');
    ctx.fillStyle = personaGradient;
    drawFittedText(ctx, `"${data.persona}"`, width / 2, 680, 950, 64, 40, 'bold', 'Orbitron, sans-serif');

    // Draw personality spider chart (smaller)
    drawSpiderChartOnCanvas(ctx, width / 2, 1080, 300, data.personality);

    // Stats at bottom (races/wins/podiums left-aligned, rank right-aligned)
    const statsY = 1560;
    const tightSpacing = 150; // Tight spacing for races, wins, podiums
    const edgeMargin = 100; // Margin from edges

    // Left group: Races, Wins, Podiums
    const leftStartX = edgeMargin + tightSpacing; // Start position for left group
    drawStatBox(ctx, leftStartX, statsY, data.totalRaces, 'RACES', '#b06af3');
    drawStatBox(ctx, leftStartX + tightSpacing, statsY, data.totalWins, 'WINS', '#b06af3');
    drawStatBox(ctx, leftStartX + tightSpacing * 2, statsY, data.totalPodiums, 'PODIUMS', '#b06af3');

    // Right: Rank
    const rightX = width - edgeMargin - tightSpacing; // Position from right edge
    drawStatBox(ctx, rightX, statsY, data.seasonRank, 'RANK', '#b06af3');

    // Team car
    await drawTeamCar(ctx, width / 2, height - 200, 0.15);

    // Website
    drawWebsite(ctx, width, height);
}

function drawSpiderChartOnCanvas(ctx, centerX, centerY, maxRadius, personality) {
    if (!personality) return;

    // Personality traits
    const traits = [
        { name: 'Confidence', value: personality.confidence || 50, angle: 0 },
        { name: 'Humility', value: personality.humility || 50, angle: Math.PI / 3 },
        { name: 'Aggression', value: personality.aggression || 50, angle: (2 * Math.PI) / 3 },
        { name: 'Professionalism', value: personality.professionalism || 50, angle: Math.PI },
        { name: 'Showmanship', value: personality.showmanship || 50, angle: (4 * Math.PI) / 3 },
        { name: 'Resilience', value: personality.resilience || 50, angle: (5 * Math.PI) / 3 }
    ];

    // Draw background grid (concentric hexagons)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;

    for (let level = 1; level <= 4; level++) {
        const radius = (maxRadius * level) / 4;
        drawPolygonOnCanvas(ctx, centerX, centerY, radius, traits.length, 0);
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;

    traits.forEach((trait) => {
        const x = centerX + maxRadius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + maxRadius * Math.sin(trait.angle - Math.PI / 2);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw trait labels
        const labelX = centerX + (maxRadius + 60) * Math.cos(trait.angle - Math.PI / 2);
        const labelY = centerY + (maxRadius + 60) * Math.sin(trait.angle - Math.PI / 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(trait.name, labelX, labelY);
    });

    // Draw data polygon with purple gradient
    const gradient = ctx.createLinearGradient(
        centerX - maxRadius,
        centerY - maxRadius,
        centerX + maxRadius,
        centerY + maxRadius
    );
    gradient.addColorStop(0, 'rgba(176, 106, 243, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 27, 107, 0.3)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#b06af3';
    ctx.lineWidth = 5;

    ctx.beginPath();
    traits.forEach((trait, index) => {
        const value = Math.max(0, Math.min(100, trait.value));
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(trait.angle - Math.PI / 2);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#ff1b6b';
    traits.forEach((trait) => {
        const value = Math.max(0, Math.min(100, trait.value));
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(trait.angle - Math.PI / 2);

        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawPolygonOnCanvas(ctx, centerX, centerY, radius, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides + rotation - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

// Helper function to draw text that fits within a max width
function drawFittedText(ctx, text, x, y, maxWidth, initialFontSize, minFontSize = 24, fontWeight = 'bold', fontFamily = '"Exo 2", sans-serif') {
    let fontSize = initialFontSize;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Reduce font size until text fits or min size reached
    while (ctx.measureText(text).width > maxWidth && fontSize > minFontSize) {
        fontSize -= 2;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    }

    // If still too wide, truncate with ellipsis
    let displayText = text;
    if (ctx.measureText(text).width > maxWidth) {
        while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
        }
        displayText += '...';
    }

    ctx.fillText(displayText, x, y);
    return fontSize;
}

function drawStatBox(ctx, x, y, value, label, accentColor = '#ff0080', maxWidth = 160) {
    // Value - scale font if needed
    ctx.fillStyle = accentColor;
    let valueFontSize = 56;
    ctx.font = `bold ${valueFontSize}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';

    // Check if value fits, reduce font if needed
    const valueStr = String(value);
    while (ctx.measureText(valueStr).width > maxWidth && valueFontSize > 32) {
        valueFontSize -= 4;
        ctx.font = `bold ${valueFontSize}px Orbitron, sans-serif`;
    }
    ctx.fillText(valueStr, x, y);

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '600 22px "Exo 2", sans-serif';
    ctx.fillText(label, x, y + 40);
}

async function drawProfilePhoto(ctx, x, y, radius) {
    // Draw circle background/border
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 128, 0.5)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // Try to load profile photo with CORS
    const existingImg = document.getElementById('profilePhoto');
    if (existingImg && existingImg.classList.contains('active') && existingImg.src) {
        try {
            // Create new image with crossOrigin to avoid tainting canvas
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const loaded = await new Promise((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                setTimeout(() => resolve(false), 5000);
                img.src = existingImg.src;
            });
            
            if (loaded && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
                ctx.restore();
                return;
            }
        } catch (e) {
            console.log('Could not load profile photo:', e);
        }
    }
    
    // Draw placeholder if photo couldn't be loaded
    drawProfilePlaceholder(ctx, x, y, radius);
    ctx.restore();
}

function drawProfilePlaceholder(ctx, x, y, radius) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `bold ${radius}px "Exo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const initials = shareStatsData.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    ctx.fillText(initials, x, y);
    ctx.textBaseline = 'alphabetic';
}

async function drawTeamCar(ctx, x, y, scale) {
    if (teamCarImage && teamCarImage.complete && teamCarImage.naturalWidth > 0) {
        const carWidth = teamCarImage.naturalWidth * scale;
        const carHeight = teamCarImage.naturalHeight * scale;
        ctx.drawImage(teamCarImage, x - carWidth / 2, y - carHeight / 2, carWidth, carHeight);
    }
}

function drawWebsite(ctx, width, height) {
    // Website URL at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 32px "Exo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('tpvcareermode.com', width / 2, height - 80);
}

function downloadShareImage() {
    const canvas = document.getElementById('shareCanvas');
    if (!canvas) return;
    
    try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `tpv-stats-${selectedTemplate}-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error('Canvas tainted, regenerating without profile photo:', e);
        // Canvas is tainted by cross-origin image - regenerate without profile photo
        skipProfilePhoto = true;
        generateShareImage().then(() => {
            try {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `tpv-stats-${selectedTemplate}-${Date.now()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (e2) {
                console.error('Still failed:', e2);
                alert('Could not download image. Please try taking a screenshot instead.');
            }
            skipProfilePhoto = false;
            // Regenerate with profile photo for preview
            generateShareImage();
        });
    }
}
