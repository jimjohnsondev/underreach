// paths.js
// Finds the cheapest route across the map, used for laying roads and trails. Each tile has a
// cost to cross (grass is cheap, mountains are expensive, the sea can't be crossed), and the
// route with the lowest total wins. This is Dijkstra's algorithm.
import { neighbors } from './grid.js';

/**
 * Returns the cheapest route from tile index `start` to any tile where `isGoal(i)` is true,
 * as a list of tile indexes from start to goal. `costOf(i)` is the cost of stepping onto
 * tile i; Infinity means it can't be entered. Returns null if no goal can be reached.
 */
export function findPath(grid, start, isGoal, costOf) {
  const size = grid.tiles.length;
  const best = new Float64Array(size).fill(Infinity);   // cheapest known cost to reach each tile
  const cameFrom = new Int32Array(size).fill(-1);
  const queue = new MinQueue();

  best[start] = 0;
  queue.push(start, 0);

  while (queue.size) {
    const { item: current, priority: cost } = queue.pop();
    if (cost > best[current]) continue;   // a cheaper way here was already handled
    if (current !== start && isGoal(current)) return traceBack(cameFrom, current);

    for (const next of neighbors(grid, current)) {
      const step = costOf(next);
      if (step === Infinity) continue;
      const total = cost + step;
      if (total < best[next]) {
        best[next] = total;
        cameFrom[next] = current;
        queue.push(next, total);
      }
    }
  }
  return null;
}

/** Follows the cameFrom links back from the goal and returns the route from start to goal. */
function traceBack(cameFrom, goal) {
  const route = [];
  for (let i = goal; i !== -1; i = cameFrom[i]) route.push(i);
  return route.reverse();
}

/** A list that always hands back the item with the lowest priority first (a binary heap). */
class MinQueue {
  constructor() {
    this.items = [];
    this.priorities = [];
  }

  get size() {
    return this.items.length;
  }

  /** Adds an item with a priority. */
  push(item, priority) {
    this.items.push(item);
    this.priorities.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent] <= priority) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Removes and returns the item with the lowest priority, as { item, priority }. */
  pop() {
    const top = { item: this.items[0], priority: this.priorities[0] };
    const lastItem = this.items.pop(), lastPriority = this.priorities.pop();
    if (this.items.length) {
      this.items[0] = lastItem;
      this.priorities[0] = lastPriority;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1, right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.priorities[left] < this.priorities[smallest]) smallest = left;
        if (right < this.items.length && this.priorities[right] < this.priorities[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  /** Swaps two entries in the heap. */
  swap(a, b) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b], this.priorities[a]];
  }
}
