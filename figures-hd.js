// The Temple Warden — high-detail people, 64×96, painted rather than placed pixel by pixel.
// Real proportions (about six and a half heads tall). Every part is drawn as a shape at four times the final size,
// lit from the upper left, casting a soft shadow on whatever is beneath it, then the whole figure is reduced to
// 64×96 and given a clean edge. Same specs as the 32-pixel people: build, skin, hair, face, clothes, hat, held item.
'use strict';

const HDW = 64, HDH = 96, HDS = 4;
const hc = h => (h && h[0] === '#' ? h : '#' + (h || '888888'));
const hsh = (h, f) => '#' + shadeHex(hc(h).slice(1), f);
const hmix = (a, b, t) => { const A = hexRgb(hc(a).slice(1)), B = hexRgb(hc(b).slice(1)); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };

// ---- shapes ----
const capsule = (ax, ay, bx, by, w0, w1) => g => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.moveTo(ax + nx * w0 / 2, ay + ny * w0 / 2); g.lineTo(bx + nx * w1 / 2, by + ny * w1 / 2); g.lineTo(bx - nx * w1 / 2, by - ny * w1 / 2); g.lineTo(ax - nx * w0 / 2, ay - ny * w0 / 2); g.closePath();
  g.moveTo(bx + w1 / 2, by); g.arc(bx, by, w1 / 2, 0, Math.PI * 2);
  g.moveTo(ax + w0 / 2, ay); g.arc(ax, ay, w0 / 2, 0, Math.PI * 2);
};
const ellipse = (x, y, rx, ry, rot = 0) => g => { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const poly = pts => g => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]); else g.lineTo(p[0], p[1]); } g.closePath(); };

