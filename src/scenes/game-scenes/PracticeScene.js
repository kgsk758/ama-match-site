import GameSceneBase from './GameSceneBase';
import { SCENE_KEYS } from '../../constants';

export default class PracticeScene extends GameSceneBase {
  constructor() {
    super(SCENE_KEYS.PRACTICE_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x666666);
    this.add.text(100, 100, 'Practice Scene', { fontSize: '32px', fill: '#fff' });
  }
}
