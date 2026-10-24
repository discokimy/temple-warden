// The Temple Warden — the ground as one continuous surface.
// Grass, paths, cobbles, water and cave floors are not laid tile by tile. Each material is a large seamless
// texture (eight tiles across) sampled by world position, and the whole map's ground is painted once into a
// single canvas at 32 fine pixels per tile. Where two materials meet, the border wanders: grass spills onto the
// path and the path wears into the grass, corners come out round, and water meets the land through a muddy
// bank, a line of foam and pale shallows. Walls, roofs, doors and the like are still drawn per tile on top.
'use strict';

const GN = 256; // texture period in fine pixels
const g_hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const g_shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const g_mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// a seamless N×N texture painted into a pixel buffer
function bigTex(seed, fn) {
  const d = new Float32Array(GN * GN * 3), R = rng(seed * 4241 + 19);
  const lat = new Map();
  const L = (i, j, k) => { const key = (k * 4096 + i) * 4096 + j; let v = lat.get(key); if (v === undefined) { v = R(); lat.set(key, v); } return v; };
  const noise = (x, y, cell, k = 0) => {
    const n = GN / cell, fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), w = v => ((v % n) + n) % n;
    const a = L(w(x0), w(y0), k), b = L(w(x0 + 1), w(y0), k), c = L(w(x0), w(y0 + 1), k), e = L(w(x0 + 1), w(y0 + 1), k);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy;
  };
  const wrap = v => ((Math.round(v) % GN) + GN) % GN;
  const P = (x, y, c) => { const i = (wrap(y) * GN + wrap(x)) * 3; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
  const get = (x, y) => { const i = (wrap(y) * GN + wrap(x)) * 3; return [d[i], d[i + 1], d[i + 2]]; };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const ramp = (cols, v, x, y) => { const b = ((x * 3 + y * 5) % 4) / 4 - 0.375; return cols[Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length + b * 0.35)))]; };
  fn({ P, get, R, ri, noise, ramp, pick: a => a[Math.floor(R() * a.length)], per: GN * GN / 1024 });
  return d;
}

