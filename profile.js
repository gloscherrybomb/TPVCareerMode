// Profile Page Logic for TPV Career Mode

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// Access eventData from global scope (loaded via script tag in HTML)

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDo-g0UhDCB8QWRXQ0iapVHQEgA4X7jt4o",
    authDomain: "careermodelogin.firebaseapp.com",
    projectId: "careermodelogin",
    storageBucket: "careermodelogin.firebasestorage.app",
    messagingSenderId: "599516805754",
    appId: "1:599516805754:web:7f5c6bbebb8b454a81d9c3",
    measurementId: "G-Y8BQ4F6H4V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let userData = null;
let userStats = null;

// Show/hide sections based on auth state
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
}

function showLoginPrompt() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
}

function showProfileContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
}

// Get user's initials for placeholder
function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
}

// Format time in seconds to hh:mm:ss
function formatTime(seconds) {
    if (!seconds || seconds === 'N/A') return 'N/A';
    
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Get ARR band from rating
function getARRBand(arr) {
    if (!arr || arr < 300) return 'Unranked';
    
    // Diamond: 1500-2000
    if (arr >= 1900) return 'Diamond 5';
    if (arr >= 1800) return 'Diamond 4';
    if (arr >= 1700) return 'Diamond 3';
    if (arr >= 1600) return 'Diamond 2';
    if (arr >= 1500) return 'Diamond 1';
    
    // Platinum: 1200-1499
    if (arr >= 1400) return 'Platinum 3';
    if (arr >= 1300) return 'Platinum 2';
    if (arr >= 1200) return 'Platinum 1';
    
    // Gold: 900-1199
    if (arr >= 1100) return 'Gold 3';
    if (arr >= 1000) return 'Gold 2';
    if (arr >= 900) return 'Gold 1';
    
    // Silver: 600-899
    if (arr >= 800) return 'Silver 3';
    if (arr >= 700) return 'Silver 2';
    if (arr >= 600) return 'Silver 1';
    
    // Bronze: 300-599
    if (arr >= 500) return 'Bronze 3';
    if (arr >= 400) return 'Bronze 2';
    if (arr >= 300) return 'Bronze 1';
    
    return 'Unranked';
}

// Calculate user statistics from race results
async function calculateUserStats(userUID) {
    console.log('Calculating stats for user:', userUID);
    
    const stats = {
        totalRaces: 0,
        totalWins: 0,
        totalPodiums: 0,
        totalPoints: 0,
        positions: [],
        recentResults: [],
        bestFinish: null,
        arr: null
    };
    
    // Fetch all results for this user from all events
    const eventCount = 9; // Assuming 9 events per season for now
    const season = 1;
    
    for (let eventNum = 1; eventNum <= eventCount; eventNum++) {
        const resultDocId = `season${season}_event${eventNum}`;
        
        try {
            const resultDoc = await getDoc(doc(db, 'results', resultDocId));
            
            if (resultDoc.exists()) {
                const resultData = resultDoc.data();
                const results = resultData.results || [];
                
                // Find user's result in this event
                const userResult = results.find(r => r.uid === userUID);
                
                if (userResult) {
                    stats.totalRaces++;
                    stats.totalPoints += userResult.points || 0;
                    
                    const position = userResult.position || 0;
                    if (position > 0) {
                        stats.positions.push(position);
                        
                        if (position === 1) stats.totalWins++;
                        if (position <= 3) stats.totalPodiums++;
                        
                        if (!stats.bestFinish || position < stats.bestFinish) {
                            stats.bestFinish = position;
                        }
                    }
                    
                    // Store ARR if available
                    if (userResult.arr && !stats.arr) {
                        stats.arr = userResult.arr;
                    }
                    
                    // Add to recent results
                    stats.recentResults.push({
                        eventNum: eventNum,
                        eventName: window.eventData?.[eventNum]?.name || `Event ${eventNum}`,
                        position: position,
                        time: userResult.time || 'N/A',
                        points: userResult.points || 0,
                        date: resultData.processedAt
                    });
                }
            }
        } catch (error) {
            console.log(`No results for event ${eventNum}`);
        }
    }
    
    // Sort recent results by event number (descending)
    stats.recentResults.sort((a, b) => b.eventNum - a.eventNum);
    
    // Calculate average finish
    if (stats.positions.length > 0) {
        const sum = stats.positions.reduce((a, b) => a + b, 0);
        stats.avgFinish = Math.round(sum / stats.positions.length);
    }
    
    // Calculate rates
    if (stats.totalRaces > 0) {
        stats.winRate = ((stats.totalWins / stats.totalRaces) * 100).toFixed(0);
        stats.podiumRate = ((stats.totalPodiums / stats.totalRaces) * 100).toFixed(0);
    } else {
        stats.winRate = 0;
        stats.podiumRate = 0;
    }
    
    console.log('Stats calculated:', stats);
    return stats;
}

// Calculate season ranking
async function calculateSeasonRanking(userUID) {
    console.log('Calculating season ranking for user:', userUID);
    
    // Get all riders' points from results
    const riderPoints = {};
    const eventCount = 9;
    const season = 1;
    
    for (let eventNum = 1; eventNum <= eventCount; eventNum++) {
        const resultDocId = `season${season}_event${eventNum}`;
        
        try {
            const resultDoc = await getDoc(doc(db, 'results', resultDocId));
            
            if (resultDoc.exists()) {
                const resultData = resultDoc.data();
                const results = resultData.results || [];
                
                results.forEach(result => {
                    const uid = result.uid;
                    const points = result.points || 0;
                    
                    if (!riderPoints[uid]) {
                        riderPoints[uid] = 0;
                    }
                    riderPoints[uid] += points;
                });
            }
        } catch (error) {
            console.log(`No results for event ${eventNum}`);
        }
    }
    
    // Sort riders by points
    const sortedRiders = Object.entries(riderPoints)
        .sort((a, b) => b[1] - a[1]);
    
    // Find user's rank
    const userRank = sortedRiders.findIndex(([uid]) => uid === userUID) + 1;
    const totalRiders = sortedRiders.length;
    
    return {
        rank: userRank > 0 ? userRank : null,
        total: totalRiders
    };
}

// Calculate global ranking (from user documents)
async function calculateGlobalRanking(userUID) {
    console.log('Calculating global ranking for user:', userUID);
    
    try {
        // Get all users and their total points
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                uid: doc.id,
                points: data.totalPoints || 0
            });
        });
        
        // Sort by points
        users.sort((a, b) => b.points - a.points);
        
        // Find user's rank
        const userRank = users.findIndex(u => u.uid === userUID) + 1;
        
        return {
            rank: userRank > 0 ? userRank : null,
            total: users.length
        };
    } catch (error) {
        console.error('Error calculating global ranking:', error);
        return { rank: null, total: 0 };
    }
}

