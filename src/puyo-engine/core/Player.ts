import Board from "./Board";
import Queue from "./Queue";
import { SEED_CONFIG } from "./core-config";
export default class Player {
    public board: Board;
    public queue: number[][];
    constructor(queue: Queue){
        this.board = new Board();
        this.queue = queue.queue;
    }
    public controll(key: string){
        switch(key){
        }
    }
}