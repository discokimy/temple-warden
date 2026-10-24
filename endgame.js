// After the story: the Endless Deep, and New Game+.
//   The Endless Deep: once the Wyrm is slain or bound, a stair opens where it lay, down into the Roots of the
//   Mountain: level after level, each harder than the last, without end. Every fifth level an Echo of one of the
//   fallen rulers guards the way down. Loot grows with depth, and legendaries turn up down there.
//   New Game+: start the story again with your level, skills, spells, gear, gold and Gift; the world is reset and
//   everything in it is tougher (more each time round).

// ---------------- the Endless Deep ----------------
const ROOT_NAMES = ['The Roots of the Mountain', 'The Bone Galleries', 'The Molten Stair', 'The Drowned Roots', 'The Hollow Heart', 'The Crystal Dark', 'The First Halls'];
const ECHOES = ['grotsnag', 'vesk', 'matriarch', 'hierophant', 'c_bishop', 'corvane'];
{
  const _mi = mapInfo;
  mapInfo = function (id) {
    if (typeof id === 'string' && /^x\d+$/.test(id)) { const n = +id.slice(1); return { kind: 'abyss', lvl: n, eff: 11 + n, name: `${ROOT_NAMES[(n - 1) % ROOT_NAMES.length]}, depth ${n}`, parent: n === 1 ? 'deep' : 'x' + (n - 1), child: 'x' + (n + 1), theme: 'deep' }; }
    return _mi.apply(this, arguments);
  };
  const _pm = pickMonster;
  pickMonster = function (m) {
    if (m.kind === 'abyss') { const pool = Object.values(MONSTERS).filter(t => !t.boss && !t.prey && t.lv && ['g', 'r', 'h', 's', 'crypt', 'upper'].includes(t.home) && t.lv[1] >= 2); return pick(pool).id; }
    return _pm.apply(this, arguments);
  };
  const _gl = genLevel;
  genLevel = function (id) {
    const m = _gl.apply(this, arguments);
    if (/^x\d+$/.test(id)) {
      const info = mapInfo(id), rooms = m.rooms || [], n = info.lvl;
      m.abyss = n;
      const r = rooms[rooms.length - 1];
      if (r && !Object.values(m.links).includes(info.child)) { const x = r.x + (r.w >> 1), y = r.y + (r.h >> 1); setTile(m, x, y, '>'); m.links[K(x, y)] = info.child; }
      // tougher by depth
      for (const o of m.mons) { o.hp = o.mhp = Math.round(o.mhp * (1 + n * 0.15)); }
      if (Math.random() < 0.5) { const c = m.mons.find(o => !MONSTERS[o.id].boss); if (c && typeof makeChampion === 'function') makeChampion(c); }
      // an Echo of a fallen ruler every fifth level, by the way down
      if (n % 5 === 0 && r) {
        const id2 = ECHOES[(n / 5 - 1) % ECHOES.length], e = makeMonster(id2, r.x + (r.w >> 1) + 1, r.y + (r.h >> 1));
        e.ename = `Echo of ${MONSTERS[id2].name.replace(/^the /, 'the ')}`; e.echo = 1; e.hp = e.mhp = Math.round(e.mhp * (1 + n * 0.12)); m.mons.push(e);
      }
      for (let i = 0; i < 2; i++) { const rr = pick(rooms); if (rr) m.ground.push({ x: rr.x + 1, y: rr.y + 1, item: randomLoot(info.eff) }); }
      if (Math.random() < 0.05 + n * 0.005 && typeof dropLegend === 'function' && rooms[1]) dropLegend(m, rooms[1].x + 1, rooms[1].y + 1);
    }
    return m;
  };
}
// the stair opens where the Wyrm lay
function openRootStair() {
  const m = S.maps && S.maps.deep; if (!m || !S.story || !S.story.ending || Object.values(m.links).includes('x1')) return;
  const w = m.wyrmAt || null; let spot = w;
  if (!spot) { const r = (m.rooms || [])[m.rooms.length - 1]; if (r) spot = [r.x + (r.w >> 1), r.y + (r.h >> 1) + 1]; }
  if (!spot) return;
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = spot[0] + dx, y = spot[1] + dy; if (tileAt(m, x, y) === '.' && !m.links[K(x, y)]) { setTile(m, x, y, '>'); m.links[K(x, y)] = 'x1'; if (S.mapId === 'deep') msg('Where the Wyrm lay, the stone has cracked open onto a stair going down. Far below, something breathes.', 'warn'); return; } }
}
{
  const _km = killMonster;
  killMonster = function (mon) {
    const live = mon && curMap().mons.includes(mon);
    if (live && mon.id === 'wyrm') curMap().wyrmAt = [mon.x, mon.y];
    const r = _km.apply(this, arguments);
    try {
      if (live && mon.echo) { const m = curMap(); m.ground.push({ x: mon.x, y: mon.y, item: randomLoot((m.depth || 11) + 4) }); if (typeof dropLegend === 'function' && Math.random() < 0.5) dropLegend(m, mon.x, mon.y); if (typeof cxBump === 'function') cxBump('echoes'); }
    } catch (e) { }
    return r;
  };
  const _gm = goMap;
  goMap = function (id) {
    const r = _gm.apply(this, arguments);
    try { if (id === 'deep') openRootStair(); const m = /^x\d+$/.test(id) && curMap(); if (m) { const c = cxState(); if (m.abyss > (c.n.abyss || 0)) { c.n.abyss = m.abyss; if (m.abyss % 5 === 0) msg(`Depth ${m.abyss}. Something old waits by the stair down.`, 'warn'); } } } catch (e) { }
    return r;
  };
}
setInterval(() => { try { if (S && S.story && S.story.ending) openRootStair(); } catch (e) { } }, 3000);

