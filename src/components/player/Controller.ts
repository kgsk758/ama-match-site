// src/components/player/Controller.ts
import Phaser from "phaser";
import Player from "../../puyo-engine/core/Player";
import BoardView from "./BoardView";
import GarbageView from "./GarbageView";
import ScoreView from "./ScoreView";
import NextView from "./NextView";
import ACView from "./ACView";
import { PLAYER_CONFIG } from "../../constants";
import { CONTROLLER_CONFIG } from "./controller-config";
import { ANIMATION_CONFIG } from "../../puyo-engine/core/core-config";
import GameManager from "../../puyo-engine/core/GameManager";

export default class Controller {
    // --- Components ---
    protected player: Player;
    protected scene: Phaser.Scene;
    protected boardView: BoardView;
    protected garbageView: GarbageView;
    protected scoreView: ScoreView;
    protected nextView: NextView;
    protected acView: ACView;
    protected gameManager: GameManager;
    protected playerIndex: number;

    // --- Input Keys ---
    protected keys: {
        down?: Phaser.Input.Keyboard.Key,
        left?: Phaser.Input.Keyboard.Key,
        right?: Phaser.Input.Keyboard.Key,
        up?: Phaser.Input.Keyboard.Key,
        rotateLeft?: Phaser.Input.Keyboard.Key,
        rotateRight?: Phaser.Input.Keyboard.Key
    } = {};

    constructor(player: Player, gameManager: GameManager, playerIndex: number, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        this.player = player;
        this.gameManager = gameManager;
        this.playerIndex = playerIndex;
        this.scene = scene;

        // Views Initialization
        this.boardView = new BoardView(scene, place.x, place.y);
        this.garbageView = new GarbageView(scene, place.x, place.y);
        this.scoreView = new ScoreView(scene, place.x, place.y);
        this.nextView = new NextView(scene, place.x, place.y);
        this.acView = new ACView(scene);
        this.boardView.getContainer().addAt(this.acView.text, 1);

        if (config.type === PLAYER_CONFIG.HUMAN) {
            this.initKeys();
        }

        this.currentState = 'INIT';
        this.initiate();
        this.dropTsumo();
    }

    private initKeys() {
        if (!this.scene.input.keyboard) return;
        const K = CONTROLLER_CONFIG.KEYS;
        this.keys = {
            down: this.scene.input.keyboard.addKey(K.DOWN),
            left: this.scene.input.keyboard.addKey(K.LEFT),
            right: this.scene.input.keyboard.addKey(K.RIGHT),
            up: this.scene.input.keyboard.addKey(K.UP),
            rotateLeft: this.scene.input.keyboard.addKey(K.ROTATE_LEFT),
            rotateRight: this.scene.input.keyboard.addKey(K.ROTATE_RIGHT)
        };
    }

    protected currentState: 'INIT' | 'FALLING' | 'LANDING' = 'INIT';
    protected initiate(){
        this.activeAnimations = [];
        this.movingAnimations = [];
        this.isGrounded = false;
        this.dropCount = 0;
        this.softDropCount = 0;
        this.moveCount = 0;
        this.lockDownCount = 0;
        this.lockDownReset = 0;
    }

    protected dropTsumo(){
        this.player.drop();
        this.boardView.initMovingPuyo(this.getMovingPuyo());
        this.player.place.forEach((value,index)=>{this.puyosToSet.push(index);});
        this.refreshView();
        this.currentState = 'FALLING';
    }

    protected dropCount: number = 0;
    protected softDropCount: number = 0;
    protected isGrounded: boolean = false;
    protected moveCount: number = 0;
    protected lockDownCount: number = 0;
    protected lockDownReset: number = 0;
    protected puyosToSet: number[] = []; 
    protected activeAnimations: Promise<void>[] = []; 
    protected movingAnimations: Promise<void>[] = []; 

    public update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;

