// The quest journal: every open task in one place (the main quest, parish duties, gods' shrines and the
// first-steps tutorial), one of them tracked, with a marker on the map and minimap pointing the way.
// Q opens it. State: S.journal = { track, tut: {stepId: day}, flags }.

function jState() { if (!S) return null; const j = S.journal || (S.journal = { track: null, tut: {}, flags: {} }); j.tut = j.tut || {}; j.flags = j.flags || {}; return j; }

// ---------- finding things ----------
function jNpc(who) {
  for (const id in S.maps) { const m = S.maps[id]; const n = (m.npcs || []).find(n => n.who === who); if (n) return { map: id, x: n.x, y: n.y }; }
  return null;
}
function jParent(id) {
  if (id === 'town') return null;
  if (id.startsWith('in_') || ['temple', 'parsonage', 'home', 'wilds', 'hall'].includes(id)) return 'town';
  try { return mapInfo(id).parent; } catch (e) { return 'town'; }
}
function jChain(id) { const out = []; let c = id, n = 0; while (c && n++ < 30) { out.unshift(c); c = jParent(c); } return out; }
// where on the current map to walk next, to get toward a spot on any map
function jWayPoint(tgt) {
  if (!tgt) return null;
  const cur = S.mapId; if (tgt.map === cur) return { x: tgt.x, y: tgt.y, here: true };
  const chain = jChain(tgt.map), i = chain.indexOf(cur);
  const next = i >= 0 ? chain[i + 1] : jParent(cur);
  if (!next) return null;
  const m = curMap();
  for (const k in m.links || {}) if (m.links[k] === next) { const [x, y] = k.split(',').map(Number); return { x, y, via: next }; }
  for (const k in m.trig || {}) if (m.trig[k] && m.trig[k].go === next) { const [x, y] = k.split(',').map(Number); return { x, y, via: next }; }
  // an interior's door: stand where its exit sets you down
  if (cur === 'town' && S.maps[next]) { const ex = Object.values(S.maps[next].trig || {}).find(v => v && v.go === 'town' && v.at); if (ex) return { x: ex.at[0], y: ex.at[1], via: next }; }
  if (cur === 'town' && next === 'temple') return { x: TEMPLE_OUT[0], y: TEMPLE_OUT[1], via: next };
  return null;
}
const jName = id => { if (id === 'town') return 'Brambleford'; const m = S.maps[id]; if (m && m.name) return m.name; try { return mapInfo(id).name; } catch (e) { return id; } };
function jShrine(god) { for (const id in S.maps) { const m = S.maps[id]; if (m.shrine && m.decor && m.decor[K(m.shrine[0], m.shrine[1])] === 'shrine_' + god) return { map: id, x: m.shrine[0], y: m.shrine[1] }; } return null; }
function jHalvard() { for (const id in S.maps) { const g = (S.maps[id].ground || []).find(g => g.story === 'halvard'); if (g) return { map: id, x: g.x, y: g.y }; } return { map: 'd3', x: 0, y: 0, far: 1 }; }
function jLinkTo(mapId, child) { const m = S.maps[mapId]; if (!m) return { map: child, x: 0, y: 0, far: 1 }; for (const k in m.links) if (m.links[k] === child) { const [x, y] = k.split(',').map(Number); return { map: mapId, x, y }; } return { map: child, x: 0, y: 0, far: 1 }; }