// Load and display profile data
async function loadProfile(user) {
    showLoadingState();
    
    try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            console.error('User document not found');
            showLoginPrompt();
            return;
        }
        
        userData = userDoc.data();
        
        // Calculate stats from race results
        userStats = await calculateUserStats(userData.uid);
        
        // Calculate rankings
        const seasonRanking = await calculateSeasonRanking(userData.uid);
        const globalRanking = await calculateGlobalRanking(user.uid);
        
        // Display profile information
        displayProfileInfo(user, userData, userStats, seasonRanking, globalRanking);
        
        showProfileContent();
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile. Please try again.');
        showLoadingState();
    }
}

// Display profile information
function displayProfileInfo(user, userData, stats, seasonRanking, globalRanking) {
    // Profile header
    document.getElementById('profileName').textContent = userData.name || user.displayName || 'Unknown';
    document.getElementById('profileUID').textContent = userData.uid || 'No UID';
    document.getElementById('profileTeam').textContent = userData.team || 'No Team';
    
    // Category/Band
    const arrBand = stats.arr ? getARRBand(stats.arr) : 'Unranked';
    document.getElementById('profileCategory').textContent = arrBand;
    
    // Profile photo
    const profilePhoto = document.getElementById('profilePhoto');
    const profilePlaceholder = document.querySelector('.profile-photo-placeholder');
    const initialsSpan = document.getElementById('profileInitials');
    
    initialsSpan.textContent = getInitials(userData.name || user.displayName);
    
    if (userData.photoURL) {
        profilePhoto.src = userData.photoURL;
        profilePhoto.classList.add('active');
        profilePlaceholder.classList.add('hide');
    } else {
        profilePhoto.classList.remove('active');
        profilePlaceholder.classList.remove('hide');
    }
    
    // Quick stats
    document.getElementById('totalRaces').textContent = stats.totalRaces;
    document.getElementById('totalWins').textContent = stats.totalWins;
    document.getElementById('totalPodiums').textContent = stats.totalPodiums;
    document.getElementById('totalPoints').textContent = stats.totalPoints;
    
    // Career stats
    if (seasonRanking.rank) {
        document.getElementById('seasonRank').textContent = `#${seasonRanking.rank} / ${seasonRanking.total}`;
    } else {
        document.getElementById('seasonRank').textContent = 'Unranked';
    }
    
    if (globalRanking.rank) {
        document.getElementById('globalRank').textContent = `#${globalRanking.rank} / ${globalRanking.total}`;
    } else {
        document.getElementById('globalRank').textContent = 'Unranked';
    }
    
    document.getElementById('arrRating').textContent = stats.arr ? stats.arr : 'N/A';
    document.getElementById('avgFinish').textContent = stats.avgFinish ? `${stats.avgFinish}th` : 'N/A';
    document.getElementById('winRate').textContent = `${stats.winRate}%`;
    document.getElementById('podiumRate').textContent = `${stats.podiumRate}%`;
    
    // Recent results
    displayRecentResults(stats.recentResults);
    
    // Career progress
    const currentStage = userData.currentStage || 1;
    const completedEvents = (userData.completedStages || []).length + (userData.completedOptionalEvents || []).length;
    const totalEvents = 9; // Adjust based on your stage structure
    
    document.getElementById('currentStage').textContent = `Stage ${currentStage}`;
    document.getElementById('completedEvents').textContent = completedEvents;
    
    const progressPercent = (completedEvents / totalEvents) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    
    // Awards (placeholder for future)
    displayAwards([]);
}

