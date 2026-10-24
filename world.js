// The world answers back.
//   Town: a statue of you in the square once the Wyrm is dealt with; Halvard's grave in the temple yard; the Watch
//   walking patrols once you've joined; traders from the kingdoms you've made peace with setting up in the market;
//   and people mentioning what you've done when you talk to them.
//   Wilds and caves: levels you've cleared fill up again after a couple of days, sometimes with a champion, a
//   named, tougher creature carrying real loot. Champions are posted as bounties on the Market Board.

// ---------------- the town ----------------
NATIVE_PROPS.herostatue = () => {
  const p = P(), f = heroSprite(p.equip || {}, p.look || {}), W = 48, H = 84, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  // a stepped stone plinth
  g.fillStyle = '#6f695f'; g.fillRect(4, 66, 40, 16); g.fillStyle = '#9a9386'; g.fillRect(6, 64, 36, 4); g.fillStyle = '#8a8376'; g.fillRect(10, 54, 28, 12); g.fillStyle = '#b3ac9e'; g.fillRect(10, 54, 28, 2);
  g.fillStyle = '#5a554c'; for (let x = 12; x < 36; x += 6) g.fillRect(x, 59, 3, 1);
  // the hero, in pale stone
  const t = document.createElement('canvas'); t.width = f.width; t.height = f.height; const tg = t.getContext('2d'); tg.drawImage(f, 0, 0);
  const img = tg.getImageData(0, 0, t.width, t.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2], v = 90 + l * 0.6; d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * 0.9; }
  tg.putImageData(img, 0, 0);
  g.drawImage(t, 0, 0, t.width, t.height, (W - t.width * 1.3) / 2, 56 - t.height * 1.3, t.width * 1.3, t.height * 1.3);
  return c;
};
NATIVE_PROPS.halvardgrave = () => nativeProp(30, 40, ({ F, P, E }) => {
  E(15, 36, 13, 3, '#3f6a2a'); F(7, 8, 16, 28, '#8a8376'); E(15, 9, 8, 6, '#8a8376'); F(9, 10, 3, 24, '#a49d90'); F(20, 10, 2, 24, '#6f695f');
  E(15, 15, 4, 4, '#e3b93c'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P(15 + Math.round(Math.cos(a) * 6), 15 + Math.round(Math.sin(a) * 6), '#e3b93c'); }
  F(10, 24, 10, 1, '#5a554c'); F(10, 27, 10, 1, '#5a554c'); F(11, 30, 8, 1, '#5a554c');
  for (const [x, c] of [[6, '#d6336c'], [24, '#f2c94c'], [9, '#f4f0e6']]) { F(x, 33, 1, 3, '#3f7a2a'); F(x - 1, 32, 3, 2, c); }
});
Object.assign(DECOR_BLOCK, { herostatue: 1, halvardgrave: 1 });
function townMilestones() {
  const t = S.maps && S.maps.town; if (!t) return;
  const free = (x, y) => walkable(t, x, y) && !t.decor[K(x, y)] && !t.trig[K(x, y)] && !t.npcs.some(n => n.x === x && n.y === y);
  // the statue, beside the fountain
  if (S.story && S.story.ending && !t.statue) {
    const f = t.fountain || [36, 26];
    for (const [dx, dy] of [[0, -3], [3, -2], [-3, -2], [4, 0], [-4, 0]]) { const x = f[0] + dx, y = f[1] + dy; if (free(x, y)) { t.decor[K(x, y)] = 'herostatue'; t.trig[K(x, y)] = { dlg: 'locked', text: `A statue of ${P().name}, in pale stone. On the plinth: ${S.story.ending === 'bound' ? '“THE DOOR IS SHUT. THE KEEPER’S CHILD.”' : '“WYRMSLAYER. THE FIRE WOULD NOT TAKE HIM.”'} Someone has left flowers.` }; t.statue = [x, y]; delete NATIVE_PROP_CACHE.herostatue; break; } }
  }
  // Halvard comes home after the ending
  const tm = S.maps.temple;
  if (tm && S.story && S.story.ending && !tm.grave) { for (const [x, y] of [[3, 2], [14, 2], [2, 3]]) if (walkable(tm, x, y) && !tm.decor[K(x, y)]) { tm.decor[K(x, y)] = 'halvardgrave'; tm.trig[K(x, y)] = { dlg: 'locked', text: 'FATHER HALVARD, PRIEST OF AUREL. “Forgive me, I was right.” Fresh flowers, every morning. You never see who leaves them.' }; tm.grave = 1; break; } }
  // the Watch on patrol
  const wr = S.guild && S.guild.watch ? S.guild.watch.rank : -1;
  const pats = t.npcs.filter(n => n.patrol).length, want = wr >= 0 ? (wr >= 2 ? 3 : 1) : 0;
  for (let i = pats; i < want; i++) { for (let k = 0; k < 60; k++) { const x = 20 + Math.floor(Math.random() * 50), y = 15 + Math.floor(Math.random() * 25); if (free(x, y) && ':;'.includes(tileAt(t, x, y))) { t.npcs.push({ spr: 'guard', patrol: 1, x, y, name: 'a watchman', lines: wr >= 3 ? ['“Captain.” A sharp nod.', '“All quiet, Captain.”'] : ['“Morning. Quiet one so far.”', '“Hale says you’re one of us now.”', '“Keep your eyes open on the North Road.”'] }); break; } } }
  // the allied kingdoms send traders
  const allied = S.pol ? Object.keys(S.pol.treaty || {}).concat(KINGDOM_ORDER.filter(k => (S.pol.rep || {})[k] >= 4)) : [];
  for (const k of [...new Set(allied)]) {
    if (t.npcs.some(n => n.ktrader === k)) continue;
    for (let tries = 0; tries < 80; tries++) { const x = 28 + Math.floor(Math.random() * 18), y = 20 + Math.floor(Math.random() * 10); if (free(x, y) && tileAt(t, x, y) === ':') { t.npcs.push({ ktrader: k, fixed: true, x, y, spr: 'k_' + k, name: { g: 'a goblin trader', r: 'a ratkin pedlar', h: 'a Hollowfolk merchant', s: 'a serpent factor' }[k], lines: [] }); break; } }
  }
}
if (typeof FIG_SPECS !== 'undefined' && typeof MON_FIG !== 'undefined') Object.assign(FIG_SPECS, { k_g: MON_FIG.g_shaman, k_r: MON_FIG.r_skulker, k_h: MON_FIG.h_seer, k_s: MON_FIG.s_priest });
setInterval(() => { try { if (S) townMilestones(); } catch (e) { } }, 2500);
// a kingdom trader in the square
{
  const _act = act;
  act = function (dx, dy) {
    try {
      if (S && !modalOpen && !dead && (dx || dy)) {
        const m = curMap(), p = P(), n = m.npcs.find(o => o.x === p.x + dx && o.y === p.y + dy && o.ktrader);
        if (n) { setFacing(p, dx, dy); return openTownTrader(n.ktrader); }
      }
    } catch (e) { console.error(e); }
    return _act.apply(this, arguments);
  };
}
function openTownTrader(k) {
  const p = P();
  const draw = () => {
    $('#modal-body').innerHTML = `<div class="keeper"><span class="gl big">${spriteImg(npcCanvas('k_' + k), 56)}</span><p class="lead">${{ g: '“Brambleford! Loud town. Good beer. Gnarlhold sells you things now, friend-of-the-king.”', r: '“The Court remembers its friends. The Court sends shiny things. Buy, buy.”', h: 'The merchant signs slowly, cold fingers in your palm: “The Matriarch sends her regards, and her goods.”', s: '“Sszarith honours its treaties. Our wares, at the treaty price.”' }[k]}</p></div>
      <div class="list">${KTRADE[k].map(([id, price], i) => { const mat = id.startsWith('mat:'), nm = mat ? MATS[id.slice(4)].name : ITEMS[id].name, pr = Math.round(price * 0.8); return `<div class="row"><span class="gl">${mat ? matIcon(id.slice(4)) : icon(id)}</span><div class="nm"><b>${nm}</b><small>${pr} gold</small></div><div class="acts"><button class="btn tiny" data-kt="${k}:${i}" ${p.gold >= pr ? '' : 'disabled'}>Buy</button></div></div>`; }).join('')}</div>`;
  };
  openModal({ g: 'Gnarlhold trader', r: 'Gnawing Court pedlar', h: 'Hollowfolk merchant', s: 'Sszarith factor' }[k], '', { refresh: draw, wide: true }); draw();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-kt]'); if (!b || !S) return; const [k, i] = b.dataset.kt.split(':'), [id, price] = KTRADE[k][+i], pr = Math.round(price * 0.8), p = P();
  if (p.gold < pr) return; p.gold -= pr; if (id.startsWith('mat:')) addMat(id.slice(4), 1); else addItem(makeItem(id)); msg(`You buy ${id.startsWith('mat:') ? MATS[id.slice(4)].name : ITEMS[id].name} for ${pr} gold.`, 'gold'); refresh();
});
// people notice what you've done
const REACTIONS = [
  [() => S.story && S.story.ending === 'bound', ['“You shut the door. My grandmother always said someone would.”', '“The Keeper’s child. In my own street. Wait till I tell my sister.”']],
  [() => S.story && S.story.ending === 'slain', ['“Wyrmslayer! Sit, sit. The next one’s on me.”', '“They say the springs ran warm a week after you killed it.”']],
  [() => S.story && S.story.voss === 'arrested', ['“Voss, of all people. I never liked his gloves.”', '“Berta stood up in the council hall. Did you see her face?”']],
  [() => S.bosses && S.bosses.c_bishop, ['“The cold’s gone out of the temple floor. You did that, didn’t you?”']],
  [() => S.guild && S.guild.watch && S.guild.watch.rank >= 3, ['“Morning, Captain.”', '“Captain! The road’s been quiet since you took over.”']],
  [() => P().equip && P().equip.helm && T(P().equip.helm).mask, ['“Is that… is that you under there?”', '“Take that mask off, you’re scaring the hens.”']],
  [() => S.comp && S.comp.id === 'shep', ['“Shep! Who’s a good dog? You are. Not you, the dog.”']],
  [() => S.tw && S.tw.up && S.tw.up.bell, ['“I heard the bell this morning. First time in years.”']],
  [() => P().level >= 10, ['“You’ve grown. Halvard would hardly know you.”']],
];
if (typeof dlgGreet === 'function') {
  const _dg = dlgGreet;
  dlgGreet = function (who, first) {
    const r = _dg.apply(this, arguments);
    try {
      if (first || Math.random() > 0.35) return r;
      const pool = REACTIONS.filter(([test]) => { try { return test(); } catch (e) { return false; } }).flatMap(([, lines]) => lines);
      if (pool.length) return dlgText(pick(pool), who);
    } catch (e) { }
    return r;
  };
}

