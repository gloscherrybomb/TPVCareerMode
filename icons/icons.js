/**
 * TPV Career Mode - Centralized Icon System
 *
 * Provides consistent icon rendering across the site using:
 * - Local SVG files based on Microsoft Fluent Emoji
 * - Neon accent styling for site branding
 * - Emoji fallbacks for graceful degradation
 */

const ICON_SIZE = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
    xxl: 96
};

/**
 * Icon Registry - Maps icon IDs to their source and fallback
 *
 * type: 'local-svg' | 'fluent-cdn'
 * path: relative path for local SVGs
 * fluentName: Fluent emoji name for CDN icons
 * fallback: emoji fallback if icon fails to load
 * category: 'award' | 'personality' | 'event' | 'ui'
 */
const ICON_REGISTRY = {
    // ==========================================
    // MEDALS (Local SVG - neon ribbons)
    // ==========================================
    goldMedal: {
        type: 'local-svg',
        path: 'icons/svg/medals/gold.svg',
        fallback: '🥇',
        category: 'award'
    },
    silverMedal: {
        type: 'local-svg',
        path: 'icons/svg/medals/silver.svg',
        fallback: '🥈',
        category: 'award'
    },
    bronzeMedal: {
        type: 'local-svg',
        path: 'icons/svg/medals/bronze.svg',
        fallback: '🥉',
        category: 'award'
    },

    // ==========================================
    // TROPHIES (Local SVG - neon bases)
    // ==========================================
    trophy: {
        type: 'local-svg',
        path: 'icons/svg/trophies/trophy-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    trophyCollector: {
        type: 'local-svg',
        path: 'icons/svg/trophies/trophy-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    gcGold: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    gcGoldMedal: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    gcSilver: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-silver.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    gcSilverMedal: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-silver.svg',
        fallback: '🥈',
        category: 'award'
    },
    gcBronze: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-bronze.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    gcBronzeMedal: {
        type: 'local-svg',
        path: 'icons/svg/trophies/gc-bronze.svg',
        fallback: '🥉',
        category: 'award'
    },
    seasonGold: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    seasonChampion: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-gold.svg',
        fallback: '🏆',
        category: 'award'
    },
    seasonSilver: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-silver.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    seasonRunnerUp: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-silver.svg',
        fallback: '🥈',
        category: 'award'
    },
    seasonBronze: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-bronze.svg',
        fallback: '🏆',
        category: 'award'
    },
    // Alias for award system compatibility
    seasonThirdPlace: {
        type: 'local-svg',
        path: 'icons/svg/trophies/season-bronze.svg',
        fallback: '🥉',
        category: 'award'
    },

    // ==========================================
    // PERFORMANCE AWARDS - Fluent CDN (complex icons)
    // ==========================================
    lanternRouge: {
        type: 'local-svg',
        path: 'icons/svg/awards/lantern.svg',
        fallback: '🏮',
        category: 'award'
    },
    punchingAbove: {
        type: 'local-svg',
        path: 'icons/svg/awards/boxing-glove.svg',
        fallback: '🥊',
        category: 'award'
    },
    // Alias for award system compatibility
    punchingMedal: {
        type: 'local-svg',
        path: 'icons/svg/awards/boxing-glove.svg',
        fallback: '🥊',
        category: 'award'
    },
    hotStreak: {
        type: 'local-svg',
        path: 'icons/svg/awards/fire.svg',
        fallback: '🔥',
        category: 'award'
    },
    // Alias for award system compatibility
    hotStreakMedal: {
        type: 'local-svg',
        path: 'icons/svg/awards/fire.svg',
        fallback: '🔥',
        category: 'award'
    },
    darkHorse: {
        type: 'local-svg',
        path: 'icons/svg/awards/horse.svg',
        fallback: '🐴',
        category: 'award'
    },
    domination: {
        type: 'local-svg',
        path: 'icons/svg/awards/crown.svg',
        fallback: '👑',
        category: 'award'
    },
    closeCall: {
        type: 'local-svg',
        path: 'icons/svg/awards/sweat-droplets.svg',
        fallback: '💦',
        category: 'award'
    },
    photoFinish: {
        type: 'local-svg',
        path: 'icons/svg/awards/camera.svg',
        fallback: '📸',
        category: 'award'
    },
    zeroToHero: {
        type: 'local-svg',
        path: 'icons/svg/awards/phoenix.svg',
        fallback: '🔥',
        category: 'award'
    },
    blastOff: {
        type: 'local-svg',
        path: 'icons/svg/awards/rocket.svg',
        fallback: '🚀',
        category: 'award'
    },
    technicalIssues: {
        type: 'local-svg',
        path: 'icons/svg/awards/wrench.svg',
        fallback: '🔧',
        category: 'award'
    },
    weekendWarrior: {
        type: 'local-svg',
        path: 'icons/svg/awards/calendar.svg',
        fallback: '📅',
        category: 'award'
    },
    perfectSeason: {
        type: 'local-svg',
        path: 'icons/svg/awards/hundred.svg',
        fallback: '💯',
        category: 'award'
    },
    windTunnel: {
        type: 'local-svg',
        path: 'icons/svg/awards/wind.svg',
        fallback: '🌬️',
        category: 'award'
    },
    theAccountant: {
        type: 'local-svg',
        path: 'icons/svg/awards/abacus.svg',
        fallback: '🧮',
        category: 'award'
    },
    theEqualizer: {
        type: 'local-svg',
        path: 'icons/svg/awards/level-slider.svg',
        fallback: '🎚️',
        category: 'award'
    },
    singaporeSling: {
        type: 'local-svg',
        path: 'icons/svg/awards/cocktail.svg',
        fallback: '🍸',
        category: 'award'
    },
    steadyEddie: {
        type: 'local-svg',
        path: 'icons/svg/awards/balance-scale.svg',
        fallback: '⚖️',
        category: 'award'
    },
    smoothOperator: {
        type: 'local-svg',
        path: 'icons/svg/awards/music-note.svg',
        fallback: '🎵',
        category: 'award'
    },
    gluttonForPunishment: {
        type: 'local-svg',
        path: 'icons/svg/awards/cactus.svg',
        fallback: '🌵',
        category: 'award'
    },

    // ==========================================
    // PERFORMANCE AWARDS - Local SVG (neon gradient)
    // ==========================================
    giantKiller: {
        type: 'local-svg',
        path: 'icons/svg/awards/giant-killer.svg',
        fallback: '⚔️',
        category: 'award'
    },
    // Alias for award system compatibility
    giantKillerMedal: {
        type: 'local-svg',
        path: 'icons/svg/awards/giant-killer.svg',
        fallback: '⚔️',
        category: 'award'
    },
    bullseye: {
        type: 'local-svg',
        path: 'icons/svg/awards/target.svg',
        fallback: '🎯',
        category: 'award'
    },
    // Alias for award system compatibility
    bullseyeMedal: {
        type: 'local-svg',
        path: 'icons/svg/awards/target.svg',
        fallback: '🎯',
        category: 'award'
    },
    backToBack: {
        type: 'local-svg',
        path: 'icons/svg/awards/repeat.svg',
        fallback: '🔁',
        category: 'award'
    },
    specialist: {
        type: 'local-svg',
        path: 'icons/svg/awards/star.svg',
        fallback: '⭐',
        category: 'award'
    },
    allRounder: {
        type: 'local-svg',
        path: 'icons/svg/awards/glowing-star.svg',
        fallback: '🌟',
        category: 'award'
    },
    powerSurge: {
        type: 'local-svg',
        path: 'icons/svg/awards/explosion.svg',
        fallback: '💥',
        category: 'award'
    },
    fanFavourite: {
        type: 'local-svg',
        path: 'icons/svg/awards/purple-heart.svg',
        fallback: '💜',
        category: 'award'
    },
    podiumStreak: {
        type: 'local-svg',
        path: 'icons/svg/awards/chart-up.svg',
        fallback: '📈',
        category: 'award'
    },
    comeback: {
        type: 'local-svg',
        path: 'icons/svg/awards/arrows-cycle.svg',
        fallback: '🔄',
        category: 'award'
    },
    bunchKick: {
        type: 'local-svg',
        path: 'icons/svg/awards/collision.svg',
        fallback: '💥',
        category: 'award'
    },
    overrated: {
        type: 'local-svg',
        path: 'icons/svg/awards/chart-down.svg',
        fallback: '📉',
        category: 'award'
    },

    // ==========================================
    // PERSONALITY AWARDS - Fluent CDN
    // ==========================================
    confident: {
        type: 'local-svg',
        path: 'icons/svg/awards/lion.svg',
        fallback: '🦁',
        category: 'personality'
    },
    humble: {
        type: 'local-svg',
        path: 'icons/svg/personality/dove.svg',
        fallback: '🕊️',
        category: 'personality'
    },
    aggressive: {
        type: 'local-svg',
        path: 'icons/svg/awards/shark.svg',
        fallback: '🦈',
        category: 'personality'
    },
    quietProfessional: {
        type: 'local-svg',
        path: 'icons/svg/personality/graduation-cap.svg',
        fallback: '🎓',
        category: 'personality'
    },
    boldCompetitor: {
        type: 'local-svg',
        path: 'icons/svg/awards/eagle.svg',
        fallback: '🦅',
        category: 'personality'
    },
    polishedEntertainer: {
        type: 'local-svg',
        path: 'icons/svg/awards/sparkles.svg',
        fallback: '✨',
        category: 'personality'
    },
    clinicalChampion: {
        type: 'local-svg',
        path: 'icons/svg/ui/bar-chart.svg',
        fallback: '📊',
        category: 'personality'
    },
    polarizing: {
        type: 'local-svg',
        path: 'icons/svg/personality/performing-arts.svg',
        fallback: '🎭',
        category: 'personality'
    },
    shapeshifter: {
        type: 'local-svg',
        path: 'icons/svg/personality/butterfly.svg',
        fallback: '🦋',
        category: 'personality'
    },
    consistentVoice: {
        type: 'local-svg',
        path: 'icons/svg/personality/megaphone.svg',
        fallback: '📢',
        category: 'personality'
    },

    // ==========================================
    // PERSONALITY AWARDS - Local SVG (neon gradient)
    // ==========================================
    professional: {
        type: 'local-svg',
        path: 'icons/svg/awards/briefcase.svg',
        fallback: '💼',
        category: 'personality'
    },
    entertainer: {
        type: 'local-svg',
        path: 'icons/svg/personality/circus-tent.svg',
        fallback: '🎪',
        category: 'personality'
    },
    resilient: {
        type: 'local-svg',
        path: 'icons/svg/awards/green-heart.svg',
        fallback: '💚',
        category: 'personality'
    },
    charismaticStar: {
        type: 'local-svg',
        path: 'icons/svg/awards/shooting-star.svg',
        fallback: '🌠',
        category: 'personality'
    },
    relentlessFighter: {
        type: 'local-svg',
        path: 'icons/svg/awards/swords.svg',
        fallback: '⚔️',
        category: 'personality'
    },
    humbleWarrior: {
        type: 'local-svg',
        path: 'icons/svg/awards/shield.svg',
        fallback: '🛡️',
        category: 'personality'
    },
    comebackStory: {
        type: 'local-svg',
        path: 'icons/svg/awards/sunrise.svg',
        fallback: '🌅',
        category: 'personality'
    },
    wellRounded: {
        type: 'local-svg',
        path: 'icons/svg/awards/scales.svg',
        fallback: '⚖️',
        category: 'personality'
    },
    reinvention: {
        type: 'local-svg',
        path: 'icons/svg/awards/dna.svg',
        fallback: '🧬',
        category: 'personality'
    },
    divider: {
        type: 'local-svg',
        path: 'icons/svg/awards/lightning.svg',
        fallback: '⚡',
        category: 'personality'
    },

    // ==========================================
    // EVENT TYPES (8 shared icons)
    // ==========================================
    eventCriterium: {
        type: 'local-svg',
        path: 'icons/svg/events/criterium.svg',
        fallback: '🔄',
        category: 'event'
    },
    eventRoadRace: {
        type: 'local-svg',
        path: 'icons/svg/events/road-race.svg',
        fallback: '🚴',
        category: 'event'
    },
    eventTrack: {
        type: 'local-svg',
        path: 'icons/svg/events/stadium.svg',
        fallback: '🏟️',
        category: 'event'
    },
    eventTimeTrial: {
        type: 'local-svg',
        path: 'icons/svg/events/stopwatch.svg',
        fallback: '⏱️',
        category: 'event'
    },
    eventPointsRace: {
        type: 'local-svg',
        path: 'icons/svg/events/points-target.svg',
        fallback: '🎯',
        category: 'event'
    },
    eventHillClimb: {
        type: 'local-svg',
        path: 'icons/svg/events/mountain.svg',
        fallback: '⛰️',
        category: 'event'
    },
    eventGravel: {
        type: 'local-svg',
        path: 'icons/svg/events/gravel.svg',
        fallback: '🚵',
        category: 'event'
    },
    eventStageRace: {
        type: 'local-svg',
        path: 'icons/svg/events/stage-race.svg',
        fallback: '🏆',
        category: 'event'
    },
    eventFastCrit: {
        type: 'local-svg',
        path: 'icons/svg/events/dashing-away.svg',
        fallback: '💨',
        category: 'event'
    },
    eventSnowMountain: {
        type: 'local-svg',
        path: 'icons/svg/events/snow-mountain.svg',
        fallback: '🏔️',
        category: 'event'
    },
    eventCamping: {
        type: 'local-svg',
        path: 'icons/svg/events/camping.svg',
        fallback: '🏕️',
        category: 'event'
    },
    eventCoastal: {
        type: 'local-svg',
        path: 'icons/svg/events/water-wave.svg',
        fallback: '🌊',
        category: 'event'
    },
    eventNightRace: {
        type: 'local-svg',
        path: 'icons/svg/events/night-stars.svg',
        fallback: '🌃',
        category: 'event'
    },
    eventValentine: {
        type: 'local-svg',
        path: 'icons/svg/events/valentine-heart.svg',
        fallback: '💝',
        category: 'event'
    },
    // Valentine's Invitational awards
    valentineChampion2026: {
        type: 'local-svg',
        path: 'icons/svg/awards/valentine-champion.svg',
        fallback: '💘',
        category: 'award'
    },
    valentinePodium2026: {
        type: 'local-svg',
        path: 'icons/svg/awards/valentine-podium.svg',
        fallback: '💝',
        category: 'award'
    },

    // ==========================================
    // UI ELEMENTS
    // ==========================================
    warning: {
        type: 'local-svg',
        path: 'icons/svg/ui/warning.svg',
        fallback: '⚠️',
        category: 'ui'
    },
    info: {
        type: 'local-svg',
        path: 'icons/svg/ui/info.svg',
        fallback: 'ℹ️',
        category: 'ui'
    },
    locked: {
        type: 'local-svg',
        path: 'icons/svg/ui/locked.svg',
        fallback: '🔒',
        category: 'ui'
    },
    stats: {
        type: 'local-svg',
        path: 'icons/svg/ui/bar-chart.svg',
        fallback: '📊',
        category: 'ui'
    },
    achievement: {
        type: 'local-svg',
        path: 'icons/svg/awards/star.svg',
        fallback: '⭐',
        category: 'ui'
    },
    announcement: {
        type: 'local-svg',
        path: 'icons/svg/ui/loudspeaker.svg',
        fallback: '📢',
        category: 'ui'
    },
    power: {
        type: 'local-svg',
        path: 'icons/svg/awards/lightning.svg',
        fallback: '⚡',
        category: 'ui'
    },
    timer: {
        type: 'local-svg',
        path: 'icons/svg/events/stopwatch.svg',
        fallback: '⏱️',
        category: 'ui'
    },
    mountain: {
        type: 'local-svg',
        path: 'icons/svg/events/mountain.svg',
        fallback: '⛰️',
        category: 'ui'
    },
    location: {
        type: 'local-svg',
        path: 'icons/svg/ui/location.svg',
        fallback: '📍',
        category: 'ui'
    },
    lightbulb: {
        type: 'local-svg',
        path: 'icons/svg/ui/lightbulb.svg',
        fallback: '💡',
        category: 'ui'
    },
    microphone: {
        type: 'local-svg',
        path: 'icons/svg/ui/microphone.svg',
        fallback: '🎤',
        category: 'ui'
    },
    moneyBag: {
        type: 'local-svg',
        path: 'icons/svg/ui/money-bag.svg',
        fallback: '💰',
        category: 'ui'
    },
    checkmark: {
        type: 'local-svg',
        path: 'icons/svg/ui/checkmark.svg',
        fallback: '✅',
        category: 'ui'
    },
    crossmark: {
        type: 'local-svg',
        path: 'icons/svg/ui/crossmark.svg',
        fallback: '❌',
        category: 'ui'
    },
    tag: {
        type: 'local-svg',
        path: 'icons/svg/ui/tag.svg',
        fallback: '🏷️',
        category: 'ui'
    },
    statusGreen: {
        type: 'local-svg',
        path: 'icons/svg/ui/status-green.svg',
        fallback: '🟢',
        category: 'ui'
    },
    statusRed: {
        type: 'local-svg',
        path: 'icons/svg/ui/status-red.svg',
        fallback: '🔴',
        category: 'ui'
    },
    globe: {
        type: 'local-svg',
        path: 'icons/svg/ui/globe.svg',
        fallback: '🌍',
        category: 'ui'
    },
    book: {
        type: 'local-svg',
        path: 'icons/svg/ui/book.svg',
        fallback: '📖',
        category: 'ui'
    },
    coffee: {
        type: 'local-svg',
        path: 'icons/svg/ui/coffee.svg',
        fallback: '☕',
        category: 'ui'
    },
    contributorStar: {
        type: 'local-svg',
        path: 'icons/svg/awards/glowing-star.svg',
        fallback: '⭐',
        category: 'ui'
    },
    sparkles: {
        type: 'local-svg',
        path: 'icons/svg/awards/sparkles.svg',
        fallback: '✨',
        category: 'ui'
    }
};