// Display recent results
function displayRecentResults(results) {
    const container = document.getElementById('recentResults');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="results-empty">
                <div class="results-empty-icon">🚴</div>
                <p>No race results yet. Complete your first event!</p>
            </div>
        `;
        return;
    }
    
    // Show only the 5 most recent results
    const recentResults = results.slice(0, 5);
    
    let html = '';
    recentResults.forEach(result => {
        const isPodium = result.position <= 3;
        const positionClass = isPodium ? 'podium' : '';
        
        // Format date properly - handle Firestore Timestamp
        let formattedDate = 'Unknown date';
        if (result.date) {
            try {
                // Check if it's a Firestore Timestamp object with seconds property
                if (result.date.seconds) {
                    const date = new Date(result.date.seconds * 1000);
                    formattedDate = date.toLocaleDateString();
                } else if (result.date.toDate) {
                    // If it has a toDate method (Firestore Timestamp)
                    formattedDate = result.date.toDate().toLocaleDateString();
                } else {
                    // Try to parse as regular date
                    formattedDate = new Date(result.date).toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting date:', e);
                formattedDate = 'Unknown date';
            }
        }
        
        html += `
            <a href="event-detail.html?id=${result.eventNum}" class="result-card-link">
                <div class="result-card">
                    <div class="result-position ${positionClass}">${result.position}</div>
                    <div class="result-info">
                        <div class="result-event">${result.eventName}</div>
                        <div class="result-date">${formattedDate}</div>
                    </div>
                    <div class="result-time">${formatTime(result.time)}</div>
                    <div class="result-points">+${result.points}</div>
                </div>
            </a>
        `;
    });
    
    container.innerHTML = html;
}

// Display awards (placeholder for future implementation)
function displayAwards(awards) {
    const container = document.getElementById('awardsContainer');
    
    if (awards.length === 0) {
        container.innerHTML = `
            <div class="awards-empty">
                <div class="awards-empty-icon">🏅</div>
                <p>No awards yet. Keep racing to earn achievements!</p>
            </div>
        `;
        return;
    }
    
    // Future: render award cards here
    let html = '';
    awards.forEach(award => {
        html += `
            <div class="award-card">
                <div class="award-icon">${award.icon}</div>
                <div class="award-title">${award.title}</div>
                <div class="award-description">${award.description}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Handle photo upload
async function handlePhotoUpload(file) {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }
    
    try {
        showLoadingState();
        
        // Create a reference to the storage location
        const storageRef = ref(storage, `profile-photos/${currentUser.uid}`);
        
        // Upload the file
        await uploadBytes(storageRef, file);
        
        // Get the download URL
        const photoURL = await getDownloadURL(storageRef);
        
        // Update user document in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: photoURL
        });
        
        // Reload profile to show new photo
        await loadProfile(currentUser);
        
        alert('Profile photo updated successfully!');
    } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Error uploading photo. Please try again.');
        showProfileContent();
    }
}

// Initialize photo upload functionality
function initPhotoUpload() {
    const uploadBtn = document.getElementById('uploadPhotoBtn');
    const fileInput = document.getElementById('photoUpload');
    
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handlePhotoUpload(file);
        }
    });
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        await loadProfile(user);
    } else {
        showLoginPrompt();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initPhotoUpload();
});
