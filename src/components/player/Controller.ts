import Phaser from "phaser";
import Player from "../../puyo-engine/core/Player";
import BoardView from "./BoardView";
import GarbageView from "./GarbageView";
import ScoreView from "./ScoreView";
import NextView from "./NextView";
import { PLAYER_CONFIG } from "../../constants";

export default class Controller {
    private player: Player;
    private scene: Phaser.Scene;
    private boardView: BoardView;
    private garbageView: GarbageView;
    private scoreView: ScoreView;
    private nextView: NextView;

    private dropTimer: number = 0;
    private readonly DROP_INTERVAL = 1000; 
    private readonly SOFT_DROP_INTERVAL = 50; // 下入力時のインターバル
    private downKey: Phaser.Input.Keyboard.Key | null = null;

    private isChaining: boolean = false;
    private chainCount: number = 0;

    constructor(player: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        this.player = player;
        this.scene = scene;

        this.boardView = new BoardView(scene, place.x, place.y);
        this.garbageView = new GarbageView(scene, place.x, place.y);
        this.scoreView = new ScoreView(scene, place.x, place.y);
        this.nextView = new NextView(scene, place.x, place.y);

        this.player.drop();
        this.boardView.animateMove(this.player.place, this.player.place, this.player.moving);
        this.nextView.updateNext(this.player.next);

        if (config.type === PLAYER_CONFIG.HUMAN) {
            if (this.scene.input.keyboard) {
                this.downKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
            }
            this.setupInput();
        }
    }

    private setupInput() {
        if (!this.scene.input.keyboard) return;
        this.scene.input.keyboard.on('keydown-LEFT', () => this.handleAction('left'));
        this.scene.input.keyboard.on('keydown-RIGHT', () => this.handleAction('right'));
        // keydown-DOWN はそのまま残すことで、押した瞬間に1マス落ちる挙動を維持
        this.scene.input.keyboard.on('keydown-DOWN', () => this.handleAction('down'));
        this.scene.input.keyboard.on('keydown-UP', () => this.handleAction('rotate-right'));
        this.scene.input.keyboard.on('keydown-X', () => this.handleAction('rotate-right'));
        this.scene.input.keyboard.on('keydown-Z', () => this.handleAction('rotate-left'));
    }

    private handleAction(action: 'left' | 'right' | 'down' | 'rotate-left' | 'rotate-right') {
        if (this.isChaining || !(this.scene as any).gamePlaying) return;

        const oldPlace = JSON.parse(JSON.stringify(this.player.place));
        let success = false;

        switch (action) {
            case 'left': success = this.player.moveLeft(); break;
            case 'right': success = this.player.moveRight(); break;
            case 'down': success = this.player.moveDown(); break;
            case 'rotate-left': this.player.rotateLeft(); success = true; break;
            case 'rotate-right': this.player.rotateRight(); success = true; break;
        }

        if (success) {
            this.boardView.animateMove(oldPlace, this.player.place, this.player.moving);
        } else if (action === 'down') {
            this.landPuyo();
        }
    }

    private async landPuyo() {
        if (this.isChaining) return;
        this.isChaining = true;
        
        // 1. 盤面に固定 (この時点ではまだ浮いている)
        this.player.fixToBoard();
        this.boardView.updateBoard(this.player.board.grid); // 浮いた状態で一度描画
        
        // 2. 落下計算 (ロジック上の座標が更新される)
        const initialDrops = this.player.board.drop();
        
        if (initialDrops.length > 0) {
            // アニメーション実行 (浮いている位置から落下先へ動かす)
            await this.boardView.animateDrops(initialDrops);
        }
        
        // 最終的な盤面状態に同期
        this.boardView.updateBoard(this.player.board.grid);

        // 3. 連鎖開始
        this.chainCount = 1;
        await this.processChain();
    }

    private async processChain() {
        // 連鎖判定の前に一律で待機（設置後の余韻）
        await this.boardView.wait(250);

        const step = this.player.board.executeChainStep(this.chainCount);
        if (step) {
            this.player.score += step.score;
            this.scoreView.updateScore(this.player.score);
            
            await this.boardView.animateChainStep(step);
            // 同期のために盤面を再描画
            this.boardView.updateBoard(this.player.board.grid);
            
            this.chainCount++;
            await this.processChain();
        } else {
            // 連鎖終了
            this.isChaining = false;
            this.player.drop();
            // 新しいぷよの出現とネクストの更新
            this.boardView.animateMove(this.player.place, this.player.place, this.player.moving);
            this.nextView.updateNext(this.player.next);
        }
    }

    public update(time: number, delta: number) {
        if (this.isChaining) return;

        if (!delta) delta = 16; 
        this.dropTimer += delta;

        // 下キーが押されている場合は高速落下のインターバルを使用
        const interval = (this.downKey && this.downKey.isDown) ? this.SOFT_DROP_INTERVAL : this.DROP_INTERVAL;

        if (this.dropTimer >= interval) {
            this.handleAction('down');
            this.dropTimer = 0;
        }
    }
}
