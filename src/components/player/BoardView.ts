import Phaser from "phaser";
import { CONTROLLER_CONFIG } from "./controller-config";

export default class BoardView {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private puyoSprites: Phaser.GameObjects.Arc[] = []; 
    private boardSprites: Phaser.GameObjects.Arc[][] = []; // 盤面に固定されたぷよ
    private lineSpritesH: Phaser.GameObjects.Rectangle[][] = []; // 繋ぎ目（横）
    private lineSpritesV: Phaser.GameObjects.Rectangle[][] = []; // 繋ぎ目（縦）
    private readonly CELL_SIZE = 32;
    private readonly COLS = 6;
    private readonly ROWS = 14;

    private lastGrid: number[][] = [];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);

        const bg = scene.add.rectangle(0, 0, this.CELL_SIZE * this.COLS, this.CELL_SIZE * 12, 0x000000, 0.5);
        bg.setOrigin(0, 0);
        this.container.add(bg);

        // 繋ぎ目スプライトの初期化 (Puyoより先に作成して背面に持っていく)
        for (let x = 0; x < this.COLS; x++) {
            this.lineSpritesH[x] = [];
            this.lineSpritesV[x] = [];
            for (let y = 0; y < this.ROWS; y++) {
                if (x < this.COLS - 1) {
                    const lh = scene.add.rectangle(0, 0, this.CELL_SIZE, this.CELL_SIZE/2, 0xffffff);
                    lh.setVisible(false);
                    this.container.add(lh);
                    this.lineSpritesH[x][y] = lh;
                }
                if (y < this.ROWS - 1) {
                    const lv = scene.add.rectangle(0, 0, this.CELL_SIZE/2, this.CELL_SIZE, 0xffffff);
                    lv.setVisible(false);
                    this.container.add(lv);
                    this.lineSpritesV[x][y] = lv;
                }
            }
        }

        // 操作中ぷよ
        for (let i = 0; i < 2; i++) {
            const sprite = scene.add.circle(0, 0, (this.CELL_SIZE - 4) / 2, 0xffffff);
            sprite.setVisible(false);
            this.container.add(sprite);
            this.puyoSprites.push(sprite);
        }

        // 盤面用スプライト配列の初期化
        for (let x = 0; x < this.COLS; x++) {
            this.boardSprites[x] = [];
            for (let y = 0; y < this.ROWS; y++) {
                const sprite = scene.add.circle(0, 0, (this.CELL_SIZE - 4) / 2, 0xffffff);
                sprite.setVisible(false);
                this.container.add(sprite);
                this.boardSprites[x][y] = sprite;
            }
        }
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private getPixelX(x: number) { return x * this.CELL_SIZE + this.CELL_SIZE / 2; }
    private getPixelY(y: number) { return (12 - y) * this.CELL_SIZE - this.CELL_SIZE / 2; }

    private updateConnections(grid: number[][]) {
        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff];
        
        for (let x = 0; x < this.COLS; x++) {
            for (let y = 0; y < this.ROWS; y++) {
                const cell = grid[x][y];
                const isPuyo = cell < 4; // 0-3: 正常なぷよ

                // 右隣
                if (x < this.COLS - 1) {
                    const line = this.lineSpritesH[x][y];
                    if (isPuyo && grid[x + 1][y] === cell) {
                        line.setVisible(true);
                        line.setFillStyle(colorMap[cell]);
                        line.x = (this.getPixelX(x) + this.getPixelX(x + 1)) / 2;
                        line.y = this.getPixelY(y);
                    } else {
                        line.setVisible(false);
                    }
                }

                // 上隣
                if (y < this.ROWS - 1) {
                    const line = this.lineSpritesV[x][y];
                    if (isPuyo && grid[x][y + 1] === cell) {
                        line.setVisible(true);
                        line.setFillStyle(colorMap[cell]);
                        line.x = this.getPixelX(x);
                        line.y = (this.getPixelY(y) + this.getPixelY(y + 1)) / 2;
                    } else {
                        line.setVisible(false);
                    }
                }
            }
        }
    }

    private hideAllConnections() {
        this.lineSpritesH.flat().forEach(l => l?.setVisible(false));
        this.lineSpritesV.flat().forEach(l => l?.setVisible(false));
    }

    public animateMove(oldPlace: {x:number, y:number}[], newPlace: {x:number, y:number}[], colors: number[], isRotation: boolean = false) {
        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff]; 
        
        // 値としてコピーして参照問題を完全に回避
        const targets = newPlace.map(p => ({ x: p.x, y: p.y }));

        targets.forEach((p, i) => {
            const sprite = this.puyoSprites[i];
            const targetX = this.getPixelX(p.x);
            const targetY = this.getPixelY(p.y);
            
            sprite.setVisible(true);
            sprite.setFillStyle(colorMap[colors[i]] || 0xffffff);
            
            if (isRotation) {
                // 回転時のみアニメーションを付ける
                this.scene.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    duration: CONTROLLER_CONFIG.ROTATION_DURATION, // 設定値を使用
                    ease: 'Cubic.out'
                });
            } else {

                // 移動時：もし回転アニメーション中なら、そのTweenの目的地を更新する
                const activeTweens = this.scene.tweens.getTweensOf(sprite);
                if (activeTweens.length > 0) {
                    activeTweens.forEach(t => {
                        // 目的地を現在の移動先に更新し、アニメーションを継続させる
                        (t as any).updateTo('x', targetX, true);
                        (t as any).updateTo('y', targetY, true);
                    });
                } else {
                    // アニメーション中でなければ即座に反映
                    this.scene.tweens.killTweensOf(sprite);
                    sprite.x = targetX;
                    sprite.y = targetY;
                }
            }
        });
    }


    public updateBoard(grid: number[][]) {
        this.lastGrid = grid;
        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff];
        this.puyoSprites.forEach(s => s.setVisible(false));

        grid.forEach((col, x) => {
            col.forEach((cell, y) => {
                const sprite = this.boardSprites[x][y];
                if (cell < 5) {
                    sprite.setVisible(true);
                    sprite.setFillStyle(colorMap[cell]);
                    sprite.x = this.getPixelX(x);
                    sprite.y = this.getPixelY(y);
                    sprite.setAlpha(1);
                } else {
                    sprite.setVisible(false);
                }
            });
        });

        this.updateConnections(grid);
    }

    public async animateDrops(drops: {x:number, fromY:number, toY:number, cell:number}[]): Promise<void> {
        if (drops.length === 0) return;
        
        // 落下するぷよに関連する線を消す
        drops.forEach(d => {
            if (d.x < this.COLS - 1) this.lineSpritesH[d.x][d.fromY].setVisible(false);
            if (d.x > 0) this.lineSpritesH[d.x - 1][d.fromY].setVisible(false);
            if (d.fromY < this.ROWS - 1) this.lineSpritesV[d.x][d.fromY].setVisible(false);
            if (d.fromY > 0) this.lineSpritesV[d.x][d.fromY - 1].setVisible(false);
        });

        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff];
        
        // 下から順に処理することで、連続した入れ替えを正しく行う
        const sortedDrops = [...drops].sort((a, b) => a.toY - b.toY);

        return new Promise((resolve) => {
            let completed = 0;
            sortedDrops.forEach((d) => {
                const sprite = this.boardSprites[d.x][d.fromY];
                
                // 配列内の参照を入れ替えて論理状態と同期させる
                const temp = this.boardSprites[d.x][d.toY];
                this.boardSprites[d.x][d.toY] = sprite;
                this.boardSprites[d.x][d.fromY] = temp;

                sprite.setVisible(true);
                sprite.setFillStyle(colorMap[d.cell]); // 落下する色をセット
                sprite.setAlpha(1);
                
                this.scene.tweens.killTweensOf(sprite);
                const distance = Math.abs(d.fromY - d.toY);
                this.scene.tweens.add({
                    targets: sprite,
                    y: this.getPixelY(d.toY),
                    duration: distance * 40 + 60, // 1マスあたり40ms + 基本時間60ms
                    ease: 'Power1',
                    onComplete: () => {
                        completed++;
                        if (completed === sortedDrops.length) {
                            resolve();
                        }
                    }
                });
            });
        });
    }

    public async wait(duration: number): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: { val: 0 },
                val: 1,
                duration: duration,
                onComplete: () => resolve()
            });
        });
    }

    public async animateChainStep(step: any): Promise<void> {
        return new Promise((resolve) => {
            const blinkTargets: (Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle)[] = [];

            // 1. 点滅させる対象（ぷよ本体と接続線）を重複なく収集
            step.cleared.forEach((group: any) => {
                group.places.forEach((p: any) => {
                    const sprite = this.boardSprites[p.x][p.y];
                    if (!blinkTargets.includes(sprite)) blinkTargets.push(sprite);

                    if (p.x < this.COLS - 1 && group.places.some((n: any) => n.x === p.x + 1 && n.y === p.y)) {
                        const line = this.lineSpritesH[p.x][p.y];
                        if (!blinkTargets.includes(line)) blinkTargets.push(line);
                    }
                    if (p.y < this.ROWS - 1 && group.places.some((n: any) => n.x === p.x && n.y === p.y + 1)) {
                        const line = this.lineSpritesV[p.x][p.y];
                        if (!blinkTargets.includes(line)) blinkTargets.push(line);
                    }
                });
            });

            // 2. 一括で点滅アニメーション開始
            if (blinkTargets.length > 0) {
                this.scene.tweens.killTweensOf(blinkTargets);
                this.scene.tweens.add({
                    targets: blinkTargets,
                    alpha: 0,
                    duration: 0,
                    hold: 100,
                    repeatDelay: 100,
                    yoyo: true,
                    repeat: 1
                });
            }

            // 3. 待機後の消去処理 (点滅時間に合わせて開始)
            this.scene.tweens.add({
                targets: { val: 0 },
                val: 1,
                duration: 450,
                onComplete: async () => {
                    step.cleared.forEach((group: any) => {
                        group.places.forEach((p: any) => {
                            this.boardSprites[p.x][p.y].setVisible(false).setAlpha(1);
                            if (p.x < this.COLS - 1) this.lineSpritesH[p.x][p.y].setVisible(false).setAlpha(1);
                            if (p.x > 0) this.lineSpritesH[p.x - 1][p.y].setVisible(false).setAlpha(1);
                            if (p.y < this.ROWS - 1) this.lineSpritesV[p.x][p.y].setVisible(false).setAlpha(1);
                            if (p.y > 0) this.lineSpritesV[p.x][p.y - 1].setVisible(false).setAlpha(1);
                        });
                    });

                    if (step.drops.length > 0) {
                        await this.animateDrops(step.drops);
                    }
                    resolve();
                }
            });
        });
    }
}
