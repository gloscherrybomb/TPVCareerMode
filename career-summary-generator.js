/**
 * Career Summary Generator
 * 
 * Generates personalized career summary paragraphs for rider profiles
 * Based on entire career history across all seasons
 * 
 * Uses mix-and-match sentence structure with 7 variations each for massive combinations
 */

/**
 * Generate a career summary paragraph
 * 
 * @param {Object} careerData - Complete career statistics
 * @returns {string} - Career summary paragraph (5-7 sentences)
 */
function generateCareerSummary(careerData) {
  const {
    totalSeasons = 1,
    totalStages = 0,
    totalPoints = 0,
    totalWins = 0,
    totalPodiums = 0,
    totalTop10s = 0,
    currentSeasonStages = 0,
    currentSeasonPoints = 0,
    currentSeasonWins = 0,
    currentSeasonPodiums = 0,
    careerBest = { position: null, eventName: null },
    totalAwards = 0,
    recentResults = [],
    averageFinish = null
  } = careerData;

  // Determine career stage
  const careerStage = getCareerStage(totalSeasons, totalStages);
  
  // Determine performance level
  const performanceLevel = getPerformanceLevel(totalWins, totalPodiums, totalTop10s, totalStages, averageFinish);
  
  // Determine form trend
  const formTrend = getFormTrend(recentResults);
  
  // Determine racing identity
  const racingIdentity = getRacingIdentity(totalWins, totalPodiums, totalTop10s, totalStages, performanceLevel);
  
  // Build paragraph sentence by sentence
  let paragraph = '';
  
  // 1. Opening - Career context
  paragraph += getOpeningSentence(careerStage, totalSeasons, totalStages);
  paragraph += ' ';
  
  // 2. Results summary - Overall performance
  paragraph += getResultsSummary(performanceLevel, totalPoints, totalWins, totalPodiums, totalTop10s, totalStages);
  paragraph += ' ';
  
  // 3. Signature moment - Best achievement
  paragraph += getSignatureMoment(careerBest, totalWins, totalPodiums, totalAwards, performanceLevel);
  paragraph += ' ';
  
  // 4. Racing identity - What defines them
  paragraph += getRacingIdentitySentence(racingIdentity, performanceLevel, totalSeasons);
  paragraph += ' ';
  
  // 5. Current season context - Where they are now
  paragraph += getCurrentSeasonContext(totalSeasons, currentSeasonStages, currentSeasonPoints, currentSeasonWins, currentSeasonPodiums, formTrend, performanceLevel);
  paragraph += ' ';
  
  // 6. Forward-looking - What's ahead
  paragraph += getForwardLooking(careerStage, formTrend, performanceLevel, totalSeasons);
  
  return paragraph.trim();
}

/**
 * Determine career stage based on experience
 */
function getCareerStage(totalSeasons, totalStages) {
  if (totalSeasons === 1 && totalStages <= 3) return 'rookie';
  if (totalSeasons === 1) return 'first-season';
  if (totalSeasons === 2) return 'developing';
  if (totalSeasons <= 4) return 'experienced';
  return 'veteran';
}

/**
 * Determine overall performance level
 */
function getPerformanceLevel(totalWins, totalPodiums, totalTop10s, totalStages, averageFinish) {
  if (totalStages === 0) return 'new';
  
  const winRate = totalWins / totalStages;
  const podiumRate = totalPodiums / totalStages;
  const top10Rate = totalTop10s / totalStages;
  
  if (winRate >= 0.3) return 'dominant';
  if (winRate >= 0.15 || podiumRate >= 0.4) return 'elite';
  if (podiumRate >= 0.2 || top10Rate >= 0.6) return 'competitive';
  if (top10Rate >= 0.3) return 'solid';
  if (averageFinish && averageFinish <= 20) return 'developing';
  return 'battling';
}

/**
 * Determine form trend from recent results
 */
