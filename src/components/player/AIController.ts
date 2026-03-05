import Controller from "./Controller";
import Player from "../../puyo-engine/core/Player";
import aiConfig from "../../../public/assets/config.json";

export default class AIController extends Controller {
    protected targetX: number = 2;
    protected targetR: number = 0; 
    protected aiReady: boolean = false;
    protected static wasmModule: any = null;
    private enemy: Player;
    
    // Timer to prevent getting stuck if movement is blocked
    protected stuckTimer: number = 0;

    constructor(self: Player, enemy: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        super(self, scene, place, config);
        this.enemy = enemy;
        this.initAI();
    }

    async initAI() {
        console.log("AI: Initializing...");
        if (!AIController.wasmModule) {
            const createAmaAI = (window as any).createAmaAI;
            if (createAmaAI) {
                try {
                    AIController.wasmModule = await createAmaAI({
                        locateFile: (path: string) => `/assets/${path}`
                    });
                    AIController.wasmModule.initAI(JSON.stringify(aiConfig));
                    console.log("AI: WASM and Config Loaded.");
                } catch (e) {
                    console.error("AI: Init Error:", e);
                }
            }
        }
        this.aiReady = !!AIController.wasmModule;
    }

    protected dropTsumo() {
        this.stuckTimer = 0; // Reset timer
        if (this.aiReady) {
            this.think();
        }
        super.dropTsumo(); // Create new puyo AFTER thinking
    }

    protected think() {
        const wasm = AIController.wasmModule;
        if (!wasm || !this.enemy) return;

        const selfPlayer = this.player;
        const enemyPlayer = this.enemy;
        const TARGET_POINT = 70;

        [selfPlayer, enemyPlayer].forEach((p, idx) => {
            if (!p) return;
            wasm.clearField(idx);

            p.board.grid.forEach((col: number[], x: number) => {
                col.forEach((cell: number, y: number) => {
                    if (cell < 5) wasm.setField(idx, x, y, cell);
                });
            });

            // Sync Queue (Thinking BEFORE drop, so next[0] is about to be 'moving')
            const vector = new wasm.VectorInt();
            if (idx === 0) {
                // Self: needs 3 pairs
                // 1. p.next[0] (Will be current)
                // 2. p.next[1] (Will be next1)
                // 3. (p as any).queue.queue[0] (Will be next2)
                const next0 = p.next[0];
                const next1 = p.next[1];
                const headOfQueue = (p as any).queue?.queue[0];

                if (next0) next0.forEach((c: number) => vector.push_back(c));
                if (next1) next1.forEach((c: number) => vector.push_back(c));
                if (headOfQueue) headOfQueue.forEach((c: number) => vector.push_back(c));
            } else {
                // Enemy: needs 2 pairs for prediction
                // 1. p.next[0]
                // 2. p.next[1]
                const next0 = p.next[0];
                const next1 = p.next[1];
                if (next0) next0.forEach((c: number) => vector.push_back(c));
                if (next1) next1.forEach((c: number) => vector.push_back(c));
            }
            
            if (vector.size() >= 2) {
                wasm.setQueue(idx, vector);
            }
            vector.delete();

            const stats = p.getStats(TARGET_POINT);
            wasm.setStats(idx, stats.attack, stats.attack_chain, stats.attack_frame, 0, stats.allClear, 0);
        });

        const result = wasm.runThink(TARGET_POINT);
        this.targetX = result.x;
        this.targetR = result.r;
        console.log(`AI Think: targetX=${this.targetX}, targetR=${this.targetR}`);
    }

    public update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;
        
        // Only act when falling
        if (this.currentState !== 'FALLING') return;

        this.stuckTimer += delta;

        const currentX = this.player.place[0].x;
        const dx = this.player.place[1].x - this.player.place[0].x;
        const dy = this.player.place[1].y - this.player.place[0].y;
        
        let currentR = 0;
        if (dy > 0.1) currentR = 0;
        else if (dx > 0.1) currentR = 1;
        else if (dy < -0.1) currentR = 2;
        else if (dx < -0.1) currentR = 3;

        // If taking too long (over 2 seconds), give up on target and just drop
        const isStuck = this.stuckTimer > 2000;

        // 1. Handle Rotation
        if (!isStuck && currentR !== this.targetR) {
            this.moveCount += delta;
            if (this.moveCount >= 100) {
                this.moveCount = 0;
                const temp = structuredClone(this.player.place);
                this.player.rotateRight();
                const p = this.boardView.rotateRight(temp, this.player.place);
                if (p) this.movingAnimations.push(p);
            }
            return;
        }

        // 2. Handle Horizontal Movement
        if (!isStuck && currentX !== this.targetX) {
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
        if (this.dropCount >= 50) {
            this.dropCount = 0;
            if (this.player.canMoveDown()) {
                this.dropStep();
            } else {
                this.landPuyo();
            }
        }
    }
}
