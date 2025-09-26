# Pink Puff Quest – Ultra-Minimal MVP

Purpose: Produce a playable proof‑of‑concept focusing on the Sleep -> Traverse loop with the smallest possible feature set. This slice is for validating core feel (movement + sleep interaction) and kid‑friendly tone WITHOUT needing art, music, or content scale.

---
## 1. High-Level Goal
Deliver a single, short side‑scrolling level (~60–90 seconds first‑try length) where the player:
1. Moves and jumps across basic platforms.
2. Uses a Sleep ability to temporarily pacify two enemy types to turn them into traversal aids.
3. Reaches an end gate.

No audio. No custom art. All visuals are geometric placeholder sprites (e.g., pastel rectangles / circles). Focus on readable interaction feedback.

---
## 2. In-Scope Features
- One level ("Prototype Meadow") with start, midpoint checkpoint, and end gate.
- Player core: Move (left/right), Jump (single), Sleep Pulse (primary ability), optional short coyote time (<=0.1s) for forgiveness.
- Two enemy archetypes (placeholder geometry):
  1. Sleeper Platform (from original "Tumble Shroom" concept): Patrols horizontally. When slept: freezes and becomes a solid standable block until it wakes.
  2. Bounce Critter (from "Flutter Bat" / trampoline hybrid): Slowly oscillates vertically. When slept: becomes a springy surface granting a fixed higher jump.
- Sleep State: Applies to enemies in small circular radius. Duration fixed (e.g., 4 seconds). Cooldown on ability (e.g., 1.5 seconds) to encourage timing.
- Collectibles: Optional single type: "Notes" (5 scattered). Purely for engagement; no meta progression.
- Health / Failure: Drowsiness pips = 3. Taking enemy contact while they are awake reduces 1 pip and grants brief invulnerability (1s). On 0: respawn at last checkpoint (no lives, no game over screen).
- Checkpoints: Start counts as implicit checkpoint + one pillow midway (touch to set respawn, simple color flash).
- HUD: Drowsiness pips (3 icons), Sleep ability ready indicator (fills when off cooldown), Notes collected X/5.
- End Gate: Touch -> simple "Level Complete" overlay with stats (time, notes collected).

---
## 3. Out of Scope (Deferred)
- Music / sound effects.
- Multiple worlds / additional levels.
- Float / mid‑air hop / advanced movement.
- Additional enemy types (lift, deflate, armored, mini-boss).
- Assist options, speed adjustments.
- Galleries, progression, shard systems.
- Pause menu beyond basic restart / quit.
- Accessibility toggles (can be planned later once input scheme stable).

---
## 4. Player Ability Details
| Ability | Input | Effect | Notes |
|---------|-------|--------|-------|
| Move | Left/Right | Horizontal velocity with simple acceleration | Friction tuned for quick responsiveness. |
| Jump | Button A / Space | Single jump with fixed apex | No variable jump height (simplify). |
| Sleep Pulse | Button B / Shift | Emit short-range circle instantly (no charge) | If hits enemy: apply Sleep state; start cooldown. |

Sleep Cooldown: 1.5s (visual: ability icon gray -> pastel filled).  
Sleep Duration: 4.0s (enemy tint changes while asleep).  
Wake Telegraph: Enemies flash (e.g., alternate tint) during last 0.5s.

---
## 5. Enemy Simplifications
### Sleeper Platform
- Awake Behavior: Moves back and forth between two invisible patrol nodes.
- Collision: Damages player on contact (side / top) while awake.
- Asleep Behavior: Stops; becomes passable? (Decision: becomes solid standable safe platform, no damage.).
- Wake: Resumes patrol.

### Bounce Critter
- Awake Behavior: Slow vertical bobbing (sine motion). Contact damages player unless landing on top (optional early forgiveness rule: treat any contact as damage unless asleep to keep logic simple).
- Asleep Behavior: Stationary (or slight squish) + acts as spring: on player landing, applies upward velocity (predefined). Does NOT deal damage.
- Wake: Resumes bobbing; loses bounce property.

Optional simplification: Ignore directional stomp detection in MVP; only asleep grants traversal utility.

---
## 6. Level Composition Draft
Sections (linear):
1. Safe Start: Flat ground + one Note.
2. First Introduction: Single Sleeper Platform required to cross small gap (must Sleep it first or take damage / fail jump).
3. Vertical Assist: Bounce Critter lets player reach higher ledge with 2 Notes.
4. Mixed Timing: Sleeper Platform followed by Bounce Critter placed so mistimed Sleep leads to waiting briefly.
5. Final Stretch: Mild gap + final Note + end gate.

