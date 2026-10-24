// The Temple Warden — head-and-shoulders portraits, 48×48, placed pixel by pixel in the classic portrait style:
// flat color with one shadow tone and a touch of light, a dark outline, eyes with whites and a catchlight,
// a nose drawn as a single shaded stroke, a mouth of a few pixels. Built from the same spec as each person's figure.
'use strict';

const PW = 48;
const pRgb = h => hexRgb((h || '888888').replace('#', ''));
const pMix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// shade goes cooler as it deepens (toward violet), the way painters and pixel artists shift hue in shadow
const pSh = (c, f) => { const d = Math.max(0, 1 - f); return [c[0] * f - d * 10, c[1] * f - d * 6, c[2] * f + d * 26].map(v => Math.max(0, Math.min(255, v))); };
const pLayer = () => ({ d: new Uint8ClampedArray(PW * PW * 4) });
function pSet(L, x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= PW || y >= PW) return; const i = (y * PW + x) * 4; L.d[i] = c[0]; L.d[i + 1] = c[1]; L.d[i + 2] = c[2]; L.d[i + 3] = 255; }
const pHas = (L, x, y) => x >= 0 && y >= 0 && x < PW && y < PW && L.d[(y * PW + x) * 4 + 3] > 0;
const pClear = (L, x, y) => { if (x >= 0 && y >= 0 && x < PW && y < PW) L.d[(y * PW + x) * 4 + 3] = 0; };
const pSym = (L, x, y, c) => { pSet(L, x, y, c); pSet(L, 47 - x, y, c); };
function pOutline(L, k = 0.32) {
  const src = new Uint8ClampedArray(L.d), A = (x, y) => x >= 0 && y >= 0 && x < PW && y < PW && src[(y * PW + x) * 4 + 3] > 0;
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    if (A(x, y)) continue;
    let n = -1; for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (A(x + dx, y + dy)) { n = ((y + dy) * PW + x + dx) * 4; break; }
    if (n >= 0) pSet(L, x, y, pMix([30, 22, 32], [src[n], src[n + 1], src[n + 2]], k));
  }
}
const pStack = (out, L) => { for (let i = 0; i < L.d.length; i += 4) if (L.d[i + 3]) { out.d[i] = L.d[i]; out.d[i + 1] = L.d[i + 1]; out.d[i + 2] = L.d[i + 2]; out.d[i + 3] = 255; } };

