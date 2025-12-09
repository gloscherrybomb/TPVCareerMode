// interview-persistence.js - Handle interview data persistence to Firestore

import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDefaultPersonality, applyPersonalityChanges } from './interview-engine.js';

/**
 * Check if user has already completed interview for this event
 */
export async function hasCompletedInterview(db, userId, eventNumber) {
    try {
        const interviewRef = doc(db, 'interviews', `${userId}_${eventNumber}`);
        const interviewDoc = await getDoc(interviewRef);
        return interviewDoc.exists();
    } catch (error) {
        console.error('Error checking interview status:', error);
        return false;
    }
}

/**
 * Get completed interview data
 */
export async function getCompletedInterview(db, userId, eventNumber) {
    try {
        const interviewRef = doc(db, 'interviews', `${userId}_${eventNumber}`);
        const interviewDoc = await getDoc(interviewRef);

        if (interviewDoc.exists()) {
            return interviewDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting completed interview:', error);
        return null;
    }
}

/**
 * Get user's current personality profile
 */
export async function getUserPersonality(db, userDocRef) {
    try {
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.error('User document not found');
            return getDefaultPersonality();
        }

        const userData = userDoc.data();

        // Return existing personality or default
        return userData.personality || getDefaultPersonality();
    } catch (error) {
        console.error('Error getting user personality:', error);
        return getDefaultPersonality();
    }
}

/**
 * Initialize personality for users who don't have it yet
 */
export async function initializePersonalityIfNeeded(db, userDocRef) {
    try {
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.error('User document not found');
            return;
        }

        const userData = userDoc.data();

        // Only initialize if personality doesn't exist
        if (!userData.personality) {
            const defaultPersonality = getDefaultPersonality();

            await updateDoc(userDocRef, {
                personality: defaultPersonality,
                interviewHistory: {
                    totalInterviews: 0,
                    lastInterviewEventNumber: null,
                    lastInterviewTimestamp: null,
                    responsePatterns: {
                        confident: 0,
                        humble: 0,
                        aggressive: 0,
                        professional: 0,
                        showman: 0,
                        resilient: 0,
                        honest: 0
                    }
                }
            });

            console.log('Initialized personality for user');
        }
    } catch (error) {
        console.error('Error initializing personality:', error);
    }
}

/**
 * Save interview response and update personality
 */
export async function saveInterviewResponse(db, userId, eventNumber, interviewData, selectedResponse, raceContext) {
    try {
        // Get user document reference (query by uid field)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', userId), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('User document not found');
        }

        const userDocRef = querySnapshot.docs[0].ref;
        const userData = querySnapshot.docs[0].data();

        // Get current personality
        const currentPersonality = userData.personality || getDefaultPersonality();

        // Calculate new personality
        const newPersonality = applyPersonalityChanges(currentPersonality, selectedResponse.personalityImpact);

        // Create interview record
        const interviewRef = doc(db, 'interviews', `${userId}_${eventNumber}`);
        await setDoc(interviewRef, {
            userId: userId,
            eventNumber: eventNumber,
            timestamp: serverTimestamp(),

            // Race context
            raceContext: {
                position: raceContext.position,
                predictedPosition: raceContext.predicted,
                totalRiders: raceContext.totalRiders,
                beatPredictionBy: raceContext.beatPredictionBy,
                worseThanPredictionBy: raceContext.worseThanPredictionBy,
                winMargin: raceContext.winMargin,
                lossMargin: raceContext.lossMargin,
                rivalEncounter: raceContext.rivalEncounter,
                rivalName: raceContext.rivalName
            },

            // Question asked
            question: {
                questionId: interviewData.questionId,
                text: interviewData.questionText
            },

            // All response options shown
            responseOptions: interviewData.responseOptions,

            // User's selected response
            selectedResponse: {
                id: selectedResponse.id,
                text: selectedResponse.text,
                style: selectedResponse.style,
                badge: selectedResponse.badge
            },

            // Personality changes
            personalityDelta: selectedResponse.personalityImpact,
            personalityBefore: currentPersonality,
            personalityAfter: newPersonality
        });

        // Update user personality and interview history
        const responseStyle = selectedResponse.style;
        await updateDoc(userDocRef, {
            personality: newPersonality,
            'interviewHistory.totalInterviews': increment(1),
            'interviewHistory.lastInterviewEventNumber': eventNumber,
            'interviewHistory.lastInterviewTimestamp': serverTimestamp(),
            [`interviewHistory.responsePatterns.${responseStyle}`]: increment(1)
        });

        console.log(`Interview saved for user ${userId}, event ${eventNumber}`);

        return {
            success: true,
            newPersonality: newPersonality,
            personalityDelta: selectedResponse.personalityImpact
        };

    } catch (error) {
        console.error('Error saving interview response:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get interview history for a user
 */
export async function getInterviewHistory(db, userId, limit = 10) {
    try {
        const interviewsRef = collection(db, 'interviews');
        const q = query(
            interviewsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limit)
        );

        const querySnapshot = await getDocs(q);

        const interviews = [];
        querySnapshot.forEach(doc => {
            interviews.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return interviews;
    } catch (error) {
        console.error('Error getting interview history:', error);
        return [];
    }
}

/**
 * Get personality statistics for display
 */
export function getPersonalityStats(personality) {
    return {
        confidence: Math.round(personality.confidence || 50),
        humility: Math.round(personality.humility || 50),
        aggression: Math.round(personality.aggression || 50),
        professionalism: Math.round(personality.professionalism || 50),
        showmanship: Math.round(personality.showmanship || 50),
        resilience: Math.round(personality.resilience || 50)
    };
}

/**
 * Format personality change for display
 */
export function formatPersonalityChange(trait, value) {
    const sign = value > 0 ? '+' : '';
    const emoji = value > 0 ? '📈' : '📉';
    const traitLabel = trait.charAt(0).toUpperCase() + trait.slice(1);

    return {
        trait: traitLabel,
        value: `${sign}${value}`,
        emoji: emoji,
        isPositive: value > 0
    };
}
