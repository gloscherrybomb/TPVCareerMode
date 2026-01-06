// Results Feed Page Logic for TPV Career Mode

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    startAfter,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configuration
const RESULTS_PER_PAGE = 15;

// State
let lastVisible = null;
let isLoading = false;
let allResultsLoaded = false;

// Get event display name from eventData (loaded in HTML)
function getEventDisplayName(eventNumber) {
    if (window.eventData && window.eventData[eventNumber]) {
        return window.eventData[eventNumber].name;
    }
    return `Event ${eventNumber}`;
}

/**
 * Get position class for styling
 */
function getPositionClass(position) {
    if (position === 'DNF') return 'other';
    if (position === 1) return 'gold';
    if (position === 2) return 'silver';
    if (position === 3) return 'bronze';
    if (position <= 10) return 'top10';
    return 'other';
}

/**
 * Get position card class
 */
function getPositionCardClass(position) {
    if (position === 'DNF') return 'position-other';
    if (position === 1) return 'position-1';
    if (position === 2) return 'position-2';
    if (position === 3) return 'position-3';
    if (position <= 10) return 'position-top10';
    return 'position-other';
}

/**
 * Get ordinal suffix for position
 */
function getOrdinalSuffix(num) {
    if (num === 'DNF') return '';
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    switch (lastDigit) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Format timestamp for display (relative time)
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

/**
 * Count awards earned from result object
 */
function countAwards(result, eventResults) {
    let count = 0;

    // Check result object awards
    const awardFlags = [
        'earnedPunchingMedal', 'earnedGiantKillerMedal', 'earnedBullseyeMedal',
        'earnedHotStreakMedal', 'earnedDomination', 'earnedCloseCall',
        'earnedPhotoFinish', 'earnedDarkHorse', 'earnedZeroToHero',
        'earnedWindTunnel', 'earnedTheAccountant', 'earnedLanternRouge',
        'earnedComeback', 'earnedPowerSurge', 'earnedSteadyEddie',
        'earnedBlastOff', 'earnedSmoothOperator', 'earnedBunchKick',
        'earnedGCGoldMedal', 'earnedGCSilverMedal', 'earnedGCBronzeMedal'
    ];

    // Count from result object
    awardFlags.forEach(flag => {
        if (result && result[flag]) count++;
    });

    // Also check eventResults from user profile
    if (eventResults) {
        awardFlags.forEach(flag => {
            if (eventResults[flag] && !(result && result[flag])) count++;
        });
    }

    return count;
}

/**
 * Create a result card HTML
 */
function createResultCard(resultData) {
    const {
        riderName,
        eventName,
        position,
        points,
        bonusPoints,
        predictedPosition,
        story,
        awardsCount,
        processedAt
    } = resultData;

    const positionText = position === 'DNF' ? 'DNF' : `${position}${getOrdinalSuffix(position)}`;
    const positionClass = getPositionClass(position);
    const cardClass = getPositionCardClass(position);

    // Build points text
    let pointsText = `${points}`;
    if (bonusPoints && bonusPoints > 0) {
        pointsText += ` <span class="bonus-points">(+${bonusPoints} bonus)</span>`;
    }

    // Build prediction HTML (optional section)
    let predictionHTML = '';
    if (predictedPosition && position !== 'DNF') {
        const diff = predictedPosition - position;
        let predictionText;
        let predictionClass = '';

        if (diff > 0) {
            predictionText = `${predictedPosition}${getOrdinalSuffix(predictedPosition)} &rarr; ${positionText} (+${diff})`;
            predictionClass = 'prediction-positive';
        } else if (diff < 0) {
            predictionText = `${predictedPosition}${getOrdinalSuffix(predictedPosition)} &rarr; ${positionText} (${diff})`;
            predictionClass = 'prediction-negative';
        } else {
            predictionText = `${positionText} (exact!)`;
            predictionClass = 'prediction-exact';
        }

        predictionHTML = `
            <div class="result-stat">
                <div class="result-stat-label"><span>&#127919;</span> Prediction</div>
                <div class="result-stat-value ${predictionClass}">${predictionText}</div>
            </div>
        `;
    }

    // Build awards HTML (optional section)
    let awardsHTML = '';
    if (awardsCount && awardsCount > 0) {
        awardsHTML = `
            <div class="result-stat">
                <div class="result-stat-label"><span>&#127942;</span> Awards</div>
                <div class="result-stat-value awards-value">${awardsCount} earned</div>
            </div>
        `;
    }

    // Build recap HTML (optional section)
    let recapHTML = '';
    if (story) {
        recapHTML = `
            <div class="result-recap">
                <div class="result-recap-label"><span>&#128214;</span> Race Recap</div>
                <p class="result-recap-text">${story}</p>
            </div>
        `;
    }

    return `
        <article class="result-card ${cardClass}">
            <div class="result-card-header">
                <h3 class="result-card-title">&#127937; ${riderName} - ${eventName}</h3>
            </div>
            <div class="result-card-body">
                <div class="result-stats-grid">
                    <div class="result-stat">
                        <div class="result-stat-label"><span>&#129351;</span> Position</div>
                        <div class="result-stat-value position-value ${positionClass}">${positionText}</div>
                    </div>
                    <div class="result-stat">
                        <div class="result-stat-label"><span>&#11088;</span> Points</div>
                        <div class="result-stat-value">${pointsText}</div>
                    </div>
                    ${predictionHTML}
                    ${awardsHTML}
                </div>
                ${recapHTML}
            </div>
            <div class="result-card-footer">
                <span class="result-footer-brand">TPV Career Mode</span>
                <span class="result-timestamp">${formatTimestamp(processedAt)}</span>
            </div>
        </article>
    `;
}

/**
 * Fetch results from Firestore
 */
async function fetchResults(isLoadMore = false) {
    if (isLoading || (isLoadMore && allResultsLoaded)) return [];

    isLoading = true;

    try {
        // Build query - order by processedAt desc, no season filter
        let q;

        if (isLoadMore && lastVisible) {
            q = query(
                collection(db, 'results'),
                orderBy('processedAt', 'desc'),
                startAfter(lastVisible),
                limit(RESULTS_PER_PAGE)
            );
        } else {
            q = query(
                collection(db, 'results'),
                orderBy('processedAt', 'desc'),
                limit(RESULTS_PER_PAGE)
            );
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty || querySnapshot.size < RESULTS_PER_PAGE) {
            allResultsLoaded = true;
        }

        // Update cursor for pagination
        if (!querySnapshot.empty) {
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

        const results = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const userUid = data.userUid;
            const eventNumber = data.event;
            const season = data.season;

            // Skip if no userUid
            if (!userUid) continue;

            // Find the user's own result in the results array
            const userResult = data.results?.find(r => r.uid === userUid);

            // Skip if user result not found or is a bot
            if (!userResult || userResult.isBot) continue;

            // Get rider name from result, or fetch from profile
            let riderName = userResult.name || 'Unknown Rider';
            let story = null;
            let predictedPosition = userResult.predictedPosition || null;
            let awardsCount = countAwards(userResult, null);

            // Try to fetch user profile for discordStory (condensed format)
            // Note: userUid is the TPV player ID, but users collection is keyed by Firebase Auth UID
            // So we need to query by the 'uid' field which stores the TPV player ID
            try {
                const userQuery = query(
                    collection(db, 'users'),
                    where('uid', '==', userUid),
                    limit(1)
                );
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    riderName = userData.name || riderName;

                    // Get event-specific results for discordStory
                    const eventResultsKey = `event${eventNumber}Results`;
                    const eventResults = userData[eventResultsKey];

                    console.log(`[FEED DEBUG] User ${riderName} (${userUid}), Event ${eventNumber}:`);
                    console.log(`[FEED DEBUG]   - eventResultsKey: ${eventResultsKey}`);
                    console.log(`[FEED DEBUG]   - eventResults exists: ${!!eventResults}`);

                    if (eventResults) {
                        console.log(`[FEED DEBUG]   - discordStory: ${eventResults.discordStory ? 'present' : 'missing'}`);
                        console.log(`[FEED DEBUG]   - story: ${eventResults.story ? 'present' : 'missing'}`);

                        // Use discordStory (condensed), fallback to first paragraph of story
                        story = eventResults.discordStory || null;
                        if (!story && eventResults.story) {
                            const firstParagraph = eventResults.story.split('\n\n')[0];
                            story = firstParagraph.length > 300
                                ? firstParagraph.substring(0, 297) + '...'
                                : firstParagraph;
                        }

                        console.log(`[FEED DEBUG]   - final story: ${story ? story.substring(0, 50) + '...' : 'none'}`);

                        // Update predicted position if available from profile
                        if (eventResults.predictedPosition) {
                            predictedPosition = eventResults.predictedPosition;
                        }

                        // Count awards including from eventResults
                        awardsCount = countAwards(userResult, eventResults);
                    }
                } else {
                    console.log(`[FEED DEBUG] No user found with TPV UID: ${userUid}`);
                }
            } catch (err) {
                console.warn(`[FEED DEBUG] Error fetching user data for ${userUid}:`, err);
            }

            // Get event name
            const eventName = getEventDisplayName(eventNumber);

            results.push({
                riderName,
                eventName,
                eventNumber,
                season,
                position: userResult.position,
                points: userResult.points || 0,
                bonusPoints: userResult.bonusPoints || 0,
                predictedPosition,
                story,
                awardsCount,
                processedAt: data.processedAt
            });
        }

        return results;

    } catch (error) {
        console.error('Error fetching results:', error);
        return [];
    } finally {
        isLoading = false;
    }
}

