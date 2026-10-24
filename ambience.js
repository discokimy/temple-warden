// The Temple Warden — the world moving on its own: wind through the grass and the trees, dust and ripples
// underfoot, reflections and wading in the water, leaves and butterflies on the air, smoke from the chimneys,
// motes in the torchlight, and the sun going round from dawn to night. Nothing here is saved.
'use strict';

const ambNow = () => (reduceMotion ? 0 : performance.now());

// ---------------- the time of day ----------------
// A day is 600 turns, from seven in the morning to midnight.
const SKY = [
  // hour, sun color (upper left), middle, shade (lower right), night darkness, shadow length
  [6, [255, 160, 120, 0.6], [255, 200, 170, 0.25], [80, 80, 160, 0.55], 0.3, 1.5],
  [8, [255, 214, 150, 0.55], [255, 236, 200, 0.25], [90, 110, 170, 0.45], 0, 1],
  [12, [255, 240, 205, 0.45], [255, 244, 220, 0.2], [100, 120, 170, 0.35], 0, 0.6],
  [16, [255, 214, 150, 0.55], [255, 236, 200, 0.25], [90, 110, 170, 0.45], 0, 1],
  [18.5, [255, 165, 80, 0.75], [255, 190, 120, 0.3], [110, 80, 150, 0.5], 0.08, 1.45],
  [20, [230, 120, 110, 0.55], [180, 120, 160, 0.3], [50, 50, 130, 0.6], 0.38, 1.7],
  [21.5, [90, 110, 190, 0.45], [70, 90, 170, 0.3], [30, 30, 90, 0.6], 0.58, 0.9],
  [24, [90, 110, 190, 0.45], [70, 90, 170, 0.3], [30, 30, 90, 0.6], 0.62, 0.9],
];
function dayHour() {
  if (!S) return 9;
  const D = typeof DAY_TURNS !== 'undefined' ? DAY_TURNS : 600, t0 = S.dayT0 === undefined ? S.turn - (S.turn % D) : S.dayT0;
  return 7 + Math.min(1, Math.max(0, (S.turn - t0) / D)) * 17;
}
function dayLight() {
  const h = dayHour();
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], k = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
  const L = (u, v) => u + (v - u) * k, C = (u, v) => u.map((x, j) => L(x, v[j]));
  const rgba = c => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
  return { hour: h, sun: rgba(C(a[1], b[1])), mid: rgba(C(a[2], b[2])), shade: rgba(C(a[3], b[3])), night: L(a[4], b[4]), len: L(a[5], b[5]) };
}
function dayPhase() {
  const h = dayHour();
  return h < 8 ? 'Dawn' : h < 11.5 ? 'Morning' : h < 14 ? 'Midday' : h < 17.5 ? 'Afternoon' : h < 19.5 ? 'Evening' : h < 21 ? 'Dusk' : 'Night';
}
const isOpenAir = m => (m.lit || m.outdoor) && m.theme !== 'house';

// ---------------- wind ----------------
// a steady sway with gusts that roll across the land from the west
function ambWind(x, y, t) {
  const base = Math.sin(t / 1100 + x * 0.45 + y * 0.25) * 0.55;
  const gust = Math.pow(Math.max(0, Math.sin(t / 2600 - x * 0.16 - y * 0.06)), 6) * 1.9;
  return base + gust;
}

