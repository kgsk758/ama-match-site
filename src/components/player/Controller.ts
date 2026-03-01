import Phaser from "phaser";
import Player from "../../puyo-engine/core/Player";
import BoardView from "./BoardView";
import GarbageView from "./GarbageView";
import ScoreView from "./ScoreView";
import NextView from "./NextView";
import ACView from "./ACView";
import { PLAYER_CONFIG } from "../../constants";
import { CONTROLLER_CONFIG } from "./controller-config";

export default class Controller {
    private player: Player;
    private scene: Phaser.Scene;
    private boardView: BoardView;
    private garbageView: GarbageView;
    private scoreView: ScoreView;
    private nextView: NextView;
    private acView: ACView;

    private dropTimer: number = 0;
    private horizontalMoveTimer: number = 0;

    private downKey: Phaser.Input.Keyboard.Key | null = null;
    private leftKey: Phaser.Input.Keyboard.Key | null = null;
    private rightKey: Phaser.Input.Keyboard.Key | null = null;

    private isChaining: boolean = false;
    private chainCount: number = 0;

    // 接地（ロックダウン）関連
    private lockDownTween: Phaser.Tweens.Tween | null = null;
    private lockDownResetCount: number = 0;
    private isGrounded: boolean = false; // 接地状態を追跡

    constructor(player: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        this.player = player;
        this.scene = scene;

        this.boardView = new BoardView(scene, place.x, place.y);
        this.garbageView = new GarbageView(scene, place.x, place.y);
        this.scoreView = new ScoreView(scene, place.x, place.y);
        this.nextView = new NextView(scene, place.x, place.y);
        this.acView = new ACView(scene);
        this.boardView.getContainer().addAt(this.acView.text, 1);

        this.player.drop();
        this.boardView.animateMove(this.player.place, this.player.place, this.player.moving);
        this.nextView.updateNext(this.player.next);

        if (config.type === PLAYER_CONFIG.HUMAN) {
            if (this.scene.input.keyboard) {
                this.downKey = this.scene.input.keyboard.addKey(CONTROLLER_CONFIG.KEYS.DOWN);
                this.leftKey = this.scene.input.keyboard.addKey(CONTROLLER_CONFIG.KEYS.LEFT);
                this.rightKey = this.scene.input.keyboard.addKey(CONTROLLER_CONFIG.KEYS.RIGHT);
            }
            this.setupInput();
        }
    }

    private setupInput() {
        if (!this.scene.input.keyboard) return;
        
        this.scene.input.keyboard.on(`keydown-${CONTROLLER_CONFIG.KEYS.DOWN}`, () => this.handleAction('down'));
        this.scene.input.keyboard.on(`keydown-${CONTROLLER_CONFIG.KEYS.UP}`, () => this.handleAction('rotate-right'));
        this.scene.input.keyboard.on(`keydown-${CONTROLLER_CONFIG.KEYS.ROTATE_RIGHT}`, () => this.handleAction('rotate-right'));
        this.scene.input.keyboard.on(`keydown-${CONTROLLER_CONFIG.KEYS.ROTATE_LEFT}`, () => this.handleAction('rotate-left'));
    }

    private handleAction(action: 'left' | 'right' | 'down' | 'rotate-left' | 'rotate-right') {
        if (this.isChaining || !(this.scene as any).gamePlaying) return;

        const oldPlace = JSON.parse(JSON.stringify(this.player.place));
        let success = false;
        const isRotation = action.startsWith('rotate');

        switch (action) {
            case 'left': success = this.player.moveLeft(); break;
            case 'right': success = this.player.moveRight(); break;
            case 'down': success = this.player.moveDown(); break;
            case 'rotate-left': this.player.rotateLeft(); success = true; break;
            case 'rotate-right': this.player.rotateRight(); success = true; break;
        }

        if (success) {
            this.boardView.animateMove(oldPlace, this.player.place, this.player.moving, isRotation);
            
            // 地面との接触状態をチェック
            if (this.player.canMoveDown()) {
                // 空中に浮いた場合、接地フラグとタイマーを解除
                if (this.isGrounded) {
                    this.isGrounded = false;
                    this.cancelLockDown();
                }
            } else {
                // 接地したまま移動・回転した場合
                const isSoftDropping = this.downKey && this.downKey.isDown;
                const duration = isSoftDropping ? CONTROLLER_CONFIG.SOFT_DROP_LOCK_DOWN_DURATION : CONTROLLER_CONFIG.LOCK_DOWN_DURATION;

                // タイマーを延長（リセット）するが、着地回数(ResetCount)は増やさない
                this.resetLockDownTimer(duration);
                console.log(`Lockdown timer reset by action (Landing #${this.lockDownResetCount})`);
            }
        } else if (action === 'down') {
            this.landPuyo(true); // 下入力時は余韻を入れる
        }
    }

