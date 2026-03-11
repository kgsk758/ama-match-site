export const CONTROLLER_CONFIG = {
    // 落下関連 (ms)
    DROP_INTERVAL: 250,
    SOFT_DROP_INTERVAL: 20,

    // 移動・回転関連 (ms)
    HORIZONTAL_MOVE_INTERVAL: 100,

    // 待機・演出関連 (ms)
    LOCK_DOWN_DURATION: 500, // 接地してから設置されるまでの猶予
    LOCK_DOWN_RESET_LIMIT: 8, // 移動・回転でタイマーをリセットできる回数

    // キー設定
    KEYS: {
        /*LEFT: 'LEFT',
        RIGHT: 'RIGHT',
        DOWN: 'DOWN',
        */
        LEFT: 'J',
        RIGHT: 'L',
        DOWN: 'K',
        UP: 'UP',
        ROTATE_RIGHT: 'S',
        ROTATE_LEFT: 'A'
    }
};
