/**
 * Register Discord Slash Commands
 *
 * Run this script ONCE to register the bot's slash commands with Discord.
 * Commands are registered globally and may take up to 1 hour to propagate.
 *
 * Usage:
 *   1. Set environment variables:
 *      - DISCORD_APPLICATION_ID
 *      - DISCORD_BOT_TOKEN
 *   2. Run: node register-commands.js
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error('Error: Missing environment variables');
  console.error('Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN before running');
  process.exit(1);
}

const commands = [
  {
    name: 'link',
    description: 'Link your Discord account to TPV Career Mode',
    options: [
      {
        name: 'uid',
        description: 'Your 16-character TPV UID (found on Settings page)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'unlink',
    description: 'Unlink your Discord account from TPV Career Mode',
  },
  {
    name: 'status',
    description: 'Check your TPV Career Mode link status',
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  console.log('Registering commands...');

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to register commands:', response.status, error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('Successfully registered commands:');
    data.forEach((cmd) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });

    console.log('\nNote: Global commands may take up to 1 hour to appear in Discord.');
    console.log('For faster testing, you can register guild-specific commands instead.');
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
