// Guilds. Brambleford is too small for more than one: the Watch, the town militia, which takes its orders from
// Captain Hale outside the town hall. The other is no guild the town would admit to: the Quiet Hand, which
// fences goods out of the Midden Market under Nib's whiskers. Each has four ranks earned by jobs; each rank
// brings something. A Watch captain cannot be a master of the Hand, nor the other way round.
// State: S.guild = { watch: { rank, done, job }, hand: { rank, done, job } }

const GUILDS = {
  watch: { name: 'The Brambleford Watch', leader: 'Captain Roswitha Hale', ranks: ['Recruit', 'Watchman', 'Sergeant', 'Captain'], need: [0, 2, 5, 9], join: 0,
    pitch: '“The Watch is twelve farmers with spears and me,” says Captain Hale. “The road’s worse every season. If you can fight, I can use you. The pay is fair and the beer at the Fox is free.”',
    perks: ['', '10% off at Bran’s and Hilde’s.', 'The Watch’s shield: a sturdy buckler with the town’s ford on it.', 'The captain’s blade, and the town’s thanks.'] },
  hand: { name: 'The Quiet Hand', leader: 'Nib', ranks: ['Lookout', 'Lifter', 'Fence', 'Master of the Hand'], need: [0, 2, 5, 9], join: 50,
    pitch: '“Nib knows things. Nib moves things. Nib does not ask where things come from,” the ratkin whispers. “Fifty gold to join the Hand. Then Nib finds you work, and buys what others will not.”',
    perks: ['', 'Nib buys your goods at 60% of their worth.', 'A shadowhide cloak that turns blows aside. Nib pays 75%.', 'Nib pays 90%, and the Hand owes you.'] },
};
const WATCH_JOBS = [
  { id: 'wolves', title: 'Wolves on the North Road', ids: ['wolf'], n: 4, pay: 50, where: 'f1', desc: 'Drovers lost two sheep and nearly a boy. Thin out the wolves in the Whisperwood.' },
  { id: 'rats', title: 'Rats in the cellars', ids: ['rat', 'r_swarm'], n: 8, pay: 35, where: 'd1', desc: 'They come up from the caves into the inn’s cellar. Kill them where they breed.' },
  { id: 'spiders', title: 'Spiders by the mine road', ids: ['cspider'], n: 4, pay: 45, where: 'd2', desc: 'A carter was bitten and nearly died. Clear the cave spiders.' },
  { id: 'boars', title: 'Boar in the barley', ids: ['boar'], n: 3, pay: 40, where: 'f1', desc: 'Wild boar are rooting up the fields. The farmers want them gone, and the inn wants the meat.' },
  { id: 'dead', title: 'The restless dead', ids: ['skeleton', 'c_bones', 'c_ghoul'], n: 5, pay: 70, where: 'd2', desc: 'People are hearing things at night by the cave mouth. Put the dead back down.' },
  { id: 'goblins', title: 'Goblin raiders', ids: ['g_scrapper', 'g_slinger', 'g_rider', 'g_hob'], n: 6, pay: 90, where: 'g1', desc: 'Goblins have been seen on the North Road with sacks. Drive them back into Gnarlhold.' },
  { id: 'bear', title: 'The bear at the woodlot', ids: ['bear'], n: 1, pay: 80, where: 'f2', desc: 'A black bear has taken to the woodcutters’ camp. Deal with it.' },
];
const HAND_JOBS = [
  { id: 'silver', title: 'Silver, no questions', mat: 'silver', n: 3, pay: 80, desc: 'A buyer wants raw silver. Bring Nib three lumps of silver ore.' },
  { id: 'silk', title: 'Silk for a lady', mat: 'silk', n: 5, pay: 55, desc: 'Fine spider silk for a lady in Highcourt who must not know where it came from.' },
  { id: 'shards', title: 'Bright stones', mat: 'shard', n: 3, pay: 90, desc: 'Mana shards. The Arcanum pays poorly; Nib knows people who pay well.' },
  { id: 'moon', title: 'Moonpetal', mat: 'moonpetal', n: 2, pay: 70, desc: 'Moonpetal from the Hollows. For a sleeping draught. A very deep sleeping draught.' },
  { id: 'gem', title: 'A soul gem', mat: 'soulgem', n: 1, pay: 160, desc: 'One soul gem. Nib will not say for whom. Nib’s whiskers shiver.' },
  { id: 'pelts', title: 'Pelts for the market', mat: 'pelt', n: 3, pay: 60, desc: 'Good wolf pelts, no holes. The Gnawing Court is cold this season.' },
];
Object.assign(ITEMS, {
  watch_shield: { id: 'watch_shield', name: 'Shield of the Watch', spr: null, cat: 'armor', slot: 'shield', cls: 'shieldl', grade: 'steel', def: 3, atk: 0, mp: 0, val: 180, tier: 99, wt: 6, note: 'Painted with the ford of Brambleford' },
  captain_blade: { id: 'captain_blade', name: 'Captain’s Blade', cat: 'weapon', slot: 'weapon', cls: 'sword', grade: 'silver', dtype: 'slash', dmg: [5, 12], atk: 2, mp: 0, spell: 0, val: 600, tier: 99, wt: 3, note: 'Silvered, and kept keen. Extra damage to undead' },
  hand_cloak: { id: 'hand_cloak', name: 'Cloak of the Quiet Hand', cat: 'armor', slot: 'armor', cls: 'leather', grade: 'silver', def: 4, atk: 0, mp: 0, dodge: 0.12, val: 400, tier: 99, wt: 5, note: 'Sometimes dodge blows entirely. Easier to go unseen' },
});
for (const id of ['watch_shield', 'captain_blade', 'hand_cloak']) delete ITEMS[id].spr;

