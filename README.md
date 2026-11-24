# Dodge King

A small browser arcade game. You're a king stuck in an arena: dodge whatever flies in, grab coins, and survive as long as you can. It gets faster every 15 seconds and new hazards show up as you level.

## Controls

| Action         | Keyboard          | Touch                 |
| -------------- | ----------------- | --------------------- |
| Move           | WASD / arrow keys | Drag anywhere         |
| Dash           | Shift or Space    | Double-tap            |
| Start / resume | Enter             | Tap                   |
| Pause          | Esc or P          | Pause button          |
| Sound / music  | M / N             | Buttons, bottom right |

## Hazards

- **Arrow** (level 1): flies straight at where you were
- **Boulder** (level 2): bounces off the walls
- **Bat** (level 3): slow, but follows you
- **Laser** (level 4): fires across a full row or column
- **Lava boulder** (level 5): splits in two after a few seconds

A red marker flashes at the edge before anything enters.

## Pickups

- **Coin**: 50 points, with a multiplier (up to x5) for grabbing them quickly in a row
- **Shield**: absorbs one hit
- **Magnet**: pulls nearby coins to you
- **Hourglass**: slows everything but you
- **Bomb**: clears the arena

Narrowly missing a hazard gives a small bonus too.

## Running locally

Requires Node 24.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script             | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `npm run build`    | Type-check and build to `dist/`                        |
| `npm run lint`     | Biome lint + format check (`npm run format` to fix)    |
| `npm test`         | Unit tests (Vitest)                                    |
| `npm run test:e2e` | Browser smoke test against the built game (Playwright) |

## How it's built

TypeScript, Vite, and the Canvas 2D API, with no game engine. Sprites are pixel art defined as strings in code, and all sound and music are generated with the Web Audio API, so there are no asset files.

- `src/game/`: game rules (movement, hazards, pickups, scoring). Pure logic, unit tested.
- `src/render/`: drawing, sprites, particles, and on-screen buttons
- `src/audio/`: sound effects and the music sequencer
- `src/input/`: keyboard and touch input
