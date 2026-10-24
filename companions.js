// Companions: one at a time walks with you, through town, the woods and under the mountain.
//   Shep, the town dog: give him some meat and he's yours. Quick, bites hard, and sniffs out loot nearby.
//   Sergeant Ada Brask: for anyone in the Watch. Tough, and sometimes steps in front of a blow meant for you.
//   Linnet of Thornbury: a ranger looking for the Ashvale track, who'll come along for a daily wage. Shoots.
//   An acolyte from your temple: not much in a fight, but heals you when you're hurt.
// Walk into your companion to give orders: follow, wait here, or go home. Knocked down, they limp home and are
// back the next morning. State: S.comp = { id, hp, wait, downDay, paidDay }.

const COMPANIONS = {
  shep: { name: 'Shep', prop: 'dog', hp: 30, atk: 6, def: 3, dmg: [2, 6], fast: 1, sniff: 1, verb: 'bites', line: ['Shep wags his whole back half.', 'Shep sniffs the air and growls at the dark.', 'Shep leans against your leg.'] },
  ada: { name: 'Sergeant Ada Brask', spr: 'ada', hp: 60, atk: 8, def: 6, dmg: [4, 10], guard: 1, verb: 'cuts', line: ['“Eyes front, Warden.”', '“I’ve seen worse. Not much worse.”', '“Hale says you’re trouble. Good.”'] },
  linnet: { name: 'Linnet', spr: 'linnet', hp: 36, atk: 9, def: 4, dmg: [3, 8], ranged: 5, wage: 12, verb: 'shoots', line: ['“Ashvale’s north of here. Three days over the cliff road. Some day.”', '“Stay out of my line, and we’ll get on fine.”', '“My mother was from Ashvale. Did you know that?”'] },
  acolyte: { name: 'your acolyte', spr: 'priest', hp: 28, atk: 4, def: 3, dmg: [1, 4], healer: 1, verb: 'raps', line: ['“The Dawn keep you.”', '“I’ve brought bandages. And bread.”', '“Is it always this dark down here?”'] },
};
if (typeof FIG_SPECS !== 'undefined') Object.assign(FIG_SPECS, {
  ada: { build: 'broad', skin: 'c98a5a', hair: 'braid', hairColor: '2a1a10', shirt: '6a4a2a', armor: 'mail', pants: '3a3e48', boots: '2a2420', held: 'sword', jaw: 'soft', lashes: 1 },
  linnet: { build: 'slim', skin: 'eab38b', hair: 'long', hairColor: 'b8642a', shirt: '3f5a2a', pants: '4a3a28', boots: '3a2a1a', held: 'bow', jaw: 'soft', lashes: 1 },
});
const cst = () => S && S.comp && COMPANIONS[S.comp.id] ? S.comp : null;
const cdef = () => cst() ? COMPANIONS[S.comp.id] : null;
const propPic = name => (NATIVE_PROPS[name] ? nativePropCanvas(name) : propCanvas(name));
const compName = () => { const c = cst(); if (!c) return ''; return c.id === 'acolyte' ? 'Acolyte ' + (c.aname || 'Wynn') : COMPANIONS[c.id].name; };
const compMaxHp = () => { const d = cdef(); return d ? d.hp + (P().level - 1) * 3 : 0; };
function compNpc(m) { return (m || curMap()).npcs.find(n => n.comp); }
function compHere() { const c = cst(); return c && !(c.downDay && c.downDay >= S.day) ? compNpc() : null; }
// Shep isn't in the square while he's out with you; he's back by the well when he goes home
function townDog() {
  const t = S.maps && S.maps.town; if (!t) return;
  const out = cst() && cst().id === 'shep';
  if (out) t.npcs = t.npcs.filter(n => !(n.prop === 'dog' && n.animal && !n.comp));
  else if (!t.npcs.some(n => n.prop === 'dog' && n.animal)) t.npcs.push({ prop: 'dog', x: 46, y: 24, name: 'a dog', animal: 1, lines: ['The dog wags its tail.', 'The dog sniffs your boots.'] });
}
function placeComp() {
  townDog();
  for (const id in S.maps) { const m = S.maps[id]; if (m.npcs) m.npcs = m.npcs.filter(n => !n.comp || (n.comp && id === S.mapId && cst() && !cst().wait)); }
  const c = cst(); if (!c || (c.downDay && c.downDay >= S.day)) { for (const id in S.maps) if (S.maps[id].npcs) S.maps[id].npcs = S.maps[id].npcs.filter(n => !n.comp); return; }
  const m = curMap(); let n = compNpc(m); const d = COMPANIONS[c.id], p = P();
  if (c.wait && c.waitMap === S.mapId) { if (!n) m.npcs.push({ comp: 1, fixed: true, x: c.wx, y: c.wy, name: compName(), spr: d.spr, prop: d.prop, lines: d.line }); return; }
  if (c.wait) return; // waiting somewhere else
  if (n && cheb(n, p) <= 6) return;
  const spot = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0]].map(([dx, dy]) => [p.x + dx, p.y + dy]).find(([x, y]) => walkable(m, x, y) && !m.mons.some(o => o.x === x && o.y === y) && !m.npcs.some(o => o.x === x && o.y === y) && !m.links[K(x, y)] && !m.trig[K(x, y)]);
  if (!spot) return;
  if (n) { n.x = spot[0]; n.y = spot[1]; } else m.npcs.push({ comp: 1, fixed: true, x: spot[0], y: spot[1], name: compName(), spr: d.spr, prop: d.prop, lines: d.line });
}
function recruit(id, extra) {
  if (cst() && cst().id !== id) { msg(`${compName()} goes home; ${COMPANIONS[id].name} comes with you instead.`, 'talk'); }
  S.comp = Object.assign({ id, hp: 0, wait: false, paidDay: S.day }, extra || {}); S.comp.hp = compMaxHp();
  placeComp(); render(); msg(`${compName()} will walk with you. Walk into them to give orders.`, 'good');
  if (typeof cxBump === 'function') cxBump('recruits');
}

