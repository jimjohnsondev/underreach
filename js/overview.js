// overview.js
// A debug view of the whole world map at once, one dot per tile, for checking what the
// generator made. Each tile is shown in the average color of its picture; locations are bright
// dots and the Wayfarer is a blinking red dot. Toggled from the debug overlay.
import { art } from './art.js';

// Colors, as palette keys from art/palette.json.
const COLOR_LOCATION = 'Z';
const COLOR_PLAYER = 'c';
const COLOR_BACKGROUND = 'k';

/** Returns a canvas with one pixel per tile of the world. Make a new one for each new world. */
export function makeOverview(world) {
  const image = document.createElement('canvas');
  image.width = world.width;
  image.height = world.height;
  const g = image.getContext('2d');
  const tileColors = {};

  for (let ty = 0; ty < world.height; ty++) {
    for (let tx = 0; tx < world.width; tx++) {
      const name = world.tileAt(tx, ty);
      if (world.locationAt(tx, ty)) {
        g.fillStyle = art.colors[COLOR_LOCATION];
      } else {
        tileColors[name] ??= averageColor(art.tiles[name] || art.tiles.void);
        g.fillStyle = tileColors[name];
      }
      g.fillRect(tx, ty, 1, 1);
    }
  }
  return image;
}

/**
 * Draws the overview into the area { x, y, w, h } of the screen, as large as fits.
 * A tile is twice as tall as it is wide in game pixels (it looks square on the wide-pixel
 * screen), so each tile gets half as many game pixels across as it does down.
 */
export function drawOverview(ctx, overview, world, playerTile, area, blinkOn) {
  ctx.fillStyle = art.colors[COLOR_BACKGROUND];
  ctx.fillRect(area.x, area.y, area.w, area.h);

  const scale = Math.min(area.w / (world.width / 2), area.h / world.height);
  const w = Math.floor(world.width / 2 * scale);
  const h = Math.floor(world.height * scale);
  const x = area.x + Math.floor((area.w - w) / 2);
  const y = area.y + Math.floor((area.h - h) / 2);
  ctx.drawImage(overview, x, y, w, h);

  if (blinkOn) {
    ctx.fillStyle = art.colors[COLOR_PLAYER];
    const px = x + Math.floor(playerTile.tx / world.width * w);
    const py = y + Math.floor(playerTile.ty / world.height * h);
    ctx.fillRect(px - 1, py - 1, 2, 3);
  }
}

/** Returns the average color of an image as a CSS color, ignoring see-through pixels. */
function averageColor(image) {
  const pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    count++;
  }
  if (!count) return '#000';
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
}
