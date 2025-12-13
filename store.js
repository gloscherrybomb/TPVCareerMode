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
let currentFilter = 'all';
let currentSort = 'tier';
let currentSearch = '';

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
    const slotChip = document.createElement('div');
    slotChip.className = `slot-chip ${i >= slotCount ? 'slot-chip-locked' : ''}`;

    if (i < slotCount) {
      const equippedId = equipped[i];
      const unlock = unlockCatalog.find(u => u.id === equippedId);

      const slotLabel = document.createElement('span');
      slotLabel.className = 'slot-chip-label';
      slotLabel.textContent = `Slot ${i + 1}:`;
      slotChip.appendChild(slotLabel);

      const slotContent = document.createElement('span');
      slotContent.className = 'slot-chip-content';
      slotContent.textContent = unlock ? `${unlock.emoji || '🎯'} ${unlock.name}` : 'Empty';
      slotChip.appendChild(slotContent);

      // Allow unequip directly from slot
      if (unlock) {
        const unequipBtn = document.createElement('button');
        unequipBtn.className = 'slot-chip-unequip';
        unequipBtn.textContent = '×';
        unequipBtn.title = 'Unequip';
        unequipBtn.addEventListener('click', () => equipItem(equippedId));
        slotChip.appendChild(unequipBtn);
      }
    } else {
      const slotLabel = document.createElement('span');
      slotLabel.className = 'slot-chip-label';
      slotLabel.textContent = `Slot ${i + 1}:`;
      slotChip.appendChild(slotLabel);

      const lockedText = document.createElement('span');
      lockedText.className = 'slot-chip-locked-text';
      lockedText.textContent = 'Locked';
      slotChip.appendChild(lockedText);

      // Add unlock button next to locked slot
      if (i >= slotCount && slotCount < 3) {
        const cost = slotCount === 1 ? 400 : 1200;
        const btn = document.createElement('button');
        btn.className = 'slot-chip-unlock-btn';
        btn.textContent = `Unlock ${cost} CC`;
        btn.disabled = balance < cost;
        btn.addEventListener('click', () => purchaseSlot(cost));
        slotChip.appendChild(btn);
      }
    }

    wrap.appendChild(slotChip);
  }
}

function initTierCollapse() {
  // Attach click handlers to each tier section
  const tierSections = document.querySelectorAll('.tier-section');

  tierSections.forEach(tierSection => {
    const tier = tierSection.getAttribute('data-tier');
    const collapseBtn = tierSection.querySelector('.tier-collapse-btn');
    const icon = tierSection.querySelector('.tier-collapse-icon');

    if (collapseBtn && icon) {
      // Remove existing listener by cloning
      const newBtn = collapseBtn.cloneNode(true);
      collapseBtn.replaceWith(newBtn);

      // Re-query icon after cloning
      const newIcon = tierSection.querySelector('.tier-collapse-icon');

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isCollapsed = tierSection.classList.contains('tier-collapsed');

        if (isCollapsed) {
          tierSection.classList.remove('tier-collapsed');
          if (newIcon) newIcon.textContent = '▼';
        } else {
          tierSection.classList.add('tier-collapsed');
          if (newIcon) newIcon.textContent = '▶';
        }

        // Save state to localStorage
        const collapseState = JSON.parse(localStorage.getItem('tierCollapseState') || '{}');
        collapseState[tier] = !isCollapsed;
        localStorage.setItem('tierCollapseState', JSON.stringify(collapseState));
      });
    }
  });
}

function initStoreControls() {
  const filterSelect = document.getElementById('storeFilter');
  const sortSelect = document.getElementById('storeSort');
  const searchInput = document.getElementById('storeSearch');

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderGrid();
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value;
        renderGrid();
      }, 300); // Debounce for 300ms
    });
  }
}

