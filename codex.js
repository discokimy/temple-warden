// The Codex: a bestiary of every creature you have met, an encyclopedia of every item and material you have
// found, and a book of achievements. Opened with E, or the book button in the dock.
// State lives in S.codex: seen/kills per monster, found items and materials, counters, and unlocked achievements.

function cxState() {
  if (!S) return null;
  const c = S.codex || (S.codex = {});
  c.seen = c.seen || {}; c.kills = c.kills || {}; c.it = c.it || {}; c.mat = c.mat || {};
  c.n = c.n || {}; c.ach = c.ach || {}; c.seasons = c.seasons || {};
  return c;
}
const cxBump = (k, by = 1) => { const c = cxState(); if (c) c.n[k] = (c.n[k] || 0) + by; };

// ---------- the bestiary's words ----------
const CX_LORE = {
  rat: 'Fat on the scraps of the mountain. Where there is one, the old miners said, there are forty.',
  bat: 'They hang in the high cracks by the thousand and come down in a shrieking cloud at torchlight.',
  viper: 'A thin brown snake that lies in the warm dust by the cave mouth. Its bite burns for hours.',
  cspider: 'Pale and long-legged, it spins sheets of silk across the narrow tunnels and waits.',
  slime: 'A living puddle that eats what it flows over. Blades stick in it; clubs only spread it.',
  skeleton: 'Miners who died in the dark and were never given rites. Aurel’s priests pray for them still.',
  g_scrapper: 'The common goblin warrior: a rusted blade, a stolen pot for a helm, and no fear in numbers.',
  g_slinger: 'Hangs back behind the scrappers and pelts you with river stones. Close the distance.',
  g_sapper: 'Carries a pot of blasting powder and a lit fuse. Do not be standing next to it when it goes.',
  g_shaman: 'Mutters to the redcap spirits and patches up its kin. Kill it first.',
  g_hob: 'A head taller than its cousins and twice as mean. Gnarlhold’s brutes keep the others in line.',
  g_rider: 'A goblin on a tusked war-boar, all spite and momentum. The boar is the dangerous half.',
  r_swarm: 'A boiling carpet of rats that moves as one animal. The Gnawing Court breeds them for war.',
  r_skulker: 'A ratkin thief in dark rags. It will cut your purse as happily as your throat.',
  r_blowgun: 'Spits poisoned darts from the shadows. You hear the puff before you feel the sting.',
  r_plague: 'Swollen with sickness it carries proudly, as a priest carries a relic.',
  r_warlock: 'Ratkin magic is the magic of rot and multitudes. It calls the swarms and curses with a cough.',
  r_ogre: 'Something the Court bred too large to fit the tunnels. It does not mind breaking them.',
  h_stalker: 'Hollowfolk hunters who learned to fade into the dark. Watch for the air moving.',
  h_hound: 'Eyeless white hounds that hunt by smell and by the sound of your heart.',
  h_fisher: 'They fish the black lake with long barbed spears, and they fish for you the same way.',
  h_crawler: 'A pale centipede as long as a cart. The Hollowfolk keep them as watchdogs.',
  h_seer: 'Blind from birth, as all the Hollowfolk are, and yet it sees you plainly.',
  h_thrall: 'Once a lost miner or traveller. The Matriarch kept them, and now they keep her.',
  s_warrior: 'Sszarith’s soldiers: scaled, patient, disciplined. They fight in ranks like old legions.',
  s_spitter: 'Aims for the eyes. Keep your face turned and close in fast.',
  s_constrictor: 'A serpent kept in the temple pools. Once it has coiled round you, you are going nowhere.',
  s_priest: 'Keepers of the coiled faith, who say the world is a snake eating its own tail.',
  s_basilisk: 'Its gaze makes the limbs heavy as stone. The serpent people revere it as a god’s eye.',
  s_guard: 'The Hierophant’s chosen, armoured in bronze scale. They do not retreat.',
  rabbit: 'Good eating, quick to bolt. The Whisperwood is full of them in spring.',
  pheasant: 'Bursts out of the bracken with a racket that has frightened more hunters than any wolf.',
  deer: 'Shy red deer of the Whisperwood. The Wild Hunt is said to ride a white one.',
  boar: 'Leave it be and it will usually leave you be. Corner it, and it will open your leg.',
  wolf: 'Grey wolves hunt the Whisperwood in pairs and threes. Lately, they have grown bolder.',
  bear: 'A black bear in the deep woods. It wants honey and to be left alone; give it both.',
  greymaw: 'An old wolf, huge and grey to the muzzle, that has led the packs for twenty winters.',
  grotsnag: 'Self-crowned King of Gnarlhold, who swung his cleaver until the other chiefs knelt.',
  vesk: 'The great mother of the Gnawing Court. Every rat under the mountain is, in some way, hers.',
  matriarch: 'She has lived beside the black lake for longer than Brambleford has stood. Her lantern never goes out.',
  hierophant: 'High priest of Sszarith, who believes the Deep Wyrm is a god and the world its meal.',
  wyrm: 'The thing under the mountain. The four kingdoms sealed it away together, once, long ago.',
};
const CX_REGION = { upper: 'The Upper Caves', forest: 'The Whisperwood', deep: 'The Deep' };
const cxRegion = h => CX_REGION[h] || (KINGDOMS[h] ? cap(KINGDOMS[h].name) : 'Unknown');
const CX_REGION_ORDER = ['forest', 'upper', 'g', 'r', 'h', 's', 'deep'];
const cxStudy = id => MONSTERS[id].boss ? 1 : 5; // kills needed to learn its weaknesses and spoils

