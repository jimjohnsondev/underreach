// editor.js
// The tile and sprite editor: pick a tile or sprite from the list, paint it on the big grid with
// colors from the palette, check it in the previews, and save it back into art/. Saving goes
// through the editor's own little server (server.js), since a web page can't write files.
//
// The big grid and every preview use 2:1 wide pixels, like the game's Atari screen, so what you
// draw here is the shape you'll see in the game.
import {
  TRANSPARENT, blankPicture, keyAt, setPixel, floodFill, flipHorizontal, flipVertical,
  shift, keysUsed, drawPicture,
} from './pixels.js';

// Size of one picture pixel on the big grid, in screen pixels: twice as wide as tall.
const CELL_W = 40;
const CELL_H = 20;
const ANIMATION_TIME = 500;   // the game swaps animation frames every half second
// Names must start with a letter: a number-like name would be moved to the top of the file.
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

const byId = id => document.getElementById(id);
const ui = {
  status: byId('status'), saveBtn: byId('saveBtn'), filter: byId('filter'), list: byId('itemList'),
  itemName: byId('itemName'), grid: byId('grid'), hover: byId('hover'), gridLines: byId('gridLines'),
  palette: byId('palette'), newKey: byId('newKey'), newColor: byId('newColor'), editColor: byId('editColor'),
  previewOne: byId('previewOne'), previewTiled: byId('previewTiled'), previewAnim: byId('previewAnim'),
  animCaption: byId('animCaption'), previewMirror: byId('previewMirror'), mirrorFigure: byId('mirrorFigure'),
  groundSelect: byId('groundSelect'), undoBtn: byId('undoBtn'), redoBtn: byId('redoBtn'),
};

const state = {
  files: { tiles: null, sprites: null, palette: null },  // the three art files as loaded
  paletteOrder: [],          // palette keys in the order palette.json lists them
  kind: 'tiles',             // which list is showing: 'tiles' or 'sprites'
  name: null,                // the picture being edited
  tool: 'pencil',
  color: null,               // the palette key painting with; '.' paints see-through
  ground: 'grass',           // tile drawn under see-through pixels in the previews
  unsaved: new Set(),        // which files have changes: 'tiles', 'sprites', 'palette'
  changed: { tiles: new Set(), sprites: new Set() },   // pictures changed since the last save
  history: new Map(),        // undo and redo lists, per picture
  stroke: null,              // the picture as it was when the current pencil stroke began
  lastCell: null,            // the last grid cell painted during a stroke
  animFrame: 0,
};

start();

/** Loads the art files and sets up the page. */
async function start() {
  try {
    const [tiles, sprites, paletteText] = await Promise.all([
      fetchJSON('/art/tiles.json'),
      fetchJSON('/art/sprites.json'),
      fetch('/art/palette.json', { cache: 'no-store' }).then(r => r.text()),
    ]);
    state.files = { tiles, sprites, palette: JSON.parse(paletteText) };
    state.paletteOrder = paletteKeyOrder(paletteText);
    state.color = state.paletteOrder[0];
  } catch (error) {
    ui.status.textContent = `Couldn't load the art files: ${error.message}`;
    return;
  }

  wireUpControls();
  selectKind('tiles');
  renderGroundChoices();
  renderPalette();
  updateStatus();
  setInterval(() => { state.animFrame ^= 1; renderAnimation(); }, ANIMATION_TIME);
}

