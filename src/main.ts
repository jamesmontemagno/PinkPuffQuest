import { Game } from './Game';
import { setupInput } from './input';
import { setupHud, onRestart, updateFpsDisplay } from './hud';
import { startLoop } from './loop';
import { createFpsMeter } from './fps';

function bootstrap() {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app');

  setupHud();
  setupInput();

  const game = new Game(app);
  const fpsMeter = createFpsMeter(updateFpsDisplay);

  onRestart(() => {
    game.reset();
  });

  startLoop({
    update: (dt) => game.update(dt),
    render: () => game.render(),
    onFrame: (frameMs) => fpsMeter.sample(frameMs),
  });

  window.addEventListener('resize', () => game.resize());
}

bootstrap();
