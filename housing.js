// A home of your own, inside. Once your cottage stands on your land, you can walk into it and furnish it.
// The room has ten places for furniture; the ledger by the door lists what can go in each, what it costs, and
// what it does. A proper bed lets you sleep there (and with a farmhouse, wake Well Rested for longer); the hearth
// lets you cook; a bookcase helps your skills grow; a table makes home meals go further; the rest is for looks,
// and trophies of the great things you've done go up on the wall.
// State: S.house = { spot: item }.

NATIVE_PROPS.trophy_wolf = () => nativeProp(30, 30, ({ F, P, E }) => {
  F(3, 4, 24, 20, '5a3a20'); F(4, 5, 22, 18, '7a5230'); E(15, 14, 8, 6, '8d8d8d'); E(15, 16, 6, 5, 'a8a8a8'); F(9, 7, 3, 5, '8d8d8d'); F(18, 7, 3, 5, '8d8d8d');
  F(12, 13, 2, 2, 'ffd27a'); F(17, 13, 2, 2, 'ffd27a'); F(13, 19, 4, 2, '2a2a2a'); P(12, 21, 'f2efe6'); P(18, 21, 'f2efe6');
});
NATIVE_PROPS.trophy_wyrm = () => nativeProp(40, 34, ({ F, P, E }) => {
  F(2, 4, 36, 26, '3a2a20'); F(3, 5, 34, 24, '5a3a20'); E(20, 16, 12, 8, 'd8d0bc'); F(10, 10, 20, 4, 'c8c0aa'); F(6, 6, 4, 6, 'e8e0cc'); F(30, 6, 4, 6, 'e8e0cc');
  F(14, 14, 3, 3, '1a1010'); F(23, 14, 3, 3, '1a1010'); for (let x = 12; x < 29; x += 3) F(x, 22, 2, 3, 'f2efe6');
});
NATIVE_PROPS.trophy_crown = () => nativeProp(26, 26, ({ F, P }) => {
  F(3, 3, 20, 20, '3a2a4a'); F(4, 4, 18, 18, '4a3a5e'); F(7, 13, 12, 5, 'e3b93c'); for (const x of [7, 11, 15, 18]) F(x, 9, 2, 4, 'e3b93c'); P(9, 15, 'c9343c'); P(13, 15, '3b6fc4'); P(16, 15, '3faa4a');
});
Object.assign(DECOR_BLOCK, { trophy_wolf: 1, trophy_wyrm: 1, trophy_crown: 1 });

