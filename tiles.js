// The Temple Warden — ground, walls and buildings, painted pixel by pixel on the same 16×16 grid as the sprites.
// Every tile has a few seeded variants; the map picks one per position so floors don't repeat.
'use strict';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const tileHash = (x, y) => { let h = Math.imul(x + 101, 374761393) + Math.imul(y + 37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

// The world is drawn on a 32-pixels-per-tile grid, the same grid the people are drawn on, so everything
// shares one pixel size. Art first painted on the old 16 grid is doubled with Scale2x (EPX), which rounds
// off staircase edges and diagonals the way a pixel artist would, instead of simply fattening each pixel.
function smooth2x(src) {
  const W = src.width, H = src.height, d = src.getContext('2d').getImageData(0, 0, W, H).data;
  const out = document.createElement('canvas'); out.width = W * 2; out.height = H * 2;
  const og = out.getContext('2d'), img = og.createImageData(W * 2, H * 2), o = new Uint32Array(img.data.buffer), s = new Uint32Array(d.buffer.slice(0));
  const at = (x, y) => s[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = s[y * W + x], a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), dd = at(x, y + 1);
    let e1 = p, e2 = p, e3 = p, e4 = p;
    if (c === a && c !== dd && a !== b) e1 = a;
    if (a === b && a !== c && b !== dd) e2 = b;
    if (dd === c && dd !== b && c !== a) e3 = c;
    if (b === dd && b !== a && dd !== c) e4 = dd;
    const i = (y * 2) * W * 2 + x * 2;
    o[i] = e1; o[i + 1] = e2; o[i + W * 2] = e3; o[i + W * 2 + 1] = e4;
  }
  og.putImageData(img, 0, 0);
  return out;
}
// A painter for one 16×16 tile: P sets a pixel, F fills a rectangle, R/ri/pick are seeded randomness.
function paintTile(fn, seed = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); const R = rng(seed * 7919 + 13);
  const P = (x, y, col) => { if (x < 0 || y < 0 || x > 15 || y > 15) return; g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  fn({ g, P, F, R, ri, pick: arr => arr[Math.floor(R() * arr.length)] });
  return c;
}
// scatter n pixels of a color
const speckle = (t, n, col, y0 = 0, y1 = 15) => { for (let i = 0; i < n; i++) t.P(t.ri(0, 15), t.ri(y0, y1), col); };

// ---------------- outdoors ----------------
const GRASS = { base: '#5b9541', dk: '#4c8237', dk2: '#3d6e2f', lt: '#6fa74c', lt2: '#88bd60' };
const WOODS = { base: '#4c8238', dk: '#3f7030', dk2: '#335f28', lt: '#5f9744', lt2: '#78ad55' };
function grassTile(seed, pal, flowers) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, pal.base);
    // soft mottling, then blade tufts
    for (let i = 0; i < 9; i++) { const x = t.ri(0, 14), y = t.ri(0, 14); t.P(x, y, pal.dk); t.P(x + 1, y, pal.dk); }
    speckle(t, 16, pal.dk); speckle(t, 10, pal.lt);
    for (let i = 0; i < 4; i++) { const x = t.ri(0, 13), y = t.ri(2, 15); t.P(x, y, pal.dk2); t.P(x + 2, y, pal.dk2); t.P(x + 1, y - 1, pal.lt2); t.P(x + 1, y, pal.dk); }
    if (pal === WOODS) { for (let i = 0; i < 5; i++) t.P(t.ri(0, 15), t.ri(0, 15), t.pick(['#8a6a34', '#9c7a3c', '#6e5a2c'])); }
    if (flowers) for (let i = 0; i < 4; i++) {
      const x = t.ri(1, 13), y = t.ri(2, 13), c = t.pick(['#e05a7a', '#f2c94c', '#f4f0e6', '#9a7ce0']);
      t.P(x, y + 1, pal.dk2); t.P(x, y, c); t.P(x + 1, y, c); t.P(x, y - 1, c); t.P(x + 1, y - 1, '#fff6d8');
    }
  }, seed);
}
const DIRT = { base: '#a98457', dk: '#8e6c43', lt: '#bf9a69', peb: '#d6c6a2', pebdk: '#7a5c38' };
function dirtTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, DIRT.base);
    for (let i = 0; i < 8; i++) { const x = t.ri(0, 13), y = t.ri(0, 15); t.F(x, y, 3, 1, DIRT.dk); }
    speckle(t, 14, DIRT.dk); speckle(t, 12, DIRT.lt);
    for (let i = 0; i < 3; i++) { const x = t.ri(1, 13), y = t.ri(1, 13); t.P(x, y, DIRT.peb); t.P(x + 1, y, DIRT.lt); t.P(x + 1, y + 1, DIRT.pebdk); }
  }, seed);
}
const COBBLE = { mortar: '#83796a', stones: ['#c2b8a3', '#b6ab95', '#aa9f88', '#bdb19a'], hi: '#d8cfbc', sh: '#958a74' };
function cobbleTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, COBBLE.mortar);
    for (let r = 0; r < 4; r++) {
      const y = r * 4; let x = r % 2 ? -t.ri(1, 3) : 0;
      while (x < 16) {
        const w = t.ri(4, 6), col = t.pick(COBBLE.stones);
        t.F(x + 1, y, w - 1, 3, col);
        t.F(x + 1, y, w - 2, 1, COBBLE.hi); t.F(x + 2, y + 2, w - 2, 1, COBBLE.sh);
        if (t.R() < 0.3) t.P(x + t.ri(2, w - 2), y + 1, COBBLE.sh);
        x += w;
      }
    }
  }, seed);
}
const WATER = { base: '#3a78b0', dk: '#2f6699', lt: '#5b97c9', glint: '#b4daf4' };
function waterTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, WATER.base);
    for (let i = 0; i < 6; i++) { const x = t.ri(0, 12), y = t.ri(0, 15); t.F(x, y, 4, 1, WATER.dk); }
    for (let i = 0; i < 4; i++) { const x = t.ri(0, 12), y = t.ri(1, 14); t.F(x, y, 3, 1, WATER.lt); t.P(x + 1, y - 1, WATER.lt); }
    for (let i = 0; i < 2; i++) t.P(t.ri(1, 14), t.ri(1, 14), WATER.glint);
  }, seed);
}
const ROCK = { base: '#7d7468', dk: '#5e564c', dk2: '#463f37', lt: '#9c9385', lt2: '#b5ad9f' };
function cliffTile(seed, lip) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, ROCK.base);
    // big facets: light on the upper left of each, shadow below
    for (let i = 0; i < 4; i++) { const x = t.ri(0, 11), y = t.ri(0, 12), w = t.ri(3, 6); t.F(x, y, w, 1, ROCK.lt); t.F(x, y + 1, 1, 2, ROCK.lt); t.F(x + 1, y + 3, w, 1, ROCK.dk); }
    for (let i = 0; i < 3; i++) { const x = t.ri(1, 14); let y = t.ri(0, 8); for (let k = 0; k < 6; k++) { t.P(x + (k % 3 === 2 ? 1 : 0), y++, ROCK.dk2); } }
    speckle(t, 6, ROCK.lt2);
    t.F(0, 15, 16, 1, ROCK.dk2);
    if (lip) {
      // a grassy brow on the top edge of the cliff
      t.F(0, 0, 16, 3, GRASS.base);
      for (let x = 0; x < 16; x++) { const d = t.ri(0, 2); t.F(x, 3, 1, d, GRASS.dk); t.P(x, 3 + d, ROCK.dk2); }
      speckle(t, 5, GRASS.lt, 0, 2);
    }
  }, seed);
}
// deep woods seen from above: a roof of leaves, round clusters lit from the upper left
function canopyTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#24461f');
    for (let i = 0; i < 7; i++) {
      const cx = t.ri(1, 14), cy = t.ri(1, 14), r = t.ri(3, 4);
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = x * x + y * y; if (d > r * r) continue;
        t.P(cx + x, cy + y, d > (r - 1) * (r - 1) ? '#2c5426' : x + y < -r / 2 ? '#4d8a3a' : x + y < 1 ? '#3d7330' : '#33622b');
      }
    }
    speckle(t, 8, '#5d9a45'); speckle(t, 6, '#1a3417');
  }, seed);
}

// the town wall: capstones on top, a dressed stone face where it fronts open ground
function townWallTile(seed, face) {
  return paintTile(t => {
    const top = face ? 6 : 16;
    t.F(0, 0, 16, top, '#a59d8e');
    for (let x = 0; x < 16; x += 4) { t.F(x, 0, 3, top - 1, t.pick(['#b8b0a1', '#aea694', '#b2aa9b'])); t.F(x, 0, 3, 1, '#cdc6b8'); }
    if (!face) { for (let y = 5; y < 16; y += 5) t.F(0, y, 16, 1, '#8a8274'); return; }
    t.F(0, top - 1, 16, 1, '#6f675a');
    t.F(0, top, 16, 16 - top, '#8f8677');
    for (let r = 0; r < 3; r++) {
      const y = top + r * 3; const off = r % 2 ? 3 : 0;
      t.F(0, y + 2, 16, 1, '#6f675a');
      for (let x = off; x < 16; x += 6) t.F(x, y, 1, 2, '#6f675a');
      for (let x = off + 1; x < 16; x += 6) t.F(x, y, 3, 1, '#a39a8a');
    }
    t.F(0, 15, 16, 1, '#5a5348');
  }, seed);
}

