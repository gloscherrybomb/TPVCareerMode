// Upload Results Page Logic

// TEMPORARILY DISABLED - Redirect to homepage
alert('Upload Results is temporarily disabled. Redirecting to homepage.');
window.location.href = 'index.html';
throw new Error('Page disabled'); // Stop further script execution

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Import shared event configuration from window (loaded via script tag in HTML)
const { STAGE_REQUIREMENTS, EXPECTED_DISTANCES, EVENT_NAMES, TIME_BASED_EVENTS } = window.eventConfig;

// Special events available for upload (The Leveller is free for all)
const UPLOAD_SPECIAL_EVENTS = [
    {
        id: 102,
        name: 'The Leveller',
        icon: '⚖️',
        description: 'Points Race - All-rounder challenge',
        isFree: true  // Available to all users
    }
];

// State
let currentUser = null;
let userData = null;
let selectedFile = null;
let parsedCSV = null;
let validationPassed = false;
let selectedEventNumber = null;
let isSpecialEventUpload = false;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const loginPrompt = document.getElementById('loginPrompt');
const uploadContent = document.getElementById('uploadContent');
const currentStageEl = document.getElementById('currentStage');
const validEventsList = document.getElementById('validEventsList');
const eventSelectionSection = document.getElementById('eventSelectionSection');
const eventSelect = document.getElementById('eventSelect');
const specialEventsSection = document.getElementById('specialEventsSection');
const specialEventsList = document.getElementById('specialEventsList');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const clearFileBtn = document.getElementById('clearFile');
const validationResults = document.getElementById('validationResults');
const validationItems = document.getElementById('validationItems');
const uploadBtn = document.getElementById('uploadBtn');
const statusMessage = document.getElementById('statusMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData(user);
    } else {
        currentUser = null;
        userData = null;
        showLoginPrompt();
    }
});

// Setup event listeners
function setupEventListeners() {
    // Drag and drop
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    dropzone.addEventListener('click', (e) => {
        // Only trigger file input if clicking the dropzone itself, not the browse button
        // The label/input already handles its own click
        if (e.target === dropzone || e.target.closest('.dropzone-icon, .dropzone-text, .dropzone-subtext')) {
            fileInput.click();
        }
    });

    // File input
    fileInput.addEventListener('change', handleFileSelect);

    // Clear file
    clearFileBtn.addEventListener('click', clearFile);

    // Event selection
    eventSelect.addEventListener('change', handleEventSelection);

    // Upload button
    uploadBtn.addEventListener('click', handleUpload);
}

// Load user data from Firestore
async function loadUserData(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            console.error('User document not found');
            showLoginPrompt();
            return;
        }

        userData = userDoc.data();
        showUploadContent();
        displayStageInfo();
    } catch (error) {
        console.error('Error loading user data:', error);
        showLoginPrompt();
    }
}

// UI State functions
function showLoadingState() {
    loadingState.style.display = 'flex';
    loginPrompt.style.display = 'none';
    uploadContent.style.display = 'none';
}

function showLoginPrompt() {
    loadingState.style.display = 'none';
    loginPrompt.style.display = 'block';
    uploadContent.style.display = 'none';
}

function showUploadContent() {
    loadingState.style.display = 'none';
    loginPrompt.style.display = 'none';
    uploadContent.style.display = 'block';
}

// Display stage info and valid events
function displayStageInfo() {
    const currentStage = userData.currentStage || 1;
    const usedOptionalEvents = userData.usedOptionalEvents || [];
    const tourProgress = userData.tourProgress || {};

    currentStageEl.textContent = currentStage;

    const stageReq = STAGE_REQUIREMENTS[currentStage];
    if (!stageReq) {
        validEventsList.innerHTML = '<span class="valid-event-tag">Season Complete</span>';
    } else {
        let validEvents = [];

        if (stageReq.type === 'fixed') {
            validEvents = [stageReq.eventId];
            eventSelectionSection.style.display = 'none';
            selectedEventNumber = stageReq.eventId;
        } else if (stageReq.type === 'choice') {
            validEvents = stageReq.eventIds.filter(id => !usedOptionalEvents.includes(id));
            showEventSelection(validEvents);
        } else if (stageReq.type === 'tour') {
            const nextTourEvent = getNextTourEvent(tourProgress);
            if (nextTourEvent) {
                validEvents = [nextTourEvent];
                selectedEventNumber = nextTourEvent;
            }
            eventSelectionSection.style.display = 'none';
        }

        // Display valid events
        validEventsList.innerHTML = validEvents.map(eventId => {
            const name = EVENT_NAMES[eventId] || `Event ${eventId}`;
            return `<span class="valid-event-tag highlight">Event ${eventId}: ${name}</span>`;
        }).join('');
    }

    // Display special events section
    displaySpecialEvents();
}

