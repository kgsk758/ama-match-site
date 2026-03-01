import Phaser from "phaser";

export default class ACView {
    private scene: Phaser.Scene;
    public text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // BoardViewのコンテナ内での相対座標で指定（盤面中央付近）
        this.text = scene.add.text(96, 192, "ALL CLEAR", { 
            fontSize: "32px", 
            color: "#ffff00", 
            stroke: "#000000", 
            strokeThickness: 6,
            fontStyle: "bold"
        });
        this.text.setOrigin(0.5);
        this.text.setVisible(false);
    }

    public update(allClear: boolean) {
        this.text.setVisible(allClear);
    }
}