// ---------------- cave themes ----------------
const CAVE_PAL = {
  cave:  { fl: '#7a7164', fd: '#6b6357', fL: '#898073', peb: '#9d9486', crack: '#544d45', top: '#3d373b', tL: '#4c4549', tD: '#2c272b', face: '#665d55', fcL: '#80766b', fcD: '#4a433d', rim: '#9a9083' },
  g:     { fl: '#6e5440', fd: '#5c4535', fL: '#7f634c', peb: '#9a7a5c', crack: '#4a372a', top: '#3a2c23', tL: '#4a3a2e', tD: '#2a1f18', face: '#6a4a36', fcL: '#845e44', fcD: '#4a3324', rim: '#a07656' },
  r:     { fl: '#56614a', fd: '#48523e', fL: '#65715a', peb: '#7d8b6c', crack: '#3a4331', top: '#2a3326', tL: '#384332', tD: '#1e251b', face: '#4b5741', fcL: '#606d51', fcD: '#353e2e', rim: '#7d8c66', slime: '#8fae4a', slimeL: '#b5d06a' },
  h:     { fl: '#4f5769', fd: '#434b5b', fL: '#5e677a', peb: '#7b849a', crack: '#363c4a', top: '#272c38', tL: '#343a48', tD: '#1c2029', face: '#4b5369', fcL: '#606981', fcD: '#363c4d', rim: '#8993ae', glow: '#a9e0ff' },
  s:     { fl: '#a68b5b', fd: '#957b4e', fL: '#b89c69', peb: '#c9ae7a', crack: '#7d6640', top: '#3b2e1f', tL: '#4c3c29', tD: '#2a2016', face: '#937646', fcL: '#ac8d59', fcD: '#6e5634', rim: '#c9a96e', gold: '#e3b93c' },
  deep:  { fl: '#3b2f31', fd: '#2f2527', fL: '#47383a', peb: '#5a4648', crack: '#231a1c', top: '#22181b', tL: '#2e2124', tD: '#170f12', face: '#3f2d2f', fcL: '#533b3d', fcD: '#2a1d1f', rim: '#6e4a48', lava: '#c2412d', lavaL: '#f08a3a' },
  house: { fl: '#a7774a', fd: '#8a603a', fL: '#b5854f', peb: '#6e4a2b', crack: '#6e4a2b', top: '#4a3222', tL: '#5a3e2a', tD: '#3a2618', face: '#d8c8a6', fcL: '#e6d8b8', fcD: '#bfae8a', rim: '#7a5434', wain: '#7a5434', wainL: '#8e6440' },
};
function floorTile(th, seed, detail) {
  const c = CAVE_PAL[th];
  if (th === 'house') return plankTile(seed);
  return paintTile(t => {
    t.F(0, 0, 16, 16, c.fl);
    if (th === 's') {
      // laid sandstone flags with fine grout
      for (const [x0, y0] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { t.F(x0, y0, 8, 8, t.pick([c.fl, c.fd, c.fL])); t.F(x0, y0, 8, 1, c.fL); t.F(x0, y0, 1, 8, c.fL); }
      t.F(0, 7, 16, 1, c.crack); t.F(7, 0, 1, 16, c.crack); t.F(0, 15, 16, 1, c.crack); t.F(15, 0, 1, 16, c.crack);
      speckle(t, 10, c.fd); speckle(t, 6, c.peb);
      if (detail) { t.P(7, 7, c.gold); t.P(6, 7, '#a8801f'); t.P(7, 6, '#fff1b0'); t.F(2, 3, 4, 1, c.gold); t.F(10, 11, 3, 1, c.gold); }
      return;
    }
    for (let i = 0; i < 10; i++) { const x = t.ri(0, 13), y = t.ri(0, 15); t.F(x, y, t.ri(2, 3), 1, c.fd); }
    speckle(t, 14, c.fd); speckle(t, 10, c.fL);
    for (let i = 0; i < 3; i++) { const x = t.ri(1, 13), y = t.ri(1, 13); t.P(x, y, c.peb); t.P(x + 1, y + 1, c.crack); }
    if (t.R() < 0.45) { let x = t.ri(2, 12), y = t.ri(2, 12); for (let k = 0; k < 5; k++) { t.P(x, y, c.crack); x += t.ri(0, 1); y += t.ri(0, 1) ? 1 : 0; } }
    if (!detail) return;
    if (th === 'cave') { // a pale mushroom cluster
      for (const [x, y] of [[4, 9], [7, 11], [10, 8]]) { t.P(x, y + 1, '#d9cfb8'); t.F(x - 1, y, 3, 1, '#c9b8a0'); t.P(x, y - 1, '#e8dcc4'); }
    } else if (th === 'g') { // a scrap of broken plank
      t.F(3, 9, 9, 2, '#8a5a2b'); t.F(3, 9, 9, 1, '#a8743c'); t.P(6, 10, '#3a2410'); t.P(10, 10, '#3a2410');
    } else if (th === 'r') { // a slick of green slime
      t.F(3, 7, 9, 3, c.slime); t.F(5, 6, 5, 1, c.slime); t.F(4, 10, 6, 1, c.slime); t.F(5, 7, 3, 1, c.slimeL); t.P(9, 8, c.slimeL);
    } else if (th === 'h') { // a pale crystal growing from the floor
      t.F(7, 5, 2, 7, '#7fb6d6'); t.F(7, 5, 1, 6, c.glow); t.P(7, 4, '#e6f6ff'); t.F(4, 9, 2, 3, '#7fb6d6'); t.P(4, 8, c.glow); t.F(10, 10, 2, 2, '#7fb6d6'); t.P(10, 9, c.glow);
    } else if (th === 'deep') { // a seam of glowing lava
      let x = 1, y = t.ri(5, 10); for (let k = 0; k < 15; k++) { t.P(x, y, c.lava); if (k % 3 === 1) t.P(x, y - 1, c.lavaL); x++; if (t.R() < 0.4) y += t.ri(-1, 1); }
    }
  }, seed);
}
// a wall seen from above (dark rock), or with its face showing where open floor lies below it
function wallTile(th, seed, face, vein) {
  const c = CAVE_PAL[th];
  const top = face ? (th === 'house' ? 3 : 6) : 16;
  return paintTile(t => {
    t.F(0, 0, 16, top, c.top);
    if (th === 'house') { for (let y = 0; y < top; y += 2) t.F(0, y, 16, 1, c.tL); }
    else { for (let i = 0; i < 6; i++) { const x = t.ri(0, 13), y = t.ri(0, top - 1); t.F(x, y, t.ri(2, 3), 1, c.tL); } speckle(t, 8, c.tD, 0, top - 1); speckle(t, 4, c.tL, 0, top - 1); }
    if (!face) { if (vein) for (let i = 0; i < 5; i++) { const x = t.ri(1, 13), y = t.ri(1, 13); t.P(x, y, '#e8c547'); t.P(x + 1, y, '#8a6d1f'); } return; }
    t.F(0, top, 16, 1, c.rim);
    if (th === 'house') {
      // plaster above, wood wainscot below, a dark baseboard
      t.F(0, top + 1, 16, 15 - top, c.face);
      speckle(t, 8, c.fcD, top + 1, 9); speckle(t, 6, c.fcL, top + 1, 9);
      t.F(0, 10, 16, 1, c.wainL); t.F(0, 11, 16, 4, c.wain);
      for (let x = 1; x < 16; x += 5) t.F(x, 11, 1, 4, '#5e3f25');
      t.F(0, 15, 16, 1, '#3a2618');
      return;
    }
    t.F(0, top + 1, 16, 15 - top, c.face);
    // rock strata and vertical cracks give the face its weight
    for (let i = 0; i < 4; i++) { const y = t.ri(top + 2, 13); t.F(t.ri(0, 8), y, t.ri(4, 8), 1, c.fcD); }
    for (let i = 0; i < 4; i++) { const x = t.ri(0, 15), y = t.ri(top + 1, 12); t.F(x, y, 1, t.ri(2, 4), c.fcD); t.P(x - 1, y, c.fcL); }
    speckle(t, 7, c.fcL, top + 1, 14);
    t.F(0, top + 1, 16, 1, c.fcL);
    t.F(0, 14, 16, 2, c.fcD);
    if (th === 'r') for (let i = 0; i < 3; i++) { const x = t.ri(0, 14); t.F(x, top + 1, 1, t.ri(2, 5), c.slime); }
    if (th === 'h') for (let i = 0; i < 2; i++) { const x = t.ri(2, 13), y = t.ri(top + 2, 12); t.P(x, y, c.glow); t.P(x, y + 1, '#7fb6d6'); }
    if (th === 'deep') for (let i = 0; i < 2; i++) { const x = t.ri(2, 13), y = t.ri(top + 2, 12); t.P(x, y, c.lava); t.P(x, y + 1, c.lavaL); }
    if (th === 's') { t.F(0, top + 4, 16, 1, c.rim); for (let x = 1; x < 16; x += 4) t.P(x, top + 4, c.gold); }
    if (vein) for (let i = 0; i < 6; i++) { const x = t.ri(1, 13), y = t.ri(top + 1, 13); t.P(x, y, '#e8c547'); t.P(x + 1, y + 1, '#8a6d1f'); t.P(x, y - 1, '#fff1b0'); }
  }, seed);
}
function plankTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#a7774a');
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      t.F(0, y, 16, 3, t.pick(['#a7774a', '#9d6f45', '#b17f4f']));
      t.F(0, y + 3, 16, 1, '#6e4a2b');
      t.F(0, y, 16, 1, '#bb8a58');
      const seam = t.ri(2, 13); t.F(seam, y, 1, 3, '#6e4a2b'); t.P(seam + 1, y + 1, '#4a3220');
      for (let i = 0; i < 2; i++) t.F(t.ri(0, 12), y + t.ri(1, 2), t.ri(2, 4), 1, '#93653d');
    }
  }, seed);
}
// stairs: a pit of steps going down, or steps climbing out
function stairTile(th, seed, down) {
  const c = CAVE_PAL[th];
  const base = floorTile(th, seed);
  return paintTile(t => {
    t.g.drawImage(base, 0, 0);
    if (down) {
      t.F(2, 2, 12, 12, c.rim); t.F(3, 3, 10, 11, '#0c090b');
      const cols = [c.fcL, c.face, c.fcD, '#241f20'];
      for (let i = 0; i < 4; i++) { const y = 3 + i * 3, inset = i; t.F(3 + inset, y, 10 - inset * 2, 2, cols[i]); t.F(3 + inset, y + 2, 10 - inset * 2, 1, '#0c090b'); }
      t.F(2, 14, 12, 1, c.crack);
    } else {
      const cols = ['#241f20', c.fcD, c.face, c.fcL];
      for (let i = 0; i < 4; i++) { const y = 2 + i * 3; t.F(3, y, 10, 3, cols[i]); t.F(3, y, 10, 1, i === 3 ? c.rim : cols[Math.min(3, i + 1)]); t.F(3, y + 2, 10, 1, '#120d10'); }
      t.F(2, 2, 1, 12, c.crack); t.F(13, 2, 1, 12, c.crack); t.F(3, 14, 10, 1, c.crack);
    }
  }, seed);
}
function gateTile(th) {
  const c = CAVE_PAL[th];
  const wall = wallTile(th, 3, true);
  return paintTile(t => {
    t.g.drawImage(wall, 0, 0);
    t.F(2, 2, 12, 14, '#2a2224'); t.F(3, 3, 10, 13, '#4a3a30');
    t.F(3, 3, 10, 1, c.rim);
    for (let x = 5; x < 13; x += 3) t.F(x, 4, 1, 12, '#33281f');
    t.F(3, 7, 10, 1, '#6e6a66'); t.F(3, 12, 10, 1, '#6e6a66');
    for (const x of [4, 7, 10]) t.P(x, 9, '#b9a23a');
    t.F(7, 9, 2, 2, '#e3b93c');
  });
}