function cxTraits(t) {
  const a = [];
  if (t.boss) a.push('Boss');
  if (t.prey) a.push('Prey: runs from you');
  if (t.fast) a.push('Fast');
  if (t.slow) a.push('Slow');
  if (t.pack) a.push('Hunts in packs');
  if (t.erratic) a.push('Flits erratically');
  if (t.darksight) a.push('Sees in the dark');
  if (t.undead) a.push('Undead');
  if (t.invisible) a.push('Hides in shadow');
  if (t.poison) a.push('Venomous');
  if (t.sick) a.push('Spreads sickness');
  if (t.ranged) a.push(t.ranged.magic ? 'Casts spells' : 'Ranged attacks');
  if (t.ranged && t.ranged.fx) a.push({ poison: 'Poison darts', blind: 'Blinds', confuse: 'Confuses' }[t.ranged.fx]);
  if (t.reach) a.push('Long reach');
  if (t.heals) a.push('Heals its allies');
  if (t.summon) a.push('Calls ' + MONSTERS[t.summon].name + 's');
  if (t.explode) a.push('Explodes');
  if (t.steal) a.push('Steals gold');
  if (t.grab) a.push('Grabs and holds');
  if (t.slowgaze) a.push('Gaze slows you');
  if (t.senses) a.push('Senses the hidden');
  if (t.shy) a.push('Keeps its distance');
  return a;
}
function cxRes(t) {
  const r = t.res || {}, weak = [], tough = [];
  for (const k in r) (r[k] > 1 ? weak : tough).push(DTYPE[k].toLowerCase());
  if (t.undead) weak.push('silver');
  return [weak, tough];
}

// ---------- tracking ----------
if (typeof killMonster === 'function') {
  const _km = killMonster;
  killMonster = function (mon) {
    const live = S && curMap().mons.includes(mon);
    const r = _km.apply(this, arguments);
    if (live) { const c = cxState(); c.kills[mon.id] = (c.kills[mon.id] || 0) + 1; c.seen[mon.id] = 1; cxCheck(); }
    return r;
  };
}
if (typeof addItem === 'function') {
  const _ai = addItem;
  addItem = function (it) { const r = _ai.apply(this, arguments); const c = cxState(); if (c && it && it.id && !c.it[it.id]) { c.it[it.id] = 1; cxNew('item', it.id); } return r; };
}
if (typeof addMat === 'function') {
  const _am = addMat;
  addMat = function (id) { const r = _am.apply(this, arguments); const c = cxState(); if (c && MATS[id] && !c.mat[id]) { c.mat[id] = 1; cxNew('mat', id); } return r; };
}
// a few moments leave their mark only in the message log
if (typeof msg === 'function') {
  const _msg = msg;
  msg = function (text) {
    const r = _msg.apply(this, arguments);
    if (S && typeof text === 'string') {
      let m;
      if ((m = /^You catch an? (.+)\.$/.exec(text))) { cxBump('fish'); if (/Golden Carp/.test(m[1])) cxBump('goldcarp'); }
      else if (/^You beat .+ at Bramble/.test(text)) cxBump('cards');
      else if (/^You win an arm-wrestle/.test(text)) cxBump('arm');
      else if (/give it to the gods/.test(text)) cxBump('offer');
      else if (/^You gather|^You pick|^You harvest|^You cut/.test(text)) cxBump('gather');
    }
    return r;
  };
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-bn="stand"]'); if (!t || !S) return;
  setTimeout(() => { if (typeof BN !== 'undefined' && BN && /You win/.test(BN.result || '')) { cxBump('dice'); cxCheck(); } }, 0);
});
// What's in your pack, on your back and in plain sight gets noted down every second or so.
function cxNew(kind, id) { }
function cxScan() {
  const c = cxState(); if (!c || typeof dead !== 'undefined' && dead) return;
  const p = P();
  // the first look at an old save writes down what the hero already has, without a flood of banners
  if (!c.init) c.quiet = 1;
  for (const it of p.inv) if (it && it.id && !c.it[it.id]) c.it[it.id] = 1;
  for (const k in p.equip) { const it = p.equip[k]; if (it && it.id) c.it[it.id] = 1; }
  for (const id in p.mats) if (p.mats[id] > 0) c.mat[id] = 1;
  if (S.home && S.home.mats) for (const id in S.home.mats) if (S.home.mats[id] > 0) c.mat[id] = 1;
  const m = curMap();
  if (m && m.mons) for (const o of m.mons) if (!c.seen[o.id] && MONSTERS[o.id] && monVisible(o)) { c.seen[o.id] = 1; if (!c.quiet) cxToast('New in the bestiary', cap(MONSTERS[o.id].name), 'beast'); }
  if (m && !m.crypt && !/^cat/.test(m.id) && m.depth > (c.n.depth || 0)) c.n.depth = m.depth;
  try { c.seasons[season()] = 1; } catch (e) { }
  try { if (m && !m.inside && !m.underground && wxWet()) c.n.rain = 1; } catch (e) { }
  if (p.gold > (c.n.richest || 0)) c.n.richest = p.gold;
  cxCheck();
  if (c.quiet) { c.init = 1; delete c.quiet; }
}
setInterval(() => { try { if (S) cxScan(); } catch (e) { } }, 900);

