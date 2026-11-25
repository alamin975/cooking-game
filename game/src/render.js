// All canvas drawing for Rush Hour Kitchen, plus the hit-test layout.
// The canvas is a fixed 960x600 stage, scaled to the window by main.js.

import { INGREDIENTS } from './recipes.js';
import { orderRemaining } from './orders.js';
import { stationProgress, stationReady } from './kitchen.js';

export const W = 960;
export const H = 600;

// Hit regions, recomputed each frame by layout().
export function layout() {
  const bins = {};
  const names = ['bun', 'patty', 'lettuce', 'tomato', 'cheese'];
  names.forEach((id, i) => {
    bins[id] = { x: 60 + i * 172, y: 218, w: 150, h: 96 };
  });
  return {
    bins,
    grill: { x: 60, y: 350, w: 400, h: 92 },
    board: { x: 500, y: 350, w: 400, h: 92 },
    serve: { x: 700, y: 470, w: 200, h: 70 },
    orders: [0, 1, 2].map((i) => ({ x: 60 + i * 290, y: 62, w: 270, h: 132 })),
    start: { x: 340, y: 420, w: 280, h: 64 },
    restart: { x: 340, y: 420, w: 280, h: 64 },
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chip(ctx, x, y, w, h, fill, dark, label, sub) {
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 - (sub ? 9 : 0));
  if (sub) {
    ctx.font = '12px sans-serif';
    ctx.fillText(sub, x + w / 2, y + h / 2 + 14);
  }
}

function drawIngredientChip(ctx, x, y, size, id, showName = true) {
  const ing = INGREDIENTS[id];
  const h = showName ? size * 0.62 : size * 0.72;
  chip(ctx, x, y, size, h, ing.color, ing.dark, ing.name.slice(0, 1), showName ? ing.name : null);
}

export function drawTopBar(ctx, state, now) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('RUSH HOUR KITCHEN', 16, 26);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${state.score}   Combo x${state.combo}   Lives ${'♥'.repeat(Math.max(0, state.lives))}`, W - 180, 26);
  const shiftLeft = Math.max(0, state.shiftEndsAt - now);
  const frac = shiftLeft / state.shiftLength;
  ctx.fillStyle = '#222';
  ctx.fillRect(W - 170, 34, 150, 8);
  ctx.fillStyle = frac > 0.3 ? '#7bc043' : '#e4572e';
  ctx.fillRect(W - 170, 34, 150 * frac, 8);
  ctx.fillStyle = '#ffd166';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Shift ${Math.ceil(shiftLeft / 1000)}s`, W - 170, 20);
}

export function drawOrders(ctx, state, now, regions) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ORDER BOARD  —  click an order, then build it step by step', 60, 58);
  state.board.forEach((order, i) => {
    const r = regions.orders[i];
    const selected = state.selectedId === order.id;
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = selected ? '#fff3d6' : '#f5efe0';
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeStyle = selected ? '#e4572e' : '#b9a888';
    ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(order.recipe.name, r.x + 12, r.y + 24);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#6b5a44';
    ctx.fillText(`$${order.recipe.price}`, r.x + 12, r.y + 44);
    // Recipe steps as small chips (letter only — the names are on the counter).
    order.recipe.steps.forEach((step, j) => {
      drawIngredientChip(ctx, r.x + 12 + j * 48, r.y + 56, 42, step, false);
    });
    // Countdown bar.
    const frac = orderRemaining(order, now) / order.ttl;
    ctx.fillStyle = '#ddd';
    ctx.fillRect(r.x + 12, r.y + 112, r.w - 24, 8);
    ctx.fillStyle = frac > 0.35 ? '#7bc043' : '#e4572e';
    ctx.fillRect(r.x + 12, r.y + 112, (r.w - 24) * frac, 8);
  });
  // Empty slots read as waiting, so the board always looks like a board.
  for (let i = state.board.length; i < 3; i++) {
    const r = regions.orders[i];
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8a7a5f';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#cbb89a';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('waiting for the next order…', r.x + r.w / 2, r.y + r.h / 2);
    ctx.textAlign = 'left';
  }
}

export function drawCounter(ctx, state, regions) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('COUNTER  —  click an ingredient (keys B P L T C)', 60, 210);
  const names = ['bun', 'patty', 'lettuce', 'tomato', 'cheese'];
  names.forEach((id) => {
    const r = regions.bins[id];
    const ing = INGREDIENTS[id];
    const needed = state.selectedRecipe && state.kitchen.plate.length < state.selectedRecipe.steps.length
      ? state.selectedRecipe.steps[state.kitchen.plate.length] : null;
    const isNext = needed === id;
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = isNext ? '#fff3d6' : '#f5efe0';
    ctx.fill();
    ctx.lineWidth = isNext ? 4 : 2;
    ctx.strokeStyle = isNext ? '#e4572e' : '#b9a888';
    ctx.stroke();
    drawIngredientChip(ctx, r.x + 14, r.y + 14, 56, id);
    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ing.name, r.x + 80, r.y + 30);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#6b5a44';
    const prep = ing.prep === 'grill' ? 'grill · 3s' : ing.prep === 'board' ? 'chop · 2s' : 'ready';
    ctx.fillText(prep, r.x + 80, r.y + 52);
    ctx.fillText(`key ${ing.key}`, r.x + 80, r.y + 72);
  });
}

