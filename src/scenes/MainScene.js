import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MAIN_SCENE);
  }

  create() {
    this.currentSceneKey = SCENE_KEYS.PRACTICE_SCENE; // Default starting scene
    this.gameStarted = {
      [SCENE_KEYS.PRACTICE_SCENE]: false,
      [SCENE_KEYS.AI_MATCH_SCENE]: false,
    };

    this.gameWidth = Number(this.sys.game.config.width);
    this.gameHeight = Number(this.sys.game.config.height);

    // Launch both game content scenes. They will run in parallel.
    this.scene.launch(SCENE_KEYS.PRACTICE_SCENE);
    this.scene.launch(SCENE_KEYS.AI_MATCH_SCENE);

    // Make sure the scenes are created and accessible
    const practiceSceneInstance = this.scene.get(SCENE_KEYS.PRACTICE_SCENE);
    const aiMatchSceneInstance = this.scene.get(SCENE_KEYS.AI_MATCH_SCENE);

    //set the viewports
    this.practiceCam = practiceSceneInstance.cameras.main;
    this.aiCam = aiMatchSceneInstance.cameras.main;

    this.practiceCam.setViewport(0, 0, this.gameWidth, this.gameHeight);
    this.aiCam.setViewport(this.gameWidth, 0, this.gameWidth, this.gameHeight);

    // Initialize an array to hold game scene cameras in the order defined in SCENE_ORDER
    this.gameSceneOrder = SCENE_ORDER;
    this.gameSceneCameras = [];
    SCENE_ORDER.forEach(key => {
      if (key === SCENE_KEYS.PRACTICE_SCENE) {
        this.gameSceneCameras.push(this.practiceCam);
      } else if (key === SCENE_KEYS.AI_MATCH_SCENE) {
        this.gameSceneCameras.push(this.aiCam);
      }
    });

    // Launch the UI scene in parallel. It will run independently on top.
    this.scene.launch(SCENE_KEYS.UI_SCENE);

    // Listen for events from the UIScene
    this.game.events.on('modeSelectClicked', this.handleModeSelect, this);
    this.game.events.on('settingsClicked', this.handleSettings, this);

    // Listen for the startGame event from the overlay
    this.game.events.on('startGame', this.startActualGame, this);

    // Initially launch the overlay for the default scene
    this.launchOverlay(this.currentSceneKey);
  }

  handleModeSelect() {
    console.log('Game scene received modeSelectClicked event.');
    // Toggle between Practice and AI Match scenes
    if (this.currentSceneKey === SCENE_KEYS.PRACTICE_SCENE) {
      this.switchToScene(SCENE_KEYS.AI_MATCH_SCENE);
    } else {
      this.switchToScene(SCENE_KEYS.PRACTICE_SCENE);
    }
  }

  /**
   * Switches to a new game scene with a camera slide animation.
   * @param {string} newSceneKey - The key of the scene to switch to.
   */
  switchToScene(newSceneKey) {
    if (this.currentSceneKey === newSceneKey) {
      return; // Already on this scene
    }

    const prevSceneKey = this.currentSceneKey;
    this.currentSceneKey = newSceneKey;

    const fromIdx = GAME_SCENE_IDX[prevSceneKey];
    const toIdx = GAME_SCENE_IDX[newSceneKey];

    // Slide the cameras
    this.slideToScene(this.gameSceneCameras, toIdx, fromIdx);

    // Launch the overlay for the new scene
    // The modeTitle can be inferred from the sceneKey or passed explicitly if needed
    const modeTitle = (newSceneKey === SCENE_KEYS.PRACTICE_SCENE) ? 'Practice Alone Mode' : 'AI Match Mode';
    this.launchOverlay(this.currentSceneKey, modeTitle);
  }

  handleSettings() {
    console.log('Game scene received settingsClicked event.');
    // Here you would typically open a settings menu/scene
  }

  launchOverlay(sceneKey, modeTitle) {
    // If an overlay is already active, stop it first
    if (this.scene.isActive('StartGameOverlayScene')) {
        this.scene.stop('StartGameOverlayScene');
    }

    // Launch the overlay scene, passing the mode title and the key of the scene it's for
    this.scene.launch('StartGameOverlayScene', {
        modeTitle: modeTitle || (sceneKey === SCENE_KEYS.PRACTICE_SCENE ? 'Practice Alone Mode' : 'AI Match Mode'),
        gameSceneKey: sceneKey
    });
  }

  /**
   * @param {[Phaser.Cameras.Scene2D.Camera]} cameras
   * @param {Number} toIdx -index of the scene you want to slide to
   * @param {Number} nowIdx -index of the scene now
   */
  slideToScene(cameras, idxTo, idxNow){
    const deltaX = this.gameWidth*(idxTo - idxNow)*-1;
    for(const camera of cameras){
      const cameraX = camera.x;
      const newCameraX = cameraX + deltaX;
      this.moveScene(camera, newCameraX);
    }
  }
  /**
   * @param {Phaser.Cameras.Scene2D.Camera} camera
   * @param {Number} x -Move scene to x
   */
  moveScene(camera, x){
    this.tweens.add({
        targets: camera,
        x: x,
        ease: 'Power2',
        duration: 800
      }
    );
  }

  startActualGame(gameSceneKey) {
    console.log(`Activating game logic for ${gameSceneKey}`);
    this.gameStarted[gameSceneKey] = true;

    // You can add more specific game activation logic here
    // For now, let's just make the text in the scene indicate it's "running"
    const targetScene = this.scene.get(gameSceneKey);
    if (targetScene && targetScene.children) {
        targetScene.children.each((child) => {
            if (child.text && child.text.includes('Scene')) {
                child.setText(`${gameSceneKey} - Game Running!`);
            }
        });
    }
    // Potentially, resume physics, enable input, etc. for the targetScene
    this.scene.resume(gameSceneKey);
  }
}
