// event-detail-results.js - Display event results on event detail page

import { firebaseConfig } from './firebase-config.js';
import { formatTime } from './utils.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { makeNameClickable } from './bot-profile-modal.js';
import { displayPostRaceInterview } from './event-detail-interview.js';

// TIME_BASED_EVENTS will be retrieved when needed to avoid timing issues with window.eventConfig
function getTimeBasedEvents() {
    console.log('getTimeBasedEvents called, window.eventConfig:', window.eventConfig);
    return window.eventConfig?.TIME_BASED_EVENTS || [];
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let eventNumber = null;

/**
 * Helper function to get icon from icon system with fallback
 */
function getIcon(iconId, size = 'md') {
    if (window.TPVIcons) {
        return window.TPVIcons.getIcon(iconId, { size });
    }
    // Fallback emojis
    const fallbacks = {
        trophy: '🏆', warning: '⚠️', stats: '📊',
        goldMedal: '🥇', silverMedal: '🥈', bronzeMedal: '🥉',
        gcGold: '🏆', gcSilver: '🏆', gcBronze: '🏆',  // Special GC trophies
        punchingAbove: '🥊', giantKiller: '⚔️', bullseye: '🎯', domination: '💪',
        closeCall: '😅', photoFinish: '📸', darkHorse: '🐴', hotStreak: '🔥',
        zeroToHero: '🚀', powerSurge: '💥', steadyEddie: '📊', blastOff: '🚀'
    };
    return fallbacks[iconId] || '';
}

/**
 * Get event number from URL parameters
 */
function getEventNumber() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id')) || 1;
}

// formatTime function now imported from utils.js

/**
 * Format delta time with +/- sign
 */
function formatDeltaTime(seconds) {
    if (seconds === 0) return '—';
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    return seconds > 0 ? `+${timeStr}` : `-${timeStr}`;
}

/**
 * Get ARR band label
 */
function getARRBand(arr) {
    if (!arr || arr < 300) return 'Unranked';
    
    // Diamond: 1600-2000 (4 tiers)
    if (arr >= 1900) return 'Diamond 4';
    if (arr >= 1800) return 'Diamond 3';
    if (arr >= 1700) return 'Diamond 2';
    if (arr >= 1600) return 'Diamond 1';
    
    // Platinum: 1300-1599 (3 tiers)
    if (arr >= 1500) return 'Platinum 3';
    if (arr >= 1400) return 'Platinum 2';
    if (arr >= 1300) return 'Platinum 1';
    
    // Gold: 1000-1299 (3 tiers)
    if (arr >= 1200) return 'Gold 3';
    if (arr >= 1100) return 'Gold 2';
    if (arr >= 1000) return 'Gold 1';
    
    // Silver: 700-999 (3 tiers)
    if (arr >= 900) return 'Silver 3';
    if (arr >= 800) return 'Silver 2';
    if (arr >= 700) return 'Silver 1';
    
    // Bronze: 300-699 (3 tiers)
    if (arr >= 500) return 'Bronze 3';
    if (arr >= 400) return 'Bronze 2';
    if (arr >= 300) return 'Bronze 1';
    
    return 'Unranked';
}

/**
 * Show pre-race sections (story, route, scoring, cta)
 */
async function showPreRaceSections(userData, userUid) {
    const sectionsToShow = [
        '.event-story',
        '.event-route',
        '.event-scoring',
        '.event-cta'
    ];
    
    sectionsToShow.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.style.display = 'block';
        }
    });
    
    // Add "Back to Local Tour" button for tour events (13, 14, 15)
    if (eventNumber === 13 || eventNumber === 14 || eventNumber === 15) {
        addBackToTourButton();
    }

    // Add tour timing warning for multi-stage events
    addTourTimingWarning(eventNumber);

    // Clear any remaining loading states
    document.querySelectorAll('.section-loading').forEach(section => {
        section.classList.remove('section-loading');
        section.classList.add('section-loaded');
    });
}

/**
 * Display GC (General Classification) results table
 */
/**
 * Add back to Local Tour button
 */
function addBackToTourButton() {
    // Check if button already exists
    if (document.querySelector('.back-to-tour-button')) {
        return;
    }
    
    const buttonHTML = `
        <div class="back-to-tour-button">
            <a href="local-tour.html" class="back-button">
                <span class="back-icon">←</span>
                <span>Back to Local Tour</span>
            </a>
        </div>
    `;
    
    // Insert at the top of the main content
    const mainContent = document.querySelector('.page-header');
    if (mainContent) {
        mainContent.insertAdjacentHTML('afterend', buttonHTML);
    }
}

/**
 * Display tour overview with progress and stage links
 */
