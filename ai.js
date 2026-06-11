/* ==========================================================================
   DOTS & BOXES - AI OPPONENT MODULE (ai.js)
   ========================================================================== */

(function() {
  /**
   * Main entry point called by the game engine.
   * @param {Object} boardState - Current game board state { gridRows, gridCols, lines, boxes }
   * @param {string} difficulty - 'easy', 'medium', 'hard'
   * @returns {Object} { type: 'h'|'v', r: number, c: number }
   */
  window.getBestMove = function(boardState, difficulty) {
    const R = boardState.gridRows;
    const C = boardState.gridCols;
    const lines = boardState.lines;
    const boxes = boardState.boxes;

    // Get all legal moves currently available
    const legalMoves = getAllLegalMoves(R, C, lines);
    if (legalMoves.length === 0) return null;

    // Evaluate options
    const scoringMoves = [];
    const safeMoves = [];
    const badMoves = []; // Moves that will create a 3rd line in some box

    legalMoves.forEach(move => {
      const completionCount = getCompletedBoxesCountForMove(move, R, C, lines, boxes);
      
      if (completionCount > 0) {
        scoringMoves.push(move);
      } else {
        // Check if drawing this line would create a 3rd line on any box
        // (which means the opponent can capture it next turn)
        const createsThirdLine = checkWillCreateThirdLine(move, R, C, lines, boxes);
        if (createsThirdLine) {
          badMoves.push(move);
        } else {
          safeMoves.push(move);
        }
      }
    });

    // --- DIFFICULTY BRANCHING ---
    if (difficulty === 'easy') {
      // Easy: 50% chance to take a scoring move if available, otherwise play random
      if (scoringMoves.length > 0 && Math.random() < 0.5) {
        return getRandomElement(scoringMoves);
      }
      return getRandomElement(legalMoves);
    } 
    
    else if (difficulty === 'medium') {
      // Medium: 100% take scoring moves. 
      // If no scoring, play safe moves.
      // If no safe moves, play random bad move.
      if (scoringMoves.length > 0) {
        return getRandomElement(scoringMoves);
      }
      if (safeMoves.length > 0) {
        return getRandomElement(safeMoves);
      }
      return getRandomElement(badMoves);
    } 
    
    else {
      // Hard: Play tactically!
      // 1. Take scoring moves.
      if (scoringMoves.length > 0) {
        const chainLength = countScoringChainLength(R, C, lines, boxes);
        
        if (chainLength === 2 && countRemainingUncapturedBoxes(boxes) > 2) {
          // Double-cross! Play a line that divides them or leaves them open without capturing.
          const doubleCrossMove = getDoubleCrossMove(scoringMoves, R, C, lines, boxes);
          if (doubleCrossMove) {
            return doubleCrossMove;
          }
        }
        
        return getRandomElement(scoringMoves);
      }

      // 2. Play safe moves.
      if (safeMoves.length > 0) {
        // Heuristic: Prefer safe moves that don't even create a 2nd line on a box if possible.
        const superSafeMoves = safeMoves.filter(move => {
          return checkWillNotCreateSecondLine(move, R, C, lines, boxes);
        });
        
        if (superSafeMoves.length > 0) {
          return getRandomElement(superSafeMoves);
        }
        return getRandomElement(safeMoves);
      }

      // 3. If forced to play a bad move (feed the opponent), select the line 
      // that feeds the opponent the SHORTEST chain of squares.
      if (badMoves.length > 0) {
        return getBestBadMove(badMoves, R, C, lines, boxes);
      }

      return getRandomElement(legalMoves);
    }
  };

  // --- HELPERS ---

  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getAllLegalMoves(R, C, lines) {
    const moves = [];
    
    // Horizontal lines (R+1 rows, C columns)
    for (let r = 0; r <= R; r++) {
      for (let c = 0; c < C; c++) {
        if (!lines[`h_${r}_${c}`]) {
          moves.push({ type: 'h', r, c });
        }
      }
    }
    
    // Vertical lines (R rows, C+1 columns)
    for (let r = 0; r < R; r++) {
      for (let c = 0; c <= C; c++) {
        if (!lines[`v_${r}_${c}`]) {
          moves.push({ type: 'v', r, c });
        }
      }
    }
    
    return moves;
  }

  // Returns count of boxes completed if we draw this line
  function getCompletedBoxesCountForMove(move, R, C, lines, boxes) {
    let completed = 0;
    const { type, r, c } = move;

    if (type === 'h') {
      if (r < R && getBoxLinesCountWithTemporary(r, c, move, lines) === 4) completed++;
      if (r > 0 && getBoxLinesCountWithTemporary(r-1, c, move, lines) === 4) completed++;
    } else {
      if (c < C && getBoxLinesCountWithTemporary(r, c, move, lines) === 4) completed++;
      if (c > 0 && getBoxLinesCountWithTemporary(r, c-1, move, lines) === 4) completed++;
    }
    return completed;
  }

  // Check if drawing this line creates a 3rd line on any adjacent box
  function checkWillCreateThirdLine(move, R, C, lines, boxes) {
    const { type, r, c } = move;
    
    if (type === 'h') {
      if (r < R && getBoxLinesCountWithTemporary(r, c, move, lines) === 3) return true;
      if (r > 0 && getBoxLinesCountWithTemporary(r-1, c, move, lines) === 3) return true;
    } else {
      if (c < C && getBoxLinesCountWithTemporary(r, c, move, lines) === 3) return true;
      if (c > 0 && getBoxLinesCountWithTemporary(r, c-1, move, lines) === 3) return true;
    }
    return false;
  }

  // Check if drawing this line keeps the boxes with 0 or 1 lines (no 2nd line)
  function checkWillNotCreateSecondLine(move, R, C, lines, boxes) {
    const { type, r, c } = move;
    
    if (type === 'h') {
      if (r < R && getBoxLinesCountWithTemporary(r, c, move, lines) >= 2) return false;
      if (r > 0 && getBoxLinesCountWithTemporary(r-1, c, move, lines) >= 2) return false;
    } else {
      if (c < C && getBoxLinesCountWithTemporary(r, c, move, lines) >= 2) return false;
      if (c > 0 && getBoxLinesCountWithTemporary(r, c-1, move, lines) >= 2) return false;
    }
    return true;
  }

  // Count the number of active lines a box has, if we hypothetically draw a line
  function getBoxLinesCountWithTemporary(boxR, boxC, tempMove, lines) {
    let count = 0;
    
    const linesToCheck = [
      `h_${boxR}_${boxC}`,     // top
      `h_${boxR+1}_${boxC}`,   // bottom
      `v_${boxR}_${boxC}`,     // left
      `v_${boxR}_${boxC+1}`    // right
    ];
    
    linesToCheck.forEach(lineId => {
      if (lines[lineId]) {
        count++;
      } else if (tempMove) {
        const tempId = `${tempMove.type}_${tempMove.r}_${tempMove.c}`;
        if (lineId === tempId) {
          count++;
        }
      }
    });
    
    return count;
  }

  function countRemainingUncapturedBoxes(boxes) {
    let count = 0;
    for (let r = 0; r < boxes.length; r++) {
      for (let c = 0; c < boxes[r].length; c++) {
        if (!boxes[r][c].capturedBy) {
          count++;
        }
      }
    }
    return count;
  }

  // Count how many boxes can currently be completed in a chain
  function countScoringChainLength(R, C, lines, boxes) {
    let scoreCount = 0;
    
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (!boxes[r][c].capturedBy && getBoxLinesCountWithTemporary(r, c, null, lines) === 3) {
          scoreCount++;
        }
      }
    }
    return scoreCount;
  }

  // Double-cross logic for rectangular grids
  function getDoubleCrossMove(scoringMoves, R, C, lines, boxes) {
    const threeLineBoxes = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (!boxes[r][c].capturedBy && getBoxLinesCountWithTemporary(r, c, null, lines) === 3) {
          threeLineBoxes.push({ r, c });
        }
      }
    }

    if (threeLineBoxes.length === 2) {
      const b1 = threeLineBoxes[0];
      const b2 = threeLineBoxes[1];
      
      const isHorizontalAdjacent = (b1.r === b2.r && Math.abs(b1.c - b2.c) === 1);
      const isVerticalAdjacent = (b1.c === b2.c && Math.abs(b1.r - b2.r) === 1);
      
      if (isHorizontalAdjacent) {
        const sharedCol = Math.max(b1.c, b2.c);
        const lineId = `v_${b1.r}_${sharedCol}`;
        if (!lines[lineId]) {
          return { type: 'v', r: b1.r, c: sharedCol };
        }
      } else if (isVerticalAdjacent) {
        const sharedRow = Math.max(b1.r, b2.r);
        const lineId = `h_${sharedRow}_${b1.c}`;
        if (!lines[lineId]) {
          return { type: 'h', r: sharedRow, c: b1.c };
        }
      }
    }
    return null;
  }

  // Analyze bad moves and pick the one that gives the opponent the SHORTEST chain of squares.
  function getBestBadMove(badMoves, R, C, lines, boxes) {
    let bestMove = badMoves[0];
    let minChainGained = Infinity;

    badMoves.forEach(move => {
      const tempLines = Object.assign({}, lines);
      const lineId = `${move.type}_${move.r}_${move.c}`;
      tempLines[lineId] = 2; // Simulated AI move

      const chainGained = simulateOpponentChainCapture(R, C, tempLines);
      if (chainGained < minChainGained) {
        minChainGained = chainGained;
        bestMove = move;
      }
    });

    return bestMove;
  }

  // Simulates how many boxes the opponent can capture in sequence from this board state.
  function simulateOpponentChainCapture(R, C, linesState) {
    let captured = 0;
    const tempLines = Object.assign({}, linesState);
    let foundCapture = true;

    while (foundCapture) {
      foundCapture = false;
      
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const linesCount = getBoxLinesCountWithTemporary(r, c, null, tempLines);
          if (linesCount === 3) {
            const missingLine = findMissingLineForBox(r, c, tempLines);
            if (missingLine) {
              const id = `${missingLine.type}_${missingLine.r}_${missingLine.c}`;
              tempLines[id] = 1; // Opponent takes it
              captured++;
              foundCapture = true;
              break;
            }
          }
        }
        if (foundCapture) break;
      }
    }

    return captured;
  }

  function findMissingLineForBox(boxR, boxC, linesState) {
    const candidates = [
      { type: 'h', r: boxR, c: boxC },     // top
      { type: 'h', r: boxR+1, c: boxC },   // bottom
      { type: 'v', r: boxR, c: boxC },     // left
      { type: 'v', r: boxR, c: boxC+1 }    // right
    ];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!linesState[`${c.type}_${c.r}_${c.c}`]) {
        return c;
      }
    }
    return null;
  }

})();
