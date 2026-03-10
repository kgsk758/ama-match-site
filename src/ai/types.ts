// src/ai/types.ts

export interface AIResult {
    x: number;
    r: number;
}

export interface AIPlayerData {
    grid: number[][];
    queue: number[];
    stats: {
        attack: number;
        attack_chain: number;
        attack_frame: number;
        allClear: boolean;
    };
}

export interface AIThinkRequest {
    selfData: AIPlayerData;
    enemyData: AIPlayerData;
    targetPoint: number;
}

export interface AIWorkerRequest {
    type: 'init' | 'think';
    data?: AIThinkRequest;
}

export interface AIWorkerResponse {
    type: 'ready' | 'result' | 'error';
    result?: AIResult;
    error?: string;
}
