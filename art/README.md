# Underreach placeholder art (milestone 1)

Dark, muted placeholder art for the engine core. Everything is plain JSON, so it can be edited by hand and swapped for final art later.

## Files

| File | What it holds |
| --- | --- |
| `palette.json` | The color list. Each color has a one-character key; `.` means transparent. |
| `tiles.json` | 18 world tiles, 8 wide × 16 tall: grass, grass_tufts, wildflowers, tree, forest, water, water_2, path, bridge, mountain, hills, marsh, sand, town, ruin, cave, waystone, void. |
| `sprites.json` | The Wayfarer facing down, up and right (2 walk frames each), a gloom imp (2 frames) and a villager. |
| `font-3x5.json` | The 3×5 font: A–Z, 0–9 and common punctuation. |
| `preview-*.png` | Previews of the tiles, sprites and a sample world screen. |
| `sample-screen-160x192.png` | The sample screen at true 160×192 size, before wide-pixel scaling. |

## How the data works

- A tile or sprite is 16 strings of 8 characters. Each character is a palette key.
- Draw every logical pixel twice as wide as it is tall (Atari 800 wide pixels), on a 160×192 screen.
- `water_2` is the second animation frame of `water`; alternate them every half second or so.
- Left-facing Wayfarer frames are the right-facing frames mirrored.
- Font glyphs are five numbers, one per row. In each number, 4 is the left column, 2 the middle and 1 the right. Characters advance 4 pixels.

## Look

Terrain is dark: deep greens, earth browns and slate blues on black, in the spirit of Seven Cities of Gold and Mail Order Monsters. Characters and places you can enter (town, ruin, cave, waystone) are bright, so what you can interact with stands out at a glance. Keep that rule when adding art: dark for scenery, bright for anything you can talk to, fight or enter.
