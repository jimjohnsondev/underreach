// Vite serves the game in development and bundles it for deploying. The source still runs
// unbundled from any static server, so neither step is required to play.
import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The art and data JSON are fetch()ed at runtime rather than imported, so they stay plain files
// you can edit by hand, even in a deployed copy.
const DATA_DIRS = ['art', 'data'];

// Vite doesn't know the page depends on those files. Reload the page whenever one is edited,
// so tweaking a tile or a map shows up straight away.
const reloadOnDataChange = {
  name: 'reload-on-data-change',
  configureServer(server) {
    server.watcher.add(DATA_DIRS.map(d => `${d}/**/*.json`));
    server.watcher.on('change', file => {
      if (/[\\/](art|data)[\\/].*\.json$/.test(file)) server.ws.send({ type: 'full-reload' });
    });
  },
};

// For the same reason the bundle won't include them, so copy them into the build next to index.html.
// Only the JSON is copied; the preview PNGs in art/ are for people, not the game.
const copyDataToBuild = {
  name: 'copy-data-to-build',
  apply: 'build',
  closeBundle() {
    for (const dir of DATA_DIRS) {
      if (!existsSync(dir)) continue;
      cpSync(dir, resolve('dist', dir), {
        recursive: true,
        filter: src => !/\.[a-z0-9]+$/i.test(src) || src.endsWith('.json'),
      });
    }
  },
};

export default defineConfig({
  // Relative URLs, so the build works from any folder on any host (e.g. GitHub Pages under /underreach/).
  base: './',
  plugins: [reloadOnDataChange, copyDataToBuild],
});
