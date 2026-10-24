// The Temple Warden — village props drawn natively on the 32 grid, at their real size.
// A lamppost stands two and a half tiles tall; a stall's awning rises over the counter. Each stands on its
// tile's bottom edge and is drawn among the people, so whoever is nearer overlaps it, and it throws a shadow.
// Lit from the upper left like everything else, with a dark rim tinted by what it wraps.
'use strict';

function nativeProp(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const F = (x, y, ww, hh, col) => { if (ww <= 0 || hh <= 0) return; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  const P = (x, y, col) => F(x, y, 1, 1, col);
  const E = (cx, cy, rx, ry, col) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) P(x, y, col); } };
  draw({ g, F, P, E, w, h });
  // the rim: outside pixels next to the art take a deep shade of what they touch
  const img = g.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d), a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y)) continue;
    let n = -1; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (a(x + dx, y + dy)) { n = ((y + dy) * w + x + dx) * 4; break; }
    if (n < 0) continue;
    const i = (y * w + x) * 4, lit = a(x + 1, y) || a(x, y + 1); // a rim facing up-left is lighter
    const k = lit ? 0.2 : 0.12; // inked near-black, like the people
    d[i] = 27 + (src[n] - 27) * k; d[i + 1] = 20 + (src[n + 1] - 20) * k; d[i + 2] = 36 + (src[n + 2] - 36) * k; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// wooden staves, shaded round: light on the left, dark on the right
const roundShade = (x, x0, x1, base, hi, lo) => { const k = (x - x0) / (x1 - x0); return k < 0.18 ? hi : k > 0.78 ? lo : base; };

