// The Temple Warden — sound, all of it made in the browser (Web Audio), no files.
// Effects: footsteps that change with the ground, swings, hits and misses, bow and crossbow, being hurt, spells, coins,
// pickups, gathering, doors, the temple bell, splashes, level-ups, menu clicks, thunder.
// Ambience that follows where you are: wind, birdsong by day and crickets by night, rain, running water by the river,
// the crackle of the temple fire, drips and a low hum underground.
// Music: quiet, generated, a little different for town, the wilds, the temple and the deep.
// Browsers only allow sound after a tap or key press, so it all wakes on the first one.
'use strict';

const SND = {
  ctx: null, master: null, sfx: null, amb: null, mus: null, verb: null, noise: null,
  vol: { master: 0.8, sfx: 0.8, amb: 0.6, mus: 0.35, muted: false },
};
try { Object.assign(SND.vol, JSON.parse(localStorage.getItem('tw-sound') || '{}')); } catch (e) { }
function sndSave() { try { localStorage.setItem('tw-sound', JSON.stringify(SND.vol)); } catch (e) { } }
function sndApply() {
  if (!SND.ctx) return;
  const t = SND.ctx.currentTime, v = SND.vol;
  SND.master.gain.setTargetAtTime(v.muted ? 0 : v.master, t, 0.05);
  SND.sfx.gain.setTargetAtTime(v.sfx, t, 0.05); SND.amb.gain.setTargetAtTime(v.amb, t, 0.2); SND.mus.gain.setTargetAtTime(v.mus, t, 0.3);
}
// iOS plays Web Audio on the 'ambient' channel, which Silent Mode mutes. Declaring the page a media player, and
// starting a real (silent) <audio> element from the tap, moves it onto the playback channel, which Silent Mode leaves alone.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
let SILENT_EL = null;
function silentWavUrl() {
  const n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function mediaUnlock() {
  try {
    if (!SILENT_EL) { SILENT_EL = document.createElement('audio'); SILENT_EL.src = silentWavUrl(); SILENT_EL.loop = true; SILENT_EL.setAttribute('playsinline', ''); SILENT_EL.volume = 0.01; }
    const pr = SILENT_EL.play(); if (pr && pr.catch) pr.catch(() => { });
  } catch (e) { }
}
function sndStatus() {
  const st = SND.ctx ? SND.ctx.state : 'not started yet (tap anywhere)';
  return `Audio: ${st}${SILENT_EL ? (SILENT_EL.paused ? ' · media channel: off' : ' · media channel: on') : ''}${navigator.audioSession ? ' · session: ' + navigator.audioSession.type : ''}${SND.vol.muted ? ' · muted in game' : ''}`;
}
function sndUnlock() {
  mediaUnlock();
  // iPad Safari only starts audio from a completed tap, and only once something has actually played: a silent blip
  try { const c = SND.ctx, b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) { }
  if (SND.ctx.state !== 'running') SND.ctx.resume();
}
function sndInit() {
  if (SND.ctx) { if (SND.ctx.state !== 'running') sndUnlock(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = SND.ctx = new AC();
  SND.master = c.createGain(); SND.master.connect(c.destination);
  // a gentle room: a feedback delay, filtered, for space behind the music and ambience
  const d = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
  d.delayTime.value = 0.23; fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 2200; wet.gain.value = 0.35;
  d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(SND.master);
  SND.verb = d;
  for (const k of ['sfx', 'amb', 'mus']) { SND[k] = c.createGain(); SND[k].connect(SND.master); }
  SND.mus.connect(d); SND.amb.connect(d);
  // two seconds of white noise to shape into wind, rain, steps and swooshes
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  SND.noise = buf;
  sndApply(); ambStart(); sndUnlock();
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, sndInit, { capture: true, passive: true }));

// ---------------- building blocks ----------------
const sNow = () => SND.ctx.currentTime;
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, out = 'sfx', at = 0, detune = 0 } = {}) {
  if (!SND.ctx) return; const c = SND.ctx, t = sNow() + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune; if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  env(g, t, attack, vol, dur); o.connect(g); g.connect(SND[out]); o.start(t); o.stop(t + attack + dur + 0.05);
}
function hiss(dur, { f = 1200, q = 1, type = 'bandpass', vol = 0.3, attack = 0.005, sweep = 0, out = 'sfx', at = 0 } = {}) {
  if (!SND.ctx) return; const c = SND.ctx, t = sNow() + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SND.noise; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * sweep), t + dur);
  env(g, t, attack, vol, dur); s.connect(fl); fl.connect(g); g.connect(SND[out]); s.start(t, Math.random()); s.stop(t + attack + dur + 0.05);
}
const srnd = (a, b) => a + Math.random() * (b - a);

