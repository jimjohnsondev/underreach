// npcs.js
// Townspeople: placing them at their spots in a location, letting some of them wander, and
// finding who the Wayfarer is standing next to. What each role is called and looks like is in
// data/npcs.json; where they stand comes from the location's template.
//
// A wanderer stands still for a while, walks a few steps in one direction, and repeats, never
// going more than `wander` tiles from its spot. It won't walk into walls, other people or the
// Wayfarer, and he can't walk through it either.
import { art } from './art.js';
import { TILE_W, TILE_H } from './world.js';
import { feetBox, feetBlocked } from './player.js';
import { makeRandom } from './gen/random.js';
import { personName } from './gen/names.js';

const UPDATES_PER_SECOND = 60;
// The four ways a wanderer can step: right, left, down, up.
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MOODS = ['friendly', 'neutral', 'wary', 'hostile'];

/**
 * Creates the townspeople for a location from its template's spots ({ role, x, y, wander, tile }).
 * `settings` is data/npcs.json. `place` is { location, regionId, names, seed }: who they are
 * (name, mood) comes from the seed and where they stand, so they're the same on every visit.
 */
export function createNpcs(spots, settings, place) {
  const usedNames = new Set();
  return spots.map(spot => {
    const role = settings.roles[spot.role];
    if (!role) console.warn(`Unknown townsperson role "${spot.role}"`);
    const id = `${place.location.id}:${spot.x},${spot.y}`;
    const random = makeRandom(`${place.seed}-${id}`);

    // No two people in one place share a name, while the region's list lasts. The name has its
    // own random numbers: sharing the mood's would make a name give away the mood.
    const name = personName(place.names, place.regionId, `${place.seed}-${id}-name`, usedNames);
    usedNames.add(name);

    return {
      id,
      role: spot.role,
      label: role ? role.label : spot.role.toUpperCase(),
      name,
      disposition: pickMood(random, (role && role.disposition) || settings.disposition),
      backdrop: settings.backdrops[spot.tile] || settings.backdrops.default,
      sprite: role ? role.sprite : null,
      x: spot.x * TILE_W,
      y: spot.y * TILE_H,
      homeX: spot.x,
      homeY: spot.y,
      wander: spot.wander,
      walking: null,          // the direction being walked, e.g. [1, 0], or null when standing
      timer: randomBetween(settings.pause),
      animTimer: 0,
      frame: 0,
    };
  });
}

/** Moves the wanderers one update's worth. `player` is the Wayfarer, who they won't walk into. */
export function updateNpcs(npcs, world, player, settings) {
  const playerFeet = feetBox(player.x, player.y);
  for (const npc of npcs) {
    animate(npc, settings);
    if (!npc.wander) continue;

    npc.timer--;
    if (npc.walking) {
      const others = npcs.filter(other => other !== npc).map(other => feetBox(other.x, other.y));
      if (npc.timer <= 0 || !step(npc, world, [playerFeet, ...others], settings)) {
        npc.walking = null;
        npc.timer = randomBetween(settings.pause);
      }
    } else if (npc.timer <= 0) {
      npc.walking = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      npc.timer = randomBetween(settings.walk);
    }
  }
}

/**
 * Moves a wanderer one step in its direction. Returns false (and doesn't move) if that would take
 * it into something, or further than `wander` tiles from its spot.
 */
function step(npc, world, obstacles, settings) {
  const [dx, dy] = npc.walking;
  const nx = npc.x + dx * settings.walkSpeed * TILE_W / UPDATES_PER_SECOND;
  const ny = npc.y + dy * settings.walkSpeed * TILE_H / UPDATES_PER_SECOND;
  const tooFar = Math.abs(nx / TILE_W - npc.homeX) > npc.wander || Math.abs(ny / TILE_H - npc.homeY) > npc.wander;
  if (tooFar || feetBlocked(world, nx, ny, null, obstacles)) return false;
  npc.x = nx;
  npc.y = ny;
  return true;
}

/** Swaps between a sprite's two frames while walking, if it has a second frame. */
function animate(npc, settings) {
  if (!npc.walking) {
    npc.frame = 0;
    return;
  }
  if (++npc.animTimer >= settings.animationFrameTime) {
    npc.animTimer = 0;
    npc.frame = 1 - npc.frame;
  }
}

/** Returns the feet boxes of all the townspeople, for the Wayfarer to bump into. */
export function npcObstacles(npcs) {
  return npcs.map(npc => feetBox(npc.x, npc.y));
}

/**
 * Returns the townsperson nearest the Wayfarer within talking distance ("talkReach" in
 * data/npcs.json, in tiles between their feet), or null.
 */
export function npcInReach(npcs, player, settings) {
  const center = box => ({ x: (box.x + box.w / 2) / TILE_W, y: (box.y + box.h / 2) / TILE_H });
  const me = center(feetBox(player.x, player.y));
  let nearest = null, nearestDistance = settings.talkReach;
  for (const npc of npcs) {
    const them = center(feetBox(npc.x, npc.y));
    const distance = Math.hypot(them.x - me.x, them.y - me.y);
    if (distance <= nearestDistance) {
      nearest = npc;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Draws a townsperson with their sprite's top-left at screen position x, y. Uses the role's own
 * sprite (and its "_2" frame while walking) if art/sprites.json has it, otherwise the stand-in.
 */
export function drawNpc(ctx, npc, x, y, settings) {
  const own = npc.sprite && art.sprites[npc.sprite];
  const second = npc.sprite && art.sprites[`${npc.sprite}_2`];
  const image = own ? (npc.frame && second ? second : own) : art.sprites[settings.standIn];
  if (image) ctx.drawImage(image, x, y);
}

/** Picks a mood (friendly, neutral, wary or hostile) using the odds in `weights`. */
function pickMood(random, weights) {
  const total = MOODS.reduce((sum, mood) => sum + (weights[mood] || 0), 0);
  let roll = random.next() * total;
  for (const mood of MOODS) {
    roll -= weights[mood] || 0;
    if (roll < 0) return mood;
  }
  return 'neutral';
}

/** Returns a random whole number between range[0] and range[1]. */
function randomBetween([low, high]) {
  return low + Math.floor(Math.random() * (high - low + 1));
}
