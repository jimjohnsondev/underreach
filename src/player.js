// player.js
// The Wayfarer: walking in 8 directions, the walk animation, and bumping into things.
//
// Only the Wayfarer's feet collide with the world, so his head and body can overlap the scenery
// above him, the way characters do in top-down games.
import { art } from './art.js';
import { TILE_W, TILE_H } from './world.js';

const UPDATES_PER_SECOND = 60;

// The part of an 8x16 character sprite that collides: a small box around the feet, in pixels
// from the sprite's top-left corner. The Wayfarer and the townspeople all use this one box.
// main.js sets it from "feet" in data/player.json with setFeetBox(); these numbers are only
// used if that's missing.
const FEET = { x: 3, y: 13, w: 2, h: 3 };

/** Sets the feet box everyone collides with. Call it once, when data/player.json is loaded. */
export function setFeetBox(feet) {
  if (feet) Object.assign(FEET, feet);
}

/** Returns the feet box of a character whose sprite's top-left is at x, y, in map pixels. */
export function feetBox(x, y) {
  return { x: x + FEET.x, y: y + FEET.y, w: FEET.w, h: FEET.h };
}

/** True if two boxes ({ x, y, w, h }) overlap. */
export function boxesOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Stick pushes smaller than this (out of 1) don't move the Wayfarer.
const STICK_DEAD_ZONE = 0.3;

/**
 * Creates the Wayfarer. `stats` comes from data/player.json and includes HP, level, marks and
 * the walking speed. Use placePlayer() to put him on a map.
 */
export function createPlayer(stats) {
  return {
    ...stats,
    // Top-left corner of the sprite, in game pixels. These can be fractions, so slow speeds still
    // move smoothly; they're rounded only when drawing.
    x: 0,
    y: 0,
    facing: 'down',     // 'up', 'down', 'left' or 'right'
    walkFrame: 0,       // which of the two walking frames is showing: 0 or 1
    walkTimer: 0,       // updates since the walking frame last changed
    gear: new Set(),    // gear names from data/gear.json, which open gated terrain
  };
}

/** Puts the Wayfarer standing on tile tx, ty, facing the given way. */
export function placePlayer(player, tx, ty, facing = 'down') {
  player.x = tx * TILE_W;
  player.y = ty * TILE_H;
  player.facing = facing;
  player.walkFrame = 0;
  player.walkTimer = 0;
}

/** Returns the tile position under the middle of the Wayfarer's feet: the tile he is standing on. */
export function tileUnderFeet(player) {
  return {
    tx: Math.floor((player.x + FEET.x + FEET.w / 2) / TILE_W),
    ty: Math.floor((player.y + FEET.y + FEET.h / 2) / TILE_H),
  };
}

/**
 * Moves the Wayfarer one update's worth according to the stick, and advances his walk animation.
 * `obstacles` are the feet boxes of anyone he can't walk through, like townspeople.
 */
export function updatePlayer(player, input, world, obstacles = []) {
  const [dirX, dirY] = snapToEightDirections(input.x, input.y);

  if (dirX === 0 && dirY === 0) {
    // Standing still: show the first walking frame, which is the standing pose.
    player.walkFrame = 0;
    player.walkTimer = 0;
    return;
  }

  // walkSpeed is in tiles per second. A tile is 8 pixels wide but 16 tall (it looks square
  // because the pixels are wide), so moving one tile sideways is half as many pixels as moving one
  // tile up or down. Diagonals are scaled down so they aren't faster than straight lines.
  const diagonal = dirX !== 0 && dirY !== 0 ? Math.SQRT1_2 : 1;
  // speedMultiplier is set by the game each update, e.g. by a meal that speeds up travel.
  const speed = player.walkSpeed * (player.speedMultiplier || 1);
  const tilesPerUpdate = speed / UPDATES_PER_SECOND * diagonal;
  const stepX = dirX * tilesPerUpdate * TILE_W;
  const stepY = dirY * tilesPerUpdate * TILE_H;

  // Anyone already overlapping him is ignored, so he can always step away rather than get stuck.
  const here = feetBox(player.x, player.y);
  const inTheWay = obstacles.filter(other => !boxesOverlap(here, other));

  // Try each direction separately, so walking diagonally into a wall slides along it.
  const movedX = stepX !== 0 && !feetBlocked(world, player.x + stepX, player.y, player.gear, inTheWay);
  if (movedX) player.x += stepX;
  const movedY = stepY !== 0 && !feetBlocked(world, player.x, player.y + stepY, player.gear, inTheWay);
  if (movedY) player.y += stepY;

  // Walking straight into a wall next to an opening slides him into it, so one-tile gaps don't
  // need lining up to the pixel.
  const nudge = player.nudge || { x: 0, y: 0 };
  if (dirX === 0 && !movedY) {
    slideIntoOpening(player, world, inTheWay, 'x', { x: 0, y: stepY }, nudge.x, tilesPerUpdate * TILE_W);
  } else if (dirY === 0 && !movedX) {
    slideIntoOpening(player, world, inTheWay, 'y', { x: stepX, y: 0 }, nudge.y, tilesPerUpdate * TILE_H);
  }

  player.facing = chooseFacing(player.facing, dirX, dirY);

  player.walkTimer++;
  if (player.walkTimer >= player.walkFrameTicks) {
    player.walkTimer = 0;
    player.walkFrame = 1 - player.walkFrame;
  }
}

