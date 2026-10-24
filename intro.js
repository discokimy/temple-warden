// The Temple Warden — the opening: a short film in the game's own pixel art, told in six scenes with a line of
// narration each. It plays when a new story begins (and from the title menu); any key or tap skips ahead a scene,
// and "Skip" ends it.
'use strict';

const INTRO_SCENES = [
  { d: 7000, text: 'Twenty years ago, on a winter night, a cottage at the edge of Brambleford burned to the ground.' },
  { d: 7500, text: 'At dawn, Father Halvard, priest of Aurel, found a child alive in the ashes. The fire would not take him.' },
  { d: 7500, text: 'He raised the boy in the temple as his acolyte, and taught him the old prayers, and how to guard a shrine.' },
  { d: 7000, text: 'Three days ago, Halvard took his lantern and went north, down into the caves. He did not come back.' },
  { d: 7000, text: 'He left a note. Keep the lamps lit, it said. Do not follow me.' },
  { d: 6000, text: '' },
];
let introState = null;

function playIntro(onDone) {
  let el = document.getElementById('intro');
  if (!el) { el = document.createElement('div'); el.id = 'intro'; document.querySelector('.game').appendChild(el); }
  el.hidden = false;
  el.innerHTML = `<canvas id="intro-cv"></canvas><div class="intro-bar top"></div><div class="intro-bar bot"><p id="intro-text"></p></div><button class="intro-skip" type="button">Skip ›</button>`;
  introState = { t0: performance.now(), scene: 0, sceneT0: performance.now(), onDone, hero: null };
  const latest = (typeof titleSlots !== 'undefined' ? titleSlots : []).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  try { introState.look = latest && latest.look || {}; } catch (e) { introState.look = {}; }
  el.querySelector('.intro-skip').onclick = e => { e.stopPropagation(); endIntro(); };
  el.onclick = () => nextScene();
  introKey = e => { if (!introState) return; e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') endIntro(); else nextScene(); };
  document.addEventListener('keydown', introKey, true);
  setIntroText();
  requestAnimationFrame(introTick);
}
let introKey = null;
function setIntroText() {
  const p = document.getElementById('intro-text'); if (!p || !introState) return;
  p.classList.remove('show'); const t = INTRO_SCENES[introState.scene].text;
  setTimeout(() => { if (!introState) return; p.textContent = t; if (t) p.classList.add('show'); }, 350);
}
function nextScene() {
  if (!introState) return;
  if (introState.scene >= INTRO_SCENES.length - 1) return endIntro();
  introState.scene++; introState.sceneT0 = performance.now(); setIntroText();
}
function endIntro() {
  if (!introState) return;
  const done = introState.onDone; introState = null;
  document.removeEventListener('keydown', introKey, true);
  const el = document.getElementById('intro'); if (el) { el.classList.add('fade'); setTimeout(() => { el.hidden = true; el.classList.remove('fade'); el.innerHTML = ''; }, 500); }
  if (done) done();
}

// ---------------- drawing ----------------
function introTick(now) {
  if (!introState) return;
  const st = introState, c = document.getElementById('intro-cv'); if (!c) return;
  const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.floor(r.width * dpr) || c.height !== Math.floor(r.height * dpr)) { c.width = Math.floor(r.width * dpr); c.height = Math.floor(r.height * dpr); }
  const g = c.getContext('2d'), W = c.width, H = c.height; g.imageSmoothingEnabled = false;
  const sc = INTRO_SCENES[st.scene], t = Math.min(1, (now - st.sceneT0) / sc.d);
  if (now - st.sceneT0 > sc.d) { nextScene(); requestAnimationFrame(introTick); return; }
  const px = Math.max(3, Math.floor(Math.min(W / 200, H / 130)));
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  try { INTRO_DRAW[st.scene](g, W, H, t, px, now, st); } catch (e) { console.error(e); }
  // fade in and out of each scene
  const fade = Math.min(1, t * 6, (1 - t) * 6);
  g.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`; g.fillRect(0, 0, W, H);
  requestAnimationFrame(introTick);
}
// shared helpers for the scenes
const IH = {
  sky(g, W, H, stops) { const s = g.createLinearGradient(0, 0, 0, H); stops.forEach(([k, c]) => s.addColorStop(k, c)); g.fillStyle = s; g.fillRect(0, 0, W, H); },
  stars(g, W, H, now, n = 70, a = 1) { for (let i = 0; i < n; i++) { const x = (i * 9973 % 1000) / 1000 * W, y = (i * 7919 % 1000) / 1000 * H * 0.5; g.globalAlpha = a * (0.25 + 0.6 * Math.abs(Math.sin(now / 800 + i))); g.fillStyle = '#fff6e0'; g.fillRect(x, y, 2, 2); } g.globalAlpha = 1; },
  ground(g, W, H, y, px, dark = 0.4) { const tile = 16 * px; for (let x = 0; x < W; x += tile) for (let yy = y; yy < H; yy += tile) g.drawImage(tileVar('grass', x / tile | 0, yy / tile | 0), x, yy, tile, tile); g.fillStyle = `rgba(10,6,20,${dark})`; g.fillRect(0, y, W, H - y); },
  glow(g, x, y, r, col, a) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; },
  fig(g, spec, facing, pose, x, y, s) { const c = figure(spec, facing, pose); g.drawImage(c, Math.round(x - 16 * s), Math.round(y - 46 * s), 32 * s, 48 * s); },
  shadow(g, x, y, s) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 8 * s, 2.4 * s, 0, 0, Math.PI * 2); g.fill(); },
  hero(st, age) {
    const L = st.look || {};
    const s = heroSpec({}, L);
    if (age === 'child') return Object.assign({}, s, { build: 'child', shirt: 'efe6d2', torso: 'robe', beard: null, stubble: 0 });
    if (age === 'acolyte') return Object.assign({}, s, { shirt: 'efe6d2', torso: 'robe', belt: 'c8a03a', held: 'mace' });
    return s;
  },
  halvard(extra) { return Object.assign({}, FIG_SPECS.priest, extra || {}); },
};
const INTRO_DRAW = [
  // 1. the fire: a cottage burning in the snow at night, sparks going up into the dark
  (g, W, H, t, px, now) => {
    IH.sky(g, W, H, [[0, '#06040e'], [0.6, '#1a1024'], [1, '#2a1418']]); IH.stars(g, W, H, now, 60, 0.6);
    const gy = H * 0.72; IH.ground(g, W, H, gy, px, 0.55);
    g.fillStyle = 'rgba(230,236,250,0.18)'; g.fillRect(0, gy, W, H - gy); // snow
    const bw = 64 * px, bh = 64 * px, bx = W * 0.5 - bw / 2 + Math.round((t - 0.5) * -6 * px), by = gy - bh + 4 * px;
    try { const art = buildingArt({ w: 4, h: 4, roof: 'h', wall: 'H', door: 2, kind: 'home', seed: 77 }); g.drawImage(art, bx, by, bw, bh); } catch (e) { }
    g.fillStyle = 'rgba(30,8,0,0.6)'; g.fillRect(bx, by, bw, bh);
    // tongues of flame climbing the walls and roaring up through the roof
    for (let i = 0; i < 46; i++) {
      const fx = bx + (((i * 37) % 60) + 2) * px, base = by + bh * (0.35 + ((i * 13) % 5) * 0.12), tall = (14 + (i * 11) % 26) * px;
      const k = (now / (420 + (i % 5) * 70) + i * 0.29) % 1, h = tall * (0.6 + 0.4 * Math.sin(k * Math.PI)), sway = Math.sin(now / 160 + i) * 2 * px;
      for (let y = 0; y < h; y += px) { const f = y / h, w = Math.max(px, (1 - f) * (4 + (i % 3) * 2) * px); g.fillStyle = f < 0.25 ? '#fff1b0' : f < 0.55 ? '#ffb347' : f < 0.85 ? '#e2561f' : '#8a2a14'; g.fillRect(Math.round(fx - w / 2 + sway * f), Math.round(base - y), Math.round(w), px); }
    }
    IH.glow(g, W * 0.5, by + bh * 0.4, bw * 1.3, '255,120,40', 0.45 + 0.1 * Math.sin(now / 90));
    for (let i = 0; i < 40; i++) { const k = (now / 3000 + i * 0.113) % 1, x = W * 0.5 + Math.sin(i * 3 + now / 700) * bw * 0.6, y = by + bh * 0.3 - k * H * 0.6; g.globalAlpha = 1 - k; g.fillStyle = i % 2 ? '#ffcd6b' : '#ff7a2a'; g.fillRect(x, y, px * 0.7, px * 0.7); }
    g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { const k = (now / 5000 + i / 6) % 1; g.fillStyle = `rgba(40,30,40,${(0.5 * (1 - k)).toFixed(2)})`; g.beginPath(); g.arc(W * 0.5 + Math.sin(k * 4 + i) * px * 10, by - k * H * 0.5, (8 + k * 30) * px, 0, Math.PI * 2); g.fill(); }
  },
  // 2. dawn over the ashes: Halvard comes walking from the left, and kneels where something glows faintly gold
  (g, W, H, t, px, now) => {
    IH.sky(g, W, H, [[0, '#2a1c3e'], [0.55, '#a2526a'], [0.8, '#f0a35a'], [1, '#ffd08a']]);
    const gy = H * 0.72; IH.ground(g, W, H, gy, px, 0.3);
    g.fillStyle = 'rgba(230,236,250,0.22)'; g.fillRect(0, gy, W, H - gy);
    // the ruin: charred beams and a chimney standing alone, smoke still curling from it
    const rx = W * 0.62;
    g.fillStyle = '#1a1414'; g.fillRect(rx + 10 * px, gy - 34 * px, 8 * px, 34 * px);
    for (const [x, h, a] of [[-14, 18, -0.4], [0, 22, 0.3], [20, 14, 0.6], [30, 10, -0.2]]) { g.save(); g.translate(rx + x * px, gy); g.rotate(a); g.fillStyle = '#2a1e1a'; g.fillRect(-px, -h * px, 3 * px, h * px); g.restore(); }
    g.fillStyle = '#2a2420'; g.fillRect(rx - 26 * px, gy - 2 * px, 64 * px, 3 * px);
    for (let i = 0; i < 4; i++) { const k = (now / 4000 + i / 4) % 1; g.fillStyle = `rgba(90,80,90,${(0.35 * (1 - k)).toFixed(2)})`; g.beginPath(); g.arc(rx + 14 * px + Math.sin(k * 3) * 6 * px, gy - 36 * px - k * 50 * px, (4 + k * 14) * px, 0, Math.PI * 2); g.fill(); }
    // the child, swaddled, glowing a little in the ash
    const cx = rx - 6 * px, cy = gy - 2 * px;
    IH.glow(g, cx, cy, 22 * px, '255,220,140', 0.35 + 0.1 * Math.sin(now / 500));
    g.fillStyle = '#e8e0cc'; g.beginPath(); g.ellipse(cx, cy - 2 * px, 5 * px, 3 * px, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#eab38b'; g.fillRect(cx + 2 * px, cy - 4 * px, 3 * px, 3 * px);
    // Halvard: walks in, then kneels
    const s = px * 1.1, walkEnd = 0.55, k = Math.min(1, t / walkEnd), hx = W * 0.12 + (cx - 18 * px - W * 0.12) * k, kneel = t > walkEnd;
    IH.shadow(g, hx, gy + 8 * px, s);
    IH.fig(g, IH.halvard({ held: 'staff' }), 'right', kneel ? 'kneel' : (Math.floor(now / 160) % 4), hx, gy + 8 * px, s);
  },
  // 3. the temple years: the child beside Halvard at the altar, then grown, sparring with him in the yard
  (g, W, H, t, px, now, st) => {
    IH.sky(g, W, H, [[0, '#5a8ac8'], [0.7, '#bcd8f0'], [1, '#f0e8d0']]);
    const gy = H * 0.74; IH.ground(g, W, H, gy, px, 0.05);
    const tw = 112 * px; g.drawImage(landmarkCanvas('temple'), W * 0.5 - tw / 2, gy - tw + 6 * px, tw, tw);
    const s = px * 1.05, grown = t > 0.5;
    const hx = W * 0.5 - 40 * px, cx = W * 0.5 + 40 * px, y = gy + 12 * px;
    IH.shadow(g, hx, y, s); IH.shadow(g, cx, y, s);
    if (!grown) {
      IH.fig(g, IH.halvard({ held: 'book', bookColor: '7d2027' }), 'right', 'idle' + (Math.floor(now / 700) % 2), hx, y, s);
      IH.fig(g, IH.hero(st, 'child'), 'left', 'pray', cx - 10 * px, y, s);
    } else {
      const ph = Math.floor(now / 220) % 6;
      IH.fig(g, IH.halvard({ held: 'staff' }), 'right', ['atk0', 'atk1', 'atk2', 'idle0', 'idle0', 'hurt'][ph], hx + 8 * px, y, s);
      IH.fig(g, IH.hero(st, 'acolyte'), 'left', ['idle0', 'hurt', 'idle0', 'atk0', 'atk1', 'atk2'][ph], cx - 8 * px, y, s);
    }
    // a gentle flash between the years
    if (Math.abs(t - 0.5) < 0.04) { g.fillStyle = `rgba(255,250,235,${(1 - Math.abs(t - 0.5) / 0.04) * 0.8})`; g.fillRect(0, 0, W, H); }
  },
  // 4. north: Halvard with his lantern walking up the road toward the cliffs, growing smaller, into the dark mouth
  (g, W, H, t, px, now) => {
    IH.sky(g, W, H, [[0, '#06040e'], [0.6, '#141024'], [1, '#1e1828']]); IH.stars(g, W, H, now, 80, 0.9);
    const gy = H * 0.62;
    g.fillStyle = '#2a2430'; g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W; x += px * 3) g.lineTo(x, gy - 30 * px - Math.abs(Math.sin(x / (40 * px))) * 20 * px); g.lineTo(W, gy); g.fill();
    const cm = caveMouthArt(), ck = px * 0.9; g.drawImage(cm, W * 0.5 - cm.width * ck / 2, gy - cm.height * ck + 4 * px, cm.width * ck, cm.height * ck);
    IH.ground(g, W, H, gy, px, 0.6);
    g.fillStyle = '#4a3a30'; for (let y = gy; y < H; y += px) { const k = (y - gy) / (H - gy); const w = px * (6 + k * 40); g.fillRect(W * 0.5 - w / 2 + Math.sin(k * 3) * k * 30 * px, y, w, px); }
    // Halvard, walking away from us up the road; he shrinks with distance, and his light goes in last
    const k = Math.min(1, t * 1.15), y = H - (H - gy - 6 * px) * k - 10 * px, s = px * (1.4 - k * 1.0), x = W * 0.5 + Math.sin((1 - k) * 3) * (1 - k) * 30 * px;
    if (t < 0.92) { IH.fig(g, IH.halvard({ held: 'staff', light: 1 }), 'up', Math.floor(now / 200) % 4, x, y, s); IH.glow(g, x - 8 * s, y - 22 * s, 30 * s + 10 * px, '255,170,70', 0.45 * (1 - k * 0.6)); }
  },
  // 5. the parsonage, by candlelight: your acolyte at Halvard's desk, reading the note
  (g, W, H, t, px, now, st) => {
    g.fillStyle = '#1a120e'; g.fillRect(0, 0, W, H);
    const gy = H * 0.7;
    // plank wall and floor
    for (let y = 0; y < gy; y += 6 * px) { g.fillStyle = (y / (6 * px)) % 2 ? '#3a2618' : '#422c1d'; g.fillRect(0, y, W, 6 * px - px); }
    for (let y = gy; y < H; y += 4 * px) { g.fillStyle = (y / (4 * px)) % 2 ? '#6e4a2a' : '#7a5232'; g.fillRect(0, y, W, 4 * px - px); }
    const dx = W * 0.56, dw = 60 * px;
    g.fillStyle = '#4a2e16'; g.fillRect(dx - dw / 2, gy - 18 * px, dw, 6 * px); g.fillRect(dx - dw / 2 + 2 * px, gy - 12 * px, 4 * px, 14 * px); g.fillRect(dx + dw / 2 - 6 * px, gy - 12 * px, 4 * px, 14 * px);
    g.fillStyle = '#6b4423'; g.fillRect(dx - dw / 2, gy - 18 * px, dw, 2 * px);
    try { const bc = propCanvas('bookcase'); g.drawImage(bc, W * 0.82, gy - 40 * px, 40 * px, 40 * px); } catch (e) { }
    // the candle, and the note
    const fl = Math.sin(now / 90) * Math.sin(now / 37);
    g.fillStyle = '#f2ead6'; g.fillRect(dx + 14 * px, gy - 28 * px, 3 * px, 10 * px); g.fillStyle = '#ffb347'; g.fillRect(dx + 14.5 * px, gy - 31 * px + fl * px * 0.5, 2 * px, 3 * px); g.fillStyle = '#fff1b0'; g.fillRect(dx + 15 * px, gy - 30 * px, px, px);
    g.fillStyle = '#efe6d2'; g.fillRect(dx - 10 * px, gy - 20 * px, 12 * px, 3 * px); for (let i = 0; i < 4; i++) { g.fillStyle = '#6a5a48'; g.fillRect(dx - 9 * px + i * 3 * px, gy - 19 * px, 2 * px, px * 0.6); }
    // the acolyte, standing at the desk, reading
    const s = px * 1.3;
    IH.fig(g, IH.hero(st, 'adult'), 'right', 'idle' + (t > 0.7 ? 1 : 0), dx - dw / 2 - 6 * px, gy + 4 * px, s);
    IH.glow(g, dx + 15 * px, gy - 30 * px, 70 * px + fl * 4 * px, '255,170,80', 0.42);
    g.fillStyle = `rgba(0,0,0,${0.35 + 0.05 * fl})`; g.fillRect(0, 0, W, H);
    IH.glow(g, dx + 15 * px, gy - 30 * px, 40 * px, '255,190,100', 0.25);
  },
  // 6. the title, rising out of the dark of the cave mouth
  (g, W, H, t, px, now) => {
    IH.sky(g, W, H, [[0, '#06040e'], [1, '#120c18']]);
    const cm = caveMouthArt(), ck = px * (1.2 + t * 0.4); g.globalAlpha = 0.9; g.drawImage(cm, W * 0.5 - cm.width * ck / 2, H * 0.92 - cm.height * ck, cm.width * ck, cm.height * ck); g.globalAlpha = 1;
    for (let i = 0; i < 30; i++) { const k = (now / 7000 + i * 0.07) % 1; g.globalAlpha = Math.sin(k * Math.PI) * 0.7; g.fillStyle = '#ffcd6b'; g.fillRect((i * 9973 % 1000) / 1000 * W, H - k * H, px * 0.6, px * 0.6); }
    g.globalAlpha = 1;
    const a = Math.min(1, Math.max(0, (t - 0.12) * 2.5));
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#ffe9b8';
    g.font = `600 ${Math.round(px * 3.2)}px Figtree, sans-serif`; g.fillText('A TALE OF BRAMBLEFORD', W / 2, H * 0.2);
    g.font = `700 ${Math.round(px * 12)}px Cinzel, serif`; g.shadowColor = 'rgba(255,150,60,0.6)'; g.shadowBlur = px * 6; g.fillText('The Temple Warden', W / 2, H * 0.2 + px * 14);
    g.restore();
  },
];
