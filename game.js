/* ==========================================================================
   DOTS & BOXES - GAME ENGINE (game.js)
   ========================================================================== */

// --- GLOBAL GAME STATE ---
const state = {
  gameMode: 'ai',        // 'ai' or 'local'
  difficulty: 'medium',   // 'easy', 'medium', 'hard'
  theme: 'cyberpunk',     // 'cyberpunk', 'emerald', 'sunset', 'dream'
  appearance: 'dark',     // 'dark' or 'light'
  gridRows: 5,           // Number of square rows
  gridCols: 5,           // Number of square columns
  currentPlayer: 1,      // 1 = Player 1, 2 = Player 2 / Computer
  isGameOver: false,
  isAiThinking: false,
  soundEnabled: true,
  
  // Players configurations
  p1: { name: 'Player 1', initial: 'P', score: 0, colorClass: 'p1-line', fillClass: 'captured-p1' },
  p2: { name: 'Computer', initial: 'C', score: 0, colorClass: 'p2-line', fillClass: 'captured-p2' },
  
  // Board representations
  lines: {}, // Key: 'h_r_c' or 'v_r_c', Value: null | 1 | 2
  boxes: []  // 2D Array of boxes: { r, c, linesCount, capturedBy }
};

// --- AUDIO SYNTHESIZER (Web Audio API) ---
const AudioSynth = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security policies)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playTone(frequency, type, duration, startTime = 0) {
    if (!state.soundEnabled) return;
    this.init();
    
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime + startTime);

      // Volume envelope: smooth fade out to avoid clicks
      gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {
      console.warn("Audio Context playback failed: ", e);
    }
  },

  playClick() {
    this.playTone(800, 'sine', 0.05);
  },

  playDrawLine() {
    this.playTone(600, 'triangle', 0.1);
  },

  playCaptureBox() {
    this.playTone(523.25, 'sine', 0.15); // C5
    this.playTone(659.25, 'sine', 0.25, 0.08); // E5
  },

  playGameOverWin() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50];
    notes.forEach((freq, index) => {
      this.playTone(freq, 'triangle', 0.3, index * 0.08);
    });
  },

  playGameOverLose() {
    const notes = [392.00, 311.13, 261.63, 196.00];
    notes.forEach((freq, index) => {
      this.playTone(freq, 'sawtooth', 0.4, index * 0.12);
    });
  }
};

