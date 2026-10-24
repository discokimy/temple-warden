// The Temple Warden — inside the Temple of the Dawn.
// The nave: pale flagstones, pillars, rows of pews facing Aurel's altar, a rose window over the chancel and the
// statue of the god beneath it. Along the side aisles stand plinths for the other gods, each waiting for its idol
// until you earn that god's blessing. Through an arch beside the altar is the old heart of the place, older than
// Aurel's priests: the offering chamber, with a fire pit, a blackened offering stone and a carved standing stone,
// where the townsfolk leave bread, milk and first fruits, and where you can make offerings of your own. In its floor,
// an iron grate, locked, breathing cold air from somewhere below.
'use strict';

const TEMPLE_V = 3;
const TEMPLE_SIZE = [28, 17];
const TEMPLE_NICHES = { veyra: [1, 6], korrum: [1, 9], gharrok: [1, 12], nemora: [17, 6], ssathal: [17, 9] };

// ---------------- stone underfoot and on the walls ----------------
function templeFloor(seed, old) {
  return paint32(t => {
    // big pale limestone flags in staggered courses, worn smooth, with dark grout between;
    // in the old chamber, rougher, darker stones, sooty from the fire
    const base = old ? ['#6f665a', '#7a7064', '#655c50', '#837a6c'] : ['#b3aa98', '#bdb4a2', '#a9a08e', '#c4bba9'];
    t.F(0, 0, 32, 32, old ? '#3a342e' : '#7f7666');
    for (let row = 0; row < 2; row++) for (let col = -1; col < 2; col++) {
      const x0 = col * 16 + (row ? 8 : 0), y0 = row * 16, c = base[t.ri(0, 3)];
      for (let y = y0 + 1; y < y0 + 16; y++) for (let x = x0 + 1; x < x0 + 16; x++) {
        const v = t.noise(x, y, 8, row * 3 + col + 2) - 0.5;
        t.P(x, y, shadeC(c, 1 + v * 0.12));
      }
      t.F(((x0 + 1) % 32 + 32) % 32, y0 + 1, 14, 1, shadeC(c, 1.1));
      if (t.R() < 0.4) { let x = x0 + t.ri(3, 12), y = y0 + t.ri(3, 12); for (let k = 0; k < t.ri(3, 6); k++) { t.P(x, y, shadeC(c, 0.8)); x += t.ri(0, 1); y += 1; } }
    }
  }, seed);
}
function templeWall(seed, face) {
  return paint32(t => {
    const top = face ? 6 : 32;
    for (let y = 0; y < top; y++) for (let x = 0; x < 32; x++) t.P(x, y, (y % 4 === 0 || (x + (y >> 2) * 5) % 12 === 0) ? '#3a342e' : shadeC('#4a433b', 1 + (t.noise(x, y, 8, 1) - 0.5) * 0.15));
    if (!face) return;
    t.F(0, top, 32, 1, '#cfc6b4');
    // dressed ashlar in courses, lit from above, with a darker plinth course at the foot
    t.F(0, top + 1, 32, 32 - top - 1, '#8a8274');
    for (let y = top + 1, r = 0; y < 27; y += 6, r++) for (let x = (r % 2) ? -8 : 0; x < 32; x += 16) {
      const c = ['#b7ae9c', '#ada492', '#c0b7a5', '#a49b89'][t.ri(0, 3)];
      t.F(Math.max(0, x + 1), y + 1, Math.min(15, 32 - x - 1), 5, c); t.F(Math.max(0, x + 1), y + 1, Math.min(15, 32 - x - 1), 1, shadeC(c, 1.08));
    }
    t.F(0, 27, 32, 5, '#7c7466'); t.F(0, 27, 32, 1, '#9a9282'); t.F(0, 31, 32, 1, '#4a443c');
  }, seed);
}
function templeTiles() {
  if (TILE.tfloor) return;
  TILE.tfloor = [0, 1, 2, 3].map(s => templeFloor(301 + s));
  TILE.tfloorOld = [0, 1, 2, 3].map(s => templeFloor(311 + s, true));
  TILE.twall = [0, 1].map(s => templeWall(331 + s, false));
  TILE.twallFace = [0, 1, 2].map(s => templeWall(341 + s, true));
}
{
  const _tileArt = tileArt;
  tileArt = function (m, x, y) {
    if (m.style === 'temple') {
      const c = m.t[y][x];
      if (c === 'w') { templeTiles(); return tileVar(x >= 19 ? 'tfloorOld' : 'tfloor', x, y); }
      if (c === '#') { templeTiles(); return tileVar(tileAt(m, x, y + 1) === '#' ? 'twall' : 'twallFace', x, y); }
    }
    return _tileArt(m, x, y);
  };
}