// ---------- each turn: follow, fight, heal ----------
function compTick() {
  const c = cst(); if (!c || dead) return;
  const m = curMap(), p = P(), d = COMPANIONS[c.id];
  // the daily wage, and coming back after being knocked down
  if (d.wage && c.paidDay !== S.day) { c.paidDay = S.day; if (p.gold >= d.wage) { p.gold -= d.wage; msg(`You pay ${compName()} her wage (${d.wage} gold).`, 'gold'); } else { msg(`You can’t pay ${compName()}. She goes back to the inn until you can.`, 'warn'); S.comp = null; placeComp(); return; } }
  if (c.downDay && c.downDay < S.day) { c.downDay = 0; c.hp = compMaxHp(); placeComp(); msg(`${compName()} is back on their feet and with you again.`, 'good'); }
  if (c.downDay) return;
  let n = compNpc(m); if (!n) { placeComp(); n = compNpc(m); if (!n) return; }
  if (c.wait) return;
  const hostile = o => !o.peace && (o.hunting > 0 || o.angry) && !(o.sleep > 0);
  const hit = (o, dmgMul = 1) => {
    const t = MONSTERS[o.id];
    if (Math.random() < 0.72 + (d.atk - t.def) * 0.03) {
      const dm = Math.max(1, Math.round(roll(d.dmg[0], d.dmg[1]) * dmgMul + Math.floor(p.level / 2)));
      o.hp -= dm; o.angry = 1; o.hunting = 8; addFloat(o.x, o.y, dm, '#9fd0f5');
      if (o.hp <= 0) { msg(`${compName()} ${d.verb} ${the(o)}, and it falls.`, 'kill'); if (typeof gainXp === 'function') gainXp(Math.round(t.xp * 0.5)); killMonster(o); }
    }
  };
  // the healer tends you first
  if (d.healer && p.hp < maxHp() * 0.5 && (!c.healT || S.turn - c.healT >= 6)) { c.healT = S.turn; const h = 8 + p.level * 2; p.hp = Math.min(maxHp(), p.hp + h); addFloat(p.x, p.y, '+' + h, '#8fd16a'); msg(`${compName()} presses a hand to your wounds and prays. (+${h})`, 'good'); return; }
  const acts = d.fast ? 2 : 1;
  for (let a = 0; a < acts; a++) {
    const adj = m.mons.find(o => hostile(o) && cheb(o, n) <= 1);
    if (adj) { hit(adj); continue; }
    if (d.ranged) { const tgt = m.mons.filter(o => hostile(o) && cheb(o, n) <= d.ranged && monVisible(o)).sort((a2, b) => cheb(a2, n) - cheb(b, n))[0]; if (tgt) { if (typeof addTracer === 'function') { try { addTracer(tgt, '#e8d8a0'); } catch (e) { } } hit(tgt, 0.9); continue; } }
    // otherwise keep close: step toward you, or toward the nearest foe you're fighting
    const target = m.mons.find(o => hostile(o) && cheb(o, p) <= 2 && cheb(o, n) <= 4) || p;
    const dist = cheb(n, target); if (target === p && dist <= 2) break;
    if (dist > 9) { placeComp(); break; }
    let best = null, bd = dist;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = n.x + dx, y = n.y + dy; if (!walkable(m, x, y) || (x === p.x && y === p.y) || m.mons.some(o => o.x === x && o.y === y) || m.npcs.some(o => o !== n && o.x === x && o.y === y) || m.links[K(x, y)]) continue;
      const dd = Math.max(Math.abs(target.x - x), Math.abs(target.y - y)); if (dd < bd) { bd = dd; best = [x, y]; }
    }
    if (best) { const fx = n.x, fy = n.y; n.x = best[0]; n.y = best[1]; startMove(n, fx, fy); }
  }
  // foes next to your companion (and not to you) sometimes go for them instead
  for (const o of m.mons) {
    if (!hostile(o) || cheb(o, n) > 1 || cheb(o, p) <= 1 || Math.random() > 0.4) continue;
    const t = MONSTERS[o.id]; if (Math.random() > 0.65 - (d.def - t.atk) * 0.03) continue;
    const dm = Math.max(1, roll(t.dmg[0], t.dmg[1]) - Math.floor(d.def / 3)); c.hp -= dm; addFloat(n.x, n.y, dm, '#ff6b6f');
    if (c.hp <= 0) { c.downDay = S.day; msg(`${compName()} is knocked down, and limps away home. They’ll be back tomorrow.`, 'bad'); placeComp(); return; }
  }
}
{
  const _et = endTurn;
  endTurn = function () { const r = _et.apply(this, arguments); try { if (!(typeof AC !== 'undefined' && AC.on && !AC.ticking)) compTick(); } catch (e) { console.error(e); } return r; };
  const _gm = goMap;
  goMap = function (id) {
    const r = _gm.apply(this, arguments);
    try {
      const c = cst(); if (c) { placeComp(); const d = COMPANIONS[c.id];
        if (d.sniff && !c.downDay && !c.wait) { const m = curMap(), p = P(); const near = (m.ground || []).filter(g => (g.item || g.gold) && Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)) <= 12); if (near.length && m.seen) { for (const g of near) m.seen[g.y * m.w + g.x] = 1; msg(`Shep puts his nose down and pulls toward something. (${near.length} thing${near.length > 1 ? 's' : ''} nearby marked on your map)`, 'talk'); } }
      }
    } catch (e) { }
    return r;
  };
}
// Ada takes a blow for you, now and then
if (typeof monsterAttack === 'function') {
  const _ma = monsterAttack;
  monsterAttack = function (mon) {
    const c = cst(), n = compHere();
    if (c && n && COMPANIONS[c.id].guard && !c.wait && cheb(n, P()) <= 1 && Math.random() < 0.22) { msg(`${compName()} gets her shield in the way of ${the(mon)}'s blow.`, 'good'); addFloat(n.x, n.y, 'block', '#cfe6ff'); return; }
    return _ma.apply(this, arguments);
  };
}

