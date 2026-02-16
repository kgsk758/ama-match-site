import Phaser from "phaser";
import { GAME_SCENE_IDX , UI_CONFIG} from "../../constants";

export default class GameSceneBase extends Phaser.Scene {
    constructor(sceneKey){
        super(sceneKey);
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

    slideSceneTo(idxTo, idxNow){
        const deltaX = this.gameWidth*(idxTo - idxNow)*-1;
        const newX = this.mainCamera.x + deltaX;
        this.tweens.add({
            targets: this.mainCamera,
            x: newX,
            ease: UI_CONFIG.SLIDE_EASE,
            duration: UI_CONFIG.SLIDE_DURATION
        }
        );
    }

}