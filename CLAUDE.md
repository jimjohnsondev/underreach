# Underreach

A personal, real-time, top-down 8-bit RPG for the browser in the style of Atari 800 games (Seven Cities of Gold, Mail Order Monsters, Ultima). It is mostly about exploring and talking, with light combat. It is not for release; it is built to be tinkered with.

## Where things are

- `docs/design.md`: the full game design document. It is the source of truth for how the game should work. Read the sections relevant to the current task before building.
- `docs/milestone-1.md`: the first build task.
- `reference/myriapod-800.html`: a finished Atari-style Centipede game. Copy its screen setup: 160×192 canvas with wide pixels (drawn at 320×192), integer scaling snapped to device pixels, the bezel, the dark dot-grid backdrop with the faded rainbow band, the 3×5 font, keyboard/gamepad input, and the touch thumbstick and fire button. Reuse its approach; don't reinvent it.
- `art/`: placeholder art as JSON (palette, 8×16 tiles, 8×16 sprites, 3×5 font). `art/README.md` explains the format. Load art from these files rather than hard-coding pixels in the engine.
- `src/`: the game's code and stylesheet, loaded by `index.html` at the project root. The world generator is in `src/gen/`.
- `data/`: content and tuning numbers (terrain rules, world generation, locations, gear, player stats) as JSON.
- `tools/`: helpers outside the game. `npm run editor` starts the tile and sprite editor; `tools/README.md` explains it.

## How to work

- Plain, human-readable JavaScript with an HTML canvas. No framework and no build step; the game should run by opening `index.html` from a simple local web server.
- Keep content and numbers in data files (`art/`, and later `data/`), separate from engine code, so they can be edited by hand.
- Build one milestone at a time, as listed in the design doc. Stop at the end of each milestone so it can be played before moving on.
- Keep files small and well named. Comment the "why", not the "what".
- Art rule: scenery is dark and muted; characters and anything you can enter, talk to or fight are bright.
- If the design doc is unclear or contradicts itself, ask rather than guess. If you make an assumption, note it in `docs/decisions.md`.