// grass: soft broad color, a dense nap of short strokes, then clumps of blades that fan out from a shaded root
function grassTex(seed, pal) {
  const ramp = pal.ramp.map(g_hex), blade = g_hex(pal.blade), tip = g_hex(pal.tip), root = g_shade(ramp[0], 0.78);
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) {
      const v = 0.5 + (t.noise(x, y, 64, 0) - 0.5) * 0.5 + (t.noise(x, y, 16, 1) - 0.5) * 0.45 + (t.noise(x, y, 4, 2) - 0.5) * 0.22;
      t.P(x, y, t.ramp(ramp, v, x, y));
    }
    for (let i = 0; i < t.per * 70; i++) { const x = t.ri(0, GN), y = t.ri(0, GN); t.P(x, y, g_mix(t.get(x, y), blade, 0.55)); if (t.R() < 0.5) t.P(x, y - 1, g_mix(t.get(x, y - 1), blade, 0.35)); }
    for (let i = 0; i < t.per * 11; i++) {
      const cx = t.ri(0, GN), cy = t.ri(0, GN), n = t.ri(4, 8);
      for (let k = -2; k <= 2; k++) t.P(cx + k, cy + 1, g_mix(t.get(cx + k, cy + 1), root, 0.7));
      for (let b = 0; b < n; b++) {
        const bx = cx + t.ri(-3, 3), h = t.ri(3, 7), lean = bx < cx ? -1 : bx > cx ? 1 : 0;
        for (let k = 0; k < h; k++) {
          const f = k / (h - 1), x = bx + (f > 0.55 ? lean : 0) + (f > 0.9 && h > 5 ? lean : 0);
          t.P(x, cy - k, k === h - 1 ? tip : f < 0.3 ? blade : f < 0.65 ? ramp[2] : ramp[3]);
        }
      }
    }
    for (let i = 0; i < t.per * 3; i++) t.P(t.ri(0, GN), t.ri(0, GN), tip);
    if (pal.litter) { const lit = pal.litter.map(g_hex); for (let i = 0; i < t.per * 6; i++) { const x = t.ri(0, GN), y = t.ri(0, GN), c = t.pick(lit); t.P(x, y, c); t.P(x + 1, y, g_shade(c, 0.85)); } }
  });
}
function dirtTex(seed) {
  const C = ['#957244', '#a07c4c', '#ab8757', '#b69262', '#bf9c6b'].map(g_hex);
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) t.P(x, y, t.ramp(C, 0.5 + (t.noise(x, y, 64, 0) - 0.5) * 0.45 + (t.noise(x, y, 16, 1) - 0.5) * 0.45 + (t.noise(x, y, 4, 2) - 0.5) * 0.25, x, y));
    // wheel ruts and scuffs that wander, with a lit lip above
    for (let i = 0; i < t.per * 3; i++) { let x = t.ri(0, GN), y = t.ri(0, GN); const len = t.ri(6, 20); for (let k = 0; k < len; k++) { t.P(x, y, g_hex('#86643a')); t.P(x, y - 1, g_hex('#c9a674')); x++; if (t.R() < 0.2) y += t.R() < 0.5 ? -1 : 1; } }
    for (let i = 0; i < t.per * 8; i++) { const x = t.ri(0, GN), y = t.ri(0, GN); if (t.R() < 0.4) { t.P(x, y, g_hex('#d8c8a4')); t.P(x + 1, y, g_hex('#c8b48c')); t.P(x, y + 1, g_hex('#b8a07a')); t.P(x + 1, y + 1, g_hex('#7a5c38')); t.P(x + 2, y + 1, g_hex('#7a5c38')); } else { t.P(x, y, g_hex('#cdb994')); t.P(x + 1, y + 1, g_hex('#7a5c38')); } }
  });
}
// cobbles: rounded stones in loose, uneven courses; earth and moss in the gaps, now and then a stone missing
function cobbleTex(seed) {
  const gapC = ['#6a6150', '#625a49', '#70664f'].map(g_hex), moss = g_hex('#5d7a3a'), stones = ['#b8ad97', '#aca08a', '#c2b7a1', '#a39783', '#b4a58c', '#9e9280'];
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) t.P(x, y, t.noise(x, y, 4, 3) < 0.28 ? moss : t.ramp(gapC, t.noise(x, y, 8, 4), x, y));
    for (let row = 0, y = 0; y < GN; row++) {
      const h = t.ri(5, 7);
      let x = row % 2 ? -t.ri(2, 5) : 0;
      while (x < GN) {
        const w = t.ri(6, 10);
        if (t.R() < 0.05) { x += w; continue; } // a stone gone, the earth showing
        const base = g_hex(t.pick(stones)), dy = t.ri(0, 1);
        for (let yy = 0; yy < h - 1; yy++) for (let xx = 0; xx < w - 1; xx++) {
          const cx = (xx + 0.5 - (w - 1) / 2) / ((w - 1) / 2), cy = (yy + 0.5 - (h - 1) / 2) / ((h - 1) / 2);
          if (cx * cx + cy * cy > 1.18) continue;
          let col = base;
          if (cx + cy < -0.9) col = g_mix(base, [240, 232, 214], 0.45); else if (cx + cy < -0.4) col = g_shade(base, 1.07); else if (cx + cy > 0.95) col = g_shade(base, 0.74); else if (cx + cy > 0.5) col = g_shade(base, 0.88);
          t.P(x + xx, y + yy + dy, col);
        }
        if (t.R() < 0.3) t.P(x + t.ri(1, w - 3), y + t.ri(1, h - 3) + dy, g_shade(base, 0.85));
        x += w;
      }
      y += h;
    }
  });
}
function waterTex(seed) {
  const C = ['#2c6196', '#3370a6', '#3a7cb2', '#4588bd', '#4f93c6'].map(g_hex), hi = g_hex('#7fb3dd'), lo = g_hex('#2a5a8a');
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) t.P(x, y, t.ramp(C, t.noise(x, y, 64, 0) * 0.5 + t.noise(x, y, 32, 1) * 0.3 + t.noise(x, y, 8, 2) * 0.2, x, y));
    for (let i = 0; i < t.per * 5; i++) { const x = t.ri(0, GN), y = t.ri(0, GN), w = t.ri(4, 8); for (let k = 0; k < w; k++) { const lift = (k === 0 || k === w - 1) ? 1 : 0; t.P(x + k, y + lift, hi); t.P(x + k, y + 1 + lift, lo); } }
  });
}
// the shallows: a sandy, pebbled bed seen through clear water
function shallowTex(seed) {
  const C = ['#6f9a9a', '#7aa6a2', '#86b0a8', '#93bab0'].map(g_hex), peb = ['#a89a78', '#8c8466', '#b8ab88'].map(g_hex), hi = g_hex('#c9e4ec');
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) t.P(x, y, t.ramp(C, t.noise(x, y, 32, 0) * 0.55 + t.noise(x, y, 8, 1) * 0.45, x, y));
    for (let i = 0; i < t.per * 9; i++) { const x = t.ri(0, GN), y = t.ri(0, GN), c = t.pick(peb); t.P(x, y, c); if (t.R() < 0.5) { t.P(x + 1, y, c); t.P(x + 1, y + 1, g_shade(c, 0.75)); } }
    for (let i = 0; i < t.per * 3; i++) { const x = t.ri(0, GN), y = t.ri(0, GN), w = t.ri(3, 6); for (let k = 0; k < w; k++) t.P(x + k, y + ((k === 0 || k === w - 1) ? 1 : 0), hi); }
  });
}
function floorTex(seed, th) {
  const C = CAVE32[th].fl.map(g_hex), crack = g_shade(C[0], 0.72), lip = g_shade(C[3], 1.05);
  return bigTex(seed, t => {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) t.P(x, y, t.ramp(C, 0.5 + (t.noise(x, y, 64, 0) - 0.5) * 0.4 + (t.noise(x, y, 16, 1) - 0.5) * 0.45 + (t.noise(x, y, 4, 2) - 0.5) * 0.3, x, y));
    for (let i = 0; i < t.per * 1.4; i++) { let x = t.ri(0, GN), y = t.ri(0, GN); const len = t.ri(5, 14); for (let k = 0; k < len; k++) { t.P(x, y, crack); t.P(x, y - 1, lip); x += t.ri(0, 1); y += t.ri(-1, 1); } }
    for (let i = 0; i < t.per * 6; i++) { const x = t.ri(0, GN), y = t.ri(0, GN); t.P(x, y, g_shade(C[3], 1.12)); t.P(x + 1, y + 1, g_shade(C[0], 0.7)); }
  });
}
const GROUND_TEX = {};
function groundTex(mat) {
  if (GROUND_TEX[mat]) return GROUND_TEX[mat];
  const [kind, th] = mat.split(':');
  if (kind === 'rock') return GROUND_TEX[mat] = floorTex(67, th);
  // still water under the earth: the same water, but deep and dark, with only a faint cold sheen
  if (mat === 'water:cave') { const src = groundTex('water'), d = new Uint8ClampedArray(src.length); for (let i = 0; i < src.length; i += 3) { d[i] = src[i] * 0.3 + 6; d[i + 1] = src[i + 1] * 0.42 + 10; d[i + 2] = src[i + 2] * 0.55 + 14; } return GROUND_TEX[mat] = d; }
  return GROUND_TEX[mat] = kind === 'grass' ? grassTex(11, GRASS32) : kind === 'woods' ? grassTex(23, WOODS32) : kind === 'dirt' ? dirtTex(31) : kind === 'cobble' ? cobbleTex(41) : kind === 'water' ? waterTex(53) : kind === 'shallow' ? shallowTex(57) : floorTex(61, th);
}