const HW = 12, HH = 9;
// spot: [x, y, label, options]; option: [decor, name, gold, wood, what it does, unlocked?]
const HOUSE_SPOTS = {
  bed: [1, 2, 'The bed corner', [['bed', 'A proper bed', 30, 6, 'Sleep at home. With a farmhouse you wake Well Rested for twice as long.']]],
  foot: [2, 2, 'At the foot of the bed', [['chest', 'A storage chest', 15, 4, 'A good oak chest. (Decoration)'], ['strongbox', 'An iron strongbox', 60, 2, 'A heavy lock and a heavier lid. (Decoration)']]],
  wallL: [3, 1, 'The back wall, left', [['bookcase', 'A bookcase', 50, 8, 'Study in the evenings: every skill grows 10% faster.'], ['sunbanner', 'A banner of Aurel', 25, 0, 'Aurel’s sun, in gold thread. (Decoration)']]],
  wallM: [6, 1, 'The back wall, middle', [['trophy_wolf', 'Greymaw’s head', 0, 2, 'A trophy.', () => (S.bosses || {}).greymaw], ['trophy_crown', 'A kingdom’s crown', 0, 2, 'A trophy.', () => KINGDOM_ORDER.some(k => (S.bosses || {})[KINGDOMS[k].boss] || (S.pol && S.pol.treaty && S.pol.treaty[k]))], ['trophy_wyrm', 'The Wyrm’s skull', 0, 4, 'The greatest trophy in the valley.', () => S.wyrmSlain], ['candelabra', 'A candelabra', 20, 0, 'Candlelight on the back wall. (Decoration)']]],
  hearth: [9, 1, 'The fireplace', [['hearth', 'A stone hearth', 40, 10, 'Cook at home.']]],
  table: [5, 4, 'The middle of the room', [['table', 'A table and bench', 25, 8, 'Meals eaten at home heal half again as much.']]],
  rack: [10, 3, 'The far wall', [['weaponrack', 'A weapon rack', 30, 6, 'Somewhere to show off your blades. (Decoration)'], ['armorstand', 'An armour stand', 30, 4, 'Somewhere to hang your mail. (Decoration)'], ['herbrack', 'A drying rack for herbs', 15, 4, 'Bunches of herbs, hung to dry. (Decoration)']]],
  corner: [10, 6, 'The corner', [['barrel', 'A barrel of ale', 10, 2, 'For guests. (Decoration)'], ['woodpile', 'A woodpile', 0, 6, 'Firewood for the winter. (Decoration)'], ['cauldron', 'A cauldron', 40, 0, 'A big iron pot on a hook. (Decoration)']]],
  door: [1, 7, 'By the door', [['basin', 'A washstand', 10, 2, 'Clean hands. (Decoration)'], ['pots', 'Pots and plants', 8, 0, 'A bit of green. (Decoration)']]],
  rug: [null, null, 'The floor', [['rug', 'A woven rug', 20, 0, 'It ties the room together. (Decoration)']]],
};
const house = () => S.house || (S.house = {});
const hasF = d => Object.values(house()).includes(d);
function homeDoor() { const h = S.maps.home; if (!h) return [1, 20]; const lm = (h.landmarks || []).find(l => l.spec && (l.site === 'house' || l.spec.kind === 'home' || l.spec.kind === 'cottage')); return lm ? [lm.x + (lm.spec.door || 1), lm.y + lm.h] : (typeof HOME_ENTRY !== 'undefined' ? HOME_ENTRY : [1, 20]); }
function buildHouse() {
  const m = blankMap('myhouse', HW, HH, 'w', { lit: true, name: `${P().name}'s house`, theme: 'house' });
  box(m, 0, 0, HW - 1, HH - 1, '#'); rect(m, 1, 1, HW - 2, 1, '#');
  const dx = Math.floor(HW / 2); setTile(m, dx, HH - 1, '+'); m.trig[K(dx, HH - 1)] = { go: 'home', at: homeDoor() };
  m.decor[K(2, 1)] = 'iwindow'; m.decor[K(8, 1)] = 'iwindow';
  m.decor[K(HW - 2, HH - 2)] = 'podium'; m.trig[K(HW - 2, HH - 2)] = { furnish: 1 };
  m.lights = [[dx, 4, 6, 'candle']];
  return m;
}
function furnishHouse(m) {
  const H = house();
  for (const k in HOUSE_SPOTS) { const [x, y] = HOUSE_SPOTS[k]; if (x == null) continue; const key = K(x, y); if (m.decor[key] && m.decor[key] !== 'podium' && !m.trig[key]?.furnish) delete m.decor[key]; if (m.trig[key] && !m.trig[key].furnish) delete m.trig[key]; }
  m.rugs = H.rug ? [[4, 3, 4, 3]] : [];
  for (const k in H) {
    const [x, y] = HOUSE_SPOTS[k] || []; if (x == null) continue; const d = H[k]; m.decor[K(x, y)] = d;
    if (d === 'bed') m.trig[K(x, y)] = { homebed: 1 };
    if (d === 'table') m.decor[K(x + 1, y)] = 'table', m.decor[K(x, y + 1)] = 'bench';
    if (d === 'hearth') m.lights = m.lights.filter(l => l[3] !== 'hearth').concat([[x, y + 1, 4, 'hearth']]);
    if (d.startsWith('trophy')) m.trig[K(x, y)] = { dlg: 'locked', text: { trophy_wolf: 'Greymaw’s great grey head, mounted on oak. The eyes follow you round the room.', trophy_crown: 'A crown from under the mountain, on a cushion. Visitors always ask.', trophy_wyrm: 'The Wyrm’s skull fills the wall. Children dare each other to touch the teeth.' }[d] };
  }
}
function enterHouse() {
  if (!S.maps.myhouse) S.maps.myhouse = buildHouse();
  furnishHouse(S.maps.myhouse);
  goMap('myhouse', Math.floor(HW / 2), HH - 2);
  if (!S.story.houseIn) { S.story.houseIn = 1; msg('Your own house. Bare boards, a window, the smell of new timber. The ledger by the door is for furnishing it.', 'talk'); }
}
// going in: a button on the cottage
{
  const _os = openSite;
  openSite = function (site) {
    _os.apply(this, arguments);
    if (site !== 'house' || !S.home.built.house) return;
    const add = () => { const b = $('#modal-body'); if (b && !b.querySelector('[data-house]')) b.insertAdjacentHTML('beforeend', '<div class="btnrow"><button class="btn default" data-house="in">Go inside</button></div>'); };
    const d0 = modalRefresh; if (d0) modalRefresh = () => { d0(); add(); }; add();
  };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-house]'); if (!b || !S) return; closeModal(true); enterHouse(); });