function drawPortrait(spec, opt = {}) {
  const skin = pRgb(spec.skin || 'eab38b'), skS = pSh(skin, 0.84), skD = pSh(skin, 0.7), skL = pMix(skin, [255, 248, 236], 0.28);
  const hair = pRgb(spec.hairColor || '5a3a1e'), haD = pSh(hair, 0.68), haL = pMix(hair, [255, 240, 220], 0.28);
  const shirt = pRgb(spec.shirt || '8a5a3a'), iris = pRgb(spec.eyes || '5a4030');
  const armor = spec.armor === 'mail' ? [169, 179, 189] : spec.armor === 'plate' ? [211, 220, 228] : spec.armor === 'leather' ? [122, 80, 48] : null;
  const top = spec.torso === 'coat' ? pRgb(spec.coatColor || '3a3a4a') : armor || shirt;
  const soft = spec.jaw === 'soft', child = spec.build === 'child';
  const layers = [];
  const L = name => { const l = pLayer(); l.name = name; layers.push(l); return l; };
  const outline = (l, k) => { if (!opt.raw) pOutline(l, k); };
  const hs = spec.hair || 'short';
  const sideLen = { long: 46, braid: 21, curly: 27, short: 20, crop: 18, bun: 19, ponytail: 19, balding: 25, mohawk: 0, bald: 0 }[hs] ?? 20;

  // long hair falls behind the shoulders
  if (sideLen > 26 && !spec.hat && !opt.headOnly) {
    const bh = L('backhair');
    for (let y = 10; y < Math.min(PW, sideLen); y++) for (let x = 12; x <= 35; x++) { const w = 11.5 + Math.min(2, (y - 10) * 0.12), ragged = y > sideLen - 4 && (x * 7 + y) % 3 === 0; if (Math.abs(x + 0.5 - 24) <= w && !ragged) pSet(bh, x, y, ((x + y) % 6 === 0) ? haD : x > 28 ? pSh(hair, 0.85) : hair); }
    outline(bh);
  }
  // shoulders and what's worn on them (a figure brings its own body, and only borrows the head)
  if (!opt.headOnly) {
  const cl = L('clothes');
  for (let y = 38; y < PW; y++) {
    const w = Math.min(23, 9 + (y - 38) * 1.9) * (child ? 0.85 : spec.build === 'broad' || spec.build === 'stout' ? 1.08 : 1);
    for (let x = 0; x < PW; x++) {
      const dx = x + 0.5 - 24; if (Math.abs(dx) > w) continue;
      let c = dx > w * 0.45 ? pSh(top, 0.82) : dx < -w * 0.7 ? pMix(top, [255, 245, 230], 0.12) : top;
      if (spec.armor === 'mail' && (x + y) % 2 === 0) c = pSh(c, 0.86);
      if (spec.torso === 'coat' && Math.abs(dx) < 3.5) c = Math.abs(dx) > 2.5 ? pSh(top, 0.6) : shirt;
      if (spec.tabard && Math.abs(dx) < 5 && y > 42) c = pRgb(spec.tabard);
      if ((spec.torso === 'apron' || spec.apron) && (Math.abs(dx - 6) < 1 || Math.abs(dx + 6) < 1)) c = pRgb(spec.apronColor || 'efe6d2');
      pSet(cl, x, y, c);
    }
  }
  // the neckline: a V of skin, or a collar
  if (!armor || spec.armor === 'leather') for (let y = 38; y < 43; y++) for (let x = 24 - (43 - y) * 0.7; x <= 23 + (43 - y) * 0.7; x++) pSet(cl, x, y, y === 38 ? skD : skS);
  if (spec.necklace) for (let x = 20; x <= 27; x++) pSet(cl, x, 41 + Math.round(Math.abs(x - 23.5) < 2 ? 1 : 0), [200, 160, 58]);
  outline(cl);
  // the neck, in the shade of the jaw
  const nk = L('neck');
  for (let y = 31; y < 40; y++) for (let x = 20; x <= 27; x++) pSet(nk, x, y, y < 34 ? skD : x > 25 ? skD : skS);
  }
  // the face
  const fc = L('face');
  // a broad, rounded face with a squarish jaw and a short chin (not the long medieval oval)
  const cy = child ? 23 : 22, ry = child ? 10.5 : 10.8, rx = child ? 10.5 : 10.6;
  const halfW = y => { const t = (y + 0.5 - cy) / ry; if (Math.abs(t) > 1) return -1; const p = t > 0 ? (soft || child ? 2.3 : 2.9) : 2.2; return Math.max(0, rx * Math.pow(1 - Math.pow(Math.abs(t), p), 1 / p)); };
  for (let y = 0; y < PW; y++) { const w = halfW(y); if (w < 0) continue; for (let x = 0; x < PW; x++) { const dx = x + 0.5 - 24; if (Math.abs(dx) > w) continue; let c = skin; if (dx > w - 2.2 || (y > cy + ry * 0.7 && dx > 0)) c = skS; if (dx < -w + 3 && y < cy && y > cy - 6) c = skL; pSet(fc, x, y, c); } }
  // ears
  for (const s of [-1, 1]) for (let y = cy - 1; y <= cy + 3; y++) { const x = s < 0 ? 24 - rx - 1 : 23 + rx + 1; pSet(fc, x, y, s < 0 ? skin : skS); if (y > cy && y < cy + 3) pSet(fc, x + (s < 0 ? 1 : -1) * 0, y, skD); }
  outline(fc, 0.38);
  // eyes: whites either side of the iris, a pupil, a catchlight, a heavy lash line, a brow above
  const ey = cy - 1;
  const lash = pMix([36, 22, 24], skin, 0.08), brow = pRgb(spec.browColor || '') || haD;
  const browC = spec.browColor ? pRgb(spec.browColor) : pSh(hair, hs === 'bald' || hs === 'balding' ? 0.75 : 0.62);
  for (const right of [0, 1]) {
    const X = c => right ? 47 - (18 + c) : 18 + c; // the left eye spans 17–21, mirrored exactly for the right
    for (let c = -1; c <= 3; c++) pSet(fc, X(c), ey - 1, lash);
    pSet(fc, X(-2), ey - 1 + (spec.lashes ? -1 : 0), spec.lashes ? lash : skS); if (spec.lashes) pSet(fc, X(-2), ey, lash);
    pSet(fc, X(-1), ey, [244, 240, 232]); pSet(fc, X(0), ey, pMix(pSh(iris, 0.6), [255, 255, 255], 0.65)); pSet(fc, X(1), ey, [20, 12, 16]); pSet(fc, X(2), ey, pSh(iris, 0.7)); pSet(fc, X(3), ey, [244, 240, 232]);
    pSet(fc, X(-1), ey + 1, [236, 231, 222]); pSet(fc, X(0), ey + 1, pMix(iris, [255, 255, 255], 0.2)); pSet(fc, X(1), ey + 1, iris); pSet(fc, X(2), ey + 1, pMix(iris, [255, 255, 255], 0.2)); pSet(fc, X(3), ey + 1, [236, 231, 222]);
    for (let c = 0; c <= 2; c++) pSet(fc, X(c), ey + 2, pMix(skin, skS, 0.5));
    // the brow, well above the eye: a gentle arch
    for (let c = -1; c <= 3; c++) pSet(fc, X(c), ey - 4 - (c >= 0 && c <= 1 ? 1 : 0), browC);
    if (spec.heavyBrow) for (let c = -1; c <= 3; c++) pSet(fc, X(c), ey - 3 - (c === -1 ? 0 : 0), pMix(browC, skin, 0.25));
    if (spec.glasses) { for (let c = -2; c <= 4; c++) { pSet(fc, X(c), ey - 2, [40, 32, 36]); pSet(fc, X(c), ey + 3, [40, 32, 36]); } for (let r = -2; r <= 3; r++) { pSet(fc, X(-2), ey + r, [40, 32, 36]); pSet(fc, X(4), ey + r, [40, 32, 36]); } }
  }
  if (spec.glasses) { pSet(fc, 23, ey, [40, 32, 36]); pSet(fc, 24, ey, [40, 32, 36]); }
  // the nose, lit from the left: its shaded side, a lit tip, the nostrils
  for (let y = ey + 2; y <= ey + 4; y++) pSet(fc, 25, y, skS);
  pSet(fc, 23, ey + 5, skL); pSet(fc, 24, ey + 5, skin); pSet(fc, 25, ey + 5, skD); pSet(fc, 22, ey + 5, skS);
  pSet(fc, 23, ey + 6, skS); pSet(fc, 24, ey + 6, skD);
  // the mouth: the parting line, a lit lower lip, the shadow beneath
  const lip = soft ? pMix(skD, [200, 96, 96], 0.5) : pMix(skD, [180, 100, 90], 0.25), my = ey + 8;
  for (let x = 21; x <= 26; x++) pSet(fc, x, my, x === 21 || x === 26 ? skD : pMix(lip, [60, 25, 25], 0.45));
  for (let x = 22; x <= 25; x++) pSet(fc, x, my + 1, x === 23 ? pMix(lip, [255, 240, 230], 0.25) : lip);
  for (let x = 22; x <= 25; x++) pSet(fc, x, my + 2, skS);
  if (spec.blush) { pSym(fc, 18, ey + 5, pMix(skin, [230, 120, 110], 0.4)); pSym(fc, 19, ey + 5, pMix(skin, [230, 120, 110], 0.3)); }
  if (spec.wrinkles) { pSym(fc, 16, ey + 2, skS); pSym(fc, 16, ey + 3, skS); pSym(fc, 21, ey + 8, skS); for (let x = 20; x <= 27; x++) pSet(fc, x, cy - 8, skS); }
  if (spec.stubble) for (let y = my + 2; y < PW; y++) for (let x = 0; x < PW; x++) if (pHas(fc, x, y) && (x + y) % 2 === 0 && (x * 3 + y) % 4 === 0) { const w = halfW(y); if (w > 0 && Math.abs(x + 0.5 - 24) < w - 0.5) pSet(fc, x, y, pMix(skin, hair, 0.28)); }
  // the beard
  if (spec.beard) {
    const bd = L('beard'), bc = pRgb(spec.beardColor || spec.hairColor || '5a3a1e'), bcD = pSh(bc, 0.72), bcL = pMix(bc, [255, 240, 220], 0.2);
    const tone = (x, y) => (x * 5 + y * 3) % 7 === 0 ? bcL : (x + y * 2) % 5 === 0 ? bcD : x > 27 ? pSh(bc, 0.86) : bc;
    if (spec.beard === 'moustache') { for (let x = 20; x <= 27; x++) pSet(bd, x, my - 1, tone(x, my - 1)); pSet(bd, 20, my, bc); pSet(bd, 27, my, bc); pSet(bd, 19, my + 1, bc); pSet(bd, 28, my + 1, bc); }
    else {
      const long = spec.beard === 'long' ? 9 : 2;
      for (let y = ey + 4; y < Math.min(PW, cy + ry + long); y++) for (let x = 0; x < PW; x++) {
        const dx = x + 0.5 - 24, w = y < cy + ry - 1 ? halfW(y) : Math.max(2, 7 - (y - cy - ry) * 0.6);
        if (w < 0 || Math.abs(dx) > w + 0.4) continue;
        if (y < my - 1 && Math.abs(dx) < 6.5) continue; // the cheeks above the moustache stay bare
        if (y >= my && y <= my + 1 && Math.abs(dx) < 2.6) continue; // the mouth shows through
        pSet(bd, x, y, tone(x, y));
      }
      for (let x = 22; x <= 25; x++) pSet(bd, x, my + 1, lip);
    }
    outline(bd, 0.4);
  }
  // the hair
  if (hs !== 'bald' && !(spec.hat && ['hood', 'helm', 'kerchief', 'wizard'].includes(spec.hat))) {
    const hr = L('hair');
    // clean bands: a sheen across the crown on the lit side, shade down the far side, a few strands
    const tone = (x, y) => {
      const crown = cy - 12;
      if (y >= crown + 2 && y <= crown + 3 && x >= 16 && x <= 23 && (x + y) % 4 !== 0) return haL;
      if (x > 30 || (x > 27 && y > cy - 4)) return haD;
      if (y > crown + 4 && (x * 2 + y) % 9 === 0 && x < 30) return pSh(hair, 0.8);
      return x > 27 ? pSh(hair, 0.88) : hair;
    };
    if (hs === 'balding') { for (let y = cy - 4; y <= cy + 3; y++) for (const x of [14, 15, 32, 33]) pSet(hr, x, y, tone(x, y)); }
    else if (hs === 'mohawk') { for (let y = cy - 16; y < cy - 7; y++) for (let x = 22; x <= 25; x++) pSet(hr, x, y, tone(x, y)); }
    else {
      // a side part: the fringe sweeps down from the right toward the left brow, ragged at the tips
      const sweep = x => Math.round((30 - x) * 0.22);
      const fringe = x => cy - ({ crop: 10, short: 9, curly: 8, long: 9, braid: 9, bun: 10, ponytail: 9 }[hs] ?? 9) + Math.max(0, sweep(x)) + ((x * 7) % 4 === 0 ? 1 : 0) - (x === 29 || x === 30 ? 1 : 0);
      for (let y = cy - 13; y < Math.min(PW, cy - 11 + sideLen); y++) for (let x = 0; x < PW; x++) {
        const dx = x + 0.5 - 24, t = (y + 0.5 - (cy - 2)) / 12.5, w = Math.abs(t) <= 1 ? 11.6 * Math.sqrt(1 - t * t) : (y > cy ? 11.6 : -1);
        if (w < 0 || Math.abs(dx) > w + (hs === 'curly' ? 1 : 0)) continue;
        const onFace = Math.abs(dx) < rx - 0.5 && y >= fringe(x);
        const sidesTo = cy - 11 + sideLen;
        if (onFace) continue;
        if (y > cy - 6 && Math.abs(dx) >= rx - 0.5 && y >= sidesTo) continue;
        if (hs === 'curly' && (x * 13 + y * 7) % 9 === 0 && Math.abs(dx) > w - 1) continue;
        pSet(hr, x, y, tone(x, y));
      }
      // one lock that won't lie flat
      if (hs === 'crop' || hs === 'short' || hs === 'curly') { pSet(hr, 27, cy - 14, tone(27, cy - 14)); pSet(hr, 28, cy - 15, tone(28, cy - 15)); pSet(hr, 17, fringe(17), tone(17, fringe(17))); }
      if (hs === 'bun') for (let y = cy - 18; y < cy - 12; y++) for (let x = 20; x <= 27; x++) if (Math.hypot(x + 0.5 - 24, y + 0.5 - (cy - 15)) < 3.6) pSet(hr, x, y, tone(x, y));
      if (hs === 'ponytail') for (let y = cy - 6; y < cy + 10; y++) for (let x = 34; x <= 37; x++) if (x - 34 < 3 - (y - cy) * 0.1) pSet(hr, x, y, tone(x, y));
    }
    outline(hr, 0.3);
  }
  // hats
  if (spec.hat) {
    const ht = L('hat'), hc2 = pRgb(spec.hatColor || '3b6fc4'), hD = pSh(hc2, 0.75), hL = pMix(hc2, [255, 250, 240], 0.25);
    const cap = (y0, y1, w0) => { for (let y = y0; y <= y1; y++) for (let x = 0; x < PW; x++) { const dx = x + 0.5 - 24, w = w0 * Math.sqrt(Math.max(0, 1 - Math.pow((y1 - y) / (y1 - y0 + 1), 2))); if (Math.abs(dx) <= w) pSet(ht, x, y, dx > w * 0.5 ? hD : dx < -w * 0.5 ? hL : hc2); } };
    if (spec.hat === 'kerchief') { cap(cy - 14, cy - 6, 12); for (let x = 12; x <= 35; x++) pSet(ht, x, cy - 6, hD); for (let i = 0; i < 14; i++) pSet(ht, 15 + (i * 7) % 18, cy - 13 + (i * 3) % 6, hL); }
    else if (spec.hat === 'hood') { for (let y = cy - 14; y < PW; y++) for (let x = 0; x < PW; x++) { const dx = x + 0.5 - 24, t = (y + 0.5 - (cy - 1)) / 14, w = t < 1 ? 13 * Math.sqrt(Math.max(0, 1 - Math.min(1, t * t))) : 13; if (Math.abs(dx) > Math.max(w, y > cy + 6 ? 15 : 0)) continue; if (Math.abs(dx) < rx && y > cy - 9 && y < cy + ry) continue; pSet(ht, x, y, dx > 6 ? hD : hc2); } }
    else if (spec.hat === 'helm') { cap(cy - 14, cy - 5, 12); for (let x = 12; x <= 35; x++) pSet(ht, x, cy - 5, hD); for (let y = cy - 5; y <= cy + 3; y++) { pSet(ht, 23, y, hc2); pSet(ht, 24, y, hD); } }
    else if (spec.hat === 'straw') { for (let x = 4; x <= 43; x++) { pSet(ht, x, cy - 8, (x % 3) ? hc2 : hD); pSet(ht, x, cy - 7, hD); } cap(cy - 16, cy - 9, 9); for (let x = 15; x <= 32; x++) pSet(ht, x, cy - 10, [125, 32, 39]); }
    else if (spec.hat === 'wizard') { for (let y = 0; y < cy - 7; y++) { const w = (y + 1) * 0.55; for (let x = 0; x < PW; x++) { const dx = x + 0.5 - 26 + y * 0.12; if (Math.abs(dx) <= w) pSet(ht, x, y, dx > w * 0.4 ? hD : hc2); } } for (let x = 6; x <= 41; x++) { pSet(ht, x, cy - 7, hc2); pSet(ht, x, cy - 6, hD); } }
    else if (spec.hat === 'cap') { cap(cy - 14, cy - 7, 11); for (let x = 22; x <= 38; x++) pSet(ht, x, cy - 7, hD); }
    else if (spec.hat === 'crown') { for (let x = 15; x <= 32; x++) { pSet(ht, x, cy - 9, [227, 185, 60]); pSet(ht, x, cy - 10, [243, 211, 108]); if (x % 4 === 3) { pSet(ht, x, cy - 11, [227, 185, 60]); pSet(ht, x, cy - 12, [243, 211, 108]); } } pSet(ht, 23, cy - 10, [185, 52, 60]); }
    outline(ht, 0.3);
  }
  const out = pLayer(); for (const l of layers) if (!opt.only || opt.only.includes(l.name)) pStack(out, l);
  const c = document.createElement('canvas'); c.width = PW; c.height = PW;
  const g = c.getContext('2d'), img = g.createImageData(PW, PW); img.data.set(out.d); g.putImageData(img, 0, 0);
  c.portrait = 1;
  return c;
}
const PORTRAIT_CACHE = new Map();
function portrait(spec, opt) { const k = JSON.stringify(spec) + (opt ? '|' + JSON.stringify(opt) : ''); let c = PORTRAIT_CACHE.get(k); if (!c) { c = drawPortrait(spec, opt); PORTRAIT_CACHE.set(k, c); } return c; }
