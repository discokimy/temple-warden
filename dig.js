// Digging: with a pickaxe in your pack, walk into the rock of a cave wall and you start hewing at it. A few
// blows (fewer if you're strong, or have the Prospector's knack) and it gives way into open floor. The rubble
// yields stone, now and then ore, and once in a long while something someone hid in the rock long ago.
// Not the outer edge of a level, not doors, stairs or shrines, and never in town.

const DIG_THEMES = new Set(['cave', 'g', 'r', 'h', 's', 'deep']);
function canDigHere(m, x, y) {
  if (!m || !DIG_THEMES.has(m.theme)) return false;
  if (x <= 0 || y <= 0 || x >= m.w - 1 || y >= m.h - 1) return false;
  if (tileAt(m, x, y) !== '#') return false;
  if (m.trig[K(x, y)] || m.links[K(x, y)] || (m.decor && m.decor[K(x, y)])) return false;
  return true;
}
const digNeeded = () => Math.max(1, 3 - (stat('str') >= 15 ? 1 : 0) - (rank('prospect') ? 1 : 0));
function digAt(x, y) {
  const m = curMap(), p = P();
  m.dig = m.dig || {};
  const k = K(x, y), hits = (m.dig[k] || 0) + 1;
  if (typeof sfx === 'function') { try { sfx('thunk'); } catch (e) { } }
  if (typeof AC !== 'undefined') AC.swingFx = { t0: performance.now(), d: [x - p.x, y - p.y], heavy: false };
  if (hits < digNeeded()) {
    m.dig[k] = hits;
    if (!m.digHinted) { m.digHinted = 1; msg('You set your pickaxe to the rock. Chips fly. Keep at it.', 'talk'); }
    useSkill('smithing', 1); endTurn(); return;
  }
  delete m.dig[k];
  setTile(m, x, y, '.');
  m.dug = (m.dug || 0) + 1;
  S.dugTotal = (S.dugTotal || 0) + 1;
  const loot = [];
  if (chance(0.55)) { m.ground.push({ x, y, mat: 'stone', q: 1 }); loot.push('stone'); }
  const d = m.depth || 1;
  if (chance(0.09 + rank('prospect') * 0.04)) { const mat = d >= 7 && chance(0.2) ? 'mithril' : d >= 4 && chance(0.3) ? 'silver' : 'iron'; m.ground.push({ x, y, mat, q: 1 }); loot.push(MATS[mat].name.toLowerCase()); }
  if (chance(0.03)) { const mat = d >= 5 && chance(0.3) ? 'soulgem' : 'shard'; m.ground.push({ x, y, mat, q: 1 }); loot.push(MATS[mat].name.toLowerCase()); }
  if (chance(0.015)) { const g = roll(10, 25) * Math.max(1, Math.ceil(d / 2)); m.ground.push({ x, y, gold: g }); loot.push('an old purse someone walled up'); }
  msg(loot.length ? `The rock gives way. In the rubble: ${loot.join(', ')}.` : 'The rock gives way, and you step into the gap you have made.', loot.length ? 'good' : '');
  useSkill('smithing', 2);
  if (typeof computeFov === 'function') computeFov();
  // the cached picture of this level's floor is out of date now
  if (typeof bakeCache !== 'undefined' && bakeCache && bakeCache.delete) bakeCache.delete(m.id);
  m.bakeV = (m.bakeV || 0) + 1;
  endTurn(); render();
}
{
  const _act = act;
  act = function (dx, dy) {
    try {
      if (S && !modalOpen && !dead && (dx || dy)) {
        const m = curMap(), p = P(), x = p.x + dx, y = p.y + dy;
        if (canDigHere(m, x, y) && !m.mons.some(o => o.x === x && o.y === y)) {
          if (hasTool('pick')) { setFacing(p, dx, dy); if (typeof AC !== 'undefined') AC.dir = [dx, dy]; digAt(x, y); return; }
          if (!m.noPickHint) { m.noPickHint = 1; msg('Solid rock. With a pickaxe from Wendell’s you could dig through it.', 'talk'); }
        }
      }
    } catch (e) { console.error(e); }
    return _act.apply(this, arguments);
  };
}
// cracks spread across the rock you are working on
{
  const _rm = renderMap;
  renderMap = function () {
    _rm.apply(this, arguments);
    try {
      const m = S && curMap(); if (!m || !m.dig) return;
      const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), need = digNeeded();
      ctx.save(); ctx.strokeStyle = 'rgba(20,14,10,0.85)'; ctx.lineWidth = Math.max(1.5, TS / 20); ctx.lineCap = 'round';
      for (const k in m.dig) {
        const [x, y] = k.split(',').map(Number), n = m.dig[k], f = n / need;
        const cx = ox + (x + 0.5) * TS, cy = oy + (y + 0.5) * TS;
        let s = (x * 73856093 ^ y * 19349663) >>> 0; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
        for (let i = 0; i < 3 + n * 2; i++) {
          let px = cx, py = cy, a = rnd() * Math.PI * 2; ctx.beginPath(); ctx.moveTo(px, py);
          for (let j = 0; j < 3; j++) { a += (rnd() - 0.5) * 1.2; const l = TS * (0.12 + 0.18 * f) * (0.6 + rnd()); px += Math.cos(a) * l; py += Math.sin(a) * l; ctx.lineTo(px, py); }
          ctx.stroke();
        }
      }
      ctx.restore();
    } catch (e) { }
  };
}
