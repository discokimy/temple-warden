// The temple's restoration: works you pay for at the alms box (a mended roof, candles, the bell, the grate's
// lock struck off), acolytes who keep the place and fill the coffer, and the catacombs under the grate:
// three levels of the old dead, and the bishop who never quite left.
// State: S.tw = { up: {id: day}, acolytes: [names], coffer, gifts: [itemIds], lastDay }.

const tw = () => S.tw || (S.tw = { up: {}, acolytes: [], coffer: 0, gifts: [], lastDay: S.day });
const TEMPLE_WORKS = [
  { id: 'roof', name: 'Mend the roof', cost: 80, mats: { wood: 10, stone: 5 }, desc: 'Slates replaced, the rot cut out of the rafters. No more buckets in the nave.', effect: 'Sitting in a pew restores twice the mana. +1 parish standing.' },
  { id: 'candles', name: 'Beeswax and incense', cost: 40, mats: {}, desc: 'Proper candles on every stand, and incense for the dawn office.', effect: 'Sitting in a pew also heals a quarter of your health, once a day. The nave is brighter.' },
  { id: 'bell', name: 'Rehang the bell', cost: 120, mats: { iron: 4 }, desc: 'The bell has hung silent since its headstock cracked. Bran can forge a new one.', effect: 'The bell rings each morning, and more people come: +3 gold a day in the coffer.' },
  { id: 'grate', name: 'Strike off the grate’s lock', cost: 25, mats: { iron: 2 }, desc: 'Bran says he can cut the old padlock off the grate in the offering chamber and fit a new one you hold the key to.', effect: 'Opens the way down into the catacombs.', need: () => S.story.grateSeen },
];
const ACOLYTE_NAMES = ['Wynn', 'Elsa', 'Tobiah', 'Mairi', 'Corwen', 'Ilse'];
const ACOLYTE_WAGE = 2;
const worksDone = id => !!tw().up[id];
const matHave = id => (P().mats[id] || 0) + ((S.home && S.home.mats && S.home.mats[id]) || 0);
function payMats(mats) {
  for (const [id, n] of Object.entries(mats)) { let left = n; const take = Math.min(left, P().mats[id] || 0); P().mats[id] -= take; left -= take; if (left && S.home && S.home.mats) S.home.mats[id] -= left; }
}
function canAffordWork(w) { return P().gold >= w.cost && Object.entries(w.mats).every(([id, n]) => matHave(id) >= n); }

// ---------- the coffer: what the temple earns while you're away ----------
function templeDay() {
  const T = tw(); if (T.lastDay == null) T.lastDay = S.day;
  while (T.lastDay < S.day) {
    T.lastDay++;
    let standing = 0; try { standing = Math.max(0, (S.parish && S.parish.standing) || 0); } catch (e) { }
    const income = 1 + (worksDone('bell') ? 3 : 0) + T.acolytes.length * 3 + Math.min(4, standing);
    T.coffer = Math.max(0, T.coffer + income - T.acolytes.length * ACOLYTE_WAGE);
    for (const a of T.acolytes) if (Math.random() < 0.35) T.gifts.push(pick(['pheal', 'pheal', 'pantidote', 'mat:healroot', 'mat:redcap']));
    if (T.gifts.length > 8) T.gifts.length = 8;
    if (worksDone('bell') && S.mapId === 'town') { msg('Across the rooftops, the temple bell rings for the dawn office.', 'talk'); if (typeof sfx === 'function') sfx('bell'); }
  }
}
setInterval(() => { try { if (S && !dead) templeDay(); } catch (e) { } }, 2000);

