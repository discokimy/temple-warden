// The Temple Warden — the countryside: stumps, fallen logs, ferns and mossy boulders; copses along the North Road;
// and birds. Sparrows hop and peck in the grass and burst away when you come near, flocks pass overhead with their
// shadows sliding over the ground, and ducks paddle the stream.
'use strict';

Object.assign(NATIVE_PROPS, {
  stump: () => nativeProp(32, 26, ({ F, E, P }) => {
    F(9, 10, 14, 13, '#5e4430'); F(9, 10, 3, 13, '#73553c'); F(20, 10, 3, 13, '#4a3626');
    for (const [x, w] of [[6, 4], [21, 5]]) F(x, 20, w, 3, '#5e4430');
    E(16, 10, 7, 3, '#b08a5a'); E(16, 10, 5, 2, '#c9a46e'); E(16, 10, 2.5, 1, '#9a7448'); P(16, 10, '#7a5a38');
    F(19, 15, 3, 3, '#5e7a38'); F(20, 14, 2, 1, '#6c8a40'); P(10, 19, '#c8b07a'); P(11, 19, '#e8d8b0'); // moss and a pale mushroom
  }),
  log: () => nativeProp(48, 24, ({ F, E, P }) => {
    F(6, 8, 36, 12, '#5e4430'); F(6, 8, 36, 3, '#73553c'); F(6, 17, 36, 3, '#4a3626');
    for (let x = 8; x < 40; x += 5) F(x, 11 + (x % 3), 3, 1, '#4a3626');
    E(42, 14, 3, 6, '#b08a5a'); E(42, 14, 2, 4, '#c9a46e'); P(42, 14, '#7a5a38');
    F(14, 6, 10, 3, '#5e7a38'); F(16, 5, 6, 1, '#6c8a40'); F(30, 7, 5, 2, '#4f6a30');
    F(24, 3, 1, 5, '#4a3626'); F(23, 2, 3, 1, '#5e4430'); // a broken branch
  }),
  fern: () => nativeProp(32, 22, ({ F, P }) => {
    const cols = ['#2f5a24', '#3e6e2c', '#4f8236', '#66994a'];
    for (const [a, len] of [[-2.4, 11], [-1.9, 12], [-1.4, 10], [-0.9, 12], [-0.4, 10], [-2.9, 8], [-0.1, 8]]) {
      for (let k = 0; k < len; k++) { const x = 16 + Math.cos(a) * k, y = 20 + Math.sin(a) * k * 0.9 + (k * k) * 0.035; P(Math.round(x), Math.round(y), cols[k > len - 3 ? 3 : 1]); if (k % 2 === 0 && k > 2) { P(Math.round(x - Math.sin(a) * 1.5), Math.round(y + Math.cos(a)), cols[2]); P(Math.round(x + Math.sin(a) * 1.5), Math.round(y - Math.cos(a)), cols[0]); } }
    }
  }),
  boulder: () => nativeProp(32, 30, ({ E, P, F }) => {
    E(16, 18, 13, 10, '#6f6a62'); E(14, 16, 11, 8.5, '#857f75'); E(12, 13, 7, 5, '#9c968a'); E(11, 11, 3, 2, '#b4aea0');
    for (let i = 0; i < 9; i++) P(8 + (i * 7) % 16, 12 + (i * 5) % 12, '#5f5a52');
    F(17, 10, 8, 3, '#5e7a38'); F(19, 9, 5, 1, '#6c8a40'); F(22, 13, 4, 2, '#4f6a30'); // moss on the cool side of the top
  }),
});
Object.assign(DECOR_BLOCK, { stump: 1, log: 1, boulder: 1 });

