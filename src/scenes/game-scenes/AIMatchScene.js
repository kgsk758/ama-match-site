import Phaser from 'phaser';

export default class AIMatchScene extends Phaser.Scene {
  constructor() {
    super('AIMatchScene');
  }

  create() {
    this.add.text(100, 100, 'AI Match Scene', { fontSize: '32px', fill: '#fff' });
  }
}
