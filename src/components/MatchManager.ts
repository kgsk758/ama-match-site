import Phaser from "phaser";
import { PLAYER_CONFIG } from "../constants";
import GameManager from "../puyo-engine/core/GameManager";
import Controller from "./player/Controller";

export default class MatchManager {
    private teamConfig: {team: number, type: string}[];
    private playerPlaces: {x:number, y:number}[];
    private scene: Phaser.Scene;
    public gameManager: GameManager;
    private controllers: Controller[] = [];

    constructor(
        teamConfig: {team: number, type: string}[] = [{team:1, type:PLAYER_CONFIG.HUMAN}, {team:2, type:PLAYER_CONFIG.AI}],
        playerPlaces: {x:number, y:number}[],
        scene: Phaser.Scene,
    ){
        this.teamConfig = teamConfig;
        this.playerPlaces = playerPlaces;
        this.scene = scene;
        
        // 1. Initialize logic
        this.gameManager = new GameManager(this.teamConfig);

        if (teamConfig.length !== playerPlaces.length) {
            console.error('Error: teamConfig.length !== playerPlaces.length @MatchManager.ts');
        }

        // 2. Initialize controllers for each player
        this.teamConfig.forEach((c, idx) => {
            const player = this.gameManager.players[idx];
            const controller = new Controller(player, this.scene, this.playerPlaces[idx], c);
            this.controllers.push(controller);
        });

        // 3. Register scene update
        this.scene.events.on('update', this.update, this);
        this.scene.events.once('shutdown', this.destroy, this);
    }

    private update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;
        
        // console.log("MatchManager Update:", time, delta); // デバッグ用
        // Update all controllers (handling input, animations, and periodic logic)
        this.controllers.forEach(controller => controller.update(time, delta));
        
        // Here we can later add GameManager processing like garbage exchange
        // this.gameManager.processGarbage();
    }

    public destroy() {
        this.scene.events.off('update', this.update, this);
        this.controllers = [];
    }
}
