// News Ticker for TPV Career Mode
// Displays dismissible news updates below the navbar

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================

    // Increment this version number when adding new news items
    const NEWS_VERSION = 1;

    // LocalStorage key (follows tpv_ prefix convention)
    const STORAGE_KEY = 'tpv_news_ticker_dismissed_version';

    // News items (newest first)
    const NEWS_ITEMS = [
   
        {
            date: '10th Jan 2026',
            text: 'New event images, results feed and notifications'
        },
        {
            date: '5th Jan 2026',
            text: 'Season 1 Now Live!'
        }
    ];

    // ========================================
    // STATE MANAGEMENT
    // ========================================

    function getDismissedVersion() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? parseInt(stored, 10) : 0;
        } catch (e) {
            console.warn('Failed to read news ticker state:', e);
            return 0;
        }
    }

    function setDismissedVersion(version) {
        try {
            localStorage.setItem(STORAGE_KEY, version.toString());
        } catch (e) {
            console.warn('Failed to save news ticker state:', e);
        }
    }

    function shouldShowTicker() {
        const dismissedVersion = getDismissedVersion();
        return NEWS_VERSION > dismissedVersion;
    }

    // ========================================
    // DOM MANIPULATION
    // ========================================

    function renderNewsItems() {
        const container = document.getElementById('newsTickerItems');
        if (!container) return;

        container.innerHTML = NEWS_ITEMS.map(item => `
            <div class="news-ticker-item">
                <span class="news-date">${item.date}</span>
                <span class="news-separator">-</span>
                <span class="news-text">${item.text}</span>
            </div>
        `).join('');
    }

    function positionTicker() {
        const ticker = document.getElementById('newsTicker');
        const navbar = document.querySelector('.navbar');
        if (!ticker || !navbar) return;

        const navbarHeight = navbar.getBoundingClientRect().height;
        ticker.style.top = navbarHeight + 'px';
    }

    function showTicker() {
        const ticker = document.getElementById('newsTicker');
        if (!ticker) return;

        positionTicker();
        ticker.classList.remove('hidden');
        document.body.classList.add('has-news-ticker');
    }

    function hideTicker() {
        const ticker = document.getElementById('newsTicker');
        if (!ticker) return;

        ticker.classList.add('hidden');
        document.body.classList.remove('has-news-ticker');
    }

    function dismissTicker() {
        setDismissedVersion(NEWS_VERSION);
        hideTicker();
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    function initEventListeners() {
        const closeBtn = document.getElementById('newsTickerClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', dismissTicker);
        }

        // Allow dismissing with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const ticker = document.getElementById('newsTicker');
                if (ticker && !ticker.classList.contains('hidden')) {
                    dismissTicker();
                }
            }
        });

        // Reposition ticker on window resize (navbar height may change)
        window.addEventListener('resize', () => {
            const ticker = document.getElementById('newsTicker');
            if (ticker && !ticker.classList.contains('hidden')) {
                positionTicker();
            }
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        // Render news items
        renderNewsItems();

        // Check if we should show the ticker
        if (shouldShowTicker()) {
            showTicker();
        }

        // Set up event listeners
        initEventListeners();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
