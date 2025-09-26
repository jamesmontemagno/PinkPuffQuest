import { setupConfetti, startConfetti, stopConfetti } from './confetti';
import {
  isMusicEnabled,
  isSfxEnabled,
  setMusicEnabled,
  setSfxEnabled,
} from './audio';

interface HudElements {
  levelLabel: HTMLElement;
  pips: HTMLElement[];
  cooldownFill: HTMLElement;
  notes: HTMLElement;
  fpsLabel: HTMLElement | null;
  bossContainer: HTMLElement | null;
  bossFill: HTMLElement | null;
  bossText: HTMLElement | null;
  completeOverlay: HTMLElement;
  completeStats: HTMLElement;
  restartButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement | null;
  settingsPanel: HTMLElement | null;
  musicToggle: HTMLInputElement | null;
  sfxToggle: HTMLInputElement | null;
}

let elements: HudElements | null = null;

export function setupHud(root: Document = document): void {
  const host = root.getElementById('app');
  if (host) {
    setupConfetti(host);
  }

  elements = {
    levelLabel: root.querySelector('[data-hud="level"]') as HTMLElement,
    pips: Array.from(root.querySelectorAll('[data-hud="pips"] .pip')) as HTMLElement[],
    cooldownFill: root.querySelector('[data-hud="cooldown"] .fill') as HTMLElement,
    notes: root.querySelector('[data-hud="notes"]') as HTMLElement,
    fpsLabel: root.querySelector('[data-hud="fps"]') as HTMLElement | null,
    bossContainer: root.querySelector('[data-hud="boss"]') as HTMLElement | null,
    bossFill: root.querySelector('[data-hud="boss-fill"]') as HTMLElement | null,
    bossText: root.querySelector('[data-hud="boss-text"]') as HTMLElement | null,
    completeOverlay: root.querySelector('[data-hud="complete"]') as HTMLElement,
    completeStats: root.querySelector('[data-hud="complete-stats"]') as HTMLElement,
    restartButton: root.querySelector('[data-hud="restart"]') as HTMLButtonElement,
    settingsButton: root.querySelector('[data-hud="settings-button"]') as HTMLButtonElement | null,
    settingsPanel: root.querySelector('[data-hud="settings-panel"]') as HTMLElement | null,
    musicToggle: root.querySelector('[data-hud="music-toggle"]') as HTMLInputElement | null,
    sfxToggle: root.querySelector('[data-hud="sfx-toggle"]') as HTMLInputElement | null,
  };

  if (elements.settingsPanel && elements.settingsButton) {
    const panel = elements.settingsPanel;
    const button = elements.settingsButton;

    button.addEventListener('click', () => {
      const shouldOpen = panel.classList.contains('hidden');
      if (shouldOpen) {
        panel.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        window.requestAnimationFrame(() => {
          panel.focus({ preventScroll: true });
        });
      } else {
        panel.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (event) => {
      if (panel.classList.contains('hidden')) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (panel.contains(target) || button.contains(target)) return;
      panel.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || panel.classList.contains('hidden')) return;
      panel.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
      button.focus({ preventScroll: true });
    });
  }

  const musicToggle = elements.musicToggle;
  if (musicToggle) {
    musicToggle.checked = isMusicEnabled();
    musicToggle.addEventListener('change', () => {
      setMusicEnabled(musicToggle.checked);
    });
  }

  const sfxToggle = elements.sfxToggle;
  if (sfxToggle) {
    sfxToggle.checked = isSfxEnabled();
    sfxToggle.addEventListener('change', () => {
      setSfxEnabled(sfxToggle.checked);
    });
  }
}

export function updateHud(
  health: number,
  maxHealth: number,
  cooldownRatio: number,
  notes: number,
  noteTotal: number,
  levelNumber: number,
  levelName: string,
  bossHealthCurrent = 0,
  bossHealthTotal = 0,
): void {
  if (!elements) return;

  elements.pips.forEach((pip, index) => {
    pip.classList.toggle('full', index < health);
  });

  const clamped = Math.min(Math.max(cooldownRatio, 0), 1);
  elements.cooldownFill.style.height = `${(1 - clamped) * 100}%`;
  elements.notes.textContent = `♪ ${notes}/${noteTotal}`;
  if (elements.levelLabel) {
    elements.levelLabel.textContent = `Level ${levelNumber} — ${levelName}`;
  }

  if (elements.bossContainer && elements.bossFill && elements.bossText) {
    if (bossHealthTotal > 0) {
      const clampedTotal = Math.max(1, bossHealthTotal);
      const clampedCurrent = Math.max(0, Math.min(clampedTotal, bossHealthCurrent));
      const ratio = clampedCurrent / clampedTotal;
      elements.bossContainer.classList.add('visible');
      elements.bossFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      elements.bossText.textContent = `${Math.round(clampedCurrent)} / ${Math.round(clampedTotal)}`;
    } else {
      elements.bossContainer.classList.remove('visible');
    }
  }
}

export function updateFpsDisplay(fps: number): void {
  if (!elements || !elements.fpsLabel) return;
  elements.fpsLabel.textContent = `FPS: ${Math.max(0, Math.min(240, Math.round(fps))).toString()}`;
}

export function playConfettiBurst(duration = 2200): void {
  startConfetti();
  window.setTimeout(() => {
    if (elements?.completeOverlay.classList.contains('visible')) return;
    stopConfetti();
  }, duration);
}

export function showCompleteOverlay(stats: string): void {
  if (!elements) return;
  elements.completeOverlay.classList.add('visible');
  elements.completeStats.textContent = stats;
  startConfetti();
}

export function hideCompleteOverlay(): void {
  if (!elements) return;
  elements.completeOverlay.classList.remove('visible');
  stopConfetti();
}

export function onRestart(handler: () => void): void {
  if (!elements) return;
  elements.restartButton.addEventListener('click', handler);
}
