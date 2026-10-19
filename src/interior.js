// interior.js
// Builds the inside of a location. Kinds of location with "templates" in data/locations.json
// (towns, the capital, ruins) are built from one of those hand-drawn maps in data/templates/.
// The rest are still a single placeholder screen: a walled clearing with a gap in the bottom
// wall, whose floor, wall and decorations come from data/locations.json.
// Either way, walking onto an exit tile goes back to the world map.
import { makeRandom } from './gen/random.js';
import { buildFromTemplate } from './gen/template.js';
import { SCREEN_TILES_W, SCREEN_TILES_H } from './world.js';

// The placeholder is exactly one screen.
const WIDTH = SCREEN_TILES_W;
const HEIGHT = SCREEN_TILES_H;
// The gap in the bottom wall is two tiles wide, in the middle.
const EXIT_LEFT = WIDTH / 2 - 1;
const EXIT_RIGHT = WIDTH / 2;

/**
 * Returns the grid for a location's inside, ready for createWorld(), with the townspeople's spots
 * in `npcs`. Random choices are seeded from the world seed and the location, so a place looks the
 * same every time you go in. `templates` holds the loaded templates by name; `rules(tile)` gives
 * a tile's rules from terrain.json.
 */
export function buildInterior(location, locationType, worldSeed, templates, rules) {
  const seed = `${worldSeed}-${location.id}`;
  const name = location.short || location.label;

  if (locationType.templates && locationType.templates.length) {
    const choice = makeRandom(seed).pick(locationType.templates);
    const grid = buildFromTemplate(templates[choice], rules, seed);
    return { ...grid, name };
  }
  return buildPlaceholder(locationType.interior, seed, name);
}

/** Builds the one-screen placeholder used by kinds of location that have no template yet. */
function buildPlaceholder(look, seed, name) {
  const random = makeRandom(seed);
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
    name,
    start: { x: EXIT_LEFT, y: HEIGHT - 2 },   // just inside the exit
    npcs: [],
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
