// input.js
// Reads the player's controls: one stick for moving, one action button, and a menu button.
//
// The same controls come from three places, all combined into one reading:
//   - Keyboard: arrow keys or WASD to move, Space or Enter for action, Esc or Tab for the menu.
//   - Gamepad: left stick or D-pad to move, the A button for action, Start for the menu.
//   - Touchscreen: the on-screen thumbstick, the red ACT button and the small MENU button.
import { setTouch } from './screen.js';

const ACTION_KEYS = [' ', 'enter'];
const MENU_KEYS = ['escape', 'tab'];
// Keys the browser would otherwise act on: scrolling the page, or Tab moving the focus.
const BROWSER_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'];

// Gamepad button numbers in the standard browser layout.
const PAD_A = 0, PAD_START = 9, PAD_UP = 12, PAD_DOWN = 13, PAD_LEFT = 14, PAD_RIGHT = 15;
// Stick movement smaller than this is ignored, so a worn stick doesn't drift.
const PAD_DEAD_ZONE = 0.2;

// How far the touch thumbstick must be pushed before it counts, as a fraction of full travel.
const THUMB_DEAD_ZONE = 0.15;
// How far from the center you drag to reach full travel, as a fraction of the pad's radius.
const THUMB_REACH = 0.62;
// How far the knob is drawn from the center at full travel, as a fraction of the pad's radius.
const KNOB_TRAVEL = 0.42;

const keysDown = new Set();   // lower-case key names currently held
const keyCommands = {};       // single-press commands such as the debug toggle, by key code

// Set when the action button is pressed, and cleared when the game reads it. This catches a tap so
// quick it starts and ends between two game updates.
let actionPressed = false;
// Whether the action button was held at the last reading, so holding it counts as one press.
let actionWasHeld = false;
// The same two things for the menu button.
let menuPressed = false;
let padMenuWasHeld = false;

let thumbX = 0, thumbY = 0, touchActionHeld = false;    // touch controls
let padX = 0, padY = 0, padActionHeld = false, padMenuHeld = false;   // gamepad

/** Runs `command` once each time the key with this code is pressed, e.g. onKey('Backquote', ...). */
export function onKey(code, command) {
  keyCommands[code] = command;
}

/**
 * Returns the controls as of now: x and y from -1 to 1 for the stick, and `action` and `menu`,
 * each true only on the update when that button was first pressed. Call this once per update.
 */
export function readInput() {
  readGamepad();

  const keyX = (isKeyDown('arrowright', 'd') ? 1 : 0) - (isKeyDown('arrowleft', 'a') ? 1 : 0);
  const keyY = (isKeyDown('arrowdown', 's') ? 1 : 0) - (isKeyDown('arrowup', 'w') ? 1 : 0);
  const x = clamp(keyX + thumbX + padX, -1, 1);
  const y = clamp(keyY + thumbY + padY, -1, 1);

  const actionHeld = isKeyDown(...ACTION_KEYS) || touchActionHeld || padActionHeld;
  const action = actionPressed || (actionHeld && !actionWasHeld);
  actionWasHeld = actionHeld;
  actionPressed = false;

  const menu = menuPressed || (padMenuHeld && !padMenuWasHeld);
  padMenuWasHeld = padMenuHeld;
  menuPressed = false;

  return { x, y, action, menu };
}

/** Limits a number to the range min..max. */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** True if any of the given keys is being held. */
function isKeyDown(...keys) {
  return keys.some(k => keysDown.has(k));
}

// ---- Keyboard ----

addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (BROWSER_KEYS.includes(key)) event.preventDefault();

  const command = keyCommands[event.code];
  if (command) {
    if (!event.repeat) command();
    return;
  }

  if (ACTION_KEYS.includes(key) && !event.repeat) actionPressed = true;
  if (MENU_KEYS.includes(key) && !event.repeat) menuPressed = true;
  keysDown.add(key);
});

addEventListener('keyup', event => keysDown.delete(event.key.toLowerCase()));

// If the window loses focus while a key is held, the browser never sends its keyup,
// so forget every key to stop the player walking on by themselves.
addEventListener('blur', () => keysDown.clear());

