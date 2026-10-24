// The Temple Warden — front gardens. Instead of wildflowers sprinkled at random across the town, each house and shop
// has its planting along the front wall: clipped shrubs at the corners and timber-edged beds of flowers between,
// the doorway always left clear.
'use strict';

const BED_PALS = [['#d6336c', '#f2c94c', '#f4f0e6'], ['#9a7ce0', '#f4f0e6', '#e7779b'], ['#e8862e', '#f2c94c', '#d6336c'], ['#7fb6e0', '#f4f0e6', '#9a7ce0']];
Object.assign(NATIVE_PROPS, {
  shrub: () => nativeProp(32, 28, ({ E, P, F }) => {
    E(16, 25, 12, 3, 'rgba(0,0,0,0)');
    E(16, 17, 12, 10, '#2f5a24'); E(15, 15, 11, 9, '#3e6e2c'); E(13, 12, 8, 6, '#4f8236'); E(11, 10, 4, 3, '#66994a');
    for (let i = 0; i < 26; i++) { const x = 6 + (i * 7) % 20, y = 9 + (i * 5) % 15; P(x, y, i % 3 ? '#2a4f1f' : '#82b25c'); }
    F(9, 26, 14, 2, '#3a2a1a');
  }),
  ...Object.fromEntries(BED_PALS.map((pal, k) => ['flowerbed' + k, () => nativeProp(32, 22, ({ F, P }) => {
    F(1, 10, 30, 10, '#4a3020'); F(2, 11, 28, 8, '#5e3c26'); // timber edging round dark soil
    F(1, 10, 30, 1, '#7a5230'); F(1, 19, 30, 1, '#3a2414');
    for (let x = 3; x < 30; x += 3) {
      const h = 5 + (x * 7 + k) % 4, c = pal[(x / 3 + k) % 3 | 0];
      F(x, 13 - h + 4, 1, h, '#3f7a2a'); P(x + 1, 14 - h / 2 + 2, '#4f8a2e');
      F(x - 1, 12 - h + 3, 3, 2, c); P(x, 11 - h + 3, c); P(x, 12 - h + 3, '#fff1b0');
    }
  })])),
});
for (const k of ['shrub', 'flowerbed0', 'flowerbed1', 'flowerbed2', 'flowerbed3']) DECOR_BLOCK[k] = 1;

function plantTown(m) {
  if (!m || m.id !== 'town' || m.planted >= 1) return;
  m.planted = 1;
  // the wildflowers sprinkled about go back to plain grass, and the odd clumps planted at random come up
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (m.t[y][x] === 'f') setTile(m, x, y, ',');
    if (m.decor[K(x, y)] === 'flowers') delete m.decor[K(x, y)];
  }
  const busy = (x, y) => m.decor[K(x, y)] || m.trig[K(x, y)] || m.links[K(x, y)] || m.npcs.some(n => n.x === x && n.y === y) || (m.ground || []).some(g => g.x === x && g.y === y);
  for (const lm of m.landmarks || []) {
    if (!lm.spec || ['barn', 'shed', 'butcher'].includes(lm.spec.kind)) continue;
    const y = lm.y + lm.h, door = lm.x + lm.spec.door, x0 = lm.x, x1 = lm.x + lm.w - 1;
    let k = (lm.x * 3 + lm.y) % BED_PALS.length;
    for (let x = x0; x <= x1; x++) {
      if (Math.abs(x - door) <= 1 || tileAt(m, x, y) !== ',' || busy(x, y)) continue;
      // keep a gap where a path runs up to the wall
      if (';:'.includes(tileAt(m, x, y + 1)) && ';:'.includes(tileAt(m, x - 1, y))) continue;
      const end = x === x0 || x === x1 || tileAt(m, x - 1, y) !== ',' || tileAt(m, x + 1, y) !== ',';
      m.decor[K(x, y)] = end ? 'shrub' : 'flowerbed' + k;
    }
  }
}
{
  const _goMap = goMap;
  goMap = function (id, x, y) { if (id === 'town' && S && S.maps.town) plantTown(S.maps.town); return _goMap(id, x, y); };
  const _buildTown = buildTown;
  buildTown = function () { const m = _buildTown(); plantTown(m); return m; };
}
// a save already standing in the town
setInterval(() => { if (S && S.maps && S.maps.town && !S.maps.town.planted) { plantTown(S.maps.town); if (S.mapId === 'town') render(); } }, 1000);

