// Starts the game: loads data, then runs a fixed 60 Hz update with a render every animation frame.
import { W, H, ctx, initScreen } from './screen.js';
import { readInput, onKey } from './input.js';
import { art, loadArt, drawText, textWidth } from './art.js';
import { loadWorld, TILE_W, TILE_H } from './world.js';
import { createPlayer, updatePlayer, drawPlayer, feetTile } from './player.js';

const STRIP_H = TILE_H;                 // one-tile status strip at the top
const VIEW_W = W, VIEW_H = H - STRIP_H; // 20x11 tiles of play area
const WATER_FRAME_TICKS = 30;           // swap water frames every half second
const PROMPT_TICKS = 150;               // how long an action prompt stays up

let world, player;
let tick = 0;
let prompt = null;                      // { text, ticks, tx, ty } shown in the status strip
let debug = false;
let fps = 0, fpsFrames = 0, fpsTime = performance.now();

onKey('Backquote', () => { debug = !debug; });

function update() {
  tick++;
  const input = readInput();
  updatePlayer(player, input, world);

  const { tx, ty } = feetTile(player);
  if (input.action) {
    const text = world.info(world.tileAt(tx, ty)).prompt;
    if (text) prompt = { text, ticks: PROMPT_TICKS, tx, ty };
  }
  // The question is about this spot, so walking away dismisses it.
  if (prompt && (--prompt.ticks <= 0 || prompt.tx !== tx || prompt.ty !== ty)) prompt = null;
}

// Camera top-left in logical pixels, centered on the Wayfarer and held inside the map.
function camera() {
  const px = Math.round(player.x), py = Math.round(player.y);
  const cx = Math.max(0, Math.min(world.pixelW - VIEW_W, px + 4 - VIEW_W / 2));
  const cy = Math.max(0, Math.min(world.pixelH - VIEW_H, py + 8 - VIEW_H / 2));
  return { cx, cy, px, py };
}

function tileImage(name) {
  if (name === 'water' && Math.floor(tick / WATER_FRAME_TICKS) % 2) return art.tiles.water_2;
  return art.tiles[name] || art.tiles.void;
}

function renderWorld() {
  const { cx, cy, px, py } = camera();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, STRIP_H, VIEW_W, VIEW_H);
  ctx.clip();
  const tx0 = Math.floor(cx / TILE_W), ty0 = Math.floor(cy / TILE_H);
  // One extra row and column covers the partly visible tiles while scrolling.
  for (let ty = ty0; ty <= ty0 + VIEW_H / TILE_H; ty++)
    for (let tx = tx0; tx <= tx0 + VIEW_W / TILE_W; tx++)
      ctx.drawImage(tileImage(world.tileAt(tx, ty)), tx * TILE_W - cx, STRIP_H + ty * TILE_H - cy);
  drawPlayer(ctx, player, px - cx, STRIP_H + py - cy);
  ctx.restore();
}

function renderStrip() {
  const c = art.colors;
  ctx.fillStyle = c.k;
  ctx.fillRect(0, 0, W, STRIP_H);
  const y = 6;
  if (prompt) {
    drawText(ctx, prompt.text, Math.round((W - textWidth(prompt.text)) / 2), y, c.X);
    return;
  }
  const p = player;
  const stats = `HP ${p.hp}/${p.maxHp}  LV ${p.level}`;
  drawText(ctx, stats, 2, y, c.U);
  drawText(ctx, `${p.marks} MK`, 2 + textWidth(stats + '  ') + 1, y, c.y);
  const { tx, ty } = feetTile(p);
  const region = world.regionAt(tx, ty);
  drawText(ctx, region, W - 2 - textWidth(region), y, c.N);
}

function renderDebug() {
  const { tx, ty } = feetTile(player);
  const lines = [`X ${tx} Y ${ty}`, world.tileAt(tx, ty).replace(/_/g, ' '), `FPS ${fps}`];
  const w = Math.max(...lines.map(textWidth)) + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, STRIP_H, w, lines.length * 6 + 3);
  lines.forEach((s, i) => drawText(ctx, s, 2, STRIP_H + 2 + i * 6, art.colors['9']));
}

function render() {
  renderWorld();
  renderStrip();
  if (debug) renderDebug();
}

function showError(msg) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e2482a';
  ctx.font = '8px monospace';
  ctx.fillText('LOAD FAILED', 4, 12);
  ctx.fillText('see console', 4, 24);
  console.error(msg);
}

async function start() {
  initScreen();
  try {
    const [, w, stats] = await Promise.all([
      loadArt(),
      loadWorld('data/maps/test.json'),
      fetch('data/player.json').then(r => r.json()),
    ]);
    world = w;
    player = createPlayer(stats, world);
  } catch (e) {
    // The usual cause is opening index.html straight from disk, where fetch() is blocked.
    showError(e);
    return;
  }

  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function loop(t) {
    acc += Math.min(250, t - last);
    last = t;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    fpsFrames++;
    if (t - fpsTime >= 1000) { fps = Math.round(fpsFrames * 1000 / (t - fpsTime)); fpsFrames = 0; fpsTime = t; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start();
