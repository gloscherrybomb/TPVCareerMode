// season-completion.js - Handle end-of-season detection and completion logic

/**
 * Format number as ordinal (1st, 2nd, 3rd, 21st, 22nd, 23rd, etc.)
 * @param {number} num - The number to format
 * @returns {string} The number with ordinal suffix (e.g., "1st", "21st")
 */
function formatOrdinal(num) {
  if (!num) return '';
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}

/**
 * Check if Season 1 is complete for a user
 * Season 1 is complete when:
 * - Event 15 (Local Tour Stage 3) is completed with results
 * - OR Event 14 or 15 are marked as DNS (Did Not Start)
 * 
 * @param {Object} userData - User's Firebase document data
 * @returns {Object} { isComplete: boolean, reason: string, localTourStatus: string }
 */
function checkSeasonComplete(userData) {
    // Check if event 15 has results (completed normally)
    const event15Results = userData.event15Results;
    if (event15Results && event15Results.position && event15Results.position !== 'DNF') {
        return {
            isComplete: true,
            reason: 'completed',
            localTourStatus: 'completed'
        };
    }
    
    // Check if event 14 or 15 are marked as DNS
    const event14DNS = userData.event14DNS === true;
    const event15DNS = userData.event15DNS === true;
    
    if (event14DNS || event15DNS) {
        return {
            isComplete: true,
            reason: 'dns',
            localTourStatus: 'dnf'
        };
    }
    
    // Season not yet complete
    return {
        isComplete: false,
        reason: 'incomplete',
        localTourStatus: 'in_progress'
    };
}

/**
 * Generate end-of-season story text for Event 15 results page
 * This should be a wrap-up that makes it clear the season is complete
 * 
 * @param {Object} data - Story generation data
 * @returns {string} Story paragraph
 */
