// Rush Hour Kitchen — boot, game loop and state machine.
// Screens: title -> play -> over. Orders arrive on the board, the player
// builds the selected dish step by step on the plate and serves it.

import { W, H, layout, drawTopBar, drawOrders, drawCounter, drawStations, drawPlate, drawTitle, drawGameOver } from './render.js';
import { makeOrderVaried, orderExpired, orderRemaining } from './orders.js';
import { makeKitchen, addIngredient, collectStation, plateMatches, clearPlate } from './kitchen.js';
import { RECIPES } from './recipes.js';
import { bindInput, pointIn } from './input.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const SHIFT_LENGTH = 120000;

const state = {
  screen: 'title',
  score: 0,
  combo: 0,
  bestCombo: 0,
  lives: 3,
  served: 0,
  board: [],
  selectedId: null,
  kitchen: makeKitchen(),
  shiftEndsAt: 0,
  shiftLength: SHIFT_LENGTH,
  nextSpawnAt: 0,
  spawnGap: 7000,
};

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function selectedOrder() {
  return state.board.find((o) => o.id === state.selectedId) || null;
}

function selectedRecipe() {
  const o = selectedOrder();
  return o ? o.recipe : null;
}

function spawnOrder(now) {
  const slot = state.board.length;
  const order = makeOrderVaried(now, slot, state.board);
  state.board.push(order);
  if (!state.selectedId) state.selectedId = order.id;
}

function startShift(now) {
  state.screen = 'play';
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.lives = 3;
  state.served = 0;
  state.board = [];
  state.selectedId = null;
  state.kitchen = makeKitchen();
  state.shiftEndsAt = now + SHIFT_LENGTH;
  state.spawnGap = 7000;
  spawnOrder(now);
  state.nextSpawnAt = now + state.spawnGap;
  statusEl.textContent = 'Shift started. Pick an order and build it.';
}

function endShift(reason) {
  state.screen = 'over';
  statusEl.textContent = `Shift over: ${reason}. Final score ${state.score}.`;
  sfx.lose();
}

function serveDish(now) {
  if (state.screen !== 'play') return;
  const order = selectedOrder();
  if (!order) return;
  if (!plateMatches(state.kitchen, order.recipe)) {
    state.kitchen.shakeUntil = now + 700;
    state.combo = 0;
    sfx.buzz();
    statusEl.textContent = 'That plate does not match the order yet.';
    return;
  }
  const timeBonus = Math.round((orderRemaining(order, now) / order.ttl) * 50);
  const gained = order.recipe.price + timeBonus + state.combo * 25;
  state.score += gained;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.board = state.board.filter((o) => o.id !== order.id);
  state.selectedId = state.board.length ? state.board[0].id : null;
  clearPlate(state.kitchen);
  sfx.serve();
  statusEl.textContent = `Served ${order.recipe.name} for ${gained} points.`;
}

function addStep(ingredientId, now) {
  if (state.screen !== 'play') return;
  const recipe = selectedRecipe();
  if (!recipe) return;
  const res = addIngredient(state.kitchen, ingredientId, recipe, now);
  if (res === 'wrong') {
    state.kitchen.shakeUntil = now + 700;
    state.combo = 0;
    sfx.buzz();
    statusEl.textContent = 'Wrong ingredient — check the next step on the plate.';
  } else if (res === 'station') {
    sfx.sizzle();
    statusEl.textContent = 'On the station — wait for it, then click to take it.';
  } else if (res === 'plate') {
    sfx.add();
  }
}

function collect(station, now) {
  if (state.screen !== 'play') return;
  if (collectStation(state.kitchen, station, now)) sfx.ding();
}

function update(now) {
  if (state.screen !== 'play') return;
  if (now >= state.shiftEndsAt) { endShift('time is up'); return; }
  if (now >= state.nextSpawnAt && state.board.length < 3) {
    spawnOrder(now);
    state.spawnGap = Math.max(4500, state.spawnGap - 250);
    state.nextSpawnAt = now + state.spawnGap;
  }
  for (const order of [...state.board]) {
    if (orderExpired(order, now)) {
      state.board = state.board.filter((o) => o.id !== order.id);
      state.lives -= 1;
      state.combo = 0;
      clearPlate(state.kitchen);
      sfx.lose();
      statusEl.textContent = `Order ${order.recipe.name} expired — a life lost.`;
      if (state.selectedId === order.id) state.selectedId = state.board.length ? state.board[0].id : null;
      if (state.lives <= 0) { endShift('too many orders expired'); return; }
    }
  }
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(0, 0, W, H);
  if (state.screen === 'title') { drawTitle(ctx); return; }
  if (state.screen === 'over') {
    drawTopBar(ctx, state, now);
    drawGameOver(ctx, state);
    return;
  }
  const regions = layout();
  drawTopBar(ctx, state, now);
  drawOrders(ctx, { ...state, selectedRecipe: selectedRecipe() }, now, regions);
  drawCounter(ctx, { ...state, selectedRecipe: selectedRecipe() }, regions);
  drawStations(ctx, state, now, regions);
  drawPlate(ctx, { ...state, selectedRecipe: selectedRecipe() }, now, regions);
}