// ---------- the first steps: a short tour of the valley for a new acolyte ----------
const TUTORIAL = [
  ['talk', 'Talk to someone in town', 'Walk up to anyone in Brambleford and press Act (or walk into them). Everyone has a story.', () => Object.keys((S.parish || {}).met || {}).length > 0, () => { const n = (S.maps.town.npcs || [])[0]; return n ? { map: 'town', x: n.x, y: n.y } : null; }],
  ['temple', 'Visit the temple of Aurel', 'Halvard’s temple stands on the hill in the north-west corner of town. It is yours to keep now.', () => !!(S.story && S.story.templeIn), () => ({ map: 'temple', x: 0, y: 0, far: 1 })],
  ['pack', 'Look in your pack', 'Open your pack (I, or the Pack button) to see what you carry, and wear or use things from it.', () => !!jState().flags.pack, null],
  ['buy', 'Buy something in a shop', 'Shopkeepers keep their counters during the day. Torches and potions from Wendell are a good start.', () => !!jState().flags.bought, () => { const t = S.maps.town; for (const k in t.trig) if (t.trig[k].shop === 'general') { const [x, y] = k.split(',').map(Number); return { map: 'town', x, y }; } return null; }],
  ['codex', 'Open the Codex', 'Press E, or the Codex button, to see the bestiary, every item you have found, your achievements and statistics.', () => !!jState().flags.codex, null],
  ['duty', 'Take on a parish duty', 'Townsfolk with something on their mind will ask for help: a prayer, a remedy, an errand. Say yes to one.', () => Object.keys((S.parish || {}).duties || {}).some(id => id !== 'anselm_intro'), null],
  ['road', 'Walk out along the North Road', 'Leave town by the north gate. The road runs up into the hills, past the Whisperwood and the cave mouth.', () => !!S.maps.wilds && !!jState().flags.wilds, () => ({ map: 'wilds', x: 22, y: 26 })],
  ['fight', 'Win your first fight', 'Rats in the cellars, wolves on the road. In live combat swing with Space or the Swing button (hold for a heavy blow); in classic combat walk into a foe.', () => P().kills >= 1, null],
  ['gather', 'Gather something wild', 'Walk onto herbs, mushrooms, ore or driftwood to gather them. Press G to pick up loot.', () => Object.keys(P().mats || {}).some(id => P().mats[id] > 0 && MATS[id] && (MATS[id].cat === 'herb' || MATS[id].forage)), null],
  ['cave', 'Enter the caves', 'The cave mouth lies off the North Road. Bring light. Father Halvard went down there, and never came back.', () => !!S.maps.d1, () => ({ map: 'd1', x: 0, y: 0, far: 1 })],
];
const TUT_REWARD = 60;
function tutStep() { const j = jState(); return TUTORIAL.find(t => !j.tut[t[0]]); }
function tutTick() {
  const j = jState(); if (!j || j.tutDone) return;
  let changed = false;
  for (const [id, title, , test] of TUTORIAL) {
    if (j.tut[id]) continue;
    let ok = false; try { ok = !!test(); } catch (e) { }
    if (ok) { j.tut[id] = S.day; changed = true; if (!j.tutQuiet) { msg(`First steps: ${title}. Done.`, 'good'); if (typeof sfx === 'function') sfx('pickup'); } }
  }
  if (!tutStep()) {
    j.tutDone = S.day;
    if (!j.tutQuiet) { P().gold += TUT_REWARD; addItem(makeItem('pheal')); msg(`You have found your feet in the valley. (+${TUT_REWARD} gold, a potion of healing)`, 'level'); if (typeof sfx === 'function') sfx('level'); }
    if (j.track === 'tut') j.track = null;
  }
  return changed;
}

