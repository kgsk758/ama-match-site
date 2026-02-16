import Phaser from "phaser";
import { GAME_SCENE_IDX , UI_CONFIG} from "../../constants";

export default class GameSceneBase extends Phaser.Scene {
    constructor(sceneKey){
        super(sceneKey);
        this.currentCameraTween = null; // Store reference to the active tween
    }

    init(){
        this.sceneIdx = GAME_SCENE_IDX[this.scene.key];
        this.gameWidth = Number(this.sys.game.config.width);
        this.gameHeight = Number(this.sys.game.config.height);
        this.mainCamera = this.cameras.main;
        this.offSetViewport();
    }

    offSetViewport(){
        const offSetX = this.gameWidth*this.sceneIdx;
        this.mainCamera.setViewport(offSetX, 0, this.gameWidth, this.gameHeight);
    }

    slideSceneTo(idxTo){
        // Stop any existing tween on this camera
        if (this.currentCameraTween) {
            this.currentCameraTween.stop();
        }

        // Calculate the absolute target X position for this camera
        // (this.sceneIdx - idxTo) determines the offset from the center scene
        const targetX = (this.sceneIdx - idxTo) * this.gameWidth;

        this.currentCameraTween = this.tweens.add({
            targets: this.mainCamera,
            x: targetX, // Use the calculated absolute target X
            ease: UI_CONFIG.SLIDE_EASE,
            duration: UI_CONFIG.SLIDE_DURATION,
            onComplete: () => {
                this.currentCameraTween = null; // Clear reference when complete
            }
        });
    }


}