import { GameState } from './types';

export class StartScreen {
  private startScreenElement: HTMLElement;
  private gameState: GameState = GameState.StartScreen;
  private onStateChange?: (state: GameState) => void;

  constructor() {
    this.startScreenElement = document.getElementById('start-screen')!;
    this.setupEventListeners();
    this.createBackgroundEffects();
  }

  private setupEventListeners(): void {
    const startButton = document.getElementById('start-game');
    const howToPlayButton = document.getElementById('how-to-play');
    const settingsButton = document.getElementById('settings-menu');

    startButton?.addEventListener('click', () => {
      this.startGame();
    });

    howToPlayButton?.addEventListener('click', () => {
      this.showHowToPlay();
    });

    settingsButton?.addEventListener('click', () => {
      this.showSettings();
    });

    // Allow starting with Enter or Space
    document.addEventListener('keydown', (event) => {
      if (this.gameState === GameState.StartScreen) {
        if (event.code === 'Enter' || event.code === 'Space') {
          event.preventDefault();
          this.startGame();
        }
      }
    });
  }

  private createBackgroundEffects(): void {
    // Create floating particles
    const particlesContainer = document.getElementById('bg-particles');
    if (particlesContainer) {
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';
        particlesContainer.appendChild(particle);
      }
    }

    // Create floating musical notes
    const floatingContainer = document.getElementById('floating-elements');
    if (floatingContainer) {
      setInterval(() => {
        this.createFloatingNote(floatingContainer);
      }, 2000);
    }
  }

  private createFloatingNote(container: HTMLElement): void {
    const note = document.createElement('div');
    note.className = 'floating-note';
    note.textContent = ['♪', '♫', '♬', '♭', '♯'][Math.floor(Math.random() * 5)];
    note.style.left = Math.random() * 90 + '%';
    note.style.animationDuration = (8 + Math.random() * 4) + 's';
    
    container.appendChild(note);

    // Remove after animation
    setTimeout(() => {
      if (note.parentNode) {
        note.parentNode.removeChild(note);
      }
    }, 12000);
  }

  private startGame(): void {
    this.gameState = GameState.Playing;
    this.startScreenElement.classList.add('hidden');
    
    // Trigger game start callback
    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  private showHowToPlay(): void {
    // Create and show how to play modal
    const modal = this.createModal('How to Play', `
      <div style="text-align: left; line-height: 1.6;">
        <h3>🎯 Goal</h3>
        <p>Help Puff reach the end of each level by using the Sleep Song to pacify enemies!</p>
        
        <h3>🎮 Controls</h3>
        <p><strong>Move:</strong> WASD or Arrow Keys</p>
        <p><strong>Jump:</strong> Space, Z, Up Arrow, or W</p>
        <p><strong>Sleep Song:</strong> Shift or X</p>
        <p><strong>Puff Float:</strong> Hold S or Down Arrow while in air</p>
        
        <h3>😴 Sleep Magic</h3>
        <p><strong>SleeperPlatform:</strong> Becomes a safe platform to stand on</p>
        <p><strong>BounceCritter:</strong> Becomes a trampoline for higher jumps</p>
        <p><strong>GrumbleRock:</strong> Slowly lifts you up and down</p>
        <p><strong>PuffyPuffer:</strong> Deflates into a safe cloud bridge</p>
        <p><strong>DrowsySnail:</strong> Requires 2 sleep songs to pacify</p>
        
        <h3>✨ Collectibles</h3>
        <p><strong>Notes (♪):</strong> Collect all to unlock the exit gate</p>
        <p><strong>Golden Melody Shards:</strong> Rare treasures for bonus points</p>
        <p><strong>Power Orbs:</strong> Temporary abilities and boosts</p>
      </div>
    `);
  }

  private showSettings(): void {
    const modal = this.createModal('Settings', `
      <div style="text-align: left;">
        <h3>🔊 Audio</h3>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="modal-music" checked> Background Music
        </label>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="modal-sfx" checked> Sound Effects
        </label>
        
        <h3>🎨 Visual</h3>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="modal-particles" checked> Background Particles
        </label>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="modal-effects" checked> Visual Effects
        </label>
      </div>
    `);
  }

  private createModal(title: string, content: string): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      backdrop-filter: blur(5px);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #ffffffee 0%, #f3ecffee 100%);
      border: 3px solid #c4b3e5;
      border-radius: 20px;
      padding: 30px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 50px rgba(196, 179, 229, 0.5);
      backdrop-filter: blur(10px);
      font-family: 'Fredoka', sans-serif;
    `;

    modalContent.innerHTML = `
      <h2 style="margin-top: 0; color: #7158b0; text-align: center; font-size: 1.8em;">${title}</h2>
      ${content}
      <button id="close-modal" style="
        background: linear-gradient(135deg, #f9a4c0 0%, #ff8ba7 100%);
        border: none;
        color: #4a3d6b;
        font-family: 'Fredoka', sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        margin: 20px auto 0;
        display: block;
        box-shadow: 0 4px 15px rgba(249, 164, 192, 0.4);
        transition: all 0.3s ease;
      ">Close</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close modal functionality
    const closeButton = modal.querySelector('#close-modal');
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeButton?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    });

    return modal;
  }

  public onGameStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  public show(): void {
    this.gameState = GameState.StartScreen;
    this.startScreenElement.classList.remove('hidden');
  }

  public hide(): void {
    this.startScreenElement.classList.add('hidden');
  }

  public getState(): GameState {
    return this.gameState;
  }
}