import BaseGameScene from "../scenes/game-scenes/BaseGameScene";
import { EVENT_NAMES } from "../constants";
export default class ReadyGo{
    /**
     * 
     * @param {BaseGameScene} scene 
     * @param {Number} x 
     * @param {Number} y
     */
    constructor(scene, x, y){
        this.scene = scene;
        this.gameStarted = false;
        this.scene.game.events.on(EVENT_NAMES.CLOSE_MENU+this.scene.scene.key, this.menuClosed, this);
        this.scene.game.events.on(EVENT_NAMES.OPEN_MENU+this.scene.scene.key, this.stopReadyGo, this);
        this.scene.events.on(EVENT_NAMES.START_READYGO,this.initialReadyGo,this);

        this.text = this.scene.add.text(x, y, 'Ready').setOrigin(0.5);
        this.text.setVisible(false);
    }
    showReadyGo(){
        if(this.startTimer) this.startTimer.remove();
        this.text.setText('Ready...');
        this.text.setVisible(true);
        this.startTimer = this.scene.time.delayedCall(1000,()=>{
            this.text.setText('Go!');
            this.startTimer = this.scene.time.delayedCall(1000, ()=>{
                this.text.setVisible(false);
                this.scene.gamePlaying = true;
                this.startTimer = null;
            })
        },[],this)

    }
    menuClosed(){
        if(this.gameStarted && !this.startTimer) this.showReadyGo();
    }
    menuOpened(){
        this.scene.gamePlaying = false;
        if(this.gameStarted && this.startTimer) this.stopReadyGo();
    }
    stopReadyGo(){
        if(this.gameStarted && this.startTimer){
            this.startTimer.remove();
            this.startTimer = null;
            this.text.setVisible(false);
        }
    }
    initialReadyGo(){
        this.gameStarted = true;
        this.showReadyGo();
    }
}