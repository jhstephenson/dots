/* ==========================================================================
   DOTS & BOXES - FIREBASE AUTHENTICATION MODULE (auth.js)
   ========================================================================== */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAepZfjdVT06NKQMA466x4lkzTLp2AMDLw",
  authDomain: "scci-dots.firebaseapp.com",
  projectId: "scci-dots",
  storageBucket: "scci-dots.firebasestorage.app",
  messagingSenderId: "141165703390",
  appId: "1:141165703390:web:735e868aeb0219b159d24f",
  measurementId: "G-C8VJVQSHGN"
};

// Initialize Firebase compat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- STATE MANAGEMENT ---
let authMode = 'login'; // 'login' or 'register'
let isGuestMode = false;

// Statistics State
let statsState = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  ties: 0
};

// --- DOM ELEMENTS ---
const authElements = {
  screenAuth: document.getElementById('screen-auth'),
  tabLogin: document.getElementById('tab-login'),
  tabRegister: document.getElementById('tab-register'),
  errorBox: document.getElementById('auth-error-box'),
  errorMsg: document.getElementById('auth-error-msg'),
  form: document.getElementById('auth-form'),
  nameGroup: document.getElementById('auth-name-group'),
  nameInput: document.getElementById('auth-name'),
  emailInput: document.getElementById('auth-email'),
  passwordInput: document.getElementById('auth-password'),
  submitBtn: document.getElementById('btn-auth-submit'),
  googleBtn: document.getElementById('btn-auth-google'),
  guestBtn: document.getElementById('btn-auth-guest'),
  signOutLink: document.getElementById('link-p1-signout'),
  p1NameField: document.getElementById('p1-name'),
  statPlayed: document.getElementById('stat-played'),
  statWon: document.getElementById('stat-won'),
  statLost: document.getElementById('stat-lost'),
  statRatio: document.getElementById('stat-ratio'),
  statsSyncBadge: document.getElementById('stats-sync-badge')
};

// --- INITIALIZE AUTH UI & BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
  setupAuthEventListeners();
  monitorAuthState();
});

// --- EVENT LISTENERS ---
function setupAuthEventListeners() {
  // Tab Switcher - Sign In
  authElements.tabLogin.addEventListener('click', () => {
    switchTab('login');
  });

  // Tab Switcher - Sign Up
  authElements.tabRegister.addEventListener('click', () => {
    switchTab('register');
  });

  // Form Submit Handler
  authElements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    
    const email = authElements.emailInput.value.trim();
    const password = authElements.passwordInput.value;
    const name = authElements.nameInput.value.trim();
    
    // Play button click sound if synth available
    if (window.AudioSynth) window.AudioSynth.playClick();
    
    setLoadingState(true);

    if (authMode === 'login') {
      auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
          showError(getErrorMessage(err));
          setLoadingState(false);
        });
    } else {
      if (!name) {
        showError("Please enter a display name.");
        setLoadingState(false);
        return;
      }
      auth.createUserWithEmailAndPassword(email, password)
        .then(cred => {
          return cred.user.updateProfile({
            displayName: name
          });
        })
        .catch(err => {
          showError(getErrorMessage(err));
          setLoadingState(false);
        });
    }
  });

  // Google Login click
  authElements.googleBtn.addEventListener('click', () => {
    clearError();
    if (window.AudioSynth) window.AudioSynth.playClick();
    setLoadingState(true);

    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .catch(err => {
        // Only show error if the user didn't close the popup manually
        if (err.code !== 'auth/popup-closed-by-user') {
          showError(getErrorMessage(err));
        }
        setLoadingState(false);
      });
  });

  // Play as Guest click
  authElements.guestBtn.addEventListener('click', () => {
    if (window.AudioSynth) window.AudioSynth.playClick();
    enterGuestMode();
  });

  // Sign out click
  authElements.signOutLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.AudioSynth) window.AudioSynth.playClick();
    signOutUser();
  });
}

