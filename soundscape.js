// More sound for the newer places: music of their own for the catacombs, the Midden Market, your house, the
// Endless Deep, and fights; the fountain's splash in the square, the murmur of a busy market, your own hearth,
// and hoofbeats when you ride.

Object.assign(SCALES, {
  crypt: { root: 130.81, steps: [0, 1, 5, 7, 8, 12], wave: 'sine', tempo: 1.5, drone: 1 },        // phrygian, slow, hollow
  market: { root: 220.0, steps: [0, 2, 3, 5, 7, 9, 10, 12], wave: 'triangle', tempo: 0.5, drone: 0 }, // dorian, quick and plucky
  home: { root: 261.63, steps: [0, 4, 7, 9, 12, 16], wave: 'triangle', tempo: 0.95, drone: 0 },     // warm and unhurried
  abyss: { root: 110.0, steps: [0, 2, 4, 6, 8, 10, 12], wave: 'sine', tempo: 1.6, drone: 1 },      // whole-tone: nothing resolves
  battle: { root: 164.81, steps: [0, 3, 5, 7, 8, 10, 12], wave: 'sawtooth', tempo: 0.38, drone: 1 }, // a minor, driving
});
{
  const _mm = musicMood;
  musicMood = function () {
    try {
      const m = S && curMap(); if (!m) return _mm.apply(this, arguments);
      const fight = (typeof AC !== 'undefined' && AC.on) || m.mons.some(o => (o.hunting > 0 || o.angry) && !o.peace && cheb(o, P()) <= 6);
      if (fight) return 'battle';
      if (m.id === 'myhouse') return 'home';
      if (/^cat\d/.test(m.id)) return 'crypt';
      if (m.id === 'n1') return 'market';
      if (/^x\d+$/.test(m.id)) return 'abyss';
    } catch (e) { }
    return _mm.apply(this, arguments);
  };
}
// the beds: louder or quieter for where you are
{
  const _ar = ambRetarget;
  ambRetarget = function (snap) {
    _ar.apply(this, arguments);
    try {
      if (!SND.ctx || !S) return;
      const m = curMap(), p = P(), t = sNow(), set = (k, v) => { if (AMB[k]) AMB[k].gain.setTargetAtTime(v, t, snap ? 0.3 : 1.2); };
      if (m.id === 'town' && m.fountain) { const d = Math.max(Math.abs(m.fountain[0] - p.x), Math.abs(m.fountain[1] - p.y)); if (d <= 7) set('river', Math.max(ambLevels.river || 0, 0.28 * (1 - d / 8))); }
      if (m.id === 'myhouse' && typeof hasF === 'function' && hasF('hearth')) set('fire', 0.22);
      if (m.id === 'n1') set('fire', 0.14);
      if (/^cat\d/.test(m.id)) { set('cave', 0.28); set('wind', 0.05); }
      if (/^x\d+$/.test(m.id)) { set('cave', 0.45); set('fire', 0.08); }
    } catch (e) { }
  };
}
// little sounds now and then: market chatter, the crypt's settling stone, the abyss breathing
setInterval(() => {
  try {
    if (!SND.ctx || !S || SND.vol.muted || modalOpen) return;
    const m = curMap(), p = P(); if (!m) return;
    const day = typeof dayLight === 'function' ? dayLight().night < 0.4 : true;
    const nearStalls = m.id === 'town' && day && Object.keys(m.decor).some(k => /^stall/.test(m.decor[k]) && (([x, y]) => Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) <= 8)(k.split(',').map(Number)));
    if ((nearStalls || m.id === 'n1') && Math.random() < 0.5) { const n = 2 + Math.floor(Math.random() * 4), base = srnd(140, 260); for (let i = 0; i < n; i++) tone(base * srnd(0.9, 1.25), 0.09, { type: 'triangle', vol: 0.012, at: i * srnd(0.08, 0.16), out: 'amb' }); }
    if (/^cat\d/.test(m.id) && Math.random() < 0.08) hiss(0.6, { f: 180, q: 0.7, vol: 0.06, out: 'amb' });
    if (/^x\d+$/.test(m.id) && Math.random() < 0.06) tone(55, 2.5, { type: 'sine', vol: 0.05, attack: 0.8, slide: 0.8, out: 'amb' });
  } catch (e) { }
}, 700);
// hoofbeats when you ride
{
  const _sfx = sfx;
  sfx = function (name) {
    if (name === 'step' && typeof riding === 'function' && riding() && SND.ctx && !SND.vol.muted) { try { tone(srnd(320, 380), 0.04, { type: 'square', vol: 0.03, out: 'sfx' }); tone(srnd(280, 330), 0.04, { type: 'square', vol: 0.025, at: 0.09, out: 'sfx' }); } catch (e) { } return; }
    return _sfx.apply(this, arguments);
  };
}
