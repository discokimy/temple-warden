// The Temple Warden — games at the Sleeping Fox, and with anyone in town who'll sit down with you.
//
// BRAMBLE, the valley's card game. Two rows a side (the front line and the back line), best of three rounds: each
// turn you play a card or pass, and when both have passed the stronger side takes the round. Cards are the folk of
// Brambleford, the creatures of the four kingdoms, and the gods. Some are bonded (copies in a row multiply), some
// raise the morale of their row, spies are played to the other side and bring you two cards, healers bring back a
// fallen card, heroes stand above it all, and the gods' cards change the weather or burn the strongest.
//
// BONES, the dice game: roll three, keep any, roll the rest once more. Triples beat pairs beat the highest total.
// ARM WRESTLING: stop the swinging mark in the zone to push; your strength widens the zone.
'use strict';

// ---------------- the cards ----------------
// The cards are the valley's myths: the courts of the six gods and the Old Ones under the barrows.
// id: [name, power, row ('F' front, 'B' back, 'S' special), ability, art, court, lore]
// abilities: bond, morale, spy, medic, hero, frost, fog, clear, scorch
const CARDS = {
  // the Dawn Court of Aurel
  warden:     ['The First Warden', 10, 'F', 'hero', 'n:priest', 'dawn', 'Who kept the hearth-fire through the Long Dark, and gave the temple its name.'],
  sparedchild:['The Child the Fire Spared', 7, 'B', 'hero', 'n:girl', 'dawn', 'Some say a child walked out of the flames. Some say it has happened before.'],
  dawnknight: ['Knight of First Light', 5, 'F', '', 'n:guard', 'dawn', 'Sworn at sunrise, unsworn only at death.'],
  sentinel:   ['Dawn Sentinel', 3, 'F', 'bond', 'n:guard', 'dawn', 'They stand in threes at the temple gate, and never all sleep at once.'],
  lantern:    ['Lantern-Bearer', 2, 'B', 'morale', 'n:priest', 'dawn', 'Where the lantern goes, the brave follow.'],
  solace:     ['Sister of Solace', 2, 'B', 'medic', 'n:elsbeth', 'dawn', 'She sits with the dying until they are not.'],
  // the Wild Hunt of Veyra
  whitestag:  ['The White Stag', 6, 'B', '', 'm:deer', 'hunt', 'To see it is a blessing. To kill it is never forgiven.'],
  hound:      ['Hound of the Wild Hunt', 3, 'F', 'bond', 'm:wolf', 'hunt', 'When the horn sounds in autumn, bar the door.'],
  huntress:   ["Veyra's Huntress", 4, 'B', '', 'n:hilde', 'hunt', 'Her arrows are fletched with the feathers of birds that never were.'],
  ursa:       ['Ursa, the Old Bear', 7, 'F', '', 'm:bear', 'hunt', 'Older than the town. Older than the river, some say.'],
  greymaw:    ['Greymaw, Moon-Eater', 9, 'F', 'hero', 'm:greymaw', 'hunt', 'Every eclipse, he takes a bite.'],
  mosshag:    ['The Moss Hag', 2, 'B', 'spy', 'n:berta', 'hunt', 'She trades in names and secrets. Never tell her yours.'],
  // the Stone-Kin of Korrum
  giant:      ['Mountain Giant', 8, 'F', '', 'm:r_ogre', 'stone', 'The hills you walk on may only be sleeping.'],
  stonekin:   ['Stone-Kin Warrior', 4, 'F', 'bond', 'm:g_hob', 'stone', 'Carved, not born, and they do not tire.'],
  delver:     ['Deep Delver', 3, 'F', '', 'n:bran', 'stone', 'Dug so deep he heard the mountain breathing.'],
  runecarver: ['Rune-Carver', 3, 'B', 'morale', 'n:aldous', 'stone', 'Each rune a promise the stone remembers.'],
  // the Embers of Gharrok
  embersmith: ['The Ember Smith', 6, 'F', '', 'n:bran', 'ember', 'He forged the first blade, and the first war with it.'],
  imp:        ['Fire Imp', 2, 'F', 'bond', 'm:g_scrapper', 'ember', 'Where there is one spark, there are ten.'],
  ashshaman:  ['Ash Shaman', 3, 'B', 'morale', 'm:g_shaman', 'ember', 'Reads the future in the smoke, and does not like it.'],
  // the Still Waters of Nemora
  drowned:    ['The Drowned Maiden', 3, 'B', 'medic', 'm:h_seer', 'water', 'She gives back what the river takes, at a price.'],
  fisherking: ['The Fisher King', 5, 'F', '', 'm:h_fisher', 'water', 'He fishes for the memories of the drowned.'],
  wisp:       ['Marsh Wisp', 1, 'B', 'bond', 'm:bat', 'water', 'Follow one and you will find the others. And then the water.'],
  matriarch:  ['The Pale Matriarch', 9, 'B', 'hero', 'm:matriarch', 'water', 'Mother of the Hollowfolk, who keeps Nemora\'s secrets.'],
  // the Coils of Ssa'thal
  prophet:    ['The Coiled Prophet', 3, 'B', 'spy', 'm:s_priest', 'coil', 'Every word he speaks is true. That is what makes them dangerous.'],
  basilisk:   ['The Basilisk', 7, 'B', '', 'm:s_basilisk', 'coil', 'Do not look. Do not look. Do not —'],
  coilguard:  ['Coil-Guard', 4, 'F', 'bond', 'm:s_guard', 'coil', 'Patient as the serpent. Twice as cold.'],
  wyrm:       ['The Wyrm Beneath', 12, 'F', 'hero', 'm:wyrm', 'coil', 'All the tunnels of the deep are the paths it made.'],
  // the Old Ones of the barrows
  barrowking: ['The Barrow King', 8, 'F', '', 'm:skeleton', 'old', 'He still holds court. His courtiers still attend.'],
  restless:   ['The Restless Dead', 1, 'F', 'bond', 'm:skeleton', 'old', 'Bury them deep. Bury them twice.'],
  ratking:    ['The Rat King', 4, 'F', 'spy', 'm:r_warlock', 'old', 'A crown of tails, a court of whispers.'],
  hierophant: ['The Hollow Hierophant', 6, 'B', '', 'm:hierophant', 'old', 'He prays to a god no one remembers. It remembers him.'],
  // the gods themselves
  dawn:       ["Aurel's Dawn", 0, 'S', 'clear', 'g:aurel', 'dawn', 'And the light came over the hills, and the frost let go.'],
  frost:      ["Korrum's Winter", 0, 'S', 'frost', 'g:korrum', 'stone', 'The mountain exhales, and the front line freezes where it stands.'],
  fog:        ["Nemora's Mist", 0, 'S', 'fog', 'g:nemora', 'water', 'The archers cannot see. Neither can anything else.'],
  fire:       ["Gharrok's Wrath", 0, 'S', 'scorch', 'g:gharrok', 'ember', 'The strongest burn first.'],
  hunt:       ["Veyra's Horn", 0, 'S', 'fog', 'g:veyra', 'hunt', 'The Hunt rides through the back lines, and none stand.'],
};
const COURT = { dawn: ['Dawn Court', '#e3b93c'], hunt: ['Wild Hunt', '#5f9a4a'], stone: ['Stone-Kin', '#8a8f96'], ember: ['Embers', '#d0562a'], water: ['Still Waters', '#4a8ac0'], coil: ['The Coils', '#7a9a3a'], old: ['The Old Ones', '#8a6aa8'] };
const ABILITY_TEXT = {
  bond: 'Bonded: each copy in the same row multiplies them all.', morale: 'Morale: +1 to every other card in its row.',
  spy: "Spy: played to your opponent's side; you draw two cards.", medic: 'Healer: brings back a card from your discard pile.',
  hero: 'Legend: untouched by weather and fire.', frost: 'Winter: every front-line card on both sides counts as 1.',
  fog: 'Mist: every back-line card on both sides counts as 1.', clear: 'Dawn: clears all weather.', scorch: 'Wrath: burns the strongest card(s) on the table (legends excepted).',
};
const card = id => { const c = CARDS[id]; return { id, name: c[0], pow: c[1], row: c[2], ab: c[3], art: c[4], court: c[5], lore: c[6] }; };
const STARTER = ['sentinel', 'sentinel', 'sentinel', 'dawnknight', 'lantern', 'solace', 'hound', 'hound', 'hound', 'huntress', 'stonekin', 'stonekin', 'delver', 'runecarver', 'imp', 'imp', 'fisherking', 'wisp', 'wisp', 'mosshag', 'dawn', 'frost', 'fog', 'fire'];
const OPP_DECKS = {
  town: STARTER.concat(['embersmith', 'drowned', 'whitestag', 'restless']),
  tough: ['sentinel', 'sentinel', 'sentinel', 'dawnknight', 'dawnknight', 'warden', 'lantern', 'solace', 'ursa', 'whitestag', 'huntress', 'hound', 'hound', 'hound', 'giant', 'embersmith', 'runecarver', 'mosshag', 'drowned', 'fisherking', 'frost', 'fog', 'fire', 'dawn', 'hunt'],
  deep: ['restless', 'restless', 'restless', 'barrowking', 'ratking', 'hierophant', 'coilguard', 'coilguard', 'coilguard', 'basilisk', 'prophet', 'imp', 'imp', 'ashshaman', 'giant', 'stonekin', 'stonekin', 'matriarch', 'wisp', 'wisp', 'frost', 'fog', 'fire', 'dawn'],
};
const PACK_POOL = ['sentinel', 'dawnknight', 'lantern', 'solace', 'hound', 'huntress', 'mosshag', 'stonekin', 'delver', 'runecarver', 'imp', 'ashshaman', 'embersmith', 'drowned', 'fisherking', 'wisp', 'prophet', 'coilguard', 'restless', 'ratking', 'whitestag', 'ursa', 'giant', 'barrowking', 'hierophant', 'basilisk', 'frost', 'fog', 'fire', 'dawn', 'hunt'];
const RARE_POOL = ['warden', 'greymaw', 'matriarch', 'wyrm', 'sparedchild'];
function myCards() {
  // decks from before the cards became myths are traded in for the new starter set
  if (!S.cards || S.cards.some(id => !CARDS[id])) S.cards = STARTER.slice();
  return S.cards;
}

