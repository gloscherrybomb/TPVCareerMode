const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// Stage requirements (mirror from process-results.js)
const STAGE_REQUIREMENTS = {
    1: { type: 'fixed', eventId: 1 },
    2: { type: 'fixed', eventId: 2 },
    3: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
    4: { type: 'fixed', eventId: 3 },
    5: { type: 'fixed', eventId: 4 },
    6: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
    7: { type: 'fixed', eventId: 5 },
    8: { type: 'choice', eventIds: [6, 7, 8, 9, 10, 11, 12] },
    9: { type: 'tour', eventIds: [13, 14, 15] }
};

/**
 * Get next tour event based on progress
 */
function getNextTourEvent(tourProgress) {
    if (!tourProgress || !tourProgress.event13Completed) return 13;
    if (!tourProgress.event14Completed) return 14;
    if (!tourProgress.event15Completed) return 15;
    return null;
}

/**
 * Validate if event is valid for user's current stage
 */
function isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress) {
    const stageReq = STAGE_REQUIREMENTS[currentStage];

    if (!stageReq) {
        return { valid: false, reason: `Invalid stage: ${currentStage}` };
    }

    if (stageReq.type === 'fixed') {
        if (eventNumber === stageReq.eventId) {
            return { valid: true };
        }
        return { valid: false, reason: `Stage ${currentStage} requires Event ${stageReq.eventId}, not Event ${eventNumber}` };
    }

    if (stageReq.type === 'choice') {
        if (!stageReq.eventIds.includes(eventNumber)) {
            return { valid: false, reason: `Event ${eventNumber} is not a valid choice for Stage ${currentStage}` };
        }
        if (usedOptionalEvents && usedOptionalEvents.includes(eventNumber)) {
            return { valid: false, reason: `Event ${eventNumber} has already been used in a previous stage` };
        }
        return { valid: true };
    }

    if (stageReq.type === 'tour') {
        if (!stageReq.eventIds.includes(eventNumber)) {
            return { valid: false, reason: `Event ${eventNumber} is not part of the Local Tour` };
        }
        const nextExpected = getNextTourEvent(tourProgress);
        if (nextExpected === null) {
            return { valid: false, reason: 'Local Tour already completed' };
        }
        if (eventNumber !== nextExpected) {
            return { valid: false, reason: `Local Tour must be completed in order. Expected Event ${nextExpected}` };
        }
        return { valid: true };
    }

    return { valid: false, reason: 'Unknown stage type' };
}

/**
 * Upload Results Cloud Function
 * Validates user's stage and uploads CSV to GitHub
 */
exports.uploadResults = functions.https.onCall(async (data, context) => {
    // 1. Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to upload results');
    }

    const { csvContent, eventNumber, filename } = data;

    // Validate required fields
    if (!csvContent || !eventNumber || !filename) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: csvContent, eventNumber, filename');
    }

    const uid = context.auth.uid;
    console.log(`[uploadResults] User ${uid} attempting to upload results for event ${eventNumber}`);

    // 2. Get user document from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User document not found');
    }

    const userData = userDoc.data();
    const currentStage = userData.currentStage || 1;
    const usedOptionalEvents = userData.usedOptionalEvents || [];
    const tourProgress = userData.tourProgress || {};

    // 3. Check if user recently uploaded (rate limiting - 5 minute cooldown)
    const lastUpload = userData.lastResultsUpload;
    if (lastUpload) {
        const lastUploadTime = lastUpload.toDate ? lastUpload.toDate() : new Date(lastUpload);
        const cooldownMs = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - lastUploadTime.getTime() < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastUploadTime.getTime())) / 1000);
            throw new functions.https.HttpsError(
                'resource-exhausted',
                `Please wait ${remainingSeconds} seconds before uploading again`
            );
        }
    }

    // 4. Validate event is valid for user's current stage
    const validation = isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress);

    if (!validation.valid) {
        console.log(`[uploadResults] Validation failed for user ${uid}: ${validation.reason}`);
        throw new functions.https.HttpsError('failed-precondition', validation.reason);
    }

    console.log(`[uploadResults] Validation passed for user ${uid}, event ${eventNumber}, stage ${currentStage}`);

    // 5. Verify user's UID is in the CSV
    const userCareerUID = userData.uid; // The 16-char career UID, not Firebase auth uid
    if (!csvContent.includes(userCareerUID)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            `Your career UID (${userCareerUID}) was not found in the results file`
        );
    }

    // 6. Upload to GitHub
    const GITHUB_TOKEN = functions.config().github?.token;
    if (!GITHUB_TOKEN) {
        console.error('[uploadResults] GitHub token not configured');
        throw new functions.https.HttpsError('internal', 'Server configuration error. Please contact support.');
    }

    const path = `race_results/season_1/event_${eventNumber}/${filename}`;
    const apiUrl = `https://api.github.com/repos/gloscherrybomb/TPVCareerMode/contents/${path}`;

    try {
        // Check if file already exists
        const checkResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TPV-Career-Mode'
            }
        });

        let sha = null;
        if (checkResponse.ok) {
            // File exists - get SHA for update
            const existingFile = await checkResponse.json();
            sha = existingFile.sha;
            console.log(`[uploadResults] File exists, will update. SHA: ${sha}`);
        }

        // Create or update file
        const body = {
            message: `Upload results for event ${eventNumber} by user ${userCareerUID}`,
            content: Buffer.from(csvContent).toString('base64'),
            branch: 'main'
        };

        if (sha) {
            body.sha = sha; // Required for updates
        }

        const uploadResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TPV-Career-Mode'
            },
            body: JSON.stringify(body)
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error('[uploadResults] GitHub API error:', errorData);
            throw new Error(`GitHub API error: ${errorData.message || 'Unknown error'}`);
        }

        const result = await uploadResponse.json();
        console.log(`[uploadResults] Successfully uploaded to ${path}`);

        // 7. Record upload timestamp
        await admin.firestore().collection('users').doc(uid).update({
            lastResultsUpload: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            path: path,
            sha: result.content?.sha
        };

    } catch (error) {
        console.error('[uploadResults] Upload error:', error);
        throw new functions.https.HttpsError('internal', `Failed to upload to GitHub: ${error.message}`);
    }
});
