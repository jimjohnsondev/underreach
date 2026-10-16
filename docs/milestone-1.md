# Milestone 1: Engine core

Paste this into Claude Code to start.

---

Read `CLAUDE.md`, then the "Platform, look and controls" and "Build milestones" sections of `docs/design.md`, then `reference/myriapod-800.html` and `art/README.md`.

Build milestone 1, the engine core, and stop there:

1. `index.html` plus a few small JS files (for example `js/main.js`, `js/screen.js`, `js/input.js`, `js/art.js`, `js/world.js`). No framework, no build step.
2. The screen setup copied from the Centipede reference: a 160×192 canvas drawn with wide pixels at 320×192, integer-scaled to device pixels, in the bezel on the dark dot-grid backdrop, with the touch thumbstick and red action button below the screen in portrait and beside it in landscape. Keyboard (arrows/WASD, Space/Enter) and gamepad work too.
3. Load `art/palette.json`, `art/tiles.json`, `art/sprites.json` and `art/font-3x5.json`, and draw from them. Animate water by swapping `water` and `water_2`.
4. A hand-made test map about 60×40 tiles using every tile type, shown as a 20×11-tile view under a one-tile status strip ("HP 26/26  LV 1  12 MK" on the left, the region name on the right, in the 3×5 font).
5. The Wayfarer walks in 8 directions at a steady speed, with the 2-frame walk cycle for down, up and right (mirrored for left). The view scrolls smoothly to follow him.
6. Collision by the feet: water, forest, mountain and marsh block movement; path, bridge, grass, hills and sand don't. Put which tiles block in a small data table, not in code.
7. Standing on a town, ruin, cave or waystone tile and pressing the action button shows a short message in the status strip ("ENTER TOWN?"). Entering comes in milestone 2.
8. A tiny debug overlay toggled with the backquote key: the player's tile position, the current tile, and frames per second.

When it runs, tell me how to start a local server and open it, and list anything you had to assume.
