// The Temple Warden — game data: items, monsters, kingdoms, shops, economy, skills, recipes.
'use strict';

const SLOTS = ['weapon', 'shield', 'light', 'helm', 'armor', 'boots', 'ring', 'amulet'];
const SLOT_NAMES = { weapon: 'Weapon', shield: 'Shield', light: 'Light', helm: 'Helm', armor: 'Armor', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };

// ---------- Equipment grades ----------
const GRADES = ['iron', 'steel', 'silver', 'mithril'];
const GRADE_INFO = {
  iron:    { name: 'Iron',    dmg: [0, 0], atk: 0, val: 1,   tier: 1 },
  steel:   { name: 'Steel',   dmg: [1, 2], atk: 0, val: 2.4, tier: 2 },
  silver:  { name: 'Silver',  dmg: [2, 3], atk: 1, val: 4.5, tier: 3 },
  mithril: { name: 'Mithril', dmg: [3, 5], atk: 2, val: 9,   tier: 5 },
};

// which classes shoot (F fires them) and which reach two tiles
const RANGED_CLS = new Set(['bow', 'crossbow']);
const REACH_CLS = new Set(['spear', 'halberd']);
// Thirteen weapon classes. dtype matters: monsters resist or are weak to slash / pierce / blunt.
const WEAPON_CLASSES = {
  dagger: { name: 'Dagger', dmg: [1, 4], atk: 2, dtype: 'pierce', val: 15, note: 'Lands critical hits more often' },
  sword:  { name: 'Sword',  dmg: [2, 7], atk: 1, dtype: 'slash',  val: 40, note: 'Reliable all-rounder' },
  axe:    { name: 'Axe',    dmg: [2, 9], atk: 0, dtype: 'slash',  val: 45, note: 'Can cleave a second foe' },
  mace:   { name: 'Mace',   dmg: [2, 7], atk: 0, dtype: 'blunt',  val: 40, note: 'Ignores some armor' },
  spear:  { name: 'Spear',  dmg: [2, 8], atk: 0, dtype: 'pierce', val: 35, note: 'Strikes foes 2 tiles away' },
  bow:    { name: 'Bow',    dmg: [2, 7], atk: 1, dtype: 'pierce', val: 45, twoHand: 1, note: 'Fire arrows with F. Two-handed' },
  staff:  { name: 'Staff',  dmg: [1, 5], atk: 0, dtype: 'blunt',  val: 50, twoHand: 1, note: 'Stronger spells, more mana. Two-handed' },
  crossbow:   { name: 'Crossbow',   dmg: [3, 10], atk: 2, dtype: 'pierce', val: 70, twoHand: 1, note: 'Fire bolts with F. Hits harder than a bow, but must be wound between shots. Two-handed' },
  warhammer:  { name: 'War Hammer', dmg: [3, 10], atk: -1, dtype: 'blunt', val: 65, twoHand: 1, note: 'Crushing blows that dent plate. Two-handed' },
  flail:      { name: 'Flail',      dmg: [2, 9], atk: 0, dtype: 'blunt',  val: 50, note: 'The ball whips round a shield' },
  greatsword: { name: 'Greatsword', dmg: [3, 11], atk: 0, dtype: 'slash', val: 85, twoHand: 1, note: 'A great blade for both hands. Two-handed' },
  rapier:     { name: 'Rapier',     dmg: [1, 6], atk: 3, dtype: 'pierce', val: 55, note: 'Quick and precise. Lands critical hits more often' },
  halberd:    { name: 'Halberd',    dmg: [3, 9], atk: 0, dtype: 'slash',  val: 70, twoHand: 1, note: 'Strikes foes 2 tiles away. Two-handed' },
};
const WEAPON_NAMES = {
  bow: ['Hunting Bow', 'Longbow', 'Silverwood Bow', 'Mithril Bow'],
  staff: ['Oak Staff', 'Ironwood Staff', 'Silver Staff', 'Mithril Staff'],
  crossbow: ['Light Crossbow', 'Heavy Crossbow', 'Silvered Arbalest', 'Mithril Arbalest'],
};
// Four armor classes plus shields, helms, boots.
const ARMOR_CLASSES = {
  robe:    { slot: 'armor',  names: ['Linen Robe', 'Silk Robe', 'Runed Robe', 'Archmage Robe'], def: [0, 1, 1, 2], mp: [4, 8, 12, 16], val: 20, note: 'More mana, stronger spells' },
  leather: { slot: 'armor',  names: ['Leather Armor', 'Hardened Leather', 'Studded Leather', 'Shadowhide Armor'], def: [2, 3, 4, 5], val: 25, note: 'Sometimes dodge blows entirely' },
  mail:    { slot: 'armor',  names: ['Iron Chain Mail', 'Steel Chain Mail', 'Silver Scale Mail', 'Mithril Mail'], def: [3, 4, 6, 7], val: 60, note: 'Balanced protection' },
  plate:   { slot: 'armor',  names: ['Iron Plate', 'Steel Plate', 'Silvered Plate', 'Mithril Plate'], def: [5, 6, 8, 10], val: 120, atk: -1, spellfail: 0.25, note: '−1 to hit, spells may fail' },
  shieldl: { slot: 'shield', names: ['Buckler', 'Steel Buckler', 'Silver Buckler', 'Mithril Buckler'], def: [1, 2, 2, 3], val: 15 },
  shieldh: { slot: 'shield', names: ['Tower Shield', 'Steel Tower Shield', 'Silver Tower Shield', 'Mithril Tower Shield'], def: [3, 4, 5, 6], val: 60, atk: -1, note: '−1 to hit' },
  helm:    { slot: 'helm',   names: ['Leather Cap', 'Iron Helm', 'Steel Great Helm', 'Mithril Helm'], def: [1, 2, 3, 4], val: 12 },
  boots:   { slot: 'boots',  names: ['Leather Boots', 'Iron Greaves', 'Steel Greaves', 'Mithril Greaves'], def: [1, 2, 2, 3], val: 15 },
};

// Weight in pounds. Mithril gear weighs 60% of the usual.
const WEAPON_WT = { dagger: 1, sword: 3, axe: 5, mace: 5, spear: 6, bow: 2, staff: 4, crossbow: 6, warhammer: 8, flail: 6, greatsword: 7, rapier: 2, halberd: 8 };
const ARMOR_WT = { robe: [4, 4, 4, 4], leather: [12, 13, 13, 10], mail: [25, 27, 27, 25], plate: [45, 48, 48, 45], shieldl: [6, 7, 7, 6], shieldh: [15, 17, 17, 15], helm: [1, 4, 5, 4], boots: [2, 5, 5, 4] };
const ITEMS = {};
GRADES.forEach((gr, gi) => {
  const G = GRADE_INFO[gr];
  for (const cls in WEAPON_CLASSES) {
    const c = WEAPON_CLASSES[cls];
    ITEMS[cls + '_' + gr] = {
      name: WEAPON_NAMES[cls] ? WEAPON_NAMES[cls][gi] : `${G.name} ${c.name}`,
      cat: 'weapon', slot: 'weapon', cls, grade: gr, dtype: c.dtype, twoHand: c.twoHand,
      dmg: [c.dmg[0] + G.dmg[0], c.dmg[1] + G.dmg[1]], atk: c.atk + G.atk,
      mp: cls === 'staff' ? 3 + gi * 2 : 0, spell: cls === 'staff' ? 0.3 + gi * 0.1 : 0,
      val: Math.round(c.val * G.val), tier: G.tier, rare: gr === 'mithril', note: c.note, wt: +(WEAPON_WT[cls] * (gr === 'mithril' ? 0.6 : 1)).toFixed(1),
    };
  }
  for (const cls in ARMOR_CLASSES) {
    const c = ARMOR_CLASSES[cls];
    ITEMS[cls + '_' + gr] = {
      name: c.names[gi], cat: 'armor', slot: c.slot, cls, grade: gr,
      def: c.def[gi], atk: c.atk || 0, mp: c.mp ? c.mp[gi] : 0, spell: cls === 'robe' ? 0.1 + gi * 0.05 : 0,
      spellfail: c.spellfail || 0, dodge: cls === 'leather' ? 0.05 + gi * 0.02 : 0,
      val: Math.round(c.val * G.val), tier: G.tier, rare: gr === 'mithril', note: c.note, wt: +(ARMOR_WT[cls][gi] * (gr === 'mithril' ? 0.6 : 1)).toFixed(1),
    };
  }
});

