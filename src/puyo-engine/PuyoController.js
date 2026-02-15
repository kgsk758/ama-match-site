// Puyopuyo/src/PuyoController.js
import Phaser from 'phaser';
import PuyoGame from './PuyoEngine/PuyoGame.js';
import PuyoView from './PuyoView.js';
import { thinkNextMove } from './PuyoEngine/AI/AILogic.js';

export default class PuyoController {
    /**
     * PuyoControllerのコンストラクタ
     * @param {object} object - コンストラクタに代入するオブジェクト
     * @param {Phaser.Scene} object.scene - Phaserのシーンオブジェクト
     * @param {object} [object.gameConfig={}] - PuyoGameの設定オブジェクト
     * @param {boolean} [object.isAIMode=false] - AIモードかどうかのフラグ
     */
    constructor({ scene, gameConfig = {}, isAIMode = false } = {}) {
        if (!scene) {
            throw new Error("PuyoControllerのコンストラクタにPhaserのシーンオブジェクトを渡してください");
        }

        this.scene = scene;
        this.isAIMode = isAIMode;
        this.aiHasMoved = false;
        this.isLandingProcessing = false;
        this.landCount = 0;
        this.landed = false;
        this.landCanceled = false;
        this.fallResetFlag = false; // Flag to reset fall timer after landing check

        this.PuyoGame = new PuyoGame(gameConfig);
        this.PuyoView = new PuyoView(scene, this.PuyoGame); // PuyoView now takes PuyoGame

        // --- Keyboard Configuration ---
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keys = this.scene.input.keyboard.addKeys('Z,X');
        this.leftKey = this.keys.Z;
        this.rightKey = this.keys.X;

        // --- Timing Configuration ---
        this.LandInterval = 333; // Milliseconds for puyo to settle before landing confirmation
        this.FallInterval = 500; // Milliseconds for normal fall speed
        this.FallIntervalFast = 50; // Milliseconds for fast fall speed
        this.FallIntervalNow = this.FallInterval;
        this.moveInterval = 30; // Milliseconds for continuous side movement
        this.isFastButtonPressed = false;

        this._setupEventListeners();
        this.PuyoGame.startGame();
    }

    /**
     * Sets up event listeners for PuyoGame events.
     * @private
     */
    _setupEventListeners() {
        this.PuyoGame.events.on('puyoSpawned', this.onPuyoSpawned, this);
        this.PuyoGame.events.on('puyoLanded', this.onPuyoLanded, this);
        this.PuyoGame.events.on('chainStarted', this.onChainStarted, this);
        this.PuyoGame.events.on('puyosClearing', this.onPuyosClearing, this);
        this.PuyoGame.events.on('chainEnded', this.onChainEnded, this);
        this.PuyoGame.events.on('scoreChanged', this.onScoreChanged, this);
        this.PuyoGame.events.on('allClear', this.onAllClear, this);
        this.PuyoGame.events.on('gameOver', this.onGameOver, this);
    }

    /**
     * Event handler for when a puyo is spawned.
     * @param {Puyo} currentPuyo - The newly spawned puyo.
     * @param {Array<object>} nextTsumos - The updated list of next tsumos.
     */
    onPuyoSpawned(currentPuyo, nextTsumos) {
        this.aiHasMoved = false;
        this.landCanceled = false;
        this.landed = false;
        this.landCount = 0;
        this.fallReset();
        if (this.isFastButtonPressed) {
            this.fallFast();
        }
        this.fallOneStep(); // Initial fall after spawn
    }

    /**
     * Event handler for when a puyo lands.
     */
    onPuyoLanded() {
        // PuyoGame now handles the landing logic and chain reactions
        // This event just signifies that the puyo has settled.
    }

    /**
     * Event handler for when a chain reaction starts.
     */
    onChainStarted() {
        console.log("Chain reaction started!");
        // Potentially trigger animation/sound in PuyoView
    }

