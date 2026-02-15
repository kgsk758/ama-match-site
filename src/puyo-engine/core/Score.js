// Puyopuyo/src/PuyoEngine/core/Score.js

export default class Score {
    constructor() {
        this.currentScore = 0;
        this.allClearedBonus = false; // Flag for all clear bonus
    }

    /**
     * Calculates the score for a chain and updates the total score.
     * @param {Array<{color: number, number: number}>} puyoInfoArray - Array of objects describing cleared puyos (color and count).
     * @param {number} chain - The current chain number.
     * @returns {number} The score earned from this chain.
     */
    calculateScore(puyoInfoArray, chain) {
        const chainPower = [0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512]; // Chain bonus (1-19 chains)
        const colorBonus = [0, 0, 3, 6, 12, 24]; // Color count bonus (1-5 colors)
        const groupBonus = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10];  // Group bonus (1-11 connections)

        let cp = 0; // Chain power
        let cb = 0; // Color bonus
        let gb = 0; // Group bonus
        let colorsNum = 0; // Number of unique colors cleared simultaneously
        let colors = [];
        let puyoNum = 0; // Total number of puyos cleared in this chain

        for (const puyoInfoObj of puyoInfoArray) {
            colors.push(puyoInfoObj.color);
            puyoNum += puyoInfoObj.number;
            
            // Apply group bonus
            if (puyoInfoObj.number >= groupBonus.length) {
                gb += 10; // 12+ connections get max group bonus
            } else {
                gb += groupBonus[puyoInfoObj.number];
            }
        }

        colorsNum = [...new Set(colors)].length; // Count unique colors
        // Apply color bonus
        if (colorsNum >= colorBonus.length) {
            cb += 3 * (2 ** (colorsNum - 2)); // Custom formula for many colors
        } else {
            cb += colorBonus[colorsNum];
        }

        // Apply chain bonus
        if (chain >= chainPower.length) {
            cp += 32 * (chain - 3); // Custom formula for many chains
        } else {
            cp += chainPower[chain];
        }

        let chainScore = 10 * puyoNum * (cp + cb + gb);
        if (chainScore === 0 && puyoNum > 0) { // Default score for basic clears (e.g., 4 connected, 1 chain)
            chainScore = 40;
        }

        this.currentScore += chainScore;

        if (this.allClearedBonus) {
            this.currentScore += 2100; // Add all clear bonus
            this.allClearedBonus = false; // Reset the flag
        }

        return chainScore;
    }

    /**
     * Resets the score to 0.
     */
    resetScore() {
        this.currentScore = 0;
        this.allClearedBonus = false;
    }

    /**
     * Gets the current total score.
     * @returns {number} The current score.
     */
    getScore() {
        return this.currentScore;
    }

    /**
     * Sets the all cleared bonus flag.
     */
    setAllClearedBonus() {
        this.allClearedBonus = true;
    }
}
