// The Temple Warden — your estate. The East Field is only the start: buy the neighbouring Woodlot, Riverside and
// South Pasture from the Land Registry, raise a barn, an animal pen, fields and an orchard, restore the old chapel,
// buy beasts at the auction ring, hire hands to work the land, and gather what it yields each day.
'use strict';

const HOME_ENTRY = [1, 20];
const PARCELS = {
  field: { name: 'The East Field', price: 350, x0: 1, y0: 10, x1: 37, y1: 30, desc: 'Flat meadow by the farm track, an old chapel in ruins, a rocky rise for a mine.' },
  woodlot: { name: 'The Woodlot', price: 250, x0: 1, y0: 1, x1: 62, y1: 9, gate: [20, 10], desc: 'Old oaks and pines to the north. Timber for the taking, herbs in the clearings.' },
  riverside: { name: 'The Riverside', price: 300, x0: 38, y0: 10, x1: 62, y1: 30, gate: [38, 20], desc: 'The Bramble runs through it. A trout pond, rich soil for an orchard, room for a cottage.' },
  pasture: { name: 'The South Pasture', price: 280, x0: 1, y0: 31, x1: 62, y1: 38, gate: [20, 31], desc: 'Sweet grass for a barn, an animal pen and fields of wheat.' },
};
// where each structure stands: a building (footprint and door) or a feature drawn on the ground
const ESTATE_PLAN = {
  house: { bld: [14, 11, 7, 6, 17], roof: 'h', wall: 'H', kind: 'home', orient: 'gable' },
  forge: { bld: [22, 12, 5, 5, 24], roof: 'l', wall: 'K', kind: 'shed', props: [[21, 17, 'furnace'], [23, 18, 'anvil'], [25, 18, 'quench']] },
  bench: { bld: [28, 12, 5, 5, 30], roof: 'h', wall: 'H', kind: 'alchemist', orient: 'gable' },
  chapel: { bld: [4, 11, 7, 6, 7], roof: 'l', wall: 'K', kind: 'home', orient: 'gable', parcel: 'field' },
  garden: { site: [11, 20], area: [7, 18, 13, 21], prop: 'herbbed' },
  altar: { site: [34, 24], ring: 1 },
  mine: { site: [31, 27] },
  barn: { bld: [5, 31, 9, 6, 9], roof: 'h', wall: 'H', kind: 'barn', orient: 'gable', parcel: 'pasture' },
  pen: { site: [22, 37], pen: [18, 32, 27, 37], parcel: 'pasture' },
  fields: { site: [30, 37], area: [30, 32, 44, 37], prop: 'wheat', parcel: 'pasture' },
  orchard: { site: [42, 18], area: [41, 12, 47, 17], tree: 'apple', parcel: 'riverside' },
  cottage: { bld: [53, 22, 6, 5, 55], roof: 'r', wall: 'W', kind: 'home', parcel: 'riverside' },
};
Object.assign(STRUCTURES, {
  chapel: { name: 'Chapel of the Field', spr: 'sign', gold: 220, mats: { stone: 30, wood: 12 }, desc: 'Restore the old chapel. Pray there once a day for a blessing on the work of your hands.',
    up: { name: 'Shrine of the Dawn', gold: 400, mats: { stone: 20, silver: 4 }, desc: 'The blessing lasts the whole day, and your hands work faster: workers bring in a quarter more.' } },
  barn: { name: 'Barn', spr: 'sign', gold: 260, mats: { wood: 40, stone: 10 }, needs: 'pasture', desc: 'Stores twice as much, and lets you keep cows and sheep in the pen.',
    up: { name: 'Great Barn', gold: 400, mats: { wood: 50, stone: 20, iron: 6 }, desc: 'Room for twice as many animals.' } },
  pen: { name: 'Animal Pen', spr: 'sign', gold: 90, mats: { wood: 18 }, needs: 'pasture', desc: 'Keep chickens, and with a barn, sheep and cows. Buy them at the auction ring in town.',
    up: { name: 'Paddock', gold: 160, mats: { wood: 24, stone: 6 }, desc: 'Animals yield more and are worth more at market.' } },
  fields: { name: 'Wheat Fields', spr: 'sign', gold: 70, mats: { wood: 6 }, needs: 'pasture', desc: 'Sow wheat. Harvest a sheaf every day, or let a farmhand do it.',
    up: { name: 'Plowed Fields', gold: 150, mats: { wood: 10, iron: 4 }, desc: 'Twice the harvest.' } },
  orchard: { name: 'Orchard', spr: 'sign', gold: 120, mats: { wood: 8 }, needs: 'riverside', desc: 'Plant apple trees by the river. Apples every day once they take.',
    up: { name: 'Old Orchard', gold: 220, mats: { wood: 10, stone: 6 }, desc: 'Heavier boughs: more apples, and now and then a golden one.' } },
  cottage: { name: "Workers' Cottage", spr: 'sign', gold: 240, mats: { wood: 30, stone: 20 }, needs: 'riverside', desc: 'Room for two hired hands: a farmhand, a woodcutter or a miner.',
    up: { name: 'Bunkhouse', gold: 360, mats: { wood: 30, stone: 25 }, desc: 'Room for a third hand.' } },
});
Object.assign(MATS, {
  egg: { name: 'Eggs', spr: 'pebbles', cat: 'food', val: 2, wt: 0.2, icon: 'egg' },
  milk: { name: 'Milk', spr: 'pebbles', cat: 'food', val: 4, wt: 1, icon: 'milk' },
  wool: { name: 'Wool', spr: 'hide', cat: 'hide', val: 6, wt: 1, icon: 'wool' },
  wheat: { name: 'Wheat', spr: 'leaf', cat: 'food', val: 3, wt: 0.5, icon: 'wheat' },
  apple: { name: 'Apples', spr: 'leaf', cat: 'food', val: 2, wt: 0.3, icon: 'apple' },
});
const ANIMALS = { chicken: { name: 'Chicken', price: 15, yields: 'egg', every: 1, n: [1, 2] }, sheep: { name: 'Sheep', price: 40, yields: 'wool', every: 2, n: [1, 2], barn: 1 }, cow: { name: 'Cow', price: 60, yields: 'milk', every: 1, n: [1, 1], barn: 1 } };
const WORKERS = { farmhand: { name: 'Farmhand', wage: 5, desc: 'Tends the garden, fields and orchard and gathers from the pen every morning.' }, woodcutter: { name: 'Woodcutter', wage: 4, needs: 'woodlot', desc: 'Fells timber in the woodlot: six wood a day.' }, miner: { name: 'Miner', wage: 6, needs: 'mine', desc: 'Works your mine shaft: three ore a day, sometimes silver.' } };