// ---------- achievements ----------
const cxK = id => (cxState().kills[id] || 0);
const cxKillsWhere = f => Object.keys(cxState().kills).filter(id => MONSTERS[id] && f(id, MONSTERS[id])).reduce((a, id) => a + cxK(id), 0);
const cxFishIds = () => Object.keys(MATS).filter(id => MATS[id].spr === 'fish');
const cxForageIds = () => Object.keys(MATS).filter(id => MATS[id].forage || MATS[id].cat === 'herb');
const cxSkillMax = () => { try { const sk = skillsOf(); return Math.max(0, ...Object.values(sk)); } catch (e) { return 0; } };
const cxOwnsWhere = f => Object.keys(cxState().it).some(id => ITEMS[id] && f(ITEMS[id]));
const ACHIEVEMENTS = [
  // the fight
  ['blood', 'First Blood', 'Slay your first foe.', () => P().kills >= 1, 'fight'],
  ['hunter50', 'Monster Hunter', 'Slay 50 foes.', () => P().kills >= 50, 'fight'],
  ['hunter250', 'Scourge of the Mountain', 'Slay 250 foes.', () => P().kills >= 250, 'fight'],
  ['ratcatcher', 'Rat Catcher', 'Kill 25 rats of any kind.', () => cxKillsWhere(id => id === 'rat' || id[0] === 'r' && id[1] === '_') >= 25, 'fight'],
  ['bones', 'Rest Now', 'Put 10 restless dead back to sleep.', () => cxKillsWhere((id, t) => t.undead) >= 10, 'fight'],
  ['greymaw', 'Wolfsbane', 'Bring down Greymaw, the old wolf of the Whisperwood.', () => cxK('greymaw') > 0 || (S.bosses || {}).greymaw, 'fight'],
  ['grotsnag', 'Kingbreaker', 'Defeat King Grotsnag of Gnarlhold.', () => (S.bosses || {}).grotsnag, 'fight'],
  ['vesk', 'The Mother of Rats', 'Defeat Mother Vesk of the Gnawing Court.', () => (S.bosses || {}).vesk, 'fight'],
  ['matriarch', 'Lantern Out', 'Defeat the Pale Matriarch of the Hollows.', () => (S.bosses || {}).matriarch, 'fight'],
  ['hierophant', 'Uncoiled', 'Defeat the Coiled Hierophant of Sszarith.', () => (S.bosses || {}).hierophant, 'fight'],
  ['seals', 'Keeper of the Seals', 'Hold all four kingdom seals.', () => KINGDOM_ORDER.every(k => S.seals && S.seals[k]), 'fight'],
  ['wyrm', 'Wyrmslayer', 'Slay the Deep Wyrm.', () => !!S.wyrmSlain, 'fight'],
  // the explorer
  ['delve3', 'Into the Dark', 'Reach the third cave level.', () => (cxState().n.depth || 0) >= 3, 'explore'],
  ['delve8', 'Deep Delver', 'Go eight levels under the mountain.', () => (cxState().n.depth || 0) >= 8, 'explore'],
  ['temple', 'Pilgrim', 'Step inside the temple of Aurel.', () => S.story && S.story.templeIn, 'explore'],
  ['seasons', 'A Year in Brambleford', 'See all four seasons.', () => Object.keys(cxState().seasons).length >= 4, 'explore'],
  ['rain', 'Soaked Through', 'Be caught outdoors in the rain.', () => cxState().n.rain, 'explore'],
  ['naturalist', 'Naturalist', 'Meet 20 kinds of creature.', () => Object.keys(cxState().seen).length >= 20, 'explore'],
  ['allbeasts', 'The Complete Bestiary', 'Meet every creature in the valley and below it.', () => Object.keys(MONSTERS).every(id => cxState().seen[id]), 'explore'],
  ['scholar', 'Monster Scholar', 'Fully study 10 creatures.', () => Object.keys(MONSTERS).filter(id => cxK(id) >= cxStudy(id)).length >= 10, 'explore'],
  // the collector
  ['collect50', 'Magpie', 'Find 50 different items and materials.', () => cxFound() >= 50, 'collect'],
  ['collect120', 'Curator', 'Find 120 different items and materials.', () => cxFound() >= 120, 'collect'],
  ['mithril', 'True Silver', 'Own something made of mithril.', () => cxOwnsWhere(t => t.grade === 'mithril'), 'collect'],
  ['unique', 'Spoils of Kings', 'Claim a weapon from a fallen king or queen.', () => cxOwnsWhere(t => t.tier === 99 && t.cat === 'weapon'), 'collect'],
  ['masked', 'A New Face', 'Own a mask or a face-covering helm.', () => cxOwnsWhere(t => !!t.mask), 'collect'],
  ['rich', 'Heavy Purse', 'Carry 1,000 gold at once.', () => (cxState().n.richest || 0) >= 1000, 'collect'],
  ['spells', 'Spellbinder', 'Learn four spells.', () => (P().spells || []).length >= 4, 'collect'],
  // the townsfolk's life
  ['angler', 'Gone Fishing', 'Catch your first fish.', () => (cxState().n.fish || 0) >= 1, 'life'],
  ['angler25', 'Old Salt', 'Catch 25 fish.', () => (cxState().n.fish || 0) >= 25, 'life'],
  ['allfish', 'Master Angler', 'Catch every kind of fish.', () => cxFishIds().every(id => cxState().mat[id]), 'life'],
  ['goldcarp', 'The Golden One', 'Land a golden carp.', () => (cxState().n.goldcarp || 0) >= 1 || cxState().mat.goldcarp, 'life'],
  ['forager', 'Forager', 'Find 12 kinds of herb, fungus and moss.', () => cxForageIds().filter(id => cxState().mat[id]).length >= 12, 'life'],
  ['cards1', 'Bramble Player', 'Win a game of Bramble.', () => (cxState().n.cards || 0) >= 1, 'life'],
  ['cards10', 'Card Sharp', 'Win 10 games of Bramble.', () => (cxState().n.cards || 0) >= 10, 'life'],
  ['dice', 'Lucky Bones', 'Win a round of Bones.', () => (cxState().n.dice || 0) >= 1, 'life'],
  ['arm', 'Iron Grip', 'Win an arm-wrestle.', () => (cxState().n.arm || 0) >= 1, 'life'],
  ['offer', 'The Old Way', 'Make three offerings at the stone.', () => (cxState().n.offer || 0) >= 3, 'life'],
  ['land', 'Landholder', 'Own land of your own.', () => S.home && S.home.owned, 'life'],
  ['lv10', 'Seasoned', 'Reach level 10.', () => P().level >= 10, 'life'],
  ['lv20', 'Legend of the Valley', 'Reach level 20.', () => P().level >= 20, 'life'],
  ['skill50', 'Journeyman', 'Raise any skill to 50.', () => cxSkillMax() >= 50, 'life'],
  ['skill100', 'Master', 'Raise any skill to 100.', () => cxSkillMax() >= 100, 'life'],
];
const ACH_GROUPS = { fight: 'Battle', explore: 'Exploration', collect: 'Collection', life: 'Life in the valley' };
const cxFound = () => { const c = cxState(); return Object.keys(c.it).filter(id => ITEMS[id]).length + Object.keys(c.mat).filter(id => MATS[id]).length; };
let cxChecking = false;
function cxCheck() {
  const c = cxState(); if (!c || cxChecking) return; cxChecking = true;
  try {
    for (const [id, name, desc, test] of ACHIEVEMENTS) {
      if (c.ach[id]) continue;
      let ok = false; try { ok = !!test(); } catch (e) { }
      if (ok) {
        c.ach[id] = S.day || 1;
        if (!c.quiet) { cxToast('Achievement', name, 'ach'); try { sfx('level'); } catch (e) { } msg(`Achievement: ${name}. ${desc}`, 'level'); }
      }
    }
  } finally { cxChecking = false; }
}