// ---------------- card art ----------------
const ART_CACHE = {};
function cardArt(c) {
  if (ART_CACHE[c.art]) return ART_CACHE[c.art];
  const [k, id] = c.art.split(':'); let cv = null;
  try { cv = k === 'n' ? npcCanvas(id) : k === 'm' ? monCanvas(id) : propCanvas('shrine_' + id); } catch (e) { }
  return ART_CACHE[c.art] = cv ? spriteImg(cv, 34, k === 'n' ? 'head' : undefined) : '';
}
function cardHtml(c, opts = {}) {
  const ab = c.ab ? `<i class="cg-ab cg-${c.ab}">${{ bond: '∞', morale: '+1', spy: '👁', medic: '✚', hero: '★', frost: '❄', fog: '≋', clear: '☀', scorch: '🔥' }[c.ab]}</i>` : '';
  const pw = c.row === 'S' ? '' : `<b class="cg-pow ${opts.mod != null && opts.mod !== c.pow ? (opts.mod > c.pow ? 'up' : 'down') : ''}">${opts.mod != null ? opts.mod : c.pow}</b>`;
  return `<button class="cg-card ${c.ab === 'hero' ? 'hero' : ''} ${c.row === 'S' ? 'special' : ''}" style="--court:${(COURT[c.court] || ['', '#6a5a3a'])[1]}" ${opts.act ? `data-cg="${opts.act}"` : 'tabindex="-1"'} title="${esc(c.name)} · ${esc((COURT[c.court] || [''])[0])}${c.ab ? '\n' + ABILITY_TEXT[c.ab] : ''}\n“${esc(c.lore || '')}”"><span class="cg-art">${cardArt(c)}</span>${pw}${ab}<small>${esc(c.name)}</small></button>`;
}

