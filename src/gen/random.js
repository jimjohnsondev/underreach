// random.js
// Seeded randomness: random numbers and smooth noise that come out the same every time for the
// same seed. This is what lets a seed rebuild exactly the same world.

/**
 * Turns a seed into a whole number. Numbers are used as they are; any other text is hashed,
 * so a seed like "greenvale" works too.
 */
export function seedToNumber(seed) {
  const text = String(seed).trim();
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  let hash = 2166136261;   // FNV-1a
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/**
 * Returns a random-number generator for a seed. Each call to next() gives the next number from
 * 0 up to (not including) 1, in the same order every time for the same seed.
 */
export function makeRandom(seed) {
  let state = seedToNumber(seed);

  /** The next random number from 0 up to 1. (The "mulberry32" generator.) */
  function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** A whole number from 0 up to n - 1. */
    int: n => Math.floor(next() * n),
    /** True with probability p (0 to 1). */
    chance: p => next() < p,
    /** A random item from a list. */
    pick: list => list[Math.floor(next() * list.length)],
    /** Returns a shuffled copy of a list. */
    shuffle(list) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/**
 * Makes a map-sized layer of smooth noise: values that vary gently from tile to tile, like a
 * height map. `scale` is roughly how many tiles wide each hill or valley is; more `octaves` add
 * finer detail on top.
 *
 * The result is turned into percentiles: each value says what fraction of the map is lower.
 * So 0.9 means "higher than 90% of the map", which makes thresholds in data files easy to read.
 */
export function makeNoiseLayer(width, height, { scale, octaves }, seed) {
  const raw = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0, weight = 1, totalWeight = 0, size = scale;
      for (let o = 0; o < octaves; o++) {
        total += smoothNoise(x / size, y / size, seed + o * 1013) * weight;
        totalWeight += weight;
        weight /= 2;
        size /= 2;
      }
      raw[y * width + x] = total / totalWeight;
    }
  }
  return toPercentiles(raw);
}

/** Replaces each value with the fraction of all values that are lower than it (0 to 1). */
function toPercentiles(values) {
  return percentilesByGroup(values, new Uint8Array(values.length));
}

/**
 * Like toPercentiles, but ranks each group separately: a value of 0.9 then means "higher than
 * 90% of its own group". `groups` gives a group number for each value, e.g. each tile's region.
 */
export function percentilesByGroup(values, groups) {
  const result = new Float32Array(values.length);
  const members = new Map();
  groups.forEach((group, i) => {
    if (!members.has(group)) members.set(group, []);
    members.get(group).push(i);
  });
  for (const indexes of members.values()) {
    indexes.sort((a, b) => values[a] - values[b]);
    const last = Math.max(1, indexes.length - 1);
    indexes.forEach((index, rank) => { result[index] = rank / last; });
  }
  return result;
}

/** Noise at any point: random values at whole-number grid points, blended smoothly in between. */
function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = ease(x - x0), fy = ease(y - y0);
  const top = mix(gridValue(x0, y0, seed), gridValue(x0 + 1, y0, seed), fx);
  const bottom = mix(gridValue(x0, y0 + 1, seed), gridValue(x0 + 1, y0 + 1, seed), fx);
  return mix(top, bottom, fy);
}

/** A random but repeatable value from 0 to 1 for a grid point. */
function gridValue(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Curves 0..1 so blending slows down near grid points, which hides the grid's straight lines. */
function ease(t) {
  return t * t * (3 - 2 * t);
}

/** Blends from a to b as t goes from 0 to 1. */
function mix(a, b, t) {
  return a + (b - a) * t;
}
