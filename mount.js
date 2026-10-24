// A pony. Buy one at the drovers' barn on the east side of town, then ride it anywhere under the open sky: town,
// the North Road, the Whisperwood, your homestead. Riding is half again as fast. You get down by yourself at a
// cave mouth or a doorway (the pony waits and you're back in the saddle when you come out), and when a fight
// starts. The Ride button in the toolbar gets you up and down.

const PONY_PRICE = 120;
const PONY_COATS = { bay: ['7a4a2a', '4a2a18', '2a1a10'], grey: ['a8a49a', '7a776e', '4a4844'], chestnut: ['a0582a', '6a3a1a', 'e0c090'], black: ['2a2428', '1a1418', '5a5458'] };
const riding = () => !!(S && S.pony && S.pony.on);
const rideable = () => { if (!S) return false; const m = curMap(); return !!(m && (m.outdoor || ['town', 'home', 'wilds'].includes(m.id) || /^f\d$/.test(m.id))); };
function rideMul() { return riding() && rideable() ? 0.62 : 1; }
// the pony under the rider: a side view (mirrored for the other way) and an end-on view for up and down
const PONY_CACHE = new Map();
function ponyCanvas(facing, coat) {
  const key = facing + coat; if (PONY_CACHE.has(key)) return PONY_CACHE.get(key);
  const c = document.createElement('canvas'); c.width = 32; c.height = 48; const g = c.getContext('2d');
  const [b, d, m] = PONY_COATS[coat] || PONY_COATS.bay, F = (x, y, w, h, col) => { g.fillStyle = '#' + col; g.fillRect(x, y, w, h); };
  const hi = '#' + b.replace(/../g, h => Math.min(255, parseInt(h, 16) + 34).toString(16).padStart(2, '0'));
  if (facing === 'right' || facing === 'left') {
    // a stocky pony in profile, facing right
    F(6, 31, 19, 8, b); F(7, 30, 17, 1, b); F(7, 39, 17, 1, d); F(8, 31, 14, 1, hi.slice(1));   // barrel, belly shade, back light
    F(22, 27, 4, 7, b); F(24, 25, 3, 4, b);                                                     // neck, rising forward
    F(25, 23, 5, 4, b); F(29, 25, 2, 3, d); F(26, 22, 1, 1, b); F(27, 22, 1, 1, d);             // head, muzzle, ears
    F(27, 24, 1, 1, '140c0c');                                                                  // eye
    F(21, 26, 2, 6, m); F(23, 24, 2, 2, m); F(24, 22, 2, 2, m);                                 // mane
    F(4, 31, 3, 2, m); F(3, 33, 2, 6, m); F(4, 39, 1, 2, m);                                    // tail
    for (const [x, bk] of [[8, 1], [11, 0], [20, 1], [23, 0]]) { F(x, 40, 2, 5, bk ? d : b); F(x, 45, 2, 2, '1a1414'); } // legs
    F(11, 28, 9, 4, '5a3a20'); F(11, 28, 9, 1, '8a6a40'); F(14, 32, 2, 5, '3a2a1a'); F(14, 37, 3, 1, 'a0a0a0'); // saddle, girth, stirrup
  } else if (facing === 'down') {
    F(10, 31, 12, 9, b); F(10, 39, 12, 1, d);                                                   // chest and barrel, end-on
    F(12, 23, 8, 9, b); F(13, 31, 6, 2, d); F(13, 22, 2, 2, b); F(17, 22, 2, 2, b);              // head and ears
    F(14, 26, 1, 1, '140c0c'); F(17, 26, 1, 1, '140c0c'); F(14, 30, 4, 1, '3a2020');            // eyes, nostrils
    F(15, 21, 2, 4, m);                                                                         // forelock
    for (const x of [11, 19]) { F(x, 40, 2, 5, d); F(x, 45, 2, 2, '1a1414'); }
    F(9, 29, 14, 2, '5a3a20');
  } else {
    F(9, 30, 14, 10, b); F(9, 39, 14, 1, d); F(10, 30, 12, 1, hi.slice(1));                     // the rump from behind
    F(15, 30, 2, 13, m); F(14, 41, 4, 2, m);                                                    // tail
    for (const x of [10, 20]) { F(x, 40, 2, 5, d); F(x, 45, 2, 2, '1a1414'); }
    F(9, 28, 14, 3, '5a3a20');
  }
  // an ink line round it, like everything else
  const img = g.getImageData(0, 0, 32, 48), px = img.data, src = new Uint8ClampedArray(px), A = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 48 && src[(y * 32 + x) * 4 + 3] > 0;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) { if (A(x, y)) continue; if (A(x + 1, y) || A(x - 1, y) || A(x, y + 1) || A(x, y - 1)) { const i = (y * 32 + x) * 4; px[i] = 27; px[i + 1] = 20; px[i + 2] = 36; px[i + 3] = 255; } }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(6, 47, 21, 1);
  if (facing === 'left') { const r = document.createElement('canvas'); r.width = 32; r.height = 48; const rg = r.getContext('2d'); rg.translate(32, 0); rg.scale(-1, 1); rg.drawImage(c, 0, 0); PONY_CACHE.set(key, r); return r; }
  PONY_CACHE.set(key, c); return c;
}
{
  const _fig = figure;
  figure = function (spec, facing = 'down', pose = 'idle0') {
    if (!spec || !spec.riding) return _fig.apply(this, arguments);
    const key = JSON.stringify(spec) + '|' + facing + '|' + pose + '|ride';
    let c = FIG_CACHE.get(key); if (c) return c;
    const s2 = Object.assign({}, spec); const coat = s2.riding; delete s2.riding;
    const rider = _fig(s2, facing, /walk/.test(pose) ? 'idle0' : pose), pony = ponyCanvas(facing, coat);
    c = document.createElement('canvas'); c.width = FW; c.height = FH; const g = c.getContext('2d');
    // the rider sits up in the saddle; the pony is drawn over the legs, so they seem to straddle it
    g.drawImage(rider, 0, -10); g.drawImage(pony, 0, 0);
    FIG_CACHE.set(key, c); return c;
  };
  const _hs = heroSpec;
  heroSpec = function () { const s = _hs.apply(this, arguments); try { if (riding() && rideable() && !(typeof fishing !== 'undefined' && fishing)) return Object.assign({}, s, { riding: S.pony.coat || 'bay' }); } catch (e) { } return s; };
}
// getting down: at doorways and cave mouths, and when a fight starts
function rideCheck() {
  if (!S || !S.pony) return;
  const hostile = curMap().mons.some(o => (o.hunting > 0 || o.angry) && !o.peace && cheb(o, P()) <= 6);
  if (S.pony.on && hostile) { S.pony.on = false; S.pony.resume = true; msg('You slip down from the saddle to fight. The pony backs off to a safe distance.', 'warn'); render(); }
  else if (!S.pony.on && S.pony.resume && !hostile && rideable()) { S.pony.on = true; S.pony.resume = false; msg('You swing back up into the saddle.', 'talk'); render(); }
}
{
  const _gm = goMap;
  goMap = function (id) {
    const r = _gm.apply(this, arguments);
    try { if (S.pony) { if (!rideable() && S.pony.on) { S.pony.on = false; S.pony.resume = true; msg('You leave the pony tied up outside.', 'talk'); } else if (rideable() && S.pony.resume) { S.pony.on = true; S.pony.resume = false; } } } catch (e) { }
    return r;
  };
  const _et = endTurn;
  endTurn = function () { const r = _et.apply(this, arguments); try { rideCheck(); } catch (e) { } return r; };
}
function toggleRide() {
  if (!S || !S.pony) { msg('You don’t have a pony. The drovers’ barn on the east side of town has them.', 'talk'); return; }
  if (!rideable()) { msg('There’s no room to ride in here.', 'warn'); return; }
  S.pony.on = !S.pony.on; S.pony.resume = false; msg(S.pony.on ? `You mount ${S.pony.name}.` : `You get down from ${S.pony.name}.`, 'talk'); render();
}
// buying one at the barn
{
  const _dt = doTrigger;
  doTrigger = function (tr) {
    if (tr && tr.kind === 'barn' && S.mapId === 'town') return openBarn();
    return _dt.apply(this, arguments);
  };
}
function openBarn() {
  const p = P();
  openModal('The drovers’ barn', `<p class="lead">Hay to the rafters and the warm smell of animals. A drover leans on the half-door. “After a pony? Sure-footed, good on the North Road, won’t go underground for love nor money. ${PONY_PRICE} gold.”</p>
    ${S.pony ? `<p>You already have ${esc(S.pony.name)}. “Still eating me out of hay, that one.”</p>` : `<div class="cr2-chips" style="margin:8px 0">${Object.keys(PONY_COATS).map(k => `<button data-pony="${k}" ${p.gold >= PONY_PRICE ? '' : 'disabled'}>A ${k} pony</button>`).join('')}</div><p class="hint">Riding is half again as fast under the open sky. You’ll get down at doors, cave mouths and when a fight starts. The Ride button in the toolbar gets you up and down.</p>`}
    <div class="btnrow"><button class="btn ghost" data-a="close">Leave</button></div>`);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pony]'); if (!b || !S) return; const p = P(); if (p.gold < PONY_PRICE || S.pony) return;
  const names = { bay: 'Bramble', grey: 'Ashes', chestnut: 'Conker', black: 'Soot' };
  p.gold -= PONY_PRICE; S.pony = { coat: b.dataset.pony, name: names[b.dataset.pony], on: true }; closeModal(true);
  msg(`You buy ${S.pony.name}, a ${b.dataset.pony} pony, and ride out of the barn.`, 'good'); render();
  if (typeof cxBump === 'function') cxBump('pony');
});
// a Ride button in the toolbar
(function rideButton() {
  const pack = document.querySelector('.dock [data-a="hero"][data-v="inv"]'); if (!pack || document.getElementById('ride-btn')) return;
  const b = document.createElement('button'); b.className = 'dbtn panel'; b.id = 'ride-btn'; b.title = 'Ride your pony'; b.setAttribute('aria-label', 'Ride');
  b.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20v-6l2-4h7l3-5 2 1-1 4 2 3-2 1-2-2v8"/><path d="M8 20v-5M13 20v-5"/></svg><span class="tl">Ride</span>';
  b.addEventListener('click', () => toggleRide()); pack.before(b);
})();
setInterval(() => { const b = document.getElementById('ride-btn'); if (b) { b.hidden = !(S && S.pony); b.classList.toggle('on', riding()); } }, 800);
try { ACHIEVEMENTS.push(['pony', 'Saddled', 'Buy a pony.', () => !!S.pony, 'life']); } catch (e) { }