/** Fetches a JSON file, always the version on disk now. */
async function fetchJSON(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

/**
 * Returns the palette keys in the order the file lists them. Reading the parsed object would
 * put the number keys 0-9 first, because that's how JavaScript orders number-like keys.
 */
function paletteKeyOrder(text) {
  return [...text.matchAll(/^\s*("(?:[^"\\]|\\.)+")\s*:\s*"#/gm)].map(m => JSON.parse(m[1]));
}

// ---- Looking things up ----

/** The pictures in the list showing now, by name. */
function pictures() {
  return state.files[state.kind][state.kind];
}

/** The picture being edited, as a list of row strings. */
function current() {
  return pictures()[state.name];
}

/** The size of pictures in the list showing now (8x16 for both files today). */
function pictureSize() {
  const file = state.files[state.kind];
  return { width: file.width, height: file.height };
}

/** The palette as key -> CSS color. */
function colors() {
  return state.files.palette.colors;
}

/** The undo and redo lists for the picture being edited. */
function historyFor(kind = state.kind, name = state.name) {
  const id = `${kind}:${name}`;
  if (!state.history.has(id)) state.history.set(id, { undo: [], redo: [] });
  return state.history.get(id);
}

// ---- Changing the picture ----

/** Replaces the picture being edited, without touching undo. */
function setCurrent(rows) {
  pictures()[state.name] = rows;
}

/** Makes one change that can be undone: `change` gets the picture and returns the new one. */
function edit(change) {
  if (!state.name) return;   // nothing selected, e.g. after deleting the last picture
  const before = current();
  const after = change(before);
  if (after === before || after.join('') === before.join('')) return;
  rememberForUndo(before);
  setCurrent(after);
  markChanged();
  renderPicture();
}

/** Records `rows` as the state to go back to on undo, and forgets anything to redo. */
function rememberForUndo(rows) {
  const history = historyFor();
  history.undo.push(rows);
  history.redo.length = 0;
}

/** Notes that the picture being edited (and its file) have unsaved changes. */
function markChanged(file = state.kind) {
  state.unsaved.add(file);
  if (file === state.kind) state.changed[state.kind].add(state.name);
  updateStatus();
}

/** Goes back one change on the picture being edited. */
function undo() {
  if (!state.name) return;
  const history = historyFor();
  if (!history.undo.length) return;
  history.redo.push(current());
  setCurrent(history.undo.pop());
  markChanged();
  renderPicture();
}

/** Redoes the last change that was undone. */
function redo() {
  if (!state.name) return;
  const history = historyFor();
  if (!history.redo.length) return;
  history.undo.push(current());
  setCurrent(history.redo.pop());
  markChanged();
  renderPicture();
}

// ---- Painting on the grid ----

/** Returns the picture pixel under a pointer event, or null if it's outside the grid. */
function cellFromEvent(event) {
  const box = ui.grid.getBoundingClientRect();
  const { width, height } = pictureSize();
  const x = Math.floor((event.clientX - box.left) / box.width * width);
  const y = Math.floor((event.clientY - box.top) / box.height * height);
  return x >= 0 && y >= 0 && x < width && y < height ? { x, y } : null;
}

/** Starts painting, filling or picking where the pointer went down. */
function onGridDown(event) {
  const cell = cellFromEvent(event);
  if (!cell || !state.name) return;
  event.preventDefault();
  const key = event.button === 2 ? TRANSPARENT : state.color;

  if (state.tool === 'picker') {
    selectColor(keyAt(current(), cell.x, cell.y));
  } else if (state.tool === 'fill') {
    edit(rows => floodFill(rows, cell.x, cell.y, key));
  } else {
    ui.grid.setPointerCapture(event.pointerId);
    state.stroke = { before: current(), key };
    state.lastCell = null;
    paintTo(cell);
  }
}

/** Keeps painting while the pointer moves with the button held, and shows what's under it. */
function onGridMove(event) {
  const cell = cellFromEvent(event);
  showHover(cell);
  if (state.stroke && cell) paintTo(cell);
}

/** Finishes a pencil stroke, making the whole stroke one undo step. */
function onGridUp() {
  if (!state.stroke) return;
  const { before } = state.stroke;
  state.stroke = null;
  if (before.join('') === current().join('')) return;
  rememberForUndo(before);
  markChanged();
  renderPicture();
}

/**
 * Paints from the last cell of the stroke to `cell`, filling in the cells between, so a fast
 * drag still draws a solid line instead of a few dots.
 */
function paintTo(cell) {
  const from = state.lastCell || cell;
  const steps = Math.max(Math.abs(cell.x - from.x), Math.abs(cell.y - from.y), 1);
  let rows = current();
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(from.x + (cell.x - from.x) * s / steps);
    const y = Math.round(from.y + (cell.y - from.y) * s / steps);
    rows = setPixel(rows, x, y, state.stroke.key);
  }
  state.lastCell = cell;
  setCurrent(rows);
  renderGrid();
  renderPreviews();
}

/** Shows the pixel position and color key under the pointer. */
function showHover(cell) {
  if (!cell || !state.name) {
    ui.hover.textContent = '';
    return;
  }
  const key = keyAt(current(), cell.x, cell.y);
  const what = key === TRANSPARENT ? 'see-through' : `color "${key}" ${colors()[key] || '(missing)'}`;
  ui.hover.textContent = `x ${cell.x}, y ${cell.y}: ${what}`;
}

// ---- The list of tiles or sprites ----

/** Switches between the tiles list and the sprites list. */
function selectKind(kind) {
  state.kind = kind;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('on', tab.dataset.kind === kind));
  const names = Object.keys(pictures());
  selectPicture(names.includes(state.name) ? state.name : names[0]);
}

