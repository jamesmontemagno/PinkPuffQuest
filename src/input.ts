export type KeyState = Record<string, boolean>;

const keys: KeyState = {};
const pressedOnce = new Set<string>();

export function setupInput(): void {
  window.addEventListener('keydown', (event) => {
    if (!keys[event.code]) {
      pressedOnce.add(event.code);
    }
    keys[event.code] = true;
  });

  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });
}

export function getKey(code: string): boolean {
  return !!keys[code];
}

export function consumeKeyPress(code: string): boolean {
  if (pressedOnce.has(code)) {
    pressedOnce.delete(code);
    return true;
  }
  return false;
}

export function consumeAnyKeyPress(codes: string[]): boolean {
  return codes.some((code) => consumeKeyPress(code));
}
