// The Temple Warden — iPhone (and any small touch screen) controls.
// Left thumb: a virtual joystick (push to walk, push to the rim to run). Right thumb: a big context button that talks,
// opens, gathers and uses whatever you face, and turns into Swing when a fight starts (hold for a heavy blow), with
// Dodge, Block and Pick-up beside it. The toolbar sits in a slim row at the top, out of the thumbs' way; the hotbar
// scrolls along the bottom edge; the quest panel folds away until you tap the place name.
'use strict';

const isPhone = () => Math.min(innerWidth, innerHeight) <= 500 && matchMedia('(pointer: coarse)').matches || innerWidth <= 480;
function phoneLayout() { document.body.classList.toggle('phone', isPhone()); if (typeof resizeCanvas === 'function' && S) resizeCanvas(); }
addEventListener('resize', phoneLayout); addEventListener('orientationchange', () => setTimeout(phoneLayout, 200));

// ---------------- the joystick ----------------
function buildPhoneControls() {
  if (document.getElementById('joy')) return;
  const host = document.querySelector('.game') || document.body;
  const joy = document.createElement('div'); joy.id = 'joy'; joy.innerHTML = '<div id="joy-ring"><i id="joy-knob"></i></div>'; host.appendChild(joy);
  const pad = document.createElement('div'); pad.id = 'phonepad';
  pad.innerHTML = `<button id="pp-a" aria-label="Act or swing"><span>Act</span></button><button id="pp-b" aria-label="Dodge">Dodge</button><button id="pp-c" aria-label="Block (hold)">Block</button><button id="pp-g" aria-label="Pick up">Take</button>`;
  host.appendChild(pad);
  let active = null, cx = 0, cy = 0;
  const knob = joy.querySelector('#joy-knob'), ring = joy.querySelector('#joy-ring'), RAD = 56;
  // the ring jumps to wherever your thumb lands in the zone, and the stick works from there
  const place = e => {
    const z = joy.getBoundingClientRect();
    cx = Math.min(Math.max(e.clientX, z.left + RAD), z.right - RAD); cy = Math.min(Math.max(e.clientY, z.top + RAD), z.bottom - RAD);
    ring.style.left = (cx - z.left - RAD) + 'px'; ring.style.bottom = (z.bottom - cy - RAD) + 'px';
  };
  const moveTo = (e) => {
    let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy), max = RAD * 0.72;
    if (L > max) { dx = dx / L * max; dy = dy / L * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    if (L < RAD * 0.24) { if (driving) driving = null; return; }
    const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], [ddx, ddy] = dirs[(oct + 8) % 8];
    // push to the rim to run
    shiftRun = L >= max * 0.95;
    const start = !driving; driving = { dx: ddx, dy: ddy };
    if (typeof AC !== 'undefined') AC.dir = [ddx, ddy];
    if (start && performance.now() - lastStep >= curPace() * 0.6) { holdSteps = 0; stepNow(true); }
  };
  joy.addEventListener('pointerdown', e => { e.preventDefault(); if (typeof sndInit === 'function') sndInit(); if (!canWalk()) return; active = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (er) { } joy.classList.add('on'); place(e); moveTo(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId !== active) return; e.preventDefault(); moveTo(e); });
  const end = e => { if (e.pointerId !== active) return; active = null; driving = null; shiftRun = false; knob.style.transform = ''; ring.style.left = ''; ring.style.bottom = ''; joy.classList.remove('on'); if (!heldKeys.size) holdSteps = 0; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);

  // ---------------- the buttons ----------------
  const A = pad.querySelector('#pp-a'), B = pad.querySelector('#pp-b'), C = pad.querySelector('#pp-c'), G = pad.querySelector('#pp-g');
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  A.addEventListener('pointerdown', e => { stop(e); if (typeof sndInit === 'function') sndInit(); if (!S || modalOpen) return; if (typeof AC !== 'undefined' && AC.on) chargeStart(); else phoneAct(); });
  A.addEventListener('pointerup', e => { stop(e); if (typeof AC !== 'undefined' && AC.charge) chargeRelease(); });
  A.addEventListener('pointercancel', () => { if (typeof AC !== 'undefined' && AC.charge) chargeRelease(); });
  B.addEventListener('pointerdown', e => { stop(e); dodge(); });
  C.addEventListener('pointerdown', e => { stop(e); if (AC.sta > 5) AC.blocking = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) C.addEventListener(ev, () => { AC.blocking = false; });
  G.addEventListener('pointerdown', e => { stop(e); getAction(); });
  for (const b of [A, B, C, G]) b.addEventListener('click', stop);
  // the quest panel folds away; tap the place name to show it
  const loc = document.getElementById('hud-loc'); if (loc) loc.addEventListener('click', () => document.body.classList.toggle('quest-open'));
}
// "Act": whatever you face — a person to talk to, a door, a counter, a plant to gather — or something at your feet
function phoneAct() {
  if (!canWalk()) return;
  const m = curMap(), p = P(), [dx, dy] = (typeof AC !== 'undefined' && AC.dir) || [0, 1];
  // anything next to you counts, the way you face first
  const order = [[dx, dy], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  if (typeof bumpMode === 'function' && bumpMode() && bumpAttack()) return;
  for (const [ox, oy] of order) {
    const x = p.x + ox, y = p.y + oy;
    const npc = m.npcs.find(n => n.x === x && n.y === y), trig = m.trig[K(x, y)], node = m.id === 'home' && S.home && S.home.nodes && S.home.nodes[K(x, y)];
    if (npc || node || (trig && !walkable(m, x, y)) || tileAt(m, x, y) === '~') { act(ox, oy); return; }
  }
  if (m.ground.some(g => Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)) <= 1)) return getAction();
  msg('Nothing here to use. Walk up to someone or something and press Act.', 'talk');
}
// the big button says what it will do
setInterval(() => {
  const a = document.querySelector('#pp-a span'); if (!a || !S) return;
  const bump = typeof bumpMode === 'function' && bumpMode(), p = P();
  const fight = typeof AC !== 'undefined' && (AC.on || bump && curMap().mons.some(o => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 1 && monVisible(o) && !MONSTERS[o.id].prey));
  const label = fight ? (bump ? 'Attack' : 'Swing') : 'Act';
  if (a.textContent === label) return; // nothing changed: leave the page alone
  a.textContent = label;
  document.getElementById('pp-a').classList.toggle('fight', fight);
  document.getElementById('phonepad').classList.toggle('fight', fight);
}, 200);

buildPhoneControls(); phoneLayout();
// rows below the hero card and the minimap sit just under them, however tall they grow
let phoneHudKey = '';
setInterval(() => {
  if (!document.body.classList.contains('phone')) return;
  const pl = document.querySelector('.hud-player'), mr = document.querySelector('.hud-right .mapcard'); if (!pl || !mr) return;
  const a = pl.getBoundingClientRect().bottom, b = mr.getBoundingClientRect().bottom, st = document.documentElement.style;
  const key = Math.round(a) + ',' + Math.round(b); if (key === phoneHudKey) return; phoneHudKey = key;
  st.setProperty('--hudb', Math.round(Math.max(a, b) + 6) + 'px'); st.setProperty('--hudl', Math.round(a + 4) + 'px'); st.setProperty('--hudr', Math.round(b + 6) + 'px');
}, 400);
