// narrative-database.js - Comprehensive narrative story elements database
// This contains all possible story moments that can be selected dynamically for each rider

/**
 * NARRATIVE DATABASE STRUCTURE
 * 
 * Categories:
 * - seasonOpening: Season 1 opening narratives (first race setup)
 * - earlyCareer: Events 1-5 story moments
 * - midSeason: Events 6-10 story moments  
 * - lateSeasonIntros: Events 11-15 intro moments
 * - equipment: Bike/gear upgrade stories
 * - lifestyle: Daily life, training, struggles
 * - offSeason: Winter training, preparation
 * - motivation: Inspiration moments
 * - breakthrough: Key performance moments
 * - setback: Dealing with disappointment
 * - rivalry: Interactions with specific competitors
 * - localColor: Race location/venue details
 */

const NARRATIVE_DATABASE = {
  
  // ===== SEASON OPENING NARRATIVES =====
  // These set the scene for a rider's first race
  seasonOpening: [
    {
      id: "opening_hometown",
      text: "Six months ago you were racing your local club rides, wondering if you had what it takes to compete at a higher level. Now you're lined up at {eventName}, registration paid, race number pinned on, heart pounding with a mixture of excitement and pure terror. The riders around you look fast—lean, confident, decked out in team kit that probably costs more than your entire bike. You've trained for this, visualized this, dreamed about this moment. But standing here in the pre-race churn of nervous energy and racing bikes, the reality hits differently than the fantasy. This is it. This is actually happening.",
      triggers: { raceNumber: 1 },
      used: false
    },
    {
      id: "opening_leap",
      text: "The decision to race seriously didn't come gradually—it came all at once, late one night scrolling through race results and realizing you'd been making excuses for too long. A few weeks later you registered for {eventName}, paid the entry fee before you could change your mind, and committed to showing up no matter how intimidating it felt. Your bike isn't the newest model and your kit doesn't match, but you've put in the training miles. You've done the intervals until your legs burned and your lungs screamed. Standing at the start line now, you're exactly where you chose to be. Nervous? Absolutely. Ready? Time to find out.",
      triggers: { raceNumber: 1 },
      used: false
    },
    {
      id: "opening_investment",
      text: "The registration fee for {eventName} felt steep—money you could've spent on anything else. But you clicked 'confirm payment' anyway because something inside you needed to know if you could actually do this. The weeks of training that followed were harder than expected: early morning rides when the bed felt impossibly comfortable, interval sessions that left you gasping, nights falling asleep wondering if you were good enough. But you showed up, week after week, and now here you are at the start line, surrounded by riders who've been doing this for years. They don't know you're new to this. They don't know this is your first real race. And that's exactly how you want to keep it.",
      triggers: { raceNumber: 1 },
      used: false
    }
  ],

  // ===== EARLY CAREER MOMENTS (Events 1-5) =====
  earlyCareer: [
    {
      id: "early_bike_struggles",
      text: "Your bike isn't the problem—you keep telling yourself that as you pass another rider on a carbon race machine that costs more than your car. It's not about the equipment, it's about the legs. At least that's what you're choosing to believe right now as your aluminum frame clatters over rough pavement while the rider ahead seems to float effortlessly on electronic shifting. You'll upgrade eventually, but first you need to prove you can race. First you need results.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["midpack", "back"] },
      weight: 0.7
    },
    {
      id: "early_race_day_routine",
      text: "You're still figuring out your pre-race routine. Coffee? No coffee? Eat two hours before or three? You watch other riders going through their warm-up routines with practiced ease—static stretches, a few openers on the trainer, calves perfectly taped—while you're still anxiously checking your tire pressure for the third time. Everyone had to start somewhere, you remind yourself. They've just had more practice at looking like they belong here.",
      triggers: { raceNumber: [1, 2, 3], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "early_first_upgrade",
      text: "After weeks of researching and comparing prices, you finally pulled the trigger: new wheels. Not the top-tier carbon dream wheels, but a solid mid-range upgrade that represents a serious chunk of your budget. When you first spun them up, the difference was immediately noticeable—smoother, faster, more responsive. Whether they'll actually make you faster in races remains to be seen, but psychologically, they've already paid dividends. You feel more like a real racer now, like someone who's in this for real.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["top10", "podium", "win"] },
      weight: 0.5
    },
    {
      id: "early_nutrition_learning",
      text: "You bonked hard in your last race—that terrible, empty-tank feeling where your legs just stop responding. Turns out racing requires a completely different fueling strategy than training rides. Now you're carrying gels, bars, and sports drink, maybe too much of everything, paranoid about running out of energy again. Other riders make it look effortless, grabbing feed bags on the fly and unwrapping bars one-handed at 40 kph. You'll get there. For now, you're just trying not to forget to eat before it's too late.",
      triggers: { raceNumber: [2, 3, 4], performanceTier: ["back"] },
      weight: 0.6
    },
    {
      id: "early_first_good_result",
      text: "Something clicked in that last race—you're not entirely sure what. Maybe it was better positioning, maybe you're finally getting fitter, maybe you just got lucky with the break. Whatever it was, you finished higher than you expected, higher than you dared hope, and suddenly this whole racing thing feels possible. Not easy, not guaranteed, but possible. You caught yourself checking the results repeatedly, just to make sure your name was really there, that you really did finish that high. It's a small result in the grand scheme of things, but it feels huge.",
      triggers: { raceNumber: [3, 4, 5], performanceTier: ["podium", "top10"], improvementFromPrediction: 5 },
      weight: 0.8
    }
  ],

  // ===== MID-SEASON MOMENTS (Events 6-10) =====
  midSeason: [
    {
      id: "mid_confidence_building",
      text: "The pack dynamics are starting to make sense now. You can read moves before they happen, anticipate attacks, find the right wheels to follow. What felt like chaos a few races ago now has patterns, rhythms, logic. You're not just surviving in the peloton anymore—you're racing with intent. The nervousness hasn't disappeared, but it's been joined by something else: confidence, earned through repetition and results.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["top10", "podium"], consecutiveGoodResults: 2 },
      weight: 0.7
    },
    {
      id: "mid_equipment_upgrade",
      text: "The new bike arrived this week—a proper race machine, not just an upgraded version of your old setup but a completely different category of equipment. Carbon frame, electronic shifting, integrated cockpit, the works. It represents months of saving, of choosing to skip other expenses, of committing fully to this racing thing. When you first threw your leg over it, the difference was staggering: lighter, stiffer, more responsive. You almost don't want to race on it, too precious to risk in the chaos of competition. But bikes are meant to be ridden, especially race bikes.",
      triggers: { raceNumber: [7, 8, 9], performanceTier: ["win", "podium"], totalPoints: 100 },
      weight: 0.6
    },
    {
      id: "mid_training_dedication",
      text: "The off-bike training has become as important as the riding itself. You've set up a corner of your place as a makeshift gym: yoga mat, resistance bands, foam roller, a set of dumbbells picked up secondhand. Core work three times a week, mobility sessions, strength training focused on the posterior chain. It's not glamorous—nobody watches the Tour de France for the planks and single-leg deadlifts—but this is where races are won. In the invisible hours between events, in the unglamorous work that nobody sees.",
      triggers: { raceNumber: [7, 8, 9, 10], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "mid_financial_reality",
      text: "Racing isn't cheap, and the costs add up faster than you anticipated: entry fees, equipment, travel, food, the endless small expenses that weren't part of the original budget. You've started packing your own race-day meals, driving instead of flying when possible, researching every discount and deal available. Some riders roll up in team vans with mechanics and soigneurs; you roll up in your car with sandwiches in a cooler. It's not the dream, but it's honest work, and you're making it happen on your own terms.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["midpack", "back"] },
      weight: 0.6
    },
    {
      id: "mid_rival_emergence",
      text: "There's a rider you keep seeing in results, someone racing a similar schedule who seems to be on a similar trajectory. You've never spoken, barely made eye contact, but you track their results obsessively. When they finish ahead of you, it stings more than it should. When you beat them, the satisfaction is disproportionate. This unspoken rivalry has become a motivating force, an extra reason to push when the training gets hard. Racing is both collective and individual, and right now, your measuring stick has a name and a race number.",
      triggers: { raceNumber: [8, 9, 10], performanceTier: ["top10", "podium"] },
      weight: 0.7
    }
  ],

  // ===== LATE SEASON INTROS (Events 11-15) =====
  lateSeasonIntros: [
    {
      id: "late_season_fatigue",
      text: "The season is taking its toll. You can feel it in the way your legs respond to hard efforts, in the extra time needed for recovery, in the mental weight of showing up race after race. This is where consistency matters most—when everyone is tired, when the excitement of early season has faded into the grind, when it would be easy to skip a race or mail in a performance. But this is also where you separate yourself. The riders who show up tired and race anyway are the ones who finish the season strong.",
      triggers: { raceNumber: [11, 12, 13], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "late_season_reflection",
      text: "Looking back at where you started this season, the progress is undeniable. The rider who toed the line at Event 1, nervous and uncertain, barely resembles who you are now. You've learned to race, learned to suffer, learned what you're capable of when you commit fully. There are still races to go, still chances to improve, but you've already proven something important to yourself: you belong here.",
      triggers: { raceNumber: [13, 14], performanceTier: ["win", "podium", "top10"] },
      weight: 0.7
    },
    {
      id: "late_final_push",
      text: "Everything comes down to these final races. Points accumulated over months, form built through countless training hours, lessons learned in a dozen race situations—it all matters now. The standings are still fluid, positions can change, and every place gained or lost carries weight. You've come too far to coast now. This is where you empty the tank, leave nothing in reserve, and find out what you're really made of.",
      triggers: { raceNumber: [13, 14, 15], performanceTier: ["any"] },
      weight: 0.8
    }
  ],

  // ===== LIFESTYLE & DAILY LIFE =====
  lifestyle: [
    {
      id: "life_morning_routine",
      text: "The alarm goes off at 5:30 AM and for three full seconds you debate whether racing is really worth this. Then you remember why you started: the feeling of speed, the challenge, the person you're becoming through this process. You roll out of bed, stumble to the kitchen, start the coffee. By the time you're clipped in and rolling through dark streets, the exhaustion has transformed into something else—anticipation, purpose, the quiet satisfaction of doing hard things before most people are awake.",
      triggers: { raceNumber: [2, 3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.4
    },
    {
      id: "life_grocery_store",
      text: "The grocery store has become a different place since you started racing seriously. You find yourself reading nutrition labels obsessively, calculating protein content, comparing carbohydrate sources. Your cart looks different too—less junk food, more rice and pasta, vegetables actually purchased with intent rather than guilt. Other shoppers probably think you're either a bodybuilder or have some kind of eating disorder. They don't know you're just trying to fuel a racing habit that demands more calories than seems possible.",
      triggers: { raceNumber: [4, 5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    },
    {
      id: "life_social_sacrifice",
      text: "Your friends have stopped inviting you to late-night events. They know you'll either decline because of early training rides or show up and leave early, checking your watch and calculating sleep hours. Racing has rearranged your social life in ways you didn't fully anticipate. Some relationships have faded; others have adapted. The ones who matter understand that this isn't forever, just right now, just this season while you chase something that matters to you.",
      triggers: { raceNumber: [5, 6, 7], performanceTier: ["any"] },
      weight: 0.3
    }
  ],

  // ===== MOTIVATION & INSPIRATION =====
  motivation: [
    {
      id: "motiv_tour_watching",
      text: "You stayed up late watching Tour de France highlights, studying how the professionals navigate the chaos of the peloton, how they position themselves before climbs, the body language that telegraphs attacks before they happen. It's inspiring and humbling in equal measure—you're racing at a completely different level, but the fundamental challenge is the same: human against human, will against will, the question of who wants it more when everyone is suffering. Tomorrow's training ride feels different after watching the pros. Harder. More purposeful. More real.",
      triggers: { raceNumber: [3, 4, 5, 6], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "motiv_why_you_race",
      text: "Someone asked you why you race, and you struggled to articulate an answer that made sense. For the competition? For the fitness? Because suffering builds character? All true, none complete. The real answer is messier: you race because it makes you feel alive in a way few other things do. Because it's hard and therefore meaningful. Because you're curious about your own limits. Because pushing through discomfort and emerging on the other side is addictive. Not everyone understands that, and that's okay. You're not doing this for them.",
      triggers: { raceNumber: [6, 7, 8], performanceTier: ["any"] },
      weight: 0.4
    }
  ],

  // ===== BREAKTHROUGH MOMENTS =====
  breakthrough: [
    {
      id: "break_first_win",
      text: "You won. Actually won. Not just placed well, not just exceeded expectations, but crossed the line first with everyone else behind you. The feeling is indescribable—euphoria mixed with disbelief mixed with validation of every hard training session and early morning and sacrifice. You keep replaying it: the decisive move, the gap opening, the final meters where you could taste victory before you had it. This changes things. Not just the result itself but what it proves about what's possible. You're not just participating anymore. You're competing. You're winning.",
      triggers: { performanceTier: ["win"], isFirstWin: true },
      weight: 1.0
    },
    {
      id: "break_podium_streak",
      text: "Three races, three podiums. This isn't luck anymore—it's form, consistency, the accumulation of everything you've been working toward. Other riders are starting to recognize you at race sign-in, and not just casually but with the kind of respect reserved for genuine competitors. You're being marked now, watched, covered. It's a different kind of pressure, but pressure you've earned. The question isn't whether you can compete at this level anymore. The question is how much higher you can go.",
      triggers: { performanceTier: ["podium"], consecutivePodiums: 3 },
      weight: 0.9
    }
  ],

  // ===== SETBACK MOMENTS =====
  setback: [
    {
      id: "set_mechanical",
      text: "A mechanical ended your race today—chain drop, derailleur issue, something that could've been prevented with better pre-race prep. You sat on the roadside while the peloton disappeared, feeling equal parts frustration and self-recrimination. These are the lessons that stick: check everything twice, maintain your equipment obsessively, never assume things will just work. Racing is unforgiving of small mistakes. You won't make this one again.",
      triggers: { performanceTier: ["back"], isWorseResult: true },
      weight: 0.6
    },
    {
      id: "set_bad_day",
      text: "Some days the legs just aren't there. No explanation, no warning, just the terrible realization mid-race that you're off form and there's nothing you can do about it. You fought through to the finish, but it was ugly—dropped on climbs you normally handle easily, gapped on accelerations that shouldn't hurt. The important thing isn't that you had a bad day—everyone has bad days. The important thing is that you finished, that you learned what it feels like to race when everything hurts, and that tomorrow is another chance.",
      triggers: { performanceTier: ["back"], predictedMuchBetter: true },
      weight: 0.7
    }
  ],

  // ===== LOCAL COLOR (Race-Specific) =====
  localColor: [
    {
      id: "color_coast_and_roast",
      text: "The Coast and Roast Crit has a reputation: fast, technical, and absolutely unforgiving of positioning mistakes. The tight corners come rapid-fire, and one moment of hesitation can cost you twenty places. Locals dominate this race because they know every corner, every rough patch, exactly where to brake and where to carry speed. You're learning, but the learning curve is steep and painful.",
      triggers: { raceNumber: [1], performanceTier: ["any"] },
      weight: 0.5
    },
    {
      id: "color_forest_velodrome",
      text: "Track racing is a different animal entirely—nowhere to hide, nowhere to rest, just raw speed and tactical awareness. The Forest Velodrome Elimination is particularly brutal: every lap someone goes home, and the pressure is relentless from the opening whistle. You can feel the track banking under your tires, the strange sensation of leaning into turns at impossible angles, the way everything happens faster than it does on the road.",
      triggers: { raceNumber: [3], performanceTier: ["any"] },
      weight: 0.6
    },
    {
      id: "color_unbound",
      text: "Unbound - Little Egypt isn't your typical race. The gravel sections are rough and unpredictable, the distance is long enough to expose any weakness in fitness or pacing, and the whole event has this adventurous, slightly wild energy that's different from standard road racing. Some riders thrive here; others suffer and wonder why they signed up. You're about to find out which category you fall into.",
      triggers: { raceNumber: [12], performanceTier: ["any"] },
      weight: 0.7
    }
  ],

  // ===== OFF-SEASON & PREPARATION =====
  offSeason: [
    {
      id: "off_season_training",
      text: "Winter training is different from racing season: less intense, more volume, focused on building the base that'll support next season's efforts. You're putting in long, steady hours in the cold, sometimes questioning why you're out here when you could be warm inside. But you know that seasons are built in the off-season, that the work done now in anonymity will pay dividends when racing resumes. It's not glamorous, but it's necessary.",
      triggers: { raceNumber: [1], performanceTier: ["any"] },
      weight: 0.4
    }
  ]
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NARRATIVE_DATABASE };
} else if (typeof window !== 'undefined') {
  window.narrativeDatabase = { NARRATIVE_DATABASE };
}