Object.assign(ITEMS, {
  // ---- Boss uniques ----
  grotsnag_cleaver: { name: "Grotsnag's Cleaver", cat: 'weapon', slot: 'weapon', cls: 'axe', grade: 'royal', dtype: 'slash', dmg: [6, 15], atk: 1, val: 900, tier: 99, cleaveAll: 1, note: 'Cleaves every adjacent foe' },
  vesk_fang:        { name: "Vesk's Fang",        cat: 'weapon', slot: 'weapon', cls: 'dagger', grade: 'royal', dtype: 'pierce', dmg: [4, 9], atk: 3, val: 900, tier: 99, venom: 1, note: 'Poisons what it cuts' },
  matriarch_staff:  { name: "The Pale Lantern",   cat: 'weapon', slot: 'weapon', cls: 'staff', grade: 'royal', dtype: 'blunt', dmg: [3, 8], atk: 1, val: 900, tier: 99, twoHand: 1, mp: 14, spell: 0.8, note: 'Greatly empowers spells' },
  coil_spear:       { name: "The Coiled Spear",   cat: 'weapon', slot: 'weapon', cls: 'spear', grade: 'royal', dtype: 'pierce', dmg: [6, 13], atk: 2, val: 900, tier: 99, note: 'Strikes foes 2 tiles away' },

  // ---- Accessories ----
  ringstr:    { name: 'Ring of Strength',  spr: 'ring', pal: { R: 'b9343c' }, cat: 'jewelry', slot: 'ring', str: 2, val: 250, tier: 2 },
  ringprot:   { name: 'Ring of Protection',spr: 'ring', pal: { R: '3b6fc4' }, cat: 'jewelry', slot: 'ring', def: 2, val: 200, tier: 2 },
  ringregen:  { name: 'Ring of Regeneration', spr: 'ring', pal: { R: '3faa4a' }, cat: 'jewelry', slot: 'ring', regen: 1, val: 300, tier: 3 },
  ringvigor:  { name: 'Ring of Vigor',     spr: 'ring', pal: { R: 'e07b2c' }, cat: 'jewelry', slot: 'ring', hp: 15, val: 220, tier: 2 },
  ringacc:    { name: 'Ring of Accuracy',  spr: 'ring', pal: { R: 'f2efe6' }, cat: 'jewelry', slot: 'ring', atk: 2, val: 230, tier: 2 },
  amuwis:     { name: 'Amulet of Wisdom',  spr: 'amulet', pal: { b: '7b4bb5', c: 'b48ee0' }, cat: 'jewelry', slot: 'amulet', int: 2, mp: 5, val: 240, tier: 2 },
  amuward:    { name: 'Amulet of Warding', spr: 'amulet', pal: { b: '3f8f7a', c: '8fd6c0' }, cat: 'jewelry', slot: 'amulet', def: 1, nopoison: 1, val: 260, tier: 3 },
  luckycharm: { name: 'Lucky Charm',       spr: 'amulet', pal: { b: '3faa4a', c: 'a6e39a' }, cat: 'jewelry', slot: 'amulet', luck: 1, val: 200, tier: 2 },

  // ---- Potions ----
  pheal:      { name: 'Potion of Healing',         spr: 'potion', pal: { b: 'b9343c', c: 'f08a8f' }, cat: 'potion', stack: 1, val: 25,  tier: 1, use: 'heal', amt: 25 },
  pgheal:     { name: 'Potion of Greater Healing', spr: 'potion', pal: { b: 'e07b2c', c: 'f6c08a' }, cat: 'potion', stack: 1, val: 70,  tier: 3, use: 'heal', amt: 60 },
  pmana:      { name: 'Potion of Mana',            spr: 'potion', pal: {}, cat: 'potion', stack: 1, val: 40,  tier: 2, use: 'mana', amt: 20 },
  pantidote:  { name: 'Antidote',                  spr: 'potion', pal: { b: '3faa4a', c: 'a6e39a' }, cat: 'potion', stack: 1, val: 15,  tier: 1, use: 'antidote' },
  pstr:       { name: 'Draught of Strength',       spr: 'potion', pal: { b: '7a5a3a', c: 'c9a27a' }, cat: 'potion', stack: 1, val: 60,  tier: 2, use: 'strbuff' },
  plife:      { name: 'Elixir of Life',            spr: 'potion', pal: { b: 'e3b93c', c: 'fff0a0' }, cat: 'potion', stack: 1, val: 500, tier: 5, use: 'life', rare: true },

  // ---- Scrolls & spellbooks ----
  srecall:    { name: 'Scroll of Recall',     spr: 'scroll', pal: { R: '3b6fc4' }, cat: 'scroll', stack: 1, val: 60,  tier: 1, use: 'recall' },
  steleport:  { name: 'Scroll of Teleport',   spr: 'scroll', pal: { R: '7b4bb5' }, cat: 'scroll', stack: 1, val: 30,  tier: 1, use: 'teleport' },
  smapping:   { name: 'Scroll of Mapping',    spr: 'scroll', pal: { R: '3faa4a' }, cat: 'scroll', stack: 1, val: 45,  tier: 2, use: 'mapping' },
  senchant:   { name: 'Scroll of Enchant Weapon', spr: 'scroll', pal: { R: 'e3b93c' }, cat: 'scroll', stack: 1, val: 150, tier: 3, use: 'enchweapon' },
  bmissile:   { name: 'Spellbook: Magic Missile', spr: 'book', pal: { b: '3b6fc4' }, cat: 'book', val: 120, tier: 1, use: 'learn', spell: 'missile' },
  bheal:      { name: 'Spellbook: Heal',          spr: 'book', pal: { b: '3f8a3f' }, cat: 'book', val: 150, tier: 2, use: 'learn', spell: 'heal' },
  bphase:     { name: 'Spellbook: Phase Door',    spr: 'book', pal: { b: '7b4bb5' }, cat: 'book', val: 90,  tier: 1, use: 'learn', spell: 'phase' },
  bfireball:  { name: 'Spellbook: Fireball',      spr: 'book', pal: { b: 'b9343c' }, cat: 'book', val: 400, tier: 3, use: 'learn', spell: 'fireball' },

  // ---- Ammunition & tools ----
  arrows:     { name: 'Arrows',           spr: 'arrows', cat: 'ammo', stack: 1, bundle: 10, val: 1, tier: 1 },
  woodaxe:    { name: "Woodcutter's Axe", spr: 'woodaxe', cat: 'tool', val: 30, tier: 9, tool: 'axe' },
  pickaxe:    { name: 'Pickaxe',          spr: 'pickaxe', cat: 'tool', val: 40, tier: 9, tool: 'pick' },
  sickle:     { name: 'Sickle',           spr: 'sickle', cat: 'tool', val: 20, tier: 9, tool: 'sickle' },
  rod:        { name: 'Fishing Rod',      spr: 'rod', pal: { W: '8b5a2b', w: 'e8e1c8' }, cat: 'tool', val: 25, tier: 9, tool: 'rod', note: 'Walk into water to cast a line' },
  backpack:   { name: 'Sturdy Backpack',  spr: 'backpack', cat: 'tool', val: 80, tier: 9, use: 'backpack', wt: 1 },
  torch:      { name: 'Torch',   spr: 'torch',   cat: 'tool', slot: 'light', stack: 1, light: 5, fuel: 500, val: 3, tier: 1, wt: 1, note: 'Lights 5 tiles. Burns about 500 turns' },
  lantern:    { name: 'Lantern', spr: 'lantern', cat: 'tool', slot: 'light', light: 7, fuel: 2500, refill: 1, val: 120, tier: 2, wt: 3, note: 'Lights 7 tiles. Refill with lamp oil' },
  oil:        { name: 'Flask of Lamp Oil', spr: 'potion', pal: { b: '6a5a2a', c: 'c9a84a' }, cat: 'tool', stack: 1, val: 8, tier: 1, use: 'refuel', wt: 1 },

  // ---- Story ----
  journal:    { name: "Halvard's Journal", spr: 'book', pal: { b: '8f5d2c', Y: 'c9a27a' }, cat: 'story', val: 0, tier: 99, use: 'journal' },
  seal_g:     { name: 'Seal of Gnarlhold',  spr: 'seal', pal: { R: '6aa33c' }, cat: 'story', val: 0, tier: 99 },
  seal_r:     { name: 'Seal of the Gnawing Court', spr: 'seal', pal: { R: '8a7262' }, cat: 'story', val: 0, tier: 99 },
  seal_h:     { name: 'Seal of the Hollows', spr: 'seal', pal: { R: 'b8c4dc' }, cat: 'story', val: 0, tier: 99 },
  seal_s:     { name: 'Seal of Sszarith',   spr: 'seal', pal: { R: '3f8f7a' }, cat: 'story', val: 0, tier: 99 },
  greymawfang:{ name: "Greymaw's Fang",  spr: 'amulet', pal: { b: 'e8e1c8', c: 'ffffff', Y: '8d8d8d', y: '5c5c5c' }, cat: 'jewelry', slot: 'amulet', str: 1, def: 1, val: 400, tier: 99 },
  wyrmheart:  { name: 'Heart of the Deep Wyrm', spr: 'heart', cat: 'jewelry', val: 3000, tier: 99 },
});
const DEFAULT_WT = { jewelry: 0.1, potion: 0.5, scroll: 0.1, book: 2, ammo: 0.1, story: 0.5 };
const TOOL_WT = { woodaxe: 6, pickaxe: 8, sickle: 2, wyrmheart: 5 };
for (const id in ITEMS) { const t = ITEMS[id]; t.id = id; if (t.wt == null) t.wt = TOOL_WT[id] ?? DEFAULT_WT[t.cat] ?? 1; }

