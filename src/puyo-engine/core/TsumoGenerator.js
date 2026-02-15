// Puyopuyo/src/PuyoEngine/core/TsumoGenerator.js

export default class TsumoGenerator {
    /**
     * @param {Array<number>} colors - The array of possible puyo colors (e.g., [1, 2, 3, 4]).
     */
    constructor(colors) {
        this.colors = colors;
        this.tsumoManageList = [];
    }

    /**
     * Generates the first two tsumos for the start of the game.
     * The first two pairs are guaranteed to not have the same color twice, and are from a pool of 3 colors.
     * @returns {Array<{color1: number, color2: number}>} An array containing the first two puyo pairs.
     */
    generateFirstTsumos() {
        const tsumoList = [];
        const threeColors = [...this.colors].sort(() => Math.random() - 0.5).slice(0, 3);

        for (let i = 0; i < 2; i++) {
            const randomThreeColors = [];
            threeColors.sort(() => Math.random() - 0.5);
            randomThreeColors[0] = threeColors[0];
            threeColors.sort(() => Math.random() - 0.5);
            randomThreeColors[1] = threeColors[0];
            tsumoList.push({ color1: randomThreeColors[0], color2: randomThreeColors[1] });
        }
        // The list is generated for [next, next-next], so we reverse it to pop it in the right order.
        return tsumoList.reverse();
    }

    /**
     * Generates the next puyo pair.
     * @returns {{color1: number, color2: number}} The next puyo pair.
     */
    generateNextTsumo() {
        if (this.tsumoManageList.length === 0) {
            this.tsumoManageList = this._createPileOfColors();
            this._makeListRandom(this.tsumoManageList);
        }
        // To prevent the same color from appearing twice in a pair if possible
        let color1 = this.tsumoManageList.pop();
        let color2 = this.tsumoManageList.pop();

        if (color1 === color2) {
            // If the pile runs out, it's possible to get a double. We add it back and reshuffle.
            if(this.tsumoManageList.length < 2) {
                this.tsumoManageList.push(color1);
                this.tsumoManageList.push(color2);
                this._makeListRandom(this.tsumoManageList);
                color1 = this.tsumoManageList.pop();
                color2 = this.tsumoManageList.pop();
            } else {
                 // Swap with the next one if it's different
                const nextColor = this.tsumoManageList.pop();
                if(nextColor !== color2){
                    this.tsumoManageList.push(color2); // put back the original
                    this._makeListRandom(this.tsumoManageList); // shuffle to be safe
                    color2 = nextColor;
                } else {
                    this.tsumoManageList.push(nextColor);
                    this._makeListRandom(this.tsumoManageList);
                    color2 = this.tsumoManageList.pop();
                }
            }
        }
        return { color1, color2 };
    }

    /**
     * Creates a large pile of colors to draw from, ensuring a balanced distribution.
     * @returns {Array<number>} A large array of puyo colors.
     * @private
     */
    _createPileOfColors() {
        let pileOfColors = [];
        for (const color of this.colors) {
            for (let i = 0; i < 64; i++) {
                pileOfColors.push(color);
            }
        }
        return pileOfColors;
    }

    /**
     * Shuffles an array in place.
     * @param {Array<any>} list The array to shuffle.
     * @private
     */
    _makeListRandom(list) {
        list.sort(() => Math.random() - 0.5);
    }
}