// ---------- the list of everything open ----------
function jQuests() {
  const out = [], j = jState(), st = S.story || {};
  // the main quest
  const seals = KINGDOM_ORDER.filter(k => S.seals[k]).length;
  let main;
  if (!st.halvard) main = ['Find Father Halvard', 'Halvard went down into the caves under the mountain and never came back. The deeper levels lie through the cave mouth off the North Road.', jHalvard()];
  else if (!st.junction) main = ['Reach the junction on cave level 3', 'Below Halvard’s resting place the tunnels split four ways.', { map: 'd3', x: 0, y: 0, far: 1 }];
  else if (seals < 4) { const k = KINGDOM_ORDER.find(k => !S.seals[k]); main = [`Recover the four kingdom seals (${seals}/4)`, `Each kingdom’s ruler holds a seal. Next: ${cap(KINGDOMS[k].name)}, where ${KINGDOMS[k].folk} rule, four levels below the junction.`, { map: k + '4', x: 0, y: 0, far: 1 }]; }
  else if (!st.gate) main = ['Open the sealed door', 'Carry the four seals to the great door at the junction.', S.maps.d3 && S.maps.d3.gate ? { map: 'd3', x: S.maps.d3.gate[0], y: S.maps.d3.gate[1] } : { map: 'd3', x: 0, y: 0, far: 1 }];
  else if (!S.wyrmSlain) main = ['Face what sleeps in the Deep', 'The door is open. Go down.', { map: 'deep', x: 0, y: 0, far: 1 }];
  if (main) out.push({ id: 'main', group: 'Main quest', title: main[0], desc: main[1], target: main[2], kicker: 'The Missing Priest' });
  // first steps
  if (!j.tutDone) {
    const t = tutStep();
    if (t) out.push({ id: 'tut', group: 'First steps', title: t[1], desc: t[2], target: t[4] ? t[4]() : null, kicker: `First steps ${TUTORIAL.filter(x => j.tut[x[0]]).length + 1} of ${TUTORIAL.length}`, steps: TUTORIAL.map(x => [x[1], !!j.tut[x[0]]]) });
  }
  // parish duties
  const P_ = S.parish;
  if (P_) for (const id in P_.duties) {
    const d = DUTIES[id], ds = P_.duties[id]; if (!d || ds.st === 'done') continue;
    const who = PEOPLE[d.who] ? PEOPLE[d.who].name : d.who;
    let desc = '', target = jNpc(d.who), ready = typeof dutyReady === 'function' && dutyReady(id);
    if (d.kind === 'pray') desc = ds.st === 'prayed' ? (ready ? `You prayed for it. Tell ${who}.` : 'You prayed. Give it a day, then tell them.') : 'Kneel at the temple altar, or Halvard’s sun-disc in the parsonage, and pray for it.';
    if (d.kind === 'pray' && ds.st !== 'prayed') target = { map: 'temple', x: 0, y: 0, far: 1 };
    if (d.kind === 'bring') desc = 'Bring: ' + Object.entries(d.need).map(([k, n]) => `${thingName(k)} ${Math.min(haveCount(k), n)}/${n}`).join(', ') + (ready ? `. You have it all; take it to ${who}.` : '.');
    if (d.kind === 'deliver') { if (P_.carry === id) desc = `Give ${d.carry} to ${who}.`; else { desc = d.pickup === 'chronicle' ? 'It should be on Halvard’s bookshelf in the parsonage.' : 'Collect it first.'; if (d.pickup === 'chronicle') target = { map: 'parsonage', x: 0, y: 0, far: 1 }; } }
    if (d.kind === 'heal') desc = d.sick || 'Find a way to heal them.';
    if (d.kind === 'counsel') desc = `${who} wants your counsel.`;
    out.push({ id: 'duty:' + id, group: 'Parish', title: d.title, desc, target, kicker: `For ${who}`, ready });
  }
  // gods whose shrines you have found but not yet earned
  for (const g of GOD_ORDER) {
    if (P().gods[g]) continue; const at = jShrine(g); if (!at) continue;
    const G = GODS[g]; out.push({ id: 'god:' + g, group: 'The gods', title: `Pass the trial of ${G.name}`, desc: `${G.name}, ${G.title}. Shrine: ${G.where}. Gift: ${G.power.name}.`, target: at, kicker: 'Shrine found' });
  }
  return out;
}
function jTracked() {
  const j = jState(); if (!j) return null; const qs = jQuests();
  let q = qs.find(q => q.id === j.track);
  if (!q && j.track !== 'none') q = qs.find(q => q.id === 'tut') || qs.find(q => q.ready) || qs.find(q => q.id === 'main');
  return q || null;
}

// ---------- the window ----------
function openJournal() {
  if (!S || dead) return;
  tutTick();
  const draw = () => {
    const qs = jQuests(), tr = jTracked(), groups = [...new Set(qs.map(q => q.group))];
    $('#modal-body').innerHTML = `<p class="dim">Tap a task to track it. The tracked task shows on your quest panel, with a gold marker on the map and minimap pointing the way.</p>` +
      groups.map(g => `<div class="jq-group"><h3>${esc(g)}</h3>${qs.filter(q => q.group === g).map(q => {
        const wp = q.target ? jWayPoint(q.target) : null, where = q.target ? (q.target.map === S.mapId ? 'Here' : jName(q.target.map)) : '';
        return `<button class="jq ${tr && tr.id === q.id ? 'on' : ''} ${q.ready ? 'ready' : ''}" data-jq="${esc(q.id)}"><span class="jq-k">${esc(q.kicker || '')}${where ? ` · ${esc(where)}` : ''}</span><b>${esc(q.title)}</b><small>${esc(q.desc)}</small>${q.steps ? `<span class="jq-steps">${q.steps.map(([t, d]) => `<i class="${d ? 'done' : ''}" title="${esc(t)}"></i>`).join('')}</span>` : ''}${tr && tr.id === q.id ? '<em class="jq-tr">Tracking</em>' : ''}</button>`;
      }).join('')}</div>`).join('') +
      (S.journal.track !== 'none' ? '<div class="btnrow"><button class="btn ghost" data-jq="none">Hide the marker</button></div>' : '') +
      (jState().tutDone ? '' : '');
  };
  openModal('Journal', '', { refresh: draw, wide: true }); draw();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-jq]'); if (!b || !S) return;
  const v = b.dataset.jq; if (v === 'open') return openJournal();
  jState().track = v; if (typeof sfx === 'function') sfx('click'); refresh();
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.key === 'q' || e.key === 'Q') && S && !modalOpen && !dead) { openJournal(); e.preventDefault(); }
});

