import BaseButton from "../base/BaseButton";

export default class MenuButton extends BaseButton{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(scene, x, y){
        super(scene, x, y);
        
        const buttonText = this.scene.add.text(0, 0, "Menu");
        buttonText.setOrigin(0.5); // Center the text within the container
        this.add(buttonText);
        
        this.initInteractive();
    }

}