// Display available special events for upload
function displaySpecialEvents() {
    if (!specialEventsSection || !specialEventsList) return;

    // Filter to events user has access to
    const availableEvents = UPLOAD_SPECIAL_EVENTS.filter(event => {
        if (event.isFree) return true;
        // Check unlock field in userData if needed for future paid events
        return false;
    });

    if (availableEvents.length === 0) {
        specialEventsSection.style.display = 'none';
        return;
    }

    specialEventsSection.style.display = 'block';
    specialEventsList.innerHTML = availableEvents.map(event => `
        <button class="special-event-btn" data-event-id="${event.id}">
            <span class="special-event-icon">${event.icon}</span>
            <span class="special-event-info">
                <span class="special-event-name">${event.name}</span>
                <span class="special-event-desc">${event.description}</span>
            </span>
        </button>
    `).join('');

    // Add click handlers
    specialEventsList.querySelectorAll('.special-event-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSpecialEventSelect(parseInt(btn.dataset.eventId)));
    });
}

// Handle special event selection
function handleSpecialEventSelect(eventId) {
    // Toggle selection
    const wasSelected = selectedEventNumber === eventId && isSpecialEventUpload;

    // Clear all selections
    specialEventsList.querySelectorAll('.special-event-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    if (wasSelected) {
        // Deselect - go back to season event
        isSpecialEventUpload = false;
        selectedEventNumber = null;
        displayStageInfo(); // Reset to show season event
    } else {
        // Select this special event
        isSpecialEventUpload = true;
        selectedEventNumber = eventId;
        const btn = specialEventsList.querySelector(`[data-event-id="${eventId}"]`);
        if (btn) btn.classList.add('selected');
    }

    // Re-validate if we have a file
    if (parsedCSV) {
        validateCSV();
    }
}

// Get next tour event
function getNextTourEvent(tourProgress) {
    if (!tourProgress.event13Completed) return 13;
    if (!tourProgress.event14Completed) return 14;
    if (!tourProgress.event15Completed) return 15;
    return null;
}

// Show event selection dropdown for choice stages
function showEventSelection(validEvents) {
    eventSelectionSection.style.display = 'block';
    eventSelect.innerHTML = '<option value="">-- Select an event --</option>' +
        validEvents.map(eventId => {
            const name = EVENT_NAMES[eventId] || `Event ${eventId}`;
            return `<option value="${eventId}">Event ${eventId}: ${name}</option>`;
        }).join('');
    selectedEventNumber = null;
}

