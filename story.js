// The rest of the story, after Halvard's journal.
//
//   II.  Four kingdoms, one traitor. Each ruler, defeated or won over, tells what they know. Three of them give a
//        piece of the truth; the fourth took the Wardens' gold, and its ruler gives up the Warden's writ, signed E.V.
//   III. The captain on the grey horse. Edric Voss gave the order to burn Ashvale. Accuse him before the council,
//        take his money, or let him run; each has consequences.
//   IV.  The door beneath. With the four seals the door opens, and in the Deep the Lord-Warden Corvane is already
//        there with his soldiers, come to wake the Wyrm and take the mithril it sleeps on.
//   V.   What sleeps. Slay the Wyrm; or, holding the Book of Dawn from Saint Edda's tomb, bind it forever.
//   Then the ending: what became of the valley, told from everything you did.
//
// State in S.story: traitor, testimony {k: 'page'|'writ'}, pages [], writ, voss ('arrested'|'fled'|'bribed'),
// corvane, book, ending ('slain'|'bound'), epilogueSeen.

const KNAME = k => cap(KINGDOMS[k].name);
const TRUTHS = [
  { title: 'The Old Treaty', text: 'Your grandfather Aldren was reeve of Ashvale, and more than that: he was the last keeper of the Old Treaty, by which the four kingdoms sealed the Deep. Every spring he came down the mountain with bread and salt, and the four sat at one table because he asked them to. When he died, no one came any more.' },
  { title: 'What the Wardens want', text: 'The Wardens do not want the mountain safe. They want what is under the door. The Wyrm sleeps on a bed of mithril older than kingdoms; wake it, drive it out, and the richest seam in the world is theirs. Aldren would not let them past. So Aldren had to go.' },
  { title: 'The Book of Dawn', text: 'Saint Edda wrote the Book of Dawn, and it was buried with her, under her own temple. It says the door will be shut forever by a child of the keeper’s blood whom the fire would not take. Halvard believed it meant you. So did the Wardens. That is why they kept asking after the boy.' },
];
const TESTIMONY_VOICE = {
  g: ['King Grotsnag', 'scratches his chin with the flat of his cleaver'],
  r: ['Mother Vesk', 'twitches her great whiskers, and a hundred rats fall silent'],
  h: ['the Pale Matriarch', 'lifts her lantern and turns her blind face toward you'],
  s: ['the Coiled Hierophant', 'regards you without blinking'],
};
const st = () => { const s = S.story; s.testimony = s.testimony || {}; s.pages = s.pages || []; return s; };
function storyTraitor() {
  const s = st(); if (s.traitor) return s.traitor;
  // the goblins were framed with a goblin knife, so it was never them
  const pool = ['r', 'h', 's'].filter(k => !S.seals[k]); s.traitor = (pool.length ? pool : ['r', 'h', 's'])[Math.floor(Math.random() * (pool.length || 3))];
  return s.traitor;
}

Object.assign(ITEMS, {
  warden_writ: { id: 'warden_writ', name: 'The Warden’s Writ', spr: 'scroll', pal: { R: '5a5f6a' }, cat: 'story', val: 0, tier: 99, wt: 0.1, use: 'writ', note: 'Grey wax, a tower seal. Signed E.V., for the Lord-Warden' },
  book_dawn: { id: 'book_dawn', name: 'The Book of Dawn', spr: 'book', pal: { b: 'e3b93c', Y: 'fff0a0' }, cat: 'story', val: 0, tier: 99, wt: 2, use: 'dawnbook', note: 'Saint Edda’s own hand. It speaks of a door, and a child' },
  greywatch_orders: { id: 'greywatch_orders', name: 'Orders from Greywatch', spr: 'scroll', pal: { R: '3a3e48' }, cat: 'story', val: 0, tier: 99, wt: 0.1, use: 'orders', note: 'Found on the Lord-Warden' },
});
for (const id of ['warden_writ', 'book_dawn', 'greywatch_orders']) if (typeof ITEM_LORE !== 'undefined') ITEM_LORE[id] = ITEMS[id].note + '.';
if (typeof ITEM_LORE !== 'undefined') { ITEM_LORE.warden_writ = 'A writ in a clerk’s hand, sealed in grey wax: payment to keep the stairs open for “our people”, and to see that “the priest” does not reach the other three. Signed E.V., for the Lord-Warden.'; ITEM_LORE.book_dawn = 'Saint Edda’s book, its pages gilded at the edge. Near the end, underlined by a much later hand: “and the door shall be shut by the keeper’s child, whom the fire would not take.”'; }

