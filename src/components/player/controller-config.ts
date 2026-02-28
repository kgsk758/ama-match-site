export const CONTROLLER_CONFIG = {
    // 落下関連 (ms)
    DROP_INTERVAL: 250,
    SOFT_DROP_INTERVAL: 20,

    // 移動・回転関連 (ms)
    HORIZONTAL_MOVE_INTERVAL: 100,
    ROTATION_DURATION: 60,

    // 待機・演出関連 (ms)
    LANDING_WAIT_DURATION: 250,
    CHIGIRI_WAIT_DURATION: 250,
    CHAIN_STEP_WAIT_DURATION: 250,
    LOCK_DOWN_DURATION: 250, // 接地してから設置されるまでの猶予
    LOCK_DOWN_RESET_LIMIT: 8, // 移動・回転でタイマーをリセットできる回数
    SOFT_DROP_LOCK_DOWN_DURATION: 125, // 下入力時の設置猶予 (ms)
    SOFT_DROP_LOCK_DOWN_RESET_LIMIT: 4, // 下入力時のリセット上限
    SOFT_DROP_LANDING_DELAY: 125, // 下入力で即座に設置した時の余韻 (ms)


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
