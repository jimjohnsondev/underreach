// text.js
// Helpers for the text screens (dialog, journal, pack): wrapping text to fit a width, and
// drawing framed boxes, all in the 3x5 font on the 160x192 screen.
import { art, drawText, textWidth } from '../art.js';

export const LINE_H = 7;

/** How far each character moves the pen, from the font file (4 pixels for the 3x5 font). */
export function charWidth() {
  return art.font.advance;
}

/** How many characters fit in `width` pixels. */
export function charsThatFit(width) {
  return Math.floor(width / charWidth());
}

/**
 * Splits text into lines of at most `maxChars` characters, breaking at spaces. A word longer
 * than a line is split where it has to be.
 */
export function wrapText(text, maxChars) {
  const lines = [];
  let line = '';
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (word.length > maxChars) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Draws a filled box with a one-pixel border. Colors are palette keys. */
export function drawFrame(ctx, x, y, w, h, fill, border) {
  ctx.fillStyle = art.colors[border];
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = art.colors[fill];
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

/** Draws text in a palette color. */
export function write(ctx, text, x, y, colorKey) {
  drawText(ctx, text, x, y, art.colors[colorKey]);
}

/** Draws text so it ends at x (right-aligned). */
export function writeRight(ctx, text, x, y, colorKey) {
  drawText(ctx, text, x - textWidth(text), y, art.colors[colorKey]);
}

/** Draws text centered on x. */
export function writeCentered(ctx, text, x, y, colorKey) {
  drawText(ctx, text, Math.round(x - textWidth(text) / 2), y, art.colors[colorKey]);
}