// Saves from the first version used these item ids.
const LEGACY_ITEMS = {
  dagger: 'dagger_iron', club: 'mace_iron', shortsword: 'sword_iron', handaxe: 'axe_iron', mace: 'mace_steel', longsword: 'sword_steel',
  battleaxe: 'axe_steel', warhammer: 'mace_silver', greatsword: 'sword_silver', runeblade: 'sword_mithril', mithrilblade: 'sword_mithril',
  padded: 'robe_iron', leather: 'leather_iron', studded: 'leather_steel', chainmail: 'mail_iron', scalemail: 'mail_steel', platemail: 'plate_iron',
  mithrilmail: 'mail_mithril', buckler: 'shieldl_iron', kiteshield: 'shieldl_steel', towershield: 'shieldh_iron', leathercap: 'helm_iron',
  ironhelm: 'helm_steel', greathelm: 'helm_silver', leatherboots: 'boots_iron', irongreaves: 'boots_steel', axe: 'woodaxe',
};

// Materials live in a separate, unlimited pouch.
const MATS = {
  wood:     { name: 'Wood',            spr: 'log',      cat: 'wood',    val: 8, wt: 3 },
  stone:    { name: 'Stone',           spr: 'pebbles',  cat: 'stone',   val: 8, wt: 4 },
  iron:     { name: 'Iron Ore',        spr: 'ore', pal: { 1: '8a8f96', 2: '5a5f66', 3: 'c9784a' }, cat: 'ore', val: 6, wt: 2 },
  silver:   { name: 'Silver Ore',      spr: 'ore', pal: { 1: '9aa0a8', 2: '6a7078', 3: 'f6f7fa' }, cat: 'ore', val: 18, wt: 2 },
  mithril:  { name: 'Mithril Ore',     spr: 'ore', pal: { 1: '6f7890', 2: '454c60', 3: '7fd0f5' }, cat: 'ore', val: 60, wt: 2 },
  hide:     { name: 'Hide',            spr: 'hide',     cat: 'hide',    val: 5, wt: 2 },
  silk:     { name: 'Spider Silk',     spr: 'silk',     cat: 'monster', val: 8, wt: 0.2 },
  bone:     { name: 'Bone',            spr: 'bone',     cat: 'monster', val: 5, wt: 1 },
  gel:      { name: 'Slime Gel',       spr: 'gel',      cat: 'monster', val: 6, wt: 0.5 },
  redcap:   { name: 'Redcap Mushroom', spr: 'mushroom', cat: 'herb',    val: 5, wt: 0.2 },
  healroot: { name: 'Healroot',        spr: 'leaf',     cat: 'herb',    val: 4, wt: 0.2 },
  meat:     { name: 'Raw Meat',        spr: 'meat',     cat: 'food',    val: 6, wt: 1 },
  // fish: ponds give trout and perch, the Whisperwood streams give pike, underground water gives eels
  trout:    { name: 'Pond Trout',      spr: 'fish', pal: { b: '7a8f5a', c: 'd8c9a0' }, cat: 'food', val: 7, wt: 1 },
  perch:    { name: 'Yellow Perch',    spr: 'fish', pal: { b: 'c9a43a', c: 'efe2b0' }, cat: 'food', val: 6, wt: 1 },
  pike:     { name: 'River Pike',      spr: 'fish', pal: { b: '4f7a4a', c: 'c8d8a0' }, cat: 'food', val: 16, wt: 2 },
  caveeel:  { name: 'Glowing Cave Eel', spr: 'fish', pal: { b: '3f6f8a', c: 'a9e0ff' }, cat: 'food', val: 28, wt: 1 },
  goldcarp: { name: 'Golden Carp',     spr: 'fish', pal: { b: 'e3b93c', c: 'fff1b0' }, cat: 'food', val: 75, wt: 1 },
  feather:  { name: 'Feather',         spr: 'feather',  cat: 'monster', val: 2, wt: 0.05 },
  antler:   { name: 'Antler',          spr: 'antler',   cat: 'monster', val: 15, wt: 2 },
  pelt:     { name: 'Wolf Pelt',       spr: 'pelt',     cat: 'hide',    val: 14, wt: 3 },
  moonpetal:{ name: 'Moonpetal',       spr: 'flower',   cat: 'herb',    val: 20, wt: 0.2 },
  shard:    { name: 'Mana Shard',      spr: 'crystal', pal: { 1: '7fd0f5', 2: '3b6fc4', 3: 'e8f8ff' }, cat: 'crystal', val: 25, wt: 0.2 },
  soulgem:  { name: 'Soul Gem',        spr: 'crystal', pal: { 1: 'b48ee0', 2: '6a3fa0', 3: 'f0e4ff' }, cat: 'crystal', val: 120, wt: 0.5 },
};
for (const id in MATS) MATS[id].id = id;

// Spells. tier sets the book's price and where it turns up; school colors the book.
const SPELLS = {
  missile:     { name: 'Magic Missile',   mp: 3,  tier: 1, school: 'evocation',  desc: 'A dart of force strikes the nearest foe you can see.' },
  light:       { name: 'Light',           mp: 2,  tier: 1, school: 'divination', desc: 'Kindles a lasting light where you stand.' },
  phase:       { name: 'Phase Door',      mp: 2,  tier: 1, school: 'illusion',   desc: 'Blink to a random spot nearby. Good for escaping.' },
  cure:        { name: 'Cure',            mp: 4,  tier: 1, school: 'restoration', desc: 'Cures poison, sickness, blindness and confusion.' },
  heal:        { name: 'Heal',            mp: 5,  tier: 2, school: 'restoration', desc: 'Restores health and cures sickness.' },
  frost:       { name: 'Frost Bolt',      mp: 5,  tier: 2, school: 'evocation',  desc: 'A shard of ice that wounds and slows the nearest foe.' },
  shield:      { name: 'Arcane Shield',   mp: 4,  tier: 2, school: 'abjuration', desc: '+4 defense for 40 turns.' },
  sleep:       { name: 'Sleep',           mp: 5,  tier: 2, school: 'illusion',   desc: 'The nearest foe falls asleep until something wakes it. Rulers resist.' },
  fear:        { name: 'Fear',            mp: 4,  tier: 2, school: 'illusion',   desc: 'The nearest foe flees from you for a while. Rulers resist.' },
  detect:      { name: 'Detect Monsters', mp: 3,  tier: 2, school: 'divination', desc: 'For 150 turns, every creature on the level shows on your minimap.' },
  drain:       { name: 'Drain Life',      mp: 6,  tier: 3, school: 'evocation',  desc: 'Pulls life from the nearest foe; you heal half the damage.' },
  regen:       { name: 'Regeneration',    mp: 6,  tier: 3, school: 'restoration', desc: 'Heal 1 health every turn for 25 turns.' },
  lightning:   { name: 'Chain Lightning', mp: 8,  tier: 3, school: 'evocation',  desc: 'Strikes the nearest foe and leaps to two more close by.' },
  poisoncloud: { name: 'Venom Cloud',     mp: 7,  tier: 3, school: 'evocation',  desc: 'Poisons every foe within two tiles of you.' },
  fireball:    { name: 'Fireball',        mp: 9,  tier: 3, school: 'evocation',  desc: 'Explodes on the nearest foe, burning everything next to it.' },
  mapspell:    { name: 'Clairvoyance',    mp: 7,  tier: 3, school: 'divination', desc: 'Reveals the whole level in your mind.' },
  invis:       { name: 'Invisibility',    mp: 8,  tier: 4, school: 'illusion',   desc: 'For 30 turns, creatures that hunt by sight cannot find you. Attacking ends it.' },
  haste:       { name: 'Haste',           mp: 10, tier: 4, school: 'abjuration', desc: 'For 20 turns, you move at twice the speed of everything around you.' },
  recall:      { name: 'Word of Recall',  mp: 12, tier: 4, school: 'divination', desc: 'Carries you to town, or back to the last cave level you visited.' },
  meteor:      { name: 'Meteor',          mp: 16, tier: 5, school: 'evocation',  desc: 'Calls down fire on the nearest foe, scorching everything within two tiles.' },
};
const SCHOOL_COLOR = { evocation: 'b9343c', restoration: '3f8a3f', illusion: '7b4bb5', abjuration: '3b6fc4', divination: '3f8f7a' };
const BOOK_VAL = [0, 100, 170, 300, 450, 900];
for (const id in SPELLS) {
  const sp = SPELLS[id], key = 'b' + id;
  if (!ITEMS[key]) ITEMS[key] = { id: key, name: 'Spellbook: ' + sp.name, spr: 'book', pal: { b: SCHOOL_COLOR[sp.school] }, cat: 'book', val: BOOK_VAL[sp.tier], tier: sp.tier, use: 'learn', spell: id, wt: 2, rare: sp.tier >= 5 };
}

