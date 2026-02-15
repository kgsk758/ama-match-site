import Phaser from 'phaser';
import MainScene from './scenes/MainScene.js';
import UIScene from './scenes/UIScene.js';
import StartGameOverlayScene from './scenes/GameScenes/StartGameOverlayScene.js';

// ゲームの設定オブジェクト
const config = {
  type: Phaser.AUTO, // WebGLを優先的に使用し、対応していなければCanvasにフォールバック
  width: 800,
  height: 600,
  parent: 'game-container', // ゲームキャンバスを描画するDOM要素のID（index.htmlには不要）
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
    },
  },
  // 使用するシーンのリスト
  scene: [
    MainScene,
    UIScene,
    StartGameOverlayScene,
    
  ]
};

// ゲームインスタンスを生成
const game = new Phaser.Game(config);
