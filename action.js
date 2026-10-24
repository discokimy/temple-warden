// The Temple Warden — real-time action combat, and game controllers.
// When something hostile is near, the world runs on its own clock: monsters move and strike whether you act or not,
// and you move faster than they do. You fight by swinging at what you face (hold for a heavy, staggering blow),
// rolling out of the way (untouchable mid-roll), and holding up your guard (a shield takes most of a blow). A foe
// flashes as it winds up to strike. Swinging, rolling and blocking cost stamina, which comes back when you pause.
// Away from danger the game goes back to its old pace, where the world moves when you do.
'use strict';

const WORLD_MS = 520;                 // one turn of the world, in real time, during a fight
const AC = { on: false, sta: 100, lastUse: 0, iUntil: 0, blocking: false, ready: 0, charge: 0, dir: [0, 1], worldT: 0, ticking: false, hinted: 0, swingFx: null };
const SWING_TIME = { dagger: 280, rapier: 300, sword: 420, axe: 520, mace: 500, flail: 520, spear: 480, halberd: 650, greatsword: 700, warhammer: 760, staff: 480, bow: 600, crossbow: 600, fist: 320 };
const staMax = () => 100 + (typeof stat === 'function' ? mod(stat('con')) * 10 : 0);
function actionOn() { return AC.on; }
// Live action (swing, dodge, block, a ticking world) or classic bump-to-attack, turn by turn. Chosen when you start.
const bumpMode = () => !!(S && S.opts && S.opts.combat === 'bump');
// classic mode: Space, Act or A strikes whatever stands next to you, the way you face first
function bumpAttack() {
  if (!canPlay()) return false;
  const m = curMap(), p = P(), [dx, dy] = AC.dir || [0, 1];
  for (const [ox, oy] of [[dx, dy], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const o = m.mons.find(o => o.x === p.x + ox && o.y === p.y + oy && monVisible(o));
    if (o) { act(ox, oy); return true; }
  }
  return false;
}
function hostileNear() {
  if (!S || dead) return false;
  const m = curMap(), p = P();
  return m.mons.some(o => (o.hunting > 0 || o.angry) && !(o.sleep > 0) && Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 9);
}
const canPlay = () => S && !dead && !modalOpen && !(typeof fishing !== 'undefined' && fishing) && !(document.getElementById('title') && !document.getElementById('title').hidden);

// walking into a monster just turns you to face it; you have to swing
function actionBump(mon) {
  if (bumpMode()) return false;
  const now = performance.now();
  if (now - AC.hinted > 6000) { AC.hinted = now; msg('Swing to attack: Space, the Swing button, or A on a controller.', 'talk'); }
  render(); return true;
}
// remember which way you're facing, diagonals included; blocking slows you to a shuffle
{
  const _act = act;
  act = function (dx, dy) {
    if (dx || dy) AC.dir = [dx, dy];
    if (AC.on && AC.blocking && (dx || dy)) { const now = performance.now(); if (now - (AC.lastBlockStep || 0) < 480) return; AC.lastBlockStep = now; }
    return _act(dx, dy);
  };
}
// during a fight only the world's own clock moves time on; your steps, swings and potions don't hand it extra turns
{
  const _endTurn = endTurn;
  endTurn = function () {
    if (AC.on && !AC.ticking) { computeFov(); render(); return; }
    return _endTurn();
  };
}

// ---------------- the swing ----------------
function swingTargets(p, m) {
  const [dx, dy] = AC.dir, rot = (d, s) => { const a = Math.atan2(d[1], d[0]) + s * Math.PI / 4; return [Math.round(Math.cos(a)), Math.round(Math.sin(a))]; };
  const wt = weaponT(), reach = wt && REACH_CLS.has(wt.cls);
  const at = (x, y) => m.mons.find(o => o.x === x && o.y === y && monVisible(o));
  for (const d of [[dx, dy], rot([dx, dy], 1), rot([dx, dy], -1)]) { const t = at(p.x + d[0], p.y + d[1]); if (t) return [t, d]; }
  if (reach) { const t = at(p.x + 2 * dx, p.y + 2 * dy); if (t && walkable(m, p.x + dx, p.y + dy)) return [t, [dx, dy]]; }
  return [null, [dx, dy]];
}
function swing(heavy) {
  if (!canPlay()) return;
  const now = performance.now(), p = P(), m = curMap(), wt = weaponT();
  if (now < AC.ready) return;
  if (wt && RANGED_CLS.has(wt.cls)) { AC.ready = now + SWING_TIME[wt.cls]; return fire(); }
  const cost = heavy ? 24 : 10;
  if (AC.sta < cost) { if (now - (AC.tiredMsg || 0) > 2500) { AC.tiredMsg = now; msg("You're too winded to swing. Catch your breath.", 'warn'); } return; }
  AC.sta -= cost; AC.lastUse = now;
  AC.ready = now + (SWING_TIME[wt ? wt.cls : 'fist'] || 450) * (heavy ? 1.45 : 1);
  const [mon, d] = swingTargets(p, m);
  setFacing(p, d[0], d[1]);
  AC.swingFx = { t0: now, d, heavy };
  if (!mon) { playAnim(p, 'atk', { x: p.x + d[0], y: p.y + d[1] }); if (typeof sfx === 'function') sfx('swing'); render(); return; }
  const hp = mon.hp;
  attack(mon);
  if (heavy && m.mons.includes(mon) && mon.hp < hp) {
    const extra = Math.max(1, Math.round((hp - mon.hp) * 0.8));
    mon.hp -= extra; mon.stagger = 2; mon.windup = 0;
    addFloat(mon.x, mon.y, extra, '#ffcf6a', true);
    msg(`A crushing blow! ${The(mon)} reels.`, 'good');
    if (mon.hp <= 0) killMonster(mon);
  }
  if (!AC.on) _actionAdvance();
  render();
}
// outside a fight, a swing still takes a moment of the world's time
function _actionAdvance() { AC.ticking = true; try { endTurn(); } finally { AC.ticking = false; } }

// ---------------- the roll ----------------
function dodge() {
  if (!canPlay() || bumpMode()) return;
  const now = performance.now(), p = P(), m = curMap();
  if (AC.sta < 18 || now < AC.iUntil) return;
  const hd = typeof heldDir === 'function' ? heldDir() : [0, 0];
  // roll the way you're moving; standing still, roll back, away from what you face
  const [dx, dy] = (hd[0] || hd[1]) ? hd : [-AC.dir[0], -AC.dir[1]];
  const free = (x, y) => walkable(m, x, y) && !m.mons.some(o => o.x === x && o.y === y) && !m.npcs.some(o => o.x === x && o.y === y) && !m.trig[K(x, y)];
  if (!free(p.x + dx, p.y + dy)) return;
  AC.sta -= 18; AC.lastUse = now; AC.iUntil = now + 430;
  const step = () => { const fx = p.x, fy = p.y; p.x += dx; p.y += dy; walkPace = true; try { startMove(p, fx, fy); } finally { walkPace = false; } computeFov(); render(); };
  step();
  setTimeout(() => { if (!dead && free(p.x + dx, p.y + dy)) step(); }, 110);
  if (typeof sfx === 'function') { hiss(0.18, { f: 900, q: 0.7, vol: 0.16, sweep: 0.5 }); }
  for (let i = 0; i < 3; i++) if (typeof FX !== 'undefined') FX.push({ k: 'dust', t0: performance.now(), x: p.x + 0.5 - dx * 0.4, y: p.y + 0.9, vx: -dx * 0.4, vy: -0.1, life: 500, r: 2 });
}

// ---------------- being struck: the wind-up, the roll, the guard ----------------
{
  const _ma = monsterAttack;
  monsterAttack = function (mon, reach) {
    if (!AC.on) return _ma(mon, reach);
    const now = performance.now(), p = P();
    if (!mon.windup) { mon.windup = now; return; }          // it draws back to strike; you have a moment
    mon.windup = 0;
    if (now < AC.iUntil) { msg(`You roll clear of ${the(mon)}.`, 'good'); addFloat(p.x, p.y, 'dodge', '#cfe6ff'); return; }
    const hp = p.hp, out = _ma(mon, reach), loss = hp - p.hp;
    if (loss > 0 && AC.blocking && AC.sta > 0 && !dead) {
      const dot = (mon.x - p.x) * AC.dir[0] + (mon.y - p.y) * AC.dir[1];
      if (dot >= 0) {
        const shield = p.equip.shield, keep = shield ? 0.15 : 0.5, back = Math.round(loss * (1 - keep));
        p.hp = Math.min(maxHp(), p.hp + back); AC.sta = Math.max(0, AC.sta - loss * (shield ? 2.5 : 4)); AC.lastUse = now;
        msg(shield ? `You take the blow on your shield.` : `You turn the blow aside.`, 'good');
        if (typeof sfx === 'function') sfx('thunk');
      }
    }
    return out;
  };
  const _ra = rangedAttack;
  rangedAttack = function (mon) { if (AC.on && performance.now() < AC.iUntil) { addFloat(P().x, P().y, 'dodge', '#cfe6ff'); return; } return _ra(mon); };
}

// ---------------- the clock, stamina, and the switch between paces ----------------
let acLast = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(200, now - acLast); acLast = now;
  if (!S || dead) { AC.on = false; return; }
  if (S.opts) S.opts.live = false; // the old idle auto-swing is replaced by all this
  const was = AC.on; AC.on = !bumpMode() && hostileNear();
  if (AC.on && !was) { AC.worldT = now; actionUi(true); }
  if (!AC.on && was) { actionUi(false); for (const o of curMap().mons) o.windup = 0; }
  // stamina comes back when you pause; holding a guard bleeds it slowly
  const mx = staMax();
  if (AC.blocking) AC.sta = Math.max(0, AC.sta - dt * 0.006);
  else if (now - AC.lastUse > 650) AC.sta = Math.min(mx, AC.sta + dt * 0.045);
  if (AC.blocking && AC.sta <= 0) AC.blocking = false;
  staBar();
  if (!AC.on || !canPlay()) return;
  if (now - AC.worldT >= WORLD_MS) {
    AC.worldT = now; AC.ticking = true;
    try { endTurn(); } catch (e) { console.error(e); } finally { AC.ticking = false; }
  }
  // a foe that has drawn back to strike but lost you has to start again
  const p = P(); for (const o of curMap().mons) if (o.windup && Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) > 1) o.windup = 0;
}, 40);

