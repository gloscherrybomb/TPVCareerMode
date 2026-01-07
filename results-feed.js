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
    where,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initRiderProfileModal, makeRiderNameClickable } from './rider-profile-modal.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize rider profile modal for clickable rider names/photos
initRiderProfileModal(db);

// Configuration
const RESULTS_PER_PAGE = 15;

// State
let lastVisible = null;
let isLoading = false;
let allResultsLoaded = false;
let currentUserProgress = null; // Highest completed event number for current user
let currentUser = null;
let currentUserTpvUid = null; // TPV player ID for current user
let userHighFives = {}; // Track high 5 state per result (key: resultDocId, value: boolean)

/**
 * Calculate which events the user can see (spoiler protection)
 * Users can see events up to their last completed event + 1 (next choices)
 */
function canSeeEventName(eventNumber) {
    // No progress data yet - show first 2 events by default (be conservative)
    if (currentUserProgress === null) return eventNumber <= 2;

    // Rider's Choice events (6-12) are visible once user completes Stage 2 (event 2)
    // because they become available to choose at Stage 3
    const isRidersChoiceEvent = eventNumber >= 6 && eventNumber <= 12;
    if (isRidersChoiceEvent && currentUserProgress >= 2) {
        return true;
    }

    // Can see events up to progress + 1 (next stage choices)
    return eventNumber <= currentUserProgress + 1;
}

/**
 * Get event display name from eventData (loaded in HTML)
 * Obfuscates future events for spoiler protection
 */
function getEventDisplayName(eventNumber, forceReveal = false) {
    // Check if this is a special event
    const specialEvent = window.specialEventData && window.specialEventData[eventNumber];
    const regularEvent = window.eventData && window.eventData[eventNumber];

    // Special events with isFreeEvent always show their name (e.g., The Leveller)
    if (specialEvent && specialEvent.isFreeEvent) {
        return specialEvent.name;
    }

    // Check spoiler protection for other events
    if (!forceReveal && !canSeeEventName(eventNumber)) {
        // Return appropriate placeholder based on event type
        if (specialEvent) {
            return 'Special Event';
        }
        if (regularEvent && regularEvent.mandatory === false) {
            return "Rider's Choice Event";
        }
        // Handle Local Tour stages (events 13, 14, 15 = Stage 9.1, 9.2, 9.3)
        if (eventNumber >= 13 && eventNumber <= 15) {
            const tourStageNum = eventNumber - 12;
            return `Stage 9.${tourStageNum}`;
        }
        return `Stage ${eventNumber}`;
    }

    // Event is visible - return actual name
    if (specialEvent) {
        return specialEvent.name;
    }
    if (regularEvent) {
        return regularEvent.name;
    }
    return `Event ${eventNumber}`;
}

/**
 * Fetch current user's progress (highest completed event)
 */