// --- DOM ELEMENTS ---
const elements = {
  // Screens
  screenSetup: document.getElementById('screen-setup'),
  screenGame: document.getElementById('screen-game'),
  screenGameOver: document.getElementById('screen-gameover'),
  
  // Setup inputs
  btnModeAi: document.getElementById('btn-mode-ai'),
  btnModeLocal: document.getElementById('btn-mode-local'),
  p1NameInput: document.getElementById('p1-name'),
  p1InitialPreview: document.getElementById('p1-initial-preview'),
  p2NameInput: document.getElementById('p2-name'),
  p2InitialPreview: document.getElementById('p2-initial-preview'),
  p2NameLabel: document.getElementById('p2-name-label'),
  p2SettingsGroup: document.getElementById('p2-settings-group'),
  difficultyGroup: document.getElementById('difficulty-group'),
  gridRowsSlider: document.getElementById('grid-rows-slider'),
  gridRowsDisplay: document.getElementById('grid-rows-display'),
  gridColsSlider: document.getElementById('grid-cols-slider'),
  gridColsDisplay: document.getElementById('grid-cols-display'),
  gridDimensionsHint: document.getElementById('grid-dimensions-hint'),
  btnStart: document.getElementById('btn-start'),
  themeButtons: document.querySelectorAll('.theme-btn'),
  diffButtons: document.querySelectorAll('.diff-btn'),
  btnAppearanceToggle: document.getElementById('btn-appearance-toggle'),
  
  // Game Play details
  btnGameBack: document.getElementById('btn-game-back'),
  btnGameThemeToggle: document.getElementById('btn-game-theme-toggle'),
  btnGameSound: document.getElementById('btn-game-sound'),
  btnGameRestart: document.getElementById('btn-game-restart'),
  difficultyBadge: document.getElementById('game-difficulty-badge'),
  
  // Scores
  scoreP1Card: document.getElementById('score-p1-card'),
  scoreP2Card: document.getElementById('score-p2-card'),
  p1AvatarText: document.getElementById('p1-avatar-text'),
  p2AvatarText: document.getElementById('p2-avatar-text'),
  p1AvatarBg: document.getElementById('p1-avatar-bg'),
  p2AvatarBg: document.getElementById('p2-avatar-bg'),
  gameP1Name: document.getElementById('game-p1-name'),
  gameP2Name: document.getElementById('game-p2-name'),
  gameP1Score: document.getElementById('game-p1-score'),
  gameP2Score: document.getElementById('game-p2-score'),
  
  // Turn indicator / Progress
  turnBanner: document.getElementById('turn-banner'),
  turnSpinner: document.getElementById('turn-spinner'),
  turnText: document.getElementById('turn-text'),
  progressP1Label: document.getElementById('progress-p1-label'),
  progressP2Label: document.getElementById('progress-p2-label'),
  progressFillP1: document.getElementById('progress-fill-p1'),
  progressFillP2: document.getElementById('progress-fill-p2'),
  winThresholdNum: document.getElementById('win-threshold-num'),
  
  // Board
  gameBoard: document.getElementById('game-board'),
  
  // Game over overlay details
  winnerAnnouncement: document.getElementById('winner-announcement'),
  winnerSubtext: document.getElementById('winner-subtext'),
  statsP1Name: document.getElementById('stats-p1-name'),
  statsP2Name: document.getElementById('stats-p2-name'),
  statsP1Result: document.getElementById('stats-p1-result'),
  statsP2Result: document.getElementById('stats-p2-result'),
  btnReplay: document.getElementById('btn-gameover-replay'),
  btnMenu: document.getElementById('btn-gameover-menu')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  const savedAppearance = localStorage.getItem('dots-appearance');
  if (savedAppearance) {
    state.appearance = savedAppearance;
  }
  
  setupEventListeners();
  updateSetupUI();
  applyAppearance();
  window.addEventListener('resize', resizeGameBoard);
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Game Mode Selection
  elements.btnModeAi.addEventListener('click', () => setGameMode('ai'));
  elements.btnModeLocal.addEventListener('click', () => setGameMode('local'));
  
  // Player Names Initials Previews
  elements.p1NameInput.addEventListener('input', () => updateInitialPreview('p1'));
  elements.p2NameInput.addEventListener('input', () => updateInitialPreview('p2'));
  
  // Difficulty Selection
  elements.diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.diff;
      AudioSynth.playClick();
    });
  });

  // Theme Picker Selection
  elements.themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setTheme(btn.dataset.theme);
      AudioSynth.playClick();
    });
  });
  
  // Grid size slider changes
  elements.gridRowsSlider.addEventListener('input', (e) => {
    state.gridRows = parseInt(e.target.value);
    updateGridSizeDisplay();
  });

  elements.gridColsSlider.addEventListener('input', (e) => {
    state.gridCols = parseInt(e.target.value);
    updateGridSizeDisplay();
  });
  
  // Start Match button
  elements.btnStart.addEventListener('click', () => {
    AudioSynth.playClick();
    startMatch();
  });
  
  // In-game: Back button
  elements.btnGameBack.addEventListener('click', () => {
    AudioSynth.playClick();
    showScreen('setup');
  });

  // In-game: Sound Toggle
  elements.btnGameSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    elements.btnGameSound.textContent = state.soundEnabled ? '🔊' : '🔇';
    if (state.soundEnabled) {
      AudioSynth.init();
      AudioSynth.playClick();
    }
  });

  // In-game: Restart Match
  elements.btnGameRestart.addEventListener('click', () => {
    AudioSynth.playClick();
    startMatch();
  });
  
  // Game Over: Play Again
  elements.btnReplay.addEventListener('click', () => {
    AudioSynth.playClick();
    elements.screenGameOver.classList.remove('active');
    startMatch();
  });
  
  // Game Over: Return to Main Menu
  elements.btnMenu.addEventListener('click', () => {
    AudioSynth.playClick();
    elements.screenGameOver.classList.remove('active');
    showScreen('setup');
  });

  // Appearance toggle controls
  elements.btnAppearanceToggle.addEventListener('click', () => {
    toggleAppearance();
  });
  elements.btnGameThemeToggle.addEventListener('click', () => {
    toggleAppearance();
  });
}