// Handle event selection
function handleEventSelection(e) {
    selectedEventNumber = e.target.value ? parseInt(e.target.value) : null;
    if (parsedCSV) {
        validateCSV();
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// Handle file selection via input
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
}

// Process selected file
function processFile(file) {
    // Check file type
    if (!file.name.endsWith('.csv')) {
        showStatus('error', 'Invalid File Type', 'Please select a CSV file.');
        return;
    }

    // Check file size (max 100KB)
    if (file.size > 100 * 1024) {
        showStatus('error', 'File Too Large', 'Maximum file size is 100KB.');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    statusMessage.style.display = 'none';

    // Parse CSV
    parseCSV(file);
}

// Clear selected file
function clearFile() {
    selectedFile = null;
    parsedCSV = null;
    validationPassed = false;
    selectedEventNumber = null;
    isSpecialEventUpload = false;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    validationResults.style.display = 'none';
    statusMessage.style.display = 'none';
    uploadBtn.disabled = true;

    // Reset event selection for choice stages
    const currentStage = userData?.currentStage || 1;
    const stageReq = STAGE_REQUIREMENTS[currentStage];
    if (stageReq?.type === 'choice') {
        eventSelect.value = '';
        selectedEventNumber = null;
    }

    // Reset special event selection
    if (specialEventsList) {
        specialEventsList.querySelectorAll('.special-event-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
}

// Parse CSV file
function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        // Skip header rows (first 2 lines are headers in TPVirtual format)
        const headerLine = lines.find(line => line.includes('Position') && line.includes('UID'));
        if (!headerLine) {
            showStatus('error', 'Invalid CSV Format', 'Could not find header row with Position and UID columns.');
            return;
        }

        const headerIndex = lines.indexOf(headerLine);
        const headers = headerLine.split(',').map(h => h.trim());
        const dataLines = lines.slice(headerIndex + 1);

        // Parse data rows
        const results = dataLines
            .filter(line => line.trim())
            .map(line => {
                const values = parseCSVLine(line);
                const row = {};
                headers.forEach((header, i) => {
                    row[header] = values[i]?.trim() || '';
                });
                return row;
            });

        parsedCSV = {
            headers,
            results,
            rawText: text,
            filename: file.name
        };

        validateCSV();
    };
    reader.readAsText(file);
}

// Parse a single CSV line (handling quoted values)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Validate parsed CSV
function validateCSV() {
    if (!parsedCSV) return;

    const validations = [];
    let allValid = true;

    // Get user's UID
    const userUID = userData.uid;

    // 1. Check if user's UID is in the CSV
    const userInCSV = parsedCSV.results.some(r => r.UID === userUID);
    validations.push({
        valid: userInCSV,
        icon: userInCSV ? '✓' : '✗',
        text: userInCSV
            ? `Your UID (${userUID}) found in results`
            : `Your UID (${userUID}) not found in this results file`,
        type: userInCSV ? 'valid' : 'invalid'
    });
    if (!userInCSV) allValid = false;

    // 2. Check distance/event validation (skip for time-based events)
    const isTimeBasedEvent = selectedEventNumber && TIME_BASED_EVENTS.includes(selectedEventNumber);

    if (isTimeBasedEvent) {
        // For time-based events, skip distance validation and show info message
        validations.push({
            valid: true,
            icon: '✓',
            text: `Event ${selectedEventNumber} is a time-based challenge (distance varies by rider)`,
            type: 'valid'
        });
    } else {
        const finishers = parsedCSV.results.filter(r => r.Position !== 'DNF' && r.Distance);
        if (finishers.length > 0) {
            const winnerDistance = parseFloat(finishers[0].Distance);

            if (selectedEventNumber) {
                const expectedDistance = EXPECTED_DISTANCES[selectedEventNumber];
                const tolerance = 0.10; // 10% tolerance
                const minDist = expectedDistance * (1 - tolerance);
                const maxDist = expectedDistance * (1 + tolerance);
                const distanceMatch = winnerDistance >= minDist && winnerDistance <= maxDist;

                validations.push({
                    valid: distanceMatch,
                    icon: distanceMatch ? '✓' : '✗',
                    text: distanceMatch
                        ? `Distance matches Event ${selectedEventNumber} (~${(expectedDistance / 1000).toFixed(1)}km)`
                        : `Distance mismatch: Found ${(winnerDistance / 1000).toFixed(1)}km, expected ~${(expectedDistance / 1000).toFixed(1)}km for Event ${selectedEventNumber}`,
                    type: distanceMatch ? 'valid' : 'invalid'
                });
                if (!distanceMatch) allValid = false;
            } else {
                // Try to detect event from distance
                const detectedEvent = detectEventFromDistance(winnerDistance);
                if (detectedEvent) {
                    validations.push({
                        valid: true,
                        icon: 'ℹ',
                        text: `Distance suggests Event ${detectedEvent}: ${EVENT_NAMES[detectedEvent]} (~${(winnerDistance / 1000).toFixed(1)}km)`,
                        type: 'info'
                    });
                } else {
                    validations.push({
                        valid: false,
                        icon: '⚠',
                        text: `Could not match distance (${(winnerDistance / 1000).toFixed(1)}km) to any event`,
                        type: 'warning'
                    });
                }

                // For choice stages, remind to select event
                const currentStage = userData?.currentStage || 1;
                const stageReq = STAGE_REQUIREMENTS[currentStage];
                if (stageReq?.type === 'choice') {
                    validations.push({
                        valid: false,
                        icon: '!',
                        text: 'Please select which event this result is for',
                        type: 'warning'
                    });
                    allValid = false;
                }
            }
        }
    }

    // 3. Check stage validity (or special event validity)
    if (selectedEventNumber) {
        const currentStage = userData?.currentStage || 1;
        const usedOptionalEvents = userData?.usedOptionalEvents || [];
        const tourProgress = userData?.tourProgress || {};

        const stageValidation = isEventValidForStage(selectedEventNumber, currentStage, usedOptionalEvents, tourProgress);

        let validationText;
        if (stageValidation.valid) {
            if (stageValidation.isSpecialEvent) {
                const eventName = EVENT_NAMES[selectedEventNumber] || `Event ${selectedEventNumber}`;
                validationText = `${eventName} is a Special Event (does not affect season progression)`;
            } else {
                validationText = `Event ${selectedEventNumber} is valid for Stage ${currentStage}`;
            }
        } else {
            validationText = stageValidation.reason;
        }

        validations.push({
            valid: stageValidation.valid,
            icon: stageValidation.valid ? '✓' : '✗',
            text: validationText,
            type: stageValidation.valid ? 'valid' : 'invalid'
        });
        if (!stageValidation.valid) allValid = false;
    }

    // 4. Check result count
    const resultCount = parsedCSV.results.length;
    validations.push({
        valid: resultCount > 0,
        icon: resultCount > 0 ? '✓' : '✗',
        text: `${resultCount} riders found in results`,
        type: resultCount > 0 ? 'valid' : 'invalid'
    });

    // Display validations
    displayValidations(validations);
    validationPassed = allValid;
    uploadBtn.disabled = !allValid;
}

// Detect event from distance
function detectEventFromDistance(distance) {
    const tolerance = 0.10; // 10%

    for (const [eventId, expectedDist] of Object.entries(EXPECTED_DISTANCES)) {
        const minDist = expectedDist * (1 - tolerance);
        const maxDist = expectedDist * (1 + tolerance);
        if (distance >= minDist && distance <= maxDist) {
            return parseInt(eventId);
        }
    }
    return null;
}

// Check if event is a special event
function isSpecialEvent(eventNumber) {
    return eventNumber > 100;
}

// Validate event for stage (mirror process-results.js logic)
function isEventValidForStage(eventNumber, currentStage, usedOptionalEvents, tourProgress) {
    // Special events are always valid (they don't affect season progression)
    if (isSpecialEvent(eventNumber)) {
        return { valid: true, isSpecialEvent: true };
    }

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
        if (usedOptionalEvents.includes(eventNumber)) {
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

// Display validation results
function displayValidations(validations) {
    validationResults.style.display = 'block';
    validationItems.innerHTML = validations.map(v => `
        <div class="validation-item ${v.type}">
            <span class="validation-icon">${v.icon}</span>
            <span class="validation-text">${v.text}</span>
        </div>
    `).join('');
}

// Handle upload
async function handleUpload() {
    if (!validationPassed || !parsedCSV || !selectedEventNumber) {
        return;
    }

    // Disable button and show loading
    uploadBtn.disabled = true;
    uploadBtn.querySelector('.btn-text').style.display = 'none';
    uploadBtn.querySelector('.btn-loading').style.display = 'flex';
    statusMessage.style.display = 'none';

    try {
        // Extract event key and pen from filename if possible
        const filenameMatch = selectedFile.name.match(/Event(\d+)-Pen(\d+)/i);
        const eventKey = filenameMatch ? filenameMatch[1] : 'Unknown';
        const pen = filenameMatch ? filenameMatch[2] : '1';

        // Generate filename for upload
        const uploadFilename = `TPVirtual-Results-Event${eventKey}-Pen${pen}.csv`;

        // Save to Firestore pendingUploads collection
        // A GitHub Action will pick this up and commit it to the repo
        const pendingUpload = {
            csvContent: parsedCSV.rawText,
            eventNumber: selectedEventNumber,
            filename: uploadFilename,
            originalFilename: selectedFile.name,
            userCareerUID: userData.uid,
            userFirebaseUID: currentUser.uid,
            userName: userData.name || 'Unknown',
            currentStage: userData.currentStage || 1,
            status: 'pending',
            uploadedAt: serverTimestamp()
        };

        console.log('Attempting to upload to Firestore...', { eventNumber: selectedEventNumber, filename: uploadFilename });
        const docRef = await addDoc(collection(db, 'pendingUploads'), pendingUpload);
        console.log('Upload successful! Document ID:', docRef.id);

        clearFile();
        showStatus('success', 'Upload Successful!',
            `Your results have been submitted and will be processed within a few minutes. Check your profile shortly.`);

    } catch (error) {
        console.error('Upload error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        let errorMessage = 'An error occurred while uploading. Please try again.';

        if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
            errorMessage = 'Permission denied. Please ensure you are logged in and try again.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firestore is temporarily unavailable. Please try again in a moment.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }

        showStatus('error', 'Upload Failed', errorMessage);
    } finally {
        // Reset button state
        uploadBtn.querySelector('.btn-text').style.display = 'inline';
        uploadBtn.querySelector('.btn-loading').style.display = 'none';
        uploadBtn.disabled = !validationPassed;
    }
}

// Show status message
function showStatus(type, title, message) {
    statusMessage.className = `status-message ${type}`;
    statusMessage.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    statusMessage.style.display = 'block';
    statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