function drawStation(ctx, x, y, w, h, title, kitchen, station, now) {
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#4a3b2c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2b2118';
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 14, y + 26);
  const job = kitchen[station];
  if (!job) {
    ctx.fillStyle = '#cbb89a';
    ctx.font = '13px sans-serif';
    ctx.fillText('empty — click an ingredient that needs this station', x + 14, y + 58);
    return;
  }
  const ing = INGREDIENTS[job.ingredient];
  const ready = stationReady(kitchen, station, now);
  const prog = stationProgress(kitchen, station, now);
  drawIngredientChip(ctx, x + 14, y + 34, 56, job.ingredient, false);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${ing.name} ${ready ? '— READY! click to take' : 'cooking…'}`, x + 92, y + 52);
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 92, y + 62, w - 118, 10);
  ctx.fillStyle = ready ? '#7bc043' : '#e8a54b';
  ctx.fillRect(x + 92, y + 62, (w - 118) * prog, 10);
}

export function drawStations(ctx, state, now, regions) {
  drawStation(ctx, regions.grill.x, regions.grill.y, regions.grill.w, regions.grill.h, 'GRILL  (key G to take)', state.kitchen, 'grill', now);
  drawStation(ctx, regions.board.x, regions.board.y, regions.board.w, regions.board.h, 'CHOPPING BOARD  (key H to take)', state.kitchen, 'board', now);
}

export function drawPlate(ctx, state, now, regions) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('YOUR PLATE', 60, 462);
  const px = 60;
  const py = 478;
  // Plate ellipse.
  ctx.beginPath();
  ctx.ellipse(px + 130, py + 52, 140, 34, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e2d4';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#b9a888';
  ctx.stroke();
  // Stacked layers, bottom-up.
  const layers = state.kitchen.plate;
  layers.forEach((id, i) => {
    const ing = INGREDIENTS[id];
    const y = py + 46 - i * 11;
    rr(ctx, px + 30, y - 12, 200, 16, 8);
    ctx.fillStyle = ing.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ing.dark;
    ctx.stroke();
  });
  if (layers.length === 0) {
    ctx.fillStyle = '#6b5a44';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('empty plate — pick an order, then add its first step', px + 130, py + 52);
  }
  ctx.textAlign = 'left';
  const sel = state.selectedRecipe;
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(sel ? `Building: ${sel.name}` : 'No order selected — click an order above', 340, 500);
  if (sel) {
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#f5efe0';
    const next = state.kitchen.plate.length < sel.steps.length
      ? INGREDIENTS[sel.steps[state.kitchen.plate.length]].name : 'complete!';
    ctx.fillText(`Next step: ${next}   (${state.kitchen.plate.length}/${sel.steps.length})`, 340, 524);
  }
  // Serve button.
  const s = regions.serve;
  const ready = sel && state.kitchen.plate.length === sel.steps.length;
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fillStyle = ready ? '#e4572e' : '#b9a888';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ready ? '#b23a1d' : '#8a7a5f';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SERVE  (Space)', s.x + s.w / 2, s.y + s.h / 2);
  ctx.textBaseline = 'alphabetic';
  // Shake feedback.
  if (now < state.kitchen.shakeUntil) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Wrong ingredient! Check the next step.', 340, 552);
  }
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Keys: 1-3 order · B P L T C add · G grill · H chop · Space serve · R restart', 60, 590);
}

export function drawTitle(ctx) {
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RUSH HOUR KITCHEN', W / 2, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('Orders are coming in. Chop, grill, build, serve — before the clock eats you.', W / 2, 230);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#cbb89a';
  ctx.fillText('Click an order, add its ingredients in order, serve the finished dish.', W / 2, 300);
  ctx.fillText('Patty needs the grill (3s). Lettuce and tomato need chopping (2s).', W / 2, 328);
  ctx.fillText('3 lives. 120-second shift. Wrong ingredient breaks your combo.', W / 2, 356);
  const b = layout().start;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = '#e4572e';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('START SHIFT  (Enter)', b.x + b.w / 2, b.y + b.h / 2);
  ctx.textBaseline = 'alphabetic';
}

export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.lives <= 0 ? 'KITCHEN CLOSED!' : 'SHIFT OVER!', W / 2, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '26px sans-serif';
  ctx.fillText(`Final score: ${state.score}`, W / 2, 240);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#cbb89a';
  ctx.fillText(`Dishes served: ${state.served}   Best combo: x${state.bestCombo}`, W / 2, 280);
  const b = layout().restart;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = '#e4572e';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY AGAIN  (R)', b.x + b.w / 2, b.y + b.h / 2);
  ctx.textBaseline = 'alphabetic';
}
