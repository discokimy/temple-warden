// The Temple Warden — people, drawn from parts at 32×48 (twice the sprite grid) so they can move:
// facing down, up, left and right, a four-step walk with arms swinging against the legs, and breathing at rest.
// Each body part is drawn to its own layer, outlined in a dark tint of its own color and shaded from the
// upper left, then stacked back to front. A person is a spec: build, skin, hair, face, clothes, hat, held item.
'use strict';

const FW = 32, FH = 48;
const OUTLINE = [0x1b, 0x14, 0x24];
const hexRgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// a layer is a 32×48 RGBA buffer
const newLayer = () => ({ d: new Uint8ClampedArray(FW * FH * 4), edge: new Uint8Array(FW * FH), cloth: new Uint8Array(FW * FH) });
function setPx(L, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= FW || y >= FH) return;
  const i = (y * FW + x) * 4, rgb = typeof c === 'string' ? hexRgb(c) : c;
  L.d[i] = rgb[0]; L.d[i + 1] = rgb[1]; L.d[i + 2] = rgb[2]; L.d[i + 3] = 255;
}
function clearPx(L, x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= FW || y >= FH) return; L.d[(y * FW + x) * 4 + 3] = 0; }
const layerHas = (L, x, y) => x >= 0 && y >= 0 && x < FW && y < FH && L.d[(y * FW + x) * 4 + 3] > 0;
function rectL(L, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(L, x + i, y + j, c); }
function ellL(L, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) setPx(L, x, y, c);
  }
}
// a limb: a thick, round-ended stroke from one joint to the next
function limbL(L, x0, y0, x1, y1, w, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)), r = w / 2;
  for (let s = 0; s <= n; s++) { const t = s / n; ellL(L, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c); }
}
// outline a layer in a dark tint of whatever it wraps, then light it from the upper left
function finish(L, opts = {}) {
  const src = new Uint8ClampedArray(L.d);
  const at = (x, y) => (y * FW + x) * 4;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (src[at(x, y) + 3]) continue;
    let n = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < FW && yy < FH && src[at(xx, yy) + 3]) { n = [src[at(xx, yy)], src[at(xx, yy) + 1], src[at(xx, yy) + 2]]; break; } }
    if (n && !opts.noOutline) { setPx(L, x, y, mixRgb(OUTLINE, n, 0.22)); L.edge[y * FW + x] = 1; }
  }
  if (opts.flat) return L;
  const d = new Uint8ClampedArray(L.d);
  const solid = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && d[at(x, y) + 3] && !L.edge[y * FW + x];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (!solid(x, y)) continue;
    const i = at(x, y), c = [d[i], d[i + 1], d[i + 2]];
    let out = c;
    if (!solid(x, y - 1)) out = mixRgb(c, [255, 244, 214], 0.2);
    else if (!solid(x, y + 1)) out = [c[0] * 0.78, c[1] * 0.76, c[2] * 0.86 + 8];
    else if (!solid(x - 1, y)) out = mixRgb(c, [255, 244, 214], 0.08);
    else if (!solid(x + 1, y)) out = [c[0] * 0.86, c[1] * 0.85, c[2] * 0.9 + 4];
    else if (!solid(x, y + 2) || !solid(x + 2, y)) out = [c[0] * 0.93, c[1] * 0.92, c[2] * 0.95 + 2];
    L.d[i] = out[0]; L.d[i + 1] = out[1]; L.d[i + 2] = out[2];
  }
  return L;
}
function stack(out, L) { for (let i = 0; i < L.d.length; i += 4) if (L.d[i + 3]) { out.d[i] = L.d[i]; out.d[i + 1] = L.d[i + 1]; out.d[i + 2] = L.d[i + 2]; out.d[i + 3] = 255; out.edge[i >> 2] = L.edge[i >> 2]; out.cloth[i >> 2] = L.cloth === true ? 1 : 0; } }
// selective outline, the way the world's own art is drawn: lines inside the body soften into a deep shade of
// the part they wrap, and the silhouette is dark only where it turns from the light — lit along the top and
// left, deepest at the feet and the shadowed right.
function selout(out) {
  const d = out.d, at = (x, y) => (y * FW + x) * 4;
  const open = (x, y) => x < 0 || y < 0 || x >= FW || y >= FH || !d[at(x, y) + 3];
  const fill = (x, y) => !open(x, y) && !out.edge[y * FW + x];
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (!out.edge[y * FW + x] || !d[at(x, y) + 3]) continue;
    // the color this line wraps: the nearest filled neighbor
    let n = null;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) if (fill(x + dx, y + dy)) { const j = at(x + dx, y + dy); n = [src[j], src[j + 1], src[j + 2]]; break; }
    if (!n) continue;
    const outer = open(x, y - 1) || open(x, y + 1) || open(x - 1, y) || open(x + 1, y);
    let c;
    // a bold, near-black line, inside and out, the way the old sprites were inked
    if (!outer) c = mixRgb(OUTLINE, n, 0.2);
    else c = mixRgb(OUTLINE, n, 0.08);
    const i = at(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
}

// ---------------- body plans ----------------
const BUILDS = {
  adult: { headY: 3, hrx: 6.5, hry: 7.5, torsoTop: 19, torsoBot: 31, tw: 14, hipBot: 34, legW: 5, armW: 4 },
  broad: { headY: 2, hrx: 6.5, hry: 7.5, torsoTop: 18, torsoBot: 31, tw: 17, hipBot: 34, legW: 6, armW: 5 },
  slim: { headY: 3, hrx: 6, hry: 7.5, torsoTop: 19, torsoBot: 31, tw: 12, hipBot: 34, legW: 4, armW: 3 },
  stout: { headY: 4, hrx: 7, hry: 7.5, torsoTop: 20, torsoBot: 32, tw: 18, hipBot: 35, legW: 6, armW: 5, belly: 1 },
  child: { headY: 14, hrx: 6, hry: 6.5, torsoTop: 28, torsoBot: 37, tw: 11, hipBot: 39, legW: 4, armW: 3 },
  // the folk under the mountain: goblins stand short, ogres and hobgoblins fill the frame
  short: { headY: 13, hrx: 6.5, hry: 6.5, torsoTop: 27, torsoBot: 37, tw: 12, hipBot: 39, legW: 4, armW: 3 },
  huge: { headY: 1, hrx: 6.5, hry: 6.5, torsoTop: 15, torsoBot: 31, tw: 20, hipBot: 34, legW: 6, armW: 6 },
};
const FOOT_Y = 46;

// walk poses (side view): where each foot and hand goes, and how much the body rises
const SIDE_STEPS = [
  { nf: [5, 0], ff: [-4, -1], nh: [-5, 0], fh: [5, -1], lift: 0 },
  { nf: [0, 0], ff: [-2, -3], nh: [0, 0], fh: [0, 0], lift: 1 },
  { nf: [-4, -1], ff: [5, 0], nh: [5, -1], fh: [-5, 0], lift: 0 },
  { nf: [-2, -3], ff: [0, 0], nh: [0, 0], fh: [0, 0], lift: 1 },
];
// front/back view: one foot lifts while the other plants; hands swing a little
const FRONT_STEPS = [
  { l: 2, r: 0, lh: [1, -1], rh: [0, 1], lift: 0 },
  { l: 0, r: 0, lh: [0, 0], rh: [0, 0], lift: 1 },
  { l: 0, r: 2, lh: [0, 1], rh: [-1, -1], lift: 0 },
  { l: 0, r: 0, lh: [0, 0], rh: [0, 0], lift: 1 },
];