// a little banner at the top of the screen
let cxToasts = [], cxToastBusy = false;
function cxToast(kind, text, cls) {
  cxToasts.push([kind, text, cls]); if (!cxToastBusy) cxToastNext();
}
function cxToastNext() {
  const t = cxToasts.shift(); if (!t) { cxToastBusy = false; return; }
  cxToastBusy = true;
  let el = document.getElementById('cx-toast');
  if (!el) { el = document.createElement('div'); el.id = 'cx-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'cx-toast ' + t[2];
  el.innerHTML = `<span class="cx-tk">${esc(t[0])}</span><b>${esc(t[1])}</b>`;
  el.onclick = () => openCodex(t[2] === 'ach' ? 'ach' : 'beasts');
  void el.offsetWidth; el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); setTimeout(cxToastNext, 350); }, 2600);
}

// ---------- the window ----------
let cxSel = null, cxFilter = 'weapon';
function openCodex(tab) {
  if (!S || (typeof dead !== 'undefined' && dead)) return;
  cxScan();
  openTabs('Codex', [['beasts', 'Bestiary', htmlBestiary], ['items', 'Encyclopedia', htmlEncyclopedia], ['ach', 'Achievements', htmlAchievements], ['stats', 'Statistics', htmlStats]], tab || 'beasts');
}

