import GameSceneBase from './GameSceneBase';
import { SCENE_KEYS } from '../../constants';

export default class PracticeScene extends GameSceneBase {
  constructor() {
    super(SCENE_KEYS.PRACTICESCENE);
  }

  create() {
    this.add.text(100, 100, 'Practice Scene', { fontSize: '32px', fill: '#fff' });
  }
}
