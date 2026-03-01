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
        // 初期状態の接地チェック
        this.isGrounded = !this.player.canMoveDown();
        if (this.isGrounded) {
            this.startLockDown(CONTROLLER_CONFIG.LOCK_DOWN_DURATION);
            this.triggerLandingBounce();
        }
        
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

        //if (success) {
            this.boardView.animateMove(oldPlace, this.player.place, this.player.moving, isRotation);
            
            // 地面との接触状態をチェック
            if (this.player.canMoveDown()) {
                // 空中に浮いた場合、接地フラグとタイマーを解除
                if (this.isGrounded) {
                    this.isGrounded = false;
                    this.cancelLockDown();
                    // ここではカウントを増やさない（空中での強制設置を防ぐ）
                }
            } else {
                // 接地した、あるいは接地したままアクションした場合はカウントを増やす
                this.lockDownResetCount++;

                if (this.lockDownResetCount > CONTROLLER_CONFIG.LOCK_DOWN_RESET_LIMIT) {
                    this.landPuyo();
                    return;
                }

                if (!this.isGrounded) {
                    // 【空中から接地した瞬間】
                    this.isGrounded = true;
                    this.startLockDown(CONTROLLER_CONFIG.LOCK_DOWN_DURATION);
                    this.triggerLandingBounce();
                } else {
                    // 【すでに接地している状態で移動・回転した時】
                    this.resetLockDownTimer(CONTROLLER_CONFIG.LOCK_DOWN_DURATION);
                    // 接地中の移動・回転でも少しバウンスさせて手応えを出す
                    this.triggerLandingBounce();
                }

                if (action === 'down' && this.downKey && this.downKey.isDown) {
                    this.landPuyo(true);
                    console.log('immediate landing')
                }
            }
        //}
    }

    private startLockDown(duration: number) {
        this.cancelLockDown();
        this.lockDownTween = this.scene.tweens.add({
            targets: { val: 0 },
            val: 1,
            duration: duration,
            onComplete: () => {
                this.landPuyo();
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

    private async landPuyo(softDrop: boolean = false) {
        if (this.isChaining) return;
        this.isChaining = true;
        this.cancelLockDown();
        this.lockDownResetCount = 0;
        this.isGrounded = false;
        
        // 【重要】盤面に固定する前に、現在の位置から接地しているぷよを特定する
        const landingPlaces = JSON.parse(JSON.stringify(this.player.place));
        const isDirectlyGrounded = this.player.place.map((p) => !this.player.isValidPosition(p.x, p.y - 0.5));
        const groundedIndices: number[] = [];
        isDirectlyGrounded.forEach((isGrounded, i) => {
            if (isGrounded) {
                groundedIndices.push(i);
            } else {
                const other = 1 - i;
                if (isDirectlyGrounded[other] && 
                    this.player.place[i].x === this.player.place[other].x && 
                    this.player.place[i].y > this.player.place[other].y) {
                    groundedIndices.push(i);
                }
            }
        });

        // 盤面を更新
        this.player.fixToBoard();
        this.boardView.updateBoard(this.player.board.grid);
        
        if(softDrop && groundedIndices.length > 0){
            // 盤面更新後に、特定したインデックスに対してバウンドを実行
            this.boardView.animateLandingBounce(landingPlaces, groundedIndices);
        }
        
        const initialDrops = this.player.board.drop();

        /*
        if (forceWait && initialDrops.length == 0) { //高速落下かつちぎりなし
            await this.boardView.wait(CONTROLLER_CONFIG.SOFT_DROP_LANDING_DELAY);
        }
        */

        if (initialDrops.length > 0) {
            await this.boardView.animateDrops(initialDrops);
            //await this.boardView.wait(CONTROLLER_CONFIG.CHIGIRI_WAIT_DURATION);
        }
        await this.boardView.wait(CONTROLLER_CONFIG.WAIT_DURAION);
        
        this.boardView.updateBoard(this.player.board.grid);

        this.chainCount = 1;
        await this.processChain();
    }

    private async processChain() {
        /*
        if (this.chainCount > 1) {
            await this.boardView.wait(CONTROLLER_CONFIG.CHAIN_STEP_WAIT_DURATION);
        }
        */

        const step = this.player.executeChainStep(this.chainCount);
        if (step) {
            this.scoreView.updateScore(this.player.score);
            this.acView.update(this.player.allClear);
            
            await this.boardView.animateChainStep(step);
            this.boardView.updateBoard(this.player.board.grid);
            
            this.chainCount++;
            await this.boardView.wait(CONTROLLER_CONFIG.WAIT_DURAION);
            await this.processChain();
        } else {
            /*
            if (this.chainCount === 1) {
                await this.boardView.wait(CONTROLLER_CONFIG.LANDING_WAIT_DURATION);
            }
            */

            this.player.checkAllClear();
            this.acView.update(this.player.allClear);

            this.isChaining = false;
            this.player.drop();
            this.boardView.animateMove(this.player.place, this.player.place, this.player.moving);
            this.nextView.updateNext(this.player.next);
        }
    }

    private triggerLandingBounce() {
        // 読み取り専用で座標を渡し、BoardView側で処理させる（ディープコピーを避ける）
        const landingPlaces = this.player.place;
        const isDirectlyGrounded = landingPlaces.map((p) => !this.player.isValidPosition(p.x, p.y - 0.5));
        const groundedIndices: number[] = [];
        
        isDirectlyGrounded.forEach((isGrounded, i) => {
            if (isGrounded) {
                groundedIndices.push(i);
            } else {
                const other = 1 - i;
                if (isDirectlyGrounded[other] && 
                    landingPlaces[i].x === landingPlaces[other].x && 
                    landingPlaces[i].y > landingPlaces[other].y) {
                    groundedIndices.push(i);
                }
            }
        });
        
        if (groundedIndices.length > 0) {
            this.boardView.animateLandingBounce(landingPlaces, groundedIndices);
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
        // 毎フレームの canMoveDown() チェックを廃止し、キャッシュされた isGrounded を使用
        if (this.isGrounded) {
            this.dropTimer = 0;
            // 接地中の追加処理（ロックダウン等）は handleAction と Tweens で管理されているため
            // ここでの毎フレーム計算は不要
        } else {
            this.dropTimer += delta;
            const isSoftDropping = this.downKey && this.downKey.isDown;
            const interval = isSoftDropping ? CONTROLLER_CONFIG.SOFT_DROP_INTERVAL : CONTROLLER_CONFIG.DROP_INTERVAL;

            if (this.dropTimer >= interval) {
                this.handleAction('down');
                this.dropTimer = 0;
            }
        }
    }
}
