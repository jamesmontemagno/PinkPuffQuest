import { EnemyKind } from './types';
import type { EnemySpawn, NoteSpawn } from './entities';
import type { Rect } from './types';

export const PLATFORMS: Rect[] = [
  { x: 0, y: 0, w: 60, h: 1 },
  { x: 6, y: 2, w: 4, h: 1 },
  { x: 12, y: 3.5, w: 5, h: 1 },
  { x: 19, y: 5.5, w: 4, h: 1 },
  { x: 27, y: 2.5, w: 5, h: 1 },
  { x: 32, y: 4.5, w: 4, h: 1 },
  { x: 42, y: 3, w: 5, h: 1 },
  { x: 52, y: 2, w: 6, h: 1 },
];

export const ENEMIES: EnemySpawn[] = [
  {
    kind: EnemyKind.SleeperPlatform,
    x: 14,
    y: 4.5,
    patrol: { xMin: 12, xMax: 20 },
  },
  {
    kind: EnemyKind.BounceCritter,
    x: 28,
    y: 3.5,
    bob: { amp: 1, freq: 1.2 },
  },
  {
    kind: EnemyKind.SleeperPlatform,
    x: 36,
    y: 5,
    patrol: { xMin: 34, xMax: 40 },
  },
  {
    kind: EnemyKind.BounceCritter,
    x: 48,
    y: 3.5,
    bob: { amp: 1.2, freq: 1 },
  },
];

export const NOTES: NoteSpawn[] = [
  { x: 4, y: 2.2 },
  { x: 18, y: 6.7 },
  { x: 33, y: 6.3 },
  { x: 45, y: 5 },
  { x: 56, y: 3 },
];

export const CHECKPOINT = { x: 32, y: 1 };
export const GATE = { x: 60, y: 1, w: 2, h: 4 };
