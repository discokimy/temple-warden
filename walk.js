// The Temple Warden — walking that feels like walking. Hold a direction and Corin keeps going at an even pace
// (two keys at once for the diagonals); tap a spot and he walks there; drag a finger across the map and he follows
// it like a joystick. The world still moves a turn at a time underneath, so fights play exactly as before.
'use strict';

const MOVE_KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
const heldKeys = new Map();
let lastStep = 0, holdSteps = 0, driving = null;
// a quick tap is one crisp step; keep holding and, after a short beat, he walks on at a steady pace and stops
// the moment you let go: no steps queued up behind the key
const HOLD_START = 210;
const canWalk = () => S && !dead && !modalOpen && !(typeof fishing !== 'undefined' && fishing);
function heldDir() {
  let dx = 0, dy = 0;
  for (const [, v] of heldKeys) { dx += v[0]; dy += v[1]; }
  if (driving) { dx = driving.dx; dy = driving.dy; }
  return [Math.sign(dx), Math.sign(dy)];
}
function stepNow(paced) {
  const [dx, dy] = heldDir(); if (!dx && !dy) return;
  if (typeof autoWalk !== 'undefined') autoWalk = null;
  lastStep = performance.now(); holdSteps++;
  walkPace = !!paced; try { act(dx, dy); } finally { walkPace = false; }
}
// keys: our own repeat, in step with the walk, instead of the keyboard's stuttering auto-repeat
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!MOVE_KEYS[k] || !canWalk()) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return;
  const wasIdle = !heldKeys.size && !driving;
  heldKeys.set(k, MOVE_KEYS[k]);
  // a second key pressed together with the first turns the step diagonal, so give it a moment to arrive
  // (a tap released even before that still counts as its one step)
  if (wasIdle) { holdSteps = 0; setTimeout(() => { if (holdSteps) return; const tapOnly = !heldKeys.size; if (tapOnly) heldKeys.set(k, MOVE_KEYS[k]); stepNow(false); if (tapOnly) { heldKeys.delete(k); holdSteps = 0; } }, 30); }
}, true);
document.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; heldKeys.delete(k); if (!heldKeys.size) holdSteps = 0; });
window.addEventListener('blur', () => { heldKeys.clear(); driving = null; });
function walkLoop(t) {
  requestAnimationFrame(walkLoop);
  if ((!heldKeys.size && !driving) || !canWalk() || !holdSteps) return;
  if (t - lastStep >= (holdSteps === 1 && !driving ? HOLD_START : curPace())) stepNow(true);
}
requestAnimationFrame(walkLoop);
// the map under a finger or the mouse: tap to walk there, drag to steer
let press = null;
cvs.addEventListener('pointerdown', e => { if (e.button !== 0 || !canWalk()) return; press = { x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
cvs.addEventListener('pointermove', e => {
  if (!press || !canWalk() || (typeof pinch !== 'undefined' && pinch)) return;
  if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) { press.drag = true; clearTimeout(typeof pressT !== 'undefined' ? pressT : 0); }
  if (!press.drag) return;
  // steer toward the finger, measured from where Corin stands on screen
  const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), v = visualPos(P());
  const hx = r.left + ox + (v.x + 0.5) * TS, hy = r.top + oy + (v.y + 0.5) * TS, ddx = e.clientX - hx, ddy = e.clientY - hy, L = Math.hypot(ddx, ddy);
  if (L < TS * 0.4) { driving = null; return; }
  const ang = Math.atan2(ddy, ddx), oct = Math.round(ang / (Math.PI / 4));
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const [dx, dy] = dirs[(oct + 8) % 8];
  const start = !driving; driving = { dx, dy };
  if (start && performance.now() - lastStep >= curPace()) { holdSteps = 0; stepNow(true); }
});
const endPress = () => { driving = null; if (!heldKeys.size) holdSteps = 0; };
cvs.addEventListener('pointerup', endPress); cvs.addEventListener('pointercancel', endPress); cvs.addEventListener('pointerleave', endPress);
// a tap on open ground further than a step away: walk there along a path
cvs.addEventListener('click', e => {
  const wasDrag = press && press.drag; press = null;
  if (wasDrag) { e.stopImmediatePropagation(); return; }
  if (!canWalk()) return;
  const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), p = P(), m = curMap();
  const tx = Math.floor((e.clientX - r.left - ox) / TS), ty = Math.floor((e.clientY - r.top - oy) / TS);
  if (Math.max(Math.abs(tx - p.x), Math.abs(ty - p.y)) <= 1) return; // next to you: let the game handle it (attack, talk, step)
  if (m.mons.some(o => o.x === tx && o.y === ty && monVisible(o))) return;  // a creature: targeting and shooting as before
  if (m.npcs.some(o => o.x === tx && o.y === ty) || m.trig[K(tx, ty)]) { e.stopImmediatePropagation(); walkThen(tx, ty, true, () => { const q = P(); act(Math.sign(tx - q.x), Math.sign(ty - q.y)); }); return; }
  if (!walkable(m, tx, ty)) return;
  e.stopImmediatePropagation();
  walkThen(tx, ty, false);
}, true);

