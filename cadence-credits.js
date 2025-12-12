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
    .cc-results-panel { background:var(--dark-card); border:2px solid rgba(255,255,255,0.05); border-radius:20px; padding:2rem; }
    .cc-results-header { text-align:center; margin-bottom:2rem; }
    .cc-results-title { font-family:'Orbitron',sans-serif; font-size:2rem; font-weight:900; background:linear-gradient(135deg,var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:0.5rem; }
    .cc-results-subtitle { color:var(--text-secondary); font-size:1rem; }
    .cc-results-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:1.5rem; }
    .cc-result-card { background:var(--dark-elevated); border:2px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.75rem; text-align:center; transition:all 0.3s ease; position:relative; overflow:hidden; }
    .cc-result-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:transparent; }
    .cc-result-card.earned::before { background:linear-gradient(90deg,transparent,var(--success),transparent); }
    .cc-result-card.applied::before { background:linear-gradient(90deg,transparent,var(--accent-blue),transparent); }
    .cc-result-icon { font-size:3rem; margin-bottom:1rem; animation:float 3s ease-in-out infinite; }
    .cc-result-amount { font-family:'Orbitron',sans-serif; font-size:2.5rem; font-weight:900; margin-bottom:0.5rem; }
    .cc-result-amount.earned { background:linear-gradient(135deg,var(--success),#00cc88); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .cc-result-amount.applied { background:linear-gradient(135deg,var(--accent-blue),var(--accent-purple)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .cc-result-label { color:var(--text-secondary); font-size:0.95rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:1rem; }
    .cc-result-detail { color:var(--text-secondary); font-size:0.9rem; line-height:1.5; }
    .cc-result-badge { display:inline-block; padding:0.5rem 1rem; background:rgba(0,255,136,0.1); border:1px solid rgba(0,255,136,0.3); border-radius:50px; color:var(--success); font-weight:700; font-size:0.85rem; margin-top:0.75rem; }
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
          <div style="font-size:0.95rem; max-width:400px; margin:0 auto;">Visit the Cadence Credits store to purchase and equip upgrades. All equipped upgrades can trigger in one race if conditions are met.</div>
        </div>
      `}
      <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.05); font-size:0.85rem; color:var(--text-secondary); text-align:center;">
        💡 All upgrades can trigger in one race if conditions are met. Upgrades that trigger rest for one race. Bonuses add race points only.
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
        <div class="cc-selector-subtitle">These upgrades are equipped for this race. All can trigger if conditions are met.</div>
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

  eventLoadoutRendered = true;
}

function start() {
  console.log('[CC] Cadence Credits script starting...');
  console.log('[CC] Feature flag key:', FEATURE_FLAG_KEY);
  injectStyles();
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