// ---------------- effects ----------------
const SFX = {
  step(kind) {
    if (kind === 'grass') hiss(0.07, { f: srnd(500, 800), q: 0.7, vol: 0.12, type: 'lowpass' });
    else if (kind === 'dirt') { hiss(0.06, { f: srnd(700, 1000), q: 1, vol: 0.13 }); }
    else if (kind === 'stone') { hiss(0.03, { f: srnd(2500, 3400), q: 2, vol: 0.12 }); tone(srnd(140, 180), 0.04, { type: 'triangle', vol: 0.06 }); }
    else if (kind === 'wood') { tone(srnd(110, 140), 0.09, { type: 'triangle', vol: 0.16, slide: 0.8 }); hiss(0.03, { f: 1800, vol: 0.05 }); }
    else if (kind === 'cave') { hiss(0.05, { f: srnd(1200, 1800), q: 1.5, vol: 0.1 }); }
    else if (kind === 'water') { hiss(0.14, { f: srnd(900, 1300), q: 0.8, vol: 0.16, sweep: 1.8 }); }
    else if (kind === 'snow') { hiss(0.09, { f: srnd(3000, 4000), q: 0.6, vol: 0.08, type: 'highpass' }); }
  },
  swing() { hiss(0.16, { f: 600, q: 1.5, vol: 0.2, attack: 0.04, sweep: 3 }); },
  hit(big) { tone(big ? 90 : 120, 0.14, { type: 'sine', vol: 0.4, slide: 0.5 }); hiss(0.07, { f: 1500, q: 0.8, vol: 0.25 }); },
  miss() { hiss(0.2, { f: 900, q: 2, vol: 0.12, attack: 0.05, sweep: 2.5 }); },
  kill() { tone(160, 0.25, { type: 'triangle', vol: 0.25, slide: 0.4 }); hiss(0.25, { f: 500, q: 0.7, vol: 0.15, sweep: 0.4 }); },
  twang() { tone(srnd(330, 380), 0.25, { type: 'triangle', vol: 0.18, slide: 0.85 }); hiss(0.12, { f: 2500, q: 1, vol: 0.12, attack: 0.02, sweep: 0.5 }); },
  thunk() { tone(220, 0.08, { type: 'square', vol: 0.08, slide: 0.6 }); hiss(0.06, { f: 1800, vol: 0.18 }); },
  crank() { for (let i = 0; i < 6; i++) { tone(srnd(1800, 2200), 0.02, { type: 'square', vol: 0.05, at: i * 0.06 }); hiss(0.02, { f: 3000, vol: 0.06, at: i * 0.06 }); } },
  hurt() { tone(140, 0.18, { type: 'sawtooth', vol: 0.12, slide: 0.6 }); hiss(0.1, { f: 700, vol: 0.18 }); },
  cast() { for (let i = 0; i < 5; i++) tone(660 * Math.pow(1.26, i), 0.5, { type: 'sine', vol: 0.06, at: i * 0.05, attack: 0.02 }); hiss(0.5, { f: 4000, q: 3, vol: 0.06, attack: 0.1, sweep: 0.5 }); },
  heal() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.7, { type: 'sine', vol: 0.08, at: i * 0.08, attack: 0.03 })); },
  coins() { for (let i = 0; i < 3; i++) { tone(srnd(2400, 3200), 0.12, { type: 'triangle', vol: 0.07, at: i * 0.05 }); tone(srnd(3600, 4400), 0.08, { type: 'sine', vol: 0.04, at: i * 0.05 + 0.01 }); } },
  pickup() { tone(660, 0.08, { type: 'triangle', vol: 0.1 }); tone(990, 0.1, { type: 'triangle', vol: 0.08, at: 0.06 }); },
  gather() { hiss(0.22, { f: 2200, q: 0.8, vol: 0.12, attack: 0.03 }); hiss(0.15, { f: 1400, q: 0.8, vol: 0.08, at: 0.12 }); },
  door() { tone(srnd(180, 220), 0.35, { type: 'sawtooth', vol: 0.03, slide: 1.3, attack: 0.05 }); hiss(0.3, { f: 400, q: 0.6, vol: 0.12, attack: 0.05, type: 'lowpass' }); tone(70, 0.15, { type: 'sine', vol: 0.25, at: 0.3 }); },
  bell() { for (const [f, v] of [[392, 0.18], [784, 0.08], [988, 0.05], [1175, 0.04]]) tone(f, 3.2, { type: 'sine', vol: v, attack: 0.005 }); },
  splash() { hiss(0.4, { f: 1200, q: 0.6, vol: 0.22, sweep: 0.4 }); tone(300, 0.15, { type: 'sine', vol: 0.06, slide: 2 }); },
  level() { [523, 659, 784, 1046, 1318].forEach((f, i) => { tone(f, 0.5, { type: 'triangle', vol: 0.09, at: i * 0.09 }); tone(f / 2, 0.6, { type: 'sine', vol: 0.06, at: i * 0.09 }); }); },
  click() { tone(1200, 0.025, { type: 'triangle', vol: 0.05 }); },
  thunder() { hiss(2.6, { f: 160, q: 0.5, vol: 0.5, attack: 0.02, type: 'lowpass', sweep: 0.5 }); hiss(1.2, { f: 900, q: 0.4, vol: 0.15, at: 0.05, sweep: 0.3 }); },
  pray() { [392, 494, 587].forEach((f, i) => tone(f, 1.6, { type: 'sine', vol: 0.06, at: i * 0.15, attack: 0.2 })); },
};
function sfx(name, ...a) { if (!SND.ctx || SND.vol.muted) return; try { SFX[name](...a); } catch (e) { } }