// --- SETUP CONFIGURATIONS ---
function setGameMode(mode) {
  state.gameMode = mode;
  AudioSynth.playClick();
  
  if (mode === 'ai') {
    elements.btnModeAi.classList.add('active');
    elements.btnModeLocal.classList.remove('active');
    elements.p2NameLabel.textContent = 'Computer Name';
    elements.p2NameInput.value = 'Computer';
    elements.difficultyGroup.style.display = 'flex';
  } else {
    elements.btnModeAi.classList.remove('active');
    elements.btnModeLocal.classList.add('active');
    elements.p2NameLabel.textContent = 'Player 2 Name';
    elements.p2NameInput.value = 'Player 2';
    elements.difficultyGroup.style.display = 'none';
  }
  updateInitialPreview('p2');
}

function updateInitialPreview(player) {
  if (player === 'p1') {
    const text = elements.p1NameInput.value.trim();
    const initial = getInitial(text, 'P');
    elements.p1InitialPreview.textContent = initial;
  } else {
    const text = elements.p2NameInput.value.trim();
    const initial = getInitial(text, state.gameMode === 'ai' ? 'C' : 'D');
    elements.p2InitialPreview.textContent = initial;
  }
}

function getInitial(name, fallback) {
  if (!name) return fallback;
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!clean) return fallback;
  
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, Math.min(2, clean.length)).toUpperCase();
}

function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  state.theme = theme;
}

function updateGridSizeDisplay() {
  const R = state.gridRows;
  const C = state.gridCols;
  elements.gridRowsDisplay.textContent = `${R} Rows`;
  elements.gridColsDisplay.textContent = `${C} Columns`;
  
  const totalDots = (R + 1) * (C + 1);
  const totalBoxes = R * C;
  elements.gridDimensionsHint.textContent = `A ${R}×${C} grid contains ${totalBoxes} squares and requires ${totalDots} dots.`;
}

function updateSetupUI() {
  setGameMode(state.gameMode);
  setTheme(state.theme);
  updateGridSizeDisplay();
}

function toggleAppearance() {
  state.appearance = state.appearance === 'dark' ? 'light' : 'dark';
  localStorage.setItem('dots-appearance', state.appearance);
  applyAppearance();
  AudioSynth.playClick();
}

function applyAppearance() {
  const isLight = (state.appearance === 'light');
  if (isLight) {
    document.body.classList.add('mode-light');
    elements.btnAppearanceToggle.textContent = '☀️ Light Mode';
    elements.btnGameThemeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('mode-light');
    elements.btnAppearanceToggle.textContent = '🌙 Dark Mode';
    elements.btnGameThemeToggle.textContent = '🌙';
  }
}

function showScreen(screenId) {
  elements.screenSetup.classList.remove('active');
  elements.screenGame.classList.remove('active');
  
  if (screenId === 'setup') {
    elements.screenSetup.classList.add('active');
    document.body.classList.remove('turn-p1', 'turn-p2', 'turn-computer');
  } else if (screenId === 'game') {
    elements.screenGame.classList.add('active');
  }
}

