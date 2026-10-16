# Underreach — Game Design Document

Oct 16, 2026 · Jim Johnson

## Overview

Underreach is a real-time, top-down 8-bit RPG for the browser where you win mostly by exploring and talking, not fighting. You play a licensed Wayfarer racing a rival to find the Hollow Crown, hidden somewhere in a land that is generated fresh from a seed every new game.

**High concept.** Seven Cities of Gold's open map, Ultima's "ask about" conversations, and Pitfall II's chunky action, played on a phone with one button.

**Premise.** The Queen's Cartographer has died with her great map unfinished. Her last notes say the Hollow Crown, the old heart of the Reach, still lies hidden, and whoever reaches it decides what the realm becomes. You are sent to find it. So is Corvin Vale, a gifted Wayfarer working for the Ashen Guild.

### Design pillars

1. **The world is the reward.** Every screen should hold something to look at, someone to meet, or a path you can't take yet.
2. **Words over swords.** Most problems have a talking or exploring solution; combat is a spice, never the meal.
3. **No chores.** Nothing you must eat, nothing to rest for, nothing that wears out. Food and money are rewards and choices, never upkeep. The player's attention goes to the world.
4. **Someone is always one step ahead.** The rival gives the open world a pulse and a reason to move.
5. **Death is a place, not a reload.** Dying opens a short, strange chapter instead of a game-over screen.

### Core requirements

| # | Requirement | Where it's covered |
| --- | --- | --- |
| 1 | Real time, not turn-based | Real-time action and combat |
| 2 | Mostly exploring and talking, some action | Exploration and conversation; combat |
| 3 | One main quest, several side quests | Main quest; Side quests |
| 4 | A rival working against the player | The Rival |
| 5 | No survival chores: no hunger or fatigue; food is an optional bonus | Character and progression |
| 6 | Death sends you to a netherworld to escape | Death and the Underreach |
| 7 | World map with separate location maps | World structure |

## Platform, look and controls

The game uses the same screen setup as the Centipede prototype (Myriapod 800): a true Atari 800 screen, scaled up and framed on a dark backdrop, rather than filling the browser at 16:9. It plays the same on a phone or a desktop.

**Look.** Chunky Atari 8-bit, not Game Boy: 8×16 tiles and sprites, the Atari palette, multicolor sprites in the Pitfall II and Seven Cities of Gold style. Touchstones are Seven Cities of Gold, Mail Order Monsters, Pitfall II and Joust.

- **Resolution:** Atari 800, 160×192 with wide pixels (each pixel twice as wide as tall), shown as a 320×192 frame.
- **Scaling:** the largest scale that lands every pixel on whole device pixels, so the image stays crisp at any size.
- **Framing:** the screen sits in a bezel, centered on a dark Atari-style backdrop with a faint dot grid and a faded rainbow band behind it.
- **Tiles and sprites:** 8×16 for both terrain tiles and characters. On wide pixels that looks square on screen, keeps normal body proportions, and leaves room for detail like faces and belts.
- **Tile grid:** 20×12 tiles on screen: a 20×11 play area plus a one-tile status strip for HP, level, money, region name and the rival marker.
- **Movement:** characters move freely in real time and are not locked to the tile grid; collision uses the feet.
- **Shading:** checkerboard dithering for faces, foliage, light and sky, the main Atari trick for detail.
- **Art rule:** scenery is dark and muted; characters and anything you can enter, talk to or fight are bright.
- **Dialog screen:** the top 124 rows show a large portrait (about 50×100 pixels) in a detailed environment; the bottom third is a framed text box with the speaker's name, four lines of text, and the Ask about / Show / Leave menu.
- **Text:** the 3×5 pixel font from Centipede, about 32 to 37 characters per line; fonts are swappable data files, so a larger 4×6 font can be tried any time.

**Controls.** One stick and one button, Atari-style.

| Input | Phone | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Move (8 directions) | Thumbstick below the screen (portrait) or left of it (landscape) | Arrows / WASD | Stick / D-pad |
| Action (talk, use, attack) | Big red button below the screen (portrait) or right of it (landscape) | Space / Enter | A |
| Menu (sheet, journal, map, save) | Small icon, top corner | Esc / Tab | Start |

