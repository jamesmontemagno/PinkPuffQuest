import { FLOAT_GRAVITY_REDUCTION, GRAVITY } from '../config';
import type { Enemy, Player } from '../entities';
import { EnemyKind, type Rect } from '../types';

export function applyPhysics(
  player: Player,
  enemies: Enemy[],
  platforms: Rect[],
  dt: number,
  prevX: number,
  prevY: number,
): void {
  // Apply reduced gravity when floating
  const gravityMultiplier = player.isFloating ? FLOAT_GRAVITY_REDUCTION : 1.0;
  player.vy -= GRAVITY * gravityMultiplier * dt;

  const solids = collectSolidRects(platforms, enemies);

  player.y += player.vy * dt;
  resolveVerticalCollisions(player, prevY, solids);

  player.x += player.vx * dt;
  resolveHorizontalCollisions(player, prevX, solids);
}

function collectSolidRects(platforms: Rect[], enemies: Enemy[]): Rect[] {
  const rects: Rect[] = platforms.map((platform) => ({ ...platform }));
  for (const enemy of enemies) {
    if (enemy.kind === EnemyKind.SleeperPlatform) {
      rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
    } else if (enemy.kind === EnemyKind.BounceCritter && enemy.state === 'asleep') {
      rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
    } else if (enemy.kind === EnemyKind.GrumbleRock) {
      rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
    } else if (enemy.kind === EnemyKind.PuffyPuffer && enemy.state === 'asleep') {
      // When asleep, becomes a safe cloud platform
      rects.push({ x: enemy.x, y: enemy.y + enemy.h * 0.6, w: enemy.w, h: enemy.h * 0.4 });
    } else if (enemy.kind === EnemyKind.DrowsySnail) {
      rects.push({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h });
    }
  }
  return rects;
}

function resolveVerticalCollisions(player: Player, prevY: number, solids: Rect[]): void {
  player.grounded = false;
  for (const rect of solids) {
    if (!intersects(player, rect)) continue;
    if (player.vy <= 0 && prevY >= rect.y + rect.h) {
      player.y = rect.y + rect.h;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy > 0 && prevY + player.h <= rect.y) {
      player.y = rect.y - player.h;
      player.vy = 0;
    }
  }
}

function resolveHorizontalCollisions(player: Player, prevX: number, solids: Rect[]): void {
  for (const rect of solids) {
    if (!intersects(player, rect)) continue;
    if (player.vx > 0 && prevX + player.w <= rect.x) {
      player.x = rect.x - player.w;
      player.vx = 0;
    } else if (player.vx < 0 && prevX >= rect.x + rect.w) {
      player.x = rect.x + rect.w;
      player.vx = 0;
    }
  }
}

function intersects(
  entity: { x: number; y: number; w: number; h: number },
  rect: Rect,
): boolean {
  return (
    entity.x < rect.x + rect.w &&
    entity.x + entity.w > rect.x &&
    entity.y < rect.y + rect.h &&
    entity.y + entity.h > rect.y
  );
}