// Difficulty, chosen when you start a new life.
const DIFFS = {
  story:    { name: 'Story',      desc: 'Gentler foes and more gold. If you fall, you wake in the temple with a little less gold.', mdmg: 0.7, mhp: 0.8, gold: 1.25, xp: 1 },
  normal:   { name: 'Adventurer', desc: 'The game as designed. If you fall, load your last save.', mdmg: 1, mhp: 1, gold: 1, xp: 1 },
  veteran:  { name: 'Veteran',    desc: 'Foes hit harder and take more killing, and coin is scarcer. A little more experience for your trouble.', mdmg: 1.25, mhp: 1.25, gold: 0.85, xp: 1.15 },
  ironman:  { name: 'Ironman',    desc: 'Veteran, with one life. Your save is erased when you die.', mdmg: 1.25, mhp: 1.25, gold: 0.85, xp: 1.15, final: 1 },
};

// ---------- The four kingdoms under the mountain ----------
// Branch levels 1–4 sit below the junction on cave level 3. Effective depth = base + level.
const KINGDOMS = {
  g: { name: 'Gnarlhold', folk: 'goblins', base: 3, braziers: 0.6, boss: 'grotsnag', seal: 'seal_g', unique: 'grotsnag_cleaver',
       stairs: 'Rough-cut steps lead down to Gnarlhold, the goblin warrens. You hear hammering and shouting.' },
  r: { name: 'the Gnawing Court', folk: 'rat folk', base: 4, boss: 'vesk', seal: 'seal_r', unique: 'vesk_fang',
       stairs: 'A slimy chute leads down to the Gnawing Court. It smells of rot and many, many rats.' },
  h: { name: 'the Hollows', folk: 'Hollowfolk', base: 5, boss: 'matriarch', seal: 'seal_h', unique: 'matriarch_staff',
       stairs: 'Cold, damp stairs lead down to the Hollows. Somewhere below, water drips into a still lake.' },
  s: { name: 'Sszarith', folk: 'serpent people', base: 6, braziers: 1, boss: 'hierophant', seal: 'seal_s', unique: 'coil_spear',
       stairs: 'Carved stairs lead down to Sszarith. The walls are worked with coiling serpents.' },
};
const KINGDOM_ORDER = ['g', 'r', 'h', 's'];

