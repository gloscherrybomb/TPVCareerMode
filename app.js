// Import shared Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Make app and db visible globally
// admin-bots.js waits for `window.firebaseApp` before initializing.
// result-notifications.js needs access to `window.db` for saving viewed results.
window.firebaseApp = app;
window.db = db;

// Component loader for centralized navbar and footer
async function loadComponents() {
  // Load navbar
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  if (navbarPlaceholder) {
    try {
      const response = await fetch('components/navbar.html');
      if (response.ok) {
        navbarPlaceholder.outerHTML = await response.text();

        // Set active link based on current page
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        const activeLink = document.querySelector(`[data-page="${currentPage}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    } catch (error) {
      console.error('Error loading navbar:', error);
    }
  }

  // Load footer
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    try {
      const response = await fetch('components/footer.html');
      if (response.ok) {
        footerPlaceholder.outerHTML = await response.text();
      }
    } catch (error) {
      console.error('Error loading footer:', error);
    }
  }
}

// Load components first, then initialize everything
await loadComponents();

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
    // If user is already logged in, go to events page instead of opening modal
    if (auth.currentUser) {
      window.location.href = 'events.html';
    } else {
      openModal('signup');
    }
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

// Support Modal functionality
const supportModal = document.getElementById('supportModal');
const supportBtn = document.getElementById('supportBtn');
const supportModalOverlay = document.getElementById('supportModalOverlay');
const supportModalClose = document.getElementById('supportModalClose');
const kofiBtn = document.getElementById('kofiBtn');

async function openSupportModal() {
  if (supportModal) {
    supportModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Set Ko-fi link dynamically when modal opens
    const kofiButton = document.getElementById('kofiBtn');
    if (kofiButton && auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const tpvUid = userData.uid || 'Unknown';
          const userName = userData.name || 'Anonymous';
          const kofiMessage = encodeURIComponent(`TPV UID: ${tpvUid} | Name: ${userName}`);
          kofiButton.href = `https://ko-fi.com/jeastwood?message=${kofiMessage}`;
        }
      } catch (error) {
        console.error('Error setting Ko-fi link:', error);
        // Fallback: set basic link without user info
        kofiButton.href = 'https://ko-fi.com/jeastwood';
      }
    } else if (kofiButton) {
      // Fallback if no user logged in
      kofiButton.href = 'https://ko-fi.com/jeastwood';
    }
  }
}

function closeSupportModal() {
  if (supportModal) {
    supportModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

if (supportBtn) {
  supportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openSupportModal();
  });
}

if (supportModalOverlay) {
  supportModalOverlay.addEventListener('click', closeSupportModal);
}

if (supportModalClose) {
  supportModalClose.addEventListener('click', closeSupportModal);
}

// Safety click handler for Ko-fi button in case href wasn't set
if (kofiBtn) {
  kofiBtn.addEventListener('click', async (e) => {
    // If href is still "#", prevent default and handle manually
    if (kofiBtn.href.endsWith('#') || kofiBtn.href === '#') {
      e.preventDefault();

      // Try to build the URL
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const tpvUid = userData.uid || 'Unknown';
            const userName = userData.name || 'Anonymous';
            const kofiMessage = encodeURIComponent(`TPV UID: ${tpvUid} | Name: ${userName}`);
            window.open(`https://ko-fi.com/jeastwood?message=${kofiMessage}`, '_blank');
            return;
          }
        } catch (error) {
          console.error('Error getting user data for Ko-fi:', error);
        }
      }

      // Fallback: open Ko-fi without user info
      window.open('https://ko-fi.com/jeastwood', '_blank');
    }
    // If href is properly set, let the default <a> behavior handle it
  });
}

// Check for #support hash on page load to auto-open modal
if (window.location.hash === '#support') {
  // Wait a bit for auth to initialize
  setTimeout(() => {
    if (auth.currentUser) {
      openSupportModal();
    }
  }, 500);
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

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    console.log('Login attempt:', { email, rememberMe });

    try {
      // Set persistence based on Remember Me checkbox
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      console.log('Setting persistence:', persistence.type);
      await setPersistence(auth, persistence);

      console.log('Calling signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful! User:', userCredential.user.uid);

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

// Forgot Password link click handler
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('resetPasswordTab').classList.add('active');
  });
}

