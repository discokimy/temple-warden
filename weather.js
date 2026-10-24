// The Temple Warden — seasons and weather.
// The year turns every seven days: spring, summer, autumn, winter. The trees blossom, turn gold, go bare and carry
// snow; the meadows green up, brown off and whiten. Weather rolls in and passes through the day: clear skies, cloud,
// rain, thunderstorms with lightning, fog in the valley, and in winter, snow that settles on the ground the longer
// it falls and melts away when it stops. Rain makes the fish bite; birds take shelter. Underground, none of it reaches.
'use strict';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_DAYS = 7;
const SEASON_NAME = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
const WEATHER_NAME = { clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Storm', fog: 'Fog', snow: 'Snow' };
const WEATHER_ODDS = {
  spring: [['clear', 40], ['cloudy', 25], ['rain', 25], ['storm', 5], ['fog', 5]],
  summer: [['clear', 60], ['cloudy', 15], ['rain', 12], ['storm', 10], ['fog', 3]],
  autumn: [['clear', 30], ['cloudy', 25], ['rain', 25], ['storm', 8], ['fog', 12]],
  winter: [['clear', 30], ['cloudy', 25], ['snow', 35], ['fog', 10]],
};
const WEATHER_SAY = {
  clear: 'The clouds break and the sun comes through.',
  cloudy: 'Grey cloud rolls in over the valley.',
  rain: 'It begins to rain.',
  storm: 'The sky goes dark. Thunder rumbles over the hills, and the rain comes down hard.',
  fog: 'A fog creeps up from the river and fills the valley.',
  snow: 'Snow begins to fall, slow and quiet.',
};
const SEASON_SAY = {
  spring: 'Spring comes to the valley. The orchards blossom and the meadows green.',
  summer: 'Summer. The days are warm and long, and the river runs low and clear.',
  autumn: 'Autumn. The leaves are turning gold, and there is woodsmoke on the air.',
  winter: 'Winter sets in. The ground goes hard with frost.',
};
function season() { const n = Math.floor(((S ? S.day : 1) - 1 + (S && S.seasonOffset || 0)) / SEASON_DAYS); return SEASONS[((n % 4) + 4) % 4]; }
function weather() { return (S && S.weather && S.weather.kind) || 'clear'; }
function weatherLabel() { return ` · ${SEASON_NAME[season()]}${weather() !== 'clear' ? ' · ' + WEATHER_NAME[weather()] : ''}`; }
const wxWet = () => weather() === 'rain' || weather() === 'storm';
function rollWeather(say) {
  const odds = WEATHER_ODDS[season()], tot = odds.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * tot, k = odds[0][0]; for (const [id, w] of odds) if ((r -= w) < 0) { k = id; break; }
  const was = weather();
  S.weather = { kind: k, until: S.turn + 150 + Math.floor(Math.random() * 350) };
  if (say && k !== was) { const m = curMap(); if (m && isOpenAir(m)) msg(WEATHER_SAY[k], 'talk'); }
}
{
  const _newDay = newDay;
  newDay = function (r) {
    const before = season(); const out = _newDay(r);
    if (season() !== before) { msg(SEASON_SAY[season()], 'news'); weatherTreesChanged(); }
    rollWeather(false);
    return out;
  };
  const _endTurn = endTurn;
  endTurn = function () {
    const out = _endTurn();
    if (S) {
      if (!S.weather) rollWeather(false);
      if (S.turn >= S.weather.until) rollWeather(true);
      // snow settles while it falls and melts when it stops (faster outside winter)
      const w = weather();
      S.snowCover = Math.max(0, Math.min(1, (S.snowCover || 0) + (w === 'snow' ? 0.004 : season() === 'winter' ? -0.0006 : -0.004)));
      if (w === 'storm' && Math.random() < 0.02) { const m = curMap(); if (m && isOpenAir(m)) { wxFlash = performance.now(); msg(pick(['Lightning splits the sky.', 'Thunder cracks right overhead.', 'A flash, and a long roll of thunder.']), 'warn'); } }
    }
    return out;
  };
}

// ---------------- the trees through the year ----------------
TREE_KINDS.blossom = { leaves: ['#7a4a5a', '#b06a80', '#d890a8', '#f0b8c8', '#fad4de', '#fff0f4'], bark: ['#4a3626', '#5e4430', '#73553c'], w: 88, h: 112, crown: [44, 54, 34, 30], trunk: 7 };
TREE_KINDS.winteroak = { leaves: ['#3a3028', '#4a3c30', '#5a4a3a', '#6a5848', '#dfe8f0', '#ffffff'], bark: ['#3e3026', '#52402e', '#665038'], w: 88, h: 112, crown: [44, 54, 34, 30], trunk: 7 };
TREE_KINDS.snowpine = { leaves: ['#1f3d26', '#284b2e', '#305a36', '#c8d8e4', '#e8f0f6', '#ffffff'], bark: ['#3e2c20', '#4e3828', '#5e4430'], w: 64, h: 112, pine: 1, trunk: 6 };
TREE_KINDS.winterbirch = { leaves: ['#4a4038', '#5a5046', '#6a6054', '#7a7064', '#e8eef4', '#ffffff'], bark: ['#d8d4c8', '#e8e4d8', '#f4f0e6'], w: 72, h: 112, crown: [36, 50, 24, 32], trunk: 5, birch: 1 };
function weatherTreesChanged() { if (typeof render === 'function' && S) render(); }
{
  const _treeAt = treeAt;
  treeAt = function (m, x, y, c, dc) {
    const k = _treeAt(m, x, y, c, dc); if (!k || !S || !isOpenAir(m)) return k;
    const s = season(), h = tileHash(x * 5 + 1, y * 3 + 7) % 10;
    if (s === 'autumn') return k === 'oak' && h < 7 ? 'autumn' : k;
    if (s === 'winter') return k === 'pine' ? 'snowpine' : k === 'birch' ? 'winterbirch' : k === 'apple' ? 'winteroak' : k === 'oak' || k === 'autumn' ? 'winteroak' : k;
    if (s === 'spring') return (k === 'oak' && h < 2) || k === 'apple' ? 'blossom' : k === 'autumn' ? 'oak' : k;
    return k === 'autumn' && h < 6 ? 'oak' : k; // summer: mostly green
  };
}

// ---------------- the ground through the year: a tint over the meadows, and settled snow ----------------
const WX_MASK = new WeakMap();
function meadowMask(m) {
  let c = WX_MASK.get(m); if (c) return c;
  c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const g = c.getContext('2d');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.t[y][x]; let a = 0;
    if (',fTYS'.includes(t)) a = 1; else if (';{}'.includes(t)) a = 0.55; else if (':EXF'.includes(t)) a = 0.35; else if ('rhlKHWO'.includes(t)) a = 0.7;
    if (a) { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, 1, 1); }
  }
  WX_MASK.set(m, c); return c;
}
function tintLayer(m, col, key) {
  const k = 'tint' + key; if (m['_' + k]) return m['_' + k];
  const mask = meadowMask(m), c = document.createElement('canvas'); c.width = mask.width; c.height = mask.height;
  const g = c.getContext('2d'); g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  Object.defineProperty(m, '_' + k, { value: c, writable: true, configurable: true, enumerable: false }); return c;
}
{
  const _drawMeadow = drawMeadow;
  drawMeadow = function (m, ox, oy) {
    _drawMeadow(m, ox, oy);
    if (!S || !isOpenAir(m)) return;
    const s = season(), cover = S.snowCover || 0;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    const lay = (col, key, a) => { if (a <= 0.01) return; ctx.globalAlpha = a; ctx.drawImage(tintLayer(m, col, key), ox, oy, m.w * TS, m.h * TS); };
    if (s === 'autumn') lay('#b0783a', 'aut', 0.22);
    if (s === 'winter') lay('#8a9098', 'win', 0.25);
    if (s === 'spring') lay('#6ab04a', 'spr', 0.1);
    if (wxWet()) lay('#1a2430', 'wet', 0.18);
    lay('#f4f8fc', 'snow', Math.min(0.8, cover * 0.85));
    ctx.restore();
  };
}