// ---------------- the game ----------------
let CG = null;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function newSide(deckIds) { const deck = shuffle(deckIds.map(card)); return { deck, hand: deck.splice(0, 10), rows: { F: [], B: [] }, grave: [], passed: false, lives: 2 }; }
function rowScore(g, side, r) {
  const row = g[side].rows[r], wx = r === 'F' ? g.frost : g.fog;
  return row.map(c => cardPow(g, side, r, c)).reduce((a, b) => a + b, 0);
}
function cardPow(g, side, r, c) {
  if (c.ab === 'hero') return c.pow;
  const row = g[side].rows[r], wx = r === 'F' ? g.frost : g.fog;
  let p = wx ? 1 : c.pow;
  if (c.ab === 'bond') p *= row.filter(o => o.id === c.id).length;
  p += row.filter(o => o !== c && o.ab === 'morale').length;
  return p;
}
const total = (g, side) => rowScore(g, side, 'F') + rowScore(g, side, 'B');
function playCard(g, side, idx) {
  const me = g[side], other = g[side === 'me' ? 'op' : 'me'], c = me.hand.splice(idx, 1)[0];
  const who = side === 'me' ? 'You' : g.opName;
  if (c.row === 'S') {
    if (c.ab === 'frost') g.frost = true; if (c.ab === 'fog') g.fog = true; if (c.ab === 'clear') { g.frost = g.fog = false; }
    if (c.ab === 'scorch') {
      let best = 0; const all = [];
      for (const sd of ['me', 'op']) for (const r of ['F', 'B']) for (const o of g[sd].rows[r]) if (o.ab !== 'hero') { const p = cardPow(g, sd, r, o); all.push([sd, r, o, p]); best = Math.max(best, p); }
      const burnt = all.filter(a => a[3] === best && best > 0);
      for (const [sd, r, o] of burnt) { g[sd].rows[r].splice(g[sd].rows[r].indexOf(o), 1); g[sd].grave.push(o); }
      g.say = burnt.length ? `${who} call${side === 'me' ? '' : 's'} down Gharrok's Fire: ${burnt.map(b => b[2].name).join(', ')} burn${burnt.length === 1 ? 's' : ''}.` : `${who} call${side === 'me' ? '' : 's'} down fire on an empty field.`;
    } else g.say = `${who} play${side === 'me' ? '' : 's'} ${c.name}.`;
    me.grave.push(c); return;
  }
  if (c.ab === 'spy') { other.rows[c.row].push(c); for (let i = 0; i < 2 && me.deck.length; i++) me.hand.push(me.deck.shift()); g.say = `${who} slip${side === 'me' ? '' : 's'} ${c.name} across as a spy and draw${side === 'me' ? '' : 's'} two cards.`; return; }
  me.rows[c.row].push(c);
  g.say = `${who} play${side === 'me' ? '' : 's'} ${c.name}.`;
  if (c.ab === 'medic') { const back = me.grave.filter(o => o.row !== 'S' && o.ab !== 'hero').sort((a, b) => b.pow - a.pow)[0]; if (back) { me.grave.splice(me.grave.indexOf(back), 1); me.rows[back.row].push(back); g.say += ` ${back.name} is brought back.`; } }
}
// the other player: plays to win rounds cheaply, holds cards when safely ahead, gives up a round it can't win
function opTurn(g) {
  const op = g.op, me = g.me;
  if (op.passed) return;
  const diff = total(g, 'op') - total(g, 'me');
  if (!op.hand.length) { op.passed = true; g.say = `${g.opName} has no cards left and passes.`; return; }
  if (me.passed && diff > 0) { op.passed = true; g.say = `${g.opName} passes.`; return; }
  if (!me.passed && diff >= 9 && op.hand.length <= me.hand.length + 1) { op.passed = true; g.say = `${g.opName} passes, well ahead.`; return; }
  // try each card and keep the one that does most for us
  let best = -1e9, bi = 0;
  op.hand.forEach((c, i) => {
    const sim = JSON.parse(JSON.stringify({ me: g.me, op: g.op, frost: g.frost, fog: g.fog, opName: g.opName }));
    playCard(sim, 'op', i);
    let v = (total(sim, 'op') - total(sim, 'me')) - diff;
    if (c.ab === 'spy') v += g.round === 1 ? 6 : 3;
    if (c.ab === 'hero') v -= g.round === 1 ? 4 : 0; // save the big ones
    if (me.passed && total(sim, 'op') > total(sim, 'me')) v += 20 - c.pow; // just enough to win
    if (v > best) { best = v; bi = i; }
  });
  // a hopeless round early on: let it go and keep the cards
  if (me.passed && diff + best <= 0 && g.op.lives === 2 && g.round === 1) { op.passed = true; g.say = `${g.opName} lets the round go.`; return; }
  playCard(g, 'op', bi);
}
function endRound(g) {
  const a = total(g, 'me'), b = total(g, 'op');
  if (a >= b) g.op.lives--; if (b >= a) g.me.lives--;
  g.roundLog.push(`Round ${g.round}: you ${a}, ${g.opName} ${b}${a > b ? ' — yours' : a < b ? ' — theirs' : ' — a draw'}`);
  for (const sd of ['me', 'op']) { for (const r of ['F', 'B']) { g[sd].grave.push(...g[sd].rows[r]); g[sd].rows[r] = []; } g[sd].passed = false; }
  g.frost = g.fog = false; g.round++;
  // one card each between rounds, as in the inns down the valley
  for (const sd of ['me', 'op']) if (g[sd].deck.length) g[sd].hand.push(g[sd].deck.shift());
  if (g.me.lives <= 0 || g.op.lives <= 0) finishGame(g);
}
function finishGame(g) {
  g.over = true;
  const won = g.op.lives <= 0 && g.me.lives > 0, lost = g.me.lives <= 0 && g.op.lives > 0, p = P();
  if (won) {
    p.gold += g.stake * 2;
    let prize = null;
    if (Math.random() < 0.55) { const pool = g.opDeck.filter(id => !CARDS[id][3] || CARDS[id][3] !== 'hero' || Math.random() < 0.3); prize = pool[Math.floor(Math.random() * pool.length)]; myCards().push(prize); }
    g.result = `You win${g.stake ? ` ${g.stake * 2} gold` : ''}!${prize ? ` ${g.opName} hands over a card: ${CARDS[prize][0]}.` : ''}`;
    useSkill('speech', 3);
    msg(`You beat ${g.opName} at Bramble.${prize ? ' You won ' + CARDS[prize][0] + '.' : ''}`, 'good');
  } else if (lost) { g.result = `${cap(g.opName)} wins${g.stake ? ' the pot' : ''}.`; msg(`${cap(g.opName)} beats you at Bramble.`, 'talk'); }
  else { p.gold += g.stake; g.result = 'A draw. The stakes go back.'; }
  refresh();
}
function cardBoard() {
  const g = CG, row = (sd, r) => `<div class="cg-row ${sd}" data-row="${r}"><span class="cg-rs">${rowScore(g, sd, r)}</span><span class="cg-rl">${r === 'F' ? 'Front' : 'Back'}${(r === 'F' ? g.frost : g.fog) ? (r === 'F' ? ' ❄' : ' ≋') : ''}</span><div class="cg-cards">${g[sd].rows[r].map(c => cardHtml(c, { mod: cardPow(g, sd, r, c) })).join('')}</div></div>`;
  const gems = n => '●'.repeat(Math.max(0, n)) + '○'.repeat(2 - Math.max(0, n));
  const myTurn = !g.over && !g.me.passed;
  const body = `<div class="cg">
    <div class="cg-side op"><b>${esc(cap(g.opName))}</b><span class="cg-gems">${gems(g.op.lives)}</span><span class="cg-tot">${total(g, 'op')}</span><span class="dim">${g.op.hand.length} in hand${g.op.passed ? ' · passed' : ''}</span></div>
    ${row('op', 'B')}${row('op', 'F')}
    <div class="cg-mid">${g.over ? `<b>${esc(g.result)}</b>` : esc(g.say || 'Your play.')}</div>
    ${row('me', 'F')}${row('me', 'B')}
    <div class="cg-side me"><b>You</b><span class="cg-gems">${gems(g.me.lives)}</span><span class="cg-tot">${total(g, 'me')}</span><span class="dim">Round ${Math.min(3, g.round)} · ${g.me.deck.length} in deck${g.me.passed ? ' · passed' : ''}</span></div>
    <div class="cg-hand">${g.me.hand.map((c, i) => cardHtml(c, { act: myTurn ? 'play:' + i : null })).join('')}</div>
    <div class="btnrow">${g.over ? `<button class="btn default" data-cg="again">Play again</button><button class="btn" data-a="close">Leave the table</button>` : `<button class="btn" data-cg="pass" ${myTurn ? '' : 'disabled'}>Pass</button>`}</div>
    <p class="dim cg-help">Tap a card to play it. Hover or long-press a card to read it. ${g.roundLog.join(' · ')}</p></div>`;
  $('#modal-body').innerHTML = body;
}
function cgAct(v) {
  const g = CG; if (!g) return;
  if (v === 'again') return openCardTable(g.opName, g.deckKind, g.stake);
  if (g.over) return;
  if (v === 'pass') { g.me.passed = true; g.say = 'You pass.'; }
  else if (v.startsWith('play:')) { if (g.me.passed) return; playCard(g, 'me', +v.slice(5)); }
  // the other side answers, then the round may end
  const step = () => {
    if (g.over) return cardBoard();
    if (!g.op.passed) opTurn(g);
    if (g.me.passed && !g.op.passed) { cardBoard(); return setTimeout(step, 450); }
    if ((g.me.passed && g.op.passed) || (!g.me.hand.length && g.op.passed)) { if (!g.me.hand.length) g.me.passed = true; endRound(g); if (!g.over) g.say = `Round ${g.round}. Your play.`; }
    cardBoard();
  };
  cardBoard(); setTimeout(step, 380);
}
function openCardTable(opName = 'a patron', deckKind = 'town', stake = 0) {
  const p = P();
  if (stake && p.gold < stake) { msg("You can't cover that stake.", 'warn'); stake = 0; }
  p.gold -= stake;
  const opDeck = OPP_DECKS[deckKind] || OPP_DECKS.town;
  CG = { me: newSide(myCards()), op: newSide(opDeck), round: 1, frost: false, fog: false, opName, deckKind, opDeck, stake, say: `${cap(opName)} shuffles and deals. Your play.`, roundLog: [] };
  openModal('Bramble', '', { wide: true, refresh: cardBoard }); cardBoard(); refresh();
}
// the lobby: pick a stake, or buy a pack
function openCardLobby(opName = 'a patron', deckKind = 'town') {
  const p = P(), n = myCards().length;
  const stakes = [0, 10, 25, 50].map(s => `<button class="btn ${s ? '' : 'default'}" data-cgl="${s}" ${p.gold < s ? 'disabled' : ''}>${s ? s + ' gold' : 'For fun'}</button>`).join('');
  openModal('Bramble', `<p class="lead">${esc(cap(opName))} pushes the cards across the table. “A hand of Bramble?”</p>
    <p>Two rows a side, best of three rounds. Play a card or pass each turn; when both pass, the stronger side takes the round. Win two rounds to win, and you may take one of their cards.</p>
    <div class="btnrow">${stakes}</div>
    <p class="dim">The cards are the old stories of the valley: the courts of the six gods, and the Old Ones under the barrows. Hover or long-press a card to read its tale.</p>
    <h3>Your cards (${n})</h3>${Object.entries(COURT).map(([ck, [cn, col]]) => { const ids = [...new Set(myCards())].filter(id => CARDS[id][5] === ck); return ids.length ? `<div class="cg-court"><b style="color:${col}">${cn}</b><div class="cg-coll">${ids.map(id => { const c = card(id), k = myCards().filter(x => x === id).length; return `<span class="cg-own" data-cglore="${id}">${cardHtml(c)}${k > 1 ? `<em>×${k}</em>` : ''}</span>`; }).join('')}</div></div>` : ''; }).join('')}<div id="cg-lore" class="cg-lore">Tap a card to read its tale.</div>
    <div class="btnrow"><button class="btn" data-cgl="pack" ${p.gold < 25 ? 'disabled' : ''}>Buy a pack of 4 (25 gold)</button></div>`);
  CG = { lobby: { opName, deckKind } };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cg],[data-cgl]'); if (!b || !S) return;
  if (b.dataset.cg) return cgAct(b.dataset.cg);
  const v = b.dataset.cgl, L = CG && CG.lobby;
  if (v === 'pack') {
    const p = P(); if (p.gold < 25) return; p.gold -= 25;
    const got = Array.from({ length: 4 }, (_, i) => i === 3 && Math.random() < 0.25 ? RARE_POOL[Math.floor(Math.random() * RARE_POOL.length)] : PACK_POOL[Math.floor(Math.random() * PACK_POOL.length)]);
    myCards().push(...got); msg(`You open a pack: ${got.map(id => CARDS[id][0]).join(', ')}.`, 'good'); refresh();
    return openCardLobby(L ? L.opName : 'a patron', L ? L.deckKind : 'town');
  }
  if (L) openCardTable(L.opName, L.deckKind, +v);
});
// anyone in town can be asked for a game (the dialogue system can call this)
function startCardGame(npcName) {
  const tough = /Bran|Hilde|Voss|Mirela|Garrick|auctioneer/i.test(npcName || '');
  openCardLobby(npcName || 'a patron', tough ? 'tough' : 'town');
}