    private startLockDown(duration: number) {
        this.cancelLockDown();
        this.lockDownTween = this.scene.tweens.add({
            targets: { val: 0 },
            val: 1,
            duration: duration,
            onComplete: () => {
                this.landPuyo(false);
            }
        });
    }

    private resetLockDownTimer(duration: number) {
        // 現在のタイマーを止めて、同じカウントのまま再開する
        if (this.lockDownTween) {
            this.lockDownTween.stop();
            this.startLockDown(duration);
        }
    }

    private cancelLockDown() {
        if (this.lockDownTween) {
            this.lockDownTween.stop();
            this.lockDownTween = null;
        }
    }

    private async landPuyo(forceWait: boolean = false) {
        if (this.isChaining) return;
        this.isChaining = true;
        this.cancelLockDown();
        this.lockDownResetCount = 0;
        this.isGrounded = false;
        
        this.player.fixToBoard();
        this.boardView.updateBoard(this.player.board.grid);
        
        const initialDrops = this.player.board.drop();

        if (forceWait && initialDrops.length == 0) {
            await this.boardView.wait(CONTROLLER_CONFIG.SOFT_DROP_LANDING_DELAY);
        }

        if (initialDrops.length > 0) {
            await this.boardView.animateDrops(initialDrops);
            await this.boardView.wait(CONTROLLER_CONFIG.CHIGIRI_WAIT_DURATION);
        }
        
        this.boardView.updateBoard(this.player.board.grid);

        this.chainCount = 1;
        await this.processChain();
    }

    private async processChain() {
        if (this.chainCount > 1) {
            await this.boardView.wait(CONTROLLER_CONFIG.CHAIN_STEP_WAIT_DURATION);
        }

        const step = this.player.executeChainStep(this.chainCount);
        if (step) {
            this.scoreView.updateScore(this.player.score);
            this.acView.update(this.player.allClear);
            
            await this.boardView.animateChainStep(step);
            this.boardView.updateBoard(this.player.board.grid);
            
            this.chainCount++;
            await this.processChain();
        } else {
            if (this.chainCount === 1) {
                await this.boardView.wait(CONTROLLER_CONFIG.LANDING_WAIT_DURATION);
            }

            this.player.checkAllClear();
            this.acView.update(this.player.allClear);

            this.isChaining = false;
            this.player.drop();
            this.boardView.animateMove(this.player.place, this.player.place, this.player.moving);
            this.nextView.updateNext(this.player.next);
        }
    }

    public update(time: number, delta: number) {
        if (this.isChaining) return;
        if (!delta) delta = 16; 

        // 1. 横移動
        this.horizontalMoveTimer += delta;
        if (this.leftKey?.isDown) {
            if (this.horizontalMoveTimer >= CONTROLLER_CONFIG.HORIZONTAL_MOVE_INTERVAL) {
                this.handleAction('left');
                this.horizontalMoveTimer = 0;
            }
        } else if (this.rightKey?.isDown) {
            if (this.horizontalMoveTimer >= CONTROLLER_CONFIG.HORIZONTAL_MOVE_INTERVAL) {
                this.handleAction('right');
                this.horizontalMoveTimer = 0;
            }
        } else {
            this.horizontalMoveTimer = CONTROLLER_CONFIG.HORIZONTAL_MOVE_INTERVAL;
        }

        // 2. 接地判定と自由落下
        const canMoveDown = this.player.canMoveDown();
        const isSoftDropping = this.downKey && this.downKey.isDown;

        if (!canMoveDown) {
            // 接地している場合
            if (!this.isGrounded) {
                // 「新しく接地した」ときだけカウントを増やす
                this.isGrounded = true;
                this.lockDownResetCount++;
                
                const limit = isSoftDropping ? CONTROLLER_CONFIG.SOFT_DROP_LOCK_DOWN_RESET_LIMIT : CONTROLLER_CONFIG.LOCK_DOWN_RESET_LIMIT;
                
                if (this.lockDownResetCount > limit) {
                    this.landPuyo(true);
                    return;
                }

                const duration = isSoftDropping ? CONTROLLER_CONFIG.SOFT_DROP_LOCK_DOWN_DURATION : CONTROLLER_CONFIG.LOCK_DOWN_DURATION;
                this.startLockDown(duration);
            }
            this.dropTimer = 0;
        } else {
            // 空中にいる場合
            if (this.isGrounded) {
                this.isGrounded = false;
                this.cancelLockDown();
            }

            this.dropTimer += delta;
            const interval = isSoftDropping ? CONTROLLER_CONFIG.SOFT_DROP_INTERVAL : CONTROLLER_CONFIG.DROP_INTERVAL;

            if (this.dropTimer >= interval) {
                this.handleAction('down');
                this.dropTimer = 0;
            }
        }
    }
}
