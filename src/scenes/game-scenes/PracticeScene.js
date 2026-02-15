import Phaser from 'phaser';

export default class PracticeScene extends Phaser.Scene {
  constructor() {
    super('PracticeScene');
  }

  create() {
    this.add.text(100, 100, 'Practice Scene', { fontSize: '32px', fill: '#fff' });
  }
}
