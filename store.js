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
  const warningEl = document.getElementById('storeWarning');
  const messageEl = document.getElementById('warningMessage');
  if (!warningEl || !messageEl) return;
  messageEl.textContent = msg;
  warningEl.style.display = 'flex';
}

function renderBalance() {
  const el = document.getElementById('storeBalance');
  if (!el || !userData) return;
  const balance = userData.currency?.balance || 0;
  el.textContent = `${balance.toLocaleString()} CC`;
}

function renderSlots() {
  const wrap = document.getElementById('storeSlots');
  if (!wrap || !userData) return;
  wrap.innerHTML = '';

  const slotCount = userData.unlocks?.slotCount || 1;
  const equipped = userData.unlocks?.equipped || [];
  const balance = userData.currency?.balance || 0;

  for (let i = 0; i < 3; i++) {
    const slotItem = document.createElement('div');
    slotItem.className = `slot-item ${i >= slotCount ? 'slot-locked' : ''}`;

    const slotInfo = document.createElement('div');
    slotInfo.className = 'slot-info';

    const slotNumber = document.createElement('div');
    slotNumber.className = 'slot-number';
    slotNumber.textContent = `Slot ${i + 1}`;
    slotInfo.appendChild(slotNumber);

    if (i < slotCount) {
      const equippedId = equipped[i];
      const unlock = unlockCatalog.find(u => u.id === equippedId);
      const slotEquipped = document.createElement('div');
      slotEquipped.className = 'slot-equipped';
      slotEquipped.textContent = unlock ? `${unlock.emoji || '⭐'} ${unlock.name}` : 'Empty';
      slotInfo.appendChild(slotEquipped);
    } else {
      const lockedText = document.createElement('div');
      lockedText.className = 'slot-locked-text';
      lockedText.textContent = 'Locked';
      slotInfo.appendChild(lockedText);
    }

    slotItem.appendChild(slotInfo);

    // Add unlock button if slot is locked
    if (i >= slotCount && slotCount < 3) {
      const cost = slotCount === 1 ? 400 : 1200;
      const actions = document.createElement('div');
      actions.className = 'slot-actions';

      const btn = document.createElement('button');
      btn.className = 'btn-unlock-slot';
      btn.textContent = `Unlock for ${cost} CC`;
      btn.disabled = balance < cost;
      btn.addEventListener('click', () => purchaseSlot(cost));
      actions.appendChild(btn);
      slotItem.appendChild(actions);
    }

    wrap.appendChild(slotItem);
  }
}

function renderGrid() {
  if (!userData) return;

  const balance = userData.currency?.balance || 0;
  const inventory = userData.unlocks?.inventory || [];
  const equipped = userData.unlocks?.equipped || [];

  // Group unlocks by tier
  const tiers = {
    120: [],
    200: [],
    300: [],
    400: []
  };

  unlockCatalog.forEach(item => {
    if (tiers[item.tier]) {
      tiers[item.tier].push(item);
    }
  });

  // Render each tier
  Object.keys(tiers).forEach(tier => {
    const gridEl = document.getElementById(`tier-${tier}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';

    tiers[tier].forEach(item => {
      const owned = inventory.includes(item.id);
      const equippedHere = equipped.includes(item.id);

      // Check personality requirements
      const personality = userData.personality || {};
      const meetsPersonalityReqs = !item.requiredPersonality || Object.entries(item.requiredPersonality).every(
        ([trait, required]) => (personality[trait] || 0) >= required
      );

      const card = document.createElement('div');
      card.className = `unlock-card tier-${tier}`;

      let personalityInfo = '';
      if (item.personalityBonus) {
        const bonuses = Object.entries(item.personalityBonus).map(([trait, val]) =>
          `+${val} ${trait.charAt(0).toUpperCase() + trait.slice(1)}`
        ).join(', ');
        personalityInfo = `<div class="unlock-personality-bonus">✨ ${bonuses}</div>`;
      }
      if (item.requiredPersonality && !meetsPersonalityReqs) {
        const reqs = Object.entries(item.requiredPersonality).map(([trait, val]) => {
          const current = personality[trait] || 0;
          return `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${current}/${val}`;
        }).join(', ');
        personalityInfo = `<div class="unlock-personality-locked">🔒 Requires: ${reqs}</div>`;
      }

      card.innerHTML = `
        <div class="unlock-header">
          <div class="unlock-emoji">${item.emoji || '⭐'}</div>
          <div class="unlock-title">
            <div class="unlock-name">${item.name}</div>
            <div class="unlock-cost">${item.cost} CC</div>
          </div>
        </div>
        <div class="unlock-description">${item.description}</div>
        <div class="unlock-bonus">+${item.pointsBonus} pts</div>
        ${personalityInfo}
        <div class="unlock-actions"></div>
      `;

      const actions = card.querySelector('.unlock-actions');

      if (owned) {
        const status = document.createElement('div');
        status.className = 'unlock-status';
        status.textContent = '✓ Owned';
        actions.appendChild(status);

        const equipBtn = document.createElement('button');
        equipBtn.className = 'btn-equip';
        equipBtn.textContent = equippedHere ? '✓ Equipped' : 'Equip';
        equipBtn.disabled = equippedHere || !meetsPersonalityReqs;
        if (!meetsPersonalityReqs) {
          equipBtn.title = 'Personality requirements not met';
        }
        equipBtn.addEventListener('click', () => equipItem(item.id));
        actions.appendChild(equipBtn);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn-buy';
        if (!meetsPersonalityReqs) {
          buyBtn.textContent = 'Personality Locked';
          buyBtn.disabled = true;
        } else if (balance >= item.cost) {
          buyBtn.textContent = 'Purchase';
          buyBtn.disabled = false;
        } else {
          buyBtn.textContent = `Need ${item.cost - balance} more CC`;
          buyBtn.disabled = true;
        }
        if (!buyBtn.disabled) {
          buyBtn.addEventListener('click', () => purchaseItem(item));
        }
        actions.appendChild(buyBtn);
      }

      gridEl.appendChild(card);
    });
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
    console.error('Slot purchase failed:', err);
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
    console.error('Purchase failed:', err);
    alert(err.message);
  }
}

async function equipItem(itemId) {
  if (!userDocRef) return;
  const slotCount = userData.unlocks?.slotCount || 1;
  const current = userData.unlocks?.equipped || [];
  const inventory = userData.unlocks?.inventory || [];

  if (!inventory.includes(itemId)) {
    alert('You must own this item to equip it');
    return;
  }

  const next = current.slice(0, slotCount);
  if (next.includes(itemId)) return;

  if (next.length < slotCount) {
    next.push(itemId);
  } else {
    // Replace first slot
    next[0] = itemId;
  }

  try {
    await runTransaction(db, async (tx) => {
      tx.update(userDocRef, { 'unlocks.equipped': next });
    });
    await refresh();
  } catch (err) {
    console.error('Equip failed:', err);
    alert(err.message);
  }
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
      window.location.href = 'index.html';
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
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!user) {
      if (loginBtn) loginBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      renderWarning('Please log in to access the Cadence Credits store.');
      return;
    }

    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';

    userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      renderWarning('User profile not found.');
      return;
    }

    const data = snap.data();
    if (!data[FEATURE_FLAG_KEY]) {
      renderWarning('Cadence Credits preview is not enabled for your account. This feature is currently in testing.');
      return;
    }

    userData = data;
    renderBalance();
    renderSlots();
    renderGrid();
  });
}

document.addEventListener('DOMContentLoaded', start);
