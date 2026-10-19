# Underreach placeholder art

Dark, muted placeholder art for the engine core. Everything is plain JSON, so it can be edited by hand and swapped for final art later.

## Files

| File | What it holds |
| --- | --- |
| `palette.json` | The color list. Each color has a one-character key; `.` means transparent. |
| `tiles.json` | 31 world tiles, 8 wide × 16 tall. Terrain: grass, grass_tufts, wildflowers, tree, forest, dark_forest, water, water_2, sea, sea_2, path, bridge (crossing side to side), bridge_v (crossing up and down), border_gate, mountain, cliff, hills, marsh, deep_marsh, sand, salt, void. Location icons: capital, house, town, village, ruin, cave, tower (also used for the lighthouse), waystone, landmark. Milestone 2 redrew the new terrain and icons and added `bridge_v`. |
| `sprites.json` | The Wayfarer facing down, up and right (2 walk frames each), a gloom imp (2 frames) and a villager. |
| `font-3x5.json` | The 3×5 font: A–Z, 0–9 and common punctuation. |
| `preview-*.png` | Previews of the tiles, sprites and a sample world screen. |
| `sample-screen-160x192.png` | The sample screen at true 160×192 size, before wide-pixel scaling. |

## How the data works

- A tile or sprite is 16 strings of 8 characters. Each character is a palette key.
- Draw every logical pixel twice as wide as it is tall (Atari 800 wide pixels), on a 160×192 screen.
- A tile named like `water_2` or `sea_2` is the second animation frame of `water` or `sea`; the game alternates them every half second.
- **Things that stand on the ground have transparent backgrounds.** Every location icon, the single `tree` and `border_gate` use `.` around the drawing. The game draws the ground underneath first (the sand, marsh or grass the generator placed them on, or a location's floor), so they fit any region. Draw new icons the same way; don't paint a background square.
- Left-facing Wayfarer frames are the right-facing frames mirrored.
- Font glyphs are five numbers, one per row. In each number, 4 is the left column, 2 the middle and 1 the right. Characters advance 4 pixels.

## Look

Terrain is dark: deep greens, earth browns and slate blues on black, in the spirit of Seven Cities of Gold and Mail Order Monsters. Characters and places you can enter (the location icons) are bright, so what you can interact with stands out at a glance. Keep that rule when adding art: dark for scenery, bright for anything you can talk to, fight or enter.
