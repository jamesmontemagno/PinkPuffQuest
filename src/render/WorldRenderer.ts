import * as THREE from 'three';
import type { Collectible, Enemy, Pickup, Player } from '../entities';
import { EnemyKind } from '../types';
import type { Rect } from '../types';
import type { SleepPulse } from '../sleepPulse';

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
const BACKGROUND_COLOR = 0xf8f4fb;

const NOTE_BASE = new THREE.Color(NOTE_COLOR);
const NOTE_GLOW = new THREE.Color(NOTE_EMISSIVE_COLOR);
const PICKUP_BASE = new THREE.Color(PICKUP_COLOR);
const PICKUP_GLOW = new THREE.Color(PICKUP_GLOW_COLOR);

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
      const mesh = new THREE.Mesh(
        this.unitPlane,
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
      const material = mesh.material as THREE.MeshBasicMaterial;
      const glow = (Math.sin(t * 1.4) + 1) / 2;
      material.color.copy(PICKUP_BASE).lerp(PICKUP_GLOW, glow * 0.7);
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
}
