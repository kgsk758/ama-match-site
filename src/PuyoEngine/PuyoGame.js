// Puyopuyo/src/PuyoEngine/PuyoGame.js
import Phaser from 'phaser'; // Import Phaser for EventEmitter
import Puyo from './core/Puyo.js';
import Board from './core/Board.js';
import Score from './core/Score.js';
import TsumoGenerator from './core/TsumoGenerator.js';

export default class PuyoGame {
    /**
     * @param {object} options - Configuration options for the game.
     * @param {number} [options.width=6] - Width of the game board.
     * @param {number} [options.height=12] - Visible height of the game board.
     * @param {Array<number>} [options.colors=[0x000000, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00]] - Colors for puyos.
     * @param {Array<object>} [options.deadTiles=[{x:2, y:2}]] - Tiles that trigger game over.
     * @param {number} [options.nexts=2] - Number of next puyos to show.
     * @param {number} [options.size=40] - Size of one puyo/tile for rendering.
     * @param {number} [options.offsetX=100] - X offset for board rendering.
     * @param {number} [options.offsetY=50] - Y offset for board rendering.
     * @param {Array<object>} [options.nextPos=[{x:8,y:4,size:1},{x:8,y:1,size:1}]] - Positions for next puyos display.
     */
    constructor({
        width = 6,
        height = 12,
        colors = [0x000000, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00], // 0 is empty
        deadTiles = [{ x: 2, y: 2 }],
        nexts = 2,
        size = 40,
        offsetX = 100,
        offsetY = 50,
        nextPos = [{x:8,y:4,size:1},{x:8,y:1,size:1}],
    } = {}) {
        this.width = width;
        this.height = height;
        this.allPuyoColors = colors; // Store all colors, including empty
        this.puyoColors = colors.filter(c => c !== 0x000000); // Filter out empty color for generator
        this.deadTiles = deadTiles;
        this.nexts = nexts;
        this.size = size;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.nextPos = nextPos;

        this.board = new Board({ width, height, deadTiles });
        this.score = new Score();
        this.tsumoGenerator = new TsumoGenerator(this.puyoColors);

        /** @type {Puyo|null} The currently falling puyo */
        this.currentPuyo = null;
        /** @type {Array<{color1: number, color2: number}>} The queue of next puyo pairs */
        this.nextTsumos = [];
        this.isGameOver = false;
        this.isProcessingChain = false;
        this.fallSpeedMultiplier = 1; // For fast falling
        this.virtualRotation = 0; // For SRS-like rotation logic

        this.events = new Phaser.Events.EventEmitter(); // Internal event emitter

        this._initializeNextTsumos();
    }

    /**
     * Initializes the next puyo queue with initial tsumos.
     * @private
     */
    _initializeNextTsumos() {
        // Generate initial tsumos (first two are special)
        const initialTsumos = this.tsumoGenerator.generateFirstTsumos();
        this.nextTsumos.push(...initialTsumos);

        // Fill up the rest of the next queue
        while (this.nextTsumos.length < this.nexts + 1) { // +1 for the current puyo
            this.nextTsumos.push(this.tsumoGenerator.generateNextTsumo());
        }
    }

    /**
     * Starts a new game.
     */
    startGame() {
        this.board = new Board({ width: this.width, height: this.height, deadTiles: this.deadTiles });
        this.score.resetScore();
        this.isGameOver = false;
        this.isProcessingChain = false;
        this.fallSpeedMultiplier = 1;
        this.nextTsumos = [];
        this._initializeNextTsumos();
        this.spawnNewPuyo();
        this.events.emit('gameStarted');
    }

    /**
     * Spawns a new puyo pair.
     */
    spawnNewPuyo() {
        if (this.isGameOver) return;

        const nextTsumo = this.nextTsumos.shift();
        this.currentPuyo = new Puyo({
            x: Math.floor(this.width / 2) - 1, // Start position (adjust as needed)
            y: 1, // Start in the hidden rows
            color1: nextTsumo.color1,
            color2: nextTsumo.color2,
        });
        this.virtualRotation = 0; // Reset virtual rotation

        this.nextTsumos.push(this.tsumoGenerator.generateNextTsumo());

        if (!this.board.isPositionValid(this.currentPuyo)) {
            this.isGameOver = true;
            this.events.emit('gameOver');
        } else {
            this.events.emit('puyoSpawned', this.currentPuyo, this.getNextTsumos());
        }
    }

    /**
     * Advances the game state by one step (e.g., puyo falling).
     * @returns {boolean} True if the puyo landed, false otherwise.
     */
    updateFallingPuyo() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return false;

        const originalY = this.currentPuyo.y;
        this.currentPuyo.y += 0.5 * this.fallSpeedMultiplier; // Move half a step

