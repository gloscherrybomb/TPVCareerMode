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

  // ===== TACTICAL QUESTIONS =====
  tactical: {

    time_trial_strategy: {
      id: 'time_trial_strategy',
      text: "Time trials are all about pacing. What was your strategy today?",
      triggers: {
        eventType: 'time trial'
      },
      responses: ['tt_professional', 'tt_confident', 'tt_humble']
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

    climbing_performance: {
      id: 'climbing_performance',
      text: "That climb was brutal. How did you manage the gradient and pace yourself?",
      triggers: {
        eventType: 'hill climb',
        positionLessThan: 10
      },
      responses: ['climb_professional', 'climb_confident', 'climb_humble']
    },

    breakaway_success: {
      id: 'breakaway_success',
      text: "You made the break and it stuck. Was that part of the plan?",
      triggers: {
        position: 1,
        raceType: 'road race'
      },
      responses: ['break_tactical', 'break_confident', 'break_opportunistic']
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
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INTERVIEW_QUESTIONS };
}
