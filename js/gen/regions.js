// regions.js
// Splits the map into regions: a central region (Greenvale) in the middle of the map, and the
// four outer regions around it, one to each side. Which outer region goes on which side is
// picked by the seed. A thin ring of barrier tiles is marked around the center region; it's what
// keeps the player inside Greenvale until they have the right gear.
import { indexOf } from './grid.js';

/**
 * Fills in grid.region and grid.barrier. `layers.border` is a noise layer used to make the
 * region edges wobbly instead of perfect ellipses and straight lines.
 */
export function assignRegions(grid, settings, layers, random) {
  const { width, height } = grid;
  const { radius, wobble, barrierWidth, sectorWobble } = settings.center;
  const centerIndex = settings.regions.findIndex(r => r.center);
  const outerIndexes = settings.regions.map((_, i) => i).filter(i => i !== centerIndex);

  // The four sides of the map, in the order the angle math below produces: east, south, west, north.
  const sides = random.shuffle(outerIndexes);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = indexOf(grid, x, y);
      const wiggle = layers.border[i] - 0.5;

      // Position relative to the map's center, scaled so the map's edges are at -1 and 1.
      // That makes the center region an ellipse the same shape as the map.
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const distance = Math.hypot(dx, dy) + wiggle * wobble * 2;

      if (distance < radius) {
        grid.region[i] = centerIndex;
      } else {
        // Split the rest into four quarters by angle, with wobbly borders between them.
        const angle = Math.atan2(dy, dx) + wiggle * sectorWobble;
        const quarter = ((Math.round(angle / (Math.PI / 2)) % 4) + 4) % 4;
        grid.region[i] = sides[quarter];
      }
    }
  }

  markBarrier(grid, centerIndex, barrierWidth);
  return { centerIndex, outerIndexes };
}

/** Marks every tile outside the center region that is within `thickness` tiles of it. */
function markBarrier(grid, centerIndex, thickness) {
  const { width, height } = grid;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid.region[indexOf(grid, x, y)] !== centerIndex) continue;
      for (let ny = y - thickness; ny <= y + thickness; ny++) {
        for (let nx = x - thickness; nx <= x + thickness; nx++) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = indexOf(grid, nx, ny);
          if (grid.region[n] !== centerIndex) grid.barrier[n] = 1;
        }
      }
    }
  }
}
