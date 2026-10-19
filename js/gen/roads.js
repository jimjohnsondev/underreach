// roads.js
// Lays the roads. Every place in the center region is linked to the capital, so Greenvale can be
// explored with no gear. A road runs from the capital out to each outer region's main town, and
// where it crosses the barrier ring it becomes a border gate that only the Wayfarer's seal
// opens. Inside each outer region, the main town is linked to the other places that have roads
// (towns, villages, waystones). Ruins, caves, towers and landmarks get no road; reaching them is
// part of exploring. Roads may cut through gated terrain such as cliffs or dark forest: that
// stretch becomes path, so the seal alone lets you travel the roads.
import { indexOf, placeOnTop } from './grid.js';
import { findPath } from './paths.js';

const BRIDGES = ['bridge', 'bridge_v'];

/** Lays all the roads described above. `rules(tile)` gives a tile's rules from terrain.json. */
export function buildRoads(grid, settings, regionInfo, rules) {
  const { centerIndex, outerIndexes } = regionInfo;
  const locationAt = new Map(grid.locations.map(l => [indexOf(grid, l.x, l.y), l]));
  const visible = grid.locations.filter(l => !l.hidden);

  const capital = visible.find(l => l.type === 'capital');
  if (!capital) {
    console.warn('No capital, so no roads');
    return;
  }

  // Tiles that are already part of the center region's road network.
  const centerRoads = new Uint8Array(grid.tiles.length);
  centerRoads[indexOf(grid, capital.x, capital.y)] = 1;

  // No road ever goes through a 'solid' tile such as the sea, and it bridges 'bridgeable' ones.
  const notSolid = i => !rules(grid.tiles[i]).solid;
  const isBridgeable = i => Boolean(rules(grid.tiles[i]).bridgeable);
  const inCenter = i => grid.region[i] === centerIndex && !grid.barrier[i];
  const centerPlaces = visible.filter(l => l.region === centerIndex && l !== capital);
  connectAll(grid, settings, locationAt, isBridgeable, centerPlaces, capital, centerRoads,
    i => inCenter(i) && notSolid(i));

  for (const r of outerIndexes) {
    const places = visible.filter(l => l.region === r && l.road);
    const hub = places.find(l => l.type === 'town') || places[0];
    if (!hub) continue;

    // From the hub out to the capital's network, crossing the barrier ring once. It may pass
    // through a neighboring outer region: their borders are wobbly, so a region can come in pieces.
    const regionRoads = new Uint8Array(grid.tiles.length);
    const route = findPath(grid, indexOf(grid, hub.x, hub.y), i => centerRoads[i] === 1,
      roadCostFunction(grid, settings, locationAt, centerRoads, notSolid));
    if (!route) {
      console.warn(`No road from ${settings.regions[r].name} to the capital`);
      continue;
    }
    carveRoad(grid, route, locationAt, isBridgeable);
    for (const i of route) {
      if (inCenter(i)) centerRoads[i] = 1;
      else regionRoads[i] = 1;
    }

    // Then the rest of the region's roaded places, linked to that road. These roads stay
    // outside the center region and the barrier ring, so the border gate is the only way in.
    const outside = i => !inCenter(i) && !grid.barrier[i] && notSolid(i);
    connectAll(grid, settings, locationAt, isBridgeable, places.filter(l => l !== hub), hub,
      regionRoads, outside);
  }
}

/**
 * Links each of `places` to the road network `network` (a tile mask), nearest to `hub` first,
 * so later roads can join earlier ones. Roads only use tiles where `allowed(i)` is true.
 */
function connectAll(grid, settings, locationAt, isBridgeable, places, hub, network, allowed) {
  const byDistance = [...places].sort((a, b) =>
    Math.hypot(a.x - hub.x, a.y - hub.y) - Math.hypot(b.x - hub.x, b.y - hub.y));
  const costOf = roadCostFunction(grid, settings, locationAt, network, allowed);

  for (const place of byDistance) {
    const route = findPath(grid, indexOf(grid, place.x, place.y), i => network[i] === 1, costOf);
    if (!route) {
      console.warn(`No road to the ${place.label} at ${place.x}, ${place.y}`);
      continue;
    }
    carveRoad(grid, route, locationAt, isBridgeable);
    for (const i of route) network[i] = 1;
  }
}

/**
 * Returns a function giving the cost of putting a road on tile i. Roads avoid other locations'
 * tiles (they can only end on the network) and tiles outside the allowed area.
 */
function roadCostFunction(grid, settings, locationAt, network, allowed) {
  return i => {
    if (network[i]) return settings.roadCost.path;
    if (!allowed(i) || locationAt.has(i)) return Infinity;
    return settings.roadCost[grid.tiles[i]] ?? settings.roadCostDefault;
  };
}

/**
 * Turns a route into road: barrier tiles become border gates (standing on the barrier terrain),
 * bridgeable tiles like water become bridges and everything else becomes path. Location tiles,
 * and road that's already there, are left as they are.
 */
function carveRoad(grid, route, locationAt, isBridgeable) {
  route.forEach((i, step) => {
    const tile = grid.tiles[i];
    if (locationAt.has(i) || tile === 'border_gate' || BRIDGES.includes(tile)) return;
    if (grid.barrier[i]) placeOnTop(grid, i, 'border_gate');
    else if (isBridgeable(i)) grid.tiles[i] = bridgeFor(grid, route, step, isBridgeable);
    else grid.tiles[i] = 'path';
  });
}

/**
 * Picks the bridge for the tile at route[step]: 'bridge_v' if the road crosses it going up and
 * down, 'bridge' if going side to side. If the road turns on the bridge, the river decides:
 * more river to the left or right means it runs sideways, so the road crosses it up and down.
 */
function bridgeFor(grid, route, step, isBridgeable) {
  const here = route[step];
  const isVerticalStep = (a, b) => Math.abs(a - b) === grid.width;
  let verticalSteps = 0;
  if (step > 0 && isVerticalStep(route[step - 1], here)) verticalSteps++;
  if (step < route.length - 1 && isVerticalStep(route[step + 1], here)) verticalSteps++;
  const steps = (step > 0 ? 1 : 0) + (step < route.length - 1 ? 1 : 0);

  if (verticalSteps === steps) return 'bridge_v';
  if (verticalSteps === 0) return 'bridge';
  const x = here % grid.width;
  const riverBeside = (x > 0 && isBridgeable(here - 1))
    || (x < grid.width - 1 && isBridgeable(here + 1));
  return riverBeside ? 'bridge_v' : 'bridge';
}