// ---------------- buildings ----------------
function stoneWallTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#7f796f');
    for (let r = 0; r < 4; r++) {
      const y = r * 4; let x = r % 2 ? -3 : 0;
      while (x < 16) { const w = t.ri(5, 7); t.F(x + 1, y + 1, w - 1, 3, t.pick(['#a9a39a', '#a19b91', '#b1aba1'])); t.F(x + 1, y + 1, w - 2, 1, '#c6c0b6'); x += w; }
    }
  }, seed);
}
function brickWallTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#c9bfae');
    for (let r = 0; r < 4; r++) {
      const y = r * 4, off = r % 2 ? -4 : 0;
      for (let x = off; x < 16; x += 8) { t.F(x + 1, y, 7, 3, t.pick(['#9b4a32', '#a9533a', '#8e4330'])); t.F(x + 1, y, 6, 1, '#b8664a'); }
    }
  }, seed);
}
function timberWallTile(v) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#ece0c2');
    speckle(t, 10, '#ddd0b0');
    t.F(0, 0, 16, 2, '#5a3a1e'); t.F(0, 14, 16, 2, '#5a3a1e'); t.F(0, 0, 2, 16, '#5a3a1e');
    t.F(0, 1, 16, 1, '#74502c'); t.F(1, 0, 1, 16, '#74502c');
    for (let i = 0; i < 12; i++) { const x = 2 + i, y = v ? 2 + i : 13 - i; t.F(x, y, 2, 1, '#5a3a1e'); }
  }, v + 1);
}
const WALL_ART = { K: stoneWallTile, W: brickWallTile, H: s => timberWallTile(s % 2) };
function windowOver(base) {
  return paintTile(t => {
    t.g.drawImage(base, 0, 0);
    t.F(2, 3, 2, 9, '#4f7a3a'); t.F(12, 3, 2, 9, '#4f7a3a'); t.F(2, 3, 1, 9, '#6a9a4e'); t.F(12, 3, 1, 9, '#6a9a4e');
    t.F(4, 2, 8, 11, '#3a2410'); t.F(5, 3, 6, 9, '#f2d27a'); t.F(5, 8, 6, 4, '#d9a748');
    t.F(5, 3, 2, 2, '#fff1b8'); t.F(7, 3, 2, 9, '#3a2410'); t.F(5, 7, 6, 1, '#3a2410');
    t.F(3, 12, 10, 2, '#7a4b23'); t.F(3, 12, 10, 1, '#94602f');
    t.P(4, 11, '#d6336c'); t.P(6, 11, '#f2c94c'); t.P(9, 11, '#d6336c'); t.P(11, 11, '#f4f0e6'); t.P(5, 11, '#4f7a3a'); t.P(10, 11, '#4f7a3a');
  });
}
function doorOver(base) {
  return paintTile(t => {
    t.g.drawImage(base, 0, 0);
    t.F(3, 3, 10, 13, '#3a2410'); t.F(4, 2, 8, 1, '#3a2410');
    t.F(4, 4, 8, 12, '#8a5a2b'); t.F(5, 3, 6, 1, '#8a5a2b');
    for (const x of [6, 9]) t.F(x, 3, 1, 13, '#6a4220');
    t.F(4, 4, 1, 12, '#a06c38');
    t.F(4, 7, 8, 1, '#4a4a4a'); t.F(4, 12, 8, 1, '#4a4a4a');
    t.P(10, 10, '#e3b93c'); t.P(10, 9, '#fff1b0');
    t.F(2, 15, 12, 1, '#8f8677');
  });
}
// roofs: clay tiles, thatch and slate. The eave variant ends the roof in a fascia board and shadow.
function roofTile(kind, seed, eave) {
  return paintTile(t => {
    if (kind === 'r') {
      t.F(0, 0, 16, 16, '#b5523b');
      for (let r = 0; r < 4; r++) {
        const y = r * 4, off = r % 2 ? 2 : 0;
        for (let x = -off; x < 16; x += 4) { t.F(x, y + 3, 4, 1, '#7d3426'); t.P(x + 3, y + 2, '#943f2e'); t.F(x + 1, y, 2, 1, '#d47b5f'); t.P(x, y + 1, '#c86a50'); }
      }
      speckle(t, 5, '#a5482f');
    } else if (kind === 'l') {
      t.F(0, 0, 16, 16, '#5f6b7d');
      for (let r = 0; r < 4; r++) {
        const y = r * 4, off = r % 2 ? 3 : 0;
        t.F(0, y + 3, 16, 1, '#3c4554');
        for (let x = -off; x < 16; x += 5) { t.F(x, y, 1, 3, '#4a5465'); t.F(x + 1, y, 3, 1, '#8a97aa'); t.P(x + 1 + t.ri(0, 2), y + 1, t.pick(['#6a778a', '#56616f'])); }
      }
    } else {
      t.F(0, 0, 16, 16, '#d0a852');
      for (let i = 0; i < 26; i++) { const x = t.ri(0, 15), y = t.ri(0, 13); t.P(x, y, '#a07e34'); t.P(x, y + 1, '#a07e34'); t.P(x + 1, y + 2, '#b8923f'); }
      speckle(t, 14, '#ead08a');
      for (const y of [5, 11]) for (let x = 0; x < 16; x++) if (t.R() < 0.7) t.P(x, y, '#9a7630');
    }
    if (eave) {
      const dk = kind === 'r' ? '#5c2519' : kind === 'l' ? '#2c3340' : '#7a5c22';
      t.F(0, 12, 16, 3, dk); t.F(0, 12, 16, 1, kind === 'h' ? '#b8923f' : '#3a2410');
      if (kind === 'h') for (let x = 0; x < 16; x += 2) t.F(x, 12, 1, 3, '#9a7630');
      t.F(0, 15, 16, 1, 'rgba(0,0,0,0.35)');
    }
  }, seed);
}
function counterTile() {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#7a4b23');
    t.F(0, 1, 16, 5, '#a06a36'); t.F(0, 1, 16, 1, '#c08850'); t.F(0, 6, 16, 1, '#5a3416');
    for (let x = 1; x < 16; x += 5) { t.F(x, 8, 4, 6, '#6a3f1d'); t.F(x, 8, 4, 1, '#8a5a2b'); }
    t.F(0, 14, 16, 2, '#4a2a12');
  });
}
// a timber bridge: weathered planks running across the water, rails along both sides
function bridgeTile(seed) {
  return paintTile(t => {
    t.F(0, 0, 16, 16, '#7a5232');
    for (let y = 0; y < 16; y += 3) { t.F(2, y, 12, 2, t.pick(['#9c6f45', '#93653d', '#a6784b'])); t.F(2, y, 12, 1, '#b48654'); t.F(2, y + 2, 12, 1, '#5e3f25'); }
    for (let i = 0; i < 5; i++) t.P(t.ri(3, 12), t.ri(0, 15), '#4a3220');
    t.F(0, 0, 2, 16, '#4a3220'); t.F(14, 0, 2, 16, '#4a3220'); t.F(0, 0, 1, 16, '#6e4a2b'); t.F(14, 0, 1, 16, '#6e4a2b');
    for (const y of [1, 9]) { t.F(0, y, 2, 3, '#33231a'); t.F(14, y, 2, 3, '#33231a'); }
  }, seed);
}
// a trail marker at a map edge: a dirt path with a pale chevron pointing the way
function trailEnd(seed, up) {
  const base = dirtTile(seed);
  return paintTile(t => {
    t.g.drawImage(base, 0, 0);
    const rows = up ? [[7, 4, 2], [6, 5, 4], [5, 6, 6], [4, 7, 8]] : [[4, 8, 8], [5, 9, 6], [6, 10, 4], [7, 11, 2]];
    for (const [x, y, w] of rows) { t.F(x, y + 1, w, 1, 'rgba(0,0,0,0.35)'); t.F(x, y, w, 1, '#f4ecdf'); }
  });
}
function caveMouth(seed) {
  const cliff = cliffTile(seed, true);
  return paintTile(t => {
    t.g.drawImage(cliff, 0, 0);
    t.F(3, 5, 10, 11, '#0c090b'); t.F(4, 4, 8, 1, '#0c090b'); t.F(5, 3, 6, 1, '#0c090b');
    t.F(2, 5, 1, 11, ROCK.dk2); t.F(13, 5, 1, 11, ROCK.dk2); t.F(4, 3, 1, 1, ROCK.dk2); t.F(11, 3, 1, 1, ROCK.dk2);
    t.F(4, 13, 8, 1, '#2a2224'); t.F(5, 11, 6, 1, '#1c1618');
    // timber props at the mouth
    t.F(3, 6, 1, 10, '#6a4220'); t.F(12, 6, 1, 10, '#6a4220'); t.F(3, 5, 10, 1, '#8a5a2b');
  }, seed);
}

// a doorway in an interior wall, daylight beyond and a mat on the step
function houseDoor() {
  const c = CAVE_PAL.house;
  return paintTile(t => {
    t.F(0, 0, 16, 16, c.top); for (let y = 0; y < 16; y += 2) t.F(0, y, 16, 1, c.tL);
    t.F(3, 0, 10, 16, '#efe0b0'); t.F(3, 0, 10, 5, '#f8efcf');
    t.F(2, 0, 1, 16, '#2a1a10'); t.F(13, 0, 1, 16, '#2a1a10');
    t.F(4, 9, 8, 6, '#7d2027'); t.F(5, 10, 6, 4, '#b9343c'); for (let x = 4; x < 12; x += 2) { t.P(x, 15, '#e3b93c'); t.P(x, 8, '#e3b93c'); }
  });
}

// ---------------- the library ----------------
// TILE[name][variant] → 16×16 canvas
const TILE = {};
const VARIANTS = 4;
function buildTileset() {
  const many = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
  TILE.grass = many(VARIANTS, s => grassTile(s, GRASS));
  TILE.flowers = many(3, s => grassTile(s + 20, GRASS, true));
  TILE.woods = many(VARIANTS, s => grassTile(s + 40, WOODS));
  TILE.woodsFlowers = many(2, s => grassTile(s + 60, WOODS, true));
  TILE.dirt = many(VARIANTS, s => dirtTile(s));
  TILE.canopy = many(VARIANTS, s => canopyTile(s));
  TILE.cobble = many(VARIANTS, s => cobbleTile(s));
  TILE.water = many(3, s => waterTile(s));
  TILE.cliff = many(3, s => cliffTile(s));
  TILE.cliffLip = many(3, s => cliffTile(s + 10, true));
  TILE.townWall = many(2, s => townWallTile(s, true));
  TILE.townWallTop = many(2, s => townWallTile(s, false));
  TILE.planks = many(VARIANTS, s => plankTile(s));
  TILE.counter = [counterTile()];
  TILE.trailDown = [trailEnd(3, false)];
  TILE.bridge = [bridgeTile(1), bridgeTile(2)];
  TILE.trailUp = [trailEnd(4, true)];
  TILE.caveMouth = [caveMouth(5)];
  TILE.houseDoor = [houseDoor()];
  for (const th in CAVE_PAL) {
    TILE['floor_' + th] = many(VARIANTS, s => floorTile(th, s));
    TILE['floorDetail_' + th] = many(2, s => floorTile(th, s + 30, true));
    TILE['wall_' + th] = many(3, s => wallTile(th, s));
    TILE['wallFace_' + th] = many(3, s => wallTile(th, s + 10, true));
    TILE['vein_' + th] = many(2, s => wallTile(th, s + 20, false, true));
    TILE['veinFace_' + th] = many(2, s => wallTile(th, s + 30, true, true));
    TILE['down_' + th] = [stairTile(th, 7, true)];
    TILE['up_' + th] = [stairTile(th, 8, false)];
    TILE['gate_' + th] = [gateTile(th)];
  }
  for (const w of 'KWH') {
    TILE['bwall' + w] = many(2, s => WALL_ART[w](s));
    TILE['bwin' + w] = TILE['bwall' + w].map(windowOver);
    TILE['bdoor' + w] = [doorOver(TILE['bwall' + w][0])];
  }
  for (const r of 'rhl') { TILE['roof' + r] = many(2, s => roofTile(r, s)); TILE['eave' + r] = many(2, s => roofTile(r, s + 5, true)); }
  nativeGround();
  lift32();
}
// every tile ends up on the 32 grid; tiles painted natively at 32 are left alone
const NATIVE32 = new Set();
function lift32() { for (const k in TILE) if (!NATIVE32.has(k)) TILE[k] = TILE[k].map(c => c.width === 16 ? smooth2x(c) : c); }
const tileVar = (name, x, y) => { const arr = TILE[name]; return arr[tileHash(x, y) % arr.length]; };
const ROOF_DARK = { r: '#5c2519', l: '#2c3340', h: '#7a5c22' };

