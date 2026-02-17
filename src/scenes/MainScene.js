import Phaser from 'phaser';
import { SCENE_KEYS, SCENE_ORDER, GAME_SCENE_IDX } from '../constants';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MAIN_SCENE);
  }

  create() {
    this.currentSceneKey = SCENE_ORDER[0]; // Default starting scene

    // Launch both game content scenes. They will run in parallel.
    this.scene.launch(SCENE_KEYS.PRACTICE_SCENE);
    this.scene.launch(SCENE_KEYS.AI_MATCH_SCENE);

    // Launch the UI scene in parallel. It will run independently on top.
    this.scene.launch(SCENE_KEYS.UI_SCENE);
    //this.scene.bringToTop(SCENE_KEYS.UI_SCENE);

    // Listen for events from the UIScene
    this.game.events.on('modeSelectClicked', this.handleModeSelect, this);

  }

  handleModeSelect(newSceneKey) {
    if (newSceneKey === this.currentSceneKey) {
      console.log(`Already in ${newSceneKey}. No scene change needed.`);
      return;
    }

    console.log(`Game scene received modeSelectClicked event, attempting to switch to: ${newSceneKey}`);

    const idxTo = GAME_SCENE_IDX[newSceneKey];

    // Slide all game cameras
    SCENE_ORDER.forEach(sceneKey => {
      const gameScene = this.scene.get(sceneKey);
      if (gameScene && gameScene.slideSceneTo) {
        gameScene.slideSceneTo(idxTo);
      }
    });

    this.currentSceneKey = newSceneKey;
  }

}
