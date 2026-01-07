/**
 * High 5s Migration Script
 *
 * Run this script in the browser console while logged in as an admin
 * on any page that has Firebase initialized (e.g., results-feed.html).
 *
 * This script will:
 * 1. Query all results with highFiveCount > 0
 * 2. Sum up high 5 counts per user (by TPV UID)
 * 3. Look up each user's Firebase Auth UID
 * 4. Update their totalHighFivesReceived field
 *
 * Usage:
 * 1. Go to results-feed.html (or any page with Firebase)
 * 2. Open browser console (F12 -> Console)
 * 3. Paste this entire script and press Enter
 * 4. Wait for completion message
 */

(async function migrateHighFives() {
    console.log('=== High 5s Migration Script ===');
    console.log('Starting migration...');

    // Get Firestore reference (assumes Firebase is already initialized on the page)
    const { getFirestore, collection, getDocs, query, where, doc, updateDoc, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const db = getFirestore();

    try {
        // Step 1: Query all results with high 5s
        console.log('Step 1: Fetching all results with high 5s...');
        const resultsRef = collection(db, 'results');
        const resultsSnapshot = await getDocs(resultsRef);

        // Build a map of TPV UID -> total high 5s received
        const userHighFiveTotals = {};
        let resultsWithHighFives = 0;
        let totalHighFives = 0;

        resultsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const highFiveCount = data.highFiveCount || 0;
            const userUid = data.userUid; // TPV UID

            if (highFiveCount > 0 && userUid) {
                resultsWithHighFives++;
                totalHighFives += highFiveCount;

                if (!userHighFiveTotals[userUid]) {
                    userHighFiveTotals[userUid] = 0;
                }
                userHighFiveTotals[userUid] += highFiveCount;
            }
        });

        console.log(`Found ${resultsWithHighFives} results with high 5s`);
        console.log(`Total high 5s to migrate: ${totalHighFives}`);
        console.log(`Unique users with high 5s: ${Object.keys(userHighFiveTotals).length}`);

        if (Object.keys(userHighFiveTotals).length === 0) {
            console.log('No high 5s to migrate. Done!');
            return;
        }

        // Step 2: For each TPV UID, find the Firebase Auth UID and update the user doc
        console.log('\nStep 2: Updating user documents...');
        const usersRef = collection(db, 'users');
        let updatedCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;

        for (const [tpvUid, highFiveTotal] of Object.entries(userHighFiveTotals)) {
            try {
                // Find user by TPV UID
                const userQuery = query(usersRef, where('uid', '==', tpvUid), limit(1));
                const userSnapshot = await getDocs(userQuery);

                if (userSnapshot.empty) {
                    console.warn(`User not found for TPV UID: ${tpvUid} (${highFiveTotal} high 5s)`);
                    notFoundCount++;
                    continue;
                }

                const userDocId = userSnapshot.docs[0].id; // Firebase Auth UID
                const userData = userSnapshot.docs[0].data();

                // Update the user's totalHighFivesReceived
                const userRef = doc(db, 'users', userDocId);
                await updateDoc(userRef, {
                    totalHighFivesReceived: highFiveTotal
                });

                updatedCount++;
                console.log(`Updated ${userData.name || tpvUid}: ${highFiveTotal} high 5s`);

            } catch (err) {
                console.error(`Error updating user ${tpvUid}:`, err);
                errorCount++;
            }
        }

        // Summary
        console.log('\n=== Migration Complete ===');
        console.log(`Users updated: ${updatedCount}`);
        console.log(`Users not found: ${notFoundCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total high 5s migrated: ${totalHighFives}`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
})();
