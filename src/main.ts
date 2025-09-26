import { Game } from './Game';
import { setupInput } from './input';
import { setupHud, onRestart } from './hud';
import { startLoop } from './loop';

function bootstrap() {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app');

  setupHud();
  setupInput();

  const game = new Game(app);

  onRestart(() => {
    game.reset();
  });

  startLoop({
    update: (dt) => game.update(dt),
    render: () => game.render(),
  });

  window.addEventListener('resize', () => game.resize());
}

bootstrap();
