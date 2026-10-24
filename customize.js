// The Temple Warden — more ways to be yourself: build, jaw, eye colour, marks (freckles, scars, a tattoo, warpaint),
// more hairstyles and hair accents, and an origin: how you spent your youth while Halvard raised you, each with its
// own small head start.
'use strict';

LOOK.hair.push('Topknot', 'Braid', 'Afro', 'Undercut', 'Dreadlocks', 'Long and loose');
HAIR_MAP.push('bun', 'braid', 'afro', 'undercut', 'dreads', 'long');
LOOK.build = ['Average', 'Slim', 'Broad', 'Stocky'];
LOOK.jaw = ['Strong', 'Soft'];
LOOK.eyes = ['5a3a22', '7a6a3a', '3f7a4a', '3b6fc4', '7a8590', 'b8862a'];
LOOK.mark = ['None', 'Freckles', 'Scar over the eye', 'Scar on the cheek', 'Sun tattoo', 'Red warpaint', 'Blue warpaint', 'Beauty mark'];
LOOK.hairFx = ['None', 'Greying temples', 'Sun-bleached tips', 'Dyed streak'];
const BUILD_OF = ['adult', 'slim', 'broad', 'stout'], MARK_OF = [null, 'freckles', 'scar', 'cheekscar', 'tattoo', 'paintred', 'paintblue', 'mole'], HAIRFX_OF = [null, 'grey', 'tips', 'streak'];
{
  const _hs = heroSpec;
  heroSpec = function (equip = {}, L = {}) {
    const s = _hs(equip, L);
    s.build = BUILD_OF[L.build || 0] || 'adult';
    if (L.jaw) s.jaw = 'soft';
    if (L.eyes) s.eyes = LOOK.eyes[L.eyes];
    if (L.mark) s.mark = MARK_OF[L.mark];
    if (L.hairFx) s.hairFx = HAIRFX_OF[L.hairFx];
    return s;
  };
}

// ---------------- origins ----------------
const ORIGINS = {
  temple: { name: 'Raised in the temple', blurb: "Halvard's shadow since you could walk. You know every prayer, every draught in the parsonage and every creak of the old floor.", bonus: 'Faith and Restoration +10, an extra healing draught' },
  forge: { name: "Bran's apprentice", blurb: 'Two summers at the forge, pumping the bellows and learning to read hot iron. Your arms remember.', bonus: 'Smithing +12, Blunt +6, Constitution +1, five iron ore' },
  hunt: { name: 'Ran with the hunters', blurb: 'The Thatchers took you into the Whisperwood every autumn. You learned to walk quiet and shoot straight.', bonus: 'Archery +12, Sneak +6, Dexterity +2, a hunting bow and arrows' },
  farm: { name: 'Hired out to the farms', blurb: "Harvests, lambing, hauling stone for walls. You're stronger than you look and you know the land.", bonus: 'Survival +12, Strength +2, a wood axe, a sack of apples' },
  cathedral: { name: 'A year at the cathedral', blurb: 'Halvard sent you to the cathedral school for a year of letters and lore. You came back knowing more than you should.', bonus: 'Intelligence +2, Divination +10, the Light spell, a mana draught' },
};
function applyOrigin(id) {
  const o = ORIGINS[id] || ORIGINS.temple, p = P(); p.origin = id in ORIGINS ? id : 'temple';
  const sk = (k, n) => { if (p.sk && k in p.sk) p.sk[k] = Math.min(100, p.sk[k] + n); };
  const give = (iid, q = 1) => { try { addItem(makeItem(iid, 0, q)); } catch (e) { } };
  switch (p.origin) {
    case 'temple': sk('faith', 10); sk('restoration', 10); give('pheal'); break;
    case 'forge': sk('smithing', 12); sk('blunt', 6); p.stats.con += 1; addMat('iron', 5); break;
    case 'hunt': sk('archery', 12); sk('sneak', 6); p.stats.dex += 2; give('bow_iron'); give('arrows', 20); break;
    case 'farm': sk('survival', 12); p.stats.str += 2; give('woodaxe'); addMat('apple', 6); break;
    case 'cathedral': p.stats.int += 2; sk('divination', 10); if (!p.spells.includes('light')) p.spells.push('light'); give('pmana'); break;
  }
  p.hp = maxHp(); p.mp = maxMp();
  msg(`${o.name}. ${o.blurb}`, 'news');
  refresh();
}
function originRow(sel) {
  return `<div class="cr-row cr-diff"><label>Your youth</label><div class="diffs">${Object.entries(ORIGINS).map(([k, o]) => `<button class="diff ${sel === k ? 'on' : ''}" data-a="origin" data-v="${k}" aria-pressed="${sel === k}"><b>${o.name}</b><small>${o.blurb}</small><small class="ok">${o.bonus}</small></button>`).join('')}</div></div>`;
}