function generateSeasonCompleteStory(data) {
    const {
        position,
        seasonRank,
        totalPoints,
        totalWins,
        totalPodiums,
        localTourGCPosition,
        earnedSeasonPodium // If they finished top 3 in season standings
    } = data;
    
    let story = '';
    
    // Opening based on their Event 15 performance
    if (position === 1) {
        story += `The final day of the Local Tour—and the final event of Season 1—couldn't have ended any better. You claimed victory on the queen stage, proving you had the legs and the strategy to close out the season in style. `;
    } else if (position <= 3) {
        story += `The final day of the Local Tour brought the curtain down on Season 1 with a podium finish on the toughest stage of the year. You finished ${position === 2 ? 'second' : 'third'}, a fitting end to a season of hard racing and steady progress. `;
    } else if (position <= 10) {
        story += `As the final riders crossed the line on the queen stage of the Local Tour, Season 1 officially came to a close. Your ${formatOrdinal(position)} place finish today capped off what's been a season of growth, challenges, and valuable experience. `;
    } else {
        story += `The final climb of the Local Tour—and the final test of Season 1—demanded everything you had. You finished ${formatOrdinal(position)} today as the season reached its conclusion, bringing an end to months of racing, learning, and pushing yourself against the field. `;
    }
    
    // Middle section - Local Tour GC result
    if (localTourGCPosition === 1) {
        story += `Your performance across all three stages of the Local Tour earned you the overall GC win—a testament to consistency and strength when it mattered most. The Local Tour champion trophy is yours. `;
    } else if (localTourGCPosition <= 3) {
        story += `Across the three days of the Local Tour, you fought hard for every second and secured ${localTourGCPosition === 2 ? 'second' : 'third'} place in the overall GC standings—a podium finish in the season's premier stage race. `;
    } else {
        story += `Over three challenging stages, you battled through the Local Tour and finished ${formatOrdinal(localTourGCPosition)} in the overall GC—solid stage racing experience that will serve you well in future seasons. `;
    }
    
    // Season wrap-up based on overall season performance
    if (earnedSeasonPodium) {
        story += `Looking back across the entire season, your efforts paid off in a major way: you finished on the podium in the overall Season 1 standings. `;
        
        if (seasonRank === 1) {
            story += `Not just any podium—you're the Season 1 champion. ${totalWins > 0 ? `With ${totalWins} race win${totalWins > 1 ? 's' : ''} and ` : 'With '}${totalPoints} points earned across fifteen events, you've proven you belong at the top of the Local Amateur level. `;
        } else if (seasonRank === 2) {
            story += `Second place in the season standings is an outstanding achievement. ${totalWins > 0 ? `You collected ${totalWins} win${totalWins > 1 ? 's' : ''}, ` : ''}${totalPodiums > 0 ? `${totalPodiums} podium${totalPodiums > 1 ? 's' : ''}, ` : ''}and ${totalPoints} points across the season. `;
        } else {
            story += `Third place in the season standings marks you as one of the strongest riders in the field. ${totalWins > 0 ? `${totalWins} ${totalWins > 1 ? 'victories' : 'victory'}, ` : ''}${totalPodiums > 0 ? `${totalPodiums} podium finish${totalPodiums > 1 ? 'es' : ''}, ` : ''}${totalPoints} points—these numbers tell the story of a season well raced. `;
        }
    } else if (seasonRank <= 10) {
        story += `Season 1 is now in the books. You finished ${seasonRank}th overall in the standings with ${totalPoints} points${totalWins > 0 ? ` and ${totalWins} win${totalWins > 1 ? 's' : ''}` : ''}—a solid campaign that showed steady improvement and plenty of competitive racing. `;
    } else if (seasonRank <= 20) {
        story += `The final standings are locked in, and you finished ${seasonRank}th overall with ${totalPoints} points across the season. ${totalWins > 0 ? `Your ${totalWins} ${totalWins > 1 ? 'victories' : 'victory'} proved you can win on your day, ` : ''}It's been a season of learning and gaining experience at this level. `;
    } else {
        story += `Season 1 concludes with you placing ${seasonRank}th in the overall standings. You earned ${totalPoints} points across the season's events${totalPodiums > 0 ? ` including ${totalPodiums} podium finish${totalPodiums > 1 ? 'es' : ''}` : ''}. Every race teaches something new, and this season provided plenty of lessons. `;
    }
    
    // Closing - look forward to Season 2
    story += `\n\nSeason 1 is complete. Take a moment to reflect on how far you've come—from your first criterium to surviving the Local Tour. The off-season is a time to rest, train, and prepare for what comes next. `;
    
    story += `Season 2 awaits in Spring 2026, bringing new challenges, tougher competition, and bigger opportunities. The local circuits were just the beginning. Your journey continues.`;
    
    return story;
}

/**
 * Generate season summary text for the Events page when season is complete
 * This should reflect on the season, not introduce it
 * 
 * @param {Object} userData - User's data
 * @returns {string} Summary text
 */