The action button is context-sensitive: next to a person it talks, next to an object it uses, otherwise it attacks. There is no hold or double-press anywhere in the game. Menus are navigated with the same stick and button.

**Code.** Built in Claude Code as plain, human-readable JavaScript with an HTML canvas; no framework required. Underreach is a personal game, not for release, so the code is built for tinkering: tiles, sprites, fonts, NPCs, quests, items, food and every balance number live in plain data files apart from the engine. A debug mode can jump to any region, give items, and set level, stats and money.

## World structure

The Reach is one scrolling world map dotted with locations, and each location opens into its own map. Every new game builds a new world from a seed, so no two runs share a layout, but the story beats always fit.

### World map

- Top-down, smooth-scrolling, with the player as a small multicolor sprite, in the spirit of Seven Cities of Gold.
- Proposed size: about 256×160 tiles, split into five regions around a central starting vale.
- Terrain gates exploration: rivers, cliffs, dark forest and deep marsh block you until you earn the gear or knowledge to cross (see progression).
- Locations show as icons. Walking onto one and pressing the button enters it.
- Roaming enemies appear on the world map as visible sprites you can dodge; none are random invisible encounters.

### Regions

| Region | Feel | Main quest role |
| --- | --- | --- |
| Greenvale (center) | Farms, the capital, safe roads | Start, Act 1, the Cartographer's house |
| Fenmarch | Marsh villages on stilts, fog | Holds one Bearing |
| Highcairn | Mountains, monasteries, ruins | Holds one Bearing |
| Saltreach | Salt flats, nomad camps, a glass city | Holds one Bearing |
| Stormcoast | Cliffs, harbor towns, lighthouses | Holds one Bearing |

Which region holds which Bearing, and where the Hollow Crown sits, are chosen by the seed.

### Location maps

Location maps are hand-shaped templates filled in by the generator, so towns feel designed but still vary. Most are one to six screens; larger ones flip screen by screen, Atari-style.

| Location type | Typical size | What happens there |
| --- | --- | --- |
| Town | 4–6 screens | Talk, rumors, side quests, healing, the rival's gossip |
| Village or camp | 1–2 screens | A few people, one problem to solve |
| Ruin | 3–8 screens | Exploring, light combat, secrets, Bearing clues |
| Cave or mine | 3–8 screens | Darkness, simple puzzles, enemies |
| Tower or monastery | 2–4 floors | A key person, lore, a locked secret |
| Waystone | 1 screen | Checkpoint, full heal, fast travel between found Waystones |
| Landmark | 1 screen | A view, a lore tablet, sometimes a hidden entrance |

### Generation rules

1. Seed builds terrain and regions.
2. Required locations are placed first: the capital, one Bearing site per outer region, the Crown site, and at least one Waystone per region.
3. Side-quest locations and filler locations are scattered after that.
4. Names, NPCs and rumors are generated last and point at real places, so every rumor can be followed.
5. A validation pass checks that every required site is reachable with the gear the player can earn.

## Exploration and conversation

The core loop is: hear a rumor, travel to find it, talk to the people there, learn something that opens a new place. Combat interrupts this loop now and then; it never replaces it.

### Conversation

Talking uses an Ultima-style topic list, made menu-friendly for one button.

- Pressing the button next to someone opens the dialog screen: big portrait, environment background, text box.
- The menu offers **Ask about…**, **Show…** and **Leave**. A greeting plays automatically when the screen opens.
- **Ask about** lists every topic you've learned: people, places, objects, events. You learn topics by hearing them in other conversations, reading things, or discovering places.
- **Show** presents a key item or clue ("Show the broken compass"). Some people only open up when shown the right thing.
- Each NPC has short answers to common topics and special answers to the topics that matter to them.

### Disposition and Renown

