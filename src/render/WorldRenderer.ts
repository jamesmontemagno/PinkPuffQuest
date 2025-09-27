import * as THREE from 'three';
import type { Collectible, Enemy, Pickup, Player } from '../entities';
import { EnemyKind, PickupKind } from '../types';
import type { Rect } from '../types';
import type { SleepPulse } from '../sleepPulse';

const PLAYER_COLOR = 0xf9a4c0;
const PLAYER_INVULN_COLOR = 0xfdd7e6;
const PLATFORM_COLOR = 0xded0f7;
const SLEEPER_AWAKE_COLOR = 0x9c7cd4;
const SLEEPER_ASLEEP_COLOR = 0xcbbef8;
const BOUNCE_AWAKE_COLOR = 0x6ed9c1;
const BOUNCE_ASLEEP_COLOR = 0xbdf1e4;
const GRUMBLE_AWAKE_COLOR = 0x8B4A9C;
const GRUMBLE_ASLEEP_COLOR = 0xB17BC4;
const PUFFY_AWAKE_COLOR = 0xFF9A9E;
const PUFFY_ASLEEP_COLOR = 0xFFC1C3;
const SNAIL_AWAKE_COLOR = 0x7B68EE;
const SNAIL_ASLEEP_COLOR = 0x9B8CFF;
const NOTE_COLOR = 0xfdf1a2;
const NOTE_EMISSIVE_COLOR = 0xffd35c;
const NOTE_COLLECTED_COLOR = 0xe6e0f3;
const PICKUP_COLOR = 0xff88af;
const PICKUP_GLOW_COLOR = 0xffbdcf;
const SPEED_PICKUP_COLOR = 0x00FF7F;
const JUMP_PICKUP_COLOR = 0x9370DB;
const SLEEP_PICKUP_COLOR = 0x87CEEB;
const SHARD_PICKUP_COLOR = 0xFFD700;
const GATE_COLOR = 0x88e0f7;
const CHECKPOINT_COLOR = 0xf4b7d2;
const CHECKPOINT_ACTIVE_COLOR = 0xf982ae;
const BOSS_AWAKE_COLOR = 0x7653d7;
const BOSS_STUNNED_COLOR = 0xbfa9ff;
const BACKGROUND_COLOR = 0xf8f4fb;

const NOTE_BASE = new THREE.Color(NOTE_COLOR);
const NOTE_GLOW = new THREE.Color(NOTE_EMISSIVE_COLOR);
const PICKUP_BASE = new THREE.Color(PICKUP_COLOR);
const PICKUP_GLOW = new THREE.Color(PICKUP_GLOW_COLOR);
const SPEED_BASE = new THREE.Color(SPEED_PICKUP_COLOR);
const SPEED_GLOW = new THREE.Color(0x90EE90);
const JUMP_BASE = new THREE.Color(JUMP_PICKUP_COLOR);
const JUMP_GLOW = new THREE.Color(0xBA98FF);
const SLEEP_BASE = new THREE.Color(SLEEP_PICKUP_COLOR);
const SLEEP_GLOW = new THREE.Color(0xB0E0E6);
const SHARD_BASE = new THREE.Color(SHARD_PICKUP_COLOR);
const SHARD_GLOW = new THREE.Color(0xFFF8DC);

interface PulseVisual {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

export interface CameraBounds {
  width: number;
  height: number;
}

export class WorldRenderer {
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
  private readonly starGeometry = WorldRenderer.createStarGeometry(0.5, 0.22, 5);
  private readonly heartGeometry = WorldRenderer.createHeartGeometry(0.55);
  
  // Character and enemy geometries
  private readonly puffGeometry = WorldRenderer.createPuffGeometry(0.5);
  private readonly sleeperGeometry = WorldRenderer.createSleeperGeometry(0.5, 0.3);
  private readonly bounceGeometry = WorldRenderer.createBounceGeometry(0.5);
  private readonly grumbleGeometry = WorldRenderer.createGrumbleGeometry(0.5);
  private readonly puffyGeometry = WorldRenderer.createPuffyGeometry(0.5);
  private readonly snailGeometry = WorldRenderer.createSnailGeometry(0.5);
  private readonly bossGeometry = WorldRenderer.createBossGeometry(0.8);
  private readonly diamondGeometry = WorldRenderer.createDiamondGeometry(0.4);