function generateSeasonSummaryText(userData) {
    const completionStatus = checkSeasonComplete(userData);
    const seasonRank = userData.season1Rank || 'unranked';
    const totalPoints = userData.season1Points || 0;
    const totalWins = userData.season1Wins || 0;
    const totalPodiums = userData.season1Podiums || 0;
    const completedEvents = (userData.completedStages || []).length;
    
    let summary = '';
    
    if (completionStatus.localTourStatus === 'dnf') {
        // Did not complete the Local Tour
        summary = `Season 1 has concluded. You competed in ${completedEvents} of the 15 events, earning ${totalPoints} points before a DNS in the Local Tour ended your season. `;
        
        if (totalWins > 0) {
            summary += `Despite the early exit from the tour, you secured ${totalWins} ${totalWins > 1 ? 'victories' : 'victory'} earlier in the season. `;
        }
        
        summary += `The experience gained this season will carry forward as you prepare for what's next.`;
    } else {
        // Completed the full season including Local Tour
        summary = `Season 1 is complete. You battled through all 15 events, from the opening criterium to the final climb of the Local Tour. `;
        
        if (seasonRank <= 3) {
            summary += `Your efforts earned you ${seasonRank === 1 ? 'the championship' : seasonRank === 2 ? 'second place' : 'third place'} in the overall standings—a podium finish in your first season. `;
        } else if (seasonRank <= 10) {
            summary += `You finished ${seasonRank}th in the overall standings with ${totalPoints} points. `;
        } else {
            summary += `You accumulated ${totalPoints} points across the season, finishing ${seasonRank}th overall. `;
        }
        
        if (totalWins > 0 && totalPodiums > 0) {
            summary += `Along the way, you claimed ${totalWins} win${totalWins > 1 ? 's' : ''} and ${totalPodiums} total podium finish${totalPodiums > 1 ? 'es' : ''}. `;
        } else if (totalWins > 0) {
            summary += `Your ${totalWins} race win${totalWins > 1 ? 's' : ''} showed you have what it takes to finish first. `;
        } else if (totalPodiums > 0) {
            summary += `You stepped onto the podium ${totalPodiums} time${totalPodiums > 1 ? 's' : ''} throughout the season. `;
        }
        
        summary += `The local amateur level has been conquered. Time to look ahead.`;
    }
    
    return summary;
}

/**
 * Generate profile page season review story
 * Should review the season and build excitement for Season 2
 * 
 * @param {Object} userData - User's data
 * @returns {string} Season review story
 */