// ---------------- levels fill up again; champions and bounties ----------------
const CHAMP_NAMES = ['Old Grim', 'Bonecrack', 'Blackfang', 'Gristle', 'Hollowjaw', 'Redmaw', 'Ironhide', 'Widowmaker', 'Ash-eye', 'Scarback'];
const respawnable = m => m && !m.lit && !m.crypt && /^(f|d|n|g|r|h|s)\d$/.test(m.id);
function makeChampion(o) {
  const t = MONSTERS[o.id];
  o.ename = `${pick(CHAMP_NAMES)} the ${t.name}`;
  o.champion = 1; o.hp = o.mhp = Math.round(o.mhp * 2.4); return o;
}
function refill(m) {
  if (!respawnable(m)) return;
  const day = S.day; if (m.leftDay == null) { m.leftDay = day; return; }
  const away = day - m.leftDay; if (away < 2) return;
  const p = P(), cap0 = m.kind === 'forest' ? 8 : 10, now = m.mons.filter(o => !o.peace).length;
  const want = Math.min(cap0, now + 2 + Math.min(4, away)); let added = 0;
  for (let t = 0; t < 400 && now + added < want; t++) {
    const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2));
    if (!walkable(m, x, y) || m.links[K(x, y)] || m.trig[K(x, y)] || Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) < 10 || m.mons.some(o => o.x === x && o.y === y)) continue;
    let id; try { id = pickMonster(m); } catch (e) { id = null; } if (!id || MONSTERS[id].boss) continue;
    spawnAt(m, id, x, y); added++;
  }
  if (!m.mons.some(o => o.champion) && Math.random() < 0.3) {
    const cands = m.mons.filter(o => !o.peace && !MONSTERS[o.id].boss && !o.champion && !MONSTERS[o.id].prey); const o = cands[cands.length - 1];
    if (o) { makeChampion(o); (S.bounties = S.bounties || []).push({ map: m.id, uid: o.uid, name: o.ename, reward: 40 + (m.depth || 1) * 18, day }); msg(`Word reaches you that something bigger has moved into ${jName(m.id)}: ${o.ename}. (A bounty is posted on the Market Board)`, 'warn'); }
  }
  m.leftDay = day;
}
{
  const _gm = goMap;
  goMap = function (id) {
    const from = S && S.mapId; const r = _gm.apply(this, arguments);
    try { if (from && S.maps[from] && respawnable(S.maps[from])) S.maps[from].leftDay = S.day; if (id !== from) refill(curMap()); } catch (e) { }
    return r;
  };
  const _km = killMonster;
  killMonster = function (mon) {
    const live = mon && curMap().mons.includes(mon), champ = live && mon.champion;
    const r = _km.apply(this, arguments);
    try {
      if (champ) {
        const m = curMap(); m.ground.push({ x: mon.x, y: mon.y, item: randomLoot((m.depth || 1) + 3) }); m.ground.push({ x: mon.x, y: mon.y, gold: 30 + (m.depth || 1) * 15 });
        const b = (S.bounties || []).find(b => b.uid === mon.uid);
        if (b) { P().gold += b.reward; S.bounties = S.bounties.filter(x => x !== b); msg(`${mon.ename} is dead. The bounty is yours: ${b.reward} gold.`, 'gold'); }
        else msg(`${mon.ename} is dead, and drops something worth having.`, 'level');
        if (typeof cxBump === 'function') cxBump('champions');
      }
    } catch (e) { }
    return r;
  };
}
// the Market Board lists the bounties
{
  const _ob = openBoard;
  openBoard = function () {
    _ob.apply(this, arguments);
    const list = (S.bounties || []).filter(b => S.maps[b.map] && S.maps[b.map].mons.some(o => o.uid === b.uid));
    S.bounties = list;
    const b = $('#modal-body'); if (!b) return;
    b.insertAdjacentHTML('afterbegin', `<h3>Bounties</h3>${list.length ? list.map(x => `<div class="row"><div class="nm"><b>WANTED: ${esc(x.name)}</b><small>Last seen in ${esc(jName(x.map))}. Posted day ${x.day}.</small></div><div class="acts"><b class="gold-t">${x.reward} gold</b></div></div>`).join('') : '<p class="dim">No bounties posted. When something dangerous moves into a place you’ve cleared, the Watch pins a notice here.</p>'}`);
  };
}
// the journal shows bounties
{
  const _jq = jQuests;
  jQuests = function () {
    const out = _jq.apply(this, arguments);
    try { for (const b of S.bounties || []) out.push({ id: 'bounty:' + b.uid, group: 'Bounties', title: `Kill ${b.name}`, desc: `Seen in ${jName(b.map)}. ${b.reward} gold from the Watch.`, target: { map: b.map, x: 0, y: 0, far: 1 }, kicker: 'Wanted' }); } catch (e) { }
    return out;
  };
}
try {
  ACHIEVEMENTS.push(['champion', 'Champion Hunter', 'Kill five champions.', () => (cxState().n.champions || 0) >= 5, 'fight']);
  ACHIEVEMENTS.push(['statue', 'Set in Stone', 'See your own statue in the market square.', () => !!(S.maps.town && S.maps.town.statue), 'explore']);
} catch (e) { }
