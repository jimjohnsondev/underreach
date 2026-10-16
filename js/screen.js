// The Atari screen: a 160x192 canvas the CSS stretches to 320x192, so every pixel is twice as wide as tall.
// Layout is copied from the Myriapod reference: snap the scale so each pixel lands on whole device pixels.

export const W = 160, H = 192;

const $ = id => document.getElementById(id);
export const canvas = $('screen');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const body = document.body, stage = $('stage'), cell = $('screenCell'), bezel = $('bezel'), band = $('band');

let isTouch = matchMedia('(pointer: coarse)').matches;

// A desktop with a touchscreen starts as non-touch; the first touch switches the on-screen controls on.
export function setTouch(v) {
  if (isTouch !== v) { isTouch = v; layout(); }
}

function layout() {
  body.classList.toggle('touch', isTouch);
  const portrait = innerHeight >= innerWidth;
  body.classList.toggle('portrait', portrait);
  body.classList.toggle('landscape', !portrait);

  const chromeX = bezel.offsetWidth - canvas.offsetWidth, chromeY = bezel.offsetHeight - canvas.offsetHeight;
  const raw = Math.min((cell.clientWidth - chromeX) / 320, (cell.clientHeight - chromeY) / 192);
  const dpr = window.devicePixelRatio || 1;
  // Phones fill the space instead: snapping there can waste a third of the width, and at phone
  // pixel densities the slightly uneven pixels of a fractional scale are hard to see.
  // Below 1 device pixel per pixel we can't stay crisp either, so just fit.
  const s = !isTouch && raw * dpr >= 1 ? Math.floor(raw * dpr) / dpr : Math.max(raw, 0.25);
  canvas.style.width = (320 * s) + 'px';
  canvas.style.height = (192 * s) + 'px';

  const sr = stage.getBoundingClientRect(), br = canvas.getBoundingClientRect();
  band.style.top = (br.top - sr.top + br.height * 0.64) + 'px';
}

export function initScreen() {
  addEventListener('touchstart', () => setTouch(true), { passive: true });
  new ResizeObserver(layout).observe(stage);
  addEventListener('orientationchange', () => setTimeout(layout, 120));
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
}