// ---------------- BONES: the dice game ----------------
const DIE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let BN = null;
const roll3 = () => [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
function bonesRank(d) { const s = [...d].sort((a, b) => b - a), [a, b, c] = s; if (a === b && b === c) return [3, a, 0]; if (a === b) return [2, a, c]; if (b === c) return [2, b, a]; return [1, a + b + c, 0]; }
const rankName = r => r[0] === 3 ? `three ${r[1]}s` : r[0] === 2 ? `a pair of ${r[1]}s` : `${r[1]} in all`;
const beats = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
function openBones(opName = 'a drover', stake = 10) {
  const p = P(); if (p.gold < stake) stake = 0; p.gold -= stake;
  BN = { opName, stake, me: roll3(), keep: [false, false, false], rerolled: false, done: false };
  bonesDraw(); refresh();
}
function bonesDraw() {
  const b = BN;
  const dice = b.me.map((v, i) => `<button class="bn-die ${b.keep[i] ? 'keep' : ''}" data-bn="k${i}" ${b.rerolled || b.done ? 'disabled' : ''}>${DIE[v - 1]}</button>`).join('');
  openModal('Bones', `<p class="lead">${esc(cap(b.opName))} rattles the cup. Stake: ${b.stake} gold.</p>
    <div class="bn-dice">${dice}</div><p>${b.done ? '' : b.rerolled ? 'Your dice are set.' : 'Tap dice to keep them, then roll the rest once more, or stand.'}</p>
    ${b.done ? `<p class="lead">${b.result}</p><div class="btnrow"><button class="btn default" data-bn="again">Again (${b.stake} gold)</button><button class="btn" data-a="close">Enough</button></div>` : `<div class="btnrow"><button class="btn" data-bn="roll" ${b.rerolled ? 'disabled' : ''}>Roll the rest</button><button class="btn default" data-bn="stand">Stand</button></div>`}
    <p class="dim">Three of a kind beats a pair; a pair beats the highest total.</p>`, { refresh: bonesDraw });
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-bn]'); if (!t || !BN) return;
  const v = t.dataset.bn, b = BN, p = P();
  if (v[0] === 'k') { b.keep[+v[1]] = !b.keep[+v[1]]; return bonesDraw(); }
  if (v === 'roll') { b.me = b.me.map((d, i) => b.keep[i] ? d : 1 + Math.floor(Math.random() * 6)); b.rerolled = true; if (typeof sfx === 'function') sfx('coins'); return bonesDraw(); }
  if (v === 'again') return openBones(b.opName, b.stake);
  if (v === 'stand') {
    // the other player rolls, keeps pairs, and rolls the rest once
    let op = roll3(); const r0 = bonesRank(op); if (r0[0] < 3) { const keepV = r0[0] === 2 ? r0[1] : Math.max(...op); op = op.map(d => d === keepV ? d : 1 + Math.floor(Math.random() * 6)); }
    const mr = bonesRank(b.me), or = bonesRank(op);
    const win = beats(mr, or), lose = beats(or, mr);
    if (win) p.gold += b.stake * 2; else if (!lose) p.gold += b.stake;
    b.result = `${cap(b.opName)} rolls ${op.map(d => DIE[d - 1]).join(' ')} (${rankName(or)}). You have ${rankName(mr)}. ${win ? `You win ${b.stake * 2} gold!` : lose ? 'They take the pot.' : 'Even. Stakes back.'}`;
    b.done = true; refresh(); return bonesDraw();
  }
});

