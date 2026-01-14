// One-time script to add careerPoints: 0 to users who are missing it
// Run this from the browser console while logged in as admin

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixMissingCareerPoints() {
    console.log('Scanning for users missing careerPoints...');

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersToFix = [];

    usersSnapshot.forEach((docSnapshot) => {
        // Skip bots
        if (docSnapshot.id.startsWith('Bot')) return;

        const data = docSnapshot.data();

        // Check if careerPoints field is missing or undefined
        if (data.careerPoints === undefined) {
            usersToFix.push({
                id: docSnapshot.id,
                name: data.name || 'Unknown'
            });
        }
    });

    console.log(`Found ${usersToFix.length} users missing careerPoints:`);
    usersToFix.forEach(u => console.log(`  - ${u.name} (${u.id})`));

    if (usersToFix.length === 0) {
        console.log('No users need fixing!');
        return;
    }

    // Confirm before proceeding
    const confirm = window.confirm(`Add careerPoints: 0 to ${usersToFix.length} users?`);
    if (!confirm) {
        console.log('Cancelled.');
        return;
    }

    // Fix each user
    let fixed = 0;
    for (const user of usersToFix) {
        try {
            await updateDoc(doc(db, 'users', user.id), {
                careerPoints: 0
            });
            console.log(`Fixed: ${user.name}`);
            fixed++;
        } catch (error) {
            console.error(`Error fixing ${user.name}:`, error);
        }
    }

    console.log(`Done! Fixed ${fixed} of ${usersToFix.length} users.`);
}

// Auto-run
fixMissingCareerPoints();