const NATIVE_PROPS = {
  lamppost: () => nativeProp(32, 80, ({ F, P }) => {
    // a stone plinth set in the street
    F(9, 70, 14, 9, '#8c867c'); F(9, 70, 14, 2, '#bdb6a8'); F(9, 72, 2, 7, '#a39d92'); F(20, 72, 3, 7, '#6f6a62'); F(8, 78, 16, 2, '#5f5a52');
    // the iron post, with collars
    F(14, 24, 4, 46, '#2e3238'); F(14, 24, 1, 46, '#5a626c'); F(17, 24, 1, 46, '#1e2126');
    for (const y of [30, 52, 64]) { F(12, y, 8, 2, '#3a3f46'); F(12, y, 8, 1, '#6a737e'); }
    F(11, 66, 10, 4, '#3a3f46'); F(11, 66, 10, 1, '#6a737e');
    // the lantern: a cap, a cage of glass glowing warm, a drip-tray below
    F(13, 1, 6, 2, '#2e3238'); P(15, 0, '#2e3238'); P(16, 0, '#2e3238');
    for (let y = 3; y < 8; y++) { const half = 4 + (y - 3); F(16 - half, y, half * 2, 1, y === 3 ? '#5a626c' : '#2e3238'); }
    F(9, 8, 14, 13, '#2e3238');
    F(10, 9, 5, 11, '#ffd27a'); F(17, 9, 5, 11, '#f2b84b'); F(11, 10, 3, 8, '#fff1b0'); F(18, 11, 3, 6, '#ffd27a');
    F(15, 8, 2, 13, '#2e3238'); F(9, 14, 14, 1, '#3a3f46');
    F(10, 21, 12, 2, '#3a3f46'); F(12, 23, 8, 1, '#2e3238');
  }),
  well: () => nativeProp(32, 56, ({ F, P, E }) => {
    // the shaft, a ring of fitted stones
    const stones = ['#a9a39a', '#b8b1a6', '#9c968c', '#c2bbb0'];
    F(2, 34, 28, 18, '#7a746b');
    for (let r = 0; r < 3; r++) { const y = 35 + r * 6; for (let x = 2 + (r % 2) * 3; x < 30; x += 7) { const w = Math.min(6, 30 - x), c = stones[(x + r * 3) % 4]; F(x, y, w, 5, c); F(x, y, w, 1, '#d6cfc2'); F(x + w - 1, y, 1, 5, '#8c867c'); } }
    F(2, 34, 2, 18, '#c6c0b6'); F(27, 34, 3, 18, '#6f6a62'); F(2, 51, 28, 2, '#5f5a52');
    E(16, 33, 14, 4, '#8c867c'); E(16, 33, 11, 2.6, '#1c2730'); E(14, 33, 5, 1.2, '#2f4a5c');
    // posts, crank and rope
    F(4, 12, 3, 22, '#6b4423'); F(4, 12, 1, 22, '#9a6a3a'); F(25, 12, 3, 22, '#5a3a20'); F(27, 12, 1, 22, '#3a2410');
    F(4, 17, 24, 2, '#5a3a20'); F(4, 17, 24, 1, '#8a5a2b'); F(28, 16, 2, 5, '#3a3a40'); F(29, 20, 2, 2, '#3a3a40');
    F(15, 19, 1, 9, '#c9b38a'); F(13, 27, 5, 4, '#6b4423'); F(13, 27, 5, 1, '#9a6a3a'); F(13, 29, 5, 1, '#3a3a40');
    // a little shingled roof
    for (let y = 2; y < 13; y++) { const half = 5 + y * 1.05, x0 = 16 - half; F(x0, y, half * 2, 1, y < 4 ? '#8a5a2b' : (y % 3 === 0 ? '#5a3a20' : '#7a4a26')); F(x0, y, 2, 1, '#a8743c'); F(16 + half - 3, y, 3, 1, '#4a2e18'); }
    F(14, 0, 4, 2, '#5a3a20');
  }),
  barrel: () => nativeProp(32, 36, ({ F, E }) => {
    for (let y = 8; y < 34; y++) { const bulge = Math.round(Math.sin((y - 8) / 26 * Math.PI) * 2), x0 = 7 - bulge, x1 = 25 + bulge; for (let x = x0; x < x1; x++) F(x, y, 1, 1, (x - x0) % 4 === 0 ? '#6e4421' : roundShade(x, x0, x1, '#9a6434', '#b97c46', '#6e4421')); }
    for (const y of [11, 20, 30]) { const bulge = Math.round(Math.sin((y - 8) / 26 * Math.PI) * 2); F(7 - bulge, y, 18 + bulge * 2, 2, '#4a4f58'); F(7 - bulge, y, 18 + bulge * 2, 1, '#8a929c'); }
    E(16, 8, 9, 3.2, '#7a4a26'); E(16, 8, 7.5, 2.2, '#a8743c'); F(10, 8, 12, 1, '#8a5a2b');
  }),
  crate: () => nativeProp(32, 34, ({ F, P }) => {
    F(5, 4, 22, 6, '#c08f55'); F(5, 4, 22, 1, '#d8ab70');            // the top
    F(5, 10, 22, 22, '#a4743f');                                      // the face
    for (let y = 10; y < 32; y += 6) F(5, y, 22, 1, '#7a5228');
    F(5, 10, 3, 22, '#c08f55'); F(24, 10, 3, 22, '#7a5228'); F(5, 10, 22, 3, '#b8854b'); F(5, 29, 22, 3, '#7a5228');
    for (let k = 0; k < 16; k++) { F(8 + k, 13 + k, 2, 1, '#8a5e2e'); P(8 + k, 12 + k, '#c89a60'); }
    for (const [x, y] of [[6, 11], [25, 11], [6, 30], [25, 30]]) P(x, y, '#3a3a40');
  }),
  sacks: () => nativeProp(32, 30, ({ F, E }) => {
    const sack = (cx, top, w, col, hi, lo) => { E(cx, top + 13, w, 11, col); E(cx - w * 0.35, top + 10, w * 0.45, 7, hi); E(cx + w * 0.45, top + 16, w * 0.4, 7, lo); F(cx - 2, top, 4, 4, col); F(cx - 3, top + 3, 6, 1, '#6b5030'); F(cx - 1, top - 1, 2, 1, hi); };
    sack(10, 4, 8, '#c4a878', '#d8c194', '#9c8458');
    sack(21, 6, 8.5, '#b89a6a', '#ccb282', '#8e764e');
  }),
  bench: () => nativeProp(32, 26, ({ F }) => {
    F(2, 4, 28, 3, '#8a5a2b'); F(2, 4, 28, 1, '#b07a44'); F(4, 7, 2, 7, '#5a3a20'); F(26, 7, 2, 7, '#5a3a20');
    F(1, 13, 30, 4, '#9a6434'); F(1, 13, 30, 1, '#c08a50'); F(1, 16, 30, 1, '#6e4421');
    F(3, 17, 3, 8, '#5a3a20'); F(26, 17, 3, 8, '#5a3a20'); F(3, 17, 1, 8, '#8a5a2b');
  }),
  woodpile: () => nativeProp(32, 30, ({ F, E }) => {
    for (const [cx, cy] of [[7, 24], [15, 24], [23, 24], [11, 17], [19, 17], [27, 18], [15, 10]]) { E(cx, cy, 4.2, 4.2, '#6b4423'); E(cx, cy, 3.2, 3.2, '#c89a60'); E(cx, cy, 1.6, 1.6, '#a8743c'); E(cx - 1, cy - 1, 0.8, 0.8, '#e0b880'); }
    F(2, 28, 28, 2, '#4a2e18');
  }),
  pots: () => nativeProp(32, 28, ({ F, E }) => {
    const pot = (cx, top, r, h, col, hi, lo) => { for (let y = 0; y < h; y++) { const k = y / h, rr = r * (0.75 + Math.sin(k * Math.PI) * 0.35); for (let x = Math.round(cx - rr); x < Math.round(cx + rr); x++) F(x, top + y, 1, 1, roundShade(x, cx - rr, cx + rr, col, hi, lo)); } E(cx, top, r * 0.8, 1.6, lo); F(cx - r * 0.8, top - 1, r * 1.6, 1, hi); };
    pot(9, 9, 6, 17, '#b5523b', '#d47b5f', '#7d3426');
    pot(22, 13, 5, 13, '#a8743c', '#c89a60', '#6e4a28');
    pot(15, 18, 3.5, 9, '#8a5a7a', '#a87a98', '#5a3a50');
  }),
  // ---- yards and pens ----
  // split-rail fencing: a run along the tile, a run going back, and a corner post
  rail: () => nativeProp(32, 26, ({ F }) => {
    for (const x of [0, 30]) { F(x, 6, 3, 19, '#6b4423'); F(x, 6, 1, 19, '#9a6a3a'); F(x, 5, 3, 1, '#8a5a2b'); }
    for (const y of [10, 17]) { F(0, y, 32, 3, '#8a5a2b'); F(0, y, 32, 1, '#b07a44'); F(0, y + 2, 32, 1, '#5a3a20'); }
  }),
  railv: () => nativeProp(32, 40, ({ F }) => {
    for (const y of [4, 36]) { F(14, y - 4, 4, 10, '#6b4423'); F(14, y - 4, 1, 10, '#9a6a3a'); }
    for (const x of [13, 17]) { F(x, 2, 2, 36, '#8a5a2b'); F(x, 2, 1, 36, '#b07a44'); }
  }),
  railpost: () => nativeProp(32, 28, ({ F }) => { F(13, 4, 5, 22, '#6b4423'); F(13, 4, 2, 22, '#9a6a3a'); F(13, 3, 5, 2, '#8a5a2b'); }),
  // the smith's yard
  furnace: () => nativeProp(32, 60, ({ F, E }) => {
    // a stone hearth with a hooded flue; coals glowing in the mouth
    const st = ['#8c867c', '#9c968c', '#7d786f', '#a9a39a'];
    for (let y = 30; y < 58; y += 5) for (let x = 2 + ((y / 5) % 2) * 3; x < 30; x += 7) { const c = st[(x + y) % 4]; F(x, y, Math.min(6, 30 - x), 4, c); F(x, y, Math.min(6, 30 - x), 1, '#c6c0b6'); }
    F(2, 30, 2, 28, '#c6c0b6'); F(27, 30, 3, 28, '#5f5a52');
    F(7, 40, 18, 12, '#1c1410'); F(9, 46, 14, 6, '#c2412d'); F(10, 47, 12, 3, '#f08a3a'); F(12, 47, 7, 2, '#ffd27a'); F(13, 44, 2, 2, '#ffd27a');
    F(4, 37, 24, 3, '#6f6a62'); F(4, 37, 24, 1, '#bdb6a8');
    // the hood and flue
    for (let y = 14; y < 30; y++) { const half = 6 + (y - 14) * 0.55; F(16 - half, y, half * 2, 1, y % 4 === 0 ? '#5f5a52' : '#7d786f'); F(16 - half, y, 2, 1, '#a39e94'); }
    F(11, 0, 10, 15, '#7d786f'); F(11, 0, 2, 15, '#a39e94'); F(19, 0, 2, 15, '#5f5a52'); for (let y = 2; y < 15; y += 4) F(11, y, 10, 1, '#5f5a52');
    F(9, 0, 14, 2, '#6f6a62');
  }),
  anvil: () => nativeProp(32, 30, ({ F }) => {
    F(8, 20, 16, 9, '#6b4423'); F(8, 20, 2, 9, '#9a6a3a'); F(8, 20, 16, 1, '#8a5a2b');           // the stump
    F(6, 9, 22, 5, '#4a4f58'); F(6, 9, 22, 1, '#9aa5b0'); F(2, 10, 5, 3, '#4a4f58'); F(1, 11, 2, 1, '#4a4f58'); // face and horn
    F(11, 14, 10, 3, '#3a3f46'); F(9, 17, 14, 3, '#4a4f58'); F(9, 17, 14, 1, '#6a737e');
  }),
  grindstone: () => nativeProp(32, 34, ({ F, E }) => {
    F(5, 22, 3, 11, '#6b4423'); F(24, 22, 3, 11, '#5a3a20'); F(5, 22, 22, 3, '#8a5a2b'); F(5, 22, 22, 1, '#b07a44');
    E(16, 15, 9, 9, '#8c867c'); E(16, 15, 7, 7, '#a39e94'); E(14, 13, 3, 3, '#c6c0b6'); E(16, 15, 1.5, 1.5, '#4a4f58');
    F(16, 15, 12, 2, '#4a4f58'); F(27, 15, 2, 6, '#6b4423');
    F(8, 29, 16, 3, '#6b4423'); F(9, 29, 14, 1, '#7fb3dd');
  }),
  weaponrack: () => nativeProp(32, 44, ({ F }) => {
    F(2, 14, 3, 29, '#6b4423'); F(27, 14, 3, 29, '#5a3a20'); F(2, 16, 28, 3, '#8a5a2b'); F(2, 34, 28, 3, '#8a5a2b'); F(2, 16, 28, 1, '#b07a44');
    for (const [x, kind] of [[7, 'sword'], [12, 'spear'], [17, 'axe'], [22, 'sword']]) {
      if (kind === 'spear') { F(x, 2, 2, 38, '#6b4423'); F(x - 1, 0, 4, 5, '#c9d1d8'); }
      else if (kind === 'axe') { F(x, 8, 2, 32, '#6b4423'); F(x + 2, 8, 5, 7, '#b8c0c8'); F(x + 6, 8, 1, 7, '#e6ecf0'); }
      else { F(x, 6, 2, 26, '#c9d1d8'); F(x, 6, 1, 26, '#eef2f5'); F(x - 2, 31, 6, 2, '#c8a03a'); F(x, 33, 2, 5, '#5a3a20'); }
    }
  }),
  quench: () => nativeProp(32, 30, ({ F, E }) => {
    for (let y = 8; y < 28; y++) for (let x = 6; x < 26; x++) F(x, y, 1, 1, (x - 6) % 4 === 0 ? '#5a3a20' : roundShade(x, 6, 26, '#8a5a2b', '#a8743c', '#5e3a1a'));
    for (const y of [10, 24]) { F(6, y, 20, 2, '#3a3f46'); F(6, y, 20, 1, '#6a737e'); }
    E(16, 8, 10, 3, '#5a3a20'); E(16, 8, 8.5, 2.2, '#2f4a5c'); F(12, 7, 5, 1, '#6f9ab4');
    F(18, 0, 2, 8, '#3a3f46'); F(19, 0, 5, 2, '#3a3f46'); // tongs in the water
  }),
  // the butcher's yard
  chopblock: () => nativeProp(32, 28, ({ F, E }) => {
    F(7, 12, 18, 14, '#7a4a26'); F(7, 12, 3, 14, '#9a6434'); F(22, 12, 3, 14, '#5a3a20');
    E(16, 12, 9, 3, '#b07a44'); E(16, 12, 6, 2, '#c89a60'); E(16, 12, 3, 1, '#a8743c');
    F(13, 4, 2, 8, '#c9d1d8'); F(11, 4, 6, 4, '#c9d1d8'); F(11, 4, 6, 1, '#eef2f5'); F(17, 5, 5, 2, '#5a3a20');
  }),
  meatrack: () => nativeProp(32, 52, ({ F }) => {
    F(2, 6, 3, 45, '#6b4423'); F(27, 6, 3, 45, '#5a3a20'); F(0, 6, 32, 3, '#8a5a2b'); F(0, 6, 32, 1, '#b07a44');
    for (const x of [7, 14, 21]) { F(x + 1, 9, 1, 3, '#3a3f46'); F(x - 1, 12, 5, 12, '#b5523b'); F(x - 1, 12, 1, 12, '#d47b5f'); F(x, 22, 3, 2, '#efe6d2'); F(x + 1, 24, 1, 2, '#c9b38a'); }
  }),
  // the stockyard
  hay: () => nativeProp(32, 26, ({ F }) => {
    F(3, 6, 26, 19, '#c9a04a'); F(3, 6, 26, 2, '#e3c06a'); F(3, 6, 2, 19, '#d8b45a'); F(26, 6, 3, 19, '#a07a2e');
    for (let i = 0; i < 40; i++) F(3 + (i * 7) % 26, 8 + (i * 5) % 16, 2, 1, i % 2 ? '#e3c06a' : '#a07a2e');
    for (const x of [10, 21]) F(x, 6, 1, 19, '#7a5a20');
  }),
  trough: () => nativeProp(32, 20, ({ F }) => {
    F(1, 6, 30, 11, '#7a4a26'); F(1, 6, 30, 2, '#9a6434'); F(3, 8, 26, 4, '#2f4a5c'); F(5, 8, 10, 1, '#6f9ab4');
    F(2, 17, 3, 3, '#5a3a20'); F(27, 17, 3, 3, '#5a3a20');
  }),
  podium: () => nativeProp(32, 44, ({ F }) => {
    F(4, 22, 24, 21, '#8a5a2b'); F(4, 22, 24, 2, '#b07a44'); F(4, 22, 2, 21, '#a8743c'); F(25, 22, 3, 21, '#5a3a20');
    F(2, 18, 28, 4, '#6b4423'); F(2, 18, 28, 1, '#9a6a3a');
    F(10, 28, 12, 9, '#b9343c'); F(10, 28, 12, 1, '#e3b93c'); F(15, 31, 2, 3, '#e3b93c');
    F(21, 9, 2, 9, '#6b4423'); F(19, 5, 6, 5, '#c8a03a'); F(19, 5, 6, 1, '#f3d36c'); // the auctioneer's bell
  }),
  // the beasts
  cow: () => nativeProp(40, 34, ({ F, E, P }) => {
    E(20, 18, 13, 8, '#efe6d2'); E(15, 16, 4, 3, '#3a2a22'); E(25, 20, 5, 3.5, '#3a2a22'); E(20, 13, 9, 2, '#fff8ea');
    for (const x of [10, 15, 25, 30]) { F(x, 24, 3, 8, '#e6dcc6'); F(x, 31, 3, 2, '#3a2a22'); }
    E(34, 14, 5, 5, '#efe6d2'); E(36, 17, 3.5, 2.5, '#e8a8a0'); P(35, 12, '#1b1424'); F(31, 8, 2, 3, '#d8d0bc'); F(36, 8, 2, 3, '#d8d0bc'); E(30, 11, 2, 1.2, '#efe6d2');
    F(6, 15, 2, 9, '#d8d0bc'); F(5, 23, 4, 2, '#3a2a22'); E(20, 25, 3, 1.5, '#e8a8a0');
  }),
  pig: () => nativeProp(34, 24, ({ F, E, P }) => {
    E(16, 13, 11, 7, '#e8a0a0'); E(14, 10, 8, 3, '#f4c0bc');
    for (const x of [9, 13, 20, 24]) F(x, 18, 3, 5, '#d88a8a');
    E(28, 13, 5, 4.5, '#e8a0a0'); E(31, 14, 2.5, 2, '#d07878'); P(30, 14, '#7a3a3a'); P(32, 14, '#7a3a3a'); P(27, 11, '#1b1424'); F(25, 7, 3, 3, '#d88a8a');
    for (let k = 0; k < 4; k++) P(4 - (k % 2), 10 + k, '#d07878');
  }),
  sheep: () => nativeProp(34, 26, ({ F, E, P }) => {
    for (const [x, y] of [[9, 11], [15, 9], [21, 10], [12, 15], [19, 15], [25, 13], [7, 15]]) E(x, y, 5, 4.5, '#f4efe2');
    for (const [x, y] of [[13, 8], [20, 8], [10, 12]]) E(x, y, 2, 1.6, '#ffffff');
    for (const x of [9, 13, 19, 23]) F(x, 18, 2, 7, '#3a3030');
    E(28, 12, 4, 4, '#3a3030'); P(29, 11, '#e8e0d0'); F(25, 9, 3, 2, '#3a3030');
  }),
  horse: () => nativeProp(40, 44, ({ F, E, P }) => {
    E(18, 22, 13, 7, '#8a5a2b'); E(15, 19, 9, 2.5, '#a8743c');
    for (const x of [8, 12, 24, 28]) { F(x, 27, 3, 14, '#7a4a26'); F(x, 40, 3, 3, '#2a1a10'); }
    F(28, 8, 6, 16, '#8a5a2b'); E(33, 8, 5, 4, '#8a5a2b'); E(37, 10, 3, 2.5, '#7a4a26'); P(33, 6, '#1b1424'); F(30, 2, 2, 4, '#7a4a26');
    for (let y = 4; y < 20; y++) P(27, y, '#2a1a10'); for (let y = 16; y < 30; y++) P(5 - (y % 2), y, '#2a1a10'); F(4, 16, 2, 6, '#2a1a10');
  }),
  stallR: () => stallArt('#b9343c', '#efe6d2', 'veg'),
  stallB: () => stallArt('#3b6fc4', '#efe6d2', 'cloth'),
};
function stallArt(a, b, goods) {
  return nativeProp(32, 58, ({ F, P, E }) => {
    // posts and the counter
    F(2, 12, 3, 44, '#6b4423'); F(2, 12, 1, 44, '#9a6a3a'); F(27, 12, 3, 44, '#5a3a20');
    F(0, 36, 32, 4, '#a4743f'); F(0, 36, 32, 1, '#c89a60'); F(0, 40, 32, 14, '#8a5a2b'); for (let x = 0; x < 32; x += 6) F(x, 40, 1, 14, '#6b4423'); F(0, 53, 32, 2, '#4a2e18');
    // goods on the counter
    if (goods === 'veg') { for (let i = 0; i < 6; i++) E(4 + i * 4.6, 34, 2.4, 2.2, ['#e07b2c', '#8fae4a', '#d84a3a', '#e3b93c'][i % 4]); F(20, 30, 8, 5, '#b8923f'); }
    else { F(3, 31, 8, 5, '#7b4bb5'); F(3, 31, 8, 1, '#9b6bd5'); F(12, 30, 8, 6, '#3f8f7a'); F(12, 30, 8, 1, '#5fafa0'); F(21, 32, 8, 4, '#e3b93c'); F(21, 32, 8, 1, '#f3d36c'); }
    // the striped awning, a lip of scallops
    for (let y = 2; y < 12; y++) for (let x = -1 + Math.floor((12 - y) / 3); x < 33 - Math.floor((12 - y) / 3); x++) F(x, y, 1, 1, Math.floor((x + 32) / 4) % 2 ? a : b);
    F(0, 2, 32, 1, 'rgba(255,255,255,0.35)');
    for (let x = 0; x < 32; x += 4) { const c = Math.floor(x / 4) % 2 ? a : b; F(x, 12, 4, 2, c); P(x + 1, 14, c); P(x + 2, 14, c); }
    F(0, 15, 32, 2, 'rgba(20,10,30,0.25)');
  });
}
const NATIVE_PROP_CACHE = {};
function nativePropCanvas(name) { return NATIVE_PROP_CACHE[name] || (NATIVE_PROP_CACHE[name] = NATIVE_PROPS[name]()); }
