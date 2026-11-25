// Tiny WebAudio sound effects for Rush Hour Kitchen. No audio files:
// every sound is a short oscillator blip, so the game loads nothing.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  click() { blip(660, 0.07, 'triangle', 0.1); },
  add() { blip(520, 0.08, 'sine', 0.12); blip(780, 0.1, 'sine', 0.1, 0.06); },
  chop() { blip(180, 0.06, 'square', 0.08); blip(140, 0.06, 'square', 0.08, 0.09); },
  sizzle() { blip(240, 0.25, 'sawtooth', 0.05); },
  ding() { blip(880, 0.12, 'sine', 0.14); blip(1318, 0.18, 'sine', 0.12, 0.1); },
  buzz() { blip(140, 0.22, 'sawtooth', 0.12); },
  serve() { blip(523, 0.1, 'sine', 0.12); blip(659, 0.1, 'sine', 0.12, 0.09); blip(784, 0.16, 'sine', 0.12, 0.18); },
  lose() { blip(330, 0.18, 'sawtooth', 0.1); blip(220, 0.3, 'sawtooth', 0.1, 0.15); },
  toggleMute() { muted = !muted; return muted; },
  isMuted() { return muted; },
};