// ---------------- what you see: the stamina bar, the wind-up flash, the swing arc, the charge and the guard ----------------
function staBar() {
  let el = document.getElementById('hud-st');
  if (!el) { const mp = document.getElementById('hud-mp'); if (!mp) return; el = document.createElement('div'); el.className = 'bar st'; el.id = 'hud-st'; mp.after(el); }
  el.hidden = bumpMode(); document.body.classList.toggle('bump', bumpMode());
  const pct = Math.max(0, Math.min(100, AC.sta / staMax() * 100));
  if (el._pct !== Math.round(pct)) { el._pct = Math.round(pct); el.innerHTML = `<i style="width:${pct}%"></i>`; el.classList.toggle('low', pct < 25); }
}
{
  const _renderMap = renderMap;
  renderMap = function () {
    _renderMap.apply(this, arguments);
    if (!S || !AC.on && !AC.charge && !AC.blocking && !AC.swingFx) return;
    const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), m = curMap(), p = P(), v = visualPos(p), now = performance.now(), u = TS / 32;
    const hx = ox + (v.x + 0.5) * TS, hy = oy + (v.y + 0.55) * TS;
    ctx.save();
    // foes winding up to strike
    for (const o of m.mons) if (o.windup && monVisible(o)) {
      const ov = visualPos(o), x = ox + (ov.x + 0.5) * TS, y = oy + ov.y * TS - 4 * u, k = 0.5 + 0.5 * Math.sin(now / 60);
      ctx.fillStyle = `rgba(${typeof A11Y !== 'undefined' && A11Y.cb ? '255,190,0' : '255,70,50'},${(0.25 + 0.3 * k).toFixed(2)})`; ctx.beginPath(); ctx.arc(x, oy + (ov.y + 0.55) * TS, TS * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.font = `800 ${Math.round(TS * 0.45)}px Figtree, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#1a0a0a'; ctx.strokeText('!', x, y); ctx.fillStyle = '#ffdf6a'; ctx.fillText('!', x, y);
    }
    // the swing: a pale arc through the tiles in front
    if (AC.swingFx) {
      const f = AC.swingFx, k = (now - f.t0) / 220;
      if (k > 1) AC.swingFx = null; else {
        const a0 = Math.atan2(f.d[1], f.d[0]); ctx.strokeStyle = f.heavy ? `rgba(255,210,120,${(1 - k).toFixed(2)})` : `rgba(240,245,255,${(0.8 * (1 - k)).toFixed(2)})`; ctx.lineWidth = (f.heavy ? 6 : 4) * u;
        ctx.beginPath(); ctx.arc(hx, hy, TS * 0.95, a0 - 0.9 + k * 0.4, a0 + 0.9 * (k * 2 - 1)); ctx.stroke();
      }
    }
    // charging a heavy blow: a ring that fills
    if (AC.charge) { const k = Math.min(1, (now - AC.charge) / 450); ctx.strokeStyle = k >= 1 ? 'rgba(255,210,110,0.95)' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(hx, hy, TS * 0.62, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
    // the guard: a shield arc on the side you face
    if (AC.blocking) { const a0 = Math.atan2(AC.dir[1], AC.dir[0]); ctx.strokeStyle = p.equip.shield ? 'rgba(170,210,255,0.85)' : 'rgba(220,220,220,0.6)'; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.arc(hx, hy, TS * 0.7, a0 - 0.8, a0 + 0.8); ctx.stroke(); }
    // rolling: a faint blur of invulnerability
    if (now < AC.iUntil) { ctx.fillStyle = 'rgba(200,225,255,0.18)'; ctx.beginPath(); ctx.arc(hx, hy, TS * 0.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  };
  // keep drawing while something is animating
  const loop = () => { requestAnimationFrame(loop); if (S && (AC.charge || AC.swingFx || AC.blocking || (AC.on && curMap().mons.some(o => o.windup)) || performance.now() < AC.iUntil)) renderMap(); };
  requestAnimationFrame(loop);
}

// ---------------- keyboard ----------------
const chargeStart = () => { if (bumpMode()) { bumpAttack(); return; } if (!canPlay() || AC.charge) return; AC.charge = performance.now(); };
const chargeRelease = () => { if (!AC.charge) return; const held = performance.now() - AC.charge; AC.charge = 0; swing(held >= 450); };
document.addEventListener('keydown', e => {
  if (!S || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
  if (e.key === ' ') { if (modalOpen) return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) chargeStart(); return; }
  const k = e.key.toLowerCase();
  if (k === 'z' && !modalOpen) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) dodge(); return; }
  if (k === 'x' && !modalOpen) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && AC.sta > 5) AC.blocking = true; return; }
}, true);
document.addEventListener('keyup', e => {
  if (e.key === ' ') { e.preventDefault(); chargeRelease(); }
  if (e.key.toLowerCase() === 'x') AC.blocking = false;
}, true);
window.addEventListener('blur', () => { AC.charge = 0; AC.blocking = false; });

// ---------------- touch: Swing / Dodge / Block, shown while a fight is on ----------------
function actionUi(show) {
  let pad = document.getElementById('actpad');
  if (!pad) {
    pad = document.createElement('div'); pad.id = 'actpad';
    pad.innerHTML = `<button id="act-block" aria-label="Block (hold)">Block</button><button id="act-dodge" aria-label="Dodge">Dodge</button><button id="act-swing" aria-label="Swing (hold for heavy)">Swing</button>`;
    (document.getElementById('mapwrap') || document.body).appendChild(pad);
    const sw = pad.querySelector('#act-swing'), bl = pad.querySelector('#act-block'), dg = pad.querySelector('#act-dodge');
    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    sw.addEventListener('pointerdown', e => { stop(e); if (typeof sndInit === 'function') sndInit(); chargeStart(); });
    sw.addEventListener('pointerup', e => { stop(e); chargeRelease(); }); sw.addEventListener('pointerleave', () => chargeRelease()); sw.addEventListener('click', stop);
    dg.addEventListener('pointerdown', e => { stop(e); dodge(); }); dg.addEventListener('click', stop);
    bl.addEventListener('pointerdown', e => { stop(e); if (AC.sta > 5) AC.blocking = true; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bl.addEventListener(ev, () => { AC.blocking = false; });
    bl.addEventListener('click', stop);
  }
  pad.classList.toggle('show', !!show);
}

// ---------------- game controllers ----------------
// left stick or D-pad moves; A swing (hold for heavy), B dodge, LB/LT block, X pick up, RT shoot, RB first spell,
// Y inventory, Start options, Back/Select the map
const PAD = { prev: [], dir: null, lastNotice: 0 };
window.addEventListener('gamepadconnected', e => { if (S) msg(`Controller connected: ${e.gamepad.id.replace(/\(.*\)/, '').trim() || 'gamepad'}. Left stick moves, A swings, B rolls, LB blocks.`, 'news'); });
function padTick() {
  requestAnimationFrame(padTick);
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; if (!pads.length || !S) return;
  const g = pads[0], b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5)), was = i => !!PAD.prev[i], down = i => b(i) && !was(i), up = i => !b(i) && was(i);
  if (typeof sndInit === 'function' && g.buttons.some(x => x.pressed)) sndInit();
  // movement: steer like a finger drag
  let x = g.axes[0] || 0, y = g.axes[1] || 0;
  if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
  const mag = Math.hypot(x, y);
  if (!modalOpen && mag > 0.45) {
    const oct = Math.round(Math.atan2(y, x) / (Math.PI / 4)), dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], [dx, dy] = dirs[(oct + 8) % 8];
    const start = typeof driving !== 'undefined' && !driving;
    if (typeof driving !== 'undefined') { driving = { dx, dy }; if (start && typeof stepNow === 'function' && performance.now() - lastStep >= curPace()) { holdSteps = 0; stepNow(true); } }
  } else if (typeof driving !== 'undefined' && driving && PAD.dir) driving = null;
  PAD.dir = mag > 0.45;
  if (modalOpen) {
    // in a window: B closes it, Start too
    if (down(1) || down(9)) closeModal();
  } else {
    if (down(0)) chargeStart(); if (up(0)) chargeRelease();
    if (down(1)) dodge();
    const blk = b(4) || b(6); if (blk && !AC.blocking && AC.sta > 5) AC.blocking = true; if (!blk && (was(4) || was(6))) AC.blocking = false;
    if (down(2)) getAction();
    if (down(7)) fire();
    if (down(5)) { const p = P(), sp = (p.favSpells || p.spells)[0]; if (sp) cast(sp); }
    if (down(3)) openHero('inv');
    if (down(9)) openModal('Options', htmlOptions());
  }
  PAD.prev = g.buttons.map(x => x.pressed || x.value > 0.5);
}
requestAnimationFrame(padTick);

// ---------------- feel: hit-stop, shake, knockback, the hurt flash, and lunging hunters ----------------
const FEEL = { shakeUntil: 0, shakeMag: 0, flashUntil: 0 };
function shake(ms, mag) { FEEL.shakeUntil = Math.max(FEEL.shakeUntil, performance.now() + ms); FEEL.shakeMag = Math.max(FEEL.shakeMag, mag); }
function hitStop(ms) { AC.worldT += ms; AC.ready += ms * 0.5; }
(function feelLoop() {
  requestAnimationFrame(feelLoop);
  const c = typeof cvs !== 'undefined' && cvs; if (!c) return;
  const now = performance.now();
  if (now < FEEL.shakeUntil && !reduceMotion) { const k = (FEEL.shakeUntil - now) / 200, m = FEEL.shakeMag * Math.min(1, k); c.style.transform = `translate(${((Math.random() - 0.5) * m).toFixed(1)}px, ${((Math.random() - 0.5) * m).toFixed(1)}px)`; }
  else if (c.style.transform) { c.style.transform = ''; FEEL.shakeMag = 0; }
  let v = document.getElementById('hurt-flash');
  if (now < FEEL.flashUntil) { if (!v) { v = document.createElement('div'); v.id = 'hurt-flash'; v.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;box-shadow:inset 0 0 90px 30px rgba(190,20,20,0.55);'; (document.getElementById('mapwrap') || document.body).appendChild(v); } v.style.opacity = ((FEEL.flashUntil - now) / 300).toFixed(2); }
  else if (v) v.style.opacity = '0';
})();
{
  // landing a blow: a stutter of hit-stop, a jolt for a heavy one, and heavy blows knock the target back a step
  const _atk = attack;
  attack = function (mon, opts = {}) {
    const hp = mon.hp, out = _atk(mon, opts);
    if (mon.hp < hp && AC.on) { const big = hp - mon.hp >= 6 || (AC.swingFx && AC.swingFx.heavy); hitStop(big ? 110 : 55); if (big) shake(160, 5); }
    return out;
  };
  const _sw = swing;
  swing = function (heavy) {
    const p = P(), m = curMap(), [mon] = canPlay() ? swingTargets(p, m) : [null], hp = mon && mon.hp;
    _sw(heavy);
    if (heavy && mon && m.mons.includes(mon) && mon.hp < hp && !MONSTERS[mon.id].boss) {
      const dx = Math.sign(mon.x - p.x), dy = Math.sign(mon.y - p.y), nx = mon.x + dx, ny = mon.y + dy;
      if (walkable(m, nx, ny) && !m.mons.some(o => o.x === nx && o.y === ny) && !(p.x === nx && p.y === ny)) { const fx = mon.x, fy = mon.y; mon.x = nx; mon.y = ny; startMove(mon, fx, fy); }
    }
  };
  // being hurt: a jolt and a red edge to the world
  const _ma2 = monsterAttack;
  monsterAttack = function (mon, reach) { const p = P(), hp = p.hp, out = _ma2(mon, reach); if (p.hp < hp) { shake(220, 7); FEEL.flashUntil = performance.now() + 300; } return out; };
}
// hunters that lunge: fast beasts gather themselves a few tiles off, then leap in and strike
const LUNGERS = new Set(['wolf', 'boar', 'h_hound', 'greymaw', 'bear', 'r_skulker', 'h_stalker']);
setInterval(() => {
  if (!AC.on || !canPlay()) return;
  const m = curMap(), p = P(), now = performance.now();
  for (const o of m.mons) {
    if (!LUNGERS.has(o.id) || o.sleep > 0 || !(o.hunting > 0 || o.angry)) continue;
    const d = Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y));
    if (o.lunge) {
      if (now - o.lunge < 650) continue;
      o.lunge = 0;
      if (d < 2 || d > 4) continue;
      // leap to the tile beside you and strike at once, unless you've rolled clear
      const tx = p.x - Math.sign(p.x - o.x) * 1, ty = p.y - Math.sign(p.y - o.y) * 1;
      const lx = o.x + Math.sign(p.x - o.x) * (d - 1), ly = o.y + Math.sign(p.y - o.y) * (d - 1);
      const [ax, ay] = walkable(m, lx, ly) && !m.mons.some(q => q !== o && q.x === lx && q.y === ly) ? [lx, ly] : [tx, ty];
      if (!walkable(m, ax, ay) || m.mons.some(q => q !== o && q.x === ax && q.y === ay) || (ax === p.x && ay === p.y)) continue;
      const fx = o.x, fy = o.y; o.x = ax; o.y = ay; startMove(o, fx, fy);
      if (monVisible(o)) msg(`${The(o)} leaps at you!`, 'warn');
      o.windup = now - 1000; monsterAttack(o);
      continue;
    }
    if (d >= 2 && d <= 4 && monVisible(o) && !o.lungeCd && Math.random() < 0.3) { o.lunge = now; o.lungeCd = 6; o.windup = 0; if (typeof sfx === 'function') hiss(0.3, { f: 300, q: 2, vol: 0.12, sweep: 1.6 }); }
  }
}, 100);
{
  // a crouched hunter is marked like a wind-up
  const _rm = renderMap;
  renderMap = function () {
    _rm.apply(this, arguments);
    if (!S || !AC.on) return;
    const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height), now = performance.now();
    for (const o of curMap().mons) if (o.lunge && monVisible(o)) {
      const v = visualPos(o), x = ox + (v.x + 0.5) * TS, y = oy + (v.y + 0.9) * TS, k = (now - o.lunge) / 650;
      ctx.strokeStyle = `rgba(255,140,40,${(0.4 + 0.5 * k).toFixed(2)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, TS * (0.6 - k * 0.2), TS * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
    }
  };
}
