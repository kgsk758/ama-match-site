import BaseGameScene from './BaseGameScene';
import { SCENE_KEYS,PLAYER_CONFIG } from '../../constants';
import MenuContainer from '../../components/containers/MenuContainer'; // Import MenuContainer
import StartContainer from '../../components/containers/StartContainer';
import ReadyGo from '../../components/ReadyGo';
import MatchManager from '../../components/MatchManager';

export default class AIMatchScene extends BaseGameScene {
  constructor() {
    super(SCENE_KEYS.AI_MATCH_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x336699); // A distinct color for AI Match Scene
    this.add.text(100, 100, 'AI Match Scene', { fontSize: '32px', fill: '#fff' });

    // 盤面を先に作成（奥に表示される）
    const matchManager = new MatchManager(undefined, [{x:50,y:100},{x:400,y:100}],this);

    // メニュー類を後に作成（手前に表示される）
    const menuContainer = new MenuContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(menuContainer); 
    const startContainer = new StartContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(startContainer); 
    const readyGo = new ReadyGo(this, this.gameWidth/2, this.gameHeight/2);
  }
}
