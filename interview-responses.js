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
    text: "After some tough races, this one felt extra sweet. To win in a photo finish shows I'm exactly where I need to be mentally.",
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
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INTERVIEW_RESPONSES };
}
