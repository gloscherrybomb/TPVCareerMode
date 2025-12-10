// personality-awards-display.js - Display personality awards on profile page

import { getPersonalityAwardById, getTraitDisplayName, AWARD_CATEGORIES } from './personality-awards-config.js';

/**
 * Display all personality awards on profile page
 */
export function displayPersonalityAwards(personalityAwards, personality) {
  const container = document.getElementById('personalityAwardsSection');

  if (!container) {
    console.error('Personality awards section not found');
    return;
  }

  // Check if user has any personality awards
  const hasDominant = personalityAwards?.dominant?.current;
  const hasCombinations = personalityAwards?.combinations?.length > 0;
  const hasSpecial = personalityAwards?.special?.length > 0;
  const hasEvolution = personalityAwards?.evolution?.length > 0;

  if (!hasDominant && !hasCombinations && !hasSpecial && !hasEvolution) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  let html = '<div class="personality-awards-container">';
  html += '<h2 class="personality-awards-title">🎭 Media Personality Awards</h2>';

  // Dominant Award (featured prominently)
  if (hasDominant) {
    const award = getPersonalityAwardById(personalityAwards.dominant.current);
    if (award) {
      html += renderDominantAward(award, personality);
    }
  }

  // Combination Awards
  if (hasCombinations) {
    html += '<div class="award-category-section">';
    html += `<h3 class="award-category-title">${AWARD_CATEGORIES.COMBINATION}</h3>`;
    html += '<div class="combination-awards-grid">';

    personalityAwards.combinations.forEach(combo => {
      const award = getPersonalityAwardById(combo.awardId);
      if (award) {
        html += renderCombinationAward(award, combo.traits, personality);
      }
    });

    html += '</div></div>';
  }

  // Special Awards (Balanced/Extreme/Evolution)
  if (hasSpecial || hasEvolution) {
    html += '<div class="award-category-section">';
    html += `<h3 class="award-category-title">Special Recognition</h3>`;
    html += '<div class="special-awards-grid">';

    if (hasSpecial) {
      personalityAwards.special.forEach(special => {
        const award = getPersonalityAwardById(special.awardId);
        if (award) {
          html += renderSpecialAward(award);
        }
      });
    }

    if (hasEvolution) {
      personalityAwards.evolution.forEach(evolution => {
        const award = getPersonalityAwardById(evolution.awardId);
        if (award) {
          html += renderSpecialAward(award);
        }
      });
    }

    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Render dominant award (large featured card)
 */
function renderDominantAward(award, personality) {
  const traitValue = personality[award.trait] || 50;
  const traitName = getTraitDisplayName(award.trait);

  return `
    <div class="personality-award-dominant">
      <div class="award-icon-large">${award.icon}</div>
      <div class="award-content-dominant">
        <div class="award-name-dominant">${award.name}</div>
        <div class="award-description">${award.description}</div>
        <div class="trait-bar-container">
          <div class="trait-bar-label">${traitName}</div>
          <div class="trait-bar">
            <div class="trait-bar-fill" style="width: ${traitValue}%"></div>
            <div class="trait-bar-value">${Math.round(traitValue)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render combination award (medium card with 2 traits)
 */
function renderCombinationAward(award, traitValues, personality) {
  const trait1 = award.traits[0];
  const trait2 = award.traits[1];
  const value1 = traitValues?.[trait1] || personality[trait1] || 50;
  const value2 = traitValues?.[trait2] || personality[trait2] || 50;

  return `
    <div class="personality-award-combination">
      <div class="award-icon">${award.icon}</div>
      <div class="award-content">
        <div class="award-name">${award.name}</div>
        <div class="award-description-small">${award.description}</div>
        <div class="trait-bars-small">
          ${renderSmallTraitBar(trait1, value1)}
          ${renderSmallTraitBar(trait2, value2)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render special award (compact card, no traits)
 */
function renderSpecialAward(award) {
  return `
    <div class="personality-award-special">
      <div class="award-icon">${award.icon}</div>
      <div class="award-content">
        <div class="award-name">${award.name}</div>
        <div class="award-description-small">${award.description}</div>
      </div>
    </div>
  `;
}

/**
 * Render small trait bar for combination awards
 */
function renderSmallTraitBar(trait, value) {
  const traitName = getTraitDisplayName(trait);
  return `
    <div class="trait-bar-small">
      <span class="trait-label-small">${traitName}</span>
      <div class="trait-bar">
        <div class="trait-bar-fill" style="width: ${value}%"></div>
      </div>
      <span class="trait-value-small">${Math.round(value)}</span>
    </div>
  `;
}

/**
 * Count total personality awards
 */
export function countPersonalityAwards(personalityAwards) {
  let count = 0;

  if (personalityAwards?.dominant?.current) count++;
  if (personalityAwards?.combinations?.length > 0) count += personalityAwards.combinations.length;
  if (personalityAwards?.special?.length > 0) count += personalityAwards.special.length;
  if (personalityAwards?.evolution?.length > 0) count += personalityAwards.evolution.length;

  return count;
}
