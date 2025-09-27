import {
  COYOTE_TIME,
  EXTENDED_SLEEP_MULTIPLIER,
  FLOAT_COOLDOWN,
  FLOAT_DURATION,
  JUMP_VELOCITY,
  MAX_HEALTH,
  PLAYER_SPEED,
  SLEEP_COOLDOWN,
  SLEEP_DURATION,
  SLEEP_RADIUS,
  SPEED_BOOST_MULTIPLIER,
  SUPER_JUMP_MULTIPLIER,
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
import { hideCompleteOverlay, playConfettiBurst, showCompleteOverlay, updateHud } from './hud';
import { EnemyKind, PickupKind, type LevelData, type Rect } from './types';
import {
  playDamageSound,
  playJumpSound,
  playNoteCollectSound,
  playSleepPulseSound,
} from './audio';
import { VisualEffects } from './VisualEffects';

const DEATH_Y = -5;

export class Game {
  private readonly world: WorldRenderer;
  private readonly levelManager = new LevelManager();
  private readonly visualEffects = new VisualEffects();

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
  private bossTotal = 0;
  private bossHealthTotal = 0;
  private bossHealthCurrent = 0;
  private transitionPending = false;
  private transitionHandle: number | null = null;

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

    if (this.transitionPending) {
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
    if (interaction.tookDamage) {
      playDamageSound();
      if (this.player.health <= 0) {
        this.respawn();
      }
    }

    const noteResult = collectNotes(this.player, this.notes, this.elapsed);
    if (noteResult.collectedIndices.length > 0) {
      playNoteCollectSound();
      for (const index of noteResult.collectedIndices) {
        this.world.markNoteCollected(index);
        // Add collection particles
        const note = this.notes[index];
        this.visualEffects.addParticles(note.x, note.y, 'collect', 12);
        
        // Add combo effect if applicable
        if (this.player.comboCount > 1) {
          this.visualEffects.addComboEffect(note.x, note.y, this.player.comboCount);
        }
      }
      this.levelManager.trackNoteCollected(noteResult.collectedIndices.length);
    }

    const pickupResult = collectPickups(this.player, this.pickups, this.elapsed);
    if (pickupResult.collectedIndices.length > 0) {
      for (const index of pickupResult.collectedIndices) {
        const pickup = this.pickups[index];
        this.visualEffects.addParticles(pickup.x, pickup.y, 'sparkle', 15);
      }
      
      // Handle power-up activations
      for (const powerUp of pickupResult.powerUpsActivated) {
        this.showPowerUpEffect(powerUp);
      }
    }

    this.updateCheckpoint();
    this.checkGate();

    updatePulses(dt);
    this.world.updatePulsesVisuals(getPulses());
    
    // Update visual effects
    this.visualEffects.update(dt);

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
    if (this.transitionHandle !== null) {
      window.clearTimeout(this.transitionHandle);
      this.transitionHandle = null;
    }

    this.level = levelStart.level;
    this.noteGoal = levelStart.noteGoal;
    this.noteTotal = levelStart.noteGoal;
    this.elapsed = 0;
    this.completed = false;
    this.transitionPending = false;
    this.checkpointActive = false;
    this.checkpointRect = levelStart.checkpoint;
    this.gateRect = levelStart.gate;
    this.levelBounds = levelStart.bounds;
    this.bossRemaining = levelStart.bossCount;
  this.bossTotal = levelStart.bossCount;

    clearPulses();
    this.world.clearPulseVisuals();

    this.world.buildPlatforms(this.level.platforms);
    this.world.setGate(this.gateRect);
    this.world.setCheckpoint(this.checkpointRect, this.checkpointActive);

    this.enemies = this.level.enemies.map((spawn) => createEnemy(spawn));
    this.world.refreshEnemies(this.enemies);

    const bosses = this.enemies.filter((enemy) => enemy.kind === EnemyKind.Boss);
    this.bossHealthTotal = bosses.reduce<number>(
      (sum, enemy) => sum + (typeof enemy.health === 'number' ? enemy.health : 0),
      0,
    );
    if (this.bossHealthTotal === 0 && this.bossRemaining > 0) {
      this.bossHealthTotal = this.bossRemaining;
    }
    this.bossHealthCurrent = this.bossHealthTotal;

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
    // Initialize Puff Float ability
    this.player.isFloating = false;
    this.player.floatUntil = 0;
    this.player.floatReadyAt = 0;
    // Initialize power-up system
    this.player.speedBoostUntil = 0;
    this.player.superJumpUntil = 0;
    this.player.extendedSleepUntil = 0;
    this.player.comboCount = 0;
    this.player.lastCollectTime = 0;

    this.world.syncPlayer(this.player, this.elapsed, { force: true });

    updateHud(
      this.player.health,
      MAX_HEALTH,
      0,
      this.player.notes,
      this.noteTotal,
      this.levelManager.getCurrentIndex() + 1,
      this.level.name,
      this.bossHealthCurrent,
      this.bossHealthTotal,
    );
  }

  private handleInput(dt: number): void {
    let move = 0;
    if (getKey('ArrowLeft') || getKey('KeyA')) move -= 1;
    if (getKey('ArrowRight') || getKey('KeyD')) move += 1;
    
    // Apply speed boost if active
    const speedMultiplier = this.elapsed < this.player.speedBoostUntil ? SPEED_BOOST_MULTIPLIER : 1;
    this.player.vx = move * PLAYER_SPEED * speedMultiplier;

    if (this.player.grounded) {
      this.player.coyoteTime = COYOTE_TIME;
    } else {
      this.player.coyoteTime = Math.max(0, this.player.coyoteTime - dt);
    }

    // Update float state
    if (this.player.isFloating && this.elapsed >= this.player.floatUntil) {
      this.player.isFloating = false;
    }

    // Apply super jump if active
    const jumpMultiplier = this.elapsed < this.player.superJumpUntil ? SUPER_JUMP_MULTIPLIER : 1;

    if (
      consumeAnyKeyPress(['Space', 'KeyZ', 'ArrowUp', 'KeyW']) &&
      (this.player.grounded || this.player.coyoteTime > 0)
    ) {
      this.player.vy = JUMP_VELOCITY * jumpMultiplier;
      this.player.grounded = false;
      this.player.coyoteTime = 0;
      playJumpSound();
      
      // Add jump particles for super jump
      if (jumpMultiplier > 1) {
        this.visualEffects.addParticles(
          this.player.x + this.player.w / 2,
          this.player.y + this.player.h,
          'explosion',
          15
        );
      }
    }

    // Puff Float ability (Hold S or Down Arrow)
    if (
      (getKey('KeyS') || getKey('ArrowDown')) &&
      !this.player.grounded &&
      this.elapsed >= this.player.floatReadyAt &&
      !this.player.isFloating
    ) {
      this.player.isFloating = true;
      this.player.floatUntil = this.elapsed + FLOAT_DURATION;
      this.player.floatReadyAt = this.elapsed + FLOAT_COOLDOWN;
      this.visualEffects.addParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h / 2,
        'sparkle',
        8
      );
    }

    if (
      consumeAnyKeyPress(['ShiftLeft', 'ShiftRight', 'KeyX']) &&
      this.elapsed >= this.player.sleepReadyAt
    ) {
      this.activateSleepAbility();
    }

    // Add trail particles when moving fast
    if (Math.abs(this.player.vx) > PLAYER_SPEED * 0.8) {
      this.visualEffects.addTrailParticle(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h / 2
      );
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
    if (this.transitionPending) return;
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
      this.transitionPending = true;
      const transitionDelay = 2200;
      playConfettiBurst(transitionDelay);
      this.transitionHandle = window.setTimeout(() => {
        this.transitionHandle = null;
        this.initializeLevel(result.levelStart!);
        hideCompleteOverlay();
      }, transitionDelay);
    }
  }

  private activateSleepAbility(): void {
    this.player.sleepReadyAt = this.elapsed + SLEEP_COOLDOWN;
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    spawnPulse(centerX, centerY, SLEEP_RADIUS);
    playSleepPulseSound();

    // Enhanced duration if power-up is active
    const sleepDuration = this.elapsed < this.player.extendedSleepUntil 
      ? SLEEP_DURATION * EXTENDED_SLEEP_MULTIPLIER 
      : SLEEP_DURATION;

    const { defeatedIndices, bossDamage } = applySleepPulse(
      this.player,
      this.enemies,
      this.elapsed,
      SLEEP_RADIUS,
      sleepDuration,
    );

    // Add enhanced visual effects
    this.visualEffects.addSleepSparkles(centerX, centerY, SLEEP_RADIUS);
    if (this.elapsed < this.player.extendedSleepUntil) {
      this.visualEffects.addParticles(centerX, centerY, 'explosion', 20);
    }

    if (bossDamage > 0) {
      this.bossHealthCurrent = Math.max(0, this.bossHealthCurrent - bossDamage);
    }

    if (defeatedIndices.length > 0) {
      defeatedIndices
        .sort((a, b) => a - b)
        .reverse()
        .forEach((index) => {
          const enemy = this.enemies[index];
          if (enemy?.kind === EnemyKind.Boss && this.bossRemaining > 0) {
            this.bossRemaining -= 1;
            if (typeof enemy?.health === 'number') {
              this.bossHealthCurrent = Math.max(0, this.bossHealthCurrent - Math.max(enemy.health, 0));
            }
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
      this.bossHealthCurrent,
      this.bossHealthTotal,
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

  private showPowerUpEffect(powerUp: PickupKind): void {
    let message = '';
    switch (powerUp) {
      case PickupKind.SpeedBoost:
        message = 'Speed Boost!';
        break;
      case PickupKind.SuperJump:
        message = 'Super Jump!';
        break;
      case PickupKind.ExtendedSleep:
        message = 'Extended Sleep!';
        break;
    }
    
    // Add screen shake for power-up activation
    this.visualEffects.addScreenShake(2, 0.3);
    
    // Could add a temporary UI message here in the future
    console.log(`Power-up activated: ${message}`);
  }
}
