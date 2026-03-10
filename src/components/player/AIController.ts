// src/components/player/AIController.ts
import Controller from "./Controller";
import Player from "../../puyo-engine/core/Player";
import { AIBridge } from "../../ai/bridge";
import { AIPlayerData, AIThinkRequest } from "../../ai/types";

export default class AIController extends Controller {
    protected targetX: number = 2;
    protected targetR: number = 0;
    private enemy: Player;
    private aiBridge: AIBridge;

    // Timer to prevent getting stuck if movement is blocked
    protected stuckTimer: number = 0;

    constructor(self: Player, enemy: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        super(self, scene, place, config); // Note: parent expects 'player' but we receive it as 'self'
        this.enemy = enemy;
        this.aiBridge = AIBridge.getInstance();
        this.aiBridge.init();
    }

    protected dropTsumo() {
        this.stuckTimer = 0; // Reset timer
        if (this.aiBridge && this.aiBridge.isReady()) {
            this.think();
        }
        super.dropTsumo(); // Create new puyo AFTER triggering think
    }

    protected think() {
        if (!this.enemy) return;

        const TARGET_POINT = 70;

        const preparePlayerData = (p: Player, isSelf: boolean): AIPlayerData => {
            const stats = p.getStats(TARGET_POINT);
            const queue: number[] = [];

            if (isSelf) {
                const next0 = p.next[0];
                const next1 = p.next[1];
                const headOfQueue = (p as any).queue?.queue[0];
                if (next0) next0.forEach((c: number) => queue.push(c));
                if (next1) next1.forEach((c: number) => queue.push(c));
                if (headOfQueue) headOfQueue.forEach((c: number) => queue.push(c));
            } else {
                const next0 = p.next[0];
                const next1 = p.next[1];
                if (next0) next0.forEach((c: number) => queue.push(c));
                if (next1) next1.forEach((c: number) => queue.push(c));
            }

            return {
                grid: p.board.grid.map(col => [...col]),
                queue: queue,
                stats: {
                    attack: stats.attack,
                    attack_chain: stats.attack_chain,
                    attack_frame: stats.attack_frame,
                    allClear: stats.allClear
                }
            };
        };

        const request: AIThinkRequest = {
            selfData: preparePlayerData(this.player, true), // Controller has protected this.player
            enemyData: preparePlayerData(this.enemy, false),
            targetPoint: TARGET_POINT
        };

        this.aiBridge.think(request, (result) => {
            this.targetX = result.x;
            this.targetR = result.r;
            console.log(`AI Think Result: targetX=${this.targetX}, targetR=${this.targetR}`);
        });
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
