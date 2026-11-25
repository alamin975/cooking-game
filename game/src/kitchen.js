// Kitchen state: the plate being assembled and the two prep stations.
// The plate is a list of ingredient ids in the order they were added.
// Each station holds at most one item: { ingredient, startedAt, doneAt }.

import { INGREDIENTS, PREP_TIME } from './recipes.js';

export function makeKitchen() {
  return {
    plate: [],
    grill: null,
    board: null,
    shakeUntil: 0,
  };
}

// The next step the selected recipe needs, or null when the plate is done.
export function nextNeededStep(kitchen, recipe) {
  if (!recipe) return null;
  if (kitchen.plate.length >= recipe.steps.length) return null;
  return recipe.steps[kitchen.plate.length];
}

// Send an ingredient to its prep station, or straight onto the plate.
// Returns 'plate' | 'station' | 'busy' | 'wrong'.
export function addIngredient(kitchen, ingredientId, recipe, now) {
  const needed = nextNeededStep(kitchen, recipe);
  if (!needed || needed !== ingredientId) return 'wrong';
  const ing = INGREDIENTS[ingredientId];
  if (!ing.prep) {
    kitchen.plate.push(ingredientId);
    return 'plate';
  }
  const station = ing.prep === 'grill' ? 'grill' : 'board';
  if (kitchen[station]) return 'busy';
  kitchen[station] = { ingredient: ingredientId, startedAt: now, doneAt: now + PREP_TIME[ing.prep] };
  return 'station';
}

// Take a finished item off a station onto the plate. Returns true on success.
export function collectStation(kitchen, station, now) {
  const job = kitchen[station];
  if (!job || now < job.doneAt) return false;
  kitchen.plate.push(job.ingredient);
  kitchen[station] = null;
  return true;
}

export function stationReady(kitchen, station, now) {
  const job = kitchen[station];
  return !!job && now >= job.doneAt;
}

export function stationProgress(kitchen, station, now) {
  const job = kitchen[station];
  if (!job) return 0;
  const total = job.doneAt - job.startedAt;
  return Math.min(1, Math.max(0, (now - job.startedAt) / total));
}

// Is the plate exactly the recipe, step for step?
export function plateMatches(kitchen, recipe) {
  if (!recipe) return false;
  if (kitchen.plate.length !== recipe.steps.length) return false;
  return recipe.steps.every((step, i) => kitchen.plate[i] === step);
}

export function clearPlate(kitchen) {
  kitchen.plate = [];
}