/** Starts editing the picture with this name. */
function selectPicture(name) {
  state.name = name || null;
  state.stroke = null;
  renderList();
  renderPicture();
}

/** Asks for a name for a new or renamed picture. Returns null if cancelled or not allowed. */
function askForName(message, suggestion) {
  const name = prompt(`${message}\nLower-case letters, digits and _ only, starting with a letter.`, suggestion);
  if (name === null) return null;
  const trimmed = name.trim();
  if (!NAME_PATTERN.test(trimmed)) {
    alert(`"${trimmed}" isn't a valid name.`);
    return null;
  }
  if (trimmed in pictures()) {
    alert(`There's already a ${state.kind === 'tiles' ? 'tile' : 'sprite'} called "${trimmed}".`);
    return null;
  }
  return trimmed;
}

/** Adds a new blank picture. */
function newPicture() {
  const name = askForName('Name for the new picture:', '');
  if (!name) return;
  const { width, height } = pictureSize();
  pictures()[name] = blankPicture(width, height);
  state.name = name;
  markChanged();
  selectPicture(name);
}

/** Adds a copy of the picture being edited under a new name. */
function copyPicture() {
  if (!state.name) return;
  const name = askForName('Name for the copy:', `${state.name}_copy`);
  if (!name) return;
  pictures()[name] = [...current()];
  state.name = name;
  markChanged();
  selectPicture(name);
}

/**
 * Renames the picture being edited, keeping its place in the file. The game and the data files
 * find pictures by name, so this asks first.
 */
function renamePicture() {
  if (!state.name) return;
  const name = askForName(`Rename "${state.name}" to:`, state.name);
  if (!name) return;
  const sure = confirm(`The game and the data files find pictures by name. Anything that uses "${state.name}" `
    + 'will need changing by hand. Rename anyway?');
  if (!sure) return;

  const file = state.files[state.kind];
  const renamed = {};
  for (const [key, rows] of Object.entries(file[state.kind])) renamed[key === state.name ? name : key] = rows;
  file[state.kind] = renamed;

  state.history.set(`${state.kind}:${name}`, historyFor());
  state.history.delete(`${state.kind}:${state.name}`);
  state.changed[state.kind].delete(state.name);
  state.name = name;
  markChanged();
  selectPicture(name);
}

/** Deletes the picture being edited, after asking. */
function deletePicture() {
  if (!state.name) return;
  if (!confirm(`Delete "${state.name}"? The game will draw nothing where it's used. (Nothing is written until you save.)`)) return;
  const names = Object.keys(pictures());
  const next = names[names.indexOf(state.name) + 1] || names[names.indexOf(state.name) - 1];
  delete pictures()[state.name];
  state.changed[state.kind].delete(state.name);
  state.unsaved.add(state.kind);
  updateStatus();
  selectPicture(next);
}

