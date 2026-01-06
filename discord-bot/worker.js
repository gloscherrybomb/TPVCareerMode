/**
 * TPV Career Mode Discord Bot - Cloudflare Worker
 *
 * Handles Discord slash commands for linking/unlinking Discord accounts
 * to TPV Career Mode profiles.
 *
 * Commands:
 * - /link [uid] - Link Discord account to TPV profile
 * - /unlink - Unlink Discord account
 * - /status - Check link status
 */

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

// Discord interaction response types
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

/**
 * Verify Discord request signature using Ed25519
 */
async function verifyDiscordSignature(request, publicKey) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  const body = await request.clone().text();

  if (!signature || !timestamp) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToUint8Array(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    const message = new TextEncoder().encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    return await crypto.subtle.verify('Ed25519', key, sig, message);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex) {
  const matches = hex.match(/.{1,2}/g);
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Get Google OAuth2 access token for Firestore REST API
 */
async function getAccessToken(env) {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Create JWT header and payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  };

  // Base64url encode
  const base64urlEncode = (obj) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64urlEncode(header);
  const payloadB64 = base64urlEncode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Sign with private key
  const privateKeyPem = serviceAccount.private_key;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Convert PEM to ArrayBuffer
 */
function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Query Firestore for user by TPV UID
 */
async function findUserByTpvUid(env, tpvUid) {
  const accessToken = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID;

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'uid' },
          op: 'EQUAL',
          value: { stringValue: tpvUid.toUpperCase() },
        },
      },
      limit: 1,
    },
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }
  );

  const results = await response.json();

  if (results && results.length > 0 && results[0].document) {
    return results[0].document;
  }
  return null;
}

/**
 * Query Firestore for user by Discord ID
 */
async function findUserByDiscordId(env, discordId) {
  const accessToken = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID;

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'discordUserId' },
          op: 'EQUAL',
          value: { stringValue: discordId },
        },
      },
      limit: 1,
    },
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }
  );

  const results = await response.json();

  if (results && results.length > 0 && results[0].document) {
    return results[0].document;
  }
  return null;
}

/**
 * Update user document in Firestore
 */
async function updateUserDocument(env, documentPath, fields) {
  const accessToken = await getAccessToken(env);

  const updateMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');

  const response = await fetch(
    `https://firestore.googleapis.com/v1/${documentPath}?${updateMask}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.ok;
}

/**
 * Handle /link command
 */
async function handleLinkCommand(interaction, env) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const discordUsername = interaction.member?.user?.username || interaction.user?.username;

  // Get the UID option
  const uidOption = interaction.data.options?.find(opt => opt.name === 'uid');
  if (!uidOption || !uidOption.value) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Error:** Please provide your TPV UID.\nUsage: `/link uid:YOUR_UID`',
        flags: 64, // Ephemeral
      },
    };
  }

  const tpvUid = uidOption.value.toUpperCase().trim();

  // Validate UID format (15-16 hex characters)
  if (!/^[0-9A-F]{15,16}$/.test(tpvUid)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Invalid UID format.**\nYour TPV UID should be 15-16 hexadecimal characters (e.g., `A1B2C3D4E5F67890`).\nYou can find it on your TPV Career Mode Settings page.',
        flags: 64,
      },
    };
  }

  // Check if this Discord account is already linked
  const existingLink = await findUserByDiscordId(env, discordUserId);
  if (existingLink) {
    const existingUid = existingLink.fields?.uid?.stringValue || 'unknown';
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `**Already linked!**\nYour Discord account is already linked to TPV UID \`${existingUid}\`.\nUse \`/unlink\` first if you want to link a different account.`,
        flags: 64,
      },
    };
  }

  // Find user by TPV UID
  const userDoc = await findUserByTpvUid(env, tpvUid);
  if (!userDoc) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `**User not found.**\nNo TPV Career Mode account found with UID \`${tpvUid}\`.\nMake sure you\'ve signed up at [tpvcareermode.com](https://tpvcareermode.com) first.`,
        flags: 64,
      },
    };
  }

  // Check if this TPV account already has a different Discord linked
  const existingDiscordId = userDoc.fields?.discordUserId?.stringValue;
  if (existingDiscordId && existingDiscordId !== discordUserId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**This TPV account is already linked to another Discord account.**\nIf this is your account, please contact support.',
        flags: 64,
      },
    };
  }

  // Update user document with Discord ID
  const success = await updateUserDocument(env, userDoc.name, {
    discordUserId: { stringValue: discordUserId },
    discordNotificationsEnabled: { booleanValue: true },
    discordLinkedAt: { timestampValue: new Date().toISOString() },
  });

  if (!success) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Error:** Failed to link account. Please try again later.',
        flags: 64,
      },
    };
  }

  const userName = userDoc.fields?.name?.stringValue || 'Rider';

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `**Successfully linked!**\n\nWelcome, **${userName}**! Your Discord account is now linked to your TPV Career Mode profile.\n\nYou\'ll receive DM notifications whenever your race results are processed. Make sure you have DMs enabled from server members or the bot won\'t be able to message you.\n\nGood luck on the road! `,
      flags: 64,
    },
  };
}