function cxMonImg(id, size, known) {
  let cv; try { cv = monCanvas(id); } catch (e) { return ''; }
  return `<span class="cx-art${known ? '' : ' unknown'}">${spriteImg(cv, size)}</span>`;
}
function htmlBestiary() {
  const c = cxState(), ids = Object.keys(MONSTERS);
  const seen = ids.filter(id => c.seen[id]).length, studied = ids.filter(id => cxK(id) >= cxStudy(id)).length;
  if (!cxSel || cxSel[0] !== 'mon') { const first = ids.find(id => c.seen[id]); cxSel = first ? ['mon', first] : null; }
  let detail = '<div class="cx-detail dim">You have not met anything worth writing down yet.</div>';
  if (cxSel) detail = cxMonDetail(cxSel[1]);
  const groups = CX_REGION_ORDER.map(h => {
    const list = ids.filter(id => MONSTERS[id].home === h); if (!list.length) return '';
    const got = list.filter(id => c.seen[id]).length;
    return `<div class="cx-group"><h4>${esc(cxRegion(h))} <small>${got}/${list.length}</small></h4><div class="cx-grid">${list.map(id => {
      const known = c.seen[id], k = cxK(id), done = k >= cxStudy(id);
      return `<button class="cx-cell${cxSel && cxSel[1] === id ? ' on' : ''}${MONSTERS[id].boss ? ' boss' : ''}" data-cx="mon:${id}" aria-label="${known ? esc(MONSTERS[id].name) : 'Unknown creature'}">${cxMonImg(id, 36, known)}${done ? '<i class="cx-star">★</i>' : k ? `<i class="cx-n">${k}</i>` : ''}</button>`;
    }).join('')}</div></div>`;
  }).join('');
  return `<p class="dim">Creatures you have seen: <b>${seen}</b> of ${ids.length} · fully studied: <b>${studied}</b>. Seeing a creature writes its name down; killing one teaches you its strength, and after ${cxStudy('rat')} kills (one, for a boss) you learn its weaknesses and what it carries.</p>
    <div class="cx-split">${detail}<div class="cx-list">${groups}</div></div>`;
}
function cxMonDetail(id) {
  const t = MONSTERS[id], c = cxState(), k = cxK(id), need = cxStudy(id);
  if (!c.seen[id]) return `<div class="cx-detail"><div class="cx-head">${cxMonImg(id, 72, false)}<div><h3>Unknown</h3><p class="dim">Somewhere in ${esc(cxRegion(t.home))}.</p></div></div><p class="dim">You have not met this creature yet.</p></div>`;
  let body = `<p class="cx-lore">${esc(CX_LORE[id] || '')}</p>`;
  if (k) {
    const lv = t.lv ? (t.home === 'upper' || t.home === 'forest' ? `Levels ${t.lv[0]}–${t.lv[1]}` : `Kingdom levels ${t.lv[0]}–${t.lv[1]}`) : 'Lair';
    body += `<div class="cx-stats"><span>Health<b>${t.hp}</b></span><span>Attack<b>${t.atk}</b></span><span>Defense<b>${t.def}</b></span><span>Damage<b>${t.dmg[0]}–${t.dmg[1]}</b></span><span>Experience<b>${t.xp}</b></span><span>Found<b>${lv}</b></span></div>`;
    const tr = cxTraits(t); if (tr.length) body += `<div class="cx-tags">${tr.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  } else body += `<p class="dim">Kill one to learn how strong it is.</p>`;
  if (k >= need) {
    const [weak, tough] = cxRes(t);
    body += `<p><b>Weak to:</b> ${weak.length ? esc(weak.join(', ')) : 'nothing in particular'} · <b>Resists:</b> ${tough.length ? esc(tough.join(', ')) : 'nothing in particular'}</p>`;
    const drops = (t.drop || []).filter(d => MATS[d[0]]);
    const uniq = [...new Map(drops.map(d => [d[0], d])).values()];
    const loot = [];
    if (uniq.length) loot.push(...uniq.map(([mid, ch]) => `<span class="cx-drop">${matIcon(mid)}${esc(MATS[mid].name)} <small>${Math.round(Math.min(1, ch) * 100)}%</small></span>`));
    if (t.gold) loot.push(`<span class="cx-drop">Gold <small>about ${t.gold}</small></span>`);
    if (!BEASTS.has(id)) loot.push('<span class="cx-drop">Sometimes gear</span>');
    if (t.boss) { const kk = KINGDOMS[t.home]; if (kk) loot.push(`<span class="cx-drop">${icon(kk.unique)}${esc(ITEMS[kk.unique].name)}</span>`); }
    body += `<div class="cx-loot"><b>Carries:</b> ${loot.length ? loot.join('') : 'nothing of use'}</div>`;
  } else if (k) body += `<p class="dim">Kill ${need - k} more to learn its weaknesses and what it carries.</p>`;
  return `<div class="cx-detail"><div class="cx-head">${cxMonImg(id, 72, true)}<div><h3>${esc(cap(t.name))}</h3><p class="dim">${esc(cxRegion(t.home))} · slain ${k}</p></div></div>${body}</div>`;
}

// the encyclopedia: every item and every material, grouped into shelves
const CX_SHELVES = [
  ['weapon', 'Weapons', () => Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'weapon')],
  ['armor', 'Armor', () => Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'armor')],
  ['jewelry', 'Jewelry', () => Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'jewelry')],
  ['magic', 'Potions & Books', () => Object.keys(ITEMS).filter(id => ['potion', 'scroll', 'book'].includes(ITEMS[id].cat))],
  ['tool', 'Tools', () => Object.keys(ITEMS).filter(id => ['tool', 'ammo'].includes(ITEMS[id].cat))],
  ['nature', 'Herbs & Forage', () => Object.keys(MATS).filter(id => MATS[id].cat === 'herb' || MATS[id].forage).map(id => 'mat:' + id)],
  ['food', 'Food & Fish', () => Object.keys(MATS).filter(id => MATS[id].cat === 'food' && !MATS[id].forage).map(id => 'mat:' + id)],
  ['mats', 'Materials', () => Object.keys(MATS).filter(id => !['food', 'herb'].includes(MATS[id].cat) && !MATS[id].forage).map(id => 'mat:' + id)],
  ['story', 'Relics', () => Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'story')],
];
const cxIsMat = k => k.startsWith('mat:');
const cxKnown = k => cxIsMat(k) ? !!cxState().mat[k.slice(4)] : !!cxState().it[k];
const cxIcon = k => { try { return cxIsMat(k) ? matIcon(k.slice(4)) : icon(k); } catch (e) { return ''; } };
const cxName = k => cxIsMat(k) ? MATS[k.slice(4)].name : ITEMS[k].name;
function cxWhere(k) {
  const out = [];
  for (const sid in SHOPS) { const sh = SHOPS[sid]; if ((sh.sells || []).some(([iid]) => iid === k)) out.push('Sold at ' + sh.name); }
  if (cxIsMat(k)) {
    const id = k.slice(4), from = Object.keys(MONSTERS).filter(mid => (MONSTERS[mid].drop || []).some(d => d[0] === id) && cxState().seen[mid]);
    if (from.length) out.push('Dropped by ' + from.slice(0, 4).map(mid => MONSTERS[mid].name + 's').join(', ') + (from.length > 4 ? '…' : ''));
    const m = MATS[id];
    if (m.spr === 'fish') out.push('Caught with a fishing rod');
    if (m.forage) out.push('Gathered underground');
    if (m.cat === 'ore') out.push('Mined from veins with a pickaxe');
    if (id === 'wood') out.push('Chopped from trees with an axe');
  } else {
    const t = ITEMS[k];
    if (t.tier === 99 && t.cat === 'weapon') out.push('Carried by a kingdom’s ruler');
    if (t.grade === 'mithril') out.push('Deep in the caves, or forged from mithril ore');
  }
  return out;
}
function htmlEncyclopedia() {
  const shelves = CX_SHELVES.map(([k, l, f]) => [k, l, f()]);
  const total = shelves.reduce((a, s) => a + s[2].length, 0), found = shelves.reduce((a, s) => a + s[2].filter(cxKnown).length, 0);
  const cur = shelves.find(s => s[0] === cxFilter) || shelves[0];
  if (!cxSel || cxSel[0] !== 'item' || !cur[2].includes(cxSel[1])) { const f = cur[2].find(cxKnown); cxSel = f ? ['item', f] : null; }
  const chips = `<div class="filters cx-chips" role="tablist">${shelves.map(([k, l, ids]) => `<button class="${k === cur[0] ? 'on' : ''}" data-cx="shelf:${k}">${l} <small>${ids.filter(cxKnown).length}/${ids.length}</small></button>`).join('')}</div>`;
  let detail = '<div class="cx-detail dim">Nothing on this shelf yet. Go and find something.</div>';
  if (cxSel) {
    const k = cxSel[1], known = cxKnown(k);
    if (!known) detail = `<div class="cx-detail"><div class="cx-head"><span class="cx-art unknown big">${cxIcon(k)}</span><div><h3>Unknown</h3><p class="dim">Not yet found.</p></div></div></div>`;
    else {
      const mat = cxIsMat(k), id = mat ? k.slice(4) : k;
      const desc = mat ? `${CAT_NAMES[MATS[id].cat] || 'Material'} · ${MATS[id].wt} lb` : itemDesc(makeItem(id));
      const val = mat ? MATS[id].val : ITEMS[id].val, where = cxWhere(k);
      detail = `<div class="cx-detail"><div class="cx-head"><span class="cx-art big">${cxIcon(k)}</span><div><h3>${esc(cxName(k))}</h3><p class="dim">${esc(desc)}</p></div></div>
        <p>Worth about <b>${val}</b> gold.</p>${where.length ? `<ul class="cx-where">${where.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div>`;
    }
  }
  const grid = `<div class="cx-grid items">${cur[2].map(k => { const kn = cxKnown(k); return `<button class="cx-cell${cxSel && cxSel[1] === k ? ' on' : ''}" data-cx="item:${k}" title="${kn ? esc(cxName(k)) : '???'}" aria-label="${kn ? esc(cxName(k)) : 'Unknown item'}"><span class="cx-art${kn ? '' : ' unknown'}">${cxIcon(k)}</span></button>`; }).join('')}</div>`;
  return `<p class="dim">Things you have found: <b>${found}</b> of ${total}. Anything that passes through your pack or your storehouse is written down here.</p>${chips}<div class="cx-split">${detail}<div class="cx-list">${grid}</div></div>`;
}
function htmlAchievements() {
  const c = cxState(), got = ACHIEVEMENTS.filter(a => c.ach[a[0]]).length;
  return `<p class="dim">Achievements earned: <b>${got}</b> of ${ACHIEVEMENTS.length}.</p><div class="cx-bar"><i style="width:${Math.round(got / ACHIEVEMENTS.length * 100)}%"></i></div>` +
    Object.entries(ACH_GROUPS).map(([g, gl]) => `<div class="cx-group"><h4>${gl}</h4><div class="cx-achs">${ACHIEVEMENTS.filter(a => a[4] === g).map(([id, name, desc]) => {
      const day = c.ach[id];
      return `<div class="cx-ach${day ? ' got' : ''}"><span class="cx-medal">${day ? '★' : '☆'}</span><div><b>${esc(name)}</b><small>${esc(desc)}${day ? ` · day ${day}` : ''}</small></div></div>`;
    }).join('')}</div></div>`).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-cx]'); if (!b || !S) return;
  const [k, ...rest] = b.dataset.cx.split(':'), v = rest.join(':');
  if (k === 'open') return openCodex(v || 'beasts');
  if (k === 'monjump') return;
  if (k === 'mon') cxSel = ['mon', v];
  else if (k === 'item') cxSel = ['item', v];
  else if (k === 'shelf') { cxFilter = v; cxSel = null; }
  if (typeof sfx === 'function') sfx('click');
  const sc = document.querySelector('#modal-body .cx-list'), top = sc ? sc.scrollTop : 0;
  refresh();
  const sc2 = document.querySelector('#modal-body .cx-list'); if (sc2) sc2.scrollTop = top;
  // on a narrow screen the entry sits above the grid, so bring it into view
  if ((k === 'mon' || k === 'item') && window.innerWidth <= 640) { const d = document.querySelector('#modal-body .cx-detail'); if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.key === 'e' || e.key === 'E') && S && !modalOpen && !(typeof dead !== 'undefined' && dead)) { openCodex(); e.preventDefault(); }
});