// ---------------- drawing a person ----------------
// view: 'down' | 'up' | 'right' ('left' is 'right' mirrored); pose: 'idle0', 'idle1', or 0–3 for walking
// hand positions (offsets from where the hands hang) and how far the held thing is turned, per action pose
const POSES = {
  atk0: { front: { rh: [1, -10], ang: -1.2 }, side: { nh: [-3, -10], ang: -0.9 } },
  atk1: { front: { rh: [-2, -5], ang: 0.9 }, side: { nh: [4, -6], ang: 1.3 } },
  atk2: { front: { rh: [-5, -1], ang: 2.1 }, side: { nh: [4, -1], ang: 2.3 } },
  cast0: { front: { lh: [1, -10], rh: [-1, -10] }, side: { nh: [2, -11], fh: [1, -10] } },
  cast1: { front: { lh: [3, -6], rh: [-3, -6] }, side: { nh: [6, -6], fh: [5, -5] } },
  pray: { front: { lh: [5, -6], rh: [-5, -6] }, side: { nh: [3, -6], fh: [3, -6] } },
  hurt: { front: { lh: [-2, -3], rh: [2, -3] }, side: { nh: [-3, -2], fh: [-4, -1] } },
};
POSES.work0 = POSES.atk0; POSES.work1 = POSES.atk1;
// drawing a bow: the bow hand thrust out, the string hand pulled back to the cheek; then the release
POSES.bow0 = { front: { rh: [-3, -8], lh: [3, -8] }, side: { nh: [7, -7], fh: [0, -8], ang: 0 } };
POSES.bow1 = { front: { rh: [-3, -8], lh: [5, -7] }, side: { nh: [7, -7], fh: [-3, -6], ang: 0 } };
// fishing: the rod held out over the water
POSES.fish = { front: { rh: [-1, -4], ang: 0.5 }, side: { nh: [4, -5], ang: 0.9 } };
// kneeling in prayer: hands together, the whole body lowered onto its knees
POSES.kneel = Object.assign({}, POSES.pray, { kneel: 1 });
// fidgets: a stretch, arms up
POSES.stretch = { front: { lh: [0, -12], rh: [0, -12] }, side: { nh: [1, -12], fh: [0, -11] } };
let FACE_STYLE = 'ct';
try { FACE_STYLE = localStorage.getItem('tw-face') || 'ct'; } catch (e) { }
function drawFigure(spec, view, pose) {
  const B = Object.assign({}, BUILDS[spec.build || 'adult']);
  const race = spec.race;
  if (race === 'skeleton') { B.tw = 10; B.armW = 2; B.legW = 2; }
  if (spec.hunch) { B.headY += 2; }
  const side = view === 'right', back = view === 'up';
  const walking = typeof pose === 'number';
  let fs = walking ? FRONT_STEPS[pose] : { l: 0, r: 0, lh: [0, 0], rh: [0, 0], lift: 0 };
  let ss = walking ? SIDE_STEPS[pose] : { nf: [1, 0], ff: [-1, 0], nh: [-1, 0], fh: [1, 0], lift: 0 };
  // action poses: a swing, casting, prayer, flinching; they move the hands and turn whatever is held
  const PZ = POSES[pose] ? POSES[pose][side ? 'side' : 'front'] : null;
  if (PZ) { fs = Object.assign({}, fs, PZ.rh ? { rh: PZ.rh } : {}, PZ.lh ? { lh: PZ.lh } : {}); ss = Object.assign({}, ss, PZ.nh ? { nh: PZ.nh } : {}, PZ.fh ? { fh: PZ.fh } : {}); }
  // rising at the passing step, and breathing at rest
  const lift = (walking ? (side ? ss.lift : fs.lift) : 0) + (pose === 'idle1' ? 1 : 0) - (pose === 'kneel' ? 4 : 0);
  const up = y => y - lift;
  const cx = 16, skin = spec.skin || 'eab38b', skinD = spec.skinShade || shadeHex(skin, 0.82);
  const shirt = spec.shirt || '3f7d3a', pants = spec.pants || '46506e', boots = spec.boots || '4a2e17';
  const sleeve = spec.sleeve || (spec.torso === 'vest' || spec.torso === 'apron' ? spec.under || 'efe6d2' : shirt);
  const long = ['robe', 'dress', 'gown'].includes(spec.torso), coat = spec.torso === 'coat';
  const out = newLayer();
  const layers = [];
  const L = cloth => { const l = newLayer(); l.cloth = !!cloth; layers.push(l); return l; };

  // --- far side: back hair, far arm and far leg (side view) ---
  if (['long', 'braid', 'ponytail'].includes(spec.hair) && !side) {
    const h = L(); const hc = spec.hairColor || '6e3f1f';
    if (back || spec.hair === 'long') rectL(h, cx - B.hrx - 1, up(B.headY + 6), B.hrx * 2 + 2, spec.hair === 'long' ? 13 : 8, hc);
    if (spec.hair === 'braid' && back) limbL(h, cx, up(B.headY + 10), cx, up(B.torsoTop + 9), 3, hc);
    if (spec.hair === 'ponytail' && back) limbL(h, cx, up(B.headY + 6), cx, up(B.torsoTop + 5), 4, hc);
    finish(h);
  }
  const hipY = up(B.hipBot - 1), shoulderY = up(B.torsoTop + 1), handY = up(B.torsoBot + 1);
  const legsVisible = !long && race !== 'serpent';
  const wig = walking ? (pose % 2 ? 1 : -1) : 0;
  if (race === 'ratkin') {
    // a long bare tail, behind the body
    const tl = L(), tc = spec.tailColor || 'd89a9a';
    if (side) { limbL(tl, cx - 3, hipY, cx - 9, hipY + 5, 2, tc); limbL(tl, cx - 9, hipY + 5, cx - 13, FOOT_Y - 3 + wig, 2, tc); }
    else { limbL(tl, cx + 4, hipY, cx + 9, hipY + 6, 2.2, tc); limbL(tl, cx + 9, hipY + 6, cx + 11 + wig, FOOT_Y - 1, 1.8, tc); limbL(tl, cx + 11 + wig, FOOT_Y - 1, cx + 15, FOOT_Y - 1, 1.4, tc); }
    finish(tl);
  }
  if (race === 'serpent') {
    // no legs: the body runs down into a heavy coil, the tail tip flicking out to one side
    const tl = L(), sc = spec.skin, belly = spec.belly || 'c9c27a';
    rectL(tl, cx - 4, hipY - 2, 8, FOOT_Y - hipY - 2, sc);
    ellL(tl, cx + wig, FOOT_Y - 3, 10, 3.6, sc);
    limbL(tl, cx + 9 + wig, FOOT_Y - 3, cx + 13, FOOT_Y - 9, 2.4, sc);
    finish(tl);
    const bl = L();
    if (!back) { rectL(bl, cx - 2, hipY - 1, 4, FOOT_Y - hipY - 5, belly); for (let y = hipY; y < FOOT_Y - 6; y += 2) rectL(bl, cx - 2, y, 4, 1, shadeHex(belly, 0.85)); }
    for (let x = -8; x <= 8; x += 3) setPx(bl, cx + x + wig, FOOT_Y - 4, shadeHex(sc, 0.75));
  }
  if (side) {
    // far leg and arm, a shade darker
    const fl = L(1), farPants = shadeHex(pants, 0.82), farBoots = shadeHex(boots, 0.82);
    const fx = cx + ss.ff[0], fy = FOOT_Y + ss.ff[1];
    if (legsVisible) limbL(fl, cx - 1, hipY, fx, fy - 3, B.legW - 1, coat ? shadeHex(spec.coatColor || shirt, 0.8) : farPants);
    if (race !== 'serpent') rectL(fl, fx - 2, fy - 3, race === 'skeleton' ? 4 : 6, race === 'skeleton' ? 2 : 4, farBoots);
    finish(fl);
    const fa = L(1), fhx = cx + ss.fh[0], fhy = handY + ss.fh[1];
    limbL(fa, cx, shoulderY + 1, fhx, fhy - 2, B.armW - 1, shadeHex(sleeve, 0.8));
    ellL(fa, fhx, fhy, 2, 2, skinD);
    finish(fa);
  }
  // --- legs and boots (front/back view) ---
  if (!side) {
    const lg = L(1);
    const lx = cx - 3, rx = cx + 3;
    if (legsVisible) {
      limbL(lg, lx, hipY, lx, FOOT_Y - 3 - fs.l, B.legW, pants);
      limbL(lg, rx, hipY, rx, FOOT_Y - 3 - fs.r, B.legW, pants);
      if (race === 'skeleton') { ellL(lg, lx, hipY + 6 - fs.l / 2, 1.6, 1.6, pants); ellL(lg, rx, hipY + 6 - fs.r / 2, 1.6, 1.6, pants); }
    }
    if (race !== 'serpent') {
      const bw = race === 'skeleton' ? 4 : 5;
      rectL(lg, lx - 3 + (5 - bw), FOOT_Y - 3 - fs.l, bw, race === 'skeleton' ? 2 : 4, boots);
      rectL(lg, rx - 2, FOOT_Y - 3 - fs.r, bw, race === 'skeleton' ? 2 : 4, boots);
    }
    finish(lg);
  }
  // --- the body: torso, skirt or robe, belt ---
  const tb = L(1);
  const tw = side ? Math.round(B.tw * 0.65) : B.tw, tx = cx - tw / 2;
  const torsoColor = spec.torso === 'coat' ? spec.coatColor || shirt : shirt;
  // torso with rounded shoulders
  rectL(tb, tx, up(B.torsoTop + 2), tw, B.torsoBot - B.torsoTop - 1, torsoColor);
  rectL(tb, tx + 1, up(B.torsoTop + 1), tw - 2, 1, torsoColor);
  rectL(tb, tx + 2, up(B.torsoTop), tw - 4, 1, torsoColor);
  if (B.belly) ellL(tb, cx + (side ? 3 : 0), up(B.torsoBot - 4), tw / 2 + (side ? 1 : 0), 6, torsoColor);
  // hips and seat of the trousers
  rectL(tb, tx + 1, up(B.torsoBot), tw - 2, B.hipBot - B.torsoBot, long ? torsoColor : pants);
  if (long) {
    // a skirt or robe widening to the ankles
    const top = up(B.torsoBot - 1), bot = FOOT_Y - 2;
    for (let y = top; y <= bot; y++) { const k = (y - top) / (bot - top), w = tw + Math.round(k * (side ? 5 : 7)); rectL(tb, cx - w / 2 + (side ? 1 : 0), y, w, 1, spec.skirt || torsoColor); }
  }
  if (coat) {
    const top = up(B.torsoBot - 1), bot = up(B.hipBot + 7);
    for (let y = top; y <= bot; y++) { const w = tw + 2; rectL(tb, cx - w / 2, y, w, 1, torsoColor); }
    if (!side && !back) rectL(tb, cx - 1, up(B.torsoBot + 1), 2, bot - up(B.torsoBot + 1), shadeHex(torsoColor, 0.6));
  }
  finish(tb);
  // details on the front of the body, drawn after its outline so they read as cloth and leather
  const det = L(1);
  if (!back) {
    const fx0 = side ? cx - 1 : cx;
    if (spec.torso === 'vest' && !side) { rectL(det, tx, up(B.torsoTop + 2), 3, B.torsoBot - B.torsoTop - 1, spec.vest || '6e4421'); rectL(det, tx + tw - 3, up(B.torsoTop + 2), 3, B.torsoBot - B.torsoTop - 1, spec.vest || '6e4421'); }
    if (spec.torso === 'apron' || spec.apron) { const ax = side ? cx + 1 : cx - 4, aw = side ? 3 : 8; rectL(det, ax, up(B.torsoTop + 4), aw, B.hipBot - B.torsoTop + (long ? 6 : 3), spec.apronColor || 'efe6d2'); }
    if (spec.armor === 'leather') { rectL(det, side ? cx : cx - 5, up(B.torsoTop + 1), 2, B.torsoBot - B.torsoTop, '4a2a14'); if (!side) rectL(det, cx + 3, up(B.torsoTop + 1), 2, B.torsoBot - B.torsoTop, '4a2a14'); }
    if (spec.armor === 'mail') for (let y = up(B.torsoTop + 2); y < up(B.torsoBot); y++) for (let x = Math.ceil(tx); x < tx + tw; x++) if ((x + y) % 2 === 0) setPx(det, x, y, shadeHex(torsoColor, 0.78));
    if (spec.armor === 'plate' && !side) { ellL(det, tx + 1, up(B.torsoTop + 2), 3, 2.5, 'e8edf2'); ellL(det, tx + tw - 1, up(B.torsoTop + 2), 3, 2.5, 'e8edf2'); rectL(det, cx - 1, up(B.torsoTop + 3), 2, 8, 'e8edf2'); }
    if (spec.tabard && !side) { rectL(det, cx - 4, up(B.torsoTop + 1), 8, B.hipBot - B.torsoTop + 4, spec.tabard); ellL(det, cx, up(B.torsoTop + 6), 2.5, 2.5, 'e3b93c'); setPx(det, cx - 1, up(B.torsoTop + 5), 'fff1b0'); }
    // an adventurer's satchel: a strap across the chest from the left shoulder, the bag on the right hip
    if (spec.strap && !side) { const sy0 = up(B.torsoTop + 1); for (let k = 0; k < B.tw - 1; k++) { setPx(det, cx - B.tw / 2 + 1 + k, sy0 + Math.round(k * (B.torsoBot - B.torsoTop - 1) / (B.tw - 1)), '6b4423'); setPx(det, cx - B.tw / 2 + 2 + k, sy0 + Math.round(k * (B.torsoBot - B.torsoTop - 1) / (B.tw - 1)), '8a5a2b'); } if (!back) { rectL(det, cx + B.tw / 2 - 3, up(B.torsoBot - 1), 6, 5, '7a4a26'); rectL(det, cx + B.tw / 2 - 3, up(B.torsoBot - 1), 6, 2, '5a3a1e'); setPx(det, cx + B.tw / 2, up(B.torsoBot), 'c8a03a'); } }
    if (spec.necklace) { for (let x = -2; x <= 2; x++) setPx(det, fx0 + x, up(B.torsoTop + 1 + Math.abs(x) / 2), 'e3b93c'); setPx(det, fx0, up(B.torsoTop + 3), 'e3b93c'); }
    if (spec.collar && !side) { setPx(det, cx - 1, up(B.torsoTop), skin); setPx(det, cx, up(B.torsoTop), skin); }
    // belt
    if (!long || spec.belt) { rectL(det, side ? cx - tw / 2 : tx, up(B.torsoBot - 1), tw, 2, spec.belt || '4a2a14'); if (!side) rectL(det, cx - 1, up(B.torsoBot - 1), 2, 2, 'e3b93c'); }
  }
  if (race === 'skeleton' && !back) {
    for (let y = up(B.torsoTop + 2); y < up(B.torsoBot - 1); y += 2) rectL(det, tx + 1, y, tw - 2, 1, '6e665a');
    rectL(det, cx - 1, up(B.torsoTop + 1), 2, B.torsoBot - B.torsoTop, 'f4ecdc');
  }
  layers.splice(layers.indexOf(det), 1); layers.push(det);
  // --- arms (front/back) or the near arm (side) ---
  const ar = L(1);
  if (side) {
    const nhx = cx + ss.nh[0], nhy = handY + ss.nh[1];
    limbL(ar, cx, shoulderY + 1, nhx, nhy - 2, B.armW, sleeve);
    ellL(ar, nhx, nhy, 2, 2, spec.gloves || skin);
  } else {
    const sx = tw / 2 + (B.armW > 4 ? 0.5 : 0);
    const lhx = cx - sx - 1 + fs.lh[0], lhy = handY + fs.lh[1], rhx = cx + sx + 1 + fs.rh[0], rhy = handY + fs.rh[1];
    limbL(ar, cx - sx + 1, shoulderY + 1, lhx, lhy - 2, B.armW, sleeve);
    limbL(ar, cx + sx - 1, shoulderY + 1, rhx, rhy - 2, B.armW, sleeve);
    const hand = spec.gloves || (back ? skinD : skin); ellL(ar, lhx, lhy, 2, 2, hand); ellL(ar, rhx, rhy, 2, 2, hand);
    if (spec.gloves) { rectL(ar, lhx - 2, lhy - 3, 4, 1, shadeHex(spec.gloves, 1.2)); rectL(ar, rhx - 2, rhy - 3, 4, 1, shadeHex(spec.gloves, 1.2)); }
    if (spec.armor === 'plate') { rectL(ar, lhx - 2, lhy - 4, 4, 2, 'c9d1d8'); rectL(ar, rhx - 2, rhy - 4, 4, 2, 'c9d1d8'); }
  }
  finish(ar);
  // --- near leg (side view): drawn after the body so it steps in front ---
  if (side) {
    const nl = L(1), nfx = cx + ss.nf[0], nfy = FOOT_Y + ss.nf[1];
    if (legsVisible) limbL(nl, cx + 1, hipY, nfx, nfy - 3, B.legW, coat ? spec.coatColor || shirt : pants);
    if (race !== 'serpent') { rectL(nl, nfx - 2, nfy - 3, race === 'skeleton' ? 4 : 6, race === 'skeleton' ? 2 : 4, boots); setPx(nl, nfx + 4, nfy, boots); }
    finish(nl);
    // the near arm swings in front of the leg
    layers.splice(layers.indexOf(ar), 1); layers.push(ar);
  }
  // --- neck and head ---
  const hd = L(), hy = up(B.headY), hcy = hy + B.hry;
  rectL(hd, cx - (spec.build === 'broad' ? 3 : 2), hcy + B.hry - 2, spec.build === 'broad' ? 6 : 4, B.torsoTop - (B.headY + B.hry * 2) + 4, skinD);
  if (side) {
    ellL(hd, cx, hcy, B.hrx - 0.5, B.hry, skin);
    rectL(hd, cx + 1, hcy + 1, B.hrx - 1, B.hry - 2, skin); // a jaw
    setPx(hd, cx + B.hrx, hcy + 1, skin); setPx(hd, cx + B.hrx, hcy, skin); setPx(hd, cx + B.hrx + 1, hcy + 1, skin); setPx(hd, cx + B.hrx, hcy + 2, shadeHex(skin, 0.78)); // the nose
    if (race !== 'serpent' && race !== 'skeleton') { setPx(hd, cx - 1, hcy, shadeHex(skin, 0.86)); setPx(hd, cx - 1, hcy + 1, shadeHex(skin, 0.78)); setPx(hd, cx, hcy + 1, shadeHex(skin, 0.9)); setPx(hd, cx - 1, hcy + 2, shadeHex(skin, 0.86)); } // the ear
  } else {
    ellL(hd, cx, hcy, B.hrx, B.hry, skin);
    if (spec.jaw !== 'soft') rectL(hd, cx - B.hrx + 1, hcy + 2, B.hrx * 2 - 2, B.hry - 3, skin);
    if (race === 'goblin') for (const s2 of [-1, 1]) for (let k = 0; k < 6; k++) { const x = cx + s2 * (B.hrx + k) - (s2 < 0 ? 1 : 0); rectL(hd, x, hcy - 1 - Math.floor(k / 2), 1, 3 - Math.floor(k / 2.5), skin); }
    else if (race === 'ratkin') for (const s2 of [-1, 1]) ellL(hd, cx + s2 * 5, hy, 3.4, 3.4, skin);
    else if (race === 'hollow') for (const s2 of [-1, 1]) { rectL(hd, cx + s2 * (B.hrx + 1) - (s2 < 0 ? 1 : 0), hcy - 1, 1, 3, skin); }
    else if (race !== 'serpent' && race !== 'skeleton') { ellL(hd, cx - B.hrx - 0.5, hcy + 1, 1.2, 1.8, skin); ellL(hd, cx + B.hrx + 0.5, hcy + 1, 1.2, 1.8, skin); } // ears
    // a long pointed snout running down past the jaw
    if (race === 'ratkin' && !back) { ellL(hd, cx, hcy + 4, 3.6, 3.4, spec.muzzle || 'b09a88'); rectL(hd, cx - 1, hcy + 6, 2, 3, spec.muzzle || 'b09a88'); }
  }
  if (side && race === 'ratkin') { rectL(hd, cx + B.hrx - 1, hcy + 1, 4, 3, spec.muzzle || 'b09a88'); ellL(hd, cx - 1, hy + 1, 2.5, 2.5, skin); }
  if (side && race === 'goblin') { for (let k = 0; k < 5; k++) rectL(hd, cx - B.hrx - k, hcy - 1 - (k >> 1), 1, 2, skin); setPx(hd, cx + B.hrx + 1, hcy + 1, skin); }
  finish(hd);
  // the face
  const fc = L(); const brow = spec.browColor || shadeHex(spec.hairColor || '6e3f1f', 0.8);
  if (!back && race) {
    const eyeY = hcy + 1, sym = (x, y, col) => { setPx(fc, x, y, col); setPx(fc, 31 - x, y, col); };
    const eye = spec.eyes || 'e3c43a';
    if (side) {
      const ex = cx + B.hrx - 3;
      if (race === 'skeleton') rectL(fc, ex - 1, eyeY - 1, 2, 2, '2a2226');
      else { setPx(fc, ex, eyeY, eye); setPx(fc, ex, eyeY - 1, shadeHex(skin, 0.75)); }
      if (race === 'ratkin') { setPx(fc, cx + B.hrx + 2, hcy + 1, 'd86a7a'); setPx(fc, cx + B.hrx + 3, hcy + 3, 'e8e1c8'); }
      if (race === 'goblin') { setPx(fc, ex - 1, eyeY + 4, 'f4ecdc'); setPx(fc, ex, eyeY + 4, '3a1a1a'); }
    } else if (race === 'goblin') {
      sym(12, eyeY, eye); sym(13, eyeY, '1b1424'); sym(12, eyeY - 1, shadeHex(skin, 0.7)); sym(13, eyeY - 1, shadeHex(skin, 0.7));
      sym(15, eyeY + 2, shadeHex(skin, 0.75)); sym(15, eyeY + 1, shadeHex(skin, 1.1));
      for (const x of [13, 14, 15]) sym(x, eyeY + 4, '3a1a1a'); sym(13, eyeY + 3, 'f4ecdc'); sym(14, eyeY + 5, 'f4ecdc');
    } else if (race === 'ratkin') {
      sym(12, eyeY, eye); sym(12, eyeY - 1, '1b1424'); sym(11, hy, 'd89a9a'); sym(10, hy + 1, 'd89a9a');
      sym(15, eyeY + 6, 'd86a7a'); sym(15, eyeY + 5, shadeHex(spec.muzzle || 'b09a88', 1.1));
      for (const [x, dy] of [[9, 3], [10, 4], [11, 4], [9, 5], [10, 5]]) sym(x, eyeY + dy, 'e8e1c8');
      sym(14, eyeY + 7, '3a2a2a');
    } else if (race === 'hollow') {
      for (const x of [11, 12, 13]) { sym(x, eyeY - 1, eye); sym(x, eyeY, eye); } sym(12, eyeY, 'ffffff'); sym(13, eyeY + 1, shadeHex(skin, 0.8));
      sym(11, eyeY + 3, shadeHex(skin, 0.82)); sym(15, eyeY + 2, shadeHex(skin, 0.85)); sym(14, eyeY + 5, '4a4a5a');
    } else if (race === 'serpent') {
      sym(12, eyeY, eye); sym(13, eyeY, eye); sym(13, eyeY - 1, eye); sym(12, eyeY + 1, '1b1424');
      sym(14, eyeY + 3, '1b1424');
      for (let y = hy + 1; y < eyeY - 2; y += 2) for (let x = 11 + ((y >> 1) % 2); x < 16; x += 2) sym(x, y, shadeHex(skin, 0.82));
      for (const x of [12, 13, 14, 15]) sym(x, eyeY + 5, shadeHex(skin, 0.6));
    } else if (race === 'skeleton') {
      for (const x of [11, 12, 13]) { sym(x, eyeY - 1, '2a2226'); sym(x, eyeY, '2a2226'); } sym(12, eyeY, eye || '2a2226');
      sym(15, eyeY + 2, '2a2226');
      for (let x = 12; x < 16; x++) { sym(x, eyeY + 4, x % 2 ? '2a2226' : 'f4ecdc'); }
    }
  } else if (!back) {
    const eyeY = hcy + 1;
    if (side) {
      // a larger eye in profile: white toward the front, the iris two pixels tall, a lid line above
      const ex = cx + B.hrx - 3, iris = spec.eyes || '2a2a3a';
      setPx(fc, ex, eyeY, iris); setPx(fc, ex, eyeY + 1, shadeHex(iris, 0.8)); setPx(fc, ex + 1, eyeY, 'f2efe6'); setPx(fc, ex + 1, eyeY + 1, 'd8d2c8');
      setPx(fc, ex, eyeY - 1, shadeHex(skin, 0.55)); setPx(fc, ex + 1, eyeY - 1, shadeHex(skin, 0.62));
      rectL(fc, ex - 1, eyeY - 3, 3, 1, brow);
      setPx(fc, cx + B.hrx - 2, eyeY + 4, shadeHex(skin, 0.7));
      setPx(fc, cx - 1, eyeY + 1, skinD); // the ear
    } else {
      // an old JRPG face: shade down the far side, a dark band where the brow overhangs, small dark eyes each with
      // one bright glint of color, a dot of a nose, a short mouth
      const iris = spec.eyes || '7a5a3a', sh = f => shadeHex(skin, f), R1 = cx + B.hrx - 2;
      for (let y = eyeY - 3; y <= hcy + B.hry - 1; y++) if (layerHas(hd, R1, y) && !hd.edge[y * FW + R1]) setPx(fc, R1, y, sh(0.82));
      const dark = '231c2c', glint = mixRgb(hexRgb(iris), [255, 255, 255], 0.45), irisD = shadeHex(iris, 0.8);
      const browC = spec.browColor || shadeHex(spec.hairColor || '5a3a1e', 0.7);
      if (FACE_STYLE === 'ct') {
        // Chrono Trigger: each eye a single dark upright stroke, two pixels tall; no brows, no mouth; the hair does the rest
        for (const x of [13, 18]) { setPx(fc, x, eyeY, '1c1828'); setPx(fc, x, eyeY + 1, spec.eyes ? shadeHex(spec.eyes, 0.75) : '2a2238'); }
        // on darker skin a lone dark stroke disappears, so the eye gets its white beside the pupil and a glint
        { const [r0, g0, b0] = hexRgb(skin); if (r0 * 0.3 + g0 * 0.59 + b0 * 0.11 < 135) { for (const x of [12, 19]) setPx(fc, x, eyeY, 'e8e0d2'); setPx(fc, 13, eyeY, '2a2238'); setPx(fc, 18, eyeY, '2a2238'); setPx(fc, 13, eyeY - 1, sh(0.7)); setPx(fc, 18, eyeY - 1, sh(0.7)); } }
        if (spec.lashes) { setPx(fc, 12, eyeY, '1c1828'); setPx(fc, 19, eyeY, '1c1828'); }
        setPx(fc, 16, eyeY + 2, sh(0.86));
        if (spec.jaw === 'soft' || spec.build === 'child') { setPx(fc, 12, eyeY + 2, mixRgb(hexRgb(skin), [232, 118, 104], 0.25)); setPx(fc, 19, eyeY + 2, mixRgb(hexRgb(skin), [232, 118, 104], 0.2)); }
      } else if (FACE_STYLE === 'none') {
        // no eyes at all: a heavy brow, the eyes lost in its shadow, a hint of nose
        for (const x of [11, 12, 13, 14]) { setPx(fc, x, eyeY - 1, browC); setPx(fc, 31 - x, eyeY - 1, browC); }
        for (const x of [12, 13]) { setPx(fc, x, eyeY, sh(0.74)); setPx(fc, 31 - x, eyeY, sh(0.74)); }
        setPx(fc, 16, eyeY + 2, sh(0.8)); setPx(fc, 15, eyeY + 2, sh(0.92));
      } else {
      // bright, alive eyes: a dark pupil with a white glint, the iris's color beneath; a brow well above, with skin between
      for (const [x0, gl] of [[12, 12], [18, 18]]) {
        setPx(fc, x0, eyeY, dark); setPx(fc, x0 + 1, eyeY, dark);
        setPx(fc, gl, eyeY, 'fbf6ea');
        setPx(fc, x0, eyeY + 1, irisD); setPx(fc, x0 + 1, eyeY + 1, glint);
      }
      for (const [x, dy] of [[11, -3], [12, -3], [13, -2]]) { setPx(fc, x, eyeY + dy, browC); setPx(fc, 31 - x, eyeY + dy, browC); }
      if (spec.heavyBrow) for (const [x, dy] of [[11, -4], [12, -4], [13, -3], [14, -2]]) { setPx(fc, x, eyeY + dy, browC); setPx(fc, 31 - x, eyeY + dy, browC); }
      if (spec.lashes) { setPx(fc, 11, eyeY, dark); setPx(fc, 20, eyeY, dark); }
      // warmth: a touch of color in the cheeks and light on the brow, on everyone
      if (spec.jaw === 'soft' || spec.blush || spec.build === 'child') { setPx(fc, 11, eyeY + 2, mixRgb(hexRgb(skin), [232, 118, 104], 0.25)); setPx(fc, 20, eyeY + 2, mixRgb(hexRgb(skin), [232, 118, 104], 0.2)); }
      setPx(fc, 13, eyeY - 4, mixRgb(hexRgb(skin), [255, 246, 228], 0.35));
      }
      setPx(fc, 16, eyeY + 2, sh(0.78));
      setPx(fc, 15, eyeY + 4, sh(0.7)); setPx(fc, 16, eyeY + 4, sh(0.66));
      if (spec.blush || spec.jaw === 'soft') { setPx(fc, 11, eyeY + 2, mixRgb(hexRgb(skin), [230, 120, 110], 0.35)); setPx(fc, 20, eyeY + 2, mixRgb(hexRgb(skin), [230, 120, 110], 0.3)); }
      if (spec.wrinkles) { setPx(fc, 11, eyeY + 1, sh(0.8)); setPx(fc, 20, eyeY + 1, sh(0.8)); }
      // marks: freckles, scars, a tattoo, warpaint, a beauty mark
      const mk = spec.mark;
      if (mk === 'freckles') for (const [x, dy] of [[11, 2], [12, 3], [13, 2], [18, 2], [19, 3], [20, 2]]) setPx(fc, x, eyeY + dy, sh(0.78));
      else if (mk === 'scar') { for (let k = -3; k <= 3; k++) if (k !== 0 && k !== 1) setPx(fc, 18 + Math.round(k * 0.35), eyeY + k, mixRgb(hexRgb(skin), [230, 170, 160], 0.55)); }
      else if (mk === 'cheekscar') for (const x of [18, 19, 20]) setPx(fc, x, eyeY + 3 + (x === 19 ? 0 : x === 20 ? 1 : -1) * 0, mixRgb(hexRgb(skin), [230, 160, 150], 0.6));
      else if (mk === 'tattoo') { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, 0]]) setPx(fc, 15 + dx + (dx > 0 ? 1 : 0), eyeY - 5 + dy, dx === 0 && dy === 0 ? '3a4a8a' : '4a5aa0'); }
      else if (mk === 'paintred') for (const x of [11, 12, 13, 18, 19, 20]) setPx(fc, x, eyeY + 2, 'a8302a');
      else if (mk === 'paintblue') for (const x of [13, 18]) { setPx(fc, x, eyeY - 2, '2a5aa8'); setPx(fc, x, eyeY + 2, '2a5aa8'); setPx(fc, x, eyeY + 3, '2a5aa8'); }
      else if (mk === 'mole') setPx(fc, 19, eyeY + 4, '3a2620');
    }
  }
  // --- facial hair: shaped to the jaw, in many styles ---
  if (spec.beard && !back) {
    const bd = L(), bc = spec.beardColor || shadeHex(spec.hairColor || '6e3f1f', 0.78), st = spec.beard;
    const jaw = y => { const t = (y + 0.5 - hcy) / B.hry; return Math.abs(t) > 1 ? 0 : B.hrx * Math.sqrt(1 - t * t); };
    const span = (y, w, x0 = cx) => { for (let x = Math.floor(x0 - w); x < Math.ceil(x0 + w); x++) setPx(bd, x, y, bc); };
    const chin = hcy + Math.round(B.hry);
    const mo = () => { for (let x = cx - 3; x <= cx + 2; x++) setPx(bd, x, hcy + 4, bc); };
    if (side) {
      const fx = cx + B.hrx - 2;
      if (['full', 'short', 'long', 'braided', 'mutton', 'chinstrap'].includes(st)) rectL(bd, cx + 1, hcy - 1, 2, 4, bc); // the sideburn, in front of the ear, running up into the hair
      if (['full', 'short', 'long', 'braided'].includes(st)) { for (let y = hcy + 2; y <= chin + (st === 'long' ? 5 : st === 'short' ? 0 : 1); y++) { const w = y <= chin ? Math.min(B.hrx - 1, 2 + (y - hcy - 2) * 0.9) : Math.max(1, 3 - (y - chin)); for (let x = Math.round(fx - w * 1.4); x <= fx + 1 - (y > chin ? 2 : 0); x++) setPx(bd, x, y, bc); } clearPx(bd, fx + 1, hcy + 5); clearPx(bd, fx, hcy + 5); if (st === 'braided') for (let y = chin + 1; y <= chin + 7; y++) setPx(bd, fx - 2 + (y % 2), y, bc); }
      else if (st === 'goatee') { for (let y = hcy + 5; y <= chin + 1; y++) { setPx(bd, fx, y, bc); setPx(bd, fx - 1, y, bc); } setPx(bd, fx, hcy + 4, bc); }
      else if (st === 'chinstrap') { for (let y = hcy + 1; y <= chin; y++) setPx(bd, Math.round(cx - 1 + (y - hcy) * 0.7), y, bc); for (let x = cx + 2; x <= fx; x++) setPx(bd, x, chin, bc); }
      else if (st === 'mutton') { rectL(bd, cx - 1, hcy, 3, 6, bc); for (let x = cx + 2; x <= fx; x++) setPx(bd, x, hcy + 4, bc); }
      else { for (let x = fx - 2; x <= fx + 1; x++) setPx(bd, x, hcy + 4, bc); if (st === 'handlebar') setPx(bd, fx - 3, hcy + 3, bc); }
    } else if (st === 'moustache' || st === 'handlebar') { mo(); if (st === 'handlebar') { setPx(bd, cx - 4, hcy + 3, bc); setPx(bd, cx + 3, hcy + 3, bc); setPx(bd, cx - 4, hcy + 2, bc); setPx(bd, cx + 3, hcy + 2, bc); } else { setPx(bd, cx - 3, hcy + 5, bc); setPx(bd, cx + 2, hcy + 5, bc); } }
    else if (st === 'goatee') { mo(); for (let y = hcy + 6; y <= chin + 1; y++) span(y, y > chin ? 1 : 2); clearPx(bd, cx - 1, hcy + 5); clearPx(bd, cx, hcy + 5); }
    else if (st === 'chinstrap') { for (let y = hcy + 1; y <= chin; y++) { const w = jaw(y); setPx(bd, Math.round(cx - w), y, bc); setPx(bd, Math.round(cx + w) - 1, y, bc); } span(chin, 3); span(chin + 1, 2); }
    else if (st === 'mutton') { for (let y = hcy + 2; y <= hcy + 6; y++) { const w = jaw(y); for (let k = 0; k < (y < hcy + 4 ? 2 : 3); k++) { setPx(bd, Math.round(cx - w) + k, y, bc); setPx(bd, Math.round(cx + w) - 1 - k, y, bc); } } mo(); clearPx(bd, cx - 1, hcy + 4); clearPx(bd, cx, hcy + 4); }
    else {
      // full, short, long and braided: sideburns into a beard that follows the jaw and rounds off below the chin
      const extra = st === 'long' ? 6 : st === 'short' ? 0 : 2;
      for (let y = hcy - 1; y <= chin + extra; y++) {
        // sideburns down the cheeks' outer edge; the cheeks themselves stay bare until the line of the mouth
        if (y < hcy + 5) { if (y < hcy + 2) continue; const w = jaw(y); setPx(bd, Math.round(cx - w), y, bc); setPx(bd, Math.round(cx + w) - 1, y, bc); continue; }
        const w = y <= chin - 1 ? jaw(y) - (st === 'short' ? 0.6 : 0.2) : Math.max(1, (st === 'long' ? 4.5 : 3.5) - (y - chin + 1) * (st === 'long' ? 0.6 : 1.1));
        span(y, w);
      }
      mo();
      if (st === 'braided') { for (let y = chin + 2; y <= chin + 8; y++) { setPx(bd, cx - 1 + (y % 2), y, bc); setPx(bd, cx - (y % 2), y, shadeHex(bc, 0.8)); } setPx(bd, cx - 1, chin + 9, 'c8a03a'); setPx(bd, cx, chin + 9, 'c8a03a'); }
    }
    // whatever the style, the eyes always show
    if (!side) for (let y = hcy + 1; y <= hcy + 2; y++) for (const x of [12, 13, 18, 19]) clearPx(bd, x, y);
    // texture: strands catching light on top, shade toward the tip and the far side
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { if (!layerHas(bd, x, y)) continue; let f = 1; if (y > chin) f = 0.86; if (x > cx + 2) f *= 0.9; if (y > chin + 1 && (x + y) % 3 === 0) f *= 0.9; if (f !== 1) setPx(bd, x, y, shadeHex(bc, f)); }
    // no ink line where the beard meets the cheek (it reads as a grin); just a soft shadow under the beard's hem
    { const hem = []; for (let y = 0; y < FH - 1; y++) for (let x = 0; x < FW; x++) if (layerHas(bd, x, y) && !layerHas(bd, x, y + 1) && y >= chin - 1) hem.push([x, y + 1]); for (const [x, y] of hem) setPx(bd, x, y, shadeHex(bc, 0.55)); }
    finish(bd, { noOutline: true });
  }
  // --- hair: anime style, built from locks ---
  // A mass a little bigger than the skull, spiky locks thrown out from the crown, pointed bangs falling over the
  // brow (stopping short of the eyes), locks down the sides, and a bright band of shine across the top.
  if (spec.hair && spec.hair !== 'bald') {
    const hr = L(), hc = spec.hairColor || '6e3f1f', top = hy, eyeY = hcy + 1, hs = spec.hair;
    const tri = (ax, ay, bx, by, qx, qy) => {
      const minX = Math.floor(Math.min(ax, bx, qx)), maxX = Math.ceil(Math.max(ax, bx, qx)), minY = Math.floor(Math.min(ay, by, qy)), maxY = Math.ceil(Math.max(ay, by, qy));
      const s0 = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { const px = x + 0.5, py = y + 0.5, d1 = s0(px, py, ax, ay, bx, by), d2 = s0(px, py, bx, by, qx, qy), d3 = s0(px, py, qx, qy, ax, ay); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) setPx(hr, x, y, hc); }
    };
    // a lock: a spike from near the crown out to a point
    const lock = (tx, ty, w = 2.2) => { const ox = cx + (side ? -1 : 0), oy = hcy - 2, dx = tx - ox, dy = ty - oy, L0 = Math.hypot(dx, dy) || 1, nx = -dy / L0, ny = dx / L0, bx = ox + dx * 0.45, by = oy + dy * 0.45; tri(bx + nx * w, by + ny * w, bx - nx * w, by - ny * w, tx, ty); };
    const spiky = ['crop', 'short', 'curly', 'mohawk', 'undercut'].includes(hs), longH = hs === 'long', rxH = B.hrx + 1.3;
    if (hs === 'balding') {
      for (const s2 of [-1, 1]) { tri(cx + s2 * (B.hrx + 0.5), hcy - 3, cx + s2 * (B.hrx - 2), hcy - 3, cx + s2 * (B.hrx + 0.8), hcy + 3); }
      if (back) { for (let y = hcy - 2; y <= hcy + B.hry; y++) { const t = (y - hcy + 2) / (B.hry + 2), w = B.hrx * (1 - t * t * 0.35); rectL(hr, Math.round(cx - w), y, Math.round(w * 2), 1, hc); } for (const nx of [-3, 0, 3]) tri(cx + nx - 1.8, hcy + B.hry, cx + nx + 1.8, hcy + B.hry, cx + nx, hcy + B.hry + 2); }
      else if (side) { ellL(hr, cx - B.hrx + 1.5, hcy + 1, 3, B.hry - 1, hc); tri(cx - B.hrx, hcy + 2, cx - 1, hcy + 2, cx - B.hrx + 1, hcy + B.hry + 2); }
    }
    else if (back) {
      ellL(hr, cx, hcy - 1, rxH, B.hry + 0.6, hc);
      if (hs === 'afro') ellL(hr, cx, hcy - 2.5, rxH + 2.6, B.hry + 1.6, hc);
      if (hs === 'dreads') for (let k = -3; k <= 3; k++) limbL(hr, cx + k * 1.8, hcy - 2, cx + k * 2.1, hcy + 12 + (k & 1) * 2, 1.4, hc);
      // down the back of the head to the nape, ending in a few tapered points over the neck rather than a hard edge
      if (hs !== 'mohawk') { rectL(hr, Math.round(cx - B.hrx + 0.5), hcy, Math.round(B.hrx * 2 - 1), B.hry, hc); for (const [nx, w, d] of [[-B.hrx + 2, 3, 2], [-2.5, 3.4, 3], [0.5, 3.4, 4], [3.5, 3.4, 3], [B.hrx - 1.5, 3, 2]]) tri(cx + nx - w / 2, hcy + B.hry - 1, cx + nx + w / 2, hcy + B.hry - 1, cx + nx, hcy + B.hry + d - (hs === 'crop' ? 1 : 0)); }
      if (spiky) for (const [tx, ty] of [[-10, -3], [-8, -9], [-3, -12], [3, -11], [8, -8], [10, -2], [-6, 5], [6, 6]]) lock(cx + tx, hcy + ty);
      if (longH) tri(cx - rxH, hcy, cx + rxH, hcy, cx, hcy + 16), rectL(hr, Math.round(cx - rxH + 1), hcy, Math.round(rxH * 2 - 2), 10, hc);
      if (hs === 'ponytail' || hs === 'braid') limbL(hr, cx, hcy + 2, cx + 1, hcy + 13, 3, hc);
      if (hs === 'bun') ellL(hr, cx, top - 1, 3, 2.6, hc);
    } else if (side) {
      ellL(hr, cx - 1.5, hcy - 1.5, rxH - 0.5, B.hry, hc);
      if (hs === 'afro') ellL(hr, cx - 2, hcy - 3, rxH + 2, B.hry + 1.4, hc);
      if (hs === 'dreads') for (let k = 0; k < 4; k++) limbL(hr, cx - 2 - k * 1.4, hcy - 2, cx - 3 - k * 1.8, hcy + 11 + (k & 1) * 2, 1.4, hc);
      // the back of the head, down to the nape and no further, ending in a short point
      ellL(hr, cx - B.hrx + 1.5, hcy + 0.5, 3, B.hry - 1, hc);
      tri(cx - rxH + 0.5, hcy + 2, cx - 1.5, hcy + 2, cx - B.hrx + 1, hcy + B.hry + 1);
      if (spiky) for (const [tx, ty] of [[-10, -1], [-9, -6], [-5, -11], [1, -11], [5, -9], [-8, 5]]) lock(cx + tx, hcy + ty);
      // clear the face, and the cheek and ear below the temple, so the face fills the front half of the head;
      // a short sideburn stays just in front of the ear; then two bangs fall in front of the brow
      // the hairline slopes: high at the front of the brow, sweeping down and back to the temple, so the forehead
      // and cheek show as they would from the side
      const y0 = top + 3, y1 = hcy - 1;
      for (let y = y0; y < FH; y++) { const k = Math.min(1, (y - y0) / Math.max(1, y1 - y0)), edge = Math.round(cx + B.hrx - 2 - k * (B.hrx - 1)); for (let x = edge; x < FW; x++) clearPx(hr, x, y); }
      if (!longH) rectL(hr, cx, hcy - 2, 1, 3, hc); // a short sideburn in front of the ear
      // a few thin locks swept forward over the brow, gaps of forehead between them
      for (const [bx, len, w] of [[cx + 1, 5, 1.6], [cx + 3, 4, 1.4], [cx + 5, 3, 1.2]]) tri(bx - w, y0 - 1, bx + w, y0 - 1, bx + 2, Math.min(eyeY - 2, y0 + len));
      if (longH) { tri(cx - rxH, hcy - 2, cx - 1.5, hcy - 2, cx - 5, hcy + 15); rectL(hr, Math.round(cx - rxH + 0.5), hcy - 2, Math.max(3, Math.round(rxH - 2)), 12, hc); }
      if (hs === 'ponytail') limbL(hr, cx - B.hrx - 1, hcy - 3, cx - B.hrx - 4, hcy + 8, 3, hc);
      if (hs === 'bun') ellL(hr, cx - B.hrx + 1, top - 1, 2.6, 2.6, hc);
      if (hs === 'braid') limbL(hr, cx - 3, hcy + 3, cx - 4, hcy + 13, 2.4, hc);
    } else {
      ellL(hr, cx, hcy - 1.5, rxH, B.hry + 0.2, hc);
      if (hs === 'afro') ellL(hr, cx, hcy - 3, rxH + 2.6, B.hry + 1.4, hc);
      if (spiky) for (const [tx, ty] of [[-10, -3], [-8, -9], [-3, -12], [3, -11], [7, -9], [10, -3]]) lock(cx + tx, hcy + ty, hs === 'curly' ? 2.8 : 2.2);
      // clear the face below the hairline, keeping the hair down the sides
      const fx0 = Math.floor(cx - B.hrx) + 1, fx1 = 31 - fx0;
      for (let y = eyeY - 4; y < FH; y++) for (let x = fx0; x <= fx1; x++) clearPx(hr, x, y);
      // pointed bangs: the middle one reaches between the eyes, the others stop above them
      const by0 = eyeY - 5;
      if (hs !== 'afro' && hs !== 'dreads') for (const [bx, w, ty, lean] of [[cx - 5, 3.4, eyeY - 1, -1], [cx - 2, 3.6, eyeY - 1, 0], [cx + 0.5, 3, eyeY + 0.5, 0], [cx + 3, 3.6, eyeY - 1, 1], [cx + 5.6, 3.2, eyeY - 2, 1]]) tri(bx - w / 2, by0, bx + w / 2, by0, bx + lean, ty);
      if (hs === 'dreads') { for (const s2 of [-1, 1]) for (let k = 0; k < 3; k++) limbL(hr, cx + s2 * (B.hrx - 1 + k), hcy - 3, cx + s2 * (B.hrx + k * 0.8), hcy + 9 + k * 2, 1.3, hc); for (const bx of [cx - 3, cx, cx + 3]) limbL(hr, bx, by0, bx + 0.5, eyeY - 2, 1.1, hc); }
      // locks down the sides, past the ears
      const sideLen = { long: 15, braid: 6, ponytail: 5, bun: 5, curly: 6, short: 4, crop: 3, mohawk: 2, afro: 7, dreads: 4, undercut: 0 }[hs] ?? 4;
      if (hs === 'undercut') { for (let y = hcy - 3; y < FH; y++) for (let x = 0; x < FW; x++) if (Math.abs(x + 0.5 - cx) > B.hrx - 2.5) clearPx(hr, x, y); }
      else for (const s2 of [-1, 1]) tri(cx + s2 * rxH, hcy - 3, cx + s2 * (B.hrx - 1.2), hcy - 3, cx + s2 * (B.hrx + 0.4), hcy + sideLen);
      if (longH) for (const s2 of [-1, 1]) { rectL(hr, s2 < 0 ? Math.floor(cx - rxH) : Math.ceil(cx + B.hrx - 1), hcy - 2, 3, 13, hc); tri(cx + s2 * rxH, hcy + 10, cx + s2 * (B.hrx - 1), hcy + 10, cx + s2 * (B.hrx + 0.5), hcy + 16); }
      if (hs === 'bun') ellL(hr, cx, top - 2, 3.2, 2.8, hc);
      if (hs === 'ponytail') { limbL(hr, cx + B.hrx, top + 3, cx + B.hrx + 3, hcy + 7, 3, hc); }
      if (hs === 'braid') limbL(hr, cx - B.hrx, hcy + 2, cx - B.hrx + 1, hcy + 12, 2.6, hc);
    }
    // shading: the far side and the ends of the locks fall into shade
    const hd2 = hexRgb(shadeHex(hc, 0.74)), hm = hexRgb(shadeHex(hc, 0.86));
    const hdk = hexRgb(shadeHex(hc, 0.62)), hlt = hexRgb(shadeHex(hc, 1.12)), crownX = cx + (side ? -1 : 0), crownY = top - 1;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (!layerHas(hr, x, y)) continue;
      const lowc = y > hcy + 2 || (!back && !side && y >= eyeY - 2);
      // strands: thin dark partings that fan out from the crown, so the hair reads as hair and not a cap
      const a = Math.atan2(y + 0.5 - crownY, x + 0.5 - crownX), dist = Math.hypot(x - crownX, y - crownY);
      const ph = ((a / Math.PI + 1) * (back ? 5.5 : 4.5) + dist * 0.04) % 1, strand = dist > 4 && ph < 0.16 && !hr.edge[y * FW + x], lit = dist > 2 && dist < 8 && ph > 0.52 && ph < 0.64;
      if (strand) setPx(hr, x, y, lowc ? hdk : hd2);
      else if (lowc) setPx(hr, x, y, hd2);
      else if (x > cx + 3) setPx(hr, x, y, hm);
      else if (lit && y < hcy) setPx(hr, x, y, hlt);
    }
    if (spec.hairFx) for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (!layerHas(hr, x, y)) continue;
      if (spec.hairFx === 'grey' && Math.abs(x + 0.5 - cx) > B.hrx - 2 && y > hcy - 5) setPx(hr, x, y, mixRgb(hexRgb(hc), [200, 200, 205], 0.6));
      else if (spec.hairFx === 'tips' && y < top + 4) setPx(hr, x, y, mixRgb(hexRgb(hc), [245, 225, 160], 0.55));
      else if (spec.hairFx === 'streak' && (x === Math.round(cx) - 3 || x === Math.round(cx) - 2) && y < hcy + 2) setPx(hr, x, y, 'b0306a');
    }
    finish(hr);
    if (!back && !side) for (let y = eyeY; y <= eyeY + 1; y++) for (const x of [12, 13, 18, 19]) clearPx(hr, x, y);
    // the shine: a bright, broken band across the crown, the anime way
    const hl = L(); const shine = mixRgb(hexRgb(hc), [255, 250, 240], 0.5), shine2 = mixRgb(hexRgb(hc), [255, 250, 240], 0.25);
    if (hs !== 'balding') for (let x = cx - 6; x <= cx + 4; x++) { const y = top + 2 + Math.round(Math.pow((x - cx + 1) / 4.5, 2) * 1.5) - (side ? 0 : 0); if ((x + 7) % 4 === 3) continue; if (layerHas(hr, x - (side ? 1 : 0), y) && !hr.edge[y * FW + x - (side ? 1 : 0)]) { setPx(hl, x - (side ? 1 : 0), y, shine); if (layerHas(hr, x, y + 1)) setPx(hl, x - (side ? 1 : 0), y + 1, shine2); } }
  }
  // --- hats ---
  if (spec.hat) {
    const ht = L(), hc = spec.hatColor || '3b6fc4', top = hy;
    if (spec.hat === 'wizard') { for (let y = 0; y < 11; y++) { const w = Math.round(2 + y * 1.1); rectL(ht, cx - w / 2 + (side ? 1 : 0) + (y < 3 ? 2 : 0), top - 10 + y, w, 1, hc); } rectL(ht, cx - B.hrx - 3, top + 1, B.hrx * 2 + 6, 2, hc); setPx(ht, cx + 2, top - 9, 'e3b93c'); }
    else if (spec.hat === 'straw') { rectL(ht, cx - B.hrx - 4, top + 2, B.hrx * 2 + 8, 2, hc); ellL(ht, cx, top + 1, B.hrx - 1, 3, hc); }
    else if (spec.hat === 'helm') { ellL(ht, cx, top + 3, B.hrx + 1, 4.5, hc); rectL(ht, cx - B.hrx - 1, top + 4, B.hrx * 2 + 2, 2, shadeHex(hc, 0.8)); if (!side && !back) rectL(ht, cx - 0.5, top + 5, 1, 4, shadeHex(hc, 0.75)); }
    else if (spec.hat === 'crown') { rectL(ht, cx - 5, top + 1, 10, 3, spec.hatColor || 'e3b93c'); for (const x of [cx - 5, cx - 1, cx + 3]) rectL(ht, x, top - 2, 2, 3, spec.hatColor || 'e3b93c'); setPx(ht, cx, top + 2, 'b9343c'); }
    else if (spec.hat === 'cap') { ellL(ht, cx, top + 2, B.hrx, 3, hc); if (!back) rectL(ht, side ? cx + 2 : cx - 4, top + 4, side ? 6 : 8, 1, shadeHex(hc, 0.8)); }
    else if (spec.hat === 'kerchief' || spec.hat === 'hood') {
      ellL(ht, cx, hcy - 1, B.hrx + 1, B.hry, hc);
      if (!back) for (let y = top + 4; y < hcy + B.hry + 2; y++) for (let x = cx - B.hrx + 1 + (side ? 2 : 0); x <= cx + B.hrx - 1 + (side ? 2 : 0); x++) clearPx(ht, x, y);
      if (spec.hat === 'hood') rectL(ht, cx - B.hrx - 1, hcy + 2, B.hrx * 2 + 2, 5, hc);
    }
    finish(ht);
  }
  // --- masks and face coverings, worn over the face ---
  if (spec.mask && !back) {
    const mk = L(), eY = hcy + 1, m = spec.mask, fx = side ? cx + B.hrx - 2 : cx;
    if (m === 'closed') {
      // a steel visor over the whole face, a dark slit at the eyes, breathing holes below
      if (side) { rectL(mk, cx - 1, hcy - 4, B.hrx + 2, B.hry + 4, spec.maskColor || '9aa5b0'); rectL(mk, cx + 2, eY, B.hrx - 1, 1, '1a1418'); for (let y = eY + 3; y < eY + 6; y += 2) setPx(mk, cx + B.hrx - 1, y, '3a3a40'); }
      else { rectL(mk, cx - B.hrx + 1, hcy - 4, B.hrx * 2 - 2, B.hry + 4, spec.maskColor || '9aa5b0'); rectL(mk, cx - B.hrx + 2, eY, B.hrx * 2 - 4, 1, '1a1418'); rectL(mk, cx - 0.5, hcy - 4, 1, B.hry + 4, shadeHex(spec.maskColor || '9aa5b0', 0.8)); for (const x of [cx - 3, cx - 1, cx + 1, cx + 3]) setPx(mk, x, eY + 4, '3a3a40'); }
    } else if (m === 'scarf') {
      // a cloth wrapped over nose and mouth
      if (side) rectL(mk, cx - 1, eY + 2, B.hrx + 2, B.hry - 2, spec.maskColor || '5a4a3a');
      else { rectL(mk, cx - B.hrx + 1, eY + 2, B.hrx * 2 - 2, B.hry - 2, spec.maskColor || '5a4a3a'); for (let x = cx - B.hrx + 2; x < cx + B.hrx - 2; x += 3) setPx(mk, x, eY + 4, shadeHex(spec.maskColor || '5a4a3a', 0.75)); }
    } else if (m === 'ritual') {
      // a carved wooden face with a painted sun: eye holes, a calm mouth
      const wood = 'b08a5a';
      if (side) { ellL(mk, cx + B.hrx - 2, hcy, 3, B.hry - 1, wood); setPx(mk, cx + B.hrx - 2, eY, '1a1418'); }
      else { ellL(mk, cx, hcy + 0.5, B.hrx - 0.5, B.hry - 0.5, wood); for (const x of [cx - 3, cx + 2]) rectL(mk, x, eY, 2, 1, '1a1418'); rectL(mk, cx - 1, eY + 4, 2, 1, '6a4a2a'); for (const [dx, dy] of [[0, -4], [-1, -3], [1, -3], [0, -5]]) setPx(mk, cx - 0.5 + dx, eY + dy, 'e3b93c'); for (const x of [cx - 4, cx + 3]) setPx(mk, x, eY + 2, 'b9343c'); }
    } else if (m === 'plague') {
      // dark leather, round glass eyes, a long curved beak
      if (side) { rectL(mk, cx - 1, hcy - 3, B.hrx + 1, B.hry + 2, '3a3036'); setPx(mk, cx + B.hrx - 2, eY, 'c8d8e0'); for (let k = 0; k < 6; k++) rectL(mk, cx + B.hrx - 1 + k, eY + 2 + Math.floor(k / 2), 1, 3 - Math.floor(k / 3), '4a3e44'); }
      else { rectL(mk, cx - B.hrx + 1, hcy - 3, B.hrx * 2 - 2, B.hry + 2, '3a3036'); for (const x of [cx - 3, cx + 2]) { ellL(mk, x + 0.5, eY, 1.3, 1.3, 'c8d8e0'); setPx(mk, x, eY - 1, 'ffffff'); } for (let k = 0; k < 6; k++) rectL(mk, cx - 1 + (k > 3 ? 0.5 : 0), eY + 2 + k, 2 - (k > 3 ? 1 : 0), 1, '4a3e44'); }
    } else if (m === 'wolf') {
      // a wolf's skull worn as a mask: pale bone, dark sockets, teeth over the brow of the wearer's own face
      const bone = 'e8e0cc';
      if (side) { rectL(mk, cx - 1, hcy - 4, B.hrx + 3, 6, bone); setPx(mk, cx + B.hrx - 1, eY - 1, '1a1418'); for (let x = cx + 1; x < cx + B.hrx + 2; x += 2) setPx(mk, x, hcy + 2, '1a1418'); }
      else { ellL(mk, cx, hcy - 2, B.hrx + 0.5, 5, bone); for (const x of [cx - 3, cx + 2]) rectL(mk, x, eY - 1, 2, 2, '1a1418'); setPx(mk, cx - 0.5, eY + 1, '8a7a6a'); for (let x = cx - 3; x <= cx + 2; x += 1) setPx(mk, x, eY + 3, x % 2 ? '1a1418' : bone); for (const s2 of [-1, 1]) { setPx(mk, cx + s2 * (B.hrx + 1), hcy - 6, bone); setPx(mk, cx + s2 * B.hrx, hcy - 5, bone); } }
    }
    finish(mk);
  }
  // --- things held: weapon or tool on the right, light or shield on the left ---
  const hold = L(), hx0 = side ? cx + ss.nh[0] : cx + B.tw / 2 + 2 + fs.rh[0], hy0 = handY + (side ? ss.nh[1] : fs.rh[1]);
  const lhx0 = cx - B.tw / 2 - 2 + fs.lh[0], lhy0 = handY + fs.lh[1];
  // Things are held in a fist: the item is angled away from the body (dir: +1 outward to the right, −1 to the
  // left), its grip runs through the hand, and the fingers close over it, so a handle shows above and below.
  const drawHeld = (item, x, y, dir, fist = true, swing = 0) => {
    const at = (t, ang) => { ang += swing; return [x + Math.sin(ang) * t * dir, y - Math.cos(ang) * t]; };
    const stick = (t0, t1, ang, w, col, hi) => {
      const [ax, ay] = at(t0, ang), [bx, by] = at(t1, ang); limbL(hold, ax, ay, bx, by, w, col);
      if (hi) { const [cx2, cy2] = at((t0 + t1) / 2, ang); setPx(hold, cx2 - dir * 0.5, cy2, hi); setPx(hold, cx2 - dir * 0.5, cy2 - 2, hi); }
    };
    const WOOD = '6b4423', WOODL = '9a6a3a', STEEL = 'c9d1d8', STEELD = '8a949e';
    if (item === 'spear' || item === 'staff') {
      const ang = 0.1; stick(-7, 24, ang, 1.6, WOOD, WOODL);
      const [tx, ty] = at(26, ang);
      if (item === 'spear') { ellL(hold, tx, ty, 1.4, 3, STEEL); setPx(hold, tx, ty - 3, 'eef2f5'); rectL(hold, tx - 1, ty + 2, 3, 1, STEELD); }
      else { ellL(hold, tx, ty, 2.5, 2.5, spec.staffGem || '9cc0f5'); setPx(hold, tx - 1, ty - 1, 'e6f2ff'); }
    } else if (item === 'mace') {
      const ang = 0.55; stick(-3, 9, ang, 1.6, WOOD, WOODL);
      const [mx, my] = at(11.5, ang); ellL(hold, mx, my, 2.8, 2.8, '9aa5b0'); setPx(hold, mx - 1, my - 1, 'dfe6ec');
      for (const [ddx, ddy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) setPx(hold, mx + ddx, my + ddy, '7a848e');
    } else if (item === 'sword') {
      const ang = 0.45; stick(-2.5, 0.5, ang, 1.4, '5a3a20');
      const [gx, gy] = at(1.5, ang); limbL(hold, gx - 2.4 * Math.cos(ang), gy - 2.4 * Math.sin(ang) * dir, gx + 2.4 * Math.cos(ang), gy + 2.4 * Math.sin(ang) * dir, 1.2, 'c8a03a');
      stick(2.5, 15, ang, 1.7, STEEL); const [ex, ey] = at(9, ang); setPx(hold, ex + dir, ey, 'eef2f5');
      const [px2, py2] = at(-3.5, ang); setPx(hold, px2, py2, 'c8a03a');
    } else if (item === 'axe') {
      const ang = 0.5; stick(-3, 11, ang, 1.6, WOOD, WOODL);
      const [hx, hy] = at(9.5, ang); rectL(hold, hx + (dir > 0 ? 0 : -4), hy - 3, 4, 5, 'b8c0c8'); rectL(hold, hx + (dir > 0 ? 3 : -4), hy - 3, 1, 5, 'e6ecf0');
    } else if (item === 'dagger') {
      const ang = 0.6; stick(-1.5, 0.5, ang, 1.2, '5a3a20'); stick(1.5, 6.5, ang, 1.3, STEEL);
    } else if (item === 'hammer') {
      // carried at the side, head down
      limbL(hold, x, y - 3, x + dir, y + 8, 1.6, WOOD); rectL(hold, x + dir - 3, y + 8, 7, 3, '6a7078'); setPx(hold, x + dir - 3, y + 8, '9aa5b0');
    } else if (item === 'lantern') {
      setPx(hold, x, y + 1, '3a3a40'); setPx(hold, x, y + 2, '3a3a40');
      rectL(hold, x - 2, y + 3, 5, 1, '3a3a40'); rectL(hold, x - 2, y + 4, 5, 5, '4a4f58'); rectL(hold, x - 1, y + 5, 3, 3, 'ffd27a'); setPx(hold, x, y + 6, 'fff6c8'); rectL(hold, x - 2, y + 9, 5, 1, '3a3a40');
    } else if (item === 'torch') {
      const ang = 0.4; stick(-3, 7, ang, 1.6, WOOD, WOODL);
      const [wx, wy] = at(7.5, ang); ellL(hold, wx, wy, 1.6, 1.2, 'b89a6a');
      const [fx, fy] = at(10.5, ang); ellL(hold, fx, fy, 2.4, 3, 'e8622a'); ellL(hold, fx, fy + 0.5, 1.6, 2, 'f6a43a'); ellL(hold, fx, fy + 1, 0.8, 1.2, 'fff1b0'); setPx(hold, fx + dir * 0.5, fy - 3.5, 'f6a43a');
    } else if (item === 'basket') { rectL(hold, x - 3, y + 1, 7, 5, 'b8923f'); rectL(hold, x - 3, y + 1, 7, 1, 'd8b06a'); for (let k = -3; k <= 3; k += 2) setPx(hold, x + k, y + 3, '8a6a2a'); fist = false; }
    else if (item === 'book') { rectL(hold, x - 2, y - 2, 5, 6, spec.bookColor || '7b4bb5'); rectL(hold, x - 2, y - 2, 1, 6, 'e8e1c8'); fist = false; }
    else if (item === 'shield') { ellL(hold, x, y - 3, 4, 5, spec.shieldColor || '9aa5b0'); ellL(hold, x, y - 3, 1.5, 1.5, 'e3b93c'); fist = false; }
    else if (item === 'bomb') { ellL(hold, x, y + 1, 3, 3, '2a2a32'); setPx(hold, x - 1, y, '5a5a6a'); limbL(hold, x + 1, y - 2, x + 2, y - 4, 1, 'b8923f'); setPx(hold, x + 3, y - 5, 'ffd27a'); fist = false; }
    else if (item === 'tube') { limbL(hold, x - 1, y, x + 9, y - 6, 1.4, '8a7a4a'); }
    else if (item === 'rod') { stick(-2, 20, 0.35, 1.2, WOOD); }
    else if (item === 'crossbow') {
      // held level at the hip: the stock, the steel bow across its nose, the string drawn back
      limbL(hold, x - dir * 3, y + 1, x + dir * 9, y - 1, 1.6, WOOD); setPx(hold, x + dir * 2, y, WOODL);
      for (let t = -5; t <= 5; t++) setPx(hold, x + dir * (9 - Math.round(t * t / 10)), y - 1 + t, STEEL);
      limbL(hold, x + dir * 5, y - 6, x + dir * 6, y + 4, 0.6, 'e8e1c8'); fist = true;
    } else if (item === 'warhammer') {
      const ang = 0.35; stick(-6, 16, ang, 1.6, WOOD, WOODL);
      const [hx, hy] = at(17, ang); rectL(hold, hx - 4, hy - 2, 8, 4, '8a949e'); rectL(hold, hx - 4, hy - 2, 8, 1, 'c9d1d8'); setPx(hold, hx + dir * 5, hy, '6a7078');
    } else if (item === 'flail') {
      const ang = 0.5; stick(-2, 6, ang, 1.5, WOOD, WOODL);
      const [cx3, cy3] = at(7, ang); for (let k = 0; k < 4; k++) setPx(hold, cx3 + dir * (k * 0.8), cy3 + k, '6a7078');
      const bx = cx3 + dir * 3, by = cy3 + 5; ellL(hold, bx, by, 2.3, 2.3, '8a949e'); setPx(hold, bx - 1, by - 1, 'c9d1d8');
      for (const [ddx, ddy] of [[-3, 0], [3, 0], [0, 3], [0, -3]]) setPx(hold, bx + ddx, by + ddy, '5a6068');
    } else if (item === 'greatsword') {
      const ang = 0.3; stick(-4, 1, ang, 1.4, '5a3a20');
      const [gx, gy] = at(1.5, ang); limbL(hold, gx - 3.4, gy, gx + 3.4, gy, 1.2, 'c8a03a');
      stick(2.5, 22, ang, 2.1, STEEL); const [ex, ey] = at(12, ang); setPx(hold, ex + dir, ey, 'eef2f5');
    } else if (item === 'rapier') {
      const ang = 0.5; stick(-2, 0.5, ang, 1.1, '3a2a20');
      const [gx, gy] = at(1, ang); ellL(hold, gx, gy, 1.8, 1.4, 'c8a03a');
      stick(2, 16, ang, 0.8, 'dfe6ec');
    } else if (item === 'halberd') {
      const ang = 0.1; stick(-7, 26, ang, 1.5, WOOD, WOODL);
      const [tx, ty] = at(27, ang); ellL(hold, tx, ty - 1, 1, 2.5, STEEL);
      const [ax, ay] = at(23, ang); rectL(hold, ax + (dir > 0 ? 0 : -4), ay - 2, 4, 5, 'b8c0c8'); rectL(hold, ax + (dir > 0 ? 3 : -4), ay - 2, 1, 5, 'e6ecf0'); setPx(hold, ax - dir * 2, ay, '8a949e');
    } else if (item === 'bow') { for (let t = -8; t <= 8; t++) setPx(hold, x + dir * (2 - Math.round(t * t / 22)), y - 2 + t, WOOD); for (let t = -8; t <= 8; t++) setPx(hold, x + dir * 2, y - 2 + t, 'e8e1c8'); }
    // the fist, closed over the grip
    if (fist) { ellL(hold, x, y, 2.1, 2.1, skin); setPx(hold, x - dir, y + 1, skinD); setPx(hold, x, y + 1, skinD); setPx(hold, x + dir, y - 1, shadeHex(skin, 1.06)); }
  };
  if (!back) {
    if (spec.held) drawHeld(spec.held, hx0, hy0, 1, true, PZ && PZ.ang || 0);
    if (spec.offhand && !side) drawHeld(spec.offhand, lhx0, lhy0, -1);
  }
  finish(hold);
  // back view: held things show behind the body, so draw them first
  if (back && (spec.held || spec.offhand)) {
    const bh = newLayer(); const saved = hold.d; // reuse the drawing code into a back layer
    const tmp = hold; tmp.d = bh.d;
    if (spec.held) drawHeld(spec.held, cx - B.tw / 2 - 2, handY, -1, false);
    if (spec.offhand) drawHeld(spec.offhand, cx + B.tw / 2 + 2, handY, 1, false);
    finish(tmp); layers.splice(layers.indexOf(tmp), 1); layers.unshift(tmp); void saved;
  }
  for (const l of layers) stack(out, l);
  // cloth: a band of form shadow along the edge turned from the light, a woven grain, and creases
  {
    const sk = hexRgb(skin), isSkin = i => Math.abs(out.d[i] - sk[0]) + Math.abs(out.d[i + 1] - sk[1]) + Math.abs(out.d[i + 2] - sk[2]) < 60;
    const C = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && out.cloth[y * FW + x] && out.d[(y * FW + x) * 4 + 3] && !out.edge[y * FW + x];
    const src = new Uint8ClampedArray(out.d);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (!C(x, y)) continue; const i = (y * FW + x) * 4; if (isSkin(i)) continue;
      let f = 1;
      if (!C(x + 1, y)) f = 0.8; else if (!C(x + 2, y)) f = 0.88; else if (!C(x + 3, y)) f = 0.95;   // turning away from the light
      if (!C(x, y + 1)) f *= 0.9;                                                                       // the underside of a fold or hem
      if (!C(x - 1, y) && C(x + 1, y)) f *= 1.1;                                                        // the lit edge
      if ((x * 3 + y * 5) % 7 === 0) f *= 0.92; else if ((x + y * 3) % 11 === 0) f *= 1.07;            // the weave
      if (!side && (x === cx - 3 || x === cx + 2) && y % 4 !== 0 && C(x - 1, y) && C(x + 1, y)) f *= 0.93; // creases
      out.d[i] = Math.min(255, src[i] * f); out.d[i + 1] = Math.min(255, src[i + 1] * f * 0.99); out.d[i + 2] = Math.min(255, src[i + 2] * f * (f < 1 ? 1.04 : 1));
    }
  }
  // a fur collar across the shoulders, ragged at the edges
  if (spec.fur && !side) { const fy = up(B.torsoTop) - 1, furC = hexRgb(spec.fur === 1 ? 'd8d0c4' : spec.fur); for (let x = cx - B.tw / 2 - 1; x <= cx + B.tw / 2; x++) for (let y = fy; y < fy + 3; y++) { if (y === fy + 2 && (x * 3) % 4 === 0) continue; if (y === fy && (x * 5) % 3 === 0) continue; const i = (y * FW + x) * 4; out.d[i] = furC[0] * (x > cx + 2 ? 0.82 : (x + y) % 3 === 0 ? 0.9 : 1); out.d[i + 1] = furC[1] * (x > cx + 2 ? 0.82 : (x + y) % 3 === 0 ? 0.9 : 1); out.d[i + 2] = furC[2] * (x > cx + 2 ? 0.86 : 1); out.d[i + 3] = 255; out.edge[y * FW + x] = 0; } }
  selout(out);
  // one shared, earthy palette: every color is pulled a little toward a warm grey, so nothing shouts
  if (false) for (let i = 0; i < out.d.length; i += 4) { if (!out.d[i + 3]) continue; const px = (i >> 2) % FW, py = (i >> 2) / FW | 0; if (layerHas(fc, px, py) || layerHas(hd, px, py)) continue; const l = out.d[i] * 0.3 + out.d[i + 1] * 0.59 + out.d[i + 2] * 0.11; out.d[i] = out.d[i] * 0.88 + (l + 6) * 0.12; out.d[i + 1] = out.d[i + 1] * 0.88 + (l + 2) * 0.12; out.d[i + 2] = out.d[i + 2] * 0.88 + (l - 6) * 0.12; }
  // into a canvas, mirrored for left-facing
  const c = document.createElement('canvas'); c.width = FW; c.height = FH;
  const g = c.getContext('2d'); const img = g.createImageData(FW, FH); img.data.set(out.d); g.putImageData(img, 0, 0);
  return c;
}
function shadeHex(h, f) { const [r, g, b] = hexRgb(h); const cl = v => Math.max(0, Math.min(255, Math.round(v))); return [cl(r * f), cl(g * f), cl(b * f)].map(v => v.toString(16).padStart(2, '0')).join(''); }