/** Draws the Wayfarer with his sprite's top-left corner at screen position x, y. */
export function drawPlayer(ctx, player, x, y) {
  const sprite = art.sprites[`wayfarer_${player.facing}_${player.walkFrame + 1}`];
  ctx.drawImage(sprite, x, y);
}

/**
 * When the Wayfarer is blocked walking in a straight line, looks up to `range` pixels to either
 * side (along `axis`, 'x' or 'y') for a spot where the blocked step (`step`, { x, y }) would be
 * free. If there is one, and he can get there without walking through anything, he slides toward
 * it by up to `speed` pixels this update. The nearest opening wins; if there are two equally near,
 * he doesn't move, since there's no telling which one he wants.
 */
function slideIntoOpening(player, world, obstacles, axis, step, range, speed) {
  const blockedAt = offset => {
    const x = player.x + (axis === 'x' ? offset : 0);
    const y = player.y + (axis === 'y' ? offset : 0);
    return feetBlocked(world, x, y, player.gear, obstacles);
  };
  const stepFreeAt = offset => {
    const x = player.x + step.x + (axis === 'x' ? offset : 0);
    const y = player.y + step.y + (axis === 'y' ? offset : 0);
    return !feetBlocked(world, x, y, player.gear, obstacles);
  };

  // Check one pixel further out at a time on each side, and stop on a side once something's in the way.
  const openSides = new Set([-1, 1]);
  for (let distance = 1; distance <= range; distance++) {
    const found = [];
    for (const side of [...openSides]) {
      const offset = side * distance;
      if (blockedAt(offset)) openSides.delete(side);
      else if (stepFreeAt(offset)) found.push(side);
    }
    if (found.length === 1) {
      const move = found[0] * Math.min(speed, distance);
      if (axis === 'x') player.x += move;
      else player.y += move;
      return;
    }
    if (found.length === 2 || !openSides.size) return;
  }
}

/**
 * Turns a stick reading into one of 8 directions, returned as [x, y] with each -1, 0 or 1.
 * This makes a gamepad stick or the touch thumbstick move exactly like the arrow keys.
 */
function snapToEightDirections(x, y) {
  if (Math.hypot(x, y) < STICK_DEAD_ZONE) return [0, 0];
  const eighthTurn = Math.PI / 4;
  const angle = Math.round(Math.atan2(y, x) / eighthTurn) * eighthTurn;
  return [Math.round(Math.cos(angle)), Math.round(Math.sin(angle))];
}

/**
 * Picks which way the Wayfarer faces while moving in direction dirX, dirY. When moving diagonally,
 * he keeps facing the way he was if that's one of the two directions, so he doesn't flicker.
 */
function chooseFacing(current, dirX, dirY) {
  const horizontal = dirX > 0 ? 'right' : dirX < 0 ? 'left' : null;
  const vertical = dirY > 0 ? 'down' : dirY < 0 ? 'up' : null;
  if (current === horizontal || current === vertical) return current;
  return horizontal || vertical;
}

/**
 * True if a character's feet would touch a blocking tile, or one of the `obstacles` (feet boxes
 * of other characters), with its sprite's top-left at x, y. Townspeople use this too.
 */
export function feetBlocked(world, x, y, gear, obstacles = []) {
  const feet = feetBox(x, y);
  if (obstacles.some(other => boxesOverlap(feet, other))) return true;
  // The tiles under the feet box's left, right, top and bottom edges. The tiny nudge stops a box
  // that ends exactly on a tile edge from counting the next tile over.
  const left = Math.floor((x + FEET.x) / TILE_W);
  const right = Math.floor((x + FEET.x + FEET.w - 0.001) / TILE_W);
  const top = Math.floor((y + FEET.y) / TILE_H);
  const bottom = Math.floor((y + FEET.y + FEET.h - 0.001) / TILE_H);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (world.blocks(tx, ty, gear)) return true;
    }
  }
  return false;
}
