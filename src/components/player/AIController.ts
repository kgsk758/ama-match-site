import Controller from "./Controller";
import Player from "../../puyo-engine/core/Player";
import { PLAYER_CONFIG } from "../../constants";

export default class AIController extends Controller {
    protected targetX: number = 2;
    protected targetR: number = 0; // 0:UP, 1:RIGHT, 2:DOWN, 3:LEFT
    protected aiReady: boolean = false;
    protected static wasmModule: any = null;

    constructor(player: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        super(player, scene, place, config);
        this.initAI();
    }

    async initAI() {
        if (!AIController.wasmModule) {
            // Assume createAmaAI is available globally or imported
            // In a real Vite project, you'd handle this via import or a manager
            if ((window as any).createAmaAI) {
                AIController.wasmModule = await (window as any).createAmaAI();
                const response = await fetch('assets/config.json');
                const configJson = await response.text();
                AIController.wasmModule.initAI(configJson);
            }
        }
        this.aiReady = !!AIController.wasmModule;
    }

    protected dropTsumo() {
        super.dropTsumo();
        if (this.aiReady) {
            this.think();
        }
    }

    protected think() {
        const wasm = AIController.wasmModule;
        wasm.clearField(0);
        wasm.clearField(1);

        // Sync player board (Self = 0)
        this.player.board.grid.forEach((col, x) => {
            col.forEach((cell, y) => {
                if (cell !== 5) { // 5 is NONE
                    wasm.setField(0, x, y, cell);
                }
            });
        });

        // Sync queue
        const colors: number[] = [];
        this.player.moving.forEach(c => colors.push(c));
        this.player.next.forEach(pair => {
            pair.forEach(c => colors.push(c));
        });
        
        const vector = new wasm.VectorInt();
        colors.forEach(c => vector.push_back(c));
        wasm.setQueue(0, vector);
        vector.delete();

        wasm.setStats(0, 0, this.player.allClear, 0); // Simplified stats

        // Run AI
        const result = wasm.runThink(70);
        this.targetX = result.x;
        this.targetR = result.r;
        console.log(`AI Target: x=${this.targetX}, r=${this.targetR}`);
    }

    public update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;
        if (this.currentState !== 'FALLING') return;

        // Current state
        const currentX = this.player.place[0].x;
        // Calculate current rotation (0:UP, 1:RIGHT, 2:DOWN, 3:LEFT)
        const dx = this.player.place[1].x - this.player.place[0].x;
        const dy = this.player.place[1].y - this.player.place[0].y;
        let currentR = 0;
        if (dy > 0.1) currentR = 0;
        else if (dx > 0.1) currentR = 1;
        else if (dy < -0.1) currentR = 2;
        else if (dx < -0.1) currentR = 3;

        // 1. Handle Rotation
        if (currentR !== this.targetR) {
            this.moveCount += delta;
            if (this.moveCount >= 100) { // AI movement speed
                this.moveCount = 0;
                // Simple logic: always rotate right until target reached
                const temp = structuredClone(this.player.place);
                this.player.rotateRight();
                const p = this.boardView.rotateRight(temp, this.player.place);
                if (p) this.movingAnimations.push(p);
            }
            return;
        }

        // 2. Handle Horizontal Movement
        if (currentX !== this.targetX) {
            this.moveCount += delta;
            if (this.moveCount >= 100) {
                this.moveCount = 0;
                if (currentX < this.targetX) this.moveRight();
                else this.moveLeft();
            }
            return;
        }

        // 3. Drop
        this.dropCount += delta;
        if (this.dropCount >= 50) { // Faster drop for AI
            this.dropCount = 0;
            if (this.player.canMoveDown()) {
                this.dropStep();
            } else {
                this.landPuyo();
            }
        }
    }
}