// ---------- orders ----------
{
  const _act = act;
  act = function (dx, dy) {
    try {
      if (S && !modalOpen && !dead && (dx || dy)) {
        const m = curMap(), p = P(), x = p.x + dx, y = p.y + dy;
        const n = m.npcs.find(o => o.x === x && o.y === y);
        if (n && n.comp) { setFacing(p, dx, dy); openCompOrders(); return; }
        // recruiting: the town dog, Linnet by the inn
        if (n && n.prop === 'dog' && n.animal && !n.comp && m.id === 'town') { setFacing(p, dx, dy); return offerShep(n); }
        if (n && n.linnet && !(cst() && cst().id === 'linnet')) { setFacing(p, dx, dy); return offerLinnet(); }
      }
    } catch (e) { console.error(e); }
    return _act.apply(this, arguments);
  };
}
function openCompOrders() {
  const c = cst(), d = cdef(), n = compNpc();
  openModal(compName(), `<div class="keeper"><span class="gl big">${spriteImg(d.prop ? propPic(d.prop) : npcCanvas(d.spr), 56)}</span><div><p class="lead">${pick(d.line)}</p><p class="dim">Health ${Math.max(0, c.hp)} / ${compMaxHp()}${d.wage ? ` · wage ${d.wage} gold a day` : ''}</p></div></div>
    <div class="btnrow">${c.wait ? '<button class="btn default" data-co="follow">Follow me</button>' : '<button class="btn" data-co="wait">Wait here</button>'}<button class="btn" data-co="swap">Change places</button><button class="btn ghost" data-co="home">Go home</button></div>`);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-co]'); if (!b || !S) return;
  const c = cst(), v = b.dataset.co, n = compNpc(), p = P();
  if (v === 'wait' && n) { c.wait = true; c.waitMap = S.mapId; c.wx = n.x; c.wy = n.y; msg(`${compName()} waits here.`, 'talk'); }
  else if (v === 'follow') { c.wait = false; placeComp(); msg(`${compName()} falls in beside you.`, 'talk'); }
  else if (v === 'swap' && n) { const fx = p.x, fy = p.y; p.x = n.x; p.y = n.y; n.x = fx; n.y = fy; startMove(p, fx, fy); computeFov(); }
  else if (v === 'home') { msg(`${compName()} heads home. You can find them again in town.`, 'talk'); S.comp = null; placeComp(); }
  closeModal(true); render();
});
function offerShep(n) {
  const has = (P().mats.meat || 0) > 0;
  openModal('The town dog', `<div class="keeper"><span class="gl big">${spriteImg(propPic('dog'), 56)}</span><p class="lead">A shaggy grey sheepdog, old Tam’s by rights, though he belongs to everyone. He looks at your pack, and then at you, with enormous hope.</p></div>
    <div class="btnrow"><button class="btn default" data-shep="1" ${has ? '' : 'disabled'}>Give him some raw meat</button><button class="btn ghost" data-a="close">Scratch his ears</button></div>${has ? '' : '<p class="hint">He would follow anyone with raw meat. Hunt in the Whisperwood, or buy some at the market.</p>'}`);
}
document.addEventListener('click', e => { if (!e.target.closest('[data-shep]') || !S) return; P().mats.meat--; closeModal(true); recruit('shep'); });
function offerLinnet() {
  openModal('Linnet of Thornbury', `<div class="keeper"><span class="gl big">${spriteImg(npcCanvas('linnet'), 56)}</span><p class="lead">A young woman in a green hunting coat, a good bow across her back. “I’m looking for the old Ashvale track. Until I find it, I’ll go where the work is. Twelve gold a day, and I shoot what you point at.”</p></div>
    <div class="btnrow"><button class="btn default" data-linnet="1" ${P().gold >= 12 ? '' : 'disabled'}>Hire her (12 gold a day)</button><button class="btn ghost" data-a="close">Not now</button></div>`);
}
document.addEventListener('click', e => { if (!e.target.closest('[data-linnet]') || !S) return; const p = P(); if (p.gold < 12) return; p.gold -= 12; closeModal(true); recruit('linnet', { paidDay: S.day }); });
// Linnet waits by the inn door when she isn't with you
function placeLinnet() {
  const m = S && S.maps && S.maps.town; if (!m) return;
  const withYou = cst() && cst().id === 'linnet';
  m.npcs = m.npcs.filter(n => !n.linnet || !withYou);
  if (withYou || m.npcs.some(n => n.linnet)) return;
  const inn = (m.landmarks || []).find(l => l.spec && l.spec.kind === 'inn'); if (!inn) return;
  const y = inn.y + inn.h, dx = inn.x + inn.spec.door;
  for (const x of [dx - 2, dx + 2, dx - 3, dx + 3]) for (const yy of [y, y + 1]) if (walkable(m, x, yy) && !m.npcs.some(n => n.x === x && n.y === yy) && !m.trig[K(x, yy)]) { m.npcs.push({ linnet: 1, fixed: true, spr: 'linnet', name: 'Linnet of Thornbury', x, y: yy, lines: ['“Looking for work?”'] }); return; }
}
setInterval(() => { try { if (S) placeLinnet(); } catch (e) { } }, 2000);
// Ada, through the Watch; an acolyte, through the temple
if (typeof openGuild === 'function') {
  const _og = openGuild;
  openGuild = function (k) {
    _og.apply(this, arguments);
    if (k !== 'watch' || !S.guild || !S.guild.watch || S.guild.watch.rank < 1) return;
    const add = () => { const b = $('#modal-body'); if (b && !b.querySelector('[data-ada]')) b.insertAdjacentHTML('beforeend', `<h3>A partner on patrol</h3><p class="dim">“Take Brask with you. She’s my best, and she’s bored.”</p><div class="btnrow"><button class="btn" data-ada="1" ${cst() && cst().id === 'ada' ? 'disabled' : ''}>${cst() && cst().id === 'ada' ? 'Sergeant Brask is with you' : 'Take Sergeant Ada Brask with you'}</button></div>`); };
    const d0 = modalRefresh; modalRefresh = () => { d0(); add(); }; add();
  };
}
document.addEventListener('click', e => { if (!e.target.closest('[data-ada]') || !S) return; closeModal(true); recruit('ada'); });
if (typeof openWorks === 'function') {
  const _ow = openWorks;
  openWorks = function () {
    _ow.apply(this, arguments);
    const add = () => { const T = tw(), b = $('#modal-body'); if (!b || b.querySelector('[data-acol]') || !T.acolytes.length) return; b.insertAdjacentHTML('beforeend', `<h3>Take an acolyte with you</h3><div class="btnrow">${T.acolytes.map(n => `<button class="btn" data-acol="${n}" ${cst() && cst().id === 'acolyte' && cst().aname === n ? 'disabled' : ''}>${n}</button>`).join('')}</div><p class="hint">An acolyte heals you when you’re badly hurt, though they’re little use with a blade.</p>`); };
    const d0 = modalRefresh; modalRefresh = () => { d0(); add(); }; add();
  };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-acol]'); if (!b || !S) return; closeModal(true); recruit('acolyte', { aname: b.dataset.acol }); });
// keep the companion on the map after loading a save
let compLastS = null;
setInterval(() => { try { if (S && S !== compLastS) { compLastS = S; placeComp(); } } catch (e) { } }, 1000);
try {
  ACHIEVEMENTS.push(['companion', 'Not Alone', 'Have someone walk with you.', () => (cxState().n.recruits || 0) >= 1, 'life']);
  ACHIEVEMENTS.push(['goodboy', 'Good Boy', 'Win over Shep.', () => S.comp && S.comp.id === 'shep', 'life']);
} catch (e) { }
