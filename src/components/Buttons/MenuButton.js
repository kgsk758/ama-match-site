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
        this.scene.add.existing(this); // Add to scene as requested to test this behavior
        const buttonText = this.scene.add.text(0, 0, "Menu");
        buttonText.setOrigin(0.5); // Center the text within the container
        this.add(buttonText);
        this.setSize(this.getBounds().width, this.getBounds().height); // Set the interactive size using getBounds() as requested
        this.initInteractive();
    }

}