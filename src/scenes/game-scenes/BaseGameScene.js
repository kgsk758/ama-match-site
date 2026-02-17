import Phaser from "phaser";
import { GAME_SCENE_IDX , UI_CONFIG} from "../../constants";

export default class BaseGameScene extends Phaser.Scene {
    constructor(sceneKey){
        super(sceneKey);
        this.currentCameraTween = null; // Store reference to the active tween
    }

    init(){
        this.sceneIdx = GAME_SCENE_IDX[this.scene.key];
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height*(1 - UI_CONFIG.UI_TO_HEIGHT);
        this.gameSceneY = this.scale.height - this.gameHeight;
        this.mainCamera = this.cameras.main;
        this.offSetViewport();
    }

    offSetViewport(){
        const offSetX = this.gameWidth*this.sceneIdx;
        this.mainCamera.setViewport(offSetX, this.gameSceneY, this.gameWidth, this.gameHeight);
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