// ---------- the Temple Works window, at the alms box ----------
function openWorks() {
  templeDay();
  const draw = () => {
    const T = tw(), p = P();
    const works = TEMPLE_WORKS.filter(w => !w.need || w.need() || worksDone(w.id)).map(w => {
      const done = worksDone(w.id), ok = canAffordWork(w);
      const mats = Object.entries(w.mats).map(([id, n]) => `${MATS[id].name} ${Math.min(matHave(id), n)}/${n}`).join(' · ');
      return `<div class="row"><div class="nm"><b>${w.name}${done ? ' <span class="pill">Done</span>' : ''}</b><small>${w.desc}</small><small><i>${w.effect}</i></small>${done ? '' : `<small>${w.cost} gold${mats ? ' · ' + mats : ''}</small>`}</div><div class="acts">${done ? '' : `<button class="btn tiny ${ok ? 'default' : ''}" data-tw="work:${w.id}" ${ok ? '' : 'disabled'}>Pay for it</button>`}</div></div>`;
    }).join('');
    const canHire = worksDone('roof') && worksDone('candles'), free = ACOLYTE_NAMES.filter(n => !T.acolytes.includes(n));
    const acol = T.acolytes.map(n => `<div class="row"><div class="nm"><b>Acolyte ${n}</b><small>Sweeps, mends, keeps the dawn office, and sees to the townsfolk who come in. ${ACOLYTE_WAGE} gold a day from the coffer.</small></div><div class="acts"><button class="btn tiny ghost" data-tw="dismiss:${n}">Let go</button></div></div>`).join('');
    const gifts = T.gifts.length ? `<p class="dim">Left in the vestry by the acolytes and the faithful: ${T.gifts.map(g => g.startsWith('mat:') ? MATS[g.slice(4)].name : ITEMS[g].name).join(', ')}.</p>` : '';
    $('#modal-body').innerHTML = `<p class="lead">The alms box, and Halvard’s ledger beside it. The temple keeps a coffer of what the faithful give; the acolytes take their wage from it.</p>
      <div class="tw-coffer"><b>${T.coffer}</b> gold in the coffer <button class="btn tiny default" data-tw="take" ${T.coffer || T.gifts.length ? '' : 'disabled'}>Take it${T.gifts.length ? ' and the gifts' : ''}</button> <button class="btn tiny" data-tw="alms" ${p.gold >= 10 ? '' : 'disabled'}>Give 10 gold to the poor</button></div>${gifts}
      <h3>Restoration</h3><div class="list">${works}</div>
      <h3>Acolytes <span class="dim">${T.acolytes.length} of 2</span></h3>
      ${canHire ? `<div class="list">${acol}</div>${T.acolytes.length < 2 && free.length ? `<div class="btnrow"><button class="btn" data-tw="hire" ${p.gold >= 20 ? '' : 'disabled'}>Take on an acolyte (20 gold for robes and board)</button></div>` : ''}` : '<p class="dim">No one will come to serve in a temple with a leaking roof and no candles. Mend the roof and buy candles first.</p>'}`;
  };
  openModal('Temple Works', '', { refresh: draw, wide: true }); draw();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tw]'); if (!b || !S) return;
  const [k, v] = b.dataset.tw.split(':'), T = tw(), p = P();
  if (k === 'work') {
    const w = TEMPLE_WORKS.find(w => w.id === v); if (!w || worksDone(v) || !canAffordWork(w)) return;
    p.gold -= w.cost; payMats(w.mats); T.up[v] = S.day;
    if (v === 'roof' && S.parish) S.parish.standing = (S.parish.standing || 0) + 1;
    if (v === 'grate') { S.maps.temple.links[K(20, 8)] = 'cat1'; }
    if (v === 'candles') templeLights(S.maps.temple);
    msg(`${w.name}: done. ${w.effect}`, 'level'); if (typeof sfx === 'function') sfx('coins');
    templeStaff(S.maps.temple); autosave();
  } else if (k === 'hire') {
    if (p.gold < 20 || T.acolytes.length >= 2) return;
    const n = ACOLYTE_NAMES.find(n => !T.acolytes.includes(n)); p.gold -= 20; T.acolytes.push(n);
    msg(`${n}, a young ${pick(['weaver’s son', 'farmer’s daughter', 'orphan from the inn', 'miller’s youngest'])} from the parish, takes the grey robe and joins you at the temple.`, 'level'); templeStaff(S.maps.temple);
  } else if (k === 'dismiss') { T.acolytes = T.acolytes.filter(n => n !== v); msg(`You thank ${v} and send them home with a blessing.`, 'talk'); templeStaff(S.maps.temple); }
  else if (k === 'take') {
    const g = T.coffer; p.gold += g; T.coffer = 0;
    for (const it of T.gifts) { if (it.startsWith('mat:')) addMat(it.slice(4), 1); else addItem(makeItem(it)); }
    msg(`You take ${g} gold from the coffer${T.gifts.length ? `, and ${T.gifts.length} gift${T.gifts.length > 1 ? 's' : ''} from the vestry` : ''}.`, 'gold'); T.gifts = [];
  } else if (k === 'alms') { if (p.gold < 10) return; p.gold -= 10; useSkill('faith', 2); if (S.parish && Math.random() < 0.25) S.parish.standing = (S.parish.standing || 0) + 1; msg('You drop ten gold into the alms box for the poor of the parish.', 'good'); }
  refresh();
});

