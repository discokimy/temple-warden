// Brambleford dressed up: a fountain in the market square, stone planters round its edge, goods stacked by the
// shop doors, bunting strung between the lamp posts, and a few things that come and go with the seasons
// (pumpkins on the doorsteps in autumn, snowmen on the green in winter).

Object.assign(NATIVE_PROPS, {
  fountain: () => nativeProp(88, 72, ({ F, P, E }) => {
    // the basin: a ring of dressed stone round dark water
    E(44, 58, 42, 13, '#6f6a62'); E(44, 56, 42, 13, '#a49d90'); E(44, 55, 40, 11, '#bdb6a8');
    E(44, 56, 35, 9, '#2c4f6a'); E(44, 56, 33, 8, '#3a6a8e'); E(40, 54, 18, 3, '#5b8fb5');
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = 44 + Math.cos(a) * 40, y = 56 + Math.sin(a) * 11.5; F(x, y - 1, 1, 3, '#8a8376'); }
    // the column and its bowl
    F(39, 30, 10, 26, '#9a9386'); F(40, 30, 3, 26, '#bfb8aa'); F(46, 30, 2, 26, '#7c766a');
    E(44, 30, 13, 4, '#8f887b'); E(44, 29, 12, 3, '#bdb6a8'); E(44, 29, 10, 2, '#3a6a8e');
    F(42, 16, 4, 13, '#a8a194'); E(44, 16, 4, 3, '#c9c2b4');
    // water falling in sheets from the bowl, and the spray at the top
    for (const dx of [-12, -8, 8, 12]) for (let y = 31; y < 54; y += 2) P(44 + dx + (y % 4 === 1 ? 0 : (dx > 0 ? 1 : -1)), y, y % 6 ? '#9fd0f0' : '#e8f6ff');
    for (const [x, y] of [[44, 8], [42, 10], [46, 10], [40, 13], [48, 13], [44, 11]]) P(x, y, '#cfeaff');
    F(43, 11, 2, 5, '#bfe2fa');
    // ripples where it lands
    for (const x of [30, 34, 54, 58]) { F(x - 2, 54, 4, 1, '#8cc0e2'); }
  }),
  planter: () => nativeProp(26, 30, ({ F, P, E }) => {
    F(5, 14, 16, 14, '#8a8376'); F(5, 14, 16, 2, '#b3ac9e'); F(6, 16, 3, 11, '#a39c8f'); F(17, 16, 3, 11, '#6f695f'); F(4, 26, 18, 3, '#6f695f');
    E(13, 11, 9, 5, '#3d6e2a'); E(12, 9, 7, 4, '#4f8a33');
    for (const [x, y, c] of [[8, 8, '#e05a7a'], [12, 6, '#f2c94c'], [16, 8, '#e05a7a'], [10, 11, '#f4f0e6'], [17, 11, '#f2c94c'], [14, 10, '#9a7ce0']]) { F(x - 1, y, 3, 2, c); P(x, y - 1, c); }
  }),
  pumpkins: () => nativeProp(30, 20, ({ F, P, E }) => {
    for (const [cx, cy, r] of [[10, 13, 7], [21, 14, 6], [16, 8, 5]]) {
      E(cx, cy, r, r * 0.8, '#b8561c'); E(cx, cy, r - 1, r * 0.8 - 1, '#e07a26');
      F(cx - 1, cy - r * 0.8, 1, r * 1.6, '#b8561c'); F(cx + Math.round(r / 2), cy - r * 0.6, 1, r * 1.2, '#c9661f');
      F(cx, cy - r * 0.8 - 2, 2, 3, '#4e6a24');
    }
    P(9, 12, '#f6a94a'); P(20, 13, '#f6a94a');
  }),
  snowman: () => nativeProp(24, 36, ({ F, P, E }) => {
    E(12, 28, 9, 7, '#c9d6e3'); E(12, 27, 8, 6, '#f4f8fc');
    E(12, 16, 6, 5, '#c9d6e3'); E(12, 15, 5, 5, '#f4f8fc');
    E(12, 7, 4, 4, '#f4f8fc');
    F(8, 3, 8, 1, '#2a2430'); F(9, 0, 6, 3, '#2a2430'); // a battered hat
    P(10, 6, '#1a1520'); P(14, 6, '#1a1520'); F(12, 8, 3, 1, '#e07a26');
    F(8, 11, 8, 2, '#b9343c'); F(14, 11, 2, 5, '#b9343c'); // a scarf
    P(12, 15, '#1a1520'); P(12, 18, '#1a1520'); P(12, 25, '#1a1520');
    F(2, 13, 5, 1, '#5a3a1e'); F(17, 13, 5, 1, '#5a3a1e'); P(1, 12, '#5a3a1e'); P(22, 12, '#5a3a1e');
  }),
});
Object.assign(DECOR_BLOCK, { fountain: 1, planter: 1, pumpkins: 1, snowman: 1 });

