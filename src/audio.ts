let audioContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

interface ToneOptions {
  startFrequency: number;
  endFrequency?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTone({ startFrequency, endFrequency, duration, type = 'sine', gain = 0.2 }: ToneOptions): void {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFrequency, now);

  if (typeof endFrequency === 'number' && endFrequency !== startFrequency) {
    osc.frequency.linearRampToValueAtTime(endFrequency, now + duration);
  }

  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp);
  amp.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playNoteCollectSound(): void {
  playTone({ startFrequency: 880, endFrequency: 1320, duration: 0.18, type: 'triangle', gain: 0.15 });
}

export function playDamageSound(): void {
  playTone({ startFrequency: 200, endFrequency: 120, duration: 0.25, type: 'sawtooth', gain: 0.25 });
}

export function resumeAudio(): void {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}
