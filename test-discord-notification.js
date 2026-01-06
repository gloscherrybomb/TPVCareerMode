/**
 * Test script for Discord public results notification
 * Run with: node test-discord-notification.js
 *
 * Requires environment variables:
 *   DISCORD_BOT_TOKEN - Your Discord bot token
 *   DISCORD_PUBLIC_RESULTS_CHANNEL_ID - The channel ID to post to
 */

async function testDiscordNotification() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const publicChannelId = process.env.DISCORD_PUBLIC_RESULTS_CHANNEL_ID;

  if (!botToken) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable not set');
    process.exit(1);
  }

  if (!publicChannelId) {
    console.error('❌ DISCORD_PUBLIC_RESULTS_CHANNEL_ID environment variable not set');
    process.exit(1);
  }

  console.log('🔧 Testing Discord notification...');
  console.log(`   Channel ID: ${publicChannelId}`);

  const embed = {
    title: 'Race Results: Test Rider - Stage 1 Opener',
    color: 0xFFD700, // Gold
    fields: [
      {
        name: 'Position',
        value: '1st',
        inline: true
      },
      {
        name: 'Points',
        value: '100 (+10 bonus)',
        inline: true
      },
      {
        name: 'Prediction',
        value: '5th → 1st (+4)',
        inline: true
      },
      {
        name: 'Awards',
        value: '3 earned',
        inline: true
      },
      {
        name: 'Race Recap',
        value: 'This is a test notification to verify the Discord bot is configured correctly. If you can see this message, the public results channel is working!',
        inline: false
      }
    ],
    footer: {
      text: 'TPV Career Mode - TEST MESSAGE'
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${publicChannelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test notification sent successfully!');
      console.log(`   Message ID: ${data.id}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to send notification: ${response.status}`);
      console.error(`   Response: ${errorText}`);

      if (response.status === 403) {
        console.error('\n   The bot may not have permission to post in this channel.');
        console.error('   Make sure the bot has "Send Messages" and "Embed Links" permissions.');
      } else if (response.status === 404) {
        console.error('\n   Channel not found. Check the DISCORD_PUBLIC_RESULTS_CHANNEL_ID is correct.');
      }
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
  }
}

testDiscordNotification();
