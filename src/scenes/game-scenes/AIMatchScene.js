import GameSceneBase from './GameSceneBase';
import { SCENE_KEYS } from '../../constants';

export default class AIMatchScene extends GameSceneBase {
  constructor() {
    super(SCENE_KEYS.AIMATCHSCENE);
  }

  create() {
    this.add.text(100, 100, 'AI Match Scene', { fontSize: '32px', fill: '#fff' });
  }
}
