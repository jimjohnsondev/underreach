# Milestone 4 art: what can be redrawn

The dialog screen's portraits and backdrops are **placeholders** drawn by Claude, so the game has something to show. Replace any of them whenever you like; the game picks up changes as soon as the files are saved (with `npm run dev` running).

## Portraits: `art/portraits.json`

50 wide × 100 tall, palette keys like the tiles, `.` for see-through (the backdrop shows through). Pixels are twice as wide as tall on screen, so a portrait shows about 100×100: draw faces half as wide as they should look. The art rule applies: people are bright.

One per townsperson role, named to match `data/npcs.json`: `innkeeper`, `merchant`, `healer`, `elder`, `guard`, `villager`, `child`, `farmer`, `noble`, `steward`, `explorer`. Plus `wayfarer`, for the character sheet in milestone 5. A role without a portrait shows the villager's.

## Backdrops: `art/backdrops.json`

160 wide × 124 tall, the top two-thirds of the screen behind the portrait. Keep them dark and muted so the portrait stands out.

| Backdrop | Shown behind people standing on | Placeholder |
| --- | --- | --- |
| `town` | streets, squares, gardens (anything not listed below) | rooftops at dusk over a cobbled street |
| `indoors` | wooden floors (inns, houses, the healer's) | plank wall with a shelf of bottles and a lamp |
| `castle` | the throne room's carpet | stone wall, red banners, a tall window |
| `ruin` | ruin flagstones and moss | dark stone arches |

Add more backdrops by adding them here and mapping a tile to them in `backdrops` in `data/npcs.json`.

The tile editor (`npm run editor`) only edits 8×16 tiles and sprites for now, so portraits and backdrops are edited in the JSON directly, or delivered as a set like the milestone 2 art.