// ---- little icons for the new goods ----
const EST_ICON = {};
function estIcon(id) {
  if (EST_ICON[id]) return EST_ICON[id];
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const E = (cx, cy, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const k = MATS[id].icon;
  if (k === 'egg') { E(12, 19, 6, 8, '#2a2230'); E(12, 19, 5, 7, '#efe6d2'); E(10, 16, 2, 3, '#fffaf0'); E(21, 21, 5.5, 7, '#2a2230'); E(21, 21, 4.5, 6, '#d8b48a'); E(19, 18, 1.5, 2.5, '#f0d8b0'); }
  else if (k === 'milk') { F(9, 8, 14, 20, '#2a2230'); F(10, 9, 12, 18, '#9aa5b0'); F(11, 12, 10, 14, '#f4f0e8'); F(11, 12, 3, 14, '#ffffff'); F(12, 5, 8, 4, '#6b4423'); }
  else if (k === 'wool') { for (const [x, y] of [[10, 14], [16, 11], [22, 14], [13, 19], [19, 19]]) { E(x, y, 6, 5, '#2a2230'); } for (const [x, y] of [[10, 14], [16, 11], [22, 14], [13, 19], [19, 19]]) { E(x, y, 5, 4, '#f4efe2'); E(x - 1, y - 1, 2, 1.5, '#ffffff'); } }
  else if (k === 'wheat') { for (const dx of [-5, 0, 5]) { F(15 + dx, 14, 2, 15, '#8a6a24'); for (let y = 4; y < 15; y += 3) { E(14 + dx, y, 2, 2, '#e3c06a'); E(18 + dx, y + 1, 2, 2, '#c9a04a'); } } F(9, 21, 15, 3, '#7d2027'); }
  else if (k === 'apple') { E(16, 19, 9, 8, '#2a2230'); E(16, 19, 8, 7, '#b9343c'); E(13, 16, 3, 2, '#e8786a'); F(15, 8, 2, 5, '#5a3a20'); E(20, 10, 4, 2, '#4f8a2e'); }
  return EST_ICON[id] = c;
}
const _matCanvas = matCanvas;
matCanvas = id => (MATS[id] && MATS[id].icon ? estIcon(id) : _matCanvas(id));

// ---- props for the estate ----
Object.assign(NATIVE_PROPS, {
  herbbed: () => nativeProp(32, 22, ({ F }) => { F(1, 6, 30, 14, '#5a3a20'); F(2, 7, 28, 12, '#6e4a2a'); for (let x = 3; x < 30; x += 5) { F(x, 5, 2, 4, '#3f7a2a'); F(x + 1, 3, 2, 3, '#6aa33c'); F(x - 1, 4, 2, 2, '#4f8a2e'); if (x % 2) F(x + 1, 2, 1, 1, '#e7779b'); } F(1, 19, 30, 2, '#3a2410'); }),
  wheat: () => nativeProp(32, 30, ({ F }) => { for (let x = 1; x < 31; x += 3) { const h = 18 + (x * 7) % 6; F(x, 30 - h, 1, h - 4, '#a8862e'); F(x - 1, 30 - h - 3, 3, 5, '#e3c06a'); F(x, 30 - h - 3, 1, 3, '#f3d98a'); } F(0, 26, 32, 4, '#6e5a2a'); }),
  standingstone: () => nativeProp(32, 44, ({ F }) => { F(9, 6, 14, 37, '#7d786f'); F(9, 6, 4, 37, '#a39e94'); F(19, 6, 4, 37, '#5f5a52'); F(11, 3, 10, 4, '#8c867c'); for (let y = 12; y < 38; y += 8) F(13, y, 4, 2, '#9cc0f5'); F(7, 41, 18, 3, '#4f4a44'); }),
  mineshaft: () => nativeProp(32, 44, ({ F }) => { F(0, 10, 32, 34, '#6f6a62'); F(0, 10, 32, 3, '#a39e94'); F(6, 18, 20, 26, '#120c0e'); F(4, 14, 4, 30, '#6b4423'); F(24, 14, 4, 30, '#5a3a20'); F(3, 13, 26, 4, '#8a5a2b'); F(3, 13, 26, 1, '#b07a44'); F(9, 34, 14, 2, '#3a3f46'); F(9, 39, 14, 2, '#3a3f46'); F(11, 31, 10, 4, '#7a4a26'); }),
  scarecrow: () => nativeProp(32, 56, ({ F, E }) => { F(15, 14, 3, 42, '#6b4423'); F(4, 22, 25, 3, '#6b4423'); F(8, 20, 17, 18, '#8a5a7a'); F(8, 20, 17, 2, '#a87a98'); E(16, 12, 6, 6, '#d8b46a'); F(9, 5, 15, 3, '#5a3a20'); F(12, 1, 9, 5, '#5a3a20'); F(13, 11, 2, 2, '#1c1410'); F(18, 11, 2, 2, '#1c1410'); F(4, 25, 3, 4, '#d8b46a'); F(26, 25, 3, 4, '#d8b46a'); }),
  gate: () => nativeProp(32, 30, ({ F }) => { for (const x of [0, 29]) { F(x, 2, 3, 27, '#5a3a20'); F(x, 2, 1, 27, '#8a5a2b'); } for (const y of [8, 16, 23]) F(3, y, 26, 3, '#8a5a2b'); for (let k = 0; k < 20; k++) F(4 + k, 22 - k * 0.7, 2, 2, '#6b4423'); F(11, 12, 10, 6, '#e8dcc0'); F(12, 13, 8, 1, '#7d2027'); F(12, 15, 6, 1, '#7d2027'); }),
  stakes: () => nativeProp(32, 22, ({ F }) => { for (const x of [3, 26]) { F(x, 4, 3, 17, '#8a5a2b'); F(x, 4, 1, 17, '#b07a44'); } F(5, 9, 22, 1, '#e8dcc0'); F(14, 2, 4, 6, '#b9343c'); }),
});
TREE_KINDS.apple = { leaves: ['#2c5a22', '#3a6a2a', '#4a7c32', '#b9343c', '#5c903c', '#d84a3a'], bark: ['#4a3626', '#5e4430', '#73553c'], w: 72, h: 96, crown: [36, 46, 28, 26], trunk: 6 };
for (const k of ['gate', 'standingstone', 'mineshaft', 'scarecrow', 'apple']) DECOR_BLOCK[k] = 1;

// ---- the map ----
function buildHome() {
  const W = 64, H = 40;
  const m = blankMap('home', W, H, ',', { lit: true, name: 'Your Estate' });
  const D = (x, y, d) => { m.decor[K(x, y)] = d; };
  for (let x = 0; x < W; x++) { setTile(m, x, 0, 'T'); setTile(m, x, H - 1, 'T'); }
  for (let y = 0; y < H; y++) { setTile(m, 0, y, 'T'); setTile(m, W - 1, y, 'T'); }
  setTile(m, 0, HOME_ENTRY[1], 'X'); m.trig[K(0, HOME_ENTRY[1])] = { go: 'town', at: [93, 24] };
  // the farm track, from the town road to the yard, with spurs to each parcel's gate
  const track = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); if (tileAt(m, x, y) === ',') setTile(m, x, y, ';'); if (tileAt(m, x, y + 1) === ',' && k % 2) setTile(m, x, y + 1, ';'); } } };
  track([[1, 20], [8, 20], [14, 19], [18, 18], [24, 19], [30, 20], [37, 20]]);
  track([[18, 18], [20, 14], [20, 11]]); track([[20, 20], [20, 26], [20, 30]]); track([[24, 19], [29, 22], [32, 25]]);
  // the Bramble runs north to south through the riverside and the pasture, with shallows and a footbridge
  let sx = 50;
  for (let y = 1; y < H - 1; y++) { if (y % 4 === 0) sx = Math.max(46, Math.min(54, sx + (tileHash(y, 7) % 3) - 1)); for (const x of [sx, sx + 1]) setTile(m, x, y, y === 20 || y === 21 ? 'J' : '~'); if (tileHash(y, 3) % 3 === 0) setTile(m, sx - 1, y, 'z'); if (tileHash(y, 5) % 4 === 0) setTile(m, sx + 2, y, 'z'); }
  track([[38, 20], [sx - 1, 20]]); track([[sx + 2, 20], [56, 24]]);
  // a trout pond in the riverside
  for (let y = 12; y <= 17; y++) for (let x = 55; x <= 61; x++) if (Math.hypot((x - 58) / 3.4, (y - 14.5) / 2.6) < 1 && tileAt(m, x, y) === ',') setTile(m, x, y, '~');
  // the woodlot: old trees, clearings, timber to fell
  for (let y = 1; y <= 9; y++) for (let x = 1; x < W - 1; x++) if (tileAt(m, x, y) === ',' && (tileHash(x * 3, y * 7) % 100) < (y < 3 ? 70 : 38) && !(x > 16 && x < 24 && y > 4)) D(x, y, tileHash(x, y) % 3 ? 'oak' : 'pine');
  // the old chapel ruin, a well, the scarecrow, a rocky rise for the mine, wildflowers
  D(7, 15, 'ruin'); m.trig[K(7, 15)] = { site: 'chapel' };
  D(19, 22, 'well'); D(15, 25, 'scarecrow'); D(26, 23, 'bench');
  for (let i = 0; i < 70; i++) { const x = 2 + tileHash(i, 11) % 60, y = 11 + tileHash(i, 13) % 27; if (tileAt(m, x, y) === ',' && !m.decor[K(x, y)]) setTile(m, x, y, 'f'); }
  // boundaries: fences between the parcels, with gates
  for (let x = 1; x <= 37; x++) D(x, 10, 'rail'); for (let x = 38; x < W - 1; x++) if (tileAt(m, x, 10) === ',' || tileAt(m, x, 10) === 'f') D(x, 10, 'rail');
  for (let y = 11; y <= 30; y++) D(38, y, 'railv');
  for (let x = 1; x < W - 1; x++) if (['', ',', 'f', ';'].includes(tileAt(m, x, 31) || '')) D(x, 31, 'rail');
  for (const k in PARCELS) { const g = PARCELS[k].gate; if (g) { D(g[0], g[1], 'gate'); m.trig[K(g[0], g[1])] = { dlg: 'parcel', parcel: k }; } }
  // building plots, staked out
  for (const k in ESTATE_PLAN) { const P2 = ESTATE_PLAN[k]; const [x, y] = P2.bld ? [P2.bld[4], P2.bld[1] + P2.bld[3] - 1] : P2.site; if (k === 'chapel') continue; setTile(m, x, y, 'S'); m.trig[K(x, y)] = { site: k }; }
  return m;
}
// stamp what has been built (and the parcels bought) onto the map; safe to call again and again
function stampEstate() {
  const m = S.maps.home; if (!m || !S.home) return;
  S.home.parcels = S.home.parcels || {}; S.home.parcels.field = !!S.home.owned;
  // open the gates of land you own
  for (const k in PARCELS) { const g = PARCELS[k].gate; if (g && S.home.parcels[k] && m.decor[K(g[0], g[1])] === 'gate') { delete m.decor[K(g[0], g[1])]; delete m.trig[K(g[0], g[1])]; setTile(m, g[0], g[1], ';'); } }
  for (const k in ESTATE_PLAN) {
    if (!S.home.built[k]) continue;
    const P2 = ESTATE_PLAN[k], lv = lv2(k);
    if (P2.bld) {
      const [x0, y0, w, h, door] = P2.bld;
      let lm = (m.landmarks || []).find(l => l.estate === k);
      if (!lm) { if (k === 'chapel') { delete m.decor[K(7, 15)]; delete m.trig[K(7, 15)]; } building(m, x0, y0, w, h, P2.roof, P2.wall, door, { site: k, kind: P2.kind }, P2.orient); lm = m.landmarks[m.landmarks.length - 1]; lm.estate = k; }
      lm.spec.kind = k === 'house' && lv ? 'home' : P2.kind; if (k === 'house' && lv) { lm.spec.orient = undefined; lm.spec.roof = 'r'; lm.spec.wall = 'W'; }
      for (const [px, py, d] of P2.props || []) m.decor[K(px, py)] = d;
    } else if (P2.area) {
      const [ax0, ay0, ax1, ay1] = P2.area;
      for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) { if (tileAt(m, x, y) === 'S' || m.trig[K(x, y)]) continue; if (P2.tree) { if ((x + y) % 2 === 0 && (x - ax0) % 2 === 0) m.decor[K(x, y)] = 'apple'; } else { setTile(m, x, y, ';'); if (y % 2 === ay0 % 2) m.decor[K(x, y)] = P2.prop; } }
    } else if (P2.pen) {
      const [px0, py0, px1, py1] = P2.pen;
      for (let x = px0; x <= px1; x++) { m.decor[K(x, py0)] = 'rail'; if (x !== P2.site[0]) m.decor[K(x, py1)] = 'rail'; }
      for (let y = py0 + 1; y < py1; y++) { m.decor[K(px0, y)] = 'railv'; m.decor[K(px1, y)] = 'railv'; }
      m.decor[K(px0 + 1, py0 + 1)] = 'trough'; m.decor[K(px1 - 1, py0 + 1)] = 'hay';
    } else if (P2.ring) {
      for (const [dx, dy] of [[-2, -1], [2, -1], [-2, 1], [2, 1], [0, -2]]) m.decor[K(P2.site[0] + dx, P2.site[1] + dy)] = 'standingstone';
    }
  }
  syncAnimals(m);
}
// the animals you own wander the pen
function syncAnimals(m) {
  const pen = ESTATE_PLAN.pen.pen, A = S.home.animals || {};
  m.npcs = (m.npcs || []).filter(n => !n.estateAnimal);
  if (!S.home.built.pen) return;
  let i = 0;
  for (const k in ANIMALS) for (let n = 0; n < (A[k] || 0); n++) {
    const x = pen[0] + 1 + (i * 3) % (pen[2] - pen[0] - 1), y = pen[1] + 1 + Math.floor(i * 3 / (pen[2] - pen[0] - 1)) % (pen[3] - pen[1] - 1); i++;
    m.npcs.push({ prop: k === 'chicken' ? 'chicken' : k, x, y, name: 'your ' + ANIMALS[k].name.toLowerCase(), animal: 1, estateAnimal: 1, lines: [k === 'cow' ? 'The cow chews contentedly.' : k === 'sheep' ? 'Baa.' : 'Bawk.'] });
  }
}
function seedHomeNodes() {
  const m = S.maps.home; const nodes = {};
  const place = (t, n, x0, y0, x1, y1) => { for (let i = 0, tries = 0; i < n && tries < 600; tries++) { const x = roll(x0, x1), y = roll(y0, y1); if (!['', ','].includes(tileAt(m, x, y)) || m.decor[K(x, y)] || m.trig[K(x, y)] || nodes[K(x, y)]) continue; nodes[K(x, y)] = { t, ready: 0 }; i++; } };
  place('tree', 14, 26, 11, 36, 17); place('tree', 26, 2, 2, 60, 8);
  place('rock', 10, 28, 24, 36, 29); place('rock', 6, 52, 32, 61, 37);
  place('herb', 8, 4, 22, 14, 29); place('herb', 8, 18, 3, 26, 8);
  S.home.nodes = nodes;
}
// the parcels and plots are only workable once you own them
const parcelOf = (x, y) => Object.keys(PARCELS).find(k => { const p = PARCELS[k]; return x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1; });