// ---------------- the sky: rain, snow, fog, cloud and lightning ----------------
let wxFlash = 0, nextFlash = 0;
function drawWeather(m, ox, oy, t, W, H) {
  if (!S || reduceMotion) return;
  const w = weather(), u = TS / 32;
  if (w === 'cloudy' || wxWet() || w === 'snow') { ctx.fillStyle = w === 'storm' ? 'rgba(20,24,40,0.32)' : w === 'rain' ? 'rgba(30,38,56,0.2)' : 'rgba(60,66,80,0.14)'; ctx.fillRect(0, 0, W, H); }
  if (wxWet()) {
    const n = Math.round(W * H / (w === 'storm' ? 2600 : 5200)), fall = w === 'storm' ? 1.6 : 1.1;
    ctx.strokeStyle = w === 'storm' ? 'rgba(200,215,235,0.45)' : 'rgba(190,205,225,0.35)'; ctx.lineWidth = Math.max(1, u * 0.8); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sp = 0.8 + (i % 7) * 0.06, x0 = (i * 7919 % 10007) / 10007 * (W + 200) - 100, k = ((t / 1000) * fall * sp + (i * 0.6180339) % 1) % 1;
      const x = x0 + k * 60 * u, y = -20 + k * (H + 40), len = 10 * u * sp;
      ctx.moveTo(x, y); ctx.lineTo(x + len * 0.3, y + len);
    }
    ctx.stroke();
    // splashes on the ground
    ctx.fillStyle = 'rgba(210,225,240,0.5)';
    for (let i = 0; i < n / 6; i++) { const k = ((t / 380) + i * 0.37) % 1; if (k > 0.25) continue; const x = (i * 4999 % 10007) / 10007 * W, y = (i * 2851 % 10007) / 10007 * H; ctx.fillRect(x - u * 2 * k * 4, y, u * 4 * k * 4 + u, u); }
  }
  if (w === 'storm') {
    if (t > nextFlash) { if (nextFlash) wxFlash = t; nextFlash = t + 6000 + Math.random() * 12000; }
    const k = (t - wxFlash) / 380; if (k >= 0 && k < 1) { ctx.fillStyle = `rgba(235,240,255,${(0.55 * (1 - k) * (k < 0.15 ? 1 : 0.6 + 0.4 * Math.sin(k * 40))).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }
  if (w === 'snow') {
    const n = Math.round(W * H / 4200);
    for (let i = 0; i < n; i++) {
      const sp = 0.5 + (i % 5) * 0.12, x0 = (i * 7919 % 10007) / 10007 * W, k = ((t / 9000) * sp + (i * 0.6180339) % 1) % 1;
      const x = (x0 + Math.sin(t / 1400 + i) * 18 * u + k * 30 * u) % W, y = k * (H + 20) - 10, s = (i % 3 ? 1.5 : 2.5) * u;
      ctx.fillStyle = i % 4 ? 'rgba(255,255,255,0.85)' : 'rgba(230,238,250,0.7)'; ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }
  if (w === 'fog') {
    ctx.fillStyle = 'rgba(200,205,214,0.18)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const y = ((i * 0.19 + 0.05) % 1) * H, x = ((t / 40000 * (0.6 + i * 0.1) + i * 0.31) % 1.6 - 0.3) * W, r = W * (0.35 + (i % 3) * 0.1);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(225,230,236,0.32)'); gr.addColorStop(1, 'rgba(225,230,236,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}
{
  const _db = drawButterflies;
  // butterflies and birds keep out of the rain and snow; the weather draws over everything outside
  drawButterflies = function (m, ox, oy, t, W, H) { if (!wxWet() && weather() !== 'snow' && season() !== 'winter') _db(m, ox, oy, t, W, H); else if (typeof drawBirds === 'function' && !wxWet() && weather() !== 'snow') drawBirds(m, ox, oy, t, W, H); drawWeather(m, ox, oy, t, W, H); };
}
// fish bite faster in the rain
{
  const _newCast = newCast;
  newCast = function () { _newCast(); if (fishing && wxWet() && fishing.biteAt) fishing.biteAt = fishing.t0 + (fishing.biteAt - fishing.t0) * 0.6; };
}
// for testing: choose the weather and the season from the Options window
{
  const _htmlOptions = htmlOptions;
  htmlOptions = function () {
    const h = _htmlOptions(); if (!S) return h;
    return h + `<h3>Weather (testing)</h3><div class="btnrow cheats">${Object.keys(WEATHER_NAME).map(k => `<button class="btn" data-wx="w|${k}">${WEATHER_NAME[k]}</button>`).join('')}</div>
      <div class="btnrow cheats">${SEASONS.map(s => `<button class="btn" data-wx="s|${s}">${SEASON_NAME[s]}</button>`).join('')}</div>`;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-wx]'); if (!b || !S) return;
    const [k, v] = b.dataset.wx.split('|');
    if (k === 'w') { S.weather = { kind: v, until: S.turn + 400 }; if (v === 'snow') S.snowCover = Math.max(S.snowCover || 0, 0.4); msg(WEATHER_SAY[v], 'talk'); }
    if (k === 's') { const want = SEASONS.indexOf(v), cur = Math.floor((S.day - 1) / SEASON_DAYS) % 4; S.seasonOffset = ((want - cur + 4) % 4) * SEASON_DAYS - ((S.day - 1) % SEASON_DAYS); if (v !== 'winter') S.snowCover = 0; msg(SEASON_SAY[v], 'news'); }
    closeModal(true); render(); refresh();
  });
}
