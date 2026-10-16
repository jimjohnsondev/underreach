// The tile map: which tile is where, what each tile does, and which region a spot belongs to.

export const TILE_W = 8, TILE_H = 16;

async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

export async function loadWorld(mapUrl) {
  const [map, terrain] = await Promise.all([loadJSON(mapUrl), loadJSON('data/terrain.json')]);
  const rows = map.rows;
  const w = rows[0].length, h = rows.length;
  rows.forEach((r, i) => { if (r.length !== w) console.warn(`Map row ${i} is ${r.length} wide, expected ${w}`); });

  // Off the edge of the map counts as void, which blocks, so the Wayfarer can't walk off.
  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return 'void';
    return map.legend[rows[ty][tx]] || 'void';
  }
  const info = name => terrain.tiles[name] || { blocks: true };

  return {
    w, h,
    pixelW: w * TILE_W,
    pixelH: h * TILE_H,
    start: map.start,
    tileAt,
    info,
    blocks: (tx, ty) => info(tileAt(tx, ty)).blocks,
    regionAt(tx, ty) {
      for (const r of map.regions || [])
        if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r.name;
      return map.defaultRegion || '';
    },
  };
}
