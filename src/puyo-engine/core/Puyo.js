// Puyopuyo/src/PuyoEngine/core/Puyo.js

/**
 * Represents the active, controllable pair of puyos.
 */
export default class Puyo {
    /**
     * @param {object} options - The options for the puyo.
     * @param {number} options.x - The initial x position of the axis puyo.
     * @param {number} options.y - The initial y position of the axis puyo.
     * @param {number} options.color1 - The color of the axis puyo.
     * @param {number} options.color2 - The color of the child puyo.
     */
    constructor({ x, y, color1, color2 }) {
        this.x = x;
        this.y = y;
        this.color1 = color1;
        this.color2 = color2;
        this.rotation = 0; // 0: up, 1: right, 2: down, 3: left
    }

    /**
     * Gets the absolute coordinates of the child puyo based on the axis puyo's position and rotation.
     * @returns {{x: number, y: number}} The coordinates of the child puyo.
     */
    getChildPuyoPosition() {
        switch (this.rotation) {
            case 0: return { x: this.x, y: this.y - 1 }; // Up
            case 1: return { x: this.x + 1, y: this.y }; // Right
            case 2: return { x: this.x, y: this.y + 1 }; // Down
            case 3: return { x: this.x - 1, y: this.y }; // Left
            default: return { x: this.x, y: this.y };
        }
    }

    /**
     * Gets the coordinates of both the axis and child puyo.
     * @returns {Array<{x: number, y: number}>} An array containing the coordinates of both puyos.
     */
    getPuyoPositions() {
        return [
            { x: this.x, y: this.y },
            this.getChildPuyoPosition()
        ];
    }
}
