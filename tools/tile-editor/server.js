// server.js
// A tiny local web server for the tile and sprite editor. It serves the editor page and the
// project's art files, and saves edits back into art/tiles.json, art/sprites.json and
// art/palette.json. No dependencies: run it with `npm run editor`.
//
// It only listens on this computer (127.0.0.1) and can only write those three files. Other web
// pages open in the browser can still send requests to it, so it also refuses anything that
// doesn't come from the editor's own address (see isFromEditor), and checks a file looks right
// before writing it.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 5180;
const HOST = '127.0.0.1';
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const EDITOR_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));

// The addresses the editor is reached at. Requests naming any other host are refused, which stops
// a web page from pointing its own domain name at this computer to get around the browser's
// same-site rules.
const OWN_HOSTS = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];

// The only files the editor may save: how each is checked, and how it's written.
const SAVE_TARGETS = {
  tiles: { file: 'art/tiles.json', check: data => checkPictures(data, 'tiles'), write: writeIndented },
  sprites: { file: 'art/sprites.json', check: data => checkPictures(data, 'sprites'), write: writeIndented },
  palette: { file: 'art/palette.json', check: checkPalette, write: writePalette },
};

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

// Saved files can be large-ish, but never this large; anything bigger is a mistake.
const MAX_BODY_BYTES = 5 * 1024 * 1024;

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${HOST}`);
    if (!OWN_HOSTS.includes(request.headers.host)) {
      send(response, 403, 'Forbidden');
    } else if (request.method === 'POST' && url.pathname.startsWith('/save/')) {
      await handleSave(url.pathname.slice('/save/'.length), request, response);
    } else if (request.method === 'GET') {
      await handleGet(url.pathname, response);
    } else {
      send(response, 405, 'Method not allowed');
    }
  } catch (error) {
    console.error(error);
    send(response, 500, String(error.message || error));
  }
}).listen(PORT, HOST, () => {
  console.log(`Tile editor running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});

/**
 * Serves a file. "/" is the editor page, "/editor/..." are the editor's own files, and anything
 * else is read from the project folder (that's how the editor loads art/*.json).
 */
async function handleGet(pathname, response) {
  let filePath;
  if (pathname === '/' || pathname === '/index.html') filePath = join(EDITOR_DIR, 'index.html');
  else if (pathname.startsWith('/editor/')) filePath = safeJoin(EDITOR_DIR, pathname.slice('/editor/'.length));
  else filePath = safeJoin(ROOT, pathname.slice(1));

  if (!filePath) return send(response, 403, 'Forbidden');
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',   // always show the file as it is on disk now
    });
    response.end(body);
  } catch {
    send(response, 404, 'Not found');
  }
}

/** Saves one of the art files from the JSON in the request body. */
async function handleSave(target, request, response) {
  if (!isFromEditor(request)) return send(response, 403, 'Saves must come from the editor page');
  const save = SAVE_TARGETS[target];
  if (!save) return send(response, 404, `Can't save "${target}"`);

  let data;
  try {
    data = JSON.parse(await readBody(request));
  } catch (error) {
    return send(response, 400, `Not valid JSON: ${error.message}`);
  }
  const problem = save.check(data);
  if (problem) return send(response, 400, `Not saved: ${problem}`);

  const path = join(ROOT, save.file);
  const existing = await readFile(path, 'utf8');
  await writeFile(path, save.write(data, existing));
  console.log(`Saved ${save.file}`);
  send(response, 200, 'Saved');
}

/**
 * True if a save request came from the editor page itself. A page on another site can make the
 * browser send a plain form-style request here, but it can't send one marked as JSON without the
 * browser first asking this server for permission (which it never gives), and the browser always
 * says which page a request came from in the Origin header.
 */
function isFromEditor(request) {
  const isJson = (request.headers['content-type'] || '').startsWith('application/json');
  const origin = request.headers.origin;
  const fromOwnPage = !origin || OWN_HOSTS.some(host => origin === `http://${host}`);
  return isJson && fromOwnPage;
}

/**
 * Checks that a tiles.json or sprites.json save has the right shape, so a bad request can't
 * wipe or break the file. Returns a description of the problem, or null if it's fine.
 */
function checkPictures(data, listName) {
  if (!isObject(data) || !isObject(data[listName])) return `expected a "${listName}" list`;
  const { width, height } = data;
  if (!Number.isInteger(width) || !Number.isInteger(height)) return 'expected a whole-number width and height';
  for (const [name, rows] of Object.entries(data[listName])) {
    const rightSize = Array.isArray(rows) && rows.length === height
      && rows.every(row => typeof row === 'string' && row.length === width);
    if (!rightSize) return `"${name}" isn't ${height} rows of ${width} pixels`;
  }
  return null;
}

/** Checks that a palette.json save has the right shape. Returns the problem, or null if it's fine. */
function checkPalette(data) {
  if (!isObject(data) || !isObject(data.colors)) return 'expected a "colors" list';
  for (const [key, color] of Object.entries(data.colors)) {
    if (key.length !== 1 || key === '.') return `"${key}" isn't a one-character color key`;
    if (!/^#[0-9a-f]{6}$/i.test(color)) return `"${key}" has "${color}", not a color like #1a2b3c`;
  }
  return null;
}

/** True for a plain object (not an array or null). */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Writes tiles.json or sprites.json the way they're laid out by hand: one-space indents, each
 * row of pixels on its own line, and the same line endings the file already used.
 */
function writeIndented(data, existing) {
  return withLineEndingsOf(existing, JSON.stringify(data, null, 1));
}

/**
 * Writes palette.json keeping the colors in the order they're already listed, with any new
 * colors added at the end. (Rewriting it as a plain JavaScript object would move the number
 * keys 0-9 to the top, since JavaScript always puts number-like keys first.)
 */
function writePalette(data, existing) {
  const existingOrder = [...existing.matchAll(/^\s*("(?:[^"\\]|\\.)+")\s*:\s*"#/gm)]
    .map(match => JSON.parse(match[1]));
  const keys = [
    ...existingOrder.filter(key => key in data.colors),
    ...Object.keys(data.colors).filter(key => !existingOrder.includes(key)),
  ];
  const lines = keys.map(key => `    ${JSON.stringify(key)}: ${JSON.stringify(data.colors[key])}`);
  const note = typeof data._note === 'string' ? data._note : JSON.parse(existing)._note;
  const text = [
    '{',
    `  "_note": ${JSON.stringify(note)},`,
    '  "colors": {',
    lines.join(',\n'),
    '  }',
    '}',
  ].join('\n');
  return withLineEndingsOf(existing, text);
}

/** Returns `text` with \r\n line endings if `existing` used them, otherwise \n. */
function withLineEndingsOf(existing, text) {
  const ending = existing.includes('\r\n') ? '\r\n' : '\n';
  const trailing = /\r?\n$/.test(existing) ? ending : '';
  return text.replace(/\r?\n/g, ending) + trailing;
}

/**
 * Joins a request path onto a folder, or returns null if it would escape that folder or isn't a
 * properly encoded path.
 */
function safeJoin(folder, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  const full = normalize(join(folder, decoded));
  return full === folder || full.startsWith(folder + sep) ? full : null;
}

/** Reads the whole request body as text. */
function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/** Sends a short plain-text response. */
function send(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}
