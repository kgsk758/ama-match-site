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
        this.scene.game.events.on(EVENT_NAMES.OPEN_MENU+this.scene.scene.key, this.menuOpened, this);
        this.scene.events.on(EVENT_NAMES.START_READYGO,this.initialReadyGo,this);

        this.text = this.scene.add.text(x, y, 'Ready').setOrigin(0.5);
        this.text.setVisible(false);
    }
    showReadyGo(){
        if(this.startTimer) this.startTimer.remove();
        this.scene.gamePlaying = false; // アニメーション中は操作不能に
        this.text.setText('Ready...');
        this.text.setVisible(true);
        this.startTimer = this.scene.time.delayedCall(1000,()=>{
            this.text.setText('Go!');
            this.startTimer = this.scene.time.delayedCall(1000, ()=>{
                this.text.setVisible(false);
                this.scene.gamePlaying = true; // ここで開始
                this.scene.tweens.resumeAll(); // 演出終了後にゲームのアニメーションを再開
                this.startTimer = null;
            })
        },[],this)

    }
    menuClosed(){
        // タイマー（ReadyGoの進行に必要）だけ再開
        this.scene.time.paused = false;
        if(this.gameStarted && !this.startTimer) this.showReadyGo();
    }
    menuOpened(){
        this.scene.gamePlaying = false; // メニュー表示時は停止
        // 時間を止める
        this.scene.tweens.pauseAll();
        this.scene.time.paused = true;
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