// ---- daily yields ----
function estateDay() {
  const h = S.home; if (!h || !h.owned) return;
  h.produce = h.produce || {}; h.workers = h.workers || {}; h.animals = h.animals || {};
  const add = (k, n) => { if (n > 0) h.produce[k] = (h.produce[k] || 0) + n; };
  const blessed = h.blessDay === S.day - 1 || (lv2('chapel') && h.blessDay === S.day - 1);
  const boost = blessed ? 1.25 : 1;
  // animals
  for (const k in ANIMALS) { const A = ANIMALS[k], n = h.animals[k] || 0; if (!n || S.day % A.every) continue; add(A.yields, Math.round(n * roll(A.n[0], A.n[1]) * (lv2('pen') ? 1.5 : 1))); }
  // crops ripen whether or not anyone picks them
  if (h.built.fields) add('wheat', Math.round((lv2('fields') ? 6 : 3) * boost));
  if (h.built.orchard) add('apple', Math.round((lv2('orchard') ? 6 : 3) * boost));
  // hired hands: paid each morning, they work if they're paid
  const p = P(); let wages = 0, lines = [];
  for (const k in h.workers) {
    if (!h.workers[k]) continue; const Wk = WORKERS[k];
    if (p.gold < Wk.wage) { lines.push(`your ${Wk.name.toLowerCase()} went unpaid and idle`); continue; }
    p.gold -= Wk.wage; wages += Wk.wage;
    if (k === 'farmhand') { for (const [m, n] of Object.entries(h.produce)) { h.mats[m] = (h.mats[m] || 0) + n; } const got = Object.entries(h.produce).filter(([, n]) => n).map(([m, n]) => `${n} ${MATS[m].name.toLowerCase()}`); h.produce = {}; if (h.built.garden && h.gardenDay <= S.day) { const hr = roll(2, 3); h.mats.healroot = (h.mats.healroot || 0) + hr; h.gardenDay = S.day + 1; got.push(`${hr} healroot`); } if (got.length) lines.push(`the farmhand stored ${got.join(', ')}`); }
    if (k === 'woodcutter' && h.parcels && h.parcels.woodlot) { const n = Math.round(6 * boost); h.mats.wood = (h.mats.wood || 0) + n; lines.push(`the woodcutter stacked ${n} wood`); }
    if (k === 'miner' && h.built.mine) { const n = Math.round(3 * boost); h.mats.iron = (h.mats.iron || 0) + n; let s2 = ''; if (chance(0.3)) { h.mats.silver = (h.mats.silver || 0) + 1; s2 = ' and a little silver'; } lines.push(`the miner brought up ${n} iron ore${s2}`); }
  }
  if (lines.length) msg(`Your estate: ${lines.join('; ')}${wages ? ` (${wages} gold in wages)` : ''}.`, 'gold');
}
const _newDay = newDay;
newDay = function (reason) { _newDay(reason); estateDay(); };