Checkpoint at start of Section 3.

---
## 7. Visual & Feedback (Placeholder)
- Player: Rounded rectangle (pink pastel), jump = slight squash & stretch.
- Enemies: Distinct shapes/colors:
  - Sleeper Platform: Horizontal capsule (lavender). Asleep tint: desaturated + Z icons above (simple floating Z sprite or text "Z").
  - Bounce Critter: Circle (mint). Asleep: slightly flattened + pastel highlight ring.
- Sleep Pulse: Expanding translucent circle (1 frame spawn -> tween to radius then fade). Color: soft blue.
- Damage Feedback: Player briefly outlines in red for 0.3s.
- HUD: Simple anchored top-left: [♥ ♥ ♥] textual hearts or pill icons; Sleep icon (musical note outline fill); Notes counter (♪ x 0/5).

---
## 8. Technical Implementation (Engine-Agnostic Outline)
Data Structures:
- Entity Base: position, velocity, state.
- Player: inherits Entity; states: Normal, Invulnerable.
- Enemy: type (SleeperPlatform | BounceCritter), state (Awake | Asleep), sleepTimer.
- Collectible: position, collected flag.
- Checkpoint: position, activated flag.

Core Systems:
- Input Handling -> Player movement & ability trigger.
- Physics (AABB or simple bounding boxes) -> ground check & collision resolution.
- Sleep System -> When pulse fired, test overlap with enemy bounds, set state Asleep & timer.
- Cooldown System -> Tracks ability ready state.
- Damage System -> On overlap with awake enemy; if not invulnerable, reduce pip, set respawn if death.
- HUD Renderer.

Simplifications:
- No slopes, only axis-aligned platforms.
- Fixed timestep update loop.
- Minimal camera: follows player with clamp to level bounds.

---
## 9. Tuning Defaults (Initial Values)
- Player Move Speed: 4 units/sec.
- Jump Velocity: 9 units/sec upward (gravity tuned so max height ~3 tiles).
- Gravity: 20 units/sec^2.
- Sleep Radius: 3 tiles.
- Sleep Duration: 4.0s.
- Sleep Cooldown: 1.5s.
- Bounce Critter Spring Velocity: 11 units/sec upward.
- Invulnerability After Hit: 1.0s.

(Adjust after first playtest for clarity & pacing.)

---
## 10. Acceptance Criteria
Playable build where:
- Player can finish level in < 2 minutes casually.
- Both enemy types clearly change behavior/appearance when asleep.
- Sleep timing matters at least twice (must wait if mistimed or risk damage).
- No hard lock / soft lock scenarios.
- Respawn is under 2 seconds including fade.
- Frame rate stable (placeholder target 60 FPS) with placeholder art.

---
## 11. Basic Test Plan
Manual Checklist:
1. Can move, jump, and land reliably on platforms.
2. Sleep Pulse only works when off cooldown; icon reflects readiness.
3. Enemies revert correctly after duration; wake flash visible.
4. Taking 3 hits respawns at last activated checkpoint with full pips.
5. Collectibles increment counter; reloading level resets them.
6. Level Complete screen shows correct Note tally.
7. No out-of-bounds infinite fall (death plane respawns player).

---
## 12. Stretch (Nice-to-Haves If Time Allows)
- Simple fade-in/out on respawn.
- Variable jump height (hold to jump slightly higher).
- Early stomp forgiveness on Bounce Critter (if approaching from above while awake, convert to no damage).

---
## 13. Development Phases
1. Skeleton: Player movement & camera.
2. Platforms + collision + checkpoint logic.
3. Enemy archetype #1 (Sleeper Platform) + Sleep Pulse.
4. Enemy archetype #2 (Bounce Critter) + bounce interaction.
5. Collectibles + HUD.
6. Damage/health + respawn cycle.
7. Level assembly & tuning.
8. Polish: wake telegraph, feedback visuals, acceptance pass.

---
## 14. Risks (MVP-Specific)
- Sleep unreadable without audio: Mitigate with clear color/tint + Z glyph + icon flashing.
- Timing frustration: Keep cooldown modest; allow reattempt quickly.
- Player misreads bounce height: Add consistent spring velocity & tiny particle puff.

---
## 15. Post-MVP Next Step Preview
After validation: consider adding float ability, additional enemy behaviors (lift/deflate), assist toggles, and music layering.

---
This MVP spec intentionally narrows scope to prove the Sleep-as-traversal core loop before investing in audiovisual identity or content breadth.
