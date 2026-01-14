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
 * Get ordinal suffix for a number (st, nd, rd, th)
 * @param {number} num - The number
 * @returns {string} Ordinal suffix only (not including the number)
 */
export function getOrdinalSuffix(num) {
  if (!num) return '';
  const n = Math.round(num);
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;

  // Special cases: 11th, 12th, 13th
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  // Regular cases
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Get ARR band/tier from rating
 * @param {number} arr - ARR rating
 * @returns {string} ARR band name (e.g., "Diamond 4", "Gold 2", etc.)
 */
export function getARRBand(arr) {
  if (!arr || arr < 300) return 'Unranked';

  // Diamond: 1600+ (3 tiers)
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
 * Uses the user's browser locale for formatting (e.g., DD/MM/YYYY for UK, MM/DD/YYYY for US)
 * @param {Date|Object} date - Date object or Firestore timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return 'Unknown date';

  try {
    let jsDate;

    // Check if it's a Firestore Timestamp object with seconds property
    if (date.seconds) {
      jsDate = new Date(date.seconds * 1000);
    } else if (date.toDate) {
      // If it has a toDate method (Firestore Timestamp)
      jsDate = date.toDate();
    } else {
      // Try to parse as regular date
      jsDate = new Date(date);
    }

    // Use user's locale (undefined = browser default) with short date format
    // This respects the user's system locale settings
    // UK: 18/12/2025, US: 12/18/2025, etc.
    return jsDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
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
  // Includes both standard ISO codes AND IOC (Olympic) codes used by TPV
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
    'ZWE': 'zw', 'ENG': 'gb-eng', 'SCO': 'gb-sct', 'WAL': 'gb-wls',
    // IOC (Olympic) codes used by TrainingPeaks Virtual
    'SUI': 'ch',  // Switzerland
    'NED': 'nl',  // Netherlands
    'DEN': 'dk',  // Denmark
    'POR': 'pt',  // Portugal
    'CRO': 'hr',  // Croatia
    'SLO': 'si',  // Slovenia
    'LAT': 'lv',  // Latvia
    'MAS': 'my',  // Malaysia
    'PHI': 'ph',  // Philippines
    'INA': 'id',  // Indonesia
    'SIN': 'sg',  // Singapore (alt)
    'VIE': 'vn',  // Vietnam
    'THA': 'th',  // Thailand (same as ISO)
    'TPE': 'tw',  // Chinese Taipei
    'HKG': 'hk',  // Hong Kong
    'MAC': 'mo',  // Macau
    'BRU': 'bn',  // Brunei
    'MYA': 'mm',  // Myanmar
    'CAM': 'kh',  // Cambodia
    'NEP': 'np',  // Nepal (alt)
    'SRI': 'lk',  // Sri Lanka
    'BAN': 'bd',  // Bangladesh
    'PAK': 'pk',  // Pakistan (same as ISO)
    'AFG': 'af',  // Afghanistan (same as ISO)
    'UAE': 'ae',  // United Arab Emirates
    'KSA': 'sa',  // Saudi Arabia
    'BRN': 'bh',  // Bahrain (IOC), conflicts with ISO Brunei
    'KUW': 'kw',  // Kuwait
    'OMA': 'om',  // Oman
    'QAT': 'qa',  // Qatar (same as ISO)
    'IRQ': 'iq',  // Iraq (same as ISO)
    'SYR': 'sy',  // Syria (same as ISO)
    'LIB': 'lb',  // Lebanon
    'JOR': 'jo',  // Jordan (same as ISO)
    'PLE': 'ps',  // Palestine
    'YEM': 'ye',  // Yemen (same as ISO)
    'TUR': 'tr',  // Turkey (same as ISO)
    'CYP': 'cy',  // Cyprus (same as ISO)
    'AZE': 'az',  // Azerbaijan (same as ISO)
    'GEO': 'ge',  // Georgia (same as ISO)
    'ARM': 'am',  // Armenia (same as ISO)
    'KAZ': 'kz',  // Kazakhstan (same as ISO)
    'UZB': 'uz',  // Uzbekistan (same as ISO)
    'TKM': 'tm',  // Turkmenistan (same as ISO)
    'KGZ': 'kg',  // Kyrgyzstan (same as ISO)
    'TJK': 'tj',  // Tajikistan (same as ISO)
    'MGL': 'mn',  // Mongolia
    'CHI': 'cl',  // Chile
    'ARG': 'ar',  // Argentina (same as ISO)
    'URU': 'uy',  // Uruguay
    'PAR': 'py',  // Paraguay
    'BOL': 'bo',  // Bolivia (same as ISO)
    'PER': 'pe',  // Peru (same as ISO)
    'ECU': 'ec',  // Ecuador (same as ISO)
    'COL': 'co',  // Colombia (same as ISO)
    'VEN': 've',  // Venezuela (same as ISO)
    'GUA': 'gt',  // Guatemala
    'HON': 'hn',  // Honduras
    'ESA': 'sv',  // El Salvador
    'NCA': 'ni',  // Nicaragua
    'CRC': 'cr',  // Costa Rica
    'PAN': 'pa',  // Panama (same as ISO)
    'CUB': 'cu',  // Cuba (same as ISO)
    'HAI': 'ht',  // Haiti
    'DOM': 'do',  // Dominican Republic (same as ISO)
    'PUR': 'pr',  // Puerto Rico
    'TRI': 'tt',  // Trinidad and Tobago
    'BAR': 'bb',  // Barbados
    'GRN': 'gd',  // Grenada
    'SKN': 'kn',  // Saint Kitts and Nevis
    'LCA': 'lc',  // Saint Lucia (same as ISO)
    'VIN': 'vc',  // Saint Vincent
    'ANT': 'ag',  // Antigua and Barbuda
    'BAH': 'bs',  // Bahamas
    'BER': 'bm',  // Bermuda
    'CAY': 'ky',  // Cayman Islands
    'ISV': 'vi',  // US Virgin Islands
    'IVB': 'vg',  // British Virgin Islands
    'AHO': 'aw',  // Aruba (historical)
    'ARU': 'aw',  // Aruba
    'CUR': 'cw',  // Curacao
    'GUY': 'gy',  // Guyana (same as ISO)
    'SUR': 'sr',  // Suriname (same as ISO)
    'MEX': 'mx',  // Mexico (same as ISO)
    'USA': 'us',  // United States (same as ISO)
    'CAN': 'ca',  // Canada (same as ISO)
    'RSA': 'za',  // South Africa (same as ISO)
    'EGY': 'eg',  // Egypt (same as ISO)
    'ALG': 'dz',  // Algeria
    'MAR': 'ma',  // Morocco (same as ISO)
    'TUN': 'tn',  // Tunisia (same as ISO)
    'LBA': 'ly',  // Libya
    'NGR': 'ng',  // Nigeria
    'GHA': 'gh',  // Ghana (same as ISO)
    'CIV': 'ci',  // Ivory Coast (same as ISO)
    'SEN': 'sn',  // Senegal (same as ISO)
    'CMR': 'cm',  // Cameroon (same as ISO)
    'GAM': 'gm',  // Gambia
    'GUI': 'gn',  // Guinea
    'MLI': 'ml',  // Mali (same as ISO)
    'BUR': 'bf',  // Burkina Faso
    'NIG': 'ne',  // Niger
    'TOG': 'tg',  // Togo
    'BEN': 'bj',  // Benin (same as ISO)
    'CGO': 'cg',  // Congo
    'COD': 'cd',  // DR Congo (same as ISO)
    'GAB': 'ga',  // Gabon (same as ISO)
    'ANG': 'ao',  // Angola
    'NAM': 'na',  // Namibia (same as ISO)
    'BOT': 'bw',  // Botswana
    'ZIM': 'zw',  // Zimbabwe
    'ZAM': 'zm',  // Zambia
    'MOZ': 'mz',  // Mozambique (same as ISO)
    'TAN': 'tz',  // Tanzania
    'KEN': 'ke',  // Kenya (same as ISO)
    'UGA': 'ug',  // Uganda (same as ISO)
    'RWA': 'rw',  // Rwanda (same as ISO)
    'BDI': 'bi',  // Burundi (same as ISO)
    'ETH': 'et',  // Ethiopia (same as ISO)
    'ERI': 'er',  // Eritrea (same as ISO)
    'SUD': 'sd',  // Sudan
    'SSD': 'ss',  // South Sudan (same as ISO)
    'SOL': 'so',  // Somalia (alt)
    'DJI': 'dj',  // Djibouti (same as ISO)
    'MAD': 'mg',  // Madagascar
    'MRI': 'mu',  // Mauritius
    'SEY': 'sc',  // Seychelles
    'COM': 'km',  // Comoros (same as ISO)
    'MAW': 'mw',  // Malawi
    'LES': 'ls',  // Lesotho
    'SWZ': 'sz',  // Eswatini (same as ISO)
    'CPV': 'cv',  // Cape Verde (same as ISO)
    'GBS': 'gw',  // Guinea-Bissau
    'STP': 'st',  // Sao Tome (same as ISO)
    'GEQ': 'gq',  // Equatorial Guinea
    'CAF': 'cf',  // Central African Republic (same as ISO)
    'CHA': 'td',  // Chad
    'LBR': 'lr',  // Liberia (same as ISO)
    'SLE': 'sl',  // Sierra Leone (same as ISO)
    'GAM': 'gm',  // Gambia
    'MTN': 'mr',  // Mauritania
    'NZL': 'nz',  // New Zealand (same as ISO)
    'AUS': 'au',  // Australia (same as ISO)
    'FIJ': 'fj',  // Fiji
    'PNG': 'pg',  // Papua New Guinea (same as ISO)
    'SAM': 'ws',  // Samoa
    'TGA': 'to',  // Tonga
    'VAN': 'vu',  // Vanuatu
    'SOL': 'sb',  // Solomon Islands
    'FSM': 'fm',  // Micronesia (same as ISO)
    'PLW': 'pw',  // Palau (same as ISO)
    'MHL': 'mh',  // Marshall Islands (same as ISO)
    'KIR': 'ki',  // Kiribati (same as ISO)
    'NRU': 'nr',  // Nauru (same as ISO)
    'TUV': 'tv',  // Tuvalu (same as ISO)
    'COK': 'ck',  // Cook Islands
    'NIU': 'nu',  // Niue
    'ASA': 'as',  // American Samoa
    'GUM': 'gu',  // Guam
    'GBR': 'gb',  // Great Britain (same as ISO)
    'NIR': 'gb-nir',  // Northern Ireland
    'IRL': 'ie',  // Ireland (same as ISO)
    'FRA': 'fr',  // France (same as ISO)
    'ESP': 'es',  // Spain (same as ISO)
    'ITA': 'it',  // Italy (same as ISO)
    'BEL': 'be',  // Belgium (same as ISO)
    'NED': 'nl',  // Netherlands
    'LUX': 'lu',  // Luxembourg (same as ISO)
    'SUI': 'ch',  // Switzerland
    'AUT': 'at',  // Austria (same as ISO)
    'GER': 'de',  // Germany
    'POL': 'pl',  // Poland (same as ISO)
    'CZE': 'cz',  // Czech Republic (same as ISO)
    'SVK': 'sk',  // Slovakia (same as ISO)
    'HUN': 'hu',  // Hungary (same as ISO)
    'ROU': 'ro',  // Romania (same as ISO)
    'BUL': 'bg',  // Bulgaria
    'SRB': 'rs',  // Serbia (same as ISO)
    'MNE': 'me',  // Montenegro (same as ISO)
    'BIH': 'ba',  // Bosnia (same as ISO)
    'CRO': 'hr',  // Croatia
    'SLO': 'si',  // Slovenia
    'MKD': 'mk',  // North Macedonia (same as ISO)
    'ALB': 'al',  // Albania (same as ISO)
    'KOS': 'xk',  // Kosovo
    'GRE': 'gr',  // Greece
    'MLT': 'mt',  // Malta (same as ISO)
    'AND': 'ad',  // Andorra (same as ISO)
    'MON': 'mc',  // Monaco
    'SMR': 'sm',  // San Marino (same as ISO)
    'LIE': 'li',  // Liechtenstein (same as ISO)
    'VAT': 'va',  // Vatican City
    'NOR': 'no',  // Norway (same as ISO)
    'SWE': 'se',  // Sweden (same as ISO)
    'DEN': 'dk',  // Denmark
    'FIN': 'fi',  // Finland (same as ISO)
    'ISL': 'is',  // Iceland (same as ISO)
    'FAR': 'fo',  // Faroe Islands
    'EST': 'ee',  // Estonia (same as ISO)
    'LAT': 'lv',  // Latvia
    'LTU': 'lt',  // Lithuania (same as ISO)
    'BLR': 'by',  // Belarus (same as ISO)
    'UKR': 'ua',  // Ukraine (same as ISO)
    'MDA': 'md',  // Moldova (same as ISO)
    'RUS': 'ru',  // Russia (same as ISO)
    'POR': 'pt',  // Portugal
    'ISR': 'il',  // Israel (same as ISO)
    'JPN': 'jp'   // Japan (same as ISO)
  };

  return codeMap[code] || null;
}

/**
 * Get appropriately sized version of a profile photo URL
 * - Google profile photos: modifies URL size parameter
 * - Firebase Storage: returns thumbnail URL (requires Resize Images extension)
 * @param {string} photoURL - The original photo URL
 * @param {number} size - Desired size in pixels (default 400)
 * @returns {string} Modified URL for the appropriate size
 */
export function getHighResPhotoURL(photoURL, size = 400) {
  if (!photoURL) return null;

  // Check if it's a Google profile photo (googleusercontent.com)
  if (photoURL.includes('googleusercontent.com')) {
    // Remove any existing size/quality parameters
    // Handles: =s96-c, =s96, =w96-h96, =s96-c-k-no, etc.
    let baseURL = photoURL;

    // Remove existing size parameter (=s96, =s96-c, =s96-c-k-no, etc.)
    baseURL = baseURL.replace(/=s\d+(-[a-z0-9-]*)?$/i, '');

    // Remove width/height parameters (=w96-h96, etc.)
    baseURL = baseURL.replace(/=w\d+-h\d+(-[a-z0-9-]*)?$/i, '');

    // Add high-res size parameter
    return `${baseURL}=s${size}-c`;
  }

  // Check if it's a Firebase Storage URL
  if (photoURL.includes('firebasestorage.googleapis.com')) {
    return getFirebaseThumbnailURL(photoURL, size);
  }

  // For other URLs, return as-is
  return photoURL;
}

/**
 * Get Firebase Storage thumbnail URL
 * Uses Firebase Resize Images extension naming convention: filename_WIDTHxHEIGHT.ext
 * Requires profile-photos to have public read access in Storage rules.
 * @param {string} photoURL - Original Firebase Storage URL
 * @param {number} size - Desired size in pixels (will be used for both width and height)
 * @returns {string} Thumbnail URL
 */
export function getFirebaseThumbnailURL(photoURL, size = 400) {
  if (!photoURL || !photoURL.includes('firebasestorage.googleapis.com')) {
    return photoURL;
  }

  try {
    // Parse the URL to extract the path
    const url = new URL(photoURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);
    if (!pathMatch) return photoURL;

    // Decode the path (it's URL encoded)
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);

    // Split path and filename
    const lastSlash = decodedPath.lastIndexOf('/');
    const directory = lastSlash >= 0 ? decodedPath.substring(0, lastSlash + 1) : '';
    const filename = lastSlash >= 0 ? decodedPath.substring(lastSlash + 1) : decodedPath;

    // Split filename into name and extension
    const lastDot = filename.lastIndexOf('.');
    if (lastDot < 0) return photoURL; // No extension, return original

    const name = filename.substring(0, lastDot);
    const ext = filename.substring(lastDot); // includes the dot

    // Construct thumbnail filename: name_WIDTHxHEIGHT.ext
    const thumbFilename = `${name}_${size}x${size}${ext}`;
    const thumbPath = `${directory}${thumbFilename}`;

    // Construct new URL (public access, no token needed)
    const thumbEncodedPath = encodeURIComponent(thumbPath);
    return `https://firebasestorage.googleapis.com/v0/b/${url.pathname.split('/')[3]}/o/${thumbEncodedPath}?alt=media`;
  } catch (e) {
    console.error('Error constructing thumbnail URL:', e);
    return photoURL;
  }
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for innerHTML
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export escapeHtml to window for non-module scripts
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
