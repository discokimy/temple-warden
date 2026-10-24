// The Underways and the politics of the four kingdoms.
// Off cave level 2 a second stair leads into neutral ground: the Midden Market, where traders of all four
// kingdoms meet under truce, then the wild Underways and the Drowned Galleries. At the market you can learn
// a kingdom's tongue. Speak it, and that kingdom's folk will parley instead of fighting: trade, news, gifts,
// and errands against their rivals (Gnarlhold against the Gnawing Court, the Hollows against Sszarith).
// Earn enough of their trust and the ruler will give you the seal in audience, no blood spilled.
// Break the peace and the whole level turns on you, and they remember.
// State: S.pol = { tongue: {k: day}, rep: {k: n}, task: {k: {start}}, treaty: {k: day}, gift: {k: day}, hostile: {mapId: day} }

const pol = () => { const s = S.pol || (S.pol = {}); s.tongue = s.tongue || {}; s.rep = s.rep || {}; s.task = s.task || {}; s.treaty = s.treaty || {}; s.gift = s.gift || {}; s.hostile = s.hostile || {}; for (const k of KINGDOM_ORDER) s.rep[k] = s.rep[k] || 0; return s; };
const RIVAL = { g: 'r', r: 'g', h: 's', s: 'h' };
const TONGUE_COST = 80;
const TONGUE_NAME = { g: 'Gnarl-cant', r: 'the Squeak', h: 'Hollow-sign', s: 'the Old Hiss' };
const KTRADE = {
  g: [['axe_steel', 85], ['pstr', 65], ['mat:iron', 9], ['mat:hide', 7]],
  r: [['pantidote', 16], ['dagger_steel', 55], ['mat:silk', 9], ['steleport', 32]],
  h: [['pmana', 42], ['mat:moonpetal', 24], ['spear_steel', 75], ['smapping', 45]],
  s: [['pgheal', 75], ['mat:shard', 28], ['senchant', 160], ['mat:soulgem', 130]],
};
const KNEWS = {
  g: ['King Grotsnag says the rat folk dig under our walls. He says a lot of things.', 'Goblins remember. A gift is never forgotten. Neither is a kick.', 'The serpents sell us steel and look down their noses. Their noses are very long.', 'The sealed door? Old. Older than kings. Grotsnag keeps his seal under his pillow.'],
  r: ['Mother Vesk has a thousand children and knows every one of their names.', 'Goblins! Loud. Smell of smoke. Easy to rob.', 'The Court remembers the mountain before the door was sealed. Bad times. Hungry times.', 'Bring the Court something shiny and the Court will love you. For a while.'],
  h: ['The Matriarch has kept her lantern lit for four hundred years. She says the dark is waiting.', 'We do not see. We hear your heart. It is beating fast.', 'The serpents want the Wyrm woken. They call it a god. It is a hunger.', 'Your priest came through here. Halvard. He was kind. He asked about the door.'],
  s: ['The Hierophant teaches that the world is a serpent eating its own tail. We are the teeth.', 'The Hollowfolk cling to their lantern like children afraid of the night.', 'Warm-blood, you are slow, but you are not stupid. That is rare.', 'The Wyrm sleeps. One day it will not. On that day the faithful will be fed last.'],
};
const KGREET = {
  g: n => `${cap(n)} squints at you, hand on its blade. “You talk proper Gnarl-cant? Huh. Fine. What you want?”`,
  r: n => `${cap(n)} twitches its whiskers and sniffs you. “Speaks the Squeak, does it? Clever. Clever. Trade? News? Shiny things?”`,
  h: n => `${cap(n)} turns its blind face toward you and signs slowly, its fingers cold against your palm. “We hear you, warm one.”`,
  s: n => `${cap(n)} regards you without blinking. “The Old Hiss, from a warm-blood mouth. Speak, then. Briefly.”`,
};

