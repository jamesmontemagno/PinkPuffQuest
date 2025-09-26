import { MAX_HEALTH } from '../config';
import type { Collectible, Pickup, Player } from '../entities';
import { PickupKind } from '../types';

export interface NoteCollectionResult {
  collectedIndices: number[];
}

export interface PickupCollectionResult {
  collectedIndices: number[];
  healthRestored: number;
}

export function collectNotes(player: Player, notes: Collectible[]): NoteCollectionResult {
  const collectedIndices: number[] = [];
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;

  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    if (note.collected) continue;
    const dx = note.x - centerX;
    const dy = note.y - centerY;
    if (dx * dx + dy * dy <= 0.4 * 0.4) {
      note.collected = true;
      player.notes += 1;
      collectedIndices.push(i);
    }
  }

  return { collectedIndices };
}

export function collectPickups(player: Player, pickups: Pickup[]): PickupCollectionResult {
  const collectedIndices: number[] = [];
  let healthRestored = 0;

  for (let i = 0; i < pickups.length; i += 1) {
    const pickup = pickups[i];
    if (pickup.collected) continue;
    const rect = { x: pickup.x, y: pickup.y, w: pickup.w, h: pickup.h };
    if (!intersects(player, rect)) continue;
    pickup.collected = true;
    collectedIndices.push(i);
    if (pickup.kind === PickupKind.Health && player.health < MAX_HEALTH) {
      const before = player.health;
      player.health = Math.min(MAX_HEALTH, player.health + 1);
      healthRestored += player.health - before;
    }
  }

  return { collectedIndices, healthRestored };
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
