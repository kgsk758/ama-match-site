import Phaser from 'phaser';
import AIMatchScene from './game-scenes/AIMatchScene.js';
import PracticeScene from './game-scenes/PracticeScene.js';
import StartGameOverlayScene from './ui-scenes/StartScene.js'; // Import the overlay scene

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('main-scene');
    this.currentScene = 'PracticeScene'; // Default starting scene
  }

  create() {
    this.gameStarted = {
      'PracticeScene': false,
      'AIMatchScene': false,
    };

    // Add both scenes but don't start them yet
    this.practiceScene = this.scene.add('PracticeScene', PracticeScene, false);
    this.aiMatchScene = this.scene.add('AIMatchScene', AIMatchScene, false);

    const gameWidth = Number(this.sys.game.config.width);
    const gameHeight = Number(this.sys.game.config.height);

    // Launch both game content scenes. They will run in parallel.
    this.scene.launch('PracticeScene');
    this.scene.launch('AIMatchScene');

    // Make sure the scenes are created and accessible
    const practiceSceneInstance = this.scene.get('PracticeScene');
    const aiMatchSceneInstance = this.scene.get('AIMatchScene');

    // Set the camera bounds to cover both scenes side-by-side
    this.cameras.main.setBounds(0, 0, gameWidth * 2, gameHeight);
    this.cameras.main.scrollX = 0; // Initial camera position: show the Practice Scene

    // Launch the UI scene in parallel. It will run independently on top.
    this.scene.launch('UIScene');

    // Listen for events from the UIScene
    this.game.events.on('modeSelectClicked', this.handleModeSelect, this);
    this.game.events.on('settingsClicked', this.handleSettings, this);

    // Listen for the startGame event from the overlay
    this.game.events.on('startGame', this.startActualGame, this);

    // Initially launch the overlay for the default scene
    this.launchOverlay(this.currentScene);
  }

  handleModeSelect() {
    console.log('Game scene received modeSelectClicked event.');
    // Toggle between Practice and AI Match scenes
    if (this.currentScene === 'PracticeScene') {
      this.switchToScene('AIMatchScene', 'AI Match Mode');
    } else {
      this.switchToScene('PracticeScene', 'Practice Alone Mode');
    }
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
        modeTitle: modeTitle || (sceneKey === 'PracticeScene' ? 'Practice Alone Mode' : 'AI Match Mode'),
        gameSceneKey: sceneKey
    });
  }

  // Method to switch scenes with a slide effect
  switchToScene(sceneName, modeTitle) {
    if (this.currentScene === sceneName) {
      console.log(`Already in ${sceneName}`);
      // If already in the scene, just relaunch the overlay
      this.launchOverlay(sceneName, modeTitle);
      return;
    }

    const gameWidth = Number(this.sys.game.config.width);
    let targetScrollX = 0;

    if (sceneName === 'AIMatchScene') {
      targetScrollX = gameWidth; // Move camera to show AI Match Scene
    } else if (sceneName === 'PracticeScene') {
      targetScrollX = 0; // Move camera to show Practice Scene
    } else {
      console.warn(`Unknown scene: ${sceneName}`);
      return;
    }

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: targetScrollX,
      duration: 500, // Adjust duration for desired speed
      ease: 'Power2',
      onComplete: () => {
        this.currentScene = sceneName;
        console.log(`Switched to ${sceneName}`);
        // Launch the overlay after the camera has finished moving
        this.launchOverlay(sceneName, modeTitle);
      }
    });
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