        switch(this.currentState){
            case "INIT": return;
            case "FALLING":
                if(Phaser.Input.Keyboard.JustDown(this.keys.down!)) this.dropStep();
                if(this.keys.down?.isDown){
                    this.softDropCount += delta;
                    if(this.softDropCount >= CONTROLLER_CONFIG.SOFT_DROP_INTERVAL){
                        this.softDropCount = 0;
                        this.dropStep();
                    }
                }
                if(Phaser.Input.Keyboard.JustDown(this.keys.right!)) {
                    this.moveRight();
                    this.moveCount = 0;
                }
                if(Phaser.Input.Keyboard.JustDown(this.keys.left!)) {
                    this.moveLeft();
                    this.moveCount = 0;
                }
                if(this.keys.right?.isDown){
                    this.moveCount += delta;
                    if(this.moveCount >= CONTROLLER_CONFIG.HORIZONTAL_MOVE_INTERVAL){
                        this.moveCount = 0;
                        this.moveRight();
                    }
                }
                if(this.keys.left?.isDown){
                    this.moveCount += delta;
                    if(this.moveCount >= CONTROLLER_CONFIG.HORIZONTAL_MOVE_INTERVAL){
                        this.moveCount = 0;
                        this.moveLeft();
                    }
                }
                this.dropCount += delta;
                if(this.dropCount >= CONTROLLER_CONFIG.DROP_INTERVAL){
                    this.dropCount = 0;
                    this.dropStep();
                }
                if (Phaser.Input.Keyboard.JustDown(this.keys.rotateRight!)) {
                    const temp = structuredClone(this.player.place);
                    this.player.rotateRight();
                    const p = this.boardView.rotateRight(temp, this.player.place);
                    if (p) this.movingAnimations.push(p);
                }
                if (Phaser.Input.Keyboard.JustDown(this.keys.rotateLeft!)) {
                    const temp = structuredClone(this.player.place);
                    this.player.rotateLeft();
                    const p = this.boardView.rotateLeft(temp, this.player.place);
                    if (p) this.movingAnimations.push(p);
                }
                if(this.player.canMoveDown()){
                    if(this.isGrounded){
                        this.lockDownCount = 0;
                        this.dropCount = 0;
                    }
                    this.isGrounded = false;
                }else{
                    if(!this.isGrounded){
                        this.handleMovingBounce();
                        this.lockDownReset++;
                    }
                    this.isGrounded = true;
                }
                if(this.isGrounded){
                    if(this.keys.down?.isDown) this.landPuyo();
                    this.lockDownCount += delta;
                    if(this.lockDownCount >= CONTROLLER_CONFIG.LOCK_DOWN_DURATION) this.landPuyo();
                }
                if(this.lockDownReset >= CONTROLLER_CONFIG.LOCK_DOWN_RESET_LIMIT) this.landPuyo();
                break;
            case "LANDING": break;
        }
    }

    protected dropStep(){
        this.player.moveDown();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    protected moveRight(){
        this.player.moveRight();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    protected moveLeft(){
        this.player.moveLeft();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    protected async landPuyo(){
        this.currentState = 'LANDING';
        await Promise.all(this.movingAnimations);
        this.movingAnimations = [];

        // --- 予測の取得 ---
        const stats = this.player.getStats(70, true);
        const predictedFrames = stats.attack_frame;
        const startTime = performance.now();
        const timeline: {phase: string, pred: string, actual: string, diff: string}[] = [];

        const bounceIndices = this.getMovingBounceIndices();
        const puyos = this.player.place.map((p, i) => ({ x: p.x, y: p.y, index: i })).sort((a, b) => a.y - b.y);
        const tempGrid = this.player.board.grid.map(col => [...col]);
        
        // 1. 設置
        const landStart = performance.now();
        for (const p of puyos) {
            if (!bounceIndices.includes(p.index)) {
                const x = Math.floor(p.x);
                let targetY = 0;
                for (let y = 0; y < this.player.board.rows; y++) {
                    if (tempGrid[x][y] === 5) { targetY = y; break; }
                }
                tempGrid[x][targetY] = 0; 
                this.activeAnimations.push(this.boardView.animateFall(p.index, targetY));
            }
        }
        await Promise.all(this.activeAnimations);
        this.activeAnimations = [];
        const landActual = performance.now() - landStart;
        timeline.push({phase: "Landing", pred: "-", actual: `${landActual.toFixed(1)}ms`, diff: "-"});

        this.player.fixToBoard();
        this.refreshView();

        // 2. 連鎖
        let chainCount = 1;
        while (true) {
            const connects = this.player.board.getConnected();
            if (connects.length === 0) break;

            const stepStart = performance.now();
            const neighborGarbage = this.player.board.getNeighborGarbage(connects);
            
            // Pop
            const popStart = performance.now();
            await this.boardView.animateClear([
                ...connects, 
                { cell: 4, places: neighborGarbage }
            ]);
            const popTime = performance.now() - popStart;

            // Logic & Drop
            const dropStart = performance.now();
            const step = this.player.executeChainStep(chainCount);
            if (!step) break;
            await this.boardView.animateDrops(step.drops);
            const dropTime = performance.now() - dropStart;
            
            this.refreshView();
            chainCount++;

            // Wait
            const waitStart = performance.now();
            await this.boardView.wait(ANIMATION_CONFIG.CHAIN_STEP_WAIT);
            const waitTime = performance.now() - waitStart;

            timeline.push({
                phase: `Chain ${chainCount-1}`, 
                pred: "-", 
                actual: `Pop:${popTime.toFixed(0)} Drop:${dropTime.toFixed(0)} Wait:${waitTime.toFixed(0)}`, 
                diff: `${(popTime+dropTime+waitTime).toFixed(0)}ms`
            });
        }

        // 3. 最終待機
        if(chainCount === 1) {
            const fWaitStart = performance.now();
            await this.boardView.wait(ANIMATION_CONFIG.CHAIN_STEP_WAIT);
            const fWaitTime = performance.now() - fWaitStart;
            timeline.push({phase: "Final Wait", pred: "250ms", actual: `${fWaitTime.toFixed(1)}ms`, diff: `${(fWaitTime-250).toFixed(1)}ms`});
        }

        const totalActualMs = performance.now() - startTime;
        const totalActualFrames = Math.floor(totalActualMs * (60 / 1000));

        // --- ダッシュボードの表示 ---
        console.group(`📊 [AI SYNC DASHBOARD] Player ${this.playerIndex}`);
        console.log(`Summary: Predicted ${predictedFrames}f vs Actual ${totalActualFrames}f (Diff: ${totalActualFrames - predictedFrames}f)`);
        console.table(timeline);
        console.groupEnd();

        this.sendGarbage();
        await this.dropGarbage();
        this.initiate();
        this.dropTsumo();
    }

    public sendGarbage() {
        this.gameManager.sendAttack(this.playerIndex);
        this.refreshView();
    }
    public async dropGarbage() {
        if (this.player.pendingGarbage > 0) {
            // 論理的な配置と座標リストの取得
            const placed = this.player.dropGarbage();

            // 視覚的な落下演出
            await this.boardView.animateGarbageFall(placed);

            // 最終的な状態にリフレッシュ
            this.refreshView();

        }
    }

    private refreshView() {
        const movingPuyos = this.getMovingPuyo();
        this.boardView.render(this.player.board.grid, movingPuyos);
        this.nextView.updateNext(this.player.next);
        this.scoreView.updateScore(this.player.score);
        this.acView.update(this.player.allClear);
        this.garbageView.updateGarbage(this.player.pendingGarbage);
    }

    private getMovingPuyo(): {x: number, y: number, color: number}[] {
        if (!this.player.moving || this.player.moving.length === 0) return [];
        return this.player.place.map((p, i) => ({ x: p.x, y: p.y, color: this.player.moving[i] }));
    }

    private handleMovingBounce(){
        const bounceIdx = this.getMovingBounceIndices();
        const promises = this.boardView.animateMovingBounce(bounceIdx);
        this.activeAnimations.push(...promises);
    }

    private getMovingBounceIndices(): number[]{
        const indices: number[] = [];
        if(this.player.place[0].x===this.player.place[1].x) return [0,1];
        const step = 0.5;
        const p0 = this.player.place[0];
        const p1 = this.player.place[1];
        if(!this.player.isValidPosition(p0.x, p0.y - step)) indices.push(0);
        if(!this.player.isValidPosition(p1.x, p1.y - step)) indices.push(1);
        return indices;
    }
}
