// main.js
// Starts the game and runs it: loads the data, builds a world from a seed, then updates and
// draws every frame.
//
// The Wayfarer is always on one map: the world map, or the inside of a location he has entered.
// The screen shows a one-tile status strip at the top above a 20x11-tile view of that map, which
// scrolls to follow him. (A location's template can ask to flip a whole screen at a time instead,
// Atari-style.) Inside a location, its townspeople go about their business.
//
// The seed comes from the address bar (?seed=1234). Without one, a random seed is picked and
// put in the address bar, so reloading the page rebuilds the same world.
import { W, H, ctx, initScreen } from './screen.js';
import { readInput, onKey } from './input.js';
import { art, loadArt, loadJSON } from './art.js';
import { createWorld, TILE_W, TILE_H } from './world.js';
import {
  createPlayer, placePlayer, updatePlayer, drawPlayer, tileUnderFeet, feetBox, setFeetBox,
} from './player.js';
import { createNpcs, updateNpcs, npcObstacles, npcInReach, drawNpc } from './npcs.js';
import { generateWorld } from './gen/generate.js';
import { buildInterior } from './interior.js';
import { renderStatusStrip, renderDebugOverlay } from './hud.js';
import { makeOverview, drawOverview } from './overview.js';

// Screen layout, in game pixels.
const STRIP_H = TILE_H;          // the status strip is one tile tall
const VIEW_W = W;                // the map view below it: 20 tiles wide...
const VIEW_H = H - STRIP_H;      // ...and 11 tiles tall

// Timing, in game updates (60 per second).
const UPDATES_PER_SECOND = 60;
const ANIMATION_FRAME_TIME = 30; // animated tiles like water swap frames every half second
const BLINK_TIME = 20;
const MESSAGE_TIME = 150;        // a message in the status strip stays up for two and a half seconds

// A stick push smaller than this (out of 1) counts as letting go.
const STICK_RELEASED = 0.3;

// New random seeds are kept to six digits so they're easy to read out and type.
const MAX_RANDOM_SEED = 1000000;

let data;                        // everything loaded from data/
let overworld;                   // the world map
let world;                       // the map the Wayfarer is on now: the world map or an interior
let insideLocation = null;       // the location he's inside, or null on the world map
let npcs = [];                   // the townspeople of the location he's inside
let message = null;              // a message in the status strip, if any: { text, timeLeft }
// After walking into a location, he stands still until the stick is let go. Otherwise the
// direction held to walk in would carry him straight onto the exit, just below where he appears.
let waitForRelease = false;
let player;
let overview = null;             // the debug map overview image, made when first shown
let updateCount = 0;             // game updates since the game started; drives animation

let showDebug = false;
let showOverview = false;

// Frames-per-second counter for the debug overlay.
let fps = 0;
let framesThisSecond = 0;
let fpsTimer = performance.now();

onKey('Backquote', () => { showDebug = !showDebug; });
// The other debug keys only work while the debug overlay is showing, so they can't be hit by accident.
onKey('KeyN', () => { if (showDebug) startNewWorld(randomSeed()); });
onKey('KeyG', () => { if (showDebug) toggleAllGear(); });
onKey('KeyM', () => { if (showDebug) showOverview = !showOverview; });

start();

/** Sets up the screen, loads everything, builds the world, then starts the game loop. */
async function start() {
  initScreen();
  try {
    const [, worldgen, locations, terrain, gear, stats, npcSettings] = await Promise.all([
      loadArt(),
      loadJSON('data/worldgen.json'),
      loadJSON('data/locations.json'),
      loadJSON('data/terrain.json'),
      loadJSON('data/gear.json'),
      loadJSON('data/player.json'),
      loadJSON('data/npcs.json'),
    ]);
    data = {
      worldgen, locationTypes: locations.types, terrain, gear: gear.gear, npcSettings,
      templates: await loadTemplates(locations.types),
    };
    // Set the feet box first: it's shared by the Wayfarer and everyone else who walks.
    setFeetBox(stats.feet);
    player = createPlayer(stats);
    startNewWorld(seedFromAddress() ?? randomSeed());
  } catch (error) {
    showLoadError(error);
    return;
  }
  runGameLoop();
}

