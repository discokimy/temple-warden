// The Temple Warden — full figures, 64×96, set pixel by pixel in the same style as the portraits:
// flat color with one shadow tone and an edge of light, a dark outline, the portrait's own head on a sturdy
// cartoon body (about four and a half heads tall). Facing down, up and right (left is mirrored), with a walk cycle.
'use strict';

const XW = 64, XH = 96;
const xLayer = () => ({ d: new Uint8ClampedArray(XW * XH * 4) });
function xSet(L, x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= XW || y >= XH) return; const i = (y * XW + x) * 4; L.d[i] = c[0]; L.d[i + 1] = c[1]; L.d[i + 2] = c[2]; L.d[i + 3] = 255; }
const xHas = (L, x, y) => x >= 0 && y >= 0 && x < XW && y < XH && L.d[(y * XW + x) * 4 + 3] > 0;
function xRect(L, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) xSet(L, x, y, typeof c === 'function' ? c(x, y) : c); }
function xLine(L, x0, y0, x1, y1, w, c) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) || 1; for (let s = 0; s <= n; s++) { const t = s / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t; for (let y = Math.floor(cy - w / 2); y <= Math.ceil(cy + w / 2); y++) for (let x = Math.floor(cx - w / 2); x <= Math.ceil(cx + w / 2); x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= w / 2 + 0.1) xSet(L, x, y, typeof c === 'function' ? c(x, y) : c); } }
function xEll(L, cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) xSet(L, x, y, typeof c === 'function' ? c(x, y) : c); } }
function xOutline(L, k = 0.3) {
  const src = new Uint8ClampedArray(L.d), A = (x, y) => x >= 0 && y >= 0 && x < XW && y < XH && src[(y * XW + x) * 4 + 3] > 0;
  for (let y = 0; y < XH; y++) for (let x = 0; x < XW; x++) {
    if (A(x, y)) continue;
    let n = -1; for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (A(x + dx, y + dy)) { n = ((y + dy) * XW + x + dx) * 4; break; }
    if (n >= 0) xSet(L, x, y, pMix([30, 22, 32], [src[n], src[n + 1], src[n + 2]], k));
  }
}
// flat shading for a part: lit on its left edge, its own color, a shadow tone on its right third
const xTone = (base, x0, x1) => x => { const t = (x - x0) / Math.max(1, x1 - x0); return t < 0.12 ? pMix(base, [255, 246, 230], 0.18) : t > 0.68 ? pSh(base, 0.8) : base; };

