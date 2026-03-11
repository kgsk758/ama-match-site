// src/puyo-engine/core/Player.ts
import Board from "./Board";
import Queue from "./Queue";
import { SEED_CONFIG, SCORE_PER_GARBAGE, SCORE_CONFIG, ANIMATION_CONFIG } from "./core-config";

export default class Player {
    public board: Board;
    public moving: number[];
    public next: number[][];
    private queue: Queue;
    public allClear: boolean;
    public place: {x:number,y:number}[];
    private dropPlace: {x:number, y:number};
    public deathPlace: {x:number,y:number};
    
    public score: number = 0;
    private attack_score: number = 0;
    public attack: number = 0;         // 現在の連鎖で発生した未送信の攻撃力
    public pendingGarbage: number = 0; // 相手から送られてきた、次に降るお邪魔ぷよ
    public currentChain: number = 0;   // 現在進行中の連鎖数

    constructor(queueInst: Queue){
        this.queue = queueInst;
        this.board = new Board();
        this.place = [{x:0,y:0},{x:0,y:0}];
        this.moving = [];
        this.next = [this.queue.popQueue(), this.queue.popQueue()];
        this.allClear = false;
        this.dropPlace = this.board.getDropPlace();
        this.deathPlace = this.board.getDeathPlace();
    }

    public executeChainStep(chainCount: number) {
        const step = this.board.executeChainStep(chainCount);
        if (step) {
            this.currentChain = chainCount; // 現在の連鎖数を記録
            if (this.allClear && chainCount === 1) {
                step.score += SCORE_CONFIG.ALL_CLEAR_BONUS;
                this.allClear = false;
            }
            this.score += step.score;
            this.attack_score += step.score;
            
            // 攻撃力を計算
            const newAttack = Math.floor(this.attack_score / SCORE_PER_GARBAGE);
            if (newAttack > 0) {
                this.attack += newAttack;
                this.attack_score = this.attack_score % SCORE_PER_GARBAGE;
                // 自分の連鎖中に、自分に溜まっているお邪魔を即座に相殺する
                this.offsetMyGarbage();
            }
        }
        return step;
    }

    /**
     * 自分の攻撃力(attack)で、自分に届いているお邪魔(pendingGarbage)を相殺する
     */
    private offsetMyGarbage() {
        if (this.attack <= 0 || this.pendingGarbage <= 0) return;

        if (this.attack >= this.pendingGarbage) {
            this.attack -= this.pendingGarbage;
            this.pendingGarbage = 0;
        } else {
            this.pendingGarbage -= this.attack;
            this.attack = 0;
        }
    }

    /**
     * 連鎖終了時、残った攻撃力を取り出す（リセットする）
     */
    public consumeAttack(): number {
        const leftover = this.attack;
        this.attack = 0;
        return leftover;
    }

    public dropGarbage(): {x: number, y: number}[]{
        const placed = this.board.dropGarbage(this.pendingGarbage);
        this.pendingGarbage -= placed.length;
        return placed;
    }

    public drop(){
        this.currentChain = 0; // 次のツモが来たら連鎖カウントをリセット
        this.moving = this.next.shift()!;
        this.next.push(this.queue.popQueue());
        this.place = [{x: this.dropPlace.x, y: this.dropPlace.y}, {x:this.dropPlace.x,y:this.dropPlace.y+1}];
        this.lastRotation = 'none';
    }

    public fixToBoard(){
        this.place.forEach((p, i) => {
            this.board.setPuyo(p.x, Math.floor(p.y), this.moving[i]);
        });
        this.board.drop();
        this.moving = [];
    }

    public moveDown(): boolean{
        const step = 0.5
        const newPlace: {x:number,y:number}[]=[];
        let valid = true;
        this.place.forEach((p)=>{
            const ny = p.y - step;
            if(!this.isValidPosition(p.x, ny)){
                valid = false;
            }
            newPlace.push({x:p.x, y:ny});
        });
        if(valid){
            this.place = newPlace;
            return true;
        }
        return false;
    }

