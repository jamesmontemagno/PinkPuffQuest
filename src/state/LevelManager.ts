import { MAX_HEALTH, WORLD_HEIGHT, WORLD_WIDTH } from '../config';
import { LEVELS } from '../levels';
import { createEnemy } from '../entities';
import type { LevelData, Rect } from '../types';
import { EnemyKind } from '../types';

interface LevelBounds {
  width: number;
  height: number;
}

export interface LevelStart {
  index: number;
  level: LevelData;
  noteGoal: number;
  checkpoint: Rect;
  gate: Rect;
  bounds: LevelBounds;
  spawn: { x: number; y: number };
  preservedHealth: number;
  bossCount: number;
}

export interface AdvanceResult {
  completed: boolean;
  levelStart?: LevelStart;
  stats?: {
    runTime: number;
    notesCollected: number;
    noteGoal: number;
  };
}

export class LevelManager {
  readonly overallNoteGoal: number;

  private currentIndex = 0;
  private overallNotesCollected = 0;
  private runTime = 0;
  private completionTime = 0;
  private completed = false;

  constructor(private readonly levels: LevelData[] = LEVELS) {
    this.overallNoteGoal = levels.reduce(
      (sum, level) => sum + (level.noteGoal ?? level.notes.length),
      0,
    );
  }

  resetRun(): LevelStart {
    this.currentIndex = 0;
    this.overallNotesCollected = 0;
    this.runTime = 0;
    this.completed = false;
    this.completionTime = 0;
    return this.buildLevelStart(0, { carryHealth: false });
  }

  loadLevel(index: number, options: { carryHealth?: boolean; health?: number } = {}): LevelStart {
    this.currentIndex = index;
    return this.buildLevelStart(index, options);
  }

  advance(playerHealth: number): AdvanceResult {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.levels.length) {
      const levelStart = this.buildLevelStart(nextIndex, {
        carryHealth: true,
        health: playerHealth,
      });
      this.currentIndex = nextIndex;
      return { completed: false, levelStart };
    }

    this.completed = true;
    this.completionTime = this.runTime;
    return {
      completed: true,
      stats: {
        runTime: this.runTime,
        notesCollected: this.overallNotesCollected,
        noteGoal: this.overallNoteGoal,
      },
    };
  }

  trackNoteCollected(count = 1): void {
    this.overallNotesCollected += count;
  }

  updateRunTime(dt: number): void {
    this.runTime += dt;
  }

  getRunTime(): number {
    return this.runTime;
  }

  getCompletionTime(): number {
    return this.completionTime;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  getOverallNotesCollected(): number {
    return this.overallNotesCollected;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private buildLevelStart(
    index: number,
    options: { carryHealth?: boolean; health?: number },
  ): LevelStart {
    const level = this.levels[index];
    const noteGoal = level.noteGoal ?? level.notes.length;
    const checkpointRect: Rect = {
      x: level.checkpoint.x,
      y: level.checkpoint.y,
      w: 2,
      h: 3,
    };
    const gateRect: Rect = { ...level.gate };
    const bounds = this.calculateBounds(level, gateRect);
    const preservedHealth = options.carryHealth
      ? Math.max(1, Math.min(MAX_HEALTH, options.health ?? MAX_HEALTH))
      : MAX_HEALTH;
    const bossCount = level.enemies.filter((enemy) => enemy.kind === EnemyKind.Boss).length;

    return {
      index,
      level,
      noteGoal,
      checkpoint: checkpointRect,
      gate: gateRect,
      bounds,
      spawn: {
        x: level.checkpoint.x,
        y: level.checkpoint.y + 1,
      },
      preservedHealth,
      bossCount,
    };
  }

  private calculateBounds(level: LevelData, gate: Rect): LevelBounds {
    const maxPlatformX = level.platforms.reduce((max, rect) => Math.max(max, rect.x + rect.w), 0);
    const maxNoteX = level.notes.reduce((max, note) => Math.max(max, note.x), maxPlatformX);
    const maxPickupX = level.pickups.reduce(
      (max, pickup) => Math.max(max, pickup.x + 1),
      maxNoteX,
    );
    const enemySamples = level.enemies.map((spawn) => createEnemy(spawn));
    const maxEnemyX = enemySamples.reduce(
      (max, enemy) => Math.max(max, enemy.x + enemy.w),
      maxPickupX,
    );
    const maxGateX = Math.max(maxEnemyX, gate.x + gate.w);
    const width = Math.max(WORLD_WIDTH, maxGateX + 4);

    const maxPlatformY = level.platforms.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
    const maxNoteY = level.notes.reduce((max, note) => Math.max(max, note.y), maxPlatformY);
    const maxPickupY = level.pickups.reduce(
      (max, pickup) => Math.max(max, pickup.y + 1),
      maxNoteY,
    );
    const maxEnemyY = enemySamples.reduce(
      (max, enemy) => Math.max(max, enemy.y + enemy.h),
      maxPickupY,
    );
    const maxGateY = Math.max(maxEnemyY, gate.y + gate.h);
    const height = Math.max(WORLD_HEIGHT, maxGateY + 4);

    return { width, height };
  }
}
