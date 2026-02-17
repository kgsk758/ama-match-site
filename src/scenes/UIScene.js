import Phaser from 'phaser';
import { SCENE_KEYS, UI_CONFIG } from '../constants';
import MenuButton from '../components/Buttons/MenuButton';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.UI_SCENE);
  }

  create() {
    const gameWidth = this.scale.width;
    const uiBarHeight = this.scale.height*UI_CONFIG.UI_TO_HEIGHT;
    // Create a graphics object for the background of the UI bar
    this.add.rectangle(gameWidth / 2, uiBarHeight / 2, gameWidth, uiBarHeight, 0x333333);

    // Practice Scene Button
    const practiceButton = this.add.text(50, uiBarHeight / 2, 'Practice', {
      fontSize: '24px',
      fill: '#ffffff'
    })
    .setOrigin(0, 0.5)
    .setInteractive();

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
    .setInteractive();

    aiMatchButton.on('pointerdown', () => {
      console.log('AI Match Button Clicked');
      this.game.events.emit('modeSelectClicked', SCENE_KEYS.AI_MATCH_SCENE);
    });

    const menuButtonTest = new MenuButton(this, gameWidth / 2, uiBarHeight/2);
  }
}
