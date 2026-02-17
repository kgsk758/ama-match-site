import BaseGameScene from './BaseGameScene';
import { SCENE_KEYS } from '../../constants';
import MenuContainer from '../../components/containers/MenuContainer'; // Import MenuContainer

export default class PracticeScene extends BaseGameScene {
  constructor() {
    super(SCENE_KEYS.PRACTICE_SCENE);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x666666);
    this.add.text(100, 100, 'Practice Scene', { fontSize: '32px', fill: '#fff' });

    // Instantiate MenuContainer for visual check
    const menuContainer = new MenuContainer(this, this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight);
    this.add.existing(menuContainer); // Add to display list
  }
}
