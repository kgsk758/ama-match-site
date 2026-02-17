import Phaser, { Scale } from 'phaser';
import { UI_CONFIG } from './constants.js';
import MainScene from './scenes/MainScene.js';
import UIScene from './scenes/UIScene.js';
import AIMatchScene from './scenes/game-scenes/AIMatchScene.js';
import PracticeScene from './scenes/game-scenes/PracticeScene.js';

// ゲームの設定オブジェクト
const config = {
  type: Phaser.AUTO, // WebGLを優先的に使用し、対応していなければCanvasにフォールバック
  scale:{
    mode: Phaser.Scale.FIT, // 親要素のサイズに合わせて自動リサイズ
    width: UI_CONFIG.GAME_WIDTH,
    height: UI_CONFIG.GAME_HEIGHT,
    parent: 'game-container', // ゲームキャンバスを描画するDOM要素のID（index.htmlには不要）
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
    },
  },
  // 使用するシーンのリスト
  scene: [
    MainScene,
    AIMatchScene,
    PracticeScene,
    UIScene,
  ]
};

// ゲームインスタンスを生成
const game = new Phaser.Game(config);