// --- GAME ACTIONS ---
function startMatch() {
  showScreen('game');
  
  // Set players detail
  state.p1.name = elements.p1NameInput.value.trim() || 'Player 1';
  state.p1.initial = getInitial(state.p1.name, 'P');
  state.p1.score = 0;
  
  if (state.gameMode === 'ai') {
    state.p2.name = elements.p2NameInput.value.trim() || 'Computer';
    state.p2.initial = getInitial(state.p2.name, 'C');
    elements.difficultyBadge.style.display = 'inline-block';
    elements.difficultyBadge.textContent = `${state.difficulty} AI`;
  } else {
    state.p2.name = elements.p2NameInput.value.trim() || 'Player 2';
    state.p2.initial = getInitial(state.p2.name, 'D');
    elements.difficultyBadge.style.display = 'none';
  }
  state.p2.score = 0;
  
  // Display names and initials in game UI
  elements.gameP1Name.textContent = state.p1.name;
  elements.p1AvatarText.textContent = state.p1.initial;
  elements.gameP2Name.textContent = state.p2.name;
  elements.p2AvatarText.textContent = state.p2.initial;
  
  // Reset score cards
  elements.gameP1Score.textContent = '0';
  elements.gameP2Score.textContent = '0';
  
  // Reset state
  state.currentPlayer = 1;
  state.isGameOver = false;
  state.isAiThinking = false;
  state.lines = {};
  state.boxes = [];
  
  // Create boxes representation
  const R = state.gridRows;
  const C = state.gridCols;
  for (let r = 0; r < R; r++) {
    state.boxes[r] = [];
    for (let c = 0; c < C; c++) {
      state.boxes[r][c] = {
        r, c,
        linesCount: 0,
        capturedBy: null
      };
    }
  }
  
  // Set win threshold info
  const totalBoxes = R * C;
  const winThreshold = Math.floor(totalBoxes / 2) + 1;
  elements.winThresholdNum.textContent = winThreshold;
  
  // Initialize grid UI
  buildGameBoardDOM();
  resizeGameBoard();
  updateTurnDisplay();
  updateProgressBar();
}

function buildGameBoardDOM() {
  const R = state.gridRows;
  const C = state.gridCols;
  const board = elements.gameBoard;
  
  // Clear previous grid
  board.innerHTML = '';
  
  // Set aspect ratio dynamically so non-square layouts render perfectly proportioned
  board.style.aspectRatio = `${2 * C + 1} / ${2 * R + 1}`;
  
  // Setup CSS Grid sizing
  let colStyle = '';
  for (let i = 0; i < C; i++) {
    colStyle += '8px 1fr ';
  }
  colStyle += '8px';
  
  let rowStyle = '';
  for (let i = 0; i < R; i++) {
    rowStyle += '8px 1fr ';
  }
  rowStyle += '8px';
  
  board.style.gridTemplateColumns = colStyle;
  board.style.gridTemplateRows = rowStyle;
  
  // Draw all elements row by row
  for (let r = 0; r <= 2 * R; r++) {
    for (let c = 0; c <= 2 * C; c++) {
      const isEvenRow = (r % 2 === 0);
      const isEvenCol = (c % 2 === 0);
      
      if (isEvenRow && isEvenCol) {
        // --- DOT ---
        const dot = document.createElement('div');
        dot.className = 'board-dot';
        dot.dataset.r = r / 2;
        dot.dataset.c = c / 2;
        dot.id = `dot_${r/2}_${c/2}`;
        dot.style.gridRow = r + 1;
        dot.style.gridColumn = c + 1;
        board.appendChild(dot);
        
      } else if (isEvenRow && !isEvenCol) {
        // --- HORIZONTAL LINE ---
        const lineR = r / 2;
        const lineC = Math.floor(c / 2);
        const id = `h_${lineR}_${lineC}`;
        
        const line = document.createElement('div');
        line.className = 'board-line h-line';
        line.id = id;
        line.dataset.type = 'h';
        line.dataset.r = lineR;
        line.dataset.c = lineC;
        line.style.gridRow = r + 1;
        line.style.gridColumn = c + 1;
        
        line.addEventListener('click', () => handleLineClick(line));
        board.appendChild(line);
        
      } else if (!isEvenRow && isEvenCol) {
        // --- VERTICAL LINE ---
        const lineR = Math.floor(r / 2);
        const lineC = c / 2;
        const id = `v_${lineR}_${lineC}`;
        
        const line = document.createElement('div');
        line.className = 'board-line v-line';
        line.id = id;
        line.dataset.type = 'v';
        line.dataset.r = lineR;
        line.dataset.c = lineC;
        line.style.gridRow = r + 1;
        line.style.gridColumn = c + 1;
        
        line.addEventListener('click', () => handleLineClick(line));
        board.appendChild(line);
        
      } else {
        // --- BOX / SQUARE ---
        const boxR = Math.floor(r / 2);
        const boxC = Math.floor(c / 2);
        
        const box = document.createElement('div');
        box.className = 'board-box';
        box.id = `box_${boxR}_${boxC}`;
        box.style.gridRow = r + 1;
        box.style.gridColumn = c + 1;
        
        const text = document.createElement('span');
        text.className = 'board-box-initial';
        box.appendChild(text);
        
        board.appendChild(box);
      }
    }
  }
}

