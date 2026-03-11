// src/components/MatchManager.ts
import Phaser from "phaser";
import { PLAYER_CONFIG } from "../constants";
import GameManager from "../puyo-engine/core/GameManager";
import Controller from "./player/Controller";
import AIController from "./player/AIController";

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
            const player0 = this.gameManager.players[0];
            const player = this.gameManager.players[idx];
            let controller: Controller;
            if (c.type === PLAYER_CONFIG.AI) {
                controller = new AIController(player, player0, this.gameManager, idx, this.scene, this.playerPlaces[idx], c);
            } else {
                controller = new Controller(player, this.gameManager, idx, this.scene, this.playerPlaces[idx], c);
            }
            this.controllers.push(controller);
        });

        // 3. Register scene update
        this.scene.events.on('update', this.update, this);
        this.scene.events.once('shutdown', this.destroy, this);
    }

    private update(time: number, delta: number) {
        if (!(this.scene as any).gamePlaying) return;
        
        // Update all controllers
        this.controllers.forEach(controller => controller.update(time, delta));
        
        // Note: gameManager.processGarbage() is no longer called here.
        // Garbage exchange is now triggered manually by controllers via sendAttack()
        // when a chain sequence finishes.
    }

    public destroy() {
        this.scene.events.off('update', this.update, this);
        this.controllers = [];
    }
}
