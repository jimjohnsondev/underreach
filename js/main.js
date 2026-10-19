// main.js
// Starts the game and runs it: loads the art and data, then updates and draws every frame.
//
// The screen is a one-tile status strip at the top (HP, level, marks, region name) above a
// 20x11-tile view of the world that scrolls to follow the Wayfarer.
import { W, H, ctx, initScreen } from './screen.js';
import { readInput, onKey } from './input.js';
import { art, loadArt, loadJSON, drawText, textWidth } from './art.js';
import { loadWorld, TILE_W, TILE_H } from './world.js';
import { createPlayer, updatePlayer, drawPlayer, tileUnderFeet } from './player.js';

// Screen layout, in game pixels.
const STRIP_H = TILE_H;          // the status strip is one tile tall
const VIEW_W = W;                // the world view below it: 20 tiles wide...
const VIEW_H = H - STRIP_H;      // ...and 11 tiles tall
const STRIP_TEXT_Y = 6;          // puts the 5-pixel-tall text in the middle of the strip

// Timing, in game updates (60 per second).
const UPDATES_PER_SECOND = 60;
const WATER_FRAME_TIME = 30;     // water swaps between its two frames every half second
const PROMPT_TIME = 150;         // an action prompt stays up for two and a half seconds

// Status strip colors, as palette keys from art/palette.json.
const COLOR_STRIP = 'k';         // background
const COLOR_STATS = 'U';         // HP and level
const COLOR_MARKS = 'y';         // money
const COLOR_REGION = 'N';        // region name
const COLOR_PROMPT = 'X';        // prompts like "ENTER TOWN?"
const COLOR_DEBUG = '9';         // debug overlay text

let world;
let player;
let updateCount = 0;             // game updates since the game started; drives animation
let prompt = null;               // the prompt in the status strip, if any: { text, timeLeft, tx, ty }
let showDebug = false;

// Frames-per-second counter for the debug overlay.
let fps = 0;
let framesThisSecond = 0;
let fpsTimer = performance.now();

onKey('Backquote', () => { showDebug = !showDebug; });

start();

/** Sets up the screen, loads everything, then starts the game loop. */
async function start() {
  initScreen();
  try {
    const [, loadedWorld, stats] = await Promise.all([
      loadArt(),
      loadWorld('data/maps/test.json'),
      loadJSON('data/player.json'),
    ]);
    world = loadedWorld;
    player = createPlayer(stats, world);
  } catch (error) {
    showLoadError(error);
    return;
  }
  runGameLoop();
}

/**
 * Runs update() exactly 60 times per second, whatever the screen's refresh rate, and draws once per
 * screen refresh. This keeps the game speed the same on a 60 Hz laptop and a 120 Hz phone.
 */
