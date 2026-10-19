// player.js
// The Wayfarer: walking in 8 directions, the walk animation, and bumping into things.
//
// Only the Wayfarer's feet collide with the world, so his head and body can overlap the scenery
// above him, the way characters do in top-down games.
import { art } from './art.js';
import { TILE_W, TILE_H } from './world.js';

const UPDATES_PER_SECOND = 60;

// The part of the 8x16 sprite that collides: a small box around the feet, in pixels from the
// sprite's top-left corner.
const FEET = { x: 2, y: 13, w: 4, h: 3 };

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

/** Moves the Wayfarer one update's worth according to the stick, and advances his walk animation. */
export function updatePlayer(player, input, world) {
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
  const tilesPerUpdate = player.walkSpeed / UPDATES_PER_SECOND * diagonal;
  const stepX = dirX * tilesPerUpdate * TILE_W;
  const stepY = dirY * tilesPerUpdate * TILE_H;

  // Try each direction separately, so walking diagonally into a wall slides along it.
  if (!feetBlocked(world, player.x + stepX, player.y, player.gear)) player.x += stepX;
  if (!feetBlocked(world, player.x, player.y + stepY, player.gear)) player.y += stepY;

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

/** True if the Wayfarer's feet would touch a blocking tile with his sprite's top-left at x, y. */
function feetBlocked(world, x, y, gear) {
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
