// narrative-database-mega.js - 277+ story elements for maximum variety (UPDATED v2.1)
// Comprehensive narrative moments database - MERGED VERSION WITH NEW ADDITIONS

/**
 * MEGA NARRATIVE DATABASE - 277 Story Moments (Updated from 247)
 * 
 * This is the complete merged database containing all stories from the original
 * narrative-database-expanded.js and narrative-database-extension.js,
 * PLUS 44 new race-type specific narratives added in v2.0,
 * PLUS 30 new season context closing narratives added in v2.1
 * 
 * Original Categories (203 stories):
 * - seasonOpening: Season 1 opening narratives (10 stories)
 * - earlyCareer: Events 1-5 story moments (25 stories)
 * - midSeason: Events 6-10 story moments (25 stories)
 * - lateSeasonIntros: Events 11-15 intro moments (12 stories)
 * - equipment: Bike/gear stories (20 stories)
 * - lifestyle: Daily life, training, struggles (20 stories)
 * - offSeason: Winter training, preparation (10 stories)
 * - motivation: Inspiration moments (15 stories)
 * - breakthrough: Key performance moments (12 stories)
 * - setback: Dealing with disappointment (15 stories)
 * - rivalry: Interactions with competitors (12 stories)
 * - localColor: Race location/venue details (12 stories)
 * - weather: Conditions and elements (10 stories)
 * - travel: Getting to races (8 stories)
 * - mentalGame: Psychology and mindset (12 stories)
 * - nutrition: Food and fueling (8 stories)
 * - recovery: Rest and adaptation (8 stories)
 * - community: Social aspects of racing (10 stories)
 * - learning: Skill development (12 stories)
 * 
 * NEW Categories v2.0 (44 stories):
 * - stageRacePrep: Pre-stage race specific moments (10 stories)
 * - stagingStruggle: Multi-day racing challenges (10 stories)
 * - gcBattle: General classification focused moments (10 stories)
 * - timeTrialMindset: TT-specific psychology (8 stories)
 * - trackRacing: Velodrome specific moments (6 stories)
 * 
 * NEW Categories v2.1 (30 stories):
 * - seasonContextClosing: Varied season context closing lines (30 stories)
 *   - Winning streak closings (5)
 *   - Good form closings (6)
 *   - Early season closings (5)
 *   - Mid season closings (4)
 *   - Late season closings (5)
 *   - Struggling form closings (5)
 * 
 * TOTAL: 277 unique story moments
 * 
 * VERSION: 2.1 - December 2024
 * - Added race-type specific narratives (v2.0)
 * - Enhanced stage racing context (v2.0)
 * - Time trial and track racing psychology (v2.0)
 * - GC battle moments (v2.0)
 * - Contextual season closing variety (v2.1) ⭐ NEW
 */

