export interface FpsMeter {
  sample(frameTimeMs: number): void;
}

export function createFpsMeter(onUpdate: (fps: number) => void): FpsMeter {
  let accumulatedMs = 0;
  let frameCount = 0;
  let lastFps = 0;

  return {
    sample(frameTimeMs: number) {
      if (!Number.isFinite(frameTimeMs) || frameTimeMs <= 0) return;
      accumulatedMs += frameTimeMs;
      frameCount += 1;

      if (accumulatedMs >= 250) {
        const fps = Math.round((frameCount * 1000) / accumulatedMs);
        if (fps !== lastFps) {
          lastFps = fps;
          onUpdate(fps);
        }
        accumulatedMs = 0;
        frameCount = 0;
      }
    },
  };
}