// ---------------- the furnishings ----------------
const GOLD = ['#8a6a24', '#c8a03a', '#e3c25a', '#fff0a8'];
Object.assign(NATIVE_PROPS, {
  blk: () => nativeProp(1, 1, () => { }),
  // a pew seen from behind: the backrest, its top rail, the seat glimpsed beneath and turned legs; the ends carved
  pew: () => templePew(0), pewL: () => templePew(-1), pewR: () => templePew(1),
  // Aurel's altar: a long stone table under a gold-fringed cloth, the sun-disc, candles and the open Book of Dawn
  aurelaltar: () => nativeProp(96, 46, ({ F, P, E }) => {
    F(8, 22, 80, 22, '#8a8274'); F(8, 22, 80, 2, '#b7ae9c'); F(8, 42, 80, 2, '#5f584c');
    for (let x = 14; x < 84; x += 14) F(x, 26, 1, 16, '#6f685c');
    F(4, 14, 88, 10, '#e8e0cc'); F(4, 14, 88, 2, '#fffaf0'); F(18, 14, 60, 22, '#e8e0cc'); F(18, 24, 60, 12, '#d9cfb6');
    F(18, 34, 60, 3, GOLD[1]); for (let x = 19; x < 78; x += 3) F(x, 37, 1, 2, GOLD[2]);
    E(48, 28, 6, 6, GOLD[1]); E(48, 28, 4, 4, GOLD[2]); E(47, 27, 1.5, 1.5, GOLD[3]);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P(48 + Math.round(Math.cos(a) * 8), 28 + Math.round(Math.sin(a) * 8), GOLD[2]); }
    F(36, 8, 24, 7, '#6e4421'); F(37, 7, 10, 7, '#f4ecd8'); F(49, 7, 10, 7, '#f4ecd8'); F(47, 7, 2, 8, '#8a5a2b'); for (let y = 9; y < 13; y += 2) { F(39, y, 6, 1, '#9a8f7a'); F(51, y, 6, 1, '#9a8f7a'); }
    for (const x of [10, 20, 76, 86]) { F(x, 2, 3, 12, '#f2ead6'); F(x, 2, 1, 12, '#fffaf0'); F(x - 1, 13, 5, 2, GOLD[1]); P(x + 1, 0, '#ffd27a'); P(x + 1, 1, '#fff1b0'); }
  }),
  // the god himself: a robed figure in pale stone on a plinth, arms raised, holding up a gilded sun
  aurelstatue: () => nativeProp(40, 92, ({ F, P, E }) => {
    F(6, 76, 28, 14, '#8a8274'); F(6, 76, 28, 2, '#b7ae9c'); F(4, 88, 32, 3, '#6f685c'); F(10, 80, 20, 1, '#6f685c');
    for (let y = 32; y < 76; y++) { const w = 7 + (y - 32) * 0.22; F(20 - w, y, w * 2, 1, y % 7 === 0 ? '#bdb4a2' : '#d2c9b6'); P(20 - w, y, '#e6dece'); P(19 + w, y, '#a9a08e'); }
    for (let y = 40; y < 76; y += 1) if ((y >> 2) % 2) { P(16, y, '#b7ae9c'); P(24, y, '#b7ae9c'); }
    E(20, 26, 5, 6, '#d8cfbc'); E(19, 25, 3, 3, '#e6dece'); F(15, 21, 10, 3, '#c4bba9');
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) F(20 + s * (6 + k * 0.5) - 1, 34 - k * 1.6, 3, 2, '#d2c9b6');
    E(20, 9, 8, 8, GOLD[0]); E(20, 9, 7, 7, GOLD[1]); E(19, 8, 4, 4, GOLD[2]); E(18, 7, 1.5, 1.5, GOLD[3]);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; F(20 + Math.round(Math.cos(a) * 10), 9 + Math.round(Math.sin(a) * 10), 2, 2, GOLD[2]); }
  }),
  // the rose window over the chancel: stone tracery round a wheel of coloured glass, dawn-gold at the centre
  rosewindow: () => nativeProp(64, 60, ({ F, P, E }) => {
    E(32, 30, 28, 28, '#5f584c'); E(32, 30, 26, 26, '#8a8274');
    const glass = ['#c8a03a', '#b9343c', '#3b6fc4', '#3f8a3f', '#7b4bb5', '#d06a2a'];
    for (let y = 6; y < 55; y++) for (let x = 6; x < 59; x++) {
      const dx = x + 0.5 - 32, dy = y + 0.5 - 30, d = Math.hypot(dx, dy); if (d > 23) continue;
      const a = Math.atan2(dy, dx), seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12);
      if (d < 7) { P(x, y, d < 4 ? '#fff0a8' : '#e3c25a'); continue; }
      const lead = Math.abs(((a + Math.PI) / (Math.PI * 2)) * 12 - Math.round(((a + Math.PI) / (Math.PI * 2)) * 12)) < 0.07 || Math.abs(d - 15) < 0.8 || d > 22;
      P(x, y, lead ? '#2a2420' : shadeC(glass[seg % 6], 0.9 + (d < 15 ? 0.25 : 0) - (dy > 0 ? 0.1 : 0)));
    }
    E(32, 30, 6.5, 6.5, '#2a2420'); E(32, 30, 5.5, 5.5, '#e3c25a'); E(31, 29, 3, 3, '#fff0a8');
    F(26, 56, 12, 4, '#8a8274');
  }),
  // a long banner on the wall: Aurel's sun in gold on deep red, fringed at the foot
  sunbanner: () => nativeProp(28, 64, ({ F, P, E }) => {
    F(2, 2, 24, 2, '#6e4421'); F(1, 1, 2, 4, GOLD[1]); F(25, 1, 2, 4, GOLD[1]);
    F(4, 4, 20, 50, '#8a1f2a'); F(4, 4, 2, 50, '#a8323c'); F(22, 4, 2, 50, '#6a1620');
    for (let x = 4; x < 24; x++) { const y = 54 + (x % 4 < 2 ? 2 : 0); F(x, 54, 1, y - 54 + 3, '#8a1f2a'); P(x, y + 3, GOLD[1]); }
    E(14, 22, 5, 5, GOLD[1]); E(13, 21, 2.5, 2.5, GOLD[2]); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; F(14 + Math.round(Math.cos(a) * 7) - 1, 22 + Math.round(Math.sin(a) * 7) - 1, 2, 2, GOLD[1]); }
    F(8, 38, 12, 1, GOLD[1]); F(10, 42, 8, 1, GOLD[1]);
  }),
  // a tall iron candle-stand: a ring of tapers on a spike, wax dripping
  candlestand: () => nativeProp(32, 60, ({ F, P }) => {
    F(10, 56, 12, 3, '#2a2a2e'); F(12, 54, 8, 2, '#3a3a40'); F(15, 18, 2, 36, '#3a3a40'); F(15, 18, 1, 36, '#5a5a62');
    F(7, 16, 18, 3, '#3a3a40'); F(7, 16, 18, 1, '#5a5a62');
    for (const x of [8, 13, 18, 23]) { const h = 6 + (x % 3) * 2; F(x - 1, 16 - h, 3, h, '#efe6d2'); P(x - 1, 16 - h, '#fffaf0'); P(x, 15 - h, '#ffb347'); P(x, 14 - h, '#fff1b0'); F(x - 1, 16, 1, 3, '#efe6d2'); }
  }),
  // an empty plinth, its cloth grey with dust, waiting for a god's idol
  plinth: () => nativeProp(32, 40, ({ F, P }) => {
    F(6, 18, 20, 20, '#8a8274'); F(6, 18, 20, 2, '#b7ae9c'); F(6, 36, 20, 2, '#5f584c'); F(8, 22, 1, 12, '#a49b89');
    F(4, 14, 24, 5, '#9a9282'); F(4, 14, 24, 1, '#c0b7a5');
    F(8, 10, 16, 5, '#7d7466'); F(9, 9, 14, 2, '#8e8577'); for (let x = 9; x < 23; x += 3) P(x, 14, '#6a6256');
  }),
  // the offering box by the door
  almsbox: () => nativeProp(32, 34, ({ F, P }) => {
    F(10, 10, 12, 22, '#5e3c1e'); F(10, 10, 2, 22, '#7a5230'); F(20, 10, 2, 22, '#4a2e16'); F(8, 8, 16, 3, '#6e4421'); F(8, 8, 16, 1, '#8a5a2b');
    F(13, 8, 6, 1, '#120c0a'); F(10, 18, 12, 2, '#3a3a40'); F(10, 26, 12, 2, '#3a3a40'); F(15, 21, 2, 3, GOLD[1]);
  }),
  // ---- the offering chamber ----
  // the offering stone: a great low slab, blackened in the middle, with a channel cut round it, heaped with gifts
  offerstone: () => nativeProp(72, 40, ({ F, P, E }) => {
    E(36, 28, 34, 11, '#4a433b'); E(36, 26, 32, 10, '#6f685c'); E(36, 24, 30, 9, '#8a8274'); E(34, 22, 22, 6, '#9a9282');
    E(36, 24, 12, 4, '#3a3430'); E(36, 24, 8, 2.5, '#2a2420');
    for (let a = 0; a < Math.PI * 2; a += 0.12) P(36 + Math.round(Math.cos(a) * 26), 24 + Math.round(Math.sin(a) * 7.5), '#5f584c');
    // bread, a jug of milk, apples, a sheaf, a cup of wine
    E(14, 20, 5, 3, '#b07a3a'); E(13, 19, 3, 1.5, '#d49a54'); F(10, 21, 8, 1, '#8a5a2a');
    F(56, 12, 7, 10, '#c9b79a'); F(56, 12, 2, 10, '#e2d4b8'); F(57, 10, 5, 2, '#a89a7e'); F(57, 11, 5, 1, '#f4f0e6');
    for (const [x, y] of [[22, 26], [26, 27], [24, 25]]) { E(x, y, 2, 2, '#b9343c'); P(x - 1, y - 1, '#e8686a'); P(x, y - 2, '#5a3a20'); }
    for (let k = 0; k < 9; k++) F(46 + k, 14 + (k % 2), 1, 10, k % 2 ? '#c9a24a' : '#e0bc62'); F(45, 18, 11, 2, '#8a6a24');
    F(32, 15, 4, 5, GOLD[1]); F(31, 14, 6, 1, GOLD[2]); F(33, 15, 2, 1, '#6a1620');
  }),
  // a fire pit ringed with stones, always tended
  firepit: () => nativeProp(40, 34, ({ F, P, E }) => {
    E(20, 24, 17, 8, '#3a3430'); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, x = 20 + Math.cos(a) * 15, y = 24 + Math.sin(a) * 7; E(x, y, 3.5, 2.6, k % 2 ? '#8a8274' : '#9a9282'); P(Math.round(x) - 1, Math.round(y) - 2, '#c0b7a5'); }
    E(20, 24, 10, 4, '#1a1210'); for (let k = 0; k < 5; k++) F(12 + k * 3, 22 + (k % 2), 6, 2, k % 2 ? '#5a3a20' : '#4a2e16');
    for (const [x, h, c] of [[14, 10, '#d0461f'], [18, 16, '#f07a2a'], [22, 13, '#f07a2a'], [26, 9, '#d0461f'], [20, 9, '#ffd27a'], [17, 6, '#fff1b0']]) for (let y = 0; y < h; y++) { const w = Math.max(1, Math.round((1 - y / h) * 3)); F(x - w / 2, 23 - y, w, 1, c); }
  }),
  // the standing stone: older than the temple, carved with rings and a sun that is not quite Aurel's
  standingstone: () => nativeProp(36, 80, ({ F, P, E }) => {
    for (let y = 6; y < 76; y++) { const w = 9 + Math.sin(y / 11) * 1.5 + (y > 60 ? (y - 60) * 0.2 : 0) - (y < 14 ? (14 - y) * 0.6 : 0); F(18 - w, y, w * 2, 1, '#7a746a'); P(18 - w, y, '#9a948a'); F(18 + w - 3, y, 3, 1, '#5f5a52'); }
    for (const [cy, r] of [[24, 6], [24, 3], [46, 5]]) for (let a = 0; a < Math.PI * 2; a += 0.15) P(18 + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r), '#4f4a44');
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P(18 + Math.round(Math.cos(a) * 8), 24 + Math.round(Math.sin(a) * 8), '#4f4a44'); }
    for (let y = 54; y < 68; y += 3) F(12, y, 12, 1, '#55504a');
    for (let i = 0; i < 14; i++) P(10 + (i * 7) % 16, 64 + (i * 5) % 12, i % 2 ? '#5e7a38' : '#4f6a30');
    E(18, 76, 14, 3, '#3a3430');
  }),
  // sheaves of grain and baskets the townsfolk have brought
  sheaves: () => nativeProp(32, 34, ({ F, P, E }) => {
    for (const [x0, h] of [[6, 26], [14, 30], [21, 24]]) { for (let k = 0; k < 7; k++) F(x0 + k, 32 - h, 1, h, k % 2 ? '#c9a24a' : '#e0bc62'); F(x0 - 1, 32 - h * 0.45, 9, 2, '#8a6a24'); for (let k = 0; k < 7; k++) P(x0 + k, 31 - h, '#f2d27a'); }
  }),
  amphorae: () => nativeProp(32, 34, ({ F, E, P }) => {
    for (const [x, h, c] of [[10, 22, '#a8583a'], [21, 18, '#8f4a30']]) { E(x, 32 - h * 0.45, 6, h * 0.42, c); F(x - 2, 32 - h, 4, 4, c); F(x - 3, 32 - h - 1, 6, 2, shadeC(c, 1.2)); E(x - 2, 32 - h * 0.5, 1.5, h * 0.25, shadeC(c, 1.25)); F(x - 4, 31, 8, 1, '#3a2418'); }
  }),
  // an iron grate in the floor: cold air, and darkness below
  grate: () => nativeProp(32, 18, ({ F, P }) => {
    F(3, 2, 26, 14, '#3a3430'); F(5, 4, 22, 10, '#0c090b');
    for (let x = 5; x < 27; x += 4) F(x, 4, 2, 10, '#4a4a52'); for (let y = 4; y < 14; y += 4) F(5, y, 22, 1, '#4a4a52');
    F(14, 8, 4, 3, '#6a6a72'); P(15, 9, '#1a1a1e'); F(3, 2, 26, 1, '#5f5a52');
  }),
});
function templePew(end) {
  return nativeProp(32, 30, ({ F, P }) => {
    const wood = '#6b4423', lit = '#8a5a2b', dk = '#4a2e16';
    F(0, 18, 32, 5, dk); F(0, 18, 32, 1, '#5a3a1c'); // the seat, glimpsed below the back
    F(0, 6, 32, 12, wood); F(0, 6, 32, 2, lit); F(0, 12, 32, 1, dk); for (let x = 3; x < 32; x += 9) F(x, 8, 1, 10, '#5e3c1e');
    F(0, 23, 32, 2, '#3a2410');
    for (const x of end ? [end < 0 ? 1 : 26] : []) { F(x, 2, 5, 26, '#5e3c1e'); F(x, 2, 5, 2, lit); F(x + 1, 0, 3, 3, '#7a5230'); F(x + 1, 10, 3, 1, dk); F(x + 1, 16, 3, 1, dk); }
    if (!end) for (const x of [4, 27]) F(x, 23, 2, 6, dk); else F(end < 0 ? 26 : 4, 23, 2, 6, dk);
  });
}
Object.assign(DECOR_BLOCK, { blk: 1, pew: 1, pewL: 1, pewR: 1, aurelaltar: 1, aurelstatue: 1, rosewindow: 1, sunbanner: 1, candlestand: 1, plinth: 1, almsbox: 1, offerstone: 1, firepit: 1, standingstone: 1, sheaves: 1, amphorae: 1, grate: 1 });