const NARRATIVE_DATABASE = {

  // ===== SEASONOPENING =====
  seasonOpening: [
    {
      id: "opening_hometown",
      text: "Six months ago you were racing your local club rides, wondering if you had what it takes to compete at a higher level. Now you're lined up at {eventName}, registration paid, race number pinned on, heart pounding with a mixture of excitement and pure terror. The riders around you look fast—lean, confident, decked out in team kit that probably costs more than your entire bike. You've trained for this, visualized this, dreamed about this moment. But standing here in the pre-race churn of nervous energy and racing bikes, the reality hits differently than the fantasy.",
      triggers: { raceNumber: 1 },
      weight: 0.9
    },
    {
      id: "opening_leap",
      text: "The decision to race seriously didn't come gradually—it came all at once, late one night scrolling through race results and realizing you'd been making excuses for too long. A few weeks later you registered for {eventName}, paid the entry fee before you could change your mind, and committed to showing up no matter how intimidating it felt. Your bike isn't the newest model and your kit doesn't match, but you've put in the training miles. You've done the intervals until your legs burned and your lungs screamed.",
      triggers: { raceNumber: 1 },
      weight: 0.9
    },
    {
      id: "opening_investment",
      text: "The registration fee for {eventName} felt steep—money you could've spent on anything else. But you clicked 'confirm payment' anyway because something inside you needed to know if you could actually do this. The weeks of training that followed were harder than expected: early morning rides when the bed felt impossibly comfortable, interval sessions that left you gasping, nights falling asleep wondering if you were good enough. But you showed up, week after week, and now here you are at the start line.",
      triggers: { raceNumber: 1 },
      weight: 0.9
    },
    {
      id: "opening_dream",
      text: "You've been dreaming about this for longer than you'd admit out loud. Watching races online, studying the tactics, imagining yourself in the peloton. Now the imagination becomes reality at {eventName}. The nerves are almost overwhelming—what if you get dropped immediately? What if you can't keep up? What if this whole dream was just that, a dream? But you're here. The start line doesn't care about your doubts. It only cares if you're willing to race.",
      triggers: { raceNumber: 1 },
      weight: 0.8
    },
    {
      id: "opening_transformation",
      text: "Three months ago, racing wasn't even on your radar. Then a friend invited you to a group ride that turned competitive, and something clicked. The feeling of pushing hard, of testing yourself against others, of finding out what you're really capable of—it was addictive. One thing led to another, and now you're at {eventName}, about to race for real. You're not sure if you're ready, but you're done wondering. Time to find out.",
      triggers: { raceNumber: 1 },
      weight: 0.8
    },
    {
      id: "opening_solo_journey",
      text: "Nobody in your life really understands why you're doing this. Your friends think you're crazy for spending money on entry fees and equipment. Your family worries about you getting hurt. But this isn't about them—it's about you, testing yourself, proving something to yourself. Standing at the start of {eventName}, surrounded by strangers who share this inexplicable need to race bicycles, you feel less alone than you have in months.",
      triggers: { raceNumber: 1 },
      weight: 0.7
    },
    {
      id: "opening_second_chance",
      text: "You tried racing years ago and it didn't work out. Life got in the way, motivation faded, other priorities took over. But something kept nagging at you—unfinished business, potential unrealized. Now you're back at {eventName}, older but maybe wiser, giving yourself a second chance to see what you're really made of.",
      triggers: { raceNumber: 1 },
      weight: 0.7
    },
    {
      id: "opening_lockdown_inspiration",
      text: "The pandemic changed something in you. All those months of indoor training, watching pro races, having nothing but time to think about what you really wanted to do. When the world opened back up, you didn't want to go back to normal—you wanted to actually race. Now here you are at {eventName}, turning pandemic dreams into reality.",
      triggers: { raceNumber: 1 },
      weight: 0.6
    },
    {
      id: "opening_bucket_list",
      text: "Racing has been on your bucket list for as long as you can remember. Not someday—today. Not eventually—now. {eventName} is where you cross this off the list, where you stop talking about racing and actually do it. The time for hypotheticals is over.",
      triggers: { raceNumber: 1 },
      weight: 0.6
    },
    {
      id: "opening_proving_ground",
      text: "You've been the fastest in your friend group for years, winning unofficial sprints, crushing group ride KOMs. But that's not real racing. {eventName} is where you find out if that local dominance translates to actual competitive ability. Time to see if you're actually fast or just fast compared to your friends.",
      triggers: { raceNumber: 1 },
      weight: 0.7
    }
  ],

  // ===== EARLYCAREER =====
  earlyCareer: [
    {
      id: "early_bike_struggles",
      text: "Your bike isn't the problem—you keep telling yourself that as you pass another rider on a carbon race machine that costs more than your car. It's not about the equipment, it's about the legs. At least that's what you're choosing to believe right now as your aluminum frame clatters over rough pavement while the rider ahead seems to float effortlessly on electronic shifting.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["midpack", "back"] },
      weight: 0.7
    },
    {
      id: "early_race_day_routine",
      text: "You're still figuring out your pre-race routine. Coffee? No coffee? Eat two hours before or three? You watch other riders going through their warm-up routines with practiced ease—static stretches, a few openers on the trainer, calves perfectly taped—while you're still anxiously checking your tire pressure for the third time.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "early_first_upgrade",
      text: "After weeks of researching and comparing prices, you finally pulled the trigger: new wheels. Not the top-tier carbon dream wheels, but a solid mid-range upgrade that represents a serious chunk of your budget. When you first spun them up, the difference was immediately noticeable—smoother, faster, more responsive. Whether they'll actually make you faster in races remains to be seen, but psychologically, they've already paid dividends.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["top10", "podium", "win"] },
      weight: 0.5
    },
    {
      id: "early_nutrition_learning",
      text: "You bonked hard in your last race—that terrible, empty-tank feeling where your legs just stop responding. Turns out racing requires a completely different fueling strategy than training rides. Now you're carrying gels, bars, and sports drink, maybe too much of everything, paranoid about running out of energy again.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["back"], minRacesCompleted: 2 },
      weight: 0.6
    },
    {
      id: "early_first_good_result",
      text: "Something clicked in that last race—you're not entirely sure what. Maybe it was better positioning, maybe you're finally getting fitter, maybe you just got lucky with the break. Whatever it was, you finished higher than you expected, higher than you dared hope, and suddenly this whole racing thing feels possible.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["podium", "top10"], improvementFromPrediction: 5, minRacesCompleted: 2 },
      weight: 0.8
    },
    {
      id: "early_imposter_syndrome",
      text: "Every race, you feel like someone's going to tap you on the shoulder and tell you that you don't belong here. That feeling of being an imposter never quite goes away, even when your results say otherwise. You look at the riders around you and assume they all know something you don't, have some secret knowledge that makes racing easier for them.",
      triggers: { raceNumber: [2, 3, 4, 5], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "early_learning_positioning",
      text: "You're starting to understand that where you are in the pack matters almost as much as how strong your legs are. Last race you wasted so much energy fighting for position, surging and braking, stuck in bad spots. This time you're more aware, more deliberate about where you place yourself before key moments.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["top10", "podium"], minRacesCompleted: 2 },
      weight: 0.7
    },
    {
      id: "early_mechanical_lesson",
      text: "A dropped chain two races ago taught you a valuable lesson: check everything, twice. Now your pre-race ritual includes running through gears multiple times, checking brake pad clearance, testing quick releases. It feels obsessive, but one mechanical DNF was enough to make you paranoid about equipment failure.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"], minRacesCompleted: 3 },
      weight: 0.5
    },
    {
      id: "early_pacing_discovery",
      text: "You went out too hard in the first few races, burning matches you'd need later. Now you're learning the art of patience—staying near the front without actually working, following the right wheels, conserving energy for when it actually matters. It's a harder skill than it looks.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["top10", "podium", "win"], minRacesCompleted: 3 },
      weight: 0.6
    },
    {
      id: "early_kit_pride",
      text: "You finally invested in proper racing kit—not team issue, just quality shorts and a jersey that actually fit. It's a small thing, but pulling on that kit this morning, you felt more legitimate. More like someone who takes this seriously. Clothes don't make the racer, but they don't hurt confidence either.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "early_recovery_awareness",
      text: "The soreness from your last race lingered longer than expected. Your legs felt heavy, your motivation low. You're learning that recovery is part of training, that showing up race after race without proper rest is a recipe for burnout. Now you're paying attention to sleep, nutrition, and giving your body time to adapt.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"], minRacesCompleted: 2 },
      weight: 0.5
    },
    {
      id: "early_group_ride_confidence",
      text: "The local group rides that used to intimidate you now feel manageable. You can hang with the front group, cover attacks, even throw in a dig occasionally. That confidence is translating to races—you're not intimidated by speed anymore.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["top10", "podium", "win"] },
      weight: 0.6
    },
    {
      id: "early_race_face",
      text: "You've started recognizing the same faces at races. There's the rider who always attacks early, the one who never pulls through, the cagey veteran who seems to win without ever looking like they're trying. You're learning their habits, their tells, becoming part of this community of racers.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "early_suffering_acceptance",
      text: "Racing hurts. That shouldn't have been surprising, but the first few times that deep, lung-burning, leg-screaming suffering hit, it was almost overwhelming. Now you're learning to accept it, even embrace it. The pain means you're going hard enough. The pain means you're racing.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "early_tactical_awakening",
      text: "You used to think racing was just about being the strongest. Then you watched a rider half your power output beat you through better tactics—sitting in, conserving energy, attacking at exactly the right moment. Now you're studying race tactics like you're cramming for an exam, learning that bike racing is as much chess as it is physical.",
      triggers: { raceNumber: [4, 5], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "early_bike_handling",
      text: "Your bike handling skills were adequate for training rides but woefully inadequate for pack racing. The first time someone's elbow touched yours at 30mph, you nearly crashed from panic. Now you're practicing cornering, bumping shoulders with friends, learning to ride confidently inches from other wheels.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "early_registration_anxiety",
      text: "Every time you click 'register' for a race, there's that moment of anxiety. What if you can't finish? What if you embarrass yourself? What if you're not ready? But you keep clicking anyway, because the only way to get ready is to race, and the only way forward is through the fear.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "early_course_preview",
      text: "You spent hours studying the course profile online, watching videos from previous years, memorizing every turn. That preparation gave you confidence, but it also revealed how much you didn't know about course reading and terrain analysis. There's a difference between knowing the course and knowing how to race it.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "early_results_obsession",
      text: "You check race results compulsively now. Not just your own—everyone's. Where you placed relative to predictions, how the top finishers did, who's trending up. You're building a mental database of who's fast, who's consistent, who you need to watch. It's probably excessive, but knowledge is power.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "early_photo_finish",
      text: "The finish line photo from your last race revealed something interesting: you were sitting up, celebrating too early, while riders behind were still sprinting. That mistake probably cost you two or three places. Now you're committed to sprinting through the line, every single time, no matter what.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["midpack"], minRacesCompleted: 2 },
      weight: 0.5
    },
    {
      id: "early_cadence_lesson",
      text: "You've been grinding big gears at low cadence because it felt powerful. Then someone pointed out that the fast riders all spin faster, keeping their legs fresh, maximizing efficiency. Now you're working on cadence drills, learning to spin smoothly at 90-95 rpm even when it feels unnatural.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "early_drafting_discovery",
      text: "The first time you properly drafted in a pack, you couldn't believe the difference. 30% less effort for the same speed felt like cheating. Now you understand why positioning matters so much—good wheels save watts, bad wheels waste them. You're learning to find the sweet spots.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "early_attack_response",
      text: "When attacks went in your first few races, you either chased too hard or didn't chase at all. Now you're learning to gauge threats—which moves are dangerous, which will come back, when to expend energy and when to let it go. Race intelligence is developing slowly but surely.",
      triggers: { raceNumber: [4, 5], performanceTier: ["top10", "podium"] },
      weight: 0.6
    },
    {
      id: "early_numbers_pinning",
      text: "You've developed a specific ritual for pinning race numbers—fold the edges just so, four pins exactly placed, centered and wrinkle-free. It's superstitious and probably silly, but having a pre-race ritual helps calm the nerves. Besides, you've seen pros obsess over weirder things.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "early_post_race_analysis",
      text: "You've started doing post-race debriefs with yourself. What went right, what went wrong, where you made mistakes, where you got lucky. Writing it down helps cement the lessons, turns raw experience into actual learning. Your racing journal is becoming one of your most valuable training tools.",
      triggers: { raceNumber: [4, 5], performanceTier: ["any"] },
      weight: 0.5
    }
  ],

  // ===== MIDSEASON =====
  midSeason: [
    {
      id: "mid_confidence_building",
      text: "The pack dynamics are starting to make sense now. You can read moves before they happen, anticipate attacks, find the right wheels to follow. What felt like chaos a few races ago now has patterns, rhythms, logic. You're not just surviving in the peloton anymore—you're racing with intent.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["top10", "podium"], consecutiveGoodResults: 2 },
      weight: 0.7
    },
    {
      id: "mid_equipment_upgrade",
      text: "The new bike arrived this week—a proper race machine, not just an upgraded version of your old setup but a completely different category of equipment. Carbon frame, electronic shifting, integrated cockpit, the works. It represents months of saving, of choosing to skip other expenses, of committing fully to this racing thing.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["win", "podium"], totalPoints: 100 },
      weight: 0.6
    },
    {
      id: "mid_training_dedication",
      text: "The off-bike training has become as important as the riding itself. You've set up a corner of your place as a makeshift gym: yoga mat, resistance bands, foam roller, a set of dumbbells picked up secondhand. Core work three times a week, mobility sessions, strength training focused on the posterior chain.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "mid_financial_reality",
      text: "Racing isn't cheap, and the costs add up faster than you anticipated: entry fees, equipment, travel, food, the endless small expenses that weren't part of the original budget. You've started packing your own race-day meals, driving instead of flying when possible, researching every discount and deal available.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["midpack", "back"] },
      weight: 0.6
    },
    {
      id: "mid_rival_emergence",
      text: "There's a rider you keep seeing in results, someone racing a similar schedule who seems to be on a similar trajectory. You've never spoken, barely made eye contact, but you track their results obsessively. When they finish ahead of you, it stings more than it should. When you beat them, the satisfaction is disproportionate.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["top10", "podium"] },
      weight: 0.7
    },
    {
      id: "mid_power_meter_insight",
      text: "You finally got a power meter, and the data is both enlightening and humbling. Those efforts that felt hard? Turns out you were barely above threshold. The intervals you thought were maximal? You had way more to give. Now you're training with numbers, and the numbers don't lie about your limits.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "mid_sprint_development",
      text: "You've been working on your sprint—not just raw power, but timing, positioning, reading the final kilometers. In training, you practice launching at exactly the right moment, staying seated for maximum watts, throwing the bike at the line. All for those crucial seconds that separate winners from also-rans.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["win", "podium", "top10"] },
      weight: 0.6
    },
    {
      id: "mid_climbing_focus",
      text: "Hills have become your focus. You've been hitting every climb in your area repeatedly, working on sustained power, learning to suffer efficiently uphill. Your power-to-weight ratio is improving, and you're starting to look forward to races with elevation rather than dreading them.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["top10", "podium"] },
      weight: 0.5
    },
    {
      id: "mid_race_craft",
      text: "You're developing race craft—those subtle skills that separate experienced racers from strong riders. How to shelter from the wind without being obvious. When to close gaps and when to let them go. Reading body language to anticipate attacks. It's an education you can only get through racing.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["top10", "podium", "win"] },
      weight: 0.7
    },
    {
      id: "mid_consistency_pride",
      text: "You're building a reputation for consistency. Not the flashiest rider, not the strongest on any given day, but always there, always competitive, always finishing in the points. That reliability matters more than occasional brilliance, and you're starting to embrace being the steady, dependable competitor.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["top10", "podium"], consecutiveGoodResults: 3 },
      weight: 0.7
    },
    {
      id: "mid_nutrition_mastery",
      text: "You've dialed in your race nutrition to a science. Exactly 60 grams of carbs per hour, starting 30 minutes in, alternating between gels and bars. Water every 15 minutes. Electrolytes when it's hot. The bonk from early in the season feels like a distant memory—now you're fueling like a pro.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mid_team_consideration",
      text: "A local team has been watching your results, and there's been talk of you joining for next season. It's flattering and terrifying in equal measure. Team racing means obligations, tactics, racing for someone else sometimes. But it also means support, equipment deals, a sense of belonging.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["win", "podium"], totalPoints: 150 },
      weight: 0.6
    },
    {
      id: "mid_weather_toughness",
      text: "You've raced in the rain now, in wind, in heat that made you question your sanity. Each one taught you something—how your tires handle on wet corners, how to stay fueled when it's too hot to want to eat, how to position yourself to use crosswinds to your advantage. You're becoming an all-conditions racer.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "mid_experience_advantage",
      text: "The newer racers at the startline look at you differently now. You've been doing this long enough that you're no longer the nervous newbie. You know the courses, you recognize the officials, you understand the unwritten rules. That experience is its own form of strength.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "mid_photo_analysis",
      text: "You've been studying finish photos and race footage obsessively, analyzing your position in the pack, your body language, when you were on the wrong wheel. Every image is a lesson in what you did right and what you need to fix. The attention to detail is paying off.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["top10", "podium", "win"] },
      weight: 0.5
    },
    {
      id: "mid_interval_evolution",
      text: "Your interval sessions have evolved dramatically. What used to be generic 'go hard for a while' efforts are now precisely structured workouts: VO2 max intervals, threshold repeats, sprint power development. You're training smarter, not just harder, and the results are showing in races.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["top10", "podium", "win"] },
      weight: 0.5
    },
    {
      id: "mid_cornering_confidence",
      text: "Your cornering has improved dramatically. You used to brake way too early, losing positions in every turn. Now you're carrying more speed, taking better lines, even gaining places through technical sections. The confidence to trust your tires at speed changes everything.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["top10", "podium"] },
      weight: 0.5
    },
    {
      id: "mid_race_day_ritual",
      text: "Your race day routine is now finely tuned. Wake at a specific time, same breakfast, same warm-up protocol, same mental preparation. The ritual reduces variables, minimizes anxiety, lets you focus on the racing itself rather than the logistics. Consistency breeds performance.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mid_breakaway_participation",
      text: "You've started making it into breakaways—not just covering moves, but initiating them. The calculated risk of going off the front, the cooperation with strangers, the math of whether a break will stick. It's a different dimension of racing, and you're learning to thrive in it.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "mid_data_analysis",
      text: "Your post-race data analysis has become sophisticated. You're not just looking at average power anymore—you're analyzing power distribution, effort timing, heart rate trends, cadence patterns. Every file tells a story, and you're learning to read them like a coach.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mid_mental_toughness",
      text: "The mental side of racing is becoming clearer. You've learned when to push through discomfort and when pain signals actual problems. How to stay calm when the pace spikes, how to manage suffering, how to maintain focus for the entire duration. Your mind is becoming as trained as your legs.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["top10", "podium", "win"] },
      weight: 0.6
    },
    {
      id: "mid_pack_positioning_mastery",
      text: "Pack positioning has become second nature. You can sense gaps opening before they appear, feel when the pace is about to change, position yourself for attacks before they happen. It's like developing a sixth sense for group dynamics.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "mid_equipment_confidence",
      text: "You've stopped worrying about equipment. Your bike is properly maintained, your kit is comfortable, your gear works reliably. That mental space previously occupied by equipment anxiety is now focused on actual racing. The setup is dialed, the excuses are gone.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mid_race_reading",
      text: "You're getting better at reading races in real-time. Recognizing which attacks are dangerous, which teams are working together, when the decisive moment is approaching. This tactical awareness makes you dangerous—not just strong, but smart.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["podium", "win"] },
      weight: 0.7
    },
    {
      id: "mid_social_media_presence",
      text: "Your racing social media has grown organically. People follow your journey, comment on your progress, share in your successes and setbacks. You're not an influencer, but you've built a small community of supporters who care about your racing. That accountability and encouragement matters more than you expected.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== LATESEASONINTROS =====
  lateSeasonIntros: [
    {
      id: "late_season_fatigue",
      text: "The season is taking its toll. You can feel it in the way your legs respond to hard efforts, in the extra time needed for recovery, in the mental weight of showing up race after race. This is where consistency matters most—when everyone is tired, when the excitement of early season has faded into the grind, when it would be easy to skip a race or mail in a performance.",
      triggers: { raceNumber: [11, 12, 13], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "late_season_reflection",
      text: "Looking back at where you started this season, the progress is undeniable. The rider who toed the line at Event 1, nervous and uncertain, barely resembles who you are now. You've learned to race, learned to suffer, learned what you're capable of when you commit fully.",
      triggers: { raceNumber: [13, 14], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "late_final_push",
      text: "Everything comes down to these final races. Points accumulated over months, form built through countless training hours, lessons learned in a dozen race situations—it all matters now. The standings are still fluid, positions can change, and every place gained or lost carries weight.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "late_championship_mindset",
      text: "The math is simple: if you can string together strong results in these final races, you're in contention for the overall. It's no longer about individual race results—it's about the season as a whole, about proving you can perform when it counts most, when fatigue is highest and the pressure is real.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "late_no_regrets",
      text: "The season is almost over, and you're determined to finish strong. No regrets, no 'what ifs,' no holding back. You've come too far, worked too hard, sacrificed too much to coast through the final races. This is the time to empty the tank completely.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "late_lessons_learned",
      text: "Every race this season taught you something valuable—about tactics, about your body, about who you are under pressure. Now, in these final events, you're putting all those lessons into practice. This is where the education becomes wisdom, where experience transforms into results.",
      triggers: { raceNumber: [12, 13, 14], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "late_next_season_thoughts",
      text: "Your mind keeps drifting to next season—how much stronger you'll be with a full year of racing experience, what you'll do differently, where you can improve. But first, you need to finish this season strong, to prove to yourself that you can close when it matters.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "late_emotional_investment",
      text: "You didn't expect to care this much. At the start of the season, racing was just something you were trying. Now, the results matter deeply. The standings mean something. You check them compulsively, run through scenarios, calculate what you need to happen. Racing has become personal.",
      triggers: { raceNumber: [12, 13, 14], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "late_veterans_respect",
      text: "The experienced racers who you admired from afar at the start of the season now treat you differently. There's a nod of recognition at the start line, a word of respect after the race. You've earned your place in this community through consistency and performance.",
      triggers: { raceNumber: [12, 13, 14, 15], performanceTier: ["podium", "top10"] },
      weight: 0.6
    },
    {
      id: "late_fitness_peak",
      text: "All the training, all the racing, all the recovery—it's culminating now. You feel the best you've felt all season, that rare confluence of fitness and freshness that defines peak form. These final races come at exactly the right moment.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["win", "podium"] },
      weight: 0.8
    },
    {
      id: "late_standings_pressure",
      text: "Every time you check the standings, the pressure builds. You're close enough to move up significantly, positioned where a strong finish could change your entire season narrative. That pressure could be crushing or motivating—you're choosing motivation.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "late_legacy_building",
      text: "These final races are about more than points or positions—they're about establishing who you are as a racer. Do you fade when things get hard, or do you rise to the occasion? Do you quit when tired, or push through? The answer to those questions gets written in these final events.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.7
    }
  ],

  // ===== EQUIPMENT =====
  equipment: [
    {
      id: "equip_tire_choice",
      text: "You spent an embarrassing amount of time researching tire choices for this race. Thread count, rubber compound, tubeless vs tubes, optimal pressure for your weight. Your friends think you're overthinking it. But marginal gains matter, and if the right tires save you five watts or give you better cornering confidence, that's worth the research.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "equip_saddle_saga",
      text: "Finding the right saddle has been a months-long odyssey. You've tried five different models, adjusting height and fore-aft position countless times. Finally, this one feels right—you can put down power without discomfort, stay aero without numbness. It's amazing how much difference a few centimeters of shaped carbon and padding can make.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_aero_obsession",
      text: "You've gone full aero-nerd: tight clothing, tucked elbows, flat back position. You practice in the mirror, film yourself on training rides, optimize every detail. Whether it's actually making you faster is unclear, but the psychological benefit of knowing you're doing everything possible to reduce drag is real.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["top10", "podium", "win"] },
      weight: 0.5
    },
    {
      id: "equip_maintenance_ritual",
      text: "The night before races has become a ritual: bike completely clean, chain freshly lubed, bolts checked, wheels true, brake pads inspected. Some might call it obsessive. You call it preparation. A mechanical DNF is preventable, and you're not leaving anything to chance.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "equip_clothing_experiment",
      text: "You've been experimenting with race clothing—speedsuits vs separate bibs and jersey, short vs long socks, aero fabrics vs comfort. Every choice is a trade-off between aerodynamics, comfort, and looking the part. Today's kit represents your current best guess at the optimal combination.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_tech_adoption",
      text: "Your bike computer now tracks everything: power, heart rate, cadence, GPS, even the weather. Post-race, you spend almost as much time analyzing the data as you did racing. Every file reveals something—a premature effort, an inefficient cadence spike, proof that you had more to give.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "equip_helmet_upgrade",
      text: "The new aero helmet looked ridiculous in the shop, but the wind tunnel data doesn't lie—it's measurably faster than your old one. You've stopped caring what it looks like. Racing is about going fast, not looking cool. Well, mostly.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_budget_creativity",
      text: "You can't afford the top-tier equipment the front of the pack is riding, so you've become creative: used race wheels from last year's model, take-off components from bike shop, waiting for sales. The bike may not be Instagram-worthy, but it's race-ready, and that's what matters.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["midpack", "back"] },
      weight: 0.5
    },
    {
      id: "equip_position_refinement",
      text: "You've been working with online fit guides, adjusting saddle height by millimeters, tweaking stem length, rotating handlebar angle. The goal: maximum power output with minimum discomfort. Every adjustment is tested on rides, refined, tested again. Your position is becoming truly yours.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["top10", "podium"] },
      weight: 0.4
    },
    {
      id: "equip_minimalist_approach",
      text: "You've started stripping unnecessary weight and items from your race setup. No saddlebag, minimal tools, just what's absolutely essential. Every gram counts, or so you tell yourself. In reality, the mental benefit of a cleaner, simpler setup might matter more than the actual weight savings.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_pedal_efficiency",
      text: "New pedals and cleats made a bigger difference than expected. Better power transfer, more secure connection, easier unclipping when needed. You spent weeks getting the float and tension dialed in perfectly, but now they feel like an extension of your body.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_chain_obsession",
      text: "You've become obsessed with chain maintenance. Cleaning after every ride, fresh lube before races, measuring wear religiously. A new chain costs money, but a snapped chain costs races. The investment in maintenance is paying dividends in reliability.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_bottle_system",
      text: "You've optimized your hydration system down to the last detail: aero bottles, valve positions, even the angle they sit in the cages. Being able to grab a bottle smoothly at speed without losing momentum matters. Every detail matters.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "equip_electronic_shifting",
      text: "Electronic shifting was a revelation. Perfect shifts every time, trimming on the fly, no cable stretch or adjustment needed. You resisted for budget reasons, but after your first race with it, you wonder how you ever raced with mechanical. The precision changes everything.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["win", "podium"] },
      weight: 0.4
    },
    {
      id: "equip_spare_wheels",
      text: "You finally have a second set of race wheels. Not having to choose between training and preserving your good wheels is liberating. Plus, now you can match wheels to conditions—deeper rims for calm days, shallower for wind. Options are power.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_bar_tape_preference",
      text: "Bar tape seems trivial until you've raced with the wrong stuff—too thick, too thin, not tacky enough. You've found exactly the right combination of cushioning and grip for your hands. Small comforts matter over race distances.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "equip_computer_mounting",
      text: "You spent an entire evening getting your computer position perfect—low enough to be aero, high enough to see clearly, angled just right for easy viewing. Now you can glance at data without breaking your aerodynamic position. The details stack up.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "equip_tubeless_conversion",
      text: "Converting to tubeless was tedious but worthwhile. Lower rolling resistance, better flat protection, the ability to run lower pressures. You've had one puncture that sealed itself while riding—that alone justified the conversion hassle.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "equip_cage_bolts",
      text: "After a bottle cage came loose mid-race, you've become paranoid about bolt tension. Now you check every bolt before every race, carry the right tools, even keep spare cage bolts in your race bag. The lesson was expensive but learned permanently.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "equip_backup_plan",
      text: "Your race bag now contains backup everything: spare derailleur hanger, extra tube, CO2, quick link, even a spare race number. Being prepared for mechanical issues gives you confidence, reduces pre-race anxiety about what could go wrong.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== LIFESTYLE =====
  lifestyle: [
    {
      id: "life_morning_routine",
      text: "The alarm goes off at 5:30 AM and for three full seconds you debate whether racing is really worth this. Then you remember why you started: the feeling of speed, the challenge, the person you're becoming through this process. You roll out of bed, stumble to the kitchen, start the coffee.",
      triggers: { raceNumber: [2, 3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_grocery_store",
      text: "The grocery store has become a different place since you started racing seriously. You find yourself reading nutrition labels obsessively, calculating protein content, comparing carbohydrate sources. Your cart looks different too—less junk food, more rice and pasta, vegetables actually purchased with intent rather than guilt.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_social_sacrifice",
      text: "Your friends have stopped inviting you to late-night events. They know you'll either decline because of early training rides or show up and leave early, checking your watch and calculating sleep hours. Racing has rearranged your social life in ways you didn't fully anticipate.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_work_balance",
      text: "Balancing work and training has become an art form. You schedule meetings around key workouts, take lunch breaks for quick spins, sneak in intervals before the office. Your colleagues don't understand the dedication, but you've found a rhythm that mostly works.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_laundry_reality",
      text: "The laundry situation has reached critical levels—sweaty cycling kit piling up after every ride, the constant washing, the gear that never quite dries in time. You've considered buying duplicates of everything just to keep up with the volume. Racing is glamorous until it's time to deal with the logistics.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "life_weather_watching",
      text: "You've become obsessed with weather forecasts. Not just for race day, but for every training ride. Wind direction, temperature, chance of rain—it all affects your preparation. Your phone's weather app is checked more often than social media now.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_sleep_priority",
      text: "Sleep has become non-negotiable. Eight hours minimum, nine when possible. You've reorganized your entire evening routine around getting to bed early enough to wake up recovered. Friends joke about your grandmother bedtime, but the performance benefits are undeniable.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_food_timing",
      text: "You've become that person who times meals around training. Carbs four hours before long rides, protein within thirty minutes after hard efforts, fat restricted when glycogen loading. Your eating habits would seem neurotic to anyone who doesn't race bikes.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_family_support",
      text: "Your family has been incredibly supportive, even when they don't fully understand the appeal. They show up at races when they can, ask about your results, tolerate the bikes in the living room. That support means more than they probably realize.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_time_management",
      text: "Every hour of your week is accounted for: work, training, recovery, race prep. You've become ruthlessly efficient with time, cutting out activities that don't serve your goals. It's probably unsustainable long-term, but right now, in this season, the focus feels necessary.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_injury_avoidance",
      text: "You've become paranoid about staying healthy—washing hands obsessively, avoiding sick people, taking vitamins, stretching religiously. A cold or injury could derail weeks of training. Prevention has become as important as the training itself.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_bike_shop_regular",
      text: "The local bike shop staff know you by name now. You're there weekly—picking up nutrition, getting last-minute adjustments, browsing components you can't afford yet. It's become your community hub, where you hear about group rides, get course beta, share war stories from races.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_coffee_shop_work",
      text: "You've become a regular at the coffee shop near popular riding routes. It's become your pre-ride ritual and post-ride recovery spot. The baristas know your order, other cyclists congregate there, and it feels like an unofficial team headquarters.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_weekend_structure",
      text: "Your weekends have a rigid structure now: long ride Saturday, race or hard workout Sunday, religiously. Friends want spontaneity; you need structure. The predictability reduces stress and ensures you're hitting your training targets.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_commute_training",
      text: "Your work commute has become training time. You've mapped out routes with elevation, can add intervals on certain segments, have multiple distance options depending on the day. Every ride serves a purpose now—even getting to work.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_meal_prep",
      text: "Sunday meal prep has become essential. Containers of rice, grilled chicken, vegetables, all portioned and ready. It's boring and time-consuming, but fueling properly isn't optional. The pros do it, and now so do you.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_alcohol_sacrifice",
      text: "You've dramatically cut back on alcohol. Not eliminated entirely, but race weeks are now completely dry, and even off-weeks are minimal. The performance cost of drinking just isn't worth it anymore. Your social life has adapted, mostly.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["top10", "podium", "win"] },
      weight: 0.3
    },
    {
      id: "life_apartment_gym",
      text: "Your apartment has evolved into a mini training center: trainer in the corner, foam roller and yoga mat out permanently, resistance bands hanging from doorways. Your living space is now optimized for athletic performance, not entertaining guests.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_relationship_impact",
      text: "Your significant other has been patient with the racing obsession, but the impact is real. Weekend rides that take hours, races that dominate the calendar, the fatigue that affects your mood. You're grateful for their understanding, aware you need to find better balance.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_financial_priority",
      text: "Your budget has shifted dramatically toward racing. That vacation you planned? Postponed. New clothes? Not until race season ends. Racing has become the line item that everything else works around. It's extreme, but so is your commitment.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== OFFSEASON =====
  offSeason: [
    {
      id: "off_season_training",
      text: "Winter training is different from racing season: less intense, more volume, focused on building the base that'll support next season's efforts. You're putting in long, steady hours in the cold, sometimes questioning why you're out here when you could be warm inside.",
      triggers: { raceNumber: [1], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "off_season_planning",
      text: "You spent the off-season mapping out this entire year—which races to target, when to build form, where to rest. The plan is taped to your wall, and you've been following it religiously. Today's race is exactly where the plan said you should be, with the fitness you worked months to build.",
      triggers: { raceNumber: [1, 2], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "off_season_base_building",
      text: "The foundation for racing success was laid in December and January—months of long, steady rides building aerobic capacity. Hour after hour, week after week, no glory, no results, just the patient accumulation of base fitness. Now you're reaping what you sowed.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["win", "podium", "top10"] },
      weight: 0.5
    },
    {
      id: "off_season_weakness_work",
      text: "Last season exposed your weaknesses clearly: you got dropped on climbs, struggled in crosswinds, faded in long races. This off-season you targeted those weaknesses specifically—hill repeats, tempo efforts, endurance rides. You're not the same rider who finished last season.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "off_season_mental_prep",
      text: "Physical preparation is only part of the equation. You've been working on the mental side too—visualization exercises, reviewing race tactics, studying course profiles. By the time you arrived at the start line today, you'd already raced this event a dozen times in your head.",
      triggers: { raceNumber: [1, 2], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "off_season_strength_training",
      text: "You spent the off-season in the gym more than on the bike. Squats, deadlifts, core work—building the strength foundation that supports on-bike power. It was humbling to be weak at something, but the payoff is coming now in races.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "off_season_skills_work",
      text: "Winter was spent working on skills: bike handling drills, cornering practice, sprint technique. The fitness will come, but the technical skills needed dedicated, focused work. You used the off-season wisely, and it shows in your confidence now.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "off_season_weight_focus",
      text: "You used the off-season to dial in your race weight—not crash dieting, but steady, sustainable optimization. Better power-to-weight ratio, improved climbing, more confidence. The discipline of consistent nutrition is paying off.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["top10", "podium"] },
      weight: 0.4
    },
    {
      id: "off_season_coaching",
      text: "You hired a coach this off-season. The structured training, the accountability, the expert guidance—it cost money but transformed your preparation. Every workout had purpose, every rest day was strategic. Now you're racing with a level of preparation you've never had before.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "off_season_crosstraining",
      text: "The off-season included serious cross-training: running for aerobic base, skiing for power endurance, swimming for active recovery. The variety kept you mentally fresh while building fitness from different angles. Now you feel more well-rounded as an athlete.",
      triggers: { raceNumber: [1, 2], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== MOTIVATION =====
  motivation: [
    {
      id: "motiv_tour_watching",
      text: "You stayed up late watching Tour de France highlights, studying how the professionals navigate the chaos of the peloton, how they position themselves before climbs, the body language that telegraphs attacks before they happen. It's inspiring and humbling in equal measure.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "motiv_why_you_race",
      text: "Someone asked you why you race, and you struggled to articulate an answer that made sense. For the competition? For the fitness? Because suffering builds character? All true, none complete. The real answer is messier: you race because it makes you feel alive in a way few other things do.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_role_model",
      text: "There's a rider you admire—someone who races clean, works hard, carries themselves with quiet confidence. You've never met them, but you study their results, watch how they race, try to emulate their approach. Everyone needs a north star, and they're yours.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_proving_doubters_wrong",
      text: "Not everyone believed you could do this. Some people laughed at your ambitions, told you racing was for younger athletes, suggested you were wasting your time. Part of you races to prove them wrong. But the bigger part races to prove something to yourself.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["win", "podium", "top10"] },
      weight: 0.5
    },
    {
      id: "motiv_personal_growth",
      text: "Racing has changed you in unexpected ways. You're more disciplined in all areas of life now, more resilient when things go wrong, more confident in your ability to push through discomfort. The person in the mirror barely resembles who you were a year ago.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "motiv_community",
      text: "The cycling community has become your tribe. These are people who understand the sacrifices, celebrate the victories, commiserate over the defeats. You've found your people, and that sense of belonging is worth more than any result.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_age_defiance",
      text: "You're not the youngest rider in the field anymore, and you won't be the oldest either. But you refuse to let age become an excuse. If anything, starting later means you appreciate this more, work harder, waste less time doubting yourself.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_pure_love",
      text: "Strip away the tactics, the technology, the data, and what's left is simple: you love riding bikes fast. The wind in your face, the burn in your legs, the sensation of pushing your body to its limits—this is what you're here for.",
      triggers: { raceNumber: [4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "motiv_documentary_inspiration",
      text: "You watched a cycling documentary last night—one of those intimate looks at what it takes to compete at the highest level. The sacrifices, the dedication, the brutal honesty about the cost. It made you more grateful for the opportunity to race, more determined to make the most of it.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_finish_line_memory",
      text: "You keep replaying that moment from a previous race—crossing the finish line, looking down at your result, the rush of accomplishment. That memory fuels you through hard training, through doubts, through moments when quitting seems easier than continuing.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"], minRacesCompleted: 2 },
      weight: 0.4
    },
    {
      id: "motiv_mentor_advice",
      text: "An experienced racer took you aside recently and shared some wisdom: 'Most people never discover what they're capable of because they quit before finding out.' Those words stuck with you. Today is about not quitting, about discovering what you're really capable of.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "motiv_childhood_dreams",
      text: "As a kid, you watched bike races and dreamed of being that person—strong, confident, fearless. Life took you in different directions, but that dream never completely died. Now you're living a version of it, and that kid inside you is proud.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_legacy_thoughts",
      text: "You've been thinking about legacy lately. Not fame or fortune, but the satisfaction of knowing you gave something your full effort, that you tested your limits, that you didn't settle for wondering 'what if.' Racing is your answer to that question.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_quote_inspiration",
      text: "A quote has been rattling around in your head: 'It never gets easier, you just get faster.' Greg LeMond was right. The suffering doesn't diminish—you just learn to suffer at higher speeds. There's something beautiful and terrible about that truth.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "motiv_transformation_reflection",
      text: "Looking at photos from the start of the season, you barely recognize yourself. Not just physically—though the fitness shows—but in your eyes. There's a confidence there now, a sense of purpose. Racing has given you that.",
      triggers: { raceNumber: [9, 10, 11], performanceTier: ["any"] },
      weight: 0.5
    }
  ],

  // ===== BREAKTHROUGH =====
  breakthrough: [
    {
      id: "break_first_win",
      text: "You won. Actually won. Not just placed well, not just exceeded expectations, but crossed the line first with everyone else behind you. The feeling is indescribable—euphoria mixed with disbelief mixed with validation of every hard training session and early morning and sacrifice.",
      triggers: { performanceTier: ["win"], isFirstWin: true },
      weight: 1.0
    },
    {
      id: "break_podium_streak",
      text: "Three races, three podiums. This isn't luck anymore—it's form, consistency, the accumulation of everything you've been working toward. Other riders are starting to recognize you at race sign-in, and not just casually but with the kind of respect reserved for genuine competitors.",
      triggers: { performanceTier: ["podium"], consecutivePodiums: 3 },
      weight: 0.9
    },
    {
      id: "break_pack_control",
      text: "There was a moment in your last race where you realized you weren't just reacting to the pack—you were controlling it. Setting tempo, covering moves, dictating when attacks could go. That shift from participant to protagonist felt seismic.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["win", "podium"], minRacesCompleted: 2 },
      weight: 0.7
    },
    {
      id: "break_mental_strength",
      text: "Your last race taught you something crucial: your mind quits before your body does. When you pushed past that mental barrier, past the voice saying 'this is too hard,' you found another gear entirely. Now you know—true limits are further than you thought.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["win", "podium", "top10"], improvementFromPrediction: 5, minRacesCompleted: 2 },
      weight: 0.8
    },
    {
      id: "break_tactical_victory",
      text: "Your last win wasn't about being the strongest—it was about being the smartest. You conserved energy when others wasted it, positioned perfectly for the finale, timed your effort to perfection. That's the kind of racing that wins championships.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["win"], minRacesCompleted: 2 },
      weight: 0.8
    },
    {
      id: "break_confidence_shift",
      text: "Something fundamental has shifted in how you approach races. You used to hope for good results. Now you expect them. That confidence isn't arrogance—it's earned through consistent performance and the knowledge that you belong at the front.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["win", "podium"], consecutiveGoodResults: 4 },
      weight: 0.8
    },
    {
      id: "break_physical_breakthrough",
      text: "You felt it during your last interval session—a new level of power, sustained longer than before. All the training, all the recovery, all the attention to detail culminating in a physical breakthrough. You're not the same engine you were three months ago.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["win", "podium", "top10"], minRacesCompleted: 2 },
      weight: 0.6
    },
    {
      id: "break_fearless_moment",
      text: "There was a moment in your last race where fear just... evaporated. Descending at speeds that used to terrify you, cornering on the limit, confident in your bike handling. That fearlessness is a breakthrough as significant as any fitness gain.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["top10", "podium", "win"], minRacesCompleted: 2 },
      weight: 0.6
    },
    {
      id: "break_recognition_moment",
      text: "A rider you respect pulled you aside after your last race and said, 'You're getting really strong.' Simple words, but the recognition from someone who's been doing this for years hit differently. You're being seen as a legitimate competitor now.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["podium", "win"], minRacesCompleted: 2 },
      weight: 0.6
    },
    {
      id: "break_solo_effort",
      text: "You went solo off the front in your last race and held it to the finish. No teammates, no help, just you against everyone else's collective effort to bring you back. Holding that breakaway required every bit of physical and mental strength you possess.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["win"], minRacesCompleted: 2 },
      weight: 0.9
    },
    {
      id: "break_suffering_comfort",
      text: "You've reached a point where deep suffering in races feels almost comfortable. Not easy—never easy—but familiar. Your relationship with pain has fundamentally changed. You can live in that dark place longer than most, and that's a massive competitive advantage.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "break_consistent_excellence",
      text: "You haven't finished outside the top ten in six races. That kind of consistency is rare—it requires fitness, tactics, reliability, mental strength. You're not just having good days anymore; you've reached a plateau of consistent excellence.",
      triggers: { raceNumber: [9, 10, 11], performanceTier: ["top10", "podium"], consecutiveGoodResults: 6 },
      weight: 0.9
    }
  ],

  // ===== SETBACK =====
  setback: [
    {
      id: "set_mechanical",
      text: "A mechanical ended your race today—chain drop, derailleur issue, something that could've been prevented with better pre-race prep. You sat on the roadside while the peloton disappeared, feeling equal parts frustration and self-recrimination.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.6
    },
    {
      id: "set_bad_day",
      text: "Some days the legs just aren't there. No explanation, no warning, just the terrible realization mid-race that you're off form and there's nothing you can do about it. You fought through to the finish, but it was ugly.",
      triggers: { performanceTier: ["back"], predictedMuchBetter: true },
      weight: 0.7
    },
    {
      id: "set_tactical_error",
      text: "You made a tactical mistake today—attacked too early, chased the wrong move, positioned yourself poorly for the finale. The legs were there, but the brain made the wrong call. Sometimes the hardest lessons come from races you should have won.",
      triggers: { performanceTier: ["midpack", "back"], predictedMuchBetter: true },
      weight: 0.6
    },
    {
      id: "set_crash",
      text: "Someone went down in front of you, and you had nowhere to go. The crash itself was minor—road rash, bruised ego, lost time. But the race was over, and watching the pack ride away while you picked yourself up was its own kind of pain.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.5
    },
    {
      id: "set_illness_impact",
      text: "You probably shouldn't have raced today. The cold you thought was behind you clearly wasn't, and your body made that abundantly clear during the race. Pride got you to the start line, but wisdom would have kept you home.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.5
    },
    {
      id: "set_overconfidence",
      text: "You went into today's race overconfident, expecting an easy result based on recent form. Racing doesn't work that way. The pack punished your assumptions, and you learned again that every race must be respected, every field taken seriously.",
      triggers: { performanceTier: ["midpack", "back"], predictedMuchBetter: true, requiresPreviousResults: true },
      weight: 0.6
    },
    {
      id: "set_equipment_failure",
      text: "Your equipment let you down today—a flat at the worst possible moment, a component that chose this race to fail. You can't control everything, but that doesn't make it less frustrating when mechanical bad luck decides your result.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.5
    },
    {
      id: "set_learning_experience",
      text: "Today hurt, both physically and psychologically. But you're choosing to treat it as tuition paid for the education. Every failure teaches something if you're willing to learn. Tomorrow you'll be smarter, stronger, more prepared.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.7
    },
    {
      id: "set_wrong_position",
      text: "You were in the wrong position when the race split apart. Too far back to respond, boxed in when you needed to move. By the time you fought your way forward, the damage was done. Positioning errors are expensive lessons.",
      triggers: { performanceTier: ["midpack", "back"], isWorseResult: true },
      weight: 0.6
    },
    {
      id: "set_pacing_mistake",
      text: "You went too hard too early, burning matches you'd desperately need later. When the decisive moment came, you had nothing left. Pacing is an art, and today you painted badly. The lesson is learned, painfully but thoroughly.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.6
    },
    {
      id: "set_nutrition_failure",
      text: "You bonked spectacularly today. The nutrition plan that worked in training completely failed in race conditions. The empty-tank feeling, the mental fog, the inability to push—it's a horrible way to end a race. Back to the drawing board on fueling.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.5
    },
    {
      id: "set_weather_victim",
      text: "The weather turned brutal mid-race—rain, cold, wind, everything at once. While some riders seemed unaffected, you struggled terribly. Weather resilience is something you clearly need to work on. Mother Nature was the winner today.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.5
    },
    {
      id: "set_missed_break",
      text: "The winning break went and you weren't in it. You saw it forming, tried to bridge, but couldn't close the gap. Sometimes races are decided in thirty seconds of inattention. Today was one of those races, and you were on the wrong side of the split.",
      triggers: { performanceTier: ["midpack"], predictedBetter: true },
      weight: 0.6
    },
    {
      id: "set_form_dip",
      text: "The form that carried you through the past few races has dipped. It happens—training stress accumulates, recovery gets missed, fitness plateaus. The challenge now is managing through this rough patch, trusting the process, waiting for form to return.",
      triggers: { performanceTier: ["midpack", "back"], wasDoingBetter: true },
      weight: 0.6
    },
    {
      id: "set_mental_defeat",
      text: "You gave up mentally before the race was over. The body still had something left, but your mind quit first. That's harder to accept than physical failure—knowing you left something on the table because you stopped believing.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.7
    }
  ],

  // ===== RIVALRY =====
  rivalry: [
    {
      id: "rival_emergence",
      text: "There's a rider you keep seeing in results, someone racing a similar schedule who seems to be on a similar trajectory. You've never spoken, barely made eye contact, but you track their results obsessively. When they finish ahead of you, it stings more than it should.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["top10", "podium"], requiresRivalHistory: true },
      weight: 0.7
    },
    {
      id: "rival_respect",
      text: "You've been racing against the same core group all season, and a mutual respect has developed. You know their strengths and weaknesses, they know yours. In the pack, you acknowledge each other with nods—competitors, but also fellow travelers on this journey.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.5
    },
    {
      id: "rival_revenge",
      text: "A rider who beat you soundly in your last encounter is here again. You've been thinking about that race, analyzing what went wrong, planning how to approach today differently. Revenge might be petty, but it's also motivating.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"], minRacesCompleted: 2, requiresRivalHistory: true },
      weight: 0.6
    },
    {
      id: "rival_friendly",
      text: "Your main rival has become something close to a friend. You warm up together, share race intel, commiserate after tough days. The competition is fierce, but the friendship is genuine. It's possible to want to beat someone and genuinely hope they do well.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["podium", "top10"], requiresRivalHistory: true },
      weight: 0.5
    },
    {
      id: "rival_shadowing",
      text: "You've been watching one rider in particular—studying their race tactics, their training posts, their equipment choices. Call it respect or obsession, but you're learning from them, using them as a benchmark for where you want to be.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.5
    },
    {
      id: "rival_motivation",
      text: "Knowing your rival will be racing today adds an extra layer of motivation. You want to beat them specifically, to prove something you're not even sure how to articulate. Personal competition elevates performance in ways general competition never could.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.6
    },
    {
      id: "rival_comparison",
      text: "You check their results as obsessively as your own. When they have a good race, you're simultaneously impressed and irritated. When they have a bad race, you feel sympathy mixed with opportunity. This rivalry has become personal in ways that surprise you.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.5
    },
    {
      id: "rival_final_sprint",
      text: "Your last race came down to a sprint against your main rival. The competition, the tactical chess match, the pure racing between two equally matched competitors—it was bicycle racing at its finest. Win or lose, those are the moments you live for.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["win", "podium"], minRacesCompleted: 2, requiresRivalHistory: true },
      weight: 0.7
    },
    {
      id: "rival_different_strengths",
      text: "You and your rival have completely different racing styles. They're a climber; you're a sprinter. They attack constantly; you race conservatively. That contrast makes your competition interesting—it's not about who's stronger, but whose strengths suit today's race better.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.5
    },
    {
      id: "rival_age_group_battle",
      text: "In the age group standings, there's one rider you're locked in battle with. Every race, the gap between you shifts slightly. Points accumulate, positions change, and the season-long competition adds meaning to every result.",
      triggers: { raceNumber: [8, 9, 10, 11], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.6
    },
    {
      id: "rival_social_media",
      text: "You follow each other on social media, watching training updates, race preparations, results posts. There's an unspoken acknowledgment of the rivalry, a public-facing politeness that masks intense competitive drive underneath.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.4
    },
    {
      id: "rival_post_race_chat",
      text: "After races, you and your rival often end up chatting—comparing notes on the race, discussing tactics, sharing frustrations. The competitive fire burns hot during races, but afterward, there's genuine respect and even admiration for each other's dedication.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"], requiresRivalHistory: true },
      weight: 0.5
    }
  ],

  // ===== LOCALCOLOR =====
  localColor: [
    {
      id: "color_coast_and_roast",
      text: "The Coast and Roast Crit has a reputation: fast, technical, and absolutely unforgiving of positioning mistakes. The tight corners come rapid-fire, and one moment of hesitation can cost you twenty places. Locals dominate this race because they know every corner, every rough patch, exactly where to brake and where to carry speed.",
      triggers: { raceNumber: [1], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "color_forest_velodrome",
      text: "Track racing is a different animal entirely—nowhere to hide, nowhere to rest, just raw speed and tactical awareness. The Forest Velodrome Elimination is particularly brutal: every lap someone goes home, and the pressure is relentless from the opening whistle.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "color_unbound",
      text: "Unbound - Little Egypt isn't your typical race. The gravel sections are rough and unpredictable, the distance is long enough to expose any weakness in fitness or pacing, and the whole event has this adventurous, slightly wild energy that's different from standard road racing.",
      triggers: { raceNumber: [12], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "color_time_trial",
      text: "Time trials are the race of truth—just you, the bike, and the clock. No tactics to hide behind, no teammates to help, nowhere to coast. Every watt matters, every second of position savings counts. It's pure suffering converted directly into time.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "color_criterium_chaos",
      text: "Criteriums are controlled chaos—same corners lap after lap, speeds that feel dangerous, positioning that changes every turn. The technical demands are enormous: handling skills, spatial awareness, the ability to accelerate out of corners repeatedly without burning all your matches.",
      triggers: { raceNumber: [1, 7], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "color_hill_climb",
      text: "Hill climbs are elegantly simple and brutally hard. The road goes up, and you either have the legs to go fast or you don't. No hiding, no tactics, just you versus gravity in its purest form.",
      triggers: { raceNumber: [6], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "color_points_race",
      text: "Points races reward consistency over single efforts. You need to be alert for every sprint, positioned well each time, smart about when to go all-in and when to take what you can get. It's about accumulation, not one decisive moment.",
      triggers: { raceNumber: [5, 11], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "color_gran_fondo",
      text: "The gran fondo distance changes everything. What seems sustainable for an hour becomes questionable over three or four. Pacing becomes critical, nutrition essential, mental strength as important as physical. These races reveal who prepared properly and who overestimated their fitness.",
      triggers: { raceNumber: [8], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "color_race_atmosphere",
      text: "The pre-race atmosphere is electric today. More spectators than usual, local media coverage, a genuine sense of occasion. These bigger events have a different energy—more pressure, more excitement, more meaning packed into the same race distance.",
      triggers: { raceNumber: [5, 8, 12], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "color_course_knowledge",
      text: "This course has become familiar over multiple races. You know where the attacks will come, where the pack will slow, which corners are dangerous. That local knowledge is an advantage—not decisive, but meaningful. You can race smarter when you know what's coming.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "color_new_venue",
      text: "This is your first time racing this course, and the unfamiliarity adds an extra layer of challenge. Every corner is uncertain, every climb is a surprise. You're racing cautiously, conservatively, trying to learn the course while also competing.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "color_championship_importance",
      text: "Today's race carries extra weight—it's a championship event, or a known race on the calendar that attracts the strongest field. The level of competition is noticeably higher, the racing more aggressive. These are the events that define seasons.",
      triggers: { raceNumber: [8, 12, 15], performanceTier: ["any"] },
      weight: 0.6
    }
  ],

  // ===== WEATHER =====
  weather: [
    {
      id: "weather_rain",
      text: "Rain changes everything about bike racing. Corners become sketchy, braking distances extend, vision decreases. Some riders thrive in these conditions, comfortable when others are terrified. You're learning which category you fall into.",
      triggers: { raceNumber: [2, 3, 4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_heat",
      text: "The heat is brutal today—the kind that makes every effort feel twice as hard, that drains your energy even before the race starts. Staying hydrated becomes as important as staying in position. Some riders wilt in heat; others seem unaffected. Today you'll find out which you are.",
      triggers: { raceNumber: [5, 6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "weather_wind",
      text: "The wind is howling—crosswinds that will split the field, headwinds that will punish anyone who works too hard early. Wind racing requires different tactics: echelon positioning, selective effort, tactical patience. Get it wrong and you'll be gapped before you know what happened.",
      triggers: { raceNumber: [3, 4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "weather_cold",
      text: "The cold makes warming up crucial and staying warm during the race a challenge. Your fingers hurt, your face goes numb, and finding that perfect balance between enough clothing and too much becomes its own tactical decision.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_perfect",
      text: "Today's weather is perfect—temperature in the sweet spot, minimal wind, dry roads. These are the conditions where pure form wins out, where there are no excuses about weather affecting performance. Either you're fast today or you're not.",
      triggers: { raceNumber: [4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_humidity",
      text: "The humidity is oppressive, making every breath feel thick, every effort harder than it should be. Sweat doesn't evaporate, body temperature regulation becomes difficult. This kind of weather separates those who prepared properly from those who didn't.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_early_morning",
      text: "The early morning start means racing in cool temperatures that will warm significantly as the race progresses. Choosing the right clothing is tricky—start comfortable and risk overheating, or start cold and trust you'll warm up. It's racing roulette.",
      triggers: { raceNumber: [2, 3, 4, 5], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_unpredictable",
      text: "The weather forecast was uncertain, and now mid-race, you're dealing with changing conditions. What started clear is now threatening rain, or vice versa. Adaptability becomes as important as fitness in races like this.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_tailwind_sections",
      text: "The course has serious tailwind sections that will push speeds dangerously high. Staying in the draft becomes critical, because anyone off the back in a tailwind is gone forever. The physics of wind create their own brutal tactical demands.",
      triggers: { raceNumber: [4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "weather_sun_blinding",
      text: "The low sun is blinding coming into certain turns, making it hard to read the road, hard to spot hazards. Some riders forgot sunglasses; others have the wrong tint. These small equipment decisions become significant in specific conditions.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.2
    }
  ],

  // ===== TRAVEL =====
  travel: [
    {
      id: "travel_long_drive",
      text: "The drive to this race was longer than expected—three hours each way, leaving before dawn to make the start time. You tried to rest in the car, but pre-race nerves made that impossible. Now you're here, slightly tired from travel but committed to making the drive worth it.",
      triggers: { raceNumber: [4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "travel_local_race",
      text: "There's something comforting about racing close to home. You know these roads, you've trained on them countless times, and sleeping in your own bed last night meant arriving fresh and ready. Local races have their advantages.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "travel_logistics_stress",
      text: "Race day logistics are more complicated than they should be—parking, registration, warming up, bathroom, pinning numbers, one last bike check. You've developed a system, a routine that minimizes stress, but there's always that underlying anxiety that you've forgotten something crucial.",
      triggers: { raceNumber: [2, 3, 4, 5], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "travel_course_recon",
      text: "You drove the course yesterday, studying the key sections, noting where attacks might happen, visualizing the finale. That reconnaissance gives you confidence—you won't be surprised by anything today. You know what's coming.",
      triggers: { raceNumber: [5, 6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "travel_overnight_stay",
      text: "You stayed overnight near the race venue to avoid an early morning drive. The hotel wasn't great, the bed was unfamiliar, but you're here fresh and ready. Sometimes the investment in logistics pays off in performance.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "travel_carpool",
      text: "You carpooled with other racers, sharing the drive, the expenses, the nervous energy. The camaraderie made the journey easier, and now you've got built-in support at the race. Small things like this make the racing community special.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "travel_forgotten_item",
      text: "You forgot something at home—not critical, but annoying. A favorite piece of kit, spare tubes, your preferred nutrition. You've learned to adapt, to make do, to race with what you have. Flexibility is part of racing.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "travel_perfect_prep",
      text: "Everything about today's logistics went perfectly. Arrived early, found easy parking, smooth registration, time to warm up properly. Sometimes racing gods smile on you, and you've got every external factor optimized. Now all that's left is to race.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== NUTRITION =====
  nutrition: [
    {
      id: "nutr_dialed_plan",
      text: "Your race nutrition is now precisely calculated and tested. Specific gels at specific times, bottles with exact carb concentrations, backup options if things don't go to plan. The science of fueling has become second nature.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "nutr_pre_race_meal",
      text: "Your pre-race breakfast has become sacred: same foods, same timing, same preparation. White rice, banana, maple syrup, coffee exactly three hours before start time. Ritual reduces variables, and variables are the enemy of performance.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_stomach_issues",
      text: "You're dealing with minor stomach issues this morning—nothing catastrophic, but not ideal. You've adjusted your pre-race nutrition plan, going lighter, simpler. Sometimes racing is about managing imperfection rather than achieving perfection.",
      triggers: { raceNumber: [4, 5, 6], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_caffeine_strategy",
      text: "You've been strategic about caffeine—limiting intake all week to maximize race-day impact. That morning coffee and the caffeinated gel you're carrying will hit harder because your body isn't habituated. Every detail optimized.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_hydration_plan",
      text: "Hydration has become as calculated as fueling. You've been pre-loading fluids for two days, monitoring urine color, weighing yourself pre and post-ride. The science might seem excessive, but dehydration kills performance faster than almost anything.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_gel_experimentation",
      text: "You've finally found gels that don't upset your stomach during hard efforts. It took trying a dozen different brands and flavors, but now you've got reliable race fuel that your body tolerates. Small victories matter.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_real_food",
      text: "You've started incorporating real food into longer races—rice cakes, bars, even small sandwiches. Something about actual food sits better than gels alone. You're learning to fuel like the pros, with variety and balance.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "nutr_recovery_drink",
      text: "Your post-race recovery nutrition is now planned as carefully as pre-race. Protein shake ready in the cooler, specific ratio of carbs to protein, consumed within thirty minutes of finish. Recovery starts the moment you cross the line.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== RECOVERY =====
  recovery: [
    {
      id: "recov_massage",
      text: "You splurged on a sports massage this week. The therapist worked out knots you didn't know existed, released tension in muscles you'd neglected. The investment in recovery is paying dividends—you feel fresh, supple, ready to race hard.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "recov_sleep_focus",
      text: "You've been obsessive about sleep this week—nine hours per night, dark room, cool temperature, no screens before bed. Recovery happens during sleep, and you're treating it as seriously as training. The fatigue from earlier in the season has lifted.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "recov_easy_week",
      text: "Last week was deliberately easy—reduced volume, no intensity, active recovery rides only. The mental break was as valuable as the physical one. Now you're chomping at the bit to race again, fresh and motivated.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "recov_compression_gear",
      text: "You've been religious about compression gear this season—boots after hard rides, socks during recovery, full-leg sleeves on travel days. Whether it's placebo or science doesn't matter; you feel better, and that's what counts.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["any"] },
      weight: 0.2
    },
    {
      id: "recov_ice_bath",
      text: "The ice bath after your last race was brutal but effective. Twenty minutes of cold immersion, reducing inflammation, accelerating recovery. You're not sure if you'll ever enjoy it, but you've stopped dreading it. It works.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"], minRacesCompleted: 2 },
      weight: 0.2
    },
    {
      id: "recov_yoga_practice",
      text: "Yoga has become part of your recovery protocol. The flexibility, the breathing, the mental calm—all valuable for racing performance. You never thought you'd be a yoga person, but here you are, and your body thanks you for it.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "recov_foam_rolling",
      text: "Your foam roller has become your best friend and worst enemy. The nightly ritual of rolling out tight spots is painful but necessary. You've learned that prevention is easier than cure, and daily maintenance prevents bigger problems.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "recov_rest_day",
      text: "You actually took a complete rest day this week—no riding, no gym, just relaxation. It felt wrong at first, like you were being lazy. But the science is clear: rest days are when adaptation happens. Your legs feel sharp, responsive, ready.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    }
  ],

  // ===== COMMUNITY =====
  community: [
    {
      id: "comm_race_friends",
      text: "You've made genuine friends through racing. People who understand why you do this, who share the suffering, who celebrate your wins and empathize with your losses. The community has become as valuable as the racing itself.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "comm_mentor_guidance",
      text: "An experienced racer has taken you under their wing, offering advice, sharing hard-won wisdom, helping you avoid mistakes they made. Having a mentor in the sport accelerates learning exponentially. You're grateful for the guidance.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "comm_paying_forward",
      text: "You've started helping newer racers the way others helped you. Answering questions, offering encouragement, sharing what you've learned. The cycling community thrives on this knowledge transfer, and you're now part of that tradition.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "comm_online_community",
      text: "Your online cycling community has been invaluable—training advice, equipment recommendations, moral support during tough patches. These digital connections translate to real friendships, and you've met several of these online friends at races now.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "comm_group_ride_roots",
      text: "The group rides where you first learned to race are still your training foundation. Those same riders pushed you in the beginning, and you're still pushing each other. That weekly ritual keeps you honest, keeps you improving.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "comm_volunteer_gratitude",
      text: "You're more aware now of all the volunteers who make racing possible—course marshals, registration staff, officials, support crew. These races don't happen without people giving their time freely. Your appreciation has grown with understanding.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "comm_shop_support",
      text: "Your local bike shop has become more than just a retail space—it's community headquarters. The staff know your name, follow your results, offer support beyond just selling equipment. Small businesses like this make local racing possible.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "comm_spectator_energy",
      text: "The spectators along the course provide energy you can't quantify but definitely feel. Strangers cheering, calling out encouragement, ringing cowbells. That support matters, especially in the hard moments. You make a mental note to thank them after.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "comm_post_race_hangout",
      text: "The post-race hangout has become as important as the race itself. Comparing notes, sharing stories, laughing about near-misses. The camaraderie of cyclists gathered around bikes and coolers, united by shared suffering and joy.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "comm_diversity",
      text: "You've been struck by the diversity in cycling—different ages, backgrounds, body types, all united by love of the sport. The community is more welcoming than you expected, more inclusive. Everyone belongs who's willing to suffer together.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== MENTALGAME =====
  mentalGame: [
    {
      id: "mental_negative_thoughts",
      text: "You woke up with doubts swirling. What if you're not recovered? What if you're not strong enough? What if you fail? You're working to quiet those voices, to replace negative thoughts with productive focus. The mental battle starts before the physical one.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mental_confidence_building",
      text: "You spent the morning reviewing your recent results, reminding yourself of what you're capable of. Building confidence from evidence, not hope. You've earned the right to believe in yourself—now you just need to race like it.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["podium", "top10"], requiresPreviousResults: true },
      weight: 0.5
    },
    {
      id: "mental_present_moment",
      text: "You're working hard to stay present—not worrying about what might happen, not replaying past mistakes, just staying here, now, in this moment. Mindfulness in racing sounds New Age, but it works. The only moment you can control is this one.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "mental_acceptance",
      text: "You've made peace with uncertainty. You can't control the weather, the field, mechanicals, luck. All you can control is your effort and your attitude. That acceptance is liberating—you're free to race without the weight of trying to control the uncontrollable.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "mental_pre_race_music",
      text: "Your pre-race playlist has become part of your ritual. The same songs, in the same order, putting you in the right headspace. Music as psychological preparation, as confidence builder, as bridge from normal life to racing intensity.",
      triggers: { raceNumber: [4, 5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "mental_letting_go",
      text: "You're learning to let go of expectations. They only create pressure and disappointment. Today you're racing to see what happens, to test yourself without the burden of specific outcome requirements. Freedom to race without fear of failure.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    }
  ],

  // ===== LEARNING =====
  learning: [
    {
      id: "learn_podcast_education",
      text: "You've been devouring cycling podcasts—training science, race tactics, pro interviews. The commute and cooking time have become educational opportunities. Every podcast teaches something you can apply to your racing.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "learn_video_analysis",
      text: "You've started filming your races, studying the footage afterward. Seeing yourself from outside reveals so much: position errors, missed opportunities, habits you didn't know you had. The camera doesn't lie about your racing.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "learn_book_knowledge",
      text: "Your nightstand is now stacked with cycling books—training manuals, race biographies, tactical guides. You're building theoretical knowledge to complement practical experience. The best racers are students of the sport.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "learn_asking_questions",
      text: "You've gotten comfortable asking questions of faster riders. How did you know to attack there? What were you thinking in that moment? Most experienced racers are happy to share knowledge if you ask respectfully. Your learning has accelerated through their wisdom.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "learn_mistakes_log",
      text: "You keep a racing journal documenting mistakes and lessons learned. That positioning error, that tactical choice, that pacing mistake—written down, analyzed, committed to memory. You're determined not to make the same mistake twice.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "learn_cornering_clinic",
      text: "You attended a cornering clinic this off-season, learning proper technique from experts. The difference between adequate and excellent cornering is huge in races. Those hours of practice are translating to confidence and speed through technical sections.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["top10", "podium"] },
      weight: 0.4
    },
    {
      id: "learn_nutrition_science",
      text: "You've gone deep on nutrition science—reading research papers, experimenting with different fueling strategies, tracking what works. The body is an engine, and you're learning to fuel it optimally. Knowledge is turning into performance.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "learn_power_data",
      text: "Understanding power data has revolutionized your training. You can see fitness trends, identify limiters, structure workouts precisely. The numbers provide objective feedback that feelings can't match. Data-driven training works.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "learn_race_observation",
      text: "When you're not racing, you watch races—noting tactics, studying pack dynamics, analyzing breakaway math. Every race is a classroom if you're paying attention. Observation accelerates learning beyond just your own race experience.",
      triggers: { raceNumber: [5, 6, 7, 8], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "learn_coaching_investment",
      text: "Hiring a coach was expensive but transformative. The personalized guidance, the accountability, the expert eye identifying your specific limiters—it's accelerated your development dramatically. Investment in expertise pays returns.",
      triggers: { raceNumber: [6, 7, 8, 9], performanceTier: ["top10", "podium"] },
      weight: 0.5
    },
    {
      id: "learn_bike_fit",
      text: "A professional bike fit revealed issues you didn't know existed. Hip angle, knee tracking, shoulder position—all optimized now. The investment in proper positioning is paying off in power output, comfort, and injury prevention.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "learn_mental_training",
      text: "You've been working with sports psychology resources—visualization techniques, anxiety management, focus training. The mental side of racing is as trainable as the physical, and you're seeing benefits in how you handle pressure and adversity.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.4
    }
  ],

  // ===== STAGERACEPREP ===== (NEW)
  stageRacePrep: [
    {
      id: "stage_race_first_tour",
      text: "The Local Tour is different from anything you've raced before. Three stages over three days means racing with tired legs, managing recovery between stages, and thinking about the overall classification instead of just today's result. You've been studying stage race tactics, learning how to pace across multiple days, understanding that winning stage one means nothing if you blow up on stage three.",
      triggers: { raceNumber: [13], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "stage_race_gc_mindset",
      text: "Stage racing requires a completely different mindset. Every decision affects not just today but tomorrow and the day after. Attack too much on stage one and you'll pay for it on the queen stage. Ride too conservatively and you'll give away time you can't get back. It's a three-day chess match, and you're still learning the opening moves.",
      triggers: { raceNumber: [13], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "stage_race_recovery_prep",
      text: "The key to stage racing isn't just how you race—it's how you recover. You've spent the week leading into the Local Tour practicing your between-stage routine: nutrition, hydration, sleep, compression, stretching. Race hard, recover fast, repeat. Your legs need to be ready to race again tomorrow, and the day after.",
      triggers: { raceNumber: [13], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "stage_two_aftermath",
      text: "Yesterday's stage is still in your legs. You can feel it—that deep fatigue that comes from racing hard less than 24 hours ago. The warm-up felt heavier than usual, your heart rate climbing faster than normal. This is what stage racing demands: the ability to perform when you're not fully fresh, to race on tired legs and still dig deep when it matters.",
      triggers: { raceNumber: [14], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "stage_two_gc_awareness",
      text: "You studied the GC standings this morning, analyzing time gaps, calculating what needs to happen today. Every second matters now. The riders ahead of you on GC are marked—you need to stay with them at minimum, drop them if possible. The riders behind you are threats—let them get away and your GC position evaporates. It's not just about today's stage finish; it's about the overall.",
      triggers: { raceNumber: [14], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "queen_stage_pressure",
      text: "The queen stage. Two days of racing in your legs, and the hardest day still ahead. This is where the Local Tour will be decided—where leads are defended or lost, where attacks are made or broken, where the overall classification crystallizes into its final form. The accumulated fatigue, the climbing, the pressure of GC implications—it all comes together today.",
      triggers: { raceNumber: [15], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "queen_stage_defending",
      text: "You're defending a GC position today, which means riding smart, not just hard. Cover the attacks from riders behind you. Don't waste energy chasing moves that don't matter. Stay with the contenders. The queen stage is where tours are lost more often than won—one bad moment, one lapse in concentration, and all the work from the previous stages evaporates.",
      triggers: { raceNumber: [15], performanceTier: ["any"], gcPosition: [1, 2, 3, 4, 5] },
      weight: 0.8
    },
    {
      id: "queen_stage_attacking",
      text: "You're behind on GC, which means today is for attacking. Sitting in won't change anything—you need to take time back, and the only way to do that is to hurt yourself and hope your rivals hurt more. The queen stage favors the desperate, the brave, the riders with nothing to lose. That's you today.",
      triggers: { raceNumber: [15], performanceTier: ["any"], gcPosition: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
      weight: 0.8
    },
    {
      id: "stage_race_experience",
      text: "Everything you learned in one-day races has to be recalibrated for stage racing. Efforts that feel sustainable for a single race become unsustainable across three days. Positioning that seems cautious in a one-day event becomes smart when you need to race again tomorrow. You're learning a new kind of racing, one measured in accumulated fatigue and multi-day strategy.",
      triggers: { raceNumber: [13, 14], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "final_stage_everything",
      text: "This is it—the final stage of both the Local Tour and your first season. Everything comes down to today: the GC classification, the season standings, the culmination of months of training and racing. Your legs are tired, your mind is tired, but this is the moment that matters most. Leave nothing in reserve. The off-season starts tomorrow.",
      triggers: { raceNumber: [15], performanceTier: ["any"] },
      weight: 0.9
    }
  ],

  // ===== STAGINGSTRUGGLE ===== (NEW)
  stagingStruggle: [
    {
      id: "stage_two_fatigue",
      text: "Your legs lied to you this morning. The warm-up felt okay, normal even. Then the stage started and within five kilometers you realized yesterday's effort took more out of you than you thought. The pace feels harder than it should, the accelerations hurt more than normal, and you're working just to stay in contact. This is stage racing—competing on tired legs.",
      triggers: { raceNumber: [14], performanceTier: ["midpack", "back"] },
      weight: 0.8
    },
    {
      id: "recovery_failure",
      text: "You did everything right last night—ate well, stretched, elevated your legs, got decent sleep. But somehow it wasn't enough. Your body hasn't recovered from yesterday's effort, and now you're paying for it. Each acceleration feels like it's coming from an empty tank. Stage racing is brutal: race hard, recover as best you can, race hard again. Sometimes recovery just doesn't come.",
      triggers: { raceNumber: [14, 15], performanceTier: ["back", "midpack"] },
      weight: 0.7
    },
    {
      id: "gc_math_desperation",
      text: "You spent the entire stage doing GC math in your head. 'If I finish here, and they finish there, I move up two spots. If I can stay with that group, I only lose 30 seconds.' Stage racing becomes an obsession with numbers, gaps, and positions. But math doesn't help when your legs just don't have the strength to execute the calculations.",
      triggers: { raceNumber: [14, 15], performanceTier: ["midpack", "back"] },
      weight: 0.6
    },
    {
      id: "watching_gc_slip",
      text: "The group containing the GC contenders rolled away, and you couldn't respond. You tried—attacked out of your chase group, drilled it on the climbs, but the gap just grew. Watching your GC ambitions disappear up the road while you suffer in the second group is a particular kind of painful. The tour isn't over, but your shot at a top GC placing probably is.",
      triggers: { raceNumber: [14, 15], performanceTier: ["midpack", "back"] },
      weight: 0.8
    },
    {
      id: "stage_race_learning",
      text: "Every stage is a lesson in pacing, recovery, and race management. Today's lesson was harsh: you can't race every stage like it's your last. The aggressive move that felt smart in the moment cost you energy you needed later. Stage racing punishes enthusiasm and rewards patience. You're learning, but the tuition is expensive.",
      triggers: { raceNumber: [14, 15], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "mental_fatigue_tour",
      text: "The physical fatigue is one thing—your legs hurt, your body is tired. But the mental fatigue of stage racing might be harder. Staying focused when you're exhausted, making tactical decisions with a fogged mind, finding motivation to push hard when every fiber of your being wants to soft-pedal. Your mind is as tired as your legs.",
      triggers: { raceNumber: [15], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "cumulative_damage",
      text: "It's not one big blow-up that ends your GC hopes—it's the accumulation of small losses. Thirty seconds lost on stage one. Another forty-five seconds today. Suddenly you're two minutes down with one stage left, and barring disaster for those ahead, your GC position is cemented. Stage racing is ruthless in how it accumulates time gaps.",
      triggers: { raceNumber: [14, 15], performanceTier: ["midpack", "back"], gcPosition: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
      weight: 0.7
    },
    {
      id: "survival_mode_tour",
      text: "You're in survival mode now—forget about GC placing, forget about stage wins. The goal is simple: finish the tour. Get through today, get through tomorrow, make it to the finish line with your dignity intact. It's not the Local Tour you dreamed of, but finishing a three-day stage race is an accomplishment regardless of the result.",
      triggers: { raceNumber: [14, 15], performanceTier: ["back"] },
      weight: 0.7
    },
    {
      id: "legs_not_responding",
      text: "Your mind wanted to go with that attack, but your legs just said no. That's the reality of racing on accumulated fatigue—the communication between brain and muscles breaks down. You see the move, you know you should cover it, you try to respond, and your legs simply don't have the snap. Stage racing exposes limitations you didn't know you had.",
      triggers: { raceNumber: [14, 15], performanceTier: ["midpack", "back"] },
      weight: 0.6
    },
    {
      id: "respect_for_stage_racers",
      text: "You have new respect for professional stage racers who do this for three weeks straight. Three days is brutal enough—imagining twenty-one days of racing on tired legs seems impossible. The Local Tour is teaching you what Grand Tour riders endure, and you're only seeing a tiny fraction of it. Stage racing is a different kind of suffering.",
      triggers: { raceNumber: [14, 15], performanceTier: ["any"] },
      weight: 0.5
    }
  ],

  // ===== GCBATTLE ===== (NEW)
  gcBattle: [
    {
      id: "gc_gaps_checking",
      text: "Every few kilometers you're checking your cycling computer, doing mental math on time gaps. 'They're 45 seconds ahead, I'm 20 seconds behind the next group.' The GC battle happens in seconds, not minutes, and every split matters. You're hyper-aware of who's around you, who's ahead, and what it all means for the overall classification.",
      triggers: { raceNumber: [14, 15], performanceTier: ["podium", "top10"], gcPosition: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      weight: 0.8
    },
    {
      id: "gc_leader_pressure",
      text: "Wearing the leader's jersey (or being on the virtual podium) changes everything. Suddenly you're marked. Every attack is aimed at you. Every acceleration is a test. You're no longer hunting—you're being hunted, and that's a very different kind of pressure. Defending is harder than attacking. You're learning that now.",
      triggers: { raceNumber: [14, 15], performanceTier: ["any"], gcPosition: [1, 2, 3] },
      weight: 0.9
    },
    {
      id: "gc_attacking_move",
      text: "This was your moment to make a move on GC. You attacked hard, trying to distance the riders ahead of you in the classification. For a few glorious kilometers, you dangled off the front, gaining time. But stage racing is cruel—attacks cost energy, and that energy bill comes due later. Whether the gamble pays off depends on whether you can hold the gap to the finish.",
      triggers: { raceNumber: [14, 15], performanceTier: ["podium", "top10", "win"] },
      weight: 0.8
    },
    {
      id: "gc_covering_attacks",
      text: "You spent the entire stage in defensive mode—covering attacks from riders behind you on GC, marking moves, staying vigilant. It's exhausting to race reactively, always responding rather than initiating. But when you're protecting a GC position, you don't need to win the stage. You just need to not lose time.",
      triggers: { raceNumber: [14, 15], performanceTier: ["any"], gcPosition: [1, 2, 3, 4, 5] },
      weight: 0.8
    },
    {
      id: "gc_time_bonuses",
      text: "Time bonuses for stage placings suddenly matter enormously. Five seconds for third place doesn't sound like much, but when GC gaps are measured in seconds, those bonuses can move you up or down the classification. You're racing for every second now, calculating whether it's worth the effort to sprint for a top-three stage finish.",
      triggers: { raceNumber: [14, 15], performanceTier: ["podium", "top10"], gcPosition: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      weight: 0.7
    },
    {
      id: "gc_podium_hope",
      text: "You're in striking distance of a GC podium. Not the win, probably, but a top-three overall is within reach if things go right today. That possibility changes how you race—more aggressive than if you were defending, more calculated than if you had nothing to lose. You're in the dangerous middle ground where mistakes cost dearly.",
      triggers: { raceNumber: [15], performanceTier: ["any"], gcPosition: [4, 5, 6] },
      weight: 0.9
    },
    {
      id: "gc_gaps_stable",
      text: "The GC gaps have been remarkably stable across the stages. No one has made a decisive move, no one has blown up spectacularly. That means today becomes even more critical—the status quo can't hold forever, and someone needs to make something happen. Will it be you, or will you be responding to someone else's move?",
      triggers: { raceNumber: [15], performanceTier: ["any"], gcPosition: [1, 2, 3, 4, 5] },
      weight: 0.6
    },
    {
      id: "gc_mathematical_certainty",
      text: "You've done the math a hundred times: the gap to first place is too big to close unless something dramatic happens. You're racing for pride now, for a good final GC placing, for a stage win if the opportunity presents itself. The overall victory is out of reach, but there's still racing to be done and positions to fight for.",
      triggers: { raceNumber: [15], performanceTier: ["any"], gcPosition: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      weight: 0.7
    },
    {
      id: "gc_seconds_matter",
      text: "You lost the stage by fifteen seconds but gained five seconds on your GC rival. In the moment, losing the stage stung. But when you check the overall standings and see you've moved up a position, the pain eases. Stage racing is about the long game—sacrificing stage glory for GC position, accepting losses that actually move you forward overall.",
      triggers: { raceNumber: [14, 15], performanceTier: ["top10"], gcPosition: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      weight: 0.7
    },
    {
      id: "gc_final_shake",
      text: "The queen stage is where the GC will be decided—no more tactical games, no more conserving energy. Today is about going as hard as you can for as long as you can and seeing where you end up when the suffering is over. The accumulated fatigue from previous stages adds another layer of difficulty. This is where tours are won and lost.",
      triggers: { raceNumber: [15], performanceTier: ["any"] },
      weight: 0.8
    }
  ],

  // ===== TIMETRIALMINDSET ===== (NEW)
  timeTrialMindset: [
    {
      id: "tt_naked_effort",
      text: "There's something both terrifying and liberating about time trials. No pack to hide in, no tactics to consider, no one to blame but yourself. It's just you and the bike and the clock, and the only question is: how much power can you sustain before your body says no? Your FTP is about to be revealed to everyone watching.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "tt_pacing_anxiety",
      text: "The pacing strategy for this time trial has been keeping you awake at night. Start too hard and you'll blow up spectacularly in the final minutes. Too conservative and you'll leave watts on the table. You've practiced the effort dozens of times, but race day always adds variables—adrenaline, wind, that voice in your head screaming to go harder.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "tt_suffering_alone",
      text: "The unique suffering of time trials is that you're doing it alone. No one to share the pain with, no one to push you through the bad moments, just you and the mounting fatigue and the clock ticking. When your legs start screaming at the halfway point, there's no pack to hide in. You either push through or you don't.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "tt_numbers_game",
      text: "Time trials are a numbers game, and you've been obsessing over them. Your FTP, your power-to-weight ratio, your average speed from training efforts. You know exactly what you're capable of on paper. Now you get to find out if you can deliver those numbers under the pressure of competition, when your heart rate is elevated and your mind is screaming that you're going too hard.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "tt_mental_battle",
      text: "The mental game in time trials is brutal. Every second feels like an hour when you're at threshold. Your brain keeps suggesting reasons to ease off—'you're going too hard,' 'you'll blow up,' 'this pace isn't sustainable.' You have to override every self-preservation instinct and trust your training. The clock doesn't care about your discomfort.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.7
    },
    {
      id: "tt_aero_obsession",
      text: "You've been obsessing over aerodynamics—position on the bike, tucking your elbows, keeping your head down. At time trial speeds, aero matters as much as power. Every watt saved through better position is a watt you can put into the pedals. You've practiced your TT position until it's almost comfortable, but 'almost' is the key word.",
      triggers: { raceNumber: [4, 10], performanceTier: ["top10", "podium", "win"] },
      weight: 0.6
    },
    {
      id: "tt_no_hiding",
      text: "In a road race, you can have an off day and still finish anonymously in the pack. In a time trial, there's nowhere to hide. Your result will tell everyone exactly how strong you were today—no excuses about bad positioning, no blaming the pack. Just you versus the clock, and the clock doesn't lie.",
      triggers: { raceNumber: [4, 10], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "tt_breakthrough_potential",
      text: "Time trials are where pure fitness gets rewarded. No lucky breaks, no clever tactics—just sustained power output. If you've done the training, if you've built your FTP, if you can hold threshold for the full duration, you'll see it reflected in the result. This is your chance to prove the winter training block was worth it.",
      triggers: { raceNumber: [4, 10], performanceTier: ["podium", "top10", "win"] },
      weight: 0.7
    }
  ],

  // ===== TRACKRACING ===== (NEW)
  trackRacing: [
    {
      id: "track_first_velodrome",
      text: "The velodrome is intimidating in person. The banking is steeper than it looks in videos, the track surface is unforgiving, and the speed at which riders take the turns seems impossible. You've been practicing, but racing on the track is different from training on it. The elimination format means one mistake and you're done—no second chances, no recovering from a bad position.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "track_elimination_stress",
      text: "Every lap in an elimination race feels like sudden death. Stay near the front, cover moves, accelerate out of turns, and whatever you do, don't be last across the line. The constant vigilance is exhausting—twenty laps of high-intensity efforts with no time to rest. One lap of inattention and you're watching the rest of the race from the sidelines.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.9
    },
    {
      id: "track_banking_mastery",
      text: "You're starting to trust the banking—leaning into turns at speeds that would terrify you on the road. The track demands confidence in bike handling. Hesitate and you lose momentum. Brake in the corners and you drift down the banking. The riders who excel here ride with a smoothness that makes it look easy. You're not quite there yet.",
      triggers: { raceNumber: [3], performanceTier: ["top10", "podium", "win"] },
      weight: 0.6
    },
    {
      id: "track_sprint_intervals",
      text: "An elimination race is essentially twenty consecutive sprint efforts with no recovery. Your anaerobic capacity is being tested to its limit. Each lap you accelerate hard, hold the pace, then have to do it again fifteen seconds later. By lap ten, your legs are screaming. By lap fifteen, you're racing on willpower and lactic acid.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "track_positioning_paramount",
      text: "On the track, positioning is everything. Get stuck on the outside of a turn and you're done—too much extra distance to make up. Drift to the back of the group and you'll be eliminated. You need to be constantly aware of your position relative to every other rider, every moment of every lap. It's exhausting mentally before it even becomes exhausting physically.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.8
    },
    {
      id: "track_fixed_gear_rhythm",
      text: "Racing on a fixed gear is its own skill—no coasting, no shifting, just pure rhythm and cadence. You can't rest on descents (there are none), you can't shift for attacks, you just have to modulate your power output through leg speed. It's both limiting and freeing. You're learning to love the simplicity of fixed gear racing.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.5
    }
  ],

  // ===== SEASONCONTEXTCLOSING ===== (NEW)
  seasonContextClosing: [
    // WINNING STREAK CLOSINGS
    {
      id: "streak_momentum_unstoppable",
      text: "Right now, you're the rider everyone else is worried about. The momentum is real, the confidence is building, and every start line feels like another opportunity to prove this isn't a fluke—it's who you are.",
      triggers: { isOnStreak: true, stagesCompleted: [1, 2, 3, 4, 5, 6] },
      weight: 0.9
    },
    {
      id: "streak_riding_high",
      text: "Winning changes you. Not your character, but your expectations. You're starting to believe that podiums aren't lucky breaks—they're where you belong. Keep this rolling.",
      triggers: { isOnStreak: true, stagesCompleted: [3, 4, 5, 6, 7] },
      weight: 0.9
    },
    {
      id: "streak_pressure_building",
      text: "Success breeds expectation. You've set a standard now, and every race carries the weight of maintaining it. That pressure is good—it means you're doing something worth protecting.",
      triggers: { isOnStreak: true, stagesCompleted: [4, 5, 6, 7, 8] },
      weight: 0.8
    },
    {
      id: "streak_late_season_surge",
      text: "Late-season form is the best kind of form. While others fade with accumulated fatigue, you're hitting peak fitness at exactly the right time. This is where championships are won.",
      triggers: { isOnStreak: true, stagesCompleted: [7, 8, 9] },
      weight: 0.9
    },
    {
      id: "streak_dominant_campaign",
      text: "This is what a dominant campaign looks like—consistent, relentless, always at the front. You're not just participating in this season; you're controlling it.",
      triggers: { isOnStreak: true, totalWins: [3, 4, 5, 6, 7, 8] },
      weight: 0.8
    },
    
    // GOOD FORM CLOSINGS
    {
      id: "form_sharp_end",
      text: "You're racing with the kind of consistency that builds careers. Not flashy, not dominant, but reliably competitive. Those steady top-10s accumulate into something significant.",
      triggers: { recentPosition: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], stagesCompleted: [3, 4, 5, 6, 7] },
      weight: 0.8
    },
    {
      id: "form_podium_regular",
      text: "Multiple podiums don't happen by accident. You've proven you can compete at the front, and that's the foundation everything else builds on. Stay hungry.",
      triggers: { totalPodiums: [3, 4, 5, 6, 7, 8], stagesCompleted: [4, 5, 6, 7, 8] },
      weight: 0.8
    },
    {
      id: "form_breakthrough_close",
      text: "You're knocking on the door. Top-5 finishes are becoming routine, and that consistency suggests a win isn't far off. Sometimes you have to be patient, keep showing up, and let the breakthrough come to you.",
      triggers: { recentPosition: [2, 3, 4, 5, 6], totalWins: [0], stagesCompleted: [4, 5, 6, 7] },
      weight: 0.9
    },
    {
      id: "form_points_banking",
      text: "Points accumulation is the name of the game, and you're banking them steadily. Every top-15 finish adds to the total, every top-10 strengthens your position. Consistency wins seasons.",
      triggers: { totalPoints: [200, 250, 300, 350, 400], stagesCompleted: [5, 6, 7, 8] },
      weight: 0.7
    },
    {
      id: "form_competitive_rhythm",
      text: "You've found your rhythm in the peloton. The races don't feel as chaotic anymore, the pace doesn't seem as impossible, and you're reading situations before they develop. Experience is turning into competence.",
      triggers: { stagesCompleted: [4, 5, 6, 7], recentPosition: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      weight: 0.7
    },
    {
      id: "form_respect_earned",
      text: "You're starting to get the nod from other riders—that subtle acknowledgment that you're legitimate, that you belong here. Respect in the peloton is earned through results, and you're earning it.",
      triggers: { totalPodiums: [2, 3, 4, 5], stagesCompleted: [5, 6, 7, 8] },
      weight: 0.8
    },
    
    // EARLY SEASON CLOSINGS
    {
      id: "early_foundation_building",
      text: "The season is still taking shape, and so are you. Every race teaches something, every result adds data. You're building a foundation—not dramatic, not flashy, but solid.",
      triggers: { stagesCompleted: [1, 2, 3], totalPoints: [0, 50, 100, 150, 200] },
      weight: 0.8
    },
    {
      id: "early_learning_curve",
      text: "Three races in, you're already racing smarter than race one. The learning curve is steep but you're climbing it. Give yourself time to adapt to this level of competition.",
      triggers: { stagesCompleted: [3], recentPosition: [10, 15, 20, 25, 30] },
      weight: 0.8
    },
    {
      id: "early_potential_showing",
      text: "The flashes of potential are there—moments in races where everything clicks, where you see what's possible. Now it's about making those moments more frequent, more sustained.",
      triggers: { stagesCompleted: [2, 3], improvementFromPrediction: [3, 5, 7, 10] },
      weight: 0.7
    },
    {
      id: "early_commitment_tested",
      text: "This is the phase where commitment gets tested. The racing is harder than you expected, the competition fiercer, the demands greater. But you're still showing up, still racing, still pushing. That matters.",
      triggers: { stagesCompleted: [2, 3, 4], recentPosition: [15, 20, 25, 30] },
      weight: 0.8
    },
    {
      id: "early_season_long",
      text: "It's a long season, and you're playing the long game. Not every race needs to be spectacular. Some are about survival, about learning, about not giving up. You're doing the work.",
      triggers: { stagesCompleted: [1, 2, 3, 4], totalPoints: [0, 50, 100, 150] },
      weight: 0.7
    },
    
    // MID SEASON CLOSINGS
    {
      id: "mid_season_push",
      text: "The season's middle chapters are where campaigns are defined. Not the explosive start, not the dramatic finish, but the sustained effort through the middle miles. You're in the grind now.",
      triggers: { stagesCompleted: [5, 6, 7], totalPoints: [200, 250, 300, 350] },
      weight: 0.8
    },
    {
      id: "mid_pivotal_moment",
      text: "This is a pivotal stretch. Strong results now could launch you into championship contention. Weak results could leave you fighting for scraps in the final races. The middle matters.",
      triggers: { stagesCompleted: [5, 6], totalPoints: [250, 300, 350, 400] },
      weight: 0.8
    },
    {
      id: "mid_habits_forming",
      text: "You're developing habits now—pre-race routines, pacing strategies, recovery protocols. These habits, formed in the season's middle, will define how you finish.",
      triggers: { stagesCompleted: [6, 7], recentPosition: [5, 10, 15, 20] },
      weight: 0.7
    },
    {
      id: "mid_second_wind",
      text: "Some riders fade at mid-season. Others find a second wind. You're searching for yours—that renewed motivation, that fresh focus that carries through to the end.",
      triggers: { stagesCompleted: [6, 7], recentPosition: [12, 15, 18, 20, 22, 25] },
      weight: 0.7
    },
    
    // LATE SEASON CLOSINGS
    {
      id: "late_final_push",
      text: "The final races carry extra weight—not just for points, but for how you'll remember this season. You're tired, everyone's tired, but this is when champions dig deepest.",
      triggers: { stagesCompleted: [8, 9], totalPoints: [300, 400, 500, 600] },
      weight: 0.9
    },
    {
      id: "late_no_regrets",
      text: "Leave nothing in the tank. The off-season is for rest; the final races are for emptying yourself completely. You'll have months to recover. You'll only have these moments once.",
      triggers: { stagesCompleted: [8, 9], recentPosition: [1, 2, 3, 4, 5, 10, 15, 20] },
      weight: 0.9
    },
    {
      id: "late_position_defense",
      text: "You've built a solid season position, and now it's about protecting it. Every race matters, every point counts. Finish strong and cement your place in the final standings.",
      triggers: { stagesCompleted: [8, 9], totalPoints: [400, 450, 500, 550] },
      weight: 0.8
    },
    {
      id: "late_season_redemption",
      text: "The season hasn't gone as planned, but it's not over. A strong finish can salvage pride, can prove the early struggles were temporary. Use these final races to show what you're really capable of.",
      triggers: { stagesCompleted: [8, 9], totalPoints: [100, 150, 200, 250], recentPosition: [15, 20, 25, 30] },
      weight: 0.8
    },
    {
      id: "late_championship_pressure",
      text: "Championship pressure is a privilege. Not everyone gets to race with meaningful stakes in the final events. Embrace the pressure—it means you've done something worth protecting.",
      triggers: { stagesCompleted: [8, 9], totalPoints: [500, 550, 600, 650, 700] },
      weight: 0.9
    },
    
    // STRUGGLING FORM CLOSINGS
    {
      id: "struggle_character_building",
      text: "This is the part of the season that builds character—the races where nothing clicks, where you're just trying to survive. These experiences make you tougher, even if they don't make you faster right now.",
      triggers: { recentPosition: [25, 30, 35, 40], stagesCompleted: [3, 4, 5, 6, 7] },
      weight: 0.9
    },
    {
      id: "struggle_one_result",
      text: "One result changes everything. One good race shifts momentum, restores confidence, reminds you why you started. You're one performance away from feeling completely different about this season.",
      triggers: { recentPosition: [20, 25, 30], totalPoints: [50, 100, 150, 200], stagesCompleted: [4, 5, 6, 7] },
      weight: 0.9
    },
    {
      id: "struggle_experience_value",
      text: "These tough races are deposits in an experience bank you'll draw on for years. Every struggle teaches resilience, every hard day builds mental toughness. The value isn't always immediate.",
      triggers: { recentPosition: [25, 30, 35], stagesCompleted: [3, 4, 5, 6] },
      weight: 0.8
    },
    {
      id: "struggle_showing_up",
      text: "The hardest part of a tough season is continuing to show up. No one would fault you for DNS entries, for taking it easy, for protecting your ego. But you're still racing. That takes guts.",
      triggers: { recentPosition: [30, 35, 40], stagesCompleted: [5, 6, 7, 8] },
      weight: 0.8
    },
    {
      id: "struggle_breakthrough_coming",
      text: "Breakthroughs often come after extended struggles—not despite them, but because of them. You're building something here, even if you can't see it yet. Trust the process.",
      triggers: { recentPosition: [20, 25, 30], totalPoints: [100, 150, 200], stagesCompleted: [4, 5, 6, 7] },
      weight: 0.7
    }
  ],

  // ===== PERSONALITY DRIVEN NARRATIVES =====
  // Stories that appear based on rider's interview personality profile
  personalityDriven: [
    // CONFIDENT PERSONALITY
    {
      id: "confident_swagger",
      text: "You've been carrying yourself differently lately—more swagger, more certainty. The self-doubt that used to creep in before races has been replaced by a calm confidence. You know what you're capable of now, and it shows in how you race.",
      triggers: { minRacesCompleted: 3, personalityMin: { confidence: 70 } },
      weight: 0.8
    },
    {
      id: "confident_predictions",
      text: "Your post-race interviews have been bold lately, predictions stated with conviction rather than hedged with maybes. Some might call it cocky. You call it knowing your own abilities and not being afraid to back yourself.",
      triggers: { minRacesCompleted: 4, personalityMin: { confidence: 75 } },
      weight: 0.7
    },
    {
      id: "confident_mentality",
      text: "There's a mental shift happening. Where you once hoped to compete, you now expect to win. That mindset adjustment is subtle but powerful—it changes how you approach every race, every tactical decision, every moment when the race gets hard.",
      triggers: { performanceTier: ["podium", "win"], personalityMin: { confidence: 70 } },
      weight: 0.8
    },

    // HUMBLE PERSONALITY
    {
      id: "humble_grounded",
      text: "Success hasn't changed you. After each good result, you're quick to credit the competition, to acknowledge the role of luck and timing. It's not false modesty—you genuinely respect how hard this is, how thin the margins are, how much can change in a single race.",
      triggers: { performanceTier: ["podium", "win"], personalityMin: { humility: 70 } },
      weight: 0.8
    },
    {
      id: "humble_learning",
      text: "You're treating every race like a classroom. Win or lose, there's something to learn from the riders around you. After races, you find yourself analyzing what others did well, storing away tactics and strategies for future use. The learning never stops.",
      triggers: { minRacesCompleted: 3, personalityMin: { humility: 65 } },
      weight: 0.7
    },
    {
      id: "humble_respect",
      text: "The cycling community has noticed your humility. After races, you're the one shaking hands, complimenting strong rides, acknowledging good racing from others. That respect you show? It's being returned, slowly building a reputation as someone people want to race with.",
      triggers: { minRacesCompleted: 5, personalityMin: { humility: 70 } },
      weight: 0.6
    },

    // AGGRESSIVE PERSONALITY
    {
      id: "aggressive_edge",
      text: "Your rivals are starting to recognize a pattern: you don't back down. Where others might play it safe, you attack. Where others might be diplomatic, you speak your mind. Racing isn't just about winning for you—it's about proving something every time you pin on a number.",
      triggers: { minRacesCompleted: 3, personalityMin: { aggression: 70 }, requiresRivalHistory: true },
      weight: 0.9
    },
    {
      id: "aggressive_fire",
      text: "There's a competitive fire burning that wasn't there at the start of the season. You're racing angry now—not at anyone specific, but at losing, at being beaten, at anything less than your absolute best. That fire can burn you out or forge you into something dangerous. You're betting on the latter.",
      triggers: { performanceTier: ["any"], personalityMin: { aggression: 75 } },
      weight: 0.7
    },
    {
      id: "aggressive_reputation",
      text: "Word is getting around: you're a rider who attacks. In the start corrals, you've noticed riders positioning themselves to mark you, to watch for your moves. They're taking you seriously now. That's respect, earned the hard way.",
      triggers: { minRacesCompleted: 6, personalityMin: { aggression: 70 } },
      weight: 0.6
    },

    // PROFESSIONAL PERSONALITY
    {
      id: "professional_approach",
      text: "You've developed a systematic approach to racing: data analysis, structured training, careful recovery, tactical planning. Nothing left to chance, nothing left unprepared. The romantic notion of racing on pure passion has given way to calculated professionalism.",
      triggers: { minRacesCompleted: 4, personalityMin: { professionalism: 70 } },
      weight: 0.8
    },
    {
      id: "professional_consistency",
      text: "Consistency over flash, steady progress over dramatic swings. Your results are building a pattern—reliable, professional, predictable in the best way. You're becoming the rider others can count on, the one who shows up prepared and executes the plan.",
      triggers: { minRacesCompleted: 5, personalityMin: { professionalism: 75 } },
      weight: 0.7
    },
    {
      id: "professional_measured",
      text: "Your post-race interviews are composed, analytical, focused on process rather than emotion. You talk about power numbers, pacing strategies, tactical decisions. Some might find it dry. You find it effective. Results speak louder than soundbites.",
      triggers: { performanceTier: ["top10", "podium", "win"], personalityMin: { professionalism: 70 } },
      weight: 0.6
    },

    // SHOWMAN PERSONALITY
    {
      id: "showman_entertaining",
      text: "Racing is theater, and you've embraced your role as entertainer. Bold moves, memorable quotes, a willingness to make the race exciting even when it costs you a better result. The fans are starting to notice. So are the journalists covering these events.",
      triggers: { minRacesCompleted: 4, personalityMin: { showmanship: 70 } },
      weight: 0.8
    },
    {
      id: "showman_dramatic",
      text: "You don't just race—you perform. Every attack is committed, every interview is quotable, every result is part of a larger narrative you're writing. Some riders disappear into the peloton. You make sure people remember your name.",
      triggers: { performanceTier: ["win", "podium"], personalityMin: { showmanship: 75 } },
      weight: 0.7
    },
    {
      id: "showman_flair",
      text: "There's a flair to how you race now—a willingness to try the audacious move, to make the bold statement. It doesn't always work, but when it does, it's spectacular. And even when it doesn't, people are talking about it. That's worth something.",
      triggers: { minRacesCompleted: 5, personalityMin: { showmanship: 65 } },
      weight: 0.6
    },

    // RESILIENT PERSONALITY
    {
      id: "resilient_bounce_back",
      text: "Setbacks don't stick to you anymore. Bad races? Learn and move on. Tough results? Analyze what went wrong and fix it. You've developed a mental resilience that might be more valuable than pure physical ability. Champions aren't made on good days—they're made on how they handle bad ones.",
      triggers: { minRacesCompleted: 4, personalityMin: { resilience: 70 } },
      weight: 0.9
    },
    {
      id: "resilient_growth",
      text: "Every challenge has become an opportunity for growth in your mind. Struggles aren't failures—they're data points, lessons, stepping stones to something better. That perspective shift is powerful. It means you're never really losing, only learning.",
      triggers: { performanceTier: ["midpack", "back"], personalityMin: { resilience: 75 } },
      weight: 0.8
    },
    {
      id: "resilient_warrior",
      text: "Your teammates and competitors have noticed: you don't quit. Terrible race? You're back the next week. Get dropped? You chase back. Crash out? You're already planning the comeback. That warrior mentality can't be taught—it has to be forged through adversity. You're forging it now.",
      triggers: { minRacesCompleted: 6, personalityMin: { resilience: 70 } },
      weight: 0.7
    },

    // MIXED PERSONALITY COMBINATIONS
    {
      id: "confident_humble_balance",
      text: "You've found an interesting balance: confident in your abilities but humble about your place in the sport. You back yourself without disrespecting the competition. It's a rare combination—the self-belief needed to win mixed with the groundedness that keeps you improving.",
      triggers: { performanceTier: ["podium", "win"], personalityMin: { confidence: 65, humility: 65 } },
      weight: 0.7
    },
    {
      id: "aggressive_professional",
      text: "Your racing style is interesting: tactically aggressive but methodically professional. You attack with purpose, not recklessness. Every move is calculated, even the bold ones. It's making you dangerous—unpredictable in execution but entirely predictable in intent: you're here to win.",
      triggers: { minRacesCompleted: 5, personalityMin: { aggression: 65, professionalism: 65 } },
      weight: 0.7
    },
    {
      id: "humble_resilient",
      text: "There's a quiet strength in how you're approaching this season. Grateful for every opportunity, resilient through every setback. You don't demand attention or make bold claims—you just keep showing up, keep working, keep improving. That steady persistence is building into something formidable.",
      triggers: { minRacesCompleted: 4, personalityMin: { humility: 65, resilience: 65 } },
      weight: 0.7
    },
    {
      id: "showman_confident",
      text: "You've got the full package now: the confidence to back up your words and the showmanship to make sure those words are memorable. Pre-race predictions delivered with conviction, post-race interviews full of quotable moments. And the results to justify the swagger. It's working.",
      triggers: { performanceTier: ["win", "podium"], personalityMin: { showmanship: 65, confidence: 65 } },
      weight: 0.6
    }
  ],

  // ===== CONTRIBUTOR EXCLUSIVE STORIES =====
  // These stories only appear for users who have supported TPV Career Mode
  contributorExclusive: [
    {
      id: "contributor_inner_circle",
      text: "As you warm up, a familiar face from the supporter community waves from the barriers. It's a reminder that you're not just racing for yourself—you're part of something bigger, a community that believes in what TPV Career Mode represents. That golden star next to your name isn't just decoration; it's a badge of belonging.",
      triggers: { requiresContributor: true, performanceTier: "any" },
      weight: 0.7
    },
    {
      id: "contributor_behind_scenes",
      text: "The night before the race, you received a message from the dev team—a thank you for your support and a hint at upcoming features being worked on. Being part of the contributor circle has its perks, including the knowledge that your support directly fuels these innovations. You clip in feeling like an insider.",
      triggers: { requiresContributor: true, raceNumber: [3, 6, 9, 12] },
      weight: 0.6
    },
    {
      id: "contributor_legacy",
      text: "Your contribution to TPV Career Mode isn't just financial—it's a vote of confidence in the virtual cycling community. As you prepare to race, that golden star next to your name reminds you: you're helping build something that will outlast any single race result. Win or lose today, you've already won something bigger.",
      triggers: { requiresContributor: true, performanceTier: ["win", "podium"] },
      weight: 0.8
    },
    {
      id: "contributor_pioneer",
      text: "You were one of the early believers, one of the riders who saw the potential in TPV Career Mode before it was proven. That pioneering spirit carries over to your racing—you don't just follow the pack, you help shape what's possible. Today's race is another chapter in a story you're helping to write.",
      triggers: { requiresContributor: true, minRacesCompleted: 5 },
      weight: 0.6
    },
    {
      id: "contributor_gratitude",
      text: "Between races, you sometimes forget the contributor badge exists—until you see that star gleaming next to your name in the standings. It's not about recognition; it's about being part of the solution, part of the community that keeps this virtual peloton rolling forward. Every race you complete, every story that unfolds, exists partly because of supporters like you.",
      triggers: { requiresContributor: true },
      weight: 0.5
    }
  ]
};
// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NARRATIVE_DATABASE };
} else if (typeof window !== 'undefined') {
  window.narrativeDatabase = { NARRATIVE_DATABASE };
}
