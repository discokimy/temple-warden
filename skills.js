// The Temple Warden — skills that grow by use.
// Every skill runs from 1 to 100 and rises only when you do the thing: swing a blade, take a blow in armor, cast,
// pray, haggle, hammer at the forge, gather, sneak. Each time a skill rises it counts toward your level, and each
// level brings an attribute point and a perk point. Perks open as the skill that governs them grows.
'use strict';

const SKILL_GROUPS = [
  ['Combat', ['blade', 'axe', 'blunt', 'spear', 'archery', 'block', 'armor']],
  ['Magic', ['evocation', 'restoration', 'illusion', 'abjuration', 'divination']],
  ['Faith & Life', ['faith', 'speech', 'sneak', 'survival']],
  ['Crafts', ['smithing', 'alchemy', 'enchanting']],
];
const SKILL_DEFS = {
  blade: { name: 'Blade', desc: 'Swords and daggers. Rises with every blow that lands.', start: 5 },
  axe: { name: 'Axe', desc: 'Axes. Rises with every blow that lands.', start: 5 },
  blunt: { name: 'Blunt', desc: 'Maces, staves, hammers and your fists. Rises with every blow that lands.', start: 15 },
  spear: { name: 'Spear', desc: 'Spears. Rises with every blow that lands.', start: 5 },
  archery: { name: 'Archery', desc: 'Bows. Rises with every arrow that finds its mark.', start: 5 },
  block: { name: 'Block', desc: 'Turning blows aside with a shield. Rises when your shield stops one.', start: 5 },
  armor: { name: 'Armor', desc: 'Wearing armor well. Rises when you take blows in it.', start: 8 },
  evocation: { name: 'Evocation', desc: 'Fire, frost and force. Rises as you cast them.', start: 5 },
  restoration: { name: 'Restoration', desc: 'Healing and warding. Rises as you cast it, and when you tend the sick.', start: 15 },
  illusion: { name: 'Illusion', desc: 'Sleep, fear and unseen steps. Rises as you cast it.', start: 5 },
  abjuration: { name: 'Abjuration', desc: 'Shields and banishings. Rises as you cast them.', start: 5 },
  divination: { name: 'Divination', desc: 'Sight, detection and recall. Rises as you cast them.', start: 5 },
  faith: { name: 'Faith', desc: 'Prayer and the gods’ favor. Rises when you pray, invoke a god, keep a vigil or pray for your people.', start: 20 },
  speech: { name: 'Speech', desc: 'Trading and counsel. Rises when you buy and sell, and when you counsel the troubled.', start: 15 },
  sneak: { name: 'Sneak', desc: 'Moving unseen. Rises when you creep near creatures that haven’t noticed you, and with every sneak attack.', start: 5 },
  survival: { name: 'Survival', desc: 'Living off the land. Rises when you forage, fell trees, mine, fish and skin.', start: 12 },
  smithing: { name: 'Smithing', desc: 'Making weapons, armor and arrows at a forge. Rises with each thing you make.', start: 5 },
  alchemy: { name: 'Alchemy', desc: 'Brewing at a bench or cauldron. Rises with each brew.', start: 5 },
  enchanting: { name: 'Enchanting', desc: 'Working runes at an altar. Rises with each enchantment.', start: 5 },
};
// basic craft knowledge you start with, so the crafts can be practised from the beginning
const FREE_PERKS = new Set(['smith1', 'alch1', 'ench1']);
// which skill governs each perk, and the skill level each rank needs
const PERK_GATES = {
  wt: ['weapon', [15, 30, 45]], tough: ['armor', [15, 35, 55]], blade: ['blade', [30, 55]], axe: ['axe', [30, 55]], mace: ['blunt', [30, 55]], spear: ['spear', [30, 55]],
  crit: ['weapon', [60]], ironskin: ['armor', [45, 70]], secondwind: ['armor', [60]], berserker: ['weapon', [80]], guardian: ['block', [70]],
  forager: ['survival', [15, 35]], lumber: ['survival', [15, 35]], archery: ['archery', [20, 40, 60]], skinner: ['survival', [30, 50]], prospect: ['survival', [45, 65]],
  tracker: ['survival', [55]], lightstep: ['sneak', [40]], greenthumb: ['survival', [75]], fletcher: ['archery', [70]], shadowstrike: ['sneak', [70]],
  spellcraft: ['magic', [15, 35, 55]], manawell: ['magic', [20, 40, 60]], focus: ['magic', [40]], meditation: ['restoration', [40]], battlemage: ['abjuration', [50]], volley: ['evocation', [60]], archmage: ['magic', [85]],
  devotion: ['faith', [20, 45]], pilgrim: ['faith', [25]], sunward: ['faith', [40]], resolve: ['faith', [40]], secondprayer: ['faith', [60]], chosen: ['faith', [85]],
  smith1: ['smithing', [1]], smith2: ['smithing', [35]], arrowsmith: ['smithing', [30]], smith3: ['smithing', [55]], temper: ['smithing', [40, 60]], smith4: ['smithing', [75]], masterwork: ['smithing', [90]],
  alch1: ['alchemy', [1]], herbalist: ['alchemy', [25, 45]], alch2: ['alchemy', [35]], efficient: ['alchemy', [40]], alch3: ['alchemy', [55]], toxicology: ['alchemy', [60]], alch4: ['alchemy', [80]],
  ench1: ['enchanting', [1]], steady: ['enchanting', [25, 45]], ench2: ['enchanting', [40]], thrift: ['enchanting', [55]], ench3: ['enchanting', [70]],
  haggle1: ['speech', [20]], haggle2: ['speech', [40]], appraise: ['speech', [30]], tradesman: ['speech', [50]], landlord: ['speech', [60]], merchantprince: ['speech', [80]],
};
const GATE_NAMES = { weapon: 'any weapon skill', magic: 'any school of magic' };

