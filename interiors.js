// The Temple Warden — every door opens. One generator furnishes the inside of each building in town by what it is:
// cottages get beds, a hearth, a table and the family's things; shops a counter with their wares about the room
// (walk up to the counter to trade); the inn its tables and taproom; the town hall its clerks' desk and the board.
// When rain or a storm sets in, the townsfolk go indoors (home, or the inn if they have no home here) and come out
// again when it clears, so a wet day finds the streets empty and the houses full.
'use strict';

const IN_KINDS = new Set(['home', 'weapons', 'armor', 'general', 'alchemist', 'magic', 'enchanter', 'jeweler', 'inn', 'townhall', 'butcher', 'barn']);
const inKey = lm => 'in_' + lm.x + '_' + lm.y;
const doorOf = lm => [lm.x + lm.spec.door, lm.y + lm.h - 1];
function landmarkAtDoor(m, x, y) { return (m.landmarks || []).find(lm => lm.spec && lm.art === 'building' && doorOf(lm)[0] === x && doorOf(lm)[1] === y); }
function interiorName(lm, tr) {
  const k = lm.spec.kind;
  if (SHOPS[k]) return SHOPS[k].name;
  if (k === 'inn') return 'The Sleeping Fox'; if (k === 'townhall') return 'The Town Hall'; if (k === 'butcher') return "Garrick's Meats"; if (k === 'barn') return "The Drovers' Barn";
  const t = tr && tr.text || ''; const m = t.match(/^((?:Councilman |Old )?[A-Z][^.]*?'s (?:house|cottage))/) || t.match(/^(The [^.]*?(house|cottage))/i) || t.match(/^(Old [^.]*?cottage)/i) || t.match(/^(A [^.]*?house)/i);
  return m ? m[1].replace(/^A /, 'A ') : 'A cottage';
}

// ---------------- building the inside ----------------
function buildInterior(lm, tr) {
  const k = lm.spec.kind, big = ['inn', 'townhall', 'barn'].includes(k);
  const W = Math.max(9, Math.min(big ? 15 : 12, lm.w + 3)), H = Math.max(8, Math.min(big ? 11 : 9, lm.h + 2));
  const m = blankMap(inKey(lm), W, H, 'w', { lit: true, name: interiorName(lm, tr), theme: 'house' });
  m.parentDoor = [lm.x + lm.spec.door, lm.y + lm.h];
  box(m, 0, 0, W - 1, H - 1, '#'); rect(m, 1, 1, W - 2, 1, '#');
  const D = (x, y, d, t) => { if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return; m.decor[K(x, y)] = d; if (t) m.trig[K(x, y)] = typeof t === 'string' ? { dlg: 'locked', text: t } : t; };
  const dx = Math.floor(W / 2);
  setTile(m, dx, H - 1, '+'); m.trig[K(dx, H - 1)] = { go: 'town', at: m.parentDoor };
  m.lights = [];
  // windows along the back wall, and a hearth
  for (let x = 2; x < W - 2; x += 4) if (Math.abs(x - dx) > 1) D(x, 1, 'iwindow');
  const hearthX = W - 3; D(hearthX, 1, 'hearth'); m.lights.push([hearthX, 2, 4, 'hearth']);
  const seed = lm.x * 31 + lm.y * 17; let s = seed; const R = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  if (k === 'home') {
    D(1, 2, 'bed'); if (lm.w >= 8) D(1, 4, 'bed'); D(2, 2, 'chest');
    D(dx - 1, 4, 'table'); D(dx + 1, 4, 'table'); D(dx, 5, 'bench');
    D(W - 2, 3, R() < 0.5 ? 'bookcase' : 'pots'); D(W - 2, H - 3, 'barrel'); D(1, H - 2, 'basin');
    if (R() < 0.6) D(W - 3, H - 2, 'woodpile');
    m.rugs = [[dx - 1, 3, 3, 3]];
    if (tr && tr.text) m.flavor = tr.text;
  } else if (SHOPS[k] || k === 'butcher') {
    // the counter across the room, the keeper's side behind it, the wares about the shop floor
    const cy = 3;
    for (let x = 2; x <= W - 3; x++) { setTile(m, x, cy, '='); m.trig[K(x, cy)] = k === 'butcher' ? { dlg: 'locked', text: tr && tr.text || 'The butcher\'s counter.' } : { shop: k }; }
    const WARES = {
      weapons: ['weaponrack', 'weaponrack', 'armorstand', 'barrel', 'grindstone'], armor: ['armorstand', 'armorstand', 'shieldrack', 'shieldrack', 'crate'],
      general: ['sacks', 'crate', 'barrel', 'sacks', 'pots'], alchemist: ['cauldron', 'herbrack', 'pots', 'herbrack', 'basin'],
      magic: ['bookcase', 'bookcase', 'crystal', 'candelabra', 'crystal'], enchanter: ['crystal', 'crystal', 'candelabra', 'bookcase', 'strongbox'],
      jeweler: ['strongbox', 'candelabra', 'crystal', 'strongbox', 'pots'], butcher: ['meatrack', 'chopblock', 'barrel', 'meatrack', 'barrel'],
    }[k] || ['crate', 'barrel'];
    const spots = [[1, cy + 2], [W - 2, cy + 2], [1, H - 3], [W - 2, H - 3], [2, H - 2]];
    spots.forEach(([x, y], i) => D(x, y, WARES[i % WARES.length]));
    D(1, 2, WARES[0]); D(W - 2, 2, WARES[1]);
    m.lights.push([dx, cy, 3, 'candle']);
    m.shop = k;
    // a shop nobody in town keeps: its keeper lives behind the counter
    if (SHOPS[k] && !S.maps.town.npcs.some(n => n.shop === k) && SHOPS[k].npc) m.npcs.push({ spr: SHOPS[k].npc, x: dx, y: 2, name: SHOPS[k].keeper, shop: k, fixed: true, resident: 1, lines: [SHOPS[k].greet] });
  } else if (k === 'inn') {
    for (let x = 2; x <= 6; x++) { setTile(m, x, 3, '='); m.trig[K(x, 3)] = { dlg: 'inn' }; }
    D(1, 2, 'barrel'); D(2, 2, 'barrel'); D(4, 2, 'pots');
    for (const [x, y] of [[4, 6], [9, 6], [4, 8], [9, 8], [11, 4]]) if (x < W - 1 && y < H - 1) { D(x, y, 'table'); D(x + 1, y, 'bench'); }
    D(W - 2, H - 3, 'barrel'); m.lights.push([4, 6, 3, 'candle'], [9, 6, 3, 'candle']);
    m.rugs = [[7, 5, 3, 3]];
  } else if (k === 'townhall') {
    for (let x = dx - 2; x <= dx + 2; x++) { setTile(m, x, 3, '='); m.trig[K(x, 3)] = { dlg: 'townhall' }; }
    setTile(m, 2, 4, 'B'); m.trig[K(2, 4)] = { dlg: 'board' };
    D(1, 2, 'bookcase'); D(2, 2, 'bookcase'); D(W - 2, 2, 'bookcase'); D(W - 2, 5, 'desk'); D(W - 2, 7, 'strongbox');
    m.rugs = [[dx - 2, 5, 5, 3]]; m.lights.push([dx, 3, 3, 'candle']);
  } else if (k === 'barn') {
    for (let i = 0; i < 9; i++) D(1 + Math.floor(R() * (W - 2)), 2 + Math.floor(R() * (H - 4)), 'hay');
    D(W - 2, H - 2, 'trough'); m.lights = [];
  }
  return m;
}
function interiorFor(lm, tr) {
  const key = inKey(lm);
  if (!S.maps[key]) S.maps[key] = buildInterior(lm, tr);
  return S.maps[key];
}
function enterBuilding(lm, tr) {
  const m = interiorFor(lm, tr), dx = Math.floor(m.w / 2);
  goMap(m.id, dx, m.h - 2);
  if (m.flavor && !m.seenFlavor) { m.seenFlavor = 1; msg(m.flavor.replace(/ Nobody answers\.| The door is latched\./, ''), 'talk'); }
  const who = m.npcs.filter(n => n.name).map(n => cap(n.name));
  if (who.length) msg(`${who.slice(0, 3).join(', ')}${who.length > 3 ? ' and others are' : who.length > 1 ? ' are' : ' is'} here.`, 'talk');
}
{
  const _doTrigger = doTrigger;
  doTrigger = function (tr) {
    const m = curMap();
    if (m && m.id === 'town') {
      const key = Object.keys(m.trig).find(k => m.trig[k] === tr);
      if (key) { const [x, y] = key.split(',').map(Number), lm = landmarkAtDoor(m, x, y); if (lm && IN_KINDS.has(lm.spec.kind) && !tr.go && tr.dlg !== 'temple') return enterBuilding(lm, tr); }
    }
    if (tr && tr.go === 'town' && m && m.id && m.id.startsWith('in_')) { msg('You step back out into Brambleford.'); goMap('town', tr.at[0], tr.at[1]); autosave(); return; }
    return _doTrigger(tr);
  };
}

function freeInside(im) {
  for (let t = 0; t < 200; t++) { const x = 1 + Math.floor(Math.random() * (im.w - 2)), y = 4 + Math.floor(Math.random() * Math.max(1, im.h - 5)); if (walkable(im, x, y) && !im.npcs.some(o => o.x === x && o.y === y) && !(S.mapId === im.id && P().x === x && P().y === y) && tileAt(im, x, y) !== '+') return [x, y]; }
  return null;
}
// ---------------- daily routines ----------------
// Everyone in town keeps hours. Each person has a base (where they stand or work outdoors), a home (their cottage,
// or the shop they live above) and a routine by type; rain sends anyone who'd be outdoors under a roof. People only
// come and go out of your sight: never while you're standing beside them.
const ROUTINE_BY_NAME = { 'Councilman Voss': 'clerk', 'the gate guard': 'guard', 'a traveling friar': 'friar', 'the auctioneer': 'yard', 'a drover': 'yard', 'Garrick the butcher': 'butcher' };
function routineOf(n) {
  if (n.prop || n.animal) return null;
  if (ROUTINE_BY_NAME[n.name]) return ROUTINE_BY_NAME[n.name];
  if (n.shop === 'market') return 'market';
  if (n.shop && SHOPS[n.shop]) return 'shopkeeper';
  if (n.build === 'child' || n.spr === 'girl' || /\b(girl|boy|child)\b/i.test(n.name || '')) return 'child';
  return 'townsfolk';
}
const nameHash = n => [...(n.name || n.spr || '')].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7);
function homeOf(m, n) {
  const kind = { shopkeeper: n.shop, butcher: 'butcher', clerk: 'home' }[routineOf(n)];
  if (kind && kind !== 'home') { const l = m.landmarks.find(lm => lm.spec && lm.spec.kind === kind); if (l) return l; }
  const at = (n.base && n.base.home) || n.home || [n.x, n.y];
  let best = null, bd = 1e9;
  for (const lm of m.landmarks) { if (!lm.spec || lm.spec.kind !== 'home') continue; const [x, y] = doorOf(lm), d = Math.hypot(x - at[0], y - at[1]); if (d < bd) { bd = d; best = lm; } }
  return best && bd < 22 ? best : m.landmarks.find(lm => lm.spec && lm.spec.kind === 'inn');
}
const landmarkOfKind = (m, k) => m.landmarks.find(lm => lm.spec && lm.spec.kind === k);
// where someone should be right now: 'out' (their base in town) or a building
function placeFor(town, n, h, wet) {
  const r = routineOf(n); if (!r) return null;
  const home = () => homeOf(town, n), inn = () => landmarkOfKind(town, 'inn');
  const eveningInn = nameHash(n) % 2 === 0;
  const out = wet ? (r === 'guard' ? 'out' : home()) : 'out';
  switch (r) {
    case 'guard': return 'out';
    case 'shopkeeper': return h >= 8 && h < 18 ? landmarkOfKind(town, n.shop) || out : h >= 18 && h < 21 && eveningInn ? inn() : home();
    case 'butcher': return h >= 7 && h < 17 ? landmarkOfKind(town, 'butcher') || out : h < 21 && eveningInn ? inn() : home();
    case 'market': return h >= 7 && h < 17 ? (wet ? inn() : 'out') : h < 21 && eveningInn ? inn() : home();
    case 'clerk': return h >= 9 && h < 16 ? landmarkOfKind(town, 'townhall') || out : h < 21 && eveningInn ? inn() : home();
    case 'yard': return h >= 8 && h < 17 ? (wet ? inn() : 'out') : h < 21 ? inn() : home();
    case 'friar': return h >= 8 && h < 19 ? (wet ? inn() : 'out') : inn();
    case 'child': return h >= 9 && h < 18 ? out : home();
    default: return h < 8 ? home() : h < 18 ? out : h < 21 ? (eveningInn ? inn() : out) : home();
  }
}
function allTownFolk() {
  const out = [];
  for (const n of S.maps.town.npcs) out.push([n, 'town']);
  for (const k in S.maps) if (k.startsWith('in_')) for (const n of S.maps[k].npcs) out.push([n, k]);
  return out;
}
function scheduleTick() {
  if (!S || !S.maps || !S.maps.town || dead) return;
  const town = S.maps.town, h = dayHour(), wet = typeof wxWet === 'function' && wxWet(), p = P(), here = S.mapId;
  for (const [n, where] of allTownFolk()) {
    // remember where they belong outdoors, the first time we see them in town
    if (!n.base) { if (n.sheltered) { n.base = { x: n.sheltered.x, y: n.sheltered.y, home: n.sheltered.home, fixed: n.sheltered.fixed }; delete n.sheltered; } else if (where === 'town') n.base = { x: n.x, y: n.y, home: n.home, fixed: n.fixed }; else continue; }
    const want = placeFor(town, n, h, wet); if (!want) continue;
    const wantKey = want === 'out' ? 'town' : inKey(want);
    if (wantKey === where) continue;
    // never vanish or appear under your nose
    if (here === where && Math.hypot(n.x - p.x, n.y - p.y) < 7) continue;
    if (Math.random() > 0.35) continue; // people drift off over a little while, not all at once
    const from = S.maps[where];
    if (wantKey === 'town') {
      const b = n.base; if (town.npcs.some(q => q !== n && q.x === b.x && q.y === b.y) || (here === 'town' && p.x === b.x && p.y === b.y)) continue;
      if (here === 'town' && Math.hypot(b.x - p.x, b.y - p.y) < 6) continue;
      from.npcs.splice(from.npcs.indexOf(n), 1);
      Object.assign(n, { x: b.x, y: b.y, home: b.home, fixed: b.fixed, goal: null });
      town.npcs.push(n);
    } else {
      const im = interiorFor(want, town.trig[K(...doorOf(want))]);
      let spot = null;
      if (routineOf(n) === 'shopkeeper' || routineOf(n) === 'butcher' || routineOf(n) === 'clerk') { const dx = Math.floor(im.w / 2); for (const x of [dx, dx - 1, dx + 1, dx - 2]) if (walkable(im, x, 2) && !im.npcs.some(o => o.x === x && o.y === 2)) { spot = [x, 2]; break; } }
      if (!spot) spot = freeInside(im); if (!spot) continue;
      if (here === wantKey && Math.hypot(spot[0] - p.x, spot[1] - p.y) < 2) continue;
      from.npcs.splice(from.npcs.indexOf(n), 1);
      const behind = spot[1] === 2;
      Object.assign(n, { x: spot[0], y: spot[1], home: [spot[0], spot[1]], fixed: behind || n.base.fixed, goal: null });
      im.npcs.push(n);
    }
  }
}
// shops keep hours: locked outside them
const SHOP_HOURS = { butcher: [7, 17], townhall: [9, 16] };
const shopHours = k => SHOP_HOURS[k] || [8, 18];
{
  const _eb = enterBuilding;
  enterBuilding = function (lm, tr) {
    const k = lm.spec.kind;
    if ((SHOPS[k] || SHOP_HOURS[k]) && k !== 'inn') {
      const [o, c] = shopHours(k), h = dayHour();
      if (h < o || h >= c) { const name = interiorName(lm, tr); msg(`${name} is locked up for the night. A sign on the door: open ${o} in the morning till ${c > 12 ? c - 12 : c} in the evening.`, 'talk'); return; }
    }
    return _eb(lm, tr);
  };
}
setInterval(() => { try { scheduleTick(); } catch (e) { console.error(e); } }, 2000);

// ---------------- the market on the green: produce and provisions ----------------
SHOPS.market = {
  name: 'The Market Stalls', keeper: 'the stallholders', npc: 'baker', rate: 0.45,
  greet: 'Eggs this morning, milk from the dairy, a side of mutton, fish off the cart from the river, flour and apples. Fair prices, and we buy what you bring in from the land.',
  buys: ['food', 'herb', 'hide'],
  sells: [['mat:egg', 18], ['mat:milk', 10], ['mat:meat', 12], ['mat:wheat', 25], ['mat:apple', 20], ['mat:trout', 6], ['mat:perch', 6], ['mat:roach', 6], ['mat:healroot', 8], ['mat:wool', 8], ['mat:truffle', 1]],
};
function ensureMarket() {
  if (!S || !S.shops) return;
  if (!S.shops.market) { const sh = { stock: {}, sold: {}, special: [] }; for (const [iid, target] of SHOPS.market.sells) if (iid.startsWith('mat:') ? MATS[iid.slice(4)] : ITEMS[iid]) sh.stock[iid] = { qty: target, target }; S.shops.market = sh; }
  const t = S.maps && S.maps.town; if (!t) return;
  // shops nobody in town keeps get a keeper who lives behind the counter (also in interiors built before this)
  for (const key in S.maps) { const im = S.maps[key]; if (!key.startsWith('in_') || !im.shop || !SHOPS[im.shop]) continue; const k = im.shop; if (t.npcs.some(n => n.shop === k) || Object.keys(S.maps).some(k2 => k2.startsWith('in_') && S.maps[k2].npcs.some(n => n.shop === k))) continue; const dx = Math.floor(im.w / 2); im.npcs.push({ spr: SHOPS[k].npc, x: dx, y: 2, name: SHOPS[k].keeper, shop: k, fixed: true, resident: 1, lines: [SHOPS[k].greet] }); }
  for (const k in t.decor) if (t.decor[k] === 'stallR' || t.decor[k] === 'stallB') t.trig[k] = { shop: 'market' };
  for (const n of t.npcs) if (['the baker', 'a farmer'].includes(n.name)) n.shop = 'market';
}
{
  const _openShop = openShop;
  openShop = function (id) {
    if (id === 'market') { ensureMarket(); const h = dayHour(); if (h < 7 || h >= 17) { msg('The market stalls are shuttered. They open again at seven in the morning.', 'talk'); return; } if (typeof wxWet === 'function' && wxWet()) { msg('The stallholders have covered their stalls against the rain and gone to the Sleeping Fox.', 'talk'); return; } }
    return _openShop(id);
  };
}
setInterval(() => { try { ensureMarket(); } catch (e) { } }, 1500);