- Each NPC has a disposition: Friendly, Neutral, Wary or Hostile. Wary people give short answers; Hostile ones won't talk.
- Each town has a Renown level for you. Finishing side quests there raises it and unlocks better answers, gated doors and favors.
- The rival can lower an NPC's disposition by reaching them first (see The Rival).

### Knowledge as progress

What you know is your most important possession.

- The **Journal** auto-records topics, rumors, quest steps and who told you what. Nothing has to be written down by the player.
- Some doors open to a spoken password, a name, or a fact. Knowing it is the key.
- Lore tablets and landmarks add topics, so exploring makes conversations richer and vice versa.

### Things to find while exploring

- Hidden entrances and side paths behind breakable walls or under bushes.
- Lore tablets that add topics and fill in the history of the Reach.
- Gear that opens new terrain (see progression).
- Lost Wayfarer's caches: a little lore and some marks or a charm.
- Vistas: landmarks that reveal a chunk of the world map when visited.

## Real-time action and combat

Combat is real time, short and readable: a fight should last seconds, not minutes, and most can be avoided. It happens right on the world or location map, with no separate battle screen.

### The one-button fight

Press the button to attack whatever is in front of you. That is the whole combat control: no guard, no shove, no hold.

- Each press swings the equipped weapon in the facing direction; DEX sets how soon you can swing again.
- Defense is movement: step out of an enemy's telegraphed attack.
- When hit, you get Joust-style knockback and a brief flicker of invulnerability.

A sling, when equipped as your weapon, fires on the same button instead of swinging, so the control never grows.

### Enemies

- Each region has three or four enemy types plus one rare tough one.
- Every attack is telegraphed by a flash or a pose, readable at 8×16 pixels.
- Enemies have simple, learnable patterns: chargers, circlers, shooters, guards.
- Many are territorial and stop chasing once you leave their area.
- Some "enemies" can be talked down or bribed with money or a favor instead of fought.

### Hit points

- HP shows as numbers in the status strip, for example HP 18/26.
- Proposed damage: weapon damage plus a STR bonus, minus the target's armor, at least 1.
- HP refills fully at any Waystone and slowly regenerates when no enemy is near.
- Inns heal fully for a few marks, and some food heals. There are no potions.

### Avoiding combat

Every main quest step has at least one non-combat route: sneaking, talking, a favor, or a hidden path. Bosses are the exception, and there are only a handful: one guardian per Bearing site at most, and the final confrontation.

## Character and progression

The player grows through levels, four stats, equipment, knowledge and reputation. Money buys equipment and food, and food is a short-lived bonus, never a need. There is no hunger, fatigue, light fuel, durability, weight limit or ammo.

### Your Wayfarer

At a new game you type a name and pick one of 3 or 4 premade looks, right after choosing the seed. Each look is a full set: an 8×16 sprite with walk frames, and a matching portrait for the character sheet. Stats, gear and story are the same whichever look you pick, and new looks are just more data files.

### What the player has

| Thing | How it works |
| --- | --- |
| HP | Hit points; grow with level |
| Level | 1 to 10; XP from quests, discoveries, conversations and fights |
| Stats | STR, DEX, WIS, CHA (below) |
| Equipment | Weapon, armor and charm slots; nothing breaks |
| Gear | Permanent tools that open terrain |
| Key items | Quest objects and clues for the Show menu; no limit |
| Food | Up to 3 carried; optional temporary bonuses |
| Money | Marks; buys equipment, food and services |
| Topics | Everything learned; drives conversations |
| Renown | Per-town reputation; unlocks people, places and favors |

### Stats

Four stats, each from 1 to 10. You start at 3 in each with 3 points to place, and gain 1 point per level.

| Stat | Affects |
| --- | --- |
| Strength (STR) | Melee damage, forcing stuck doors |
| Dexterity (DEX) | Attack speed, sling accuracy, sneaking past enemies |
| Wisdom (WIS) | How much you learn from tablets and the old tongue, hints from ghosts, how long the Ember lasts in the Underreach |
| Charisma (CHA) | Dialog checks, starting disposition, shop prices |

Some dialog options need a stat and show it, for example [CHA 5]. Missing it only closes that option; there is always another way through.