function resizeGameBoard() {
  const board = elements.gameBoard;
  if (!board) return;
  
  const R = state.gridRows;
  const C = state.gridCols;
  
  // Available width is based on the centered app-container (max 540px) minus structural padding (72px)
  const availableWidth = Math.min(540, window.innerWidth) - 72;
  
  // Available height is the viewport height minus standard budgets for scoreboards, controls, and headers (380px)
  const budget = 380;
  const availableHeight = Math.max(200, window.innerHeight - budget);
  
  const targetRatio = (2 * C + 1) / (2 * R + 1);
  
  let boardWidth, boardHeight;
  
  if (availableWidth / targetRatio <= availableHeight) {
    boardWidth = availableWidth;
    boardHeight = availableWidth / targetRatio;
  } else {
    boardHeight = availableHeight;
    boardWidth = availableHeight * targetRatio;
  }
  
  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
}

function handleLineClick(lineEl) {
  if (state.isGameOver) return;
  if (state.isAiThinking && state.currentPlayer === 2) return;
  if (lineEl.classList.contains('taken')) return;
  
  const type = lineEl.dataset.type;
  const r = parseInt(lineEl.dataset.r);
  const c = parseInt(lineEl.dataset.c);
  
  executeMove(type, r, c);
}

function executeMove(type, r, c) {
  const lineId = `${type}_${r}_${c}`;
  const p = state.currentPlayer;
  
  state.lines[lineId] = p;
  
  const lineEl = document.getElementById(lineId);
  if (lineEl) {
    lineEl.classList.add('taken', p === 1 ? 'p1-line' : 'p2-line', 'just-taken');
    setTimeout(() => lineEl.classList.remove('just-taken'), 350);
  }
  
  highlightDotsForLine(type, r, c);
  AudioSynth.playDrawLine();
  
  const boxesCompleted = checkBoxCompletion(type, r, c, p);
  
  if (boxesCompleted > 0) {
    AudioSynth.playCaptureBox();
    
    elements.gameP1Score.textContent = state.p1.score;
    elements.gameP2Score.textContent = state.p2.score;
    updateProgressBar();
    
    const totalBoxes = state.gridRows * state.gridCols;
    const winThreshold = Math.floor(totalBoxes / 2) + 1;
    
    if (state.p1.score >= winThreshold || state.p2.score >= winThreshold) {
      endGame();
      return;
    }
    
    let totalCaptured = state.p1.score + state.p2.score;
    if (totalCaptured === totalBoxes) {
      endGame();
      return;
    }
    
    updateTurnDisplay();
    
    if (state.gameMode === 'ai' && state.currentPlayer === 2) {
      triggerAiMove();
    }
  } else {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    updateTurnDisplay();
    
    if (state.gameMode === 'ai' && state.currentPlayer === 2) {
      triggerAiMove();
    }
  }
}