// ---------- the quest panel shows the tracked task ----------
{
  const _qh = questHtml;
  questHtml = function () {
    const base = _qh.apply(this, arguments);
    let extra = '';
    try {
      const t = jTracked();
      if (t && t.id !== 'main') {
        const wp = t.target ? jWayPoint(t.target) : null;
        extra = `<div class="q-track"><span class="q-kicker">${esc(t.kicker || t.group)}</span><b>${esc(t.title)}</b>${t.target ? `<small>${t.target.map === S.mapId ? 'Here' : esc(jName(t.target.map))}</small>` : ''}</div>`;
      }
    } catch (e) { }
    return base + extra + `<button class="q-journal" data-jq="open">Journal <kbd>Q</kbd></button>`;
  };
}

// ---------- the marker ----------
function jMarker() {
  const t = jTracked(); if (!t || !t.target) return null;
  const wp = jWayPoint(t.target); if (!wp) return null;
  if (wp.here && t.target.far) return null;
  return wp;
}
{
  const _rm = renderMap;
  renderMap = function () {
    _rm.apply(this, arguments);
    try {
      if (!S || dead) return;
      const wp = jMarker(); if (!wp) return;
      const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), now = performance.now();
      const x = ox + (wp.x + 0.5) * TS, y = oy + wp.y * TS - TS * 0.2 + Math.sin(now / 260) * TS * 0.08;
      ctx.save();
      const W = r.width, H = r.height, pad = 26;
      if (x > pad && x < W - pad && y > pad + 40 && y < H - pad) {
        // a gold diamond bobbing over the spot
        const s = TS * 0.22;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, oy + (wp.y + 0.85) * TS, TS * 0.22, TS * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.7, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.7, y); ctx.closePath();
        ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#3a2508'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.7); ctx.lineTo(x + s * 0.25, y - s * 0.1); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      } else {
        // off screen: an arrow at the edge pointing toward it
        const cx = W / 2, cy = H / 2, a = Math.atan2(y - cy, x - cx);
        const k = Math.min((W / 2 - pad) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - pad) / Math.abs(Math.sin(a) || 1e-6));
        const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
        ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#3a2508'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    } catch (e) { }
  };
}
{
  const _dm = drawMinimap;
  drawMinimap = function () {
    _dm.apply(this, arguments);
    try {
      const wp = S && !dead && jMarker(); if (!wp) return;
      const c = $('#minimap'), g = c.getContext('2d'), m = curMap();
      const s = Math.min(c.width / m.w, c.height / m.h), ox = (c.width - m.w * s) / 2, oy = (c.height - m.h * s) / 2;
      const x = ox + (wp.x + 0.5) * s, y = oy + (wp.y + 0.5) * s, r = Math.max(2.5, s * 1.4);
      g.fillStyle = '#ffd27a'; g.strokeStyle = '#2a1a06'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); g.stroke();
    } catch (e) { }
  };
}

// ---------- watching for tutorial moments ----------
{
  const _msg = msg;
  msg = function (text) { const r = _msg.apply(this, arguments); try { if (S && typeof text === 'string' && /^You buy /.test(text)) jState().flags.bought = 1; } catch (e) { } return r; };
}
{
  const _ot = openTabs;
  openTabs = function (title, tabs, cur) { try { if (S) { if (tabs.some(t => t[0] === 'inv') && (cur || 'inv') === 'inv') jState().flags.pack = 1; if (title === 'Codex') jState().flags.codex = 1; } } catch (e) { } return _ot.apply(this, arguments); };
}
setInterval(() => {
  try {
    if (!S || dead) return; const j = jState();
    if (S.mapId === 'wilds') j.flags.wilds = 1;
    // an old save: tick off what has already been done without fanfare, and leave the tour untracked
    if (j.tutQuiet === undefined) { j.tutQuiet = 1; tutTick(); if (S.day > 1 || P().kills > 0) { if (!j.track) j.track = 'main'; } j.tutQuiet = 0; return; }
    if (tutTick()) render();
  } catch (e) { }
}, 1000);