function renderGrid() {
  if (!userData) return;

  const balance = userData.currency?.balance || 0;
  const inventory = userData.unlocks?.inventory || [];
  const equipped = userData.unlocks?.equipped || [];
  const personality = userData.personality || {};

  // Group unlocks by tier
  const tiers = {
    120: [],
    200: [],
    300: [],
    400: []
  };

  // Apply filtering and sorting
  let filteredCatalog = unlockCatalog.filter(item => {
    // Apply search filter
    if (currentSearch && !item.name.toLowerCase().includes(currentSearch.toLowerCase())) {
      return false;
    }

    // Apply category filter
    const owned = inventory.includes(item.id);
    const canAfford = balance >= item.cost;

    // Check personality requirements
    let meetsPersonality = true;
    if (item.requiredBalanced) {
      const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];
      meetsPersonality = traits.every(trait => {
        const value = personality[trait] || 50;
        return value >= 45 && value <= 65;
      });
    } else if (item.requiredPersonality) {
      meetsPersonality = Object.entries(item.requiredPersonality).every(
        ([trait, required]) => (personality[trait] || 0) >= required
      );
    }

    const isLocked = !owned && (!meetsPersonality || !canAfford);

    switch (currentFilter) {
      case 'owned':
        return owned;
      case 'unowned':
        return !owned;
      case 'affordable':
        return !owned && canAfford && meetsPersonality;
      case 'locked':
        return isLocked;
      default:
        return true;
    }
  });

  // Apply sorting
  filteredCatalog.sort((a, b) => {
    switch (currentSort) {
      case 'cost-asc':
        return a.cost - b.cost;
      case 'cost-desc':
        return b.cost - a.cost;
      case 'bonus-asc':
        return a.pointsBonus - b.pointsBonus;
      case 'bonus-desc':
        return b.pointsBonus - a.pointsBonus;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'tier':
      default:
        return a.tier - b.tier;
    }
  });

  filteredCatalog.forEach(item => {
    if (tiers[item.tier]) {
      tiers[item.tier].push(item);
    }
  });

  // Load collapse state from localStorage
  const collapseState = JSON.parse(localStorage.getItem('tierCollapseState') || '{}');

  // Render each tier
  Object.keys(tiers).forEach(tier => {
    const gridEl = document.getElementById(`tier-${tier}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // Calculate progress based on full catalog, not filtered view
    const allItemsInTier = unlockCatalog.filter(item => item.tier === parseInt(tier));
    const totalItems = allItemsInTier.length;
    const ownedItems = allItemsInTier.filter(item => inventory.includes(item.id)).length;
    const progressEl = document.getElementById(`tier-progress-${tier}`);
    if (progressEl) {
      progressEl.textContent = `${ownedItems}/${totalItems} owned`;
      progressEl.className = `tier-progress ${ownedItems === totalItems && totalItems > 0 ? 'tier-progress-complete' : ''}`;
    }

    // Determine default collapse state (collapse if all owned, expand otherwise)
    const section = document.querySelector(`.tier-section[data-tier="${tier}"]`);
    const toggle = document.querySelector(`[data-tier-toggle="${tier}"]`);
    const icon = toggle?.querySelector('.tier-collapse-icon');

    if (section) {
      // Check if we have a saved state, otherwise use default logic
      if (collapseState.hasOwnProperty(tier)) {
        if (collapseState[tier]) {
          section.classList.add('tier-collapsed');
          if (icon) icon.textContent = '▶';
        } else {
          section.classList.remove('tier-collapsed');
          if (icon) icon.textContent = '▼';
        }
      } else {
        // Default: collapse if all owned
        if (ownedItems === totalItems && totalItems > 0) {
          section.classList.add('tier-collapsed');
          if (icon) icon.textContent = '▶';
        } else {
          section.classList.remove('tier-collapsed');
          if (icon) icon.textContent = '▼';
        }
      }
    }

    tiers[tier].forEach(item => {
      const owned = inventory.includes(item.id);
      const equippedHere = equipped.includes(item.id);

      // Check personality requirements
      // Check balanced requirement (all traits 45-65)
      let meetsPersonalityReqs = true;
      if (item.requiredBalanced) {
        const traits = ['confidence', 'humility', 'aggression', 'professionalism', 'showmanship', 'resilience'];
        meetsPersonalityReqs = traits.every(trait => {
          const value = personality[trait] || 50;
          return value >= 45 && value <= 65;
        });
      } else if (item.requiredPersonality) {
        meetsPersonalityReqs = Object.entries(item.requiredPersonality).every(
          ([trait, required]) => (personality[trait] || 0) >= required
        );
      }

      const card = document.createElement('div');
      const canAfford = balance >= item.cost;
      const isLocked = !owned && (!meetsPersonalityReqs || !canAfford);

      card.className = `unlock-card tier-${tier} ${isLocked ? 'locked' : ''} ${owned ? 'owned' : ''}`;

      // Add tooltip for locked cards
      if (isLocked) {
        const reasons = [];
        if (!canAfford) {
          const needed = item.cost - balance;
          reasons.push(`Need ${needed} more CC`);
        }
        if (!meetsPersonalityReqs) {
          if (item.requiredBalanced) {
            reasons.push('Requires balanced personality (all traits 45-65)');
          } else if (item.requiredPersonality) {
            const reqs = Object.entries(item.requiredPersonality).map(([trait, val]) => {
              const current = personality[trait] || 0;
              return `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${current}/${val}`;
            }).join(', ');
            reasons.push(`Requires: ${reqs}`);
          }
        }
        card.title = reasons.join(' • ');
      }

      let personalityInfo = '';
      if (item.personalityBonus) {
        const bonuses = Object.entries(item.personalityBonus).map(([trait, val]) =>
          `+${val} ${trait.charAt(0).toUpperCase() + trait.slice(1)}`
        ).join(', ');
        personalityInfo = `<div class="unlock-personality-bonus">✨ ${bonuses}</div>`;
      }
      if (item.requiredBalanced && !meetsPersonalityReqs) {
        personalityInfo = `<div class="unlock-personality-locked">🔒 Requires: Balanced personality (all traits 45-65)</div>`;
      } else if (item.requiredPersonality && !meetsPersonalityReqs) {
        const reqs = Object.entries(item.requiredPersonality).map(([trait, val]) => {
          const current = personality[trait] || 0;
          return `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${current}/${val}`;
        }).join(', ');
        personalityInfo = `<div class="unlock-personality-locked">🔒 Requires: ${reqs}</div>`;
      } else if (item.requiredBalanced && meetsPersonalityReqs) {
        personalityInfo = `<div class="unlock-personality-bonus">⚖️ Balanced Personality</div>`;
      }

      card.innerHTML = `
        <div class="unlock-header">
          <div class="unlock-emoji">${item.emoji || '⭐'}</div>
          <div class="unlock-title">
            <div class="unlock-name">${isLocked ? '???' : item.name}</div>
            <div class="unlock-cost">${item.cost} CC</div>
          </div>
        </div>
        <div class="unlock-description">${isLocked ? 'Unlock to reveal details' : item.description}</div>
        <div class="unlock-bonus">+${item.pointsBonus} pts</div>
        ${personalityInfo}
        <div class="unlock-actions"></div>
      `;

      const actions = card.querySelector('.unlock-actions');

      if (owned) {
        const status = document.createElement('div');
        status.className = 'unlock-status';
        status.textContent = 'Owned';
        actions.appendChild(status);

        const equipBtn = document.createElement('button');
        equipBtn.className = 'btn-equip';
        equipBtn.textContent = equippedHere ? 'Unequip' : 'Equip';
        equipBtn.disabled = !meetsPersonalityReqs;
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

  let next = current.slice(0, slotCount);

  // Toggle off if already equipped
  if (next.includes(itemId)) {
    next = next.filter(id => id !== itemId);
  } else {
    if (next.length < slotCount) {
      next.push(itemId);
    } else {
      // Replace first slot
      next[0] = itemId;
    }
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
  console.log('[Store] Cadence Credits store initializing...');
  console.log('[Store] Feature flag key:', FEATURE_FLAG_KEY);
  initAuthUI();
  onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!user) {
      console.log('[Store] No user logged in');
      if (loginBtn) loginBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      renderWarning('Please log in to access the Cadence Credits store.');
      return;
    }

    console.log('[Store] User logged in:', user.uid);
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';

    userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      console.log('[Store] User document not found');
      renderWarning('User profile not found.');
      return;
    }

    const data = snap.data();
    console.log('[Store] User data loaded. Checking feature flag:', FEATURE_FLAG_KEY, '=', data[FEATURE_FLAG_KEY]);
    if (!data[FEATURE_FLAG_KEY]) {
      console.log('[Store] Feature flag not enabled for this user');
      renderWarning('Cadence Credits preview is not enabled for your account. This feature is currently in testing.');
      return;
    }

    console.log('[Store] Feature flag enabled! Loading store...');
    userData = data;
    console.log('[Store] Balance:', data.currency?.balance || 0);
    console.log('[Store] Slots:', data.unlocks?.slotCount || 1);
    console.log('[Store] Inventory:', data.unlocks?.inventory?.length || 0);
    renderBalance();
    renderSlots();
    renderGrid();
    initTierCollapse();
    initStoreControls();
    console.log('[Store] Store loaded successfully');
  });
}

document.addEventListener('DOMContentLoaded', start);