async function displayTourOverview(eventNumber, userData, userUid) {
    const tourStages = [
        { eventNum: 13, stageName: "Local Tour Stage 1", routeName: "Figure of 8", distance: "35.2km", climbing: "174m" },
        { eventNum: 14, stageName: "Local Tour Stage 2", routeName: "Loop the Loop", distance: "27.3km", climbing: "169m" },
        { eventNum: 15, stageName: "Local Tour Stage 3", routeName: "A Bit of Everything", distance: "28.1km", climbing: "471m" }
    ];
    
    // Check which stages are completed
    const completedStages = [];
    for (const stage of tourStages) {
        if (userData[`event${stage.eventNum}Results`]) {
            completedStages.push(stage.eventNum);
        }
    }
    
    // Determine which stage is "current" (next to complete)
    let currentStage = null;
    for (const stage of tourStages) {
        if (!completedStages.includes(stage.eventNum)) {
            currentStage = stage.eventNum;
            break;
        }
    }
    
    const progress = completedStages.length;
    
    let html = `
        <div class="tour-overview-section">
            <h3 class="tour-title">
                <span class="tour-icon">${getIcon('trophy', 'sm')}</span>
                Local Tour Progress
            </h3>
            <p class="tour-subtitle">${progress} of 3 stages completed</p>
            
            <div class="tour-stages-grid">
    `;
    
    // Display each stage
    for (const stage of tourStages) {
        const isCompleted = completedStages.includes(stage.eventNum);
        const isCurrent = stage.eventNum === currentStage;
        const isViewing = stage.eventNum === eventNumber;
        const stageResults = userData[`event${stage.eventNum}Results`];
        
        // Check for DNS
        const isDNS = userData[`event${stage.eventNum}DNS`];
        const dnsReason = userData[`event${stage.eventNum}DNSReason`];
        
        // Determine if this card should be clickable
        const isClickable = (stage.eventNum !== eventNumber); // Can click if not currently viewing this stage
        
        html += `
            <div class="tour-stage-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isDNS ? 'dns' : 'upcoming'} ${isClickable ? 'clickable' : 'viewing'}" 
                 ${isClickable ? `onclick="window.location.href='event-detail.html?id=${stage.eventNum}'"` : ''}>
                <div class="stage-header">
                    <div class="stage-number">${stage.stageName}</div>
                    <div class="stage-stats">${stage.distance} • ${stage.climbing}</div>
                </div>
                <div class="stage-name">${stage.routeName}</div>
                
                ${isDNS ? `
                    <div class="stage-dns-badge">
                        <div class="dns-icon">${getIcon('warning', 'sm')}</div>
                        <div class="dns-text">
                            <strong>DNS</strong>
                            <span class="dns-reason">${dnsReason || 'Did not start within 36-hour window'}</span>
                        </div>
                    </div>
                ` : isCompleted ? `
                    <div class="stage-result">
                        <div class="result-item">
                            <span class="result-label">Position</span>
                            <span class="result-value">${stageResults.position}${getOrdinalSuffix(stageResults.position)}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Time</span>
                            <span class="result-value">${formatTime(stageResults.time)}</span>
                        </div>
                    </div>
                    ${!isViewing ? `
                        <div class="stage-action">Click to view results</div>
                    ` : `
                        <div class="stage-viewing-badge">Viewing results below</div>
                    `}
                ` : isCurrent ? `
                    <div class="stage-status">
                        <span class="status-icon">▶️</span>
                        <span class="status-text">Next Stage</span>
                    </div>
                    ${!isViewing ? `
                        <div class="stage-action">Click to view details</div>
                    ` : `
                        <div class="stage-viewing-badge">Viewing details below</div>
                    `}
                ` : `
                    <div class="stage-status">
                        <span class="status-icon">📅</span>
                        <span class="status-text">Upcoming</span>
                    </div>
                    ${!isViewing ? `
                        <div class="stage-action">Click to view details</div>
                    ` : `
                        <div class="stage-viewing-badge">Viewing details below</div>
                    `}
                `}
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Generate tour completion story for after all 3 stages
 */
function generateTourCompletionStory(userData, gcResults) {
    if (!gcResults || !gcResults.standings) return '';
    
    const userResult = gcResults.standings.find(r => r.uid === userData.uid);
    if (!userResult) return '';
    
    const gcPosition = userResult.gcPosition;
    const totalRiders = gcResults.standings.length;
    const gapToLeader = userResult.gapToLeader;
    
    // Get stage results
    const stage1Result = userData.event13Results;
    const stage2Result = userData.event14Results;
    const stage3Result = userData.event15Results;
    
    let storyRecap = '';
    let storyContext = '';
    
    // Different story based on GC performance
    if (gcPosition === 1) {
        storyRecap = `What a remarkable performance across all three stages! You dominated the Local Tour from start to finish, showcasing consistency and strength. `;
        storyRecap += `Stage by stage, you built your advantage: ${getStagePerformanceText(stage1Result, stage2Result, stage3Result)}. `;
        storyRecap += `Your cumulative time of ${formatGCTime(userResult.cumulativeTime)} was unbeatable, earning you the prestigious yellow jersey and the GC victory!`;
        
        storyContext = `This Local Tour win is a massive milestone in your career. The ability to perform across multiple consecutive days shows true stage racing prowess. `;
        storyContext += `You've earned 50 bonus points for the overall GC victory, plus your stage points. This victory will boost your reputation and open doors to bigger opportunities!`;
    } else if (gcPosition === 2) {
        storyRecap = `A strong performance across the three-day Local Tour, earning you second place overall. `;
        storyRecap += `${getStagePerformanceText(stage1Result, stage2Result, stage3Result)}. `;
        storyRecap += `You finished just ${formatGCTime(gapToLeader)} behind the leader, showing you have what it takes to compete at this level.`;
        
        storyContext = `Second place in a multi-stage tour is an excellent result! You've earned 35 bonus points for your GC performance. `;
        storyContext += `The consistency you showed across all three days proves you're developing into a serious stage racer. Keep building on this momentum!`;
    } else if (gcPosition === 3) {
        storyRecap = `You secured third place overall in the Local Tour, earning a spot on the final GC podium! `;
        storyRecap += `${getStagePerformanceText(stage1Result, stage2Result, stage3Result)}. `;
        storyRecap += `Finishing ${formatGCTime(gapToLeader)} down on the leader, you demonstrated solid stage racing ability.`;
        
        storyContext = `A podium finish in your first multi-stage tour is something to be proud of! You've earned 25 bonus points for third place in the GC. `;
        storyContext += `This experience will serve you well as you continue to develop your stage racing skills and target even bigger goals.`;
    } else if (gcPosition <= 10) {
        storyRecap = `You finished the Local Tour in ${gcPosition}${getOrdinalSuffix(gcPosition)} place overall, a respectable result in a competitive field. `;
        storyRecap += `${getStagePerformanceText(stage1Result, stage2Result, stage3Result)}. `;
        storyRecap += `You finished ${formatGCTime(gapToLeader)} behind the race leader.`;
        
        storyContext = `Completing all three stages and finishing in the top 10 is a solid achievement. While you didn't make the GC podium this time, `;
        storyContext += `you've gained valuable experience in multi-day racing. Analyze where you lost time and use this as motivation for future tours!`;
    } else {
        storyRecap = `You completed all three stages of the Local Tour, finishing ${gcPosition}${getOrdinalSuffix(gcPosition)} overall out of ${totalRiders} riders. `;
        storyRecap += `${getStagePerformanceText(stage1Result, stage2Result, stage3Result)}. `;
        storyRecap += `Every rider who completes a three-day tour has earned respect - consistency across multiple days is challenging!`;
        
        storyContext = `While you didn't challenge for the GC podium, you've completed your first multi-stage tour. This experience is invaluable. `;
        storyContext += `Stage racing requires a different skillset than single-day events. Learn from this, work on your recovery between stages, and you'll improve!`;
    }
    
    // Check if season is complete
    const seasonComplete = userData.season1Complete === true;
    const seasonRank = userData.season1Rank || null;
    
    // If season is complete, add season wrap-up
    let seasonWrapUp = '';
    if (seasonComplete) {
        seasonWrapUp = `
            <div class="story-section" style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); border: 2px solid #00ff88; border-radius: 8px; padding: 1.5rem; margin-top: 1.5rem;">
                <h4>${getIcon('trophy', 'sm')} Season 1 Complete</h4>
                <p>The Local Tour was the final chapter of Season 1, and now the season is officially complete. `;
        
        if (seasonRank === 1) {
            seasonWrapUp += `You didn't just finish the season—you won it. First place overall in the Season 1 standings. Champion. `;
        } else if (seasonRank === 2) {
            seasonWrapUp += `You finished second overall in the Season 1 standings—a runner-up finish that proves you belong at the front of the field. `;
        } else if (seasonRank === 3) {
            seasonWrapUp += `Third place overall in the Season 1 standings earns you a spot on the season podium. A bronze medal season is an excellent foundation. `;
        } else if (seasonRank <= 10) {
            seasonWrapUp += `You finished ${seasonRank}th overall in the Season 1 standings—a top-10 finish shows consistent performance throughout the year. `;
        } else {
            seasonWrapUp += `Season 1 is now in the books. You competed in all the events, gained experience, and finished ${seasonRank}th overall in the standings. `;
        }
        
        seasonWrapUp += `</p><p>Every race this season taught you something. Every result—good or bad—built experience. The local amateur circuits have been conquered. `;
        seasonWrapUp += `Season 2 launches in Spring 2026 with Continental Pro racing: longer events, tougher competition, and bigger stakes. `;
        seasonWrapUp += `The off-season is here. Time to rest, reflect on how far you've come, and prepare for the next level. Your journey continues.</p>`;
        seasonWrapUp += `</div>`;
    }
    
    return `
        <div class="tour-completion-story">
            <div class="story-header">
                <h3>🏁 Local Tour Complete - Final GC Review</h3>
            </div>
            <div class="story-section">
                <h4>Tour Performance</h4>
                <p>${storyRecap}</p>
            </div>
            <div class="story-section">
                <h4>${seasonComplete ? 'Tour Reflection' : 'Looking Ahead'}</h4>
                <p>${storyContext}</p>
            </div>
            ${seasonWrapUp}
        </div>
    `;
}

/**
 * Get text describing performance across stages
 */
function getStagePerformanceText(stage1, stage2, stage3) {
    const positions = [stage1.position, stage2.position, stage3.position];
    const bestStage = Math.min(...positions);
    const bestStageNum = positions.indexOf(bestStage) + 1;
    
    let text = '';
    
    if (bestStage === 1) {
        text += `You won stage ${bestStageNum}, showing your winning capability. `;
    } else if (bestStage <= 3) {
        text += `You finished on the podium in stage ${bestStageNum}, demonstrating strong form. `;
    } else if (bestStage <= 10) {
        text += `Your best stage was a ${bestStage}${getOrdinalSuffix(bestStage)} place finish in stage ${bestStageNum}. `;
    }
    
    // Check consistency
    const maxPos = Math.max(...positions);
    const minPos = Math.min(...positions);
    const variance = maxPos - minPos;
    
    if (variance <= 3) {
        text += `Your consistent performance across all three stages (positions ${positions.join(', ')}) was key to your GC result`;
    } else if (variance <= 10) {
        text += `With stage finishes of ${positions.join(', ')}, you showed decent consistency`;
    } else {
        text += `Your stage results varied (${positions.join(', ')}), showing some ups and downs`;
    }
    
    return text;
}

