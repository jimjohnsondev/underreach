// locations.js
// Places the locations (towns, villages, ruins, caves...) on the world map. Following the
// design doc, required places go first: the capital, the Cartographer's house, each region's
// Bearing site and a waystone per region. Then the hidden Hollow Crown site, then the rest.
// How hard to look for a spot is set by 'placement' in data/worldgen.json.
import { indexOf, inBounds, placeOnTop } from './grid.js';

/**
 * Places every location and adds it to grid.locations. Each location's icon is drawn into the
 * grid, except hidden ones, which keep the ground they stand on.
 * `isOpenGround(tile)` says whether a tile can be walked on with no gear.
 */
export function placeLocations(grid, settings, locationTypes, random, isOpenGround, regionInfo) {
  const place = (request, regionIndex) =>
    placeOne(grid, settings, locationTypes, random, isOpenGround, request, regionIndex);

  // Required places, center region first.
  const order = [regionInfo.centerIndex, ...regionInfo.outerIndexes];
  for (const r of order) {
    for (const request of settings.regions[r].required) place(request, r);
  }

  // The Hollow Crown goes in a random outer region.
  place(settings.crown, random.pick(regionInfo.outerIndexes));

  // Everything else.
  for (const r of order) {
    for (const [type, count] of Object.entries(settings.regions[r].filler)) {
      for (let n = 0; n < count; n++) place({ type }, r);
    }
  }
}

/** Finds a spot for one location in a region and records it. Logs a warning if there's no room. */
function placeOne(grid, settings, locationTypes, random, isOpenGround, request, regionIndex) {
  const type = locationTypes[request.type];
  if (!type) {
    console.warn(`Unknown location type "${request.type}"`);
    return;
  }
  const spot = request.nearCenter
    ? findSpotNearCenter(grid, settings, isOpenGround, regionIndex)
    : findSpot(grid, settings, isOpenGround, random, regionIndex, request.near || type.near);
  if (!spot) {
    console.warn(`No room for a ${request.type} in ${settings.regions[regionIndex].name}`);
    return;
  }

  const location = {
    id: grid.locations.length,
    type: request.type,
    label: request.label || type.label,
    kindLabel: type.label,                 // what kind of place it is, e.g. "RUIN"
    fixedLabel: Boolean(request.label),    // true if worldgen.json names it; otherwise it gets a generated name
    short: request.short || null,
    x: spot.x,
    y: spot.y,
    region: regionIndex,
    road: Boolean(type.road),
    bearing: Boolean(request.bearing),
    hidden: Boolean(request.hidden),
  };
  grid.locations.push(location);
  if (!location.hidden) placeOnTop(grid, indexOf(grid, spot.x, spot.y), type.icon);
}

/**
 * Tries random spots in a region until one fits. Prefers spots near the `near` tile if given,
 * but stops insisting after placement.nearTries attempts.
 */
function findSpot(grid, settings, isOpenGround, random, regionIndex, near) {
  const { tries, nearTries, nearDistance } = settings.placement;
  for (let attempt = 0; attempt < tries; attempt++) {
    const x = random.int(grid.width);
    const y = random.int(grid.height);
    if (!fits(grid, settings, isOpenGround, x, y, regionIndex)) continue;
    if (near && attempt < nearTries && !isNear(grid, x, y, near, nearDistance)) continue;
    return { x, y };
  }
  return null;
}

/** Finds the spot that fits closest to the middle of the map. Used for the capital. */
function findSpotNearCenter(grid, settings, isOpenGround, regionIndex) {
  const cx = Math.floor(grid.width / 2), cy = Math.floor(grid.height / 2);
  let best = null, bestDistance = Infinity;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < bestDistance && fits(grid, settings, isOpenGround, x, y, regionIndex)) {
        best = { x, y };
        bestDistance = distance;
      }
    }
  }
  return best;
}

/**
 * True if a location can go at x, y: open ground in the right region, with room to walk around
 * it, not too close to the barrier ring, and not too close to another location.
 */
function fits(grid, settings, isOpenGround, x, y, regionIndex) {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return false;
  const i = indexOf(grid, x, y);
  if (grid.region[i] !== regionIndex || grid.barrier[i] || !isOpenGround(grid.tiles[i])) return false;

  // The tile below must be open too, so there's somewhere to stand when walking up to it.
  if (!isOpenGround(grid.tiles[indexOf(grid, x, y + 1)])) return false;

  const margin = settings.spacing.fromBarrier;
  for (let ny = y - margin; ny <= y + margin; ny++) {
    for (let nx = x - margin; nx <= x + margin; nx++) {
      if (inBounds(grid, nx, ny) && grid.barrier[indexOf(grid, nx, ny)]) return false;
    }
  }

  const minimum = settings.spacing.locations;
  return grid.locations.every(other => Math.hypot(other.x - x, other.y - y) >= minimum);
}

/** True if a tile named `near` is within `distance` tiles of x, y. */
function isNear(grid, x, y, near, distance) {
  for (let ny = y - distance; ny <= y + distance; ny++) {
    for (let nx = x - distance; nx <= x + distance; nx++) {
      if (inBounds(grid, nx, ny) && grid.tiles[indexOf(grid, nx, ny)] === near) return true;
    }
  }
  return false;
}
