// personality-awards-calculation.js - Calculate personality award eligibility

import { PERSONALITY_AWARDS } from './personality-awards-config.js';

/**
 * Main function to calculate all personality awards for a user
 * @param {Object} personality - Current personality stats
 * @param {number} eventNumber - Current event number (1-15)
 * @param {Object} snapshots - Personality snapshots at Events 5, 8, 12, 15
 * @param {Object} existingAwards - Currently held awards
 * @returns {Object} New awards to grant and awards to revoke
 */
export function calculatePersonalityAwards(personality, eventNumber, snapshots = {}, existingAwards = {}) {
  const newAwards = {
    dominant: null,
    combinations: [],
    special: [],
    evolution: []
  };

  const revokedAwards = {
    dominant: null,
    combinations: [],
    special: []
  };

  // Check dominant trait awards
  const dominantResult = checkDominantTraitAwards(personality, eventNumber);
  if (dominantResult) {
    newAwards.dominant = dominantResult;

    // Revoke previous dominant award if it's different
    if (existingAwards.dominant?.current && existingAwards.dominant.current !== dominantResult.awardId) {
      revokedAwards.dominant = existingAwards.dominant.current;
    }
  }

  // Check combination awards
  const combinationResults = checkCombinationAwards(personality, eventNumber);
  combinationResults.forEach(combo => {
    // Only grant if not already earned
    const alreadyHas = existingAwards.combinations?.some(c => c.awardId === combo.awardId);
    if (!alreadyHas) {
      newAwards.combinations.push(combo);
    }
  });

  // Check balanced/extreme awards (Events 12+)
  if (eventNumber >= 12) {
    const balancedExtremeResults = checkBalancedExtremeAwards(personality, eventNumber, snapshots);
    balancedExtremeResults.forEach(award => {
      const alreadyHas = existingAwards.special?.some(s => s.awardId === award.awardId);
      if (!alreadyHas) {
        newAwards.special.push(award);
      }
    });
  }

  // Check evolution awards (Event 15 only)
  if (eventNumber === 15) {
    const evolutionResults = checkEvolutionAwards(snapshots, eventNumber);
    evolutionResults.forEach(award => {
      const alreadyHas = existingAwards.evolution?.some(e => e.awardId === award.awardId);
      if (!alreadyHas) {
        newAwards.evolution.push(award);
      }
    });
  }

  return { newAwards, revokedAwards };
}

/**
 * Check for dominant trait awards
 * Only ONE dominant award can be active at a time
 * Requires trait ≥70 AND must be the highest trait
 */
export function checkDominantTraitAwards(personality, eventNumber) {
  const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];
  const highestTrait = getHighestTrait(personality, traits);

  if (!highestTrait || highestTrait.value < 70) {
    return null;
  }

  // Find matching dominant award
  const dominantAwards = PERSONALITY_AWARDS.DOMINANT;
  for (const award of Object.values(dominantAwards)) {
    if (award.trait === highestTrait.name && award.checkEvents.includes(eventNumber)) {
      return {
        awardId: award.id,
        grantedAt: eventNumber,
        trait: highestTrait.name,
        value: highestTrait.value
      };
    }
  }

  return null;
}

/**
 * Check for combination awards
 * Multiple awards can be earned
 * Requires both traits ≥65 and within 15 points of each other
 */
export function checkCombinationAwards(personality, eventNumber) {
  const earnedCombos = [];
  const combinationAwards = PERSONALITY_AWARDS.COMBINATION;

  for (const award of Object.values(combinationAwards)) {
    if (!award.checkEvents.includes(eventNumber)) {
      continue;
    }

    const [trait1, trait2] = award.traits;
    const value1 = personality[trait1] || 50;
    const value2 = personality[trait2] || 50;

    // Check criteria
    if (value1 >= award.criteria.minValue && value2 >= award.criteria.minValue) {
      const difference = Math.abs(value1 - value2);
      if (difference <= award.criteria.maxDifference) {
        earnedCombos.push({
          awardId: award.id,
          grantedAt: eventNumber,
          traits: {
            [trait1]: value1,
            [trait2]: value2
          }
        });
      }
    }
  }

  return earnedCombos;
}

/**
 * Check for balanced vs extreme awards
 * Checked at Event 12+
 */
