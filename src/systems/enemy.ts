import { INVULN_TIME, SLEEP_DURATION } from '../config';
import {
  bouncePlayer,
  sleepEnemy,
  wakeEnemy,
  type Enemy,
  type Player,
} from '../entities';
import { EnemyKind } from '../types';

export function updateEnemies(enemies: Enemy[], elapsed: number, dt: number): void {
  for (const enemy of enemies) {
    if (enemy.state === 'asleep' && elapsed >= enemy.sleepUntil) {
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
        enemy.y = enemy.baseY + Math.sin(elapsed * enemy.bob.freq * Math.PI * 2) * enemy.bob.amp;
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
        enemy.y = enemy.baseY + Math.sin(elapsed * 1.5) * 0.3;
      } else {
        enemy.y = enemy.baseY;
      }
    }
  }
}

export function handleEnemyInteractions(
  player: Player,
  enemies: Enemy[],
  prevX: number,
  prevY: number,
  elapsed: number,
): { tookDamage: boolean } {
  for (const enemy of enemies) {
    const rect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    if (!intersects(player, rect)) continue;

    if (enemy.kind === EnemyKind.BounceCritter && enemy.state === 'asleep') {
      const wasAbove = prevY >= enemy.y + enemy.h - 0.1;
      if (wasAbove && player.vy <= 0) {
        player.y = enemy.y + enemy.h;
        bouncePlayer(player);
      }
      continue;
    }

    if (enemy.harmful && elapsed >= player.invulnerableUntil) {
      player.health -= 1;
      player.invulnerableUntil = elapsed + INVULN_TIME;
      player.x = prevX;
      player.y = prevY;
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      player.coyoteTime = 0;
      return { tookDamage: true };
    }
  }

  return { tookDamage: false };
}

export function applySleepPulse(
  player: Player,
  enemies: Enemy[],
  elapsed: number,
  radius: number,
  duration: number = SLEEP_DURATION,
): { defeatedIndices: number[]; bossDamage: number } {
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;
  const radiusSq = radius * radius;
  const defeatedIndices: number[] = [];
  let bossDamage = 0;

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const enemyCenterX = enemy.x + enemy.w / 2;
    const enemyCenterY = enemy.y + enemy.h / 2;
    const dx = enemyCenterX - centerX;
    const dy = enemyCenterY - centerY;
    if (dx * dx + dy * dy > radiusSq) continue;

    if (enemy.kind === EnemyKind.Boss) {
      sleepEnemy(enemy, elapsed, duration * 0.6);
      if (typeof enemy.health === 'number') {
        enemy.health -= 1;
        bossDamage += 1;
        if (enemy.health <= 0) {
          defeatedIndices.push(i);
          continue;
        }
      }
    } else {
      sleepEnemy(enemy, elapsed, duration);
    }
  }

  return { defeatedIndices, bossDamage };
}

function intersects(
  entity: { x: number; y: number; w: number; h: number },
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    entity.x < rect.x + rect.w &&
    entity.x + entity.w > rect.x &&
    entity.y < rect.y + rect.h &&
    entity.y + entity.h > rect.y
  );
}