// ---------------- New Game+ ----------------
const ngLevel = () => (S && S.ngplus) || 0;
{
  const _mk = makeMonster;
  makeMonster = function () { const o = _mk.apply(this, arguments); const ng = ngLevel(); if (ng) { o.hp = o.mhp = Math.round(o.mhp * (1 + 0.35 * ng)); } return o; };
  const _ma = monsterAttack;
  monsterAttack = function (mon) { const p = P(), hp0 = p.hp, r = _ma.apply(this, arguments), ng = ngLevel(); if (ng && p.hp < hp0 && !dead) { const extra = Math.round((hp0 - p.hp) * 0.25 * ng); p.hp -= extra; if (p.hp <= 0) { p.hp = 0; die(MONSTERS[mon.id].name); } } return r; };
  const _gx = gainXp;
  gainXp = function (n) { return _gx.call(this, Math.round(n * (1 + 0.25 * ngLevel()))); };
}
function startNewGamePlus() {
  const old = S, p = old.player, ng = (old.ngplus || 0) + 1;
  if (!confirm(`Begin New Game+ ${ng}? Your level, skills, spells, gear, gold and Gift come with you. The world, the story and the kingdoms start over, and everything is ${Math.round(35 * ng)}% tougher. Your current save in this slot is replaced.`)) return;
  const keep = JSON.parse(JSON.stringify({ level: p.level, xp: p.xp, stats: p.stats, sk: p.sk, skx: p.skx, skills: p.skills, skillPts: p.skillPts, attrPts: p.attrPts, spells: p.spells, favSpells: p.favSpells, equip: p.equip, inv: p.inv.filter(it => ITEMS[it.id] && ITEMS[it.id].cat !== 'story'), gold: p.gold, gift: p.gift, look: p.look, origin: p.origin, bonusHp: p.bonusHp, kills: p.kills, mats: p.mats }));
  const codex = old.codex, legends = old.legendsFound, diff = old.diff, hard = old.hardcore, opts = old.opts;
  newGame(p.name, keep.look, diff);
  Object.assign(S.player, keep); S.player.hp = maxHp(); S.player.mp = maxMp();
  S.ngplus = ng; S.codex = codex; S.legendsFound = legends; if (hard) S.hardcore = 1; S.opts = Object.assign(S.opts || {}, opts);
  closeModal(true); msg(`New Game+ ${ng}. Brambleford, again: the same morning, the same note on the table. But you are not who you were.`, 'level');
  autosave(); render();
}
// the hero card shows NG+, and the save slot too
{
  const _ss = slotSummary;
  slotSummary = function () { const r = _ss.apply(this, arguments); if (ngLevel()) r.diff = (r.diff || 'normal'); r.ng = ngLevel(); return r; };
}
try {
  ACHIEVEMENTS.push(['roots', 'Below the Bottom', 'Reach depth 5 of the Endless Deep.', () => (cxState().n.abyss || 0) >= 5, 'explore']);
  ACHIEVEMENTS.push(['roots20', 'The First Halls', 'Reach depth 20 of the Endless Deep.', () => (cxState().n.abyss || 0) >= 20, 'explore']);
  ACHIEVEMENTS.push(['echo', 'Echoes', 'Defeat an Echo of a fallen ruler.', () => (cxState().n.echoes || 0) >= 1, 'fight']);
  ACHIEVEMENTS.push(['ngplus', 'Again, and Better', 'Begin New Game+.', () => ngLevel() >= 1, 'life']);
  CX_REGION.abyss = 'The Endless Deep';
} catch (e) { }
// the stats page shows how deep you've been
{
  const _hs = htmlStats;
  htmlStats = function () { const h = _hs.apply(this, arguments), n = cxState().n; return h.replace('Deepest level</span><b>', `Deepest level</span><b>${n.abyss ? `Endless Deep ${n.abyss} · ` : ''}`).replace('<p class="dim">', `<p class="dim">${ngLevel() ? `New Game+ ${ngLevel()} · ` : ''}`); };
}