// ---------------- the building ----------------
function buildTemple() {
  const [W, H] = TEMPLE_SIZE;
  const m = blankMap('temple', W, H, 'w', { lit: true, name: 'The Temple of the Dawn', theme: 'house' });
  m.style = 'temple'; m.tv = TEMPLE_V;
  const D = (x, y, d, tr) => { m.decor[K(x, y)] = d; if (tr) m.trig[K(x, y)] = typeof tr === 'string' ? { dlg: 'locked', text: tr } : tr; };
  // the nave (x 0–18) and the offering chamber (x 18–27), sharing a wall pierced by an arch beside the chancel
  box(m, 0, 0, 18, H - 1, '#'); rect(m, 1, 1, 17, 1, '#');
  box(m, 18, 0, W - 1, 10, '#'); rect(m, 19, 1, W - 2, 1, '#'); rect(m, 19, 11, W - 1, H - 1, '#');
  setTile(m, 18, 3, 'w'); setTile(m, 18, 4, 'w');
  // the chancel: the rose window, the statue, the altar and its candles, banners either side
  D(9, 1, 'rosewindow'); D(5, 1, 'sunbanner'); D(13, 1, 'sunbanner');
  // Aurel himself stands in the offering chamber's arch, looking out over his nave
  D(17, 2, 'aurelstatue', "Aurel, in pale stone, holds up the sun beside the arch to the old chamber, as if to stand between the nave and what is through there. The gilding on the disc is wearing thin where generations of hands have reached up to touch it.");
  for (const x of [8, 9, 10]) { D(x, 3, x === 9 ? 'aurelaltar' : 'blk', { dlg: 'templealtar' }); }
  D(6, 2, 'candlestand'); D(12, 2, 'candlestand');
  D(13, 4, 'podium', { t: 'lectern' });
  // pillars down the nave, and the pews between them facing the altar
  for (const y of [5, 9, 13]) { D(2, y, 'pillar'); D(16, y, 'pillar'); }
  for (const y of [6, 8, 10, 12]) for (const [a, b] of [[3, 7], [11, 15]]) for (let x = a; x <= b; x++) D(x, y, x === a ? 'pewL' : x === b ? 'pewR' : 'pew', { t: 'pew' });
  // the plinths of the other gods, along the side aisles
  for (const g in TEMPLE_NICHES) { const [x, y] = TEMPLE_NICHES[g]; m.trig[K(x, y)] = { t: 'niche', g }; }
  D(17, 12, 'almsbox', { t: 'alms' });
  D(1, 15, 'basin', 'A stone stoup of water by the door, for the hands and the brow. Halvard changed it every morning. It has gone a little green.');
  m.rugs = [[8, 4, 3, 11]];
  // the offering chamber
  D(23, 4, 'offerstone', { t: 'offer' }); D(22, 4, 'blk', { t: 'offer' }); D(24, 4, 'blk', { t: 'offer' });
  D(23, 7, 'firepit', { t: 'offer' });
  D(26, 3, 'standingstone', { t: 'stone' });
  D(20, 2, 'sheaves', 'Sheaves of the first wheat, tied with red thread, and a basket of eggs. Left here by people who could little spare them.');
  D(25, 8, 'amphorae', 'Clay jars of milk, mead and small beer, brought by the townsfolk for the gods. One is labelled, in a child\'s hand, FOR THE GREEN LADY.');
  D(20, 8, 'grate', { t: 'grate' });
  // doors: west into the parsonage, south out into the town
  setTile(m, 0, 4, '+'); m.trig[K(0, 4)] = { t: 'toParsonage' };
  setTile(m, 9, H - 1, '+'); m.trig[K(9, H - 1)] = { go: 'town', at: TEMPLE_OUT };
  m.lights = [[9, 3, 5, 'candle'], [6, 2, 3, 'candle'], [12, 2, 3, 'candle'], [23, 7, 5, 'hearth'], [9, 12, 6, 'candle']];
  refreshTempleNiches(m);
  return m;
}
// each god you've won the blessing of has its idol on its plinth
function refreshTempleNiches(m) {
  const p = P();
  for (const g in TEMPLE_NICHES) { const [x, y] = TEMPLE_NICHES[g]; m.decor[K(x, y)] = p && p.gods[g] ? 'shrine_' + g : 'plinth'; }
}
function enterTemple(x, y) {
  if (!S.maps.temple || (S.maps.temple.tv || 0) < TEMPLE_V) S.maps.temple = buildTemple();
  refreshTempleNiches(S.maps.temple);
  if (!S.story.templeIn) { S.story.templeIn = 1; msg('The temple is cool and quiet. Dust hangs in the coloured light from the rose window. Through the arch beside the altar, a fire is burning in the old offering chamber.', 'talk'); }
  else msg('You step into the Temple of the Dawn.', 'talk');
  goMap('temple', x, y);
}

