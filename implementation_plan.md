# Implementation Plan - Dots Game

We will build **Dots** (also known as Dots and Boxes), a highly polished, responsive, and interactive single-page web game. The game will feature single-player vs. Computer (AI) and two-player (Local pass-and-play) modes, customizable grid sizes, dynamic scoreboards, and instant-win conditions. To support publishing to the Apple App Store, Google Play Store, and Microsoft Store, we will structure it as a Progressive Web App (PWA) and provide clear instructions for packaging it using Capacitor and PWABuilder.

---

## User Review Required

Please review the proposed design and features:

1. **Aesthetics & Theme**: We propose a sleek, modern, glassmorphic dark mode theme with neon accents (customizable via theme selector).
2. **Grid Definition**: When the player selects a grid size (e.g., $10 \times 10$), does this refer to the number of **squares** ($10 \times 10$ squares, requiring $11 \times 11$ dots) or the number of **dots** ($10 \times 10$ dots, creating $9 \times 9$ squares)?
   > [!NOTE]
   > We will default to defining the grid by **squares** (e.g., selecting $5 \times 5$ creates $5 \times 5 = 25$ playable boxes) as this matches standard gameplay expectations, but this is customizable.
3. **AI Difficulty**: We will implement three levels of AI difficulty:
   - **Easy**: Makes random moves, occasionally misses completed boxes.
   - **Medium**: Captures boxes when available, avoids drawing the third line of a box if possible.
   - **Hard**: Uses heuristic chain-analysis to play tactically (e.g. double-cross strategies).
4. **App Stores Packaging**: We will include configuration files (manifest, service worker) and documentation on how to build and wrap the app for Apple App Store (via Capacitor/Xcode), Google Play Store (via Capacitor/Android Studio), and Microsoft Store (via PWABuilder).

---

## Proposed Changes

We will create a clean, vanilla HTML/CSS/JS codebase in the workspace. This avoids complex build setups and ensures the game loads instantly and is trivial to wrap in native webviews.

### Game Core & Architecture

We will organize the code into the following files:
* [index.html](file:///c:/development/dots/index.html) - The application structure, setup screen, game board, and game over overlay.
* [style.css](file:///c:/development/dots/style.css) - Custom styles, layout, glassmorphic elements, neon glow animations, and responsive designs.
* [game.js](file:///c:/development/dots/game.js) - Main game engine: turn management, board representation, win checking, and sound generation.
* [ai.js](file:///c:/development/dots/ai.js) - Computer player logic with customizable difficulties.
* [manifest.json](file:///c:/development/dots/manifest.json) & [sw.js](file:///c:/development/dots/sw.js) - Service worker and PWA manifest for desktop/mobile installations.
* [README.md](file:///c:/development/dots/README.md) - Complete instructions on local execution and compiling/packaging for iOS, Android, and Windows stores.

---

### Component Specifications

#### [NEW] [index.html](file:///c:/development/dots/index.html)
* **Setup Screen**:
  * Input fields for Player names.
  * Selector for game mode: `Player vs Player` or `Player vs Computer`.
  * Grid size configuration slider/inputs (range $2 \times 2$ to $12 \times 12$).
  * Theme selector (Cyberpunk Neon, Pastel Glow, Sleek Dark, Emerald Mint).
* **Game Screen**:
  * Status indicator showing whose turn it is.
  * Scoreboard showing player names, initials, scores, and active turn highlights.
  * Interactive Board: A container dynamically populated with dots, horizontal lines, vertical lines, and boxes.
  * Progress Bar: Visually tracks captured boxes against the total. Displays the "50% + 1" threshold mark representing the win condition.
* **Game Over Screen**:
  * Overlay showing the winner with confetti animations, final scores, and play again options.

#### [NEW] [style.css](file:///c:/development/dots/style.css)
* **Design Tokens**: Custom CSS properties for colors, shadows, fonts, and transitions.
* **Theme Styling**: Apply different classes to `<body>` to change variables.
* **Grid Rendering**: Use CSS Grid and flex layouts.
  * Dots: Circular buttons with subtle scale-up on hover.
  * Lines: Invisible/subtle borders that light up with player colors on hover, and freeze solid when clicked.
  * Boxes: Absolute centered text showing the player's initial, with a fade-in scale animation upon completion.
* **Animations**:
  * Turn indicator pulse.
  * Confetti/particle effects.
  * Line completion pop and Box capture flash.

#### [NEW] [game.js](file:///c:/development/dots/game.js)
* **Data Model**:
  * Grid size ($R \times C$ squares).
  * Lines array: track state (taken/free) of horizontal and vertical edges.
  * Boxes array: track state of each box (number of active edges, owner).
  * Player stats: names, initials, score, colors.
* **Turn Logic**:
  * Player clicks a line. If free, draw the line.
  * Check if drawing the line completes any squares (can be up to 2).
  * If square(s) completed:
    * Mark squares with owner's initial.
    * Add score.
    * Player keeps their turn.
    * Check if score is $> \text{Total Squares} / 2$. If so, trigger immediate win.
  * If no squares completed:
    * Toggle active player.
    * If next player is Computer, trigger `ai.js` move handler after a natural delay.

#### [NEW] [ai.js](file:///c:/development/dots/ai.js)
* Computes best move based on the board state.
* **Difficulties**:
  * **Easy**: Random legal moves.
  * **Medium**:
    * Priority 1: Complete any square that has 3 edges.
    * Priority 2: Select a line that does *not* create a 3rd edge on any box (to prevent opponent from scoring).
    * Priority 3: Random legal move.
  * **Hard**: Heuristic minimax / chain detection. It will search for moves that force the human player into giving up chains, or capture chains greedily while leaving minimal options.

#### [NEW] [manifest.json](file:///c:/development/dots/manifest.json) & [sw.js](file:///c:/development/dots/sw.js)
* standard manifest configuration detailing app name, start URL, theme colors, and icons.
* Offline caching using a simple Service Worker, ensuring the game runs without network access.

---

## Verification Plan

### Automated Verification
* Run local web server and open the app in modern browsers.
* Log game state, line clicks, and AI responses to verify rules compliance:
  - Correct initial displayed.
  - Multi-square completion on single click (e.g., middle line completes two boxes).
  - Extra turn granted only when square is completed.
  - Win condition triggered immediately when player scores $> \text{Total Squares} / 2$.
  - AI takes valid turns, displays "thinking" state, and completes squares when available.

### Manual Verification
* Test UI responsiveness across screen sizes (iPhone size, Android tablet, Desktop).
* Verify touch target sizing for mobile devices (dots/lines need to be easy to tap).
* Run lighthouse audit for performance and PWA compliance.