export function checkBalancedExtremeAwards(personality, eventNumber, snapshots) {
  const earnedAwards = [];
  const balancedExtremeAwards = PERSONALITY_AWARDS.BALANCED_EXTREME;
  const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];

  for (const award of Object.values(balancedExtremeAwards)) {
    if (!award.checkEvents.includes(eventNumber)) {
      continue;
    }

    if (award.id === 'balancedPersona') {
      // All traits must be between 45-65
      const allBalanced = traits.every(trait => {
        const value = personality[trait] || 50;
        return value >= award.criteria.allTraitsMin && value <= award.criteria.allTraitsMax;
      });

      if (allBalanced) {
        earnedAwards.push({
          awardId: award.id,
          grantedAt: eventNumber
        });
      }
    }

    if (award.id === 'extremePersona') {
      // At least one trait ≥75 OR ≤25
      const hasExtreme = traits.some(trait => {
        const value = personality[trait] || 50;
        return value >= award.criteria.anyTraitMin || value <= award.criteria.orAnyTraitMax;
      });

      if (hasExtreme) {
        earnedAwards.push({
          awardId: award.id,
          grantedAt: eventNumber
        });
      }
    }

    if (award.id === 'evolvedPersona') {
      // Highest trait has changed from Event 8 to Event 15
      if (snapshots.event8 && eventNumber === 15) {
        const highestAt8 = getHighestTrait(snapshots.event8, traits);
        const highestAt15 = getHighestTrait(personality, traits);

        if (highestAt8 && highestAt15 && highestAt8.name !== highestAt15.name) {
          earnedAwards.push({
            awardId: award.id,
            grantedAt: eventNumber,
            from: highestAt8.name,
            to: highestAt15.name
          });
        }
      }
    }
  }

  return earnedAwards;
}

/**
 * Check for evolution awards
 * Only checked at Event 15 (season end)
 */
export function checkEvolutionAwards(snapshots, eventNumber) {
  if (eventNumber !== 15) {
    return [];
  }

  const earnedAwards = [];
  const evolutionAwards = PERSONALITY_AWARDS.EVOLUTION;
  const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];

  for (const award of Object.values(evolutionAwards)) {
    if (award.id === 'consistentVoice') {
      // Same dominant trait at Events 5, 8, 12, 15
      const requiredSnapshots = ['event5', 'event8', 'event12', 'event15'];
      const allSnapshotsExist = requiredSnapshots.every(snap => snapshots[snap]);

      if (allSnapshotsExist) {
        const dominantTraits = requiredSnapshots.map(snap => {
          const highest = getHighestTrait(snapshots[snap], traits);
          return highest?.name;
        });

        const allSame = dominantTraits.every(trait => trait === dominantTraits[0]);
        if (allSame && dominantTraits[0]) {
          earnedAwards.push({
            awardId: award.id,
            grantedAt: eventNumber,
            trait: dominantTraits[0]
          });
        }
      }
    }

    if (award.id === 'dramaticShift') {
      // Dominant trait changes 3+ times
      const requiredSnapshots = ['event5', 'event8', 'event12', 'event15'];
      const allSnapshotsExist = requiredSnapshots.every(snap => snapshots[snap]);

      if (allSnapshotsExist) {
        const dominantTraits = requiredSnapshots.map(snap => {
          const highest = getHighestTrait(snapshots[snap], traits);
          return highest?.name;
        });

        // Count changes
        let changes = 0;
        for (let i = 1; i < dominantTraits.length; i++) {
          if (dominantTraits[i] !== dominantTraits[i - 1]) {
            changes++;
          }
        }

        if (changes >= award.criteria.dominantTraitChanges) {
          earnedAwards.push({
            awardId: award.id,
            grantedAt: eventNumber,
            changes: changes
          });
        }
      }
    }

    if (award.id === 'polarization') {
      // One trait ≥80 AND one trait ≤30
      const snapshot = snapshots.event15;
      if (snapshot) {
        const hasHighExtreme = traits.some(trait => (snapshot[trait] || 50) >= award.criteria.oneTraitMin);
        const hasLowExtreme = traits.some(trait => (snapshot[trait] || 50) <= award.criteria.andOneTraitMax);

        if (hasHighExtreme && hasLowExtreme) {
          earnedAwards.push({
            awardId: award.id,
            grantedAt: eventNumber
          });
        }
      }
    }
  }

  return earnedAwards;
}

/**
 * Helper: Get the highest trait from personality stats
 */
export function getHighestTrait(personality, traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience']) {
  let highest = null;

  traits.forEach(trait => {
    const value = personality[trait] || 50;
    if (!highest || value > highest.value) {
      highest = { name: trait, value: value };
    }
  });

  return highest;
}

/**
 * Helper: Check if two trait values are within maxDifference
 */
export function areTraitsBalanced(value1, value2, maxDifference) {
  return Math.abs(value1 - value2) <= maxDifference;
}

/**
 * Helper: Get all trait values as array
 */
export function getTraitValues(personality) {
  const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];
  return traits.map(trait => personality[trait] || 50);
}

/**
 * Helper: Check if all traits are within a range
 */
export function allTraitsInRange(personality, min, max) {
  const values = getTraitValues(personality);
  return values.every(value => value >= min && value <= max);
}