// ---------- reading the story items ----------
{
  const _ui = useItem;
  useItem = function (it) {
    const t = T(it);
    if (t.use === 'writ') { openModal('The Warden’s Writ', `<p class="lead">Grey wax, stamped with a tower. A clerk’s neat hand:</p><p>“To the bearer’s masters below: the sum agreed, in mithril-weight silver. Keep the stair to the Deep open for our people. See that the priest does not reach the other three. Burn nothing that can be read.”</p><p>“E.V., captain, for the Lord-Warden at Greywatch.”</p><p class="dim">E.V. Edric Voss sits on Brambleford’s council. He came to town eighteen years ago, with money from somewhere.</p><div class="btnrow"><button class="btn" data-a="close">Close</button></div>`); return; }
    if (t.use === 'dawnbook') { openModal('The Book of Dawn', `<p class="lead">Saint Edda wrote in a small, square hand, as if every letter had cost her something.</p><p>“Under the mountain sleeps a hunger, and four peoples hold the door against it. When the door is opened, it will be by greed; when it is shut for good, it will be by the keeper’s child, whom the fire would not take.”</p><p>“Speak the words at its waking, holding this book, and it will lie down again, and dream, and not wake while the four keep faith.”</p><p class="dim">The words follow, in the old tongue. You find you can read them.</p><div class="btnrow"><button class="btn" data-a="close">Close</button></div>`); return; }
    if (t.use === 'orders') { openModal('Orders from Greywatch', `<p>“Corvane: the boy is the only risk. If he reaches the door with the Book, all is lost. If he comes with the seals and without it, let him open the door for us, then deal with him. Wake the beast. The seam is the Crown’s ransom twice over. Voss will hold the town.”</p><div class="btnrow"><button class="btn" data-a="close">Close</button></div>`); return; }
    return _ui.apply(this, arguments);
  };
}
// Halvard's journal grows as you learn more
{
  const _rj = readJournal;
  readJournal = function () {
    _rj.apply(this, arguments);
    const s = st(), body = $('#modal-body'); if (!body) return;
    const hint = body.querySelector('.hint'); if (hint) hint.remove();
    let add = s.pages.length ? `<h3>What you have learned</h3>${s.pages.map(i => `<p><b>${TRUTHS[i].title}.</b> ${TRUTHS[i].text}</p>`).join('')}` : '';
    add += `<p class="dim">${s.writ ? 'One kingdom took the Wardens’ gold: ' + KNAME(s.traitor) + '. The writ is signed E.V.' : 'Find out which of the four kingdoms took the Wardens’ gold. Their rulers know; defeat them, or win their trust.'}</p>`;
    body.insertAdjacentHTML('beforeend', add);
  };
}