// ---------------- hooking the effects into the game ----------------
const stepKind = (m, x, y) => {
  const c = tileAt(m, x, y);
  if (S && S.snowCover > 0.35 && isOpenAir(m) && ',;f'.includes(c)) return 'snow';
  if (c === 'J') return 'wood'; if (c === 'z' || c === '~') return 'water';
  if (':XEF'.includes(c)) return 'stone'; if (c === ';' || c === '{' || c === '}') return 'dirt';
  if (c === 'w') return m.style === 'temple' ? 'stone' : 'wood';
  if (c === '.' || c === '<' || c === '>') return 'cave';
  return 'grass';
};
let lastStepT = 0;
{
  const _sm = startMove;
  startMove = function (obj, fx, fy) { const r = _sm(obj, fx, fy); if (S && obj === S.player) { const t = performance.now(); if (t - lastStepT > 90) { lastStepT = t; sfx('step', stepKind(curMap(), obj.x, obj.y)); } } return r; };
  const _attack = attack;
  attack = function (mon, opts = {}) {
    const hp = mon.hp, wt = weaponT();
    if (opts.ranged) sfx(wt && wt.cls === 'crossbow' ? 'thunk' : 'twang'); else sfx('swing');
    const r = _attack(mon, opts);
    if (mon.hp < hp) setTimeout(() => sfx(mon.hp <= 0 ? 'kill' : 'hit', hp - mon.hp >= 6), opts.ranged ? 120 : 70);
    else setTimeout(() => sfx('miss'), 60);
    return r;
  };
  const _ma = monsterAttack;
  monsterAttack = function (mon, reach) { const p = P(), hp = p.hp; const r = _ma(mon, reach); if (p.hp < hp) sfx('hurt'); return r; };
  const _fire = fire;
  fire = function () { const p = P(), was = p.cbSpent; const r = _fire(); if (was && !p.cbSpent) sfx('crank'); return r; };
  const _cast = cast;
  cast = function (id) { const p = P(), mp = p.mp; const r = _cast(id); if (p.mp < mp) sfx(['heal', 'cure', 'regen'].includes(id) ? 'heal' : 'cast'); return r; };
  const _msg = msg;
  msg = function (text, cls) {
    const r = _msg(text, cls);
    if (cls === 'level') sfx('level');
    else if (cls === 'gold' || /\bgold\b/i.test(text) && /^You (pick up|find|take)/.test(text)) sfx('coins');
    else if (/^You (pick up|take)\b/.test(text)) sfx('pickup');
    return r;
  };
  const _goMap = goMap;
  goMap = function (id, x, y) { const from = S && S.mapId; const r = _goMap(id, x, y); if (from && from !== id) { sfx('door'); if (id === 'temple') setTimeout(() => sfx('bell'), 450); ambRetarget(true); } return r; };
  if (typeof gatherForage === 'function') { const _g = gatherForage; gatherForage = function (tr) { sfx('gather'); return _g(tr); }; }
  if (typeof reel === 'function') { const _r = reel; reel = function () { const f = fishing, bite = f && f.st === 'bite'; const out = _r(); if (bite) sfx('splash'); return out; }; }
  if (typeof playAnim === 'function') { const _pa = playAnim; playAnim = function (obj, kind, toward) { if (S && obj === S.player && (kind === 'pray' || kind === 'kneel')) sfx('pray'); return _pa(obj, kind, toward); }; }
}
document.addEventListener('click', e => { if (e.target.closest('.btn, .tbtn, .hslot, button')) sfx('click'); }, true);

