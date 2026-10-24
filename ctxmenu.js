// The Temple Warden — right-click (or long-press) menus on everything: people, creatures, things on the ground,
// buildings, stations, water, and the items in your pack. Choosing an action from afar walks you there first.
'use strict';

const DECOR_NAMES = {
  furnace: "the forge", anvil: 'an anvil', grindstone: 'a grindstone', weaponrack: 'a weapon rack', quench: 'a quench tub', woodpile: 'a woodpile',
  cauldron: "Tamsin's cauldron", herbrack: 'a drying rack of herbs', crystal: 'a humming crystal', well: 'the well', lamppost: 'a street lamp',
  stallR: 'a market stall', stallB: 'a market stall', bench: 'a bench', barrel: 'a barrel', crate: 'a crate', sacks: 'sacks of grain', pots: 'clay pots',
  hay: 'a bale of hay', trough: 'a water trough', podium: "the auctioneer's stand", chopblock: "the butcher's block", meatrack: 'a rack of hams',
  rail: 'a split-rail fence', railv: 'a split-rail fence', railpost: 'a fence post', oak: 'a tree', flowers: 'flowers', banner: 'a banner',
};
const DECOR_TEXT = {
  furnace: 'A stone forge with a hooded flue. The coals never quite go out.', anvil: 'A heavy anvil on an oak stump, its face bright from use.',
  quench: 'A tub of black water for quenching hot iron. The tongs are still in it.', well: 'A deep stone well. The water is cold and sweet.',
  lamppost: 'An iron street lamp. Someone lights them all at dusk.', podium: 'A stand for the auctioneer, with a brass bell to start the bidding.',
  chopblock: 'A thick block of elm, scarred by a thousand cuts. A cleaver is buried in it.', hay: 'Sweet-smelling hay, bound with twine.',
};
const STATION_OF = { furnace: 'forge', anvil: 'forge', cauldron: 'bench', herbrack: 'bench', crystal: 'altar' };

// ---- the menu itself ----
let ctxEl = null;
function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }
function showCtx(x, y, title, items) {
  closeCtx();
  items = items.filter(Boolean);
  if (!items.length) return;
  const el = document.createElement('div'); el.className = 'ctx'; el.setAttribute('role', 'menu');
  el.innerHTML = (title ? `<div class="ctx-t">${esc(title)}</div>` : '') + items.map((it, i) => `<button role="menuitem" data-ci="${i}" ${it.off ? 'disabled' : ''}>${esc(it.label)}</button>`).join('');
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px';
  el.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
  el.addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (!b) return; e.stopPropagation(); const it = items[+b.dataset.ci]; closeCtx(); it.fn(); });
  ctxEl = el;
  const first = el.querySelector('button:not([disabled])'); if (first) first.focus({ preventScroll: true });
}
document.addEventListener('pointerdown', e => { if (ctxEl && !e.target.closest('.ctx')) closeCtx(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ctxEl) { closeCtx(); e.stopPropagation(); } }, true);