/** Loads every template named in the location types, from data/templates/, keyed by name. */
async function loadTemplates(locationTypes) {
  const names = [...new Set(Object.values(locationTypes).flatMap(type => type.templates || []))];
  const loaded = await Promise.all(names.map(name => loadJSON(`data/templates/${name}.json`)));
  return Object.fromEntries(names.map((name, i) => [name, loaded[i]]));
}

/** Builds the world for a seed, puts the Wayfarer at its start and records the seed in the address bar. */
function startNewWorld(seed) {
  const startTime = performance.now();
  const grid = generateWorld(seed, data);
  console.log(`World ${grid.seed} built in ${Math.round(performance.now() - startTime)} ms`);

  overworld = createWorld(grid, data.terrain);
  world = overworld;
  insideLocation = null;
  npcs = [];
  message = null;
  overview = null;
  placePlayer(player, overworld.start.x, overworld.start.y);

  const url = new URL(window.location.href);
  url.searchParams.set('seed', grid.seed);
  history.replaceState(null, '', url);
}

/** Returns the seed from the address bar (?seed=...), or null if there isn't one. */
function seedFromAddress() {
  const seed = new URLSearchParams(window.location.search).get('seed');
  return seed && seed.trim() ? seed : null;
}

/** Returns a new random seed. */
function randomSeed() {
  return Math.floor(Math.random() * MAX_RANDOM_SEED);
}

/** Debug: gives the Wayfarer every piece of gear, or takes it all away. */
function toggleAllGear() {
  if (player.gear.size) player.gear.clear();
  else Object.keys(data.gear).forEach(name => player.gear.add(name));
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

/**
 * Advances the game by one update: moves the Wayfarer and any townspeople, enters or leaves
 * locations, and handles talking to someone.
 */
function update() {
  updateCount++;
  const input = readInput();
  if (waitForRelease) {
    if (Math.hypot(input.x, input.y) < STICK_RELEASED) waitForRelease = false;
    else input.x = input.y = 0;
  }
  updateNpcs(npcs, world, player, data.npcSettings);
  updatePlayer(player, input, world, npcObstacles(npcs));

  if (message && --message.timeLeft <= 0) message = null;

  const { tx, ty } = tileUnderFeet(player);
  if (insideLocation) {
    if (world.tileRules(world.tileAt(tx, ty)).exit) {
      leaveLocation();
      return;
    }
    // Talking comes in milestone 4; for now, show who this is.
    const someone = input.action && npcInReach(npcs, player, data.npcSettings);
    if (someone) showMessage(someone.label);
  } else {
    // Walking onto a location takes him straight in.
    const here = world.locationAt(tx, ty);
    if (here) enterLocation(here);
  }
}

/** Shows a short message in the status strip for a couple of seconds. */
function showMessage(text) {
  message = { text, timeLeft: MESSAGE_TIME };
}

/** Takes the Wayfarer inside a location, and brings its townspeople out. */
function enterLocation(here) {
  insideLocation = here;
  const interior = buildInterior(here, data.locationTypes[here.type], overworld.seed, data.templates, overworld.tileRules);
  world = createWorld(interior, data.terrain);
  npcs = createNpcs(interior.npcs, data.npcSettings);
  message = null;
  waitForRelease = true;
  placePlayer(player, world.start.x, world.start.y, 'up');
}

/**
 * Takes the Wayfarer back out to the world map, just below the location he left, facing away
 * from it. (Standing on it would take him straight back in. The world generator makes sure the
 * tile below every location is open ground.)
 */
function leaveLocation() {
  world = overworld;
  npcs = [];
  message = null;
  placePlayer(player, insideLocation.x, insideLocation.y + 1, 'down');
  insideLocation = null;
}

/** Draws the whole screen. */
function render() {
  const { tx, ty } = tileUnderFeet(player);

  if (showDebug && showOverview) {
    overview ??= makeOverview(overworld);
    const where = insideLocation ? { tx: insideLocation.x, ty: insideLocation.y } : { tx, ty };
    const blinkOn = Math.floor(updateCount / BLINK_TIME) % 2 === 0;
    drawOverview(ctx, overview, overworld, where, { x: 0, y: STRIP_H, w: VIEW_W, h: VIEW_H }, blinkOn);
  } else {
    renderMap();
  }

  renderStatusStrip(ctx, player, world.regionAt(tx, ty), message ? message.text : null);
  if (showDebug) renderDebugOverlay(ctx, debugLines(tx, ty));
}

/** The lines shown in the debug overlay. */
function debugLines(tx, ty) {
  return [
    `X ${tx} Y ${ty}`,
    world.tileAt(tx, ty).replace(/_/g, ' '),   // the font has no underscore
    `FPS ${fps}`,
    `SEED ${overworld.seed}`,
    `GEAR ${player.gear.size ? 'ALL' : 'NONE'}`,
    'N NEW  G GEAR  M MAP',
  ];
}

/**
 * Works out which part of the map to show. On a 'follow' map the view is centered on the
 * Wayfarer; on a 'flip' map it's whichever whole screen his feet are on. Either way it stops at
 * the map's edges. Returns the view's top-left corner and the Wayfarer's position, in whole pixels.
 */
function getCamera() {
  // Round the Wayfarer's position first, so he never jitters against the scenery.
  const px = Math.round(player.x);
  const py = Math.round(player.y);
  let viewX, viewY;
  if (world.camera === 'flip') {
    // He changes screen when the middle of his feet crosses the edge.
    const feet = feetBox(px, py);
    viewX = Math.floor((feet.x + feet.w / 2) / VIEW_W) * VIEW_W;
    viewY = Math.floor((feet.y + feet.h / 2) / VIEW_H) * VIEW_H;
  } else {
    viewX = px + TILE_W / 2 - VIEW_W / 2;
    viewY = py + TILE_H / 2 - VIEW_H / 2;
  }
  viewX = clamp(viewX, 0, world.pixelWidth - VIEW_W);
  viewY = clamp(viewY, 0, world.pixelHeight - VIEW_H);
  return { viewX, viewY, px, py };
}

/** Draws the visible tiles, the townspeople and the Wayfarer in the area below the status strip. */
function renderMap() {
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
      drawTile(tx, ty, tx * TILE_W - viewX, STRIP_H + ty * TILE_H - viewY);
    }
  }

  // Draw people from the top of the screen down, so someone standing lower (nearer the viewer)
  // overlaps whoever is behind them.
  const people = [
    ...npcs.map(npc => ({ y: npc.y, draw: () => drawNpc(ctx, npc, Math.round(npc.x) - viewX, STRIP_H + Math.round(npc.y) - viewY, data.npcSettings) })),
    { y: py, draw: () => drawPlayer(ctx, player, px - viewX, STRIP_H + py - viewY) },
  ];
  people.sort((a, b) => a.y - b.y).forEach(person => person.draw());
  ctx.restore();
}

