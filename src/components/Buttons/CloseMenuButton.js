import BaseButton from "../base/BaseButton";
import { EVENT_NAMES } from "../../constants";

export default class CloseMenuButton extends BaseButton{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(scene, x, y){
        super(scene, x, y);
        const buttonText = this.scene.add.text(0, 0, 'close');
        buttonText.setOrigin(0.5);
        this.add(buttonText);
        this.initInteractive();
    }

    buttonClicked(){
        console.log(this.scene.scene.key)
        this.scene.game.events.emit(EVENT_NAMES.CLOSE_MENU+this.scene.scene.key);
    }
}