function highlightDotsForLine(type, r, c) {
  let dot1, dot2;
  if (type === 'h') {
    dot1 = document.getElementById(`dot_${r}_${c}`);
    dot2 = document.getElementById(`dot_${r}_${c+1}`);
  } else {
    dot1 = document.getElementById(`dot_${r}_${c}`);
    dot2 = document.getElementById(`dot_${r+1}_${c}`);
  }
  
  if (dot1) {
    dot1.classList.add('active');
    setTimeout(() => dot1.classList.remove('active'), 600);
  }
  if (dot2) {
    dot2.classList.add('active');
    setTimeout(() => dot2.classList.remove('active'), 600);
  }
}

function checkBoxCompletion(type, r, c, player) {
  let completedCount = 0;
  const R = state.gridRows;
  const C = state.gridCols;
  const listToUpdate = [];
  
  if (type === 'h') {
    if (r < R) {
      listToUpdate.push({ boxR: r, boxC: c });
    }
    if (r > 0) {
      listToUpdate.push({ boxR: r - 1, boxC: c });
    }
  } else {
    if (c < C) {
      listToUpdate.push({ boxR: r, boxC: c });
    }
    if (c > 0) {
      listToUpdate.push({ boxR: r, boxC: c - 1 });
    }
  }
  
  listToUpdate.forEach(({ boxR, boxC }) => {
    const box = state.boxes[boxR][boxC];
    box.linesCount++;
    
    if (box.linesCount === 4) {
      box.capturedBy = player;
      completedCount++;
      
      if (player === 1) {
        state.p1.score++;
      } else {
        state.p2.score++;
      }
      
      const boxEl = document.getElementById(`box_${boxR}_${boxC}`);
      if (boxEl) {
        boxEl.classList.add(player === 1 ? state.p1.fillClass : state.p2.fillClass, 'just-captured');
        const textEl = boxEl.querySelector('.board-box-initial');
        if (textEl) {
          textEl.textContent = player === 1 ? state.p1.initial : state.p2.initial;
        }
        setTimeout(() => boxEl.classList.remove('just-captured'), 450);
      }
    }
  });
  
  return completedCount;
}

function updateTurnDisplay() {
  const p = state.currentPlayer;
  const isComputer = (state.gameMode === 'ai' && p === 2);
  
  document.body.classList.remove('turn-p1', 'turn-p2', 'turn-computer');
  if (p === 1) {
    document.body.classList.add('turn-p1');
    elements.scoreP1Card.classList.add('active');
    elements.scoreP2Card.classList.remove('active');
    elements.turnText.textContent = `${state.p1.name}'s Turn`;
    elements.turnSpinner.classList.remove('visible');
  } else {
    document.body.classList.add('turn-p2');
    elements.scoreP1Card.classList.remove('active');
    elements.scoreP2Card.classList.add('active');
    
    if (isComputer) {
      document.body.classList.add('turn-computer');
      elements.turnText.textContent = `${state.p2.name} is thinking...`;
      elements.turnSpinner.classList.add('visible');
    } else {
      elements.turnText.textContent = `${state.p2.name}'s Turn`;
      elements.turnSpinner.classList.remove('visible');
    }
  }
}

