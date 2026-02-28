import Phaser from "phaser";

export default class ScoreView {
    private scene: Phaser.Scene;
    private text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.text = scene.add.text(x, y + 400, "Score: 0", { fontSize: "24px", color: "#ffffff" });
    }

    public updateScore(score: number) {
        this.text.setText(`Score: ${score}`);
    }
}
