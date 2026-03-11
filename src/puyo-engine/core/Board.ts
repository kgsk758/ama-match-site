import { BOARD_CONFIG, CELL_CONFIG, SCORE_CONFIG } from "./core-config";
interface BoardConfig {
    rows?: number;
    columns?: number;
    colors?: number;
}
/**
 * 左下:(x,y) = (0,0)
 */
export default class Board {
    public grid: number[][];
    public rows: number;
    public columns: number;
    public pop_rows: number;

    constructor({
        rows = BOARD_CONFIG.HEIGHT,
        columns = BOARD_CONFIG.WIDTH,
    }: BoardConfig = {}){
        this.rows = rows;
        this.columns = columns;
        this.pop_rows = this.rows - 2; 
        this.grid = Array.from({length: columns}, ()=>new Array(rows).fill(CELL_CONFIG.NONE_NUM));
    }

    public isValid(x: number, y: number): boolean{
        if(x >= this.columns || x < 0 || y >= this.rows || y < 0){
            return false;
        }
        return this.grid[x][y] === CELL_CONFIG.NONE_NUM;
    }

    public setPuyo(x: number, y: number, cell: number): boolean{
        if(x >= this.columns || x < 0 || y >= this.rows || y < 0) return false;
        this.grid[x][y] = cell;
        return true;
    }

    public drop(): {x:number, fromY:number, toY:number, cell:number}[]{
        const drops: {x:number, fromY:number, toY:number, cell:number}[] = [];
        this.grid.forEach((col, x)=>{
            let noneCells = 0;
            col.forEach((cell, y)=>{
                if(y < this.rows - 1){
                    if(cell === CELL_CONFIG.NONE_NUM){
                        noneCells++;
                    }else if(noneCells > 0){
                        drops.push({x, fromY: y, toY: y - noneCells, cell});
                        this.grid[x][y - noneCells] = cell;
                        this.grid[x][y] = CELL_CONFIG.NONE_NUM;
                    }
                }
            })
        })
        return drops;
    }

    public getConnected(): {cell: number, places: {x:number, y:number}[]}[]{
        const results: {cell: number, places: {x:number, y:number}[]}[] = [];
        const visited: boolean[][] = Array.from({ length: this.columns }, () => new Array(this.rows).fill(false));
        const directions = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

        for (let x = 0; x < this.columns; x++) {
            for (let y = 0; y < this.pop_rows; y++) {
                const currentCell = this.grid[x][y];
                if (currentCell === CELL_CONFIG.NONE_NUM || currentCell === CELL_CONFIG.GARBAGE_NUM || visited[x][y]) continue;

                const queue: {x: number, y: number}[] = [{ x, y }];
                const places: {x: number, y: number}[] = [];
                visited[x][y] = true;

                while (queue.length > 0) {
                    const curr = queue.shift()!;
                    places.push(curr);
                    for (const dir of directions) {
                        const nx = curr.x + dir.dx;
                        const ny = curr.y + dir.dy;
                        if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.pop_rows) {
                            if (!visited[nx][ny] && this.grid[nx][ny] === currentCell) {
                                visited[nx][ny] = true;
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
                if (places.length >= 4) results.push({ cell: currentCell, places });
            }
        }
        return results;
    }

    /**
     * 指定したぷよグループに隣接するお邪魔ぷよの場所を返す
     */
    public getNeighborGarbage(groups: {places: {x:number, y:number}[]}[]): {x:number, y:number}[] {
        const garbagePlaces: {x:number, y:number}[] = [];
        const directions = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
        
        groups.forEach(group => {
            group.places.forEach(p => {
                for (const dir of directions) {
                    const nx = p.x + dir.dx;
                    const ny = p.y + dir.dy;
                    if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.rows) {
                        // @ts-ignore
                        if (this.grid[nx][ny] === 4) { // 4 は GARBAGE_NUM (CELL_CONFIG.GARBAGE_NUM)
                            if (!garbagePlaces.some(g => g.x === nx && g.y === ny)) {
                                garbagePlaces.push({x: nx, y: ny});
                            }
                        }
                    }
                }
            });
        });
        return garbagePlaces;
    }

    public getScore(connects: {cell: number, places: {x:number, y:number}[]}[], chain: number): number{
        let puyos = 0;
        const colors:number[] = [];
        let connect_bonus = 0;
        connects.forEach((connect) => {
            if(!colors.includes(connect.cell)) colors.push(connect.cell);
            connect_bonus += SCORE_CONFIG.GET_CONNECT_BONUS(connect.places.length);
            puyos += connect.places.length;
        })
        const bonus = Math.max(1, connect_bonus + SCORE_CONFIG.COLORS_BONUS[colors.length] + SCORE_CONFIG.GET_CHAIN_BONUS(chain));
        return puyos * 10 * bonus;
    }

    public pop(connected: {cell: number, places: {x:number, y:number}[]}[]): void {
        const directions = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
        connected.forEach(group => {
            group.places.forEach(pos => {
                this.grid[pos.x][pos.y] = CELL_CONFIG.NONE_NUM;
                for (const dir of directions) {
                    const nx = pos.x + dir.dx;
                    const ny = pos.y + dir.dy;
                    if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.rows) {
                        if (this.grid[nx][ny] === CELL_CONFIG.GARBAGE_NUM) this.grid[nx][ny] = CELL_CONFIG.NONE_NUM;
                    }
                }
            });
        });
    }

    public executeChainStep(chainCount: number) {
        const connects = this.getConnected();
        if (connects.length === 0) return null;
        const score = this.getScore(connects, chainCount);
        this.pop(connects);
        const drops = this.drop();
        return { cleared: connects, drops, score };
    }

    public getChain() {
        const results = [];
        let count = 1;
        while(true) {
            const step = this.executeChainStep(count++);
            if(!step) break;
            results.push(step);
        }
        return results;
    }

    getDropPlace() { return { x: 2, y: 11.5 }; }
    getDeathPlace() { return { x: 2, y: 11 }; }

    public dropGarbage(num: number): {x: number, y: number}[] {
        const maxToDrop = Math.min(30, num);
        const placed: {x: number, y: number}[] = [];

        // 各列に何個降らせるかを計算
        const baseRows = Math.floor(maxToDrop / this.columns);
        const remainder = maxToDrop % this.columns;

        // 列ごとの落下数を配列にセット
        const columnCounts = new Array(this.columns).fill(baseRows);
        
        // 余り分をランダムな列に1つずつ割り振る（重複なし）
        const randomCols = Array.from({length: this.columns}, (_, i) => i)
            .sort(() => Math.random() - 0.5)
            .slice(0, remainder);
        
        randomCols.forEach(col => columnCounts[col]++);

        // 各列ごとに下から空いている場所を埋める
        for (let x = 0; x < this.columns; x++) {
            let toDrop = columnCounts[x];
            for (let y = 0; y < this.rows && toDrop > 0; y++) {
                if (this.grid[x][y] === CELL_CONFIG.NONE_NUM) {
                    this.grid[x][y] = CELL_CONFIG.GARBAGE_NUM;
                    placed.push({x, y});
                    toDrop--;
                }
            }
        }
        
        return placed;
    }

    public isEmpty(): boolean {
        for (let x = 0; x < this.columns; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this.grid[x][y] !== CELL_CONFIG.NONE_NUM) return false;
            }
        }
        return true;
    }
}