// ---------------- offerings ----------------
// Each god takes what suits it. An offering is felt: the god hears you again today (its gift, if spent, returns),
// and your faith grows with what you give up. Once a day a god answers; after that, gifts still count for faith.
const OFFER_LIKES = {
  aurel: ['wheat', 'egg', 'milk', 'apple', 'healroot'],
  veyra: ['meat', 'antler', 'pelt', 'feather', 'apple'],
  korrum: ['stone', 'iron', 'silver', 'mithril'],
  gharrok: ['meat', 'wood', 'bone', 'iron'],
  nemora: ['trout', 'perch', 'pike', 'caveeel', 'goldcarp', 'moonpetal'],
  ssathal: ['egg', 'redcap', 'gel', 'silk'],
};
const OFFER_ANSWER = {
  aurel: 'The fire leaps up white for a moment, and warmth goes through you like sunrise.',
  veyra: 'Somewhere outside, a stag barks. The smoke smells of pine.',
  korrum: 'The standing stone hums, very low, like a mountain clearing its throat.',
  gharrok: 'The fire roars and spits sparks to the roof. You feel your arm grow strong.',
  nemora: 'For a moment the fire burns blue, and you remember something you had forgotten.',
  ssathal: 'The smoke coils on itself, slowly, and you feel watched, and approved of.',
};
function openOffering() {
  const p = P(), gods = GOD_ORDER.filter(g => p.gods[g]);
  S.offered = S.offered || {};
  const rows = gods.map(g => {
    const G = GODS[g], have = OFFER_LIKES[g].filter(id => p.mats[id] > 0), answered = S.offered[g] === S.day;
    const btns = have.length ? have.map(id => `<button class="btn tiny" data-t="offer|${g}|${id}">${MATS[id].name} (${p.mats[id]})</button>`).join('') : `<span class="dim">Bring ${OFFER_LIKES[g].slice(0, 3).map(id => MATS[id].name.toLowerCase()).join(', ')}…</span>`;
    return `<div class="row"><span class="gl">${spriteImg(propCanvas('shrine_' + g), 32)}</span><div class="nm"><b>${G.name}, ${G.title}</b><small>${answered ? 'Has heard you today.' : prayedOut(g) ? `Offer something and ${G.name} will hear your prayer again today.` : 'Will hear you.'}</small><div class="btnrow">${btns}</div></div></div>`;
  }).join('');
  const A = S.home && S.home.animals ? Object.keys(S.home.animals).filter(k => S.home.animals[k] > 0) : [];
  const beasts = A.length ? `<h3>A beast from your pens</h3><p>The old way, the way the valley kept before Aurel's priests came: a life given back. Every god hears a gift like that.</p><div class="btnrow">${A.map(k => `<button class="btn" data-t="beast|${k}">Give a ${k} (${S.home.animals[k]})</button>`).join('')}</div>` : '';
  openModal('The Offering Stone', `${keeperArt(nativePropCanvas('offerstone'), `<p>The stone is black at its heart from a thousand fires. Bread, milk and first fruits lie around its edge, brought by people who need the gods more than they need the food.</p>`)}
    <p>Lay something on the stone and give it to the fire. A god who has heard you today will hear you again.</p>
    ${rows || '<p class="dim">You bear no god\'s blessing yet to make offerings to.</p>'}${beasts}`, { refresh: openOffering });
}
function makeOffering(g, id) {
  const p = P(); if (!(p.mats[id] > 0) || !p.gods[g]) return;
  p.mats[id]--; S.offered = S.offered || {};
  playAnim(p, 'pray');
  const first = S.offered[g] !== S.day; S.offered[g] = S.day;
  useSkill('faith', first ? 8 : 3);
  if (first) {
    if (p.prayed[g] === S.day) delete p.prayed[g]; if (p.prayed2 && p.prayed2[g] === S.day) delete p.prayed2[g];
    if (g === 'aurel') { p.hp = maxHp(); p.mp = maxMp(); }
    msg(`You lay the ${MATS[id].name.toLowerCase()} on the stone for ${GODS[g].name}. ${OFFER_ANSWER[g]}`, 'good');
  } else msg(`You give the ${MATS[id].name.toLowerCase()} to the fire for ${GODS[g].name}. The smoke goes up straight.`, 'talk');
  S.offerings = (S.offerings || 0) + 1;
  refresh(); openOffering();
}
function offerBeast(k) {
  const p = P(), A = S.home.animals; if (!(A[k] > 0)) return;
  A[k]--; if (typeof syncAnimals === 'function') try { syncAnimals(); } catch (e) { }
  playAnim(p, 'kneel');
  S.offered = S.offered || {};
  for (const g of GOD_ORDER) if (p.gods[g]) { S.offered[g] = S.day; if (p.prayed[g] === S.day) delete p.prayed[g]; if (p.prayed2) delete p.prayed2[g]; }
  p.hp = maxHp(); p.mp = maxMp();
  useSkill('faith', 25);
  S.offerings = (S.offerings || 0) + 3;
  msg(`You lead the ${k} to the stone and give it to the gods, quickly and with a prayer, the old way. The fire takes the offering with a sound like a held breath let go. Every god you serve is listening.`, 'good');
  refresh(); openOffering();
}

