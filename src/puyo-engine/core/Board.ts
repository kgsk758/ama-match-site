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
    /**
     * デフォルト値以外想定外
     */
    constructor({
        rows = BOARD_CONFIG.HEIGHT,
        columns = BOARD_CONFIG.WIDTH,
    }: BoardConfig = {}){
        this.rows = rows;
        this.columns = columns;
        this.pop_rows = this.rows - 2; //12段目までしか消えない
        this.grid = Array.from({length: columns}, ()=>new Array(rows).fill(0));
    }
    /**
     * ぷよを配置可能か
     */
    public isValid(x: number, y: number): boolean{
        if(x >= this.columns || x < 0 || y >= this.rows || y < 0){
            return false;
        }
        if(this.grid[x][y] === CELL_CONFIG.NONE_NUM) return true;

        return false;
    }
    public setPuyo(x: number, y: number, cell: number): boolean{
        if(x >= this.columns || x < 0 || y >= this.rows || y < 0 || !CELL_CONFIG.CELL_NUM_TYPES.includes(cell)){
            console.log('failed to setPuyo: invalid input');
            return false;
        }
        if(cell === CELL_CONFIG.NONE_NUM){
            this.grid[x][y] = cell;
            return true;
        }
        if(this.grid[x][y] === CELL_CONFIG.NONE_NUM){
            this.grid[x][y] = cell;
            return true;
        }
        return false;
    }

    public drop(){
        this.grid.forEach((col, x)=>{
            let noneCells = 0;
            col.forEach((cell, y)=>{
                if(y < this.rows - 1){//14段目は落下しない
                    if(cell === CELL_CONFIG.NONE_NUM){
                        noneCells++;
                    }else if(noneCells > 0){
                        this.grid[x][y - noneCells] = cell;
                        this.grid[x][y] = CELL_CONFIG.NONE_NUM;
                    }
                }
            })
        })
    }

    public getConnected(): {cell: number, places: {x:number, y:number}[]}[]{
        const results: {cell: number, places: {x:number, y:number}[]}[] = [];
        
        // 探索済みマスを管理するフラグ（二重カウントを防止）
        const visited: boolean[][] = Array.from(
            { length: this.columns }, 
            () => new Array(this.rows).fill(false)
        );

        // 隣接チェック用（上下左右）
        const directions = [
            { dx: 0, dy: 1 },  // 上
            { dx: 0, dy: -1 }, // 下
            { dx: 1, dy: 0 },  // 右
            { dx: -1, dy: 0 }  // 左
        ];

        // x(列)と y(行)を走査
        for (let x = 0; x < this.columns; x++) {
            // 12段目（pop_rows）までしか消えないため、y < this.pop_rows で探索
            for (let y = 0; y < this.pop_rows; y++) {
                const currentCell = this.grid[x][y];

                // 空マス、または既に探索済みのマスはスキップ
                if (currentCell === CELL_CONFIG.NONE_NUM || visited[x][y]) {
                    continue;
                }

                /* * 【補足】
                 * おじゃまぷよは「4つ繋がって消える」対象ではないため、
                 * おじゃまぷよをCELL_CONFIGで定義している場合はここでスキップします。
                 * 例: if (currentCell === CELL_CONFIG.OJYAMA_NUM) continue;
                 */
                if (currentCell === CELL_CONFIG.GARBAGE_NUM) continue;
                // 幅優先探索（BFS）で繋がっているぷよを取得
                const queue: {x: number, y: number}[] = [{ x, y }];
                const places: {x: number, y: number}[] = [];
                
                // 開始地点を探索済みにする
                visited[x][y] = true;

                while (queue.length > 0) {
                    const curr = queue.shift()!;
                    places.push(curr);

                    for (const dir of directions) {
                        const nx = curr.x + dir.dx;
                        const ny = curr.y + dir.dy;

                        // 盤面内（かつ消える段数である pop_rows 未満）かチェック
                        if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.pop_rows) {
                            // 未探索で、かつ「同じ色」のぷよであればキューに追加
                            if (!visited[nx][ny] && this.grid[nx][ny] === currentCell) {
                                visited[nx][ny] = true;
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }

                // 4つ以上繋がっていたら消去対象として結果に追加
                if (places.length >= 4) {
                    results.push({ cell: currentCell, places });
                }
            }
        }

        return results;
    }

    public getScore(
        connects: {cell: number, places: {x:number, y:number}[]}[],
        chain: number
    ): number{
        let puyos = 0;
        const colors:number[] = [];
        let connect_bonus = 0;
        connects.forEach((connect) => {
            if(!colors.includes(connect.cell)){
                colors.push(connect.cell);
            }
            connect_bonus += SCORE_CONFIG.GET_CONNECT_BONUS(connect.places.length);
            puyos += connect.places.length;
        })
        const colors_bonus = SCORE_CONFIG.COLORS_BONUS[colors.length];
        const chain_bonus = SCORE_CONFIG.GET_CHAIN_BONUS(chain);
        let bonus = connect_bonus + colors_bonus + chain_bonus;
        if(bonus === 0) bonus = 1;
        return puyos*10*bonus;
    }
    public pop(connected: {cell: number, places: {x:number, y:number}[]}[]):void{
        // 隣接チェック用（上下左右）
        const directions = [
            { dx: 0, dy: 1 },  // 上
            { dx: 0, dy: -1 }, // 下
            { dx: 1, dy: 0 },  // 右
            { dx: -1, dy: 0 }  // 左
        ];

        connected.forEach(group => {
            group.places.forEach(pos => {
                // 1. 繋がった通常のぷよを消去（空マスにする）
                if(pos.y < this.pop_rows){
                    this.grid[pos.x][pos.y] = CELL_CONFIG.NONE_NUM;

                    // 2. 隣接するおじゃまぷよの巻き込み消去処理
                    for (const dir of directions) {
                        const nx = pos.x + dir.dx;
                        const ny = pos.y + dir.dy;

                        // 盤面内に収まっているかチェック
                        if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.rows) {
                            // 隣接マスがおじゃまぷよだった場合、一緒に消去する
                            if (this.grid[nx][ny] === CELL_CONFIG.GARBAGE_NUM) {
                                this.grid[nx][ny] = CELL_CONFIG.NONE_NUM;
                            }
                        }
                    }
                }
            });
        });
    }
    /**
     * 連鎖情報を配列で返す
     */
    public getChain(): {
        connects: {cell: number, places: {x:number, y:number}[]}[],
        score: number,
    }[]{
        const chainResults: {
            connects: {cell: number, places: {x:number, y:number}[]}[],
            score: number,
        }[] = [];

        let chainCount = 1;
        while (true) {
            // 現在の盤面で繋がっているぷよを取得
            const connects = this.getConnected();
            
            // 消えるぷよがなければ連鎖終了
            if (connects.length === 0) break;

            // スコア計算
            const score = this.getScore(connects, chainCount);
            
            // 結果を保存
            chainResults.push({ connects, score });

            // ぷよを消去
            this.pop(connects);
            
            // 落下処理
            this.drop();
            
            // 連鎖数をインクリメント
            chainCount++;
        }

        return chainResults;
    }

    getDropPlace(): {x:number,y:number}{
        return {
            x: Math.floor(this.columns / 2) - 1,
            y: this.rows - 2.5
        }
    }
    getDeathPlace(): {x:number,y:number}{
        return {
            x: Math.floor(this.columns / 2) - 1,
            y: this.rows - 3
        }
    }

}