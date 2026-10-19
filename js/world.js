// world.js
// Loads a tile map and answers questions about it: which tile is at a spot, whether the
// Wayfarer can walk there, and which region it belongs to.
//
// Maps live in data/maps/ as rows of characters, one character per tile, with a legend that says
// which tile each character stands for. What each tile does (blocks walking, shows a prompt)
// is in data/terrain.json.
import { loadJSON } from './art.js';

// Size of one tile in game pixels.
export const TILE_W = 8;
export const TILE_H = 16;

// The tile used for anywhere off the edge of the map. It blocks walking, so the Wayfarer can't leave.
const OFF_MAP_TILE = 'void';

/**
 * Loads the map at `mapUrl` along with the terrain rules, and returns a world object with
 * the map's size, start position and functions for looking things up.
 */
export async function loadWorld(mapUrl) {
  const [map, terrain] = await Promise.all([loadJSON(mapUrl), loadJSON('data/terrain.json')]);
  const rows = map.rows;
  const width = rows[0].length;
  const height = rows.length;

  rows.forEach((row, i) => {
    if (row.length !== width) console.warn(`Map row ${i} is ${row.length} tiles wide, expected ${width}`);
  });

  /** Returns the name of the tile at tile position tx, ty, such as 'grass'. */
  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return OFF_MAP_TILE;
    return map.legend[rows[ty][tx]] || OFF_MAP_TILE;
  }

  /** Returns the terrain rules for a tile name. A tile missing from terrain.json is treated as solid. */
  function tileRules(name) {
    return terrain.tiles[name] || { blocks: true };
  }

  /** True if the tile at tx, ty stops the Wayfarer's feet. */
  function blocks(tx, ty) {
    return tileRules(tileAt(tx, ty)).blocks;
  }

  /** Returns the name of the region that contains tile tx, ty. The first matching region wins. */
  function regionAt(tx, ty) {
    for (const r of map.regions || []) {
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r.name;
    }
    return map.defaultRegion || '';
  }

  return {
    width,                      // in tiles
    height,
    pixelWidth: width * TILE_W, // in game pixels
    pixelHeight: height * TILE_H,
    start: map.start,           // starting tile position, { x, y }
    tileAt,
    tileRules,
    blocks,
    regionAt,
  };
}
