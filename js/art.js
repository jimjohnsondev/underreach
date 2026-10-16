// Loads the JSON art in art/ and turns each tile and sprite into a tiny offscreen canvas, so drawing is one drawImage.

export const art = {
  colors: {},    // palette key -> CSS color
  tiles: {},     // name -> canvas (8x16)
  sprites: {},   // name -> canvas (8x16), including generated *_left_* mirrors
  font: null,
};

async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

function paint(rows, mirror) {
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === '.') continue;
      const col = art.colors[key];
      if (!col) { console.warn(`Unknown palette key "${key}"`); continue; }
      g.fillStyle = col;
      g.fillRect(mirror ? row.length - 1 - x : x, y, 1, 1);
    }
  });
  return c;
}

export async function loadArt() {
  const [palette, tiles, sprites, font] = await Promise.all([
    loadJSON('art/palette.json'),
    loadJSON('art/tiles.json'),
    loadJSON('art/sprites.json'),
    loadJSON('art/font-3x5.json'),
  ]);
  art.colors = palette.colors;
  for (const [name, rows] of Object.entries(tiles.tiles)) art.tiles[name] = paint(rows);
  for (const [name, rows] of Object.entries(sprites.sprites)) {
    art.sprites[name] = paint(rows);
    // The art only has right-facing frames; left is the mirror image.
    if (name.includes('_right_')) art.sprites[name.replace('_right_', '_left_')] = paint(rows, true);
  }
  art.font = font;
}

export function textWidth(str) {
  return str.length ? str.length * art.font.advance - 1 : 0;
}

// Draws text in the 3x5 font. Characters the font lacks (like "_") are left as gaps.
export function drawText(ctx, str, x, y, color) {
  const { glyphs, width, height, advance } = art.font;
  ctx.fillStyle = color;
  str = String(str).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const g = glyphs[str[i]];
    if (!g) continue;
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++)
        if (g[r] & (1 << (width - 1 - c))) ctx.fillRect(x + i * advance + c, y + r, 1, 1);
  }
}