const FIG_CACHE = new Map();
// a person, facing a way, in a pose; cached
function figure(spec, facing = 'down', pose = 'idle0') {
  const hd = typeof HD_ON !== 'undefined' && HD_ON && !spec.race;
  const key = JSON.stringify(spec) + '|' + facing + '|' + pose + (hd ? '|hd' : '') + '|' + FACE_STYLE;
  let c = FIG_CACHE.get(key);
  if (c) return c;
  if (facing === 'left') {
    const r = figure(spec, 'right', pose);
    c = document.createElement('canvas'); c.width = r.width; c.height = r.height;
    const g = c.getContext('2d'); g.translate(r.width, 0); g.scale(-1, 1); g.drawImage(r, 0, 0);
    if (r.hd) c.hd = 1;
  } else c = hd ? drawFigurePX(spec, facing, pose) : drawFigure(spec, facing, pose);
  c.spec = spec;
  FIG_CACHE.set(key, c);
  return c;
}

// ---------------- the people of Brambleford ----------------
const FIG_SPECS = {
  wendell:  { build: 'stout', skin: 'eab38b', hair: 'short', hairColor: '7a4a22', beard: 'mutton', shirt: '9c7a4a', torso: 'apron', under: '9c7a4a', apronColor: 'efe6d2', pants: '5a4a3a' },
  bran:     { build: 'broad', gloves: '5a3a20',  skin: 'd9a070', hair: 'balding', hairColor: '2a1a10', beard: 'full', shirt: '5a5a5a', torso: 'apron', under: '7a5a3a', apronColor: '6e4421', pants: '3a3428', held: 'hammer', heavyBrow: 1 },
  hilde:    { build: 'adult', gloves: '6b4423', fur: 1,  skin: 'eab38b', hair: 'braid', hairColor: 'e0c060', shirt: 'a3adb8', armor: 'mail', pants: '46506e', jaw: 'soft', lashes: 1 },
  odessa:   { build: 'adult', skin: 'c48862', hat: 'kerchief', hatColor: '7b4bb5', hair: 'long', hairColor: '2a1a10', shirt: '7b4bb5', torso: 'dress', necklace: 1, jaw: 'soft', lashes: 1 },
  mirela:   { build: 'slim', skin: 'f6d0ac', hair: 'long', hairColor: 'e8e8f0', shirt: '3f8f7a', torso: 'gown', jaw: 'soft', lashes: 1, eyes: '3f8f7a' },
  aldous:   { build: 'slim', skin: 'eab38b', hair: 'long', hairColor: 'e8e8e8', beard: 'long', hat: 'wizard', hatColor: '3b6fc4', shirt: '3b6fc4', torso: 'robe', held: 'staff', wrinkles: 1 },
  tamsin:   { build: 'slim', skin: 'eab38b', hair: 'bun', hairColor: 'b8b8b8', shirt: '3f6b22', torso: 'dress', apron: 1, wrinkles: 1, held: 'basket', jaw: 'soft', lashes: 1 },
  rolf:     { build: 'stout', skin: 'eab38b', hair: 'balding', hairColor: 'a0a0a0', beard: 'handlebar', shirt: 'b9343c', torso: 'apron', under: 'b9343c', pants: '5a4a3a' },
  mortimer: { build: 'slim', skin: 'eab38b', hair: 'balding', hairColor: 'c8c8c8', shirt: 'd8cfb8', torso: 'coat', coatColor: '23305e', pants: '23305e', held: 'book', bookColor: '6e4421', wrinkles: 1 },
  voss:     { build: 'adult', fur: '2a2430',  skin: 'eab38b', hair: 'short', hairColor: '1b1424', shirt: 'd8cfb8', torso: 'coat', coatColor: '1f1f2a', pants: '151520', boots: '151520', necklace: 1, heavyBrow: 1 },
  berta:    { build: 'slim', skin: 'eab38b', hat: 'kerchief', hatColor: '8a5a7a', hair: 'bun', hairColor: 'd8d8d8', shirt: '8a5a7a', torso: 'dress', wrinkles: 1, jaw: 'soft', held: 'basket' },
  girl:     { build: 'child', skin: 'f6d0ac', hair: 'ponytail', hairColor: 'c9784a', shirt: 'e07b2c', torso: 'dress', jaw: 'soft', blush: 1 },
  farmer:   { build: 'adult', skin: 'd9a070', hat: 'straw', hatColor: 'd4ad55', hair: 'short', hairColor: '7a4a22', shirt: '6e8a3a', torso: 'vest', vest: '7a5a3a', under: '6e8a3a', pants: '5a4a3a', stubble: 1 },
  guard:    { build: 'adult', gloves: '5a3a20', fur: '8a7a6a',  skin: 'eab38b', hat: 'helm', hatColor: '9aa5b0', hair: 'short', hairColor: '6e3f1f', shirt: 'a3adb8', armor: 'mail', tabard: 'b9343c', pants: '46506e', held: 'spear' },
  baker:    { build: 'stout', skin: 'eab38b', hat: 'kerchief', hatColor: 'efe6d2', hair: 'bun', hairColor: 'd8b080', shirt: 'c9784a', torso: 'dress', apron: 1, jaw: 'soft', lashes: 1, blush: 1, held: 'basket' },
  merchant: { build: 'stout', skin: 'c48862', hair: 'curly', hairColor: '2a1a10', shirt: 'b9343c', torso: 'dress', skirt: '8a1f2a', necklace: 1, jaw: 'soft', lashes: 1 },
  villager1:{ build: 'adult', skin: 'eab38b', hair: 'short', hairColor: 'c9784a', shirt: '3b6fc4', torso: 'apron', under: '3b6fc4', apronColor: '8f5d2c', pants: '5a4a3a', stubble: 1, held: 'hammer' },
  villager2:{ build: 'slim', skin: 'eab38b', hair: 'bun', hairColor: 'e0c060', shirt: '8a5a7a', torso: 'dress', jaw: 'soft', lashes: 1, held: 'basket' },
  villager3:{ build: 'adult', skin: 'c48862', hat: 'cap', hatColor: '3a4a5a', hair: 'short', hairColor: '6a6a6a', beard: 'chinstrap', beardColor: '7a7a7a', shirt: '6e8a3a', torso: 'vest', vest: '3a4a5a', under: '6e8a3a', pants: '46506e', held: 'rod', wrinkles: 1 },
  priest:   { build: 'adult', skin: 'eab38b', hair: 'balding', hairColor: 'c8c8c8', shirt: '7a5a3a', torso: 'robe', belt: 'e8e1c8', held: 'book', bookColor: '7d2027' },
  elsbeth:  { build: 'slim', skin: 'f6d0ac', hair: 'bun', hairColor: 'b89a6a', shirt: '8a8f98', torso: 'gown', jaw: 'soft', lashes: 1 },
};
// the hero: the look chosen at the start, dressed in whatever is equipped
const HAIR_MAP = ['crop', 'long', 'ponytail', 'curly', 'mohawk', 'bald'];
function heroSpec(equip = {}, L = {}) {
  const sk = LOOK.skin[L.skin || 0];
  const s = { build: 'adult', skin: sk[0], skinShade: sk[1], hair: HAIR_MAP[L.hair || 0], hairColor: LOOK.hairColor[L.hairColor || 0], shirt: LOOK.shirt[L.shirt || 0], pants: LOOK.pants[L.pants || 0], boots: LOOK.boots[L.boots || 0], heavyBrow: 1, stubble: L.face ? 0 : 1 };
  // facial hair: 0 stubble, 1 full beard, 2 moustache, 3 clean-shaven, then the trims
  s.stubble = (L.face || 0) === 0 ? 1 : 0;
  const FACE_STYLES = [null, 'full', 'handlebar', null, 'short', 'goatee', 'chinstrap', 'mutton', 'long', 'braided'];
  if (FACE_STYLES[L.face || 0]) s.beard = FACE_STYLES[L.face || 0];
  if (L.hair === 5) s.stubble = 1;
  const it = k => equip[k] && ITEMS[equip[k].id];
  const a = it('armor'), helm = it('helm'), sh = it('shield'), w = it('weapon'), b = it('boots');
  s.sleeve = s.shirt;
  if (a) {
    const pal = gearPal(equip.armor);
    if (a.cls === 'robe') { s.torso = 'robe'; s.shirt = pal[1] || 'd8cfb8'; s.sleeve = s.shirt; }
    else if (a.cls === 'leather') { s.armor = 'leather'; s.shirt = pal[1] || '8f5d2c'; }
    else if (a.cls === 'mail') { s.armor = 'mail'; s.shirt = pal[1] || 'b8bfc6'; s.sleeve = shadeHex(s.shirt, 0.9); }
    else if (a.cls === 'plate') { s.armor = 'plate'; s.shirt = pal[1] || 'dfe6ec'; s.sleeve = shadeHex(s.shirt, 0.85); }
  }
  if (!a || a.cls === 'leather') s.tabard = 'efe6d2';
  s.strap = 1;
  if (helm) { const pal = gearPal(equip.helm); s.hat = helm.grade === 'iron' ? 'cap' : 'helm'; s.hatColor = helm.grade === 'iron' ? '8f5d2c' : pal.M || '9aa5b0'; }
  if (b && b.grade !== 'iron') s.boots = (GRADE_PAL[b.grade] || GRADE_PAL.iron).n;
  if (w) s.held = w.cls;
  if (sh) { s.offhand = 'shield'; s.shieldColor = gearPal(equip.shield).M || '9aa5b0'; }
  else if (equip.light) s.offhand = equip.light.id === 'lantern' ? 'lantern' : 'torch';
  return s;
}

