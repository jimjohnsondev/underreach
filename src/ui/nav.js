// nav.js
// Turns the stick into menu moves: one step when it's first pushed, then, if it's held, a
// steady repeat, the way a cursor feels on old machines. Used by the dialog, journal and pack.

// Updates (60 a second) before a held direction starts repeating, and between repeats.
const REPEAT_DELAY = 18;
const REPEAT_EVERY = 6;
// How far the stick must be pushed to count.
const PUSHED = 0.5;

// A held count meaning "this direction was already held when the screen opened": it's ignored
// until the stick lets go of it.
const WAIT_FOR_RELEASE = -1;

/**
 * Creates a navigator. Call it once per update with the input from readInput(); it returns
 * { up, down, left, right }, each true on the updates when the cursor should move that way.
 * Call nav.reset() when a screen opens, so a direction already held (from walking into
 * someone, say) doesn't start moving the cursor.
 */
export function createNav() {
  const held = { up: 0, down: 0, left: 0, right: 0 };
  const nav = input => {
    const pushed = {
      up: input.y < -PUSHED,
      down: input.y > PUSHED,
      left: input.x < -PUSHED,
      right: input.x > PUSHED,
    };
    const moves = {};
    for (const dir of Object.keys(held)) {
      if (held[dir] === WAIT_FOR_RELEASE) {
        if (!pushed[dir]) held[dir] = 0;
        moves[dir] = false;
        continue;
      }
      held[dir] = pushed[dir] ? held[dir] + 1 : 0;
      const t = held[dir];
      moves[dir] = t === 1 || (t > REPEAT_DELAY && (t - REPEAT_DELAY) % REPEAT_EVERY === 1);
    }
    return moves;
  };
  nav.reset = () => {
    for (const dir of Object.keys(held)) held[dir] = WAIT_FOR_RELEASE;
  };
  return nav;
}