// ---- walking somewhere, then doing something ----
let autoWalk = null;
function pathTo(tx, ty, adjacent) {
  const m = curMap(), p = P(), seen = new Map([[K(p.x, p.y), null]]), q = [[p.x, p.y]];
  const goal = (x, y) => adjacent ? Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= 1 : x === tx && y === ty;
  if (goal(p.x, p.y)) return [];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy, k = K(nx, ny);
      if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      if (!walkable(m, nx, ny) || m.trig[k] || m.npcs.some(o => o.x === nx && o.y === ny) || m.mons.some(o => o.x === nx && o.y === ny)) { if (!goal(nx, ny)) continue; }
      if (dx && dy && (!walkable(m, x + dx, y) || !walkable(m, x, y + dy))) continue; // no cutting corners
      seen.set(k, K(x, y));
      if (goal(nx, ny)) { const path = []; for (let c = k; c && c !== K(p.x, p.y); c = seen.get(c)) path.unshift(c.split(',').map(Number)); return path; }
      q.push([nx, ny]);
      if (seen.size > 6000) return null;
    }
  }
  return null;
}
function walkThen(tx, ty, adjacent, then) {
  autoWalk = null;
  const path = pathTo(tx, ty, adjacent);
  if (!path) { msg("You can't find a way there."); return; }
  const job = { path, then }; autoWalk = job;
  const step = () => {
    if (autoWalk !== job || modalOpen || dead) return;
    const p = P(), m = curMap();
    if (m.mons.some(o => monVisible(o) && (o.hunting || o.angry) && cheb(o, p) <= 6) && job.path.length) { msg('You stop: something is coming.', 'warn'); autoWalk = null; return; }
    if (!job.path.length) { autoWalk = null; if (then) then(); return; }
    const [nx, ny] = job.path.shift();
    const bx = p.x, by = p.y;
    if (!job.path.length && adjacent) { autoWalk = null; if (then) then(); return; }
    walkPace = true; act(Math.sign(nx - p.x), Math.sign(ny - p.y)); walkPace = false;
    if (p.x === bx && p.y === by) { autoWalk = null; return; } // something got in the way
    setTimeout(step, curPace());
  };
  step();
}
const faceAndAct = (tx, ty) => { const p = P(); act(Math.sign(tx - p.x), Math.sign(ty - p.y)); };
const reachThen = (tx, ty, fn) => { const p = P(); if (Math.max(Math.abs(tx - p.x), Math.abs(ty - p.y)) <= 1) fn(); else walkThen(tx, ty, true, fn); };

