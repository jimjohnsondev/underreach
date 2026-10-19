# Milestone 3 art: what's needed

Towns, the capital and ruins are built from the templates in `data/templates/`. They use the tiles and sprites below, which don't have art yet. Until they do, the game draws a **stand-in** picture for each, shown in the tables. As soon as a tile or sprite with the same name is in `art/tiles.json` or `art/sprites.json`, the game uses it instead: no code or data changes needed.

Same format as before: 8×16, palette keys from `art/palette.json` (add colors as needed), `.` for see-through. You can draw them with `npm run editor`, or deliver a set like milestone 2 (for example in `art/milestone-3/`) to be merged in.

**Art rule:** scenery stays dark and muted; people, and anything you can talk to or enter, are bright.

## Tiles: towns and the capital

Towns are Ultima-style: buildings are walled rooms seen from above with the floor showing, and you walk in through a doorway gap.

| Tile | What it is | Walk on it? | Stand-in |
| --- | --- | --- | --- |
| `cobbles` | Street and square paving | yes | path |
| `floor` | Wooden floor inside buildings | yes | bridge |
| `door` | Doorway in a building wall | yes | path |
| `garden` | Flower or vegetable bed | yes | wildflowers |
| `carpet` | Red carpet in the castle's throne room | yes | sand |
| `wall` | Building wall, seen from above | no | cliff |
| `castle_wall` | Heavier stone wall for the castle and city walls | no | mountain |
| `counter` | Shop or inn counter | no | bridge_v |
| `fence` | Wooden fence around gardens | no | tree |
| `well` | Town well (two side by side in the squares) | no | water |
| `stall` | Market stall with an awning (**see-through background**, drawn over cobbles) | no | forest |
| `throne` | The throne (two side by side) (**see-through background**, drawn over cobbles) | no | forest |

## Tiles: ruins

| Tile | What it is | Walk on it? | Stand-in |
| --- | --- | --- | --- |
| `ruin_floor` | Old flagstones | yes | salt |
| `moss` | Flagstones with moss (mixed in at random) | yes | grass_tufts |
| `stairs_down` | Stairs leading further down (not used yet, just there) | yes | cave |
| `ruin_wall` | Crumbling stone wall | no | mountain |
| `rubble` | Fallen stones blocking the way | no | hills |
| `pillar` | A standing pillar (**see-through background**, drawn over ruin_floor) | no | cliff |
| `altar` | The shrine's altar (two side by side) (**see-through background**, drawn over ruin_floor) | no | dark_forest |

Tiles marked see-through sit on the template's ground tile (cobbles in towns, ruin_floor in ruins), just like the location icons sit on the world map's ground. The rest are drawn as full squares.

## Sprites: townspeople

One 8×16 sprite per role, facing the viewer. A second frame named with `_2` (for example `npc_innkeeper_2`) is optional: wanderers swap between the two while walking. Until a role has its own sprite, the existing `villager` is drawn.

| Sprite | Who | Notes |
| --- | --- | --- |
| `npc_innkeeper` | Innkeeper, behind the inn counter | |
| `npc_merchant` | Merchant at a market stall | |
| `npc_healer` | Healer | |
| `npc_elder` | Town elder | |
| `npc_guard` | Guard (town gate, castle) | walks a little |
| `npc_villager` | Townsfolk in the streets and houses | walks |
| `npc_child` | Child playing in gardens | walks |
| `npc_farmer` | Farmer in the vegetable plot | walks |
| `npc_noble` | Nobles in the castle | walks |
| `npc_steward` | The Queen's steward, by the throne (Act 1) | |
| `npc_explorer` | An explorer sometimes camped in a ruin | walks |

The roles, their names in the status strip and their sprite names are in `data/npcs.json`.
