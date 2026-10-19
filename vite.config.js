// vite.config.js
// Settings for Vite, which serves the game while developing (npm run dev) and bundles it into
// dist/ for putting online (npm run build). Neither is required to play: the game also runs
// straight from the source with any simple web server.
import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Folders of JSON the game loads with fetch() while it runs. Vite only knows about files the code
// imports, so the two plugins below make up for that.
const DATA_DIRS = ['art', 'data'];

// Reloads the page when a JSON file in art/ or data/ is saved, so edits to tiles or maps show up at once.
const reloadOnDataChange = {
  name: 'reload-on-data-change',
  configureServer(server) {
    server.watcher.add(DATA_DIRS.map(dir => `${dir}/**/*.json`));
    server.watcher.on('change', file => {
      if (/[\\/](art|data)[\\/].*\.json$/.test(file)) server.ws.send({ type: 'full-reload' });
    });
  },
};

// After a build, copies the JSON from art/ and data/ into dist/ next to index.html. They stay as
// plain JSON so a deployed copy can still be edited by hand. Other files, like the preview PNGs
// in art/, are left out because the game doesn't use them.
const copyDataToBuild = {
  name: 'copy-data-to-build',
  apply: 'build',
  closeBundle() {
    const isFolderOrJson = path => !/\.[a-z0-9]+$/i.test(path) || path.endsWith('.json');
    for (const dir of DATA_DIRS) {
      if (existsSync(dir)) cpSync(dir, resolve('dist', dir), { recursive: true, filter: isFolderOrJson });
    }
  },
};

export default defineConfig({
  // Use relative paths so the build works from any folder on any host, e.g. yourname.github.io/underreach/.
  base: './',
  plugins: [reloadOnDataChange, copyDataToBuild],
  build: {
    // Put the bundled code in dist/js/ and the stylesheet in dist/css/, instead of Vite's
    // single dist/assets/ folder. Anything else (none yet) still goes in dist/assets/.
    rolldownOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: asset => {
          const isCss = (asset.names || []).some(name => name.endsWith('.css'));
          return isCss ? 'css/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
