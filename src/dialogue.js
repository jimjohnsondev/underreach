// dialogue.js
// Works out what a townsperson says: their greeting, their answer to a topic, their rumor, and
// what they make of an item you show them. All the words are in data/dialogue.json; this file
// picks lines and fills in their markers ({name}, {place}, {direction}...).
//
// Rumors point at real places, as the design doc asks: a line about "a ruin called {place}"
// names an actual ruin in this world, says which way it lies from here, and hearing it teaches
// you that place as a topic, so every rumor can be followed.
//
// A conversation needs a context:
//   speaker    the person talking: { id, role, label, name, disposition }
//   here       the location you're in
//   residents  everyone in this location (for "ask our elder, {person:elder}")
//   locations  every visible location in the world
//   regionNames, regionIds   region names and ids, by region number
//   lines      data/dialogue.json
//   seed       the world seed, so the same person says different things in different worlds
import { makeRandom } from './gen/random.js';
import { placeTopic, personTopic, knownTopics } from './knowledge.js';

// Topics you can always ask anyone about, in menu order.
const FIXED_TOPICS = ['yourself', 'here', 'news'];

/** Returns the greeting someone says when the dialog screen opens. */
export function greet(ctx) {
  const { lines, speaker } = ctx;
  const mood = speaker.disposition;
  const roleLines = lines.roleGreetings[speaker.role];
  const list = (mood === 'friendly' || mood === 'neutral') && roleLines ? roleLines : lines.greetings[mood];
  return { text: fill(pick(ctx, 'greeting', list), {}, ctx).text, teaches: [] };
}

/** Returns what someone says when you leave. */
export function farewell(ctx) {
  return pick(ctx, 'farewell', ctx.lines.farewell);
}

/** Returns the topics in the "Ask about" list: the fixed ones, then everything learned, newest first. */
export function askableTopics(ctx, knowledge) {
  const fixed = FIXED_TOPICS.map(id => ({ id, label: ctx.lines.topics[id].label }));
  return [...fixed, ...knownTopics(knowledge).map(t => ({ id: t.id, label: t.label }))];
}

/**
 * Returns someone's answer about a topic: { text, teaches }, where `teaches` lists the topics
 * the answer mentions, for the caller to learn. Wary people only say one sentence (see shorten).
 */
export function answer(ctx, topicId, knowledge) {
  const { lines, speaker, here } = ctx;
  const topics = lines.topics;

  if (topicId === 'yourself') {
    return say(ctx, 'yourself', topics.yourself.byRole[speaker.role] || topics.yourself.default, {});
  }
  if (topicId === 'here') {
    // This kind of place's own lines first; the plain default only if none of them work here.
    const own = topics.here.byType[here.type];
    const result = own ? say(ctx, 'here', own, {}) : null;
    return result && result.ok ? result : say(ctx, 'here', topics.here.byType.default, {});
  }
  if (topicId === 'news') return tellRumor(ctx);

  const topic = knowledge.topics.get(topicId);
  if (topic && topic.kind === 'place') return aboutPlace(ctx, topic);
  if (topic && topic.kind === 'person') return aboutPerson(ctx, topic);
  return say(ctx, 'unknown', lines.unknown, {});
}

/** Returns what someone says when shown an item (by id from data/items.json). */
export function reactToItem(ctx, itemId) {
  const show = ctx.lines.show;
  return say(ctx, `show-${itemId}`, show.byItem[itemId] || show.default, {});
}

/** NEWS: a rumor about a real place, which teaches that place. */
function tellRumor(ctx) {
  const news = ctx.lines.topics.news;
  const place = rumorTarget(ctx);
  if (!place) return say(ctx, 'news', news.nothing, {});
  const result = say(ctx, 'news', news.rumors[place.type] || news.nothing, { place });
  // Every rumor should be followable; a line without {place} can't be.
  if (!result.teaches.length && ctx.speaker.disposition !== 'wary') {
    console.warn(`A ${place.type} rumor taught nothing: "${result.text}". Add {place} to it in dialogue.json.`);
  }
  return result;
}

/** What someone says about a place: where it lies from here, or that you're in it. */
function aboutPlace(ctx, topic) {
  const lines = ctx.lines;
  const place = ctx.locations.find(l => l.id === topic.ref.locationId);
  if (!place) return say(ctx, 'unknown', lines.unknown, {});
  if (place.id === ctx.here.id) return say(ctx, 'place-here', lines.place.here, { place });
  return say(ctx, `place-${place.id}`, lines.place.byType[place.type] || lines.place.default, { place });
}

/**
 * What someone says about a person: themselves, someone here (and where to find them), or
 * someone from another place (and which place that is).
 */