/**
 * Event type to icon ID mapping
 * Maps event.type strings to icon registry IDs
 */
const EVENT_TYPE_TO_ICON = {
    'Criterium': 'eventCriterium',
    'Classic': 'eventRoadRace',
    'Road Race': 'eventRoadRace',
    'Track': 'eventTrack',
    'Time Trial': 'eventTimeTrial',
    'Points Race': 'eventPointsRace',
    'Hill Climb': 'eventHillClimb',
    'Gravel': 'eventGravel',
    'Stage Race': 'eventStageRace',
    'Stage Race - Stage 1': 'eventStageRace',
    'Stage Race - Stage 2': 'eventStageRace',
    'Stage Race - Stage 3': 'eventStageRace'
};

/**
 * Personality award ID to icon ID mapping
 * Maps personality-awards-config IDs to icon registry IDs
 */
const PERSONALITY_ICON_MAP = {
    'confidentPersona': 'confident',
    'humblePersona': 'humble',
    'aggressivePersona': 'aggressive',
    'professionalPersona': 'professional',
    'showmanPersona': 'entertainer',
    'resilientPersona': 'resilient',
    'confidentShowman': 'charismaticStar',
    'humbleProfessional': 'quietProfessional',
    'aggressiveResilient': 'relentlessFighter',
    'confidentAggressive': 'boldCompetitor',
    'humbleResilient': 'humbleWarrior',
    'professionalShowman': 'polishedEntertainer',
    'confidentProfessional': 'clinicalChampion',
    'resilientShowman': 'comebackStory',
    'balancedPersona': 'wellRounded',
    'extremePersona': 'polarizing',
    'evolvedPersona': 'shapeshifter',
    'consistentVoice': 'consistentVoice',
    'dramaticShift': 'reinvention',
    'polarization': 'divider'
};