// what each tile is made of underfoot, or null when the tile draws itself
function groundMat(m, x, y) {
  const c = m.t[y][x], th = m.theme || 'cave';
  if (c === ',' || c === 'f' || c === 'T' || c === 'S') return m.outdoor ? 'woods' : 'grass';
  if (c === 'Y') return deepWoods(m, x, y) ? null : 'woods';
  if (c === ';') return 'dirt';
  if (c === ':' || c === 'E' || c === 'X' || c === 'F') return 'cobble';
  if (c === '~') return 'water';
  if (c === 'z') return 'shallow';
  if ((c === '.' || c === '>' || c === '<') && th !== 'house' && th !== 's' && CAVE32[th]) return 'floor:' + th;
  // cave walls are painted into the ground too, so their edges can wander like real rock
  if ((c === '#' || c === 'V') && th !== 'house' && CAVE32[th] && !m.lit) return 'rock:' + th;
  // mountains above ground: the cliffs of the North Road, and the cave mouth cut into them
  if ((c === '^' || c === 'C') && (m.lit || m.outdoor)) return 'rock:mountain';
  return null;
}
const isGreen = k => k === 'grass' || k === 'woods';
const isPath = k => k === 'dirt' || k === 'cobble';
const isWet = k => k === 'water' || k === 'shallow';
const isRock = k => !!k && k.startsWith('rock:');
// natural caves have rough, wandering rock; the kingdoms' halls are built: straight walls of laid stone or brick
const BUILT_THEMES = new Set(['g', 'r', 'h', 's']);
// rock: the dark top surface seen from above, and the face where the rock drops to the floor
function rockTop(th, wx, wy, R, edge) {
  const C = CAVE32[th], n = wnoise(wx / 6, wy / 6) * 0.6 + wnoise(wx / 2, wy / 2) * 0.4;
  if (th === 'mountain') {
    // high ground: grassy scrub over grey rock, broken by small ledges and boulders
    const rock = wnoise(wx / 12, wy / 10), led = wnoise(wx / 18, wy / 7) * 6, fl = led - Math.floor(led);
    let c;
    if (fl < 0.1) c = g_hex(C.face[3 + (tileHash(wx, wy) % 2)]); else if (fl < 0.17) c = g_shade(g_hex(C.face[1]), 0.75);
    else if (rock > 0.55) c = g_hex(C.face[Math.min(4, 1 + Math.floor((rock - 0.55) * 8))]);
    else c = g_hex(C.top[Math.min(C.top.length - 1, Math.floor(n * C.top.length))]);
    if (tileHash(wx, wy) % 17 === 0) c = g_shade(c, 0.78);
    if (edge) c = g_mix(c, g_hex(C.rim), 0.45);
    return c;
  }
  let c = g_hex(C.top[Math.min(C.top.length - 1, Math.floor(n * C.top.length))]);
  if (tileHash(wx, wy) % 13 === 0) c = g_shade(c, 0.8);
  if (edge) c = g_mix(c, g_hex(C.rim), 0.55);
  return c;
}
function rockFace(th, wx, wy, d, FH, built) {
  const C = CAVE32[th], f = C.face.map(g_hex), k = d / FH; // d: how far above the floor; 1 at the foot
  let c;
  if (built) {
    // laid courses: bricks six high and ten wide, staggered; mortar lines; a lit top edge on each brick
    const row = Math.floor(wy / 6), off = (row % 2) * 5, bx = Math.floor((wx + off) / 10);
    if (wy % 6 === 0 || (wx + off) % 10 === 0) c = g_shade(f[0], 0.72);
    else { c = f[1 + (tileHash(bx, row) % (f.length - 1))]; if (wy % 6 === 1) c = g_mix(c, [255, 245, 225], 0.12); }
  } else {
    // strata running across the face, broken by cracks, lighter where it catches the light up top
    const v = wnoise(wx / 9, wy / 2.4) * 0.55 + wnoise(wx / 3, wy / 3) * 0.25 + k * 0.35;
    c = f[Math.max(0, Math.min(f.length - 1, Math.floor(v * f.length)))];
    if (tileHash(Math.floor(wx / 2), Math.floor(wy / 5)) % 23 === 0) c = g_shade(f[0], 0.7);
  }
  if (d >= FH - 1) c = g_mix(c, g_hex(C.rim), 0.5);   // the lip
  if (th === 'mountain') { if (d >= FH - 4 && tileHash(wx, wy) % 3 === 0) c = g_hex(['#4a6236', '#566f3e', '#3f5530'][tileHash(wx, 1) % 3]); if (tileHash(wx >> 1, wy >> 3) % 29 === 0) c = g_shade(c, 0.7); }
  if (d <= 2) c = g_shade(c, 0.72 + d * 0.06);        // the foot, in shadow
  return c;
}

