// backfill-tpvhub-links.js - Backfill existing Firestore results with TPVirtualHub link data
// This script queries the schedule API to get accessCodes and updates result documents

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

// Schedule API URL
const SCHEDULE_API_URL = 'https://tpvirtualhub.com/api/schedule/report?o=';

/**
 * Load event data to get scheduleUrls
 */
function loadEventData() {
  const eventDataPath = path.join(__dirname, 'event-data.js');
  const content = fs.readFileSync(eventDataPath, 'utf8');

  const events = [];

  // Find all scheduleUrl entries
  const scheduleUrlMatches = content.matchAll(/scheduleUrl:\s*["']([^"']+)["']/g);
  for (const match of scheduleUrlMatches) {
    const scheduleUrl = match[1];
    if (scheduleUrl && scheduleUrl.includes('tpvirtualhub.com')) {
      events.push({ scheduleUrl });
    }
  }

  return events;
}

/**
 * Extract base64 parameter from scheduleUrl
 */
function extractBase64Param(scheduleUrl) {
  const match = scheduleUrl.match(/\?o=(.+)$/);
  return match ? match[1] : null;
}

/**
 * Fetch schedule data from API
 */
async function fetchScheduleData(base64Param) {
  const url = SCHEDULE_API_URL + base64Param;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Build a map of scheduleKey -> accessCode from all events
 */
async function buildAccessCodeMap(events) {
  const accessCodeMap = {};

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const base64Param = extractBase64Param(event.scheduleUrl);
    if (!base64Param) continue;

    try {
      // Decode base64 to get event name for logging
      let eventName = `Event ${i + 1}`;
      try {
        const decoded = JSON.parse(Buffer.from(base64Param, 'base64').toString());
        eventName = decoded.titleTemplate || eventName;
      } catch (e) {}

      console.log(`   Fetching: ${eventName}...`);
      const data = await fetchScheduleData(base64Param);

      // Add cloned schedules to the map
      let count = 0;
      if (data.clonedSchedules) {
        for (const schedule of data.clonedSchedules) {
          if (schedule.scheduleKey && schedule.accessCode) {
            accessCodeMap[schedule.scheduleKey] = schedule.accessCode;
            count++;
          }
        }
      }
      console.log(`      Found ${count} cloned schedules`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }
  }

  return accessCodeMap;
}

/**
 * Main backfill function
 */
async function backfillTpvHubLinks() {
  console.log('📋 Loading event data...');
  const events = loadEventData();
  console.log(`   Found ${events.length} events with scheduleUrls\n`);

  console.log('🌐 Fetching access codes from TPVirtualHub API...');
  const accessCodeMap = await buildAccessCodeMap(events);
  console.log(`   Built map with ${Object.keys(accessCodeMap).length} scheduleKey -> accessCode mappings\n`);

  console.log('🔥 Querying Firestore for results documents...');
  const resultsSnapshot = await db.collection('results').get();
  console.log(`   Found ${resultsSnapshot.size} result documents\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNoAccessCode = 0;
  let totalErrors = 0;

  for (const doc of resultsSnapshot.docs) {
    const docId = doc.id;
    const data = doc.data();

    // Check if already has correct accessCode
    if (data.tpvHubScheduleKey && data.tpvHubAccessCode) {
      totalSkipped++;
      continue;
    }

    // Get scheduleKey from existing data or skip
    const scheduleKey = data.tpvHubScheduleKey;
    if (!scheduleKey) {
      totalSkipped++;
      continue;
    }

    // Look up accessCode
    const accessCode = accessCodeMap[scheduleKey];
    if (!accessCode) {
      console.log(`   ⚠️ No accessCode found for scheduleKey ${scheduleKey} (${docId})`);
      totalNoAccessCode++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`   🔍 Would update ${docId}: scheduleKey=${scheduleKey}, accessCode=${accessCode}`);
      } else {
        // Update with correct accessCode and remove old eventKey field if present
        const updateData = {
          tpvHubAccessCode: accessCode
        };
        // Remove the old incorrect field
        if (data.tpvHubEventKey !== undefined) {
          updateData.tpvHubEventKey = admin.firestore.FieldValue.delete();
        }
        await doc.ref.update(updateData);
        console.log(`   ✅ Updated ${docId}: accessCode=${accessCode}`);
      }
      totalUpdated++;
    } catch (error) {
      console.log(`   ❌ Error updating ${docId}: ${error.message}`);
      totalErrors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Backfill Summary${DRY_RUN ? ' (DRY RUN)' : ''}:`);
  console.log(`   ${DRY_RUN ? '🔍 Would update' : '✅ Updated'}: ${totalUpdated} documents`);
  console.log(`   ⏭️ Already had data: ${totalSkipped} documents`);
  console.log(`   ⚠️ No accessCode found: ${totalNoAccessCode} documents`);
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
