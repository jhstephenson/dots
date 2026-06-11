# Implementation Plan - Firebase Authentication Integration

We will integrate **Firebase Authentication** into the Dots & Boxes PWA. This will allow players to sign up, log in with an Email/Password or their Google Account, and play matches with their registered names. A "Play as Guest" bypass will also be provided to preserve offline capability and direct access for casual players.

---

## User Review Required

Please review the proposed design changes:

1. **Authentication Screens**: We will introduce a beautiful glassmorphism **Sign In / Sign Up** card overlay that appears when the game loads.
2. **Third-Party Login**: We will implement **Google Sign-In** using a popup redirect.
   > [!IMPORTANT]
   > For this to work, you must log in to your Firebase Console, navigate to **Build > Authentication > Sign-in method**, and enable **Email/Password** and **Google** as sign-in providers.
3. **Session Persistence**: Sessions will persist automatically (the browser remembers you are logged in). A "Sign Out" button will be added to the Main Menu.

---

## Proposed Changes

We will introduce a new script `auth.js` to decouple the Firebase SDK and authentication flow from the core gameplay loop.

### Core Architecture

We will make changes to the following files:
* [index.html](file:///c:/development/dots/index.html) - Import Firebase Compat SDKs, add the authentication overlay interface, and add Sign Out buttons.
* [style.css](file:///c:/development/dots/style.css) - Add styles for the sign-in forms, tab switcher, social login buttons, and sign-out buttons.
* [game.js](file:///c:/development/dots/game.js) - Adapt setup screens to receive Player 1 name/initials automatically from the authenticated profile.
* [auth.js](file:///c:/development/dots/auth.js) [NEW] - Handle Firebase App initialization, login/registration API triggers, Google popup redirects, and state changes.

---

### Component Specifications

#### [MODIFY] [index.html](file:///c:/development/dots/index.html)
* **SDK Imports**: Import Firebase Core and Auth modules via CDN (Compat library version 10.x).
* **Auth Screen Overlay (`#screen-auth`)**:
  * Tab layout: "Sign In" and "Sign Up".
  * Input forms: Email, Password, Name (for registrations).
  * Action Buttons: Primary "Login"/"Register", "Play as Guest" (secondary), and a dedicated "Sign In with Google" button with a custom vector Google logo.
  * Status messages indicator (for displaying error warnings like "Invalid password" or "Email already exists").
* **Main Menu Buttons**: Add a "Sign Out" link next to the player names once authenticated.

#### [MODIFY] [style.css](file:///c:/development/dots/style.css)
* **Auth Card Overlay Styles**:
  * Centered layout with standard glassmorphism rules.
  * Form inputs: styled border prompts, glowing focus outlines matching the Cyberpunk/Emerald themes.
  * Tab header switchers (animating active state borders).
  * Google Login button: White card layout with brand coloring and hover effects.
  * Sign Out buttons: Subtle link-style buttons with hover states.

#### [NEW] [auth.js](file:///c:/development/dots/auth.js)
* **Firebase Config**: Embed the configuration block provided by the user.
* **Initialization**: Initialize Firebase App and Auth modules.
* **Auth Functions**:
  * `loginWithEmail(email, password)`
  * `registerWithEmail(email, password, displayName)`
  * `loginWithGoogle()`
  * `logoutUser()`
* **State Listener**: Call `auth.onAuthStateChanged()`. When a session is loaded:
  * Cache player name in game state.
  * Update Player 1 Name input values in index.html to readonly/pre-filled.
  * Hide `#screen-auth` and transition to the Setup Screen.
  * If the user plays as a Guest, bypass the screen manually.

#### [MODIFY] [game.js](file:///c:/development/dots/game.js)
* Read authenticated user details if present when starting a match.
* Add support to enable/disable Player 1 Name input editing based on login state.

---

## Verification Plan

### Manual Verification
1. Load the PWA in your browser. It should show the Auth Overlay first.
2. Click "Play as Guest". It should dismiss the overlay and show the main menu. Click Sign Out to return.
3. Attempt to register an account with a test email. Verify the display name updates on the main menu.
4. Try to sign in with an incorrect password and confirm that a helpful warning message appears.
5. Click "Sign in with Google" and verify that a popup loads, signs you in, and populates your Google profile name/initial in the avatar.