// --- AUTH INTERACTIONS ---
function switchTab(mode) {
  authMode = mode;
  clearError();
  
  if (mode === 'login') {
    authElements.tabLogin.classList.add('active');
    authElements.tabRegister.classList.remove('active');
    authElements.nameGroup.style.display = 'none';
    authElements.nameInput.removeAttribute('required');
    authElements.submitBtn.textContent = 'SIGN IN';
  } else {
    authElements.tabLogin.classList.remove('active');
    authElements.tabRegister.classList.add('active');
    authElements.nameGroup.style.display = 'flex';
    authElements.nameInput.setAttribute('required', 'required');
    authElements.submitBtn.textContent = 'REGISTER';
  }
}

function monitorAuthState() {
  auth.onAuthStateChanged(user => {
    setLoadingState(false);
    
    if (user) {
      isGuestMode = false;
      // Hide login overlay
      authElements.screenAuth.classList.remove('active');
      
      // Update UI fields
      const p1Name = user.displayName || user.email.split('@')[0];
      authElements.p1NameField.value = p1Name;
      authElements.p1NameField.readOnly = true;
      authElements.signOutLink.style.display = 'inline-block';
      
      // Load cloud stats
      loadCloudStats(user.uid);
      
      // Update local preview initial (trigger mock input event)
      if (typeof window.updateInitialPreview === 'function') {
        window.updateInitialPreview('p1');
      }
    } else {
      if (isGuestMode) {
        // Keep screen dismissed if in guest session
        authElements.screenAuth.classList.remove('active');
        authElements.p1NameField.value = 'Player 1';
        authElements.p1NameField.readOnly = false;
        authElements.signOutLink.style.display = 'none';
        
        loadLocalStats();
      } else {
        // Force login screen
        authElements.screenAuth.classList.add('active');
        authElements.p1NameField.value = 'Player 1';
        authElements.p1NameField.readOnly = false;
        authElements.signOutLink.style.display = 'none';
        
        resetStatsState();
        updateStatsUI(false);
      }
      
      if (typeof window.updateInitialPreview === 'function') {
        window.updateInitialPreview('p1');
      }
    }
  });
}

function enterGuestMode() {
  isGuestMode = true;
  authElements.screenAuth.classList.remove('active');
  authElements.p1NameField.value = 'Player 1';
  authElements.p1NameField.readOnly = false;
  authElements.signOutLink.style.display = 'none';
  
  loadLocalStats();
  
  if (typeof window.updateInitialPreview === 'function') {
    window.updateInitialPreview('p1');
  }
}

function signOutUser() {
  auth.signOut()
    .then(() => {
      isGuestMode = false;
      authElements.screenAuth.classList.add('active');
      // Reset form fields
      authElements.emailInput.value = '';
      authElements.passwordInput.value = '';
      authElements.nameInput.value = '';
      
      resetStatsState();
      updateStatsUI(false);
    });
}

// --- STATISTICS MANAGEMENT ---
const GUEST_STATS_KEY = 'dots_guest_stats';

function loadLocalStats() {
  const localData = localStorage.getItem(GUEST_STATS_KEY);
  if (localData) {
    try {
      statsState = JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse guest stats, resetting", e);
      resetStatsState();
    }
  } else {
    resetStatsState();
  }
  updateStatsUI(false);
}

function resetStatsState() {
  statsState = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    ties: 0
  };
}