// zoom: buttons on the map, + and − keys, the wheel (and trackpad pinch), and a two-finger pinch on a tablet
$('#zin').addEventListener('click', e => { e.stopPropagation(); zoomBy(1); });
$('#zout').addEventListener('click', e => { e.stopPropagation(); zoomBy(-1); });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || modalOpen || e.metaKey || e.ctrlKey) return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1); } else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(-1); }
});
let wheelAcc = 0, wheelT = 0;
cvs.addEventListener('wheel', e => {
  e.preventDefault(); wheelAcc += e.deltaY * (e.ctrlKey ? 3 : 1);
  const now = performance.now(); if (Math.abs(wheelAcc) < 60 || now - wheelT < 120) return;
  zoomBy(wheelAcc < 0 ? 1 : -1); wheelAcc = 0; wheelT = now;
}, { passive: false });
let pinch = null;
cvs.addEventListener('touchstart', e => { if (e.touches.length === 2) { driving = null; press = null; const [a, b] = e.touches; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } }, { passive: true });
cvs.addEventListener('touchmove', e => {
  if (!pinch || e.touches.length !== 2) return; e.preventDefault();
  const [a, b] = e.touches, d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if (d / pinch > 1.25) { zoomBy(1); pinch = d; } else if (d / pinch < 0.8) { zoomBy(-1); pinch = d; }
}, { passive: false });
cvs.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; }, { passive: true });

// walk or run: Shift runs while held; the button on the map (or the Options window) switches running on and off
document.addEventListener('keydown', e => { if (e.key === 'Shift') shiftRun = true; });
document.addEventListener('keyup', e => { if (e.key === 'Shift') shiftRun = false; });
window.addEventListener('blur', () => { shiftRun = false; });
function syncRunBtn() { const b = $('#zrun'); if (b) { b.classList.toggle('on', runToggle); b.title = runToggle ? 'Running (tap to walk; Shift walks)' : 'Walking (tap to run; Shift runs)'; b.setAttribute('aria-pressed', runToggle); } }
$('#zrun').addEventListener('click', e => { e.stopPropagation(); runToggle = !runToggle; try { localStorage.setItem('tw-run', runToggle ? '1' : '0'); } catch (er) { } syncRunBtn(); });
syncRunBtn();
// townsfolk stroll on their own clock
setInterval(() => { if (S && !dead && document.visibilityState === 'visible' && curMap().npcs.length) wanderNpcs(); }, 120);

// ---------------- live combat ----------------
// Once something hostile is close and you aren't pressing anything, the fight carries on by itself: the world ticks
// a turn on a steady clock so the monster closes in, and when it's within reach Corin swings at it, with the full
// swing. Any key, tap or drag takes over at once; Options can switch it off for a strictly turn-by-turn game.
const SWING_MS = 650, LIVE_TICK_MS = 800;
let lastPlayerAct = performance.now(), liveActing = false;
{
  const _act = act;
  act = function (dx, dy) { if (!liveActing) lastPlayerAct = performance.now(); return _act(dx, dy); };
}
setInterval(() => {
  if (!canWalk() || !S.opts || S.opts.live === false) return;
  if (heldKeys.size || driving || (typeof autoWalk !== 'undefined' && autoWalk) || (typeof press !== 'undefined' && press)) return;
  const m = curMap(), p = P(), now = performance.now();
  const foes = m.mons.filter(o => monVisible(o) && (o.hunting > 0 || o.angry) && !o.sleep && Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 8);
  if (!foes.length) return;
  const near = foes.filter(o => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 1).sort((a, b) => a.hp - b.hp)[0];
  const idle = now - lastPlayerAct;
  liveActing = true;
  try {
    if (near && idle >= SWING_MS) { lastPlayerAct = now; act(Math.sign(near.x - p.x), Math.sign(near.y - p.y)); }
    else if (!near && idle >= LIVE_TICK_MS) { lastPlayerAct = now; act(0, 0); }
  } finally { liveActing = false; }
}, 90);
