const admin = require("firebase-admin");

// Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixMissingCareerPoints() {
  console.log("Scanning for users missing careerPoints...\n");

  const usersSnapshot = await db.collection("users").get();
  const usersToFix = [];

  usersSnapshot.forEach((doc) => {
    // Skip bots
    if (doc.id.startsWith("Bot")) return;

    const data = doc.data();

    // Check if careerPoints field is missing or undefined
    if (data.careerPoints === undefined) {
      usersToFix.push({
        id: doc.id,
        name: data.name || "Unknown"
      });
    }
  });

  console.log(`Found ${usersToFix.length} users missing careerPoints:\n`);
  usersToFix.forEach((u) => console.log(`  - ${u.name} (${u.id})`));

  if (usersToFix.length === 0) {
    console.log("\nNo users need fixing!");
    return;
  }

  console.log(`\nFixing ${usersToFix.length} users...\n`);

  // Fix each user
  let fixed = 0;
  for (const user of usersToFix) {
    try {
      await db.collection("users").doc(user.id).update({
        careerPoints: 0
      });
      console.log(`  ✓ Fixed: ${user.name}`);
      fixed++;
    } catch (error) {
      console.error(`  ✗ Error fixing ${user.name}:`, error.message);
    }
  }

  console.log(`\nDone! Fixed ${fixed} of ${usersToFix.length} users.`);
}

// Run
fixMissingCareerPoints()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