const gld = () => { const g = S.guild || (S.guild = {}); for (const k in GUILDS) g[k] = g[k] || { rank: -1, done: 0, job: null }; return g; };
const inGuild = k => gld()[k].rank >= 0;
const killSum = ids => { try { const c = cxState(); return ids.reduce((a, id) => a + (c.kills[id] || 0), 0); } catch (e) { return 0; } };
function jobOffer(k) {
  const G = gld()[k], list = k === 'watch' ? WATCH_JOBS : HAND_JOBS, last = G.last;
  const pool = list.filter(j => j.id !== last);
  return pool[(S.day * 7 + G.done * 3) % pool.length];
}
function jobProgress(k) {
  const job = gld()[k].job; if (!job) return null;
  if (job.ids) return Math.max(0, killSum(job.ids) - job.start);
  return Math.min(job.n, (P().mats[job.mat] || 0));
}
function openGuild(k) {
  const draw = () => {
    const G = gld()[k], D = GUILDS[k], p = P(), other = k === 'watch' ? 'hand' : 'watch';
    let html = `<p class="lead">${D.pitch}</p>`;
    if (G.rank < 0) {
      html += `<p class="dim">Ranks: ${D.ranks.join(' → ')}.</p><div class="btnrow"><button class="btn default" data-gd="join:${k}" ${p.gold >= D.join ? '' : 'disabled'}>Join ${D.name}${D.join ? ` (${D.join} gold)` : ''}</button></div>`;
    } else {
      const next = D.need[G.rank + 1], blocked = G.rank + 1 === 3 && gld()[other].rank >= 2;
      html += `<div class="gd-rank"><b>${D.ranks[G.rank]}</b> of ${D.name} · ${G.done} job${G.done === 1 ? '' : 's'} done${next != null ? ` · ${D.ranks[G.rank + 1]} at ${next}` : ''}</div>`;
      if (blocked) html += `<p class="warn">${D.leader} will not raise you to ${D.ranks[3]} while you hold rank in ${GUILDS[other].name}.</p>`;
      html += `<h3>Perks</h3><ul class="gd-perks">${D.perks.slice(1).map((t, i) => `<li class="${G.rank >= i + 1 ? 'on' : ''}"><b>${D.ranks[i + 1]}:</b> ${t}</li>`).join('')}</ul>`;
      const job = G.job;
      html += '<h3>Work</h3>';
      if (!job) { const j = jobOffer(k); html += `<div class="row"><div class="nm"><b>${j.title}</b><small>${j.desc}</small><small>${j.ids ? `Kill ${j.n}` : `Bring ${j.n} ${MATS[j.mat].name}`} · ${j.pay} gold</small></div><div class="acts"><button class="btn tiny default" data-gd="take:${k}:${j.id}">Take it</button></div></div>`; }
      else {
        const prog = jobProgress(k), ready = prog >= job.n;
        html += `<div class="row"><div class="nm"><b>${job.title}</b><small>${job.desc}</small><small>${job.ids ? 'Killed' : 'Carrying'} ${Math.min(prog, job.n)}/${job.n} · ${job.pay} gold</small></div><div class="acts">${ready ? `<button class="btn tiny default" data-gd="turnin:${k}">${job.ids ? 'Report' : 'Hand over'}</button>` : ''}<button class="btn tiny ghost" data-gd="drop:${k}">Give up</button></div></div>`;
      }
      if (k === 'hand' && G.rank >= 1) {
        const rate = G.rank >= 3 ? 0.9 : G.rank >= 2 ? 0.75 : 0.6;
        const goods = p.inv.filter(it => !Object.values(p.equip).includes(it) && T(it).cat !== 'story' && itemValue(it) > 0).slice(0, 30);
        html += `<h3>Nib buys <span class="dim">${Math.round(rate * 100)}% of worth</span></h3>${goods.length ? `<div class="list">${goods.map(it => itemRow(it, `<button class="btn tiny" data-gd="fence:${it.uid}">Sell ${Math.max(1, Math.floor(itemValue(it) * rate * (it.q || 1)))}</button>`)).join('')}</div>` : '<p class="dim">You carry nothing Nib wants.</p>'}`;
      }
    }
    $('#modal-body').innerHTML = html;
  };
  openModal(GUILDS[k].name, '', { refresh: draw, wide: true }); draw();
}
function promote(k) {
  const G = gld()[k], D = GUILDS[k], other = k === 'watch' ? 'hand' : 'watch';
  while (G.rank < 3 && G.done >= D.need[G.rank + 1] && !(G.rank + 1 === 3 && gld()[other].rank >= 2)) {
    G.rank++;
    msg(`${D.leader}: you are made ${D.ranks[G.rank]} of ${D.name}. ${D.perks[G.rank]}`, 'level'); if (typeof sfx === 'function') sfx('level');
    if (k === 'watch' && G.rank === 2) addItem(makeItem('watch_shield'));
    if (k === 'watch' && G.rank === 3) addItem(makeItem('captain_blade'));
    if (k === 'hand' && G.rank === 2) addItem(makeItem('hand_cloak'));
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gd]'); if (!b || !S) return;
  const [v, k, x] = b.dataset.gd.split(':'), G = gld()[k], p = P();
  if (v === 'open') { openGuild(k); return; }
  if (v === 'join') { if (p.gold < GUILDS[k].join) return; p.gold -= GUILDS[k].join; G.rank = 0; msg(`You join ${GUILDS[k].name} as a ${GUILDS[k].ranks[0]}.`, 'level'); }
  else if (v === 'take') { const j = (k === 'watch' ? WATCH_JOBS : HAND_JOBS).find(j => j.id === x); G.job = Object.assign({}, j, j.ids ? { start: killSum(j.ids) } : {}); msg(`${GUILDS[k].leader} gives you work: ${j.title}.`, 'talk'); }
  else if (v === 'drop') { G.last = G.job && G.job.id; G.job = null; }
  else if (v === 'turnin') {
    const job = G.job; if (!job || jobProgress(k) < job.n) return;
    if (job.mat) p.mats[job.mat] -= job.n;
    p.gold += job.pay; G.done++; G.last = job.id; G.job = null; useSkill('speech', 5);
    msg(`${job.title}: done. ${GUILDS[k].leader} pays you ${job.pay} gold.`, 'gold'); promote(k);
  } else if (v === 'fence') {
    const it = p.inv.find(o => String(o.uid) === x); if (!it) return;
    const rate = G.rank >= 3 ? 0.9 : G.rank >= 2 ? 0.75 : 0.6, gold = Math.max(1, Math.floor(itemValue(it) * rate * (it.q || 1)));
    p.inv = p.inv.filter(o => o !== it); p.gold += gold; msg(`Nib takes the ${itemName(it)} and counts out ${gold} gold without looking at it twice.`, 'gold');
  }
  refresh();
});
// Watchmen get a discount from the town's smiths
{
  const _bp = buyPrice;
  buyPrice = function (shopId) { const v = _bp.apply(this, arguments); try { if ((shopId === 'weapons' || shopId === 'armor') && S.guild && S.guild.watch && S.guild.watch.rank >= 1) return Math.max(1, Math.round(v * 0.9)); } catch (e) { } return v; };
}

