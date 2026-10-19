// world.js
// Wraps a map (the generated world map, or the inside of a location) and answers questions
// about it: which tile is at a spot, whether the Wayfarer can walk there, which region it's in,
// and which location stands there. What each tile does is in data/terrain.json.

// Size of one tile in game pixels.
export const TILE_W = 8;
export const TILE_H = 16;

// Size of one screen of map, in tiles: what the view below the status strip shows.
export const SCREEN_TILES_W = 20;
export const SCREEN_TILES_H = 11;

// The tile used for anywhere off the edge of the map. It blocks walking, so the Wayfarer can't leave.
const OFF_MAP_TILE = 'void';

/**
 * Makes a world from a grid of tiles. `grid` has width, height, tiles (a flat list of tile names,
 * row by row) and start ({ x, y } in tiles). It can also have ground (the tile under each tile,
 * or null), region (a region number per tile) with regionNames, locations, name (shown as
 * the region name everywhere on the map) and camera ('follow' or 'flip').
 */
export function createWorld(grid, terrain) {
  const { width, height, tiles } = grid;
  const ground = grid.ground || [];
  const locations = grid.locations || [];
  const visibleAt = new Map(
    locations.filter(l => !l.hidden).map(l => [l.y * width + l.x, l]),
  );

  /** Returns the name of the tile at tile position tx, ty, such as 'grass'. */
  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return OFF_MAP_TILE;
    return tiles[ty * width + tx];
  }

  /**
   * Returns the tile under the one at tx, ty (e.g. the sand under a village), or null if there
   * isn't one recorded. It's drawn first wherever the tile on top has see-through pixels.
   */
  function groundAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return null;
    return ground[ty * width + tx] || null;
  }

  /** Returns the terrain rules for a tile name. A tile missing from terrain.json is treated as solid. */
  function tileRules(name) {
    return terrain.tiles[name] || { blocks: true };
  }

  /**
   * True if the tile at tx, ty stops the Wayfarer. Gated tiles (like cliffs) only stop him if
   * `gear` doesn't include what opens them.
   */
  function blocks(tx, ty, gear) {
    const rules = tileRules(tileAt(tx, ty));
    if (rules.blocks) return true;
    return Boolean(rules.gate) && !(gear && gear.has(rules.gate));
  }

  /** Returns the name of the region that contains tile tx, ty. */
  function regionAt(tx, ty) {
    if (grid.name) return grid.name;
    if (!grid.region || tx < 0 || ty < 0 || tx >= width || ty >= height) return '';
    return grid.regionNames[grid.region[ty * width + tx]];
  }

  /** Returns the location shown at tile tx, ty, or null if there isn't one. */
  function locationAt(tx, ty) {
    return visibleAt.get(ty * width + tx) || null;
  }

  return {
    width,                      // in tiles
    height,
    pixelWidth: width * TILE_W, // in game pixels
    pixelHeight: height * TILE_H,
    start: grid.start,          // starting tile position, { x, y }
    seed: grid.seed,
    // 'follow' scrolls smoothly with the Wayfarer, which every map does now; 'flip' jumps a whole
    // screen at a time when he walks off the edge, Atari-style, if a location's template asks.
    camera: grid.camera || 'follow',
    locations,
    tileAt,
    groundAt,
    tileRules,
    blocks,
    regionAt,
    locationAt,
  };
}