// tufts of grass that lean with the wind and flatten where someone walks
const TUFTS = {};
function tuftCanvas(pal, v, lean) {
  const key = pal + v + ':' + lean;
  if (TUFTS[key]) return TUFTS[key];
  const P2 = pal === 'w' ? WOODS32 : GRASS32, c = document.createElement('canvas'); c.width = 16; c.height = 11;
  const g = c.getContext('2d'), R = rng(v * 131 + 7), flat = Math.abs(lean) > 2;
  const cols = [P2.blade, P2.ramp[1], P2.ramp[3], P2.tip];
  const n = 4 + Math.floor(R() * 3);
  for (let b = 0; b < n; b++) {
    const bx = 5 + Math.floor(R() * 6), h = flat ? 2 + Math.floor(R() * 2) : 4 + Math.floor(R() * 5), splay = (bx - 8) * 0.25;
    for (let k = 0; k < h; k++) {
      const f = k / Math.max(1, h - 1), off = Math.round((lean * (flat ? 1.4 : 1) + splay) * f * f * (flat ? 2 : 1.2));
      g.fillStyle = cols[Math.min(3, Math.floor(f * 3.6))]; g.fillRect(bx + off, 9 - k, 1, 1);
    }
  }
  g.fillStyle = 'rgba(20,40,10,0.35)'; g.fillRect(5, 10, 6, 1);
  return TUFTS[key] = c;
}
const bendAt = new Map(); // tile → when someone last walked through it
function drawTufts(m, GB, ox, oy, x0, y0, x1, y1, t, standing) {
  const u = TS / 32;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const mat = GB.mats[y * m.w + x];
    if (mat !== 'grass' && mat !== 'woods') continue;
    const h = tileHash(x * 5 + 17, y * 9 + 3);
    if (h % 7 === 0) continue;
    const k = K(x, y), stood = standing.has(k), bentT = bendAt.get(k), fresh = bentT && t - bentT < 900;
    for (let n = 0; n < 2; n++) {
      const hh = tileHash(x * 13 + n * 31, y * 7 + n * 11), hx = 2 + hh % 26, hy = 8 + (hh >>> 6) % 23;
      let lean = Math.round(Math.max(-2, Math.min(2, ambWind(x + hx / 32, y, t))));
      if (stood || fresh) lean = hx < 16 ? -3 : 3;
      ctx.drawImage(tuftCanvas(mat === 'woods' ? 'w' : 'g', (hh >>> 12) % 5, lean), ox + x * TS + (hx - 8) * u, oy + y * TS + (hy - 10) * u, 16 * u, 11 * u);
    }
  }
}

// ---------------- water ----------------
function drawGlints(m, GB, ox, oy, x0, y0, x1, y1, t) {
  const u = TS / 32;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const mat = GB.mats[y * m.w + x];
    if (mat !== 'water' && mat !== 'shallow') continue;
    for (let n = 0; n < 3; n++) {
      const h = tileHash(x * 3 + n * 17, y * 5 + n), b = Math.pow(Math.max(0, Math.sin(t / 650 + (h % 628) / 100)), 10);
      if (b < 0.05) continue;
      const gx = ox + x * TS + (2 + h % 27) * u, gy = oy + y * TS + (3 + (h >>> 7) % 27) * u, drift = Math.round(Math.sin(t / 900 + n) * 1.5) * u;
      ctx.fillStyle = `rgba(235,248,255,${(b * 0.85).toFixed(2)})`; ctx.fillRect(gx + drift, gy, 3 * u, u); ctx.fillRect(gx + drift + u, gy - u, u, u);
    }
  }
}
// people and creatures standing at the water's edge are mirrored in it, rippling a little
function drawReflections(m, actors, ox, oy, t) {
  const wet = c => c === '~' || c === 'z';
  for (const a of actors) {
    if (a.tree || !a.c) continue;
    const tx = Math.round(a.x), ty = Math.round(a.y);
    const inWater = tileAt(m, tx, ty) === 'z';
    if (!inWater && !wet(tileAt(m, tx, ty + 1))) continue;
    const px = ox + a.x * TS, py = oy + a.y * TS, h = TS * a.c.height / a.c.width, feet = py + TS - TS / 16, u = TS / 32;
    ctx.save();
    ctx.beginPath();
    for (let dy = 0; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) if (wet(tileAt(m, tx + dx, ty + dy))) ctx.rect(ox + (tx + dx) * TS, oy + (ty + dy) * TS, TS, TS);
    ctx.clip();
    ctx.globalAlpha = 0.32;
    const src = typeof envLit === 'function' ? a.c : a.c, rows = a.c.height, step = 2;
    for (let r = 0; r < rows; r += step) {
      const wob = Math.round(Math.sin(t / 260 + r * 0.6) * (r / rows) * 1.6) * u;
      // row r of the sprite (from its feet up) lands r rows below the feet
      const sy = rows - 2 - r - step, dy = feet + r * (h / rows);
      if (sy < 0) break;
      ctx.drawImage(src, 0, sy, a.c.width, step, px + wob, dy, TS, step * h / rows);
    }
    ctx.restore();
  }
}

