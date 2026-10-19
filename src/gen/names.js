// names.js
// Names for places and people, built from the syllable lists in data/names.json. Each region has
// its own sound: Greenvale's MOSSFORD, Fenmarch's REEDHOLT, Highcairn's CRAG TOR. The design doc
// generates names last, after the world is built, so they never change its shape.
import { makeRandom } from './random.js';

// How many times to try for a name that isn't already used before accepting a repeat.
const NAME_TRIES = 40;

/**
 * Gives every location without a fixed label (THE CAPITAL, GLASS CITY...) its own name, unique
 * in the world. `regionIds` lists the region id for each region number in grid.region.
 */
export function nameLocations(locations, regionIds, names, seed) {
  const random = makeRandom(`${seed}-names`);
  const used = new Set(locations.filter(l => l.fixedLabel).map(l => l.label));

  for (const location of locations) {
    if (location.fixedLabel) continue;
    const parts = names.regions[regionIds[location.region]];
    const pattern = names.patterns[location.type] || '{name}';
    let name = null;
    for (let attempt = 0; attempt < NAME_TRIES && (!name || used.has(name)); attempt++) {
      const first = random.pick(parts.first);
      const whole = first + random.pick(parts.last);
      if (whole.length > names.maxLength) continue;
      name = pattern.replace('{name}', whole).replace('{first}', first);
    }
    name ??= location.label;   // nothing short enough; keep the plain label
    used.add(name);
    location.label = name;
  }
}

/**
 * Returns a person's name for a region, the same every time for the same `seed`. Names in
 * `taken` are avoided while there are others left; after that, names repeat.
 */
export function personName(names, regionId, seed, taken = new Set()) {
  const list = (names.regions[regionId] || Object.values(names.regions)[0]).people;
  const free = list.filter(name => !taken.has(name));
  return makeRandom(seed).pick(free.length ? free : list);
}