function loop(now) {
  update(now);
  draw(now);
  requestAnimationFrame(loop);
}

bindInput(canvas, {
  start: () => { if (state.screen === 'title') startShift(performance.now()); },
  restart: () => { if (state.screen === 'over') startShift(performance.now()); },
  serve: () => serveDish(performance.now()),
  collect: (station) => collect(station, performance.now()),
  mute: () => sfx.toggleMute(),
  selectSlot: (i) => {
    if (state.screen !== 'play') return;
    if (state.board[i]) { state.selectedId = state.board[i].id; clearPlate(state.kitchen); sfx.click(); }
  },
  add: (id) => addStep(id, performance.now()),
  click: (x, y, regions) => {
    const now = performance.now();
    if (state.screen === 'title' && pointIn(regions.start, x, y)) { startShift(now); return; }
    if (state.screen === 'over' && pointIn(regions.restart, x, y)) { startShift(now); return; }
    if (state.screen !== 'play') return;
    if (pointIn(regions.serve, x, y)) { serveDish(now); return; }
    for (let i = 0; i < regions.orders.length; i++) {
      if (state.board[i] && pointIn(regions.orders[i], x, y)) {
        state.selectedId = state.board[i].id;
        clearPlate(state.kitchen);
        sfx.click();
        return;
      }
    }
    for (const id of Object.keys(regions.bins)) {
      if (pointIn(regions.bins[id], x, y)) { addStep(id, now); return; }
    }
    if (pointIn(regions.grill, x, y)) { collect('grill', now); return; }
    if (pointIn(regions.board, x, y)) { collect('board', now); return; }
  },
});

// Screenshot scenes (?scene=title|play|mid|serve) set a fixed starting
// state so the game's own renders show the kitchen at its best. Gameplay
// itself is unchanged: the player can still play from any scene.
function applyScene() {
  const scene = new URLSearchParams(window.location.search).get('scene') || 'title';
  const now = performance.now();
  if (scene === 'title') return;
  startShift(now);
  if (scene === 'play') return;
  // Mid-assembly: one Classic Burger selected, bun + grilled patty + lettuce
  // already on the plate, a patty on the grill, timer well into the shift.
  const classic = RECIPES.find((r) => r.id === 'classic');
  const order = state.board[0];
  order.recipe = classic;
  order.bornAt = now - 9000;
  state.selectedId = order.id;
  state.score = 350;
  state.combo = 2;
  state.shiftEndsAt = now + 87000;
  state.kitchen.plate = ['bun', 'patty', 'lettuce'];
  state.kitchen.grill = { ingredient: 'patty', startedAt: now - 1200, doneAt: now + 1800 };
  if (scene === 'serve') {
    state.kitchen.plate = ['bun', 'patty', 'lettuce', 'cheese', 'bun'];
    state.kitchen.grill = null;
  }
}

applyScene();
requestAnimationFrame(loop);

// Self-test (?selftest=1): drives the real game logic in the browser and
// reports the result in the status line, so a headless run can verify it.
// Async waits only — never a busy-wait, so virtual time can advance.
if (new URLSearchParams(window.location.search).get('selftest') === '1') {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  (async () => {
    await sleep(500);
    const results = [];
    startShift(performance.now());
    const order = state.board[0];
    const steps = order.recipe.steps;
    results.push(`order=${order.recipe.name} steps=${steps.join(',')}`);
    for (const step of steps) {
      addStep(step, performance.now());
      const job = state.kitchen.grill || state.kitchen.board;
      if (job) {
        const station = state.kitchen.grill ? 'grill' : 'board';
        await sleep(Math.max(0, job.doneAt - performance.now() + 100));
        collect(station, performance.now());
      }
    }
    const matched = plateMatches(state.kitchen, order.recipe);
    results.push(`plate=${state.kitchen.plate.join(',')} matched=${matched}`);
    const before = state.score;
    serveDish(performance.now());
    results.push(`served=${state.served} score ${before} -> ${state.score}`);
    statusEl.textContent = `SELFTEST ${results.join(' | ')}`;
    document.title = `SELFTEST ${matched && state.served === 1 ? 'PASS' : 'FAIL'}`;
  })();
}

// Exposed for debugging and for the screenshot driver.
window.__game = state;