// ---------------- ARM WRESTLING ----------------
let AW = null;
function openArmWrestle(opName = 'a farmhand', stake = 10) {
  const p = P(); if (p.gold < stake) stake = 0; p.gold -= stake;
  const str = typeof stat === 'function' ? stat('str') : 12;
  AW = { opName, stake, pos: 50, t0: performance.now(), zone: 0.14 + Math.max(0, str - 10) * 0.012, opPush: 0.010 + Math.random() * 0.006, done: false, raf: 0 };
  openModal('Arm wrestling', `<p class="lead">${esc(cap(AW.opName))} plants an elbow on the table. Stake: ${stake} gold.</p>
    <div class="aw-bar"><i id="aw-pos"></i><span>You</span><span>${esc(cap(AW.opName))}</span></div>
    <div class="aw-meter"><b id="aw-zone"></b><i id="aw-mark"></i></div>
    <div class="btnrow"><button class="btn default" id="aw-push" style="min-width:160px">Push!</button></div>
    <p class="dim">Push when the mark is in the gold. Strength widens the gold.</p><p id="aw-res" class="lead"></p>`);
  const z = document.getElementById('aw-zone'); z.style.left = (50 - AW.zone * 50) + '%'; z.style.width = (AW.zone * 100) + '%';
  document.getElementById('aw-push').onclick = awPush;
  const tick = () => {
    if (!AW || AW.done || !document.getElementById('aw-mark')) return;
    const k = (Math.sin((performance.now() - AW.t0) / 260) + 1) / 2;
    document.getElementById('aw-mark').style.left = (k * 100) + '%'; AW.k = k;
    AW.pos = Math.min(100, AW.pos + AW.opPush * 16);
    document.getElementById('aw-pos').style.width = (100 - AW.pos) + '%';
    if (AW.pos >= 100) return awEnd(false);
    AW.raf = requestAnimationFrame(tick);
  };
  AW.raf = requestAnimationFrame(tick);
}
function awPush() {
  if (!AW || AW.done) return;
  const inZone = Math.abs(AW.k - 0.5) <= AW.zone / 2;
  AW.pos = Math.max(0, AW.pos - (inZone ? 9 : -3));
  if (inZone && typeof sfx === 'function') sfx('thunk');
  if (AW.pos <= 0) awEnd(true);
}
function awEnd(won) {
  AW.done = true; const p = P();
  if (won) { p.gold += AW.stake * 2; useSkill('blunt', 1); }
  const r = document.getElementById('aw-res'); if (r) r.textContent = won ? `You slam ${AW.opName}'s hand to the table! ${AW.stake ? `+${AW.stake * 2} gold.` : ''}` : `${cap(AW.opName)} pins you. ${AW.stake ? 'The stake is theirs.' : ''}`;
  const b = document.getElementById('aw-push'); if (b) { b.textContent = 'Again'; b.onclick = () => openArmWrestle(AW.opName, AW.stake); }
  msg(won ? `You win an arm-wrestle against ${AW.opName}.` : `You lose an arm-wrestle to ${AW.opName}.`, won ? 'good' : 'talk'); refresh();
}
document.addEventListener('keydown', e => { if (AW && !AW.done && e.key === ' ' && document.getElementById('aw-push')) { e.preventDefault(); e.stopImmediatePropagation(); awPush(); } }, true);