function getFormTrend(recentResults) {
  if (recentResults.length < 2) return 'new';
  
  const recentWins = recentResults.filter(pos => pos === 1).length;
  if (recentWins >= 2 && recentResults[0] === 1) return 'hot-streak';
  
  if (recentResults.length >= 3) {
    const firstHalf = recentResults.slice(0, Math.floor(recentResults.length / 2));
    const secondHalf = recentResults.slice(Math.floor(recentResults.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (firstAvg - secondAvg >= 5) return 'improving';
    if (secondAvg - firstAvg >= 5) return 'declining';
  }
  
  const avgRecent = recentResults.reduce((a, b) => a + b, 0) / recentResults.length;
  const variance = recentResults.reduce((sum, pos) => sum + Math.pow(pos - avgRecent, 2), 0) / recentResults.length;
  
  if (variance <= 25) return 'consistent';
  return 'inconsistent';
}

/**
 * Determine racing identity/style
 */
function getRacingIdentity(totalWins, totalPodiums, totalTop10s, totalStages, performanceLevel) {
  if (totalStages === 0) return 'new';
  
  const winRate = totalWins / totalStages;
  const podiumRate = totalPodiums / totalStages;
  const top10Rate = totalTop10s / totalStages;
  
  if (winRate >= 0.2 && podiumRate < 0.35) return 'win-or-bust';
  if (podiumRate >= 0.3) return 'podium-hunter';
  if (top10Rate >= 0.5) return 'consistent-scorer';
  if (totalPodiums >= 3 && winRate < 0.1) return 'tactical';
  if (performanceLevel === 'developing' || performanceLevel === 'solid') return 'improving';
  
  return 'battler';
}

/**
 * SENTENCE 1: Opening - Career Context (7 variations per stage)
 */
function getOpeningSentence(careerStage, totalSeasons, totalStages) {
  const seasonWord = totalSeasons === 1 ? 'season' : 'seasons';
  const stageWord = totalStages === 1 ? 'stage' : 'stages';
  
  if (careerStage === 'rookie') {
    const options = [
      `Your TrainingPeaks Virtual career is just beginning, with ${totalStages} ${stageWord} completed and a future full of possibility ahead.`,
      `The journey starts here—${totalStages} ${stageWord} into your first season, laying the foundation for what's to come.`,
      `Every career has to start somewhere, and yours is ${totalStages} ${stageWord} old, still fresh but already starting to take shape.`,
      `You're at the very beginning of your racing story, ${totalStages} ${stageWord} in, learning what it takes to compete at this level.`,
      `The career odometer reads ${totalStages} ${stageWord}—barely started, everything still new, but the first steps have been taken.`,
      `Welcome to TrainingPeaks Virtual racing. ${totalStages} ${stageWord} completed, countless more ahead, and a blank canvas waiting to be painted.`,
      `This is where it begins: ${totalStages} ${stageWord} into your debut season, finding your wheels, learning the ropes, building something from nothing.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'first-season') {
    const options = [
      `Your debut season has taken shape across ${totalStages} stages, establishing your presence in the TrainingPeaks Virtual peloton.`,
      `${totalStages} stages into your first season, you've begun to carve out an identity as a competitor who shows up and gets results.`,
      `The first season is where reputations are built, and across ${totalStages} stages you've been writing the opening chapter of yours.`,
      `One season, ${totalStages} stages—your introduction to competitive virtual racing is well underway, and you're making your mark.`,
      `You're navigating your inaugural campaign, ${totalStages} stages deep, learning what works and what doesn't in the unforgiving world of virtual competition.`,
      `The debut season is ${totalStages} stages old now, and you've already begun establishing yourself as someone who belongs in these races.`,
      `Across ${totalStages} stages of your first season, you've been announcing your arrival, proving you can compete, and laying groundwork for seasons to come.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'developing') {
    const options = [
      `Across ${totalSeasons} seasons and ${totalStages} stages, you've evolved from newcomer to established competitor, learning and improving with each race.`,
      `Your TrainingPeaks Virtual journey spans ${totalSeasons} seasons now—${totalStages} stages of racing that tell the story of a rider finding their place in the peloton.`,
      `Two seasons and ${totalStages} stages have shaped your racing career, each event adding another layer to your growing experience and capability.`,
      `${totalSeasons} seasons in, ${totalStages} stages completed, and you're no longer the rookie—you're developing into a racer who knows how to compete.`,
      `The career arc is taking shape: ${totalSeasons} seasons, ${totalStages} stages, steady growth from beginner to someone who can challenge for results.`,
      `You've graduated from newcomer status—${totalSeasons} seasons and ${totalStages} stages have transformed you into a rider with genuine racing experience.`,
      `${totalStages} stages across ${totalSeasons} seasons represent a career in motion, evolving race by race, building on experience, moving toward something bigger.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'experienced') {
    const options = [
      `${totalSeasons} seasons and ${totalStages} stages—those numbers represent a substantial career built on consistency, dedication, and accumulated racing wisdom.`,
      `You're no longer a newcomer. With ${totalSeasons} seasons behind you covering ${totalStages} stages, you've become a fixture in the virtual peloton with a reputation that precedes you.`,
      `The racing résumé speaks for itself: ${totalSeasons} seasons, ${totalStages} stages, countless battles won and lost, lessons learned, and a career that continues to evolve.`,
      `${totalSeasons} seasons deep and ${totalStages} stages completed—you're an established name now, someone who's seen enough racing to understand its nuances and complexities.`,
      `Your career has weight to it: ${totalSeasons} seasons, ${totalStages} stages, enough races to know what works and enough experience to execute when it matters.`,
      `With ${totalSeasons} seasons under your belt spanning ${totalStages} stages, you've built a career that commands respect—you've proven yourself repeatedly.`,
      `${totalStages} stages across ${totalSeasons} seasons make you one of the more experienced competitors in the field, someone whose presence means something in any start list.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // veteran
  const options = [
    `As a seasoned veteran with ${totalSeasons} seasons under your belt spanning ${totalStages} stages, you've seen it all—the highs, the lows, the dramatic finishes and the tough days where just finishing felt like victory.`,
    `${totalSeasons} seasons. ${totalStages} stages. You're one of the established names now, someone whose presence in a start list means something, whose career has weight and substance.`,
    `Your TrainingPeaks Virtual career has become something substantial—${totalSeasons} seasons deep, ${totalStages} stages completed, a body of work that tells the story of sustained commitment and competitive fire.`,
    `You're a veteran of the virtual peloton now, with ${totalSeasons} seasons and ${totalStages} stages creating a racing legacy built on experience, perseverance, and competitive spirit.`,
    `${totalStages} stages across ${totalSeasons} seasons—these aren't just numbers, they're a career, a journey, a testament to showing up season after season and racing your bike.`,
    `Few riders can match your longevity: ${totalSeasons} seasons, ${totalStages} stages, year after year of pinning on numbers and competing against the best.`,
    `The career counter reads ${totalSeasons} seasons and ${totalStages} stages—you're deeply embedded in the fabric of TrainingPeaks Virtual racing now, a veteran presence who's earned every result.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * SENTENCE 2: Results Summary - Overall Performance (7 variations per level)
 */
function getResultsSummary(performanceLevel, totalPoints, totalWins, totalPodiums, totalTop10s, totalStages) {
  const winWord = totalWins === 1 ? 'victory' : 'victories';
  const podiumWord = totalPodiums === 1 ? 'podium' : 'podiums';
  const top10Word = totalTop10s === 1 ? 'top-ten finish' : 'top-ten finishes';
  
  if (performanceLevel === 'dominant') {
    const options = [
      `You've built a career on winning—not occasionally, not when conditions align perfectly, but regularly and decisively, establishing yourself as one of the fastest riders in the virtual peloton.`,
      `Victory has become almost expected rather than exceptional, and that consistent excellence at the front of races defines who you are as a competitor.`,
      `The reputation precedes you now: when you're on a start list, everyone knows they're racing for second unless they can somehow match your speed and tactical awareness.`,
      `You've mastered the art of crossing the line first, turning strong form into dominant performances with a regularity that sets you apart from the rest of the field.`,
      `Racing at the front has become your natural state—podium finishes stack up, wins accumulate, and your name appears at the top of results sheets with impressive consistency.`,
      `The career you've built is defined by excellence: race after race where you're not just competitive but genuinely dominant, setting the pace others try desperately to match.`,
      `Your results tell a simple story—when the race reaches its decisive moments, you're invariably the one with the strength and speed to capitalize, delivering victories and podiums that others can only aspire to.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'elite') {
    const options = [
      `You've established yourself among the elite tier—not always victorious, but consistently dangerous, regularly finishing on podiums and proving you belong in any conversation about the fastest riders.`,
      `The career arc shows a rider who wins races and challenges for podiums with genuine regularity, someone who enters each event as a legitimate threat rather than an outside hope.`,
      `Your racing produces the kind of results that define elite competitors: multiple victories scattered across your career, regular podium appearances, and consistent front-running performances.`,
      `You race at a level where winning is realistic, podiums are regular, and top-tier performances have become your standard rather than your exception.`,
      `The results sheet consistently places you among the fastest finishers—victories when everything aligns, podiums when you're competitive, always near the front when the race reaches its conclusion.`,
      `You've carved out a reputation as someone genuinely capable of winning any race you start, backed by a career full of podium finishes and front-running performances that validate that status.`,
      `Speed, consistency, and the ability to deliver on big occasions define your racing—you're not the most dominant force in the peloton, but you're permanently among the most dangerous.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'competitive') {
    const options = [
      `You've built a career on consistent competitiveness—regular top-ten finishes punctuated by occasional podium appearances, the hallmark of a rider who knows how to race smart and finish strong.`,
      `The racing identity is clear: you're always there or thereabouts, consistently finishing in strong positions, occasionally breaking through to the podium when conditions align with your strengths.`,
      `Your results paint a picture of reliable competitiveness—you might not win every week, but you're in the mix every week, accumulating strong finishes that build into something substantial.`,
      `You've established yourself as a rider others keep an eye on: competitive enough to threaten for podiums, consistent enough to bank strong results regardless of race conditions.`,
      `The career trajectory shows sustained competitiveness at a high level—regular appearances near the front of the field, occasional podium breakthroughs, and the kind of consistency that defines successful racers.`,
      `You race with enough speed for podiums and enough consistency for regular top-ten finishes, building a career on reliable performances rather than spectacular one-offs.`,
      `The results ledger reflects smart, competitive racing: you're consistently in the top group, occasionally on the podium, always finishing in positions that matter and contribute meaningfully to your season.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'solid') {
    const options = [
      `You've carved out a niche as a steady, reliable competitor—consistently finishing in respectable positions, occasionally pushing into the top ranks, always contributing solid performances.`,
      `The career you're building is based on showing up and delivering: maybe not spectacular results every time, but consistent competitiveness that adds up to something meaningful over time.`,
      `Your racing produces dependable returns—regular top-ten appearances with occasional stronger finishes, the kind of steady accumulation that defines mid-pack to front-of-pack racers.`,
      `You've proven yourself as someone who competes genuinely rather than just participates, finishing consistently in the front half of fields and occasionally breaking into truly strong positions.`,
      `The results reflect workmanlike racing in the best sense: you show up, execute the race plan, finish in competitive positions, and slowly build a career through accumulated solid performances.`,
      `Your identity as a racer is built on consistency and competitiveness—you might not dominate, but you're always in the fight, always finishing respectably, always relevant to the race outcome.`,
      `You race with enough speed for occasional standout results and enough consistency for regular competitive finishes, building your career one solid performance at a time.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'developing') {
    const options = [
      `Your career is one of steady development—each race brings improvement, each season shows progression, and the trajectory clearly points toward stronger performances ahead.`,
      `The results tell a story of growth: what started as survival has evolved into competitiveness, with clear signs that your best racing is still ahead as you continue developing.`,
      `You're building something through accumulated experience and improving fitness—the recent results are better than the early ones, the current season stronger than previous campaigns.`,
      `Every race teaches something, and you're learning: the performances are getting stronger, the finishes more competitive, and the gap to the front of the field is narrowing with each passing month.`,
      `Your racing shows clear improvement over time—what once felt impossible now feels achievable, and performances that would have been your best now represent your baseline.`,
      `The career arc points unmistakably upward: fitness building, race craft sharpening, results improving, and all signs suggesting you haven't reached your competitive ceiling yet.`,
      `You're in the development phase where growth is visible and exciting—each strong result validates the training, each good performance suggests there's more to come as you continue progressing.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // battling
  const options = [
    `Your racing is defined by persistence and determination—showing up regardless of form, fighting through tough races, and earning every result through sheer refusal to quit.`,
    `The career you're building isn't about spectacular results but about character: completing races, fighting for positions, and proving that dedication matters as much as talent.`,
    `You race because you love racing, not because it comes easily—and there's genuine honor in that commitment, that willingness to compete even when the results don't reflect your effort.`,
    `Every finish line reached represents a victory of sorts—not in placement but in persistence, in showing up, in refusing to let difficult days or modest results diminish your competitive spirit.`,
    `Your results might not fill highlight reels, but they tell a story worth respecting: consistency in participation, determination in competition, and character in how you approach every race.`,
    `The racing hasn't delivered spectacular results, but it's revealed something more important—that you have the heart to keep competing, keep trying, keep showing up regardless of outcomes.`,
    `You're not the fastest rider in the field, but you're there at every start line with genuine competitive intent, and that persistent willingness to race deserves recognition.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}
      `You've built a career on solid performances, with ${totalPoints} points accumulated through ${totalTop10s} ${top10Word} and the kind of steady racing that keeps you in contention.`,
      `The numbers show a rider who competes: ${totalTop10s} ${top10Word}, ${totalPodiums} ${podiumWord}, ${totalPoints} points earned by showing up and executing the plan race after race.`,
      `${totalPoints} career points reflect your approach—consistent top-ten appearances (${totalTop10s} so far), occasional podiums (${totalPodiums}), and steady accumulation of results.`,
      `You've proven yourself as a reliable mid-pack to front-pack finisher with ${totalTop10s} ${top10Word} demonstrating your ability to race competitively across ${totalStages} stages.`,
      `Across ${totalStages} races, you've banked ${totalPoints} points through consistent effort: ${totalTop10s} ${top10Word} and ${totalPodiums} ${podiumWord} mark the highlights of a solid career.`,
      `${totalTop10s} times you've finished in the top ten, ${totalPodiums} times on the podium—those results combine to create a ${totalPoints}-point career built on showing up and performing.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'developing') {
    const options = [
      `Your ${totalPoints} career points have been earned the hard way, through ${totalStages} stages of racing that have brought improvement, lessons learned, and flashes of what you're capable of.`,
      `The results are developing—${totalTop10s} ${top10Word} and ${totalPodiums} ${podiumWord} show you're getting faster, learning the craft, and moving in the right direction.`,
      `Across ${totalStages} races, you've accumulated ${totalPoints} points while steadily improving, with ${totalTop10s} ${top10Word} marking your progress toward the front of the field.`,
      `You're building something: ${totalPoints} points across ${totalStages} stages, ${totalTop10s} ${top10Word} that prove you belong, and a trajectory that points upward.`,
      `${totalStages} stages have yielded ${totalPoints} points and clear signs of development—${totalTop10s} ${top10Word} demonstrate growing competitiveness and emerging capability.`,
      `The career arc shows improvement: from early struggles to ${totalTop10s} ${top10Word} and ${totalPodiums} ${podiumWord}, with ${totalPoints} points marking your development as a racer.`,
      `${totalPoints} career points tell the story of a rider finding their speed—${totalTop10s} ${top10Word} show you're getting there, with potential still being unlocked.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // battling
  const options = [
    `Racing at this level is tough, and your ${totalPoints} points represent the rewards of showing up, fighting through difficult days, and refusing to quit.`,
    `You've completed ${totalStages} stages and banked ${totalPoints} points—maybe not leading the standings, but still racing, still competing, still in the fight.`,
    `The ${totalPoints} career points you've earned tell the story of perseverance—${totalStages} stages of racing where getting to the finish line is its own victory.`,
    `Every point matters, and your ${totalPoints} have been earned through determination across ${totalStages} stages, proving that showing up and fighting is its own kind of success.`,
    `${totalStages} races, ${totalPoints} points—those numbers represent commitment to the sport even when results don't come easy, even when the peloton doesn't wait.`,
    `You've battled through ${totalStages} stages to earn ${totalPoints} points, and while the results might not turn heads, the dedication and persistence deserve recognition.`,
    `The points tally (${totalPoints} across ${totalStages} stages) might be modest, but they represent something valuable: the willingness to keep racing regardless of results.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * SENTENCE 3: Signature Moment - Best Achievement (7 variations per category)
 */
function getSignatureMoment(careerBest, totalWins, totalPodiums, totalAwards, performanceLevel) {
  const hasCareerBest = careerBest.position && careerBest.eventName;
  
  if (performanceLevel === 'dominant' && totalWins >= 5) {
    const options = [
      `With multiple victories under your belt, it's hard to pick a single defining moment—but the sheer consistency of winning is perhaps the greatest achievement of all.`,
      `Victory has become almost expected rather than exceptional, and that dominance—that ability to win repeatedly across different events—is what sets you apart.`,
      `The highlight reel is long, filled with wins and dominant performances, each adding to a reputation built on sustained excellence rather than single moments.`,
      `When you've won ${totalWins} races, individual victories blur together—it's the cumulative weight of all that success that defines your career.`,
      `Picking one signature moment from ${totalWins} victories feels arbitrary—your career highlight is the entire body of winning performances, not just one race.`,
      `Some riders chase their first win their entire career. You've collected ${totalWins} of them, turning what's special for others into routine excellence for you.`,
      `The signature achievement isn't a single race—it's the pattern of dominance, the ${totalWins} victories that prove winning isn't luck, it's what you do.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (hasCareerBest && careerBest.position === 1) {
    const options = [
      `Your victory at ${careerBest.eventName} stands as a career highlight—a race where everything clicked, where the finish line couldn't come fast enough because you knew you had it won.`,
      `${careerBest.eventName} delivered your finest moment: crossing the line first, arms raised, the satisfaction of a victory that validated all the training and suffering.`,
      `The win at ${careerBest.eventName} will always hold special significance—proof that on your best day, you can beat anyone in the field.`,
      `${careerBest.eventName} belongs to you—that victory represents what's possible when fitness, form, and tactical execution all align perfectly.`,
      `When people ask about your career highlight, ${careerBest.eventName} is the answer—the day you crossed the line first and proved you have what it takes to win.`,
      `${careerBest.eventName} gave you your career-defining result: victory, pure and simple, the kind of result that transforms how you see yourself as a racer.`,
      `The victory at ${careerBest.eventName} stands above everything else—that moment of crossing first, knowing you'd beaten everyone, belongs in your personal hall of fame.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (hasCareerBest && careerBest.position <= 3) {
    const positionWord = careerBest.position === 2 ? 'second' : 'third';
    const options = [
      `Your ${positionWord}-place finish at ${careerBest.eventName} represents your career best—close enough to taste victory, proof that you can compete at the highest level.`,
      `${careerBest.eventName} brought your strongest result: ${positionWord} place and a spot on the podium, evidence of your capability when everything comes together.`,
      `The podium at ${careerBest.eventName} stands as a signature achievement—${positionWord} place in a competitive field, showing you belong among the fastest riders.`,
      `${careerBest.eventName} delivered your career-best performance: ${positionWord} place, podium flowers, and proof that you can challenge the strongest competitors when conditions align.`,
      `When you stood on the podium in ${positionWord} place at ${careerBest.eventName}, you reached your career peak so far—a result that validated your training and racing approach.`,
      `Your ${positionWord}-place finish at ${careerBest.eventName} remains your finest hour—close to victory, definitely on the podium, undeniably among the race's strongest performers.`,
      `${careerBest.eventName} will always be special—that ${positionWord}-place finish represents your best result to date and proof of what you're capable of when everything clicks.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (totalAwards >= 5) {
    const options = [
      `The trophy cabinet tells its own story—${totalAwards} awards earned through various achievements, each representing a moment where you exceeded expectations or delivered something special.`,
      `You've collected ${totalAwards} awards across your career, badges of honor that mark breakthrough performances, tactical masterclasses, and days when everything clicked.`,
      `${totalAwards} awards accumulated—some for beating predictions, others for special performances, all proof that you've had moments of brilliance scattered throughout your career.`,
      `Rather than one defining moment, you have ${totalAwards} awards marking various achievements: days you beat the odds, exceeded predictions, or delivered memorable performances.`,
      `Your ${totalAwards} awards represent the highlights—races where you earned special recognition for outstanding performances, tactical brilliance, or exceeding expectations.`,
      `${totalAwards} times you've earned awards for special achievements, creating a collection that speaks to consistent moments of excellence rather than one career-defining result.`,
      `The awards shelf holds ${totalAwards} honors—each marks a race where you did something noteworthy, proving your career has been punctuated by memorable performances.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (totalPodiums >= 1) {
    const podiumWord = totalPodiums === 1 ? 'podium finish' : 'podium finishes';
    const options = [
      `Your ${totalPodiums} ${podiumWord} represent the high points—days when you had the legs, made the right moves, and finished among the strongest riders in the race.`,
      `The ${podiumWord} (${totalPodiums} so far) stand out as proof of your potential—evidence that on your best days, you're as fast as anyone in the field.`,
      `${totalPodiums} ${podiumWord} mark the moments when everything came together, when you proved you could compete with and beat the strongest competitors.`,
      `Your ${totalPodiums} ${podiumWord} represent career peaks—races where fitness met opportunity and you delivered performances that earned you a spot among the day's best.`,
      `${totalPodiums} times you've stood on the podium, and each occasion proved the same thing: you have the capability to challenge the fastest riders when conditions favor you.`,
      `The ${podiumWord} (${totalPodiums} total) stand as evidence that you can reach the highest level—those results aren't flukes, they're proof of genuine competitive ability.`,
      `Among your ${totalPodiums} ${podiumWord}, you'll find your career's proudest moments—races where everything aligned and you finished with the strongest riders in the field.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // No major achievements yet
  const options = [
    `The breakthrough moment is still ahead, but you're building toward it with each race, each experience, each lesson learned in the heat of competition.`,
    `Career-defining performances take time to arrive, and you're in the process of developing the fitness and race craft needed to deliver them.`,
    `Every career needs its signature moment, and yours is still being written—the foundation is being laid for something memorable to come.`,
    `The highlight reel is still being filmed—you haven't had your breakout performance yet, but you're building the skills and fitness to make it happen.`,
    `You're still searching for that career-defining result, but the process of chasing it is teaching you what it takes to reach that level.`,
    `The signature achievement remains ahead on the horizon, waiting for the day when fitness, form, and opportunity all converge at the right moment.`,
    `Your career-best performance is still to come, but each race brings you closer to having the experience and capability to deliver it when the opportunity arrives.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * SENTENCE 4: Racing Identity - What Defines Them (7 variations per identity)
 */
function getRacingIdentitySentence(racingIdentity, performanceLevel, totalSeasons) {
  if (racingIdentity === 'win-or-bust') {
    const options = [
      `You race to win, not to accumulate mid-pack finishes—it's victory or nothing, an approach that's delivered triumphs but also taught hard lessons about the fine margins at the front.`,
      `Your racing style is aggressive and uncompromising: when you're in form, you attack for the win, and when you're not, you'd rather fight for victory and finish tenth than settle for a safe fifth.`,
      `Conservative racing isn't your style—you're a rider who commits fully to winning attempts, accepting the risks that come with racing at the sharp end.`,
      `You're not interested in consistent top-tens earned through safe racing—you want victories, and you're willing to gamble on bold moves to get them.`,
      `The racing philosophy is simple: swing for the fences. Either you're contending for victory or you're learning why you weren't, but you'll never settle for cautious anonymity.`,
      `Your results vary wildly because you race for wins, not consistency—when it works, you stand on top of the podium, and when it doesn't, you accept the consequences.`,
      `There's no middle ground in your racing: you commit to winning moves, chase ambitious results, and live with the outcomes—triumph or disappointment, never mediocrity.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'podium-hunter') {
    const options = [
      `You've developed into a podium threat who knows how to race at the front—not always fast enough for victory, but consistently capable of top-three performances.`,
      `Podiums define your career: you know how to position yourself for results, how to read races for opportunities, and how to deliver when the finish line approaches.`,
      `Your specialty is racing smart enough and fast enough to consistently land on the podium—third, second, sometimes first, but always in contention.`,
      `You're a rider who belongs in the final selection, someone who's learned to consistently finish with the fastest riders and claim podium spots regularly.`,
      `The podium has become familiar territory—you know what it takes to get there, and you've proven you can deliver those performances repeatedly.`,
      `You race with the confidence of someone who expects to podium, who positions for it, who has the speed and tactical sense to make it happen more often than not.`,
      `Top-three finishes aren't occasional surprises for you—they're the expected outcome when you race well, evidence of a rider who's mastered the art of front-running racing.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'consistent-scorer') {
    const options = [
      `Consistency defines your approach: you might not win often, but you're remarkably reliable about finishing in the top ten and banking points race after race.`,
      `You're the epitome of steady performance—not the flashiest racer in the peloton, but one of the most reliable, always there, always scoring, always relevant.`,
      `Your racing identity is built on dependability: show up, execute the plan, finish near the front, repeat. It's not dramatic, but it works.`,
      `You've mastered the art of consistent racing—avoiding disasters, capitalizing on opportunities, and accumulating points through reliable performances.`,
      `The results might not generate headlines, but they generate respect: you're a rider who consistently delivers solid finishes, rarely has bad days, and keeps banking points.`,
      `Your superpower is reliability—other riders have wild swings between victory and disaster, but you consistently finish strong and steadily accumulate results.`,
      `You race smart, avoid unnecessary risks, and consistently finish near the front—it's a methodical approach that's proven effective at building a solid career.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'tactical') {
    const options = [
      `You're a tactical racer who compensates for any raw speed deficit with smart positioning, well-timed efforts, and the kind of race intelligence that puts you on podiums.`,
      `Racing craft matters as much as fitness for you—you're the rider who reads moves before they happen, positions perfectly, and delivers results through intelligence not just power.`,
      `Your results come from racing smart: making the right moves at the right times, conserving energy when others waste it, and being in position when opportunities emerge.`,
      `You've learned that you don't need to be the strongest to succeed—just the smartest. Your podiums come from outthinking opponents as much as outpacing them.`,
      `Tactical awareness is your edge: you see how races unfold, anticipate the crucial moments, and position yourself to capitalize when others make mistakes.`,
      `You race with your head as much as your legs, using positioning, timing, and race-reading ability to achieve results that might exceed your raw physiological capabilities.`,
      `Smart racing defines your style—you know when to follow, when to attack, when to conserve, and those tactical decisions often matter more than who has the biggest engine.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'improving') {
    const options = [
      `The trajectory is clear: you're getting faster, learning from each race, and steadily moving toward the front of the field. Improvement isn't promised to anyone, but you're delivering it.`,
      `You're on an upward path, with each season bringing better results than the last—the kind of improvement curve that suggests your best racing is still ahead.`,
      `Every race teaches you something, and you're applying those lessons—the results show steady improvement, with today's performances surpassing yesterday's limitations.`,
      `You're a rider in development, moving from competent to competitive to occasionally elite, with the trajectory suggesting more growth ahead.`,
      `The defining characteristic of your career so far is improvement: faster times, better positions, stronger finishes, a clear evolution from where you started.`,
      `You haven't peaked yet—that's clear from your results, which keep getting better as you gain experience, build fitness, and refine your racing approach.`,
      `Steady improvement marks your career arc: you're faster now than last season, stronger than the year before, racing smarter with each event that passes.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // battler
  const options = [
    `You're a battler—maybe not the fastest, but someone who shows up, competes, and refuses to quit regardless of where you finish in the results.`,
    `Your racing identity is built on persistence: keep showing up, keep fighting, keep pinning on numbers even when results don't come easy.`,
    `You race with the heart of a fighter—results might not always reflect it, but you compete with determination and refuse to back down from challenges.`,
    `The peloton doesn't intimidate you even if it doesn't always reward you—you keep racing, keep trying, keep battling for every position and every point.`,
    `Your approach is straightforward: show up, race hard, give everything you have, and accept whatever result that effort delivers. It's honest racing, if not always successful.`,
    `You might not be winning, but you're competing—there's dignity in that, in continuing to race and fight even when the results don't match your effort.`,
    `Racing at this level is hard, and you're doing it anyway—that willingness to keep competing, keep trying, keep showing up defines who you are as a racer.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * SENTENCE 5: Current Season Context - Where They Are Now (7 variations)
 */
function getCurrentSeasonContext(totalSeasons, currentSeasonStages, currentSeasonPoints, currentSeasonWins, currentSeasonPodiums, formTrend, performanceLevel) {
  if (totalSeasons === 1) {
    // First season - focus on the season itself
    if (currentSeasonStages <= 3) {
      const options = [
        `This debut season is still young, still unfolding, still teaching you what virtual racing demands and what you're capable of delivering.`,
        `You're early in your first season, still learning the rhythms of competitive racing, still discovering what works and what needs refinement.`,
        `The inaugural campaign has barely begun—each race brings new lessons, new challenges, new understanding of what it takes to compete at this level.`,
        `Your first season is in its opening stages, and you're absorbing everything: the pace, the tactics, the demands of racing against this field.`,
        `Early days in your debut season mean everything is fresh—you're still figuring out where you fit, what your strengths are, how to maximize your capabilities.`,
        `The season is young and so is your career—right now it's about gaining experience, building confidence, and establishing a baseline for future growth.`,
        `Just a few stages into your first season, you're at the beginning of what could become a long journey in TrainingPeaks Virtual racing.`
      ];
      return options[Math.floor(Math.random() * options.length)];
    } else {
      const options = [
        `As your first season progresses past halfway, you're no longer just learning—you're applying those lessons, refining your approach, and showing what you can do.`,
        `The debut season is well underway now, and you've evolved from complete newcomer to someone with genuine racing experience and developing capability.`,
        `Mid-season in your first campaign, you're starting to understand how you stack up, where your strengths lie, and what areas need work moving forward.`,
        `Your inaugural season is taking definitive shape—the early uncertainty has given way to clearer understanding of your capabilities and competitive identity.`,
        `Past the midpoint of your first season, you've accumulated enough races to see patterns emerging, to understand your level, to set realistic goals.`,
        `The first season is maturing alongside you—what started as pure novelty has become familiar territory, and you're racing with growing confidence.`,
        `Deep into your debut campaign now, you're no longer tentative—you know how to race, you know where you belong, and you're executing with purpose.`
      ];
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  
  // Multi-season career - reference current form and trajectory
  if (formTrend === 'hot-streak') {
    const options = [
      `Right now, you're riding a hot streak that's producing your best results—the form is there, the confidence is building, and the races are reflecting it.`,
      `This season has brought a surge in form that's delivering career-best performances—you're racing faster, finishing stronger, and everything's clicking.`,
      `The current campaign is proving to be a breakthrough: you're racing at a level you haven't quite reached before, and the results confirm it.`,
      `Form comes and goes in cycling, and right now you've got it—the recent races show a rider performing at their peak with results to match.`,
      `This season you've found something extra: wins, podiums, performances that suggest you've reached a new level in your development as a racer.`,
      `You're in the best form of your career this season, and the results reflect it—everything you've built across previous seasons is paying dividends now.`,
      `The current season represents a peak: recent results show you racing faster and smarter than ever, capitalizing on years of accumulated experience.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (formTrend === 'improving') {
    const options = [
      `This season shows clear improvement over previous campaigns—the trajectory points upward, with results getting better as fitness and experience compound.`,
      `You're racing better this season than last, and it shows in the results—steady improvement that suggests you haven't reached your ceiling yet.`,
      `The current season represents another step forward: better results than before, clear progression, evidence that continued development is happening.`,
      `This campaign has brought noticeable improvement—you're faster, racing smarter, and delivering better performances than in previous seasons.`,
      `Season-over-season growth continues: this year's results surpass last year's, demonstrating that you're still developing as a competitor.`,
      `You're on an upward path this season, with recent races showing improvement over earlier form—the development curve continues to trend positive.`,
      `This season's performances represent progress: you're building on previous experience, racing with more confidence, and seeing results improve accordingly.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (formTrend === 'consistent') {
    const options = [
      `This season continues the pattern of consistent performance—you're delivering the same reliable results, banking points steadily, maintaining your competitive standard.`,
      `The current campaign reflects familiar themes: consistent racing, steady points accumulation, the kind of reliable performance that defines your career.`,
      `This season looks much like previous ones: solid, steady, consistent racing that might not generate headlines but keeps you competitive and relevant.`,
      `You're maintaining your standard this season—not breakthrough performances, but not decline either, just reliable racing that delivers expected results.`,
      `The pattern continues this season: consistent top-ten finishes, steady point-scoring, the kind of dependable racing that's become your trademark.`,
      `This campaign has brought more of what defines you: consistent performances, reliable results, steady accumulation of points without dramatic peaks or valleys.`,
      `Another season of solid, consistent racing—you're delivering performances that match your capability without exceeding it or falling short of it.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (formTrend === 'declining') {
    const options = [
      `This season has been tougher than previous campaigns—results aren't quite matching past performances, and finding form has proven elusive.`,
      `The current season presents challenges: results lag behind previous standards, and recapturing earlier form has been harder than expected.`,
      `Recent races haven't quite delivered the results you've achieved before—this season has tested you in ways previous campaigns didn't.`,
      `Finding consistency this season has been difficult—results have varied more than usual, and matching previous performance levels remains a work in progress.`,
      `This campaign hasn't gone according to plan: previous seasons brought better results, and returning to that standard is proving challenging.`,
      `The current season has been a struggle compared to earlier campaigns—results don't quite match your capability, and form remains inconsistent.`,
      `Recent performances suggest you're working through a rough patch—this season hasn't produced the results that previous campaigns delivered.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Default/inconsistent form
  const options = [
    `This season has brought a mix of results: some strong performances proving your capability, others falling short, creating an inconsistent but intriguing picture.`,
    `The current campaign defies easy summary—brilliant one week, struggling the next, you're racing with variability that suggests untapped potential alongside persistent challenges.`,
    `Results this season have varied widely: occasional flashes of excellence mixed with disappointing performances, creating a season that's hard to define but easy to describe as inconsistent.`,
    `This season you've been unpredictable: great results followed by modest ones, strong races alongside tough days, consistency remaining elusive.`,
    `The current campaign has featured wild swings: excellent performances demonstrating your potential, followed by races that fall well short of that standard.`,
    `Finding consistency this season has been the challenge—when you're on form, results are excellent, but maintaining that level race after race remains difficult.`,
    `This season the results have ranged from impressive to disappointing, often within the same week—the capability is clearly there, but so is the inconsistency.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * SENTENCE 6: Forward-Looking - What's Ahead (7 variations)
 */
function getForwardLooking(careerStage, formTrend, performanceLevel, totalSeasons) {
  if (careerStage === 'rookie' || careerStage === 'first-season') {
    const options = [
      `The road ahead is long, and you're just getting started—future seasons will tell whether this first campaign was the beginning of something substantial or simply the start of a journey.`,
      `With so much racing still ahead, your first season is merely the foundation—what you build on it in seasons to come will define your career.`,
      `You're at the very beginning, and that's exciting: so many races ahead, so much room to improve, so many possibilities for where this career might lead.`,
      `The first season writes the opening chapter, but the story is just beginning—future seasons will add depth, context, and definition to your racing career.`,
      `Every great career starts somewhere, and this is your somewhere—what comes next depends on what you learn, how you adapt, and whether you keep showing up.`,
      `Your racing journey is in its infancy, which means potential remains largely untapped and the future unwritten—each upcoming season brings new opportunities.`,
      `This first season establishes a baseline, but the career arc remains to be determined—you could develop into anything from here with dedication and consistency.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'dominant' || performanceLevel === 'elite') {
    const options = [
      `The challenge ahead is maintaining this standard across future seasons—staying competitive as the field evolves, continuing to win as competition intensifies.`,
      `You've proven you can win, but careers are defined by sustained excellence—can you maintain this level season after season, year after year?`,
      `Future seasons will test whether this success is sustainable or if you've already reached your peak—either way, you've proven your capability at the highest level.`,
      `The bar is set high now: you're expected to contend for victories, and meeting those expectations consistently will define the next phase of your career.`,
      `With success comes pressure to repeat it—future seasons will reveal whether you can maintain this standard or if this represents a peak you'll struggle to match.`,
      `You've established yourself among the fastest riders—now the challenge is staying there as younger, hungrier competitors emerge in seasons ahead.`,
      `Success raises expectations: future seasons will judge you by the standard you've set, and meeting it consistently will separate good careers from great ones.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (formTrend === 'improving' || performanceLevel === 'developing') {
    const options = [
      `The trajectory suggests your best racing is still ahead—if improvement continues, future seasons could bring the breakthrough results you're building toward.`,
      `You're on an upward path, and if that continues, upcoming seasons could see you challenge for victories and establish yourself among the fastest riders.`,
      `The improvement arc points toward better results ahead—keep developing at this rate and future seasons could transform you from contender to champion.`,
      `Right now you're building toward something: future seasons will reveal whether this development leads to sustained success or if you've already found your competitive ceiling.`,
      `If recent trends continue, upcoming seasons could bring career-best performances—the foundation is being laid for potential breakthroughs ahead.`,
      `You haven't peaked yet—that much is clear from your trajectory. Future seasons will determine just how high that peak might be.`,
      `The career is still ascending: upcoming seasons offer opportunities to turn developing capability into sustained competitive success.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Default - veteran or steady state
  const options = [
    `Future seasons will add chapters to this career story—whether they bring continued success, new challenges, or surprising developments remains to be written.`,
    `The career continues forward: more races ahead, more seasons to compete, more opportunities to add to what you've already accomplished.`,
    `With multiple seasons behind you now, the future is less about potential and more about execution—can you maintain this standard and perhaps exceed it?`,
    `Upcoming seasons offer chances to build on what you've established—whether that means more of the same or something different entirely remains to be seen.`,
    `The racing journey continues: future seasons will bring new challenges, new opportunities, and perhaps new levels of performance yet to be discovered.`,
    `You've established your identity as a racer—now future seasons will determine whether you can elevate beyond that or if this represents your competitive ceiling.`,
    `What comes next is up to you: more seasons racing, more chances to improve, more opportunities to add notable results to an already substantial career.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateCareerSummary };
} else if (typeof window !== 'undefined') {
  window.careerSummaryGen = { generateCareerSummary };
}
