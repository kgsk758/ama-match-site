import Phaser from "phaser";
import { PLAYER_CONFIG } from "../constants";
import GameManager from "../puyo-engine/core/GameManager";
import PlayerContainer from "./containers/PlayerContainer";

export default class MatchManager {
    private teamConfig: {team: number, type: string}[];
    private playerPlaces: {x:number,y:number}[];
    private scene: Phaser.Scene;
    private gameManager: GameManager;
    private playerContainers: Phaser.GameObjects.Container[];
    constructor(
        teamConfig: {team: number, type: string}[] = [{team:1,type:PLAYER_CONFIG.HUMAN},{team:2,type:PLAYER_CONFIG.AI}],
        playerPlaces: {x:number,y:number}[],
        scene: Phaser.Scene,
    ){
        this.teamConfig = teamConfig;
        this.playerPlaces = playerPlaces;
        this.scene = scene;
        this.gameManager = new GameManager(this.teamConfig);
        this.playerContainers = [];
        if(teamConfig.length !== playerPlaces.length){
            console.log('Error: teamConfig.length !== playerPlaces.length @MatchManager.ts');
        }
        this.teamConfig.forEach((config,idx)=>{
            const playerContainer = new PlayerContainer(this.scene, this.playerPlaces[idx]);
            this.playerContainers.push(playerContainer);
            this.scene.add.existing(playerContainer);
        })
    }
}