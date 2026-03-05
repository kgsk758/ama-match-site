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
    // --- Components ---
    protected player: Player;
    protected scene: Phaser.Scene;
    protected boardView: BoardView;
    protected garbageView: GarbageView;
    protected scoreView: ScoreView;
    protected nextView: NextView;
    protected acView: ACView;

    // --- Input Keys ---
    protected keys: {
        down?: Phaser.Input.Keyboard.Key,
        left?: Phaser.Input.Keyboard.Key,
        right?: Phaser.Input.Keyboard.Key,
        up?: Phaser.Input.Keyboard.Key,
        rotateLeft?: Phaser.Input.Keyboard.Key,
        rotateRight?: Phaser.Input.Keyboard.Key
    } = {};

    constructor(player: Player, scene: Phaser.Scene, place: {x:number, y:number}, config: {team: number, type: string}) {
        this.player = player;
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
    // ツモ->設置->連鎖->おじゃま のメインフローを記述
    protected start(){
        this.dropTsumo();
    }

    protected dropTsumo(){
        this.activeAnimations = [];
        this.movingAnimations = [];
        this.isGrounded = false;
        this.dropCount = 0;
        this.softDropCount = 0;
        this.moveCount = 0;
        this.lockDownCount = 0;
        this.lockDownReset = 0;
        this.player.drop();
        this.boardView.initMovingPuyo(this.getMovingPuyo());
        console.log(this.player.place);
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

    /**
     * メイン更新ループ
     * ここに新しい操作仕様（移動、回転、接地タイマー等）を実装
     */
    public update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;

        switch(this.currentState){
            case "INIT": 
                return;

            case "FALLING":
                if(Phaser.Input.Keyboard.JustDown(this.keys.down!)){
                    this.dropStep();
                }

                if(this.keys.down?.isDown){
                    this.dropCount = 0;
                    this.softDropCount += delta;
                    if(this.softDropCount >= CONTROLLER_CONFIG.SOFT_DROP_INTERVAL){
                        this.softDropCount = 0;
                        this.dropStep();
                    }
                }

                if(Phaser.Input.Keyboard.JustDown(this.keys.right!)){
                    this.moveCount = 0;
                    this.moveRight();
                }
                if(Phaser.Input.Keyboard.JustDown(this.keys.left!)){
                    this.moveCount = 0;
                    this.moveLeft();
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
                    if(this.isGrounded){//床を離れたフレーム
                        this.dropCount = 0;
                        this.lockDownCount = 0;
                    }
                    this.isGrounded = false;
                }else{
                    if(!this.isGrounded){//床についた瞬間
                        this.handleMovingBounce();

                        console.log('just landed');
                        this.lockDownReset++;
                    }
                    this.isGrounded = true;
                }

                if(this.isGrounded){
                    if(this.keys.down?.isDown){
                        //設置
                        this.landPuyo();
                    }
                    this.lockDownCount += delta;
                    if(this.lockDownCount >= CONTROLLER_CONFIG.LOCK_DOWN_DURATION){
                        //設置
                        this.landPuyo();
                    }
                }

                if(this.lockDownReset >= CONTROLLER_CONFIG.LOCK_DOWN_RESET_LIMIT){
                    //設置
                    this.landPuyo();
                }

                break;

            case "LANDING":
                break;
        }
    }

    private dropStep(){
        this.player.moveDown();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    private moveRight(){
        this.player.moveRight();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    private moveLeft(){
        this.player.moveLeft();
        this.boardView.moveAxis(this.getMovingPuyo());
    }

    private async landPuyo(){
        this.currentState = 'LANDING';

        // 1. まず操作中のアニメーション（回転など）がすべて終わるのを待つ
        await Promise.all(this.movingAnimations);
        this.movingAnimations = [];
        
        const bounceIndices = this.getMovingBounceIndices();
        
        // 各ぷよの最終的な着地位置を計算
        const puyos = this.player.place.map((p, i) => ({
            x: p.x,
            y: p.y,
            index: i
        })).sort((a, b) => a.y - b.y);

        const tempGrid = this.player.board.grid.map(col => [...col]);

        for (const p of puyos) {
            // 接地済み（bounceIndicesに含まれる）の場合は、既にupdate()でバウンドが開始されているので何もしない
            // 空中にある場合のみ落下アニメーションを開始し、管理配列に追加する
            if (!bounceIndices.includes(p.index)) {
                const x = Math.floor(p.x);
                let targetY = 0;
                for (let y = 0; y < this.player.board.rows; y++) {
                    if (tempGrid[x][y] === 5) { // 5 は NONE_NUM
                        targetY = y;
                        break;
                    }
                }
                tempGrid[x][targetY] = 0; 
                this.activeAnimations.push(this.boardView.animateFall(p.index, targetY));
            }
        }

        // すべてのアニメーション（以前に開始されたバウンドも含めて）の完了を待つ
        await Promise.all(this.activeAnimations);
        this.activeAnimations = [];

        this.player.fixToBoard();
        this.refreshView();

        // 連鎖アニメーションの開始
        let chainCount = 1;
        while (true) {
            // 現在の盤面で繋がっているぷよを特定 (論理的にはまだ消さない)
            const connects = this.player.board.getConnected();
            if (connects.length === 0) break;

            // 1. 消去アニメーション
            await this.boardView.animateClear(connects);

            // 2. 論理的な消去と落下を実行
            const step = this.player.executeChainStep(chainCount);
            if (!step) break;

            // 3. 落下アニメーション (step.drops にどこからどこへ落ちたか入っている)
            await this.boardView.animateDrops(step.drops);

            // 4. 表示の同期 (最終的なグリッドの状態に合わせる)
            this.refreshView();

            chainCount++;
        }
        
        this.dropTsumo();
    }
    /**
     * View全体の表示を現在のPlayerの状態に合わせて更新する
     */
    private refreshView() {
        const movingPuyos = this.getMovingPuyo();
        
        this.boardView.render(this.player.board.grid, movingPuyos);
        this.nextView.updateNext(this.player.next);
        this.scoreView.updateScore(this.player.score);
        this.acView.update(this.player.allClear);
    }

    private getMovingPuyo(): {x: number, y: number, color: number}[] {
        if (!this.player.moving || this.player.moving.length === 0) return [];
        const movingPuyos = this.player.place.map((p, i) => ({
            x: p.x,
            y: p.y,
            color: this.player.moving[i]
        }));
        return movingPuyos;
    }

    private handleMovingBounce(){
        const bounceIdx = this.getMovingBounceIndices();
        const promises = this.boardView.animateMovingBounce(bounceIdx);
        this.activeAnimations.push(...promises);
    }

    private getMovingBounceIndices(): number[]{
        const indices: number[] = [];
        //縦向き
        if(this.player.place[0].x===this.player.place[1].x){ 
            return [0,1];
        }
        const step = 0.5; //自由落下の最小単位
        const p0 = this.player.place[0]; //軸ぷよ
        const p1 = this.player.place[1];
        if(!this.player.isValidPosition(p0.x, p0.y - step)){
            indices.push(0);
        }
        if(!this.player.isValidPosition(p1.x, p1.y - step)){
            indices.push(1);
        }
        return indices;
    }
}
