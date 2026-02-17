import Phaser from "phaser";
import { UI_CONFIG } from "../../constants";

export default class BaseMenuContainer extends Phaser.GameObjects.Container{
    /**
     * 
     * @param {Phaser.Scene} scene 
     * @param {Number} x 
     * @param {Number} y
     * @param {Number} width  
     * @param {Number} height 
     */
    constructor(scene, x, y, width, height){
        super(scene, x, y);
        
        this.setSize(width, height); // Explicitly set the container's size
        this.gameWidth = this.scene.sys.game.config.width;
        this.gameHeight = this.scene.sys.game.config.height;
        this.setPositionToCenter();
        // Create the barrier that covers the whole game area, added directly to the scene
        const barrier = this.scene.add.rectangle(
            this.gameWidth / 2, // Centered horizontally
            this.gameHeight / 2, // Centered vertically
            this.gameWidth,
            this.gameHeight,
            0x000000,
            0.1
        );
        barrier.setInteractive()
            .on("pointerdown", ()=>this.quitMenu());
        // Do NOT add barrier to this container, it should be a scene-level overlay

        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xff0000, 0.5);
        const radius = Math.min(width, height) * UI_CONFIG.START_CONTAINER_BACKGROUND_RADIUS;
        graphics.fillRoundedRect(0, 0, width, height, radius);
        this.add(graphics); // Add graphics to this container
        graphics.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, width, height), 
            Phaser.Geom.Rectangle.Contains
        );
    }
    
    quitMenu(){
        console.log("quitMenu() called!");
    }

    createMenuButton(){

    }

    activate(){
        this.setVisible(true);
    }

    setPositionToCenter(){
        const centerX = this.x - this.width/2;
        const centerY = this.y - this.height/2;
        this.setPosition(centerX, centerY);
    }
}