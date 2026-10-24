// The Temple Warden — the parish: talking with townsfolk, trust, and the work of an acolyte
// (prayer, counsel, healing and errands). Data lives in people.js; this is the engine and the windows.
'use strict';

// Town NPCs placed before the parish existed are matched to people by their sprite.
const WHO_BY_SPR = { baker: 'marta', merchant: 'ilse', farmer: 'hobb', girl: 'pippa', guard: 'ned', villager1: 'abel', villager2: 'maren', villager3: 'gil', priest: 'anselm' };
// the folk of the market ring share sprites with others, so they're known by name
const WHO_BY_NAME = { 'Garrick the butcher': 'garrick', 'the auctioneer': 'fenwick', 'a drover': 'ewan' };
const whoOf = npc => npc.who || WHO_BY_NAME[npc.name] || WHO_BY_SPR[npc.spr] || (PEOPLE[npc.spr] && !PEOPLE[npc.spr].hidden ? npc.spr : null);
const TRUST_NAMES = ['Stranger', 'Acquaintance', 'Acquaintance', 'Friend', 'Friend', 'Confidant'];
// standing with the parish, as Brother Anselm sees it
const STANDING_STEPS = [[0, 'Unproven'], [5, 'Promising'], [12, 'Trusted by the parish'], [20, 'Keeper of the Temple']];

