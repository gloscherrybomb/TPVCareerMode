/**
 * Achievement Notification System
 * Main display logic, sound management, and confetti system
 */

/**
 * Sound Manager - Handles audio playback for achievements
 */
class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.5;
    this.loadSounds();
    this.loadPreferences();
  }

  loadSounds() {
    this.sounds = {
      subtle: new Audio('sounds/podium-chime.mp3'),
      moderate: new Audio('sounds/special-chime.mp3'),
      flashy: new Audio('sounds/performance-fanfare.mp3'),
      ultraFlashy: new Audio('sounds/season-epic.mp3')
    };

    // Set volume for all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }

  loadPreferences() {
    try {
      const soundEnabled = localStorage.getItem('tpv_sound_enabled');
      if (soundEnabled !== null) {
        this.enabled = soundEnabled === 'true';
      }

      const volume = localStorage.getItem('tpv_sound_volume');
      if (volume !== null) {
        this.volume = parseFloat(volume);
        this.setVolume(this.volume);
      }
    } catch (error) {
      console.warn('Failed to load sound preferences:', error);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('tpv_sound_enabled', this.enabled.toString());
      localStorage.setItem('tpv_sound_volume', this.volume.toString());
    } catch (error) {
      console.warn('Failed to save sound preferences:', error);
    }
  }

  play(intensity) {
    if (!this.enabled) return;

    const sound = this.sounds[intensity];
    if (sound) {
      sound.currentTime = 0; // Reset to start
      sound.play().catch(err => {
        console.warn('Sound play failed (autoplay policy):', err);
      });
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
    this.savePreferences();
  }

  mute() {
    this.enabled = false;
    this.savePreferences();
  }

  unmute() {
    this.enabled = true;
    this.savePreferences();
  }

  toggle() {
    this.enabled = !this.enabled;
    this.savePreferences();
    return this.enabled;
  }
}

/**
 * Confetti Generator - Creates celebratory confetti particles
 */
class ConfettiGenerator {
  createConfetti(intensity) {
    const configs = {
      moderate: { count: 15, duration: 2000, colors: ['#45caff', '#00ff88'] },
      flashy: { count: 30, duration: 3000, colors: ['#ff1b6b', '#c71ae5', '#45caff', '#00ff88'] },
      ultraFlashy: { count: 60, duration: 5000, colors: ['#00ff88', '#00cc6a', '#00aa55', '#ffffff', '#ffdd00'] }
    };

    const config = configs[intensity];
    if (!config) return;

    // Check if mobile - reduce particle count
    const isMobile = window.innerWidth <= 768;
    const count = isMobile ? Math.floor(config.count * 0.6) : config.count;

    const container = document.createElement('div');
    container.className = 'achievement-confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'achievement-confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = config.colors[Math.floor(Math.random() * config.colors.length)];
        confetti.style.animationDelay = (Math.random() * 0.5) + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
        container.appendChild(confetti);

        // Remove confetti after animation
        setTimeout(() => confetti.remove(), config.duration + 2000);
      }, i * 30);
    }

    // Remove container after all animations
    setTimeout(() => container.remove(), config.duration + 3000);
  }
}

/**
 * Achievement Notifications - Main display system
 */
class AchievementNotifications {
  constructor() {
    this.queue = new NotificationQueue();
    this.soundManager = new SoundManager();
    this.confettiGenerator = new ConfettiGenerator();
    this.currentGroupIndex = 0;
    this.groups = [];
    this.isDisplaying = false;

    // Auto-cleanup old notifications on initialization
    this.queue.cleanup();
  }

  /**
   * Display achievement notifications
   */
  async display() {
    if (this.isDisplaying) {
      console.log('Already displaying notifications');
      return;
    }

    const unshown = this.queue.getUnshown();

    if (unshown.length === 0) {
      console.log('No notifications to display');
      return;
    }

    console.log(`[NOTIFICATION DEBUG] Displaying ${unshown.length} notification(s)`);
    console.log('[NOTIFICATION DEBUG] Unshown notifications:', unshown);

    this.isDisplaying = true;

    // Group notifications
    this.groups = this.groupNotifications(unshown);

    console.log(`[NOTIFICATION DEBUG] Created ${this.groups.length} group(s):`);
    this.groups.forEach((g, i) => {
      console.log(`  Group ${i + 1}: ${g.category} (${g.notifications.length} notification(s))`);
    });

    // Display first group
    this.currentGroupIndex = 0;
    this.showGroup(this.groups[0]);
  }

  /**
   * Group notifications by category
   * @param {Array} notifications - Array of notification objects
   * @returns {Array} - Array of grouped notifications
   */
  groupNotifications(notifications) {
    const grouped = {
      season: [],
      gc: [],
      personality: [],
      performance: [],
      event_special: [],
      podium: []
    };

    notifications.forEach(n => {
      if (grouped[n.category]) {
        grouped[n.category].push(n);
      } else {
        console.warn(`Unknown category: ${n.category}`);
      }
    });

    // Convert to array of groups, filter empty, sort by priority
    const priorityOrder = ['season', 'gc', 'personality', 'performance', 'event_special', 'podium'];
    return priorityOrder
      .map(category => ({
        category,
        notifications: grouped[category].sort((a, b) => a.eventNumber - b.eventNumber)
      }))
      .filter(g => g.notifications.length > 0);
  }

