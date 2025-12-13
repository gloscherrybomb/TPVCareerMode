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

const FEATURE_FLAG_KEY = (window.currencyConfig && window.currencyConfig.FEATURE_FLAG_KEY) || 'previewCadenceCredits';
const unlockCatalog = (window.unlockConfig && window.unlockConfig.UNLOCK_DEFINITIONS) || [];

console.log('[CC] Feature flag key resolved to:', FEATURE_FLAG_KEY);
console.log('[CC] Unlock catalog loaded:', unlockCatalog.length, 'items');

let userDocData = null;
let userDocRef = null;
let eventLoadoutRendered = false;

function formatBalance(balance) {
  return `${balance || 0} CC`;
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

  // Render active upgrades
  const activeEl = document.getElementById('ccActiveUpgrades');
  if (activeEl) {
    const equippedUnlocks = equipped
      .slice(0, slotCount)
      .map(id => unlockCatalog.find(u => u.id === id))
      .filter(Boolean);

    if (equippedUnlocks.length > 0) {
      activeEl.innerHTML = `
        <div class="cc-active-title">Active Upgrades</div>
        <div class="cc-active-list">
          ${equippedUnlocks.map(unlock => {
            const isOnCooldown = cooldowns[unlock.id] > 0;
            return `
              <div class="cc-active-item ${isOnCooldown ? 'on-cooldown' : ''}">
                <span class="cc-active-emoji">${unlock.emoji || '⭐'}</span>
                <span class="cc-active-name">${unlock.name}</span>
                ${isOnCooldown ? `<span class="cc-active-cooldown">⏱️ Resting</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      activeEl.innerHTML = `
        <div class="cc-active-title">Active Upgrades</div>
        <div class="cc-active-empty">No upgrades equipped</div>
      `;
    }
  }
}

function renderLoadoutPanel() {
  const panel = document.getElementById('cc-loadout-panel');
  if (!panel) return;
  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const equipped = userDocData?.unlocks?.equipped || [];
  const balance = userDocData?.currency?.balance || 0;

  // Get equipped unlocks with full details
  const equippedUnlocks = equipped
    .slice(0, slotCount)
    .map(id => unlockCatalog.find(u => u.id === id))
    .filter(Boolean);

  const hasEquipped = equippedUnlocks.length > 0;

  panel.innerHTML = `
    <div class="cc-event-loadout">
      <div class="cc-event-header">
        <div>
          <div class="cc-event-title">Race Loadout</div>
          <div class="cc-event-subtitle">Your equipped upgrades for this race • Balance: <span class="cc-event-balance">${formatBalance(balance)}</span></div>
        </div>
        <button class="cc-manage-btn" type="button" id="cc-loadout-manage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>Manage Unlocks</span>
        </button>
      </div>
      ${hasEquipped ? `
        <div class="cc-event-grid">
          ${equippedUnlocks.map(unlock => `
            <div class="cc-event-card">
              <div class="cc-event-card-header">
                <div class="cc-event-emoji">${unlock.emoji || '⭐'}</div>
                <div class="cc-event-name">${unlock.name}</div>
              </div>
              <div class="cc-event-desc">${unlock.description}</div>
              <div class="cc-event-bonus">+${unlock.pointsBonus} pts bonus</div>
            </div>
          `).join('')}
          ${slotCount > equippedUnlocks.length ? `
            <div class="cc-event-card">
              <div class="cc-event-empty">
                <div class="cc-event-empty-icon">📦</div>
                <div style="font-weight:600; margin-bottom:0.5rem;">Empty Slot</div>
                <div style="font-size:0.85rem;">Visit the store to equip more unlocks</div>
              </div>
            </div>
          ` : ''}
        </div>
      ` : `
        <div class="cc-event-empty">
          <div class="cc-event-empty-icon">📦</div>
          <div style="font-weight:600; margin-bottom:0.5rem; font-size:1.1rem;">No Upgrades Equipped</div>
          <div class="cc-empty-quickstart">
            <div class="cc-quickstart-title">Quick Start</div>
            <div class="cc-quickstart-steps">
              <div class="cc-quickstart-step">
                <div class="cc-quickstart-number">1</div>
                <div class="cc-quickstart-text"><strong>Earn CC</strong><br>Win races and earn awards to get Cadence Credits</div>
              </div>
              <div class="cc-quickstart-step">
                <div class="cc-quickstart-number">2</div>
                <div class="cc-quickstart-text"><strong>Buy Unlocks</strong><br>Purchase upgrades from the store with your CC</div>
              </div>
              <div class="cc-quickstart-step">
                <div class="cc-quickstart-number">3</div>
                <div class="cc-quickstart-text"><strong>Equip & Race</strong><br>Equip up to 3 unlocks and trigger them in races</div>
              </div>
            </div>
            <a href="store.html" class="cc-empty-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span>Visit Store</span>
            </a>
          </div>
        </div>
      `}
      <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.05); font-size:0.85rem; color:var(--text-secondary); text-align:center;">
        💡 Up to 2 upgrades can trigger per race (highest bonuses win). Only triggered upgrades rest next race. Bonuses add race points only.
      </div>
    </div>
  `;

  const manage = panel.querySelector('#cc-loadout-manage');
  if (manage) manage.addEventListener('click', () => window.location.href = 'store.html');
}

function renderEquippedDisplay() {
  const panel = document.getElementById('cc-unlock-selector');
  if (!panel) return;

  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const equipped = userDocData?.unlocks?.equipped || [];
  const cooldowns = userDocData?.unlocks?.cooldowns || {};

  // Get equipped unlocks with full details
  const equippedUnlocks = equipped
    .slice(0, slotCount)
    .map(id => unlockCatalog.find(u => u.id === id))
    .filter(Boolean);

  const hasEquipped = equippedUnlocks.length > 0;

  panel.innerHTML = `
    <div class="cc-selector-panel">
      <div class="cc-selector-header">
        <div class="cc-selector-title">Your Active Upgrades</div>
        <div class="cc-selector-subtitle">These upgrades are equipped for this race. Up to 2 can trigger if conditions are met. Only triggered upgrades rest next race.</div>
      </div>
      ${hasEquipped ? `
        <div class="cc-selector-grid">
          ${equippedUnlocks.map(unlock => {
            const isOnCooldown = cooldowns[unlock.id] > 0;
            return `
              <div class="cc-selector-card">
                <div class="cc-event-card-header">
                  <div class="cc-event-emoji">${unlock.emoji || '⭐'}</div>
                  <div class="cc-event-name">${unlock.name}</div>
                </div>
                <div class="cc-event-desc">${unlock.description}</div>
                <div class="cc-event-bonus">+${unlock.pointsBonus} pts bonus</div>
                ${isOnCooldown ? `<div style="margin-top:0.75rem; color:var(--warning); font-size:0.85rem; font-weight:600;">⏱️ Resting (${cooldowns[unlock.id]} race${cooldowns[unlock.id] > 1 ? 's' : ''})</div>` : ''}
              </div>
            `;
          }).join('')}
          ${slotCount > equippedUnlocks.length ? `
            <div class="cc-selector-card" style="opacity: 0.5;">
              <div class="cc-event-empty">
                <div class="cc-event-empty-icon">📦</div>
                <div style="font-weight:600; margin-bottom:0.5rem;">Empty Slot</div>
                <div style="font-size:0.85rem;">Equip more unlocks in the store</div>
              </div>
            </div>
          ` : ''}
        </div>
      ` : `
        <div class="cc-selector-empty">
          <div class="cc-event-empty-icon">📦</div>
          <div style="font-weight:600; margin-bottom:0.5rem; font-size:1.2rem;">No Upgrades Equipped</div>
          <div style="font-size:1rem; max-width:500px; margin:0 auto 1.5rem;">Purchase and equip upgrades from the Cadence Credits store to boost your race performance. All equipped upgrades can trigger in one race if conditions are met.</div>
        </div>
      `}
      <div class="cc-selector-action">
        <a href="store.html" class="cc-manage-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>Manage Unlocks in Store</span>
        </a>
      </div>
    </div>
  `;
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
            <div class="cc-result-icon">${unlockBonuses[0]?.emoji || '🎯'}</div>
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

  if (ctx.hasResults) {
    // Show results
    const eventNum = ctx.eventNumber;
    const eventResults = userDocData[`event${eventNum}Results`];
    if (eventResults) {
      renderCCResults(eventResults);
    }
  } else {
    // Show pre-race equipped display
    const selectorMount = document.getElementById('cc-unlock-selector');
    if (selectorMount) {
      renderEquippedDisplay();
      document.getElementById('eventUnlockSelection')?.style.setProperty('display', 'block');
    }

    // Render loadout panel further down
    const loadoutMount = document.getElementById('cc-loadout-panel');
    if (loadoutMount) {
      renderLoadoutPanel();
      document.getElementById('eventLoadoutSection')?.style.setProperty('display', 'block');
    }
  }

  // Show the unified CC section
  const ccSection = document.getElementById('eventCCSection');
  if (ccSection) {
    ccSection.style.display = 'block';
    initCCToggle();
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

function initManageLoadoutButton() {
  const btn = document.getElementById('ccEditLoadoutBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    buildModal();
    openModal();
  });
}

function start() {
  console.log('[CC] Cadence Credits script starting...');
  console.log('[CC] Feature flag key:', FEATURE_FLAG_KEY);
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
    console.log('[CC] User data loaded. Checking feature flag:', FEATURE_FLAG_KEY, '=', data[FEATURE_FLAG_KEY]);
    if (!data[FEATURE_FLAG_KEY]) {
      console.log('[CC] Feature flag not enabled for this user');
      return;
    }
    console.log('[CC] Feature flag enabled! Initializing Cadence Credits...');
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

