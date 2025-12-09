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

/**
 * Convert 3-letter ISO country code to 2-letter code for flag icons
 * @param {string} countryCode3 - 3-letter ISO country code (e.g., "USA", "GBR")
 * @returns {string} 2-letter ISO country code in lowercase (e.g., "us", "gb")
 */
export function getCountryCode2(countryCode3) {
  if (!countryCode3) return null;

  // Convert to uppercase for consistent lookup
  const code = countryCode3.toUpperCase();

  // ISO 3166-1 alpha-3 to alpha-2 conversion map
  const codeMap = {
    'AFG': 'af', 'ALB': 'al', 'DZA': 'dz', 'AND': 'ad', 'AGO': 'ao',
    'ARG': 'ar', 'ARM': 'am', 'AUS': 'au', 'AUT': 'at', 'AZE': 'az',
    'BHS': 'bs', 'BHR': 'bh', 'BGD': 'bd', 'BRB': 'bb', 'BLR': 'by',
    'BEL': 'be', 'BLZ': 'bz', 'BEN': 'bj', 'BTN': 'bt', 'BOL': 'bo',
    'BIH': 'ba', 'BWA': 'bw', 'BRA': 'br', 'BRN': 'bn', 'BGR': 'bg',
    'BFA': 'bf', 'BDI': 'bi', 'KHM': 'kh', 'CMR': 'cm', 'CAN': 'ca',
    'CPV': 'cv', 'CAF': 'cf', 'TCD': 'td', 'CHL': 'cl', 'CHN': 'cn',
    'COL': 'co', 'COM': 'km', 'COG': 'cg', 'COD': 'cd', 'CRI': 'cr',
    'HRV': 'hr', 'CUB': 'cu', 'CYP': 'cy', 'CZE': 'cz', 'DNK': 'dk',
    'DJI': 'dj', 'DMA': 'dm', 'DOM': 'do', 'ECU': 'ec', 'EGY': 'eg',
    'SLV': 'sv', 'GNQ': 'gq', 'ERI': 'er', 'EST': 'ee', 'ETH': 'et',
    'FJI': 'fj', 'FIN': 'fi', 'FRA': 'fr', 'GAB': 'ga', 'GMB': 'gm',
    'GEO': 'ge', 'DEU': 'de', 'GER': 'de', 'GHA': 'gh', 'GRC': 'gr',
    'GRE': 'gr', 'GRD': 'gd', 'GTM': 'gt', 'GIN': 'gn', 'GNB': 'gw',
    'GUY': 'gy', 'HTI': 'ht', 'HND': 'hn', 'HUN': 'hu', 'ISL': 'is',
    'IND': 'in', 'IDN': 'id', 'IRN': 'ir', 'IRQ': 'iq', 'IRL': 'ie',
    'ISR': 'il', 'ITA': 'it', 'CIV': 'ci', 'JAM': 'jm', 'JPN': 'jp',
    'JOR': 'jo', 'KAZ': 'kz', 'KEN': 'ke', 'KIR': 'ki', 'PRK': 'kp',
    'KOR': 'kr', 'KWT': 'kw', 'KGZ': 'kg', 'LAO': 'la', 'LVA': 'lv',
    'LBN': 'lb', 'LSO': 'ls', 'LBR': 'lr', 'LBY': 'ly', 'LIE': 'li',
    'LTU': 'lt', 'LUX': 'lu', 'MKD': 'mk', 'MDG': 'mg', 'MWI': 'mw',
    'MYS': 'my', 'MDV': 'mv', 'MLI': 'ml', 'MLT': 'mt', 'MHL': 'mh',
    'MRT': 'mr', 'MUS': 'mu', 'MEX': 'mx', 'FSM': 'fm', 'MDA': 'md',
    'MCO': 'mc', 'MNG': 'mn', 'MNE': 'me', 'MAR': 'ma', 'MOZ': 'mz',
    'MMR': 'mm', 'NAM': 'na', 'NRU': 'nr', 'NPL': 'np', 'NLD': 'nl',
    'NZL': 'nz', 'NIC': 'ni', 'NER': 'ne', 'NGA': 'ng', 'NOR': 'no',
    'OMN': 'om', 'PAK': 'pk', 'PLW': 'pw', 'PAN': 'pa', 'PNG': 'pg',
    'PRY': 'py', 'PER': 'pe', 'PHL': 'ph', 'POL': 'pl', 'PRT': 'pt',
    'QAT': 'qa', 'ROU': 'ro', 'RUS': 'ru', 'RWA': 'rw', 'KNA': 'kn',
    'LCA': 'lc', 'VCT': 'vc', 'WSM': 'ws', 'SMR': 'sm', 'STP': 'st',
    'SAU': 'sa', 'SEN': 'sn', 'SRB': 'rs', 'SYC': 'sc', 'SLE': 'sl',
    'SGP': 'sg', 'SVK': 'sk', 'SVN': 'si', 'SLB': 'sb', 'SOM': 'so',
    'ZAF': 'za', 'RSA': 'za', 'SSD': 'ss', 'ESP': 'es', 'LKA': 'lk',
    'SDN': 'sd', 'SUR': 'sr', 'SWZ': 'sz', 'SWE': 'se', 'CHE': 'ch',
    'SYR': 'sy', 'TWN': 'tw', 'TJK': 'tj', 'TZA': 'tz', 'THA': 'th',
    'TLS': 'tl', 'TGO': 'tg', 'TON': 'to', 'TTO': 'tt', 'TUN': 'tn',
    'TUR': 'tr', 'TKM': 'tm', 'TUV': 'tv', 'UGA': 'ug', 'UKR': 'ua',
    'ARE': 'ae', 'GBR': 'gb', 'USA': 'us', 'URY': 'uy', 'UZB': 'uz',
    'VUT': 'vu', 'VEN': 've', 'VNM': 'vn', 'YEM': 'ye', 'ZMB': 'zm',
    'ZWE': 'zw', 'ENG': 'gb-eng', 'SCO': 'gb-sct', 'WAL': 'gb-wls'
  };

  return codeMap[code] || null;
}