        if (!this.board.isPositionValid(this.currentPuyo)) {
            // Revert to original Y and check if it landed
            this.currentPuyo.y = originalY;
            if (!this.board.isPositionValid(this.currentPuyo)) {
                // Puyo has landed - Controller will confirm this after a delay
                return true;
            }
        }
        return false;
    }

    /**
     * Public method for the controller to confirm puyo landing after a delay.
     */
    confirmPuyoLanding() {
        if (!this.currentPuyo) return;

        this.board.landPuyo(this.currentPuyo);
        this.currentPuyo = null;
        this.events.emit('puyoLanded');
        this.startChainReaction();
    }

    /**
     * Instantly drops the current puyo to the lowest possible position.
     */
    hardDrop() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return;

        while (this.board.isPositionValid(this.currentPuyo)) {
            this.currentPuyo.y += 0.5;
        }
        this.currentPuyo.y -= 0.5; // Revert last invalid move
        this.confirmPuyoLanding(); // Use the public method
    }

    /**
     * Attempts to move the current puyo left.
     */
    moveLeft() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return;
        const originalX = this.currentPuyo.x;
        this.currentPuyo.x--;
        if (!this.board.isPositionValid(this.currentPuyo)) {
            this.currentPuyo.x = originalX;
        }
        this.events.emit('puyoMoved', this.currentPuyo);
    }

    /**
     * Attempts to move the current puyo right.
     */
    moveRight() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return;
        const originalX = this.currentPuyo.x;
        this.currentPuyo.x++;
        if (!this.board.isPositionValid(this.currentPuyo)) {
            this.currentPuyo.x = originalX;
        }
        this.events.emit('puyoMoved', this.currentPuyo);
    }

    /**
     * Attempts to rotate the current puyo clockwise.
     */
    rotateClockwise() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return;
        this._attemptRotation((this.currentPuyo.rotation + 1) % 4);
        this.events.emit('puyoRotated', this.currentPuyo);
    }

    /**
     * Attempts to rotate the current puyo counter-clockwise.
     */
    rotateCounterClockwise() {
        if (this.isGameOver || this.isProcessingChain || !this.currentPuyo) return;
        this._attemptRotation((this.currentPuyo.rotation - 1 + 4) % 4);
        this.events.emit('puyoRotated', this.currentPuyo);
    }

    /**
     * Helper to attempt rotation with wall kicks/SRS.
     * @param {number} newRotation - The target rotation state.
     * @private
     */
    _attemptRotation(newRotation) {
        const originalRotation = this.currentPuyo.rotation;
        const originalX = this.currentPuyo.x;
        const originalY = this.currentPuyo.y;

        this.currentPuyo.rotation = newRotation;

        if (!this.board.isPositionValid(this.currentPuyo)) {
            // Try Wall Kick (simple: move 1 unit left/right)
            const kickTests = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            let kicked = false;
            for (const test of kickTests) {
                this.currentPuyo.x = originalX + test.dx;
                this.currentPuyo.y = originalY + test.dy;
                if (this.board.isPositionValid(this.currentPuyo)) {
                    kicked = true;
                    break;
                }
            }
            if (!kicked) {
                // If kick fails, revert rotation and position
                this.currentPuyo.rotation = originalRotation;
                this.currentPuyo.x = originalX;
                this.currentPuyo.y = originalY;
            }
        }
        // Check for ceiling collision after successful rotation or kick
        if (this.board.checkCollisionCeiling(this.currentPuyo.x, this.currentPuyo.y)) {
            // Revert if it hit the ceiling
            this.currentPuyo.rotation = originalRotation;
            this.currentPuyo.x = originalX;
            this.currentPuyo.y = originalY;
        }
    }


    /**
     * Starts the chain reaction process.
     */
    async startChainReaction() {
        if (this.isProcessingChain || this.isGameOver) return;
        this.isProcessingChain = true;
        this.events.emit('chainStarted');

        let chainCount = 0;
        let puyosClearedInThisChain = false;

        while (true) {
            this.board.applyGravity();
            await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for gravity animation

            const { puyosToClear, clearedPuyoInfo } = this.board.findPuyosToClear();

            if (puyosToClear.length > 0) {
                puyosClearedInThisChain = true;
                chainCount++;
                this.events.emit('puyosClearing', puyosToClear);
                this.board.clearPuyos(puyosToClear);

                const scoreEarned = this.score.calculateScore(clearedPuyoInfo, chainCount);
                this.events.emit('scoreChanged', this.score.getScore(), scoreEarned);

                await new Promise(resolve => setTimeout(resolve, 300)); // Delay for clearing animation
            } else {
                break; // No more puyos to clear
            }
        }

        if (puyosClearedInThisChain && this.board.isAllClear()) {
            this.score.setAllClearedBonus();
            this.events.emit('allClear');
        }

        this.isProcessingChain = false;
        this.events.emit('chainEnded', chainCount);

        if (this.board.isGameOver()) {
            this.isGameOver = true;
            this.events.emit('gameOver');
        } else if (!this.isGameOver) {
            this.spawnNewPuyo(); // Spawn next puyo if not game over
        }
    }
    
    /**
     * Returns the current state of the game for rendering.
     * @returns {object} The game state object.
     */
    getGameState() {
        return {
            board: this.board.getGrid(),
            currentPuyo: this.currentPuyo ? {
                x: this.currentPuyo.x,
                y: this.currentPuyo.y,
                rotation: this.currentPuyo.rotation,
                color1: this.currentPuyo.color1,
                color2: this.currentPuyo.color2,
            } : null,
            nextTsumos: this.nextTsumos.slice(0, this.nexts), // Only show `nexts` number of tsumos
            score: this.score.getScore(),
            isGameOver: this.isGameOver,
            isProcessingChain: this.isProcessingChain,
        };
    }

    /**
     * Sets the fall speed multiplier (e.g., for fast drop).
     * @param {number} multiplier - The multiplier for fall speed (1 for normal, >1 for fast).
     */
    setFallSpeedMultiplier(multiplier) {
        this.fallSpeedMultiplier = multiplier;
    }

    /**
     * Gets the next `n` tsumos from the queue.
     * @param {number} [count] - The number of next tsumos to retrieve. Defaults to `this.nexts`.
     * @returns {Array<{color1: number, color2: number}>} An array of the next tsumo pairs.
     */
    getNextTsumos(count = this.nexts) {
        return this.nextTsumos.slice(0, count);
    }

    /**
     * Returns the configuration details relevant for the view.
     */
    getGameConfig() {
        return {
            width: this.width,
            height: this.height,
            colors: this.allPuyoColors,
            size: this.size,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            nexts: this.nexts,
            nextPos: this.nextPos,
        };
    }
}
