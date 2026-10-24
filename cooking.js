// Cooking. All the meat, fish, eggs, milk, wheat, apples and cave forage you collect can go into a pot.
// Cook in any kitchen (the inn, your homestead, the parsonage), or anywhere at all over a campfire, which costs one
// wood. A meal heals you and leaves you Well Fed with a lasting benefit. Meals stack in your pack and sit on the
// hotbar. The Crafting window has a Kitchen tab; cooking raises Survival.

const ANY = {
  fish: () => Object.keys(MATS).filter(id => MATS[id].spr === 'fish'),
  mushroom: () => ['redcap', 'glowcap', 'inkcap', 'truffle'].filter(id => MATS[id]),
  herb: () => ['healroot', 'stonemoss', 'moonpetal', 'cavelily'].filter(id => MATS[id]),
};
const ANY_NAME = { fish: 'any fish', mushroom: 'any mushroom', herb: 'any healing herb' };
// [id, name, ingredients {mat|any: n}, heal, mana, buffs {name: turns}, blurb, colours]
const MEALS = [
  ['meal_roast', 'Roast Meat', { meat: 1 }, 15, 0, { rested: 300 }, 'Charred outside, pink in the middle, salted with what you had.', ['8a4a2a', 'c9784a']],
  ['meal_stew', 'Fish Stew', { fish: 2, herb: 1 }, 25, 0, { regenb: 200 }, 'Fish, roots and river water, simmered till the bones give up.', ['c9a45a', 'efe2b0']],
  ['meal_pie', 'Hunter’s Pie', { meat: 1, wheat: 1, egg: 1 }, 30, 0, { hunt: 300 }, 'A thick crust over game and gravy. Rangers swear by it.', ['b8742a', 'e8b86a']],
  ['meal_omelette', 'Mushroom Omelette', { egg: 2, mushroom: 1 }, 20, 5, { waters: 300 }, 'Eggs and cave mushrooms. Your eyes feel sharper in the dark afterwards.', ['f2d36a', 'a07a4a']],
  ['meal_bread', 'Stoneback Bread', { wheat: 2, rocksalt: 1 }, 15, 0, { stone: 300 }, 'Dense, salty miners’ bread. It sits in you like a shield.', ['a07a4a', 'd8b88a']],
  ['meal_cake', 'Apple Cake', { apple: 2, egg: 1, milk: 1, wheat: 1 }, 25, 99, { rested: 200 }, 'Berta’s recipe. Warm, sweet, and it clears the head.', ['e0a050', 'c9343c']],
  ['meal_feast', 'Truffle Feast', { truffle: 1, meat: 1, milk: 1 }, 50, 10, { rested: 300, hunt: 200 }, 'A cave truffle shaved over roast and cream. The inn would charge a week’s wages.', ['6a4a3a', 'f6e6c0']],
  ['meal_broth', 'Glowing Eel Broth', { caveeel: 1, stonemoss: 1 }, 20, 10, { haste: 60, regenb: 100 }, 'It glows faintly in the bowl. You feel quick, almost too quick.', ['3f6f8a', 'a9e0ff']],
];
for (const [id, name, , heal, mana, buffs, blurb, pal] of MEALS) {
  ITEMS[id] = { id, name, spr: 'potion', pal: { b: pal[0], c: pal[1] }, cat: 'food', stack: 1, val: 6 + heal, tier: 1, wt: 0.5, use: 'meal', note: blurb };
  if (typeof ITEM_LORE !== 'undefined') ITEM_LORE[id] = blurb;
}
if (typeof HOT_ITEMS !== 'undefined') HOT_ITEMS.push(...MEALS.map(m => m[0]));
if (typeof CAT_NAMES !== 'undefined' && !CAT_NAMES.food) CAT_NAMES.food = 'Food';
const mealOf = id => MEALS.find(m => m[0] === id);
const haveMat = id => (P().mats[id] || 0) + ((S.mapId === 'home' && S.home && S.home.mats && S.home.mats[id]) || 0);
// which actual materials would be used for an ingredient line
function pickIngredient(key, n) {
  const ids = ANY[key] ? ANY[key]() : [key];
  const out = []; let need = n;
  for (const id of ids.sort((a, b) => (MATS[a].val || 0) - (MATS[b].val || 0))) { const h = haveMat(id); if (!h) continue; const take = Math.min(h, need); out.push([id, take]); need -= take; if (!need) break; }
  return need ? null : out;
}
function canCook(meal) { return Object.entries(meal[2]).every(([k, n]) => pickIngredient(k, n)); }
function takeMat(id, n) { const p = P(); const a = Math.min(n, p.mats[id] || 0); p.mats[id] -= a; n -= a; if (n && S.home && S.home.mats) S.home.mats[id] -= n; }
// a kitchen, or a campfire
function kitchenHere() {
  if (['home', 'parsonage'].includes(S.mapId)) return 'your hearth';
  const m = curMap(); if (m.id.startsWith('in_') && /inn|home/.test((m.kind || m.style || '') + (m.name || '').toLowerCase())) return 'the hearth';
  if (S.mapId === 'temple') return 'the offering fire';
  return null;
}
function cookOne(id) {
  const meal = mealOf(id); if (!meal || !canCook(meal)) return;
  const p = P(), kitchen = kitchenHere();
  if (!kitchen) {
    const cm = curMap(); if (cm.mons.some(o => (o.hunting > 0 || o.angry) && !o.peace && cheb(o, p) <= 8)) { msg('Not with something hunting you.', 'warn'); return; }
    if (S.campDay !== S.day + ':' + S.mapId) { if ((p.mats.wood || 0) < 1) { msg('You need a wood to build a campfire, or a kitchen.', 'warn'); return; } p.mats.wood--; S.campDay = S.day + ':' + S.mapId; msg('You build a small campfire.', 'talk'); }
  }
  for (const [k, n] of Object.entries(meal[2])) for (const [mid, q] of pickIngredient(k, n)) takeMat(mid, q);
  addItem(makeItem(id)); useSkill('survival', 3); if (typeof cxBump === 'function') cxBump('meals');
  S.turn += 20; if (typeof sfx === 'function') { try { sfx('gather'); } catch (e) { } }
  msg(`You cook ${meal[1]}.`, 'good');
}
// eating
{
  const _ui = useItem;
  useItem = function (it) {
    const t = T(it); if (t.use !== 'meal') return _ui.apply(this, arguments);
    const meal = mealOf(t.id), p = P(); if (!meal) return;
    const [, name, , heal, mana, buffs] = meal;
    p.hp = Math.min(maxHp(), p.hp + heal); if (mana) p.mp = Math.min(maxMp(), p.mp + mana);
    p.buffs = p.buffs || {}; for (const [b, n] of Object.entries(buffs)) p.buffs[b] = Math.max(p.buffs[b] || 0, n);
    p.lastMeal = S.day; removeOne(it); addFloat(p.x, p.y, '+' + heal, '#8fd16a');
    msg(`You eat the ${name}. Well fed: ${Object.keys(buffs).map(b => BUFF_NAMES[b] || b).join(', ')}.`, 'good');
    if (typeof sfx === 'function') { try { sfx('heal'); } catch (e) { } }
    endTurn(); refresh(); render();
  };
}
// the Kitchen tab in the Crafting window
function htmlKitchen() {
  const kitchen = kitchenHere(), p = P();
  const rows = MEALS.map(meal => {
    const [id, name, ing, heal, mana, buffs, blurb] = meal, ok = canCook(meal);
    const parts = Object.entries(ing).map(([k, n]) => { const have = ANY[k] ? ANY[k]().reduce((a, x) => a + haveMat(x), 0) : haveMat(k); return `<span class="${have >= n ? 'ok' : 'no'}">${ANY_NAME[k] || MATS[k].name} ${Math.min(have, n)}/${n}</span>`; }).join(' · ');
    const fx = [`+${heal} health`, mana >= 99 ? 'full mana' : mana ? `+${mana} mana` : '', ...Object.entries(buffs).map(([b, n]) => `${BUFF_NAMES[b] || b} (${n} turns)`)].filter(Boolean).join(', ');
    return `<div class="row"><span class="gl">${icon(id)}</span><div class="nm"><b>${name}</b><small>${fx}</small><small class="ck-ing">${parts}</small></div><div class="acts"><button class="btn tiny ${ok ? 'default' : ''}" data-cook="${id}" ${ok ? '' : 'disabled'}>Cook</button></div></div>`;
  }).join('');
  return `<p class="hint" style="margin-top:0 !important">${kitchen ? `You can cook at ${kitchen}.` : `No kitchen here: cooking builds a campfire, which takes one wood (you have ${p.mats.wood || 0}).`} Meals heal you and leave you Well Fed. They go on your hotbar.</p><div class="list">${rows}</div>`;
}
{
  const _hc = htmlCrafting;
  htmlCrafting = function () {
    const real = craftView;
    if (real === 'kitchen') craftView = 'forge';
    let html = _hc.apply(this, arguments);
    craftView = real;
    // add the Kitchen tab beside the others, and show it when chosen
    html = html.replace(/(<div class="filters" role="tablist">[\s\S]*?)(<\/div>)/, (m0, a, b) => `${a}<button class="${real === 'kitchen' ? 'on' : ''}" role="tab" aria-selected="${real === 'kitchen'}" data-a="cview" data-v="kitchen">Kitchen</button>${b}`);
    if (real === 'kitchen') { html = html.replace(/class="on" role="tab" aria-selected="true" data-a="cview" data-v="forge"/, 'class="" role="tab" aria-selected="false" data-a="cview" data-v="forge"'); const end = html.indexOf('</div>', html.indexOf('class="filters"')) + 6; html = html.slice(0, end) + htmlKitchen(); }
    return html;
  };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-cook]'); if (!b || !S) return; cookOne(b.dataset.cook); refresh(); render(); });
// the inn's cook, and Tamsin, sell a few meals for those who don't cook
setInterval(() => {
  try {
    if (!S || !SHOPS.market || SHOPS.market._meals) return; SHOPS.market._meals = 1;
    SHOPS.market.sells.push(['meal_roast', 4], ['meal_bread', 3], ['meal_pie', 2]);
    const sh = S.shops && S.shops.market; if (sh) for (const [iid, n] of [['meal_roast', 4], ['meal_bread', 3], ['meal_pie', 2]]) if (!sh.stock[iid]) sh.stock[iid] = { qty: n, target: n };
  } catch (e) { }
}, 2000);
try {
  ACHIEVEMENTS.push(['cook', 'Hearth and Home', 'Cook your first meal.', () => (cxState().n.meals || 0) >= 1, 'life']);
  ACHIEVEMENTS.push(['chef', 'The Valley’s Best Table', 'Cook every kind of meal.', () => MEALS.every(m => cxState().it[m[0]]), 'life']);
} catch (e) { }
