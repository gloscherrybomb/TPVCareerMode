// backfill-tpvhub-links.js - Backfill existing Firestore results with TPVirtualHub link data
// This script reads JSON files and updates existing result documents with scheduleKey and eventKey

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Check for dry run mode
const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Parse event path to extract season and event number
 */
function parseEventPath(filePath) {
  const match = filePath.match(/season_(\d+)[\/\\]event_(\d+)/);
  if (!match) {
    throw new Error(`Could not parse season/event from path: ${filePath}`);
  }
  return {
    season: parseInt(match[1]),
    event: parseInt(match[2])
  };
}

/**
 * Find all JSON files in race_results directory
 */
function findJsonFiles(dir) {
  const results = [];

  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.json')) {
        results.push(filePath);
      }
    }
  }

  walkDir(dir);
  return results;
}

/**
 * Main backfill function
 */
async function backfillTpvHubLinks() {
  const raceResultsDir = path.join(__dirname, 'race_results');

  if (!fs.existsSync(raceResultsDir)) {
    console.error('❌ race_results directory not found');
    process.exit(1);
  }

  console.log('🔍 Finding JSON files in race_results...');
  const jsonFiles = findJsonFiles(raceResultsDir);
  console.log(`   Found ${jsonFiles.length} JSON files\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const filePath of jsonFiles) {
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);

      // Parse season and event from path
      const { season, event } = parseEventPath(filePath);

      // Read and parse JSON
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const parsedJson = JSON.parse(jsonContent);

      // Check for metadata
      if (!parsedJson.metadata) {
        console.log(`   ⚠️ No metadata found, skipping`);
        totalSkipped++;
        continue;
      }

      const { scheduleKey, eventKey } = parsedJson.metadata;

      if (!scheduleKey || !eventKey) {
        console.log(`   ⚠️ Missing scheduleKey or eventKey, skipping`);
        totalSkipped++;
        continue;
      }

      console.log(`   Season ${season}, Event ${event}`);
      console.log(`   scheduleKey: ${scheduleKey}, eventKey: ${eventKey}`);

      // Get results array
      const results = parsedJson.results || parsedJson;
      if (!Array.isArray(results)) {
        console.log(`   ⚠️ No results array found, skipping`);
        totalSkipped++;
        continue;
      }

      // Find human UIDs (non-bot players)
      const humanUids = results
        .filter(r => !r.isBot && r.playerId && !r.playerId.startsWith('Bot'))
        .map(r => r.playerId)
        .filter((uid, index, self) => uid && self.indexOf(uid) === index);

      console.log(`   Found ${humanUids.length} human racer(s)`);

      // Update each user's result document
      for (const uid of humanUids) {
        const docId = `season${season}_event${event}_${uid}`;
        const docRef = db.collection('results').doc(docId);

        try {
          const doc = await docRef.get();

          if (!doc.exists) {
            console.log(`      ⚠️ Document ${docId} not found`);
            continue;
          }

          const data = doc.data();

          // Check if already has the data
          if (data.tpvHubScheduleKey && data.tpvHubEventKey) {
            console.log(`      ⏭️ ${docId} already has TPVHub data`);
            continue;
          }

          // Update the document
          if (DRY_RUN) {
            console.log(`      🔍 Would update ${docId}`);
          } else {
            await docRef.update({
              tpvHubScheduleKey: scheduleKey,
              tpvHubEventKey: eventKey
            });
            console.log(`      ✅ Updated ${docId}`);
          }
          totalUpdated++;

        } catch (docError) {
          console.log(`      ❌ Error updating ${docId}: ${docError.message}`);
          totalErrors++;
        }
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      totalErrors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Backfill Summary${DRY_RUN ? ' (DRY RUN)' : ''}:`);
  console.log(`   ${DRY_RUN ? '🔍 Would update' : '✅ Updated'}: ${totalUpdated} documents`);
  console.log(`   ⏭️ Skipped: ${totalSkipped} files`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log('='.repeat(50));
}

// Run the backfill
backfillTpvHubLinks()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