function skillsOf() { const p = P(); if (!p.sk) { p.sk = {}; p.skx = {}; for (const id in SKILL_DEFS) p.sk[id] = SKILL_DEFS[id].start; } if (!p.skx) p.skx = {}; return p.sk; }
const skillLv = id => {
  const sk = skillsOf();
  if (id === 'weapon') return Math.max(sk.blade, sk.axe, sk.blunt, sk.spear, sk.archery);
  if (id === 'magic') return Math.max(sk.evocation, sk.restoration, sk.illusion, sk.abjuration, sk.divination);
  return sk[id] || 1;
};
// how much practice the next level takes: quick at first, slow toward mastery
const skillNeed = L => 2 + L * 0.95 + (L > 50 ? (L - 50) * 0.6 : 0);
const WEAPON_SKILL = { sword: 'blade', dagger: 'blade', axe: 'axe', mace: 'blunt', staff: 'blunt', hammer: 'blunt', fist: 'blunt', spear: 'spear', bow: 'archery', crossbow: 'archery', warhammer: 'blunt', flail: 'blunt', greatsword: 'blade', rapier: 'blade', halberd: 'spear' };

function useSkill(id, amount) {
  if (!S || !SKILL_DEFS[id] || !(amount > 0)) return;
  const p = P(), sk = skillsOf();
  if (sk[id] >= 100) return;
  p.skx[id] = (p.skx[id] || 0) + amount * (buff('rested') ? 1.1 : 1);
  while (sk[id] < 100 && p.skx[id] >= skillNeed(sk[id])) {
    p.skx[id] -= skillNeed(sk[id]); sk[id]++;
    msg(`Your ${SKILL_DEFS[id].name} skill rises to ${sk[id]}.`, 'level');
    addFloat(p.x, p.y, `${SKILL_DEFS[id].name} ${sk[id]}`, '#9cd0ff', true);
    // a skill rising counts toward your level, more so the higher it climbs
    gainXp(Math.max(4, Math.round(sk[id] * 0.6)));
    const opened = Object.keys(PERK_GATES).filter(k => PERK_GATES[k][0] === id && PERK_GATES[k][1].includes(sk[id]) && SKILL_NODES[k] && !FREE_PERKS.has(k));
    if (opened.length) msg(`New perks open: ${opened.map(k => SKILL_NODES[k].name).join(', ')} (Hero › Skills).`, 'level');
  }
}
// what a perk's next rank needs, or '' when it can be taken
function perkGateText(n) {
  const g = PERK_GATES[n.id]; if (!g) return '';
  const need = g[1][Math.min(rank(n.id), g[1].length - 1)];
  if (skillLv(g[0]) >= need) return '';
  return `Needs ${SKILL_DEFS[g[0]] ? SKILL_DEFS[g[0]].name : GATE_NAMES[g[0]]} ${need}`;
}
function htmlSkillLevels() {
  const p = P(), sk = skillsOf();
  return SKILL_GROUPS.map(([label, ids]) => `<h3>${label}</h3><div class="skl">${ids.map(id => {
    const L = sk[id], frac = L >= 100 ? 1 : (p.skx[id] || 0) / skillNeed(L);
    return `<div class="skl-row" title="${SKILL_DEFS[id].desc}"><span>${SKILL_DEFS[id].name}</span><b>${L}</b><i><em style="width:${Math.round(frac * 100)}%"></em></i></div>`;
  }).join('')}</div>`).join('');
}
// bring an older save onto use-based skills: start values, raised to cover any perks already learned
function seedSkills(p) {
  p.sk = {}; p.skx = {};
  for (const id in SKILL_DEFS) p.sk[id] = SKILL_DEFS[id].start + Math.min(15, Math.floor((p.level - 1) * 1.5));
  for (const [k, r] of Object.entries(p.skills || {})) {
    const g = PERK_GATES[k]; if (!g || !r) continue;
    const need = g[1][Math.min(r, g[1].length) - 1];
    const ids = g[0] === 'weapon' ? ['blunt'] : g[0] === 'magic' ? ['restoration'] : [g[0]];
    for (const id of ids) p.sk[id] = Math.max(p.sk[id], need);
  }
}
