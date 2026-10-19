# Milestone 2 art: prompt for Claude Code

Paste this into Claude Code.

---

New tile art for the world map is in `art/milestone-2/`. Read `art/milestone-2/README.md`, then:

1. Replace `art/tiles.json` and `art/palette.json` with the versions in `art/milestone-2/`. Every existing tile name is kept, so nothing else should need renaming.
2. Location icons (capital, house, town, village, ruin, cave, tower, waystone, landmark) and the single `tree` now have transparent backgrounds. When the generator places one of these, keep the ground tile it replaced (for example a per-tile `ground` list next to `tiles`), and draw that ground tile first and the icon on top. Location interiors that use `tree` as decor need the same: draw the floor under it.
3. Use the new `bridge_v` tile where a road crosses water going up and down; keep `bridge` for side to side.
4. Update `art/README.md`'s tile list, note the transparent-icon rule, and copy `art/milestone-2/preview-tiles.png` over `art/preview-tiles.png`.
5. Run it, check a few seeds in each region (debug overlay, N for a new world, M for the whole map), and tell me if any tile looks wrong in place.
