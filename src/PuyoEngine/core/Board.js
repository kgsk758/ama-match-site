// Puyopuyo/src/PuyoEngine/core/Board.js
import Puyo from './Puyo.js';

export default class Board {
    /**
     * @param {object} options - Configuration options for the board.
     * @param {number} options.width - The number of columns on the board.
     * @param {number} options.height - The number of visible rows on the board.
     * @param {Array<object>} [options.deadTiles=[]] - Positions where puyos result in game over.
     */
    constructor({ width, height, deadTiles = [] }) {
        this.width = width;
        this.height = height;
        this.deadTiles = deadTiles;
        // The board includes 2 hidden rows at the top for puyo spawning/rotation
        this.grid = Array(this.height + 2).fill(null).map(() => Array(this.width).fill(0));
    }

    /**
     * Checks if a given puyo can be placed at its current position and rotation without collision.
     * @param {Puyo} puyo - The puyo object to check.
     * @returns {boolean} True if the puyo can be placed, false otherwise.
     */
    isPositionValid(puyo) {
        const puyoPositions = puyo.getPuyoPositions();
        for (const pos of puyoPositions) {
            // Adjust y-coordinate for half-step falls
            const judgeY = Math.ceil(pos.y);
            if (this._checkCollision(pos.x, judgeY)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks for collision at a specific grid coordinate.
     * @param {number} x - The x-coordinate to check.
     * @param {number} y - The y-coordinate to check.
     * @returns {boolean} True if a collision occurs (out of bounds or occupied), false otherwise.
     * @private
     */
    _checkCollision(x, y) {
        // Check horizontal bounds and bottom
        if (x < 0 || x >= this.width || y >= this.height + 2) {
            return true;
        }
        // Top hidden rows are always valid for initial placement/rotation
        if (y < 0) {
            return false;
        }
        // Check if the cell is already occupied
        if (this.grid[y][x] !== 0) {
            return true;
        }
        return false;
    }

    /**
     * Checks if placing a puyo at the given coordinates would result in a collision with the ceiling.
     * The ceiling is considered to be above the visible game area.
     * @param {number} x - The x-coordinate of the puyo.
     * @param {number} y - The y-coordinate of the puyo.
     * @returns {boolean} True if there's a collision with the ceiling, false otherwise.
     */
    checkCollisionCeiling(x, y) {
        // The visible board starts from y=2. So y <= 0 means it's in the 'ceiling' region.
        return Math.ceil(y) <= 0;
    }

    /**
     * Lands the given puyo onto the board, updating the grid.
     * @param {Puyo} puyo - The puyo object to land.
     */
    landPuyo(puyo) {
        const mainPuyoY = Math.round(puyo.y); // Round to nearest integer for landing
        const childPuyoPos = puyo.getChildPuyoPosition();
        const childPuyoY = Math.round(childPuyoPos.y);

        if (mainPuyoY >= 0 && mainPuyoY < this.height + 2) {
            this.grid[mainPuyoY][puyo.x] = puyo.color1;
        }
        if (childPuyoY >= 0 && childPuyoY < this.height + 2) {
            this.grid[childPuyoY][childPuyoPos.x] = puyo.color2;
        }
    }

    /**
     * Applies gravity to the board, making puyos fall into empty spaces.
     */
    applyGravity() {
        for (let x = 0; x < this.width; x++) {
            let emptyRow = -1; // Tracks the lowest empty row in the current column
            // Find the lowest empty row
            for (let y = this.height + 1; y >= 0; y--) {
                if (this.grid[y][x] === 0) {
                    emptyRow = y;
                    break;
                }
            }

            if (emptyRow !== -1) {
                // Move puyos down to fill empty spaces
                for (let y = emptyRow - 1; y >= 0; y--) {
                    if (this.grid[y][x] !== 0) {
                        this.grid[emptyRow][x] = this.grid[y][x];
                        this.grid[y][x] = 0;
                        emptyRow--;
                    }
                }
            }
        }
    }

    /**
     * Finds groups of 4 or more connected puyos of the same color.
     * @returns {Array<{x: number, y: number}>} An array of puyo coordinates to clear.
     */
    findPuyosToClear() {
        const puyosToClear = new Set();
        const checked = new Set();
        const clearedPuyoInfo = []; // To store color and count for scoring

        for (let y = 0; y < this.height + 2; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = `${x},${y}`;
                if (this.grid[y][x] !== 0 && !checked.has(key)) {
                    const { connectedPuyos, color } = this._getConnectedPuyos(x, y, this.grid);
                    if (connectedPuyos.length >= 4) {
                        clearedPuyoInfo.push({ color: color, number: connectedPuyos.length });
                        connectedPuyos.forEach(p => puyosToClear.add(`${p.x},${p.y}`));
                    }
                    connectedPuyos.forEach(p => checked.add(`${p.x},${p.y}`));
                }
            }
        }
        return { puyosToClear: Array.from(puyosToClear).map(key => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        }), clearedPuyoInfo };
    }

    /**
     * Clears the specified puyos from the board.
     * @param {Array<{x: number, y: number}>} puyos - An array of puyo coordinates to clear.
     */
    clearPuyos(puyos) {
        puyos.forEach(puyo => {
            this.grid[puyo.y][puyo.x] = 0;
        });
    }

    /**
     * Recursively finds all connected puyos of the same color starting from a given point.
     * @param {number} startX - The starting x-coordinate.
     * @param {number} startY - The starting y-coordinate.
     * @param {Array<Array<number>>} grid - The current game grid.
     * @returns {{connectedPuyos: Array<{x: number, y: number}>, color: number}} An object containing the list of connected puyos and their color.
     * @private
     */
    _getConnectedPuyos(startX, startY, grid) {
        const targetColor = grid[startY][startX];
        if (targetColor === 0) return { connectedPuyos: [], color: 0 };

        const connected = [];
        const queue = [{ x: startX, y: startY }];
        const visited = new Set([`${startX},${startY}`]);

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            connected.push({ x, y });

            const neighbors = [
                { x, y: y - 1 }, { x, y: y + 1 }, // Up, Down
                { x: x - 1, y }, { x: x + 1, y }, // Left, Right
            ];

            for (const neighbor of neighbors) {
                const nx = neighbor.x;
                const ny = neighbor.y;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height + 2 &&
                    !visited.has(key) && grid[ny][nx] === targetColor) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        return { connectedPuyos: connected, color: targetColor };
    }

    /**
     * Checks if the game is over based on dead tiles.
     * @returns {boolean} True if the game is over, false otherwise.
     */
    isGameOver() {
        return this.deadTiles.some(tile => this.grid[tile.y][tile.x] !== 0);
    }

    /**
     * Checks if the board is completely empty (all clear).
     * @returns {boolean} True if the board is all clear, false otherwise.
     */
    isAllClear() {
        for (let y = 0; y < this.height + 2; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Creates a deep copy of the current board instance. Useful for AI simulations.
     * @returns {Board} A new Board instance with the same state.
     */
    clone() {
        const clonedBoard = new Board({ width: this.width, height: this.height, deadTiles: this.deadTiles });
        clonedBoard.grid = this.grid.map(row => [...row]); // Deep copy the grid
        return clonedBoard;
    }

    /**
     * Returns the current state of the grid.
     * @returns {Array<Array<number>>} The 2D array representing the game grid.
     */
    getGrid() {
        return this.grid;
    }
}
