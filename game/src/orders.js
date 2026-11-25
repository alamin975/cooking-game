// Order board logic: spawning orders, their countdowns and expiry.
// An order is { id, recipe, bornAt, ttl, slot }. The board holds at most 3.

import { RECIPES, ORDER_TTL } from './recipes.js';

let nextId = 1;

export function makeOrder(now, slot) {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return { id: nextId++, recipe, bornAt: now, ttl: ORDER_TTL, slot };
}

export function orderRemaining(order, now) {
  return Math.max(0, order.ttl - (now - order.bornAt));
}

export function orderExpired(order, now) {
  return now - order.bornAt >= order.ttl;
}

// Pick a recipe different from the one already on the board when possible,
// so the board rarely shows the same dish twice.
export function pickRecipe(excludeIds) {
  const pool = RECIPES.filter((r) => !excludeIds.includes(r.id));
  const list = pool.length ? pool : RECIPES;
  return list[Math.floor(Math.random() * list.length)];
}

export function makeOrderVaried(now, slot, board) {
  const exclude = board.map((o) => o.recipe.id);
  const recipe = pickRecipe(exclude);
  return { id: nextId++, recipe, bornAt: now, ttl: ORDER_TTL, slot };
}
