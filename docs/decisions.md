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

## Milestone 2: seeded world map

- **Gated terrain blocks now, with a debug pass.** Rivers and lakes (`water`) and `deep_marsh` need the reed boat, `cliff` the climbing hook, `dark_forest` the glowstone lantern, and `border_gate` the Wayfarer's seal (`gate` in `data/terrain.json`). Nothing hands out gear yet, so the debug overlay's **G** key gives or takes away all of it. `forest`, `mountain`, `tree` and `sea` always block.
- **Marsh is now walkable.** Milestone 1 made `marsh` block. With a separate `deep_marsh` for the boat to open, plain marsh is walkable so Fenmarch isn't one solid wall.
- **Greenvale is fenced in.** A two-tile barrier ring surrounds the center region, made of each neighboring region's gated terrain (deep marsh, cliffs or water). Roads cross it through border gates, so the player leaves Greenvale with the Wayfarer's seal, as in Act 1. With no gear, everything in Greenvale can be reached and nothing outside it can; the generator checks this.
- **Which outer region sits on which side** (north, east, south, west) is chosen by the seed.
- **Roads** link every Greenvale location to the capital, the capital to each outer region's main town, and each town to its region's other towns, villages and waystones. Ruins, caves, towers and landmarks get no road, since finding them is the exploring. Which kinds get roads is the `road` flag in `data/locations.json`.
- **Glass City gets a road.** It's Saltreach's Bearing site but also a city, so like any town it's linked by road. The Monastery, Sunken Chapel and Lighthouse are not.
- **Roads may cross gated terrain.** In the outer regions a road can run through dark forest, cliffs or deep marsh (as a path) and over rivers (as a bridge), so with just the seal you can travel the roads anywhere. Off the road, that terrain still needs gear. Greenvale's roads bridge its lakes the same way. How much a road avoids each tile is `roadCost` in `data/worldgen.json`.
- **Reachability check.** With all gear, every location must be reachable; if mountains or forest wall one in, the generator cuts a path trail through. This is a first version of the design doc's validation pass; the full seed validation is milestone 12.
- **Bearing sites and the Crown.** Each outer region has one Bearing site using an existing icon: Sunken Chapel (ruin) in Fenmarch, Monastery (tower) in Highcairn, Glass City (town) in Saltreach, Lighthouse (tower, by the sea) in Stormcoast. The Hollow Crown site is placed in a random outer region but hidden: no icon, can't be entered.
- **The Cartographer's house** is a required Greenvale location with its own icon.
- **Entering.** Standing on a location shows its prompt in the status strip ("ENTER TOWN?", "TOUCH THE WAYSTONE?"); pressing action goes in. This replaces milestone 1's timed message.
- **Placeholder interiors.** Until milestone 3's templates, every location is one screen: a walled clearing whose look comes from `data/locations.json`, with a gap in the bottom wall. Walking out through the gap returns you to the world map, standing on the location.
- **Seeds.** `?seed=1234` in the address picks the world; any text works too. With no seed, a random six-digit one is picked and written into the address, so reloading keeps the same world. With the debug overlay open, **N** builds a new random world and **M** shows the whole map. Debug keys only work while the overlay is showing.
- **Thresholds are per region.** Elevation and moisture are ranked within each region, so `"moisture": [0.7, 1]` in `data/worldgen.json` always means the wettest 30% of that region.
- **Bridges** use `bridge_v` where a road crosses water going up and down and `bridge` going side to side. Where a road turns on the water, the river decides: water to the left or right means the river runs sideways, so the bridge goes up and down.
- **Ground under see-through tiles.** The generator keeps a `ground` list next to `tiles`: land tiles record their region's base tile, and anything placed on top (a location, a border gate) records the tile it replaced. The game draws the ground first only when the tile on top has see-through pixels. `border_gate` has a few see-through pixels at the top of its arch, so it shows the cliff, marsh or water of the barrier ring behind it. Inside locations, the ground is the floor.
- **The milestone 1 test map was removed.** The generated world uses every tile, and the test map would have needed its own location data.
- **Cliffs come in rows.** The cliff picture is a wall of rock, so a single cliff tile looks like a stray block. Highcairn's cliff feature has `"minRun": 3` in `data/worldgen.json`: any stretch of fewer than three cliff tiles side by side becomes hills. The check runs after rivers and roads, which can cut a band into stubs. The barrier ring is never changed.
- **Coasts come in stretches.** A region's `coast` list is picked from with a smooth `shore` noise layer rather than per tile, so Stormcoast's shore runs as cliff for a while, then beach, instead of flickering between the two.
- **Bridges follow a flag, not a name.** Roads put a bridge on any tile marked `"bridgeable": true` in `data/terrain.json` (only `water` for now) and a plain path everywhere else.
