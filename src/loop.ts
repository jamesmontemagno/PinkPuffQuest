interface LoopCallbacks {
  update: (dt: number) => void;
  render: () => void;
  onFrame?: (frameTimeMs: number) => void;
}

const STEP_MS = (1 / 60) * 1000;

export function startLoop({ update, render, onFrame }: LoopCallbacks): void {
  let last = performance.now();
  let acc = 0;

  function frame(now: number) {
    const delta = Math.min(now - last, 250);
    acc += delta;
    last = now;

    while (acc >= STEP_MS) {
      update(STEP_MS / 1000);
      acc -= STEP_MS;
    }

    render();
    if (onFrame) {
      onFrame(delta);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
