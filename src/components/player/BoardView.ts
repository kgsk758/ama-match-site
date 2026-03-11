import Phaser from "phaser";
import { ANIMATION_CONFIG } from "../../puyo-engine/core/core-config";

export default class BoardView {
    // --- Constants ---
    private readonly CELL_SIZE = 32;
    private readonly COLS = 6;
    private readonly ROWS = 14;
    private readonly COLOR_MAP = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff];
    private readonly ROTATION_DURATION = 100; // ms for rotation animation

    // --- Components ---
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private puyoSprites: Phaser.GameObjects.Arc[] = []; 
    private boardSprites: Phaser.GameObjects.Arc[][] = [];
    private movingPuyo: {axis:{x:number,y:number}, angle: number} = {axis:{x:0,y:0},angle:90};

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);

        this.initBackground();
        this.initPuyoSprites();
    }

    // --- Initialization ---

    private initBackground() {
        const bg = this.scene.add.rectangle(0, 0, this.CELL_SIZE * this.COLS, this.CELL_SIZE * 12, 0x000000, 0.5);
        bg.setOrigin(0, 0);
        this.container.add(bg);
    }

    public initMovingPuyo(movingPuyo:{
        x: number;
        y: number;
        color: number;
    }[]){
        if (!movingPuyo || movingPuyo.length < 2) return;
        const clone = structuredClone(movingPuyo);
        const axisPos = {x: clone[0].x, y:clone[0].y};
        const angle = this._calculateAngle(clone[0], clone[1]);
        this.movingPuyo = {axis: axisPos, angle: angle};
        this.setSpritePos(this.movingPuyo);
    }

    private initPuyoSprites() {
        // 操作中ぷよ
        for (let i = 0; i < 2; i++) {
            const sprite = this.scene.add.circle(0, 0, (this.CELL_SIZE - 4) / 2, 0xffffff).setVisible(false);
            this.container.add(sprite);
            this.puyoSprites.push(sprite);
        }

        // 盤面固定ぷよ
        for (let x = 0; x < this.COLS; x++) {
            this.boardSprites[x] = [];
            for (let y = 0; y < this.ROWS; y++) {
                const sprite = this.scene.add.circle(0, 0, (this.CELL_SIZE - 4) / 2, 0xffffff).setVisible(false);
                this.container.add(sprite);
                this.boardSprites[x][y] = sprite;
            }
        }
    }

    // --- Public API ---

    public getContainer() { return this.container; }

    public moveAxis(movingPuyos: {x: number, y: number, color: number}[]){
        if (!movingPuyos || movingPuyos.length === 0) return;
        const newX = movingPuyos[0]?.x;
        const newY = movingPuyos[0]?.y;
        this.movingPuyo.axis = {x:newX,y:newY};
        this.setSpritePos(this.movingPuyo);
    }

    public rotateRight(
        before:{x:number,y:number,color?:number;}[],
        after:{x:number,y:number,color?:number;}[]
    ): Promise<void> | undefined {
        const angles = this.getAngle(before, after);
        this.movingPuyo.axis = {x:after[0].x,y:after[0].y}; //壁キック用に座標は瞬時に変える
        const rotation=(angles.after-angles.before<0)?angles.after-angles.before:angles.after-angles.before-360;
        if(rotation % 360 == 0) return; 
        return this.doRotationTweens(rotation, angles);
    }

    public rotateLeft(
        before:{x:number,y:number,color?:number;}[],
        after:{x:number,y:number,color?:number;}[]
    ): Promise<void> | undefined {
        const angles = this.getAngle(before, after);
        this.movingPuyo.axis = {x:after[0].x,y:after[0].y}; //壁キック用に座標は瞬時に変える
        const rotation=(angles.after-angles.before>0)?angles.after-angles.before:angles.after-angles.before+360;
        if(rotation % 360 == 0) return; 
        return this.doRotationTweens(rotation, angles);
    }

    /**
     * 盤面と操作中ぷよの状態を一括更新する
     */
    public render(grid: number[][], movingPuyos?: {x: number, y: number, color: number}[]) {
        // 盤面の更新
        grid.forEach((col, x) => {
            col.forEach((cell, y) => {
                const sprite = this.boardSprites[x][y];
                if (cell < 5) {
                    sprite.setVisible(true)
                          .setFillStyle(this.COLOR_MAP[cell])
                          .setAlpha(1)
                          .setScale(1)
                          .setPosition(this.getPixelX(x), this.getPixelY(y));
                } else {
                    sprite.setVisible(false);
                }
            });
        });

        this.puyoSprites.forEach(s => s.setVisible(false));
        if (movingPuyos) {
            movingPuyos.forEach((p, i) => {
                if (this.puyoSprites[i]) {
                    this.puyoSprites[i].setVisible(true)
                        .setFillStyle(this.COLOR_MAP[p.color])
                        .setPosition(this.getPixelX(p.x), this.getPixelY(p.y));
                }
            });
        }
    }

    public animateMovingBounce(indices: number[]): Promise<void>[] {
        return indices.map(index => {
            const sprite = this.puyoSprites[index];
            return this.doBounceTween(sprite);
        });
    }

    public async animateClear(groups: {cell: number, places: {x:number, y:number}[]}[]) {
        const sprites: Phaser.GameObjects.Arc[] = [];
        groups.forEach(group => {
            group.places.forEach(p => {
                sprites.push(this.boardSprites[p.x][p.y]);
            });
        });

        if (sprites.length === 0) return;

        return new Promise<void>(resolve => {
            this.scene.tweens.add({
                targets: sprites,
                alpha: 0,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: ANIMATION_CONFIG.POP_DURATION,
                onComplete: () => {
                    // 演出が終わったら非表示にする
                    sprites.forEach(s => {
                        s.setVisible(false);
                        s.setAlpha(1);
                        s.setScale(1);
                    });
                    resolve();
                }
            });
        });
    }

    public async animateDrops(drops: {x:number, fromY:number, toY:number, cell:number}[]) {
        if (drops.length === 0) return;

        const promises = drops.map(drop => {
            const sprite = this.boardSprites[drop.x][drop.fromY];
            const targetY = this.getPixelY(drop.toY);
            
            return new Promise<void>(resolve => {
                this.scene.tweens.add({
                    targets: sprite,
                    y: targetY,
                    duration: ANIMATION_CONFIG.DROP_BASE_DURATION + (drop.fromY - drop.toY) * ANIMATION_CONFIG.DROP_PER_CELL, // 距離に応じて落下時間を調整
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        this.doBounceTween(sprite).then(resolve);
                    }
                });
            });
        });

        await Promise.all(promises);

        // アニメーション用に使ったスプライトは一旦隠し、位置を戻しておく
        drops.forEach(drop => {
            const sprite = this.boardSprites[drop.x][drop.fromY];
            sprite.setVisible(false);
            sprite.setPosition(this.getPixelX(drop.x), this.getPixelY(drop.fromY));
        });
        }

    public async animateBounceByIndex(index: number): Promise<void> {
        const sprite = this.puyoSprites[index];
        return this.doBounceTween(sprite);
    }

    public async animateFall(index: number, targetY: number): Promise<void> {
        const sprite = this.puyoSprites[index];
        const targetPixelY = this.getPixelY(targetY);
        
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: sprite,
                y: targetPixelY,
                duration: ANIMATION_CONFIG.LAND_DURATION,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    this.doBounceTween(sprite).then(resolve);
                }
            });
        });
    }

    public async animateGarbageFall(placed: {x: number, y: number}[]): Promise<void> {
        if (placed.length === 0) return;

        const GARBAGE_COLOR_IDX = 4; // お邪魔ぷよの色

        // 最も下のぷよのy座標を取得し、それが13段目からスタートするようにオフセットを計算
        const minY = Math.min(...placed.map(p => p.y));
        const offset = 13 - minY;

        const promises = placed.map(pos => {
            const sprite = this.boardSprites[pos.x][pos.y];
            
            // 全員同じオフセットを加えて開始位置を決める
            const startY = this.getPixelY(pos.y + offset);
            const targetY = this.getPixelY(pos.y);
            
            sprite.setVisible(true)
                  .setFillStyle(this.COLOR_MAP[GARBAGE_COLOR_IDX])
                  .setAlpha(1)
                  .setScale(1)
                  .setPosition(this.getPixelX(pos.x), startY);

            return new Promise<void>(resolve => {
                this.scene.tweens.add({
                    targets: sprite,
                    y: targetY,
                    duration: ANIMATION_CONFIG.GARBAGE_FALL_DURATION, // 移動距離(offset)が全員共通なので一斉に降る
                    ease: 'Linear',
                    onComplete: () => {
                        resolve();
                    }
                });
            });
        });

        await Promise.all(promises);
    }

    /**
     * 指定したミリ秒数だけ演出を待機する（Phaserのカウンターを使用）
     */
    public async wait(duration: number): Promise<void> {
        return new Promise(resolve => {
            this.scene.tweens.addCounter({
                from: 0,
                to: 1,
                duration: duration,
                onComplete: () => resolve()
            });
        });
    }
    
    public animateUpdate(time: number, delta: number){
        //this.setSpritePos(this.movingPuyo);
    }

    // --- Private Helpers ---
    private getPixelX(x: number) { return x * this.CELL_SIZE + this.CELL_SIZE / 2; }
    private getPixelY(y: number) { return (12 - y) * this.CELL_SIZE - this.CELL_SIZE / 2; }

    private rotationTween: Phaser.Tweens.Tween | null = null;
    private doRotationTweens(rotation: number, angles: {before: number;after: number;}): Promise<void> {
        if(this.rotationTween) this.rotationTween.stop();

        this.movingPuyo.angle = angles.before;

        return new Promise(resolve => {
            this.rotationTween = this.scene.tweens.add({
                targets: this.movingPuyo,
                angle: angles.before + rotation,
                duration: this.ROTATION_DURATION,
                ease: 'Linear',
                onUpdate: () => {
                    this.setSpritePos(this.movingPuyo);
                },
                onComplete: () => {
                    this.movingPuyo.angle = angles.after; 
                    this.setSpritePos(this.movingPuyo);
                    resolve();
                },
                onStop: () => {
                    resolve();
                }
            });
        });
    }
    private _calculateAngle(axis: {x: number, y: number, color?: number}, child: {x: number, y: number, color?: number}): number {
        const dx = child.x - axis.x;
        const dy = child.y - axis.y;

        // グリッド座標の差分からatan2(y, x)で角度をラジアンで取得
        const angleRad = Math.atan2(dy, dx);

        // ラジアンを度に変換
        let angleDeg = Phaser.Math.RadToDeg(angleRad);

        // 角度を0-360の範囲に正規化
        if (angleDeg < 0) {
            angleDeg += 360;
        }

        return Math.round(angleDeg); // 浮動小数点誤差を避けるために丸める
    }

    private getAngle(
        before:{x:number,y:number,color?:number;}[],
        after:{x:number,y:number,color?:number;}[]
    ): {before: number, after: number} {
        // 変化前の角度を計算
        const beforeAngle = this._calculateAngle(before[0], before[1]);

        // 変化後の角度を計算
        const afterAngle = this._calculateAngle(after[0], after[1]);

        return { before: beforeAngle, after: afterAngle };
    }

    private setSpritePos(place: {axis:{x:number,y:number}, angle: number}){
        this.movingPuyo = place;
        const axisPuyo = this.puyoSprites[0];
        const childPuyo = this.puyoSprites[1];

        // 軸ぷよのピクセル座標を計算
        const axisX = this.getPixelX(place.axis.x);
        const axisY = this.getPixelY(place.axis.y);
        axisPuyo.setPosition(axisX, axisY);

        // 角度をラジアンに変換
        const angleRad = Phaser.Math.DegToRad(place.angle);

        // 子ぷよの相対座標を計算
        // Y軸は上方向が正として角度を計算するめ、sinの結果を反転させてPhaserの座標系（Yが下向き）に合わせる
        const childX = axisX + this.CELL_SIZE * Math.cos(angleRad);
        const childY = axisY - this.CELL_SIZE * Math.sin(angleRad);

        childPuyo.setPosition(childX, childY);
    }

    public async doBounceTween(sprite: Phaser.GameObjects.Arc): Promise<void>{
        // 既存のツイーンがある場合は停止（連打対策）
        this.scene.tweens.killTweensOf(sprite);

        return new Promise(resolve => {
            this.scene.tweens.chain({
                targets: sprite,
                tweens: [
                    {
                        scaleX: 1.25,
                        scaleY: 0.85,
                        duration: Math.floor(ANIMATION_CONFIG.BOUNCE_DURATION * 0.6),
                        ease: 'Quad.easeOut'
                    },
                    {
                        scaleX: 1,
                        scaleY: 1,
                        duration: Math.floor(ANIMATION_CONFIG.BOUNCE_DURATION * 0.4),
                        ease: 'Elastic.out',
                        easeParams: [1, 0.3]
                    }
                ],
                onComplete: resolve,
                onTerminate: resolve,
            });
        });
    }

}
