# Pink Puff Quest – Technical Implementation (MVP – Simplified)

Ultra‑lean version aligned with `mvp.md`: one playable level, two enemy types, placeholder geometry visuals, no audio, no automated tests. Focus: get a controllable loop (move → sleep enemies → traverse → finish) with minimum code surface.

---
## 1. Tech Stack Summary (Trimmed)
- Runtime: Browser (desktop modern browsers).
- Language: TypeScript (strict mode kept—helps without tests).
- Renderer: Three.js + OrthographicCamera (2D feel, easy future depth).
- Build / Dev: Vite (dev, build, preview only).
- Lint/Format: Optional (can add later); keep code readable but omit config if rushing.
- Deployment: Static bundle (`dist/`).

---
## 2. Core Design Choices (Essential Only)
| Concern | Choice |
|---------|-------|
| HUD | Simple HTML overlay |
| Architecture | Single `Game` class + small entity classes (Player, Enemy, Collectible) |
| Loop | Fixed timestep 1/60s (short helper) |
| Layout | Hardcoded rectangle list & spawn arrays |
| Respawn | Instant teleport to checkpoint |
| Units | 1 unit ≈ tile (conceptual, no scaling math needed) |
| Sleep Telegraph | Simple color flash last 0.5s (optional; keep if trivial) |

---
## 3. Directory Structure (Reduced)
```
/ (repo)
  index.html
  package.json
  tsconfig.json
  vite.config.ts (minimal)
  /src
    main.ts           # Boot & start loop
    Game.ts           # Core orchestrator
    config.ts         # Constants
    types.d.ts        # (optional) misc types
    entities.ts       # Player, Enemy, Collectible classes
    sleepPulse.ts     # Pulse visual + hit check
    level1.ts         # Platforms, spawns, notes, gate, checkpoint
    hud.ts            # Simple DOM update helpers
    input.ts          # Key state
    loop.ts           # Fixed timestep helper
```

> All logic kept in a handful of files—no separate system folders, no tests folder.

---
## 4. Core Data Structures (Minimal)
```ts
interface Rect { x: number; y: number; w: number; h: number; }

enum EnemyKind { SleeperPlatform, BounceCritter }

type EnemyState = 'awake' | 'asleep';

interface EnemyConfig {
  kind: EnemyKind;
  width: number; height: number;
  awakeSpeedX?: number;          // for patrolling
  sleepDuration: number;         // seconds
  bounceVelocity?: number;       // for BounceCritter asleep boost
}
```
Base Entity class holds:
- position (x,y)
- velocity (vx, vy)
- size (w,h)
- flags: solid (platform collision), harmful (if awake), sleepable

Enemy: kind, state, sleepUntil, (optional) telegraphStart.

Player: position, velocity, health, grounded flag, sleepReadyAt, invulnerableUntil.

---
## 5. Fixed Timestep Loop (Short Form)
```
let last = performance.now();
let acc = 0;
function frame(now: number) {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP_MS) { update(STEP_S); acc -= STEP_MS; }
  render();
  requestAnimationFrame(frame);
}
```
`STEP_S = 1/60`, `STEP_MS = 1000 * STEP_S`.

---
## 6. Update Order (Condensed)
1. Sample input.
2. Player intent (movement, jump, fire sleep if ready).
3. Integrate & resolve collisions.
4. Enemy AI & sleep timers.
5. Damage + collectibles + checkpoint/gate.
6. Cleanup expired pulses.
7. HUD update.

---
## 7. Collision (Simplified)
- AABB rectangles only.
- Resolve vertical then horizontal; mark grounded when downward collision stops fall.
- Pulse uses distance check (squared radius) vs enemy centers.

---
## 8. Sleep Mechanic (Essential)
1. Press key & off cooldown → spawn pulse (visual) & process enemies.
2. Enemy inside radius → state = asleep; sleepUntil = now + duration.
3. Last 0.5s (optional): flash color.
4. On wake: revert speed / harmful flag.
5. Cooldown bar = max(0, (sleepReadyAt - now)/COOLDOWN).

---
## 9. Enemy Behaviors (Tiny Specs)
Sleeper Platform: horizontal patrol (speed const); asleep → stop, safe.

Bounce Critter: sine bob; asleep → freeze & bounce pad (set player vy on top contact).

---
## 10. Level Definition (Snippet)
```ts
export const PLATFORMS: Rect[] = [
  { x: 0, y: 0, w: 40, h: 1 },      // ground
  { x: 18, y: 4, w: 6, h: 1 },
  { x: 30, y: 6, w: 5, h: 1 },
  // ...
];

export const ENEMIES = [
  { kind: EnemyKind.SleeperPlatform, x: 12, y: 1, patrol: { xMin: 12, xMax: 20 } },
  { kind: EnemyKind.BounceCritter, x: 28, y: 2, bob: { amp: 1, freq: 1.2 } },
];

export const NOTES = [ {x: 5, y:2}, {x:19,y:6}, {x:31,y:7}, {x:45,y:3}, {x:55,y:4} ];

export const CHECKPOINT = { x: 32, y: 1 };
export const GATE = { x: 60, y: 1, w: 2, h: 4 };
```

---
## 11. HUD (HTML)
`index.html` basic overlay:
```
<div class="pips">
  <span class="pip full" data-index="0"></span>
  <span class="pip full" data-index="1"></span>
  <span class="pip full" data-index="2"></span>
</div>
<div class="cooldown">
  <div class="note-icon"><div class="fill"></div></div>
</div>
<div class="notes">♪ 0/5</div>
```
Style: simple flex row; cooldown fill height clipped via CSS.

Update: simple function updates text / classes every frame (micro-optim not required now).

---
## 12. Constants (`config.ts`)
```ts
export const STEP = 1/60;
export const GRAVITY = 20;
export const PLAYER_SPEED = 8;        // units/sec
export const JUMP_VELOCITY = 9;
export const COYOTE_TIME = 0.1;
export const SLEEP_COOLDOWN = 1.5;
export const SLEEP_RADIUS = 3;
export const SLEEP_DURATION = 4;
export const BOUNCE_VELOCITY = 11;
export const INVULN_TIME = 1;
export const TELEGRAPH_WINDOW = 0.5;  // last seconds of sleep
export const MAX_HEALTH = 3;
```

---
## 13. Minimal Build Scripts (package.json excerpt)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---
## 14. Implementation Order (Short)
1. Tooling setup (Vite, TS config, ESLint/Prettier).
2. Core loop + Game + Camera.
3. Player movement & collision.
4. Platforms & level1 definition.
5. Enemy base + Sleeper Platform.
6. Sleep pulse system + cooldown.
7. Bounce Critter & bounce interaction.
8. Collectibles & HUD integration.
9. Damage / respawn / checkpoint.
10. Gate + completion overlay.
11. Light manual tuning pass.

## 15. Performance Notes (Minimal)
- Small entity counts ⇒ naive loops fine.
- Keep geometry simple (planes / basic shapes).

## 16. (Optional) Future Hooks
- Add tags / ECS only if complexity grows.
- Add tests after first playable if stability becomes concern.

## 17. Small Risk Notes
- Sleep clarity: ensure contrasting asleep color + simple Z text.
- Collision jitter: per-axis resolve; keep speeds moderate.

## 18. Definition of Done
- Dev server runs; player finishes level.
- Sleep works with visible state swap & wake.
- No console errors in playthrough.
- Build output loads via `vite preview`.

## 19. Post-MVP (If Continuing)
- Fade respawn; parallax; assist toggles; tests; ECS; audio.

This simplified document strips non-essential structure to reach a playable slice fast.