// a book button in the dock, beside the pack
(function cxDock() {
  const pack = document.querySelector('.dock [data-a="hero"][data-v="inv"]'); if (!pack || document.getElementById('cx-btn')) return;
  const b = document.createElement('button');
  b.className = 'dbtn panel'; b.id = 'cx-btn'; b.dataset.cx = 'open'; b.title = 'Codex: bestiary, items and achievements (E)'; b.setAttribute('aria-label', 'Codex');
  b.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/><path d="M7 8h2M15 8h2M7 11h2M15 11h2"/></svg><span class="tl">Codex</span>';
  pack.after(b);
})();


// ---------- statistics: a running record of this life ----------
const cxSt = (k, by = 1) => { const c = cxState(); if (c) c.n[k] = (c.n[k] || 0) + by; };
const cxMax = (k, v) => { const c = cxState(); if (c && v > (c.n[k] || 0)) c.n[k] = v; };
if (typeof addFloat === 'function') {
  const _af = addFloat;
  addFloat = function (tx, ty, text, color) {
    try {
      if (S) {
        const p = P(), atMe = tx === p.x && ty === p.y;
        if (typeof text === 'number') {
          if (atMe && color === '#ff6b6f') { cxSt('dmgTaken', text); cxMax('worstHit', text); }
          else if (!atMe) { cxSt('dmgDealt', text); cxMax('bestHit', text); cxSt('hits'); if (color === '#ffd27a') cxSt('crits'); if (color === '#d6a8ff') cxSt('sneakHits'); }
        } else if (atMe && /^\+\d+$/.test(text)) cxSt('healed', +text.slice(1));
        else if (atMe && text === 'dodge') cxSt('dodges');
      }
    } catch (e) { }
    return _af.apply(this, arguments);
  };
}
if (typeof startMove === 'function') {
  const _sm = startMove;
  startMove = function (obj) { if (S && obj === S.player) cxSt('steps'); return _sm.apply(this, arguments); };
}
if (typeof useItem === 'function') {
  const _ui = useItem;
  useItem = function (it) { try { const t = T(it); cxSt(t.cat === 'potion' ? 'potions' : t.cat === 'scroll' ? 'scrolls' : 'used'); } catch (e) { } return _ui.apply(this, arguments); };
}
if (typeof cast === 'function') {
  const _ca = cast;
  cast = function () { const mp = S ? P().mp : 0; const r = _ca.apply(this, arguments); if (S && P().mp < mp) cxSt('spells'); return r; };
}
if (typeof goMap === 'function') {
  const _gm = goMap;
  goMap = function (id) { const was = S && S.mapId; const r = _gm.apply(this, arguments); try { const c = cxState(); if (c && id !== was) { c.places = c.places || {}; if (!c.places[id]) { c.places[id] = 1; } cxSt('travels'); } } catch (e) { } return r; };
}
if (typeof die === 'function') {
  const _die = die;
  die = function (cause) {
    const cd0 = S ? P().chosenDay : null;
    const r = _die.apply(this, arguments);
    try { if (S && typeof dead !== 'undefined') { if (P().chosenDay !== cd0) cxSt('rescued'); else cxSt('deaths'); const c = cxState(); c.killedBy = c.killedBy || {}; c.killedBy[cause] = (c.killedBy[cause] || 0) + 1; } } catch (e) { }
    return r;
  };
}
// gold in and out, time played
let cxGold = null, cxLastS = null;
setInterval(() => {
  if (!S) return;
  if (S !== cxLastS) { cxLastS = S; cxGold = P().gold; return; }
  const g = P().gold; if (cxGold != null && g !== cxGold) cxSt(g > cxGold ? 'goldIn' : 'goldOut', Math.abs(g - cxGold)); cxGold = g;
  if (!document.hidden && !(typeof modalOpen !== 'undefined' && modalOpen && typeof dead !== 'undefined' && dead)) cxSt('secs');
}, 1000);

