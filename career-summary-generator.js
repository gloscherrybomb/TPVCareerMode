/**
 * Career Summary Generator - Simplified Working Version
 * 
 * Generates personalized career summary paragraphs for rider profiles
 */

function generateCareerSummary(careerData) {
  const {
    totalSeasons = 1,
    totalStages = 0,
    totalPoints = 0,
    totalWins = 0,
    totalPodiums = 0,
    totalTop10s = 0,
    careerBest = { position: null, eventName: null },
    totalAwards = 0,
    recentResults = [],
    averageFinish = null
  } = careerData;

  // Build a simple paragraph based on career stage
  if (totalStages === 0) {
    return "Your TrainingPeaks Virtual career is just beginning. Complete your first race to start building your racing story.";
  }

  if (totalStages <= 3) {
    // Rookie
    const rookieOptions = [
      `Your TrainingPeaks Virtual career is just beginning, with ${totalStages} ${totalStages === 1 ? 'stage' : 'stages'} completed and a future full of possibility ahead.`,
      `The journey starts here—${totalStages} ${totalStages === 1 ? 'stage' : 'stages'} into your first season, laying the foundation for what's to come.`,
      `Every career has to start somewhere, and yours is ${totalStages} ${totalStages === 1 ? 'stage' : 'stages'} old, still fresh but already starting to take shape.`
    ];
    return rookieOptions[Math.floor(Math.random() * rookieOptions.length)];
  }

  // Generate based on performance
  let summary = "";
  
  // Opening
  if (totalStages < 10) {
    summary += `Your debut season has taken shape across ${totalStages} stages, establishing your presence in the TrainingPeaks Virtual peloton. `;
  } else {
    summary += `Your TrainingPeaks Virtual journey spans ${totalSeasons} ${totalSeasons === 1 ? 'season' : 'seasons'} now—${totalStages} stages of racing that tell the story of a rider finding their place in the peloton. `;
  }

  // Results
  if (totalWins >= 3) {
    summary += `You've built a career on winning—not occasionally, not when conditions align perfectly, but regularly and decisively, establishing yourself as one of the fastest riders in the virtual peloton. `;
  } else if (totalWins >= 1) {
    summary += `You've established yourself among the elite tier—not always victorious, but consistently dangerous, regularly finishing on podiums and proving you belong in any conversation about the fastest riders. `;
  } else if (totalPodiums >= 3) {
    summary += `You've built a career on consistent competitiveness—regular top-ten finishes punctuated by occasional podium appearances, the hallmark of a rider who knows how to race smart and finish strong. `;
  } else if (totalTop10s >= 3) {
    summary += `You've carved out a niche as a steady, reliable competitor—consistently finishing in respectable positions, occasionally pushing into the top ranks, always contributing solid performances. `;
  } else {
    summary += `Your career is one of steady development—each race brings improvement, each season shows progression, and the trajectory clearly points toward stronger performances ahead. `;
  }

  // Best moment
  if (careerBest.position === 1) {
    summary += `Your victory at ${careerBest.eventName} stands as a career highlight—a race where everything clicked, where the finish line couldn't come fast enough because you knew you had it won. `;
  } else if (careerBest.position <= 3) {
    const posWord = careerBest.position === 2 ? 'second' : 'third';
    summary += `Your ${posWord}-place finish at ${careerBest.eventName} represents your career best—close enough to taste victory, proof that you can compete at the highest level. `;
  } else if (totalAwards >= 5) {
    summary += `You've collected ${totalAwards} awards across your career, badges of honor that mark breakthrough performances, tactical masterclasses, and days when everything clicked. `;
  } else {
    summary += `The breakthrough moment is still ahead, but you're building toward it with each race, each experience, each lesson learned in the heat of competition. `;
  }

  // Identity
  if (totalWins >= 2) {
    summary += `The podium is your natural habitat—not always winning, but always in contention, always finishing among the fastest riders, always a threat for the top spots. `;
  } else if (totalPodiums >= 2) {
    summary += `You've established yourself as a rider others keep an eye on: competitive enough to threaten for podiums, consistent enough to bank strong results regardless of race conditions. `;
  } else if (totalTop10s >= 3) {
    summary += `Consistency defines your racing—you're the rider who shows up week after week, finishes in the top ten, banks points, and builds a career on reliability rather than spectacular one-offs. `;
  } else {
    summary += `The trajectory is clear: you're getting faster, learning from each race, and steadily moving toward the front of the field. Improvement isn't promised to anyone, but you're delivering it. `;
  }

  // Current state
  summary += `This season continues to build your racing story, with each event adding another chapter to your developing career. `;

  // Forward looking
  if (totalStages < 5) {
    summary += `The beginning of any career is about learning, improving, and building toward something—and right now, you're doing exactly that, with your best performances still ahead of you.`;
  } else if (totalWins >= 2) {
    summary += `You're entering the prime of your racing career—the experience is there, the results are coming, and the trajectory suggests you're only going to get stronger from here.`;
  } else {
    summary += `The racing journey continues: future seasons will bring new challenges, new opportunities, and perhaps new levels of performance yet to be discovered.`;
  }

  return summary;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateCareerSummary };
} else if (typeof window !== 'undefined') {
  window.careerSummaryGen = { generateCareerSummary };
}