// ---- The palette ----

/** Starts painting with this palette key ('.' for see-through). */
function selectColor(key) {
  state.color = key;
  renderPalette();
}

/** Opens the color chooser to change the color of `key`. */
function startEditingColor(key) {
  ui.editColor.dataset.key = key;
  ui.editColor.value = colors()[key];
  // showPicker() is the reliable way to open it; older browsers only have click().
  try {
    ui.editColor.showPicker();
  } catch {
    ui.editColor.click();
  }
}

/** Applies a changed palette color. Every picture using it changes too. */
function finishEditingColor() {
  const key = ui.editColor.dataset.key;
  if (!key) return;
  colors()[key] = ui.editColor.value;
  markChanged('palette');
  renderPalette();
  renderList();
  renderPicture();
}

/** Adds a new color to the palette from the "add color" inputs. */
function addColor() {
  const key = ui.newKey.value;
  if (key.length !== 1 || key === TRANSPARENT || key === '"' || key === '\\') {
    alert('A color key is one character, and can\'t be . (see-through), " or \\.');
    return;
  }
  if (key in colors()) {
    alert(`The palette already has a color "${key}". Double-click it to change it.`);
    return;
  }
  colors()[key] = ui.newColor.value;
  state.paletteOrder.push(key);
  ui.newKey.value = '';
  markChanged('palette');
  selectColor(key);
}

// ---- Saving ----

