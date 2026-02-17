import BaseMenuContainer from "../base/BaseMenuContainer";
import { UI_CONFIG } from "../../constants";

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
    }
}