// the acolytes stand in the nave; more candles once they're bought
function templeStaff(m) {
  if (!m) return;
  m.npcs = (m.npcs || []).filter(n => !n.acolyte);
  const spots = [[4, 14], [14, 14]];
  tw().acolytes.forEach((name, i) => m.npcs.push({ spr: i ? 'villager2' : 'priest', x: spots[i][0], y: spots[i][1], name: 'Acolyte ' + name, acolyte: 1, fixed: true,
    lines: [`Good morning, ${P().name}. The dawn office is said, the floor is swept.`, 'Three people came in to light candles today. One left eggs.', 'I found a pigeon in the bell loft. I let it out. I think.', 'Do you think Father Halvard will come back?', 'The cold from that grate gives me shivers.'] }));
}
function templeLights(m) {
  if (!m || !worksDone('candles') || m.moreLight) return;
  m.moreLight = 1; m.lights.push([4, 8, 5, 'candle'], [14, 8, 5, 'candle'], [9, 16, 4, 'candle']);
}
{
  const _et = enterTemple;
  enterTemple = function () { const r = _et.apply(this, arguments); try { templeStaff(S.maps.temple); templeLights(S.maps.temple); if (worksDone('grate')) S.maps.temple.links[K(20, 8)] = 'cat1'; } catch (e) { } return r; };
}
{
  const _tt = templeThing;
  templeThing = function (tr) {
    const p = P();
    if (tr.t === 'alms') { openWorks(); return true; }
    if (tr.t === 'grate') {
      S.story.grateSeen = 1;
      if (worksDone('grate')) { msg('You unlock the grate and lift it. Narrow stone steps go down into the cold.', 'talk'); travel('cat1'); return true; }
      msg('An iron grate in the floor, locked with a heavy padlock. Cold air rises through it, smelling of earth and old stone. Bran could cut that lock off; see the Temple Works at the alms box.', 'talk');
      return true;
    }
    if (tr.t === 'pew' && S.story.pewDay !== S.day) {
      const r = _tt(tr);
      if (worksDone('roof')) p.mp = Math.min(maxMp(), p.mp + 3);
      if (worksDone('candles')) { const h = Math.round(maxHp() / 4); p.hp = Math.min(maxHp(), p.hp + h); addFloat(p.x, p.y, '+' + h, '#8fd16a'); }
      return r;
    }
    return _tt(tr);
  };
}

