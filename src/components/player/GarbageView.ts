import Phaser from "phaser";

export default class GarbageView {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y - 40); // Above the board
        this.text = scene.add.text(0, 0, "", { fontSize: "16px", color: "#ff0000" });
        this.container.add(this.text);
    }

    public updateGarbage(count: number) {
        this.text.setText(count > 0 ? `Garbage: ${count}` : "");
    }
}
