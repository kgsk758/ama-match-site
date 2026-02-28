import Phaser from "phaser";

export default class BoardView {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private puyoSprites: Phaser.GameObjects.Rectangle[] = []; 
    private boardSprites: Phaser.GameObjects.Rectangle[][] = []; // 盤面に固定されたぷよ
    private readonly CELL_SIZE = 32;
    private readonly COLS = 6;
    private readonly ROWS = 14;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);

        const bg = scene.add.rectangle(0, 0, this.CELL_SIZE * this.COLS, this.CELL_SIZE * 12, 0x000000, 0.5);
        bg.setOrigin(0, 0);
        this.container.add(bg);

        // 操作中ぷよ
        for (let i = 0; i < 2; i++) {
            const sprite = scene.add.rectangle(0, 0, this.CELL_SIZE - 2, this.CELL_SIZE - 2, 0xffffff);
            sprite.setVisible(false);
            this.container.add(sprite);
            this.puyoSprites.push(sprite);
        }

        // 盤面用スプライト配列の初期化
        for (let x = 0; x < this.COLS; x++) {
            this.boardSprites[x] = [];
            for (let y = 0; y < this.ROWS; y++) {
                const sprite = scene.add.rectangle(0, 0, this.CELL_SIZE - 2, this.CELL_SIZE - 2, 0xffffff);
                sprite.setVisible(false);
                this.container.add(sprite);
                this.boardSprites[x][y] = sprite;
            }
        }
    }

    private getPixelX(x: number) { return x * this.CELL_SIZE + this.CELL_SIZE / 2; }
    private getPixelY(y: number) { return (12 - y) * this.CELL_SIZE - this.CELL_SIZE / 2; }

    public animateMove(oldPlace: {x:number, y:number}[], newPlace: {x:number, y:number}[], colors: number[]) {
        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff]; 
        
        // 値としてコピーして参照問題を完全に回避
        const targets = newPlace.map(p => ({ x: p.x, y: p.y }));

        targets.forEach((p, i) => {
            const sprite = this.puyoSprites[i];
            const isNew = !sprite.visible;
            
            sprite.setVisible(true);
            sprite.setFillStyle(colorMap[colors[i]] || 0xffffff);
            
            // 進行中のTweenがあれば停止
            this.scene.tweens.killTweensOf(sprite);

            if (isNew) {
                // 新しく出現した時（設置後など）だけ初期座標をセット
                sprite.x = this.getPixelX(oldPlace[i].x);
                sprite.y = this.getPixelY(oldPlace[i].y);
            }

            this.scene.tweens.add({
                targets: sprite,
                x: this.getPixelX(p.x),
                y: this.getPixelY(p.y),
                duration: 60,
                ease: 'Power1'
            });
        });
    }

    public updateBoard(grid: number[][]) {
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
                } else {
                    sprite.setVisible(false);
                }
            });
        });
    }

    public async animateDrops(drops: {x:number, fromY:number, toY:number, cell:number}[]): Promise<void> {
        if (drops.length === 0) return;
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
                        if (completed === sortedDrops.length) resolve();
                    }
                });
            });
        });
    }

    public async animateChainStep(step: any): Promise<void> {
        return new Promise((resolve) => {
            step.cleared.forEach((group: any) => {
                group.places.forEach((p: any) => {
                    const sprite = this.boardSprites[p.x][p.y];
                    this.scene.tweens.killTweensOf(sprite);
                    this.scene.tweens.add({
                        targets: sprite,
                        alpha: 0,
                        duration: 200,
                        yoyo: true,
                        repeat: 1
                    });
                });
            });

            // ダミーオブジェクトを使用して450ms待機をTweenで行う
            this.scene.tweens.add({
                targets: { val: 0 },
                val: 1,
                duration: 450,
                onComplete: async () => {
                    step.cleared.forEach((group: any) => {
                        group.places.forEach((p: any) => {
                            const sprite = this.boardSprites[p.x][p.y];
                            sprite.setVisible(false);
                            sprite.setAlpha(1);
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