function loadCloudStats(userId) {
  try {
    return db.collection('users').doc(userId).get()
      .then(doc => {
        if (doc.exists && doc.data().stats) {
          statsState = doc.data().stats;
        } else {
          // Create initial stats document if it doesn't exist
          resetStatsState();
          return db.collection('users').doc(userId).set({
            stats: statsState,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).then(() => statsState);
        }
        return statsState;
      })
      .then(stats => {
        updateStatsUI(true);
        // Check if we have guest stats to sync/merge
        syncGuestStats(userId);
      })
      .catch(err => {
        console.warn("Error loading cloud stats, falling back to local guest stats:", err);
        loadLocalStats();
      });
  } catch (err) {
    console.error("Synchronous error loading cloud stats:", err);
    loadLocalStats();
  }
}

function syncGuestStats(userId) {
  const localData = localStorage.getItem(GUEST_STATS_KEY);
  if (!localData) return;
  
  try {
    const guestStats = JSON.parse(localData);
    if (guestStats.gamesPlayed > 0) {
      // Merge guest stats into cloud stats
      statsState.gamesPlayed += guestStats.gamesPlayed;
      statsState.wins += guestStats.wins;
      statsState.losses += guestStats.losses;
      statsState.ties += guestStats.ties;
      
      // Update Cloud Firestore
      db.collection('users').doc(userId).set({
        stats: statsState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      .then(() => {
        // Clear local guest stats after successful merge
        localStorage.removeItem(GUEST_STATS_KEY);
        updateStatsUI(true);
        console.log("Guest statistics successfully merged and synced to cloud.");
      })
      .catch(err => {
        console.error("Failed to merge guest stats to cloud:", err);
      });
    } else {
      localStorage.removeItem(GUEST_STATS_KEY);
    }
  } catch (e) {
    console.error("Error merging guest stats:", e);
    localStorage.removeItem(GUEST_STATS_KEY);
  }
}

function updateStatsUI(isSynced) {
  if (authElements.statPlayed) authElements.statPlayed.textContent = statsState.gamesPlayed || 0;
  if (authElements.statWon) authElements.statWon.textContent = statsState.wins || 0;
  if (authElements.statLost) authElements.statLost.textContent = statsState.losses || 0;
  
  let winRate = 0;
  if (statsState.gamesPlayed > 0) {
    winRate = Math.round((statsState.wins / statsState.gamesPlayed) * 100);
  }
  if (authElements.statRatio) authElements.statRatio.textContent = `${winRate}%`;
  
  if (authElements.statsSyncBadge) {
    if (isSynced) {
      authElements.statsSyncBadge.textContent = 'Cloud Synced';
      authElements.statsSyncBadge.classList.add('synced');
    } else {
      authElements.statsSyncBadge.textContent = 'Local Only';
      authElements.statsSyncBadge.classList.remove('synced');
    }
  }
}

// Function called from game.js to record the result of a match
window.recordMatchOutcome = function(outcome) {
  statsState.gamesPlayed++;
  
  if (outcome.winner === 'tie') {
    statsState.ties++;
  } else if (outcome.winner === 1) {
    statsState.wins++;
  } else {
    statsState.losses++;
  }
  
  const currentUser = auth.currentUser;
  if (currentUser && !isGuestMode) {
    // Save to Firestore
    try {
      db.collection('users').doc(currentUser.uid).set({
        stats: statsState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      .then(() => {
        updateStatsUI(true);
      })
      .catch(err => {
        console.error("Error saving match outcome to Firestore:", err);
        // fallback save local
        localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(statsState));
        updateStatsUI(false);
      });
    } catch (err) {
      console.error("Synchronous error saving to Firestore, falling back to local:", err);
      localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(statsState));
      updateStatsUI(false);
    }
  } else {
    // Save to localStorage
    try {
      localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(statsState));
      updateStatsUI(false);
    } catch (err) {
      console.error("Error saving local stats:", err);
    }
  }
};


// --- UTILITY METHODS ---
function showError(msg) {
  authElements.errorMsg.textContent = msg;
  authElements.errorBox.style.display = 'block';
}

function clearError() {
  authElements.errorMsg.textContent = '';
  authElements.errorBox.style.display = 'none';
}

function setLoadingState(loading) {
  if (loading) {
    authElements.submitBtn.disabled = true;
    authElements.submitBtn.textContent = 'CONNECTING...';
    authElements.googleBtn.disabled = true;
    authElements.guestBtn.disabled = true;
  } else {
    authElements.submitBtn.disabled = false;
    authElements.submitBtn.textContent = authMode === 'login' ? 'SIGN IN' : 'REGISTER';
    authElements.googleBtn.disabled = false;
    authElements.guestBtn.disabled = false;
  }
}

function getErrorMessage(error) {
  switch (error.code) {
    case 'auth/invalid-email':
      return "The email address is badly formatted.";
    case 'auth/user-disabled':
      return "This account has been disabled.";
    case 'auth/user-not-found':
      return "No user found with this email.";
    case 'auth/wrong-password':
      return "Incorrect password. Please try again.";
    case 'auth/email-already-in-use':
      return "This email is already registered.";
    case 'auth/weak-password':
      return "Password should be at least 6 characters.";
    case 'auth/operation-not-allowed':
      return "Authentication method is disabled by developer.";
    case 'auth/popup-blocked':
      return "Google Sign-In popup was blocked by your browser. Please allow popups.";
    default:
      return error.message;
  }
}
