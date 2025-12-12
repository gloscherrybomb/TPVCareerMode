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
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FEATURE_FLAG_KEY = (window.currencyConfig && window.currencyConfig.FEATURE_FLAG_KEY) || 'previewCadenceCredits';
const unlockCatalog = (window.unlockConfig && window.unlockConfig.UNLOCK_DEFINITIONS) || [];

let userDocData = null;
let userDocRef = null;
let eventLoadoutRendered = false;

function injectStyles() {
  if (document.getElementById('cc-preview-styles')) return;
  const style = document.createElement('style');
  style.id = 'cc-preview-styles';
  style.textContent = `
    .cc-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:9999; }
    .cc-modal { background:#0b0f14; color:#f5f7fa; width:90%; max-width:960px; border-radius:12px; padding:20px; box-shadow:0 12px 40px rgba(0,0,0,0.35); font-family: 'Exo 2', sans-serif; }
    .cc-modal h2 { margin:0 0 8px; display:flex; align-items:center; gap:8px; }
    .cc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; margin-top:12px; }
    .cc-card { background:var(--dark-card, #121822); border:1px solid #1f2a3a; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:6px; }
    .cc-card h4 { margin:0; font-size:15px; }
    .cc-tier-120 { border-color:#4a90e2; }
    .cc-tier-200 { border-color:#3fb27f; }
    .cc-tier-300 { border-color:#f2a950; }
    .cc-tier-400 { border-color:#c77dff; }
    .cc-cost { font-weight:700; }
    .cc-actions button { padding:8px 10px; border:none; border-radius:8px; cursor:pointer; font-weight:700; }
    .cc-buy { background:var(--accent-blue, #4a90e2); color:#fff; }
    .cc-owned { background:#243040; color:#b7c6d8; }
    .cc-equip { background:var(--accent-pink, #ff1b6b); color:#fff; }
    .cc-close { float:right; background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer; }
    .cc-slot-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:8px; }
    .cc-slot { background:#121822; border:1px dashed #1f2a3a; padding:6px 10px; border-radius:8px; }
    .cc-inline-button { display:inline-flex; align-items:center; gap:8px; }
    .cc-inline-button svg { opacity:0.9; }
    .cc-loadout-panel { background:var(--dark-card,#0f1623); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin:12px 0; }
    .cc-loadout-header { display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .cc-loadout-slots { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .cc-loadout-slot { background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.1); padding:8px 10px; border-radius:10px; }
    .cc-event-loadout { background:var(--dark-card,#141824); border:2px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.5rem; }
    .cc-event-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
    .cc-event-title { font-family:'Orbitron',sans-serif; font-size:1.5rem; font-weight:700; color:var(--text-primary); margin-bottom:0.25rem; }
    .cc-event-subtitle { font-size:0.9rem; color:var(--text-secondary); }
    .cc-event-balance { font-family:'Orbitron',sans-serif; font-size:1.2rem; font-weight:700; background:linear-gradient(135deg,var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .cc-event-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:1rem; margin-top:1rem; }
    .cc-event-card { background:var(--dark-elevated,#1a1f2e); border:2px solid rgba(255,255,255,0.05); border-radius:12px; padding:1.25rem; transition:all 0.3s ease; }
    .cc-event-card:hover { border-color:rgba(69,202,255,0.3); transform:translateY(-2px); }
    .cc-event-card-header { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem; }
    .cc-event-emoji { font-size:1.8rem; }
    .cc-event-name { font-weight:700; font-size:1.05rem; color:var(--text-primary); }
    .cc-event-desc { font-size:0.9rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.75rem; }
    .cc-event-bonus { display:inline-block; padding:0.35rem 0.75rem; background:rgba(0,255,136,0.1); border:1px solid rgba(0,255,136,0.3); border-radius:50px; color:var(--success); font-weight:700; font-size:0.85rem; }
    .cc-event-empty { text-align:center; padding:2rem; color:var(--text-secondary); }
    .cc-event-empty-icon { font-size:3rem; opacity:0.3; margin-bottom:1rem; }
    .cc-manage-btn { padding:0.75rem 1.5rem; background:linear-gradient(135deg,var(--accent-pink),var(--accent-purple)); color:white; border:none; border-radius:10px; font-weight:700; font-size:0.95rem; cursor:pointer; transition:all 0.3s ease; display:inline-flex; align-items:center; gap:0.5rem; }
    .cc-manage-btn:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(255,27,107,0.4); }
    .cc-selector-panel { background:linear-gradient(135deg,rgba(255,27,107,0.1),rgba(69,202,255,0.1)); border:2px solid rgba(255,255,255,0.1); border-radius:20px; padding:2rem; margin:2rem 0; }
    .cc-selector-header { text-align:center; margin-bottom:2rem; }
    .cc-selector-title { font-family:'Orbitron',sans-serif; font-size:2rem; font-weight:900; background:linear-gradient(135deg,var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:0.5rem; }
    .cc-selector-subtitle { color:var(--text-secondary); font-size:1rem; }
    .cc-selector-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1.5rem; margin-top:1.5rem; }
    .cc-selector-card { background:var(--dark-card); border:2px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.5rem; cursor:pointer; transition:all 0.3s ease; position:relative; }
    .cc-selector-card:hover { border-color:rgba(69,202,255,0.3); transform:translateY(-5px); box-shadow:0 15px 40px rgba(0,0,0,0.4); }
    .cc-selector-card.selected { border-color:var(--accent-pink); background:linear-gradient(135deg,rgba(255,27,107,0.1),rgba(199,26,229,0.1)); box-shadow:0 0 30px rgba(255,27,107,0.3); }
    .cc-selector-card.selected::before { content:'✓'; position:absolute; top:1rem; right:1rem; width:32px; height:32px; background:linear-gradient(135deg,var(--accent-pink),var(--accent-purple)); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:1.2rem; }
    .cc-selector-empty { text-align:center; padding:3rem; color:var(--text-secondary); }
    .cc-selector-action { text-align:center; margin-top:2rem; }
  `;
  document.head.appendChild(style);
}

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
    slot.textContent = i < slotCount ? `Slot ${i + 1}: ${equippedName || 'Empty'}` : `Slot ${i + 1}: Locked`;
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
      equip.textContent = equippedHere ? 'Equipped' : 'Equip';
      equip.disabled = equippedHere;
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
    const next = current.slice(0, slotCount);
    if (next.includes(itemId)) return;
    if (next.length < slotCount) {
      next.push(itemId);
    } else {
      next[0] = itemId; // Simple replace policy
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
  const header = document.querySelector('.profile-header .profile-photo-section');
  if (!header) return;
  let btn = document.getElementById('cc-profile-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'cc-profile-btn';
    btn.className = 'btn cc-inline-button';
    btn.style.background = 'linear-gradient(135deg, #00c878, #2dd195)';
    btn.style.color = '#0b0f14';
    btn.style.padding = '8px 12px';
    btn.style.fontSize = '0.9rem';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg><span>Cadence Credits</span>`;
    btn.addEventListener('click', () => window.location.href = 'store.html');
    header.appendChild(btn);
  }
  btn.style.display = 'inline-flex';
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
          <div style="font-size:0.95rem; max-width:400px; margin:0 auto;">Visit the Cadence Credits store to purchase and equip upgrades. Only one can trigger per race, and they add bonus points when conditions are met.</div>
        </div>
      `}
      <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.05); font-size:0.85rem; color:var(--text-secondary); text-align:center;">
        💡 Only one upgrade triggers per race, then rests for one race. Bonuses add race points only.
      </div>
    </div>
  `;

  const manage = panel.querySelector('#cc-loadout-manage');
  if (manage) manage.addEventListener('click', () => window.location.href = 'store.html');
}

function renderUnlockSelector() {
  const panel = document.getElementById('cc-unlock-selector');
  if (!panel) return;

  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const equipped = userDocData?.unlocks?.equipped || [];
  const inventory = userDocData?.unlocks?.inventory || [];
  const cooldowns = userDocData?.unlocks?.cooldowns || {};

  // Get owned unlocks with full details
  const ownedUnlocks = inventory
    .map(id => unlockCatalog.find(u => u.id === id))
    .filter(Boolean);

  const hasOwned = ownedUnlocks.length > 0;

  panel.innerHTML = `
    <div class="cc-selector-panel">
      <div class="cc-selector-header">
        <div class="cc-selector-title">Choose Your Race Upgrades</div>
        <div class="cc-selector-subtitle">Select up to ${slotCount} upgrade${slotCount > 1 ? 's' : ''} to equip for this race. Only one can trigger per race.</div>
      </div>
      ${hasOwned ? `
        <div class="cc-selector-grid">
          ${ownedUnlocks.map(unlock => {
            const isEquipped = equipped.includes(unlock.id);
            const isOnCooldown = cooldowns[unlock.id] > 0;
            const slotIndex = equipped.indexOf(unlock.id);
            return `
              <div class="cc-selector-card ${isEquipped ? 'selected' : ''}" data-unlock-id="${unlock.id}">
                <div class="cc-event-card-header">
                  <div class="cc-event-emoji">${unlock.emoji || '⭐'}</div>
                  <div class="cc-event-name">${unlock.name}</div>
                </div>
                <div class="cc-event-desc">${unlock.description}</div>
                <div class="cc-event-bonus">+${unlock.pointsBonus} pts bonus</div>
                ${isOnCooldown ? '<div style="margin-top:0.75rem; color:var(--warning); font-size:0.85rem; font-weight:600;">⏱️ Resting (${cooldowns[unlock.id]} race${cooldowns[unlock.id] > 1 ? 's' : ''})</div>' : ''}
                ${isEquipped ? `<div style="margin-top:0.75rem; color:var(--accent-blue); font-size:0.85rem; font-weight:600;">Slot ${slotIndex + 1}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="cc-selector-action">
          <button class="cc-manage-btn" id="cc-save-loadout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Save Loadout</span>
          </button>
        </div>
      ` : `
        <div class="cc-selector-empty">
          <div class="cc-event-empty-icon">🔒</div>
          <div style="font-weight:600; margin-bottom:0.5rem; font-size:1.2rem;">No Upgrades Owned</div>
          <div style="font-size:1rem; max-width:500px; margin:0 auto 1.5rem;">Purchase upgrades from the Cadence Credits store to boost your race performance.</div>
          <button class="cc-manage-btn" onclick="window.location.href='store.html'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <span>Visit Store</span>
          </button>
        </div>
      `}
    </div>
  `;

  // Add click handlers for selection
  const cards = panel.querySelectorAll('.cc-selector-card');
  cards.forEach(card => {
    card.addEventListener('click', () => toggleUnlockSelection(card.dataset.unlockId));
  });

  const saveBtn = panel.querySelector('#cc-save-loadout');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveLoadout);
  }
}

let pendingEquipped = [];

function toggleUnlockSelection(unlockId) {
  const slotCount = userDocData?.unlocks?.slotCount || 1;
  const current = [...(pendingEquipped.length > 0 ? pendingEquipped : (userDocData?.unlocks?.equipped || []))];

  const idx = current.indexOf(unlockId);
  if (idx >= 0) {
    // Unequip
    current.splice(idx, 1);
  } else {
    // Equip
    if (current.length >= slotCount) {
      // Replace last slot
      current[slotCount - 1] = unlockId;
    } else {
      current.push(unlockId);
    }
  }

  pendingEquipped = current;
  renderUnlockSelector();
}

async function saveLoadout() {
  if (!userDocRef || pendingEquipped.length === 0) return;
  try {
    await updateDoc(userDocRef, { 'unlocks.equipped': pendingEquipped });
    userDocData.unlocks.equipped = pendingEquipped;
    pendingEquipped = [];
    renderUnlockSelector();
    alert('✓ Loadout saved successfully!');
  } catch (err) {
    console.error('Save loadout failed:', err);
    alert('Failed to save loadout: ' + err.message);
  }
}

function maybeRenderEventLoadout() {
  if (eventLoadoutRendered) return;
  if (!userDocData || !window.cadenceEventContext) return;
  const ctx = window.cadenceEventContext;
  if (ctx.hasResults) return; // Only show when event not yet completed

  // Render unlock selector at top
  const selectorMount = document.getElementById('cc-unlock-selector');
  if (selectorMount) {
    renderUnlockSelector();
    document.getElementById('eventUnlockSelection')?.style.setProperty('display', 'block');
  }

  // Render loadout panel further down
  const loadoutMount = document.getElementById('cc-loadout-panel');
  if (loadoutMount) {
    renderLoadoutPanel();
    document.getElementById('eventLoadoutSection')?.style.setProperty('display', 'block');
  }

  eventLoadoutRendered = true;
}

function start() {
  injectStyles();
  // Modal retained for compatibility, but primary flow links to store page.

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data[FEATURE_FLAG_KEY]) return;
    userDocData = data;
    userDocRef = ref;
    renderProfileButton();
    maybeRenderEventLoadout();
  });
}

document.addEventListener('DOMContentLoaded', start);
