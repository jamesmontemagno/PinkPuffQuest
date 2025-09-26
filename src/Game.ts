import {
  COYOTE_TIME,
  JUMP_VELOCITY,
  MAX_HEALTH,
  PLAYER_SPEED,
  SLEEP_COOLDOWN,
  SLEEP_RADIUS,
} from './config';
import {
  createCollectible,
  createEnemy,
  createPickup,
  createPlayer,
  type Collectible,
  type Enemy,
  type Pickup,
  type Player,
} from './entities';
import { consumeAnyKeyPress, getKey } from './input';
import { collectNotes, collectPickups } from './systems/collectibles';
import { applyPhysics } from './systems/physics';
import { applySleepPulse, handleEnemyInteractions, updateEnemies } from './systems/enemy';
import { WorldRenderer } from './render/WorldRenderer';
import { LevelManager, type LevelStart } from './state/LevelManager';
import { clearPulses, getPulses, spawnPulse, updatePulses } from './sleepPulse';
import { hideCompleteOverlay, showCompleteOverlay, updateHud } from './hud';
import { EnemyKind, type LevelData, type Rect } from './types';

const DEATH_Y = -5;

export class Game {
  private readonly world: WorldRenderer;
  private readonly levelManager = new LevelManager();

  private player!: Player;
  private enemies: Enemy[] = [];
  private notes: Collectible[] = [];
  private pickups: Pickup[] = [];
  private level!: LevelData;
  private checkpointRect: Rect = { x: 0, y: 0, w: 2, h: 3 };
  private gateRect: Rect = { x: 0, y: 0, w: 2, h: 4 };
  private levelBounds = { width: 0, height: 0 };
  private noteGoal = 0;
  private noteTotal = 0;
  private elapsed = 0;
  private checkpointActive = false;
  private completed = false;
  private bossRemaining = 0;

  constructor(container: HTMLElement) {
    this.world = new WorldRenderer(container);
    const levelStart = this.levelManager.resetRun();
    this.initializeLevel(levelStart);
  }

  reset(): void {
    const levelStart = this.levelManager.resetRun();
    this.initializeLevel(levelStart);
    hideCompleteOverlay();
  }

  update(dt: number): void {
    if (this.completed) {
      updatePulses(dt);
      this.world.updatePulsesVisuals(getPulses());
      return;
    }

    this.elapsed += dt;
    this.levelManager.updateRunTime(dt);

    this.handleInput(dt);

    const prevX = this.player.x;
    const prevY = this.player.y;

    applyPhysics(this.player, this.enemies, this.level.platforms, dt, prevX, prevY);
    updateEnemies(this.enemies, this.elapsed, dt);

    const interaction = handleEnemyInteractions(this.player, this.enemies, prevX, prevY, this.elapsed);
    if (interaction.tookDamage && this.player.health <= 0) {
      this.respawn();
    }

    const noteResult = collectNotes(this.player, this.notes);
    if (noteResult.collectedIndices.length > 0) {
      for (const index of noteResult.collectedIndices) {
        this.world.markNoteCollected(index);
      }
      this.levelManager.trackNoteCollected(noteResult.collectedIndices.length);
    }

    collectPickups(this.player, this.pickups);

    this.updateCheckpoint();
    this.checkGate();

    updatePulses(dt);
    this.world.updatePulsesVisuals(getPulses());

    this.world.syncPlayer(this.player, this.elapsed);
    this.world.syncEnemies(this.enemies, this.elapsed);
    this.world.syncNotes(this.notes);
    this.world.syncPickups(this.pickups);
    this.world.animateNotes(dt);
    this.world.animatePickups(this.pickups, this.elapsed);
    this.world.setCheckpoint(this.checkpointRect, this.checkpointActive);

    this.updateHud();
    this.world.updateCamera(this.player, this.levelBounds);

    if (this.player.y < DEATH_Y) {
      this.respawn();
    }
  }

  render(): void {
    this.world.render();
  }

  resize(): void {
    this.world.resize();
  }

  private initializeLevel(levelStart: LevelStart): void {
    this.level = levelStart.level;
    this.noteGoal = levelStart.noteGoal;
    this.noteTotal = levelStart.noteGoal;
    this.elapsed = 0;
    this.completed = false;
    this.checkpointActive = false;
    this.checkpointRect = levelStart.checkpoint;
    this.gateRect = levelStart.gate;
    this.levelBounds = levelStart.bounds;
    this.bossRemaining = levelStart.bossCount;

    clearPulses();
    this.world.clearPulseVisuals();

    this.world.buildPlatforms(this.level.platforms);
    this.world.setGate(this.gateRect);
    this.world.setCheckpoint(this.checkpointRect, this.checkpointActive);

    this.enemies = this.level.enemies.map((spawn) => createEnemy(spawn));
    this.world.refreshEnemies(this.enemies);

    this.notes = this.level.notes.map((spawn) => createCollectible(spawn));
    this.world.refreshNotes(this.notes);

    this.pickups = this.level.pickups.map((spawn) => createPickup(spawn));
    this.world.refreshPickups(this.pickups);

    this.player = createPlayer();
    this.player.x = levelStart.spawn.x;
    this.player.y = levelStart.spawn.y;
    this.player.respawnX = levelStart.spawn.x;
    this.player.respawnY = levelStart.spawn.y;
    this.player.health = levelStart.preservedHealth;
    this.player.notes = 0;
    this.player.sleepReadyAt = 0;
    this.player.invulnerableUntil = 0;
    this.player.grounded = false;
    this.player.coyoteTime = 0;

    this.world.syncPlayer(this.player, this.elapsed, { force: true });

    updateHud(
      this.player.health,
      MAX_HEALTH,
      0,
      this.player.notes,
      this.noteTotal,
      this.levelManager.getCurrentIndex() + 1,
      this.level.name,
    );
  }

