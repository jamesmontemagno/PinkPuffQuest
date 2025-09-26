interface LoopCallbacks {
  update: (dt: number) => void;
  render: () => void;
}

const STEP_MS = (1 / 60) * 1000;

export function startLoop({ update, render }: LoopCallbacks): void {
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
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
