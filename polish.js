// The Temple Warden — rivers that flow, a proper footbridge, and gentler changes of scene.
'use strict';

// ---------------- the bridge: one timber footbridge drawn whole across the river ----------------
const BRIDGE_CACHE = new Map();
function bridgeArt(wt, ht) {
  const key = wt + 'x' + ht; if (BRIDGE_CACHE.has(key)) return BRIDGE_CACHE.get(key);
  // drawn on the 32 grid: the deck runs the length of the crossing (top to bottom), a little longer than the water
  const W = wt * 32 + 16, H = ht * 32 + 28;
  const c = nativeProp(W, H, ({ F, P }) => {
    const d0 = 8, d1 = W - 8; // deck edges
    // the end beams resting on each bank
    F(2, 8, W - 4, 6, '#4a2e16'); F(2, 8, W - 4, 2, '#7a5230'); F(2, H - 14, W - 4, 6, '#4a2e16'); F(2, H - 14, W - 4, 2, '#7a5230');
    // planks laid across the deck, each a little different, with gaps and nail heads
    for (let y = 12, i = 0; y < H - 10; y += 5, i++) {
      const col = ['#8a5a2b', '#7a5028', '#946232', '#83552a'][i % 4], off = (i * 3) % 4 - 2;
      F(d0 + off * 0.5, y, d1 - d0, 4, col); F(d0 + off * 0.5, y, d1 - d0, 1, '#a8743c'); F(d0, y + 4, d1 - d0, 1, '#2a1a0c');
      P(d0 + 3, y + 2, '#3a3a40'); P(d1 - 4, y + 2, '#3a3a40');
      if (i % 3 === 1) F(d0 + 10 + (i * 7) % (d1 - d0 - 20), y + 1, 6, 1, '#6b4423');
    }
    // the rails: posts down both sides and a hand-rail along their tops
    for (const x of [d0 - 4, d1]) {
      for (let y = 6; y < H - 6; y += 14) { F(x, y, 4, 12, '#5e3c1e'); F(x, y, 1, 12, '#8a5a2b'); }
      F(x - 1, 4, 6, H - 8, 'rgba(0,0,0,0)');
      F(x, 4, 4, 3, '#6b4423'); F(x, 4, 4, H - 10, 'rgba(0,0,0,0)');
      for (let y = 5; y < H - 6; y++) if (y % 14 < 3) F(x, y, 4, 1, '#7a5230');
      F(x + 1, 6, 2, H - 12, '#6b4423'); F(x + 1, 6, 1, H - 12, '#9a6a3a');
    }
  });
  BRIDGE_CACHE.set(key, c); return c;
}
function bridgesOf(m) {
  if (m._bridges) return m._bridges;
  const seen = new Set(), out = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (m.t[y][x] !== 'J' || seen.has(K(x, y))) continue;
    let x1 = x, y1 = y; while (m.t[y][x1 + 1] === 'J') x1++; while (y1 + 1 < m.h && m.t[y1 + 1][x] === 'J') y1++;
    for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen.add(K(xx, yy));
    out.push([x, y, x1 - x + 1, y1 - y + 1]);
  }
  Object.defineProperty(m, '_bridges', { value: out, configurable: true, writable: true, enumerable: false });
  return out;
}

