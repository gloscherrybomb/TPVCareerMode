// personality-awards-notifications.js - Helper functions for personality award notifications

import { getPersonalityAwardById } from './personality-awards-config.js';

/**
 * Queue personality award notifications
 * @param {Object} awardResults - Results from calculatePersonalityAwards
 * @param {number} eventNumber - Event number where awards were earned
 */
export function queuePersonalityAwardNotifications(awardResults, eventNumber) {
  if (!window.notificationQueue) {
    console.error('Notification queue not available');
    return;
  }

  const { newAwards } = awardResults;

  // Queue dominant award
  if (newAwards.dominant) {
    const award = getPersonalityAwardById(newAwards.dominant.awardId);
    if (award) {
      window.notificationQueue.add({
        awardId: newAwards.dominant.awardId,
        category: 'personality',
        eventNumber: eventNumber,
        intensity: 'flashy', // Dominant awards are flashy
        timestamp: Date.now()
      });
      console.log(`Queued dominant personality award: ${award.name}`);
    }
  }

  // Queue combination awards
  newAwards.combinations.forEach(combo => {
    const award = getPersonalityAwardById(combo.awardId);
    if (award) {
      window.notificationQueue.add({
        awardId: combo.awardId,
        category: 'personality',
        eventNumber: eventNumber,
        intensity: 'moderate', // Combination awards are moderate
        timestamp: Date.now()
      });
      console.log(`Queued combination personality award: ${award.name}`);
    }
  });

  // Queue special awards
  newAwards.special.forEach(special => {
    const award = getPersonalityAwardById(special.awardId);
    if (award) {
      window.notificationQueue.add({
        awardId: special.awardId,
        category: 'personality',
        eventNumber: eventNumber,
        intensity: 'moderate', // Special awards are moderate
        timestamp: Date.now()
      });
      console.log(`Queued special personality award: ${award.name}`);
    }
  });

  // Queue evolution awards (season end only)
  newAwards.evolution.forEach(evolution => {
    const award = getPersonalityAwardById(evolution.awardId);
    if (award) {
      window.notificationQueue.add({
        awardId: evolution.awardId,
        category: 'personality',
        eventNumber: eventNumber,
        intensity: 'flashy', // Evolution awards are flashy
        timestamp: Date.now()
      });
      console.log(`Queued evolution personality award: ${award.name}`);
    }
  });
}

/**
 * Create award definition for notification system
 * Converts personality award config to format expected by notification system
 * @param {Object} personalityAward - Award from personality-awards-config.js
 * @returns {Object} Award definition for notification system
 */
export function createPersonalityAwardDefinition(personalityAward) {
  return {
    id: personalityAward.id,
    title: personalityAward.name,
    description: personalityAward.description,
    icon: personalityAward.icon
  };
}

/**
 * Initialize personality award definitions in the global AWARD_DEFINITIONS
 * Should be called on page load
 */
export function initializePersonalityAwardDefinitions() {
  import('./personality-awards-config.js').then(module => {
    const allAwards = module.getAllPersonalityAwards();

    // Ensure global AWARD_DEFINITIONS exists
    if (!window.AWARD_DEFINITIONS) {
      window.AWARD_DEFINITIONS = {};
    }

    // Add all personality awards to global definitions
    allAwards.forEach(award => {
      window.AWARD_DEFINITIONS[award.id] = createPersonalityAwardDefinition(award);
    });

    console.log(`Initialized ${allAwards.length} personality award definitions`);
  }).catch(error => {
    console.error('Failed to initialize personality award definitions:', error);
  });
}
