import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.UISCENE);
  }

  create() {
    const gameWidth = Number(this.sys.game.config.width);
    const uiBarHeight = 60; // Height of the UI bar

    // Create a graphics object for the background of the UI bar
    this.add.rectangle(gameWidth / 2, uiBarHeight / 2, gameWidth, uiBarHeight, 0x333333)
      .setDepth(1); // Ensure it's on top

    // Mode Selector Button
    const modeSelectButton = this.add.text(50, uiBarHeight / 2, 'Mode', {
      fontSize: '24px',
      fill: '#ffffff'
    })
    .setOrigin(0, 0.5)
    .setInteractive()
    .setDepth(2);

    modeSelectButton.on('pointerdown', () => {
      console.log('Mode Selector Clicked');
      // Emit an event that the Game scene can listen to
      this.game.events.emit('modeSelectClicked');
    });

    // Settings Button
    const settingsButton = this.add.text(gameWidth - 50, uiBarHeight / 2, 'Settings', {
      fontSize: '24px',
      fill: '#ffffff'
    })
    .setOrigin(1, 0.5)
    .setInteractive()
    .setDepth(2);

    settingsButton.on('pointerdown', () => {
      console.log('Settings Clicked');
      // Emit an event if settings need to be handled by another scene
      this.game.events.emit('settingsClicked');
    });
  }
}