// ---------------- running water ----------------
function drawFlow(m, GB, ox, oy, x0, y0, x1, y1, t) {
  const u = TS / 32, flows = m.outdoor || m.id === 'wilds';
  if (!flows) return;
  const isW = (x, y) => { const k = GB.mats[y * m.w + x]; return k === 'water' || k === 'shallow' || m.t[y] && m.t[y][x] === 'J'; };
  ctx.save();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const k = GB.mats[y * m.w + x]; if (k !== 'water' && k !== 'shallow') continue;
    const px = ox + x * TS, py = oy + y * TS;
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, TS, TS); ctx.clip();
    // the current: pale streaks sliding downstream (east), each at its own speed, wobbling a little
    for (let n = 0; n < 4; n++) {
      const h = tileHash(x * 7 + n * 31, y * 11 + n * 5), sp = 0.55 + (h % 50) / 100, ph = (h >>> 6) % 1000 / 1000;
      const f = (t / 2600 * sp + ph) % 1, sx = px + (f * 1.6 - 0.3) * TS, sy = py + (4 + (h >>> 3) % 24) * u + Math.sin(t / 700 + n * 2 + x) * u;
      const len = (6 + (h % 7)) * u, a = Math.sin(f * Math.PI) * (k === 'shallow' ? 0.45 : 0.3);
      ctx.fillStyle = `rgba(225,242,255,${a.toFixed(3)})`; ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(len), Math.max(1, Math.round(u)));
    }
    // foam where the water runs against the banks, breaking and re-forming
    for (const [dy, edgeY] of [[-1, py + u], [1, py + TS - 2 * u]]) {
      if (isW(x, y + dy)) continue;
      for (let i = 0; i < 6; i++) { const h = tileHash(x * 13 + i, y * 3 + dy + 7), fx = px + ((h % 32) + t / 140 * (1 + (h % 3) * 0.3)) % 32 * u, on = Math.sin(t / 300 + i + x) > -0.2; if (on) { ctx.fillStyle = 'rgba(240,250,255,0.55)'; ctx.fillRect(Math.round(fx), Math.round(edgeY + Math.sin(t / 400 + i) * u), Math.round(3 * u), Math.max(1, Math.round(u))); } }
    }
    ctx.restore();
    // a wake trailing downstream from anything standing in the stream: rocks, the bridge's piles
    if (!isW(x - 1, y) || m.decor[K(x - 1, y)] === 'rock') { const yy = py + TS * 0.5; ctx.fillStyle = 'rgba(230,245,255,0.25)'; for (let i = 0; i < 3; i++) { const f = (t / 900 + i / 3) % 1; ctx.fillRect(Math.round(px + f * TS * 0.9), Math.round(yy - (1 - f) * 4 * u + i * 3 * u - 3 * u), Math.round(4 * u * (1 - f) + u), Math.max(1, Math.round(u))); } }
  }
  ctx.restore();
}
{
  const _dg = drawGlints;
  drawGlints = function (m, GB, ox, oy, x0, y0, x1, y1, t) {
    _dg(m, GB, ox, oy, x0, y0, x1, y1, t);
    drawFlow(m, GB, ox, oy, x0, y0, x1, y1, t);
    for (const [bx, by, bw, bh] of bridgesOf(m)) {
      const art = bridgeArt(bw, bh), k = TS / 32, dx = ox + bx * TS - 8 * k, dy = oy + by * TS - 14 * k;
      ctx.fillStyle = 'rgba(10,20,30,0.3)'; ctx.fillRect(dx + 12 * k, dy + 20 * k, art.width * k, (art.height - 24) * k); // its shadow on the water
      ctx.drawImage(art, dx, dy, art.width * k, art.height * k);
    }
  };
}

// ---------------- changes of scene ----------------
// The old scene is held on screen as a picture and dims away while the new one comes up underneath, so there's never
// a hard cut. The name of the place shows only on arriving somewhere new outdoors or underground, not at every door.
{
  let snapEl = null, titleEl = null, titleT = 0, lastTitled = null;
  const ensure = () => {
    if (snapEl) return;
    const host = document.querySelector('#mapwrap') || document.body;
    snapEl = document.createElement('canvas'); snapEl.id = 'scene-snap'; host.appendChild(snapEl);
    titleEl = document.createElement('div'); titleEl.id = 'scene-title'; host.appendChild(titleEl);
  };
  const _goMap = goMap;
  goMap = function (id, x, y) {
    const from = S && S.mapId, change = from && from !== id && !reduceMotion;
    if (change) {
      ensure();
      // hold the outgoing frame
      snapEl.width = cvs.width; snapEl.height = cvs.height; snapEl.style.width = cvs.style.width; snapEl.style.height = cvs.style.height;
      const g = snapEl.getContext('2d'); g.drawImage(cvs, 0, 0);
      snapEl.style.transition = 'none'; snapEl.style.opacity = '1'; snapEl.style.filter = 'brightness(1)'; snapEl.style.display = 'block';
    }
    const r = _goMap(id, x, y);
    if (change) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        snapEl.style.transition = 'opacity 0.55s ease-in-out, filter 0.3s ease-out'; snapEl.style.filter = 'brightness(0.25)'; snapEl.style.opacity = '0';
      }));
      setTimeout(() => { if (snapEl.style.opacity === '0') snapEl.style.display = 'none'; }, 700);
      const m = curMap(), inside = m && (m.theme === 'house' || (m.id || '').startsWith('in_'));
      const region = m && (m.outdoor || m.lit) ? m.id : m && m.id;
      if (m && m.name && !inside && region !== lastTitled) {
        lastTitled = region;
        titleEl.innerHTML = `<span>${esc(m.name)}</span>`; titleEl.classList.remove('show'); void titleEl.offsetWidth; titleEl.classList.add('show');
        clearTimeout(titleT); titleT = setTimeout(() => titleEl.classList.remove('show'), 1700);
      }
    }
    return r;
  };
}
// prepare the big maps' ground in quiet moments, so arriving there doesn't stall the first frame
{
  const idle = window.requestIdleCallback || (f => setTimeout(f, 400));
  const warm = () => { if (!S || !S.maps) return; for (const id of ['town', 'wilds', 'temple', 'home']) { const m = S.maps[id]; if (m && !m._warm) { Object.defineProperty(m, '_warm', { value: 1, writable: true, configurable: true, enumerable: false }); try { groundBake(m); } catch (e) { } return idle(warm); } } };
  setInterval(() => idle(warm), 5000);
}