/**
 * Handle /unlink command
 */
async function handleUnlinkCommand(interaction, env) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;

  // Find user by Discord ID
  const userDoc = await findUserByDiscordId(env, discordUserId);
  if (!userDoc) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Not linked.**\nYour Discord account is not linked to any TPV Career Mode profile.',
        flags: 64,
      },
    };
  }

  // Remove Discord ID from user document
  const success = await updateUserDocument(env, userDoc.name, {
    discordUserId: { nullValue: null },
    discordNotificationsEnabled: { booleanValue: false },
  });

  if (!success) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Error:** Failed to unlink account. Please try again later.',
        flags: 64,
      },
    };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '**Successfully unlinked!**\n\nYour Discord account has been unlinked from TPV Career Mode. You will no longer receive race result notifications.\n\nYou can link again anytime with `/link`.',
      flags: 64,
    },
  };
}

/**
 * Handle /status command
 */
async function handleStatusCommand(interaction, env) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;

  // Find user by Discord ID
  const userDoc = await findUserByDiscordId(env, discordUserId);

  if (!userDoc) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '**Not linked.**\n\nYour Discord account is not linked to any TPV Career Mode profile.\n\nUse `/link YOUR_UID` to connect your account and receive race notifications.',
        flags: 64,
      },
    };
  }

  const userName = userDoc.fields?.name?.stringValue || 'Unknown';
  const tpvUid = userDoc.fields?.uid?.stringValue || 'Unknown';
  const notificationsEnabled = userDoc.fields?.discordNotificationsEnabled?.booleanValue;
  const linkedAt = userDoc.fields?.discordLinkedAt?.timestampValue;

  let linkedDate = 'Unknown';
  if (linkedAt) {
    linkedDate = new Date(linkedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `**Link Status**\n\n**Linked to:** ${userName}\n**TPV UID:** \`${tpvUid}\`\n**Notifications:** ${notificationsEnabled ? 'Enabled' : 'Disabled'}\n**Linked since:** ${linkedDate}\n\nVisit [tpvcareermode.com/settings.html](https://tpvcareermode.com/settings.html) to manage notification preferences.`,
      flags: 64,
    },
  };
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify Discord signature
    const isValid = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse interaction
    const interaction = await request.json();

    // Handle PING (Discord uses this to verify endpoint)
    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle slash commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data.name;
      let response;

      switch (commandName) {
        case 'link':
          response = await handleLinkCommand(interaction, env);
          break;
        case 'unlink':
          response = await handleUnlinkCommand(interaction, env);
          break;
        case 'status':
          response = await handleStatusCommand(interaction, env);
          break;
        default:
          response = {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unknown command.',
              flags: 64,
            },
          };
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Unknown interaction type', { status: 400 });
  },
};
