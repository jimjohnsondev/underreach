// screen.js
// Sets up the game screen and keeps it sized to fit the browser window.
//
// The game draws on a 160x192 canvas, the resolution of an Atari 800. The CSS shows that canvas
// at twice the width (320x192), so every pixel is twice as wide as it is tall, like on the Atari.

// Size of the game screen in game pixels.
export const W = 160;
export const H = 192;

// Size of the screen on the page before scaling: double width for the wide pixels.
const DISPLAY_W = 320;
const DISPLAY_H = 192;

// Where the rainbow band sits behind the screen, as a fraction of the screen's height.
const BAND_POSITION = 0.64;

const byId = id => document.getElementById(id);

export const canvas = byId('screen');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const body = document.body;
const stage = byId('stage');
const screenCell = byId('screenCell');
const bezel = byId('bezel');
const band = byId('band');

// True when the player is using a touchscreen, which shows the on-screen thumbstick and button.
let isTouch = matchMedia('(pointer: coarse)').matches;

/** Switches touch mode on or off and redoes the layout if it changed. */
export function setTouch(on) {
  if (isTouch === on) return;
  isTouch = on;
  layout();
}

/** Works out how big the screen can be and resizes the canvas and the rainbow band to match. */
function layout() {
  body.classList.toggle('touch', isTouch);
  const portrait = innerHeight >= innerWidth;
  body.classList.toggle('portrait', portrait);
  body.classList.toggle('landscape', !portrait);

  // Space the bezel takes up around the canvas.
  const bezelW = bezel.offsetWidth - canvas.offsetWidth;
  const bezelH = bezel.offsetHeight - canvas.offsetHeight;

  // The largest scale that fits the space available.
  const fitScale = Math.min(
    (screenCell.clientWidth - bezelW) / DISPLAY_W,
    (screenCell.clientHeight - bezelH) / DISPLAY_H,
  );

  const scale = chooseScale(fitScale);
  canvas.style.width = (DISPLAY_W * scale) + 'px';
  canvas.style.height = (DISPLAY_H * scale) + 'px';

  // Keep the rainbow band lined up with the screen.
  const stageBox = stage.getBoundingClientRect();
  const canvasBox = canvas.getBoundingClientRect();
  band.style.top = (canvasBox.top - stageBox.top + canvasBox.height * BAND_POSITION) + 'px';
}

/**
 * Picks the final scale from the largest scale that fits.
 *
 * On desktop the scale is rounded down so every game pixel covers a whole number of real screen
 * pixels, which keeps the picture sharp and even. On phones that rounding can waste a third of the
 * width, so phones use the full size instead; at phone pixel densities the slight unevenness is hard to see.
 */
function chooseScale(fitScale) {
  const dpr = window.devicePixelRatio || 1;
  const tooSmallToRound = fitScale * dpr < 1;
  if (isTouch || tooSmallToRound) return Math.max(fitScale, 0.25);
  return Math.floor(fitScale * dpr) / dpr;
}

/** Lays out the screen now and again whenever the window size, orientation or input type changes. */
export function initScreen() {
  // A laptop with a touchscreen starts in keyboard mode; the first touch switches to touch controls.
  addEventListener('touchstart', () => setTouch(true), { passive: true });
  new ResizeObserver(layout).observe(stage);
  // Some phones report the new size a moment after the orientation change, so wait briefly.
  addEventListener('orientationchange', () => setTimeout(layout, 120));
  layout();
  // The bezel's name plate uses a web font; once it loads the bezel size can change slightly.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
}
