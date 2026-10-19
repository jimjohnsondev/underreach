# Tools

Helpers for working on the game. They aren't part of the game or its build.

## Tile editor

Paint the tiles and sprites in `art/tiles.json` and `art/sprites.json`, and edit the colors in `art/palette.json`.

```
npm run editor
```

Then open http://localhost:5180/. It runs its own small server (`tools/tile-editor/server.js`), because a web page can't save files by itself. The server only listens on this computer, only accepts saves from the editor page itself, and can only write those three art files. To use another port, set `PORT` first: `$env:PORT=5190; npm run editor` in PowerShell, or `PORT=5190 npm run editor` in Git Bash, macOS or Linux.

- **Pick** a tile or sprite from the list on the left (the TILES and SPRITES tabs switch lists). NEW, COPY, RENAME and DELETE work on the list.
- **Paint** on the big grid: left click paints with the selected color, right click makes a pixel see-through. PENCIL (P), FILL (F) and PICK (I, takes a color from the picture) are the tools. FLIP and the arrows flip or move the whole picture. Ctrl+Z and Ctrl+Y undo and redo.
- **Colors**: click a swatch to paint with it. Double-click one to change it; every picture using that color changes too. ADD COLOR adds a new one under a one-character key. The small dot on a swatch means the current picture uses it.
- **Previews** show the picture at game shape (pixels twice as wide as tall), tiled 3×3 to check edges, and its animation frames (`water` with `water_2`, `imp_1` with `imp_2`). Right-facing sprites also show the mirrored left-facing version the game makes. Pictures with see-through pixels are drawn over the ground tile you choose.
- **Save** with the SAVE button or Ctrl+S. Only the files you changed are written, keeping their layout and the palette's order. If `npm run dev` is running too, the game reloads with the new art.

The game finds tiles and sprites by name (in `data/terrain.json`, `data/locations.json` and the code), so renaming or deleting one means updating those by hand.
