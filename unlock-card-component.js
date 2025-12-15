// Unlock Card Component
// Generates unlock card DOM elements for any size variant

/**
 * Creates an unlock card element
 * @param {Object} unlock - Unlock definition object
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - Card DOM element
 */
async function createUnlockCard(unlock, options = {}) {
  const {
    size = 'full',              // 'full' | 'compact' | 'badge'
    showNarrative = size === 'full',
    showTrigger = size !== 'badge',
    showCost = size !== 'compact',
    clickable = false,
    onClick = null,
    isOwned = false,
    isEquipped = false,
    isLocked = false,
    isResting = false
  } = options;

  // Create card container
  const card = document.createElement('div');
  card.className = `unlock-card unlock-card-${size} tier-${unlock.tier}`;

  // Add state classes
  if (isOwned) card.classList.add('owned');
  if (isEquipped) card.classList.add('equipped');
  if (isLocked) card.classList.add('locked');
  if (isResting) card.classList.add('resting');

  // Make clickable if requested
  if (clickable && onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', onClick);
  }

  // Try to load image, fallback to emoji (skip for locked cards)
  const imageSrc = isLocked ? null : await loadUnlockImage(unlock.id);

  // Build card HTML
  card.innerHTML = `
    ${createImageArea(unlock, imageSrc, size, isLocked)}
    ${createCardBody(unlock, size, showTrigger, showNarrative, showCost, isLocked)}
  `;

  // Add cooldown indicator if resting
  if (isResting) {
    const cooldownBadge = document.createElement('span');
    cooldownBadge.className = 'cooldown-indicator';
    cooldownBadge.textContent = 'Resting';
    card.querySelector('.card-image-area').appendChild(cooldownBadge);
  }

  return card;
}

/**
 * Creates the image area of the card
 */
function createImageArea(unlock, imageSrc, size, isLocked = false) {
  // For locked cards, show mystery icon
  if (isLocked) {
    return `
      <div class="card-image-area locked-image-area">
        <span class="card-emoji locked-emoji">🔒</span>
        <span class="points-badge locked-badge">?</span>
      </div>
    `;
  }

  const imageContent = imageSrc
    ? `<img class="card-image" src="${imageSrc}" alt="${unlock.name}">`
    : `<span class="card-emoji">${unlock.emoji}</span>`;

  // Hide points badge on badge size (profile page)
  const showPointsBadge = size !== 'badge';

  return `
    <div class="card-image-area">
      ${imageContent}
      ${showPointsBadge ? `<span class="points-badge">+${unlock.pointsBonus}</span>` : ''}
    </div>
  `;
}

/**
 * Creates the body content of the card
 */
function createCardBody(unlock, size, showTrigger, showNarrative, showCost, isLocked = false) {
  const personalityTag = unlock.personality
    ? `<span class="personality-tag">+${unlock.personality}</span>`
    : (unlock.requires
      ? `<span class="personality-tag">${unlock.requires}</span>`
      : '');

  // For badge size, just show name (minimal)
  if (size === 'badge') {
    return `
      <div class="card-body">
        <div class="card-header">
          <span class="card-name">${isLocked ? '???' : unlock.name}</span>
        </div>
      </div>
    `;
  }

  // For compact size (profile & event-detail), show mini card with trigger only
  if (size === 'compact') {
    if (isLocked) {
      return `
        <div class="card-body">
          <div class="card-header">
            <span class="card-name locked-name">???</span>
          </div>
          <div class="trigger-box locked-trigger">
            <div class="trigger-label">Trigger Condition</div>
            <div class="trigger-text">Purchase to reveal</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="card-body">
        <div class="card-header">
          <span class="card-name">${unlock.name}</span>
        </div>
        <div class="trigger-box">
          <div class="trigger-label">Trigger Condition</div>
          <div class="trigger-text">${unlock.description}</div>
        </div>
      </div>
    `;
  }

  // For locked cards (full size), obscure details but show cost
  if (isLocked) {
    return `
      <div class="card-body">
        <div class="card-header">
          <span class="card-name locked-name">???</span>
        </div>
        ${showTrigger ? `
          <div class="trigger-box locked-trigger">
            <div class="trigger-label">Trigger Condition</div>
            <div class="trigger-text">Purchase to reveal</div>
          </div>
        ` : ''}
        ${showNarrative ? `
          <p class="card-narrative locked-narrative">This upgrade's details are hidden until purchased.</p>
        ` : ''}
        ${showCost ? `
          <div class="card-footer">
            <span class="cost-display">${unlock.cost} CC</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // For full size (unlocked)
  return `
    <div class="card-body">
      <div class="card-header">
        <span class="card-name">${unlock.name}</span>
      </div>
      ${showTrigger ? `
        <div class="trigger-box">
          <div class="trigger-label">Trigger Condition</div>
          <div class="trigger-text">${unlock.description}</div>
        </div>
      ` : ''}
      ${showNarrative ? `
        <p class="card-narrative">${unlock.narrative}</p>
      ` : ''}
      ${showCost ? `
        <div class="card-footer">
          <span class="cost-display">${unlock.cost} CC</span>
          ${personalityTag}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Synchronous version that creates card immediately with emoji
 * Loads image in background and updates when ready
 */
function createUnlockCardSync(unlock, options = {}) {
  const {
    size = 'full',
    showNarrative = size === 'full',
    showTrigger = size !== 'badge',
    showCost = size !== 'compact',
    clickable = false,
    onClick = null,
    isOwned = false,
    isEquipped = false,
    isLocked = false,
    isResting = false
  } = options;

  // Create card container
  const card = document.createElement('div');
  card.className = `unlock-card unlock-card-${size} tier-${unlock.tier}`;

  // Add state classes
  if (isOwned) card.classList.add('owned');
  if (isEquipped) card.classList.add('equipped');
  if (isLocked) card.classList.add('locked');
  if (isResting) card.classList.add('resting');

  // Make clickable if requested
  if (clickable && onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', onClick);
  }

  // Start with emoji, load image in background (skip image loading for locked cards)
  card.innerHTML = `
    ${createImageArea(unlock, null, size, isLocked)}
    ${createCardBody(unlock, size, showTrigger, showNarrative, showCost, isLocked)}
  `;

  // Add cooldown indicator if resting
  if (isResting) {
    const cooldownBadge = document.createElement('span');
    cooldownBadge.className = 'cooldown-indicator';
    cooldownBadge.textContent = 'Resting';
    card.querySelector('.card-image-area').appendChild(cooldownBadge);
  }

  // Load image asynchronously and update (only for unlocked cards)
  if (!isLocked) {
    loadUnlockImage(unlock.id).then(imageSrc => {
      if (imageSrc) {
        const imageArea = card.querySelector('.card-image-area');
        const emoji = imageArea.querySelector('.card-emoji');

        if (emoji) {
          const img = document.createElement('img');
          img.className = 'card-image';
          img.src = imageSrc;
          img.alt = unlock.name;

          // Replace emoji with image
          emoji.replaceWith(img);
        }
      }
    }).catch(() => {
      // Image load failed, keep emoji
    });
  }

  return card;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createUnlockCard,
    createUnlockCardSync
  };
}

if (typeof window !== 'undefined') {
  window.unlockCardComponent = {
    createUnlockCard,
    createUnlockCardSync
  };
}
