// Character creation in three steps, each small enough for a phone screen:
//   1. Looks and name (Randomize changes the looks only; the dice beside the name roll a name)
//   2. Your story: your youth, the difficulty, the combat style, hardcore
//   3. Your gifts: attributes from a pool of points (or rolled), two favoured skills, and one Gift,
//      a power of your own that stays with you all game.
// Changing your appearance later (from the character sheet) opens step 1 alone.

const ATTRS = [
  ['str', 'Strength', 'Melee damage, and how much you can carry'],
  ['dex', 'Dexterity', 'Hitting what you aim at, and slipping blows'],
  ['int', 'Intelligence', 'Mana, and the power of your spells'],
  ['con', 'Constitution', 'Health, and shrugging off poison'],
];
const ATTR_MIN = 8, ATTR_MAX = 15, ATTR_POOL = 13; // 8 + 8 + 8 + 8 + 13 = 45, the same total as before
const FAV_SKILLS = 2, FAV_BONUS = 10;

// ---------------- the Gifts ----------------
const GIFTS = {
  dawnfire: { name: 'Dawnfire', icon: 'light', active: true, perDay: p => p.level >= 8 ? 2 : 1,
    desc: 'Call down Aurel’s light: it sears every foe within two steps (twice as hard against the dead) and warms your own wounds.' },
  secondwind: { name: 'Second Wind', icon: 'heal', active: true, perDay: () => 1,
    desc: 'When all seems lost, you rise: half your health back at once, your breath restored, poison and sickness shaken off.' },
  shadowstep: { name: 'Shadowstep', icon: 'phase', active: true, perDay: () => 3,
    desc: 'Vanish and step out of the dark up to six paces ahead. Whatever was hunting you loses your trail.' },
  beastfriend: { name: 'Beastfriend', icon: 'sleep', active: true, perDay: () => 2,
    desc: 'Speak softly to the wild things. Every beast in sight (wolves, boars, bats, spiders, snakes) settles down and drowses.' },
  silvertongue: { name: 'Silver Tongue', active: false,
    desc: 'People like you. Shopkeepers sell to you for less and buy from you for more, and kingdom folk warm to your gifts twice as fast.' },
  fortune: { name: 'Fortune’s Child', active: false,
    desc: 'Luck follows you: more gold from the fallen, more lucky blows, and once a day a killing stroke somehow misses.' },
};
const giftOf = () => S && P().gift && GIFTS[P().gift] ? P().gift : null;
function giftLeft() {
  const p = P(), g = GIFTS[giftOf()]; if (!g || !g.active) return 0;
  if (!p.giftUse || p.giftUse.day !== S.day) p.giftUse = { day: S.day, n: 0 };
  return Math.max(0, g.perDay(p) - p.giftUse.n);
}
function giftSlot() { const id = giftOf(); return id && GIFTS[id].active ? { kind: 'gift', id } : null; }
function giftSlotView(h) {
  const g = GIFTS[h.id], left = giftLeft();
  return { img: spriteImg(spellIcon(g.icon), 32), title: `${g.name} (your Gift), ${left} left today`, dim: left <= 0, cool: left <= 0 ? '<span class="cool">Tomorrow</span>' : '' };
}
function useGift() {
  const id = giftOf(), p = P(), m = curMap(); if (!id || modalOpen || dead) return;
  const g = GIFTS[id]; if (!g.active) return;
  if (giftLeft() <= 0) { msg(`${g.name} is spent for today. Sleep, and it will come back to you.`, 'warn'); return; }
  const used = () => { p.giftUse.n++; if (typeof sfx === 'function') { try { sfx(id === 'secondwind' ? 'heal' : 'cast'); } catch (e) { } } if (typeof cxBump === 'function') cxBump('gift'); };
  if (id === 'dawnfire') {
    const foes = m.mons.filter(o => cheb(o, p) <= 2 && monVisible(o) && !o.peace);
    if (!foes.length) { msg('There is nothing near enough to burn.', 'warn'); return; }
    used(); msg('You lift your hands and the dawn answers: white-gold fire pours down around you.', 'level');
    for (const o of foes) {
      const t = MONSTERS[o.id], d = Math.round((roll(2, 6) + p.level + Math.floor(stat('int') / 4)) * (t.undead ? 2 : 1));
      o.hp -= d; o.sleep = 0; o.hunting = 8; o.angry = 1; addFloat(o.x, o.y, d, '#ffd27a', true);
      if (o.hp <= 0) { msg(`${The(o)} burns away.`, 'kill'); if (typeof gainXp === 'function') gainXp(t.xp); killMonster(o); }
    }
    const h = Math.round(maxHp() * 0.1); p.hp = Math.min(maxHp(), p.hp + h); addFloat(p.x, p.y, '+' + h, '#8fd16a');
  } else if (id === 'secondwind') {
    used(); const h = Math.round(maxHp() / 2); p.hp = Math.min(maxHp(), p.hp + h); p.st.poison = 0; p.st.sick = 0;
    if (typeof AC !== 'undefined' && typeof staMax === 'function') AC.sta = staMax();
    addFloat(p.x, p.y, '+' + h, '#8fd16a', true); msg('You draw a long breath, and the strength comes back into you.', 'good');
  } else if (id === 'shadowstep') {
    const [dx, dy] = (typeof AC !== 'undefined' && AC.dir) || [0, 1];
    let tx = p.x, ty = p.y;
    for (let i = 1; i <= 6; i++) { const x = p.x + dx * i, y = p.y + dy * i; if (!walkable(m, x, y) || m.mons.some(o => o.x === x && o.y === y) || m.npcs.some(o => o.x === x && o.y === y)) break; if (m.links[K(x, y)] || m.trig[K(x, y)]) continue; tx = x; ty = y; }
    if (tx === p.x && ty === p.y) { msg('There is no room to step that way.', 'warn'); return; }
    used(); p.x = tx; p.y = ty;
    for (const o of m.mons) if (!o.peace) { o.hunting = 0; o.angry = 0; o.windup = 0; }
    msg('You fold into your own shadow and step out of it somewhere else.', 'good');
    computeFov(); lookHere();
  } else if (id === 'beastfriend') {
    const beasts = m.mons.filter(o => monVisible(o) && typeof BEASTS !== 'undefined' && BEASTS.has(o.id) && !MONSTERS[o.id].boss);
    if (!beasts.length) { msg('There are no beasts here to calm.', 'warn'); return; }
    used(); for (const o of beasts) { o.sleep = 14; o.hunting = 0; o.angry = 0; o.windup = 0; o.lunge = 0; }
    msg(`You hum low in your throat, the way the old hunters did. ${beasts.length > 1 ? 'The beasts' : cap(the(beasts[0]))} settle${beasts.length > 1 ? '' : 's'} and drowse.`, 'good');
  }
  endTurn(); render();
}
// the passive Gifts
{
  const _bp = buyPrice, _sp = sellPrice;
  buyPrice = function () { const v = _bp.apply(this, arguments); return giftOf() === 'silvertongue' ? Math.max(1, Math.round(v * 0.85)) : v; };
  sellPrice = function () { const v = _sp.apply(this, arguments); return giftOf() === 'silvertongue' && v > 0 ? Math.max(1, Math.round(v * 1.15)) : v; };
  const _eb = equipBonus;
  equipBonus = function (k) { const v = _eb.apply(this, arguments); return k === 'luck' && giftOf() === 'fortune' ? (v || 0) + 1 : v; };
  const _die = die;
  die = function () {
    const p = P();
    if (giftOf() === 'fortune' && p.fortuneDay !== S.day) { p.fortuneDay = S.day; p.hp = Math.max(1, Math.round(maxHp() * 0.15)); addFloat(p.x, p.y, 'lucky!', '#ffd27a', true); msg('The blow should have killed you. Somehow, impossibly, it didn’t. (Fortune’s Child: once a day)', 'level'); render(); return; }
    return _die.apply(this, arguments);
  };
}
if (typeof pol === 'function') {
  // a Silver Tongue's gifts to the kingdoms count twice
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-pl="gift"]') || giftOf() !== 'silvertongue' || typeof parleyMon === 'undefined' || !parleyMon) return;
    setTimeout(() => { try { const k = parleyMon.trader || MONSTERS[parleyMon.id].home, P_ = pol(); if (P_.gift[k] === S.day && P_.rep[k] < 3) { P_.rep[k]++; refresh(); } } catch (er) { } }, 0);
  });
}