/**
 * Get icon HTML for an event
 * @param {Object} event - Event object with type and optional iconId
 * @param {string} size - Icon size
 * @returns {string} HTML string for the icon
 */
function getEventIcon(event, size = 'md') {
    // Check for specific iconId first (for special events with unique icons)
    if (event.iconId && ICON_REGISTRY[event.iconId]) {
        return getIcon(event.iconId, { size });
    }
    // Fall back to type mapping
    const iconId = EVENT_TYPE_TO_ICON[event.type] || 'eventRoadRace';
    return getIcon(iconId, { size });
}

/**
 * Get icon HTML for a personality award
 * @param {string} awardId - Personality award ID from config
 * @param {string} size - Icon size
 * @returns {string} HTML string for the icon
 */
function getPersonalityIcon(awardId, size = 'lg') {
    const iconId = PERSONALITY_ICON_MAP[awardId] || awardId;
    return getIcon(iconId, { size });
}

/**
 * Build Fluent CDN URL from emoji name
 * @param {string} fluentName - The Fluent emoji name (e.g., "Horse face")
 * @returns {string} CDN URL
 */
function getFluentCDNUrl(fluentName) {
    const encoded = encodeURIComponent(fluentName);
    const filename = fluentName.toLowerCase().replace(/ /g, '_') + '_color.svg';
    return `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets/${encoded}/Color/${filename}`;
}