// ---- Gamepad ----

/** Reads the first connected gamepad into padX, padY, padActionHeld and padMenuHeld. */
function readGamepad() {
  padX = 0;
  padY = 0;
  padActionHeld = false;
  padMenuHeld = false;

  let gamepads;
  try {
    gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  } catch (e) {
    return;   // some browsers block gamepad access in certain contexts
  }

  const pad = [...(gamepads || [])].find(Boolean);
  if (!pad) return;

  const pressed = n => pad.buttons[n] && pad.buttons[n].pressed;
  const stickX = pad.axes[0] || 0;
  const stickY = pad.axes[1] || 0;
  if (Math.abs(stickX) > PAD_DEAD_ZONE) padX = stickX;
  if (Math.abs(stickY) > PAD_DEAD_ZONE) padY = stickY;
  if (pressed(PAD_LEFT)) padX = -1;
  if (pressed(PAD_RIGHT)) padX = 1;
  if (pressed(PAD_UP)) padY = -1;
  if (pressed(PAD_DOWN)) padY = 1;
  padActionHeld = pressed(PAD_A);
  padMenuHeld = pressed(PAD_START);
}

// ---- Touch thumbstick ----

const thumbPad = document.getElementById('pad');
const knob = document.getElementById('knob');
const actionButton = document.getElementById('actBtn');
let thumbPointerId = null;   // the finger currently on the thumbstick

/** Turns the finger's position on the thumbstick into thumbX and thumbY, and moves the knob to match. */
function moveThumb(event) {
  const box = thumbPad.getBoundingClientRect();
  const radius = box.width / 2;
  let dx = (event.clientX - (box.left + radius)) / (radius * THUMB_REACH);
  let dy = (event.clientY - (box.top + radius)) / (radius * THUMB_REACH);

  // Past full travel, keep the direction but cap the distance.
  const distance = Math.hypot(dx, dy);
  if (distance > 1) {
    dx /= distance;
    dy /= distance;
  }

  thumbX = Math.abs(dx) < THUMB_DEAD_ZONE ? 0 : dx;
  thumbY = Math.abs(dy) < THUMB_DEAD_ZONE ? 0 : dy;
  knob.style.transform = `translate(${dx * radius * KNOB_TRAVEL}px, ${dy * radius * KNOB_TRAVEL}px)`;
}

/** Lets go of the thumbstick when the finger that was holding it lifts. */
function releaseThumb(event) {
  if (event.pointerId !== thumbPointerId) return;
  thumbPointerId = null;
  thumbX = 0;
  thumbY = 0;
  knob.style.transform = '';
}

thumbPad.addEventListener('pointerdown', event => {
  setTouch(true);
  thumbPointerId = event.pointerId;
  // Keep getting this finger's moves even if it slides off the pad.
  try { thumbPad.setPointerCapture(event.pointerId); } catch (e) { /* not supported */ }
  moveThumb(event);
  event.preventDefault();
});
thumbPad.addEventListener('pointermove', event => {
  if (event.pointerId === thumbPointerId) moveThumb(event);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  thumbPad.addEventListener(type, releaseThumb);
}

// ---- Touch action button ----

/** Lets go of the action button. */
function releaseActionButton() {
  touchActionHeld = false;
  actionButton.classList.remove('on');
}

actionButton.addEventListener('pointerdown', event => {
  setTouch(true);
  touchActionHeld = true;
  actionPressed = true;
  actionButton.classList.add('on');
  try { actionButton.setPointerCapture(event.pointerId); } catch (e) { /* not supported */ }
  event.preventDefault();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  actionButton.addEventListener(type, releaseActionButton);
}
// A long press would otherwise open the phone's context menu.
actionButton.addEventListener('contextmenu', event => event.preventDefault());

// ---- Touch menu button ----

const menuButton = document.getElementById('menuBtn');
menuButton.addEventListener('pointerdown', event => {
  setTouch(true);
  menuPressed = true;
  event.preventDefault();
});
// A long press would otherwise open the phone's context menu.
menuButton.addEventListener('contextmenu', event => event.preventDefault());
