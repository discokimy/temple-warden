// The Temple Warden — every spell its own sign. A learned spell shows as a glowing rune-medallion in its school's
// colour with a glyph for what it does (a flame for Fireball, a heart for Heal…), and the same glyph is stamped in gold
// on the spellbook's cover, so books and hotbar slots can be told apart at a glance.
'use strict';

// 12×12 glyphs: # the sign, + its bright core
const SPELL_GLYPHS = {
  missile:     ['..........##', '........####', '.......#++#.', '......#++#..', '.....#++#...', '....#++#....', '...#++#.....', '..#++#......', '.#+##.......', '.##.........', '#.#.........', '............'],
  light:       ['.....##.....', '.#...##...#.', '..#......#..', '....####....', '...#++++#...', '##.#++++#.##', '##.#++++#.##', '...#++++#...', '....####....', '..#......#..', '.#...##...#.', '.....##.....'],
  phase:       ['..####......', '.#....#.....', '#..##..#....', '#.#..#.#....', '#.#.##.#..#.', '#..#...#.##.', '.#....#.###.', '..####..####', '.......#####', '............', '..#.#.#.#...', '............'],
  cure:        ['....####....', '....#++#....', '....#++#....', '....#++#....', '####.++.####', '#++++++++++#', '#++++++++++#', '####.++.####', '....#++#....', '....#++#....', '....#++#....', '....####....'],
  heal:        ['............', '.###....###.', '#+++#..#+++#', '#++++##++++#', '#++++++++++#', '#++++++++++#', '.#++++++++#.', '..#++++++#..', '...#++++#...', '....#++#....', '.....##.....', '............'],
  frost:       ['.....##.....', '..#..##..#..', '...#.##.#...', '.#..#++#..#.', '..#.#++#.#..', '############', '############', '..#.#++#.#..', '.#..#++#..#.', '...#.##.#...', '..#..##..#..', '.....##.....'],
  shield:      ['.##########.', '#++++##++++#', '#++++##++++#', '#++++##++++#', '############', '#++++##++++#', '.#+++##+++#.', '.#+++##+++#.', '..#++##++#..', '...#+##+#...', '....####....', '.....##.....'],
  sleep:       ['....###.....', '..##+.......', '.#++........', '#++.....####', '#++.......#.', '#++......#..', '#++.....####', '#+++........', '.#+++.....#.', '..##++++##..', '....####....', '............'],
  fear:        ['...######...', '..#++++++#..', '.#++++++++#.', '#++##++##++#', '#+#..++..#+#', '#++##++##++#', '#++++##++++#', '.#+++..+++#.', '..#+#++#+#..', '..#.#..#.#..', '..########..', '............'],
  detect:      ['............', '....####....', '..##++++##..', '.#++.##.++#.', '#++.#++#.++#', '#+.#+##+#.+#', '#++.#++#.++#', '.#++.##.++#.', '..##++++##..', '....####....', '............', '............'],
  drain:       ['.....##.....', '.....##.....', '....#++#....', '....#++#....', '...#++++#...', '..#++++++#..', '.#+++++.++#.', '.#++++++.+#.', '.#++++++++#.', '..#++++++#..', '...######...', '............'],
  regen:       ['.......###..', '.....##++#..', '....#+++#...', '....#++#....', '..##.##.....', '.#++###.....', '#+++#.#.....', '.###..#.....', '.....##.....', '....####....', '...######...', '............'],
  lightning:   ['......####..', '.....#++#...', '....#++#....', '...#++#.....', '..#++####...', '.#+++++++#..', '..####++#...', '.....#+#....', '....#+#.....', '...#+#......', '..##........', '............'],
  poisoncloud: ['....####....', '..##++++##..', '.#++++++++#.', '#++++++++++#', '#++++++++++#', '.##########.', '............', '..#...#...#.', '..#...#...#.', '.#+#.#+#.#+#', '..#...#...#.', '............'],
  fireball:    ['.....#......', '.....##..#..', '....#+#..#..', '..#.#++##...', '..##+++#.#..', '.#+++++++#..', '#++++++++#..', '#+++##+++#..', '#++#..#++#..', '.#+#..#+#...', '..######....', '............'],
  mapspell:    ['....####....', '..##++++##..', '.#+++..+++#.', '.#++.++.++#.', '#++.++++.++#', '#+++.++.+++#', '.#+++..+++#.', '.#++++++++#.', '..##++++##..', '....####....', '...######...', '..########..'],
  invis:       ['....#..#....', '...#....#...', '...#....#...', '....#..#....', '..#......#..', '.#........#.', '#..........#', '#..#....#..#', '...#....#...', '...#....#...', '..##....##..', '............'],
  haste:       ['#....#......', '##...##.....', '.##...##....', '..##...##...', '...##...##..', '....##...##.', '....##...##.', '...##...##..', '..##...##...', '.##...##....', '##...##.....', '#....#......'],
  recall:      ['...######...', '..#......#..', '.#........#.', '#..........#', '#....##....#', '#...#++#...#', '#...#++#...#', '.#...##...#.', '..#......#..', '.##....###..', '###.....##..', '.#..........'],
  meteor:      ['#...........', '.#..#.......', '..#..#......', '#..#..#.....', '.#..#.####..', '..#..#++++#.', '...#+++++++#', '....#++##++#', '....#++++++#', '.....#++++#.', '......####..', '............'],
};
const SCHOOL_GLOW = { evocation: '#ff8a5c', restoration: '#8be07a', illusion: '#c9a0ff', abjuration: '#8cc0ff', divination: '#7fe6d0' };
const spellIconCache = {};
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbStr = (a, k = 1) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbStr(A.map((v, i) => v + (B[i] - v) * t)); };
// a 32×32 medallion: dark inked rim, a disc of the school's colour lit from the upper left, and the glyph glowing on it
function spellIcon(id) {
  if (spellIconCache[id]) return spellIconCache[id];
  const sp = SPELLS[id], base = '#' + (SCHOOL_COLOR[sp.school] || '7b4bb5'), glow = SCHOOL_GLOW[sp.school] || '#ffffff';
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy);
    if (d > 15.2) continue;
    if (d > 13.8) { P(x, y, '#1c1512'); continue; }
    if (d > 12.6) { P(x, y, (dx + dy) < 0 ? mixHex('#c8a24a', '#fff0b0', 0.3) : '#8a6a24'); continue; } // a gold ring
    const lit = 1 - (dx + dy) / 30 * 0.5, k = 0.42 + 0.25 * lit - d / 13 * 0.12;
    P(x, y, rgbStr(hexToRgb(base), k));
  }
  // the glyph, doubled onto the disc, with a dark shadow under it and a soft glow round it
  const gl = SPELL_GLYPHS[id] || SPELL_GLYPHS.missile, ox = 4, oy = 4;
  const on = (x, y) => y >= 0 && y < 12 && x >= 0 && x < 12 && gl[y][x] !== '.';
  g.fillStyle = 'rgba(255,255,255,0.0)';
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (on(x, y)) for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!on(x + ax, y + ay)) { g.fillStyle = glow + '55'; g.fillRect(ox + (x + ax) * 2, oy + (y + ay) * 2, 2, 2); }
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (on(x, y)) { g.fillStyle = 'rgba(10,6,14,0.55)'; g.fillRect(ox + x * 2 + 1, oy + y * 2 + 1, 2, 2); }
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const ch = gl[y][x]; if (ch === '.') continue;
    g.fillStyle = ch === '+' ? '#fffdf0' : glow; g.fillRect(ox + x * 2, oy + y * 2, 2, 2);
  }
  // a glint on the rim
  P(9, 6, '#fff6d0'); P(8, 7, '#fff6d0');
  return (spellIconCache[id] = c);
}
// spellbooks wear their spell's glyph in gold on the cover
{
  const _itemCanvas = itemCanvas;
  const bookCache = {};
  itemCanvas = function (id) {
    const t = ITEMS[id];
    if (!t || t.cat !== 'book' || !t.spell || !SPELL_GLYPHS[t.spell]) return _itemCanvas(id);
    if (bookCache[id]) return bookCache[id];
    const src = _itemCanvas(id), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const s = src.width / 32, gl = SPELL_GLYPHS[t.spell], ox = 8 * s, oy = 9 * s, u = s; // 12 cells at 1px each on the cover
    // clear the cover's old decoration and lay the glyph on it
    const cover = '#' + (SCHOOL_COLOR[SPELLS[t.spell].school] || '7b4bb5');
    g.fillStyle = rgbStr(hexToRgb(cover), 0.85); g.fillRect(ox - u, oy - u, 14 * u, 13 * u);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const ch = gl[y][x]; if (ch === '.') continue; g.fillStyle = ch === '+' ? '#fff1b0' : '#e3b93c'; g.fillRect(ox + x * u, oy + y * u, u, u); }
    return (bookCache[id] = c);
  };
}