// ---------------- the Underways: three neutral levels off cave level 2 ----------------
const UNDER_NAMES = ['The Midden Market', 'The Underways', 'The Drowned Galleries'];
const TRADERS = [['g', 'g_shaman', 'Skrit, a goblin trader'], ['r', 'r_skulker', 'Nib, a ratkin fence'], ['h', 'h_seer', 'the Listener, a Hollowfolk elder'], ['s', 's_priest', 'Ssael, a serpent scholar']];
{
  const _mi = mapInfo;
  mapInfo = function (id) {
    if (typeof id === 'string' && /^n\d$/.test(id)) { const n = +id.slice(1); return { kind: 'neutral', lvl: n, eff: 3 + n, name: UNDER_NAMES[n - 1], parent: n === 1 ? 'd2' : 'n' + (n - 1), child: n < 3 ? 'n' + (n + 1) : null, theme: 'cave' }; }
    return _mi.apply(this, arguments);
  };
  const _pm = pickMonster;
  pickMonster = function (m) {
    if (m.kind === 'neutral') return pick(m.lvl === 1 ? ['bat', 'rat', 'cspider'] : m.lvl === 2 ? ['cspider', 'slime', 'h_crawler', 'viper', 'r_swarm'] : ['h_crawler', 'slime', 's_constrictor', 'h_hound', 'c_ghoul']);
    return _pm.apply(this, arguments);
  };
  const _gl = genLevel;
  genLevel = function (id) {
    const m = _gl.apply(this, arguments);
    if (id === 'd2') addUnderStair(m);
    if (/^n\d$/.test(id)) {
      const info = mapInfo(id), rooms = m.rooms || [];
      m.neutral = 1;
      if (info.child && !Object.values(m.links).includes(info.child)) { const r = rooms[rooms.length - 1]; if (r) { const x = r.x + (r.w >> 1), y = r.y + (r.h >> 1); setTile(m, x, y, '>'); m.links[K(x, y)] = info.child; } }
      if (id === 'n1') {
        // the market: no wild things in the first rooms, and the four traders under truce, with braziers
        const near = rooms.slice(0, 3);
        m.mons = m.mons.filter(o => !near.some(r => o.x >= r.x - 1 && o.x <= r.x + r.w && o.y >= r.y - 1 && o.y <= r.y + r.h));
        TRADERS.forEach(([k, mid, name], i) => {
          const r = near[i % near.length]; if (!r) return;
          for (let t = 0; t < 40; t++) {
            const x = roll(r.x, r.x + r.w - 1), y = roll(r.y, r.y + r.h - 1);
            if (tileAt(m, x, y) !== '.' || m.mons.some(o => o.x === x && o.y === y) || m.links[K(x, y)]) continue;
            const o = makeMonster(mid, x, y); o.peace = 1; o.trader = k; o.tname = name; o.hunting = 0; m.mons.push(o); break;
          }
        });
        for (const r of near) for (const [bx, by] of [[r.x, r.y], [r.x + r.w - 1, r.y]]) if (tileAt(m, bx, by) === '.' && !m.decor[K(bx, by)]) { m.decor[K(bx, by)] = 'brazier'; m.lights.push([bx, by, 5, 'brazier']); }
      }
      if (id === 'n3') {
        const r = rooms[rooms.length - 1];
        if (r) { const x = r.x + (r.w >> 1) + 1, y = r.y; if (tileAt(m, x, y) === '.') { m.decor[K(x, y)] = 'standingstone'; m.trig[K(x, y)] = { pol: 'stone' }; } }
      }
    }
    // kingdom levels: speak the tongue, and they hold their hand
    if (KINGDOMS[id[0]] && /^[grhs]\d$/.test(id)) applyPeace(m);
    return m;
  };
}
function addUnderStair(m) {
  if (!m || Object.values(m.links).includes('n1')) return;
  const rooms = (m.rooms || []).slice(1, -1);
  for (const r of rooms.sort(() => Math.random() - 0.5)) {
    const x = r.x + r.w - 1, y = r.y + r.h - 1;
    if (tileAt(m, x, y) === '.' && !m.decor[K(x, y)] && !m.links[K(x, y)] && !m.trig[K(x, y)]) { setTile(m, x, y, '>'); m.links[K(x, y)] = 'n1'; m.marks = m.marks || {}; return; }
  }
}
function applyPeace(m) {
  const k = m.kind; if (!KINGDOMS[k]) return;
  const P_ = pol(), hostileDay = P_.hostile[m.id];
  const ok = P_.tongue[k] && P_.rep[k] >= 0 && !(hostileDay && S.day - hostileDay < 3);
  for (const o of m.mons) {
    const t = MONSTERS[o.id]; if (t.home !== k) continue;
    if (t.boss && P_.rep[k] < 2) continue;
    if (ok && !o.angry) { o.peace = 1; o.hunting = 0; } else if (!ok && o.peace && !o.trader) o.peace = 0;
  }
}
{
  const _gm = goMap;
  goMap = function (id) {
    const r = _gm.apply(this, arguments);
    try { const m = curMap(); if (id === 'd2') addUnderStair(m); if (KINGDOMS[m.kind]) applyPeace(m); } catch (e) { }
    return r;
  };
}
// the peaceful keep to themselves
{
  const _ms = monsterStep;
  monsterStep = function (mon) {
    if (mon && mon.peace) { mon.hunting = 0; if (Math.random() < 0.15) { const m = curMap(), d = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), x = mon.x + d[0], y = mon.y + d[1]; if (walkable(m, x, y) && !m.mons.some(o => o.x === x && o.y === y) && !(P().x === x && P().y === y) && !m.links[K(x, y)]) { const fx = mon.x, fy = mon.y; mon.x = x; mon.y = y; startMove(mon, fx, fy); } } return; }
    return _ms.apply(this, arguments);
  };
}
// walking into one of them opens a parley; striking one breaks the peace
{
  const _act = act;
  act = function (dx, dy) {
    try {
      if (S && !modalOpen && !dead && (dx || dy)) {
        const m = curMap(), p = P(), mon = m.mons.find(o => o.x === p.x + dx && o.y === p.y + dy && o.peace);
        if (mon) { setFacing(p, dx, dy); openParley(mon); return; }
      }
    } catch (e) { console.error(e); }
    return _act.apply(this, arguments);
  };
  const _at = attack;
  attack = function (mon) { if (mon && mon.peace) breakPeace(mon); return _at.apply(this, arguments); };
}
function breakPeace(mon) {
  const m = curMap(), k = mon.trader || MONSTERS[mon.id].home, P_ = pol();
  if (mon.trader) { mon.peace = 0; mon.angry = 1; msg(`You strike ${the(mon)} under the market truce! Every trader in the market draws steel.`, 'bad'); for (const o of m.mons) if (o.trader) { o.peace = 0; o.angry = 1; o.hunting = 8; } P_.hostile[m.id] = S.day; for (const kk of KINGDOM_ORDER) P_.rep[kk] -= 1; return; }
  if (KINGDOMS[k]) { P_.rep[k] = Math.max(-5, P_.rep[k] - 3); P_.hostile[m.id] = S.day; msg(`You break the peace. ${cap(KINGDOMS[k].folk)} howl the alarm through ${KINGDOMS[k].name}. They will not forget this soon.`, 'bad'); }
  for (const o of m.mons) if (o.peace && (MONSTERS[o.id].home === k)) { o.peace = 0; o.angry = 1; o.hunting = 8; }
  mon.peace = 0;
}
const rivalKills = k => { try { const c = cxState(); return Object.keys(c.kills).filter(id => MONSTERS[id] && MONSTERS[id].home === RIVAL[k]).reduce((a, id) => a + c.kills[id], 0); } catch (e) { return 0; } };
const repName = n => n <= -3 ? 'Hated' : n < 0 ? 'Distrusted' : n < 2 ? 'Tolerated' : n < 4 ? 'Respected' : 'Trusted ally';

