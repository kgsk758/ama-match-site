import Board from "./Board";
import Queue from "./Queue";
import { SEED_CONFIG, SCORE_PER_GARBAGE } from "./core-config";
export default class Player {
    public board: Board;
    public moving: number[];
    public next: number[][];
    private queue: Queue;
    public allClear: boolean;
    public place: {x:number,y:number}[];
    private dropPlace: {x:number, y:number};
    public deathPlace: {x:number,y:number};
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
    public score: number = 0;
    private attack_score: number = 0;
    private attack: number = 0;
    /**
     * 連鎖を実行,スコアに加算,お邪魔数生成,連鎖情報を返す。
     */
    public getChain(): {
        cleared: {
            cell: number;
            places: {
                x: number;
                y: number;
            }[];
        }[];
        drops: {
            x: number;
            fromY: number;
            toY: number;
            cell: number;
        }[];
        score: number;
    }[]{
        const chain = this.board.getChain();
        chain.forEach((c)=>{
            this.score += c.score;
            this.attack_score += c.score;
        })
        this.attack += Math.floor(this.attack_score / SCORE_PER_GARBAGE);
        this.attack_score = this.attack_score % SCORE_PER_GARBAGE;
        return chain;
    }
    public drop(){
        this.moving = this.next.shift()!;
        this.next.push(this.queue.popQueue());
        this.place = [this.dropPlace, {x:this.dropPlace.x,y:this.dropPlace.y+1}];
    }
    public fixToBoard(){
        this.place.forEach((p, i) => {
            this.board.setPuyo(p.x, Math.floor(p.y), this.moving[i]);
        });
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

    private updateLastRotation(direction: 'left' | 'right') {
        this.lastRotation = direction;
    }

    private performRotation(direction: 'left' | 'right') {
        const p0 = this.place[0];
        const p1 = this.place[1];
    
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
    
        const [nx, ny] = (() => {
            if (direction === 'left') return [p0.x - dy, p0.y + dx];
            return [p0.x + dy, p0.y - dx];
        })();
    
        // 1. Direct rotation
        if (this.isValidPosition(nx, ny)) {
            this.place[1] = { x: nx, y: ny };
            this.updateLastRotation(direction);
            return;
        }
    
        // 2. Kicks
        // 2a. Wall Kick (Prioritize side shift when hitting walls or puyos)
        const preferredSx = nx > p0.x ? -1 : (nx < p0.x ? 1 : 0);
        if (preferredSx !== 0) {
            for (const sx of [preferredSx, -preferredSx]) {
                if (this.isValidPosition(p0.x + sx, p0.y) && this.isValidPosition(nx + sx, ny)) {
                    this.place[0].x += sx;
                    this.place[1] = { x: nx + sx, y: ny };
                    this.updateLastRotation(direction);
                    return;
                }
            }
        }

        // 2b. Ground Kick (Floor kick / Upward kick as last resort)
        const isGroundClip = Math.floor(Math.min(ny, p0.y)) < 0 || (this.isValidPosition(nx, ny) === false && ny < p0.y);
        if (isGroundClip) {
            // Try kick up 0.5
            if (this.isValidPosition(p0.x, p0.y + 0.5) && this.isValidPosition(nx, ny + 0.5)) {
                this.place[0].y += 0.5;
                this.place[1] = { x: nx, y: ny + 0.5 };
                this.updateLastRotation(direction);
                return;
            }
            // Try kick up 1.0 
            if (this.isValidPosition(p0.x, p0.y + 1) && this.isValidPosition(nx, ny + 1)) {
                this.place[0].y += 1;
                this.place[1] = { x: nx, y: ny + 1 };
                this.updateLastRotation(direction);
                return;
            }
        }
    
        // 3. Flip (180 deg rotation)
        if (this.lastRotation === direction) {
            const flip_nx = p0.x - dx;
            const flip_ny = p0.y - dy;
            if (this.isValidPosition(flip_nx, flip_ny)) {
                this.place[1] = { x: flip_nx, y: flip_ny };
                this.lastRotation = 'none'; // Consume the double tap
                return;
            }
        }
    
        // If all else fails, still update rotation for next attempt
        this.updateLastRotation(direction);
    }

    private isValidPosition(x: number, y: number): boolean {
        // ぷよが占有する可能性のあるすべての格子点をチェック
        for (let ix = Math.floor(x); ix <= Math.ceil(x); ix++) {
            for (let iy = Math.floor(y); iy <= Math.ceil(y); iy++) {
                if (!this.board.isValid(ix, iy)) return false;
            }
        }
        return true;
    }
}