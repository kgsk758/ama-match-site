import Phaser from "phaser";

export default class BaseButton extends Phaser.GameObjects.Container{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(scene, x, y){
        super(scene, x, y);
        this.isButtonPressed = false;
        this.scene.add.existing(this);
    }
    enterHoverState(){

    }
    leaveHoverState(){
        this.isButtonPressed = false;
    }
    enterActiveState(){
        this.isButtonPressed = true;
    }
    leaveActiveState(){
        if(this.isButtonPressed){
            this.buttonClicked();
        }
        this.isButtonPressed = false;
    }
    buttonClicked(){
    }
    initInteractive(){
        this.setSize(this.getBounds().width, this.getBounds().height); // Set the interactive size using getBounds() as requested
        this.setInteractive({useHandCursor: true})
            .on("pointerover", ()=>this.enterHoverState())
            .on("pointerout", ()=>this.leaveHoverState())
            .on("pointerdown", ()=>this.enterActiveState())
            .on("pointerup", ()=>this.leaveActiveState());
    }
}