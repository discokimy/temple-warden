// Something to chase: magic gear and legendaries.
// Weapons, armour and jewellery found in the caves can carry one or two magic properties ("a Keen Steel Sword of
// the Bear"), more likely the deeper you go. Champions, and the hardest places, sometimes drop one of the six
// legendaries, each a one-of-a-kind piece with its own story.
// A property lives on the item itself: it.aff = { key: amount }, it.affn = [prefix, suffix].

const AFFIX_PRE_W = [
  ['Keen', { atk: 2 }], ['Brutal', { dmg: 2 }], ['Vampiric', { vamp: 1 }], ['Burning', { burn: 3 }], ['Holy', { holy: 1 }], ['Swift', { dex: 1, atk: 1 }],
];
const AFFIX_PRE_A = [['Sturdy', { def: 2 }], ['Blessed', { regen: 1 }], ['Warded', { nopoison: 1, def: 1 }], ['Supple', { dodge: 0.05 }]];
const AFFIX_SUF = [
  ['of the Bear', { str: 2 }], ['of the Fox', { dex: 2 }], ['of the Owl', { int: 2, mp: 4 }], ['of the Ox', { con: 2 }],
  ['of Warding', { def: 2 }], ['of Vigor', { hp: 12 }], ['of Mending', { regen: 1 }], ['of Fortune', { luck: 1 }], ['of the Dawn', { holy: 1 }],
];
const AFFIX_TEXT = { atk: v => `+${v} to hit`, dmg: v => `+${v} damage`, vamp: () => 'Drinks life from what it cuts', burn: v => `+${v} fire damage`, holy: () => 'Bane of the dead', dex: v => `+${v} DEX`, str: v => `+${v} STR`, int: v => `+${v} INT`, con: v => `+${v} CON`, mp: v => `+${v} MP`, hp: v => `+${v} max HP`, def: v => `Defense +${v}`, regen: () => 'Regenerate faster', nopoison: () => 'Resists poison', dodge: v => `Dodge ${Math.round(v * 100)}%`, luck: () => 'Lucky' };
function addAffixes(it, eff) {
  const t = T(it); if (!t.slot || t.tier >= 99) return it;
  const isW = t.slot === 'weapon', roll1 = 0.12 + eff * 0.025, roll2 = 0.02 + eff * 0.012;
  const n = Math.random() < roll2 ? 2 : Math.random() < roll1 ? 1 : 0; if (!n) return it;
  it.aff = {}; it.affn = ['', ''];
  const add = (a) => { for (const k in a[1]) it.aff[k] = (it.aff[k] || 0) + a[1][k]; };
  const pre = pick(isW ? AFFIX_PRE_W : t.cat === 'jewelry' ? AFFIX_PRE_A.slice(0, 3) : AFFIX_PRE_A), suf = pick(AFFIX_SUF);
  if (n === 2 || Math.random() < 0.5) { it.affn[0] = pre[0]; add(pre); }
  if (n === 2 || !it.affn[0]) { it.affn[1] = suf[0]; add(suf); }
  return it;
}
{
  const _rl = randomLoot;
  randomLoot = function (eff) { const it = _rl.apply(this, arguments); try { addAffixes(it, eff || 1); } catch (e) { } return it; };
  const _in = itemName;
  itemName = function (it) {
    let n = _in.apply(this, arguments);
    if (it && it.affn) { const base = T(it).name; n = n.replace(base, [it.affn[0], base, it.affn[1]].filter(Boolean).join(' ')); }
    return n;
  };
  const _id = itemDesc;
  itemDesc = function (it) {
    const d = _id.apply(this, arguments);
    if (!it || !it.aff) return d;
    const extra = Object.entries(it.aff).map(([k, v]) => AFFIX_TEXT[k] ? AFFIX_TEXT[k](v) : '').filter(Boolean).join(' · ');
    return `${it.legend ? '★ Legendary · ' : it.affn && it.affn[0] && it.affn[1] ? '✦ Rare · ' : '✦ Magic · '}${extra} · ${d}`;
  };
  const _iv = itemValue;
  itemValue = function (it) { const v = _iv.apply(this, arguments); return it && it.aff ? v * (1 + 0.6 * Object.keys(it.aff).length) + (it.legend ? 400 : 0) : v; };
}
// the special properties, when a blow lands
{
  const _at = attack;
  attack = function (mon) {
    const hp0 = mon ? mon.hp : 0, r = _at.apply(this, arguments);
    try {
      const w = P().equip.weapon, a = w && w.aff, m = curMap();
      if (a && mon && m.mons.includes(mon) && mon.hp < hp0) {
        const t = MONSTERS[mon.id], p = P();
        let extra = 0;
        if (a.burn) extra += roll(1, a.burn);
        if (a.holy && t.undead) extra += Math.ceil((hp0 - mon.hp) * 0.5);
        if (extra) { mon.hp -= extra; addFloat(mon.x, mon.y, extra, a.holy && t.undead ? '#fff0a0' : '#ff9a3a'); if (mon.hp <= 0) { msg(`${The(mon)} ${a.holy && t.undead ? 'crumbles in holy light' : 'burns'}.`, 'kill'); if (typeof gainXp === 'function') gainXp(t.xp); killMonster(mon); } }
        if (a.vamp && p.hp < maxHp()) { const h = Math.max(1, Math.round((hp0 - mon.hp) * 0.15)); p.hp = Math.min(maxHp(), p.hp + h); addFloat(p.x, p.y, '+' + h, '#c06aff'); }
      }
    } catch (e) { }
    return r;
  };
}

