// grid.js
// The world while it's being built: a grid of tile names plus which region each tile belongs to.
// Every generator step reads and changes this one object.
//
// Some tiles are things standing on the ground (a tree, a village, a gate) and their pictures
// have see-through pixels. For those, `ground` remembers the tile underneath, which is drawn
// first so the see-through parts show sand, marsh or grass instead of black.

/**
 * Makes an empty world grid. Tiles are stored in one flat list, row by row, so the tile at
 * x, y is at index y * width + x.
 */
export function makeGrid(width, height) {
  const size = width * height;
  return {
    width,
    height,
    tiles: new Array(size).fill('grass'),
    ground: new Array(size).fill(null),   // the tile under each tile, or null if none was recorded
    region: new Uint8Array(size),    // index into the regions list in worldgen.json
    barrier: new Uint8Array(size),   // 1 for tiles in the barrier ring around the center region
    locations: [],
    start: null,
  };
}

/** Puts `tile` on top of whatever is at index i, remembering what was there as its ground. */
export function placeOnTop(grid, i, tile) {
  grid.ground[i] = grid.tiles[i];
  grid.tiles[i] = tile;
}

/** Returns the list index of tile x, y. */
export function indexOf(grid, x, y) {
  return y * grid.width + x;
}

/** True if x, y is on the map. */
export function inBounds(grid, x, y) {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

/** Returns the list indexes of the up to four tiles beside index i (not diagonals). */
export function neighbors(grid, i) {
  const x = i % grid.width, y = (i - x) / grid.width;
  const result = [];
  if (x > 0) result.push(i - 1);
  if (x < grid.width - 1) result.push(i + 1);
  if (y > 0) result.push(i - grid.width);
  if (y < grid.height - 1) result.push(i + grid.width);
  return result;
}