// How the parts meet. Light comes from the upper left, so anything in front casts a soft shadow down and to the
// right onto what lies behind it (hair on the brow, the chin on the neck, an arm on the coat, a cuff on the hand).
// Where a part ends against one behind it, its edge darkens into a seam of its own color, deeper on the shadow
// side. Only the outer silhouette gets a rim, tinted by what it wraps and lighter where the light falls.
function joinParts(d, part) {
  const P = (x, y) => x < 0 || y < 0 || x >= XW || y >= XH ? -1 : part[y * XW + x];
  const src = new Uint8ClampedArray(d);
  const col = i => [src[i], src[i + 1], src[i + 2]];
  const set = (i, c) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
  for (let y = 0; y < XH; y++) for (let x = 0; x < XW; x++) {
    const z = P(x, y); if (z < 0) continue;
    const i = (y * XW + x) * 4;
    // cast shadow from parts in front, up and to the left
    const near = P(x - 1, y) > z || P(x, y - 1) > z || P(x - 1, y - 1) > z;
    const far = !near && (P(x - 2, y - 1) > z || P(x - 1, y - 2) > z || P(x - 2, y) > z || P(x, y - 2) > z);
    let c = col(i);
    if (near) c = pSh(c, 0.74); else if (far) c = pSh(c, 0.88);
    // a seam where this part's edge lies over one further back
    const behindR = (P(x + 1, y) >= 0 && P(x + 1, y) < z) || (P(x, y + 1) >= 0 && P(x, y + 1) < z);
    const behindL = (P(x - 1, y) >= 0 && P(x - 1, y) < z) || (P(x, y - 1) >= 0 && P(x, y - 1) < z);
    if (behindR) c = pSh(c, 0.66); else if (behindL) c = pMix(c, pSh(c, 0.7), 0.45);
    set(i, c);
  }
  // the silhouette: a rim in a deep tone of whatever it wraps; lighter on the lit sides
  const done = new Uint8ClampedArray(d);
  for (let y = 0; y < XH; y++) for (let x = 0; x < XW; x++) {
    if (P(x, y) >= 0) continue;
    let n = -1, f = 0.5;
    if (P(x + 1, y) >= 0) { n = (y * XW + x + 1) * 4; f = 0.62; } else if (P(x, y + 1) >= 0) { n = ((y + 1) * XW + x) * 4; f = 0.58; }
    else if (P(x - 1, y) >= 0) { n = (y * XW + x - 1) * 4; f = 0.42; } else if (P(x, y - 1) >= 0) { n = ((y - 1) * XW + x) * 4; f = 0.4; }
    if (n < 0) continue;
    const i = (y * XW + x) * 4, c = pMix(pSh([done[n], done[n + 1], done[n + 2]], f), [26, 18, 30], 0.35);
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
}
function drawFigurePX(spec, view, pose) {
  const side = view === 'right', back = view === 'up', front = !side && !back;
  const layers = []; const L = name => { const l = xLayer(); l.name = name; layers.push(l); return l; };
  const skin = pRgb(spec.skin || 'eab38b'), skS = pSh(skin, 0.84), skD = pSh(skin, 0.7);
  const hair = pRgb(spec.hairColor || '5a3a1e');
  const shirt = pRgb(spec.shirt || '8a5a3a'), pants = pRgb(spec.pants || '4a4038'), boots = pRgb(spec.boots || '3a2a1e');
  const armor = spec.armor === 'mail' ? [169, 179, 189] : spec.armor === 'plate' ? [211, 220, 228] : spec.armor === 'leather' ? [122, 80, 48] : null;
  const top = spec.torso === 'coat' ? pRgb(spec.coatColor || '3a3a4a') : armor || shirt;
  const sleeve = armor && spec.armor !== 'leather' ? pSh(armor, 0.95) : pRgb(spec.sleeve || spec.shirt || '8a5a3a');
  const robe = spec.torso === 'robe' || spec.torso === 'gown', dress = spec.torso === 'dress' || robe, coat = spec.torso === 'coat';
  const broad = spec.build === 'broad' || spec.build === 'stout' || spec.build === 'huge' ? 1 : spec.build === 'slim' ? -1 : 0;
  const walk = typeof pose === 'number' ? pose : -1;
  const FS = walk >= 0 ? FRONT_STEPS[walk] : { l: 0, r: 0, lh: [0, 0], rh: [0, 0], lift: 0 };
  const SS = walk >= 0 ? SIDE_STEPS[walk] : { nf: [1, 0], ff: [-1, 0], nh: [-1, 0], fh: [1, 0], lift: 0 };
  const lift = walk >= 0 && FS.lift ? 1 : 0, breath = pose === 'idle1' ? 1 : 0;
  const cx = 32, shY = 35 + breath - lift, waistY = 52 - lift, hipY = 58 - lift, footY = 93;
  const shW = 11 + broad, waistW = 9 + broad + (spec.build === 'stout' ? 2 : 0), hipW = 9.5 + broad;
  const torsoW = y => y < shY + 3 ? shW - (shY + 3 - y) * 0.5 : y < waistY ? shW + (waistW - shW) * (y - shY - 3) / (waistY - shY - 3) + (spec.build === 'stout' ? Math.sin((y - shY) / (waistY - shY) * Math.PI) * 1.5 : 0) : waistW + (hipW - waistW) * Math.min(1, (y - waistY) / (hipY - waistY));
  const hairStyle = spec.hair || 'short';

  // ---- long hair behind the body ----
  if ((hairStyle === 'long' || (back && hairStyle === 'braid')) && !spec.hat) { const bh = L('backhair'); for (let y = 14; y < 50 - lift; y++) { const w = 9.5 + Math.min(2, (y - 14) * 0.1); for (let x = 0; x < XW; x++) if (Math.abs(x + 0.5 - cx) <= w && !(y > 46 - lift && (x * 7 + y) % 3 === 0)) xSet(bh, x, y, x > cx + 4 ? pSh(hair, 0.82) : hair); } }
  // ---- legs and boots ----
  const lg = L('legs'), bt = L('boots');
  const leg = (x0, footX, fy, col, far) => {
    const c = far ? pSh(col, 0.82) : col, kneeX = (x0 + footX) / 2 + (side ? 1 : 0), kneeY = (hipY + fy) / 2;
    xLine(lg, x0, hipY - 1, kneeX, kneeY, 6.6 + broad * 0.6, xTone(c, x0 - 3, x0 + 3));
    xLine(lg, kneeX, kneeY, footX, fy - 7, 5.8 + broad * 0.5, xTone(c, footX - 3, footX + 3));
    xSet(lg, kneeX + 1, kneeY, pSh(c, 0.75));
    // the boot: a shaft, then a foot pointing the way you face
    const bc = far ? pSh(boots, 0.8) : boots;
    xRect(bt, Math.round(footX - 3.5), fy - 8, 7, 6, xTone(bc, footX - 3.5, footX + 3.5));
    if (side) xRect(bt, Math.round(footX - 3.5), fy - 3, 10, 3, xTone(bc, footX - 3.5, footX + 6.5)); else xRect(bt, Math.round(footX - 4), fy - 3, 8, 3, xTone(bc, footX - 4, footX + 4));
    xRect(bt, Math.round(footX - 3.5), fy - 8, 7, 1, pMix(bc, [255, 240, 220], 0.15));
  };
  const feet = side ? [[cx - 1, cx + SS.ff[0] * 2, footY + SS.ff[1] * 2, 1], [cx + 1, cx + SS.nf[0] * 2, footY + SS.nf[1] * 2, 0]] : [[cx - 4.5, cx - 5, footY - FS.l * 2, 0], [cx + 4.5, cx + 5, footY - FS.r * 2, 0]];
  for (const [x0, fx, fy, far] of feet) leg(x0, fx, fy, pants, far);
  // the trouser legs bunch over the tops of the boots: a fold of cloth, lit on its upper edge
  if (!robe) { const cf = L('cuff'); for (const [, fx, fy, far] of feet) { const c = far ? pSh(pants, 0.82) : pants; for (let x = Math.round(fx - 4); x <= Math.round(fx + 3); x++) { xSet(cf, x, fy - 9, (x + fy) % 3 === 0 ? pSh(c, 0.85) : c); xSet(cf, x, fy - 8, x % 2 ? pSh(c, 0.78) : pSh(c, 0.9)); } xSet(cf, Math.round(fx - 4), fy - 10, pMix(c, [255, 244, 220], 0.15)); } }
  // ---- far arm (side view) ----
  let arms = L('farArm');
  const arm = (sx, sy, hx, hy, far) => {
    const c = far ? pSh(sleeve, 0.78) : sleeve, ex = (sx + hx) / 2 + (side ? -1 : sx < cx ? -0.6 : 0.6), ey = (sy + hy) / 2;
    // a rounded shoulder, not a square one
    xEll(arms, sx + (side ? 0 : sx < cx ? -0.5 : 0.5), sy + 1, 3.6 + broad * 0.4, 3.2, xTone(c, sx - 4, sx + 4));
    xLine(arms, sx, sy, ex, ey, 5.4 + broad * 0.6, xTone(c, Math.min(sx, hx) - 3, Math.max(sx, hx) + 3));
    xLine(arms, ex, ey, hx, hy - 2, 4.8 + broad * 0.5, xTone(c, Math.min(sx, hx) - 3, Math.max(sx, hx) + 3));
    // a cuff where the sleeve ends, a little wider than the wrist, then the hand coming out of it
    const cuff = far ? pSh(c, 0.85) : armor && spec.armor !== 'leather' ? pSh(c, 0.85) : pMix(c, [255, 244, 220], 0.08);
    for (let x = Math.round(hx - 3); x <= Math.round(hx + 2); x++) { xSet(arms, x, Math.round(hy - 4), cuff); xSet(arms, x, Math.round(hy - 3), x > hx ? pSh(c, 0.72) : pSh(c, 0.82)); }
    xEll(arms, hx, hy, 2.6, 2.8, far ? skD : x => x > hx + 0.5 ? skS : skin);
    xSet(arms, Math.round(hx - 1), Math.round(hy + 1), far ? skD : skS); // the knuckles
  };
  const handY = 61 - lift;
  if (side) arm(cx - 1, shY + 2, cx + SS.fh[0] * 2, handY + SS.fh[1] * 2, 1);
  // ---- skirt, robe or coat tails ----
  const sk = L('skirt');
  if (dress || coat) {
    const len = robe ? footY - 3 : coat ? 80 : footY - 7, flare = robe ? 3 : coat ? 2 : 5, col = coat ? top : spec.skirt ? pRgb(spec.skirt) : shirt;
    for (let y = waistY; y <= len; y++) { const w = side ? 7 + (y - waistY) * 0.12 : hipW + (y - waistY) / (len - waistY) * flare; for (let x = 0; x < XW; x++) { const dx = x + 0.5 - cx - (side ? 1 : 0); if (Math.abs(dx) > w) continue; let c = dx > w * 0.45 ? pSh(col, 0.8) : dx < -w * 0.75 ? pMix(col, [255, 246, 230], 0.14) : col; if ((Math.round(dx * 1.4) + 40) % 6 === 0 && y > waistY + 4) c = pSh(c, 0.88); if (y === len) c = pSh(col, 0.7); xSet(sk, x, y, c); } }
    if (coat && front) for (let y = waistY; y <= len; y++) { xSet(sk, cx - 1, y, pSh(top, 0.6)); xSet(sk, cx, y, pSh(top, 0.6)); }
  }
  // ---- the torso ----
  const tr = L('torso');
  for (let y = shY; y <= hipY; y++) {
    const w = side ? Math.max(5, torsoW(y) * 0.62) : torsoW(y);
    for (let x = 0; x < XW; x++) {
      const dx = x + 0.5 - cx; if (Math.abs(dx) > w) continue;
      let c = dx > w * 0.4 ? pSh(top, 0.8) : dx < -w * 0.72 ? pMix(top, [255, 246, 230], 0.16) : top;
      if (spec.armor === 'mail' && (x + y) % 2 === 0) c = pSh(c, 0.86);
      if (spec.armor === 'plate' && Math.abs(dx) < 1 && y < waistY) c = pMix(top, [255, 255, 255], 0.4);
      if (spec.armor === 'leather' && (Math.abs(dx + 5) < 0.5 || Math.abs(dx - 5) < 0.5) && y < waistY && y % 2 === 0) c = pMix(top, [255, 220, 170], 0.35);
      if (!armor && (y - shY) % 7 === 3 && Math.abs(dx) > 3 && Math.abs(dx) < w - 1 && (x + y) % 3 === 0) c = pSh(c, 0.9); // a fold or two
      xSet(tr, x, y, c);
    }
  }
  if (coat && front) for (let y = shY; y < waistY; y++) for (let x = cx - 2; x <= cx + 1; x++) xSet(tr, x, y, x === cx - 2 || x === cx + 1 ? pSh(top, 0.6) : shirt);
  if (front && (!armor || spec.armor === 'leather') && !coat) for (let y = shY; y < shY + 4; y++) for (let x = cx - (shY + 4 - y) * 0.8; x <= cx - 1 + (shY + 4 - y) * 0.8; x++) xSet(tr, x, y, y === shY ? skD : skS);
  if (spec.necklace && front) for (let x = cx - 4; x <= cx + 3; x++) xSet(tr, x, shY + 3 + (Math.abs(x + 0.5 - cx) < 2 ? 1 : 0), [200, 160, 58]);
  if (spec.tabard && front) {
    // a tabard: hangs from the shoulders, a fold down the middle, a stitched hem, the sun of Aurel on the breast
    const tc = pRgb(spec.tabard), y0 = shY + 2, y1 = hipY + 7;
    for (let y = y0; y <= y1; y++) { const w = 5 + (y - y0) / (y1 - y0) * 1.2; for (let x = Math.round(cx - w); x < Math.round(cx + w); x++) { const t = (x + 0.5 - (cx - w)) / (2 * w); let c = t < 0.14 ? pMix(tc, [255, 250, 236], 0.25) : t > 0.66 ? pSh(tc, 0.84) : tc; if (x === cx - 1 && y > y0 + 8) c = pSh(tc, 0.9); if (x === cx && y > y0 + 8) c = pMix(tc, [255, 252, 240], 0.3); if (y === y1) c = pSh(tc, 0.8); if (y === y1 - 1 && x % 2 === 0) c = pSh(tc, 0.86); xSet(tr, x, y, c); } }
    const sun = [227, 185, 60], sunD = pSh(sun, 0.8), sy0 = y0 + 5;
    // a disc with a lit edge, and eight short rays
    for (const [dx, dy] of [[-1, -1], [0, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2]]) xSet(tr, cx + dx, sy0 + dy, dx + dy < -1 ? pMix(sun, [255, 250, 220], 0.4) : dx + dy > 1 ? sunD : sun);
    for (const [dx, dy] of [[-1, -3], [0, -3], [-1, 4], [0, 4], [-4, 0], [-4, 1], [3, 0], [3, 1], [-3, -2], [2, -2], [-3, 3], [2, 3]]) xSet(tr, cx + dx, sy0 + dy, sunD);
  }
  if (spec.torso === 'vest' && front) for (const s of [-1, 1]) for (let y = shY; y <= waistY; y++) { const w = torsoW(y); for (let x = 0; x < XW; x++) { const dx = (x + 0.5 - cx) * s; if (dx > 2 && dx <= w) xSet(tr, x, y, s > 0 ? pSh(pRgb(spec.vest || '6e4a2a'), 0.82) : pRgb(spec.vest || '6e4a2a')); } }
  if ((spec.torso === 'apron' || spec.apron) && !back) {
    const ac = pRgb(spec.apronColor || 'efe6d2');
    if (front) { xRect(tr, cx - 6, shY + 5, 12, 74 - shY - 5, (x, y) => x > cx + 2 ? pSh(ac, 0.84) : (x + y) % 4 === 0 ? pSh(ac, 0.94) : ac); xLine(tr, cx - 5, shY + 5, cx - 4, shY, 1, ac); xLine(tr, cx + 4, shY + 5, cx + 3, shY, 1, ac); }
    else xRect(tr, cx + 3, shY + 6, 4, 74 - shY - 6, pSh(ac, 0.9));
  }
  // the cloth blouses out over the belt: a fuller row just above it, folds pulled toward the buckle
  if (!robe && !armor) { const w = (side ? torsoW(waistY - 1) * 0.62 : torsoW(waistY - 1)) + 1; for (let x = 0; x < XW; x++) { const dx = x + 0.5 - cx; if (Math.abs(dx) > w) continue; xSet(tr, x, waistY - 1, (x * 2 + waistY) % 5 === 0 ? pMix(top, [255, 244, 220], 0.15) : (x + waistY) % 5 === 2 ? pSh(top, 0.78) : dx > w * 0.4 ? pSh(top, 0.85) : top); } }
  if (!robe || spec.belt) {
    const bl = L('belt'), bc = pRgb(spec.belt || '4a2e18'), w = side ? torsoW(waistY) * 0.62 : torsoW(waistY) + 0.5;
    for (let x = 0; x < XW; x++) if (Math.abs(x + 0.5 - cx) <= w) { xSet(bl, x, waistY, x % 4 === 1 ? pMix(bc, [255, 230, 190], 0.18) : bc); xSet(bl, x, waistY + 1, pSh(bc, 0.78)); }
    if (front) {
      xRect(bl, cx - 2, waistY - 1, 4, 4, [200, 160, 58]); xRect(bl, cx - 1, waistY, 2, 2, bc); xSet(bl, cx - 2, waistY - 1, [243, 211, 108]);
      xSet(bl, cx - 3, waistY + 2, bc); xSet(bl, cx - 3, waistY + 3, pSh(bc, 0.85)); xSet(bl, cx - 4, waistY + 4, pSh(bc, 0.8)); // the loose end of the strap
      // a pouch on one hip, flap and stitching
      const px0 = cx + Math.round(w) - 6; xRect(bl, px0, waistY + 1, 5, 5, (x, y) => x === px0 + 4 ? pSh(pRgb('6b4423'), 0.75) : y === waistY + 1 ? pMix(pRgb('6b4423'), [255, 230, 190], 0.2) : pRgb('6b4423')); xRect(bl, px0, waistY + 1, 5, 2, (x) => x === px0 + 4 ? pSh(pRgb('5a3a20'), 0.8) : pRgb('5a3a20')); xSet(bl, px0 + 2, waistY + 3, [200, 160, 58]);
    }
  }
  // ---- arms (front and back), in front of the body so they shade it ----
  arms = L('arms');
  const rh = side ? [cx + SS.nh[0] * 2, handY + SS.nh[1] * 2] : [cx + shW + 3 + FS.rh[0] * 2, handY + FS.rh[1] * 2];
  const lh = [cx - shW - 3 + FS.lh[0] * 2, handY + FS.lh[1] * 2];
  if (!side) { arm(cx - shW + 0.5, shY + 2, lh[0], lh[1]); arm(cx + shW - 0.5, shY + 2, rh[0], rh[1]); }
  else arm(cx + 1, shY + 2, rh[0], rh[1]);
  // ---- neck and head ----
  const nk = L('neck');
  xRect(nk, cx - 4, shY - 6, 8, 7, (x, y) => y < shY - 3 ? skD : x > cx + 1 ? skD : skS);
  const hd = L('head');
  const headY = shY - 37;   // the portrait's chin sits on the neck
  if (front) {
    const put = (only, layer) => { const pd = portrait(spec, { headOnly: true, raw: true, only }).getContext('2d').getImageData(0, 0, 48, 48).data; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const i = (y * 48 + x) * 4; if (pd[i + 3]) xSet(layer, x + 8, y + headY, [pd[i], pd[i + 1], pd[i + 2]]); } };
    put(['face'], hd); if (spec.beard) put(['beard'], L('beard')); put(['hair'], L('hair')); if (spec.hat) put(['hat'], L('hat'));
  } else {
    // from behind, or in profile: the skull, the hair over it, an ear, and in profile the face's edge
    const hcy = headY + 22, rx = 10.6, ry = 10.8;
    xEll(hd, cx, hcy, rx, ry, x => x > cx + 4 ? skS : skin);
    const ha = x => x > cx + 5 ? pSh(hair, 0.8) : x < cx - 6 ? pMix(hair, [255, 240, 220], 0.18) : hair;
    if (back) { if (hairStyle !== 'bald') xEll(hd, cx, hcy - 1, rx + 0.6, ry, ha); if (hairStyle === 'balding') xEll(hd, cx, hcy - 4, 6, 5, skin); xSet(hd, cx - 11, hcy + 1, skS); xSet(hd, cx + 10, hcy + 1, skS); }
    else {
      // profile: nose, brow, one eye, the mouth; hair across the back and the top
      xRect(hd, cx + 9, hcy + 1, 3, 3, skin); xSet(hd, cx + 11, hcy + 4, skS); xSet(hd, cx + 9, hcy + 4, skS);
      if (hairStyle !== 'bald') for (let y = hcy - ry - 1; y <= hcy + (hairStyle === 'long' ? 18 : 3); y++) for (let x = 0; x < XW; x++) { const dx = (x + 0.5 - cx) / (rx + 0.8), dy = (y + 0.5 - hcy + 1) / (ry + 0.6); if (dx * dx + dy * dy <= 1 || (hairStyle === 'long' && x < cx - 2 && x > cx - 11 && y > hcy)) { if (x > cx + 4 && y > hcy - 6) continue; if (x > cx - 2 && y > hcy - 3) continue; xSet(hd, x, y, ha(x)); } }
      const iris = pRgb(spec.eyes || '5a4030'), ey = hcy - 1;
      xSet(hd, cx + 6, ey - 1, [36, 22, 24]); xSet(hd, cx + 7, ey - 1, [36, 22, 24]); xSet(hd, cx + 8, ey - 1, [36, 22, 24]);
      xSet(hd, cx + 7, ey, iris); xSet(hd, cx + 8, ey, [244, 240, 232]); xSet(hd, cx + 7, ey + 1, pMix(iris, [255, 255, 255], 0.2)); xSet(hd, cx + 8, ey + 1, [236, 231, 222]); xSet(hd, cx + 6, ey, [255, 255, 255]);
      for (let x = cx + 5; x <= cx + 9; x++) xSet(hd, x, ey - 4, spec.browColor ? pRgb(spec.browColor) : pSh(hair, 0.62));
      xSet(hd, cx + 8, ey + 7, pMix(skD, [60, 25, 25], 0.45)); xSet(hd, cx + 9, ey + 7, pMix(skD, [60, 25, 25], 0.45));
      xSet(hd, cx - 1, hcy + 1, skD); xSet(hd, cx - 1, hcy + 2, skD);
      if (spec.beard && spec.beard !== 'moustache') for (let y = hcy + 3; y <= hcy + ry + (spec.beard === 'long' ? 7 : 1); y++) for (let x = cx - 2; x <= cx + 10 - (y - hcy - 3) * 0.4; x++) if (!(y === ey + 7 && x > cx + 6)) xSet(hd, x, y, pRgb(spec.beardColor || spec.hairColor || '5a3a1e'));
    }
    // hats from behind or in profile
    if (spec.hat) { const hc2 = pRgb(spec.hatColor || '3b6fc4'); if (spec.hat === 'wizard') { for (let y = hcy - 24; y < hcy - 8; y++) { const w = (y - hcy + 25) * 0.55; for (let x = 0; x < XW; x++) if (Math.abs(x + 0.5 - cx - (hcy - y) * 0.15) <= w) xSet(hd, x, y, hc2); } xRect(hd, cx - 17, hcy - 9, 34, 2, pSh(hc2, 0.8)); } else if (spec.hat === 'straw') { xRect(hd, cx - 19, hcy - 8, 38, 2, hc2); xEll(hd, cx, hcy - 11, 9, 4, hc2); } else xEll(hd, cx, hcy - 5, rx + 1, 7, x => x > cx + 4 ? pSh(hc2, 0.8) : hc2); }
  }
  // ---- things held ----
  const hl = L('held');
  const held = (item, x, y, dir) => {
    const at = (t, ang) => [x + Math.sin(ang) * t * dir, y - Math.cos(ang) * t];
    const shaft = (t0, t1, ang, w, col) => { const [a1, b1] = at(t0, ang), [a2, b2] = at(t1, ang); xLine(hl, a1, b1, a2, b2, w, col); };
    const WOOD = [107, 68, 35], STEEL = [201, 209, 216];
    let fist = true;
    if (item === 'spear' || item === 'staff') { shaft(-12, 44, 0.08, 2, WOOD); const [tx, ty] = at(46, 0.08); if (item === 'spear') { xLine(hl, tx, ty - 6, tx, ty, 3, STEEL); xSet(hl, tx, ty - 7, [238, 242, 245]); } else xEll(hl, tx, ty - 1, 3, 3, pRgb(spec.staffGem || '9cc0f5')); }
    else if (item === 'mace') { shaft(-5, 15, 0.5, 2, WOOD); const [mx, my] = at(18, 0.5); xEll(hl, mx, my, 3.4, 3.4, (px, py) => px < mx && py < my ? [210, 218, 226] : [138, 148, 158]); }
    else if (item === 'sword') { shaft(-4, 1, 0.45, 2, [74, 46, 24]); const [gx, gy] = at(1.5, 0.45); xLine(hl, gx - 3, gy - 1.4 * dir, gx + 3, gy + 1.4 * dir, 2, [200, 160, 58]); shaft(3, 26, 0.45, 2.4, STEEL); }
    else if (item === 'axe') { shaft(-5, 19, 0.5, 2, WOOD); const [ax, ay] = at(16, 0.5); xRect(hl, Math.round(ax + (dir > 0 ? 0 : -6)), Math.round(ay - 4), 6, 7, (px) => (dir > 0 ? px > ax + 4 : px < ax - 4) ? [230, 236, 240] : [184, 192, 200]); }
    else if (item === 'dagger') { shaft(-3, 1, 0.6, 2, [74, 46, 24]); shaft(2, 10, 0.6, 2, STEEL); }
    else if (item === 'hammer') { xLine(hl, x, y - 3, x + dir * 2, y + 16, 2, WOOD); xRect(hl, Math.round(x + dir * 2 - 4), y + 15, 9, 5, [106, 112, 120]); }
    else if (item === 'torch') { shaft(-5, 13, 0.4, 2.4, WOOD); const [fx, fy] = at(17, 0.4); xEll(hl, fx, fy, 3, 4, [232, 98, 42]); xEll(hl, fx, fy + 0.5, 2, 2.6, [246, 164, 58]); xEll(hl, fx, fy + 1, 1, 1.4, [255, 241, 176]); }
    else if (item === 'lantern') { xLine(hl, x, y + 1, x, y + 4, 1, [58, 58, 64]); xRect(hl, x - 3, y + 4, 7, 8, [74, 79, 88]); xRect(hl, x - 2, y + 5, 5, 6, [255, 210, 122]); xRect(hl, x - 1, y + 6, 2, 3, [255, 246, 200]); }
    else if (item === 'basket') { xRect(hl, x - 5, y + 2, 11, 7, (px, py) => (px + py) % 3 === 0 ? [150, 118, 50] : [184, 146, 63]); xLine(hl, x - 4, y + 2, x, y - 3, 1, [138, 106, 42]); xLine(hl, x, y - 3, x + 5, y + 2, 1, [138, 106, 42]); fist = false; }
    else if (item === 'book') { xRect(hl, x - 3, y - 4, 7, 9, pRgb(spec.bookColor || '7b4bb5')); xRect(hl, x - 3, y - 4, 1, 9, [232, 225, 200]); fist = false; }
    else if (item === 'shield') { for (let yy = 0; yy < 13; yy++) { const w = yy < 7 ? 6 : 6 - (yy - 6); for (let xx = -w; xx <= w; xx++) xSet(hl, x + xx, y - 9 + yy, xx === 0 || yy === 4 ? [227, 185, 60] : xx > 2 ? pSh(pRgb(spec.shieldColor || '9aa5b0'), 0.8) : pRgb(spec.shieldColor || '9aa5b0')); } fist = false; }
    else if (item === 'rod') shaft(-3, 34, 0.35, 1.4, WOOD);
    else if (item === 'bomb') { xEll(hl, x, y + 2, 3.5, 3.5, [42, 42, 50]); xSet(hl, x + 2, y - 2, [255, 210, 122]); fist = false; }
    else if (item === 'tube') shaft(-2, 14, 1, 2, [138, 122, 74]);
    else if (item === 'bow') { for (let t = -14; t <= 14; t++) { xSet(hl, x + dir * (2 + Math.round(4 * (1 - t * t / 196))), y + t, WOOD); xSet(hl, x + dir * 2, y + t, [232, 225, 200]); } }
    if (fist) xEll(hl, x, y, 2.6, 2.8, px => px > x + 0.5 ? skS : skin);
  };
  if (!back) { if (spec.held) held(spec.held, rh[0], rh[1], 1); if (spec.offhand && !side) held(spec.offhand, lh[0], lh[1], -1); }
  // compose, remembering which part each pixel belongs to and how far forward it sits
  const out = xLayer(), part = new Int16Array(XW * XH).fill(-1);
  const order = back ? [hl, ...layers.filter(l => l !== hl)] : layers;
  order.forEach((l, z) => { for (let i = 0; i < l.d.length; i += 4) if (l.d[i + 3]) { out.d[i] = l.d[i]; out.d[i + 1] = l.d[i + 1]; out.d[i + 2] = l.d[i + 2]; out.d[i + 3] = 255; part[i >> 2] = z; } });
  joinParts(out.d, part);
  let c = document.createElement('canvas'); c.width = XW; c.height = XH;
  const g = c.getContext('2d'), img = g.createImageData(XW, XH); img.data.set(out.d); g.putImageData(img, 0, 0);
  // children are drawn smaller, from the feet up
  if (spec.build === 'child' || spec.build === 'short') { const k = spec.build === 'child' ? 0.72 : 0.78, s2 = document.createElement('canvas'); s2.width = XW; s2.height = XH; const g2 = s2.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(c, Math.round(XW * (1 - k) / 2), Math.round(XH * (1 - k)), Math.round(XW * k), Math.round(XH * k)); c = s2; }
  c.hd = 1;
  return c;
}
