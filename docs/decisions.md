# Decisions and assumptions

Things the design doc didn't pin down, and what was chosen. Change any of them freely.

## Milestone 1

- **Tiles the brief didn't list.** `tree` and `void` block movement (a tree trunk is solid; void is a hole). `grass_tufts`, `wildflowers` and the four enterable tiles (town, ruin, cave, waystone) are walkable. All of this lives in `data/terrain.json`.
- **Off the map** counts as `void`, so it blocks and draws black.
- **Walk speed** is 3 tiles per second (`data/player.json`). Horizontal pixel speed is half the vertical so movement looks even on wide pixels.
- **Analog sticks** (gamepad, touch thumbstick) are snapped to 8 directions so they feel the same as the keyboard.
- **Diagonal facing.** When moving diagonally the Wayfarer keeps his current facing if it's one of the two directions held; otherwise he faces left/right.
- **Feet box** is 4×3 pixels at the bottom-center of the 8×16 sprite (`js/player.js`). "Standing on" a tile means the center of that box is on it.
- **Action prompts.** The prompt replaces the whole status strip, centered, for about 2.5 seconds or until you step off the tile. The waystone says "TOUCH THE WAYSTONE?" rather than "ENTER". Prompt texts are in `data/terrain.json`.
- **Gamepad action** is button A (index 0) only; Start is left free for the menu later.
- **Test map regions.** The test map uses three named regions (GREENVALE by default, HIGHCAIRN to the north-east, FENMARCH to the south-east) so the region name in the status strip can be seen changing. Starting stats (HP 26/26, LV 1, 12 MK) come from `data/player.json`.
- **Touch controls** keep only the thumbstick and the red button (labeled ACT); the reference's pause and sound buttons were dropped since there's no pause or sound yet.
- **Status strip colors** come from palette keys: `U` for HP/LV, `y` for marks, `N` for the region name, `X` for prompts.

## Dev server

- **Vite as the dev server.** `npm run dev` serves the game on port 5173. The source still runs unbundled from any static server (`python -m http.server`), so building stays optional, in keeping with the "no build step" rule.
- **Building for deploy.** `npm run build` bundles the JS and CSS into `dist/` and copies the JSON from `art/` and `data/` next to it (a plugin in `vite.config.js`), because the game fetches those at runtime and Vite can't see them. They stay as plain JSON in the build, so a deployed copy can still be tweaked by hand. `base: './'` makes all paths relative, so `dist/` works from any folder or subpath. `npm run preview` serves the build on port 4173.
- **Live reload for data.** `vite.config.js` reloads the page when any JSON in `art/` or `data/` changes, since Vite can't see files the game fetches itself.

## Phone layout

- **Phones fill the screen.** The design doc asks for whole-device-pixel scaling, but on a phone that can waste a third of the width (a 412px-wide Android ended up with a 244px screen). On touch devices the bezel, side gutters and name plate are removed and the screen scales to fill the available width (portrait) or the space between the controls (landscape), even at a fractional scale. Desktop keeps the bezel and the crisp whole-pixel scaling. See `layout()` in `js/screen.js` and the `body.touch` rules in `css/style.css`.

## Art tweaks

- **Brighter single trees.** The `tree` tile's leaves used the same dark greens as `forest`, which are almost exactly the grass color, so lone trees disappeared into the map. The tree now has its own colors (palette keys `J`, `K`, `T` for the leaves and `Y` for the trunk): brighter than the grass and forest, still muted next to the Wayfarer and the enterable places. Those were the last four free letters in the palette; new colors can use symbols such as `@` or `%` as keys.
- **Lighter forest.** Forest had the same problem, so its colors (`f`, `F`, `j`, used only by `forest`) were lightened too. The order from dark to bright is now: grass, forest, single trees, then the Wayfarer and enterable places.