// ---------------- the temple hill: a sunlit plateau, the shadow at the foot of its wall, and the steps ----------------
let STEPS_C = null;
const WALL_C = [];
// a stretch of the retaining wall, two tiles tall: the plateau's grass lipping over the top, then rough fieldstones
// laid in uneven courses, lit from above and darkening toward the foot, with moss in the joints and the odd trail of ivy
function hillWallArt(v) {
  if (WALL_C[v]) return WALL_C[v];
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d');
  let s = v * 7919 + 13; const R = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  F(0, 0, 32, 64, '#3e3a34');
  for (let y = 7, row = 0; y < 62; row++) {
    const h = 7 + Math.floor(R() * 4);
    for (let x = -Math.floor(R() * 8); x < 32;) {
      const w = 8 + Math.floor(R() * 9), k = (y - 7) / 55, base = [0.92, 1, 1.08][Math.floor(R() * 3)];
      const col = (f) => { const c0 = [138, 128, 112].map(v => Math.round(v * base * (1.05 - k * 0.35) * f)); return `rgb(${c0})`; };
      F(x + 1, y + 1, w - 2, h - 2, col(1)); F(x + 1, y + 1, w - 2, 1, col(1.18)); F(x + 1, y + h - 2, w - 2, 1, col(0.78)); F(x + w - 2, y + 1, 1, h - 2, col(0.85));
      if (R() < 0.25) F(x + 1, y + h - 2, Math.min(w - 2, 4), 1, '#56703a');
      x += w;
    }
    y += h;
  }
  // ivy trailing down from the top, now and then
  if (v % 3 === 1) { let x = 6 + Math.floor(R() * 20); for (let y = 6; y < 20 + R() * 24; y++) { F(x, y, 2, 1, y % 3 ? '#3f6a2a' : '#5a8a36'); if (y % 4 === 0) x += R() < 0.5 ? -1 : 1; } }
  // the grass lip: the plateau's turf hanging over the edge, a dark shadow line under it
  F(0, 0, 32, 6, '#4f7a30'); F(0, 0, 32, 2, '#6a9a3e');
  for (let x = 0; x < 32; x += 2) F(x, 6, 1, 1 + Math.floor(R() * 3), '#4f7a30');
  F(0, 7, 32, 1, 'rgba(10,8,6,0.5)');
  // the foot: a little scree and shadow
  F(0, 61, 32, 3, '#2e2a26');
  return WALL_C[v] = c;
}
function stepsArt() {
  if (STEPS_C) return STEPS_C;
  // two tiles high: five stone steps climbing away from you, each tread lit, each riser in shade, worn in the middle
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d');
  const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 10;
    F(0, y, 32, 4, '#c9c2b4'); F(0, y, 32, 1, '#e2dccf'); F(10, y + 1, 12, 2, '#d6cfc0'); // tread, worn smooth in the middle
    F(0, y + 4, 32, 6, '#8e887c'); F(0, y + 9, 32, 1, '#6f6a60');                        // riser
    for (let x = (i % 2) * 6; x < 32; x += 12) F(x, y + 4, 1, 6, '#6f6a60');
  }
  return STEPS_C = c;
}
{
  const _dm = drawMeadow;
  drawMeadow = function (m, ox, oy) {
    _dm(m, ox, oy);
    const H = m.hill; if (!H) return;
    ctx.save();
    // the plateau catches more sun than the town below
    ctx.fillStyle = 'rgba(255,240,200,0.07)'; ctx.fillRect(ox + H.x0 * TS, oy + H.y0 * TS, (H.x1 - H.x0 + 1) * TS, (H.y1 - H.y0 + 1) * TS);
    // the wall throws a shadow out onto the lane below it
    const gy = oy + (H.wall + 2) * TS, sg = ctx.createLinearGradient(0, gy, 0, gy + TS * 0.9);
    sg.addColorStop(0, 'rgba(10,14,8,0.4)'); sg.addColorStop(1, 'rgba(10,14,8,0)');
    ctx.fillStyle = sg; ctx.fillRect(ox + H.x0 * TS, gy, (H.x1 - H.x0 + 2) * TS, TS * 0.9);
    // the retaining wall itself, repainted as a bank of fieldstone
    for (let x = H.x0; x <= H.x1 + 1; x++) if (x < H.steps[0] || x > H.steps[1]) ctx.drawImage(hillWallArt((x * 7 + 3) % 6), ox + x * TS, oy + H.wall * TS, TS, TS * 2);
    // and the east end, seen from above: a stone coping along the plateau's edge
    for (let y = H.y0; y < H.wall; y++) { ctx.fillStyle = '#6f685c'; ctx.fillRect(ox + (H.x1 + 1) * TS, oy + y * TS, TS, TS); ctx.fillStyle = '#8a8274'; ctx.fillRect(ox + (H.x1 + 1) * TS, oy + y * TS, TS * 0.35, TS); ctx.fillStyle = '#4a443c'; ctx.fillRect(ox + (H.x1 + 1.8) * TS, oy + y * TS, TS * 0.2, TS); }
    // the steps up through the wall, with low parapets either side
    const st = stepsArt();
    for (let x = H.steps[0]; x <= H.steps[1]; x++) ctx.drawImage(st, ox + x * TS, oy + H.wall * TS, TS, TS * 2);
    for (const x of [H.steps[0], H.steps[1] + 1]) { ctx.fillStyle = '#5f5a52'; ctx.fillRect(ox + x * TS - TS * 0.08, oy + (H.wall - 0.2) * TS, TS * 0.16, TS * 2.2); ctx.fillStyle = '#a39d92'; ctx.fillRect(ox + x * TS - TS * 0.08, oy + (H.wall - 0.2) * TS, TS * 0.06, TS * 2.2); }
    ctx.restore();
  };
}
