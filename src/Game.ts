import * as THREE from 'three';
import {
  COYOTE_TIME,
  GRAVITY,
  INVULN_TIME,
  JUMP_VELOCITY,
  MAX_HEALTH,
  PLAYER_SPEED,
  SLEEP_DURATION,
  SLEEP_COOLDOWN,
  SLEEP_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config';
import {
  bouncePlayer,
  createCollectible,
  createEnemy,
  createPickup,
  createPlayer,
  sleepEnemy,
  wakeEnemy,
  type Collectible,
  type Enemy,
  type Pickup,
  type Player,
} from './entities';
import { LEVELS } from './levels';
import { EnemyKind, PickupKind, type LevelData, type Rect } from './types';
import { clearPulses, getPulses, spawnPulse, updatePulses } from './sleepPulse';
import { getKey, consumeAnyKeyPress } from './input';
import { hideCompleteOverlay, showCompleteOverlay, updateHud } from './hud';

const PLAYER_COLOR = 0xf9a4c0;
const PLAYER_INVULN_COLOR = 0xfdd7e6;
const PLATFORM_COLOR = 0xded0f7;
const SLEEPER_AWAKE_COLOR = 0x9c7cd4;
const SLEEPER_ASLEEP_COLOR = 0xcbbef8;
const BOUNCE_AWAKE_COLOR = 0x6ed9c1;
const BOUNCE_ASLEEP_COLOR = 0xbdf1e4;
const NOTE_COLOR = 0xfdf1a2;
const NOTE_EMISSIVE_COLOR = 0xffd35c;
const NOTE_COLLECTED_COLOR = 0xe6e0f3;
const PICKUP_COLOR = 0xff88af;
const PICKUP_GLOW_COLOR = 0xffbdcf;
const GATE_COLOR = 0x88e0f7;
const CHECKPOINT_COLOR = 0xf4b7d2;
const CHECKPOINT_ACTIVE_COLOR = 0xf982ae;
const BOSS_AWAKE_COLOR = 0x7653d7;
const BOSS_STUNNED_COLOR = 0xbfa9ff;

const NOTE_BASE = new THREE.Color(NOTE_COLOR);
const NOTE_GLOW = new THREE.Color(NOTE_EMISSIVE_COLOR);
const PICKUP_BASE = new THREE.Color(PICKUP_COLOR);
const PICKUP_GLOW = new THREE.Color(PICKUP_GLOW_COLOR);

const DEATH_Y = -5;

interface PulseVisual {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

export class Game {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly viewHeight = 12;

  private readonly worldGroup = new THREE.Group();
  private readonly platformGroup = new THREE.Group();
  private readonly enemyGroup = new THREE.Group();
  private readonly noteGroup = new THREE.Group();
  private readonly pickupGroup = new THREE.Group();
  private readonly pulseGroup = new THREE.Group();

  private readonly unitPlane = new THREE.PlaneGeometry(1, 1);
  private readonly circleGeometry = new THREE.CircleGeometry(0.5, 32);
  private readonly starGeometry = Game.createStarGeometry(0.5, 0.22, 5);
  private readonly heartGeometry = Game.createHeartGeometry(0.55);

  private player!: Player;
  private playerMesh!: THREE.Mesh;

  private enemies: Enemy[] = [];
  private enemyMeshes: THREE.Mesh[] = [];

  private notes: Collectible[] = [];
  private noteMeshes: THREE.Mesh[] = [];

  private pickups: Pickup[] = [];
  private pickupMeshes: THREE.Mesh[] = [];

  private checkpointMesh: THREE.Mesh;
  private gateMesh: THREE.Mesh;

  private pulseVisuals: PulseVisual[] = [];

  private levelIndex = 0;
  private level: LevelData = LEVELS[0];
  private checkpointRect: Rect = { x: 0, y: 0, w: 2, h: 3 };
  private gateRect: Rect = { x: 0, y: 0, w: 2, h: 4 };
  private noteGoal = 0;
  private noteTotal = 0;
  private bossRemaining = 0;
  private noteSpinAccumulator = 0;
  private overallNotesCollected = 0;
  private readonly overallNoteGoal = LEVELS.reduce(
    (sum, level) => sum + (level.noteGoal ?? level.notes.length),
    0,
  );
  private runTime = 0;
  private levelWidth = WORLD_WIDTH;
  private levelHeight = WORLD_HEIGHT;

  private elapsed = 0;
  private completed = false;
  private completionTime = 0;
  private checkpointActive = false;

  constructor(private readonly container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f4fb);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.OrthographicCamera(
      (-this.viewHeight * aspect) / 2,
      (this.viewHeight * aspect) / 2,
      this.viewHeight / 2,
      -this.viewHeight / 2,
      0.1,
      100,
    );
    this.camera.position.set(this.viewHeight * aspect * 0.5, this.viewHeight / 2, 20);
    this.camera.lookAt(new THREE.Vector3(this.camera.position.x, this.viewHeight / 2, 0));

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.add(this.worldGroup);
    this.worldGroup.add(this.platformGroup);
    this.worldGroup.add(this.enemyGroup);
    this.worldGroup.add(this.noteGroup);
    this.worldGroup.add(this.pickupGroup);
    this.worldGroup.add(this.pulseGroup);

    this.playerMesh = new THREE.Mesh(
      this.unitPlane,
      new THREE.MeshBasicMaterial({ color: PLAYER_COLOR }),
    );
    this.worldGroup.add(this.playerMesh);

    this.checkpointMesh = new THREE.Mesh(
      this.unitPlane,
      new THREE.MeshBasicMaterial({ color: CHECKPOINT_COLOR }),
    );
    this.worldGroup.add(this.checkpointMesh);

    this.gateMesh = new THREE.Mesh(
      this.unitPlane,
      new THREE.MeshBasicMaterial({ color: GATE_COLOR }),
    );
    this.worldGroup.add(this.gateMesh);

    this.reset();
  }

  private buildPlatforms(rects: Rect[]): void {
    this.platformGroup.clear();
    for (const rect of rects) {
      const mesh = new THREE.Mesh(
        this.unitPlane,
        new THREE.MeshBasicMaterial({ color: PLATFORM_COLOR }),
      );
      mesh.scale.set(rect.w, rect.h, 1);
      mesh.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, 0);
      this.platformGroup.add(mesh);
    }
  }

  reset(): void {
    this.overallNotesCollected = 0;
    this.runTime = 0;
    this.loadLevel(0, { carryHealth: false });
    hideCompleteOverlay();
  }

  private loadLevel(index: number, options: { carryHealth?: boolean; health?: number } = {}): void {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const level = this.level;

    this.noteGoal = level.noteGoal ?? level.notes.length;
    this.noteTotal = this.noteGoal;
    this.noteSpinAccumulator = 0;
    this.elapsed = 0;
    this.completed = false;
    this.completionTime = 0;
    clearPulses();
    this.clearPulseVisuals();

    this.buildPlatforms(level.platforms);

    this.enemies = level.enemies.map((spawn) => createEnemy(spawn));
    this.refreshEnemyMeshes();

    this.notes = level.notes.map((spawn) => createCollectible(spawn));
    this.refreshNoteMeshes();

    this.pickups = level.pickups.map((spawn) => createPickup(spawn));
    this.refreshPickupMeshes();

    this.bossRemaining = this.enemies.filter((enemy) => enemy.kind === EnemyKind.Boss).length;

  this.checkpointRect = { x: level.checkpoint.x, y: level.checkpoint.y, w: 2, h: 3 };
  this.checkpointActive = false;
    this.updateCheckpointMesh();

    this.gateRect = { ...level.gate };
    this.gateMesh.scale.set(this.gateRect.w, this.gateRect.h, 1);
    this.gateMesh.position.set(
      this.gateRect.x + this.gateRect.w / 2,
      this.gateRect.y + this.gateRect.h / 2,
      0,
    );

    const maxPlatformX = level.platforms.reduce((max, rect) => Math.max(max, rect.x + rect.w), 0);
    const maxNoteX = level.notes.reduce((max, note) => Math.max(max, note.x), maxPlatformX);
    const maxPickupX = level.pickups.reduce(
      (max, pickup) => Math.max(max, pickup.x + 1),
      maxNoteX,
    );
    const maxEnemyX = this.enemies.reduce((max, enemy) => Math.max(max, enemy.x + enemy.w), maxPickupX);
    const maxGateX = Math.max(maxEnemyX, this.gateRect.x + this.gateRect.w);
    this.levelWidth = Math.max(WORLD_WIDTH, maxGateX + 4);

    const maxPlatformY = level.platforms.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
    const maxNoteY = level.notes.reduce((max, note) => Math.max(max, note.y), maxPlatformY);
    const maxPickupY = level.pickups.reduce(
      (max, pickup) => Math.max(max, pickup.y + 1),
      maxNoteY,
    );
    const maxEnemyY = this.enemies.reduce((max, enemy) => Math.max(max, enemy.y + enemy.h), maxPickupY);
    const maxGateY = Math.max(maxEnemyY, this.gateRect.y + this.gateRect.h);
    this.levelHeight = Math.max(WORLD_HEIGHT, maxGateY + 4);

    const carryHealth = options.carryHealth ?? false;
    const preservedHealth = carryHealth
      ? Math.min(MAX_HEALTH, options.health ?? this.player?.health ?? MAX_HEALTH)
      : MAX_HEALTH;

    this.player = createPlayer();
    this.player.x = level.checkpoint.x;
    this.player.y = level.checkpoint.y + 1;
    this.player.respawnX = this.player.x;
    this.player.respawnY = this.player.y;
    this.player.health = preservedHealth;
    this.player.notes = 0;
    this.player.sleepReadyAt = 0;
    this.player.invulnerableUntil = 0;
    this.player.grounded = false;
    this.player.coyoteTime = 0;

    this.syncPlayerMesh(true);

    updateHud(this.player.health, MAX_HEALTH, 0, this.player.notes, this.noteTotal);
  }

  update(dt: number): void {
    if (this.completed) {
      updatePulses(dt);
      this.updatePulsesVisuals();
      return;
    }

    this.elapsed += dt;
    this.runTime += dt;

    this.handleInput(dt);

    const prevX = this.player.x;
    const prevY = this.player.y;

    this.applyPhysics(dt, prevX, prevY);
    this.updateEnemies(dt);
    this.handleEnemyInteractions(prevX, prevY);
    this.collectNotes();
    this.collectPickups();
    this.updateCheckpoint();
    this.checkGate();

    updatePulses(dt);
    this.updatePulsesVisuals();
    this.syncPlayerMesh();
    this.syncEnemyMeshes();
    this.syncNoteMeshes();
    this.syncPickupMeshes();
    this.animateNotes(dt);
    this.animatePickups();
    this.updateCheckpointMesh();
    this.updateHud();
    this.updateCamera();

    if (this.player.y < DEATH_Y) {
      this.respawn();
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    const aspect = width / height;
    this.camera.left = (-this.viewHeight * aspect) / 2;
    this.camera.right = (this.viewHeight * aspect) / 2;
    this.camera.updateProjectionMatrix();
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

  private applyPhysics(dt: number, prevX: number, prevY: number): void {
    this.player.vy -= GRAVITY * dt;

    // Vertical movement
    this.player.y += this.player.vy * dt;
    this.resolveVerticalCollisions(prevY);

    // Horizontal movement
    this.player.x += this.player.vx * dt;
    this.resolveHorizontalCollisions(prevX);
  }

  private resolveVerticalCollisions(prevY: number): void {
    this.player.grounded = false;
    const solids = this.collectSolidRects();
    for (const rect of solids) {
      if (!this.intersects(this.player, rect)) continue;
      if (this.player.vy <= 0 && prevY >= rect.y + rect.h) {
        this.player.y = rect.y + rect.h;
        this.player.vy = 0;
        this.player.grounded = true;
      } else if (this.player.vy > 0 && prevY + this.player.h <= rect.y) {
        this.player.y = rect.y - this.player.h;
        this.player.vy = 0;
      }
    }
  }

  private resolveHorizontalCollisions(prevX: number): void {
    const solids = this.collectSolidRects();
    for (const rect of solids) {
      if (!this.intersects(this.player, rect)) continue;
      if (this.player.vx > 0 && prevX + this.player.w <= rect.x) {
        this.player.x = rect.x - this.player.w;
        this.player.vx = 0;
      } else if (this.player.vx < 0 && prevX >= rect.x + rect.w) {
        this.player.x = rect.x + rect.w;
        this.player.vx = 0;
      }
    }
  }

  private collectSolidRects(): Rect[] {
    const rects: Rect[] = this.level.platforms.map((platform) => ({ ...platform }));
    for (const enemy of this.enemies) {
      if (enemy.kind === EnemyKind.SleeperPlatform) {
        rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
      } else if (enemy.kind === EnemyKind.BounceCritter && enemy.state === 'asleep') {
        rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
      }
    }
    return rects;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.state === 'asleep' && this.elapsed >= enemy.sleepUntil) {
        wakeEnemy(enemy);
      }

      if (enemy.kind === EnemyKind.SleeperPlatform) {
        if (enemy.state === 'awake') {
          enemy.x += enemy.vx * dt;
          if (enemy.patrol) {
            if (enemy.x < enemy.patrol.xMin) {
              enemy.x = enemy.patrol.xMin;
              enemy.direction = 1;
              enemy.vx = Math.abs(enemy.awakeSpeedX ?? enemy.vx);
            }
            if (enemy.x + enemy.w > enemy.patrol.xMax) {
              enemy.x = enemy.patrol.xMax - enemy.w;
              enemy.direction = -1;
              enemy.vx = -Math.abs(enemy.awakeSpeedX ?? enemy.vx);
            }
          }
        }
      } else if (enemy.kind === EnemyKind.BounceCritter) {
        if (enemy.state === 'awake' && enemy.bob) {
          enemy.y = enemy.baseY + Math.sin(this.elapsed * enemy.bob.freq * Math.PI * 2) * enemy.bob.amp;
        } else if (enemy.state === 'asleep') {
          enemy.y = enemy.baseY;
        }
      } else if (enemy.kind === EnemyKind.Boss) {
        if (enemy.state === 'awake') {
          enemy.x += enemy.vx * dt;
          if (enemy.patrol) {
            if (enemy.x < enemy.patrol.xMin) {
              enemy.x = enemy.patrol.xMin;
              enemy.direction = 1;
              enemy.vx = Math.abs(enemy.awakeSpeedX ?? enemy.vx);
            }
            if (enemy.x + enemy.w > enemy.patrol.xMax) {
              enemy.x = enemy.patrol.xMax - enemy.w;
              enemy.direction = -1;
              enemy.vx = -Math.abs(enemy.awakeSpeedX ?? enemy.vx);
            }
          }
          enemy.y = enemy.baseY + Math.sin(this.elapsed * 1.5) * 0.3;
        } else {
          enemy.y = enemy.baseY;
        }
      }
    }
  }

  private handleEnemyInteractions(prevX: number, prevY: number): void {
    for (const enemy of this.enemies) {
      const rect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (!this.intersects(this.player, rect)) continue;

  if (enemy.kind === EnemyKind.BounceCritter && enemy.state === 'asleep') {
        const wasAbove = prevY >= enemy.y + enemy.h - 0.1;
        if (wasAbove && this.player.vy <= 0) {
          this.player.y = enemy.y + enemy.h;
          bouncePlayer(this.player);
        }
        continue;
      }

      if (enemy.harmful && this.elapsed >= this.player.invulnerableUntil) {
        this.handleDamage(prevX, prevY);
        break;
      }
    }
  }

  private handleDamage(prevX: number, prevY: number): void {
    this.player.health -= 1;
    this.player.invulnerableUntil = this.elapsed + INVULN_TIME;
    this.player.x = prevX;
    this.player.y = prevY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grounded = false;
    this.player.coyoteTime = 0;
    if (this.player.health <= 0) {
      this.respawn();
    }
  }

  private respawn(): void {
    this.player.health = MAX_HEALTH;
    this.player.x = this.player.respawnX;
    this.player.y = this.player.respawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invulnerableUntil = this.elapsed + 0.5;
    clearPulses();
    this.clearPulseVisuals();
  }

  private collectNotes(): void {
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    for (let i = 0; i < this.notes.length; i += 1) {
      const note = this.notes[i];
      if (note.collected) continue;
      const dx = note.x - centerX;
      const dy = note.y - centerY;
      if (dx * dx + dy * dy <= 0.4 * 0.4) {
        note.collected = true;
        this.player.notes += 1;
        this.overallNotesCollected += 1;
        const mesh = this.noteMeshes[i];
        if (mesh) {
          mesh.scale.set(1.15, 1.15, 1);
        }
      }
    }
  }

  private collectPickups(): void {
    for (let i = 0; i < this.pickups.length; i += 1) {
      const pickup = this.pickups[i];
      if (pickup.collected) continue;
      const rect = { x: pickup.x, y: pickup.y, w: pickup.w, h: pickup.h };
      if (!this.intersects(this.player, rect)) continue;
      pickup.collected = true;
      if (pickup.kind === PickupKind.Health) {
        this.player.health = Math.min(MAX_HEALTH, this.player.health + 1);
      }
    }
  }

  private defeatEnemy(index: number): void {
    const [enemy] = this.enemies.splice(index, 1);
    const mesh = this.enemyMeshes.splice(index, 1)[0];
    if (mesh) {
      this.enemyGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    }
    if (enemy && enemy.kind === EnemyKind.Boss) {
      this.bossRemaining = Math.max(0, this.bossRemaining - 1);
    }
  }

  private updateCheckpoint(): void {
    if (this.checkpointActive) return;
    if (this.intersects(this.player, this.checkpointRect)) {
      this.player.respawnX = this.checkpointRect.x;
      this.player.respawnY = this.checkpointRect.y + 1;
      this.checkpointActive = true;
    }
  }

  private checkGate(): void {
    if (this.completed) return;
    if (this.player.notes < this.noteGoal) return;
    if (this.bossRemaining > 0) return;
    if (this.intersects(this.player, this.gateRect)) {
      this.advanceLevel();
    }
  }

  private advanceLevel(): void {
    const nextIndex = this.levelIndex + 1;
    if (nextIndex < LEVELS.length) {
      const carryHealth = Math.max(1, Math.min(MAX_HEALTH, this.player.health));
      this.loadLevel(nextIndex, { carryHealth: true, health: carryHealth });
      hideCompleteOverlay();
    } else {
      this.completed = true;
      const stats = `Dream Complete! Time: ${this.runTime.toFixed(1)}s — Notes: ${this.overallNotesCollected}/${this.overallNoteGoal}`;
      showCompleteOverlay(stats);
    }
  }

  private updateHud(): void {
    const remaining = Math.max(0, this.player.sleepReadyAt - this.elapsed);
    const ratio = remaining / SLEEP_COOLDOWN;
    updateHud(this.player.health, MAX_HEALTH, ratio, this.player.notes, this.noteTotal);
  }

  private updateCamera(): void {
    const width = this.camera.right - this.camera.left;
    const halfWidth = width / 2;
    const halfHeight = this.viewHeight / 2;
    const playerCenterX = this.player.x + this.player.w / 2;
    const playerCenterY = this.player.y + this.player.h / 2;
    const targetX = THREE.MathUtils.clamp(
      playerCenterX,
      halfWidth,
      Math.max(halfWidth, this.levelWidth - halfWidth),
    );
    const targetY = THREE.MathUtils.clamp(
      playerCenterY,
      halfHeight,
      Math.max(halfHeight, this.levelHeight - halfHeight),
    );
    this.camera.position.set(targetX, targetY, this.camera.position.z);
    this.camera.lookAt(targetX, targetY, 0);
  }

  private activateSleepAbility(): void {
    this.player.sleepReadyAt = this.elapsed + SLEEP_COOLDOWN;
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    spawnPulse(centerX, centerY, SLEEP_RADIUS);

    const radiusSq = SLEEP_RADIUS * SLEEP_RADIUS;
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const enemyCenterX = enemy.x + enemy.w / 2;
      const enemyCenterY = enemy.y + enemy.h / 2;
      const dx = enemyCenterX - centerX;
      const dy = enemyCenterY - centerY;
      if (dx * dx + dy * dy > radiusSq) continue;

      if (enemy.kind === EnemyKind.Boss) {
        sleepEnemy(enemy, this.elapsed, SLEEP_DURATION * 0.6);
        if (typeof enemy.health === 'number') {
          enemy.health -= 1;
          if (enemy.health <= 0) {
            this.defeatEnemy(i);
            continue;
          }
        }
      } else {
        sleepEnemy(enemy, this.elapsed);
      }
    }
  }

  private refreshEnemyMeshes(): void {
    this.enemyMeshes.forEach((mesh) => {
      this.enemyGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.enemyMeshes = [];
    for (const enemy of this.enemies) {
      const mesh = new THREE.Mesh(
        this.unitPlane,
        new THREE.MeshBasicMaterial({ color: this.enemyColor(enemy) }),
      );
      mesh.scale.set(enemy.w, enemy.h, 1);
      mesh.position.set(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0);
      this.enemyGroup.add(mesh);
      this.enemyMeshes.push(mesh);
    }
  }

  private refreshNoteMeshes(): void {
    this.noteMeshes.forEach((mesh) => {
      this.noteGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.noteMeshes = [];
    for (const note of this.notes) {
      const mesh = new THREE.Mesh(
        this.starGeometry,
        new THREE.MeshBasicMaterial({ color: NOTE_COLOR }),
      );
      mesh.scale.set(0.9, 0.9, 1);
      mesh.position.set(note.x, note.y, 0.1);
      this.noteGroup.add(mesh);
      this.noteMeshes.push(mesh);
    }
  }

  private refreshPickupMeshes(): void {
    this.pickupMeshes.forEach((mesh) => {
      this.pickupGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.pickupMeshes = [];
    for (const pickup of this.pickups) {
      const material = new THREE.MeshBasicMaterial({
        color: PICKUP_COLOR,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.heartGeometry, material);
      mesh.scale.set(pickup.w, pickup.h, 1);
      mesh.position.set(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, 0.05);
      this.pickupGroup.add(mesh);
      this.pickupMeshes.push(mesh);
    }
  }

  private syncPlayerMesh(force = false): void {
    this.playerMesh.scale.set(this.player.w, this.player.h, 1);
    this.playerMesh.position.set(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      0.2,
    );
    const material = this.playerMesh.material as THREE.MeshBasicMaterial;
    const invulnActive = this.elapsed < this.player.invulnerableUntil;
    material.color.setHex(invulnActive ? PLAYER_INVULN_COLOR : PLAYER_COLOR);
    if (force) {
      material.needsUpdate = true;
    }
  }

  private syncEnemyMeshes(): void {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      const mesh = this.enemyMeshes[i];
      mesh.position.set(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(this.enemyColor(enemy));
    }
  }

  private syncNoteMeshes(): void {
    for (let i = 0; i < this.notes.length; i += 1) {
      const note = this.notes[i];
      const mesh = this.noteMeshes[i];
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (note.collected) {
        material.color.setHex(NOTE_COLLECTED_COLOR);
        mesh.visible = false;
      } else {
        material.color.copy(NOTE_BASE);
        mesh.visible = true;
      }
    }
  }

  private syncPickupMeshes(): void {
    for (let i = 0; i < this.pickups.length; i += 1) {
      const pickup = this.pickups[i];
      const mesh = this.pickupMeshes[i];
      if (!mesh) continue;
      mesh.visible = !pickup.collected;
      if (!pickup.collected) {
        mesh.position.set(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, 0.05);
      }
    }
  }

  private updateCheckpointMesh(): void {
    this.checkpointMesh.scale.set(this.checkpointRect.w, this.checkpointRect.h, 1);
    this.checkpointMesh.position.set(
      this.checkpointRect.x + this.checkpointRect.w / 2,
      this.checkpointRect.y + this.checkpointRect.h / 2,
      0,
    );
    const material = this.checkpointMesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(this.checkpointActive ? CHECKPOINT_ACTIVE_COLOR : CHECKPOINT_COLOR);
  }

  private animateNotes(dt: number): void {
    this.noteSpinAccumulator += dt;
    for (let i = 0; i < this.noteMeshes.length; i += 1) {
      const mesh = this.noteMeshes[i];
      if (!mesh.visible) continue;
      const pulse = 0.9 + 0.12 * Math.sin(this.noteSpinAccumulator * 4 + i * 1.3);
      mesh.rotation.z += dt * 2.5;
      mesh.scale.set(pulse, pulse, 1);
      const material = mesh.material as THREE.MeshBasicMaterial;
      const glowFactor = (Math.sin(this.noteSpinAccumulator * 5 + i) + 1) / 2;
      material.color.copy(NOTE_BASE).lerp(NOTE_GLOW, glowFactor * 0.6);
    }
  }

  private animatePickups(): void {
    for (let i = 0; i < this.pickupMeshes.length; i += 1) {
      const pickup = this.pickups[i];
      const mesh = this.pickupMeshes[i];
      if (!mesh || pickup.collected) continue;
      const t = this.elapsed * 3 + i;
      const scalePulse = 1 + 0.1 * Math.sin(t);
      mesh.scale.set(pickup.w * scalePulse, pickup.h * scalePulse, 1);
      const material = mesh.material as THREE.MeshBasicMaterial;
      const glow = (Math.sin(t * 1.4) + 1) / 2;
      material.color.copy(PICKUP_BASE).lerp(PICKUP_GLOW, glow * 0.7);
    }
  }

  private updatePulsesVisuals(): void {
    const pulses = getPulses();
    while (this.pulseVisuals.length > pulses.length) {
      const visual = this.pulseVisuals.pop();
      if (!visual) break;
      this.pulseGroup.remove(visual.mesh);
      visual.material.dispose();
    }
    while (this.pulseVisuals.length < pulses.length) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x9cd9f5,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.circleGeometry, material);
      this.pulseGroup.add(mesh);
      this.pulseVisuals.push({ mesh, material });
    }
    for (let i = 0; i < pulses.length; i += 1) {
      const pulse = pulses[i];
      const visual = this.pulseVisuals[i];
      visual.mesh.position.set(pulse.x, pulse.y, -0.1);
      const scale = Math.max(0.001, pulse.radius * 2);
      visual.mesh.scale.set(scale, scale, 1);
      const fade = 1 - pulse.age / pulse.duration;
      visual.material.opacity = Math.max(0, fade) * 0.45;
    }
  }

  private clearPulseVisuals(): void {
    this.pulseVisuals.forEach((visual) => {
      this.pulseGroup.remove(visual.mesh);
      visual.material.dispose();
    });
    this.pulseVisuals = [];
  }

  private enemyColor(enemy: Enemy): number {
    if (enemy.kind === EnemyKind.SleeperPlatform) {
      if (enemy.state === 'asleep') {
        if (this.elapsed >= enemy.telegraphStart) {
          return Math.sin(this.elapsed * 20) > 0 ? 0xffffff : SLEEPER_ASLEEP_COLOR;
        }
        return SLEEPER_ASLEEP_COLOR;
      }
      return SLEEPER_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.BounceCritter) {
      if (enemy.state === 'asleep') {
        if (this.elapsed >= enemy.telegraphStart) {
          return Math.sin(this.elapsed * 20) > 0 ? 0xffffff : BOUNCE_ASLEEP_COLOR;
        }
        return BOUNCE_ASLEEP_COLOR;
      }
      return BOUNCE_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.Boss) {
      if (enemy.state === 'asleep') {
        if (this.elapsed >= enemy.telegraphStart) {
          return Math.sin(this.elapsed * 20) > 0 ? 0xffffff : BOSS_STUNNED_COLOR;
        }
        return BOSS_STUNNED_COLOR;
      }
      return BOSS_AWAKE_COLOR;
    }
    return SLEEPER_AWAKE_COLOR;
  }

  private static createStarGeometry(
    radius: number,
    innerRadius: number,
    points: number,
  ): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const angle = i * step - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createHeartGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, radius * 0.7);
    shape.bezierCurveTo(radius, radius * 1.3, radius * 1.2, radius * 0.2, 0, -radius);
    shape.bezierCurveTo(-radius * 1.2, radius * 0.2, -radius, radius * 1.3, 0, radius * 0.7);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private intersects(entity: { x: number; y: number; w: number; h: number }, rect: Rect): boolean {
    return (
      entity.x < rect.x + rect.w &&
      entity.x + entity.w > rect.x &&
      entity.y < rect.y + rect.h &&
      entity.y + entity.h > rect.y
    );
  }
}

