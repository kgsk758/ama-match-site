import GameSceneBase from './GameSceneBase';
import { SCENE_KEYS } from '../../constants';

export default class AIMatchScene extends GameSceneBase {
  constructor() {
    super(SCENE_KEYS.AI_MATCH_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x336699); // A distinct color for AI Match Scene
    this.add.text(100, 100, 'AI Match Scene', { fontSize: '32px', fill: '#fff' });
  }
}