// ---------------- landmarks: buildings drawn whole, larger than one tile ----------------
// The Temple of the Dawn: a humble stone chapel seen from the square. A gabled nave with a rose window,
// low side aisles, buttresses, lancet windows lit from inside, a bell-cote on the peak crowned by Aurel's sun-disc,
// and worn steps up to arched double doors. 9×9 tiles (144×144 art pixels); the door is at the bottom center.
function templeArt() {
  const W = 144, H = 144, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(77);
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const P = (x, y, col) => F(x, y, 1, 1, col);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const ST = { base: '#d8cdb6', hi: '#ece3d0', lo: '#b9ad93', mortar: '#a4977c', dark: '#8f8268', deep: '#6f6450' };
  const SL = { base: '#5f6b7d', hi: '#8a97aa', lo: '#46505f', line: '#353d4a' };
  const OUT = '#2a2230';
  // dressed stone: courses 6px tall, staggered joints, a lighter top edge on each block
  const stone = (x0, y0, w, h, shade = 0) => {
    F(x0, y0, w, h, ST.mortar);
    for (let y = y0, r = 0; y < y0 + h; y += 6, r++) {
      let x = x0 - (r % 2 ? ri(3, 7) : 0);
      while (x < x0 + w) {
        const bw = ri(8, 13), xa = Math.max(x0, x + 1), xb = Math.min(x0 + w, x + bw), hh = Math.min(5, y0 + h - y);
        if (xb > xa && hh > 0) {
          F(xa, y, xb - xa, hh, R() < 0.25 ? ST.lo : ST.base);
          F(xa, y, xb - xa, 1, ST.hi);
          if (R() < 0.3) P(xa + ri(1, Math.max(1, xb - xa - 2)), y + ri(1, Math.max(1, hh - 1)), ST.lo);
        }
        x += bw;
      }
    }
    if (shade) { g.fillStyle = `rgba(40,30,50,${shade})`; g.fillRect(x0, y0, w, h); }
  };
  // a slate roof slope between two lines, drawn row by row
  const slope = (rows) => {
    for (const [y, xa, xb] of rows) {
      const course = Math.floor(y / 4);
      F(xa, y, xb - xa, 1, y % 4 === 3 ? SL.line : SL.base);
      if (y % 4 !== 3) for (let x = xa + (course % 2 ? 2 : 0); x < xb; x += 5) P(x, y, SL.lo);
      if (y % 4 === 0) for (let x = xa + 1 + (course % 2 ? 2 : 0); x < xb - 1; x += 5) P(x, y, SL.hi);
    }
  };
  // lancet window: pointed arch, warm glass, a stone sill
  const lancet = (cx, top, h, w = 6) => {
    const x0 = cx - w / 2;
    for (let y = 0; y < h; y++) {
      const inset = y < 3 ? [2, 1, 0][y] : 0;
      F(x0 - 1 + inset, top + y, w + 2 - inset * 2, 1, ST.deep);
      if (y > 0) F(x0 + inset, top + y, w - inset * 2, 1, y < h * 0.45 ? '#ffd98a' : '#f0a94a');
    }
    F(cx - 0.5, top + 2, 1, h - 2, '#6f4a2a');
    F(x0 - 2, top + h, w + 4, 2, ST.hi); F(x0 - 2, top + h + 1, w + 4, 1, ST.dark);
  };

  // --- side aisles (lower, behind the nave front) ---
  const aisleTop = 84;
  stone(10, aisleTop, 34, H - aisleTop, 0.08); stone(100, aisleTop, 34, H - aisleTop, 0.08);
  // lean-to roofs sloping down from the nave
  const lt = [];
  for (let y = 68; y < aisleTop; y++) { const t = (y - 68) / (aisleTop - 68); lt.push([y, Math.round(42 - t * 34), 44]); }
  slope(lt);
  const rt = [];
  for (let y = 68; y < aisleTop; y++) { const t = (y - 68) / (aisleTop - 68); rt.push([y, 100, Math.round(102 + t * 34)]); }
  slope(rt);
  F(8, aisleTop - 1, 36, 2, SL.line); F(100, aisleTop - 1, 36, 2, SL.line);
  lancet(26, 98, 22); lancet(118, 98, 22);
  // ivy climbing the left aisle: a humble, lived-in chapel
  for (let i = 0; i < 70; i++) { const x = 10 + Math.floor(Math.pow(R(), 1.6) * 20), y = H - 1 - Math.floor(R() * 50 * (1 - (x - 10) / 30)); P(x, y, R() < 0.5 ? '#3f6e2f' : '#5b9541'); }

  // --- the nave: a gabled front with its roof edges ---
  const peak = 22, eaveY = 64, nx0 = 40, nx1 = 104;
  stone(nx0, eaveY, nx1 - nx0, H - eaveY);
  // gable triangle of stone
  for (let y = peak + 6; y < eaveY; y++) {
    const half = ((y - peak) / (eaveY - peak)) * ((nx1 - nx0) / 2 + 6);
    const xa = Math.round(72 - half), xb = Math.round(72 + half);
    for (let x = Math.max(nx0, xa); x < Math.min(nx1, xb); x++) P(x, y, ((y >> 1) + (x >> 3)) % 7 === 0 ? ST.lo : (y % 6 === 0 ? ST.mortar : ST.base));
  }
  // slate bargeboards: thick roof edges running down from the peak
  for (let y = peak; y < eaveY + 6; y++) {
    const half = ((y - peak) / (eaveY - peak)) * ((nx1 - nx0) / 2 + 6);
    for (let d = 0; d < 6; d++) { P(Math.round(72 - half) - d, y, d === 0 ? SL.hi : d > 3 ? SL.line : SL.base); P(Math.round(72 + half) + d - 1, y, d === 0 ? SL.hi : d > 3 ? SL.line : SL.base); }
  }
  // a carved string course across the front
  F(nx0, eaveY + 14, nx1 - nx0, 2, ST.hi); F(nx0, eaveY + 16, nx1 - nx0, 1, ST.dark);

  // --- rose window ---
  const rx = 72, ry = 56, rr = 11;
  for (let y = -rr - 2; y <= rr + 2; y++) for (let x = -rr - 2; x <= rr + 2; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > rr + 2) continue;
    if (d > rr) { P(rx + x, ry + y, d > rr + 1 ? ST.dark : ST.hi); continue; }
    const a = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2), seg = Math.floor(a * 8);
    let col = ['#e3b93c', '#b9343c', '#3b6fc4', '#e3b93c', '#3f8f7a', '#b9343c', '#3b6fc4', '#7b4bb5'][seg];
    if (d < 3.2) col = '#fff1b0';
    else if (Math.abs(d - 6.5) < 0.7 || Math.abs(a * 8 - Math.round(a * 8)) < 0.08 * (rr / Math.max(d, 1))) col = ST.deep;
    P(rx + x, ry + y, col);
  }

  // --- bell-cote on the peak, crowned by Aurel's sun-disc ---
  F(64, 10, 16, 16, ST.base); F(64, 10, 16, 1, ST.hi); F(64, 25, 16, 1, ST.dark);
  F(66, 13, 12, 11, '#2a2230'); for (let y = 13; y < 16; y++) { F(66, y, [4, 2, 1][y - 13], 1, ST.base); F(78 - [4, 2, 1][y - 13], y, [4, 2, 1][y - 13], 1, ST.base); }
  F(69, 15, 6, 1, '#a8801f'); F(68, 16, 8, 5, '#e3b93c'); F(68, 16, 2, 4, '#fff1b0'); F(67, 21, 10, 1, '#a8801f'); P(72, 22, '#a8801f');
  F(62, 8, 20, 2, SL.base); F(62, 8, 20, 1, SL.hi); F(64, 6, 16, 2, SL.lo);
  // the sun-disc finial
  const sx = 72, sy = 2;
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) P(sx + x, sy + y + 1, x * x + y * y <= 2 ? '#fff1b0' : '#e3b93c');
  for (const [dx, dy] of [[-5, 1], [5, 1], [0, -3], [-4, -2], [4, -2]]) P(sx + dx, sy + dy + 1, '#e3b93c');
  F(71, 6, 2, 2, '#a8801f');

  // --- buttresses framing the front ---
  for (const bx of [nx0 - 4, nx1 - 2]) {
    stone(bx, eaveY + 18, 6, H - eaveY - 18, 0.12);
    F(bx, eaveY + 18, 6, 1, ST.hi); F(bx - 1, eaveY + 40, 8, 2, ST.hi); F(bx - 1, eaveY + 42, 8, 1, ST.dark);
  }
  // lancets either side of the door
  lancet(52, 92, 26); lancet(92, 92, 26);

  // --- the doorway: a deep round arch, two rings of voussoirs, oak doors with iron ---
  const dx0 = 60, dx1 = 84, dTop = 104;
  for (let ring = 2; ring >= 0; ring--) {
    const w = (dx1 - dx0) / 2 + ring * 3, cy = dTop + 12;
    for (let y = cy - w; y < H; y++) {
      const half = y < cy ? Math.sqrt(Math.max(0, w * w - (cy - y) * (cy - y))) : w;
      F(Math.round(72 - half), y, Math.round(half * 2), 1, ring === 2 ? ST.hi : ring === 1 ? ST.dark : '#3a2410');
    }
  }
  for (let y = dTop + 2; y < H - 4; y++) {
    const w = 10, cy = dTop + 12, half = y < cy ? Math.sqrt(Math.max(0, w * w - (cy - y) * (cy - y))) : w;
    F(Math.round(72 - half), y, Math.round(half * 2), 1, (Math.round(72 - half) + y) % 4 ? '#8a5a2b' : '#7a4f25');
  }
  F(71, dTop + 3, 2, H - dTop - 7, '#3a2410');
  for (const y of [118, 130]) F(62, y, 20, 1, '#4a4a4a');
  for (const [x, y] of [[66, 124], [77, 124]]) { P(x, y, '#e3b93c'); P(x, y - 1, '#fff1b0'); }
  // a small sun carved in the tympanum
  P(72, dTop + 5, '#e3b93c'); P(71, dTop + 6, '#e3b93c'); P(73, dTop + 6, '#e3b93c'); P(72, dTop + 7, '#e3b93c');
  // worn steps
  F(54, H - 4, 36, 2, ST.hi); F(54, H - 2, 36, 2, ST.lo); F(58, H - 6, 28, 2, ST.base); F(58, H - 6, 28, 1, ST.hi);

  // --- a soft dark edge so the whole building sits apart from the grass ---
  const img = g.getImageData(0, 0, W, H), d = img.data, a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[(y * W + x) * 4 + 3];
  const edge = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1))) edge.push([x, y]);
  for (const [x, y] of edge) P(x, y, OUT);
  return c;
}
const LANDMARK_ART = { temple: templeArt };
const landmarkCache = {};
const landmarkCanvas = k => landmarkCache[k] || (landmarkCache[k] = smooth2x(LANDMARK_ART[k]()));

