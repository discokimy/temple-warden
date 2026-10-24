// The Temple Warden — 16×16 pixel art, drawn from character grids.
// Each sprite is 16 rows of 16 characters; '.' is transparent, other letters index the palette.
'use strict';

const BASE_PAL = {
  k: '1b1424', w: 'f2efe6', S: 'eab38b', s: 'c48862', H: '6e3f1f', h: '4a2a14', T: '3f7d3a', t: '2b5a28', P: '46506e', B: '4a2e17',
  L: '8f5d2c', l: '61401d', M: 'd3dae0', m: '9aa5b0', n: '5f6a75', Y: 'e3b93c', y: 'a8801f', R: 'b9343c', r: '7d2027',
  W: '8b5a2b', Z: '5e3a1a', g: '6aa33c', d: '3f6b22', o: 'e8e1c8', O: 'b3aa8c', x: '8a7262', X: '5e4a3d', p: 'e89aa8',
  v: '58c46a', V: '2f8a45', i: 'c8f5cf', u: '3a2f45', U: '5c4d6e', e: 'ff4a3d', b: '3b6fc4', c: '9cc0f5', a: '7b4bb5', A: 'b48ee0',
  q: 'd9dce6', Q: 'a3a8bd', j: '3f8f7a', J: '25594b', f: 'd8c27a', G: '8d8d8d', F: 'b5b5b5', D: '5c5c5c', z: 'e07b2c', N: '23305e',
  1: '888888', 2: '555555', 3: 'cccccc',
};
const E16 = '................';
function grid(rows) { const g = Array(16).fill(E16); for (const k in rows) g[k] = (rows[k] + E16).slice(0, 16); return g; }
function over(base, ...layers) {
  return base.map((row, y) => { const r = row.split(''); for (const L of layers) if (L) for (let x = 0; x < 16; x++) if (L[y][x] !== '.') r[x] = L[y][x]; return r.join(''); });
}

// ================= hero & humans =================
const HUMAN = grid({ 1: '......kkkk......', 2: '.....kHHHHk.....', 3: '....kHHHHHHk....', 4: '....kHSSSSHk....', 5: '....kSkSSkSk....', 6: '....kSSSSSSk....', 7: '.....kSssSk.....',
  8: '....kTTTTTTk....', 9: '...kTkTTTTkTk...', 10: '...kTkTttTkTk...', 11: '...kSkTTTTkSk...', 12: '.....kPPPPk.....', 13: '.....kPkkPk.....', 14: '....kBBkkBBk....', 15: '....kkk..kkk....' });
const L_ROBE = grid({ 8: '....k1111112....', 9: '...k1k1111k1k...', 10: '...k1k1331k1k...', 11: '...kSk1111kSk...', 12: '....k111111k....', 13: '....k121121k....', 14: '...k12111121k...', 15: '...kkkkkkkkkk...' });
const L_LEATHER = grid({ 8: '....k111111k....', 9: '...k1k1221k1k...', 10: '...k1k1111k1k...', 11: '......1331......' });
const L_MAIL = grid({ 8: '....k212121k....', 9: '...k1k1212k1k...', 10: '...k2k2121k2k...', 11: '......1212......' });
const L_PLATE = grid({ 7: '...kk......kk...', 8: '..k1111111111k..', 9: '..k21k1111k12k..', 10: '...k1k1221k1k...', 11: '......1111......', 12: '.....k2222k.....', 13: '.....k2kk2k.....' });
const L_CAP = grid({ 1: '......kkkk......', 2: '.....kLLLLk.....', 3: '....kLlLLlLk....' });
const L_HELM = grid({ 1: '......kkkk......', 2: '.....k1111k.....', 3: '....k111111k....', 4: '....k2SSSS2k....' });
const L_GREATHELM = grid({ 1: '......kkkk......', 2: '.....k1111k.....', 3: '....k111111k....', 4: '....k111111k....', 5: '....kkkkkkkk....', 6: '....k112211k....', 7: '.....k1111k.....' });
const L_SHIELDL = grid({ 9: '.kkk............', 10: 'k131k...........', 11: 'k313k...........', 12: '.kkk............' });
const L_SHIELDH = grid({ 8: 'kkkkk...........', 9: 'k131k...........', 10: 'k333k...........', 11: 'k131k...........', 12: 'k131k...........', 13: '.kkk............' });
const H_DAGGER = grid({ 7: '.............k..', 8: '............kMk.', 9: '............kMk.', 10: '...........kYYYk', 11: '.............W..', 12: '.............k..' });
const H_SWORD = grid({ 2: '.............k..', 3: '............kMk.', 4: '............kMk.', 5: '............kMk.', 6: '............kMk.', 7: '............kMk.', 8: '............kMk.', 9: '............kMk.', 10: '...........kYYYk', 11: '.............W..', 12: '.............k..' });
const H_AXE = grid({ 3: '............kkkk', 4: '............kWMM', 5: '............kWMM', 6: '............kWkk', 7: '............kWk.', 8: '............kWk.', 9: '............kWk.', 10: '............kWk.', 11: '.............W..', 12: '.............k..' });
const H_MACE = grid({ 3: '............kkk.', 4: '...........kMmMk', 5: '...........kmMmk', 6: '............kkk.', 7: '.............W..', 8: '.............W..', 9: '.............W..', 10: '.............W..', 11: '.............W..', 12: '.............k..' });
const H_SPEAR = grid({ 0: '.............k..', 1: '............kMk.', 2: '............kMk.', 3: '.............W..', 4: '.............W..', 5: '.............W..', 6: '.............W..', 7: '.............W..', 8: '.............W..', 9: '.............W..', 10: '.............W..', 11: '.............W..', 12: '.............W..', 13: '.............W..', 14: '.............k..' });
const H_BOW = grid({ 3: '............kWk.', 4: '............O.Wk', 5: '............O..W', 6: '............O..W', 7: '............O..W', 8: '............O..W', 9: '............O..W', 10: '............O.Wk', 11: '............kWk.' });
const H_STAFF = grid({ 0: '............kbk.', 1: '...........kcbbk', 2: '............kbk.', 3: '.............W..', 4: '.............W..', 5: '.............W..', 6: '.............W..', 7: '.............W..', 8: '.............W..', 9: '.............W..', 10: '.............W..', 11: '.............W..', 12: '.............W..', 13: '.............W..', 14: '.............k..' });
const HELD = { dagger: H_DAGGER, sword: H_SWORD, axe: H_AXE, mace: H_MACE, spear: H_SPEAR, bow: H_BOW, staff: H_STAFF };

// ---- character creator: looks layered onto the base body ----
const LOOK = {
  skin: [['eab38b', 'c48862'], ['f6d0ac', 'dba67e'], ['d9a070', 'b07850'], ['a8714a', '80522f'], ['7a4a2c', '5a321a'], ['4f2e1c', '371e10']],
  hairColor: ['6e3f1f', '2a1a10', 'c9784a', 'e0c060', 'a0a0a0', '8a1f3f', 'f2efe6', '3b6fc4'],
  shirt: ['3f7d3a', '3b6fc4', 'b9343c', '7b4bb5', 'e07b2c', '8f5d2c', 'd8cfb8', '2a2a3a', '3f8f7a', 'd6336c'],
  pants: ['46506e', '5a4a3a', '2a2a3a', '6e8a3a', '8a5a7a', 'b8a07a'],
  boots: ['4a2e17', '1b1424', '7a5a3a', '5f6a75'],
  hair: ['Short', 'Long', 'Ponytail', 'Curly', 'Mohawk', 'Shaved'],
  face: ['Stubble', 'Full beard', 'Handlebar moustache', 'Clean-shaven', 'Short beard', 'Goatee', 'Chinstrap', 'Mutton chops', 'Long beard', 'Braided beard'],
};
const HAIR_LAYERS = [null,
  grid({ 3: '...kHHHHHHHHk...', 4: '...kHHSSSSHHk...', 5: '...kHSkSSkSHk...', 6: '...kHSSSSSSHk...', 7: '...kHkSssSkHk...', 8: '...kH......Hk...', 9: '...kk......kk...' }),
  grid({ 2: '.....kHHHHkk....', 3: '....kHHHHHHkHk..', 4: '....kHSSSSHkHk..', 5: '...........kHk..', 6: '...........kHk..', 7: '............k...' }),
  grid({ 0: '.....kk.kk......', 1: '....kHHkHHkk....', 2: '...kHHHHHHHHk...', 3: '...kHhHHhHHHk...', 4: '....kHSSSSHk....' }),
  grid({ 0: '.......kk.......', 1: '......kHHk......', 2: '.....kSHHSk.....', 3: '....kSShhSSk....', 4: '....kSSSSSSk....' }),
  grid({ 1: '......kkkk......', 2: '.....kSSSSk.....', 3: '....khSSSShk....', 4: '....khSSSShk....' }),
];
const FACE_LAYERS = [null, grid({ 6: '....kHSSSSHk....', 7: '.....kHHHHk.....', 8: '......kHHk......' }), grid({ 6: '....kSHHHHSk....' })];
function shade(hex, f = 0.72) { return [0, 2, 4].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join(''); }
function lookPal(L = {}) {
  const sk = LOOK.skin[L.skin || 0], hc = LOOK.hairColor[L.hairColor || 0], sh = LOOK.shirt[L.shirt || 0];
  return { S: sk[0], s: sk[1], H: hc, h: shade(hc), T: sh, t: shade(sh), P: LOOK.pants[L.pants || 0], B: LOOK.boots[L.boots || 0] };
}
// the hero's face: a squarer, grown-up jaw (townsfolk keep their own faces)
const JAW = grid({ 6: '....kSSSSSSk....', 7: '....ksSssSsk....' });
const lookBase = (L = {}) => over(HUMAN, HAIR_LAYERS[L.hair || 0], JAW, FACE_LAYERS[L.face || 0]);

// Colors by grade. Metal uses M/m/n (and 1/2/3 on armor layers); wood uses W/Z.
const GRADE_PAL = {
  iron:    { M: 'b8bfc6', m: '8a949e', n: '5a636c', 1: 'b8bfc6', 2: '7a848e', 3: 'e3b93c', W: '8b5a2b', Z: '5e3a1a', b: '3b6fc4', c: '9cc0f5' },
  steel:   { M: 'e4eaef', m: 'a9b4bf', n: '6b7785', 1: 'dfe6ec', 2: '93a0ad', 3: 'e3b93c', W: '5e3a1a', Z: '3a2410', b: '3faa4a', c: 'a6e39a' },
  silver:  { M: 'f6f7fa', m: 'cfd5dc', n: '97a1ad', 1: 'f2f4f7', 2: 'b8c0ca', 3: 'e3b93c', W: 'd8d2c0', Z: 'a8a090', b: 'f2efe6', c: 'ffffff' },
  mithril: { M: 'b9e6f7', m: '72bde0', n: '3a7ca8', 1: 'b9e6f7', 2: '5fa6cf', 3: 'f6f7fa', W: '3a7ca8', Z: '24557a', b: '7fd0f5', c: 'e8f8ff' },
  royal:   { M: 'f0d27a', m: 'c9a84a', n: '8a6d1f', 1: 'f0d27a', 2: 'b8902f', 3: 'b9343c', W: '7d2027', Z: '4a1016', b: 'b9343c', c: 'f08a8f' },
};
const CLOTH_PAL = {
  robe:    { iron: { 1: 'd8cfb8', 2: 'a89e86', 3: '8f5d2c' }, steel: { 1: '6a4fb3', 2: '4a3683', 3: 'e3b93c' }, silver: { 1: '2f4f9f', 2: '1f3570', 3: 'e3b93c' }, mithril: { 1: '8a1f3f', 2: '5e1229', 3: 'f0d27a' } },
  leather: { iron: { 1: '8f5d2c', 2: '61401d', 3: 'e3b93c' }, steel: { 1: '6e4421', 2: '4a2c12', 3: 'b8bfc6' }, silver: { 1: '7a5a3a', 2: '4f3923', 3: 'f6f7fa' }, mithril: { 1: '3e3650', 2: '2a2438', 3: '7fd0f5' } },
};
function gearPal(it) {
  const t = ITEMS[it.id || it]; const g = t.grade || 'iron';
  return Object.assign({}, GRADE_PAL[g] || GRADE_PAL.iron, CLOTH_PAL[t.cls] ? CLOTH_PAL[t.cls][g] || {} : {});
}

