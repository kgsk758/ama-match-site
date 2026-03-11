export const CELL_CONFIG = {
    CELL_STR_TYPES: [
        'RED',
        'YELLOW',
        'Green',
        'BLUE',
        'GARBAGE',
        'NONE',
    ],

    CELL_NUM_TYPES: [
        0,1,2,3,4,5
    ],

    get GARBAGE_NUM(){
        return this.CELL_NUM_TYPES[this.CELL_NUM_TYPES.length - 2];
    },

    get NONE_NUM(){
        return this.CELL_NUM_TYPES[this.CELL_NUM_TYPES.length - 1];
    }
}

export const BOARD_CONFIG = {
    WIDTH: 6,
    HEIGHT: 14, //上二段は特殊な処理
    POP_CONNECTION: 4,
}

export const SCORE_CONFIG = {
    GET_CHAIN_BONUS(chain: number): number{
        if(chain <= 1) return 0;
        if(2 <= chain && chain <= 5){
            return 8*(2**(chain-2));
        }
        if(6 <= chain){
            return 96 + 32*(chain-6);
        }
        return 0;
    },
    GET_CONNECT_BONUS(connect: number): number{
        if(connect <= 4) return 0;
        if(5 <= connect && connect <= 10){
            return connect - 3;
        }
        if(11 <= connect){
            return 10;
        }
        return 0;
    },
    COLORS_BONUS: [0, 0, 3, 6, 12, 24],
    ALL_CLEAR_BONUS: 2100, // Score equivalent to 30 garbage puyos
}
export const SEED_CONFIG = {
    DEFAULT_SEED: 1141,
}

export const ANIMATION_CONFIG = {
    POP_DURATION: 200,      // ぷよが消える演出の時間 (ms)
    DROP_BASE_DURATION: 100, // 落下の最低時間 (ms)
    DROP_PER_CELL: 50,       // 1マス落下するごとに加算される時間 (ms)
    BOUNCE_DURATION: 50,     // 落下後のバウンド演出時間 (ms)
    LAND_DURATION: 150,      // 設置時の落下時間 (ms)
    GARBAGE_FALL_DURATION: 300, // お邪魔ぷよの落下時間 (ms)
    CHAIN_STEP_WAIT: 250,    // 連鎖ステップ間の待機時間 (ms)
}

export const SCORE_PER_GARBAGE = 70;