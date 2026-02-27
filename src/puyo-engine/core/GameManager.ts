import Queue from "./Queue";
import Player from "./Player";
import { SEED_CONFIG } from "./core-config";
export default class GameManager {
    public players: Player[];
    public seed: number;
    constructor(players: number, queueSeed: number = SEED_CONFIG.DEFAULT_SEED){
        this.seed = queueSeed;
        this.players = Array.from({length: players}, () => {
            const queue = new Queue(this.seed);
            return new Player(queue);
        })
    }
    
}