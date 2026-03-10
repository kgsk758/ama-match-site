// src/ai/worker.ts
import { AIWorkerRequest, AIWorkerResponse, AIThinkRequest } from './types';

let wasmModule: any = null;

const initWasm = async () => {
    if (wasmModule) return;
    
    const configResponse = await fetch('/assets/config.json');
    const aiConfig = await configResponse.json();
    
    // @ts-ignore
    importScripts('/assets/ama_ai.js');
    
    // @ts-ignore
    wasmModule = await self.createAmaAI({
        locateFile: (path: string) => `/assets/${path}`,
        mainScriptUrlOrBlob: '/assets/ama_ai.js'
    });
    
    wasmModule.initAI(JSON.stringify(aiConfig));
};

self.onmessage = async (e: MessageEvent<AIWorkerRequest>) => {
    const { type, data } = e.data;

    if (type === 'init') {
        try {
            await initWasm();
            self.postMessage({ type: 'ready' } as AIWorkerResponse);
        } catch (error: any) {
            console.error('AI Worker Init Error:', error);
            self.postMessage({ type: 'error', error: error?.message || String(error) } as AIWorkerResponse);
        }
        return;
    }

    if (type === 'think' && wasmModule && data) {
        const { selfData, enemyData, targetPoint } = data;

        [selfData, enemyData].forEach((p, idx) => {
            if (!p) return;
            wasmModule.clearField(idx);

            // Set Grid
            p.grid.forEach((col: number[], x: number) => {
                col.forEach((cell: number, y: number) => {
                    if (cell < 5) wasmModule.setField(idx, x, y, cell);
                });
            });

            // Set Queue
            const vector = new wasmModule.VectorInt();
            p.queue.forEach((c: number) => vector.push_back(c));
            if (vector.size() >= 2) {
                wasmModule.setQueue(idx, vector);
            }
            vector.delete();

            // Set Stats
            wasmModule.setStats(
                idx, 
                p.stats.attack, 
                p.stats.attack_chain, 
                p.stats.attack_frame, 
                0, 
                p.stats.allClear, 
                0
            );
        });

        const result = wasmModule.runThink(targetPoint);
        self.postMessage({ 
            type: 'result', 
            result: { x: result.x, r: result.r } 
        } as AIWorkerResponse);
    }
};
