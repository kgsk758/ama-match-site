// Puyopuyo/src/PuyoView.js
import Phaser from 'phaser';
import Puyo from './PuyoEngine/core/Puyo.js'; // Import Puyo for type hinting

export default class PuyoView {
    /**
     * @param {Phaser.Scene} scene - The Phaser scene.
     * @param {PuyoGame} puyoGame - The PuyoGame instance to render.
     */
    constructor(scene, puyoGame) {
        this.scene = scene;
        this.PuyoGame = puyoGame; // Keep a reference to PuyoGame for config values
        this.config = puyoGame.getGameConfig(); // Get display-related config from PuyoGame

        // Destructure config for easier access
        const { width, height, colors, size, offsetX, offsetY, nexts, nextPos } = this.config;

        this.TILE_SIZE = size;
        this.BOARD_OFFSET_X = offsetX;
        this.BOARD_OFFSET_Y = offsetY;
        this.puyoColors = colors;
        this.nextPos = nextPos; // Positions for next puyos display

        // Container to hold all board-related graphics, enabling easy masking and movement
        this.boardContainer = this.scene.add.container(0, 0);

        // --- Mask Setup ---
        const maskGraphics = this.scene.make.graphics();
        maskGraphics.fillStyle(0x000000);
        // Display area starts from the 3rd row (index 2)
        maskGraphics.fillRect(
            this.BOARD_OFFSET_X - this.TILE_SIZE / 2,
            this.BOARD_OFFSET_Y + (2 * this.TILE_SIZE) - this.TILE_SIZE / 2,
            width * this.TILE_SIZE,
            height * this.TILE_SIZE
        );
        const mask = maskGraphics.createGeometryMask();
        this.boardContainer.setMask(mask);

        // --- Board Grid Graphics ---
        // These are static and represent the empty grid cells
        for (let y = 0; y < height + 2; y++) {
            for (let x = 0; x < width; x++) {
                const tileX = this.BOARD_OFFSET_X + x * this.TILE_SIZE;
                const tileY = this.BOARD_OFFSET_Y + y * this.TILE_SIZE;
                const rect = this.scene.add.rectangle(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE, 0x000000, 0.2);
                const border = this.scene.add.rectangle(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE).setStrokeStyle(1, 0xffffff, 0.5);
                this.boardContainer.add([rect, border]);
            }
        }

        // --- Falling Puyo Graphics ---
        this.fallingPuyo1 = this.scene.add.circle(0, 0, this.TILE_SIZE / 2, this.puyoColors[0]);
        this.fallingPuyo2 = this.scene.add.circle(0, 0, this.TILE_SIZE / 2, this.puyoColors[0]);
        this.boardContainer.add([this.fallingPuyo1, this.fallingPuyo2]);

        // --- Landed Puyo Group ---
        this.landedPuyoGroup = this.scene.add.group();
        // Add children to container later when they are created

        // --- Next Puyo Group ---
        this.nextPuyoGroup = this.scene.add.group();
        // Next puyos are outside the main board, so not in boardContainer

        // --- Score Display ---
        this.scoreText = this.scene.add.text(this.BOARD_OFFSET_X + width * this.TILE_SIZE + 20, this.BOARD_OFFSET_Y, 'Score: 0', { fontSize: '24px', fill: '#fff' });
        this.chainText = this.scene.add.text(this.BOARD_OFFSET_X + width * this.TILE_SIZE + 20, this.BOARD_OFFSET_Y + 30, '', { fontSize: '24px', fill: '#ff0' });
        this.allClearText = this.scene.add.text(this.BOARD_OFFSET_X + width * this.TILE_SIZE / 2, this.BOARD_OFFSET_Y + height * this.TILE_SIZE / 2, 'ALL CLEAR!', { fontSize: '48px', fill: '#0f0' }).setOrigin(0.5).setVisible(false);
        this.gameOverText = this.scene.add.text(this.BOARD_OFFSET_X + width * this.TILE_SIZE / 2, this.BOARD_OFFSET_Y + height * this.TILE_SIZE / 2, 'GAME OVER', { fontSize: '48px', fill: '#f00' }).setOrigin(0.5).setVisible(false);

        // --- Event Listeners from PuyoGame ---
        // PuyoController will now handle subscriptions and call PuyoView's public methods
        // No direct PuyoGame.events.on calls here.
    }

    /**
     * Updates the visual representation of the game based on the current game state.
     * This method should be called every frame from the Phaser scene's update loop.
     * @param {object} gameState - The game state object from PuyoGame.getGameState().
     */
    update(gameState) {
        this.renderFallingPuyo(gameState.currentPuyo);
        this.renderBoard(gameState.board);
        this.renderNextPuyos(gameState.nextTsumos);
        this.scoreText.setText(`Score: ${gameState.score}`);
        this.gameOverText.setVisible(gameState.isGameOver);
    }