function decorateTown(m) {
  if (!m || m.id !== 'town') return;
  const busy = (x, y) => m.decor[K(x, y)] || m.trig[K(x, y)] || m.links[K(x, y)] || m.npcs.some(n => n.x === x && n.y === y) || (m.ground || []).some(g => g.x === x && g.y === y);
  // cobbles that belong to the town's streets: not under a building, not up on the temple hill
  const under = (x, y) => (m.landmarks || []).some(l => x >= l.x - 1 && x < l.x + l.w + 1 && y >= l.y - 1 && y < l.y + l.h + 1);
  const hill = (x, y) => typeof HILL !== 'undefined' && x >= HILL.x0 && x <= HILL.x1 && y <= HILL.wall + 1;
  const isQ = (x, y) => tileAt(m, x, y) === ':' && !under(x, y) && !hill(x, y);
  if (m.decorated !== 4) {
    // an earlier dressing: take it away and start again
    for (const k in m.decor) if (['fountain', 'planter'].includes(m.decor[k])) { const [x, y] = k.split(',').map(Number); delete m.decor[k]; if (m.decor[K(x - 1, y)] === 'blk') delete m.decor[K(x - 1, y)]; if (m.decor[K(x + 1, y)] === 'blk') delete m.decor[K(x + 1, y)]; if (m.trig[k] && m.trig[k].dlg === 'fountain') delete m.trig[k]; }
    m.decorated = 4;
    // the fountain: the open heart of the square, the cobbled spot farthest from anything else
    let best = null, bs = -1e9;
    const stalls = Object.keys(m.decor).filter(k => /^stall/.test(m.decor[k])).map(k => k.split(',').map(Number));
    const mx = stalls.length ? stalls.reduce((a, b) => a + b[0], 0) / stalls.length : m.w / 2, my = stalls.length ? stalls.reduce((a, b) => a + b[1], 0) / stalls.length : m.h / 2;
    for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
      let ok = true;
      for (let dy = -2; dy <= 1 && ok; dy++) for (let dx = (dy === 1 ? -1 : -1); dx <= 1 && ok; dx++) if (!isQ(x + dx, y + dy) || m.decor[K(x + dx, y + dy)] || m.trig[K(x + dx, y + dy)]) ok = false;
      if (!ok) continue;
      let open = 0; for (let r = 3; r < 9; r++) { let ring = true; for (let dx = -r; dx <= r && ring; dx++) for (const dy of [-r, r]) if (!isQ(x + dx, y + dy)) ring = false; if (!ring) break; open = r; }
      // as near the middle of the market stalls as it can be
      const sc = open * 3 - Math.hypot(x - mx, y - my);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (best) {
      const [fx, fy] = best;
      m.decor[K(fx, fy)] = 'fountain'; m.decor[K(fx - 1, fy)] = 'blk'; m.decor[K(fx + 1, fy)] = 'blk';
      m.trig[K(fx, fy)] = { dlg: 'fountain' }; m.fountain = [fx, fy];
    }
    // planters where the cobbles meet the grass, spaced out
    const spots = [];
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (!isQ(x, y) || busy(x, y)) continue;
      const grass = [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dx, dy]) => tileAt(m, x + dx, y + dy) === ',').length;
      if (grass !== 1) continue;
      if (spots.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) < 9)) continue;
      if ((x * 7 + y * 13) % 3) continue;
      spots.push([x, y]);
    }
    for (const [x, y] of spots.slice(0, 10)) m.decor[K(x, y)] = 'planter';
    // goods by the shop doors
    const goods = { weapons: 'barrel', armor: 'crate', general: 'sacks', alchemist: 'pots', magic: 'crate', enchanter: 'pots', jeweler: 'crate', inn: 'barrel', butcher: 'barrel' };
    for (const lm of m.landmarks || []) {
      const kind = lm.spec && lm.spec.kind; if (!goods[kind]) continue;
      const y = lm.y + lm.h, door = lm.x + lm.spec.door;
      for (const x of [door + 2, door - 2]) {
        const d = m.decor[K(x, y)];
        if (tileAt(m, x, y) === '#' || m.trig[K(x, y)] || m.links[K(x, y)]) continue;
        if (d && !/^(flowerbed|shrub)/.test(d)) continue;
        m.decor[K(x, y)] = goods[kind]; break;
      }
    }
  }
  seasonalDecor(m);
}
// pumpkins and snowmen come and go with the seasons
function seasonalDecor(m) {
  let s = 'summer'; try { s = season(); } catch (e) { }
  if (m.seasonDecor === s) return;
  for (const k of m.seasonal || []) if (['pumpkins', 'snowman'].includes(m.decor[k])) delete m.decor[k];
  m.seasonal = []; m.seasonDecor = s;
  const busy = (x, y) => m.decor[K(x, y)] || m.trig[K(x, y)] || m.links[K(x, y)] || m.npcs.some(n => n.x === x && n.y === y);
  if (s === 'autumn') for (const lm of m.landmarks || []) {
    if (!lm.spec || lm.spec.kind !== 'home') continue;
    const x = lm.x + lm.spec.door + 2, y = lm.y + lm.h;
    if (tileAt(m, x, y) === ',' && (!m.decor[K(x, y)] || /^(flowerbed|shrub)/.test(m.decor[K(x, y)]))) { m.decor[K(x, y)] = 'pumpkins'; m.seasonal.push(K(x, y)); }
  }
  if (s === 'winter') {
    let n = 0;
    for (let i = 0; i < 400 && n < 4; i++) {
      const x = 8 + (i * 37) % (m.w - 16), y = 10 + (i * 23) % (m.h - 20);
      if (tileAt(m, x, y) !== ',' || busy(x, y) || busy(x + 1, y) || busy(x, y + 1)) continue;
      if (m.seasonal.some(k => { const [sx, sy] = k.split(',').map(Number); return Math.abs(sx - x) + Math.abs(sy - y) < 12; })) continue;
      m.decor[K(x, y)] = 'snowman'; m.seasonal.push(K(x, y)); n++;
    }
  }
}
{
  const _goMap = goMap;
  goMap = function (id) { const r = _goMap.apply(this, arguments); if (id === 'town' && S && S.maps.town) { decorateTown(S.maps.town); render(); } return r; };
}
setInterval(() => { try { if (S && S.maps && S.maps.town && S.maps.town.planted) { const m = S.maps.town, was = m.decorated, ws = m.seasonDecor; decorateTown(m); if ((!was || ws !== m.seasonDecor) && S.mapId === 'town') render(); } } catch (e) { } }, 1500);