// ---------------- masks and face-covering helms (worn in the helm slot) ----------------
const MASKS = {
  helm_closed:  { name: 'Closed Visored Helm', mask: 'closed', def: 4, val: 180, wt: 6, tier: 2, grade: 'steel', note: 'Covers the whole face. Heavy, but nothing gets past the visor', shop: 'armor' },
  hood_scarf:   { name: "Hunter's Hood and Scarf", mask: 'scarf', hat: 'hood', hatColor: '4a3e2e', maskColor: '5a4a3a', def: 1, val: 45, wt: 1, tier: 1, grade: 'iron', note: 'Hides your face. Sneaking comes a little easier', shop: 'general' },
  mask_ritual:  { name: 'Carved Ritual Mask', mask: 'ritual', def: 0, val: 90, wt: 1, tier: 2, grade: 'iron', note: 'Worn at the old rites. Prayers come a little easier', shop: 'magic' },
  mask_plague:  { name: "Plague Doctor's Mask", mask: 'plague', hat: 'hood', hatColor: '2a2428', def: 1, val: 120, wt: 1, tier: 2, grade: 'iron', note: 'Herbs in the beak. Keeps sickness and foul air at bay', shop: 'alchemist' },
  mask_wolf:    { name: 'Wolf-skull Mask', mask: 'wolf', def: 2, val: 150, wt: 2, tier: 3, grade: 'iron', note: 'A hunter\'s trophy. Beasts hesitate before it', shop: null },
};
for (const id in MASKS) { const k = MASKS[id]; ITEMS[id] = { id, name: k.name, cat: 'armor', slot: 'helm', cls: 'helm', grade: k.grade, def: k.def, atk: 0, mp: 0, val: k.val, tier: k.tier, wt: k.wt, note: k.note, mask: k.mask }; }
// the wolf skull turns up as loot in the deep woods and caves
window.addEventListener('load', () => {
  const _rl = randomLoot;
  randomLoot = function (eff) { if (eff >= 3 && Math.random() < 0.025) return makeItem('mask_wolf'); return _rl(eff); };
});
// wear it: the mask over the face, a hood over the hair where it has one
{
  const _hs2 = heroSpec;
  heroSpec = function (equip = {}, L = {}) {
    const s = _hs2(equip, L), h = equip.helm && MASKS[equip.helm.id];
    if (h) { s.mask = h.mask; if (h.maskColor) s.maskColor = h.maskColor; if (h.hat) { s.hat = h.hat; s.hatColor = h.hatColor; } else if (h.mask !== 'closed') delete s.hat; if (h.mask === 'closed') { s.hat = 'helm'; s.hatColor = '9aa5b0'; } if (h.hat || h.mask === 'closed') s.hair = 'bald'; }
    return s;
  };
}
// on the shelves
function stockMasks() {
  if (!S || !S.shops) return;
  for (const id in MASKS) {
    const sh = MASKS[id].shop; if (!sh || !SHOPS[sh]) continue;
    if (!SHOPS[sh].sells.some(([i]) => i === id)) SHOPS[sh].sells.push([id, 1]);
    if (S.shops[sh] && !S.shops[sh].stock[id]) S.shops[sh].stock[id] = { qty: 1, target: 1 };
  }
}
setInterval(() => { try { stockMasks(); } catch (e) { } }, 2000);
// icons
{
  const cache = {};
  const ART = {
    closed: (F, P, E) => { E(16, 16, 11, 12, '#7a848e'); E(15, 15, 10, 11, '#9aa5b0'); F(8, 15, 16, 2, '#1a1418'); F(15, 5, 2, 22, '#7a848e'); for (const x of [10, 13, 18, 21]) P(x, 22, '#3a3a40'); P(10, 8, '#dfe6ec'); },
    scarf: (F, P, E) => { E(16, 13, 11, 11, '#4a3e2e'); E(16, 15, 8, 8, '#eab38b'); F(8, 17, 16, 9, '#5a4a3a'); for (let x = 9; x < 24; x += 3) P(x, 20, '#3e3226'); P(13, 13, '#1a1418'); P(18, 13, '#1a1418'); },
    ritual: (F, P, E) => { E(16, 16, 10, 13, '#8a6a42'); E(16, 15, 9, 12, '#b08a5a'); F(11, 13, 3, 2, '#1a1418'); F(18, 13, 3, 2, '#1a1418'); F(15, 22, 3, 1, '#6a4a2a'); for (const [x, y] of [[16, 6], [15, 7], [17, 7], [16, 8]]) P(x, y, '#e3b93c'); P(10, 18, '#b9343c'); P(22, 18, '#b9343c'); },
    plague: (F, P, E) => { E(14, 14, 10, 11, '#3a3036'); E(11, 12, 2.5, 2.5, '#c8d8e0'); E(18, 12, 2.5, 2.5, '#c8d8e0'); for (let k = 0; k < 10; k++) F(15 + k * 0.6, 17 + k, 4 - k * 0.3, 2, '#4a3e44'); P(10, 11, '#ffffff'); P(17, 11, '#ffffff'); },
    wolf: (F, P, E) => { E(16, 13, 11, 9, '#cfc6b2'); E(16, 12, 10, 8, '#e8e0cc'); F(10, 11, 4, 3, '#1a1418'); F(18, 11, 4, 3, '#1a1418'); F(14, 16, 4, 6, '#d8d0bc'); for (let x = 12; x <= 20; x += 2) F(x, 22, 1, 3, '#f4f0e6'); F(5, 4, 3, 6, '#e8e0cc'); F(24, 4, 3, 6, '#e8e0cc'); },
  };
  const _ic = itemCanvas;
  itemCanvas = function (id) {
    if (!MASKS[id]) return _ic(id);
    if (cache[id]) return cache[id];
    return cache[id] = nativeProp(32, 32, ({ F, P, E }) => ART[MASKS[id].mask](F, P, E));
  };
}