// ---------------- the parley ----------------
let parleyMon = null;
function openParley(mon) {
  parleyMon = mon;
  const draw = () => {
    const mon = parleyMon, t = MONSTERS[mon.id], k = mon.trader || t.home, P_ = pol(), p = P(), K_ = KINGDOMS[k];
    const name = mon.tname || t.name, rep = P_.rep[k] || 0, speaks = !!P_.tongue[k];
    let html = `<div class="keeper"><span class="gl big">${spriteImg(monCanvas(mon.id), 56)}</span><div><p class="lead">${speaks ? KGREET[k](name.includes(',') ? name + ',' : name) : `${cap(name)} watches you. You don't share a word of ${TONGUE_NAME[k]}, but the market truce holds.`}</p><p class="dim">${cap(K_.name)}: <b>${repName(rep)}</b> (${rep >= 0 ? '+' : ''}${rep})${speaks ? ` · you speak ${TONGUE_NAME[k]}` : ''}</p></div></div>`;
    if (mon.trader && !speaks) html += `<div class="btnrow"><button class="btn default" data-pl="learn" ${p.gold >= TONGUE_COST ? '' : 'disabled'}>Learn ${TONGUE_NAME[k]} (${TONGUE_COST} gold)</button></div><p class="hint">Learn a kingdom’s tongue and its folk will parley with you in their own halls instead of fighting.</p>`;
    if (speaks) {
      html += `<h3>Trade</h3><div class="list">${KTRADE[k].map(([id, price], i) => { const mat = id.startsWith('mat:'), nm = mat ? MATS[id.slice(4)].name : ITEMS[id].name, pr = Math.round(price * (rep >= 4 ? 0.8 : rep >= 2 ? 0.9 : 1)); return `<div class="row"><span class="gl">${mat ? matIcon(id.slice(4)) : icon(id)}</span><div class="nm"><b>${nm}</b><small>${pr} gold</small></div><div class="acts"><button class="btn tiny" data-pl="buy:${i}" ${p.gold >= pr ? '' : 'disabled'}>Buy</button></div></div>`; }).join('')}</div>`;
      const task = P_.task[k], kills = task ? rivalKills(k) - task.start : 0, rival = KINGDOMS[RIVAL[k]];
      html += `<h3>Their troubles</h3>`;
      if (!task) html += `<p>${cap(name)} leans close. “${cap(rival.folk)} have been raiding our tunnels. Kill five of them, and ${K_.name} will owe you.”</p><div class="btnrow"><button class="btn" data-pl="task">Agree</button></div>`;
      else if (kills >= 5) html += `<p>“Five ${rival.folk}? Good. Good.” ${cap(name)} looks almost pleased.</p><div class="btnrow"><button class="btn default" data-pl="done">Tell them it is done</button></div>`;
      else html += `<p class="dim">Kill five ${rival.folk}: ${Math.max(0, kills)}/5. (Their rivals will like you a little less.)</p>`;
      html += `<div class="btnrow"><button class="btn" data-pl="news">Ask for news</button><button class="btn" data-pl="gift" ${p.gold >= 30 && P_.gift[k] !== S.day ? '' : 'disabled'}>Offer a gift (30 gold)</button>`;
      if (t.boss) html += `<button class="btn ${rep >= 4 ? 'default' : ''}" data-pl="seal" ${rep >= 4 && !S.seals[k] ? '' : 'disabled'}>${S.seals[k] ? 'You hold their seal' : rep >= 4 ? 'Ask for the seal' : 'Ask for the seal (needs Trusted ally)'}</button>`;
      html += `</div>`;
    }
    html += `<div class="btnrow"><button class="btn ghost" data-a="close">Take your leave</button><button class="btn ghost danger" data-pl="attack">Attack</button></div>`;
    $('#modal-body').innerHTML = html;
  };
  openModal(cap(parleyMon.tname || MONSTERS[parleyMon.id].name), '', { refresh: draw, wide: true }); draw();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pl]'); if (!b || !S || !parleyMon) return;
  const mon = parleyMon, t = MONSTERS[mon.id], k = mon.trader || t.home, P_ = pol(), p = P(), [v, i] = b.dataset.pl.split(':');
  if (v === 'learn') { if (p.gold < TONGUE_COST) return; p.gold -= TONGUE_COST; P_.tongue[k] = S.day; useSkill('speech', 15); msg(`Over long hours ${mon.tname} teaches you ${TONGUE_NAME[k]}: enough to greet, bargain, and not give offence. ${cap(KINGDOMS[k].folk)} in their own halls will parley with you now.`, 'level'); if (typeof sfx === 'function') sfx('level'); }
  else if (v === 'buy') { const [id, price] = KTRADE[k][+i], rep = P_.rep[k], pr = Math.round(price * (rep >= 4 ? 0.8 : rep >= 2 ? 0.9 : 1)); if (p.gold < pr) return; p.gold -= pr; if (id.startsWith('mat:')) addMat(id.slice(4), 1); else addItem(makeItem(id)); useSkill('speech', 2); msg(`You buy ${id.startsWith('mat:') ? MATS[id.slice(4)].name : ITEMS[id].name} for ${pr} gold.`, 'gold'); }
  else if (v === 'task') { P_.task[k] = { start: rivalKills(k) }; msg(`You agree to strike at ${KINGDOMS[RIVAL[k]].name} for ${KINGDOMS[k].name}.`, 'talk'); }
  else if (v === 'done') { delete P_.task[k]; P_.rep[k] = Math.min(5, P_.rep[k] + 2); P_.rep[RIVAL[k]] = Math.max(-5, P_.rep[RIVAL[k]] - 1); p.gold += 60; useSkill('speech', 8); msg(`${cap(KINGDOMS[k].name)} is pleased with you. (+2 standing with them, −1 with ${KINGDOMS[RIVAL[k]].name}, +60 gold)`, 'level'); }
  else if (v === 'news') { msg(`${cap(mon.tname || t.name)}: “${pick(KNEWS[k])}”`, 'talk'); closeModal(); return; }
  else if (v === 'gift') { if (p.gold < 30 || P_.gift[k] === S.day) return; p.gold -= 30; P_.gift[k] = S.day; if (P_.rep[k] < 3) P_.rep[k]++; useSkill('speech', 3); msg(P_.rep[k] < 3 ? `The gift is accepted. ${cap(KINGDOMS[k].name)} thinks a little better of you.` : 'The gift is accepted, politely. Gifts alone will not win more than this; deeds will.', 'good'); }
  else if (v === 'seal') {
    if (P_.rep[k] < 4 || S.seals[k]) return;
    const K_ = KINGDOMS[k]; addItem(makeItem(K_.seal)); S.seals[k] = true; P_.treaty[k] = S.day;
    msg(`${cap(t.name)} studies you a long while, then takes the Seal of ${K_.name.replace(/^the /, 'the ')} from about its neck and presses it into your hand. “For the door. Not for the Wyrm. Remember who gave it.”`, 'level'); if (typeof sfx === 'function') sfx('level');
  }
  else if (v === 'attack') { closeModal(true); breakPeace(mon); attack(mon); endTurn(); return; }
  refresh();
});
// the standing stone at the bottom of the Drowned Galleries
{
  const _dt = doTrigger;
  doTrigger = function (tr) {
    if (tr && tr.pol === 'stone') {
      const P_ = pol();
      if (!S.story.treatyStone) { S.story.treatyStone = 1; for (const k of KINGDOM_ORDER) P_.rep[k] = Math.min(5, P_.rep[k] + 1); msg('A great stone stands in the black water, cut with the crests of all four kingdoms and a fifth sign, a sun, over them all: the old treaty by which the four sealed the Wyrm away. You copy the words carefully. When the kingdoms hear you have seen it, they will treat you a little more as one of the parties to it. (+1 standing with every kingdom)', 'level'); }
      else msg('The treaty stone. Four kingdoms and a sun, and the words that sealed the door.', 'talk');
      return;
    }
    return _dt.apply(this, arguments);
  };
}

