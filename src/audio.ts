let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let musicStarted = false;
let musicOscillators: OscillatorNode[] = [];
let padGain: GainNode | null = null;
let shimmerGain: GainNode | null = null;
let bassGain: GainNode | null = null;
let musicChordInterval: number | null = null;
let musicShimmerInterval: number | null = null;
let musicLfo: OscillatorNode | null = null;
let musicLfoGain: GainNode | null = null;
let musicEnabled = true;
let sfxEnabled = true;
let musicDelay: DelayNode | null = null;
let musicDelayFeedback: GainNode | null = null;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function getMasterGain(): GainNode {
  const ctx = getContext();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }
  return masterGain;
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
  amp.connect(getMasterGain());

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playNoteCollectSound(): void {
  if (!sfxEnabled) return;
  playTone({ startFrequency: 880, endFrequency: 1320, duration: 0.18, type: 'triangle', gain: 0.15 });
}

export function playDamageSound(): void {
  if (!sfxEnabled) return;
  playTone({ startFrequency: 200, endFrequency: 120, duration: 0.25, type: 'sawtooth', gain: 0.25 });
}

export function playJumpSound(): void {
  if (!sfxEnabled) return;
  playTone({ startFrequency: 440, endFrequency: 660, duration: 0.1, type: 'triangle', gain: 0.08 });
  window.setTimeout(() => {
    if (!sfxEnabled) return;
    playTone({ startFrequency: 660, endFrequency: 880, duration: 0.08, type: 'sine', gain: 0.05 });
  }, 45);
}

export function playSleepPulseSound(): void {
  if (!sfxEnabled) return;
  playTone({ startFrequency: 520, endFrequency: 240, duration: 0.5, type: 'sine', gain: 0.13 });
  window.setTimeout(() => {
    if (!sfxEnabled) return;
    playTone({ startFrequency: 360, endFrequency: 160, duration: 0.6, type: 'triangle', gain: 0.09 });
  }, 90);
}