// home: where it lives. lv: cave depth (upper) or branch level (kingdoms) where it appears.
// res: damage multipliers by type. Abilities: erratic, slow, fast, poison, sick, blind, confuse, slowgaze, grab,
// steal, explode, invisible, reach, senses, heals, summon, pack, undead, ranged {r, dmg, verb, fx, magic}.
// darksight: sees you in the dark. Without it, a creature only notices you when you're lit or right next to it.
const MONSTERS = {
  // --- Upper caves (levels 1–3) ---
  rat:       { name: 'giant rat',   home: 'upper', darksight: 1, lv: [1, 2], hp: 6,  atk: 1, def: 0, dmg: [1, 3], xp: 4,  verb: ['bites', 'gnaws on'], drop: [['hide', 0.3]] },
  bat:       { name: 'cave bat',    home: 'upper', darksight: 1, lv: [1, 3], hp: 5,  atk: 2, def: 2, dmg: [1, 2], xp: 4,  verb: ['bites', 'scratches'], erratic: 1 },
  viper:     { name: 'pit viper',   home: 'upper', darksight: 1, lv: [1, 3], hp: 8,  atk: 2, def: 1, dmg: [1, 3], xp: 8,  verb: ['bites'], poison: 4, drop: [['hide', 0.25]] },
  cspider:   { name: 'cave spider', home: 'upper', darksight: 1, lv: [2, 3], hp: 11, atk: 3, def: 2, dmg: [2, 4], xp: 12, verb: ['bites', 'stings'], poison: 5, drop: [['silk', 0.6]] },
  slime:     { name: 'green slime', home: 'upper', darksight: 1, lv: [2, 3], hp: 18, atk: 2, def: 0, dmg: [2, 5], xp: 12, verb: ['engulfs', 'splashes'], slow: 1, res: { blunt: 0.5, slash: 1.25 }, drop: [['gel', 0.7]] },
  skeleton:  { name: 'restless skeleton', home: 'upper', darksight: 1, lv: [2, 3], hp: 16, atk: 4, def: 3, dmg: [2, 6], xp: 18, verb: ['slashes', 'claws'], undead: 1, res: { pierce: 0.5, blunt: 1.5 }, drop: [['bone', 0.7]] },

  // --- Gnarlhold: goblins ---
  g_scrapper:{ name: 'goblin scrapper', home: 'g', lv: [1, 4], hp: 14, atk: 4, def: 3, dmg: [2, 6], xp: 14, verb: ['hacks at', 'slashes', 'kicks'], pack: 2, gold: 8, drop: [['iron', 0.15]] },
  g_slinger: { name: 'goblin slinger',  home: 'g', lv: [1, 4], hp: 10, atk: 5, def: 2, dmg: [1, 4], xp: 14, verb: ['hits', 'bites'], ranged: { r: 5, dmg: [2, 5], verb: 'slings a stone at' }, gold: 6 },
  g_sapper:  { name: 'goblin sapper',   home: 'g', lv: [2, 4], hp: 10, atk: 3, def: 2, dmg: [1, 3], xp: 18, verb: ['jabs'], explode: [8, 16] },
  g_shaman:  { name: 'goblin shaman',   home: 'g', lv: [2, 4], hp: 14, atk: 3, def: 2, dmg: [1, 4], xp: 24, verb: ['raps', 'curses'], heals: 1, ranged: { r: 5, dmg: [2, 6], verb: 'hurls a hex at', magic: 1 }, drop: [['shard', 0.2], ['redcap', 0.4]] },
  g_hob:     { name: 'hobgoblin brute', home: 'g', lv: [3, 4], hp: 34, atk: 6, def: 4, dmg: [4, 10], xp: 32, verb: ['clubs', 'smashes'], gold: 15, drop: [['hide', 0.3]] },
  g_rider:   { name: 'war-boar rider',  home: 'g', lv: [3, 4], hp: 24, atk: 6, def: 4, dmg: [3, 9], xp: 34, verb: ['gores', 'tramples'], fast: 1, drop: [['hide', 0.6]] },
  // --- The Gnawing Court: rat folk ---
  r_swarm:   { name: 'rat swarm',         home: 'r', darksight: 1, lv: [1, 4], hp: 7,  atk: 4, def: 1, dmg: [1, 3], xp: 6,  verb: ['swarm over', 'nip'], pack: 3 },
  r_skulker: { name: 'ratkin skulker',    home: 'r', darksight: 1, lv: [1, 4], hp: 14, atk: 6, def: 4, dmg: [2, 5], xp: 20, verb: ['stabs', 'slashes'], steal: 1 },
  r_blowgun: { name: 'ratkin blowgunner', home: 'r', darksight: 1, lv: [1, 4], hp: 12, atk: 6, def: 3, dmg: [1, 3], xp: 22, verb: ['bites'], ranged: { r: 5, dmg: [1, 3], verb: 'puffs a dart at', fx: 'poison' }, gold: 8 },
  r_plague:  { name: 'ratkin plaguebearer', home: 'r', darksight: 1, lv: [2, 4], hp: 20, atk: 5, def: 3, dmg: [2, 6], xp: 26, verb: ['claws', 'coughs on'], sick: 1, drop: [['gel', 0.3], ['redcap', 0.4]] },
  r_warlock: { name: 'ratkin warlock',    home: 'r', darksight: 1, lv: [3, 4], hp: 18, atk: 5, def: 3, dmg: [2, 4], xp: 34, verb: ['claws'], summon: 'r_swarm', ranged: { r: 5, dmg: [3, 7], verb: 'casts a sickly bolt at', magic: 1 }, drop: [['shard', 0.3]] },
  r_ogre:    { name: 'rat ogre',          home: 'r', darksight: 1, lv: [3, 4], hp: 48, atk: 8, def: 5, dmg: [5, 13], xp: 48, verb: ['mauls', 'smashes'], drop: [['hide', 0.5], ['bone', 0.5]] },
  // --- The Hollows: Hollowfolk ---
  h_stalker: { name: 'hollow stalker', home: 'h', darksight: 1, lv: [1, 4], hp: 20, atk: 8, def: 5, dmg: [3, 8], xp: 34, verb: ['knifes', 'slashes'], invisible: 1 },
  h_hound:   { name: 'pale hound',     home: 'h', darksight: 1, lv: [1, 4], hp: 18, atk: 7, def: 4, dmg: [3, 7], xp: 24, verb: ['bites', 'savages'], fast: 1, pack: 2, drop: [['hide', 0.5]] },
  h_fisher:  { name: 'hollow fisher',  home: 'h', darksight: 1, lv: [1, 4], hp: 24, atk: 7, def: 4, dmg: [3, 8], xp: 32, verb: ['spears', 'jabs'], reach: 1 },
  h_crawler: { name: 'cave crawler',   home: 'h', darksight: 1, lv: [2, 4], hp: 30, atk: 7, def: 6, dmg: [3, 8], xp: 36, verb: ['bites', 'stings'], poison: 6, res: { slash: 0.75 }, drop: [['silk', 0.5]] },
  h_seer:    { name: 'blind seer',     home: 'h', darksight: 1, lv: [2, 4], hp: 22, atk: 6, def: 4, dmg: [2, 5], xp: 42, verb: ['strikes'], senses: 1, ranged: { r: 7, dmg: [4, 9], verb: 'sends a pale bolt at', magic: 1 }, drop: [['shard', 0.4], ['moonpetal', 0.3]] },
  h_thrall:  { name: 'hollow thrall',  home: 'h', darksight: 1, lv: [3, 4], hp: 44, atk: 8, def: 5, dmg: [4, 10], xp: 44, verb: ['batters', 'chokes'], drop: [['bone', 0.4]] },
  // --- Sszarith: serpent people ---
  s_warrior: { name: 'serpent warrior', home: 's', lv: [1, 4], hp: 30, atk: 9, def: 7, dmg: [4, 10], xp: 44, verb: ['spears', 'lashes'], res: { slash: 0.75, pierce: 0.75, blunt: 1.25 }, gold: 20 },
  s_spitter: { name: 'venom spitter',   home: 's', lv: [1, 4], hp: 24, atk: 8, def: 5, dmg: [2, 6], xp: 42, verb: ['bites'], poison: 5, ranged: { r: 5, dmg: [2, 6], verb: 'spits venom at', fx: 'blind' } },
  s_constrictor: { name: 'giant constrictor', home: 's', darksight: 1, lv: [2, 4], hp: 44, atk: 9, def: 5, dmg: [3, 8], xp: 52, verb: ['squeezes', 'bites'], grab: 1, drop: [['hide', 0.6]] },
  s_priest:  { name: 'serpent priest',  home: 's', lv: [2, 4], hp: 28, atk: 8, def: 6, dmg: [2, 6], xp: 56, verb: ['strikes'], heals: 1, ranged: { r: 6, dmg: [3, 8], verb: 'hisses a curse at', magic: 1, fx: 'confuse' }, drop: [['shard', 0.5], ['soulgem', 0.05]] },
  s_basilisk:{ name: 'basilisk',        home: 's', darksight: 1, lv: [3, 4], hp: 40, atk: 9, def: 8, dmg: [4, 10], xp: 60, verb: ['bites', 'claws'], slowgaze: 1, drop: [['hide', 0.5]] },
  s_guard:   { name: 'temple guard',    home: 's', lv: [3, 4], hp: 52, atk: 11, def: 10, dmg: [6, 14], xp: 70, verb: ['spears', 'bashes'], res: { slash: 0.6, pierce: 0.75, blunt: 1.25 }, gold: 30, drop: [['silver', 0.3]] },

  // --- The Whisperwood: game and predators. w = spawn weight on forest levels 1–3 ---
  rabbit:   { name: 'rabbit',     home: 'forest', lv: [1, 3], w: [4, 3, 2], hp: 3,  atk: 0, def: 3, dmg: [1, 1], xp: 2,  verb: ['nips'], prey: 1, fast: 1, drop: [['meat', 1], ['hide', 0.2]] },
  pheasant: { name: 'pheasant',   home: 'forest', lv: [1, 3], w: [3, 2, 1], hp: 3,  atk: 0, def: 3, dmg: [1, 1], xp: 2,  verb: ['pecks'], prey: 1, fast: 1, erratic: 1, drop: [['meat', 0.8], ['feather', 1], ['feather', 1], ['feather', 0.5]] },
  deer:     { name: 'deer',       home: 'forest', lv: [1, 3], w: [3, 3, 2], hp: 10, atk: 2, def: 3, dmg: [1, 4], xp: 6,  verb: ['kicks'], prey: 1, fast: 1, drop: [['meat', 1], ['meat', 1], ['hide', 0.8], ['antler', 0.4]] },
  boar:     { name: 'wild boar',  home: 'forest', lv: [1, 3], w: [2, 2, 2], hp: 16, atk: 3, def: 2, dmg: [2, 6], xp: 12, verb: ['gores', 'tusks'], shy: 3, drop: [['meat', 1], ['meat', 1], ['hide', 0.6]] },
  wolf:     { name: 'grey wolf',  home: 'forest', lv: [1, 3], w: [1, 2, 3], hp: 14, atk: 5, def: 3, dmg: [2, 6], xp: 16, verb: ['bites', 'snaps at'], darksight: 1, fast: 1, pack: 2, drop: [['pelt', 0.5], ['meat', 0.3]] },
  bear:     { name: 'black bear', home: 'forest', lv: [2, 3], w: [0, 1, 2], hp: 40, atk: 7, def: 4, dmg: [4, 11], xp: 45, verb: ['mauls', 'swipes at'], darksight: 1, drop: [['pelt', 1], ['meat', 1], ['meat', 1]] },
  greymaw:  { name: 'Greymaw',    home: 'forest', boss: 1, hp: 75, atk: 8, def: 5, dmg: [4, 10], xp: 160, verb: ['savages', 'bites'], darksight: 1, fast: 1, summon: 'wolf', drop: [['pelt', 1], ['pelt', 1]] },

  // --- Bosses ---
  grotsnag:  { name: 'King Grotsnag',        home: 'g', boss: 1, hp: 85,  atk: 8,  def: 5,  dmg: [4, 11], xp: 300, verb: ['cleaves', 'smashes'], summon: 'g_scrapper', gold: 300 },
  vesk:      { name: 'Mother Vesk',          home: 'r', darksight: 1, boss: 1, hp: 100, atk: 9,  def: 6,  dmg: [4, 11], xp: 380, verb: ['claws', 'bites'], summon: 'r_swarm', poison: 6, gold: 350 },
  matriarch: { name: 'the Pale Matriarch',   home: 'h', darksight: 1, boss: 1, hp: 110, atk: 10, def: 6,  dmg: [5, 12], xp: 450, verb: ['strikes', 'chills'], heals: 1, senses: 1, ranged: { r: 7, dmg: [6, 12], verb: 'sends a pale bolt at', magic: 1 }, gold: 300, drop: [['moonpetal', 1]] },
  hierophant:{ name: 'the Coiled Hierophant',home: 's', boss: 1, hp: 125, atk: 11, def: 7,  dmg: [5, 13], xp: 550, verb: ['strikes', 'bites'], poison: 6, ranged: { r: 6, dmg: [5, 11], verb: 'hisses a curse at', magic: 1, fx: 'confuse' }, gold: 400, drop: [['soulgem', 1]] },
  wyrm:      { name: 'the Deep Wyrm',        home: 'deep', darksight: 1, boss: 1, hp: 190, atk: 13, def: 9,  dmg: [8, 19], xp: 1200, verb: ['bites', 'rakes'], ranged: { r: 6, dmg: [10, 20], verb: 'breathes fire on', magic: 1 }, gold: 1000, drop: [['soulgem', 1], ['mithril', 1], ['mithril', 1]] },
};
for (const id in MONSTERS) MONSTERS[id].id = id;

