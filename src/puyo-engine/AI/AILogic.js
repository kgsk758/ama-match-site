// Puyopuyo/src/PuyoEngine/AI/AILogic.js
import Puyo from '../core/Puyo.js';
import Board from '../core/Board.js';


/**
 * Helper function to simulate placing a puyo and its chain reaction on a given board.
 * @param {Board} simBoard - The board instance to simulate on (should be a clone).
 * @param {Puyo} simPuyo - The puyo instance to simulate placement for (should be a clone).
 * @returns {{chainCount: number, clearedCount: number}} The result of the simulated chain.
 */
function simulatePuyoPlacementAndChain(simBoard, simPuyo) {
    let landedY = simPuyo.y;
    // Simulate falling until it lands
    // The Puyo object's position changes during this loop
    while (simBoard.isPositionValid(new Puyo({x: simPuyo.x, y: landedY + 0.5, color1: simPuyo.color1, color2: simPuyo.color2}))) {
        landedY += 0.5;
    }
    simPuyo.y = landedY; // Set puyo to its landed position for board placement

    simBoard.landPuyo(simPuyo);

    let chainCount = 0;
    let clearedCount = 0;
    while (true) {
        simBoard.applyGravity();
        const { puyosToClear, clearedPuyoInfo } = simBoard.findPuyosToClear();

        if (puyosToClear.length > 0) {
            chainCount++;
            clearedCount += puyosToClear.length;
            simBoard.clearPuyos(puyosToClear);
        } else {
            break;
        }
    }
    return { chainCount, clearedCount };
}

/**
 * Generates all possible valid moves (rotations and x positions) for a puyo on a board.
 * @param {Board} board - The board to check for valid positions.
 * @param {Array<number>} puyoColors - The colors of the puyo pair {color1, color2}.
 * @returns {Array<{rotation: number, x: number}>} An array of possible moves.
 */
function generatePossibleMoves(board, puyoColors) {
    const moves = [];
    const width = board.width;

    for (let rotation = 0; rotation < 4; rotation++) {
        for (let x = 0; x < width; x++) {
            // Create a temporary Puyo instance at a high enough Y to prevent immediate collision
            // The AI will handle simulating the fall.
            const tempPuyo = new Puyo({ x: x, y: 1, color1: puyoColors[0], color2: puyoColors[1] });
            tempPuyo.rotation = rotation;

            // Check if the initial placement (at y=1) for this x and rotation is valid.
            // This is a basic check; a more advanced AI might consider wall kicks.
            if (board.isPositionValid(tempPuyo)) {
                moves.push({ rotation, x });
            }
        }
    }
    return moves;
}

/**
 * Evaluates the board state for GTR (GTR Technical Rotation) setup completion.
 * @param {Board} board - The board to evaluate.
 * @returns {number} A score reflecting the completeness of a GTR setup.
 */
function calculateGTRScore(board) {
    const grid = board.getGrid();
    const height = grid.length;
    const H = height - 1; // Index of the bottom row
    let score = 0;

    // Identify the key color for GTR (puyo at (1, H))
    const keyColor = grid[H][1];
    if (keyColor === 0) return 0; // No GTR base yet

    // GTR basic structure checks
    if (grid[H - 1][1] === keyColor) score += 200; // Puyo directly above the key puyo
    if (grid[H][2] !== 0 && grid[H][2] !== keyColor) score += 150; // Puyo at (2, H) is different color (turn base)
    if (grid[H][2] !== 0 && grid[H - 1][2] === grid[H][2]) score += 250; // Puyo at (2, H-1) same color as (2, H) (turn wall)
    if (grid[H][2] !== 0 && grid[H - 2][2] === grid[H][2]) score += 300; // Puyo at (2, H-2) same color as (2, H) (turn wall)

    // Check if the igniter spot (1, H-2) is clear
    if (grid[H - 2][1] === 0) {
        score += 500; // High score if igniter is clear
    } else if (grid[H - 2][1] === keyColor) {
        score -= 100; // Penalty if igniter is blocked by key puyo (premature detonation)
    } else {
        score -= 2000; // Major penalty if igniter is blocked by a different color puyo
    }
    
    return score;
}

