// The Temple Warden — engine.
'use strict';

// ================= helpers =================
const rnd = n => Math.floor(Math.random() * n);
const roll = (a, b) => a + rnd(b - a + 1);
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const chance = p => Math.random() < p;
const K = (x, y) => x + ',' + y;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mod = v => Math.floor((v - 10) / 2);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
let uidSeq = 1;
const uid = () => Date.now().toString(36) + (uidSeq++);
// a day lasts this many turns, from seven in the morning to midnight
const DAY_TURNS = 1800;
const SAVE_VERSION = 21;

let S = null;           // whole game state (saved)
let vis = new Set();    // tiles visible this turn
let modalOpen = false;
let dead = false;

// ================= tiles =================
// walk: can stand on it. op: blocks sight.
const TILES = {
  '#': { walk: 0, op: 1 }, '.': { walk: 1 }, '>': { walk: 1 }, '<': { walk: 1 }, 'V': { walk: 0, op: 1 }, 'G': { walk: 0, op: 1 },
  '^': { walk: 0, op: 1 }, ',': { walk: 1 }, ':': { walk: 1 }, 'T': { walk: 0 }, '~': { walk: 0 },
  'W': { walk: 0, op: 1 }, '+': { walk: 0, op: 1 }, 'F': { walk: 0 }, 'f': { walk: 1 }, 'E': { walk: 1 }, 'X': { walk: 1 },
  'w': { walk: 1 }, '=': { walk: 0 }, 'B': { walk: 0 }, 'S': { walk: 0 },
  // buildings: roofs (clay, thatch, slate), stone and timber walls, windows; town wall; cave mouth; dirt path
  'r': { walk: 0, op: 1 }, 'h': { walk: 0, op: 1 }, 'l': { walk: 0, op: 1 }, 'K': { walk: 0, op: 1 }, 'H': { walk: 0, op: 1 }, 'O': { walk: 0, op: 1 },
  'Z': { walk: 0 }, 'C': { walk: 1 }, ';': { walk: 1 },
  // forest: trees block sight; trail ends lead out ({) and deeper (})
  'Y': { walk: 0, op: 1 }, '{': { walk: 1 }, '}': { walk: 1 },
  // ground under a landmark building drawn whole (the temple)
  'Q': { walk: 0, op: 1 },
  // a bridge over the river
  'J': { walk: 1 }, 'z': { walk: 1 },
};
const tileAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? '#' : m.t[y][x];
const decorBlocks = d => !!d && (!!DECOR_BLOCK[d] || d.startsWith('sign'));
const walkable = (m, x, y) => !!(TILES[tileAt(m, x, y)] || {}).walk && !(m.decor && decorBlocks(m.decor[K(x, y)]));
function setTile(m, x, y, c) { const r = m.t[y]; m.t[y] = r.slice(0, x) + c + r.slice(x + 1); }
const curMap = () => S.maps[S.mapId];
const P = () => S.player;

// ================= items =================
function makeItem(id, ench = 0, q = 1) {
  const t = ITEMS[id];
  const it = { id, uid: uid(), ench };
  if (t.stack) it.q = q;
  if (t.fuel) it.fuel = t.fuel;
  return it;
}
const T = it => ITEMS[it.id];
function itemName(it) {
  const t = T(it);
  let n = t.name;
  if (it.ench) n = (it.ench > 0 ? '+' : '') + it.ench + ' ' + n;
  if (it.fine) n = 'Fine ' + n;
  if (it.q > 1) n += ' ×' + it.q;
  return n;
}
function itemValue(it) {
  const t = T(it);
  let v = t.val * (1 + 0.7 * (it.ench || 0)) + 15 * (it.ench || 0) ** 2;
  if (it.crafted && has('tradesman')) v *= 1.25;
  return v;
}
const DTYPE = { slash: 'Slashing', pierce: 'Piercing', blunt: 'Crushing' };
function itemDesc(it) {
  const t = T(it); const e = it.ench || 0; const bits = [];
  if (t.dmg) bits.push(`${DTYPE[t.dtype]} ${t.dmg[0] + e}–${t.dmg[1] + e}`);
  if (t.slot === 'weapon' && (t.atk || e)) bits.push(`${fmtSign(t.atk + e)} to hit`);
  if (t.def != null && t.slot !== 'weapon') bits.push(`Defense ${fmtSign(t.def + (t.slot !== 'ring' && t.slot !== 'amulet' ? e : 0))}`);
  if (t.slot && t.slot !== 'weapon' && t.atk && t.cat !== 'jewelry') bits.push(`${t.atk} to hit`);
  if (t.grade === 'silver' && t.slot === 'weapon') bits.push('Extra damage to undead');
  if (t.note) bits.push(t.note);
  if (t.str) bits.push(`+${t.str} STR`);
  if (t.int) bits.push(`+${t.int} INT`);
  if (t.hp) bits.push(`+${t.hp} max HP`);
  if (t.mp) bits.push(`+${t.mp} max MP`);
  if (t.atk && t.cat === 'jewelry') bits.push(`+${t.atk} to hit`);
  if (t.regen) bits.push('Regenerate HP faster');
  if (t.nopoison) bits.push('Immune to poison');
  if (t.luck) bits.push('More gold, more criticals');
  const uses = { heal: `Heals ${t.amt} HP`, mana: `Restores ${t.amt} MP`, antidote: 'Cures poison and sickness', strbuff: '+3 STR for a while', life: '+5 max HP forever',
    recall: 'Town ↔ the last cave level you visited', teleport: 'Random spot on this level', mapping: 'Reveals this level', enchweapon: '+1 to your weapon', backpack: '+30 lb carrying capacity', journal: 'Read it', refuel: 'Refills a lantern' };
  if (uses[t.use]) bits.push(uses[t.use]);
  if (t.use === 'learn') bits.push(`Learn ${SPELLS[t.spell].name}`);
  if (t.cat === 'ammo') bits.push('Fired from a bow');
  if (t.tool === 'axe') bits.push('Chop trees');
  if (t.tool === 'pick') bits.push('Break rock, mine ore');
  if (t.tool === 'sickle') bits.push('+1 herb per harvest');
  if (/^seal_/.test(t.id)) bits.push('One of four keys to the Deep');
  if (t.slot === 'light' && it.fuel != null && it.fuel < t.fuel) bits.push(it.fuel > 0 ? `${it.fuel} turns left` : 'Burned out');
  bits.push(`${+(t.wt * (it.q || 1)).toFixed(1)} lb`);
  return bits.join(' · ');
}
const fmtSign = v => (v >= 0 ? '+' : '') + v;
const hasTool = tool => P().inv.some(it => T(it).tool === tool);
const icon = it => spriteImg(itemCanvas(it.id || it));
const matIcon = id => spriteImg(matCanvas(id));

function addItem(it, quiet) {
  const p = P();
  if (T(it).stack) {
    const ex = p.inv.find(o => o.id === it.id && !o.ench && o.fuel === it.fuel);
    if (ex) { ex.q += it.q || 1; return true; }
  }
  p.inv.push(it); return true;
}
function removeOne(it) {
  const p = P();
  if (it.q > 1) { it.q--; return { ...it, q: 1, uid: uid() }; }
  p.inv = p.inv.filter(o => o !== it); return it;
}
function addMat(id, n) { const p = P(); p.mats[id] = (p.mats[id] || 0) + n; }
const matCount = id => P().mats[id] || 0;
const has = skill => !!(S && (P().skills[skill] || FREE_PERKS.has(skill)));
const rank = skill => (S && P().skills[skill]) || 0;
const DIFF = () => DIFFS[(S && S.diff) || 'normal'];
const lv2 = site => !!(S && S.home.lv && S.home.lv[site] >= 2);
const structName = site => lv2(site) ? STRUCTURES[site].up.name : STRUCTURES[site].name;
function splitOne(it) {
  const p = P(); let one;
  if (it.q > 1) { it.q--; one = makeItem(it.id); if (it.fuel != null) one.fuel = it.fuel; }
  else { p.inv = p.inv.filter(o => o !== it); one = it; }
  return one;
}

// ---- encumbrance ----
const itemWt = it => (T(it).wt || 0) * (it.q || 1);
function carried() {
  const p = P(); let w = 0;
  for (const it of p.inv) w += itemWt(it);
  for (const sl of SLOTS) if (p.equip[sl]) w += itemWt(p.equip[sl]);
  for (const m in p.mats) w += (MATS[m].wt || 0) * (p.mats[m] || 0);
  return Math.round(w * 10) / 10;
}
const capacity = () => 60 + stat('str') * 4 + (P().packBonus || 0);
function burden() { if (S.light) return 0; const c = carried(), cap = capacity(); return c > cap * 1.5 ? 2 : c > cap ? 1 : 0; }
// materials stored at the homestead count when you're standing on your land
const atHome = () => S.mapId === 'home';
const matAvail = id => matCount(id) + (atHome() ? (S.home.mats[id] || 0) : 0);
function useMat(id, n) {
  if (atHome()) { const take = Math.min(n, S.home.mats[id] || 0); S.home.mats[id] = (S.home.mats[id] || 0) - take; n -= take; }
  P().mats[id] = (P().mats[id] || 0) - n;
}

// ---- light ----
function lightRadius() {
  const p = P(); if (p.st.blind > 0) return 1;
  if (curMap().outdoor) return 9;
  const l = p.equip.light; return l && l.fuel > 0 ? T(l).light : 2;
}
function setLit(m, v) { Object.defineProperty(m, '_lit', { value: v, writable: true, configurable: true, enumerable: false }); }
function litMap(m) {
  if (m._lit) return m._lit;
  const a = new Uint8Array(m.w * m.h);
  for (const [lx, ly, r] of m.lights || []) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = lx + dx, y = ly + dy;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h || dx * dx + dy * dy > r * r + 1) continue;
    if (los(m, lx, ly, x, y)) a[y * m.w + x] = 1;
  }
  setLit(m, a); return a;
}
const tileLit = (m, x, y) => m.lit || !!litMap(m)[y * m.w + x];
function playerLit() { const m = curMap(), p = P(); return m.lit || m.outdoor || lightRadius() >= 4 || tileLit(m, p.x, p.y); }

// ================= derived stats =================
function equipBonus(key) {
  let s = 0; const eq = P().equip;
  for (const sl of SLOTS) { const it = eq[sl]; if (it && T(it)[key]) s += T(it)[key]; }
  return s;
}
const weaponT = () => { const w = P().equip.weapon; return w ? T(w) : null; };
function stat(k) {
  const p = P(); let v = p.stats[k] + equipBonus(k);
  if (k === 'str' && p.strBuff > 0) v += 3;
  if ((k === 'str' || k === 'con') && p.st.sick > 0) v -= 2;
  return v;
}
function maxHp() { const p = P(); return Math.max(1, 15 + (p.level - 1) * 7 + (stat('con') - 10) * 3 + equipBonus('hp') + rank('tough') * 8 + (p.bonusHp || 0)); }
function maxMp() { const p = P(); return Math.max(0, (stat('int') - 8) * 2 + (p.level - 1) * 2 + equipBonus('mp') + rank('manawell') * 4); }
// armor, shields and rings modify to-hit; the weapon is counted separately
function gearAtk() { let v = 0; const eq = P().equip; for (const sl of SLOTS) { if (sl === 'weapon') continue; const it = eq[sl]; if (it && T(it).atk) v += T(it).atk; } return v; }
const buff = k => (P().buffs || {})[k] > 0;
function toHit(ranged) {
  const p = P(); const w = p.equip.weapon; const wt = weaponT();
  let v = Math.floor(p.level / 2) + mod(stat('dex')) + rank('wt') + gearAtk() + (buff('hunt') ? 3 : 0) + (berserking() ? 2 : 0) + (buff('rested') ? 1 : 0);
  if (w && (!RANGED_CLS.has(wt.cls) || ranged)) v += (wt.atk || 0) + (w.ench || 0) + (wt.cls === 'spear' ? rank('spear') : 0) + (RANGED_CLS.has(wt.cls) ? rank('archery') : 0);
  return v;
}
function dmgRange(ranged) {
  const p = P(); const w = p.equip.weapon; const wt = weaponT();
  if (!w || (RANGED_CLS.has(wt.cls) && !ranged)) { const b = mod(stat('str')); return [Math.max(1, 1 + b), Math.max(1, 3 + b)]; }
  const b = (RANGED_CLS.has(wt.cls) ? mod(stat('dex')) : mod(stat('str'))) + (buff('hunt') ? 2 : 0) + (berserking() ? 3 : 0) + masteryDmg(wt.cls);
  return [Math.max(1, wt.dmg[0] + (w.ench || 0) + b), Math.max(1, wt.dmg[1] + (w.ench || 0) + b)];
}
function defense() {
  const p = P(); let v = 10 + mod(stat('dex')) + rank('ironskin') * 2 + (buff('stone') ? 4 : 0) + (has('guardian') && p.equip.shield ? 3 : 0) + (buff('rested') ? 1 : 0) + (buff('ashield') ? 4 : 0);
  for (const sl of SLOTS) {
    const it = p.equip[sl]; if (!it || sl === 'weapon') continue;
    v += (T(it).def || 0) + (sl === 'ring' || sl === 'amulet' ? 0 : (it.ench || 0));
  }
  return v;
}
const spellPower = () => 1 + equipBonus('spell') + rank('spellcraft') * 0.1 + (has('archmage') ? 0.25 : 0);
const berserking = () => has('berserker') && P().hp < maxHp() / 2;
const MASTERY = { sword: 'blade', dagger: 'blade', axe: 'axe', mace: 'mace', staff: 'mace', spear: 'spear', bow: 'archery', crossbow: 'archery', warhammer: 'mace', flail: 'mace', greatsword: 'blade', rapier: 'blade', halberd: 'spear' };
const masteryDmg = cls => MASTERY[cls] ? rank(MASTERY[cls]) : 0;
const critOn = () => { const c = weaponT() && weaponT().cls; return 20 - (has('crit') ? 1 : 0) - (c === 'dagger' || c === 'rapier' ? 1 : 0) - (equipBonus('luck') ? 1 : 0) - ((c === 'sword' || c === 'dagger') && rank('blade') >= 2 ? 1 : 0); };
const spellCost = id => Math.max(1, SPELLS[id].mp - (has('focus') ? 1 : 0));
const xpToNext = l => (l + 3) * 25; // your level rises as your skills do

// ================= floating numbers =================
let floaters = [], floatRAF = 0;
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function addFloat(tx, ty, text, color, big) {
  floaters.push({ tx, ty, text: String(text), color, big: !!big, t0: performance.now(), dx: (Math.random() - 0.5) * 0.4 });
  if (!floatRAF) floatRAF = requestAnimationFrame(floatTick);
}
function floatTick() { floatRAF = 0; renderMap(); if (floaters.length || tracers.length || anyMoving) floatRAF = requestAnimationFrame(floatTick); }
// ---- motion: people and creatures glide from tile to tile and step as they go ----
// Runtime only: nothing here is saved. visualPos() is where something appears; its x/y are where it really is.
const MOVE_MS = 140;
// Walking pace when Corin is held to a direction, steered or sent somewhere: one tile every WALK_MS, and each step's
// glide lasts exactly that long so steps run into each other with no stop-start.
const WALK_MS = 270, RUN_MS = 150, NPC_MS = 520;
let walkPace = false, runToggle = false, shiftRun = false;
try { runToggle = localStorage.getItem('tw-run') === '1'; } catch (e) { }
// walking unless running is switched on; Shift flips it while held
const curPace = () => (runToggle !== shiftRun) ? RUN_MS : WALK_MS;
const motion = new WeakMap();
let anyMoving = false;
// which way people face: toward where they last stepped (or struck)
const facings = new WeakMap();
function setFacing(obj, dx, dy) { if (dx || dy) facings.set(obj, Math.abs(dx) >= Math.abs(dy) && dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
const facingOf = obj => { const a = typeof anims !== 'undefined' && anims.get(obj); if (a && a.face && performance.now() - a.t0 < ANIM.look.dur) return a.face; return facings.get(obj) || 'down'; };
// a small per-person offset so the town doesn't breathe in unison
const breathOffset = new WeakMap();
// ---- actions: a swing, a cast, a prayer, a flinch; brief poses that play over whatever else is happening ----
const anims = new WeakMap();
const ANIM = {
  atk: { dur: 300, frames: ['atk0', 'atk1', 'atk2', 'atk2'] },
  work: { dur: 460, frames: ['work0', 'work1', 'work0', 'work1'] },
  cast: { dur: 520, frames: ['cast0', 'cast0', 'cast1', 'cast1'] },
  pray: { dur: 1400, frames: ['kneel'] },
  bow: { dur: 380, frames: ['bow0', 'bow0', 'bow1'] },
  stretch: { dur: 1100, frames: ['stretch'] },
  look: { dur: 1300, frames: ['idle0'] },
  hammer: { dur: 520, frames: ['work0', 'work0', 'work1', 'work1'] },
  hurt: { dur: 260, frames: ['hurt'] },
};
function playAnim(obj, kind, toward) {
  if (reduceMotion || !obj) return;
  const a = { kind, t0: performance.now(), dx: toward ? Math.sign(toward.x - obj.x) : 0, dy: toward ? Math.sign(toward.y - obj.y) : 0 };
  if (kind === 'look') a.face = pick(['left', 'right', 'up']);
  if (toward && kind !== 'hurt') setFacing(obj, a.dx, a.dy);
  anims.set(obj, a); anyMoving = true;
  if (!floatRAF) floatRAF = requestAnimationFrame(floatTick);
}
function animOf(obj) {
  const a = anims.get(obj); if (!a) return null;
  const A = ANIM[a.kind], k = (performance.now() - a.t0) / A.dur;
  if (k >= 1) { anims.delete(obj); return null; }
  anyMoving = true;
  return { a, k, pose: A.frames[Math.min(A.frames.length - 1, Math.floor(k * A.frames.length))] };
}
// where an action moves the body: a lunge into a blow, a jolt back from one (and a flash of white)
function animOffset(obj) {
  const an = animOf(obj); if (!an) return [0, 0, false];
  const { a, k } = an;
  if (a.kind === 'atk') { const f = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.24; return [a.dx * f, a.dy * f, false]; }
  if (a.kind === 'hurt') { const f = Math.sin(k * Math.PI) * 0.13; return [-a.dx * f, -a.dy * f, k < 0.45]; }
  if (a.kind === 'work') { const f = Math.abs(Math.sin(k * Math.PI * 2)) * 0.08; return [a.dx * f, a.dy * f, false]; }
  return [0, 0, false];
}
// the town going about its business: the smith at his anvil, the butcher at his block, and people who shift,
// look about and stretch now and then instead of standing like statues
const JOBS = { bran: 'anvil', farmer: 'chopblock' };
let lifeNext = 0;
function townsfolkLife(m, t) {
  if (reduceMotion || !t || t < lifeNext) return;
  lifeNext = t + 700;
  const p = P();
  for (const n of m.npcs) {
    if (n.prop || anims.get(n) || Math.abs(n.x - p.x) > 12 || Math.abs(n.y - p.y) > 9) continue;
    const job = JOBS[n.spr];
    if (job) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (m.decor[K(n.x + dx, n.y + dy)] === job && Math.random() < 0.6) { playAnim(n, 'hammer', { x: n.x + dx, y: n.y + dy }); dx = dy = 9; } if (anims.get(n)) continue; }
    if (Math.random() < 0.06) playAnim(n, Math.random() < 0.7 ? 'look' : 'stretch');
  }
}
function poseOf(obj, v) {
  if (S && obj === P() && typeof fishing !== 'undefined' && fishing) return 'fish';
  const an = animOf(obj); if (an) return an.pose;
  if (v.frame >= 0) return v.frame;
  let o = breathOffset.get(obj); if (o === undefined) { o = Math.floor(Math.random() * 1600); breathOffset.set(obj, o); }
  return Math.floor((performance.now() + o) / 800) % 2 ? 'idle1' : 'idle0';
}
function startMove(obj, fx, fy) {
  setFacing(obj, obj.x - fx, obj.y - fy);
  if (reduceMotion || Math.abs(obj.x - fx) > 1 || Math.abs(obj.y - fy) > 1) return;
  // carry on from wherever it appears right now, so quick repeated steps stay smooth
  const prev = motion.get(obj); let sx = fx, sy = fy, t0 = performance.now(), walkT0 = t0;
  const isNpc = curMap().npcs.includes(obj);
  const dur = obj === S.player ? (walkPace ? curPace() : MOVE_MS) : isNpc ? NPC_MS : (walkPace ? curPace() : MOVE_MS);
  if (prev && t0 - prev.t0 < prev.dur) { const k0 = (t0 - prev.t0) / prev.dur, k = prev.linear ? k0 : easeMove(k0); sx = prev.fx + (prev.tx - prev.fx) * k; sy = prev.fy + (prev.ty - prev.fy) * k; }
  if (prev && t0 - prev.t0 < prev.dur * 2.5) walkT0 = prev.walkT0;
  // walking at pace glides evenly; a single step eases in and out
  const linear = obj === S.player ? walkPace : isNpc ? !!(obj.goal && (obj.goal[0] !== obj.x || obj.goal[1] !== obj.y)) : walkPace;
  motion.set(obj, { fx: sx, fy: sy, tx: obj.x, ty: obj.y, t0, walkT0, linear, dur });
  stepFx(obj);
  anyMoving = true;
  if (!floatRAF) floatRAF = requestAnimationFrame(floatTick);
}
const easeMove = k => k >= 1 ? 1 : k * (2 - k);
function visualPos(obj) {
  const mv = motion.get(obj);
  if (!mv || mv.tx !== obj.x || mv.ty !== obj.y) return { x: obj.x, y: obj.y, frame: -1, bob: 0 };
  const now = performance.now(), k = (now - mv.t0) / mv.dur;
  if (k >= 1) return { x: obj.x, y: obj.y, frame: -1, bob: 0 };
  anyMoving = true;
  const e = mv.linear ? k : easeMove(k);
  return { x: mv.fx + (mv.tx - mv.fx) * e, y: mv.fy + (mv.ty - mv.fy) * e, frame: Math.floor((now - mv.walkT0) / (mv.dur / 2)) % 4, bob: 0 };
}

// ================= messages =================
function msg(text, cls = '') {
  if (!S) return;
  S.log.push({ t: text, c: cls });
  if (S.log.length > 80) S.log.shift();
  renderLog();
}
function renderLog() {
  const el = $('#log'); const open = el.classList.contains('open');
  const lines = open ? S.log : S.log.slice(-6);
  el.innerHTML = lines.map((l, i) => `<div class="ln ${l.c}" style="${open ? '' : `opacity:${(0.35 + 0.65 * (i + 1) / lines.length).toFixed(2)}`}">${esc(l.t)}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

// ================= town, hall, homestead =================
function blankMap(id, w, h, fill, opts = {}) {
  return { id, w, h, t: Array.from({ length: h }, () => fill.repeat(w)), seen: null, lit: !!opts.lit, mons: [], npcs: [], ground: [], trig: {}, links: {}, marks: {}, decor: {}, lights: [],
    name: opts.name || id, depth: opts.depth || 0, kind: opts.kind || 'surface', lvl: opts.lvl || 0, theme: opts.theme || 'cave' };
}
function rect(m, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTile(m, x, y, c); }
function box(m, x0, y0, x1, y1, c) { for (let x = x0; x <= x1; x++) { setTile(m, x, y0, c); setTile(m, x, y1, c); } for (let y = y0; y <= y1; y++) { setTile(m, x0, y, c); setTile(m, x1, y, c); } }

// A building, drawn whole for its trade (buildings.js) over ground that blocks movement and sight.
// The door is the tile in its bottom row at doorX; walking into it opens the shop, inn or home.
function building(m, x0, y0, w, h, roof, wall, doorX, trig, orient) {
  rect(m, x0, y0, x0 + w - 1, y0 + h - 1, 'Q');
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) delete m.decor[K(x, y)];
  m.trig[K(doorX, y0 + h - 1)] = trig;
  const kind = trig.shop || (trig.dlg === 'inn' ? 'inn' : trig.dlg === 'townhall' ? 'townhall' : 'home');
  (m.landmarks = m.landmarks || []).push({ x: x0, y: y0, w, h, art: 'building', spec: { w, h, roof, wall, door: doorX - x0, kind: trig.kind || kind, seed: x0 * 31 + y0 * 7, orient } });
}
// The temple quarter stands on a hill in the north-west corner of town: a grass plateau held up by a stone retaining
// wall, with steps up from the lane. On it, the temple, the parsonage built onto its west wall with a kitchen garden,
// the churchyard behind its iron fence, and Aurel's old open-air shrine.
const TQ = [19, 0];                                   // the temple's top-left corner
const HILL = { x0: 1, y0: 0, x1: 33, y1: 9, wall: 10, steps: [22, 24] };
const TEMPLE_OUT = [TQ[0] + 4, TQ[1] + 9];             // the tile just outside the temple door
const PARSONAGE_DOOR = [TQ[0] - 2, TQ[1] + 9];
function placeParsonage(m) {
  const [tx, ty] = TQ;
  for (let y = ty + 2; y <= ty + 8; y++) for (let x = tx - 9; x <= tx - 1; x++) { setTile(m, x, y, ','); delete m.decor[K(x, y)]; delete m.trig[K(x, y)]; }
  rect(m, tx - 4, ty + 4, tx - 1, ty + 8, 'Q');
  m.trig[K(tx - 2, ty + 8)] = { go: 'parsonage' };
  m.landmarks = (m.landmarks || []).filter(l => l.art !== 'parsonage');
  m.landmarks.unshift({ x: tx - 4, y: ty + 4, w: 74 / 16, h: 5, art: 'parsonage' });
  const D = (x, y, d) => { m.decor[K(x, y)] = d; };
  for (const [x, y] of [[tx - 9, ty + 4], [tx - 7, ty + 4], [tx - 9, ty + 6], [tx - 7, ty + 6], [tx - 8, ty + 5]]) D(x, y, 'herb');
  D(tx - 5, ty + 5, 'woodpile'); D(tx - 6, ty + 7, 'barrel');
  D(tx - 5, ty + 8, 'sign:hall'); m.trig[K(tx - 5, ty + 8)] = { dlg: 'locked', text: 'The Temple of the Dawn, and its parsonage. Father Halvard, priest.' };
}
function placeTemple(m) {
  const [tx, ty] = TQ;
  rect(m, tx, ty, tx + 8, ty + 8, 'Q');
  m.trig[K(tx + 4, ty + 8)] = { dlg: 'temple' };
  m.landmarks = (m.landmarks || []).filter(l => l.art !== 'temple');
  m.landmarks.push({ x: tx, y: ty, w: 9, h: 9, art: 'temple' });
}
// The churchyard, west of the parsonage on the hill: an iron fence, a gravel path, an old oak, and stones with stories.
// (Positions are from the churchyard's top-left corner.)
const GRAVES = [
  [1, 2, 'gravecross', 'FATHER EDMUND REEVE, Priest of the Dawn. "He kept the lamps lit." Halvard\'s teacher, who served this temple before him.'],
  [2, 4, 'grave', 'ADA HOLLIN, beloved wife of Bran. "Korrum keep her in the mountain\'s heart." A little clay figure of a mountain sits on the stone, freshly dusted.'],
  [1, 6, 'gravemoss', 'JOSS LIND. "He carried me out of the north. Rest now. B." Lavender grows thick around this one.'],
  [7, 2, 'gravecross', 'LISS BRACK. "The river did not give her back. This stone is for the ones who wait." A blue stone carved for Nemora is set at its foot.'],
  [6, 4, 'grave', 'A small stone: "THATCHER. Two days old. Held by Veyra." Someone has tied a fresh feather to it.'],
  [7, 6, 'memorial', 'An old stone with no names at all, only a carved flame and a date eighteen years past. Someone has laid fresh lavender at its foot. You think you know who.'],
];
function placeGraveyard(m) {
  const x0 = HILL.x0, y0 = 1, x1 = x0 + 8, y1 = 8, gate = x0 + 4;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { setTile(m, x, y, ','); delete m.decor[K(x, y)]; delete m.trig[K(x, y)]; }
  const D = (x, y, d) => { m.decor[K(x, y)] = d; };
  for (let x = x0 + 1; x < x1; x++) { D(x, y0, 'fence'); if (Math.abs(x - gate) > 1) D(x, y1, 'fence'); }
  for (let y = y0 + 1; y < y1; y++) { D(x0, y, 'fenceV'); D(x1, y, 'fenceV'); }
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [gate - 1, y1], [gate + 1, y1]]) D(x, y, 'fencePost');
  for (let y = y0 + 1; y <= y1; y++) setTile(m, gate, y, ';');
  D(x0 + 3, y0 + 1, 'oak'); D(x0 + 6, y0 + 1, 'bench');
  for (const [dx, dy, d, text] of GRAVES) { const x = x0 + dx, y = y0 + dy; D(x, y, d); m.trig[K(x, y)] = { dlg: 'locked', text }; }
  for (const n of m.npcs || []) if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) { n.x = gate; n.y = y1 + 1; }
}
// the hill itself: the plateau's lane along its foot, the retaining wall, the steps, and the forecourt in front of the temple
function placeHill(m) {
  const { x0, x1, y1, wall, steps } = HILL;
  for (let x = x0; x <= x1; x++) { setTile(m, x, wall, 'Z'); setTile(m, x, wall + 1, 'Z'); delete m.decor[K(x, wall)]; delete m.decor[K(x, wall + 1)]; }
  for (let y = 0; y <= wall + 1; y++) { setTile(m, x1 + 1, y, 'Z'); delete m.decor[K(x1 + 1, y)]; } // the east end of the wall
  for (let x = steps[0]; x <= steps[1]; x++) for (let y = wall; y <= wall + 1; y++) setTile(m, x, y, 'X');
  for (let x = x0 + 9; x <= x1; x++) if (tileAt(m, x, y1) === ',') setTile(m, x, y1, ';'); // the forecourt path along the front
  for (let x = steps[0]; x <= steps[1]; x++) setTile(m, x, y1, ':');
  m.hill = HILL;
}
function buildTown() {
  // Brambleford grew, it wasn't planned: one crooked high street down from the north road to an oval market green,
  // lanes wandering off it to cottages that face whichever way the lane does, and a church lane at the bottom
  // past the temple, the parsonage and the churchyard. Woods close in unevenly at the edges.
  const W = 96, H = 50;
  const m = blankMap('town', W, H, ',', { lit: true, name: 'Brambleford' });
  const D = (x, y, d) => { m.decor[K(x, y)] = d; };
  const sign = (x, y, icon, text) => { if (tileAt(m, x, y) !== ',' && tileAt(m, x, y) !== ';') return; D(x, y, 'sign:' + icon); m.trig[K(x, y)] = { dlg: 'locked', text }; };
  // a lane: a smooth curve through the points, stamped as a band of road
  const stamp = (x, y, r, t) => {
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || Math.hypot(xx - x, yy - y) > r) continue;
      const c = tileAt(m, xx, yy); if (c === ',' || c === 'f' || (t === ':' && c === ';')) setTile(m, xx, yy, t);
    }
  };
  const lane = (pts, r, t) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 3);
      for (let k = 0; k <= n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u, cr = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
        stamp(cr(0), cr(1), r, t);
      }
    }
  };
  // ---- the streets ----
  lane([[36, 1], [36, 5], [38, 10], [37, 15], [36, 20]], 1.2, ':');                       // the high street, from the north road
  for (let y = 19; y <= 29; y++) for (let x = 27; x <= 45; x++) {                          // the market green, an uneven oval of cobbles
    const dx = (x - 36) / (7.6 + vnoise(x / 3, y / 3) * 1.4), dy = (y - 24) / (4.4 + vnoise(y / 3, x / 3));
    if (dx * dx + dy * dy <= 1) setTile(m, x, y, ':');
  }
  lane([[43, 24], [50, 24.5], [58, 25.5], [65, 24], [72, 24.5]], 1, ':');                   // the east road...
  lane([[70, 24.5], [78, 25], [86, 24], [95, 24]], 0.9, ';');                                // ...becomes a drovers' track past the stockyard
  lane([[29, 25], [21, 25.5], [12, 25.5], [5, 25.5], [0, 25]], 0.8, ';');                     // the west lane
  lane([[36, 28], [31, 31], [25.5, 35], [22, 40], [23.5, 45.5], [30, 46.2], [38, 46], [47, 46.3], [53, 45], [58, 42]], 0.9, ';'); // down to the church lane
  lane([[36, 9], [33, 12.4], [24, 12.6], [12, 12.4], [3, 12.6]], 0.7, ';');                    // the lane along the foot of the temple hill
  lane([[38, 9], [46, 10], [56, 11], [66, 10.5]], 0.7, ';');                                  // the north-east lane
  lane([[57, 25.5], [58, 30], [58.5, 35], [59, 41]], 0.6, ';');                               // down to the pond
  setTile(m, 36, 2, ':'); m.trig[K(36, 2)] = { go: 'wilds' };
  setTile(m, W - 2, 24, ';'); m.trig[K(W - 2, 24)] = { go: 'home' };
  // ---- the town hall and the inn look onto the green ----
  building(m, 23, 13, 11, 8, 'l', 'K', 28, { dlg: 'townhall' });
  sign(34, 20, 'hall', 'Town Hall. The Market Board and the Land Registry are inside.');
  building(m, 40, 12, 9, 8, 'h', 'H', 44, { dlg: 'inn' });
  sign(39, 19, 'inn', 'The Sleeping Fox Inn. Beds, beer and a hot meal.'); D(49, 18, 'barrel'); D(49, 19, 'barrel'); D(48, 20, 'bench');
  // the market on the green
  D(31, 22, 'stallR'); D(34, 21, 'stallB'); D(40, 22, 'stallR'); D(42, 25, 'stallB'); D(31, 27, 'stallB'); D(40, 27, 'stallR');
  setTile(m, 36, 24, 'F'); D(33, 26, 'well'); D(38, 26, 'bench'); D(36, 21, 'bench');
  // ---- the west end: the smithy, the apothecary, the Arcanum ----
  building(m, 11, 15, 9, 8, 'l', 'K', 15, { shop: 'weapons' });
  sign(20, 22, 'smith', "Bran's Blades. Smithing and weapons.");
  // Bran's yard: fenced off the lane, with the forge, the anvil, the quench tub and the racks inside it
  for (let x = 4; x <= 10; x++) { D(x, 15, 'rail'); if (x !== 7) D(x, 24, 'rail'); }
  for (let y = 16; y <= 23; y++) D(4, y, 'railv');
  D(4, 15, 'railpost'); D(4, 24, 'railpost'); D(6, 24, 'railpost'); D(8, 24, 'railpost');
  D(6, 17, 'furnace'); D(9, 17, 'woodpile'); D(8, 20, 'anvil'); D(10, 20, 'quench'); D(6, 21, 'grindstone'); D(10, 22, 'weaponrack');
  for (let y = 16; y <= 23; y++) for (let x = 5; x <= 10; x++) if (tileAt(m, x, y) === ',') setTile(m, x, y, ';');
  building(m, 2, 27, 8, 7, 'h', 'H', 5, { shop: 'alchemist' }, 'gable');
  sign(10, 33, 'alch', "Tamsin's Apothecary. Potions and remedies."); D(10, 29, 'cauldron'); D(11, 28, 'herbrack'); D(11, 31, 'pots');
  building(m, 14, 28, 9, 7, 'l', 'K', 18, { shop: 'magic' });
  sign(13, 34, 'magic', 'The Arcanum. Spellbooks, scrolls, robes and staves.'); D(23, 30, 'pots'); D(16, 35, 'banner'); D(20, 35, 'banner');
  // ---- the east end: the armory, the general store, the enchanter, the jeweler ----
  building(m, 52, 14, 9, 8, 'r', 'W', 56, { shop: 'armor' });
  sign(51, 21, 'armor', "Hilde's Armory. Mail, plate and shields."); D(61, 17, 'armorstand'); D(61, 19, 'armorstand'); D(51, 18, 'shieldrack');
  building(m, 63, 13, 8, 8, 'h', 'H', 66, { shop: 'general' }, 'gable');
  sign(62, 20, 'general', "Wendell's General Goods. Torches, tools, building stock."); D(62, 15, 'sacks'); D(62, 17, 'crate'); D(62, 18, 'barrel'); D(70, 22, 'sacks');
  building(m, 46, 28, 8, 7, 'l', 'K', 49, { shop: 'enchanter' }, 'gable');
  sign(45, 34, 'ench', 'Mirela the Enchanter. Runes worked into steel.'); D(45, 30, 'crystal'); D(54, 31, 'crystal'); D(54, 33, 'crystal');
  building(m, 61, 27, 8, 7, 'r', 'W', 64, { shop: 'jeweler' });
  sign(60, 33, 'jewel', 'Silverthread Jewelry. Rings and amulets.'); D(69, 31, 'pots');
  // ---- cottages, each its own size, along the lanes ----
  const homes = [
    [26, 38, 7, 6, 'r', 'W', "The Millers' house. Nobody answers."],
    [35, 37, 8, 6, 'h', 'H', "The Smiths' house. A little clay shrine to Korrum sits on the windowsill."],
    [45, 37, 7, 7, 'l', 'K', "Councilman Voss's house. A brass plate reads: NO CALLERS."],
    [42, 3, 7, 6, 'h', 'H', "The Thatchers' cottage. A bundle of feathers hangs by the door, a hunter's offering to Veyra."],
    [52, 4, 8, 6, 'r', 'H', 'A tidy timber house. A cat watches you from the window.'],
    [63, 3, 7, 7, 'l', 'W', "The baker's house. It smells wonderful. A small sun-disc of Aurel is nailed above the door."],
    [3, 37, 7, 6, 'h', 'H', "Old Berta's cottage. It smells of lavender and woodsmoke."],
    [12, 38, 8, 7, 'r', 'W', "The Coopers' house. Barrel staves are stacked by the door."],
    [60, 35, 7, 6, 'r', 'H', "A fisherman's house. Nets hang drying on the wall, beside a blue stone carved for Nemora, the Still Water."],
  ];
  homes.forEach(([x, y, w, h, roof, wall, text], i) => building(m, x, y, w, h, roof, wall, x + Math.floor(w / 2) - (w % 2 ? 0 : 1), { dlg: 'locked', text }, i % 3 === 1 ? null : 'gable'));
  // ---- the drovers' end, east of the general store: the butcher, the barn, the stockyard and the auction ring ----
  building(m, 73, 14, 8, 8, 'r', 'W', 76, { dlg: 'locked', kind: 'butcher', text: "Garrick's Meats. Hams, sausages and fresh cuts. Garrick buys game and hides at the counter." });
  sign(81, 21, 'general', "Garrick's Meats. Fresh cuts, hams and sausages.");
  building(m, 83, 17, 4, 5, 'h', 'H', 84, { dlg: 'locked', kind: 'shed', text: 'The smokehouse. It smells of hickory and bacon. The door is latched.' }, 'gable');
  D(82, 22, 'chopblock'); D(72, 21, 'meatrack'); D(72, 19, 'barrel');
  building(m, 86, 8, 9, 10, 'h', 'H', 90, { dlg: 'locked', kind: 'barn', text: "The drovers' barn. Hay to the rafters, and the warm smell of animals." }, 'gable');
  D(85, 16, 'hay'); D(94, 18, 'hay'); D(85, 18, 'hay');
  // the stockyard: three pens off the track, with troughs and hay
  const pen = (x0, y0, x1, y1, gate) => {
    for (let x = x0; x <= x1; x++) { D(x, y0, 'rail'); if (x !== gate) D(x, y1, 'rail'); }
    for (let y = y0 + 1; y < y1; y++) { D(x0, y, 'railv'); D(x1, y, 'railv'); }
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) D(x, y, 'railpost');
  };
  pen(71, 28, 77, 34, null); pen(77, 28, 83, 34, null); pen(71, 34, 77, 40, null);
  D(72, 29, 'trough'); D(82, 29, 'trough'); D(76, 39, 'hay'); D(72, 39, 'trough');
  // the auction ring, a round of rails with benches for the bidders and the auctioneer's stand
  const rc = [89, 34], rr = 4.2;
  for (let a = 0; a < 28; a++) { const ang = a / 28 * Math.PI * 2, x = Math.round(rc[0] + Math.cos(ang) * rr), y = Math.round(rc[1] + Math.sin(ang) * rr * 0.85); if (!(y > rc[1] && Math.abs(x - rc[0]) <= 0) && !m.decor[K(x, y)]) D(x, y, Math.abs(Math.sin(ang)) > 0.7 ? 'rail' : 'railv'); }
  for (let y = 30; y <= 38; y++) for (let x = 84; x <= 94; x++) if (tileAt(m, x, y) === ',' && Math.hypot(x - rc[0], (y - rc[1]) / 0.85) < rr) setTile(m, x, y, ';');
  D(89, 29, 'podium'); D(84, 39, 'bench'); D(88, 40, 'bench'); D(92, 40, 'bench');
  sign(86, 28, 'hall', 'Brambleford Stock Auction. Beasts sold on market day, every seventh day. Bids to the auctioneer.');
  // the temple quarter
  placeHill(m);
  placeTemple(m);
  D(TQ[0] + 11, TQ[1] + 7, 'shrine_aurel'); m.trig[K(TQ[0] + 11, TQ[1] + 7)] = { shrine: 'aurel' };
  D(TQ[0] + 13, TQ[1] + 3, 'oak'); D(TQ[0] + 10, TQ[1] + 4, 'bench');
  placeParsonage(m);
  // the pond, an uneven oval
  for (let y = 41; y <= 48; y++) for (let x = 58; x <= 70; x++) { const dx = (x - 64) / (4.6 + vnoise(x / 2, y / 2) * 1.2), dy = (y - 45.2) / (2.4 + vnoise(y / 2, x / 2) * 0.6); if (dx * dx + dy * dy <= 1 && tileAt(m, x, y) === ',') setTile(m, x, y, '~'); }
  // every door gets a worn path to the nearest street
  for (const lm of m.landmarks) {
    if (lm.art !== 'building') continue;
    const sx = lm.x + lm.spec.door, sy = lm.y + lm.h;
    const seen = new Map([[K(sx, sy), null]]), q = [[sx, sy]];
    let hit = null;
    while (q.length && !hit) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy, c = tileAt(m, nx, ny), k = K(nx, ny);
        if (seen.has(k) || nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        seen.set(k, K(x, y));
        if (c === ':' || c === ';') { hit = k; break; }
        if (c === ',' || c === 'f') q.push([nx, ny]);
      }
    }
    for (let k = hit && seen.get(hit); k; k = seen.get(k)) { const [x, y] = k.split(',').map(Number); if (tileAt(m, x, y) === ',' || tileAt(m, x, y) === 'f') setTile(m, x, y, ';'); }
    if (tileAt(m, sx, sy) === ',') setTile(m, sx, sy, ';');
  }
  // street lamps along the way, wherever there's room beside the road
  for (const [x, y] of [[21, 13], [26, 13], [39, 14], [35, 17], [29, 21], [44, 21], [25, 24], [47, 23], [17, 24], [56, 23], [66, 23], [29, 33], [24, 43], [33, 45], [44, 45], [52, 47], [37, 3]])
    if (tileAt(m, x, y) === ',' && !m.decor[K(x, y)]) D(x, y, 'lamppost');
  for (const [x, y] of [[6, 35], [21, 36], [47, 36], [57, 36], [8, 11], [20, 12], [50, 11], [60, 11]]) if (tileAt(m, x, y) === ',') D(x, y, 'flowers');
  // the woods close in around the edges, unevenly
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y), reach = 1 + vnoise(x / 6, y / 6) * 4;
    if (d < reach && tileAt(m, x, y) === ',' && !m.decor[K(x, y)] && !m.trig[K(x, y)] && chance(0.55)) D(x, y, 'oak');
  }
  for (let i = 0; i < 90; i++) {
    const x = roll(3, W - 4), y = roll(3, H - 4);
    if (tileAt(m, x, y) !== ',' || m.decor[K(x, y)]) continue;
    if ([[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1]].some(([a, b]) => ':;+~QF'.includes(tileAt(m, x + a, y + b)) || m.decor[K(x + a, y + b)])) continue;
    if (chance(0.4)) D(x, y, 'oak'); else setTile(m, x, y, 'f');
  }
  placeGraveyard(m);
  const V = (spr, x, y, name, lines, extra = {}) => ({ spr, x, y, name, lines, ...extra });
  m.npcs = [
    V('bran', 17, 23, 'Bran', [], { shop: 'weapons', fixed: true }),
    V('hilde', 58, 22, 'Hilde', [], { shop: 'armor', fixed: true }),
    V('tamsin', 7, 34, 'Tamsin', [], { shop: 'alchemist', fixed: true }),
    V('mirela', 51, 35, 'Mirela', [], { shop: 'enchanter', fixed: true }),
    V('baker', 32, 23, 'the baker', ['Fresh bread! Well, fresh-ish.', 'If you bring meat back from the woods, the inn will want it.'], { fixed: true }),
    V('merchant', 41, 26, 'a cloth merchant', ['Finest wool this side of the river.', 'Caravans have been scarce since the goblin raids.'], { fixed: true }),
    V('farmer', 30, 28, 'a farmer', ['The East Field is for sale. Ask at the Town Hall.', 'Good land out the east gate. Trees, stone, and a spot for a garden.'], { fixed: true }),
    V('girl', 34, 25, 'a girl', ['My brother says the cave splits into four kingdoms down below!', 'Is Father Halvard coming back?']),
    V('berta', 8, 44, 'old Berta', ['Father Halvard carried you out of that fire himself, you know. Said it was a sign from Aurel. Never said where the fire was.', "Don't ask the council about the old days, dear. They don't like it.", "You have your grandfather's eyes. ...Did I say grandfather? Never mind me."]),
    V('voss', 37, 25, 'Councilman Voss', ['The militia will handle the Halvard matter. Go home, boy.', 'The goblins did it, mark my words. Filthy creatures.', 'Halvard should have known better than to go poking about down there.']),
    V('elsbeth', 48, 45, 'Elsbeth Voss', [], { fixed: true }),
    V('guard', 37, 4, 'the gate guard', ['The cave is up the North Road, past the old watchtower. Take torches; it is black as pitch down there.', 'Three levels down, the cave splits four ways. Goblins, rat-men, pale things, and snakes that walk.', 'Halvard went out this gate with a lantern and a satchel full of papers.'], { fixed: true }),
    V('villager1', 16, 13, 'a cooper', ['Busy day. Everyone needs barrels.', 'Bran over at the smithy makes the best hoops in the valley.']),
    V('villager2', 50, 12, 'a weaver', ['Have you seen the colors at the cloth stall? Mine are better.', 'They say the serpent folk weave silk finer than spider-thread.']),
    V('villager3', 59, 39, 'a fisherman', ['Pond trout are small this year.', 'Wolves have been coming closer to the east fields at night.']),
    V('priest', 25, 9, 'a traveling friar', ["With Father Halvard gone, someone must keep Aurel's lamps lit. You were his acolyte; it falls to you.", 'Every god has its place, child. Aurel the hearth, Veyra the green wood, Korrum the mountain. The deep folk have gods of their own.', 'Halvard spoke of you in his letters. He believed the dawn had marked you.']),
    { prop: 'dog', x: 46, y: 24, name: 'a dog', animal: 1, lines: ['The dog wags its tail.', 'The dog sniffs your boots.'] },
    { prop: 'chicken', x: 10, y: 35, name: 'a chicken', animal: 1, lines: ['Bawk.', 'The chicken eyes you suspiciously.'] },
    { prop: 'chicken', x: 58, y: 36, name: 'a chicken', animal: 1, lines: ['Bawk bawk.'] },
    V('farmer', 78, 22, 'Garrick the butcher', ['Bring me a deer and I will pay you fair for it. Wolves too, for the hides.', 'The smokehouse takes three days to do a ham right. No shortcuts.', 'Market day the drovers come down from the hills, and the ring gets loud.'], { fixed: true }),
    V('merchant', 88, 31, 'the auctioneer', ['Market day, every seventh day! Beasts in the ring at noon.', 'A good milk cow fetches forty gold. A plough horse, twice that.', 'Bid with a nod, friend. Not a wave. A wave buys you a pig.'], { fixed: true, auction: 1 }),
    V('villager3', 79, 26, 'a drover', ['Brought twelve head down from the high pastures. Wolves took two.', 'The ring is quiet today. Come back on market day.']),
    { prop: 'cow', x: 73, y: 31, name: 'a cow', animal: 1, lines: ['The cow chews, and considers you.', 'Moo.'] },
    { prop: 'cow', x: 75, y: 30, name: 'a cow', animal: 1, lines: ['The cow flicks an ear.'] },
    { prop: 'pig', x: 80, y: 31, name: 'a pig', animal: 1, lines: ['The pig grunts happily in the mud.'] },
    { prop: 'pig', x: 79, y: 32, name: 'a pig', animal: 1, lines: ['Oink.'] },
    { prop: 'sheep', x: 73, y: 37, name: 'a sheep', animal: 1, lines: ['Baa.'] },
    { prop: 'sheep', x: 75, y: 37, name: 'a sheep', animal: 1, lines: ['The sheep stares at nothing in particular.'] },
    { prop: 'horse', x: 89, y: 35, fixed: true, name: 'a horse for sale', animal: 1, lines: ['A sturdy bay mare, waiting for market day. She snorts at you.'] },
  ];
  // everyone stands somewhere they can stand
  const free = (x, y) => TILES[tileAt(m, x, y)] && TILES[tileAt(m, x, y)].walk && !m.decor[K(x, y)] && !m.trig[K(x, y)] && !m.npcs.some(o => o.x === x && o.y === y);
  for (const n of m.npcs) {
    if (free(n.x, n.y) || (n.fixed && TILES[tileAt(m, n.x, n.y)] && TILES[tileAt(m, n.x, n.y)].walk && !m.decor[K(n.x, n.y)])) continue;
    let best = null;
    for (let r = 1; r < 8 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (free(n.x + dx, n.y + dy)) best = [n.x + dx, n.y + dy];
    if (best) { n.x = best[0]; n.y = best[1]; }
  }
  return m;
}
// The North Road: from the town gate up to the cave mouth in the cliffs.
function buildWilds() {
  const W = 44, H = 28;
  const m = blankMap('wilds', W, H, ',', { lit: true, name: 'The North Road' });
  const D = (x, y, d) => { m.decor[K(x, y)] = d; };
  rect(m, 0, 0, W - 1, 3, '^');
  for (let x = 0; x < W; x++) if (chance(0.6)) setTile(m, x, 4, '^');
  let px = 22; const roadX = [];
  for (let y = H - 1; y >= 5; y--) {
    setTile(m, px, y, ';'); setTile(m, px + 1, y, ';'); roadX[y] = px;
    if (y % 3 === 0 && y < H - 3) px = clamp(px + roll(-1, 1), 17, 26);
  }
  // the Bramble runs west to east below the trail; the road crosses it on a timber bridge
  let ry = roll(20, 22);
  // the road runs straight for a few tiles either side of the bridge
  const bx0 = roadX[ry];
  for (let y = ry - 2; y <= ry + 3; y++) { setTile(m, roadX[y], y, ','); setTile(m, roadX[y] + 1, y, ','); roadX[y] = bx0; setTile(m, bx0, y, ';'); setTile(m, bx0 + 1, y, ';'); }
  const bx = new Set([bx0, bx0 + 1]);
  for (let x = 0; x < W; x++) {
    const nearRoad = [...bx].some(v => Math.abs(v - x) <= 3);
    if (!nearRoad && x % 3 === 0) ry = clamp(ry + roll(-1, 1), 19, 23);
    for (const y of [ry, ry + 1]) setTile(m, x, y, x === roadX[y] || x === roadX[y] + 1 ? 'J' : '~');
  }
  // a shallow ford a little way downstream, where you can wade across, and a few shallows along the banks
  const fx = bx0 + 9 < W - 2 ? bx0 + 9 : bx0 - 9;
  for (let x = fx - 1; x <= fx + 1; x++) for (let y = 17; y <= 26; y++) if (tileAt(m, x, y) === '~') setTile(m, x, y, 'z');
  for (let x = 0; x < W; x++) for (let y = 17; y <= 26; y++) if (tileAt(m, x, y) === '~' && tileAt(m, x, y + 1) === '~' && tileAt(m, x, y - 1) === ',' && chance(0.3)) setTile(m, x, y, 'z');
  for (let x = 0; x < W; x++) for (let y = 18; y <= 25; y++) if (tileAt(m, x, y) === ',' && ['~'].includes(tileAt(m, x, y - 1)) !== ['~'].includes(tileAt(m, x, y + 1)) && chance(0.12)) D(x, y, 'rock');
  // a hunters' trail branches west to the Whisperwood
  let ty = 16;
  for (let x = roadX[16] - 1; x >= 0; x--) { setTile(m, x, ty, ';'); if (x % 4 === 0 && x > 2) { const ny = clamp(ty + roll(-1, 1), 14, 18); setTile(m, x, ny, ';'); ty = ny; } }
  setTile(m, 0, ty, '}'); m.links[K(0, ty)] = 'f1';
  D(roadX[16] - 2, 14, 'sign'); m.trig[K(roadX[16] - 2, 14)] = { dlg: 'locked', text: 'A signpost points west: "WHISPERWOOD. Good hunting. Mind the wolves."' };
  setTile(m, px, 4, 'C'); m.links[K(px, 4)] = 'd1';
  for (const x of [22, 23]) m.trig[K(x, H - 1)] = { go: 'town', at: [36, 3] };
  D(px + 2, 6, 'sign'); m.trig[K(px + 2, 6)] = { dlg: 'locked', text: 'A weathered sign: "CAVE. KEEP OUT. By order of the Town Council." Someone has scratched "HALVARD WENT IN" underneath.' };
  D(9, 11, 'ruin');
  for (let i = 0; i < 150; i++) {
    const x = roll(0, W - 1), y = roll(5, H - 2);
    if (tileAt(m, x, y) !== ',' || m.decor[K(x, y)]) continue;
    if ([-2, -1, 1, 2].some(d => ';}'.includes(tileAt(m, x + d, y)) || ';C}'.includes(tileAt(m, x, y + d)))) continue;
    const r = Math.random();
    if (r < 0.6) D(x, y, 'pine'); else if (r < 0.75) D(x, y, 'rock'); else setTile(m, x, y, 'f');
  }
  return m;
}

const HALL_STALLS = [
  { shop: 'general', kx: 4, ky: 1, cs: [[3, 2], [4, 2], [5, 2]] },
  { shop: 'weapons', kx: 11, ky: 1, cs: [[10, 2], [11, 2], [12, 2]] },
  { shop: 'armor', kx: 19, ky: 1, cs: [[18, 2], [19, 2], [20, 2]] },
  { shop: 'jeweler', kx: 26, ky: 1, cs: [[25, 2], [26, 2], [27, 2]] },
  { shop: 'alchemist', kx: 1, ky: 7, cs: [[2, 6], [2, 7], [2, 8]] },
  { shop: 'enchanter', kx: 6, ky: 13, cs: [[5, 12], [6, 12], [7, 12]] },
  { shop: 'magic', kx: 24, ky: 13, cs: [[23, 12], [24, 12], [25, 12]] },
];
function buildHall() {
  const W = 31, H = 16;
  const m = blankMap('hall', W, H, 'w', { lit: true, name: "Merchants' Hall", theme: 'house' });
  box(m, 0, 0, W - 1, H - 1, '#');
  for (const st of HALL_STALLS) {
    for (const [x, y] of st.cs) { setTile(m, x, y, '='); m.trig[K(x, y)] = { shop: st.shop }; }
    m.npcs.push({ spr: SHOPS[st.shop].npc, x: st.kx, y: st.ky, shop: st.shop, fixed: true });
  }
  setTile(m, 29, 7, 'B'); m.trig[K(29, 7)] = { dlg: 'board' };
  for (const [x, y] of [[9, 5], [21, 5], [9, 10], [21, 10]]) m.decor[K(x, y)] = 'pillar';
  m.decor[K(28, 13)] = 'barrel'; m.decor[K(28, 14)] = 'crate';
  setTile(m, 15, H - 1, '+'); m.trig[K(15, H - 1)] = { go: 'town', at: [28, 21] };
  return m;
}

// The parsonage inside: one warm room. Your cot in the corner by the window, Halvard's chair at the hearth,
// his desk and books along the far wall, and a side door straight into the temple.
function buildParsonage() {
  const W = 10, H = 8;
  const m = blankMap('parsonage', W, H, 'w', { lit: true, name: 'The Parsonage', theme: 'house' });
  box(m, 0, 0, W - 1, H - 1, '#'); rect(m, 1, 1, W - 2, 1, '#');
  const name = P().name;
  const D = (x, y, d, tr) => { m.decor[K(x, y)] = d; if (tr) m.trig[K(x, y)] = typeof tr === 'string' ? { dlg: 'locked', text: tr } : tr; };
  D(1, 1, 'pegmace', 'Your first practice mace, retired to its peg. Halvard said you had earned a real one the day you could block him three times running.');
  D(2, 1, 'iwindow');
  D(5, 1, 'hearth', "A small fire crackles in the hearth. You've kept it going since Halvard left, the way he taught you.");
  D(7, 1, 'sundisc', { dlg: 'sundisc', text: "Aurel's sun-disc hangs on the wall. Halvard polished it every morning before the dawn service. It's beginning to tarnish." });
  D(1, 2, 'bed', { dlg: 'cot' });
  D(2, 2, 'chest', { dlg: 'mychest' });
  D(8, 2, 'bookcase', { dlg: 'books', text: "Halvard's books: hymnals, herbals, a history of the valley. Someone has cut the pages about Ashvale out of the history with a knife." });
  D(8, 3, 'desk', `A note on Halvard's desk, in his hand: "${name}, I have gone north to the caves. Something I should have told you long ago is down there, and I mean to bring it back before the council finds it. Keep the lamps lit. Do not follow me. H." That was three days ago.`);
  D(5, 4, 'armchair', "Halvard's chair. It still smells of his pipe.");
  D(2, 5, 'table');
  D(1, 6, 'basin', 'A washbasin and a cracked mirror. You look tired.');
  D(8, 6, 'strongbox', "Halvard's iron strongbox. Locked, and the key isn't on its hook. He must have taken it with him.");
  D(7, 6, 'pots');
  m.rugs = [[4, 3, 3, 2]];
  m.lights = [[5, 2, 4, 'hearth'], [8, 3, 2, 'candle']];
  setTile(m, 4, H - 1, '+'); m.trig[K(4, H - 1)] = { go: 'town', at: PARSONAGE_DOOR };
  setTile(m, W - 1, 4, '+'); m.trig[K(W - 1, 4)] = { dlg: 'temple' };
  return m;
}
function openMyChest() {
  if (S.story.chest) { msg('Your chest holds spare clothes and a bundle of letters. Nothing you need on the road.', 'talk'); return; }
  S.story.chest = 1;
  msg('Under your spare tunic: a healing draught Halvard pressed on you last winter, and two torches.', 'good');
  addItem(makeItem('pheal', 0, 1)); addItem(makeItem('torch', 0, 2));
  refresh();
}

const HOME_SITES = { house: [9, 5], garden: [9, 13], forge: [16, 5], bench: [22, 5], altar: [28, 5], mine: [31, 16] };
function buildHome() {
  const W = 40, H = 24;
  const m = blankMap('home', W, H, ',', { lit: true, name: 'Your Homestead' });
  for (let x = 0; x < W; x++) { setTile(m, x, 0, 'T'); setTile(m, x, H - 1, 'T'); }
  for (let y = 0; y < H; y++) { setTile(m, 0, y, 'T'); setTile(m, W - 1, y, 'T'); }
  setTile(m, 0, 12, 'X'); m.trig[K(0, 12)] = { go: 'town', at: [93, 24] };
  for (let x = 1; x < 20; x++) setTile(m, x, 12, ':');
  for (let y = 7; y < 12; y++) setTile(m, 19, y, ':');
  for (let x = 6; x < 32; x++) setTile(m, x, 7, ':');
  rect(m, 4, 16, 7, 19, '~');
  for (const k in HOME_SITES) { const [x, y] = HOME_SITES[k]; setTile(m, x, y, 'S'); m.trig[K(x, y)] = { site: k }; }
  return m;
}
function seedHomeNodes() {
  const m = S.maps.home; const nodes = {};
  const place = (t, n, x0, y0, x1, y1) => {
    for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
      const x = roll(x0, x1), y = roll(y0, y1);
      if (tileAt(m, x, y) !== ',' || nodes[K(x, y)]) continue;
      if (Object.values(HOME_SITES).some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) < 2)) continue;
      nodes[K(x, y)] = { t, ready: 0 }; i++;
    }
  };
  place('tree', 22, 24, 9, 38, 14);
  place('tree', 8, 2, 1, 14, 3);
  place('rock', 12, 26, 17, 38, 22);
  place('herb', 10, 10, 15, 22, 21);
  S.home.nodes = nodes;
}

// ================= the caves =================
// Map ids: d1–d3 upper caves, g1–g4 / r1–r4 / h1–h4 / s1–s4 kingdom branches, 'deep' for the Wyrm.
const FOREST_NAMES = ['The Whisperwood', 'Deep Whisperwood', 'The Old Growth'];
function mapInfo(id) {
  if (id[0] === 'f') { const n = +id.slice(1); return { kind: 'forest', lvl: n, eff: n + 1, name: FOREST_NAMES[n - 1], parent: n === 1 ? 'wilds' : 'f' + (n - 1), child: n < 3 ? 'f' + (n + 1) : null, theme: 'forest' }; }
  if (id === 'deep') return { kind: 'deep', lvl: 1, eff: 11, name: 'The Deep', parent: 'd3', theme: 'deep' };
  if (id[0] === 'd') { const n = +id.slice(1); return { kind: 'upper', lvl: n, eff: n, name: `Cave, level ${n}`, parent: n === 1 ? 'wilds' : 'd' + (n - 1), child: n < 3 ? 'd' + (n + 1) : null, theme: 'cave' }; }
  const k = id[0], n = +id.slice(1), K_ = KINGDOMS[k];
  return { kind: k, lvl: n, eff: K_.base + n, name: `${cap(K_.name)}, level ${n}`, parent: n === 1 ? 'd3' : k + (n - 1), child: n < 4 ? k + (n + 1) : null, theme: k };
}
function getMap(id) { if (!S.maps[id]) S.maps[id] = genLevel(id); return S.maps[id]; }

// The Whisperwood: open woodland with clearings and streams, one trail through it.
function genForest(id) {
  const info = mapInfo(id); const W = 60, H = 40;
  const m = blankMap(id, W, H, ',', { name: info.name, depth: info.eff, kind: 'forest', lvl: info.lvl, theme: 'forest' });
  m.outdoor = 1; m.seen = new Array(W * H).fill(0);
  const edge = (x, y) => x === 0 || y === 0 || x === W - 1 || y === H - 1;
  const dens = [0.4, 0.46, 0.5][info.lvl - 1];
  let g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => edge(x, y) || Math.random() < dens));
  for (let pass = 0; pass < 3; pass++) g = g.map((row, y) => row.map((v, x) => { if (edge(x, y)) return true; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx]) n++; return n >= 5; }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) setTile(m, x, y, 'Y'); else if (chance(0.04)) setTile(m, x, y, 'f');
  for (let i = 0; i < 6; i++) { const cx = roll(6, W - 7), cy = roll(5, H - 6), r = roll(2, 4); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) setTile(m, cx + dx, cy + dy, ','); }
  if (chance(0.75)) { let sy = roll(8, H - 9); for (let x = 1; x < W - 1; x++) { setTile(m, x, sy, '~'); if (chance(0.3)) { sy = clamp(sy + roll(-1, 1), 3, H - 4); setTile(m, x, sy, '~'); } } }
  // the trail: from the way back at the bottom to the way on at the top
  let x = roll(20, 40), prev = x; const bottomX = x; let topX = x;
  for (let y = H - 1; y >= 0; y--) {
    for (let xx = Math.min(prev, x); xx <= Math.max(prev, x) + 1; xx++) setTile(m, xx, y, ';');
    prev = x; topX = x;
    if (y % 2 === 0 && y > 1 && y < H - 2) x = clamp(x + roll(-2, 2), 4, W - 6);
  }
  setTile(m, bottomX, H - 1, '{'); m.links[K(bottomX, H - 1)] = info.parent;
  if (info.child) { setTile(m, topX, 0, '}'); m.links[K(topX, 0)] = info.child; }
  // only place things where the trail can reach
  const reach = new Set([K(bottomX, H - 1)]); const q = [[bottomX, H - 1]];
  while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, k = K(nx, ny); if (!reach.has(k) && walkable(m, nx, ny)) { reach.add(k); q.push([nx, ny]); } } }
  const spots = [...reach].map(k => k.split(',').map(Number)).filter(([sx, sy]) => ',f'.includes(tileAt(m, sx, sy)));
  const free = (far) => { for (let t = 0; t < 200; t++) { const [sx, sy] = pick(spots); if (far && Math.abs(sy - (H - 1)) < 8) continue; if (!m.mons.some(o => o.x === sx && o.y === sy) && !m.ground.some(gg => gg.x === sx && gg.y === sy)) return [sx, sy]; } return null; };
  for (let i = 0; i < 8 + info.lvl * 4; i++) { const sp = free(true); if (sp) spawnAt(m, pickMonster(m), sp[0], sp[1]); }
  if (info.lvl === 3 && !(S.bosses || {}).greymaw) { const sp = free(true); if (sp) m.mons.push(makeMonster('greymaw', sp[0], sp[1])); }
  for (let i = 0; i < 4 + info.lvl * 2; i++) { const sp = free(false); if (sp) m.ground.push({ x: sp[0], y: sp[1], mat: info.lvl === 3 && chance(0.25) ? 'moonpetal' : chance(0.6) ? 'healroot' : 'redcap', q: roll(1, 2) }); }
  if (chance(0.5)) { const sp = free(true); if (sp) m.ground.push({ x: sp[0], y: sp[1], item: randomLoot(info.eff) }); }
  return m;
}
function genLevel(id) {
  if (id[0] === 'f') return genForest(id);
  const info = mapInfo(id);
  const W = 50, H = 30;
  let m, rooms;
  for (let attempt = 0; attempt < 20; attempt++) {
    m = blankMap(id, W, H, '#', { name: info.name, depth: info.eff, kind: info.kind, lvl: info.lvl, theme: info.theme });
    m.seen = new Array(W * H).fill(0);
    rooms = [];
    for (let tries = 0; tries < 300 && rooms.length < 11; tries++) {
      const w = roll(4, 10), h = roll(3, 7), x = roll(1, W - w - 2), y = roll(1, H - h - 2);
      if (rooms.some(r => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
      rect(m, x, y, x + w - 1, y + h - 1, '.');
    }
    if (rooms.length >= 7) break;
  }
  rooms.sort((a, b) => a.cx - b.cx);
  const carveH = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) setTile(m, x, y, '.'); };
  const carveV = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) setTile(m, x, y, '.'); };
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    if (chance(0.5)) { carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx); } else { carveV(a.cy, b.cy, a.cx); carveH(a.cx, b.cx, b.cy); }
  }
  for (let i = 0; i < 2; i++) { const a = pick(rooms), b = pick(rooms); carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx); }
  // Hollows: still pools in room corners (never on a room's center row or column, so paths stay open)
  if (info.kind === 'h') for (const r of rooms.slice(1)) {
    if (r.w < 6 || r.h < 5 || !chance(0.5)) continue;
    const px = chance(0.5) ? r.x : r.cx + 1, py = chance(0.5) ? r.y : r.cy + 1;
    for (let y = py; y < Math.min(py + 2, r.cy + (py > r.cy ? 3 : 0)); y++) for (let x = px; x < px + 2; x++) if (x !== r.cx && y !== r.cy && tileAt(m, x, y) === '.') setTile(m, x, y, '~');
  }
  const first = rooms[0], last = rooms[rooms.length - 1];
  m.rooms = rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  // Gnarlhold and Sszarith keep their halls lit with braziers
  const KD = KINGDOMS[info.kind];
  if (KD && KD.braziers) for (const r of rooms) {
    if (!chance(KD.braziers)) continue;
    for (const [bx, by] of [[r.x, r.y], [r.x + r.w - 1, r.y + r.h - 1]]) {
      if (tileAt(m, bx, by) !== '.' || bx === r.cx || by === r.cy) continue;
      m.decor[K(bx, by)] = 'brazier'; m.lights.push([bx, by, 5, 'brazier']);
    }
  }
  setTile(m, first.cx, first.cy, '<'); m.links[K(first.cx, first.cy)] = info.parent;
  if (id === 'd3') {
    // the junction: four stairways down, one per kingdom, and the sealed gate to the Deep
    const picks = rooms.slice(1).sort(() => Math.random() - 0.5);
    KINGDOM_ORDER.forEach((k, i) => { const r = picks[i]; setTile(m, r.cx, r.cy, '>'); m.links[K(r.cx, r.cy)] = k + '1'; m.marks[K(r.cx, r.cy)] = k; });
    const g = picks[4]; setTile(m, g.cx, g.cy, 'G'); m.trig[K(g.cx, g.cy)] = { gate: 1 }; m.gate = [g.cx, g.cy];
    if (!S.story.halvard) { const r = picks[5] || picks[0]; m.ground.push({ x: r.x, y: r.y, story: 'halvard' }); }
  } else if (info.child) {
    setTile(m, last.cx, last.cy, '>'); m.links[K(last.cx, last.cy)] = info.child;
  }
  const occupied = (x, y) => m.mons.some(o => o.x === x && o.y === y) || m.ground.some(g => g.x === x && g.y === y) || tileAt(m, x, y) !== '.' || !!m.decor[K(x, y)];
  const freeFloor = (avoidFirst) => {
    for (let t = 0; t < 500; t++) {
      const r = pick(rooms); if (avoidFirst && r === first) continue;
      const x = roll(r.x, r.x + r.w - 1), y = roll(r.y, r.y + r.h - 1);
      if (!occupied(x, y)) return [x, y];
    }
    return null;
  };
  let veins = 0;
  for (let t = 0; t < 2000 && veins < 4 + (info.eff >> 1); t++) {
    const x = roll(1, W - 2), y = roll(1, H - 2);
    if (tileAt(m, x, y) !== '#') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(m, x + a, y + b) === '.')) { setTile(m, x, y, 'V'); veins++; }
  }
  const nMons = info.kind === 'deep' ? 6 : 4 + Math.floor(info.eff * 1.1);
  for (let i = 0; i < nMons; i++) { const p = freeFloor(true); if (p) spawnAt(m, pickMonster(m), p[0], p[1]); }
  // bosses
  const bossId = info.kind === 'deep' ? 'wyrm' : (KINGDOMS[info.kind] && info.lvl === 4 ? KINGDOMS[info.kind].boss : null);
  if (bossId && !(S.bosses || {})[bossId]) { const b = makeMonster(bossId, last.cx, last.cy); m.mons.push(b); }
  const nItems = roll(2, 4);
  for (let i = 0; i < nItems; i++) { const p = freeFloor(false); if (p) m.ground.push({ x: p[0], y: p[1], item: randomLoot(info.eff) }); }
  for (let i = 0; i < roll(3, 6); i++) { const p = freeFloor(false); if (p) m.ground.push({ x: p[0], y: p[1], gold: roll(4, 12) * info.eff + roll(0, 10) }); }
  for (let i = 0; i < roll(1, 4); i++) {
    const p = freeFloor(false); if (!p) continue;
    m.ground.push({ x: p[0], y: p[1], mat: info.eff >= 6 && chance(0.4) ? 'moonpetal' : 'redcap', q: roll(1, 2) });
  }
  if (info.eff >= 4 && chance(0.4)) { const p = freeFloor(false); if (p) m.ground.push({ x: p[0], y: p[1], mat: 'shard', q: 1 }); }
  return m;
}
function pickMonster(m) {
  let pool;
  if (m.kind === 'forest') return pick(Object.values(MONSTERS).filter(t => t.home === 'forest' && !t.boss).flatMap(t => Array(t.w[m.lvl - 1]).fill(t.id)));
  if (m.kind === 'upper') pool = Object.values(MONSTERS).filter(t => t.home === 'upper' && m.lvl >= t.lv[0] && m.lvl <= t.lv[1]);
  else if (m.kind === 'deep') pool = Object.values(MONSTERS).filter(t => KINGDOMS[t.home] && !t.boss && t.lv[0] >= 3);
  else pool = Object.values(MONSTERS).filter(t => t.home === m.kind && !t.boss && m.lvl >= t.lv[0]);
  // newly unlocked creatures show up a little more often
  const weighted = pool.flatMap(t => Array(t.home === 'upper' ? 2 : 1 + (m.lvl - (t.lv ? t.lv[0] : 0) <= 1 ? 1 : 0)).fill(t.id));
  return pick(weighted);
}
function makeMonster(id, x, y, lvlOver = 0) {
  const t = MONSTERS[id];
  const hp = Math.round(t.hp * (1 + Math.max(0, lvlOver) * 0.12) * (S && S.diff ? DIFF().mhp : 1));
  return { id, x, y, hp, mhp: hp, uid: uid() };
}
function spawnAt(m, id, x, y) {
  const t = MONSTERS[id]; const over = t.lv ? m.lvl - t.lv[0] : 0;
  m.mons.push(makeMonster(id, x, y, over));
  // wolves at the forest's edge hunt alone; packs live deeper in
  if (t.pack && !(m.kind === 'forest' && m.lvl === 1)) {
    const n = roll(1, t.pack);
    for (let i = 0; i < n; i++) {
      const spot = freeAround(m, x, y); if (spot) m.mons.push(makeMonster(id, spot[0], spot[1], over));
    }
  }
}
function freeAround(m, x, y, r = 2) {
  const p = S.player;
  for (let t = 0; t < 30; t++) {
    const nx = x + roll(-r, r), ny = y + roll(-r, r);
    if ((tileAt(m, nx, ny) === '.' || (m.outdoor && ',f'.includes(tileAt(m, nx, ny)))) && !m.decor[K(nx, ny)] && !m.mons.some(o => o.x === nx && o.y === ny) && !(p && S.mapId === m.id && p.x === nx && p.y === ny)) return [nx, ny];
  }
  return null;
}
function randomLoot(eff) {
  const maxTier = Math.min(5, 1 + Math.floor((eff + 1) / 3));
  const pool = Object.values(ITEMS).filter(t => t.tier <= maxTier && t.cat !== 'tool' && t.cat !== 'story' && (!t.rare || eff >= 8));
  const t = pick(pool);
  let ench = 0;
  if (t.slot && t.cat !== 'jewelry' && chance(0.08 + eff * 0.035)) ench = roll(1, 1 + Math.floor(eff / 3));
  if (t.slot && t.cat !== 'jewelry' && chance(0.06)) ench = -roll(1, 2);
  return makeItem(t.id, ench, t.cat === 'ammo' ? roll(6, 15) : t.stack ? roll(1, 2) : 1);
}

// ================= field of view =================
function computeFov() {
  const m = curMap(); vis = new Set();
  if (m.lit) return;
  const p = P(); const R = lightRadius(); const V = 12; const lit = litMap(m);
  for (let dy = -V; dy <= V; dy++) for (let dx = -V; dx <= V; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > V * V + 2) continue;
    const tx = p.x + dx, ty = p.y + dy;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
    // you see what your own light reaches, plus anything standing in a lit area
    if (d2 > R * R + 1 && !lit[ty * m.w + tx]) continue;
    if (los(m, p.x, p.y, tx, ty)) { vis.add(K(tx, ty)); m.seen[ty * m.w + tx] = 1; }
  }
  if (S.opts.reveal === 'rooms' && m.rooms) for (const r of m.rooms) {
    if (p.x < r.x || p.x >= r.x + r.w || p.y < r.y || p.y >= r.y + r.h) continue;
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.seen[y * m.w + x] = 1;
  }
}
function revealAll(m) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++)
    if (tileAt(m, x, y) !== '#' || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => '.<>'.includes(tileAt(m, x + a, y + b)))) m.seen[y * m.w + x] = 1;
}
function los(m, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
  let x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && (TILES[tileAt(m, x, y)] || {}).op) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}
const canSee = (x, y) => curMap().lit || vis.has(K(x, y));
const monVisible = mon => canSee(mon.x, mon.y) && (!MONSTERS[mon.id].invisible || mon.revealed || cheb(mon, P()) <= 1 || buff('waters'));
const mname = mon => mon.ename || MONSTERS[mon.id].name;
const The = mon => MONSTERS[mon.id].boss || mon.ename ? cap(mname(mon)) : 'The ' + mname(mon);
const the = mon => MONSTERS[mon.id].boss || mon.ename ? mname(mon) : 'the ' + mname(mon);

// ================= turn loop =================
function act(dx, dy) {
  if (modalOpen || dead || !S) return;
  const m = curMap(), p = P();
  if (dx === 0 && dy === 0) { endTurn(); return; }
  if (p.st.confused > 0 && chance(0.5)) { dx = roll(-1, 1); dy = roll(-1, 1); if (!dx && !dy) dx = 1; msg('You stumble around in confusion.', 'warn'); }
  const nx = p.x + dx, ny = p.y + dy;
  setFacing(p, dx, dy);
  const mon = m.mons.find(o => o.x === nx && o.y === ny);
  if (mon) { if (typeof actionBump === 'function' && actionBump(mon)) return; attack(mon); endTurn(); return; }
  // a spear reaches past an empty tile to the foe behind it
  const wt = weaponT();
  if (wt && REACH_CLS.has(wt.cls) && walkable(m, nx, ny) && !m.npcs.some(o => o.x === nx && o.y === ny)) {
    const far = m.mons.find(o => o.x === nx + dx && o.y === ny + dy && monVisible(o));
    if (far && !(typeof actionOn === 'function' && actionOn())) { attack(far, { reach: true }); endTurn(); return; }
  }
  const npc = m.npcs.find(o => o.x === nx && o.y === ny);
  if (npc) {
    if (whoOf(npc)) openTalk(whoOf(npc));
    else if (npc.auction && typeof openAuction === 'function') openAuction();
    else if (npc.shop) openShop(npc.shop);
    else msg(npc.animal ? pick(npc.lines) : `${cap(npc.name)} says: “${pick(npc.lines)}”`, 'talk');
    return;
  }
  const tile = tileAt(m, nx, ny); const trig = m.trig[K(nx, ny)];
  const node = m.id === 'home' && S.home.nodes[K(nx, ny)];
  if (node) { gatherNode(nx, ny, node); endTurn(); return; }
  if (!walkable(m, nx, ny)) {
    if (trig) { doTrigger(trig); return; }
    if (tile === 'V') { mineVein(nx, ny); endTurn(); return; }
    if (tile === '~') { if (hasRod()) openFishing(); else msg('Fish rise in the water. With a rod from Wendell\'s, you could catch some.', 'talk'); return; }
    return;
  }
  if (burden() === 2) { msg(`You're carrying too much to move (${carried()} of ${capacity()} lb). Drop something.`, 'warn'); return; }
  if (p.st.grabbed) {
    const g = m.mons.find(o => o.uid === p.st.grabbed);
    if (g && cheb(g, p) <= 1) {
      if (chance(0.25 + mod(stat('str')) * 0.06)) { msg(`You wrench yourself free of ${the(g)}!`, 'good'); p.st.grabbed = null; }
      else { msg(`${The(g)} holds you fast!`, 'bad'); endTurn(); return; }
    } else p.st.grabbed = null;
  }
  const fromX = p.x, fromY = p.y;
  p.x = nx; p.y = ny; startMove(p, fromX, fromY);
  lookHere();
  if (trig) { doTrigger(trig); return; }
  const link = m.links[K(nx, ny)];
  if (link) { travel(link); return; }
  endTurn();
}

function endTurn() {
  const p = P();
  S.turn++;
  if (S.god) { p.hp = maxHp(); p.mp = maxMp(); }
  if (p.sneak && curMap().mons.some(o => !o.hunting && !o.angry && cheb(o, p) <= 6 && monVisible(o))) useSkill('sneak', 0.5);
  const every = equipBonus('regen') ? 3 : Math.max(4, 12 - mod(stat('con')) * 2 - Math.floor(p.level / 3));
  if (S.turn % every === 0 && p.hp < maxHp() && !p.st.sick) p.hp++;
  if (S.turn % (has('meditation') ? 3 : 6) === 0 && p.mp < maxMp()) p.mp++;
  const st = p.st;
  if (st.poison > 0) {
    st.poison--;
    if (S.turn % 2 === 0) { p.hp--; if (st.poison % 4 === 0) msg('The poison burns in your veins.', 'bad'); if (p.hp <= 0) return die('poison'); }
    if (st.poison === 0) msg('The poison wears off.', 'good');
  }
  for (const [k, done] of [['sick', 'Your fever breaks.'], ['blind', 'You can see again.'], ['confused', 'Your head clears.'], ['slowed', 'You can move freely again.']]) {
    if (st[k] > 0) { st[k]--; if (!st[k]) msg(done, 'good'); }
  }
  if (p.strBuff > 0) { p.strBuff--; if (!p.strBuff) msg('Your strength returns to normal.'); }
  if (buff('regenb') && p.hp < maxHp()) p.hp++;
  for (const k in p.buffs || {}) if (p.buffs[k] > 0) { p.buffs[k]--; if (!p.buffs[k]) msg(`${BUFF_NAMES[k]} fades.`); }
  const lt = p.equip.light;
  if (lt && lt.fuel > 0 && !curMap().lit && !curMap().outdoor) {
    lt.fuel--;
    if (lt.fuel === 50) msg(`Your ${T(lt).name.toLowerCase()} is burning low.`, 'warn');
    if (lt.fuel === 0) {
      if (lt.id === 'torch') {
        p.equip.light = null;
        const spare = p.inv.find(i => i.id === 'torch');
        if (spare) { p.equip.light = splitOne(spare); msg('Your torch gutters out. You light a fresh one.', 'warn'); }
        else msg('Your torch gutters out. Darkness closes in.', 'bad');
      } else msg('Your lantern runs dry. Refill it with lamp oil.', 'bad');
    }
  }
  computeFov();
  monstersAct();
  if (dead) return;
  const m = curMap();
  if (m.seen && S.turn % 70 === 0 && m.mons.length < 18 && chance(0.5)) {
    for (let t = 0; t < 40; t++) {
      const x = rnd(m.w), y = rnd(m.h);
      if ((tileAt(m, x, y) === '.' || (m.outdoor && tileAt(m, x, y) === ',')) && !vis.has(K(x, y)) && !m.mons.some(o => o.x === x && o.y === y)) { spawnAt(m, pickMonster(m), x, y); break; }
    }
  }
  if (S.dayT0 === undefined) S.dayT0 = S.turn - (S.turn % DAY_TURNS);
  if (S.turn - S.dayT0 >= DAY_TURNS) newDay('time');
  computeFov();
  render();
}

function monstersAct() {
  const m = curMap(), p = P();
  const slowNow = (p.st.slowed > 0 || burden() >= 1 || p.sneak) && S.turn % 2 === 0;
  for (const mon of [...m.mons]) {
    if (!m.mons.includes(mon)) continue;
    const t = MONSTERS[mon.id];
    if (mon.poison > 0) {
      mon.poison--; mon.hp -= 2;
      if (mon.hp <= 0) { if (monVisible(mon)) msg(`${The(mon)} succumbs to poison.`, 'kill'); killMonster(mon); continue; }
    }
    if (mon.stagger > 0) { mon.stagger--; continue; } // reeling from a heavy blow
    if (mon.lungeCd > 0) mon.lungeCd--;
    if (mon.lunge) continue; // crouched to spring
    let acts = t.slow ? (S.turn % 2 ? 0 : 1) : t.fast ? 2 : 1;
    if (mon.slowT > 0) { mon.slowT--; if (S.turn % 2) acts = 0; }
    if (buff('haste') && S.turn % 2) acts = 0;
    if (slowNow) acts++;
    for (let i = 0; i < acts && m.mons.includes(mon); i++) { monsterStep(mon); if (dead) return; }
    if (!mon.announced && t.boss && monVisible(mon)) { mon.announced = 1; msg(`${The(mon)} is here!`, 'warn'); }
  }
}
function monsterStep(mon) {
  const m = curMap(), p = P(), t = MONSTERS[mon.id];
  const dist = cheb(mon, p);
  // creatures without darksight only notice you when you're lit up or right next to them
  // how far away this creature can pick you out: sneaking and Light Step shrink it; invisibility hides you from eyes
  let sightR = has('lightstep') && !t.darksight && !t.boss ? 6 : 9;
  if (p.sneak) { const torch = !m.lit && !m.outdoor && lightRadius() >= 4; sightR = t.darksight ? 5 : torch ? 5 : 3; if (has('lightstep')) sightR--; }
  const unseen = buff('invis') && !t.senses;
  const sees = !unseen && ((dist <= sightR && (t.darksight || playerLit() || dist <= 2) && los(m, mon.x, mon.y, p.x, p.y)) || (t.senses && dist <= 12));
  if (mon.sleep > 0) { mon.sleep--; return; }
  if (mon.fear > 0) { mon.fear--; stepAway(mon); return; }
  if (mon.flee) {
    mon.fleeT = (mon.fleeT || 15) - 1;
    stepAway(mon);
    if (mon.fleeT <= 0 && !canSee(mon.x, mon.y)) { m.mons = m.mons.filter(o => o !== mon); }
    return;
  }
  // game animals bolt when they see you, and only fight back when cornered
  if (t.prey && buff('hunt')) { if (chance(0.3)) stepMon(mon, roll(-1, 1), roll(-1, 1)); return; }
  if (t.prey) {
    if (dist === 1 && (mon.angry ? chance(0.5) : chance(0.2))) return monsterAttack(mon);
    if ((dist <= 7 && los(m, mon.x, mon.y, p.x, p.y)) || mon.angry) { if (t.erratic && chance(0.4)) stepMon(mon, roll(-1, 1), roll(-1, 1)); else stepAway(mon); return; }
    if (chance(0.3)) stepMon(mon, roll(-1, 1), roll(-1, 1));
    return;
  }
  // boars mind their own business until you get close or hurt them
  if (t.shy && !mon.angry && dist > t.shy) { if (chance(0.25)) stepMon(mon, roll(-1, 1), roll(-1, 1)); return; }
  if (dist === 1) {
    if (t.explode) return explode(mon);
    return monsterAttack(mon);
  }
  if (t.reach && dist === 2 && los(m, mon.x, mon.y, p.x, p.y)) {
    const mx = mon.x + Math.sign(p.x - mon.x), my = mon.y + Math.sign(p.y - mon.y);
    if (walkable(m, mx, my) && !m.mons.some(o => o.x === mx && o.y === my)) return monsterAttack(mon, true);
  }
  if (t.heals && chance(0.35)) {
    const hurt = m.mons.find(o => o !== mon && o.hp < o.mhp * 0.6 && cheb(o, mon) <= 6 && los(m, mon.x, mon.y, o.x, o.y)) || (mon.hp < mon.mhp * 0.5 && t.boss ? mon : null);
    if (hurt) {
      const h = roll(8, 16) + (t.boss ? 10 : 0); hurt.hp = Math.min(hurt.mhp, hurt.hp + h);
      if (monVisible(mon)) msg(hurt === mon ? `${The(mon)} mends its own wounds.` : `${The(mon)} heals ${the(hurt)}.`, 'warn');
      return;
    }
  }
  if (t.summon && sees && chance(t.boss ? 0.2 : 0.12) && m.mons.length < 26) {
    const n = t.boss ? 2 : 1; let made = 0;
    for (let i = 0; i < n; i++) { const s = freeAround(m, mon.x, mon.y, 2); if (s) { m.mons.push(makeMonster(t.summon, s[0], s[1])); made++; } }
    if (made && monVisible(mon)) msg(t.summon === 'r_swarm' ? `${The(mon)} squeals, and rats pour out of the cracks!` : `${The(mon)} bellows for help!`, 'warn');
    if (made) return;
  }
  if (t.ranged && sees && dist <= t.ranged.r && los(m, mon.x, mon.y, p.x, p.y) && chance(0.55)) return rangedAttack(mon);
  if (t.slowgaze && sees && dist <= 4 && !p.st.slowed && chance(0.3)) { p.st.slowed = has('resolve') ? 3 : 6; msg(`${The(mon)} fixes you with its gaze. Your limbs turn heavy!`, 'bad'); return; }
  if (t.erratic && chance(0.5)) { stepMon(mon, roll(-1, 1), roll(-1, 1)); return; }
  if (sees || mon.hunting > 0) {
    mon.hunting = sees ? 6 : mon.hunting - 1;
    const opts = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      opts.push([Math.max(Math.abs(mon.x + dx - p.x), Math.abs(mon.y + dy - p.y)) + Math.random() * 0.1, dx, dy]);
    }
    opts.sort((a, b) => a[0] - b[0]);
    for (const [, dx, dy] of opts.slice(0, 4)) if (stepMon(mon, dx, dy)) break;
  } else if (chance(0.25)) stepMon(mon, roll(-1, 1), roll(-1, 1));
}
function stepAway(mon) {
  const p = P(); let best = null, bd = -1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const d = Math.max(Math.abs(mon.x + dx - p.x), Math.abs(mon.y + dy - p.y));
    if (d > bd && (dx || dy) && walkable(curMap(), mon.x + dx, mon.y + dy)) { bd = d; best = [dx, dy]; }
  }
  if (best) stepMon(mon, best[0], best[1]);
}
function stepMon(mon, dx, dy) {
  const m = curMap(), p = P(); const nx = mon.x + dx, ny = mon.y + dy;
  if (!(dx || dy)) return false;
  const tile = tileAt(m, nx, ny);
  if (!walkable(m, nx, ny) || tile === '<' || tile === '>') return false;
  if (nx === p.x && ny === p.y) return false;
  if (m.mons.some(o => o !== mon && o.x === nx && o.y === ny)) return false;
  const fx = mon.x, fy = mon.y; mon.x = nx; mon.y = ny; startMove(mon, fx, fy); return true;
}
// Townsfolk stroll: each picks a spot a few steps off, walks there at an easy pace, lingers, then picks another.
// It runs on its own clock (walk.js), not on your turns, so they move like people rather than twitching when you do.
function wanderNpcs() {
  const m = curMap(), p = P(), now = performance.now();
  const free = (n, x, y) => walkable(m, x, y) && !m.trig[K(x, y)] && !m.links[K(x, y)] && !(x === p.x && y === p.y) && !m.npcs.some(o => o !== n && o.x === x && o.y === y) && !m.mons.some(o => o.x === x && o.y === y);
  for (const n of m.npcs) {
    if (n.fixed) continue;
    const mv = motion.get(n); if (mv && now - mv.t0 < mv.dur - 30) continue; // still mid-step
    if (n.rest && now < n.rest) continue;
    if (!n.goal || (n.goal[0] === n.x && n.goal[1] === n.y)) {
      if (n.goal) { n.goal = null; n.rest = now + 1500 + Math.random() * 5000; continue; } // arrived: linger a while
      if (Math.random() < 0.6) { n.rest = now + 800 + Math.random() * 2500; continue; }
      const home = n.home || (n.home = [n.x, n.y]);
      for (let tries = 0; tries < 8 && !n.goal; tries++) { const gx = home[0] + roll(-4, 4), gy = home[1] + roll(-3, 3); if ((gx !== n.x || gy !== n.y) && free(n, gx, gy)) n.goal = [gx, gy]; }
      if (!n.goal) continue;
    }
    const dx = Math.sign(n.goal[0] - n.x), dy = Math.sign(n.goal[1] - n.y);
    const opts = [[dx, dy], [dx, 0], [0, dy]].filter(([a, b]) => a || b);
    const step = opts.find(([a, b]) => free(n, n.x + a, n.y + b));
    if (!step) { n.goal = null; n.rest = now + 600; continue; }
    const fx = n.x, fy = n.y; n.x += step[0]; n.y += step[1]; startMove(n, fx, fy);
  }
}

// ================= combat =================
const HIT_VERBS = {
  sword: ['You slash %m', 'You cut %m', 'Your blade bites into %m', 'You slice %m'],
  dagger: ['You stab %m', 'You pierce %m', 'You slip your dagger into %m'],
  axe: ['You hack at %m', 'You chop into %m', 'You cleave %m'],
  mace: ['You smash %m', 'You batter %m', 'You crack %m', 'You hammer %m'],
  spear: ['You spear %m', 'You run %m through', 'You thrust at %m'],
  bow: ['Your arrow strikes %m', 'You shoot %m', 'An arrow thuds into %m'],
  staff: ['You crack %m with your staff', 'You strike %m', 'You whack %m'],
  crossbow: ['Your bolt punches into %m', 'You shoot %m', 'A bolt slams into %m'],
  warhammer: ['You bring your hammer down on %m', 'You crush %m', 'You stagger %m with a great blow'],
  flail: ['Your flail whips into %m', 'You lash %m', 'The ball cracks against %m'],
  greatsword: ['You cleave into %m', 'Your greatsword carves %m', 'You hew at %m'],
  rapier: ['You lunge at %m', 'You run %m through', 'Your point finds %m'],
  halberd: ['You hook and hack %m', 'Your halberd bites into %m', 'You chop down at %m'],
  fist: ['You punch %m', 'You pummel %m', 'You kick %m'],
};
const MISSES = ['You miss %m.', '%M dodges your attack.', 'Your swing goes wide.', '%M ducks under your blow.', 'Your attack glances off %m.', '%M twists away from your strike.'];
const SHOT_MISSES = ['Your arrow flies wide.', 'Your arrow clatters off the wall.', '%M dodges your arrow.'];
const KILLS = ['You have slain %m!', '%M collapses in a heap.', 'You kill %m.', '%M falls and does not rise.', '%M is destroyed!'];
const MON_MISS = ['%M misses you.', '%M lunges at you but misses.', "You dodge %m's attack.", "Your armor turns aside %m's blow.", '%M snaps at the air.'];
const fill = (s, mon) => s.replace('%m', the(mon)).replace('%M', The(mon));

function attack(mon, opts = {}) {
  const p = P(), t = MONSTERS[mon.id];
  const wt = weaponT(); const ranged = !!opts.ranged;
  const cls = !wt ? 'fist' : (RANGED_CLS.has(wt.cls) && !ranged) ? 'fist' : wt.cls;
  const dtype = wt && cls !== 'fist' ? wt.dtype : 'blunt';
  const r = roll(1, 20);
  const unaware = !mon.hunting && !mon.angry && !t.boss;
  playAnim(p, ranged ? 'bow' : 'atk', mon);
  if (p.buffs && p.buffs.invis) { p.buffs.invis = 0; msg('You flicker back into sight.'); }
  mon.sleep = 0;
  const def = t.def - (cls === 'mace' ? 3 + rank('mace') * 2 : cls === 'staff' ? rank('mace') * 2 : 0);
  mon.revealed = 1; mon.hunting = 8; mon.angry = 1;
  if (r !== 20 && r + toHit(ranged) < 10 + def) { msg(fill(pick(ranged ? (wt && wt.cls === 'crossbow' ? SHOT_MISSES.map(s => s.replace('arrow', 'bolt')) : SHOT_MISSES) : MISSES), mon)); addFloat(mon.x, mon.y, 'miss', '#c9bca6'); return; }
  const [a, b] = dmgRange(ranged);
  let d = roll(a, b);
  const crit = r >= critOn();
  if (crit) d *= 2;
  const sneak = unaware ? (cls === 'dagger' ? 3 : 2) + (has('shadowstrike') ? 1 : 0) : 1;
  d *= sneak;
  let mult = (t.res || {})[dtype] || 1;
  if (wt && wt.grade === 'silver' && t.undead && cls !== 'fist') mult *= 1.5;
  d = Math.max(1, Math.round(d * mult));
  let fire = 0;
  if (buff('forge') && cls !== 'fist') { fire = roll(1, 6); d += fire; }
  mon.hp -= d; playAnim(mon, 'hurt', p);
  useSkill(WEAPON_SKILL[cls] || 'blunt', 1 + Math.min(4, d / 8) + (t.boss ? 2 : 0));
  if (sneak > 1) useSkill('sneak', 3);
  addFloat(mon.x, mon.y, d, sneak > 1 ? '#d6a8ff' : crit ? '#ffd27a' : mult > 1 ? '#ffb86b' : '#ffffff', crit || sneak > 1);
  let line = (sneak > 1 ? `Sneak attack! ×${sneak} ` : '') + (crit ? 'A critical hit! ' : '') + fill(pick(HIT_VERBS[cls]), mon);
  const frac = d / mon.mhp;
  line += frac >= 0.6 ? ' with a mighty blow' : frac < 0.1 ? ', barely scratching it' : '';
  line += ` (${d}).`;
  if (fire) line += ' Gharrok\'s fire licks along the wound.';
  if (buff('serpent') && mon.hp > 0) { mon.poison = 5; }
  if (mult < 1) line += ' It shrugs off much of the blow.';
  else if (mult > 1) line += ' A telling blow!';
  if (wt && wt.venom && mon.hp > 0) { mon.poison = 5; line += ' Venom seeps into the wound.'; }
  if (mon.hp <= 0) { msg(line, 'hit'); killMonster(mon); }
  else { if (mon.hp < mon.mhp * 0.3) line += ` ${The(mon)} is badly wounded.`; msg(line, 'hit'); }
  // axes can carry through into a second foe
  if (cls === 'axe' && !opts.cleave) {
    const others = curMap().mons.filter(o => o !== mon && cheb(o, p) === 1);
    const targets = wt.cleaveAll ? others : (others.length && chance(0.4 + rank('axe') * 0.15) ? [pick(others)] : []);
    for (const o of targets) {
      const d2 = Math.max(1, Math.round(roll(a, b) / 2)); o.hp -= d2;
      msg(`Your swing carries through into ${the(o)} (${d2}).`, 'hit');
      if (o.hp <= 0) killMonster(o);
    }
  }
}
// ---- target lock: the nearest foe is locked automatically; Tab or a click changes it ----
const RANGE = 9;
let targetUid = null, targetPinned = false;
function inRange(o) { const m = curMap(), p = P(); return monVisible(o) && cheb(o, p) <= RANGE && los(m, p.x, p.y, o.x, o.y); }
function targetsInView() { const p = P(); return curMap().mons.filter(inRange).sort((a, b) => cheb(a, p) - cheb(b, p) || (a.uid < b.uid ? -1 : 1)); }
function currentTarget() {
  if (!S) return null;
  const m = curMap(); let t = m.mons.find(o => o.uid === targetUid);
  if (t && inRange(t)) return t;
  // the lock lapses when its target dies or slips out of sight; take the nearest foe instead
  // hostile creatures come before game animals
  const list = targetsInView();
  t = list.find(o => !MONSTERS[o.id].prey) || list[0] || null;
  targetUid = t ? t.uid : null; targetPinned = false;
  return t;
}
function cycleTarget(dir) {
  if (modalOpen || dead || !S) return;
  const list = targetsInView(); if (!list.length) { msg('There is nothing in range to target.'); return; }
  const cur = list.findIndex(o => o.uid === targetUid);
  const t = list[((cur < 0 ? -1 : cur) + (dir || 1) + list.length) % list.length];
  targetUid = t.uid; targetPinned = true; renderMap(); renderTargetCard();
}
// short-lived streaks from the hero to whatever was shot or struck by a spell
let tracers = [];
function addTracer(o, color) { const p = P(); tracers.push({ x0: p.x, y0: p.y, x1: o.x, y1: o.y, color, t0: performance.now() }); if (!floatRAF) floatRAF = requestAnimationFrame(floatTick); }
function fire() {
  if (modalOpen || dead || !S) return;
  const p = P(), wt = weaponT();
  if (!wt || !RANGED_CLS.has(wt.cls)) { msg('You need a bow or crossbow in hand to shoot. Bran sells them.', 'warn'); return; }
  // a crossbow has to be wound again after every shot: that takes a turn of its own
  if (wt.cls === 'crossbow' && p.cbSpent) { p.cbSpent = 0; playAnim(p, 'work'); msg('You crank the crossbow back and set a fresh bolt.'); endTurn(); return; }
  const arrows = p.inv.find(it => it.id === 'arrows');
  if (!arrows) { msg("You're out of arrows.", 'warn'); return; }
  const m = curMap();
  const tgt = currentTarget();
  if (!tgt) { msg('There is nothing in range to shoot at.'); return; }
  removeOne(arrows);
  const tx = tgt.x, ty = tgt.y;
  addTracer(tgt, '#f4ecdf');
  attack(tgt, { ranged: true });
  if (wt.cls === 'crossbow') p.cbSpent = 1;
  if (chance(has('fletcher') ? 0.8 : 0.5)) m.ground.push({ x: tx, y: ty, item: makeItem('arrows', 0, 1) });
  endTurn();
}
// Creatures drop what they could carry. Beasts have no pockets: they leave hide, meat, silk and bone,
// never coin or gear. Only things with hands (goblins, rat folk, Hollowfolk, serpent folk, the dead) carry loot.
const BEASTS = new Set(['rat', 'bat', 'viper', 'cspider', 'slime', 'h_hound', 'h_crawler', 's_constrictor', 's_basilisk', 'r_swarm', 'rabbit', 'pheasant', 'deer', 'boar', 'wolf', 'bear', 'greymaw', 'wyrm']);
const BEAST_EXTRA = { bat: [['hide', 0.2]], r_swarm: [['hide', 0.3]], h_crawler: [['gel', 0.4]], viper: [['bone', 0.2]] };
function killMonster(mon) {
  const m = curMap(), p = P(), t = MONSTERS[mon.id];
  if (!m.mons.includes(mon)) return;
  msg(fill(pick(KILLS), mon), 'kill');
  m.mons = m.mons.filter(o => o !== mon);
  if (p.st.grabbed === mon.uid) p.st.grabbed = null;
  p.kills++;
  if (mon.loot) m.ground.push({ x: mon.x, y: mon.y, gold: mon.loot });
  if (rank('skinner')) { const beast = (t.drop || []).map(d => d[0]).filter(x => ['hide', 'pelt', 'meat'].includes(x)); if (beast.length && chance(0.4 * rank('skinner'))) m.ground.push({ x: mon.x, y: mon.y, mat: pick(beast), q: 1 }); }
  const carrier = !BEASTS.has(mon.id);
  for (const [mat, c] of BEAST_EXTRA[mon.id] || []) if (chance(c)) m.ground.push({ x: mon.x, y: mon.y, mat, q: 1 });
  if (carrier && t.gold && chance(t.boss ? 1 : 0.7)) m.ground.push({ x: mon.x, y: mon.y, gold: Math.round(roll(t.gold / 2, t.gold * 1.5) * (equipBonus('luck') ? 1.3 : 1) * DIFF().gold) });
  for (const [mat, c] of t.drop || []) if (chance(c)) m.ground.push({ x: mon.x, y: mon.y, mat, q: 1 });
  if (carrier && chance(t.boss ? 1 : 0.07 + m.depth * 0.01)) m.ground.push({ x: mon.x, y: mon.y, item: randomLoot(m.depth + (t.boss ? 3 : 0)) });
  if (t.boss) {
    S.bosses[mon.id] = true;
    const k = KINGDOMS[t.home];
    if (k) {
      m.ground.push({ x: mon.x, y: mon.y, item: makeItem(k.seal) });
      m.ground.push({ x: mon.x, y: mon.y, item: makeItem(k.unique) });
      msg(`${The(mon)} is dead. Something heavy and gold clatters to the floor: the Seal of ${k.name.replace(/^the /, 'the ')}.`, 'level');
    } else if (mon.id === 'greymaw') {
      m.ground.push({ x: mon.x, y: mon.y, item: makeItem('greymawfang') });
      msg('Greymaw falls at last. The forest seems to breathe again. You pull a great fang from its jaw.', 'level');
    } else {
      S.wyrmSlain = true;
      m.ground.push({ x: mon.x, y: mon.y, item: makeItem('wyrmheart') });
      msg('The Deep Wyrm is dead. The whole mountain seems to sigh. Brambleford is safe, for now.', 'level');
    }
  }
  // killing teaches nothing by itself; the blows you landed already did. Dressing a beast teaches survival.
  if (BEASTS.has(mon.id)) useSkill('survival', 1.5);
}
function gainXp(n) {
  const p = P(); p.xp += n;
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level); p.level++;
    p.attrPts++; p.skillPts++;
    p.hp = maxHp(); p.mp = maxMp();
    msg(`Welcome to level ${p.level}! You gain an attribute point and a perk point.`, 'level');
  }
}
function applyEffect(fx, mon) {
  const p = P(), st = p.st;
  if (fx === 'poison') { if (equipBonus('nopoison') || buff('serpent')) return ''; st.poison = Math.max(st.poison || 0, has('toxicology') ? 5 : 10); return ' You are poisoned!'; }
  if (fx === 'sick') { st.sick = Math.max(st.sick || 0, 60); return ' You feel feverish and weak.'; }
  if (fx === 'blind') { st.blind = Math.max(st.blind || 0, 6); computeFov(); return ' You are blinded!'; }
  if (fx === 'confuse') { st.confused = Math.max(st.confused || 0, has('resolve') ? 2 : 5); return ' Your thoughts swim.'; }
  return '';
}
function monsterAttack(mon, reach) {
  const p = P(), t = MONSTERS[mon.id];
  playAnim(mon, 'atk', p);
  const r = roll(1, 20);
  const dodge = burden() ? 0 : equipBonus('dodge');
  if (dodge && chance(dodge)) { msg(`You twist aside from ${the(mon)}.`); return; }
  if (r !== 20 && r + t.atk < defense()) { msg(fill(pick(MON_MISS), mon)); if (p.equip.shield) useSkill('block', 0.6); return; }
  // a shield can turn a blow aside entirely; the better you are with it, the more often
  if (p.equip.shield && chance((has('guardian') ? 0.125 : 0) + 0.03 + skillLv('block') / 500)) { msg(`You catch ${the(mon)}'s blow on your shield.`, 'good'); addFloat(p.x, p.y, 'block', '#bcd0ff'); useSkill('block', 2); return; }
  let d = Math.max(1, Math.round(roll(t.dmg[0], t.dmg[1]) * DIFF().mdmg));
  if (r === 20) d = Math.round(d * 1.5);
  let ambush = false;
  if (t.invisible && !mon.revealed) { d *= 2; ambush = true; mon.revealed = 1; }
  p.hp -= d; addFloat(p.x, p.y, d, '#ff6b6f', d >= maxHp() * 0.25); playAnim(p, 'hurt', mon);
  if (p.equip.armor) useSkill('armor', 0.8 + d / 10);
  let line = ambush ? `${The(mon)} strikes from nowhere! (${d})` : `${The(mon)} ${pick(t.verb)} you${reach ? ' from two paces away' : ''} (${d}).`;
  if (t.poison && chance(0.35)) line += applyEffect('poison');
  if (t.sick && chance(0.35)) line += applyEffect('sick');
  if (t.grab && !p.st.grabbed && chance(0.4)) { p.st.grabbed = mon.uid; line += ' It coils around you!'; }
  if (t.steal && p.gold > 0 && chance(0.5)) {
    const amt = Math.min(p.gold, roll(10, 25) + curMap().depth * 4);
    p.gold -= amt; mon.loot = (mon.loot || 0) + amt; mon.flee = 1; mon.fleeT = 15;
    line += ` It snatches ${amt} gold and scurries off!`;
  }
  msg(line, 'bad');
  secondWind();
  if (p.hp <= 0) die(mname(mon));
}
function secondWind() {
  const p = P();
  if (!has('secondwind') || p.hp <= 0 || p.hp >= maxHp() / 4 || p.windDay === S.day) return;
  p.windDay = S.day; const h = Math.round(maxHp() * 0.3); p.hp += h; addFloat(p.x, p.y, '+' + h, '#8fd16a', true);
  msg('A second wind surges through you!', 'good');
}
function rangedAttack(mon) {
  const p = P(), t = MONSTERS[mon.id], R = t.ranged;
  const r = roll(1, 20);
  const target = R.magic ? 10 + mod(stat('dex')) + Math.floor(stat('int') / 6) : defense();
  if (r !== 20 && r + t.atk < target) { msg(`${The(mon)} ${R.verb} you, but misses.`); return; }
  const d = Math.max(1, Math.round(roll(R.dmg[0], R.dmg[1]) * DIFF().mdmg));
  p.hp -= d; addFloat(p.x, p.y, d, '#ff6b6f');
  if (p.equip.armor && !R.magic) useSkill('armor', 0.8 + d / 10);
  let line = `${The(mon)} ${R.verb} you (${d}).`;
  if (R.fx && chance(0.5)) line += applyEffect(R.fx);
  msg(line, 'bad');
  secondWind();
  if (p.hp <= 0) die(mname(mon));
}
function explode(mon) {
  const m = curMap(), p = P(), t = MONSTERS[mon.id];
  const d = Math.round(roll(t.explode[0], t.explode[1]) * DIFF().mdmg);
  msg(`${The(mon)} lights a fuse and the bomb goes off!`, 'bad');
  m.mons = m.mons.filter(o => o !== mon);
  p.hp -= d; msg(`The blast hits you (${d}).`, 'bad');
  for (const o of [...m.mons]) if (cheb(o, mon) <= 1) { o.hp -= d; if (o.hp <= 0) { m.mons = m.mons.filter(x => x !== o); if (monVisible(o)) msg(`${The(o)} is caught in the blast.`); } }
  if (p.hp <= 0) die('a goblin bomb');
}
function die(cause) {
  const p = P();
  if (has('chosen') && p.chosenDay !== S.day) {
    p.chosenDay = S.day; p.hp = Math.max(1, Math.round(maxHp() / 4));
    msg('Darkness takes you... and then golden light. Aurel will not let you fall today.', 'level');
    addFloat(p.x, p.y, '+' + p.hp, '#ffd27a', true); render(); return;
  }
  if (S.diff === 'story' && !S.hardcore) {
    const lost = Math.floor(p.gold / 4); p.gold -= lost; p.hp = maxHp(); p.mp = maxMp(); p.st = {};
    msg(`Everything goes dark. You wake on the cold floor of the Temple of the Dawn, ${lost ? `${lost} gold lighter` : 'empty-handed'}, but alive.`, 'level');
    goMap('town', TEMPLE_OUT[0], TEMPLE_OUT[1]); autosave(); return;
  }
  dead = true; P().hp = 0; render();
  const where = curMap().name;
  if (typeof cxFallen === 'function') cxFallen(cause, where);
  if (DIFF().final || S.hardcore) { eraseSave(); openModal('Your story ends', `<p class="lead">You were killed by ${/^(poison|a |the )/.test(cause) || /^[A-Z]/.test(cause) ? esc(cause) : 'a ' + esc(cause)} in ${esc(where)}.</p><p>${S.hardcore ? 'Hardcore' : 'Ironman'}: there is no going back. Level ${P().level} · ${P().kills} foes slain · day ${S.day}.</p><div class="btnrow"><button class="btn default" data-a="newgame">Begin a new life</button></div>`, { noClose: true }); return; }
  openModal('You have died', `
    <p class="lead">You were killed by ${/^(poison|a |the )/.test(cause) || /^[A-Z]/.test(cause) ? esc(cause) : 'a ' + esc(cause)} in ${esc(where)}.</p>
    <p>Level ${P().level} · ${P().kills} monsters slain · ${P().gold} gold.</p>
    <div class="btnrow"><button class="btn" data-a="loadsave">Load last save</button><button class="btn" data-a="newgame">Start over</button></div>`, { noClose: true });
}

// ================= moving between maps =================
// Place a god's shrine on its level the first time you arrive there.
function ensureShrine(m) {
  const god = GOD_ORDER.find(g => GODS[g].map === m.id);
  if (!god || m.shrine || m.lit) return;
  const p = P();
  for (let t = 0; t < 800; t++) {
    const x = roll(2, m.w - 3), y = roll(2, m.h - 3); const c = tileAt(m, x, y);
    if (!(c === '.' || (m.outdoor && c === ','))) continue;
    if (m.decor[K(x, y)] || m.links[K(x, y)] || m.trig[K(x, y)] || m.ground.some(g => g.x === x && g.y === y) || Math.abs(x - p.x) + Math.abs(y - p.y) < 8) continue;
    let open = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && walkable(m, x + dx, y + dy)) open++;
    if (open < 8) continue;
    m.decor[K(x, y)] = 'shrine_' + god; m.trig[K(x, y)] = { shrine: god }; m.shrine = [x, y];
    if (god === 'nemora') for (const [dx, dy] of [[2, 0], [2, 1], [3, 0], [3, 1]]) if (tileAt(m, x + dx, y + dy) === '.' && !m.links[K(x + dx, y + dy)]) setTile(m, x + dx, y + dy, '~');
    if (god === 'gharrok') { m.lights.push([x, y, 4, 'brazier']); setLit(m, null); }
    return;
  }
}
function goMap(id, x, y) {
  S.mapId = id; const p = P(); p.x = x; p.y = y;
  ensureShrine(S.maps[id]);
  p.st.grabbed = null;
  const m = S.maps[id];
  if (!m.lit && S.opts.reveal === 'open' && !m.revealed) { revealAll(m); m.revealed = 1; }
  computeFov(); render();
}
function travel(to) {
  const from = S.mapId; const p = P();
  if (S.maps[to] && S.maps[to].lit) {
    const sm = S.maps[to]; const lk = Object.keys(sm.links).find(k => sm.links[k] === from);
    const [sx, sy] = lk.split(',').map(Number);
    msg(from[0] === 'f' ? 'You step out of the trees onto the North Road.' : 'You climb back out into the daylight.'); p.lastDungeon = from; goMap(to, sx, sy); autosave(); return;
  }
  const m = getMap(to);
  const back = Object.keys(m.links).find(k => m.links[k] === from) || Object.keys(m.links).find(k => m.links[k] === mapInfo(to).parent);
  const [x, y] = back.split(',').map(Number);
  const deeper = mapInfo(to).parent === from;
  if (deeper) {
    const info = mapInfo(to);
    if (info.kind === 'forest') msg(['You follow the trail into the Whisperwood. Birdsong, and somewhere far off, a howl.', 'The trees close in and the trail narrows. Claw marks score the bark here.', 'Ancient trees, wide as houses. The forest is silent. Something large is watching.'][info.lvl - 1]);
    else if (to === 'd1') msg('You climb down into the dark cave.');
    else if (info.kind !== 'upper' && info.lvl === 1 && KINGDOMS[info.kind]) msg(KINGDOMS[info.kind].stairs);
    else if (to === 'deep') msg('You descend into the Deep. The air is hot and smells of sulfur.', 'warn');
    else msg(`You descend to ${info.name.replace(/^./, c => c.toLowerCase())}.`);
    if (info.kind === 'upper' && info.lvl === 3 && !S.story.junction) { S.story.junction = 1; msg('The tunnels split here. Four stairways lead down, each carved in a different style, and a great sealed door stands among them.', 'warn'); }
    if (KINGDOMS[info.kind] && info.lvl === 4 && !(S.bosses[KINGDOMS[info.kind].boss])) msg(`This is the heart of ${KINGDOMS[info.kind].name}. Its ruler is near.`, 'warn');
  } else msg(m.outdoor ? `You head back along the trail to ${m.name.replace(/^The /, 'the ')}.` : `You climb up to ${m.name.replace(/^./, c => c.toLowerCase())}.`);
  p.lastDungeon = to;
  goMap(to, x, y);
}
function doTrigger(tr) {
  const p = P();
  if (tr.go === 'hall') { msg("You step into the Merchants' Hall. The smell of oil, leather and incense."); goMap('hall', 15, 14); return; }
  if (tr.go === 'town') { if (S.mapId === 'parsonage') msg('You step out into Brambleford. The temple bell is silent.'); goMap('town', tr.at[0], tr.at[1]); autosave(); return; }
  if (tr.go === 'parsonage') { msg('You step into the parsonage. Woodsmoke and old paper.'); goMap('parsonage', 4, 6); return; }
  if (tr.dlg === 'cot') return openHalvardHouse();
  if (tr.dlg === 'sundisc') { playAnim(P(), 'pray'); }
  if (tr.dlg === 'sundisc') { if (!openAltarPrayers("Halvard's sun-disc")) msg(tr.text, 'talk'); return; }
  if (tr.dlg === 'books') { if (!pickupAt('chronicle')) msg(tr.text, 'talk'); return; }
  if (tr.dlg === 'mychest') return openMyChest();
  if (tr.go === 'wilds') { msg('You pass through the north gate. The old road climbs toward the cliffs.'); goMap('wilds', 22, S.maps.wilds.h - 2); return; }
  if (tr.dlg === 'locked') { msg(tr.text, 'talk'); return; }
  if (tr.dlg === 'halvard') return openHalvardHouse();
  if (tr.dlg === 'townhall') return openTownHall();
  if (tr.dlg === 'temple') return openTemple();
  if (tr.shrine) return openShrine(tr.shrine);
  if (tr.go === 'home') {
    if (!S.home.owned) { msg('The road east leads to an empty field with a sign: “For sale. Inquire at the Land Registry.”', 'talk'); p.x -= 1; render(); return; }
    msg('You walk out to your homestead.'); goMap('home', 1, 12); return;
  }
  if (tr.shop) return openShop(tr.shop);
  if (tr.dlg === 'inn') return openInn();
  if (tr.dlg === 'land') return openLand();
  if (tr.dlg === 'board') return openBoard();
  if (tr.site) return openSite(tr.site);
  if (tr.gate) return openGate();
}
function openGate() {
  const m = curMap(); const n = KINGDOM_ORDER.filter(k => S.seals[k]).length;
  if (n < 4) { msg(`A great stone door, carved with four kingdoms' crests. Four empty sockets wait in its face. You hold ${n} of the four seals.`, 'talk'); return; }
  const [x, y] = m.gate;
  setTile(m, x, y, '>'); m.links[K(x, y)] = 'deep'; delete m.trig[K(x, y)]; S.story.gate = 1;
  msg('You press the four seals into the door. It grinds open on a stairway glowing red from below.', 'level');
  render();
}
const groundLabel = g => g.story ? 'a body' : g.gold ? `${g.gold} gold` : g.mat ? `${MATS[g.mat].name}${g.q > 1 ? ' ×' + g.q : ''}` : itemName(g.item);
function lookHere() {
  const m = curMap(), p = P();
  if (S.opts.autoGold) for (const g of m.ground.filter(g => g.x === p.x && g.y === p.y && g.gold)) { p.gold += g.gold; msg(`You pick up ${g.gold} gold.`, 'gold'); m.ground = m.ground.filter(o => o !== g); }
  const here = m.ground.filter(g => g.x === p.x && g.y === p.y);
  if (!here.length) return;
  if (here.some(g => g.story)) { msg('Someone lies here, slumped against the wall. (G to examine)', 'warn'); return; }
  const names = here.map(groundLabel);
  msg(`You see ${names.length > 3 ? names.slice(0, 3).join(', ') + ` and ${names.length - 3} more` : names.join(', ')} here. (G to pick up)`);
}
// G: pick up everything on your tile, or if there's nothing there, everything next to you
function getAction() {
  if (modalOpen || dead || !S) return;
  const m = curMap(), p = P();
  let spots = m.ground.filter(g => g.x === p.x && g.y === p.y);
  if (!spots.length) spots = m.ground.filter(g => cheb(g, p) === 1);
  if (!spots.length) { msg('There is nothing here to pick up.'); return; }
  const before = burden();
  takeGround(spots);
  const b = burden();
  if (b > before) msg(b === 2 ? "You're overloaded and can't move. Drop something (I)." : "You're burdened. Monsters will get the jump on you.", 'warn');
  if (!dead && !modalOpen) endTurn(); else render();
}
function takeGround(list) {
  const m = curMap(), p = P();
  for (const g of list) {
    if (g.story) { m.ground = m.ground.filter(o => o !== g); storyHalvard(); continue; }
    if (g.gold) { p.gold += g.gold; msg(`You pick up ${g.gold} gold.`, 'gold'); addFloat(p.x, p.y, '+' + g.gold + 'g', '#f2b84b'); }
    else if (g.mat) { addMat(g.mat, g.q); msg(`You gather ${MATS[g.mat].name}${g.q > 1 ? ' ×' + g.q : ''}.`, 'good'); }
    else if (g.item) {
      if (!addItem(g.item)) continue;
      const id = g.item.id;
      if (/^seal_/.test(id)) S.seals[id.slice(5)] = true;
      msg(`You pick up ${itemName(g.item)}.`, 'good');
    }
    m.ground = m.ground.filter(o => o !== g);
  }
}
function placeTorch() {
  if (modalOpen || dead || !S) return;
  const m = curMap(), p = P();
  if (m.lit || m.outdoor) { msg("It's bright enough here already."); return; }
  if (m.lights.some(l => l[0] === p.x && l[1] === p.y)) { msg('There is already a torch here.'); return; }
  const t = p.inv.find(i => i.id === 'torch');
  if (!t) { msg('You have no spare torches to set down. Wendell sells them.', 'warn'); return; }
  splitOne(t);
  m.lights.push([p.x, p.y, 4, 'torch']); setLit(m, null);
  msg('You wedge a torch into a crack in the floor. It will keep this spot lit.', 'good');
  endTurn();
}
// R: rest until healed, or until something shows up
function toggleSneak() {
  if (!S || dead) return; const p = P();
  p.sneak = !p.sneak;
  msg(p.sneak ? 'You crouch low and move quietly. Unaware foes take double damage from your blows (triple with a dagger).' : 'You stand up and stop sneaking.', p.sneak ? 'talk' : '');
  render();
}
function restAction() {
  if (modalOpen || dead || !S) return;
  const m = curMap(), p = P();
  if (m.mons.some(o => monVisible(o))) { msg("You can't rest with enemies in sight.", 'warn'); return; }
  if (p.hp >= maxHp() && p.mp >= maxMp() && !p.st.poison) { msg("You're already fully rested."); return; }
  const start = S.turn; let why = '';
  while (S.turn - start < 400) {
    endTurn(); if (dead || S.mapId !== m.id) return;
    const seen = m.mons.find(o => monVisible(o));
    if (seen) { why = `${The(seen)} comes into view!`; break; }
    if (p.hp >= maxHp() && p.mp >= maxMp() && !p.st.poison) break;
  }
  msg(`You rest for ${S.turn - start} turns.${why ? ' ' + why : ''}`, why ? 'warn' : 'good');
}

// ================= story =================
function storyHalvard() {
  S.story.halvard = true;
  addItem(makeItem('journal'), true) || P().inv.push(makeItem('journal'));
  msg('You find Elder Halvard. He is dead.', 'level');
  openModal('Halvard', `
    <div class="keeper">${spriteImg(propCanvas('body'), 48)}<p class="lead">Halvard lies against the cave wall, his lantern smashed beside him. These wounds weren't made by any animal. Someone cut him down with a blade.</p></div>
    <p>A crude goblin knife lies beside him. It's too clean. His satchel has been searched, but whoever did it missed the journal sewn into the lining of his coat. You take it.</p>
    <p class="dim">Read it from your inventory.</p>
    <div class="btnrow"><button class="btn" data-a="close">Close</button></div>`);
}
function readJournal() {
  openModal("Halvard's Journal", `
    <p class="dim">The last pages are written in a hurried hand.</p>
    <p>“The Warden's rider came again tonight asking after the boy. Voss told him what he wanted to hear. I said nothing. I have said nothing for nineteen years.”</p>
    <p>“If anything happens to me, he must not hear it from the council. Ashvale did not burn by accident. We were ordered to do it. Aldren was no traitor. He was going to tell the Crown what the Wardens were doing, and they made us silence him.”</p>
    <p>“Below the third gallery the tunnels change. Worked stone, carved doors, lamps still lit. There are four realms under the mountain, each with its own halls and roads, and none of them trust the others. Aldren once kept the peace between them. One of the four has taken the Wardens' gold. I have to find out which before I go to the others.”</p>
    <p>“They knew Aldren. They may know the truth about the boy, and whether the Book of Dawn means him. The fire would not take the child. I have believed it for nineteen years. Aurel, let me be right.”</p>
    <p>The last line is smudged: “Forgive me, ”</p>
    <p class="hint">The story continues in the four kingdoms. More chapters are coming.</p>`);
}

// ================= gathering =================
function mineVein(x, y) {
  const m = curMap();
  if (!hasTool('pick')) { msg('A vein of ore glints in the rock. You need a pickaxe to mine it.', 'warn'); return; }
  const d = m.depth; let mat = 'iron';
  if (d >= 4 && chance(0.3)) mat = 'silver';
  if (d >= 7 && chance(0.25)) mat = 'mithril';
  const q = roll(1, 2) + rank('prospect');
  addMat(mat, q); setTile(m, x, y, '.');
  msg(`You chip away at the vein and pry loose ${MATS[mat].name} ×${q}.`, 'good');
}
function gatherNode(x, y, node) {
  playAnim(P(), 'work', { x, y });
  if (node.ready > S.day) { msg(node.t === 'tree' ? 'A fresh stump. It will regrow in a few days.' : node.t === 'rock' ? 'Just rubble here for now.' : 'The herbs here have been picked. Check back later.'); return; }
  const regrow = has('greenthumb') ? 1 : 0;
  if (node.t === 'tree') {
    if (!hasTool('axe')) { msg("You need a woodcutter's axe to fell trees. Wendell sells them.", 'warn'); return; }
    const q = roll(2, 3) + rank('lumber'); addMat('wood', q);
    node.ready = S.day + 3 - regrow; msg(`Timber! You split ${q} wood.`, 'good');
  } else if (node.t === 'rock') {
    if (!hasTool('pick')) { msg('You need a pickaxe to break rock.', 'warn'); return; }
    const q = roll(2, 3) + rank('prospect'); addMat('stone', q);
    let extra = '';
    if (chance(0.25)) { const n = 1 + (has('prospect') ? 1 : 0); addMat('iron', n); extra = `, plus ${n} iron ore`; }
    if (has('prospect') && chance(0.12)) { addMat('silver', 1); extra += ', and a nugget of silver'; }
    node.ready = S.day + 4 - regrow; msg(`You break the rock into ${q} stone${extra}.`, 'good');
  } else {
    const q = roll(1, 2) + rank('forager') + (hasTool('sickle') ? 1 : 0); addMat('healroot', q);
    node.ready = S.day + 2 - regrow; msg(`You harvest ${q} healroot.`, 'good');
  }
  useSkill('survival', 3);
}

// ================= days & economy =================
function initShops() {
  S.shops = {};
  for (const id in SHOPS) {
    const sh = { stock: {}, sold: {}, special: [] };
    for (const [iid, target] of SHOPS[id].sells) sh.stock[iid] = { qty: target, target };
    S.shops[id] = sh;
  }
  refreshEnchanterSpecials();
}
function refreshEnchanterSpecials() {
  const pool = Object.values(ITEMS).filter(t => (t.cat === 'weapon' || t.cat === 'armor') && t.tier <= 3);
  S.shops.enchanter.special = Array.from({ length: 4 }, () => makeItem(pick(pool).id, roll(1, 3)));
}
function newDay(reason) {
  S.day++; S.dayT0 = S.turn;
  for (const id in S.shops) {
    const sh = S.shops[id];
    for (const k in sh.stock) {
      const s = sh.stock[k];
      if (s.qty < s.target) s.qty = Math.min(s.target, s.qty + roll(0, Math.max(1, Math.ceil(s.target / 3))));
      else if (s.qty > s.target && chance(0.6)) s.qty -= Math.max(1, Math.floor((s.qty - s.target) / 3));
    }
    for (const k in sh.sold) { sh.sold[k] = Math.floor(sh.sold[k] / 2); if (!sh.sold[k]) delete sh.sold[k]; }
  }
  if (S.day % 3 === 0) refreshEnchanterSpecials();
  S.events.forEach(e => e.left--);
  const ended = S.events.filter(e => e.left <= 0);
  S.events = S.events.filter(e => e.left > 0);
  for (const e of ended) msg(`Market news: the ${EVENTS.find(x => x.id === e.id).name.toLowerCase()} is over.`, 'news');
  if (S.events.length < 2 && chance(0.45)) {
    const e = pick(EVENTS.filter(e => !S.events.some(a => a.id === e.id)));
    S.events.push({ id: e.id, left: roll(e.days[0], e.days[1]) });
    msg(`Market news: ${e.name}! ${e.text}`, 'news');
  }
  if (reason === 'time') msg(`Day ${S.day} dawns.`);
  if (has('landlord') && S.home.built.house) { P().gold += 15; msg('Your tenants pay their rent: 15 gold.', 'gold'); }
}
function eventMod(cat) { let v = 1; for (const e of S.events) { const d = EVENTS.find(x => x.id === e.id); if (d.mods[cat]) v *= d.mods[cat]; } return v; }
const barter = () => (has('haggle1') ? 0.05 : 0) + (has('haggle2') ? 0.05 : 0);
function catOf(key) { return key.startsWith('mat:') ? MATS[key.slice(4)].cat : ITEMS[key].cat; }
function baseOf(key) { return key.startsWith('mat:') ? MATS[key.slice(4)].val : ITEMS[key].val; }
const bundleOf = key => (!key.startsWith('mat:') && ITEMS[key].bundle) || 1;
function scarcity(shopId, key) {
  const s = S.shops[shopId].stock[key]; if (!s) return 1;
  return clamp(1 + 0.6 * (s.target - s.qty) / Math.max(1, s.target), 0.7, 1.8);
}
function buyPrice(shopId, key, it) {
  const base = it ? itemValue(it) : baseOf(key) * bundleOf(key);
  return Math.max(1, Math.round(base * 1.15 * scarcity(shopId, key) * eventMod(catOf(key)) * (1 - barter())));
}
function shopBuys(shopId, key) {
  const sh = SHOPS[shopId]; const cat = catOf(key);
  if (cat === 'story') return false;
  if (key === 'wyrmheart') return shopId === 'jeweler' || shopId === 'general';
  if (key.startsWith('mat:') && sh.buysMats && sh.buysMats.includes(key.slice(4))) return true;
  return sh.buys.includes(cat);
}
function sellPrice(shopId, key, it) {
  if (!shopBuys(shopId, key)) return 0;
  const base = it ? itemValue(it) : baseOf(key);
  const sold = S.shops[shopId].sold[key] || 0;
  const glut = clamp(1 - (has('appraise') ? 0.035 : 0.07) * sold, 0.3, 1);
  const st = S.shops[shopId].stock[key];
  const over = st ? clamp(1 - 0.08 * Math.max(0, st.qty - st.target), 0.5, 1) : 1;
  return Math.max(1, Math.floor(base * SHOPS[shopId].rate * eventMod(catOf(key)) * glut * over * (1 + barter() + (has('merchantprince') ? 0.1 : 0))));
}

// ================= using items =================
function equip(it) {
  const p = P(), t = T(it);
  it = t.stack ? splitOne(it) : (p.inv = p.inv.filter(o => o !== it), it);
  const old = p.equip[t.slot];
  // two-handed weapons and shields don't mix
  const clash = t.twoHand ? p.equip.shield : (t.slot === 'shield' && p.equip.weapon && T(p.equip.weapon).twoHand ? p.equip.weapon : null);
  if (old) addItem(old, true);
  if (clash) { addItem(clash, true); p.equip[T(clash).slot] = null; msg(`You put away the ${itemName(clash)} to free your hands.`); }
  p.equip[t.slot] = it;
  p.hp = Math.min(p.hp, maxHp()); p.mp = Math.min(p.mp, maxMp());
  msg(t.slot === 'light' ? `You light the ${t.name.toLowerCase()}.` : `You equip the ${itemName(it)}.`);
  computeFov();
}
function unequip(slot) {
  const p = P(); const it = p.equip[slot]; if (!it) return;
  p.equip[slot] = null; addItem(it, true);
  p.hp = Math.min(p.hp, maxHp()); p.mp = Math.min(p.mp, maxMp());
  msg(`You take off the ${itemName(it)}.`);
  computeFov();
}
function useItem(it) {
  const p = P(), t = T(it);
  switch (t.use) {
    case 'heal': { const amt = Math.round(t.amt * (1 + rank('herbalist') * 0.2)); p.hp = Math.min(maxHp(), p.hp + amt); addFloat(p.x, p.y, '+' + amt, '#8fd16a'); } msg('You drink the potion. Warmth spreads through you.', 'good'); break;
    case 'mana': p.mp = Math.min(maxMp(), p.mp + t.amt); msg('Your mind clears. Mana flows back.', 'good'); break;
    case 'antidote': p.st.poison = 0; p.st.sick = 0; if (has('toxicology')) { p.hp = Math.min(maxHp(), p.hp + 15); addFloat(p.x, p.y, '+15', '#8fd16a'); } msg('The antidote burns away poison and fever.', 'good'); break;
    case 'strbuff': p.strBuff = 150; msg('Your muscles swell with strength!', 'good'); break;
    case 'life': p.bonusHp = (p.bonusHp || 0) + 5; p.hp = maxHp(); msg('Life surges through you. You feel permanently hardier.', 'level'); break;
    case 'recall': return doRecall(it);
    case 'teleport': {
      const m = curMap(); if (!m.seen) { msg('The scroll fizzles. It only works in the caves.'); return; }
      for (let i = 0; i < 300; i++) { const x = rnd(m.w), y = rnd(m.h); if (tileAt(m, x, y) === '.' && !m.mons.some(o => o.x === x && o.y === y)) { p.x = x; p.y = y; break; } }
      p.st.grabbed = null; msg('The world lurches and you find yourself elsewhere.'); break;
    }
    case 'mapping': {
      const m = curMap(); if (!m.seen) { msg('The scroll shows a map of Brambleford. You knew that already.'); break; }
      revealAll(m);
      msg('A map of the level etches itself into your memory.', 'good'); break;
    }
    case 'enchweapon': {
      const w = p.equip.weapon; if (!w) { msg('You need a weapon in hand to read this.', 'warn'); return; }
      w.ench = (w.ench || 0) + 1; msg(`Your ${T(w).name} glows blue. It is now ${itemName(w)}.`, 'level'); break;
    }
    case 'learn': {
      if (p.spells.includes(t.spell)) { msg('You already know that spell.'); return; }
      if (maxMp() < SPELLS[t.spell].mp) msg('You learn the spell, though you lack the mana to cast it yet. Raise INT or wear a robe.', 'warn');
      else msg(`You study the book and learn ${SPELLS[t.spell].name}! Press C to cast.`, 'level');
      p.spells.push(t.spell); p.favSpells = p.favSpells || []; if (p.favSpells.length < 4) p.favSpells.push(t.spell); break;
    }
    case 'journal': readJournal(); return;
    case 'backpack': p.packBonus = (p.packBonus || 0) + 30; msg('You strap on the sturdy backpack. You can carry 30 lb more.', 'good'); break;
    case 'refuel': {
      const l = p.equip.light; if (!l || !T(l).refill) { msg('You need a lantern in hand to use lamp oil.', 'warn'); return; }
      l.fuel = T(l).fuel; msg('You refill your lantern. It burns bright again.', 'good'); break;
    }
    default: return;
  }
  removeOne(it);
  closeModal(); endTurn();
}
function doRecall(it) {
  const p = P(), m = curMap();
  if (m.seen) { if (it) removeOne(it); closeModal(); p.lastDungeon = m.id; msg('The scroll crumbles. The air shimmers and you are back in town.'); goMap('town', 36, 27); autosave(); return; }
  if (!p.lastDungeon) { msg('You have not been into the cave yet.'); return false; }
  if (it) removeOne(it); closeModal();
  const lv = getMap(p.lastDungeon);
  const up = Object.keys(lv.links).find(k => lv.links[k] === mapInfo(lv.id).parent);
  const [x, y] = up.split(',').map(Number);
  msg(`The scroll carries you back down to ${lv.name.replace(/^./, c => c.toLowerCase())}.`); goMap(lv.id, x, y);
}

// ================= spells =================
function nearestVisibleMonster() {
  const m = curMap(), p = P(); let best = null, bd = 99;
  for (const o of m.mons) { if (!monVisible(o)) continue; const d = cheb(o, p); if (d < bd) { bd = d; best = o; } }
  return best;
}
const TARGETED = ['missile', 'fireball', 'frost', 'sleep', 'fear', 'drain', 'lightning', 'meteor'];
function cast(id) {
  const p = P(), m = curMap();
  const cost = spellCost(id);
  if (p.mp < cost) { msg('Not enough mana.', 'warn'); return; }
  const intB = Math.floor(stat('int') / 4); const pow = spellPower();
  const tgt = TARGETED.includes(id) ? currentTarget() : null;
  if (TARGETED.includes(id) && !tgt) { msg('There is nothing to aim at.'); return; }
  if (id === 'recall' && !m.seen && !p.lastDungeon) { msg('You have not been into the cave yet.'); return; }
  p.mp -= cost; closeModal();
  if (equipBonus('spellfail') && chance(equipBonus('spellfail') * (has('battlemage') ? 0.5 : 1))) { msg('Your armor binds your gestures. The spell fizzles.', 'warn'); endTurn(); return; }
  useSkill(SPELLS[id].school, 1 + cost * 0.8); playAnim(p, 'cast', tgt || null);
  if (TARGETED.includes(id) || id === 'poisoncloud') { if (p.buffs && p.buffs.invis) { p.buffs.invis = 0; msg('You flicker back into sight.'); } }
  // deal spell damage to a creature, waking and angering it
  const hurt = (o, raw, color) => { addTracer(o, color || '#9cc0f5'); const d = Math.max(1, Math.round(raw)); o.hp -= d; o.sleep = 0; o.revealed = 1; o.hunting = 8; o.angry = 1; addFloat(o.x, o.y, d, color || '#9cc0f5'); return d; };
  const finish = o => { if (o.hp <= 0) killMonster(o); };
  const near = (c, r) => [...m.mons].filter(o => cheb(o, c) <= r);
  switch (id) {
    case 'missile': {
      const d = hurt(tgt, (roll(2, 8) + intB + Math.floor(p.level / 2)) * pow); msg(`A glowing dart streaks into ${the(tgt)} (${d}).`, 'hit');
      if (has('volley')) { const second = m.mons.filter(o => o !== tgt && monVisible(o)).sort((a, b) => cheb(a, p) - cheb(b, p))[0]; if (second) { const d2 = hurt(second, (roll(2, 8) + intB) * pow); msg(`A second dart strikes ${the(second)} (${d2}).`, 'hit'); finish(second); } }
      finish(tgt); break;
    }
    case 'frost': {
      const d = hurt(tgt, (roll(2, 6) + intB + Math.floor(p.level / 2)) * pow, '#bfe6ff'); tgt.slowT = 8; msg(`A shard of ice strikes ${the(tgt)} (${d}). It slows, rimed with frost.`, 'hit'); finish(tgt); break;
    }
    case 'drain': {
      const d = hurt(tgt, (roll(2, 6) + intB + Math.floor(p.level / 2)) * pow, '#d6a8ff'); const h = Math.floor(d / 2); p.hp = Math.min(maxHp(), p.hp + h); addFloat(p.x, p.y, '+' + h, '#8fd16a');
      msg(`You draw the life out of ${the(tgt)} (${d}), and it flows into you (+${h}).`, 'hit'); finish(tgt); break;
    }
    case 'lightning': {
      const hit = [tgt]; let cur = tgt;
      for (let i = 0; i < 2; i++) { const nxt = m.mons.filter(o => !hit.includes(o) && monVisible(o) && cheb(o, cur) <= 3).sort((a, b) => cheb(a, cur) - cheb(b, cur))[0]; if (!nxt) break; hit.push(nxt); cur = nxt; }
      msg(`Lightning crackles from your hands${hit.length > 1 ? ` and leaps between ${hit.length} foes` : ''}!`, 'hit');
      hit.forEach((o, i) => hurt(o, (roll(3, 10) + intB + p.level) * pow * (i ? 0.75 : 1), '#e8f0ff'));
      hit.forEach(finish); break;
    }
    case 'fireball': case 'meteor': {
      const big = id === 'meteor'; msg(big ? `Fire falls from the ceiling onto ${the(tgt)}!` : `A ball of fire bursts around ${the(tgt)}!`, 'hit');
      const hit = near(tgt, big ? 2 : 1);
      for (const o of hit) { const d = hurt(o, ((big ? roll(16, 36) + intB * 3 + p.level * 2 : roll(8, 20) + intB * 2 + p.level)) * pow, '#ff9a4a'); msg(`${The(o)} burns (${d}).`, 'hit'); }
      hit.forEach(finish); break;
    }
    case 'poisoncloud': {
      const hit = near(p, 2).filter(o => monVisible(o));
      for (const o of hit) { hurt(o, 2 + intB / 2, '#8fd16a'); o.poison = Math.max(o.poison || 0, 8); }
      msg(hit.length ? `A green cloud rolls out around you. ${hit.length} foe${hit.length > 1 ? 's choke' : ' chokes'} on it.` : 'A green cloud rolls out around you and drifts away.', 'hit');
      hit.forEach(finish); break;
    }
    case 'sleep': if (MONSTERS[tgt.id].boss) { msg(`${The(tgt)} shakes off your spell.`, 'warn'); break; } tgt.sleep = 10; tgt.hunting = 0; tgt.angry = 0; msg(`${The(tgt)} sinks into a deep sleep.`, 'good'); break;
    case 'fear': if (MONSTERS[tgt.id].boss) { msg(`${The(tgt)} laughs at your spell.`, 'warn'); break; } tgt.fear = 12; msg(`${The(tgt)} is seized with terror and flees!`, 'good'); break;
    case 'heal': { const h = Math.round((8 + p.level * 3 + intB) * pow); p.hp = Math.min(maxHp(), p.hp + h); p.st.sick = 0; addFloat(p.x, p.y, '+' + h, '#8fd16a'); msg(`Soft light closes your wounds (+${h}).`, 'good'); break; }
    case 'cure': p.st.poison = 0; p.st.sick = 0; p.st.blind = 0; p.st.confused = 0; p.st.slowed = 0; computeFov(); msg('A cool wash of magic clears your blood and your head.', 'good'); break;
    case 'regen': p.buffs.regenb = 25; msg('Your wounds begin to knit on their own.', 'good'); break;
    case 'shield': p.buffs.ashield = 40; msg('A shimmering ward forms around you.', 'good'); break;
    case 'haste': p.buffs.haste = 20; msg('The world slows around you.', 'good'); break;
    case 'invis': p.buffs.invis = 30; msg('You fade from sight.', 'good'); break;
    case 'detect': p.buffs.detect = 150; msg('You feel every living thing on this level, like candles in the dark.', 'good'); break;
    case 'light':
      if (m.lit || m.outdoor) { msg('Light blooms in your hand, then fades in the daylight.'); break; }
      m.lights.push([p.x, p.y, 6, 'torch']); setLit(m, null); msg('A steady white light kindles in the air above you.', 'good'); break;
    case 'mapspell': if (m.seen) { revealAll(m); msg('The level unfolds in your mind.', 'good'); } else msg('You see Brambleford from above. Pleasant, but not useful.'); break;
    case 'recall': doRecall(null); break;
    case 'phase': {
      for (let i = 0; i < 200; i++) {
        const x = p.x + roll(-6, 6), y = p.y + roll(-6, 6);
        if (walkable(m, x, y) && !m.trig[K(x, y)] && !m.links[K(x, y)] && !m.mons.some(o => o.x === x && o.y === y) && !m.npcs.some(o => o.x === x && o.y === y)) { p.x = x; p.y = y; break; }
      }
      p.st.grabbed = null; msg('You blink across the room.'); break;
    }
  }
  endTurn();
}

// ================= fishing =================
// Walk into water with a rod to cast. Wait for the bobber to dip, then reel in before the fish lets go.
// Ponds in town hold trout and perch, the Whisperwood streams pike, and water under the earth glowing eels.
const FISH_TABLES = {
  pond: [['trout', 50], ['perch', 45], ['goldcarp', 4]],
  stream: [['trout', 40], ['pike', 45], ['perch', 10], ['goldcarp', 4]],
  under: [['caveeel', 70], ['perch', 22], ['goldcarp', 4]],
};
const BITE_WINDOW = { trout: 950, perch: 1050, pike: 680, caveeel: 620, goldcarp: 440 };
const hasRod = () => P().inv.some(i => T(i).tool === 'rod');
const fishWater = () => { const m = curMap(); return m.outdoor || m.id === 'wilds' ? 'stream' : m.lit ? 'pond' : 'under'; };
let fishing = null;
function openFishing() {
  fishing = { st: 'wait', caught: [] };
  openModal('Fishing', `<canvas id="fishcv" width="420" height="220" style="width:100%;max-width:420px;display:block;margin:0 auto;border-radius:12px;image-rendering:pixelated"></canvas>
    <p id="fishmsg" class="lead" style="text-align:center;margin:10px 0 6px"></p>
    <div class="btnrow" style="justify-content:center"><button class="btn default" data-a="reel" style="min-width:140px">Reel in</button><button class="btn" data-a="close">Stop fishing</button></div>
    <p class="hint" style="text-align:center">Wait for the bobber to dip, then reel in quickly. Space or Enter works too.</p>`);
  newCast(); requestAnimationFrame(fishLoop);
}
function setFishMsg(t) { const el = $('#fishmsg'); if (el) el.textContent = t; }
function newCast() {
  const now = performance.now(), table = FISH_TABLES[fishWater()], tot = table.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * tot, fish = table[0][0]; for (const [id, w] of table) { if ((r -= w) < 0) { fish = id; break; } }
  Object.assign(fishing, { st: 'wait', t0: now, biteAt: now + 1200 + Math.random() * 2800, fish });
  setFishMsg('You cast your line and wait...');
}
function fishLoop() {
  if (!fishing || !modalOpen || !$('#fishcv')) { fishing = null; return; }
  const now = performance.now(), f = fishing;
  if (f.st === 'wait' && now >= f.biteAt) { f.st = 'bite'; f.biteT = now; setFishMsg('Something bites! Reel in!'); }
  if (f.st === 'bite' && now - f.biteT > BITE_WINDOW[f.fish]) { f.st = 'lost'; f.t1 = now; setFishMsg('It slipped the hook.'); }
  if ((f.st === 'lost' || f.st === 'caught') && now - f.t1 > 1500) newCast();
  drawFishing(now);
  requestAnimationFrame(fishLoop);
}
function reel() {
  const f = fishing; if (!f) return;
  const now = performance.now();
  if (f.st === 'wait') { f.st = 'lost'; f.t1 = now; setFishMsg('Too soon. You spooked them.'); return fishTime(1); }
  if (f.st !== 'bite') return;
  const p = P(), id = f.fish;
  p.mats[id] = (p.mats[id] || 0) + 1;
  f.st = 'caught'; f.t1 = now; f.last = id;
  setFishMsg(`You land ${/^[AEIOU]/.test(MATS[id].name) ? 'an' : 'a'} ${MATS[id].name}!`);
  msg(`You catch ${/^[AEIOU]/.test(MATS[id].name) ? 'an' : 'a'} ${MATS[id].name}.`, id === 'goldcarp' ? 'level' : 'good');
  useSkill('survival', id === 'goldcarp' ? 8 : 3);
  fishTime(2);
}
// fishing takes time; if something hostile comes close, you drop the line
function fishTime(n) {
  for (let i = 0; i < n; i++) endTurn();
  const m = curMap(), p = P();
  if (dead || m.mons.some(o => monVisible(o) && cheb(o, p) <= 3 && !MONSTERS[o.id].prey)) { fishing = null; closeModal(true); if (!dead) msg('Something is coming. You drop your line.', 'warn'); }
}
function drawFishing(now) {
  const c = $('#fishcv'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height, f = fishing, kind = fishWater();
  g.imageSmoothingEnabled = false;
  const col = { pond: ['#4a86bd', '#24507a', '#5b9541'], stream: ['#4a8a96', '#1f4a52', '#4c8238'], under: ['#25495a', '#0b1820', '#3d373b'] }[kind];
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // ripples drifting across the surface
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const y = 50 + i * 19, x = ((now / 40 + i * 97) % (W + 80)) - 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 + (i % 3) * 8, y); g.stroke(); }
  // the near bank
  g.fillStyle = col[2]; g.fillRect(0, 0, W, 26); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 26, W, 4);
  if (kind === 'under') { g.fillStyle = 'rgba(169,224,255,0.12)'; for (let i = 0; i < 6; i++) g.fillRect((i * 71 + now / 30) % W, 60 + (i * 37) % 140, 3, 3); }
  // line and bobber
  const bx = 250, by0 = 120;
  let dip = 0; if (f.st === 'bite') dip = 7 + Math.sin(now / 35) * 3; else if (f.st === 'wait') dip = Math.sin(now / 420) * 2;
  const by = by0 + dip;
  g.strokeStyle = 'rgba(240,235,220,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(30, 0); g.quadraticCurveTo(150, f.st === 'lost' ? 120 : 60, bx, by - 6); g.stroke();
  if (f.st === 'bite') { g.strokeStyle = 'rgba(255,255,255,0.5)'; const r = ((now - f.biteT) / 4) % 40; g.beginPath(); g.ellipse(bx, by0 + 4, 10 + r, 4 + r / 3, 0, 0, Math.PI * 2); g.stroke(); }
  if (f.st !== 'caught') {
    g.fillStyle = '#f4ecdf'; g.beginPath(); g.arc(bx, by, 7, 0, Math.PI); g.fill();
    g.fillStyle = '#d63b3b'; g.beginPath(); g.arc(bx, by, 7, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx - 9, by0 + 6, 18, 2);
  }
  if (f.st === 'bite') { g.fillStyle = '#ffcd6b'; g.font = '700 26px "Figtree", sans-serif'; g.textAlign = 'center'; g.fillText('!', bx, by - 16); }
  if (f.st === 'caught') {
    const k = Math.min(1, (now - f.t1) / 600), y = by0 - Math.sin(k * Math.PI) * 70;
    g.drawImage(matCanvas(f.last), bx - 32, y - 40, 64, 64);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(bx, by0 + 4, 14 + k * 30, 5 + k * 6, 0, 0, Math.PI * 2); g.fill();
  }
}

// ================= rendering =================
const cvs = $('#map'); const ctx = cvs.getContext('2d');
let TS = 32;

// Ground and wall art lives in tiles.js, painted on the 16×16 sprite grid and scaled up whole.
// SHADE holds soft shadow overlays at screen resolution, rebuilt when the tile size changes.
let SHADE = {};
function buildShades() {
  const mk = fn => { const c = document.createElement('canvas'); c.width = c.height = TS; fn(c.getContext('2d'), TS); return c; };
  const lin = (g, x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, TS, TS); };
  SHADE.top = mk((g, s) => lin(g, 0, 0, 0, s * 0.5, 0.36));
  SHADE.left = mk((g, s) => lin(g, 0, 0, s * 0.3, 0, 0.22));
  SHADE.right = mk((g, s) => lin(g, s, 0, s * 0.7, 0, 0.22));
  SHADE.sun = mk((g, s) => lin(g, 0, 0, s * 0.6, 0, 0.3));
}
const SIGN_ICON = { smith: () => itemCanvas('sword_steel'), armor: () => itemCanvas('shieldh_steel'), general: () => itemCanvas('backpack'), alch: () => itemCanvas('pheal'), magic: () => itemCanvas('bmissile'), ench: () => matCanvas('shard'), jewel: () => itemCanvas('ringstr'), inn: () => propCanvas('mug'), hall: () => itemCanvas('srecall') };
const PROP_TILE = { 'T': 'oak', 'F': 'fountain', 'B': 'board' };

// Zoom: tile size in screen pixels. 'auto' shows about 20 tiles across; otherwise a chosen size, kept per device.
const ZOOM_STEPS = [32, 40, 48, 56, 64, 80, 96, 112, 128];
function zoomTS(width) {
  let z = 'auto'; try { z = localStorage.getItem('tw-zoom') || 'auto'; } catch (e) { }
  if (z === 'large') return 64; if (z === 'normal') return 32;
  const n = parseInt(z, 10); if (n >= 32 && n <= 128) return n;
  const want = width / 20; return ZOOM_STEPS.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a);
}
function zoomBy(dir) {
  const cur = TS || 48, i = ZOOM_STEPS.indexOf(cur);
  const j = i < 0 ? ZOOM_STEPS.findIndex(s => s >= cur) : Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir));
  const v = ZOOM_STEPS[j < 0 ? ZOOM_STEPS.length - 1 : j]; if (v === TS) return;
  try { localStorage.setItem('tw-zoom', String(v)); } catch (e) { }
  resizeCanvas();
}
function resizeCanvas() {
  const wrap = $('#mapwrap'); const r = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cvs.width = Math.floor(r.width * dpr); cvs.height = Math.floor(r.height * dpr);
  cvs.style.width = r.width + 'px'; cvs.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // whole multiples of the 16-pixel art keep every pixel the same size
  // whole multiples of the 32-pixel art only, so every pixel on screen is the same size.
  // Large zoom doubles everything; it's a choice for this device, kept in the browser.
  const newTS = zoomTS(r.width);
  if (!TILE.grass) buildTileset();
  if (newTS !== TS || !SHADE.top) { TS = newTS; buildShades(); }
  if (S) render();
}
// The camera keeps you centered, even near a map's edge, so the minimap and panels never cover you.
// A map small enough to fit the screen is simply centered.
function viewOffset(W, H) {
  const m = curMap(), p = visualPos(P());
  const ox = m.w * TS <= W * 0.7 ? Math.floor((W - m.w * TS) / 2) : Math.round(W / 2 - (p.x + 0.5) * TS);
  const oy = m.h * TS <= H * 0.7 ? Math.floor((H - m.h * TS) / 2) : Math.round(H / 2 - (p.y + 0.5) * TS);
  return [ox, oy];
}
const ROOFS = 'rhl';
const CAVE_WALL = '#VG';
const BUILT = 'rhlKHWO+';
// tiles that shade the ground just below them
const CASTS = '#VGZKHWO+rhl^Q';
function wallType(m, x, y) { for (let d = 1; d < 6; d++) for (const o of [-d, d]) { const c = tileAt(m, x + o, y); if ('KHW'.includes(c)) return c; } return 'W'; }
// a tree with trees on every side is just part of the canopy
const deepWoods = (m, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => { const tx = x + dx, ty = y + dy; return tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || m.t[ty][tx] === 'Y'; });
// small ground details: each tile gets the same ones every time
// People take on the light of where they stand: a wash of the place's ambient color over the whole figure, and
// the ground's color bounced up onto boots and hems. Cached per sprite and lighting.
const ENV_CACHE = new WeakMap();
function envLight(m, x, y) {
  const c = tileAt(m, Math.round(x), Math.round(y));
  const grass = c === ',' || c === 'f';
  if (m.theme === 'house') return { key: 'house', amb: '#ffb35c', ka: 0.08, gnd: '#8a5a30', kg: 0.22 };
  if (m.outdoor || m.lit) return grass ? { key: 'grass', amb: '#e9f0c4', ka: 0.05, gnd: '#5d8a32', kg: 0.26, grass } : { key: 'path', amb: '#f0e6c8', ka: 0.05, gnd: '#a08a62', kg: 0.22 };
  return { key: 'cave' + (m.theme || ''), amb: '#7484b8', ka: 0.12, gnd: '#4a4250', kg: 0.25 };
}
function envLit(c, L) {
  let per = ENV_CACHE.get(c); if (!per) ENV_CACHE.set(c, per = {});
  if (per[L.key]) return per[L.key];
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const g = o.getContext('2d'); g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = L.ka; g.fillStyle = L.amb; g.fillRect(0, 0, o.width, o.height);
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, o.height, 0, o.height * 0.55);
  gr.addColorStop(0, L.gnd + Math.round(L.kg * 255).toString(16).padStart(2, '0')); gr.addColorStop(1, L.gnd + '00');
  g.fillStyle = gr; g.fillRect(0, 0, o.width, o.height);
  return per[L.key] = o;
}
// a sprite in flat white, for the flash of a blow landing
const WSIL_CACHE = new WeakMap();
function whiteSilhouette(c) { let o = WSIL_CACHE.get(c); if (o) return o; o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff8ee'; g.fillRect(0, 0, o.width, o.height); WSIL_CACHE.set(c, o); return o; }
// a sprite's silhouette, for shadows cast across the ground
const SIL_CACHE = new WeakMap();
function silhouette(c) {
  let o = SIL_CACHE.get(c); if (o) return o;
  o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const g = o.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0a1008'; g.fillRect(0, 0, o.width, o.height);
  SIL_CACHE.set(c, o); return o;
}
function decalAt(m, x, y, c) {
  if (m.decor[K(x, y)] || m.trig[K(x, y)] || m.links[K(x, y)]) return null;
  const h = tileHash(x * 7 + 3, y * 11 + 5) % 1000, nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(m, x + a, y + b) === '~');
  if (c === '~') return h < 70 ? 'lily' : null;
  if (c === ',' || c === 'f') {
    if (nearWater && h < 450) return 'reeds';
    if (m.outdoor) return h < 45 ? 'bushDark' : h < 120 ? 'tuft' : h < 150 ? 'stones' : h < 175 ? 'mushrooms' : h < 225 ? 'leaves' : h < 245 ? 'flowers' : null;
    if (m.id === 'town' && (tileAt(m, x, y + 1) === 'Q' || tileAt(m, x, y - 1) === 'Q')) return h < 120 ? 'flowers' : null;
    return h < 35 ? 'bush' : h < 110 ? 'tuft' : h < 140 ? 'stones' : h < 185 ? 'flowers' : h < 200 ? 'leaves' : null;
  }
  if (c === '.' && !m.lit) return h < 70 ? 'pebbles' : (h < 82 && (m.theme === 'cave' || m.theme === 'deep')) ? 'bones' : null;
  return null;
}
// which kind of tree, if any, grows on a tile: forest trees, town and roadside trees, the woods around your land
function treeAt(m, x, y, c, dc) {
  const h = tileHash(x, y);
  if (c === 'Y') return m.lvl >= 3 ? (h % 5 ? 'pine' : 'oak') : ['pine', 'oak', 'oak', 'pine', 'birch', 'pine', 'autumn'][h % 7];
  if (dc === 'apple') return 'apple';
  if (c === 'T' || dc === 'oak') return ['oak', 'oak', 'autumn', 'birch', 'oak'][h % 5];
  if (dc === 'pine') return h % 4 ? 'pine' : 'birch';
  return null;
}
function tileArt(m, x, y) {
  const c = m.t[y][x], th = m.theme || 'cave';
  switch (c) {
    case '#': case 'V': {
      const face = !CAVE_WALL.includes(tileAt(m, x, y + 1));
      return tileVar((c === 'V' ? (face ? 'veinFace_' : 'vein_') : (face ? 'wallFace_' : 'wall_')) + th, x, y);
    }
    case '.': return tileHash(x, y) % 19 === 0 ? tileVar('floorDetail_' + th, x, y) : tileVar('floor_' + th, x, y);
    case '>': return TILE['down_' + th][0];
    case '<': return TILE['up_' + th][0];
    case 'G': return TILE['gate_' + th][0];
    case 'f': return tileVar(m.outdoor ? 'woodsFlowers' : 'flowers', x, y);
    case ';': return tileVar('dirt', x, y);
    case ':': case 'E': case 'X': case 'F': return tileVar('cobble', x, y);
    case '~': return tileVar('water', x, y);
    case '^': return tileVar(y > 0 && tileAt(m, x, y - 1) === '^' ? 'cliff' : 'cliffLip', x, y);
    case 'C': return TILE.caveMouth[0];
    case 'Z': return tileVar(tileAt(m, x, y + 1) === 'Z' ? 'townWallTop' : 'townWall', x, y);
    case 'w': case 'B': return tileVar('planks', x, y);
    case '=': return TILE.counter[0];
    case 'r': case 'h': case 'l': return tileVar((tileAt(m, x, y + 1) === c ? 'roof' : 'eave') + c, x, y);
    case 'K': case 'H': case 'W': return tileVar('bwall' + c, x, y);
    case 'O': return tileVar('bwin' + wallType(m, x, y), x, y);
    case '+': return th === 'house' ? TILE.houseDoor[0] : TILE['bdoor' + wallType(m, x, y)][0];
    case 'Y': return deepWoods(m, x, y) ? tileVar('canopy', x, y) : tileVar('woods', x, y);
    case 'J': return tileVar('bridge', x, y);
    case '{': return TILE.trailDown[0];
    case '}': return TILE.trailUp[0];
  }
  return tileVar(m.outdoor ? 'woods' : 'grass', x, y);
}
// Seams between tiles: rims on cave walls, ridges on roofs, grass creeping over paths, foam on the shore,
// and soft shadow where a wall or building meets the ground.
// Where a path or a pond turns a corner, round it: the outside corner is filled back with what surrounds it,
// and the inside corner of the neighbouring ground is cut away to match.
const PATHISH = ';:{}EXF', GRASSISH = ',fYTS';
function roundCorners(m, x, y, c, R, at) {
  const r = 9;
  const pathCol = c === ':' || c === 'E' || c === 'X' || c === 'F' ? '#a39783' : '#a98454';
  const grassCol = (m.outdoor ? WOODS32 : GRASS32).ramp[2], rim = (m.outdoor ? WOODS32 : GRASS32).blade;
  const corners = [[-1, -1, 0, 0], [1, -1, 32, 0], [-1, 1, 0, 32], [1, 1, 32, 32]];
  for (const [dx, dy, cx, cy] of corners) {
    const a = at(dx, 0), b = at(0, dy), d = at(dx, dy);
    // outside corner of a path or water tile: the ground bulges in
    const outer = (PATHISH.includes(c) && GRASSISH.includes(a) && GRASSISH.includes(b)) || (c === '~' && a && b && a !== '~' && b !== '~');
    // inside corner of a ground tile: the path or water reaches round it
    const inner = GRASSISH.includes(c) && ((PATHISH.includes(a) && PATHISH.includes(b) && PATHISH.includes(d)) || (a === '~' && b === '~' && d === '~'));
    if (!outer && !inner) continue;
    const ox2 = cx === 0 ? r : 32 - r, oy2 = cy === 0 ? r : 32 - r;
    for (let yy = 0; yy < r; yy++) for (let xx = 0; xx < r; xx++) {
      const X = cx === 0 ? xx : 31 - xx, Y = cy === 0 ? yy : 31 - yy;
      if (outer) {
        const dist = Math.hypot(X + 0.5 - ox2, Y + 0.5 - oy2);
        if (dist > r + 1.5) R(X, Y, 1, 1, grassCol);
        else if (dist > r) R(X, Y, 1, 1, c === '~' ? '#6e5a3a' : grassCol);
        else if (dist > r - 1.2) R(X, Y, 1, 1, c === '~' ? '#e8f2f8' : rim);
      } else {
        const dist = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy), rr = 6;
        const water = a === '~';
        if (dist < rr) R(X, Y, 1, 1, water ? '#3674aa' : pathCol);
        else if (dist < rr + 1.2) R(X, Y, 1, 1, water ? '#e8f2f8' : shadeColorG(pathCol, 0.8));
      }
    }
  }
}
const shadeColorG = (hex, f) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');
function tileEdges(m, x, y, px, py, c) {
  // seams are drawn on the 32 grid: one fine pixel, the same size as everything else
  const u = TS / 32, th = m.theme || 'cave';
  // outdoors the map edge is open ground, underground it is solid rock
  const at = (dx, dy) => { const tx = x + dx, ty = y + dy; if ((m.lit || m.outdoor) && (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h)) return ''; return tileAt(m, tx, ty); };
  const up = at(0, -1), dn = at(0, 1), lf = at(-1, 0), rt = at(1, 0);
  const R = (ax, ay, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(px + ax * u, py + ay * u, w * u, h * u); };
  if (c === '#' || c === 'V') {
    const pal = CAVE_PAL[th], face = !CAVE_WALL.includes(dn), topH = face ? (th === 'house' ? 6 : 12) : 32;
    if (!CAVE_WALL.includes(up)) { R(0, 0, 32, 1, pal.rim); R(0, 1, 32, 1, 'rgba(255,255,255,0.08)'); }
    if (!CAVE_WALL.includes(lf)) { R(0, 0, 1, topH, pal.rim); if (face) R(0, topH + 1, 2, 31 - topH, 'rgba(0,0,0,0.22)'); }
    if (!CAVE_WALL.includes(rt)) { R(31, 0, 1, topH, pal.rim); if (face) R(30, topH + 1, 2, 31 - topH, 'rgba(0,0,0,0.3)'); }
    return;
  }
  if (ROOFS.includes(c)) {
    const dk = ROOF_DARK[c];
    // light catches the top of the slope; it darkens toward the eaves
    let k = 0; while (k < 8 && tileAt(m, x, y - k - 1) === c) k++;
    R(0, 0, 16, 16, k < 2 ? 'rgba(255,240,220,0.07)' : `rgba(0,0,0,${Math.min(0.2, 0.05 * (k - 1))})`);
    if (up !== c) { R(0, 0, 16, 2, dk); R(0, 2, 16, 1, 'rgba(255,255,255,0.16)'); }
    if (lf !== c) R(0, 0, 1, 16, dk);
    if (rt !== c) R(15, 0, 1, 16, dk);
    return;
  }
  if ('KHWO+'.includes(c)) {
    if (th === 'house') return;
    if (!'KHWO+'.includes(lf)) R(0, 0, 1, 16, '#3a2410');
    if (!'KHWO+'.includes(rt)) R(15, 0, 1, 16, '#3a2410');
    return;
  }
  if ('ZG^CQ'.includes(c)) return;
  const h = tileHash(x, y);
  if (';:{}EXF'.includes(c)) {
    // grass spills over the edge of the path in a ragged, tufted fringe
    const P2 = m.outdoor ? WOODS32 : GRASS32, GR = ',fYTS', base = P2.ramp[2], dark = P2.blade, lite = P2.tip;
    const depth = i => 1 + ((h >>> (i % 23)) & 1) + ((h >>> ((i * 7 + 3) % 27)) & 1) + (((h >>> ((i * 3 + 7) % 29)) & 3) === 0 ? 2 : 0);
    if (GR.includes(up)) for (let i = 0; i < 32; i++) { const d = depth(i); R(i, 0, 1, d, base); R(i, d, 1, 1, dark); if (d > 2 && i % 3 === 0) R(i, d - 2, 1, 1, lite); }
    if (GR.includes(dn)) for (let i = 0; i < 32; i++) { const d = depth(i + 5); R(i, 32 - d, 1, d, base); R(i, 32 - d - 1, 1, 1, dark); if (d > 2 && i % 4 === 1) R(i, 32 - d, 1, 1, lite); }
    if (GR.includes(lf)) for (let i = 0; i < 32; i++) { const d = depth(i + 11); R(0, i, d, 1, base); R(d, i, 1, 1, dark); }
    if (GR.includes(rt)) for (let i = 0; i < 32; i++) { const d = depth(i + 17); R(32 - d, i, d, 1, base); R(31 - d, i, 1, 1, dark); }
  } else if (c === '~') {
    const land = t => t && t !== '~';
    // a muddy bank, then a band of foam, then the shallows
    if (land(up)) { R(0, 0, 32, 2, '#6e5a3a'); R(0, 2, 32, 1, '#e8f2f8'); R(0, 3, 32, 2, 'rgba(160,210,240,0.45)'); }
    if (land(dn)) { R(0, 30, 32, 2, '#2a4f78'); R(0, 29, 32, 1, 'rgba(160,210,240,0.45)'); }
    if (land(lf)) { R(0, 0, 2, 32, '#6e5a3a'); R(2, 0, 1, 32, '#e8f2f8'); R(3, 0, 2, 32, 'rgba(160,210,240,0.45)'); }
    if (land(rt)) { R(30, 0, 2, 32, '#6e5a3a'); R(29, 0, 1, 32, '#e8f2f8'); R(27, 0, 2, 32, 'rgba(160,210,240,0.45)'); }
  }
  roundCorners(m, x, y, c, R, at);
  groundShade(m, x, y, px, py);
}
// soft shadows on the ground where a wall or building meets it
function groundShade(m, x, y, px, py) {
  if (!m.lit && !m.outdoor && m.theme !== 'house') return; // cave rock is baked with its own shadows
  const at = (dx, dy) => { const tx = x + dx, ty = y + dy; if ((m.lit || m.outdoor) && (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h)) return ''; return tileAt(m, tx, ty); };
  const up = at(0, -1), lf = at(-1, 0), rt = at(1, 0);
  if (up && CASTS.includes(up)) ctx.drawImage(SHADE.top, px, py, TS, TS);
  if (CAVE_WALL.includes(lf) && lf) ctx.drawImage(SHADE.left, px, py, TS, TS);
  else if (lf && (BUILT.includes(lf) || lf === 'Z')) ctx.drawImage(SHADE.sun, px, py, TS, TS);
  if (rt && CAVE_WALL.includes(rt)) ctx.drawImage(SHADE.right, px, py, TS, TS);
}
function render() { if (!S) return; renderMap(); renderSide(); }
const darkCv = document.createElement('canvas');
function renderMap() {
  if (!S) return;
  const m = curMap(), p = P();
  const W = cvs.width / (window.devicePixelRatio || 1), H = cvs.height / (window.devicePixelRatio || 1);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = m.theme === 'house' ? '#120c0a' : m.outdoor ? '#1c2a16' : m.lit ? '#22301a' : '#08060f'; ctx.fillRect(0, 0, W, H);
  const [ox, oy] = viewOffset(W, H);
  const cols = Math.ceil(W / TS) + 1, rows = Math.ceil(H / TS) + 1;
  const x0 = Math.max(0, Math.floor(-ox / TS)), y0 = Math.max(0, Math.floor(-oy / TS));
  const spr = (c, x, y) => ctx.drawImage(c, ox + x * TS, oy + y * TS, TS, TS);
  const shadow = (x, y, w = 0.36) => { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(ox + (x + 0.5) * TS, oy + (y + 0.9) * TS, TS * w, TS * 0.11, 0, 0, Math.PI * 2); ctx.fill(); };
  const x1 = Math.min(m.w, x0 + cols), y1 = Math.min(m.h, y0 + rows);
  // pass 1: the ground, walls and roofs (all of it; the fog hides what you haven't seen, with soft edges)
  // the ground is one continuous painted surface; tiles that aren't ground draw themselves over it
  const GB = groundBake(m);
  ctx.drawImage(GB.cv, x0 * 32, y0 * 32, (x1 - x0) * 32, (y1 - y0) * 32, ox + x0 * TS, oy + y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = m.t[y][x];
    if (GB.mats[y * m.w + x]) { if (!GB.mats[y * m.w + x].startsWith('rock:') && tileAt(m, x, y - 1) !== '^') groundShade(m, x, y, ox + x * TS, oy + y * TS); if (c === '>' || c === '<') spr(stairsArt(m.theme || 'cave', c === '>'), x, y); if (c === 'C') { const cm = caveMouthArt(), k = TS / 32; ctx.drawImage(cm, ox + (x + 0.5) * TS - cm.width / 2 * k, oy + (y + 1) * TS - cm.height * k + 2 * k, cm.width * k, cm.height * k); } }
    else { spr(tileArt(m, x, y), x, y); tileEdges(m, x, y, ox + x * TS, oy + y * TS, c); }
    const dk = decalAt(m, x, y, c); if (dk) spr(decal(dk, tileHash(x * 3 + 1, y * 5 + 2)), x, y);
  }
  drawMeadow(m, ox, oy);
  const T = ambNow(), DL = isOpenAir(m) ? dayLight() : null;
  townsfolkLife(m, T);
  const standing = new Set([K(p.x, p.y), ...m.npcs.map(n => K(n.x, n.y)), ...m.mons.map(o => K(o.x, o.y))]);
  drawGlints(m, GB, ox, oy, x0, y0, x1, y1, T);
  drawTufts(m, GB, ox, oy, x0, y0, x1, y1, T, standing);
  // buildings throw their shadow onto the ground to the right, away from the morning sun
  ctx.fillStyle = 'rgba(12,20,10,0.26)';
  for (const lm of m.landmarks || []) {
    const x1 = ox + (lm.x + lm.w) * TS - 2, yT = oy + (lm.y + lm.h * 0.4) * TS, yB = oy + (lm.y + lm.h) * TS, sh = TS * 0.6 * (DL ? DL.len : 1);
    ctx.beginPath(); ctx.moveTo(x1, yT); ctx.lineTo(x1 + sh, yT + sh * 0.7); ctx.lineTo(x1 + sh, yB + sh * 0.3); ctx.lineTo(x1, yB); ctx.fill();
    ctx.fillRect(ox + lm.x * TS + TS * 0.2, yB, lm.w * TS - TS * 0.2, Math.max(2, TS * 0.08));
  }
  for (const lm of m.landmarks || []) ctx.drawImage(landmarkFor(lm), ox + lm.x * TS, oy + lm.y * TS, lm.w * TS, lm.h * TS);
  for (const [rx, ry, rw, rh] of m.rugs || []) drawRug(ox + rx * TS, oy + ry * TS, rw, rh);
  // pass 2: everything standing on it, row by row so nearer things overlap farther ones
  const trees = [], tall = [];
  // a little past the screen's edges, so the crowns of trees just out of view still reach in
  for (let y = Math.max(0, y0 - 1); y < Math.min(m.h, y1 + 3); y++) for (let x = Math.max(0, x0 - 2); x < Math.min(m.w, x1 + 2); x++) {
    if (!(m.lit || m.seen[y * m.w + x])) continue;
    const c = m.t[y][x];
    if ((x < x0 || x >= x1 || y >= y1) && !treeAt(m, x, y, c, m.decor[K(x, y)])) continue;
    const dc = m.decor[K(x, y)];
    const treeKind = treeAt(m, x, y, c, dc);
    if (treeKind) { trees.push({ x, y, kind: treeKind }); if (PROP_TILE[c] && PROP_TILE[c] !== 'oak') spr(propCanvas(PROP_TILE[c]), x, y); continue; }
    if (PROP_TILE[c]) { shadow(x, y, 0.42); spr(propCanvas(PROP_TILE[c]), x, y); }
    if (dc && NATIVE_PROPS[dc]) { if (x >= x0 - 1 && x <= x1 && y <= y1 + 2) tall.push({ x, y, kind: dc }); continue; }
    if (dc && !CASTS.includes(c)) shadow(x, y, 0.34);
    if (dc && dc.startsWith('sign:')) { spr(propCanvas('signBlank'), x, y); ctx.drawImage(SIGN_ICON[dc.slice(5)](), ox + x * TS + TS * 0.42, oy + y * TS + TS * 0.36, TS * 0.4, TS * 0.4); }
    else if (dc) spr(propCanvas(dc), x, y);
    if (c === 'S') drawSite(m, x, y);
    const mk = m.marks[K(x, y)];
    if (mk) ctx.drawImage(itemCanvas(KINGDOMS[mk].seal), ox + x * TS + TS * 0.5, oy + y * TS + TS * 0.45, TS * 0.55, TS * 0.55);
    if (m.id === 'home') { const n = S.home.nodes[K(x, y)]; if (n) drawNode(n, x, y); }
  }
  for (const [lx, ly, , kind] of m.lights) if (kind === 'torch' && m.seen[ly * m.w + lx]) spr(propCanvas('torchpost'), lx, ly);
  for (const g of m.ground) {
    if (!canSee(g.x, g.y)) continue;
    if (g.gold) { spr(groundCoins(g.gold, g.x * 7 + g.y * 13), g.x, g.y); continue; }
    const c = g.story ? propCanvas('body') : g.mat ? matCanvas(g.mat) : itemCanvas(g.item.id);
    const inset = g.story ? 0 : TS * 0.12;
    ctx.drawImage(c, ox + g.x * TS + inset, oy + g.y * TS + inset, TS - inset * 2, TS - inset * 2);
  }
  drawFog(m, ox, oy);
  // People and creatures, back to front: anyone standing lower on the screen is nearer and overlaps those behind.
  // Tall figures stand on their tile and rise into the one above.
  const actors = [];
  anyMoving = false;
  // creatures use their sprite with a lifted foot while moving; people are drawn whole by the figure system
  const actor = (obj, c, extra) => { const v = visualPos(obj), o = animOffset(obj); return Object.assign({ y: v.y + o[1], x: v.x + o[0], flash: o[2], c: v.frame >= 0 ? walkFrames(c)[v.frame % 2] : c, bob: v.frame >= 0 ? Math.sin(v.frame * Math.PI / 2) ** 2 : 0 }, extra); };
  const person = (obj, spec, extra) => { const v = visualPos(obj), o = animOffset(obj); return Object.assign({ y: v.y + o[1], x: v.x + o[0], flash: o[2], c: figure(spec, facingOf(obj), poseOf(obj, v)), bob: 0 }, extra); };
  for (const n of m.npcs) {
    const mark = n.prop ? null : npcMark(whoOf(n));
    if (!n.prop && FIG_SPECS[n.spr]) actors.push(person(n, FIG_SPECS[n.spr], { mark }));
    else actors.push(actor(n, n.prop ? (NATIVE_PROPS[n.prop] ? nativePropCanvas(n.prop) : propCanvas(n.prop)) : npcCanvas(n.spr), { mark }));
  }
  for (const o of m.mons) if (monVisible(o)) actors.push(MON_FIG[o.id] ? person(o, MON_FIG[o.id], { mon: o }) : actor(o, monCanvas(o.id), { mon: o }));
  actors.push(dead ? { y: p.y, x: p.x, c: figure(heroSpec(p.equip, p.look), 'down', 'hurt'), hero: 1, bob: 0, lying: 1 } : person(p, typeof fishing !== 'undefined' && fishing ? Object.assign({}, heroSpec(p.equip, p.look), { held: 'rod', offhand: undefined }) : heroSpec(p.equip, p.look), { hero: 1 }));
  // trees stand among the people: whoever is lower on the screen is in front. A crown you're standing behind thins out.
  const hv0 = visualPos(p);
  for (const t of trees) {
    const vis = m.lit || canSee(t.x, t.y);
    const behind = hv0.y < t.y && hv0.y > t.y - 3.2 && Math.abs(hv0.x - t.x) < 1.6;
    actors.push({ y: t.y - 0.01, x: t.x, tree: t.kind, c: treeCanvas(t.kind, tileHash(t.x, t.y), !vis), fade: behind });
  }
  for (const t of tall) actors.push({ y: t.y - 0.02, x: t.x, c: nativePropCanvas(t.kind), bob: 0, prop: t.kind });
  actors.sort((a, b) => a.y - b.y || (a.hero ? 1 : 0) - (b.hero ? 1 : 0));
  // every shadow goes down on the ground before anyone stands on it, so no one's shadow falls across a neighbor
  for (const a of actors) {
    if (a.tree) continue;
    // sprites wider than a tile (a cow, a horse) keep their pixel size and centre on their tile
    const lift = Math.round(a.bob * TS / 16), px = ox + a.x * TS, py = oy + a.y * TS, aw = a.c.hd ? TS : TS * Math.max(32, a.c.width) / 32, h = a.c.hd ? TS * a.c.height / a.c.width : a.c.width > 32 ? TS * a.c.height / 32 : TS * a.c.height / a.c.width, feet = py + TS - TS / 16 - lift;
    // in daylight the figure's own silhouette lies across the ground toward the lower right, as the buildings' do
    if (tileAt(m, Math.round(a.x), Math.round(a.y)) === 'z') continue; // wading: the water takes the shadow
    if ((m.outdoor || m.lit) && m.theme !== 'house') {
      const len = DL ? DL.len : 1;
      ctx.save(); ctx.globalAlpha = 0.22 * (DL ? 1 - DL.night * 0.8 : 1);
      // with y measured from the feet (up is negative): x' = x − 0.75·y, y' = −0.3·y, so the head falls down and right
      const sw = aw, sh = h, fx = px + TS / 2, ly = feet + lift; // the shadow stays on the ground when the body bobs
      ctx.transform(1, 0, -0.75 * len, -0.3 * len, fx, ly);
      ctx.drawImage(silhouette(a.c), -sw / 2, -sh * (a.prop ? 1 - 2 / a.c.height : 46 / 48), sw, sh);
      ctx.restore();
    } else if (!m.lit && !a.hero) {
      // underground the only light is the one you carry: anyone near it throws a shadow straight away from you
      const hv = visualPos(p), dx = a.x - hv.x, dy = a.y - hv.y, dist = Math.hypot(dx, dy);
      if (dist > 0.3 && dist < 6) {
        const ux = dx / dist, uy = dy / dist, k = 0.35 + dist * 0.12;
        ctx.save(); ctx.globalAlpha = 0.4 * (1 - dist / 6);
        ctx.transform(1, 0, -ux * k, -uy * k - 0.12, px + TS / 2, feet + lift);
        ctx.drawImage(silhouette(a.c), -TS / 2, -h * 46 / 48, TS, h);
        ctx.restore();
      }
    }
    const sx = px + TS * 0.52, sy = py + TS * 0.94, rw = TS * 0.3 * (a.mon && !MON_FIG[a.mon.id] ? 1.15 : 1);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.3);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
    sg.addColorStop(0, 'rgba(10,14,8,0.5)'); sg.addColorStop(0.6, 'rgba(10,14,8,0.28)'); sg.addColorStop(1, 'rgba(10,14,8,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  drawReflections(m, actors, ox, oy, T);
  drawFx(m, ox, oy, T, 'ground');
  for (const a of actors) {
    if (a.tree) {
      const w = a.c.width / 32 * TS, h = a.c.height / 32 * TS, bx = ox + (a.x + 0.5) * TS, by = oy + (a.y + 1) * TS + TS * 0.12;
      ctx.fillStyle = 'rgba(12,24,10,0.28)'; ctx.beginPath(); ctx.ellipse(bx + TS * 0.35, by - TS * 0.2, w * 0.42, TS * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      if (a.fade) ctx.globalAlpha = 0.5;
      // the crown sways with the wind, more at the top; the trunk stays put
      const sway = isOpenAir(m) ? ambWind(a.x, a.y, T) * 1.3 : 0, k32 = h / a.c.height;
      for (const [f0, f1, kk] of [[0, 0.2, 1], [0.2, 0.4, 0.7], [0.4, 0.62, 0.35], [0.62, 1, 0]]) {
        const s0 = Math.round(a.c.height * f0), s1 = Math.round(a.c.height * f1), off = Math.round(sway * kk) * TS / 32;
        ctx.drawImage(a.c, 0, s0, a.c.width, s1 - s0, Math.round(bx - w / 2) + off, Math.round(by - h) + s0 * k32, w, (s1 - s0) * k32);
      }
      ctx.globalAlpha = 1;
      continue;
    }
    const lift = Math.round(a.bob * TS / 16), px = ox + a.x * TS, py = oy + a.y * TS, aw = a.c.hd ? TS : TS * Math.max(32, a.c.width) / 32, h = a.c.hd ? TS * a.c.height / a.c.width : a.c.width > 32 ? TS * a.c.height / 32 : TS * a.c.height / a.c.width, top = py + TS - h + figureTop(a.c) * TS / a.c.width - lift;
    // lit by the place they stand in
    const L = envLight(m, a.x, a.y);
    if (a.lying) {
      // fallen: the body laid on its side across the tile
      ctx.save(); ctx.translate(Math.round(px + TS / 2), Math.round(py + TS * 0.82)); ctx.rotate(-Math.PI / 2);
      ctx.drawImage(envLit(a.c, L), -aw * 0.4, -h * 0.5, aw * 0.8, h * 0.8); ctx.restore();
    } else if (!a.prop && tileAt(m, Math.round(a.x), Math.round(a.y)) === 'z') {
      // wading: below the waterline the legs show faintly through the water
      const wl = Math.round(py + TS - TS * 0.3);
      ctx.save(); ctx.beginPath(); ctx.rect(px - TS, py - TS * 3, TS * 3, wl - (py - TS * 3)); ctx.clip();
      ctx.drawImage(envLit(a.c, L), Math.round(px), Math.round(py + TS - h - lift), TS, h); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(px - TS, wl, TS * 3, TS); ctx.clip(); ctx.globalAlpha = 0.28;
      ctx.drawImage(envLit(a.c, L), Math.round(px), Math.round(py + TS - h - lift), TS, h); ctx.restore();
      const rr = TS * (0.3 + Math.sin(T / 300) * 0.02);
      ctx.strokeStyle = 'rgba(225,242,252,0.65)'; ctx.lineWidth = Math.max(1, TS / 32); ctx.beginPath(); ctx.ellipse(px + TS / 2, wl, rr, rr * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    } else ctx.drawImage(envLit(a.c, L), Math.round(px - (aw - TS) / 2), Math.round(py + TS - h - lift), aw, h);
    if (a.flash) { ctx.save(); ctx.globalAlpha = 0.7; ctx.drawImage(whiteSilhouette(a.c), Math.round(px - (aw - TS) / 2), Math.round(py + TS - h - lift), aw, h); ctx.restore(); }
    // standing in grass, a few blades rise in front of the feet
    if (L.grass && m.theme !== 'house') {
      const u = TS / 32, gx = Math.round(a.x), gy = Math.round(a.y), base = Math.round(py + TS - u);
      for (let k = 0; k < 5; k++) {
        const hsh = tileHash(gx * 13 + k * 7, gy * 5 + k), bx = Math.round(px + (9 + k * 3.4 + (hsh % 3)) * u), bh = 2 + (hsh >> 3) % 3, lean = (hsh >> 5) % 3 - 1;
        for (let j = 0; j < bh; j++) { ctx.fillStyle = j === bh - 1 ? GRASS32.tip : GRASS32.blade; ctx.fillRect(bx + (j === bh - 1 ? lean * u : 0), base - j * u, u, u); }
      }
    }
    if (a.mark) {
      // a little speech bubble: gold when they have something to ask, blue when you can finish what you promised
      const bx = px + TS / 2, by = top - TS * 0.28, r = TS * 0.2;
      ctx.fillStyle = a.mark === 'ready' ? '#7fb6ff' : '#ffcd6b'; ctx.strokeStyle = 'rgba(20,14,30,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.moveTo(bx - r * 0.35, by + r * 0.8); ctx.lineTo(bx, by + r * 1.6); ctx.lineTo(bx + r * 0.35, by + r * 0.8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1206'; ctx.font = `700 ${Math.round(r * 1.5)}px "Figtree", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.mark === 'ready' ? '?' : '!', bx, by + 1); ctx.textBaseline = 'alphabetic';
    }
    const o = a.mon; if (!o) continue;
    if (o.sleep > 0 || o.fear > 0) { ctx.font = `700 ${Math.round(TS * 0.32)}px "Figtree", sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; const tx = o.sleep > 0 ? 'z' : '!'; ctx.strokeText(tx, px + TS * 0.85, top + TS * 0.1); ctx.fillStyle = o.sleep > 0 ? '#9cc0f5' : '#ffd27a'; ctx.fillText(tx, px + TS * 0.85, top + TS * 0.1); }
    if (o.hp < o.mhp) { const bw = TS * 0.7, bx = px + (TS - bw) / 2; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, top - 6, bw + 2, 5); ctx.fillStyle = o.hp / o.mhp > 0.5 ? '#8fd16a' : o.hp / o.mhp > 0.25 ? '#f2b84b' : '#e5484d'; ctx.fillRect(bx, top - 5, bw * Math.max(0, o.hp / o.mhp), 3); }
  }
  const hv = visualPos(p), hx = ox + hv.x * TS, hy = oy + hv.y * TS;
  // smoke, leaves on the wind, butterflies
  drawSmoke(m, ox, oy, T);
  if (isOpenAir(m)) { spawnLeaves(m, trees, T); drawButterflies(m, ox, oy, T, W, H); }
  drawFx(m, ox, oy, T, 'air');
  // darkness: underground, everything outside your light and the lit areas falls into shadow
  if (!m.lit && !m.outdoor) {
    darkCv.width = W; darkCv.height = H;
    const d = darkCv.getContext('2d');
    d.fillStyle = 'rgba(6,4,12,0.86)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => { const gr = d.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill(); };
    const R = lightRadius();
    hole(hx + TS / 2, hy + TS / 2, (R + 1.3) * TS);
    const shown = m.lights.filter(([lx, ly]) => m.seen[ly * m.w + lx] && Math.abs(ox + lx * TS - W / 2) < W && Math.abs(oy + ly * TS - H / 2) < H);
    for (const [lx, ly, r] of shown) hole(ox + (lx + 0.5) * TS, oy + (ly + 0.5) * TS, (r + 1.2) * TS);
    ctx.drawImage(darkCv, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, c) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    for (const [lx, ly, , kind] of shown) glow(ox + (lx + 0.5) * TS, oy + (ly + 0.3) * TS, TS * 2.2, kind === 'brazier' ? 'rgba(255,130,30,0.34)' : kind === 'glow' ? 'rgba(90,200,230,0.30)' : 'rgba(255,160,60,0.26)');
    // your own light: a warm wash over everything it reaches, brightest in hand
    if (p.equip.light && p.equip.light.fuel > 0) { glow(hx + TS / 2, hy + TS / 2, TS * (lightRadius() + 1), 'rgba(255,150,60,0.16)'); glow(hx + TS * 0.12, hy - TS * 0.1, TS * 1.9, 'rgba(255,170,70,0.24)'); }
    ctx.globalCompositeOperation = 'source-over';
    if (p.equip.light && p.equip.light.fuel > 0) drawMotes(hx, hy, T);
  }
  // daylight: a warm sun from the upper left and cooler shade to the lower right, laid over the ground,
  // the buildings and the people alike, so they all sit in the same light
  if ((m.lit || m.outdoor) && m.theme !== 'house') {
    const sun = ctx.createLinearGradient(0, 0, W, H);
    sun.addColorStop(0, DL.sun); sun.addColorStop(0.55, DL.mid); sun.addColorStop(1, DL.shade);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    // evening and night: the dark comes down, except around you, the street lamps and the doorways
    drawNight(m, ox, oy, W, H, hx, hy, tall.filter(t => t.kind === 'lamppost').map(t => [t.x, t.y]), DL.night, T);
  }
  // indoors: a warm dimness, with firelight and candles
  if (m.theme === 'house') {
    ctx.fillStyle = 'rgba(40,18,6,0.2)'; ctx.fillRect(ox, oy, m.w * TS, m.h * TS);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, , kind] of m.lights) {
      const x = ox + (lx + 0.5) * TS, y = oy + (ly + 0.2) * TS, r = kind === 'hearth' ? TS * 3.4 : TS * 1.7;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, kind === 'hearth' ? 'rgba(255,140,50,0.34)' : 'rgba(255,190,90,0.24)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // one shared, earthy palette for everything in view, so nothing is a bright sticker on a painted ground
  ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.16; ctx.fillStyle = 'hsl(30, 0%, 50%)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, m.lit || m.outdoor ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // floating numbers
  if (floaters.length) {
    const now = performance.now(); floaters = floaters.filter(f => now - f.t0 < 950);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of floaters) {
      const k = (now - f.t0) / 950;
      const x = ox + (f.tx + 0.5 + f.dx) * TS, y = oy + f.ty * TS + TS * 0.1 - (reduceMotion ? 0 : k * TS * 0.9);
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.font = `700 ${f.big ? Math.round(TS * 0.75) : Math.round(TS * 0.5)}px "Figtree", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
  // tracers
  if (tracers.length) {
    const now = performance.now(); tracers = tracers.filter(t => now - t.t0 < 260);
    for (const t of tracers) {
      const k = (now - t.t0) / 260; const ax = ox + (t.x0 + 0.5) * TS, ay = oy + (t.y0 + 0.5) * TS, bx = ox + (t.x1 + 0.5) * TS, by = oy + (t.y1 + 0.5) * TS;
      const hx2 = ax + (bx - ax) * Math.min(1, k * 2), hy2 = ay + (by - ay) * Math.min(1, k * 2);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = t.color; ctx.lineWidth = Math.max(2, TS / 12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax + (hx2 - ax) * 0.4, ay + (hy2 - ay) * 0.4); ctx.lineTo(hx2, hy2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // target reticle
  const tg = !dead ? currentTarget() : null;
  if (tg) {
    const tv = visualPos(tg), rx = ox + tv.x * TS, ry = oy + tv.y * TS, c = TS * 0.28, w = Math.max(2, TS / 14);
    ctx.strokeStyle = targetPinned ? '#ffd27a' : 'rgba(255, 210, 122, 0.8)'; ctx.lineWidth = w;
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[rx, ry, 1, 1], [rx + TS, ry, -1, 1], [rx, ry + TS, 1, -1], [rx + TS, ry + TS, -1, -1]]) { ctx.moveTo(x, y + dy * c); ctx.lineTo(x, y); ctx.lineTo(x + dx * c, y); }
    ctx.stroke();
  }
  renderTargetCard(tg);
  // pick-up prompt under the hero
  const pr = $('#prompt');
  if (pr) {
    const here = m.ground.filter(g => g.x === p.x && g.y === p.y);
    const near = here.length ? here : m.ground.filter(g => cheb(g, p) === 1 && canSee(g.x, g.y));
    if (near.length && !dead && !modalOpen) {
      const label = near.some(g => g.story) ? 'Examine the body' : `Pick up ${near.length > 1 ? near.length + ' things' : groundLabel(near[0])}`;
      pr.innerHTML = `<kbd>G</kbd>${esc(label)}`; pr.hidden = false;

    } else pr.hidden = true;
  }
}
const buildingCache = new Map();
function landmarkFor(lm) {
  if (lm.art !== 'building') return landmarkCanvas(lm.art);
  const key = JSON.stringify(lm.spec);
  let c = buildingCache.get(key); if (!c) { c = buildingArt(lm.spec); buildingCache.set(key, c); }
  return c;
}
// What you remember but can't see now is dimmed, and what you've never seen is dark.
// The mask is one pixel per tile, scaled up with smoothing so the edge of your sight is soft.
const fogCv = document.createElement('canvas');
// the first painted row of a sprite, for placing health bars and sleep marks above its head
const topCache = new WeakMap();
function figureTop(c) {
  let t = topCache.get(c);
  if (t === undefined) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; t = 0; while (t < c.height - 1 && ![...Array(c.width).keys()].some(x => d[(t * c.width + x) * 4 + 3])) t++; topCache.set(c, t); }
  return t;
}
function drawFog(m, ox, oy) {
  if (m.lit) return;
  if (fogCv.width !== m.w || fogCv.height !== m.h) { fogCv.width = m.w; fogCv.height = m.h; }
  const [r, gg, b] = m.outdoor ? [10, 20, 9] : [8, 6, 15], mem = m.outdoor ? 100 : 184, never = m.outdoor ? 190 : 255;
  const W = m.w, H = m.h, a = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = !m.seen[y * W + x] ? never : vis.has(K(x, y)) ? 0 : mem;
  // one box blur so the edge of sight fades over a couple of tiles instead of stair-stepping
  const g = fogCv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = x + dx, ty = y + dy; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue; sum += a[ty * W + tx]; n++; }
    const i = (y * W + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    // keep what you can see clear at its heart; the blur only darkens toward the edge
    d[i + 3] = a[y * W + x] === 0 ? Math.min(sum / n, 70) : Math.max(sum / n, a[y * W + x] * 0.8);
  }
  g.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(fogCv, ox, oy, W * TS, H * TS); ctx.imageSmoothingEnabled = false;
}
// Broad, soft patches of darker and lighter grass, so a meadow isn't one flat green.
// One pixel per tile, smoothed when scaled up; cached per map.
const meadowCache = new WeakMap();
const GRASSY = ',fTYS';
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = (x - xi) * (x - xi) * (3 - 2 * (x - xi)), v = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
  const h = (a, b) => (tileHash(a, b) & 1023) / 1023, a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function drawMeadow(m, ox, oy) {
  let cv = meadowCache.get(m);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h;
    const g = cv.getContext('2d'), img = g.createImageData(m.w, m.h), d = img.data;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      // grass gets green-gold patches; floors underground get damp darks and dusty lights
      const t = m.t[y][x], ground = GRASSY.includes(t), floor = t === '.' || t === ';' || t === ':';
      if (!ground && !floor) continue;
      const n = vnoise(x / 5, y / 5) * 0.7 + vnoise(x / 2, y / 2) * 0.3 - 0.5, i = (y * m.w + x) * 4;
      if (ground) { if (n < 0) { d[i] = 24; d[i + 1] = 56; d[i + 2] = 14; } else { d[i] = 200; d[i + 1] = 228; d[i + 2] = 120; } }
      else { if (n < 0) { d[i] = 20; d[i + 1] = 16; d[i + 2] = 22; } else { d[i] = 220; d[i + 1] = 205; d[i + 2] = 175; } }
      d[i + 3] = Math.min(120, Math.abs(n) * 420);
    }
    g.putImageData(img, 0, 0); meadowCache.set(m, cv);
  }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, ox, oy, m.w * TS, m.h * TS); ctx.imageSmoothingEnabled = false;
}
// a woven rug, w×h tiles, on the 16-pixel grid
// Gold lying on the floor, at true size: a few coins scattered for a little, a small heap for more; each coin
// a lit gold disc with a dark rim, face up and catching the light.
const COIN_CACHE = new Map();
function groundCoins(amount, seed) {
  const n = amount < 15 ? 3 : amount < 40 ? 5 : amount < 100 ? 8 : 12, key = n + '|' + (seed % 4);
  if (COIN_CACHE.has(key)) return COIN_CACHE.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 32; const x2 = c.getContext('2d');
  let s = seed * 9301 + 49297; const R = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const F = (x, y, w, h, col) => { x2.fillStyle = col; x2.fillRect(Math.round(x), Math.round(y), w, h); };
  const coins = [];
  for (let i = 0; i < n; i++) { const heap = n >= 8 && i >= n - 5; const a = R() * Math.PI * 2, r = heap ? R() * 2.5 : 2 + R() * 6; coins.push([16 + Math.cos(a) * r, 21 + Math.sin(a) * r * 0.55 - (heap ? (i - (n - 5)) * 1.2 : 0), R() < 0.2]); }
  coins.sort((p, q) => p[1] - q[1]);
  F(9, 23, 14, 2, 'rgba(0,0,0,0.18)');
  for (const [x, y] of coins) {
    F(x - 3, y - 1, 6, 3, '#3a2a10'); F(x - 2, y - 2, 4, 5, '#3a2a10');
    F(x - 2, y - 1, 4, 2, '#c8962a'); F(x - 1, y - 1, 2, 1, '#f2d06a'); F(x - 2, y + 1, 4, 1, '#8a6418');
  }
  COIN_CACHE.set(key, c); return c;
}
function drawRug(px, py, w, h) {
  const u = TS / 16, W = w * 16, H = h * 16;
  const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(px + x * u, py + y * u, ww * u, hh * u); };
  R(1, 2, W - 2, H - 4, '#7d2027'); R(3, 4, W - 6, H - 8, '#9e2c32'); R(5, 6, W - 10, H - 12, '#7d2027');
  for (let x = 7; x < W - 7; x += 4) { R(x, 8, 2, 2, '#e3b93c'); R(x, H - 10, 2, 2, '#e3b93c'); }
  R(W / 2 - 3, H / 2 - 3, 6, 6, '#e3b93c'); R(W / 2 - 1, H / 2 - 1, 2, 2, '#7d2027');
  for (let x = 2; x < W - 2; x += 2) { R(x, 0, 1, 2, '#d8c8a6'); R(x, H - 2, 1, 2, '#d8c8a6'); }
}
function drawSite(m, x, y) {
  const site = m.trig[K(x, y)].site;
  let name = 'sign';
  if (S.home.built[site]) name = site === 'garden' ? (S.home.gardenDay > S.day ? 'gardenGrowing' : 'garden') : STRUCTURES[site].spr;
  const [ox, oy] = viewOffset(cvs.width / (window.devicePixelRatio || 1), cvs.height / (window.devicePixelRatio || 1));
  ctx.drawImage(propCanvas(name), ox + x * TS, oy + y * TS, TS, TS);
}
function drawNode(n, x, y) {
  const ready = n.ready <= S.day;
  const name = n.t === 'tree' ? (ready ? 'pine' : 'stump') : n.t === 'rock' ? (ready ? 'rock' : 'rubble') : (ready ? 'herb' : 'sprout');
  const [ox, oy] = viewOffset(cvs.width / (window.devicePixelRatio || 1), cvs.height / (window.devicePixelRatio || 1));
  ctx.drawImage(propCanvas(name), ox + x * TS, oy + y * TS, TS, TS);
}

function bar(cur, max, cls) { const pct = max ? clamp(cur / max * 100, 0, 100) : 0; return `<div class="bar ${cls}"><i style="width:${pct}%"></i><span>${Math.max(0, cur)} / ${max}</span></div>`; }
function renderTargetCard(tg) {
  const el = $('#target'); if (!el) return;
  if (tg === undefined) tg = S ? currentTarget() : null;
  if (!tg || dead || !S) { el.hidden = true; return; }
  const t = MONSTERS[tg.id], p = P(), pct = clamp(tg.hp / tg.mhp * 100, 0, 100);
  const wt = weaponT(), canShoot = wt && RANGED_CLS.has(wt.cls);
  const state = tg.sleep > 0 ? 'Asleep' : tg.fear > 0 ? 'Fleeing' : (!tg.hunting && !tg.angry && !t.boss) ? 'Unaware' : '';
  el.innerHTML = `${spriteImg(monCanvas(tg.id), 40)}<div class="tg-info"><div class="tg-name"><b>${esc(cap(mname(tg)))}</b><span>${state ? `<em>${state}</em> · ` : ''}${cheb(tg, p) === 1 ? 'Adjacent' : cheb(tg, p) + ' tiles'}</span></div><div class="bar hp"><i style="width:${pct}%"></i><span>${Math.max(0, tg.hp)} / ${tg.mhp}</span></div></div>
    <button class="tg-btn" data-a="tcycle" title="Next target (Tab)" aria-label="Next target">⟳</button>${canShoot ? '<button class="tg-btn fire" data-a="fire" title="Shoot (F)" aria-label="Shoot">Shoot</button>' : ''}`;
  el.hidden = false;
}
function setBar(sel, cur, max) { const el = $(sel); if (!el) return; const pct = max ? clamp(cur / max * 100, 0, 100) : 0; el.innerHTML = `<i style="width:${pct}%"></i><span>${Math.max(0, cur)} / ${max}</span>`; }
function renderSide() {
  const p = P(), m = curMap();
  $('#hud-portrait').innerHTML = spriteImg(dead ? propCanvas('body') : heroSprite(p.equip), 80, 'head');
  $('#hud-name').textContent = p.name;
  $('#hud-level').textContent = `Lv ${p.level} · Acolyte of Aurel`;
  setBar('#hud-hp', p.hp, maxHp()); setBar('#hud-mp', p.mp, maxMp());
  $('#hud-xp').style.width = clamp(p.xp / xpToNext(p.level) * 100, 0, 100) + '%';
  $('#hud-xp').parentElement.title = `Experience ${p.xp} / ${xpToNext(p.level)}`;
  const fx = [];
  if (p.sneak) fx.push(['sneak', 'Sneaking', '']);
  if (p.attrPts || p.skillPts) fx.push(['level', `${p.attrPts + p.skillPts} point${p.attrPts + p.skillPts > 1 ? 's' : ''} to spend`, '']);
  for (const k in p.buffs || {}) if (p.buffs[k] > 0) fx.push(['good', BUFF_NAMES[k], p.buffs[k]]);
  if (p.strBuff) fx.push(['good', 'Strength', p.strBuff]);
  const st = p.st;
  if (st.poison) fx.push(['bad', 'Poisoned', st.poison]); if (st.sick) fx.push(['bad', 'Sick', st.sick]); if (st.blind) fx.push(['bad', 'Blind', st.blind]);
  if (st.confused) fx.push(['bad', 'Confused', st.confused]); if (st.slowed) fx.push(['bad', 'Slowed', st.slowed]); if (st.grabbed) fx.push(['bad', 'Held', '']);
  const bd = burden(); if (bd) fx.push(['bad', bd === 2 ? 'Overloaded' : 'Burdened', '']);
  const lt = p.equip.light;
  if (!m.lit && !m.outdoor) fx.push(lt && lt.fuel > 0 ? ['light', T(lt).name, lt.fuel] : ['bad', 'In the dark', '']);
  $('#hud-effects').innerHTML = fx.map(([c, n, v]) => `<span class="fx ${c}" ${c === 'level' ? 'data-a="hero" data-v="skills" role="button" tabindex="0"' : ''}>${n}${v !== '' ? ` <b>${v}</b>` : ''}</span>`).join('');
  $('#hud-loc').innerHTML = `<b>${esc(m.name)}</b><span>Day ${S.day} · ${dayPhase()}${typeof weatherLabel === 'function' ? weatherLabel() : ''}</span>`;
  drawMinimap();
  $('#hud-quest').innerHTML = questHtml();
  const arrows = p.inv.find(i => i.id === 'arrows');
  $('#hud-gold').textContent = p.gold;
  $('#hud-gold').title = `${p.gold} gold${arrows ? ` · ${arrows.q} arrows` : ''}`;
  renderHotbar();
}
function drawMinimap() {
  const c = $('#minimap'); if (!c) return;
  const m = curMap(), p = P(); const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = '#120f19'; g.fillRect(0, 0, W, H);
  const s = Math.max(1, Math.min(W / m.w, H / m.h)); const ox = (W - m.w * s) / 2, oy = (H - m.h * s) / 2;
  const COL = { '.': '#7d6f5a', '<': '#f2b84b', '>': '#f2b84b', 'C': '#f2b84b', '{': '#f2b84b', '}': '#f2b84b', ',': '#3f6b2a', 'f': '#4f7a30', ':': '#a89a7a', ';': '#8a7048', '~': '#3b6fc4', 'Y': '#1f3a18', 'T': '#2a4a20', 'w': '#9c7a50', 'r': '#8a3a2a', 'h': '#a8843a', 'l': '#4a5468', 'K': '#6f6a62', 'H': '#b8a888', 'W': '#7a3a2a', 'O': '#c99a3a', '+': '#c99a3a', 'Z': '#5a5650', '^': '#4a4a4a', 'V': '#8a6d1f', 'G': '#c9784a', 'S': '#c99a3a', 'Q': '#d8cdb6', 'J': '#8a5a2b', 'E': '#f2b84b', 'X': '#f2b84b', 'F': '#3b6fc4' };
  // one pixel per tile into a small image, then scaled up in a single draw (thousands of fillRects were the slow part)
  const mc = drawMinimap.cv || (drawMinimap.cv = document.createElement('canvas')), mg = mc.getContext('2d');
  if (mc.width !== m.w || mc.height !== m.h) { mc.width = m.w; mc.height = m.h; }
  const img = mg.createImageData(m.w, m.h), d = img.data, RGB = drawMinimap.rgb || (drawMinimap.rgb = {});
  const rgb = col => RGB[col] || (RGB[col] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)]);
  for (let y = 0; y < m.h; y++) { const row = m.t[y]; for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x; if (!m.lit && !m.seen[i]) continue;
    const t = row[x]; let col = COL[t];
    if (t === '#') col = m.lit ? null : '#2c2636';
    if (!col) continue;
    const c3 = rgb(col), j = i * 4; d[j] = c3[0]; d[j + 1] = c3[1]; d[j + 2] = c3[2]; d[j + 3] = 255;
  } }
  mg.putImageData(img, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(mc, ox, oy, m.w * s, m.h * s);
  for (const [lx, ly] of m.lights || []) if (m.lit || m.seen[ly * m.w + lx]) { g.fillStyle = '#ff8a3a'; g.fillRect(ox + lx * s, oy + ly * s, Math.ceil(s), Math.ceil(s)); }
  for (const o of m.mons) if (monVisible(o) || buff('detect') || (has('tracker') && m.outdoor && cheb(o, p) <= 20)) { g.fillStyle = MONSTERS[o.id].prey ? (typeof A11Y !== 'undefined' && A11Y.cb ? '#7fd0f5' : '#ffd27a') : (typeof A11Y !== 'undefined' && A11Y.cb ? '#ff9a1f' : '#ff5a5f'); g.fillRect(ox + o.x * s - 0.5, oy + o.y * s - 0.5, Math.ceil(s) + 1, Math.ceil(s) + 1); }
  g.fillStyle = '#ffffff'; g.fillRect(ox + p.x * s - 1, oy + p.y * s - 1, Math.ceil(s) + 2, Math.ceil(s) + 2);
}
function questHtml() {
  const st = S.story; const seals = KINGDOM_ORDER.filter(k => S.seals[k]).length;
  const steps = [
    [!!st.halvard, 'Find Father Halvard', ''],
    [!!st.junction, 'Reach the junction on cave level 3', ''],
    [seals === 4, 'Recover the four kingdom seals', `${seals}/4`],
    [!!st.gate, 'Open the sealed door', ''],
    [!!S.wyrmSlain, 'Face what sleeps in the Deep', ''],
  ];
  const open = steps.findIndex(s => !s[0]);
  const shown = open < 0 ? steps.slice(-2) : steps.slice(Math.max(0, open - 1), open + 2);
  const gods = GOD_ORDER.filter(g => P().gods[g]).length;
  const news = S.events.map(e => EVENTS.find(x => x.id === e.id).name);
  return `<span class="q-kicker">Main quest</span><b class="q-title">The Missing Priest</b>` +
    shown.map(([done, t, n]) => `<div class="q-step ${done ? 'done' : ''}"><i aria-hidden="true"></i><span>${t}</span>${n ? `<em>${n}</em>` : ''}</div>`).join('') +
    `<div class="q-meta">Gods ${gods}/${GOD_ORDER.length} · Seals ${seals}/4</div>` +
    (S.parish ? (() => { const P_ = S.parish, act = Object.keys(P_.duties).filter(id => P_.duties[id].st !== 'done'), ready = act.filter(dutyReady).length; return `<button class="q-parish" data-a="p" data-v="ledger">Parish: ${standingName()}${act.length ? ` · ${act.length} dut${act.length > 1 ? 'ies' : 'y'}${ready ? `, ${ready} ready` : ''}` : ''}</button>`; })() : '') +
    (news.length ? `<div class="q-news">Market: ${esc(news.join(' · '))}</div>` : '');
}
// ---- hotbar: weapon, then potions and scrolls you carry, then spells, then prayers ----
let hotbarSlots = [];
const HOT_ITEMS = ['pheal', 'pgheal', 'pmana', 'pantidote', 'pstr', 'plife', 'srecall', 'steleport', 'smapping', 'senchant', 'oil'];
function renderHotbar() {
  const p = P(); const s = [];
  if (p.equip.weapon) s.push({ kind: 'weapon', it: p.equip.weapon });
  if (typeof giftSlot === 'function') { const gs = giftSlot(); if (gs) s.push(gs); }
  for (const id of HOT_ITEMS) { const it = p.inv.find(i => i.id === id); if (it) s.push({ kind: 'item', it }); }
  for (const sp of (p.favSpells || p.spells.slice(0, 4))) if (p.spells.includes(sp)) s.push({ kind: 'spell', id: sp });
  for (const g of GOD_ORDER) if (p.gods[g]) s.push({ kind: 'god', id: g });
  hotbarSlots = s.slice(0, 10);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  $('#hotbar-slots').innerHTML = keys.map((k, i) => {
    const h = hotbarSlots[i];
    if (!h) return `<div class="hslot empty" aria-hidden="true"><span class="hk">${k}</span></div>`;
    let img, count = '', title, dim = false, cool = '';
    if (h.kind === 'weapon' || h.kind === 'item') { img = icon(h.it); count = h.it.q > 1 ? h.it.q : ''; title = h.kind === 'weapon' ? `${itemName(h.it)} (equipped)` : itemName(h.it); }
    if (h.kind === 'spell') { img = spriteImg(spellIcon(h.id), 32); title = `${SPELLS[h.id].name}, ${spellCost(h.id)} MP`; dim = p.mp < spellCost(h.id); }
    if (h.kind === 'gift') ({ img, title, dim, cool } = giftSlotView(h));
    if (h.kind === 'god') { img = spriteImg(propCanvas('shrine_' + h.id), 32); title = GODS[h.id].power.name; if (prayedOut(h.id)) { dim = true; cool = '<span class="cool">Tomorrow</span>'; } }
    return `<button class="hslot ${h.kind === 'weapon' ? 'equipped' : ''} ${dim ? 'dim' : ''}" data-a="hot" data-v="${i}" title="${esc(title)} (${k})" aria-label="${esc(title)}">${img}<span class="hk">${k}</span>${count ? `<span class="hc">${count}</span>` : ''}${cool}</button>`;
  }).join('');
}
function useHot(i) {
  if (modalOpen || dead || !S) return;
  const h = hotbarSlots[i]; if (!h) return;
  if (h.kind === 'weapon') return openHero('inv');
  if (h.kind === 'item') return useItem(h.it);
  if (h.kind === 'spell') return cast(h.id);
  if (h.kind === 'god') return invoke(h.id);
  if (h.kind === 'gift') return useGift();
}

// ================= modals =================
let modalRefresh = null, modalLocked = false;
function openModal(title, html, opts = {}) {
  modalOpen = true; modalLocked = !!opts.noClose;
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal-x').hidden = !!opts.noClose;
  modalRefresh = opts.refresh || null;
  $('#modal .win').classList.toggle('wide', !!opts.wide);
}
function closeModal(force) {
  if (modalLocked && force !== true) return;
  $('#modal').hidden = true; modalOpen = false; modalRefresh = null; modalLocked = false;
  if (S) render();
}
function refresh() { if (modalRefresh) modalRefresh(); render(); }

function itemRow(it, buttons, extra = '') {
  return `<div class="row"><span class="gl">${icon(it)}</span><div class="nm"><b>${esc(itemName(it))}</b><small>${esc(itemDesc(it))}</small></div>${extra}<div class="acts">${buttons}</div></div>`;
}
function matRow(id, n, buttons, extra = '') {
  return `<div class="row"><span class="gl">${matIcon(id)}</span><div class="nm"><b>${MATS[id].name}${n != null ? ' ×' + n : ''}</b><small>${CAT_NAMES[MATS[id].cat]}</small></div>${extra}<div class="acts">${buttons}</div></div>`;
}
const keeperArt = (canvas, html) => `<div class="keeper"><span class="gl big">${spriteImg(canvas, 56, canvas.height > canvas.width ? 'head' : undefined)}</span>${html}</div>`;

// ---- tabbed windows ----
let winTabs = null;
function openTabs(title, tabs, cur) {
  winTabs = { tabs, cur };
  const draw = () => {
    const t = winTabs.tabs.find(t => t[0] === winTabs.cur) || winTabs.tabs[0];
    $('#modal-body').innerHTML = `<div class="sheet-tabs" role="tablist">${winTabs.tabs.map(([k, l]) => `<button class="stab ${k === t[0] ? 'on' : ''}" role="tab" aria-selected="${k === t[0]}" data-a="wtab" data-v="${k}">${l}</button>`).join('')}</div><div class="sheet">${t[2]()}</div>`;
  };
  openModal(title, '', { refresh: draw, wide: true }); draw();
}
const openHero = tab => openTabs(P().name, [['inv', 'Inventory', htmlInventory], ['char', 'Character', htmlCharacter], ['skills', 'Skills', htmlSkills], ['magic', 'Spells & Prayers', htmlMagic], ['craft', 'Crafting', htmlCrafting], ['gods', 'Gods', htmlGods], ['parish', 'Parish', htmlParish]], tab);
let craftView = 'forge';
const STATION_LABEL = { forge: 'Forge', bench: 'Alchemy Bench', altar: 'Enchanting Altar' };
// Every recipe and building project in one place. Crafting and building happen on your land.
function htmlCrafting() {
  const p = P(); const home = S.mapId === 'home';
  const views = [['forge', 'Forge'], ['bench', 'Alchemy'], ['altar', 'Altar'], ['land', 'Homestead'], ['mats', 'Materials']];
  const tabs = `<div class="filters" role="tablist">${views.map(([k, l]) => `<button class="${craftView === k ? 'on' : ''}" role="tab" aria-selected="${craftView === k}" data-a="cview" data-v="${k}">${l}</button>`).join('')}</div>`;
  const note = home ? '<p class="hint" style="margin-top:0 !important">You are on your land: materials in storage count, and you can craft at any station you have built.</p>' : '<p class="hint" style="margin-top:0 !important">Browse recipes anywhere. Make things at a station: Bran lets you use his forge, Tamsin her cauldron and Mirela her crystals, or build your own on your land. Each thing you make raises the craft’s skill.</p>';
  if (craftView === 'mats') {
    const ids = Object.keys(MATS);
    return tabs + `<div class="matgrid">${ids.map(id => { const a = matCount(id), b = (S.home.mats || {})[id] || 0; return `<div style="${a + b ? '' : 'opacity:.45'}">${spriteImg(matCanvas(id), 24)}<span>${MATS[id].name}<small>${a} carried · ${b} stored</small></span><b>${a + b}</b></div>`; }).join('')}</div>
      <p class="hint">Materials come from monsters, ore veins in the caves, hunting in the Whisperwood, and the trees, rocks, garden and mine on your land.</p>`;
  }
  if (craftView === 'land') {
    if (!S.home.owned) return tabs + '<p class="lead">You need land first. The Land Registry in the Town Hall sells the East Field.</p>';
    const rows = Object.entries(STRUCTURES).map(([k, st]) => {
      const built = S.home.built[k], up = lv2(k);
      const target = !built ? st : !up ? st.up : null;
      const cost = target ? [`<span class="${p.gold >= target.gold ? 'ok' : 'no'}">${target.gold}g</span>`, ...Object.entries(target.mats).map(([m, n]) => `<span class="${matAvail(m) >= n ? 'ok' : 'no'}" title="${MATS[m].name}">${spriteImg(matCanvas(m), 20)}${n}<small>/${matAvail(m)}</small></span>`)].join(' ') : '';
      const btn = !target ? '<span class="lock">Fully upgraded</span>' : !home ? '<span class="lock">Do this on your land</span>' : `<button class="btn tiny ${canAfford(target) ? 'default' : ''}" data-a="${built ? 'upgrade' : 'build'}" data-v="${k}" ${canAfford(target) ? '' : 'disabled'}>${built ? 'Upgrade' : 'Build'}</button>`;
      return `<div class="row"><span class="gl">${spriteImg(propCanvas(st.spr), 32)}</span><div class="nm"><b>${built ? structName(k) : st.name}${built ? ` <span class="pill ${up ? '' : 'off'}" style="font-size:10px">${up ? 'Level 2' : 'Level 1'}</span>` : ''}</b><small>${!built ? st.desc : !up ? `Upgrade to ${st.up.name}: ${st.up.desc}` : st.up.desc}</small></div>${cost ? `<span class="mats">${cost}</span>` : ''}<div class="acts">${btn}</div></div>`;
    }).join('');
    return tabs + note + `<div class="list">${rows}</div>`;
  }
  const built = craftHere(craftView) || S.home.built[craftView], here = craftHere(craftView);
  const recs = RECIPES.filter(r => r.st === craftView);
  const rows = recs.map(r => {
    const it = makeItem(r.out, 0, r.qty || 1); const known = has(r.skill);
    const okMats = Object.entries(r.mats).every(([m, n]) => matAvail(m) >= n);
    const mats = Object.entries(r.mats).map(([m, n]) => `<span class="${matAvail(m) >= n ? 'ok' : 'no'}" title="${MATS[m].name}">${spriteImg(matCanvas(m), 20)}${n}<small>/${matAvail(m)}</small></span>`).join(' ');
    const why = !known ? `Needs ${SKILL_NODES[r.skill].name}` : !here ? (craftView === 'forge' ? "Work at Bran's forge, or your own" : craftView === 'bench' ? "Work at Tamsin's cauldron, or your own bench" : "Work at Mirela's crystals, or your own altar") : !okMats ? 'Missing materials' : '';
    return itemRow(it, why ? `<span class="lock">${why}</span>` : `<button class="btn tiny default" data-a="craft" data-v="${RECIPES.indexOf(r)}">Craft${r.qty > 1 ? ' ×' + r.qty : ''}</button>`, `<span class="mats">${mats}</span>`);
  }).join('');
  const canNow = recs.filter(r => has(r.skill) && here && Object.entries(r.mats).every(([m, n]) => matAvail(m) >= n)).length;
  return tabs + note + `<p class="dim">${STATION_LABEL[craftView]}: ${built ? `built${lv2(craftView) ? ` (${STRUCTURES[craftView].up.name})` : ''}` : 'not built yet'} · ${canNow} recipe${canNow === 1 ? '' : 's'} you can make right now.</p><div class="list">${rows}</div>`;
}
const openGame = tab => openTabs('Game', [['options', 'Options', htmlOptions], ['help', 'How to play', htmlHelp], ['save', 'Save', htmlSave]], tab);
const openInventory = () => openHero('inv'), openChar = () => openHero('char'), openSpells = () => openHero('magic'), openPrayers = () => openHero('magic'), openPantheon = () => openHero('gods');
const openOptions = () => openGame('options'), openHelp = () => openGame('help');

// ---- inventory ----
let invSel = null, invFilter = 'all';
const GRADE_COLOR = { iron: '#9a9a9a', steel: '#5fc46a', silver: '#4c8dff', mithril: '#b56cff', royal: '#f2a03b' };
function itemColor(t) {
  if (t.cat === 'story') return '#f2b84b';
  if (t.tier === 99) return '#f2a03b';
  if (t.grade) return GRADE_COLOR[t.grade];
  if (t.cat === 'jewelry') return t.tier >= 3 ? '#b56cff' : '#4c8dff';
  if (t.cat === 'book' || t.rare) return '#5fc46a';
  return '#9a9a9a';
}
function itemKind(t) {
  const G = { iron: 'Common', steel: 'Steel', silver: 'Silver', mithril: 'Mithril', royal: 'Legendary' };
  if (t.cls && WEAPON_CLASSES[t.cls]) return `${G[t.grade] || ''} · ${WEAPON_CLASSES[t.cls].name}${t.twoHand ? ', two-handed' : ''}`;
  if (t.slot && t.cat === 'armor') return `${G[t.grade] || ''} · ${SLOT_NAMES[t.slot]}`;
  if (t.cat === 'jewelry') return t.tier === 99 ? 'Legendary · Trophy' : `Magic · ${t.slot ? SLOT_NAMES[t.slot] : 'Jewel'}`;
  return CAT_NAMES[t.cat] || cap(t.cat);
}
const INV_FILTERS = [['all', 'All'], ['gear', 'Gear'], ['use', 'Consumables'], ['mats', 'Materials'], ['quest', 'Keepsakes']];
function invFits(t) {
  if (invFilter === 'all') return true;
  if (invFilter === 'gear') return !!t.slot || (t.cat === 'tool' && !t.use);
  if (invFilter === 'use') return ['potion', 'scroll', 'book', 'ammo'].includes(t.cat) || (t.cat === 'tool' && !!t.use);
  if (invFilter === 'quest') return t.cat === 'story';
  return false;
}
function invEntry(key) {
  const p = P(); if (!key) return null;
  if (key.startsWith('eq:')) { const it = p.equip[key.slice(3)]; return it ? { it, eq: key.slice(3) } : null; }
  if (key.startsWith('mat:')) { const id = key.slice(4); return p.mats[id] > 0 ? { mat: id } : null; }
  const it = p.inv.find(o => o.uid === key); return it ? { it } : null;
}
function cellHtml(key, imgHtml, color, count, label) {
  return `<button class="cell ${invSel === key ? 'sel' : ''}" style="--c:${color}" data-a="isel" data-v="${esc(key)}" title="${esc(label)}" aria-label="${esc(label)}">${imgHtml}${count ? `<span class="cnt">${count}</span>` : ''}</button>`;
}
function compareLines(t, it) {
  const p = P(); const cur = t.slot && p.equip[t.slot] && p.equip[t.slot] !== it ? p.equip[t.slot] : null;
  const e = it.ench || 0; const lines = [];
  const delta = (a, b) => { const d = a - b; return d === 0 ? '' : ` <span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(+d.toFixed(1))}</span>`; };
  if (t.dmg) {
    const ct = cur && T(cur).dmg ? T(cur) : null; const ce = cur ? cur.ench || 0 : 0;
    const avg = (t.dmg[0] + t.dmg[1]) / 2 + e, cavg = ct ? (ct.dmg[0] + ct.dmg[1]) / 2 + ce : null;
    lines.push([`${DTYPE[t.dtype]} damage`, `<b>${t.dmg[0] + e}–${t.dmg[1] + e}</b>${cavg != null ? delta(avg, cavg) : ''}`]);
    lines.push(['To hit', `<b>${fmtSign((t.atk || 0) + e)}</b>${ct ? delta((t.atk || 0) + e, (ct.atk || 0) + ce) : ''}`]);
  }
  if (t.def != null && t.slot && t.slot !== 'weapon') {
    const val = t.def + (t.cat === 'jewelry' ? 0 : e); const cv = cur ? (T(cur).def || 0) + (T(cur).cat === 'jewelry' ? 0 : cur.ench || 0) : null;
    lines.push(['Defense', `<b>${fmtSign(val)}</b>${cv != null ? delta(val, cv) : ''}`]);
  }
  if (t.slot === 'armor' || t.slot === 'shield') if (t.atk) lines.push(['To hit', `<b class="down">${t.atk}</b>`]);
  if (t.mp) lines.push(['Mana', `<b>+${t.mp}</b>`]);
  if (t.spell) lines.push(['Spell power', `<b>+${Math.round(t.spell * 100)}%</b>`]);
  if (t.spellfail) lines.push(['Spell failure', `<b class="down">${Math.round(t.spellfail * 100)}%</b>`]);
  if (t.dodge) lines.push(['Dodge chance', `<b>${Math.round(t.dodge * 100)}%</b>`]);
  if (t.grade === 'silver' && t.slot === 'weapon') lines.push(['Against undead', '<b>×1.5</b>']);
  for (const [k, l] of [['str', 'Strength'], ['int', 'Intelligence'], ['hp', 'Max health']]) if (t[k]) lines.push([l, `<b class="up">+${t[k]}</b>`]);
  if (t.cat === 'jewelry' && t.atk) lines.push(['To hit', `<b class="up">+${t.atk}</b>`]);
  if (t.light) lines.push(['Light radius', `<b>${t.light} tiles</b>`]);
  if (it.fuel != null && t.fuel) lines.push(['Fuel', `<b>${it.fuel} / ${t.fuel}</b>`]);
  return { lines, cur };
}
function detailCard(sel) {
  if (!sel) return '<div class="card"><p class="card-note">Select something to see what it does.</p></div>';
  if (sel.mat) {
    const M = MATS[sel.mat], n = P().mats[sel.mat];
    return `<div class="card" style="--c:#9a9a9a"><div class="card-head"><div class="card-icon">${spriteImg(matCanvas(sel.mat), 46)}</div><div><div class="card-name">${M.name}</div><div class="card-kind">${CAT_NAMES[M.cat]} · material</div></div></div>
      <div class="card-stats"><div><span>Carrying</span><span><b>${n}</b></span></div><div><span>Weight</span><span><b>${+(M.wt * n).toFixed(1)} lb</b></span></div></div>
      <p class="card-note">Used for building and crafting. Shops that deal in ${CAT_NAMES[M.cat].toLowerCase()} will buy it.</p>
      <div class="card-btns"><button class="btn" data-a="dropmat" data-v="${sel.mat}">Drop all</button></div></div>`;
  }
  const it = sel.it, t = T(it); const { lines, cur } = compareLines(t, it);
  const btns = [];
  if (sel.eq) btns.push(`<button class="btn" data-a="unequip" data-v="${sel.eq}">Take off</button>`);
  else {
    if (t.slot) btns.push(`<button class="btn default" data-a="equip" data-v="${it.uid}">${t.slot === 'light' ? 'Light it' : 'Equip'}</button>`);
    if (t.use) btns.push(`<button class="btn ${t.slot ? '' : 'default'}" data-a="use" data-v="${it.uid}">${t.use === 'learn' || t.use === 'journal' || t.cat === 'scroll' ? 'Read' : t.cat === 'potion' ? 'Drink' : 'Use'}</button>`);
    if (t.cat !== 'story') btns.push(`<button class="btn ghost" data-a="drop" data-v="${it.uid}">Drop</button>`);
  }
  const worth = Math.max(1, Math.floor(itemValue(it) * 0.5));
  return `<div class="card" style="--c:${itemColor(t)}"><div class="card-head"><div class="card-icon">${spriteImg(itemCanvas(it.id), 46)}</div><div><div class="card-name">${esc(itemName(it))}</div><div class="card-kind">${esc(itemKind(t))}${sel.eq ? ' · equipped' : ''}</div></div></div>
    ${lines.length ? `<div class="card-stats">${lines.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('')}</div>` : ''}
    ${cur ? `<p class="card-note">Compared with your ${esc(itemName(cur))}.</p>` : ''}
    <p class="card-note">${esc(itemDesc(it).split(' · ').filter(x => !/lb$/.test(x) && !/^(Slashing|Piercing|Crushing) /.test(x) && !/to hit$/.test(x) && !/^Defense/.test(x)).join('. ') || '')}</p>
    <div class="card-foot"><span>${+(t.wt * (it.q || 1)).toFixed(1)} lb</span><span>${t.cat === 'story' ? 'Not for sale' : `Worth about ${worth} gold`}</span></div>
    ${btns.length ? `<div class="card-btns">${btns.join('')}</div>` : ''}</div>`;
}
function htmlInventory() {
  const p = P();
  if (!invEntry(invSel)) invSel = p.inv[0] ? p.inv[0].uid : SLOTS.map(s => p.equip[s] ? 'eq:' + s : null).find(Boolean) || null;
  const eqCell = sl => { const it = p.equip[sl]; return it ? cellHtml('eq:' + sl, icon(it), itemColor(T(it)), '', `${SLOT_NAMES[sl]}: ${itemName(it)}`) : `<div class="cell empty" title="${SLOT_NAMES[sl]}: empty"><span class="ph">${SLOT_NAMES[sl]}</span></div>`; };
  const left = ['helm', 'armor', 'boots', 'light'].map(eqCell).join(''), right = ['weapon', 'shield', 'ring', 'amulet'].map(eqCell).join('');
  const [a, b] = dmgRange(weaponT() && RANGED_CLS.has(weaponT().cls));
  const cells = p.inv.filter(it => invFits(T(it))).map(it => cellHtml(it.uid, icon(it), itemColor(T(it)), it.q > 1 ? it.q : '', itemName(it)));
  if (invFilter === 'all' || invFilter === 'mats') for (const id in p.mats) if (p.mats[id] > 0) cells.push(cellHtml('mat:' + id, spriteImg(matCanvas(id), 32), '#7d7468', p.mats[id], `${MATS[id].name} ×${p.mats[id]}`));
  const total = Math.max(32, Math.ceil(cells.length / 8) * 8);
  while (cells.length < total) cells.push('<div class="cell empty" aria-hidden="true"></div>');
  return `<div class="inv2">
    <section class="equip">
      <div class="equip-row"><div class="eqcol">${left}</div><div class="stage">${spriteImg(heroSprite(p.equip), 150)}</div><div class="eqcol">${right}</div></div>
      <div class="facts"><div><span>Health</span><b>${p.hp} / ${maxHp()}</b></div><div><span>Defense</span><b>${defense()}</b></div><div><span>Damage</span><b>${a}–${b}</b></div><div><span>To hit</span><b>${fmtSign(toHit(weaponT() && RANGED_CLS.has(weaponT().cls)))}</b></div></div>
    </section>
    <section>
      <div class="filters" role="tablist">${INV_FILTERS.map(([k, l]) => `<button class="${invFilter === k ? 'on' : ''}" role="tab" aria-selected="${invFilter === k}" data-a="ifilter" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="grid8">${cells.join('')}</div>
      <div class="carry"><div><span>Carrying</span><span>${carried()} / ${capacity()} lb</span></div>${bar(carried(), capacity(), burden() ? 'hp' : 'load')}<div><span><b style="color:var(--gold)">${p.gold}</b> gold</span></div></div>
    </section>
    <section class="detail">${detailCard(invEntry(invSel))}
      <div class="legend"><span style="--c:#9a9a9a">Common</span><span style="--c:#5fc46a">Steel</span><span style="--c:#4c8dff">Silver</span><span style="--c:#b56cff">Mithril</span><span style="--c:#f2a03b">Legendary</span></div>
    </section></div>`;
}

// ---- character, skills, magic, gods ----
function htmlCharacter() {
  const p = P(); const [a, b] = dmgRange(weaponT() && RANGED_CLS.has(weaponT().cls));
  const ATTR = { str: ['Strength', 'melee damage, carrying'], dex: ['Dexterity', 'to hit, defense, bows'], int: ['Intelligence', 'mana, spell power'], con: ['Constitution', 'health, regeneration'] };
  const attr = Object.keys(ATTR).map(k => `<div class="attr"><span>${ATTR[k][0]}</span><b>${stat(k)}</b><small>${ATTR[k][1]}</small>${p.attrPts ? `<button class="btn tiny" data-a="attr" data-v="${k}" aria-label="Raise ${ATTR[k][0]}">+1</button>` : ''}</div>`).join('');
  const fact = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  return `<div class="char-head">${spriteImg(heroSprite(p.equip), 80, 'head')}<div><h3>${esc(p.name)}</h3><p class="dim">Level ${p.level} acolyte of Aurel · ${p.kills} foes slain · seals ${KINGDOM_ORDER.filter(k => S.seals[k]).length} of 4 · day ${S.day}</p>
      <label>Experience</label>${bar(p.xp, xpToNext(p.level), 'xp')}</div></div>
    <div class="btnrow"><button class="btn tiny" data-a="appearance">Change Appearance…</button><span class="dim">Difficulty: ${DIFF().name}</span></div>
    <h3>Attributes ${p.attrPts ? `<span class="pill">${p.attrPts} to spend</span>` : '<span class="dim">You earn one point per level.</span>'}</h3><div class="attrs">${attr}</div>
    <h3>In combat</h3><div class="facts">${fact('Health', `${p.hp} / ${maxHp()}`)}${fact('Mana', `${p.mp} / ${maxMp()}`)}${fact('To hit', fmtSign(toHit(weaponT() && RANGED_CLS.has(weaponT().cls))))}${fact('Damage', `${a}–${b}`)}${fact('Defense', defense())}${fact('Critical on', critOn() + '+')}${fact('Spell power', '×' + spellPower().toFixed(2))}${fact('Carrying', `${carried()} / ${capacity()} lb`)}</div>`;
}
let skillTree = 'arms';
const pointsIn = tr => tr.nodes.reduce((a, n) => a + rank(n.id), 0);
// why a node can't be learned right now (empty string = it can)
function skillBlock(n) {
  const p = P(), tr = TREES.find(t => t.id === n.tree);
  if (FREE_PERKS.has(n.id)) return 'Known';
  if (rank(n.id) >= n.max) return 'Mastered';
  const gate = perkGateText(n); if (gate) return gate;
  const missing = (n.req || []).filter(r => !has(r));
  if (missing.length) return `Needs ${missing.map(r => SKILL_NODES[r].name).join(', ')}`;
  if (n.excl && tr.nodes.some(o => o !== n && o.excl === n.excl && has(o.id))) return 'You chose the other path';
  if (p.skillPts <= 0) return 'No points to spend';
  return '';
}
function htmlSkills() {
  const p = P();
  const tr = TREES.find(t => t.id === skillTree) || TREES[0];
  const tabs = TREES.map(t => `<button class="sk-tab ${t === tr ? 'on' : ''}" data-a="sktree" data-v="${t.id}"><b>${t.name}</b><small>${pointsIn(t)} pts</small></button>`).join('');
  const node = n => {
    const r = rank(n.id), why = skillBlock(n);
    const state = r >= n.max || FREE_PERKS.has(n.id) ? 'owned' : r > 0 ? 'partial' : why && !/^No points/.test(why) ? 'locked' : 'open';
    const pips = n.max > 1 ? `<span class="pips" aria-label="Rank ${r} of ${n.max}">${'<i class="on"></i>'.repeat(r)}${'<i></i>'.repeat(n.max - r)}</span>` : (r ? '<span class="tick" aria-label="Learned">✔</span>' : '');
    return `<div class="sk-node ${state}"><div class="sk-top"><b>${n.name}</b>${pips}</div><small>${n.desc}</small>
      ${why ? (r >= n.max || why === 'Known' ? '' : `<em>${why}</em>`) : `<button class="btn tiny ${r ? '' : 'default'}" data-a="learn" data-v="${n.id}">${r ? `Rank up (${r + 1}/${n.max})` : 'Learn'}</button>`}</div>`;
  };
  const tiers = [1, 2, 3, 4].map(tier => {
    const nodes = tr.nodes.filter(n => n.tier === tier); if (!nodes.length) return '';
    const choice = nodes.some(n => n.excl);
    return `<div class="sk-tier"><div class="sk-label"><b>Tier ${tier}</b><small>${choice ? 'choose one' : ''}</small></div><div class="sk-row">${nodes.map(node).join('')}</div></div>`;
  }).join('');
  const total = TREES.reduce((a, t) => a + pointsIn(t), 0);
  return `<p class="dim">Skills rise by use: every blow, spell, prayer, bargain and thing you make. Each rise counts toward your level; each level brings an attribute point and a perk point.</p>
    ${htmlSkillLevels()}
    <h3>Perks</h3>
    <div class="sk-head">${p.skillPts ? `<span class="pill">${p.skillPts} perk point${p.skillPts > 1 ? 's' : ''} to spend</span>` : '<span class="pill off">No perk points to spend</span>'}
      <span class="dim">Each perk opens when the skill that governs it is high enough. ${total} taken so far. The temple can reset your perks.</span></div>
    <div class="sk-tabs">${tabs}</div>
    <div class="sk-view"><p class="dim">${tr.blurb}</p>${tiers}</div>`;
}
const SCHOOL_NAMES = { evocation: 'Evocation', restoration: 'Restoration', illusion: 'Illusion', abjuration: 'Abjuration', divination: 'Divination' };
function htmlMagic() {
  const p = P(); const fail = equipBonus('spellfail');
  const fav = p.favSpells || p.spells.slice(0, 4);
  const spellRow = id => { const sp = SPELLS[id], pinned = fav.includes(id);
    return `<div class="row"><span class="gl">${spriteImg(spellIcon(id), 32)}</span><div class="nm"><b>${sp.name}</b><small>${sp.desc} Costs ${spellCost(id)} MP.</small></div><div class="acts"><button class="btn tiny ${pinned ? '' : 'ghost'}" data-a="pin" data-v="${id}" aria-pressed="${pinned}" title="${pinned ? 'On your hotbar' : 'Add to your hotbar'}">${pinned ? '★ Hotbar' : '☆ Hotbar'}</button><button class="btn tiny" data-a="cast" data-v="${id}" ${p.mp < spellCost(id) ? 'disabled' : ''}>Cast</button></div></div>`; };
  const bySchool = Object.keys(SCHOOL_NAMES).map(sc => { const ids = p.spells.filter(id => SPELLS[id].school === sc); return ids.length ? `<div class="row empty" style="opacity:1"><b style="color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase">${SCHOOL_NAMES[sc]}</b></div>${ids.map(spellRow).join('')}` : ''; }).join('');
  const known = p.spells.length, total = Object.keys(SPELLS).length;
  const prayers = GOD_ORDER.filter(g => p.gods[g]).map(g => { const G = GODS[g]; const used = prayedOut(g);
    return `<div class="row"><span class="gl">${spriteImg(propCanvas('shrine_' + g), 32)}</span><div class="nm"><b>${G.power.name}</b><small>${G.name}, ${G.title}. ${G.power.desc}</small></div><div class="acts"><button class="btn tiny" data-a="invoke" data-v="${g}" ${used ? 'disabled' : ''}>${used ? 'Used today' : 'Invoke'}</button></div></div>`; }).join('');
  return `<h3>Spells <span class="dim">${known} of ${total} known · ${p.mp} / ${maxMp()} MP · power ×${spellPower().toFixed(2)}${fail ? ` · ${Math.round(fail * 100)}% chance to fizzle in this armor` : ''}</span></h3>
    <div class="list">${bySchool || '<p class="dim" style="padding:10px 12px">You know no spells yet. The Arcanum sells spellbooks, and rarer ones turn up in the caves.</p>'}</div>
    <p class="hint">Starred spells go on your hotbar (keys 1–0). Spellbooks come in five schools; the strongest are found, not bought.</p>
    <h3>Prayers <span class="dim">each ${has('secondprayer') ? 'twice' : 'once'} a day; sleep to greet a new day</span></h3><div class="list">${prayers}</div>`;
}
function htmlGods() {
  const p = P();
  return `<p class="lead">The gods are bound to places. Find a god's shrine and pass its trial to earn its gift.</p><div class="gods">` + GOD_ORDER.map(g => { const G = GODS[g]; const blessed = p.gods[g];
    return `<div class="god ${blessed ? 'blessed' : ''}">${spriteImg(propCanvas('shrine_' + g), 48)}<div><b>${G.name}, ${G.title}</b><small>${G.domain}</small><small><i>Shrine:</i> ${G.where}</small><small><i>Gift:</i> <b>${G.power.name}</b>. ${G.power.desc}</small></div><span class="pill ${blessed ? '' : 'off'}">${blessed ? 'Blessed' : 'Not yet'}</span></div>`; }).join('') + '</div>';
}
function htmlSave() {
  return `<p class="lead">You're playing in <b>slot ${saveSlot}</b>. The game saves itself there when you return to town, sleep, or build.</p>
    <div class="btnrow"><button class="btn default" data-a="save">Save now</button><button class="btn" data-a="quittitle">Save and return to the title</button></div>
    <h3>Save to another slot</h3><p class="dim">Keeps a copy of this moment. You'll carry on playing in the slot you choose.</p>
    <div class="btnrow">${[1, 2, 3].map(n => `<button class="btn ${n === saveSlot ? 'default' : ''}" data-a="saveto" data-v="${n}">Slot ${n}${n === saveSlot ? ' (current)' : ''}</button>`).join('')}</div>`;
}

// ---- shops ----
function priceTag(price, base) {
  const r = price / base;
  const cls = r > 1.12 ? 'up' : r < 0.9 ? 'down' : '';
  return `<span class="price ${cls}">${price}g${cls === 'up' ? ' ▲' : cls === 'down' ? ' ▼' : ''}</span>`;
}
let shopTab = 'buy';
function openShop(id) {
  const sh = SHOPS[id]; shopTab = 'buy';
  const draw = () => {
    const p = P(); const st = S.shops[id];
    const tabs = ['buy', 'sell'].concat(sh.service ? ['enchant'] : []);
    let body = '';
    if (shopTab === 'buy') {
      const rows = [];
      for (const key in st.stock) {
        const s = st.stock[key]; const isMat = key.startsWith('mat:');
        const price = buyPrice(id, key);
        const qty = `<span class="qty">${s.qty ? s.qty + (bundleOf(key) > 1 ? ' bundles' : ' in stock') : 'sold out'}</span>`;
        const btn = `<button class="btn tiny" data-a="buy" data-v="${id}|${key}" ${!s.qty || p.gold < price ? 'disabled' : ''}>Buy</button>` + (isMat ? `<button class="btn tiny" data-a="buy5" data-v="${id}|${key}" ${s.qty < 5 || p.gold < price * 5 ? 'disabled' : ''}>×5</button>` : '');
        const extra = priceTag(price, baseOf(key) * bundleOf(key) * 1.15) + qty;
        rows.push(isMat ? matRow(key.slice(4), null, btn, extra) : itemRow(makeItem(key, 0, bundleOf(key)), btn, extra));
      }
      for (const it of st.special) {
        const price = buyPrice(id, it.id, it);
        rows.push(itemRow(it, `<button class="btn tiny" data-a="buyspecial" data-v="${it.uid}" ${p.gold < price ? 'disabled' : ''}>Buy</button>`, priceTag(price, itemValue(it) * 1.15) + '<span class="qty">1 of a kind</span>'));
      }
      body = rows.join('');
    } else if (shopTab === 'sell') {
      const rows = [];
      for (const it of p.inv) {
        const price = sellPrice(id, it.id, it); if (!price) continue;
        rows.push(itemRow(it, `<button class="btn tiny" data-a="sell" data-v="${id}|${it.uid}">Sell</button>` + (it.q > 1 ? `<button class="btn tiny" data-a="sellall" data-v="${id}|${it.uid}">All</button>` : ''), `<span class="price">${price}g${it.q > 1 ? ' ea' : ''}</span>`));
      }
      for (const m in p.mats) {
        if (!p.mats[m]) continue; const key = 'mat:' + m; const price = sellPrice(id, key); if (!price) continue;
        rows.push(matRow(m, p.mats[m], `<button class="btn tiny" data-a="sellmat" data-v="${id}|${m}|1">Sell</button><button class="btn tiny" data-a="sellmat" data-v="${id}|${m}|all">All</button>`, `<span class="price">${price}g ea</span>`));
      }
      body = rows.length ? rows.join('') : `<p class="dim">You have nothing ${sh.keeper} wants. ${sh.keeper} buys: ${sh.buys.map(c => CAT_NAMES[c]).join(', ')}${sh.buysMats ? ', ' + sh.buysMats.map(m => MATS[m].name).join(', ') : ''}.</p>`;
    } else body = enchantRows('shop');
    $('#modal-body').innerHTML = `
      ${keeperArt(npcCanvas(sh.npc), `<p><b>${sh.keeper}:</b> “${esc(sh.greet)}”</p><div class="purse">${spriteImg(propCanvas('coins'), 24)} ${p.gold}</div>`)}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === shopTab ? 'on' : ''}" data-a="tab" data-v="${t}">${{ buy: 'Buy', sell: 'Sell', enchant: 'Enchant' }[t]}</button>`).join('')}</div>
      ${shopTab === 'buy' && S.home.owned && Object.keys(st.stock).some(k => k.startsWith('mat:')) ? `<label class="deliver"><input type="checkbox" id="opt-deliver" data-a="deliver" ${S.opts.deliver ? 'checked' : ''}> Deliver materials to my homestead</label>` : ''}
      <div class="list">${body}</div>
      <p class="hint">▲ above normal price, ▼ below. Prices climb when stock runs low and during market events. Sell lots of one thing and the offer drops; it recovers over a few days.</p>`;
  };
  openModal(sh.name, '', { refresh: draw, wide: true }); draw();
}
function doBuy(shopId, key, n = 1) {
  const p = P(); const s = S.shops[shopId].stock[key]; let bought = 0;
  for (let i = 0; i < n; i++) {
    const price = buyPrice(shopId, key);
    if (!s.qty || p.gold < price) break;
    if (key.startsWith('mat:')) { if (S.opts.deliver && S.home.owned) S.home.mats[key.slice(4)] = (S.home.mats[key.slice(4)] || 0) + 1; else addMat(key.slice(4), 1); }
    else if (!addItem(makeItem(key, 0, bundleOf(key)))) break;
    p.gold -= price; s.qty--; bought++; useSkill('speech', price / 12);
    if (n === 1) msg(`You buy ${key.startsWith('mat:') ? MATS[key.slice(4)].name : (bundleOf(key) > 1 ? bundleOf(key) + ' ' : '') + ITEMS[key].name} for ${price} gold.`, 'gold');
  }
  if (n > 1 && bought) msg(`You buy ${bought} ${MATS[key.slice(4)].name}${S.opts.deliver && S.home.owned ? ', delivered to your homestead' : ''}.`, 'gold');
  refresh();
}
function doSell(shopId, it, all) {
  const p = P(); let total = 0, count = 0;
  const n = all ? it.q : 1;
  for (let i = 0; i < n; i++) {
    total += sellPrice(shopId, it.id, it); count++;
    removeOne(it);
    const sh = S.shops[shopId]; sh.sold[it.id] = (sh.sold[it.id] || 0) + 1;
    if (sh.stock[it.id] && bundleOf(it.id) === 1) sh.stock[it.id].qty++;
  }
  p.gold += total; useSkill('speech', total / 12);
  msg(`You sell ${count > 1 ? count + '× ' + T(it).name : itemName({ ...it, q: 1 })} for ${total} gold.`, 'gold');
  refresh();
}
function doSellMat(shopId, mat, n) {
  const p = P(); const key = 'mat:' + mat; let total = 0, count = 0;
  const want = n === 'all' ? p.mats[mat] : 1;
  for (let i = 0; i < want; i++) {
    total += sellPrice(shopId, key); count++;
    p.mats[mat]--; const sh = S.shops[shopId]; sh.sold[key] = (sh.sold[key] || 0) + 1;
    if (sh.stock[key]) sh.stock[key].qty++;
  }
  p.gold += total; msg(`You sell ${count} ${MATS[mat].name} for ${total} gold.`, 'gold');
  refresh();
}

// ---- enchanting (shop service and home altar) ----
const ENCH_ODDS = [0.95, 0.85, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1];
function enchantables() { const p = P(); return [...SLOTS.map(s => p.equip[s]).filter(Boolean), ...p.inv.filter(it => T(it).slot)].filter(it => T(it).cat !== 'jewelry'); }
const shopEnchCost = it => Math.round((Math.min(T(it).val, 800) * 0.5 + 40) * ((it.ench || 0) + 1) * eventMod('crystal'));
function enchantRows(mode) {
  const p = P(); const list = enchantables();
  const capLvl = mode === 'shop' ? 5 : has('ench3') ? 6 : has('ench2') ? 4 : 2;
  const bonus = mode === 'altar' ? (has('ench3') ? 0.1 : 0) + rank('steady') * 0.05 + (lv2('altar') ? 0.05 : 0) : 0;
  if (!list.length) return '<p class="dim">You have no weapons or armor to enchant.</p>';
  return `<p class="dim">${mode === 'shop' ? 'Mirela charges gold. Odds fall as the rune count climbs. A failed attempt above +2 can crack a rune (−1).' : `Your altar can take gear up to +${capLvl}. Each attempt uses mana shards (you have ${matAvail('shard')}).`}</p>` + list.map(it => {
    const e = it.ench || 0; const odds = Math.min(0.98, ENCH_ODDS[Math.max(0, e)] + bonus);
    const cost = mode === 'shop' ? shopEnchCost(it) : e + 1;
    const can = e < capLvl && (mode === 'shop' ? p.gold >= cost : matAvail('shard') >= cost);
    return itemRow(it, `<button class="btn tiny" data-a="enchant" data-v="${mode}|${it.uid}" ${can ? '' : 'disabled'}>${e >= capLvl ? 'Max' : 'Enchant'}</button>`, `<span class="price">${mode === 'shop' ? cost + 'g' : cost + ' shard' + (cost > 1 ? 's' : '')}</span><span class="qty">${Math.round(odds * 100)}%</span>`);
  }).join('');
}
function doEnchant(mode, uidv) {
  const p = P(); const it = enchantables().find(o => o.uid === uidv); if (!it) return;
  const e = it.ench || 0; const bonus = mode === 'altar' ? (has('ench3') ? 0.1 : 0) + rank('steady') * 0.05 + (lv2('altar') ? 0.05 : 0) : 0;
  const odds = Math.min(0.98, ENCH_ODDS[Math.max(0, e)] + bonus);
  if (mode === 'shop') p.gold -= shopEnchCost(it);
  else if (has('thrift') && chance(1 / 3)) msg('Your thrift pays off: the shards are not consumed.', 'good');
  else useMat('shard', e + 1);
  if (chance(odds)) { it.ench = e + 1; msg(`Runes flare along the ${T(it).name}. It is now ${itemName(it)}!`, 'level'); }
  else if (e >= 2 && chance(0.5)) { it.ench = e - 1; msg(`The runes crack! The ${T(it).name} drops to ${itemName(it)}.`, 'bad'); }
  else msg('The runes flicker and fade. Nothing happens.', 'warn');
  refresh();
}

// ---- inn, land, board ----
function openInn() {
  const p = P(); const cost = 10;
  openModal('The Sleeping Fox Inn', `
    ${keeperArt(npcCanvas('rolf'), `<p><b>Innkeeper Rolf:</b> “A warm bed and a hot meal for ${cost} gold. You'll wake up good as new, fevers and all.”</p>`)}
    <div class="btnrow"><button class="btn" data-a="rest" data-v="inn" ${p.gold < cost ? 'disabled' : ''}>Rest until morning (${cost}g)</button><button class="btn" data-a="p" data-v="talk|rolf">Talk with Rolf</button></div>
    ${S.home.built.house ? '<p class="dim">You could also sleep for free at your cottage.</p>' : ''}`);
}
// ================= the gods =================
const BUFF_NAMES = { hunt: "Hunter's Grace", stone: 'Stoneskin', forge: 'Forgefire', waters: 'Still Waters', serpent: "Serpent's Kiss", rested: 'Well Rested', ashield: 'Arcane Shield', regenb: 'Regeneration', haste: 'Haste', invis: 'Invisible', detect: 'Detect Monsters' };
const godArt = g => spriteImg(propCanvas('shrine_' + g), 56);
const respecCost = () => 40 * P().level;
function respec() {
  const p = P(); if (p.gold < respecCost()) return;
  const spent = Object.values(p.skills).reduce((a, b) => a + b, 0) - 1;
  p.gold -= respecCost(); p.skills = { wt: 1 }; p.skillPts += Math.max(0, spent);
  p.hp = Math.min(p.hp, maxHp()); p.mp = Math.min(p.mp, maxMp());
  msg(`You kneel before Aurel and let your training settle. ${Math.max(0, spent)} skill points are yours to spend again.`, 'level');
  closeModal(); openHero('skills');
}
function openTemple() {
  const p = P();
  openModal('The Temple of the Dawn', `${keeperArt(propCanvas('shrine_aurel'), `<p>A modest stone temple. Morning light falls through the east window onto Aurel's altar. Father Halvard's prayer book still lies open where he left it. The candles have burned down to stubs.</p>`)}
    <p>Halvard taught you that the gods are bound to places: Aurel to the hearth and the dawn, others to the deep woods, the mountain, the still lakes under the earth. Each shrine tests those who come to it, and each grants a gift to those who pass.</p>
    <p>He also taught you, more quietly, about the old line in the Book of Dawn: <i>"and the fire would not take the child."</i> He never said why it mattered so much to him.</p>
    <div class="btnrow"><button class="btn" data-a="pantheon">The gods and their shrines</button><button class="btn" data-a="prayers">Pray</button><button class="btn default" data-a="p" data-v="altar|temple">Pray for the townsfolk</button></div>
    <p class="dim">You bear Aurel's blessing. ${prayedOut('aurel') ? "You have already called on Dawn's Light today." : "Dawn's Light is ready."}</p>
    <h3>Seek clarity</h3><p>Kneel at the altar and let go of what you have learned, to learn it anew. All your skill points return to you to spend again.</p>
    <div class="btnrow"><button class="btn" data-a="respec" ${p.gold < respecCost() ? 'disabled' : ''}>Reset my skills (${respecCost()} gold offering)</button></div>`);
}
function openShrine(g) {
  const p = P(), G = GODS[g];
  if (p.gods[g]) { openModal(`Shrine of ${G.name}`, `${keeperArt(propCanvas('shrine_' + g), `<p><b>${G.name}, ${G.title}.</b> ${G.domain}</p>`)}<p>You bear ${G.name}'s blessing: <b>${G.power.name}</b>. ${G.power.desc}</p><div class="btnrow"><button class="btn" data-a="prayers">Pray</button></div>`); return; }
  const T_ = G.trial; let ok = true, need = '';
  if (T_.type === 'offer') { const mats = trialMats(T_); const lack = Object.entries(mats).filter(([m, n]) => matAvail(m) < n); ok = !lack.length; need = Object.entries(mats).map(([m, n]) => `<span class="${matAvail(m) >= n ? 'ok' : 'no'}">${spriteImg(matCanvas(m), 20)} ${n} ${MATS[m].name} (have ${matAvail(m)})</span>`).join(' '); }
  if (T_.type === 'fire') { ok = p.hp > fireCost(); if (!ok) need = '<span class="no">You are too badly hurt to bear it.</span>'; }
  openModal(`Shrine of ${G.name}`, `${keeperArt(propCanvas('shrine_' + g), `<p><b>${G.name}, ${G.title}.</b> ${G.domain}</p>`)}
    <p>The gift of this shrine is <b>${G.power.name}</b>: ${G.power.desc}</p>
    <h3>The trial</h3><p>${T_.text}</p>${need ? `<div class="mats">${need}</div>` : ''}
    <div class="btnrow"><button class="btn" data-a="trial" data-v="${g}" ${ok ? '' : 'disabled'}>Undertake the trial</button></div>`);
}
const trialMats = T_ => Object.fromEntries(Object.entries(T_.mats).map(([m, n]) => [m, has('pilgrim') ? Math.max(1, n - 1) : n]));
const fireCost = () => Math.ceil(maxHp() / (has('pilgrim') ? 4 : 3));
function grantGod(g) {
  const p = P(), G = GODS[g];
  p.gods[g] = true; p.skillPts++;
  msg(`${G.name}, ${G.title}, accepts you. You have gained ${G.power.name} (pray with V) and a skill point.`, 'level');
  gainXp(40);
  closeModal(); render(); autosave();
}
function doTrial(g) {
  const p = P(), G = GODS[g], T_ = G.trial;
  if (T_.type === 'offer') { for (const [m, n] of Object.entries(trialMats(T_))) useMat(m, n); msg(`You lay your offering before ${G.name}'s shrine. It is taken.`, 'good'); return grantGod(g); }
  if (T_.type === 'fire') { const d = fireCost(); p.hp -= d; msg(`You plunge your hand into the flame (${d}). The pain is enormous, and then it is not.`, 'bad'); return grantGod(g); }
  if (T_.type === 'venom') { p.st.poison = 30; p.st.sick = 40; msg('You drink. The venom burns like ice and fire, and the idol\'s eyes seem to follow you.', 'bad'); return grantGod(g); }
  if (T_.type === 'vigil') {
    closeModal(); const m = curMap(); const start = S.turn;
    msg('You kneel by the water and begin your vigil.', 'talk');
    while (S.turn - start < (has('pilgrim') ? 70 : T_.turns)) {
      endTurn(); if (dead) return;
      const seen = m.mons.find(o => monVisible(o));
      if (seen) { msg(`${The(seen)} comes into view. Your vigil is broken.`, 'warn'); return; }
    }
    return grantGod(g);
  }
}
// a gift is used up for the day once called on (twice, with Second Prayer)
function prayedOut(g) { const p = P(); return p.prayed[g] === S.day && (!has('secondprayer') || (p.prayed2 || {})[g] === S.day); }
const buffLen = n => Math.round(n * (1 + rank('devotion') * 0.25));
function invoke(g) {
  const p = P(); if (prayedOut(g)) return;
  if (p.prayed[g] === S.day) { p.prayed2 = p.prayed2 || {}; p.prayed2[g] = S.day; } else p.prayed[g] = S.day;
  closeModal(); useSkill('faith', 6); playAnim(p, 'pray');
  p.buffs = p.buffs || {};
  if (g === 'aurel') {
    const h = Math.round((10 + p.level * 3) * (1 + rank('devotion') * 0.25)); p.hp = Math.min(maxHp(), p.hp + h); p.st.poison = 0; p.st.sick = 0; addFloat(p.x, p.y, '+' + h, '#ffd27a', true);
    msg(`You call on Aurel. Golden light pours out of you (+${h}).`, 'good');
    for (const o of [...curMap().mons]) if (MONSTERS[o.id].undead && monVisible(o)) { const d = (roll(2, 8) + p.level) * (has('sunward') ? 2 : 1); o.hp -= d; msg(`The light sears ${the(o)} (${d}).`, 'hit'); if (o.hp <= 0) killMonster(o); }
    const m = curMap(); if (!m.lit && !m.outdoor && !m.lights.some(l => l[0] === p.x && l[1] === p.y)) { m.lights.push([p.x, p.y, has('sunward') ? 7 : 5, 'torch']); setLit(m, null); }
  }
  if (g === 'veyra') { p.buffs.hunt = buffLen(60); msg("Veyra's grace settles over you. Your eye sharpens, and the beasts grow calm.", 'good'); }
  if (g === 'korrum') { p.buffs.stone = buffLen(40); msg('Your skin turns grey and hard as granite.', 'good'); }
  if (g === 'gharrok') { p.buffs.forge = buffLen(40); msg('Flame runs along your weapon.', 'good'); }
  if (g === 'nemora') { p.buffs.waters = buffLen(100); p.st.blind = 0; p.st.confused = 0; const m = curMap(); if (m.seen) revealAll(m); msg('Your mind goes still as deep water. You see what is hidden.', 'good'); }
  if (g === 'ssathal') { p.buffs.serpent = buffLen(60); p.st.poison = 0; msg('Venom beads on your skin and your blade. You feel no fear of poison.', 'good'); }
  endTurn();
}
function openTownHall() {
  openModal('Town Hall', `${keeperArt(npcCanvas('mortimer'), "<p>The council chamber smells of ink and old wood. Clerk Mortimer looks up from a stack of deeds. A board by the door is covered in market notices.</p>")}
    <div class="btnrow"><button class="btn" data-a="board">Read the Market Board</button><button class="btn" data-a="land">Land Registry</button><button class="btn" data-a="p" data-v="talk|mortimer">Talk with Mortimer</button></div>`);
}
function openHalvardHouse() {
  openModal('Your Cot', `${keeperArt(propCanvas('bed'), "<p>Your cot in the back room, under the window where you've slept since you were small. The house is too quiet without Halvard snoring through the wall.</p>")}
    <div class="btnrow"><button class="btn" data-a="rest" data-v="halvard">Sleep until morning</button></div>
    <p class="dim">Sleeping here is free. It restores your health and mana and cures sickness.</p>`);
}
function htmlOptions() {
  if (!S) return '<p class="dim">Start or continue a game to change options.</p>';
  const o = S.opts;
  let zoom = 'auto'; try { zoom = localStorage.getItem('tw-zoom') || 'auto'; } catch (e) { }
  const z = (v, label, desc) => `<label class="opt"><input type="radio" name="zoom" data-a="zoom" data-v="${v}" ${zoom === v ? 'checked' : ''}><span><b>${label}</b><small>${desc}</small></span></label>`;
  const r = (v, label, desc) => `<label class="opt"><input type="radio" name="reveal" data-a="opt" data-v="reveal:${v}" ${o.reveal === v ? 'checked' : ''}><span><b>${label}</b><small>${desc}</small></span></label>`;
  return `<h3>Zoom</h3>
    <p class="dim">Use the + and − buttons on the map, the + and − keys, the mouse wheel or a pinch to zoom.</p>
    ${z('auto', 'Automatic', 'About twenty tiles across, whatever the screen.')}
    ${z('normal', 'Normal', 'See more of the world. Every pixel stays crisp.')}
    ${z('large', 'Large', 'Everything twice the size. Good for tablets and for reading faces.')}
    <h3>Faces</h3>
    ${[['ct', 'Classic JRPG eyes', 'A dark stroke for each eye, the way Chrono Trigger drew its heroes.'], ['none', 'No eyes', 'A heavy brow with the eyes lost in shadow. Hair and silhouette do the talking.'], ['glint', 'Bright eyes', 'Small eyes with a glint of color, brows and a mouth.']].map(([v, l, d]) => `<label class="opt"><input type="radio" name="face" data-a="facestyle" data-v="${v}" ${FACE_STYLE === v ? 'checked' : ''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}
    <h3>Characters</h3>
    <label class="opt"><input type="radio" name="hd" data-a="hdchars" data-v="on" ${HD_ON ? 'checked' : ''}><span><b>Detailed</b><small>Pixel people at twice the resolution, with the portraits' faces.</small></span></label>
    <label class="opt"><input type="radio" name="hd" data-a="hdchars" data-v="off" ${HD_ON ? '' : 'checked'}><span><b>Classic</b><small>Chunky pixel people that match the world's pixel size.</small></span></label>
    <h3>Cave mapping</h3>
    ${r('sight', 'By sight', 'You map only what you actually see. The classic way.')}
    ${r('rooms', 'Whole rooms', 'Stepping into a room maps all of it, even the dark corners.')}
    ${r('open', 'Full map', 'Each level is mapped the moment you arrive. You still need light to see what is in it.')}
    <h3>Combat</h3>
    <label class="opt"><input type="radio" name="cmb" data-a="opt" data-v="combat:action" ${o.combat !== 'bump' ? 'checked' : ''}><span><b>Live action</b><small>Real-time fights: swing (Space, hold for heavy), roll (Z), block (X) and stamina. Foes wind up before they strike.</small></span></label>
    <label class="opt"><input type="radio" name="cmb" data-a="opt" data-v="combat:bump" ${o.combat === 'bump' ? 'checked' : ''}><span><b>Classic</b><small>Turn by turn: walk into a foe to attack it. Nothing moves until you do.</small></span></label>
    <h3>Picking things up</h3>
    <label class="opt"><input type="checkbox" data-a="opt" data-v="autoGold" ${o.autoGold ? 'checked' : ''}><span><b>Pick up gold automatically</b><small>Everything else still needs G.</small></span></label>
    <h3>Testing</h3>
    <p class="dim">For trying things out. Not part of the game.</p>
    <div class="btnrow cheats">
      ${[['gold', '+1,000 gold'], ['heal', 'Full heal'], ['level', '+1 level'], ['mats', '+10 of every material'], ['reveal', 'Map this level'], ['god', S.god ? 'Invulnerable: on' : 'Invulnerable: off'], ['light', S.light ? 'Carry anything: on' : 'Carry anything: off'], ['time', 'Skip 2 hours'], ['skills', '+10 every skill']].map(([v, l]) => `<button class="btn" data-a="cheat" data-v="${v}">${l}</button>`).join('')}
    </div>
    <div class="btnrow cheats">
      ${[['town', 'Brambleford'], ['wilds', 'North Road'], ['d1', 'Cave 1'], ['d3', 'Cave 3'], ['g1', 'Goblins'], ['r1', 'Rat folk'], ['h1', 'Hollowfolk'], ['s1', 'Serpents']].map(([v, l]) => `<button class="btn" data-a="cheatgo" data-v="${v}">${l}</button>`).join('')}
    </div>`;
}
// testing tools, from Options
function cheat(v) {
  const p = P();
  if (v === 'gold') p.gold += 1000;
  else if (v === 'heal') { p.hp = maxHp(); p.mp = maxMp(); p.st = {}; }
  else if (v === 'level') gainXp(xpToNext(p.level) - p.xp);
  else if (v === 'mats') for (const k in MATS) p.mats[k] = (p.mats[k] || 0) + 10;
  else if (v === 'reveal') { const m = curMap(); revealAll(m); m.revealed = 1; computeFov(); }
  else if (v === 'god') S.god = !S.god;
  else if (v === 'light') S.light = !S.light;
  else if (v === 'skills') { const sk = skillsOf(); for (const id in sk) { const was = sk[id]; sk[id] = Math.min(100, sk[id] + 10); gainXp(Math.round((was + sk[id]) / 2 * 6)); } }
  else if (v === 'time') S.turn += Math.round(DAY_TURNS / 17 * 2);
  msg(`(Testing: ${v})`, 'dim');
  refresh();
}
function rest(where) {
  const p = P();
  if (where === 'inn') p.gold -= 10;
  p.hp = maxHp(); p.mp = maxMp(); p.st = {};
  newDay('rest');
  if (where === 'home' && lv2('house')) { p.buffs.rested = 400; msg('You wake Well Rested in your farmhouse.', 'good'); }
  msg(`You sleep soundly${where === 'home' ? ' in your own bed' : where === 'halvard' ? ' in your old cot' : ''}. Day ${S.day} begins.`, 'good');
  closeModal(); autosave();
}
function openLand() {
  const p = P(); const owned = S.home.owned;
  openModal('Land Registry', `
    ${keeperArt(npcCanvas('mortimer'), `<p><b>Clerk Mortimer:</b> ${owned ? '“Your deed is in order. The East Field is yours. Follow the road east out of town.”' : `“The East Field is for sale: woods, a rocky rise, wild herbs and good flat ground for building. ${LAND_PRICE} gold and it's yours.”`}</p>`)}
    ${owned ? '' : `<div class="btnrow"><button class="btn" data-a="buyland" ${p.gold < LAND_PRICE ? 'disabled' : ''}>Buy the East Field (${LAND_PRICE}g)</button></div><p class="dim">You have ${p.gold} gold.</p>`}
    <h3>What you can build there</h3>${Object.entries(STRUCTURES).map(([k, s]) => `<div class="row"><span class="gl">${spriteImg(propCanvas(s.spr))}</span><div class="nm"><b>${s.name}</b><small>${s.desc}</small></div><span class="price">${costText(s)}</span></div>`).join('')}`);
}
function costText(s) { return [s.gold + 'g', ...Object.entries(s.mats).map(([m, n]) => `${n} ${MATS[m].name.toLowerCase()}`)].join(' · '); }
function openBoard() {
  const cats = Object.keys(CAT_NAMES);
  const ev = S.events.map(e => { const d = EVENTS.find(x => x.id === e.id); return `<div class="row"><span class="gl">${spriteImg(propCanvas('board'))}</span><div class="nm"><b>${d.name}</b><small>${d.text} ${e.left} day${e.left > 1 ? 's' : ''} left.</small></div></div>`; }).join('') || '<p class="dim">No news. Prices are at their usual levels.</p>';
  const idx = cats.map(c => { const v = eventMod(c); const cls = v > 1.05 ? 'up' : v < 0.95 ? 'down' : ''; return `<div class="${cls}"><span>${CAT_NAMES[c]}</span><b>${Math.round(v * 100)}</b></div>`; }).join('');
  openModal('Market Board', `<p class="lead">Day ${S.day}. Notices pinned to the board by the Merchants' Guild.</p>
    <h3>News</h3>${ev}
    <h3>Price index <span class="dim">(100 = normal)</span></h3><div class="index">${idx}</div>
    <p class="hint">When an event drives a category up, that's the time to sell it. Buy what's cheap and hold it until the news turns.</p>`);
}

// ---- homestead ----
function openSite(site) {
  const s = STRUCTURES[site]; const p = P();
  if (!S.home.built[site]) {
    const lack = [];
    if (p.gold < s.gold) lack.push(`${s.gold - p.gold} more gold`);
    for (const [m, n] of Object.entries(s.mats)) if (matAvail(m) < n) lack.push(`${n - matAvail(m)} more ${MATS[m].name.toLowerCase()}`);
    openModal(`Build: ${s.name}`, `${keeperArt(propCanvas(s.spr), `<p>${s.desc}</p>`)}
      <h3>Cost</h3><div class="costs"><div class="${p.gold >= s.gold ? 'ok' : 'no'}">${spriteImg(propCanvas('coins'), 24)} ${s.gold} gold <small>(have ${p.gold})</small></div>
      ${Object.entries(s.mats).map(([m, n]) => `<div class="${matAvail(m) >= n ? 'ok' : 'no'}">${spriteImg(matCanvas(m), 24)} ${n} ${MATS[m].name} <small>(have ${matAvail(m)})</small></div>`).join('')}</div>
      <div class="btnrow"><button class="btn" data-a="build" data-v="${site}" ${lack.length ? 'disabled' : ''}>Build</button></div>
      ${lack.length ? `<p class="dim">You need ${lack.join(', ')}. Wendell sells wood and stone; trees and rocks on your land are free with an axe and pickaxe.</p>` : ''}`);
    return;
  }
  if (site === 'house') return openHouse();
  if (site === 'garden') {
    if (S.home.gardenDay > S.day) { msg('The garden is still growing. Come back tomorrow.'); return; }
    const mult = (has('greenthumb') ? 2 : 1) * (lv2('garden') ? 1.5 : 1);
    const hr = Math.ceil(roll(2, 3) * mult) + rank('forager'), rc = Math.ceil(roll(1, 2) * mult); addMat('healroot', hr); addMat('redcap', rc);
    let line = `You harvest ${hr} healroot and ${rc} redcaps`;
    if (chance(0.18 * mult * (lv2('garden') ? 2 : 1))) { addMat('moonpetal', 1); line += ', and a rare moonpetal'; }
    S.home.gardenDay = S.day + 1; msg(line + '.', 'good'); useSkill('survival', 3); render(); return;
  }
  if (site === 'mine') {
    if (!hasTool('pick')) { msg('You need a pickaxe to work the mine.', 'warn'); return; }
    if (S.home.mineDay > S.day) { msg("You've worked the mine today. The seam needs shoring up before you dig again."); return; }
    const q = roll(2, 4) + rank('prospect') * 2 + (lv2('mine') ? 3 : 0); addMat('iron', q);
    let line = `You dig out ${q} iron ore`;
    if (chance(0.3 + (has('prospect') ? 0.15 : 0) + (lv2('mine') ? 0.2 : 0))) { addMat('silver', 1); line += ' and some silver'; }
    if ((has('prospect') || lv2('mine')) && chance(lv2('mine') ? 0.08 : 0.06)) { addMat('mithril', 1); line += '. A blue gleam: mithril!'; }
    S.home.mineDay = S.day + 1; msg(line + '.', 'good'); useSkill('survival', 4); render(); return;
  }
  openCraft(site);
}
function upgrade(site) {
  const u = STRUCTURES[site].up; const p = P();
  if (!canAfford(u)) return;
  p.gold -= u.gold; for (const [m, n] of Object.entries(u.mats)) useMat(m, n);
  S.home.lv = S.home.lv || {}; S.home.lv[site] = 2;
  msg(`You upgrade your ${STRUCTURES[site].name} into a ${u.name}!`, 'level'); gainXp(25); autosave(); refresh();
}
const canAfford = c => P().gold >= c.gold && Object.entries(c.mats).every(([m, n]) => matAvail(m) >= n);
function build(site) {
  const s = STRUCTURES[site]; const p = P();
  p.gold -= s.gold; for (const [m, n] of Object.entries(s.mats)) useMat(m, n);
  S.home.built[site] = true; if (site === 'garden') S.home.gardenDay = S.day + 1;
  msg(`You build the ${s.name}!`, 'level'); if (winTabs && $('.sheet')) refresh(); else closeModal(); gainXp(15); autosave();
}
function openHouse() {
  const draw = () => {
    const p = P(); const chest = S.home.chest;
    $('#modal-body').innerHTML = `${keeperArt(propCanvas('cottage'), '<p>Your cottage. A bed, a hearth, and a stout oak chest.</p>')}
      <div class="btnrow"><button class="btn" data-a="rest" data-v="home">Sleep until morning</button></div>
      <div class="cols"><section><h3>Pack <span class="dim">${carried()} of ${capacity()} lb</span></h3>${p.inv.map(it => itemRow(it, `<button class="btn tiny" data-a="stash" data-v="${it.uid}">Store →</button>`)).join('') || '<p class="dim">Empty.</p>'}</section>
      <section><h3>Chest <span class="dim">${chest.length} items</span></h3>${chest.map(it => itemRow(it, `<button class="btn tiny" data-a="unstash" data-v="${it.uid}">← Take</button>`)).join('') || '<p class="dim">Empty.</p>'}</section></div>
      <h3>Materials <span class="dim">Stored materials count when you build or craft on your land.</span></h3>
      <div class="cols"><section>${Object.keys(p.mats).filter(k => p.mats[k] > 0).map(k => matRow(k, p.mats[k], `<button class="btn tiny" data-a="stashmat" data-v="${k}">Store →</button>`)).join('') || '<p class="dim">Pouch is empty.</p>'}
      ${Object.values(p.mats).some(v => v > 0) ? '<div class="btnrow"><button class="btn tiny" data-a="stashallmats">Store all materials</button></div>' : ''}</section>
      <section>${Object.keys(S.home.mats).filter(k => S.home.mats[k] > 0).map(k => matRow(k, S.home.mats[k], `<button class="btn tiny" data-a="unstashmat" data-v="${k}">← Take</button>`)).join('') || '<p class="dim">Storage is empty.</p>'}</section></div>`;
  };
  openModal('Cottage', '', { refresh: draw, wide: true }); draw();
}
let craftFilter = 'all';
function openCraft(st) {
  const s = STRUCTURES[st]; craftFilter = 'all';
  const draw = () => {
    let recs = RECIPES.filter(r => r.st === st);
    const tree = TREES.find(t => t.nodes.some(n => n.id === recs[0]?.skill));
    let html = keeperArt(propCanvas(s.spr), `<p>${s.desc}${tree ? ` Skills from the <b>${tree.name}</b> tree unlock recipes here.` : ''}</p>`);
    if (st === 'altar') html += `<h3>Enchant gear</h3>${has('ench1') ? enchantRows('altar') : '<p class="dim">Learn Runecarver (Enchanting tree) to use the altar.</p>'}<h3>Craft</h3>`;
    if (st === 'forge') {
      const groups = { all: 'All', weapon: 'Weapons', armor: 'Armor', known: 'Can make now' };
      html += `<div class="tabs">${Object.entries(groups).map(([k, v]) => `<button class="tab ${craftFilter === k ? 'on' : ''}" data-a="cfilter" data-v="${k}">${v}</button>`).join('')}</div>`;
      if (craftFilter === 'weapon' || craftFilter === 'armor') recs = recs.filter(r => ITEMS[r.out].cat === craftFilter || (craftFilter === 'weapon' && r.out === 'arrows'));
      if (craftFilter === 'known') recs = recs.filter(r => has(r.skill) && Object.entries(r.mats).every(([m, n]) => matAvail(m) >= n));
    }
    html += `<div class="list">${recs.map(r => {
      const it = makeItem(r.out, 0, r.qty || 1); const known = has(r.skill);
      const okMats = Object.entries(r.mats).every(([m, n]) => matAvail(m) >= n);
      const node = TREES.flatMap(t => t.nodes).find(n => n.id === r.skill);
      const mats = Object.entries(r.mats).map(([m, n]) => `<span class="${matAvail(m) >= n ? 'ok' : 'no'}" title="${MATS[m].name}">${spriteImg(matCanvas(m), 20)}${n}<small>/${matAvail(m)}</small></span>`).join(' ');
      return itemRow(it, known ? `<button class="btn tiny" data-a="craft" data-v="${RECIPES.indexOf(r)}" ${okMats ? '' : 'disabled'}>Craft${r.qty > 1 ? ' ×' + r.qty : ''}</button>` : `<span class="lock">Needs ${node.name}</span>`, `<span class="mats">${mats}</span>`);
    }).join('') || '<p class="dim">Nothing you can make right now.</p>'}</div>`;
    $('#modal-body').innerHTML = html;
  };
  openModal(s.name, '', { refresh: draw, wide: true }); draw();
}
// where you can work a station: your own on your land, or the townsfolk's (Bran's forge, Tamsin's cauldron, Mirela's crystals)
const TOWN_STATION = { forge: ['furnace', 'anvil'], bench: ['cauldron', 'herbrack'], altar: ['crystal'] };
function craftHere(st) {
  if (S.mapId === 'home') return !!S.home.built[st];
  const m = curMap(), p = P();
  if (m.id !== 'town') return false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((TOWN_STATION[st] || []).includes(m.decor[K(p.x + dx, p.y + dy)])) return true;
  return false;
}
const CRAFT_SKILL = { forge: 'smithing', bench: 'alchemy', altar: 'enchanting' };
function craft(i) {
  const r = RECIPES[i]; const p = P();
  if (!has(r.skill) || !Object.entries(r.mats).every(([m, n]) => matAvail(m) >= n) || !craftHere(r.st)) return;
  const t = ITEMS[r.out];
  // higher smithing ranks than the recipe needs, plus Tempering, raise the chance of Fine work
  const extra = ['smith1', 'smith2', 'smith3', 'smith4'].filter(id => has(id)).length - (['smith1', 'smith2', 'smith3', 'smith4'].indexOf(r.skill) + 1);
  let qty = r.qty || 1;
  if (r.out === 'arrows' && has('arrowsmith')) qty *= 2;
  if (t.cat === 'potion' && has('efficient') && chance(1 / 3)) qty += 1;
  if (t.cat === 'potion' && lv2('bench') && chance(1 / 4)) qty += 1;
  const it = makeItem(r.out, 0, qty);
  it.crafted = 1;
  if (t.slot && chance(0.1 + 0.12 * Math.max(0, extra) + 0.1 * rank('temper') + (r.st === 'forge' && lv2('forge') ? 0.1 : 0))) { it.ench = has('masterwork') ? 2 : 1; it.fine = 1; }
  if (!addItem(it)) return;
  for (const [m, n] of Object.entries(r.mats)) useMat(m, n);
  msg(`You craft ${itemName(it)}.${it.fine ? ' Fine work!' : ''}`, 'good');
  useSkill(CRAFT_SKILL[r.st], 5 + Math.min(5, t.tier || 1) * 3);
  refresh();
}

// ================= input =================
const KEYMAP = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1], '.': [0, 0], '5': [0, 0], Clear: [0, 0],
  '8': [0, -1], '2': [0, 1], '4': [-1, 0], '6': [1, 0], '7': [-1, -1], '9': [1, -1], '1': [-1, 1], '3': [1, 1],
};
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') e.target.blur(); return; }
  if (e.key === 'Escape') { closeModal(); return; }
  if (fishing && modalOpen && (e.key === ' ' || e.key === 'Enter')) { reel(); e.preventDefault(); return; }
  if (modalOpen || !S || dead) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'i') { openInventory(); e.preventDefault(); return; }
  if (k === 'c') { openSpells(); e.preventDefault(); return; }
  if (k === 'p') { openChar(); e.preventDefault(); return; }
  if (k === 'f') { fire(); e.preventDefault(); return; }
  if (e.key === 'Tab') { cycleTarget(e.shiftKey ? -1 : 1); e.preventDefault(); return; }
  if (k === 'g' || k === ',') { getAction(); e.preventDefault(); return; }
  if (k === 'r') { restAction(); e.preventDefault(); return; }
  if (k === 't') { placeTorch(); e.preventDefault(); return; }
  if (k === 'o') { openOptions(); e.preventDefault(); return; }
  if (e.key === 'J') { openHero('parish'); e.preventDefault(); return; }
  if (k === 'v') { openPrayers(); e.preventDefault(); return; }
  if (e.key === 'S' || k === 'm') { toggleSneak(); e.preventDefault(); return; }
  if (e.key === '?') { openHelp(); e.preventDefault(); return; }
  if (/^Digit\d$/.test(e.code)) { const n = +e.code.slice(5); useHot(n === 0 ? 9 : n - 1); e.preventDefault(); return; }
  const dir = KEYMAP[e.key] || KEYMAP[k];
  if (dir) { e.preventDefault(); act(dir[0], dir[1]); }
});
cvs.addEventListener('click', e => {
  if (modalOpen || !S || dead) return;
  const r = cvs.getBoundingClientRect(); const p = P();
  const [ox, oy] = viewOffset(r.width, r.height);
  const tx = Math.floor((e.clientX - r.left - ox) / TS), ty = Math.floor((e.clientY - r.top - oy) / TS);
  if (tx === p.x && ty === p.y) { getAction(); return; }
  const mon = curMap().mons.find(o => o.x === tx && o.y === ty && monVisible(o));
  if (mon && cheb(mon, p) > 1) {
    const wt = weaponT();
    if (mon.uid === targetUid && targetPinned && wt && RANGED_CLS.has(wt.cls)) { fire(); return; }
    if (inRange(mon)) { targetUid = mon.uid; targetPinned = true; renderMap(); msg(`Target: ${the(mon)}.${wt && RANGED_CLS.has(wt.cls) ? ' Tap again or press F to shoot.' : ''}`); return; }
  }
  act(Math.sign(tx - p.x), Math.sign(ty - p.y));
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a, v = el.dataset.v;
  const p = S && P();
  const findInv = u => p.inv.find(o => o.uid === u);
  switch (a) {
    case 'close': closeModal(); break;
    case 'reel': reel(); break;
    case 'p': parishAct(v); break;
    case 'inv': if (!dead && S) openInventory(); break;
    case 'char': if (!dead && S) openChar(); break;
    case 'spells': if (!dead && S) openSpells(); break;
    case 'fire': fire(); break;
    case 'get': getAction(); break;
    case 'tcycle': cycleTarget(1); break;
    case 'hot': useHot(+v); break;
    case 'isel': invSel = v; refresh(); break;
    case 'ifilter': invFilter = v; refresh(); break;
    case 'board': openBoard(); break;
    case 'prayers': openPrayers(); break;
    case 'pantheon': openPantheon(); break;
    case 'invoke': invoke(v); break;
    case 'trial': doTrial(v); break;
    case 'land': openLand(); break;
    case 'rest': if (v) rest(v); else restAction(); break;
    case 'torch': placeTorch(); break;
    case 'options': openOptions(); break;
    case 'facestyle': FACE_STYLE = v; try { localStorage.setItem('tw-face', v); } catch (e) { } FIG_CACHE.clear(); render(); break;
    case 'hdchars': HD_ON = v === 'on'; try { localStorage.setItem('tw-hd', v); } catch (e) { } FIG_CACHE.clear(); render(); break;
    case 'cheat': cheat(v); break;
    case 'cheatgo': closeModal(true); if (v === 'town') doTrigger({ go: 'town', at: [27, 45] }); else if (v === 'wilds') doTrigger({ go: 'wilds' }); else travel(v); render(); break;
    case 'zoom': try { localStorage.setItem('tw-zoom', v); } catch (e) { } TS = 0; resizeCanvas(); break;
    case 'opt': { const [k, val] = v.split(':'); if (k === 'autoGold' || k === 'live') S.opts[k] = el.checked; else { S.opts[k] = val; const cm = curMap(); if (val === 'open' && !cm.lit) { revealAll(cm); cm.revealed = 1; } computeFov(); } render(); break; }
    case 'deliver': S.opts.deliver = el.checked; break;
    case 'dropmat': { const n = p.mats[v]; if (n > 0) { curMap().ground.push({ x: p.x, y: p.y, mat: v, q: n }); p.mats[v] = 0; msg(`You drop ${n} ${MATS[v].name}.`); refresh(); } break; }
    case 'stashmat': S.home.mats[v] = (S.home.mats[v] || 0) + (p.mats[v] || 0); p.mats[v] = 0; refresh(); break;
    case 'stashallmats': for (const k in p.mats) { S.home.mats[k] = (S.home.mats[k] || 0) + (p.mats[k] || 0); p.mats[k] = 0; } refresh(); break;
    case 'unstashmat': p.mats[v] = (p.mats[v] || 0) + (S.home.mats[v] || 0); S.home.mats[v] = 0; refresh(); break;
    case 'help': openHelp(); break;
    case 'game': openGame(v || 'options'); break;
    case 'hero': if (!dead && S) openHero(v || 'inv'); break;
    case 'wtab': winTabs.cur = v; refresh(); break;
    case 'save': saveGame(true); break;
    case 'dir': { const [dx, dy] = v.split(',').map(Number); act(dx, dy); break; }
    case 'equip': { const it = findInv(v); if (it) { equip(it); refresh(); } break; }
    case 'unequip': unequip(v); refresh(); break;
    case 'use': { const it = findInv(v); if (it) { useItem(it); if (modalOpen) refresh(); } break; }
    case 'drop': { const it = findInv(v); if (it) { p.inv = p.inv.filter(o => o !== it); curMap().ground.push({ x: p.x, y: p.y, item: it }); msg(`You drop the ${itemName(it)}.`); refresh(); } break; }
    case 'attr': if (p.attrPts > 0) { p.stats[v]++; p.attrPts--; if (v === 'con') p.hp += 3; if (v === 'int') p.mp += 2; refresh(); } break;
    case 'learn': { const n = SKILL_NODES[v]; if (!n || skillBlock(n)) break; p.skills[v] = rank(v) + 1; p.skillPts--; if (v === 'tough') p.hp += 8; if (v === 'manawell') p.mp += 4; msg(rank(v) > 1 ? `${n.name} rises to rank ${rank(v)}.` : `You learn ${n.name}.`, 'level'); refresh(); break; }
    case 'sktree': skillTree = v; refresh(); break;
    case 'cview': craftView = v; refresh(); break;
    case 'upgrade': upgrade(v); break;
    case 'sneak': toggleSneak(); break;
    case 'pin': { p.favSpells = p.favSpells || p.spells.slice(0, 4); const i = p.favSpells.indexOf(v); if (i >= 0) p.favSpells.splice(i, 1); else p.favSpells.push(v); refresh(); break; }
    case 'respec': respec(); break;
    case 'cast': cast(v); break;
    case 'tab': shopTab = v; refresh(); break;
    case 'cfilter': craftFilter = v; refresh(); break;
    case 'buy': { const [s, k] = v.split('|'); doBuy(s, k); break; }
    case 'buy5': { const [s, k] = v.split('|'); doBuy(s, k, 5); break; }
    case 'buyspecial': {
      const sh = S.shops.enchanter; const it = sh.special.find(o => o.uid === v); if (!it) break;
      const price = buyPrice('enchanter', it.id, it); if (p.gold < price || !addItem(it)) break;
      p.gold -= price; sh.special = sh.special.filter(o => o !== it); msg(`You buy the ${itemName(it)} for ${price} gold.`, 'gold'); refresh(); break;
    }
    case 'sell': case 'sellall': { const [s, u] = v.split('|'); const it = findInv(u); if (it) doSell(s, it, a === 'sellall'); break; }
    case 'sellmat': { const [s, m, n] = v.split('|'); doSellMat(s, m, n); break; }
    case 'enchant': { const [mode, u] = v.split('|'); doEnchant(mode, u); break; }
    case 'buyland': if (p.gold >= LAND_PRICE) { p.gold -= LAND_PRICE; S.home.owned = true; seedHomeNodes(); msg('You sign the deed. The East Field is yours! Take the road east out of town.', 'level'); openLand(); render(); autosave(); } break;
    case 'build': build(v); break;
    case 'craft': craft(+v); break;
    case 'stash': { const it = findInv(v); if (it) { p.inv = p.inv.filter(o => o !== it); S.home.chest.push(it); refresh(); } break; }
    case 'unstash': { const it = S.home.chest.find(o => o.uid === v); if (it) { S.home.chest = S.home.chest.filter(o => o !== it); addItem(it, true); refresh(); } break; }
    case 'creator': openCreator(false); break;
    case 'appearance': openCreator(true); break;
    case 'begin': { const name = (creator.name || '').trim() || 'Corin', origin = creator.origin; newGame(name, creator.look, creator.diff); if (creator.hardcore && creator.diff !== 'ironman') S.hardcore = 1; S.opts.combat = creator.combat || 'action'; if (typeof applyOrigin === 'function') applyOrigin(origin); creator = null; break; }
    case 'origin': creator.origin = v; refresh(); break;
    case 'diff': creator.diff = v; refresh(); break;
    case 'hardcore': creator.hardcore = el.checked; break;
    case 'crcombat': creator.combat = v; refresh(); break;
    case 'look': { const [k, i] = v.split(':'); setLook(k, +i); break; }
    case 'lookcyc': { const [k, d] = v.split(':'); setLook(k, creator.look[k] + +d); break; }
    case 'lookrand': for (const k of ['skin', 'hair', 'hairColor', 'face', 'shirt', 'pants', 'boots', 'build', 'jaw', 'eyes']) creator.look[k] = rnd(LOOK[k].length); creator.look.mark = chance(0.4) ? rnd(LOOK.mark.length) : 0; creator.look.hairFx = chance(0.25) ? rnd(LOOK.hairFx.length) : 0; if (!creator.editing) creator.name = randomName(); refresh(); break;
    case 'crgear': creator.gear = el.checked; refresh(); break;
    case 'lookdone': P().look = { ...creator.look }; creator = null; closeModal(); msg('You take a moment to tidy yourself up.'); autosave(); break;
    case 'continue': case 'loadsave': loadGame(); break;
    case 't': titleAct(v); break;
    case 'saveto': saveGame(true, +v); break;
    case 'quittitle': saveGame(false).then(titleScreen); break;
    case 'newgame': dead = false; closeModal(true); titleScreen(); break;
  }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#log').addEventListener('click', () => { $('#log').classList.toggle('open'); if (S) renderLog(); });

// ================= save / load =================
// Saves live in three slots, in this browser and (when available) in your account.
// The old single save, from before slots, is moved into slot 1 the first time it's read.
let store = null, storeDb = null, storeBase = null, saveSlot = 1;
const SLOT_COUNT = 3;
const slotKey = n => 'tw-save-' + n;
async function initStore() {
  if (storeDb) return;
  try {
    const c = window.claude; if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    storeDb = db; storeBase = 'data/users/' + id;
    store = db.doc(storeBase + '/save');
  } catch (e) { store = null; storeDb = null; }
}
const slotDoc = n => storeDb ? storeDb.doc(storeBase + '/save' + n) : null;
function serialize() {
  const copy = JSON.parse(JSON.stringify(S));
  for (const k in copy.maps) { const m = copy.maps[k]; if (m.seen) m.seen = m.seen.join(''); }
  return JSON.stringify(copy);
}
function deserialize(json) {
  const s = JSON.parse(json);
  for (const k in s.maps) { const m = s.maps[k]; if (typeof m.seen === 'string') m.seen = m.seen.split('').map(Number); }
  return s;
}
// Bring a save from an older version up to date.
function migrate(s) {
  if (s.v === SAVE_VERSION) return s;
  if (s.v === 20) return migrate21(s);
  if (s.v === 19) return migrate20(s);
  if (s.v === 18) return migrate19(s);
  if (s.v === 17) return migrate18(s);
  if (s.v === 16) return migrate17(s);
  if (s.v === 15) return migrate16(s);
  if (s.v === 14) return migrate15(s);
  if (s.v === 13) return migrate14(s);
  if (s.v === 12) return migrate13(s);
  if (s.v === 11) return migrate12(s);
  if (s.v === 10) return migrate11(s);
  if (s.v === 9) return migrate10(s);
  if (s.v === 8) return migrate9(s);
  if (s.v === 7) return migrate8(s);
  if (s.v === 6) return migrate7(s);
  if (s.v === 5) return migrate6(s);
  if (s.v === 4) return migrate5(s);
  if (s.v === 3) return migrate4(s);
  if (s.v === 2) return migrate3(s);
  const fix = it => { if (!it) return null; if (LEGACY_ITEMS[it.id]) it.id = LEGACY_ITEMS[it.id]; return ITEMS[it.id] ? it : null; };
  const p = s.player;
  p.inv = (p.inv || []).map(fix).filter(Boolean);
  for (const sl of SLOTS) p.equip[sl] = fix(p.equip[sl]);
  s.home.chest = (s.home.chest || []).map(fix).filter(Boolean);
  p.st = { poison: p.poison || 0 }; delete p.poison;
  s.story = s.story || {}; s.bosses = {}; s.seals = {};
  const prev = S; S = s;
  s.maps = { town: buildTown(), hall: buildHall(), home: buildHome() };
  initShops();
  S = prev;
  if (!['town', 'hall', 'home'].includes(s.mapId)) { s.mapId = 'town'; p.x = 27; p.y = 45; }
  p.lastDungeon = null;
  s.v = 2;
  s.log.push({ t: 'The caves have changed since you were last here: the tunnels now split into four kingdoms. Your gear has been updated to the new weapon and armor classes.', c: 'news' });
  return migrate3(s);
}
function migrate3(s) {
  if (s.v >= 3) return migrate4(s);
  const prev = S; S = s;
  s.opts = { reveal: 'sight', autoGold: false, deliver: true };
  s.maps.town = buildTown(); s.maps.hall = buildHall(); s.maps.wilds = buildWilds();
  const nodes = s.home.nodes; s.maps.home = buildHome(); s.home.nodes = nodes;
  for (const k in s.maps) { const m = s.maps[k]; m.decor = m.decor || {}; m.lights = m.lights || []; for (const lk in m.links) if (m.links[lk] === 'town') m.links[lk] = 'wilds'; }
  S = prev;
  const p = s.player;
  p.packBonus = Math.max(0, ((p.invSize || 16) - 16) / 8 * 30); delete p.invSize;
  if (!p.equip.light) p.equip.light = makeItem('torch');
  p.inv.push(makeItem('torch', 0, 4));
  s.home.mats = s.home.mats || {};
  if (s.mapId === 'town') { p.x = 26; p.y = 16; }
  if (s.mapId === 'hall') { p.x = 15; p.y = 14; }
  if (s.mapId === 'home') { p.x = 1; p.y = 12; }
  s.log.push({ t: 'Brambleford has been rebuilt, and the cave now lies up the North Road outside the north gate. The caves are dark: carry a torch. Press G to pick things up and R to rest. You were given 5 torches.', c: 'news' });
  s.v = 3;
  return migrate4(s);
}
function migrate4(s) {
  const prev = S; S = s;
  s.maps.wilds = buildWilds();
  S = prev;
  if (s.mapId === 'wilds') { s.player.x = 22; s.player.y = s.maps.wilds.h - 2; }
  s.log.push({ t: 'A hunters\' trail now branches west off the North Road into the Whisperwood.', c: 'news' });
  s.v = 4;
  return migrate5(s);
}
function migrate5(s) {
  const prev = S; S = s;
  s.maps.town = buildTown(); s.maps.wilds = buildWilds();
  const nodes = s.home.nodes; s.maps.home = buildHome(); s.home.nodes = nodes;
  S = prev;
  if (s.mapId === 'town' || s.mapId === 'hall') { s.mapId = 'town'; s.player.x = 36; s.player.y = 27; }
  if (s.mapId === 'wilds') { s.player.x = 22; s.player.y = s.maps.wilds.h - 2; }
  if (s.mapId === 'home') { s.player.x = 1; s.player.y = 12; }
  s.log.push({ t: "Brambleford has grown. Every shop now has its own building on the high street, the Town Hall overlooks the market square, and there are homes for the townsfolk.", c: 'news' });
  s.v = 5;
  return migrate6(s);
}
function migrate6(s) {
  const prev = S; S = s; s.maps.town = buildTown(); S = prev;
  const p = s.player;
  p.gods = p.gods || { aurel: true }; p.prayed = p.prayed || {}; p.buffs = p.buffs || {};
  p.skills.wt1 = 1;
  if (s.mapId === 'town') { p.x = 36; p.y = 27; }
  s.log.push({ t: "Your story has deepened: Halvard was Brambleford's priest, and you were his acolyte and shrine guard. The gods each keep a shrine somewhere in the world. You bear Aurel's blessing; pray with V.", c: 'news' });
  s.v = 6;
  return migrate7(s);
}
// The skill trees were rebuilt: refund what was spent, and award a point for each god's blessing beyond Aurel's.
function migrate7(s) {
  const p = s.player;
  const spent = Object.keys(p.skills || {}).length;
  const gods = Object.keys(p.gods || {}).filter(g => p.gods[g] && g !== 'aurel').length;
  p.skills = { wt: 1 };
  p.skillPts = (p.skillPts || 0) + Math.max(0, spent - 1) + gods;
  p.prayed2 = {};
  s.log.push({ t: `The skill trees have grown deeper: eight trees, ranks, tiers and choices. Your skills were reset, and you have ${p.skillPts} points to spend (Hero › Skills).`, c: 'news' });
  s.v = 7;
  return migrate8(s);
}
function migrate8(s) {
  s.diff = s.diff || 'normal'; s.home.lv = s.home.lv || {};
  s.player.favSpells = s.player.favSpells || s.player.spells.slice(0, 4);
  s.log.push({ t: 'New: sixteen more spells at the Arcanum, sneaking (Shift+S or M), homestead upgrades and a Crafting tab (Hero › Crafting).', c: 'news' });
  s.v = 8;
  return migrate9(s);
}
function migrate9(s) {
  const prev = S; S = s;
  s.maps.parsonage = buildParsonage();
  S = prev;
  if (s.maps.town) s.maps.town.trig[K(27, 44)] = { go: 'parsonage' };
  if (s.maps.hall) s.maps.hall.theme = 'house';
  s.log.push({ t: 'Brambleford, the woods and the caves have been repainted, and you can now step inside the parsonage, your home beside the temple.', c: 'news' });
  s.v = 9;
  return migrate10(s);
}
// The parish: townsfolk have lives, troubles and requests now. Elsbeth Voss joins the town,
// and Halvard's books and sun-disc in the parsonage become things you can use.
function migrate10(s) {
  const t = s.maps.town;
  if (t && !t.npcs.some(n => n.spr === 'elsbeth')) t.npcs.push({ spr: 'elsbeth', x: 26, y: 13, name: 'Elsbeth Voss', lines: [], fixed: true });
  const pm = s.maps.parsonage;
  if (pm) {
    pm.trig[K(10, 1)] = { dlg: 'sundisc', text: "Aurel's sun-disc hangs above the mantel. Halvard polished it every morning before the dawn service. It's beginning to tarnish." };
    pm.trig[K(5, 2)] = { dlg: 'books', text: "Halvard's books: hymnals, herbals, a history of the valley. Someone has cut the pages about Ashvale out of the history with a knife." };
  }
  s.log.push({ t: 'The people of Brambleford have lives of their own now, and with Halvard gone they bring their troubles to you. Walk into anyone to talk. A friar from the cathedral is waiting outside the temple. Your ledger is under Hero › Parish (Shift+J).', c: 'news' });
  s.v = 10;
  return migrate11(s);
}
// The temple is rebuilt as a proper chapel.
function migrate11(s) {
  const t = s.maps.town;
  if (t) { delete t.decor[K(35, 43)]; delete t.decor[K(39, 43)]; placeTemple(t); }
  s.v = 11;
  return migrate12(s);
}
// A churchyard beside the temple, and fishing.
function migrate12(s) {
  if (s.maps.town) placeGraveyard(s.maps.town);
  s.log.push({ t: 'New: a churchyard beside the temple, and fishing. Buy a rod at Wendell\'s and walk into water to cast a line.', c: 'news' });
  s.v = 12;
  return migrate13(s);
}
// The North Road gets its river.
// Every building in town is redrawn for its trade.
function migrate15(s) {
  const prev = S; S = s;
  const old = s.maps.town;
  if (old) { const t = buildTown(); t.ground = old.ground || []; s.maps.town = t; }
  S = prev;
  s.log.push({ t: 'Brambleford has been rebuilt: every shop and home now looks the part, and the townsfolk have been given a fresh look and a walk of their own.', c: 'news' });
  s.v = 15;
  return migrate16(s);
}
function migrate16(s) {
  const prev = S; S = s;
  const old = s.maps.wilds;
  if (old) { const w = buildWilds(); w.ground = old.ground || []; s.maps.wilds = w; if (s.mapId === 'wilds') { s.player.x = 22; s.player.y = w.h - 2; } }
  S = prev;
  if (s.dayT0 === undefined) s.dayT0 = s.turn - (s.turn % 600);
  s.log.push({ t: 'The Bramble now has a shallow ford downstream of the bridge. The sun rises and sets over the valley.', c: 'news' });
  s.v = 16;
  return migrate17(s);
}
function migrate17(s) { s.v = 17; return migrate18(s); }
// Brambleford re-laid as the village it really is: crooked streets, a market green, cottages along the lanes,
// and the drovers' end with the butcher, the barn, the stockyard and the auction ring
function migrate18(s) {
  const prev = S; S = s;
  const old = s.maps.town;
  if (old) {
    const t = buildTown();
    const ok = (x, y) => TILES[tileAt(t, x, y)] && TILES[tileAt(t, x, y)].walk;
    t.ground = (old.ground || []).filter(g => ok(g.x, g.y));
    s.maps.town = t;
    if (s.mapId === 'town' && !ok(s.player.x, s.player.y)) { s.player.x = 27; s.player.y = 45; }
  }
  S = prev;
  if (s.maps.home) s.maps.home.trig[K(0, 12)] = { go: 'town', at: [93, 24] };
  s.log.push({ t: "Brambleford has been re-laid as a real village: crooked streets, a market green, cottages along the lanes, and a drovers' end with a butcher, a stockyard and an auction ring.", c: 'news' });
  s.v = 18; return migrate19(s);
}
// longer days, and the estate laid out anew: the East Field and the parcels around it
function migrate20(s) {
  const prev = S; S = s;
  if (s.maps.home) { s.maps.home = buildHome(); if (s.home.owned) seedHomeNodes(); s.home.parcels = Object.assign({ field: !!s.home.owned }, s.home.parcels || {}); stampEstate(); if (s.mapId === 'home') { s.player.x = HOME_ENTRY[0]; s.player.y = HOME_ENTRY[1]; } }
  if (s.maps.town) { const a = s.maps.town.npcs.find(n => n.name === 'the auctioneer'); if (a) a.auction = 1; }
  S = prev;
  s.log.push({ t: 'Your land has grown into an estate: buy the Woodlot, the Riverside and the South Pasture at the Land Registry; raise a barn, a pen, fields, an orchard and a workers\u2019 cottage; buy beasts at the auction ring. Days are longer now, too.', c: 'news' });
  s.v = 20;
  return migrate21(s);
}
// the temple moves up onto its hill in the north-west corner of town
function migrate21(s) {
  const prev = S; S = s;
  const keep = s.maps.town ? s.maps.town.npcs : null;
  s.maps.town = buildTown();
  if (keep) for (const n of s.maps.town.npcs) { const o = keep.find(k => k.name === n.name && k.spr === n.spr); if (o) Object.assign(n, o, { x: n.x, y: n.y, home: undefined, goal: undefined }); }
  s.maps.parsonage = buildParsonage();
  delete s.maps.temple;
  S = prev;
  if (s.mapId === 'town') { s.player.x = TEMPLE_OUT[0]; s.player.y = TEMPLE_OUT[1] + 3; }
  s.log.push({ t: 'The Temple of the Dawn now stands on its hill in the north-west corner of Brambleford, with the parsonage and the churchyard beside it. Climb the steps from the lane.', c: 'news' });
  s.v = SAVE_VERSION;
  return s;
}
// skills that grow by use, Skyrim fashion
function migrate19(s) {
  const p = s.player;
  seedSkills(p);
  p.xp = Math.min(p.xp || 0, xpToNext(p.level) - 1);
  s.log.push({ t: 'Skills now grow by use: fight with a blade and your Blade skill rises, haggle and your Speech does, and so on. Each rise counts toward your level, and perks open as their skill grows (Hero › Skills).', c: 'news' });
  s.v = 19;
  return migrate20(s);
}
function migrate14(s) {
  const prev = S; S = s; s.maps.wilds = buildWilds(); S = prev;
  if (s.mapId === 'wilds') { s.player.x = 22; s.player.y = s.maps.wilds.h - 2; }
  s.log.push({ t: 'The Bramble river now runs across the North Road, under a timber bridge. Pike bite there.', c: 'news' });
  s.v = 14;
  return migrate15(s);
}
// The parsonage moves onto the temple's west wall, smaller and warmer inside.
function migrate13(s) {
  const prev = S; S = s;
  if (s.maps.town) placeParsonage(s.maps.town);
  s.maps.parsonage = buildParsonage();
  S = prev;
  if (s.mapId === 'parsonage') { s.player.x = 4; s.player.y = 6; }
  if (s.mapId === 'town' && s.player.x >= 24 && s.player.x <= 32 && s.player.y >= 38 && s.player.y <= 44) { s.player.x = 31; s.player.y = 45; }
  s.v = 13;
  return migrate14(s);
}
function slotSummary() {
  const p = P();
  return { name: p.name, level: p.level, day: S.day, place: curMap().name, diff: S.diff || 'normal', hc: !!S.hardcore, look: p.look || {},
    equip: Object.fromEntries(SLOTS.map(sl => [sl, p.equip[sl] ? { id: p.equip[sl].id } : null])) };
}
// details for the slot cards, read out of an old save that didn't store them
function describeSave(r) {
  if (r.name) return r;
  try { const st = JSON.parse(r.json), p = st.player; return Object.assign(r, { name: p.name, level: p.level, day: st.day, place: (st.maps[st.mapId] || {}).name || '', diff: st.diff || 'normal', look: p.look || {}, equip: Object.fromEntries(SLOTS.map(sl => [sl, p.equip[sl] ? { id: p.equip[sl].id } : null])) }); } catch (e) { return r; }
}
async function readLegacy() {
  let best = null;
  try { const r = JSON.parse(localStorage.getItem('brambleford-save') || 'null'); if (r && r.json) best = r; } catch (e) { }
  if (store) { try { const snap = await store.get(); if (snap.exists) { const d = snap.data(); if (d && d.json && (!best || d.at > best.at)) best = d; } } catch (e) { } }
  return best;
}
async function readSlot(n) {
  let best = null;
  try { const r = JSON.parse(localStorage.getItem(slotKey(n)) || 'null'); if (r && r.json) best = r; } catch (e) { }
  const doc = slotDoc(n);
  if (doc) { try { const snap = await doc.get(); if (snap.exists) { const d = snap.data(); if (d && d.json && (!best || d.at > best.at)) best = d; } } catch (e) { } }
  if (n === 1 && !best) {
    const old = await readLegacy();
    if (old) {
      best = describeSave(old);
      try { localStorage.setItem(slotKey(1), JSON.stringify(best)); localStorage.removeItem('brambleford-save'); } catch (e) { }
      if (doc) { try { await doc.set(best); if (store) await store.set({ json: null, at: Date.now() }); } catch (e) { } }
    }
  }
  return best ? describeSave(best) : null;
}
async function readAllSlots() { const out = []; for (let n = 1; n <= SLOT_COUNT; n++) out.push(await readSlot(n)); return out; }
async function writeSlot(n, data) {
  let ok = false;
  try { localStorage.setItem(slotKey(n), JSON.stringify(data)); ok = true; } catch (e) { }
  const doc = slotDoc(n); if (doc) { try { await doc.set(data); ok = true; } catch (e) { } }
  return ok;
}
async function deleteSlot(n) {
  try { localStorage.removeItem(slotKey(n)); if (n === 1) localStorage.removeItem('brambleford-save'); } catch (e) { }
  const doc = slotDoc(n); if (doc) { try { await doc.set({ json: null, at: Date.now() }); } catch (e) { } }
  if (n === 1 && store) { try { await store.set({ json: null, at: Date.now() }); } catch (e) { } }
}
// ironman: the slot you were playing is gone
async function eraseSave() { await deleteSlot(saveSlot); }
async function saveGame(loud, slot) {
  if (!S || dead) return;
  if (slot) saveSlot = slot;
  const ok = await writeSlot(saveSlot, Object.assign({ json: serialize(), at: Date.now(), slot: saveSlot }, slotSummary()));
  if (loud) msg(ok ? `Game saved to slot ${saveSlot}.` : 'Saving is not available here.', ok ? 'good' : 'warn');
  if (loud && modalRefresh) modalRefresh();
}
let lastAuto = 0;
function autosave() { if (Date.now() - lastAuto > 3000) { lastAuto = Date.now(); saveGame(false); } }
async function loadSlot(n) {
  const r = await readSlot(n);
  if (!r) { msg('That slot is empty.'); return; }
  saveSlot = n;
  S = migrate(deserialize(r.json)); dead = false; hideTitle(); closeModal(true);
  msg('Game loaded.', 'good'); computeFov(); render(); renderLog();
}
const loadGame = () => loadSlot(saveSlot);
const timeAgo = at => { const m = Math.round((Date.now() - at) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

// ================= new game / title =================
function newGame(name, look, diff) {
  dead = false; hideTitle();
  S = {
    v: SAVE_VERSION, turn: 0, day: 1, dayT0: 0, mapId: 'parsonage', log: [], events: [], wyrmSlain: false, story: {}, bosses: {}, seals: {},
    opts: { reveal: 'sight', autoGold: false, deliver: true },
    player: { name, x: 2, y: 3, level: 1, xp: 0, hp: 1, mp: 0, gold: 60, stats: { str: 12, dex: 11, int: 10, con: 12 }, attrPts: 0, skillPts: 1, look: look || {}, skills: { wt: 1 }, gods: { aurel: true }, prayed: {}, buffs: {}, spells: [], inv: [], packBonus: 0, equip: {}, mats: {}, st: {}, strBuff: 0, kills: 0, bonusHp: 0, lastDungeon: null },
    diff: diff || 'normal',
    maps: {}, shops: {}, home: { owned: false, built: {}, lv: {}, nodes: {}, chest: [], mats: {}, gardenDay: 0, mineDay: 0 },
  };
  S.maps.town = buildTown(); S.maps.home = buildHome(); S.maps.wilds = buildWilds(); S.maps.parsonage = buildParsonage();
  initShops();
  const p = P();
  p.equip.weapon = makeItem('mace_iron'); p.equip.armor = makeItem('leather_iron');
  p.inv.push(makeItem('pheal', 0, 2)); p.inv.push(makeItem('torch', 0, 4));
  p.equip.light = makeItem('torch');
  p.hp = maxHp(); p.mp = maxMp();
  closeModal(true);
  msg(`${name}, acolyte of Aurel and ward of Father Halvard, wakes in the parsonage beside the temple.`);
  msg("Halvard went into the cave up the North Road three days ago and hasn't come back. His desk is still covered in his papers.");
  msg('When you are ready, gear up at the shops along the high street, then head out the north gate to find him.');
  msg('A friar from the cathedral has been asking for you outside the temple, south of the market.', 'news');
  msg('Walk into things to interact: monsters to fight, counters to shop, doors to enter. You have a skill point to spend (P).', 'talk');
  computeFov(); render(); renderLog(); saveGame(false);
}
// ---- character creator ----
let creator = null;
const STARTER_LOOK_GEAR = { weapon: { id: 'mace_iron' }, armor: { id: 'leather_iron' }, light: { id: 'torch' } };
function openCreator(editing) {
  const base = editing && S ? S.player.look || {} : {};
  creator = { editing: !!editing, diff: 'normal', combat: 'action', name: editing && S ? S.player.name : 'Corin', gear: !!editing, look: Object.assign({ skin: 0, hair: 0, hairColor: 0, face: 0, shirt: 0, pants: 0, boots: 0, build: 0, jaw: 0, eyes: 0, mark: 0, hairFx: 0 }, base), origin: 'temple' };
  const draw = () => {
    const L = creator.look;
    const sw = (k, list) => `<div class="swatches" role="radiogroup">${list.map((c, i) => `<button class="sw ${L[k] === i ? 'on' : ''}" style="background:#${Array.isArray(c) ? c[0] : c}" role="radio" aria-checked="${L[k] === i}" data-a="look" data-v="${k}:${i}" aria-label="${k} ${i + 1}"></button>`).join('')}</div>`;
    const cyc = (k, list) => `<div class="cycler"><button class="btn tiny" data-a="lookcyc" data-v="${k}:-1" aria-label="Previous ${k}">◀</button><span>${list[L[k]]}</span><button class="btn tiny" data-a="lookcyc" data-v="${k}:1" aria-label="Next ${k}">▶</button></div>`;
    const gearEquip = creator.editing ? P().equip : STARTER_LOOK_GEAR;
    $('#modal-body').innerHTML = `<div class="creator">
      <div class="cr-preview">
        <div class="cr-stage">${spriteImg(heroSprite(creator.gear ? gearEquip : {}, L), 144)}</div>
        <label class="deliver"><input type="checkbox" data-a="crgear" ${creator.gear ? 'checked' : ''}> Show gear</label>
        <button class="btn" data-a="lookrand">Randomize</button>
      </div>
      <div class="cr-opts">
        ${creator.editing ? '' : `<div class="cr-row"><label for="hero-name">Name</label><span class="namebox"><input id="hero-name" maxlength="18" value="${esc(creator.name)}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"><button type="button" class="btn dice" data-rollname="1" title="A random name" aria-label="A random name">⚄</button></span></div>`}
        <div class="cr-row"><label>Skin</label>${sw('skin', LOOK.skin)}</div>
        <div class="cr-row"><label>Hair</label>${cyc('hair', LOOK.hair)}</div>
        <div class="cr-row"><label>Hair color</label>${sw('hairColor', LOOK.hairColor)}</div>
        <div class="cr-row"><label>Facial hair</label>${cyc('face', LOOK.face)}</div>
        <div class="cr-row"><label>Hair accent</label>${cyc('hairFx', LOOK.hairFx)}</div>
        <div class="cr-row"><label>Build</label>${cyc('build', LOOK.build)}</div>
        <div class="cr-row"><label>Jaw</label>${cyc('jaw', LOOK.jaw)}</div>
        <div class="cr-row"><label>Eyes</label>${sw('eyes', LOOK.eyes)}</div>
        <div class="cr-row"><label>Marks</label>${cyc('mark', LOOK.mark)}</div>
        <div class="cr-row"><label>Shirt</label>${sw('shirt', LOOK.shirt)}</div>
        <div class="cr-row"><label>Trousers</label>${sw('pants', LOOK.pants)}</div>
        <div class="cr-row"><label>Boots</label>${sw('boots', LOOK.boots)}</div>
        ${creator.editing || typeof originRow !== 'function' ? '' : originRow(creator.origin)}
        ${creator.editing ? '' : `<div class="cr-row cr-diff"><label>Difficulty</label><div class="diffs">${Object.entries(DIFFS).map(([k, d]) => `<button class="diff ${creator.diff === k ? 'on' : ''}" data-a="diff" data-v="${k}" aria-pressed="${creator.diff === k}"><b>${d.name}</b><small>${d.desc}</small></button>`).join('')}</div></div><div class="cr-row cr-diff"><label>Combat</label><div class="diffs">${[['action', 'Live action', 'Fights happen in real time. Swing (hold for a heavy blow), dodge-roll, block with a shield, and watch your stamina. Foes wind up before they strike.'], ['bump', 'Classic', 'Turn by turn, the old way. Walk into a foe to attack it. Nothing moves until you do.']].map(([k, n, d]) => `<button class="diff ${creator.combat === k ? 'on' : ''}" data-a="crcombat" data-v="${k}" aria-pressed="${creator.combat === k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>${creator.diff !== 'ironman' ? `<div class="cr-row cr-hc"><label>Hardcore</label><label class="hc-opt"><input type="checkbox" data-a="hardcore" ${creator.hardcore ? 'checked' : ''}> <span><b>One life.</b> Permadeath on any difficulty: when you die, your save is erased and your hero joins the Hall of the Fallen.</span></label></div>` : ''}`}
      </div></div>
      <div class="btnrow cr-go">${creator.editing ? '<button class="btn" data-a="close">Cancel</button><button class="btn default" data-a="lookdone">Done</button>' : '<button class="btn" data-a="newgame">Back</button><button class="btn default" data-a="begin">Begin Your Story</button>'}</div>`;
  };
  openModal(editing ? 'Appearance' : 'Who Are You?', '', { refresh: draw, wide: true, noClose: !editing }); draw();
}
function setLook(k, v) { const n = LOOK[k].length; creator.look[k] = ((v % n) + n) % n; refresh(); }
document.addEventListener('input', e => { if (e.target.id === 'hero-name' && creator) creator.name = e.target.value; });
// a name from the valley: an old name the farm families use, or one built from the sounds of them
const NAME_LIST = ['Corin', 'Aldric', 'Bram', 'Edwin', 'Garrett', 'Hollis', 'Jory', 'Kester', 'Leofric', 'Merrick', 'Osric', 'Perrin', 'Rowan', 'Tamsin', 'Wren', 'Ansel', 'Brannoc', 'Cuthbert', 'Dunstan', 'Elric', 'Fenwick', 'Godric', 'Hob', 'Ivo', 'Linnet', 'Maddox', 'Odo', 'Piers', 'Rook', 'Sabin', 'Tobin', 'Ulric', 'Wystan', 'Bryony', 'Elsie', 'Maud', 'Isolde', 'Hester', 'Ada', 'Briar', 'Cressida', 'Edith', 'Fenna', 'Gwen', 'Ide', 'Marigold', 'Nell', 'Rosamund', 'Sorrel', 'Thea', 'Winifred'];
const NAME_A = ['Al', 'Bran', 'Cor', 'Ed', 'Gar', 'Hal', 'Jor', 'Ken', 'Mar', 'Ned', 'Os', 'Per', 'Ro', 'Sten', 'Tam', 'Ul', 'Wil', 'Ash', 'Bry', 'Dun', 'Fen', 'Gil', 'Hew', 'Lan', 'Mor', 'Ro', 'Sev', 'Thor', 'Wen', 'El', 'Ber'];
const NAME_B = ['in', 'ric', 'an', 'wyn', 'ard', 'en', 'o', 'ley', 'mund', 'ett', 'win', 'rick', 'ald', 'ith', 'el', 'is', 'wen', 'ny', 'nor', 'stan'];
function randomName() {
  if (Math.random() < 0.5) return NAME_LIST[Math.floor(Math.random() * NAME_LIST.length)];
  let n; do { n = NAME_A[Math.floor(Math.random() * NAME_A.length)] + NAME_B[Math.floor(Math.random() * NAME_B.length)]; } while (n.length < 4 || /(.)\1\1/.test(n));
  return n;
}
document.addEventListener('click', e => {
  if (!e.target.closest('[data-rollname]') || !creator) return;
  const inp = document.getElementById('hero-name'); let n; do { n = randomName(); } while (n === creator.name);
  creator.name = n; if (inp) inp.value = n;
});
// keep the name box above the on-screen keyboard on phones and tablets
document.addEventListener('focusin', e => { if (e.target.id === 'hero-name') setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });

// ---------- the title screen: a menu over a living scene, the temple at dawn ----------
let titleView = 'main', titleSlots = [], titlePick = null, titleRAF = 0;
async function titleScreen() {
  S = null; dead = false; closeModal(true);
  let el = $('#title');
  if (!el) { el = document.createElement('div'); el.id = 'title'; document.querySelector('.game').appendChild(el); }
  el.hidden = false;
  el.innerHTML = `<canvas id="title-cv" aria-hidden="true"></canvas>
    <div class="title-ui"><div class="title-logo"><span class="title-kicker">A tale of Brambleford</span><h1>The Temple Warden</h1></div>
    <div class="title-panel" id="title-panel"></div>
    <div class="title-foot">Arrow keys or tap to move · Walk into things to interact</div></div>`;
  titleView = 'main'; titleSlots = []; drawTitleMenu();
  if (!titleRAF) titleRAF = requestAnimationFrame(titleTick);
  await initStore();
  titleSlots = await readAllSlots();
  drawTitleMenu();
}
function hideTitle() { const el = $('#title'); if (el) el.hidden = true; if (titleRAF) { cancelAnimationFrame(titleRAF); titleRAF = 0; } }
function slotCard(n, r, mode) {
  if (!r) return `<div class="slot empty"><div class="slot-n">Slot ${n}</div><p class="dim">Empty</p>${mode === 'new' ? `<button class="tbtn small" data-a="t" data-v="newin|${n}">Start here</button>` : ''}</div>`;
  const hero = heroSprite(r.equip || {}, r.look || {});
  return `<div class="slot"><div class="slot-n">Slot ${n}</div><div class="slot-body">${spriteImg(hero, 64, 'head')}<div><b>${esc(r.name || 'Unknown')}</b><small>Level ${r.level || 1} · Day ${r.day || 1}${r.diff ? ' · ' + esc((DIFFS[r.diff] || {}).name || r.diff) : ''}${r.hc ? ' · <b class="hc-tag">Hardcore</b>' : ''}</small><small>${esc(r.place || '')}</small><small class="dim">${r.at ? timeAgo(r.at) : ''}</small></div></div>
    <div class="slot-acts">${mode === 'new' ? `<button class="tbtn small danger" data-a="t" data-v="overwrite|${n}">Start over here</button>` : `<button class="tbtn small primary" data-a="t" data-v="load|${n}">Play</button><button class="tbtn small ghost" data-a="t" data-v="delete|${n}" aria-label="Delete slot ${n}">Delete</button>`}</div></div>`;
}
function drawTitleMenu() {
  const el = $('#title-panel'); if (!el) return;
  const latest = titleSlots.map((r, i) => r ? { r, n: i + 1 } : null).filter(Boolean).sort((a, b) => (b.r.at || 0) - (a.r.at || 0))[0];
  if (titleView === 'main') {
    el.innerHTML = `<nav class="title-menu">
      ${latest ? `<button class="tbtn primary" data-a="t" data-v="load|${latest.n}"><span>Continue</span><small>${esc(latest.r.name)}, level ${latest.r.level} · Day ${latest.r.day}</small></button>` : ''}
      <button class="tbtn ${latest ? '' : 'primary'}" data-a="t" data-v="view|new"><span>New Game</span></button>
      <button class="tbtn" data-a="t" data-v="view|load" ${titleSlots.some(Boolean) ? '' : 'disabled'}><span>Load Game</span></button>
      <button class="tbtn" data-a="t" data-v="help"><span>How to Play</span></button>
      <button class="tbtn ghost" data-a="t" data-v="intro"><span>Watch the Prologue</span></button></nav>`;
  } else if (titleView === 'new' || titleView === 'load') {
    el.innerHTML = `<h2>${titleView === 'new' ? 'Choose a slot for your story' : 'Load a game'}</h2><div class="slots">${[1, 2, 3].map(n => slotCard(n, titleSlots[n - 1], titleView)).join('')}</div>
      <button class="tbtn ghost back" data-a="t" data-v="view|main">← Back</button>`;
  } else if (titleView === 'confirm') {
    el.innerHTML = `<h2>${titlePick.what === 'delete' ? 'Delete' : 'Overwrite'} slot ${titlePick.n}?</h2><p class="lead">${esc(titleSlots[titlePick.n - 1]?.name || '')}'s story will be lost for good.</p>
      <div class="title-menu"><button class="tbtn danger" data-a="t" data-v="${titlePick.what === 'delete' ? 'dodelete' : 'newin'}|${titlePick.n}"><span>${titlePick.what === 'delete' ? 'Delete it' : 'Start over'}</span></button><button class="tbtn" data-a="t" data-v="view|${titlePick.what === 'delete' ? 'load' : 'new'}"><span>Keep it</span></button></div>`;
  } else if (titleView === 'prologue') {
    el.innerHTML = `<div class="prologue"><p>Your parents died in a fire when you were a baby. Father Halvard, priest of Aurel's temple in Brambleford, found you alive in the ashes and believed the dawn had spared you for a reason. He raised you in the parsonage as his acolyte, and trained you as a shrine guard.</p>
      <p>Three days ago Halvard went down into the caverns north of town and did not come back. The town council says to leave it to the militia.</p>
      <p>Below the third level, the caverns split into four kingdoms: goblins, rat folk, the pale Hollowfolk and the serpent people of Sszarith. None of them trust each other, and one of them knows what happened to Halvard.</p>
      <p class="prologue-last">You aren't waiting.</p></div>
      <div class="title-menu"><button class="tbtn primary" data-a="t" data-v="create"><span>Begin</span></button><button class="tbtn ghost" data-a="t" data-v="view|new"><span>← Back</span></button></div>`;
  }
}
async function titleAct(v) {
  const [verb, a] = v.split('|'), n = +a;
  if (verb === 'view') { titleView = a; return drawTitleMenu(); }
  if (verb === 'help') return openModal('How to play', htmlHelp());
  if (verb === 'load') return loadSlot(n);
  if (verb === 'delete' || verb === 'overwrite') { titlePick = { what: verb, n }; titleView = 'confirm'; return drawTitleMenu(); }
  if (verb === 'dodelete') { await deleteSlot(n); titleSlots = await readAllSlots(); titleView = titleSlots.some(Boolean) ? 'load' : 'main'; return drawTitleMenu(); }
  if (verb === 'newin') { saveSlot = n; titleView = 'prologue'; drawTitleMenu(); if (typeof playIntro === 'function') playIntro(() => openCreator(false)); return; }
  if (verb === 'intro') return playIntro(() => { });
  if (verb === 'create') return openCreator(false);
}
// the scene behind the menu: dawn breaking over Brambleford. Far mountains with snow catching the first light, mist
// in the valley, pine hills, the village roofs with their windows lit and smoke rising, the temple up on its hill with
// the sun coming up behind it, a path winding up to it, and your acolyte at the foot of the path with a lantern.
// Fireflies, birds and the odd shooting star; everything drifts very slightly, nearer things more.
const titleEmbers = Array.from({ length: 26 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, ph: i }));
const titleFlies = Array.from({ length: 22 }, (_, i) => ({ x: Math.random(), y: 0.72 + Math.random() * 0.25, ph: Math.random() * 99, sp: 0.5 + Math.random() }));
let titleStar = null, titleBirds = null, titleHeroC = null, titleHeroKey = '';
function titleHero() {
  const latest = titleSlots.filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const key = latest ? JSON.stringify([latest.look, latest.equip]) : '-';
  if (titleHeroC && key === titleHeroKey) return titleHeroC;
  titleHeroKey = key;
  try {
    const eq = Object.assign({}, latest && latest.equip || {}, { light: { id: 'lantern' } });
    titleHeroC = figure(heroSpec(eq, latest && latest.look || {}), 'up', 'idle0');
  } catch (e) { titleHeroC = heroSprite({ light: { id: 'lantern' } }, {}); }
  return titleHeroC;
}
function titleTick(now) {
  titleRAF = 0;
  const el = $('#title'); if (!el || el.hidden) return;
  const c = $('#title-cv'), r = el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.floor(r.width * dpr) || c.height !== Math.floor(r.height * dpr)) { c.width = Math.floor(r.width * dpr); c.height = Math.floor(r.height * dpr); }
  const g = c.getContext('2d'), W = c.width, H = c.height; g.imageSmoothingEnabled = false;
  const narrow = r.width < 760;
  const px = Math.max(3, Math.floor(Math.min(W / (narrow ? 170 : 330), H / 230))), ground = H - px * 34;
  const drift = k => Math.round(Math.sin(now / 9000) * k * px) ; // slow parallax sway, more for nearer layers
  const sunX = narrow ? W * 0.5 : W * 0.66, sunY = ground - px * 70;
  const Q = v => Math.round(v / px) * px;
  // sky, deep violet into dawn gold
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0e0a1e'); sky.addColorStop(0.38, '#2e1c44'); sky.addColorStop(0.6, '#7a3a5e'); sky.addColorStop(0.76, '#e0845a'); sky.addColorStop(0.86, '#ffc27a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const x = (i * 9973 % 1000) / 1000 * W, y = (i * 7919 % 1000) / 1000 * H * 0.45; g.globalAlpha = (0.2 + 0.6 * Math.abs(Math.sin(now / (700 + i * 13) + i))) * (1 - y / (H * 0.5)); g.fillStyle = i % 7 ? '#fff6e0' : '#cfe0ff'; const s = (i % 9 ? 1 : 2) * dpr; g.fillRect(x, y, s, s); }
  g.globalAlpha = 1;
  // now and then a shooting star
  if (!titleStar && Math.random() < 0.004) titleStar = { t0: now, x: W * (0.2 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.15) };
  if (titleStar) { const k = (now - titleStar.t0) / 900; if (k > 1) titleStar = null; else { g.strokeStyle = `rgba(255,248,220,${(1 - k).toFixed(2)})`; g.lineWidth = dpr * 1.5; g.beginPath(); const x = titleStar.x + k * W * 0.18, y = titleStar.y + k * H * 0.08; g.moveTo(x, y); g.lineTo(x - W * 0.06, y - H * 0.028); g.stroke(); } }
  // the sun, rising behind the temple, and its rays turning very slowly
  const sg = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, px * 140); sg.addColorStop(0, 'rgba(255,236,170,0.95)'); sg.addColorStop(0.12, 'rgba(255,200,120,0.55)'); sg.addColorStop(1, 'rgba(255,150,90,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(sunX, sunY); g.rotate(now / 60000);
  for (let i = 0; i < 14; i++) { g.rotate(Math.PI * 2 / 14); const a = 0.05 + 0.03 * Math.sin(now / 2000 + i * 1.7); g.fillStyle = `rgba(255,210,140,${a.toFixed(3)})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(px * 220, -px * 9); g.lineTo(px * 220, px * 9); g.fill(); }
  g.restore();
  // far mountains, their snow lit pink on the side facing the sun
  const ridge = (base, amp, f, ph) => x => base - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 2.7 + ph * 2) * amp * 0.35;
  const far = ridge(ground - px * 40, px * 36, 0.0045 / px * 3, 1.3), fx = drift(2);
  g.fillStyle = '#3a2648'; g.beginPath(); g.moveTo(0, H); for (let x = -px * 4; x <= W + px * 4; x += px) g.lineTo(x + fx, Q(far(x))); g.lineTo(W, H); g.fill();
  for (let x = 0; x <= W; x += px) { const y = Q(far(x)), y2 = Q(far(x + px)); if (y < ground - px * 62) { g.fillStyle = y2 > y ? '#f2c4c8' : '#a88aa8'; g.fillRect(x + fx, y, px, px * 2); } }
  // mist drifting along the valley
  for (let k = 0; k < 2; k++) { const y = ground - px * (40 - k * 18), mg = g.createLinearGradient(0, y - px * 10, 0, y + px * 10); mg.addColorStop(0, 'rgba(255,200,190,0)'); mg.addColorStop(0.5, `rgba(255,205,200,${0.16 - k * 0.04})`); mg.addColorStop(1, 'rgba(255,200,190,0)'); g.fillStyle = mg; g.fillRect(0, y - px * 10, W, px * 20); }
  // pine-clad hills
  const mid = ridge(ground - px * 18, px * 14, 0.007 / px * 3, 4.1), mx = drift(4);
  g.fillStyle = '#26183a'; g.beginPath(); g.moveTo(0, H); for (let x = -px * 6; x <= W + px * 6; x += px) g.lineTo(x + mx, Q(mid(x))); g.lineTo(W, H); g.fill();
  for (let i = 0; i < 46; i++) { const x = (i * 6151 % 1000) / 1000 * W, base = Q(mid(x)) + px * 2, h = px * (6 + (i * 37) % 7); if (Math.abs(x - sunX) < px * 60) continue; for (let y = 0; y < h; y += px) { const w = Math.max(px, Q((y / h) * h * 0.45)); g.fillStyle = '#1c1230'; g.fillRect(Q(x - w / 2) + mx, base - h + y, w, px); } }
  // the temple's hill, and the village roofs around its foot with their windows lit and smoke rising
  const hx = sunX, hillTop = ground - px * 12, vx = drift(6);
  g.fillStyle = '#1e1430'; g.beginPath(); g.moveTo(hx - px * 110 + vx, ground + px * 2); g.quadraticCurveTo(hx - px * 60 + vx, hillTop, hx + vx, hillTop); g.quadraticCurveTo(hx + px * 60 + vx, hillTop, hx + px * 110 + vx, ground + px * 2); g.fill();
  const flick = 0.85 + 0.15 * Math.sin(now / 130) * Math.sin(now / 57);
  const houses = narrow ? [-70, -50, 48, 68] : [-150, -118, -92, 86, 112, 140, 168];
  for (const [i, dxh] of houses.entries()) {
    const w = px * (16 + (i * 7) % 8), h = px * (10 + (i * 5) % 5), x0 = Q(hx + dxh * px - w / 2) + vx, y0 = ground - h + px * 2;
    g.fillStyle = '#160f24'; g.fillRect(x0, y0, w, h);
    for (let k = 0; k < w / 2 + px; k += px) g.fillRect(x0 + k - px, y0 - Math.min(k, w - k) * 0.6, px, Math.min(k, w - k) * 0.6 + px);
    g.fillRect(x0 + w * 0.7, y0 - px * 9, px * 2, px * 6);
    g.fillStyle = `rgba(255,190,100,${(0.8 * flick).toFixed(2)})`; g.fillRect(x0 + px * 3, y0 + px * 3, px * 2, px * 2); if (w > px * 18) g.fillRect(x0 + w - px * 6, y0 + px * 3, px * 2, px * 2);
    for (let k = 0; k < 6; k++) { const t = ((now / 2600 + k / 6 + i * 0.13) % 1); g.fillStyle = `rgba(200,180,200,${(0.22 * (1 - t)).toFixed(2)})`; const s = px * (1 + t * 3); g.fillRect(x0 + w * 0.7 + px + Math.sin(t * 5 + i) * px * 3 + t * px * 10, y0 - px * 9 - t * px * 30, s, s); }
  }
  // the temple, its windows lit
  const tw = 128 * px, tx = Math.round(hx - tw / 2) + vx, ty = hillTop - tw + px * 6;
  g.drawImage(landmarkCanvas('temple'), tx, ty, tw, tw);
  g.globalCompositeOperation = 'lighter';
  const glow = (x, y, rad, a, col = '255,180,90') => { if (!isFinite(x + y + rad) || rad <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
  glow(tx + tw * 0.5, ty + tw * 0.39, 20 * px, 0.35 * flick);
  for (const wx of [0.18, 0.36, 0.64, 0.82]) glow(tx + wx * tw, ty + tw * 0.75, 12 * px, 0.25 * flick);
  g.globalCompositeOperation = 'source-over';
  // the meadow below, and the path winding up to the temple door
  const tile = 16 * px, gx = drift(9);
  for (let x = -tile; x < W + tile; x += tile) for (let y = ground; y < H; y += tile) g.drawImage(tileVar('grass', (x / tile | 0) + 9, y / tile | 0), x + gx, y, tile, tile);
  const shade = g.createLinearGradient(0, ground, 0, H); shade.addColorStop(0, 'rgba(40,20,50,0.25)'); shade.addColorStop(1, 'rgba(10,6,16,0.6)'); g.fillStyle = shade; g.fillRect(0, ground, W, H - ground);
  g.fillStyle = '#7a5c40';
  for (let y = ground; y < H; y += px) { const k = (y - ground) / (H - ground), cx = hx + gx + Math.sin(k * 3.2) * px * (narrow ? 14 : 30) - k * px * (narrow ? 0 : 40), w = px * (4 + k * 22); g.fillRect(Q(cx - w / 2), y, Q(w), px); }
  g.fillStyle = 'rgba(30,14,30,0.35)'; for (let y = ground; y < H; y += px * 3) { const k = (y - ground) / (H - ground), cx = hx + gx + Math.sin(k * 3.2) * px * (narrow ? 14 : 30) - k * px * (narrow ? 0 : 40), w = px * (4 + k * 22); g.fillRect(Q(cx - w / 2), y, px, px); g.fillRect(Q(cx + w / 2) - px, y + px, px, px); }
  // your acolyte at the foot of the path, his back to us, lantern lit
  const hero = titleHero(), hs = px * 0.85, k0 = 0.5, hcx = hx + gx + Math.sin(k0 * 3.2) * px * (narrow ? 14 : 30) - k0 * px * (narrow ? 0 : 40), hy0 = ground + (H - ground) * k0;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(hcx, hy0, 8 * hs, 2.4 * hs, 0, 0, Math.PI * 2); g.fill();
  g.drawImage(hero, Q(hcx - 16 * hs), Q(hy0 - 46 * hs + Math.sin(now / 900) * hs * 0.3), 32 * hs, 48 * hs);
  g.globalCompositeOperation = 'lighter'; glow(hcx - 9 * hs, hy0 - 22 * hs, 34 * hs, 0.3 * flick); g.globalCompositeOperation = 'source-over';
  // birds crossing the dawn
  if (!titleBirds && Math.random() < 0.003) titleBirds = { t0: now, y: H * (0.18 + Math.random() * 0.2), n: 3 + Math.floor(Math.random() * 4) };
  if (titleBirds) {
    const k = (now - titleBirds.t0) / 14000; if (k > 1) titleBirds = null;
    else for (let i = 0; i < titleBirds.n; i++) { const x = W * (1.05 - k * 1.2) + i * px * 9, y = titleBirds.y + (i % 2) * px * 4 + i * px * 2 + Math.sin(now / 400 + i) * px, up = Math.floor(now / 140 + i) % 2; g.fillStyle = '#1a1024'; g.fillRect(x, y, px, px); g.fillRect(x - px * 2, y - (up ? px : 0), px * 2, px); g.fillRect(x + px, y - (up ? px : 0), px * 2, px); }
  }
  // framing: a great dark tree at the edge, and long grass in front, swaying
  // an old oak at the edge of the scene, half out of frame: a leaning trunk, boughs reaching in, and leaf masses
  // with ragged edges, dark against the dawn, stirring a little in the wind
  const fx2 = drift(14), tb = W - px * (narrow ? 4 : 7) + fx2;
  g.fillStyle = '#0c0814';
  for (let y = 0; y < H; y += px) { const k = y / H, w = px * (8 + (1 - k) * -2 + k * k * 10), x = tb - k * px * 6 + Math.sin(k * 5) * px * 2; g.fillRect(Q(x - w / 2), y, W, px); }
  for (const [y0, len, dir, th] of [[0.3, 30, -1, 3], [0.16, 24, -1, 2], [0.44, 16, -1, 2]]) for (let k = 0; k < len; k++) { const x = tb + dir * k * px, y = H * y0 - k * px * 0.45 + Math.sin(k / 6) * px * 2, w = Math.max(px, (th - k / len * th) * px); g.fillRect(Q(x), Q(y), px, Q(w) + px); }
  let ls = 7; const LR = () => ((ls = (ls * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const cx = tb - px * (2 + LR() * 30), cy = H * (0.0 + LR() * 0.26), rr = px * (3 + LR() * 6), sway = Math.sin(now / 2600 + i) * px * 0.7;
    for (let y = -rr; y <= rr; y += px) { const w = Math.sqrt(Math.max(0, rr * rr - y * y)); const jag = ((i * 7 + (y / px | 0) * 3) % 3) * px; g.fillRect(Q(cx - w - jag + sway), Q(cy + y), Q(w * 2 + jag), px); }
  }
  for (let x = tb - px * 34; x < W; x += px * 3) { const y = H * 0.29 + ((x / px | 0) * 7 % 5) * px + Math.sin(now / 2600 + x) * px * 0.5; g.fillRect(Q(x), Q(y), px, px * (2 + (x / px | 0) % 3)); }
  for (let i = 0; i < 80; i++) { const x = (i * 7717 % 1000) / 1000 * W, h = px * (5 + (i * 13) % 9), sway = Math.sin(now / 900 + i * 0.7) * px * 1.5; g.fillStyle = i % 3 ? '#140e1e' : '#1e1628'; for (let y = 0; y < h; y += px) g.fillRect(Q(x + sway * (y / h)) + gx, H - y - px, px, px); }
  // fireflies over the meadow, and embers rising
  for (const f of titleFlies) { const t = now / 1000 * f.sp + f.ph, x = (f.x * W + Math.sin(t * 0.7) * px * 14) % W, y = f.y * H + Math.sin(t * 1.3) * px * 6, on = (Math.sin(t * 2.2) + 1) / 2; if (on < 0.35) continue; g.globalAlpha = on; g.fillStyle = '#e8ff8a'; g.fillRect(x, y, px * 0.8, px * 0.8); g.globalCompositeOperation = 'lighter'; glow(x, y, px * 5, 0.25 * on, '200,255,120'); g.globalCompositeOperation = 'source-over'; }
  g.globalAlpha = 1;
  for (const e of titleEmbers) {
    const t = (now / 9000 * e.s + e.ph * 0.137) % 1, x = (e.x * W + Math.sin(now / 1300 + e.ph) * 20 * dpr), y = H - t * H * 0.9;
    g.globalAlpha = Math.sin(t * Math.PI) * 0.6; g.fillStyle = e.ph % 3 ? '#ffcd6b' : '#ff8a3a'; g.fillRect(x, y, Math.max(1, px * 0.6), Math.max(1, px * 0.6));
  }
  g.globalAlpha = 1;
  // a soft vignette, and shade on the side the menu sits on
  const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,3,12,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const sh = narrow ? g.createLinearGradient(0, H, 0, 0) : g.createLinearGradient(0, 0, W, 0);
  sh.addColorStop(0, 'rgba(10,6,16,0.82)'); sh.addColorStop(narrow ? 0.5 : 0.42, 'rgba(10,6,16,0.3)'); sh.addColorStop(1, 'rgba(10,6,16,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
  titleRAF = requestAnimationFrame(titleTick);
}
function htmlHelp() {
  return `
    <h3>Moving and fighting</h3>
    <p>Arrow keys, WASD or the number pad move you; hold two arrows (or use Y U B N) for diagonals. Hold Shift to run. Walk onto stairs to go up or down.</p>
    <h3>Combat</h3><p>You choose the style when you begin, and can change it in Options. <b>Classic</b>: turn by turn; walk into a foe (or press Space) to strike it. <b>Live action</b>: when something hostile is near, the world runs in real time. <b>Space</b> swings at whatever you face (hold and release for a heavy, staggering blow), <b>Z</b> dodge-rolls (you can't be hit mid-roll) and holding <b>X</b> blocks (best with a shield). A foe flashes just before it strikes. Swinging, rolling and blocking use stamina (the yellow bar), which comes back quickly when you pause. On a tablet, use the Swing, Dodge and Block buttons that appear; with a controller: A swing, B dodge, LB block, X pick up, RT shoot, RB first spell, Y inventory, Start options.</p>
    <h3>Keys</h3><p><b>1–0</b> use the hotbar (number row; the number pad still moves you) · <b>G</b> pick up · <b>R</b> rest · <b>T</b> set down a torch · <b>I</b> inventory · <b>P</b> character and skills · <b>C</b> cast a spell · <b>F</b> fire your bow · <b>V</b> pray · <b>O</b> options · <b>Q</b> the journal · <b>E</b> the Codex: bestiary, items and achievements · <b>Esc</b> close a window. On a touch screen, tap your hero to pick up.</p>
    <h3>Light</h3><p>The caves are dark. A torch lights 5 tiles and burns about 500 turns; a lantern lights 7 and refills with lamp oil. Press T to set a spare torch down and keep an area lit. Anything standing in a lit area is visible from far away. Goblins and serpent folk need light to spot you, so they notice you sooner when you carry a torch. Rat folk, the Hollowfolk and most cave creatures see in the dark. Gnarlhold and Sszarith light their halls with braziers.</p>
    <h3>Carrying</h3><p>Everything has a weight, materials included. Strength sets how much you can carry. Over your limit you're burdened: monsters get extra moves and you can't dodge. Far over it, you can't move at all. Store materials at your cottage, and have bought wood and stone delivered to your homestead.</p>
    <h3>The gods</h3><p>The gods are bound to places. As Aurel's acolyte you already have Dawn's Light. Other gods keep shrines in the Whisperwood, the caves and the four kingdoms. Each tests you with a trial, and passing it grants a gift. Press V to pray; each gift can be used once a day. The pantheon is listed under Character (P) and in the temple.</p>
    <h3>The Whisperwood</h3><p>A trail branches west off the North Road into the forest. It's daylight there, so you can see far without a torch, but trees block your view. Rabbits, pheasants and deer run from you, so a bow or spear helps. Boars leave you alone unless you get close. Wolf packs and bears hunt the deeper woods, and a great wolf called Greymaw rules the Old Growth. Hunting brings in meat, hides, pelts, antlers and feathers; feathers go into arrows.</p>
    <h3>Resting</h3><p>Press R to rest until you're healed. Something coming into view will interrupt you. Sleep at Halvard's house (free), the inn, or your own cottage to start a new day.</p>
    <h3>Weapons</h3><p>Daggers crit more often. Swords are reliable. Axes can cleave a second foe. Maces ignore some armor. Spears hit enemies two tiles away. Bows shoot arrows (F). Staves boost spells. Each comes in iron, steel, silver and mithril; silver hurts the undead.</p>
    <h3>Damage types</h3><p>Weapons slash, pierce or crush. Skeletons crumble under a mace but shrug off arrows. Slimes absorb blunt blows. Armored serpent warriors are weak to crushing. If a creature "shrugs off much of the blow", switch weapons.</p>
    <h3>Armor</h3><p>Robes add mana and spell power. Leather lets you dodge. Mail is balanced. Plate protects most but costs accuracy and makes spells fizzle. Two-handed weapons (bows, staves) can't be used with a shield.</p>
    <h3>The four kingdoms</h3><p>Cave level 3 is a junction: four stairways lead to Gnarlhold (goblins), the Gnawing Court (rat folk), the Hollows (Hollowfolk) and Sszarith (serpent people), easiest to hardest. Each has four levels and a ruler at the bottom who carries a seal. With all four seals you can open the great door to the Deep.</p>
    <h3>Town and economy</h3><p>Each shop has its own building on the high street or the market lane, marked with a hanging sign. Walk into the door, or into the shopkeeper if they're working outside, to trade. The Town Hall on the market square has the Market Board and the Land Registry. Prices rise when stock runs low and fall when a shop is flooded. Market events on the board move whole categories. The inn heals you and cures sickness for 10 gold.</p>
    <h3>The parish</h3><p>With Halvard gone, the townsfolk bring their troubles to you. Walk into anyone to talk with them. A gold marker over someone's head means they need you; a blue one means you can finish what you promised. The work is prayer (kneel at the temple altar or Halvard's sun-disc, then return the next day), counsel, healing (by spell, potion or healroot) and errands. Trust grows as you help, and people tell you more of their lives. Your ledger is under Hero › Parish (Shift+J).</p>
    <h3>Targeting</h3><p>When a foe comes into view, the nearest one is locked automatically and marked with gold brackets; its name and health show at the top of the screen. Press Tab (Shift+Tab to go back) or click a monster to choose a different target. F, the Shoot button, or clicking your locked target again fires your bow at it. Targeted spells strike your locked target too.</p>
    <h3>Sneaking</h3><p>Press Shift+S (or M, or the Sneak button) to sneak. While sneaking you move a little slower, but creatures have to be much closer to notice you, especially if you carry no torch. Striking a foe that hasn't noticed you is a sneak attack: double damage, triple with a dagger. Invisibility hides you completely from creatures that hunt by sight.</p>
    <h3>Spells</h3><p>Twenty spells in five schools: Evocation, Restoration, Illusion, Abjuration and Divination. The Arcanum sells most spellbooks; the mightiest turn up deep in the caves. Star spells in Spells & Prayers to put them on your hotbar.</p>
    <h3>Crafting and building</h3><p>Hero › Crafting lists every recipe, every material you own (carried and stored), and your homestead projects. Each building can be upgraded once: Farmhouse, Greenhouse, Smithy, Laboratory, Sanctum and Deep Shaft.</p>
    <h3>Difficulty</h3><p>Story is forgiving: if you fall, you wake in the temple a little poorer. Adventurer is the standard game. Veteran makes foes tougher. Ironman is Veteran with one life.</p>
    <h3>Skills</h3><p>Eight skill trees: Arms, Wilds, Arcana, Faith, Smithing, Alchemy, Enchanting and Trade. Many skills have several ranks. Each tree has four tiers; a tier opens after you spend 2 points per tier in that tree. Some top-tier skills make you choose one of two. You earn a skill point every level and for each god's blessing, and the temple can reset your skills for an offering.</p>
    <h3>Homestead and crafting</h3><p>Buy the East Field at the Land Registry. Fell trees, break rocks, pick herbs and build a cottage, garden, mine, forge, alchemy bench and enchanting altar. Spend skill points in Smithing, Alchemy and Enchanting to make your own gear.</p>
    <h3>Saving</h3><p>The game saves when you return to town, sleep or build. Use Save any time. Options (O) sets how the caves get mapped.</p>`;
}

// ================= boot =================
// Classic menu bar: click a title to open it; while one is open, hovering another switches to it.
function closeMenus() { document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open')); }
function initMenus() {
  document.querySelectorAll('.mtitle').forEach(b => {
    b.addEventListener('click', e => { const m = b.parentElement, was = m.classList.contains('open'); closeMenus(); if (!was) m.classList.add('open'); e.stopPropagation(); });
    b.addEventListener('mouseenter', () => { if (document.querySelector('.menu.open') && !b.parentElement.classList.contains('open')) { closeMenus(); b.parentElement.classList.add('open'); } });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.mtitle')) closeMenus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); }, true);
}
function start(data) {
  initMenus();
  const TB_ICON = { backpack: () => itemCanvas('backpack'), hero: () => [npcCanvas('hero'), 'head'], book: () => itemCanvas('bmissile'), get: () => propCanvas('coins'), rest: () => propCanvas('cottage'), torch: () => itemCanvas('torch'), bow: () => itemCanvas('bow_iron'), scroll: () => itemCanvas('srecall'), sneak: () => itemCanvas('dagger_iron') };
  document.querySelectorAll('[data-icon]').forEach(el => { const v = TB_ICON[el.dataset.icon](); el.innerHTML = Array.isArray(v) ? spriteImg(v[0], 26, v[1]) : spriteImg(v, 26); });
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe($('#mapwrap'));
  if (data && data.state && data.state.v === SAVE_VERSION) {
    S = data.state; dead = !!data.dead; saveSlot = data.slot || 1;
    initStore(); computeFov(); render(); renderLog();
  } else titleScreen();
}
setInterval(() => { const t = $('#title'); if (reduceMotion && S && !dead && !anyMoving && !floatRAF && document.visibilityState === 'visible' && (!t || t.hidden)) renderMap(); }, 400);
window.claude?.hot?.snapshot?.(() => ({ state: S, dead, slot: saveSlot }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