// NPC looks: palette overrides plus optional overlays.
const O_BEARD = grid({ 6: '....kHSSSSHk....', 7: '.....kHHHHk.....', 8: '......kHHk......' });
const O_APRON = grid({ 9: '......wwww......', 10: '......wwww......', 11: '......wwww......', 12: '......wwww......' });
const O_WIZHAT = grid({ 0: '.......kk.......', 1: '......kbbk......', 2: '....kkbbbbkk....', 3: '..kkbbbbbbbbkk..' });
const O_STRAW = grid({ 1: '......kkkk......', 2: '....kYYYYYYk....', 3: '..kkYYYYYYYYkk..' });
const O_SCARF = grid({ 1: '......kkkk......', 2: '.....kaaaak.....', 3: '....kaaaaaak....', 4: '....kaSSSSak....', 5: '....kakSSkak....', 6: '....kaSSSSak....' });
const O_DRESS = grid({ 12: '.....kTTTTk.....', 13: '....kTTTTTTk....', 14: '....kTttttTk....', 15: '....kkkkkkkk....' });
const O_CHAIN = grid({ 9: '......kYYk......', 10: '.......YY.......' });
const O_BALD = grid({ 1: '......kkkk......', 2: '.....kSSSSk.....', 3: '....kHSSSSHk....' });
const O_EARS = grid({ 4: '...k........k...', 5: '..kSk......kSk..' });
const NPCS = {
  hero:     { pal: {} },
  wendell:  { pal: { H: '7a4a22', T: '9c7a4a', t: '7a5a30' }, o: [O_BEARD, O_APRON] },
  bran:     { pal: { H: '2a1a10', T: '5a5a5a', t: '3a3a3a', w: '6e4421' }, o: [O_BALD, O_BEARD, O_APRON] },
  hilde:    { pal: { H: 'e0c060', T: '7a848e', t: '5a636c' }, o: [O_DRESS] },
  odessa:   { pal: { T: '7b4bb5', t: '5a3290', S: 'c48862', s: '9a6440' }, o: [O_SCARF, O_DRESS] },
  mirela:   { pal: { H: 'e8e8f0', T: '3f8f7a', t: '25594b' }, o: [O_EARS, O_DRESS] },
  aldous:   { pal: { H: 'e8e8e8', T: '3b6fc4', t: '23305e', P: '23305e' }, o: [O_BEARD, O_WIZHAT] },
  tamsin:   { pal: { H: 'b8b8b8', T: '3f6b22', t: '2b4a18' }, o: [O_DRESS, O_APRON] },
  rolf:     { pal: { H: 'a0a0a0', T: 'b9343c', t: '7d2027' }, o: [O_BEARD, O_APRON] },
  mortimer: { pal: { H: 'c8c8c8', T: '23305e', t: '151d3a' }, o: [O_BALD] },
  voss:     { pal: { H: '1b1424', T: '2a2a3a', t: '151520', P: '151520' }, o: [O_CHAIN] },
  berta:    { pal: { H: 'd8d8d8', T: '8a5a7a', t: '6a3a5a' }, o: [O_SCARF, O_DRESS], pal2: { a: '8a5a7a' } },
  girl:     { pal: { H: 'c9784a', T: 'e07b2c', t: 'b05a1a' }, o: [O_DRESS] },
  farmer:   { pal: { H: '7a4a22', T: '6e8a3a', t: '4a6a22', P: '5a4a3a' }, o: [O_STRAW] },
  guard:    { pal: { T: 'b9343c', t: '7d2027' }, o: [L_HELM, H_SPEAR], pal2: GRADE_PAL.steel },
  baker:    { pal: { H: 'd8b080', T: 'f2efe6', t: 'c8c0b0' }, o: [O_APRON], pal2: { w: 'e8e1c8' } },
  merchant: { pal: { H: '2a1a10', T: 'b9343c', t: '7d2027' }, o: [O_BEARD] },
  villager1:{ pal: { H: 'c9784a', T: '3b6fc4', t: '23305e' } },
  villager2:{ pal: { H: 'e0c060', T: '8a5a7a', t: '6a3a5a' }, o: [O_DRESS] },
  villager3:{ pal: { H: '4a2a14', T: '6e8a3a', t: '4a6a22', S: 'c48862', s: '9a6440' } },
  elsbeth:  { pal: { H: 'b89a6a', T: '8a8f98', t: '6a6f78' }, o: [O_DRESS] },
  priest:   { pal: { H: 'c8c8c8', T: 'f2efe6', t: 'c9a84a', P: 'f2efe6' }, o: [O_BALD, O_CHAIN] },
};

// ================= monsters =================
const GOBLIN = grid({ 2: '......kkkk......', 3: '.....kggggk.....', 4: '.kk.kggggggk.kk.', 5: '..kkgYggggYgkk..', 6: '....kggkkggk....', 7: '.....kgwwgk.....',
  8: '....kLLLLLLk....', 9: '...kgkLlLLkgk...', 10: '...kgkLLLLkgk...', 11: '....kkLLLLkk....', 12: '.....kddddk.....', 13: '.....kdkkdk.....', 14: '....kkk..kkk....' });
const RATKIN = grid({ 1: '...kk....kk.....', 2: '..kpxk..kxpk....', 3: '..kxxxkkxxxk....', 4: '...kxexxxexk....', 5: '...kxxxxxxxk....', 6: '....kxxxxxk.....', 7: '.....kxpxk......',
  8: '....kXxXXxXk....', 9: '...kxkXXXXkxk...', 10: '...kxkXXXXkxk...', 11: '...kpkXXXXkpk...', 12: '.....kXXXXk.kxk.', 13: '.....kxkkxk..kxk', 14: '....kpk..kpk..kp' });
const HOLLOW = grid({ 2: '.....kkkkk......', 3: '....kqqqqqk.....', 4: '...kqqqqqqqk....', 5: '..kqcckqkccqk...', 6: '...kqqqqqqqk....', 7: '....kqQkQqk.....',
  8: '.....kqqqk......', 9: '....kqkQkqk.....', 10: '...kqkqQqkqk....', 11: '..kqk.kqqk.kqk..', 12: '..kk..kllk..kk..', 13: '.....kqkkqk.....', 14: '....kqk..kqk....', 15: '....kk....kk....' });
const SERPENT = grid({ 1: '.....kkkk.......', 2: '....kjjjjk......', 3: '...kjjfjjjk.....', 4: '...kjYjjYjk.....', 5: '...kjjjjjjk.....', 6: '....kjjjjk......', 7: '.....kjjkR......',
  8: '...kkjffjkk.....', 9: '..kjkjffjkjk....', 10: '..kjkjffjkjk....', 11: '..kjk.kffk.kjk..', 12: '......kjjjk.....', 13: '......kjjjjjjk..', 14: '.....kjjjjjjjjk.', 15: '......kkkkkkkk..' });