function startBackgroundMusic(): void {
  if (!musicEnabled) return;
  const ctx = getContext();
  if (musicStarted) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const master = getMasterGain();
  const now = ctx.currentTime;

  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(0, now);

  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.frequency.setValueAtTime(720, now);
  musicFilter.Q.setValueAtTime(0.7, now);

  padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.0001, now);

  shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0.0001, now);

  bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0.0001, now);

  musicDelay = ctx.createDelay(1.5);
  musicDelay.delayTime.setValueAtTime(0.34, now);
  musicDelayFeedback = ctx.createGain();
  musicDelayFeedback.gain.setValueAtTime(0.25, now);

  musicGain.connect(musicFilter);
  musicGain.connect(musicDelay);
  musicDelay.connect(musicDelayFeedback);
  musicDelayFeedback.connect(musicDelay);
  musicDelay.connect(musicFilter);

  padGain.connect(musicGain);
  shimmerGain.connect(musicGain);
  bassGain.connect(musicGain);
  musicFilter.connect(master);

  const chords: [number, number, number, number][] = [
    [196, 246.94, 311.13, 392],
    [174.61, 220, 277.18, 349.23],
    [164.81, 207.65, 261.63, 329.63],
    [146.83, 185, 233.08, 311.13],
  ];

  const padOsc = chords[0].map((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(padGain!);
    osc.start(now + 0.05);
    return osc;
  });

  const bassOsc = ctx.createOscillator();
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(chords[0][0] / 2, now);
  bassOsc.connect(bassGain!);
  bassOsc.start(now + 0.05);

  musicOscillators = [...padOsc, bassOsc];

  if (musicGain) {
    musicGain.gain.linearRampToValueAtTime(0.045, now + 8);
    musicGain.gain.linearRampToValueAtTime(0.04, now + 16);
  }

  if (padGain) {
    padGain.gain.exponentialRampToValueAtTime(0.02, now + 6);
    padGain.gain.exponentialRampToValueAtTime(0.018, now + 14);
  }

  if (bassGain) {
    bassGain.gain.exponentialRampToValueAtTime(0.012, now + 6);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 14);
  }

  let chordIndex = 0;
  const applyChord = (index: number) => {
    const chord = chords[index];
    const current = ctx.currentTime;
    padOsc.forEach((osc, oscIndex) => {
      const target = chord[oscIndex % chord.length];
      osc.frequency.cancelScheduledValues(current);
      osc.frequency.linearRampToValueAtTime(target, current + 5.5);
    });
    bassOsc.frequency.cancelScheduledValues(current);
    bassOsc.frequency.linearRampToValueAtTime(chord[0] / 2, current + 6.2);
  };

  applyChord(chordIndex);
  musicChordInterval = window.setInterval(() => {
    chordIndex = (chordIndex + 1) % chords.length;
    applyChord(chordIndex);
  }, 9000);

  const shimmerNotes = [783.99, 659.25, 987.77, 880];
  const triggerShimmer = () => {
    if (!shimmerGain) return;
    const startTime = ctx.currentTime + Math.random() * 0.4;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    const note = shimmerNotes[Math.floor(Math.random() * shimmerNotes.length)];
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.012, startTime + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.2);
    osc.connect(gain);
    if (panner) {
      panner.pan.setValueAtTime((Math.random() - 0.5) * 0.8, startTime);
      gain.connect(panner);
      panner.connect(shimmerGain);
    } else {
      gain.connect(shimmerGain);
    }
    osc.start(startTime);
    osc.stop(startTime + 2.5);
  };

  triggerShimmer();
  musicShimmerInterval = window.setInterval(triggerShimmer, 5600);

  if (musicFilter) {
    musicLfo = ctx.createOscillator();
    musicLfoGain = ctx.createGain();
    musicLfo.type = 'sine';
    musicLfo.frequency.setValueAtTime(0.05, now);
    musicLfoGain.gain.setValueAtTime(140, now);
    musicLfo.connect(musicLfoGain);
    musicLfoGain.connect(musicFilter.frequency);
    musicLfo.start(now + 0.3);
    musicOscillators.push(musicLfo);
  }

  musicStarted = true;
}

export function stopBackgroundMusic(): void {
  if (!musicStarted) return;
  if (!audioContext) return;

  const now = audioContext.currentTime;

  if (musicChordInterval !== null) {
    window.clearInterval(musicChordInterval);
    musicChordInterval = null;
  }

  if (musicShimmerInterval !== null) {
    window.clearInterval(musicShimmerInterval);
    musicShimmerInterval = null;
  }

  if (musicGain) {
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
  }

  if (padGain) {
    padGain.gain.cancelScheduledValues(now);
    padGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
  }

  if (shimmerGain) {
    shimmerGain.gain.cancelScheduledValues(now);
    shimmerGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
  }

  if (bassGain) {
    bassGain.gain.cancelScheduledValues(now);
    bassGain.gain.linearRampToValueAtTime(0.0001, now + 1.4);
  }

  for (const osc of musicOscillators) {
    try {
      osc.stop(now + 1.6);
    } catch {
      // ignore cleanup races
    }
  }
  musicOscillators = [];

  if (musicLfo) {
    try {
      musicLfo.stop(now + 1.6);
    } catch {
      // ignore
    }
    musicLfo = null;
  }

  if (musicLfoGain) {
    musicLfoGain.disconnect();
    musicLfoGain = null;
  }

  padGain = null;
  shimmerGain = null;
  bassGain = null;
  if (musicDelay) {
    musicDelay.disconnect();
    musicDelay = null;
  }
  if (musicDelayFeedback) {
    musicDelayFeedback.disconnect();
    musicDelayFeedback = null;
  }
  musicGain = null;
  musicFilter = null;
  musicStarted = false;
}

export function resumeAudio(): void {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  if (musicEnabled) {
    startBackgroundMusic();
  }
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (!enabled) {
    stopBackgroundMusic();
  } else {
    startBackgroundMusic();
  }
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function isSfxEnabled(): boolean {
  return sfxEnabled;
}
