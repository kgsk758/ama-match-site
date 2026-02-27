export default class Queue {
    public queue: number[][];
    private currentSeed: number;

    constructor(seed: number){
        this.currentSeed = seed;
        const queueResult = this.createQueue(this.currentSeed, true);
        this.queue = queueResult.queue;
        this.currentSeed = queueResult.nextSeed;
    }

    public popQueue(): number[]{
        if(this.queue.length < 4){
            const queueResult = this.createQueue(this.currentSeed, false);
            this.currentSeed = queueResult.nextSeed;
            this.queue = [...this.queue, ...queueResult.queue];
        }
        const popped = this.queue.shift();
        if(popped === undefined) return [0, 0];
        return popped;
    }
    /**
     * 
     * @param seed 
     * @param init - trueなら最初の2手を三色以内
     */
    public createQueue(seed: number, init: boolean): {queue: number[][], nextSeed: number}{
        // シード値を符号なし32ビット整数として扱う
        let seedBit = seed >>> 0;
        // Puyo eSport's random number generation algorithm
        const rng = (): number => {
            seedBit = (Math.imul(seedBit, 0x5D588B65) + 0x269EC3) >>> 0;
            return seedBit;
        }
        // Calls rng() 5 times
        // In Puyo eSport, rng() is called 5 times to choose the colors in the queue
        for (let i = 0; i < 5; ++i) {
            rng();
        }
        // 3色、4色、5色用のキューを256サイズで初期化
        const queue: number[][] = Array.from({ length: 3 }, () => new Array(256).fill(0));
        // 各キューの初期値設定
        for (let mode = 0; mode < 3; ++mode) {
            for (let i = 0; i < 256; ++i) {
                queue[mode][i] = i % (mode + 3);
            }
        }
            // キューのシャッフル
        for (let mode = 0; mode < 3; ++mode) {
            // 1回目のシャッフル
            for (let col = 0; col < 15; ++col) {
                for (let i = 0; i < 8; ++i) {

                    const n1 = (rng() >>> 28) + col * 16;
                    const n2 = (rng() >>> 28) + (col + 1) * 16;

                    const temp = queue[mode][n1];
                    queue[mode][n1] = queue[mode][n2];
                    queue[mode][n2] = temp;
                }
            }

            // 2回目のシャッフル
            for (let col = 0; col < 7; ++col) {
                for (let i = 0; i < 16; ++i) {
                    const n1 = (rng() >>> 27) + col * 32;
                    const n2 = (rng() >>> 27) + (col + 1) * 32;

                    const temp = queue[mode][n1];
                    queue[mode][n1] = queue[mode][n2];
                    queue[mode][n2] = temp;
                }
            }

            // 3回目のシャッフル
            for (let col = 0; col < 3; ++col) {
                for (let i = 0; i < 32; ++i) {
                    const n1 = (rng() >>> 26) + col * 64;
                    const n2 = (rng() >>> 26) + (col + 1) * 64;

                    const temp = queue[mode][n1];
                    queue[mode][n1] = queue[mode][n2];
                    queue[mode][n2] = temp;
                }
            }
        }
        if(init){
            // 初手補正 (最初の2手を3色のみにする)
            for (let i = 0; i < 4; ++i) {
                queue[1][i] = queue[0][i];
                queue[2][i] = queue[0][i];
            }
        }
        // 4色キュー（インデックス1）を抽出してペアに変換
        const result: number[][] = [];
        for (let i = 0; i < 128; ++i) {
            result.push([queue[1][i * 2], queue[1][i * 2 + 1]]);
        }

        return {queue: result, nextSeed: seedBit};
    }
}