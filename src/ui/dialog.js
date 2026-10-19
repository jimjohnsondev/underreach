// dialog.js
// The dialog screen, opened by pressing action next to someone. Following the design doc, the
// top 124 rows show their portrait in front of a backdrop of where they are, and the bottom
// third is a framed text box: their name, four lines of what they say, and a menu of
// ASK (about a topic), SHOW (a key item), BUY (only from shopkeepers) and LEAVE.
//
// Everything is driven by the one stick and one button: left and right move along the menu,
// up and down move through a list, and the button chooses. Long answers come a page at a time;
// the button turns the page.
import { art } from '../art.js';
import { W } from '../screen.js';
import { wrapText, drawFrame, write, writeRight, charWidth, charsThatFit, LINE_H } from './text.js';
import { greet, farewell, askableTopics, answer, reactToItem } from '../dialogue.js';
import { shopOffers, buy } from '../items.js';

// Layout, in game pixels.
const PORTRAIT_X = (W - 50) / 2;
const PORTRAIT_Y = 24;
const BOX_Y = 124;
const BOX_H = 68;
const TEXT_X = 4;
const NAME_Y = BOX_Y + 4;
const LINES_Y = BOX_Y + 13;
const LINES = 4;                                    // lines of text shown at once
const MENU_Y = BOX_Y + 56;
// The text box is the screen's width less a margin each side; how many characters fit
// depends on the font, so it's worked out when needed rather than fixed here.
const textChars = () => charsThatFit(W - TEXT_X * 2);

// Colors, as palette keys.
const COLOR_BOX = 'k', COLOR_BORDER = 'x', COLOR_NAME = 'Z', COLOR_TEXT = 'X';
const COLOR_MENU = 'N', COLOR_CHOSEN = 'Z', COLOR_DIM = '0';
const MOOD_COLORS = { friendly: '5', neutral: 'N', wary: 'y', hostile: 'c' };

/**
 * Opens a conversation. `talk` is the dialogue context (see dialogue.js); `game` gives what the
 * screen needs from the rest of the game: { player, knowledge, data, learn(topics, note) }.
 * Returns the dialog's state, to pass to updateDialog() and drawDialog().
 */
export function openDialog(talk, game) {
  const { speaker } = talk;
  const offers = shopOffers(speaker.role, talk.regionIds[talk.here.region], game.data.items);
  const hostile = speaker.disposition === 'hostile';
  const dialog = {
    talk,
    game,
    offers,
    // Hostile people won't talk; all you can do is leave.
    menu: hostile ? ['LEAVE'] : ['ASK', 'SHOW', ...(offers.length ? ['BUY'] : []), 'LEAVE'],
    menuCursor: 0,
    pages: [],        // what they're saying, a page (LINES lines) at a time
    page: 0,
    list: null,       // when choosing from a list: { kind, entries: [{ label, value }], cursor, top }
    notice: null,     // the shopkeeper's reply to the last purchase, shown below the BUY list
    closed: false,
    goodbye: null,    // their farewell, for the status strip after the screen closes
  };
  say(dialog, greet(talk));
  return dialog;
}

/** Shows what someone says, learning any topics it mentions. */
function say(dialog, result) {
  const lines = wrapText(result.text, textChars());
  dialog.pages = [];
  for (let i = 0; i < lines.length; i += LINES) dialog.pages.push(lines.slice(i, i + LINES));
  dialog.page = 0;
  if (result.teaches && result.teaches.length) {
    const { speaker, here } = dialog.talk;
    dialog.game.learn(result.teaches, { text: result.text, from: `${speaker.name}, ${speaker.label}, ${here.label}` });
  }
}

/** Advances the dialog by one update. `moves` comes from the navigator, `input` from readInput(). */
export function updateDialog(dialog, moves, input) {
  if (input.menu) return close(dialog);

  if (dialog.list) return updateList(dialog, moves, input);

  // Turning the page comes before the menu.
  if (dialog.page < dialog.pages.length - 1) {
    if (input.action) dialog.page++;
    return;
  }

  if (moves.left) dialog.menuCursor = (dialog.menuCursor + dialog.menu.length - 1) % dialog.menu.length;
  if (moves.right) dialog.menuCursor = (dialog.menuCursor + 1) % dialog.menu.length;
  if (input.action) choose(dialog, dialog.menu[dialog.menuCursor]);
}

/** Carries out a menu choice. */
function choose(dialog, option) {
  const { talk, game } = dialog;
  if (option === 'LEAVE') return close(dialog);

  if (option === 'ASK') {
    const entries = askableTopics(talk, game.knowledge).map(t => ({ label: t.label, value: t.id }));
    return openList(dialog, 'ask', entries);
  }
  if (option === 'SHOW') {
    const items = game.data.items.keyItems;
    const entries = game.player.pack.keyItems.map(id => ({ label: items[id].name, value: id }));
    if (!entries.length) return say(dialog, { text: talk.lines.show.nothing });
    return openList(dialog, 'show', entries);
  }
  if (option === 'BUY') {
    const entries = dialog.offers.map(offer => ({ label: offer.name, value: offer, price: `${offer.price} MK` }));
    dialog.notice = null;
    say(dialog, { text: talk.lines.shop.welcome });
    return openList(dialog, 'buy', entries);
  }
}