// The parsonage: a small stone lean-to built onto the temple's west aisle, sharing its stone and slate.
// 74×80 art pixels (4 tiles and a bit, 5 tiles tall); its right edge meets the temple's aisle wall.
function parsonageArt() {
  const W = 74, H = 80, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(91);
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const P = (x, y, col) => F(x, y, 1, 1, col);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const ST = { base: '#d8cdb6', hi: '#ece3d0', lo: '#b9ad93', mortar: '#a4977c', dark: '#8f8268', deep: '#6f6450' };
  const SL = { base: '#5f6b7d', hi: '#8a97aa', lo: '#46505f', line: '#353d4a' };
  // chimney first, so the roof sits in front of its base
  F(12, 2, 10, 30, ST.mortar);
  for (let y = 2; y < 32; y += 4) { F(12, y, 10, 3, y % 8 ? ST.base : ST.lo); F(12, y, 10, 1, ST.hi); }
  F(10, 0, 14, 3, ST.dark); F(10, 0, 14, 1, ST.hi);
  // stone walls
  const wallTop = 36;
  F(0, wallTop, W, H - wallTop, ST.mortar);
  for (let y = wallTop, r = 0; y < H; y += 6, r++) {
    let x = -(r % 2 ? ri(3, 7) : 0);
    while (x < W) { const bw = ri(8, 12), xa = Math.max(0, x + 1), xb = Math.min(W, x + bw), hh = Math.min(5, H - y); if (xb > xa) { F(xa, y, xb - xa, hh, R() < 0.25 ? ST.lo : ST.base); F(xa, y, xb - xa, 1, ST.hi); } x += bw; }
  }
  // lean-to roof: high against the temple, low over the garden
  for (let x = 0; x < W; x++) {
    const top = Math.round(wallTop - (x / W) * 16);
    for (let y = top; y < wallTop + 3; y++) {
      const course = y - top;
      P(x, y, y >= wallTop ? SL.line : course % 4 === 3 ? SL.line : (x + (course >> 2) * 2) % 5 === 0 ? SL.lo : SL.base);
      if (course % 4 === 0 && (x + (course >> 2) * 2) % 5 === 1) P(x, y, SL.hi);
    }
    P(x, top, SL.hi);
  }
  // a cottage window, lit from inside, with shutters and a flower box
  const wx = 8, wy = 48;
  F(wx - 4, wy - 1, 3, 15, '#4f7a3a'); F(wx + 15, wy - 1, 3, 15, '#4f7a3a');
  F(wx - 1, wy - 1, 16, 15, '#3a2410'); F(wx, wy, 14, 13, '#ffd98a'); F(wx, wy + 7, 14, 6, '#f0a94a'); F(wx + 6, wy, 2, 13, '#3a2410'); F(wx, wy + 6, 14, 1, '#3a2410');
  F(wx + 1, wy + 1, 3, 2, '#fff1c0');
  F(wx - 2, wy + 13, 18, 3, '#7a4b23'); F(wx - 2, wy + 13, 18, 1, '#94602f');
  for (const [x, col] of [[wx, '#d6336c'], [wx + 3, '#f2c94c'], [wx + 6, '#f4f0e6'], [wx + 9, '#d6336c'], [wx + 12, '#9a7ce0']]) { P(x, wy + 12, col); P(x + 1, wy + 12, '#4f7a3a'); }
  // the door: low, rounded, oak, with a lantern beside it
  const dx = 34, dTop = 54;
  for (let y = dTop; y < H; y++) { const half = y < dTop + 6 ? Math.round(Math.sqrt(36 - (dTop + 6 - y) ** 2)) : 6; F(40 - half - 2, y, half * 2 + 4, 1, ST.dark); F(40 - half, y, half * 2, 1, (y + half) % 4 ? '#8a5a2b' : '#7a4f25'); }
  F(39, dTop + 1, 1, H - dTop - 2, '#5e3a1a'); P(44, 68, '#e3b93c'); P(44, 67, '#fff1b0');
  F(30, H - 2, 20, 2, ST.hi);
  F(52, 52, 1, 6, '#3a2410'); F(50, 57, 5, 6, '#3a2410'); F(51, 58, 3, 4, '#ffd27a'); P(52, 58, '#fff1b0');
  // ivy and a bench by the door
  for (let i = 0; i < 40; i++) { const x = 58 + Math.floor(Math.pow(R(), 1.5) * 15), y = H - 1 - Math.floor(R() * 30 * (1 - (x - 58) / 16)); P(x, y, R() < 0.5 ? '#3f6e2f' : '#5b9541'); }
  F(56, 70, 12, 2, '#8a5a2b'); F(56, 70, 12, 1, '#a8743c'); F(57, 72, 2, 6, '#5e3a1a'); F(65, 72, 2, 6, '#5e3a1a');
  // outline everything that isn't touching the temple wall on the right
  const img = g.getImageData(0, 0, W, H), d = img.data, a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[(y * W + x) * 4 + 3];
  const edge = []; for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (!a(x, y) && (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1))) edge.push([x, y]);
  for (const [x, y] of edge) P(x, y, '#2a2230');
  return c;
}
LANDMARK_ART.parsonage = parsonageArt;

// ---------------- the ground, painted natively on the 32 grid ----------------
// Textures use noise that wraps at the tile edge, so neighbouring tiles join without seams.
function paint32(fn, seed = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), R = rng(seed * 7919 + 77);
  const P = (x, y, col) => { x = ((x % 32) + 32) % 32; y = ((y % 32) + 32) % 32; g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  // wrapping value noise: smooth blotches at a given cell size
  const lat = {};
  const L = (i, j, k) => { const key = i + ',' + j + ',' + k; if (lat[key] === undefined) lat[key] = R(); return lat[key]; };
  const noise = (x, y, cell, k = 0) => {
    const n = 32 / cell, fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), w = v => ((v % n) + n) % n;
    const a = L(w(x0), w(y0), k), b = L(w(x0 + 1), w(y0), k), c2 = L(w(x0), w(y0 + 1), k), d = L(w(x0 + 1), w(y0 + 1), k);
    return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy;
  };
  fn({ g, P, F, R, ri, noise, pick: arr => arr[Math.floor(R() * arr.length)] });
  return c;
}
// pick from a ramp by a 0..1 value, with a little ordered dithering at the boundaries
const ramp = (cols, v, x, y) => { const b = ((x * 3 + y * 5) % 4) / 4 - 0.375; const i = Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length + b * 0.35))); return cols[i]; };