// ---------- II. testimony from the four rulers ----------
function testimony(k, how) {
  const s = st(); if (!S.story.halvard || s.testimony[k]) return;
  const traitor = storyTraitor(), [who, gesture] = TESTIMONY_VOICE[k];
  let html;
  if (k === traitor) {
    s.testimony[k] = 'writ'; s.writ = 1; addItem(makeItem('warden_writ'));
    html = how === 'peace'
      ? `<p class="lead">${cap(who)} ${gesture}, and is silent a long time. Then: “Yes. We took their silver. Grey men, from the north. They wanted the stair kept open, and the priest stopped before he reached the others.” A sealed paper is pushed across to you. “Take it. I would rather be your friend than theirs.”</p>`
      : `<p class="lead">In ${who}’s hoard, among the coin, you find a paper sealed in grey wax: the Wardens’ writ. Payment to keep the stair open, and to see that “the priest” never reached the other three.</p>`;
    html += '<p>It is signed <b>E.V., captain, for the Lord-Warden</b>. Edric Voss.</p>';
  } else {
    const idx = [0, 1, 2].find(i => !s.pages.includes(i));
    s.testimony[k] = 'page';
    if (idx != null) {
      s.pages.push(idx); const tr = TRUTHS[idx];
      html = `<p class="lead">${how === 'peace' ? `${cap(who)} ${gesture}. “The priest came to us, too. We will tell you what we told him.”` : `Among ${who}’s things is a page in Halvard’s hand, torn from his journal: what he learned here.`}</p><h3>${tr.title}</h3><p>${tr.text}</p>`;
    } else html = `<p class="lead">${cap(who)} has nothing new to tell you; you know it all already. “We did not take their gold,” is all.</p>`;
    html += `<p class="dim">${cap(KINGDOMS[k].name)} did not take the Wardens’ gold.</p>`;
  }
  openModal(`${KNAME(k)}: what they knew`, html + '<div class="btnrow"><button class="btn" data-a="close">Close</button></div>');
  msg(`You learn something in ${KINGDOMS[k].name}. (Journal updated)`, 'news');
}
{
  const _km = killMonster;
  killMonster = function (mon) {
    const live = mon && curMap().mons.includes(mon), t = live && MONSTERS[mon.id];
    const r = _km.apply(this, arguments);
    try {
      if (live && t.boss && KINGDOMS[t.home] && KINGDOMS[t.home].boss === mon.id) setTimeout(() => testimony(t.home, 'blood'), 400);
      if (live && mon.id === 'corvane') { S.story.corvane = 1; curMap().ground.push({ x: mon.x, y: mon.y, item: makeItem('greywatch_orders') }); msg('The Lord-Warden falls. Something sealed in grey wax slips from his coat.', 'level'); }
    } catch (e) { }
    return r;
  };
}
// a ruler who gives you their seal in audience tells you too
setInterval(() => { try { if (!S || !S.pol || !S.story.halvard) return; for (const k in S.pol.treaty) if (!st().testimony[k] && !modalOpen) { testimony(k, 'peace'); break; } } catch (e) { } }, 1500);
// an old save that already holds seals catches up, quietly, the first time the journal is read
function storyCatchUp() {
  const s = st(); if (!S.story.halvard || s.caught) return; s.caught = 1;
  for (const k of KINGDOM_ORDER) if ((S.bosses || {})[KINGDOMS[k].boss] && !s.testimony[k]) {
    if (k === storyTraitor()) { s.testimony[k] = 'writ'; s.writ = 1; addItem(makeItem('warden_writ')); }
    else { const idx = [0, 1, 2].find(i => !s.pages.includes(i)); s.testimony[k] = 'page'; if (idx != null) s.pages.push(idx); }
  }
}
setInterval(() => { try { if (S && S.story && S.story.halvard) storyCatchUp(); } catch (e) { } }, 3000);