// smooth value noise in world space, for the wandering borders
function wnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const h = (a, b) => (tileHash(a + 9001, b + 7013) % 1000) / 1000;
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const GROUND_CACHE = new Map();
function groundBake(m) {
  const key = m.t.join('');
  const hit = GROUND_CACHE.get(m.id);
  if (hit && hit.m === m && hit.key === key) return hit;
  const W = m.w * 32, H = m.h * 32;
  const mats = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) mats.push(groundMat(m, x, y));
  const matAt = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h ? undefined : mats[y * m.w + x];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), out = img.data;
  const landAt = (x, y) => { const c = tileAt(m, x, y); if (c === undefined || c === null || c === '') return 1; return isWet(matAt(x, y)) || c === 'J' ? 0 : 1; };
  const landness = (wx, wy) => {
    const fx = wx / 32 - 0.5, fy = wy / 32 - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), kx = fx - ix, ky = fy - iy;
    const sx = kx * kx * (3 - 2 * kx), sy = ky * ky * (3 - 2 * ky);
    const v = landAt(ix, iy) * (1 - sx) * (1 - sy) + landAt(ix + 1, iy) * sx * (1 - sy) + landAt(ix, iy + 1) * (1 - sx) * sy + landAt(ix + 1, iy + 1) * sx * sy;
    return v + (wnoise(wx / 8, wy / 8) - 0.5) * 0.3 + (wnoise(wx / 3, wy / 3) - 0.5) * 0.1;
  };
  const pathAt = (x, y, self) => { const k = matAt(x, y); return isPath(k) ? 1 : isGreen(k) ? 0 : self ? 1 : 0; };
  const pathness = (wx, wy, self) => {
    const fx = wx / 32 - 0.5, fy = wy / 32 - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), kx = fx - ix, ky = fy - iy;
    const sx = kx * kx * (3 - 2 * kx), sy = ky * ky * (3 - 2 * ky);
    const v = pathAt(ix, iy, self) * (1 - sx) * (1 - sy) + pathAt(ix + 1, iy, self) * sx * (1 - sy) + pathAt(ix, iy + 1, self) * (1 - sx) * sy + pathAt(ix + 1, iy + 1, self) * sx * sy;
    return v + (wnoise(wx / 9, wy / 9) - 0.5) * 0.34 + (wnoise(wx / 3, wy / 3) - 0.5) * 0.12;
  };
  const rockAt = (x, y) => { const k = matAt(x, y); return k === undefined ? 1 : k === null ? (tileAt(m, x, y) === 'G' ? 1 : 0) : isRock(k) ? 1 : 0; };
  let RF = null;
  const rockRaw = (wx, wy) => {
    const fx = wx / 32 - 0.5, fy = wy / 32 - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), kx = fx - ix, ky = fy - iy;
    const sx = kx * kx * (3 - 2 * kx), sy = ky * ky * (3 - 2 * ky);
    const v = rockAt(ix, iy) * (1 - sx) * (1 - sy) + rockAt(ix + 1, iy) * sx * (1 - sy) + rockAt(ix, iy + 1) * (1 - sx) * sy + rockAt(ix + 1, iy + 1) * sx * sy;
    return v + (wnoise(wx / 11, wy / 11) - 0.5) * 0.62 + (wnoise(wx / 4, wy / 4) - 0.5) * 0.22 + (wnoise(wx / 1.6, wy / 1.6) - 0.5) * 0.08;
  };
  const rockness = (wx, wy, built) => {
    if (built) return rockAt(Math.floor(wx / 32), Math.floor(wy / 32));
    if (wx < 0 || wy < 0 || wx >= W || wy >= H) return 1;
    if (!RF) { RF = new Float32Array(W * H); RF.fill(NaN); }
    const i = wy * W + wx; let v = RF[i]; if (v !== v) { v = rockRaw(wx, wy); RF[i] = v; } return v;
  };
  // under the earth, the water is deep and dark
  const caveWater = !m.lit && !m.outdoor && m.theme !== 'house';
  const sample = (mat, wx, wy) => { if (caveWater && mat === 'water') mat = 'water:cave'; const d = groundTex(mat), i = ((wy & (GN - 1)) * GN + (wx & (GN - 1))) * 3; return [d[i], d[i + 1], d[i + 2]]; };
  const mud = g_hex('#5e4c32'), mud2 = g_hex('#6e5a3a'), foam = g_hex('#dcedf5'), shallow = g_hex('#6aa8cf');
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const A = mats[ty * m.w + tx]; if (!A) continue;
    // neighbours made of something else, and how the border between them behaves
    const nbs = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const B = matAt(tx + dx, ty + dy), c = tileAt(m, tx + dx, ty + dy);
      if (B === undefined) continue;
      if (isWet(A) && !isWet(B) && c !== 'J') nbs.push({ dx, dy, B, kind: 'shore' });
      else if (!isWet(A) && isWet(B)) nbs.push({ dx, dy, B, kind: 'damp' });
      else if (isWet(A) && isWet(B) && A !== B) nbs.push({ dx, dy, B, kind: 'blend' });
      else if (B && B !== A && ((isGreen(A) && isPath(B)) || (isPath(A) && isGreen(B)) || (isPath(A) && isPath(B)))) nbs.push({ dx, dy, B, kind: 'soft' });
    }
    // does rock touch this tile? then its pixels are decided by the rock's wandering edge
    let rocky = isRock(A), rockTh = isRock(A) ? A.slice(5) : (A.startsWith('floor:') ? A.slice(6) : null);
    for (let dy = -2; dy <= 1 && !rocky; dy++) for (let dx = -1; dx <= 1; dx++) { const nb = matAt(tx + dx, ty + dy); if (isRock(nb) && (!rockTh || nb.slice(5) === rockTh)) { rocky = true; rockTh = nb.slice(5); break; } }
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
      const wx = tx * 32 + i, wy = ty * 32 + j;
      let col = sample(A, wx, wy);
      if (rocky) {
        const th = rockTh, built = BUILT_THEMES.has(th);
        const Rv = rockness(wx, wy, built);
        if (Rv > 0.5) {
          const FH = th === 'mountain' ? 40 + Math.round(wnoise(wx / 13, 5) * 18) : built ? 16 : 13 + Math.round(wnoise(wx / 11, 3) * 7);
          let d = 0; for (let k = 1; k <= FH; k++) if (rockness(wx, wy + k, built) <= 0.5) { d = k; break; }
          col = d ? rockFace(th, wx, wy, d, FH, built) : rockTop(th, wx, wy, Rv, rockness(wx, wy - 1, built) <= 0.5 || rockness(wx - 1, wy, built) <= 0.5 || rockness(wx + 1, wy, built) <= 0.5);
          if (tileAt(m, Math.floor(wx / 32), Math.floor(wy / 32)) === 'V' && tileHash(wx, wy) % 19 === 0) col = tileHash(wx + 1, wy) % 2 ? g_hex('#e3b93c') : g_hex('#cfd6dd'); // a seam of ore glints
          const k2 = (wy * W + wx) * 4; out[k2] = col[0]; out[k2 + 1] = col[1]; out[k2 + 2] = col[2]; out[k2 + 3] = 255;
          continue;
        }
        if (isRock(A)) col = th === 'mountain' ? sample(m.outdoor ? 'woods' : 'grass', wx, wy) : sample('floor:' + th, wx, wy);
        // the ground darkens at the foot of a wall; under a mountain, scree spills out across it
        for (let k = 1; k <= (th === 'mountain' ? 8 : 4); k++) if (rockness(wx, wy - k, built) > 0.5) {
          col = g_shade(col, th === 'mountain' ? 0.6 + k * 0.05 : 0.62 + k * 0.08);
          if (th === 'mountain' && tileHash(wx, wy) % (k + 2) === 0) col = g_hex(['#9c968c', '#7d786f', '#b8b1a6'][tileHash(wy, wx) % 3]);
          break;
        }
      }
      if (isWet(A)) {
        // how shallow the water is here: smooth between tile centres, with a wandering edge
        const fx = wx / 32 - 0.5, fy = wy / 32 - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), kx = fx - ix, ky = fy - iy;
        const sh = (x, y) => { const c = tileAt(m, x, y), k2 = matAt(x, y); return c === 'J' ? 0.1 : k2 === 'water' ? 0 : k2 === 'shallow' ? 1 : 0.75; };
        const v = sh(ix, iy) * (1 - kx) * (1 - ky) + sh(ix + 1, iy) * kx * (1 - ky) + sh(ix, iy + 1) * (1 - kx) * ky + sh(ix + 1, iy + 1) * kx * ky;
        const f = Math.max(0, Math.min(1, (v + (wnoise(wx / 7, wy / 7) - 0.5) * 0.55 - 0.42) / 0.22));
        col = g_mix(sample('water', wx, wy), sample('shallow', wx, wy), f);
      }
      if (nbs.length) {
        // distance from this pixel to the nearest neighbour of each kind
        // deep water and shallows blend first, on their own; then the nearest other border has its say
        let best = null, bd = 99, wetN = null, wd = 99;
        for (const n of nbs) {
          const rx = (tx + n.dx) * 32, ry = (ty + n.dy) * 32, px = wx + 0.5, py = wy + 0.5;
          const ddx = px < rx ? rx - px : px > rx + 32 ? px - rx - 32 : 0, ddy = py < ry ? ry - py : py > ry + 32 ? py - ry - 32 : 0;
          const d = Math.hypot(ddx, ddy);
          if (n.kind === 'blend') { if (d < wd) { wd = d; wetN = n; } }
          else if (d < bd) { bd = d; best = n; }
        }
        if (!best) { /* only water around */ }
        else if (best.kind === 'shore' || best.kind === 'damp') {
          // the shoreline follows a smooth field over the tile centres, so banks curve instead of stepping
          const L = landness(wx, wy);
          if (L >= 0.5) col = best.kind === 'damp' ? (L < 0.57 ? g_shade(col, 0.8 + (L - 0.5) * 2.5) : col) : (best.B ? sample(best.B, wx, wy) : mud);
          else {
            if (best.kind === 'damp') col = g_mix(sample('water', wx, wy), sample('shallow', wx, wy), 0.8);
            if (L > 0.45) col = (tileHash(wx, wy) & 3) ? mud : mud2;
            else if (L > 0.41) col = (tileHash(wx + 3, wy) % 5) ? foam : shallow;
            else if (L > 0.24) col = g_mix(col, shallow, 0.5 * (L - 0.24) / 0.17);
          }
        } else if ((isGreen(A) && isPath(best.B)) || (isPath(A) && isGreen(best.B))) {
          // grass and path: the edge follows a smooth field over the tile centres, so paths run in curves
          const P2 = pathness(wx, wy, isPath(A));
          const onPath = P2 > 0.5;
          if (onPath !== isPath(A)) col = sample(best.B, wx, wy);
          if (onPath && P2 < 0.56) col = g_shade(col, 0.76); // the shadow under the overhanging grass
          else if (!onPath && P2 > 0.45 && tileHash(wx, wy) % 3 === 0) col = g_hex((m.outdoor ? WOODS32 : GRASS32).tip);
        } else {
          // a border that wanders either side of the tile edge; the greener or rougher side spills over
          const o = -2.6 + 8.4 * (wnoise(wx / 7, wy / 7) * 0.72 + wnoise(wx / 2.5, wy / 2.5) * 0.28);
          const spill = isGreen(best.B) || (best.B === 'dirt' && A === 'cobble');
          const s = spill ? o : -o; // how far the neighbour reaches into this tile
          if (bd < s) {
            col = sample(best.B, wx, wy);
            if (isGreen(best.B) && s - bd < 1.2 && tileHash(wx, wy) % 3 === 0) col = g_hex((m.outdoor ? WOODS32 : GRASS32).tip);
          } else if (bd < s + 1.3 && isGreen(best.B)) col = g_shade(col, 0.74); // the shadow under the overhanging grass
          else if (bd < s + 1.3 && isGreen(A) && isPath(best.B)) col = g_shade(col, 1.08);
        }
      }
      const k = (wy * W + wx) * 4; out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255;
    }
    // flowers on flowery ground, a few clusters each
    if (tileAt(m, tx, ty) === 'f') {
      const pal = (m.outdoor ? WOODS32 : GRASS32).flower.map(g_hex), stem = g_hex((m.outdoor ? WOODS32 : GRASS32).blade);
      for (let n = 0; n < 6; n++) {
        const h = tileHash(tx * 31 + n, ty * 17 + n * 3), fx = tx * 32 + 3 + h % 26, fy = ty * 32 + 4 + (h >>> 5) % 25, c = pal[(h >>> 10) % pal.length];
        const put = (x, y, cc) => { const k = (y * W + x) * 4; out[k] = cc[0]; out[k + 1] = cc[1]; out[k + 2] = cc[2]; out[k + 3] = 255; };
        put(fx, fy + 1, stem); put(fx, fy + 2, stem); put(fx, fy, [255, 243, 176]); put(fx - 1, fy, c); put(fx + 1, fy, c); put(fx, fy - 1, c); if (h & 1) put(fx, fy + 1, g_shade(c, 0.8));
      }
    }
  }
  g.putImageData(img, 0, 0);
  const rec = { m, key, cv, mats };
  GROUND_CACHE.clear(); GROUND_CACHE.set(m.id, rec);
  return rec;
}