// ---------- the catacombs ----------
Object.assign(MONSTERS, {
  c_bones:  { name: 'crypt skeleton', home: 'crypt', darksight: 1, lv: [1, 3], hp: 18, atk: 5, def: 4, dmg: [2, 7], xp: 22, verb: ['slashes', 'hacks at'], undead: 1, res: { pierce: 0.5, blunt: 1.5 }, drop: [['bone', 0.7]] },
  c_ghoul:  { name: 'ghoul', home: 'crypt', darksight: 1, lv: [1, 3], hp: 24, atk: 6, def: 3, dmg: [3, 7], xp: 28, verb: ['claws', 'bites'], undead: 1, sick: 1, fast: 1, res: { pierce: 0.75 }, drop: [['bone', 0.5]] },
  c_shade:  { name: 'grave shade', home: 'crypt', darksight: 1, lv: [2, 3], hp: 16, atk: 7, def: 5, dmg: [2, 6], xp: 32, verb: ['chills', 'touches'], undead: 1, invisible: 1, ranged: { r: 5, dmg: [3, 7], verb: 'breathes grave-cold at', magic: 1 }, res: { slash: 0.5, pierce: 0.5, blunt: 0.5 }, drop: [['shard', 0.25]] },
  c_wight:  { name: 'barrow wight', home: 'crypt', darksight: 1, lv: [2, 3], hp: 36, atk: 8, def: 6, dmg: [4, 9], xp: 42, verb: ['strikes', 'grips'], undead: 1, gold: 20, res: { slash: 0.75 }, drop: [['silver', 0.3], ['bone', 0.5]] },
  c_bishop: { name: 'the Hollow Bishop', home: 'crypt', darksight: 1, boss: 1, hp: 120, atk: 9, def: 6, dmg: [5, 11], xp: 420, verb: ['strikes', 'curses'], undead: 1, heals: 1, summon: 'c_bones', ranged: { r: 6, dmg: [5, 10], verb: 'speaks a dead word at', magic: 1 }, gold: 250, drop: [['soulgem', 1]] },
});
for (const id of ['c_bones', 'c_ghoul', 'c_shade', 'c_wight', 'c_bishop']) MONSTERS[id].id = id;
if (typeof BEASTS !== 'undefined') BEASTS.add('c_ghoul');
if (typeof MON_FIG !== 'undefined') Object.assign(MON_FIG, {
  c_bones:  { race: 'skeleton', build: 'slim', skin: 'd8d0b8', shirt: '6a5a4a', sleeve: 'd8d0b8', pants: 'd8d0b8', boots: 'c8c0aa', held: 'sword', eyes: '2a2226' },
  c_ghoul:  { race: 'hollow', build: 'slim', hunch: 1, skin: '8a9a78', eyes: 'e3c43a', shirt: '4a4038', pants: '4a4038', boots: '3a3028', jaw: 'soft' },
  c_shade:  { race: 'hollow', build: 'slim', hunch: 0, skin: 'a8b4d0', eyes: 'c8f0ff', torso: 'robe', shirt: '2e2a44', pants: '2e2a44', boots: '2e2a44', jaw: 'soft' },
  c_wight:  { race: 'skeleton', build: 'adult', skin: 'c8c0aa', shirt: '4a4f5a', sleeve: '4a4f5a', pants: '3a3e48', boots: '2a2e38', held: 'sword', eyes: '7fd0f5' },
  c_bishop: { race: 'skeleton', build: 'adult', skin: 'e0d8c4', torso: 'robe', shirt: 'd8ccb0', pants: 'd8ccb0', boots: 'a89870', hat: 'crown', hatColor: 'c9a227', held: 'staff', staffGem: 'ffd27a', eyes: 'ffd27a' },
});
ITEMS.edda_relic = { id: 'edda_relic', name: 'Reliquary of Saint Edda', spr: 'amulet', pal: { b: 'e3b93c', c: 'fff0a0' }, cat: 'jewelry', slot: 'amulet', def: 1, int: 1, nopoison: 1, val: 700, tier: 99, wt: 0.3, note: 'The first priest of Brambleford. The restless dead shy from it' };
const CRYPT_TOMBS = [
  'EDRIC MILLWARD, SEXTON. HE RANG THE BELL FIFTY YEARS AND NEVER ONCE WAS LATE.',
  'HERE LIE THE BROTHERS AND SISTERS OF THE DAWN WHO DIED IN THE WINTER OF THE COUGHING SICKNESS. THE LIGHT KEEP THEM.',
  'MAUD OF THE FORD. SHE FED THE TOWN THROUGH THE HUNGRY YEAR.',
  'A small tomb, no name, only a carved sun and a child’s wooden horse left on the lid, its paint long gone.',
  'BISHOP AUDRIC, WHO WOULD NOT LIE DOWN. The inscription has been scratched at, as if someone tried to cut the name away.',
  'OSWIN, PRIEST. HE WENT DOWN INTO THE MOUNTAIN AND CAME BACK. HE WOULD NOT SAY WHAT HE SAW.',
  'Names, dozens of them, cut in rows. The oldest are in a script you cannot read.',
];
{
  const _mi = mapInfo;
  mapInfo = function (id) {
    if (typeof id === 'string' && /^cat\d$/.test(id)) { const n = +id.slice(3); return { kind: 'crypt', lvl: n, eff: 2 + n * 2, name: `The Catacombs, level ${n}`, parent: n === 1 ? 'temple' : 'cat' + (n - 1), child: n < 3 ? 'cat' + (n + 1) : null, theme: 'cave' }; }
    return _mi.apply(this, arguments);
  };
  const _gl = genLevel;
  genLevel = function (id) {
    const m = _gl.apply(this, arguments);
    if (!/^cat\d$/.test(id)) return m;
    const info = mapInfo(id), rooms = m.rooms || [];
    m.crypt = 1;
    // stairs down at the far end (the generator only adds them for the upper caves)
    if (info.child && !Object.values(m.links).includes(info.child)) { const r = rooms[rooms.length - 1]; if (r) { const x = r.x + (r.w >> 1), y = r.y + (r.h >> 1); setTile(m, x, y, '>'); m.links[K(x, y)] = info.child; } }
    // tombs along the room walls, each with its inscription
    let ti = (info.lvl - 1) * 2;
    for (const r of rooms.slice(1)) {
      for (let x = r.x + 1; x < r.x + r.w - 1; x += 2) {
        const y = r.y; if (tileAt(m, x, y) !== '.' || m.decor[K(x, y)] || m.links[K(x, y)] || Math.random() < 0.4) continue;
        m.decor[K(x, y)] = pick(['grave', 'gravecross', 'gravemoss']);
        if (Math.random() < 0.45) m.trig[K(x, y)] = { dlg: 'locked', text: CRYPT_TOMBS[ti++ % CRYPT_TOMBS.length] };
      }
    }
    if (id === 'cat3') {
      const r = rooms[rooms.length - 1];
      if (r && !(S.bosses || {}).c_bishop) m.mons.push(makeMonster('c_bishop', r.x + (r.w >> 1), r.y + (r.h >> 1)));
      if (r && !S.story.eddaRelic) m.ground.push({ x: r.x + 1, y: r.y + 1, item: makeItem('edda_relic') });
    }
    return m;
  };
}
{
  // climbing out of the catacombs comes up through the grate
  const _tr = travel;
  travel = function (to) {
    if (to === 'temple' && /^cat/.test(S.mapId)) { msg('You climb the narrow steps and come up through the grate into the warm air of the temple.'); P().lastDungeon = S.mapId; goMap('temple', 20, 9); autosave(); return; }
    return _tr.apply(this, arguments);
  };
}
{
  const _km = killMonster;
  killMonster = function (mon) {
    const was = mon && mon.id === 'c_bishop' && curMap().mons.includes(mon);
    const r = _km.apply(this, arguments);
    if (was) { S.bosses = S.bosses || {}; S.bosses.c_bishop = 1; msg('The Hollow Bishop comes apart like a dropped bundle of sticks. The cold goes out of the air. Somewhere far above, faintly, the temple bell sounds once on its own.', 'level'); }
    return r;
  };
}
// the bestiary, the journal and the achievements learn about the catacombs
try { CX_REGION.crypt = 'The Catacombs'; CX_REGION_ORDER.splice(CX_REGION_ORDER.indexOf('deep'), 0, 'crypt'); } catch (e) { }
try {
  Object.assign(CX_LORE, {
    c_bones: 'The temple’s own dead, laid in their niches with rites and risen anyway. Something below keeps calling them.',
    c_ghoul: 'It was a person once. Now it eats what the catacombs give it, and the catacombs give little.',
    c_shade: 'A cold patch of dark that moves. Blades pass through it as through smoke; only a sure stroke bites.',
    c_wight: 'An armoured knight of the old parish, buried with his sword. He still guards the bishop’s door.',
    c_bishop: 'Bishop Audric would not lie down. He sits on a throne of other men’s bones, and the cold comes out of him.',
  });
  ACHIEVEMENTS.push(['crypt', 'Beneath the Floor', 'Go down into the catacombs under the temple.', () => !!S.maps.cat1, 'explore']);
  ACHIEVEMENTS.push(['bishop', 'Rest, Audric', 'Lay the Hollow Bishop to rest.', () => !!(S.bosses || {}).c_bishop, 'fight']);
  ACHIEVEMENTS.push(['restored', 'The Temple Restored', 'Pay for every work of restoration.', () => TEMPLE_WORKS.every(w => worksDone(w.id)), 'life']);
} catch (e) { }
{
  const _jq = jQuests;
  jQuests = function () {
    const out = _jq.apply(this, arguments);
    try {
      if (S.story.grateSeen && !worksDone('grate')) out.push({ id: 'crypt0', group: 'The temple', title: 'Open the grate in the offering chamber', desc: 'Cold air rises through a locked grate in the temple floor. Pay for Bran to strike off the lock: Temple Works, at the alms box.', target: { map: 'temple', x: 17, y: 12 }, kicker: 'The cold beneath the floor' });
      else if (worksDone('grate') && !(S.bosses || {}).c_bishop) out.push({ id: 'crypt1', group: 'The temple', title: 'Find what stirs in the catacombs', desc: 'Three levels of the old dead lie under the temple. At the bottom, something will not lie down.', target: { map: 'cat3', x: 0, y: 0, far: 1 }, kicker: 'The cold beneath the floor' });
      const next = TEMPLE_WORKS.find(w => !worksDone(w.id) && w.id !== 'grate');
      if (S.story.templeIn && next) out.push({ id: 'works', group: 'The temple', title: 'Restore the temple', desc: `Next: ${next.name} (${next.cost} gold${Object.keys(next.mats).length ? ', ' + Object.entries(next.mats).map(([id, n]) => n + ' ' + MATS[id].name.toLowerCase()).join(', ') : ''}). Pay at the alms box.`, target: { map: 'temple', x: 17, y: 12 }, kicker: `Temple works ${TEMPLE_WORKS.filter(w => worksDone(w.id)).length} of ${TEMPLE_WORKS.length}` });
    } catch (e) { }
    return out;
  };
}