// ---------- III. Edric Voss ----------
{
  const _ot = openTalk;
  openTalk = function (who) {
    const s = S && st();
    if (who === 'voss' && s && s.writ && !s.voss) return confrontVoss();
    if (who === 'voss' && s && s.voss === 'arrested') { msg('Voss is in the cells under the town hall. He does not look up.', 'talk'); return; }
    return _ot.apply(this, arguments);
  };
}
function confrontVoss() {
  const P_ = typeof parish === 'function' ? parish() : { standing: 0 }, watch = S.guild && S.guild.watch && S.guild.watch.rank >= 1;
  const strong = (P_.standing || 0) >= 3 || watch;
  openModal('Edric Voss', `<div class="keeper"><span class="gl big">${spriteImg(npcCanvas('voss'), 56)}</span><p class="lead">Voss sees the grey wax in your hand before you say a word. He does not look surprised. “Ah,” he says softly. “Halvard’s boy. I wondered which of them would sell me.”</p></div>
    <p>“You were a baby. It was an order. Your grandfather was going to ruin a great many people, and I was twenty-two and wanted to live.” He smooths a glove. “What now?”</p>
    <div class="btnrow" style="flex-direction:column;align-items:stretch">
      <button class="btn default" data-sv2="accuse">Accuse him before the council${strong ? '' : ' (they may not believe you)'}</button>
      <button class="btn" data-sv2="bribe">Listen to his offer</button>
      <button class="btn ghost" data-sv2="go">Tell him to get out of Brambleford</button>
    </div>
    <p class="hint">${strong ? 'The town trusts you' + (watch ? ', and the Watch will back you' : '') + '.' : 'Parish standing of 3 or rank in the Watch would make the council listen.'}</p>`, { noClose: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sv2]'); if (!b || !S) return;
  const s = st(), v = b.dataset.sv2, P_ = typeof parish === 'function' ? parish() : {}, watch = S.guild && S.guild.watch && S.guild.watch.rank >= 1;
  const strong = (P_.standing || 0) >= 3 || watch;
  const removeVoss = () => { for (const [n, id] of (typeof allTownFolk === 'function' ? allTownFolk() : [])) if (n.who === 'voss' || n.spr === 'voss') { const m = S.maps[id]; m.npcs = m.npcs.filter(x => x !== n); } };
  if (v === 'accuse') {
    if (strong) { s.voss = 'arrested'; removeVoss(); if (P_.standing != null) P_.standing += 2; closeModal(true);
      openModal('Before the council', `<p class="lead">The council hall is full. You read the writ aloud. Old Berta stands at the back and says, clearly, “That is the man on the grey horse.”${watch ? ' Captain Hale’s Watch is at the doors before Voss can reach them.' : ''}</p><p>Voss sits down. Then he talks, because he is a man who bargains: the Lord-Warden Corvane is coming himself, with soldiers, to open the door the moment you do. “He will be waiting for you in the Deep,” Voss says. “He always meant you to open it for him.”</p><div class="btnrow"><button class="btn" data-a="close">Close</button></div>`); }
    else { s.voss = 'fled'; removeVoss(); closeModal(true);
      openModal('Before the council', `<p class="lead">The council hears you out, and then hears Voss out, and Voss is very reasonable. They will “look into it”. By morning his house is empty and his grey horse is gone from the stable.</p><p class="dim">He rode north. You have a feeling you will see him again, somewhere below.</p><div class="btnrow"><button class="btn" data-a="close">Close</button></div>`); }
  } else if (v === 'bribe') {
    closeModal(true);
    openModal('Edric Voss', `<p class="lead">“Five hundred gold,” Voss says, “and that paper in the fire. You can mend your temple with it. Corvane will open the door with or without either of us. Why should it cost you anything?”</p><div class="btnrow"><button class="btn danger" data-sv2="takebribe">Take the gold, and burn the writ</button><button class="btn default" data-sv2="accuse">Refuse, and take it to the council</button></div>`, { noClose: true });
    return;
  } else if (v === 'takebribe') {
    s.voss = 'bribed'; P().gold += 500; const w = P().inv.find(it => it.id === 'warden_writ'); if (w) P().inv = P().inv.filter(it => it !== w);
    if (P_.standing != null) P_.standing -= 2; closeModal(true); msg('You take the gold, and the writ curls up in Voss’s fire. Somewhere, Halvard would not look at you.', 'bad');
  } else if (v === 'go') {
    s.voss = 'fled'; removeVoss(); closeModal(true); msg('Voss bows, very slightly, and is gone by morning: his house shuttered, his grey horse gone from the stable. North, they say.', 'talk');
  }
  autosave(); render();
});