const CROWN = grid({ 0: '.....k.k.k......', 1: '....kYkYkYk.....', 2: '....kYYYYYk.....' });
const MON_ART = {
  rat: grid({ 6: '..kk............', 7: '.kpxk..kkkkk....', 8: 'kxxxxkkxxxxxk...', 9: 'kxkxxxxxxxxxxk..', 10: 'pkxxxxxxxxxxxxk.', 11: '.kXxxxxxxxxxxXk.', 12: '..kXXkXXXXkXXkkp', 13: '...kpk...kpk.pp.', 14: '..............p.' }),
  bat: grid({ 5: '......k..k......', 6: '.kk...kUUk...kk.', 7: 'kUUk.kUUUUk.kUUk', 8: 'kUUUkUeUUeUkUUUk', 9: '.kUUUkUUUUkUUUk.', 10: '..kUk.kwwk.kUk..', 11: '...k...kk...k...' }),
  viper: [grid({ 7: '..........kkk...', 8: '.........kjjjk..', 9: '.........kjYjjk.', 10: '....kkk...kjjk.R', 11: '...kjjjk..kjk...', 12: '..kjfffjkkjjk...', 13: '..kjk.kjjjjk....', 14: '...kjjjjjkk.....', 15: '....kkkkk.......' }), { j: '7a8f3a', f: 'c9c27a' }],
  cspider: grid({ 6: '..k..........k..', 7: '...k..kkkk..k...', 8: 'k...kkUUUUkk...k', 9: '.kkkkuUUUUukkkk.', 10: '....kuuuuuuk....', 11: '.kkkkueuueukkkk.', 12: 'k...kkuuuukk...k', 13: '...k..kkkk..k...', 14: '..k..........k..' }),
  slime: grid({ 7: '......kkkk......', 8: '....kkviivkk....', 9: '...kviiivvvvk...', 10: '..kvivvvvvvvvk..', 11: '..kvvkvvvvkvvk..', 12: '.kvvvvvvvvvvvvk.', 13: '.kVvvvvvvvvvvVk.', 14: '..kVVVVVVVVVVk..', 15: '...kkkkkkkkkk...' }),
  skeleton: grid({ 1: '......kkkk......', 2: '.....kooook.....', 3: '....kooooook....', 4: '....kokookok....', 5: '....kooOOook....', 6: '.....kokkok.....', 7: '......kook......',
    8: '...kooooooook...', 9: '..kokokOOkokok..', 10: '..kokokOOkokok..', 11: '..kokkkookkkok..', 12: '..kk.kOooOk.kk..', 13: '.....kok.kok....', 14: '.....kok.kok....', 15: '....kook.kook...' }),
  // goblins
  g_scrapper: over(GOBLIN, grid({ 5: '.............k..', 6: '............kmk.', 7: '............kmk.', 8: '............kmk.', 9: '...........kWWk.' })),
  g_slinger: over(GOBLIN, grid({ 3: '.....kRRRRk.....', 7: '.............k..', 8: '............kOk.', 9: '............kOk.', 10: '...........kGGk.' })),
  g_sapper: over(GOBLIN, grid({ 2: '......kkkk......', 3: '.....kLLLLk.....', 7: '..z.............', 8: '..kk............', 9: '.kDDk...........', 10: 'kDDDDk..........', 11: 'kDDDDk..........', 12: '.kkkk...........' })),
  g_shaman: over(GOBLIN, grid({ 0: '.......R........', 1: '......kRk.......', 2: '.....kaaaak.....', 3: '....kaaaaaak....', 4: '.kk.kaggggak.kk.', 8: '....kaaaaaak....', 9: '...kgkaAaakgk...', 10: '...kgkaaaakgk...', 11: '....kkaaaakk....' }),
    grid({ 3: '.............kk.', 4: '............kook', 5: '............kkok', 6: '.............kWk', 7: '.............kWk', 8: '.............kWk', 9: '.............kWk', 10: '.............kWk', 11: '.............kWk', 12: '.............kWk', 13: '.............kk.' })),
  g_hob: [grid({ 1: '.....kkkkkk.....', 2: '.kk.kggggggk.kk.', 3: '..kkgYggggYgkk..', 4: '....kggggggk....', 5: '....kgkwwkgk....', 6: '..kkkkggggkkkk..', 7: '.kggkLLLLLLkggk.',
    8: '.kggkLlLLlLkggk.', 9: '.kggkLLLLLLkggk.', 10: '.kgk.kLLLLk.kgk.', 11: '..k..kddddk..k..', 12: '.....kddddk.....', 13: '....kddkkddk....', 14: '....kddk.kddk...', 15: '....kkk...kkk...' }), { g: '8a8a3a', d: '5a5a22' }],
  g_rider: grid({ 1: '........kkk.....', 2: '.......kgggk....', 3: '......kkgYgk....', 4: '.......kkLkk....', 5: '...kkkkkLLkkk...', 6: '..kXXXXXXXXXXk..', 7: '.kXxXXXXXXXXXXk.',
    8: 'kwXXXXXXXXXXXXk.', 9: 'kXeXXXXXXXXXXXk.', 10: '.kXXXXXXXXXXXk..', 11: '..kXk..kXk.kXk..', 12: '..kk...kk..kk...' }),
  // rat folk
  r_swarm: grid({ 3: '.kk......kk.....', 4: 'kxxxkk..kxxxkk..', 5: 'pexxxxk.pexxxxk.', 6: '.kkkkk.p.kkkkk.p', 9: '....kk..........', 10: '...kxxxkk.......', 11: '...pexxxxk......', 12: '....kkkkk.p.....' }),
  r_skulker: [over(RATKIN, grid({ 1: '...kkkkkkk......', 2: '..kNNNNNNNk.....', 3: '..kNkxxxkNk.....', 8: '....kNNNNNNk....', 9: '...kxkNNNNkxk...', 10: '...kxkNNNNkxk...' }), grid({ 8: '.............k..', 9: '............kMk.', 10: '...........kYYk.' }))],
  r_blowgun: over(RATKIN, grid({ 6: '..........kkkkk.', 7: '.....kxpxWWWWWk.', 8: '..........kkkkk.' })),
  r_plague: [over(RATKIN, grid({ 8: '....kXvXXvXk....', 10: '...kxkXvXXkxk...' })), { X: '5f7040', x: '9a8a6a' }],
  r_warlock: [over(RATKIN, grid({ 0: '...........kAk..', 1: '..........kAAAk.', 2: '...........kAk..', 3: '............W...', 4: '............W...', 5: '............W...', 6: '............W...' })), { X: '5a3290' }],
  r_ogre: grid({ 0: '...kk......kk...', 1: '..kxxk....kxxk..', 2: '..kxxxkkkkxxxk..', 3: '...kxexxxxexk...', 4: '...kxxxxxxxxk...', 5: '....kxxppxxk....', 6: '..kkkkwkkwkkkk..', 7: '.kxxxxxxxxxxxxk.',
    8: 'kxxkxXXXXXXxkxxk', 9: 'kxxkxXXXXXXxkxxk', 10: 'kppkXXXXXXXXkppk', 11: '.kk.kXXXXXXk.kk.', 12: '....kxxkkxxk....', 13: '....kxxkkxxk....', 14: '...kppk..kppk...', 15: '...kkk....kkk...' }),
  // Hollowfolk
  h_stalker: [over(HOLLOW, grid({ 8: '.............k..', 9: '............kMk.', 10: '...........kYYk.' })), { q: '9aa0b5', Q: '6a7088', c: 'e0e4f0' }],
  h_fisher: over(HOLLOW, H_SPEAR),
  h_seer: [over(HOLLOW, grid({ 5: '..kqwwkqkwwqk...', 8: '....kaaaaak.....', 9: '...kakaaakak....', 10: '...kqkaaakqk....', 11: '..kqk.kaak.kqk..', 12: '..kk.kaaaak.kk..', 13: '....kaaaaaak....', 14: '....kkkkkkkk....' }), H_STAFF), { b: 'b8c4dc', c: 'ffffff', W: '6a7088' }],
  h_thrall: [over(HOLLOW, grid({ 9: '....kqkGkqk.....', 10: '...kqkGGGkqk....', 11: '..kqk.kGGk.kqk..' })), { c: 'ff4a3d', l: '5a5a5a' }],
  h_hound: grid({ 6: '..kk............', 7: '.kqqk....kkkkk..', 8: 'kqqqqkkkkqqqqqkk', 9: 'kqqqqqqqqqqqqqk.', 10: 'wkqqqqqqqqqqqqk.', 11: '.kkQqqqqqqqqQk..', 12: '...kqk....kqk...', 13: '...kQk....kQk...', 14: '...kk.....kk....' }),
  h_crawler: [grid({ 6: '..k.k.k.k.k.k...', 7: '..kkkkkkkkkkk...', 8: '.kuUuUuUuUuUuk..', 9: 'kUeuUuUuUuUuUuk.', 10: '.kuUuUuUuUuUuk..', 11: '..kkkkkkkkkkk...', 12: '..k.k.k.k.k.k...' }), { u: 'b8a0c8', U: '8a70a0' }],
  // serpent people
  s_warrior: over(SERPENT, grid({ 8: '...kkMMMMkk.....', 9: '..kjkMmmMkjk....', 10: '..kjkMMMMkjk....' }), H_SPEAR),
  s_spitter: [over(SERPENT, grid({ 7: '.....kjjkv......', 8: '........v.......' })), { j: '6fae4a', J: '3f7a2a' }],
  s_guard: [over(SERPENT, grid({ 1: '.....kkkk.......', 2: '....kYYYYk......', 3: '...kYYYYYYk.....', 8: '...kkMMMMkk.....', 9: '..kjkMmmMkjk....', 10: '..kjkMMMMkjk....' }), L_SHIELDH, H_SPEAR), { 1: 'e3b93c', 3: '3f8f7a' }],
  s_priest: [over(SERPENT, grid({ 1: '....kkkkkk......', 2: '...kaaaaaak.....', 3: '...kajfjjak.....', 8: '...kkaaaakk.....', 9: '..kjkaAaakjk....', 10: '..kjkaaaakjk....', 11: '..kjk.kaak.kjk..' }), H_STAFF), { b: '3faa4a', c: 'a6e39a' }],
  s_constrictor: grid({ 4: '......kkkk......', 5: '.....kjjjjk.....', 6: '....kjYjjYjk....', 7: '.....kjjjjk.R...', 8: '...kkkkjjkkkk...', 9: '..kjjjjjjjjjjk..', 10: '.kjfJjJjJjJjfjk.', 11: '.kjjjjkkkkjjjjk.', 12: '.kjfJjJjJjJjfjk.', 13: '..kjjjjjjjjjjk..', 14: '...kkkkkkkkkk...' }),
  s_basilisk: grid({ 5: '....k.k.k.......', 6: '...kJkJkJk......', 7: '..kjjjjjjjk.....', 8: '.kjYjjjjjjjkkkk.', 9: 'kjjjjjjjjjjjjjjk', 10: 'kRjjfffffjjjjjjk', 11: '.kjk.kjjjk.kjkk.', 12: '.kk..kk.kk..kk..' }),
  // bosses
  grotsnag: [over(GOBLIN, CROWN, grid({ 8: '...kRRRRRRRRk...', 9: '..kRgkLlLLkgRk..', 10: '..kRgkLLLLkgRk..', 11: '..kRkkLLLLkkRk..' }), H_AXE), { g: '4f8a2a', M: 'c9c9c9' }],
  vesk: [over(RATKIN, CROWN, grid({ 8: '...kRRRRRRRk....', 9: '..kRxkRRRRkxRk..', 10: '..kRxkRRRRkxRk..', 11: '..kRpkRRRRkpRk..', 12: '...kRkRRRRkRk...', 13: '...kkkkkkkkkk...' })), { x: 'cdbfb0', X: 'b9343c', e: 'ffd23f' }],
  matriarch: [over(HOLLOW, grid({ 0: '...k.k.k.k.k....', 1: '...kokokokok....', 2: '...kooooooook...' }), grid({ 8: '....kaaaaak.....', 9: '...kakaaakak....', 10: '...kqkaAakqk....', 11: '..kqk.kaak.kqk..', 12: '..kk.kaaaak.kk..', 13: '....kaaaaaak....', 14: '...kaaaaaaaak...', 15: '...kkkkkkkkkk...' }), H_STAFF), { c: 'ffffff', b: 'b8c4dc' }],
  hierophant: [over(SERPENT, CROWN, grid({ 8: '...kkRRRRkk.....', 9: '..kjkRYRRkjk....', 10: '..kjkRRRRkjk....', 11: '..kjk.kRRk.kjk..' }), H_STAFF), { j: '2f6f5a', b: 'b9343c', c: 'f08a8f' }],
  wyrm: grid({ 0: '..k.........k...', 1: '..kk.......kk...', 2: '...kRk...kRk....', 3: '...kRRkkkRRk....', 4: '..kRRRRRRRRRk...', 5: '..kRYkRRRkYRk...', 6: '..kRRRRRRRRRk...', 7: '...kRrRRRrRk....',
    8: 'kk..kRwRwRk..kk.', 9: 'kRk..kRRRk..kRk.', 10: 'kRRk.kRRRk.kRRk.', 11: 'kRRRkRRYRRkRRRk.', 12: '.kRRRRRYRRRRRk..', 13: '..kkRRRRRRRkk...', 14: '....kRRkRRk.....', 15: '....kkk.kkk.....' }),
};

// ================= town, land & props =================
const PROPS = {
  oak: grid({ 1: '.....kkkkk......', 2: '...kkgggggkk....', 3: '..kgggggdgggk...', 4: '.kggdgggggggdk..', 5: '.kgggggdgggggk..', 6: 'kggdggggggdgggk.', 7: 'kgggggdggggggk..', 8: '.kggggggggdgk...', 9: '..kkgggdgggkk...', 10: '....kkkWkkk.....', 11: '......kWk.......', 12: '......kWk.......', 13: '.....kWWWk......', 14: '....kkkkkkk.....' }),
  pine: grid({ 0: '.......kk.......', 1: '......kddk......', 2: '.....kdggdk.....', 3: '....kdggggdk....', 4: '.....kdggdk.....', 5: '....kdggggdk....', 6: '...kdggggggdk...', 7: '.....kdggdk.....', 8: '....kdggggdk....', 9: '...kdggggggdk...', 10: '..kdggggggggdk..', 11: '..kkkkkWWkkkkk..', 12: '......kWWk......', 13: '......kWWk......', 14: '.....kkkkkk.....' }),
  stump: grid({ 10: '.....kkkkkk.....', 11: '....kWZWWZWk....', 12: '....kWWWWWWk....', 13: '....kZWWWWZk....', 14: '...kkkkkkkkkk...' }),
  rock: grid({ 6: '......kkkk......', 7: '....kkFFFFkk....', 8: '...kFFFFGFFFk...', 9: '..kFFGFFFFFGFk..', 10: '..kGFFFFGFFFGk..', 11: '.kGGFFFFFFFGGGk.', 12: '.kGGGGGGGGGGGDk.', 13: '..kDDDGGGGDDDk..', 14: '...kkkkkkkkkk...' }),
  rubble: grid({ 12: '....kk...kk.....', 13: '...kGFk.kFGk.kk.', 14: '...kkkk.kkkk.kk.' }),
  herb: grid({ 8: '......k..k......', 9: '.....kgkkgk.....', 10: '...k.kgddgk.k...', 11: '..kgkkgdgdkkgk..', 12: '..kggkgddgkggk..', 13: '...kgggddgggk...', 14: '....kkkkkkkk....' }),
  sprout: grid({ 11: '......k.k.......', 12: '.....kgkgk......', 13: '......kgk.......', 14: '.....kkkkk......' }),
  fountain: grid({ 3: '.......kk.......', 4: '......kcck......', 5: '......kbbk......', 6: '.....kc..ck.....', 7: '....kkkFFkkk....', 8: '...kFFFFFFFFk...', 9: '..kFccccccccFk..', 10: '..kFcbbbbbbcFk..', 11: '..kFcbbbbbbcFk..', 12: '..kGFFFFFFFFGk..', 13: '...kGGGGGGGGk...', 14: '....kkkkkkkk....' }),
  board: grid({ 2: '..kkkkkkkkkkkk..', 3: '..kWWWWWWWWWWk..', 4: '..kWwwwkWwwwWk..', 5: '..kWwkwkWwkwWk..', 6: '..kWwwwkWwwwWk..', 7: '..kWWwwwWWWWWk..', 8: '..kWWwkwWWWWWk..', 9: '..kWWWWWWWWWWk..', 10: '..kkkkkkkkkkkk..', 11: '....kWk..kWk....', 12: '....kWk..kWk....', 13: '....kWk..kWk....', 14: '...kkkk..kkkk...' }),
  sign: grid({ 3: '..kkkkkkkkkk....', 4: '..kWWWWWWWWWk...', 5: '..kWkkWkkWWWWk..', 6: '..kWWWWWWWWWk...', 7: '..kkkkkWkkkk....', 8: '......kWk.......', 9: '......kWk.......', 10: '......kWk.......', 11: '......kWk.......', 12: '......kWk.......', 13: '......kWk.......', 14: '.....kkkkk......' }),
  cottage: grid({ 1: '.......kk.......', 2: '......kRRk......', 3: '.....kRRRRk.....', 4: '....kRrRRrRk....', 5: '...kRRRRRRRRk...', 6: '..kRrRRRRRRrRk..', 7: '.kkkkkkkkkkkkkk.', 8: '..kFFFFFFFFFFk..', 9: '..kFbbkFFkbbFk..', 10: '..kFbbkFFkbbFk..', 11: '..kFFFFkkFFFFk..', 12: '..kFFFFkWkFFFk..', 13: '..kFFFFkWkFFFk..', 14: '..kkkkkkkkkkkk..' }),
  garden: grid({ 9: '..k.k.k.k.k.k...', 10: '.kgkgkgkgkgkgk..', 11: 'kWWWWWWWWWWWWWWk', 12: '.kgkRkgkRkgkRk..', 13: 'kWWWWWWWWWWWWWWk', 14: '.kkkkkkkkkkkkkk.' }),
  gardenGrowing: grid({ 10: '..k...k...k.....', 11: 'kWWWWWWWWWWWWWWk', 12: '.....k...k...k..', 13: 'kWWWWWWWWWWWWWWk', 14: '.kkkkkkkkkkkkkk.' }),
  forge: grid({ 3: '...........kk...', 4: '..........kDDk..', 5: '..........kDDk..', 6: '..kkkkkkkkkDDkk.', 7: '.kGGGGGGGGGGGGGk', 8: '.kGkkkkkGGGGGGGk', 9: '.kGkzYzkGkMMMkGk', 10: '.kGkzzzkGGkMkGGk', 11: '.kGkkkkkGkMMMkGk', 12: '.kDDDDDDDDDDDDDk', 13: '.kkkkkkkkkkkkkkk' }),
  bench: grid({ 5: '....k.....kk....', 6: '...kck...kbbk...', 7: '...kck..kbccbk..', 8: '..kcbck.kbbbbk..', 9: '..kbbbk..kkkk...', 10: 'kkkkkkkkkkkkkkkk', 11: 'kWWWWWWWWWWWWWWk', 12: 'kkkkkkkkkkkkkkkk', 13: '.kWk........kWk.', 14: '.kWk........kWk.', 15: '.kkk........kkk.' }),
  altar: grid({ 2: '.......kk.......', 3: '......kAak......', 4: '.....kAAaak.....', 5: '......kaak......', 6: '.......kk.......', 8: '...kkkkkkkkkk...', 9: '...kFFFFFFFFk...', 10: '....kFaFFaFk....', 11: '....kFFFFFFk....', 12: '....kFaFFaFk....', 13: '...kGGGGGGGGk...', 14: '...kkkkkkkkkk...' }),
  mine: grid({ 4: '..kkkkkkkkkkkk..', 5: '..kWWWWWWWWWWk..', 6: '..kWkkkkkkkkWk..', 7: '..kWkkkkkkkkWk..', 8: '..kWkkkkkkkkWk..', 9: '..kWkkkkkkkkWk..', 10: '..kWkkkkkkkkWk..', 11: '..kWkkkkkkkkWk..', 12: '..kWkkkkkkkkWk..', 13: '..kWkkkkkkkkWk..', 14: '.kkkkkkkkkkkkkk.' }),
  coins: grid({ 9: '...kkkk.........', 10: '..kYYYYk..kkkk..', 11: '..kyyyyk.kYYYYk.', 12: '..kkkkkk.kyyyyk.', 13: '..kYYYYk.kkkkkk.', 14: '..kyyyyk.kyyyyk.', 15: '..kkkkkk.kkkkkk.' }),
  body: grid({ 10: '..kkk...........', 11: '.kHSkkkNNNNNNkk.', 12: '.kHSSkNNNNNNNNNk', 13: '..kkkkNNNNNNkkk.', 14: '......kkkkkk.kYk' }),
  dog: grid({ 7: '.kk.............', 8: 'kLLk.........k..', 9: 'kLeLkkkkkkkkkLk.', 10: 'kkLLLLLLLLLLLk..', 11: '.kLLLLLLLLLLLk..', 12: '..kLk....kLk....', 13: '..kLk....kLk....', 14: '..kk.....kk.....' }),
  chicken: grid({ 6: '......kRk.......', 7: '.....kwwwk......', 8: '....kwkwwk......', 9: '...kYkwwwwkk....', 10: '....kwwwwwwwk...', 11: '....kwwwwwwk....', 12: '.....kwwwwk.....', 13: '......kY.Yk.....', 14: '.....kk...kk....' }),
};

