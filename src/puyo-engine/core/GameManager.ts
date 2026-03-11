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

    /**
     * 特定のプレイヤーの攻撃を確定させ、相手の pendingGarbage に送る
     */
    public sendAttack(attackerIndex: number) {
        if (this.players.length < 2) return;

        const attacker = this.players[attackerIndex];
        const opponent = this.players[attackerIndex === 0 ? 1 : 0];

        // プレイヤーから未送信の攻撃力を取り出す
        const attackAmount = attacker.consumeAttack();
        
        if (attackAmount > 0) {
            // 相手の待機列に追加
            opponent.pendingGarbage += attackAmount;
        }
    }
}