function generateProfileSeasonReview(userData) {
    const completionStatus = checkSeasonComplete(userData);
    const seasonRank = userData.season1Rank || null;
    const totalPoints = userData.season1Points || 0;
    const totalWins = userData.season1Wins || 0;
    const totalPodiums = userData.season1Podiums || 0;
    const totalEvents = (userData.completedStages || []).length;
    
    // Get their best and worst moments
    let bestPosition = null;
    let worstPosition = null;
    let bestEventName = '';
    let worstEventName = '';
    
    const eventNames = {
        1: "Coast and Roast Crit",
        2: "Island Classic",
        3: "Forest Velodrome Elimination",
        4: "Coastal Loop Time Challenge",
        5: "North Lake Points Race",
        6: "Easy Hill Climb",
        7: "Flat Eight Criterium",
        8: "Grand Gilbert Fondo",
        9: "Base Camp Classic",
        10: "Beach and Pine TT",
        11: "South Lake Points Race",
        12: "Unbound - Little Egypt",
        13: "Local Tour Stage 1",
        14: "Local Tour Stage 2",
        15: "Local Tour Stage 3"
    };
    
    for (let i = 1; i <= 15; i++) {
        const eventResults = userData[`event${i}Results`];
        if (eventResults && eventResults.position && eventResults.position !== 'DNF') {
            const pos = eventResults.position;
            if (bestPosition === null || pos < bestPosition) {
                bestPosition = pos;
                bestEventName = eventNames[i];
            }
            if (worstPosition === null || pos > worstPosition) {
                worstPosition = pos;
                worstEventName = eventNames[i];
            }
        }
    }
    
    let review = `## Season 1: Complete\n\n`;
    
    // Opening paragraph - season overview
    if (completionStatus.localTourStatus === 'dnf') {
        review += `Your first season in the TPV Career Mode reached its conclusion when you were unable to start one of the Local Tour stages. Across ${totalEvents} events, you accumulated ${totalPoints} points and gained invaluable racing experience. While the season ended earlier than planned, the foundation has been laid for future success.\n\n`;
    } else {
        review += `Your first season in the TPV Career Mode is officially in the books. Fifteen events. `;
        
        if (seasonRank <= 3) {
            review += `A podium finish in the overall standings. `;
            if (seasonRank === 1) {
                review += `Not just any podium—you're the Season 1 champion. `;
            }
        } else {
            review += `${seasonRank ? `A ${seasonRank}th place finish in the overall standings. ` : ''}`;
        }
        
        review += `From the opening criterium to the final climb of the Local Tour, you raced consistently and pushed yourself against a competitive field. ${totalPoints} total points earned. `;
        
        if (totalWins > 0) {
            review += `${totalWins} ${totalWins > 1 ? 'victories' : 'victory'} claimed. `;
        }
        
        review += `Season 1: complete.\n\n`;
    }
    
    // Highlights section
    review += `### Season Highlights\n\n`;
    
    if (bestPosition) {
        review += `**Best Performance:** ${bestPosition === 1 ? 'Victory' : bestPosition === 2 ? '2nd place' : bestPosition === 3 ? '3rd place' : `${bestPosition}th place`} at ${bestEventName}`;
        if (bestPosition === 1) {
            review += ` — You proved you can win at this level`;
        } else if (bestPosition <= 3) {
            review += ` — A podium finish that showed your potential`;
        }
        review += `.\n\n`;
    }
    
    if (totalWins > 1) {
        review += `**${totalWins} Wins:** You didn't just win once—you won ${totalWins} times this season, demonstrating consistency at the highest level.\n\n`;
    }
    
    if (totalPodiums >= 5) {
        review += `**Podium Regular:** ${totalPodiums} podium finishes across the season established you as one of the most consistent performers in the field.\n\n`;
    }
    
    const gcPosition = userData.localTourGCPosition;
    if (gcPosition <= 3) {
        review += `**Local Tour Podium:** ${gcPosition === 1 ? 'Winner' : gcPosition === 2 ? '2nd place' : '3rd place'} in the General Classification of the season's premier stage race — a defining achievement.\n\n`;
    }
    
    // Challenges section
    if (worstPosition && worstPosition > 20) {
        review += `### Challenges Faced\n\n`;
        review += `Not every day was your day. ${worstEventName} proved to be your toughest challenge, but you finished the race and learned from the experience. `;
        
        if (completionStatus.localTourStatus === 'dnf') {
            review += `The DNS in the Local Tour cut your season short, but these setbacks are part of racing. `;
        }
        
        review += `Every difficult moment builds resilience for the battles ahead.\n\n`;
    }
    
    // Awards earned
    const awards = userData.awards || {};
    const significantAwards = [];
    
    if (awards.gcGold > 0) significantAwards.push(`${awards.gcGold} GC Gold`);
    if (awards.gcSilver > 0) significantAwards.push(`${awards.gcSilver} GC Silver`);
    if (awards.gcBronze > 0) significantAwards.push(`${awards.gcBronze} GC Bronze`);
    if (awards.domination > 0) significantAwards.push(`${awards.domination} Domination`);
    if (awards.darkHorse > 0) significantAwards.push(`${awards.darkHorse} Dark Horse`);
    if (awards.giantKiller > 0) significantAwards.push(`${awards.giantKiller} Giant Killer`);
    
    if (significantAwards.length > 0) {
        review += `### Special Recognition\n\n`;
        review += `Awards earned: ${significantAwards.join(', ')}.\n\n`;
    }
    
    // Look ahead to Season 2
    review += `### What's Next\n\n`;
    review += `The off-season is here. Time to rest, reflect, and train for the next level. Season 2 launches in Spring 2026, bringing Continental Pro racing—`;
    review += `longer events, tougher competition, and bigger stakes. `;
    
    if (seasonRank <= 10) {
        review += `Your performance in Season 1 has proven you're ready for the challenge. `;
    } else {
        review += `Use this break to prepare—the step up to Continental Pro will test everything you've learned. `;
    }
    
    review += `The journey continues.\n\n`;
    review += `*Season 2: Coming Spring 2026*`;
    
    return review;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkSeasonComplete,
        generateSeasonCompleteStory,
        generateSeasonSummaryText,
        generateProfileSeasonReview
    };
}

// Browser exports
if (typeof window !== 'undefined') {
    window.seasonCompletion = {
        checkSeasonComplete,
        generateSeasonCompleteStory,
        generateSeasonSummaryText,
        generateProfileSeasonReview
    };
}