// ================= items & materials =================
const ICONS = {
  i_dagger: grid({ 5: '.........kk.....', 6: '........kMMk....', 7: '.......kMmk.....', 8: '......kMmk......', 9: '..kk.kMmk.......', 10: '..kYkMmk........', 11: '...kYYk.........', 12: '...kWkYk........', 13: '..kWk.kk........', 14: '..kk............' }),
  i_sword: grid({ 1: '.............kk.', 2: '............kMMk', 3: '...........kMmk.', 4: '..........kMmk..', 5: '.........kMmk...', 6: '........kMmk....', 7: '.......kMmk.....', 8: '..kk..kMmk......', 9: '..kYkkMmk.......', 10: '...kYYmk........', 11: '....kYYk........', 12: '...kWkkYk.......', 13: '..kWk..kk.......', 14: '.kYk............', 15: '..k.............' }),
  i_axe: grid({ 1: '..........kkk...', 2: '.........kMMMk..', 3: '........kMMMMMk.', 4: '........kmMkMMMk', 5: '.........kWkkMmk', 6: '........kWk..kmk', 7: '.......kWk....k.', 8: '......kWk.......', 9: '.....kWk........', 10: '....kWk.........', 11: '...kWk..........', 12: '..kWk...........', 13: '.kWk............', 14: '.kk.............' }),
  i_mace: grid({ 1: '...........k.k..', 2: '..........kMkMk.', 3: '.........kMMMMMk', 4: '..........kMmMk.', 5: '.........kWkMMMk', 6: '........kWk.kk..', 7: '.......kWk......', 8: '......kWk.......', 9: '.....kWk........', 10: '....kWk.........', 11: '...kWk..........', 12: '..kWk...........', 13: '.kYk............', 14: '.kk.............' }),
  i_spear: grid({ 0: '..............kk', 1: '.............kMk', 2: '............kMMk', 3: '...........kMmk.', 4: '..........kYkk..', 5: '.........kWk....', 6: '........kWk.....', 7: '.......kWk......', 8: '......kWk.......', 9: '.....kWk........', 10: '....kWk.........', 11: '...kWk..........', 12: '..kWk...........', 13: '.kWk............', 14: '.kk.............' }),
  i_bow: grid({ 1: '....kk..........', 2: '....OkWk........', 3: '....O..kWk......', 4: '....O...kWk.....', 5: '....O....kWk....', 6: '....O....kWk....', 7: '....O.....kWk...', 8: '....O.....kWk...', 9: '....O....kWk....', 10: '....O....kWk....', 11: '....O...kWk.....', 12: '....O..kWk......', 13: '....OkWk........', 14: '....kk..........' }),
  i_staff: grid({ 0: '............kk..', 1: '...........kcbk.', 2: '..........kcbbk.', 3: '...........kbk..', 4: '..........kWk...', 5: '.........kWk....', 6: '........kWk.....', 7: '.......kWk......', 8: '......kWk.......', 9: '.....kWk........', 10: '....kWk.........', 11: '...kWk..........', 12: '..kWk...........', 13: '.kWk............', 14: '.kk.............' }),
  i_torso: grid({ 3: '...kkkk..kkkk...', 4: '..k1111kk1111k..', 5: '.k111111111111k.', 6: '.k12k111111k21k.', 7: '.k12k111111k21k.', 8: '..kk.k1111k.kk..', 9: '.....k1211k.....', 10: '.....k1331k.....', 11: '.....k1111k.....', 12: '.....k1111k.....', 13: '.....kkkkkk.....' }),
  i_mail: grid({ 3: '...kkkk..kkkk...', 4: '..k1212kk2121k..', 5: '.k121212121212k.', 6: '.k21k212121k12k.', 7: '.k12k121212k21k.', 8: '..kk.k2121k.kk..', 9: '.....k1212k.....', 10: '.....k3333k.....', 11: '.....k1212k.....', 12: '.....k2121k.....', 13: '.....kkkkkk.....' }),
  i_plate: grid({ 2: '..kkk......kkk..', 3: '.k111kkkkkk111k.', 4: '.k1211111111121k', 5: '.k111111111111k.', 6: '.k12k112211k21k.', 7: '..kkk111111kkk..', 8: '.....k1221k.....', 9: '.....k1111k.....', 10: '.....k3333k.....', 11: '.....k1111k.....', 12: '.....k2222k.....', 13: '.....kkkkkk.....' }),
  i_robe: grid({ 2: '......kkkk......', 3: '.....k1111k.....', 4: '...kk111111kk...', 5: '..k1111111111k..', 6: '.k12k111111k21k.', 7: '.k12k111111k21k.', 8: '..kk.k1331k.kk..', 9: '.....k1111k.....', 10: '....k111111k....', 11: '....k121121k....', 12: '...k12111121k...', 13: '...k33333333k...', 14: '...kkkkkkkkkk...' }),
  i_shieldl: grid({ 3: '......kkkk......', 4: '....kk1111kk....', 5: '...k11122111k...', 6: '..k1112332111k..', 7: '..k1123333211k..', 8: '..k1123333211k..', 9: '..k1112332111k..', 10: '...k11122111k...', 11: '....kk1111kk....', 12: '......kkkk......' }),
  i_shieldh: grid({ 1: '...kkkkkkkkkk...', 2: '...k11111111k...', 3: '...k12222221k...', 4: '...k12233221k...', 5: '...k12333321k...', 6: '...k12233221k...', 7: '...k12233221k...', 8: '...k12222221k...', 9: '...k11111111k...', 10: '....k111111k....', 11: '.....k1111k.....', 12: '......kkkk......' }),
  i_helm: grid({ 4: '.....kkkkkk.....', 5: '....k111111k....', 6: '...k11111111k...', 7: '...k12111121k...', 8: '...k1kkkkkk1k...', 9: '...k1k....k1k...', 10: '...k1k....k1k...', 11: '...kkk....kkk...' }),
  i_cap: grid({ 5: '.....kkkkkk.....', 6: '....k111111k....', 7: '...k11211211k...', 8: '...k11111111k...', 9: '..kkkkkkkkkkkk..' }),
  i_boots: grid({ 4: '...kkkk..kkkk...', 5: '...k11k..k11k...', 6: '...k11k..k11k...', 7: '...k12k..k12k...', 8: '...k12k..k12k...', 9: '..k1112k.k1112k.', 10: '..k3333k.k3333k.', 11: '..kkkkkk.kkkkkk.' }),
  potion: grid({ 3: '......kkkk......', 4: '......kWWk......', 5: '......kwwk......', 6: '.....kkwwkk.....', 7: '....kbcbbbbk....', 8: '...kbcbbbbbbk...', 9: '...kbcbbbbbbk...', 10: '...kbbbbbbbbk...', 11: '...kbbbbbbbbk...', 12: '....kbbbbbbk....', 13: '.....kkkkkk.....' }),
  ring: grid({ 4: '.......kk.......', 5: '......kRRk......', 6: '.....kYRRYk.....', 7: '....kYykkyYk....', 8: '...kYk....kYk...', 9: '...kYk....kYk...', 10: '...kyk....kyk...', 11: '....kyYkkYyk....', 12: '.....kkyykk.....' }),
  amulet: grid({ 2: '...kY.....Yk....', 3: '....kY...Yk.....', 4: '.....kY.Yk......', 5: '......kYk.......', 6: '.....kkYkk......', 7: '....kYbbbYk.....', 8: '....kbcbbbk.....', 9: '....kbbbbbk.....', 10: '.....kbbbk......', 11: '......kkk.......' }),
  scroll: grid({ 4: '...kkkkkkkkk....', 5: '..kOwwwwwwwOk...', 6: '...kwkkkkkwk....', 7: '...kwwwwwwwk....', 8: '...kwkkkkwwk....', 9: '...kwwwwwwwk....', 10: '...kwkkkkkwk....', 11: '..kOwwwwwRwOk...', 12: '...kkkkkkkkk....' }),
  book: grid({ 3: '...kkkkkkkkk....', 4: '..kbbbbbbbbbk...', 5: '..kbYbbbbbbbk...', 6: '..kbYbbYYbbbk...', 7: '..kbYbYbbYbbk...', 8: '..kbYbbYYbbbk...', 9: '..kbYbbbbbbbk...', 10: '..kbYbbbbbbbk...', 11: '..kkwwwwwwwwk...', 12: '...kkkkkkkkkk...' }),
  arrows: grid({ 2: '.....k..k..k....', 3: '....kMkkMkkMk...', 4: '.....W..W..W....', 5: '.....W..W..W....', 6: '.....W..W..W....', 7: '.....W..W..W....', 8: '...kLLLLLLLLLk..', 9: '.....W..W..W....', 10: '.....W..W..W....', 11: '.....W..W..W....', 12: '....kRkkRkkRk...', 13: '....kRkkRkkRk...', 14: '.....k..k..k....' }),
  woodaxe: [null, 'i_axe', { M: 'a0a8b0', m: '707880' }],
  pickaxe: grid({ 2: '..kkk.....kkk...', 3: '.kMmkkkkkkkkmMk.', 4: '..kMMMMMMMMMMk..', 5: '...kkkkWkkkkk...', 6: '......kWk.......', 7: '......kWk.......', 8: '......kWk.......', 9: '......kWk.......', 10: '......kWk.......', 11: '......kWk.......', 12: '......kWk.......', 13: '......kWk.......', 14: '......kkk.......' }),
  sickle: grid({ 2: '.......kkkk.....', 3: '.....kkMMMMk....', 4: '....kMMkkkkMk...', 5: '...kMk.....kMk..', 6: '...kMk......kk..', 7: '...kMk..........', 8: '....kMk.........', 9: '.....kMMk.......', 10: '......kkkWk.....', 11: '........kWk.....', 12: '........kWk.....', 13: '........kkk.....' }),
  backpack: grid({ 2: '......kkkk......', 3: '.....kLkkLk.....', 4: '....kkkkkkkk....', 5: '...kLLLLLLLLk...', 6: '...kLllllllLk...', 7: '...kLLLLLLLLk...', 8: '...kLLLYYLLLk...', 9: '...kLLLLLLLLk...', 10: '...kLlLLLLlLk...', 11: '...kLLLLLLLLk...', 12: '...kkkkkkkkkk...' }),
  seal: grid({ 4: '.....kkkkk......', 5: '....kYYYYYk.....', 6: '...kYyRRRyYk....', 7: '...kYRRwRRYk....', 8: '...kYRRRRRYk....', 9: '...kYyRRRyYk....', 10: '....kYYYYYk.....', 11: '.....kkkkk......' }),
  heart: grid({ 4: '...kkk...kkk....', 5: '..kRRRk.kRRRk...', 6: '.kRRzRRkRRRRRk..', 7: '.kRzzRRRRRRRRk..', 8: '.kRRRRRRRRRRRk..', 9: '..kRRRRRRRRRk...', 10: '...kRRRRRRRk....', 11: '....kRRRRRk.....', 12: '.....kRRRk......', 13: '......kRk.......', 14: '.......k........' }),
  // materials
  log: grid({ 6: '....kkkkkkkkk...', 7: '...kWWWWWWWWkZk.', 8: '..kZWWZWWWWWkZWZk', 9: '..kWWWWWWZWWkWZWk', 10: '..kWWZWWWWWWkZWZk', 11: '...kWWWWWWWWkZk.', 12: '....kkkkkkkkk...' }),
  pebbles: grid({ 8: '.....kkk........', 9: '....kFFGk..kkk..', 10: '...kFFFGGkkFFGk.', 11: '...kGGGGDkFFGGk.', 12: '..kkkkkkkkkGGDk.', 13: '..kFFGk..kkkkk..', 14: '..kkkkk.........' }),
  ore: grid({ 5: '......kkkk......', 6: '....kk1113kk....', 7: '...k11113111k...', 8: '..k1311111131k..', 9: '..k1111211111k..', 10: '..k1131111311k..', 11: '..k2211113122k..', 12: '...k22222222k...', 13: '....kkkkkkkk....' }),
  hide: grid({ 4: '..kk........kk..', 5: '..kLkkkkkkkkLk..', 6: '...kLLLLLLLLk...', 7: '...kLlLLLLlLk...', 8: '..kLLLLLLLLLLk..', 9: '..kLLLlLLlLLLk..', 10: '...kLLLLLLLLk...', 11: '..kLkkkkkkkkLk..', 12: '..kk........kk..' }),
  silk: grid({ 3: 'k......k......k.', 4: '.k.....k.....k..', 5: '..k..kkkkk..k...', 6: '...kk..k..kk....', 7: '...k.k.k.k.k....', 8: 'kkkkkkkkkkkkkkk.', 9: '...k.k.k.k.k....', 10: '...kk..k..kk....', 11: '..k..kkkkk..k...', 12: '.k.....k.....k..', 13: 'k......k......k.' }),
  bone: grid({ 4: '..kk............', 5: '.kook...........', 6: '.koook..........', 7: '..kkook.........', 8: '.....kook.......', 9: '......kook......', 10: '.......kookk....', 11: '........koooo k.', 12: '.........kooook.', 13: '..........kook..', 14: '...........kk...' }),
  gel: grid({ 8: '......kkkk......', 9: '....kkviivkk....', 10: '...kviivvvvvk...', 11: '...kvvvvvvvvk...', 12: '...kVvvvvvvVk...', 13: '....kkkkkkkk....' }),
  mushroom: grid({ 4: '.....kkkkkk.....', 5: '...kkRRwRRRkk...', 6: '..kRRwRRRRwRRk..', 7: '..kRRRRRRRRRRk..', 8: '..kkkkkkkkkkkk..', 9: '......kwwk......', 10: '......kwwk......', 11: '......kwwk......', 12: '.....kkkkkk.....' }),
  leaf: grid({ 3: '..........kkk...', 4: '........kkgggk..', 5: '......kkggggdk..', 6: '.....kgggggdgk..', 7: '....kgggggdggk..', 8: '...kgggddgggk...', 9: '...kggdgggkk....', 10: '..kgddggkk......', 11: '..kdkkkk........', 12: '.kdk............', 13: '.kk.............' }),
  flower: grid({ 3: '......kkk.......', 4: '.....kAAAk......', 5: '..kk.kAwAk.kk...', 6: '.kAAkkAAAkkAAk..', 7: '.kAwAAkYkAAwAk..', 8: '..kkAAYYYAAkk...', 9: '...kAAkYkAAk....', 10: '...kAwAkAwAk....', 11: '....kkk.kkk.....', 12: '.......g........', 13: '.......g........' }),
  crystal: grid({ 2: '.......kk.......', 3: '......k31k......', 4: '.....k3112k.....', 5: '.....k3112k.....', 6: '....k311122k....', 7: '....k311122k....', 8: '....k311122k....', 9: '.....k3122k.....', 10: '.....k3122k.....', 11: '......k12k......', 12: '.......kk.......' }),
};
// fix rows that drifted past 16 columns
ICONS.log = grid({ 6: '....kkkkkkkkk...', 7: '...kWWWWWWWWkZk.', 8: '..kZWWZWWWWWkZWk', 9: '..kWWWWWWZWWkWZk', 10: '..kWWZWWWWWWkZWk', 11: '...kWWWWWWWWkZk.', 12: '....kkkkkkkkk...' });
ICONS.bone = grid({ 4: '..kk............', 5: '.kook...........', 6: '.koook..........', 7: '..kkook.........', 8: '.....kook.......', 9: '......kook......', 10: '.......kookk....', 11: '........koooo...', 12: '.........kooook.', 13: '..........kook..', 14: '...........kk...' });