/**
 * Draws map tile tx, ty at screen position x, y. A tile with see-through pixels (a village,
 * a tree) gets the ground it stands on drawn first, so it doesn't sit on a black square.
 */
function drawTile(tx, ty, x, y) {
  const name = imageNameFor(world.tileAt(tx, ty));
  if (art.seeThroughTiles.has(name)) {
    const ground = world.groundAt(tx, ty);
    if (ground) ctx.drawImage(tileImage(imageNameFor(ground)), x, y);
  }
  ctx.drawImage(tileImage(name), x, y);
}

/**
 * Returns which picture a tile uses. A tile with "image" in terrain.json always uses that tile's
 * picture. Otherwise it uses its own, or its "standIn" if it has no art yet (new tiles can be
 * played with before they're drawn, and switch over as soon as art/tiles.json has them).
 */
function imageNameFor(tile) {
  const rules = world.tileRules(tile);
  if (rules.image) return rules.image;
  if (!art.tiles[tile] && rules.standIn) return rules.standIn;
  return tile;
}

/** Returns the picture for an image name. Ones with a second frame like "water_2" swap between the two. */
function tileImage(imageName) {
  const secondFrame = Math.floor(updateCount / ANIMATION_FRAME_TIME) % 2 === 1;
  if (secondFrame && art.tiles[`${imageName}_2`]) return art.tiles[`${imageName}_2`];
  return art.tiles[imageName] || art.tiles.void;
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