// ---------------- where to play: the tables in the Sleeping Fox ----------------
const INN_GAMES = { cards: 'A card table. A game of Bramble is always going at the Fox.', dice: 'A dice table, the cup sticky with old ale.', arm: 'A heavy oak table, scarred by elbows.' };
function innPatron() {
  const im = curMap(), folk = (im.npcs || []).filter(n => n.name && !n.resident);
  return folk.length ? folk[Math.floor(Math.random() * folk.length)].name : 'a patron';
}
{
  const _doTrigger = doTrigger;
  doTrigger = function (tr) {
    if (tr && tr.game) {
      const who = innPatron();
      if (tr.game === 'cards') return startCardGame(who);
      if (tr.game === 'dice') return openBones(who, 10);
      if (tr.game === 'arm') return openArmWrestle(who, 10);
    }
    return _doTrigger(tr);
  };
  // set the tables in the inn whenever its interior exists
  setInterval(() => {
    if (!S || !S.maps) return;
    for (const k in S.maps) {
      const im = S.maps[k]; if (!k.startsWith('in_') || im.name !== 'The Sleeping Fox' || im.gamesSet) continue;
      const tables = Object.keys(im.decor).filter(t => im.decor[t] === 'table').slice(0, 3);
      ['cards', 'dice', 'arm'].forEach((gk, i) => { if (tables[i]) im.trig[tables[i]] = { game: gk }; });
      im.gamesSet = 1;
    }
  }, 1500);
}

// tapping a card in your collection tells its tale
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cglore]'); if (!t) return;
  const c = card(t.dataset.cglore), box = document.getElementById('cg-lore'); if (!box) return;
  const [cn, col] = COURT[c.court] || ['', '#ccc'];
  box.innerHTML = `<b>${esc(c.name)}</b> <span style="color:${col}">${esc(cn)}</span>${c.row !== 'S' ? ` · ${c.pow} power, ${c.row === 'F' ? 'front line' : 'back line'}` : ''}<br><i>“${esc(c.lore)}”</i>${c.ab ? `<br><small>${ABILITY_TEXT[c.ab]}</small>` : ''}`;
});