// the fountain has a few things to say
if (typeof doTrigger === 'function') {
  const _dt = doTrigger;
  doTrigger = function (tr) {
    if (tr && tr.dlg === 'fountain') {
      const p = P();
      if (p.gold >= 1 && !(S.story.wishDay === S.day)) { S.story.wishDay = S.day; p.gold -= 1; msg('You toss a copper into the fountain and make a wish. The water chuckles over it.', 'talk'); if (typeof sfx === 'function') sfx('splash'); if (Math.random() < 0.12) { p.gold += 5; msg('Something glints beside your copper: an old silver piece someone dropped long ago. You fish it out. (+5 gold)', 'gold'); } }
      else msg('The fountain splashes in the square, cold and clear, fed from springs under the temple hill. Coins glint on the bottom.', 'talk');
      return;
    }
    return _dt.apply(this, arguments);
  };
}

// ---------------- bunting between the lamp posts ----------------
function buntingRuns(m) {
  if (m.bunting) return m.bunting;
  const posts = []; for (const k in m.decor) if (m.decor[k] === 'lamppost') posts.push(k.split(',').map(Number));
  const runs = [], used = new Set();
  for (const a of posts) {
    let best = null, bd = 99;
    for (const b of posts) {
      if (a === b) continue; const dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]), d = Math.hypot(dx, dy);
      if (d < 4 || d > 11 || (dx > 2 && dy > 2)) continue;
      const key = [a, b].map(String).sort().join('|'); if (used.has(key)) continue;
      if (d < bd) { bd = d; best = b; }
    }
    if (best) { used.add([a, best].map(String).sort().join('|')); runs.push([a, best]); }
  }
  return (m.bunting = runs);
}
const BUNT = ['#c0392b', '#f2c94c', '#2e86c1', '#f4f0e6', '#27ae60', '#8e44ad'];
{
  const _rm = renderMap;
  renderMap = function () {
    _rm.apply(this, arguments);
    try {
      if (!S || S.mapId !== 'town') return;
      const m = curMap(), r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), t = performance.now();
      const night = typeof dayLight === 'function' ? (dayLight().night || 0) : 0;
      ctx.save(); ctx.globalAlpha = 1 - 0.65 * Math.max(0, Math.min(1, night));
      for (const [a, b] of buntingRuns(m)) {
        if (!(canSee(a[0], a[1]) || canSee(b[0], b[1]) || m.lit)) continue;
        // hung from the top of each post, sagging in the middle and stirring in the wind
        const x0 = ox + (a[0] + 0.5) * TS, y0 = oy + (a[1] - 1.55) * TS, x1 = ox + (b[0] + 0.5) * TS, y1 = oy + (b[1] - 1.55) * TS;
        if (Math.max(x0, x1) < -TS || Math.min(x0, x1) > r.width + TS || Math.max(y0, y1) < -TS || Math.min(y0, y1) > r.height + TS) continue;
        const len = Math.hypot(x1 - x0, y1 - y0), sag = TS * 0.45 + len * 0.04, n = Math.max(4, Math.round(len / (TS * 0.42)));
        const at = k => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + sag * 4 * k * (1 - k)];
        ctx.strokeStyle = 'rgba(40,30,30,0.85)'; ctx.lineWidth = Math.max(1, TS / 32);
        ctx.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = at(i / 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        const s = TS * 0.13;
        for (let i = 1; i < n; i++) {
          const [x, y] = at(i / n), sway = Math.sin(t / 420 + i * 0.9 + a[0]) * s * 0.35;
          ctx.fillStyle = BUNT[(i + a[0]) % BUNT.length];
          ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.lineTo(x + sway, y + s * 2.1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(x + s * 0.2, y); ctx.lineTo(x + s, y); ctx.lineTo(x + sway, y + s * 2.1); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    } catch (e) { }
  };
}