/**
 * Evaluates the overall board state, prioritizing immediate chains and GTR setup.
 * @param {Board} board - The board to evaluate.
 * @param {number} chainCount - The number of chains achieved in the simulated move.
 * @param {number} clearedCount - The number of puyos cleared in the simulated move.
 * @returns {number} The evaluation score of the board state.
 */
function evaluate(board, chainCount, clearedCount) {
    // Immediate profit: If a chain occurs, that is the highest priority
    if (chainCount > 0) {
        return 10000 * chainCount; // Prioritize chains over GTR construction
    }

    let score = calculateGTRScore(board);

    // Evaluate the height of the right side (extension potential)
    let rightSideMaxHeight = 0;
    const grid = board.getGrid();
    for (let x = 3; x < grid[0].length; x++) {
        for (let y = 0; y < grid.length; y++) { // Check from top to find highest puyo
            if (grid[y][x] !== 0) {
                const colHeight = grid.length - y;
                if (colHeight > rightSideMaxHeight) {
                    rightSideMaxHeight = colHeight;
                }
                break; // Found the highest puyo in this column
            }
        }
    }
    score -= Math.pow(rightSideMaxHeight, 2) * 5; // Penalty for high right side (reduces build space)

    // Chain potential (targeting only the right side for building up a main chain)
    score += calculateChainPotential(board, 3); // Evaluate from column 3 onwards

    // Overall risk assessment based on max height
    if (rightSideMaxHeight > board.height - 4) { // If right side gets too high (e.g., above 8 visible rows)
        score -= Math.pow(rightSideMaxHeight, 3); // Significant penalty
    }

    return score;
}

/**
 * Evaluates the board for potential chain setups, providing a bonus for connected puyos.
 * @param {Board} board - The board to evaluate.
 * @param {number} startCol - The column index from which to start evaluating potential.
 * @returns {number} The potential chain score.
 */
function calculateChainPotential(board, startCol = 0) {
    let potentialScore = 0;
    const visited = new Set();
    const grid = board.getGrid();
    const height = grid.length;
    const width = grid[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = startCol; x < width; x++) {
            const puyoColor = grid[y][x];
            if (puyoColor === 0) continue; // Skip empty cells

            const key = `${x},${y}`;
            if (!visited.has(key)) {
                // Use Board's internal method for finding connected puyos
                const { connectedPuyos } = board._getConnectedPuyos(x, y, grid);
                
                // Bonus for groups of 3 (potential chain trigger)
                if (connectedPuyos.length === 3) {
                    const groupCenterY = connectedPuyos.reduce((sum, p) => sum + p.y, 0) / 3;
                    potentialScore += Math.pow(height - groupCenterY, 2) * 2; // Higher bonus for lower groups
                }
                // Bonus for puyos of different colors creating a "sandwich" effect
                // that could lead to a chain
                if (y < height - 1 && grid[y + 1][x] !== 0 && grid[y + 1][x] !== puyoColor) {
                    potentialScore += 5;
                }
                connectedPuyos.forEach(p => visited.add(`${p.x},${p.y}`));
            }
        }
    }
    return potentialScore;
}


/**
 * AI's main function to determine the next move, considering a 2-step lookahead with next puyos.
 * Implements a basic beam search.
 * @param {Board} currentBoard - Current game board state.
 * @param {object} currentPuyoData - Object with current puyo properties (x, y, rotation, color1, color2).
 * @param {object} nextPuyoData - Object with next puyo colors (color1, color2).
 * @returns {{rotation: number, x: number}} The best move found.
 */