// the Hall of the Fallen keeps hardcore and ironman heroes after their saves are gone
function cxHall() { try { return JSON.parse(localStorage.getItem('tw-fallen') || '[]'); } catch (e) { return []; } }
function cxFallen(cause, where) {
  if (!S || !(S.hardcore || DIFF().final)) return;
  const p = P(), c = cxState();
  const rec = { name: p.name, level: p.level, day: S.day, kills: p.kills, cause, where, diff: (DIFFS[S.diff] || {}).name || S.diff, hc: !!S.hardcore,
    ach: Object.keys(c.ach).length, gold: p.gold, at: Date.now(), look: p.look || {} };
  const h = cxHall(); h.unshift(rec); try { localStorage.setItem('tw-fallen', JSON.stringify(h.slice(0, 30))); } catch (e) { }
}
function cxTime(secs) { const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m`; }
const cxNum = v => (v || 0).toLocaleString();
function htmlStats() {
  const c = cxState(), n = c.n, p = P();
  const row = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  const kills = Object.entries(c.kills).filter(([id]) => MONSTERS[id]).sort((a, b) => b[1] - a[1]);
  const bosses = Object.keys(MONSTERS).filter(id => MONSTERS[id].boss && ((S.bosses || {})[id] || c.kills[id]));
  const nemesis = Object.entries(c.killedBy || {}).sort((a, b) => b[1] - a[1])[0];
  const mode = `${esc((DIFFS[S.diff || 'normal'] || {}).name || '')}${S.hardcore ? ' · <b class="hc-tag">Hardcore</b>' : DIFF().final ? ' · one life' : ''}`;
  const hall = cxHall();
  return `<p class="dim">${esc(p.name)} · level ${p.level} · day ${S.day} · ${mode}</p>
  <div class="cx-statgrid">
    <section><h4>Battle</h4>${row('Foes slain', cxNum(p.kills))}${row('Bosses defeated', bosses.length)}${row('Damage dealt', cxNum(n.dmgDealt))}${row('Damage taken', cxNum(n.dmgTaken))}${row('Hits landed', cxNum(n.hits))}${row('Critical hits', cxNum(n.crits))}${row('Sneak attacks', cxNum(n.sneakHits))}${row('Biggest hit', cxNum(n.bestHit))}${row('Worst blow taken', cxNum(n.worstHit))}${row('Dodges', cxNum(n.dodges))}${row('Times fallen', cxNum(n.deaths))}${row('Saved by Aurel', cxNum(n.rescued))}${nemesis ? row('Nemesis', esc(cap(nemesis[0]))) : ''}</section>
    <section><h4>Journey</h4>${row('Time played', cxTime(n.secs || 0))}${row('Days in the valley', S.day)}${row('Steps taken', cxNum(n.steps))}${row('Places visited', Object.keys(c.places || {}).length)}${row('Deepest level', n.depth || 0)}${row('Seasons seen', Object.keys(c.seasons).length + ' of 4')}${row('Creatures met', Object.keys(c.seen).length + ' of ' + Object.keys(MONSTERS).length)}${row('Things found', cxFound())}${row('Achievements', Object.keys(c.ach).length + ' of ' + ACHIEVEMENTS.length)}</section>
    <section><h4>Life</h4>${row('Gold earned', cxNum(n.goldIn))}${row('Gold spent', cxNum(n.goldOut))}${row('Most gold held', cxNum(n.richest))}${row('Health restored', cxNum(n.healed))}${row('Potions drunk', cxNum(n.potions))}${row('Scrolls read', cxNum(n.scrolls))}${row('Spells cast', cxNum(n.spells))}${row('Fish caught', cxNum(n.fish))}${row('Offerings made', cxNum(n.offer))}${row('Bramble wins', cxNum(n.cards))}${row('Bones wins', cxNum(n.dice))}${row('Arm-wrestles won', cxNum(n.arm))}</section>
  </div>
  <div class="cx-group"><h4>Kills by creature</h4>${kills.length ? `<div class="cx-kills">${kills.map(([id, k]) => `<button class="cx-kill" data-cx="monjump:${id}">${cxMonImg(id, 28, true)}<span>${esc(cap(MONSTERS[id].name))}</span><b>${k}</b></button>`).join('')}</div>` : '<p class="dim">Nothing yet. Kills are counted creature by creature from now on.</p>'}</div>
  ${hall.length ? `<div class="cx-group"><h4>Hall of the Fallen</h4><div class="cx-hall">${hall.map(r => `<div><b>${esc(r.name)}</b><small>Level ${r.level} · day ${r.day} · ${r.kills} slain · ${esc(r.diff || '')}${r.hc ? ' hardcore' : ''}</small><small>Killed by ${esc(r.cause)} in ${esc(r.where)}</small></div>`).join('')}</div></div>` : ''}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cx^="monjump:"]'); if (!b || !S) return;
  cxSel = ['mon', b.dataset.cx.slice(8)]; winTabs.cur = 'beasts'; refresh();
});
