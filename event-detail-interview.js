// event-detail-interview.js - Handle post-race interview display and interaction

import { generateInterview, buildRaceContext, calculateSeasonContext } from './interview-engine.js';
import { hasCompletedInterview, saveInterviewResponse, initializePersonalityIfNeeded, formatPersonalityChange } from './interview-persistence.js';

let currentInterview = null;
let selectedResponseIndex = null;

/**
 * Display post-race interview after results are shown
 */
export async function displayPostRaceInterview(db, userId, eventNumber, userResult, allResults, userData) {
    try {
        // Check if already completed
        const alreadyCompleted = await hasCompletedInterview(db, userId, eventNumber);

        if (alreadyCompleted) {
            console.log('Interview already completed for this event');
            return;
        }

        // Initialize personality if needed
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', userId), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error('User not found');
            return;
        }

        const userDocRef = querySnapshot.docs[0].ref;
        await initializePersonalityIfNeeded(db, userDocRef);

        // Build race context
        const seasonContext = calculateSeasonContext(userData, eventNumber);
        const raceContext = buildRaceContext(userResult, allResults, userData, seasonContext);

        // Generate interview question and responses
        currentInterview = generateInterview(raceContext);
        currentInterview.db = db;
        currentInterview.userId = userId;
        currentInterview.eventNumber = eventNumber;
        currentInterview.raceContext = raceContext;

        // Display the interview
        renderInterview(currentInterview);

        // Show the interview section
        const interviewSection = document.getElementById('postRaceInterviewSection');
        if (interviewSection) {
            interviewSection.style.display = 'block';

            // Scroll to interview after a short delay
            setTimeout(() => {
                interviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        }

    } catch (error) {
        console.error('Error displaying interview:', error);
    }
}

/**
 * Render interview question and response options
 */
function renderInterview(interview) {
    // Set question text
    const questionElement = document.getElementById('journalistQuestion');
    if (questionElement) {
        questionElement.textContent = interview.questionText;
    }

    // Render response options
    const responseOptionsContainer = document.getElementById('responseOptions');
    if (responseOptionsContainer) {
        responseOptionsContainer.innerHTML = '';

        interview.responseOptions.forEach((response, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'response-option';
            optionDiv.dataset.responseIndex = index;

            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'response-badge';
            badgeDiv.textContent = `Response ${index + 1}`;

            const textP = document.createElement('p');
            textP.className = 'response-text';
            textP.textContent = response.text;

            optionDiv.appendChild(badgeDiv);
            optionDiv.appendChild(textP);

            // Add click handler
            optionDiv.addEventListener('click', () => handleResponseSelection(index));

            responseOptionsContainer.appendChild(optionDiv);
        });
    }
}

/**
 * Handle user selecting a response
 */
function handleResponseSelection(index) {
    // Update selected state
    selectedResponseIndex = index;

    // Update UI to show selection
    const allOptions = document.querySelectorAll('.response-option');
    allOptions.forEach((option, i) => {
        if (i === index) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Submit the response
    submitResponse(index);
}

/**
 * Submit selected response to database
 */
async function submitResponse(responseIndex) {
    try {
        if (!currentInterview) {
            console.error('No interview data');
            return;
        }

        const selectedResponse = currentInterview.responseOptions[responseIndex];

        // Disable all response options to prevent multiple submissions
        const allOptions = document.querySelectorAll('.response-option');
        allOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.6';
        });

        // Save to database
        const result = await saveInterviewResponse(
            currentInterview.db,
            currentInterview.userId,
            currentInterview.eventNumber,
            currentInterview,
            selectedResponse,
            currentInterview.raceContext
        );

        if (result.success) {
            // Show submitted feedback
            displaySubmittedFeedback(selectedResponse, result.personalityDelta);
        } else {
            console.error('Failed to save interview:', result.error);
            alert('Failed to save your response. Please try again.');

            // Re-enable options
            allOptions.forEach(option => {
                option.style.pointerEvents = 'auto';
                option.style.opacity = '1';
            });
        }

    } catch (error) {
        console.error('Error submitting response:', error);
        alert('An error occurred. Please try again.');
    }
}

/**
 * Display feedback after submission
 */
function displaySubmittedFeedback(selectedResponse, personalityDelta) {
    // Hide response options
    const responseOptionsContainer = document.getElementById('responseOptions');
    if (responseOptionsContainer) {
        responseOptionsContainer.style.display = 'none';
    }

    // Show submitted section
    const submittedSection = document.getElementById('interviewSubmitted');
    if (submittedSection) {
        submittedSection.style.display = 'block';
    }

    // Set submitted text
    const submittedText = document.getElementById('submittedText');
    if (submittedText) {
        submittedText.textContent = selectedResponse.text;
    }

    // Display personality changes
    const changesContainer = document.getElementById('personalityChanges');
    if (changesContainer) {
        changesContainer.innerHTML = '';

        Object.entries(personalityDelta).forEach(([trait, value]) => {
            if (value !== 0) {
                const changeData = formatPersonalityChange(trait, value);

                const changeDiv = document.createElement('div');
                changeDiv.className = `personality-change ${value < 0 ? 'negative' : ''}`;

                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'personality-change-emoji';
                emojiSpan.textContent = changeData.emoji;

                const textSpan = document.createElement('span');
                textSpan.className = 'personality-change-text';
                textSpan.textContent = `${changeData.trait} ${changeData.value}`;

                changeDiv.appendChild(emojiSpan);
                changeDiv.appendChild(textSpan);

                changesContainer.appendChild(changeDiv);
            }
        });
    }

    // Scroll to feedback
    setTimeout(() => {
        submittedSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
}

// Import Firestore functions that are needed
import { collection, query, where, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
