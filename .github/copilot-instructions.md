# Repository overview

PinkPuffQuest (aka "Pink Puff Quest" / `PinkPuffQuest`) is a small browser game built with TypeScript and Vite. It uses `three` for 3D rendering and vanilla TS modules. The project is intentionally small and educational—features focus on game loop, levels, input, and HUD logic inside `src/`.

Keep instructions short (this file is intentionally concise). These instructions are repository-wide and should help a coding agent or Copilot suggest code that builds and follows local conventions.

## Key facts

- Languages: TypeScript (ES modules), HTML
- Bundler / dev server: Vite (see `package.json` scripts)
- Runtime: modern browsers (development uses `vite` dev server)
- Main entry: `index.html` and `src/main.ts`
- This is a single-package repo (no workspace). Node + npm are used for building.

## Project layout (important files)

- `index.html` — app entry HTML
- `src/main.ts` — app bootstrap
- `src/Game.ts` — main game logic
- `src/loop.ts`, `src/input.ts`, `src/hud.ts` — core systems
- `package.json`, `tsconfig.json`, `vite.config.ts` — build and tooling
- `README.md`, `mvp.md`, `technical.md`, `idea.txt` — project docs and notes

## How to build, run, and validate changes

Use the scripts defined in `package.json`. Always run these in the repository root.

- Install dependencies: `npm install` (run this once after cloning or when dependencies change).
- Start dev server: `npm run dev` (opens Vite dev server; hot reload enabled).
- Build production bundle: `npm run build`.
- Preview production build: `npm run preview`.

Validation guidance for an agent:

- Always run `npm install` before building or running.
- After code changes, run `npx tsc --noEmit` to typecheck TypeScript.
- Then run `npm run build` to ensure the bundling step succeeds.
- If adding runtime code that affects visuals, use `npm run dev` and open the dev server to manually verify behavior.

When making automated changes, prefer small, focused commits and ensure the TypeScript typecheck passes and the build succeeds.

## Coding conventions and preferences

- Project uses TypeScript ES modules and modern syntax.
- Keep functions and files small and focused. Many modules export small helpers or systems.
- Use explicit types where it improves clarity (the repo already uses TS types files).
- Keep DOM and rendering separation: `index.html` loads the bundle; `src` contains game logic.
- Avoid introducing new runtime dependencies without good reason.

## Tests & CI

There are currently no automated tests or CI workflows configured in this repository. The primary validations are TypeScript typechecking and the Vite build.

Recommended local validation steps for changes:

1. `npm install`
2. `npx tsc --noEmit`
3. `npm run build`
4. Sanity-check in browser via `npm run dev` or `npm run preview` as appropriate

## What to avoid

- Do not include secrets, API keys, or environment-specific credentials in code or suggestions.
- Avoid making large, repository-wide refactors in a single PR. Prefer incremental changes.
- Avoid adding heavy dev-dependencies or tools that change the minimal build (unless necessary).

## Useful context for common agent tasks

- If asked to add a new feature, locate `src/` and prefer adding small modules and updating `src/main.ts` or `index.html` only when necessary.
- If asked to fix build/type errors: run `npx tsc --noEmit` locally, resolve type errors, then re-run `npm run build`.
- If asked to adjust visuals or gameplay: run `npm run dev` and inspect the browser console for runtime errors.

## Example prompts for Copilot or coding agents

- "Make a small change to `src/hud.ts` to show the player's score as a 2-digit padded number. Ensure TS types and build pass."
- "Add keyboard support for the 'R' key in `src/input.ts` to reset the current level. Typecheck and build."

## Limitations and guidance for generated content

- Keep generated changes under 2 files per PR for non-trivial changes, and include a brief PR description explaining why the changes are safe.
- When modifying behavior that affects user-visible output, include a manual test step in the PR description describing how to verify the change in the browser.

## Contacts / Maintainers

If available in a PR or issue, reference the repository owner or the person who opened the issue/PR for domain-specific decisions.

---

Tip: If you need path-specific behavior (for example, only for `.ts` files), prefer adding files under `.github/instructions/` with frontmatter `applyTo` globs.
