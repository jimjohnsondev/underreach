// hud.js
// Draws the text on top of the game: the status strip across the top of the screen, and the
// debug overlay toggled with the ` key.
import { W } from './screen.js';
import { TILE_H } from './world.js';
import { art, drawText, textWidth } from './art.js';

const STRIP_H = TILE_H;          // the status strip is one tile tall
const STRIP_TEXT_Y = 6;          // puts the 5-pixel-tall text in the middle of the strip
const DEBUG_LINE_H = 6;

// Colors, as palette keys from art/palette.json.
const COLOR_STRIP = 'k';         // background
const COLOR_STATS = 'U';         // HP and level
const COLOR_MARKS = 'y';         // money
const COLOR_PLACE = 'N';         // region or location name
const COLOR_PROMPT = 'X';        // messages that replace the strip, like a townsperson's role
const COLOR_DEBUG = '9';         // debug overlay text

/**
 * Draws the status strip: HP, level and marks on the left and `placeName` (the region, or the
 * location you're in) on the right. If `prompt` is set, it replaces all of that, centered.
 */
export function renderStatusStrip(ctx, player, placeName, prompt) {
  const color = art.colors;
  ctx.fillStyle = color[COLOR_STRIP];
  ctx.fillRect(0, 0, W, STRIP_H);

  if (prompt) {
    const x = Math.round((W - textWidth(prompt)) / 2);
    drawText(ctx, prompt, x, STRIP_TEXT_Y, color[COLOR_PROMPT]);
    return;
  }

  const stats = `HP ${player.hp}/${player.maxHp}  LV ${player.level}`;
  const marks = `${player.marks} MK`;
  const marksX = 2 + textWidth(stats + '  ') + 1;
  drawText(ctx, stats, 2, STRIP_TEXT_Y, color[COLOR_STATS]);
  drawText(ctx, marks, marksX, STRIP_TEXT_Y, color[COLOR_MARKS]);
  drawText(ctx, placeName, W - 2 - textWidth(placeName), STRIP_TEXT_Y, color[COLOR_PLACE]);
}

/** Draws the debug overlay: a dark box under the status strip with one line of text per entry. */
export function renderDebugOverlay(ctx, lines) {
  const boxW = Math.max(...lines.map(textWidth)) + 4;
  const boxH = lines.length * DEBUG_LINE_H + 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, STRIP_H, boxW, boxH);
  lines.forEach((line, i) => {
    drawText(ctx, line, 2, STRIP_H + 2 + i * DEBUG_LINE_H, art.colors[COLOR_DEBUG]);
  });
}
