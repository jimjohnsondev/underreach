// pixels.js
// Small helpers for changing and drawing a tile or sprite. A picture is a list of strings, one
// per pixel row, where each character is a palette key and '.' is see-through (the same format
// as art/tiles.json). None of these change the picture passed in; they return a new one.

export const TRANSPARENT = '.';

/** Returns a blank picture of the given size, all see-through. */
export function blankPicture(width, height) {
  return Array.from({ length: height }, () => TRANSPARENT.repeat(width));
}

/** Returns the palette key at x, y. */
export function keyAt(rows, x, y) {
  return rows[y][x];
}

/** Returns the picture with pixel x, y set to `key`. */
export function setPixel(rows, x, y, key) {
  if (rows[y][x] === key) return rows;
  const copy = [...rows];
  copy[y] = copy[y].slice(0, x) + key + copy[y].slice(x + 1);
  return copy;
}

/**
 * Returns the picture with the area around x, y that has the same key filled with `key`, like a
 * paint bucket. Only pixels touching side to side or up and down count as the same area.
 */
export function floodFill(rows, x, y, key) {
  const target = rows[y][x];
  if (target === key) return rows;
  const grid = rows.map(row => row.split(''));
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cy < 0 || cy >= grid.length || cx < 0 || cx >= grid[0].length) continue;
    if (grid[cy][cx] !== target) continue;
    grid[cy][cx] = key;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return grid.map(row => row.join(''));
}

/** Returns the picture flipped left to right. */
export function flipHorizontal(rows) {
  return rows.map(row => row.split('').reverse().join(''));
}

/** Returns the picture flipped upside down. */
export function flipVertical(rows) {
  return [...rows].reverse();
}

/** Returns the picture moved by dx, dy pixels; what falls off one edge comes back on the other. */
export function shift(rows, dx, dy) {
  const height = rows.length, width = rows[0].length;
  return rows.map((_, y) => {
    const source = rows[(y - dy + height) % height];
    return source.split('').map((_, x) => source[(x - dx + width) % width]).join('');
  });
}

/** Returns the set of palette keys a picture uses, not counting see-through. */
export function keysUsed(rows) {
  const keys = new Set(rows.join(''));
  keys.delete(TRANSPARENT);
  return keys;
}

/**
 * Draws a picture onto a 2D canvas context at x, y, one canvas pixel per picture pixel.
 * See-through pixels are left alone, so whatever was drawn first (like a ground tile) shows.
 * With `mirrored`, the picture is drawn flipped left to right.
 */
export function drawPicture(ctx, rows, colors, x = 0, y = 0, { mirrored = false } = {}) {
  const width = rows[0].length;
  rows.forEach((row, py) => {
    for (let px = 0; px < width; px++) {
      const key = row[px];
      if (key === TRANSPARENT || !colors[key]) continue;
      ctx.fillStyle = colors[key];
      ctx.fillRect(x + (mirrored ? width - 1 - px : px), y + py, 1, 1);
    }
  });
}