// ---------- Shops in the Merchants' Hall ----------
const SHOPS = {
  general: { name: "Wendell's General Goods", keeper: 'Wendell', npc: 'wendell', rate: 0.35,
    greet: "Torches, tools, packs and building stock. Don't go down there without light. I buy anything, though not at the best price.",
    buys: ['weapon', 'armor', 'jewelry', 'potion', 'scroll', 'book', 'tool', 'ammo', 'herb', 'ore', 'hide', 'crystal', 'wood', 'stone', 'monster', 'food'],
    sells: [['torch', 15], ['lantern', 1], ['oil', 6], ['woodaxe', 3], ['pickaxe', 3], ['sickle', 3], ['rod', 3], ['backpack', 2], ['pheal', 4], ['srecall', 2], ['mat:wood', 40], ['mat:stone', 40]] },
  weapons: { name: "Bran's Blades", keeper: 'Bran', npc: 'bran', rate: 0.5,
    greet: "Blades, axes, maces, spears, bows, crossbows, halberds, hammers. Silver for the dead things. I'll pay for good ore, too.",
    buys: ['weapon', 'ammo', 'ore'],
    sells: [['dagger_iron', 3], ['sword_iron', 3], ['axe_iron', 2], ['mace_iron', 3], ['spear_iron', 2], ['bow_iron', 2], ['crossbow_iron', 1], ['flail_iron', 2], ['rapier_iron', 2], ['halberd_iron', 1], ['warhammer_iron', 1], ['greatsword_iron', 1], ['arrows', 6],
            ['dagger_steel', 1], ['sword_steel', 2], ['axe_steel', 1], ['mace_steel', 1], ['spear_steel', 1], ['bow_steel', 1], ['crossbow_steel', 1], ['greatsword_steel', 1], ['warhammer_steel', 1],
            ['sword_silver', 1], ['mace_silver', 1], ['mat:iron', 20]] },
  armor: { name: "Hilde's Armory", keeper: 'Hilde', npc: 'hilde', rate: 0.5,
    greet: "Leather, mail and plate. Plate will save your life, but you'll swing slower in it. Hides and ore wanted.",
    buys: ['armor', 'hide', 'ore'],
    sells: [['leather_iron', 3], ['mail_iron', 2], ['plate_iron', 1], ['shieldl_iron', 3], ['shieldh_iron', 1], ['helm_iron', 3], ['boots_iron', 3],
            ['leather_steel', 1], ['mail_steel', 1], ['plate_steel', 1], ['shieldl_steel', 1], ['helm_steel', 2], ['boots_steel', 1], ['mat:hide', 15]] },
  jeweler: { name: 'Silverthread Jewelry', keeper: 'Odessa', npc: 'odessa', rate: 0.5,
    greet: 'Rings and amulets with a little magic worked in.',
    buys: ['jewelry', 'crystal'], buysMats: ['silver', 'mithril'],
    sells: [['ringstr', 1], ['ringprot', 1], ['ringvigor', 1], ['ringacc', 1], ['ringregen', 1], ['amuwis', 1], ['amuward', 1], ['luckycharm', 1], ['mat:silver', 8]] },
  enchanter: { name: 'Mirela the Enchanter', keeper: 'Mirela', npc: 'mirela', rate: 0.55,
    greet: 'I can put runes on your steel, for a price. Mana shards and soul gems wanted.',
    buys: ['crystal'], service: 'enchant',
    sells: [['senchant', 2], ['mat:shard', 6]] },
  magic: { name: 'The Arcanum', keeper: 'Aldous', npc: 'aldous', rate: 0.5,
    greet: 'Spellbooks, scrolls, robes and staves. A mage in plate is a mage whose spells fizzle.',
    buys: ['book', 'scroll', 'crystal'],
    sells: [['bmissile', 1], ['blight', 1], ['bphase', 1], ['bcure', 1], ['bheal', 1], ['bfrost', 1], ['bshield', 1], ['bsleep', 1], ['bfear', 1], ['bdetect', 1],
            ['bdrain', 1], ['bregen', 1], ['blightning', 1], ['bpoisoncloud', 1], ['bfireball', 1], ['bmapspell', 1], ['binvis', 1], ['bhaste', 1], ['brecall', 1],
            ['srecall', 4], ['steleport', 4], ['smapping', 3],
            ['robe_iron', 2], ['robe_steel', 1], ['staff_iron', 2], ['staff_steel', 1]] },
  alchemist: { name: "Tamsin's Apothecary", keeper: 'Tamsin', npc: 'tamsin', rate: 0.5,
    greet: 'Potions brewed fresh. Antidotes cure sickness too. Herbs, gel and silk bought at fair prices.',
    buys: ['potion', 'herb', 'monster'],
    sells: [['pheal', 8], ['pgheal', 3], ['pmana', 4], ['pantidote', 5], ['pstr', 2], ['mat:healroot', 15], ['mat:redcap', 10]] },
};

// Market events push prices for whole categories up or down for a few days.
const EVENTS = [
  { id: 'ironshort', name: 'Iron shortage at the mines', text: 'Ore and metal goods are scarce.', mods: { ore: 1.6, weapon: 1.2, armor: 1.15 }, days: [3, 5] },
  { id: 'herbglut', name: 'Bumper herb harvest', text: 'Herbs are everywhere. Potions are a little cheaper.', mods: { herb: 0.55, potion: 0.85 }, days: [3, 5] },
  { id: 'raids', name: 'Goblin raids on the trade road', text: 'Everyone wants arms, armor and potions.', mods: { armor: 1.3, weapon: 1.25, potion: 1.2, ammo: 1.4 }, days: [3, 6] },
  { id: 'wizards', name: "Wizards' convention in town", text: 'Spellbooks, scrolls and crystals are in demand.', mods: { book: 1.3, scroll: 1.25, crystal: 1.45 }, days: [2, 4] },
  { id: 'boom', name: 'Building boom', text: 'New houses going up everywhere. Wood and stone fetch high prices.', mods: { wood: 1.9, stone: 1.9, tool: 1.2 }, days: [3, 5] },
  { id: 'fever', name: 'Fever season', text: 'The sick need potions. Herbs and potions are dear.', mods: { potion: 1.5, herb: 1.45 }, days: [3, 5] },
  { id: 'caravan', name: 'Southern caravan arrives', text: 'Imported jewelry and blades flood the market.', mods: { jewelry: 0.75, weapon: 0.85 }, days: [2, 4] },
  { id: 'tannery', name: 'Fire at the tannery', text: 'Hides are suddenly worth a lot.', mods: { hide: 1.8, armor: 1.1 }, days: [3, 5] },
  { id: 'feast', name: 'Harvest feast in the square', text: 'Every cook in town wants meat.', mods: { food: 1.8 }, days: [2, 3] },
  { id: 'necro', name: 'Necromancer rumors', text: 'Bones and soul gems are fetching odd prices.', mods: { monster: 1.6, crystal: 1.25 }, days: [2, 4] },
];

const CAT_NAMES = { weapon: 'Weapons', armor: 'Armor', jewelry: 'Jewelry', potion: 'Potions', scroll: 'Scrolls', book: 'Spellbooks', tool: 'Tools', ammo: 'Arrows', food: 'Food', herb: 'Herbs', ore: 'Ore', hide: 'Hides', crystal: 'Crystals', wood: 'Wood', stone: 'Stone', monster: 'Monster parts' };

