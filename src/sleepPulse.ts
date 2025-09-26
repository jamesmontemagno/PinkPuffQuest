export interface SleepPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  duration: number;
}

const pulses: SleepPulse[] = [];

export function spawnPulse(x: number, y: number, radius: number): void {
  pulses.push({
    x,
    y,
    radius: 0,
    maxRadius: radius,
    age: 0,
    duration: 0.3,
  });
}

export function updatePulses(dt: number): void {
  for (let i = pulses.length - 1; i >= 0; i -= 1) {
    const pulse = pulses[i];
    pulse.age += dt;
    pulse.radius = Math.min(pulse.maxRadius, pulse.radius + dt * pulse.maxRadius * 6);
    if (pulse.age >= pulse.duration) {
      pulses.splice(i, 1);
    }
  }
}

export function getPulses(): readonly SleepPulse[] {
  return pulses;
}

export function clearPulses(): void {
  pulses.length = 0;
}
