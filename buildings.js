// The Temple Warden — the buildings of Brambleford, each drawn whole for its trade.
// A building is a spec: size in tiles, roof (r clay, h thatch, l slate), wall (K stone, W brick, H timber),
// door column, and its kind. The art gives it depth: an overhanging roof with a ridge and eaves that shade
// the wall, a darker side wall on the right, a stone foundation, set-in windows and a doorstep.
'use strict';

function buildingArt(spec) {
  const W = spec.w * 16, H = spec.h * 16, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng((spec.seed || 1) * 977 + 3);
  const F = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const P = (x, y, col) => F(x, y, 1, 1, col);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const kind = spec.kind || 'home';
  const tall = ['inn', 'townhall'].includes(kind);
  const sideW = 7, wallH = Math.min(H - 30, Math.round((tall ? 3.4 : 2.6) * 16)), wallTop = H - wallH;
  const fx0 = 3, fx1 = W - sideW - 2; // the front wall
  const doorCx = spec.door * 16 + 8;

  // ---- materials ----
  const WALLS = {
    K: { base: '#a9a39a', hi: '#c6c0b6', lo: '#8c867c', mortar: '#7f796f', side: '#7a746b', sideLo: '#5f5a52' },
    W: { base: '#a14d35', hi: '#bb6a4e', lo: '#8a3f2b', mortar: '#cbbfae', side: '#7d3a28', sideLo: '#5e2a1d' },
    H: { base: '#ece0c2', hi: '#f6eed8', lo: '#d9caa4', mortar: '#5a3a1e', side: '#c9b98f', sideLo: '#a8986f', beam: '#5a3a1e' },
  };
  const ROOFS = {
    r: { base: '#b5523b', hi: '#d47b5f', lo: '#8f3e2c', line: '#6e2c1f', ridge: '#7d3426' },
    l: { base: '#5f6b7d', hi: '#8a97aa', lo: '#4a5465', line: '#353d4a', ridge: '#3c4554' },
    h: { base: '#cfa650', hi: '#e8c97e', lo: '#a8822f', line: '#8a6a24', ridge: '#8a6a24' },
  };
  const Wm = WALLS[spec.wall] || WALLS.K, Rm = ROOFS[spec.roof] || ROOFS.l;
  // Two layers: the big surfaces (roof, walls, foundation) are painted natively on the fine 32 grid below;
  // the features (windows, doors, signs, chimneys) are drawn on the 16 grid above and doubled smoothly.
  const c32 = document.createElement('canvas'); c32.width = W * 2; c32.height = H * 2;
  const h32 = c32.getContext('2d');
  const f = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; h32.fillStyle = col; h32.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const p = (x, y, col) => f(x, y, 1, 1, col);
  const vary = (hex, amt) => shadeColor(hex, 1 + (R() - 0.5) * amt);

  // ---- walls, painted natively: dressed stone, brick, or plaster in a timber frame ----
  const wallFace = (X0, Y0, Wd, Hd, m) => {
    if (spec.wall === 'H') {
      for (let y = Y0; y < Y0 + Hd; y++) for (let x = X0; x < X0 + Wd; x++) p(x, y, R() < 0.06 ? m.lo : R() < 0.04 ? m.hi : m.base);
      for (let i = 0; i < Wd * Hd / 400; i++) { let x = X0 + ri(4, Wd - 4), y = Y0 + ri(4, Hd - 4); for (let k = 0; k < ri(3, 7); k++) { p(x, y, shadeColor(m.base, 0.88)); x += ri(-1, 1); y += 1; } }
      // the timber frame: posts, rails and braces, each with grain and a lit edge
      const beam = (x, y, w, h) => { f(x, y, w, h, m.beam); for (let k = 0; k < (w > h ? w : h); k += 5) { if (w > h) p(x + k, y + ri(1, h - 2), '#6e4a2a'); else p(x + ri(1, w - 2), y + k, '#6e4a2a'); } if (w > h) f(x, y, w, 1, '#7a5432'); else f(x, y, 1, h, '#7a5432'); };
      beam(X0, Y0, Wd, 4); beam(X0, Y0 + Hd - 6, Wd, 6);
      if (tall) beam(X0, Y0 + Math.round(Hd * 0.46), Wd, 4);
      for (let x = X0; x < X0 + Wd - 4; x += 32) beam(x, Y0, 4, Hd);
      beam(X0 + Wd - 4, Y0, 4, Hd);
      for (let x = X0 + 4; x < X0 + Wd - 30; x += 32) { const top = Y0 + 4, bot = tall ? Y0 + Math.round(Hd * 0.46) : Y0 + Hd - 6; for (let k = 0; k < 28; k++) { const yy = top + Math.round((bot - top) * k / 28); f(x + k, yy, 3, 2, m.beam); } }
    } else if (spec.wall === 'W') {
      f(X0, Y0, Wd, Hd, m.mortar);
      for (let y = Y0, r = 0; y < Y0 + Hd; y += 5, r++) for (let x = X0 - (r % 2 ? 6 : 0); x < X0 + Wd; x += 12) {
        const xa = Math.max(X0, x + 1), xb = Math.min(X0 + Wd, x + 12), base = vary(pick([m.base, m.base, m.lo, m.hi]), 0.12);
        f(xa, y, xb - xa, 4, base); f(xa, y, xb - xa, 1, shadeColor(base, 1.12)); f(xb - 1, y, 1, 4, shadeColor(base, 0.86));
        if (R() < 0.2) p(xa + ri(1, 9), y + ri(1, 3), shadeColor(base, 0.8));
      }
    } else {
      f(X0, Y0, Wd, Hd, m.mortar);
      for (let y = Y0, r = 0; y < Y0 + Hd; y += 8, r++) {
        let x = X0 - (r % 2 ? ri(4, 9) : 0);
        while (x < X0 + Wd) {
          const bw = ri(12, 20), xa = Math.max(X0, x + 1), xb = Math.min(X0 + Wd, x + bw), hh = Math.min(7, Y0 + Hd - y - 1), base = vary(R() < 0.25 ? m.lo : m.base, 0.1);
          if (xb > xa && hh > 0) {
            f(xa, y + 1, xb - xa, hh, base); f(xa, y + 1, xb - xa, 1, m.hi); f(xa, y + 1, 1, hh, shadeColor(base, 1.06));
            f(xb - 1, y + 1, 1, hh, shadeColor(base, 0.85)); f(xa, y + hh, xb - xa, 1, shadeColor(base, 0.9));
            for (let k = 0; k < 3; k++) p(xa + ri(1, Math.max(1, xb - xa - 2)), y + ri(2, hh), shadeColor(base, 0.88));
            if (y > Y0 + Hd - 20 && R() < 0.3) for (let k = 0; k < 4; k++) p(xa + ri(0, xb - xa - 1), y + hh - ri(0, 2), pick(['#5f7a3a', '#6e8a42']));
          }
          x += bw;
        }
      }
    }
  };
  wallFace(fx0 * 2, wallTop * 2, (fx1 - fx0) * 2, wallH * 2, Wm);
  // the side wall: narrower, in shadow, its courses following the front
  f(fx1 * 2, (wallTop - 4) * 2, sideW * 2, (wallH + 4) * 2, Wm.side);
  for (let y = wallTop * 2; y < H * 2; y += spec.wall === 'W' ? 5 : 8) { f(fx1 * 2, y, sideW * 2, 1, Wm.sideLo); for (let x = fx1 * 2 + ((y >> 3) % 2 ? 5 : 0); x < (fx1 + sideW) * 2; x += 12) f(x, y, 1, spec.wall === 'W' ? 5 : 8, Wm.sideLo); }
  f(fx1 * 2, (wallTop - 4) * 2, 2, (wallH + 4) * 2, shadeColor(Wm.sideLo, 0.85));
  // foundation: rough fieldstones at the foot of the walls
  const fy = (H - 5) * 2;
  const foundation = () => {
    f((fx0 - 1) * 2, fy, (fx1 - fx0 + sideW + 1) * 2, 10, '#5f5a52');
    for (let x = (fx0 - 1) * 2; x < (fx1 + sideW) * 2; ) { const w = ri(7, 12), base = pick(['#8a857c', '#7d786f', '#938e84', '#858077']); f(x + 1, fy + 1, w - 1, 8, base); f(x + 1, fy + 1, w - 1, 1, '#b0aba1'); f(x + w - 1, fy + 1, 1, 8, '#6a655d'); x += w; }
    f((fx0 - 1) * 2, fy, (fx1 - fx0 + 1) * 2, 1, '#a39e94');
  };
  foundation();

  // ---- windows and doors, drawn natively on the fine grid in a layer of their own ----
  // (signs, lanterns and awnings on the doubled layer still sit in front of them)
  const smokes = [];
  const cd = document.createElement('canvas'); cd.width = W * 2; cd.height = H * 2;
  const gd = cd.getContext('2d');
  const fd = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; gd.fillStyle = col; gd.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const pd = (x, y, col) => fd(x, y, 1, 1, col);
  const mixC = (a, b, k) => { const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const timber = spec.wall === 'H';
  const STONE = ['#c9c2b4', '#bdb6a8', '#d3ccbe', '#b4ad9f'];
  const windows = [];
  const windowAt = (cx, y, w = 10, h = 12, opts = {}) => {
    const Wd = w * 2, Hd = h * 2, X = Math.round(cx * 2 - Wd / 2), Y = y * 2, frame = opts.frame || '#3a2410';
    // the head above: a stone lintel with a keystone, or a timber header
    if (timber) { fd(X - 4, Y - 6, Wd + 8, 4, '#5a3a1e'); fd(X - 4, Y - 6, Wd + 8, 1, '#7a5432'); }
    else { fd(X - 5, Y - 7, Wd + 10, 5, '#bdb6a8'); fd(X - 5, Y - 7, Wd + 10, 1, '#e2dbcd'); for (let x = X - 5; x < X + Wd + 5; x += 7) fd(x, Y - 6, 1, 4, '#9c968a'); fd(X + Wd / 2 - 3, Y - 8, 6, 7, '#d3ccbe'); fd(X + Wd / 2 - 3, Y - 8, 6, 1, '#efe8da'); fd(X + Wd / 2 + 2, Y - 7, 1, 6, '#a39d92'); }
    fd(X - 5, Y - 2, Wd + 10, 2, 'rgba(20,10,30,0.3)');
    // the frame
    fd(X - 3, Y - 2, Wd + 6, Hd + 4, frame); fd(X - 3, Y - 2, Wd + 6, 1, shadeColor(frame, 1.7)); fd(X - 3, Y - 2, 1, Hd + 4, shadeColor(frame, 1.5));
    // the glass: the sky reflected above, the dim room behind it below
    const sky = opts.glass ? mixC(opts.glass, '#8aa3b8', 0.5) : '#7f9cb4', room = opts.glass2 ? mixC(opts.glass2, '#2b3644', 0.6) : '#2b3644';
    for (let j = 0; j < Hd; j++) fd(X, Y + j, Wd, 1, mixC(sky, room, Math.min(1, j / Hd * 1.25)));
    fd(X, Y + Math.round(Hd * 0.62), Wd, Math.round(Hd * 0.38), 'rgba(140,90,40,0.28)');
    if (opts.curtain !== false && R() < 0.55) { const cu = pick(['#9e2c32', '#3b6fc4', '#e8dcc0', '#6e8a3a', '#7b4bb5']); fd(X, Y, 3, Hd, cu); fd(X + Wd - 3, Y, 3, Hd, cu); fd(X + 1, Y, 1, Hd, shadeColor(cu, 0.75)); fd(X + Wd - 2, Y, 1, Hd, shadeColor(cu, 0.75)); fd(X, Y, Wd, 2, cu); }
    // depth: the frame shades the glass along the top and left
    fd(X, Y, Wd, 2, 'rgba(10,8,20,0.45)'); fd(X, Y, 2, Hd, 'rgba(10,8,20,0.32)');
    // a streak of reflected light
    for (let k = 0; k < Math.min(Wd, Hd) * 0.55; k++) { pd(X + 4 + k * 0.6, Y + Hd - 4 - k, 'rgba(255,255,255,0.28)'); pd(X + 5 + k * 0.6, Y + Hd - 4 - k, 'rgba(255,255,255,0.16)'); }
    // muntins, or leaded diamonds
    if (opts.lead) { gd.fillStyle = 'rgba(40,40,52,0.7)'; for (let k = -Hd; k < Wd; k += 5) for (let j = 0; j < Hd; j++) { const x1 = k + j, x2 = k + Hd - j; if (x1 >= 0 && x1 < Wd) pd(X + x1, Y + j, 'rgba(40,40,52,0.7)'); if (x2 >= 0 && x2 < Wd) pd(X + x2, Y + j, 'rgba(40,40,52,0.7)'); } }
    else { fd(X + Math.floor(Wd / 2) - 1, Y, 2, Hd, frame); fd(X, Y + Math.floor(Hd / 2) - 1, Wd, 2, frame); fd(X + Math.floor(Wd / 2) - 1, Y, 1, Hd, shadeColor(frame, 1.5)); fd(X, Y + Math.floor(Hd / 2) - 1, Wd, 1, shadeColor(frame, 1.5)); }
    // the sill, lit on top, with its shadow beneath
    fd(X - 6, Y + Hd + 2, Wd + 12, 3, '#cfc8ba'); fd(X - 6, Y + Hd + 2, Wd + 12, 1, '#efe8dc'); fd(X - 5, Y + Hd + 5, Wd + 10, 2, 'rgba(20,10,30,0.32)');
    // shutters: boards with a Z brace and iron hinges
    if (opts.shutters) for (const [sx, flip] of [[X - 12, 0], [X + Wd + 4, 1]]) {
      const sh = opts.shutters; fd(sx, Y - 2, 8, Hd + 4, sh);
      for (let x = sx + 2; x < sx + 8; x += 3) fd(x, Y - 2, 1, Hd + 4, shadeColor(sh, 0.78));
      fd(sx, Y - 2, 1, Hd + 4, shadeColor(sh, 1.3)); fd(sx + 7, Y - 2, 1, Hd + 4, shadeColor(sh, 0.6));
      fd(sx, Y + 2, 8, 2, shadeColor(sh, 1.12)); fd(sx, Y + Hd - 4, 8, 2, shadeColor(sh, 1.12));
      for (let k = 0; k < Hd - 8; k++) pd(sx + (flip ? 6 - k * 6 / (Hd - 8) : 1 + k * 6 / (Hd - 8)), Y + 4 + k, shadeColor(sh, 1.15));
      for (const hy of [Y + 3, Y + Hd - 3]) { fd(flip ? sx : sx + 4, hy, 4, 1, '#2e3238'); }
    }
    // a flower box with flowers and trailing leaves
    if (opts.flowers) {
      const by = Y + Hd + 5; fd(X - 4, by, Wd + 8, 6, '#7a4b23'); fd(X - 4, by, Wd + 8, 1, '#a8743c'); fd(X - 4, by + 5, Wd + 8, 1, '#4a2e18');
      for (let x = X - 3; x < X + Wd + 4; x += 2) { const c = pick(['#d6336c', '#f2c94c', '#f4f0e6', '#9a7ce0', '#e86a4a']); pd(x, by - 2 - (x % 3 === 0 ? 1 : 0), c); pd(x + 1, by - 1, '#4f8a2e'); pd(x, by - 1, '#3f7a2a'); if (R() < 0.3) { pd(x, by + 6, '#4f8a2e'); pd(x, by + 7, '#3f7a2a'); } }
    }
    windows.push([X / (W * 2), Y / (H * 2), Wd / (W * 2), Hd / (H * 2)]);
  };
  const doorAt = (cx, opts = {}) => {
    const dw = (opts.w || 12) * 2, dh = (opts.h || 22) * 2, X = Math.round(cx * 2 - dw / 2), base = (H - 5) * 2, Y = base - dh, r = dw / 2;
    const color = opts.color || '#8a5a2b', line = opts.line || shadeColor(color, 0.72);
    const inDoor = (x, j) => { if (!opts.arch || j >= r) return x >= 0 && x < dw; const hw = Math.sqrt(Math.max(0, r * r - (r - j) * (r - j))); return x >= r - hw && x < r + hw; };
    // the surround: dressed stone jambs, or a timber frame on a timbered house
    if (timber) { fd(X - 5, Y - 4, dw + 10, dh + 4, '#5a3a1e'); fd(X - 5, Y - 4, dw + 10, 1, '#7a5432'); fd(X - 5, Y - 4, 1, dh + 4, '#7a5432'); }
    else {
      for (let y = Y - (opts.arch ? 2 : 6), k = 0; y < base; y += 6, k++) { const c1 = STONE[k % 4], c2 = STONE[(k + 2) % 4], wl = k % 2 ? 5 : 7, wr = k % 2 ? 7 : 5; fd(X - wl, y, wl, 5, c1); fd(X - wl, y, wl, 1, '#efe8da'); fd(X + dw, y, wr, 5, c2); fd(X + dw, y, wr, 1, '#e2dbcd'); fd(X + dw + wr - 1, y, 1, 5, '#8c867c'); }
      if (opts.arch) for (let a = 0; a <= 8; a++) { const ang = Math.PI * a / 8, x = X + r - Math.cos(ang) * (r + 3), y = Y + r - Math.sin(ang) * (r + 3); fd(x - 3, y - 3, 6, 6, STONE[a % 4]); pd(x - 3, y - 3, '#efe8da'); }
      else { fd(X - 7, Y - 7, dw + 14, 6, '#bdb6a8'); fd(X - 7, Y - 7, dw + 14, 1, '#e2dbcd'); fd(X - 7, Y - 2, dw + 14, 1, '#8c867c'); }
    }
    // the door itself: boards with grain, set back in shadow
    for (let j = 0; j < dh; j++) for (let x = 0; x < dw; x++) {
      if (!inDoor(x, j)) { if (opts.arch && j < r) pd(X + x, Y + j, '#1c1410'); continue; }
      const board = Math.floor(x / 5), tone = shadeColor(color, [1, 0.94, 1.05, 0.97, 1.02][board % 5]);
      pd(X + x, Y + j, x % 5 === 4 ? line : ((x * 7 + j * 3 + board * 11) % 23 === 0 ? shadeColor(tone, 0.85) : tone));
    }
    for (let j = 0; j < dh; j++) { if (inDoor(0, j)) pd(X, Y + j, 'rgba(10,8,20,0.4)'); if (inDoor(1, j)) pd(X + 1, Y + j, 'rgba(10,8,20,0.25)'); }
    fd(X + (opts.arch ? 3 : 0), Y + (opts.arch ? 1 : 0), dw - (opts.arch ? 6 : 0), 2, 'rgba(10,8,20,0.35)');
    // iron straps with rivets, and a ring pull
    for (const sy of [Math.round(Y + dh * 0.28), Math.round(Y + dh * 0.74)]) { fd(X + 1, sy, dw - 6, 2, '#2e3238'); fd(X + 1, sy, dw - 6, 1, '#5a626c'); for (let x = X + 3; x < X + dw - 6; x += 5) pd(x, sy, '#8a929c'); fd(X + dw - 7, sy - 1, 3, 4, '#2e3238'); }
    const hx = X + dw - 6, hy = Math.round(Y + dh * 0.54);
    if (opts.peep) { fd(X + r - 3, Y + Math.round(dh * 0.36), 6, 4, '#1c1410'); for (let k = 0; k < 6; k += 2) fd(X + r - 3 + k, Y + Math.round(dh * 0.36), 1, 4, '#5a626c'); }
    pd(hx, hy - 1, '#c8a03a'); pd(hx - 1, hy, '#c8a03a'); pd(hx + 1, hy, '#8a6a1a'); pd(hx, hy + 1, '#8a6a1a'); pd(hx, hy, '#2a1a10'); pd(hx - 1, hy - 1, '#f3d36c');
    // the doorstep, worn in the middle
    fd(X - 7, base, dw + 14, 6, '#b8b0a0'); fd(X - 7, base, dw + 14, 1, '#ddd6c8'); fd(X + 4, base + 1, dw - 8, 2, '#c8c0b0'); fd(X - 7, base + 5, dw + 14, 1, '#7d786f');
    return { x: X / 2, y: Y / 2, w: dw / 2, h: dh / 2 };
  };
  // windows spread along the front, clear of the door
  const winRow = (y, w, h, opts) => {
    const span = fx1 - fx0, n = Math.max(1, Math.floor(span / 26));
    for (let i = 0; i < n; i++) { const cx = fx0 + span * (i + 0.5) / n; if (Math.abs(cx - doorCx) < 16 && !opts.upper) continue; if (opts.skip && opts.skip(cx)) continue; windowAt(cx, y, w, h, opts); }
  };

  // ---- the roof, painted natively: big uneven slates, curved clay tiles, or bundled thatch ----
  // The front slope narrows toward the ridge; it darkens toward the eaves and on the side that turns away.
  const ridgeY = 6, eaveY = wallTop - 1, rx0 = 0, rx1 = fx1 + sideW + 1, inset = 5;
  const RY = ridgeY * 2, EY = eaveY * 2, RX0 = rx0 * 2, RX1 = rx1 * 2, IN = inset * 2;
  const edgeAt = y => { const k = (y - RY) / (EY - RY); return [Math.round(RX0 + IN * (1 - k)), Math.round(RX1 - IN * (1 - k))]; };
  const inRoof = (x, y) => { if (y < RY || y > EY + 1) return false; const [a, b] = edgeAt(y); return x >= a && x < b; };
  if (spec.roof === 'h') {
    for (let y = RY; y <= EY + 1; y++) { const [a, b] = edgeAt(y); for (let x = a; x < b; x++) p(x, y, Rm.base); }
    for (let i = 0; i < (RX1 - RX0) * (EY - RY) / 5; i++) { const x = ri(RX0, RX1), y = ri(RY, EY); if (!inRoof(x, y)) continue; const col = pick([Rm.lo, Rm.hi, Rm.base, '#b8923f', '#c49a46']); for (let k = 0; k < ri(3, 5); k++) if (inRoof(x + (k >> 1), y + k)) p(x + (k >> 1), y + k, col); }
    for (let y = RY + 10; y < EY; y += 11) { const [a, b] = edgeAt(y); for (let x = a; x < b; x++) { p(x, y, R() < 0.8 ? Rm.line : Rm.lo); if (R() < 0.4) p(x, y + 1, Rm.lo); } }
    for (let x = RX0; x < RX1; x++) { const hang = ri(1, 4); f(x, EY, 1, hang, x % 3 ? Rm.lo : Rm.line); }
  } else if (spec.roof === 'r') {
    for (let y = RY; y <= EY + 1; y++) { const [a, b] = edgeAt(y); for (let x = a; x < b; x++) p(x, y, Rm.line); }
    for (let row = 0, y = RY; y < EY; row++, y += 7) {
      const [a, b] = edgeAt(y + 3);
      for (let x = a - (row % 2 ? 4 : 0); x < b; x += 8) {
        const base = vary(pick([Rm.base, Rm.base, Rm.hi, Rm.lo]), 0.14);
        for (let yy = 0; yy < 7; yy++) for (let xx = 0; xx < 8; xx++) {
          if (!inRoof(x + xx, y + yy)) continue;
          const cx = (xx - 3.5) / 4, round = yy > 4 && cx * cx > 0.55;
          if (round) continue;
          let col = base; if (xx < 2) col = shadeColor(base, 1.14); else if (xx > 5) col = shadeColor(base, 0.86); if (yy === 6) col = shadeColor(base, 0.72);
          p(x + xx, y + yy, col);
        }
      }
    }
  } else {
    for (let y = RY; y <= EY + 1; y++) { const [a, b] = edgeAt(y); for (let x = a; x < b; x++) p(x, y, Rm.line); }
    for (let row = 0, y = RY; y < EY; row++, y += 8) {
      const [a, b] = edgeAt(y + 4); let x = a - ri(0, 6);
      while (x < b) {
        const w = ri(8, 13), base = vary(pick([Rm.base, Rm.base, Rm.lo, Rm.hi]), 0.16), drop = ri(0, 1);
        for (let yy = 0; yy < 8 + drop; yy++) for (let xx = 0; xx < w - 1; xx++) {
          if (!inRoof(x + xx, y + yy)) continue;
          let col = base; if (yy === 0) col = shadeColor(base, 1.18); else if (yy >= 6 + drop) col = shadeColor(base, 0.7); else if (xx === 0) col = shadeColor(base, 1.08); else if (xx === w - 2) col = shadeColor(base, 0.85);
          p(x + xx, y + yy, col);
        }
        // weathering: moss in the hollows, a chipped corner, a streak of rust
        if (R() < 0.18) for (let k = 0; k < 4; k++) { const mx = x + ri(1, w - 3), my = y + 5 + ri(0, 2); if (inRoof(mx, my)) p(mx, my, pick(['#6e7a4a', '#7d8a52', '#5f6b3e'])); }
        if (R() < 0.15) { const cx2 = x + ri(2, w - 3), cy2 = y + ri(1, 4); if (inRoof(cx2, cy2)) { p(cx2, cy2, '#8a6a4a'); p(cx2, cy2 + 1, '#7a5a3a'); } }
        x += w;
      }
    }
  }
  // light near the ridge, shade toward the eaves and down the far end
  for (let y = RY; y <= EY + 1; y++) { const [a, b] = edgeAt(y), k = (y - RY) / (EY - RY); h32.fillStyle = `rgba(20,10,30,${(0.24 * k).toFixed(3)})`; h32.fillRect(a, y, b - a, 1); h32.fillStyle = 'rgba(20,10,30,0.22)'; h32.fillRect(b - 8, y, 8, 1); }
  // the ridge cap, a sliver of the far slope behind it
  f(IN, RY - 6, RX1 - IN * 2, 6, shadeColor(Rm.ridge, 0.82));
  for (let x = IN - 2; x < RX1 - IN + 2; x += 6) { f(x, RY - 2, 6, 4, Rm.ridge); f(x, RY - 2, 6, 1, Rm.hi); f(x + 5, RY - 2, 1, 4, shadeColor(Rm.ridge, 0.75)); }
  // fascia board along the eaves and the shadow it throws on the wall
  f(RX0, EY, RX1 - RX0, 4, spec.roof === 'h' ? Rm.lo : '#3a2410'); if (spec.roof !== 'h') f(RX0, EY, RX1 - RX0, 1, '#5a3a20');
  const sg = h32.createLinearGradient(0, EY + 4, 0, EY + 18); sg.addColorStop(0, 'rgba(20,10,30,0.45)'); sg.addColorStop(1, 'rgba(20,10,30,0)'); h32.fillStyle = sg; h32.fillRect(fx0 * 2, EY + 4, (fx1 - fx0 + sideW) * 2, 14);

  // ---- or turned end-on: the gable faces the street, and the roof's two slopes run back from it ----
  const gable = spec.orient === 'gable';
  const gcx = fx0 + fx1, ghw = fx1 - fx0 + 4, wallTop2 = wallTop * 2;
  const gh = Math.min(wallTop2 - 30, Math.round(ghw * 0.72));
  const rakeAt = x => Math.round(wallTop2 - gh * (1 - Math.min(1, Math.abs(x - gcx) / ghw)));
  if (gable) {
    h32.clearRect(0, 0, W * 2, wallTop2 + 2);
    const apex = wallTop2 - gh;
    // the side wall, glimpsed under the far eave
    f(fx1 * 2, wallTop2 - 6, sideW * 2, wallH * 2 + 6, Wm.side); f(fx1 * 2, wallTop2 - 6, 2, wallH * 2 + 6, shadeColor(Wm.sideLo, 0.85));
    for (let y = wallTop2; y < H * 2; y += spec.wall === 'W' ? 5 : 8) f(fx1 * 2, y, sideW * 2, 1, Wm.sideLo);
    // the gable wall, a triangle above the front
    wallFace(fx0 * 2, apex, (fx1 - fx0) * 2, wallTop2 - apex + 4, Wm); wallFace(fx0 * 2, wallTop2, (fx1 - fx0) * 2, H * 2 - wallTop2, Wm);
    foundation();
    // the slopes, seen from above, running back to the far end
    const top = 10, lit = x => x < gcx;
    for (let x = gcx - ghw; x < gcx + ghw; x++) {
      const u = Math.abs(x + 0.5 - gcx), yb = rakeAt(x);
      for (let y = top; y <= yb; y++) {
        let col;
        if (spec.roof === 'h') { const h = tileHash(Math.floor(u / 2), y) % 5; col = [Rm.lo, Rm.hi, Rm.base, '#b8923f', Rm.base][h]; if (Math.floor(u) % 12 === 0) col = Rm.line; }
        else if (spec.roof === 'r') { const pos = y % 7; col = pos < 2 ? Rm.hi : pos > 4 ? Rm.lo : Rm.base; const uu = Math.floor(u) % 10; if (uu === 0) col = Rm.line; else if (uu === 1) col = shadeColor(col, 1.1); }
        else { const c2 = Math.floor(u / 9), o = (c2 % 2) * 6, row = Math.floor((y + o) / 12), base = shadeColor(Rm.base, 0.88 + (tileHash(c2 * 7 + 3, row) % 100) / 400); col = (y + o) % 12 === 0 ? Rm.line : Math.floor(u) % 9 === 8 ? shadeColor(base, 0.75) : Math.floor(u) % 9 === 0 ? shadeColor(base, 1.12) : base; }
        let k = lit(x) ? 1.05 : 0.76;
        if (u > ghw - 6) k *= 0.86;
        if (y < top + 10) k *= 0.8 + (y - top) * 0.02;
        p(x, y, shadeColor(col, k));
      }
      // the bargeboard along the rake, and the shadow it throws on the gable
      p(x, yb - 1, '#6a4220'); f(x, yb, 1, 2, '#3a2410'); f(x, yb + 2, 1, 4, 'rgba(20,10,30,0.3)');
    }
    // the ridge, running straight back from the apex
    f(gcx - 3, top, 6, apex - top + 1, Rm.ridge); f(gcx - 3, top, 1, apex - top + 1, Rm.hi); f(gcx + 2, top, 1, apex - top + 1, shadeColor(Rm.ridge, 0.7));
    f(gcx - ghw, top - 1, ghw * 2, 2, shadeColor(Rm.line, 0.9));
    // a little window high in the gable
    if (gh > 34) windowAt(gcx / 2, (apex + gh * 0.42) / 2, 6, 6, { curtain: false });
  }

  // chimneys: a stack that stands on the roof and rises past the ridge, built of the house's own stone or brick and
  // weathered to match it; inked like everything else, it throws a shadow down the slope, the slates tuck round its foot,
  // the top is blackened by soot around the open flue, and some carry a muted clay pot.
  const chimney = (cx, top, opts = {}) => {
    const w = Math.max(10, (opts.w || 8) * 2 - 2), X = Math.round(cx * 2 - w / 2), brick = spec.wall === 'W', sw = 4;
    let B = Math.round(RY + (EY - RY) * 0.62), T = Math.max(10, RY - 8 - (opts.w >= 10 ? 4 : 0) + Math.round(top));
    if (gable) { B = Math.min(rakeAt(X), rakeAt(X + w)) + 6; T = Math.max(10, B - 30); }
    const INK = '#1c1512', cap = (T - 3);
    const faces = brick ? ['#8a4a36', '#94523c', '#7d4230', '#9a5a42'] : ['#9a9488', '#8e887d', '#a59f93', '#858075'];
    const mortar = brick ? '#6b5448' : '#5f5a52', sideC = brick ? '#5e3022' : '#615c54';
    // the shadow it casts down and across the slope
    for (let y = T + 4; y < B + 10; y++) { const k = (y - T) / (B + 10 - T), sx = X + w + sw + Math.round(k * 6); fd(X + w + sw, y, sx - (X + w + sw) + 6, 1, `rgba(16,10,24,${(0.34 * (1 - k * 0.4)).toFixed(2)})`); }
    fd(X - 2, B - 2, w + sw + 10, 5, 'rgba(16,10,24,0.32)');
    // ink, then the masonry: front face in courses, the side face turned from the light
    fd(X - 1, cap, w + sw + 2, B - cap + 1, INK);
    fd(X, T, w, B - T, mortar);
    for (let y = T, r2 = 0; y < B; y += 4, r2++) for (let x = X - (r2 % 2 ? 3 : 0); x < X + w; ) {
      const bw = brick ? 6 : 4 + Math.floor(R() * 5), xa = Math.max(X, x), xb = Math.min(X + w, x + bw), c1 = vary(pick(faces), 0.1);
      fd(xa, y, xb - xa - 1, 3, c1); fd(xa, y, xb - xa - 1, 1, shadeColor(c1, 1.1)); x += bw;
    }
    fd(X + w, T, sw, B - T, sideC); for (let y = T + 3; y < B; y += 4) fd(X + w, y, sw, 1, shadeColor(sideC, 0.8));
    fd(X, T, 1, B - T, 'rgba(255,236,210,0.18)');
    // soot creeping down from the top, and a little moss low on the stack where the roof keeps it damp
    for (let j = 0; j < 10; j++) fd(X, T + j, w + sw, 1, `rgba(20,14,12,${(0.5 * (1 - j / 10) ** 1.5).toFixed(2)})`);
    for (let i = 0; i < w / 3; i++) if (R() < 0.5) pd(X + ri(0, w - 1), B - ri(1, 5), R() < 0.5 ? '#56653a' : '#6a7744');
    // the cap: a slab a touch wider than the stack, lit on top, with the black mouth of the flue
    fd(X - 2, cap - 1, w + sw + 4, 4, INK); fd(X - 1, cap, w + sw + 2, 3, brick ? '#8a8378' : '#9c968a'); fd(X - 1, cap, w + sw + 2, 1, '#b9b2a4');
    fd(X + 2, cap, w + sw - 4, 2, '#120c0a');
    // the slates tuck round its foot: a dark lead apron and a few roof-coloured scraps lapping over it
    fd(X - 2, B - 2, w + sw + 4, 3, INK); fd(X - 1, B - 2, w + sw + 2, 2, '#4d535a'); fd(X - 1, B - 2, w + sw + 2, 1, '#6b737c');
    for (let x = X - 2; x < X + w + sw + 2; x += 5) fd(x, B, 4, 2, shadeColor(Rm.base, 0.82));
    // pots, muted and inked, on the bigger stacks or now and then
    const n = opts.pots != null ? opts.pots : (w >= 20 ? 2 : R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const px = Math.round(X + (w + sw) * (i + 0.5) / n - 3), ph = 5 + (i % 2) * 2, py = cap - ph;
      fd(px - 1, py - 2, 8, ph + 2, INK); fd(px, py, 6, ph, '#8f5a44'); fd(px, py, 1, ph, '#a9705a'); fd(px + 4, py, 2, ph, '#6b4031');
      fd(px - 1, py - 2, 8, 2, '#9b6650'); fd(px - 1, py - 2, 8, 1, '#b5806a'); fd(px + 1, py - 2, 4, 1, opts.glow ? '#e8862e' : '#140d0b');
    }
    const sy = n ? cap - 9 : cap - 2;
    if (opts.smoke !== false) smokes.push([(X + (w + sw) / 2) / (W * 2), sy / (H * 2)]); // the smoke itself rises live, in the scene
  };
  const lantern = (x, y) => { F(x, y - 3, 1, 3, '#3a2410'); F(x - 2, y, 5, 6, '#3a2410'); F(x - 1, y + 1, 3, 4, '#ffd27a'); P(x, y + 2, '#fff1b0'); };
  const hangingSign = (x, y, drawIcon, w = 16, h = 12) => {
    F(x - 1, y - 6, 2, 6, '#3a3a3a'); F(x - 1, y - 6, w / 2 + 3, 2, '#3a3a3a');
    F(x - w / 2, y, w, h, '#3a2410'); F(x - w / 2 + 1, y + 1, w - 2, h - 2, '#8a5a2b'); F(x - w / 2 + 1, y + 1, w - 2, 1, '#a8743c');
    F(x - w / 2 + 2, y - 1, 1, 2, '#3a3a3a'); F(x + w / 2 - 3, y - 1, 1, 2, '#3a3a3a');
    drawIcon(x, y + h / 2);
  };
  const awning = (x0, x1, y, colA, colB) => {
    for (let x = x0; x < x1; x++) { const stripe = Math.floor((x - x0) / 4) % 2 ? colA : colB; F(x, y, 1, 7, stripe); P(x, y + 7 + ((x - x0) % 4 < 2 ? 1 : 0), stripe); }
    F(x0, y, x1 - x0, 1, 'rgba(255,255,255,0.3)'); F(x0, y + 8, x1 - x0, 3, 'rgba(20,10,30,0.25)');
  };
  const banner = (x, y, col, emblem) => { F(x, y, 6, 14, col); F(x, y, 6, 1, '#e3b93c'); for (let i = 0; i < 3; i++) P(x + i * 2 + 1, y + 14, col); if (emblem) P(x + 2, y + 5, emblem), P(x + 3, y + 5, emblem), P(x + 2, y + 6, emblem), P(x + 3, y + 6, emblem); };
  const shield = (cx, cy, a, b) => { for (let y = 0; y < 11; y++) { const w = y < 6 ? 9 : 9 - (y - 5) * 2; F(cx - w / 2, cy + y, w, 1, y === 0 ? '#3a2410' : (y < 6 ? a : b)); } F(cx - 0.5, cy + 1, 1, 9, '#e3b93c'); F(cx - 4, cy + 4, 8, 1, '#e3b93c'); };

  // ---- each building, by its trade ----
  const lowWin = wallTop + Math.round(wallH * (tall ? 0.6 : 0.3));
  const upWin = wallTop + Math.round(wallH * 0.12);
  if (kind === 'inn') {
    // The Sleeping Fox: two floors of timber, a fox on an iron bracket, lanterns at the door, smoke from two chimneys
    chimney(14, 0, { w: 8 }); chimney(W - 26, 2, { w: 7 });
    winRow(upWin, 10, 11, { upper: 1, shutters: '#4f7a3a', flowers: 1, lead: 1 });
    winRow(lowWin, 12, 13, { shutters: '#4f7a3a' });
    const d = doorAt(doorCx, { arch: 1, color: '#7a3a1a' });
    lantern(d.x - 6, d.y + 4); lantern(d.x + d.w + 5, d.y + 4);
    hangingSign(d.x + d.w + 14, wallTop + 26, (x, y) => { F(x - 4, y - 2, 8, 5, '#e07b2c'); F(x - 4, y - 4, 2, 2, '#e07b2c'); F(x + 2, y - 4, 2, 2, '#e07b2c'); P(x - 2, y - 1, '#1b1424'); P(x + 1, y - 1, '#1b1424'); F(x - 1, y + 1, 2, 1, '#f4f0e6'); F(x + 4, y + 1, 4, 2, '#e07b2c'); P(x + 7, y + 1, '#f4f0e6'); });
  } else if (kind === 'weapons') {
    // Bran's Blades: an open forge bay glowing under a timber lean-to, a broad chimney, crossed swords
    chimney(fx0 + 12, 0, { w: 12, glow: 1 });
    const bx0 = fx0 + 3, bx1 = fx0 + Math.min(42, Math.round((fx1 - fx0) * 0.45)), by = wallTop + 12;
    // the forge bay, drawn at full detail: an opening in the wall you look into, not a picture on it
    {
      const X0 = bx0 * 2, X1 = bx1 * 2, Y0 = by * 2, Y1 = (H - 5) * 2, BW = X1 - X0, BH = Y1 - Y0;
      // the back wall: soot-black brick, its courses picked out by the glow
      fd(X0, Y0, BW, BH, '#151012');
      for (let y = Y0 + 2, r = 0; y < Y1 - 6; y += 4, r++) for (let x = X0 + (r % 2 ? 3 : 0); x < X1; x += 7) fd(x, y, 6, 3, r % 3 ? '#221a18' : '#2a201c');
      // the reveal: the thickness of the wall seen on the right, lit stone in courses, and the shadow of the lintel
      fd(X1 - 8, Y0, 8, BH, '#5f5a52'); for (let y = Y0 + 1; y < Y1; y += 5) { fd(X1 - 8, y, 8, 4, y % 10 ? '#8a847a' : '#7a746a'); fd(X1 - 8, y, 1, 4, '#4a453e'); }
      // the floor of the bay: packed earth, ash and scale
      fd(X0, Y1 - 6, BW - 8, 6, '#2e2620'); for (let x = X0 + 2; x < X1 - 10; x += 5) fd(x, Y1 - 4 + (x % 3), 2, 1, '#4a3e34');
      // the hearth: a waist-high brick forge against the back wall with a bed of coals, and its hood above
      const hx = X0 + 6, hw = Math.min(30, BW * 0.5), hy = Y1 - 22;
      fd(hx, hy, hw, 16, '#5a2a1e'); for (let y = hy + 1; y < hy + 16; y += 4) for (let x = hx + ((y >> 2) % 2 ? 3 : 0); x < hx + hw; x += 7) fd(x, y, 6, 3, '#7a3a26');
      fd(hx - 1, hy - 2, hw + 2, 3, '#3a3a40'); fd(hx - 1, hy - 2, hw + 2, 1, '#5a5a62');
      for (let i = 0; i < hw * 1.6; i++) { const x = hx + 2 + Math.floor(R() * (hw - 4)), y = hy - 4 + Math.floor(R() * 3); pd(x, y, ['#ff6a1a', '#ffb347', '#ffd27a', '#c2412d'][Math.floor(R() * 4)]); }
      for (let y = Y0 + 4; y < hy - 5; y++) { const k = (y - Y0 - 4) / (hy - 5 - Y0 - 4), w = 8 + k * (hw - 4); fd(hx + hw / 2 - w / 2, y, w, 1, k > 0.9 ? '#3a3a40' : '#2a2a30'); }
      // bellows beside it, and tongs and hammers hanging on the back wall, catching the light at their edges
      const bx = hx + hw + 3;
      if (bx + 12 < X1 - 10) { for (let k = 0; k < 8; k++) fd(bx, Y1 - 14 + k, 12 - k, 1, k % 3 ? '#6b4423' : '#4a2e16'); fd(bx + 10, Y1 - 15, 6, 2, '#3a3a40'); }
      for (const [x, len, head] of [[X1 - 30, 16, 'tong'], [X1 - 22, 12, 'ham'], [X1 - 16, 14, 'ham']]) if (x > hx + hw + 2) {
        fd(x, Y0 + 6, 1, len, '#3a3a40'); pd(x - 1, Y0 + 6, '#8a6a4a');
        if (head === 'tong') { fd(x + 2, Y0 + 6, 1, len, '#3a3a40'); fd(x, Y0 + 6 + len, 3, 2, '#4a4a52'); } else { fd(x - 2, Y0 + 6 + len, 5, 3, '#4a4a52'); pd(x - 2, Y0 + 6 + len, '#c86a2a'); }
      }
      // the forge light: warm, strongest at the coals, washing the back wall and the floor
      const fg = gd.createRadialGradient(hx + hw / 2, hy - 2, 2, hx + hw / 2, hy - 2, BW * 0.85);
      fg.addColorStop(0, 'rgba(255,170,60,0.55)'); fg.addColorStop(0.35, 'rgba(230,100,30,0.28)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      gd.fillStyle = fg; gd.fillRect(X0, Y0, BW, BH);
      // the lintel: a heavy beam with brackets, and the shadow it throws just inside
      fd(X0 - 4, Y0 - 8, BW + 8, 8, '#4a2e16'); fd(X0 - 4, Y0 - 8, BW + 8, 2, '#8a5a2b'); fd(X0 - 4, Y0 - 2, BW + 8, 2, '#2a1a0c');
      for (let x = X0; x < X1; x += 14) fd(x, Y0 - 6, 1, 3, '#3a2410');
      for (let j = 0; j < 6; j++) fd(X0, Y0 + j, BW, 1, `rgba(10,6,4,${(0.5 * (1 - j / 6)).toFixed(2)})`);
      // dressed stone quoins framing both sides of the opening, like the door surround
      for (const qx of [X0 - 6, X1]) for (let y = Y0, k = 0; y < Y1; y += 7, k++) { const w = k % 2 ? 6 : 8, x = qx === X1 ? qx : qx - (w - 6); fd(x, y, w, 6, '#c9c2b4'); fd(x, y, w, 1, '#e2dccf'); fd(x, y + 6, w, 1, '#8a8478'); }
    }
    winRow(lowWin, 10, 12, { skip: cx => cx < bx1 + 6 });
    const d = doorAt(doorCx, { color: '#5e3a1a' });
    // crossed swords above the door
    for (let i = 0; i < 12; i++) { P(doorCx - 6 + i, d.y - 16 + i, '#d3dae0'); P(doorCx + 5 - i, d.y - 16 + i, '#d3dae0'); }
    F(doorCx - 7, d.y - 6, 4, 1, '#a8801f'); F(doorCx + 3, d.y - 6, 4, 1, '#a8801f');
  } else if (kind === 'armor') {
    // Hilde's Armory: heraldic shields mounted on the brick, a helm over the door
    winRow(lowWin, 10, 12, { shutters: '#3b4f7a', skip: cx => Math.abs(cx - (fx0 + 12)) < 15 || Math.abs(cx - (fx1 - 12)) < 15 });
    const d = doorAt(doorCx, { color: '#5a3a1e' });
    shield(fx0 + 12, wallTop + 8, '#b9343c', '#7d2027'); shield(fx1 - 12, wallTop + 8, '#3b6fc4', '#23305e');
    F(doorCx - 5, d.y - 11, 10, 6, '#b8c0c8'); F(doorCx - 6, d.y - 7, 12, 2, '#8a95a0'); F(doorCx - 1, d.y - 9, 2, 3, '#3a3a3a'); F(doorCx - 1, d.y - 13, 2, 2, '#b9343c');
  } else if (kind === 'general') {
    // Wendell's: a striped awning over a wide window full of goods
    chimney(W - 22, 4, { w: 7, smoke: false });
    const d = doorAt(doorCx);
    const wx0 = fx0 + 4, wx1 = d.x - 6;
    if (wx1 - wx0 > 12) {
      F(wx0 - 2, lowWin - 2, wx1 - wx0 + 4, 20, '#3a2410'); F(wx0, lowWin, wx1 - wx0, 16, '#f2d27a');
      for (let x = wx0 + 2; x < wx1 - 2; x += 4) { F(x, lowWin + 9, 3, 6, pick(['#b9343c', '#3b6fc4', '#e3b93c', '#6e8a3a', '#8b5a2b'])); F(x, lowWin + 4, 3, 4, pick(['#d8cfb8', '#c9784a', '#7a848e'])); }
      F(wx0 - 3, lowWin + 18, wx1 - wx0 + 6, 2, '#b8b0a0');
      awning(wx0 - 4, wx1 + 4, lowWin - 10, '#b9343c', '#f4ece0');
    }
    winRow(lowWin, 10, 12, { skip: cx => cx < d.x });
  } else if (kind === 'alchemist') {
    // Tamsin's Apothecary: herbs drying under the thatch, a round window of green glass, planters
    for (let x = fx0 + 4; x < fx1 - 2; x += 7) { F(x, eaveY + 2, 1, 4, '#5e3a1a'); F(x - 1, eaveY + 6, 3, 5, pick(['#3f7d3a', '#6aa33c', '#7b4bb5', '#b8923f'])); }
    const d = doorAt(doorCx, { arch: 1, color: '#3f6b2a', line: '#2b4a1d' });
    const cx = doorCx < W / 2 ? fx1 - 16 : fx0 + 16, cy = lowWin + 6;
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const r = Math.hypot(x, y); if (r <= 7) P(cx + x, cy + y, r > 6 ? '#3a2410' : r < 3 ? '#c8f5cf' : '#58c46a'); }
    F(cx - 1, cy - 7, 2, 14, '#3a2410'); F(cx - 7, cy - 1, 14, 2, '#3a2410');
    F(d.x - 10, H - 9, 8, 4, '#7a4b23'); for (let i = 0; i < 4; i++) P(d.x - 9 + i * 2, H - 10, pick(['#6aa33c', '#d6336c', '#9a7ce0']));
    hangingSign(d.x + d.w + 12, wallTop + 14, (x, y) => { F(x - 3, y - 2, 6, 5, '#5c5c5c'); F(x - 4, y - 3, 8, 1, '#5c5c5c'); P(x - 1, y - 4, '#58c46a'); P(x + 1, y - 5, '#58c46a'); });
  } else if (kind === 'magic') {
    // The Arcanum: a round turret with a star window and a pointed cap, purple banners
    const tx = fx1 - 10, tw = 18;
    // the tower, drawn at full detail: a round body of dressed stone whose courses curve around it, lit on the left,
    // narrow arched windows glowing violet, a ring of corbels, and a tall pointed slate roof with a gold finial
    {
      const TW = tw * 2 + 8, TX = tx * 2 - TW / 2, Y0 = 40, Y1 = (H - 5) * 2, r = TW / 2, cxT = TX + r;
      const stone = ['#8e887c', '#a39d90', '#b7b1a4', '#c9c3b6'];
      for (let x = 0; x < TW; x++) {
        const u = (x + 0.5 - r) / r, lit = Math.sqrt(Math.max(0, 1 - u * u)) * 0.6 + (-u) * 0.4, sag = Math.round(3 * (1 - Math.sqrt(Math.max(0, 1 - u * u))));
        for (let y = Y0; y < Y1; y++) {
          const row = Math.floor((y - Y0 - sag) / 6), inRow = (y - Y0 - sag) % 6, joint = inRow === 5 || ((Math.floor((x + (row % 2) * 5) / 10) !== Math.floor((x + 1 + (row % 2) * 5) / 10)) && Math.abs(u) < 0.9);
          const v = Math.max(0, Math.min(3, Math.round(1.6 + lit * 1.6 + (((x * 7 + row * 13) % 5) - 2) * 0.12)));
          fd(TX + x, y, 1, 1, joint ? '#6f6a60' : stone[v]);
        }
        fd(TX + x, Y1 - 6, 1, 6, x < r ? '#7c7466' : '#655e52'); // the plinth course
      }
      fd(TX - 1, Y0, 1, Y1 - Y0, '#2a2420'); fd(TX + TW, Y0, 1, Y1 - Y0, '#2a2420');
      // narrow arched windows, glowing
      for (const wy of [Y0 + 22, Y0 + 62]) if (wy + 18 < Y1 - 30) {
        fd(cxT - 4, wy, 8, 16, '#2a2420'); fd(cxT - 3, wy + 2, 6, 13, '#8a74d8'); fd(cxT - 3, wy + 2, 6, 5, '#c9b8ff'); fd(cxT - 2, wy, 4, 2, '#2a2420'); fd(cxT - 1, wy + 2, 2, 13, '#5a4aa8');
        fd(cxT - 5, wy + 16, 10, 2, '#c9c2b4');
      }
      // the star sigil on a dark plaque
      const sy = Y0 + 44; fd(cxT - 7, sy - 7, 14, 14, '#2a2050'); fd(cxT - 6, sy - 6, 12, 12, '#3a2f6a');
      for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0], [0, 0], [-1, -1], [1, 1], [1, -1], [-1, 1], [0, -2], [0, 2], [-2, 0], [2, 0], [0, -3], [0, 3], [-3, 0], [3, 0]]) pd(cxT + dx, sy + dy, '#ffe9a0');
      // corbels under the eaves of the tower roof
      fd(TX - 4, Y0 - 3, TW + 8, 4, '#6f6a60'); fd(TX - 4, Y0 - 3, TW + 8, 1, '#c9c3b6');
      for (let x = TX - 3; x < TX + TW + 3; x += 5) { fd(x, Y0 + 1, 3, 3, '#8e887c'); pd(x, Y0 + 1, '#b7b1a4'); }
      // the conical roof: purple slates in courses, lit on the left, and a gold finial
      const RH = 38, base = Y0 - 3;
      for (let y = 0; y < RH; y++) {
        const w = Math.round((TW + 10) * (y / RH)), x0 = Math.round(cxT - w / 2);
        for (let x = 0; x < w; x++) { const u = (x + 0.5) / Math.max(1, w), c = (y % 4 === 3) ? '#2a2050' : u < 0.3 ? '#6a5aa8' : u < 0.62 ? '#4a3f8a' : '#3a2f6a'; fd(x0 + x, base - RH + y, 1, 1, ((x + (Math.floor(y / 4) % 2) * 3) % 6 === 0 && y % 4 !== 3) ? '#2a2050' : c); }
        fd(x0 - 1, base - RH + y, 1, 1, '#1c1630'); fd(x0 + w, base - RH + y, 1, 1, '#1c1630');
      }
      fd(cxT - 1, base - RH - 6, 2, 7, '#c8a03a'); fd(cxT - 2, base - RH - 4, 4, 3, '#e3b93c'); pd(cxT - 1, base - RH - 4, '#fff0a8');
      fd(TX + 2, Y1, TW - 4, 3, 'rgba(20,12,30,0.3)');
    }
    winRow(lowWin, 10, 12, { skip: cx => cx > tx - tw / 2 - 6, glass: '#c9b8ff', glass2: '#8a74d8' });
    const d = doorAt(doorCx, { arch: 1, color: '#3a2f6a', line: '#2a2050' });
    banner(d.x - 10, wallTop + 6, '#5a3290', '#e3b93c'); banner(d.x + d.w + 4, wallTop + 6, '#5a3290', '#e3b93c');
  } else if (kind === 'enchanter') {
    // Mirela's: runes glowing in the lintel, crystals growing from the ridge
    for (let x = fx0 + 6; x < fx1 - 4; x += 5) { P(x, wallTop + 5, '#7fd0f5'); P(x + 1, wallTop + 4, '#b9e6f7'); P(x + 2, wallTop + 5, '#7fd0f5'); }
    for (const [x, h] of [[W * 0.3, 10], [W * 0.36, 6], [W * 0.62, 8]]) { F(x, ridgeY - h, 3, h, '#b48ee0'); F(x, ridgeY - h, 1, h, '#e8d8ff'); P(x + 1, ridgeY - h - 1, '#e8d8ff'); }
    winRow(lowWin, 10, 12, { glass: '#b9e6f7', glass2: '#7fb6d6' });
    doorAt(doorCx, { color: '#5a3290', line: '#3a2070' });
  } else if (kind === 'jeweler') {
    // Silverthread: an arched display window on velvet, a gilded ring sign
    const d = doorAt(doorCx, { color: '#2a2a3a' });
    const cx = doorCx < W / 2 ? (d.x + d.w + fx1) / 2 : (fx0 + d.x) / 2;
    F(cx - 10, lowWin - 4, 20, 22, '#3a2410'); F(cx - 8, lowWin - 2, 16, 18, '#7d2027');
    for (let i = 0; i < 4; i++) { F(cx - 8 + i, lowWin - 3 - i, 16 - i * 2, 1, '#3a2410'); }
    for (let i = 0; i < 7; i++) { const x = cx - 6 + ri(0, 12), y = lowWin + ri(2, 14); P(x, y, pick(['#e3b93c', '#f6f7fa', '#7fd0f5', '#b9343c'])); P(x + 1, y, '#fff1b0'); }
    F(cx - 11, lowWin + 18, 22, 2, '#e3b93c');
    hangingSign(d.x - 12, wallTop + 12, (x, y) => { for (let a = 0; a < 16; a++) P(x + Math.round(Math.cos(a / 16 * 6.28) * 3), y + Math.round(Math.sin(a / 16 * 6.28) * 3), '#e3b93c'); P(x, y - 4, '#7fd0f5'); });
  } else if (kind === 'townhall') {
    // the Town Hall: a pediment with a clock, columns at the door, banners, wide steps
    const pc = doorCx;
    for (let y = 0; y < 18; y++) { const w = Math.round(y * 2.2); F(pc - w / 2, wallTop - 18 + y, w, 1, y === 17 ? '#8c867c' : '#c6c0b6'); }
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const r = Math.hypot(x, y); if (r <= 5) P(pc + x, wallTop - 7 + y, r > 4 ? '#3a2410' : '#f4ece0'); }
    F(pc, wallTop - 10, 1, 4, '#1b1424'); F(pc, wallTop - 7, 3, 1, '#1b1424');
    winRow(upWin, 9, 11, { upper: 1, shutters: '#3b4f7a' });
    winRow(lowWin, 10, 13, { shutters: '#3b4f7a', skip: cx => Math.abs(cx - pc) < 22 });
    const d = doorAt(pc, { arch: 1, w: 16, color: '#5a3a1e' });
    for (const x of [d.x - 9, d.x + d.w + 3]) { F(x, d.y - 8, 6, H - 5 - d.y + 8, '#e8e1d0'); F(x, d.y - 8, 6, 2, '#c6c0b6'); F(x + 4, d.y - 6, 2, H - 5 - d.y + 6, 'rgba(20,10,30,0.18)'); }
    F(d.x - 11, d.y - 11, d.w + 22, 3, '#c6c0b6'); F(d.x - 11, d.y - 11, d.w + 22, 1, '#ece4d2');
    banner(fx0 + 6, wallTop + 26, '#3b6fc4', '#e3b93c'); banner(fx1 - 12, wallTop + 26, '#3b6fc4', '#e3b93c');
    F(d.x - 14, H - 3, d.w + 28, 3, '#b8b0a0');
  } else if (kind === 'butcher') {
    // the butcher's: hams and strings of sausages in a wide window under a red-and-white awning, a cleaver sign
    chimney(fx1 - 12, 2, { w: 7 });
    const d = doorAt(doorCx, { color: '#7d2027' });
    const wx0 = fx0 + 4, wx1 = d.x - 6;
    if (wx1 - wx0 > 12) {
      windowAt((wx0 + wx1) / 2, lowWin, wx1 - wx0, 14, { curtain: false });
      for (let x = wx0 + 2; x < wx1 - 3; x += 5) { F(x + 1, lowWin + 1, 1, 2, '#3a3a40'); F(x, lowWin + 3, 3, 5, '#b5523b'); F(x, lowWin + 3, 1, 5, '#d47b5f'); F(x + 1, lowWin + 8, 1, 1, '#efe6d2'); }
      for (let x = wx0 + 1; x < wx1 - 1; x++) P(x, lowWin + 11 + Math.round(Math.sin(x * 0.8)), '#9e4a32');
      awning(wx0 - 3, wx1 + 3, lowWin - 10, '#b9343c', '#efe6d2');
    }
    winRow(lowWin, 10, 12, { skip: cx => cx < d.x + d.w + 4, shutters: '#7d2027' });
    hangingSign(d.x + d.w + 12, wallTop + 22, (x, y) => { F(x - 4, y - 2, 6, 4, '#c9d1d8'); F(x - 4, y - 2, 6, 1, '#eef2f5'); F(x + 2, y - 1, 3, 2, '#6b4423'); P(x - 3, y - 1, '#3a3a40'); });
  } else if (kind === 'barn') {
    // a barn: great double doors with cross braces, a hayloft door with hay spilling out, a hoist beam
    const d = doorAt(doorCx, { w: 22, h: 26, color: '#8a4a2a', line: '#6a3420' });
    const X = d.x * 2, Y = d.y * 2, DW = d.w * 2, DH = d.h * 2;
    fd(X + DW / 2 - 1, Y, 2, DH, '#3a2410');
    for (const [x0, x1] of [[X + 2, X + DW / 2 - 2], [X + DW / 2 + 2, X + DW - 2]]) { fd(x0, Y + 3, x1 - x0, 3, '#e8dcc0'); fd(x0, Y + DH - 6, x1 - x0, 3, '#e8dcc0'); for (let k = 0; k < DH - 12; k++) { const t = k / (DH - 12); fd(x0 + (x1 - x0 - 3) * t, Y + 6 + k, 3, 1, '#e8dcc0'); fd(x1 - 3 - (x1 - x0 - 3) * t, Y + 6 + k, 3, 1, '#e8dcc0'); } }
    const ly = gable ? Math.round((wallTop2 - gh * 0.55) / 2) : wallTop + 4;
    F(doorCx - 5, ly, 10, 9, '#3a2410'); F(doorCx - 4, ly + 1, 8, 8, '#1c1410'); for (let x = doorCx - 4; x < doorCx + 4; x++) { P(x, ly + 7 + (x % 2), '#e3c06a'); P(x, ly + 8, '#c9a04a'); }
    F(doorCx - 1, ly - 4, 2, 4, '#5a3a1e'); F(doorCx - 1, ly - 4, 8, 2, '#5a3a1e'); F(doorCx + 6, ly - 2, 1, 6, '#c9b38a');
  } else if (kind === 'shed') {
    // the smokehouse: blackened boards, a low door, smoke seeping from a vent under the ridge
    const d = doorAt(doorCx, { w: 9, h: 16, color: '#4a3a2e', line: '#2e241c' });
    F(fx0 + 2, wallTop + 2, fx1 - fx0 - 4, 6, 'rgba(20,14,12,0.35)');
    const vy = gable ? Math.round((wallTop2 - gh * 0.6) / 2) : wallTop + 2;
    F(doorCx - 3, vy, 6, 3, '#1c1410'); for (let x = doorCx - 3; x < doorCx + 3; x += 2) P(x, vy + 1, '#5a3a1e');
    smokes.push([doorCx / W, (vy - 2) / H]);
    void d;
  } else {
    // homes: each a little different
    if (R() < 0.75) chimney(R() < 0.5 ? fx0 + 10 : fx1 - 10, ri(0, 4), { w: 7, smoke: R() < 0.6 });
    const sh = pick(['#4f7a3a', '#3b4f7a', '#7d2027', '#6e4421', null]);
    winRow(lowWin, 10, 12, { shutters: sh, flowers: R() < 0.6 });
    const d = doorAt(doorCx, { arch: R() < 0.4, color: pick(['#8a5a2b', '#3f6b2a', '#7d2027', '#3b4f7a', '#6e4421']) });
    if (R() < 0.4) lantern(d.x + d.w + 4, d.y + 4);
    if (R() < 0.35) { F(fx1 - 18, H - 10, 12, 2, '#8a5a2b'); F(fx1 - 17, H - 8, 2, 3, '#5e3a1a'); F(fx1 - 9, H - 8, 2, 3, '#5e3a1a'); }
  }
  // compose: the fine surfaces, the features doubled smoothly on top, then one dark edge around it all
  const out = document.createElement('canvas'); out.width = W * 2; out.height = H * 2;
  const og = out.getContext('2d'); og.drawImage(c32, 0, 0); og.drawImage(cd, 0, 0); og.drawImage(smooth2x(c), 0, 0);
  const W2 = W * 2, H2 = H * 2, img = og.getImageData(0, 0, W2, H2), d = img.data, a = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2) ? 0 : d[(y * W2 + x) * 4 + 3];
  const edge = []; for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (!a(x, y) && (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1))) edge.push([x, y]);
  og.fillStyle = '#2a2230'; for (const [x, y] of edge) og.fillRect(x, y, 1, 1);
  out.smokes = smokes; out.windows = windows;
  return out;
}
function shadeColor(hex, f) { const h = hex.replace('#', ''); return '#' + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join(''); }
