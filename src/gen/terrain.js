// terrain.js
// Paints the ground: sea around the edge of the map, a coastline, the barrier ring around the
// center region, and each region's own mix of land (forests, hills, marsh, salt flats...).
// What goes where is described per region in data/worldgen.json.
import { indexOf } from './grid.js';

/** Sets every tile in the grid to its terrain. Needs regions to be assigned first. */
export function paintTerrain(grid, settings, layers, random) {
  const { width, height } = grid;
  const { tile: seaTile, width: seaWidth, wobble, coastWidth } = settings.sea;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = indexOf(grid, x, y);
      const region = settings.regions[grid.region[i]];

      // Distance to the nearest map edge, made wobbly so the coastline isn't a straight line.
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y)
        + (layers.coast[i] - 0.5) * 2 * wobble;

      // The barrier ring comes before the coast: if Greenvale reaches the shore, the ring must
      // still run down to the sea, or you could walk out of Greenvale along the beach.
      if (edgeDistance < seaWidth) {
        grid.tiles[i] = seaTile;
      } else if (grid.barrier[i]) {
        grid.tiles[i] = region.barrier;
      } else if (edgeDistance < seaWidth + coastWidth) {
        grid.tiles[i] = coastTile(region, layers.shore[i]);
      } else {
        const feature = matchingFeature(region, layers, i, random);
        grid.tiles[i] = feature ? feature.tile : baseOrDecor(region, random);
        // A tree (or anything else with see-through pixels) stands on the region's base
        // ground, so a tree in Saltreach shows sand around it and one in Fenmarch shows marsh.
        grid.ground[i] = region.base;
      }
    }
  }
}

/**
 * Picks a coast tile from the region's "coast" list. `shore` is a smooth noise value from 0 to 1,
 * so neighboring coast tiles get the same pick and the shore comes in stretches (a run of cliffs,
 * then a beach) instead of flickering tile by tile. Listing a tile twice makes it twice as common.
 */
function coastTile(region, shore) {
  const choices = region.coast;
  return choices[Math.min(choices.length - 1, Math.floor(shore * choices.length))];
}

/** Returns the first of a region's features that applies at tile i, or null if none does. */
function matchingFeature(region, layers, i, random) {
  return region.features.find(feature => featureMatches(feature, layers, i, random)) || null;
}

/** Returns the region's base tile, sometimes swapped for a decoration like flowers. */
function baseOrDecor(region, random) {
  for (const decor of region.decor) {
    if (random.chance(decor.chance)) return decor.tile;
  }
  return region.base;
}

/**
 * Some features only look right in a row, like cliffs, whose picture is a wall of rock. A feature
 * with "minRun" is replaced by its "shortRunTile" (or the region's base) wherever it forms
 * fewer than minRun tiles side by side in its region, so there are no stray single blocks of cliff.
 *
 * Run this after rivers and roads: they cut through bands of cliff and can leave short stubs.
 * The barrier ring is left alone, since it has to stay unbroken.
 */
export function removeShortRuns(grid, settings) {
  settings.regions.forEach((region, regionIndex) => {
    for (const feature of region.features.filter(f => f.minRun)) {
      const isPartOfRun = (x, y) => {
        const i = indexOf(grid, x, y);
        return grid.tiles[i] === feature.tile && grid.region[i] === regionIndex && !grid.barrier[i];
      };

      for (let y = 0; y < grid.height; y++) {
        let x = 0;
        while (x < grid.width) {
          if (!isPartOfRun(x, y)) {
            x++;
            continue;
          }
          const runStart = x;
          while (x < grid.width && isPartOfRun(x, y)) x++;
          if (x - runStart >= feature.minRun) continue;
          for (let rx = runStart; rx < x; rx++) {
            grid.tiles[indexOf(grid, rx, y)] = feature.shortRunTile || region.base;
          }
        }
      }
    }
  });
}

/**
 * True if a feature applies here. A feature can require noise layers to be within a range,
 * e.g. "moisture": [0.78, 1], and can have a "chance" of appearing at all.
 */
function featureMatches(feature, layers, i, random) {
  for (const layerName of ['elevation', 'moisture']) {
    const range = feature[layerName];
    if (range && (layers[layerName][i] < range[0] || layers[layerName][i] > range[1])) return false;
  }
  return feature.chance === undefined || random.chance(feature.chance);
}