// ---------------- ambience: continuous beds that rise and fall with where you are ----------------
const AMB = {};
function bed(name, { f, q = 0.7, type = 'bandpass', lfo = 0 }) {
  const c = SND.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SND.noise; s.loop = true; s.playbackRate.value = 0.5 + Math.random() * 0.3;
  fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0;
  if (lfo) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = lfo; og.gain.value = f * 0.4; o.connect(og); og.connect(fl.frequency); o.start(); }
  s.connect(fl); fl.connect(g); g.connect(SND.amb); s.start();
  AMB[name] = g;
}
function ambStart() {
  bed('wind', { f: 420, q: 0.5, type: 'lowpass', lfo: 0.07 });
  bed('rain', { f: 2600, q: 0.4, type: 'highpass' });
  bed('river', { f: 900, q: 0.6, lfo: 0.3 });
  bed('fire', { f: 280, q: 0.8, type: 'lowpass' });
  bed('cave', { f: 120, q: 0.9, type: 'lowpass', lfo: 0.03 });
  ambRetarget(true); setInterval(ambTick, 400); musicLoop();
}
let ambLevels = {};
function ambRetarget(snap) {
  if (!SND.ctx || !S) return;
  const m = curMap(); if (!m) return;
  const open = isOpenAir(m), w = typeof weather === 'function' ? weather() : 'clear', night = open && typeof dayLight === 'function' ? dayLight().night : 0, p = P();
  let nearWater = 0; if (open) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (tileAt(m, p.x + dx, p.y + dy) === '~' && (m.outdoor || m.id === 'wilds')) nearWater = Math.max(nearWater, 1 - Math.hypot(dx, dy) / 8);
  ambLevels = {
    wind: open ? (w === 'storm' ? 0.5 : w === 'snow' ? 0.3 : 0.14) : (m.lit ? 0 : 0.03),
    rain: open ? (w === 'storm' ? 0.55 : w === 'rain' ? 0.3 : 0) : 0,
    river: nearWater * 0.35,
    fire: m.id === 'temple' ? 0.25 : m.id === 'parsonage' ? 0.18 : 0,
    cave: !m.lit && !m.outdoor ? 0.35 : 0,
  };
  const t = sNow();
  for (const k in AMB) AMB[k].gain.setTargetAtTime(ambLevels[k] || 0, t, snap ? 0.3 : 1.2);
}
let lastFlash = 0;
function ambTick() {
  if (!SND.ctx || !S || SND.vol.muted) return;
  const tt = $('#title'); if (tt && !tt.hidden) { for (const k in AMB) AMB[k].gain.setTargetAtTime(0, sNow(), 0.5); return; }
  ambRetarget(false);
  const m = curMap(); if (!m) return;
  const open = isOpenAir(m), w = typeof weather === 'function' ? weather() : 'clear', night = open && typeof dayLight === 'function' ? dayLight().night : 0;
  // birdsong by day, crickets by night, drips underground, a crackle by the fire
  if (open && night < 0.3 && w !== 'rain' && w !== 'storm' && w !== 'snow' && Math.random() < 0.18) { const f = srnd(2200, 3600), n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) tone(f * srnd(0.9, 1.15), 0.08, { type: 'sine', vol: 0.025, slide: srnd(0.8, 1.3), at: i * srnd(0.08, 0.14), out: 'amb' }); }
  if (open && night > 0.5 && Math.random() < 0.5) for (let i = 0; i < 3; i++) tone(4200, 0.03, { type: 'square', vol: 0.006, at: i * 0.07, out: 'amb' });
  if (!m.lit && !m.outdoor && Math.random() < 0.22) tone(srnd(900, 1500), 0.12, { type: 'sine', vol: 0.05, slide: 0.5, out: 'amb' });
  if (ambLevels.fire && Math.random() < 0.6) for (let i = 0; i < 3; i++) hiss(0.015, { f: srnd(1500, 3000), q: 1, vol: 0.05, at: Math.random() * 0.4, out: 'amb' });
  // thunder after the flash
  if (typeof wxFlash !== 'undefined' && wxFlash && wxFlash !== lastFlash) { lastFlash = wxFlash; setTimeout(() => sfx('thunder'), 300 + Math.random() * 900); }
}

