// store.js - Cadence Credits store page (flagged users only)

import { firebaseConfig } from './firebase-config.js';
import {
  initializeApp,
  getApps
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FEATURE_FLAG_KEY = (window.currencyConfig && window.currencyConfig.FEATURE_FLAG_KEY) || 'previewCadenceCredits';
const unlockCatalog = (window.unlockConfig && window.unlockConfig.UNLOCK_DEFINITIONS) || [];

let userDocRef = null;
let userData = null;

function renderWarning(msg) {
  const w = document.getElementById('storeWarning');
  if (!w) return;
  w.textContent = msg;
  w.style.display = 'block';
}

function renderBalance() {
  const el = document.getElementById('storeBalance');
  if (!el || !userData) return;
  const balance = userData.currency?.balance || 0;
  el.textContent = `Balance: ${balance} CC`;
}

function renderSlots() {
  const wrap = document.getElementById('storeSlots');
  if (!wrap || !userData) return;
  wrap.innerHTML = '';
  const slotCount = userData.unlocks?.slotCount || 1;
  const equipped = userData.unlocks?.equipped || [];
  for (let i = 0; i < 3; i++) {
    const pill = document.createElement('div');
    pill.className = 'slot-pill';
    const equippedId = equipped[i];
    const name = unlockCatalog.find(u => u.id === equippedId)?.name;
    pill.textContent = i < slotCount ? `Slot ${i + 1}: ${name || 'Empty'}` : `Slot ${i + 1}: Locked`;
    wrap.appendChild(pill);
  }
  if (slotCount < 3) {
    const cost = slotCount === 1 ? 400 : 1200;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = `Buy Slot ${slotCount + 1} (${cost} CC)`;
    btn.disabled = (userData.currency?.balance || 0) < cost;
    btn.addEventListener('click', () => purchaseSlot(cost));
    wrap.appendChild(btn);
  }
}

function renderGrid() {
  const grid = document.getElementById('storeGrid');
  if (!grid || !userData) return;
  const balance = userData.currency?.balance || 0;
  const inventory = userData.unlocks?.inventory || [];
  const equipped = userData.unlocks?.equipped || [];
  grid.innerHTML = '';

  unlockCatalog.forEach(item => {
    const owned = inventory.includes(item.id);
    const equippedHere = equipped.includes(item.id);
    const locked = balance < item.cost && !owned;
    const card = document.createElement('div');
    card.className = 'store-card';
    card.innerHTML = `
      <div class="title"><span class="emoji">${item.emoji || '⭐'}</span> <span>${item.name}</span></div>
      <div class="cost">${item.cost} CC • +${item.pointsBonus} pts</div>
      <div class="desc">${item.description}</div>
      <div class="meta">
        <span>Tier: ${item.tier}</span>
        <span>${item.trigger}</span>
      </div>
      <div class="actions"></div>
    `;
    const actions = card.querySelector('.actions');
    if (owned) {
      const ownedTag = document.createElement('span');
      ownedTag.className = 'tag-owned';
      ownedTag.textContent = 'Owned';
      actions.appendChild(ownedTag);

      const equipBtn = document.createElement('button');
      equipBtn.className = 'btn-equip';
      equipBtn.textContent = equippedHere ? 'Equipped' : 'Equip';
      equipBtn.disabled = equippedHere;
      equipBtn.addEventListener('click', () => equipItem(item.id));
      actions.appendChild(equipBtn);
    } else {
      const buyBtn = document.createElement('button');
      buyBtn.className = 'btn-buy';
      buyBtn.textContent = locked ? 'Not enough CC' : 'Buy';
      buyBtn.disabled = locked;
      buyBtn.addEventListener('click', () => purchaseItem(item));
      actions.appendChild(buyBtn);
    }
    grid.appendChild(card);
  });
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
    await refresh();
  } catch (err) {
    alert(err.message);
  }
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
    await refresh();
  } catch (err) {
    alert(err.message);
  }
}

async function equipItem(itemId) {
  if (!userDocRef) return;
  const slotCount = userData.unlocks?.slotCount || 1;
  const current = userData.unlocks?.equipped || [];
  const next = current.slice(0, slotCount);
  if (next.includes(itemId)) return;
  if (next.length < slotCount) {
    next.push(itemId);
  } else {
    next[0] = itemId;
  }
  await runTransaction(db, async (tx) => {
    tx.update(userDocRef, { 'unlocks.equipped': next });
  });
  await refresh();
}

async function refresh() {
  if (!userDocRef) return;
  const snap = await getDoc(userDocRef);
  userData = snap.data();
  renderBalance();
  renderSlots();
  renderGrid();
}

function initAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Please log in from the main site to use the store.');
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = 'index.html';
    });
  }
}

function start() {
  initAuthUI();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      renderWarning('Please log in to use the store.');
      return;
    }
    userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      renderWarning('User not found.');
      return;
    }
    const data = snap.data();
    if (!data[FEATURE_FLAG_KEY]) {
      renderWarning('Cadence Credits preview not enabled for this account.');
      return;
    }
    userData = data;
    renderBalance();
    renderSlots();
    renderGrid();
  });
}

document.addEventListener('DOMContentLoaded', start);
