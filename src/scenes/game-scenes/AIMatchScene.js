import BaseGameScene from './BaseGameScene';
import { SCENE_KEYS } from '../../constants';
import MenuContainer from '../../components/containers/MenuContainer'; // Import MenuContainer
import StartContainer from '../../components/containers/StartContainer';
import ReadyGo from '../../components/ReadyGo';

export default class AIMatchScene extends BaseGameScene {
  constructor() {
    super(SCENE_KEYS.AI_MATCH_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x336699); // A distinct color for AI Match Scene
    this.add.text(100, 100, 'AI Match Scene', { fontSize: '32px', fill: '#fff' });
    // Instantiate MenuContainer for visual check
    const menuContainer = new MenuContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(menuContainer); // Add to display list
    const startContainer = new StartContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(startContainer); // Add to display list
    const readyGo = new ReadyGo(this, this.gameWidth/2, this.gameHeight/2);
  }
}