// ---------------- the folk under the mountain ----------------
const GOB = { race: 'goblin', build: 'short', skin: '6aa33c', eyes: 'e3c43a', pants: '6aa33c', boots: '4a3a2a', jaw: 'soft' };
const RAT = { race: 'ratkin', build: 'adult', skin: '8a7262', muzzle: 'b09a88', eyes: 'e5484d', pants: '8a7262', boots: '6e5a4a', jaw: 'soft' };
const HOL = { race: 'hollow', build: 'slim', hunch: 1, skin: 'd4d8e2', eyes: 'c8f0ff', shirt: '6a7088', pants: '8a90a8', boots: '6a7088', jaw: 'soft' };
const SER = { race: 'serpent', build: 'adult', skin: '3f8f7a', eyes: 'e3c43a', jaw: 'soft' };
const MON_FIG = {
  skeleton:   { race: 'skeleton', build: 'slim', skin: 'e8e0cc', shirt: 'e8e0cc', sleeve: 'e8e0cc', pants: 'e8e0cc', boots: 'd8d0bc', held: 'spear', eyes: '2a2226' },
  g_scrapper: { ...GOB, shirt: '7a5a3a', held: 'dagger' },
  g_slinger:  { ...GOB, shirt: '8a6a3a', hat: 'hood', hatColor: 'b9343c', held: 'bow' },
  g_sapper:   { ...GOB, shirt: '6e4421', hat: 'cap', hatColor: '6e4421', held: 'bomb' },
  g_shaman:   { ...GOB, torso: 'robe', shirt: '7b4bb5', held: 'staff', staffGem: 'ff4a3d', necklace: 1 },
  g_hob:      { ...GOB, build: 'huge', skin: '8a8a3a', pants: '5a5a22', shirt: '6e4421', held: 'axe' },
  grotsnag:   { ...GOB, build: 'adult', skin: '4f8a2a', pants: '4f8a2a', torso: 'coat', coatColor: 'b9343c', shirt: '6e4421', hat: 'crown', held: 'axe' },
  r_skulker:  { ...RAT, shirt: '23305e', hat: 'hood', hatColor: '23305e', held: 'dagger' },
  r_blowgun:  { ...RAT, shirt: '5a4a3a', held: 'tube' },
  r_plague:   { ...RAT, skin: '9a8a6a', pants: '9a8a6a', shirt: '5f7040', torso: 'robe' },
  r_warlock:  { ...RAT, torso: 'robe', shirt: '5a3290', held: 'staff', staffGem: 'b48ee0' },
  r_ogre:     { ...RAT, build: 'huge', shirt: '5a4a3a' },
  vesk:       { ...RAT, skin: 'cdbfb0', pants: 'cdbfb0', muzzle: 'e8dccc', eyes: 'ffd23f', torso: 'coat', coatColor: 'b9343c', shirt: 'b9343c', hat: 'crown' },
  h_stalker:  { ...HOL, held: 'dagger' },
  h_fisher:   { ...HOL, held: 'spear' },
  h_seer:     { ...HOL, torso: 'robe', shirt: '6a5aa0', held: 'staff', staffGem: 'c8f0ff' },
  h_thrall:   { ...HOL, eyes: 'ff4a3d', shirt: '5a5a5a', pants: '5a5a5a' },
  matriarch:  { ...HOL, hunch: 0, torso: 'robe', shirt: 'a090c0', hat: 'crown', hatColor: 'e8e0cc', held: 'staff', staffGem: 'ffffff' },
  s_warrior:  { ...SER, shirt: 'b8bfc6', armor: 'mail', held: 'spear' },
  s_spitter:  { ...SER, skin: '6fae4a', shirt: '3f7a2a' },
  s_guard:    { ...SER, shirt: 'e3b93c', armor: 'mail', hat: 'helm', hatColor: 'e3b93c', held: 'spear', offhand: 'shield', shieldColor: 'e3b93c' },
  s_priest:   { ...SER, torso: 'robe', shirt: '3faa4a', held: 'staff', staffGem: 'a6e39a' },
  hierophant: { ...SER, skin: '2f6f5a', torso: 'robe', shirt: 'b9343c', hat: 'crown', held: 'staff', staffGem: 'f08a8f' },
};
