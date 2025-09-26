# Pink Puff Quest (MVP)

An ultra-minimal Three.js + TypeScript prototype implementing the core "sleep to traverse" loop described in the MVP and technical specs. The project ships a single short level with two enemy archetypes, collectibles, a checkpoint, and a fixed-timestep update loop.

## Features

- Responsive player movement with coyote-time jump forgiveness
- Sleep pulse ability that freezes nearby enemies and starts a cooldown
- Sleeper Platform enemies that patrol when awake and become safe platforms when asleep
- Bounce Critter enemies that bob in the air and turn into spring pads when asleep
- Collectible star-notes that twirl and glow as you approach, plus HUD with health pips and cooldown indicator
- Dream Heart pickups that restore missing health
- Three handcrafted stages culminating in a boss arena
- Mid-level checkpoint, instant respawn, and end gate overlay with stats
- Orthographic Three.js rendering with pastel placeholder geometry

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (ships with npm)

## Getting Started

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Start the dev server:
   ```powershell
   npm run dev
   ```
   Vite will print a local URL (typically `http://localhost:5173`). Open it in a modern desktop browser.
3. Controls:
   - Move: `A` / `D` or `←` / `→`
   - Jump: `Space`, `Z`, `W`, or `↑`
   - Sleep Pulse: `Shift` or `X`
   - Restart (after finishing): Click the **Restart** button in the overlay

## Player & Enemy Details

### Player

- Speed: 8 units/second lateral movement with instant direction swaps.
- Jump: Fixed-height leap with an 11 u/s launch velocity (~3 tile reach) plus 0.1 seconds of coyote forgiveness.
- Health: 3 drowsiness pips; taking damage while awake enemies are touched removes 1 pip and grants 1 second of invulnerability.
- Sleep Pulse: Emits a radius-3 wave, applying a 4-second sleep to affected enemies and entering a 1.5-second cooldown. The HUD cooldown meter mirrors the recharge progress.
- Dream Hearts: Collectible items sprinkled through later levels restore 1 pip up to the 3 pip maximum.

### Enemies

**Sleeper Platform**

- Awake: Patrols horizontally between its bounds at roughly 2 units/second and harms on contact.
- Asleep: Freezes in place, becomes non-harmful, and acts as a solid platform. Begins flashing 0.5 seconds before waking.

**Bounce Critter**

- Awake: Bobs vertically on a sine curve, dealing damage on contact.
- Asleep: Locks in place and becomes a springboard that launches the player upward with a strong bounce (launch velocity 11 u/s) when landed on.

**Boss — Lullaby Warden**

- Patrols the final arena, swooping gently while awake and dealing contact damage.
- Requires four successful sleep pulses to defeat; each pulse briefly stuns the boss, opening a safe window.
- Gate unlocks only after the Warden is defeated and all notes in the arena are collected.

### Levels

1. **Prototype Meadow** — Tutorial stretch introducing sleepers, critters, and the basics of note gathering.
2. **Dreamy Cliffs** — Vertical-heavy platforms with alternating sleepers and critters plus the first Dream Hearts.
3. **Moonlit Arena** — Boss showdown with the Lullaby Warden, bounce critters as assists, and a final gate out of the dream.

## Build

Create an optimized production bundle:
```powershell
npm run build
```
Preview the built assets locally:
```powershell
npm run preview
```
The output lives in `dist/` and can be hosted on any static web server.

## Project Structure

```
.
├─ index.html          # HUD markup and canvas host
├─ src/
│  ├─ Game.ts          # Game orchestrator wiring input, systems, and rendering
│  ├─ entities.ts      # Entity factories and helpers
│  ├─ levels.ts        # Multi-stage layouts, enemies, pickups, collectibles
│  ├─ level1.ts        # Legacy re-export of levels for compatibility
│  ├─ input.ts         # Keyboard state tracking
│  ├─ loop.ts          # Fixed-step game loop helper
│  ├─ sleepPulse.ts    # Sleep pulse lifecycle
│  ├─ hud.ts           # HUD DOM updates
│  ├─ config.ts        # Tunable constants
│  ├─ render/          # Three.js scene graph, meshes, and animations
│  ├─ state/           # Level progression and run tracking
│  └─ systems/         # Physics, enemy, and collectible subsystems
│  └─ main.ts          # Bootstraps the game
├─ vite.config.ts      # Vite configuration
└─ tsconfig.json       # TypeScript compiler options
```

## Notes & Next Steps

- Two moderate `npm audit` advisories are reported by transitive dependencies; review `npm audit` output if shipping to production.
- The MVP omits audio, asset pipelines, and automated tests by design. Future iterations can add polish (animation, easing, additional levels) once the loop is validated.
- Source is now modularized: rendering, state, and gameplay systems live in dedicated folders for easier iteration.
- For convenience, consider wiring a keyboard shortcut to restart or add accessibility options after the MVP is playtested.
