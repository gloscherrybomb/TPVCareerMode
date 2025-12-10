// personality-awards-config.js - Configuration for all personality-based awards

/**
 * Personality Award Definitions
 * Awards are granted based on developed personality traits from post-race interviews
 *
 * Categories:
 * - DOMINANT: Single trait becomes defining characteristic (≥70, highest trait)
 * - COMBINATION: Two traits both strong (≥65, within 15 points of each other)
 * - BALANCED_EXTREME: Overall personality shape
 * - EVOLUTION: Personality changes over the season
 */

export const PERSONALITY_AWARDS = {

  // ===== CATEGORY A: DOMINANT TRAIT AWARDS =====
  // Granted when a single trait ≥70 AND is the highest trait
  // Only ONE dominant award can be active at a time

  DOMINANT: {
    confidentPersona: {
      id: 'confidentPersona',
      name: 'The Confident One',
      icon: '💪',
      description: 'Unshakeable self-belief defines your racing persona',
      category: 'dominant',
      trait: 'confidence',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 1
    },

    humblePersona: {
      id: 'humblePersona',
      name: 'The Humble Champion',
      icon: '🤝',
      description: 'Grace and gratitude define how you race',
      category: 'dominant',
      trait: 'humility',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 2
    },

    aggressivePersona: {
      id: 'aggressivePersona',
      name: 'The Fierce Competitor',
      icon: '😤',
      description: 'Relentless competitive fire drives you forward',
      category: 'dominant',
      trait: 'aggression',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 3
    },

    professionalPersona: {
      id: 'professionalPersona',
      name: 'The Tactician',
      icon: '🎯',
      description: 'Analytical precision and tactical excellence',
      category: 'dominant',
      trait: 'professionalism',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 4
    },

    showmanPersona: {
      id: 'showmanPersona',
      name: 'The Entertainer',
      icon: '⚡',
      description: 'You race for the spectacle and the story',
      category: 'dominant',
      trait: 'showmanship',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 5
    },

    resilientPersona: {
      id: 'resilientPersona',
      name: 'The Unstoppable',
      icon: '💚',
      description: 'Setbacks only make you stronger',
      category: 'dominant',
      trait: 'resilience',
      criteria: {
        minValue: 70,
        mustBeHighest: true
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 6
    }
  },

  // ===== CATEGORY B: COMBINATION AWARDS =====
  // Both traits must be ≥65 and within 15 points of each other
  // Multiple combination awards can be earned

  COMBINATION: {
    confidentShowman: {
      id: 'confidentShowman',
      name: 'The Charismatic Star',
      icon: '🌟',
      description: 'Confidence meets entertainment value',
      category: 'combination',
      traits: ['confidence', 'showmanship'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 1
    },

    humbleProfessional: {
      id: 'humbleProfessional',
      name: 'The Quiet Professional',
      icon: '🎓',
      description: 'Humble expertise without ego',
      category: 'combination',
      traits: ['humility', 'professionalism'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 2
    },

    aggressiveResilient: {
      id: 'aggressiveResilient',
      name: 'The Relentless Fighter',
      icon: '⚔️',
      description: 'Never backs down, never breaks',
      category: 'combination',
      traits: ['aggression', 'resilience'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 3
    },

    confidentAggressive: {
      id: 'confidentAggressive',
      name: 'The Bold Competitor',
      icon: '🔥',
      description: 'Fearless and fierce in every race',
      category: 'combination',
      traits: ['confidence', 'aggression'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 4
    },

    humbleResilient: {
      id: 'humbleResilient',
      name: 'The Humble Warrior',
      icon: '🛡️',
      description: 'Quiet strength through adversity',
      category: 'combination',
      traits: ['humility', 'resilience'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 5
    },

    professionalShowman: {
      id: 'professionalShowman',
      name: 'The Polished Entertainer',
      icon: '🎪',
      description: 'Smart racing with big personality',
      category: 'combination',
      traits: ['professionalism', 'showmanship'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 6
    },

    confidentProfessional: {
      id: 'confidentProfessional',
      name: 'The Clinical Champion',
      icon: '📊',
      description: 'You believe in the process',
      category: 'combination',
      traits: ['confidence', 'professionalism'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 7
    },

    resilientShowman: {
      id: 'resilientShowman',
      name: 'The Comeback Story',
      icon: '📈',
      description: 'Dramatic recoveries and theatrics',
      category: 'combination',
      traits: ['resilience', 'showmanship'],
      criteria: {
        minValue: 65,
        maxDifference: 15
      },
      checkEvents: [8, 10, 12, 15],
      displayOrder: 8
    }
  },

  // ===== CATEGORY C: BALANCED VS EXTREME =====
  // Based on overall personality shape
  // Checked at Event 12+

  BALANCED_EXTREME: {
    balancedPersona: {
      id: 'balancedPersona',
      name: 'The Well-Rounded Racer',
      icon: '⚖️',
      description: 'No extremes, consistent across all dimensions',
      category: 'balanced',
      criteria: {
        allTraitsMin: 45,
        allTraitsMax: 65
      },
      checkEvents: [12, 15],
      displayOrder: 1
    },

    extremePersona: {
      id: 'extremePersona',
      name: 'The Polarizing Personality',
      icon: '🎭',
      description: 'Strong opinions and defined character',
      category: 'extreme',
      criteria: {
        anyTraitMin: 75,
        orAnyTraitMax: 25
      },
      checkEvents: [12, 15],
      displayOrder: 2
    },

    evolvedPersona: {
      id: 'evolvedPersona',
      name: 'The Shapeshifter',
      icon: '🦋',
      description: 'Your personality has evolved significantly',
      category: 'evolution',
      criteria: {
        requiresSnapshots: true,
        highestTraitChanged: true,
        compareEvents: [8, 15]
      },
      checkEvents: [15],
      displayOrder: 3
    }
  },

  // ===== CATEGORY D: EVOLUTION AWARDS =====
  // Season-long tracking, granted at season end (Event 15)

  EVOLUTION: {
    consistentVoice: {
      id: 'consistentVoice',
      name: 'The Consistent Voice',
      icon: '📢',
      description: 'Your message has been clear and consistent',
      category: 'evolution',
      criteria: {
        requiresSnapshots: true,
        sameDominantTrait: true,
        compareEvents: [5, 8, 12, 15]
      },
      checkEvents: [15],
      displayOrder: 1
    },

    dramaticShift: {
      id: 'dramaticShift',
      name: 'The Reinvention',
      icon: '🔄',
      description: "You've redefined yourself multiple times",
      category: 'evolution',
      criteria: {
        requiresSnapshots: true,
        dominantTraitChanges: 3,
        compareEvents: [5, 8, 12, 15]
      },
      checkEvents: [15],
      displayOrder: 2
    },

    polarization: {
      id: 'polarization',
      name: 'The Divider',
      icon: '⚡',
      description: 'Extremely defined character with clear opposites',
      category: 'evolution',
      criteria: {
        oneTraitMin: 80,
        andOneTraitMax: 30
      },
      checkEvents: [15],
      displayOrder: 3
    }
  }
};

/**
 * Get all personality awards as a flat array
 */
export function getAllPersonalityAwards() {
  const awards = [];

  Object.values(PERSONALITY_AWARDS.DOMINANT).forEach(award => awards.push(award));
  Object.values(PERSONALITY_AWARDS.COMBINATION).forEach(award => awards.push(award));
  Object.values(PERSONALITY_AWARDS.BALANCED_EXTREME).forEach(award => awards.push(award));
  Object.values(PERSONALITY_AWARDS.EVOLUTION).forEach(award => awards.push(award));

  return awards;
}

/**
 * Get personality award by ID
 */
export function getPersonalityAwardById(awardId) {
  const allAwards = getAllPersonalityAwards();
  return allAwards.find(award => award.id === awardId);
}

/**
 * Get awards that should be checked at a specific event number
 */
export function getAwardsForEvent(eventNumber) {
  const allAwards = getAllPersonalityAwards();
  return allAwards.filter(award => award.checkEvents.includes(eventNumber));
}

/**
 * Get the trait name with proper capitalization
 */
export function getTraitDisplayName(traitKey) {
  const names = {
    confidence: 'Confidence',
    humility: 'Humility',
    aggression: 'Aggression',
    professionalism: 'Professionalism',
    showmanship: 'Showmanship',
    resilience: 'Resilience'
  };
  return names[traitKey] || traitKey;
}

/**
 * Award categories for display purposes
 */
export const AWARD_CATEGORIES = {
  DOMINANT: 'Dominant Personality',
  COMBINATION: 'Personality Combinations',
  BALANCED: 'Balanced Personality',
  EXTREME: 'Extreme Personality',
  EVOLUTION: 'Personality Evolution'
};