const WEAPON_ICON = { dagger: 'i_dagger', sword: 'i_sword', axe: 'i_axe', mace: 'i_mace', spear: 'i_spear', bow: 'i_bow', staff: 'i_staff' };
const ARMOR_ICON = { robe: 'i_robe', leather: 'i_torso', mail: 'i_mail', plate: 'i_plate', shieldl: 'i_shieldl', shieldh: 'i_shieldh', boots: 'i_boots' };
const ARMOR_LAYER = { robe: L_ROBE, leather: L_LEATHER, mail: L_MAIL, plate: L_PLATE };

// ================= town decor, lights =================
Object.assign(PROPS, {
  barrel: grid({ 3: '.....kkkkkk.....', 4: '....kWWWWWWk....', 5: '...kZWWWWWWZk...', 6: '...kmmmmmmmmk...', 7: '...kWWWWWWWWk...', 8: '...kZWWWWWWZk...', 9: '...kWWWWWWWWk...', 10: '...kmmmmmmmmk...', 11: '...kZWWWWWWZk...', 12: '....kWWWWWWk....', 13: '.....kkkkkk.....' }),
  crate: grid({ 4: '...kkkkkkkkkk...', 5: '...kWZWWWWZWk...', 6: '...kZWZWWZWZk...', 7: '...kWWZWWZWWk...', 8: '...kWWWZZWWWk...', 9: '...kWWWZZWWWk...', 10: '...kWWZWWZWWk...', 11: '...kZWZWWZWZk...', 12: '...kWZWWWWZWk...', 13: '...kkkkkkkkkk...' }),
  well: grid({ 2: '...kkkkkkkkkk...', 3: '..kRRRRRRRRRRk..', 4: '.kRrRrRrRrRrRrk.', 5: '..kkkkkkkkkkkk..', 6: '...kW......Wk...', 7: '...kW..kk..Wk...', 8: '...kW..kWk.Wk...', 9: '..kkFFFFFFFFkk..', 10: '.kFFGFFFGFFFGFk.', 11: '.kFbbbbbbbbbbFk.', 12: '.kGFFFGFFFGFFFk.', 13: '..kkkkkkkkkkkk..' }),
  lamppost: grid({ 1: '......kkkk......', 2: '.....kYYYYk.....', 3: '.....kYwwYk.....', 4: '.....kYYYYk.....', 5: '......kkkk......', 6: '.......kk.......', 7: '.......kk.......', 8: '.......kk.......', 9: '.......kk.......', 10: '.......kk.......', 11: '.......kk.......', 12: '.......kk.......', 13: '.......kk.......', 14: '......kkkk......', 15: '.....kkkkkk.....' }),
  stallR: grid({ 2: '.kkkkkkkkkkkkkk.', 3: '.kRwRwRwRwRwRwk.', 4: '.kRwRwRwRwRwRwk.', 5: 'kRwRwRwRwRwRwRwk', 6: 'kkkkkkkkkkkkkkkk', 7: '.kW..........Wk.', 8: '.kW..........Wk.', 9: '.kW..........Wk.', 10: 'kkkkkkkkkkkkkkkk', 11: 'kWWWzWgWWYWRWWWk', 12: 'kWWWWWWWWWWWWWWk', 13: 'kkkkkkkkkkkkkkkk', 14: '.kk..........kk.' }),
  bench: grid({ 9: '..kkkkkkkkkkkk..', 10: '..kWWWWWWWWWWk..', 11: '..kkkkkkkkkkkk..', 12: '..kWk......kWk..', 13: '..kk........kk..' }),
  hay: grid({ 5: '.....kkkkkk.....', 6: '...kkYYYYYYkk...', 7: '..kYYyYYYYyYYk..', 8: '.kYyYYYYyYYYYYk.', 9: '.kYYYYyYYYYyYYk.', 10: '.kYYyYYYYyYYYyk.', 11: '.kyYYYYyYYYYYyk.', 12: '..kyyyyyyyyyyk..', 13: '...kkkkkkkkkk...' }),
  cart: grid({ 6: '..kkkkkkkkkkkk..', 7: '..kWWWWWWWWWWk..', 8: '..kZWZWZWZWZWk..', 9: 'kkkWWWWWWWWWWkkk', 10: '..kkkkkkkkkkkk..', 11: '...kkk....kkk...', 12: '..kGkGk..kGkGk..', 13: '..kkGkk..kkGkk..', 14: '...kkk....kkk...' }),
  signInn: grid({ 1: '..kkkkkkkkkkkk..', 2: '..kWWWWWWWWWWk..', 3: '..kWk..k....k...', 4: '..kWk..k....k...', 5: '..kWk.kkkkkkkk..', 6: '..kWk.kYYYYYYk..', 7: '..kWk.kYzzYYYk..', 8: '..kWk.kYzzzzYk..', 9: '..kWk.kYYYYYYk..', 10: '..kWk.kkkkkkkk..', 11: '..kWk...........', 12: '..kWk...........', 13: '..kWk...........', 14: '.kkkkk..........' }),
  banner: grid({ 2: '....kkkkkkkk....', 3: '....kbbbbbbk....', 4: '....kbYYYYbk....', 5: '....kbYbbYbk....', 6: '....kbYYYYbk....', 7: '....kbbbbbbk....', 8: '....kbbbbbbk....', 9: '....kbbkkbbk....', 10: '....kbk..kbk....', 11: '....kk....kk....' }),
  flowers: grid({ 9: '...R...Y...A....', 10: '..RwR.YwY.AwA...', 11: '...R...Y...A....', 12: '..g.g.g.g.g.g...', 13: '.kWWWWWWWWWWWWk.', 14: '.kkkkkkkkkkkkkk.' }),
  pillar: grid({ 0: '....kkkkkkkk....', 1: '....kFFFFFFk....', 2: '.....kFFFFk.....', 3: '.....kFGFFk.....', 4: '.....kFGFFk.....', 5: '.....kFGFFk.....', 6: '.....kFGFFk.....', 7: '.....kFGFFk.....', 8: '.....kFGFFk.....', 9: '.....kFGFFk.....', 10: '.....kFGFFk.....', 11: '.....kFGFFk.....', 12: '.....kFGFFk.....', 13: '....kFFFFFFk....', 14: '....kGGGGGGk....', 15: '....kkkkkkkk....' }),
  ruin: grid({ 2: '...kk..kk.......', 3: '..kFFk.kFk......', 4: '..kFGFkkFFk.....', 5: '..kFFFFFFGFk....', 6: '..kGFFkkFFFk....', 7: '..kFFk..kFGk....', 8: '..kFFk..kFFk....', 9: '..kGFk..kFFk....', 10: '..kFFkkkkFGk....', 11: '..kFFFFFFFFk....', 12: '.kkGFFGFFFFkk...', 13: 'kFFkkkkkkkkFFk..', 14: 'kkk........kkk..' }),
  brazier: grid({ 3: '......z..z......', 4: '.....zYz.zz.....', 5: '....zYYzzYz.....', 6: '....zYwYYYz.....', 7: '...kzYYYYYzk....', 8: '..knnnnnnnnnk...', 9: '...knmmmmmnk....', 10: '....knnnnnk.....', 11: '.....kmmmk......', 12: '......kmk.......', 13: '.....kkkkk......', 14: '....knnnnnk.....', 15: '....kkkkkkk.....' }),
  torchpost: grid({ 2: '.......z........', 3: '......zYz.......', 4: '......zYYz......', 5: '.....zYwYz......', 6: '......zYz.......', 7: '......kWk.......', 8: '......kWk.......', 9: '......kWk.......', 10: '......kWk.......', 11: '......kWk.......', 12: '......kWk.......', 13: '.....kkWkk......', 14: '....kGGGGGk.....', 15: '....kkkkkkk.....' }),
});
Object.assign(PROPS, {
  furnace: grid({ 0: '......kkkk......', 1: '......kDDk......', 2: '......kDDk......', 3: '....kkkDDkkk....', 4: '...kGGGGGGGGk...', 5: '..kGFGGGGGGFGk..', 6: '..kGGkkkkkkGGk..', 7: '..kGkzYYYYzkGk..', 8: '..kGkzYwwYzkGk..', 9: '..kGkzzYYzzkGk..', 10: '..kGGkkkkkkGGk..', 11: '..kFGGGGGGGGFk..', 12: '..kGGFGGGGFGGk..', 13: '..kDDDDDDDDDDk..', 14: '..kkkkkkkkkkkk..' }),
  anvil: grid({ 7: '...kkkkkkkkkk...', 8: '.kkMMMMMMMMMMk..', 9: 'kmmmmmmmmmmmmk..', 10: '.kkkknnnnkkkk...', 11: '.....knnk.......', 12: '....knnnnk......', 13: '...kWWWWWWk.....', 14: '...kZWWWWZk.....', 15: '...kkkkkkkk.....' }),
  weaponrack: grid({ 2: '..k..k..k..k....', 3: '.kMkkMkkMkkMk...', 4: '.kMkkMkkMkkMk...', 5: '.kMkkMkkMkkMk...', 6: '.kMkkMkkMkkMk...', 7: 'kkkkkkkkkkkkkk..', 8: 'kWWWWWWWWWWWWk..', 9: 'kkYkkYkkYkkYkk..', 10: '.kWk......kWk...', 11: '.kWk......kWk...', 12: '.kWk......kWk...', 13: '.kkk......kkk...' }),
  grindstone: grid({ 5: '....kkkkkk......', 6: '...kFFFFFFk.....', 7: '..kFGGGGGGFk....', 8: '..kFGGkkGGFk.k..', 9: '..kFGGGGGGFkkWk.', 10: '...kFFFFFFk..kk.', 11: '....kkkkkk......', 12: '...kWk..kWk.....', 13: '..kWWk..kWWk....', 14: '..kkkk..kkkk....' }),
  armorstand: grid({ 1: '......kkkk......', 2: '.....kWWWWk.....', 3: '......kWWk......', 4: '....kkkkkkkk....', 5: '...kmMmMmMmMk...', 6: '..kMkMmMmMmkMk..', 7: '..kmkmMmMmMkmk..', 8: '....kMmMmMmk....', 9: '....kmMmMmMk....', 10: '.....kkkkkk.....', 11: '.......kk.......', 12: '.......kk.......', 13: '.....kkkkkk.....', 14: '....kWWWWWWk....', 15: '....kkkkkkkk....' }),
  shieldrack: grid({ 4: '..kkk.....kkk...', 5: '.kRRRk...kbbbk..', 6: 'kRRYRRk.kbbwbbk.', 7: 'kRYYYRk.kbwwwbk.', 8: 'kRRYRRk.kbbwbbk.', 9: '.kRRRk...kbbbk..', 10: '..kkk.....kkk...', 11: 'kkkkkkkkkkkkkkkk', 12: 'kWWWWWWWWWWWWWWk', 13: 'kkkkkkkkkkkkkkkk', 14: '.kWk........kWk.', 15: '.kkk........kkk.' }),
  sacks: grid({ 6: '...kk.....kk....', 7: '..kOOk...kOOk...', 8: '.kOffOk.kOffOk..', 9: 'kOffffOkOffffOk.', 10: 'kOffffOkOffffOk.', 11: 'kOOffOOkOOffOOk.', 12: '.kkkkkk.kkkkkk..' }),
  cauldron: grid({ 4: '....v..v........', 5: '....kkkkkkkk....', 6: '...kvViivVvVk...', 7: '..knnnnnnnnnnk..', 8: '..knmmmmmmmmnk..', 9: '..knmmmmmmmmnk..', 10: '...knmmmmmmnk...', 11: '....knnnnnnk....', 12: '...kzYzzYzzYk...', 13: '...kWWkWWkWWk...', 14: '....kkkkkkkk....' }),
  herbrack: grid({ 2: 'kkkkkkkkkkkkkkkk', 3: 'kWWWWWWWWWWWWWWk', 4: '..k...k...k...k.', 5: '.kgk.kdk.kgk.kAk', 6: '.kgk.kgk.kdk.kAk', 7: '..k...k...k...k.', 8: '.kWk........kWk.', 9: '.kWk........kWk.', 10: '.kWk........kWk.', 11: '.kWk........kWk.', 12: '.kWk........kWk.', 13: '.kWk........kWk.', 14: '.kkk........kkk.' }),
  pots: grid({ 6: '..g.g....d.g....', 7: '.gdgd...gdgdg...', 8: '..gdg....gdg....', 9: '.kkkkk..kkkkkk..', 10: '.kLLLk..kLLLLk..', 11: '..kLk....kLLk...', 12: '..kkk....kkkk...' }),
  crystal: grid({ 1: '.......kk.......', 2: '......kAak......', 3: '.....kAaaak.....', 4: '.....kAaaak.....', 5: '.....kAaaak.....', 6: '......kAak......', 7: '.......kk.......', 9: '......kkkk......', 10: '.....kFFFFk.....', 11: '.....kFaaFk.....', 12: '.....kFFFFk.....', 13: '....kGGGGGGk....', 14: '....kkkkkkkk....' }),
  signBlank: grid({ 1: '..kkkkkkkkkkkk..', 2: '..kWWWWWWWWWWk..', 3: '..kWk..k....k...', 4: '..kWk..k....k...', 5: '..kWk.kkkkkkkk..', 6: '..kWk.kooooook..', 7: '..kWk.kooooook..', 8: '..kWk.kooooook..', 9: '..kWk.kooooook..', 10: '..kWk.kooooook..', 11: '..kWk.kkkkkkkk..', 12: '..kWk...........', 13: '..kWk...........', 14: '.kkkkk..........' }),
  mug: grid({ 4: '....kkkkkk......', 5: '...kwwwwwwk.....', 6: '...kYYYYYYkkk...', 7: '...kYYYYYYk.k...', 8: '...kYyYYyYk.k...', 9: '...kYYYYYYkkk...', 10: '...kYyYYyYk.....', 11: '....kkkkkk......' }),
  table: grid({ 7: '.kkkkkkkkkkkkkk.', 8: '.kWWWWWWWWWWWWk.', 9: '.kZZZZZZZZZZZZk.', 10: '.kkkkkkkkkkkkkk.', 11: '..kWk......kWk..', 12: '..kWk......kWk..', 13: '..kkk......kkk..' }),
  woodpile: grid({ 8: '..kkk.kkk.kkk...', 9: '.kWZWkWZWkWZWk..', 10: '.kZWZkZWZkZWZk..', 11: '..kkkkkkkkkkk...', 12: '...kWZWkWZWk....', 13: '...kZWZkZWZk....', 14: '....kkkkkkk.....' }),
});
// shrines: one carving, each god in its own colors
const SHRINE = grid({ 1: '......kkkk......', 2: '.....k1111k.....', 3: '....k113311k....', 4: '....k133331k....', 5: '....k113311k....', 6: '.....k1111k.....', 7: '......k22k......', 8: '......k22k......', 9: '.....k2222k.....', 10: '....kFFFFFFk....', 11: '...kFGFFFFGFk...', 12: '...kFFFFFFFFk...', 13: '..kGGGGGGGGGGk..', 14: '..kkkkkkkkkkkk..' });
for (const [god, a, b, c] of [['aurel', 'Y', 'y', 'w'], ['veyra', 'g', 'd', 'i'], ['korrum', 'F', 'D', 'o'], ['gharrok', 'z', 'r', 'Y'], ['nemora', 'b', 'N', 'c'], ['ssathal', 'j', 'J', 'f']])
  PROPS['shrine_' + god] = SHRINE.map(r => r.replace(/1/g, a).replace(/2/g, b).replace(/3/g, c));