// ---------------- the legendaries ----------------
const LEGENDS = {
  leg_dawnbringer: { name: 'Dawnbringer', base: 'sword_silver', aff: { holy: 1, atk: 3, dmg: 2, burn: 2 }, lore: 'Saint Edda’s own sword, they say, carried down into the dark the first time the door was shut. It is warm to hold.' },
  leg_greywatch: { name: 'Greywatch Plate', base: 'plate_steel', aff: { def: 3, hp: 20, con: 1 }, lore: 'Plate from the Wardens’ own armoury, the tower sigil filed off the breast. It fits as if it were made for you.' },
  leg_stormbow: { name: 'Stormcaller', base: 'bow_mithril', aff: { dex: 2, atk: 3, burn: 3 }, lore: 'A bow strung with something that hums. Arrows leave it with a crack like thunder.' },
  leg_keeper: { name: 'The Keeper’s Ring', base: 'ringprot', aff: { str: 1, int: 1, con: 1, regen: 1 }, lore: 'Aldren’s ring, the keeper of the Old Treaty. The four crests are worn almost smooth.' },
  leg_wolfking: { name: 'Mantle of the Wolf-King', base: 'leather_mithril', aff: { dodge: 0.12, luck: 1, dex: 1 }, lore: 'Greymaw’s grandsire’s pelt, made into a hunting mantle. Beasts give you a wide berth.' },
  leg_ember: { name: 'Emberheart', base: 'staff_mithril', aff: { int: 3, mp: 15, spell: 0.4 }, lore: 'A staff with a coal at its heart that never goes out. The Hierophant wanted it badly.' },
};
function makeLegend(id) {
  const L = LEGENDS[id]; const it = makeItem(L.base); it.aff = Object.assign({}, L.aff); it.affn = ['', '']; it.legend = id;
  return it;
}
{
  const _in = itemName;
  itemName = function (it) { if (it && it.legend && LEGENDS[it.legend]) { let n = LEGENDS[it.legend].name; if (it.ench) n = (it.ench > 0 ? '+' : '') + it.ench + ' ' + n; return n; } return _in.apply(this, arguments); };
}
function dropLegend(m, x, y) {
  const owned = new Set([...(P().inv || []), ...Object.values(P().equip || {})].filter(Boolean).map(i => i.legend));
  const free = Object.keys(LEGENDS).filter(id => !owned.has(id) && !(S.legendsFound || []).includes(id)); if (!free.length) return false;
  const id = pick(free); (S.legendsFound = S.legendsFound || []).push(id);
  m.ground.push({ x, y, item: makeLegend(id) });
  msg(`Something gleams among the remains: ${LEGENDS[id].name}. A legendary.`, 'level'); if (typeof sfx === 'function') { try { sfx('level'); } catch (e) { } }
  return true;
}
{
  const _km = killMonster;
  killMonster = function (mon) {
    const live = mon && curMap().mons.includes(mon), champ = live && mon.champion, t = live && MONSTERS[mon.id];
    const r = _km.apply(this, arguments);
    try {
      const m = curMap();
      if (champ && Math.random() < 0.15) dropLegend(m, mon.x, mon.y);
      if (live && t.boss && Math.random() < 0.35) dropLegend(m, mon.x, mon.y);
      if (live && (mon.id === 'corvane' || mon.id === 'c_bishop')) dropLegend(m, mon.x, mon.y);
    } catch (e) { }
    return r;
  };
}
// the encyclopedia and bestiary know the legendaries; lore in the item window
try {
  for (const id in LEGENDS) if (typeof ITEM_LORE !== 'undefined') ITEM_LORE[id] = LEGENDS[id].lore;
  ACHIEVEMENTS.push(['magic', 'Something Special', 'Find a magic item.', () => [...(P().inv || []), ...Object.values(P().equip || {})].some(i => i && i.aff), 'collect']);
  ACHIEVEMENTS.push(['legend', 'Legendary', 'Find a legendary.', () => (S.legendsFound || []).length >= 1, 'collect']);
  ACHIEVEMENTS.push(['legends', 'The Old Armoury', 'Find all six legendaries.', () => (S.legendsFound || []).length >= 6, 'collect']);
} catch (e) { }