// ---------------- the rest of the temple ----------------
function templeThing(tr) {
  const p = P();
  if (tr.t === 'toParsonage') { msg('You step through into the parsonage.'); goMap('parsonage', 8, 4); return true; }
  if (tr.t === 'offer') { openOffering(); return true; }
  if (tr.t === 'pew') {
    if (S.story.pewDay === S.day) { msg('You sit a while longer in the quiet.', 'talk'); return true; }
    S.story.pewDay = S.day; playAnim(p, 'pray'); p.mp = Math.min(maxMp(), p.mp + 3); useSkill('faith', 2);
    msg(pick(['You sit in the pew where you sat every morning as a boy, and for a moment Halvard\'s voice is reading the dawn office.', 'You sit and let the quiet settle. The candles tick. Your mind clears.', 'You sit, and pray for the people who used to fill these pews.']), 'good'); refresh(); return true;
  }
  if (tr.t === 'lectern') { msg('Halvard\'s prayer book lies open on the lectern at the Dawn Office. In the margin, in his small hand: "The fire would not take the child. Why would it not?" The line is underlined twice.', 'talk'); return true; }
  if (tr.t === 'niche') {
    const g = tr.g, G = GODS[g];
    if (p.gods[g]) { openShrine(g); return true; }
    msg(`An empty plinth, its cloth grey with dust. A worn name is cut into the stone: ${G.name.toUpperCase()}, ${G.title.toUpperCase()}. Halvard said the old idols were taken away long ago, and the plinths left so the gods would not feel forgotten. ${G.name}'s shrine is in ${G.where.replace(/^A /, 'a ').replace(/^The /, 'the ')}.`, 'talk');
    return true;
  }
  if (tr.t === 'alms') {
    if (p.gold < 10) { msg('The alms box. You have nothing to spare.', 'talk'); return true; }
    p.gold -= 10; useSkill('faith', 2); msg('You drop ten gold into the alms box for the poor of the parish. It lands on very little.', 'good'); refresh(); return true;
  }
  if (tr.t === 'stone') { msg('The standing stone is older than the temple; the temple was built around it. Rings and a sun are cut into it, but the sun has too many rays to be Aurel\'s. Halvard always lit a candle at its foot, and never said for whom.', 'talk'); return true; }
  if (tr.t === 'grate') { msg('An iron grate in the floor, locked with a heavy padlock. Cold air rises through it, smelling of earth and old stone, and far below there is the faint sound of dripping water. You never knew this was here. Halvard must have kept it covered.', 'talk'); return true; }
  return false;
}
{
  const _doTrigger = doTrigger;
  doTrigger = function (tr) {
    if (tr.t && templeThing(tr)) return;
    if (tr.dlg === 'templealtar') { playAnim(P(), 'pray'); return openTemple(); }
    if (tr.dlg === 'temple') {
      if (S.mapId === 'parsonage') return enterTemple(1, 4);
      if (S.mapId === 'town') return enterTemple(9, TEMPLE_SIZE[1] - 2);
    }
    return _doTrigger(tr);
  };
}
// buttons in the offering window
document.addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b || !S) return;
  const [k, a, c] = b.dataset.t.split('|');
  if (k === 'offer') makeOffering(a, c);
  else if (k === 'beast') offerBeast(a);
});

