// knowledge.js
// What the Wayfarer knows: the topics he's learned (places and people), who told him what about
// each, and which places he's been to. This is the Journal's content, and the list he can "Ask
// about" in conversation. As the design doc puts it, what you know is your most important
// possession; nothing has to be written down by the player.

/** Creates an empty store of knowledge. */
export function createKnowledge() {
  return {
    topics: new Map(),   // topic id -> { id, label, kind, ref, notes: [{ text, from }], order }
    visited: new Set(),  // ids of locations he's been inside
    xp: 0,               // experience earned from learning and discovering (levels come in milestone 5)
    count: 0,            // how many topics have been learned, to keep them in order
  };
}

/**
 * Learns a topic, or adds a note to one already known. `topic` is { id, label, kind, ref } and
 * `note` is { text, from } (what was said and who said it), or null. Returns true if the topic
 * was new. `rewards` (from data/player.json) says how much XP a new topic is worth.
 */
export function learnTopic(knowledge, topic, note, rewards) {
  let known = knowledge.topics.get(topic.id);
  const isNew = !known;
  if (isNew) {
    known = { ...topic, notes: [], order: knowledge.count++ };
    knowledge.topics.set(topic.id, known);
    knowledge.xp += rewards ? rewards.topic : 0;
  }
  if (note && !known.notes.some(n => n.text === note.text)) known.notes.push(note);
  return isNew;
}

/** True if the topic with this id has been learned. */
export function knows(knowledge, id) {
  return knowledge.topics.has(id);
}

/** Returns every learned topic, most recently learned first. */
export function knownTopics(knowledge) {
  return [...knowledge.topics.values()].sort((a, b) => b.order - a.order);
}

/**
 * Records going inside a location. The first visit is worth discovery XP, and teaches the place
 * as a topic (if it wasn't already known) with `note` ({ text, from }) in the journal. A
 * discovery is worth its discovery XP only, not topic XP on top. Returns true on the first visit.
 */
export function markVisited(knowledge, location, rewards, note) {
  if (knowledge.visited.has(location.id)) return false;
  knowledge.visited.add(location.id);
  knowledge.xp += rewards ? rewards.discovery : 0;
  learnTopic(knowledge, placeTopic(location), note, null);
  return true;
}

/** The topic for a place in the world. */
export function placeTopic(location) {
  return { id: `place:${location.id}`, label: location.label, kind: 'place', ref: { locationId: location.id } };
}

/**
 * The topic for a person: someone in a location. It's labelled with their place too ("BRAM OF
 * MOSSFORD"), since names are only unique within one place.
 */
export function personTopic(person, location) {
  return {
    id: `person:${person.id}`,
    label: `${person.name} OF ${location.short || location.label}`,
    kind: 'person',
    ref: {
      personId: person.id, locationId: location.id, name: person.name,
      role: person.role, roleLabel: person.label,
    },
  };
}
