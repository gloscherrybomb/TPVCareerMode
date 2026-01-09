// season-switcher.js
// Reusable season switcher component for TPV Career Mode
// Can be used on events, standings, profile, and palmares pages

/**
 * SeasonSwitcher class - Creates a dropdown to switch between seasons
 */
class SeasonSwitcher {
  /**
   * Create a season switcher
   * @param {object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {object} options.userData - User data from Firestore
   * @param {number} options.currentSeason - User's current active season
   * @param {number} options.viewingSeason - Currently viewing season (defaults to currentSeason)
   * @param {function} options.onSeasonChange - Callback when season is selected
   * @param {boolean} options.showLabels - Whether to show status labels (Current, Complete, etc.)
   * @param {string} options.mode - 'compact' or 'full' display mode
   */
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.userData = options.userData || null;
    this.currentSeason = options.currentSeason || 1;
    this.viewingSeason = options.viewingSeason || this.currentSeason;
    this.onSeasonChange = options.onSeasonChange || (() => {});
    this.showLabels = options.showLabels !== false;
    this.mode = options.mode || 'full';

    // Get season config
    this.seasonConfig = window.seasonConfig || {};
  }

  /**
   * Check if user can access a specific season
   * @param {number} seasonId - Season to check
   * @returns {boolean}
   */
  canAccessSeason(seasonId) {
    if (this.seasonConfig.canUserAccessSeason) {
      return this.seasonConfig.canUserAccessSeason(this.userData, seasonId);
    }
    // Fallback: only Season 1 is accessible
    return seasonId === 1;
  }

  /**
   * Check if a season is complete for this user
   * @param {number} seasonId - Season to check
   * @returns {boolean}
   */
  isSeasonComplete(seasonId) {
    if (this.seasonConfig.isSeasonComplete) {
      return this.seasonConfig.isSeasonComplete(this.userData, seasonId);
    }
    // Fallback for Season 1
    if (seasonId === 1) {
      return this.userData?.season1Complete === true;
    }
    return false;
  }

  /**
   * Get season status label
   * @param {number} seasonId - Season to check
   * @returns {string} - Status label
   */
  getSeasonStatus(seasonId) {
    const season = this.seasonConfig.SEASON_DEFINITIONS?.[seasonId];
    if (!season) return '';

    // Not released yet
    if (season.status !== 'released') {
      return `Coming ${season.releaseDate}`;
    }

    // Check if user can access
    if (!this.canAccessSeason(seasonId)) {
      const prevSeason = season.unlockRequirements?.previousSeason;
      return `Complete Season ${prevSeason} to unlock`;
    }

    // Check completion status
    if (this.isSeasonComplete(seasonId)) {
      return 'Complete';
    }

    // Current active season
    if (seasonId === this.currentSeason) {
      return 'Current';
    }

    return '';
  }

  /**
   * Render the season switcher
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`SeasonSwitcher: Container #${this.containerId} not found`);
      return;
    }

    const seasons = this.seasonConfig.getAllSeasons?.() ||
                    Object.values(this.seasonConfig.SEASON_DEFINITIONS || {});

    let html = '';

    if (this.mode === 'compact') {
      html = this.renderCompact(seasons);
    } else {
      html = this.renderFull(seasons);
    }

    container.innerHTML = html;
    this.attachListeners();
  }

  /**
   * Render full layout (with label)
   * @param {object[]} seasons - Array of season configs
   * @returns {string} - HTML string
   */
  renderFull(seasons) {
    const trophyIcon = window.TPVIcons ? window.TPVIcons.getIcon('trophy', { size: 'sm' }) : '&#127942;';
    return `
      <div class="season-switcher season-switcher--full">
        <label class="season-switcher__label">
          <span class="season-switcher__icon">${trophyIcon}</span>
          <span>Viewing:</span>
        </label>
        <div class="season-switcher__select-container">
          <select class="season-switcher__select" id="seasonSwitcherSelect">
            ${this.renderOptions(seasons)}
          </select>
          <div class="season-switcher__arrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render compact layout (select only)
   * @param {object[]} seasons - Array of season configs
   * @returns {string} - HTML string
   */
  renderCompact(seasons) {
    return `
      <div class="season-switcher season-switcher--compact">
        <div class="season-switcher__select-container">
          <select class="season-switcher__select" id="seasonSwitcherSelect">
            ${this.renderOptions(seasons)}
          </select>
          <div class="season-switcher__arrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render select options
   * @param {object[]} seasons - Array of season configs
   * @returns {string} - HTML options string
   */
  renderOptions(seasons) {
    return seasons.map(season => {
      const isViewing = season.id === this.viewingSeason;
      const status = this.getSeasonStatus(season.id);
      const isDisabled = season.status !== 'released' || !this.canAccessSeason(season.id);

      let label = `${season.name} - ${season.subtitle}`;

      if (this.showLabels && status) {
        if (season.status !== 'released') {
          label += ` (${status})`;
        } else if (isDisabled) {
          label += ` (Locked)`;
        } else if (status === 'Complete') {
          label += ` [Complete]`;
        } else if (status === 'Current') {
          label += ` [Current]`;
        }
      }

      return `<option value="${season.id}" ${isDisabled ? 'disabled' : ''} ${isViewing ? 'selected' : ''} title="${status}">${label}</option>`;
    }).join('');
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    const select = document.getElementById('seasonSwitcherSelect');
    if (!select) return;

    select.addEventListener('change', (e) => {
      const newSeason = parseInt(e.target.value);

      // Check if can access this season
      if (!this.canAccessSeason(newSeason)) {
        // Revert to current selection
        e.target.value = this.viewingSeason;
        return;
      }

      this.viewingSeason = newSeason;

      // Save to localStorage for persistence
      localStorage.setItem('tpv_viewing_season', newSeason);

      // Update URL parameter
      const url = new URL(window.location);
      if (newSeason === this.currentSeason) {
        url.searchParams.delete('season');
      } else {
        url.searchParams.set('season', newSeason);
      }
      window.history.replaceState({}, '', url);

      // Call callback
      this.onSeasonChange(newSeason);
    });
  }

  /**
   * Update the component with new data
   * @param {object} options - New options to apply
   */
  update(options = {}) {
    if (options.userData !== undefined) this.userData = options.userData;
    if (options.currentSeason !== undefined) this.currentSeason = options.currentSeason;
    if (options.viewingSeason !== undefined) this.viewingSeason = options.viewingSeason;
    this.render();
  }

  /**
   * Get the currently viewing season
   * @returns {number}
   */
  getViewingSeason() {
    return this.viewingSeason;
  }

  /**
   * Check if viewing a historical (completed) season
   * @returns {boolean}
   */
  isViewingHistory() {
    return this.viewingSeason < this.currentSeason && this.isSeasonComplete(this.viewingSeason);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get viewing season from URL or localStorage
 * @param {number} defaultSeason - Default season if none found
 * @returns {number}
 */
function getViewingSeasonFromUrl(defaultSeason = 1) {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlSeason = urlParams.get('season');
  if (urlSeason) {
    return parseInt(urlSeason);
  }

  // Check localStorage
  const storedSeason = localStorage.getItem('tpv_viewing_season');
  if (storedSeason) {
    return parseInt(storedSeason);
  }

  return defaultSeason;
}

/**
 * Create and render a season switcher in one call
 * @param {object} options - Same as SeasonSwitcher constructor
 * @returns {SeasonSwitcher} - The created instance
 */
function createSeasonSwitcher(options) {
  const switcher = new SeasonSwitcher(options);
  switcher.render();
  return switcher;
}

/**
 * Create a "Return to Current Season" button
 * @param {number} currentSeason - The current active season
 * @param {function} onClick - Click handler
 * @returns {string} - HTML string for the button
 */
function createReturnToCurrentButton(currentSeason, onClick) {
  const buttonId = 'returnToCurrentSeasonBtn';

  // Set up click handler after DOM is ready
  setTimeout(() => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener('click', () => {
        onClick(currentSeason);
      });
    }
  }, 0);

  return `
    <button id="${buttonId}" class="season-switcher__return-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3L3 8L8 13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Return to Season ${currentSeason}
    </button>
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export for browser (window object)
if (typeof window !== 'undefined') {
  window.SeasonSwitcher = SeasonSwitcher;
  window.getViewingSeasonFromUrl = getViewingSeasonFromUrl;
  window.createSeasonSwitcher = createSeasonSwitcher;
  window.createReturnToCurrentButton = createReturnToCurrentButton;
}