  /**
   * Show a notification group
   * @param {Object} group - Group object containing category and notifications
   */
  showGroup(group) {
    console.log(`[NOTIFICATION DEBUG] Showing group ${this.currentGroupIndex + 1}/${this.groups.length}: ${group.category}`);
    console.log(`[NOTIFICATION DEBUG] Group contains ${group.notifications.length} notification(s):`, group.notifications.map(n => n.awardId));

    // Create overlay
    const overlay = this.createOverlay(group);
    document.body.appendChild(overlay);

    // Trigger animations
    setTimeout(() => {
      overlay.classList.add('active');
      console.log(`[NOTIFICATION DEBUG] Overlay activated for ${group.category}`);
    }, 50);

    // Play sound for group intensity
    const maxIntensity = this.getMaxIntensity(group.notifications);
    this.soundManager.play(maxIntensity);

    // Create confetti for flashy groups
    if (maxIntensity === 'flashy' || maxIntensity === 'ultraFlashy') {
      setTimeout(() => {
        this.confettiGenerator.createConfetti(maxIntensity);
      }, 500);
    }

    // Mark as shown
    group.notifications.forEach(n => {
      console.log(`[NOTIFICATION DEBUG] Marking as shown: ${n.awardId} (ID: ${n.id})`);
      this.queue.markAsShown(n.id);
    });
  }

  /**
   * Create overlay HTML
   * @param {Object} group - Group object
   * @returns {HTMLElement} - Overlay element
   */
  createOverlay(group) {
    console.log(`[NOTIFICATION DEBUG] Creating overlay for category: ${group.category}`);

    const overlay = document.createElement('div');
    overlay.className = 'achievement-notification-overlay';
    overlay.id = 'achievementOverlay';

    const groupTitle = this.getCategoryTitle(group.category, group.notifications.length);
    const groupIcon = this.getCategoryIcon(group.category);

    console.log(`[NOTIFICATION DEBUG] Mapping ${group.notifications.length} notification(s) to cards...`);
    const cards = group.notifications.map((n, index) => this.createCard(n, index)).join('');
    console.log(`[NOTIFICATION DEBUG] Total cards HTML length: ${cards.length} chars`);
    console.log(`[NOTIFICATION DEBUG] Cards HTML:`, cards.substring(0, 200) + '...');

    const continueText = this.currentGroupIndex < this.groups.length - 1
      ? 'Continue'
      : 'Awesome!';

    overlay.innerHTML = `
      <div class="achievement-notification-container">
        <div class="achievement-group" data-category="${group.category}">
          <div class="achievement-group-header">
            <span class="achievement-group-icon">${groupIcon}</span>
            <h3 class="achievement-group-title">${groupTitle}</h3>
          </div>
          <div class="achievement-cards">
            ${cards}
          </div>
        </div>
      </div>
      <div class="achievement-dismiss">
        <button class="achievement-dismiss-btn" id="achievementDismissBtn">${continueText}</button>
        <p class="achievement-dismiss-hint">Press ESC or click to dismiss</p>
      </div>
    `;

    console.log(`[NOTIFICATION DEBUG] Overlay HTML set (total: ${overlay.innerHTML.length} chars)`);

    // Add event listeners
    const dismissBtn = overlay.querySelector('#achievementDismissBtn');
    dismissBtn.addEventListener('click', () => this.dismiss());

    console.log(`[NOTIFICATION DEBUG] Dismiss button found and event listener attached`);

    return overlay;
  }

  /**
   * Create card HTML for a notification
   * @param {Object} notification - Notification object
   * @param {number} index - Card index for stagger delay
   * @returns {string} - Card HTML
   */
  createCard(notification, index) {
    console.log(`[NOTIFICATION DEBUG] Creating card for: ${notification.awardId}`);
    console.log(`[NOTIFICATION DEBUG] window.AWARD_DEFINITIONS exists:`, !!window.AWARD_DEFINITIONS);

    const award = window.AWARD_DEFINITIONS ? window.AWARD_DEFINITIONS[notification.awardId] : null;

    if (!award) {
      console.warn(`[NOTIFICATION DEBUG] Award definition not found for: ${notification.awardId}`);
      console.warn('[NOTIFICATION DEBUG] Available awards:', window.AWARD_DEFINITIONS ? Object.keys(window.AWARD_DEFINITIONS) : 'AWARD_DEFINITIONS not loaded');
      return '';
    }

    console.log(`[NOTIFICATION DEBUG] Award found:`, award);

    const eventName = this.getEventName(notification.eventNumber);

    // Get Cadence Credits value for this award
    const ccValue = window.currencyConfig?.AWARD_CREDIT_MAP?.[notification.awardId] || 0;

    const cardHTML = `
      <div class="achievement-card" data-intensity="${notification.intensity}" style="animation-delay: ${index * 0.1}s">
        <div class="achievement-icon">${award.icon}</div>
        <div class="achievement-content">
          <h4 class="achievement-title">${award.title}${ccValue > 0 ? ` <span class="achievement-cc">⚡${ccValue} CC</span>` : ''}</h4>
          <p class="achievement-description">${award.description}</p>
          <p class="achievement-event">Event ${notification.eventNumber}: ${eventName}</p>
        </div>
      </div>
    `;

    console.log(`[NOTIFICATION DEBUG] Card HTML created (${cardHTML.length} chars)`);
    return cardHTML;
  }

