import { Game } from './Game';
import { setupInput } from './input';
import { setupHud, onRestart, updateFpsDisplay } from './hud';
import { startLoop } from './loop';
import { createFpsMeter } from './fps';
import { StartScreen } from './StartScreen';
import { GameState } from './types';

function bootstrap() {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app');

  // Create start screen
  const startScreen = new StartScreen();
  let game: Game | null = null;
  let gameStarted = false;

  // Setup HUD and input
  setupHud();
  setupInput();
  
  const fpsMeter = createFpsMeter(updateFpsDisplay);

  // Handle game state changes
  startScreen.onGameStateChange((state: GameState) => {
    if (state === GameState.Playing && !gameStarted) {
      // Initialize game when starting
      game = new Game(app);
      gameStarted = true;

      onRestart(() => {
        if (game) {
          game.reset();
        }
      });

      // Start game loop
      startLoop({
        update: (dt) => {
          if (game && startScreen.getState() === GameState.Playing) {
            game.update(dt);
          }
        },
        render: () => {
          if (game && startScreen.getState() === GameState.Playing) {
            game.render();
          }
        },
        onFrame: (frameMs) => fpsMeter.sample(frameMs),
      });

      window.addEventListener('resize', () => {
        if (game) {
          game.resize();
        }
      });
    }
  });
}

bootstrap();
