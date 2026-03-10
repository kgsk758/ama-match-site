// src/ai/bridge.ts
import { AIWorkerRequest, AIWorkerResponse, AIThinkRequest, AIResult } from './types';

export class AIBridge {
    private static instance: AIBridge | null = null;
    private worker: Worker | null = null;
    private ready: boolean = false;
    private onResultCallback: ((result: AIResult) => void) | null = null;

    private constructor() {}

    static getInstance(): AIBridge {
        if (!AIBridge.instance) {
            AIBridge.instance = new AIBridge();
        }
        return AIBridge.instance;
    }

    init() {
        if (this.worker) return;

        console.log("AI Bridge: Initializing Worker...");
        this.worker = new Worker(
            new URL('./worker.ts', import.meta.url)
        );

        this.worker.onmessage = (e: MessageEvent<AIWorkerResponse>) => {
            const { type, result, error } = e.data;
            if (type === 'ready') {
                console.log("AI Bridge: Worker Ready.");
                this.ready = true;
            } else if (type === 'result' && result) {
                if (this.onResultCallback) {
                    this.onResultCallback(result);
                }
            } else if (type === 'error') {
                console.error("AI Bridge: Worker Error:", error);
            }
        };

        this.worker.postMessage({ type: 'init' } as AIWorkerRequest);
    }

    isReady(): boolean {
        return this.ready;
    }

    think(data: AIThinkRequest, onResult: (result: AIResult) => void) {
        if (!this.worker || !this.ready) return;
        this.onResultCallback = onResult;
        this.worker.postMessage({ type: 'think', data } as AIWorkerRequest);
    }
}
