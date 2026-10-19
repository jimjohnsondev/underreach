// rivers.js
// Draws rivers. Each one starts on high ground in an outer region and winds outward, away from
// the center of the map, until it reaches the sea (or any other 'solid' tile in terrain.json).
// Rivers stay out of the center region and its barrier ring, so Greenvale's own land is never
// cut in two.
import { indexOf, inBounds } from './grid.js';

/** Carves `settings.rivers.count` rivers into the grid. */
export function carveRivers(grid, settings, layers, random, centerIndex, rules) {
  const config = settings.rivers;

  /** True if a river may run through tile index i. */
  const canFlow = i =>
    !rules(grid.tiles[i]).solid && grid.region[i] !== centerIndex && !grid.barrier[i];

  // Possible starting points: high ground the river is allowed on.
  const sources = [];
  grid.tiles.forEach((_, i) => {
    if (canFlow(i) && layers.elevation[i] >= config.sourceElevation) sources.push(i);
  });

  for (let r = 0; r < config.count && sources.length; r++) {
    carveRiver(grid, random.pick(sources), config, random, canFlow);
  }
}

/** Carves one river starting at tile index `start`. */
function carveRiver(grid, start, config, random, canFlow) {
  let x = start % grid.width;
  let y = (start - x) / grid.width;

  // Head away from the map's center, measured in the same stretched units as the regions.
  const startAngle = Math.atan2(
    (y - grid.height / 2) / grid.height,
    (x - grid.width / 2) / grid.width,
  );
  let angle = startAngle;
  let px = x, py = y;   // exact position; x and y are the tile it's in

  for (let step = 0; step < config.maxLength; step++) {
    // Wander a little each step, but never turn back toward the center.
    angle += (random.next() - 0.5) * config.meander;
    angle = Math.max(startAngle - config.maxTurn, Math.min(startAngle + config.maxTurn, angle));
    px += Math.cos(angle);
    py += Math.sin(angle);
    const nx = Math.round(px), ny = Math.round(py);
    if (nx === x && ny === y) continue;

    // Rivers move one tile sideways or one tile up/down at a time, never only diagonally,
    // so there's no gap at a corner that the Wayfarer could slip through.
    if (nx !== x && ny !== y && !setWater(grid, nx, y, config, random, canFlow)) return;
    if (!setWater(grid, nx, ny, config, random, canFlow)) return;
    x = nx;
    y = ny;
  }
}

/**
 * Turns tile x, y into river water (sometimes two tiles wide). Returns false when the river
 * should stop: it has reached the map edge or a tile it can't flow into, such as the sea.
 */
function setWater(grid, x, y, config, random, canFlow) {
  if (!inBounds(grid, x, y)) return false;
  const i = indexOf(grid, x, y);
  if (!canFlow(i)) return false;
  grid.tiles[i] = config.tile;
  if (random.chance(config.wideChance) && inBounds(grid, x + 1, y)) {
    const beside = indexOf(grid, x + 1, y);
    if (canFlow(beside)) grid.tiles[beside] = config.tile;
  }
  return true;
}
