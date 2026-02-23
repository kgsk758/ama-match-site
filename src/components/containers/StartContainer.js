import BaseMenuContainer from "../base/BaseMenuContainer";
import { UI_CONFIG, EVENT_NAMES } from "../../constants";
import StartGameButton from "../Buttons/StartGameButton";

export default class StartContainer extends BaseMenuContainer{
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

        const startButton = new StartGameButton(scene, width/2, height*0.9);
        this.add(startButton);

        this.isGameStarted = false;

        this.scene.events.on(EVENT_NAMES.START_BUTTON_PRESSED, this.startGame, this);
        this.scene.events.on(
            EVENT_NAMES.CLOSE_MENU_WHILE_START,
            ()=>{
                if(!this.isGameStarted) this.openMenu();
            }
        );
        this.scene.events.on(
            EVENT_NAMES.OPEN_MENU_WHILE_START,
            ()=>{
                if(!this.isGameStarted) this.quitMenu();
            }
        );
    }
    
    startGame(){
        this.isGameStarted = true;
        this.quitMenu();
        this.scene.events.emit(EVENT_NAMES.START_READYGO);
    }

}