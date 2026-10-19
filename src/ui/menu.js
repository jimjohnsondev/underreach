// menu.js
// The menu, opened with Esc or Tab, the gamepad's Start button, or the MENU button on a touch
// screen. It has two pages so far, switched with left and right:
//   JOURNAL  every topic learned, newest first, and what you've been told about the selected one
//            (and by whom). The design doc's rule: nothing has to be written down by the player.
//   PACK     your marks, the food you carry (choose one to eat it), any meal bonus running, key
//            items and the equipment you own.
// The character sheet joins them in milestone 5.
import { W, H } from '../screen.js';
import { art } from '../art.js';
import { wrapText, write, writeRight, writeCentered, charWidth, charsThatFit, LINE_H } from './text.js';
import { knownTopics } from '../knowledge.js';
import { eat, describeBonus } from '../items.js';

const PAGES = ['JOURNAL', 'PACK'];
const MARGIN = 4;
const textChars = () => charsThatFit(W - MARGIN * 2);   // depends on the font, so worked out when needed
const HEADER_Y = 4;
const BODY_Y = 18;
const LIST_ROWS = 10;                        // journal topics shown at once
const NOTES_Y = BODY_Y + LIST_ROWS * LINE_H + 6;
const FOOTER_Y = H - 9;

// Colors, as palette keys.
const COLOR_BG = 'k', COLOR_RULE = 'R', COLOR_TITLE = 'Z', COLOR_TAB = 'N', COLOR_TEXT = 'X';
const COLOR_DIM = 'x', COLOR_CHOSEN = 'Z', COLOR_GOOD = '5';

/** Opens the menu on the journal. `game` is { player, knowledge, data }. */
export function openMenu(game) {
  return { game, page: 0, cursor: 0, top: 0, closed: false, notice: null };
}

/** Advances the menu by one update. `moves` comes from the navigator, `input` from readInput(). */
export function updateMenu(menu, moves, input) {
  if (input.menu) {
    menu.closed = true;
    return;
  }
  if (moves.left || moves.right) {
    menu.page = (menu.page + (moves.right ? 1 : PAGES.length - 1)) % PAGES.length;
    menu.cursor = 0;
    menu.top = 0;
    menu.notice = null;
    return;
  }
  const count = rowCount(menu);
  if (count) {
    if (moves.up) menu.cursor = (menu.cursor + count - 1) % count;
    if (moves.down) menu.cursor = (menu.cursor + 1) % count;
  }
  if (menu.cursor < menu.top) menu.top = menu.cursor;
  if (menu.cursor >= menu.top + LIST_ROWS) menu.top = menu.cursor - LIST_ROWS + 1;

  if (input.action && PAGES[menu.page] === 'PACK') eatChosen(menu);
}

/** How many rows the cursor can move between on the current page. */
function rowCount(menu) {
  const { knowledge, player } = menu.game;
  return PAGES[menu.page] === 'JOURNAL' ? knowledge.topics.size : player.pack.food.length;
}

/** Eats the food the cursor is on. */
function eatChosen(menu) {
  const { player, data } = menu.game;
  const food = eat(player, menu.cursor, data.items);
  if (!food) return;
  const words = data.dialogue.pack;
  menu.notice = (food.effect.heal ? words.ateAndHealed : words.ate)
    .replace('{food}', food.name).replace('{hp}', player.hp).replace('{max}', player.maxHp);
  menu.cursor = Math.max(0, Math.min(menu.cursor, player.pack.food.length - 1));
}

/** Draws the menu over the whole screen. */
export function drawMenu(ctx, menu) {
  ctx.fillStyle = art.colors[COLOR_BG];
  ctx.fillRect(0, 0, W, H);

  // Tabs across the top, with the purse on the right.
  let x = MARGIN;
  PAGES.forEach((name, i) => {
    const chosen = i === menu.page;
    write(ctx, chosen ? `>${name}` : ` ${name}`, x, HEADER_Y, chosen ? COLOR_TITLE : COLOR_TAB);
    x += (name.length + 3) * charWidth();
  });
  writeRight(ctx, `${menu.game.player.marks} MK`, W - MARGIN, HEADER_Y, 'y');
  ctx.fillStyle = art.colors[COLOR_RULE];
  ctx.fillRect(0, HEADER_Y + 8, W, 1);

  if (PAGES[menu.page] === 'JOURNAL') drawJournal(ctx, menu);
  else drawPack(ctx, menu);

  ctx.fillRect(0, FOOTER_Y - 3, W, 1);
  const hint = PAGES[menu.page] === 'PACK' && menu.game.player.pack.food.length ? 'BUTTON: EAT  < >: PAGE  MENU: CLOSE' : '< >: PAGE    MENU: CLOSE';
  writeCentered(ctx, hint, W / 2, FOOTER_Y, COLOR_DIM);
}