// ---------------- music: slow, quiet, generated phrases that suit the place ----------------
const SCALES = {
  town: { root: 293.66, steps: [0, 2, 4, 7, 9, 12, 14], wave: 'triangle', tempo: 0.62, drone: 0 },
  wild: { root: 261.63, steps: [0, 2, 5, 7, 9, 12], wave: 'sine', tempo: 0.8, drone: 0 },
  temple: { root: 196.0, steps: [0, 4, 7, 11, 12, 16], wave: 'sine', tempo: 1.1, drone: 1 },
  deep: { root: 146.83, steps: [0, 3, 5, 7, 10, 12], wave: 'sine', tempo: 1.3, drone: 1 },
};
function musicMood() {
  const m = S && curMap(); if (!m) return null;
  if (m.id === 'temple' || m.id === 'parsonage') return 'temple';
  if (!m.lit && !m.outdoor) return 'deep';
  if (m.id === 'town' || m.id === 'hall' || m.id === 'home') return 'town';
  return 'wild';
}
function musicLoop() {
  let i = 0;
  const tick = () => {
    const tt = $('#title'), onTitle = tt && !tt.hidden, mood = onTitle ? 'temple' : musicMood();
    const sc = SCALES[mood || 'town'];
    if (SND.ctx && !SND.vol.muted && SND.vol.mus > 0 && mood) {
      // a phrase of a few notes, then rest
      if (i % 8 < 5 && Math.random() < 0.75) { const st = sc.steps[Math.floor(Math.random() * sc.steps.length)]; tone(sc.root * Math.pow(2, st / 12), sc.tempo * 2.4, { type: sc.wave, vol: 0.07, attack: 0.04, out: 'mus' }); }
      if (i % 8 === 0) { tone(sc.root / 2, sc.tempo * 7, { type: 'sine', vol: sc.drone ? 0.06 : 0.04, attack: 0.6, out: 'mus' }); if (sc.drone) tone(sc.root * 0.75, sc.tempo * 7, { type: 'sine', vol: 0.03, attack: 0.8, out: 'mus' }); }
    }
    i++;
    setTimeout(tick, (sc.tempo * 1000) * (0.85 + Math.random() * 0.3));
  };
  tick();
}

// ---------------- controls: a speaker button on the map, and sliders in Options ----------------
{
  const bar = document.getElementById('zoombar');
  if (bar) {
    const b = document.createElement('button'); b.id = 'zsnd'; b.setAttribute('aria-label', 'Sound on or off');
    const draw = () => { b.innerHTML = SND.vol.muted ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>'; b.title = SND.vol.muted ? 'Sound off (tap for sound)' : 'Sound on (tap to mute)'; };
    b.addEventListener('click', e => { e.stopPropagation(); sndInit(); SND.vol.muted = !SND.vol.muted; sndSave(); sndApply(); draw(); });
    draw(); bar.insertBefore(b, bar.firstChild); SND.redraw = draw;
  }
  const _ho = htmlOptions;
  htmlOptions = function () {
    const v = SND.vol, sl = (k, label) => `<label class="opt snd"><span><b>${label}</b></span><input type="range" min="0" max="100" value="${Math.round(v[k] * 100)}" data-snd="${k}"></label>`;
    return `<h3>Sound</h3><p class="dim" id="snd-status">${sndStatus()}</p><div class="btnrow"><button class="btn" data-sndtest="1">Play a test sound</button></div><label class="opt"><input type="checkbox" data-snd="muted" ${v.muted ? 'checked' : ''}><span><b>Mute everything</b><small>Also the speaker button on the map.</small></span></label>${sl('master', 'Overall')}${sl('sfx', 'Effects')}${sl('amb', 'Ambience')}${sl('mus', 'Music')}` + _ho();
  };
  document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.snd; if (!k || k === 'muted') return; SND.vol[k] = +e.target.value / 100; sndSave(); sndApply(); });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.snd; if (k !== 'muted') return; SND.vol.muted = e.target.checked; sndSave(); sndApply(); if (SND.redraw) SND.redraw(); });
}

document.addEventListener('click', e => {
  if (!e.target.closest('[data-sndtest]')) return;
  sndInit(); mediaUnlock();
  setTimeout(() => { sfx('bell'); const el = document.getElementById('snd-status'); if (el) el.textContent = sndStatus(); }, 120);
  setTimeout(() => { const el = document.getElementById('snd-status'); if (el) el.textContent = sndStatus(); }, 900);
});
