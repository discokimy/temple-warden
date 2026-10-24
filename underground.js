// The Temple Warden — life under the hill. The caves aren't empty rock: glowcaps light the dark in blue clusters
// along the walls, inkcaps and truffles grow in the damp, moss cushions the stones and lichen crusts them; there are
// crystals, nitre, amber and rock salt to prise loose, and still black pools where blind fish, crayfish and glowing
// lanternfish live. Bump a clump to gather it; plants grow back in a few days. The streams and ponds up top have more
// fish too.
'use strict';

// ---------------- what you can gather ----------------
const FORAGE = {
  glowcap:   { name: 'Glowcap',         cat: 'herb',    val: 12, wt: 0.1, grows: 1, light: 1, say: 'You pick a cluster of glowcaps. They keep shining in your hand, cold and blue.' },
  inkcap:    { name: 'Inkcap',          cat: 'herb',    val: 6,  wt: 0.1, grows: 1, say: 'You cut the shaggy inkcaps before they melt into ink.' },
  truffle:   { name: 'Cave Truffle',    cat: 'food',    val: 30, wt: 0.3, grows: 1, say: 'You dig a black truffle out of the damp earth among the roots. It smells wonderful.' },
  stonemoss: { name: 'Stone Moss',      cat: 'herb',    val: 3,  wt: 0.1, grows: 1, say: 'You peel a cushion of moss off the stone. It is cold and wet and very green.' },
  lichen:    { name: 'Ember Lichen',    cat: 'herb',    val: 5,  wt: 0.1, grows: 1, say: 'You scrape the orange lichen from the rock into a fold of cloth.' },
  cavelily:  { name: 'Cave Lily',       cat: 'herb',    val: 18, wt: 0.1, grows: 1, say: 'You pick a pale cave lily from the pool\'s edge. It smells faintly of rain.' },
  rootvine:  { name: 'Hanging Root',    cat: 'herb',    val: 4,  wt: 0.3, grows: 1, say: 'You cut a length of the roots that hang down through the cave roof from the world above.' },
  quartz:    { name: 'Quartz',          cat: 'crystal', val: 15, wt: 0.3, say: 'You knock a clear quartz point loose from the cluster.' },
  nitre:     { name: 'Nitre',           cat: 'stone',   val: 6,  wt: 0.5, say: 'You scrape the white nitre crust from the wall. The goblins use it in their powders.' },
  amber:     { name: 'Amber',           cat: 'crystal', val: 35, wt: 0.2, say: 'You prise a nodule of amber from the rock. Something small and winged is caught inside.' },
  rocksalt:  { name: 'Rock Salt',       cat: 'stone',   val: 4,  wt: 0.5, say: 'You break off a block of pink rock salt.' },
};
// ---------------- fish ----------------
const NEW_FISH = {
  roach:      { name: 'Red-finned Roach', pal: { b: 'a8b0b8', c: 'e8ecf0' }, val: 4, bite: 1000 },
  tench:      { name: 'Green Tench',      pal: { b: '5a6a32', c: 'c8b870' }, val: 9, bite: 900 },
  bream:      { name: 'Bronze Bream',     pal: { b: 'a8863a', c: 'e0cc90' }, val: 8, bite: 950 },
  grayling:   { name: 'Grayling',         pal: { b: '7a7a90', c: 'd8d4e8' }, val: 12, bite: 760 },
  char:       { name: 'Red-bellied Char', pal: { b: '4a5a6a', c: 'd8643a' }, val: 18, bite: 700 },
  salmon:     { name: 'Silver Salmon',    pal: { b: '8a9aa8', c: 'f0b8a0' }, val: 34, bite: 560 },
  blindfish:  { name: 'Blind Cavefish',   pal: { b: 'e8c8c0', c: 'fff0ea' }, val: 14, bite: 900 },
  lanternfish:{ name: 'Lanternfish',      pal: { b: '23305e', c: '7fe6d0' }, val: 26, bite: 640 },
  crayfish:   { name: 'Cave Crayfish',    pal: { b: '8a3a2a', c: 'd8845a' }, val: 11, bite: 820, crab: 1 },
  ghostcat:   { name: 'Ghost Catfish',    pal: { b: 'd8dce8', c: 'f8faff' }, val: 60, bite: 480 },
};
for (const id in NEW_FISH) { const f = NEW_FISH[id]; MATS[id] = { name: f.name, spr: 'fish', pal: f.pal, cat: 'food', val: f.val, wt: 1 }; BITE_WINDOW[id] = f.bite; }
MATS.cavepearl = { name: 'Cave Pearl', spr: 'crystal', pal: { 1: 'eae6f0', 2: 'b8b0c8', 3: 'ffffff' }, cat: 'crystal', val: 55, wt: 0.05 };
BITE_WINDOW.cavepearl = 700;
FISH_TABLES.pond = [['trout', 34], ['perch', 30], ['roach', 26], ['tench', 14], ['bream', 12], ['goldcarp', 4]];
FISH_TABLES.stream = [['trout', 30], ['pike', 28], ['grayling', 18], ['char', 14], ['perch', 8], ['salmon', 5], ['goldcarp', 3]];
FISH_TABLES.under = [['caveeel', 28], ['blindfish', 32], ['lanternfish', 14], ['crayfish', 16], ['ghostcat', 4], ['cavepearl', 4], ['goldcarp', 2]];
for (const id in FORAGE) { const f = FORAGE[id]; MATS[id] = { name: f.name, spr: 'mushroom', cat: f.cat, val: f.val, wt: f.wt, forage: 1 }; }
// the gods like these too
if (typeof OFFER_LIKES !== 'undefined') {
  OFFER_LIKES.nemora.push('blindfish', 'lanternfish', 'ghostcat', 'cavelily', 'cavepearl', 'roach', 'tench', 'bream', 'grayling', 'char', 'salmon');
  OFFER_LIKES.korrum.push('quartz', 'amber', 'nitre', 'rocksalt');
  OFFER_LIKES.veyra.push('truffle', 'rootvine');
  OFFER_LIKES.ssathal.push('inkcap', 'glowcap');
  OFFER_LIKES.gharrok.push('nitre');
  OFFER_LIKES.aurel.push('salmon');
}