// ---------- Skill trees ----------
// Each node: tier (1–4), max ranks (default 1), optional req (nodes that must be learned first) and
// excl (a group where only one node may be taken). A tier opens after spending (tier - 1) × 2 points in its tree.
const TREES = [
  { id: 'arms', name: 'Arms', blurb: 'Weapon mastery and staying alive at the front.', nodes: [
    { id: 'wt', tier: 1, max: 3, name: 'Weapon Training', desc: '+1 to hit per rank.' },
    { id: 'tough', tier: 1, max: 3, name: 'Toughness', desc: '+8 maximum health per rank.' },
    { id: 'blade', tier: 2, max: 2, name: 'Blade Mastery', desc: 'Swords and daggers: +1 damage per rank. Rank 2: they also land critical hits more often.' },
    { id: 'axe', tier: 2, max: 2, name: 'Axe Mastery', desc: 'Axes: +1 damage and +15% chance to cleave a second foe, per rank.' },
    { id: 'mace', tier: 2, max: 2, name: 'Mace Mastery', desc: 'Maces and staves: +1 damage and ignore 2 more points of armor, per rank.' },
    { id: 'spear', tier: 2, max: 2, name: 'Spear Mastery', desc: 'Spears: +1 to hit and +1 damage per rank.' },
    { id: 'crit', tier: 3, name: 'Keen Edge', desc: 'Every weapon lands critical hits on one more number of the die.' },
    { id: 'ironskin', tier: 3, max: 2, name: 'Iron Skin', desc: '+2 defense per rank.' },
    { id: 'secondwind', tier: 3, name: 'Second Wind', desc: 'Once a day, when a blow drops you below a quarter of your health, recover 30% of it.' },
    { id: 'berserker', tier: 4, excl: 'arms4', name: 'Berserker', desc: 'Below half health: +3 damage and +2 to hit.' },
    { id: 'guardian', tier: 4, excl: 'arms4', name: 'Guardian', desc: 'With a shield: +3 defense and a 1 in 8 chance to block a blow entirely.' },
  ] },
  { id: 'wilds', name: 'Wilds', blurb: 'Hunting, archery and living off the land.', nodes: [
    { id: 'forager', tier: 1, max: 2, name: 'Forager', desc: '+1 herb from every harvest, per rank.' },
    { id: 'lumber', tier: 1, max: 2, name: 'Lumberjack', desc: '+1 wood from every tree, per rank.' },
    { id: 'archery', tier: 2, max: 3, name: 'Marksman', desc: 'Bows: +1 to hit and +1 damage per rank.' },
    { id: 'skinner', tier: 2, max: 2, name: 'Skinner', desc: 'Beasts you kill have a 40% chance per rank to yield extra meat, hide or pelt.' },
    { id: 'prospect', tier: 3, max: 2, name: 'Prospector', desc: '+1 stone and ore per rank, and a chance of silver or mithril.' },
    { id: 'tracker', tier: 3, name: 'Tracker', desc: 'Outdoors, every creature within 20 paces shows on your minimap.' },
    { id: 'lightstep', tier: 3, name: 'Light Step', desc: 'Creatures that hunt by sight notice you from 6 tiles instead of 9, and from even closer while you sneak.' },
    { id: 'greenthumb', tier: 4, name: 'Green Thumb', desc: 'Your garden yields double and your land regrows a day sooner.' },
    { id: 'fletcher', tier: 4, name: "Fletcher's Eye", desc: 'Recover 4 arrows in 5 instead of half.' },
    { id: 'shadowstrike', tier: 4, name: 'Shadow Strike', desc: 'Sneak attacks on unaware foes deal one more multiple of damage.' },
  ] },
  { id: 'arcana', name: 'Arcana', blurb: 'Spell power, mana and casting in armor.', nodes: [
    { id: 'spellcraft', tier: 1, max: 3, name: 'Spellcraft', desc: '+10% spell power per rank.' },
    { id: 'manawell', tier: 1, max: 3, name: 'Mana Well', desc: '+4 maximum mana per rank.' },
    { id: 'focus', tier: 2, name: 'Focus', desc: 'Spells cost 1 less mana.' },
    { id: 'meditation', tier: 2, name: 'Meditation', desc: 'Mana returns twice as fast.' },
    { id: 'battlemage', tier: 3, name: 'Battlemage', desc: 'Armor makes your spells fail half as often.' },
    { id: 'volley', tier: 3, name: 'Arcane Volley', desc: 'Magic Missile strikes a second foe if one is in sight.' },
    { id: 'archmage', tier: 4, name: 'Archmage', desc: '+25% spell power.' },
  ] },
  { id: 'faith', name: 'Faith', blurb: "Aurel's acolyte, and the gifts of every god you win over.", nodes: [
    { id: 'devotion', tier: 1, max: 2, name: 'Devotion', desc: "Dawn's Light heals 25% more and blessings last 25% longer, per rank." },
    { id: 'pilgrim', tier: 1, name: 'Pilgrim', desc: 'Shrine trials ask less: offerings need one fewer of each, the flame costs a quarter of your health, a vigil lasts 70 turns.' },
    { id: 'sunward', tier: 2, name: 'Sunward', desc: "Dawn's Light sears the undead twice as hard and leaves a brighter light." },
    { id: 'resolve', tier: 2, name: 'Resolve', desc: 'Confusion and the basilisk\'s slowing gaze last half as long.' },
    { id: 'secondprayer', tier: 3, name: 'Second Prayer', desc: 'Each god\'s gift can be called on twice a day.' },
    { id: 'chosen', tier: 4, name: 'Chosen of Aurel', desc: 'Once a day, a blow that would kill you leaves you standing with a quarter of your health.' },
  ] },
  { id: 'smith', name: 'Smithing', blurb: 'Make weapons, armor and arrows. Needs a Forge.', nodes: [
    { id: 'smith1', tier: 1, name: 'Apprentice Smith', desc: 'Make iron-grade gear of every class, plus arrows.' },
    { id: 'smith2', tier: 2, req: ['smith1'], name: 'Journeyman Smith', desc: 'Make steel-grade gear.' },
    { id: 'arrowsmith', tier: 2, req: ['smith1'], name: 'Arrowsmith', desc: 'Each batch of arrows makes twice as many.' },
    { id: 'smith3', tier: 3, req: ['smith2'], name: 'Master Smith', desc: 'Make silver-grade gear.' },
    { id: 'temper', tier: 3, max: 2, name: 'Tempering', desc: '+10% chance per rank that what you make comes out Fine.' },
    { id: 'smith4', tier: 4, req: ['smith3'], name: 'Mithril Working', desc: 'Make mithril-grade gear.' },
    { id: 'masterwork', tier: 4, name: 'Masterwork', desc: 'Fine work comes out +2 instead of +1.' },
  ] },
  { id: 'alch', name: 'Alchemy', blurb: 'Brew potions. Needs an Alchemy Bench.', nodes: [
    { id: 'alch1', tier: 1, name: 'Brewer', desc: 'Brew Potions of Healing and Antidotes.' },
    { id: 'herbalist', tier: 1, max: 2, name: 'Herbalist', desc: 'Healing potions heal 20% more per rank.' },
    { id: 'alch2', tier: 2, req: ['alch1'], name: 'Distiller', desc: 'Brew Potions of Mana and Draughts of Strength.' },
    { id: 'efficient', tier: 2, name: 'Efficient Brewing', desc: '1 in 3 brews makes an extra potion.' },
    { id: 'alch3', tier: 3, req: ['alch2'], name: 'Potent Brews', desc: 'Brew Potions of Greater Healing.' },
    { id: 'toxicology', tier: 3, name: 'Toxicology', desc: 'Poison wears off twice as fast, and Antidotes also heal 15.' },
    { id: 'alch4', tier: 4, req: ['alch3'], name: 'Philosopher', desc: 'Brew the Elixir of Life (+5 max health, permanently).' },
  ] },
  { id: 'ench', name: 'Enchanting', blurb: 'Rune your own gear. Needs an Enchanting Altar.', nodes: [
    { id: 'ench1', tier: 1, name: 'Runecarver', desc: 'Enchant gear at your altar up to +2 using mana shards.' },
    { id: 'steady', tier: 1, max: 2, name: 'Steady Hand', desc: '+5% enchanting odds at your altar, per rank.' },
    { id: 'ench2', tier: 2, req: ['ench1'], name: 'Runesmith', desc: 'Enchant up to +4. Craft Rings of Protection and Vigor.' },
    { id: 'thrift', tier: 3, name: 'Shard Thrift', desc: '1 in 3 altar attempts costs no shards.' },
    { id: 'ench3', tier: 3, req: ['ench2'], name: 'Archmage of Runes', desc: 'Enchant up to +6 with better odds. Craft Amulets of Wisdom.' },
  ] },
  { id: 'trade', name: 'Trade', blurb: 'Better deals, and money that works for you.', nodes: [
    { id: 'haggle1', tier: 1, name: 'Haggler', desc: 'Buy 5% cheaper and sell 5% higher.' },
    { id: 'haggle2', tier: 2, req: ['haggle1'], name: 'Silver Tongue', desc: 'Another 5% each way.' },
    { id: 'appraise', tier: 2, name: 'Appraiser', desc: "Shops don't drop their offer as fast when you sell many of the same thing." },
    { id: 'tradesman', tier: 3, name: 'Tradesman', desc: 'Things you craft sell for 25% more.' },
    { id: 'landlord', tier: 3, name: 'Landlord', desc: 'Once you have a cottage, tenants farming your field pay you 15 gold a day.' },
    { id: 'merchantprince', tier: 4, name: 'Merchant Prince', desc: 'Shops pay you 10% more for everything.' },
  ] },
];
const SKILL_NODES = {}; for (const tr of TREES) for (const n of tr.nodes) { n.max = n.max || 1; n.tree = tr.id; SKILL_NODES[n.id] = n; }

// ---------- Homestead structures ----------
const STRUCTURES = {
  house:  { name: 'Cottage',          spr: 'cottage', gold: 150, mats: { wood: 20, stone: 15 }, desc: 'Rest for free and store items in a chest.',
            up: { name: 'Farmhouse', gold: 300, mats: { wood: 30, stone: 25, iron: 6 }, desc: 'Sleeping here leaves you Well Rested: +1 to hit, +1 defense and 10% more experience for 400 turns.' } },
  garden: { name: 'Herb Garden',      spr: 'garden',  gold: 40,  mats: { wood: 6 },             desc: 'Harvest healroot and redcaps once a day.',
            up: { name: 'Greenhouse', gold: 120, mats: { wood: 12, stone: 8, healroot: 6 }, desc: 'Harvests are half again as large, and moonpetal grows twice as often.' } },
  forge:  { name: 'Forge',            spr: 'forge',   gold: 100, mats: { stone: 12, iron: 5 },  desc: 'Make weapons, armor and arrows (Smithing skill).',
            up: { name: 'Smithy', gold: 250, mats: { stone: 20, iron: 15, wood: 10 }, desc: '+10% chance that what you make comes out Fine.' } },
  bench:  { name: 'Alchemy Bench',    spr: 'bench',   gold: 60,  mats: { wood: 8, stone: 3 },   desc: 'Brew potions (Alchemy skill).',
            up: { name: 'Laboratory', gold: 200, mats: { wood: 10, stone: 10, gel: 4 }, desc: '1 in 4 brews makes an extra potion.' } },
  altar:  { name: 'Enchanting Altar', spr: 'altar',   gold: 120, mats: { stone: 10, shard: 3 }, desc: 'Enchant gear with mana shards (Enchanting skill).',
            up: { name: 'Sanctum', gold: 300, mats: { stone: 20, shard: 8, silver: 3 }, desc: '+5% enchanting odds at your altar.' } },
  mine:   { name: 'Mine Shaft',       spr: 'mine',    gold: 200, mats: { wood: 20, stone: 5 },  desc: 'Dig iron ore once a day, sometimes silver. Needs a pickaxe.',
            up: { name: 'Deep Shaft', gold: 400, mats: { wood: 30, stone: 20, iron: 10 }, desc: '3 more ore a day, silver far more often, and a chance of mithril.' } },
};