/** Opens a list to choose from, with BACK at the end. */
function openList(dialog, kind, entries) {
  dialog.list = { kind, entries: [...entries, { label: 'BACK', value: null }], cursor: 0, top: 0 };
}

/** Moves through a list and chooses from it. */
function updateList(dialog, moves, input) {
  const list = dialog.list;
  const count = list.entries.length;
  if (moves.up) list.cursor = (list.cursor + count - 1) % count;
  if (moves.down) list.cursor = (list.cursor + 1) % count;
  // Keep the cursor in view.
  if (list.cursor < list.top) list.top = list.cursor;
  if (list.cursor >= list.top + LINES) list.top = list.cursor - LINES + 1;
  if (!input.action) return;

  const chosen = list.entries[list.cursor].value;
  const { talk, game } = dialog;
  if (chosen === null) {
    dialog.list = null;
    return;
  }
  if (list.kind === 'ask') {
    dialog.list = null;
    say(dialog, answer(talk, chosen, game.knowledge));
  } else if (list.kind === 'show') {
    dialog.list = null;
    say(dialog, reactToItem(talk, chosen));
  } else if (list.kind === 'buy') {
    // Stay in the shop list, so you can buy several things; the result shows above it.
    const outcome = buy(game.player, chosen, game.data.items);
    dialog.notice = talk.lines.shop[outcome];
  }
}

/** Ends the conversation. */
function close(dialog) {
  dialog.closed = true;
  if (dialog.talk.speaker.disposition !== 'hostile') dialog.goodbye = farewell(dialog.talk);
}

/** Draws the dialog screen over the whole 160x192 screen. */
export function drawDialog(ctx, dialog) {
  const { speaker } = dialog.talk;

  // Top two-thirds: backdrop and portrait.
  const backdrop = art.backdrops[speaker.backdrop] || art.backdrops.town;
  if (backdrop) ctx.drawImage(backdrop, 0, 0);
  const portrait = art.portraits[speaker.role] || art.portraits.villager;
  if (portrait) ctx.drawImage(portrait, PORTRAIT_X, PORTRAIT_Y);

  // Bottom third: the text box.
  drawFrame(ctx, 0, BOX_Y, W, BOX_H, COLOR_BOX, COLOR_BORDER);
  write(ctx, `${speaker.name}, ${speaker.label}`, TEXT_X, NAME_Y, COLOR_NAME);
  writeRight(ctx, speaker.disposition.toUpperCase(), W - TEXT_X, NAME_Y, MOOD_COLORS[speaker.disposition]);

  if (dialog.list) drawList(ctx, dialog);
  else drawSpeech(ctx, dialog);
}

/** Draws the current page of what they're saying, and the menu or a "more" prompt below it. */
function drawSpeech(ctx, dialog) {
  const lines = dialog.pages[dialog.page] || [];
  lines.forEach((line, i) => write(ctx, line, TEXT_X, LINES_Y + i * LINE_H, COLOR_TEXT));

  if (dialog.page < dialog.pages.length - 1) {
    write(ctx, '> MORE', TEXT_X, MENU_Y, COLOR_CHOSEN);
    return;
  }
  let x = TEXT_X;
  dialog.menu.forEach((option, i) => {
    const chosen = i === dialog.menuCursor;
    write(ctx, chosen ? `>${option}` : ` ${option}`, x, MENU_Y, chosen ? COLOR_CHOSEN : COLOR_MENU);
    x += (option.length + 3) * charWidth();
  });
}

/** Draws a list to choose from: topics, items or goods, four rows at a time. */
function drawList(ctx, dialog) {
  const list = dialog.list;
  const shown = list.entries.slice(list.top, list.top + LINES);
  shown.forEach((entry, i) => {
    const index = list.top + i;
    const chosen = index === list.cursor;
    const color = chosen ? COLOR_CHOSEN : COLOR_TEXT;
    write(ctx, `${chosen ? '>' : ' '}${entry.label}`, TEXT_X, LINES_Y + i * LINE_H, color);
    if (entry.price) writeRight(ctx, entry.price, W - TEXT_X, LINES_Y + i * LINE_H, color);
  });
  // A hint below: scroll position, and the shop's last reply or the purse when buying.
  const position = `${list.cursor + 1}/${list.entries.length}`;
  if (list.kind === 'buy') {
    write(ctx, dialog.notice || `PURSE ${dialog.game.player.marks} MK`, TEXT_X, MENU_Y, COLOR_MENU);
  } else {
    write(ctx, list.kind === 'ask' ? 'ASK ABOUT...' : 'SHOW...', TEXT_X, MENU_Y, COLOR_MENU);
  }
  writeRight(ctx, position, W - TEXT_X, MENU_Y, COLOR_DIM);
}
