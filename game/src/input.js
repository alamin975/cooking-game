// Mouse and keyboard input for Rush Hour Kitchen.
// The canvas is scaled to the window; clicks are mapped back to stage
// coordinates (960x600) and tested against the layout's hit regions.

import { layout } from './render.js';

function pointIn(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function bindInput(canvas, actions) {
  const toStage = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 960,
      y: ((e.clientY - rect.top) / rect.height) * 600,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = toStage(e);
    const regions = layout();
    actions.click(x, y, regions, pointIn);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'enter') actions.start();
    else if (k === ' ') { e.preventDefault(); actions.serve(); }
    else if (k === 'r') actions.restart();
    else if (k === 'm') actions.mute();
    else if (k === 'g') actions.collect('grill');
    else if (k === 'h') actions.collect('board');
    else if (k === '1' || k === '2' || k === '3') actions.selectSlot(Number(k) - 1);
    else if (k === 'b') actions.add('bun');
    else if (k === 'p') actions.add('patty');
    else if (k === 'l') actions.add('lettuce');
    else if (k === 't') actions.add('tomato');
    else if (k === 'c') actions.add('cheese');
  });
}

export { pointIn };
