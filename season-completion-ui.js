// season-completion-ui.js - UI components and interactions for end-of-season experience

/**
 * Show the season complete celebration modal
 * @param {Object} seasonData - Season statistics and data
 */
function showSeasonCompleteModal(seasonData) {
    const {
        seasonRank,
        totalPoints,
        totalWins,
        totalPodiums,
        totalEvents,
        localTourGCPosition,
        earnedSeasonPodium,
        awards
    } = seasonData;
    
    // Create modal HTML
    const modalHTML = `
        <div class="season-complete-modal" id="seasonCompleteModal">
            <div class="season-complete-content">
                <div class="season-complete-header">
                    <div class="season-trophy">🏆</div>
                    <h2 class="season-complete-title">Season 1 Complete!</h2>
                    <p class="season-complete-subtitle">
                        ${earnedSeasonPodium 
                            ? 'Congratulations on your podium finish!' 
                            : 'Your first season in the books!'}
                    </p>
                </div>
                
                <div class="season-complete-stats">
                    <div class="season-stat-card">
                        <div class="season-stat-value">${seasonRank || '-'}</div>
                        <div class="season-stat-label">Final Rank</div>
                    </div>
                    <div class="season-stat-card">
                        <div class="season-stat-value">${totalPoints}</div>
                        <div class="season-stat-label">Total Points</div>
                    </div>
                    <div class="season-stat-card">
                        <div class="season-stat-value">${totalWins}</div>
                        <div class="season-stat-label">Wins</div>
                    </div>
                    <div class="season-stat-card">
                        <div class="season-stat-value">${totalPodiums}</div>
                        <div class="season-stat-label">Podiums</div>
                    </div>
                </div>
                
                <div class="season-complete-highlights">
                    <h3>Season Highlights</h3>
                    <ul>
                        ${totalEvents === 15 
                            ? '<li>Completed all 15 events in Season 1</li>' 
                            : `<li>Competed in ${totalEvents} events</li>`}
                        ${localTourGCPosition <= 3 
                            ? `<li>Local Tour GC: ${localTourGCPosition === 1 ? '🥇 Winner' : localTourGCPosition === 2 ? '🥈 Second Place' : '🥉 Third Place'}</li>` 
                            : localTourGCPosition 
                            ? `<li>Local Tour GC: ${localTourGCPosition}th place</li>` 
                            : ''}
                        ${earnedSeasonPodium 
                            ? `<li>Season Overall: ${seasonRank === 1 ? '🥇 Champion' : seasonRank === 2 ? '🥈 Runner-up' : '🥉 Third Place'}</li>` 
                            : `<li>Season Overall: ${seasonRank}th place</li>`}
                        ${totalWins > 0 
                            ? `<li>Race victories: ${totalWins}</li>` 
                            : ''}
                        ${awards && awards.gcGold > 0 
                            ? '<li>🏆 GC Winner</li>' 
                            : ''}
                        ${awards && (awards.gcSilver > 0 || awards.gcBronze > 0) 
                            ? '<li>🏆 GC Podium Finisher</li>' 
                            : ''}
                    </ul>
                </div>
                
                <div class="season-complete-footer">
                    <p>Season 2 launches in Spring 2026 with Continental Pro racing.<br>
                    The journey continues!</p>
                    <button class="btn btn-primary" onclick="closeSeasonCompleteModal()">Continue</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('seasonCompleteModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Trigger confetti celebration
    createConfetti();
    
    // Mark that user has seen the celebration modal
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('season1CelebrationShown', 'true');
    }
}

/**
 * Close the season complete modal
 */
function closeSeasonCompleteModal() {
    const modal = document.getElementById('seasonCompleteModal');
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Create confetti animation
 */
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#00ff88', '#00cc6a', '#00aa55', '#ffffff', '#ffdd00'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = (Math.random() * 2) + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
            container.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => confetti.remove(), 5000);
        }, i * 30);
    }
    
    // Remove container after all animations
    setTimeout(() => container.remove(), 6000);
}

/**
 * Show season complete banner on events page
 * @param {Object} userData - User's Firebase data
 * @param {string} summaryText - Season summary text
 */
function showSeasonCompleteBanner(userData, summaryText) {
    const bannerHTML = `
        <div class="season-complete-banner">
            <h2>Season 1 Complete</h2>
            <p>${summaryText}</p>
            <div class="season-complete-actions">
                <button class="btn btn-secondary" disabled>
                    Season 2 Coming Spring 2026
                </button>
                <button class="btn btn-primary" onclick="showResetConfirmation()">
                    Restart Season 1
                </button>
            </div>
        </div>
    `;
    
    // Insert banner at the top of the progress overview section
    const progressOverview = document.querySelector('.progress-overview .container');
    if (progressOverview) {
        // Remove existing banner if present
        const existingBanner = progressOverview.querySelector('.season-complete-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        progressOverview.insertAdjacentHTML('afterbegin', bannerHTML);
    }
}

/**
 * Show reset confirmation modal
 */
function showResetConfirmation() {
    const modalHTML = `
        <div class="reset-confirm-modal" id="resetConfirmModal">
            <div class="reset-confirm-content">
                <div class="reset-confirm-header">
                    <div class="reset-warning-icon">⚠️</div>
                    <h2 class="reset-confirm-title">Reset Season 1?</h2>
                </div>
                
                <div class="reset-confirm-body">
                    <p>Are you sure you want to restart Season 1? This action cannot be undone.</p>
                    
                    <p><strong>You will lose:</strong></p>
                    <ul class="reset-loss-list">
                        <li>All Season 1 event results and race data</li>
                        <li>Your current Season 1 ranking and points</li>
                        <li>All Season 1 awards and achievements</li>
                        <li>Your Local Tour GC position</li>
                    </ul>
                    
                    <p>You will keep your account and TPV UID. You'll start fresh at Stage 1 like a new rider.</p>
                    
                    <p><strong>Important:</strong> You must complete Season 1 again to unlock access to Season 2 when it launches.</p>
                </div>
                
                <div class="reset-confirm-actions">
                    <button class="btn btn-secondary" onclick="closeResetConfirmation()">
                        Cancel
                    </button>
                    <button class="btn btn-danger" onclick="confirmSeasonReset()">
                        Reset Season 1
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('resetConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Close reset confirmation modal
 */
function closeResetConfirmation() {
    const modal = document.getElementById('resetConfirmModal');
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Confirm season reset and trigger the reset process
 */
async function confirmSeasonReset() {
    closeResetConfirmation();
    
    // Show loading state
    const loadingHTML = `
        <div class="season-complete-modal" id="resetLoadingModal">
            <div class="season-complete-content" style="text-align: center;">
                <h2 style="color: var(--accent-green); margin-bottom: 1rem;">Resetting Season 1...</h2>
                <p style="color: var(--text-secondary);">Please wait while we reset your progress.</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    try {
        // Call the reset function (defined in events.js or wherever Firebase is initialized)
        if (typeof window.resetSeason1 === 'function') {
            await window.resetSeason1();
            
            // Close loading modal
            const loadingModal = document.getElementById('resetLoadingModal');
            if (loadingModal) loadingModal.remove();

            // Show Glutton for Punishment award modal
            showGluttonForPunishmentModal();
        } else {
            throw new Error('Reset function not found');
        }
    } catch (error) {
        console.error('Error resetting season:', error);
        
        // Close loading modal
        const loadingModal = document.getElementById('resetLoadingModal');
        if (loadingModal) loadingModal.remove();
        
        alert('Error resetting season. Please try again or contact support.');
    }
}

/**
 * Show Glutton for Punishment award modal after season reset
 */
function showGluttonForPunishmentModal() {
    const modalHTML = `
        <div class="season-complete-modal" id="gluttonModal">
            <div class="season-complete-content" style="text-align: center; max-width: 600px;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🏅</div>
                <h2 style="color: var(--accent-pink); margin-bottom: 1rem; font-family: 'Orbitron', sans-serif;">
                    Special Award Unlocked!
                </h2>
                <div style="padding: 1.5rem; background: rgba(255, 27, 107, 0.1); border: 2px solid rgba(255, 27, 107, 0.3); border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: var(--accent-pink); font-size: 1.5rem; margin-bottom: 0.5rem; font-family: 'Orbitron', sans-serif;">
                        🎖️ Glutton for Punishment
                    </h3>
                    <p style="color: var(--text-primary); font-size: 1rem; margin-bottom: 1rem;">
                        For those brave enough to do it all over again
                    </p>
                    <div style="font-size: 2rem; color: var(--accent-green); font-weight: bold; font-family: 'Orbitron', sans-serif;">
                        +50 Career Points
                    </div>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                    Your season has been reset, but you've earned something special for your determination.
                    These bonus points will count toward your global ranking as you embark on Season 1 once more.
                </p>
                <button class="btn btn-primary" onclick="closeGluttonModal()" style="font-size: 1.1rem; padding: 0.75rem 2rem;">
                    Let's Go! 💪
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add celebration confetti
    createConfetti();
}

/**
 * Close Glutton for Punishment modal and redirect
 */
function closeGluttonModal() {
    const modal = document.getElementById('gluttonModal');
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => {
            modal.remove();
            window.location.reload();
        }, 300);
    }
}

/**
 * Check if season complete celebration should be shown
 * Only show once per session after season completion
 * @param {Object} userData - User's Firebase data
 * @returns {boolean} Whether to show the celebration
 */
function shouldShowCelebration(userData) {
    // Check if season is complete
    if (!window.seasonCompletion) return false;
    
    const completionStatus = window.seasonCompletion.checkSeasonComplete(userData);
    if (!completionStatus.isComplete) return false;
    
    // Check if already shown this session
    if (typeof localStorage !== 'undefined') {
        const shown = localStorage.getItem('season1CelebrationShown');
        if (shown === 'true') return false;
    }
    
    // Check if user has a flag indicating they've already seen it
    if (userData.season1CelebrationViewed === true) return false;
    
    return true;
}

// Export functions
if (typeof window !== 'undefined') {
    window.seasonCompletionUI = {
        showSeasonCompleteModal,
        closeSeasonCompleteModal,
        showSeasonCompleteBanner,
        showResetConfirmation,
        closeResetConfirmation,
        confirmSeasonReset,
        showGluttonForPunishmentModal,
        closeGluttonModal,
        shouldShowCelebration,
        createConfetti
    };

    // Make functions globally available for onclick handlers
    window.closeSeasonCompleteModal = closeSeasonCompleteModal;
    window.showResetConfirmation = showResetConfirmation;
    window.closeResetConfirmation = closeResetConfirmation;
    window.confirmSeasonReset = confirmSeasonReset;
    window.closeGluttonModal = closeGluttonModal;
}