// ---------- IV. the Lord-Warden in the Deep ----------
Object.assign(MONSTERS, {
  warden_soldier: { id: 'warden_soldier', name: 'Warden soldier', home: 'deep', lv: [1, 1], hp: 46, atk: 10, def: 8, dmg: [5, 12], xp: 70, verb: ['cuts', 'strikes'], gold: 25, darksight: 1, res: { slash: 0.8 } },
  voss_warden: { id: 'voss_warden', name: 'Edric Voss', home: 'deep', boss: 1, hp: 90, atk: 10, def: 7, dmg: [5, 12], xp: 300, verb: ['cuts', 'lunges at'], gold: 200, darksight: 1 },
  corvane: { id: 'corvane', name: 'Lord-Warden Corvane', home: 'deep', boss: 1, hp: 160, atk: 12, def: 9, dmg: [7, 16], xp: 700, verb: ['cleaves', 'strikes'], gold: 400, darksight: 1, summon: 'warden_soldier', res: { slash: 0.8, pierce: 0.8 } },
});
if (typeof MON_FIG !== 'undefined') Object.assign(MON_FIG, {
  warden_soldier: { build: 'adult', skin: 'e0b090', hair: 'short', hairColor: '3a2a1a', shirt: '5a5f6a', armor: 'mail', pants: '3a3e48', boots: '2a2e38', held: 'sword' },
  voss_warden: Object.assign({}, (typeof FIG_SPECS !== 'undefined' && FIG_SPECS.voss) || {}, { held: 'rapier' }),
  corvane: { build: 'broad', skin: 'd9a070', hair: 'balding', hairColor: 'c8c8c8', beard: 'full', shirt: '7a7f8a', armor: 'mail', fur: '5a5f6a', pants: '3a3e48', boots: '2a2e38', held: 'greatsword' },
});
if (typeof BEASTS !== 'undefined') ['warden_soldier', 'voss_warden', 'corvane'].forEach(id => BEASTS.delete && BEASTS.delete(id));
try { Object.assign(CX_LORE, { warden_soldier: 'Grey cloaks over good mail: the Wardens of Greywatch, who were once the Crown’s guard on the northern roads and are now nobody’s.', voss_warden: 'Edric Voss, captain of the Wardens, who gave the order at Ashvale. He came down to see it finished.', corvane: 'Maelor Corvane, Lord-Warden of Greywatch. He has waited eighteen years for someone to open this door for him.' }); } catch (e) { }
function placeWardens(m) {
  if (!m || m.id !== 'deep' || m.wardens || S.story.corvane || S.wyrmSlain) return;
  m.wardens = 1;
  const wy = m.mons.find(o => o.id === 'wyrm'); const cx = wy ? wy.x : Math.floor(m.w / 2), cy = wy ? wy.y : Math.floor(m.h / 2);
  const spots = []; for (let r = 2; r < 7 && spots.length < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(m, x, y) && !m.mons.some(o => o.x === x && o.y === y) && !spots.some(s => s[0] === x && s[1] === y)) spots.push([x, y]); }
  const put = (id, i) => { const s = spots[i]; if (s) m.mons.push(makeMonster(id, s[0], s[1])); };
  put('corvane', 0); put('warden_soldier', 1); put('warden_soldier', 2); put('warden_soldier', 3);
  if (S.story.voss === 'fled') put('voss_warden', 4);
}
{
  const _gl = genLevel;
  genLevel = function (id) { const m = _gl.apply(this, arguments); if (id === 'deep') placeWardens(m); return m; };
  const _gm = goMap;
  goMap = function (id) { const r = _gm.apply(this, arguments); try { if (id === 'deep') { placeWardens(curMap()); if (!S.story.deepIn) { S.story.deepIn = 1; msg(S.story.voss === 'fled' ? 'Torchlight ahead, and grey cloaks. The Lord-Warden Corvane turns from the sleeping Wyrm, and beside him, smoothing a glove, stands Edric Voss.' : 'Torchlight ahead, and grey cloaks. The Lord-Warden Corvane turns from the sleeping Wyrm and smiles. “Thank you for the door, boy.”', 'warn'); } } } catch (e) { } return r; };
}

// ---------- the Book of Dawn, with Saint Edda ----------
function placeBook(m) {
  if (!m || m.id !== 'cat3' || m.book || S.story.book || (P().inv || []).some(it => it.id === 'book_dawn')) return;
  m.book = 1; const r = (m.rooms || [])[m.rooms.length - 1]; if (!r) return;
  m.ground.push({ x: r.x + r.w - 2, y: r.y + 1, item: makeItem('book_dawn') });
}
{
  const _gl = genLevel; genLevel = function (id) { const m = _gl.apply(this, arguments); if (id === 'cat3') placeBook(m); return m; };
  const _gm = goMap; goMap = function (id) { const r = _gm.apply(this, arguments); try { if (id === 'cat3') placeBook(curMap()); } catch (e) { } return r; };
  const _ai = addItem; addItem = function (it) { const r = _ai.apply(this, arguments); try { if (it && it.id === 'book_dawn' && S && !S.story.book) { S.story.book = 1; setTimeout(() => msg('The Book of Dawn. Saint Edda’s own. Halvard was looking for this.', 'level'), 0); } } catch (e) { } return r; };
}