  private handleInput(dt: number): void {
    let move = 0;
    if (getKey('ArrowLeft') || getKey('KeyA')) move -= 1;
    if (getKey('ArrowRight') || getKey('KeyD')) move += 1;
    this.player.vx = move * PLAYER_SPEED;

    if (this.player.grounded) {
      this.player.coyoteTime = COYOTE_TIME;
    } else {
      this.player.coyoteTime = Math.max(0, this.player.coyoteTime - dt);
    }

    if (
      consumeAnyKeyPress(['Space', 'KeyZ', 'ArrowUp', 'KeyW']) &&
      (this.player.grounded || this.player.coyoteTime > 0)
    ) {
      this.player.vy = JUMP_VELOCITY;
      this.player.grounded = false;
      this.player.coyoteTime = 0;
    }

    if (
      consumeAnyKeyPress(['ShiftLeft', 'ShiftRight', 'KeyX']) &&
      this.elapsed >= this.player.sleepReadyAt
    ) {
      this.activateSleepAbility();
    }
  }

  private updateCheckpoint(): void {
    if (this.checkpointActive) return;
    if (this.intersectsPlayer(this.checkpointRect)) {
      this.player.respawnX = this.checkpointRect.x;
      this.player.respawnY = this.checkpointRect.y + 1;
      this.checkpointActive = true;
    }
  }

  private checkGate(): void {
    if (this.completed) return;
    if (this.player.notes < this.noteGoal) return;
    if (this.bossRemaining > 0) return;
    if (this.gateReached() || this.intersectsPlayer(this.gateRect)) {
      this.advanceLevel();
    }
  }

  private advanceLevel(): void {
    const result = this.levelManager.advance(this.player.health);
    if (result.completed) {
      this.completed = true;
      if (result.stats) {
        const { runTime, notesCollected, noteGoal } = result.stats;
        const statsText = `Dream Complete! Time: ${runTime.toFixed(1)}s — Notes: ${notesCollected}/${noteGoal}`;
        showCompleteOverlay(statsText);
      }
      return;
    }

    if (result.levelStart) {
      this.initializeLevel(result.levelStart);
      hideCompleteOverlay();
    }
  }

  private activateSleepAbility(): void {
    this.player.sleepReadyAt = this.elapsed + SLEEP_COOLDOWN;
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    spawnPulse(centerX, centerY, SLEEP_RADIUS);

    const { defeatedIndices } = applySleepPulse(this.player, this.enemies, this.elapsed, SLEEP_RADIUS);
    if (defeatedIndices.length > 0) {
      defeatedIndices
        .sort((a, b) => a - b)
        .reverse()
        .forEach((index) => {
          const enemy = this.enemies[index];
          if (enemy?.kind === EnemyKind.Boss && this.bossRemaining > 0) {
            this.bossRemaining -= 1;
          }
          this.enemies.splice(index, 1);
          this.world.removeEnemyMesh(index);
        });
    }
  }

  private respawn(): void {
    this.player.health = MAX_HEALTH;
    this.player.x = this.player.respawnX;
    this.player.y = this.player.respawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invulnerableUntil = this.elapsed + 0.5;
    this.player.grounded = false;
    this.player.coyoteTime = 0;
    clearPulses();
    this.world.clearPulseVisuals();
  }

  private updateHud(): void {
    const remaining = Math.max(0, this.player.sleepReadyAt - this.elapsed);
    const ratio = remaining / SLEEP_COOLDOWN;
    updateHud(
      this.player.health,
      MAX_HEALTH,
      ratio,
      this.player.notes,
      this.noteTotal,
      this.levelManager.getCurrentIndex() + 1,
      this.level.name,
    );
  }

  private intersectsPlayer(rect: Rect): boolean {
    return (
      this.player.x < rect.x + rect.w &&
      this.player.x + this.player.w > rect.x &&
      this.player.y < rect.y + rect.h &&
      this.player.y + this.player.h > rect.y
    );
  }

  private gateReached(): boolean {
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    const tolerance = 0.25;
    return (
      centerX >= this.gateRect.x - tolerance &&
      centerX <= this.gateRect.x + this.gateRect.w + tolerance &&
      centerY >= this.gateRect.y - tolerance &&
      centerY <= this.gateRect.y + this.gateRect.h + tolerance
    );
  }
}