### Hit points and levels

- HP is 20 at level 1, plus 6 per level, for 74 at level 10.
- At least half of all XP comes from non-combat sources, so a talker levels as fast as a fighter.

| Level | Total XP needed | Max HP | Stat points to spend |
| --- | --- | --- | --- |
| 1 | 0 | 20 | 3 (at start) |
| 2 | 100 | 26 | 1 |
| 3 | 250 | 32 | 1 |
| 4 | 500 | 38 | 1 |
| 5 | 900 | 44 | 1 |
| 6 | 1,500 | 50 | 1 |
| 7 | 2,400 | 56 | 1 |
| 8 | 3,700 | 62 | 1 |
| 9 | 5,500 | 68 | 1 |
| 10 | 8,000 | 74 | 1 |

All numbers are starting values in a data file, to be tuned by playing. The same goes for prices, rewards and playthrough length.

### Where XP comes from

| Source | XP each | Rough count per world | Total |
| --- | --- | --- | --- |
| Learning a new topic | 10 | 150 | 1,500 |
| Discovering a location | 25 | 60 | 1,500 |
| Defeating an ordinary enemy | 2 to 10 | 200 | 1,200 |
| Finishing a side quest | 200 to 300 | 12 | 3,000 |
| Learning a Bearing, or winning one back from Corvin | 600 | 4 | 2,400 |
| Winning a guardian fight, or finding the way around it | 150 | 4 | 600 |
| **All sources** | | | **about 10,200** |

Level 10 needs 8,000, so a player who finishes most side quests reaches it around Act 3. Skipping ordinary fights still leaves about 9,000, enough for level 10.

### Leveling up

1. When XP crosses a threshold, a short POKEY fanfare plays and "LEVEL UP" flashes in the status strip. Play is not interrupted.
2. Max HP rises and HP refills to full on the spot.
3. A star appears next to LV in the status strip to show an unspent stat point.
4. Open the character sheet any time, even mid-journey, and move the cursor to a stat.
5. Press the button to add the point. A stat can't go above 10, and a point stays unspent until you choose.
6. Points are permanent once placed. A late-game side quest offers one full respec at a shrine, for a price in marks.

### Character sheet

The character sheet is a full screen inside the 160×192 frame, opened from the menu. Everything fits on one page with no scrolling.

| Area | Shows |
| --- | --- |
| Header | A framed portrait of the Wayfarer, name, level with a star when a stat point is unspent, an XP bar with "620 of 900 to level 5", and an HP bar with current and max HP |
| Stats | STR, DEX, WIS and CHA, each with its number and a 10-segment bar. Bonuses fill extra segments in their own color, green for food and blue for a charm, with the source and any time left beside the bar ("+2 STEW 2:14"). The heading shows points left to spend |
| Equipment | Weapon, armor and charm, each with an icon, name and its key number (DMG 6, ARMOR 3, WIS +1) |
| Gear | Icons for the five terrain gear pieces, greyed out until found |
| Purse | A coin icon and the marks carried |
| Pack | Three framed food slots, empty ones left blank |
| Bearings | Four diamonds, gold once found, with "2 of 4" |
| Footer | A one-line hint for the selected item, such as "Press button to add point" |

On the sheet the stick moves a cursor between stats, equipment slots and food, and the selected row is highlighted. The button spends a stat point, swaps equipment from what you own, or eats a food item.

### Gear that opens the world

Each piece of gear is a key to new terrain, so getting it is an exploration reward rather than a shopping trip.

| Gear | Opens |
| --- | --- |
| Climbing hook | Cliffs and ruined walls |
| Stilts or reed boat | Deep marsh and rivers |
| Glowstone lantern | Dark caves and the night forest |
| Wayfarer's seal | Locked guild doors and border gates |
| Old tongue lessons | Talking to the hill folk and reading old tablets at all; WIS decides how much you get from them |

Gear is earned from side quests, Bearing sites and key NPCs, and a few pieces can also be bought. The generator makes sure each one is reachable before it is needed.

### Money and shops

Money is counted in marks and is never lost, not even on death.

