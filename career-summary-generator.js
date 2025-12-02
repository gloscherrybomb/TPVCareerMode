/**
 * Career Summary Generator - Full Version with 7 Variations
 * 
 * Generates personalized, dynamic career summary paragraphs
 * ~117,000 unique combinations through mix-and-match sentences
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

function getCareerStage(totalSeasons, totalStages) {
  if (totalSeasons === 1 && totalStages <= 3) return 'rookie';
  if (totalSeasons === 1) return 'first-season';
  if (totalSeasons === 2) return 'developing';
  if (totalSeasons <= 4) return 'experienced';
  return 'veteran';
}

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


// SENTENCE 1: Opening
function getOpeningSentence(careerStage, totalSeasons, totalStages) {
  const seasonWord = totalSeasons === 1 ? 'season' : 'seasons';
  const stageWord = totalStages === 1 ? 'stage' : 'stages';
  
  if (careerStage === 'rookie') {
    const options = [
      `Your TrainingPeaks Virtual career is just beginning, with ${totalStages} ${stageWord} completed and a future full of possibility ahead.`,
      `The journey starts here—${totalStages} ${stageWord} into your first season, laying the foundation for what's to come.`,
      `Every career has to start somewhere, and yours is ${totalStages} ${stageWord} old, still fresh but already starting to take shape.`,
      `You're in the early chapters of your racing story, with ${totalStages} ${stageWord} down and countless more ahead as you find your feet in the virtual peloton.`,
      `The beginning of any career is special, and you're ${totalStages} ${stageWord} into yours—learning, adapting, and discovering what kind of racer you'll become.`,
      `${totalStages} ${stageWord} completed, and the TrainingPeaks Virtual adventure has officially begun—every race teaching you something new about racing and yourself.`,
      `Fresh to the virtual racing scene with ${totalStages} ${stageWord} under your wheels, you're building the foundation of what could become something substantial.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'first-season') {
    const options = [
      `Your debut season has taken shape across ${totalStages} stages, establishing your presence in the TrainingPeaks Virtual peloton.`,
      `${totalStages} stages into your first season, you've begun to carve out an identity as a competitor who shows up and gets results.`,
      `The first season is where reputations are built, and across ${totalStages} stages you've been writing the opening chapter of yours.`,
      `One season deep now, with ${totalStages} stages completed and a racing identity starting to emerge from the accumulated experience.`,
      `Your inaugural campaign spans ${totalStages} stages so far—a debut season that's establishing who you are as a racer and what you're capable of achieving.`,
      `${totalStages} stages into your first season, you're no longer a complete unknown—the results are creating a profile, a reputation, a racing résumé.`,
      `The rookie season continues to unfold across ${totalStages} stages, each race adding another data point to the story of your emergence as a competitor.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'developing') {
    const options = [
      `Across ${totalSeasons} seasons and ${totalStages} stages, you've evolved from newcomer to established competitor, learning and improving with each race.`,
      `Your TrainingPeaks Virtual journey spans ${totalSeasons} seasons now—${totalStages} stages of racing that tell the story of a rider finding their place in the peloton.`,
      `Two seasons and ${totalStages} stages have shaped your racing career, each event adding another layer to your growing experience and capability.`,
      `${totalSeasons} seasons in, ${totalStages} stages completed, and you've transitioned from rookie to developing racer with an identity that's becoming clearer with every event.`,
      `The second season brings perspective—${totalStages} stages across ${totalSeasons} seasons have taught you what works, what doesn't, and what you need to improve.`,
      `Your career spans ${totalSeasons} seasons now, ${totalStages} stages of accumulated racing wisdom that separate you from the newcomers still finding their way.`,
      `With ${totalSeasons} seasons behind you covering ${totalStages} stages, you're building something substantial—a career with depth, experience, and a track record that matters.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (careerStage === 'experienced') {
    const options = [
      `${totalSeasons} seasons and ${totalStages} stages—those numbers represent a substantial career built on consistency, dedication, and accumulated racing wisdom.`,
      `You're no longer a newcomer. With ${totalSeasons} seasons behind you covering ${totalStages} stages, you've become a fixture in the virtual peloton with a reputation that precedes you.`,
      `The racing résumé speaks for itself: ${totalSeasons} seasons, ${totalStages} stages, countless battles won and lost, lessons learned, and a career that continues to evolve.`,
      `${totalSeasons} seasons deep and ${totalStages} stages completed—you've crossed the threshold from developing racer to experienced competitor who understands what it takes.`,
      `The numbers tell the story of commitment: ${totalSeasons} seasons, ${totalStages} stages, year after year of showing up and racing regardless of form or conditions.`,
      `Your TrainingPeaks Virtual career has substance now—${totalSeasons} seasons spanning ${totalStages} stages, a body of work that commands respect from the peloton.`,
      `With ${totalSeasons} seasons under your belt and ${totalStages} stages completed, you've earned your stripes as someone who's been there, done that, and knows the game.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // veteran
  const options = [
    `As a seasoned veteran with ${totalSeasons} seasons under your belt spanning ${totalStages} stages, you've seen it all—the highs, the lows, the dramatic finishes and the tough days where just finishing felt like victory.`,
    `${totalSeasons} seasons. ${totalStages} stages. You're one of the established names now, someone whose presence in a start list means something, whose career has weight and substance.`,
    `Your TrainingPeaks Virtual career has become something substantial—${totalSeasons} seasons deep, ${totalStages} stages completed, a body of work that tells the story of sustained commitment and competitive fire.`,
    `Few can claim ${totalSeasons} seasons and ${totalStages} stages of racing—you're in rare company as a veteran who's competed through multiple seasons, survived every challenge, and kept coming back.`,
    `${totalSeasons} seasons have passed, ${totalStages} stages have been completed, and you've evolved into one of the experienced heads in the virtual peloton—someone newer riders look to for wisdom.`,
    `The veteran status is earned, not given, and you've earned it across ${totalSeasons} seasons and ${totalStages} stages of racing that span victories, defeats, breakthroughs, and setbacks.`,
    `Your racing career is measured in years now—${totalSeasons} seasons comprising ${totalStages} stages, each contributing to a legacy built through consistent participation and competitive drive.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}


// SENTENCE 2: Results Summary (narrative-focused, minimal stats)
function getResultsSummary(performanceLevel) {
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


// SENTENCE 3: Signature Moment
function getSignatureMoment(careerBest, totalWins, totalPodiums, totalAwards, performanceLevel) {
  const hasCareerBest = careerBest.position && careerBest.eventName;
  
  if (performanceLevel === 'dominant' && totalWins >= 5) {
    const options = [
      `With multiple victories under your belt, it's hard to pick a single defining moment—but the sheer consistency of winning is perhaps the greatest achievement of all.`,
      `Victory has become almost expected rather than exceptional, and that dominance—that ability to win repeatedly across different events—is what sets you apart.`,
      `The highlight reel is long, filled with wins and dominant performances, each adding to a reputation built on sustained excellence rather than single moments.`,
      `Rather than one signature win, you have a collection of them—multiple victories that establish you as someone who knows how to cross the line first.`,
      `Your career defining achievement isn't a single race but a pattern: winning regularly, dominating consistently, and making victory look routine.`,
      `The best moment? Take your pick from multiple wins—each impressive, each meaningful, collectively defining you as one of the peloton's most successful racers.`,
      `With victories stacking up, the signature becomes the sustained excellence—race after race, season after season, winning when it matters and delivering when expectations are high.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (hasCareerBest && careerBest.position === 1) {
    const options = [
      `Your victory at ${careerBest.eventName} stands as a career highlight—a race where everything clicked, where the finish line couldn't come fast enough because you knew you had it won.`,
      `${careerBest.eventName} delivered your finest moment: crossing the line first, arms raised, the satisfaction of a victory that validated all the training and suffering.`,
      `The win at ${careerBest.eventName} will always hold special significance—proof that on your best day, you can beat anyone in the field.`,
      `${careerBest.eventName} belongs to you—that victory represents what's possible when fitness, form, and tactical execution all align perfectly.`,
      `When people ask about your career highlights, ${careerBest.eventName} comes immediately to mind—the day you proved you had what it takes to win at this level.`,
      `The ${careerBest.eventName} victory stands as the pinnacle so far: a perfect race, a decisive win, and validation of everything you've worked for.`,
      `${careerBest.eventName} gave you the win that every racer chases—that moment of crossing first, knowing you've beaten the field fair and square.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (hasCareerBest && careerBest.position <= 3) {
    const positionWord = careerBest.position === 2 ? 'second' : 'third';
    const options = [
      `Your ${positionWord}-place finish at ${careerBest.eventName} represents your career best—close enough to taste victory, proof that you can compete at the highest level.`,
      `${careerBest.eventName} brought your strongest result: ${positionWord} place and a spot on the podium, evidence of your capability when everything comes together.`,
      `The podium at ${careerBest.eventName} stands as a signature achievement—${positionWord} place in a competitive field, showing you belong among the fastest riders.`,
      `${careerBest.eventName} delivered your finest performance: a ${positionWord}-place finish that proved you have the speed to compete for wins when conditions align.`,
      `The ${positionWord} place at ${careerBest.eventName} remains your career highlight—so close to victory, yet a result that validates your ability to race at the front.`,
      `${careerBest.eventName} gave you a career-best ${positionWord} place—a podium finish that showed what you're capable of on your very best days.`,
      `Your standout result came at ${careerBest.eventName} where ${positionWord} place put you on the podium and proved you can run with the fastest in the field.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (totalAwards >= 5) {
    const options = [
      `The trophy cabinet tells its own story—${totalAwards} awards earned through various achievements, each representing a moment where you exceeded expectations or delivered something special.`,
      `You've collected ${totalAwards} awards across your career, badges of honor that mark breakthrough performances, tactical masterclasses, and days when everything clicked.`,
      `${totalAwards} awards accumulated—some for beating predictions, others for special performances, all proof that you've had moments of brilliance scattered throughout your career.`,
      `The ${totalAwards} awards you've earned tell the story better than any single result: multiple achievements, various successes, a career punctuated by moments of excellence.`,
      `Rather than one defining race, your career is marked by ${totalAwards} awards—each earned, each meaningful, collectively painting a picture of sustained competitiveness.`,
      `${totalAwards} awards sit on the shelf, each one commemorating a special performance, a prediction shattered, or a day when you showed what you're truly capable of.`,
      `Your signature isn't a single moment but a collection: ${totalAwards} awards earned through breakthrough rides, tactical wins, and performances that exceeded all expectations.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (totalPodiums >= 1) {
    const podiumWord = totalPodiums === 1 ? 'podium finish' : 'podium finishes';
    const options = [
      `Your ${totalPodiums} ${podiumWord} represent the high points—days when you had the legs, made the right moves, and finished among the strongest riders in the race.`,
      `The ${podiumWord} (${totalPodiums} so far) stand out as proof of your potential—evidence that on your best days, you're as fast as anyone in the field.`,
      `${totalPodiums} ${podiumWord} mark the moments when everything came together, when you proved you could compete with and beat the strongest competitors.`,
      `Your career peaks are defined by ${totalPodiums} ${podiumWord}—races where you delivered your absolute best and earned a place among the day's fastest riders.`,
      `The ${totalPodiums} ${podiumWord} you've achieved represent breakthrough moments: days when potential became reality and you stood among the winners.`,
      `When you look back on your career highlights, ${totalPodiums} ${podiumWord} stand out—proof that you have the capability to race at the front when form and fitness align.`,
      `${totalPodiums} trips to the podium define your finest moments—each one earned through strong legs, smart tactics, and the determination to fight for every position.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // No major achievements yet
  const options = [
    `The breakthrough moment is still ahead, but you're building toward it with each race, each experience, each lesson learned in the heat of competition.`,
    `Career-defining performances take time to arrive, and you're in the process of developing the fitness and race craft needed to deliver them.`,
    `Every career needs its signature moment, and yours is still being written—the foundation is being laid for something memorable to come.`,
    `The highlight reel is still being compiled, but that's okay—not every career starts with fireworks, and patient development often leads to the most satisfying breakthroughs.`,
    `Your defining achievement hasn't arrived yet, but the groundwork is being laid: the experience is accumulating, the fitness is developing, and the moment will come.`,
    `Some careers start with immediate success; yours is building more gradually—but that just means the breakthrough, when it comes, will be even more satisfying.`,
    `The signature win or standout result is still out there waiting for you, and every race brings you closer to that moment when everything finally clicks into place.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}


// SENTENCE 4: Racing Identity
function getRacingIdentitySentence(racingIdentity, performanceLevel, totalSeasons) {
  if (racingIdentity === 'win-or-bust') {
    const options = [
      `You race to win, not to accumulate mid-pack finishes—it's victory or nothing, an approach that's delivered triumphs but also taught hard lessons about the fine margins at the front.`,
      `Your racing style is aggressive and uncompromising: when you're in form, you attack for the win, and when you're not, you'd rather fight for victory and finish tenth than settle for a safe fifth.`,
      `Conservative racing isn't your style—you're a rider who commits fully to winning attempts, accepting the risks that come with racing at the sharp end.`,
      `The all-or-nothing approach defines you: targeting victories, taking risks, and accepting that some days you'll crash out of contention chasing a win others might not dare attempt.`,
      `You're not interested in consistent top-tens—you're interested in winning, and that mentality means some spectacular victories and some equally spectacular failures.`,
      `Your racing philosophy is simple: go for the win, commit everything, and let the results fall where they may—it's high-risk, high-reward racing at its purest.`,
      `Safe racing doesn't produce wins, and you've never been interested in safe—you race to win, period, and that aggressive mentality defines every start list you join.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'podium-hunter') {
    const options = [
      `You've developed into a podium specialist—someone who consistently finishes in the top three, who knows how to position for the finale, who has the tactical sense to be there when it matters.`,
      `The podium is your natural habitat—not always winning, but always in contention, always finishing among the fastest riders, always a threat for the top spots.`,
      `Your identity is clear: podium hunter. You race smart, finish strong, and consistently end up in that elite group of the day's best performers.`,
      `Top-three finishes have become your signature—you've mastered the art of being there at the end, of making the podium regularly even when outright victory isn't available.`,
      `You're known as someone who podiums consistently rather than wins occasionally—a distinction that speaks to reliability, tactical awareness, and sustained high-level performance.`,
      `The podium shots are filling up your photo collection—you've become one of those riders who's always there or thereabouts, always a factor in the final shake-out.`,
      `Your racing produces podiums with impressive regularity—not through occasional brilliance but through consistent competitiveness, smart positioning, and knowing how to finish races properly.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'consistent-scorer') {
    const options = [
      `Consistency defines your racing—you're the rider who shows up week after week, finishes in the top ten, banks points, and builds a career on reliability rather than spectacular one-offs.`,
      `You've become known as a consistent points scorer: not the flashiest racer, not the most aggressive, but someone who finishes every race in respectable position and accumulates results methodically.`,
      `Your strength is reliability—race after race, you deliver solid top-ten finishes, proving that consistency over time beats occasional brilliance followed by mediocrity.`,
      `You're a steady accumulator of points and results, the kind of rider whose season totals surprise people because you're quietly banking top-tens while others chase glory inconsistently.`,
      `The racing identity is clear: consistent competitor who rarely has a bad day, rarely finishes outside the top ten, and builds standings position through reliable performance.`,
      `You've mastered the art of consistent racing—showing up with good form, executing the race plan, finishing in the top group, and repeating the process week after week.`,
      `Your racing produces steady returns rather than spectacular peaks and valleys—top-ten finish after top-ten finish, points accumulating, a career built on dependability.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'tactical') {
    const options = [
      `You race with your head as much as your legs—tactical awareness, smart positioning, and race craft have delivered podiums that raw power alone couldn't achieve.`,
      `Your strength is tactical racing: reading the race, being in the right place at the right time, and knowing when to commit your effort for maximum effect.`,
      `You've proven that tactics matter—your results come from smart racing, positioning wisdom, and the ability to maximize your capabilities through intelligent race management.`,
      `The tactical racer's approach defines you: not always the fastest, but often the smartest, using positioning and race awareness to compete with and beat faster riders.`,
      `Your racing identity is built on tactical intelligence—knowing when to attack, when to cover, when to conserve, and when to empty the tank for the sprint.`,
      `You win races with tactics as much as watts—smart positioning, well-timed moves, and race craft that turns good form into great results.`,
      `The cerebral approach defines your racing: studying courses, understanding competitors, positioning strategically, and using tactical intelligence to punch above your power numbers.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (racingIdentity === 'improving') {
    const options = [
      `Your racing trajectory points upward—each season sees improvement, each month brings better results, and the trend line suggests your best racing is still ahead.`,
      `Improvement defines your career arc: results getting better, form building, confidence growing, and clear evidence that you're developing into a stronger competitor.`,
      `You're on an upward path—the recent results are better than the early ones, the current season is stronger than previous ones, and everything suggests continued development.`,
      `The improving racer's mentality drives you: each setback is a lesson, each result is a data point, each season is a step toward realizing your full potential.`,
      `Your career tells a story of development: starting cautiously, building experience, improving steadily, and showing clear signs that your best performances are still to come.`,
      `Progression defines you—not yet at your peak, but climbing steadily toward it, getting faster and smarter with each passing month of racing.`,
      `You're a work in progress in the best sense: improving consistently, learning continuously, and showing all the signs of a rider who hasn't reached their ceiling yet.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // battler
  const options = [
    `You're a battler—someone who shows up regardless of form, fights through tough days, and earns every result through determination and refusal to quit.`,
    `The racing hasn't been easy, but you keep showing up—that persistence, that refusal to give up, defines you more than any single result could.`,
    `You race with heart more than exceptional talent, and there's honor in that: showing up, fighting through, earning whatever results you can through sheer determination.`,
    `Your identity is the persistent competitor: not the fastest, not the strongest, but present at every start line and willing to fight for every position.`,
    `You've learned that racing is as much about character as capability—and your willingness to keep competing, keep trying, keep showing up speaks volumes about both.`,
    `The battler's mentality defines you: tough days don't stop you, poor results don't discourage you, and every race is another chance to prove something to yourself.`,
    `You race because you love racing, not because it's easy—and that pure competitive spirit, that willingness to face challenges head-on, is what defines your career.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}


// SENTENCE 5: Current Season Context
function getCurrentSeasonContext(totalSeasons, currentSeasonStages, currentSeasonPoints, currentSeasonWins, currentSeasonPodiums, formTrend, performanceLevel) {
  if (totalSeasons === 1) {
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
        `Mid-season in your first year, you're finding your rhythm: the early uncertainty giving way to growing confidence and stronger performances.`,
        `Your inaugural campaign continues to build momentum—each race adding to your understanding, each result contributing to your development as a competitor.`,
        `The first season is progressing well, and you're no longer the wide-eyed rookie—you're starting to understand the game and play it effectively.`,
        `Season one rolls on, and you're gaining ground: more experienced than when you started, more confident in your abilities, more capable with each outing.`,
        `As the debut season advances, you're transitioning from learner to legitimate competitor, with each race reinforcing what you're capable of achieving.`
      ];
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  
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
      `The current season shows the same steady competitiveness that characterizes your career—you're not reinventing yourself, just doing what you do reliably.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Default/declining/inconsistent
  const options = [
    `This season continues to build your racing story, with each event adding another chapter to your developing career.`,
    `The current campaign has its challenges, but you're still racing, still competing, still adding to the experience that builds careers.`,
    `This season brings its own lessons and challenges—not every campaign goes perfectly, and navigating tough stretches builds character and resilience.`,
    `You're working through this season's challenges, banking what results you can, and learning from every race regardless of the outcome.`,
    `The current season may not be your strongest, but you're still out there racing—that commitment matters more than people sometimes realize.`,
    `This campaign has had its ups and downs, but you're still in the fight, still turning up, still pushing yourself to compete.`,
    `The season continues, and so does your racing—some campaigns are harder than others, but showing up consistently is its own achievement.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// SENTENCE 6: Forward-Looking
function getForwardLooking(careerStage, formTrend, performanceLevel, totalSeasons) {
  if (careerStage === 'rookie' || totalSeasons === 1) {
    const options = [
      `The beginning of any career is about learning, improving, and building toward something—and right now, you're doing exactly that, with your best performances still ahead of you.`,
      `First seasons are about discovery and development, and yours is unfolding exactly as it should: experience accumulating, lessons learned, foundation being built.`,
      `You're at the start of what could be a long racing journey—right now it's about establishing yourself, learning the craft, and preparing for stronger seasons to come.`,
      `Every great career starts somewhere, and you're in those crucial early stages where patience, persistence, and steady improvement set up future success.`,
      `The foundation is being laid this season—future campaigns will build on what you're learning now, what you're experiencing now, what you're becoming now.`,
      `This is just the beginning: the experience gained this season will pay dividends in races to come, when today's lessons become tomorrow's competitive advantages.`,
      `First seasons aren't about perfection, they're about progress—and you're progressing, which means the best racing is still ahead of you.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (performanceLevel === 'dominant' || performanceLevel === 'elite') {
    const options = [
      `You're entering the prime of your racing career—the experience is there, the results are coming, and the trajectory suggests you're only going to get stronger from here.`,
      `Success breeds confidence, and you've got both now—future seasons should bring more of what's working, refinements to what's already strong, continued excellence.`,
      `You've established yourself at the top level, and maintaining that position becomes the challenge: staying hungry, staying sharp, staying ahead of emerging competitors.`,
      `The racing journey continues from a position of strength—you've proven what you can do, now it's about sustaining it, building on it, perhaps taking it even higher.`,
      `Future seasons will test whether this success is sustainable or if you've already reached your peak—either way, you've proven your capability at the highest level.`,
      `The bar is set high now: you're expected to contend for victories, and meeting those expectations consistently will define the next phase of your career.`,
      `With success comes pressure to repeat it—future seasons will reveal whether you can maintain this standard or if this represents a peak you'll struggle to match.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (formTrend === 'improving') {
    const options = [
      `The improvement curve suggests your best racing is still ahead—keep developing, keep learning, and see where this upward trajectory leads.`,
      `You're getting better, and that's what matters most—future seasons should bring continued improvement if you maintain this development pattern.`,
      `The trajectory is upward, which means exciting times lie ahead: faster racing, stronger results, the satisfaction of watching potential become reality.`,
      `Improvement takes time, and you're on the right path—the racing ahead should bring new personal bests, breakthrough performances, validation of your development.`,
      `You're climbing steadily toward your peak, and when you reach it, the results could be special—for now, enjoy the process of getting faster and stronger.`,
      `The future looks bright when you're improving—each season should bring you closer to your ceiling, each race teaching lessons that make the next one better.`,
      `Keep doing what you're doing: the improvement is real, the progress is visible, and future seasons should reveal what you're truly capable of achieving.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Default forward-looking
  const options = [
    `The racing journey continues: future seasons will bring new challenges, new opportunities, and perhaps new levels of performance yet to be discovered.`,
    `What comes next remains unwritten—more racing, more experiences, more chances to add to a career that's still being built race by race.`,
    `Future seasons await, full of possibility: maybe breakthrough results, maybe steady progression, definitely more racing and more stories to tell.`,
    `The career continues forward, one season at a time, one race at a time, with the future still full of potential waiting to be unlocked.`,
    `Upcoming seasons offer chances to build on what you've established—whether that means more of the same or something different entirely remains to be seen.`,
    `You've established your identity as a racer—now future seasons will determine whether you can elevate beyond that or if this represents your competitive ceiling.`,
    `What comes next is up to you: more seasons racing, more chances to improve, more opportunities to add notable results to an already substantial career.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateCareerSummary };
} else if (typeof window !== 'undefined') {
  window.careerSummaryGen = { generateCareerSummary };
}