    /**
     * Renders the currently falling puyo.
     * @param {Puyo|null} currentPuyo - The falling puyo object.
     */
    renderFallingPuyo(currentPuyo) {
        if (currentPuyo) {
            this.fallingPuyo1.setVisible(true);
            this.fallingPuyo2.setVisible(true);

            // Axis puyo position
            this.fallingPuyo1.x = this.BOARD_OFFSET_X + currentPuyo.x * this.TILE_SIZE;
            this.fallingPuyo1.y = this.BOARD_OFFSET_Y + currentPuyo.y * this.TILE_SIZE;
            this.fallingPuyo1.setFillStyle(this.puyoColors[currentPuyo.color1]);

            // Child puyo position
            const childPos = currentPuyo.getChildPuyoPosition();
            this.fallingPuyo2.x = this.BOARD_OFFSET_X + childPos.x * this.TILE_SIZE;
            this.fallingPuyo2.y = this.BOARD_OFFSET_Y + childPos.y * this.TILE_SIZE;
            this.fallingPuyo2.setFillStyle(this.puyoColors[currentPuyo.color2]);

            this.fallingPuyo1.setDepth(10); // Ensure falling puyos are on top
            this.fallingPuyo2.setDepth(10);
        } else {
            this.fallingPuyo1.setVisible(false);
            this.fallingPuyo2.setVisible(false);
        }
    }

    /**
     * Renders the landed puyos on the board.
     * @param {Array<Array<number>>} boardGrid - The 2D array representing the game board.
     */
    renderBoard(boardGrid) {
        this.landedPuyoGroup.clear(true, true); // Clear existing landed puyos

        for (let y = 0; y < boardGrid.length; y++) {
            for (let x = 0; x < boardGrid[y].length; x++) {
                const puyoColorCode = boardGrid[y][x];
                if (puyoColorCode > 0) { // If there's a puyo
                    const puyoX = this.BOARD_OFFSET_X + x * this.TILE_SIZE;
                    const puyoY = this.BOARD_OFFSET_Y + y * this.TILE_SIZE;
                    const puyoGraphic = this.scene.add.circle(puyoX, puyoY, this.TILE_SIZE / 2, this.puyoColors[puyoColorCode]);
                    this.landedPuyoGroup.add(puyoGraphic);
                    this.boardContainer.add(puyoGraphic); // Add to container
                }
            }
        }
    }

    /**
     * Renders the next puyos in the queue.
     * @param {Array<{color1: number, color2: number}>} nextTsumos - The array of next puyo pairs.
     */
    renderNextPuyos(nextTsumos) {
        this.nextPuyoGroup.clear(true, true);

        nextTsumos.forEach((tsumo, index) => {
            const nextPosConfig = this.nextPos[index];
            if (!nextPosConfig) return; // defensive check

            const basePosX = this.BOARD_OFFSET_X + this.config.width * this.TILE_SIZE + this.TILE_SIZE * 2; // Offset to the right of the board
            const basePosY = this.BOARD_OFFSET_Y + index * (this.TILE_SIZE * 2 + 10); // Stack next puyos vertically

            // Child puyo
            this.nextPuyoGroup.add(this.scene.add.circle(
                basePosX,
                basePosY,
                (this.TILE_SIZE * nextPosConfig.size) / 2,
                this.puyoColors[tsumo.color2]
            ));
            // Axis puyo
            this.nextPuyoGroup.add(this.scene.add.circle(
                basePosX,
                basePosY + (this.TILE_SIZE * nextPosConfig.size), // Placed below child puyo
                (this.TILE_SIZE * nextPosConfig.size) / 2,
                this.puyoColors[tsumo.color1]
            ));
        });
    }

    /**
     * Triggers an animation for clearing puyos.
     * @param {Array<{x: number, y: number}>} puyosToClear - Array of puyo coordinates that are being cleared.
     */
    triggerPuyoClearAnimation(puyosToClear) {
        // Find the actual puyo graphics objects to animate
        this.landedPuyoGroup.children.each(puyoGraphic => {
            const px = (puyoGraphic.x - this.BOARD_OFFSET_X) / this.TILE_SIZE;
            const py = (puyoGraphic.y - this.BOARD_OFFSET_Y) / this.TILE_SIZE;

            if (puyosToClear.some(p => p.x === px && p.y === py)) {
                this.scene.tweens.add({
                    targets: puyoGraphic,
                    alpha: 0,
                    scale: 0,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => puyoGraphic.destroy()
                });
            }
        });
    }

    /**
     * Displays the chain count temporarily.
     * @param {number} chainCount - The number of chains.
     */
    displayChainCount(chainCount) {
        if (chainCount > 0) {
            this.chainText.setText(`${chainCount} CHAIN!`).setVisible(true);
            this.scene.time.delayedCall(1000, () => this.chainText.setVisible(false));
        } else {
            this.chainText.setVisible(false);
        }
    }

    /**
     * Displays the all clear message temporarily.
     */
    displayAllClear() {
        this.allClearText.setVisible(true);
        this.scene.time.delayedCall(1500, () => this.allClearText.setVisible(false));
    }

    /**
     * Displays the game over message.
     */
    displayGameOver() {
        this.gameOverText.setVisible(true);
    }
}
