import Phaser from "phaser";
export default class PlayerContainer extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, place: {x:number, y:number}){
        super(scene, place.x, place.y);
    }
}