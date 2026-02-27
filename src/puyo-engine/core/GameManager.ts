import Queue from "./Queue";
import Player from "./Player";
import { SEED_CONFIG } from "./core-config";
export default class GameManager {
    public players: Player[];
    public seed: number;
    constructor(
        teamConfig: {team: number, type: string}[],
        queueSeed: number = SEED_CONFIG.DEFAULT_SEED
    ){
        this.seed = queueSeed;
        this.players = Array.from({length: teamConfig.length}, () => {
            const queue = new Queue(this.seed);
            return new Player(queue);
        })
    }
    
}