const GRASS32 = { ramp: ['#53792f', '#608837', '#6d943e', '#7aa046'], blade: '#476a2a', tip: '#94bb5a', flower: ['#f4efd8', '#f2cf55', '#e7779b', '#b8a3ee'] };
const WOODS32 = { ramp: ['#3c6627', '#47742d', '#538133', '#5f8e3a'], blade: '#33571f', tip: '#77a84a', flower: ['#f4efd8', '#d9c35a'], litter: ['#8a6a34', '#9c7a3c', '#6e5a2c', '#a8743c'] };
function grass32(seed, P_, flowers) {
  return paint32(t => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = 0.5 + (t.noise(x, y, 8, 1) - 0.5) * 0.6 + (t.noise(x, y, 4, 2) - 0.5) * 0.3;
      t.P(x, y, ramp(P_.ramp, v, x, y));
    }
    // blades: short strokes, dark with a lit tip, leaning a little
    for (let i = 0; i < 46; i++) { const x = t.ri(0, 31), y = t.ri(0, 31), h = t.ri(2, 3), lean = t.R() < 0.5 ? 0 : (t.R() < 0.5 ? -1 : 1); for (let k = 0; k < h; k++) t.P(x + (k === h - 1 ? lean : 0), y - k, P_.blade); t.P(x + lean, y - h, P_.tip); }
    if (P_.litter) for (let i = 0; i < 7; i++) { const x = t.ri(0, 31), y = t.ri(0, 31), c = t.pick(P_.litter); t.P(x, y, c); t.P(x + 1, y, c); }
    if (t.R() < 0.4) { const x = t.ri(4, 27), y = t.ri(4, 27); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 1]]) t.P(x + dx, y + dy, '#86b84e'); t.P(x, y, '#9ccc60'); }
    if (flowers) for (let i = 0; i < 6; i++) { const x = t.ri(2, 29), y = t.ri(3, 29), c = t.pick(P_.flower); t.P(x, y + 1, P_.blade); t.P(x, y, c); t.P(x - 1, y, c); t.P(x + 1, y, c); t.P(x, y - 1, c); t.P(x, y, '#fff3b0'); }
  }, seed);
}
function dirt32(seed) {
  const C = ['#9c7848', '#a98454', '#b48f5e', '#bf9b69'];
  return paint32(t => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) t.P(x, y, ramp(C, 0.5 + (t.noise(x, y, 8, 0) - 0.5) * 0.6 + (t.noise(x, y, 4, 1) - 0.5) * 0.35, x, y));
    // ruts and footprints, then pebbles with a lit top and a shadow below
    for (let i = 0; i < 5; i++) { const x = t.ri(0, 31), y = t.ri(0, 31), w = t.ri(3, 6); for (let k = 0; k < w; k++) t.P(x + k, y, '#8c6a3e'); for (let k = 1; k < w - 1; k++) t.P(x + k, y - 1, '#c9a674'); }
    for (let i = 0; i < 7; i++) { const x = t.ri(0, 31), y = t.ri(0, 31), big = t.R() < 0.4; t.P(x, y, '#d8c8a4'); if (big) { t.P(x + 1, y, '#c8b48c'); t.P(x, y + 1, '#b8a07a'); t.P(x + 1, y + 1, '#8a6a42'); t.P(x + 2, y + 1, '#7a5c38'); } else t.P(x + 1, y + 1, '#7a5c38'); }
  }, seed);
}
function cobble32(seed) {
  return paint32(t => {
    t.F(0, 0, 32, 32, '#7d7362');
    // rounded stones in loose rows; each lit from the upper left with a shadow on the lower right
    for (let row = 0, y = 0; y < 32; row++, y += 7) {
      let x = row % 2 ? -t.ri(2, 4) : 0;
      while (x < 32) {
        const w = t.ri(6, 9), h = 6, base = t.pick(['#b8ad97', '#aca08a', '#c2b7a1', '#a39783', '#b4a58c']);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w - 1; xx++) {
          const cx = (xx + 0.5 - (w - 1) / 2) / ((w - 1) / 2), cy = (yy + 0.5 - h / 2) / (h / 2);
          if (cx * cx + cy * cy > 1.15) continue;
          let col = base;
          if (cx + cy < -0.9) col = '#d8cfbc'; else if (cx + cy < -0.45) col = shadeC(base, 1.08); else if (cx + cy > 0.95) col = '#857a66'; else if (cx + cy > 0.5) col = shadeC(base, 0.9);
          t.P(x + xx, y + yy, col);
        }
        if (t.R() < 0.25) t.P(x + t.ri(1, w - 3), y + t.ri(1, 4), '#968a74');
        x += w;
      }
    }
    for (let i = 0; i < 4; i++) t.P(t.ri(0, 31), t.ri(0, 31), '#6e8a3a');
  }, seed);
}
function planks32(seed) {
  return paint32(t => {
    for (let row = 0; row < 4; row++) {
      const y = row * 8, base = t.pick(['#a7774a', '#9c6e44', '#b17f4f', '#a47448']);
      t.F(0, y, 32, 7, base);
      for (let i = 0; i < 6; i++) { const yy = y + t.ri(1, 5), x = t.ri(0, 24), w = t.ri(5, 12); for (let k = 0; k < w; k++) t.P(x + k, yy, shadeC(base, 0.9)); }
      t.F(0, y, 32, 1, shadeC(base, 1.12));
      t.F(0, y + 7, 32, 1, '#5c3c22');
      const seam = t.ri(4, 27); t.F(seam, y, 1, 7, '#5c3c22'); t.P(seam + 1, y + 1, shadeC(base, 1.1));
      for (const nx of [seam - 2, seam + 3]) { t.P(nx, y + 2, '#4a3220'); t.P(nx, y + 5, '#4a3220'); }
      if (t.R() < 0.35) { const kx = t.ri(3, 28), ky = y + t.ri(2, 4); t.P(kx, ky, '#6e4a2b'); t.P(kx + 1, ky, '#7a5232'); t.P(kx, ky + 1, '#7a5232'); }
    }
  }, seed);
}
function water32(seed, deep) {
  const C = deep ? ['#1f3e52', '#244a60', '#2a566d'] : ['#2f679b', '#3674aa', '#3d80b6', '#4a8cc0'];
  return paint32(t => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) t.P(x, y, ramp(C, t.noise(x, y, 16, 0) * 0.7 + t.noise(x, y, 8, 1) * 0.3, x, y));
    // ripples: short crescents of light with a darker trough beneath
    for (let i = 0; i < 6; i++) { const x = t.ri(0, 31), y = t.ri(0, 31), w = t.ri(4, 7); for (let k = 0; k < w; k++) { const lift = (k === 0 || k === w - 1) ? 1 : 0; t.P(x + k, y + lift, deep ? '#3f7a92' : '#7fb3dd'); t.P(x + k, y + 1 + lift, deep ? '#1a3446' : '#2c5f90'); } }
    for (let i = 0; i < 2; i++) { const x = t.ri(1, 30), y = t.ri(1, 30); t.P(x, y, '#d8eefc'); }
  }, seed);
}
function shadeC(hex, f) { const h = hex.replace('#', ''); return '#' + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join(''); }

// cave floors and walls, one ramp per theme, sharing CAVE_PAL's character
const CAVE32 = {
  cave:  { fl: ['#5f584f', '#6b645a', '#776f64', '#827a6e'], top: ['#262225', '#2e2a2d', '#363134'], face: ['#4a433d', '#575049', '#665d55', '#766c62'], rim: '#9a9083' },
  g:     { fl: ['#5c4535', '#684e3c', '#755843', '#81624b'], top: ['#2a1f19', '#33261f', '#3c2d24'], face: ['#4f3626', '#5e412e', '#6c4a35', '#7b553e'], rim: '#a07656' },
  r:     { fl: ['#454f3b', '#4f5a44', '#59654c', '#637056'], top: ['#1c2219', '#232b20', '#2a3326'], face: ['#38422f', '#434e39', '#4e5a42', '#5a674c'], rim: '#7d8c66' },
  h:     { fl: ['#3f4656', '#495060', '#535b6c', '#5e6678'], top: ['#191c25', '#20242e', '#272c38'], face: ['#394052', '#434b5f', '#4e576c', '#59627a'], rim: '#8993ae' },
  s:     { fl: ['#8f7649', '#9c8253', '#a98e5d', '#b69a68'], top: ['#33281b', '#3c2f20', '#463726'], face: ['#7a6038', '#876b40', '#957749', '#a38352'], rim: '#c9a96e' },
  deep:  { fl: ['#2f2527', '#372b2d', '#3f3234', '#48393b'], top: ['#130c0e', '#191013', '#1f1417', '#120a0c'], face: ['#2e2022', '#38282a', '#433033', '#4e383b'], rim: '#6e4a48' },
  mountain: { fl: ['#6f6a62', '#7d786f', '#8c867c', '#9c968c'], top: ['#3f5530', '#4a6236', '#566f3e', '#62793f'], face: ['#5f5a54', '#6f6a62', '#827c72', '#958f84', '#a8a296'], rim: '#c2bcae' },
  house: { top: ['#3a2618', '#422c1d', '#4a3222'], face: ['#cdbb97', '#d8c8a6', '#e2d4b4', '#ebdfc2'], rim: '#7a5434' },
};
function caveFloor32(th, seed, detail) {
  const C = CAVE32[th];
  return paint32(t => {
    if (th === 's') {
      // laid sandstone flags, four to a tile
      for (const [x0, y0] of [[0, 0], [16, 0], [0, 16], [16, 16]]) { const base = t.pick(C.fl); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.P(x0 + x, y0 + y, t.noise(x0 + x, y0 + y, 4, 0) < 0.3 ? shadeC(base, 0.95) : base); t.F(x0, y0, 16, 1, shadeC(base, 1.1)); t.F(x0, y0, 1, 16, shadeC(base, 1.06)); t.F(x0, y0 + 15, 16, 1, '#6e5634'); t.F(x0 + 15, y0, 1, 16, '#7d6640'); }
      if (detail) { for (let a = 0; a < 12; a++) t.P(16 + Math.round(Math.cos(a / 12 * 6.28) * 4), 16 + Math.round(Math.sin(a / 12 * 6.28) * 4), '#e3b93c'); t.P(16, 16, '#fff1b0'); }
      return;
    }
    // fine grain only; the broad light and dark patches are laid over the whole floor at once
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) t.P(x, y, ramp(C.fl, 0.5 + (t.noise(x, y, 8, 1) - 0.5) * 0.55 + (t.noise(x, y, 4, 2) - 0.5) * 0.35, x, y));
    // cracks wander a little, with a lit lip on one side
    for (let i = 0; i < 2; i++) if (t.R() < 0.7) { let x = t.ri(2, 29), y = t.ri(2, 29); for (let k = 0; k < t.ri(5, 10); k++) { t.P(x, y, shadeC(C.fl[0], 0.72)); t.P(x, y - 1, shadeC(C.fl[3], 1.05)); x += t.ri(0, 1) ? 1 : 0; y += t.ri(-1, 1); } }
    for (let i = 0; i < 6; i++) { const x = t.ri(0, 31), y = t.ri(0, 31); t.P(x, y, shadeC(C.fl[3], 1.12)); t.P(x + 1, y + 1, shadeC(C.fl[0], 0.7)); }
    if (!detail) return;
    if (th === 'cave') for (const [x, y] of [[9, 18], [14, 21], [20, 16]]) { t.F(x - 2, y, 5, 2, '#d8cbb0'); t.F(x - 1, y - 1, 3, 1, '#e8dcc4'); t.F(x, y + 2, 1, 3, '#cdbf9f'); }
    if (th === 'g') { t.F(6, 18, 18, 4, '#8a5a2b'); t.F(6, 18, 18, 1, '#a8743c'); t.P(10, 20, '#3a2410'); t.P(19, 20, '#3a2410'); }
    if (th === 'r') { for (let y = 12; y < 22; y++) for (let x = 6; x < 26; x++) { const cx = (x - 16) / 10, cy = (y - 17) / 5; if (cx * cx + cy * cy < 1) t.P(x, y, cx * cx + cy * cy < 0.35 ? '#b5d06a' : '#8fae4a'); } }
    if (th === 'h') for (const [x, y, h] of [[15, 10, 12], [9, 18, 6], [21, 19, 5]]) { t.F(x, y, 3, h, '#7fb6d6'); t.F(x, y, 1, h, '#c9ecff'); t.P(x + 1, y - 1, '#e6f6ff'); }
    if (th === 'deep') { let x = 1, y = t.ri(10, 20); for (let k = 0; k < 30; k++) { t.P(x, y, '#c2412d'); if (k % 3 === 1) t.P(x, y - 1, '#f08a3a'); x++; if (t.R() < 0.4) y += t.ri(-1, 1); } }
  }, seed);
}
function caveWall32(th, seed, face) {
  const C = CAVE32[th];
  const top = face ? (th === 'house' ? 6 : 12) : 32;
  return paint32(t => {
    for (let y = 0; y < top; y++) for (let x = 0; x < 32; x++) t.P(x, y, th === 'house' ? (y % 3 === 0 ? C.top[2] : C.top[1]) : ramp(C.top, t.noise(x, y, 8, 0) * 0.7 + t.noise(x, y, 4, 1) * 0.3, x, y));
    if (!face) return;
    t.F(0, top, 32, 1, C.rim);
    if (th === 'house') {
      for (let y = top + 1; y < 32; y++) for (let x = 0; x < 32; x++) t.P(x, y, ramp(C.face, 0.55 + (t.noise(x, y, 8, 3) - 0.5) * 0.4, x, y));
      t.F(0, 20, 32, 1, '#8e6440'); t.F(0, 21, 32, 9, '#7a5434'); for (let x = 2; x < 32; x += 8) t.F(x, 21, 1, 9, '#5e3f25'); t.F(0, 21, 32, 1, '#9a7048'); t.F(0, 30, 32, 2, '#3a2618');
      return;
    }
    // the face: strata and fractures, lit from above, darkening toward the floor
    for (let y = top + 1; y < 32; y++) for (let x = 0; x < 32; x++) { const k = (y - top) / (32 - top), v = t.noise(x, y, 8, 4) * 0.5 + t.noise(x * 2, y, 8, 5) * 0.25 + (1 - k) * 0.35; t.P(x, y, ramp(C.face, v, x, y)); }
    for (let i = 0; i < 3; i++) { const y = t.ri(top + 4, 26); let x = t.ri(0, 12); const len = t.ri(8, 18); for (let k = 0; k < len; k++) { t.P(x + k, y, shadeC(C.face[0], 0.8)); t.P(x + k, y - 1, C.face[3]); } }
    for (let i = 0; i < 4; i++) { const x = t.ri(0, 31); let y = t.ri(top + 2, 22); for (let k = 0; k < t.ri(3, 7); k++) { t.P(x + (k % 3 === 2 ? 1 : 0), y++, shadeC(C.face[0], 0.75)); } }
    t.F(0, top + 1, 32, 1, C.face[3]);
    t.F(0, 29, 32, 3, shadeC(C.face[0], 0.82));
    if (th === 'r') for (let i = 0; i < 3; i++) { const x = t.ri(0, 30); t.F(x, top + 1, 1, t.ri(3, 9), '#8fae4a'); }
    if (th === 'h') for (let i = 0; i < 2; i++) { const x = t.ri(3, 28), y = t.ri(top + 4, 24); t.P(x, y, '#a9e0ff'); t.P(x, y + 1, '#7fb6d6'); t.P(x + 1, y + 1, '#7fb6d6'); }
    if (th === 'deep') for (let i = 0; i < 2; i++) { const x = t.ri(3, 28), y = t.ri(top + 4, 24); t.P(x, y, '#c2412d'); t.P(x, y + 1, '#f08a3a'); }
    if (th === 's') { t.F(0, top + 9, 32, 1, C.rim); for (let x = 3; x < 32; x += 8) t.P(x, top + 9, '#e3b93c'); }
  }, seed);
}
// replace the old 16-grid ground with the native 32 versions
function nativeGround() {
  const many = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
  const set = (k, arr) => { TILE[k] = arr; NATIVE32.add(k); };
  set('grass', many(6, s => grass32(s, GRASS32)));
  set('flowers', many(3, s => grass32(s + 20, GRASS32, true)));
  set('woods', many(6, s => grass32(s + 40, WOODS32)));
  set('woodsFlowers', many(2, s => grass32(s + 60, WOODS32, true)));
  set('dirt', many(5, s => dirt32(s)));
  set('cobble', many(5, s => cobble32(s)));
  set('planks', many(5, s => planks32(s)));
  set('water', many(4, s => water32(s)));
  for (const th in CAVE32) {
    if (th !== 'house') { set('floor_' + th, many(5, s => caveFloor32(th, s))); set('floorDetail_' + th, many(2, s => caveFloor32(th, s + 30, true))); }
    set('wall_' + th, many(4, s => caveWall32(th, s)));
    set('wallFace_' + th, many(4, s => caveWall32(th, s + 10, true)));
  }
}