// ---------------- particles: dust, flecks, ripples, splashes, leaves ----------------
let FX = [];
let lastFxT = 0;
function stepFx(obj) {
  if (!S || reduceMotion) return;
  const m = curMap(); if (!m) return;
  const c = tileAt(m, obj.x, obj.y), t = performance.now();
  bendAt.set(K(obj.x, obj.y), t);
  const add = (o) => { if (FX.length < 240) FX.push(Object.assign({ t0: t }, o)); };
  if (c === ';' || c === ':' || c === 'E' || c === 'X') {
    const n = c === ';' ? 4 : 2;
    for (let i = 0; i < n; i++) add({ k: 'dust', x: obj.x + 0.5 + (Math.random() - 0.5) * 0.4, y: obj.y + 0.92, vx: (Math.random() - 0.5) * 0.5, vy: -0.15 - Math.random() * 0.2, life: 520 + Math.random() * 200, r: 1.5 + Math.random() * 1.5 });
  } else if (c === ',' || c === 'f') {
    for (let i = 0; i < 2; i++) if (Math.random() < 0.6) add({ k: 'fleck', x: obj.x + 0.3 + Math.random() * 0.4, y: obj.y + 0.85, vx: (Math.random() - 0.5) * 0.8, vy: -0.7 - Math.random() * 0.4, life: 380, col: Math.random() < 0.5 ? GRASS32.tip : GRASS32.ramp[2] });
  } else if (c === 'z') {
    add({ k: 'ring', x: obj.x + 0.5, y: obj.y + 0.86, life: 900 });
    for (let i = 0; i < 4; i++) add({ k: 'drop', x: obj.x + 0.5 + (Math.random() - 0.5) * 0.4, y: obj.y + 0.8, vx: (Math.random() - 0.5) * 1.2, vy: -1.2 - Math.random() * 0.6, life: 420 });
  } else if (c === '.' && !m.lit) {
    if (Math.random() < 0.5) add({ k: 'dust', x: obj.x + 0.5, y: obj.y + 0.92, vx: (Math.random() - 0.5) * 0.3, vy: -0.1, life: 500, r: 1.5, cave: 1 });
  }
}
// leaves blow off the trees and across the ground, and butterflies wander the meadows by day
function spawnLeaves(m, trees, t) {
  if (!trees.length || reduceMotion) return;
  const leaves = FX.filter(f => f.k === 'leaf').length;
  if (leaves >= 12 || Math.random() > 0.05) return;
  const tr = trees[Math.floor(Math.random() * trees.length)], autumn = tr.kind === 'autumn';
  const cols = autumn ? ['#d39f3a', '#b8842c', '#ecc25a', '#9c6c24'] : tr.kind === 'birch' ? ['#acd06a', '#e3c95a', '#8fba52'] : ['#6c9f48', '#88b85a', '#c9b04a', '#56883b'];
  FX.push({ k: 'leaf', t0: t, x: tr.x + 0.5 + (Math.random() - 0.5) * 2, y: tr.y - 1.6 - Math.random() * 1.2, h: 1.6 + Math.random(), vx: 0.25 + Math.random() * 0.35, vy: 0, life: 5200 + Math.random() * 3000, col: cols[Math.floor(Math.random() * cols.length)], ph: Math.random() * 6 });
}
function drawFx(m, ox, oy, t, layer) {
  const dt = Math.min(80, t - (lastFxT || t)) / 1000; if (layer === 'air') lastFxT = t;
  const u = TS / 32;
  FX = FX.filter(f => t - f.t0 < f.life);
  for (const f of FX) {
    const age = (t - f.t0) / f.life, air = f.k === 'leaf';
    if ((layer === 'air') !== air) continue;
    if (layer === 'air' || f.k === 'drop' || f.k === 'fleck' || f.k === 'dust') {
      f.vx = f.vx || 0; f.vy = f.vy || 0;
      if (f.k === 'drop' || f.k === 'fleck') f.vy += 4.2 * dt;
      if (f.k === 'leaf') { const w = ambWind(f.x, f.y, t); f.vx = 0.3 + w * 0.35; f.h = Math.max(0, f.h - 0.32 * dt); }
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    const sx = ox + f.x * TS, sy = oy + f.y * TS;
    if (f.k === 'dust') { const r = (f.r + age * 3) * u; ctx.fillStyle = f.cave ? `rgba(150,140,130,${(0.35 * (1 - age)).toFixed(2)})` : `rgba(210,190,150,${(0.45 * (1 - age)).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
    else if (f.k === 'fleck' || f.k === 'drop') { ctx.globalAlpha = 1 - age; ctx.fillStyle = f.k === 'drop' ? '#d8eefc' : f.col; ctx.fillRect(Math.round(sx), Math.round(sy), u, u); ctx.globalAlpha = 1; }
    else if (f.k === 'ring') { ctx.strokeStyle = `rgba(225,242,252,${(0.7 * (1 - age)).toFixed(2)})`; ctx.lineWidth = Math.max(1, u); ctx.beginPath(); ctx.ellipse(sx, sy, (5 + age * 14) * u, (2 + age * 5) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.k === 'leaf') {
      const flut = Math.sin(t / 180 + f.ph), y = sy - f.h * TS + Math.sin(t / 400 + f.ph) * 3 * u;
      if (f.h > 0) { ctx.fillStyle = 'rgba(10,20,8,0.18)'; ctx.fillRect(Math.round(sx), Math.round(sy), 2 * u, u); }
      ctx.globalAlpha = Math.min(1, (1 - age) * 3);
      ctx.fillStyle = f.col; ctx.fillRect(Math.round(sx), Math.round(y), (flut > 0 ? 2 : 1) * u, u);
      ctx.fillStyle = shadeColor(f.col, 0.75); ctx.fillRect(Math.round(sx) + u, Math.round(y) + u, u, u);
      ctx.globalAlpha = 1;
    }
  }
}
function drawButterflies(m, ox, oy, t, W, H) {
  if (!isOpenAir(m) || dayLight().night > 0.2) return;
  const u = TS / 32, cols = ['#f4efd8', '#f2cf55', '#e7779b', '#b8a3ee'];
  for (let i = 0; i < 10; i++) {
    const h = tileHash(i * 41 + 7, m.w * 3 + i), ax = 2 + h % (m.w - 4), ay = 2 + (h >>> 8) % (m.h - 4);
    if (!GRASSY.includes(tileAt(m, ax, ay))) continue;
    const x = ax + Math.sin(t / 1900 + i) * 1.6 + Math.sin(t / 700 + i * 3) * 0.3, y = ay + Math.sin(t / 1300 + i * 2) * 0.9;
    const sx = ox + x * TS, sy = oy + y * TS - TS * (0.6 + Math.sin(t / 300 + i) * 0.12);
    if (sx < -TS || sy < -TS || sx > W + TS || sy > H + TS) continue;
    const open = Math.floor(t / 110 + i) % 2, c = cols[i % 4];
    ctx.fillStyle = 'rgba(10,20,8,0.15)'; ctx.fillRect(Math.round(sx), Math.round(sy + TS * 0.6), 2 * u, u);
    ctx.fillStyle = c;
    if (open) { ctx.fillRect(Math.round(sx - 2 * u), Math.round(sy - u), 2 * u, 2 * u); ctx.fillRect(Math.round(sx + u), Math.round(sy - u), 2 * u, 2 * u); }
    else { ctx.fillRect(Math.round(sx - u), Math.round(sy - 2 * u), u, 2 * u); ctx.fillRect(Math.round(sx + u), Math.round(sy - 2 * u), u, 2 * u); }
    ctx.fillStyle = '#2a2230'; ctx.fillRect(Math.round(sx), Math.round(sy - u), u, 2 * u);
  }
}

// ---------------- chimney smoke ----------------
function drawSmoke(m, ox, oy, t) {
  if (!m.landmarks) return;
  const u = TS / 32;
  for (const lm of m.landmarks) {
    const cv = landmarkFor(lm); if (!cv.smokes) continue;
    for (const [fx, fy] of cv.smokes) {
      const bx = ox + (lm.x + fx * lm.w) * TS, by = oy + (lm.y + fy * lm.h) * TS;
      for (let k = 0; k < 7; k++) {
        const P2 = 4200, age = ((t + k * P2 / 7 + fx * 9000) % P2) / P2;
        const w = ambWind(lm.x, lm.y, t + k * 300);
        const x = bx + (age * 26 + w * age * 14 + Math.sin(age * 6 + k) * 3) * u, y = by - age * 62 * u, r = (3 + age * 9) * u;
        ctx.fillStyle = `rgba(214,214,220,${(0.34 * (1 - age) * Math.min(1, age * 6)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

// ---------------- dust in the torchlight ----------------
function drawMotes(hx, hy, t) {
  const u = TS / 32;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const h = tileHash(i * 19, 77), ang = (h % 628) / 100, rad = (0.6 + ((h >>> 9) % 100) / 40) * TS;
    const x = hx + TS / 2 + Math.cos(ang + t / (9000 + i * 300)) * rad + Math.sin(t / 1700 + i) * TS * 0.2;
    const y = hy + Math.sin(ang + t / (11000 + i * 200)) * rad * 0.7 - ((t / 40 + i * 37) % (TS * 2)) * 0.15;
    const a = 0.18 + 0.22 * Math.pow(Math.max(0, Math.sin(t / 500 + i)), 2);
    ctx.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`; ctx.fillRect(Math.round(x), Math.round(y), u, u);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- night in the open ----------------
const nightCv = document.createElement('canvas');
function drawNight(m, ox, oy, W, H, hx, hy, lamps, night, t) {
  if (night <= 0.02) return;
  nightCv.width = W; nightCv.height = H;
  const d = nightCv.getContext('2d');
  d.fillStyle = `rgba(8,12,38,${night.toFixed(3)})`; d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, k = 1) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${k})`); g.addColorStop(0.5, `rgba(0,0,0,${k * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill(); };
  const p = P(), lit = p.equip.light && p.equip.light.fuel > 0;
  hole(hx + TS / 2, hy + TS / 2, TS * (lit ? 4.2 : 2.2), lit ? 0.95 : 0.55);
  for (const [lx, ly] of lamps) hole(ox + (lx + 0.5) * TS, oy + (ly + 0.2) * TS, TS * 3.4, 0.9);
  // light spills from doorways, and every window is lit from within
  const wins = [];
  for (const lm of m.landmarks || []) {
    if (lm.spec && lm.spec.door !== undefined) hole(ox + (lm.x + lm.spec.door + 0.5) * TS, oy + (lm.y + lm.h) * TS, TS * 1.6, 0.7);
    const cv = landmarkFor(lm);
    for (const [fx, fy, fw, fh] of cv.windows || []) { const x = ox + (lm.x + fx * lm.w) * TS, y = oy + (lm.y + fy * lm.h) * TS, w = fw * lm.w * TS, h = fh * lm.h * TS; wins.push([x, y, w, h]); d.fillStyle = 'rgba(0,0,0,0.92)'; d.fillRect(x, y, w, h); hole(x + w / 2, y + h * 1.2, Math.max(w, h) * 1.4, 0.35); }
  }
  ctx.drawImage(nightCv, 0, 0, W, H);
  // warm lamplight behind the glass
  ctx.globalCompositeOperation = 'screen';
  for (const [x, y, w, h] of wins) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(255,200,110,${(0.9 * night).toFixed(2)})`); g.addColorStop(1, `rgba(255,150,60,${(0.95 * night).toFixed(2)})`); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  ctx.globalCompositeOperation = 'source-over';
  // the warm pools themselves
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  for (const [lx, ly] of lamps) { const fl = 0.92 + Math.sin(t / 90 + lx) * 0.04 + Math.sin(t / 37 + ly) * 0.03; glow(ox + (lx + 0.5) * TS, oy + (ly - 1.6) * TS, TS * 1.3 * fl, (0.45 * night).toFixed(3)); glow(ox + (lx + 0.5) * TS, oy + (ly + 0.6) * TS, TS * 2.6 * fl, (0.22 * night).toFixed(3)); }
  if (lit) glow(hx + TS / 2, hy + TS / 2, TS * 3, (0.2 * night).toFixed(3));
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- the frame clock ----------------
// While something in view is alive, redraw about thirty times a second; otherwise the slow idle redraw does.
let ambLast = 0;
function ambientTick(t) {
  requestAnimationFrame(ambientTick);
  if (typeof reduceMotion === "undefined" || reduceMotion || !S || dead || floatRAF || document.visibilityState !== 'visible') return;
  const tt = $('#title'); if (tt && !tt.hidden) return;
  if (t - ambLast < (typeof frameBudget === 'function' ? frameBudget() : 33)) return;
  ambLast = t;
  renderMap();
}
requestAnimationFrame(ambientTick);
