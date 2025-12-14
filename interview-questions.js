// Interview Questions Database
// Questions are categorized and triggered based on race context

const INTERVIEW_QUESTIONS = {

  // ===== PERFORMANCE QUESTIONS =====
  performance: {

    win_dominant: {
      id: 'win_dominant',
      text: "You dominated today, winning by {winMargin} seconds. How does it feel?",
      triggers: {
        position: 1,
        winMarginGreaterThan: 30
      },
      responses: ['win_dom_confident', 'win_dom_humble', 'win_dom_showman']
    },

    win_close: {
      id: 'win_close',
      text: "You took the win by just {winMargin} seconds. How tense was that finish?",
      triggers: {
        position: 1,
        winMarginLessThan: 10
      },
      responses: ['win_close_showman', 'win_close_professional', 'win_close_resilient']
    },

    win_standard: {
      id: 'win_standard',
      text: "Congratulations on the victory! What was the key to your success today?",
      triggers: {
        position: 1
      },
      responses: ['win_standard_confident', 'win_standard_humble', 'win_standard_professional']
    },

    podium_beat_prediction: {
      id: 'podium_beat_prediction',
      text: "You finished {position}, well ahead of your {predicted} prediction. What clicked today?",
      triggers: {
        positionIn: [2, 3],
        beatPredictionBy: 5
      },
      responses: ['podium_beat_confident', 'podium_beat_humble', 'podium_beat_professional']
    },

    podium_standard: {
      id: 'podium_standard',
      text: "A {position} place finish today. How do you feel about that result?",
      triggers: {
        positionIn: [2, 3]
      },
      responses: ['podium_std_confident', 'podium_std_humble', 'podium_std_professional']
    },

    top_ten: {
      id: 'top_ten',
      text: "You finished {position} today. What's your takeaway from this race?",
      triggers: {
        positionBetween: [4, 10]
      },
      responses: ['top_ten_positive', 'top_ten_analytical', 'top_ten_ambitious']
    },

    beat_prediction_significantly: {
      id: 'beat_prediction_significantly',
      text: "Predicted {predicted}, but you finished {position}. You beat expectations by a mile. What happened out there?",
      triggers: {
        beatPredictionBy: 8
      },
      responses: ['beat_pred_confident', 'beat_pred_humble', 'beat_pred_surprised']
    },

    win_unexpected: {
      id: 'win_unexpected',
      text: "You weren't predicted to win today, but here you are. How did you pull that off?",
      triggers: {
        position: 1,
        beatPredictionBy: 3
      },
      responses: ['win_standard_confident', 'win_standard_humble', 'beat_pred_surprised']
    },

    podium_climb: {
      id: 'podium_climb',
      text: "You climbed through the field to finish {position}. What changed during the race?",
      triggers: {
        positionIn: [1, 2, 3],
        beatPredictionBy: 4
      },
      responses: ['podium_beat_confident', 'podium_beat_professional', 'beat_pred_confident']
    },

    strong_finish: {
      id: 'strong_finish',
      text: "A strong top-10 finish today. What was working for you out there?",
      triggers: {
        positionBetween: [1, 10]
      },
      responses: ['top_ten_positive', 'top_ten_analytical', 'win_standard_professional']
    },

    race_effort: {
      id: 'race_effort',
      text: "Talk us through your race today. What was the game plan?",
      triggers: {
        positionBetween: [1, 30]
      },
      responses: ['top_ten_analytical', 'win_standard_professional', 'midpack_tactical']
    }
  },

  // ===== RIVALRY QUESTIONS =====
  rivalry: {

    rival_first_encounter: {
      id: 'rival_first_encounter',
      text: "You raced against {rivalName} for the first time today. What did you think?",
      triggers: {
        rivalEncounter: true,
        firstEncounter: true
      },
      responses: ['rival_first_professional', 'rival_first_aggressive', 'rival_first_humble']
    },

    rival_beat_them: {
      id: 'rival_beat_them',
      text: "You beat {rivalName} by {gap} seconds today. Is this becoming a pattern?",
      triggers: {
        rivalEncounter: true,
        userWon: true,
        h2hWins: 2
      },
      responses: ['rival_beat_confident', 'rival_beat_aggressive', 'rival_beat_humble']
    },

    rival_they_won: {
      id: 'rival_they_won',
      text: "{rivalName} got the better of you by {gap} seconds today. How do you respond?",
      triggers: {
        rivalEncounter: true,
        userLost: true
      },
      responses: ['rival_lost_resilient', 'rival_lost_aggressive', 'rival_lost_professional']
    },

    rival_close_battle: {
      id: 'rival_close_battle',
      text: "Just {gap} seconds between you and {rivalName} at the line. That was intense. Talk us through it.",
      triggers: {
        rivalEncounter: true,
        gapLessThan: 5
      },
      responses: ['rival_close_respectful', 'rival_close_confident', 'rival_close_dramatic']
    },

    rival_multiple_encounters: {
      id: 'rival_multiple_encounters',
      text: "You and {rivalName} seem to find each other in every race. Is there something special about this rivalry?",
      triggers: {
        rivalEncounter: true,
        totalEncounters: 4
      },
      responses: ['rival_multiple_professional', 'rival_multiple_aggressive', 'rival_multiple_respectful']
    }
  },

  // ===== SETBACK QUESTIONS =====
  setback: {

    worse_than_predicted: {
      id: 'worse_than_predicted',
      text: "You were predicted around {predicted} but finished {position}. What happened out there?",
      triggers: {
        worseThanPredictionBy: 5,
        positionGreaterThan: 15
      },
      responses: ['setback_resilient', 'setback_frustrated', 'setback_analytical']
    },

    back_of_pack: {
      id: 'back_of_pack',
      text: "A tough day finishing {position}. How do you bounce back from this?",
      triggers: {
        positionGreaterThan: 25
      },
      responses: ['back_resilient', 'back_honest', 'back_learning']
    },

    lost_to_prediction: {
      id: 'lost_to_prediction',
      text: "You came in {position}, a few spots below your prediction. Frustrating?",
      triggers: {
        worseThanPredictionBy: 2,
        positionBetween: [10, 20]
      },
      responses: ['lost_pred_resilient', 'lost_pred_frustrated', 'lost_pred_realistic']
    },

    bad_streak: {
      id: 'bad_streak',
      text: "That's a few tough races in a row now. How are you handling the adversity?",
      triggers: {
        positionGreaterThan: 20,
        recentRacesBelowExpectation: 3
      },
      responses: ['streak_resilient', 'streak_determined', 'streak_honest']
    }
  },


  // ===== SEASON PROGRESS QUESTIONS =====
  season: {

    mid_season_form: {
      id: 'mid_season_form',
      text: "You're {racesCompleted} races in now. How are you feeling about your progression?",
      triggers: {
        racesCompletedBetween: [5, 8]
      },
      responses: ['mid_season_confident', 'mid_season_humble', 'mid_season_analytical']
    },

    winning_streak: {
      id: 'winning_streak',
      text: "That's {winStreak} wins in a row. Are you surprised by your own form?",
      triggers: {
        consecutiveWins: 2
      },
      responses: ['streak_showman', 'streak_humble', 'streak_confident']
    },

    podium_streak: {
      id: 'podium_streak',
      text: "Another podium! That's {podiumStreak} in a row. What's working for you right now?",
      triggers: {
        consecutivePodiums: 3,
        positionIn: [1, 2, 3]
      },
      responses: ['podium_streak_confident', 'podium_streak_humble', 'podium_streak_pro']
    },

    first_win: {
      id: 'first_win',
      text: "Your first career win! This must feel incredible. What does this mean to you?",
      triggers: {
        position: 1,
        careerWins: 1
      },
      responses: ['first_win_emotional', 'first_win_confident', 'first_win_humble']
    },

    first_podium: {
      id: 'first_podium',
      text: "Your first podium finish! How does it feel to be up there?",
      triggers: {
        positionIn: [2, 3],
        careerPodiums: 1
      },
      responses: ['first_podium_excited', 'first_podium_hungry', 'first_podium_grateful']
    },

    season_finale: {
      id: 'season_finale',
      text: "That's the season wrapped up. Looking back, how do you feel about your progression?",
      triggers: {
        isSeasonFinale: true
      },
      responses: ['finale_satisfied', 'finale_ambitious', 'finale_reflective']
    },

    milestone_fifth_win: {
      id: 'milestone_fifth_win',
      text: "That's your 5th career victory! You're really finding your rhythm. What's changed?",
      triggers: {
        position: 1,
        careerWins: 5
      },
      responses: ['milestone_confident', 'milestone_humble', 'milestone_hungry']
    },

    milestone_tenth_podium: {
      id: 'milestone_tenth_podium',
      text: "Your 10th podium finish! The consistency is impressive. What's your secret?",
      triggers: {
        positionIn: [1, 2, 3],
        careerPodiums: 10
      },
      responses: ['milestone_professional', 'milestone_grateful', 'milestone_ambitious']
    },

    mid_season_breakthrough: {
      id: 'mid_season_breakthrough',
      text: "Halfway through the season and you're finding your form. What's clicked for you?",
      triggers: {
        racesCompletedBetween: [7, 9],
        positionIn: [1, 2, 3]
      },
      responses: ['breakthrough_confident', 'breakthrough_analytical', 'breakthrough_relieved']
    },

    early_season_form: {
      id: 'early_season_form',
      text: "Still early in the season. How are you feeling about your form so far?",
      triggers: {
        racesCompletedBetween: [1, 4]
      },
      responses: ['mid_season_confident', 'mid_season_humble', 'mid_season_analytical']
    },

    building_momentum: {
      id: 'building_momentum',
      text: "You seem to be improving race by race. Is the progression going to plan?",
      triggers: {
        beatPredictionBy: 2
      },
      responses: ['progression_confident', 'progression_patient', 'mid_season_analytical']
    },

    season_opener: {
      id: 'season_opener',
      text: "Your first race of the season. How does it feel to be back in competition?",
      triggers: {
        racesCompletedBetween: [1, 1]
      },
      responses: ['mid_season_confident', 'breakthrough_relieved', 'first_podium_excited']
    }
  },

  // ===== CONSISTENCY QUESTIONS =====
  consistency: {

    consistency_top_five: {
      id: 'consistency_top_five',
      text: "Another top-5 finish. You're remarkably consistent this season. How do you maintain this level?",
      triggers: {
        positionBetween: [1, 5],
        racesCompletedBetween: [5, 15]
      },
      responses: ['consistency_professional', 'consistency_humble', 'consistency_focused']
    },

    steady_progression: {
      id: 'steady_progression',
      text: "You're steadily climbing up the field race by race. What's the key to this progression?",
      triggers: {
        positionBetween: [4, 8],
        beatPredictionBy: 3
      },
      responses: ['progression_patient', 'progression_confident', 'progression_tactical']
    },

    comeback_form: {
      id: 'comeback_form',
      text: "After a tough stretch, you're back on form with a strong finish. How did you bounce back?",
      triggers: {
        positionBetween: [1, 5],
        recentRacesBelowExpectation: 2
      },
      responses: ['comeback_resilient', 'comeback_determined', 'comeback_learned']
    },

    mid_pack_grind: {
      id: 'mid_pack_grind',
      text: "Solid mid-pack finish today. These races can be tough. What's your mindset?",
      triggers: {
        positionBetween: [11, 20]
      },
      responses: ['midpack_realistic', 'midpack_motivated', 'midpack_tactical']
    },

    solid_performance: {
      id: 'solid_performance',
      text: "A solid performance today. How satisfied are you with that result?",
      triggers: {
        positionBetween: [1, 15]
      },
      responses: ['progression_patient', 'consistency_professional', 'top_ten_positive']
    },

    meeting_expectations: {
      id: 'meeting_expectations',
      text: "You finished close to your prediction today. Is that where you expected to be?",
      triggers: {
        worseThanPredictionBy: 2,
        beatPredictionBy: 2
      },
      responses: ['consistency_professional', 'midpack_realistic', 'progression_patient']
    },

    learning_experience: {
      id: 'learning_experience',
      text: "Every race is a learning experience. What did you take away from today?",
      triggers: {
        positionBetween: [1, 40]
      },
      responses: ['progression_tactical', 'midpack_motivated', 'back_learning']
    }
  },

  // ===== TACTICAL QUESTIONS =====
  tactical: {

    time_trial_personal_best: {
      id: 'time_trial_personal_best',
      text: "Strong time trial performance today. How did you approach the pacing strategy?",
      triggers: {
        eventType: 'time trial',
        positionBetween: [1, 5]
      },
      responses: ['tt_analytical', 'tt_satisfied', 'tt_powerful']
    },

    time_trial_strategy: {
      id: 'time_trial_strategy',
      text: "Time trials are all about pacing. What was your strategy today?",
      triggers: {
        eventType: 'time trial'
      },
      responses: ['tt_professional', 'tt_confident', 'tt_humble']
    },

    sprint_positioning: {
      id: 'sprint_positioning',
      text: "You positioned yourself perfectly for that sprint finish. How did you read the race?",
      triggers: {
        eventType: 'criterium',
        positionIn: [1, 2, 3]
      },
      responses: ['sprint_tactical', 'sprint_instinctive', 'sprint_aggressive']
    },

    sprint_finish: {
      id: 'sprint_finish',
      text: "The sprint came down to positioning. Were you where you wanted to be?",
      triggers: {
        eventCategory: 'criterium',
        finishType: 'bunch_sprint'
      },
      responses: ['sprint_professional', 'sprint_confident', 'sprint_learning']
    },

    climbing_dominance: {
      id: 'climbing_dominance',
      text: "You looked strong on those climbs. How do you feel about your form in the mountains?",
      triggers: {
        eventType: 'hill climb',
        positionBetween: [1, 5]
      },
      responses: ['climb_strong', 'climb_suffering', 'climb_confident']
    },

    climbing_performance: {
      id: 'climbing_performance',
      text: "That climb was brutal. How did you manage the gradient and pace yourself?",
      triggers: {
        eventType: 'hill climb',
        positionLessThan: 10
      },
      responses: ['climb_professional', 'climb_confident', 'climb_humble']
    },

    breakaway_timing: {
      id: 'breakaway_timing',
      text: "Perfect timing on that move. How did you know when to attack?",
      triggers: {
        eventType: 'road race',
        positionIn: [1, 2]
      },
      responses: ['attack_calculated', 'attack_instinct', 'attack_opportunistic']
    },

    breakaway_success: {
      id: 'breakaway_success',
      text: "You made the break and it stuck. Was that part of the plan?",
      triggers: {
        position: 1,
        raceType: 'road race'
      },
      responses: ['break_tactical', 'break_confident', 'break_opportunistic']
    },

    first_race_nerves: {
      id: 'first_race_nerves',
      text: "First race of the season can be nerve-wracking. How did you handle the pressure?",
      triggers: {
        racesCompletedBetween: [1, 1]
      },
      responses: ['win_standard_professional', 'comeback_determined', 'progression_patient']
    },

    race_tactics_general: {
      id: 'race_tactics_general',
      text: "What was your tactical approach going into this race?",
      triggers: {
        positionBetween: [1, 20]
      },
      responses: ['progression_tactical', 'win_standard_professional', 'midpack_tactical']
    },

    positioning_battle: {
      id: 'positioning_battle',
      text: "The mid-pack can be chaotic. How did you navigate the positioning battles today?",
      triggers: {
        positionBetween: [8, 25]
      },
      responses: ['midpack_tactical', 'progression_tactical', 'sprint_tactical']
    }
  },

  // ===== GENERAL QUESTIONS =====
  general: {

    race_reflection: {
      id: 'race_reflection',
      text: "How did you feel about your race today overall?",
      triggers: {
        positionBetween: [1, 50]
      },
      responses: ['progression_patient', 'consistency_professional', 'midpack_realistic']
    },

    next_race_preview: {
      id: 'next_race_preview',
      text: "Looking ahead, what are your goals for the next race?",
      triggers: {
        racesCompletedBetween: [1, 14]
      },
      responses: ['midpack_motivated', 'progression_confident', 'milestone_ambitious']
    },

    current_form: {
      id: 'current_form',
      text: "How would you assess your current form?",
      triggers: {
        racesCompletedBetween: [2, 15]
      },
      responses: ['mid_season_analytical', 'progression_patient', 'consistency_focused']
    },

    team_dynamics: {
      id: 'team_dynamics',
      text: "How's the communication with your team been during races?",
      triggers: {
        positionBetween: [1, 30]
      },
      responses: ['win_standard_professional', 'consistency_professional', 'progression_tactical']
    }
  }
};

// Export for use in other modules
export { INTERVIEW_QUESTIONS };
