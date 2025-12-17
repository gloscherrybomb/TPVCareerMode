/**
 * Process Pending Uploads
 *
 * This script is run by a GitHub Action on a schedule.
 * It reads pending CSV uploads from Firestore, writes them to the repo,
 * and deletes them from Firestore after successful commit.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function processPendingUploads() {
    console.log('🔍 Checking for pending uploads...');

    try {
        // Get all pending uploads
        const pendingUploadsRef = db.collection('pendingUploads');
        const snapshot = await pendingUploadsRef.where('status', '==', 'pending').get();

        if (snapshot.empty) {
            console.log('ℹ️  No pending uploads found');
            return;
        }

        console.log(`📦 Found ${snapshot.size} pending upload(s)`);

        const processedDocs = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docId = doc.id;

            console.log(`\n📄 Processing upload ${docId}:`);
            console.log(`   Event: ${data.eventNumber}`);
            console.log(`   User: ${data.userName} (${data.userCareerUID})`);
            console.log(`   Filename: ${data.filename}`);

            try {
                // Determine the target path
                const targetDir = `race_results/season_1/event_${data.eventNumber}`;
                const targetPath = path.join(targetDir, data.filename);

                // Ensure directory exists
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                    console.log(`   📁 Created directory: ${targetDir}`);
                }

                // Check if file already exists (avoid duplicates)
                if (fs.existsSync(targetPath)) {
                    console.log(`   ⚠️  File already exists: ${targetPath}`);
                    // Mark as processed anyway to avoid infinite retries
                    processedDocs.push({ docId, success: true, reason: 'already_exists' });
                    continue;
                }

                // Write the CSV file
                fs.writeFileSync(targetPath, data.csvContent, 'utf8');
                console.log(`   ✅ Wrote file: ${targetPath}`);

                processedDocs.push({ docId, success: true, path: targetPath });

            } catch (fileError) {
                console.error(`   ❌ Error writing file: ${fileError.message}`);
                processedDocs.push({ docId, success: false, error: fileError.message });
            }
        }

        // Delete successfully processed documents from Firestore
        console.log('\n🗑️  Cleaning up Firestore...');

        for (const result of processedDocs) {
            if (result.success) {
                try {
                    await pendingUploadsRef.doc(result.docId).delete();
                    console.log(`   ✅ Deleted document: ${result.docId}`);
                } catch (deleteError) {
                    console.error(`   ❌ Error deleting document ${result.docId}: ${deleteError.message}`);
                }
            } else {
                // Mark failed uploads with error status so they can be investigated
                try {
                    await pendingUploadsRef.doc(result.docId).update({
                        status: 'error',
                        errorMessage: result.error,
                        errorAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`   ⚠️  Marked document as error: ${result.docId}`);
                } catch (updateError) {
                    console.error(`   ❌ Error updating document ${result.docId}: ${updateError.message}`);
                }
            }
        }

        const successCount = processedDocs.filter(r => r.success).length;
        const failCount = processedDocs.filter(r => !r.success).length;

        console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed`);

    } catch (error) {
        console.error('❌ Error processing pending uploads:', error);
        process.exit(1);
    }
}

// Run the script
processPendingUploads()
    .then(() => {
        console.log('\n✅ Process complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