/**
 * Get icon HTML
 * @param {string} iconId - The icon identifier from ICON_REGISTRY
 * @param {Object} options - Rendering options
 * @param {string|number} options.size - Size: 'xs'|'sm'|'md'|'lg'|'xl'|'xxl' or number
 * @param {string} options.className - Additional CSS classes
 * @param {boolean} options.fallbackToEmoji - If true, return emoji on error (default: true)
 * @returns {string} HTML string for the icon
 */
function getIcon(iconId, options = {}) {
    const {
        size = 'md',
        className = '',
        fallbackToEmoji = true
    } = options;

    const icon = ICON_REGISTRY[iconId];

    if (!icon) {
        console.warn(`[TPV Icons] Icon not found: ${iconId}`);
        return fallbackToEmoji ? '❓' : '';
    }

    const sizeValue = typeof size === 'number' ? size : (ICON_SIZE[size] || ICON_SIZE.md);
    const sizeClass = typeof size === 'string' ? `tpv-icon-${size}` : '';
    const classes = `tpv-icon ${sizeClass} ${className}`.trim();

    let src;
    if (icon.type === 'fluent-cdn') {
        src = getFluentCDNUrl(icon.fluentName);
    } else if (icon.type === 'local-svg') {
        src = icon.path;
    }

    // Return img tag with onerror fallback
    const fallbackEscaped = icon.fallback.replace(/'/g, "\\'");
    return `<img src="${src}" alt="${iconId}" class="${classes}" width="${sizeValue}" height="${sizeValue}" onerror="this.outerHTML='${fallbackEscaped}'">`;
}

/**
 * Get just the icon source URL (for canvas rendering, etc.)
 * @param {string} iconId - The icon identifier
 * @returns {string|null} URL or null if not found
 */
function getIconUrl(iconId) {
    const icon = ICON_REGISTRY[iconId];
    if (!icon) return null;

    if (icon.type === 'fluent-cdn') {
        return getFluentCDNUrl(icon.fluentName);
    } else if (icon.type === 'local-svg') {
        return icon.path;
    }
    return null;
}

/**
 * Get icon fallback emoji
 * @param {string} iconId - The icon identifier
 * @returns {string} Emoji fallback or ❓
 */
function getIconFallback(iconId) {
    const icon = ICON_REGISTRY[iconId];
    return icon ? icon.fallback : '❓';
}

/**
 * Get all icons in a category
 * @param {string} category - 'award'|'personality'|'event'|'ui'
 * @returns {Object} Filtered registry
 */
function getIconsByCategory(category) {
    const result = {};
    for (const [id, icon] of Object.entries(ICON_REGISTRY)) {
        if (icon.category === category) {
            result[id] = icon;
        }
    }
    return result;
}

/**
 * Preload icons for better performance
 * @param {string[]} iconIds - Array of icon IDs to preload
 * @returns {Promise<void>}
 */
async function preloadIcons(iconIds) {
    const promises = iconIds.map(id => {
        const url = getIconUrl(id);
        if (!url) return Promise.resolve();

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Don't fail on error
            img.src = url;
        });
    });

    await Promise.all(promises);
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ICON_REGISTRY,
        ICON_SIZE,
        EVENT_TYPE_TO_ICON,
        PERSONALITY_ICON_MAP,
        getIcon,
        getIconUrl,
        getIconFallback,
        getIconsByCategory,
        getFluentCDNUrl,
        getEventIcon,
        getPersonalityIcon,
        preloadIcons
    };
}

if (typeof window !== 'undefined') {
    window.TPVIcons = {
        ICON_REGISTRY,
        ICON_SIZE,
        EVENT_TYPE_TO_ICON,
        PERSONALITY_ICON_MAP,
        getIcon,
        getIconUrl,
        getIconFallback,
        getIconsByCategory,
        getFluentCDNUrl,
        getEventIcon,
        getPersonalityIcon,
        preloadIcons
    };
}