    /**
     * Event handler for when puyos are about to be cleared.
     * @param {Array<object>} puyosToClear - Array of puyo coordinates to clear.
     */
    onPuyosClearing(puyosToClear) {
        console.log("Puyos clearing:", puyosToClear);
        this.PuyoView.triggerPuyoClearAnimation(puyosToClear);
    }

    /**
     * Event handler for when a chain reaction ends.
     * @param {number} chainCount - The number of chains.
     */
    onChainEnded(chainCount) {
        if (chainCount > 0) {
            console.log(`${chainCount} chains completed!`);
        }
        // Ensure fall speed is reset after chain processing
        this.fallSlow();
        this.fallReset();
    }

    /**
     * Event handler for when the score changes.
     * @param {number} totalScore - The new total score.
     * @param {number} scoreEarned - The score earned in the last action.
     */
    onScoreChanged(totalScore, scoreEarned) {
        console.log(`Score: ${totalScore}, Earned: ${scoreEarned}`);
        // PuyoView automatically updates the score text
    }

    /**
     * Event handler for an all clear bonus.
     */
    onAllClear() {
        console.log("ALL CLEAR!");
        // Trigger special animation/effect in PuyoView
    }

    /**
     * Event handler for game over.
     */
    onGameOver() {
        console.log("Game Over!");
        // Stop all timers, display game over screen
        if (this.fallTimer) this.fallTimer.remove();
        if (this.moveLeftTimer) this.moveLeftTimer.remove();
        if (this.moveRightTimer) this.moveRightTimer.remove();
        this.PuyoGame.events.emit('displayGameOver');
    }

    update() {
        // Always update the view based on the current game state
        this.PuyoView.update(this.PuyoGame.getGameState());

        if (this.PuyoGame.isGameOver || this.PuyoGame.isProcessingChain) {
            // No player input or AI moves during game over or chain processing
            return;
        }

        if (this.isAIMode) {
            // AI Mode
            if (this.PuyoGame.currentPuyo && !this.aiHasMoved) {
                const boardClone = this.PuyoGame.board.clone();
                const puyoClone = Object.assign({}, this.PuyoGame.currentPuyo); // Simple shallow copy for AI
                const nextPuyoData = this.PuyoGame.getNextTsumos(1)[0]; // Get next-next puyo for AI
                const aiMove = thinkNextMove(boardClone, puyoClone, nextPuyoData); // AILogic needs refactoring to take new Puyo/Board objects
                // Need to implement performAIMove in PuyoGame or AILogic
                // For now, let's just simulate moves:
                this.PuyoGame.setFallSpeedMultiplier(10); // AI moves fast
                for (let i = 0; i < aiMove.rotation; i++) {
                    this.PuyoGame.rotateClockwise();
                }
                while (this.PuyoGame.currentPuyo && this.PuyoGame.currentPuyo.x !== aiMove.x) {
                    if (this.PuyoGame.currentPuyo.x < aiMove.x) {
                        this.PuyoGame.moveRight();
                    } else {
                        this.PuyoGame.moveLeft();
                    }
                }
                this.PuyoGame.hardDrop();
                this.aiHasMoved = true;
            }
        } else {
            // Human Player Input
            if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
                this.PuyoGame.moveLeft();
                this.moveLeftTimer = this.scene.time.addEvent({
                    delay: this.moveInterval,
                    callback: this.PuyoGame.moveLeft,
                    callbackScope: this.PuyoGame,
                    loop: true,
                    paused: true,
                });
                this.scene.time.delayedCall(100, () => {
                    if (this.moveLeftTimer) this.moveLeftTimer.paused = false;
                });
            }
            if (Phaser.Input.Keyboard.JustUp(this.cursors.left)) {
                if (this.moveLeftTimer) this.moveLeftTimer.remove();
            }
            if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
                this.PuyoGame.moveRight();
                this.moveRightTimer = this.scene.time.addEvent({
                    delay: this.moveInterval,
                    callback: this.PuyoGame.moveRight,
                    callbackScope: this.PuyoGame,
                    loop: true,
                    paused: true,
                });
                this.scene.time.delayedCall(100, () => {
                    if (this.moveRightTimer) this.moveRightTimer.paused = false;
                });
            }
            if (Phaser.Input.Keyboard.JustUp(this.cursors.right)) {
                if (this.moveRightTimer) this.moveRightTimer.remove();
            }