// ---------------- how they look, growing in the cave ----------------
Object.assign(NATIVE_PROPS, {
  f_glowcap: () => nativeProp(32, 24, ({ F, P, E }) => {
    for (const [x, h, r] of [[9, 10, 4], [16, 14, 5.5], [23, 8, 3.5], [13, 6, 2.5], [20, 5, 2]]) {
      F(x - 1, 22 - h, 2, h, '#d8e8e4'); F(x - 1, 22 - h, 1, h, '#f4fffc');
      E(x, 22 - h, r, r * 0.6, '#2a7a9a'); E(x, 22 - h - 1, r - 0.6, r * 0.45, '#4ac0e0'); E(x - 1, 22 - h - 1.5, r * 0.4, r * 0.22, '#c8f4ff');
      P(x - 2, 22 - h, '#a8f0ff'); P(x + 1, 22 - h - 1, '#a8f0ff');
    }
    F(4, 21, 24, 2, '#3a4a40');
  }),
  f_inkcap: () => nativeProp(32, 28, ({ F, P, E }) => {
    for (const [x, h] of [[11, 18], [18, 22], [24, 14]]) {
      F(x - 1, 27 - h + 6, 2, h - 6, '#e8e4dc');
      for (let y = 0; y < 9; y++) { const w = 2 + y * 0.45; F(x - w, 27 - h + y, w * 2, 1, y < 2 ? '#e8e4dc' : y > 6 ? '#3a3236' : '#c8c0b4'); }
      for (let k = -2; k <= 2; k += 2) P(x + k, 27 - h + 9, '#1a1418');
      P(x - 2, 27 - h + 10, '#1a1418');
    }
    F(6, 26, 22, 2, '#3a3028');
  }),
  f_truffle: () => nativeProp(32, 22, ({ F, E, P }) => {
    E(16, 17, 13, 4, '#4a3a2a'); E(16, 16, 12, 3, '#5e4a36');
    for (const [x, y, r] of [[11, 14, 3.5], [18, 15, 4], [23, 16, 2.5]]) { E(x, y, r, r * 0.8, '#2a1e1a'); P(x - 1, y - 1, '#5a4a40'); }
    for (let k = 0; k < 4; k++) F(4 + k * 6, 6 + (k % 2) * 3, 1, 9, '#6b4a2a');
  }),
  f_stonemoss: () => nativeProp(32, 22, ({ E, P }) => {
    E(16, 16, 13, 6, '#6f6a62'); E(14, 14, 11, 5, '#857f75');
    for (const [x, y, r] of [[9, 12, 5], [17, 10, 6], [24, 13, 4.5], [13, 15, 4]]) { E(x, y, r, r * 0.7, '#3f6a2a'); E(x - 1, y - 1, r * 0.75, r * 0.5, '#5a8a36'); E(x - 2, y - 2, r * 0.35, r * 0.25, '#86b85a'); }
    for (let i = 0; i < 10; i++) P(6 + (i * 5) % 20, 9 + (i * 3) % 7, '#9ccc6a');
  }),
  f_lichen: () => nativeProp(32, 22, ({ E, P }) => {
    E(16, 15, 13, 7, '#6f6a62'); E(14, 13, 11, 6, '#8a847a'); E(12, 11, 6, 3, '#a39d92');
    for (let i = 0; i < 26; i++) { const x = 6 + (i * 7) % 20, y = 9 + (i * 5) % 10; P(x, y, i % 3 ? '#e08a2a' : '#f2c04a'); if (i % 2) P(x + 1, y, '#c86a1a'); }
  }),
  f_cavelily: () => nativeProp(32, 30, ({ F, P, E }) => {
    for (const [x0, y0, x1, y1] of [[16, 29, 8, 12], [16, 29, 24, 10], [16, 29, 12, 6], [16, 29, 21, 4]]) for (let k = 0; k <= 1; k += 0.08) F(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2, 1, '#3f6a4a');
    for (const [x, y] of [[12, 6], [21, 4], [8, 12]]) { E(x, y, 3, 2.5, '#f4f0f8'); E(x, y + 1, 1.5, 1, '#d8c8f0'); P(x, y - 1, '#ffffff'); P(x, y + 1, '#f2d27a'); }
  }),
  f_rootvine: () => nativeProp(32, 44, ({ F, P }) => {
    for (const [x, len, sway] of [[7, 30, 2], [12, 38, -2], [17, 26, 1], [22, 34, 3], [26, 22, -1]]) for (let y = 0; y < len; y++) { const xx = x + Math.round(Math.sin(y / 7) * sway); P(xx, y, y % 5 ? '#7a5a3a' : '#5e4430'); if (y % 9 === 4) P(xx + 1, y, '#8a6a4a'); if (y === len - 1) P(xx, y + 1, '#c8b08a'); }
    F(2, 0, 28, 2, '#3a2a20');
  }),
  f_quartz: () => nativeProp(32, 30, ({ F, P }) => {
    F(5, 26, 22, 3, '#4f4a44');
    for (const [x, h, w, lean] of [[12, 20, 5, -2], [17, 26, 6, 0], [22, 16, 4, 2], [8, 12, 3, -3], [26, 10, 3, 3]]) for (let y = 0; y < h; y++) {
      const ww = y < 4 ? Math.max(1, Math.round(w * y / 4)) : w, xx = x + Math.round(lean * y / h) - Math.floor(ww / 2);
      F(xx, 27 - h + y, ww, 1, '#d8e8f0'); P(xx, 27 - h + y, '#ffffff'); P(xx + ww - 1, 27 - h + y, '#9ab0c0');
    }
  }),
  f_nitre: () => nativeProp(32, 24, ({ E, P }) => {
    E(16, 16, 13, 7, '#5f5a52'); E(15, 14, 11, 6, '#7a746a');
    for (let i = 0; i < 40; i++) { const x = 6 + (i * 7) % 20, y = 9 + (i * 5) % 11; P(x, y, i % 3 ? '#f4f2ea' : '#dcd8cc'); }
  }),
  f_amber: () => nativeProp(32, 24, ({ E, P }) => {
    E(16, 16, 13, 7, '#5f5a52'); E(15, 14, 11, 6, '#7a746a');
    E(18, 13, 4, 3, '#c8781a'); E(17, 12, 2.5, 2, '#f2a83a'); P(16, 11, '#ffe0a0'); P(19, 13, '#5a3a14');
    E(10, 16, 2, 1.5, '#c8781a'); P(10, 15, '#f2c06a');
  }),
  f_rocksalt: () => nativeProp(32, 26, ({ F, P }) => {
    for (const [x, y, w, h] of [[6, 12, 9, 12], [14, 8, 10, 16], [22, 14, 6, 10]]) { F(x, y, w, h, '#e8c8c8'); F(x, y, w, 2, '#fff0f0'); F(x + w - 2, y, 2, h, '#c8a0a0'); P(x + 2, y + 4, '#f8e0e0'); }
  }),
});
for (const id in FORAGE) DECOR_BLOCK['f_' + id] = 1;
// inventory icons: the clump itself, fitted to the slot (fish keep the game's fish icon; the crayfish gets its own)
{
  const ICON_CACHE = {};
  const fit = (src) => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const k = Math.min(30 / src.width, 30 / src.height); g.drawImage(src, (32 - src.width * k) / 2, (32 - src.height * k) / 2, src.width * k, src.height * k); return c; };
  const crayfish = () => nativeProp(32, 32, ({ F, P, E }) => {
    E(16, 18, 4, 9, '#8a3a2a'); for (let y = 11; y < 27; y += 3) F(12, y, 8, 1, '#6a2a1e'); E(15, 16, 1.5, 6, '#b85a3a');
    for (const s of [-1, 1]) { for (let k = 0; k < 7; k++) P(16 + s * (3 + k * 0.6), 10 - k, '#8a3a2a'); E(16 + s * 8, 3, 3, 2.5, '#a8442e'); P(16 + s * 9, 2, '#d8845a'); for (let k = 0; k < 3; k++) F(16 + s * (4 + k * 2), 15 + k * 3, s * 3, 1, '#6a2a1e'); }
    F(14, 27, 4, 3, '#a8442e'); F(12, 30, 8, 1, '#8a3a2a'); P(14, 9, '#1a1010'); P(17, 9, '#1a1010');
  });
  const _mc = matCanvas;
  matCanvas = id => {
    if (ICON_CACHE[id]) return ICON_CACHE[id];
    if (FORAGE[id]) return ICON_CACHE[id] = fit(nativePropCanvas('f_' + id));
    if (id === 'crayfish') return ICON_CACHE[id] = fit(crayfish());
    return _mc(id);
  };
}