function aboutPerson(ctx, topic) {
  const lines = ctx.lines;
  const { personId, locationId, name, role, roleLabel } = topic.ref;
  if (personId === ctx.speaker.id) return say(ctx, 'person-self', lines.person.self, {});
  const resident = ctx.residents.find(r => r.id === personId);
  if (resident) return say(ctx, `person-${personId}`, lines.person.here, { person: resident });
  const place = ctx.locations.find(l => l.id === locationId);
  if (place && place.id !== ctx.here.id) {
    return say(ctx, `person-${personId}`, lines.person.elsewhere, { person: { name, role, label: roleLabel }, place });
  }
  return say(ctx, 'person-unknown', lines.person.unknown, {});
}

/**
 * Picks a line from `list` (the same one each time for this speaker, world and `key`), skipping
 * lines whose markers can't be filled here, and fills it in. Wary people's lines are cut short
 * first, so they only teach what they actually say.
 */
function say(ctx, key, list, vars) {
  const start = speakerRandom(ctx, key).int(list.length);
  const wary = ctx.speaker.disposition === 'wary';
  for (let i = 0; i < list.length; i++) {
    const line = list[(start + i) % list.length];
    const result = fill(wary ? shorten(line) : line, vars, ctx);
    if (result.ok) return result;
  }
  return { text: '...', teaches: [], ok: false };
}

/**
 * A wary person's version of a line: just one sentence. A line that opens by repeating the
 * question ("{place}? A TOWN TO THE EAST.") skips that, so the one sentence is the useful one.
 */
function shorten(line) {
  const sentences = line.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return line;
  const first = sentences[0].trim();
  if (first.endsWith('?') && sentences.length > 1) return sentences[1].trim();
  return first;
}

/**
 * Fills a line's markers. Returns { text, teaches, ok }, where ok is false if a marker couldn't
 * be filled (such as {person:elder} where there's no elder).
 */
function fill(line, vars, ctx) {
  const teaches = [];
  let ok = true;
  const text = line.replace(/\{([a-z]+)(?::([a-z]+))?\}/g, (match, marker, role) => {
    switch (marker) {
      case 'name': return ctx.speaker.name;
      case 'role': return vars.person ? vars.person.label : ctx.speaker.label;
      case 'here': return ctx.here.label;
      case 'region': return ctx.regionNames[ctx.here.region];
      case 'place':
        if (!vars.place) { ok = false; return match; }
        teaches.push(placeTopic(vars.place));
        return vars.place.label;
      case 'kind': return vars.place ? vars.place.kindLabel : match;
      case 'direction': return vars.place ? directionTo(ctx, vars.place) : match;
      case 'distance': return vars.place ? distanceTo(ctx, vars.place) : match;
      case 'where': return vars.person ? (ctx.lines.where[vars.person.role] || ctx.lines.where.default) : match;
      case 'person': {
        const person = role ? ctx.residents.find(r => r.role === role) : vars.person;
        if (!person) { ok = false; return match; }
        if (role) teaches.push(personTopic(person, ctx.here));
        return person.name;
      }
      default: return match;
    }
  });
  return { text, teaches, ok };
}

/**
 * Picks the place someone's rumor is about: any other visible location, favoring ones in the same
 * region and nearby ("rumorOdds" in dialogue.json). The same speaker always tells the same rumor.
 */
function rumorTarget(ctx) {
  const odds = ctx.lines.rumorOdds;
  const candidates = ctx.locations.filter(l => l.id !== ctx.here.id && !l.hidden);
  if (!candidates.length) return null;
  const weights = candidates.map(l => {
    const sameRegion = l.region === ctx.here.region ? odds.sameRegion : 1;
    return sameRegion / (1 + tileDistance(ctx.here, l) / odds.distanceFalloff);
  });
  let roll = speakerRandom(ctx, 'rumor').next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** "TO THE NORTHEAST", plus the region if it's a different one ("TO THE EAST, IN FENMARCH"). */
function directionTo(ctx, place) {
  // Tiles look square on screen, so tile distances can be compared directly in both directions.
  const angle = Math.atan2(place.y - ctx.here.y, place.x - ctx.here.x);
  const eighth = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  const direction = ctx.lines.directions[eighth];
  if (place.region === ctx.here.region) return direction;
  return ctx.lines.otherRegion.replace('{direction}', direction).replace('{region}', ctx.regionNames[place.region]);
}

/** "NOT FAR", "SOME WAY OFF" or "A LONG WAY OFF", from the distances in dialogue.json. */
function distanceTo(ctx, place) {
  const tiles = tileDistance(ctx.here, place);
  const band = ctx.lines.distances.find(d => d.upTo === undefined || tiles <= d.upTo);
  return band.text;
}

/** Straight-line distance between two locations, in tiles. */
function tileDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Picks a line from a list, the same each time for this speaker, world and key. */
function pick(ctx, key, list) {
  return list[speakerRandom(ctx, key).int(list.length)];
}

/** Random numbers for one speaker and purpose, the same every time in the same world. */
function speakerRandom(ctx, key) {
  return makeRandom(`${ctx.seed}-${ctx.speaker.id}-${key}`);
}