- **Earned** from quest rewards, caches, selling valuables, and small drops from some enemies.
- **Spent** on weapons, armor, charms, food, and services: an inn bed, a guide who reveals part of the map, a ferry, or a bribe in dialog.
- Each town's shop stocks gear that suits its region, and better gear appears further from Greenvale.

### Equipment

| Slot | Examples | Effect |
| --- | --- | --- |
| Weapon | Knife, short sword, spear, sling | Damage, speed and reach |
| Armor | Padded coat, leather, scale | Reduces damage taken |
| Charm | Owl feather, salt crystal | One perk, such as faster regeneration or a dialog bonus |

### Food

Food is a treat, not a need: nothing bad happens if you never eat.

- Bought at taverns and markets, and sometimes given as a reward or found.
- Eating gives one bonus for about 3 minutes of play. A new meal replaces the old bonus, so bonuses don't stack.
- You can carry up to 3 food items, and food never spoils.

| Food | Bonus |
| --- | --- |
| Bread and cheese | Restores 15 HP |
| Hearty stew | +2 STR |
| Honey cake | Faster HP regeneration |
| Fen tea | +2 WIS, a wider lantern glow in dark places |
| Traveler's pie | +2 DEX, faster walking on the world map |
| Spiced wine | +2 CHA |

## Main quest: The Hollow Crown

The main quest is to find four Bearings, the pieces of knowledge that together point to the Hollow Crown, then reach it before Corvin Vale does. Corvin can claim Bearings before you, and then you must win them back from him. The four Bearings can be found in any order, and each is won mostly by talking and exploring.

### Act 1: The unfinished map (Greenvale)

1. Summoned to the capital, you meet the Queen's steward and are given the Cartographer's journal.
2. At the Cartographer's house you meet Corvin Vale, who got there first and took half her notes.
3. The remaining notes explain the four Bearings and hint at which regions to search.
4. You earn your first piece of gear and the Wayfarer's seal, which lets you leave Greenvale.

### Act 2: The four Bearings (any order)

Each Bearing is a secret, not an object: a fact, a song, a star line or a name. Learning it adds a line to the Cartographer's map.

| Bearing | Region (example seed) | Shape of the search |
| --- | --- | --- |
| The Drowned Bell's song | Fenmarch | Gain a village's trust, find the sunken chapel, hear the song from a ghost |
| The Hermit's star line | Highcairn | Reach a monastery, solve the monks' dispute, read the star chart in the ruin above |
| The Glass Queen's name | Saltreach | Win over a nomad clan, enter the glass city, learn a name no one will say |
| The Lighthouse heading | Stormcoast | Relight a lighthouse, follow its beam to a wreck, recover the captain's log |

At each site the rival interferes in some way (see The Rival). Every Bearing has one optional guardian fight and at least one way around it.

### Act 3: The Hollow Crown

1. Once all four Bearings are claimed, by you or by Corvin, the map completes and the Crown's location appears on the world map.
2. The route there passes through a place you have already been, now changed.
3. Whoever holds more Bearings reaches the Crown first; on a tie you arrive together. Any Bearing you lack can still be won from Corvin there. What happens depends on your choices: a duel, a race, a deal, or a joint entry.
4. At the Crown you choose what the Reach becomes. Your Renown and how you treated the rival shape which choices are open.

### Endings

- **The Restored Reach:** you return the Crown to the land.
- **The Wayfarer's Crown:** you claim it for yourself.
- **The Guild's Reach:** Corvin claims it, either because he got there first or because you let him.
- **The Shared Road:** you and Corvin choose together; only possible if you redeemed him.

## Side quests

Each world gets about 10 to 15 side quests, two or three per region, built from templates and filled with the seed's people and places. They are where most gear, money, XP and Renown come from, so they feed the main quest without being required.

### Templates