            if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
                this.PuyoGame.rotateClockwise();
            }
            if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
                this.PuyoGame.rotateCounterClockwise();
            }
            if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
                this.PuyoGame.setFallSpeedMultiplier(10); // Fast fall
                this.isFastButtonPressed = true;
                this.fallOneStep(); // Manual fast fall
            }
            if (Phaser.Input.Keyboard.JustUp(this.cursors.down)) {
                this.PuyoGame.setFallSpeedMultiplier(1); // Normal fall
                this.isFastButtonPressed = false;
                this.fallSlow();
            }
        }
        
        // --- Landing Detection (Managed by Controller) ---
        // PuyoGame.updateFallingPuyo() handles movement. Controller handles timing.
        this.landed = false;
        if (this.PuyoGame.currentPuyo && !this.PuyoGame.isProcessingChain) {
            // Create a temporary Puyo object for collision check
            const tempPuyo = new Puyo({
                x: this.PuyoGame.currentPuyo.x,
                y: this.PuyoGame.currentPuyo.y + 0.5,
                color1: this.PuyoGame.currentPuyo.color1,
                color2: this.PuyoGame.currentPuyo.color2,
            });
            tempPuyo.rotation = this.PuyoGame.currentPuyo.rotation;

            if (!this.PuyoGame.board.isPositionValid(tempPuyo)) {
                this.landed = true;
            }
        }
        
        if (this.landed) {
            this.landCount++;
            if (!this.isLandingProcessing && this.landCount * (this.FallIntervalNow / 1000) * 1000 >= this.LandInterval) {
                // If it's been settled for long enough, confirm landing
                this.isLandingProcessing = true; // Prevent re-entry
                this.PuyoGame.confirmPuyoLanding(); // Use the new public method
                this.isLandingProcessing = false;
                this.landCount = 0;
            }
        } else {
            if (this.landCount > 0) {
                this.landCanceled = true;
                this.fallResetFlag = true; // Signal to reset fall timer in next frame
            }
            this.landCount = 0;
        }

        if (this.fallResetFlag) {
            this.fallResetFlag = false;
            this.fallReset();
        }
    }

    /**
     * Attempts to make the current puyo fall one step.
     */
    fallOneStep() {
        if (this.PuyoGame.currentPuyo && !this.PuyoGame.isProcessingChain) {
            const landed = this.PuyoGame.updateFallingPuyo();
            if (landed) {
                // Puyo has technically "landed" on this step, but the Controller
                // will wait for LandInterval before calling confirmPuyoLanding.
            }
        }
    }

    /**
     * Speeds up puyo falling.
     */
    fallFast() {
        if (this.FallIntervalNow === this.FallIntervalFast) return;
        if (this.fallTimer) this.fallTimer.remove();
        this.FallIntervalNow = this.FallIntervalFast;
        this.fallTimer = this.scene.time.addEvent({
            delay: this.FallIntervalNow,
            callback: this.fallOneStep,
            callbackScope: this,
            loop: true,
        });
    }

    /**
     * Resets puyo falling to normal speed.
     */
    fallSlow() {
        if (this.FallIntervalNow === this.FallInterval) return;
        if (this.fallTimer) this.fallTimer.remove();
        this.FallIntervalNow = this.FallInterval;
        this.fallTimer = this.scene.time.addEvent({
            delay: this.FallIntervalNow,
            callback: this.fallOneStep,
            callbackScope: this,
            loop: true,
        });
    }

    /**
     * Resets the fall timer.
     */
    fallReset() {
        if (this.fallTimer) this.fallTimer.remove();
        this.fallTimer = this.scene.time.addEvent({
            delay: this.FallIntervalNow,
            callback: this.fallOneStep,
            callbackScope: this,
            loop: true,
        });
    }
}
