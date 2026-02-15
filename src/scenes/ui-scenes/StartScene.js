import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('start-scene');
  }

  init(data) {
    this.modeTitle = data.modeTitle || 'Game Mode';
    this.gameSceneKey = data.gameSceneKey; // Key of the scene to start/resume
  }

  create() {
    const gameWidth = Number(this.sys.game.config.width);
    const gameHeight = Number(this.sys.game.config.height);

    // Darken background
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x000000, 0.7)
      .setDepth(10);

    // Display mode title
    this.add.text(gameWidth / 2, gameHeight / 3, this.modeTitle, {
      fontSize: '48px',
      fill: '#ffffff'
    })
    .setOrigin(0.5)
    .setDepth(11);

    // Play Button
    const playButton = this.add.text(gameWidth / 2, gameHeight / 1.5, 'PLAY', {
      fontSize: '48px',
      fill: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .setDepth(11);

    playButton.on('pointerdown', () => {
      console.log(`Starting ${this.gameSceneKey} game...`);
      // Emit event to the main Game scene to start the actual game
      this.game.events.emit('startGame', this.gameSceneKey);
      this.scene.stop(); // Stop this overlay scene
    });
  }
}
