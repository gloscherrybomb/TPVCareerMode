const fs = require('fs');

let content = fs.readFileSync('process-json-results.js', 'utf8');

// Normalize line endings to LF for easier matching
content = content.replace(/\r\n/g, '\n');

// ===== UPDATE 1: Individual notifications (sendUserDiscordNotification) =====
const individualSearch = `      timestamp: new Date().toISOString()
    };

    if (storyExcerpt) {
      embed.fields.push({
        name: 'Race Recap',
        value: storyExcerpt,
        inline: false
      });
    }

    // Step 3: Send message to DM channel`;

const individualReplace = `      timestamp: new Date().toISOString()
    };

    // Add prediction vs actual if available
    if (eventResults.predictedPosition && position !== 'DNF') {
      const diff = eventResults.predictedPosition - position;
      let predictionText;
      if (diff > 0) {
        predictionText = \`\${eventResults.predictedPosition}\${getOrdinalSuffix(eventResults.predictedPosition)} → \${positionText} (+\${diff})\`;
      } else if (diff < 0) {
        predictionText = \`\${eventResults.predictedPosition}\${getOrdinalSuffix(eventResults.predictedPosition)} → \${positionText} (\${diff})\`;
      } else {
        predictionText = \`\${positionText} (exact!)\`;
      }
      embed.fields.push({
        name: 'Prediction',
        value: predictionText,
        inline: true
      });
    }

    // Count and add awards if any earned
    const awardsEarned = [
      eventResults.earnedPunchingMedal,
      eventResults.earnedGiantKillerMedal,
      eventResults.earnedBullseyeMedal,
      eventResults.earnedHotStreakMedal,
      eventResults.earnedDomination,
      eventResults.earnedCloseCall,
      eventResults.earnedPhotoFinish,
      eventResults.earnedDarkHorse,
      eventResults.earnedZeroToHero,
      eventResults.earnedWindTunnel,
      eventResults.earnedTheAccountant,
      eventResults.earnedLanternRouge,
      eventResults.earnedComeback,
      eventResults.earnedPowerSurge,
      eventResults.earnedSteadyEddie,
      eventResults.earnedBlastOff,
      eventResults.earnedSmoothOperator,
      eventResults.earnedBunchKick,
      eventResults.earnedGCGoldMedal,
      eventResults.earnedGCSilverMedal,
      eventResults.earnedGCBronzeMedal
    ].filter(Boolean).length;

    if (awardsEarned > 0) {
      embed.fields.push({
        name: 'Awards',
        value: \`\${awardsEarned} earned\`,
        inline: true
      });
    }

    if (storyExcerpt) {
      embed.fields.push({
        name: 'Race Recap',
        value: storyExcerpt,
        inline: false
      });
    }

    // Step 3: Send message to DM channel`;

if (content.includes(individualSearch)) {
  content = content.replace(individualSearch, individualReplace);
  console.log('✅ Updated sendUserDiscordNotification (individual notifications)');
} else {
  console.log('❌ Could not find individual notification pattern');
}

// ===== UPDATE 2: Public notifications (sendPublicResultNotification) =====
const publicSearch = `    // Post directly to public channel (no DM channel creation needed, no button)`;

const publicReplace = `    // Add prediction vs actual if available
    if (eventResults.predictedPosition && position !== 'DNF') {
      const diff = eventResults.predictedPosition - position;
      let predictionText;
      if (diff > 0) {
        predictionText = \`\${eventResults.predictedPosition}\${getOrdinalSuffix(eventResults.predictedPosition)} → \${positionText} (+\${diff})\`;
      } else if (diff < 0) {
        predictionText = \`\${eventResults.predictedPosition}\${getOrdinalSuffix(eventResults.predictedPosition)} → \${positionText} (\${diff})\`;
      } else {
        predictionText = \`\${positionText} (exact!)\`;
      }
      embed.fields.push({
        name: 'Prediction',
        value: predictionText,
        inline: true
      });
    }

    // Count and add awards if any earned
    const publicAwardsEarned = [
      eventResults.earnedPunchingMedal,
      eventResults.earnedGiantKillerMedal,
      eventResults.earnedBullseyeMedal,
      eventResults.earnedHotStreakMedal,
      eventResults.earnedDomination,
      eventResults.earnedCloseCall,
      eventResults.earnedPhotoFinish,
      eventResults.earnedDarkHorse,
      eventResults.earnedZeroToHero,
      eventResults.earnedWindTunnel,
      eventResults.earnedTheAccountant,
      eventResults.earnedLanternRouge,
      eventResults.earnedComeback,
      eventResults.earnedPowerSurge,
      eventResults.earnedSteadyEddie,
      eventResults.earnedBlastOff,
      eventResults.earnedSmoothOperator,
      eventResults.earnedBunchKick,
      eventResults.earnedGCGoldMedal,
      eventResults.earnedGCSilverMedal,
      eventResults.earnedGCBronzeMedal
    ].filter(Boolean).length;

    if (publicAwardsEarned > 0) {
      embed.fields.push({
        name: 'Awards',
        value: \`\${publicAwardsEarned} earned\`,
        inline: true
      });
    }

    // Post directly to public channel (no DM channel creation needed, no button)`;

if (content.includes(publicSearch)) {
  content = content.replace(publicSearch, publicReplace);
  console.log('✅ Updated sendPublicResultNotification (public notifications)');
} else {
  console.log('❌ Could not find public notification pattern');
}

// Write the updated content
fs.writeFileSync('process-json-results.js', content);
console.log('\n✅ File saved');