/**
 * Format GC time (hours, minutes, seconds)
 */
function formatGCTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else {
        return `${minutes}m ${secs}s`;
    }
}

/**
 * Add 36-hour warning for multi-stage tour events
 */
function addTourTimingWarning(eventNumber) {
    const tourEvents = [13, 14, 15];
    if (!tourEvents.includes(eventNumber)) return;

    // Find the event CTA section
    const ctaSection = document.querySelector('.event-cta');
    if (!ctaSection) return;

    // Create warning message
    const warningHTML = `
        <div class="tour-timing-warning">
            <div class="warning-icon">${getIcon('warning', 'md')}</div>
            <div class="warning-content">
                <h4>Multi-Stage Race Timing Requirements</h4>
                <p><strong>Important:</strong> All tour stages must be completed within strict time windows:</p>
                <ul>
                    <li>Stage 2 must be completed within <strong>36 hours</strong> of completing Stage 1</li>
                    <li>Stage 3 must be completed within <strong>36 hours</strong> of completing Stage 2</li>
                </ul>
                <p class="warning-note">Schedule your stages carefully to ensure you can complete all three within the required timeframes!</p>
            </div>
        </div>
    `;
    
    // Insert warning before the CTA button
    const scheduleButton = document.getElementById('scheduleButton');
    if (scheduleButton) {
        scheduleButton.insertAdjacentHTML('beforebegin', warningHTML);
    }
}

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

/**
 * Display GC (General Classification) results for tour events
 */