// ---------------- the creator ----------------
let cr2Step = 1;
function crAttrsLeft() { const a = creator.attrs; return ATTR_POOL - Object.values(a).reduce((s, v) => s + (v - ATTR_MIN), 0); }
function crRollAttrs() {
  const a = { str: ATTR_MIN, dex: ATTR_MIN, int: ATTR_MIN, con: ATTR_MIN }, keys = Object.keys(a);
  for (let i = 0; i < ATTR_POOL; i++) { const open = keys.filter(k => a[k] < ATTR_MAX); a[open[Math.floor(Math.random() * open.length)]]++; }
  creator.attrs = a;
}
const _openCreatorOld = openCreator;
openCreator = function (editing) {
  _openCreatorOld(editing);
  if (!creator) return;
  creator.attrs = creator.attrs || { str: 12, dex: 11, int: 10, con: 12 };
  creator.favs = creator.favs || [];
  creator.gift = creator.gift || null;
  cr2Step = 1;
  const draw = () => {
    const L = creator.look, edit = creator.editing;
    const sw = (k, list) => `<div class="swatches" role="radiogroup">${list.map((c, i) => `<button class="sw ${L[k] === i ? 'on' : ''}" style="background:#${Array.isArray(c) ? c[0] : c}" role="radio" aria-checked="${L[k] === i}" data-a="look" data-v="${k}:${i}" aria-label="${k} ${i + 1}"></button>`).join('')}</div>`;
    const cyc = (k, list) => `<div class="cycler"><button class="btn tiny" data-a="lookcyc" data-v="${k}:-1" aria-label="Previous ${k}">◀</button><span>${list[L[k]]}</span><button class="btn tiny" data-a="lookcyc" data-v="${k}:1" aria-label="Next ${k}">▶</button></div>`;
    const steps = edit ? '' : `<div class="cr2-steps">${['Looks', 'Your story', 'Your gifts'].map((n, i) => `<button class="${cr2Step === i + 1 ? 'on' : ''} ${cr2Step > i + 1 ? 'done' : ''}" data-cr="step:${i + 1}">${i + 1}. ${n}</button>`).join('')}</div>`;
    let body = '';
    if (cr2Step === 1) {
      const gearEquip = edit ? P().equip : STARTER_LOOK_GEAR;
      body = `<div class="cr2-top"><div class="cr2-stage">${spriteImg(heroSprite(creator.gear ? gearEquip : {}, L), 120)}</div>
        <div class="cr2-id">${edit ? '' : `<label class="cr2-l" for="hero-name">Name</label><span class="namebox"><input id="hero-name" maxlength="18" value="${esc(creator.name)}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"><button type="button" class="btn dice" data-rollname="1" title="A random name" aria-label="A random name">🎲</button></span>`}
          <div class="btnrow"><button class="btn" data-cr="randlook">Randomize looks</button><label class="deliver"><input type="checkbox" data-a="crgear" ${creator.gear ? 'checked' : ''}> Gear</label></div></div></div>
        <div class="cr2-grid">
          <div class="cr2-row"><label>Skin</label>${sw('skin', LOOK.skin)}</div>
          <div class="cr2-row"><label>Hair</label>${cyc('hair', LOOK.hair)}</div>
          <div class="cr2-row"><label>Colour</label>${sw('hairColor', LOOK.hairColor)}</div>
          <div class="cr2-row"><label>Beard</label>${cyc('face', LOOK.face)}</div>
          <div class="cr2-row"><label>Accent</label>${cyc('hairFx', LOOK.hairFx)}</div>
          <div class="cr2-row"><label>Build</label>${cyc('build', LOOK.build)}</div>
          <div class="cr2-row"><label>Jaw</label>${cyc('jaw', LOOK.jaw)}</div>
          <div class="cr2-row"><label>Eyes</label>${sw('eyes', LOOK.eyes)}</div>
          <div class="cr2-row"><label>Marks</label>${cyc('mark', LOOK.mark)}</div>
          <div class="cr2-row"><label>Shirt</label>${sw('shirt', LOOK.shirt)}</div>
          <div class="cr2-row"><label>Trousers</label>${sw('pants', LOOK.pants)}</div>
          <div class="cr2-row"><label>Boots</label>${sw('boots', LOOK.boots)}</div>
        </div>`;
    } else if (cr2Step === 2) {
      body = `<div class="cr2-sec">${typeof originRow === 'function' ? originRow(creator.origin) : ''}
        <div class="cr-row cr-diff"><label>Difficulty</label><div class="diffs">${Object.entries(DIFFS).map(([k, d]) => `<button class="diff ${creator.diff === k ? 'on' : ''}" data-a="diff" data-v="${k}" aria-pressed="${creator.diff === k}"><b>${d.name}</b><small>${d.desc}</small></button>`).join('')}</div></div>
        <div class="cr-row cr-diff"><label>Combat</label><div class="diffs">${[['action', 'Live action', 'Real-time fights: swing (hold for heavy), dodge-roll, block, stamina. Foes wind up before they strike.'], ['bump', 'Classic', 'Turn by turn: walk into a foe to attack. Nothing moves until you do.']].map(([k, n, d]) => `<button class="diff ${creator.combat === k ? 'on' : ''}" data-a="crcombat" data-v="${k}" aria-pressed="${creator.combat === k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
        ${creator.diff !== 'ironman' ? `<div class="cr-row cr-hc"><label>Hardcore</label><label class="hc-opt"><input type="checkbox" data-a="hardcore" ${creator.hardcore ? 'checked' : ''}> <span><b>One life.</b> Permadeath on any difficulty: when you die, your save is erased and your hero joins the Hall of the Fallen.</span></label></div>` : ''}</div>`;
    } else {
      const a = creator.attrs, left = crAttrsLeft();
      body = `<div class="cr2-sec">
        <h3 class="cr2-h">Attributes <span class="dim">${left} point${left === 1 ? '' : 's'} left</span> <button class="btn tiny" data-cr="roll">🎲 Roll</button> <button class="btn tiny ghost" data-cr="even">Even</button></h3>
        <div class="cr2-attrs">${ATTRS.map(([k, n, d]) => `<div class="cr2-attr"><div><b>${n}</b><small>${d}</small></div><div class="cr2-num"><button class="btn tiny" data-cr="attr:${k}:-1" ${a[k] <= ATTR_MIN ? 'disabled' : ''} aria-label="Lower ${n}">−</button><span>${a[k]}</span><button class="btn tiny" data-cr="attr:${k}:1" ${a[k] >= ATTR_MAX || left <= 0 ? 'disabled' : ''} aria-label="Raise ${n}">+</button></div></div>`).join('')}</div>
        <p class="dim cr2-note">Your youth adds to these when you begin.</p>
        <h3 class="cr2-h">Favoured skills <span class="dim">pick ${FAV_SKILLS}, +${FAV_BONUS} each (${creator.favs.length}/${FAV_SKILLS})</span></h3>
        <div class="cr2-chips">${Object.entries(SKILL_DEFS).map(([k, d]) => `<button class="${creator.favs.includes(k) ? 'on' : ''}" data-cr="fav:${k}" title="${esc(d.desc)}">${d.name}</button>`).join('')}</div>
        <h3 class="cr2-h">Your Gift <span class="dim">one power that stays with you</span></h3>
        <div class="cr2-gifts">${Object.entries(GIFTS).map(([k, g]) => `<button class="cr2-gift ${creator.gift === k ? 'on' : ''}" data-cr="gift:${k}">${g.icon ? `<span class="gl">${spriteImg(spellIcon(g.icon), 28)}</span>` : '<span class="gl cr2-pass">✦</span>'}<span><b>${g.name}</b> <em>${g.active ? `${g.perDay({ level: 1 })}× a day` : 'always'}</em><small>${g.desc}</small></span></button>`).join('')}</div></div>`;
    }
    const nav = edit ? '<button class="btn" data-a="close">Cancel</button><button class="btn default" data-a="lookdone">Done</button>'
      : cr2Step === 1 ? '<button class="btn" data-a="newgame">Back</button><button class="btn default" data-cr="step:2">Next: Your story</button>'
      : cr2Step === 2 ? '<button class="btn" data-cr="step:1">Back</button><button class="btn default" data-cr="step:3">Next: Your gifts</button>'
      : `<button class="btn" data-cr="step:2">Back</button><button class="btn default" data-cr="begin" ${creator.gift ? '' : 'disabled'}>${creator.gift ? 'Begin Your Story' : 'Choose a Gift'}</button>`;
    $('#modal-body').innerHTML = `<div class="creator2">${steps}${body}</div><div class="btnrow cr-go">${nav}</div>`;
    const mb = $('#modal-body'); if (mb && mb.dataset.crStep !== String(cr2Step)) { mb.dataset.crStep = cr2Step; mb.scrollTop = 0; }
  };
  modalRefresh = draw; draw();
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cr]'); if (!b || !creator) return;
  const [k, v, w] = b.dataset.cr.split(':');
  if (k === 'step') cr2Step = +v;
  else if (k === 'randlook') {
    const L = creator.look;
    for (const key of ['skin', 'hair', 'hairColor', 'face', 'shirt', 'pants', 'boots', 'build', 'jaw', 'eyes']) L[key] = rnd(LOOK[key].length);
    L.mark = chance(0.4) ? rnd(LOOK.mark.length) : 0; L.hairFx = chance(0.25) ? rnd(LOOK.hairFx.length) : 0;
  }
  else if (k === 'roll') crRollAttrs();
  else if (k === 'even') creator.attrs = { str: 11, dex: 11, int: 11, con: 12 };
  else if (k === 'attr') { const a = creator.attrs, n = a[v] + (+w); if (n >= ATTR_MIN && n <= ATTR_MAX && (+w < 0 || crAttrsLeft() > 0)) a[v] = n; }
  else if (k === 'fav') { const f = creator.favs; if (f.includes(v)) creator.favs = f.filter(x => x !== v); else { if (f.length >= FAV_SKILLS) f.shift(); f.push(v); } }
  else if (k === 'gift') creator.gift = v;
  else if (k === 'begin') { if (!creator.gift) return; return crBegin(); }
  if (typeof sfx === 'function') { try { sfx('click'); } catch (er) { } }
  if (modalRefresh) modalRefresh();
});
function crBegin() {
  const c = creator, name = (c.name || '').trim() || 'Corin';
  newGame(name, c.look, c.diff);
  if (c.hardcore && c.diff !== 'ironman') S.hardcore = 1;
  S.opts.combat = c.combat || 'action';
  const p = P();
  p.stats = Object.assign({}, c.attrs);
  try { const sk = skillsOf(); for (const f of c.favs) if (f in sk) sk[f] = Math.min(100, sk[f] + FAV_BONUS); } catch (e) { }
  p.gift = c.gift; p.giftUse = { day: S.day, n: 0 };
  if (typeof applyOrigin === 'function') applyOrigin(c.origin);
  p.hp = maxHp(); p.mp = maxMp();
  const g = GIFTS[c.gift];
  msg(`Your Gift: ${g.name}. ${g.desc}${g.active ? ' It sits on your hotbar.' : ''}`, 'news');
  creator = null; closeModal(true); render();
}
// a hero from before Gifts existed may choose one, once, from the character sheet
{
  const _hc = htmlCharacter;
  htmlCharacter = function () {
    let html = _hc.apply(this, arguments);
    try {
      const id = giftOf();
      if (id) { const g = GIFTS[id]; html += `<h3>Your Gift</h3><div class="row"><span class="gl">${g.icon ? spriteImg(spellIcon(g.icon), 28) : '✦'}</span><div class="nm"><b>${g.name}</b><small>${g.desc}${g.active ? ` ${giftLeft()} use${giftLeft() === 1 ? '' : 's'} left today.` : ''}</small></div></div>`; }
      else html += `<h3>Your Gift</h3><p class="dim">Heroes who began their story before Gifts existed may choose one now. The choice is for good.</p><div class="cr2-gifts">${Object.entries(GIFTS).map(([k, g]) => `<button class="cr2-gift" data-giftpick="${k}">${g.icon ? `<span class="gl">${spriteImg(spellIcon(g.icon), 28)}</span>` : '<span class="gl cr2-pass">✦</span>'}<span><b>${g.name}</b><small>${g.desc}</small></span></button>`).join('')}</div>`;
    } catch (e) { }
    return html;
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-giftpick]'); if (!b || !S || giftOf()) return;
  const k = b.dataset.giftpick, g = GIFTS[k];
  if (!confirm(`Take ${g.name} as your Gift? You can only choose once.`)) return;
  P().gift = k; P().giftUse = { day: S.day, n: 0 }; msg(`Your Gift: ${g.name}. ${g.desc}`, 'news'); refresh(); render();
});
try { ACHIEVEMENTS.push(['gift', 'Gifted', 'Use your Gift 25 times.', () => (cxState().n.gift || 0) >= 25, 'life']); } catch (e) { }