// ---------------- the North Road: copses, undergrowth, and the odd fallen tree ----------------
function dressWilds(m) {
  if (!m || m.dressed >= 2) return;
  let seed = 9173; const R = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const near = (x, y, r, test) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (test(tileAt(m, x + dx, y + dy), x + dx, y + dy)) return true; return false; };
  const open = (x, y, gap = 2) => x > 0 && y > 4 && x < m.w - 1 && y < m.h - 1 && tileAt(m, x, y) === ',' && !m.decor[K(x, y)] && !m.trig[K(x, y)] && !m.links[K(x, y)]
    && !near(x, y, gap, (c, xx, yy) => ';}CJz'.includes(c) || m.links[K(xx, yy)] || m.trig[K(xx, yy)]);
  const put = (x, y, d, gap) => { if (open(x, y, gap)) { m.decor[K(x, y)] = d; return true; } return false; };
  // copses: a mix of broadleaf and pine, thinning at the edges, with ferns and stumps round about
  for (let c = 0; c < 9; c++) {
    const cx = Math.floor(2 + R() * (m.w - 4)), cy = Math.floor(6 + R() * (m.h - 9)), broad = R() < 0.6;
    let n = 4 + Math.floor(R() * 6);
    for (let i = 0; i < 18 && n > 0; i++) {
      const x = cx + Math.round((R() - 0.5) * 6), y = cy + Math.round((R() - 0.5) * 4);
      if (put(x, y, (broad ? R() < 0.75 : R() < 0.25) ? 'oak' : 'pine', 2)) n--;
    }
    for (let i = 0; i < 5; i++) { const x = cx + Math.round((R() - 0.5) * 8), y = cy + Math.round((R() - 0.5) * 6); put(x, y, R() < 0.7 ? 'fern' : 'stump', 1); }
  }
  // fallen trees, boulders and a scatter of ferns in the open
  for (let i = 0; i < 4; i++) { const x = Math.floor(2 + R() * (m.w - 4)), y = Math.floor(6 + R() * (m.h - 8)); if (open(x + 1, y, 2)) put(x, y, 'log', 2); }
  for (let i = 0; i < 6; i++) put(Math.floor(1 + R() * (m.w - 2)), Math.floor(6 + R() * (m.h - 8)), 'boulder', 2);
  for (let i = 0; i < 18; i++) put(Math.floor(1 + R() * (m.w - 2)), Math.floor(5 + R() * (m.h - 6)), R() < 0.8 ? 'fern' : 'stump', 1);
  m.dressed = 2;
}
{
  const _goMap = goMap;
  goMap = function (id, x, y) { if (id === 'wilds' && S && S.maps.wilds) dressWilds(S.maps.wilds); return _goMap(id, x, y); };
  const _buildWilds = buildWilds;
  buildWilds = function () { const m = _buildWilds(); dressWilds(m); return m; };
}