// ---- what a map tile offers ----
function tileMenu(tx, ty) {
  const m = curMap(), p = P(), k = K(tx, ty), items = [];
  if (!m.lit && !m.outdoor && !(m.seen && m.seen[ty * m.w + tx])) return { title: 'Darkness', items: [{ label: 'Examine', fn: () => msg('You can’t see what is there.') }] };
  const mon = m.mons.find(o => o.x === tx && o.y === ty && monVisible(o));
  const npc = m.npcs.find(o => o.x === tx && o.y === ty);
  const ground = m.ground.filter(g => g.x === tx && g.y === ty && canSee(tx, ty));
  const dc = m.decor[k], trig = m.trig[k], c = tileAt(m, tx, ty);
  let title = '';
  if (mon) {
    const t = MONSTERS[mon.id], wt = weaponT();
    title = cap(mname(mon));
    items.push({ label: 'Attack', fn: () => { if (cheb(mon, p) <= 1) faceAndAct(tx, ty); else if (wt && RANGED_CLS.has(wt.cls) && inRange(mon)) { targetUid = mon.uid; targetPinned = true; fire(); } else walkThen(tx, ty, true, () => faceAndAct(mon.x, mon.y)); } });
    if (inRange(mon)) items.push({ label: 'Target', fn: () => { targetUid = mon.uid; targetPinned = true; renderMap(); msg(`Target: ${the(mon)}.`); } });
    items.push({ label: 'Examine', fn: () => msg(`${cap(mname(mon))}. ${mon.hp >= mon.mhp ? 'Unhurt' : mon.hp > mon.mhp / 2 ? 'Wounded' : 'Badly wounded'}${mon.sleep > 0 ? ', asleep' : mon.hunting ? ', hunting you' : ', unaware of you'}.${t.desc ? ' ' + t.desc : ''}`) });
  } else if (npc) {
    const who = whoOf(npc);
    title = cap(npc.name);
    if (!npc.animal) items.push({ label: 'Talk', fn: () => reachThen(npc.x, npc.y, () => faceAndAct(npc.x, npc.y)) });
    if (npc.shop) items.push({ label: 'Trade', fn: () => reachThen(npc.x, npc.y, () => openShop(npc.shop)) });
    if (npc.animal) items.push({ label: 'Pet', fn: () => reachThen(npc.x, npc.y, () => msg(pick(npc.lines), 'talk')) });
    items.push({ label: 'Examine', fn: () => msg(who && PEOPLE[who] && PEOPLE[who].blurb ? PEOPLE[who].blurb : `${cap(npc.name)}.`) });
  }
  for (const g of ground) {
    const name = g.gold ? `${g.gold} gold` : g.mat ? `${g.q > 1 ? g.q + ' ' : ''}${MATS[g.mat].name}` : g.item ? itemName(g.item) : g.story ? 'a body' : 'something';
    if (!title) title = cap(name);
    items.push({ label: `Pick up ${name}`, fn: () => { if (p.x === tx && p.y === ty) getAction(); else walkThen(tx, ty, false, () => getAction()); } });
    if (g.item) items.push({ label: `Examine ${name}`, fn: () => msg(`${itemName(g.item)}: ${itemDesc(g.item)}`) });
  }
  if (dc && !mon && !npc) {
    const nm = dc.startsWith('sign:') ? 'a sign' : DECOR_NAMES[dc] || ('a ' + dc.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
    if (!title) title = cap(nm.replace(/^(a|an|the) /, ''));
    const st = STATION_OF[dc];
    if (st && m.id === 'town') items.push({ label: st === 'forge' ? 'Work the forge' : st === 'bench' ? 'Brew here' : 'Work runes here', fn: () => reachThen(tx, ty, () => { craftView = st; openCraft ? openCraft(st) : null; }) });
    if (dc.startsWith('shrine_') || (trig && trig.shrine)) items.push({ label: 'Pray', fn: () => reachThen(tx, ty, () => faceAndAct(tx, ty)) });
    items.push({ label: dc.startsWith('sign:') ? 'Read' : 'Examine', fn: () => msg(trig && trig.text ? trig.text : DECOR_TEXT[dc] || `${cap(nm)}.`, trig && trig.text ? 'talk' : '') });
  }
  if (trig && !dc && !npc) {
    if (trig.go || trig.dlg || trig.shop) {
      if (!title) title = trig.go ? 'A way through' : 'A door';
      items.push({ label: trig.go ? 'Go through' : trig.dlg === 'locked' ? 'Knock' : 'Enter', fn: () => reachThen(tx, ty, () => faceAndAct(tx, ty)) });
      if (trig.text) items.push({ label: 'Examine', fn: () => msg(trig.text, 'talk') });
    }
  }
  if ((c === '~' || c === 'z') && !title) {
    title = c === 'z' ? 'The shallows' : 'Water';
    if (typeof hasRod === 'function' && hasRod()) items.push({ label: 'Fish here', fn: () => reachThen(tx, ty, () => faceAndAct(tx, ty)) });
  }
  if (tx === p.x && ty === p.y) {
    title = title || 'Yourself';
    items.push({ label: 'Inventory', fn: () => openInventory() });
    items.push({ label: 'Wait a moment', fn: () => { endTurn(); render(); } });
  } else if (walkable(m, tx, ty) && !mon && !npc && !trig) items.push({ label: 'Walk here', fn: () => walkThen(tx, ty, false) });
  if (!items.length || !title) {
    const what = { ',': 'Grass', f: 'Wildflowers', ';': 'A dirt path', ':': 'Cobblestones', '.': 'Stone floor', '#': 'Rock', '^': 'A cliff', Q: 'A building', T: 'A tree', Y: 'Thick woods', J: 'The bridge', w: 'Floorboards', Z: 'The town wall' }[c] || 'Here';
    title = title || what;
    if (!items.some(i => i.label === 'Examine')) items.push({ label: 'Examine', fn: () => msg(`${what}.`) });
  }
  return { title, items };
}

// ---- what an item in your pack offers ----
function invMenu(key) {
  const p = P(), items = [];
  if (key.startsWith('mat:')) {
    const id = key.slice(4), M = MATS[id];
    items.push({ label: 'Examine', fn: () => { invSel = key; refresh(); } });
    items.push({ label: `Drop all ${M.name}`, fn: () => { const n = p.mats[id]; if (n > 0) { curMap().ground.push({ x: p.x, y: p.y, mat: id, q: n }); p.mats[id] = 0; msg(`You drop ${n} ${M.name}.`); refresh(); } } });
    return { title: M.name, items };
  }
  if (key.startsWith('eq:')) {
    const sl = key.slice(3), it = p.equip[sl]; if (!it) return null;
    items.push({ label: 'Take off', fn: () => { unequip(sl); refresh(); } });
    items.push({ label: 'Examine', fn: () => { invSel = key; refresh(); } });
    return { title: itemName(it), items };
  }
  const it = p.inv.find(o => o.uid === key); if (!it) return null;
  const t = T(it);
  if (t.slot) items.push({ label: 'Equip', fn: () => { equip(it); refresh(); } });
  if (t.use || t.cat === 'potion' || t.cat === 'scroll' || t.cat === 'food' || t.cat === 'book' || t.cat === 'tool') items.push({ label: t.cat === 'food' ? 'Eat' : t.cat === 'potion' ? 'Drink' : t.cat === 'book' || t.cat === 'scroll' ? 'Read' : 'Use', fn: () => { useItem(it); if (modalOpen) refresh(); } });
  items.push({ label: 'Examine', fn: () => { invSel = key; refresh(); } });
  items.push({ label: it.q > 1 ? 'Drop one' : 'Drop', fn: () => {
    if (it.q > 1) { it.q--; curMap().ground.push({ x: p.x, y: p.y, item: Object.assign({}, it, { q: 1, uid: 'u' + Math.random().toString(36).slice(2) }) }); }
    else { p.inv = p.inv.filter(o => o !== it); curMap().ground.push({ x: p.x, y: p.y, item: it }); }
    msg(`You drop ${itemName({ ...it, q: 1 })}.`); refresh();
  } });
  if (it.q > 1) items.push({ label: 'Drop all', fn: () => { p.inv = p.inv.filter(o => o !== it); curMap().ground.push({ x: p.x, y: p.y, item: it }); msg(`You drop ${itemName(it)}.`); refresh(); } });
  return { title: itemName(it), items };
}

// ---- wiring: right-click with a mouse, a long press on a touch screen ----
function ctxAt(e, x, y) {
  if (!S || dead) return false;
  const cell = e.target.closest && e.target.closest('.cell[data-a="isel"]');
  if (cell) { const mm = invMenu(cell.dataset.v); if (mm) showCtx(x, y, mm.title, mm.items); return true; }
  if (e.target === cvs && !modalOpen) {
    const r = cvs.getBoundingClientRect(), [ox, oy] = viewOffset(r.width, r.height);
    const tx = Math.floor((x - r.left - ox) / TS), ty = Math.floor((y - r.top - oy) / TS);
    const mm = tileMenu(tx, ty); if (mm) showCtx(x, y, mm.title, mm.items);
    return true;
  }
  return false;
}
document.addEventListener('contextmenu', e => { if (ctxAt(e, e.clientX, e.clientY)) e.preventDefault(); });
let pressT = null, pressAt = null, pressFired = false;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  pressFired = false; pressAt = [e.clientX, e.clientY];
  clearTimeout(pressT);
  pressT = setTimeout(() => { if (ctxAt(e, pressAt[0], pressAt[1])) { pressFired = true; if (navigator.vibrate) navigator.vibrate(10); } }, 480);
});
document.addEventListener('pointermove', e => { if (pressAt && Math.hypot(e.clientX - pressAt[0], e.clientY - pressAt[1]) > 10) clearTimeout(pressT); });
document.addEventListener('pointerup', () => clearTimeout(pressT));
// a long press shouldn't also count as a tap
document.addEventListener('click', e => { if (pressFired) { pressFired = false; if (!e.target.closest('.ctx')) { e.stopPropagation(); e.preventDefault(); } } }, true);
