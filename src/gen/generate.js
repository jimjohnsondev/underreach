// generate.js
// Builds a whole world from a seed, following the steps in the design doc:
//   1. regions and terrain, 2. required locations, 3. the other locations, then roads.
// Names, people and rumors (step 4) come in later milestones. Finally it checks the world can
// be played: everything must be reachable with all the gear, and all of Greenvale with none.
import { makeGrid, indexOf, neighbors } from './grid.js';
import { makeRandom, makeNoiseLayer, percentilesByGroup, seedToNumber } from './random.js';
import { assignRegions } from './regions.js';
import { paintTerrain, removeShortRuns } from './terrain.js';
import { carveRivers } from './rivers.js';
import { placeLocations } from './locations.js';
import { buildRoads } from './roads.js';
import { findPath } from './paths.js';

/**
 * Generates a world. `data` holds the loaded data files: worldgen settings, location types and
 * terrain rules. Returns the finished grid with its locations and starting point.
 */
export function generateWorld(seed, data) {
  const { worldgen: settings, locationTypes, terrain } = data;
  const seedNumber = seedToNumber(seed);
  const random = makeRandom(seedNumber);
  const grid = makeGrid(settings.width, settings.height);

  // Each noise layer gets its own seed so they don't look alike.
  const layers = {};
  Object.entries(settings.noise).forEach(([name, config], n) => {
    layers[name] = makeNoiseLayer(grid.width, grid.height, config, seedNumber + (n + 1) * 7919);
  });

  const rules = name => terrain.tiles[name] || { blocks: true };
  const isOpenGround = name => !rules(name).blocks && !rules(name).gate;
  checkBarrierTiles(settings, rules);

  const regionInfo = assignRegions(grid, settings, layers, random);

  // Re-rank the land layers within each region, so a feature's range always means the same
  // share of its own region, e.g. "moisture": [0.7, 1] is the wettest 30% of Fenmarch.
  for (const name of ['elevation', 'moisture']) {
    layers[name] = percentilesByGroup(layers[name], grid.region);
  }

  paintTerrain(grid, settings, layers, random);
  carveRivers(grid, settings, layers, random, regionInfo.centerIndex, rules);
  placeLocations(grid, settings, locationTypes, random, isOpenGround, regionInfo);
  buildRoads(grid, settings, regionInfo, rules);
  removeShortRuns(grid, settings);
  grid.start = chooseStart(grid);
  cutTrails(grid, settings, rules);
  checkReachable(grid, rules, regionInfo);

  grid.seed = seedNumber;
  grid.regionNames = settings.regions.map(r => r.name);
  return grid;
}

/** The Wayfarer starts just below the capital, which is where Act 1 begins. */
function chooseStart(grid) {
  const capital = grid.locations.find(l => l.type === 'capital');
  if (capital) return { x: capital.x, y: capital.y + 1 };
  return { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
}

/**
 * Warns if a region's barrier tile isn't gated. The barrier ring must open only with gear: a
 * walkable barrier lets the player straight out of Greenvale, and a plain blocking one (like
 * mountain) could get a trail cut through it.
 */
function checkBarrierTiles(settings, rules) {
  for (const region of settings.regions) {
    if (region.barrier && !rules(region.barrier).gate) {
      console.warn(`${region.name}'s barrier tile "${region.barrier}" has no gate in terrain.json`);
    }
  }
}

/**
 * Makes sure every location can be reached once the player has all the gear. Mountains,
 * forests and trees block even then, so a place can end up walled in. For each one that is,
 * cut the cheapest trail through to somewhere reachable.
 */
function cutTrails(grid, settings, rules) {
  const withAllGear = name => !rules(name).blocks;
  const locationTiles = new Set(grid.locations.map(l => indexOf(grid, l.x, l.y)));
  const cost = settings.trailCost;
  const trailCost = i => {
    const tile = grid.tiles[i];
    if (rules(tile).solid || locationTiles.has(i)) return Infinity;
    if (rules(tile).blocks) return cost.blocked;
    return rules(tile).gate ? cost.gated : cost.walkable;
  };

  // Work out what's reachable once, and again only after a trail changes the map.
  let reached = reachableFrom(grid, grid.start, withAllGear);
  for (const location of grid.locations) {
    const at = indexOf(grid, location.x, location.y);
    if (reached[at]) continue;

    const route = findPath(grid, at, i => reached[i] === 1, trailCost);
    if (!route) {
      console.warn(`The ${location.label} at ${location.x}, ${location.y} can't be reached`);
      continue;
    }
    // Only cut through what blocks; gated tiles stay gated.
    for (const i of route) {
      if (!locationTiles.has(i) && rules(grid.tiles[i]).blocks) grid.tiles[i] = 'path';
    }
    reached = reachableFrom(grid, grid.start, withAllGear);
  }
}

/**
 * Checks Greenvale is sealed the way Act 1 needs: with no gear, every Greenvale location can be
 * reached and no tile outside Greenvale can. Logs a warning for anything that's wrong.
 */
function checkReachable(grid, rules, regionInfo) {
  const noGear = name => !rules(name).blocks && !rules(name).gate;
  const reached = reachableFrom(grid, grid.start, noGear);

  for (const location of grid.locations) {
    if (location.region !== regionInfo.centerIndex) continue;
    if (!reached[indexOf(grid, location.x, location.y)]) {
      console.warn(`The ${location.label} in the center region needs gear to reach`);
    }
  }

  let escaped = 0;
  reached.forEach((isReached, i) => {
    if (isReached && grid.region[i] !== regionInfo.centerIndex) escaped++;
  });
  if (escaped) console.warn(`${escaped} tiles outside the center region can be reached with no gear`);
}

/**
 * Returns a mask of every tile that can be walked to from `start` ({ x, y }), stepping only
 * onto tiles where `canWalk(tileName)` is true.
 */
export function reachableFrom(grid, start, canWalk) {
  const reached = new Uint8Array(grid.tiles.length);
  const first = indexOf(grid, start.x, start.y);
  const queue = [first];
  reached[first] = 1;
  while (queue.length) {
    const current = queue.pop();
    for (const next of neighbors(grid, current)) {
      if (!reached[next] && canWalk(grid.tiles[next])) {
        reached[next] = 1;
        queue.push(next);
      }
    }
  }
  return reached;
}