async function fetchUserProgress(user) {
    if (!user) {
        currentUserProgress = null;
        currentUserTpvUid = null;
        return;
    }

    try {
        const userQuery = query(
            collection(db, 'users'),
            where('email', '==', user.email),
            limit(1)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();

            // Store TPV UID for high 5 self-check
            currentUserTpvUid = userData.uid || null;

            // Find highest completed event (check event15Results down to event1Results)
            let highestCompleted = 0;
            for (let i = 15; i >= 1; i--) {
                if (userData[`event${i}Results`]) {
                    highestCompleted = i;
                    break;
                }
            }

            currentUserProgress = highestCompleted;
            console.log(`[FEED] User progress: completed up to event ${highestCompleted}`);
        } else {
            // User exists in auth but not in users collection yet
            currentUserProgress = 0;
            currentUserTpvUid = null;
        }
    } catch (error) {
        console.error('[FEED] Error fetching user progress:', error);
        currentUserProgress = 0;
        currentUserTpvUid = null;
    }
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
 * Generate a simple performance summary when discordStory is not available
 */
function generateFallbackSummary(position, predictedPosition, eventName, points) {
    // Handle Rider's Choice event phrasing for natural sentence flow
    const displayEventName = eventName === "Rider's Choice Event"
        ? "one of the Rider's Choice events"
        : eventName;

    if (position === 'DNF') {
        return `A DNF at ${displayEventName}. Racing can be unforgiving - zero points and lessons to process.`;
    }

    const posText = `${position}${getOrdinalSuffix(position)}`;
    const diff = predictedPosition ? predictedPosition - position : 0;

    // Win
    if (position === 1) {
        if (diff >= 5) {
            return `Victory at ${displayEventName}! Predicted ${predictedPosition}${getOrdinalSuffix(predictedPosition)}, finished 1st - a stunning upset performance.`;
        }
        return `Victory at ${displayEventName}! A well-executed race capped with a winning performance.`;
    }

    // Podium
    if (position <= 3) {
        if (diff >= 3) {
            return `${posText} at ${displayEventName}, beating predictions of ${predictedPosition}${getOrdinalSuffix(predictedPosition)}. A podium finish worth celebrating.`;
        }
        return `${posText} at ${displayEventName}. A solid podium finish with ${points} points earned.`;
    }

    // Top 10
    if (position <= 10) {
        if (diff >= 5) {
            return `${posText} at ${displayEventName} - well ahead of the predicted ${predictedPosition}${getOrdinalSuffix(predictedPosition)}. A strong result.`;
        }
        if (diff <= -3) {
            return `${posText} at ${displayEventName}, below the predicted ${predictedPosition}${getOrdinalSuffix(predictedPosition)}. Points earned, but room for improvement.`;
        }
        return `${posText} at ${displayEventName}. A respectable top-10 finish keeping the season on track.`;
    }

    // Midpack/Back
    if (diff >= 5) {
        return `${posText} at ${displayEventName} - better than the predicted ${predictedPosition}${getOrdinalSuffix(predictedPosition)}. Progress is progress.`;
    }
    return `${posText} at ${displayEventName}. Points banked and experience gained for future races.`;
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

    // Check result object awards - must match all awards from awards-config.js
    const awardFlags = [
        // Podium awards
        'earnedGoldMedal', 'earnedSilverMedal', 'earnedBronzeMedal',
        // Special position awards
        'earnedLanternRouge',
        // Performance vs prediction awards
        'earnedPunchingMedal', 'earnedGiantKillerMedal', 'earnedBullseyeMedal',
        'earnedHotStreakMedal',
        // Margin of victory awards
        'earnedDomination', 'earnedCloseCall', 'earnedPhotoFinish',
        // Prediction performance awards
        'earnedDarkHorse',
        // Progression awards
        'earnedZeroToHero',
        // GC awards
        'earnedGCGoldMedal', 'earnedGCSilverMedal', 'earnedGCBronzeMedal',
        // Fun/Special awards
        'earnedComeback',
        // Time Trial awards
        'earnedWindTunnel',
        // Points Race awards
        'earnedTheAccountant',
        // Special Event awards
        'earnedTheEqualizer', 'earnedSingaporeSling',
        // Power-based awards
        'earnedPowerSurge', 'earnedSteadyEddie', 'earnedBlastOff',
        'earnedSmoothOperator', 'earnedBunchKick'
    ];

    // Track which awards we've already counted to avoid duplicates
    const countedAwards = new Set();

    // Count from result object (boolean flags)
    awardFlags.forEach(flag => {
        if (result && result[flag]) {
            countedAwards.add(flag);
            count++;
        }
    });

    // Also check eventResults from user profile (boolean flags)
    if (eventResults) {
        awardFlags.forEach(flag => {
            if (eventResults[flag] && !countedAwards.has(flag)) {
                countedAwards.add(flag);
                count++;
            }
        });

        // Also check earnedAwards array (some awards stored as { awardId: 'xxx' } objects)
        if (eventResults.earnedAwards && Array.isArray(eventResults.earnedAwards)) {
            eventResults.earnedAwards.forEach(award => {
                if (award && award.awardId) {
                    // Convert awardId to earnedX format for dedup check
                    const flagName = 'earned' + award.awardId.charAt(0).toUpperCase() + award.awardId.slice(1);
                    if (!countedAwards.has(flagName)) {
                        countedAwards.add(flagName);
                        count++;
                    }
                }
            });
        }
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
        processedAt,
        resultDocId,
        highFiveCount,
        resultOwnerUid,
        profileUid,
        photoURL
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

    // High 5 button (in card header)
    const canHighFive = currentUser !== null;
    const hasHighFived = userHighFives[resultDocId] || false;
    const isOwnResult = currentUserTpvUid && currentUserTpvUid === resultOwnerUid;

    let highFiveHeaderHTML = '';
    if (isOwnResult) {
        // Show count only for own results (if any high 5s received)
        if (highFiveCount > 0) {
            highFiveHeaderHTML = `
                <div class="high-five-header high-five-own">
                    <span class="high-five-icon">&#9995;</span>
                    <span class="high-five-count">${highFiveCount}</span>
                </div>`;
        }
    } else {
        highFiveHeaderHTML = `
            <button class="high-five-header ${hasHighFived ? 'high-five-active' : ''}"
                    onclick="toggleHighFive('${resultDocId}', '${resultOwnerUid}')"
                    ${!canHighFive ? 'disabled title="Log in to give High 5s"' : ''}
                    aria-label="${hasHighFived ? 'Remove High 5' : 'Give High 5'}">
                <span class="high-five-icon">&#9995;</span>
                <span class="high-five-text">${hasHighFived ? 'High 5 given!' : 'Give high 5'}</span>
                ${highFiveCount > 0 ? `<span class="high-five-count">${highFiveCount}</span>` : ''}
            </button>
        `;
    }

    // Generate initials for avatar placeholder (same as profile modal)
    const initials = riderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Build profile image HTML (clickable to open rider profile if profileUid exists)
    const profileImageHTML = profileUid
        ? (photoURL
            ? `<img src="${photoURL}" alt="${riderName}" class="rider-name-link" data-rider-uid="${profileUid}" data-rider-name="${riderName}">`
            : `<div class="result-profile-placeholder rider-name-link" data-rider-uid="${profileUid}" data-rider-name="${riderName}">${initials}</div>`)
        : (photoURL
            ? `<img src="${photoURL}" alt="${riderName}">`
            : `<div class="result-profile-placeholder">${initials}</div>`);

    // Make rider name clickable only if we have a valid profileUid
    const riderNameHTML = profileUid
        ? makeRiderNameClickable(riderName, profileUid)
        : riderName;

    return `
        <div class="result-card-wrapper" data-result-id="${resultDocId}">
            <article class="result-card ${cardClass}">
                <div class="result-card-header">
                    <h3 class="result-card-title">&#127937; ${riderNameHTML} - ${eventName}</h3>
                    ${highFiveHeaderHTML}
                </div>
                <div class="result-card-body">
                    <div class="result-body-layout">
                        <div class="result-profile-column">
                            <div class="result-profile-image">
                                ${profileImageHTML}
                            </div>
                        </div>
                        <div class="result-stats-column">
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
                        </div>
                        <div class="result-recap-column">
                            ${recapHTML}
                        </div>
                    </div>
                </div>
                <div class="result-card-footer">
                    <span class="result-footer-brand">TPV Career Mode</span>
                    <span class="result-timestamp">${formatTimestamp(processedAt)}</span>
                </div>
            </article>
        </div>
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
            let photoURL = null;
            let firebaseAuthUid = null; // Firebase Auth UID for profile modal

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
                    firebaseAuthUid = userSnapshot.docs[0].id; // Get the Firebase Auth document ID
                    const userData = userSnapshot.docs[0].data();
                    riderName = userData.name || riderName;
                    photoURL = userData.photoURL || null;

                    // Get event-specific results for discordStory
                    const eventResultsKey = `event${eventNumber}Results`;
                    const eventResults = userData[eventResultsKey];

                    console.log(`[FEED DEBUG] User ${riderName} (${userUid}), Event ${eventNumber}:`);
                    console.log(`[FEED DEBUG]   - eventResultsKey: ${eventResultsKey}`);
                    console.log(`[FEED DEBUG]   - eventResults exists: ${!!eventResults}`);

                    if (eventResults) {
                        console.log(`[FEED DEBUG]   - discordStory: ${eventResults.discordStory ? 'present' : 'missing'}`);
                        console.log(`[FEED DEBUG]   - story: ${eventResults.story ? 'present' : 'missing'}`);

                        // Use discordStory (condensed ~50-70 words) if available
                        story = eventResults.discordStory || null;

                        // Note: We don't fallback to eventResults.story because that's the narrative intro,
                        // not the race performance recap. The fallback summary will be generated later
                        // using the result data if discordStory is missing.

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

            // Use discordStory if available, otherwise generate a fallback summary
            const finalStory = story || generateFallbackSummary(
                userResult.position,
                predictedPosition,
                eventName,
                userResult.points || 0
            );

            // High 5 data
            const resultDocId = docSnap.id;
            const highFiveCount = data.highFiveCount || 0;
            const highFiveUsers = data.highFiveUsers || [];

            // Track if current user has high-fived this result
            if (currentUser) {
                userHighFives[resultDocId] = highFiveUsers.includes(currentUser.uid);
            }

            results.push({
                riderName,
                eventName,
                eventNumber,
                season,
                position: userResult.position,
                points: userResult.points || 0,
                bonusPoints: userResult.bonusPoints || 0,
                predictedPosition,
                story: finalStory,
                awardsCount,
                processedAt: data.processedAt,
                resultDocId,
                highFiveCount,
                resultOwnerUid: userUid, // TPV UID for high-five self-check
                profileUid: firebaseAuthUid, // Firebase Auth UID for profile modal (null if not found)
                photoURL
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
 * Show login required prompt
 */
function showLoginPrompt() {
    const feedContainer = document.getElementById('resultsFeed');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const emptyState = document.getElementById('emptyState');

    if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    feedContainer.innerHTML = `
        <div class="login-prompt">
            <div class="login-prompt-icon">&#128274;</div>
            <h3>Login Required</h3>
            <p>Please log in to view the results feed.</p>
            <p class="login-hint">Click "Login" in the navigation bar to continue.</p>
        </div>
    `;
}

/**
 * Initial load
 */
async function loadInitialResults() {
    const feedContainer = document.getElementById('resultsFeed');

    // Require login to view results feed
    if (!currentUser) {
        showLoginPrompt();
        return;
    }

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
    userHighFives = {}; // Reset high 5 tracking

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
 * Toggle high 5 on a result
 * @param {string} resultDocId - Firestore document ID
 * @param {string} resultOwnerUid - TPV UID of the result owner
 */
async function toggleHighFive(resultDocId, resultOwnerUid) {
    // Require authentication
    if (!currentUser) {
        alert('Please log in to give High 5s');
        return;
    }

    // Prevent self high-fiving
    if (currentUserTpvUid && currentUserTpvUid === resultOwnerUid) {
        console.log('[HIGH5] Cannot high 5 your own result');
        return;
    }

    const resultRef = doc(db, 'results', resultDocId);
    const hasHighFived = userHighFives[resultDocId] || false;

    // Get UI elements for optimistic update
    const button = document.querySelector(`[data-result-id="${resultDocId}"] .high-five-header`);
    const countEl = document.querySelector(`[data-result-id="${resultDocId}"] .high-five-count`);
    const textEl = document.querySelector(`[data-result-id="${resultDocId}"] .high-five-text`);

    if (button) {
        const currentCount = countEl ? parseInt(countEl.textContent) || 0 : 0;

        if (hasHighFived) {
            // Removing high 5 - optimistic update
            button.classList.remove('high-five-active');
            if (textEl) textEl.textContent = 'Give high 5';
            if (countEl) {
                const newCount = Math.max(0, currentCount - 1);
                if (newCount === 0) {
                    countEl.remove();
                } else {
                    countEl.textContent = newCount;
                }
            }
        } else {
            // Adding high 5 - optimistic update
            button.classList.add('high-five-active');
            if (textEl) textEl.textContent = 'High 5 given!';
            if (countEl) {
                countEl.textContent = currentCount + 1;
            } else {
                // Add count element if it doesn't exist
                const newCountEl = document.createElement('span');
                newCountEl.className = 'high-five-count';
                newCountEl.textContent = '1';
                button.appendChild(newCountEl);
            }
        }
    }

    try {
        if (hasHighFived) {
            // Remove high 5
            await updateDoc(resultRef, {
                highFiveCount: increment(-1),
                highFiveUsers: arrayRemove(currentUser.uid)
            });
            userHighFives[resultDocId] = false;
            console.log('[HIGH5] Removed high 5');
        } else {
            // Add high 5
            await updateDoc(resultRef, {
                highFiveCount: increment(1),
                highFiveUsers: arrayUnion(currentUser.uid)
            });
            userHighFives[resultDocId] = true;
            console.log('[HIGH5] Added high 5');
        }
    } catch (error) {
        console.error('[HIGH5] Error toggling high 5:', error);

        // Revert optimistic update on error
        if (button) {
            const currentCountEl = button.querySelector('.high-five-count');
            const currentTextEl = button.querySelector('.high-five-text');
            const currentCount = currentCountEl ? parseInt(currentCountEl.textContent) || 0 : 0;

            if (hasHighFived) {
                // Was trying to remove - revert to active state
                button.classList.add('high-five-active');
                if (currentTextEl) currentTextEl.textContent = 'High 5 given!';
                if (currentCountEl) {
                    currentCountEl.textContent = currentCount + 1;
                }
            } else {
                // Was trying to add - revert to inactive state
                button.classList.remove('high-five-active');
                if (currentTextEl) currentTextEl.textContent = 'Give high 5';
                if (currentCountEl) {
                    const newCount = Math.max(0, currentCount - 1);
                    if (newCount === 0) {
                        currentCountEl.remove();
                    } else {
                        currentCountEl.textContent = newCount;
                    }
                }
            }
        }

        alert('Failed to save High 5. Please try again.');
    }
}

// Expose high 5 function globally for inline onclick handlers
window.toggleHighFive = toggleHighFive;

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

// Track if DOM is ready
let domReady = false;
let pendingAuthLoad = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    initControls();

    // If auth already fired before DOM was ready, load now
    if (pendingAuthLoad) {
        pendingAuthLoad = false;
        loadInitialResults();
    }
});

// Auth state listener - fetch user progress for spoiler protection
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // Fetch user progress if logged in
    await fetchUserProgress(user);

    // Load/reload results with appropriate spoiler protection
    if (domReady) {
        loadInitialResults();
    } else {
        // DOM not ready yet, mark for loading when ready
        pendingAuthLoad = true;
    }
});