/** The journal: learned topics on top, what you know about the chosen one below. */
function drawJournal(ctx, menu) {
  const { knowledge } = menu.game;
  const topics = knownTopics(knowledge);
  if (!topics.length) {
    write(ctx, 'NOTHING LEARNED YET.', MARGIN, BODY_Y, COLOR_TEXT);
    write(ctx, 'TALK TO PEOPLE AND ASK THEM THINGS.', MARGIN, BODY_Y + LINE_H, COLOR_DIM);
    return;
  }
  topics.slice(menu.top, menu.top + LIST_ROWS).forEach((topic, i) => {
    const index = menu.top + i;
    const chosen = index === menu.cursor;
    const kind = topic.kind === 'place' ? 'PLACE' : 'PERSON';
    write(ctx, `${chosen ? '>' : ' '}${topic.label}`, MARGIN, BODY_Y + i * LINE_H, chosen ? COLOR_CHOSEN : COLOR_TEXT);
    writeRight(ctx, kind, W - MARGIN, BODY_Y + i * LINE_H, COLOR_DIM);
  });
  writeRight(ctx, `${menu.cursor + 1}/${topics.length}`, W - MARGIN, NOTES_Y - 7, COLOR_DIM);

  // Notes on the chosen topic, newest first, as many as fit.
  const topic = topics[menu.cursor];
  const lines = [];
  for (const note of [...topic.notes].reverse()) {
    lines.push({ text: note.from, color: 'N' });
    for (const line of wrapText(note.text, textChars())) lines.push({ text: line, color: COLOR_TEXT });
  }
  const fits = Math.floor((FOOTER_Y - 4 - NOTES_Y) / LINE_H);
  lines.slice(0, fits).forEach((line, i) => write(ctx, line.text, MARGIN, NOTES_Y + i * LINE_H, line.color));
}

/** The pack: food (choose to eat), the current meal bonus, key items and equipment. */
function drawPack(ctx, menu) {
  const { player, data } = menu.game;
  const items = data.items;
  let y = BODY_Y;

  write(ctx, `FOOD ${player.pack.food.length}/${items.packSize}`, MARGIN, y, COLOR_TITLE);
  y += LINE_H;
  for (let slot = 0; slot < items.packSize; slot++) {
    const id = player.pack.food[slot];
    const chosen = id && slot === menu.cursor;
    write(ctx, `${chosen ? '>' : ' '}${id ? items.food[id].name : '-'}`, MARGIN, y, chosen ? COLOR_CHOSEN : id ? COLOR_TEXT : COLOR_DIM);
    y += LINE_H;
  }
  const bonus = describeBonus(player);
  write(ctx, bonus ? `MEAL: ${bonus}` : 'MEAL: NONE', MARGIN, y, bonus ? COLOR_GOOD : COLOR_DIM);
  y += LINE_H + 4;

  write(ctx, 'KEY ITEMS', MARGIN, y, COLOR_TITLE);
  y += LINE_H;
  const keyItems = player.pack.keyItems.map(id => items.keyItems[id].name);
  for (const name of keyItems.length ? keyItems : ['-']) {
    write(ctx, ` ${name}`, MARGIN, y, keyItems.length ? COLOR_TEXT : COLOR_DIM);
    y += LINE_H;
  }
  y += 4;

  write(ctx, 'EQUIPMENT', MARGIN, y, COLOR_TITLE);
  writeRight(ctx, 'NOT WORN YET', W - MARGIN, y, COLOR_DIM);
  y += LINE_H;
  const owned = player.pack.equipment.map(id => items.equipment[id].name);
  for (const name of owned.length ? owned : ['-']) {
    write(ctx, ` ${name}`, MARGIN, y, owned.length ? COLOR_TEXT : COLOR_DIM);
    y += LINE_H;
  }

  if (menu.notice) {
    wrapText(menu.notice, textChars()).forEach((line, i) => write(ctx, line, MARGIN, FOOTER_Y - 4 - (2 - i) * LINE_H, COLOR_GOOD));
  }
}