// ---------------- dressing the caves ----------------
// which things grow where: the upper caves, each kingdom and the deep each have their own
const CAVE_FORAGE = {
  upper: [['glowcap', 4], ['stonemoss', 4], ['lichen', 3], ['inkcap', 3], ['rootvine', 2], ['truffle', 1], ['quartz', 1], ['amber', 1]],
  g: [['nitre', 4], ['lichen', 3], ['glowcap', 2], ['inkcap', 2], ['quartz', 1]],
  r: [['inkcap', 4], ['truffle', 2], ['stonemoss', 3], ['glowcap', 2], ['rootvine', 2]],
  h: [['glowcap', 5], ['stonemoss', 4], ['cavelily', 3], ['quartz', 2]],
  s: [['rocksalt', 4], ['lichen', 2], ['glowcap', 2], ['amber', 2]],
  deep: [['glowcap', 4], ['quartz', 3], ['nitre', 2], ['amber', 2]],
};
function dressCave(m) {
  if (!m || m.lit || m.outdoor || !m.rooms || m.theme === 'house') return;
  const p = P(), day = S.day;
  // plants regrow after a few days; stone doesn't
  if (m.picked) for (const k in m.picked) { const pk = m.picked[k]; if (FORAGE[pk.id].grows && day - pk.day >= 3 && !m.decor[k] && !m.mons.some(o => K(o.x, o.y) === k) && !(p.x + ',' + p.y === k)) { placeForage(m, ...k.split(',').map(Number), pk.id); delete m.picked[k]; } }
  if (m.dressedU) return;
  m.dressedU = 1;
  let seed = (m.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) || 1;
  const R = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const free = (x, y) => tileAt(m, x, y) === '.' && !m.decor[K(x, y)] && !m.trig[K(x, y)] && !m.links[K(x, y)] && !m.ground.some(g => g.x === x && g.y === y) && !m.mons.some(o => o.x === x && o.y === y) && !(x === p.x && y === p.y);
  const rooms = m.rooms.map(r => ({ ...r, cx: r.x + (r.w >> 1), cy: r.y + (r.h >> 1) }));
  const offLine = (r, x, y) => x !== r.cx && y !== r.cy; // the corridors run along each room's middle row and column
  // still pools in room corners (the Hollows already have theirs)
  if (m.kind !== 'h') for (const r of rooms.slice(1)) {
    if (r.w < 6 || r.h < 5 || R() > 0.4) continue;
    const pw = r.w >= 8 && R() < 0.5 ? 3 : 2, right = R() < 0.5, bottom = R() < 0.5;
    const px = right ? r.x + r.w - pw : r.x, py = bottom ? r.y + r.h - 2 : r.y;
    const cells = []; for (let y = py; y < py + 2; y++) for (let x = px; x < px + pw; x++) cells.push([x, y]);
    if (!cells.every(([x, y]) => free(x, y) && offLine(r, x, y) && Math.abs(x - r.cx) > 1 && Math.abs(y - r.cy) > 1)) continue;
    for (const [x, y] of cells) setTile(m, x, y, '~');
  }
  // lilies on the pool edges, where the pools are
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    if (!free(x, y) || R() > 0.18) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(m, x + a, y + b) === '~')) continue;
    const r = rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); if (!r || !offLine(r, x, y)) continue;
    placeForage(m, x, y, m.kind === 'h' || R() < 0.6 ? 'cavelily' : 'stonemoss');
  }
  // growths along the walls of the rooms
  const table = CAVE_FORAGE[m.kind] || CAVE_FORAGE.upper, tot = table.reduce((a, [, w]) => a + w, 0);
  const want = 7 + Math.floor(R() * 5);
  for (let t = 0, n = 0; t < 600 && n < want; t++) {
    const r = rooms[Math.floor(R() * rooms.length)], x = r.x + Math.floor(R() * r.w), y = r.y + Math.floor(R() * r.h);
    if (!free(x, y) || !offLine(r, x, y)) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => '#V'.includes(tileAt(m, x + a, y + b)))) continue;
    let q = R() * tot, id = table[0][0]; for (const [k, w] of table) if ((q -= w) < 0) { id = k; break; }
    placeForage(m, x, y, id); n++;
  }
  setLit(m, null);
}
function placeForage(m, x, y, id) {
  m.decor[K(x, y)] = 'f_' + id; m.trig[K(x, y)] = { forage: id };
  if (FORAGE[id].light && !m.lights.some(l => l[0] === x && l[1] === y)) m.lights.push([x, y, 2, 'glow']);
  setLit(m, null);
}
function gatherForage(tr) {
  const p = P(), m = curMap(), id = tr.forage, f = FORAGE[id];
  const k = Object.keys(m.trig).find(key => m.trig[key] === tr); if (!k) return;
  const [x, y] = k.split(',').map(Number);
  const n = 1 + (Math.random() < 0.35 ? 1 : 0) + (typeof rank === 'function' && rank('forager') ? 1 : 0);
  addMat(id, n);
  delete m.decor[k]; delete m.trig[k];
  if (f.light) { m.lights = m.lights.filter(l => !(l[0] === x && l[1] === y && l[3] === 'glow')); setLit(m, null); }
  (m.picked = m.picked || {})[k] = { id, day: S.day };
  playAnim(p, 'work', { x, y });
  useSkill('survival', f.grows ? 2 : 3);
  msg(`${f.say} (${MATS[id].name} ×${n})`, 'good');
  endTurn(); refresh();
}
{
  const _doTrigger = doTrigger;
  doTrigger = function (tr) { if (tr && tr.forage) return gatherForage(tr); return _doTrigger(tr); };
  const _goMap = goMap;
  goMap = function (id, x, y) { const r = _goMap(id, x, y); try { dressCave(curMap()); } catch (e) { console.error(e); } return r; };
}
// a save already standing in a cave
setInterval(() => { if (S && S.maps && !dead) { const m = curMap(); if (m && !m.dressedU && m.rooms && !m.lit) { dressCave(m); render(); } } }, 1000);
// the pearl from a mussel bed: say so properly
{
  const _reel = reel;
  reel = function () { const f = fishing; const was = f && f.st === 'bite' && f.fish === 'cavepearl'; _reel(); if (was) msg('You haul up a cluster of black mussels, and inside one, a cave pearl.', 'level'); };
}

// Plants and crystals lying about (redcaps, healroot, moonpetal, shards, ore) are gathered just by walking over
// them, like the growths on the walls. Weapons, armour, coin and other loot still wait for G.
const WALK_GATHER_CATS = new Set(['herb', 'crystal', 'ore', 'stone', 'wood']);
{
  const _sm = startMove;
  startMove = function (obj, fx, fy) {
    const r = _sm(obj, fx, fy);
    if (S && obj === S.player) {
      const m = curMap(), here = m.ground.filter(g => g.x === obj.x && g.y === obj.y && g.mat && MATS[g.mat] && WALK_GATHER_CATS.has(MATS[g.mat].cat));
      for (const g of here) {
        m.ground.splice(m.ground.indexOf(g), 1); addMat(g.mat, g.q || 1);
        useSkill('survival', 1);
        msg(`You gather ${MATS[g.mat].name}${(g.q || 1) > 1 ? ' ×' + g.q : ''}.`, 'good');
        if (typeof sfx === 'function') sfx('gather');
      }
      if (here.length) refresh();
    }
    return r;
  };
}