// stairs, drawn over the floor: a ragged pit or rough-hewn steps in the natural caves; a built stairwell in the halls
const STAIRS = {};
function stairsArt(th, down) {
  const key = th + (down ? 'd' : 'u'); if (STAIRS[key]) return STAIRS[key];
  const C = CAVE32[th] || CAVE32.cave, c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const built = BUILT_THEMES.has(th), face = C.face, top = C.top, rim = C.rim;
  const accent = { g: '#6b4423', r: '#8a3f2b', h: '#7fb6d6', s: '#e3b93c' }[th] || rim;
  if (!built) {
    if (down) {
      // a ragged pit; ledges stepping down into the black
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const dx = (x + 0.5 - 16) / 13, dy = (y + 0.5 - 17) / 11, r = Math.hypot(dx, dy) + (tileHash(x, y) % 7) / 60; if (r < 1) F(x, y, 1, 1, r > 0.86 ? rim : r > 0.74 ? face[3] : '#0c090b'); }
      for (let i = 0; i < 4; i++) { const y = 9 + i * 4, w = 18 - i * 4; F(16 - w / 2, y, w, 2, face[Math.max(0, 3 - i)]); F(16 - w / 2, y, w, 1, i ? face[3 - i + 1] || rim : rim); }
    } else {
      // rough steps climbing north, lighter toward the top where the air comes in
      for (let i = 0; i < 5; i++) { const y = 4 + i * 5, w = 22 - (4 - i) * 2; F(16 - w / 2, y, w, 5, face[Math.min(3, 4 - i)] || face[0]); F(16 - w / 2, y, w, 1, i === 0 ? '#e8d8b0' : rim); F(16 + w / 2 - 2, y, 2, 5, top[0]); }
      g.fillStyle = 'rgba(255,230,170,0.25)'; g.fillRect(9, 2, 14, 4);
    }
  } else {
    // a built stairwell: a stone frame, steps, a post at each side in the people's own material
    F(5, 3, 22, 27, rim); F(6, 4, 20, 25, '#120c0e');
    for (let i = 0; i < 6; i++) { const y = down ? 5 + i * 4 : 25 - i * 4, col = down ? face[Math.max(0, 3 - Math.floor(i * 0.7))] : face[Math.min(3, Math.floor(i * 0.7))]; F(7, y, 18, 3, col); F(7, y, 18, 1, i === (down ? 0 : 5) ? rim : face[3]); }
    for (const x of [4, 26]) { F(x, 1, 3, 30, accent); F(x, 1, 1, 30, '#ffffff22'); F(x - 1, 0, 5, 2, accent); }
    if (th === 'h') { g.fillStyle = 'rgba(150,210,255,0.35)'; g.fillRect(7, down ? 26 : 3, 18, 3); }
    if (th === 's') for (let x = 8; x < 25; x += 4) F(x, down ? 3 : 28, 2, 1, '#fff1b0');
  }
  return STAIRS[key] = c;
}