// Back to Login link handler
const backToLoginLink = document.getElementById('backToLoginLink');
if (backToLoginLink) {
  backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetPasswordTab').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
  });
}

// Reset Password form handler
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();

    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent! Check your inbox (and spam folder) for the reset link.');
      // Switch back to login tab
      document.getElementById('resetPasswordTab').classList.remove('active');
      document.getElementById('loginTab').classList.add('active');
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email. ';
      if (error.code === 'auth/user-not-found') {
        errorMessage += 'No account found with this email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += 'Too many requests. Please try again later.';
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
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // Validate UID format (15 or 16 hexadecimal characters)
    if (!/^[0-9A-F]{15,16}$/.test(uid)) {
      alert('Invalid UID format. Must be 15 or 16 hexadecimal characters (0-9, A-F).');
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
        totalPoints: 0,  // DEPRECATED: Use season1Points or careerPoints instead
        season1Points: 0,
        careerPoints: 0,
        createdAt: new Date()
      });

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
      // Check Remember Me checkbox (default to true if not found)
      const rememberMeCheckbox = document.getElementById('rememberMe');
      const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

      // Set persistence based on Remember Me checkbox
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists and has UID
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists() || !userDoc.data().uid) {
        // New Google user or existing user without UID - show UID modal
        // Note: Document will be created by event-sequence.js or profile.js fallback
        openUidModal();
      } else {
        // User has UID, proceed normally
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
      // Check Remember Me checkbox (default to true if not found)
      const rememberMeCheckbox = document.getElementById('rememberMe');
      const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

      // Set persistence based on Remember Me checkbox
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists and has UID
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists() || !userDoc.data().uid) {
        // New Google user or existing user without UID - show UID modal
        // Note: Document will be created by event-sequence.js or profile.js fallback
        openUidModal();
      } else {
        // User has UID, proceed normally
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
    if (!/^[0-9A-F]{15,16}$/.test(uid)) {
      alert('Invalid UID format. Must be 15 or 16 hexadecimal characters (0-9, A-F).');
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
          totalPoints: 0,  // DEPRECATED: Use season1Points or careerPoints instead
          season1Points: 0,
          careerPoints: 0,
          createdAt: new Date()
        });
      }

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
onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user (logged out)');

  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const supportBtn = document.getElementById('supportBtn');
  const ctaSection = document.getElementById('ctaSection');
  const loginPrompt = document.querySelector('.login-prompt');

  if (user) {
    // User is signed in
    if (loginBtn) {
      loginBtn.style.display = 'none';
    }
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-block';
    }
    if (ctaSection) {
      ctaSection.style.display = 'none'; // Hide signup CTA when logged in
    }
    if (loginPrompt) {
      loginPrompt.style.display = 'none';
    }

    // Check contributor status and set up Ko-fi link
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Hide support star for contributors (they've already donated)
        // Show it only for non-contributors
        if (supportBtn) {
          if (userData.isContributor) {
            supportBtn.style.display = 'none';
          } else {
            supportBtn.style.display = 'inline-block';
          }
        }

        // Set Ko-fi link with user's UID pre-filled (only needed for non-contributors)
        if (kofiBtn) {
          const tpvUid = userData.uid || 'Unknown';
          const userName = userData.name || 'Anonymous';
          const kofiMessage = encodeURIComponent(`TPV UID: ${tpvUid} | Name: ${userName}`);
          // Replace YOUR_KOFI_USERNAME with your actual Ko-fi username
          kofiBtn.href = `https://ko-fi.com/jeastwood?message=${kofiMessage}`;
        }

        // Check for new race results and show notification if any
        if (window.resultNotificationManager) {
          window.resultNotificationManager.checkForNewResults(user, userData);
        }
      }
    } catch (error) {
      console.error('Error checking contributor status:', error);
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
    if (supportBtn) {
      supportBtn.style.display = 'none';
    }
    if (ctaSection) {
      ctaSection.style.display = 'block'; // Show signup CTA when logged out
    }
    if (loginPrompt) {
      loginPrompt.style.display = 'block';
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
    const href = this.getAttribute('href');
    // Skip if href is not a valid anchor selector (e.g., just "#" or changed to full URL)
    if (!href || href === '#' || href.startsWith('http')) {
      return;
    }
    e.preventDefault();
    const target = document.querySelector(href);
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
