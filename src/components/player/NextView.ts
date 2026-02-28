import Phaser from "phaser";

export default class NextView {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private nextSprites: Phaser.GameObjects.Arc[][] = [];
    private readonly CELL_SIZE = 24; // ネクストは少し小さめに表示

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        // 盤面の右側に配置
        this.container = scene.add.container(x + 210, y + 40);

        // 背景ラベル
        const label = scene.add.text(0, -30, "NEXT", { fontSize: '18px', color: '#ffffff' });
        this.container.add(label);

        // 2組分のスプライトを生成
        for (let i = 0; i < 2; i++) {
            this.nextSprites[i] = [];
            const offset = i * 70; // 組ごとの間隔
            for (let j = 0; j < 2; j++) {
                // j=0を下(軸)、j=1を上(子)として配置するために、表示座標の計算を反転
                const yPos = offset + (1 - j) * this.CELL_SIZE;
                const sprite = this.scene.add.circle(0, yPos, (this.CELL_SIZE - 2) / 2, 0xffffff);
                this.container.add(sprite);
                this.nextSprites[i][j] = sprite;
            }
        }

    }

    /**
     * ネクストぷよの表示を更新
     * @param next [ [色1, 色2], [色1, 色2] ] の形式
     */
    public updateNext(next: number[][]) {
        const colorMap = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0x888888, 0xffffff];
        
        next.forEach((pair, i) => {
            if (i >= 2) return; // 2組目まで表示
            pair.forEach((color, j) => {
                const sprite = this.nextSprites[i][j];
                sprite.setFillStyle(colorMap[color] || 0xffffff);
            });
        });
    }
}
