// src/components/player/AIController.ts
import Controller from "./Controller";
import Player from "../../puyo-engine/core/Player";
import { AIBridge } from "../../ai/bridge";
import { AIThinkRequest } from "../../ai/types";
import { CONTROLLER_CONFIG } from "./controller-config";
import GameManager from "../../puyo-engine/core/GameManager";
import { ANIMATION_CONFIG } from "../../puyo-engine/core/core-config";

type MoveInput = 'LEFT' | 'RIGHT' | 'ROTATE_R' | 'ROTATE_L' | 'DOWN';

export default class AIController extends Controller {
    protected targetX: number = 2;
    protected targetR: number = 0;
    private enemy: Player;
    private aiBridge: AIBridge;

    private moveQueue: MoveInput[] = [];
    private pathfindingInterval: number = 100; // ms

    constructor(player: Player, enemy: Player, gameManager: GameManager, playerIndex: number, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        super(player, gameManager, playerIndex, scene, place, config);
        this.enemy = enemy;
        this.aiBridge = AIBridge.getInstance();
        this.aiBridge.init();
    }

    protected dropTsumo() {
        if (this.aiBridge && this.aiBridge.isReady()) {
            this.think();
        }
        super.dropTsumo();
    }

    protected think() {
        if (!this.enemy) return;
        const TARGET_POINT = 70;
        const request: AIThinkRequest = {
            selfData: this.player.getAIPlayerData(TARGET_POINT, true), 
            enemyData: this.enemy.getAIPlayerData(TARGET_POINT, false),
            targetPoint: TARGET_POINT
        };

        this.aiBridge.think(request, (result) => {
            this.targetX = result.x;
            this.targetR = result.r;
            this.moveQueue = this.findPath(this.targetX, this.targetR);
        });
    }

    /**
     * 現在のぷよの向きを取得 (0:UP, 1:RIGHT, 2:DOWN, 3:LEFT)
     */
    private getCurrentR(place: {x:number, y:number}[]): number {
        const dx = Math.round(place[1].x - place[0].x);
        const dy = Math.round(place[1].y - place[0].y);
        
        if (dy > 0) return 0; // UP
        if (dx > 0) return 1; // RIGHT
        if (dy < 0) return 2; // DOWN
        if (dx < 0) return 3; // LEFT
        return 0;
    }

    /**
     * BFS Pathfinding to find exact move sequence
     */
    private findPath(tx: number, tr: number): MoveInput[] {
        interface State {
            x: number;
            y: number;
            r: number;
            path: MoveInput[];
        }

        const startX = this.player.place[0].x;
        const startY = Math.floor(this.player.place[0].y);
        const startR = this.getCurrentR(this.player.place);

        const queue: State[] = [{ x: startX, y: startY, r: startR, path: [] }];
        const visited = new Set<string>();
        visited.add(`${startX},${startY},${startR}`);

        // 最大探索ステップ数 (無限ループ防止)
        let steps = 0;
        const MAX_STEPS = 1000;

        while (queue.length > 0 && steps < MAX_STEPS) {
            steps++;
            const curr = queue.shift()!;

            // 勝利条件: 目標のX座標かつ目標の回転状態
            if (curr.x === tx && curr.r === tr) {
                return curr.path;
            }

            // 4方向のアクション
            const moves: { input: MoveInput, action: () => void }[] = [
                { input: 'LEFT', action: () => this.player.moveLeft() },
                { input: 'RIGHT', action: () => this.player.moveRight() },
                { input: 'ROTATE_R', action: () => this.player.rotateRight() },
                { input: 'ROTATE_L', action: () => this.player.rotateLeft() }
            ];

            for (const move of moves) {
                const originalPlace = JSON.stringify(this.player.place);
                move.action();
                const nextPlace = JSON.stringify(this.player.place);

                if (originalPlace !== nextPlace) {
                    const nx = this.player.place[0].x;
                    const ny = Math.floor(this.player.place[0].y);
                    const nr = this.getCurrentR(this.player.place);

                    const key = `${nx},${ny},${nr}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, r: nr, path: [...curr.path, move.input] });
                    }
                }
                this.player.place = JSON.parse(originalPlace);
            }
        }

        // 到達できなかった場合は、せめて向きだけでも合わせるか、
        // X座標が近いものを選ぶなどのフォールバックが必要だが、
        // 今は空の手順（その場で落とす）を返す
        return [];
    }

    public update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;
        if (this.currentState !== 'FALLING') return;

        this.moveCount += delta;

        // 目標地点までの移動キューがある場合はそれを優先
        if (this.moveQueue.length > 0) {
            if (this.moveCount >= 50) {
                const move = this.moveQueue.shift()!;
                this.moveCount = 0;

                const temp = structuredClone(this.player.place);
                switch (move) {
                    case 'LEFT': this.moveLeft(); break;
                    case 'RIGHT': this.moveRight(); break;
                    case 'ROTATE_R': 
                        this.player.rotateRight(); 
                        (this as any).boardView.rotateRight(temp, this.player.place);
                        break;
                    case 'ROTATE_L': 
                        this.player.rotateLeft(); 
                        (this as any).boardView.rotateLeft(temp, this.player.place);
                        break;
                }
            }
        } else {
            // 移動キューが空（目標地点に到達済み）なら高速落下
            this.dropCount += delta;
            if (this.dropCount >= 20) {
                this.dropCount = 0;
                if (this.player.canMoveDown()) {
                    this.dropStep();
                } else {
                    this.landPuyo();
                }
            }
        }
    }
}