PROPS.stallB = PROPS.stallR.map(r => r.replace(/R/g, 'b'));
PROPS.signReg = PROPS.signInn.map(r => r.replace(/z/g, 'b').replace(/Y/g, 'w'));
// ---- inside the parsonage ----
Object.assign(PROPS, {
  hearth: grid({ 0: '...Y........Y...', 1: '.kkkkkkkkkkkkkk.', 2: '.kLLLLLLLLLLLLk.', 3: '.kllllllllllllk.', 4: '..kFFGFFFGFFFk..', 5: '..kGFkkkkkkFGk..', 6: '..kFkuuuuuukFk..', 7: '..kFkuuuuuukFk..',
    8: '..kGkuuzuuukGk..', 9: '..kFkuzYzuukFk..', 10: '..kFkzYwYzukFk..', 11: '..kGkzYwwYzkGk..', 12: '..kFkWzYYzWkFk..', 13: '..kFkZWZZWZkFk..', 14: '.kGGkkkkkkkkGGk.', 15: '.kkkkkkkkkkkkkk.' }),
  iwindow: grid({ 3: '..RkkkkkkkkkkkR.', 4: '..RkcwcckcwcckR.', 5: '..RkwccbkwccbkR.', 6: '..RkccbbkccbbkR.', 7: '..RkkkkkkkkkkkR.', 8: '..RkcccbkcccbkR.', 9: '..rkccbbkccbbkr.', 10: '..kLLLLLLLLLLLk.', 11: '..kkkkkkkkkkkkk.' }),
  bookcase: grid({ 0: '..kkkkkkkkkkkk..', 1: '..kWWWWWWWWWWk..', 2: '..kWRRbYgRbbWk..', 3: '..kWRRbYgRbbWk..', 4: '..kWRRbYgRbbWk..', 5: '..kWZZZZZZZZWk..', 6: '..kWbgRRYbgRWk..', 7: '..kWbgRRYbgRWk..',
    8: '..kWbgRRYbgRWk..', 9: '..kWZZZZZZZZWk..', 10: '..kWYRbbgRYbWk..', 11: '..kWYRbbgRYbWk..', 12: '..kWYRbbgRYbWk..', 13: '..kWZZZZZZZZWk..', 14: '..kWWWWWWWWWWk..', 15: '..kkkkkkkkkkkk..' }),
  bed: grid({ 1: '...kkkkkkkkkk...', 2: '...kZZZZZZZZk...', 3: '...kZwwwwwwZk...', 4: '...kZwwwwwwZk...', 5: '...kZOOOOOOZk...', 6: '...kRRRRRRRRk...', 7: '...kRwRRRRwRk...',
    8: '...kRRRRRRRRk...', 9: '...krRRrrRRrk...', 10: '...kRRRRRRRRk...', 11: '...kRwRRRRwRk...', 12: '...kRRRRRRRRk...', 13: '...krrrrrrrrk...', 14: '...kZZZZZZZZk...', 15: '...kkkkkkkkkk...' }),
  chest: grid({ 6: '..kkkkkkkkkkkk..', 7: '.kLLLLLLLLLLLLk.', 8: '.kLlLLLLLLLLlLk.', 9: '.kmmmmmmmmmmmmk.', 10: '.kLLLLLkYkLLLLk.', 11: '.kLlLLLkkkLLlLk.', 12: '.kLLLLLLLLLLLLk.', 13: '.kmmmmmmmmmmmmk.', 14: '.kkkkkkkkkkkkkk.', 15: '..kk........kk..' }),
  armchair: grid({ 3: '....kkkkkkkk....', 4: '...kWWWWWWWWk...', 5: '...kWRRRRRRWk...', 6: '...kWRrRRrRWk...', 7: '...kWRRRRRRWk...', 8: '..kkWRRRRRRWkk..', 9: '..kWWkkkkkkWWk..',
    10: '..kWkRRRRRRkWk..', 11: '..kWkRrRRrRkWk..', 12: '..kWWWWWWWWWWk..', 13: '..kZkkkkkkkkZk..', 14: '..kZk......kZk..', 15: '..kkk......kkk..' }),
  desk: grid({ 1: '...........z....', 2: '..........zYz...', 3: '...........w....', 4: '...........w....', 5: '..ooo.....kwk...', 6: '.oOooo...kmmmk..', 7: 'kkkkkkkkkkkkkkkk',
    8: 'kWWWWWWWWWWWWWWk', 9: 'kZZZZZZZZZZZZZZk', 10: 'kWkLLLLkkLLLLkWk', 11: 'kWkLLYLkkLYLLkWk', 12: 'kWkkkkkkkkkkkkWk', 13: 'kWk..........kWk', 14: 'kWk..........kWk', 15: 'kkk..........kkk' }),
  sundisc: grid({ 3: '.......YY.......', 4: '...Y...YY...Y...', 5: '....Y.kkkk.Y....', 6: '.....kYYYYk.....', 7: '..YYkYwwYYYkYY..', 8: '..YYkYwYYYYkYY..', 9: '.....kYYYyk.....', 10: '....Y.kkkk.Y....', 11: '...Y...YY...Y...', 12: '.......YY.......' }),
  pegmace: grid({ 4: '.......kk.......', 5: '......kMMk......', 6: '.....kMmMmk.....', 7: '.....kmMmMk.....', 8: '......kmmk......', 9: '.....kkWkk......', 10: '.......W........', 11: '.......W........', 12: '.......W........', 13: '.......k........' }),
  basin: grid({ 6: '...kkkkkkkkkk...', 7: '..kMccccccccMk..', 8: '..kmMccccccMmk..', 9: '...kmmmmmmmmk...', 10: '...kWWWWWWWWk...', 11: '...kWkkkkkkWk...', 12: '...kWk....kWk...', 13: '...kWk....kWk...', 14: '...kkk....kkk...' }),
  candelabra: grid({ 1: '...z...z...z....', 2: '..zYz.zYz.zYz...', 3: '...w...w...w....', 4: '...w...w...w....', 5: '..kYkkkYkkkYk...', 6: '...kYYYYYYYk....', 7: '.......Y........',
    8: '.......Y........', 9: '.......Y........', 10: '.......Y........', 11: '.......Y........', 12: '.......Y........', 13: '.....kYYYk......', 14: '....kyyyyyk.....' }),
  strongbox: grid({ 9: '....kkkkkkkk....', 10: '...kmMMMMMMmk...', 11: '...kmmmmmmmmk...', 12: '...knnnYYnnnk...', 13: '...kmmmmmmmmk...', 14: '...kkkkkkkkkk...' }),
});
// ---- the churchyard, and fishing ----
Object.assign(PROPS, {
  grave: grid({ 4: '.....kkkkkk.....', 5: '....kFFFFFFk....', 6: '...kFFFFFFFFk...', 7: '...kFDDDDDDFk...', 8: '...kFFFFFFFFk...', 9: '...kFFDDDDFFk...', 10: '...kFFFFFFFFk...', 11: '...kGFFFFFFGk...', 12: '...kGGGGGGGGk...', 13: '..kkkkkkkkkkkk..', 14: '..kDDDDDDDDDDk..', 15: '..kkkkkkkkkkkk..' }),
  gravecross: grid({ 2: '.......kk.......', 3: '......kFFk......', 4: '......kFFk......', 5: '...kkkkFFkkkk...', 6: '...kFFFFFFFFk...', 7: '...kGGGFFGGGk...', 8: '...kkkkFFkkkk...', 9: '......kFFk......', 10: '......kFGk......', 11: '......kFGk......', 12: '......kFGk......', 13: '....kkkkkkkk....', 14: '....kDDDDDDk....', 15: '....kkkkkkkk....' }),
  gravemoss: grid({ 5: '.....kkkkkk.....', 6: '....kFFFggFk....', 7: '...kFFFFFgggk...', 8: '...kFDDDDFFgk...', 9: '...kFFFFFFFFk...', 10: '...kgFDDDDFFk...', 11: '...kggFFFFFFk...', 12: '...kdgggFFGGk...', 13: '..kkkkkkkkkkkk..', 14: '..kdgdDDDDDDdk..', 15: '..kkkkkkkkkkkk..' }),
  memorial: grid({ 3: '...kkkkkkkkkk...', 4: '..kGFFFFFFFFGk..', 5: '..kFFFFDDFFFFk..', 6: '..kFFFDGGDFFFk..', 7: '..kFFFDGGDFFFk..', 8: '..kFFFFDDFFFFk..', 9: '..kFFDDDDDDFFk..', 10: '..kFFFFFFFFFFk..', 11: '..kGFFDDDDFFGk..', 12: '..kGGGGGGGGGGk..', 13: '.kkkkkkkkkkkkkk.', 14: '.kDaADDDDDDDDDk.', 15: '.kkkkkkkkkkkkkk.' }),
  fence: grid({ 5: '.k...k...k...k..', 6: 'knk.knk.knk.knk.', 7: '.n...n...n...n..', 8: 'nnnnnnnnnnnnnnnn', 9: '.n...n...n...n..', 10: '.n...n...n...n..', 11: '.n...n...n...n..', 12: '.n...n...n...n..', 13: 'nnnnnnnnnnnnnnnn', 14: '.n...n...n...n..', 15: '.k...k...k...k..' }),
  fenceV: grid({ 0: '.......nn.......', 1: '.......nn.......', 2: '.......nn.......', 3: '......knnk......', 4: '.......nn.......', 5: '.......nn.......', 6: '.......nn.......', 7: '.......nn.......', 8: '.......nn.......', 9: '.......nn.......', 10: '.......nn.......', 11: '......knnk......', 12: '.......nn.......', 13: '.......nn.......', 14: '.......nn.......', 15: '......kkkk......' }),
  fencePost: grid({ 3: '.......kk.......', 4: '......kNNk......', 5: '......kNnk......', 6: '......kNnk......', 7: '......kNnk......', 8: 'nnnnnnkNnknnnnnn', 9: '......kNnk......', 10: '......kNnk......', 11: '......kNnk......', 12: '......kNnk......', 13: 'nnnnnnkNnknnnnnn', 14: '......kNnk......', 15: '.....kkkkkk.....' }),
});
Object.assign(ICONS, {
  fish: grid({ 6: '....kkkkkk......', 7: '...kbbbbbbk..kk.', 8: '..kbkbbbbbbkkbbk', 9: '.kbbbbbbbbbbbbk.', 10: '.kccbbbbbbbbbbk.', 11: '..kcccccccckkbbk', 12: '...kkkkkkkk..kk.' }),
  rod: grid({ 1: '..............Wk', 2: '.............W.w', 3: '............W..w', 4: '...........W...w', 5: '..........W....w', 6: '.........W.....w', 7: '........W......w', 8: '.......W.......w', 9: '......W........w', 10: '.....W.........M', 11: '....WkY.........', 12: '...WkYk.........', 13: '..WW............', 14: '.WW.............' }),
});
// decor that blocks movement
const DECOR_BLOCK = { rail: 1, railv: 1, railpost: 1, quench: 1, chopblock: 1, meatrack: 1, trough: 1, podium: 1, shrine_aurel: 1, shrine_veyra: 1, shrine_korrum: 1, shrine_gharrok: 1, shrine_nemora: 1, shrine_ssathal: 1, furnace: 1, anvil: 1, weaponrack: 1, grindstone: 1, armorstand: 1, shieldrack: 1, sacks: 1, cauldron: 1, herbrack: 1, pots: 1, crystal: 1, table: 1, woodpile: 1, barrel: 1, crate: 1, well: 1, lamppost: 1, stallR: 1, stallB: 1, hay: 1, cart: 1, signInn: 1, signReg: 1, sign: 1, pillar: 1, ruin: 1, brazier: 1, pine: 1, oak: 1, rock: 1, fountain: 1, bookcase: 1, bed: 1, chest: 1, armchair: 1, desk: 1, basin: 1, candelabra: 1, strongbox: 1, grave: 1, gravecross: 1, gravemoss: 1, memorial: 1, fence: 1, fenceV: 1, fencePost: 1 };