// ---------- V. the Wyrm: slay, or bind ----------
setInterval(() => {
  try {
    if (!S || S.mapId !== 'deep' || dead || modalOpen || S.wyrmSlain || S.story.ending) return;
    const w = curMap().mons.find(o => o.id === 'wyrm'); if (!w) return;
    const hasBook = (P().inv || []).some(it => it.id === 'book_dawn');
    if (hasBook && !S.story.bindAsked && w.hp < w.mhp * 0.4) {
      S.story.bindAsked = 1;
      openModal('The Wyrm falters', `<p class="lead">The Wyrm sags against the stone, its great breath slowing. The Book of Dawn is warm in your pack. You know the words.</p><p>You could finish it here. Or you could speak Edda’s words, and let it lie down and dream, and keep faith with the four kingdoms that it never wakes.</p><div class="btnrow"><button class="btn default" data-sv2end="bind">Speak the words of binding</button><button class="btn danger" data-sv2end="slay">Finish it</button></div>`, { noClose: true });
    }
  } catch (e) { }
}, 600);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sv2end]'); if (!b || !S) return;
  const m = curMap(), w = m.mons.find(o => o.id === 'wyrm');
  closeModal(true);
  if (b.dataset.sv2end === 'bind') {
    S.story.ending = 'bound'; S.wyrmSlain = true; S.wyrmBound = true; S.bosses = S.bosses || {}; S.bosses.wyrm = true;
    if (w) { m.mons = m.mons.filter(o => o !== w); m.ground.push({ x: w.x, y: w.y, item: makeItem('wyrmheart') }); }
    msg('You speak the words. The Wyrm’s eyes close. Its breath slows to the sound of a tide far off, and the stone grows over it like frost. Something it shed lies at your feet.', 'level');
    setTimeout(openEpilogue, 1500);
  }
});
setInterval(() => { try { if (S && S.wyrmSlain && !S.story.ending) { S.story.ending = 'slain'; setTimeout(openEpilogue, 2500); } } catch (e) { } }, 1000);

