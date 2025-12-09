// Shared Utility Functions for TPV Career Mode
// This file centralizes common utility functions to avoid duplication

/**
 * Get user's initials from their name
 * @param {string} name - User's full name
 * @returns {string} Initials (1-2 characters)
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

/**
 * Format time in seconds to hh:mm:ss or mm:ss
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (!seconds || seconds === 'N/A') return 'N/A';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 * @param {number} num - The number
 * @returns {string} Number with ordinal suffix
 */
export function getOrdinalSuffix(num) {
  if (!num) return '';
  const n = Math.round(num);
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;

  // Special cases: 11th, 12th, 13th
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return n + 'th';
  }

  // Regular cases
  switch (lastDigit) {
    case 1: return n + 'st';
    case 2: return n + 'nd';
    case 3: return n + 'rd';
    default: return n + 'th';
  }
}

/**
 * Get ARR band/tier from rating
 * @param {number} arr - ARR rating
 * @returns {string} ARR band name (e.g., "Diamond 4", "Gold 2", etc.)
 */
export function getARRBand(arr) {
  if (!arr || arr < 300) return 'Unranked';

  // Diamond: 1600-2000 (4 tiers)
  if (arr >= 1900) return 'Diamond 4';
  if (arr >= 1800) return 'Diamond 3';
  if (arr >= 1700) return 'Diamond 2';
  if (arr >= 1600) return 'Diamond 1';

  // Platinum: 1300-1599 (3 tiers)
  if (arr >= 1500) return 'Platinum 3';
  if (arr >= 1400) return 'Platinum 2';
  if (arr >= 1300) return 'Platinum 1';

  // Gold: 1000-1299 (3 tiers)
  if (arr >= 1200) return 'Gold 3';
  if (arr >= 1100) return 'Gold 2';
  if (arr >= 1000) return 'Gold 1';

  // Silver: 700-999 (3 tiers)
  if (arr >= 900) return 'Silver 3';
  if (arr >= 800) return 'Silver 2';
  if (arr >= 700) return 'Silver 1';

  // Bronze: 300-699 (3 tiers)
  if (arr >= 500) return 'Bronze 3';
  if (arr >= 400) return 'Bronze 2';
  if (arr >= 300) return 'Bronze 1';

  return 'Unranked';
}

/**
 * Format a date object or timestamp to local date string
 * @param {Date|Object} date - Date object or Firestore timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return 'Unknown date';

  try {
    // Check if it's a Firestore Timestamp object with seconds property
    if (date.seconds) {
      const jsDate = new Date(date.seconds * 1000);
      return jsDate.toLocaleDateString();
    } else if (date.toDate) {
      // If it has a toDate method (Firestore Timestamp)
      return date.toDate().toLocaleDateString();
    } else {
      // Try to parse as regular date
      return new Date(date).toLocaleDateString();
    }
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Unknown date';
  }
}
