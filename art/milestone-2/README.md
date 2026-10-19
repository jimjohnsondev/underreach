# Milestone 2 tile art

Replacement `tiles.json` and `palette.json` for the seeded world map. They are drop-in: every existing tile name is kept.

## What changed

- **Redrawn terrain:** mountain (one peak per tile, so ranges read as rows of peaks), cliff (striated rock face), dark_forest, sea and sea_2, marsh (no more grid look), deep_marsh, salt (irregular crust cracks) and border_gate (stone arch with a closed door and the gold guild seal).
- **Redrawn location icons:** capital (twin towers and red banners), house (blue roof, for the Cartographer), village (two thatched huts), tower (with a lamp at the top, so it also works as the lighthouse) and landmark (a dolmen).
- **New tile:** `bridge_v`, a bridge for roads that cross a river going up and down.
- **Transparent icons:** every location icon (capital, house, town, village, ruin, cave, tower, waystone, landmark) and the single `tree` now have a transparent background (`.`), so they sit on sand, salt or marsh instead of a grass square.
- **Palette:** 14 new colors, keyed with free symbols (`< > # : ; ! ( ) / [ ] | { }`). No existing color changed.

The art rule still holds: scenery dark and muted, places you can enter bright.

## Code changes the art needs

Ask Claude Code to make these (the prompt is in `docs/milestone-2-art.md`):

1. When a location or a tree is placed, remember the ground tile it replaced, and draw that ground first, then the icon on top. Transparent pixels would otherwise show black.
2. Use `bridge_v` where a road crosses water going up and down, and `bridge` where it crosses side to side.