// ---- building, gated by the land you own ----
const _build = build;
build = function (site) {
  const need = STRUCTURES[site].needs;
  if (need && !(S.home.parcels || {})[need]) { msg(`You need to own ${PARCELS[need].name} to build that.`, 'warn'); return; }
  _build(site); stampEstate(); render();
};
const _upgrade = upgrade;
upgrade = function (site) { _upgrade(site); stampEstate(); render(); };
const _openSite = openSite;
openSite = function (site) {
  const P2 = ESTATE_PLAN[site], h = S.home;
  const need = STRUCTURES[site] && STRUCTURES[site].needs;
  if (need && !(h.parcels || {})[need]) { msg(`That plot lies on ${PARCELS[need].name}, which you don't own yet. The Land Registry in the Town Hall sells it for ${PARCELS[need].price} gold.`, 'talk'); return; }
  if (!h.built[site] || !['chapel', 'barn', 'pen', 'fields', 'orchard', 'cottage'].includes(site)) return _openSite(site);
  h.produce = h.produce || {}; h.workers = h.workers || {}; h.animals = h.animals || {};
  const p = P(), S2 = STRUCTURES[site];
  const collect = (keys) => { const got = keys.filter(k => h.produce[k]).map(k => { const n = h.produce[k]; h.mats[k] = (h.mats[k] || 0) + n; delete h.produce[k]; return `${n} ${MATS[k].name.toLowerCase()}`; }); return got; };
  if (site === 'fields' || site === 'orchard') { const got = collect([site === 'fields' ? 'wheat' : 'apple']); playAnim(p, 'work', { x: p.x + 1, y: p.y }); useSkill('survival', 2); msg(got.length ? `You gather ${got.join(', ')} into your stores.` : 'Nothing is ripe yet. Come back tomorrow.', got.length ? 'good' : ''); render(); return; }
  if (site === 'chapel') { if (h.blessDay === S.day) { msg('You have already prayed here today. The chapel is quiet and warm.', 'talk'); return; } h.blessDay = S.day; playAnim(p, 'pray'); useSkill('faith', 5); msg('You kneel in the little chapel and ask Aurel to bless the work of your hands. Tomorrow your land will yield a quarter more.', 'good'); return; }
  if (site === 'pen') {
    const cap = (h.built.barn ? (lv2('barn') ? 16 : 8) : 4), have = Object.values(h.animals).reduce((a, b) => a + b, 0);
    const got = collect(['egg', 'milk', 'wool']);
    openModal(S2.name, `<p class="lead">${have} of ${cap} animals. ${got.length ? `You gather ${got.join(', ')}.` : 'Nothing to gather just now.'}</p>
      ${Object.entries(ANIMALS).map(([k, A]) => `<div class="row"><div class="nm"><b>${A.name} ×${h.animals[k] || 0}</b><small>Gives ${MATS[A.yields].name.toLowerCase()}${A.every > 1 ? ' every other day' : ' every day'}.${A.barn && !h.built.barn ? ' Needs a barn.' : ''}</small></div></div>`).join('')}
      <p class="hint">Buy animals from the auctioneer at the stock ring in town.</p>`); render(); return;
  }
  if (site === 'barn') { openModal(S2.name, `<p class="lead">Hay to the rafters. ${lv2('barn') ? 'Room for sixteen animals.' : 'Room for eight animals in the pen.'}</p><p>Your stores: ${Object.entries(h.mats).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${MATS[k].name.toLowerCase()}`).join(', ') || 'nothing yet'}.</p>`); return; }
  if (site === 'cottage') {
    const slots = lv2('cottage') ? 3 : 2, hired = Object.keys(h.workers).filter(k => h.workers[k]).length;
    openModal(S2.name, `<p class="lead">${hired} of ${slots} hands hired. Wages are paid each morning from your purse.</p>
      ${Object.entries(WORKERS).map(([k, Wk]) => { const ok = !Wk.needs || (Wk.needs === 'woodlot' ? (h.parcels || {}).woodlot : h.built[Wk.needs]); return `<div class="row"><div class="nm"><b>${Wk.name}</b><small>${Wk.desc} ${Wk.wage} gold a day.${ok ? '' : ` Needs ${Wk.needs === 'woodlot' ? 'the Woodlot' : 'a mine shaft'}.`}</small></div><div class="acts">${h.workers[k] ? `<button class="btn tiny" data-a="fire" data-v="${k}">Let go</button>` : `<button class="btn tiny default" data-a="hire" data-v="${k}" ${!ok || hired >= slots ? 'disabled' : ''}>Hire</button>`}</div></div>`; }).join('')}`, { refresh: () => openSite('cottage') });
    return;
  }
};
// the parcels' gates, the Land Registry, the auction ring
const _doTrigger = doTrigger;
doTrigger = function (tr) {
  if (tr && tr.dlg === 'parcel') { const P2 = PARCELS[tr.parcel]; msg(`A gate with a sign: “${P2.name}. For sale, ${P2.price} gold. Inquire at the Land Registry.” ${P2.desc}`, 'talk'); return; }
  if (tr && tr.go === 'home' && S.home.owned) { msg('You walk out to your estate.'); stampEstate(); goMap('home', HOME_ENTRY[0], HOME_ENTRY[1]); return; }
  return _doTrigger(tr);
};
const _openLand = openLand;
openLand = function () {
  _openLand();
  if (!S.home.owned) return;
  const p = P(), own = S.home.parcels || {};
  const html = `<h3>Grow your estate</h3>${Object.entries(PARCELS).filter(([k]) => k !== 'field').map(([k, P2]) => `<div class="row"><div class="nm"><b>${P2.name}</b><small>${P2.desc}</small></div><div class="acts">${own[k] ? '<span class="pill">Yours</span>' : `<button class="btn tiny default" data-a="buyparcel" data-v="${k}" ${p.gold < P2.price ? 'disabled' : ''}>Buy (${P2.price}g)</button>`}</div></div>`).join('')}`;
  const body = $('#modal-body'); if (body) body.insertAdjacentHTML('beforeend', html);
};
function openAuction() {
  const h = S.home, p = P(); h.animals = h.animals || {};
  const cap = h.built.pen ? (h.built.barn ? (lv2('barn') ? 16 : 8) : 4) : 0, have = Object.values(h.animals).reduce((a, b) => a + b, 0);
  openModal('The Stock Auction', `<p class="lead">“Fine beasts for a fine estate! Bid with a nod, friend.”</p>
    ${cap ? `<p class="dim">Your pen holds ${have} of ${cap}.</p>` : '<p class="dim">You have nowhere to keep animals. Build an animal pen on the South Pasture first.</p>'}
    ${Object.entries(ANIMALS).map(([k, A]) => { const ok = cap && have < cap && p.gold >= A.price && (!A.barn || h.built.barn); return `<div class="row"><div class="nm"><b>${A.name}</b><small>Gives ${MATS[A.yields].name.toLowerCase()}.${A.barn ? ' Needs a barn.' : ''}</small></div><div class="acts"><button class="btn tiny default" data-a="buyanimal" data-v="${k}" ${ok ? '' : 'disabled'}>Buy (${A.price}g)</button></div></div>`; }).join('')}`, { refresh: openAuction });
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled || !S) return;
  const a = el.dataset.a, v = el.dataset.v, p = P(), h = S.home;
  if (a === 'buyland') setTimeout(stampEstate, 0);
  else if (a === 'buyparcel') { const P2 = PARCELS[v]; if (p.gold < P2.price) return; p.gold -= P2.price; h.parcels = h.parcels || {}; h.parcels[v] = true; stampEstate(); msg(`You sign the deed. ${P2.name} is yours!`, 'level'); closeModal(); openLand(); autosave(); }
  else if (a === 'buyanimal') { const A = ANIMALS[v]; if (p.gold < A.price) return; p.gold -= A.price; h.animals = h.animals || {}; h.animals[v] = (h.animals[v] || 0) + 1; stampEstate(); msg(`You buy a ${A.name.toLowerCase()}. It will be waiting in your pen.`, 'gold'); openAuction(); autosave(); }
  else if (a === 'hire') { h.workers = h.workers || {}; h.workers[v] = true; msg(`You hire a ${WORKERS[v].name.toLowerCase()}. They start in the morning.`, 'good'); openSite('cottage'); autosave(); }
  else if (a === 'fire') { h.workers[v] = false; msg(`You let your ${WORKERS[v].name.toLowerCase()} go, with a day's wage for the road.`); openSite('cottage'); autosave(); }
});
