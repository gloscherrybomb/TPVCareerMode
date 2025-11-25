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

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, query, collection, where, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Modal functionality
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const getStartedBtn = document.getElementById('getStartedBtn');
const ctaSignupBtn = document.getElementById('ctaSignupBtn');

// Modal tabs
const modalTabs = document.querySelectorAll('.modal-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Open modal
function openModal(tab = 'login') {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Switch to specified tab
    modalTabs.forEach(t => {
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    
    tabContents.forEach(content => {
        if (content.id === tab + 'Tab') {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Close modal
function closeModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Event listeners for opening modal
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('login');
    });
}

if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        openModal('signup');
    });
}

if (ctaSignupBtn) {
    ctaSignupBtn.addEventListener('click', () => {
        openModal('signup');
    });
}

// Event listeners for closing modal
if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            alert('You have been logged out successfully.');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + error.message);
        }
    });
}

// UID Modal functionality
const uidModal = document.getElementById('uidModal');
const uidModalOverlay = document.getElementById('uidModalOverlay');

function openUidModal() {
    if (uidModal) {
        uidModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeUidModal() {
    if (uidModal) {
        uidModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

if (uidModalOverlay) {
    uidModalOverlay.addEventListener('click', (e) => {
        // Prevent closing on overlay click for UID modal (required field)
        e.stopPropagation();
    });
}

// Tab switching
modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        modalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        tabContents.forEach(content => {
            if (content.id === tabName + 'Tab') {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    });
});

// Mobile navigation
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
}

// Close mobile nav when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768 && !link.classList.contains('nav-login')) {
            navLinks.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
});

// Authentication functions
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('User logged in:', userCredential.user);
            
            closeModal();
            
            // Redirect to events page
            window.location.href = 'events.html';
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. ';
            if (error.code === 'auth/user-not-found') {
                errorMessage += 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Invalid email address.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage += 'Invalid email or password.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const uid = document.getElementById('signupUID').value.toUpperCase();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        // Validate UID format (16 hexadecimal characters)
        if (!/^[0-9A-F]{16}$/.test(uid)) {
            alert('Invalid UID format. Must be exactly 16 hexadecimal characters (0-9, A-F).');
            return;
        }
        
        try {
            // Check if UID is already claimed by another user
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                alert('This UID is already claimed by another user. Each UID can only be registered once.');
                return;
            }
            
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create user profile in Firestore with UID
            await setDoc(doc(db, 'users', user.uid), {
                name: name,
                uid: uid,
                email: email,
                currentStage: 1,
                completedStages: [],
                completedOptionalEvents: [],
                choiceSelections: {},
                totalPoints: 0,
                createdAt: new Date()
            });
            
            console.log('User created:', user.uid);
            alert('Account created successfully! Welcome to TPV Career Mode.');
            closeModal();
            
            // Redirect to events page
            window.location.href = 'events.html';
        } catch (error) {
            console.error('Signup error:', error);
            
            let errorMessage = 'Sign up failed. ';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage += 'This email is already registered.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage += 'Password should be at least 6 characters.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        }
    });
}

// Google Sign-In
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Check if user document exists and has UID
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists() || !userDoc.data().uid) {
                // New Google user or existing user without UID - show UID modal
                openUidModal();
            } else {
                // User has UID, proceed normally
                console.log('Google user logged in:', user.uid);
                closeModal();
                window.location.href = 'events.html';
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            
            let errorMessage = 'Google sign-in failed. ';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage += 'Sign-in popup was closed.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage += 'Another sign-in popup is already open.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        }
    });
}

// Google Sign-Up (same logic as login)
const googleSignupBtn = document.getElementById('googleSignupBtn');
if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Check if user document exists and has UID
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists() || !userDoc.data().uid) {
                // New Google user or existing user without UID - show UID modal
                openUidModal();
            } else {
                // User has UID, proceed normally
                console.log('Google user signed up:', user.uid);
                closeModal();
                window.location.href = 'events.html';
            }
        } catch (error) {
            console.error('Google sign-up error:', error);
            
            let errorMessage = 'Google sign-up failed. ';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage += 'Sign-up popup was closed.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage += 'Another sign-up popup is already open.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        }
    });
}

// UID Form for Google users
const uidForm = document.getElementById('uidForm');
if (uidForm) {
    uidForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const uid = document.getElementById('googleUID').value.toUpperCase();
        
        // Validate UID format
        if (!/^[0-9A-F]{16}$/.test(uid)) {
            alert('Invalid UID format. Must be exactly 16 hexadecimal characters (0-9, A-F).');
            return;
        }
        
        try {
            // Check if UID is already claimed
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                alert('This UID is already claimed by another user. Each UID can only be registered once.');
                return;
            }
            
            const user = auth.currentUser;
            if (!user) {
                alert('Error: No user is currently logged in.');
                return;
            }
            
            // Check if user document exists
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists()) {
                // Update existing document
                await updateDoc(doc(db, 'users', user.uid), {
                    uid: uid
                });
            } else {
                // Create new user document
                await setDoc(doc(db, 'users', user.uid), {
                    name: user.displayName || 'Google User',
                    uid: uid,
                    email: user.email,
                    currentStage: 1,
                    completedStages: [],
                    completedOptionalEvents: [],
                    choiceSelections: {},
                    totalPoints: 0,
                    createdAt: new Date()
                });
            }
            
            console.log('UID saved for Google user:', user.uid);
            alert('UID saved successfully! Welcome to TPV Career Mode.');
            closeUidModal();
            closeModal();
            window.location.href = 'events.html';
        } catch (error) {
            console.error('Error saving UID:', error);
            alert('Error saving UID: ' + error.message);
        }
    });
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (user) {
        // User is signed in
        if (loginBtn) {
            loginBtn.style.display = 'none';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
    } else {
        // User is signed out
        if (loginBtn) {
            loginBtn.style.display = 'inline-block';
            loginBtn.textContent = 'Login';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
    }
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.stage-card, .feature-card').forEach(el => {
    observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active state to nav on scroll
let currentSection = '';
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
});

// Export functions for use in other pages
window.careerMode = {
    openModal,
    closeModal
};