// ---------------- birds ----------------
const BIRD_STATE = new Map(); // per flock: when it took fright
let skyFlock = null, nextSkyFlock = 0;
const SPARROW_ART = ['....cc.', '...chek', 'tbbbbh.', '.bbbww.', '..bww..', '..l.l..'];
const SPARROW_PECK = ['.......', '...cc..', 'tbbbchh', '.bbbwek', '..bww..', '..l.l..'];
const SPARROW_PAL = { c: '#7a4a2a', h: '#cdbfa6', k: '#d8a83a', t: '#4a3424', b: '#7a5a3a', w: '#d6c49c', l: '#3a2a20', e: '#1a1410' };
const SPARROW = { body: '#7a5a3a', back: '#5e4430', belly: '#d2bf98', head: '#6a4a30', cap: '#8a6a44' };
function drawBirds(m, ox, oy, t, W, H) {
  if (m.id === 'wilds' && !(m.dressed >= 2)) dressWilds(m); // a save already standing here
  if (reduceMotion) return;
  const dl = dayLight(); if (dl.night > 0.35) return;
  // a touch larger than life, so a sparrow reads as a sparrow
  const u = TS / 32 * 1.4, R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  const pv = visualPos(P());
  // ground birds: little flocks that hop and peck, and scatter when you come near
  const flocks = Math.min(7, Math.floor(m.w * m.h / 260));
  for (let i = 0; i < flocks; i++) {
    const h = tileHash(i * 53 + 11, m.w * 7 + i * 3), fx = 2 + h % (m.w - 4), fy = 2 + (h >>> 9) % (m.h - 4);
    if (!GRASSY.includes(tileAt(m, fx, fy)) || (m.decor[K(fx, fy)] && m.decor[K(fx, fy)] !== 'fern')) continue;
    const key = m.id + ':' + i; let st = BIRD_STATE.get(key);
    const d = Math.hypot(pv.x - fx, pv.y - fy);
    if (!st && d < 2.6) BIRD_STATE.set(key, st = { t0: t, dir: pv.x < fx ? 1 : -1 });
    if (st && t - st.t0 > 25000 && d > 6) { BIRD_STATE.delete(key); st = null; } // back again once you've gone
    const n = 3 + h % 3;
    for (let b = 0; b < n; b++) {
      const bh = tileHash(i * 31 + b, b * 17 + 5);
      let x = fx + 0.2 + ((bh % 100) / 100) * 1.4 + Math.sin(t / 2400 + b * 2) * 0.25, y = fy + 0.5 + (((bh >>> 8) % 100) / 100) * 0.8;
      let lift = 0, flying = false, face = Math.sin(t / 3100 + b * 1.7) > 0 ? 1 : -1;
      if (st) {
        const k = (t - st.t0 - b * 60) / 1000; if (k > 0) { flying = true; face = st.dir; x += st.dir * k * 3.2 * (1 + b * 0.1); lift = Math.min(3.5, k * 2.6) + k * k * 0.6; y -= k * 0.8; }
        if (k > 2.6) continue;
      }
      const sx = ox + x * TS, sy = oy + y * TS;
      if (sx < -TS || sx > W + TS || sy < -TS * 4 || sy > H + TS) continue;
      ctx.fillStyle = 'rgba(10,20,8,0.22)'; ctx.fillRect(Math.round(sx - 2 * u), Math.round(sy + u), Math.round(4 * u), Math.round(u)); // shadow
      const by = sy - lift * TS;
      if (flying) {
        const up = Math.floor(t / 70 + b) % 2;
        R(sx - 2 * u, by - u, 4, 2, SPARROW.body); R(sx + face * 2 * u - (face < 0 ? u : 0), by - 2 * u, 1, 1, SPARROW.head);
        if (up) { R(sx - 3 * u, by - 3 * u, 2, 2, SPARROW.back); R(sx + u, by - 3 * u, 2, 2, SPARROW.back); } else { R(sx - 4 * u, by, 3, 1, SPARROW.back); R(sx + u, by, 3, 1, SPARROW.back); }
      } else {
        // hop now and then, peck now and then
        const ph = (t / 900 + b * 0.37) % 1, hop = ph < 0.08 ? Math.sin(ph / 0.08 * Math.PI) * 2 : 0, peck = ph > 0.5 && ph < 0.62;
        const yy = by - hop * u;
        // a little round bird in profile: chestnut cap, pale cheek, buff breast, a dark cocked tail
        const rows = peck ? SPARROW_PECK : SPARROW_ART;
        for (let ry = 0; ry < rows.length; ry++) for (let rx = 0; rx < 7; rx++) {
          const ch = rows[ry][rx]; if (ch === '.') continue;
          const px = face > 0 ? rx - 3 : 3 - rx;
          R(sx + px * u, yy + (ry - rows.length) * u, 1, 1, SPARROW_PAL[ch]);
        }
      }
    }
  }
  // ducks on the water: a pair paddling slowly up and down a stretch, a wake behind them
  for (let i = 0; i < 3; i++) {
    const h = tileHash(i * 97 + 3, m.h * 11 + i), x0 = 2 + h % (m.w - 4);
    let wy = -1; for (let y = 0; y < m.h; y++) if (tileAt(m, x0, y) === '~' && tileAt(m, x0, y + 1) === '~') { wy = y; break; }
    if (wy < 0) continue;
    for (let b = 0; b < 2; b++) {
      const sw = Math.sin(t / 9000 + i * 2 + b * 0.25), x = x0 + sw * 3 + b * 0.6, face = Math.cos(t / 9000 + i * 2 + b * 0.25) > 0 ? 1 : -1;
      if (tileAt(m, Math.floor(x), wy) !== '~') continue;
      const sx = ox + x * TS, sy = oy + (wy + 0.9 + b * 0.25) * TS + Math.sin(t / 600 + b) * u;
      if (sx < -TS || sx > W + TS || sy < -TS || sy > H + TS) continue;
      ctx.strokeStyle = 'rgba(225,242,252,0.35)'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(sx - face * 4 * u, sy); ctx.lineTo(sx - face * 10 * u, sy - 2 * u); ctx.moveTo(sx - face * 4 * u, sy + u); ctx.lineTo(sx - face * 10 * u, sy + 3 * u); ctx.stroke();
      const drake = b === 0;
      R(sx - 4 * u, sy - 3 * u, 8, 3, drake ? '#8a7a6a' : '#8a6a4a'); R(sx - 4 * u, sy - 3 * u, 8, 1, drake ? '#a8988a' : '#a8845a');
      R(face > 0 ? sx - 5 * u : sx + 4 * u, sy - 3 * u, 1, 1, drake ? '#2a2430' : '#6a4a2a'); // tail
      const hx = face > 0 ? sx + 2 * u : sx - 4 * u;
      R(hx, sy - 6 * u, 2, 3, drake ? '#2f6a3a' : '#7a5a3a'); if (drake) R(hx, sy - 3 * u, 2, 1, '#f0ece0');
      R(face > 0 ? hx + 2 * u : hx - u, sy - 5 * u, 1, 1, '#e0a83a');
    }
  }
  // a flock passing over, every so often, wings beating, their shadows crossing the ground below
  if (!skyFlock && t > nextSkyFlock) { const dir = Math.random() < 0.5 ? 1 : -1; skyFlock = { t0: t, dir, y: 0.15 + Math.random() * 0.5, n: 4 + Math.floor(Math.random() * 5), crow: Math.random() < 0.4 }; nextSkyFlock = t + 18000 + Math.random() * 30000; }
  if (skyFlock) {
    const f = skyFlock, k = (t - f.t0) / 9000; if (k > 1) { skyFlock = null; return; }
    for (let b = 0; b < f.n; b++) {
      const row = Math.ceil(b / 2), side = b % 2 ? 1 : -1, x = (f.dir > 0 ? -0.1 + k * 1.2 : 1.1 - k * 1.2) * W - f.dir * row * 14 * u, y = f.y * H + side * row * 8 * u + Math.sin(t / 500 + b) * 2 * u;
      ctx.fillStyle = 'rgba(10,20,8,0.16)'; ctx.fillRect(Math.round(x + 40 * u), Math.round(y + 90 * u), Math.round(5 * u), Math.round(2 * u));
      const flap = Math.floor(t / 120 + b * 1.3) % 3, col = f.crow ? '#1e1a22' : '#4a3a34';
      R(x - u, y, 3, 2, col);
      if (flap === 0) { R(x - 4 * u, y - 2 * u, 3, 1, col); R(x + 2 * u, y - 2 * u, 3, 1, col); R(x - 2 * u, y - u, 1, 1, col); R(x + 2 * u, y - u, 1, 1, col); }
      else if (flap === 1) { R(x - 4 * u, y, 3, 1, col); R(x + 2 * u, y, 3, 1, col); }
      else { R(x - 3 * u, y + u, 2, 1, col); R(x + 2 * u, y + u, 2, 1, col); }
    }
  }
}
{
  const _drawButterflies = drawButterflies;
  drawButterflies = function (m, ox, oy, t, W, H) { _drawButterflies(m, ox, oy, t, W, H); drawBirds(m, ox, oy, t, W, H); };
}