  /**
   * Dismiss current group and show next
   */
  dismiss() {
    console.log(`[NOTIFICATION DEBUG] Dismiss called for group ${this.currentGroupIndex + 1}`);

    const overlay = document.getElementById('achievementOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      console.log('[NOTIFICATION DEBUG] Removed active class from overlay');
      setTimeout(() => {
        overlay.remove();
        console.log('[NOTIFICATION DEBUG] Overlay removed from DOM');
      }, 400);
    }

    // Show next group if available
    this.currentGroupIndex++;
    if (this.currentGroupIndex < this.groups.length) {
      console.log(`[NOTIFICATION DEBUG] Scheduling next group (${this.currentGroupIndex + 1}/${this.groups.length}) in 600ms`);
      setTimeout(() => {
        this.showGroup(this.groups[this.currentGroupIndex]);
      }, 600);
    } else {
      // All groups shown
      this.isDisplaying = false;
      console.log('[NOTIFICATION DEBUG] All notifications shown - display complete');
    }
  }

  /**
   * Get category display title
   * @param {string} category
   * @param {number} count - Number of notifications in the group
   * @returns {string}
   */
  getCategoryTitle(category, count) {
    const titles = {
      podium: count === 1 ? 'Podium Finish' : 'Podium Finishes',
      event_special: count === 1 ? 'Special Achievement' : 'Special Achievements',
      performance: 'Outstanding Performance',
      gc: 'Tour Overall Classification',
      season: count === 1 ? 'Season Award' : 'Season Awards',
      personality: count === 1 ? 'Media Personality Award' : 'Media Personality Awards'
    };
    return titles[category] || 'Achievements';
  }

  /**
   * Get category icon
   * @param {string} category
   * @returns {string}
   */
  getCategoryIcon(category) {
    const icons = {
      podium: '🏅',
      event_special: '⭐',
      performance: '💪',
      gc: '🏆',
      season: '👑',
      personality: '🎭'
    };
    return icons[category] || '🏆';
  }

  /**
   * Get maximum intensity from notifications
   * @param {Array} notifications
   * @returns {string}
   */
  getMaxIntensity(notifications) {
    const intensityLevels = { subtle: 1, moderate: 2, flashy: 3, ultraFlashy: 4 };
    const max = Math.max(...notifications.map(n => intensityLevels[n.intensity] || 0));
    return Object.keys(intensityLevels).find(key => intensityLevels[key] === max) || 'subtle';
  }

  /**
   * Get event name by event number
   * @param {number} eventNumber
   * @returns {string}
   */
  getEventName(eventNumber) {
    // Check if event sequence data is available
    if (window.eventSequence && window.eventSequence[eventNumber - 1]) {
      return window.eventSequence[eventNumber - 1].title;
    }

    // Fallback event names (matches EVENT_NAMES in event-config.js)
    const eventNames = {
      1: 'Coast and Roast Crit',
      2: 'Island Classic',
      3: 'The Forest Velodrome Elimination',
      4: 'Coastal Loop Time Challenge',
      5: 'North Lake Points Race',
      6: 'Easy Hill Climb',
      7: 'Flat Eight Criterium',
      8: 'The Grand Gilbert Fondo',
      9: 'Base Camp Classic',
      10: 'Beach and Pine TT',
      11: 'South Lake Points Race',
      12: 'Unbound - Little Egypt',
      13: 'Local Tour Stage 1',
      14: 'Local Tour Stage 2',
      15: 'Local Tour Stage 3',
      // Special events
      101: 'Singapore Criterium',
      102: 'The Leveller'
    };
    return eventNames[eventNumber] || `Event ${eventNumber}`;
  }
}

// Global instance and initialization
let achievementNotifications;
let notificationQueue;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNotificationSystem);
} else {
  initializeNotificationSystem();
}

function initializeNotificationSystem() {
  achievementNotifications = new AchievementNotifications();
  notificationQueue = achievementNotifications.queue;

  // Expose to window for global access
  window.achievementNotifications = achievementNotifications;
  window.notificationQueue = notificationQueue;

  console.log('Achievement notification system initialized');

  // ESC key dismiss
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('achievementOverlay')) {
      achievementNotifications.dismiss();
    }
  });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SoundManager,
    ConfettiGenerator,
    AchievementNotifications
  };
}