async function displayGCResults(gcData, currentUserUid, eventNumber) {
    if (!gcData || !gcData.standings || gcData.standings.length === 0) {
        return '';
    }
    
    const standings = gcData.standings;
    const isProvisional = gcData.isProvisional || eventNumber < 15;
    const stagesIncluded = gcData.stagesIncluded || (eventNumber - 12); // 13->1, 14->2, 15->3
    
    // Determine title and description based on stage
    let title, description;
    if (eventNumber === 13) {
        title = `${getIcon('stats', 'sm')} General Classification - After Stage 1`;
        description = 'Current GC standings after the opening stage. Two stages remain.';
    } else if (eventNumber === 14) {
        title = `${getIcon('stats', 'sm')} General Classification - After Stage 2`;
        description = 'Current GC standings after two stages. One stage remains - the GC battle continues tomorrow!';
    } else {
        title = `${getIcon('trophy', 'sm')} General Classification - Final Overall Results`;
        description = 'Final GC standings after all three stages of the Local Tour';
    }
    
    // Format time helper
    const formatGCTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else {
            return `${minutes}m ${secs}s`;
        }
    };
    
    // Format gap helper
    const formatGap = (gap) => {
        if (gap === 0) return '-';
        return `+${formatGCTime(gap)}`;
    };
    
    let html = `
        <div class="gc-results-section ${isProvisional ? 'provisional' : 'final'}">
            <div class="gc-header-banner">
                <div class="gc-header-icon">${getIcon('trophy', 'lg')}</div>
                <div class="gc-header-content">
                    <h2 class="gc-section-title">LOCAL TOUR GENERAL CLASSIFICATION</h2>
                    <h3 class="gc-title">${title}</h3>
                    <p class="gc-description">${description}</p>
                </div>
            </div>
            <div class="results-table-wrapper">
                <table class="results-table gc-table">
                    <thead>
                        <tr>
                            <th>GC</th>
                            <th>Rider</th>
                            <th>Team</th>
                            <th>Total Time</th>
                            <th>Gap</th>
                            <th>ARR</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    standings.forEach((rider) => {
        const isCurrentUser = rider.uid === currentUserUid;
        const rowClass = isCurrentUser ? 'current-user-row' : '';
        const teamDisplay = rider.team || '<span class="no-team">—</span>';
        
        // Podium class for GC top 3 (only show trophies on final GC)
        let rankClass = '';
        let trophyIcon = '';
        if (!isProvisional) {
            if (rider.gcPosition === 1) {
                rankClass = 'rank-gold';
                trophyIcon = ' ' + getIcon('gcGold', 'sm');
            } else if (rider.gcPosition === 2) {
                rankClass = 'rank-silver';
                trophyIcon = ' ' + getIcon('gcSilver', 'sm');
            } else if (rider.gcPosition === 3) {
                rankClass = 'rank-bronze';
                trophyIcon = ' ' + getIcon('gcBronze', 'sm');
            }
        }
        
        html += `
            <tr class="${rowClass}">
                <td class="rank-cell">
                    <span class="rank-number ${rankClass}">${rider.gcPosition}${trophyIcon}</span>
                </td>
                <td class="name-cell">
                    <span class="rider-name">${makeNameClickable(rider.name, rider.uid)}</span>
                    ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                </td>
                <td class="team-cell">${teamDisplay}</td>
                <td class="time-cell">${formatGCTime(rider.cumulativeTime)}</td>
                <td class="gap-cell">${formatGap(rider.gapToLeader)}</td>
                <td class="arr-cell">
                    <span class="arr-value">${rider.arr || '-'}</span>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
    `;
    
    // Add appropriate note based on final vs provisional
    if (isProvisional) {
        html += `
            <div class="results-note gc-provisional-note">
                <strong>Provisional GC:</strong> These are the current overall standings after ${stagesIncluded} stage${stagesIncluded > 1 ? 's' : ''}. 
                The classification will change as more stages are completed. Only riders who complete all remaining stages will be eligible for final GC honors.
            </div>
        `;
    } else {
        html += `
            <div class="results-note gc-final-note">
                <strong>Final General Classification:</strong> Riders ranked by cumulative time across all three tour stages. 
                Top 3 riders earn GC trophies and bonus points (1st: +50pts, 2nd: +35pts, 3rd: +25pts).
            </div>
        `;
    }
    
    html += `</div>`;
    
    return html;
}

/**
 * Load and display event results
 */
async function loadEventResults() {
    if (!currentUser) {
        // Not logged in - show pre-race sections (no userData available)
        await showPreRaceSections(null, null);
        return;
    }

    const eventResultsSection = document.getElementById('eventResultsSection');
    const eventResultsContent = document.getElementById('eventResultsContent');

    try {
        // Get current user's UID first
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        const userUid = userData?.uid;
        
        if (!userUid) {
            console.error('Could not get user UID');
            eventResultsSection.style.display = 'none';
            await showPreRaceSections(userData, userUid);
            return;
        }
        
        // Fetch THIS USER's results summary from Firestore
        const resultsRef = doc(db, 'results', `season1_event${eventNumber}_${userUid}`);
        const resultsDoc = await getDoc(resultsRef);

        const hasResults = resultsDoc.exists();
        window.cadenceEventContext = { eventNumber, hasResults };

        // Dispatch event for Cadence Credits to initialize
        window.dispatchEvent(new CustomEvent('cadenceEventContextReady', { detail: { eventNumber, hasResults } }));

        if (!hasResults) {
            // No results available yet - show pre-race sections with tour overview
            eventResultsSection.style.display = 'none';
            await showPreRaceSections(userData, userUid);
            return;
        }

        const resultsData = resultsDoc.data();
        const results = resultsData.results || [];

        if (results.length === 0) {
            eventResultsSection.style.display = 'none';
            await showPreRaceSections(userData, userUid);
            return;
        }

        // Show results section
        eventResultsSection.style.display = 'block';

        // Mark this result as viewed (for result notification system)
        if (window.resultNotificationManager) {
            const currentSeason = userData?.currentSeason || 1;
            const resultKey = window.resultNotificationManager.getResultKey(currentSeason, eventNumber);
            window.resultNotificationManager.markAsViewed(resultKey);
        }

        // Hide pre-race sections when results are available
        const sectionsToHide = [
            '.event-story',
            '.event-route',
            '.event-scoring',
            '.event-cta'
        ];
        
        sectionsToHide.forEach(selector => {
            const section = document.querySelector(selector);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Get user's result for this event to extract story (userData already fetched above)
        const userEventResults = userData?.[`event${eventNumber}Results`];

        // NEW: Check for earned awards and queue for notifications
        if (userEventResults && userEventResults.earnedAwards && userEventResults.earnedAwards.length > 0) {
            console.log(`[AWARD DEBUG] Found ${userEventResults.earnedAwards.length} earned award(s) for event ${eventNumber}`);
            console.log('[AWARD DEBUG] Awards:', userEventResults.earnedAwards);

            // Queue each award for notification
            if (window.notificationQueue) {
                userEventResults.earnedAwards.forEach(award => {
                    console.log(`[AWARD DEBUG] Queueing award: ${award.awardId} (category: ${award.category})`);
                    window.notificationQueue.add({
                        awardId: award.awardId,
                        eventNumber: eventNumber,
                        category: award.category,
                        intensity: award.intensity
                    });
                });

                // Display notifications immediately
                setTimeout(() => {
                    console.log('[AWARD DEBUG] Triggering notification display...');
                    if (window.achievementNotifications) {
                        window.achievementNotifications.display();
                    }
                }, 500); // Small delay to let page settle
            } else {
                console.warn('Notification system not initialized yet');
            }
        }

        let storyHTML = '';

        if (userEventResults) {
            // Check for new unified story format first
            if (userEventResults.story) {
                // New format: single unified story field with 2-3 paragraphs
                const paragraphs = userEventResults.story.split('\n\n').filter(p => p.trim());
                
                storyHTML = `
                    <div class="race-story">
                        <div class="story-section unified-story">
                            ${paragraphs.map(p => `<p>${p}</p>`).join('')}
                        </div>
                    </div>
                `;
            }
            // Fallback to old format for backward compatibility
            else if (userEventResults.storyRecap && userEventResults.storyContext) {
                const isEvent15Complete = eventNumber === 15 && userData.season1Complete === true;
                
                storyHTML = `
                    <div class="race-story">
                        ${userEventResults.storyIntro ? `
                        <div class="story-section story-intro">
                            ${userEventResults.storyIntro}
                        </div>
                        ` : ''}
                        <div class="story-section">
                            <h3>Race Recap</h3>
                            <p>${userEventResults.storyRecap}</p>
                        </div>
                        ${!isEvent15Complete ? `
                        <div class="story-section">
                            <h3>Season Context</h3>
                            <p>${userEventResults.storyContext}</p>
                        </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Build results table
        let tableHTML = '';

        // Add "Back to Local Tour" button for tour events
        if (eventNumber === 13 || eventNumber === 14 || eventNumber === 15) {
            addBackToTourButton();
        }

        // Add tour completion story ONLY for event 15 (after all 3 stages)
        if (eventNumber === 15 && userEventResults?.gcResults) {
            tableHTML += generateTourCompletionStory(userData, userEventResults.gcResults);
        }

        // Add regular race story
        tableHTML += storyHTML;

        // Add Cadence Coins earned summary
        const earnedCC = userEventResults?.earnedCadenceCredits || 0;
        const ccSource = userEventResults?.ccSource || 'awards';
        const isCompletionBonus = ccSource === 'completion';
        if (earnedCC > 0) {
            tableHTML += `
                <div class="race-rewards-summary">
                    <div class="rewards-header">
                        <span class="rewards-icon">${isCompletionBonus ? '🏁' : '⚡'}</span>
                        <span class="rewards-title">Race Rewards</span>
                    </div>
                    <div class="rewards-content">
                        <div class="rewards-item cc-earned">
                            <span class="rewards-label">${isCompletionBonus ? 'Completion Bonus:' : 'Cadence Credits Earned:'}</span>
                            <span class="rewards-value">+${earnedCC} CC</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add Strava Share button
        if (userEventResults) {
            const eventData = window.getEvent ? window.getEvent(eventNumber) : null;
            const eventName = eventData?.name || `Event ${eventNumber}`;
            const eventCategory = eventData?.category || 'Local Amateur';

            // Map award IDs to icon registry keys (they use different naming)
            const awardIdToIconKey = {
                // Medals
                'goldMedal': 'goldMedal',
                'silverMedal': 'silverMedal',
                'bronzeMedal': 'bronzeMedal',
                // Performance awards
                'punchingMedal': 'punchingAbove',
                'giantKillerMedal': 'giantKiller',
                'bullseyeMedal': 'bullseye',
                'hotStreakMedal': 'hotStreak',
                // Margin awards
                'domination': 'domination',
                'closeCall': 'closeCall',
                'photoFinish': 'photoFinish',
                // Special awards
                'darkHorse': 'darkHorse',
                'zeroToHero': 'zeroToHero',
                'lanternRouge': 'lanternRouge',
                'blastOff': 'blastOff',
                // Career awards
                'backToBack': 'repeat',
                'weekendWarrior': 'calendar',
                'trophyCollector': 'trophy',
                'technicalIssues': 'wrench',
                'overrated': 'chartDown',
                // GC awards
                'gcGoldMedal': 'gcGold',
                'gcSilverMedal': 'gcSilver',
                'gcBronzeMedal': 'gcBronze'
            };

            // Get earnedAwards with their details from AWARD_DEFINITIONS
            // Debug: Check if TPVIcons is available
            console.log('[SHARE IMG] TPVIcons available:', !!window.TPVIcons);
            console.log('[SHARE IMG] ICON_REGISTRY available:', !!window.TPVIcons?.ICON_REGISTRY);
            if (window.TPVIcons?.ICON_REGISTRY) {
                console.log('[SHARE IMG] bronzeMedal in registry:', !!window.TPVIcons.ICON_REGISTRY['bronzeMedal']);
            }

            const earnedAwards = (userEventResults.earnedAwards || []).map(award => {
                const awardDef = window.AWARD_DEFINITIONS?.[award.awardId] || {};
                const iconKey = awardIdToIconKey[award.awardId] || award.awardId;
                // Icons are exported via window.TPVIcons.ICON_REGISTRY
                const iconDef = window.TPVIcons?.ICON_REGISTRY?.[iconKey] || {};

                console.log(`[SHARE IMG] Award ${award.awardId}: iconKey=${iconKey}, iconDef=`, iconDef);

                // Resolve icon path to absolute URL for canvas fetch
                let absoluteIconPath = null;
                if (iconDef.path) {
                    const baseUrl = window.location.href.replace(/[^/]*$/, '');
                    absoluteIconPath = new URL(iconDef.path, baseUrl).href;
                }

                console.log(`[SHARE IMG] Award ${award.awardId} -> resolved path: ${absoluteIconPath}`);

                return {
                    id: award.awardId,
                    title: awardDef.title || award.awardId,
                    iconPath: absoluteIconPath,
                    fallback: iconDef.fallback || awardDef.icon || '🏆'
                };
            });

            // Use discordStory (condensed) if available, then storyRecap, otherwise generate fallback
            let shareStory = userEventResults.discordStory || userEventResults.storyRecap || '';
            if (!shareStory && userEventResults.position) {
                // Generate fallback summary similar to results-feed
                const pos = userEventResults.position;
                const pred = userEventResults.predictedPosition;
                const posText = pos === 'DNF' ? 'DNF' : `${pos}${getOrdinalSuffix(pos)}`;

                if (pos === 'DNF') {
                    shareStory = `A tough day at ${eventName}. Racing can be unforgiving - zero points but lessons to take into the next race.`;
                } else if (pos === 1) {
                    shareStory = `Victory at ${eventName}! An incredible performance to celebrate. Standing on top of the podium is what all the training was for.`;
                } else if (pos <= 3) {
                    shareStory = `${posText} at ${eventName}. A solid podium finish that proves the hard work is paying off!`;
                } else if (pos <= 10) {
                    shareStory = `${posText} at ${eventName}. A strong top-10 result keeping momentum going in the season.`;
                } else if (pred && pred - pos >= 5) {
                    shareStory = `${posText} at ${eventName} - well ahead of the predicted ${pred}${getOrdinalSuffix(pred)}. A great performance when it counted.`;
                } else {
                    shareStory = `${posText} at ${eventName}. Points banked and experience gained - every race is a step forward.`;
                }
            }

            // Find user's result in results array for power data
            const userResultFromArray = results.find(r => r.uid === userUid);
            const powerData = userResultFromArray ? {
                avgPower: userResultFromArray.avgPower || null,
                nrmPower: userResultFromArray.nrmPower || null,
                maxPower: userResultFromArray.maxPower || null
            } : null;

            // Get race number (sequential stage number for this rider)
            // stageNumber is the sequential race number the rider completed
            const raceNumber = userEventResults.stageNumber || null;

            // Store share data globally to avoid JSON escaping issues in onclick
            window._stravaShareData = {
                userResult: {
                    position: userEventResults.position,
                    predictedPosition: userEventResults.predictedPosition,
                    points: userEventResults.points || 0,
                    bonusPoints: userEventResults.bonusPoints || 0,
                    story: shareStory,
                    earnedAwards: earnedAwards,
                    powerData: powerData
                },
                eventInfo: {
                    eventNumber: eventNumber,
                    eventName: eventName,
                    category: eventCategory,
                    raceNumber: raceNumber
                }
            };

            tableHTML += `
                <div class="share-section">
                    <p class="share-section-title">Share Your Result</p>
                    <button class="btn-strava-share" id="stravaShareBtn">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116zM7.451 13.828h3.04l4.897-9.656l-2.025-4.172L7.451 13.828z"/>
                        </svg>
                        Download Share Image
                    </button>
                    <p class="share-hint">Download to share on Strava, Instagram, or social media</p>
                </div>
            `;
        }

        // Check if this is a time-based event (show distance instead of time)
        const isTimeBasedEvent = getTimeBasedEvents().includes(eventNumber);
        console.log(`Event ${eventNumber}: isTimeBasedEvent=${isTimeBasedEvent}, TIME_BASED_EVENTS=${JSON.stringify(getTimeBasedEvents())}`);

        // Check if results have power data (from JSON processing)
        const hasPowerData = results.some(r => r.avgPower || r.maxPower || r.nrmPower);

        tableHTML += `
            <div class="results-table-container">
                <div class="results-table-wrapper">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th class="rank-header">Pos</th>
                                <th class="name-header">Rider</th>
                                <th class="team-header">Team</th>
                                <th class="time-header">${isTimeBasedEvent ? 'Distance' : 'Time'}</th>
                                ${hasPowerData ? '<th class="power-header">Avg W</th><th class="power-header">NP</th><th class="power-header">Max W</th>' : ''}
                                <th class="arr-header">ARR</th>
                                <th class="points-header">Points</th>
                                ${results[0].eventPoints != null ? '<th class="event-points-header">PR Pts</th>' : ''}
                                <th class="bonus-header">Bonuses</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        results.forEach((result) => {
            const isCurrentUser = result.uid === userUid;
            const isDNF = result.position === 'DNF';
            const rowClass = isCurrentUser ? 'current-user-row' : (isDNF ? 'dnf-row' : '');
            const teamDisplay = result.team || '<span class="no-team">—</span>';

            // Podium class for top 3 (not for DNF)
            let rankClass = '';
            if (!isDNF) {
                if (result.position === 1) rankClass = 'rank-gold';
                else if (result.position === 2) rankClass = 'rank-silver';
                else if (result.position === 3) rankClass = 'rank-bronze';
            } else {
                rankClass = 'rank-dnf';
            }

            // Build bonus cell content (empty for DNF)
            let bonusHTML = '';
            if (!isDNF) {
                const unlockBonus = result.unlockBonusPoints || 0;
                const predictionBonus = (result.bonusPoints || 0) - unlockBonus;

                if (predictionBonus > 0) {
                    bonusHTML += `<span class="bonus-points" title="Bonus for beating prediction">+${predictionBonus}</span>`;
                }
                if (unlockBonus > 0) {
                    bonusHTML += `<span class="bonus-points unlock-bonus" title="Bonus from triggered unlocks">+${unlockBonus}</span>`;
                }
                if (result.earnedPunchingMedal) {
                    bonusHTML += `<span class="medal-icon punching" title="Beat prediction by 10+ places">${getIcon('punchingAbove', 'sm')}</span>`;
                }
                if (result.earnedGiantKillerMedal) {
                    bonusHTML += `<span class="medal-icon giant-killer" title="Beat highest-rated rider">${getIcon('giantKiller', 'sm')}</span>`;
                }
                if (result.earnedBullseyeMedal) {
                    bonusHTML += `<span class="medal-icon bullseye" title="Finished exactly as predicted">${getIcon('bullseye', 'sm')}</span>`;
                }
                if (result.earnedDomination) {
                    bonusHTML += `<span class="medal-icon domination" title="Won by 60+ seconds">${getIcon('domination', 'sm')}</span>`;
                }
                if (result.earnedCloseCall) {
                    bonusHTML += `<span class="medal-icon close-call" title="Won by less than 0.5s">${getIcon('closeCall', 'sm')}</span>`;
                }
                if (result.earnedPhotoFinish) {
                    bonusHTML += `<span class="medal-icon photo-finish" title="Within 0.2s of winner">${getIcon('photoFinish', 'sm')}</span>`;
                }
                if (result.earnedDarkHorse) {
                    bonusHTML += `<span class="medal-icon dark-horse" title="Won when predicted 15th+">${getIcon('darkHorse', 'sm')}</span>`;
                }
                if (result.earnedZeroToHero) {
                    bonusHTML += `<span class="medal-icon zero-to-hero" title="Bottom 20% to top 20%">${getIcon('zeroToHero', 'sm')}</span>`;
                }
                // Power awards
                if (result.earnedPowerSurge) {
                    bonusHTML += `<span class="medal-icon power-surge" title="Max power 30%+ above avg, top 10">${getIcon('powerSurge', 'sm')}</span>`;
                }
                if (result.earnedSteadyEddie) {
                    bonusHTML += `<span class="medal-icon steady-eddie" title="NP within 1% of avg power">${getIcon('steadyEddie', 'sm')}</span>`;
                }
                if (result.earnedBlastOff) {
                    bonusHTML += `<span class="medal-icon blast-off" title="Broke 1300W max power">${getIcon('blastOff', 'sm')}</span>`;
                }
            }
            if (!bonusHTML) {
                bonusHTML = '<span class="no-bonus">—</span>';
            }

            // Display values for DNF vs finished riders
            const positionDisplay = isDNF ? 'DNF' : result.position;
            // For time-based events, show distance in km; otherwise show time
            if (isTimeBasedEvent) {
                console.log(`Result for ${result.name}: distance=${result.distance}, time=${result.time}`);
            }
            const timeOrDistanceDisplay = isDNF ? '—' : (isTimeBasedEvent
                ? `${(result.distance / 1000).toFixed(2)} km`
                : formatTime(result.time));
            const pointsDisplay = isDNF ? '0' : result.points;

            // Power data cells (only if event has power data)
            let powerCellsHTML = '';
            if (hasPowerData) {
                const avgPower = isDNF ? '—' : (result.avgPower || '—');
                const nrmPower = isDNF ? '—' : (result.nrmPower || '—');
                const maxPower = isDNF ? '—' : (result.maxPower || '—');
                powerCellsHTML = `
                    <td class="power-cell">${avgPower}</td>
                    <td class="power-cell">${nrmPower}</td>
                    <td class="power-cell">${maxPower}</td>
                `;
            }

            tableHTML += `
                <tr class="${rowClass}">
                    <td class="rank-cell">
                        <span class="rank-number ${rankClass}">${positionDisplay}</span>
                    </td>
                    <td class="name-cell">
                        <span class="rider-name">${makeNameClickable(result.name, result.uid)}</span>
                        ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                    </td>
                    <td class="team-cell">${teamDisplay}</td>
                    <td class="time-cell">${timeOrDistanceDisplay}</td>
                    ${powerCellsHTML}
                    <td class="arr-cell">
                        <span class="arr-value">${result.arr}</span>
                        <span class="arr-band">${result.arrBand || getARRBand(result.arr)}</span>
                    </td>
                    <td class="points-cell">
                        <span class="points-value">${pointsDisplay}</span>
                    </td>
                    ${result.eventPoints != null ? `<td class="event-points-cell">${isDNF ? '—' : result.eventPoints}</td>` : ''}
                    <td class="bonus-cell">${bonusHTML}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
        `;

        // Add explanation for points races if applicable
        if (results[0].eventPoints != null) {
            tableHTML += `
                <div class="results-note">
                    <strong>PR Pts:</strong> Points Race points (used to determine finishing order in points races)
                </div>
            `;
        }
        
        // Add GC (General Classification) table if this is a tour event (13, 14, or 15)
        if ((eventNumber === 13 || eventNumber === 14 || eventNumber === 15) && userEventResults?.gcResults) {
            tableHTML += await displayGCResults(userEventResults.gcResults, userUid, eventNumber);
        }

        eventResultsContent.innerHTML = tableHTML;

        // Add Strava share button event listener
        const stravaShareBtn = document.getElementById('stravaShareBtn');
        if (stravaShareBtn && window._stravaShareData) {
            stravaShareBtn.addEventListener('click', function() {
                window.downloadStravaShareImage(
                    window._stravaShareData.userResult,
                    window._stravaShareData.eventInfo
                );
            });
        }

        // Add replay awards button before interview section if there are earned awards
        if (userEventResults?.earnedAwards && userEventResults.earnedAwards.length > 0) {
            // Remove any existing replay button first
            const existingReplaySection = document.getElementById('replayAwardsSection');
            if (existingReplaySection) {
                existingReplaySection.remove();
            }

            // Create replay button section
            const replaySection = document.createElement('section');
            replaySection.id = 'replayAwardsSection';
            replaySection.className = 'replay-awards-section';
            replaySection.innerHTML = `
                <div class="container">
                    <button class="replay-awards-btn" id="replayAwardsBtn" data-event="${eventNumber}">
                        <span class="replay-icon">↻</span>
                        <span class="replay-text">Replay Award Animations</span>
                    </button>
                </div>
            `;

            // Insert before the interview section
            const interviewSection = document.getElementById('postRaceInterviewSection');
            if (interviewSection) {
                interviewSection.parentNode.insertBefore(replaySection, interviewSection);
            }

            // Add replay button event listener
            const replayBtn = document.getElementById('replayAwardsBtn');
            if (replayBtn) {
                replayBtn.addEventListener('click', function() {
                    const eventNum = parseInt(this.dataset.event);
                    console.log(`[AWARD REPLAY] Replay button clicked for event ${eventNum}`);

                    if (window.notificationQueue && window.achievementNotifications) {
                        // Reset shown status for this event's awards
                        const resetCount = window.notificationQueue.replayEventAwards(eventNum);

                        if (resetCount > 0) {
                            console.log(`[AWARD REPLAY] Replaying ${resetCount} award(s)`);
                            // Display the awards
                            window.achievementNotifications.display();
                        } else {
                            console.log('[AWARD REPLAY] No awards found to replay');
                        }
                    } else {
                        console.error('[AWARD REPLAY] Notification system not initialized');
                    }
                });
            }
        }

        // Display post-race interview if user has results (including DNF)
        if (userEventResults && (userEventResults.position || userEventResults.position === 'DNF')) {
            const userResult = {
                position: userEventResults.position,
                predicted: userEventResults.predictedPosition,
                time: userEventResults.time,
                timeSeconds: userEventResults.time,
                eventType: userEventResults.eventType,
                eventCategory: userEventResults.eventCategory
            };

            // Display interview after a short delay to let results settle
            setTimeout(() => {
                displayPostRaceInterview(db, userUid, eventNumber, userResult, results, userData);
            }, 1000);
        }

        // Clear any remaining loading states after results are displayed
        document.querySelectorAll('.section-loading').forEach(section => {
            section.classList.remove('section-loading');
            section.classList.add('section-loaded');
        });

    } catch (error) {
        console.error('Error loading event results:', error);
        eventResultsSection.style.display = 'none';
        // Try to get userData if available for tour overview
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const userData = userDoc.data();
            await showPreRaceSections(userData, userData?.uid);
        } catch {
            await showPreRaceSections(null, null);
        }
    }
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    eventNumber = getEventNumber();

    // Listen for auth changes
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        // Update schedule button based on login state
        const scheduleButton = document.getElementById('scheduleButton');
        if (scheduleButton) {
            if (user) {
                scheduleButton.textContent = 'Schedule Event';

                // Get current event's schedule URL
                const event = getEvent(eventNumber);
                const scheduleUrl = event?.scheduleUrl;

                scheduleButton.onclick = (e) => {
                    e.preventDefault();
                    if (scheduleUrl) {
                        window.open(scheduleUrl, '_blank');
                    } else {
                        alert('Coming Soon');
                    }
                };
            } else {
                scheduleButton.textContent = 'Login to Schedule';
                scheduleButton.onclick = (e) => {
                    e.preventDefault();
                    // Trigger the login modal
                    const loginBtn = document.getElementById('loginBtn');
                    if (loginBtn) {
                        loginBtn.click();
                    }
                };
            }
        }
        
        if (user) {
            await loadEventResults();
        } else {
            // Not logged in - show pre-race sections (no userData available)
            await showPreRaceSections(null, null);
            addTourTimingWarning(eventNumber);
        }
    });
});

// Make loadEventResults available globally
window.loadEventResults = loadEventResults;

// ===== Strava Share Image Generation =====

/**
 * Get position color based on finishing position
 */
function getPositionColor(position) {
    if (position === 'DNF') return '#6B7280';
    if (position === 1) return '#FFD700';  // Gold
    if (position === 2) return '#C0C0C0';  // Silver
    if (position === 3) return '#CD7F32';  // Bronze
    if (position <= 10) return '#45caff';  // Blue
    return '#6B7280';  // Gray
}

/**
 * Draw text that fits within a max width, scaling down if needed
 */
function drawFittedText(ctx, text, x, y, maxWidth, initialFontSize, minFontSize, fontWeight, fontFamily) {
    let fontSize = initialFontSize;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    while (ctx.measureText(text).width > maxWidth && fontSize > minFontSize) {
        fontSize -= 2;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    }

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

/**
 * Wrap text to fit within a max width, returning array of lines
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Condense story to approximately N words
 */
function condenseStory(story, maxWords = 40) {
    if (!story) return '';

    // Remove paragraph breaks and extra whitespace
    const cleanStory = story.replace(/\n\n/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanStory.split(' ');

    if (words.length <= maxWords) return cleanStory;

    // Find a good breaking point (end of sentence if possible)
    let truncated = words.slice(0, maxWords).join(' ');

    // Try to end at a sentence
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclaim = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastSentenceEnd = Math.max(lastPeriod, lastExclaim, lastQuestion);

    if (lastSentenceEnd > truncated.length * 0.5) {
        return truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
}

/**
 * Load image with promise - handles both regular images and SVGs
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Don't set crossOrigin for local files to avoid CORS issues
        if (src.startsWith('http')) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.warn(`Failed to load image: ${src}`, e);
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
}

/**
 * Load SVG as image by fetching and converting to data URL
 * This works better for canvas rendering than direct SVG loading
 */
async function loadSvgAsImage(svgPath) {
    try {
        const response = await fetch(svgPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const svgText = await response.text();
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };
            img.src = url;
        });
    } catch (e) {
        console.warn(`Failed to load SVG: ${svgPath}`, e);
        throw e;
    }
}

/**
 * Generate Strava share image on canvas - TILE-BASED DESIGN
 * Cyberpunk aesthetic with neon accents on dark background
 */
async function generateStravaShareImage(userResult, eventInfo) {
    const canvas = document.getElementById('stravaShareCanvas');
    if (!canvas) {
        console.error('Strava share canvas not found');
        return false;
    }

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1350;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // ========== DESIGN CONSTANTS ==========
    const PINK = '#ff1b6b';
    const PURPLE = '#c71ae5';
    const CYAN = '#45caff';
    const GOLD = '#FFD700';
    const GREEN = '#22c55e';
    const ORANGE = '#ffaa00';
    const DARK_BG = '#080c14';
    const TILE_BG = 'rgba(255, 255, 255, 0.03)';
    const MARGIN = 40;
    const TILE_GAP = 20;
    const TILE_RADIUS = 16;

    // Helper: Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Helper: Draw a tile with neon border
    const drawTile = (x, y, w, h, accentColor, filled = true) => {
        if (filled) {
            ctx.fillStyle = TILE_BG;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, TILE_RADIUS);
            ctx.fill();
        }
        // Neon glow border
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = hexToRgba(accentColor, 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, TILE_RADIUS);
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    // ========== BACKGROUND ==========
    ctx.fillStyle = DARK_BG;
    ctx.fillRect(0, 0, width, height);

    // Try to load event image as background
    const eventNum = eventInfo.eventNumber;
    const isSpecial = eventNum >= 100;
    const imgFolder = isSpecial ? 'special' : 'season1';
    const imgPath = `event-images/${imgFolder}/event_${eventNum}.jpg`;

    try {
        const eventImg = await loadImage(imgPath);
        const imgHeight = 480;
        const imgAspect = eventImg.width / eventImg.height;
        const drawWidth = width;
        const drawHeight = drawWidth / imgAspect;
        const yOffset = (imgHeight - drawHeight) / 2;

        ctx.drawImage(eventImg, 0, yOffset, drawWidth, drawHeight);

        // Fade overlay
        const fadeGradient = ctx.createLinearGradient(0, 0, 0, imgHeight + 80);
        fadeGradient.addColorStop(0, 'rgba(8, 12, 20, 0.2)');
        fadeGradient.addColorStop(0.4, 'rgba(8, 12, 20, 0.5)');
        fadeGradient.addColorStop(0.7, 'rgba(8, 12, 20, 0.85)');
        fadeGradient.addColorStop(1, DARK_BG);
        ctx.fillStyle = fadeGradient;
        ctx.fillRect(0, 0, width, imgHeight + 80);
    } catch (e) {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, 450);
        bgGradient.addColorStop(0, '#1a1f2e');
        bgGradient.addColorStop(1, DARK_BG);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, 450);
    }

    // Top accent bar
    const topGradient = ctx.createLinearGradient(0, 0, width, 0);
    topGradient.addColorStop(0, PINK);
    topGradient.addColorStop(0.5, PURPLE);
    topGradient.addColorStop(1, CYAN);
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, 5);

    // ========== HEADER SECTION ==========
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;

    // TPV Logo - LARGER
    ctx.fillStyle = PINK;
    ctx.font = 'bold 68px Orbitron, sans-serif';
    ctx.fillText('TPV', width / 2, 75);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 22px "Exo 2", sans-serif';
    ctx.fillText('C A R E E R   M O D E', width / 2, 108);
    ctx.shadowBlur = 0;

    // Race badge
    const raceNum = eventInfo.raceNumber || eventNum;
    const badgeText = `RACE ${raceNum}  •  ${(eventInfo.category || 'Local Amateur').toUpperCase()}`;
    ctx.font = '700 20px "Exo 2", sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 50;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
    ctx.beginPath();
    ctx.roundRect((width - badgeWidth) / 2, 125, badgeWidth, 38, 19);
    ctx.fill();
    ctx.strokeStyle = PINK;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PINK;
    ctx.fillText(badgeText, width / 2, 151);

    // Event name
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffffff';
    drawFittedText(ctx, eventInfo.eventName.toUpperCase(), width / 2, 220, 950, 52, 36, 'bold', 'Orbitron, sans-serif');
    ctx.shadowBlur = 0;

    // ========== POSITION (Hero Element) ==========
    const position = userResult.position;
    const positionText = position === 'DNF' ? 'DNF' : `${position}${getOrdinalSuffix(position)}`;
    const posColor = getPositionColor(position);

    // Position glow
    const posGlow = ctx.createRadialGradient(width/2, 340, 0, width/2, 340, 200);
    posGlow.addColorStop(0, hexToRgba(posColor, 0.4));
    posGlow.addColorStop(0.5, hexToRgba(posColor, 0.15));
    posGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = posGlow;
    ctx.fillRect(0, 180, width, 320);

    // Position number
    ctx.shadowColor = posColor;
    ctx.shadowBlur = 60;
    ctx.fillStyle = posColor;
    ctx.font = 'bold 160px Orbitron, sans-serif';
    ctx.fillText(positionText, width / 2, 380);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '700 26px "Exo 2", sans-serif';
    ctx.fillText('FINISHING POSITION', width / 2, 430);

    // ========== TILE GRID SECTION ==========
    let currentY = 470;
    const tileWidth = (width - MARGIN * 2 - TILE_GAP) / 2;

    // Determine what tiles we have
    const hasPrediction = userResult.predictedPosition && position !== 'DNF';
    const hasPower = userResult.powerData && (userResult.powerData.avgPower || userResult.powerData.nrmPower || userResult.powerData.maxPower);
    const hasAwards = userResult.earnedAwards && userResult.earnedAwards.length > 0;

    // ===== ROW 1: Points + Prediction (side by side) =====
    if (hasPrediction) {
        const tileHeight = 130;

        // POINTS TILE (left)
        drawTile(MARGIN, currentY, tileWidth, tileHeight, CYAN);
        ctx.fillStyle = 'rgba(69, 202, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(MARGIN, currentY, tileWidth, tileHeight, TILE_RADIUS);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 20px "Exo 2", sans-serif';
        ctx.fillText('POINTS', MARGIN + tileWidth / 2, currentY + 32);

        ctx.fillStyle = CYAN;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 20;
        ctx.font = 'bold 76px Orbitron, sans-serif';
        ctx.fillText(userResult.points || '0', MARGIN + tileWidth / 2, currentY + 95);
        ctx.shadowBlur = 0;

        if (userResult.bonusPoints && userResult.bonusPoints > 0) {
            ctx.fillStyle = GREEN;
            ctx.font = 'bold 22px "Exo 2", sans-serif';
            ctx.fillText(`+${userResult.bonusPoints} BONUS`, MARGIN + tileWidth / 2, currentY + 122);
        }

        // PREDICTION TILE (right)
        const predicted = userResult.predictedPosition;
        const diff = predicted - position;
        const predColor = diff > 0 ? GREEN : diff < 0 ? '#ef4444' : GOLD;

        drawTile(MARGIN + tileWidth + TILE_GAP, currentY, tileWidth, tileHeight, predColor);
        ctx.fillStyle = hexToRgba(predColor, 0.1);
        ctx.beginPath();
        ctx.roundRect(MARGIN + tileWidth + TILE_GAP, currentY, tileWidth, tileHeight, TILE_RADIUS);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 20px "Exo 2", sans-serif';
        ctx.fillText('PREDICTION', MARGIN + tileWidth + TILE_GAP + tileWidth / 2, currentY + 32);

        const predIcon = diff > 0 ? '▲' : diff < 0 ? '▼' : '●';
        ctx.fillStyle = predColor;
        ctx.font = 'bold 34px "Exo 2", sans-serif';
        ctx.fillText(`${predicted}${getOrdinalSuffix(predicted)} → ${positionText}`, MARGIN + tileWidth + TILE_GAP + tileWidth / 2, currentY + 72);

        ctx.font = 'bold 44px Orbitron, sans-serif';
        ctx.fillText(`${predIcon} ${diff >= 0 ? '+' : ''}${diff}`, MARGIN + tileWidth + TILE_GAP + tileWidth / 2, currentY + 116);

        currentY += tileHeight + TILE_GAP;
    } else {
        // Just points - full width
        const tileHeight = 120;
        drawTile(MARGIN, currentY, width - MARGIN * 2, tileHeight, CYAN);
        ctx.fillStyle = 'rgba(69, 202, 255, 0.12)';
        ctx.beginPath();
        ctx.roundRect(MARGIN, currentY, width - MARGIN * 2, tileHeight, TILE_RADIUS);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 22px "Exo 2", sans-serif';
        ctx.fillText('POINTS EARNED', width / 2, currentY + 34);

        ctx.fillStyle = CYAN;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 25;
        ctx.font = 'bold 82px Orbitron, sans-serif';
        ctx.fillText(userResult.points || '0', width / 2, currentY + 95);
        ctx.shadowBlur = 0;

        if (userResult.bonusPoints && userResult.bonusPoints > 0) {
            ctx.fillStyle = GREEN;
            ctx.font = 'bold 26px "Exo 2", sans-serif';
            ctx.fillText(`+${userResult.bonusPoints} BONUS`, width / 2 + 130, currentY + 80);
        }

        currentY += tileHeight + TILE_GAP;
    }

    // ===== ROW 2: Power Data (clean, minimal) =====
    if (hasPower) {
        const power = userResult.powerData;
        const miniTileWidth = (width - MARGIN * 2) / 3;
        const tileHeight = 100;

        // AVG POWER
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 18px "Exo 2", sans-serif';
        ctx.fillText('AVG POWER', MARGIN + miniTileWidth / 2, currentY + 25);

        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 56px Orbitron, sans-serif';
        ctx.fillText(power.avgPower ? `${power.avgPower}W` : '—', MARGIN + miniTileWidth / 2, currentY + 75);

        // NORMALIZED POWER
        const npX = MARGIN + miniTileWidth;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 18px "Exo 2", sans-serif';
        ctx.fillText('NORMALIZED', npX + miniTileWidth / 2, currentY + 25);

        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 56px Orbitron, sans-serif';
        ctx.fillText(power.nrmPower ? `${power.nrmPower}W` : '—', npX + miniTileWidth / 2, currentY + 75);

        // MAX POWER
        const maxX = MARGIN + miniTileWidth * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '600 18px "Exo 2", sans-serif';
        ctx.fillText('MAX POWER', maxX + miniTileWidth / 2, currentY + 25);

        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 15;
        ctx.font = 'bold 56px Orbitron, sans-serif';
        ctx.fillText(power.maxPower ? `${power.maxPower}W` : '—', maxX + miniTileWidth / 2, currentY + 75);
        ctx.shadowBlur = 0;

        currentY += tileHeight + TILE_GAP;
    }

    // ===== ROW 3: Awards (clean, minimal) =====
    if (hasAwards) {
        const awards = userResult.earnedAwards;
        const numAwards = Math.min(awards.length, 4);
        const tileHeight = 140;

        ctx.fillStyle = PURPLE;
        ctx.font = '700 22px "Exo 2", sans-serif';
        ctx.fillText(`${awards.length} AWARD${awards.length > 1 ? 'S' : ''} EARNED`, width / 2, currentY + 25);

        // Draw award icons
        const awardSize = 70;
        const awardSpacing = Math.min(200, (width - MARGIN * 2 - 80) / numAwards);
        const startX = width / 2 - ((numAwards - 1) * awardSpacing) / 2;
        const awardY = currentY + 75;

        for (let i = 0; i < numAwards; i++) {
            const award = awards[i];
            const x = startX + i * awardSpacing;

            let iconLoaded = false;

            if (award.iconPath) {
                console.log(`[SHARE IMG] Attempting to load icon: ${award.iconPath}`);
                try {
                    let iconImg;
                    if (award.iconPath.endsWith('.svg')) {
                        iconImg = await loadSvgAsImage(award.iconPath);
                    } else {
                        iconImg = await loadImage(award.iconPath);
                    }
                    console.log(`[SHARE IMG] Successfully loaded icon for ${award.title}`);
                    ctx.drawImage(iconImg, x - awardSize/2, awardY - awardSize/2, awardSize, awardSize);
                    iconLoaded = true;
                } catch (e) {
                    console.error(`[SHARE IMG] FAILED to load award icon: ${award.iconPath}`, e);
                }
            } else {
                console.warn(`[SHARE IMG] No iconPath for award: ${award.id}`);
            }

            if (!iconLoaded && award.fallback) {
                // Just the emoji, no background circle
                ctx.font = `${awardSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(award.fallback, x, awardY + 18);
            }

            // Award title
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '600 18px "Exo 2", sans-serif';
            ctx.fillText(award.title, x, awardY + awardSize/2 + 26);
        }

        currentY += tileHeight + TILE_GAP;
    }

    // ========== NARRATIVE SECTION (KEY SELLING POINT) ==========
    if (userResult.story && userResult.story.length > 20) {
        const remainingSpace = height - currentY - 100; // Leave room for footer
        const containerHeight = Math.min(220, Math.max(160, remainingSpace - 20));

        // Story container with gradient fill
        const storyGradient = ctx.createLinearGradient(MARGIN, currentY, MARGIN, currentY + containerHeight);
        storyGradient.addColorStop(0, hexToRgba(PINK, 0.1));
        storyGradient.addColorStop(0.5, hexToRgba(PURPLE, 0.06));
        storyGradient.addColorStop(1, hexToRgba(CYAN, 0.04));

        ctx.fillStyle = storyGradient;
        ctx.beginPath();
        ctx.roundRect(MARGIN, currentY, width - MARGIN * 2, containerHeight, TILE_RADIUS);
        ctx.fill();

        // Neon border
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = hexToRgba(PINK, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Left accent bar
        const accentBarGradient = ctx.createLinearGradient(0, currentY, 0, currentY + containerHeight);
        accentBarGradient.addColorStop(0, PINK);
        accentBarGradient.addColorStop(0.5, PURPLE);
        accentBarGradient.addColorStop(1, CYAN);
        ctx.fillStyle = accentBarGradient;
        ctx.beginPath();
        ctx.roundRect(MARGIN, currentY, 6, containerHeight, [TILE_RADIUS, 0, 0, TILE_RADIUS]);
        ctx.fill();

        // Story text - LARGE AND PROMINENT
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'italic 400 32px "Exo 2", sans-serif';

        const storyText = userResult.story;
        const lines = wrapText(ctx, `"${storyText}"`, width - MARGIN * 2 - 60);
        const lineHeight = 48;
        const maxLines = Math.floor((containerHeight - 40) / lineHeight);
        const displayLines = lines.slice(0, maxLines);

        const textBlockHeight = displayLines.length * lineHeight;
        const textStartY = currentY + (containerHeight - textBlockHeight) / 2 + lineHeight * 0.65;

        displayLines.forEach((line, index) => {
            ctx.fillText(line, width / 2, textStartY + index * lineHeight);
        });

        currentY += containerHeight + 15;
    }

    // ========== FOOTER ==========
    // Bottom gradient bar
    const bottomGradient = ctx.createLinearGradient(0, 0, width, 0);
    bottomGradient.addColorStop(0, PINK);
    bottomGradient.addColorStop(0.5, PURPLE);
    bottomGradient.addColorStop(1, CYAN);
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height - 6, width, 6);

    // Website URL
    ctx.shadowColor = PINK;
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Exo 2", sans-serif';
    ctx.fillText('TPVCareerMode.com', width / 2, height - 38);
    ctx.shadowBlur = 0;

    return true;
}

/**
 * Download the generated Strava share image
 */
function downloadStravaShareImage(userResult, eventInfo) {
    generateStravaShareImage(userResult, eventInfo).then((success) => {
        if (!success) {
            alert('Could not generate share image. Please try again.');
            return;
        }

        const canvas = document.getElementById('stravaShareCanvas');
        if (!canvas) return;

        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const eventName = eventInfo.eventName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            link.download = `tpv-result-${eventName}-${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Failed to download share image:', e);
            alert('Could not download image. Please try taking a screenshot instead.');
        }
    });
}

// Make share functions available globally
window.downloadStravaShareImage = downloadStravaShareImage;