function parish() {
  if (!S.parish) S.parish = { trust: {}, met: {}, duties: {}, flags: {}, facts: [], known: {}, carry: null, standing: 0 };
  return S.parish;
}
const trustOf = id => parish().trust[id] || 0;
const standingName = () => { const n = parish().standing; let name = STANDING_STEPS[0][1]; for (const [at, nm] of STANDING_STEPS) if (n >= at) name = nm; return name; };
const hearts = n => '<span class="hearts" aria-label="trust ' + n + ' of 5">' + [0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('') + '</span>';

function dutyState(id) { return (parish().duties[id] || {}).st; }
function dutyAvailable(id) {
  const d = DUTIES[id], P_ = parish(), r = d.req || {};
  if (P_.duties[id]) return false;
  if ((r.trust || 0) > trustOf(d.who)) return false;
  if (r.duty && dutyState(r.duty) !== 'done') return false;
  if (r.flag && !P_.flags[r.flag]) return false;
  // the friar's question comes first: it's how the work begins
  if (id !== 'anselm_intro' && dutyState('anselm_intro') !== 'done' && d.who !== 'anselm') return false;
  return true;
}
const dutiesOf = who => Object.keys(DUTIES).filter(id => DUTIES[id].who === who);
// can this duty be finished right now, in conversation with its person?
function dutyReady(id) {
  const d = DUTIES[id], st = dutyState(id);
  if (st === 'prayed') return S.day > parish().duties[id].day;
  if (st !== 'active') return false;
  if (d.kind === 'bring') return Object.entries(d.need).every(([k, n]) => haveCount(k) >= n);
  if (d.kind === 'deliver') return parish().carry === id;
  if (d.kind === 'heal') return healMeans(d).some(m => m.ok);
  return false;
}
// what a person shows over their head: something new to ask, or something you can finish now
function npcMark(who) {
  if (!who) return null;
  const ids = dutiesOf(who);
  if (ids.some(dutyReady)) return 'ready';
  if (ids.some(dutyAvailable)) return 'new';
  // something has come of your last visit, and they want to tell you
  if (typeof dlgHasNews === 'function' && dlgHasNews(who)) return 'new';
  return null;
}

function haveCount(k) {
  if (MATS[k]) return matCount(k);
  return P().inv.filter(i => i.id === k).reduce((a, i) => a + (i.q || 1), 0);
}
function takeCount(k, n) {
  if (MATS[k]) { useMat(k, n); return; }
  const p = P();
  for (const it of p.inv.filter(i => i.id === k)) { if (n <= 0) break; const q = it.q || 1, t = Math.min(q, n); for (let i = 0; i < t; i++) removeOne(it); n -= t; }
}
const thingName = k => MATS[k] ? MATS[k].name : ITEMS[k] ? ITEMS[k].name : k;
function healMeans(d) {
  const p = P();
  return d.means.map(m => {
    const [kind, k, n] = m.split(':');
    if (kind === 'spell') return { m, ok: p.spells.includes(k) && p.mp >= spellCost(k), label: `Cast ${SPELLS[k].name} (${spellCost(k)} MP)`, known: p.spells.includes(k) };
    if (kind === 'item') return { m, ok: haveCount(k) >= 1, label: `Give a ${ITEMS[k].name}`, known: true };
    return { m, ok: haveCount(k) >= +n, label: `Brew a tisane (${n} ${MATS[k].name})`, known: true };
  });
}

function giveReward(d, extraTrust) {
  const p = P(), P_ = parish(), r = d.reward || {};
  const tr = Object.assign({}, typeof r.trust === 'object' ? r.trust : {}, extraTrust || {});
  for (const [who, n] of Object.entries(tr)) {
    P_.trust[who] = Math.max(0, Math.min(5, (P_.trust[who] || 0) + n));
    if (PEOPLE[who] && !PEOPLE[who].hidden && n > 0) addFloat(p.x, p.y, '♥', '#ff8fa3');
  }
  if (r.standing) { const before = standingName(); P_.standing += r.standing; if (standingName() !== before) msg(`Your standing with the parish has grown: ${standingName()}.`, 'level'); }
  if (r.gold) { p.gold += r.gold; msg(`You receive ${r.gold} gold.`, 'gold'); }
  if (r.item) { const it = makeItem(r.item); if (addItem(it)) msg(`You receive ${itemName(it)}.`, 'good'); }
  if (d.fact) learn(d.fact.who, d.fact.text);
}
function learn(who, text) { const P_ = parish(); if (!P_.facts.some(f => f.text === text)) { P_.facts.push({ who, text, day: S.day }); msg('Noted in your parish ledger.', 'news'); } }
const DUTY_SKILL = { pray: ['faith', 10], heal: ['restoration', 10], counsel: ['speech', 10], bring: ['speech', 4], deliver: ['speech', 4] };
function finishDuty(id, extraTrust) { const k = DUTY_SKILL[DUTIES[id].kind]; if (k) useSkill(k[0], k[1]); parish().duties[id] = { st: 'done', day: S.day }; giveReward(DUTIES[id], extraTrust); if (DUTIES[id].later && typeof dlgLater === 'function') dlgLater(DUTIES[id].later); autosave(); }

// ---------------- the conversation window ----------------
let talkWho = null, talkLine = '', talkCounsel = null;
function openTalk(who) {
  if (typeof dlgResolve === 'function') { dlgResolve(); dlgOriginTrust(); }
  const p = parish(); talkWho = who; talkCounsel = null;
  const first = !p.met[who]; p.met[who] = 1;
  // meeting someone properly makes you acquainted
  if (first && !p.trust[who]) p.trust[who] = 1;
  const pe = PEOPLE[who];
  if (typeof dlgGreet === 'function') { dlgReset(); talkLine = dlgGreet(who, first); }
  else talkLine = first ? `${pe.look}` : pick(trustOf(who) >= 3 && pe.talk2 ? pe.talk2.concat(pe.talk) : pe.talk);
  openModal(pe.name, '', { refresh: drawTalk }); drawTalk();
}
function drawTalk() {
  const who = talkWho, pe = PEOPLE[who], P_ = parish(), t = trustOf(who);
  const art = pe.spr ? npcCanvas(pe.spr) : propCanvas('body');
  let html = typeof dlgWrap === 'function'
    ? `<div class="tk-head"><span class="gl">${spriteImg(art, 40, art.height > art.width ? 'head' : undefined)}</span><p class="talk-role">${esc(cap(pe.role))} · ${TRUST_NAMES[t]} ${hearts(t)}</p></div><div class="tk-ex">${dlgWrap(talkLine)}</div>`
    : `${keeperArt(art, `<p class="talk-role">${esc(cap(pe.role))} · ${TRUST_NAMES[t]} ${hearts(t)}</p><p>${talkLine}</p>`)}`;
  if (talkCounsel) {
    const d = DUTIES[talkCounsel];
    html += `<div class="counsel"><p>${d.ask}</p>${d.choices.map((c, i) => `<button class="btn choice" data-a="p" data-v="choose|${i}" ${c.cost && P().gold < c.cost ? 'disabled' : ''}>${c.label}${c.cost ? ` <small>(${c.cost} gold)</small>` : ''}</button>`).join('')}</div>`;
    $('#modal-body').innerHTML = html; return;
  }
  // in the middle of a conversation: answering them, or choosing whom to ask about
  const panel = typeof dlgPanel === 'function' && dlgPanel(who);
  if (panel) { $('#modal-body').innerHTML = html + panel; return; }
  // what they need from you
  const needs = [];
  for (const id of dutiesOf(who)) {
    const d = DUTIES[id], st = dutyState(id);
    if (st === 'done') continue;
    if (!st && dutyAvailable(id)) {
      if (d.kind === 'counsel') needs.push(`<div class="need new"><b>${d.title}</b><p class="dim">Something is weighing on ${esc(pe.name.replace(/^(Brother|Old|Father) /, '').split(' ')[0])}.</p><div class="btnrow"><button class="btn default" data-a="p" data-v="counsel|${id}">Listen</button></div></div>`);
      else needs.push(`<div class="need new"><b>${d.title}</b><p>${d.ask}</p><div class="btnrow"><button class="btn default" data-a="p" data-v="accept|${id}">${d.kind === 'pray' ? 'I will pray for them' : d.kind === 'heal' ? 'Let me help' : 'I\'ll do it'}</button><button class="btn" data-a="p" data-v="later|${id}">Not now</button></div></div>`);
      continue;
    }
    if (!st) continue;
    needs.push(`<div class="need"><b>${d.title}</b>${dutyBody(id)}</div>`);
  }
  // deliveries meant for this person
  if (P_.carry && DUTIES[P_.carry].who === who && !dutiesOf(who).includes(P_.carry)) needs.push(`<div class="need"><b>${DUTIES[P_.carry].title}</b>${dutyBody(P_.carry)}</div>`);
  if (needs.length) html += `<h3 class="tk-needs">What they need</h3>${needs.join('')}`;
  if (typeof dlgTopicsHtml === 'function') { $('#modal-body').innerHTML = html + dlgTopicsHtml(who); return; }
  html += `<div class="btnrow topics">
    <button class="btn" data-a="p" data-v="topic|self">Ask how life is</button>
    ${pe.halvard ? '<button class="btn" data-a="p" data-v="topic|halvard">Ask about Halvard</button>' : ''}
    <button class="btn" data-a="p" data-v="topic|chat">Pass the time</button>
    ${pe.shop ? `<button class="btn default" data-a="p" data-v="trade|${pe.shop}">Trade</button>` : ''}
    <button class="btn ghost" data-a="close">Goodbye</button></div>`;
  $('#modal-body').innerHTML = html;
}
// the middle of a duty: what's left to do, and the button to finish it if you can
function dutyBody(id) {
  const d = DUTIES[id], st = dutyState(id), P_ = parish();
  if (d.kind === 'pray') {
    if (st === 'prayed') return dutyReady(id) ? `<p class="dim">You prayed for this yesterday.</p><div class="btnrow"><button class="btn default" data-a="p" data-v="finish|${id}">Tell them you prayed</button></div>` : '<p class="dim">You have prayed. Give it a night, and come back tomorrow.</p>';
    return '<p class="dim">You promised to pray. Kneel at the temple altar, or at Halvard\'s sun-disc in the parsonage.</p>';
  }
  if (d.kind === 'bring') {
    const parts = Object.entries(d.need).map(([k, n]) => `${thingName(k)} <b class="${haveCount(k) >= n ? 'ok' : 'no'}">${Math.min(haveCount(k), n)}/${n}</b>`).join(' · ');
    return `<p class="dim">Bring: ${parts}</p>${dutyReady(id) ? `<div class="btnrow"><button class="btn default" data-a="p" data-v="finish|${id}">Hand them over</button></div>` : ''}`;
  }
  if (d.kind === 'deliver') {
    if (P_.carry === id) return `<p class="dim">You have ${d.carry}.</p><div class="btnrow"><button class="btn default" data-a="p" data-v="finish|${id}">Give ${d.carry}</button></div>`;
    return `<p class="dim">${d.pickup === 'chronicle' ? 'It should be on Halvard\'s bookshelf in the parsonage.' : 'Collect it first.'}</p>`;
  }
  if (d.kind === 'heal') {
    const ms = healMeans(d);
    return `<p class="dim">${d.sick}</p><div class="btnrow">${ms.filter(m => m.known).map(m => `<button class="btn ${m.ok ? 'default' : ''}" data-a="p" data-v="heal|${id}|${m.m}" ${m.ok ? '' : 'disabled'}>${m.label}</button>`).join('')}</div>${ms.some(m => m.ok) ? '' : '<p class="hint">You need the Cure or Heal spell, a Potion of Healing, or healroot from the Whisperwood.</p>'}`;
  }
  return '';
}
function talkTopic(k) {
  const who = talkWho, pe = PEOPLE[who], P_ = parish();
  // a little time spent with someone, once a day, builds a little trust, up to a point; the rest is earned
  P_.chat = P_.chat || {};
  if ((k === 'chat' || k === 'self') && P_.chat[who] !== S.day && trustOf(who) < 2) { P_.chat[who] = S.day; P_.trust[who] = trustOf(who) + 1; addFloat(P().x, P().y, '♥', '#ff8fa3'); }
  const t = trustOf(who);
  if (k === 'halvard') talkLine = pe.halvard;
  else if (k === 'chat') talkLine = pick(t >= 3 && pe.talk2 ? pe.talk2.concat(pe.talk) : pe.talk);
  else {
    const known = P_.known[who] || (P_.known[who] = []);
    const next = pe.story.findIndex((s, i) => s[0] <= t && !known.includes(i));
    if (next >= 0) { known.push(next); talkLine = pe.story[next][1]; }
    else talkLine = pe.story.some(s => s[0] > t) ? `${pe.name.split(' ')[0]} smiles, but doesn't say more. Perhaps when you know each other better.` : 'You talk a while about nothing much. It\'s pleasant.';
  }
  drawTalk();
}
// one action dispatcher for every parish button: data-a="p" data-v="verb|arg|arg"
function parishAct(v) {
  const [verb, a, b] = v.split('|'), P_ = parish(), p = P();
  if (verb === 'talk') return openTalk(a);
  if (verb === 'topic') return talkTopic(a);
  if (verb === 'd') return dlgAct(a, b);
  if (verb === 'trade') { closeModal(); return openShop(a); }
  if (verb === 'later') { talkLine = 'Of course. Whenever you can.'; return drawTalk(); }
  if (verb === 'counsel') { talkCounsel = a; return drawTalk(); }
  if (verb === 'choose') {
    const id = talkCounsel, d = DUTIES[id], c = d.choices[+a];
    if (c.cost) { if (p.gold < c.cost) return; p.gold -= c.cost; }
    if (c.flag) P_.flags[c.flag] = 1;
    if (c.item) { const it = makeItem(c.item); if (addItem(it)) msg(`You receive ${itemName(it)}.`, 'good'); }
    if (c.fact) learn(d.who, c.fact);
    // what the choice sets in motion happens in its own time, not here
    if (c.later && typeof dlgLater === 'function') dlgLater(c.later);
    talkCounsel = null; talkLine = c.reply;
    finishDuty(id, c.trust);
    return refresh();
  }
  if (verb === 'accept') {
    const d = DUTIES[a];
    P_.duties[a] = { st: 'active', day: S.day };
    if (d.kind === 'deliver' && !d.pickup) P_.carry = a;
    talkLine = d.kind === 'pray' ? 'Thank you. Truly.' : d.kind === 'heal' ? 'Bless you.' : 'Thank you. I\'ll be here.';
    msg(`Parish duty: ${d.title}.`, 'news');
    return refresh();
  }
  if (verb === 'heal') {
    const d = DUTIES[a], [kind, k, n] = b.split(':');
    if (kind === 'spell') { p.mp -= spellCost(k); }
    else if (kind === 'item') takeCount(k, 1);
    else takeCount(k, +n);
    talkLine = d.result; finishDuty(a);
    return refresh();
  }
  if (verb === 'finish') {
    const d = DUTIES[a];
    if (d.kind === 'bring') { if (!dutyReady(a)) return; for (const [k, n] of Object.entries(d.need)) takeCount(k, n); }
    if (d.kind === 'deliver') P_.carry = null;
    talkLine = d.result; finishDuty(a);
    return refresh();
  }
  if (verb === 'pray') {
    const d = DUTIES[a];
    P_.duties[a] = { st: 'prayed', day: S.day };
    msg(d.prayer, 'good');
    closeModal(); autosave(); return;
  }
  if (verb === 'person') { ledgerSel = a; return refresh(); }
  if (verb === 'ledger') return openHero('parish');
  if (verb === 'altar') { if (!openAltarPrayers("Aurel's altar")) msg('You have promised no prayers yet. Townsfolk will ask, when they need you.', 'talk'); return; }
}
// at an altar: the prayers you've promised
function openAltarPrayers(where) {
  const ids = Object.keys(DUTIES).filter(id => DUTIES[id].kind === 'pray' && dutyState(id) === 'active');
  if (!ids.length) return false;
  openModal(where, `<p class="lead">You kneel. You promised to pray for:</p>${ids.map(id => { const d = DUTIES[id], pe = PEOPLE[d.who]; return `<div class="row"><span class="gl">${spriteImg(npcCanvas(pe.spr), 32)}</span><div class="nm"><b>${d.title}</b><small>for ${esc(pe.name)}</small></div><div class="acts"><button class="btn tiny default" data-a="p" data-v="pray|${id}">Pray</button></div></div>`; }).join('')}`);
  return true;
}
// Halvard's books: where Aldous's Chronicle is waiting
function pickupAt(tag) {
  const P_ = parish();
  const id = Object.keys(DUTIES).find(k => DUTIES[k].pickup === tag && dutyState(k) === 'active' && P_.carry !== k);
  if (!id) return false;
  P_.carry = id; msg(DUTIES[id].pickText, 'good'); return true;
}

// ---------------- the parish ledger (Hero › Parish) ----------------
let ledgerSel = null;
function htmlParish() {
  const P_ = parish();
  const met = Object.keys(PEOPLE).filter(k => P_.met[k] && !PEOPLE[k].hidden);
  const active = Object.keys(P_.duties).filter(id => P_.duties[id].st !== 'done');
  const nextStep = STANDING_STEPS.find(([at]) => at > P_.standing);
  let html = `<div class="parish-head"><div><span class="q-kicker">Standing with the parish</span><b class="q-title">${standingName()}</b><small class="dim">${P_.standing} ${nextStep ? `· next: ${nextStep[1]} at ${nextStep[0]}` : ''}</small></div>
    <p class="dim">With Halvard gone, the people of Brambleford bring their troubles to you. Brother Anselm is keeping a tally for the cathedral.</p></div>`;
  html += `<h3>Duties</h3>${active.length ? active.map(id => { const d = DUTIES[id], pe = PEOPLE[d.who]; return `<div class="row"><span class="gl">${spriteImg(npcCanvas(pe.spr), 28)}</span><div class="nm"><b>${d.title}</b><small>${esc(pe.name)} · ${dutyHint(id)}</small></div>${dutyReady(id) ? '<span class="pill">Ready</span>' : ''}</div>`; }).join('') : '<p class="dim">No promises outstanding. Talk to people around town; a marker over someone\'s head means they need you.</p>'}`;
  if (!met.length) return html + '<p class="dim">You haven\'t spoken with anyone yet. Walk into a townsperson to talk.</p>';
  if (!ledgerSel || !met.includes(ledgerSel)) ledgerSel = met[0];
  const pe = PEOPLE[ledgerSel], known = (P_.known[ledgerSel] || []).map(i => pe.story[i][1]);
  const facts = P_.facts.filter(f => f.who === ledgerSel).map(f => f.text);
  const ties = Object.entries(pe.ties || {}).filter(([k]) => P_.met[k] || PEOPLE[k]?.hidden || k === 'halvard').map(([k, t]) => `<li><b>${k === 'halvard' ? 'Halvard' : esc(PEOPLE[k].name)}</b> ${esc(t)}</li>`);
  html += `<h3>People</h3><div class="ledger"><div class="ledger-list">${met.map(k => `<button class="lp ${k === ledgerSel ? 'on' : ''}" data-a="p" data-v="person|${k}">${spriteImg(npcCanvas(PEOPLE[k].spr), 28)}<span><b>${esc(PEOPLE[k].name)}</b><small>${esc(PEOPLE[k].role)}</small></span>${npcMark(k) ? '<i class="mk"></i>' : ''}</button>`).join('')}</div>
    <div class="ledger-page"><div class="keeper"><span class="gl big">${spriteImg(npcCanvas(pe.spr), 56)}</span><div><b>${esc(pe.name)}</b><p class="talk-role">${esc(cap(pe.role))} · ${TRUST_NAMES[trustOf(ledgerSel)]} ${hearts(trustOf(ledgerSel))}</p><p>${esc(pe.look)}</p><p class="dim">Found at ${esc(pe.where)}.</p></div></div>
    ${known.length || facts.length ? `<h4>What you know</h4><ul class="pfacts">${known.concat(facts).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="dim">Ask them about themselves to learn more.</p>'}
    ${ties.length ? `<h4>Ties</h4><ul class="pfacts">${ties.join('')}</ul>` : ''}
    ${typeof htmlFamilyOf === 'function' ? htmlFamilyOf(ledgerSel) : ''}</div></div>`;
  const all = P_.facts.filter(f => ['ned', 'hilde', 'berta', 'mortimer', 'aldous', 'rolf', 'gil', 'ilse'].includes(f.who));
  if (all.length) html += `<h3>Threads</h3><ul class="pfacts">${all.map(f => `<li>${esc(f.text)}</li>`).join('')}</ul>`;
  if (typeof htmlHouseholds === 'function') html += htmlHouseholds();
  return html;
}
function dutyHint(id) {
  const d = DUTIES[id], st = dutyState(id);
  if (d.kind === 'pray') return st === 'prayed' ? (dutyReady(id) ? 'Go and tell them you prayed' : 'Prayed; return tomorrow') : 'Pray at the temple altar or Halvard\'s sun-disc';
  if (d.kind === 'bring') return 'Bring ' + Object.entries(d.need).map(([k, n]) => `${Math.min(haveCount(k), n)}/${n} ${thingName(k)}`).join(', ');
  if (d.kind === 'deliver') return parish().carry === id ? `Take ${d.carry} to ${PEOPLE[d.who].name}` : 'Find it on Halvard\'s bookshelf';
  if (d.kind === 'heal') return 'Heal them: a spell, a potion, or healroot';
  return '';
}
