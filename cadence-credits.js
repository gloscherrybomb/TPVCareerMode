// cadence-credits.js
// Lightweight client UI for Cadence Credits preview (flagged users only)

import { firebaseConfig } from './firebase-config.js';
import {
  initializeApp,
  getApps
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('[CC] Checking config availability...');
console.log('[CC] window.currencyConfig:', window.currencyConfig);
console.log('[CC] window.unlockConfig:', window.unlockConfig);

const unlockCatalog = (window.unlockConfig && window.unlockConfig.UNLOCK_DEFINITIONS) || [];

console.log('[CC] Unlock catalog loaded:', unlockCatalog.length, 'items');

let userDocData = null;
let userDocRef = null;
let eventLoadoutRendered = false;

function formatBalance(balance) {
  return `${balance || 0} CC`;
}

// Emoji support detection cache
const emojiSupportCache = {};

/**
 * Check if an emoji is supported by the browser
 * Uses canvas rendering to detect if emoji displays correctly
 */
function isEmojiSupported(emoji) {
  if (emojiSupportCache[emoji] !== undefined) {
    return emojiSupportCache[emoji];
  }

  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');

  // Draw the emoji
  ctx.textBaseline = 'top';
  ctx.font = '16px Arial';
  ctx.fillText(emoji, 0, 0);

  // Get pixel data - unsupported emojis render as blank or tofu boxes
  const imageData = ctx.getImageData(0, 0, 20, 20).data;

  // Check if any non-transparent pixels exist
  let hasPixels = false;
  for (let i = 3; i < imageData.length; i += 4) {
    if (imageData[i] > 0) {
      hasPixels = true;
      break;
    }
  }

  // Additional check: compare against a known-unsupported character
  // Some systems render a box for unsupported chars which still has pixels
  if (hasPixels) {
    ctx.clearRect(0, 0, 20, 20);
    ctx.fillText('\uFFFF', 0, 0); // Known unsupported char
    const unsupportedData = ctx.getImageData(0, 0, 20, 20).data;

    // Compare pixel patterns - if identical, emoji likely not supported
    let identical = true;
    for (let i = 0; i < imageData.length; i++) {
      if (Math.abs(imageData[i] - unsupportedData[i]) > 10) {
        identical = false;
        break;
      }
    }
    if (identical) hasPixels = false;
  }

  emojiSupportCache[emoji] = hasPixels;
  return hasPixels;
}

/**
 * Get the emoji for an unlock item, using fallback if needed
 */
function getItemEmoji(item) {
  if (!item) return '⭐';
  if (!item.emoji) return '⭐';
  if (item.emojiFallback && !isEmojiSupported(item.emoji)) {
    return item.emojiFallback;
  }
  return item.emoji;
}

function buildModal() {
  if (document.getElementById('cc-modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'cc-modal-overlay';
  overlay.className = 'cc-modal-overlay';
  overlay.innerHTML = `
    <div class="cc-modal">
      <button class="cc-close" aria-label="Close">&times;</button>
      <h2>Cadence Credits Preview</h2>
      <div class="cc-slot-row" id="cc-slot-row"></div>
      <h3 style="margin:12px 0 4px;">Unlocks</h3>
      <div class="cc-grid" id="cc-grid"></div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });
  overlay.querySelector('.cc-close').addEventListener('click', () => overlay.style.display = 'none');
  document.body.appendChild(overlay);
}

function openModal() {
  const overlay = document.getElementById('cc-modal-overlay');
  if (!overlay) return;
  renderSlots();
  renderGrid();
  overlay.style.display = 'flex';
}

function renderSlots() {
  const row = document.getElementById('cc-slot-row');
  if (!row) return;
  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const balance = userDocData?.currency?.balance || 0;
  row.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'cc-slot';
    const equippedId = userDocData?.unlocks?.equipped?.[i];
    const equippedName = unlockCatalog.find(u => u.id === equippedId)?.name;
    if (i < slotCount) {
      slot.textContent = `Slot ${i + 1}: ${equippedName || 'Empty'}`;

      // Allow unequip directly from slot
      if (equippedId) {
        const btn = document.createElement('button');
        btn.className = 'cc-equip';
        btn.textContent = 'Unequip';
        btn.style.marginLeft = '8px';
        btn.addEventListener('click', () => equipItem(equippedId)); // toggles off
        slot.appendChild(btn);
      }
    } else {
      slot.textContent = `Slot ${i + 1}: Locked`;
    }
    row.appendChild(slot);
  }

  if (slotCount < 3) {
    const cost = slotCount === 1 ? 400 : 1200;
    const btn = document.createElement('button');
    btn.className = 'cc-buy';
    btn.textContent = `Buy Slot ${slotCount + 1} (${cost} CC)`;
    btn.disabled = balance < cost;
    btn.addEventListener('click', () => purchaseSlot(cost));
    row.appendChild(btn);
  }
}

async function purchaseSlot(cost) {
  if (!userDocRef) return;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userDocRef);
      if (!snap.exists()) throw new Error('User not found');
      const data = snap.data();
      const balance = data.currency?.balance || 0;
      const slotCount = data.unlocks?.slotCount || 1;
      if (slotCount >= 3) throw new Error('All slots unlocked');
      if (balance < cost) throw new Error('Insufficient CC');
      tx.update(userDocRef, {
        'currency.balance': balance - cost,
        'unlocks.slotCount': slotCount + 1
      });
    });
    await refreshUser();
  } catch (err) {
    console.error('Slot purchase failed', err);
    alert(err.message);
  }
}

function renderGrid() {
  const grid = document.getElementById('cc-grid');
  if (!grid) return;
  const inventory = userDocData?.unlocks?.inventory || [];
  const equipped = userDocData?.unlocks?.equipped || [];
  const balance = userDocData?.currency?.balance || 0;
  grid.innerHTML = '';

  unlockCatalog.forEach((item) => {
    const card = document.createElement('div');
    card.className = `cc-card cc-tier-${item.tier}`;
    const owned = inventory.includes(item.id);
    const equippedHere = equipped.includes(item.id);
    card.innerHTML = `
      <h4>${item.name}</h4>
      <div class="cc-cost">${item.cost} CC • +${item.pointsBonus} pts</div>
      <div>${item.description}</div>
      <div class="cc-actions"></div>
    `;
    const actions = card.querySelector('.cc-actions');
    if (!owned) {
      const buy = document.createElement('button');
      buy.className = 'cc-buy';
      buy.textContent = balance >= item.cost ? 'Buy' : 'Need CC';
      buy.disabled = balance < item.cost;
      buy.addEventListener('click', () => purchaseItem(item));
      actions.appendChild(buy);
    } else {
      const ownedTag = document.createElement('button');
      ownedTag.className = 'cc-owned';
      ownedTag.textContent = 'Owned';
      actions.appendChild(ownedTag);
      const equip = document.createElement('button');
      equip.className = 'cc-equip';
      equip.textContent = equippedHere ? 'Unequip' : 'Equip';
      equip.addEventListener('click', () => equipItem(item.id));
      actions.appendChild(equip);
    }
    grid.appendChild(card);
  });
}

async function purchaseItem(item) {
  if (!userDocRef) return;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userDocRef);
      const data = snap.data();
      const balance = data.currency?.balance || 0;
      const inventory = data.unlocks?.inventory || [];
      if (inventory.includes(item.id)) return;
      if (balance < item.cost) throw new Error('Insufficient CC');
      tx.update(userDocRef, {
        'currency.balance': balance - item.cost,
        'unlocks.inventory': [...inventory, item.id]
      });
    });
    await refreshUser();
  } catch (err) {
    console.error('Purchase failed', err);
    alert(err.message);
  }
}

async function equipItem(itemId) {
  if (!userDocRef) return;
  try {
    const slotCount = userDocData?.unlocks?.slotCount || 1;
    const current = userDocData?.unlocks?.equipped || [];
    let next = current.slice(0, slotCount);

    // Toggle: if already equipped, remove it
    if (next.includes(itemId)) {
      next = next.filter(id => id !== itemId);
    } else {
      if (next.length < slotCount) {
        next.push(itemId);
      } else {
        next[0] = itemId; // Simple replace policy
      }
    }
    await updateDoc(userDocRef, { 'unlocks.equipped': next });
    await refreshUser();
  } catch (err) {
    console.error('Equip failed', err);
    alert(err.message);
  }
}

async function refreshUser() {
  if (!userDocRef) return;
  const snap = await getDoc(userDocRef);
  userDocData = snap.data();
  renderSlots();
  renderGrid();
  renderProfileButton();
  // Always re-render equipped display if event context exists (don't rely on maybeRenderEventLoadout guard)
  if (window.cadenceEventContext && !window.cadenceEventContext.hasResults) {
    renderEquippedDisplay();
  }
  maybeRenderEventLoadout();
}

function renderProfileButton() {
  // Render CC in profile page elements (button removed from header)
  renderProfileCC();
}

function renderProfileCC() {
  if (!userDocData) return;

  const balance = userDocData.currency?.balance || 0;
  const inventory = userDocData.unlocks?.inventory || [];
  const slotCount = userDocData.unlocks?.slotCount || 1;
  const equipped = userDocData.unlocks?.equipped || [];
  const cooldowns = userDocData.unlocks?.cooldowns || {};

  // Show the section
  const section = document.getElementById('cadenceCreditsSection');
  if (section) {
    section.style.display = 'block';
  }

  // Update balance
  const balanceEl = document.getElementById('ccProfileBalance');
  if (balanceEl) {
    balanceEl.textContent = `${balance} CC`;
  }

  // Update unlocks owned
  const unlocksEl = document.getElementById('ccUnlocksOwned');
  if (unlocksEl) {
    unlocksEl.textContent = inventory.length;
  }

  // Update slots unlocked
  const slotsEl = document.getElementById('ccSlotsUnlocked');
  if (slotsEl) {
    slotsEl.textContent = slotCount;
  }

  // Render active upgrades (collapsible)
  const activeEl = document.getElementById('ccActiveUpgrades');
  if (activeEl) {
    const equippedUnlocks = equipped
      .slice(0, slotCount)
      .map(id => unlockCatalog.find(u => u.id === id))
      .filter(Boolean);

    const hasEquipped = equippedUnlocks.length > 0;
    const count = hasEquipped ? equippedUnlocks.length : 0;

    // Clear container
    activeEl.innerHTML = '';

    // Create header
    const header = document.createElement('div');
    header.className = 'cc-active-header';
    header.id = 'ccActiveHeader';
    header.innerHTML = `
      <div class="cc-active-title">Active Upgrades <span class="cc-active-count">(${count})</span></div>
      <button class="cc-active-toggle" id="ccActiveToggle" aria-label="Toggle active upgrades">
        <span class="cc-toggle-icon">▼</span>
      </button>
    `;
    activeEl.appendChild(header);

    // Create content container
    const content = document.createElement('div');
    content.className = 'cc-active-content collapsed';
    content.id = 'ccActiveContent';

    if (hasEquipped) {
      // Create grid container with compact cards
      const grid = document.createElement('div');
      grid.className = 'cc-active-grid';

      equippedUnlocks.forEach(unlock => {
        const isOnCooldown = cooldowns[unlock.id] === true;
        const card = createUnlockCardSync(unlock, {
          size: 'compact',
          isOwned: true,
          isEquipped: true,
          isResting: isOnCooldown
        });
        grid.appendChild(card);
      });

      content.appendChild(grid);
    } else {
      // Empty state
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'cc-active-empty';
      emptyDiv.textContent = 'No upgrades equipped';
      content.appendChild(emptyDiv);
    }

    activeEl.appendChild(content);

    // Add toggle functionality
    const toggleBtn = document.getElementById('ccActiveToggle');
    const toggleIcon = toggleBtn?.querySelector('.cc-toggle-icon');

    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = content.classList.toggle('collapsed');
        if (toggleIcon) {
          toggleIcon.textContent = isCollapsed ? '▼' : '▲';
        }
      });
    }
  }
}

function renderEquippedDisplay() {
  const panel = document.getElementById('cc-unlock-selector');
  if (!panel) return;

  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const equipped = userDocData?.unlocks?.equipped || [];
  const cooldowns = userDocData?.unlocks?.cooldowns || {};
  const balance = userDocData?.currency?.balance || 0;

  // Get equipped unlocks with full details
  const equippedUnlocks = equipped
    .slice(0, slotCount)
    .map(id => unlockCatalog.find(u => u.id === id))
    .filter(Boolean);

  const hasEquipped = equippedUnlocks.length > 0;

  // Clear panel
  panel.innerHTML = '';

  // Create panel container
  const panelDiv = document.createElement('div');
  panelDiv.className = 'cc-selector-panel';

  // No header - section title "Unlocks" is already shown above

  if (hasEquipped) {
    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'cc-selector-grid';

    // Add equipped unlock cards
    equippedUnlocks.forEach(unlock => {
      const isOnCooldown = cooldowns[unlock.id] === true;
      const card = createUnlockCardSync(unlock, {
        size: 'compact',
        isOwned: true,
        isEquipped: true,
        isResting: isOnCooldown
      });
      grid.appendChild(card);
    });

    // Add empty slots
    const emptySlotCount = slotCount - equippedUnlocks.length;
    for (let i = 0; i < emptySlotCount; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'cc-selector-card';
      emptySlot.style.opacity = '0.5';
      emptySlot.innerHTML = `
        <div class="cc-event-empty">
          <div class="cc-event-empty-icon">📦</div>
          <div style="font-weight:600; margin-bottom:0.5rem;">Empty Slot</div>
          <div style="font-size:0.85rem;">Equip more unlocks in the store</div>
        </div>
      `;
      grid.appendChild(emptySlot);
    }

    panelDiv.appendChild(grid);
  } else {
    // Empty state
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'cc-selector-empty';
    emptyDiv.innerHTML = `
      <div class="cc-event-empty-icon">📦</div>
      <div style="font-weight:600; margin-bottom:0.5rem; font-size:1.2rem;">No Upgrades Equipped</div>
      <div style="font-size:1rem; max-width:500px; margin:0 auto 1.5rem;">Purchase and equip upgrades from the Cadence Credits store to boost your race performance. All equipped upgrades can trigger in one race if conditions are met.</div>
    `;
    panelDiv.appendChild(emptyDiv);
  }

  panel.appendChild(panelDiv);
}

function renderCCResults(eventResults) {
  const panel = document.getElementById('cc-results-panel');
  if (!panel) return;

  const earnedCC = eventResults.earnedCadenceCredits || 0;
  const unlockBonuses = eventResults.unlockBonusesApplied || [];
  const unlockPoints = eventResults.unlockBonusPoints || 0;
  const newBalance = userDocData.currency?.balance || 0;

  const hasEarned = earnedCC > 0;
  const hasUnlock = unlockBonuses.length > 0;

  if (!hasEarned && !hasUnlock) return; // Don't show if nothing to display

  panel.innerHTML = `
    <div class="cc-results-panel">
      <div class="cc-results-header">
        <div class="cc-results-title">Race Rewards</div>
        <div class="cc-results-subtitle">Your Cadence Credits and unlock bonuses for this race</div>
      </div>
      <div class="cc-results-grid">
        ${hasEarned ? `
          <div class="cc-result-card earned">
            <div class="cc-result-icon">⚡</div>
            <div class="cc-result-amount earned">+${earnedCC}</div>
            <div class="cc-result-label">Cadence Credits Earned</div>
            <div class="cc-result-detail">From achievements and awards</div>
            <div class="cc-result-badge">New balance: ${newBalance} CC</div>
          </div>
        ` : ''}
        ${hasUnlock ? `
          <div class="cc-result-card applied">
            <div class="cc-result-icon">${getItemEmoji(unlockCatalog.find(u => u.id === unlockBonuses[0]?.id) || unlockBonuses[0])}</div>
            <div class="cc-result-amount applied">+${unlockPoints}</div>
            <div class="cc-result-label">Unlock Bonus Applied</div>
            <div class="cc-result-detail">${unlockBonuses[0]?.name || 'Unlock'} triggered</div>
            <div class="cc-result-badge">${unlockBonuses[0]?.reason || 'Condition met'}</div>
          </div>
        ` : ''}
        ${!hasUnlock && hasEarned ? `
          <div class="cc-result-card">
            <div class="cc-result-icon">📦</div>
            <div class="cc-result-amount" style="color:var(--text-secondary); font-size:1.5rem;">No Unlock Triggered</div>
            <div class="cc-result-label">Race Performance</div>
            <div class="cc-result-detail">None of your equipped unlocks met trigger conditions this race</div>
            <button class="cc-manage-btn" style="margin-top:1rem;" onclick="window.location.href='store.html'">
              <span>Manage Unlocks</span>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('eventCCResults')?.style.setProperty('display', 'block');
}

function maybeRenderEventLoadout() {
  if (eventLoadoutRendered) return;
  if (!userDocData || !window.cadenceEventContext) return;
  const ctx = window.cadenceEventContext;

  // Show/hide pre-race vs post-race content
  const preRaceContent = document.getElementById('ccPreRaceContent');
  const postRaceContent = document.getElementById('ccPostRaceContent');
  const ccSection = document.getElementById('eventCCSection');

  if (ctx.hasResults) {
    // Hide entire CC section when results exist
    // Unlock bonuses will be shown in the main results table instead
    if (ccSection) ccSection.style.display = 'none';
  } else {
    // Show pre-race equipped display
    if (postRaceContent) postRaceContent.style.display = 'none';
    if (preRaceContent) preRaceContent.style.display = 'block';
    if (ccSection) {
      ccSection.style.display = 'block';
      initCCToggle();
    }
    renderEquippedDisplay();
    initManageLoadoutButton();
  }

  eventLoadoutRendered = true;
}

function initCCToggle() {
  const toggleBtn = document.getElementById('ccSectionToggle');
  const ccSection = document.getElementById('eventCCSection');
  const toggleText = toggleBtn?.querySelector('.cc-toggle-text');

  if (!toggleBtn || !ccSection) return;

  // Load collapse state from localStorage
  const eventNum = window.cadenceEventContext?.eventNumber;
  const storageKey = `cc-section-collapsed-event${eventNum}`;
  const isCollapsed = localStorage.getItem(storageKey) === 'true';

  if (isCollapsed) {
    ccSection.classList.add('cc-collapsed');
    if (toggleText) toggleText.textContent = 'Show';
  }

  // Handle toggle clicks
  toggleBtn.addEventListener('click', () => {
    const collapsed = ccSection.classList.toggle('cc-collapsed');
    if (toggleText) toggleText.textContent = collapsed ? 'Show' : 'Hide';
    localStorage.setItem(storageKey, collapsed);
  });
}

function buildEventLoadoutModal() {
  if (document.getElementById('cc-event-loadout-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'cc-event-loadout-overlay';
  overlay.className = 'cc-modal-overlay';
  overlay.innerHTML = `
    <div class="cc-event-loadout-modal">
      <div class="cc-loadout-modal-header">
        <h2>Manage Loadout</h2>
        <button class="cc-close" aria-label="Close">&times;</button>
      </div>
      <div class="cc-loadout-modal-slots" id="cc-event-slots"></div>
      <div class="cc-loadout-modal-content">
        <h3>Your Unlocks <span class="unlock-count" id="cc-unlock-count"></span></h3>
        <div class="cc-loadout-list" id="cc-event-loadout-list"></div>
      </div>
      <div class="cc-loadout-modal-footer">
        <a href="store.html" class="cc-store-link">View Full Store →</a>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });

  overlay.querySelector('.cc-close').addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  document.body.appendChild(overlay);
}

function renderEventLoadoutModal() {
  const list = document.getElementById('cc-event-loadout-list');
  const slotsContainer = document.getElementById('cc-event-slots');
  const countSpan = document.getElementById('cc-unlock-count');

  if (!list || !slotsContainer || !countSpan) return;

  const inventory = userDocData?.unlocks?.inventory || [];
  const equipped = userDocData?.unlocks?.equipped || [];
  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const cooldowns = userDocData?.unlocks?.cooldowns || {};

  // Render slots
  slotsContainer.innerHTML = '';
  for (let i = 0; i < slotCount; i++) {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'cc-loadout-slot';

    const equippedId = equipped[i];
    if (equippedId) {
      const unlock = unlockCatalog.find(u => u.id === equippedId);
      // Simple boolean cooldown: true = resting for next race
      const onCooldown = cooldowns[equippedId] === true;

      slotDiv.innerHTML = `
        <div class="slot-label">Slot ${i + 1}</div>
        <div class="slot-unlock ${onCooldown ? 'cooldown' : ''}">
          <span class="slot-emoji">${unlock?.emoji || '❓'}</span>
          <span class="slot-name">${unlock?.name || 'Unknown'}</span>
          ${onCooldown ? '<span class="cooldown-badge">Cooldown</span>' : ''}
        </div>
      `;

      // Load image asynchronously and replace emoji
      if (unlock) {
        loadUnlockImage(unlock.id).then(imageSrc => {
          if (imageSrc) {
            const emojiEl = slotDiv.querySelector('.slot-emoji');
            if (emojiEl) {
              const img = document.createElement('img');
              img.className = 'slot-image';
              img.src = imageSrc;
              img.alt = unlock.name;
              emojiEl.replaceWith(img);
            }
          }
        }).catch(() => {
          // Image load failed, keep emoji
        });
      }
    } else {
      slotDiv.innerHTML = `
        <div class="slot-label">Slot ${i + 1}</div>
        <div class="slot-unlock empty">
          <span class="slot-emoji">📦</span>
          <span class="slot-name">Empty</span>
        </div>
      `;
    }

    slotsContainer.appendChild(slotDiv);
  }

  // Render owned unlocks list
  const ownedUnlocks = unlockCatalog.filter(u => inventory.includes(u.id));
  countSpan.textContent = `(${ownedUnlocks.length})`;

  list.innerHTML = '';

  if (ownedUnlocks.length === 0) {
    list.innerHTML = `
      <div class="cc-loadout-empty">
        <div class="empty-icon">📦</div>
        <div class="empty-text">No unlocks purchased yet</div>
        <a href="store.html" class="cc-btn-primary">Visit Store</a>
      </div>
    `;
    return;
  }

  ownedUnlocks.forEach(unlock => {
    const isEquipped = equipped.includes(unlock.id);
    // Simple boolean cooldown: true = resting for next race
    const onCooldown = cooldowns[unlock.id] === true;

    // Create wrapper for card + button
    const wrapper = document.createElement('div');
    wrapper.className = 'loadout-card-wrapper';

    // Create the loadout card using the component
    const card = createUnlockCardSync(unlock, {
      size: 'loadout',
      isOwned: true,
      isEquipped: isEquipped,
      isResting: onCooldown
    });

    // Create equip/unequip button
    const btn = document.createElement('button');
    btn.className = `loadout-btn ${isEquipped ? 'unequip' : 'equip'}`;
    btn.dataset.unlockId = unlock.id;
    btn.textContent = isEquipped ? 'Unequip' : 'Equip';

    btn.addEventListener('click', async () => {
      await equipItem(unlock.id);
      renderEventLoadoutModal(); // Re-render after equip/unequip
    });

    wrapper.appendChild(card);
    wrapper.appendChild(btn);
    list.appendChild(wrapper);
  });
}

function openEventLoadoutModal() {
  const overlay = document.getElementById('cc-event-loadout-overlay');
  if (!overlay) return;

  renderEventLoadoutModal();
  overlay.style.display = 'flex';
}

function initManageLoadoutButton() {
  const btn = document.getElementById('ccEditLoadoutBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    buildEventLoadoutModal();
    openEventLoadoutModal();
  });
}

function start() {
  console.log('[CC] Cadence Credits script starting...');
  // Modal retained for compatibility, but primary flow links to store page.

  // Listen for event context ready event
  window.addEventListener('cadenceEventContextReady', () => {
    console.log('[CC] Event context ready, rendering event loadout...');
    maybeRenderEventLoadout();
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log('[CC] No user logged in');
      return;
    }
    console.log('[CC] User logged in:', user.uid);
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log('[CC] User document not found');
      return;
    }
    const data = snap.data();
    console.log('[CC] User data loaded. Initializing Cadence Credits...');
    userDocData = data;
    userDocRef = ref;
    console.log('[CC] Currency balance:', data.currency?.balance || 0);
    console.log('[CC] Unlocks owned:', data.unlocks?.inventory?.length || 0);
    renderProfileButton();
    // Try rendering now (in case context already exists)
    maybeRenderEventLoadout();
    console.log('[CC] Rendering complete');
  });
}

document.addEventListener('DOMContentLoaded', start);