function updateProgressBar() {
  const total = state.gridRows * state.gridCols;
  const p1Score = state.p1.score;
  const p2Score = state.p2.score;
  
  const p1Pct = total > 0 ? (p1Score / total) * 100 : 0;
  const p2Pct = total > 0 ? (p2Score / total) * 100 : 0;
  
  elements.progressFillP1.style.width = `${p1Pct}%`;
  elements.progressFillP2.style.width = `${p2Pct}%`;
  
  elements.progressP1Label.textContent = `${state.p1.initial}: ${p1Score} (${Math.round(p1Pct)}%)`;
  elements.progressP2Label.textContent = `${state.p2.initial}: ${p2Score} (${Math.round(p2Pct)}%)`;
}

function endGame() {
  state.isGameOver = true;
  document.body.classList.remove('turn-p1', 'turn-p2', 'turn-computer');
  elements.turnSpinner.classList.remove('visible');
  elements.scoreP1Card.classList.remove('active');
  elements.scoreP2Card.classList.remove('active');
  
  const total = state.gridRows * state.gridCols;
  const p1Score = state.p1.score;
  const p2Score = state.p2.score;
  
  let title = '';
  let sub = '';
  let player1Wins = p1Score > p2Score;
  let isTie = p1Score === p2Score;
  
  elements.statsP1Name.textContent = state.p1.name;
  elements.statsP2Name.textContent = state.p2.name;
  elements.statsP1Result.textContent = `${p1Score} / ${total} (${Math.round((p1Score/total)*100)}%)`;
  elements.statsP2Result.textContent = `${p2Score} / ${total} (${Math.round((p2Score/total)*100)}%)`;
  
  if (isTie) {
    title = "IT'S A TIE!";
    sub = `Both players captured ${p1Score} squares. A perfect match!`;
    elements.winnerAnnouncement.className = 'winner-announcement tie';
    AudioSynth.playGameOverLose();
  } else if (player1Wins) {
    title = `${state.p1.name.toUpperCase()} WINS!`;
    sub = `Captured ${p1Score} out of ${total} squares, crossing the win threshold.`;
    elements.winnerAnnouncement.className = 'winner-announcement p1-win';
    AudioSynth.playGameOverWin();
  } else {
    title = `${state.p2.name.toUpperCase()} WINS!`;
    sub = `Captured ${p2Score} out of ${total} squares. Better luck next time!`;
    elements.winnerAnnouncement.className = 'winner-announcement p2-win';
    
    if (state.gameMode === 'ai') {
      AudioSynth.playGameOverLose();
    } else {
      AudioSynth.playGameOverWin();
    }
  }
  
  elements.winnerAnnouncement.textContent = title;
  elements.winnerSubtext.textContent = sub;
  
  setTimeout(() => {
    elements.screenGameOver.classList.add('active');
  }, 1000);
}

function triggerAiMove() {
  state.isAiThinking = true;
  const delay = 800 + Math.random() * 500;
  
  setTimeout(() => {
    if (state.isGameOver) return;
    
    const boardState = {
      gridRows: state.gridRows,
      gridCols: state.gridCols,
      lines: state.lines,
      boxes: state.boxes
    };
    
    if (window.getBestMove) {
      const move = window.getBestMove(boardState, state.difficulty);
      state.isAiThinking = false;
      if (move) {
        executeMove(move.type, move.r, move.c);
      }
    } else {
      console.warn("AI module not loaded. Performing basic random fallback.");
      makeRandomFallbackMove();
    }
  }, delay);
}

function makeRandomFallbackMove() {
  const R = state.gridRows;
  const C = state.gridCols;
  const freeLines = [];
  
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (!state.lines[`h_${r}_${c}`]) {
        freeLines.push({ type: 'h', r, c });
      }
    }
  }
  
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (!state.lines[`v_${r}_${c}`]) {
        freeLines.push({ type: 'v', r, c });
      }
    }
  }
  
  state.isAiThinking = false;
  if (freeLines.length > 0) {
    const move = freeLines[Math.floor(Math.random() * freeLines.length)];
    executeMove(move.type, move.r, move.c);
  }
}
