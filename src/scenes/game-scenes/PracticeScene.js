import BaseGameScene from './BaseGameScene';
import { SCENE_KEYS, PLAYER_CONFIG } from '../../constants';
import MenuContainer from '../../components/containers/MenuContainer'; // Import MenuContainer
import StartContainer from '../../components/containers/StartContainer';
import ReadyGo from '../../components/ReadyGo';
import MatchManager from '../../components/MatchManager';

export default class PracticeScene extends BaseGameScene {
  constructor() {
    super(SCENE_KEYS.PRACTICE_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x666666);
    this.add.text(100, 100, 'Practice Scene', { fontSize: '32px', fill: '#fff' });

    // 盤面を先に作成（奥に表示される）
    const matchManager = new MatchManager([{team:1, type:PLAYER_CONFIG.HUMAN}], [{x:50,y:100}], this);

    // Instantiate MenuContainer for visual check
    const menuContainer = new MenuContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(menuContainer); // Add to display list
    const startContainer = new StartContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(startContainer); // Add to display list
    const readyGo = new ReadyGo(this, this.gameWidth/2, this.gameHeight/2);
  }
}