  private readonly playerMesh: THREE.Mesh;
  private enemyMeshes: THREE.Mesh[] = [];
  private noteMeshes: THREE.Mesh[] = [];
  private pickupMeshes: THREE.Mesh[] = [];
  private readonly checkpointMesh: THREE.Mesh;
  private readonly gateMesh: THREE.Mesh;

  private pulseVisuals: PulseVisual[] = [];
  private noteSpinAccumulator = 0;

  constructor(private readonly container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

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
      this.puffGeometry,
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

  updateCamera(player: Player, bounds: CameraBounds): void {
    const width = this.camera.right - this.camera.left;
    const halfWidth = width / 2;
    const halfHeight = this.viewHeight / 2;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const targetX = THREE.MathUtils.clamp(
      playerCenterX,
      halfWidth,
      Math.max(halfWidth, bounds.width - halfWidth),
    );
    const targetY = THREE.MathUtils.clamp(
      playerCenterY,
      halfHeight,
      Math.max(halfHeight, bounds.height - halfHeight),
    );
    this.camera.position.set(targetX, targetY, this.camera.position.z);
    this.camera.lookAt(targetX, targetY, 0);
  }

  buildPlatforms(rects: Rect[]): void {
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

  refreshEnemies(enemies: Enemy[]): void {
    this.enemyMeshes.forEach((mesh) => {
      this.enemyGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.enemyMeshes = [];
    for (const enemy of enemies) {
      const geometry = this.getEnemyGeometry(enemy.kind);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: this.enemyColor(enemy, 0) }),
      );
      mesh.scale.set(enemy.w, enemy.h, 1);
      mesh.position.set(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0);
      this.enemyGroup.add(mesh);
      this.enemyMeshes.push(mesh);
    }
  }

  removeEnemyMesh(index: number): void {
    const mesh = this.enemyMeshes[index];
    if (!mesh) return;
    this.enemyGroup.remove(mesh);
    (mesh.material as THREE.Material).dispose?.();
    this.enemyMeshes.splice(index, 1);
  }

  refreshNotes(notes: Collectible[]): void {
    this.noteMeshes.forEach((mesh) => {
      this.noteGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.noteMeshes = [];
    this.noteSpinAccumulator = 0;
    for (const note of notes) {
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

  markNoteCollected(index: number): void {
    const mesh = this.noteMeshes[index];
    if (!mesh) return;
    mesh.scale.set(1.15, 1.15, 1);
  }

  refreshPickups(pickups: Pickup[]): void {
    this.pickupMeshes.forEach((mesh) => {
      this.pickupGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose?.();
    });
    this.pickupMeshes = [];
    for (const pickup of pickups) {
      const color = this.getPickupColor(pickup.kind);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const geometry = this.getPickupGeometry(pickup.kind);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(pickup.w, pickup.h, 1);
      mesh.position.set(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, 0.05);
      this.pickupGroup.add(mesh);
      this.pickupMeshes.push(mesh);
    }
  }

  syncPlayer(player: Player, elapsed: number, options: { force?: boolean } = {}): void {
    this.playerMesh.scale.set(player.w, player.h, 1);
    this.playerMesh.position.set(player.x + player.w / 2, player.y + player.h / 2, 0.2);
    const material = this.playerMesh.material as THREE.MeshBasicMaterial;
    const invulnActive = elapsed < player.invulnerableUntil;
    material.color.setHex(invulnActive ? PLAYER_INVULN_COLOR : PLAYER_COLOR);
    if (options.force) {
      material.needsUpdate = true;
    }
  }

  syncEnemies(enemies: Enemy[], elapsed: number): void {
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      const mesh = this.enemyMeshes[i];
      if (!mesh) continue;
      mesh.position.set(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(this.enemyColor(enemy, elapsed));
    }
  }

  syncNotes(notes: Collectible[]): void {
    for (let i = 0; i < notes.length; i += 1) {
      const note = notes[i];
      const mesh = this.noteMeshes[i];
      if (!mesh) continue;
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

  syncPickups(pickups: Pickup[]): void {
    for (let i = 0; i < pickups.length; i += 1) {
      const pickup = pickups[i];
      const mesh = this.pickupMeshes[i];
      if (!mesh) continue;
      mesh.visible = !pickup.collected;
      if (!pickup.collected) {
        mesh.position.set(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, 0.05);
      }
    }
  }

  animateNotes(dt: number): void {
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

  animatePickups(pickups: Pickup[], elapsed: number): void {
    for (let i = 0; i < this.pickupMeshes.length; i += 1) {
      const pickup = pickups[i];
      const mesh = this.pickupMeshes[i];
      if (!mesh || pickup.collected) continue;
      const t = elapsed * 3 + i;
      const scalePulse = 1 + 0.1 * Math.sin(t);
      mesh.scale.set(pickup.w * scalePulse, pickup.h * scalePulse, 1);
      mesh.rotation.z = Math.sin(t * 0.5) * 0.1;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const glow = (Math.sin(t * 1.4) + 1) / 2;
      
      // Use different color combinations for different pickup types
      const { base, glowColor } = this.getPickupColors(pickup.kind);
      material.color.copy(base).lerp(glowColor, glow * 0.7);
    }
  }

  setCheckpoint(rect: Rect, active: boolean): void {
    this.checkpointMesh.scale.set(rect.w, rect.h, 1);
    this.checkpointMesh.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, 0);
    const material = this.checkpointMesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(active ? CHECKPOINT_ACTIVE_COLOR : CHECKPOINT_COLOR);
  }

  setGate(rect: Rect): void {
    this.gateMesh.scale.set(rect.w, rect.h, 1);
    this.gateMesh.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, 0);
  }

  updatePulsesVisuals(pulses: readonly SleepPulse[]): void {
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

  clearPulseVisuals(): void {
    this.pulseVisuals.forEach((visual) => {
      this.pulseGroup.remove(visual.mesh);
      visual.material.dispose();
    });
    this.pulseVisuals = [];
  }

  private enemyColor(enemy: Enemy, elapsed: number): number {
    if (enemy.kind === EnemyKind.SleeperPlatform) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : SLEEPER_ASLEEP_COLOR;
        }
        return SLEEPER_ASLEEP_COLOR;
      }
      return SLEEPER_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.BounceCritter) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : BOUNCE_ASLEEP_COLOR;
        }
        return BOUNCE_ASLEEP_COLOR;
      }
      return BOUNCE_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.GrumbleRock) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : GRUMBLE_ASLEEP_COLOR;
        }
        return GRUMBLE_ASLEEP_COLOR;
      }
      return GRUMBLE_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.PuffyPuffer) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : PUFFY_ASLEEP_COLOR;
        }
        return PUFFY_ASLEEP_COLOR;
      }
      return PUFFY_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.DrowsySnail) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : SNAIL_ASLEEP_COLOR;
        }
        return SNAIL_ASLEEP_COLOR;
      }
      return SNAIL_AWAKE_COLOR;
    }
    if (enemy.kind === EnemyKind.Boss) {
      if (enemy.state === 'asleep') {
        if (elapsed >= enemy.telegraphStart) {
          return Math.sin(elapsed * 20) > 0 ? 0xffffff : BOSS_STUNNED_COLOR;
        }
        return BOSS_STUNNED_COLOR;
      }
      return BOSS_AWAKE_COLOR;
    }
    return SLEEPER_AWAKE_COLOR;
  }

  private getPickupColor(kind: PickupKind): number {
    switch (kind) {
      case PickupKind.Health:
        return PICKUP_COLOR;
      case PickupKind.GoldenMelodyShard:
        return SHARD_PICKUP_COLOR;
      case PickupKind.SpeedBoost:
        return SPEED_PICKUP_COLOR;
      case PickupKind.SuperJump:
        return JUMP_PICKUP_COLOR;
      case PickupKind.ExtendedSleep:
        return SLEEP_PICKUP_COLOR;
      default:
        return PICKUP_COLOR;
    }
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

  private getEnemyGeometry(kind: EnemyKind): THREE.BufferGeometry {
    switch (kind) {
      case EnemyKind.SleeperPlatform:
        return this.sleeperGeometry;
      case EnemyKind.BounceCritter:
        return this.bounceGeometry;
      case EnemyKind.GrumbleRock:
        return this.grumbleGeometry;
      case EnemyKind.PuffyPuffer:
        return this.puffyGeometry;
      case EnemyKind.DrowsySnail:
        return this.snailGeometry;
      case EnemyKind.Boss:
        return this.bossGeometry;
      default:
        return this.unitPlane;
    }
  }

  private getPickupGeometry(kind: PickupKind): THREE.BufferGeometry {
    switch (kind) {
      case PickupKind.Health:
        return this.heartGeometry;
      case PickupKind.GoldenMelodyShard:
        return this.diamondGeometry;
      case PickupKind.SpeedBoost:
        return this.circleGeometry;
      case PickupKind.SuperJump:
        return this.starGeometry;
      case PickupKind.ExtendedSleep:
        return this.puffGeometry;
      default:
        return this.heartGeometry;
    }
  }

  private getPickupColors(kind: PickupKind): { base: THREE.Color; glowColor: THREE.Color } {
    switch (kind) {
      case PickupKind.Health:
        return { base: PICKUP_BASE, glowColor: PICKUP_GLOW };
      case PickupKind.GoldenMelodyShard:
        return { base: SHARD_BASE, glowColor: SHARD_GLOW };
      case PickupKind.SpeedBoost:
        return { base: SPEED_BASE, glowColor: SPEED_GLOW };
      case PickupKind.SuperJump:
        return { base: JUMP_BASE, glowColor: JUMP_GLOW };
      case PickupKind.ExtendedSleep:
        return { base: SLEEP_BASE, glowColor: SLEEP_GLOW };
      default:
        return { base: PICKUP_BASE, glowColor: PICKUP_GLOW };
    }
  }

  // Character and enemy geometry creation methods
  private static createPuffGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    const segments = 12;
    
    // Create a fluffy, cloud-like shape for the player
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cloudRadius = radius * (0.8 + 0.2 * Math.sin(angle * 3));
      const x = Math.cos(angle) * cloudRadius;
      const y = Math.sin(angle) * cloudRadius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createSleeperGeometry(width: number, height: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Rectangular platform with rounded corners
    const cornerRadius = Math.min(width, height) * 0.15;
    shape.moveTo(-width/2 + cornerRadius, -height/2);
    shape.lineTo(width/2 - cornerRadius, -height/2);
    shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + cornerRadius);
    shape.lineTo(width/2, height/2 - cornerRadius);
    shape.quadraticCurveTo(width/2, height/2, width/2 - cornerRadius, height/2);
    shape.lineTo(-width/2 + cornerRadius, height/2);
    shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - cornerRadius);
    shape.lineTo(-width/2, -height/2 + cornerRadius);
    shape.quadraticCurveTo(-width/2, -height/2, -width/2 + cornerRadius, -height/2);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createBounceGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create a bouncy, rounded creature shape
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const bounceRadius = radius * (0.9 + 0.1 * Math.sin(angle * 4));
      const x = Math.cos(angle) * bounceRadius;
      const y = Math.sin(angle) * bounceRadius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createGrumbleGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create a rocky, angular shape
    const points = 6;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const rockRadius = radius * (0.7 + 0.3 * ((i % 2) ? 1 : 0.6));
      const x = Math.cos(angle) * rockRadius;
      const y = Math.sin(angle) * rockRadius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createPuffyGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create a puffy cloud-like enemy
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const puffRadius = radius * (0.6 + 0.4 * Math.sin(angle * 2.5));
      const x = Math.cos(angle) * puffRadius;
      const y = Math.sin(angle) * puffRadius * 0.7; // Slightly flattened
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createSnailGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create a snail shell spiral
    shape.moveTo(radius * 0.8, 0);
    
    // Create shell spiral
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * Math.PI * 3;
      const spiralRadius = radius * (0.8 - i * 0.03);
      const x = Math.cos(angle) * spiralRadius;
      const y = Math.sin(angle) * spiralRadius;
      shape.lineTo(x, y);
    }
    
    // Complete the outer shell
    for (let i = 0; i <= 12; i++) {
      const angle = Math.PI * 1.5 + (i / 12) * Math.PI;
      const x = Math.cos(angle) * radius * 0.8;
      const y = Math.sin(angle) * radius * 0.8;
      shape.lineTo(x, y);
    }
    
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createBossGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create an imposing diamond-like boss shape
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const bossRadius = radius * (i % 2 === 0 ? 1.0 : 0.6);
      const x = Math.cos(angle) * bossRadius;
      const y = Math.sin(angle) * bossRadius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createDiamondGeometry(radius: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    // Create a diamond shape for golden melody shards
    shape.moveTo(0, radius);
    shape.lineTo(radius * 0.6, 0);
    shape.lineTo(0, -radius);
    shape.lineTo(-radius * 0.6, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }
}
