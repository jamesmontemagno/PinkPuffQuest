interface HudElements {
  levelLabel: HTMLElement;
  pips: HTMLElement[];
  cooldownFill: HTMLElement;
  notes: HTMLElement;
  completeOverlay: HTMLElement;
  completeStats: HTMLElement;
  restartButton: HTMLButtonElement;
}

let elements: HudElements | null = null;

export function setupHud(root: Document = document): void {
  elements = {
    levelLabel: root.querySelector('[data-hud="level"]') as HTMLElement,
    pips: Array.from(root.querySelectorAll('[data-hud="pips"] .pip')) as HTMLElement[],
    cooldownFill: root.querySelector('[data-hud="cooldown"] .fill') as HTMLElement,
    notes: root.querySelector('[data-hud="notes"]') as HTMLElement,
    completeOverlay: root.querySelector('[data-hud="complete"]') as HTMLElement,
    completeStats: root.querySelector('[data-hud="complete-stats"]') as HTMLElement,
    restartButton: root.querySelector('[data-hud="restart"]') as HTMLButtonElement,
  };
}

export function updateHud(
  health: number,
  maxHealth: number,
  cooldownRatio: number,
  notes: number,
  noteTotal: number,
  levelNumber: number,
  levelName: string,
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
}

export function showCompleteOverlay(stats: string): void {
  if (!elements) return;
  elements.completeOverlay.classList.add('visible');
  elements.completeStats.textContent = stats;
}

export function hideCompleteOverlay(): void {
  if (!elements) return;
  elements.completeOverlay.classList.remove('visible');
}

export function onRestart(handler: () => void): void {
  if (!elements) return;
  elements.restartButton.addEventListener('click', handler);
}