// ---------------- the game's icon: Father Halvard at prayer, haloed by the rising sun ----------------
// Drawn with the same renderer as everyone in the game, then set as the tab and home-screen icon.
function drawGameIcon(size) {
  const N = 32, c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const top = hx('#1c1830'), mid = hx('#4a2a48'), low = hx('#c8643a');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let col = y / (N - 1) < 0.55 ? mix(top, mid, y / (N - 1) / 0.55) : mix(mid, low, (y / (N - 1) - 0.55) / 0.45);
    const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 13);
    if (d < 11) col = d < 6 ? hx('#fff0a8') : d < 9 ? hx('#ffd86a') : hx('#f2a83a');
    else if (d < 15.5) { const a = Math.atan2(y + 0.5 - 13, x + 0.5 - 16); if (Math.abs(a / (Math.PI / 8) - Math.round(a / (Math.PI / 8))) < 0.22) col = mix(col, hx('#ffc85a'), 0.65); }
    g.fillStyle = `rgb(${col})`; g.fillRect(x * 2, y * 2, 2, 2);
  }
  const f = figure(Object.assign({}, FIG_SPECS.priest), 'down', 'pray');
  g.drawImage(f, 0, 0, 32, 40, 8, 10, 48, 60);
  const out = document.createElement('canvas'); out.width = out.height = size; const o = out.getContext('2d'); o.imageSmoothingEnabled = false;
  o.beginPath(); o.roundRect(0, 0, size, size, size * 0.19); o.clip(); o.drawImage(c, 0, 0, size, size);
  return out.toDataURL('image/png');
}
try {
  const ic = document.querySelector('link[rel="icon"]'), at = document.querySelector('link[rel="apple-touch-icon"]');
  if (ic) ic.href = drawGameIcon(64); if (at) at.href = drawGameIcon(192);
} catch (e) { }