// cloth: specks one final pixel across, so the weave survives the reduction to 64×96
function clothTex(kind, box, seed) {
  return g2 => {
    const r = srand(seed), [x0, y0, x1, y1] = box;
    for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) {
      const v = r();
      if (kind === 'wool') { if ((x + (y >> 1)) % 2 === 0) { g2.fillStyle = 'rgba(20,10,20,0.07)'; g2.fillRect(x, y, 1, 1); } if (v < 0.06) { g2.fillStyle = 'rgba(255,244,226,0.1)'; g2.fillRect(x, y, 1, 1); } }
      else if (kind === 'linen') { if ((x + y) % 2 === 0) { g2.fillStyle = 'rgba(20,10,20,0.07)'; g2.fillRect(x, y, 1, 1); } if (v < 0.1) { g2.fillStyle = 'rgba(20,10,20,0.14)'; g2.fillRect(x, y, 1, 1); } else if (v > 0.93) { g2.fillStyle = 'rgba(255,250,240,0.18)'; g2.fillRect(x, y, 1, 1); } }
      else if (kind === 'leather') { if (v < 0.2) { g2.fillStyle = `rgba(${v < 0.1 ? '20,10,20,0.2' : '255,230,190,0.12'})`; g2.fillRect(x, y, 1 + (v < 0.05 ? 1 : 0), 1); } }
      else if (kind === 'denim') { if ((x - y) % 3 === 0) { g2.fillStyle = 'rgba(20,10,30,0.15)'; g2.fillRect(x, y, 1, 1); } if (v < 0.08) { g2.fillStyle = 'rgba(255,255,255,0.12)'; g2.fillRect(x, y, 1, 1); } }
    }
  };
}
const SEAM = (g2, pts) => { g2.setLineDash([0.6, 0.7]); stroke(g2, pts, 'rgba(255,240,210,0.28)', 0.3); g2.setLineDash([]); };
// a part: filled with its color, casting a soft shadow down and right onto what lies beneath, then shaded as a
// rounded form lit from the upper left; tex() can add folds, grain or rings inside it
function part(g, path, col, box, o = {}) {
  g.save();
  if (!o.noShadow) { g.shadowColor = 'rgba(18,10,20,' + (o.sa ?? 0.42) + ')'; g.shadowBlur = 5; g.shadowOffsetX = 2; g.shadowOffsetY = 3; }
  g.beginPath(); path(g); g.fillStyle = col; g.fill();
  g.restore();
  // cel shading: the part in its shadow tone, then the part again nudged toward the light in its own color,
  // which leaves one clean crescent of shade on the side away from the light
  g.save(); g.beginPath(); path(g); g.clip();
  const [x0, y0, x1, y1] = box, dd = o.cel ?? Math.min(1.6, 0.7 + Math.min(x1 - x0, y1 - y0) * 0.09);
  g.fillStyle = cdark(col, 0.72); g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
  g.save(); g.translate(-dd * 0.8, -dd); g.beginPath(); path(g); g.fillStyle = col; g.fill(); g.restore();
  if (o.tex) o.tex(g);
  if (o.shine) { g.save(); g.translate(-dd * 0.5, -dd * 0.6); g.beginPath(); ellipse(x0 + (x1 - x0) * 0.32, y0 + (y1 - y0) * 0.28, (x1 - x0) * 0.16, (y1 - y0) * 0.1)(g); g.fillStyle = 'rgba(255,250,240,0.55)'; g.fill(); g.restore(); }
  g.restore();
}
// darken any color (hex or rgb()) by a factor
function cdark(col, f) {
  if (col[0] === '#') return hsh(col.slice(1), f);
  const m = col.match(/\d+(\.\d+)?/g).map(Number); return `rgb(${Math.round(m[0] * f)},${Math.round(m[1] * f * 0.98)},${Math.round(m[2] * f * 1.04 + 4)})`;
}
const stroke = (g, pts, col, w) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]); else g.lineTo(p[0], p[1]); } g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
const dot = (g, x, y, r, col) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); };
const srand = seed => { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

// ---- the figure ----
const HD_BUILD = {
  adult: { sh: 10.5, waist: 7.4, hip: 8, leg: 3.6, arm: 3.2, k: 1 },
  broad: { sh: 12.2, waist: 8.6, hip: 8.6, leg: 4.1, arm: 3.9, k: 1.02 },
  slim: { sh: 9.4, waist: 6.4, hip: 7.2, leg: 3.2, arm: 2.8, k: 1 },
  stout: { sh: 11.4, waist: 10, hip: 9.6, leg: 4, arm: 3.6, k: 0.97, belly: 1 },
  child: { sh: 8.6, waist: 6.6, hip: 7, leg: 3.2, arm: 2.7, k: 0.66, child: 1 },
  short: { sh: 9.6, waist: 7.6, hip: 8, leg: 3.4, arm: 3, k: 0.72 },
  huge: { sh: 13, waist: 10, hip: 10, leg: 4.6, arm: 4.4, k: 1.1 },
};
function drawFigureHD(spec, view, pose) {
  const c = document.createElement('canvas'); c.width = HDW * HDS; c.height = HDH * HDS;
  const g = c.getContext('2d'); g.scale(HDS, HDS); g.lineCap = 'round'; g.lineJoin = 'round';
  let eyesAt = null;
  const B = HD_BUILD[spec.build] || HD_BUILD.adult, side = view === 'right', back = view === 'up';
  const skin = hc(spec.skin || 'eab38b'), skinD = hsh(spec.skin || 'eab38b', 0.82);
  const shirt = hc(spec.shirt || '8a5a3a'), pants = hc(spec.pants || '4a4038'), boots = hc(spec.boots || '3a2a1e');
  const sleeve = hc(spec.sleeve || spec.shirt || '8a5a3a'), hair = hc(spec.hairColor || '5a3a1e');
  const R = srand((spec.skin || '').length * 97 + (spec.hairColor || '').charCodeAt(1) * 31 + (spec.shirt || '').charCodeAt(2) * 7);
  // walking: feet lift and stride, hands swing; at rest the shoulders rise and fall with breath
  const walk = typeof pose === 'number' ? pose : -1, breath = pose === 'idle1' ? -0.5 : 0;
  const FS = walk >= 0 ? FRONT_STEPS[walk] : { l: 0, r: 0, lh: [0, 0], rh: [0, 0], lift: 0 };
  const SS = walk >= 0 ? SIDE_STEPS[walk] : { nf: [1, 0], ff: [-1, 0], nh: [-1, 0], fh: [1, 0], lift: 0 };
  const lift = (walk >= 0 ? FS.lift : 0) * 0.8;
  g.save();
  g.translate(32, 94); g.scale(B.k, B.k); g.translate(-32, -94); // children and goblins are smaller, from the feet up
  g.translate(0, -lift);
  // cartoon proportions: a shorter body under a big head
  const BODY = B.child ? 0.86 : 0.8, squash = () => { g.save(); g.translate(32, 94); g.scale(1, BODY); g.translate(-32, -94); };
  squash();
  const cx = 32, hy = 19 + breath * 0.5, sy = 31 + breath, wy = 51, hipY = 55, kneeY = 73, footY = 92 + lift;
  const coat = spec.torso === 'coat', robe = spec.torso === 'robe' || spec.torso === 'gown', dress = spec.torso === 'dress' || robe;
  const armorCol = spec.armor === 'mail' ? '#a9b3bd' : spec.armor === 'plate' ? '#d3dce4' : spec.armor === 'leather' ? '#7a5030' : null;
  const top = armorCol || shirt;

  // ---- long hair hangs behind everything ----
  if (!side && (spec.hair === 'long' || spec.hair === 'braid' || back)) {
    if (spec.hair === 'long') part(g, poly([[cx - 7, hy - 3], [cx + 7, hy - 3], [cx + 7.6, hy + 18, cx + 6, sy + 10], [cx - 6, sy + 10], [cx - 7.6, hy + 18, cx - 7, hy - 3]]), hair, [cx - 8, hy - 4, cx + 8, sy + 10], { noShadow: 1 });
  }
  // ---- legs and boots ----
  const leg = (hx, fx, fy, col, far) => {
    const kx = (hx + fx) / 2 + (side ? 1.2 : 0), ky = (hipY + fy) / 2 - 1;
    if (!dress || spec.torso === 'dress' && !robe) part(g, g2 => { capsule(hx, hipY, kx, ky, B.leg * 2, B.leg * 1.7)(g2); capsule(kx, ky, fx, fy - 4, B.leg * 1.7, B.leg * 1.25)(g2); }, far ? hsh(col.slice(1), 0.8) : col, [hx - 4, hipY, fx + 4, fy], { tex: g2 => { clothTex('denim', [hx - 6, hipY, hx + 6, fy], 11)(g2); stroke(g2, [[kx - 1, ky - 1], [kx + 1.5, ky + 0.6]], 'rgba(0,0,0,0.22)', 0.5); SEAM(g2, [[hx + (hx < cx ? -B.leg + 0.6 : B.leg - 0.6), hipY + 1], [fx + (hx < cx ? -B.leg * 0.6 : B.leg * 0.6), fy - 6]]); } });
    // the boot: a shaft and a foot that points the way you face
    const toe = side ? 3.6 : 0.6;
    part(g, g2 => { capsule(fx, fy - 6, fx, fy - 1.5, B.leg * 1.35, B.leg * 1.45)(g2); ellipse(fx + toe * 0.6, fy - 1.2, B.leg * (side ? 1.2 : 0.85) + (side ? 1.2 : 0), 1.6)(g2); }, far ? hsh(boots.slice(1), 0.8) : boots, [fx - 4, fy - 7, fx + 5, fy + 1], { hi: 0.4, tex: g2 => { clothTex('leather', [fx - 5, fy - 7, fx + 6, fy + 1], 13)(g2); stroke(g2, [[fx - 2, fy - 5.5], [fx + 2, fy - 5.5]], 'rgba(255,255,255,0.18)', 0.5); } });
  };
  if (side) {
    leg(cx - 0.5, cx + SS.ff[0] * 2, footY + SS.ff[1] * 2, pants, 1);
  } else {
    leg(cx - 3.6, cx - 4 + (FS.lh ? 0 : 0), footY - FS.l * 2, pants, 0);
    leg(cx + 3.6, cx + 4, footY - FS.r * 2, pants, 0);
  }
  // ---- far arm (side view) ----
  const sleeveCol = armorCol && spec.armor !== 'leather' ? hsh(armorCol.slice(1), 0.95) : sleeve;
  const arm = (shx, shy, hx2, hy2, col, far, bare) => {
    const ex = (shx + hx2) / 2 + (side ? -1 : (shx < cx ? -0.8 : 0.8)), ey = (shy + hy2) / 2;
    part(g, g2 => { capsule(shx, shy, ex, ey, B.arm * 1.9, B.arm * 1.6)(g2); capsule(ex, ey, hx2, hy2 - 2, B.arm * 1.6, B.arm * 1.3)(g2); }, far ? hsh(col.slice(1), 0.78) : col, [shx - 4, shy, hx2 + 4, hy2], { tex: g2 => { if (!armorCol || spec.armor === 'leather') clothTex(spec.armor === 'leather' ? 'leather' : 'wool', [Math.min(shx, hx2) - 4, shy, Math.max(shx, hx2) + 4, hy2], 17)(g2); else if (spec.armor === 'mail') for (let y = shy; y < hy2; y += 1) for (let x = Math.min(shx, hx2) - 3; x < Math.max(shx, hx2) + 3; x += 1) if ((x + y) % 2 === 0) { g2.fillStyle = 'rgba(40,46,56,0.3)'; g2.fillRect(x, y, 1, 1); } stroke(g2, [[ex - 1.2, ey - 0.4], [ex + 1.2, ey + 0.6]], 'rgba(0,0,0,0.25)', 0.5); } });
    if (!bare) part(g, ellipse(hx2, hy2, B.arm * 0.75, B.arm * 0.9), far ? skinD : skin, [hx2 - 2, hy2 - 2, hx2 + 2, hy2 + 2], { hi: 0.25, lo: 0.3 });
  };
  if (side) arm(cx - 1, sy + 2, cx + SS.fh[0] * 2, wy + 7 + SS.fh[1] * 2, sleeveCol, 1);
  // ---- the torso and what's worn on it ----
  const shW = B.sh, wW = B.waist, hW = B.hip;
  const torsoPath = side
    ? poly([[cx - 4.5, sy - 0.5], [cx + 4, sy - 0.5], [cx + 5.6 + (B.belly ? 2.5 : 0), sy + 9, cx + 4.6 + (B.belly ? 2 : 0), wy], [cx + 4.6, hipY + 1], [cx - 4.6, hipY + 1], [cx - 4.8, wy], [cx - 5.6, sy + 8, cx - 4.5, sy - 0.5]])
    : poly([[cx - shW + 1.5, sy - 1], [cx + shW - 1.5, sy - 1], [cx + shW + 0.3, sy + 1.5, cx + shW - 0.5, sy + 4], [cx + wW + (B.belly ? 2.5 : 0), wy - 4, cx + wW, wy], [cx + hW, hipY + 1], [cx - hW, hipY + 1], [cx - wW, wy], [cx - wW - (B.belly ? 2.5 : 0), wy - 4, cx - shW + 0.5, sy + 4], [cx - shW - 0.3, sy + 1.5, cx - shW + 1.5, sy - 1]]);
  const tBox = [cx - shW, sy - 1, cx + shW, hipY + 1];
  // a skirt, coat tails or robe below the waist
  if (dress || coat) {
    const len = robe ? footY - 3 : coat ? kneeY + 4 : footY - 6, flare = robe ? 3 : coat ? 1.5 : 4;
    const col = coat ? hc(spec.coatColor || '3a3a4a') : spec.skirt ? hc(spec.skirt) : shirt;
    part(g, side ? poly([[cx - 5, wy], [cx + 5, wy], [cx + 7 + flare, len], [cx - 6 - flare * 0.6, len]]) : poly([[cx - wW, wy], [cx + wW, wy], [cx + hW + flare, len - 2, cx + hW + flare, len], [cx - hW - flare, len], [cx - hW - flare, len - 2, cx - wW, wy]]), col, [cx - 10, wy, cx + 10, len], {
      tex: g2 => { clothTex(coat ? 'wool' : 'linen', [cx - 12, wy, cx + 12, len], 29)(g2); for (let i = -2; i <= 2; i++) stroke(g2, [[cx + i * 3, wy + 3], [cx + i * 4.2, len]], 'rgba(0,0,0,0.2)', 0.6); for (let i = -2; i <= 2; i++) stroke(g2, [[cx + i * 3 + 1, wy + 4], [cx + i * 4.2 + 1.2, len - 1]], 'rgba(255,240,220,0.08)', 0.5); stroke(g2, [[cx - hW - flare, len - 0.6], [cx + hW + flare, len - 0.6]], 'rgba(0,0,0,0.25)', 0.8); },
    });
    if (side) leg(cx + 0.5, cx + SS.nf[0] * 2, footY + SS.nf[1] * 2, pants, 0);
  } else if (side) leg(cx + 0.5, cx + SS.nf[0] * 2, footY + SS.nf[1] * 2, pants, 0);
  part(g, torsoPath, coat ? hc(spec.coatColor || '3a3a4a') : top, tBox, {
    tex: g2 => {
      if (!armorCol) clothTex(coat ? 'wool' : 'wool', tBox, 19)(g2);
      if (spec.armor === 'leather') { clothTex('leather', tBox, 23)(g2); SEAM(g2, [[cx - shW + 2, sy + 1], [cx - wW + 1, wy]]); SEAM(g2, [[cx + shW - 2, sy + 1], [cx + wW - 1, wy]]); }
      if (!side) { SEAM(g2, [[cx - shW + 1.5, sy + 0.2], [cx - shW + 0.5, sy + 4]]); SEAM(g2, [[cx + shW - 1.5, sy + 0.2], [cx + shW - 0.5, sy + 4]]); }
      if (spec.armor === 'mail') for (let y = sy; y < hipY; y += 1.2) for (let x = cx - shW; x < cx + shW; x += 1.2) dot(g2, x + ((y * 0.83) % 1.2), y, 0.32, 'rgba(40,46,56,0.35)');
      if (spec.armor === 'plate') { stroke(g2, [[cx, sy + 1], [cx, wy]], 'rgba(255,255,255,0.35)', 0.8); stroke(g2, [[cx - shW + 2, sy + 9], [cx + shW - 2, sy + 9]], 'rgba(0,0,0,0.25)', 0.6); }
      if (spec.armor === 'leather') for (const x of [cx - 4, cx + 4]) stroke(g2, [[x, sy + 2], [x, wy]], 'rgba(255,220,160,0.25)', 0.35);
      if (coat) { part(g2, poly([[cx - 2.5, sy - 1], [cx + 2.5, sy - 1], [cx + 1.5, wy + 2], [cx - 1.5, wy + 2]]), shirt, [cx - 3, sy, cx + 3, wy], { noShadow: 1 }); stroke(g2, [[cx - 2.6, sy], [cx - 1.6, wy + 3]], 'rgba(0,0,0,0.35)', 0.6); stroke(g2, [[cx + 2.6, sy], [cx + 1.6, wy + 3]], 'rgba(0,0,0,0.35)', 0.6); }
      // folds pulling toward the belt
      if (!armorCol) { stroke(g2, [[cx - shW + 3, sy + 4], [cx - 2, wy - 2]], 'rgba(0,0,0,0.12)', 0.6); stroke(g2, [[cx + shW - 3, sy + 4], [cx + 2, wy - 2]], 'rgba(0,0,0,0.16)', 0.6); }
      if (B.belly) { g2.beginPath(); ellipse(cx + (side ? 3 : 0), wy - 4, wW * 0.7, 5)(g2); g2.fillStyle = 'rgba(255,240,220,0.1)'; g2.fill(); }
    },
  });
  // tabard, vest, apron
  if (spec.tabard && !side && !back) part(g, poly([[cx - 4.5, sy + 1], [cx + 4.5, sy + 1], [cx + 4, kneeY - 6], [cx - 4, kneeY - 6]]), hc(spec.tabard), [cx - 5, sy, cx + 5, kneeY - 6], { tex: g2 => { stroke(g2, [[cx - 2, sy + 9], [cx + 2, sy + 9]], 'rgba(255,220,120,0.6)', 0.7); stroke(g2, [[cx, sy + 7], [cx, sy + 11]], 'rgba(255,220,120,0.6)', 0.7); } });
  if (spec.torso === 'vest' && !side) for (const s of [-1, 1]) part(g, poly([[cx + s * 1.2, sy], [cx + s * (shW - 1.5), sy - 0.5], [cx + s * (wW + 0.5), wy + 1], [cx + s * 1.5, wy + 2]]), hc(spec.vest || '6e4a2a'), [cx - shW, sy, cx + shW, wy + 2], { tex: clothTex('leather', [cx - shW, sy, cx + shW, wy + 2], 37) });
  if ((spec.torso === 'apron' || spec.apron) && !back) {
    const ac = hc(spec.apronColor || 'efe6d2');
    part(g, side ? poly([[cx + 3.6, sy + 6], [cx + 5.6, sy + 6], [cx + 6.8, kneeY + 1], [cx + 3.8, kneeY + 1]]) : poly([[cx - 4.6, sy + 4], [cx + 4.6, sy + 4], [cx + 5.6, wy], [cx + 7, kneeY + 1], [cx - 7, kneeY + 1], [cx - 5.6, wy]]), ac, [cx - 7, sy + 4, cx + 7, kneeY], {
      tex: g2 => { clothTex('linen', [cx - 8, sy + 4, cx + 8, kneeY + 1], 31)(g2); SEAM(g2, [[cx - 6.6, kneeY - 0.5], [cx + 6.6, kneeY - 0.5]]); for (const x of [-3, 0, 3]) stroke(g2, [[cx + x, wy + 2], [cx + x * 1.3, kneeY]], 'rgba(0,0,0,0.14)', 0.6); if (!side) { g2.fillStyle = 'rgba(0,0,0,0.12)'; g2.fillRect(cx - 3, wy + 4, 6, 4); } },
    });
    if (!side) { stroke(g, [[cx - 4.4, sy + 4], [cx - 3, sy - 1]], ac, 0.9); stroke(g, [[cx + 4.4, sy + 4], [cx + 3, sy - 1]], ac, 0.9); }
  }
  // the belt, with a buckle
  if (!robe || spec.belt) {
    part(g, side ? poly([[cx - 4.8, wy - 1], [cx + 4.8, wy - 1], [cx + 4.8, wy + 1.4], [cx - 4.8, wy + 1.4]]) : poly([[cx - wW - 0.4, wy - 1], [cx + wW + 0.4, wy - 1], [cx + wW + 0.6, wy + 1.4], [cx - wW - 0.6, wy + 1.4]]), hc(spec.belt || '4a2e18'), [cx - wW, wy - 1, cx + wW, wy + 2], { sa: 0.3 });
    if (!side && !back) { g.fillStyle = '#c8a03a'; g.fillRect(cx - 1.1, wy - 1, 2.2, 2.4); g.fillStyle = '#f3d36c'; g.fillRect(cx - 1.1, wy - 1, 2.2, 0.6); }
  }
  // ---- arms ----
  const handY = wy + 8;
  const rh = side ? [cx + SS.nh[0] * 2, handY + SS.nh[1] * 2] : [cx + shW + 1 + FS.rh[0] * 2, handY + FS.rh[1] * 2];
  const lh = [cx - shW - 1 + FS.lh[0] * 2, handY + FS.lh[1] * 2];
  if (!side) { arm(cx - shW + 1.2, sy + 1.5, lh[0], lh[1], sleeveCol); arm(cx + shW - 1.2, sy + 1.5, rh[0], rh[1], sleeveCol); }
  // ---- neck and head ----
  const neckTop = hy + 5, chinY = hy + 7.4;
  part(g, capsule(cx + (side ? 0.6 : 0), neckTop - 2, cx + (side ? 0.2 : 0), sy + 0.6, 4.6, 5), skinD, [cx - 3, neckTop, cx + 3, sy + 1], { hi: 0.15, lo: 0.4 });
  if (spec.necklace && !back) { stroke(g, [[cx - 3.5, sy - 0.2], [cx, sy + 3.5, cx + 3.5, sy - 0.2]], '#c8a03a', 0.5); dot(g, cx, sy + 3.4, 0.7, '#e3b93c'); }
  // the head is drawn a little larger than life, the way storybook art does it, so faces read at a glance
  const HK = spec.build === 'child' ? 1.7 : 1.5, neckY = 94 - (94 - (hy + 7)) * BODY;
  g.restore();
  g.save(); g.translate(cx, neckY); g.scale(HK, HK); g.translate(-cx, -(hy + 7));
  const jawW = spec.jaw === 'soft' ? 3.6 : spec.heavyBrow ? 5 : 4.5;
  const headPath = side
    ? poly([[cx - 5.6, hy - 1], [cx - 5.4, hy - 7.5, cx + 0.5, hy - 7.6], [cx + 5.6, hy - 7, cx + 6, hy - 1.5], [cx + 6, hy + 1.4], [cx + 7.2, hy + 3.4], [cx + 6, hy + 4.1], [cx + 5.8, hy + 6], [cx + 4.4, chinY], [cx + 1, chinY + 0.2, cx - 1.2, hy + 5.4], [cx - 5.8, hy + 4, cx - 5.6, hy - 1]])
    : poly([[cx, hy - 7.6], [cx + 6, hy - 7.4, cx + 6, hy - 0.5], [cx + 5.9, hy + 2.6, cx + jawW, hy + 5.4], [cx + 2.6, chinY + 0.2, cx, chinY + 0.3], [cx - 2.6, chinY + 0.2, cx - jawW, hy + 5.4], [cx - 5.9, hy + 2.6, cx - 6, hy - 0.5], [cx - 6, hy - 7.4, cx, hy - 7.6]]);
  part(g, headPath, skin, [cx - 6, hy - 8, cx + 6, chinY], {
    hi: 0.3, lo: 0.36,
    tex: g2 => {
      if (back) return;
      // warmth in the cheeks, the nose and ears; shade in the sockets and under the cheekbones
      const warm = (x, y, r, a) => { const rg = g2.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(205,95,80,${a})`); rg.addColorStop(1, 'rgba(205,95,80,0)'); g2.fillStyle = rg; g2.fillRect(x - r, y - r, r * 2, r * 2); };
      const shade = (x, y, rx, ry, a) => { g2.beginPath(); ellipse(x, y, rx, ry)(g2); g2.fillStyle = `rgba(70,30,30,${a})`; g2.fill(); };
      if (side) { warm(cx + 3.5, hy + 2.6, 2.4, spec.blush ? 0.3 : 0.12); shade(cx + 3.6, hy + 0.2, 1.4, 0.8, 0.18); return; }
      warm(cx - 3.2, hy + 2.6, 2.4, spec.blush ? 0.3 : 0.13); warm(cx + 3.2, hy + 2.6, 2.4, spec.blush ? 0.28 : 0.1); warm(cx, hy + 2.6, 1.6, 0.1);
      shade(cx - 2.4, hy - 0.2, 1.9, 1.05, 0.16); shade(cx + 2.4, hy - 0.2, 1.9, 1.05, 0.2);
      if (spec.jaw !== 'soft') { shade(cx + 3.6, hy + 3.8, 1.2, 1.8, 0.14); shade(cx - 3.6, hy + 3.8, 1.2, 1.8, 0.08); }
      if (spec.stubble || spec.beard === 'moustache') { const r2 = srand(9); for (let i = 0; i < 220; i++) { const a = r2() * Math.PI, rr = 2.4 + r2() * 3.2, x = cx + Math.cos(a) * rr * 1.05, y = hy + 3.2 + Math.sin(a) * rr * 0.75; if (y > hy + 2.2) dot(g2, x, y, 0.18, hmix(hair, skin.slice(1), 0.35).replace('rgb', 'rgba').replace(')', ',0.55)')); } }
      if (spec.wrinkles) { stroke(g2, [[cx - 3.6, hy + 1.2], [cx - 2.4, hy + 1.6]], 'rgba(90,40,30,0.3)', 0.3); stroke(g2, [[cx + 3.6, hy + 1.2], [cx + 2.4, hy + 1.6]], 'rgba(90,40,30,0.3)', 0.3); stroke(g2, [[cx - 1.7, hy + 2.6], [cx - 2.4, hy + 4.6]], 'rgba(90,40,30,0.25)', 0.35); stroke(g2, [[cx + 1.7, hy + 2.6], [cx + 2.4, hy + 4.6]], 'rgba(90,40,30,0.3)', 0.35); stroke(g2, [[cx - 2.5, hy - 4.5], [cx + 2.5, hy - 4.5]], 'rgba(90,40,30,0.18)', 0.3); }
    },
  });
  // ears
  if (!back) {
    if (side) part(g, ellipse(cx - 1.2, hy + 0.8, 1.2, 2), skin, [cx - 2.5, hy - 1, cx, hy + 3], { sa: 0.25 });
    else for (const s of [-1, 1]) part(g, ellipse(cx + s * 6, hy + 0.6, 1, 1.9), hsh(skin.slice(1), 0.96), [cx + s * 6 - 1, hy - 1.5, cx + s * 6 + 1, hy + 2.6], { sa: 0.2 });
  }
  // ---- the face ----
  const iris = hc(spec.eyes || '4a3a2a'), lid = hsh(skin.slice(1), 0.48), brow = hc(spec.browColor || shadeHex((spec.hairColor || '5a3a1e'), 0.75));
  const lips = spec.lips ? hc(spec.lips) : hmix(hsh(skin.slice(1), 0.82), '#c46a62', spec.jaw === 'soft' ? 0.45 : 0.22);
  const eye = (x, y, dir) => {
    // the white, an almond; the iris and pupil with a catchlight; the upper lid's line and crease, a faint lower lid
    g.save(); g.beginPath(); g.moveTo(x - 2.05, y); g.quadraticCurveTo(x - 0.2, y - 1.75, x + 2.05, y - 0.1); g.quadraticCurveTo(x, y + 1.35, x - 2.05, y); g.closePath();
    g.fillStyle = '#f4f0e8'; g.fill(); g.clip();
    const ix = x + dir * 0.15, iy = y + 0.1, ir = g.createLinearGradient(ix, iy - 1.3, ix, iy + 1.3);
    ir.addColorStop(0, hsh(iris.slice(1), 0.55)); ir.addColorStop(0.55, iris); ir.addColorStop(1, hmix(iris.slice(1), 'ffffff', 0.35));
    g.beginPath(); g.arc(ix, iy, 1.3, 0, Math.PI * 2); g.fillStyle = ir; g.fill();
    dot(g, ix, iy, 0.62, '#120a0e'); dot(g, ix - 0.45, iy - 0.5, 0.36, 'rgba(255,255,255,0.97)'); dot(g, ix + 0.45, iy + 0.45, 0.17, 'rgba(255,255,255,0.7)');
    g.fillStyle = 'rgba(70,30,30,0.16)'; g.fillRect(x - 2.1, y - 1.8, 4.2, 0.5);
    g.fillStyle = 'rgba(60,30,30,0.25)'; g.fillRect(x - 1.5, y - 1.1, 3, 0.55);
    g.restore();
    stroke(g, [[x - 2.15, y + 0.15], [x - 0.2, y - 1.85, x + 2.15, y - 0.15]], hsh(lid.slice(1), 0.6), 0.75);
    stroke(g, [[x - 1.6, y - 1.55], [x, y - 2.45, x + 1.6, y - 1.55]], 'rgba(90,40,30,0.25)', 0.35);
    stroke(g, [[x - 1.5, y + 0.85], [x, y + 1.35, x + 1.5, y + 0.85]], 'rgba(90,40,30,0.2)', 0.3);
    if (spec.lashes) stroke(g, [[x - 1.7, y - 0.2], [x - 2.1, y - 0.6]], lid, 0.3);
  };
  // where a point on the head ends up in the final 64×96 image (head enlarged, then the build's scale and the step's lift)
  const toFinal = (x, y) => { const xh = cx + (x - cx) * HK, yh = neckY + (y - hy - 7) * HK; return [32 + (xh - 32) * B.k, 94 + (yh - lift - 94) * B.k]; };
  if (!back && !side) {
    const ey = hy + 0.5;
    // the eyes themselves are placed pixel by pixel after the reduction (see finishHD); here only their sockets
    for (const s2 of [-1, 1]) { g.beginPath(); ellipse(cx + s2 * 2.75, ey - 0.2, 2.3, 1.4)(g); g.fillStyle = 'rgba(80,35,30,0.14)'; g.fill(); }
    eyesAt = { view: 'front', pts: [toFinal(cx - 2.75, ey), toFinal(cx + 2.75, ey)], k: B.k * HK };
    const bw = spec.heavyBrow ? 1.15 : 0.85, by = ey - (spec.heavyBrow ? 2.5 : 2.8);
    stroke(g, [[cx - 4.6, by + 0.5], [cx - 2.9, by - 0.6, cx - 1.1, by - 0.1]], brow, bw); stroke(g, [[cx + 4.6, by + 0.5], [cx + 2.9, by - 0.6, cx + 1.1, by - 0.1]], brow, bw);
    // the nose: a lit bridge, the shaded far side, a rounded tip, the wings and nostrils, its shadow on the lip
    // a small cartoon nose: a shaded side and a dot of light; a simple mouth with a touch of lip
    g.beginPath(); g.moveTo(cx + 0.2, ey + 0.6); g.quadraticCurveTo(cx + 1.4, hy + 3.2, cx + 0.2, hy + 3.6); g.lineTo(cx - 0.6, hy + 3.4); g.closePath(); g.fillStyle = cdark(skin, 0.8); g.fill();
    dot(g, cx - 0.5, hy + 2.9, 0.45, hmix(skin.slice(1), 'ffffff', 0.35));
    const my = hy + 5;
    stroke(g, [[cx - 1.5, my], [cx, my + 0.6, cx + 1.5, my - 0.1]], 'rgba(70,25,25,0.85)', 0.55);
    g.beginPath(); ellipse(cx + 0.1, my + 0.95, 0.9, 0.4)(g); g.fillStyle = lips; g.fill();
  } else if (side) {
    // in profile: one eye toward the front, the brow above it, the nostril, the line of the mouth
    const ex = cx + 3.8, ey = hy + 0.3;
    eyesAt = { view: 'side', pts: [toFinal(ex + 0.2, ey)], k: B.k * HK };
    g.save(); g.beginPath(); g.moveTo(ex - 0.9, ey); g.quadraticCurveTo(ex + 0.2, ey - 0.95, ex + 1.1, ey - 0.1); g.quadraticCurveTo(ex + 0.2, ey + 0.7, ex - 0.9, ey); g.fillStyle = '#efe9df'; g.fill(); g.clip(); dot(g, ex + 0.45, ey, 0.62, iris); dot(g, ex + 0.5, ey, 0.32, '#140c10'); g.restore();
    stroke(g, [[ex - 1, ey], [ex + 0.2, ey - 1.05, ex + 1.15, ey - 0.15]], lid, 0.4);
    stroke(g, [[ex - 1.3, ey - 1.9], [ex + 1.4, ey - 1.6]], brow, spec.heavyBrow ? 0.8 : 0.55);
    dot(g, cx + 6.1, hy + 3.7, 0.3, 'rgba(60,20,20,0.6)');
    stroke(g, [[cx + 4.6, hy + 5.1], [cx + 5.9, hy + 5]], 'rgba(60,20,20,0.7)', 0.35);
    dot(g, cx + 5.6, hy + 5.6, 0.45, lips);
  }
  // ---- beard ----
  if (spec.beard && !back) {
    const bc = hc(spec.beardColor || spec.hairColor || '5a3a1e');
    const fur = g2 => { const r2 = srand(41); for (let i = 0; i < 90; i++) { const x = cx - 6 + r2() * 12, y = hy + 1 + r2() * 10; stroke(g2, [[x, y], [x + (r2() - 0.5) * 0.6, y + 1.2]], r2() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,240,220,0.12)', 0.25); } };
    if (spec.beard === 'moustache') part(g, side ? poly([[cx + 4.4, hy + 4.4], [cx + 6, hy + 4.2], [cx + 5.6, hy + 5.1], [cx + 4.4, hy + 5.2]]) : poly([[cx - 2.4, hy + 4.4], [cx, hy + 4.0], [cx + 2.4, hy + 4.4], [cx + 2.8, hy + 5.6], [cx + 1.6, hy + 4.9], [cx, hy + 4.7], [cx - 1.6, hy + 4.9], [cx - 2.8, hy + 5.6]]), bc, [cx - 3, hy + 4, cx + 3, hy + 6], { sa: 0.25 });
    else {
      const long = spec.beard === 'long' ? 6 : 1.6;
      part(g, side ? poly([[cx - 1, hy + 1.5], [cx + 2, hy + 2.5], [cx + 4.4, hy + 4.4], [cx + 6, hy + 4.2], [cx + 5.4, chinY + long], [cx + 2, chinY + long - 0.5], [cx - 1.4, hy + 4.5]])
        : poly([[cx - 5.6, hy + 0.6], [cx - 5.2, hy + 4.4, cx - 2.6, hy + 4.4], [cx, hy + 4.0], [cx + 2.6, hy + 4.4], [cx + 5.2, hy + 4.4, cx + 5.6, hy + 0.6], [cx + 5.4, chinY + long * 0.6, cx, chinY + long], [cx - 5.4, chinY + long * 0.6, cx - 5.6, hy + 0.6]]), bc, [cx - 6, hy, cx + 6, chinY + long], { sa: 0.3, tex: fur });
      if (!side) { g.beginPath(); g.moveTo(cx - 1.6, hy + 5.3); g.quadraticCurveTo(cx, hy + 6.4, cx + 1.6, hy + 5.3); g.quadraticCurveTo(cx, hy + 5.9, cx - 1.6, hy + 5.3); g.fillStyle = lips; g.fill(); }
    }
  }
  // ---- hair ----
  if (spec.hair && spec.hair !== 'bald') {
    const strands = (g2, x0, x1, y0, y1, n) => { const r2 = srand(77); for (let i = 0; i < n; i++) { const x = x0 + r2() * (x1 - x0); stroke(g2, [[x, y0 + r2() * 2], [x + (x - cx) * 0.15, y1 - r2() * 2]], r2() < 0.55 ? 'rgba(0,0,0,0.12)' : 'rgba(255,240,220,0.09)', 0.28); } };
    const hb = [cx - 7, hy - 9, cx + 7, hy + 6];
    if (back) part(g, poly([[cx - 6.4, hy + 3], [cx - 6.8, hy - 8, cx, hy - 8.4], [cx + 6.8, hy - 8, cx + 6.4, hy + 3], [cx + 4, hy + (spec.hair === 'long' ? 14 : 6.5)], [cx - 4, hy + (spec.hair === 'long' ? 14 : 6.5)]]), hair, hb, { tex: g2 => strands(g2, cx - 6, cx + 6, hy - 8, hy + 8, 60) });
    else if (side) part(g, poly([[cx + 5.4, hy - 3.4], [cx + 4, hy - 8.4, cx - 1, hy - 8.2], [cx - 7, hy - 7, cx - 6.4, hy + 2], [cx - 5.4, hy + (spec.hair === 'long' ? 12 : 5)], [cx - 2.8, hy + (spec.hair === 'long' ? 12 : 4)], [cx - 2.4, hy - 1], [cx + 1, hy - 4.6], [cx + 4, hy - 3.4]]), hair, hb, { tex: g2 => strands(g2, cx - 6, cx + 5, hy - 8, hy + 6, 50) });
    else if (spec.hair === 'balding') for (const s of [-1, 1]) part(g, poly([[cx + s * 6.2, hy - 3], [cx + s * 4.6, hy - 3.6], [cx + s * 4.8, hy + 1], [cx + s * 6.3, hy + 1.4]]), hair, hb, { sa: 0.2 });
    else if (spec.hair === 'mohawk') part(g, poly([[cx - 1.6, hy - 2], [cx - 2, hy - 10], [cx + 2, hy - 10], [cx + 1.6, hy - 2]]), hair, hb);
    else {
      const fringe = { crop: -4.4, short: -4, curly: -3.8, long: -3.6, braid: -3.6, bun: -4.6, ponytail: -4.2 }[spec.hair] ?? -4;
      const sideLen = { long: 13, braid: 5, curly: 4, short: 2, crop: 1.2, bun: 1.5, ponytail: 2 }[spec.hair] ?? 2;
      part(g, poly([[cx - 6.6, hy + sideLen], [cx - 7.2, hy - 8.4, cx, hy - 8.8], [cx + 7.2, hy - 8.4, cx + 6.6, hy + sideLen], [cx + 5.2, hy + sideLen], [cx + 5.4, hy + fringe + 1.5], [cx + 3, hy + fringe + 0.6, cx + 1.2, hy + fringe + 1.3], [cx - 0.8, hy + fringe - 0.3], [cx - 3, hy + fringe + 1.6, cx - 5.4, hy + fringe + 1.2], [cx - 5.2, hy + sideLen]]), hair, hb, {
        tex: g2 => { strands(g2, cx - 7, cx + 7, hy - 9, hy + sideLen, 70); if (spec.hair === 'curly') { const r2 = srand(5); for (let i = 0; i < 40; i++) { g2.beginPath(); g2.arc(cx - 7 + r2() * 14, hy - 8 + r2() * (sideLen + 8), 0.8, 0, Math.PI * 2); g2.strokeStyle = 'rgba(0,0,0,0.25)'; g2.lineWidth = 0.3; g2.stroke(); } } },
      });
      if (spec.hair === 'bun') part(g, ellipse(cx, hy - 9.5, 2.6, 2.2), hair, [cx - 3, hy - 12, cx + 3, hy - 7]);
      if (spec.hair === 'ponytail') part(g, capsule(cx + 6, hy - 2, cx + 7.4, hy + 10, 2.8, 1.8), hair, [cx + 5, hy - 3, cx + 9, hy + 11]);
    }
  }
  // ---- hats ----
  if (spec.hat) {
    const ht = hc(spec.hatColor || '3b6fc4'), hb = [cx - 9, hy - 16, cx + 9, hy - 2];
    if (spec.hat === 'wizard') { part(g, poly([[cx - 8, hy - 5], [cx + 8, hy - 5], [cx + 6, hy - 6.5], [cx + 1, hy - 19], [cx - 6, hy - 6.5]]), ht, hb); part(g, ellipse(cx, hy - 5.5, 9, 1.6), hsh(ht.slice(1), 0.9), hb); }
    else if (spec.hat === 'straw') { part(g, ellipse(cx, hy - 5, 10, 2.2), ht, hb, { tex: g2 => { for (let a = 0; a < 20; a++) stroke(g2, [[cx, hy - 5], [cx + Math.cos(a) * 10, hy - 5 + Math.sin(a) * 2.2]], 'rgba(0,0,0,0.12)', 0.3); } }); part(g, poly([[cx - 5, hy - 5.5], [cx - 4.4, hy - 10, cx, hy - 10.2], [cx + 4.4, hy - 10, cx + 5, hy - 5.5]]), ht, hb); stroke(g, [[cx - 5, hy - 6.6], [cx + 5, hy - 6.6]], '#7d2027', 0.9); }
    else if (spec.hat === 'helm') { part(g, poly([[cx - 6.8, hy - 1], [cx - 7, hy - 9.5, cx, hy - 10], [cx + 7, hy - 9.5, cx + 6.8, hy - 1], [cx + 6.8, hy - 2.4], [cx - 6.8, hy - 2.4]]), ht, hb, { hi: 0.5 }); stroke(g, [[cx - 6.8, hy - 2.4], [cx + 6.8, hy - 2.4]], hsh(ht.slice(1), 0.7), 0.9); if (!side && !back) stroke(g, [[cx, hy - 2.4], [cx, hy + 2]], hsh(ht.slice(1), 0.85), 1.2); }
    else if (spec.hat === 'cap') part(g, poly([[cx - 6.4, hy - 3.6], [cx - 6, hy - 9, cx, hy - 9.2], [cx + 6, hy - 9, cx + 6.4, hy - 3.6], [cx + (side ? 9 : 6.6), hy - 3.2]]), ht, hb);
    else if (spec.hat === 'kerchief') part(g, poly([[cx - 6.6, hy - 2], [cx - 7, hy - 9, cx, hy - 9.2], [cx + 7, hy - 9, cx + 6.6, hy - 2], [cx + 5.6, hy - 4.6], [cx - 5.6, hy - 4.6]]), ht, hb, { tex: g2 => { for (let i = 0; i < 18; i++) dot(g2, cx - 6 + (i * 3.7) % 12, hy - 8 + (i * 2.3) % 4, 0.35, 'rgba(255,255,255,0.35)'); } });
    else if (spec.hat === 'hood') part(g, poly([[cx - 7.6, hy + 7], [cx - 8, hy - 9.5, cx, hy - 10], [cx + 8, hy - 9.5, cx + 7.6, hy + 7], [cx + 5.6, hy + 4], [cx + 5.8, hy - 4.8, cx, hy - 6], [cx - 5.8, hy - 4.8, cx - 5.6, hy + 4]]), ht, hb);
    else if (spec.hat === 'crown') { part(g, poly([[cx - 5.6, hy - 5], [cx - 5.6, hy - 9], [cx - 3, hy - 7.4], [cx, hy - 10], [cx + 3, hy - 7.4], [cx + 5.6, hy - 9], [cx + 5.6, hy - 5]]), '#e3b93c', hb, { hi: 0.6 }); dot(g, cx, hy - 6.5, 0.7, '#b9343c'); }
  }
  g.restore();
  squash();
  // ---- things in the hand ----
  const held = (item, x, y, dir) => {
    const at = (t, ang) => [x + Math.sin(ang) * t * dir, y - Math.cos(ang) * t];
    const shaft = (t0, t1, ang, w, col) => { const [a1, b1] = at(t0, ang), [a2, b2] = at(t1, ang); part(g, capsule(a1, b1, a2, b2, w, w), col, [Math.min(a1, a2) - 1, Math.min(b1, b2) - 1, Math.max(a1, a2) + 1, Math.max(b1, b2) + 1], { sa: 0.35, hi: 0.45 }); };
    const WOOD = '#6b4423', STEEL = '#c9d1d8';
    let fist = true;
    if (item === 'spear' || item === 'staff') { shaft(-12, 44, 0.08, 1.4, WOOD); const [tx, ty] = at(46, 0.08); if (item === 'spear') part(g, poly([[tx, ty - 6], [tx + 1.6, ty], [tx, ty + 1.4], [tx - 1.6, ty]]), STEEL, [tx - 2, ty - 6, tx + 2, ty + 2], { hi: 0.6 }); else part(g, ellipse(tx, ty - 1, 2.4, 2.4), hc(spec.staffGem || '9cc0f5'), [tx - 3, ty - 4, tx + 3, ty + 2], { hi: 0.7 }); }
    else if (item === 'mace') { shaft(-6, 16, 0.5, 1.5, WOOD); const [mx, my] = at(19, 0.5); part(g, ellipse(mx, my, 3, 3), '#8a949e', [mx - 3, my - 3, mx + 3, my + 3], { hi: 0.6, tex: g2 => { for (let a = 0; a < 6; a++) stroke(g2, [[mx, my], [mx + Math.cos(a) * 3, my + Math.sin(a) * 3]], 'rgba(0,0,0,0.3)', 0.4); } }); }
    else if (item === 'sword') { shaft(-4, 1, 0.45, 1.3, '#4a2e18'); const [gx, gy] = at(1.5, 0.45); stroke(g, [[gx - 3 * Math.cos(0.45), gy - 3 * Math.sin(0.45) * dir], [gx + 3 * Math.cos(0.45), gy + 3 * Math.sin(0.45) * dir]], '#c8a03a', 1); const [b1x, b1y] = at(2.5, 0.45), [b2x, b2y] = at(25, 0.45); part(g, capsule(b1x, b1y, b2x, b2y, 1.8, 0.6), STEEL, [Math.min(b1x, b2x) - 1, b2y - 1, Math.max(b1x, b2x) + 1, b1y + 1], { hi: 0.7, sa: 0.3 }); }
    else if (item === 'axe') { shaft(-6, 20, 0.5, 1.5, WOOD); const [ax, ay] = at(17, 0.5); part(g, poly([[ax, ay - 2], [ax + dir * 5, ay - 4], [ax + dir * 5.6, ay + 1.5], [ax, ay + 1.5]]), '#b8c0c8', [ax - 6, ay - 5, ax + 6, ay + 2], { hi: 0.6 }); }
    else if (item === 'dagger') { shaft(-3, 1, 0.6, 1.2, '#4a2e18'); const [d1x, d1y] = at(1.5, 0.6), [d2x, d2y] = at(10, 0.6); part(g, capsule(d1x, d1y, d2x, d2y, 1.4, 0.4), STEEL, [Math.min(d1x, d2x) - 1, d2y - 1, Math.max(d1x, d2x) + 1, d1y + 1], { hi: 0.7 }); }
    else if (item === 'hammer') { part(g, capsule(x, y - 4, x + dir * 1.5, y + 15, 1.5, 1.5), WOOD, [x - 2, y - 4, x + 3, y + 15]); part(g, poly([[x + dir * 1.5 - 4, y + 14], [x + dir * 1.5 + 4, y + 14], [x + dir * 1.5 + 4, y + 18.5], [x + dir * 1.5 - 4, y + 18.5]]), '#6a7078', [x - 5, y + 14, x + 5, y + 19], { hi: 0.5 }); }
    else if (item === 'torch') { shaft(-5, 13, 0.4, 1.6, WOOD); const [wx, wy] = at(13.5, 0.4); part(g, ellipse(wx, wy, 1.6, 1.2), '#b89a6a', [wx - 2, wy - 2, wx + 2, wy + 2]); const [fx, fy] = at(17.5, 0.4); const rg = g.createRadialGradient(fx, fy + 1, 0, fx, fy, 4); rg.addColorStop(0, '#fff6c8'); rg.addColorStop(0.35, '#ffc14a'); rg.addColorStop(0.7, '#e8622a'); rg.addColorStop(1, 'rgba(232,98,42,0)'); g.fillStyle = rg; g.beginPath(); g.moveTo(fx - 2.6, fy + 1.5); g.quadraticCurveTo(fx - 2.4, fy - 2.5, fx + dir * 0.6, fy - 5.5); g.quadraticCurveTo(fx + 2.6, fy - 2, fx + 2.6, fy + 1.5); g.closePath(); g.fill(); }
    else if (item === 'lantern') { stroke(g, [[x, y + 1], [x, y + 3.5]], '#3a3a40', 0.6); part(g, poly([[x - 2.4, y + 3.5], [x + 2.4, y + 3.5], [x + 2.4, y + 10], [x - 2.4, y + 10]]), '#4a4f58', [x - 3, y + 3, x + 3, y + 10]); g.fillStyle = '#ffd27a'; g.fillRect(x - 1.6, y + 4.6, 3.2, 4.4); g.fillStyle = '#fff6c8'; g.fillRect(x - 0.6, y + 5.6, 1.2, 2.2); }
    else if (item === 'basket') { part(g, poly([[x - 4, y + 1.5], [x + 4, y + 1.5], [x + 3.4, y + 7], [x - 3.4, y + 7]]), '#b8923f', [x - 4, y + 1, x + 4, y + 7], { tex: g2 => { for (let i = 0; i < 6; i++) stroke(g2, [[x - 4, y + 2 + i], [x + 4, y + 2 + i]], 'rgba(0,0,0,0.18)', 0.3); } }); stroke(g, [[x - 3.4, y + 1.5], [x, y - 2.5, x + 3.4, y + 1.5]], '#8a6a2a', 0.7); fist = false; }
    else if (item === 'book') { part(g, poly([[x - 2.6, y - 3], [x + 2.6, y - 3], [x + 2.6, y + 4], [x - 2.6, y + 4]]), hc(spec.bookColor || '7b4bb5'), [x - 3, y - 3, x + 3, y + 4]); g.fillStyle = '#e8e1c8'; g.fillRect(x - 2.6, y - 3, 0.7, 7); fist = false; }
    else if (item === 'shield') { part(g, poly([[x - 4.6, y - 8], [x + 4.6, y - 8], [x + 4.6, y - 2], [x, y + 4], [x - 4.6, y - 2]]), hc(spec.shieldColor || '9aa5b0'), [x - 5, y - 8, x + 5, y + 4], { hi: 0.5, tex: g2 => { stroke(g2, [[x, y - 8], [x, y + 4]], 'rgba(227,185,60,0.8)', 0.8); stroke(g2, [[x - 4.6, y - 4], [x + 4.6, y - 4]], 'rgba(227,185,60,0.8)', 0.8); } }); fist = false; }
    else if (item === 'rod') shaft(-3, 34, 0.35, 0.9, WOOD);
    else if (item === 'bomb') { part(g, ellipse(x, y + 2, 3, 3), '#2a2a32', [x - 3, y - 1, x + 3, y + 5], { hi: 0.5 }); stroke(g, [[x + 1.5, y - 0.5], [x + 2.5, y - 2.5]], '#b8923f', 0.6); dot(g, x + 2.6, y - 2.8, 0.6, '#ffd27a'); fist = false; }
    else if (item === 'tube') shaft(-2, 14, 1, 1.4, '#8a7a4a');
    else if (item === 'bow') { stroke(g, [[x + dir * 2, y - 14], [x + dir * 6, y], [x + dir * 2, y + 14]], WOOD, 1.1); stroke(g, [[x + dir * 2, y - 14], [x + dir * 2, y + 14]], '#e8e1c8', 0.3); }
    if (fist) { part(g, ellipse(x, y, 1.9, 2.1), skin, [x - 2, y - 2, x + 2, y + 2], { hi: 0.35, lo: 0.35, sa: 0.3 }); stroke(g, [[x - dir * 1.2, y - 0.8], [x - dir * 1.2, y + 1]], 'rgba(90,40,30,0.35)', 0.35); }
  };
  if (!back) {
    if (side) { arm(cx + 0.5, sy + 2, rh[0], rh[1], sleeveCol, 0, !!spec.held); if (spec.held) held(spec.held, rh[0], rh[1], 1); }
    else { if (spec.held) held(spec.held, rh[0], rh[1], 1); if (spec.offhand) held(spec.offhand, lh[0], lh[1], -1); }
  }
  g.restore(); g.restore();
  return finishHD(c, eyesAt && Object.assign(eyesAt, { iris: hc(spec.eyes || '4a3a2a'), skin, lashes: spec.lashes }));
}
// reduce to 64×96 in two smooth halvings, harden the silhouette, then a selective outline like the world's art
function finishHD(big, eyes) {
  const half = document.createElement('canvas'); half.width = HDW * 2; half.height = HDH * 2;
  const hg = half.getContext('2d'); hg.imageSmoothingEnabled = true; hg.imageSmoothingQuality = 'high'; hg.drawImage(big, 0, 0, half.width, half.height);
  const out = document.createElement('canvas'); out.width = HDW; out.height = HDH;
  const og = out.getContext('2d'); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high'; og.drawImage(half, 0, 0, HDW, HDH);
  const img = og.getImageData(0, 0, HDW, HDH), d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 110) d[i + 3] = 0; else { const a = d[i + 3] / 255; d[i] = d[i] / a; d[i + 1] = d[i + 1] / a; d[i + 2] = d[i + 2] / a; d[i + 3] = 255; } }
  bandHD(d);
  const src = new Uint8ClampedArray(d), A = (x, y) => x >= 0 && y >= 0 && x < HDW && y < HDH && src[(y * HDW + x) * 4 + 3] > 0;
  for (let y = 0; y < HDH; y++) for (let x = 0; x < HDW; x++) {
    if (A(x, y)) continue;
    let n = -1; for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (A(x + dx, y + dy)) { n = ((y + dy) * HDW + x + dx) * 4; break; }
    if (n < 0) continue;
    const lit = A(x + 1, y) || A(x, y + 1), k = lit ? 0.3 : 0.18, i = (y * HDW + x) * 4;
    d[i] = 27 + (src[n] - 27) * k; d[i + 1] = 20 + (src[n + 1] - 20) * k; d[i + 2] = 36 + (src[n + 2] - 36) * k; d[i + 3] = 255;
  }
  if (eyes) pixelEyes(d, eyes);
  og.putImageData(img, 0, 0);
  out.hd = 1;
  return out;
}
// eyes, set pixel by pixel: whites either side of the iris, a dark pupil with a catchlight, a dark lash line above
function pixelEyes(d, E) {
  const put = (x, y, rgb) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= HDW || y >= HDH) return; const i = (y * HDW + x) * 4; if (!d[i + 3]) return; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; };
  const H = h => hexRgb(h.slice(1)), mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const skin = H(E.skin), iris = H(E.iris), white = [244, 240, 232], whiteS = mix(white, skin, 0.35), pupil = [22, 14, 18], lash = mix([40, 22, 22], skin, 0.12), lid = mix(skin, [90, 45, 40], 0.35);
  const irisD = mix(iris, pupil, 0.35), irisL = mix(iris, [255, 255, 255], 0.25);
  const small = E.k < 0.9;
  if (E.view === 'front') {
    E.pts.forEach(([fx, fy], n) => {
      const right = n === 1, x0 = Math.round(fx - 1.5), y0 = Math.round(fy - 1);
      // mirror the right eye exactly about the figure's middle
      const X = c => right ? 63 - (Math.round(E.pts[0][0] - 1.5) + c) : x0 + c;
      const w = small ? 3 : 4;
      for (let c = -1; c <= w; c++) put(X(c), y0 - 1, lash); for (let c = 0; c < w; c++) put(X(c), y0 - 2, mix(lash, skin, 0.45)); // a heavy lash line
      if (E.lashes) put(X(-1), y0, lash);
      if (small) { put(X(0), y0, white); put(X(1), y0, irisD); put(X(2), y0, white); put(X(0), y0 + 1, whiteS); put(X(1), y0 + 1, iris); put(X(2), y0 + 1, whiteS); return; }
      // a big cartoon eye, four by three: whites either side, a dark-topped iris, the pupil, a bright catchlight
      put(X(0), y0, white); put(X(1), y0, irisD); put(X(2), y0, irisD); put(X(3), y0, white);
      put(X(0), y0 + 1, white); put(X(1), y0 + 1, [255, 255, 255]); put(X(2), y0 + 1, pupil); put(X(3), y0 + 1, white);
      put(X(0), y0 + 2, whiteS); put(X(1), y0 + 2, irisL); put(X(2), y0 + 2, iris); put(X(3), y0 + 2, whiteS);
      put(X(-1), y0 - 1, lash); put(X(4), y0, lash);
    });
  } else {
    const [fx, fy] = E.pts[0], x0 = Math.round(fx - 1), y0 = Math.round(fy - 0.5);
    for (let c = -1; c <= 2; c++) put(x0 + c, y0 - 1, lash);
    put(x0, y0, irisD); put(x0 + 1, y0, white); put(x0, y0 + 1, iris); put(x0 + 1, y0 + 1, whiteS);
  }
}
// band the shading: each color keeps its hue, but its brightness falls into crisp steps like hand-pixelled art
function bandHD(d) {
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const L = Math.max(1, (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11)), step = 15, q = Math.max(step * 0.6, Math.round(L / step) * step), k = q / L;
    d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
  }
}
// reduce a figure to a small palette, the way hand-pixelled art is made: shading falls into crisp steps
function quantizeHD(d, K) {
  const px = []; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) px.push(i);
  if (px.length < K) return;
  // start from colors spread across the figure, sorted by brightness
  const sorted = px.slice().sort((a, b) => (d[a] + d[a + 1] + d[a + 2]) - (d[b] + d[b + 1] + d[b + 2]));
  let C = Array.from({ length: K }, (_, k) => { const i = sorted[Math.floor((k + 0.5) / K * sorted.length)]; return [d[i], d[i + 1], d[i + 2]]; });
  const lab = new Int16Array(px.length);
  for (let it = 0; it < 7; it++) {
    const sum = C.map(() => [0, 0, 0, 0]);
    for (let n = 0; n < px.length; n++) {
      const i = px[n]; let best = 0, bd = 1e9;
      for (let k = 0; k < K; k++) { const dr = d[i] - C[k][0], dg = d[i + 1] - C[k][1], db = d[i + 2] - C[k][2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; best = k; } }
      lab[n] = best; const s = sum[best]; s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; s[3]++;
    }
    C = C.map((c, k) => sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c);
  }
  for (let n = 0; n < px.length; n++) { const i = px[n], c = C[lab[n]]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
}
let HD_ON = false;
try { HD_ON = localStorage.getItem('tw-hd') === 'on'; } catch (e) { HD_ON = false; }