function runGameLoop() {
  const updateTime = 1000 / UPDATES_PER_SECOND;
  // Never catch up more than this many milliseconds at once, e.g. after the tab was in the background.
  const maxCatchUp = 250;
  let lastTime = performance.now();
  let timeOwed = 0;   // time that has passed but hasn't been covered by updates yet

  function frame(now) {
    timeOwed += Math.min(maxCatchUp, now - lastTime);
    lastTime = now;
    while (timeOwed >= updateTime) {
      update();
      timeOwed -= updateTime;
    }
    render();
    countFrame(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** Advances the game by one update: moves the Wayfarer and handles the action button. */
function update() {
  updateCount++;
  const input = readInput();
  updatePlayer(player, input, world);

  const { tx, ty } = tileUnderFeet(player);

  // Pressing action on a town, ruin, cave or waystone asks whether to go in.
  if (input.action) {
    const text = world.tileRules(world.tileAt(tx, ty)).prompt;
    if (text) prompt = { text, timeLeft: PROMPT_TIME, tx, ty };
  }

  // The prompt goes away after a while, or as soon as the Wayfarer steps off that tile.
  if (prompt) {
    prompt.timeLeft--;
    const steppedOff = prompt.tx !== tx || prompt.ty !== ty;
    if (prompt.timeLeft <= 0 || steppedOff) prompt = null;
  }
}

/** Draws the whole screen. */
function render() {
  renderWorld();
  renderStatusStrip();
  if (showDebug) renderDebugOverlay();
}

/**
 * Works out which part of the map to show: the view is centered on the Wayfarer, but stops at the
 * map's edges. Returns the view's top-left corner and the Wayfarer's position, both in whole pixels.
 */
function getCamera() {
  // Round the Wayfarer's position first and center on that, so he never jitters against the scenery.
  const px = Math.round(player.x);
  const py = Math.round(player.y);
  const centerX = px + TILE_W / 2;
  const centerY = py + TILE_H / 2;
  const viewX = clamp(centerX - VIEW_W / 2, 0, world.pixelWidth - VIEW_W);
  const viewY = clamp(centerY - VIEW_H / 2, 0, world.pixelHeight - VIEW_H);
  return { viewX, viewY, px, py };
}

/** Draws the visible tiles and the Wayfarer in the area below the status strip. */
function renderWorld() {
  const { viewX, viewY, px, py } = getCamera();

  // Clip to the view area so tiles scrolling past its top edge don't draw over the status strip.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, STRIP_H, VIEW_W, VIEW_H);
  ctx.clip();

  // While scrolling, tiles are cut off at the edges, so draw one extra column and row.
  const firstTx = Math.floor(viewX / TILE_W);
  const firstTy = Math.floor(viewY / TILE_H);
  const lastTx = firstTx + VIEW_W / TILE_W;
  const lastTy = firstTy + VIEW_H / TILE_H;
  for (let ty = firstTy; ty <= lastTy; ty++) {
    for (let tx = firstTx; tx <= lastTx; tx++) {
      const image = tileImage(world.tileAt(tx, ty));
      ctx.drawImage(image, tx * TILE_W - viewX, STRIP_H + ty * TILE_H - viewY);
    }
  }

  drawPlayer(ctx, player, px - viewX, STRIP_H + py - viewY);
  ctx.restore();
}

/** Returns the picture to draw for a tile, picking the right frame for animated water. */
function tileImage(name) {
  const waterSecondFrame = Math.floor(updateCount / WATER_FRAME_TIME) % 2 === 1;
  if (name === 'water' && waterSecondFrame) return art.tiles.water_2;
  return art.tiles[name] || art.tiles.void;
}

/**
 * Draws the status strip at the top: HP, level and marks on the left and the region name on the
 * right. While a prompt is showing, it replaces all of that.
 */
function renderStatusStrip() {
  const color = art.colors;
  ctx.fillStyle = color[COLOR_STRIP];
  ctx.fillRect(0, 0, W, STRIP_H);

  if (prompt) {
    const x = Math.round((W - textWidth(prompt.text)) / 2);
    drawText(ctx, prompt.text, x, STRIP_TEXT_Y, color[COLOR_PROMPT]);
    return;
  }

  const stats = `HP ${player.hp}/${player.maxHp}  LV ${player.level}`;
  const marks = `${player.marks} MK`;
  const marksX = 2 + textWidth(stats + '  ') + 1;
  drawText(ctx, stats, 2, STRIP_TEXT_Y, color[COLOR_STATS]);
  drawText(ctx, marks, marksX, STRIP_TEXT_Y, color[COLOR_MARKS]);

  const { tx, ty } = tileUnderFeet(player);
  const region = world.regionAt(tx, ty);
  drawText(ctx, region, W - 2 - textWidth(region), STRIP_TEXT_Y, color[COLOR_REGION]);
}

/** Draws the debug box (toggled with the ` key): tile position, tile name and frames per second. */
function renderDebugOverlay() {
  const { tx, ty } = tileUnderFeet(player);
  const lines = [
    `X ${tx} Y ${ty}`,
    world.tileAt(tx, ty).replace(/_/g, ' '),   // the font has no underscore
    `FPS ${fps}`,
  ];
  const lineHeight = 6;
  const boxW = Math.max(...lines.map(textWidth)) + 4;
  const boxH = lines.length * lineHeight + 3;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, STRIP_H, boxW, boxH);
  lines.forEach((line, i) => {
    drawText(ctx, line, 2, STRIP_H + 2 + i * lineHeight, art.colors[COLOR_DEBUG]);
  });
}

/** Counts drawn frames and updates `fps` once a second. */
function countFrame(now) {
  framesThisSecond++;
  const elapsed = now - fpsTimer;
  if (elapsed >= 1000) {
    fps = Math.round(framesThisSecond * 1000 / elapsed);
    framesThisSecond = 0;
    fpsTimer = now;
  }
}

/** Limits a number to the range min..max. */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Shows a message on the game screen when the art or data can't be loaded, with the details
 * in the browser console. The usual cause is opening index.html straight from disk instead
 * of through a web server, because browsers block loading files that way.
 */
function showLoadError(error) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e2482a';
  ctx.font = '8px monospace';
  ctx.fillText('LOAD FAILED', 4, 12);
  ctx.fillText('see console', 4, 24);
  console.error(error);
}