/** Saves every file with changes. */
async function save() {
  if (!state.unsaved.size) return;
  ui.saveBtn.disabled = true;
  ui.status.textContent = 'Saving…';
  try {
    for (const file of [...state.unsaved]) {
      const response = await fetch(`/save/${file}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.files[file]),
      });
      if (!response.ok) throw new Error(`${file}: ${await response.text()}`);
      state.unsaved.delete(file);
      if (file in state.changed) state.changed[file].clear();
    }
    ui.status.textContent = 'Saved';
  } catch (error) {
    ui.status.textContent = `Save failed: ${error.message}`;
  }
  updateStatus({ keepMessage: true });
  renderList();
}

/** Shows whether there are unsaved changes, and enables the save button to match. */
function updateStatus({ keepMessage = false } = {}) {
  const count = state.unsaved.size;
  ui.saveBtn.disabled = count === 0;
  ui.status.classList.toggle('dirty', count > 0);
  if (keepMessage && count === 0) return;
  ui.status.textContent = count
    ? `Unsaved changes in ${[...state.unsaved].map(f => `${f}.json`).join(', ')}`
    : 'All changes saved';
}

// ---- Drawing the page ----

/** Redraws everything that shows the picture being edited. */
function renderPicture() {
  ui.itemName.textContent = state.name || '–';
  const history = state.name ? historyFor() : { undo: [], redo: [] };
  ui.undoBtn.disabled = !history.undo.length;
  ui.redoBtn.disabled = !history.redo.length;
  renderGrid();
  renderPreviews();
  renderPalette();
  renderList();
}

/** Draws the big grid: each picture pixel as a 2:1 cell, see-through ones as a checkerboard. */
function renderGrid() {
  const { width, height } = pictureSize();
  ui.grid.width = width * CELL_W;
  ui.grid.height = height * CELL_H;
  const g = ui.grid.getContext('2d');
  g.clearRect(0, 0, ui.grid.width, ui.grid.height);
  if (!state.name) return;

  const rows = current();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = rows[y][x];
      if (key === TRANSPARENT || !colors()[key]) {
        drawChecker(g, x * CELL_W, y * CELL_H);
      } else {
        g.fillStyle = colors()[key];
        g.fillRect(x * CELL_W, y * CELL_H, CELL_W, CELL_H);
      }
    }
  }

  if (ui.gridLines.checked) {
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 1; x < width; x++) { g.moveTo(x * CELL_W + 0.5, 0); g.lineTo(x * CELL_W + 0.5, ui.grid.height); }
    for (let y = 1; y < height; y++) { g.moveTo(0, y * CELL_H + 0.5); g.lineTo(ui.grid.width, y * CELL_H + 0.5); }
    g.stroke();
  }
}

/** Draws a small checkerboard in one grid cell, the usual sign for "see-through". */
function drawChecker(g, x, y) {
  const half = CELL_H / 2;
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < CELL_W / half; cx++) {
      g.fillStyle = (cx + cy) % 2 ? '#2a2a2a' : '#3a3a3a';
      g.fillRect(x + cx * half, y + cy * half, half, half);
    }
  }
}

/** Draws a picture onto a preview canvas at x, y, with the chosen ground under it. */
function drawWithGround(g, rows, x, y, options) {
  const ground = state.files.tiles.tiles[state.ground];
  if (ground && rows.some(row => row.includes(TRANSPARENT))) drawPicture(g, ground, colors(), x, y);
  drawPicture(g, rows, colors(), x, y, options);
}

/** Redraws the actual-size, tiled and mirrored previews. */
function renderPreviews() {
  const { width, height } = pictureSize();
  const one = ui.previewOne.getContext('2d');
  const tiled = ui.previewTiled.getContext('2d');
  one.clearRect(0, 0, width, height);
  tiled.clearRect(0, 0, width * 3, height * 3);
  ui.mirrorFigure.hidden = !(state.kind === 'sprites' && state.name && state.name.includes('_right_'));
  if (!state.name) return;

  drawWithGround(one, current(), 0, 0);
  for (let ty = 0; ty < 3; ty++) {
    for (let tx = 0; tx < 3; tx++) drawWithGround(tiled, current(), tx * width, ty * height);
  }
  if (!ui.mirrorFigure.hidden) {
    const mirror = ui.previewMirror.getContext('2d');
    mirror.clearRect(0, 0, width, height);
    drawWithGround(mirror, current(), 0, 0, { mirrored: true });
  }
  renderAnimation();
}

/**
 * Returns the animation frames for the picture being edited, the way the game pairs them:
 * a tile "water" with "water_2", or a sprite "imp_1" with "imp_2".
 */
function animationFrames() {
  const all = pictures(), name = state.name;
  if (!name) return [];
  if (state.kind === 'tiles') {
    const base = name.endsWith('_2') ? name.slice(0, -2) : name;
    return all[base] && all[`${base}_2`] ? [base, `${base}_2`] : [name];
  }
  const match = name.match(/^(.*)_([12])$/);
  if (match && all[`${match[1]}_1`] && all[`${match[1]}_2`]) return [`${match[1]}_1`, `${match[1]}_2`];
  return [name];
}

/** Draws the current animation frame, so you can see the two frames swap like in the game. */
function renderAnimation() {
  if (!state.files.tiles) return;
  const { width, height } = pictureSize();
  const g = ui.previewAnim.getContext('2d');
  g.clearRect(0, 0, width, height);
  const frames = animationFrames();
  if (!frames.length) return;
  const frame = frames[state.animFrame % frames.length];
  drawWithGround(g, pictures()[frame], 0, 0);
  ui.animCaption.textContent = frames.length > 1 ? `FRAMES ${frames.indexOf(frame) + 1}/2` : 'ONE FRAME';
}

/** Redraws the list of pictures, with thumbnails, filtered by the search box. */
function renderList() {
  const filter = ui.filter.value.trim().toLowerCase();
  const { width, height } = pictureSize();
  ui.list.replaceChildren();

  for (const [name, rows] of Object.entries(pictures())) {
    if (filter && !name.includes(filter)) continue;
    const item = document.createElement('li');
    item.classList.toggle('on', name === state.name);
    item.classList.toggle('changed', state.changed[state.kind].has(name));
    item.addEventListener('click', () => selectPicture(name));

    const thumb = document.createElement('canvas');
    thumb.width = width;
    thumb.height = height;
    drawPicture(thumb.getContext('2d'), rows, colors());

    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;
    item.append(thumb, label);
    ui.list.append(item);
  }
}

/** Redraws the palette swatches, marking the selected one and the ones this picture uses. */
function renderPalette() {
  const used = state.name ? keysUsed(current()) : new Set();
  ui.palette.replaceChildren();

  for (const key of [TRANSPARENT, ...state.paletteOrder]) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.textContent = key;
    swatch.title = key === TRANSPARENT ? 'See-through' : `"${key}" ${colors()[key]}`;
    if (key === TRANSPARENT) swatch.classList.add('clear');
    else swatch.style.background = colors()[key];
    swatch.classList.toggle('on', key === state.color);
    swatch.classList.toggle('used', used.has(key));
    swatch.addEventListener('click', () => selectColor(key));
    if (key !== TRANSPARENT) swatch.addEventListener('dblclick', () => startEditingColor(key));
    ui.palette.append(swatch);
  }
}

/** Fills the ground menu with every tile, plus "none". */
function renderGroundChoices() {
  const options = ['', ...Object.keys(state.files.tiles.tiles)];
  ui.groundSelect.replaceChildren(...options.map(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name || '(none: black)';
    option.selected = name === state.ground;
    return option;
  }));
}

// ---- Controls ----

/** Connects the buttons, keys and grid to the functions above. */
function wireUpControls() {
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => selectKind(tab.dataset.kind)));
  document.querySelectorAll('.tool').forEach(button => button.addEventListener('click', () => selectTool(button.dataset.tool)));
  document.querySelectorAll('[data-shift]').forEach(button => button.addEventListener('click', () => {
    const [dx, dy] = button.dataset.shift.split(',').map(Number);
    edit(rows => shift(rows, dx, dy));
  }));

  ui.filter.addEventListener('input', renderList);
  byId('newBtn').addEventListener('click', newPicture);
  byId('copyBtn').addEventListener('click', copyPicture);
  byId('renameBtn').addEventListener('click', renamePicture);
  byId('deleteBtn').addEventListener('click', deletePicture);
  ui.undoBtn.addEventListener('click', undo);
  ui.redoBtn.addEventListener('click', redo);
  byId('flipHBtn').addEventListener('click', () => edit(flipHorizontal));
  byId('flipVBtn').addEventListener('click', () => edit(flipVertical));
  ui.gridLines.addEventListener('change', renderGrid);
  ui.saveBtn.addEventListener('click', save);
  byId('addColorBtn').addEventListener('click', addColor);
  ui.editColor.addEventListener('change', finishEditingColor);
  ui.groundSelect.addEventListener('change', () => { state.ground = ui.groundSelect.value; renderPreviews(); });

  ui.grid.addEventListener('pointerdown', onGridDown);
  ui.grid.addEventListener('pointermove', onGridMove);
  ui.grid.addEventListener('pointerup', onGridUp);
  ui.grid.addEventListener('pointercancel', onGridUp);
  ui.grid.addEventListener('pointerleave', () => showHover(null));
  ui.grid.addEventListener('contextmenu', event => event.preventDefault());

  addEventListener('keydown', onKey);
  // Warn before closing the page with unsaved work.
  addEventListener('beforeunload', event => {
    if (state.unsaved.size) event.preventDefault();
  });
}

/** Switches the grid tool: 'pencil', 'fill' or 'picker'. */
function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool').forEach(button => button.classList.toggle('on', button.dataset.tool === tool));
}

/** Keyboard shortcuts. Ignored while typing in a text box. */
function onKey(event) {
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
  const ctrl = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (ctrl && key === 's') {
    event.preventDefault();
    save();
  } else if (typing) {
    return;
  } else if (ctrl && key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  } else if (ctrl && key === 'y') {
    event.preventDefault();
    redo();
  } else if (!ctrl && key === 'p') {
    selectTool('pencil');
  } else if (!ctrl && key === 'f') {
    selectTool('fill');
  } else if (!ctrl && key === 'i') {
    selectTool('picker');
  }
}
