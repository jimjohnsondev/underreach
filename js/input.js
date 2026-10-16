// One stick and one button, from keyboard, gamepad or the touch controls (same approach as the Myriapod reference).
import { setTouch } from './screen.js';

const $ = id => document.getElementById(id);
const keys = new Set();
const keyHandlers = {};   // one-shot keys such as the debug toggle, by KeyboardEvent.code

let actionLatch = false;  // catches a press that starts and ends between two updates
let actionWas = false;
let joyX = 0, joyY = 0, actionTouch = false;
let gpX = 0, gpY = 0, gpAction = false;

const ACTION_KEYS = [' ', 'enter'];
const SCROLL_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];

export function onKey(code, fn) { keyHandlers[code] = fn; }

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (SCROLL_KEYS.includes(k)) e.preventDefault();
  if (keyHandlers[e.code]) { if (!e.repeat) keyHandlers[e.code](); return; }
  if (!e.repeat && ACTION_KEYS.includes(k)) actionLatch = true;
  keys.add(k);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
// Otherwise a key held while the window loses focus stays "down" forever.
addEventListener('blur', () => keys.clear());

const held = (...a) => a.some(x => keys.has(x));

function pollGamepad() {
  gpX = gpY = 0; gpAction = false;
  let list;
  try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return; }
  for (const g of list || []) {
    if (!g) continue;
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = g.buttons;
    if (Math.abs(ax) > 0.2) gpX = ax;
    if (Math.abs(ay) > 0.2) gpY = ay;
    if (b[14] && b[14].pressed) gpX = -1;
    if (b[15] && b[15].pressed) gpX = 1;
    if (b[12] && b[12].pressed) gpY = -1;
    if (b[13] && b[13].pressed) gpY = 1;
    if (b[0] && b[0].pressed) gpAction = true;
    break;
  }
}

// Called once per update. Returns the raw stick (-1..1 each axis) and whether action was just pressed.
export function readInput() {
  pollGamepad();
  const x = (held('arrowright', 'd') ? 1 : 0) - (held('arrowleft', 'a') ? 1 : 0) + joyX + gpX;
  const y = (held('arrowdown', 's') ? 1 : 0) - (held('arrowup', 'w') ? 1 : 0) + joyY + gpY;
  const down = held(...ACTION_KEYS) || actionTouch || gpAction;
  const action = actionLatch || (down && !actionWas);
  actionWas = down;
  actionLatch = false;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), action };
}

// ---- touch thumbstick and action button ----
const pad = $('pad'), knob = $('knob'), actBtn = $('actBtn');
let padId = null;

function padMove(e) {
  const r = pad.getBoundingClientRect(), rad = r.width / 2;
  let dx = (e.clientX - (r.left + rad)) / (rad * 0.62), dy = (e.clientY - (r.top + rad)) / (rad * 0.62);
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  joyX = Math.abs(dx) < 0.15 ? 0 : dx;
  joyY = Math.abs(dy) < 0.15 ? 0 : dy;
  knob.style.transform = `translate(${dx * rad * 0.42}px,${dy * rad * 0.42}px)`;
}
pad.addEventListener('pointerdown', e => {
  setTouch(true); padId = e.pointerId;
  try { pad.setPointerCapture(e.pointerId); } catch (_) {}
  padMove(e); e.preventDefault();
});
pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
const padEnd = e => { if (e.pointerId !== padId) return; padId = null; joyX = joyY = 0; knob.style.transform = ''; };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => pad.addEventListener(ev, padEnd));

actBtn.addEventListener('pointerdown', e => {
  setTouch(true); actionTouch = true; actionLatch = true; actBtn.classList.add('on');
  try { actBtn.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
});
const actEnd = () => { actionTouch = false; actBtn.classList.remove('on'); };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => actBtn.addEventListener(ev, actEnd));
actBtn.addEventListener('contextmenu', e => e.preventDefault());
