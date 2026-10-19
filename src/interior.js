// interior.js
// Builds the inside of a location. Until milestone 3 brings hand-shaped templates, every
// location is a single placeholder screen: a walled clearing with a gap in the bottom wall.
// Walking out through the gap goes back to the world map. The look of each kind of location
// (floor, wall, decorations) comes from data/locations.json.
import { makeRandom } from './gen/random.js';

// One screen of play area, in tiles.
const WIDTH = 20;
const HEIGHT = 11;
// The gap in the bottom wall is two tiles wide, in the middle.
const EXIT_LEFT = WIDTH / 2 - 1;
const EXIT_RIGHT = WIDTH / 2;

/**
 * Returns the grid for a location's inside, ready for createWorld(). The decorations are
 * placed with a random generator seeded from the world seed and the location, so a place
 * looks the same every time you go in.
 */
export function buildInterior(location, locationType, worldSeed) {
  const look = locationType.interior;
  const random = makeRandom(`${worldSeed}-${location.id}`);
  const tiles = [];

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      tiles.push(interiorTile(x, y, look, random));
    }
  }

  return {
    width: WIDTH,
    height: HEIGHT,
    tiles,
    // Everything stands on the floor, so a tree's see-through pixels show floor, not black.
    ground: tiles.map(() => look.floor),
    name: location.short || location.label,
    start: { x: EXIT_LEFT, y: HEIGHT - 2 },   // just inside the exit
  };
}

/** Picks the tile for one spot: wall around the edge, the exit gap, or floor with decorations. */
function interiorTile(x, y, look, random) {
  const isExit = y === HEIGHT - 1 && (x === EXIT_LEFT || x === EXIT_RIGHT);
  if (isExit) return 'exit';

  const isEdge = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1;
  if (isEdge) return look.wall;

  // Keep a clear lane up from the exit so you can always walk in.
  const inEntryLane = x >= EXIT_LEFT - 1 && x <= EXIT_RIGHT + 1 && y >= HEIGHT - 4;
  if (!inEntryLane) {
    for (const decor of look.decor || []) {
      if (random.chance(decor.chance)) return decor.tile;
    }
  }
  return look.floor;
}