export function thinkNextMove(currentBoard, currentPuyoData, nextPuyoData) {
    const BEAM_WIDTH = 4; // Number of top candidate moves to consider for the next step

    // Create a Puyo instance from currentPuyoData for AI manipulation
    // Note: currentPuyoData here is a plain object from PuyoGame.getGameState(), not a Puyo instance.
    const currentPuyo = new Puyo({
        x: currentPuyoData.x,
        y: currentPuyoData.y,
        color1: currentPuyoData.color1,
        color2: currentPuyoData.color2,
    });
    currentPuyo.rotation = currentPuyoData.rotation;

    // 1. Find the best candidate moves for the current puyo
    const candidateMoves = findBestCandidateMoves(currentBoard, currentPuyo, BEAM_WIDTH);

    if (candidateMoves.length === 0) {
        // Fallback: if no valid moves, return a default drop in the middle
        return { rotation: 0, x: Math.floor(currentBoard.width / 2) - 1 };
    }

    let bestMove = candidateMoves[0].move;
    let maxFinalScore = -Infinity;

    // If there's no next puyo data, just choose the best single move (1-step lookahead)
    if (!nextPuyoData) {
        return bestMove;
    }

    // 2. Perform a 2-step lookahead (beam search)
    // Prepare the next puyo for simulation
    const nextPuyoTemplate = new Puyo({
        x: Math.floor(currentBoard.width / 2) - 1, // Next puyo usually spawns in a default position
        y: 1, // Start in hidden row
        color1: nextPuyoData.color1,
        color2: nextPuyoData.color2,
    });

    for (const candidate of candidateMoves) {
        // boardAfterMove1 is already a cloned Board from findBestCandidateMoves
        const boardAfterMove1 = candidate.boardAfterMove;

        // Find the best move for the `nextPuyoTemplate` on `boardAfterMove1`
        const bestMoveForNextPuyo = findBestMoveForPuyo(boardAfterMove1, nextPuyoTemplate);
        
        // Sum scores for 2-step evaluation
        const finalScore = candidate.score + bestMoveForNextPuyo.score;

        if (finalScore > maxFinalScore) {
            maxFinalScore = finalScore;
            bestMove = candidate.move;
        }
    }
    return bestMove;
}

/**
 * Finds the single best move for a given puyo on a specific board state.
 * This is used for the second step of the 2-step lookahead in thinkNextMove.
 * @param {Board} board - The cloned board state to simulate on.
 * @param {Puyo} puyoTemplate - A Puyo instance representing the puyo to place.
 * @returns {{move: {rotation: number, x: number}, score: number}} The best move and its evaluation score.
 */
function findBestMoveForPuyo(board, puyoTemplate) {
    let bestMove = { rotation: 0, x: Math.floor(board.width / 2) - 1 };
    let maxScore = -Infinity;

    const possibleMoves = generatePossibleMoves(board, [puyoTemplate.color1, puyoTemplate.color2]);

    for (const move of possibleMoves) {
        const simBoard = board.clone(); // Clone for this simulation branch
        const simPuyo = new Puyo({ // Create a new Puyo instance for simulation
            x: move.x,
            y: puyoTemplate.y,
            color1: puyoTemplate.color1,
            color2: puyoTemplate.color2,
        });
        simPuyo.rotation = move.rotation;

        const chainResult = simulatePuyoPlacementAndChain(simBoard, simPuyo);
        const score = evaluate(simBoard, chainResult.chainCount, chainResult.clearedCount);

        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
    }
    return { move: bestMove, score: maxScore };
}

/**
 * Finds several highly-rated candidate moves for a given puyo on a specific board.
 * Used for the first step of the beam search.
 * @param {Board} board - The initial board state.
 * @param {Puyo} puyoTemplate - A Puyo instance representing the puyo to place.
 * @param {number} count - The number of top candidate moves to return.
 * @returns {Array<{move: {rotation: number, x: number}, score: number, boardAfterMove: Board}>}
 *          An array of candidate moves, their scores, and the resulting board state after the move.
 */
function findBestCandidateMoves(board, puyoTemplate, count) {
    let moveEvaluations = [];
    const possibleMoves = generatePossibleMoves(board, [puyoTemplate.color1, puyoTemplate.color2]);

    for (const move of possibleMoves) {
        const simBoard = board.clone(); // Clone for this simulation branch
        const simPuyo = new Puyo({ // Create a new Puyo instance for simulation
            x: move.x,
            y: puyoTemplate.y,
            color1: puyoTemplate.color1,
            color2: puyoTemplate.color2,
        });
        simPuyo.rotation = move.rotation;

        const chainResult = simulatePuyoPlacementAndChain(simBoard, simPuyo);
        const score = evaluate(simBoard, chainResult.chainCount, chainResult.clearedCount);
        moveEvaluations.push({ move, score, boardAfterMove: simBoard });
    }

    moveEvaluations.sort((a, b) => b.score - a.score);
    return moveEvaluations.slice(0, count);
}