// inside: the ledger, the bed
{
  const _dt = doTrigger;
  doTrigger = function (tr) {
    if (tr && tr.furnish) return openFurnish();
    if (tr && tr.homebed) { if (typeof rest === 'function') { if (confirm('Sleep until morning?')) rest('home'); } return; }
    return _dt.apply(this, arguments);
  };
}
function openFurnish() {
  const draw = () => {
    const H = house(), p = P();
    $('#modal-body').innerHTML = `<p class="lead">The ledger by the door. Choose what goes where. You can change your mind; nothing is refunded.</p>` + Object.entries(HOUSE_SPOTS).map(([k, [, , label, opts]]) => `<div class="fn-spot"><h4>${label}${H[k] ? ` <span class="dim">· ${esc(opts.find(o => o[0] === H[k])?.[1] || '')}</span>` : ''}</h4><div class="list">${opts.map(([d, name, gold, wood, what, unlock]) => {
      const have = H[k] === d, ok = (!unlock || unlock()) && p.gold >= gold && (p.mats.wood || 0) + ((S.home.mats || {}).wood || 0) >= wood;
      return `<div class="row"><span class="gl">${d === 'rug' ? '▦' : spriteImg(NATIVE_PROPS[d] ? nativePropCanvas(d) : propCanvas(d), 28)}</span><div class="nm"><b>${name}</b><small>${what}${unlock && !unlock() ? ' (not earned yet)' : ''}</small></div><div class="acts">${have ? '<span class="pill">Placed</span>' : `<button class="btn tiny ${ok ? 'default' : ''}" data-fn="${k}:${d}" ${ok ? '' : 'disabled'}>${gold ? gold + 'g' : ''}${gold && wood ? ' + ' : ''}${wood ? wood + ' wood' : ''}${!gold && !wood ? 'Place' : ''}</button>`}</div></div>`;
    }).join('')}</div></div>`).join('');
  };
  openModal('Furnishing', '', { refresh: draw, wide: true }); draw();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fn]'); if (!b || !S) return;
  const [k, d] = b.dataset.fn.split(':'), opt = HOUSE_SPOTS[k][3].find(o => o[0] === d), p = P(); if (!opt) return;
  const [, name, gold, wood] = opt; if (p.gold < gold) return;
  let need = wood; const a = Math.min(need, p.mats.wood || 0); p.mats.wood = (p.mats.wood || 0) - a; need -= a; if (need) { if (!S.home.mats || (S.home.mats.wood || 0) < need) return; S.home.mats.wood -= need; }
  p.gold -= gold; house()[k] = d; if (S.maps.myhouse) furnishHouse(S.maps.myhouse);
  msg(`${name}: placed.`, 'good'); if (typeof sfx === 'function') { try { sfx('door'); } catch (er) { } } refresh(); render();
});
// what the furniture does
{
  const _us = useSkill;
  useSkill = function (id, n) { return _us.call(this, id, hasF('bookcase') ? n * 1.1 : n); };
  const _rest = rest;
  rest = function (where) { const r = _rest.apply(this, arguments); try { if (where === 'home' && S.mapId === 'myhouse' && hasF('bed') && P().buffs.rested) P().buffs.rested = 800; } catch (e) { } return r; };
  const _ui = useItem;
  useItem = function (it) { const t = T(it), p = P(), hp0 = p.hp; const r = _ui.apply(this, arguments); try { if (t.use === 'meal' && S.mapId === 'myhouse' && hasF('table')) { const extra = Math.round((p.hp - hp0) * 0.5); if (extra > 0) { p.hp = Math.min(maxHp(), p.hp + extra); } } } catch (e) { } return r; };
}
if (typeof kitchenHere === 'function') { const _kh = kitchenHere; kitchenHere = function () { if (S.mapId === 'myhouse') return hasF('hearth') ? 'your own hearth' : null; return _kh.apply(this, arguments); }; }
// the journal's world map treats the house as part of your homestead
try { const _jp = jParent; jParent = function (id) { return id === 'myhouse' ? 'home' : _jp.apply(this, arguments); }; } catch (e) { }
try {
  ACHIEVEMENTS.push(['homely', 'Home Sweet Home', 'Furnish every corner of your house.', () => Object.keys(HOUSE_SPOTS).every(k => house()[k]), 'life']);
  ACHIEVEMENTS.push(['trophies', 'Trophy Wall', 'Hang a trophy in your house.', () => Object.values(house()).some(d => /^trophy/.test(d)), 'life']);
} catch (e) { }