// ---------- Crafting recipes ----------
// Equipment recipes: materials per class at each grade.
const GEAR_MATS = {
  dagger:  [{ iron: 2 }, { iron: 4 }, { iron: 2, silver: 2 }, { mithril: 2, shard: 1 }],
  sword:   [{ iron: 3, wood: 1 }, { iron: 6, wood: 1 }, { iron: 3, silver: 3 }, { mithril: 4, shard: 1 }],
  axe:     [{ iron: 2, wood: 2 }, { iron: 5, wood: 2 }, { iron: 3, silver: 3, wood: 2 }, { mithril: 4, wood: 2, shard: 1 }],
  mace:    [{ iron: 3, wood: 1 }, { iron: 6, wood: 1 }, { iron: 3, silver: 3 }, { mithril: 4, shard: 1 }],
  spear:   [{ iron: 2, wood: 3 }, { iron: 4, wood: 3 }, { iron: 2, silver: 2, wood: 3 }, { mithril: 3, wood: 3, shard: 1 }],
  bow:     [{ wood: 4, silk: 1 }, { wood: 5, silk: 2, iron: 1 }, { wood: 5, silk: 2, silver: 2 }, { wood: 4, silk: 3, mithril: 2 }],
  crossbow:   [{ wood: 4, iron: 2, silk: 1 }, { wood: 4, iron: 4, silk: 2 }, { wood: 3, iron: 2, silver: 3, silk: 2 }, { wood: 3, mithril: 3, silk: 2 }],
  warhammer:  [{ iron: 5, wood: 2 }, { iron: 8, wood: 2 }, { iron: 4, silver: 4, wood: 2 }, { mithril: 5, wood: 2, shard: 1 }],
  flail:      [{ iron: 4, wood: 1 }, { iron: 6, wood: 1 }, { iron: 3, silver: 3, wood: 1 }, { mithril: 4, shard: 1 }],
  greatsword: [{ iron: 6, wood: 1 }, { iron: 9, wood: 1 }, { iron: 5, silver: 4 }, { mithril: 6, shard: 1 }],
  rapier:     [{ iron: 3 }, { iron: 5 }, { iron: 2, silver: 3 }, { mithril: 3, shard: 1 }],
  halberd:    [{ iron: 4, wood: 4 }, { iron: 6, wood: 4 }, { iron: 3, silver: 3, wood: 4 }, { mithril: 4, wood: 3, shard: 1 }],
  staff:   [{ wood: 3, shard: 1 }, { wood: 4, shard: 2 }, { wood: 3, silver: 2, shard: 2 }, { wood: 3, mithril: 2, soulgem: 1 }],
  robe:    [{ silk: 3 }, { silk: 5 }, { silk: 4, silver: 1, shard: 1 }, { silk: 5, mithril: 1, soulgem: 1 }],
  leather: [{ hide: 4 }, { hide: 6, iron: 1 }, { hide: 6, silver: 2 }, { hide: 5, mithril: 2 }],
  mail:    [{ iron: 8 }, { iron: 12 }, { iron: 6, silver: 4 }, { mithril: 6 }],
  plate:   [{ iron: 12 }, { iron: 16, stone: 2 }, { iron: 10, silver: 5 }, { mithril: 9 }],
  shieldl: [{ wood: 2, iron: 1 }, { wood: 2, iron: 3 }, { iron: 2, silver: 2 }, { mithril: 2 }],
  shieldh: [{ wood: 3, iron: 4 }, { wood: 3, iron: 7 }, { iron: 5, silver: 3 }, { mithril: 5 }],
  helm:    [{ hide: 2 }, { iron: 3 }, { iron: 4, silver: 1 }, { mithril: 3 }],
  boots:   [{ hide: 2 }, { iron: 3 }, { iron: 3, silver: 1 }, { mithril: 3 }],
};
const RECIPES = [];
GRADES.forEach((gr, gi) => {
  for (const cls in GEAR_MATS) RECIPES.push({ out: cls + '_' + gr, st: 'forge', skill: 'smith' + (gi + 1), mats: GEAR_MATS[cls][gi] });
});
RECIPES.push(
  { out: 'arrows',    st: 'forge', skill: 'smith1', mats: { wood: 1, iron: 1, feather: 2 }, qty: 15 },
  { out: 'pheal',     st: 'bench', skill: 'alch1', mats: { healroot: 2 } },
  { out: 'pantidote', st: 'bench', skill: 'alch1', mats: { healroot: 1, redcap: 1 }, qty: 2 },
  { out: 'pmana',     st: 'bench', skill: 'alch2', mats: { redcap: 2, gel: 1 } },
  { out: 'pstr',      st: 'bench', skill: 'alch2', mats: { redcap: 2, bone: 1 } },
  { out: 'pgheal',    st: 'bench', skill: 'alch3', mats: { healroot: 2, moonpetal: 1 } },
  { out: 'plife',     st: 'bench', skill: 'alch4', mats: { moonpetal: 3, soulgem: 1 } },
  { out: 'ringprot',  st: 'altar', skill: 'ench2', mats: { silver: 2, shard: 2 } },
  { out: 'ringvigor', st: 'altar', skill: 'ench2', mats: { silver: 2, healroot: 3, shard: 1 } },
  { out: 'amuwis',    st: 'altar', skill: 'ench3', mats: { silver: 3, soulgem: 1 } },
);

const LAND_PRICE = 350;

// ---------- The pantheon ----------
// Each god is tied to a place. A shrine there grants its power through a trial; powers recharge each day.
const GODS = {
  aurel:   { name: 'Aurel', title: 'the Dawn', domain: 'Light, healing and the hearth. The god of Brambleford.', where: 'The Temple of the Dawn in Brambleford', map: 'town',
             power: { name: "Dawn's Light", desc: 'Heals you, cures poison and sickness, sears undead in sight, and leaves a lasting light where you stand.' },
             trial: { type: 'given', text: 'You took the Rite of First Light as a boy, at Father Halvard\'s side.' } },
  veyra:   { name: 'Veyra', title: 'the Green Lady', domain: 'Forests, hunting and wild beasts.', where: 'A standing stone in Deep Whisperwood', map: 'f2',
             power: { name: "Hunter's Grace", desc: 'For 60 turns: +3 to hit and +2 damage, and game animals will not flee from you.' },
             trial: { type: 'offer', mats: { antler: 3 }, text: 'Lay the antlers of three deer upon the stone.' } },
  korrum:  { name: 'Korrum', title: 'the Stone Father', domain: 'Mountains, mines and endurance.', where: 'A carved face in the rock, cave level 2', map: 'd2',
             power: { name: 'Stoneskin', desc: 'For 40 turns: +4 defense.' },
             trial: { type: 'offer', mats: { stone: 10, iron: 5 }, text: 'Return to the mountain what was taken: ten stones and five iron ore.' } },
  gharrok: { name: 'Gharrok', title: 'the Ember', domain: 'Fire, forges and war. The goblins of Gnarlhold worship him.', where: 'A forge-altar in Gnarlhold, level 2', map: 'g2',
             power: { name: 'Forgefire', desc: 'For 40 turns: your weapon burns for 1–6 extra fire damage.' },
             trial: { type: 'fire', text: 'Thrust your hand into the sacred flame. It will cost you a third of your health.' } },
  nemora:  { name: 'Nemora', title: 'the Still Water', domain: 'Lakes, memory and secrets. The Hollowfolk keep her shrines.', where: 'A pool-side altar in the Hollows, level 2', map: 'h2',
             power: { name: 'Still Waters', desc: 'Maps the level, reveals hidden creatures for 100 turns, and clears blindness and confusion.' },
             trial: { type: 'vigil', turns: 100, text: 'Keep a silent vigil by the water for 100 turns. If any creature comes into view, the vigil breaks.' } },
  ssathal: { name: "Ssa'thal", title: 'the Coiled One', domain: 'Venom, patience and cunning. The god of Sszarith.', where: 'A coiled idol in Sszarith, level 3', map: 's3',
             power: { name: "Serpent's Kiss", desc: 'For 60 turns: your blows poison your foes, and poison cannot touch you.' },
             trial: { type: 'venom', text: "Drink from the serpent's cup. It is venom, and it will burn." } },
};
const GOD_ORDER = ['aurel', 'veyra', 'korrum', 'gharrok', 'nemora', 'ssathal'];
