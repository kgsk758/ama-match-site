import Phaser from "phaser";
import { PLAYER_CONFIG } from "../constants";

export default class MatchManager {
    private teamConfig: {team: number, type: string}[];
    private playerPlaces: {x:number,y:number}[];
    private scene: Phaser.Scene;
    constructor(
        teamConfig: {team: number, type: string}[] = [{team:1,type:PLAYER_CONFIG.HUMAN},{team:2,type:PLAYER_CONFIG.AI}],
        playerPlaces: {x:number,y:number}[],
        scene: Phaser.Scene,
    ){
        this.teamConfig = teamConfig;
        this.playerPlaces = playerPlaces;
        this.scene = scene;
    }
}