// ---------------- trees, drawn large on the 32 grid ----------------
// A tree is several tiles tall: a trunk on its own tile and a crown of leaf clusters spreading over its
// neighbours. Each cluster is shaded as a ball lit from the upper left; the silhouette gets a dark rim.
const TREE_KINDS = {
  oak:    { leaves: ['#2c4f22', '#38612a', '#467432', '#56883b', '#6c9f48', '#88b85a'], bark: ['#4a3626', '#5e4430', '#73553c'], w: 88, h: 112, crown: [44, 54, 34, 30], trunk: 7 },
  autumn: { leaves: ['#6a4818', '#835a1e', '#9c6c24', '#b8842c', '#d39f3a', '#ecc25a'], bark: ['#4a3626', '#5e4430', '#73553c'], w: 88, h: 112, crown: [44, 54, 34, 30], trunk: 7 },
  birch:  { leaves: ['#3e6a28', '#4d7c30', '#5f8f38', '#74a344', '#8fba52', '#acd06a'], bark: ['#d8d4c8', '#e8e4d8', '#f4f0e6'], w: 72, h: 112, crown: [36, 50, 24, 32], trunk: 5, birch: 1 },
  pine:   { leaves: ['#1f3d26', '#284b2e', '#305a36', '#3a6a3e', '#4a7c48', '#5e9058'], bark: ['#3e2c20', '#4e3828', '#5e4430'], w: 64, h: 112, pine: 1, trunk: 6 },
};
function treeArt(kind, seed) {
  const K = TREE_KINDS[kind], W = K.w, H = K.h, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(seed * 131 + kind.length * 17);
  const img = g.createImageData(W, H), d = img.data;
  const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4, h = col.replace('#', ''); d[i] = parseInt(h.slice(0, 2), 16); d[i + 1] = parseInt(h.slice(2, 4), 16); d[i + 2] = parseInt(h.slice(4, 6), 16); d[i + 3] = 255; };
  const filled = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  const cx = W / 2, groundY = H - 4;
  // trunk with bark: fissures running up it, a knot or two, roots splaying at the foot and moss on the shaded side
  const tw = K.trunk + (R() < 0.5 ? 0 : 1), trunkTop = K.pine ? groundY - 30 : groundY - 44, lean = (R() - 0.5) * 0.12;
  const barkAt = (u, x, y) => {
    let col = u < 0.28 ? K.bark[2] : u > 0.7 ? K.bark[0] : K.bark[1];
    if (K.birch) { if (R() < 0.1 || ((y * 3 + x) % 11 === 0 && u > 0.2)) col = '#2a2626'; else if (u > 0.75) col = '#b8b2a4'; }
    else if ((Math.round(x * 2.3) + Math.floor(y / 3)) % 4 === 0 || R() < 0.05) col = shadeColor(K.bark[0], 0.8); // fissures
    return col;
  };
  for (let y = trunkTop; y <= groundY; y++) {
    const flare = y > groundY - 6 ? (y - (groundY - 6)) * 0.9 : 0, off = (groundY - y) * lean;
    for (let x = -tw / 2 - flare; x <= tw / 2 + flare; x++) {
      const u = (x + tw / 2 + flare) / (tw + flare * 2);
      let col = barkAt(u, x, y);
      if (!K.birch && y > groundY - 9 && u > 0.6 && R() < 0.5) col = R() < 0.5 ? '#4f6a30' : '#5e7a38'; // moss low on the shaded side
      set(cx + x + off, y, col);
    }
  }
  // roots: three or four reaching out into the grass
  for (const [dir, len] of [[-1, 5 + R() * 3], [1, 5 + R() * 3], [-0.4, 3], [0.6, 3]]) for (let k = 0; k < len; k++) set(cx + dir * (tw / 2 + k), groundY - 1 + Math.min(1, k / 3), k > len - 2 ? K.bark[0] : K.bark[1]);
  // a knot
  if (!K.birch && !K.pine) { const ky = trunkTop + 10 + Math.floor(R() * 14); set(cx + 1, ky, '#2e2218'); set(cx + 2, ky, K.bark[0]); set(cx + 1, ky + 1, K.bark[0]); }
  if (K.pine) {
    // tiers of needles, each wider than the one above, drooping at the tips, with a dark underside and the
    // trunk glimpsed between them; needle strokes catch the light on the left
    const tiers = 5 + (R() < 0.4 ? 1 : 0);
    for (let tier = 0; tier < tiers; tier++) {
      const top = 4 + tier * Math.round(78 / tiers), bot = top + 24, half = 8 + tier * (26 / tiers);
      for (let y = top; y < bot; y++) {
        const k = (y - top) / (bot - top);
        const w = Math.round(half * Math.pow(k, 0.8) + 2);
        for (let x = -w; x <= w; x++) {
          const edge = Math.abs(x) / Math.max(1, w), droop = edge > 0.7 ? Math.round((edge - 0.7) * 10) : 0;
          if (k > 0.86 && Math.abs(x) < w * 0.6 && R() < 0.6) continue; // the scalloped hem shows the tier below
          if ((y - top) > 2 && Math.abs(x) > w - 2 && R() < 0.35) continue;
          const lit = x < -w * 0.25 ? 4 : x < w * 0.3 ? 3 : 2;
          let v = lit - (k > 0.8 ? 2 : 0) + (R() < 0.12 ? 1 : 0);
          if ((x + y * 2) % 5 === 0 && x < 0) v += 1; // needle strokes
          set(cx + x, y + droop, K.leaves[Math.max(0, Math.min(5, v))]);
        }
      }
    }
    // a few cones
    for (let i = 0; i < 4; i++) { const x = cx - 10 + R() * 20, y = 30 + R() * 40; if (filled(Math.round(x), Math.round(y))) { set(x, y, '#6b4a2a'); set(x, y + 1, '#4e3420'); } }
  } else {
    const [ccx, ccy, rx, ry] = K.crown, clusters = [];
    // limbs from the top of the trunk out into the crown; they show through the gaps in the leaves
    const limbs = [];
    for (let i = 0; i < 4 + Math.floor(R() * 2); i++) {
      const a = -Math.PI / 2 + (i - 1.8) * 0.55 + (R() - 0.5) * 0.3, L0 = ry * (0.5 + R() * 0.35);
      const x0 = cx + (R() - 0.5) * 2, y0 = trunkTop + 4 + R() * 6;
      limbs.push([x0, y0, x0 + Math.cos(a) * L0 * (rx / ry), y0 + Math.sin(a) * L0]);
    }
    for (const [x0, y0, x1, y1] of limbs) for (let k = 0; k <= 1; k += 0.03) { const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, wd = (1 - k) * 2.2 + 0.6; for (let o = -wd / 2; o <= wd / 2; o++) set(x + o, y, o < 0 ? K.bark[1] : K.bark[0]); }
    // the crown: many overlapping clusters, each a ball of leaves lit from the upper left; the back ones darker,
    // so the crown has depth, and leaf-tips break the edge of each ball
    for (let i = 0; i < 24; i++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()); clusters.push([ccx + Math.cos(a) * rx * 0.66 * rr, ccy + Math.sin(a) * ry * 0.64 * rr, 7 + R() * 7, i < 8]); }
    clusters.sort((p, q) => (p[3] === q[3] ? p[1] - q[1] : p[3] ? -1 : 1));
    // gaps sit along the limbs, low in the crown, so you glimpse branches through the leaves
    const holes = limbs.slice(0, 3).map(([x0, y0, x1, y1]) => { const k = 0.45 + R() * 0.25; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2.2 + R() * 1.4]; });
    for (const [x0, y0, r, backC] of clusters) for (let y = Math.floor(y0 - r - 1); y <= y0 + r + 1; y++) for (let x = Math.floor(x0 - r - 1); x <= x0 + r + 1; x++) {
      const dx = (x - x0) / r, dy = (y - y0) / r, dd = dx * dx + dy * dy;
      if (dd > 1.12 || (dd > 1 && ((x * 5 + y * 3) % 4 !== 0)) || (dd > 0.84 && R() < 0.35)) continue;
      if (!backC && holes.some(([hx, hy, hr]) => (x - hx) ** 2 + (y - hy) ** 2 < hr * hr)) continue; // gaps where the limbs show
      const light = -dx * 0.55 - dy * 0.75 + (1 - dd) * 0.5;
      let v = Math.round(1.6 + light * 2.4 + (R() - 0.5) * 0.9) - (backC ? 1 : 0);
      if (dd > 0.8) v -= 1;
      // leaf texture: little two-pixel leaves, lit on top and shaded under
      if ((x * 7 + y * 13) % 9 === 0 && v > 0) { set(x, y + 1, K.leaves[Math.max(0, v - 2)]); }
      set(x, y, K.leaves[Math.max(0, Math.min(5, v))]);
    }
    // the gaps: deep shade inside the crown, with the limbs crossing them
    for (const [hx, hy, hr] of holes) for (let y = Math.floor(hy - hr); y <= hy + hr; y++) for (let x = Math.floor(hx - hr); x <= hx + hr; x++) { const dd = ((x - hx) ** 2 + (y - hy) ** 2) / (hr * hr); if (dd < 1 && filled(x, y) && !(dd > 0.6 && R() < 0.5)) set(x, y, K.leaves[dd < 0.4 ? 0 : 1]); }
    for (const [x0, y0, x1, y1] of limbs) for (let k = 0.3; k <= 1; k += 0.03) { const x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k); if (holes.some(([hx, hy, hr]) => (x - hx) ** 2 + (y - hy) ** 2 < hr * hr)) { set(x, y, K.bark[1]); set(x + 1, y, K.bark[0]); } }
    // bright specks where the sun catches single leaves, and on fruiting kinds, the fruit
    for (let i = 0; i < 40; i++) { const x = Math.round(ccx - rx * 0.7 + R() * rx * 1.2), y = Math.round(ccy - ry * 0.8 + R() * ry); if (filled(x, y)) { set(x, y, K.leaves[5]); if (R() < 0.4) set(x + 1, y, K.leaves[4]); } }
  }
  // a dark rim around the whole silhouette
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (src[(y * W + x) * 4 + 3]) continue;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + ax, yy = y + ay; if (xx >= 0 && yy >= 0 && xx < W && yy < H && src[(yy * W + xx) * 4 + 3]) { const i = (y * W + x) * 4; d[i] = 0x1e; d[i + 1] = 0x24; d[i + 2] = 0x1a; d[i + 3] = 255; break; } }
  }
  g.putImageData(img, 0, 0);
  return c;
}
const treeCache = new Map();
function treeCanvas(kind, seed, dim) {
  const key = kind + '|' + (seed % 6) + (dim ? '|d' : '');
  let c = treeCache.get(key);
  if (!c) {
    if (dim) { const b = treeCanvas(kind, seed); c = document.createElement('canvas'); c.width = b.width; c.height = b.height; const g = c.getContext('2d'); g.drawImage(b, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(10,20,9,0.55)'; g.fillRect(0, 0, c.width, c.height); }
    else c = treeArt(kind, seed % 6);
    treeCache.set(key, c);
  }
  return c;
}

// ---------------- small things on the ground, scattered by tile ----------------
// Bushes, tufts, stones, flowers, reeds, lily pads, mushrooms and fallen leaves. Purely for looks:
// they don't block anything, and each tile always gets the same ones.
function decalArt(kind, seed) {
  return paint32(t => {
    const ball = (cx, cy, r, cols) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = dx * dx + dy * dy; if (d > 1 || (d > 0.8 && t.R() < 0.4)) continue; const v = Math.round(1.5 - dx * 0.9 - dy * 1.2 + (t.R() - 0.5)); t.P(x, y, cols[Math.max(0, Math.min(cols.length - 1, v))]); } };
    const shade = (cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) { t.g.fillStyle = 'rgba(20,40,10,0.22)'; t.g.fillRect(x, y, 1, 1); } } };
    if (kind === 'bush' || kind === 'bushDark') {
      const cols = kind === 'bush' ? ['#2f5a24', '#3e6e2c', '#4f8236', '#66994a', '#82b25c'] : ['#26461f', '#305628', '#3d6830', '#4c7a3a', '#5f8e48'];
      shade(18, 26, 12, 4);
      for (let i = 0; i < 6; i++) ball(16 + t.ri(-7, 7), 20 + t.ri(-4, 3), 5 + t.R() * 3, cols);
      for (let i = 0; i < 5; i++) t.P(t.ri(9, 23), t.ri(13, 22), cols[4]);
      if (t.R() < 0.4) for (let i = 0; i < 4; i++) t.P(t.ri(10, 22), t.ri(14, 24), t.pick(['#d6336c', '#f2efe6', '#e3b93c']));
    } else if (kind === 'tuft') {
      for (let i = 0; i < 7; i++) { const x = 13 + i * 1 + t.ri(-1, 1), h = t.ri(4, 8), lean = t.ri(-1, 1); for (let k = 0; k < h; k++) t.P(x + Math.round(lean * k / h * 2), 26 - k, k < h - 2 ? '#3f6a27' : '#8fbe56'); }
    } else if (kind === 'stones') {
      for (const [x, y, w, h] of [[10, 22, 6, 4], [17, 24, 4, 3], [21, 21, 3, 2]].slice(0, t.ri(1, 3))) { t.F(x + 1, y + h, w, 1, 'rgba(20,30,10,0.3)'); t.F(x, y, w, h, '#9a958c'); t.F(x, y, w, 1, '#c6c1b6'); t.F(x + w - 1, y, 1, h, '#77726a'); t.F(x, y + h - 1, w, 1, '#6f6a62'); }
    } else if (kind === 'flowers') {
      const col = t.pick([['#f4efd8', '#fff8e0'], ['#f2cf55', '#fff1a0'], ['#e7779b', '#f8b0c8'], ['#9a7ce0', '#c8b4f4']]);
      for (let i = 0; i < 7; i++) { const x = t.ri(8, 23), y = t.ri(12, 25); t.P(x, y + 1, '#3f6a27'); t.P(x, y + 2, '#3f6a27'); t.P(x, y, col[0]); t.P(x - 1, y, col[0]); t.P(x + 1, y, col[0]); t.P(x, y - 1, col[0]); t.P(x, y, col[1]); }
    } else if (kind === 'reeds') {
      for (let i = 0; i < 6; i++) { const x = 8 + i * 3 + t.ri(-1, 1), h = t.ri(10, 16); for (let k = 0; k < h; k++) t.P(x, 30 - k, k < h - 3 ? '#5a7a32' : '#7a9a3a'); if (i % 2 === 0) { t.F(x - 1, 30 - h - 1, 3, 4, '#6e4a2a'); t.P(x - 1, 30 - h - 1, '#8a6038'); } }
    } else if (kind === 'lily') {
      for (const [cx, cy, r] of [[12, 14, 4], [21, 20, 3]]) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && !(x > 0 && Math.abs(y) < 1)) t.P(cx + x, cy + y, x + y < 0 ? '#5f9a3e' : '#4a8032'); }
      if (t.R() < 0.5) { t.P(12, 13, '#f4efd8'); t.P(11, 13, '#f8c8d8'); t.P(13, 13, '#f8c8d8'); t.P(12, 12, '#f8c8d8'); }
    } else if (kind === 'mushrooms') {
      for (const [x, y] of [[11, 22], [16, 24], [20, 21]]) { t.F(x, y, 2, 4, '#e8dcc4'); t.F(x - 2, y - 2, 6, 3, '#b9343c'); t.F(x - 1, y - 3, 4, 1, '#d84a4a'); t.P(x - 1, y - 2, '#f4efd8'); t.P(x + 2, y - 1, '#f4efd8'); }
    } else if (kind === 'leaves') {
      for (let i = 0; i < 12; i++) { const x = t.ri(4, 27), y = t.ri(4, 27), c = t.pick(['#c9862c', '#d6a03a', '#a85e22', '#e0b84a']); t.P(x, y, c); t.P(x + 1, y, shadeC(c, 0.8)); }
    } else if (kind === 'pebbles') {
      for (let i = 0; i < 5; i++) { const x = t.ri(4, 26), y = t.ri(4, 26); t.P(x, y, '#9a9488'); t.P(x + 1, y, '#8a8478'); t.P(x, y + 1, '#5a5650'); }
    } else if (kind === 'bones') {
      // old bones, half sunk in the dust: a thighbone with knobbed ends, a skull on its side, ribs and scraps
      const ink = '#2a2420', iv = '#d8cfb8', ivL = '#efe8d6', ivD = '#a89e86';
      // the thighbone, lying at a slant
      for (let k = 0; k < 13; k++) { const x = 5 + k, y = 24 - Math.round(k * 0.35); t.P(x, y - 1, ink); t.P(x, y + 2, ink); t.P(x, y, ivL); t.P(x, y + 1, ivD); }
      for (const [x, y] of [[4, 23], [18, 19]]) { t.F(x - 1, y - 1, 4, 4, ink); t.F(x, y - 1, 2, 4, ink); t.F(x - 1, y, 4, 2, ink); t.F(x, y, 2, 2, iv); t.P(x, y, ivL); t.P(x + 1, y + 1, ivD); t.P(x - 1 + 1, y + 2, iv); }
      // the skull, turned a little, with its dark sockets and a row of teeth
      const sx = 20, sy = 11;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) { const dx = (x - 4) / 4.5, dy = (y - 3.2) / 4; if (dx * dx + dy * dy > 1) continue; t.P(sx + x, sy + y, (dx + dy) < -0.6 ? ivL : (dx + dy) > 0.5 ? ivD : iv); }
      for (let x = 1; x < 8; x++) { t.P(sx + x, sy - 1, ink); } t.P(sx, sy, ink); t.P(sx + 8, sy, ink); t.P(sx - 1, sy + 3, ink); t.P(sx + 9, sy + 3, ink);
      t.F(sx + 2, sy + 3, 2, 2, ink); t.F(sx + 5, sy + 3, 2, 2, ink); t.P(sx + 4, sy + 5, ink);
      t.F(sx + 2, sy + 7, 5, 2, iv); for (let x = sx + 2; x < sx + 7; x += 2) t.P(x, sy + 8, ink); t.F(sx + 1, sy + 9, 7, 1, ink);
      // a couple of ribs and a scrap
      for (const [x0, y0] of [[8, 13], [11, 12]]) for (let k = 0; k < 6; k++) { const x = x0 + k, y = y0 + Math.round(Math.sin(k / 5 * Math.PI) * -2); t.P(x, y, iv); t.P(x, y + 1, ink); }
      t.F(13, 26, 3, 1, iv); t.P(13, 27, ink); t.P(15, 27, ink);
    }
  }, seed);
}
const decalCache = new Map();
const decal = (kind, h) => { const key = kind + (h % 3); let c = decalCache.get(key); if (!c) { c = decalArt(kind, h % 3 + kind.length * 7); decalCache.set(key, c); } return c; };