// Captain Hale stands by the town hall steps
function placeCaptain(m) {
  if (!m || m.id !== 'town' || m.npcs.some(n => n.guild === 'watch')) return;
  const hall = (m.landmarks || []).find(l => l.spec && l.spec.kind === 'townhall'); if (!hall) return;
  const y = hall.y + hall.h, dx = hall.x + hall.spec.door;
  for (const x of [dx + 2, dx - 2, dx + 3, dx - 3, dx + 1]) {
    for (const yy of [y, y + 1]) {
      if (!walkable(m, x, yy) || m.npcs.some(n => n.x === x && n.y === yy) || m.trig[K(x, yy)]) continue;
      m.npcs.push({ spr: 'guard', name: 'Captain Roswitha Hale', guild: 'watch', x, y: yy, fixed: true, lines: ['Keep your blade clean and your eyes open.'] });
      return;
    }
  }
}
setInterval(() => { try { if (S && S.maps && S.maps.town) placeCaptain(S.maps.town); } catch (e) { } }, 2000);
{
  const _act = act;
  act = function (dx, dy) {
    try {
      if (S && !modalOpen && !dead && (dx || dy)) {
        const m = curMap(), p = P(), n = m.npcs.find(o => o.x === p.x + dx && o.y === p.y + dy && o.guild);
        if (n) { setFacing(p, dx, dy); openGuild(n.guild); return; }
      }
    } catch (e) { console.error(e); }
    return _act.apply(this, arguments);
  };
}
// Nib, at the Midden Market, keeps the Hand's business
if (typeof openParley === 'function') {
  const _op = openParley;
  openParley = function (mon) {
    _op.apply(this, arguments);
    if (!mon || mon.trader !== 'r') return;
    const add = () => { const body = $('#modal-body'); if (body && !body.querySelector('[data-gd]')) body.insertAdjacentHTML('beforeend', `<h3>The Quiet Hand</h3><p class="dim">Nib’s other business.</p><div class="btnrow"><button class="btn" data-gd="open:hand">Ask about the Hand</button></div>`); };
    const d = modalRefresh; modalRefresh = () => { d(); add(); }; add();
  };
}
// the journal shows your guild work
{
  const _jq = jQuests;
  jQuests = function () {
    const out = _jq.apply(this, arguments);
    try {
      for (const k in GUILDS) {
        const G = gld()[k], job = G.job;
        if (!job) { if (k === 'watch' && G.rank < 0 && S.day >= 1) out.push({ id: 'gd:watchjoin', group: 'Guilds', title: 'Join the Watch', desc: 'Captain Hale is looking for fighters to keep the roads safe. Find her by the town hall steps.', target: (() => { const n = S.maps.town.npcs.find(n => n.guild === 'watch'); return n ? { map: 'town', x: n.x, y: n.y } : null; })(), kicker: 'The Brambleford Watch' }); continue; }
        const prog = jobProgress(k), ready = prog >= job.n;
        const boss = k === 'watch' ? (() => { const n = S.maps.town.npcs.find(n => n.guild === 'watch'); return n ? { map: 'town', x: n.x, y: n.y } : null; })() : { map: 'n1', x: 0, y: 0, far: 1 };
        out.push({ id: 'gd:' + k, group: 'Guilds', title: job.title, desc: `${job.desc} ${job.ids ? 'Killed' : 'Carrying'} ${Math.min(prog, job.n)}/${job.n}.${ready ? ` Report to ${GUILDS[k].leader}.` : ''}`, target: ready ? boss : job.where ? { map: job.where, x: 0, y: 0, far: 1 } : null, kicker: GUILDS[k].name, ready });
      }
    } catch (e) { }
    return out;
  };
}
try {
  ACHIEVEMENTS.push(['watch', 'On the Watch', 'Join the Brambleford Watch.', () => inGuild('watch'), 'life']);
  ACHIEVEMENTS.push(['captain', 'Captain of the Watch', 'Rise to captain of the Watch.', () => gld().watch.rank >= 3, 'life']);
  ACHIEVEMENTS.push(['hand', 'Quiet Hands', 'Join the Quiet Hand.', () => inGuild('hand'), 'life']);
  ACHIEVEMENTS.push(['handmaster', 'Master of the Hand', 'Rise to master of the Quiet Hand.', () => gld().hand.rank >= 3, 'life']);
} catch (e) { }