// ---------------- the journal, the codex ----------------
{
  const _jq = jQuests;
  jQuests = function () {
    const out = _jq.apply(this, arguments);
    try {
      const P_ = pol();
      if (S.maps.d2 && !Object.keys(P_.tongue).length) out.push({ id: 'pol0', group: 'The kingdoms', title: 'Visit the Midden Market', desc: 'A second stair on cave level 2 leads down into neutral ground, where traders of all four kingdoms meet under truce. They teach their tongues, for a price.', target: { map: 'n1', x: 0, y: 0, far: 1 }, kicker: 'Words instead of blades' });
      for (const k of KINGDOM_ORDER) {
        if (!P_.tongue[k] || S.seals[k]) continue;
        const rep = P_.rep[k], K_ = KINGDOMS[k];
        out.push({ id: 'pol:' + k, group: 'The kingdoms', title: rep >= 4 ? `Seek an audience in ${K_.name}` : `Win the trust of ${K_.name}`, desc: rep >= 4 ? `${cap(K_.name)} counts you a trusted ally. Its ruler, on level 4, may give you the seal.` : `Standing: ${repName(rep)} (${rep}). Trade, gifts, and errands against ${KINGDOMS[RIVAL[k]].name} raise it; reach Trusted ally (+4).${P_.task[k] ? ` Errand: ${Math.max(0, rivalKills(k) - P_.task[k].start)}/5 ${KINGDOMS[RIVAL[k]].folk} slain.` : ''}`, target: { map: k + (rep >= 4 ? '4' : '1'), x: 0, y: 0, far: 1 }, kicker: TONGUE_NAME[k] });
      }
    } catch (e) { }
    return out;
  };
}
try {
  CX_REGION.neutral = 'The Underways';
  ACHIEVEMENTS.push(['midden', 'Under Truce', 'Visit the Midden Market.', () => !!S.maps.n1, 'explore']);
  ACHIEVEMENTS.push(['tongue', 'A Word in Their Ear', 'Learn a kingdom’s tongue.', () => Object.keys(pol().tongue).length >= 1, 'life']);
  ACHIEVEMENTS.push(['polyglot', 'Polyglot', 'Learn all four kingdoms’ tongues.', () => Object.keys(pol().tongue).length >= 4, 'life']);
  ACHIEVEMENTS.push(['treaty', 'Peacemaker', 'Receive a kingdom’s seal in audience, without a fight.', () => Object.keys(pol().treaty).length >= 1, 'life']);
  ACHIEVEMENTS.push(['treatystone', 'The Old Treaty', 'Find the treaty stone in the Drowned Galleries.', () => !!S.story.treatyStone, 'explore']);
} catch (e) { }