// ---------- the ending ----------
function epiloguePages() {
  const s = st(), p = P(), pol_ = S.pol || { treaty: {}, rep: {} }, P_ = S.parish || { standing: 0 };
  const pages = [];
  pages.push(s.ending === 'bound'
    ? ['The Door Is Shut', 'Under the mountain the Wyrm sleeps, and will sleep, while the four keep faith. The door is closed with the four seals and the old words, and the stair grows over with pale stone. Saint Edda’s book is laid back in her tomb, with a new page in it, in your hand.']
    : ['The Wyrm Is Dead', 'The Deep Wyrm is dead. The whole mountain sighs and settles, and for a week the springs in Brambleford run warm. The seam it slept on lies open; men will come for it, in time. But not the Wardens. Not now.']);
  pages.push(['Greywatch', s.corvane ? `The Lord-Warden Corvane died in the Deep with his orders in his coat. You sent them to the Crown, with the writ${s.voss === 'bribed' ? '’s ashes, which proved nothing' : ''}. The Wardens are disbanded within the year, and Greywatch’s grey towers stand empty.` : 'The Wardens never came down after all. Somewhere in the north, the Lord-Warden is still waiting for a door that will not open for him.']);
  pages.push(['Edric Voss', { arrested: 'Voss was sent north in chains to stand before the Crown’s court. He bargained, as he always did, and told them everything. It did not save him.', fled: s.corvane ? 'Voss died beside his Lord-Warden, in the dark he had paid to keep open.' : 'Voss was never seen in the valley again.', bribed: 'Voss kept his seat on the council, and his money, and his silence. You kept his gold. Some nights you think about Ashvale.' }[s.voss] || 'You never confronted Voss. He still sits on the council, smoothing his gloves, watching the square.']);
  const allies = KINGDOM_ORDER.filter(k => pol_.treaty && pol_.treaty[k]), slain = KINGDOM_ORDER.filter(k => (S.bosses || {})[KINGDOMS[k].boss]);
  pages.push(['The Four Kingdoms', allies.length >= 3 ? `The four came to one table again, for the first time since Aldren: ${allies.map(KNAME).join(', ')} by your word. You carry bread and salt down the mountain every spring now, as your grandfather did.` : allies.length ? `${allies.map(KNAME).join(' and ')} keep${allies.length > 1 ? '' : 's'} faith with you, and trade comes up the stair. ${slain.length ? `${slain.map(KNAME).join(', ')} remember${slain.length > 1 ? '' : 's'} you as the one who killed their ruler.` : ''}` : `You went through the four kingdoms with a blade. Their new rulers remember your name, and teach it to their children as a warning.`]);
  const restored = typeof worksDone === 'function' && TEMPLE_WORKS.every(w => worksDone(w.id));
  pages.push(['Brambleford', `${(P_.standing || 0) >= 4 ? 'The people of Brambleford would not hear of the cathedral sending anyone else.' : 'The cathedral sent word that the temple would stay open, for now.'} ${restored ? 'The temple roof is sound, the bell rings for the dawn office, and the pews are full on feast days.' : 'The temple still needs work, but the lamps are lit.'} ${S.guild && S.guild.watch && S.guild.watch.rank >= 3 ? 'And the Watch has a captain who has been to the bottom of the world.' : ''}`]);
  pages.push(['Halvard', 'You bring Father Halvard home and bury him in the temple yard, beside the old sun-disc, where the light comes first in the morning. Old Berta comes, and Hilde, and Rolf with a bottle. Someone carves on the stone the last line of his journal, finished at last: “Forgive me, I was right.”']);
  pages.push([`${p.name}, Warden of Brambleford`, `Level ${p.level}, day ${S.day}. ${p.kills} foes laid low.${S.hardcore ? ' One life, and you kept it.' : ''} The story is told. The valley is still here, and so are you.`]);
  return pages;
}
let epiPage = 0;
function openEpilogue() {
  if (!S) return; st().epilogueSeen = 1; epiPage = 0;
  const pages = epiloguePages();
  const draw = () => {
    const [t, txt] = pages[epiPage], last = epiPage === pages.length - 1;
    $('#modal-body').innerHTML = `<div class="epi"><div class="epi-n">${epiPage + 1} / ${pages.length}</div><h2 class="epi-t">${esc(t)}</h2><p class="epi-p">${esc(txt)}</p></div>
      <div class="btnrow">${epiPage ? '<button class="btn" data-epi="prev">Back</button>' : ''}${last ? '<button class="btn default" data-epi="done">Keep playing</button>' + (typeof startNewGamePlus === 'function' ? '<button class="btn" data-epi="ngplus">New Game+</button>' : '') : '<button class="btn default" data-epi="next">Continue</button>'}</div>`;
  };
  openModal(st().ending === 'bound' ? 'The Dawn Keeper' : 'The Wyrmslayer', '', { refresh: draw, noClose: true }); draw();
  if (typeof sfx === 'function') { try { sfx('bell'); } catch (e) { } }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-epi]'); if (!b) return;
  const v = b.dataset.epi;
  if (v === 'next') epiPage++; else if (v === 'prev') epiPage = Math.max(0, epiPage - 1);
  else if (v === 'done') { closeModal(true); msg('The story is told, but the valley goes on. You can keep playing as long as you like.', 'news'); autosave(); return; }
  else if (v === 'ngplus') { closeModal(true); startNewGamePlus(); return; }
  refresh();
});

