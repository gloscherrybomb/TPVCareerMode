// Interview Responses Database
// Each response has personality impacts that shape the rider's media persona

const INTERVIEW_RESPONSES = {

  // ===== WIN RESPONSES =====

  // Dominant Win
  win_dom_confident: {
    id: 'win_dom_confident',
    text: "I knew I had the legs today. When I attacked, nobody could follow. That's what training is for.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      humility: -2,
      professionalism: 1
    }
  },

  win_dom_humble: {
    id: 'win_dom_humble',
    text: "The legs felt good and I got lucky with the break. The competition was strong—I'm just grateful for the result.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      confidence: 1,
      humility: 4,
      professionalism: 2
    }
  },

  win_dom_showman: {
    id: 'win_dom_showman',
    text: "That was for everyone who doubted me. I came here to make a statement, and I think the message was received loud and clear.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      confidence: 3,
      showmanship: 4,
      aggression: 1
    }
  },

  // Close Win
  win_close_showman: {
    id: 'win_close_showman',
    text: "That's bike racing at its finest! When it comes down to the wire, you either have it or you don't. Today, I had it.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 4,
      confidence: 2
    }
  },

  win_close_professional: {
    id: 'win_close_professional',
    text: "Close finishes come down to positioning and timing. I was where I needed to be when it mattered. That's the job.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  win_close_resilient: {
    id: 'win_close_resilient',
    text: "When it's that close, you have to dig deep. To win in a photo finish shows I'm exactly where I need to be mentally.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      confidence: 2
    }
  },

  // Standard Win
  win_standard_confident: {
    id: 'win_standard_confident',
    text: "I've been building towards this. When you put in the work, results follow. Simple as that.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      professionalism: 1
    }
  },

  win_standard_humble: {
    id: 'win_standard_humble',
    text: "I'm just grateful to be competing at this level. The other riders pushed me to be better today, and I'm thankful for that.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  win_standard_professional: {
    id: 'win_standard_professional',
    text: "We executed the race plan perfectly. I felt strong, conserved energy, and delivered when it counted. That's professional cycling.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  // ===== PODIUM RESPONSES =====

  // Beat Prediction Podium
  podium_beat_confident: {
    id: 'podium_beat_confident',
    text: "Predictions are just numbers. I know what I'm capable of, and today I showed it. This is just the beginning.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 1
    }
  },

  podium_beat_humble: {
    id: 'podium_beat_humble',
    text: "I surprised myself today, honestly. The competition was tough and I learned so much from the riders who finished ahead of me.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 2
    }
  },

  podium_beat_professional: {
    id: 'podium_beat_professional',
    text: "We executed the race plan well. I positioned smartly, conserved energy where I could, and delivered. That's bike racing.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  // Standard Podium
  podium_std_confident: {
    id: 'podium_std_confident',
    text: "A podium is a good result, but I came here to win. Next time, I'll be on the top step.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 2,
      aggression: 2
    }
  },

  podium_std_humble: {
    id: 'podium_std_humble',
    text: "I'm happy with the result. The winner rode a great race, and I'm learning something new every time I compete.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 1
    }
  },

  podium_std_professional: {
    id: 'podium_std_professional',
    text: "Consistent podiums build a career. I'm focused on improving every race and the results will take care of themselves.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 1
    }
  },

  // Top Ten
  top_ten_positive: {
    id: 'top_ten_positive',
    text: "Top ten is solid. I'm progressing every race, and that's what matters. The wins will come.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 3,
      professionalism: 1
    }
  },

  top_ten_analytical: {
    id: 'top_ten_analytical',
    text: "There were moments where I could've positioned better. I'll analyze the data and come back sharper next time.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 1
    }
  },

  top_ten_ambitious: {
    id: 'top_ten_ambitious',
    text: "Top ten isn't enough for me. I've got bigger goals. This is a stepping stone, not the destination.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 2,
      aggression: 2
    }
  },

  // Beat Prediction Significantly
  beat_pred_confident: {
    id: 'beat_pred_confident',
    text: "Those predictions didn't account for how hard I've been training. I knew I could surprise people today.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      showmanship: 1
    }
  },

  beat_pred_humble: {
    id: 'beat_pred_humble',
    text: "I got lucky with my positioning and the race played to my strengths. I'm as surprised as anyone.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  beat_pred_surprised: {
    id: 'beat_pred_surprised',
    text: "I honestly didn't expect that! Sometimes everything just clicks and you have a breakthrough race. Hope I can build on this.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 2,
      resilience: 2
    }
  },

  // ===== RIVALRY RESPONSES =====

  // First Encounter
  rival_first_professional: {
    id: 'rival_first_professional',
    text: "{rivalName} is clearly a strong rider. It was a good test to see where I am, and I learned a lot from racing them.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      humility: 1
    }
  },

  rival_first_aggressive: {
    id: 'rival_first_aggressive',
    text: "I noticed {rivalName}. They're fast, but so am I. Looking forward to the next time we line up together.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      confidence: 2
    }
  },

  rival_first_humble: {
    id: 'rival_first_humble',
    text: "{rivalName} rode brilliantly. I'm glad to be racing against riders of that caliber—it makes me better.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  // Beat Rival
  rival_beat_confident: {
    id: 'rival_beat_confident',
    text: "{rivalName} is fast, but today I was faster. I respect their abilities, but I'm here to win.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 1
    }
  },

  rival_beat_aggressive: {
    id: 'rival_beat_aggressive',
    text: "I've got {rivalName}'s number now. They can try to stay with me, but I'm not backing down. This rivalry is just getting started.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 4,
      confidence: 2,
      showmanship: 1
    }
  },

  rival_beat_humble: {
    id: 'rival_beat_humble',
    text: "{rivalName} pushed me to race better today. I got the better result this time, but they're a strong competitor and I learned from racing them.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 2,
      aggression: -1
    }
  },

  // Lost to Rival
  rival_lost_resilient: {
    id: 'rival_lost_resilient',
    text: "{rivalName} rode a great race. I'll learn from this, come back stronger, and we'll see what happens next time.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      professionalism: 1
    }
  },

  rival_lost_aggressive: {
    id: 'rival_lost_aggressive',
    text: "Congratulations to {rivalName}, but this isn't over. I know what I need to work on, and next time will be different.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      resilience: 2
    }
  },

  rival_lost_professional: {
    id: 'rival_lost_professional',
    text: "{rivalName} executed perfectly today. I'll analyze where I can improve and apply those lessons going forward.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      resilience: 1
    }
  },

  // Close Battle
  rival_close_respectful: {
    id: 'rival_close_respectful',
    text: "Racing {rivalName} brings out the best in both of us. That's what competition is all about—pushing each other to the limit.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      humility: 2
    }
  },

  rival_close_confident: {
    id: 'rival_close_confident',
    text: "When it's that close, it comes down to who wants it more. Today, I wanted it more.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 1
    }
  },

  rival_close_dramatic: {
    id: 'rival_close_dramatic',
    text: "You can't script finishes like that! {rivalName} and I are writing one hell of a story here. Fans love it, and honestly, so do I.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 4,
      professionalism: 1
    }
  },

  // Multiple Encounters
  rival_multiple_professional: {
    id: 'rival_multiple_professional',
    text: "We seem to be at similar levels right now. {rivalName} is a great competitor, and racing them makes me sharper.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      humility: 1
    }
  },

  rival_multiple_aggressive: {
    id: 'rival_multiple_aggressive',
    text: "Every time I see {rivalName} in a race, I know I need to bring my A-game. That's fine by me—I thrive on the competition.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      confidence: 2
    }
  },

  rival_multiple_respectful: {
    id: 'rival_multiple_respectful',
    text: "{rivalName} is becoming a good rival. We push each other, respect each other, and the racing is better because of it.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 2,
      professionalism: 3
    }
  },

  // ===== SETBACK RESPONSES =====

  // Worse Than Predicted
  setback_resilient: {
    id: 'setback_resilient',
    text: "Not the result I wanted, but every race teaches you something. I'll analyze what went wrong, work on it, and come back stronger.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      professionalism: 2
    }
  },

  setback_frustrated: {
    id: 'setback_frustrated',
    text: "Honestly? I'm disappointed. I trained hard for this and it didn't come together. Sometimes racing is just frustrating.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      resilience: -1,
      humility: 2,
      professionalism: -1
    }
  },

  setback_analytical: {
    id: 'setback_analytical',
    text: "The numbers don't lie. I wasn't where I needed to be today. Time to look at the data, adjust the training, and improve.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      resilience: 1
    }
  },

  // Back of Pack
  back_resilient: {
    id: 'back_resilient',
    text: "Tough day, no doubt. But champions are built on how you respond to setbacks. I'll be back.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      confidence: 1
    }
  },

  back_honest: {
    id: 'back_honest',
    text: "That was rough. I'm not going to sugar-coat it. But you learn more from the bad days than the good ones.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      humility: 3,
      resilience: 1
    }
  },

  back_learning: {
    id: 'back_learning',
    text: "Every race is a learning opportunity. Today I learned what doesn't work. That's valuable information.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  // Lost to Prediction
  lost_pred_resilient: {
    id: 'lost_pred_resilient',
    text: "Close to the prediction but not quite there. I'm making progress, and that's what counts right now.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 3,
      professionalism: 1
    }
  },

  lost_pred_frustrated: {
    id: 'lost_pred_frustrated',
    text: "I felt like I had more in the tank but couldn't execute. That's frustrating when you know you're capable of better.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      resilience: -1,
      humility: 2
    }
  },

  lost_pred_realistic: {
    id: 'lost_pred_realistic',
    text: "Sometimes the predictions are optimistic. Today was a reality check. I'll adjust expectations and keep working.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      humility: 1
    }
  },

  // Bad Streak
  streak_resilient: {
    id: 'streak_resilient',
    text: "Every athlete goes through rough patches. What defines you is how you respond. I'm doubling down on the work.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 5,
      professionalism: 1
    }
  },

  streak_determined: {
    id: 'streak_determined',
    text: "Adversity reveals character. I'm not backing down, I'm not making excuses. I'm going to work my way out of this.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      resilience: 3,
      aggression: 3
    }
  },

  streak_honest: {
    id: 'streak_honest',
    text: "It's been a tough stretch, not going to lie. But I'd rather struggle honestly than succeed with excuses. I'll figure this out.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      resilience: 2,
      humility: 3
    }
  },

  // DNF Responses
  dnf_resilient: {
    id: 'dnf_resilient',
    text: "It's disappointing, no doubt about it. But a DNF doesn't define me. I'll learn from what went wrong, recover properly, and come back stronger for the next one.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 5,
      professionalism: 2
    }
  },

  dnf_frustrated: {
    id: 'dnf_frustrated',
    text: "I'm gutted, honestly. You put in all that training, all that preparation, and then it ends like this. It's hard not to feel frustrated when things go wrong through no fault of your own.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      humility: 2,
      resilience: -1,
      professionalism: -1
    }
  },

  dnf_analytical: {
    id: 'dnf_analytical',
    text: "We need to analyze exactly what happened and make sure it doesn't happen again. A DNF is a data point—an expensive one—but still something to learn from. I'll work with the team to understand it and move forward.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      resilience: 2
    }
  },

  // ===== TACTICAL RESPONSES =====

  tt_professional: {
    id: 'tt_professional',
    text: "It's all about power management and pacing. I stuck to the plan, hit my targets, and executed. That's all you can do.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4
    }
  },

  tt_confident: {
    id: 'tt_confident',
    text: "Time trials are where you prove you've got the engine. Today, I showed I've got the engine.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      professionalism: 1
    }
  },

  tt_humble: {
    id: 'tt_humble',
    text: "I just focused on my own race, my own watts. The result is what it is. I'm grateful for the opportunity to compete.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 1
    }
  },

  sprint_professional: {
    id: 'sprint_professional',
    text: "Sprints are won in the last 200 meters but set up in the last 2 kilometers. I positioned well and delivered.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4
    }
  },

  sprint_confident: {
    id: 'sprint_confident',
    text: "When the sprint opens up, you've got to commit. I committed, I delivered. That's what sprinters do.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      showmanship: 1
    }
  },

  sprint_learning: {
    id: 'sprint_learning',
    text: "Sprinting is an art. I'm still learning, still improving. Every race teaches me something new about positioning.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 2,
      professionalism: 2
    }
  },

  climb_professional: {
    id: 'climb_professional',
    text: "Climbing is about managing your effort and knowing your limits. I paced it well and got the result I was after.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4
    }
  },

  climb_confident: {
    id: 'climb_confident',
    text: "I love the mountains. That's where you separate yourself. Today, I separated myself.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4
    }
  },

  climb_humble: {
    id: 'climb_humble',
    text: "The climb was hard for everyone. I just tried to stay steady and not blow up. Grateful for how it turned out.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4
    }
  },

  break_tactical: {
    id: 'break_tactical',
    text: "We identified the opportunity, committed to the move, and worked together. Tactical racing at its best.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  break_confident: {
    id: 'break_confident',
    text: "When you see the chance, you take it. I knew we had the legs to make it stick, and we did.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 1
    }
  },

  break_opportunistic: {
    id: 'break_opportunistic',
    text: "Sometimes you've got to gamble. The break went, I went with it, and it paid off. That's bike racing.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 3,
      confidence: 2
    }
  },

  // ===== SEASON PROGRESS RESPONSES =====

  mid_season_confident: {
    id: 'mid_season_confident',
    text: "I'm exactly where I expected to be. The plan is working, the results are coming, and I'm only getting stronger.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      professionalism: 1
    }
  },

  mid_season_humble: {
    id: 'mid_season_humble',
    text: "I'm learning so much. Every race teaches me something new. I'm grateful for the opportunity to keep improving.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  mid_season_analytical: {
    id: 'mid_season_analytical',
    text: "The data is encouraging. I'm trending in the right direction across all metrics. If I keep progressing, the goals are achievable.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4
    }
  },

  streak_showman: {
    id: 'streak_showman',
    text: "This is what I live for! When you're in form like this, you feel unstoppable. Let's see how long we can keep this going!",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 4,
      confidence: 2
    }
  },

  streak_humble: {
    id: 'streak_humble',
    text: "I'm just trying to take it one race at a time. The wins are great, but I'm learning from every race whether I win or not.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  streak_confident: {
    id: 'streak_confident',
    text: "When you're prepared and you execute, this is what happens. I'm not surprised. I knew this form was coming.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      professionalism: 1
    }
  },

  podium_streak_confident: {
    id: 'podium_streak_confident',
    text: "Consistency is key, and I'm delivering. Every race I'm in contention. That's what builds a career.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      professionalism: 1
    }
  },

  podium_streak_humble: {
    id: 'podium_streak_humble',
    text: "I'm racing against incredible riders. To consistently be on the podium with them is humbling and motivating.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  podium_streak_pro: {
    id: 'podium_streak_pro',
    text: "We've dialed in the training, the tactics, and the execution. This is the result of systematic improvement.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  first_win_emotional: {
    id: 'first_win_emotional',
    text: "I can't even describe how this feels. All the early mornings, all the hard workouts—it was all for this moment. Incredible.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 3,
      humility: 2,
      resilience: 2
    }
  },

  first_win_confident: {
    id: 'first_win_confident',
    text: "This is just the start. I knew the win would come if I kept working. Now I've got the taste for it—I want more.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 2
    }
  },

  first_win_humble: {
    id: 'first_win_humble',
    text: "I'm so grateful. There are so many people who helped me get here. This win is as much theirs as it is mine.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 5,
      professionalism: 1
    }
  },

  first_podium_excited: {
    id: 'first_podium_excited',
    text: "This is amazing! My first time on the podium. I'm going to enjoy this moment and then get back to work for more.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 3,
      confidence: 2
    }
  },

  first_podium_hungry: {
    id: 'first_podium_hungry',
    text: "It feels great, but I'm already thinking about that top step. This is just the beginning.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 2
    }
  },

  first_podium_grateful: {
    id: 'first_podium_grateful',
    text: "I'm just grateful to be here, to compete at this level. To finish on the podium is more than I could've asked for.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  finale_satisfied: {
    id: 'finale_satisfied',
    text: "Really pleased with how the season went. I achieved most of my goals and learned a ton. Excited for next season.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  finale_ambitious: {
    id: 'finale_ambitious',
    text: "Good season, but I'm hungry for more. I know what I need to work on, and next season I'm aiming even higher.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 2
    }
  },

  finale_reflective: {
    id: 'finale_reflective',
    text: "It's been a journey. Some great moments, some tough ones. But I've grown as a rider and that's what matters most.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      resilience: 2
    }
  },

  // Milestone responses
  milestone_confident: {
    id: 'milestone_confident',
    text: "Five wins shows I'm hitting my stride. The confidence is building with every race. This is just the beginning.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 2
    }
  },

  milestone_humble: {
    id: 'milestone_humble',
    text: "I'm grateful for every opportunity. Five wins is special, but it's really about the team and the support around me.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 1
    }
  },

  milestone_hungry: {
    id: 'milestone_hungry',
    text: "Five down, plenty more to come. I'm not satisfied yet - each win makes me want the next one even more.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 4,
      confidence: 2
    }
  },

  milestone_professional: {
    id: 'milestone_professional',
    text: "Consistency comes from preparation and execution. Ten podiums means we're doing things right as a team.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      resilience: 1
    }
  },

  milestone_grateful: {
    id: 'milestone_grateful',
    text: "Ten podiums is more than I could have hoped for. Every one of them is special and I don't take any for granted.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      resilience: 1
    }
  },

  milestone_ambitious: {
    id: 'milestone_ambitious',
    text: "Ten podiums is a good start, but I want to turn more of those into wins. Time to raise the bar.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 1
    }
  },

  breakthrough_confident: {
    id: 'breakthrough_confident',
    text: "I always knew I had this in me. Mid-season is when champions find another gear - that's what's happening here.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      showmanship: 1
    }
  },

  breakthrough_analytical: {
    id: 'breakthrough_analytical',
    text: "We made some key adjustments to training and tactics. The data doesn't lie - we're on the right track now.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  breakthrough_relieved: {
    id: 'breakthrough_relieved',
    text: "Honestly, it's a relief. Early season was tough, but we kept working and it's finally paying off.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      humility: 1
    }
  },

  // Consistency responses
  consistency_professional: {
    id: 'consistency_professional',
    text: "It's about discipline and process. Show up, execute the plan, recover properly. Repeat. The results follow.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  consistency_humble: {
    id: 'consistency_humble',
    text: "I'm just trying to do my job every race. The team puts me in position, and I'm fortunate to deliver consistently.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 2
    }
  },

  consistency_focused: {
    id: 'consistency_focused',
    text: "I don't think about the streak. Every race is its own challenge. Stay present, stay focused, get the job done.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      confidence: 2
    }
  },

  progression_patient: {
    id: 'progression_patient',
    text: "Progress doesn't happen overnight. Small improvements add up. I trust the process and stay patient.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  progression_confident: {
    id: 'progression_confident',
    text: "I can feel myself getting stronger every race. The improvements are real and I'm ready for even bigger results.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 2
    }
  },

  progression_tactical: {
    id: 'progression_tactical',
    text: "We're learning from each race and adapting tactics. The upward trend shows we're doing the right things.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      confidence: 1
    }
  },

  comeback_resilient: {
    id: 'comeback_resilient',
    text: "Tough times don't last, tough people do. I never stopped believing, never stopped working. This is what resilience looks like.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      confidence: 2
    }
  },

  comeback_determined: {
    id: 'comeback_determined',
    text: "Those bad results just made me more determined. I had something to prove - to myself and everyone else. Mission accomplished.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      resilience: 3
    }
  },

  comeback_learned: {
    id: 'comeback_learned',
    text: "The struggles taught me a lot about myself and my approach. I've come back stronger and smarter.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 3
    }
  },

  midpack_realistic: {
    id: 'midpack_realistic',
    text: "Not every day is a winning day. Mid-pack keeps you honest and motivated to work harder for the next one.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      resilience: 1
    }
  },

  midpack_motivated: {
    id: 'midpack_motivated',
    text: "This just fires me up more. I know I'm capable of better, and I'll use this as fuel for the next race.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      confidence: 1
    }
  },

  midpack_tactical: {
    id: 'midpack_tactical',
    text: "Sometimes you have to accept where you are and focus on the details. There's always something to learn and improve.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 1
    }
  },

  // Enhanced tactical responses
  tt_analytical: {
    id: 'tt_analytical',
    text: "Time trials are all about the numbers - power, cadence, aerodynamics. When you nail the math, you nail the result.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  tt_satisfied: {
    id: 'tt_satisfied',
    text: "That felt controlled and powerful. Paced it perfectly and finished strong. Very satisfied with today's execution.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      confidence: 2
    }
  },

  tt_powerful: {
    id: 'tt_powerful',
    text: "I felt unstoppable out there. Just me, the bike, and pure power. This is where I excel.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 1
    }
  },

  sprint_tactical: {
    id: 'sprint_tactical',
    text: "Sprint finishes are chess at 60kph. I positioned early, stayed patient, and opened up at exactly the right moment.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  sprint_instinctive: {
    id: 'sprint_instinctive',
    text: "In that final kilometer, you just feel it. No thinking, pure instinct. I trusted my legs and went for it.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      showmanship: 2
    }
  },

  sprint_aggressive: {
    id: 'sprint_aggressive',
    text: "I saw the gap and attacked. Sprints are won by the brave - you hesitate, you lose. I wasn't hesitating today.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 4,
      confidence: 2
    }
  },

  climb_strong: {
    id: 'climb_strong',
    text: "The mountains suit me. When the road goes up, I feel strong. This is where I can really make a difference.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      resilience: 1
    }
  },

  climb_suffering: {
    id: 'climb_suffering',
    text: "Climbing is suffering, but I embrace it. The pain means you're pushing your limits. Today I pushed hard.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      aggression: 1
    }
  },

  climb_confident: {
    id: 'climb_confident',
    text: "I knew I could climb well, but today proved I can hang with anyone in the mountains. Really confident now.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      humility: -1
    }
  },

  attack_calculated: {
    id: 'attack_calculated',
    text: "I studied the race dynamics carefully. Waited for the right moment when everyone was committed elsewhere, then went.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  attack_instinct: {
    id: 'attack_instinct',
    text: "Sometimes you just feel it in your legs and see the opportunity. I trusted my instincts and it paid off.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      aggression: 2
    }
  },

  attack_opportunistic: {
    id: 'attack_opportunistic',
    text: "Racing is about seizing moments. I saw the opening, didn't overthink it, just attacked. Fortune favors the bold.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 4,
      showmanship: 1
    }
  },

  // ===== SPECIAL EVENTS RESPONSES =====

  // Singapore Criterium - Win Responses
  singapore_win_proud: {
    id: 'singapore_win_proud',
    text: "Winning under those lights, with Marina Bay behind us—I'll never forget this. The night racing atmosphere was electric, and to take the victory here means everything. This is what I worked so hard to unlock.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      showmanship: 2
    }
  },

  singapore_win_humble: {
    id: 'singapore_win_humble',
    text: "The setting was incredible, but I tried to focus on the racing. The heat was challenging for everyone. I'm grateful to have earned entry to this event and even more grateful for this result.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      professionalism: 2
    }
  },

  singapore_win_showman: {
    id: 'singapore_win_showman',
    text: "Night racing, Singapore skyline, exclusive entry—and now a victory! This is what racing dreams are made of. The atmosphere was absolutely unreal tonight. I'll be celebrating under these lights all evening!",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 5,
      confidence: 2
    }
  },

  // Singapore Criterium - Podium Responses
  singapore_podium_grateful: {
    id: 'singapore_podium_grateful',
    text: "To stand on this podium, under these lights, in this incredible setting—I'm just so grateful. The journey to get here, to earn entry to this event, and then to finish on the podium? It's overwhelming in the best way.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      resilience: 2
    }
  },

  singapore_podium_confident: {
    id: 'singapore_podium_confident',
    text: "I came here to prove I belong with the best, and a podium does exactly that. Night racing, tropical conditions, exclusive field—I handled it all. Next time, I'm going for the top step.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 1
    }
  },

  singapore_podium_professional: {
    id: 'singapore_podium_professional',
    text: "We prepared specifically for the night format and tropical conditions. Adjusted hydration, adapted warmup, studied the circuit under lights. The preparation paid off with this podium result.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  // Singapore Criterium - Midpack Responses
  singapore_mid_learning: {
    id: 'singapore_mid_learning',
    text: "Night racing is a completely different experience—the shadows, the heat, the intensity. I learned so much tonight. The result isn't what I wanted, but the experience is invaluable for next time.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 2
    }
  },

  singapore_mid_motivated: {
    id: 'singapore_mid_motivated',
    text: "The atmosphere here is incredible, and now I know what it takes to compete at this level. This result lights a fire under me. I'll be back, better prepared, and ready to challenge for the podium.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      resilience: 2
    }
  },

  singapore_mid_resilient: {
    id: 'singapore_mid_resilient',
    text: "The conditions tested everyone out there tonight. I battled through the heat and humidity, adapted to the night format, and finished the race. Not the result I wanted, but I proved I can handle the challenge.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      professionalism: 1
    }
  },

  // Singapore Criterium - Tough Finish Responses
  singapore_tough_honest: {
    id: 'singapore_tough_honest',
    text: "The tropical conditions got the better of me tonight. The humidity was brutal, and I couldn't manage my effort the way I needed to. Tough lesson, but an honest one. I know what to work on now.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      humility: 3,
      resilience: 1
    }
  },

  singapore_tough_resilient: {
    id: 'singapore_tough_resilient',
    text: "It was a rough night, but I finished. The heat, the intensity, the pressure of this exclusive event—it all added up. But I didn't quit, and that means something. I'll come back stronger.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 4,
      professionalism: 1
    }
  },

  singapore_tough_analytical: {
    id: 'singapore_tough_analytical',
    text: "Looking at the data, my power dropped significantly in the final laps—classic heat management failure. The night format and tropical conditions require specific preparation I didn't quite nail. Valuable lesson.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  // The Leveller - Win Responses
  leveller_win_confident: {
    id: 'leveller_win_confident',
    text: "The Leveller tests everything, and today I proved I can do it all. Climbing, sprinting, endurance—it all came together. This result shows I'm not a one-dimensional rider. I'm the complete package.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      professionalism: 1
    }
  },

  leveller_win_humble: {
    id: 'leveller_win_humble',
    text: "It's a great feeling to win an event that tests so many different abilities. I've been working on my weaknesses, and today showed that work is paying off. Still room to improve, but this is encouraging.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      resilience: 2
    }
  },

  leveller_win_tactical: {
    id: 'leveller_win_tactical',
    text: "Points racing is about choosing your battles wisely. I identified which sprints to contest, managed my energy across seven laps, and executed the plan. Tactical discipline won this race.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 1
    }
  },

  // The Leveller - Podium Responses
  leveller_podium_climbing: {
    id: 'leveller_podium_climbing',
    text: "The rolling terrain played to my climbing strengths. I gained time on every rise and protected those advantages on the flat sections. North Lake's profile really suits my abilities.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      professionalism: 2
    }
  },

  leveller_podium_sprint: {
    id: 'leveller_podium_sprint',
    text: "The points format let me use my sprint to full advantage. I picked my moments, won the key sprints, and accumulated points when it mattered. That's how you race The Leveller.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      showmanship: 2
    }
  },

  leveller_podium_allround: {
    id: 'leveller_podium_allround',
    text: "This is the race I was made for—no single skill dominates, you need everything. I'm not the best climber or sprinter individually, but put it all together and I can compete with anyone.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  // The Leveller - Solid Finish Responses
  leveller_solid_learning: {
    id: 'leveller_solid_learning',
    text: "The Leveller is a reality check—it shows you exactly where you stand. I learned a lot about my strengths and weaknesses today. The points format exposed areas I need to develop.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 3,
      professionalism: 2
    }
  },

  leveller_solid_tactical: {
    id: 'leveller_solid_tactical',
    text: "Seven laps is a long time to manage effort and tactics. I made some good decisions and some mistakes. The learning from this race will help me in future points races.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 1
    }
  },

  leveller_solid_patient: {
    id: 'leveller_solid_patient',
    text: "Building all-round ability takes time. This result is part of a longer journey—identifying weaknesses and systematically improving them. I'm patient but determined to climb higher.",
    style: 'resilient',
    badge: '💚 Resilient',
    personalityImpact: {
      resilience: 3,
      professionalism: 2
    }
  },

  // The Leveller - Struggle Responses
  leveller_struggle_honest: {
    id: 'leveller_struggle_honest',
    text: "The Leveller doesn't lie—it exposed gaps in my abilities that I can't ignore. The climbs, the sprints, the endurance... I've got work to do across the board. Humbling, but honest.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      humility: 4,
      resilience: 1
    }
  },

  leveller_struggle_determined: {
    id: 'leveller_struggle_determined',
    text: "Not the result I wanted, but exactly the information I needed. Now I know precisely what to work on. I'll be back for this race, and the result will be very different.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      resilience: 2
    }
  },

  leveller_struggle_analytical: {
    id: 'leveller_struggle_analytical',
    text: "Looking at where I lost points—mostly on the climbs and in the later laps when fatigue set in. Those are trainable weaknesses. I'll analyze the data and build a specific improvement plan.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      resilience: 1
    }
  },

  // Valentine's Invitational - Win Responses
  valentine_win_dedicated: {
    id: 'valentine_win_dedicated',
    text: "While everyone else was sending flowers, I was sending it up the Bosberg. This is what dedication looks like—choosing pain and glory over chocolates and romance. First Valentine's Invitational victory, and it feels better than any bouquet.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 4,
      aggression: 2
    }
  },

  valentine_win_tactical: {
    id: 'valentine_win_tactical',
    text: "The Bosberg demands respect—you can't just attack blindly. I conserved energy on the earlier climbs, positioned myself perfectly, and timed my move for maximum impact. The result speaks for itself.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 4,
      confidence: 2
    }
  },

  valentine_win_romantic: {
    id: 'valentine_win_romantic',
    text: "They say racing is my love language, and today proved it. Conquering the Bosberg, taking the win—this is my kind of Valentine's Day. Racing is romance when you truly love what you do.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 4,
      confidence: 2
    }
  },

  // Valentine's Invitational - Podium Responses
  valentine_podium_proud: {
    id: 'valentine_podium_proud',
    text: "A podium at the Valentine's Invitational, our first race on Belgian soil with so many human competitors—I'm incredibly proud. The Bosberg tested me, but I proved I belong here.",
    style: 'confident',
    badge: '💪 Confident',
    personalityImpact: {
      confidence: 3,
      humility: 2
    }
  },

  valentine_podium_competitive: {
    id: 'valentine_podium_competitive',
    text: "Close to the win, but not quite there. That's the story of Valentine's Day, right? Almost perfect. But I'll take a podium over flowers any day, and next time I'm going for the top step.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      confidence: 2
    }
  },

  valentine_podium_grateful: {
    id: 'valentine_podium_grateful',
    text: "Racing the Bosberg, experiencing Belgian classics heritage, standing on this podium—I'm just grateful to be here. This is a special moment in my career.",
    style: 'humble',
    badge: '🤝 Humble',
    personalityImpact: {
      humility: 4,
      resilience: 1
    }
  },

  // Valentine's Invitational - Midpack Responses
  valentine_mid_learning: {
    id: 'valentine_mid_learning',
    text: "First time racing the Bosberg, first scheduled race away from home, way more human competitors than usual—there was a lot to take in. Solid learning experience. I'll be stronger next time.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      resilience: 2
    }
  },

  valentine_mid_enjoyed: {
    id: 'valentine_mid_enjoyed',
    text: "Racing in Belgium on Valentine's Day? Absolutely loved it. The Bosberg climb is everything they say it is. Not my best result, but definitely an experience I'll remember.",
    style: 'showman',
    badge: '⚡ Showman',
    personalityImpact: {
      showmanship: 3,
      humility: 2
    }
  },

  valentine_mid_motivated: {
    id: 'valentine_mid_motivated',
    text: "The level of competition here is fierce—so many strong riders. That's exactly what I need to improve. I'm taking notes and coming back hungrier.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 3,
      resilience: 2
    }
  },

  // Valentine's Invitational - Tough Race Responses
  valentine_tough_honest: {
    id: 'valentine_tough_honest',
    text: "The Bosberg didn't care that it's Valentine's Day—it showed no mercy. Those rolling hills exposed my weaknesses, and racing against so many humans made it even tougher. Tough day, but honest feedback.",
    style: 'honest',
    badge: '😔 Honest',
    personalityImpact: {
      humility: 4,
      resilience: 1
    }
  },

  valentine_tough_hills: {
    id: 'valentine_tough_hills',
    text: "I underestimated those Belgian climbs. The gradient, the frequency, the cumulative fatigue—351 meters doesn't sound like much until you're grinding through it. Lesson learned the hard way.",
    style: 'professional',
    badge: '🎯 Professional',
    personalityImpact: {
      professionalism: 3,
      humility: 2
    }
  },

  valentine_tough_determined: {
    id: 'valentine_tough_determined',
    text: "Bad result, but I'm not backing down. The Bosberg beat me today, but I'll be back for this race. Next Valentine's Invitational, I'll be ready for those hills.",
    style: 'aggressive',
    badge: '😤 Aggressive',
    personalityImpact: {
      aggression: 4,
      resilience: 2
    }
  }
};

// Export for use in other modules
export { INTERVIEW_RESPONSES };