    public canMoveDown(): boolean {
        const step = 0.5;
        let valid = true;
        this.place.forEach((p) => {
            if (!this.isValidPosition(p.x, p.y - step)) {
                valid = false;
            }
        });
        return valid;
    }

    public moveLeft(): boolean {
        const step = 1;
        const newPlace: {x:number,y:number}[]=[];
        let valid = true;
        this.place.forEach((p)=>{
            const nx = p.x - step;
            if(!this.isValidPosition(nx, p.y)){
                valid = false;
            }
            newPlace.push({x:nx, y:p.y});
        });
        if(valid){
            this.place = newPlace;
            return true;
        }
        return false;
    }

    public moveRight(): boolean {
        const step = 1;
        const newPlace: {x:number,y:number}[]=[];
        let valid = true;
        this.place.forEach((p)=>{
            const nx = p.x + step;
            if(!this.isValidPosition(nx, p.y)){
                valid = false;
            }
            newPlace.push({x:nx, y:p.y});
        });
        if(valid){
            this.place = newPlace;
            return true;
        }
        return false;
    }

    private lastRotation:  'left' | 'right' | 'none' = 'none'

    public rotateLeft(){
        this.performRotation('left');
    }
    public rotateRight(){
        this.performRotation('right');
    }

    private performRotation(direction: 'left' | 'right') {
        const p0 = this.place[0];
        const p1 = this.place[1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const [nx, ny] = (direction === 'left') ? [p0.x - dy, p0.y + dx] : [p0.x + dy, p0.y - dx];
    
        if (this.isValidPosition(nx, ny)) {
            this.place[1] = { x: nx, y: ny };
            this.lastRotation = direction;
            return;
        }
    
        const preferredSx = nx > p0.x ? -1 : (nx < p0.x ? 1 : 0);
        if (preferredSx !== 0) {
            for (const sx of [preferredSx, -preferredSx]) {
                if (this.isValidPosition(p0.x + sx, p0.y) && this.isValidPosition(nx + sx, ny)) {
                    this.place[0].x += sx;
                    this.place[1] = { x: nx + sx, y: ny };
                    this.lastRotation = direction;
                    return;
                }
            }
        }

        const isGroundClip = Math.floor(Math.min(ny, p0.y)) < 0 || (this.isValidPosition(nx, ny) === false && ny < p0.y);
        if (isGroundClip) {
            if (this.isValidPosition(p0.x, p0.y + 0.5) && this.isValidPosition(nx, ny + 0.5)) {
                this.place[0].y += 0.5;
                this.place[1] = { x: nx, y: ny + 0.5 };
                this.lastRotation = direction;
                return;
            }
            if (this.isValidPosition(p0.x, p0.y + 1) && this.isValidPosition(nx, ny + 1)) {
                if(p0.y + 1 >= this.board.rows - 1) return; 
                this.place[0].y += 1;
                this.place[1] = { x: nx, y: ny + 1 };
                this.lastRotation = direction;
                return;
            }
        }
    
        if (this.lastRotation !== 'none' && this.place[0].x === this.place[1].x) {
            const temp = this.place[0];
            this.place[0] = this.place[1];
            this.place[1] = temp;
            this.lastRotation = 'none';
            return;
        }
        this.lastRotation = direction;
    }

    public isValidPosition(x: number, y: number): boolean {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (!this.board.isValid(ix, iy)) return false;
        if (y !== iy && !this.board.isValid(ix, iy + 1)) return false;
        return true;
    }

    public getStats(targetPoint: number, includeMoving: boolean = true): {
        attack: number;
        attack_frame: number;
        attack_chain: number;
        allClear: boolean;
    } {
        const tempBoard = new Board({
            rows: this.board.rows,
            columns: this.board.columns
        });
        tempBoard.grid = this.board.grid.map(col => [...col]);

        let totalDuration = 0;
        const MS_TO_FRAME = 60 / 1000;
        const FRAME_DELAY = 22; 
        const INITIAL_COST = 20; 

        // 1. 設置までの時間のシミュレーション
        if (includeMoving && this.moving && this.moving.length > 0) {
            totalDuration += INITIAL_COST;

            const x0 = Math.floor(this.place[0].x);
            const x1 = Math.floor(this.place[1].x);
            let targetY0 = 0;
            let targetY1 = 0;
            for (let y = 0; y < this.board.rows; y++) {
                if (tempBoard.grid[x0][y] === 5) { targetY0 = y; break; }
            }
            for (let y = 0; y < this.board.rows; y++) {
                if (tempBoard.grid[x1][y] === 5) { targetY1 = y; break; }
            }

            const dropDist = Math.max(0, Math.min(this.place[0].y - targetY0, this.place[1].y - targetY1));
            totalDuration += dropDist * 250; 

            const isVertical = x0 === x1;
            if (!isVertical) {
                const p0Grounded = !this.board.isValid(x0, Math.floor(this.place[0].y - 0.5));
                const p1Grounded = !this.board.isValid(x1, Math.floor(this.place[1].y - 0.5));
                if (!p0Grounded || !p1Grounded) {
                    totalDuration += ANIMATION_CONFIG.LAND_DURATION + ANIMATION_CONFIG.BOUNCE_DURATION + (FRAME_DELAY * 2);
                }
            }

            this.place.forEach((p, i) => {
                tempBoard.setPuyo(p.x, Math.floor(p.y), this.moving[i]);
            });
            tempBoard.drop();
        }

        let totalScore = this.attack_score; 
        let predictedChainCount = 0;
        let chainSimCount = this.currentChain + 1; // 現在の連鎖の続きからシミュレート

        // 2. 連鎖アニメーションのシミュレーション
        while (true) {
            const connects = tempBoard.getConnected();
            if (connects.length === 0) break;

            totalDuration += ANIMATION_CONFIG.POP_DURATION + FRAME_DELAY;

            const chainStepResult = tempBoard.executeChainStep(chainSimCount);
            if (!chainStepResult) break;

            predictedChainCount++;
            totalScore += chainStepResult.score;

            if (chainStepResult.drops.length > 0) {
                const maxDropDistance = Math.max(...chainStepResult.drops.map(d => d.fromY - d.toY));
                totalDuration += ANIMATION_CONFIG.DROP_BASE_DURATION + (maxDropDistance * ANIMATION_CONFIG.DROP_PER_CELL) + ANIMATION_CONFIG.BOUNCE_DURATION + (FRAME_DELAY * 2);
            }

            totalDuration += ANIMATION_CONFIG.CHAIN_STEP_WAIT + FRAME_DELAY;
            chainSimCount++;
        }

        if (predictedChainCount === 0 && (this.currentChain === 0 || chainSimCount === this.currentChain + 1)) {
            totalDuration += ANIMATION_CONFIG.CHAIN_STEP_WAIT + FRAME_DELAY;
        }

        const futureAttack = Math.floor(totalScore / targetPoint);

        return {
            attack: this.attack + futureAttack,
            attack_frame: Math.floor(totalDuration * MS_TO_FRAME),
            attack_chain: this.currentChain + predictedChainCount,
            allClear: this.allClear && tempBoard.isEmpty()
        };
    }

    /**
     * AIに渡すための現在のプレイヤー状態を取得する
     */
    public getAIPlayerData(targetPoint: number, isSelf: boolean): any {
        const stats = this.getStats(targetPoint, false);
        const queue: number[] = [];

        this.next.forEach(t => t.forEach(c => queue.push(c)));
        if (isSelf && (this as any).queue?.queue) {
            const extra = (this as any).queue.queue[0];
            if (extra) extra.forEach((c: number) => queue.push(c));
        }

        return {
            grid: this.board.grid.map(col => [...col]),
            queue: queue,
            stats: {
                attack: stats.attack,
                attack_chain: stats.attack_chain,
                attack_frame: stats.attack_frame,
                allClear: stats.allClear
            }
        };
    }
}
