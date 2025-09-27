import { BOUNCE_VELOCITY, MAX_HEALTH, SLEEP_DURATION, TELEGRAPH_WINDOW } from './config';
import {
  EnemyKind,
  type EnemySpawn,
  type EnemyState,
  type NoteSpawn,
  PickupKind,
  type PickupSpawn,
} from './types';

export interface BaseEntity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  solid: boolean;
  harmful: boolean;
}

export interface Player extends BaseEntity {
  health: number;
  maxHealth: number;
  grounded: boolean;
  coyoteTime: number;
  sleepReadyAt: number;
  invulnerableUntil: number;
  notes: number;
  respawnX: number;
  respawnY: number;
  // Puff Float ability
  isFloating: boolean;
  floatUntil: number;
  floatReadyAt: number;
  // Power-up system
  speedBoostUntil: number;
  superJumpUntil: number;
  extendedSleepUntil: number;
  comboCount: number;
  lastCollectTime: number;
}

export interface PatrolData {
  xMin: number;
  xMax: number;
}

export interface BobData {
  amp: number;
  freq: number;
}

export interface Enemy extends BaseEntity {
  kind: EnemyKind;
  state: EnemyState;
  sleepUntil: number;
  telegraphStart: number;
  patrol?: PatrolData;
  bob?: BobData;
  awakeSpeedX?: number;
  baseY: number;
  direction: 1 | -1;
  health?: number;
  maxHealth?: number;
  // For DrowsySnail - armored enemy requiring multiple sleep pulses
  sleepPulsesRequired?: number;
  sleepPulsesReceived?: number;
  // For GrumbleRock - lift behavior when asleep
  lift?: {
    height: number;
    duration: number;
  };
  liftStartY?: number;
  liftProgress?: number;
  // For PuffyPuffer - deflation behavior
  deflationProgress?: number;
}

export interface Collectible {
  x: number;
  y: number;
  collected: boolean;
}

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
}

export function createPlayer(): Player {
  return {
    x: 2,
    y: 1,
    w: 0.9,
    h: 1.2,
    vx: 0,
    vy: 0,
    solid: true,
    harmful: false,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    grounded: false,
    coyoteTime: 0,
    sleepReadyAt: 0,
    invulnerableUntil: 0,
    notes: 0,
    respawnX: 2,
    respawnY: 1,
    // Puff Float ability
    isFloating: false,
    floatUntil: 0,
    floatReadyAt: 0,
    // Power-up system
    speedBoostUntil: 0,
    superJumpUntil: 0,
    extendedSleepUntil: 0,
    comboCount: 0,
    lastCollectTime: 0,
  };
}

export function createEnemy(spawn: EnemySpawn): Enemy {
  switch (spawn.kind) {
    case EnemyKind.SleeperPlatform:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 3,
        h: 0.8,
        vx: 2,
        vy: 0,
        solid: true,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        patrol: spawn.patrol,
        baseY: spawn.y,
        awakeSpeedX: 2,
        direction: 1,
      };
    case EnemyKind.Boss:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 4,
        h: 3,
        vx: 1.5,
        vy: 0,
        solid: false,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        patrol: spawn.patrol,
        baseY: spawn.y,
        awakeSpeedX: 1.5,
        direction: 1,
        health: spawn.health ?? 5,
        maxHealth: spawn.health ?? 5,
      };
    case EnemyKind.GrumbleRock:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 2,
        h: 2,
        vx: 1,
        vy: 0,
        solid: true,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        patrol: spawn.patrol,
        baseY: spawn.y,
        awakeSpeedX: 1,
        direction: 1,
        lift: spawn.lift || { height: 3, duration: 6 },
        liftStartY: spawn.y,
        liftProgress: 0,
      };
    case EnemyKind.PuffyPuffer:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 2.5,
        h: 1.8,
        vx: 0.5,
        vy: 0,
        solid: false,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        patrol: spawn.patrol,
        baseY: spawn.y,
        awakeSpeedX: 0.5,
        direction: 1,
        deflationProgress: 0,
      };
    case EnemyKind.DrowsySnail:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 1.8,
        h: 1.6,
        vx: 0.8,
        vy: 0,
        solid: true,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        patrol: spawn.patrol,
        baseY: spawn.y,
        awakeSpeedX: 0.8,
        direction: 1,
        sleepPulsesRequired: spawn.sleepPulsesRequired || 2,
        sleepPulsesReceived: 0,
      };
    case EnemyKind.BounceCritter:
    default:
      return {
        x: spawn.x,
        y: spawn.y,
        w: 1.4,
        h: 1.4,
        vx: 0,
        vy: 0,
        solid: false,
        harmful: true,
        kind: spawn.kind,
        state: 'awake',
        sleepUntil: 0,
        telegraphStart: 0,
        bob: spawn.bob,
        baseY: spawn.y,
        awakeSpeedX: 0,
        direction: 1,
      };
  }
}

export function createCollectible(spawn: NoteSpawn): Collectible {
  return {
    x: spawn.x,
    y: spawn.y,
    collected: false,
  };
}

export function createPickup(spawn: PickupSpawn): Pickup {
  return {
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    w: 1,
    h: 1,
    collected: false,
  };
}

export function wakeEnemy(enemy: Enemy): void {
  enemy.state = 'awake';
  enemy.sleepUntil = 0;
  enemy.telegraphStart = 0;
  enemy.harmful = true;
  if (enemy.awakeSpeedX) {
    enemy.vx = enemy.awakeSpeedX * enemy.direction;
  }
}

export function sleepEnemy(enemy: Enemy, now: number, duration: number = SLEEP_DURATION): void {
  enemy.state = 'asleep';
  enemy.sleepUntil = now + duration;
  enemy.telegraphStart = enemy.sleepUntil - TELEGRAPH_WINDOW;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.harmful = false;
}

export function bouncePlayer(player: Player): void {
  player.vy = BOUNCE_VELOCITY;
  player.grounded = false;
}
