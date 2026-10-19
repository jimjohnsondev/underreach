// items.js
// The Wayfarer's pack and purse: buying food and equipment, paying for services like an inn bed,
// and eating. Item names, prices, effects and which shop sells what are in data/items.json.
//
// Food is a treat, not a need (design pillar 3): up to packSize meals carried, none spoil, and
// eating gives one bonus for a few minutes; a new meal replaces the old bonus.

/** Gives the Wayfarer an empty pack. */
export function initPack(player) {
  player.pack = { food: [], keyItems: [], equipment: [] };
  player.bonus = null;   // the current meal's bonus: { food, effect, timeLeft }
}

/**
 * Returns what a townsperson offers, by role and region: a list of
 * { kind: 'food' | 'equipment' | 'service', id, name, price }. Empty if they don't trade.
 */
export function shopOffers(role, regionId, items) {
  const shop = items.shops[role];
  if (!shop) return [];
  const sells = (shop.sells && (shop.sells[regionId] || shop.sells.default)) || [];
  const goods = [];
  for (const id of sells) {
    const kind = items.food[id] ? 'food' : items.equipment[id] ? 'equipment' : null;
    if (!kind) {
      console.warn(`The ${role}'s stock lists "${id}", which isn't food or equipment in items.json`);
      continue;
    }
    const item = items[kind][id];
    goods.push({ kind, id, name: item.name, price: item.price });
  }
  const services = Object.entries(shop.services || {}).map(([id, service]) => (
    { kind: 'service', id, name: service.name, price: service.price, service }
  ));
  return [...services, ...goods];
}

/**
 * Buys one offer (from shopOffers). Returns what happened, as the key of a line in the "shop"
 * section of dialogue.json: 'bought', 'noMoney', 'packFull', 'alreadyOwn', 'alreadyWell', or
 * a service's own "reply" (like 'slept'). Nothing is paid unless it works.
 */
export function buy(player, offer, items) {
  if (offer.kind === 'service') {
    if (offer.service.heal && player.hp >= player.maxHp) return 'alreadyWell';
    if (player.marks < offer.price) return 'noMoney';
    player.marks -= offer.price;
    if (offer.service.heal) player.hp = player.maxHp;
    return offer.service.reply;
  }
  if (player.marks < offer.price) return 'noMoney';
  if (offer.kind === 'food') {
    if (player.pack.food.length >= items.packSize) return 'packFull';
    player.pack.food.push(offer.id);
  } else {
    if (player.pack.equipment.includes(offer.id)) return 'alreadyOwn';
    player.pack.equipment.push(offer.id);
  }
  player.marks -= offer.price;
  return 'bought';
}

/**
 * Eats the food in pack slot `index`. Healing happens now; any other effect becomes the current
 * bonus for foodDuration updates, replacing the last one. Returns the food eaten, or null.
 */
export function eat(player, index, items) {
  const id = player.pack.food[index];
  if (!id) return null;
  player.pack.food.splice(index, 1);
  const food = items.food[id];
  if (food.effect.heal) player.hp = Math.min(player.maxHp, player.hp + food.effect.heal);
  const lasting = Object.keys(food.effect).some(key => key !== 'heal');
  if (lasting) player.bonus = { food: id, effect: food.effect, timeLeft: items.foodDuration };
  return food;
}

/** Counts down the current food bonus by one update, ending it when time's up. */
export function tickBonus(player) {
  if (player.bonus && --player.bonus.timeLeft <= 0) player.bonus = null;
}

/** How much faster than normal the Wayfarer walks right now (food can speed up world-map travel). */
export function speedMultiplier(player, onWorldMap) {
  return onWorldMap && player.bonus && player.bonus.effect.walkSpeed ? player.bonus.effect.walkSpeed : 1;
}

/** Describes the current bonus for the pack screen, e.g. "+2 STR 2:14", or null if there isn't one. */
export function describeBonus(player, updatesPerSecond = 60) {
  if (!player.bonus) return null;
  const effect = player.bonus.effect;
  const parts = [];
  if (effect.stat) parts.push(`+${effect.amount} ${effect.stat}`);
  if (effect.walkSpeed) parts.push('FAST TRAVEL');
  if (effect.regen) parts.push('HEALING');
  const seconds = Math.ceil(player.bonus.timeLeft / updatesPerSecond);
  return `${parts.join(', ')} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
