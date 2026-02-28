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
        this.gamePlaying = false;
    }

    offSetViewport(){
        const offSetX = this.gameWidth*this.sceneIdx;
        this.mainCamera.setViewport(offSetX, this.gameSceneY, this.gameWidth, this.gameHeight);
    }

    slideSceneTo(idxTo){
        // Calculate the absolute target X position for this camera
        const targetX = (this.sceneIdx - idxTo) * this.gameWidth;

        // Get the MainScene's tween manager to perform the slide.
        // This ensures the slide is not affected if this game scene is paused.
        const mainScene = this.scene.get('mainScene');
        const tweenManager = mainScene ? mainScene.tweens : this.tweens;

        // Stop any existing tween on this camera (using the manager that created it)
        if (this.currentCameraTween) {
            this.currentCameraTween.stop();
        }

        this.currentCameraTween = tweenManager.add({
            targets: this.mainCamera,
            x: targetX,
            ease: UI_CONFIG.SLIDE_EASE,
            duration: UI_CONFIG.SLIDE_DURATION,
            onComplete: () => {
                this.currentCameraTween = null;
            }
        });
    }


}