// the cave mouth: a dark opening in the cliff face, braced with old timbers
let CAVE_MOUTH = null;
// The cave mouth: a ragged opening cut into the cliff, three tiles wide and two and a half tall, shored up with
// old mine timbers, black inside with a little daylight on the floor, rubble at its foot. Drawn standing on the C tile.
function caveMouthArt() {
  if (CAVE_MOUTH) return CAVE_MOUTH;
  const W = 96, H = 84, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  let seed = 77; const R = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const cx = W / 2, rx = 34, top = 10;
  // the opening's ragged edge: half-ellipse with a jittered rim
  const jit = []; for (let i = 0; i <= 24; i++) jit.push((R() - 0.5) * 5);
  const edgeAt = y => { const k = (H - y) / (H - top); if (k > 1) return -1; const i = Math.min(24, Math.floor((y / H) * 24)); return rx * Math.sqrt(Math.max(0, 1 - k * k)) + jit[i]; };
  for (let y = top - 4; y < H; y++) {
    const half = edgeAt(y); if (half < 0) continue;
    for (let x = Math.floor(cx - half - 4); x <= cx + half + 4; x++) {
      const d = Math.abs(x + 0.5 - cx) - half;
      if (d > 4) continue;
      if (d > 0) { F(x, y, 1, 1, d < 1.5 ? '#2a2420' : (x < cx ? '#8a847a' : '#5f5a52')); continue; } // the lip: lit on the left
      // inside: darkness, deepest at the back, a little daylight spilling onto the floor
      const depth = (y - top) / (H - top), fl = Math.max(0, (depth - 0.72) / 0.28);
      const v = Math.round(10 + fl * 26 + (R() < 0.08 ? 4 : 0));
      F(x, y, 1, 1, `rgb(${v + 4},${v},${v + 3})`);
    }
  }
  // the timbers: two posts leaning in a touch, a heavy lintel, wedges and an iron lamp hook
  const post = (x0, x1, col, hi) => { for (let y = 26; y < H - 2; y++) { const x = x0 + (x1 - x0) * (y - 26) / (H - 28); F(x, y, 6, 1, col); F(x, y, 1, 1, hi); F(x + 5, y, 1, 1, '#3a2614'); if (y % 9 === 0) F(x + 2, y, 2, 1, '#4e3420'); } };
  post(cx - 30, cx - 31, '#6b4423', '#9a6a3a'); post(cx + 24, cx + 25, '#5e3c1e', '#8a5c30');
  F(cx - 34, 20, 68, 8, '#2a1a10'); F(cx - 33, 21, 66, 6, '#7a4a26'); F(cx - 33, 21, 66, 1, '#a8743c'); F(cx - 33, 26, 66, 1, '#4e3018');
  for (let x = cx - 30; x < cx + 30; x += 11) F(x, 23, 1, 2, '#4e3018');
  F(cx - 26, 28, 4, 3, '#5e3c1e'); F(cx + 22, 28, 4, 3, '#5e3c1e');
  F(cx + 10, 28, 1, 5, '#2a2a2a'); F(cx + 9, 33, 3, 1, '#2a2a2a');
  // rubble and spoil at the foot, spilling out of the mouth
  for (let i = 0; i < 16; i++) { const x = cx - 38 + R() * 76, y = H - 6 + R() * 5, w = 3 + R() * 5; if (Math.abs(x - cx) < 18 && R() < 0.7) continue; F(x, y, w, 3, '#2a2420'); F(x + 1, y, w - 2, 2, R() < 0.5 ? '#8a847a' : '#6f6a62'); F(x + 1, y, w - 2, 1, '#a39d92'); }
  // daylight on the threshold
  g.fillStyle = 'rgba(255,214,150,0.10)'; g.fillRect(cx - 16, H - 14, 32, 14);
  return CAVE_MOUTH = c;
}
