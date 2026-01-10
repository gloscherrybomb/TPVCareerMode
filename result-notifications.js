/**
 * Result Notification System
 * Checks for new (unviewed) race results and displays notification overlays
 */

class ResultNotificationManager {
  constructor() {
    this.storageKey = 'tpv_viewed_results';
    this.lastCheckKey = 'tpv_last_result_check';
    this.checkIntervalMs = 5 * 60 * 1000; // 5 minutes between Firestore checks
    this.viewedResults = this.loadViewedResults();
  }

  /**
   * Load viewed results from localStorage
   * @returns {Object} Map of resultKey -> timestamp
   */
  loadViewedResults() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load viewed results:', error);
      return {};
    }
  }

  /**
   * Save viewed results to localStorage
   */
  saveViewedResults() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.viewedResults));
    } catch (error) {
      console.error('Failed to save viewed results:', error);
    }
  }

  /**
   * Mark a result as viewed
   * @param {string} resultKey - Key in format "s{season}_e{event}"
   */
  markAsViewed(resultKey) {
    this.viewedResults[resultKey] = Date.now();
    this.saveViewedResults();
    console.log('Result marked as viewed:', resultKey);
  }

  /**
   * Check if a result has been viewed
   * @param {string} resultKey - Key in format "s{season}_e{event}"
   * @returns {boolean}
   */
  isViewed(resultKey) {
    return !!this.viewedResults[resultKey];
  }

  /**
   * Generate result key from season and event number
   * @param {number} season - Season number
   * @param {number} eventNumber - Event number
   * @returns {string}
   */
  getResultKey(season, eventNumber) {
    return `s${season}_e${eventNumber}`;
  }

  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
   * @param {number} n - The number
   * @returns {string}
   */
  getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Get position styling class based on finish position
   * @param {number|string} position - Position or 'DNF'
   * @returns {string}
   */
  getPositionClass(position) {
    if (position === 'DNF' || position === 'dnf') return 'position-dnf';
    if (position === 1) return 'position-1';
    if (position === 2) return 'position-2';
    if (position === 3) return 'position-3';
    if (position <= 10) return 'position-top10';
    return 'position-other';
  }

  /**
   * Get event name from config or fallback
   * @param {number} eventNumber - Event number
   * @returns {string}
   */
  getEventName(eventNumber) {
    if (window.eventConfig && window.eventConfig.EVENT_NAMES) {
      return window.eventConfig.EVENT_NAMES[eventNumber] || `Event ${eventNumber}`;
    }
    return `Event ${eventNumber}`;
  }

  /**
   * Find new (unviewed) results for the user
   * @param {Object} userData - User document data from Firestore
   * @returns {Array} Array of new result objects
   */
  findNewResults(userData) {
    const newResults = [];
    const currentSeason = userData.currentSeason || 1;

    // Check regular events (1-15)
    for (let eventNum = 1; eventNum <= 15; eventNum++) {
      const resultKey = this.getResultKey(currentSeason, eventNum);

      // Skip if already viewed
      if (this.isViewed(resultKey)) continue;

      // Check if user has this result
      const eventResults = userData[`event${eventNum}Results`];
      if (eventResults && (eventResults.position || eventResults.position === 0)) {
        newResults.push({
          season: currentSeason,
          eventNumber: eventNum,
          position: eventResults.position,
          points: eventResults.points || 0,
          bonusPoints: eventResults.bonusPoints || 0,
          eventName: this.getEventName(eventNum),
          resultKey
        });
      }
    }

    // Check special events (101, 102)
    const specialEvents = [101, 102];
    for (const eventNum of specialEvents) {
      const resultKey = this.getResultKey(currentSeason, eventNum);

      if (this.isViewed(resultKey)) continue;

      const eventResults = userData[`event${eventNum}Results`];
      if (eventResults && (eventResults.position || eventResults.position === 0)) {
        newResults.push({
          season: currentSeason,
          eventNumber: eventNum,
          position: eventResults.position,
          points: eventResults.points || 0,
          bonusPoints: eventResults.bonusPoints || 0,
          eventName: this.getEventName(eventNum),
          resultKey
        });
      }
    }

    return newResults;
  }

  /**
   * Create HTML for a single result card
   * @param {Object} result - Result object
   * @returns {string} HTML string
   */
  createResultCard(result) {
    const positionText = result.position === 'DNF' || result.position === 'dnf'
      ? 'DNF'
      : this.getOrdinalSuffix(result.position);

    const positionClass = this.getPositionClass(result.position);
    const totalPoints = result.points + result.bonusPoints;
    const bonusText = result.bonusPoints > 0 ? ` (+${result.bonusPoints} bonus)` : '';

    return `
      <div class="result-notification-card ${positionClass}">
        <div class="result-card-position">${positionText}</div>
        <div class="result-card-details">
          <h4 class="result-card-event">${result.eventName}</h4>
          <p class="result-card-points">${totalPoints} points${bonusText}</p>
        </div>
      </div>
    `;
  }

  /**
   * Get trophy icon HTML using site's icon system
   * @returns {string} HTML string for trophy icon
   */
  getTrophyIcon() {
    if (window.TPVIcons && window.TPVIcons.getIcon) {
      return window.TPVIcons.getIcon('trophy', { size: 'xxl' });
    }
    // Fallback if icon system not loaded
    return '<span style="font-size: 5rem;">🏆</span>';
  }

  /**
   * Display notification overlay for new results
   * @param {Array} newResults - Array of new result objects
   */
  displayNotification(newResults) {
    if (!newResults || newResults.length === 0) return;

    // Remove any existing notification
    const existing = document.getElementById('resultNotificationOverlay');
    if (existing) existing.remove();

    const resultsHTML = newResults.map(result => this.createResultCard(result)).join('');
    const resultWord = newResults.length === 1 ? 'result' : 'results';
    const trophyIcon = this.getTrophyIcon();

    const overlay = document.createElement('div');
    overlay.className = 'result-notification-overlay';
    overlay.id = 'resultNotificationOverlay';

    overlay.innerHTML = `
      <div class="result-notification-container">
        <div class="result-notification-header">
          <div class="result-notification-icon">${trophyIcon}</div>
          <h3 class="result-notification-title">New Race Results!</h3>
          <p class="result-notification-subtitle">
            ${newResults.length} ${resultWord} awaiting review
          </p>
        </div>
        <div class="result-notification-cards">
          ${resultsHTML}
        </div>
      </div>
      <div class="result-notification-actions">
        <button class="result-notification-btn result-notification-view" id="viewResultsBtn">
          View results and speak to media
        </button>
        <button class="result-notification-btn result-notification-dismiss" id="dismissResultsBtn">
          Dismiss
        </button>
      </div>
      <p class="result-notification-hint">Press ESC to dismiss</p>
    `;

    document.body.appendChild(overlay);

    // Store reference to results for handlers
    this._pendingResults = newResults;

    // Add event listeners
    document.getElementById('viewResultsBtn').addEventListener('click', () => {
      this.handleViewResults(newResults);
    });

    document.getElementById('dismissResultsBtn').addEventListener('click', () => {
      this.handleDismiss(newResults);
    });

    // ESC key to dismiss
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.handleDismiss(newResults);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show with animation after brief delay
    setTimeout(() => overlay.classList.add('active'), 50);

    console.log('Result notification displayed for', newResults.length, 'results');
  }

  /**
   * Handle "View Results" button click
   * @param {Array} results - Array of result objects
   */
  handleViewResults(results) {
    // Mark all as viewed
    results.forEach(result => this.markAsViewed(result.resultKey));

    // Close overlay
    this.closeOverlay();

    // Navigate to appropriate page
    if (results.length === 1) {
      // Single result - go to event detail
      window.location.href = `event-detail.html?id=${results[0].eventNumber}`;
    } else {
      // Multiple results - go to results feed
      window.location.href = 'results-feed.html';
    }
  }

  /**
   * Handle "Dismiss" button click
   * @param {Array} results - Array of result objects
   */
  handleDismiss(results) {
    // Mark all as viewed
    results.forEach(result => this.markAsViewed(result.resultKey));

    // Close overlay
    this.closeOverlay();
  }

  /**
   * Close the notification overlay
   */
  closeOverlay() {
    const overlay = document.getElementById('resultNotificationOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
      setTimeout(() => overlay.remove(), 400);
    }
  }

  /**
   * Main entry point - check for new results and display notification if any
   * @param {Object} user - Firebase auth user object
   * @param {Object} userData - User document data from Firestore
   */
  async checkForNewResults(user, userData) {
    if (!user || !userData) {
      console.log('Result notification: No user or userData, skipping check');
      return;
    }

    // Find new results
    const newResults = this.findNewResults(userData);

    if (newResults.length > 0) {
      console.log('Found', newResults.length, 'new unviewed results');

      // Small delay to let page finish loading
      setTimeout(() => {
        this.displayNotification(newResults);
      }, 1000);
    } else {
      console.log('No new unviewed results');
    }
  }
}

// Initialize and export to window
if (typeof window !== 'undefined') {
  window.ResultNotificationManager = ResultNotificationManager;
  window.resultNotificationManager = new ResultNotificationManager();
}
