export const UI_CONFIG = {
    GAME_WIDTH: 800,
    GAME_HEIGHT: 600,

    SLIDE_EASE: 'Power2',
    SLIDE_DURATION: 800
}
export const SCENE_KEYS = {
    UI_SCENE: 'uiScene',
    MAIN_SCENE: 'mainScene',
    AI_MATCH_SCENE: 'aiMatchScene',
    PRACTICE_SCENE: 'practiceScene'
};

export const GAME_SCENE_IDX = {

    [SCENE_KEYS.PRACTICE_SCENE]: 0,

    [SCENE_KEYS.AI_MATCH_SCENE]: 1,

};



export const SCENE_ORDER = [

    SCENE_KEYS.PRACTICE_SCENE,

    SCENE_KEYS.AI_MATCH_SCENE,

];
