import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';
import MenuButton from '../components/Buttons/MenuButton';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.UI_SCENE);
  }

  create() {
    const gameWidth = Number(this.sys.game.config.width);
    const uiBarHeight = 60; // Height of the UI bar

    // Create a graphics object for the background of the UI bar
    this.add.rectangle(gameWidth / 2, uiBarHeight / 2, gameWidth, uiBarHeight, 0x333333)
      .setDepth(1); // Ensure it's on top

    // Practice Scene Button
    const practiceButton = this.add.text(50, uiBarHeight / 2, 'Practice', {
      fontSize: '24px',
      fill: '#ffffff'
    })
    .setOrigin(0, 0.5)
    .setInteractive()
    .setDepth(2);

    practiceButton.on('pointerdown', () => {
      console.log('Practice Button Clicked');
      this.game.events.emit('modeSelectClicked', SCENE_KEYS.PRACTICE_SCENE);
    });

    // AI Match Scene Button
    const aiMatchButton = this.add.text(gameWidth - 150, uiBarHeight / 2, 'AI Match', { // Adjust position
      fontSize: '24px',
      fill: '#ffffff'
    })
    .setOrigin(0, 0.5)
    .setInteractive()
    .setDepth(2);

    aiMatchButton.on('pointerdown', () => {
      console.log('AI Match Button Clicked');
      this.game.events.emit('modeSelectClicked', SCENE_KEYS.AI_MATCH_SCENE);
    });

    const menuButtonTest = new MenuButton(this, gameWidth / 2, uiBarHeight/2)
      .setDepth(2);
  }
}
