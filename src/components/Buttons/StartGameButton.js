import BaseButton from "../base/BaseButton";
import { EVENT_NAMES } from "../../constants";

export default class StartGameButton extends BaseButton{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(scene, x, y){
        super(scene, x, y);
        const buttonText = this.scene.add.text(0, 0, 'start');
        buttonText.setOrigin(0.5);
        this.add(buttonText);
        this.initInteractive();
    }

    buttonClicked(){
        console.log(this.scene.scene.key)
        this.scene.events.emit(EVENT_NAMES.START_BUTTON_PRESSED);
    }
}