| Template | Shape | Typical reward |
| --- | --- | --- |
| Lost and found | Someone lost a person, pet or heirloom; follow rumors to it | Marks, XP, Renown |
| Go-between | Two people or villages are feuding; carry words, find the truth | Topic, favor, Renown in both places |
| Map the unknown | A guild wants a landmark found and visited | Gear, map reveal |
| Clear the road | Something dangerous blocks a path; fight it or find another way | Gear, shortcut |
| Unfinished business | A ghost in the Underreach wants something done on the surface | Lore, a charm |
| The rival's mess | Corvin cheated or hurt someone; set it right | Renown, rival standing |
| Old tongue | A tablet or song needs translating across three people | Topic, door opened |

### Hand-written anchor quests

A few side quests are written by hand and placed in every world, to give the game a memorable core.

1. **The Cartographer's apprentice.** A runaway apprentice holds pages Corvin didn't take. Finding her gives an early Bearing hint.
2. **The Ferryman's coin.** Only available after your first death. The Underreach ferryman lost something on the surface.
3. **Corvin's sister.** A woman in Stormcoast knows who Corvin was before the Guild. Required for the redemption ending.
4. **The last Wayfarer's cache.** Five caches across the Reach form a chain; the last holds the best charm in the game.

### Rules

- Side quests never fail on a timer. A few can be lost if the rival gets there first, and the journal says so plainly.
- Each one has a short arc: hook, travel, a twist or choice, return.
- Every quest's hook is a rumor or a person, so it is found by talking.

## The Rival: Corvin Vale

Corvin Vale is a charming, gifted Wayfarer sent by the Ashen Guild, and he is always working the same quest you are. He is not a monster: he is what you might become if you only cared about winning, and he can be beaten, outwitted or redeemed.

### How he works against you

Corvin earns **rival steps**: one each time you claim a Bearing, and one each time you die (at most once per region per Act). On every second step he claims the Bearing he has been heading for, unless you already hold it, in which case he turns to another. He never moves on a real-time clock, so you can explore at your own pace. Rumors and the Journal say where he is heading, so you can race him there.

- **A Bearing he claims is his.** The person or place that held it falls silent, and the only way to get it is from him.
- **Winning one back:** at any later meeting you can duel him, strike a deal (marks, a favor, or one of your own Bearings), or, if his Regard is high, he shares it.
- **Opening Act 3:** once all four Bearings are claimed by either of you, the Crown appears on the map. Whoever holds more arrives first; on a tie you arrive together.
- With no deaths, he ends up with one Bearing to your three. Each death tips that balance toward him.

### Interference at a site

When you arrive somewhere Corvin has been, one of these has happened, picked by the seed:

| Interference | What the player finds | Way to undo it |
| --- | --- | --- |
| He lied first | A key NPC is Wary and repeats his version | Show proof, or find a witness |
| He bought them | A guard or guide is working for the Guild | Outbid him, a better favor, or Renown |
| He took the shortcut | A bridge is cut or a door sealed | Find the long way round |
| He hired muscle | Guild thugs wait on the road | Fight, sneak, or talk them down |
| He's still here | Corvin himself, mid-search | Talk, race, or duel |

### Meeting him

You meet Corvin face to face at least five times: at the Cartographer's house, at two or three Bearing sites, once when he is in trouble and needs your help, and at the Crown. Each meeting is a dialog scene with real choices: trade information, mock him, help him, or fight.

### His arc

A hidden **Regard** value tracks how you have treated him. Helping him when he's in trouble, finishing "The rival's mess" quests kindly, and the Corvin's sister quest all raise it. High Regard opens the Shared Road ending; low Regard means a final duel.

## Death and the Underreach

When you die, you don't reload: you wake in the Underreach, a shadow copy of the land below, and must find your way back up. A typical escape takes two to five minutes and is a small adventure of its own.

### What it looks like

- The same 8×16 style in an inverted, cold palette: blacks, violets and bone white.
- Its layout echoes the surface region where you died, flipped and broken, so it feels familiar and wrong.
- The music drops to a single slow POKEY voice.

### The escape

1. You wake by the Black River with no light. Your gear is with you, but your lantern doesn't work here.
2. Find an **Ember**, a wandering light you can follow or catch, so you can see.
3. Cross the Underreach while avoiding **Wardens**, slow hunters that cannot be killed, only avoided.
4. Reach one of the **Stairs**. The Ferryman can show you the nearest one if you talk to him.
5. Climb out at the last Waystone you touched, with full HP.