Object.assign(ICONS, {
  torch: grid({ 1: '...........zz...', 2: '..........zYYz..', 3: '..........zYwz..', 4: '..........kzzk..', 5: '.........kWk....', 6: '........kWk.....', 7: '.......kWk......', 8: '......kWk.......', 9: '.....kWk........', 10: '....kWk.........', 11: '...kWk..........', 12: '..kWk...........', 13: '..kk............' }),
  lantern: grid({ 2: '.......kk.......', 3: '......k..k......', 4: '.....kkkkkk.....', 5: '....kMMMMMMk....', 6: '....kkYYYYkk....', 7: '....kYYwwYYk....', 8: '....kYwwwwYk....', 9: '....kYYwwYYk....', 10: '....kkYYYYkk....', 11: '....kMMMMMMk....', 12: '.....kkkkkk.....' }),
});
Object.assign(MON_ART, {
  rabbit: [grid({ 6: '...kk...........', 7: '..kxxk..........', 8: '..kxpk..........', 9: '...kxxkkkkk.....', 10: '..kxexxxxxxkk...', 11: '.kxxxxxxxxxxxk..', 12: '.kpxxxxxxxxxwk..', 13: '..kkxxkkxxkkk...', 14: '...kk..kk.......' }), { x: 'a08468' }],
  pheasant: grid({ 6: '..kk............', 7: '.kRRk...........', 8: 'kYkzRk..........', 9: '.kjzzkkkk.......', 10: '..kzzzzzzkkk....', 11: '..kzLzLzLzzzkkk.', 12: '...kzzzzzzzLLLLk', 13: '....kkYkYkkkkkk.', 14: '.....k..k.......' }),
  deer: grid({ 1: '..k.k...........', 2: '..kOkOk.........', 3: '...kOk..........', 4: '..kLLk..........', 5: '.kLeLk..........', 6: 'kkLLLk..........', 7: 'kLLLLkkkkkkkk...', 8: '.kkLLLLLLLLLLk..', 9: '...kLLwLLLLLLLk.', 10: '...kLLLLLLLLLLwk', 11: '...kLLkkkkkLLLk.', 12: '...kLk....kLk...', 13: '...kLk....kLk...', 14: '...kLk....kLk...', 15: '...kk.....kk....' }),
  boar: grid({ 6: '...kkkkkkkk.....', 7: '..kXXXXXXXXXk...', 8: '.kXXxXXXXXXXXk..', 9: 'kwXXXXXXXXXXXk..', 10: 'kXeXXXXXXXXXXXk.', 11: '.kXXXXXXXXXXXk..', 12: '..kXk..kXk.kXk..', 13: '..kk...kk..kk...' }),
  wolf: grid({ 5: '..k.k...........', 6: '..kGkk..........', 7: '.kGGGGk.........', 8: 'kGeGGGkkkkkkk...', 9: 'kkGGGGGGGGGGGk.k', 10: '..kGGGGGGGGGGGkG', 11: '...kFGGGGGGGFkk.', 12: '...kGk.kk.kGk...', 13: '...kGk....kGk...', 14: '...kk.....kk....' }),
  bear: [grid({ 2: '...kk....kk.....', 3: '..kXXk..kXXk....', 4: '..kXXXkkXXXk....', 5: '...kXXXXXXk.....', 6: '..kXeXXXXeXk....', 7: '..kXXXLLXXXk....', 8: '...kXXkkXXk.....', 9: '.kkXXXXXXXXkk...', 10: 'kXXXXXXXXXXXXk..', 11: 'kXXkXXXXXXkXXk..', 12: 'kXXkXXXXXXkXXk..', 13: '.kk.kXXkXXk.kk..', 14: '....kXXkXXk.....', 15: '....kkk.kkk.....' }), { X: '3a2a20', L: 'b08a6a' }],
});
MON_ART.greymaw = [MON_ART.wolf, { G: '55555f', F: '9a9aa6', e: 'ffd23f' }];
Object.assign(ICONS, {
  meat: grid({ 5: '......kkkk......', 6: '....kkRRRRkk....', 7: '...kRRpRRRRRk...', 8: '..kRRRRRRpRRRk..', 9: '..kRpRRRRRRRRk..', 10: '..krRRRRRRRRrk..', 11: '...krrRRRRrrkok.', 12: '....kkkrrkkkoook', 13: '..........kkok..', 14: '............k...' }),
  feather: grid({ 2: '............kk..', 3: '...........kwwk.', 4: '..........kwOwk.', 5: '.........kwOwk..', 6: '........kwOwk...', 7: '.......kwOwk....', 8: '......kwOwk.....', 9: '.....kwOwk......', 10: '....kwwwk.......', 11: '...kkkkk........', 12: '..kO............', 13: '.kO.............' }),
  antler: grid({ 2: '..k.....k.......', 3: '.kOk...kOk......', 4: '.kOk.k.kOk.k....', 5: '..kOkOkkOk.kOk..', 6: '..kOOOk.kOkOk...', 7: '...kOOk..kOOk...', 8: '....kOk..kOk....', 9: '....kOOkkOOk....', 10: '.....kOOOOk.....', 11: '......kOOk......', 12: '......kOOk......', 13: '.......kk.......' }),
  pelt: grid({ 3: '..kk........kk..', 4: '..kGkkkkkkkkGk..', 5: '...kGGGFGGGGk...', 6: '...kGFGGGGFGk...', 7: '..kGGGGGGGGGGk..', 8: '..kGGGFGGFGGGk..', 9: '...kGGGGGGGGk...', 10: '...kGFGGGGFGk...', 11: '..kGkkkkkkkkGk..', 12: '..kk...kk...kk..', 13: '.......kGk......', 14: '........kk......' }),
});
const L_TORCH = grid({ 5: '..z.............', 6: '.zYz............', 7: '.zwz............', 8: '..W.............', 9: '..W.............', 10: '..W.............', 11: '..W.............' });

