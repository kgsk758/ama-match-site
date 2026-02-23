import BaseMenuContainer from "../base/BaseMenuContainer";
import { UI_CONFIG, EVENT_NAMES } from "../../constants";
import CloseMenuButton from "../Buttons/CloseMenuButton";

export default class MenuContainer extends BaseMenuContainer{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y
     * @param {Number} gameWidth
     * @param {Number} gameHeight 
     */
    constructor(scene, x, y, gameWidth, gameHeight){
        const widthRatio = UI_CONFIG.MENU_CONTAINER_WIDTH_RATIO;
        const heightRatio = UI_CONFIG.MENU_CONTAINER_HEIGHT_RATIO;
        const width = gameWidth * widthRatio;
        const height = gameHeight * heightRatio;
        super(scene, x, y, width, height);

        const closeButton = new CloseMenuButton(scene, width/2, height*0.9);
        this.add(closeButton);

        this.scene.game.events.on(EVENT_NAMES.CLOSE_MENU+this.scene.scene.key, this.quitMenu, this);
        this.scene.game.events.on(EVENT_NAMES.OPEN_MENU+this.scene.scene.key, this.openMenu, this);
        this.quitMenu();
    }
    quitMenu(){
        super.quitMenu();
        this.scene.events.emit(EVENT_NAMES.CLOSE_MENU_WHILE_START);
    }
    openMenu(){
        super.openMenu();
        this.scene.events.emit(EVENT_NAMES.OPEN_MENU_WHILE_START);
    }
    barrierClicked(){
        super.barrierClicked();
        this.scene.game.events.emit(EVENT_NAMES.CLOSE_MENU);
    }
}