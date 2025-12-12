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
  runTransaction,
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
    btn.className = 'btn btn-secondary cc-inline-button';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg><span>Cadence Credits</span>`;
    btn.addEventListener('click', openModal);
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

  panel.innerHTML = `
    <div class="cc-loadout-panel">
      <div class="cc-loadout-header">
        <div>
          <div style="font-weight:700;">Race Loadout</div>
          <div style="font-size:13px; opacity:0.8;">Balance: ${formatBalance(balance)}</div>
        </div>
        <button class="btn btn-primary cc-inline-button" type="button" id="cc-loadout-manage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
          <span>Manage Unlocks</span>
        </button>
      </div>
      <div class="cc-loadout-slots">
        ${Array.from({ length: 3 }).map((_, i) => {
          const equippedId = equipped[i];
          const name = unlockCatalog.find(u => u.id === equippedId)?.name;
          const content = i < slotCount ? (name || 'Empty') : 'Locked';
          return `<div class="cc-loadout-slot">Slot ${i + 1}: ${content}</div>`;
        }).join('')}
      </div>
    </div>
  `;

  const manage = panel.querySelector('#cc-loadout-manage');
  if (manage) manage.addEventListener('click', openModal);
}

function maybeRenderEventLoadout() {
  if (eventLoadoutRendered) return;
  if (!userDocData || !window.cadenceEventContext) return;
  const ctx = window.cadenceEventContext;
  if (ctx.hasResults) return; // Only show when event not yet completed
  const mount = document.getElementById('cc-loadout-panel');
  if (!mount) return;
  renderLoadoutPanel();
  document.getElementById('eventLoadoutSection')?.style.setProperty('display', 'block');
  eventLoadoutRendered = true;
}

function start() {
  injectStyles();
  buildModal();

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
