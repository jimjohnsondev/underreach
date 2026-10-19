// art.js
// Loads the game's art from the JSON files in art/ and draws text in the 3x5 pixel font.
//
// Each tile and sprite is painted once, at load time, onto its own small canvas. Drawing it in the
// game is then a single drawImage call instead of painting it pixel by pixel every frame.

// Everything loaded from art/, filled in by loadArt().
export const art = {
  colors: {},    // palette key -> CSS color, e.g. 'g' -> '#1c3412'
  tiles: {},     // tile name -> 8x16 canvas
  sprites: {},   // sprite name -> 8x16 canvas, including left-facing copies made by mirroring
  font: null,    // the 3x5 font data as loaded from font-3x5.json
};

// In tiles and sprites, this palette key means "leave this pixel see-through".
const TRANSPARENT = '.';

/** Loads all the art files and prepares the tiles, sprites and font for drawing. */
export async function loadArt() {
  const [palette, tiles, sprites, font] = await Promise.all([
    loadJSON('art/palette.json'),
    loadJSON('art/tiles.json'),
    loadJSON('art/sprites.json'),
    loadJSON('art/font-3x5.json'),
  ]);

  art.colors = palette.colors;
  art.font = font;

  for (const [name, rows] of Object.entries(tiles.tiles)) {
    art.tiles[name] = paintImage(rows);
  }

  for (const [name, rows] of Object.entries(sprites.sprites)) {
    art.sprites[name] = paintImage(rows);
    // The art files only have right-facing frames; make the left-facing ones by flipping them.
    if (name.includes('_right_')) {
      art.sprites[name.replace('_right_', '_left_')] = paintImage(rows, { mirrored: true });
    }
  }
}

/** Fetches a JSON file and returns its contents, with a clear error if it can't be loaded. */
export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json();
}

/**
 * Paints a tile or sprite onto a new canvas and returns it. `rows` is a list of strings, one per
 * pixel row, where each character is a palette key. With `mirrored`, the image is flipped left to right.
 */
function paintImage(rows, { mirrored = false } = {}) {
  const width = rows[0].length;
  const image = document.createElement('canvas');
  image.width = width;
  image.height = rows.length;
  const g = image.getContext('2d');

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const key = row[x];
      if (key === TRANSPARENT) continue;
      const color = art.colors[key];
      if (!color) {
        console.warn(`Unknown palette key "${key}"`);
        continue;
      }
      g.fillStyle = color;
      g.fillRect(mirrored ? width - 1 - x : x, y, 1, 1);
    }
  });
  return image;
}

/** Returns how many pixels wide a string is in the 3x5 font. */
export function textWidth(text) {
  if (!text.length) return 0;
  // Each character moves the pen along by `advance`; the last one doesn't need its trailing gap.
  return text.length * art.font.advance - 1;
}

/**
 * Draws text in the 3x5 font with its top-left corner at x, y. Letters are drawn in upper case.
 * Characters the font doesn't have (such as "_") are left as blank spaces.
 *
 * In the font file each glyph is five numbers, one per row. Each number's bits say which of the
 * three columns are lit: 4 is the left column, 2 the middle and 1 the right.
 */
export function drawText(ctx, text, x, y, color) {
  const { glyphs, width, height, advance } = art.font;
  ctx.fillStyle = color;
  text = String(text).toUpperCase();

  for (let i = 0; i < text.length; i++) {
    const glyph = glyphs[text[i]];
    if (!glyph) continue;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const bit = 1 << (width - 1 - col);
        if (glyph[row] & bit) ctx.fillRect(x + i * advance + col, y + row, 1, 1);
      }
    }
  }
}
