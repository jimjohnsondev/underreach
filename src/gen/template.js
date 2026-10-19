// template.js
// Builds a location map (a town, a ruin...) from a hand-drawn template in data/templates/.
// The template is a picture made of characters, one per tile, and a legend saying what each
// character means. The legend can leave things to chance (which decoration goes here, whether a
// market stall is set up, whether a villager is out), so every town built from the same template
// feels designed but varies from seed to seed, as the design doc asks.
//
// Legend entries can be:
//   "cobbles"                                   a tile
//   { "tile": "tree", "ground": "grass" }       a tile, with the ground shown under its see-through pixels
//   { "choose": { "grass": 6, "moss": 1 } }     one of several tiles, by weight (6 times as likely here)
//   { "tile": "cobbles", "start": true }        where the Wayfarer appears when he walks in
//   { "tile": "floor", "npc": "innkeeper" }     where a townsperson stands
//   { ..., "wander": 3, "chance": 0.7 }         ...who walks up to 3 tiles from there, and is there 70% of the time
//
// Townspeople block the way, but the reachability check below treats them as walkable. So don't
// put someone who stands still in a one-tile doorway or corridor: they'd block it for good.
//
// The view scrolls with the Wayfarer. A template can set "camera": "flip" to jump a whole screen
// at a time instead, Atari-style.
import { makeRandom } from './random.js';
import { reachableFrom } from './generate.js';
import { SCREEN_TILES_W, SCREEN_TILES_H } from '../world.js';

// How many times to re-roll the random parts if a roll leaves someone or the exit unreachable.
const MAX_TRIES = 20;

/**
 * Builds a location map from a template. `rules(tile)` gives a tile's rules from terrain.json.
 * `seed` makes the random choices repeatable, so the same place looks the same every visit.
 * Returns a grid ready for createWorld(), plus the townspeople's spots in `npcs`.
 */
export function buildFromTemplate(template, rules, seed) {
  checkTemplateSize(template);
  let grid;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    grid = fillTemplate(template, makeRandom(`${seed}-${attempt}`));
    const problem = findUnreachable(grid, rules);
    if (!problem) return grid;
    if (attempt === MAX_TRIES - 1) console.warn(`Template "${template.name}": ${problem}`);
  }
  return grid;
}

/** Fills in one copy of the template, making every random choice with `random`. */
function fillTemplate(template, random) {
  const height = template.rows.length;
  const width = template.rows[0].length;
  const tiles = [], ground = [], npcs = [];
  let start = null;

  template.rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const entry = legendEntry(template, row[x]);
      tiles.push(pickTile(entry, random));
      ground.push(entry.ground || template.ground || null);
      if (entry.start && !start) start = { x, y };
      if (entry.npc && random.chance(entry.chance ?? 1)) {
        npcs.push({ role: entry.npc, x, y, wander: entry.wander || 0, tile: entry.tile });
      }
    }
  });

  if (!start) {
    console.warn(`Template "${template.name}" has no start; using the middle`);
    start = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  }
  // The view scrolls with the Wayfarer unless the template asks for "camera": "flip".
  return { width, height, tiles, ground, start, npcs, camera: template.camera || 'follow' };
}

/** Returns a legend entry as an object, whichever way it's written. */
function legendEntry(template, char) {
  const entry = template.legend[char];
  if (entry === undefined) {
    console.warn(`Template "${template.name}" uses "${char}", which isn't in its legend`);
    return { tile: 'void' };
  }
  return typeof entry === 'string' ? { tile: entry } : entry;
}

/** Picks the tile for a legend entry: its tile, or one of its "choose" options by weight. */
function pickTile(entry, random) {
  if (!entry.choose) return entry.tile;
  const options = Object.entries(entry.choose);
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random.next() * total;
  for (const [tile, weight] of options) {
    roll -= weight;
    if (roll < 0) return tile;
  }
  return options[options.length - 1][0];
}

/**
 * Checks that from the start you can walk (with no gear) to every townsperson and to an exit.
 * Returns a description of what's unreachable, or null if everything is.
 */
function findUnreachable(grid, rules) {
  const reached = reachableFrom(grid, grid.start, name => !rules(name).blocks && !rules(name).gate);
  const lost = grid.npcs.find(npc => !reached[npc.y * grid.width + npc.x]);
  if (lost) return `the ${lost.role} at ${lost.x}, ${lost.y} can't be reached`;
  const exitReached = grid.tiles.some((tile, i) => rules(tile).exit && reached[i]);
  return exitReached ? null : 'no exit can be reached';
}

/** Warns if a template isn't a whole number of screens or has uneven rows. */
function checkTemplateSize(template) {
  const width = template.rows[0].length;
  template.rows.forEach((row, y) => {
    if (row.length !== width) console.warn(`Template "${template.name}" row ${y} is ${row.length} wide, not ${width}`);
  });
  if (width % SCREEN_TILES_W || template.rows.length % SCREEN_TILES_H) {
    console.warn(`Template "${template.name}" is ${width}x${template.rows.length}; `
      + `screens are ${SCREEN_TILES_W}x${SCREEN_TILES_H} tiles`);
  }
}
