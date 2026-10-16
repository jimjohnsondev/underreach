// The Wayfarer: 8-direction walking, the 2-frame walk cycle, and collision by the feet.
import { art } from './art.js';
import { TILE_W, TILE_H } from './world.js';

// Collision box at the bottom of the 8x16 sprite, so the head can overlap scenery above.
const FEET = { x: 2, y: 13, w: 4, h: 3 };

export function createPlayer(stats, world) {
  return {
    ...stats,
    // Position is the sprite's top-left in logical pixels, kept fractional for smooth sub-pixel speed.
    x: world.start.x * TILE_W,
    y: world.start.y * TILE_H,
    facing: 'down',
    frame: 0,
    walkTick: 0,
  };
}

// Tile the feet are centered on: this is what the Wayfarer is "standing on".
export function feetTile(p) {
  return {
    tx: Math.floor((p.x + FEET.x + FEET.w / 2) / TILE_W),
    ty: Math.floor((p.y + FEET.y + FEET.h / 2) / TILE_H),
  };
}

function feetBlocked(world, x, y) {
  const x0 = Math.floor((x + FEET.x) / TILE_W), x1 = Math.floor((x + FEET.x + FEET.w - 0.001) / TILE_W);
  const y0 = Math.floor((y + FEET.y) / TILE_H), y1 = Math.floor((y + FEET.y + FEET.h - 0.001) / TILE_H);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (world.blocks(tx, ty)) return true;
  return false;
}

// Snap any stick reading to one of 8 directions, so analog sticks feel the same as the keyboard.
function eightWay(ix, iy) {
  if (Math.hypot(ix, iy) < 0.3) return [0, 0];
  const a = Math.round(Math.atan2(iy, ix) / (Math.PI / 4)) * (Math.PI / 4);
  return [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
}

export function updatePlayer(p, input, world) {
  const [dx, dy] = eightWay(input.x, input.y);
  if (!dx && !dy) { p.frame = 0; p.walkTick = 0; return; }

  // walkSpeed is tiles per second; a tile is 8 pixels wide but 16 tall, which on wide pixels
  // looks square, so horizontal pixel speed is half the vertical to look the same on screen.
  const diag = dx && dy ? Math.SQRT1_2 : 1;
  const vx = dx * p.walkSpeed * TILE_W / 60 * diag;
  const vy = dy * p.walkSpeed * TILE_H / 60 * diag;

  // Move each axis separately so walking diagonally into a wall slides along it.
  if (!feetBlocked(world, p.x + vx, p.y)) p.x += vx;
  if (!feetBlocked(world, p.x, p.y + vy)) p.y += vy;

  // On diagonals, keep the current facing if it's one of the two directions being pressed.
  const h = dx > 0 ? 'right' : dx < 0 ? 'left' : null;
  const v = dy > 0 ? 'down' : dy < 0 ? 'up' : null;
  if (!(p.facing === h || p.facing === v)) p.facing = h || v;

  if (++p.walkTick >= p.walkFrameTicks) { p.walkTick = 0; p.frame ^= 1; }
}

export function drawPlayer(ctx, p, sx, sy) {
  ctx.drawImage(art.sprites[`wayfarer_${p.facing}_${p.frame + 1}`], sx, sy);
}