// ---------- the journal's main quest, chapter by chapter ----------
{
  const _jq = jQuests;
  jQuests = function () {
    const out = _jq.apply(this, arguments), s = S && st(); if (!s || !S.story.halvard) return out;
    const i = out.findIndex(q => q.id === 'main'); let q = null;
    const traitorKnown = s.writ;
    if (!traitorKnown) {
      const left = KINGDOM_ORDER.filter(k => !s.testimony[k]);
      q = { title: 'Find the kingdom that took the Wardens’ gold', desc: `Halvard went to the four kingdoms to learn which had taken the Wardens’ silver. Their rulers know: defeat them, or win their trust. Still to ask: ${left.map(KNAME).join(', ')}.`, target: (() => { const k = left.find(k => S.maps[k + '1']) || left[0]; return k ? { map: k + '4', x: 0, y: 0, far: 1 } : null; })(), kicker: 'Chapter II · Four kingdoms, one traitor' };
    } else if (!s.voss) {
      const n = (() => { for (const [npc, id] of allTownFolk()) if (npc.who === 'voss' || npc.spr === 'voss') return { map: id, x: npc.x, y: npc.y }; return null; })();
      q = { title: 'Confront Edric Voss', desc: 'The writ is signed E.V. Voss sits on the council, and Old Berta remembers a captain on a grey horse. Find him in town.', target: n, kicker: 'Chapter III · The captain on the grey horse' };
    } else if (!S.story.gate) {
      const seals = KINGDOM_ORDER.filter(k => S.seals[k]).length;
      q = { title: seals < 4 ? `Gather the four seals (${seals}/4)` : 'Open the door beneath the mountain', desc: `The Lord-Warden means to open the door to the Deep. Get there first.${s.book ? ' You carry the Book of Dawn.' : ' The Book of Dawn, buried with Saint Edda in the catacombs, may let you shut it for good.'}`, target: seals < 4 ? { map: KINGDOM_ORDER.find(k => !S.seals[k]) + '4', x: 0, y: 0, far: 1 } : (S.maps.d3 && S.maps.d3.gate ? { map: 'd3', x: S.maps.d3.gate[0], y: S.maps.d3.gate[1] } : { map: 'd3', x: 0, y: 0, far: 1 }), kicker: 'Chapter IV · The door beneath' };
    } else if (!s.ending) {
      q = { title: s.corvane ? 'Face what sleeps in the Deep' : 'Stop the Lord-Warden', desc: s.corvane ? (s.book ? 'The Wyrm stirs. Hold the Book of Dawn when it falters, and you may bind it instead of killing it.' : 'The Wyrm stirs. Kill it, or find the Book of Dawn first and bind it.') : 'Corvane and his Wardens are already in the Deep, waiting to wake the Wyrm.', target: { map: 'deep', x: 0, y: 0, far: 1 }, kicker: 'Chapter V · What sleeps' };
    }
    if (q) { q = Object.assign({ id: 'main', group: 'Main quest' }, q); if (i >= 0) out[i] = q; else out.unshift(q); }
    else if (i >= 0) out.splice(i, 1);
    if (!s.book && S.story.halvard && !s.ending && (s.pages.includes(2) || S.maps.cat1)) out.push({ id: 'book', group: 'Main quest', title: 'Find the Book of Dawn', desc: 'Saint Edda’s book was buried with her, under her temple: at the bottom of the catacombs.', target: { map: 'cat3', x: 0, y: 0, far: 1 }, kicker: 'The keeper’s child' });
    return out;
  };
}
try {
  ACHIEVEMENTS.push(['traitor', 'Grey Wax', 'Find out which kingdom took the Wardens’ gold.', () => !!(S.story && S.story.writ), 'explore']);
  ACHIEVEMENTS.push(['voss', 'The Captain Unmasked', 'Bring Edric Voss before the council.', () => S.story && S.story.voss === 'arrested', 'life']);
  ACHIEVEMENTS.push(['corvane', 'The Last Lord-Warden', 'Defeat Lord-Warden Corvane.', () => !!(S.story && S.story.corvane), 'fight']);
  ACHIEVEMENTS.push(['bound', 'The Dawn Keeper', 'Bind the Wyrm with the Book of Dawn.', () => S.story && S.story.ending === 'bound', 'fight']);
} catch (e) { }