// ================= rendering =================
const SPRITE_CACHE = new Map();
const URL_CACHE = new Map();
function hex(c) { return '#' + c; }
function paint(rows, pal) {
  const c = document.createElement('canvas'); c.width = 16; c.height = rows.length;
  const g = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < 16; x++) {
    const ch = rows[y][x]; if (ch === '.' || ch === ' ') continue;
    const col = (pal && pal[ch]) || BASE_PAL[ch]; if (!col) continue;
    g.fillStyle = hex(col); g.fillRect(x, y, 1, 1);
  }
  return c;
}
// Finishing pass over a painted sprite, so flat fills read as solid forms:
// light falls from the upper left (a warm highlight on top edges, a cool shade on bottom edges),
// and outlines take on a dark tint of whatever they wrap instead of flat black.
// Single dark pixels inside a shape (eyes, mouths, seams) are left alone.
const OUTLINE_RGB = [0x1b, 0x14, 0x24];
function polish(c) {
  const H = c.height, g = c.getContext('2d'), img = g.getImageData(0, 0, 16, H), d = img.data, src = new Uint8ClampedArray(d);
  const at = (x, y) => (x < 0 || y < 0 || x > 15 || y >= H) ? -1 : (y * 16 + x) * 4;
  const empty = i => i < 0 || src[i + 3] === 0;
  const isK = i => i >= 0 && src[i + 3] > 0 && src[i] === OUTLINE_RGB[0] && src[i + 1] === OUTLINE_RGB[1] && src[i + 2] === OUTLINE_RGB[2];
  const edge = i => empty(i) || isK(i);
  for (let y = 0; y < H; y++) for (let x = 0; x < 16; x++) {
    const i = at(x, y); if (empty(i)) continue;
    const N = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
    if (isK(i)) {
      const fills = N.filter(j => !edge(j));
      if (!fills.length || fills.length >= 3) continue;
      let r = 0, gg = 0, b = 0; for (const j of fills) { r += src[j]; gg += src[j + 1]; b += src[j + 2]; }
      const n = fills.length;
      d[i] = OUTLINE_RGB[0] * 0.55 + (r / n) * 0.3; d[i + 1] = OUTLINE_RGB[1] * 0.55 + (gg / n) * 0.3; d[i + 2] = OUTLINE_RGB[2] * 0.55 + (b / n) * 0.3;
      continue;
    }
    const up = edge(N[0]), dn = edge(N[1]), lf = edge(N[2]), rt = edge(N[3]);
    let f = 0;
    if (up && !dn) f = 1; else if (dn && !up) f = -1;
    else if (lf && !rt) f = 0.55; else if (rt && !lf) f = -0.55;
    if (f > 0) { const k = 0.24 * f; d[i] += (255 - d[i]) * k; d[i + 1] += (244 - d[i + 1]) * k; d[i + 2] += (214 - d[i + 2]) * k; }
    else if (f < 0) { const k = -f; d[i] *= 1 - 0.26 * k; d[i + 1] *= 1 - 0.24 * k; d[i + 2] = d[i + 2] * (1 - 0.14 * k) + 8 * k; }
  }
  g.putImageData(img, 0, 0);
  return c;
}
// People and the humanoid kingdoms stand a tile and a half tall. Their art is drawn on the 16×16 grid
// and lengthened here, row by row, so every outfit, helm and weapon layer stretches with the body:
// a neck under the chin, a longer torso and arms, longer legs. Goblins stay shorter than people.
const TALL = 24;
const TALL_PLANS = {
  human:    { neck: 7, rep: { 9: 2, 10: 1, 13: 3 } },
  goblin:   { rep: { 9: 1, 13: 2 } },
  ratkin:   { rep: { 7: 1, 9: 1, 10: 1, 13: 2 } },
  hollow:   { rep: { 8: 1, 10: 1, 13: 1, 14: 1 } },
  serpent:  { rep: { 7: 1, 9: 1, 10: 1 } },
  skeleton: { rep: { 7: 1, 9: 1, 10: 1, 13: 1, 14: 1 } },
  hob:      { rep: { 6: 1, 8: 1, 9: 1, 13: 1, 14: 1 } },
  ogre:     { rep: { 6: 1, 9: 1, 12: 1, 13: 1 } },
};
function tallen(src, plan) {
  const d = src.getContext('2d').getImageData(0, 0, 16, 16).data;
  const row = y => d.slice(y * 64, y * 64 + 64);
  const filled = (r, x) => r[x * 4 + 3] > 0;
  const rows = [];
  for (let y = 0; y < 16; y++) {
    rows.push(row(y));
    if (plan.neck === y) {
      // a neck: outlined, colored from the chin above (so a beard carries on down);
      // anything that runs past the chin on either side (long hair, a blade, a torch) continues through
      const a = row(y), b = row(y + 1), n = new Uint8ClampedArray(64);
      for (let x = 0; x < 16; x++) {
        if (x === 6 || x === 9) n.set([...OUTLINE_RGB, 255], x * 4);
        else if (x === 7 || x === 8) n.set(a.slice(x * 4, x * 4 + 4), x * 4);
        else if ((x < 5 || x > 10) && filled(a, x) && filled(b, x)) n.set(b.slice(x * 4, x * 4 + 4), x * 4);
      }
      rows.push(n);
    }
    for (let k = 0; k < ((plan.rep || {})[y] || 0); k++) rows.push(row(y));
  }
  // stand on the bottom of the tall canvas; any spare rows go on top
  const out = document.createElement('canvas'); out.width = 16; out.height = TALL;
  const og = out.getContext('2d'), img = og.createImageData(16, TALL);
  const skip = Math.max(0, rows.length - TALL), pad = Math.max(0, TALL - rows.length);
  for (let i = skip; i < rows.length; i++) img.data.set(rows[i], (i - skip + pad) * 64);
  og.putImageData(img, 0, 0);
  return out;
}
function monPlan(id) {
  if (id === 'skeleton') return TALL_PLANS.skeleton;
  if (id === 'g_hob') return TALL_PLANS.hob;
  if (id === 'r_ogre') return TALL_PLANS.ogre;
  if (id === 'grotsnag') return TALL_PLANS.goblin;
  if (id === 'vesk') return TALL_PLANS.ratkin;
  if (id === 'matriarch') return TALL_PLANS.hollow;
  if (id === 'hierophant') return TALL_PLANS.serpent;
  if (/^g_/.test(id) && id !== 'g_rider') return TALL_PLANS.goblin;
  if (/^r_/.test(id) && id !== 'r_swarm') return TALL_PLANS.ratkin;
  if (/^h_/.test(id) && !['h_hound', 'h_crawler'].includes(id)) return TALL_PLANS.hollow;
  if (/^s_/.test(id) && !['s_constrictor', 's_basilisk'].includes(id)) return TALL_PLANS.serpent;
  return null;
}
function cached(key, make, plan) {
  let c = SPRITE_CACHE.get(key);
  if (!c) { const [rows, pal] = make(); c = paint(rows, pal); if (plan) c = tallen(c, plan); c = smooth2x(polish(c)); SPRITE_CACHE.set(key, c); }
  return c;
}
function iconRows(name) {
  const v = ICONS[name];
  if (Array.isArray(v) && v[0] === null) return [ICONS[v[1]], v[2]];
  return [v, null];
}
// Item sprite (ground, inventory, shops).
function itemCanvas(id) {
  return cached('item:' + id, () => {
    const t = ITEMS[id];
    if (t.spr) { const [rows, pal] = iconRows(t.spr); return [rows, Object.assign({}, pal || {}, t.pal || {})]; }
    if (t.slot === 'weapon') return [ICONS[WEAPON_ICON[t.cls]], gearPal(id)];
    if (t.cls === 'helm') return [ICONS[t.grade === 'iron' ? 'i_cap' : 'i_helm'], t.grade === 'iron' ? CLOTH_PAL.leather.iron : gearPal(id)];
    if (t.cls === 'boots') return [ICONS.i_boots, t.grade === 'iron' ? CLOTH_PAL.leather.iron : gearPal(id)];
    return [ICONS[ARMOR_ICON[t.cls]], gearPal(id)];
  });
}
function matCanvas(id) { return cached('mat:' + id, () => { const m = MATS[id]; const [rows, pal] = iconRows(m.spr); return [rows, Object.assign({}, pal || {}, m.pal || {})]; }); }
function propCanvas(name) { return cached('prop:' + name, () => [PROPS[name], null]); }
// creatures inked to match the people: a near-black edge all round, and the same slightly muted, earthy palette
const INKED = new Map();
function inkSprite(c) {
  let o = INKED.get(c); if (o) return o;
  o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const g = o.getContext('2d'); g.drawImage(c, 0, 0);
  const img = g.getImageData(0, 0, o.width, o.height), d = img.data, W = o.width, H = o.height, src = new Uint8ClampedArray(d);
  const A = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] > 40;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (!A(x, y)) continue;
    const l = src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
    let r = src[i], gg = src[i + 1], b = src[i + 2]; void l;
    if (!A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || !A(x, y + 1)) { r = 34 + (r - 34) * 0.15; gg = 28 + (gg - 28) * 0.15; b = 44 + (b - 44) * 0.15; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); INKED.set(c, o); return o;
}
function monCanvas(id) {
  if (typeof MON_FIG !== 'undefined' && MON_FIG[id]) return figure(MON_FIG[id]);
  return inkSprite(monCanvasRaw(id));
}
function monCanvasRaw(id) {
  return cached('mon:' + id, () => {
    const a = MON_ART[id];
    if (Array.isArray(a) && Array.isArray(a[0])) return [a[0], a[1] || null];
    return [a, null];
  }, monPlan(id));
}
function npcCanvas(name) {
  if (typeof FIG_SPECS !== 'undefined' && FIG_SPECS[name]) return figure(FIG_SPECS[name]);
  if (name === 'hero' && typeof heroSpec === 'function') return figure(heroSpec({}, {}));
  return cached('npc:' + name, () => {
    const n = NPCS[name] || NPCS.hero;
    return [over(HUMAN, ...(n.o || [])), Object.assign({}, n.pal2 || {}, n.pal)];
  }, TALL_PLANS.human);
}
// the hero, as drawn by the figure system (figures.js), standing and facing you
function heroSprite(equip, look) {
  if (!look) look = (typeof S !== 'undefined' && S && S.player && S.player.look) || {};
  return figure(heroSpec(equip || {}, look));
}
// Walking: two frames per sprite, each lifting one foot a pixel off the ground.
// Works on any sprite: it finds the feet (the lowest painted rows) and raises the left or right half of them.
const WALK_CACHE = new WeakMap();
function walkFrames(src) {
  let f = WALK_CACHE.get(src);
  if (f) return f;
  const W = src.width, H = src.height, d0 = src.getContext('2d').getImageData(0, 0, W, H).data;
  let bot = H - 1; while (bot > 0 && ![...Array(W).keys()].some(x => d0[(bot * W + x) * 4 + 3])) bot--;
  const k2 = W > 16 ? 2 : 1, K = (H > W ? 6 : 4) * k2, top = Math.max(0, bot - K + 1);
  f = [0, 1].map(side => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    const x0 = side ? W / 2 : 0, x1 = side ? W : W / 2;
    for (let y = top; y <= bot; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, j = ((y + k2) * W + x) * 4;
      for (let k = 0; k < 4; k++) d[i + k] = y + k2 <= bot ? d0[j + k] : 0;
    }
    g.putImageData(img, 0, 0); return c;
  });
  WALK_CACHE.set(src, f);
  return f;
}
// <img> for HTML lists
function spriteImg(canvas, size = 32, crop) {
  // people get a proper head-and-shoulders portrait instead of a crop of their walking figure
  if (crop === 'head' && canvas.spec && !canvas.spec.race && typeof portrait === 'function') { canvas = portrait(canvas.spec); crop = undefined; }
  const cw = canvas.width, ch = canvas.height, tall = ch > cw, head = tall && crop === 'head';
  const key = head ? 'head' : 'full';
  let urls = URL_CACHE.get(canvas); if (!urls) { urls = {}; URL_CACHE.set(canvas, urls); }
  if (!urls[key]) {
    // a head-and-shoulders crop starts at the top of the figure, wherever its head is
    let top = 0;
    if (head) { const d = canvas.getContext('2d').getImageData(0, 0, cw, ch).data; while (top < ch - cw && ![...Array(cw).keys()].some(x => d[(top * cw + x) * 4 + 3])) top++; top = Math.max(0, top - 1); }
    const sh = head ? cw * (cw > 16 ? 0.75 : 1) : ch, sx = head && cw > 16 ? cw * 0.125 : 0, sw = head && cw > 16 ? cw * 0.75 : cw;
    const k = Math.max(1, Math.round(64 / sw));
    const c = document.createElement('canvas'); c.width = sw * k; c.height = sh * k; const g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(canvas, sx, top, sw, sh, 0, 0, c.width, c.height);
    urls[key] = c.toDataURL();
  }
  const h = size, w = head || !tall ? size : Math.round(size * cw / ch);
  return `<img class="spr" src="${urls[key]}" width="${w}" height="${h}" alt="">`;
}