/**
 * Render results to the feed
 */
function renderResults(results, append = false) {
    const feedContainer = document.getElementById('resultsFeed');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const emptyState = document.getElementById('emptyState');

    if (!append) {
        feedContainer.innerHTML = '';
    }

    if (results.length === 0 && !append) {
        feedContainer.innerHTML = '';
        emptyState.style.display = 'block';
        loadMoreContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';

    results.forEach(result => {
        feedContainer.insertAdjacentHTML('beforeend', createResultCard(result));
    });

    // Show/hide load more button
    loadMoreContainer.style.display = allResultsLoaded ? 'none' : 'block';
}

/**
 * Initial load
 */
async function loadInitialResults() {
    const feedContainer = document.getElementById('resultsFeed');

    // Show loading state
    feedContainer.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading results...</p>
        </div>
    `;

    // Reset pagination state
    lastVisible = null;
    allResultsLoaded = false;

    const results = await fetchResults();
    renderResults(results);
}

/**
 * Load more results
 */
async function loadMoreResults() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    const results = await fetchResults(true);
    renderResults(results, true);

    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More Results';
}

/**
 * Initialize controls
 */
function initControls() {
    const refreshBtn = document.getElementById('refreshBtn');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadInitialResults);
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreResults);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initControls();
    loadInitialResults();
});

// Auth state listener (page is public but we track auth for potential future features)
onAuthStateChanged(auth, (user) => {
    // Results feed is public, no auth-specific logic needed for now
});