If a Warden catches you, you're sent back to the riverbank, not to a game over. There is no way to lose the game by dying.

### What dying costs

There is no item, money or experience loss, in keeping with the no-chores pillar. The costs are:

- **Time and distance:** you come back at a Waystone, maybe far from where you were.
- **Rival ground:** Corvin gains a rival step, at most once per surface region per Act, so repeated deaths on one hard fight can't lose you the game.

### What dying gives

The Underreach is worth seeing. Shades of the dead live there and talk like anyone else:

- Ghosts tied to Bearings give hints you can't get on the surface.
- "Unfinished business" side quests start here.
- The Ferryman's coin quest unlocks after the first death.
- Corvin's dead mentor waits here once, with a story about who Corvin used to be.

Later in the game a side quest opens a Gloamwell, letting you enter the Underreach on purpose.

## Audio

All music and sound run through the game's POKEY emulator: four square-wave voices with Atari-style distortion and noise. Music should be makeable without music knowledge.

### Music cues

| Cue | Mood | When it plays |
| --- | --- | --- |
| Title | Wide, hopeful | Title and seed screen |
| World map | Steady walking tune, per-region variation | Traveling |
| Town | Light, busy | Inside towns and villages |
| Ruin or cave | Sparse, low drone | Dungeon-like locations |
| Rival | Short sly motif | When Corvin appears |
| Danger | Fast bass pulse | Boss and guardian fights |
| Underreach | One slow voice, lots of space | After death |
| Crown | The title theme, finished | Act 3 and endings |

### Sound effects

Swing, hit, enemy down, talk blip, new topic learned, item found, door, Waystone, death, Ember caught, Stair climbed.

### Making music without music knowledge

The proposed approach is a small mood-based generator: pick a mood, scale and tempo, and a script writes patterns for the four voices, which you then trim by ear. Sound effects come from a preset editor with sliders for pitch, sweep and noise, like the old "sfxr" tools.

## Screens and UI flow

Screens: **Title and seed** (pick or roll a seed, then name and look) → **World map** ⇄ **Location map** ⇄ **Dialog screen**. When HP runs out on the world map or in a location, you go to the **Underreach**; climbing a Stair brings you to a **Waystone** at full HP and back onto the world map. Being caught by a Warden sends you back to the start of the Underreach.

Every route ends back on the world map. Combat happens on the map itself, so it has no screen of its own.

- **Menu overlay** (from any map): character sheet, Journal, world map with found Waystones, key items, save and settings.
- **Saving:** save anywhere from the menu, plus an autosave at every Waystone and when entering or leaving a location. Reloading to undo a death is allowed; the Underreach is there for whoever wants it.
- **Text:** the 3×5 pixel font from Centipede; dialog advances with the action button.

## Build milestones and open questions

Build in vertical slices so the game is playable at every step, starting from the existing prototype.

1. **Engine core:** 160×192 wide-pixel canvas in a bezel, Atari palette, 8×16 tile renderer, one-button input on phone and keyboard.
2. **Seeded world map:** terrain, five regions, location icons, enter and exit locations.
3. **One town and one ruin:** hand-shaped templates, screen flipping, NPC placement.
4. **Conversation system:** dialog screen, Ask about and Show, topics, journal, disposition, shops, money and food.
5. **Combat:** press-to-attack, three enemy types, HP, stats, leveling and regeneration.
6. **Death and the Underreach:** the escape loop, Ember, Wardens, Stairs, Waystone return.
7. **Rival track:** Corvin's progress, interference types, the first two meetings.
8. **Act 1 playable end to end.**
9. **One full Bearing region** with its side quests: the vertical slice to play and tune.
10. **Remaining regions, Act 3 and endings.**
11. **Audio pass:** music cues and sound effects.
12. **Polish and balance:** seed validation, difficulty, save system.

### Open questions

None right now. New ones get added here as the build turns them up.
