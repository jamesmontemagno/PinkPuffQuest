export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum EnemyKind {
  SleeperPlatform,
  BounceCritter,
  Boss,
  GrumbleRock,
  PuffyPuffer,
  DrowsySnail,
}

export type EnemyState = 'awake' | 'asleep';

export interface EnemyConfig {
  kind: EnemyKind;
  width: number;
  height: number;
  awakeSpeedX?: number;
  sleepDuration: number;
  bounceVelocity?: number;
}

export enum PickupKind {
  Health,
  GoldenMelodyShard,
}

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  patrol?: {
    xMin: number;
    xMax: number;
  };
  bob?: {
    amp: number;
    freq: number;
  };
  health?: number;
  // For DrowsySnail - requires multiple sleep pulses
  sleepPulsesRequired?: number;
  sleepPulsesReceived?: number;
  // For GrumbleRock - lift behavior
  lift?: {
    height: number;
    duration: number;
  };
}

export interface NoteSpawn {
  x: number;
  y: number;
}

export interface PickupSpawn {
  kind: PickupKind;
  x: number;
  y: number;
}

export interface CheckpointData {
  x: number;
  y: number;
}

export interface GateData extends Rect {}

export interface LevelData {
  name: string;
  platforms: Rect[];
  enemies: EnemySpawn[];
  notes: NoteSpawn[];
  pickups: PickupSpawn[];
  checkpoint: CheckpointData;
  gate: GateData;
  noteGoal?: number;
}
