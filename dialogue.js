// The Temple Warden — conversations: what the townsfolk say, and what you can say back.
// The engine (topics, greetings, follow-up answers) sits on top of the talk window in parish.js;
// the words themselves are the DIALOGUE data further down, one entry per person in people.js.
//
// A line is a string (speech; quotes are added) or '~narration', or an object:
//   { t, min, max, if: 'found !seals:1 phase:Night', learn: 'ledger fact', flag, ask: { opts: [{ tone, l, r, tr, learn, flag }] } }
// Topics: intro, greet, bye, how, self, work (+workLabel), news, halvard, caves, gods, gossip,
// about: { personId: [lines] }, extra: { key: { label, if, seq, lines } }.
'use strict';

const DIALOGUE = {};
(function dlgStyles() {
  const css = `
#modal-body .tk-head { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; }
#modal-body .tk-head .gl { flex: none; width: 44px; height: 44px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #3a2f22, #15111c 70%); border: 1px solid var(--line-strong, rgba(255,255,255,0.2)); }
#modal-body .tk-head .talk-role { margin: 0; }
#modal-body .tk-ex { display: flex; flex-direction: column; gap: 8px; margin: 0 0 4px; }
#modal-body .ex { line-height: 1.5; }
#modal-body .ex b { display: block; font: 600 10px var(--display); letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); margin-bottom: 2px; }
#modal-body .ex.you { align-self: flex-end; max-width: 85%; padding: 6px 10px; border-radius: 12px 12px 4px 12px; background: rgba(255, 205, 107, 0.08); border: 1px solid rgba(255, 205, 107, 0.22); color: #efe2c4; }
#modal-body .ex.you b { color: var(--gold, #ffcd6b); text-align: right; }
#modal-body .ex.them { align-self: flex-start; max-width: 92%; padding: 8px 12px; border-radius: 12px 12px 12px 4px; background: rgba(255,255,255,0.05); border: 1px solid var(--line, rgba(255,255,255,0.1)); }
#modal-body .ex.narr { color: var(--dim); font-style: italic; padding: 0 2px; }
#modal-body .dlg-topics { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line, rgba(255,255,255,0.1)); }
#modal-body .dlg-topics .btn { justify-content: flex-start; text-align: left; white-space: normal; height: auto; min-height: 34px; padding: 6px 10px; line-height: 1.25; }
#modal-body .dlg-topics .btn.thread { font-style: italic; }
#modal-body .dlg-topics .btn.has-new, #modal-body .dlg-people .btn.has-new { border-color: rgba(255,255,255,0.14); }
#modal-body .dlg-topics .btn.more { justify-content: center; color: var(--dim); }
#modal-body .dlg-foot { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
#modal-body .dlg-foot .sp { flex: 1; }
#modal-body .dlg-people { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line, rgba(255,255,255,0.1)); }
#modal-body .dlg-ask { margin-top: 12px; }
#modal-body .need { padding: 8px 10px; margin: 6px 0; }
#modal-body h3.tk-needs { margin: 12px 0 4px; font-size: 13px; }
@media (max-width: 820px) { #modal-body .dlg-topics { grid-template-columns: repeat(2, minmax(0, 1fr)); } #modal-body .ex.you { max-width: 92%; } }`;
  const el = document.createElement('style'); el.id = 'dialogue-css'; el.textContent = css;
  (document.head || document.documentElement).appendChild(el);
})();
const DLG_TONES = { kind: 'Kind', blunt: 'Blunt', pious: 'Pious', joke: 'Joking', curious: 'Curious' };
// talk alone builds trust only so far, and only a little each day; the rest is earned through duties
const DLG_TRUST_CAP = 3;
const DLG_TOPICS = [
  ['how', 'How are you?'], ['self', 'Tell me about yourself'], ['work', null], ['news', 'What\'s the news?'],
  ['halvard', 'About Father Halvard…'], ['caves', 'About the caves'], ['gods', 'About the gods'],
  ['gossip', 'Any gossip?'], ['people', 'About someone…'], ['family', 'Your family…'], ['origin', 'Where are you from?'],
];
const DLG_FALLBACK = {
  how: ['Well enough, Acolyte. Well enough.', 'Oh, you know. Getting by.', 'Busy. Tired. The usual.'],
  news: ['Nothing new, that I\'ve heard.', 'Same as yesterday. Wolves, weather and the council.'],
  halvard: ['I hope he\'s found soon. The temple isn\'t the same without him.'],
  caves: ['I keep well clear of that road. You should too.'],
  gods: ['I leave a bit of bread for Aurel at midwinter, same as anyone.'],
  gossip: ['I don\'t carry tales. Well. Not to the temple.'],
  work: ['It\'s a living.'],
  self: ['~You talk a while about nothing much. It\'s pleasant.'],
  bye: ['Aurel keep you.', 'Mind how you go.', 'Until next time.'],
  greet: ['Acolyte.', 'Oh, hello.', 'Good to see you.'],
};
const DLG_PHASE_GREET = {
  Dawn: 'Up with the sun, Acolyte? Aurel would approve.', Morning: 'Morning.', Midday: 'Good day to you.',
  Afternoon: 'Afternoon, Acolyte.', Evening: 'Evening. Lamps will want lighting soon.', Dusk: 'Getting dark. You\'re out late.', Night: 'It\'s late, Acolyte. Is something wrong?',
};

// ---- your youth: how you spent it while Halvard raised you (customize.js); old saves were raised in the temple ----
const dlgOrigin = () => (S && S.player && S.player.origin) || 'temple';
// lines that remember it, merged into each person's topics when the page loads (data at the bottom of this file)
const ORIGIN_LINES = {};
// the people you grew up among already know you a little
const ORIGIN_TRUST = {
  temple: { berta: 2, marta: 2, pippa: 2, tamsin: 1, rolf: 1, hester: 1 },
  forge: { bran: 2, ned: 2, hilde: 1, abel: 1, garrick: 1 },
  hunt: { hobb: 2, wil: 2, garrick: 1, mirela: 1, ewan: 1 },
  farm: { hobb: 2, jory: 2, ewan: 1, fenwick: 1, hedda: 1 },
  cathedral: { anselm: 2, aldous: 2, mortimer: 1 },
};
// given once per life: as soon as the origin is chosen (or, for a game begun before origins, once it's under way)
function dlgOriginTrust() {
  if (!S || !S.player) return;
  const P_ = parish();
  if (P_.originTrust || (!S.player.origin && S.turn < 50)) return;
  P_.originTrust = dlgOrigin();
  for (const [who, n] of Object.entries(ORIGIN_TRUST[P_.originTrust] || {})) P_.trust[who] = Math.max(P_.trust[who] || 0, n);
}
window.addEventListener('load', () => {
  for (const [who, topics] of Object.entries(ORIGIN_LINES)) {
    const d = DIALOGUE[who] || (DIALOGUE[who] = {});
    for (const [k, lines] of Object.entries(topics)) d[k] = (d[k] || []).concat(lines);
  }
});

// ---- Bramble, the card game (minigames.js): who'll play a hand, when, and what they say ----
// play: a condition (dialogue.js tokens) that must hold, or 'never'; yes: said as the cards come out; no: said when they won't
const BRAMBLE = {
  anselm: { play: 'never', no: ['Cards? I\'m afraid the cathedral counts those as a vice. I count them as a ledger I\'d lose.', 'Not while I\'m keeping the tally. Though I confess the Dawn Court cards are better theology than half the sermons I\'ve sat through.'] },
  bran: { play: 'duty:bran_dace', yes: ['Sit. I lead with The Ember Smith and I lead hard. Don\'t whine.', 'One hand. Takes my mind off things. Ada liked the Stone-Kin. Said they were her people.'], no: ['~He doesn\'t look up from the anvil. “Not with my boy out there. Ask me when I can sleep.”'] },
  hilde: { play: 'night', yes: ['At the Fox, after dark, like civilised people. I hold the Knight of First Light back till the third round. Now you know. It won\'t help you.', 'Shields up. Dawn Sentinels on the front row, always.'], no: ['Cards are for the Fox, after dark. Not my counter.'] },
  tamsin: { yes: ['Sister of Solace. Healer\'s card. Of course I keep it. Deal.', 'I can still see the pips. Mostly. My mother said the Moss Hag was a herbwife nobody thanked. I play her out of sympathy.'] },
  mirela: { yes: ['~She shuffles without looking, very fast. “The Moss Hag is not a hag. She is a woman who lived in the woods and was right about things. I always play her.”', 'Nemora\'s Mist on the third row. Remember I warned you.'] },
  aldous: { yes: ['Bramble! Splendid. The Rune-Carver is historically inaccurate and I play him anyway.', 'The First Warden card, you know, is based on a real person. Probably. Is it my deal? It\'s always my deal.'] },
  wendell: { yes: ['I never lose at Bramble. I invest in other people\'s winnings. Deal.', 'The Fisher King! Lovely card. Expensive-looking. Marta counts the purse.'] },
  marta: { play: 'night', yes: ['After the ovens are banked, then. One hand. Aurel\'s Dawn clears the weather. I always keep one.', 'Lantern-Bearer first. My grandmother said every hand should open with a light.'], no: ['In the middle of the bake? You\'ve flour on your sense. Come by at dusk.'] },
  pippa: { play: 'never', no: ['Mum says cards are for the Fox and the Fox is for grown-ups. I know all the rules though. The Child the Fire Spared is the best card. Obviously. Everyone says she\'s lucky.'] },
  odessa: { yes: ['Cut the deck. Hm. You\'ll lose the second round. I read it in your hand.', 'In Corvanne we call the Drowned Maiden the River Bride. We leave her a coin at the bridges. I\'ll leave her one of yours.'] },
  rolf: { yes: ['That\'s what the Fox is for! Pull up a stool. Mind the knee.', 'My grandmother wouldn\'t let the Barrow King on the table indoors. Bad luck, she said. I play him anyway. Look at my knee. She had a point.'] },
  mortimer: { play: 'night', yes: ['I keep score. It\'s the clerk in me. You don\'t mind?', 'One hand, after hours. I\'ve worked out the odds of every card. The Rat King still beats me. He isn\'t even good.'], no: ['Not in the Hall, Acolyte. The councilman would see. After dark, at the Fox, perhaps.'] },
  voss: { play: 'never', no: ['I have a town to run, Acolyte. Play with the farmers.', '~He glances at the deck. “The First Warden. Children\'s legends. Wardens are not legends, Acolyte. They are an order. You would do well to remember the difference.”'] },
  elsbeth: { play: 'never', no: ['Edric doesn\'t like cards in the house. I don\'t mind. I was never lucky.'] },
  hobb: { yes: ['Veyra\'s Horn and the Hound of the Wild Hunt. That\'s how Thatchers play. Deal.', 'My grandmother swore she saw the White Stag the winter before she died, standing in the east field like it owned it. I always play it for her.'] },
  ned: { play: '!phase:Morning,Midday,Afternoon', yes: ['Off duty. Dawn Sentinel\'s my card. Dace always played Greymaw Moon-Eater to scare me. It worked.'], no: ['On duty. Sergeant would have my helmet. After dark?'] },
  ilse: { yes: ['On the river they say the Fisher King owns every barge that sinks. Deal, and don\'t sink.', 'Stranded folk need cheap amusements. Deal.'] },
  maren: { yes: ['I play slowly. I weave slowly, too. Both come out right. My mother kept the Drowned Maiden for Nemora. So do I.'] },
  abel: { play: 'night', yes: ['Sela says one hand. One. Grandfather said the Rat King once traded with the valley, fair and square. I play him kindly.'], no: ['Not while there\'s light to work by. After supper, maybe.'] },
  gil: { play: 'night', yes: ['~He deals without a word, and lays the Drowned Maiden face down at his elbow, and never plays her.'], no: ['~He looks at the water, and then at you, and shakes his head. Not today.'] },
  berta: { play: 'never', no: ['Oh, my eyes aren\'t what they were, dear.', '~She touches the deck and draws back her hand. “They\'ve put a child in a fire on one of those cards. The Child the Fire Spared.” Her voice is very soft. “No. Not today, dear.”'] },
  garrick: { yes: ['Ursa the Old Bear. Hits like a cleaver. Sit down.', 'Loser buys the sausages. I sell the sausages. I can\'t lose.'] },
  fenwick: { yes: ['Going once, going twice, the cards are dealt! I\'m a terrible loser. Delightfully terrible.', 'The Barrow King! I\'d auction him if I could. Reserve price: one soul.'] },
  ewan: { yes: ['Mountain Giant. Steady. Like the peaks. Hill folk say the giants are only resting. Deal.', 'Korrum\'s Winter. Every hill child learns that card first.'] },
  hester: { yes: ['Sit. I\'ve beaten every Dunning at this table for sixty years. You\'ll be no trouble.', 'Lantern-Bearer. My mother\'s card. Halvard used to steal it from the deck when he was a boy, to make me lose.'] },
  hedda: { yes: ['One hand, while the wash dries. Col always played the Dawn Sentinel and lost.', 'Highfold folk keep the Stone-Kin. I\'ve one in my apron for luck.'] },
  jory: { yes: ['Millers are patient. That\'s the whole game.'] },
  wil: { yes: ['The White Stag? Seen it. Well. Seen its tracks. Deal.'] },
  bess: { yes: ['Uncle Rolf taught me on the ferry. I cheat. Only a bit. Deal.'] },
  oren: { yes: ['The Ember Smith. Every journeyman\'s card. Deal.'] },
  nettie: { yes: ['One hand. Then the smokehouse. Dad plays Ursa and roars. Don\'t.'] },
  rowan: { yes: ['Haven\'t played since Thornbury. Go easy. No. Don\'t.'] },
  ivy: { yes: ['I sew the card-backs for half the decks in the Fox. I know which ones are marked. Joking.'] },
  linnet: { yes: ['Gran Mae played this in Thornbury and always won. I\'m hoping it runs in the family.'] },
  tam: { play: 'never', no: ['I\'m not allowed. Lark is allowed. NO SHE ISN\'T.'] },
  lark: { play: 'never', no: ['Mam says I\'m too sharp for cards. That means I\'d win.'] },
  davy: { play: 'never', no: ['Mam says not till I\'m ten. I\'m eight. That\'s nearly. I know the Wyrm Beneath is the scariest. I saw a real fire.'] },
  mags: { yes: ['A carter learns cards on long nights. Low stakes; I\'ve not much left.'] },
};
function dlgCards(who) {
  const b = BRAMBLE[who] || {}, q = 'Play a hand of Bramble?';
  const ok = b.play !== 'never' && dlgCond(b.play === 'night' ? 'night' : b.play);
  if (!ok) { talkLine = dlgSaid(q) + dlgText(pick(b.no || ['Not today, Acolyte. Another time.'])); return false; }
  const yes = pick(b.yes || ['Go on, then. One hand.']);
  dlgReset(); closeModal();
  msg(`${dlgFirst(who)}: ${yes[0] === '~' ? yes.slice(1) : `“${yes.replace(/\{n\}/g, P().name)}”`}`, 'talk');
  startCardGame(PEOPLE[who].name);
  return true;
}

// conversation state: a follow-up waiting for your answer, or the "about someone" list
let dlgAsk = null, dlgSub = null;
function dlgReset() { dlgAsk = null; dlgSub = null; }
const dlgOf = who => DIALOGUE[who] || {};
const dlgPhase = () => typeof dayPhase === 'function' ? dayPhase() : 'Morning';
const dlgSeals = () => typeof KINGDOM_ORDER !== 'undefined' ? KINGDOM_ORDER.filter(k => (S.seals || {})[k]).length : 0;
const dlgFirst = who => PEOPLE[who].name.replace(/^(Brother|Old|Father) /, '').split(' ')[0];

function dlgTok(tok) {
  const [k, a] = tok.split(':'), st = S.story || {}, P_ = parish();
  switch (k) {
    case 'found': return !!st.halvard;
    case 'junction': return !!st.junction;
    case 'gate': return !!st.gate;
    case 'wyrm': return !!S.wyrmSlain;
    case 'seals': return dlgSeals() >= +a;
    case 'boss': return !!(S.bosses || {})[a];
    case 'duty': return dutyState(a) === 'done';
    case 'active': return !!dutyState(a) && dutyState(a) !== 'done';
    case 'flag': return !!P_.flags[a];
    case 'phase': return a.split(',').includes(dlgPhase());
    case 'night': return ['Dusk', 'Night'].includes(dlgPhase());
    case 'event': return (S.events || []).some(e => e.id === a);
    case 'god': return !!(P().gods || {})[a];
    case 'met': return !!P_.met[a];
    case 'day': return S.day >= +a;
    case 'lvl': return P().level >= +a;
    case 'here': return typeof famHere === 'function' && famHere(a);
    case 'origin': return a.split(',').includes(dlgOrigin());
    default: return false;
  }
}
const dlgCond = c => !c || c.trim().split(/\s+/).every(t => t[0] === '!' ? !dlgTok(t.slice(1)) : dlgTok(t));
const dlgL = x => typeof x === 'string' ? { t: x } : x;
const dlgOk = (who, l) => { const t = trustOf(who); return (l.min || 0) <= t && (l.max == null || t <= l.max) && dlgCond(l.if); };
// a line unlocked by trust or by the story is news; it comes before the everyday ones
const dlgFresh = l => !!(l.if || (l.min || 0) >= 2 || l.learn);

function dlgHeard(who) { const P_ = parish(); P_.heard = P_.heard || {}; return P_.heard[who] || (P_.heard[who] = []); }
// everything you've ever heard from them, so a topic only glows when there's truly something new
function dlgEver(who) { const P_ = parish(); P_.ever = P_.ever || {}; return P_.ever[who] || (P_.ever[who] = []); }
// choose a line from a list: unheard story lines first, then anything unheard, then start over
function dlgPick(who, key, list, seq) {
  if (!list || !list.length) return null;
  const heard = dlgHeard(who), ls = list.map(dlgL);
  const ok = ls.map((l, i) => i).filter(i => dlgOk(who, ls[i]));
  if (!ok.length) return null;
  const unheard = ok.filter(i => !heard.includes(key + i));
  let i;
  if (seq) { if (!unheard.length) return { done: true }; i = unheard[0]; }
  else {
    const fresh = unheard.filter(i => dlgFresh(ls[i]));
    // being remembered comes first: what they recall of your youth, before the rest of the news
    const mine = fresh.filter(i => /origin:/.test(ls[i].if || ''));
    if (mine.length) i = pick(mine);
    else if (fresh.length) i = pick(fresh);
    else if (unheard.length) i = pick(unheard);
    else {
      // everything's been said: let it all come round again, except the confidences
      for (const j of ok) { const h = heard.indexOf(key + j); if (h >= 0 && !ls[j].learn) heard.splice(h, 1); }
      const pool = ok.filter(j => !ls[j].learn);
      i = pick(pool.length ? pool : ok);
    }
  }
  if (!heard.includes(key + i)) heard.push(key + i);
  const ever = dlgEver(who); if (!ever.includes(key + i)) ever.push(key + i);
  return { line: ls[i], key: key + i };
}
// does a topic hold something you haven't heard that the story or your friendship has unlocked?
function dlgHasNew(who, key, list) {
  if (!list) return false;
  const ever = dlgEver(who);
  return list.some((x, i) => { const l = dlgL(x); return dlgFresh(l) && dlgOk(who, l) && !ever.includes(key + i); });
}

// the window shows one exchange at a time: what you said, then what they said (or did)
const dlgNarr = html => `<div class="ex narr">${html}</div>`;
const dlgYou = html => `<div class="ex you"><b>You</b><span>${html}</span></div>`;
function dlgText(t, who = talkWho) {
  const s = String(t).replace(/\{n\}/g, esc(P().name));
  if (s[0] === '~') return dlgNarr(s.slice(1));
  return `<div class="ex them"><b>${esc(dlgFirst(who))}</b><span>“${s}”</span></div>`;
}
const dlgSaid = q => dlgYou(`“${q}”`);
// anything the old talk code put in talkLine (duty replies and the like) is shown as their side of the exchange
const dlgWrap = html => /^<div class="ex/.test(html) ? html : `<div class="ex them"><b>${esc(dlgFirst(talkWho))}</b><span>${html}</span></div>`;
// show a line: record what it teaches, and open its follow-up if it has one
function dlgSay(who, got, q) {
  const l = got.line;
  if (l.learn) learn(who, l.learn);
  if (l.flag) parish().flags[l.flag] = 1;
  dlgAsk = l.ask ? { who, key: got.key, opts: l.ask.opts } : null;
  talkLine = (q ? dlgSaid(q) : '') + dlgText(l.t);
}
function dlgTrust(who, n) {
  const P_ = parish(), p = P(), t = trustOf(who);
  if (n > 0) {
    P_.dlgDay = P_.dlgDay || {};
    if (t >= DLG_TRUST_CAP || P_.dlgDay[who] === S.day) return;
    P_.dlgDay[who] = S.day; P_.trust[who] = t + 1; addFloat(p.x, p.y, '♥', '#ff8fa3');
  } else if (n < 0 && t > 0) { P_.trust[who] = t - 1; addFloat(p.x, p.y, '♡', '#8a8fa3'); }
}

// ---- the greeting when you walk up ----
function dlgGreet(who, first) {
  const d = dlgOf(who), pe = PEOPLE[who];
  if (first) {
    const news = dlgTakeNews(who), got = !news && dlgPick(who, 'intro', d.intro);
    return dlgNarr(esc(pe.look)) + (news || (got ? dlgText(got.line.t) : ''));
  }
  // something that came of your last visit, now come to pass, is the first thing they tell you
  const news = dlgTakeNews(who);
  if (news) return news;
  const got = dlgPick(who, 'greet', d.greet);
  if (got && !got.line.ask) return dlgText(got.line.t);
  return dlgText(chance(0.5) ? DLG_PHASE_GREET[dlgPhase()] : pick(pe.talk && pe.talk.length ? pe.talk : DLG_FALLBACK.greet));
}

// ---- a topic ----
function dlgTopic(who, k) {
  const d = dlgOf(who), pe = PEOPLE[who], P_ = parish(), label = (DLG_TOPICS.find(x => x[0] === k) || [])[1];
  dlgSub = null; dlgAsk = null;
  // a little time spent with someone, once a day, builds a little trust, up to a point
  P_.chat = P_.chat || {};
  if ((k === 'how' || k === 'self') && P_.chat[who] !== S.day && trustOf(who) < 2) { P_.chat[who] = S.day; (P_.dlgDay = P_.dlgDay || {})[who] = S.day; P_.trust[who] = trustOf(who) + 1; addFloat(P().x, P().y, '♥', '#ff8fa3'); }
  if (k === 'self') {
    // their own story first, as trust allows: this is what fills the ledger
    const known = P_.known[who] || (P_.known[who] = []), t = trustOf(who);
    const next = pe.story.findIndex((s, i) => s[0] <= t && !known.includes(i));
    if (next >= 0) { known.push(next); talkLine = dlgSaid(label) + dlgNarr(pe.story[next][1]); return; }
  }
  if (k === 'family' || k === 'origin') return dlgFamilyTopic(who, k, label);
  if (k === 'people') { dlgSub = 'people'; talkLine = dlgSaid('About someone…') + dlgText(pick(['Who did you have in mind?', 'Oh? Who?', 'Mm. Ask away.'])); return; }
  const q = k === 'work' ? (d.workLabel || 'About your work') : label;
  let list = d[k];
  if (k === 'halvard' && pe.halvard) list = (list || []).concat([{ t: '~' + pe.halvard, if: '!found' }]);
  if (k === 'gossip' && pe.talk) list = (list || []).concat(pe.talk);
  if (k === 'how' && trustOf(who) >= 3 && pe.talk2) list = (list || []).concat(pe.talk2);
  const got = dlgPick(who, k, list);
  if (got) return dlgSay(who, got, q);
  if (k === 'self' && pe.story.some(s => s[0] > trustOf(who))) { talkLine = dlgSaid(q) + dlgNarr(`${esc(dlgFirst(who))} smiles, but doesn't say more. Perhaps when you know each other better.`); return; }
  talkLine = dlgSaid(q) + dlgText(pick(DLG_FALLBACK[k] || DLG_FALLBACK.self));
}
// "Your family…": their relatives one at a time, closest first (each one goes into the ledger), then the family's
// stories; "Where are you from?": how they, or their people, came to Brambleford
function dlgFamilyTopic(who, k, label) {
  const F = FAMILY[who], P_ = parish();
  if (k === 'origin') {
    (P_.roots = P_.roots || {})[who] = 1;
    const got = dlgPick(who, 'o', F.origin);
    if (got) return dlgSay(who, got, label);
    talkLine = dlgSaid(label) + dlgNarr(esc(F.since)); return;
  }
  P_.kin = P_.kin || {};
  const n = P_.kin[who] || 0, next = (F.kin || [])[n];
  if (next) {
    const l = dlgL(next.say);
    if (dlgOk(who, l)) { P_.kin[who] = n + 1; return dlgSay(who, { line: l, key: 'k' + n }, label); }
  }
  const got = dlgPick(who, 'f', F.family);
  if (got) return dlgSay(who, got, label);
  talkLine = dlgSaid(label) + dlgNarr(next ? `${esc(dlgFirst(who))} changes the subject. Family is for people you know better.` : `${esc(dlgFirst(who))} has told you about everyone, near enough.`);
}
function dlgExtra(who, key) {
  const e = dlgOf(who).extra[key];
  dlgSub = null; dlgAsk = null;
  const got = dlgPick(who, 'x' + key, e.lines, e.seq);
  if (got && !got.done) return dlgSay(who, got, e.label);
  talkLine = dlgSaid(e.label) + dlgText(got && got.done ? (e.done || pick(['That\'s all there is to tell, for now.', 'I\'ve said what I can about that.', 'Let\'s leave it there for today.'])) : 'Not now, Acolyte. Another time.');
}
// "about someone": their opinion, or failing that what everyone knows of the two of them
function dlgAbout(who, other) {
  const d = dlgOf(who), pe = PEOPLE[who], o = PEOPLE[other];
  dlgSub = null; dlgAsk = null;
  const q = `About ${o.name}…`;
  const got = dlgPick(who, 'a' + other + '_', (d.about || {})[other]);
  if (got) return dlgSay(who, got, q);
  // family: what they've said of each other as kin
  const kin = typeof FAMILY !== 'undefined' && FAMILY[who] && (FAMILY[who].kin || []).find(k => k.id === other);
  if (kin && dlgOk(who, dlgL(kin.say))) return dlgSay(who, { line: dlgL(kin.say), key: 'ak' + other }, q);
  const tie = (pe.ties || {})[other] || (o.ties || {})[who];
  talkLine = dlgSaid(q) + (tie ? dlgNarr(esc(tie)) : dlgText(pick([`${o.name.split(' ')[0]}? I don't know them well enough to say.`, 'Can\'t say I know them, really. Nod in the street.', 'We\'ve not had much to do with each other.'])));
}
function dlgPeople(who) {
  const P_ = parish(), d = dlgOf(who), pe = PEOPLE[who];
  const ids = Object.keys(PEOPLE).filter(k => k !== who && (P_.met[k] && !PEOPLE[k].hidden || PEOPLE[k].hidden && ((d.about || {})[k] || (pe.ties || {})[k])));
  return ids;
}
function dlgAnswer(i) {
  const a = dlgAsk; if (!a) return;
  const o = a.opts[+i], P_ = parish();
  P_.answered = P_.answered || {};
  const done = P_.answered[a.who + '|' + a.key];
  dlgAsk = null;
  if (!done) { P_.answered[a.who + '|' + a.key] = 1; if (o.tr) dlgTrust(a.who, o.tr); }
  if (o.learn) learn(a.who, o.learn);
  if (o.flag) P_.flags[o.flag] = 1;
  if (typeof useSkill === 'function' && !done) useSkill('speech', 2);
  talkLine = dlgYou(o.l[0] === '~' ? `<i>${esc(o.l.slice(1))}</i>` : `“${esc(o.l).replace(/\{n\}/g, esc(P().name))}”`) + dlgText(o.r);
}

// ---- what the talk window shows ----
// a follow-up or a list replaces the menu while it's open
function dlgPanel(who) {
  if (dlgAsk && dlgAsk.who === who) {
    return `<div class="counsel dlg-ask">${dlgAsk.opts.map((o, i) => `<button class="btn choice" data-a="p" data-v="d|ans|${i}"><span class="tone tone-${o.tone}">${DLG_TONES[o.tone] || cap(o.tone || 'Say')}</span> ${o.l[0] === '~' ? `<i>${esc(o.l.slice(1))}</i>` : `“${esc(o.l).replace(/\{n\}/g, esc(P().name))}”`}</button>`).join('')}
      <div class="btnrow"><button class="btn ghost tiny" data-a="p" data-v="d|skip">Say nothing</button></div></div>`;
  }
  if (dlgSub === 'gift') return giftPanel(who);
  if (dlgSub === 'more') return `<div class="dlg-topics">${dlgMore(who).map(t => t.html).join('')}</div><div class="btnrow dlg-foot"><button class="btn ghost tiny" data-a="p" data-v="d|back">Back</button></div>`;
  if (dlgSub === 'people') {
    const d = dlgOf(who);
    const ids = dlgPeople(who);
    return `<div class="dlg-people">${ids.map(k => `<button class="btn tiny ${dlgHasNew(who, 'a' + k + '_', (d.about || {})[k]) ? 'has-new' : ''}" data-a="p" data-v="d|about|${k}">${esc(PEOPLE[k].name)}</button>`).join('')}</div>
      ${ids.length ? '' : '<p class="dim">You haven\'t met many people in town yet.</p>'}
      <div class="btnrow dlg-foot"><button class="btn ghost tiny" data-a="p" data-v="d|back">Never mind</button></div>`;
  }
  return null;
}
const DLG_MAIN = ['how', 'self', 'news', 'halvard'];
function dlgTopicBtn(who, k) {
  const d = dlgOf(who), pe = PEOPLE[who], label = (DLG_TOPICS.find(x => x[0] === k) || [])[1];
  const b = (v, label, isNew) => ({ isNew, html: `<button class="btn ${isNew ? 'has-new' : ''}" data-a="p" data-v="d|${v}">${label}</button>` });
  if (k === 'work') return d.work ? b('t|work', d.workLabel || 'About your work', dlgHasNew(who, 'work', d.work)) : null;
  if (k === 'self') { const t = trustOf(who), known = parish().known[who] || []; return b('t|self', label, pe.story.some((s, i) => s[0] <= t && !known.includes(i))); }
  if (k === 'people') return b('t|people', label, dlgPeople(who).some(o => dlgHasNew(who, 'a' + o + '_', (d.about || {})[o])));
  if (k === 'family' || k === 'origin') {
    const F = typeof FAMILY !== 'undefined' && FAMILY[who]; if (!F) return null;
    if (k === 'origin') return b('t|origin', label, !(parish().roots || {})[who] || dlgHasNew(who, 'o', F.origin));
    const next = (F.kin || [])[famKnown(who)];
    return b('t|family', label, !!(next && dlgOk(who, dlgL(next.say))) || dlgHasNew(who, 'f', F.family));
  }
  return b('t|' + k, label, dlgHasNew(who, k, d[k]));
}
// the less pressing questions, kept behind "More…"
const dlgMore = who => ['family', 'origin', 'work', 'caves', 'gods', 'gossip', 'people'].map(k => dlgTopicBtn(who, k)).filter(Boolean);
function dlgTopicsHtml(who) {
  const d = dlgOf(who), pe = PEOPLE[who];
  const main = DLG_MAIN.map(k => dlgTopicBtn(who, k));
  // a personal thread is never hidden: it's what they most want to talk about
  for (const [k, e] of Object.entries(d.extra || {})) if (dlgCond(e.if) && (e.min || 0) <= trustOf(who)) { const n = dlgHasNew(who, 'x' + k, e.lines); main.push({ isNew: n, html: `<button class="btn thread ${n ? 'has-new' : ''}" data-a="p" data-v="d|x|${k}">${e.label}</button>` }); }
  const moreNew = dlgMore(who).some(t => t.isNew);
  main.push({ html: `<button class="btn more ${moreNew ? 'has-new' : ''}" data-a="p" data-v="d|more">More…</button>` });
  return `<div class="dlg-topics">${main.map(t => t.html).join('')}</div><div class="btnrow dlg-foot">
    ${GIFT_TASTES[who] ? `<button class="btn ${giftedToday(who) ? 'gave' : ''}" data-a="p" data-v="d|gift">Give a gift…</button>` : ''}
    ${typeof startCardGame === 'function' && BRAMBLE[who] ? '<button class="btn" data-a="p" data-v="d|cards">Bramble?</button>' : ''}
    ${pe.shop ? `<button class="btn default" data-a="p" data-v="trade|${pe.shop}">Trade</button>` : ''}
    ${pe.auction && typeof openAuction === 'function' ? '<button class="btn default" data-a="p" data-v="d|auction">The ring</button>' : ''}
    <span class="sp"></span><button class="btn ghost" data-a="p" data-v="d|bye">Goodbye</button></div>`;
}
// every dialogue button: data-v="d|verb|arg"
function dlgAct(verb, a) {
  const who = talkWho;
  if (verb === 't') dlgTopic(who, a);
  else if (verb === 'x') dlgExtra(who, a);
  else if (verb === 'about') dlgAbout(who, a);
  else if (verb === 'ans') dlgAnswer(a);
  else if (verb === 'skip') { dlgAsk = null; talkLine = dlgYou('<i>You let the moment pass.</i>'); }
  else if (verb === 'back') dlgSub = null;
  else if (verb === 'more') { dlgAsk = null; dlgSub = 'more'; }
  else if (verb === 'cards') { dlgAsk = null; dlgSub = null; if (dlgCards(who)) return; }
  else if (verb === 'gift') { dlgAsk = null; dlgSub = 'gift'; }
  else if (verb === 'give') dlgGive(who, a);
  else if (verb === 'auction') { closeModal(); return openAuction(); }
  else if (verb === 'bye') {
    const got = dlgPick(who, 'bye', dlgOf(who).bye);
    const line = got && got.line.t[0] !== '~' ? got.line.t : pick(DLG_FALLBACK.bye);
    dlgReset(); closeModal();
    msg(`${dlgFirst(who)}: “${line.replace(/\{n\}/g, P().name)}”`, 'talk');
    return;
  }
  autosave(); refresh();
}

// ---------------- what comes of things ----------------
// A choice in a duty can set something in motion in town (a visit, a quarrel mended, a fever breaking). It doesn't
// happen while you're standing there: it's kept in S.parish.pending with the day it comes due. When that day dawns
// its flags and trust land, the town talks (a line in the log), and the person tells you about it next time you
// talk to them; until then a marker shows over their head.
function dlgLater(list) {
  const P_ = parish(); P_.pending = P_.pending || [];
  for (const o of [].concat(list || [])) P_.pending.push(Object.assign({}, o, { due: S.day + (o.days || 1) }));
}
function dlgResolve() {
  if (!S || !S.parish || !(S.parish.pending || []).length) return;
  const P_ = parish(), now = P_.pending.filter(o => o.due <= S.day);
  if (!now.length) return;
  P_.pending = P_.pending.filter(o => o.due > S.day);
  for (const o of now) {
    for (const f of [].concat(o.flag || [])) P_.flags[f] = 1;
    for (const [w, n] of Object.entries(o.trust || {})) P_.trust[w] = Math.max(0, Math.min(5, (P_.trust[w] || 0) + n));
    if (o.who && o.line) (P_.news = P_.news || []).push({ who: o.who, line: o.line });
    if (o.fact) learn(o.who, o.fact);
    if (o.log) msg(o.log, 'news');
  }
}
const dlgHasNews = who => !!(S && S.parish && (S.parish.news || []).some(n => n.who === who));
function dlgTakeNews(who) {
  const P_ = parish(), i = (P_.news || []).findIndex(n => n.who === who);
  if (i < 0) return null;
  const n = P_.news.splice(i, 1)[0];
  return dlgText(n.line, who);
}
// news comes with the dawn; newDay lives in game.js, which loads after this file
window.addEventListener('load', () => {
  if (typeof newDay !== 'function') return;
  const _newDay = newDay;
  newDay = function (reason) { const r = _newDay.apply(this, arguments); dlgResolve(); return r; };
});

// ---------------- gifts ----------------
// What each person loves, likes and can't abide. Keys are a material id, an item id, or 'cat:<category>'
// (food, herb, ore, hide, monster, crystal, wood, stone, jewelry, potion, scroll, book, tool, weapon, armor, ammo).
// An exact id wins over a category, and love beats like beats dislike.
const GIFT_TASTES = {
  anselm:   { love: ['cat:book', 'cat:scroll'], like: ['apple', 'milk', 'wheat', 'egg', 'healroot', 'oil'], dislike: ['cat:jewelry', 'cat:monster', 'pelt', 'goldcarp'] },
  bran:     { love: ['iron', 'silver', 'mithril'], like: ['meat', 'pike', 'cat:weapon', 'stone', 'wood'], dislike: ['cat:jewelry', 'moonpetal', 'cat:herb', 'cat:potion'] },
  hilde:    { love: ['hide', 'pelt', 'silk'], like: ['meat', 'iron', 'cat:armor', 'cat:ammo'], dislike: ['cat:jewelry', 'redcap', 'torch'] },
  tamsin:   { love: ['healroot', 'moonpetal', 'redcap'], like: ['cat:herb', 'cat:potion', 'egg', 'gel'], dislike: ['cat:weapon', 'bone', 'meat'] },
  mirela:   { love: ['shard', 'soulgem', 'moonpetal'], like: ['silk', 'feather', 'cat:crystal', 'cat:scroll', 'apple'], dislike: ['meat', 'pelt', 'iron', 'cat:weapon'] },
  aldous:   { love: ['cat:book', 'cat:scroll', 'soulgem'], like: ['shard', 'feather', 'pmana', 'apple', 'oil'], dislike: ['meat', 'gel', 'caveeel', 'bone'] },
  wendell:  { love: ['goldcarp', 'silver', 'mithril'], like: ['oil', 'torch', 'cat:tool', 'wood', 'egg'], dislike: ['bone', 'gel', 'redcap'] },
  marta:    { love: ['wheat', 'egg', 'milk'], like: ['apple', 'healroot', 'trout', 'perch'], dislike: ['cat:monster', 'redcap', 'cat:weapon'] },
  pippa:    { love: ['apple', 'feather', 'goldcarp'], like: ['egg', 'perch', 'antler', 'shard', 'oil', 'torch'], dislike: ['redcap', 'healroot', 'gel', 'cat:potion'] },
  odessa:   { love: ['silver', 'cat:jewelry', 'soulgem'], like: ['shard', 'mithril', 'moonpetal', 'silk'], dislike: ['bone', 'meat', 'hide', 'gel'] },
  rolf:     { love: ['trout', 'pike', 'meat'], like: ['perch', 'caveeel', 'milk', 'egg', 'apple', 'wheat'], dislike: ['redcap', 'gel', 'cat:scroll'] },
  mortimer: { love: ['cat:scroll', 'feather'], like: ['cat:book', 'oil', 'apple', 'milk'], dislike: ['bone', 'pelt', 'meat', 'cat:weapon', 'gel'] },
  voss:     { love: ['goldcarp', 'mithril'], like: ['cat:jewelry', 'silver', 'pike'], dislike: ['torch', 'oil', 'cat:herb', 'apple'] },
  elsbeth:  { love: ['moonpetal'], like: ['cat:herb', 'feather', 'silk', 'apple', 'milk'], dislike: ['meat', 'pelt', 'hide', 'bone', 'cat:weapon'] },
  hobb:     { love: ['pelt', 'wheat'], like: ['meat', 'apple', 'feather', 'wool', 'wood'], dislike: ['cat:crystal', 'cat:scroll', 'antler'] },
  ned:      { love: ['meat', 'apple'], like: ['cat:food', 'pheal', 'cat:weapon', 'cat:ammo'], dislike: ['bone', 'gel', 'silk'] },
  ilse:     { love: ['wood', 'wool'], like: ['silk', 'hide', 'redcap', 'egg', 'apple'], dislike: ['caveeel', 'gel', 'bone'] },
  maren:    { love: ['wool', 'silk'], like: ['feather', 'redcap', 'moonpetal', 'milk'], dislike: ['meat', 'gel', 'hide', 'cat:jewelry'] },
  abel:     { love: ['wood', 'apple'], like: ['milk', 'egg', 'iron', 'stone'], dislike: ['redcap', 'bone', 'gel'] },
  gil:      { love: ['pike', 'goldcarp', 'caveeel'], like: ['perch', 'trout', 'shard', 'stone'], dislike: ['pelt', 'cat:weapon', 'meat'] },
  berta:    { love: ['wood', 'healroot'], like: ['milk', 'egg', 'apple', 'wool', 'moonpetal'], dislike: ['torch', 'oil', 'cat:weapon'] },
  garrick:  { love: ['meat', 'antler'], like: ['hide', 'pelt', 'wood', 'cat:food'], dislike: ['moonpetal', 'cat:scroll', 'cat:book'] },
  fenwick:  { love: ['goldcarp', 'cat:jewelry'], like: ['egg', 'apple', 'feather', 'milk'], dislike: ['gel', 'bone', 'redcap'] },
  ewan:     { love: ['meat', 'bone'], like: ['apple', 'wool', 'wheat', 'stone'], dislike: ['cat:jewelry', 'cat:crystal', 'cat:potion'] },
};
const GIFT_LINES = {};
const GIFT_TRUST = { love: 2, like: 1, neutral: 0, dislike: -1 };
// gifts can win someone's friendship, but not their whole confidence: that takes the parish work
const GIFT_CAP = 4;
const GIFT_FALLBACK = {
  love: ['~Their face lights up. “For me? Oh, you shouldn\'t have. I\'m glad you did.”'],
  like: ['That\'s kind of you. Thank you.'],
  neutral: ['~They turn it over, a little puzzled. “Well. Thank you, I suppose.”'],
  dislike: ['~A polite smile that doesn\'t reach the eyes. “Ah. How… thoughtful.”'],
};
const GIFT_TAG = { love: '♥ loves', like: 'likes', dislike: 'dislikes' };
const giftCat = (kind, id) => kind === 'mat' ? (MATS[id] || {}).cat : (ITEMS[id] || {}).cat;
function giftTier(who, kind, id) {
  const t = GIFT_TASTES[who]; if (!t) return 'neutral';
  const tiers = ['love', 'like', 'dislike'];
  for (const k of tiers) if ((t[k] || []).includes(id)) return k;
  for (const k of tiers) if ((t[k] || []).includes('cat:' + giftCat(kind, id))) return k;
  return 'neutral';
}
const giftKeyName = k => k.startsWith('cat:') ? (CAT_NAMES[k.slice(4)] || k.slice(4)).toLowerCase() : (MATS[k] || ITEMS[k] || { name: k }).name.toLowerCase();
const giftList = keys => { const n = keys.map(giftKeyName); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0]; };
// what's in your pack that could be given: carried materials and unequipped items, never the story's own things
function giftables() {
  const p = P(), out = [];
  for (const [id, n] of Object.entries(p.mats || {})) if (n > 0 && MATS[id]) out.push({ key: 'm:' + id, kind: 'mat', id, name: MATS[id].name, n });
  for (const it of p.inv) { const t = ITEMS[it.id]; if (!t || t.cat === 'story') continue; out.push({ key: 'i:' + it.uid, kind: 'item', id: it.id, name: itemName(it), n: 0 }); }
  return out;
}
const giftedToday = who => ((parish().gifts || {})[who] === S.day);
function giftPanel(who) {
  if (giftedToday(who)) return `<p class="dim">You've already given ${esc(dlgFirst(who))} something today. Gifts mean more when they're not every hour.</p><div class="btnrow"><button class="btn ghost tiny" data-a="p" data-v="d|back">Back</button></div>`;
  const known = (parish().tastes || {})[who] || {}, gs = giftables();
  const rows = gs.map(g => { const tier = giftTier(who, g.kind, g.id), tag = known[tier] && GIFT_TAG[tier];
    return `<button class="btn tiny gift-${known[tier] ? tier : 'unknown'}" data-a="p" data-v="d|give|${g.key}">${esc(g.name)}${g.n ? ` <small>×${g.n}</small>` : ''}${tag ? ` <em>${tag}</em>` : ''}</button>`; });
  return `<p class="dim">What will you give ${esc(dlgFirst(who))}?</p><div class="dlg-people dlg-gifts">${rows.join('') || '<span class="dim">Your pack holds nothing you could give.</span>'}</div>
    <div class="btnrow"><button class="btn ghost tiny" data-a="p" data-v="d|back">Never mind</button></div>`;
}
function dlgGive(who, key) {
  const P_ = parish(), p = P();
  if (giftedToday(who)) return;
  let kind, id, name;
  if (key.startsWith('m:')) { id = key.slice(2); if (!(p.mats[id] > 0)) return; kind = 'mat'; name = MATS[id].name; p.mats[id]--; }
  else { const it = p.inv.find(o => String(o.uid) === key.slice(2)); if (!it) return; kind = 'item'; id = it.id; name = ITEMS[id].name; removeOne(it); }
  (P_.gifts = P_.gifts || {})[who] = S.day;
  const tier = giftTier(who, kind, id), L = GIFT_LINES[who] || {};
  const line = ((L.special || {})[id] || pick(L[tier] && L[tier].length ? L[tier] : GIFT_FALLBACK[tier])).replace(/\{item\}/g, name.toLowerCase());
  const t = trustOf(who), n = GIFT_TRUST[tier];
  if (n > 0 && t < GIFT_CAP) { P_.trust[who] = Math.min(GIFT_CAP, t + n); addFloat(p.x, p.y, n > 1 ? '♥♥' : '♥', '#ff8fa3'); }
  if (n < 0 && t > 0) { P_.trust[who] = t - 1; addFloat(p.x, p.y, '♡', '#8a8fa3'); }
  // you learn what they like by watching them open it
  const known = (P_.tastes = P_.tastes || {})[who] || (P_.tastes[who] = {}), T_ = GIFT_TASTES[who];
  if (T_ && tier !== 'neutral' && !known[tier]) {
    known[tier] = 1;
    if (tier === 'love') learn(who, `${dlgFirst(who)} loves a gift of ${giftList(T_.love)}.`);
    if (tier === 'like') learn(who, `${dlgFirst(who)} is pleased by ${giftList(T_.like)}.`);
    if (tier === 'dislike') learn(who, `${dlgFirst(who)} would rather not be given ${giftList(T_.dislike)}.`);
  }
  dlgSub = null; dlgAsk = null;
  talkLine = dlgYou(`<i>You give ${esc(dlgFirst(who))} ${esc(name.toLowerCase())}.</i>`) + dlgText(line);
  msg(`You give ${name.toLowerCase()} to ${PEOPLE[who].name}.`, 'talk');
}

// =====================================================================
// The words: one entry per person.
// =====================================================================

// Brother Anselm: tidy, tired, precise friar from Highcourt; keeps a tally; farmer's son underneath.
DIALOGUE.anselm = {
  intro: [
    '~He looks up from a ledger balanced on his knee, finds his place with an inky thumb, and only then closes it.',
    'Ah. You\'ll be the acolyte. Good. I was hoping to meet you before I met anyone else.',
  ],
  greet: [
    { t: 'Acolyte. Sit, if you like. The step is cold, but it\'s honest about it.', max: 1 },
    { t: '{n}. I was just writing about you. Nothing alarming. Mostly adjectives.', min: 2 },
    { t: 'Up for the lamps? So am I. Old habit. Highcourt rings its bells at an hour no farmer would forgive.', if: 'phase:Dawn' },
    { t: '~He is squinting at the hills to the west. “Rain by evening. Don\'t tell anyone I said so; friars aren\'t meant to know about weather.”', if: 'phase:Morning,Midday' },
    { t: 'Still about? The lamps are lit. I checked twice. Then I checked a third time, which I suspect is a vice.', if: 'night' },
    { t: 'Market day. Half the valley came to buy a pig and stayed to ask me if the temple is closing. I am learning to say “we shall see” in eleven different tones.', if: 'phase:Midday' },
    { t: '~He stands as you come up, which he does not do for the councilman.', min: 3 },
    { t: 'Come and sit. I have no tally to read you today. Just sit.', if: 'found', min: 2 },
    { t: 'You\'ve been below again. You have the look. Sit down before you fall down.', if: 'junction' },
  ],
  bye: [
    'Go well. I\'ll be here, adding things up.',
    'Aurel light your road. And take a cloak. That sky is lying to you.',
    { t: 'Go on. And {n}, eat something. That is a pastoral instruction.', min: 2 },
    '~He nods and returns to his ledger, though his pen doesn\'t move until you\'ve gone.',
  ],
  how: [
    'Tired. Highcourt is four days\' ride, and my horse has opinions.',
    'Well enough. The inn\'s beds are good, and the stew is, I\'m told, the only stew in the valley. I believe it.',
    { t: 'Honestly? Torn. I was sent to measure a thing, and I\'ve begun to care about it. That is bad practice for an assessor.', min: 3 },
    { t: 'Grieving a man I met once. It seems unreasonable. It isn\'t.', if: 'found' },
    { t: 'Better for asking. Nobody asks the man with the ledger.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Then I\'ll keep asking.', r: '~He looks down at his ledger and smiles at it, rather than at you. “Thank you.”', tr: 1 },
        { tone: 'joke', l: 'Perhaps if you put the ledger down, they\'d notice you have a face.', r: 'Ha. My mother said the same, about the plough.', tr: 1 },
        { tone: 'curious', l: 'What is actually in the ledger?', r: 'Names. Kindnesses. Debts of the other sort. I\'ll read you a page someday, when you\'ve earned the embarrassment.', tr: 0 },
        { tone: 'blunt', l: 'Maybe they\'re afraid of what you\'ll write.', r: '~He winces. “Yes. That\'s fair. That\'s exactly fair.”', tr: 0 },
      ] } },
  ],
  self: [
    'I take vows, I copy letters, I ride to parishes and count them. It sounds duller than it is. No. It\'s exactly as dull as it sounds.',
    { t: 'My father grew barley on a hillside that hated barley. I learned patience from that field, and prayer from the hail.', min: 2 },
    { t: 'I still wake before dawn wondering if the cows are milked. Twenty years a friar. The cows have never once needed me.', min: 2 },
    { t: 'I was meant to be an archivist. The cathedral decided I had a “gentle manner with closures.” I have closed nine parishes. I remember every bell.', min: 3, learn: 'Brother Anselm has closed nine parishes for the cathedral, and remembers each one.' },
  ],
  workLabel: 'About the assessment',
  work: [
    'The cathedral wants a number. People cared for, rites kept, lamps lit. I want a reason. They are not always the same thing.',
    { t: 'Every errand you run, I write down. Every prayer said at that altar. It adds up. Not quickly, but it adds.', min: 1 },
    { t: 'Your standing rises. I notice. So, unfortunately, does the councilman.', min: 2 },
    { t: 'Highcourt doesn\'t close temples because the people stop praying. It closes them because someone offers money for the land. Remember that, when you\'re tired.', min: 4,
      ask: { opts: [
        { tone: 'blunt', l: 'Then don\'t sell it.', r: 'It isn\'t mine to sell. But a report can be written slowly. Very slowly. With many footnotes.', tr: 1 },
        { tone: 'pious', l: 'Aurel\'s hearth isn\'t for sale.', r: 'I agree. I shall phrase it more expensively for Highcourt.', tr: 1 },
        { tone: 'curious', l: 'Who\'s offering?', r: '~He folds his hands. “A man with very good handwriting. You can guess. I won\'t say.”', tr: 0, learn: 'Anselm hints the councilman has offered Highcourt money for the temple land.' },
        { tone: 'joke', l: 'Could we offer more? I have four coppers and a good candle.', r: 'Keep the candle. It\'s worth more than you think.', tr: 1 },
      ] } },
  ],
  news: [
    'I wrote to Highcourt last night. Short letter. “Still counting.”',
    { t: 'The girl, Pippa, has been lighting the lamps on a stool. I pretended not to see. I wrote it down twice.', min: 1 },
    { t: 'Fever in the town, I hear. If you go among the sick, wash your hands after. Your apothecary has threatened me personally on this point.', if: 'event:fever' },
    { t: 'Wizards in the market, selling “blessed” charms. I bought one to see. It\'s a bent nail. A very confident bent nail.', if: 'event:wizards' },
    { t: 'They\'ve brought Halvard up. I have written to Highcourt that the parish is in mourning, and that no decision should be made while it is. That buys us time. Not much.', if: 'found', learn: 'Anselm asked Highcourt to delay any decision on the temple while the parish mourns.' },
    { t: 'You opened the door below. I can\'t even begin to write that in a report. I tried. I wrote “unusual circumstances” and put the pen down.', if: 'gate' },
  ],
  halvard: [
    'I met him once, at a synod. He spoke about mercy as if it had cost him something.',
    { t: 'He\'ll have taken a lantern and too few candles. Men like him always think the dark will be shorter than it is.', if: '!found' },
    { t: 'I asked the council what Halvard was looking for. Three of them didn\'t know. The fourth knew too well, and smiled.', if: '!found', min: 3 },
    { t: 'I\'ll read the rite for him, if you\'ll let me. Or stand beside you while you do. Whichever you\'d rather. It\'s your temple.', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'Stand beside me. I don\'t want to do it alone.', r: 'Then you won\'t. I\'ll be the one holding the book, and you\'ll be the one who knew him.', tr: 1 },
        { tone: 'pious', l: 'I\'ll read it at First Light, the way he taught me.', r: 'At dawn, then. That\'s right. I\'ll keep the lamps.', tr: 1 },
        { tone: 'blunt', l: 'I don\'t want the rite. I want to know who killed him.', r: '~He is quiet. “Both are allowed. Do the one first so you can bear the other.”', tr: 0 },
        { tone: 'curious', l: 'Did Highcourt know what he was before he came here?', r: 'Highcourt knows more than it says, and says less than it should. I\'ll look. Quietly.', tr: 0 },
      ] } },
    { t: 'A goblin blade, they say. I farmed, as a boy. I know what a beast\'s wound looks like, and what a man\'s does. Say nothing yet. Neither will I.', if: 'found', min: 3 },
  ],
  caves: [
    'I don\'t go into caves. I went into a cellar once, at nine, and came out at ten. Metaphorically.',
    'Highcourt keeps old maps of the valley. There\'s a mark north of the watchtower labelled only “Concord.” Nobody can tell me what it means.',
    { t: 'Four kingdoms below, and a door with four locks. That isn\'t a cave. That\'s a treaty somebody carved into rock.', if: 'junction', learn: 'Anselm thinks the sealed door below was made as a treaty between the four realms.' },
    { t: 'You carry a seal from below now. Put it somewhere the councilman will never see it. I say that as a man with no evidence and a great deal of instinct.', if: 'seals:1' },
    { t: 'Something enormous is dead beneath us, and the town is planning a feast. I\'d like to put that in a report too, but no one would believe the ink.', if: 'wyrm' },
  ],
  gods: [
    'Highcourt serves Aurel among the gods. In the country, the gods are more crowded. I like the country better.',
    { t: 'My mother put salt on Korrum\'s cairn before every harvest, and a lamp for Aurel after. I do both still, when no bishop is watching.', min: 2 },
    { t: 'Your Rite of First Light is older than the cathedral\'s. Halvard kept it the old way. Don\'t let anyone make it tidy.', min: 1,
      ask: { opts: [
        { tone: 'pious', l: 'I\'ll keep it as he kept it. Every dawn.', r: 'Then I\'ll stand at the back and try not to take notes.', tr: 1 },
        { tone: 'curious', l: 'How is it different in Highcourt?', r: 'More gold. Fewer people. The singing is better and means less.', tr: 1 },
        { tone: 'joke', l: 'Tidy? Have you seen the temple vestry?', r: '~A real laugh, startled out of him. “I have. I\'m pretending I haven\'t.”', tr: 1 },
        { tone: 'blunt', l: 'Then stop measuring it and help keep it.', r: 'That\'s... what I\'m trying to do, in the only way they let me.', tr: 0 },
      ] } },
  ],
  gossip: [
    'Gossip? I\'m a friar. I only receive confidences and then look meaningfully at the ceiling.',
    { t: 'The armorer and the smith shout at each other across the street every morning. I\'ve begun to think of it as a sort of liturgy.', min: 1 },
    { t: 'The clerk came to me for confession. Then lost his nerve and asked about the weather. We talked about weather for an hour. He seemed to feel better.', min: 2 },
    { t: 'Old Berta asked me if Highcourt still keeps the Crown\'s records. Then said never mind, she was just an old woman. She is not just an old woman.', min: 3 },
  ],
  about: {
    voss: [
      'Councilman Voss is unfailingly polite. I have met cardinals with worse manners. I have met very few with colder eyes.',
      { t: 'He wrote to Highcourt offering a price for this land before Halvard had been gone a fortnight. People in a hurry for land usually want something buried, or something dug up.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'Which do you think he wants?', r: 'Both, I suspect. Dug up first, then buried somewhere deeper.', tr: 1 },
          { tone: 'blunt', l: 'Then tell Highcourt no.', r: 'I have told Highcourt “not yet.” In the cathedral, that is practically a brawl.', tr: 1 },
          { tone: 'kind', l: 'Be careful of him, Brother.', r: '~He blinks, touched. “I\'m a friar with a ledger. I\'m the least dangerous man in the valley. Which is exactly why I\'ll be careful.”', tr: 1 },
          { tone: 'joke', l: 'Maybe he just really likes gardening.', r: 'Then he may have the vegetable patch behind the vestry. Nothing else.', tr: 0 },
        ] } },
    ],
    pippa: [
      'That child asked me whether Aurel prefers buns or rolls. I said I would consult the archbishop. She is still waiting.',
      { t: 'If this temple closes, she\'ll keep lighting lamps in an empty room. I\'d like to not have done that to her.', min: 2 },
    ],
    marta: [
      'The baker was at the temple door before dawn the day I arrived, waiting for a service no one was going to hold. I held it. Badly. She thanked me anyway.',
    ],
    mortimer: [
      'The clerk is terrified, which in my experience means he\'s honest and has been asked to stop.',
      { t: 'Halvard asked him for old records before he went below. He told me that, then asked me to forget it. I have a very poor memory for forgetting.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'Which records?', r: 'Eighteen years old. Refugees, I think. He wouldn\'t say more, and I didn\'t make him.', tr: 1, learn: 'Halvard asked Mortimer for eighteen-year-old records, possibly refugee rolls, before he went below.' },
          { tone: 'kind', l: 'I\'ll go gently with him.', r: 'Good. Frightened men break if you push and open if you wait.', tr: 1 },
          { tone: 'blunt', l: 'I\'ll make him hand them over.', r: 'You\'ll make him burn them. Try tea first.', tr: -1 },
          { tone: 'pious', l: 'Nemora keeps secrets. Aurel brings them to light.', r: 'Well put. Let\'s hope Aurel is an early riser this week.', tr: 0 },
        ] } },
    ],
    aldous: [
      'Master Grey and I discovered we read the same forbidden commentary at Highcourt, thirty years apart. He was caught. I was quicker.',
    ],
    hilde: [
      'The armorer stands up straight when I pass, the way soldiers do around a chaplain. I\'m not a chaplain. I wonder whose she was.',
    ],
    berta: [
      'She makes me tea and asks very precise questions about Highcourt\'s archives. I answer them. I\'m beginning to think I should be writing them down.',
    ],
  },
  extra: {
    report: { label: 'About the report', if: 'duty:anselm_intro', seq: true, lines: [
      { t: 'You want to see what I\'ve written? Not yet. It isn\'t finished. Nothing honest is finished until it\'s sent.', min: 2 },
      { t: 'All right. One line. “The acolyte is young, and has no business being as good at this as he is.” There. Don\'t let it go to your head.', min: 3 },
      { t: 'There\'s a second report. The one I\'m not sending yet. It\'s about the councilman\'s letter and the dates on it. I keep it in my boot.', min: 4, learn: 'Anselm keeps a second, unsent report about Voss\'s letter to Highcourt hidden in his boot.' },
      { t: 'If I\'m recalled, {n}, take the boot. I mean it. I have another pair. Mostly.', min: 4 },
    ] },
  },
};

// Bran Hollin: blacksmith. Gruff, short sentences, soot, grief he won't name. Hates piety from a boy, respects blunt.
DIALOGUE.bran = {
  intro: [
    '~He doesn\'t stop hammering. Three more blows, a hiss of quench, and then he looks at you. “Halvard\'s lad. Thought you\'d be taller.”',
  ],
  greet: [
    { t: 'What.', max: 0 },
    { t: 'Lad.', min: 1 },
    { t: 'You again. Good. Hold this. No, by the other end.', min: 2 },
    { t: '~He is already at the forge, shirt dark with sweat, though the sun is barely up. He grunts at you. It is almost friendly.', if: 'phase:Dawn' },
    { t: 'Shop\'s shut. Unless it isn\'t. What d\'you need.', if: 'night' },
    { t: '~He smells of the Fox and hasn\'t shaved. “Not now, lad. Or. Fine. Now.”', if: 'night !flag:dace_told', min: 2 },
    { t: 'Iron\'s short. Everyone wants a blade and nobody\'s got ore. Don\'t ask me for miracles. That\'s your trade.', if: 'event:ironshort' },
    { t: 'Raiders on the road again. Sold four spears before breakfast. Hate selling spears to farmers.', if: 'event:raids' },
    { t: '~He looks at you, and at the steel sword at your hip. “Keep it oiled. That\'s all I\'ll say.”', if: 'flag:seek_dace' },
    { t: '~He sets the hammer down when he sees you, and for once doesn\'t pick it back up.', if: 'found', min: 2 },
  ],
  bye: [
    'Aye.',
    'Mind the forge.',
    { t: 'Go on, then. Come back in one piece. I don\'t mend people.', min: 2 },
    { t: '~He nods once. Then, gruffly, to the anvil: “Eat something.”', min: 3 },
  ],
  how: [
    'Busy.',
    'Arm\'s sore. Forge is hot. Same as yesterday.',
    { t: 'Slept. First time in a while. Don\'t make a thing of it.', if: 'duty:bran_dace' },
    { t: 'How d\'you think.', if: '!duty:bran_dace', min: 2,
      ask: { opts: [
        { tone: 'blunt', l: 'Badly. You look like death.', r: '~A short bark that might be a laugh. “Aye. Thanks, lad.”', tr: 1 },
        { tone: 'kind', l: 'I think you\'re worried sick about Dace.', r: '~His hammer stops. Starts again. Harder. “He\'s on patrol.”', tr: 0 },
        { tone: 'pious', l: 'Korrum gives strength to those who bear their burdens.', r: 'Don\'t. Not from a boy. Not today.', tr: -1 },
        { tone: 'joke', l: 'Hot, sooty, and short-tempered?', r: 'Short-tempered. Cheek. Get out. ...Hold on, pass me that tongs first.', tr: 0 },
      ] } },
    { t: 'Halvard\'s gone and my boy\'s gone, and I\'ve still got horseshoes to make for the Thatchers. That\'s how.', if: 'found', min: 3 },
  ],
  self: [
    'Smith. Son of a smith. Nothing to tell.',
    { t: 'Ada did the talking. I did the hitting. Worked fine.', min: 1 },
    { t: 'Came down from the hill with her, years back. Her people thought she married beneath her. Ha. She did.', min: 2 },
    { t: 'She lit that shrine every name-day. I light it now. Don\'t know the words she used. Korrum doesn\'t seem to mind.', min: 3, learn: 'Bran keeps Ada\'s clay shrine to Korrum in the window and lights it on her name-day.' },
  ],
  workLabel: 'About the forge',
  work: [
    'Swords, axes, spears. Horseshoes, mostly. Nobody writes songs about horseshoes.',
    'Steel\'s honest. Heat it, hit it, it does what you tell it. Unlike sons.',
    { t: 'Council orders. Gate fittings, pike heads. Pays. I\'d rather it didn\'t.', min: 2 },
    { t: 'Hilde says my edges are rough. My edges are fine. Hers are too fussy. Polish a sword like that, you\'re asking it to be pretty instead of sharp.', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'Should I tell her you said so?', r: 'Tell her what you like. She\'ll only say I\'m crude. She says it every morning. Gives the day a shape.', tr: 1 },
        { tone: 'curious', l: 'Why do you care so much what she thinks?', r: '~He reddens under the soot. “Don\'t. Hand me the file.”', tr: 0 },
        { tone: 'blunt', l: 'Her armour\'s better than your blades.', r: '~He stares. Then, grudging: “Aye. It is. Don\'t you dare tell her.”', tr: 1 },
        { tone: 'kind', l: 'I think she likes your work more than she says.', r: 'Hmph. Hilde doesn\'t like anything. ...Did she say something?', tr: 1 },
      ] } },
  ],
  news: [
    'News. Iron\'s dear. That\'s news.',
    { t: 'Council wants more pike heads. Said militia\'s growing. Militia\'s shrinking, from where I stand.', min: 2 },
    { t: 'Ned won\'t look at me. Boy used to eat at my table four nights a week. Now he crosses the street. Something\'s wrong.', if: 'duty:bran_dace !flag:dace_told' },
    { t: 'Told Ned I don\'t blame him. I don\'t. Mostly. He ran because they all ran. I\'d have wanted Dace to run.', if: 'flag:dace_told', min: 2 },
    { t: 'Hammered Voss\'s gate fittings today. Hit every rivet like it was his face. Best work I\'ve done all year.', if: 'flag:bran_angry' },
    { t: 'Big grey wolf\'s dead, they say. Hobb came in to buy me a drink. Hobb. Bought a drink. That\'s the real news.', if: 'boss:greymaw' },
  ],
  halvard: [
    'He sat with me every night for a week after Ada died. Didn\'t say much. Didn\'t need to.',
    { t: 'He\'ll turn up. Stubborn as an anvil, that one.', if: '!found' },
    { t: 'Halvard came in a week before he went. Wanted a lantern bracket that wouldn\'t snap. Said he\'d be crawling. I asked where. He said “down.”', if: '!found', min: 2, learn: 'Halvard had Bran make him a sturdy lantern bracket for crawling, a week before he went below.' },
    { t: 'Dead. Right. ...Right.', if: 'found',
      ask: { opts: [
        { tone: 'blunt', l: 'Yes. Dead. And I want the man who did it.', r: '~He looks at you a long time. “Then you come to me first. For a blade. Not for anything stupid.”', tr: 1 },
        { tone: 'kind', l: '~Stand there with him. Say nothing.', r: '~After a long while he puts one heavy hand on your head, the way you\'d steady a colt. Then goes back to work.', tr: 1 },
        { tone: 'pious', l: 'He\'s with Aurel now, in the light.', r: 'Aye. Maybe. He\'d want you to say that. Doesn\'t help me.', tr: 0 },
        { tone: 'curious', l: 'They say a goblin knife. Do you believe it?', r: 'Seen goblin knives. Ugly things. Saw tooth. Tear. They told me the cut was clean. Goblins don\'t do clean.', tr: 1, learn: 'Bran says goblin blades tear; a clean cut is not goblin work.' },
      ] } },
    { t: 'I made the bracket for his lantern. Should\'ve made it break. Should\'ve made him stay.', if: 'found', min: 3 },
  ],
  caves: [
    'Caves. Don\'t like them. Hill people say the stone listens.',
    { t: 'Goblins down there forge. Good iron, ugly work. Somebody taught them proper bellows, once. Wasn\'t them.', min: 2 },
    { t: 'Four ways at the bottom, Ned says. You find the right one, you find my boy. You hear me?', if: 'flag:seek_dace' },
    { t: 'Goblin king\'s dead? Bring me one of their hammers. Want to see how they temper. Professional curiosity. And spite.', if: 'boss:grotsnag' },
    { t: 'You\'ve got their seals. Little stone things, aye? Let me see. ...Ha. Somebody cut that with a proper chisel. A long time ago.', if: 'seals:2' },
  ],
  gods: [
    'Not a praying man. Ada was.',
    { t: 'Korrum. Stone Father. Her lot put salt on cairns. I put a horseshoe on the shrine once. She laughed for a week.', min: 2 },
    { t: 'You said that prayer for Dace. Didn\'t ask me to kneel. Didn\'t make me say anything. That\'s the right way.', if: 'duty:bran_dace',
      ask: { opts: [
        { tone: 'kind', l: 'You don\'t have to know the words. I\'ll say them.', r: '~He nods, jaw tight. “Aye. Good lad.”', tr: 1 },
        { tone: 'pious', l: 'You should come to the dawn service sometime.', r: 'Don\'t push it.', tr: -1 },
        { tone: 'joke', l: 'Next time I\'ll pray for your edges too. Hilde says they need it.', r: '~He throws a rag at you. It\'s a good throw.', tr: 1 },
        { tone: 'blunt', l: 'You prayed too. I saw your lips move at the shrine.', r: '~Long silence. “Tell anyone and I\'ll shoe you.”', tr: 1 },
      ] } },
  ],
  gossip: [
    'Don\'t gossip.',
    { t: 'Rolf counts my ales. Thinks I don\'t see. I see. I count his teeth.', min: 1 },
    { t: 'Abel\'s twins are poorly. Made him new hoops. Don\'t tell him they\'re new. He\'ll want to pay.', min: 2 },
    { t: 'Voss comes in himself, sometimes. Never touches anything. Stands by the door like he\'s waiting for a fire to start.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'What does he want with you?', r: 'Says it\'s gate fittings. Looks at my blades like he\'s counting them. Like he\'s counting who might hold one.', tr: 1 },
          { tone: 'blunt', l: 'Next time, throw him out.', r: 'And lose the council\'s coin? Iron\'s dear, lad. Pride\'s dearer. Can\'t afford both.', tr: 0 },
          { tone: 'joke', l: 'Maybe he\'s scared of the forge biting.', r: '~A grim little grin. “Maybe I\'ll let it.”', tr: 1 },
          { tone: 'kind', l: 'You don\'t have to deal with him alone.', r: 'Hm. Hilde said the same. Wish you\'d both stop being right.', tr: 1 },
        ] } },
  ],
  about: {
    hilde: [
      'Hilde. Across the street. Fussy. Polishes everything. Thinks she\'s better than me.',
      { t: 'She is, mind. Not at blades. At... keeping going.', min: 2 },
      { t: 'She brought me soup when Ada died. Left it on the step. Didn\'t knock. Still got the bowl. Never gave it back. Excuse to go over, someday.', min: 4 },
    ],
    dace: [
      'My boy. Nineteen. Thinks he knows everything.',
      { t: 'Told him the militia was Voss\'s dog on a rope. Last thing I said to him. Last thing.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'It won\'t be the last thing. You\'ll get to say more.', r: '~He nods without looking up. “Aye. Aye. I\'ll say sorry. First thing.”', tr: 1 },
          { tone: 'blunt', l: 'You were right about the militia.', r: 'Being right\'s worth nothing. Ask any smith who\'s right about a bad blade after it snaps.', tr: 1 },
          { tone: 'pious', l: 'Aurel can carry your words to him.', r: '~His jaw sets. “I\'ll carry my own words, lad.”', tr: -1 },
          { tone: 'curious', l: 'Why did he join?', r: 'To get away from me. Ada\'s gone, Halvard\'s gone, and I\'m a bear. You\'d join too.', tr: 0 },
        ] } },
    ],
    ned: [
      'Ned. Ate half my larder growing up. Good lad. Scared lad.',
      { t: 'He knows something. Can\'t look at me. Can\'t make him. I could shake it out of him. I won\'t.', if: '!flag:dace_told', min: 2 },
      { t: 'He told me. Shook the whole time. Took more nerve than going down the hole. I said so.', if: 'flag:ned_told_bran' },
    ],
    voss: [
      'Pays on time. That\'s all I\'ll say.',
      { t: 'Pays on time and never once asked my boy\'s name. Sends him into a hole and can\'t say his name.', if: 'flag:dace_told' },
    ],
    abel: [
      'Abel\'s a good man. Quiet. Makes a barrel that doesn\'t leak. Respect that.',
    ],
    rolf: [
      'Rolf talks too much and pours too slow. Best friend I\'ve got in this town. Don\'t tell him.',
    ],
  },
  extra: {
    ada: { label: 'About Ada', if: 'met:hilde', seq: true, lines: [
      { t: 'Ada. Hm. What about her.', min: 3 },
      { t: 'Mountain woman. Hands like mine. Could lift an anvil end. Sang badly on purpose so I\'d laugh.', min: 3 },
      { t: 'Winter fever. Six years back. Tamsin did what she could. Halvard sat up. I just held her hand and watched the fire.', min: 3 },
      { t: 'She told me, near the end, not to be a bear about it. I\'ve been a bear about it. Six years.', min: 4 },
      { t: 'She\'d have liked Hilde. That\'s the trouble.', min: 4, learn: 'Bran admits Ada would have liked Hilde, and that this is what troubles him.' },
    ] },
  },
};

// Hilde Marsh: armorer, ex-Warden soldier. Clipped, precise, dry; military habits; guilt under iron control.
DIALOGUE.hilde = {
  intro: [
    '~She looks at the doorway behind you before she looks at you. “Acolyte. Close that. The draught warps the leather.”',
  ],
  greet: [
    { t: 'Acolyte. Buying or browsing?', max: 1 },
    { t: '{n}. You\'re standing straighter. Good.', min: 2 },
    { t: '~She is oiling a hauberk link by link and doesn\'t look up. “Morning. You\'re early. I approve.”', if: 'phase:Dawn,Morning' },
    { t: 'Shop\'s closing. If it\'s quick, it\'s fine.', if: 'night', max: 2 },
    { t: '~The shutters are half-closed though it\'s still light. She opens them a crack for you.', if: 'night', min: 3 },
    { t: 'Raiders on the road. Everyone wants a gambeson by tomorrow. I want a nap by next year.', if: 'event:raids' },
    { t: 'Tannery\'s got hides cheap. Finally. Bring me nothing. I\'m drowning in leather.', if: 'event:tannery' },
    { t: '~She meets your eyes, which she rarely does. “Acolyte.” It sounds like thank you.', if: 'duty:hilde_confession' },
    { t: 'You\'ve come up from below again. Sit. Let me see that strap. You\'ve been fighting with it loose.', if: 'junction' },
  ],
  bye: [
    'Mind your straps.',
    'Go on.',
    { t: 'Keep your guard up. Not just in the caves.', min: 2 },
    { t: '~She snaps a small half-salute, catches herself, and turns it into adjusting her collar.', min: 3 },
  ],
  how: [
    'Busy. Short-handed. Fine.',
    'Same as ever. I don\'t change much. It\'s a virtue in armour.',
    { t: 'Bran\'s been at the Fox again. Not that it\'s my business. I just hear him singing on the way home. Badly.', min: 1 },
    { t: 'I sleep. Not well. But I sleep.', min: 3,
      ask: { opts: [
        { tone: 'kind', l: 'If you ever want to talk at night, the temple lamps are always lit.', r: 'I know. Halvard told me the same. I never took him up on it as often as I should have.', tr: 1 },
        { tone: 'curious', l: 'What keeps you awake?', r: '~Her hand stops on the leather. “Old work. Leave it.”', tr: 0 },
        { tone: 'blunt', l: 'You look like you haven\'t slept in years.', r: 'Eighteen. Not that anyone\'s counting.', tr: 1, learn: 'Hilde has not slept well in eighteen years.' },
        { tone: 'joke', l: 'Have you tried sleeping in mail? Very supportive.', r: '~The corner of her mouth goes up. “I have. Do not recommend.”', tr: 1 },
      ] } },
    { t: 'Worse than I thought I\'d be. I\'d made my peace with him being gone. I hadn\'t made it with him being dead.', if: 'found' },
  ],
  self: [
    'I make armour. I fix armour. I tell people their armour is wrong. That\'s all.',
    { t: 'I soldiered. Up north. I don\'t talk about it, and I\'d thank you to stop looking like you\'re about to ask.', min: 1 },
    { t: 'I learned the trade in a field camp from an armourer who had one ear and a lot of opinions. He said a strap is a promise. I believed him.', min: 2 },
    { t: 'I came south with nothing but a kit bag and a bad conscience. The kit bag wore out.', min: 3 },
  ],
  workLabel: 'About the armoury',
  work: [
    'Leather stops a knife. Mail stops a sword. Nothing stops a fool.',
    'If it fits wrong, bring it back. I mean it. Armour that doesn\'t fit is a coffin with buckles.',
    { t: 'My apprentice ran off to the militia. Thought soldiering was glamorous. I could have told him. I did tell him. He didn\'t listen.', min: 1 },
    { t: 'You don\'t check your buckles before you go down. I can tell. The leather\'s rubbed on one side.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Will you show me how?', r: '~She does, kneeling, with quick sure hands. “There. Check twice. Once for you, once for whoever needs you home.”', tr: 1 },
        { tone: 'blunt', l: 'I don\'t have time for buckles.', r: 'Then you have time for a funeral. Sit down.', tr: 0 },
        { tone: 'joke', l: 'I was hoping the goblins wouldn\'t notice.', r: 'Goblins notice everything below the knee. They\'re short.', tr: 1 },
        { tone: 'pious', l: 'Aurel guards me.', r: 'Aurel guards fools with good buckles. Sit.', tr: 0 },
      ] } },
  ],
  news: [
    'News. Leather prices went up again. Someone\'s hoarding hides.',
    { t: 'Militia drills behind the council house every morning now. Badly. They hold their spears like brooms.', min: 1 },
    { t: 'The councilman came in to have his gloves restitched. He tipped. He never tips. I didn\'t like it.', min: 2 },
    { t: 'There\'s a fever in town. Tamsin\'s run off her feet. I took her a cushion for the stool. Don\'t tell her it was me.', if: 'event:fever' },
    { t: 'I went to see Berta. I sat in her kitchen and couldn\'t say a word. She poured me tea anyway. I\'m going back tomorrow.', if: 'flag:hilde_amends', learn: 'Hilde has begun visiting Old Berta.' },
    { t: 'They say the snake priest is dead below. Good. I\'ve seen their venom work on mail. It eats the rings.', if: 'boss:hierophant' },
  ],
  halvard: [
    'He knew things about me nobody else did. He never once used them.',
    { t: 'He\'ll be cursing in the dark down there, in three languages. I taught him one of them.', if: '!found' },
    { t: 'He came by before he left. Asked if I still had my old kit. I said I\'d burned it. He said “good,” and then, “I didn\'t.”', if: '!found', min: 3, learn: 'Before he left, Halvard told Hilde he had kept something from his old life that she had burned from hers.' },
    { t: 'Dead. All right. All right.', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'He thought the world of you.', r: '~She turns away to the window. “He shouldn\'t have. But thank you.”', tr: 1 },
        { tone: 'pious', l: 'Aurel has him. He\'s in the light.', r: 'Then he\'s in better company than he was. Good.', tr: 1 },
        { tone: 'blunt', l: 'Somebody killed him. Not a goblin.', r: '~Very quietly: “I know. I know what a soldier\'s cut looks like.”', tr: 1, learn: 'Hilde believes Halvard was killed by a trained soldier, not a goblin.' },
        { tone: 'curious', l: 'Did you know what he was carrying?', r: 'Papers. Old ones. That\'s all I knew. That\'s all I let myself know.', tr: 0 },
      ] } },
    { t: 'He used to sit there on that crate and say nothing for an hour. I\'ve not moved the crate.', if: 'found', min: 2 },
  ],
  caves: [
    'Caves are bad ground. No retreat, no light, no flank. Don\'t fight in a corridor if you can fight at a door.',
    { t: 'The rat-folk come in numbers. Shields up, back to a wall. Never let them get behind you.', if: 'junction' },
    { t: 'A sealed door with four locks. Soldiers know that shape. It\'s a border. Somebody made peace down there once, and someone else wants it broken.', if: 'junction', min: 3 },
    { t: 'You\'ve got three of their seals. Keep them on your body. Not in a pack. Packs get taken.', if: 'seals:3' },
  ],
  gods: [
    'I don\'t trouble the gods. They have enough troubles.',
    { t: 'Aurel. I keep a lamp. Not for prayer. Because I don\'t like the dark.', min: 2 },
    { t: 'We had chaplains, up north. Some of them were good men. Most of them blessed whatever they were told to bless.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Was Halvard one of the good ones?', r: '~A long look. “Ask me that again when you\'re older. Or when I\'m braver.”', tr: 0 },
        { tone: 'pious', l: 'A true priest blesses only what Aurel would bless.', r: 'Yes. That\'s what he said. And then he did something about it.', tr: 1 },
        { tone: 'kind', l: 'I won\'t bless anything I don\'t believe in.', r: 'See that you don\'t. It\'s the only promise that matters in your trade.', tr: 1 },
        { tone: 'joke', l: 'Should I bless your shop? Your buckles?', r: 'Bless Bran\'s. His need it more.', tr: 1 },
      ] } },
  ],
  gossip: [
    'I don\'t gossip. I observe.',
    { t: 'Bran across the street hums when he\'s quenching. Off-key. Every time. It\'s the only way I know he\'s alright.', min: 1 },
    { t: 'Rolf leaves a bottle out for me one night a year. I\'ve never thanked him. He\'s never asked. That\'s friendship.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Why that one night?', r: 'It\'s a night. That\'s all. Don\'t ask Rolf either. He won\'t tell you, and I\'ll know you asked.', tr: 0 },
        { tone: 'kind', l: 'I could leave a lamp lit for you that night too.', r: '~She is quiet a moment. “I\'d like that. Don\'t tell anyone.”', tr: 1 },
        { tone: 'joke', l: 'Does he leave out the good stuff, at least?', r: 'Never. Cheapest bottle in the cellar. Which is how I know it\'s kindness and not business.', tr: 1 },
        { tone: 'blunt', l: 'You should thank him.', r: 'Probably. You first. You owe him for about ten bowls of stew.', tr: 0 },
      ] } },
    { t: 'The councilman\'s wife walks the long way round to avoid my shop. I don\'t blame her. I\'d avoid me too.', min: 3 },
  ],
  about: {
    bran: [
      'Bran. Crude edges, cruder manners. Fine steel, though. Don\'t tell him.',
      { t: 'He drinks because of Dace. He thinks nobody knows. Everybody knows.', min: 2 },
      { t: '~She touches something under her counter without seeming to know she does it. “He made me a knife once. I use it for leather.” She does not use it for leather.', min: 4 },
    ],
    voss: [
      'The councilman pays his bills. Promptly.',
      { t: 'I knew him before. Before here. That\'s all I\'ll say, and it\'s more than I should.', min: 3 },
      { t: 'I don\'t salute him. My arm does. I\'m working on it.', min: 4, if: 'flag:hilde_captain' },
    ],
    berta: [
      'Old Berta. I don\'t... I don\'t visit. She doesn\'t ask me to.',
      { t: 'She knows me. I know she knows. We\'ve both been very careful not to say so for eighteen years.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'Knows you from where?', r: '~Her mouth goes tight. “From before. From a place that isn\'t there anymore.”', tr: 0 },
          { tone: 'kind', l: 'Maybe she\'s waiting for you to visit.', r: 'Maybe. Or maybe she\'s waiting for me to have the decency to stay away.', tr: 1 },
          { tone: 'blunt', l: 'Eighteen years is long enough to be careful.', r: '~She looks at you hard. Then away. “Yes. It is.”', tr: 1 },
          { tone: 'pious', l: 'Peace between two people is a rite too.', r: 'Halvard said that. Word for word. Did he teach you to say it at me?', tr: 1 },
        ] } },
      { t: 'She poured me tea and called me “dear.” I\'d rather she\'d thrown it at me. That would have been easier.', if: 'flag:hilde_amends' },
    ],
    ned: [
      'The Harrow boy holds a spear well. Wears a helmet two sizes wrong. I\'ve offered to fit it. He says it was his father\'s.',
    ],
    rolf: [
      'Rolf asks nothing. Best quality in a man.',
    ],
    dace: [
      'Dace came in last winter for a jerkin. Haggled like his father. Paid like his mother would\'ve wanted.',
    ],
  },
  extra: {
    torch: { label: 'About the autumn night', if: 'duty:hilde_straps', seq: true, lines: [
      { t: 'You\'ve heard I drink at the Fox one night a year. It\'s true. Don\'t make it a story.', min: 3 },
      { t: 'It\'s a name-day. Not mine. A village\'s. I drink to it because nobody else will.', min: 3 },
      { t: 'I can still smell it when the leaves burn in autumn. Thatch and wet wool. I can\'t walk past a bonfire.', min: 4 },
      { t: 'You were the size of a loaf. I saw him carry you out. I\'ve never told anyone that. I\'m telling you.', min: 4, if: 'duty:hilde_confession', learn: 'Hilde saw Halvard carry a baby out of burning Ashvale. It was you.' },
    ] },
  },
};

// Ned Harrow: gate guard, eighteen. Earnest, nervous, over-formal, cracks into a boy; guilt over Dace.
DIALOGUE.ned = {
  intro: [
    '~He snaps to attention so fast his helmet slides over his eyes. He pushes it back up. “Halt! I mean. Hello. North gate. State your... oh, it\'s you. Acolyte.”',
  ],
  greet: [
    { t: 'Halt! Who goes— oh. Sorry. Hello, Acolyte.', max: 1 },
    { t: 'Acolyte! I mean, {n}. I\'m allowed to say {n}, aren\'t I?', min: 2 },
    { t: '~He is yawning so hard his helmet tilts. “Dawn watch. Nobody\'s come through but a goat. I let it pass. It looked harmless.”', if: 'phase:Dawn' },
    { t: '~He holds his torch out at the dark road with both hands. “Oh. Just you. Good. I mean. Hello.”', if: 'night' },
    { t: 'You\'re going up the North Road again? I have to write down everyone who goes. I\'ve written you down eleven times.', min: 2 },
    { t: '~He looks at you, then quickly away, toward the cave road.', if: 'duty:bran_dace !flag:dace_told' },
    { t: '~He doesn\'t flinch when you walk up. It\'s new. He seems to notice it too.', if: 'flag:dace_told' },
    { t: 'Caravan through the gate this morning! Real wagons! I searched all of them. Very thoroughly. One had cheese.', if: 'event:caravan' },
    { t: 'Raiders on the road. Sergeant says double watch. I\'m on both of them.', if: 'event:raids' },
  ],
  bye: [
    'Safe roads, Acolyte! That\'s what we say. I made it up. We say it now.',
    'Take torches! Always take more torches.',
    { t: 'Come back through this gate, all right? I\'ll be counting.', min: 2 },
    { t: '~He salutes. It\'s a bad salute. He means every bit of it.', min: 3 },
  ],
  how: [
    'Fine! Alert. Very alert. Vigilant, that\'s the word.',
    'Tired. Don\'t tell the sergeant.',
    { t: 'I keep thinking I hear him. Dace. Whistling on the road. It\'s just the wind in the watchtower.', min: 3 },
    { t: 'Better. Since I told it. Like I took off a pack I\'d been sleeping in.', if: 'flag:dace_told' },
    { t: 'Not good, if I\'m honest. Are we meant to be honest? You\'re temple. I think I have to be.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'You can always be honest with me, Ned.', r: '~He nods several times, very fast. “Right. Good. I\'ll remember that.”', tr: 1 },
        { tone: 'joke', l: 'Only on seventh days. The rest of the week, lie freely.', r: '~He laughs, then claps a hand over his mouth because he\'s on duty.', tr: 1 },
        { tone: 'blunt', l: 'You look like you\'re hiding something.', r: '~He goes white. “I\'m not. I\'m on watch. That\'s all.” His spear shakes.', tr: -1 },
        { tone: 'pious', l: 'Aurel sees the truth whether we speak it or not.', r: 'Oh. Oh no. That\'s worse.', tr: 0 },
      ] } },
  ],
  self: [
    'Ned Harrow, militia, north gate! Second watch. And first watch, lately.',
    { t: 'My da was a sergeant before me. The helmet was his. I\'ll grow into it. Ma says by thirty.', min: 1 },
    { t: 'Dace and I joined the same day. He signed first because he could write his name faster. I\'ve been practising.', min: 2 },
    { t: 'I wanted to be a carter, really. I like horses. Horses don\'t give orders.', min: 3 },
  ],
  workLabel: 'About the gate',
  work: [
    'The cave is up the North Road, past the old watchtower. Take torches. It\'s black as pitch down there.',
    'I log everyone in and out. Name, time, purpose. Mostly purpose is “cows.”',
    { t: 'Three levels down it splits four ways. Goblins, rat-men, pale things, and snakes that walk. That\'s what the old hands say. I haven\'t been past the first. Well. Once.', min: 1 },
    { t: 'The councilman checks my log every evening. Every name. He asks who went north and how long they stayed. He asks about you most.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'What do you tell him?', r: 'The truth. Mostly. I wrote you down as “errand, temple.” That\'s true! That\'s just not very much of it.', tr: 1, learn: 'Voss reads Ned\'s gate log every evening and asks particularly about the acolyte.' },
        { tone: 'kind', l: 'Don\'t get yourself in trouble for me.', r: 'I won\'t. I\'m good at looking stupid. It\'s very useful in the militia.', tr: 1 },
        { tone: 'blunt', l: 'Stop writing me down.', r: 'I can\'t! He counts the lines. He\'d know. I can write very small, though.', tr: 0 },
        { tone: 'joke', l: 'Write that I\'m tall and dashing.', r: '~He actually writes it. “Tall... dashing...” Then rubs it out, looking guilty.', tr: 1 },
      ] } },
  ],
  news: [
    'Nothing on the road. Two farmers, one goat. Same goat as yesterday. I think it lives here now.',
    { t: 'Sergeant says the militia\'s going back up the road. Nobody wants to go. Nobody says so.', if: '!flag:dace_told', min: 2 },
    { t: 'Bran shook my hand at the Fox. Didn\'t say anything. Just shook it. Then bought me a pie. I cried in the pie a bit.', if: 'flag:ned_told_bran', learn: 'After Ned told Bran the truth, Bran shook his hand and bought him a pie.' },
    { t: 'The big grey wolf! It\'s dead! Hobb came past the gate holding a tooth the size of my hand. He let me touch it.', if: 'boss:greymaw' },
    { t: 'You reached the four ways? The real four ways? Nobody in the militia\'s been past the second level. Not and come back saying so.', if: 'junction' },
    { t: 'Ground shook last night. Sergeant said it was nothing. It wasn\'t nothing. The watchtower dropped three stones.', if: 'gate' },
  ],
  halvard: [
    'He gave me a blessing on my first night at the gate. Said even a gate needs someone kind standing at it.',
    { t: 'He went out this gate with a lantern and a satchel full of papers. I wrote it down: “Father Halvard. North. Business: his own.” He told me to write that.', if: '!found', learn: 'Ned logged Halvard leaving north with a lantern and a satchel; Halvard told him to write “business: his own.”' },
    { t: 'I keep the torch at the gate lit for him. Every night. In case he\'s walking back in the dark. Is that stupid?', if: '!found',
      ask: { opts: [
        { tone: 'kind', l: 'It\'s not stupid. It\'s the kindest thing anyone\'s done.', r: '~He stands a little straighter. “Right. Then I\'ll keep doing it.”', tr: 1 },
        { tone: 'pious', l: 'That\'s Aurel\'s own work. A lamp kept lit.', r: 'Really? I just thought he\'d want to see the road.', tr: 1 },
        { tone: 'blunt', l: 'He\'s been gone too long, Ned.', r: '~His face crumples, then sets. “Then I\'ll keep it lit for Dace.”', tr: 0 },
        { tone: 'joke', l: 'Only stupid if you set your helmet on fire.', r: 'That was ONE time.', tr: 1 },
      ] } },
    { t: 'They told me at the gate. When you brought him... I put the torch out. Then I lit it again. I didn\'t know which was right.', if: 'found' },
    { t: 'The councilman asked me, after, if Halvard\'s satchel came back with him. Why would he ask about a satchel? A man\'s dead.', if: 'found', min: 2 },
  ],
  caves: [
    'Goblins, rat-men, pale things, and snakes that walk. Down at the bottom. That\'s what the old hands say.',
    { t: 'There\'s things that come up as far as the first level at night. Bats the size of capons. I don\'t like capons now.', min: 1 },
    { t: 'When we went in, on the patrol, something breathed at the back. Big. Dace was at the back. That\'s all I— that\'s all.', if: 'flag:dace_told', min: 2 },
    { t: 'You\'ve got seals from down there? Can I— no. No, don\'t show me. If the councilman asks, I want to not know.', if: 'seals:1' },
    { t: 'The rat queen\'s dead? I\'m going to sleep for a week. After my watch. Two weeks.', if: 'boss:vesk' },
  ],
  gods: [
    'I give Aurel a bit of my bread before every watch. For the light. Night watch is very long.',
    { t: 'Ma\'s family kept Korrum. I keep a coin in my boot for him. Dace said that\'s why I walk funny.', min: 2 },
    { t: 'Did the gods see us run? Is that a thing they hold against you? Running?', min: 3, if: 'flag:dace_told',
      ask: { opts: [
        { tone: 'pious', l: 'The gods see what you do now, not just what you did.', r: '~He breathes out. “Then I\'ll do something now. Something good.”', tr: 1 },
        { tone: 'kind', l: 'You ran because you were afraid. Anyone would.', r: 'Dace wouldn\'t have. ...No. He would. He\'d have run faster. He was always faster.', tr: 1 },
        { tone: 'blunt', l: 'You left him behind. The gods might. Dace might.', r: '~He looks like you hit him. He doesn\'t say anything at all.', tr: -1 },
        { tone: 'curious', l: 'Does it feel like they do?', r: 'At night. Not at dawn. At dawn I think maybe they don\'t mind so much.', tr: 0 },
      ] } },
  ],
  gossip: [
    'I\'m not supposed to gossip on duty. ...Do you want to hear some?',
    { t: 'Rolf told me he used to be an adventurer. Then he told Pippa he used to be a pirate. Then he told the goat he used to be a duke.', min: 1 },
    { t: 'Hilde offered to fit my helmet properly. For free. She\'s terrifying. I said no. I think she was being nice.', min: 1 },
    { t: 'Mortimer the clerk came to the gate at night and just stood looking at the North Road. When I said hello he dropped his lantern.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Did he say why he was there?', r: 'He said “just checking the road is still there.” Then he asked if Halvard had papers with him. Everybody asks about the papers.', tr: 1 },
        { tone: 'joke', l: 'Was the road still there?', r: 'It was! I checked too, after. I check it a lot now.', tr: 1 },
        { tone: 'kind', l: 'He sounds lonely. Be gentle with him.', r: 'I gave him my hot stone from Berta. He held it like it was a kitten.', tr: 1 },
        { tone: 'blunt', l: 'You should report that.', r: 'To who? The councilman? He\'d only ask why Mortimer was at the gate. Then Mortimer would be in trouble. I didn\'t want that.', tr: 0 },
      ] } },
    { t: 'Sergeant says the councilman pays the militia out of his own purse. That\'s generous. Isn\'t it? I keep wanting it to be generous.', min: 3 },
  ],
  about: {
    dace: [
      { t: 'Dace is— was— is my best friend. He\'s on patrol.', if: '!flag:dace_told' },
      { t: 'Dace could whistle with two fingers and call a dog from three fields off. He taught me. I still can\'t.', min: 2 },
      { t: 'He went in at the back so I could go in front. He said I had the better torch. I didn\'t. His was better.', min: 3, if: 'flag:dace_told',
        ask: { opts: [
          { tone: 'kind', l: 'He wanted you safe. That was his choice, not your fault.', r: '~He wipes his nose on his sleeve. “I keep trying to believe that. I\'ll try harder.”', tr: 1 },
          { tone: 'pious', l: 'Veyra watches lost hunters. Maybe she watches him.', r: 'Dace did hang feathers once. For a girl, mind, not Veyra. Maybe it counts.', tr: 1 },
          { tone: 'blunt', l: 'Then go down after him.', r: '~He goes pale, then grips his spear. “If the sergeant lets me. If he doesn\'t... I don\'t know.”', tr: 0 },
          { tone: 'curious', l: 'What breathed at the back? What did it look like?', r: 'I didn\'t see. Just eyes, low down, and the smell. Like wet rope and old fire.', tr: 0 },
        ] } },
    ],
    bran: [
      { t: 'Bran. I... he fed me. Half my life. I can\'t— could we talk about someone else?', if: '!flag:dace_told' },
      { t: 'He said he didn\'t blame me. I don\'t believe him yet. But I\'m going to the forge Thursdays again. He said I still hold tongs wrong.', if: 'flag:dace_told' },
    ],
    voss: [
      'The councilman is my commander. I follow orders. That\'s what a guard does.',
      { t: 'He said not to tell anyone. For the town\'s sake. Panic, he said. He said it very kindly. I\'ve never been so frightened of kindness.', min: 2, if: 'duty:ned_patrol' },
    ],
    hilde: [
      'Hilde checks the gate hinges when she walks past. Every time. I\'ve never seen anyone check hinges before. She says it\'s habit.',
    ],
    pippa: [
      'Pippa tried to join the militia. She\'s ten. I gave her a stick and told her she guards the bakery now. She takes it very seriously.',
    ],
    berta: [
      'Old Berta brings me a hot stone wrapped in wool on cold nights. For my hands. She says I remind her of somebody. Everybody says that to everybody here.',
    ],
  },
  extra: {
    whistle: { label: 'About Dace', if: 'duty:bran_dace', seq: true, lines: [
      { t: 'You want to know about Dace? He\'s the funny one. I\'m the one who laughs.', min: 2 },
      { t: 'He joined to annoy his da. I joined because he did. That\'s the whole reason. Don\'t write it down.', min: 3 },
      { t: 'The night before the patrol he gave me his good knife. Bran made it. He said “hold this, you\'ll lose yours.” I still have it. I keep thinking I have to give it back.', min: 3, learn: 'Ned still carries the Bran-made knife Dace lent him the night before the patrol.' },
      { t: 'If you find him down there, {n}... tell him I\'ve got his knife. Tell him I\'ll give it back. Tell him I\'m sorry I ran.', min: 4, if: 'flag:dace_told' },
    ] },
  },
};

// Tamsin Reed, apothecary: sharp, dry, bossy, secretly tender.
DIALOGUE.tamsin = {
  intro: [
    'You\'re Halvard\'s lad. Don\'t lean on that shelf, it\'s older than you and twice as useful.',
    '~She looks you up and down the way she\'d look at a bruise, deciding whether it needs lancing.',
  ],
  greet: [
    { t: 'Shop\'s open. Wipe your feet. No, properly.', max: 1 },
    { t: 'Up already? Good. Dew\'s still on the comfrey. That\'s when it\'s worth picking.', if: 'phase:Dawn,Morning' },
    { t: 'Closing soon. If you\'re bleeding, be quick about it.', if: 'night' },
    { t: 'Acolyte. You look peaky. Eat something before you faint on my floor.', min: 1, max: 2 },
    { t: '~She doesn\'t look up from her mortar. “Sit. I\'ll be a minute. Or ten.”', min: 2 },
    { t: 'There he is. Kettle\'s on the back, help yourself, don\'t touch the brown jar.', min: 3 },
    { t: 'Half the town has the fever and the other half thinks garlic cures it. Garlic cures vampires and conversation.', if: 'event:fever' },
    { t: 'Every fool in the valley wants healroot this week. I\'ve got so much I\'m using it to prop the door.', if: 'event:herbglut' },
    { t: 'Back from the dark again. Let me see your hands. Hm. Fewer holes than last time.', if: 'junction' },
    { t: '~She is grey around the eyes and has not slept. “Come in, {n}. Shut the door. I don\'t want the whole lane watching me cry into the feverfew.”', if: 'found', min: 2 },
  ],
  bye: [
    'Go on. Wash your hands on the way out.',
    'Mind that cough of yours. Yes, you have one. I can hear it.',
    { t: 'Off you go. Come back in one piece, or I\'ll stitch you into one.', if: 'junction' },
    { t: 'Go carefully, {n}. I\'m too old to start liking someone new.', min: 4 },
  ],
  how: [
    'Busy. Tired. Right about everything, as usual.',
    'My knees are sixty and my temper is forty. It evens out.',
    { t: 'The Cooper twins are eating porridge again. So: better than I was.', if: 'duty:abel_twins' },
    { t: '~She squints at the label on a jar, then puts it down too quickly. “Fine. Why does everyone keep asking.”', min: 2, max: 3 },
    { t: 'Better, since you know. I hate that it\'s better. Sit down before I say something kind.', min: 3, if: 'duty:tamsin_eyes' },
    { t: 'Every seventh day I put the kettle on for two. Thirty years. Hands don\'t know he\'s gone.', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Put it on for two anyway. I\'ll come.', r: '~She sniffs hard. “You\'ll argue badly. I\'ll have to teach you.”', tr: 1 },
        { tone: 'pious', l: 'Aurel keeps a lamp lit for him.', r: 'He\'d say that. Then I\'d say a lamp doesn\'t need keeping if nobody\'s reading by it. Then we\'d be at it till dark.', tr: 1 },
        { tone: 'joke', l: 'Who\'s going to lose the arguments now?', r: '~A cracked laugh. “Him. Always him. He just never admitted it.”', tr: 1 },
        { tone: 'blunt', l: 'Then stop doing it.', r: 'And you stop breathing, while you\'re at it. Some habits are the only thing holding a person up.', tr: -1 },
      ] } },
  ],
  self: [
    'Sixty years in this valley. I\'ve set every bone in it at least once, and some of them twice because the owner was an idiot.',
    'My mother was a midwife. I was catching babies at eleven. You learn not to be squeamish, or you learn to faint somewhere convenient.',
    { t: 'I never married. Had offers. None of them could tell yarrow from hemlock, and I wasn\'t going to poison a man by accident.', min: 2 },
    { t: '~She taps the side of her nose. “I can tell you what\'s in a jar from across the room. Smell doesn\'t go. That\'s something.”', min: 3,
      learn: 'Tamsin is learning to work her shop by smell alone.' },
  ],
  workLabel: 'About the apothecary',
  work: [
    'Healroot for wounds, willow bark for fever, mint for the stomach, and a firm word for everything else.',
    'The trick isn\'t the herb. It\'s the dose. Same root that cures a cough will stop a heart if you\'re greedy.',
    { t: 'Bring me anything green from the Whisperwood and I\'ll tell you if it heals, hurts, or just tastes of feet.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Which roots lie?', r: 'Ah. Moonwort looks like healroot and does nothing. Hollow-stem looks like nothing and does everything. Come back after closing and I\'ll show you.', tr: 1 },
        { tone: 'joke', l: 'Do you have anything for goblins?', r: 'Yes. It\'s called a sword. Bran sells them. I sell what you put on afterwards.', tr: 0 },
        { tone: 'pious', l: 'All healing is Aurel\'s gift.', r: 'Then Aurel can come and grind it. My wrists are killing me.', tr: 0 },
        { tone: 'blunt', l: 'Can you teach me enough to keep myself alive down there?', r: 'Finally. A sensible question. Press, then bind, then pray. In that order. Halvard always did it backwards.', tr: 1 },
      ] } },
    { t: 'Pippa comes in after the lamps now. She\'s broken two jars and memorised forty plants. I\'m keeping her.', if: 'flag:tamsin_teaches',
      learn: 'Tamsin has begun teaching Pippa the apothecary\'s trade.' },
    { t: 'With the fever going round I\'m mixing willow by the bucket. If you see anyone flushed and shivering, send them here, not to the Fox.', if: 'event:fever' },
  ],
  news: [
    'Abel\'s twins have a fever that won\'t break. I\'m out of healroot, and the Whisperwood\'s full of wolves. Wonderful.',
    { t: 'The twins are up and fighting over a wooden horse. Best news I\'ve had all month.', if: 'duty:abel_twins' },
    { t: 'Hobb Thatcher was in for a sprain and called the enchantress a witch. I put extra vinegar in his poultice.', if: '!flag:mirela_cleared' },
    { t: 'Hobb Thatcher bought a rune from Mirela. A rune! Took him five years and a priest, but he got there.', if: 'flag:mirela_cleared' },
    { t: 'Half the militia came through with cave-bites last week. Rats, mostly. Something bigger, once. Nobody would say what.', if: '!found' },
    { t: 'They say the great grey wolf is dead. Hobb\'s been in twice to tell me. I\'ve no sheep, but I nodded.', if: 'boss:greymaw' },
    { t: 'Strange thing. People coming in to buy burn salve. No fires in town. They\'ve been near the North Road, though.', if: 'seals:2' },
  ],
  halvard: [
    { t: 'Stubborn old goat. If he\'s hurt down there, he\'ll have splinted it himself and splinted it wrong.', if: '!found' },
    { t: 'He took a satchel of my bandages when he left. Didn\'t ask. Means he expected to need them. That\'s what keeps me up.', if: '!found', min: 1,
      learn: 'Halvard took bandages from Tamsin\'s shop the morning he left, without asking.' },
    { t: 'Thirty years we argued whether the gods heal or herbs do. I still think I was right. He still thinks he was. Thought.', if: '!found', min: 2 },
    { t: '~She stands very still. “Goblins, they say. Show me a goblin that cuts that clean. I\'ve stitched goblin wounds. They\'re ragged. They\'re angry.” She sets down the pestle. “That wasn\'t a goblin.”', if: 'found',
      learn: 'Tamsin does not believe a goblin killed Halvard; the wound was too clean.' },
    { t: 'I should have gone with him. I\'d have slowed him down. That was rather the point.', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'He wouldn\'t have let you. You know that.', r: 'I know it. Knowing never helped anyone sleep.', tr: 1 },
        { tone: 'blunt', l: 'You\'d have died too.', r: 'Probably. I\'d have died arguing, though. He\'d have hated that. Worth it.', tr: 0 },
        { tone: 'pious', l: 'He walked his own road. Aurel lit it for him.', r: 'Aurel could have lit it a bit brighter. ...Sorry. That\'s grief talking. Sit with me a minute.', tr: 1 },
        { tone: 'curious', l: 'Did he tell you where he was going?', r: 'He said, “to settle an old account.” I thought he meant the tavern slate.', tr: 0 },
      ] } },
  ],
  caves: [
    'I don\'t go in caves. I stitch up the people who do.',
    'Bat bites go bad fast. Wash them in vinegar the same day, or come and see me with a green arm.',
    { t: 'Goblins down past the third level, they say, and snakes that stand up and talk. I\'ve seen a militia boy with two punctures in his calf, neat as needles. That was no adder.', if: 'junction',
      learn: 'Tamsin has treated a militiaman for a bite she believes came from the serpent-folk.' },
    { t: 'You\'ve got one of those seals, Pippa says. Don\'t show me. I don\'t want to know what it is, I want to know what it cost you.', if: 'seals:1',
      ask: { opts: [
        { tone: 'blunt', l: 'A lot of blood. Not all of it mine.', r: 'Hm. Honest. Let me look at the parts that were yours.', tr: 1 },
        { tone: 'joke', l: 'Two potions and a very good boot.', r: '~She snorts despite herself. “Bring the boot. I\'ll bless it.”', tr: 1 },
        { tone: 'kind', l: 'Less than it would have cost the town.', r: 'You sound like him. I hate it. Keep doing it.', tr: 1 },
      ] } },
    { t: 'The ground hummed last night. Under my floorboards. I\'m old, not mad. Something down there\'s woken up.', if: 'gate !wyrm' },
    { t: 'You killed the thing in the Deep. Good. Now sit still while I clean that.', if: 'wyrm' },
  ],
  gods: [
    'Aurel, mostly. Nemora for the old women who need to remember their recipes. Veyra if the herbs come up thin.',
    'I leave a twist of yarrow at the Green Lady\'s stone every spring. Not because I think she wants it. Because my mother did.',
    { t: 'Halvard and I fought about this for thirty years. He said the gods work through the herbs. I said the herbs work through the herbs. We were both right, and both insufferable.', min: 2 },
    { t: 'When the lamps went dim in the temple I nearly prayed. Nearly. Don\'t tell anyone, it would ruin me.', min: 3 },
  ],
  gossip: [
    'Rolf\'s knee is weather-sick again. That man will predict rain right up to his funeral.',
    'Bran Hollin drinks like his liver owes him money. Somebody tell him I said so. Not me. Somebody.',
    { t: 'Mirela isn\'t a witch. She\'s a woman who lives alone and knows things. If that\'s a witch, so am I, and I\'ll curse the next man who says it.',
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll stand with her too.', r: 'Good. Stand loudly. Quiet support is just watching with better manners.', tr: 1 },
        { tone: 'curious', l: 'Who started calling her that?', r: 'Who starts anything here? A man in a good coat says a word in the square, and fools pick it up like a dropped penny.', tr: 1 },
        { tone: 'joke', l: 'Can you actually curse people?', r: 'I can make them wish they\'d never been born. It\'s called a purgative.', tr: 1 },
        { tone: 'pious', l: 'Aurel\'s light falls on everyone alike.', r: 'Then tell it to Hobb Thatcher. Use small words.', tr: 0 },
      ] } },
    { t: 'Elsbeth Voss came in for sleeping draughts. Not for herself. She paid in silver and wouldn\'t meet my eye.', min: 2,
      learn: 'Elsbeth Voss buys sleeping draughts from Tamsin, not for herself.' },
    { t: 'Old Berta tells everyone her cough is nothing. It\'s not nothing. It\'s eighteen years of breathing smoke she never got out of her chest.', min: 3 },
    { t: 'Hilde Marsh came by asking what Berta drinks for her lungs. Hilde. Who crosses the street to avoid her. I gave her the recipe and didn\'t ask.', if: 'flag:hilde_amends' },
  ],
  about: {
    mirela: [
      'Best company in this town. Says three words an hour and every one\'s worth having.',
      { t: 'I take tea with her on market days. Someone has to be seen walking in her front door.', min: 2 },
      { t: 'Somebody leaves dead crows on her step. If I find out who, I have a tincture that\'ll keep him in the privy for a week.', min: 3 },
    ],
    berta: [
      'Tough old bird. Tougher than me, and I\'m a tough old bird.',
      { t: 'Her lungs rattle like a cart on cobbles. She won\'t take more than half a dose. Says she\'s saving the rest for someone who needs it.', min: 2 },
    ],
    abel: [
      'Good man. Hasn\'t slept since the twins took sick. I gave him something for it and he poured it out.',
      { t: 'He cried on my counter when Lark woke up. I gave him a rag and pretended to be busy with the shelves.', if: 'duty:abel_twins' },
    ],
    pippa: [
      'Pippa Tolly asks more questions than a magistrate. Exhausting child.',
      { t: 'She can name every herb on my shelves now. By smell. Wretched girl. I\'m very proud.', if: 'flag:tamsin_teaches' },
    ],
    aldous: [
      'Aldous brings me his ailments in alphabetical order. He\'s only got to G.',
      { t: 'He lost his spectacles in my healroot bin last week. Found them on his head. Found the healroot in his pocket.', min: 1 },
    ],
    voss: [
      'The councilman pays his bills on time and has never once been ill. I don\'t trust a man with no ailments.',
      { t: 'He told the farmers Mirela curses sheep. I told him to his face he was a fool. He smiled at me. I\'d rather he\'d shouted.', min: 2 },
    ],
    rolf: [
      'Rolf\'s stew is half salt and half sentiment. I eat it every seventh day.',
    ],
  },
  extra: {
    eyes: { label: 'About your eyes', if: 'duty:tamsin_eyes', seq: true, lines: [
      'You\'re going to ask, so ask. Yes, it\'s worse in candlelight. No, I don\'t want to talk about it. Ask anyway, I\'ll tell you.',
      'It started three winters back. I put salt in a fever draught instead of willow. Caught it by the smell, thank the gods. Haven\'t trusted my eyes since.',
      { t: 'Halvard guessed. Of course he did. He started reading my labels aloud “to practise his letters.” The man read Old Highcourtish for fun.',
        learn: 'Halvard secretly read Tamsin\'s jar labels aloud for her once her eyes began to fail.' },
      { t: 'I\'ve put everything I know into a book. Pippa\'s copying it fair. When I can\'t see it any more, someone in this town will still know which roots lie.', if: 'flag:tamsin_teaches',
        ask: { opts: [
          { tone: 'kind', l: 'That\'s the best gift anyone\'s ever given Brambleford.', r: '~She waves it off, but she is pleased, and pink to the ears.', tr: 1 },
          { tone: 'joke', l: 'Will it have a chapter on goblin bites?', r: 'It has six. You\'re in four of them. Anonymously.', tr: 1 },
          { tone: 'pious', l: 'Aurel\'s light passes from hand to hand.', r: 'That\'s from his old dawn sermon. ...Yes. All right. It does.', tr: 1 },
        ] } },
    ] },
  },
};

// Mirela, enchanter: quiet, precise, dry, watchful; a little wary of kindness.
DIALOGUE.mirela = {
  intro: [
    '~A woman with a scarf over her hair looks up from a slab of slate, chisel in hand. She does not smile, but she does not tell you to leave.',
    'You came in the front. Interesting.',
  ],
  greet: [
    { t: 'Yes?', max: 0 },
    { t: 'Acolyte. Mind the crystals. They\'re in a mood.', max: 2 },
    { t: '~She nods once. It is, you understand, a warm welcome.', min: 1 },
    { t: 'Early. Good. The runes take better before the town wakes and starts thinking at them.', if: 'phase:Dawn,Morning' },
    { t: 'You can come in. I was only talking to the slate.', if: 'night' },
    { t: '{n}. Sit. I\'ve made too much tea again.', min: 3 },
    { t: '~There is a broom by the door, and a smear on the step she has not quite scrubbed out.', if: '!flag:mirela_cleared', min: 1 },
    { t: 'No crows today. I keep saying it out loud to see if it stays true.', if: 'flag:mirela_cleared' },
    { t: 'Wizards in the Hall again. They keep calling my runes “provincial.” Then they buy six.', if: 'event:wizards' },
    { t: '~She has taken the scarf off. Her hair is silver as frost. “I\'m not hiding it today. He wouldn\'t want me to.”', if: 'found', min: 2 },
  ],
  bye: [
    'Go well.',
    'Watch the step. It\'s been wet.',
    { t: 'The woods are listening. Speak kindly of them.', min: 2 },
    { t: 'Come back. I mean that, which is rare for me.', min: 4 },
  ],
  how: [
    'Quiet. I like quiet.',
    { t: 'People buy my runes and cross the street. I\'ve decided to find it funny. Some days it is.', max: 2 },
    { t: 'Tired. Somebody threw a stone at the shutter last night. It bounced off the ward. I hope it bounced off him too.', if: '!flag:mirela_cleared', min: 2 },
    { t: 'Better. A child said good morning to me today. Her mother didn\'t pull her away.', if: 'flag:mirela_cleared' },
    { t: 'He was the first person here who said my name properly. Mee-REH-la. Now there\'s you.', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Mirela. I won\'t forget how it goes.', r: '~She looks at you for a long moment. “No. I don\'t think you will.”', tr: 1 },
        { tone: 'curious', l: 'What does it mean, in your mother\'s tongue?', r: '“Still water under leaves.” She thought it would make me patient. It made me hard to find.', tr: 1, learn: 'Mirela\'s name means “still water under leaves” in her mother\'s language.' },
        { tone: 'joke', l: 'I\'ve been saying it wrong this whole time, haven\'t I.', r: 'Only slightly. Like a man with a mouthful of bread. It\'s endearing.', tr: 1 },
        { tone: 'pious', l: 'Aurel knows your name, however it\'s said.', r: 'Perhaps. Aurel never visits. Halvard did.', tr: 0 },
      ] } },
  ],
  self: [
    { t: 'Half one thing, half another. Wholly neither. It\'s a lonely arithmetic.',
      ask: { opts: [
        { tone: 'kind', l: 'You\'re wholly Brambleford, as far as I\'m concerned.', r: '~She tilts her head, as if testing the words for a false stroke. “That\'s a generous sum.”', tr: 1 },
        { tone: 'curious', l: 'Which half carves the runes?', r: 'My mother\'s half holds the chisel. My father\'s half swears when it slips.', tr: 1 },
        { tone: 'blunt', l: 'Most people here are lonely. You\'re not special.', r: '~A pause. Then, unexpectedly, a dry laugh. “No. I suppose not. That\'s almost comforting.”', tr: 0 },
        { tone: 'pious', l: 'The gods made both halves.', r: 'Then they ought to have sent instructions.', tr: 0 },
      ] } },
    'My mother carved runes in living bark. I carve them in slate because slate doesn\'t scream when you\'re clumsy.',
    { t: 'I keep my hair covered because the last time I didn\'t, a man asked how much for it. I don\'t think he meant to buy a rune.', min: 2 },
    { t: 'In the deep woods we don\'t say goodbye. We say “until the leaves.” It means you\'ll see each other when the season turns. I say goodbye here. It took practice.', min: 3 },
  ],
  workLabel: 'About runes',
  work: [
    'Runes don\'t care who carves them. People do.',
    'A rune is a sentence the stone agrees to keep saying. Get one stroke wrong and it says something else. Sometimes loudly.',
    { t: 'Wards for doors, keen-runes for blades, warmth for the old folks\' hearthstones. The warmth sells best. Nobody admits buying it.', min: 1 },
    { t: 'Do you want one? For your blade, before you go back down?', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'What would you carve?', r: 'Keen, and then mercy. Mercy keeps it from turning in your hand. Most smiths leave it off. It\'s fiddly.', tr: 1 },
        { tone: 'blunt', l: 'Something that kills goblins.', r: 'Everything kills goblins, eventually. I\'ll carve you something that keeps you alive. It\'s harder.', tr: 0 },
        { tone: 'pious', l: 'Bless it in Aurel\'s name, then.', r: 'I carve, you bless. Between us we might make one honest sword.', tr: 1 },
        { tone: 'joke', l: 'Can you make it glow? Pippa would love that.', r: '~A faint, surprised smile. “Pippa would love a stick if it glowed. Yes. For her, a little.”', tr: 1 },
      ] } },
    { t: 'Odessa buys my small runes for her rings and pays fair, which is more than the Arcanum does.', min: 2 },
  ],
  news: [
    'The woods are restless this year. The birds are going quiet earlier.',
    { t: 'Hobb Thatcher says I cursed his sheep. His sheep were eaten by a wolf the size of a cart. I don\'t do carts.', if: '!boss:greymaw !flag:mirela_cleared' },
    { t: 'The grey wolf is dead. I felt the woods breathe out the night it happened. That was you?', if: 'boss:greymaw' },
    { t: 'The councilman stood in the square and called me “the enchantress” loudly enough for the farmers. It\'s a title. I\'d rather have my name.', if: '!flag:mirela_cleared', min: 1,
      learn: 'Voss publicly blamed “the enchantress” for the farmers\' troubles.' },
    { t: 'Hobb bought a ward for his gate. He held it like it might bite him. Then he tipped his hat.', if: 'flag:mirela_cleared' },
    { t: 'The goblins worship fire, Aldous says. Fire runes are hungry. Whoever is feeding theirs, it isn\'t coal.', if: 'boss:grotsnag' },
    { t: 'The tanners are at it again. My runes come out smelling of hide for a week.', if: 'event:tannery' },
  ],
  halvard: [
    'He let me sit at the back of the temple and never once asked me to pray. That was why I did.',
    { t: 'Before he left he asked me to carve a rune on his lantern. A seeing-rune. I asked what he wanted to see. He said, “the truth, in the dark.”', min: 2, if: '!found',
      learn: 'Mirela carved a seeing-rune on Halvard\'s lantern before he went into the caves.' },
    { t: 'His lantern rune hasn\'t gone cold. I\'d feel it if it had. Wherever he is, the light\'s still lit.', if: '!found', min: 1 },
    { t: '~She is holding a slate with a broken rune on it. “His lantern rune went out three nights ago. I told myself it was the damp.” Her hand shakes. “It wasn\'t the damp.”', if: 'found' },
    { t: 'If you find his lantern, bring it to me. The rune remembers what it saw. Some of it. I\'ll make it tell me.', if: 'found', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'You can read what a rune remembers?', r: 'Faces, if the light was good. Voices, never. Enough to know who stood over him.', tr: 1 },
        { tone: 'kind', l: 'I\'ll find it. For both of us.', r: '~She nods, and doesn\'t trust her voice.', tr: 1 },
        { tone: 'blunt', l: 'Maybe some things are better not seen.', r: 'You were raised by a man who walked into a cave to see one. Don\'t pretend.', tr: -1 },
      ] } },
  ],
  caves: [
    'Stone remembers. Those tunnels are old enough to remember everything.',
    { t: 'There\'s a door down there that\'s warded in four hands. Four different alphabets on one lock. I\'d love to see it. From a long way off.', min: 1 },
    { t: 'The pale folk in the Hollows keep Nemora\'s shrines, they say. Water and memory. If anyone down there knows what happened to Halvard, it\'s them.', if: 'junction',
      learn: 'Mirela thinks the Hollowfolk, keepers of Nemora\'s shrines, may remember what happened to Halvard.' },
    { t: 'Show me the seal. ...No, don\'t give it to me. Just tilt it. Serpent script around the rim, and a newer mark scratched under it. Someone\'s re-sealed this. Recently.', if: 'seals:1', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Can you tell whose mark it is?', r: 'Not a rune. A stamp. Pressed, not carved. Soldiers stamp things. Carvers don\'t.', tr: 1, learn: 'Mirela noticed a newer, stamped mark under the old script on a kingdom seal.' },
        { tone: 'blunt', l: 'Just tell me if it\'s dangerous.', r: 'Everything down there is dangerous. This is dangerous and recent. That\'s worse.', tr: 0 },
        { tone: 'kind', l: 'Thank you for looking. I know you hate the caves.', r: 'I hate what\'s in them. Stone I don\'t mind. Stone tells the truth.', tr: 1 },
      ] } },
    { t: 'You opened the door. I felt it from here. My crystals all turned to face north.', if: 'gate' },
  ],
  gods: [
    'My mother\'s people keep Veyra. Not with prayers. With silence, and leaving the last apple on the tree.',
    'Aurel is a good god for a village. Warm, hearth-shaped. I like him at a slight distance, like a fire.',
    { t: 'Nemora is the one I talk to when the letters go unanswered. She keeps secrets. She doesn\'t give them back.', min: 2 },
    { t: 'The antlers on the Green Lady\'s stone were turned around last month. That isn\'t a thing a deer does. Someone in town still knows the old ways, and they\'re angry.', min: 3 },
  ],
  gossip: [
    'I don\'t hear gossip. People stop talking when I walk in.',
    { t: 'Tamsin is the only one who comes for tea. She talks enough for both of us. It\'s restful.', min: 1 },
    { t: 'Aldous sent me a draft on the old runes of the Vale. Forty pages. Thirty-one footnotes wrong. I fixed them in green ink so he\'d know they were from me.', min: 1 },
    { t: 'The councilman\'s wife walks past my shop every morning and looks at the wards in the window. She\'s never come in. She looks like she wants one for her bedroom door.', min: 3,
      learn: 'Elsbeth Voss lingers at Mirela\'s window as if she wants a ward for her bedroom door.' },
    { t: 'Hilde Marsh bought a rune of quiet sleep. Paid without a word. Came back a week later and bought another.', min: 2 },
    { t: 'Tamsin holds her jars very close lately. She thinks no one notices. I notice. I haven\'t said.', min: 3, if: '!duty:tamsin_eyes' },
  ],
  about: {
    tamsin: [
      'She shouts “witch” back at anyone who says it to me. It isn\'t helpful. It is very loyal.',
      { t: 'She brings me honey cakes and says they\'re left over. Nobody has left over honey cakes every single week.', min: 2 },
    ],
    aldous: [
      'He calls my runes “frightfully clever.” He means it. I\'ve never known what to do with that.',
      { t: 'His footnotes are a disgrace. His heart is a library. I correct one and keep the other.', min: 2 },
    ],
    hobb: [
      { t: 'Hobb Thatcher thinks I cursed his sheep. If I cursed things, Hobb, your boots would have learned to walk away.', if: '!flag:mirela_cleared' },
      { t: 'Hobb tips his hat to me now. It\'s very awkward for both of us. I\'ve started tipping my scarf back.', if: 'flag:mirela_cleared' },
      { t: 'His wife Greta hangs feathers for Veyra. She knows. She told him he\'d gone soft listening to the councilman.', min: 2 },
    ],
    voss: [
      'The councilman speaks very quietly. Quiet men are the ones you have to listen to closely.',
      { t: 'He bought nothing from me, and then he called me a curse on the farmers. A man doesn\'t frighten a town for no reason. He wanted their eyes on me, not somewhere else.', min: 3,
        learn: 'Mirela believes Voss turned the town against her to keep their eyes off something else.' },
    ],
    odessa: [
      'Odessa pays fair, laughs loud, and never asks about my ears. A perfect customer.',
      { t: 'She reads palms. She read mine once and went quiet, and then gave it back very gently. I didn\'t ask.', min: 2 },
    ],
    berta: [
      'The old woman on the south lane bought a warmth-rune for her hearth. She paid in lavender. I took it.',
    ],
  },
  extra: {
    letters: { label: 'About the letters', if: 'duty:mirela_thanks', seq: true, lines: [
      'You asked once who I write to. My mother\'s people. A village in the deep Whisperwood where the trees are older than Highcourt.',
      'Eleven letters in five years. I leave them on Veyra\'s stone. They\'re gone by morning. No one has ever answered.',
      { t: 'Maybe the deer eat them. I\'ve made my peace with feeding the deer.', ask: { opts: [
        { tone: 'kind', l: 'Then write one to Brambleford instead. We\'ll answer.', r: '~She laughs, actually laughs, and covers her mouth as if it got out without permission.', tr: 1 },
        { tone: 'curious', l: 'Why did your mother leave them?', r: 'She loved a man from the valley. They never forgave her. I suppose I was the proof.', tr: 1, learn: 'Mirela\'s mother was cast out by her people for loving a valley man.' },
        { tone: 'pious', l: 'Veyra hears what\'s left on her stone.', r: 'Then she\'s a very slow correspondent.', tr: 0 },
        { tone: 'joke', l: 'Have you tried bribing the deer?', r: 'With what? I am already the deer\'s best supplier of paper.', tr: 1 },
      ] } },
      'I didn\'t send the last one. I put it in the stove. It burned green. That\'s the woods saying it agrees, I think.',
    ] },
  },
};

// Aldous Grey, wizard of the Arcanum: vague, tangential, kindly, sharper than he looks.
DIALOGUE.aldous = {
  intro: [
    '~An old man in robes the colour of weak tea is patting his pockets, then his sleeves, then a stuffed owl that may or may not be a customer.',
    'Ah! A visitor. You haven\'t seen a quill? Grey? About so long? No? Never mind. Welcome, welcome.',
  ],
  greet: [
    { t: 'Hello, hello. Have we met? We have? Splendid. I\'ll remember next time. Probably.', max: 1 },
    { t: 'Halvard\'s boy! Come in, mind the... ah. The owl. He doesn\'t mind, he\'s stuffed.', min: 1 },
    { t: 'Morning, is it? I\'d wondered why the candles looked so pale.', if: 'phase:Dawn,Morning' },
    { t: 'Still up? So am I. The stars are much better company than the Arcanum quarterly.', if: 'night' },
    { t: 'Colleagues in town! Dreadful people. Shan\'t introduce you. They\'d only explain things to you.', if: 'event:wizards' },
    { t: '~He looks up from a chessboard where one side has not moved in weeks. “Ah. {n}. I was just... dusting.”', min: 2, if: '!found' },
    { t: 'There you are. I\'ve been saving a question for you since Tuesday. I\'ve forgotten it, but I saved it.', min: 3 },
    { t: 'The junction! Four stairs! Oh, I should love to see it. Tell me everything. Slowly. Write it down if you can.', if: 'junction', min: 1 },
    { t: '~He has put the chess pieces away for the first time in twenty years. The board sits empty and very clean.', if: 'found' },
  ],
  bye: [
    'Off you go. Mind the stairs. Mind all the stairs, actually.',
    'Goodbye, goodbye. Oh! I had something to tell you. No. It\'s gone.',
    { t: 'Come back soon. Bring questions. Bring biscuits, too, if it\'s no trouble.', min: 2 },
    { t: 'Be careful, dear boy. Clever people have been very foolish about those caves.', min: 3, if: 'junction' },
  ],
  how: [
    'Eighty-one. Or eighty-two. I stopped counting when the cake got too crowded.',
    'Splendid, apart from the knees and the eyes and, oh, the memory. What was the question?',
    { t: 'Rather lonely on the seventh day, if I\'m honest. One plays chess against oneself and always loses.', if: '!found', min: 2 },
    { t: '~He takes off his spectacles, cleans them, puts them on, and takes them off again. “Not well. Not well at all. Thank you for asking.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'Would you teach me chess? He\'d want the board used.', r: 'Would I...? Oh. Oh, yes. You\'ll lose dreadfully. He did too, at first. Seventh day, then. Bring your patience.', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps the memory of those we lose.', r: 'Does she? Good. Mine\'s a sieve. I should like someone reliable to hold on to him.', tr: 1 },
        { tone: 'joke', l: 'At least now you might win a game.', r: '~A startled laugh. “Oh, cruel. Oh, true. He\'d have laughed at that. He\'d have let me win once and denied it.”', tr: 1 },
        { tone: 'blunt', l: 'He knew the risk. So did you.', r: 'Yes. I knew. I knew and I lent him the book. You needn\'t remind me.', tr: -1 },
      ] } },
  ],
  self: [
    'I\'ve been a wizard sixty years. Mostly it\'s reading. The fireballs are greatly exaggerated. I\'ve done two. One was on purpose.',
    'I kept a cat called Footnote. She was very much like her name: small, essential, and constantly underfoot.',
    { t: 'I have read every book in the valley. Some twice. One, regrettably, three times, because I forgot I\'d read it.', min: 1 },
    { t: 'At Highcourt I had a study with a window over the cathedral. You could hear the dawn bells. Here I have the market. It\'s louder and much more honest.', min: 3 },
  ],
  workLabel: 'About magic',
  work: [
    'Magic is mostly patience, and the rest is spelling. Get a letter wrong and you summon a herring.',
    'Scrolls, wands, the odd reagent. If it fizzes, I sell it. If it explodes, I used to sell it.',
    { t: 'The trick to a ward is believing you deserve to be safe. Most people get that bit wrong. Wizards especially.', min: 2 },
    { t: 'Do you want to learn a little? Just a little. Nothing that singes.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Where does magic actually come from?', r: 'Ah! Now. The Arcanum says the stars, the cathedral says the gods, and my grandmother said onions. I lean toward grandmother.', tr: 1 },
        { tone: 'pious', l: 'Isn\'t it the gods\' gift?', r: 'Everything is, if you squint. Halvard squinted beautifully. I\'m too short-sighted to manage it.', tr: 0 },
        { tone: 'joke', l: 'Can you teach me the herring one?', r: '~He brightens enormously. “It\'s a very good herring. Very fresh. No, no, I mustn\'t. Rolf banned me after the last one.”', tr: 1 },
        { tone: 'blunt', l: 'I need something that works in a fight.', r: 'Light, then. Light works in every fight. Goblins hate it, bats hate it, and liars hate it most of all.', tr: 0 },
      ] } },
  ],
  news: [
    'Have you heard? No. Neither have I. I was hoping you would have.',
    { t: 'The Arcanum quarterly arrived. They\'ve discovered a new colour. It\'s beige. I shan\'t renew.', min: 1 },
    { t: 'The Cooper twins drew me a picture of a wizard. It has a very large hat and no face. I think it\'s accurate.', if: 'duty:abel_twins' },
    { t: 'Mirela is being treated abominably. I wrote a letter to the council. Mortimer said it was the longest letter they\'d ever received and nobody had read it.', if: '!flag:mirela_cleared', min: 1 },
    { t: 'The goblin king is dead, I hear? Grotsnag. Dreadful name. Probably a very complicated one in Goblin, mistranslated by a sergeant.', if: 'boss:grotsnag' },
    { t: 'The Matriarch of the Hollows, gone. I wonder who keeps Nemora\'s shrines now. Somebody must remember.', if: 'boss:matriarch' },
    { t: 'Every silversmith in the valley is out of iron, and every wizard thinks it\'s an omen. It\'s a mule that went lame on the Highcourt road.', if: 'event:ironshort' },
  ],
  halvard: [
    { t: 'He played chess every seventh day for twenty years. Always won. Always looked astonished about it. Dreadful actor.',
      ask: { opts: [
        { tone: 'joke', l: 'Did you ever think about cheating?', r: 'Constantly. He\'d have noticed and pretended not to. That\'s worse than losing.', tr: 1 },
        { tone: 'curious', l: 'What did you talk about over the board?', r: 'Everything except the game. Gods, grain prices, old wars. Lately, old wars more than anything.', tr: 1 },
        { tone: 'kind', l: 'He told me those games were the best part of his week.', r: '~He has to take his spectacles off. “Did he. Oh, the old fraud. Did he really.”', tr: 1 },
        { tone: 'blunt', l: 'Maybe you\'re just bad at chess.', r: 'That is the prevailing theory, yes. I\'ve never been able to disprove it.', tr: 0 },
      ] } },
    { t: 'He was reading history, near the end. Old history. I should have asked why. I was too pleased to have someone to talk to about it.', min: 1 },
    { t: 'He\'ll turn up. He\'s like my spectacles. One looks everywhere and then, there he is, on top of one\'s head.', if: '!found' },
    { t: 'He took my Chronicle of the Vale. The pages he cut out were the ones I always told him not to read aloud in company.', if: 'duty:aldous_book', min: 2,
      learn: 'Aldous had warned Halvard not to read the Ashvale chapter of the Chronicle aloud in company.' },
    { t: '~He sets a chess piece down, a white priest, and turns it to face the window. “There. Now he can see the market. He liked to see the market.”', if: 'found' },
    { t: 'A goblin knife, they say. Twenty years he beat me at chess and he never once left his king open. He didn\'t walk into a goblin. Someone walked into him.', if: 'found', min: 2 },
  ],
  caves: [
    'Four kingdoms beneath us, so the old books say. Goblins, rat-folk, pale Hollowfolk, and serpents. All terribly cross with one another.',
    { t: 'The sealed door at the bottom wants four seals, one from each realm. It was meant as a peace, you know. None of them could open it alone. Very clever. Very sad.', min: 1,
      learn: 'Aldous says the four-seal door was made as a peace: no single realm could open it alone.' },
    { t: 'There was a reeve, once, up the valley, who kept all four realms talking. Traded salt with the goblins, honey with the rat-folk. A remarkable man. Name escapes me. Probably on purpose.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Was his name Aldren?', r: '~He goes very still, and then very busy with a scroll. “Where did you hear that? No, don\'t tell me. Better I don\'t know.”', tr: 1, learn: 'Aldous recognises the name Aldren as the reeve who kept peace with the four realms.' },
        { tone: 'blunt', l: 'You remember his name perfectly well.', r: 'I remember a great many things perfectly well, dear boy. That\'s why I was asked to leave Highcourt.', tr: 1 },
        { tone: 'kind', l: 'You don\'t have to tell me now.', r: 'Thank you. I\'m old and I frighten easily. Ask me when I\'m braver. Or drunker.', tr: 1 },
      ] } },
    { t: 'One of the four has been bought, I\'d wager. Peace never breaks by itself. Somebody pays for the hammer.', if: 'junction', min: 2 },
    { t: 'Three seals! Good heavens. Do be careful with the fourth. The last lock is always the one that bites.', if: 'seals:3' },
    { t: 'You slew a wyrm. A real one. I shall have to rewrite chapter nine entirely. I am delighted.', if: 'wyrm' },
  ],
  gods: [
    'All of them, a little. It seems rude to leave anyone out.',
    { t: 'Nemora is the scholar\'s goddess, really. Memory and secrets. I leave her a blue stone on my desk. She keeps it. I keep losing it.',
      ask: { opts: [
        { tone: 'pious', l: 'Aurel is the god of this village. Do you honour him?', r: 'Every morning, by opening the shutters. He seems content with that. Most gods are less fussy than their priests.', tr: 1 },
        { tone: 'curious', l: 'What secrets does Nemora keep for you?', r: 'If I told you, dear boy, she wouldn\'t be keeping them, would she.', tr: 0 },
        { tone: 'joke', l: 'Maybe Nemora\'s hiding the stone on purpose.', r: '~He gasps, delighted. “A theological prank! I must write that down. Where\'s my quill?”', tr: 1 },
      ] } },
    { t: 'The serpent-folk worship patience, essentially. Ssa\'thal, the Coiled One. Dangerous thing to worship. Patient people wait a very long time to get even.', min: 2 },
  ],
  gossip: [
    'Rolf banned me from the Fox for a week. Something about a herring. I maintain it was a very small herring.',
    { t: 'Mirela corrects my footnotes in green ink. Thirty-one, last time. She was right about thirty. The thirty-first is a matter of opinion. Mine.', min: 1 },
    { t: 'Mortimer the clerk came to ask me what happens to records that are burned. I told him they go to Nemora. He went quite white.', min: 2 },
    { t: 'The councilman bought a book from me once. History of the northern orders. He brought it back the next day and asked if I\'d read it. I said no. I had, of course.', min: 3,
      learn: 'Voss bought a history of the northern orders from Aldous, then returned it, anxious to know if Aldous had read it.' },
    { t: 'Old Berta and I sometimes talk about places that aren\'t on the map any more. She does the talking. I do the remembering.', min: 3 },
  ],
  about: {
    mirela: [
      'Frightfully clever runes. Frightfully. She\'s the only person in this valley who can out-pedant me.',
      { t: 'Her mother\'s people carve in living wood, you know. I asked her to teach me. She said I\'d bore the tree.', min: 2 },
    ],
    tamsin: [
      'Tamsin says I\'m a hypochondriac. I\'ve brought her all twenty-six of my complaints, in order. She\'s rather impatient at F.',
    ],
    berta: [
      'Charming woman. Makes a tisane that could raise the dead. Well. Reawaken the sleepy.',
      { t: 'She knows things about the valley I\'ve only read. She was there for some of them. One mustn\'t ask. One listens.', min: 3 },
    ],
    voss: [
      'The councilman? Very polished. Very well read, in a narrow way. I find narrow readers alarming.',
      { t: 'He asks me, every so often, what I used to study at Highcourt. I tell him beetles. He looks relieved. I don\'t study beetles.', min: 3 },
    ],
    pippa: [
      'Pippa asks me how the stars stay up. I tell her nobody knows. She is outraged. It\'s the best part of my week.',
    ],
    anselm: [
      'A Highcourt man. Ink on his fingers. I like him enormously and I shan\'t tell him a thing.',
      { t: 'He asked whether I knew a Brother Halvard from the old days. I said I knew a chess player. Highcourt has a long memory and short mercy.', min: 3 },
    ],
  },
  extra: {
    highcourt: { label: 'About Highcourt', if: 'met:anselm', seq: true, lines: [
      { t: 'I was a scholar of the Arcanum Library at Highcourt for thirty years. Very dull. Very happy.', min: 3 },
      { t: 'I wrote a little paper on the tithes of the northern orders. Where the grain went in the famine years. Just sums, really. I was always good at sums.', min: 3 },
      { t: '~He lowers his voice, which for Aldous means it is now merely loud. “A gentleman from the Wardens came to see me. Very courteous. Suggested my health required the mountain air.” He taps his spectacles. “My health has been excellent ever since. Funny, that.”', min: 4,
        learn: 'Aldous was forced out of Highcourt after writing about where the Wardens\' famine tithes went.' },
      { t: 'Halvard read the paper. I gave him the only copy. I wonder if it was in the satchel.', min: 4,
        ask: { opts: [
          { tone: 'curious', l: 'What did the sums say?', r: 'That a great deal of grain went north in a year when nobody had any. And that one village refused. Sums can be very loud, if you let them.', tr: 1 },
          { tone: 'kind', l: 'You were brave to write it.', r: 'I was stupid to write it. Brave would have been publishing it. Halvard was the brave one.', tr: 1 },
          { tone: 'blunt', l: 'Then you know what happened at Ashvale.', r: '~He looks at you for a long time, very clear-eyed, not vague at all. “I know what the sums say. You\'re finding out the rest.”', tr: 1 },
        ] } },
    ] },
  },
};

// Old Berta, widow and Ashvale refugee: "dear", "child", gentle, fierce, remembers everything.
DIALOGUE.berta = {
  intro: [
    'Well now. Let me look at you, dear. ...Yes. Yes, you\'ve grown.',
    '~She peers up at you a long moment, then pats your arm as if checking you are real.',
  ],
  greet: [
    { t: 'Hello, dear. Mind the step, it\'s crooked as a councilman.', max: 2 },
    { t: 'Up with the lark, child? So am I. Old women and bakers, we never sleep.', if: 'phase:Dawn,Morning' },
    { t: 'Come in out of the dark, dear. Lamps are lit. Aurel likes a lit window.', if: 'night' },
    { t: '~She coughs into a lavender-scented handkerchief and waves you in with the other hand.', if: '!duty:berta_cough' },
    { t: 'There\'s my good lad. Breathing easy today, look. All your doing.', if: 'duty:berta_cough' },
    { t: 'Come in, come in. The kettle\'s always on for you.', min: 2 },
    { t: '{n}! I baked. Badly. Eat it anyway, it\'s good for my pride.', min: 3 },
    { t: '~She looks past you, up the lane, before she smiles. Then she smiles properly.', min: 3, if: 'flag:berta_captain' },
    { t: 'Oh, child. Come here. No, closer. Old arms want holding today.', if: 'found' },
    { t: 'The fever\'s going round, dear. Have you had your onion broth? Have some of mine.', if: 'event:fever' },
  ],
  bye: [
    'Go on, dear. Mind the wolves.',
    'Off you go. Wear a scarf. I don\'t care if it\'s warm.',
    { t: 'Aurel keep you, child. And Korrum, for the stone. And anyone else who\'s listening.', min: 2 },
    { t: 'Come back to me, {n}. I\'ve buried enough.', min: 4 },
  ],
  how: [
    'Oh, creaking along, dear. Like a gate. Still opens.',
    { t: 'Chest\'s tight. It\'s the damp. It\'s always the damp, or the cold, or the year.', if: '!duty:berta_cough' },
    { t: 'I slept the whole night through. Do you know when that last happened? Neither do I.', if: 'duty:berta_cough' },
    { t: 'Firewood\'s getting low. Never mind, dear. I\'ll manage. I\'ve two good hands. Well. One and a half.', if: '!found', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll bring you wood every week. Like he did.', r: '~Her eyes fill. “You don\'t have to, child.” A pause. “Oak, mind. Not pine. Pine spits.”', tr: 1 },
        { tone: 'joke', l: 'One and a half hands is plenty for an axe.', r: 'Cheeky. Your grandfather was cheeky. ...Never mind me.', tr: 1 },
        { tone: 'blunt', l: 'You should ask the council for help.', r: '~Her face closes like a shutter. “I\'ll not ask that council for the time of day, dear.”', tr: -1 },
        { tone: 'pious', l: 'Aurel provides for the hearth.', r: 'He does, dear. Mostly through young men with axes.', tr: 0 },
      ] } },
    { t: '~She sits with her hands folded around a cold cup. “I keep listening for his cart on the lane. Thursday mornings. Rattle and a whistle.” She is quiet. “Thursday came.”', if: 'found' },
  ],
  self: [
    'I\'ve lived here eighteen years, dear. The oldest woman in town and still a newcomer. That\'s Brambleford.',
    'I was married forty years to a man who mended roofs. He fell off exactly one, and it was ours. Laughed all the way down.',
    { t: 'I grow lavender because it was all over the lanes where I grew up. You could smell it from the road. You could smell it a long way off.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Where did you grow up, Berta?', r: 'Up the valley, dear. A place with a mill and an orchard. It isn\'t there now. Lavender grows back. Villages don\'t.', tr: 1 },
        { tone: 'kind', l: 'Your cottage smells like home to me, too.', r: '~She beams and coughs and beams again. “Then take a sprig. Put it under your pillow.”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps what the lavender reminds you of.', r: 'She does, dear. Better than I do, some nights.', tr: 1 },
        { tone: 'joke', l: 'Tamsin says lavender cures nothing.', r: 'Tamsin says that about everything she doesn\'t sell.', tr: 1 },
      ] } },
    { t: '~She glances at the window. “Where I came from had a well-house in the square. Cool in summer, never froze. The children hid in it when they played seek.”', min: 3, if: '!duty:berta_ashvale' },
  ],
  news: [
    'Market day, dear. Marta\'s rye is good this week. Wendell\'s prices are not.',
    { t: 'The Cooper twins are better. I heard them shrieking down the lane. Lovely noise.', if: 'duty:abel_twins' },
    { t: 'Hilde Marsh came to my door. Hilde! Stood there with a basket of kindling like a girl at her first dance. I let her in. We didn\'t say much.', if: 'flag:hilde_amends',
      learn: 'Hilde Marsh went to Berta\'s door with kindling, and Berta let her in.' },
    { t: 'They say the councilman\'s clerk has been burning paper. You can smell it from my garden. Paper smoke is different, dear. I\'d know.', if: 'flag:rolls_burned', min: 2 },
    { t: 'That great grey wolf is dead, Hobb says. He\'s been telling it at every door. He told me twice.', if: 'boss:greymaw' },
    { t: 'There\'s a caravan in! Silk and spices. I can\'t afford any of it, but I like to smell it.', if: 'event:caravan' },
  ],
  halvard: [
    'Father Halvard carried you out of that fire himself, you know. Said it was a sign from Aurel.',
    'He never once let me carry my own firewood. Eighteen years.',
    { t: 'He\'ll come back, dear. He always came back. He came back from worse than a cave.', if: '!found', min: 1 },
    { t: 'Before he left, he sat in that chair and asked me to tell him the names again. All of them. Everyone I remembered from home. He wrote them down.', if: '!found', min: 3,
      learn: 'Before he left, Halvard had Berta recite every name she remembered from Ashvale, and wrote them down.' },
    { t: '~She rocks a little. “He carried you out of the fire and now he\'s gone into the dark and no one carried him.” She grips your hand. “You bring him home, child. Up into the light. He shouldn\'t lie down there.”', if: 'found' },
    { t: 'A goblin knife, they tell me. Goblins. That\'s what they said last time, too. Plague, last time. There\'s always a word ready, dear, before the body\'s cold.', if: 'found', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Who says it was goblins?', r: 'Who says anything in this town, dear? The man who says it first, in the square, in a good black coat.', tr: 1 },
        { tone: 'kind', l: 'I\'ll find out what really happened. I promise.', r: 'I know you will. That\'s what frightens me. ...Go on, then. But come home.', tr: 1 },
        { tone: 'pious', l: 'The truth comes to light. Aurel sees it.', r: 'Aurel saw it last time too, dear. He was very quiet about it.', tr: 0 },
        { tone: 'blunt', l: 'You think Voss did it.', r: '~She puts a finger to your lips, quick as a bird. “I think it\'s going to rain. That\'s all I think. Drink your tea.”', tr: 0 },
      ] } },
  ],
  caves: [
    'Caves are for bats and bad men, dear. Stay out of them. ...You won\'t, will you. You\'re his.',
    { t: 'Somebody I knew, long ago, used to go down and talk with the folk below. Bring back honey cakes and odd little carvings. They weren\'t monsters to him.', min: 3,
      learn: 'Berta knew someone who once traded peacefully with the folk below the caves.' },
    { t: 'Four doors, you say? And all of them shut tight against each other. There was a time they weren\'t. There was a man who kept them talking.', if: 'junction', min: 2 },
    { t: 'You\'ve got one of their seals. Let me hold it. ...Oh. Oh, I\'ve seen this mark. On a letter, on a reeve\'s table, long ago.', if: 'seals:1', min: 3 },
    { t: 'Something under the hills has been snoring all my life, dear. I\'m glad you\'ve put it out of its misery.', if: 'wyrm' },
  ],
  gods: [
    'Aurel for the lamp, Korrum for the roof, Nemora for the memories. I keep all three, dear. I\'m too old to be choosy.',
    { t: 'I leave a blue stone on the windowsill every autumn, on one particular night. For Nemora. So somebody remembers with me.', min: 2 },
    { t: 'Halvard said Aurel was there in the fire, holding the door open for him. I\'ve believed him eighteen years. Don\'t you dare tell me different.', min: 3,
      ask: { opts: [
        { tone: 'pious', l: 'I believe it too.', r: '~She nods, satisfied, and squeezes your hand. “Good. Then there\'s two of us.”', tr: 1 },
        { tone: 'curious', l: 'What fire, Berta?', r: 'Oh, I\'m rambling, dear. Old women ramble. Have a biscuit.', tr: 0 },
        { tone: 'kind', l: 'I wouldn\'t dream of it.', r: 'Good lad. You\'ve your mother\'s kindness. ...There I go again.', tr: 1 },
      ] } },
  ],
  gossip: [
    { t: 'Don\'t ask the council about the old days, dear. They don\'t like it.',
      ask: { opts: [
        { tone: 'curious', l: 'Why not? What happened in the old days?', r: 'Nothing that\'s written down any more, dear. That\'s rather the point.', tr: 1 },
        { tone: 'blunt', l: 'I\'m not afraid of the council.', r: 'No. Your grandfather wasn\'t either. Eat your biscuit.', tr: 0 },
        { tone: 'kind', l: 'Then I\'ll ask you instead, when you\'re ready.', r: '~She pats your cheek. “That\'s the way, child. Slowly. With the door shut.”', tr: 1 },
        { tone: 'joke', l: 'What do they like? I could try that.', r: 'Silver and silence, dear. You\'ve neither. Thank Aurel.', tr: 1 },
      ] } },
    { t: 'Tamsin fusses over my chest like a hen. She thinks I don\'t notice her squinting at her own labels. I notice everything, dear. It\'s my only hobby.', min: 2 },
    { t: 'The councilman\'s wife sends me roses. Every year, the same week, no note. I put them in water. I don\'t know what else to do with them.', min: 3,
      learn: 'Elsbeth Voss sends Berta roses every year, the same week, with no note.' },
    { t: 'Rolf at the Fox leaves a bottle out for Hilde on one autumn night. Same night I leave my blue stone. Funny, isn\'t it, dear. Funny how the calendar works.', min: 4 },
    { t: 'That Mirela girl is a sweet thing. Bought me lavender soap from the river traders and pretended she found it. Silly witch.', min: 1 },
  ],
  about: {
    hilde: [
      'Hilde Marsh. Straight back, hard hands. Good armour, I hear.',
      { t: '~She is quiet for a moment. “I know where she soldiered, dear. I\'ve known since the day she came. I\'ve never said, and I never will.”', min: 3,
        learn: 'Berta knows where Hilde soldiered, and has chosen never to speak of it.' },
      { t: 'She came with kindling, and sat, and couldn\'t speak. So I spoke for both of us. About the lavender. About roofs. She cried into her tea. It\'s not forgiving, dear. It\'s a start.', if: 'flag:hilde_amends' },
    ],
    tamsin: [
      'Tamsin is a dear. A sharp, shouting dear. She makes me tisanes that taste of boots.',
      { t: 'She\'s frightened for my lungs and frightened for her eyes and won\'t say either. We sit and don\'t say things together.', min: 3 },
    ],
    voss: [
      'The councilman tips his hat to me in the square. Very polite. Very polite.',
      { t: '~Her hand tightens on her cup. “He came here on a grey horse, eighteen years ago. I remember the horse.” She sets the cup down. “That\'s all, dear. I remember horses.”', min: 4, if: 'flag:berta_captain' },
    ],
    mirela: [
      'Mirela keeps my hearthstone warm with one of her little marks. People call her a witch. People called me worse when I came.',
    ],
    aldous: [
      'Aldous comes for tea and forgets why. I tell him stories. He forgets those too, but he writes them down first.',
    ],
    elsbeth: [
      { t: 'Pale little thing. Always in grey. She looks like a woman waiting for a letter she doesn\'t want.', min: 2 },
    ],
    pippa: [
      'Pippa brings me her buns for Aurel and asks if I\'ll give them to him for her. I eat them. Aurel\'s never complained.',
    ],
  },
  extra: {
    ashvale: { label: 'About the old days', if: 'duty:berta_ashvale', seq: true, lines: [
      'Ashvale. I can say it in this kitchen, now. Not out there. In here.',
      'It was a little place, dear. Two hundred souls, a mill, an orchard, that well-house. Your grandfather argued with everyone and they loved him for it.',
      { t: 'Aldren used to say, “a reeve\'s first duty is to say no to the right people.” He said no to the Wardens. In a famine year. He was going to write to the Crown.',
        learn: 'Aldren of Ashvale refused the Wardens\' tithe in a famine year and meant to write to the Crown.' },
      { t: '~She takes your face in both her small dry hands. “You have his eyes, child. Every time you ask me one more question, I see him.”',
        ask: { opts: [
          { tone: 'kind', l: 'Then I\'ll keep asking. For both of you.', r: 'Good. Just not in the square, dear. In here. With the kettle on.', tr: 1 },
          { tone: 'curious', l: 'What was he like? Not the reeve. The man.', r: 'Hopeless with money. Wonderful with children. Sang dreadfully at harvest and wouldn\'t stop. You\'d have adored him.', tr: 1 },
          { tone: 'blunt', l: 'Someone should pay for what was done.', r: 'Someone will, dear. But you\'re all I\'ve got left of that place. Don\'t you make me bury you too.', tr: 0 },
          { tone: 'pious', l: 'Nemora remembers Ashvale. So will I.', r: '~She can\'t speak. She nods, and nods, and pours you more tea you don\'t want.', tr: 1 },
        ] } },
    ] },
  },
};

// Wendell Tolly, general goods: cheerful, hypothetical, tight with a copper, gossip he swears he never repeats.
DIALOGUE.wendell = {
  intro: [
    'Halvard\'s lad! Come in, come in. Mind the rope, mind the buckets, do not mind the price tags.',
    '~He sweeps a stack of ledgers under the counter with his elbow, very casually.',
  ],
  greet: [
    'Rope, lamp oil, pickaxes! Everything a hero needs, and two or three things nobody needs at all.',
    { t: 'Early, aren\'t you? Marta\'s had me up since the ovens. I\'ve counted the nails twice. Same number both times. Disappointing.', if: 'phase:Dawn,Morning' },
    { t: 'Closing up soon. Last chance for candles. After dark they double in value, you know. Not the price. The value.', if: 'night' },
    { t: '{n}! My favourite customer. Don\'t tell the others, I say it to all of them. But I mean it with you.', min: 2 },
    { t: 'Back from below in one piece. Good. Pieces are bad for business.', if: 'junction' },
    { t: 'Iron\'s short, so the nails cost more. Don\'t look at me like that. Look at the council like that.', if: 'event:ironshort' },
    { t: 'Caravan\'s in! Fresh stock, foreign spices, a hat I will never sell. Have a look.', if: 'event:caravan' },
    { t: 'Fever going round. I\'ve sold every scrap of clean linen I had. Tamsin bought most of it, bless her.', if: 'event:fever' },
    { t: '~He looks up, and for a moment the cheer is missing. Then he finds it again, a little late. “Acolyte. What can I do you for?”', if: 'found' },
    { t: 'There he is. The man who saved my marriage. Well, delayed killing me. Same thing.', if: 'duty:wendell_tax', min: 2 },
  ],
  bye: [
    'Off you go. Come back richer.',
    'Mind the step. It\'s new. Well, it\'s newer.',
    { t: 'Say hello to Marta if you pass the stall. Don\'t mention the ledgers. Mention the weather.', min: 2 },
    { t: 'Stay out of the dark, lad. Or buy more lamp oil. One or the other.', if: 'junction' },
  ],
  how: [
    'Busy! Busy is good. Busy means coppers. Coppers mean supper.',
    { t: 'Honestly? Behind. On... things. Stock. Stock-taking. It\'s fine.', min: 1, max: 2, ask: { opts: [
      { tone: 'kind', l: 'If something\'s wrong, you can tell me.', r: '~He opens his mouth, closes it, and straightens a row of candles that did not need it. “Kind of you. Later, maybe.”', tr: 1 },
      { tone: 'blunt', l: 'You\'re a terrible liar, Wendell.', r: 'I am a wonderful liar! I lie to the council every... I mean. Hypothetically.', tr: 0 },
      { tone: 'pious', l: 'Aurel sees through every ledger.', r: '~He goes slightly pale. “Every ledger? Even the small one?”', tr: 0 },
      { tone: 'joke', l: 'Behind on stock? You have nine hundred buckets.', r: 'Eight hundred and ninety. Ewan\'s dogs got into one. Ha! See, you get it.', tr: 1 },
    ] } },
    { t: 'Better, since I told Marta. She shouted for an hour, then made her plum cake. That\'s how I know it\'s going to be all right.', if: 'duty:wendell_tax', min: 2 },
    { t: 'Can\'t sleep, can\'t eat, can\'t even beat Rolf at dice. Well. I could never do that. But I can\'t even enjoy losing.', if: 'found' },
    { t: 'The goblins have stopped raiding the road, they say. Trade will come back. I can feel it in my purse.', if: 'boss:grotsnag' },
  ],
  self: [
    'Thirty years behind this counter. Before that, my father behind it, and his father. The counter\'s the only thing in the shop we\'ve never sold.',
    'People say I know everybody\'s business. I don\'t know everybody\'s. Just the interesting ones.',
    { t: 'I married the most beautiful woman in the valley. She smelled of fresh bread and she called me a fool on our first meeting. Both still true.', min: 2 },
    { t: 'Pippa was born in the back room, between the lamp oil and the rope. Came out shouting. Hasn\'t stopped since.', min: 3, learn: 'Pippa Tolly was born in the back room of Wendell\'s shop.' },
  ],
  workLabel: 'About the shop',
  work: [
    'A general store is a promise. Whatever you need, I have it, or I know a cousin who has it, or I can make a face like I have it.',
    'Never sell rope to a man who looks sad. Sell him a cheese. Cheese is cheering. Old shopkeeper\'s rule.',
    { t: 'The road tax is killing me, lad. The carters pass it on to me, I can\'t pass it on to anyone. Except you. A little. Sorry.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'Then don\'t knock a copper off for me. Charge me fair.', r: '~He looks at you like you\'ve grown a second head. “Charge fair? On purpose?” He knocks a copper off anyway.', tr: 1 },
      { tone: 'curious', l: 'Where does the road tax money actually go?', r: 'To the council. Then to the councilman\'s militia. Then... I don\'t know. Mortimer keeps the books. Ask him. Actually, don\'t, he\'ll faint.', tr: 0 },
      { tone: 'joke', l: 'Put the tax on the hat nobody buys.', r: 'Ha! The hat pays no tax. The hat is above tax. The hat is a councilman.', tr: 1 },
      { tone: 'blunt', l: 'Everyone pays it, Wendell. Stop moaning.', r: '~He sniffs. “Everyone doesn\'t sell nine hundred buckets.”', tr: -1 },
    ] } },
    { t: 'Halvard bought his lamp oil here every week. Last time he bought double, and a new lantern wick, and paper. A lot of paper. I didn\'t think about it then.', min: 2, learn: 'Before he left, Halvard bought double lamp oil, a new wick and a great deal of paper from Wendell.' },
  ],
  news: [
    'Market\'s on the seventh day, same as always. Fenwick says he\'s got a cow that can count. It can\'t. I\'ve met it.',
    { t: 'Council\'s raising the road tax again come autumn. Councilman Voss says it pays for the militia. Funny. The militia keeps getting smaller.', min: 1 },
    { t: 'Those wizards from Highcourt are in the Hall again, buying every candle stub I own. What do they do with them? Don\'t answer. I don\'t want to know.', if: 'event:wizards' },
    { t: 'Raiders on the North Road last night. I\'ve sold out of shutter bolts. Grim business. Good business. Grim.', if: 'event:raids' },
    { t: 'They found him. They found Halvard. I heard it at the well. I\'ve closed the shop for an hour. First time in thirty years.', if: 'found' },
    { t: 'They say you\'ve got one of those seals from under the mountain. People are coming in asking what a seal\'s worth. I tell them: more than you\'ve got.', if: 'seals:1' },
  ],
  halvard: [
    'Owed me eleven pennies for lamp oil. I keep the slate up. I\'m not going to rub it out till he walks in and pays it.',
    { t: 'He used to come in and buy nothing, just to talk. Worst customer I ever had. I miss him something awful.', if: '!found' },
    { t: 'Eleven pennies. I rubbed it out this morning. Then I wrote it back in. I don\'t know what to do with it, lad.', if: 'found', ask: { opts: [
      { tone: 'kind', l: 'Leave it up. Let it remember him.', r: '~He nods, and puts the chalk back on its nail very carefully.', tr: 1 },
      { tone: 'pious', l: 'Aurel keeps the account now.', r: 'Aurel never paid for oil in his life. ...That\'s a joke. Marta would clip me for it. But thank you.', tr: 1 },
      { tone: 'joke', l: 'I\'ll pay it. Halvard would hate owing you.', r: '~He laughs, and it cracks halfway. “He would. He really would.” He won\'t take the pennies.', tr: 1 },
      { tone: 'blunt', l: 'It\'s eleven pennies, Wendell.', r: 'It\'s not, though. Is it.', tr: -1 },
    ] } },
    { t: 'A goblin knife, they\'re saying. Funny. I\'ve sold knives to every kind of fool. I never sold one that could get near Halvard.', if: 'found', min: 2 },
  ],
  caves: [
    'Mining picks, I\'ve got. Mining sense, I\'ve not. Don\'t go down there, lad. Or if you do, buy rope.',
    { t: 'A carter told me there\'s four kingdoms down there, each one with a king who hates the other three. Sounds like the council.', min: 1 },
    { t: 'A four-way crossing and a door nobody can open? I\'ve got a ledger like that.', if: 'junction' },
    { t: 'You\'ve met a goblin king? Did he want to buy anything? I do bulk discounts.', if: 'boss:grotsnag' },
  ],
  gods: [
    'Aurel for the hearth, Korrum for the coin on the cairn, and a bit of salt over the shoulder for anyone I\'ve missed. I spread it around. Good business.',
    { t: 'Marta\'s the devout one. I just carry the bread to the dawn service and try not to eat it on the way.', min: 1 },
    { t: 'I left a copper on Korrum\'s cairn last week. Asked him to help with the ledgers. Then I took it back. Then I put it back. Gods must think I\'m a fool.', min: 2, ask: { opts: [
      { tone: 'pious', l: 'The Stone Father values the giving, not the coin.', r: 'Does he? Oh, good. Because it was a very small copper.', tr: 1 },
      { tone: 'joke', l: 'Korrum probably charges interest.', r: 'Ha! He\'s a mountain. He can wait. That\'s the trouble.', tr: 1 },
      { tone: 'curious', l: 'What did you ask him for, exactly?', r: '~He glances at the counter. “Time, mostly. Time and nerve.”', tr: 0 },
      { tone: 'blunt', l: 'Just pay the tax, Wendell.', r: 'With what? Buttons? ...Sorry. You\'re right. You\'re right.', tr: 0 },
    ] } },
  ],
  gossip: [
    'I never repeat anything. That said.',
    { t: 'Mortimer Quill and his sister haven\'t spoken in a year. Over a loom! Or a will. Or a loom in a will. Nobody knows. I know a little.', if: '!flag:maren_mortimer' },
    { t: 'The Quills are speaking again! Mortimer bought her a new shuttle from me. Paid full price. I almost cried.', if: 'flag:maren_mortimer' },
    { t: 'Ilse and Maren nearly came to blows over a bolt of madder red. I sold them both a chair to sit on while they argued. Business.', if: '!flag:maren_ilse_peace' },
    { t: 'Bran\'s been in buying lamp oil at midnight. Lamp oil, at midnight. He\'s looking for that boy of his on his own. Don\'t say I said.', min: 2, if: '!flag:dace_told' },
    { t: 'Fenwick says the councilman paid for his first house in Highcourt silver, eighteen years back. New-minted. Who has new-minted silver? I\'m only asking. I\'m not asking. Forget I asked.', min: 3, learn: 'Fenwick told Wendell that Voss paid for his first house in new-minted Highcourt silver, eighteen years ago.' },
  ],
  about: {
    marta: [
      'Best baker in the valley and the sharpest tongue. I\'ve been married to both for twenty years.',
      { t: 'She\'s up before Aurel is, every day. I bring her tea at the ovens. She pretends she doesn\'t need it. I pretend I don\'t notice.', min: 2 },
      { t: 'She knows something\'s wrong with the money. She hasn\'t said. That\'s worse than shouting.', min: 2, if: '!duty:wendell_tax' },
    ],
    pippa: [
      'Apple of my eye. Rotten little apple. Ate a whole tray of honey buns last week and blamed the dog. We don\'t have a dog.',
      { t: 'She wants to be a priestess. Marta\'s frightened. Me? If she\'s happy, I\'m happy. If she\'s a priestess, I\'ll sell candles at cost. Nearly cost.', min: 1 },
      { t: 'She says you\'re going to be the greatest priest since the first dawn. No pressure.', if: 'flag:pippa_serves' },
    ],
    rolf: [
      'Rolf takes my money at dice every seventh day. I\'m very consistent. He says I\'m his best customer.',
      { t: 'His dice are honest. I checked. I wish they weren\'t, then I\'d have an excuse.', min: 2 },
    ],
    ilse: [
      'Ilse! Loud as a cart full of pans. We haggle over a thimble for half an hour and both walk away thrilled.',
      { t: 'She\'s stuck here till that axle\'s mended. I\'ve offered to sell her wheels. She says she\'d sooner walk. She might.', if: '!duty:ilse_axle' },
    ],
    fenwick: [
      'Fenwick and I swap gossip the way other men swap coin. He gives me two stories, I give him one and a half. Fair trade.',
      { t: 'He knows things about money in this town. Old things. He doesn\'t say them at the ring. Only over a pint, very quietly.', min: 3 },
    ],
    voss: [
      'The councilman? Very polite. Always pays. Never haggles. I don\'t trust a man who doesn\'t haggle.',
      { t: 'He came in last month and looked at my ledger. Just looked. Didn\'t say anything. I didn\'t sleep for three nights.', min: 2, ask: { opts: [
      { tone: 'curious', l: 'Which ledger did he look at?', r: '~His voice drops to almost nothing. “The right one. The honest one. I\'d left it out. I don\'t know how he knew.”', tr: 0, learn: 'Voss once came into Wendell\'s shop and silently read his private ledger.' },
      { tone: 'kind', l: 'If he troubles you again, send for me.', r: 'For you? Against the councilman? Bless you, lad. Don\'t. But bless you.', tr: 1 },
      { tone: 'blunt', l: 'Then don\'t give him anything to find.', r: 'Yes. Well. Working on that. Hypothetically.', tr: 0 },
    ] } },
      { t: 'Came here eighteen years ago with a purse like a melon. Nobody asks where from. Nobody asks Voss anything.', min: 3 },
    ],
    berta: [
      { t: 'Old Berta buys one candle a week and pays in pennies she\'s kept warm in her fist. I always give her two. Don\'t tell Marta. Actually, do. She\'d like that.', min: 1 },
    ],
  },
  extra: {
    ledger: { label: 'About the two ledgers', if: 'duty:wendell_tax', seq: true, lines: [
      { t: 'I burned the small ledger. In Marta\'s oven. She held the door open for me. Romantic, in its way.', min: 2 },
      { t: 'You know what I found when I added it all up honest? We\'re not ruined. We\'re just poor. Poor I can do. I\'ve been poor before. It\'s the lying that weighs.', min: 3 },
      { t: 'Marta made me promise: no more secrets. So here\'s my last one. I still owe Rolf four silver from dice. ...Don\'t look at me like that. Four is very little.', min: 3, ask: { opts: [
        { tone: 'joke', l: 'Would that be a secret? Hypothetically?', r: '~He points at you, delighted. “Oh, you\'re wicked. Halvard would\'ve loved you.”', tr: 1 },
        { tone: 'kind', l: 'Tell her tonight. She\'ll laugh.', r: 'She will. Then she\'ll take the dice. Fine. Fine! For love.', tr: 1 },
        { tone: 'pious', l: 'Aurel loves an honest heart.', r: 'Then he\'ll be pleased with me tomorrow. Tonight I\'m still working on it.', tr: 0 },
      ] } },
    ] },
  },
};

// Marta Tolly, baker: devout, brisk, floury, frightened for her daughter, loves a pious answer.
DIALOGUE.marta = {
  intro: [
    'You\'re Halvard\'s boy. Aurel keep you. Have you eaten? You haven\'t. I can tell by the cheekbones.',
  ],
  greet: [
    'Fresh bread! Well. Fresh-ish. The rye\'s from this morning. The buns are from a morning.',
    { t: 'Dawn\'s light on you, Acolyte. I\'ve had the ovens going since the dark. Is anyone holding the dawn service?', if: 'phase:Dawn' },
    { t: 'Nearly sold out. You\'ll have the heel of the loaf, and you\'ll like it.', if: 'phase:Afternoon,Evening' },
    { t: 'You\'re out late. Aurel\'s lamps want tending, and so do you. Go home and sleep.', if: 'night' },
    { t: '{n}, love. Sit a moment. You look like you\'ve been carrying the whole valley.', min: 2 },
    { t: '~Her eyes are red and her hands are white with flour to the wrist. She doesn\'t stop kneading. “I heard. I\'ve been baking since I heard. I don\'t know what else to do.”', if: 'found' },
    { t: 'Feast day! I\'ve made sun-loaves for Aurel\'s table. Plaited, with a honey glaze. Halvard used to sneak a corner off every one.', if: 'event:feast' },
    { t: 'The lamps were lit this morning. Pippa again, I expect. Aurel knows I can\'t stop her.', if: 'flag:pippa_serves' },
    { t: 'Fever in town. I\'m baking for the Coopers. Barley bread and broth. Bless Tamsin for going in where others won\'t.', if: 'event:fever' },
  ],
  bye: [
    'Aurel light your road.',
    'Take this. No, take it. You\'ll eat it on the way and think of me.',
    { t: 'Home before dark, love. I say it to Pippa, I\'ll say it to you.', min: 2 },
    { t: 'Go carefully below. And come back up. That\'s an order from a baker.', if: 'junction' },
  ],
  how: [
    'Tired, love. A baker\'s always tired. It\'s the flour. It gets in your bones.',
    { t: 'Worried. Pippa\'s been out at dawn again. On that stool, at the temple. What if she falls? What if she doesn\'t, and grows up, and goes off like Halvard did?', min: 1, ask: { opts: [
      { tone: 'pious', l: 'Aurel watches over those who keep his lamps.', r: '~She closes her eyes. “I know he does. I know. I just need someone to say it out loud.”', tr: 1 },
      { tone: 'kind', l: 'I\'ll keep an eye on her. I promise.', r: 'You\'re a good lad. Halvard raised you right. Stubborn, but right.', tr: 1 },
      { tone: 'blunt', l: 'She\'s ten. She\'ll grow out of it.', r: 'You didn\'t. Did you.', tr: -1 },
      { tone: 'joke', l: 'She\'d terrify the goblins. They\'d hand back the seals.', r: '~A laugh escapes her before she can stop it. “Don\'t you dare tell her that.”', tr: 0 },
    ] } },
    { t: 'Better. Wendell told me everything. Two ledgers! The fool. I could have killed him. Then I made a plum cake instead. We\'ll manage. We always have.', if: 'duty:wendell_tax', min: 2 },
    { t: 'I keep setting a loaf aside for him. Halvard\'s loaf. Every seventh day, the brown one with seeds. I\'ve set one aside this morning too. I can\'t seem to stop.', if: 'found' },
  ],
  self: [
    'My mother baked, and her mother. We\'ve had a sun-disc over this oven longer than there\'s been a council.',
    { t: 'I\'ve not missed a dawn service in twenty-two years. Not for snow, not for childbirth. I was there the morning after Pippa came. Halvard nearly fainted.', min: 1 },
    { t: 'Wendell asked me to marry him with a bun. A stale one. He\'d bought it off my own stall. I said yes because I felt sorry for the bun.', min: 2 },
    { t: 'When I was a girl I wanted to serve the temple myself. Like Pippa. My mother said no, and I baked instead. I\'ve never told anyone that. Not even Wendell.', min: 4, learn: 'Marta once wanted to serve the temple of Aurel herself, as a girl. Her mother said no.' },
  ],
  workLabel: 'About the bakery',
  work: [
    'Bread is the first offering. Before the lamb, before the lamp, there\'s a loaf on Aurel\'s table. That\'s what my grandmother said.',
    'Rye on the first day, wheat on the third, seed loaves for the seventh. Sun-loaves for feasts. Everything else is just keeping folk alive.',
    { t: 'Halvard blessed my ovens every spring. Hasn\'t been a spring since he left. I\'ve burned three batches this month. That\'s not a coincidence, love.', min: 1, if: '!duty:pippa_lamps' },
    { t: 'Would you bless the ovens? You needn\'t do it fancy. Halvard just put his hand on the door and said the dawn words.', min: 2, ask: { opts: [
      { tone: 'pious', l: '~Lay a hand on the oven door and speak the dawn words.', r: '~She mouths the words with you, and when you finish she wipes her eyes on her sleeve, leaving a streak of flour. “There. Now they\'ll rise.”', tr: 1, learn: 'You blessed Marta\'s ovens with the dawn words, as Halvard did every spring.' },
      { tone: 'joke', l: 'Bless you, oven. Please stop burning things.', r: 'That\'s not... Aurel give me patience. Do it properly, Acolyte.', tr: -1 },
      { tone: 'kind', l: 'I\'m not Halvard. But I\'ll try.', r: 'Nobody\'s asking you to be. Just put your hand there. Like that.', tr: 1 },
      { tone: 'curious', l: 'Did he ever say why it worked?', r: 'He said ovens are hearths, and hearths are Aurel\'s. And that I should stop opening the door every two minutes.', tr: 0 },
    ] } },
  ],
  news: [
    'Fresh flour came up from the mill today. The miller says there\'s wolves on the river path again. There always are, according to him.',
    { t: 'Councilman Voss bought six loaves this morning and paid for twelve. He does that. I wish he wouldn\'t. It feels like being paid for something.', min: 1 },
    { t: 'The friar from Highcourt bought a seed loaf and asked how many came to the dawn service. I told him: all of us, Brother. All of us who are still here.', min: 1, if: 'met:anselm' },
    { t: 'The whole town\'s talking about that wolf. Greymaw. Gone, they say. I sent a sun-loaf to the temple in thanks.', if: 'boss:greymaw' },
    { t: 'They\'re saying he was killed by goblins. Halvard. With a knife. I don\'t understand it. He was a gentle man. Who would want a gentle man dead?', if: 'found' },
    { t: 'The tannery\'s upwind of me again. My bread smells like old boots. Rolf says no one will notice. Rolf\'s stew smells like old boots on purpose.', if: 'event:tannery' },
  ],
  halvard: [
    'He blessed my ovens every spring. Not one loaf has burned since. Well. Not many.',
    { t: 'He\'ll come back. Aurel brings back what\'s his. I bake his seed loaf every seventh day so it\'s ready.', if: '!found' },
    { t: 'He used to sing the dawn hymn half a note flat. Every week. I never told him. I wish I had, now. He\'d have laughed.', min: 2, if: '!found' },
    { t: 'Gone. Under the mountain, in the dark, away from his lamps. That\'s the cruellest part. He hated the dark.', if: 'found', ask: { opts: [
      { tone: 'pious', l: 'Aurel\'s light reaches even there.', r: '~She grips your hand, flour and all. “Yes. Yes, it does. Say it again for me.”', tr: 1 },
      { tone: 'kind', l: 'He carried his own lamp down. He wasn\'t afraid.', r: 'No. He wouldn\'t have been. That\'s him all over.', tr: 1 },
      { tone: 'curious', l: 'Did he ever tell you why he went?', r: 'Only that he had to put something right. Something from before Brambleford. He looked so old when he said it.', tr: 0, learn: 'Halvard told Marta he had to put something right from before he came to Brambleford.' },
      { tone: 'blunt', l: 'Somebody wanted him dead. It wasn\'t goblins.', r: '~She goes still. “Don\'t say that in the square, love. Not where people can hear.”', tr: 0 },
    ] } },
    { t: 'I\'ll hold his rite. The dawn one. I know every word. Someone has to, until you\'re ready.', if: 'found', min: 3 },
  ],
  caves: [
    'I don\'t want to hear about caves. Pippa hears about caves, and then she wants to go and see.',
    { t: 'The old folk say there were kingdoms under the mountain once, and a reeve somewhere who kept them from each other\'s throats. Like a mother with four boys.', min: 2 },
    { t: 'You\'ve been as far as that great door? Aurel keep you. Don\'t you dare open it until you\'re sure.', if: 'junction' },
    { t: 'You\'ve brought seals up out of the dark. Wendell tells everyone like it\'s his own doing. I just pray.', if: 'seals:2' },
  ],
  gods: [
    'Aurel first, always. Then whoever else needs bread. Veyra gets a crust by the door in hunting season. Fair\'s fair.',
    { t: 'The Rite of First Light is the most beautiful thing in the world. All of us at the temple steps in the cold, and then the sun comes over the ridge and the lamps go pale. I cry every year.', min: 1, ask: { opts: [
      { tone: 'pious', l: 'I\'ll hold the Rite this year. I promise you that.', r: '~She presses both hands over her heart. “Oh, love. I\'ll bake the sun-loaves. All of them.”', tr: 1 },
      { tone: 'curious', l: 'Who taught you the old words?', r: 'My grandmother. She said the words are older than the temple. I believe her.', tr: 0 },
      { tone: 'joke', l: 'Halvard cried too. He blamed the smoke.', r: 'He did! Every year! There\'s no smoke at dawn, Halvard!', tr: 1 },
      { tone: 'blunt', l: 'It\'s just a sunrise.', r: '~She looks at you as if you\'d spat in the dough. “Halvard\'s boy. Saying that.”', tr: -1 },
    ] } },
    { t: 'I don\'t hold with the serpent things they whisper about. Venom and patience. What sort of god asks you to be patient so you can bite?', min: 2 },
  ],
  gossip: [
    'I don\'t gossip. Wendell gossips. I just listen while he does it.',
    { t: 'Hilde comes for bread at the same hour every day and never says good morning. Then she leaves a coin too many. I think she\'s lonely. I think she\'s something else, too.', min: 2 },
    { t: 'Old Berta coughs worse every week. I take her a soft loaf. She says it\'s too much. She eats it all.', min: 1 },
    { t: 'Elsbeth Voss came to the stall alone yesterday and asked me if I prayed for anyone in particular. Odd question. She looked like she hadn\'t slept.', min: 3 },
    { t: 'Mirela came to buy bread and Hobb Thatcher walked out of the line. Out of my line! I gave her the good rye and told him he could buy his bread in Highcourt.', min: 2, if: '!flag:mirela_cleared' },
  ],
  about: {
    wendell: [
      'My husband. Good heart, soft head. Mostly soft head.',
      { t: 'He\'s hiding something. Money, I expect. He goes quiet at supper. Wendell is never quiet at supper.', min: 1, if: '!duty:wendell_tax' },
      { t: 'He told me. Everything. I could have wrung his neck. Instead I made him burn the second ledger in my oven. Best fire I ever lit.', if: 'duty:wendell_tax' },
    ],
    pippa: [
      'My girl. Too bright, too brave, too much like her father on a good day and like me on a bad one.',
      { t: 'I\'ve seen what the temple cost Halvard. No wife, no rest, and the whole town\'s troubles on his back. I want better for her. Is that wicked?', min: 1, if: '!duty:marta_pippa', ask: { opts: [
      { tone: 'pious', l: 'Wanting good for your child is its own offering.', r: '~She sets the dough down and just breathes for a moment. “Thank you, Acolyte. I needed that.”', tr: 1 },
      { tone: 'kind', l: 'It isn\'t wicked. It\'s love.', r: 'Love makes you do wicked things sometimes. Ask Wendell. Ask any mother.', tr: 1 },
      { tone: 'blunt', l: 'Halvard chose his life. Pippa can choose hers.', r: 'She\'s ten! At ten I chose to eat a candle. ...Maybe you\'re right. Not today, though.', tr: 0 },
    ] } },
      { t: 'She\'s lighting the lamps with your blessing now. I worry every morning. And every morning she comes home glowing. I don\'t know what to do with that.', if: 'flag:pippa_serves' },
      { t: 'She\'s learning to plait sun-loaves. She\'s good. She hums the dawn hymn while she does it. In tune, too. Better than Halvard.', if: 'duty:marta_pippa !flag:pippa_serves' },
    ],
    tamsin: [
      'Tamsin\'s sharper than a bread knife and twice as useful. She set Pippa\'s arm when she fell off the well wall.',
      { t: 'She pretends she doesn\'t believe in anything. Then she\'s at the dawn service, back row, every feast day.', min: 2 },
    ],
    anselm: [
      'The friar\'s a polite man. Eats like a bird. I\'m working on that.',
      { t: 'If he closes our temple I\'ll walk to Highcourt myself and bake on the cathedral steps until they give it back.', min: 1, if: 'met:anselm' },
    ],
    voss: [
      'The councilman pays too much and smiles too little. Aurel forgive me, I don\'t like him.',
      { t: 'Old Berta won\'t buy bread when he\'s in the square. She waits till he goes. Every time.', min: 3 },
    ],
    rolf: [
      'Rolf keeps my husband\'s money and my husband\'s company every seventh day. I forgive him the company.',
    ],
  },
  extra: {
    vow: { label: 'About your girlhood', if: 'met:pippa', seq: true, lines: [
      { t: 'When I was Pippa\'s age I lit the lamps too. In the old priestess\'s time, before Halvard. I had a stool just like hers.', min: 3 },
      { t: 'My mother came and fetched me home by the ear. She said bread keeps people alive and prayers just keep them company. I believed her for thirty years.', min: 3 },
      { t: 'Then Halvard came, with a baby in his arms and nothing else, and I watched what he did for this town. He kept us alive too. Not with bread.', min: 4 },
      { t: 'So now I don\'t know if I\'m keeping Pippa from it because it\'s hard, or because I wanted it and didn\'t get it. That\'s a terrible thing to say out loud.', min: 4, ask: { opts: [
        { tone: 'kind', l: 'It\'s an honest thing. That\'s not terrible.', r: '~She lets out a long breath. “Halvard would\'ve said that. Exactly that.”', tr: 1 },
        { tone: 'pious', l: 'Your bread has always been an offering. You served all along.', r: '~She stares at her own floury hands as if she\'d never seen them before.', tr: 1, learn: 'Marta keeps Pippa from the temple partly because she wanted that life herself and was forbidden it.' },
        { tone: 'blunt', l: 'Then let Pippa choose for herself.', r: 'I know. I know. Give me a little longer, love.', tr: 0 },
      ] } },
    ] },
  },
};

// Pippa Tolly, ten: breathless, fearless, run-on sentences, endless questions, makes things up.
DIALOGUE.pippa = {
  intro: [
    'You\'re the acolyte! I\'m Pippa! I\'m going to be a priestess! I told the dog. It\'s not my dog. Do you want to see me trim a wick?',
  ],
  greet: [
    'Acolyte! Acolyte! I have a question. No, two. No, I forgot. Wait. Do gods sneeze?',
    { t: 'I lit the lamps! All of them! Well, the ones I could reach. The big one\'s up high but I stood on the stool on the bench. Don\'t tell Mum.', if: 'phase:Dawn,Morning flag:pippa_serves' },
    { t: 'It\'s nearly dark, I\'m supposed to be home, I\'m going, I\'m going, I\'m just saying hello first.', if: 'night' },
    { t: '{n}! I practised your name. I can write it backwards too. It looks like a spell.', min: 2 },
    { t: 'You went down where the four stairs are! Everybody says! Was it scary? Was it this scary?', if: 'junction' },
    { t: 'Feast day, feast day! Mum made the sun-loaves and I did the plaits on three of them. You can tell which. They\'re the wonky ones.', if: 'event:feast' },
    { t: '~She is sitting on the temple step with her knees pulled up, and she doesn\'t run to you for once. “Is it true? About Father Halvard?”', if: 'found' },
    { t: 'A wizard let me hold his staff! For one breath! Then he took it back. It was warm. Is that normal?', if: 'event:wizards' },
    { t: 'You killed the big wolf! Greymaw! Gil says it was as big as a cart. Was it as big as a cart? Was it as big as TWO carts?', if: 'boss:greymaw' },
  ],
  bye: [
    'Bye! Come back! Don\'t die!',
    'I\'ll keep the lamps lit! That\'s my job now. I gave it to myself.',
    { t: 'Wait! Here. It\'s a bun. I left one for Aurel too but he didn\'t eat his so you can have that one tomorrow.', min: 2 },
    { t: 'Be careful down there. I mean it. I\'m saying it in my serious voice.', if: 'junction', min: 2 },
  ],
  how: [
    'Good! Great! I fell in the duck pond but I meant to. Mostly.',
    { t: 'Mum says I\'m not to bother you. Am I bothering you? I\'ll stop. In a minute.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'You never bother me, Pippa.', r: '~She beams so hard her freckles move. “I\'m telling Mum you said that.”', tr: 1 },
      { tone: 'joke', l: 'You\'re a terrible bother. The worst in the valley.', r: 'The WORST? Better than Ned? Ned\'s quite bad. Yes! I win!', tr: 1 },
      { tone: 'blunt', l: 'A little. I\'ve got work to do.', r: '~Her face falls, then rallies. “Can I help with the work? I\'m good at work. I\'m good at most things.”', tr: 0 },
      { tone: 'pious', l: 'Aurel loves a curious mind.', r: 'Does he? Then he must love me SO much. I\'m the most curious. Mum says.', tr: 1 },
    ] } },
    { t: 'Sad. I keep doing the wick the way he showed me and then I remember. I still do it, though. I won\'t stop.', if: 'found' },
    { t: 'Brilliant, because the lamps have oil now, because of you, so I don\'t have to melt torches, which smelled. And I burned my thumb. Only a bit. Look. You can\'t even see.', if: 'duty:pippa_lamps' },
  ],
  self: [
    'I\'m ten and a half. The half is important.',
    'I\'m going to be a priestess of Aurel and also a dragon tamer on my days off. Priests get days off, don\'t they? Do they?',
    { t: 'I can hold my breath for forty-one counts. I can whistle with grass. I can say the whole dawn hymn without stopping, even the long bit. Want to hear? It\'s quite long.', min: 1 },
    { t: 'Sometimes at the temple, when it\'s just me and the lamps, I talk to Aurel. Out loud. I tell him about my day. He doesn\'t talk back, but the flames go all still, like he\'s listening.', min: 3, learn: 'Pippa talks to Aurel out loud when she is alone with the temple lamps.' },
  ],
  workLabel: 'About the lamps',
  work: [
    'Trim the wick straight, never pointy, or it smokes and the smoke goes black on the ceiling and then you have to scrub it. Father Halvard showed me. I\'ve never once got it pointy. Nearly never.',
    { t: 'I have to stand on the stool for the side lamps and on the stool on the bench for the big one. The bench wobbles. I wobble with it. We\'re a team.', min: 1, if: '!flag:pippa_serves' },
    { t: 'Mum says I can do it properly now! Because you said! I go every morning before the bread. I\'m official. Am I official? I feel official.', if: 'flag:pippa_serves', ask: { opts: [
      { tone: 'pious', l: 'You\'re the keeper of Aurel\'s lamps. That\'s official.', r: '~She salutes, which isn\'t a temple thing at all, and runs a full circle round the well shouting it.', tr: 1, learn: 'You named Pippa keeper of Aurel\'s lamps.' },
      { tone: 'joke', l: 'Only if you pass the wick exam.', r: 'There\'s an EXAM? ...There\'s not an exam. You\'re teasing. Are you teasing? Ask me anything!', tr: 1 },
      { tone: 'kind', l: 'Halvard would be proud of you.', r: '~She goes very quiet and very pink. “Really? Really really?”', tr: 1 },
      { tone: 'blunt', l: 'Be home for supper or your mother will have my head.', r: 'She WOULD. She\'s got a big spoon. All right. Supper. Promise.', tr: 0 },
    ] } },
    { t: 'Keep the lamps lit. That\'s what Father Halvard wrote. I saw it on the paper on the altar. I wasn\'t snooping. It was just there. Being read. By me.', min: 2 },
  ],
  news: [
    'Garrick\'s pig got out and ran right through the market and Fenwick tried to auction it while it was running!',
    { t: 'There\'s a cow at the ring that can count to three! Fenwick says. It can\'t. I asked it what two and one was and it ate my sleeve.', min: 1 },
    { t: 'Everybody\'s coughing. Mum won\'t let me go near the Coopers. I made them a picture instead. It\'s of a bird. Or a horse. It\'s a get-well bird-horse.', if: 'event:fever' },
    { t: 'Something went BOOM in the Hall! Dad says it was the wizards. Aldous says it wasn\'t him. Aldous\'s eyebrows say it was.', if: 'event:boom' },
    { t: 'You have a seal from the deep kingdoms! Can I touch it? I won\'t lick it. I only lick things by accident.', if: 'seals:1' },
    { t: 'Everyone\'s whispering in the square and stopping when I come. That means it\'s about Father Halvard. I\'m not stupid. I\'m ten and a half.', if: 'found' },
  ],
  halvard: [
    'He showed me how to trim a wick so it doesn\'t smoke. I practise every day.',
    { t: 'Is Father Halvard coming back? Mum says Aurel will bring him. I keep his favourite lamp lit, the brass one, so he can see the way.', if: '!found', ask: { opts: [
      { tone: 'kind', l: 'Keep it lit. I\'m going to find him.', r: '~She nods hard, three times. “I will. Every day. Even if it rains. It\'s inside. But still.”', tr: 1 },
      { tone: 'pious', l: 'Aurel guards every light we keep for someone.', r: 'Then the brass one is the most guarded light in the whole world.', tr: 1 },
      { tone: 'blunt', l: 'I don\'t know if he\'s coming back, Pippa.', r: '~Her lip wobbles, then sets. “Then you have to find out. That\'s your job. I\'ve got the lamps.”', tr: 0 },
      { tone: 'curious', l: 'Did he say anything to you before he went?', r: 'He said I trim better than him. And he said, look after the acolyte, he forgets to eat. So. Have you eaten?', tr: 1, learn: 'Before he left, Halvard asked Pippa to look after you.' },
    ] } },
    { t: 'He used to let me ring the dawn bell. Just once, at the end. He said it was the most important ring. I think he just said that.', min: 2 },
    { t: 'I\'m still keeping the brass lamp lit. Mum said I could stop. I don\'t want to stop. Is that all right? Is that allowed?', if: 'found', ask: { opts: [
      { tone: 'kind', l: 'Keep it lit. For him.', r: '~She wipes her nose on her sleeve. “For him. And for you. Both.”', tr: 1 },
      { tone: 'pious', l: 'That\'s what the lamps are for. Remembering.', r: 'Then I\'ll remember him SO hard. Every morning.', tr: 1 },
      { tone: 'joke', l: 'Only if you trim it straight.', r: '~A wet little laugh. “I always trim it straight. Nearly always.”', tr: 1 },
    ] } },
  ],
  caves: [
    'My brother says the cave splits into four kingdoms down below! I don\'t have a brother. I made him up. But the kingdoms are real. Probably.',
    { t: 'There\'s goblins and rat-people and pale people and SNAKE people. Hobb told me. Then Mum told Hobb off for telling me.', min: 1 },
    { t: 'Is there really a big door with four locks? And a dragon under it? Is it a nice dragon? Can you check?', if: 'junction' },
    { t: 'You fought a goblin KING? Did he have a crown? Was it a real crown or a pretend one? Mine\'s pretend. It\'s a pie tin.', if: 'boss:grotsnag' },
  ],
  gods: [
    'Do the gods get hungry? I left Aurel a bun. It was gone in the morning! ...Mum says it was the mice. Mum doesn\'t know everything.',
    { t: 'Which god is your favourite? Mine\'s Aurel, then Veyra because of the deer, then Nemora because of the blue stones, then Korrum, then nobody, then the snake one last.', min: 1, ask: { opts: [
      { tone: 'pious', l: 'Aurel, always. He keeps the lamps and the hearth.', r: 'SAME! We\'re the same! I knew it. I\'m telling the dog.', tr: 1 },
      { tone: 'curious', l: 'Why is the snake god last?', r: 'Because snakes are patient and I\'m not. It wouldn\'t work out between us.', tr: 0 },
      { tone: 'joke', l: 'My favourite is the god of honey buns.', r: 'There\'s no god of honey buns! ...Is there? Is it Aurel? It should be Aurel.', tr: 1 },
      { tone: 'blunt', l: 'You don\'t get to have favourites. They\'re gods.', r: '~She considers this very seriously. “I think they have favourites. So I can too.”', tr: 0 },
    ] } },
    { t: 'When I\'m a priestess I\'m going to do the Rite of First Light and I\'m going to sing so loud the sun comes up early.', min: 2 },
  ],
  gossip: [
    'Ned fell asleep at the gate and I put a daisy in his helmet and he wore it all day!',
    { t: 'Mum and Dad were whispering in the kitchen about a ledger. Is a ledger bad? It sounded bad. Then they hugged so it\'s probably all right.', min: 1, if: '!duty:wendell_tax' },
    { t: 'Mirela gave me a stone with a rune on it that glows if you hold it under your chin. Hobb says she\'s a witch. She\'s not. Witches don\'t give you stones. Probably.', min: 1 },
    { t: 'Hilde keeps a little knife under her pillow. I know because I was hiding under her bed for hide-and-seek. I was winning. Then she found me.', min: 2 },
    { t: 'The councilman looked at you a long time when you crossed the square today. Like Mum looks at bread that might be burnt. I didn\'t like it.', min: 3 },
  ],
  about: {
    marta: [
      'Mum wants me to be a baker. I am good at baking. But I\'m better at lamps.',
      { t: 'Mum cries at the Rite of First Light every year. She pretends it\'s the cold. It isn\'t the cold. I can tell.', min: 2 },
    ],
    wendell: [
      'Dad says I can be anything I want. Then he says, as long as it\'s profitable. Then he winks. So that means anything.',
      { t: 'Dad sneaks me honey buns from Mum\'s stall and Mum knows and pretends she doesn\'t. I think that\'s what being married is.', min: 2 },
    ],
    tamsin: [
      'Tamsin fixed my arm when I fell off the well wall. She called me a menace. Then she gave me a sweet. So it\'s a nice menace.',
      { t: 'Tamsin says she might teach me the plants! The ones that make you better AND the ones that make you sick, so I know which is which.', if: 'flag:tamsin_teaches' },
    ],
    ned: [
      'Ned\'s helmet is too big. When he nods it goes clonk on his nose.',
      { t: 'Ned looks sad all the time now. I asked him why and he said guard business. I don\'t think it\'s guard business.', min: 2, if: '!flag:dace_told' },
    ],
    aldous: [
      'Aldous is SO old. He showed me a trick with a coin that came out of my ear. Then he couldn\'t find his glasses. They were on his head.',
    ],
    berta: [
      'Old Berta tells the best stories. About a village with a bell tower and a well-house. She always stops before the end. I don\'t know why.',
      { t: 'She calls me child and gives me lavender to put in my pocket. She says I remind her of somebody called Wenna. Who\'s Wenna?', min: 3 },
    ],
  },
  extra: {
    secret: { label: 'About Pippa\'s secret', if: 'met:marta', seq: true, lines: [
      { t: 'Can you keep a secret? A real one? Not a Dad one where he tells everyone at the market.', min: 3 },
      { t: 'I found a paper under the altar cloth. It was Father Halvard\'s writing. It said a name. Ashvale. Is that a person? Is it a place? I put it back exactly.', min: 3, learn: 'Pippa found a paper in Halvard\'s writing under the temple altar cloth with the word “Ashvale” on it.' },
      { t: 'I asked Old Berta what Ashvale was and she went white as flour and told me never to say it near the councilman. Why would the councilman care? He doesn\'t care about anything except taxes.', min: 4, ask: { opts: [
        { tone: 'kind', l: 'You did right to tell me. Keep it between us.', r: '~She crosses her heart, both sides, to be sure. “Between us. Forever. Or till you say.”', tr: 1 },
        { tone: 'curious', l: 'What else was on the paper?', r: 'A drawing of four little circles round a big one. And the word seals. That\'s all. I only looked a teeny bit.', tr: 0, learn: 'Halvard\'s paper under the altar cloth showed four small circles round a large one, and the word “seals”.' },
        { tone: 'blunt', l: 'Never say that word near Voss. Promise me.', r: '~Her eyes go round. “I promise. I promise. Is it dangerous? It\'s dangerous. I can tell by your face.”', tr: 0 },
        { tone: 'joke', l: 'Maybe it\'s the name of a very old cheese.', r: 'It is NOT a cheese. ...Is it a cheese? No. You\'re doing the face Dad does.', tr: 0 },
      ] } },
    ] },
  },
};

// Odessa Vell, jeweler from the river cities: big laugh, palm reading, rings, stubborn hope for her brother Teo.
DIALOGUE.odessa = {
  intro: [
    'Ah, the little priest! Come, come into the light, let me see you. Hm. Good bones. Bad sleep. Give me your hand.',
  ],
  greet: [
    'Gold for the rich, silver for the wise, and for you, my dear, a discount I will regret.',
    { t: 'Morning, little priest. The light is good in the Hall now. Everything shines before noon, even Wendell.', if: 'phase:Dawn,Morning' },
    { t: 'I\'m packing the trays. Come back tomorrow, or buy something quickly and make me happy.', if: 'night' },
    { t: '{n}! Sit. No, there, on the good stool. I keep it for people I like and the occasional duke.', min: 2 },
    { t: 'A caravan! From the south! I can smell the river on their wagons. Wait. Wait, let me ask if anyone has news.', if: 'event:caravan' },
    { t: '~She is turning a silver ring over and over on the velvet and doesn\'t look up straight away. “Ah. Halvard\'s boy. I\'m sorry. I am so sorry.”', if: 'found' },
    { t: 'You went down past the third level. I can see it in your hands. Calluses from a rope. Don\'t argue with a palm reader.', if: 'junction' },
    { t: 'You came back from Gnarlhold. Tell me. Tell me before I lose my nerve.', if: 'boss:grotsnag' },
    { t: 'Every fool in the valley wants a love charm this week. Feasts make people stupid. I approve.', if: 'event:feast' },
  ],
  bye: [
    'Go well. Keep your hands warm. Cold hands tell lies.',
    'Off with you. And don\'t let Wendell sell you rope twice.',
    { t: 'Wear the ring. It wants to be worn. Rings sulk in pockets.', if: 'duty:odessa_teo' },
    { t: 'If you go below again, listen for his name. Just listen.', if: 'junction', min: 2 },
  ],
  how: [
    'Loud, as always. My mother said I was born laughing and the midwife complained.',
    { t: 'Some days I am fine. Some days I set a second cup out for Teo and have to drink them both. Today is a two-cup day.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'Then let me drink the second cup.', r: '~She pushes it across, and her laugh is quieter than usual. “It\'s cold. He always let it go cold too.”', tr: 1 },
      { tone: 'pious', l: 'Nemora keeps the memory of those we miss.', r: 'The Still Water. Yes. We have a river goddess at home, much the same, only she gossips. Thank you.', tr: 1 },
      { tone: 'joke', l: 'Two cups of tea? That\'s just good sense.', r: 'Ha! A man after my own heart. My brother said that too. You two would fight over the last cake.', tr: 1 },
      { tone: 'blunt', l: 'Two months is a long time, Odessa.', r: '~The rings go very still on her fingers. “I can count, little priest. I count every day.”', tr: -1 },
    ] } },
    { t: 'Better. Ilse told me why they took him. Because he could read. My clever, useless brother. All those books I teased him for. They kept him alive.', if: 'duty:ilse_teo', min: 2 },
    { t: 'Heavy. Halvard and I had a little arrangement. He prayed for Teo, I made his old sun-disc shine. Now who will I polish for?', if: 'found' },
  ],
  self: [
    'I came up from the river cities with three trays of silver and a donkey named Duchess. Duchess ran away. The silver stayed.',
    'Every ring has a story. Most of them are lies. I tell the lies beautifully. That\'s the craft.',
    { t: 'My grandmother read palms on the bridges at home. She said hands remember what heads forget. I believed her when I was six and I believe her now.', min: 1 },
    { t: 'I came north for Teo. He wanted to guard caravans, see the mountains. I followed to keep an eye on him. A fine job I did.', min: 3, learn: 'Odessa came north from the river cities to keep an eye on her brother Teo.' },
  ],
  workLabel: 'About the jewellery',
  work: [
    'Silver from the south, garnets from the mountains, and the runes Mirela cuts for me. A protection rune behind a garnet. People think it\'s just pretty. It isn\'t.',
    { t: 'Mirela\'s runes are the best I\'ve seen north of the river. I pay her what they\'re worth, and that\'s more than most here pay her for anything.', min: 1, ask: { opts: [
      { tone: 'curious', l: 'What does a protection rune actually do?', r: 'Turns a blow, a little. Warms the skin when danger\'s near. Teo had one. I made it myself. I hope it\'s warm.', tr: 1 },
      { tone: 'pious', l: 'Some say runes are pagan trickery.', r: 'Some say the dawn is just a sunrise. Some say a great many foolish things, little priest.', tr: -1 },
      { tone: 'kind', l: 'It\'s good of you, paying her fairly.', r: 'It\'s not good. It\'s correct. Good is what I do for you, with the discount.', tr: 1 },
    ] } },
    { t: 'You want to know a jeweller\'s secret? Most people buy rings to remember someone. Not to be beautiful. To remember.', min: 2 },
    { t: 'I am saving for a ransom. Every coin. I have a little box under the counter. No one has ever asked for it. I keep saving anyway.', min: 3, if: '!duty:ilse_teo', ask: { opts: [
      { tone: 'kind', l: 'Keep saving. If there\'s a way to buy him back, I\'ll find it.', r: '~She squeezes your hand hard enough to hurt. “You sound like him when you say things you can\'t promise.”', tr: 1 },
      { tone: 'curious', l: 'Why do you think no demand came?', r: 'Because they didn\'t take him for money. I know it in my bones. But for what, then?', tr: 0 },
      { tone: 'blunt', l: 'Goblins don\'t send letters, Odessa.', r: 'Then I will take the box down myself and throw it at them. Coin hurts, thrown hard enough.', tr: 0 },
      { tone: 'pious', l: 'Aurel lights a way for the lost.', r: 'Then may he light it bright and soon. Teo was always scared of the dark. Don\'t tell him I said.', tr: 1 },
    ] } },
  ],
  news: [
    'The trade road\'s been quiet since the raids. Quiet roads mean expensive silver. Everything comes up the long way now.',
    { t: 'Goblins hit the North Road again. A carter came in with an arrow in his hat. Only the hat. He\'s furious about the hat.', if: 'event:raids' },
    { t: 'The caravan master says the goblins are paying for things lately. In silver. Real coin. Where does a goblin get Highcourt silver? Answer me that.', min: 3, learn: 'A caravan master told Odessa the goblin raiders have lately been paying in Highcourt silver.', ask: { opts: [
      { tone: 'curious', l: 'Did he say who\'d been paying them?', r: 'He said a man in a good coat met them once at the old watchtower. He didn\'t see a face. He saw boots. Polished boots, in the mud.', tr: 0 },
      { tone: 'blunt', l: 'Someone up here is paying goblins to raid.', r: '~She glances down the Hall, then back. “Say it softer, little priest. I want you around to say it louder later.”', tr: 1 },
      { tone: 'kind', l: 'Whoever it is, it isn\'t your fault Teo was on that road.', r: 'No. But I\'d like very much to meet whoever\'s fault it is.', tr: 1 },
      { tone: 'joke', l: 'Maybe goblins just have very good jobs.', r: 'Ha! Maybe. Maybe I should apply. The pay is clearly better than jewellery.', tr: 0 },
    ] } },
    { t: 'Ilse sat with me at the Fox and told me what she saw. I cried on her for an hour and ruined her best scarf. She says the dye will run anyway.', if: 'duty:ilse_teo' },
    { t: 'They found Halvard. Everyone says goblins. Goblin, goblin, goblin. Very convenient, that word, in this town.', if: 'found', min: 2 },
    { t: 'You took the seal from the goblin king. Gnarlhold\'s seal. Was there... did anyone there speak of a human scribe?', if: 'boss:grotsnag' },
  ],
  halvard: [
    'He prayed with me for Teo, the week it happened. In my own tongue. I didn\'t know he knew it.',
    { t: 'He learned it in the south, he said, a long time ago, when he was a different man. He didn\'t say what kind of man. I could see it on his palm, though. Fire, and a hard turning.', min: 3, learn: 'Halvard learned Odessa\'s southern tongue long ago, “when he was a different man.”' },
    { t: 'I read his palm once, for a joke. Long life line. Very long. So he is somewhere. Lines don\'t lie. Not that one.', if: '!found', ask: { opts: [
      { tone: 'kind', l: 'Then I\'ll bring him home to prove you right.', r: 'Yes. Do. I love to be right. It\'s my best feature after my laugh.', tr: 1 },
      { tone: 'curious', l: 'What else did you see in his hand?', r: '~She hesitates. “A child carried out of somewhere hot. I told him it was nonsense. He went quiet and paid me double.”', tr: 1, learn: 'Reading Halvard\'s palm, Odessa saw a child carried out of fire. He paid her double and went quiet.' },
      { tone: 'blunt', l: 'You said palms lie.', r: 'Rings lie. Palms only exaggerate. There is a difference, little priest.', tr: 0 },
      { tone: 'pious', l: 'Aurel holds his life, not the lines.', r: 'Fine, fine, Aurel holds it. But he holds it in that long line, I saw.', tr: 0 },
    ] } },
    { t: 'So the line lied. Or he cut it short himself, walking where he walked. That would be like him.', if: 'found' },
    { t: 'A goblin knife, they say. I\'ve seen goblin knives in the caravan trade. Ugly, notched things. A notched knife doesn\'t leave a clean wound. Ask Tamsin. Ask her quietly.', if: 'found', min: 3 },
  ],
  caves: [
    'Mountains have kingdoms under them in the south too. We call them the low courts. Nobody goes there twice.',
    { t: 'The goblins have a shaman who wants someone to read old writing. Old writing about what? Doors? Seals? Ancient grocery lists?', if: 'duty:ilse_teo' },
    { t: 'Four kingdoms and a door between them. And one of them, I would wager, is being paid to make trouble up here. Gold makes a good leash.', if: 'junction', min: 2 },
    { t: 'You hold seals now. Be careful, little priest. Things that open doors are always wanted by someone who shouldn\'t have them.', if: 'seals:2' },
  ],
  gods: [
    'At home we pray to the river and the river answers by flooding. Here you pray to the dawn and the dawn just comes. Very polite, your god.',
    { t: 'I leave a blue stone for Nemora by Gil\'s pond on Teo\'s name-day. Gil saw me once. He didn\'t say anything. He just nodded, like he knew.', min: 2 },
    { t: 'Halvard told me the gods don\'t want our gold. Odd thing to tell a jeweller. Then he bought a ring for someone and wouldn\'t tell me who.', min: 1 },
  ],
  gossip: [
    'Wendell tells me everything and swears he tells no one. I tell no one either. Mostly.',
    { t: 'The councilman\'s wife bought a mourning brooch from me. Black jet, very fine. I asked who for. She said “no one yet.” That has stayed with me.', min: 3 },
    { t: 'Hilde came in to have a soldier\'s ring cut off. Too tight, she said. It wasn\'t too tight. She just wanted it gone. I kept the pieces in a twist of paper, in case.', min: 3 },
    { t: 'Maren says Ilse\'s wool is cheap river trash. Ilse says Maren\'s weaving is fine for horse blankets. Both are lying. Both are very good. I sell them both brooches.', if: '!flag:maren_ilse_peace' },
    { t: 'Rolf is sweet on nobody. Bran is sweet on Hilde. Hilde is sweet on her own doorway. This town!', min: 1 },
  ],
  about: {
    ilse: [
      'Ilse rode the caravans with Teo for three seasons. Loudest woman on the road. He adored her. Not like that. Like a sister who shouts.',
      { t: 'She won\'t look at me some days. I think she knows something about the raid. I think she\'s afraid it will hurt me.', min: 2, if: '!duty:ilse_teo' },
      { t: 'She told me. She held my hands while she did it. I owe her a ring for that. A big one. A vulgar one. She\'ll love it.', if: 'duty:ilse_teo' },
    ],
    mirela: [
      'Mirela cuts the cleanest runes I\'ve ever set. I pay her properly and I tell anyone who says witch to come and say it to my face.',
      { t: 'She came to my stall and asked for nothing, just sat. Hiding from the farmers, I think. I gave her tea and told her terrible jokes.', min: 2 },
    ],
    wendell: [
      'Wendell! He tries to haggle with me over silver like it\'s turnips. I let him win sometimes. He glows for a week.',
      { t: 'He\'s worried about money. A man doesn\'t count his coins three times in a morning when he\'s happy.', min: 2, if: '!duty:wendell_tax' },
    ],
    voss: [
      'The councilman buys good silver and never asks the price. A man who never asks the price has never earned anything himself.',
      { t: 'I offered to read his palm once. Lightly, as a joke. He put his hands behind his back and smiled at me. I didn\'t like the smile.', min: 2 },
      { t: 'His hands. I saw them once, when he paid. Old burn scars across the knuckles. Councilmen don\'t get burned.', min: 4, learn: 'Odessa noticed old burn scars across Councilman Voss\'s knuckles.' },
    ],
    teo: [
      'My little brother. Taller than me since he was twelve and never lets me forget it. Reads anything. Recipes, gravestones, the backs of maps.',
      { t: 'He has a laugh like a goose. Honking. I would give every ring in this stall to hear it right now.', min: 2 },
    ],
    pippa: [
      'The little one asked me to read her palm. I told her she will be a great priestess and terrible at keeping secrets. She was delighted with both.',
    ],
    berta: [
      { t: 'Old Berta came in once, looked at all my rings, and asked if I had anything with a bell on it. A little bell, for a well-house, she said. Then she cried and left. I still don\'t know.', min: 3 },
    ],
  },
  extra: {
    ring: { label: 'About Teo\'s ring', if: 'duty:odessa_teo', seq: true, lines: [
      { t: 'I am making a ring for when he comes home. Silver, plain band, a little garnet. He\'ll say it\'s too fancy for a guard. He\'ll wear it anyway.', min: 2 },
      { t: 'Inside the band I\'m engraving the words our mother used to say at the door. In our tongue. Halvard read them for me once, to check my spelling. I\'d got one wrong.', min: 3 },
      { t: 'And now your name, too. I promised. When Teo comes home, there will be a ring with your name in it. I don\'t break promises. I only break necklaces.', min: 4, ask: { opts: [
        { tone: 'kind', l: 'Then I\'d better make sure he comes home to wear it.', r: '~She kisses her own ring finger and touches it to your forehead, a river-city thing. “Go well, little priest.”', tr: 1 },
        { tone: 'joke', l: 'Spell my name right, or I\'m not wearing it.', r: 'Ha! Bring me my brother and I\'ll spell it in gold. Badly. On purpose.', tr: 1 },
        { tone: 'pious', l: 'Pray with me for him again. Here, now.', r: '~She bows her head over the trays, and for a little while the loudest woman in the Hall is completely silent.', tr: 1 },
        { tone: 'blunt', l: 'You shouldn\'t carve a name for a man who might not come back.', r: '~Her chin comes up. “Then I\'ll carve it twice as deep, and make the mountain give him back to see it.”', tr: 0 },
      ] } },
    ] },
  },
};

// Rolf Barrow, innkeeper of the Sleeping Fox
DIALOGUE.rolf = {
  intro: [
    '~A big man behind the bar looks up from a tankard he is drying, and his whole face opens into a grin.',
    'Halvard\'s lad! In my inn, on your own two feet. Sit down before I start telling stories about you as a baby.',
  ],
  greet: [
    'Come in, come in, mind the dog. There is no dog. I just like to see people jump.',
    { t: 'Early for ale, lad. Not early for porridge. Sit.', if: 'phase:Dawn,Morning' },
    { t: 'Evening crowd\'s coming. Grab the corner stool before Wendell sits on it and starts counting his losses.', if: 'night' },
    { t: '~Rolf leans on the bar and takes his weight off his left knee, wincing. “Rain tonight. The knee says so, and the knee is never wrong.”', if: '!duty:rolf_knee' },
    { t: '~Rolf does a little jig behind the bar as you come in. “Look at that! Not a creak! Halvard\'s hands, Aurel\'s mercy, and your prayer.”', if: 'duty:rolf_knee' },
    { t: 'Seventh-day stew\'s on, and every trout in it has your name on it. Not literally. Gil checked.', if: 'duty:rolf_fish' },
    { t: 'There he is. My favourite customer who never pays.', min: 3 },
    { t: '~He sets a cup in front of you before you\'ve reached the bar. He does not say anything, and he does not need to.', min: 4, if: 'found' },
    { t: 'Sit down, {n}. You look like a man who\'s been under a mountain. Because you have.', if: 'junction' },
    { t: 'The whole Fox is talking about you. Some of it\'s even true. I made up the bit with the bear.', if: 'seals:1' },
  ],
  bye: [
    'Go on, then. Door sticks, kick it low.',
    'Mind how you go. And come back, I mean it. Bad for trade, losing regulars.',
    { t: 'If you\'re going down there again, take a heel of bread. Nobody fights well hungry.', if: 'junction' },
    { t: '~He raises his cup to you as you go, and drinks the rest of it in one swallow.', if: 'found' },
  ],
  how: [
    'Busy, loud, and up to my elbows in onions. So, a normal day.',
    { t: 'Knee\'s bad. Rain\'s coming. Customers are worse.', if: '!duty:rolf_knee' },
    { t: 'Better than I\'ve been in years, thanks to you. I nearly danced with Hilde. She nearly let me.', if: 'duty:rolf_knee' },
    { t: 'I keep looking at the corner table where he used to sit. Then I wipe it again. It\'s very clean, that table.', if: 'found', min: 2 },
    { t: 'Better for seeing you, lad. Honestly.', min: 3,
      ask: { opts: [
        { tone: 'kind', l: 'You keep this whole town fed and warm. Who looks after you?', r: '~He blinks. “Well. Nobody\'s asked me that since Halvard.” He pours himself half a cup. “You, I suppose. Now.”', tr: 1 },
        { tone: 'joke', l: 'That\'s the ale talking.', r: '~He bellows with laughter and slaps the bar. “The ale talks sense, lad, it\'s the drinkers who don\'t!”', tr: 1 },
        { tone: 'pious', l: 'Aurel keeps the hearth that keeps the town.', r: 'Aye, well. Aurel can come and scrub the pots, then. ~But he looks pleased.', tr: 0 },
        { tone: 'blunt', l: 'You look tired, Rolf.', r: 'I\'m fifty-odd and I run an inn. Tired\'s my natural colour.', tr: 0 },
      ] } },
  ],
  self: [
    'Grew up in this very room. Mother ran the Fox, I ran away from it, then came limping home and ran it after all. The Fox always wins.',
    '~He nods at the sword over the bar. “Never used it. Swear on my stew.” His eyes twinkle in a way that suggests he has.',
    { t: 'I was a sellsword for six summers. Mostly I sold the sword part and kept the running away part.', min: 2 },
    { t: 'Never married. Came close, once. She wanted a man with two good knees and a quiet trade. I had neither.', min: 3 },
  ],
  workLabel: 'About the inn',
  work: [
    'Bed, board and a fire. You\'d be amazed how many troubles shrink to fit a bowl of stew.',
    'The trick of an inn is to hear everything and repeat half. The trick is knowing which half.',
    { t: 'Seventh-day fish stew. My mother\'s recipe, and her mother\'s. Nobody alive knows what the green bit is. Not even me.', if: '!duty:rolf_fish' },
    { t: 'Trade\'s thin with the road shut. Ilse\'s been paying her room in wool. I\'ve got so much wool I could knit a second inn.', if: 'event:raids' },
    { t: 'Feast day! I\'ve got three barrels open and Bran on a promise to behave. One of those will hold.', if: 'event:feast' },
  ],
  news: [
    'Wendell lost at dice again. That\'s not news, that\'s weather.',
    { t: 'Bran\'s been in every night this tenday. I water his ale. Don\'t tell him. He hasn\'t noticed, which tells you how bad it is.', if: '!flag:dace_told' },
    { t: 'Bran smashed a cup last night, then paid for six. Said something about the councilman I won\'t repeat, and I\'ve heard everything.', if: 'flag:bran_angry' },
    { t: 'Militia lads were in, drinking quiet. Militia lads are never quiet. Something\'s sitting on them.', if: 'event:raids' },
    { t: 'Whole valley\'s coughing. I\'ve put honey in the mulled wine and called it medicine. Tamsin says it isn\'t. Tamsin\'s no fun.', if: 'event:fever' },
    { t: 'Folk say you\'ve got one of those cave-king seals. Old Fenwick\'s offered odds on the second. Don\'t bet against yourself, lad.', if: 'seals:1' },
    { t: 'They say you killed the great grey wolf. Hobb bought a round for the whole house. Hobb! I nearly called Tamsin.', if: 'boss:greymaw' },
  ],
  halvard: [
    { t: 'He\'ll walk back in that door, you watch. Stand right there, shake the rain off and ask for small beer like a monk.', if: '!found' },
    { t: 'He had a laugh like a mule falling downstairs. Nobody remembers that. They remember the robe.', if: '!found' },
    { t: 'He\'s gone, then. ~Rolf sets two cups down, fills both, and doesn\'t touch the second.', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: '~Pick up the second cup, and drink it with him.', r: '~He watches you drink, and his eyes go wet. “Aye. That\'s right. That\'s exactly right.”', tr: 1 },
        { tone: 'blunt', l: 'They\'re saying goblins. I don\'t believe it.', r: 'No. Nor do I. Goblins don\'t leave a man\'s satchel empty and his purse full. ~He wipes the bar hard.', tr: 1, learn: 'Rolf heard Halvard\'s purse was left on him but his satchel of papers was empty.' },
        { tone: 'pious', l: 'He\'s in the Dawn now.', r: 'Hope it\'s warm. He always had cold feet. ~He tries to smile and can\'t quite.', tr: 0 },
        { tone: 'joke', l: 'He\'d tell you that second cup\'s a waste of good ale.', r: '~A laugh breaks out of him like a sob. “He would! The old miser!” He drinks it himself.', tr: 1 },
      ] } },
    { t: 'He took the papers, you know. Whatever was in that satchel, he thought it was worth more than his skin.', if: 'found', min: 3 },
    { t: 'Before the robe he was the worst card player in the valley. After the robe, the second worst. Faith only goes so far.', min: 2 },
  ],
  caves: [
    'Every drunk in this inn has been to the bottom of those caves. None of them can find the top of the stairs.',
    { t: 'Old caravan men used to say there were kings under the hill, four of them, and none of them would sit at the same table. Sounds like the council.', min: 1 },
    { t: 'Four stairs and a great shut door? Aye, I heard of that, years back. A reeve from up the valley kept those four kingdoms from each other\'s throats. Died, and they\'ve been at it since.', if: 'junction', learn: 'Rolf says a reeve from up the valley once kept peace between the four kingdoms below.' },
    { t: 'Grotsnag\'s dead? The goblin king? I\'m putting it on the board. “Halvard\'s lad, one. Goblins, nil.”', if: 'boss:grotsnag' },
    { t: 'Don\'t you go opening that great door just because you\'ve got the keys. My grandmother had a word for what sleeps under hills, and she wouldn\'t say it indoors.', if: 'seals:3 !gate' },
  ],
  gods: [
    'I keep a sun-disc over the door and a lamp lit by the window. Aurel likes a warm house. So do I. We get on.',
    'Korrum gets a coin on the cairn when the cellar floods. Veyra gets a feather when the venison\'s good. I\'m not proud. I\'ll thank anyone.',
    { t: 'Ask me about gods when I\'m sober. Then ask me again when I\'m not. You\'ll get two different answers and both of them true.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'All right. Pour yourself one and I\'ll ask again.', r: 'Now you\'re talking theology! ~He pours with great ceremony.', tr: 1 },
        { tone: 'pious', l: 'The gods don\'t change when you drink, Rolf.', r: 'No, but I do. Halvard used to say that too, the prig. ~He says it fondly.', tr: 0 },
        { tone: 'curious', l: 'What\'s the drunk answer?', r: 'That they\'re all sat round a table somewhere, same as us, telling lies and waiting for the stew.', tr: 0 },
        { tone: 'blunt', l: 'That sounds like a man who doesn\'t believe at all.', r: '~His face shuts for a moment. “I believe, lad. I\'ve just seen what believers do. Different thing.”', tr: -1 },
      ] } },
  ],
  gossip: [
    { t: 'Hilde and Bran. Everyone knows. Except Hilde and Bran. I\'ve got a wager with Wendell on midwinter.',
      ask: { opts: [
        { tone: 'joke', l: 'Put me down for the spring thaw. Bran thaws slow.', r: '~He wheezes with laughter and writes it on the slate behind the bar. “Done! Halvard\'s lad, spring thaw, one copper!”', tr: 1 },
        { tone: 'kind', l: 'Maybe someone should just tell them.', r: 'And spoil the best entertainment in the valley? ~But he looks thoughtful. “Aye. Maybe. Bran could use something good.”', tr: 0 },
        { tone: 'pious', l: 'You shouldn\'t bet on your friends\' hearts.', r: 'Lad, I bet on the sun coming up. Doesn\'t mean I don\'t want it to.', tr: 0 },
        { tone: 'curious', l: 'What makes you so sure?', r: 'She keeps one of his knives under her pillow. Don\'t ask me how I know. Innkeeper\'s secret.', tr: 0 },
      ] } },
    'Fenwick took his gavel to supper again. Banged it for more gravy. Garrick nearly threw him in the smokehouse.',
    { t: 'Councilman Voss drinks here once a year, sits with his back to the wall, and leaves a coin too many. I\'ve never once seen him drink what he orders.', min: 2 },
    { t: 'Every autumn, same night, Hilde sits at that table. I leave her a bottle and don\'t ask. Some nights want a bottle, not a question.', min: 3 },
    { t: 'Mortimer the clerk came in last night and drank a whole cup of something strong. Mortimer! Like watching a cat take a bath.', if: 'flag:mortimer_refused' },
  ],
  about: {
    bran: [
      'Best smith in the valley, worst drinker. Heart like a barrel. Same shape too.',
      { t: 'I pour him the fourth and I hate myself. I pour him the fifth and he hates me. That\'s our arrangement.', min: 2 },
      { t: 'Losing Dace would end him. I mean that. Keep looking, lad.', min: 3, if: '!flag:dace_told' },
    ],
    hilde: [
      'Never seen a woman drink so careful. Like every cup\'s a sum she has to work out.',
      { t: 'She was a soldier. She sits facing the door, every time. So do I. So did Halvard, come to that.', min: 3 },
    ],
    wendell: [
      'Wendell! Lovely man. Loses to me at dice every seventh day and swears he\'s on a streak. He is. A long one.',
      { t: 'Don\'t tell Marta how much. She\'d take the rolling pin to both of us.', min: 2 },
    ],
    voss: [
      'The councilman. Pays on time, tips well, smiles like a man who\'s counted your teeth.',
      { t: 'Came here eighteen years back with a heavy purse and a light past. Nobody asked. In a valley this size that\'s strange in itself.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'Same year Halvard came home. Same year Berta came. Odd, that.', r: '~He stops polishing. “Aye. I\'ve thought that too, some nights. Then I have another drink and stop thinking it.”', tr: 1, learn: 'Rolf has noticed Voss, Halvard and Berta all arrived in Brambleford the same year.' },
          { tone: 'blunt', l: 'You think he\'s hiding something.', r: 'Everyone in this inn is hiding something, lad. His just costs more.', tr: 0 },
          { tone: 'joke', l: 'Maybe he robbed a bank.', r: 'If he did, he robbed a big one. ~He laughs, but not much.', tr: 0 },
          { tone: 'kind', l: 'Be careful, Rolf. Don\'t say that to anyone else.', r: 'I\'ve been not saying things in this room for thirty years. I\'m very good at it. ~He winks.', tr: 1 },
        ] } },
      { t: '~He glances at the door before he answers. “Halvard couldn\'t abide the man. Never said why. Never had to.”', min: 4 },
    ],
    fenwick: [
      'Fenwick talks like he\'s auctioning the conversation. Going once, going twice, sold to the man asleep at the back.',
      { t: 'He keeps a book of every sale in the valley. Every one. If you ever need to know who paid what for anything, there\'s your man.', min: 3 },
    ],
    mortimer: [
      'Nice enough. Jumps if you drop a spoon. I dropped a spoon once on purpose. I\'m not proud of it.',
    ],
    berta: [
      { t: 'Halvard took her firewood every week for eighteen years. I took her a pie this week. She sent it back with a note: “Too much salt.” She ate it first.', if: 'found' },
      'Tough old bird. She came up the valley the same year Halvard came home. Same week, near enough.',
    ],
  },
  extra: {
    sword: { label: 'About the sword over the bar', if: 'duty:rolf_knee', seq: true, lines: [
      { t: '~Rolf looks up at the sword for a long while. “You want the truth? I used it once. Once was plenty.”', min: 3 },
      { t: 'Halvard and me took work guarding a salt train, two daft lads. Bandits came at dusk. I swung that thing, and a man fell, and I sat in the road and cried.', min: 3, learn: 'Rolf and Halvard guarded a salt train as young men; Rolf killed a bandit and hung up the sword after.' },
      { t: 'Halvard sat next to me in the dirt all night. Didn\'t pray at me. Didn\'t say a word. Next spring he took orders. I think that night decided him.', min: 3 },
      { t: 'So I hung it up where I can see it, to remember what it costs. It\'s not decoration, {n}. It\'s a receipt.', min: 4,
        ask: { opts: [
          { tone: 'kind', l: 'Thank you for telling me.', r: 'Thank you for listening. Most folk just ask if it\'s sharp.', tr: 1 },
          { tone: 'curious', l: 'Is it still sharp?', r: '~He roars with laughter. “Aye! I oil it every seventh day. Old habits.”', tr: 0 },
          { tone: 'pious', l: 'Aurel heals what we carry, if we let him.', r: 'Halvard said that. Then he said, “But you have to put it down first.” I never have.', tr: 1 },
          { tone: 'blunt', l: 'Then take it down. You\'ve paid.', r: '~He looks at you a long moment. “Maybe. When you come home from those caves for good. Then I\'ll take it down.”', tr: 1 },
        ] } },
    ] },
  },
};

// Mortimer Quill, town clerk
DIALOGUE.mortimer = {
  intro: [
    '~A thin man behind a high counter knocks over a pot of sand, rights it, and pretends that did not happen.',
    'Acolyte. Yes. Good morning. Or... is it afternoon? It\'s always the same light in here. Please don\'t touch the inkwell.',
  ],
  greet: [
    'Oh! You. Sorry. Doors creak. I\'ve asked for oil. Twice. In writing.',
    'Acolyte. How can the hall serve you? Within the regulations, I mean. Mostly.',
    { t: 'You\'re early. The ledgers aren\'t even unlocked. I sleep here sometimes. Don\'t... don\'t mention that.', if: 'phase:Dawn' },
    { t: 'The hall\'s closed, strictly. But you\'re... well. Come in. Quickly.', if: 'night' },
    { t: '~He glances at the door behind you, then at the window, then at you. “Is anyone with you? No? Good. Good.”', if: 'flag:have_rolls' },
    { t: '~Mortimer is standing very straight behind his counter. He looks as if he\'s practising. “Acolyte. I am... still employed. For now.”', if: 'flag:mortimer_refused' },
    { t: 'There you are. I\'ve been saving you a chair. Nobody else uses it, but still. It\'s yours.', min: 3 },
    { t: '~He has a pressed flower tucked into his ledger, and goes pink when he sees you notice. “Maren left it on the step. It means nothing. It means... quite a lot.”', if: 'flag:maren_mortimer' },
    { t: '~He doesn\'t look up. His pen has stopped mid-word. “I heard. About Father Halvard. I\'m so sorry. I wrote it in the register myself. I had to.”', if: 'found' },
  ],
  bye: [
    'Yes. Good day. Mind the step, it\'s on the deed as “uneven”.',
    'Do close the door. The draught gets into the paper.',
    { t: 'Be careful out there. And... in here, I suppose. Everywhere, really.', if: 'flag:have_rolls' },
    { t: 'Come back soon. I\'ll have the kettle on. I bought a kettle. That\'s new.', min: 3 },
  ],
  how: [
    'Busy. Well. Not busy. Worried, mostly, which looks the same from outside.',
    'I didn\'t sleep. I never sleep the week before council. Or after. Or during, frankly.',
    { t: 'Frightened. Which is normal. But also proud, which isn\'t. I don\'t know where to put it.', if: 'flag:mortimer_refused' },
    { t: 'I\'m... all right? I think I\'m all right. Ask me again when the councilman comes in.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'You don\'t have to face him alone, Mortimer.', r: '~His eyes go wide behind his spectacles. “I... nobody\'s said that before. I\'ll write it down. Not officially.”', tr: 1 },
        { tone: 'blunt', l: 'Then stop letting him frighten you.', r: '~He flinches as if you\'d thrown the inkwell. “Easy to say. You don\'t have your name on his papers.”', tr: -1 },
        { tone: 'joke', l: 'If he comes in, I\'ll knock the sand pot over. Distraction.', r: '~A startled little laugh escapes him, and he covers it with his hand. “That\'s... yes. Very good. Please don\'t.”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps the truth safe, even when we can\'t.', r: 'Does she? I\'d like that. I\'ve always thought the registry was a kind of shrine. Is that... is that foolish?', tr: 1 },
        { tone: 'curious', l: 'What does he have you doing?', r: '~He goes white. “Minutes. Permits. Nothing. Please don\'t ask in here. The walls are thin and the councilman is not.”', tr: 0 },
      ] } },
  ],
  self: [
    'Twenty years I\'ve kept the books. I can tell you who owned the mill field in the year of the long frost. Nobody\'s ever asked.',
    'My father was clerk before me. He said a good clerk is a pair of hands and no opinions. I have had opinions. I have kept them in a drawer.',
    { t: 'I wanted to be a scholar at Highcourt. Then Father died and someone had to keep the hall. Maren said I was hiding. Perhaps I was.', min: 3 },
  ],
  workLabel: 'About the records',
  work: [
    'Deeds, permits, births, burials, the land registry, and a complaint from Hobb Thatcher about a fence that is older than both of us.',
    'Ink fades. Paper burns. Memory is worse than both. That\'s why someone has to write things down.',
    { t: 'Records aren\'t mine. That\'s the whole point. They belong to everyone. Even the people nobody remembers.', min: 2, if: 'duty:mortimer_records' },
    { t: 'The settlement rolls are... where they ought to be. Safe. I shan\'t say more.', if: 'flag:have_rolls', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'You did a brave thing, Mortimer.', r: '~He goes pink to the ears. “I did a frightened thing bravely. That\'s not the same. But thank you.”', tr: 1 },
        { tone: 'curious', l: 'Did you read them, before you gave them to me?', r: 'Every line. Twice. ~He swallows. “The last line was Father Halvard\'s hand. About a child. I think you know which child.”', tr: 1 },
        { tone: 'blunt', l: 'He\'ll know it was you.', r: 'He knows already. He always knows. ~His hands shake, and he puts them flat on the counter to stop them.', tr: 0 },
        { tone: 'pious', l: 'Nemora will remember you kept them.', r: 'I hope she remembers kindly. I hope somebody does.', tr: 1 },
      ] } },
    { t: 'Someone has asked to see the market ledgers eighteen years back. Several times. Someone very particular. I said they were “being rebound”.', min: 3, if: 'flag:hilde_captain' },
  ],
  news: [
    'The council meets on the first. The agenda is “matters arising”. Nothing ever arises. It\'s simply decided.',
    { t: 'The councilman has asked for a survey of the temple land. Boundaries, wells, the old orchard. I\'ve been slow about it. On purpose. A little.', min: 2, learn: 'Voss has ordered Mortimer to survey the temple land.' },
    { t: 'Militia rolls are short a name. Two, now. I\'m told to leave the lines blank. I don\'t like blank lines.', if: 'event:raids' },
    { t: 'There was smoke from the hall chimney after... after I did as I was told. Some things I can\'t un-write. Or un-burn.', if: 'flag:rolls_burned' },
    { t: 'The councilman came in yesterday. He didn\'t shout. He never shouts. He just stood by my desk and read upside down. For an hour.', if: 'flag:mortimer_refused' },
    { t: 'People are saying you\'ve been under the hill and come back with a king\'s seal. I looked in the registry for a precedent. There isn\'t one.', if: 'seals:1' },
  ],
  halvard: [
    { t: 'He came in last month asking for the old records. I told him they weren\'t available. I wish... I wish I\'d said yes.', if: '!found' },
    { t: 'He used to correct my Highcourt spelling. Gently. Always gently. Nobody else reads the minutes.', if: '!found' },
    { t: '~Mortimer opens the burial register, dips his pen, and stops. “I haven\'t been able to write the line. I\'ve left it blank. I don\'t like blank lines. But I can\'t.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'Write it with me. We\'ll do it together.', r: '~You stand at his elbow while he writes it out in his best hand. When he\'s done, he dusts it with sand very carefully, as if tucking someone in.', tr: 1 },
        { tone: 'pious', l: 'A name written down is a name remembered. That\'s a rite, too.', r: 'Yes. Yes, I think so. Nemora\'s rite. ~He writes it, slowly.', tr: 1 },
        { tone: 'blunt', l: 'Leave it blank until we know who killed him.', r: '~His pen hovers. “That\'s... irregular.” Then, quietly: “Yes. Cause of death, unknown. I\'ll leave that line open.”', tr: 1, learn: 'Mortimer left the cause of Halvard\'s death blank in the register.' },
        { tone: 'curious', l: 'What did he want from the old records?', r: 'The settlement rolls. The year Ashvale... the year the refugees came. ~He shuts the register.', tr: 0 },
      ] } },
    { t: 'He asked for the rolls because he knew someone wanted them gone. He was trying to save them from... from my own fireplace.', if: 'found', min: 3 },
  ],
  caves: [
    'There\'s a survey of the caves in the archive. From before the war. It ends at the third level with the words “here the old roads go down”. Then a smudge.',
    { t: 'Four stairways? The old survey marks four, yes. Each with a little sign. A flame, a tooth, an eye, a coil. I always thought they were doodles.', if: 'junction', learn: 'An old survey in the Town Hall marks the four stairways with a flame, a tooth, an eye and a coil.' },
    { t: 'There\'s a treaty in the archive. Very old. Signed by a reeve of Ashvale and four... marks. Not names. Marks. I\'ve never shown it to anyone.', min: 4, learn: 'The Town Hall holds an old treaty signed by a reeve of Ashvale and four kingdom marks.' },
    { t: 'You have a seal? May I... no. Don\'t let me touch it. I\'d want to catalogue it, and then it would be a record, and then someone would want it burned.', if: 'seals:1' },
  ],
  gods: [
    { t: 'Nemora, mostly. The Still Water. She remembers things. I keep a blue stone in the strongroom. Don\'t tell the council.',
      ask: { opts: [
        { tone: 'pious', l: 'Bring it to the temple at dawn. I\'ll bless it with you.', r: '~He looks terrified and delighted. “In public? Well. At the back. Near the door.”', tr: 1 },
        { tone: 'joke', l: 'Is it filed under N?', r: 'Under S. For “stone”. ~He pauses. “That was a joke. I don\'t make many. Was it all right?”', tr: 1 },
        { tone: 'curious', l: 'Why would the council mind?', r: 'The councilman says the old shrines are “unproductive”. He says it about a lot of things. People, mostly.', tr: 0 },
        { tone: 'blunt', l: 'A stone in a cupboard isn\'t much of a rite.', r: '~He deflates. “No. I suppose it isn\'t. It\'s all I had the nerve for.”', tr: -1 },
      ] } },
    'I go to the dawn service on Aurel\'s high days. I sit at the back. I like to be near the door.',
    { t: 'I don\'t think the gods mind clerks. We\'re rather like them. We keep lists, and nobody thanks us.', min: 2 },
  ],
  gossip: [
    { t: '~He sniffs. “I don\'t gossip. I record.” A pause. “Hobb Thatcher has filed four complaints about the same fence.”',
      ask: { opts: [
        { tone: 'joke', l: 'Is the fence winning?', r: '~He snorts ink-dust off his ledger. “The fence has never lost. It\'s a very old fence.”', tr: 1 },
        { tone: 'curious', l: 'What else have you recorded lately?', r: '~His eyes flick to a locked drawer. “Nothing. Weather. Lambs. Please stop looking at the drawer.”', tr: 0 },
        { tone: 'kind', l: 'You must know this town better than anyone.', r: 'On paper. Only on paper. ~But he sits a little straighter.', tr: 1 },
        { tone: 'blunt', l: 'Keeping records is gossip with a stamp on it.', r: '~He looks wounded. “It is not. Gossip changes in the telling. Records don\'t. That\'s the whole difference.”', tr: -1 },
      ] } },
    { t: 'The councilman pays for the militia from a fund that isn\'t on any ledger. I only know because it isn\'t there. You notice holes, in my trade.', min: 3, learn: 'Voss pays the militia from money that appears on no town ledger.' },
    { t: 'Fenwick Hale keeps his own sale book. Better than mine, frankly. He lent me a page once and wouldn\'t say why he went so quiet afterwards.', min: 2 },
    { t: 'Old Berta came in to renew her lease. She signed with an Ashvale hand. The way they cross their sevens. I didn\'t say anything. I stamped it.', min: 3, if: 'flag:have_rolls' },
  ],
  about: {
    voss: [
      '~He straightens his pens. “The councilman is very... organised. He appreciates order. I appreciate order. We are, in that sense, a good match.”',
      { t: 'He tells me to write things, and I write them. And then I lie awake reading them on the ceiling.', min: 2 },
      { t: 'He doesn\'t threaten. He just remembers things. Your mother\'s name. Your rent. That you were sick last spring. Quietly. Then he smiles.', min: 3, if: 'flag:mortimer_refused' },
    ],
    maren: [
      'My sister. The weaver. We... are not presently speaking. It\'s been a year. Three hundred and eight days.',
      { t: 'She was right, about the rent. I sided with the council because I was afraid. She has never been afraid of anything in her life. It\'s very tiring.', min: 2 },
      { t: 'She left a flower on the step. I left a ribbon on hers. We are speaking, in a way. Through objects. Like diplomats.', if: 'flag:maren_mortimer' },
    ],
    elsbeth: [
      'Mistress Voss is very kind. She brought me soup when I had the fever. The councilman doesn\'t know. I don\'t think.',
    ],
    anselm: [
      'The friar has asked for the temple deeds. Twice. Politely. I like him. He initials every page.',
      { t: 'He\'s been asking who else has asked for the deeds. I\'ve been... telling him. A clerk can be loyal to the record, not the man.', min: 3 },
    ],
    berta: [
      'Old Berta frightens me a little. She asked if I was “the frightened Quill or the cross one”. I said frightened. She said, “Good, the cross one\'s worse.”',
      { t: 'Her name\'s on a list I... no longer have. Please look after her.', if: 'flag:have_rolls' },
    ],
    hilde: [
      { t: 'Mistress Marsh came in once to check her own enlistment papers. From up north. She read them, said “thank you,” and put them on the fire herself. I let her.', min: 3 },
      'She buys ink for letters she never sends. I know, because she buys it from the hall.',
    ],
  },
  extra: {
    maren: { label: 'About Maren', if: 'met:maren', seq: true, lines: [
      { t: 'When we were small, Maren made me a coat out of a flour sack. It had pockets for my pens. She sewed my name inside, in red.', min: 3 },
      { t: 'Then I took the council\'s side over her rent. I told myself it was the law. It was the councilman. It\'s always the councilman.', min: 3 },
      { t: 'I still have the flour-sack coat. It doesn\'t fit. I keep it in the strongroom with the deeds. It\'s the most important document I own.', min: 4, learn: 'Mortimer keeps the flour-sack coat Maren sewed him as a boy in the Town Hall strongroom.',
        ask: { opts: [
          { tone: 'kind', l: 'Tell her that. Exactly that.', r: '~He looks at you as if you\'d handed him a key. “Exactly that. Yes. I could write it down first. I could practise.”', tr: 1 },
          { tone: 'joke', l: 'Ask her to make you a bigger one.', r: '~He laughs, properly, then looks surprised at himself. “She would. She\'d complain the whole time. Oh, she\'d love that.”', tr: 1 },
          { tone: 'blunt', l: 'You owe her an apology, not a coat in a cupboard.', r: '~He goes red to the ears. “Yes. I know. I know I do.” He says it to the ledger, not to you.', tr: 0 },
          { tone: 'pious', l: 'Aurel blesses a hearth that takes back its own.', r: 'I\'m not sure I\'m allowed back. But I\'d like to be. ~He touches the ledger, very lightly.', tr: 1 },
        ] } },
    ] },
  },
};

// Edric Voss, councilman
DIALOGUE.voss = {
  intro: [
    '~A man in a black coat turns from watching the market. He looks at you the way a buyer looks at a horse.',
    'Ah. Halvard\'s foundling. You\'ve grown. They do, don\'t they.',
  ],
  greet: [
    'Acolyte. A fine morning for minding one\'s own affairs.',
    'You again. I do wonder what draws you to the square. It isn\'t the bread.',
    { t: 'Up with the lamps, I see. Halvard kept those hours too. It didn\'t do him much good.', if: 'phase:Dawn,Morning' },
    { t: 'It\'s late to be wandering, boy. Brambleford is safe, of course. The council sees to that.', if: 'night' },
    { t: '~He doesn\'t look at you. He watches Mortimer\'s window across the square. “Busy, these last days. My clerk tells me you\'ve been reading.”', if: 'flag:have_rolls' },
    { t: '~Voss is smiling. It doesn\'t move his eyes. “My clerk has developed a backbone. I wonder where he found it.”', if: 'flag:mortimer_refused' },
    { t: 'Old women and soldiers. You keep such interesting company for a boy of the cloth.', if: 'flag:hilde_captain' },
    { t: '~His glance slides past you to the south lane, toward Berta\'s cottage, and stays there a moment too long.', if: 'flag:berta_captain' },
    { t: 'My condolences, Acolyte. Truly. The caves are no place for sentiment, as I believe I said.', if: 'found' },
    { t: 'You\'ve been under the hill. You smell of it. Do wash before you call on decent people.', if: 'junction' },
  ],
  bye: [
    'Good day. Do give my regards to the friar.',
    'Run along. The temple lamps won\'t light themselves. Not for much longer.',
    { t: 'Mind the north lane at night. It\'s very dark, and people trip.', if: 'flag:have_rolls' },
    { t: 'Go carefully, boy. I mean that more than you know.', if: 'found' },
  ],
  how: [
    'Very well. The town prospers. I sleep like a stone. ~Something in his face says otherwise.',
    'I\'m a councilman. I\'m always well. That\'s rather the job.',
    { t: 'Patient. More patient than you\'d credit.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'Your wife says you don\'t sleep. I could pray for you.', r: '~The temperature drops. “My wife says a great many things in a garden. You will not pray for me, Acolyte. Not ever.”', tr: -1 },
        { tone: 'curious', l: 'Patient for what?', r: 'For the right price, Acolyte. Everything has one. Temple land. Old paper. Young men with questions.', tr: -1 },
        { tone: 'joke', l: 'Patient like a heron, or patient like a tax collector?', r: '~A thin smile. “Clever. Halvard was clever too. People forget that about him.”', tr: 0 },
        { tone: 'pious', l: 'Aurel rewards patience with light.', r: 'Aurel rewards nothing. Councils reward. Remember that when your friar sells your roof.', tr: 0 },
      ] } },
    { t: '~He doesn\'t answer at once. He looks north, toward the hills. “Busy. The militia keeps me busy.”', if: 'event:raids' },
  ],
  self: [
    'I came to this valley with money and ideas, and the valley had need of both. It\'s a simple story. Simple stories are best.',
    'Where I came from? North. Everyone comes from somewhere, Acolyte. Most of us have the decency not to dwell on it.',
    { t: 'I served, when I was young. Many did. One learns order, and the cost of its absence. ~He smooths his glove.', min: 2 },
  ],
  workLabel: 'About the council',
  work: [
    'The council keeps the roads, the militia and the peace. Mostly the peace. Peace is expensive.',
    'Brambleford needs a firm hand. Halvard thought it needed a soft one. We disagreed, civilly, for eighteen years.',
    { t: 'The temple land would make a fine militia yard. I\'ve written to the cathedral. The friar is weighing my offer. Friars weigh everything.', min: 1, learn: 'Voss wants the temple land for a militia yard.' },
    { t: 'The militia will stand on the North Road until this business is done. My business, Acolyte. Not yours.', if: 'event:raids',
      ask: { opts: [
        { tone: 'blunt', l: 'Bran\'s son went out on one of your patrols and didn\'t come back.', r: '~His voice doesn\'t rise. “Soldiers go where they are sent. Ask the smith why he raised a boy who wanted to be one.”', tr: -1 },
        { tone: 'curious', l: 'What business is on the North Road?', r: 'Goblins, Acolyte. Filth from under the hill. What else would there be? ~He waits, as if to see whether you\'ll answer.', tr: -1 },
        { tone: 'kind', l: 'Then let the temple help. We can tend the wounded.', r: 'There are no wounded. My patrols are very careful. ~He says it like a door closing.', tr: 0 },
        { tone: 'pious', l: 'Korrum asks endurance, not obedience.', r: 'Korrum is a rock. Rocks do not run villages.', tr: 0 },
      ] } },
  ],
  news: [
    'The news is that the council has matters in hand. You may tell the town I said so.',
    { t: 'The goblins grow bold. The council will grow bolder. I\'ve asked Bran for spearheads. He\'ll make them. He always does.', if: '!flag:bran_angry' },
    { t: 'The smith has been saying unwise things in the Fox. Grief makes men foolish. I hope it passes. For his sake.', if: 'flag:bran_angry' },
    { t: 'The farmers\' sheep are dying and the enchantress came the year the wolves did. I only note it. I never accuse.', if: '!flag:mirela_cleared' },
    { t: 'I hear Hobb Thatcher has bought a rune for his gate. How touching. Some men are easily turned.', if: 'flag:mirela_cleared' },
    { t: 'They say the great grey wolf is dead. Fine work. A boy who can kill a wolf can surely find better uses for himself than digging.', if: 'boss:greymaw' },
    { t: 'Fever in the lanes. The council has posted notices. Keep away from the sick, Acolyte. Disease spreads. Whole villages, sometimes.', if: 'event:fever', learn: 'Voss spoke of fever taking “whole villages” and watched to see how the hero took it.' },
  ],
  halvard: [
    { t: 'The militia will handle the Halvard matter. Go home, boy.', if: '!found' },
    { t: 'He went poking in the dark with a satchel of old grudges. Men who carry such things tend to trip.', if: '!found' },
    { t: 'A good man, in his way. Sentimental. He kept things he should have burned.', min: 1 },
    { t: 'Goblins. Plainly. I\'ve said so from the start. A tragedy, but not a mystery.', if: 'found',
      ask: { opts: [
        { tone: 'blunt', l: 'The wound was too clean for a goblin knife.', r: '~For one heartbeat his face is perfectly still. Then: “You\'ve been listening to old soldiers. They see ghosts in every cut.”', tr: -1 },
        { tone: 'curious', l: 'Where\'s his satchel? The papers he took?', r: 'Goblins eat paper, I expect. ~He holds your eyes a little too long. “Whatever he took down there, let it stay down there.”', tr: -1, learn: 'Voss told the hero to let whatever Halvard carried into the caves stay there.' },
        { tone: 'kind', l: 'Did you ever care for him at all?', r: '~Something moves behind his eyes and is gone. “I knew him a long time. Longer than you. Leave it there.”', tr: 0 },
        { tone: 'pious', l: 'Aurel sees what was done in the dark.', r: 'Then Aurel may raise it with the council. Through the proper channels.', tr: -1 },
      ] } },
    { t: 'Grieve, boy. Then stop. Grief that goes on too long turns into something else, and the something else gets people hurt.', if: 'found', min: 0 },
  ],
  caves: [
    'There\'s nothing down there but vermin and old stories. Leave both alone.',
    { t: 'You reached the junction? How enterprising. Four doors and four kings who\'d each sell the others for a fat purse. Some things never change.', if: 'junction', learn: 'Voss knows that one of the cave kingdoms can be bought, and speaks as if from experience.' },
    { t: 'One seal. You think you\'re collecting keys. You\'re collecting enemies. Kings remember who robbed them.', if: 'seals:1' },
    { t: 'Three seals. ~His gloved hand closes very slowly. “Whatever is behind that door has slept a long time for a reason. Do not be the fool who wakes it.”', if: 'seals:3' },
    { t: 'Grotsnag dead. A pity. He was a creature one could reason with. ~He seems to regret saying it.', if: 'boss:grotsnag' },
  ],
  gods: [
    'I give to the temple on the high days. It\'s expected. I do what is expected.',
    'Gods are like councils, Acolyte. They prefer quiet, and they reward those who keep it.',
    { t: 'Aurel is the god of light, they say. Light is overrated. Too much of it and things burn.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Things like what?', r: '~He turns to look at you fully for the first time. “Like crops. In a dry year.” He turns away again. “Run along.”', tr: -1 },
        { tone: 'pious', l: 'Aurel\'s light warms. It\'s fire that burns.', r: 'A fine distinction for a sermon. In practice they look much the same from a distance.', tr: 0 },
        { tone: 'blunt', l: 'Spoken like a man with something to hide.', r: 'Spoken like a boy who will one day learn when to be silent. I hope for your sake it\'s soon.', tr: -1 },
        { tone: 'joke', l: 'I\'ll tell Marta you said that. She\'ll stop selling you bread.', r: '~Not a flicker. “I buy my bread elsewhere.”', tr: 0 },
      ] } },
  ],
  gossip: [
    'I don\'t gossip. I listen, and I remember. It\'s more useful.',
    { t: 'The armorer salutes me in the street. A soldier\'s habit, I suppose. She\'d do well to break it.', min: 1 },
    { t: 'Old Berta tells the same stories every winter. Ashvale this, Ashvale that. Plague is a terrible thing. It addles the survivors.', if: 'flag:berta_captain',
      ask: { opts: [
        { tone: 'curious', l: 'How do you know she\'s from Ashvale? She never says so.', r: '~The smallest pause. “Records, Acolyte. I read the town\'s records. Some of them, at least, are still where they belong.”', tr: -1, learn: 'Voss let slip he knows Berta is from Ashvale, though she never says so out loud.' },
        { tone: 'blunt', l: 'It wasn\'t plague.', r: '~His voice drops so low you barely hear it. “Be very sure of what you say aloud in this square, boy. Very sure.”', tr: -1 },
        { tone: 'kind', l: 'She\'s an old woman. Leave her in peace.', r: 'I have done nothing but leave her in peace for eighteen years. See that she returns the courtesy.', tr: 0 },
        { tone: 'pious', l: 'Nemora keeps every memory, even the ones we bury.', r: 'Then Nemora is welcome to them. I prefer the living.', tr: 0 },
      ] } },
    { t: 'The friar sends letters to Highcourt every second day. I find that very diligent. And very traceable.', min: 1 },
  ],
  about: {
    elsbeth: [
      'My wife. She keeps the roses. You will leave her out of whatever this is.',
      { t: 'She is the only gentle thing I own. ~He corrects himself. “Have. The only gentle thing I have.”', min: 2 },
      { t: '~His voice goes very flat. “You have been to my house. Spoken to my wife in my garden. If you upset her, Acolyte, we will have a different conversation.”', if: 'duty:elsbeth_prayer' },
    ],
    mortimer: [
      'My clerk. A useful man, when he remembers what he\'s for.',
      { t: 'Mortimer has been refusing things. It\'s new. New things often don\'t last.', if: 'flag:mortimer_refused' },
      { t: 'Some papers went missing from my clerk\'s care. If they turn up at the temple, I\'d consider it theft. The cathedral would agree.', if: 'flag:have_rolls' },
    ],
    hilde: [
      'The armorer makes good, plain work. I respect plain work.',
      { t: 'We may have crossed paths before Brambleford. Soldiers do. Neither of us is sentimental about it. ~He pauses. “At least, one of us isn\'t.”', min: 2, if: 'flag:hilde_captain' },
    ],
    anselm: [
      'The friar is a reasonable man. The cathedral needs money. I have money. We\'ll come to terms.',
      { t: 'He has started asking about my letters. Reasonable men stay reasonable, Acolyte. Remind him.', if: 'flag:have_rolls' },
    ],
    bran: [
      'The smith forges for the council. He doesn\'t like it. He does it. That\'s the whole of loyalty, really.',
      { t: 'If Bran has something to say to me, he can say it at council. Not in an alehouse with a hammer in his fist.', if: 'flag:bran_angry' },
    ],
    berta: [
      { t: 'An old woman with a bad cough. Winters are hard on the old. ~He says it like a weather report.', if: 'flag:berta_captain' },
      'Old Berta? She arrived the year I did. We are both newcomers, by local reckoning. I simply made better use of it.',
    ],
    ned: [
      'Harrow\'s boy. Takes orders well. I wish more young men did.',
      { t: 'Ned is under orders not to discuss militia business. With anyone. Especially the temple.', min: 1, if: 'duty:ned_patrol' },
    ],
    fenwick: [
      { t: 'The auctioneer has a long memory and a short neck. I\'ve always thought those two things balance each other.', min: 2 },
    ],
  },
  extra: {
    roses: { label: 'About Elsbeth\'s roses', if: 'met:elsbeth', seq: true, lines: [
      { t: 'The roses? I planted them the spring we came. Northern stock. They took three years to bloom. I very nearly dug them up.', min: 2 },
      { t: 'She wouldn\'t let me. She said everything deserves a few winters to prove itself. ~He looks briefly, terribly tired.', min: 3 },
      { t: 'I don\'t go into the garden. It smells of smoke at night, from the chimneys. ~He catches himself. “That will be all, Acolyte.”', min: 3, learn: 'Voss avoids his own garden because the chimney smoke at night troubles him.' },
      { t: 'If anything happens to me, boy, she is not to blame. She never asked. Remember that she never asked.', min: 4,
        ask: { opts: [
          { tone: 'curious', l: 'Never asked about what?', r: '~The door in his face swings shut. “About anything. Good day.”', tr: -1 },
          { tone: 'kind', l: 'I\'ll look after her. Whatever happens.', r: '~For a moment he looks at you as a man, not a councilman. Then he nods, once, and walks away without a word.', tr: 1 },
          { tone: 'blunt', l: 'Then tell me what she never asked.', r: 'No. ~Just that. You have never heard the word sound so final.', tr: -1 },
          { tone: 'pious', l: 'Aurel will judge you, not her.', r: 'Aurel. Yes. I expect someone will. ~He does not sound as if he means a god.', tr: 0 },
        ] } },
    ] },
  },
};

// Elsbeth Voss, the councilman's wife
DIALOGUE.elsbeth = {
  intro: [
    '~A woman in grey straightens from a bed of roses, shears in hand, and glances at the house before she looks at you.',
    'Oh. You\'re Halvard\'s boy. Please, speak softly. The windows are open.',
  ],
  greet: [
    'Good day, Acolyte. Mind the thorns. They don\'t mean anything by it.',
    '~She is kneeling in the bed with her sleeves pinned back. “Come and sit on the wall. Edric is at the hall.”',
    { t: 'You\'re out early. The dew is still on the petals. This is the only hour they\'re truly mine.', if: 'phase:Dawn,Morning' },
    { t: 'It\'s late. You shouldn\'t be on the north lane after dark. I don\'t say that for my sake.', if: 'night' },
    { t: '~She smiles at you the moment you reach the gate, and it changes her whole face. “He slept again. Two nights now. I don\'t know what you did. Please keep doing it.”', if: 'duty:elsbeth_prayer' },
    { t: 'Acolyte. I hoped you\'d come. I\'ve cut you a rose. Hide it in your sleeve.', min: 3 },
    { t: '~Her eyes are red. She doesn\'t stop pruning. “I heard about Father Halvard. I\'m so sorry. I\'ve been out here since dawn. I couldn\'t be inside.”', if: 'found' },
    { t: '~She is very pale today, and her hands are not quite steady on the shears. “Edric came home angry last night. Not loud. He\'s never loud. Please be careful.”', if: 'flag:have_rolls' },
    { t: '~She looks up, and quickly down again. “He says you\'ve been visiting soldiers and old women. He said it in a voice I didn\'t like.”', if: 'flag:hilde_captain' },
  ],
  bye: [
    'Go by the back gate. It doesn\'t creak.',
    'Aurel keep you. Quietly, if you can manage it.',
    { t: 'Come again. Please. It\'s so quiet here, most days.', min: 2 },
    { t: 'Be careful, Acolyte. I mean it in more ways than I can say.', if: 'flag:have_rolls' },
  ],
  how: [
    'Well enough. The aphids are winning, but I have a plan.',
    'Tired. Edric had the dream again. I sit up with him until it passes. It always passes.',
    { t: 'Better. He slept. I slept. I\'d forgotten what morning feels like, when you\'ve slept.', if: 'duty:elsbeth_prayer' },
    { t: 'I\'m afraid, if you want the truth. But nobody does want it, usually.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'I want it. Tell me.', r: '~She sets the shears down very carefully. “I\'m afraid of something I\'ve never seen. That\'s the worst kind. Thank you for asking.”', tr: 1 },
        { tone: 'pious', l: 'Aurel lights the way through fear.', r: 'I used to think so. I used to slip into the back of the dawn service just to feel it. Perhaps I\'ll come again.', tr: 1 },
        { tone: 'curious', l: 'Afraid of your husband?', r: '~She flinches. “No. Never of him. For him.” She looks toward the house. “There\'s a difference. There has to be.”', tr: 0 },
        { tone: 'blunt', l: 'Then leave.', r: '~She stares at you as if you had struck her. “He is my husband. You\'re very young.”', tr: -1 },
        { tone: 'joke', l: 'If it\'s the aphids, I can bless them out of town.', r: '~She laughs, and covers her mouth at once, and laughs again behind her hand. “Oh, please. Banish them to the council garden.”', tr: 1 },
      ] } },
  ],
  self: [
    'I grew up in a house with a garden wall too high to see over. I suppose I\'ve made another one. People do.',
    'Edric and I married in the north. He was so certain of everything then. I loved that. I still do, a little.',
    { t: 'I lost a child, the second winter here. A girl. Father Halvard sat with me. He didn\'t say Aurel\'s will. He just sat. I\'ve never forgotten.', min: 3, learn: 'Elsbeth lost a baby girl her second winter in Brambleford; Halvard sat with her.' },
  ],
  workLabel: 'About the roses',
  work: [
    { t: 'Roses want patience, and a little cruelty with the shears. Like most things you love.',
      ask: { opts: [
        { tone: 'kind', l: 'They\'re the loveliest in the valley.', r: '~She colours. “Don\'t let Marta hear you. She thinks her hollyhocks are.” But she looks pleased.', tr: 1 },
        { tone: 'curious', l: 'Cruelty? That seems a hard word for gardening.', r: 'You cut away what\'s dying so the rest can live. It feels cruel. It isn\'t, quite. ~She snips a cane, very precisely.', tr: 0 },
        { tone: 'joke', l: 'Is that how you manage the councilman?', r: '~A startled laugh. “Hush! Oh, you mustn\'t.” She laughs again, quieter. “A little. Yes.”', tr: 1 },
        { tone: 'blunt', l: 'Love shouldn\'t need cruelty.', r: '~She looks at the house a long moment. “No. It shouldn\'t. You\'re lucky to be young enough to think so.”', tr: 0 },
      ] } },
    'These are northern stock. Edric brought the cuttings. They sulked for three years, then bloomed all at once. I\'ve never seen anything so stubborn.',
    { t: 'Nobody else may touch them. It isn\'t vanity. It\'s the one thing in that house that is only mine.', min: 2 },
    { t: 'The red ones I cut for the temple steps, when he\'s away. The white ones I leave. He likes the white ones. He says they don\'t look like anything.', min: 3 },
  ],
  news: [
    'I don\'t hear news, Acolyte. I hear what Edric says at supper, which is not the same thing.',
    { t: 'He\'s been writing letters late. To Highcourt, I think. He burns the drafts in the grate. I smell the wax.', min: 2, learn: 'Voss writes late letters to Highcourt and burns the drafts.' },
    { t: 'The militia came to the house at midnight. Edric went out in his good coat. He came back with mud to the knee and washed his own boots.', if: 'event:raids' },
    { t: 'He asked me last night if I had ever been to the temple. I said no. I don\'t lie well. I think he knew.', if: 'duty:elsbeth_prayer' },
    { t: 'There\'s fever in the lanes. Edric made me promise not to go near it. He was so frightened. He\'s never frightened of anything, but fever...', if: 'event:fever' },
    { t: 'People say you\'ve brought back something from under the hill. A seal. Edric sat in the dark after he heard. He didn\'t light a single lamp.', if: 'seals:1' },
  ],
  halvard: [
    { t: 'He\'ll come back. He has to. Who else will pray for people without asking why?', if: '!found' },
    { t: 'Father Halvard prayed with me once without asking what for. I think he already knew.', min: 0 },
    { t: '~She cuts a single white rose and holds it out to you, stem first. “For his grave. From me. Don\'t tell anyone whose garden it came from.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: '~Take it, and thank her.', r: '~She watches you tuck it into your satchel. “He was kind to me when I hadn\'t earned it. I can at least do this.”', tr: 1 },
        { tone: 'pious', l: 'We\'ll lay it at dawn, at the Rite of First Light.', r: 'At dawn. Yes. ~Her voice catches. “He\'d like that. He always liked first light.”', tr: 1 },
        { tone: 'curious', l: 'Why white? Your husband\'s colour?', r: '~She goes very still. “I didn\'t think. I...” She takes it back, and cuts a red one instead.', tr: 0 },
        { tone: 'blunt', l: 'Your husband says goblins killed him.', r: '~The shears close on nothing. “Edric says a great many things to the town.” She doesn\'t finish.', tr: 0 },
      ] } },
    { t: 'Edric didn\'t sleep at all, the night they found Halvard. Not even the dream. He just sat with his hands open on his knees, looking at them.', if: 'found', min: 3, learn: 'The night Halvard was found, Voss sat up all night staring at his own hands.' },
  ],
  caves: [
    'I don\'t know anything about the caves. Edric forbids talk of them at table.',
    { t: 'He keeps a map in his desk. Old, with four marks drawn on it in red. I dusted it once. He moved it the next day.', min: 3, learn: 'Voss keeps an old map with four red marks locked in his desk.' },
    { t: 'You\'ve been down there? Please be careful. Things that sleep should be let sleep. Edric said that once, in his sleep. Isn\'t that odd?', if: 'junction' },
  ],
  gods: [
    'I keep a little sun-disc in my sewing box. Edric doesn\'t care for the gods. I don\'t think they care much for him either.',
    'Nemora for memory, they say. I\'ve stopped praying to her. Some things I would rather forget.',
    { t: 'Aurel, mostly. I like that he\'s a god of hearths. A hearth is the one fire that\'s meant to be kind.', min: 2,
      ask: { opts: [
        { tone: 'pious', l: 'Come to the dawn service. Sit at the back. Nobody will tell him.', r: 'You make it sound so simple. ~She smiles. “Perhaps I will. Keep a place by the door.”', tr: 1 },
        { tone: 'curious', l: 'Why would fire need to be kind?', r: '~She looks toward the house. “Because some fires aren\'t. Edric dreams of one, every night. I\'ve never asked where it was.”', tr: 0 },
        { tone: 'kind', l: 'Then I\'ll bless your hearth myself.', r: 'Would you? When he\'s at council? ~She looks shyly delighted, like a girl.', tr: 1 },
        { tone: 'blunt', l: 'The gods don\'t care for him because of what he\'s done.', r: '~Her face closes like a fist. “You don\'t know what he\'s done. Neither do I. Please go.”', tr: -1 },
      ] } },
  ],
  gossip: [
    'I don\'t gossip. Nobody gossips with the councilman\'s wife. They stop talking when I come into Marta\'s.',
    { t: 'The armorer, Hilde. She walks past our gate some evenings and doesn\'t look. She doesn\'t look so hard I can feel it.', min: 2 },
    { t: 'Old Berta bowed to me in the square once. Very low. Then she spat on the ground, behind me. I don\'t think it was meant for me.', min: 3 },
    { t: 'Mortimer the clerk is so thin. I bring him soup when Edric isn\'t looking. Don\'t tell either of them.', min: 1 },
  ],
  about: {
    voss: [
      'Edric is a good husband. He has never once raised his voice to me. Not once in twenty years.',
      { t: 'He wakes shouting about fire. Then he holds my hand like a drowning man and says, “It was orders, Elsie, it was orders.” I don\'t know what it means. I\'ve never asked.', min: 2, learn: 'Voss cries out in his sleep: “It was orders.”' },
      { t: 'Whatever he did, he has paid for it every night I\'ve known him. Isn\'t that enough? ~She doesn\'t wait for an answer.', min: 4 },
    ],
    mortimer: [
      'Poor Mortimer. He jumps when the gate latch clicks. I think Edric frightens him. I think Edric frightens everyone except me.',
      { t: 'He refused my husband something. I heard Edric say so, very quietly. I\'ve never been so proud of anyone I barely know.', if: 'flag:mortimer_refused' },
    ],
    hilde: [
      'The armorer is very straight-backed. Like Edric. Old soldiers stand like that, I\'m told.',
      { t: 'She came to our door once, years ago, at night. Edric sent me upstairs. They spoke for an hour, and she never came again.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Did you hear anything they said?', r: '~She hesitates. “Only one thing, at the end. She said, ‘I still smell it.’ And Edric said, ‘So do I. Go home, Marsh.’”', tr: 0, learn: 'Hilde once visited Voss at night; Elsbeth overheard her say “I still smell it.”' },
        { tone: 'kind', l: 'You don\'t have to tell me any more.', r: 'Thank you. ~She lets out a long breath. “I\'m not used to being let off.”', tr: 1 },
        { tone: 'blunt', l: 'You know they served together.', r: '~She grips the shears. “I know nothing of the kind. Please don\'t say things like that by my gate.”', tr: -1 },
        { tone: 'pious', l: 'Some memories need a priest more than a garden wall.', r: 'Then perhaps you should talk to her, not me. I only hold the roses.', tr: 0 },
      ] } },
    ],
    berta: [
      'Old Berta has the best lavender in the valley. I\'d ask her for a cutting, but she looks at me so strangely.',
      { t: 'I think she knew Edric, before. Everyone from the north seems to know Edric. None of them will say from where.', min: 3, if: 'flag:berta_captain' },
    ],
    anselm: [
      'The friar came to tea. Edric was charming. The friar ate two cakes and left looking as though he\'d been robbed.',
    ],
    tamsin: [
      'Tamsin sends me sleeping drops for Edric. He won\'t take them. He says he\'d rather know when the dream is coming.',
    ],
  },
  extra: {
    child: { label: 'The child you saw once', if: 'duty:elsbeth_prayer', seq: true, lines: [
      { t: 'I said you reminded me of a child I saw once. I should tell you, I think. You should have it, whatever it\'s worth.', min: 3 },
      { t: 'Eighteen years ago I was riding south to join Edric. At dawn, on the north road, a man came out of the smoke carrying a baby in his cloak. His hands were burned black.', min: 3 },
      { t: 'I gave him my shawl. Grey wool. He wrapped the baby in it and said, “Aurel keep you,” and walked on. He never looked back. I\'ve never forgotten his face.', min: 4, learn: 'Elsbeth met a priest with burned hands on the north road eighteen years ago and gave him her grey shawl for the baby he carried.' },
      { t: '~She looks at you for a long time. “When Father Halvard prayed with me, the first time, I knew him. I never told Edric. I never told anyone. Did he keep a grey shawl, Acolyte?”', min: 4,
        ask: { opts: [
          { tone: 'kind', l: 'He did. It was my baby blanket. It\'s still in the temple chest.', r: '~She puts her hand over her mouth, and the shears fall into the roses. For a while she can\'t speak at all. “Then something good came out of that morning. Something good.”', tr: 1, learn: 'The grey shawl Halvard kept as the hero\'s baby blanket was Elsbeth\'s.' },
          { tone: 'curious', l: 'What was burning, that morning?', r: '~She shakes her head slowly. “A village, I think. Edric said plague. He said I mustn\'t go near.” She stops. “He was there before me. I never asked why.”', tr: 0 },
          { tone: 'pious', l: 'Aurel brought you both to that road for a reason.', r: 'I\'d like to believe that. I\'d like to believe there was a reason for any of it.', tr: 1 },
          { tone: 'blunt', l: 'You must have known what your husband was doing up there.', r: '~She goes white to the lips. “I knew nothing. I made very sure I knew nothing.” She turns back to the roses. “Please go.”', tr: -1 },
        ] } },
    ] },
  },
};

// Hobb Thatcher: sheep farmer, slow, weathered, everything measured in seasons and Greta's opinions
DIALOGUE.hobb = {
  intro: [
    '~He looks at you a long while before he speaks, the way he might look at a sky before deciding on rain.',
    'Halvard\'s lad. Aye. You\'ve grown. Last I looked you were the height of a ewe.',
  ],
  greet: [
    'Morning. Or what\'s left of it.',
    { t: 'Up with the lambs, are you? Good. Dawn\'s the only honest hour.', if: 'phase:Dawn' },
    { t: '~He is counting fleeces on the cart under his breath, and starts again when you arrive.', if: 'phase:Morning,Midday' },
    { t: 'Getting dark. Wolves\' hour. I\'ll be off to the fold soon.', if: 'night !boss:greymaw' },
    { t: 'Dark, and I\'m not scared of it. First time in a month. That\'s your doing.', if: 'night boss:greymaw' },
    { t: 'Acolyte. Greta asked after you this morning. Asked twice.', min: 2 },
    { t: '{n}. Sit, if you like. The cart doesn\'t mind.', min: 3 },
    { t: 'Market day. Everyone wants wool and nobody wants to pay for it.', if: 'event:caravan' },
    { t: '~He takes his hat off when he sees you, and holds it in both hands, and doesn\'t say anything for a bit.', if: 'found' },
    { t: 'Here\'s the wolf-killer. Wil won\'t stop talking about you.', if: 'boss:greymaw', min: 1 },
  ],
  bye: [
    'Mind the east road after dark.',
    'Aye. Off you go, then.',
    { t: 'Supper\'s at sundown. Greta makes too much. Always has.', min: 2 },
    'Veyra keep you.',
  ],
  how: [
    'Tired. Sheep don\'t keep hours, and wolves keep worse ones.',
    { t: 'Six gone this month. You count them, of a night. You can\'t help it.', if: '!duty:hobb_wolves' },
    { t: 'Better. Three fewer wolves is three fewer wolves. Still the grey one, mind.', if: 'duty:hobb_wolves !boss:greymaw' },
    { t: 'Slept the whole night through. Greta had to wake me. She was right put out about it.', if: 'boss:greymaw' },
    { t: 'Middling. My knees know it\'s going to rain before the sky does.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'Let me look at them. Halvard taught me a little.', r: 'Ah, they\'re just old. Like me. Kind of you, though.', tr: 1 },
        { tone: 'joke', l: 'Rent them out to the market. A weather-knee is worth a fortune.', r: '~A slow grin spreads under the beard. “Greta says the same. Says it\'s the only useful thing about me.”', tr: 1 },
        { tone: 'pious', l: 'Korrum gives the old strength to endure.', r: 'Korrum\'s for miners. But I\'ll take what\'s going.', tr: 0 },
        { tone: 'blunt', l: 'Then sit down more.', r: 'Sheep don\'t sit down. So I don\'t.', tr: 0 },
      ]} },
  ],
  self: [
    'Four generations on the east fields. My great-grandfather cleared the stones by hand. They\'re still in the wall.',
    'I\'m not a quick man. Greta\'s the quick one. I\'m the one who finishes things.',
    { t: 'Wil\'s a better hunter than I ever was a shepherd. I tell him so. Not often.', min: 2 },
    { t: 'I\'m not one for the temple, much. The lambs were. Halvard came out to them every spring, so I came out to him.', min: 2 },
  ],
  workLabel: 'About the sheep',
  work: [
    'Fleece, mutton, and worry. That\'s the three things a sheep gives you.',
    'You shear in early summer, when the grease rises. Too soon and they shiver, too late and the wool felts on their backs.',
    'Garrick buys my old ewes. Calls them tougher than his boots. I call them experienced.',
    { t: 'The tannery\'s buying pelts cheap and selling them dear. I\'d rather sell fleece to the river woman.', if: 'event:tannery' },
    { t: 'Every ewe has a name. Don\'t tell Garrick. He\'d never eat again.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'What\'s the oldest one called?', r: 'Old Mag. Nine summers. Bites. She\'s Greta\'s favourite, which says something about Greta.', tr: 1 },
        { tone: 'joke', l: 'Is there one called Hobb?', r: '~He goes red to the ears. “There might be. The ram. Greta named him.”', tr: 1 },
        { tone: 'kind', l: 'That\'s why the wolves hurt so much.', r: '~He nods, slowly. “Aye. That\'s it exactly. You understand it.”', tr: 1 },
        { tone: 'blunt', l: 'That seems a bad idea, for mutton.', r: 'It is. I do it anyway.', tr: 0 },
      ]} },
  ],
  news: [
    'Wolves again last night. Out by the third wall.',
    { t: 'There\'s a big grey one. Comes back every few nights. Wil calls him Greymaw. Wil names everything.', if: '!boss:greymaw' },
    { t: 'They\'re saying in the market you killed the grey wolf. In the Deep Whisperwood, by the standing stone. Is it true? ...Gods. Thank you.', if: 'boss:greymaw', learn: 'Hobb\'s son Wil named the great grey wolf Greymaw.' },
    { t: 'Fever\'s about. Greta\'s boiling everything, including me.', if: 'event:fever' },
    { t: 'Goblins took a cart on the trade road again. Wool, mostly. What does a goblin want with wool?', if: 'event:raids' },
    { t: 'The East Field\'s for sale. Ask at the Town Hall. Good land, if you don\'t mind wolves.' },
  ],
  halvard: [
    'He blessed my lambs every spring. Never lost one to sickness while he did.',
    { t: 'He\'ll be back. That man walked the whole valley every spring on foot. A cave won\'t beat him.', if: '!found' },
    { t: 'Last time I saw him he was going up the North Road at a fair clip. I waved. He didn\'t see. I thought, he\'s got something on his mind, that one.', if: '!found', min: 2 },
    { t: 'Greta cried when she heard. I didn\'t. I went out and sat with the lambs a while. That\'s the same thing, for me.', if: 'found' },
    { t: 'Who blesses the lambs now? ...You. Aye. It\'ll have to be you. Come in the spring.', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'pious', l: 'I\'ll come at first light, with Aurel\'s words and Veyra\'s too.', r: 'Both? Greta will like that. She never trusted it was enough with just the one.', tr: 1 },
        { tone: 'kind', l: 'I\'ll come. I\'d be honoured.', r: '~He nods, and nods again, and looks away at the hills.', tr: 1 },
        { tone: 'blunt', l: 'I don\'t know if I can do what he did.', r: 'Nobody does, the first time. The lambs won\'t know the difference. I might.', tr: 0 },
      ]} },
  ],
  caves: [
    'Never been. A sheep goes in a hole, you let it go. Same rule for men.',
    { t: 'Wil says the hunters hear drums under the hills some nights. Goblin drums. Deep down.', min: 1 },
    { t: 'Four kingdoms down there, the young ones say. Goblins and rats and snakes and pale things. I say a hole\'s a hole.', if: 'junction' },
    { t: 'You\'ve been past where the stairs split? And come back? Then you\'re braver than anyone in my family, and that includes Greta.', if: 'junction', min: 2 },
    { t: 'They say you\'ve got a goblin king\'s seal. Don\'t show me. I don\'t want to know what it looks like.', if: 'boss:grotsnag' },
  ],
  gods: [
    { t: 'Greta hangs feathers by the door for Veyra. Green Huntress keeps the wolves fair, she says. Lately I wonder.',
      ask: { opts: [
        { tone: 'pious', l: 'The Huntress takes the weak. Maybe she\'s testing the fold.', r: 'Then she can test somebody else\'s. ...Don\'t tell Greta I said that.', tr: 1 },
        { tone: 'curious', l: 'What kind of feathers?', r: 'Jay, mostly. Owl if Wil finds one. Never crow. Greta says crows are for other gods.', tr: 1 },
        { tone: 'joke', l: 'Maybe the wolves just like your sheep better.', r: 'They\'ve got taste, then. Four generations of breeding, that is.', tr: 0 },
      ]} },
    'Aurel for the lambs, Veyra for the woods. A farmer can\'t afford to keep only the one god happy.',
    { t: 'Wil leaves the first cut of every deer on the standing stone. Antlers and all. Says she\'s watching. I believe him.', min: 2 },
    { t: 'You\'ve the Huntress\'s favour now. I can tell. The dogs stopped barking at you.', if: 'god:veyra' },
  ],
  gossip: [
    'Rolf\'s stew is mostly my mutton. Don\'t tell him I told you. He thinks it\'s a secret.',
    { t: 'The councilman says the enchantress might be behind the wolves. He\'s educated. He\'d know.', if: '!flag:mirela_cleared',
      ask: { opts: [
        { tone: 'curious', l: 'Did he say how she\'d do it?', r: '~Hobb scratches his beard. “No. He just said it like it was known. That\'s how educated men say things.”', tr: 0 },
        { tone: 'blunt', l: 'Wolves don\'t need a witch to be hungry.', r: 'That\'s what Greta says. I don\'t like it when you both say it.', tr: 0 },
        { tone: 'kind', l: 'She\'s alone here, Hobb. Like you\'d be, in a strange town.', r: '~He looks at his boots for a long while. “Aye. Maybe.”', tr: 1 },
        { tone: 'pious', l: 'Veyra sends the wolves, not Mirela.', r: 'Then why would the Huntress take my sheep? I\'ve kept her feathers. ...Greta has.', tr: 0 },
      ]} },
    { t: 'Greta says I\'d gone soft in the head listening to the councilman. Bought a rune off the enchantress for the gate. She was nice about it. Nicer than I was.', if: 'flag:mirela_cleared' },
    'Ewan the drover tells wolf stories bigger than mine. His wolves have three heads by the end.',
    { t: 'Bran\'s at the Fox every night. Wil saw him walk into the well-post. Apologized to it.', min: 1 },
    { t: 'There\'s an old woman on the south lane, Berta. Greta takes her eggs. Says Berta knows things about this town nobody else remembers.', min: 3 },
  ],
  about: {
    mirela: [
      { t: 'Came out of the woods the same year the wolves got bold. That\'s all I\'m saying.', if: '!flag:mirela_cleared' },
      { t: 'Some of the lads left crows on her step. I didn\'t stop them. I should have.', if: '!flag:mirela_cleared', min: 2 },
      { t: 'She made my gate rune and wouldn\'t take full price. I don\'t know what to do with that. Greta says say thank you.', if: 'flag:mirela_cleared' },
    ],
    voss: [
      'Councilman Voss. Educated man. Reads Highcourt letters. If he says a thing, there\'s generally a reason.',
      { t: 'Funny. He came out to see my flock, the week the wolves started. Never seen him in boots before. He asked more about the enchantress than the wolves.', min: 3, learn: 'Voss visited Hobb\'s flock when the wolves began, and asked more about Mirela than about the wolves.' },
      { t: 'I believed him because he talks like a book. Greta says books can lie same as people. I\'m starting to think she\'s right.', if: 'flag:mirela_cleared' },
    ],
    garrick: [
      'Garrick and me have haggled over the same ewes for twenty years. We\'ve both won every time.',
      { t: 'He\'d give you the apron off his back. Smells too bad to take it.', min: 1 },
    ],
    ewan: [
      'The drover. Quiet like me, except when he gets going on wolves. Then you can\'t stop him.',
      { t: 'His dogs are better than mine. I\'ve offered him a ram for a pup. He laughed at me. Twice.', min: 2 },
    ],
    greta: [
      'My wife. Cleverer than me, and tells me so, and she\'s right.',
      { t: 'Thirty years married. She still hangs the feathers fresh every new moon. I still pretend I don\'t notice.', min: 2 },
      { t: 'When the wolves took the first ewe I said it was the enchantress. Greta didn\'t speak to me for a day. That\'s how I knew I was wrong, and I still didn\'t listen.', min: 3 },
    ],
    gil: [
      'Gil says the wolves come closest on the still nights. He\'d know. Man\'s up all night talking to his pond.',
    ],
  },
  extra: {
    wil: { label: 'About Wil', if: '!boss:greymaw', seq: true, lines: [
      { t: 'Wil\'s been sharpening his spear every night by the fire. Says he\'s going after the grey one himself.', min: 3 },
      { t: 'He\'s nineteen. I was nineteen once. I\'d have gone too. That\'s what frightens me.', min: 3 },
      { t: 'Greta won\'t say it, so I will. If that wolf takes him, I don\'t know what we\'ll do. You go first, Acolyte. Please. I\'ll never ask you anything else.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'I\'ll go. Keep Wil home until I\'m back.', r: '~He grips your hand in both of his, hard and rough as bark. “I\'ll sit on him if I have to.”', tr: 1 },
          { tone: 'pious', l: 'Veyra hunts with the brave. I\'ll ask her blessing at the stone.', r: 'Greta will put an extra feather up. For you, this time.', tr: 1 },
          { tone: 'blunt', l: 'Wil should learn to wait. Tell him no.', r: 'I have. He\'s my son. He doesn\'t hear no any better than I did.', tr: 0 },
          { tone: 'joke', l: 'Tell him the grey one\'s mine. Hunters\' rules. First come.', r: '~He almost laughs. “I\'ll tell him. He\'ll sulk. Better sulking than dead.”', tr: 1 },
        ]} },
    ] },
  },
};

// Ilse Varga: river-town cloth trader, booming, colourful, haggles for joy, carrying something heavy about Teo
DIALOGUE.ilse = {
  intro: [
    'A customer! No? An acolyte! Even better, acolytes never haggle. Come, feel this wool. Go on. Like a cloud that was raised right.',
  ],
  greet: [
    'Madder red! Woad blue! Weld yellow! And you, looking grey. We can fix that.',
    'There\'s my favourite holy person. Don\'t tell the friar.',
    { t: 'Up already? Good. Early customers get the honest price. Nearly.', if: 'phase:Dawn,Morning' },
    { t: 'Ah, you missed the noon rush. Both of them.', if: 'phase:Midday,Afternoon' },
    { t: 'I\'m packing up. Unless you\'re buying. Are you buying? Ah. Sit anyway.', if: 'night' },
    { t: 'You! My axle hero! I sing about you in the wagon. Badly.', if: 'duty:ilse_axle' },
    { t: '~She looks up from a bolt of cloth and doesn\'t shout for once. Her voice is very quiet. “Hello, {n}.”', if: 'found' },
    { t: 'Caravan\'s in! Real merchants! Competition! I hate it. I love it.', if: 'event:caravan' },
    { t: '{n}! Sit. I\'ve kept the good stool for you.', min: 3 },
  ],
  bye: [
    'Go, go. Come back with money.',
    'Mind how you go! Wear something bright, the wolves respect it.',
    { t: 'Safe roads, friend. Safer than mine were.', min: 2 },
    'If anyone asks, my prices are outrageous. It\'s good for business.',
  ],
  how: [
    'Stranded, broke, and surrounded by people who think beige is a colour. Otherwise wonderful!',
    { t: 'My wagon\'s sitting on a block of wood like a hen on an egg. The egg is not hatching.', if: '!duty:ilse_axle',
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll find you timber. Good timber.', r: 'You would? Oh, you lovely holy thing. Seasoned oak, mind. Not pine. Pine is for coffins and cowards.', tr: 1 },
        { tone: 'joke', l: 'Have you tried sitting on it yourself?', r: '~She roars. “I have! It didn\'t work! I\'m too warm-blooded!”', tr: 1 },
        { tone: 'pious', l: 'Korrum teaches patience.', r: 'Korrum doesn\'t pay my room at the Fox.', tr: -1 },
        { tone: 'curious', l: 'Why not pay the cartwright?', r: 'Ten gold to look! To look! I can look for free. Look. I\'m looking. It\'s broken.', tr: 0 },
      ]} },
    { t: 'Rolling again, nearly! The axle is perfect. I talk to it at night.', if: 'duty:ilse_axle' },
    { t: 'Ach. Honestly? Some nights I can\'t sleep for what I\'ve not said. But you didn\'t ask that. You asked how am I. Fine! Booming!', min: 2, if: '!duty:ilse_teo' },
    { t: 'Lighter. I said it to Odessa. She cried on my best scarf. Worth it.', if: 'duty:ilse_teo' },
  ],
  self: [
    'Born on a barge, raised in a dye-yard, married to the road. Divorced from the road, lately. The road started it.',
    'My mother could tell woad from indigo by the smell on your hands. She said I had the loudest voice on the river. She meant it nicely. Mostly.',
    { t: 'You want to know a secret? I hate yellow. I sell more of it than anything, and I hate it.', min: 2 },
    { t: 'Three seasons on the caravans with the same guards. You get to know a man, sleeping under one wagon. Teo snored in two languages.', min: 2 },
  ],
  workLabel: 'About the cloth trade',
  work: [
    'Finest wool this side of the river. And the other side too, honestly. The other side is very poor.',
    'Madder for red. Woad for blue, and it stinks like a goat\'s armpit in the vat. Weld for yellow. Bah, yellow.',
    { t: 'Since the raids nobody\'s coming up the trade road. I\'m the only cloth for fifty miles. You\'d think that would make me rich. It makes me stuck.', if: 'event:raids' },
    { t: 'The weaver says I undersell. I say she overcharges. We\'re both right, which is the worst kind of argument.', if: '!flag:maren_ilse_peace' },
    { t: 'Maren buys my undyed wool now and weaves it into things I couldn\'t sell to a queen. She takes my wool cheap and charges dear. I\'m so proud of her I could spit.', if: 'flag:maren_ilse_peace' },
    { t: 'Feel the difference. This is river wool, that\'s hill wool. One\'s a song, one\'s a shout.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Which one\'s the song?', r: 'Ha! Trick question. They\'re both mine, so they\'re both songs. You\'d make a terrible merchant.', tr: 1 },
        { tone: 'joke', l: 'They both feel like sheep to me.', r: '~She clutches her chest. “A barbarian! In my stall! Get out. No, stay. Buy something.”', tr: 1 },
        { tone: 'pious', l: 'Aurel loves good honest work.', r: 'Aurel can buy a scarf, then. Half price. Gods get a discount.', tr: 0 },
        { tone: 'blunt', l: 'I\'m not buying.', r: 'Nobody ever is, at first. That\'s the fun.', tr: 0 },
      ]} },
  ],
  news: [
    'Caravans have been scarce since the goblin raids. Two weeks, not a wheel on the trade road.',
    { t: 'The raiders came again! Took a whole cart of salt. Goblins. Salt. What will they do, cure each other?', if: 'event:raids' },
    { t: 'There\'s a fever in town. I\'ve hung red cloth on the stall. Back home that keeps fever off. Here it just sells red cloth.', if: 'event:fever' },
    { t: 'They say you\'ve been to the goblin king\'s hall and come back. Did you see any... did you hear any names down there? Never mind. Never mind.', if: 'boss:grotsnag' },
    { t: 'Odessa said a goblin was overheard talking about a man who reads for their shaman. I didn\'t breathe for a whole minute.', if: 'duty:ilse_teo junction' },
  ],
  halvard: [
    'I only met him twice. He bought a scarf for an old woman and wouldn\'t say who. Grey wool, very soft. Very soft. Not cheap.',
    { t: 'The second time, he asked which road the caravans took to Highcourt, and how long, and whether a letter could go with them. I said if you pay. He paid.', min: 2, learn: 'Halvard asked Ilse whether a letter could travel to Highcourt with the caravans, and paid to send one.' },
    { t: 'People come back from caves. Teo will. Your priest will. I have decided it, and I am very stubborn.', if: '!found' },
    { t: 'I\'m sorry, {n}. I\'m so sorry. I only met him twice and I liked him both times. That\'s rare. I don\'t like most people twice.', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'Thank you. He liked you too, I think.', r: '~She blows her nose on a length of very expensive cloth and doesn\'t care.', tr: 1 },
        { tone: 'curious', l: 'Did that letter ever reach Highcourt?', r: 'The road closed a week after. Ach. I don\'t know. I hope so.', tr: 0 },
        { tone: 'blunt', l: 'I don\'t want to talk about it.', r: 'Then we won\'t. Here, hold this end. We\'ll fold cloth. Folding is good for not talking.', tr: 1 },
        { tone: 'joke', l: 'He\'d have haggled you down on that scarf, if he\'d known how.', r: '~A wet laugh. “He didn\'t even try! A saint. A terrible customer.”', tr: 1 },
      ]} },
  ],
  caves: [
    'I don\'t go in holes. I go on roads. Roads have sky.',
    { t: 'The night of the raid, the goblins didn\'t take the silk. They didn\'t take the silver. They took Teo, and a box of old maps. What kind of goblin wants maps?', min: 2 },
    { t: 'You know what bothers me? The raiders had a purse of new silver. Fresh-minted, a mark on it. Goblins don\'t mint silver. Someone pays them.', min: 3, learn: 'Ilse saw the goblin raiders carrying a purse of fresh-minted silver, as if someone were paying them.',
      ask: { opts: [
        { tone: 'curious', l: 'What was the mark?', r: 'A tower, I think. Or a sword. It was dark, and I was under a wagon, screaming. Not my best night for numismatics.', tr: 1 },
        { tone: 'blunt', l: 'Then someone wanted that caravan hit.', r: '~She stops folding. “Don\'t. Don\'t say it like that. I\'ve been not-thinking it for two months.”', tr: 0 },
        { tone: 'kind', l: 'You\'ve carried a lot, alone. Thank you for telling me.', r: 'Ach. Don\'t be nice, I\'ll cry on the merchandise.', tr: 1 },
        { tone: 'joke', l: 'Maybe goblins are better merchants than you think.', r: 'Hah! If they are, I\'m retiring. I\'ll take up weaving. Maren would love that.', tr: 0 },
      ]} },
    { t: 'Four kingdoms down there, and they all hate each other? Like four cloth merchants at one fair. I know that look exactly.', if: 'junction' },
  ],
  gods: [
    'On the river we have a god for every bend. Back home I\'d pray to six before breakfast. Here you have one for the dawn and you make him do everything.',
    'Nemora\'s blue is the hardest dye to hold. My mother always said that\'s the joke: the goddess of memory, and her colour fades first.',
    { t: 'I lit a lamp at your temple for Teo. Small one. Pippa told me I trimmed it wrong. That child is a terror.', min: 2 },
  ],
  gossip: [
    'Wendell tries to haggle with me every seventh day, for sport. He\'s very bad at it. I let him win sometimes. Don\'t tell him.',
    'Marta brought me bread my first night here. Said I looked like a woman who needed rye. I did!',
    { t: 'The weaver glares at me every morning. Proud woman. I like proud women. I just wish she\'d glare at someone else.', if: '!flag:maren_ilse_peace' },
    { t: 'The councilman bought nothing at my stall, but he asked a lot about where the caravans stopped and who was on them. Customers who ask questions and don\'t buy, I remember.', min: 3 },
    { t: 'Rolf charges me half for the room since the axle. Says stranded folk pay stranded prices. Bless that big knee of his.', min: 1 },
  ],
  about: {
    odessa: [
      'She laughs loud enough for both of us. That\'s saying something.',
      { t: 'I can\'t look at her rings without thinking of the night on the road. I owe her something. More than cloth.', min: 2, if: '!duty:ilse_teo' },
      { t: 'She held my hands so tight at the Fox I couldn\'t feel my fingers for an hour. Hope with a reason, you said. You were right.', if: 'duty:ilse_teo' },
    ],
    teo: [
      'Teo Vell. Caravan guard, terrible singer, always reading something. Old books, carvings on milestones, labels on my dye jars.',
      { t: 'He taught me to read my own ledgers properly. Before that I just shouted numbers at them.', min: 2 },
      { t: 'The night of the raid he stood in front of me. I don\'t know if he meant to. I think about it every night.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'He meant to. That\'s who he was.', r: '~For once she has nothing loud to say. She just nods.', tr: 1 },
          { tone: 'curious', l: 'What happened after?', r: 'They dragged him off and left me under the wagon. One of them was reading a map by torchlight. A goblin. Reading.', tr: 0 },
          { tone: 'pious', l: 'Aurel sees every brave act in the dark.', r: 'Then Aurel can tell me where he is. I\'d be grateful.', tr: 0 },
          { tone: 'blunt', l: 'Have you told Odessa?', r: '~She flinches. “Not yet. Soon. Don\'t push me, {n}.”', tr: 0 },
        ]} },
    ],
    maren: [
      { t: 'The weaver. Sharp as her shuttle. She called my red “the colour of a bad cough”. I\'ve been workshopping a reply for two weeks.', if: '!flag:maren_ilse_peace' },
      { t: 'Maren! My business partner! She hates that word. I use it constantly.', if: 'flag:maren_ilse_peace' },
      { t: 'Her weave is better than anything on the river. If I ever said that to her face, I\'d have to leave town.', min: 2 },
    ],
    wendell: [
      'Wendell haggles like a man apologizing. I adore him.',
      { t: 'He\'s worried about money. A merchant can smell it. He keeps counting the same coppers.', min: 2 },
    ],
    voss: [
      'The man in the black coat. He looks at my cloth like a man pricing a coffin.',
      { t: 'He told me the goblins were filthy creatures who\'d be dealt with. Then he asked whether anyone on our caravan had written anything down. Odd thing to ask.', min: 3 },
    ],
    rolf: [
      'Best stew in the valley. Only stew in the valley. He tells everyone. I tell him to change the joke. He won\'t.',
    ],
  },
  extra: {
    home: { label: 'About home', if: 'met:odessa', seq: true, lines: [
      { t: 'Home is a river town with nine bridges and a smell you\'d never forget. Dye-vats, fish, and wet rope. I miss it like a tooth.', min: 3 },
      { t: 'My mother still runs the dye-yard. Her hands are blue to the wrist and always will be. She writes me letters I can\'t answer because the road\'s shut.', min: 3 },
      { t: 'I told her I\'d bring Teo to meet her. He wanted to see the bridge carvings. Some of them are very old, he said. He wanted to read them.', min: 3 },
      { t: 'When the road opens, {n}, come with me. One trip. I\'ll show you a blue you\'ve never seen. I\'ve sworn it on my mother\'s vats, which is the worst oath I know.', min: 4,
        ask: { opts: [
          { tone: 'kind', l: 'I\'d like that. Truly.', r: 'Then it\'s a promise. I\'ll hold you to it, and I hold very hard.', tr: 1 },
          { tone: 'joke', l: 'Only if you don\'t sell me anything yellow.', r: '~She roars with laughter. Three people across the square turn around. “Deal! No yellow! A blood oath!”', tr: 1 },
          { tone: 'blunt', l: 'I can\'t leave. This town needs me.', r: 'Ach. I know. That\'s why I asked. You\'d have said yes too easily otherwise and I\'d have worried.', tr: 0 },
          { tone: 'pious', l: 'If Aurel opens the road, I\'ll walk it.', r: 'Tell Aurel to hurry. I\'m running out of red.', tr: 0 },
        ]} },
    ] },
  },
};

// Maren Quill: weaver, proud, sharp-tongued, "hmph", frightened underneath and won't say so
DIALOGUE.maren = {
  intro: [
    'You\'re Halvard\'s boy. You\'ve a loose thread on your cuff. No, leave it. You\'ll make it worse.',
  ],
  greet: [
    'Hmph. You again.',
    'If you\'re here to tell me the river woman\'s cloth is pretty, I don\'t want to hear it.',
    { t: 'You\'re up early. So am I. The light\'s best before the town wakes up and starts talking.', if: 'phase:Dawn' },
    { t: 'Can\'t weave by candle. Well. I can. I just won\'t.', if: 'night' },
    { t: 'Acolyte. Mind the wool, it\'s drying.', min: 1 },
    { t: '{n}. Sit. Not there. There.', min: 3 },
    { t: '~She is mending the hem of a black shawl. She doesn\'t look up, but she moves the basket so you can sit.', if: 'found' },
    { t: 'Have you seen my brother today? Not that I\'m asking. He looked thin. Not that I noticed.', if: 'flag:maren_mortimer' },
    { t: 'Ilse\'s been at my stall arguing about blue for an hour. Best hour of my week. Don\'t you dare repeat that.', if: 'flag:maren_ilse_peace' },
  ],
  bye: [
    'Go on, then.',
    'Fix that cuff before someone sees you.',
    { t: 'Come by tomorrow. I might have something to show you. Might not.', min: 3 },
    'Hmph. Mind the step.',
  ],
  how: [
    'How do you think? Idle loom, cold hearth, and a brother who walks the long way round to miss my door.',
    'Perfectly well, thank you. Why does everyone keep asking?',
    { t: 'Busy, for once. Ilse\'s wool, my weave. The Fox wants new curtains. Rolf\'s idea of a curtain is a blanket with ambitions.', if: 'flag:maren_ilse_peace' },
    { t: 'If you must know, I\'m frightened. There. Said it. Thirty years at that loom and I\'m frightened of a cart full of cheap wool. Don\'t you look at me like that.', min: 3,
      ask: { opts: [
        { tone: 'blunt', l: 'You should be. Her prices are half yours.', r: '~She blinks, and then barks a laugh. “Well. At least you don\'t simper. Everyone else simpers.”', tr: 1 },
        { tone: 'kind', l: 'You\'re the best weaver in the valley. People will remember that.', r: 'People remember what\'s cheap. Hmph. But thank you.', tr: 0 },
        { tone: 'pious', l: 'Aurel will provide.', r: 'Aurel has never once provided me with a customer. I\'ve checked.', tr: -1 },
        { tone: 'curious', l: 'What would you weave, if money didn\'t matter?', r: '~She is quiet. Then: “Serpent silk. Just once. With a pattern nobody\'s seen.” She doesn\'t say anything else for a while.', tr: 1 },
      ]} },
  ],
  self: [
    'I\'ve woven in Brambleford thirty years. Half the naming shawls in this valley are mine. The good half.',
    'I live alone and I like it. The loom doesn\'t talk back. Much.',
    { t: 'My mother taught me on a frame loom no bigger than a tray. Mortimer was supposed to learn too. He kept the tally of the threads instead. He was always the counting sort.', min: 2 },
    { t: 'I\'m too proud. Everyone says so. Well, someone in this family has to be. Mortimer certainly isn\'t.', min: 2 },
  ],
  workLabel: 'About weaving',
  work: [
    { t: 'A weave is honest. Every thread shows. You can\'t hide a mistake, you can only start over.',
      ask: { opts: [
        { tone: 'curious', l: 'Will you show me how the loom works?', r: '~She looks at you sideways. “Hands clean? Hm. Sit. Don\'t touch the heddles. That\'s the first lesson and the only one today.”', tr: 1 },
        { tone: 'kind', l: 'That\'s why your cloth is the best in the valley.', r: 'Flattery. I know flattery. ...Go on, then.', tr: 1 },
        { tone: 'joke', l: 'Like people, then. Except people unravel faster.', r: 'Hmph. Some of us are tightly woven, thank you.', tr: 0 },
        { tone: 'blunt', l: 'Ilse\'s cloth looks fine to me.', r: 'Then you\'ve the eyes of a mole. Out.', tr: -1 },
      ]} },
    'Twill for wearing, plain for working, and herringbone for showing off. I show off.',
    { t: 'They say the serpent folk weave silk finer than spider-thread. I\'d give a year to see it. Two.', min: 1 },
    { t: 'Her wool is cheap. My weave is not. Together it\'s something you can sell to Highcourt. Don\'t tell her I said together.', if: 'flag:maren_ilse_peace' },
    { t: 'Fever wraps. Everyone wants them, light wool to sweat it out. I\'ve made twelve this week. Gave four away. Mind your own business.', if: 'event:fever' },
  ],
  news: [
    'The river woman\'s still here. Still selling. Still loud.',
    { t: 'There\'s a caravan in. Real traders. Ilse\'s fit to be tied, and so am I.', if: 'event:caravan' },
    { t: 'The council\'s raised the stall rents again. Mortimer wrote the notice. I could tell by the curly letters.', if: '!flag:maren_mortimer' },
    { t: 'They say you went down past where the cave splits. I don\'t hold with it. Mind you come back up.', if: 'junction' },
    { t: 'Someone told me you\'ve been among the snake folk. Did you see the silk? ...Well? What was it like?', if: 'boss:hierophant', learn: 'Maren longs to see serpent-folk silk.' },
    { t: 'Mortimer stood up to the councilman. My little brother. The whole lane\'s talking. I haven\'t stopped smiling and my face hurts.', if: 'flag:mortimer_refused' },
  ],
  halvard: [
    'He asked me for an altar cloth once. Paid double and said I\'d undercharged. Hmph. I had.',
    { t: 'He came by when Mortimer and I fell out. Didn\'t lecture. Just said a quarrel is a knot, and a knot is easier to pick when it\'s fresh. I didn\'t listen. It isn\'t fresh any more.', min: 2 },
    { t: 'He\'ll be back, and he\'ll want that altar cloth cleaned, and it\'s filthy. Somebody had better see to it.', if: '!found' },
    { t: '~She sets down her shuttle and smooths the cloth on the loom, again and again, though it is already flat. “He was a good man. That\'s all. Don\'t make me say more.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: '~Sit with her, and say nothing.', r: '~After a long while she reaches out and straightens your collar. Her hand stays there a moment.', tr: 1 },
        { tone: 'blunt', l: 'Say it anyway. It helps.', r: 'Does it. ...He was the only one who ever told me I undercharged. Fine. It helps. A little.', tr: 1 },
        { tone: 'pious', l: 'He\'s in Aurel\'s light now.', r: 'He\'d better be. He gave Aurel enough of his.', tr: 0 },
        { tone: 'joke', l: 'He\'d have paid double for your grief, too.', r: '~She glares, and then her mouth twitches. “Get out of my stall. ...No. Stay.”', tr: 0 },
      ]} },
  ],
  caves: [
    'Holes in the ground are for moles and fools. Which are you?',
    { t: 'Four kingdoms down there, and one door between them sealed with four seals? Sounds like my family at harvest supper.', if: 'junction' },
    { t: 'If you find serpent silk down there, you bring me a thread. One thread. I\'ll weave it into the temple cloth.', min: 2 },
    { t: 'You\'ve two seals already? Hmph. You\'re more stubborn than I gave you credit for. That\'s a compliment. Rare one.', if: 'seals:2' },
  ],
  gods: [
    { t: 'My mother wove a blue thread into everything for Nemora. So we\'d remember. I still do. Don\'t look for it, you won\'t find it.',
      ask: { opts: [
        { tone: 'pious', l: 'Nemora keeps what we\'d otherwise lose.', r: 'Exactly so. You\'ve more sense than most priests. Don\'t let it go to your head.', tr: 1 },
        { tone: 'curious', l: 'What are you remembering?', r: 'That\'s rather the point of hiding it, isn\'t it.', tr: 0 },
        { tone: 'joke', l: '~Squint very hard at her shawl.', r: '~She swats your arm. “Stop that. You look like Tamsin.”', tr: 1 },
      ]} },
    'I go to the dawn service when I can be bothered. Which is more often than I let on.',
    { t: 'Aurel is the god of hearth. A hearth needs a hearthrug. That\'s my theology and I\'ll thank you not to improve it.', min: 1 },
  ],
  gossip: [
    'Wendell owes half the market money and smiles at everyone like a man who doesn\'t. Marta knows. She always knows.',
    'Tamsin\'s been holding her jars right up to her nose lately. Squinting. She\'d bite me if I said anything.',
    { t: 'My brother sits in the Town Hall writing what the councilman tells him and then can\'t sleep. I know because his lamp burns till dawn. I can see it from my window. I look. So what.', min: 2 },
    { t: 'Mortimer told me once, before we stopped talking, that the council had him lose some pages. Old pages. He was white as a bleached sheet about it.', min: 3, learn: 'Before they quarrelled, Mortimer told Maren the council had him "lose" some old records.' },
    { t: 'Pippa Tolly brought me a feather for luck. It was a pigeon feather. I kept it.', min: 1 },
  ],
  about: {
    mortimer: [
      'My brother. We don\'t speak. That\'s all there is to say.',
      { t: 'He took the council\'s side over my rent. My own brother, writing my rent up in his tidy letters. I could have spat.', min: 2,
        ask: { opts: [
          { tone: 'blunt', l: 'He had no choice. Voss owns him.', r: '~Her mouth goes thin. “Everyone has a choice. ...Some have worse ones than others. Hmph.”', tr: 1 },
          { tone: 'kind', l: 'You miss him.', r: 'I do not. ...I miss arguing with him. That\'s different.', tr: 1 },
          { tone: 'curious', l: 'What did he say, when it happened?', r: 'He said “I\'m sorry, Maren, it\'s the council\'s figures.” Figures! As if I were a sum.', tr: 0 },
          { tone: 'pious', l: 'Aurel asks us to forgive.', r: 'Aurel never had a brother.', tr: -1 },
        ]} },
      { t: 'He was always frightened. Of dogs, of thunder, of men in good coats. I used to stand in front of him. I stopped. Maybe that\'s on me.', min: 3, if: '!flag:maren_mortimer' },
      { t: 'He came to the door. Stood there for a full minute before he knocked. I let him in. We didn\'t say much. We drank tea. It was enough.', if: 'flag:maren_mortimer' },
    ],
    ilse: [
      { t: 'That river woman. Booming at the whole square like a cow in a bell tower.', if: '!flag:maren_ilse_peace' },
      { t: 'Her red is the colour of a bad cough. I told her so. She hasn\'t thought of a reply. I can see her trying.', if: '!flag:maren_ilse_peace', min: 1 },
      { t: 'She\'s all right. Loud. Honest. Haggles like it\'s a game, which I\'m beginning to understand it is.', if: 'flag:maren_ilse_peace' },
    ],
    voss: [
      'The councilman. He raised the rents, and smiled while he did it. I don\'t trust a man who smiles at sums.',
      { t: 'He keeps my brother on a short leash. I\'ve seen Mortimer come out of the council house with his hands shaking.', min: 2 },
    ],
    tamsin: [
      'Sharp old thing. I like her. We\'ve never once agreed on anything.',
      { t: 'She came round with a tisane when I had the winter chill and stayed to insult my curtains. Best evening I\'d had all year.', min: 2 },
    ],
    marta: [
      'Marta. Devout, floury, and kind to everyone, which is exhausting to be around.',
      { t: 'She buys a shawl from me every winter and gives it away by spring. I pretend not to know.', min: 2 },
    ],
    rolf: [
      'Rolf wants curtains for the Fox. I\'ve seen the Fox. It needs a fire, not curtains.',
    ],
  },
  extra: {
    cloth: { label: 'The cloth for the temple', if: 'met:anselm', seq: true, lines: [
      { t: 'All right. You may as well know. I\'m weaving a new altar cloth for the temple. Gold on white. Sun-discs at the corners. Don\'t you tell a soul.', min: 3 },
      { t: 'I started it the week he left. I thought, he\'ll come back and the old one will be filthy, and he\'ll be embarrassed in front of that friar.', min: 3 },
      { t: 'I\'ve woven a blue thread through the border. For Nemora. For remembering. Nobody will see it unless they know to look.', min: 3, learn: 'Maren is secretly weaving a new altar cloth for the temple, with a hidden blue thread for Nemora.' },
      { t: 'It\'s finished. Near enough. I want you to lay it on the altar, not me. I\'ll stand at the back. If the friar asks who made it, you tell him the town did.', min: 4,
        ask: { opts: [
          { tone: 'kind', l: 'It\'s beautiful, Maren. He would have loved it.', r: '~She sniffs. “Of course it\'s beautiful. I made it.” But her eyes are wet.', tr: 1 },
          { tone: 'blunt', l: 'You should lay it yourself. You earned it.', r: 'Hmph. ...Perhaps. If Mortimer stands with me. Perhaps.', tr: 1 },
          { tone: 'pious', l: 'Aurel will see it every dawn.', r: 'Good. Then someone will notice the herringbone. Nobody else ever does.', tr: 1 },
          { tone: 'joke', l: 'And if I spill wine on it?', r: 'Then I\'ll weave a shroud. Small one. Your size.', tr: 0 },
        ]} },
    ] },
  },
};

// Abel Cooper: steady, quiet craftsman, few words, worn thin by the twins' fever, then wholeheartedly grateful
DIALOGUE.abel = {
  intro: [
    '~He is planing a stave and finishes the stroke before he looks up. His eyes are red-rimmed.',
  ],
  greet: [
    'Acolyte.',
    { t: 'Busy day. Everyone needs barrels.', if: '!duty:abel_twins' },
    { t: '~He looks up from the stave and starts to speak, and then just shakes his head and rubs his face.', if: '!duty:abel_twins', min: 1 },
    { t: 'There he is. Sela says you\'re to be fed. I don\'t argue with Sela.', if: 'duty:abel_twins' },
    { t: 'Lark asked if you were coming today. Tam says you\'re a wizard. I didn\'t correct him.', if: 'duty:abel_twins' },
    { t: 'Up early. Good time for hooping. The iron goes on easier cold.', if: 'phase:Dawn,Morning' },
    { t: 'Evening. I\'m just sweeping. Sit on that one, it\'s finished.', if: 'night' },
    { t: '~He sets down his mallet and stands, and stays standing, the way people do at a graveside.', if: 'found' },
    { t: '{n}. Good to see you.', min: 3 },
  ],
  bye: [
    'Aurel keep you.',
    'Mind the shavings. Slippery.',
    { t: 'Come for supper. Bring nothing. Sela will be insulted if you bring something.', min: 2, if: 'duty:abel_twins' },
    'Right. Back to it.',
  ],
  how: [
    { t: 'Tired. Four nights. I keep the lamp lit and listen to them breathe.', if: '!duty:abel_twins' },
    { t: 'Tam\'s worse at night. Lark\'s worse in the morning. Between them I don\'t sleep at all.', if: '!duty:abel_twins', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'Let me come and sit with them tonight.', r: '~He nods quickly, twice, and can\'t answer for a moment.', tr: 1 },
        { tone: 'pious', l: 'Aurel heals at the hearth. I\'ll pray for them.', r: 'Please. Halvard always said the words. I don\'t know them.', tr: 1 },
        { tone: 'blunt', l: 'You need to sleep, or you\'ll be no good to them.', r: 'I know. Sela says it. Tamsin says it. Doesn\'t make it happen.', tr: 0 },
        { tone: 'joke', l: 'Twins. Twice the fever, twice the trouble.', r: '~He doesn\'t laugh. “Not today, Acolyte.”', tr: -1 },
      ]} },
    { t: 'Slept. Whole night. Woke up and panicked because it was quiet. Then remembered quiet is good now.', if: 'duty:abel_twins' },
    { t: 'Fine. Behind on orders. Don\'t care. They\'re eating porridge like wolves.', if: 'duty:abel_twins' },
    { t: 'Fever\'s going round the lanes again. Sela won\'t let the twins out the door. They\'ve drawn on every wall in the house.', if: 'event:fever' },
  ],
  self: [
    'Not much to tell. I make barrels. I married Sela. We have twins. That\'s a good life, for a quiet man.',
    { t: 'My father was a cooper. His father too. The mark on the lids is the same one. A ring with a line through it. Means made true.',
      ask: { opts: [
        { tone: 'curious', l: 'Will the twins learn the trade?', r: 'If they want. Lark already counts staves. Tam already breaks them.', tr: 1 },
        { tone: 'kind', l: 'It\'s a good mark. Everyone in town trusts it.', r: '~He looks at his hands. “That\'s all a man wants, really.”', tr: 1 },
        { tone: 'joke', l: 'I thought it was a very small sun with a crack in it.', r: '~The corner of his mouth moves. “Don\'t tell the twins. They\'ll want to paint it yellow.”', tr: 1 },
        { tone: 'blunt', l: 'Seems a lot of fuss for a barrel lid.', r: 'It\'s my name on it. Not fuss.', tr: -1 },
      ]} },
    { t: 'I\'m not good with words. Sela does the talking. I do the hooping. It works.', min: 1 },
    { t: 'I wasn\'t always this quiet. Before the twins I sang at the Fox. Badly. Rolf will tell you. Rolf will tell you twice.', min: 3 },
  ],
  workLabel: 'About barrels',
  work: [
    'Oak for ale, ash for flour, chestnut if you\'re stuck. You fire the staves to bend them. Slow fire. Fast fire splits them.',
    'Bran makes my hoops. Won\'t take a penny. I bring him a cask of the Fox\'s ale every month. He won\'t say thank you either. We understand each other.',
    'A barrel is just a box that learned to roll. My father\'s saying. Took me years to understand it wasn\'t a joke.',
    { t: 'Since the raids, nothing\'s coming up the road. I\'m making barrels for flour nobody can ship. Stacking them in the yard like a fort.', if: 'event:raids' },
    { t: 'Odd thing. The councilman ordered six casks, oak, sealed tight, and told me not to burn my mark in the lids. Twenty years, nobody\'s ever asked me that. Paid in silver. New silver.', min: 3, learn: 'Voss ordered six sealed oak casks from Abel with no maker\'s mark on the lids, and paid in new silver.',
      ask: { opts: [
        { tone: 'curious', l: 'Where were they going?', r: 'Didn\'t say. A cart came for them at night. Went up the north lane. Toward the North Road, not the market.', tr: 0 },
        { tone: 'blunt', l: 'That sounds like he\'s hiding something.', r: '~He goes still. “I didn\'t say that. I make barrels. I don\'t ask what goes in them.”', tr: -1 },
        { tone: 'kind', l: 'I won\'t repeat it. Thank you for telling me.', r: 'I just thought you should know. That\'s all. Halvard would\'ve wanted to.', tr: 1 },
        { tone: 'joke', l: 'Maybe he\'s ashamed of his wine.', r: '~A small surprised breath that might be a laugh. “Could be. I\'ve tasted it.”', tr: 1 },
      ]} },
  ],
  news: [
    'Nothing. I\'ve been inside four days. You\'d know more than me.',
    { t: 'Tamsin came by. Said the healroot\'s helping, a little. She\'s run short. She won\'t say how short.', if: '!duty:tamsin_fever !duty:abel_twins' },
    { t: 'The twins are well. That\'s my news. That\'s all my news. I\'ve told everyone. I told the cat.', if: 'duty:abel_twins' },
    { t: 'There\'s a necromancer story going round the Fox. Rolf\'s telling it. It gets a skeleton bigger every night.', if: 'event:necro' },
    { t: 'Heard you went down past the junction. The twins think you fought a dragon. I told them not yet.', if: 'junction' },
    { t: 'They say the councilman\'s men were up the North Road again with a cart. Night time. Hm.', min: 3, if: 'flag:have_rolls' },
  ],
  halvard: [
    'He named both the twins in the same bowl and got water all down his sleeves. Laughed like a boy.',
    { t: 'The morning he left, he stopped here. Asked if a small cask would keep papers dry underground. I said if it\'s made right. He said he\'d come back for one. He didn\'t.', min: 2, learn: 'The morning Halvard left, he asked Abel whether a small cask would keep papers dry underground.' },
    { t: 'I made the cask anyway. It\'s on the shelf. I keep thinking he\'ll walk in and ask for it.', if: '!found', min: 2 },
    { t: 'If he were here, he\'d have been at the twins\' bed every night. I keep wishing. Then I feel bad for wishing it when he\'s down there somewhere.', if: '!found !duty:abel_twins' },
    { t: 'The cask\'s still on the shelf. I don\'t know what to do with it. Take it. Put something of his in it. Something that should stay dry.', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll keep it at the temple. With his lamp.', r: 'Good. That\'s good. He\'d like that.', tr: 1 },
        { tone: 'pious', l: 'We\'ll put his sun-disc in it, and bury it at dawn.', r: '~He nods slowly. “I\'ll come. I\'ll bring the twins. They should know where.”', tr: 1 },
        { tone: 'curious', l: 'What papers do you think he meant?', r: 'Old ones. He had a satchel of them. Held it like it would bite. That\'s all I know.', tr: 0 },
        { tone: 'blunt', l: 'I don\'t want it.', r: 'All right. It\'ll be here. If you change your mind.', tr: 0 },
      ]} },
  ],
  caves: [
    'Never been. Never will. Someone has to make the barrels.',
    { t: 'Bran\'s boy is down there, they say. And the priest. That cave takes good people.', min: 1, if: '!found' },
    { t: 'Four kingdoms under the hill. My grandfather used to say there was a king of goblins who traded peaceful with the valley, long ago. Called it a children\'s story. Maybe it wasn\'t.', min: 2 },
    { t: 'You\'ve all four seals? Then whatever\'s behind that door, it knows your name now. Be careful, {n}. The twins need someone to tell them stories.', if: 'seals:4' },
  ],
  gods: [
    'Sela keeps a sun-disc over the cot. The twins call it the morning man. They wave at it.',
    'I\'m not much for gods. I make a good barrel and keep my word. Halvard said that\'s a prayer too, if you mean it.',
    { t: 'Every night they were sick I lit the hearth lamp and asked Aurel to take me instead. I\'ve never told Sela that. Don\'t you either.', min: 3, if: 'duty:abel_twins' },
  ],
  gossip: [
    'Not much for gossip. Sela hears it all at the well and tells me at supper. I nod.',
    'Bran\'s drinking too much. Everyone knows. Nobody says. I bring him the ale. Maybe I shouldn\'t.',
    { t: 'The Voss house is just up the lane. Some nights you hear him shouting. Bad dreams, Sela says. About fire.', min: 2 },
    { t: 'Mrs Voss brought the twins a bunch of her roses. Nobody\'s allowed to touch those roses. She just held them out at the door. Didn\'t say a word.', min: 2, if: 'duty:abel_twins' },
    { t: 'Tamsin sat up three nights with my two. Then told me off for not paying her. Then wouldn\'t take the money.', min: 1 },
  ],
  about: {
    bran: [
      'Bran makes the best hoops in the valley. Won\'t take a copper for them.',
      { t: 'His boy Dace used to sit on my barrels and talk at me for hours. I\'d just nod. He didn\'t mind. I miss that.', min: 2 },
      { t: 'I\'ve been taking Bran his ale. Thinking now I should take him supper instead.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'Take him supper. And stay to eat it with him.', r: 'Aye. Sela will make a pie. Bran can\'t say no to a pie. Nobody can.', tr: 1 },
          { tone: 'blunt', l: 'Stop bringing the ale, Abel.', r: '~He winces, then nods. “You\'re right. I knew it. Needed someone to say it.”', tr: 1 },
          { tone: 'curious', l: 'Has he said anything about Dace?', r: 'Says he\'s on patrol. Says it too often. Like he\'s practising.', tr: 0 },
        ]} },
    ],
    tamsin: [
      'Tamsin saved my children. Well. Tamsin and you.',
      { t: 'She held a jar very close to her face, mixing their draught. Closer than she used to. I noticed. I didn\'t say.', min: 3 },
    ],
    voss: [
      'Neighbour. Good boots. Pays on time. That\'s all I\'ll say.',
      { t: 'He came by once, to see the casks. Looked at my mark burned in the lids a long while. Said a mark tells people who\'s responsible. Then told me to leave it off his.', min: 3 },
    ],
    elsbeth: [
      'Quiet woman. Sad, I think. Grows roses like they owe her something.',
      { t: 'She sat in the back of Halvard\'s dawn service sometimes, when her husband was away. Thought nobody saw. I saw. I sit in the back too.', min: 2 },
    ],
    rolf: [
      'Rolf buys more barrels than anyone. He says it\'s for ale. It\'s for ale.',
      { t: 'He sent soup every day the twins were sick. Big pot. Didn\'t want paying. Said it was leftover. It was never leftover.', min: 2 },
    ],
    marta: [
      'Marta\'s flour comes in my barrels. She knocks on every one before she buys. Says she can hear a bad stave. She can.',
    ],
  },
  extra: {
    twins: { label: 'About Tam and Lark', if: 'duty:abel_twins', seq: true, lines: [
      { t: 'Tam\'s the loud one. Lark\'s the clever one. Lark lets Tam think he\'s the clever one. She\'ll go far.', min: 2 },
      { t: 'They drew you a picture. It\'s mostly a sun. Sela says it\'s Aurel. Tam says it\'s you. Lark says it\'s both and they should stop arguing.', min: 3 },
      { t: 'I\'m making them each a little barrel. Small as a loaf. Their names burned in the lids, next to my mark. So they know they were made true.', min: 3 },
      { t: 'Sela and I talked. When they\'re older, if they want, we\'d like you to name them properly. At the dawn service. The way Halvard would have.', min: 4,
        ask: { opts: [
          { tone: 'kind', l: 'I\'d be honoured, Abel.', r: '~He just puts his hand on your shoulder, heavy and warm, and leaves it there.', tr: 1 },
          { tone: 'pious', l: 'At first light. Aurel\'s hour.', r: 'Aurel\'s hour. I\'ll tell Sela. She\'ll cry. Then she\'ll start sewing.', tr: 1 },
          { tone: 'joke', l: 'Only if I don\'t have to get water down my sleeves.', r: '~He laughs, a real one, the first you\'ve heard from him. “You will. It\'s tradition now.”', tr: 1 },
          { tone: 'blunt', l: 'I\'m not a priest yet.', r: 'You sat up with them till the fever broke. That\'s priest enough for us.', tr: 0 },
        ]} },
    ] },
  },
};

// Gil Brack, fisherman: few words, long pauses, water and Nemora.
DIALOGUE.gil = {
  intro: [
    '~He looks up from his line, nods once, and looks back at the water.',
    'Mm. Halvard\'s lad. Sit if you like. Don\'t splash.',
  ],
  greet: [
    '~Gil lifts two fingers from the rod. That is a greeting, from Gil.',
    'Mm.',
    { t: 'Mist on the water. Fish like it. So do I.', if: 'phase:Dawn,Morning' },
    { t: '~He is sitting very still in the dark by the pond, the blue stone in his lap.', if: 'night' },
    { t: 'You came back. Good. The bank\'s warmer with two.', min: 2 },
    { t: '~He shifts along the log without a word, to make room for you.', min: 3 },
    { t: 'Liss\'s day went well. I keep thinking of it. Thank you.', if: 'duty:gil_pike', min: 2 },
    { t: '~He is not fishing. The rod lies on the grass. He watches the water as if waiting for it to speak.', if: 'found' },
    { t: 'You smell of deep places. Stone and cold water.', if: 'junction' },
    { t: 'Pond\'s warmer. Lilies are open again. Whatever you did down there, it reached up here.', if: 'boss:hierophant' },
  ],
  bye: [
    'Mm. Go careful.',
    '~He nods, and is already watching the float again.',
    'Still water. Remember.',
    { t: 'Come back. Fish don\'t talk much. I miss it, a bit.', min: 3 },
  ],
  how: [
    'Wet. Patient. Same as yesterday.',
    '~He thinks about it for so long you wonder if he heard. “Fair,” he says at last.',
    { t: 'Some nights are long. This one was shorter.', min: 2, if: 'duty:gil_liss' },
    { t: 'Grieving. Again. Second time in two springs.', if: 'found', min: 1 },
    { t: 'Better than I let on. Worse than I look. Liss used to say I had only one face.', min: 3,
      ask: { opts: [
        { tone: 'kind', l: 'It\'s a good face. Honest.', r: '~The corner of his mouth moves. For Gil, that is a grin.', tr: 1 },
        { tone: 'joke', l: 'One face is plenty. Rolf has three and they\'re all loud.', r: '~A short huff through the nose. “True.”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps what we cannot hold. You can set some of it down.', r: 'Aye. She does. I set it down at night. Pick it up again at dawn.', tr: 1 },
        { tone: 'blunt', l: 'You should talk to people more.', r: '~He looks at you, then at the water. “I\'m talking now.”', tr: 0 },
      ]} },
  ],
  self: [
    'Fished salt water as a boy, down the coast. Came inland for a girl. Stayed for her.',
    '~He turns the blue stone in his fingers. It is worn smooth where his thumb goes.',
    'I don\'t go near the river. People think it\'s grief. It\'s that. And I don\'t trust it any more.',
    { t: 'Liss carved the stone. Not me. I just keep it warm.', min: 3, learn: 'Gil\'s blue stone for Nemora was carved by Liss, not by him.' },
  ],
  workLabel: 'About fishing',
  work: [
    'Trout in the pond. Small this year. Pike in the forest streams, if you\'ve the nerve.',
    'Hold the rod like a sparrow. Too tight and it dies. Too loose and it flies.',
    'Most of fishing is sitting. Most people can\'t sit.',
    { t: 'Rolf\'s stew wants three trout a seventh-day. I\'ve shown you the bend by the reeds. Use it.', min: 1 },
    { t: 'Bait\'s easy. Worms after rain. Bread when there\'s none. Patience always.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'What\'s the biggest you ever caught?', r: 'Sea bass, longer than my arm. Liss said I lied. I did, a bit.', tr: 1 },
        { tone: 'joke', l: 'And if the patience runs out?', r: 'Then you\'re a hunter. Go and see Wil Thatcher.', tr: 0 },
        { tone: 'kind', l: 'Will you teach me properly, one morning?', r: '~He nods. “Dawn. Bring nothing. Don\'t talk.”', tr: 1 },
      ]} },
  ],
  news: [
    'Wolves closer to the east fields. Hear them over the water at night.',
    'Nothing changes at the pond. That\'s why I like it.',
    { t: 'Pond\'s gone cold from below. Cold like a cellar. That\'s not right for summer water.', min: 2 },
    { t: 'Market\'s loud today. I can hear Fenwick from here. Fish can too.', if: 'phase:Midday,Afternoon' },
    { t: 'Fever in town. Keep the water boiled. Pond\'s fine. Wells, I\'m less sure.', if: 'event:fever' },
    { t: 'Saw it again. Under the lilies. Long. Slow. Scales like wet slate.', if: 'duty:gil_liss', min: 2 },
    { t: 'Nothing under the lilies these three nights. Pond\'s warming. I sleep.', if: 'boss:hierophant' },
  ],
  halvard: [
    { t: 'He\'ll be cold, down there. Halvard always felt the cold.', if: '!found' },
    { t: 'He went past here the morning he left. Lantern unlit. Nodded. I nodded back. I should have said something.', if: '!found', min: 1 },
    { t: 'He sat here once, a whole evening, after Liss. Didn\'t say a word. Best talk I ever had.', min: 2 },
    { t: 'Found. Mm. I\'ll say the Still Water words for him tonight. He said them for her.', if: 'found',
      learn: 'Gil means to say Nemora\'s rite for Halvard, as Halvard said it for Liss.' },
    { t: 'Goblin knife, they say. ~He shakes his head slowly. “Water tells you when a thing\'s wrong. So does a man\'s face. Yours does.”', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'blunt', l: 'It wasn\'t goblins. I\'d swear to it.', r: 'Then don\'t swear. Find out. Swearing\'s noise.', tr: 1 },
        { tone: 'kind', l: 'Will you say the words with me?', r: '~He nods. Later, by the water, he does. His voice is rough and very steady.', tr: 1 },
        { tone: 'pious', l: 'Nemora remembers him. That\'s something.', r: 'It\'s everything. She forgets nothing. That\'s why the guilty fear deep water.', tr: 1 },
        { tone: 'joke', l: 'He\'d hate all this fuss.', r: '~A long pause. “He would. He\'d go fishing.”', tr: 0 },
      ]} },
  ],
  caves: [
    'Deep water and deep stone. Same quiet. Different teeth.',
    { t: 'Ewan says there are snake-folk down there who keep still for days. I understand them better than I\'d like.', min: 1 },
    { t: 'The cold in my pond comes from somewhere. Underneath. Water finds a way.', min: 2 },
    { t: 'Four stairs, they tell me. Pick the one that\'s wet. Wet stone goes to Sszarith, I\'d wager.', if: 'junction' },
    { t: 'Seals, you say. Mm. Nemora\'s pale folk keep shrines down there. Be gentle in them. She\'ll know.', if: 'seals:1' },
  ],
  gods: [
    'Nemora. The Still Water. She keeps what\'s gone. That\'s why I talk to her.',
    'Blue stone in the pond, once a moon. Not thrown. Set down. She hates splashing too.',
    { t: 'Sometimes she answers. Rings on the water with no wind and no fish. I don\'t say it in the Fox.', min: 2,
      ask: { opts: [
        { tone: 'pious', l: 'I believe you. Halvard said the gods answer the patient.', r: 'Then I\'m owed a lot of answers.', tr: 1 },
        { tone: 'curious', l: 'What does she say?', r: '~He considers. “Wait,” he says. “Mostly she says wait.”', tr: 1 },
        { tone: 'blunt', l: 'It could just be frogs.', r: '~He looks at you for a long moment. “Could be. You can go.”', tr: -1 },
      ]} },
    { t: 'Aurel\'s for home. Liss was home. So I go to both.', min: 1 },
  ],
  gossip: [
    'Don\'t gossip. ~Pause. “Garrick\'s been learning his letters. Don\'t say I said.”',
    { t: 'Hilde comes down here some nights. Stands where you\'re standing. Never fishes.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'What does she do, then?', r: 'Looks at her hands in the water. Like she\'s waiting for them to come clean.', tr: 1 },
        { tone: 'kind', l: 'Maybe she needs the quiet. Like you.', r: 'Mm. Maybe. I leave her the good log.', tr: 1 },
        { tone: 'blunt', l: 'You should ask her what\'s wrong.', r: 'You ask. You\'re the priest now. I\'m the fisherman.', tr: 0 },
      ]} },
    { t: 'Old Berta and I sit sometimes. She doesn\'t talk either. She came from somewhere that burned. You can tell.', min: 3 },
    { t: 'The councilman never comes near water. Stands back from the edge. Like it might tell on him.', min: 4 },
    { t: 'Ewan brought me a hill trout once, wrapped in moss. Four days\' walk. Didn\'t mention it. Best man in the valley.', min: 1 },
  ],
  about: {
    ewan: [
      'Ewan knows how to be quiet. Rare.',
      { t: 'We sat a whole market day and said nine words. Good day.', min: 2 },
    ],
    garrick: [
      'Loud. Kind. Gives me his scraps for bait and won\'t take a fish back.',
      { t: 'He knew Halvard was teaching him letters. Thinks no one else knew. Whole town knew.', min: 3 },
    ],
    fenwick: [
      'Fenwick talks for both of us. Suits me.',
      { t: 'Under all the noise he keeps a very careful book. Careful men are carrying something.', min: 3 },
    ],
    hilde: [
      '~He watches the water. “She stands here like someone looking for her own face.”',
      { t: 'Whatever she did, she\'s been drowning in it for years. I know drowning.', min: 3 },
    ],
    rolf: [
      'Rolf buys my trout and pays too much. Says it\'s for the stew. It\'s for me.',
    ],
    voss: [
      'Doesn\'t come near water. That\'s all I\'ll say.',
      { t: 'Some men carry fire behind their eyes. Old fire. He has it.', min: 4 },
    ],
    liss: [
      'Liss. ~He doesn\'t say anything else for a while. “She laughed with her whole face.”',
      { t: 'She swam better than me. That\'s the thing. The river took her anyway.', min: 2 },
      { t: 'She sang to the fish. Bad songs. They came anyway.', min: 3 },
    ],
  },
  extra: {
    liss_stone: { label: 'About Liss\'s stone', if: 'duty:gil_liss', seq: true, lines: [
      { t: 'You asked about the stone once. Here. Hold it. ~It is cold, then slowly warm.', min: 3 },
      { t: 'She carved it the spring we married. Said a fisherman needs a goddess who keeps still.', min: 3 },
      { t: 'I went to throw it in the river, after. Couldn\'t. Kept it. Talk to it instead.', min: 3 },
      { t: 'Last night it was warm when I woke. Like a hand. I don\'t know what that means. I\'m not afraid of it.', min: 4,
        learn: 'Gil woke to find Liss\'s blue stone warm in his hand, and was not afraid.',
        ask: { opts: [
          { tone: 'pious', l: 'Nemora keeps her for you. That\'s what it means.', r: '~He closes his hand around the stone. “Aye. I think so too.”', tr: 1 },
          { tone: 'kind', l: 'Then she isn\'t cold.', r: '~He has to look away. “No,” he says thickly. “No, she isn\'t.”', tr: 1 },
          { tone: 'curious', l: 'Has it happened before?', r: 'Once. The night you prayed for her.', tr: 1 },
        ]} },
    ]},
  },
};

// Garrick Sallow, butcher: loud, cheerful, generous, war-cook stories, learning his letters.
DIALOGUE.garrick = {
  intro: [
    'Halvard\'s lad! Come in, come in, mind the hooks. They\'re for pigs, not acolytes.',
    '~He wipes a hand on his apron, considers it, and offers you the other one.',
  ],
  greet: [
    'There he is! Hungry? You look hungry. Everyone looks hungry to me, it\'s the trade.',
    'Mind the floor, it\'s been a busy morning. Don\'t ask busy with what.',
    { t: 'Up with the smoke, are you? Smokehouse fire\'s been going since before the cock thought about it.', if: 'phase:Dawn' },
    { t: 'Market day noise, eh? Hear that? Fenwick could sell a cow to a cow.', if: 'phase:Midday' },
    { t: 'Evening, lad. Shutters half down, but for you I\'ve always got a sausage.', if: 'night' },
    { t: '{n}! My favourite customer who never buys anything!', min: 2 },
    { t: 'Brought me a deer? No? Ah well. I\'m still glad to see you. Mostly.', min: 1 },
    { t: '~He is scrubbing the block harder than it needs, and doesn\'t look up straight away.', if: 'found' },
    { t: 'There\'s a feast on! Every pig in the valley\'s worried and every butcher\'s happy.', if: 'event:feast' },
    { t: 'They say you killed the great grey wolf! Bring me the hide, lad, I\'ll pay you double and hang it over the door.', if: 'boss:greymaw' },
  ],
  bye: [
    'Off you go! Eat something.',
    'Mind the hooks on the way out.',
    'Gods keep you. And if they don\'t, I will. With sausage.',
    { t: 'Come back on a winter night. I\'ll have the slate out. ~He looks embarrassed.', min: 4 },
  ],
  how: [
    'Grand! Well. Busy. Busy is grand.',
    'Back aches, hands crack, smokehouse never sleeps. I\'ve never been happier.',
    { t: 'Rushed off my feet. The tannery\'s taking every hide I\'ve got and asking for more.', if: 'event:tannery' },
    { t: 'Truth? Not good. I keep looking at the door for him on winter nights. It\'s not even winter.', if: 'found', min: 1 },
    { t: 'Honestly? Better for seeing you. Don\'t tell Rolf, he thinks I like him best.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'I\'ll tell Rolf you said his mutton prices are robbery.', r: 'Ha! He already knows. It\'s the foundation of our friendship.', tr: 1 },
        { tone: 'kind', l: 'You\'re a good man, Garrick.', r: '~He goes even redder than usual. “Get away with you. Here, have a sausage.”', tr: 1 },
        { tone: 'pious', l: 'Aurel blesses a full table.', r: 'Aye, and a full belly. I\'ve always thought Aurel likes a man who feeds people.', tr: 1 },
        { tone: 'blunt', l: 'You\'re covered in blood.', r: 'That I am! It\'s a butcher\'s shop, lad, not a bakery. Though Marta\'s got flour in worse places.', tr: 0 },
      ]} },
  ],
  self: [
    'Born in a cart, raised behind a counter. Never learned anything but meat and laughing.',
    'I cooked for the Crown\'s levies, once. Turnip stew for four hundred men. Some of them forgave me.',
    { t: 'The river wars. Wet, cold and slow. I fed the men who came back and buried the ones who didn\'t. Then I came home and opened a shop with a lot of hooks.', min: 2 },
    { t: 'My mother said I\'d never sit still long enough to learn anything. She was right till I was forty.', min: 3 },
  ],
  workLabel: 'About the butchery',
  work: [
    'Deer and boar for the table, wolf for the hides. I pay fair, and I\'ll say so loud enough that people believe it.',
    'Three days in the smokehouse for a ham. Oak and a bit of applewood. Rush it and it tastes like a wet boot.',
    'Never trust a butcher who\'s thin. I\'m very trustworthy.',
    { t: 'Hobb\'s old ewes. Tough as his boots. I tell him so, he tells me my sausage tastes of string, and then we shake on it.', min: 1 },
    { t: 'Every beast I take, I thank. Quiet, before the knife. Nobody taught me. Seemed right.', min: 3,
      ask: { opts: [
        { tone: 'pious', l: 'That\'s an offering, Garrick. Veyra would call it one.', r: 'Would she? ~He looks pleased and a bit shy. “Well. Good. Tell her it\'s for her, then.”', tr: 1, learn: 'Garrick quietly thanks every beast before the knife, though no one taught him to.' },
        { tone: 'kind', l: 'Halvard would have liked that.', r: 'He did. He saw me once. Didn\'t say anything, just put a hand on my shoulder.', tr: 1 },
        { tone: 'joke', l: 'Do they ever answer?', r: 'One pig did, once. I don\'t like to talk about it.', tr: 0 },
        { tone: 'curious', l: 'What do you say to them?', r: 'Thank you, and sorry, and it\'ll be quick. Same as I\'d want.', tr: 1 },
      ]} },
  ],
  news: [
    'Drovers in from the hills on market day. Ewan\'s brought the good cattle and the bad weather.',
    'Rolf wants mutton cheaper. Rolf always wants mutton cheaper. That\'s not news, that\'s the weather.',
    { t: 'Goblin raids on the road again. No caravans, no salt. No salt, no hams. Somebody do something.', if: 'event:raids' },
    { t: 'There\'s a caravan in! Salt, pepper, cloves. I could weep.', if: 'event:caravan' },
    { t: 'Wolf hides are going for good coin. If you\'re in the Whisperwood, bring me what you skin.', min: 1 },
    { t: 'Councilman\'s militia came round for salt pork. Paid in a council chit. I can\'t read it, but I know what it\'s worth: nothing.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Let me see the chit.', r: '~He hands it over. It promises payment “when the council treasury permits.” You read it aloud. He laughs, not happily. “Thought so.”', tr: 1 },
        { tone: 'blunt', l: 'Stop selling to them, then.', r: 'And have the militia stood in my yard every morning? No, lad. I\'ll sell, and I\'ll grumble. Grumbling\'s free.', tr: 0 },
        { tone: 'joke', l: 'Pay them back in council sausage. Mostly air.', r: 'Ha! Council sausage! I\'ll put it on the board. Well. Someone will.', tr: 1 },
      ]} },
  ],
  halvard: [
    { t: 'He\'ll be back. Man owes me a lesson. We stopped at M.', if: '!found' },
    { t: 'He used to sit by the smokehouse with a slate on his knee and make me say my letters. I was useless. He never once laughed. Well. Once.', min: 2 },
    { t: 'If he\'s down there hungry, he\'ll be cross about it. He liked his supper, did Halvard.', if: '!found' },
    { t: 'Gone. ~He sets the cleaver down very carefully. “I don\'t know what comes after M, lad. I was waiting for him to tell me.”', if: 'found' },
    { t: 'They\'re saying goblins. I\'ve skinned a lot of things. A goblin blade tears. They\'re saying it was clean.', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'Who told you it was clean?', r: 'Nobody told me. Ned had a face like curdled milk at the gate, and I asked the right way. With a sausage.', tr: 1 },
        { tone: 'blunt', l: 'Someone killed him and made it look like goblins.', r: '~His big hands close into fists. “Then you find them, and you tell me who.”', tr: 1 },
        { tone: 'kind', l: 'I\'ll keep teaching you. If you want.', r: '~He stares at you. Then he has to turn around and see to something at the back for a while.', tr: 2 },
        { tone: 'pious', l: 'Aurel holds him now.', r: 'Aye. I hope Aurel\'s got a slate.', tr: 1 },
      ]} },
  ],
  caves: [
    'Bats, spiders and rats. I\'ll not pay for any of them, so don\'t bring them.',
    'A goblin knife came through here once, traded from a hunter. Ugly thing. Edge like a saw and the balance of a drunk.',
    { t: 'Fenwick swears there are four kingdoms down there and they all hate each other. Sounds like the market ring.', min: 1 },
    { t: 'Down three levels already? Lad. Take a sausage. Take two. I mean it.', if: 'junction' },
    { t: 'Is it true the goblin king\'s dead? Then who\'ll they sell their hides to? Never mind. Don\'t answer.', if: 'boss:grotsnag' },
  ],
  gods: [
    'Aurel for the hearth, Veyra for the hunt. A butcher keeps in with both.',
    'I nail a sun-disc over the smokehouse door. Fire\'s a good servant and a bad master, and Aurel keeps it a servant.',
    { t: 'I leave the first antlers of the season on Veyra\'s stone. Smells of blood out there. She doesn\'t mind. Neither do I.', min: 2 },
  ],
  gossip: [
    'Fenwick\'s bought a new waistcoat. Mustard again. A man should own one mustard waistcoat in his life, and he owns four.',
    'Rolf haggles like his life depends on it. Mine does, mind. It\'s mutton.',
    { t: 'Bran\'s at the Fox every night. Hilde watches him from across the street like she\'s counting the cups.', min: 2 },
    { t: 'Ewan\'s dogs won\'t go near the North Road. Two of the bravest beasts I know. Makes you think.', min: 2 },
    { t: 'Fenwick goes quiet when the councilman walks past. Fenwick. Quiet. Write that down, someone. Not me.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Why would Fenwick be afraid of Voss?', r: 'Didn\'t say afraid. ~He chops a joint in two, harder than needed. “Said quiet. Ask him yourself, he likes you.”', tr: 1 },
        { tone: 'kind', l: 'Keep an eye on him for me?', r: 'Always do. He\'s noisy, but he\'s our noise.', tr: 1 },
        { tone: 'blunt', l: 'Maybe Fenwick\'s just tired.', r: 'Fenwick\'s never been tired a day in his life. That\'s what worries me.', tr: 0 },
      ]} },
  ],
  about: {
    rolf: [
      'Rolf? Best friend I\'ve got and worst haggler in the valley. Pays me in stew and insults.',
      { t: 'We\'ve argued over the price of a leg of mutton every seventh day for fifteen years. If he ever agrees straight off, I\'ll know he\'s dying.', min: 2 },
    ],
    hobb: [
      'Hobb\'s ewes are tougher than his boots, and I\'ve tasted the boots. Long story.',
      { t: 'He\'s been listening to the councilman about that elf-woman. I told him wolves are wolves. He said I\'m a butcher, what do I know. I know wolves, Hobb.', min: 2 },
    ],
    fenwick: [
      'Sweet man, never stops. You can hear him in my smokehouse with the door shut.',
      { t: 'He sings his sales. Sings! The cows don\'t mind. I mind.', min: 1 },
      { t: 'Under all that patter he\'s scared of something. I\'ve seen soldiers look like that.', min: 4 },
    ],
    ewan: [
      'Ewan\'s culls feed half this town. His dogs eat my scraps and look at me like I\'m Aurel himself.',
      { t: 'Four days down from the hills, four days back. Never complains. I complain if the smokehouse door sticks.', min: 1 },
    ],
    marta: [
      'Marta does a pie with my pork that could stop a war. I\'ve seen wars. It could.',
    ],
    voss: [
      'Councilman doesn\'t buy from me. Has his meat sent from Highcourt. Highcourt! The cheek.',
      { t: 'He came by once with a paper for me to sign. I made my mark, like I always do. Halvard looked at that paper after and went white.', min: 4, learn: 'Voss once had Garrick put his mark on a council paper he couldn\'t read. Halvard went white when he saw it.' },
    ],
  },
  extra: {
    letters: { label: 'About your letters', if: 'met:garrick', seq: true, lines: [
      { t: '~He checks the yard is empty, then pulls a chalk slate out from under the counter. “Don\'t laugh.”', min: 3 },
      { t: 'A, B, C, D... ~He gets to M without a mistake and stops dead, chalk hovering. “That\'s where we stopped.”', min: 3 },
      { t: 'I want to read the sign over my own shop. Folk say it says Sallow\'s Meats. For all I know it says Here Lives a Fool.', min: 3 },
      { t: 'Would you... next is N, is it? Show me N.', min: 4,
        ask: { opts: [
          { tone: 'kind', l: '~Take the chalk and draw an N, slowly, beside his M.', r: '~He copies it three times, tongue between his teeth. “N,” he says. “N.” He sounds like a man who has found money in a coat.', tr: 2, learn: 'You are teaching Garrick his letters, starting where Halvard left off at M.' },
          { tone: 'joke', l: 'N is for nonsense, which is what Fenwick talks.', r: 'Ha! I\'ll never forget it now. N for Fenwick.', tr: 1 },
          { tone: 'pious', l: 'Halvard would be proud you kept going.', r: '~He nods hard and doesn\'t trust himself to speak.', tr: 1 },
        ]} },
      { t: 'Your sign does say Sallow\'s Meats. ~He laughs so loud the hooks rattle. “Not a fool, then! Or not on the sign!”', min: 4 },
    ]},
  },
};

// Fenwick Hale, auctioneer: rapid patter, numbers, the gavel, singing; quietly keeps the book of every sale.
DIALOGUE.fenwick = {
  intro: [
    'Ah! A new face at the ring! Welcome, welcome, step up, step in, mind the dung!',
    '~He taps the gavel against his palm in a little rhythm, as if he can\'t help it.',
  ],
  greet: [
    'Who\'ll give me a greeting? One greeting, do I hear one? Sold, to the acolyte!',
    'Market day is every seventh day, friend, and every other day is just waiting for market day!',
    { t: 'Early, early, early! The ring\'s empty but the heart is full!', if: 'phase:Dawn,Morning' },
    { t: 'Noon! Beasts in the ring! Stand back, nod, don\'t wave!', if: 'phase:Midday' },
    { t: 'Evening already? I\'ve sung myself hoarse. ~His voice cracks, then recovers. “Hoarse but happy.”', if: 'night' },
    { t: '{n}, my dear, my lot of the day, my prize heifer! Metaphorically.', min: 2 },
    { t: 'Prices are booming! Everyone\'s rich! Nobody\'s happy! Wonderful!', if: 'event:boom' },
    { t: '~He is sitting on the ring rail with the gavel in both hands, not tapping it.', if: 'found' },
    { t: 'I hear you\'ve been down three levels. Three! Going once, going twice...', if: 'junction' },
    { t: '~He nods to you, then glances past you, quickly, to see who might be watching. He does that more lately.', min: 4 },
  ],
  bye: [
    'Going, going, gone!',
    'Off you go! Nod, don\'t wave!',
    'Come back seventh day. I\'ll start you low.',
    { t: 'Go well. And, ah. Mind who\'s listening, these days.', min: 4 },
  ],
  how: [
    'Splendid, splendid, never better, and my throat agrees mostly.',
    'Forty gold for a milk cow, eighty for a plough horse, and my health at no price at all. Priceless!',
    { t: 'Truly? Tired. The raids keep the dealers off the road. A ring without dealers is a field with a fence.', if: 'event:raids' },
    { t: 'Not singing today. ~He clears his throat and it doesn\'t help. “Words keep sticking. Like when I was a boy.”', if: 'found' },
    { t: 'Honestly? I sleep with the sale book under my pillow. Old habit. Good habit. Probably.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'Why under your pillow?', r: '~The patter stops. “Because people would like some of the old pages to go away. I\'d like them not to.”', tr: 1 },
        { tone: 'joke', l: 'Must be a lumpy night\'s sleep.', r: 'Ten years of cattle under my ear! I dream in prices. Last night I sold a cloud.', tr: 1 },
        { tone: 'kind', l: 'If you ever want it kept safer, the temple has a strong chest.', r: '~He looks at you a long moment. “I\'ll remember that. I really will.”', tr: 1 },
        { tone: 'blunt', l: 'Sounds like you\'re hiding something.', r: 'Everyone\'s hiding something, friend! I just hide it in alphabetical order. ~His smile doesn\'t move.', tr: -1 },
      ]} },
  ],
  self: [
    'Fenwick Hale, auctioneer, crier, caller of beasts, singer of sums! Ten years at this ring, and my father before me, and his voice was worse.',
    'I can tell you the price of every cow sold in this valley for ten years. Nobody has ever asked. I tell them anyway.',
    'The gavel? Ash wood. My father\'s. I take it to supper. I take it to bed. Don\'t laugh, it\'s a very good gavel.',
    { t: 'When I talk fast, I don\'t stammer. When I sing, I don\'t stammer. When I\'m frightened... well. I talk very fast.', min: 3 },
  ],
  workLabel: 'About the auctions',
  work: [
    'Bid with a nod, not a wave. A wave buys you a pig. I have sold many accidental pigs.',
    'The trick is rhythm. Twenty, twenty, do I hear twenty-two, twenty-two, twenty-two. The ear wants the next number. Give it.',
    'Every sale goes in the book. Who sold, who bought, how much, in what coin. A ring without a book is a brawl.',
    { t: 'Ewan\'s cattle are the best in the valley. I start them high and they still sell. Garrick buys the culls and complains I\'m loud. I am loud. That\'s the job.', min: 1 },
    { t: 'Shall I teach you the call? Go on. Ten, ten, ten, who\'ll give me twelve.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'Ten-ten-ten-who\'ll-give-me-a-sausage!', r: 'Ha! Garrick will, from the yard, and charge you for it! You\'re a natural!', tr: 1 },
        { tone: 'curious', l: 'Do you ever just say the numbers plainly?', r: 'Never. Plain words stick. Sung words fly. Halvard taught me that.', tr: 1 },
        { tone: 'kind', l: '~Try it, badly.', r: '~He winces with real joy. “Terrible! Wonderful! Again!”', tr: 1 },
        { tone: 'pious', l: 'Aurel loves a song at dawn. Maybe at market too.', r: 'Then Aurel and I are on very good terms, friend.', tr: 0 },
      ]} },
  ],
  news: [
    'Hear it here first! Ewan\'s twelve head down from the hills, ten made it. Wolves took two. Price of beef up a copper.',
    'Wendell says the council\'s road tax goes up again. Wendell says a lot. Wendell is usually right.',
    { t: 'Prices booming, coin everywhere. Watch your purse. When the town\'s rich, the pickpockets are richer.', if: 'event:boom' },
    { t: 'Wizards in the Hall! Somebody tried to bid on a cow with a glowing pebble. I took it. Of course I took it.', if: 'event:wizards' },
    { t: 'There\'s a necromancer scare. No one\'s bidding on old horses. Can\'t think why.', if: 'event:necro' },
    { t: 'Council\'s been asking to see my old sale books. For the records, they say. Records of what, I ask. They don\'t say.', min: 3, if: '!flag:mortimer_refused' },
    { t: 'Mortimer the clerk told the councilman no! Mortimer! I nearly sold the town hall in my excitement.', if: 'flag:mortimer_refused' },
  ],
  halvard: [
    { t: 'He\'ll walk back in singing. Badly. He sang very badly, you know. That was rather the point.', if: '!found' },
    { t: 'I was eight. Couldn\'t get past F in my own name. He knelt down and said, then sing it, Fenwick. So I sang it. And it came out whole.', min: 1 },
    { t: 'He used to come to the ring and never bid. Just stood at the rail and smiled at me. Like I\'d done something clever.', if: '!found', min: 2 },
    { t: '~He tries to speak and the word sticks, h, h, h. He stops. Then, very softly, he sings it: “Halvard.”', if: 'found' },
    { t: 'They\'re saying goblins. ~He taps the gavel once on the rail. “I\'ve sold a lot of things, friend. I know when the price doesn\'t match the beast.”', if: 'found', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'What do you think it was, then?', r: 'I think someone very rich would like it to be goblins. That\'s all. That\'s all I think.', tr: 1 },
        { tone: 'kind', l: 'Sing something for him. I\'ll stand with you.', r: '~He sings a dawn hymn, slow, nothing like auction time. Half the ring stops to listen.', tr: 2 },
        { tone: 'blunt', l: 'You know more than you\'re saying.', r: 'Always! Professional habit! ~But his hands are shaking on the gavel.', tr: 0 },
        { tone: 'pious', l: 'Aurel will see the truth come to light.', r: 'Aurel sees everything. Aurel doesn\'t keep books. I do.', tr: 1 },
      ]} },
  ],
  caves: [
    'Four kingdoms down there, they say! Goblins, rats, pale folk and serpents. If they ever had a market, I\'d call it. For a fee.',
    'Goblins raid the road for salt and iron and anyone who can read, they say. Price of a guard\'s gone up twelve copper.',
    { t: 'They say the old reeve over the hills once kept peace between all four. Imagine! Four kingdoms, one gavel.', min: 3 },
    { t: 'A sealed door! Four seals! It\'s an auction, friend. One lot, four bidders, and someone\'s already paid.', if: 'junction', min: 2 },
    { t: 'You\'ve got seals already? Hold them tight. In my experience, when something\'s worth that much, someone else is bidding.', if: 'seals:2',
      ask: { opts: [
        { tone: 'curious', l: 'Who else would be bidding?', r: 'Whoever\'s been paying the bidders, friend. Gold goes down the North Road and comes back as rumours. Follow the gold.', tr: 1 },
        { tone: 'joke', l: 'Want to auction them for me?', r: 'Lot one, a door to the Deep! Do I hear a kingdom? ~He stops. “No. No, I\'d rather not, actually.”', tr: 1 },
        { tone: 'kind', l: 'I\'ll be careful. I promise.', r: 'Good. I\'ve had enough people not come back to my ring this year.', tr: 1 },
      ]} },
  ],
  gods: [
    'Aurel, of course! The dawn is a very good time to sell cows. Cows agree.',
    'Korrum for the herds that come down from the mountain. Ewan makes me put a coin on the cairn by the ring gate. I put two. Showing off.',
    { t: 'I sing the dawn hymn every seventh day before the ring opens. Nobody hears. That\'s not who it\'s for.', min: 2 },
  ],
  gossip: [
    'Wendell owes Rolf four silver from dice. Rolf owes Wendell three silver from different dice. Neither of them knows.',
    'Garrick\'s been seen with a slate! Chalk on his apron! A man of mystery!',
    { t: 'Hilde salutes the councilman sometimes, did you know? Not a wave. A soldier\'s salute. Then she looks like she\'d swallow it back.', min: 2 },
    { t: 'Old Berta came to the ring once. Looked at the councilman across the rail. Went white as milk and left. Didn\'t even look at the sheep.', min: 3 },
    { t: 'Ilse and Maren are haggling now instead of hissing. I\'d charge admission.', if: 'flag:maren_ilse_peace' },
  ],
  about: {
    wendell: [
      'Wendell! My dear rival in gossip. He trades it by the barrel, I trade it by the lot.',
      { t: 'He knows prices, I know prices. Between us we know everything in the valley except where our money goes.', min: 2 },
    ],
    garrick: [
      'Garrick says I\'m loud. I say his smokehouse smells like a burning boot. We\'re very fond of each other.',
      { t: 'He bought my lunch every day the winter my father died. Never said why. I never asked.', min: 3 },
    ],
    ewan: [
      'Best cattle in the valley, quietest man in the ring. I talk enough for both. He lets me.',
      { t: 'He trusts me to get a fair price. Mostly. The \'mostly\' keeps me honest.', min: 2 },
    ],
    voss: [
      'The councilman? Very respectable. Very punctual. Very... ~the gavel taps, once, twice... “respectable.”',
      { t: 'He bought forty acres the year he arrived. Paid cash. Silver. Lovely heavy coin. I remember everything about that sale.', min: 3,
        ask: { opts: [
          { tone: 'curious', l: 'What was special about the coin?', r: '~His face goes perfectly still. “I didn\'t say it was special. Did I say that? I don\'t think I said that.”', tr: 0 },
          { tone: 'kind', l: 'You don\'t have to tell me. Not yet.', r: '~He breathes out. “Thank you. Not yet. Ask me again when I\'m braver. Or you are.”', tr: 1 },
          { tone: 'blunt', l: 'Where did he get that money, Fenwick?', r: 'Going, going, gone! Lovely chat! ~He walks very fast to the other side of the ring.', tr: -1 },
        ]} },
    ],
    hobb: [
      'Hobb sells the slowest ewes in the valley and argues the longest. Admirable stamina.',
    ],
    rolf: [
      'Rolf buys a whole beast for the Fox every month and pretends he\'s doing me a favour. He is, mind.',
    ],
  },
  extra: {
    the_book: { label: 'About the sale book', if: 'met:fenwick', seq: true, lines: [
      { t: '~He shows you a thick ledger, corners soft with handling. “Every sale. Ten years mine, eight more my father\'s. Eighteen years.”', min: 3 },
      { t: 'You learn things from a sale book. Who\'s poor before they say so. Who\'s rich before they should be.', min: 3 },
      { t: 'Some coin comes with a mark on it. A mint mark. Highcourt, the river cities, the Crown. And a few others. Orders that strike their own silver.', min: 4 },
      { t: 'Eighteen years ago a man bought forty acres with silver like that. I wrote down the mark. I\'ve never told anyone. Not even Wendell, and I tell Wendell everything.', min: 4,
        learn: 'Fenwick\'s sale book records that eighteen years ago Edric Voss paid for forty acres in silver bearing a Warden mint mark.',
        ask: { opts: [
          { tone: 'kind', l: 'Then keep it safe. Don\'t tell anyone else yet.', r: '~He nods, and his shoulders drop for the first time since you\'ve known him. “Thank you for not making me sing it.”', tr: 1 },
          { tone: 'curious', l: 'Whose mark was it?', r: '~He writes one word on the edge of the page with his finger, in the dust: WARDENS. Then he rubs it out.', tr: 1 },
          { tone: 'pious', l: 'Truth kept is a lamp kept lit, Halvard said.', r: 'He said it to me too. I\'ve been keeping this lamp very quietly.', tr: 1 },
          { tone: 'blunt', l: 'You should have told someone years ago.', r: 'Told who? The council? ~He laughs, and it cracks in the middle.', tr: -1 },
        ]} },
      { t: 'If you ever need the page, friend, it\'s yours. Bring a witness. And bring Hilde, I think. She\'d know the mark.', min: 4, if: 'flag:hilde_captain' },
    ]},
  },
};

// Ewan Fell, drover: patient, hill-born, plain and dry; the dogs, the cairns, the green lights.
DIALOGUE.ewan = {
  intro: [
    '~Two black dogs look you over before he does. Then he nods. “They say you\'ll do.”',
  ],
  greet: [
    'Morning. Or whatever it is. I go by the light, not the bell.',
    '~One of the dogs comes and leans on your leg. Ewan raises an eyebrow. “She doesn\'t do that.”',
    { t: 'Up early. Good. Cattle don\'t wait for the lazy.', if: 'phase:Dawn' },
    { t: 'Ring\'s busy. Stand by the rail and keep your hands still, or Fenwick will sell you a bull.', if: 'phase:Midday' },
    { t: '~He is sitting by a small fire at the edge of the ring, the dogs curled against his boots.', if: 'night' },
    { t: 'Halvard\'s lad. Come and stand a while. The dogs have missed you, though they\'d never say.', min: 2 },
    { t: '{n}. ~He says your name like he\'s weighing it. It seems to come out heavy enough.', min: 3 },
    { t: '~He takes his hat off when he sees you, and holds it for a moment.', if: 'found' },
    { t: 'They\'re saying the grey wolf\'s dead. Hobb bought me a drink. Hobb. Bought a drink.', if: 'boss:greymaw' },
  ],
  bye: [
    'Go steady.',
    'Mind the road. Mind the dogs. In that order.',
    '~He lifts the crook an inch. The dogs watch you all the way out of the ring.',
    { t: 'Korrum keep your feet under you.', min: 2 },
  ],
  how: [
    'Feet sore. Cattle sold. Dogs fed. That\'s a good day.',
    'Four days down the hill. I\'ll know how I am when I\'ve slept.',
    { t: 'Lost two to wolves on the way. Hate that. You raise them from calves.', min: 1 },
    { t: 'Can\'t settle. Kept thinking on the high road, he walked it at his age. Should have walked him home.', if: 'found' },
    { t: 'Better, now the big grey brute\'s gone. Dogs sleep through the night again.', if: 'boss:greymaw' },
    { t: 'Fair. Honestly fair. ~A rare, slow smile. “Ask me something harder.”', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'What\'s it like up in the high pastures?', r: 'Big. Quiet. Stars so thick you\'d think someone spilled salt. Wind that knows your name.', tr: 1 },
        { tone: 'joke', l: 'Which of the dogs is in charge?', r: 'The old one. She lets me think it\'s me. Kind of her.', tr: 1 },
        { tone: 'pious', l: 'Do you pray, up there?', r: 'Not pray. Stand still and say thanks. Same thing, maybe. Korrum doesn\'t need words.', tr: 1 },
        { tone: 'blunt', l: 'You look half-starved.', r: 'Three-quarters fed. Better than the drover before me.', tr: 0 },
      ]} },
  ],
  self: [
    'Born in a shieling under the peaks. My mother delivered me herself and went back to milking.',
    'Four days down, four days up. Sleep under the sky. Wake with dew on my eyelids. It\'s a life.',
    'The dogs were born in a snowdrift in the same week. Mother dog brought them to the fire one by one. They\'ve not left my side since.',
    { t: 'I married once. She wanted a man who came home at night. Can\'t blame her. No hard feelings, either side.', min: 3 },
  ],
  workLabel: 'About droving',
  work: [
    'Walk slow, let the cattle think they chose it. That\'s droving. Most of life, too.',
    'The dogs do the work. I do the walking and take the credit.',
    'Fenwick gets a fair price. Mostly. I watch his hands, not his mouth. His mouth is too fast for me.',
    { t: 'Garrick takes my culls. Pays well, feeds my dogs the scraps. They\'d follow him home if he whistled.', min: 1 },
    { t: 'Want to try the whistle? Two fingers. Short and short, then long. That brings them round to the left.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: '~Try the whistle.', r: '~Both dogs sit down and look at you with pity. Ewan laughs out loud, which you have never heard before.', tr: 1 },
        { tone: 'joke', l: 'What\'s the whistle for go fetch me a pie?', r: 'There isn\'t one. Believe me, I\'ve tried.', tr: 1 },
        { tone: 'curious', l: 'How long did it take them to learn?', r: 'A season. How long did it take me to learn them? Still learning.', tr: 1 },
      ]} },
  ],
  news: [
    'Twelve head down, ten sold. Wolves had the other two near the Whisperwood edge.',
    'Snow on the peaks early. Hard winter coming, the old ones say. They say it every year. Some years they\'re right.',
    { t: 'Raiders on the trade road. I came down the sheep tracks instead. Two days longer. Kept my cattle.', if: 'event:raids' },
    { t: 'Fever in the town, I hear. I\'ll sleep out by the ring tonight. Hill air\'s cleaner.', if: 'event:fever' },
    { t: 'Big grey wolf\'s been following the herd. Not hunting. Following. Watching. That\'s worse.', if: '!boss:greymaw', min: 1 },
    { t: 'Dogs won\'t go near the old mine holes above the North Road. Hackles up, the pair of them. I don\'t argue with them.', min: 2 },
  ],
  halvard: [
    { t: 'He came up the high pastures every summer to bless the herds. Walked it. Never took a horse.', if: '!found' },
    { t: 'If he\'s down there and alive, he\'s sitting still and waiting. That\'s what you do when you\'re lost. He knew that.', if: '!found', min: 1 },
    { t: 'He sat by my fire one summer night and asked about the mountains. Not the herds. The old roads under them.', min: 3 },
    { t: 'Found. ~He is quiet a long time. “I\'ll leave salt on the high cairn for him. Korrum\'s not his god. He won\'t mind.”', if: 'found',
      ask: { opts: [
        { tone: 'pious', l: 'He honoured all the gods. He\'d be glad.', r: 'Aye. He blessed the cattle in Korrum\'s name and Aurel\'s. Said they weren\'t jealous.', tr: 1 },
        { tone: 'kind', l: 'May I come with you, when you go up?', r: '~He looks at you a long time. “Bring good boots. Four days. I\'ll show you the cairn.”', tr: 2 },
        { tone: 'blunt', l: 'Salt won\'t bring him back.', r: 'No. Nothing will. It\'s not for bringing back. It\'s for saying you noticed.', tr: 0 },
        { tone: 'curious', l: 'Why salt?', r: 'Salt keeps. That\'s the point. You\'re saying: this keeps.', tr: 1 },
      ]} },
  ],
  caves: [
    'Never been down. Rock over my head makes me itch. I like a sky.',
    { t: 'Up the North Road there are old mine adits. Dwarf-work, or older. Dogs hate them.', min: 1 },
    { t: 'Saw lights in those adits last month. Moving. Not lantern-light. Green. ~He watches you to see if you\'ll laugh.', min: 4,
      learn: 'Ewan saw green lights moving in the old mine adits above the North Road. His dogs won\'t go near them.',
      ask: { opts: [
        { tone: 'curious', l: 'Green like what? Fire? Moss?', r: 'Like the light off rotten wood. Cold green. Moving like someone was carrying it, slow.', tr: 1 },
        { tone: 'kind', l: 'I believe you. I\'ll be careful up there.', r: 'Good. Take the dogs\' word over mine. They\'ve better noses and fewer opinions.', tr: 1 },
        { tone: 'joke', l: 'Maybe the goblins have started farming glow-worms.', r: '~He doesn\'t laugh. “Maybe. Wouldn\'t want to meet the farmer.”', tr: 0 },
        { tone: 'pious', l: 'Korrum watches the mountain. He\'ll know.', r: 'Korrum watches. He doesn\'t always say. That\'s why we leave the coins.', tr: 1 },
      ]} },
    { t: 'You\'ve been down to where it splits four ways. Hill folk have a saying. Four roads, one of them home, three of them hungry.', if: 'junction' },
    { t: 'Green lights in the adits stopped. Since you went into the Hollows. I don\'t ask. I\'m glad.', if: 'boss:matriarch' },
  ],
  gods: [
    'Korrum. Stone Father. Salt and a coin on the cairn, every time you pass. Valley folk forget.',
    'You don\'t ask Korrum for things. You thank him for still standing. He likes that. So would I.',
    { t: 'Veyra\'s not mine, but I nod to her at the forest edge. Polite to strangers. That\'s the hill way.', min: 1 },
    { t: 'Since you\'ve had the Stone Father\'s favour the cairns feel warmer. Daft, I know. Dogs think so too.', if: 'god:korrum' },
  ],
  gossip: [
    'Don\'t hold with gossip. ~Pause. “Hobb\'s ewes are fatter than he lets on.”',
    'Fenwick says three words where one would do, then charges for the other two.',
    { t: 'Gil down at the pond. Only man in the valley who knows how to be quiet. We\'ve shared a log for a whole afternoon. Grand.', min: 1 },
    { t: 'Councilman\'s land runs right up to the North Road. Forty acres of it. Bought the year he came. Good grazing, and he grazes nothing on it.', min: 3,
      ask: { opts: [
        { tone: 'curious', l: 'What does he use it for?', r: 'Nothing I can see. Riders cross it at night sometimes. Toward the North Road. Dogs don\'t like them either.', tr: 1, learn: 'Ewan has seen riders cross Voss\'s forty acres at night, heading toward the North Road.' },
        { tone: 'blunt', l: 'Maybe he just likes owning things.', r: 'Some men do. Most of them graze something.', tr: 0 },
        { tone: 'joke', l: 'Maybe he\'s growing boots.', r: '~A dry snort. “He\'d polish them before they sprouted.”', tr: 1 },
      ]} },
    { t: 'Hobb tells me the elf-woman isn\'t cursing his sheep after all. Took him a while. Wolves were always wolves.', if: 'flag:mirela_cleared' },
  ],
  about: {
    gil: [
      'Gil? Knows how to be quiet. That\'s the best thing I can say of anyone.',
      { t: 'I brought him a hill trout once. Wrapped in moss. He nodded. That nod was worth the four days.', min: 2 },
    ],
    hobb: [
      'Hobb and I swap wolf stories. His get bigger every week. Mine get truer.',
      { t: 'He\'s a good man who believes the last educated fellow who spoke to him. Wish that fellow had been someone else.', min: 2 },
    ],
    garrick: [
      'Garrick\'s a big laugh with a soft middle. Feeds my dogs like they\'re his own.',
      { t: 'He thanks the beasts before the knife. Thinks nobody sees. Hill folk do the same. I like him for it.', min: 3 },
    ],
    fenwick: [
      'Fenwick\'s honest, mostly. I trust his book more than his mouth.',
      { t: 'Seen him stop dead mid-call when the councilman walks by the ring. Fenwick doesn\'t stop for fire.', min: 3 },
    ],
    voss: [
      'Councilman. Polished boots on a dung floor. Tells you all you need to know.',
      { t: 'The dogs growl at him. They don\'t growl at the butcher, and he smells of blood. Think on that.', min: 3 },
    ],
  },
  extra: {
    cairn: { label: 'About the cairns', if: 'met:ewan', seq: true, lines: [
      { t: 'Every pass in the hills has a cairn. Salt and a coin. You add a stone, you take nothing.', min: 3 },
      { t: 'There\'s one by the ring gate. My grandfather built it. Valley folk walk past it like it\'s a wall.', min: 3 },
      { t: 'Here. ~He presses a pinch of coarse salt into your palm. “Next time you pass a cairn. Don\'t make a show of it.”', min: 3,
        ask: { opts: [
          { tone: 'pious', l: '~Set the salt on the cairn by the gate, and a coin beside it.', r: '~He watches, says nothing, and then puts his hand on your shoulder for a moment. The dogs wag.', tr: 2, learn: 'Ewan taught you the hill custom: salt and a coin on Korrum\'s cairns, and a stone added, never taken.' },
          { tone: 'curious', l: 'What happens if you take a stone?', r: 'Then the mountain takes one back. Usually from your herd. Sometimes from you.', tr: 1 },
          { tone: 'joke', l: 'Can I eat it instead?', r: '~The old dog sneezes, which is her laugh. “You can. Korrum will remember.”', tr: 0 },
        ]} },
      { t: 'You did it right. Most valley folk throw the coin. You set it down. Someone taught you manners.', min: 4 },
    ]},
  },
};

// ---------------- how they take a gift ({item} is what you gave) ----------------
// Brother Anselm
GIFT_LINES.anselm = {
  love: [
    '~He opens the {item} as if it might bruise. “Oh. Oh, you shouldn\'t have. I\'m going to read this instead of writing my report, you know.”',
    'A {item}! The cathedral library has nine hundred of these and not one I\'m allowed to take to bed.',
    '~He runs an inky thumb down the edge. “Halvard gave me a book once, at the synod. I still have it. I\'ll keep this beside it.”',
    'You\'ve found the one weakness of a friar. Don\'t tell Highcourt how easily I\'m bought.',
  ],
  like: [
    '~He weighs the {item} in his hand like a farmer at market. “Good. Honest. My father would have approved.”',
    'Thank you. I live on bread and the inn\'s stew; this is a kindness.',
    'I shall note this in my tally under “parish, generous.”',
  ],
  neutral: [
    '~He looks at the {item}, then at you, then writes something down. “Thank you. I\'m sure it\'s useful to someone.”',
    'That\'s very thoughtful. I\'ll find a home for it. Perhaps the poor box.',
    'Ah. A {item}. They didn\'t teach us about these at the seminary.',
  ],
  dislike: [
    '~He holds the {item} at arm\'s length. “I took vows of poverty, you understand. And of not touching things like this.”',
    'That\'s... generous. Truly. I\'ll give it to someone who can bear to look at it.',
    '~He smiles the smile of a man who has sat through a great many bad sermons. “Thank you, Acolyte.”',
  ],
  special: {
    wheat: '~He rubs an ear of wheat between his palms without thinking, blows the chaff, and tastes a grain. “Dry summer. Good kernel, though.” He looks embarrassed. “Farmer\'s son.”',
    oil: 'Lamp oil. For the temple lamps, I assume? Then I\'ll see it goes on the altar, not my reading candle. Probably.',
    goldcarp: '~He stares at the golden carp. “Do you know what this would fetch in Highcourt? Take it back. No, wait. Sell it, and give the coin to the twins\' mother.”',
  },
};

// Bran Hollin
GIFT_LINES.bran = {
  love: [
    '~He turns the {item} over in a black fist and grunts, which from Bran is a speech.',
    'Now that\'s worth a fire. Good lad.',
    '~He bites the {item}. Nobody knows why. “Aye. That\'ll work up lovely.”',
    'Where\'d you dig this? Never mind. Don\'t tell Hilde. She\'ll want half.',
  ],
  like: [
    'Useful. Ta.',
    '~He sets the {item} on the bench by the anvil and nods once. That\'s thanks.',
    'Better than flowers. People keep bringing me flowers.',
  ],
  neutral: [
    'What am I meant to do with that?',
    '~He looks at the {item} for a long moment. “I\'ll put it somewhere.”',
    'Hm. Leave it by the door.',
  ],
  dislike: [
    'Lad. I\'m a blacksmith.',
    '~He takes the {item} between finger and thumb as if it might stain the soot. “Right. Ta.”',
    'Give that to someone with a window box.',
  ],
  special: {
    moonpetal: '~He goes very still. “Ada\'s flowers. They grow on her grave, up the hill.” He takes it anyway, and puts it in the window by her little shrine, and doesn\'t say anything else.',
    mithril: '~He holds the mithril up to the forge light and the blue runs through it like water. “Thirty years at the anvil and I\'ve worked this twice.” His voice goes rough. “Thank you, lad.”',
    stone: 'Good grey mountain stone. Ada\'s shrine wants a new base. ...You knew that, didn\'t you.',
  },
};

// Hilde Marsh
GIFT_LINES.hilde = {
  love: [
    '~She runs a thumb over the {item}, testing the grain. “Clean. Thick. Somebody taught you right.”',
    'Now this I can use. My apprentice never brought me anything this good, and he was paid to.',
    '~She almost smiles. “You\'ve a good eye for leather, Acolyte. Don\'t tell Bran I said so; he\'ll think it\'s catching.”',
  ],
  like: [
    'Practical. Good.',
    '~She checks the {item} the way she checks a doorway, then sets it on the bench. “Thank you.”',
    'That\'ll get used. Nothing in this shop sits idle.',
  ],
  neutral: [
    'Hm. I\'ll find a use.',
    '~She studies the {item}. “You carry odd things, Acolyte.”',
    'Thank you. I think.',
  ],
  dislike: [
    'Pretty. I don\'t wear pretty.',
    '~She sets the {item} face down on the counter. “Keep your coin for armour.”',
    'I\'ve no use for that. But thank you for thinking of me.',
  ],
  special: {
    torch: '~She looks at the torch in your hand and doesn\'t take it. For a moment her face is somewhere else entirely. “Put that out. Please.”',
    pelt: 'Wolf. Proper winter pelt. ...That big grey one, it\'s still out there. Mind yourself.',
    iron: '~She weighs the ore. “Bran\'s the one for this.” A pause. “I could take it to him. If you like. No reason.”',
  },
};

// Tamsin Reed
GIFT_LINES.tamsin = {
  love: [
    '~She lifts the {item} to her nose before she looks at it, and breathes in. “Fresh. Picked this morning. You\'re learning.”',
    'Now that\'s a gift. Not a pretty one. A useful one. The best kind.',
    '~She tucks the {item} into a jar before you can change your mind. “Halvard brought me these, once. Stubborn goat never picked the roots right.”',
    'Good. Good. Somebody in this town will live a week longer because of this, and they\'ll never know your name.',
  ],
  like: [
    'That\'ll go in a tincture. Thank you, child.',
    '~She sniffs it. “Hm. Not bad.” From Tamsin, that\'s a medal.',
    'Leave it on the shelf. No, the other shelf. Not by the redcap.',
  ],
  neutral: [
    'And what am I supposed to boil that in?',
    '~She squints at the {item}, closer than she should need to. “Well. Thank you.”',
    'I\'ll find a use. I always do.',
  ],
  dislike: [
    'Get that off my counter. I\'ve just scrubbed it.',
    '~She wrinkles her nose. “If you\'re going to bring me things that bleed, bring me the bandages too.”',
    'I spend my days patching up what that sort of thing does. Take it to Bran, or Garrick.',
  ],
  special: {
    redcap: '~She takes the redcap and lowers her voice. “Don\'t ask what this is for. And don\'t eat one. And if you have eaten one, sit down and don\'t touch anything sharp.”',
    healroot: 'Healroot! The Cooper twins nearly cost me my last bundle. Bless you, as Halvard would say. Don\'t make me say it twice.',
    moonpetal: '~She holds the moonpetal very close, then closes her eyes and smells it instead. “Moonpetal. I\'d know it in the dark.” Her mouth twists. “Just as well.”',
  },
};

// Mirela
GIFT_LINES.mirela = {
  love: [
    '~She cups the {item} in both hands and it hums, very faintly, against her palms. “You found this for me?”',
    'This is... thank you. People don\'t give me things. They leave things on my step, but that\'s different.',
    '~She holds the {item} to the window light, and for once forgets to keep her hair covered. “Beautiful. It remembers where it came from.”',
  ],
  like: [
    'This will take a rune well. Thank you.',
    '~She smiles, small and surprised. “That\'s kind of you, Acolyte.”',
    'My mother kept things like this on a string by the door. I\'d forgotten.',
  ],
  neutral: [
    '~She turns the {item} over. “I\'ll find a use for it. Everything has one.”',
    'Thank you. It\'s the thought that carves the rune.',
    'Hm. Not for enchanting, I think. But thank you.',
  ],
  dislike: [
    '~She draws her hands back. “Iron and blood muddy the runes. Could you... leave it outside?”',
    'Oh. I don\'t... thank you. I\'ll give it to someone who will use it.',
    '~She looks at it with careful politeness, the way she looks at people who cross the street. “That\'s kind.”',
  ],
  special: {
    feather: '~She lays the feather across her palm. “Not a crow\'s.” She breathes out. “My mother hung these for the Green Lady. Thank you for not bringing me a black one.”',
    moonpetal: 'Moonpetal grows where the Whisperwood keeps its oldest secrets. My mother used to braid it in my hair.',
    soulgem: '~The gem goes dark and bright in her hands, slow as breathing. She says something in a language you don\'t know, then, in yours: “You should not give this away so lightly. But I will treasure it.”',
  },
};

// Aldous Grey
GIFT_LINES.aldous = {
  love: [
    '~He pushes his spectacles down from his hair, finds them already on his nose, and peers at the {item}. “Oh, my. Oh, my word.”',
    'Frightfully kind! I shall read it tonight. Or tomorrow. Or I shall lose it and find it next spring, which is its own kind of joy.',
    'A {item}! Halvard used to bring me things like this. Usually after he\'d beaten me at chess. Consolation, he called it.',
    '~He clutches the {item} to his chest. “You must let me lend you something in return. No, wait, I\'ve stopped lending things. Long story.”',
  ],
  like: [
    'How thoughtful. Now, where shall I put it so I can\'t find it later?',
    '~He tucks the {item} somewhere in his robes, where it joins a great many other things. “Thank you, dear boy.”',
    'Ah, useful! Probably. Most things are, if you wait long enough.',
  ],
  neutral: [
    'Hm? Oh, for me? How nice. What is it?',
    '~He looks at the {item} for a while. “Reminds me of something. Can\'t think what. Thank you.”',
    'Very kind. I\'ll put it with the other things.',
  ],
  dislike: [
    '~He blinks at the {item}. “Ah. Is it... alive? Was it ever? I\'d rather not know.”',
    'Oh dear. I\'m eighty, you know. My stomach is mostly theoretical.',
    'That\'s very kind, very kind. Perhaps Garrick would like it. Garrick likes everything.',
  ],
  special: {
    feather: 'A quill! Grey, about so long! Is it mine? It isn\'t mine. It\'s better than mine. I shall pretend it\'s mine.',
    soulgem: '~He goes quiet and very clear-eyed, as if the vagueness was a coat he\'s taken off. “Do you know what this is? Someone\'s memory, set in stone.” Then he blinks. “Now, where are my spectacles.”',
    apple: '~He polishes the apple on his sleeve. “Halvard and I ate these at the chessboard. He always took the bigger one.” A pause. “He always let me win the apple.”',
  },
};

// Wendell Tolly
GIFT_LINES.wendell = {
  love: [
    '~His eyes go round as coins. “For me? For free? What\'s the catch? There\'s no catch? Marta! Marta, come and see!”',
    'Do you know what this is worth? I do. I know to the copper. Thank you, lad. Thank you.',
    '~He wraps the {item} in a cloth and tucks it under the counter, then takes it out to look at it again. “Just checking.”',
  ],
  like: [
    'Oh, I can sell this! I mean, I\'ll treasure it. And then sell it.',
    'Very handy. Shelf by the rope. Thank you, lad.',
    '~He nods approvingly. “Practical. A man after my own heart.”',
  ],
  neutral: [
    'Ah. Well. Someone will buy it. Eventually. At a discount.',
    '~He squints at the {item}. “Thank you. I\'ll... mark it at a copper.”',
    'That\'s kind. Pippa will probably want it.',
  ],
  dislike: [
    '~He holds the {item} out over the gutter. “Lad, I sell to people. People don\'t buy that.”',
    'That smells like something I\'d have to pay someone to take away.',
    'Thank you. I\'ll put it round the back. Far round the back.',
  ],
  special: {
    oil: '~He looks at the flask and laughs, and his eyes go wet. “Halvard owed me eleven pennies for lamp oil. Now you\'ve paid me back with interest.” He rubs a line off his slate.',
    goldcarp: 'A golden carp! Do you know what that fetches? Don\'t tell Marta. I mean, do tell Marta. No. Let me tell Marta.',
    silver: '~He holds the silver ore up and his face does sums. “That\'s a month of road tax.” Then he catches himself. “Hypothetically.”',
  },
};

// Marta Tolly
GIFT_LINES.marta = {
  love: [
    '~She clasps her floury hands. “Aurel bless you, child. This is bread waiting to happen.”',
    'Oh, perfect! Tomorrow\'s loaves will have your name in them. Not literally. Well. I could.',
    '~She holds the {item} up to the light like an offering. “Good things from good hands. Halvard always said so.”',
    'You\'ve been keeping a farm? And you bring me the best of it? Come here.',
  ],
  like: [
    'How kind! That\'ll go in something sweet.',
    '~She smiles and tucks the {item} into her apron. “Thank you, dear.”',
    'Lovely. I\'ll put it by for the seventh-day bake.',
  ],
  neutral: [
    'Oh. Thank you. I\'m sure Wendell can find a use for it.',
    '~She looks at the {item} doubtfully. “Is it for baking?” It isn\'t.',
    'That\'s very thoughtful, dear.',
  ],
  dislike: [
    '~She steps back from the {item}. “Not near the bread, love. Please.”',
    'Aurel keep us. Where have you been, to come home with that?',
    'I\'ll... take it. And then I\'ll wash my hands. Twice.',
  ],
  special: {
    wheat: '~She rubs the grains in her palm and breathes in. “Good wheat. Halvard blessed the first sheaf every summer. I\'ll bless this one myself, and make a loaf for the altar.”',
    egg: 'Eggs from your own hens! Now I know you\'re eating properly. Well, I don\'t. But I hope.',
    redcap: '~She snatches the redcap from you and throws it in the fire. “Not in my house. Not near Pippa. What would your Father Halvard say?”',
  },
};

// Pippa Tolly
GIFT_LINES.pippa = {
  love: [
    'For ME? Really? Really really? Thank you thank you thank you!',
    '~She hugs the {item}, then hugs you, then hugs the {item} again. “I\'m going to keep it forever. Or until lunch.”',
    'This is the best day of my whole life. Except the day I lit all the lamps without falling off the stool.',
    '~She is already running to show someone. “MUM! LOOK WHAT I GOT!”',
  ],
  like: [
    'Ooh! Thank you! Can I keep it? I\'m keeping it.',
    '~She inspects the {item} with enormous seriousness. “It\'s very good. I approve.”',
    'Thanks! I\'ll put it in my box of treasures. It\'s got a snail shell and a bit of Father Halvard\'s candle.',
  ],
  neutral: [
    'Um. Thank you? What does it do?',
    '~She turns the {item} over. “Is it magic? It\'s not magic, is it.”',
    'Thanks! I\'ll give it to Dad. He likes stuff.',
  ],
  dislike: [
    'Eww. EWWW. Is it supposed to smell like that?',
    '~She holds the {item} as far away as her arm will go. “Thank you. I think. I\'m going to give it to the dog.”',
    'Mum says I have to say thank you even when it\'s yucky. Thank you.',
  ],
  special: {
    feather: '~She gasps. “A feather for Veyra! For the door! Mum won\'t let me hang one, she says we\'re Aurel\'s house.” She lowers her voice. “I\'m going to hang it in the temple. Aurel won\'t mind. They\'re friends.”',
    torch: 'A torch! For the lamps! I can melt the pitch down. Probably. I\'ll be very careful. Probably.',
    goldcarp: '~She holds the golden carp up like a crown. “IT\'S GOLD. Is it a god? Is it a fish god? Can I keep it in the trough?”',
    apple: 'An apple! Did it come from your trees? I\'m going to plant the seeds and then I\'ll have trees too. And then I\'ll give YOU apples.',
  },
};

// Odessa Vell
GIFT_LINES.odessa = {
  love: [
    '~Her laugh rings across the hall. “Oh, you darling! Give me your hand, I must see who taught you such taste.”',
    'Now this, this is a gift with a story in it. I can feel it.',
    '~She slips the {item} onto her palm and sighs. “In the river cities, a gift like this means you\'re family. I\'ll pretend you knew that.”',
  ],
  like: [
    'Pretty! I\'ll set it in something nice.',
    '~She holds the {item} to the light. “Not bad. Not bad at all, Acolyte.”',
    'You have an eye, you know. Teo never did. He brought me river rocks.',
  ],
  neutral: [
    '~She turns the {item} over with ringed fingers. “Hm. Every gift has a story. I don\'t know this one yet.”',
    'Thank you, love. I\'ll find it a home.',
    'Interesting. Not my sort of thing. But interesting.',
  ],
  dislike: [
    '~She pulls her violet scarf over her nose. “Darling. No.”',
    'Is this what they give for courting up here? Gods help the valley.',
    'I\'ll take it, because you\'re sweet. But it\'s going straight to the butcher.',
  ],
  special: {
    silver: '~She weighs the silver ore and her eyes go soft. “Teo always said silver was for the wise. I\'ll make something from this for when he comes home.”',
    soulgem: '~The soul gem flickers in her palm and her laugh dies away. “There\'s someone in here. Remembering.” She closes her fingers over it. “Thank you. I think.”',
    bone: '~She stares at the bone. “Please tell me that\'s not from below. Please tell me it\'s a sheep.”',
  },
};

// Rolf Barrow
GIFT_LINES.rolf = {
  love: [
    'Ha! Now you\'re talking my language. Stew tonight, and your bowl\'s first.',
    '~He slaps the {item} on the bar like a winning hand. “Look at that! Look at it!”',
    'That\'s a fine {item}, lad. You\'ll eat free tonight. And tomorrow. Don\'t push it after that.',
    '~He sniffs it, and grins. “Fresh as a spring morning. Better than my supplier, and he\'s got the gout for an excuse.”',
  ],
  like: [
    'Good. Into the pot it goes.',
    '~He tucks the {item} under the bar. “There\'s a drink with your name on it, lad.”',
    'Kitchen\'ll thank you. I\'ll thank you. Here, I\'m thanking you.',
  ],
  neutral: [
    'Hm. Can\'t cook it, can\'t drink it. I\'ll hang it over the bar with the sword.',
    '~He scratches his beard. “Well. It\'s a conversation piece. Every inn needs one.”',
    'Thanks, lad. Someone\'ll win it off me at dice.',
  ],
  dislike: [
    '~He makes a face. “Not in the kitchen. Not near the kitchen. Not in the same street as the kitchen.”',
    'I\'ve seen that turn up in the stew before. The customers didn\'t thank me.',
    'Bookish stuff, eh? Give that to Aldous. Or Mortimer. Someone who can sit still.',
  ],
  special: {
    trout: 'Pond trout! Seventh-day stew is saved. You\'re a better fisherman than my supplier, and he\'s been at it forty years.',
    pike: '~He holds the pike up by the gills. “A Whisperwood pike! Halvard and I used to catch these, when we were young and stupid.” He laughs. “He was better at it. Don\'t tell him I said so.”',
    redcap: '~He looks at the redcap and laughs till his knee hurts. “Last time someone put one of those in my stew, the cooper\'s cousin danced on the table and proposed to the goat.”',
  },
};

// Mortimer Quill
GIFT_LINES.mortimer = {
  love: [
    '~He goes pink to the ears. “For me? Nobody gives clerks things. They give clerks paperwork.”',
    'Oh. Oh, this is... I\'ll file it. Under “kindnesses.” It\'s a very thin file.',
    '~He handles the {item} with fingertips, the way he handles old deeds. “Thank you, Acolyte. Truly.”',
  ],
  like: [
    'How thoughtful. I\'ll keep it by the inkwell.',
    '~He blinks rapidly. “That\'s... very kind. Thank you.”',
    'Useful. Very useful. Please don\'t tell the councilman.',
  ],
  neutral: [
    'Oh. Thank you. I\'m not sure where it goes. Everything here goes somewhere.',
    '~He looks at the {item}, then at his shelves, as if trying to find a pigeonhole for it.',
    'Thank you. I\'ll make a note of it.',
  ],
  dislike: [
    '~He jumps back from the {item} and knocks over a stack of permits. “Ah. Ah, no. Sorry. Could you... not?”',
    'I\'m not very good with things that were alive. Or things that make things not alive.',
    'Thank you. I\'ll... put it in the cellar. With the other things I\'m afraid of.',
  ],
  special: {
    feather: '~He trims the feather with a little knife before you\'ve finished handing it over. “A proper quill. Mine\'s split, and I\'ve been writing with it for a month.” He tests it on a scrap. It writes beautifully.',
    oil: 'Lamp oil. I work late. Some nights I can\'t sleep, and I\'d rather read than... think. Thank you.',
    bone: '~He goes white as his parchment. “Is that... from the cave?” He swallows. “Please take it away. I write down too many things already that I don\'t want to.”',
  },
};

// Edric Voss
GIFT_LINES.voss = {
  love: [
    '~He takes the {item} without a flicker of surprise, as if he\'s been expecting tribute. “How very thoughtful, Acolyte. I see you\'re learning how things are done.”',
    'Quality. Rare in this valley. I\'ll remember who brought it.',
    '~He weighs the {item} in a gloved hand. “Elsbeth will think I bought it. Let her.”',
  ],
  like: [
    'Hm. A good choice. Perhaps you\'re less like Halvard than I feared.',
    '~He inclines his head, a fraction. “I accept.”',
    'Thank you. I don\'t forget a kindness, boy. Or anything else.',
  ],
  neutral: [
    '~He looks at the {item}, then at you, and says nothing for long enough to be uncomfortable. “Thank you.”',
    'I have servants for that sort of thing.',
    'How quaint. Give my regards to the temple.',
  ],
  dislike: [
    '~He doesn\'t take it. “Put it down. On the ground is fine.”',
    'Is this a joke, Acolyte? I don\'t care for jokes.',
    '~His lip curls very slightly. “Peasant fare. I suppose you mean well.”',
  ],
  special: {
    torch: '~He looks at the flame and something moves under his face, quick as a fish under ice. Then it\'s gone. “Put that out, boy. You\'ll set the square alight.”',
    oil: '~He stares at the lamp oil a moment too long. “I have no need of it.” His voice doesn\'t rise. It goes quieter. “Take it away.”',
    goldcarp: 'A golden carp. Do you know, Acolyte, I\'ve only ever seen one other. In the north, years ago. I ate it.',
    mithril: '~He holds the mithril up and smiles, and it doesn\'t reach his eyes. “The council will be very interested to know where you found this.”',
  },
};

// Elsbeth Voss
GIFT_LINES.elsbeth = {
  love: [
    '~She takes the {item} as if it were made of frost. “Oh. Oh, it\'s lovely.” She glances toward the house.',
    'Thank you. I\'ll keep it in the garden, where Edric won\'t ask.',
    '~She smiles, and for a moment looks years younger. “No one has given me anything in a very long time. Anything just for me.”',
  ],
  like: [
    'How kind of you. It will look well by the roses.',
    '~She holds the {item} close. “Thank you. Please, keep your voice down.”',
    'You\'re thoughtful. Like he was. Father Halvard, I mean.',
  ],
  neutral: [
    '~She looks at the {item} with soft confusion. “Thank you. I\'m sure I can find a place for it.”',
    'That\'s kind. I don\'t quite know what it\'s for.',
    'Thank you. I\'ll put it in the shed, with the shears.',
  ],
  dislike: [
    '~She draws her grey shawl tighter. “Oh. Please, I can\'t... not here.”',
    'I\'m sorry. I can\'t bear the sight of blood. Edric says I\'m too soft.',
    '~She takes it, because she always takes what\'s given, and sets it down far from the roses.',
  ],
  special: {
    moonpetal: '~She holds the moonpetal to her face and closes her eyes. “I used to grow these, before. Edric made me pull them up. He said they smelled of graves.” She tucks it into her sleeve.',
    feather: '~She turns the feather in her fingers. “For Veyra? My mother hung them. I haven\'t been allowed to in years.” Her voice is very small. “I\'ll put it under my pillow.”',
    torch: '~She flinches from the flame. “Please. He... we don\'t keep fire in the bedroom. Not since we married.” She doesn\'t explain.',
  },
};

// Hobb Thatcher
GIFT_LINES.hobb = {
  love: [
    '~He turns the {item} over slow and nods slower. “That\'s a proper gift, that is.”',
    'Greta\'ll be pleased. I\'m pleased. We\'re both pleased.',
    '~He grins, which takes a while to happen. “You\'re a good lad. Supper, any night. I mean it.”',
  ],
  like: [
    'Aye. Thank you, lad.',
    '~He tucks the {item} under his arm. “That\'ll come in handy.”',
    'Good of you. Greta\'ll find a use for it.',
  ],
  neutral: [
    'Hm. What\'s it for?',
    '~He scratches his head under his hat. “Well. Thank you, I suppose.”',
    'I\'ll take it home. Greta knows about these things.',
  ],
  dislike: [
    '~He backs off a step. “That\'s woods-witch stuff, that is. Or... is it? I don\'t rightly know any more.”',
    'Not for me, lad. I\'m simple folk.',
    '~He takes it gingerly and holds it away from him, the way he\'d hold a tick.',
  ],
  special: {
    pelt: '~He runs a hand through the wolf fur and his jaw sets. “One less. That\'s one less at my fold.” He looks out toward the Whisperwood. “The big one\'s still out there, though.”',
    greymawfang: '~He stares at the great fang a long time. Then he takes off his hat. “You got him. The grey one. Six of my sheep.” He swallows. “I\'ll tell Greta. She\'ll cry. Good tears.”',
    feather: 'For Greta\'s door. She\'ll hang it tonight, for the Green Huntress. Says it keeps Wil safe in the woods.',
  },
};

// Ned Harrow
GIFT_LINES.ned = {
  love: [
    '~His face lights up under the too-big helmet. “For me? Honest? I haven\'t eaten since breakfast. Yesterday\'s breakfast.”',
    'Gods, thanks. Gate duty\'s long. This\'ll see me through.',
    '~He tries to stay at attention and eat at the same time, and manages neither. “Thanks, Acolyte!”',
  ],
  like: [
    'Oh, that\'s useful! Thanks!',
    '~He grins. “You didn\'t have to. Thanks.”',
    'I\'ll keep it by the gate. Never know.',
  ],
  neutral: [
    'Uh. Thanks? Do I... need this for something?',
    '~He looks at the {item}, then puts it in his pack like it\'s an order.',
    'Thanks. I\'ll ask the sergeant what it\'s for.',
  ],
  dislike: [
    '~He goes a bit green. “I saw things like that. In the cave.” He takes it anyway.',
    'That\'s... thanks. I\'ll leave it in the guardhouse.',
    'Ugh. No offence, Acolyte. But no.',
  ],
  special: {
    meat: '~He looks at the meat and his eyes go wet. “Bran used to feed me and Dace like this. Half my childhood at his table.” He clears his throat hard. “Thanks.”',
    pheal: '~He turns the potion in his hands. “If I\'d had one of these in the cave...” He stops, and doesn\'t finish.',
    silk: '~He drops the spider silk like it\'s burning. “Sorry. Sorry. It\'s just. Down there, the webs. Dace walked into one.”',
  },
};

// Ilse Varga
GIFT_LINES.ilse = {
  love: [
    '~Her laugh booms across the market. “Now THIS is a gift! You\'ve a merchant\'s eye, Acolyte!”',
    'Look at that! I could sell that in three river towns and buy a new wagon. I won\'t. But I could.',
    '~She hugs you, briefly and with tremendous force. “When I get home, I\'m sending you a bolt of the good blue. Two bolts!”',
  ],
  like: [
    'Very nice! I\'ll find a use for it on the road.',
    '~She holds the {item} up for the whole market to see. “A gift! From a friend!”',
    'You\'re kind. Kinder than most in this valley, and I\'ve been here long enough to know.',
  ],
  neutral: [
    'Hm! Well, everything sells somewhere. Thank you.',
    '~She looks the {item} over with a trader\'s eye. “I\'ll put it on the wagon. Someone downriver will want it.”',
    'Thank you, friend. Can\'t say what it\'s for, but thank you.',
  ],
  dislike: [
    '~She wrinkles her nose. “Ah. Not the kind of thing that sells. Or keeps. Or smells nice.”',
    'Thank you. I\'ll leave it for the crows. No offence.',
    'That\'ll go in the wagon. Far back. Under the tarp.',
  ],
  special: {
    wood: '~She knocks on the timber and listens. “Seasoned. Sound. That\'s an axle, or a wheel spoke, or the start of going home.” She\'s quiet a moment. “Thank you.”',
    wool: 'Wool! You\'re giving a cloth merchant wool? That\'s like giving Rolf ale. ...I\'ll dye it madder red, and you\'ll have a scarf before market.',
    caveeel: '~She stares at the glowing eel. “That came from under the earth, didn\'t it.” She hands it back. “Teo used to say the deep places glow. I\'d rather not think about where he is.”',
  },
};

// Maren Quill
GIFT_LINES.maren = {
  love: [
    '~She runs the {item} between finger and thumb, and her sharp face softens. “Now this is something worth weaving.”',
    'Finally, someone in this town with taste. Thank you, Acolyte.',
    '~She\'s already twisting a strand of it, testing. “Better than anything that river woman sells. I\'ll make you something. Don\'t argue.”',
  ],
  like: [
    'Hm. That\'s good. Better than good.',
    '~She sets the {item} by her loom. “I\'ll find a use. Thank you.”',
    'Not bad at all. You have an eye, for a boy.',
  ],
  neutral: [
    '~She looks at the {item} with mild disdain. “Can I weave it? No? Then thank you, I suppose.”',
    'I\'m a weaver, Acolyte. Not a magpie.',
    'Thank you. My brother would know what to do with that. He files everything.',
  ],
  dislike: [
    '~She draws her skirts back. “Not near the loom. It stains.”',
    'Gaudy. I\'ve no use for gaud.',
    'Hmph. Thank you for the thought. Keep the thing.',
  ],
  special: {
    silk: '~She holds the spider silk to the light and goes completely still. “Finer than anything on the river. Finer than I\'ve ever worked.” Her voice goes thick. “They say the serpent folk weave it finer still. I\'d give a year to see.”',
    wool: 'Good wool. Better than hers, anyway. ...Well. About the same as hers. Don\'t tell her I said so.',
    feather: '~She turns the feather over. “I could work this into a border.” A pause. “Mortimer used to bring me feathers when we were children. For my hair.”',
  },
};

// Abel Cooper
GIFT_LINES.abel = {
  love: [
    '~He runs a thumb along the {item}, steady and slow. “That\'s good. That\'s very good.”',
    'Thank you. Sela will be pleased. The twins will be more pleased.',
    '~He nods once, a craftsman\'s nod. “You\'ve a good eye. I\'ll make you something with it.”',
  ],
  like: [
    'Useful. Thank you.',
    '~He sets the {item} on his workbench. “That\'ll find a use.”',
    'Kind of you. Sela says thank you too, or she will when I tell her.',
  ],
  neutral: [
    'Hm. Thank you. I\'m not sure what I\'ll do with it.',
    '~He turns the {item} over. “Well. The twins might like it.”',
    'Thanks. Leave it by the barrels.',
  ],
  dislike: [
    '~He winces. “Not near the twins, if you don\'t mind. They put everything in their mouths.”',
    'Thank you. I\'ll put it in the shed. Far back.',
    'I\'m a cooper. I don\'t know what to do with that.',
  ],
  special: {
    wood: '~He knocks on the wood and listens like a doctor. “Good oak. Straight grain. That\'s four staves at least.” He smiles, slow. “I\'ll make you a barrel. Everyone needs a barrel.”',
    apple: '~His face cracks into a grin. “Apples! Lark\'s been asking for apples since the fever broke.” He pockets them carefully. “You\'ll be her favourite person. You already are.”',
    healroot: '~He holds the healroot a moment. “For the twins, in case. Thank you. I\'ll keep it close, and pray I never need it.”',
  },
};

// Gil Brack
GIFT_LINES.gil = {
  love: [
    '~He holds the {item} a long moment, and nods, and says nothing. It\'s the most he\'s said all week.',
    'Good. That\'s good.',
    '~He looks at the {item}, then at the water. “Fine catch. You\'ve the patience for it.”',
  ],
  like: [
    'Thank you.',
    '~He nods once and sets the {item} beside his creel.',
    'Fine. Sit a while.',
  ],
  neutral: [
    '~He looks at the {item}. Then at the pond. Then at you. “Hm.”',
    'Thank you. I suppose.',
    '~He tucks it away without a word.',
  ],
  dislike: [
    '~He shakes his head, slow. “No. Not that.”',
    'Keep it. I\'ve no use.',
    '~He looks away from the {item}, toward the water, until you put it down.',
  ],
  special: {
    pike: '~He holds the river pike and his hands shake. “Liss loved pike. Baked with dill.” He doesn\'t look up. “I haven\'t been to the river since. Thank you for going.”',
    goldcarp: '~The golden carp flashes in his hands. “Liss said there was a golden one in the river. I never believed her.” He holds it a long while. “I should have believed her.”',
    stone: '~He turns the stone over, then takes out his knife. “Blue vein in it. Nemora\'s colour.” He starts carving before you\'ve gone.',
    caveeel: '~He looks at the glowing eel, then at the pond. “Pond\'s gone cold from below.” His voice is quiet. “Things come up from the deep water. I\'ve seen.”',
  },
};

// Old Berta
GIFT_LINES.berta = {
  love: [
    '~She clasps the {item} to her chest with both tiny hands. “Oh, child. Oh, you good child.”',
    'You remembered. You remembered what an old woman needs. Halvard would be proud.',
    '~She coughs, and smiles through it. “Come in, come in. The kettle\'s on, and now I\'ve something to put in it.”',
  ],
  like: [
    'How thoughtful, dear. Thank you.',
    '~She pats your hand. “You\'re a kind boy. You get that from your grandfather.” She stops. “From Halvard, I mean.”',
    'That\'ll do nicely, dear. Sit, sit.',
  ],
  neutral: [
    '~She peers at the {item}. “And what\'s this, dear? Well. Thank you anyway.”',
    'That\'s sweet of you, child. I\'ll find a use for it.',
    'Thank you, dear. I\'ll put it on the mantel.',
  ],
  dislike: [
    '~She sets the {item} down, very carefully, as far from her as the little table allows. “Thank you, dear. No.”',
    'I\'m too old for that sort of thing, child. I\'ve seen enough of it.',
    '~She doesn\'t touch it. “You take that home with you. Please.”',
  ],
  special: {
    wood: '~She looks at the firewood for a long time, and then she starts to cry, very quietly. “Eighteen years he brought me wood. Every week. I never carried my own.” She wipes her eyes. “Stack it by the door, dear. Like he did.”',
    torch: '~She goes rigid. Her hand finds the edge of the table. “Put it out. Put it out, child.” Her voice is very small. “I\'ve seen torches before. In the dark. A whole line of them.”',
    healroot: '~She coughs, as if to prove a point. “Healroot! Tamsin\'s been on at me about my chest. I\'ll make a tisane. You\'ll sit with me while I drink it.”',
    oil: '~She pushes the flask back toward you, gently. “No, dear. I don\'t keep oil in the house. Not since...” She pats your hand. “Not ever.”',
  },
};

// Garrick Sallow
GIFT_LINES.garrick = {
  love: [
    '~He slaps the {item} on his block. “Now THAT\'s a proper gift! Fair price? No price! It\'s a gift! I love it!”',
    '~He holds the {item} up and roars with laughter. “Look at the size of it! You\'ll eat like a king tonight, lad. Smokehouse, three days, no shortcuts.”',
    'You know what I like! Halvard never brought me anything but a slate. Well. And patience.',
  ],
  like: [
    'Good! Good! Into the smokehouse it goes.',
    '~He nods, pleased. “Useful. I\'ll find a use. I always do.”',
    'Fair gift, fair thanks. Here, have a sausage.',
  ],
  neutral: [
    '~He scratches his head. “Well. What\'s it for, then? Can I smoke it?”',
    'Thank you, lad. I\'ll hang it with the hams. Sure it\'ll be fine.',
    'Hm! Odd thing. Fenwick might buy it. Fenwick buys anything if you sing it.',
  ],
  dislike: [
    '~He holds the {item} away from him, like a cat that might scratch. “Ah. Not my sort of thing, lad.”',
    'Flowers and fancy bits. Give that to someone who doesn\'t smell of smoke.',
    '~He sets it on a shelf, far from the meat. “Thank you. I think.”',
  ],
  special: {
    srecall: '~He turns the scroll over, then upside down. His big face goes red. “I can\'t... I don\'t know my letters past M.” He pushes it back. “Halvard was teaching me. Maybe you could. Some winter.”',
    smapping: '~He squints at the scroll. “Is that an M? I know M.” He finds one, and grins, then the grin fades. “That\'s where we stopped. M.”',
    steleport: '~He unrolls it and stares. “All those letters. Halvard said they\'re just pictures of sounds. They don\'t look like sounds to me.”',
    antler: '~He holds the antler up. “Now that\'s a stag! Hang it over the smokehouse door for Veyra, that\'s what my old dad did. Thank you, lad.”',
  },
};

// Fenwick Hale
GIFT_LINES.fenwick = {
  love: [
    '~He bangs his gavel on the nearest post. “SOLD! To the gentleman in the... oh, it\'s a gift? Even better!”',
    'Oh, splendid, splendid! I could auction this for a fortune. I won\'t. I\'ll keep it. Mostly.',
    '~He sings it, as he sings everything. “A gift, a gift, a lovely gift, from a friend I\'ll not forget!”',
  ],
  like: [
    'How nice! Lot forty-two, “kindness,” no reserve.',
    '~He tips his hat with his gavel. “Thank you, friend.”',
    'Very good! I\'ll keep it in my waistcoat pocket. I have many pockets.',
  ],
  neutral: [
    '~He looks at the {item}, gavel raised, unsure. “Do I hear... no. Thank you.”',
    'Interesting! Not something I\'d bid on. But interesting.',
    'Thank you! I\'ll find it a home. Or a buyer.',
  ],
  dislike: [
    '~He holds the {item} at arm\'s length. “Ah. Not a crowd-pleaser, this.”',
    'Thank you. I\'ll put it in the bin behind the ring. The far bin.',
    '~His voice, for once, drops to normal speaking volume. “Oh dear.”',
  ],
  special: {
    goldcarp: '~He holds the golden carp up and the whole ring goes quiet. “Do I hear forty? Do I hear fifty?” Then he lowers it. “No. This one I keep.”',
    silver: '~He looks at the silver ore, then glances toward the market square, then back. “Silver. Plain silver.” He says it carefully. “No mint mark on it. Good.”',
  },
};

// Ewan Fell
GIFT_LINES.ewan = {
  love: [
    '~He crouches and offers the {item} to the dogs first. They approve. Then he does. “Thank you.”',
    'The dogs\'ll love you forever now. That\'s not a small thing.',
    '~He nods, slow and pleased. “Good gift. Up the hills, that\'d get you a place by the fire.”',
  ],
  like: [
    'Aye. Thank you.',
    '~He tucks the {item} into his pack. “That\'ll travel.”',
    'Useful on the high road. Thank you.',
  ],
  neutral: [
    '~He looks at the {item}. The dogs look at the {item}. Nobody is sure.',
    'Hm. Thank you.',
    'I\'ll take it. Might find a use, four days up.',
  ],
  dislike: [
    '~He shakes his head. “No use for that on the hill. It\'d only weigh me down.”',
    'Pretty. Pretty doesn\'t keep you warm.',
    '~He takes it, politely, and you suspect it will be left on a cairn somewhere.',
  ],
  special: {
    bone: '~He tosses the bone to the dogs, who fall on it like it\'s the best day of their lives. Ewan almost smiles. “There. Now they\'ll follow you to the end of the valley.”',
    stone: '~He turns the stone over, then nods. “Good for a cairn. I\'ll set it on Korrum\'s, up by the high pass. With salt and a coin. Somebody ought to.”',
    meat: '~He nods at the meat. “I\'ll split it with the dogs.” One of the dogs looks at you with naked adoration.',
  },
};

// ---------------- your youth: what they remember of it (merged into their topics on load) ----------------
// The Temple Warden: origin-aware lines (how the hero spent their youth). Every line gated on an origin token.

// Brother Anselm: temple (an outsider who notices), cathedral (knew the school)
ORIGIN_LINES.anselm = {
  greet: [
    { t: 'You stepped over the third board in the vestry without looking. I have tripped on it twice this morning.', if: 'origin:temple' },
    { t: 'Ah, the cathedral school\'s old pupil. You still sit up straighter when a friar comes in. They beat that into all of us.', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'I came to the gods late, out of a barley field. You were raised in the lamplight. I envy you that a little, and pity you a little too.', if: 'origin:temple' },
    { t: 'You say the dawn words the old way. Highcourt dropped the line about the hearth forty years ago. Who taught you to keep it?', if: 'origin:temple', ask: { opts: [
      { tone: 'kind', l: 'Father Halvard. He said the hearth was the whole point.', r: 'Then he was right, and Highcourt was merely tidy. Keep it.', tr: 1 },
      { tone: 'pious', l: 'Aurel taught me. Halvard only held the book.', r: '~He smiles despite himself. “A good answer. A slightly smug one.”', tr: 0 },
      { tone: 'joke', l: 'I learned it before I was old enough to argue with it.', r: 'That is how all the best rites are learned.', tr: 1 },
      { tone: 'curious', l: 'Why did Highcourt drop it?', r: 'A committee. It is always a committee.', tr: 0 },
    ] } },
    { t: 'I taught grammar at the cathedral school for two winters before they sent me out with a list. Is the refectory still that cold?', if: 'origin:cathedral', ask: { opts: [
      { tone: 'joke', l: 'Colder. The soup froze to the spoon.', r: 'Then nothing has changed, and I find that a comfort.', tr: 1 },
      { tone: 'kind', l: 'The cold was easier with friends.', r: 'It always is. I hope you kept one or two.', tr: 1 },
      { tone: 'curious', l: 'Did you know the old librarian?', r: '~He lowers his voice. “Everyone knew her. She knew which shelves were locked, and why. Be careful whom you tell what you read there.”', tr: 0, learn: 'Brother Anselm says the cathedral library had locked shelves, and that what you read there is best kept quiet.' },
      { tone: 'blunt', l: 'I hated it.', r: 'Most of us did, the first year. The second is worse. You were spared.', tr: 0 },
    ] } },
  ],
  halvard: [
    { t: 'There was a child at the synod, years ago, asleep under Halvard\'s bench through the whole debate on lamp-oil tithes. Snoring, faintly. Was that you?', if: 'origin:temple', ask: { opts: [
      { tone: 'joke', l: 'It was a very long debate.', r: 'It was. You were the wisest person in the room.', tr: 1 },
      { tone: 'kind', l: 'He never left me behind if he could help it.', r: '~Anselm nods slowly. “No. I don\'t imagine he did.”', tr: 1 },
      { tone: 'blunt', l: 'I don\'t remember it.', r: 'Lucky. I remember every word.', tr: 0 },
    ] } },
    { t: 'You know the parsonage the way a hand knows a glove. It must be very loud in there now, without him.', if: 'origin:temple found' },
    { t: 'Halvard sent you to Highcourt. I would have thought he\'d keep you as far from the cathedral as the road allowed. He must have wanted you to have the letters, whatever they cost him.', if: 'origin:cathedral' },
  ],
  work: [
    { t: 'I am meant to judge whether this temple can stand without a priest. Then I watch you trim six wicks without looking, and I lose my place in the tally.', if: 'origin:temple' },
  ],
  gods: [
    { t: 'Most acolytes learn the rites from a book. You learned them from the floorboards. That kind of faith creaks, but it holds.', if: 'origin:temple' },
    { t: 'At Highcourt they teach the gods as a list. Out here they are neighbours. You have seen both ways.', if: 'origin:cathedral' },
  ],
  gossip: [
    { t: 'Mistress Tolly tells me you used to hide in the bell-loft during long sermons. She meant it as a recommendation.', if: 'origin:temple' },
  ],
  news: [
    { t: 'Someone rang the noon bell an hour early, the year you were at the school. The whole cathedral sat down to dinner at eleven. The masters never caught the culprit.', if: 'origin:cathedral', ask: { opts: [
      { tone: 'joke', l: 'Terrible. Shocking.', r: '~He looks at you for a long moment. “I see.”', tr: 1 },
      { tone: 'blunt', l: 'It was me.', r: 'I know. So did the Lector. He laughed about it for a week, privately.', tr: 1 },
      { tone: 'pious', l: 'Aurel\'s sun was high enough. I only agreed with it.', r: 'That is either theology or cheek. I suspect both.', tr: 0 },
    ] } },
    { t: 'I wrote to the school about you. Your old masters remember you. One remembers you with a sigh, which I choose to take as a compliment.', if: 'origin:cathedral' },
  ],
  caves: [
    { t: 'You will have read the old histories at Highcourt. Anything about kingdoms under mountains? I ask as a farmer\'s son who never believed a word of it.', if: 'origin:cathedral' },
  ],
};

// Bran: forge
ORIGIN_LINES.bran = {
  greet: [
    { t: 'Still hold a hammer like you\'re afraid of it?', if: 'origin:forge' },
  ],
  self: [
    { t: 'Two summers you stood at that bellows. Never once let the fire drop. Can\'t say that of the new lad. Don\'t tell him.', if: 'origin:forge' },
    { t: 'You remember the day you picked the tongs up by the wrong end?', if: 'origin:forge', ask: { opts: [
      { tone: 'blunt', l: 'You laughed. Then you put my hand in the trough.', r: 'Aye. Kept the skin on, didn\'t it.', tr: 1 },
      { tone: 'joke', l: 'I still can\'t make a fist on a cold morning. Thanks for that.', r: '~A snort. Nearly a laugh.', tr: 1 },
      { tone: 'pious', l: 'Korrum teaches through burns, they say.', r: 'Korrum teaches nothing. Iron does. Don\'t preach in my shop.', tr: -1 },
      { tone: 'kind', l: 'You bandaged it yourself. I remember that more.', r: '~He grunts and becomes very interested in a horseshoe.', tr: 1 },
    ] } },
  ],
  work: [
    { t: 'You can still read the heat. Cherry, orange, straw. Say it.', if: 'origin:forge', ask: { opts: [
      { tone: 'blunt', l: 'Cherry to bend, orange to draw, straw to temper. And never quench in a hurry.', r: 'Good. Something stuck.', tr: 1 },
      { tone: 'joke', l: 'Red, redder, and ow.', r: 'That\'s about what Dace learned.', tr: 0 },
      { tone: 'curious', l: 'What colour did you temper Ada\'s knife at?', r: '~He is quiet. “Straw. Pale straw. She liked it sharp.”', tr: 1, learn: 'Bran forged Ada a knife and tempered it pale straw, the way she liked it.' },
    ] } },
  ],
  halvard: [
    { t: 'Halvard came for you at dusk every day. Stood in that door, said nothing, watched you work. Proud as a cockerel. Hid it worse than me.', if: 'origin:forge !found' },
    { t: 'He used to say the forge did you more good than the prayers. Then he\'d go home and pray for you anyway.', if: 'origin:forge found' },
  ],
  gossip: [
    { t: 'You and Ned and my Dace. Three of you in the coal heap like puppies. Turned the lot of you out black every night.', if: 'origin:forge !flag:dace_told' },
    { t: 'You three made a sword out of a horseshoe once. Dace kept it. It\'s still under his bed.', if: 'origin:forge flag:dace_told', min: 2 },
  ],
};

// Hilde: forge
ORIGIN_LINES.hilde = {
  greet: [
    { t: 'You. Carrying something of Bran\'s? No? Strange to see you empty-handed at my door.', if: 'origin:forge' },
  ],
  self: [
    { t: 'Two summers you ran rivets across that street, and two summers you came back with my opinion of his work. Did you ever soften it?', if: 'origin:forge', ask: { opts: [
      { tone: 'blunt', l: 'Never. He liked hearing it straight.', r: 'Good. So did I.', tr: 1 },
      { tone: 'joke', l: 'I made it worse, mostly. It was more fun.', r: '~Her mouth twitches. “I suspected.”', tr: 1 },
      { tone: 'kind', l: 'I told him you kept his rivets. That was all he needed.', r: '~A long look. “Mind your own business, Acolyte.” She does not sound angry.', tr: 1 },
      { tone: 'curious', l: 'Why didn\'t you just walk across and tell him?', r: 'Because then we\'d have had to talk about other things.', tr: 0 },
    ] } },
    { t: 'You stood in my doorway once with your face all over soot and the sun behind you, and I dropped a full box of rivets. You thought it was the heat. It wasn\'t.', if: 'origin:forge', min: 3, learn: 'Hilde says the hero, as Bran\'s apprentice, once reminded her so sharply of someone that she dropped a box of rivets.' },
  ],
  work: [
    { t: 'Those bracers I made you from offcuts the second summer. You still have them? Good. They were better than you deserved.', if: 'origin:forge' },
    { t: 'You fold a rivet properly. Bran\'s way, not mine. I won\'t hold it against you.', if: 'origin:forge' },
  ],
  gossip: [
    { t: 'He was gentler with you than with the boys. He\'ll deny it. Watch him.', if: 'origin:forge' },
    { t: 'He laughed, that summer. At you and Dace and Ned. I could hear it across the street. I haven\'t heard it since.', if: 'origin:forge !flag:dace_told' },
  ],
  halvard: [
    { t: 'Halvard came to fetch you from the forge some evenings and stopped at my door first. Said nothing. Bought nothing. Just checked on me, I think.', if: 'origin:forge' },
  ],
};

// Tamsin: temple
ORIGIN_LINES.tamsin = {
  greet: [
    { t: 'You. Under the table again? No, you\'re too tall now. Pity. You were quieter down there.', if: 'origin:temple' },
  ],
  self: [
    { t: 'Thirty years of arguing with Halvard, and the one time anyone settled it was you, aged nine, from under the parsonage table. Quoting the Book of Lamps at us.', if: 'origin:temple', ask: { opts: [
      { tone: 'joke', l: 'I only wanted you both to stop so we could eat.', r: 'It worked. That was the worst part.', tr: 1 },
      { tone: 'pious', l: 'The words were right there. Somebody had to read them.', r: 'Don\'t you start. One of you was enough.', tr: 0 },
      { tone: 'kind', l: 'You let me win. I know you did.', r: '~She sniffs. “I did no such thing.” She did.', tr: 1 },
      { tone: 'curious', l: 'What were you arguing about?', r: 'Whether Aurel heals or only watches. Still don\'t agree with him. Can\'t tell him so, now.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'I stitched your chin when you came off the bell-rope. Seven stitches. You didn\'t cry until Halvard did.', if: 'origin:temple' },
    { t: 'Every scrape from that parsonage came through my door. I could chart your childhood by my healroot accounts.', if: 'origin:temple' },
  ],
  halvard: [
    { t: 'He used to send you over with a jar of honey whenever he\'d won an argument. I knew the score by the size of the jar.', if: 'origin:temple !found' },
    { t: 'He taught you the prayers and I taught you to wash your hands. Between us we made one sensible priest. Mind you stay one.', if: 'origin:temple found' },
  ],
  gods: [
    { t: 'You know the rites better than Halvard did by the end. He used to skip a verse when his knees hurt. You never let him.', if: 'origin:temple' },
  ],
};

// Mirela: hunt (met the hero in the woods)
ORIGIN_LINES.mirela = {
  greet: [
    { t: 'You still walk like the Thatchers taught you. Heel last. I heard you anyway.', if: 'origin:hunt' },
  ],
  self: [
    { t: 'The fog, my first autumn. You had lost the Thatchers and were walking in circles round my birch. Three times. I counted.', if: 'origin:hunt', ask: { opts: [
      { tone: 'joke', l: 'Four times. You missed one.', r: '~She laughs, quietly, like she isn\'t used to it.', tr: 1 },
      { tone: 'kind', l: 'You walked me out by a thread of runes on the trees. I never forgot.', r: 'And you never told them who. I noticed that too.', tr: 1, learn: 'Mirela guided the hero out of the Whisperwood fog years ago. The hero never told the Thatchers who had helped.' },
      { tone: 'blunt', l: 'I wasn\'t lost. I was tracking.', r: 'Tracking your own footprints. Very thorough.', tr: 0 },
      { tone: 'curious', l: 'Why did you help? You didn\'t know me.', r: 'You said good evening to the birch before you saw me. My mother would have liked that.', tr: 1 },
    ] } },
  ],
  gossip: [
    { t: 'Hobb Thatcher thinks I cursed his flock. He\'d think worse if he knew I saved his apprentice from a bog.', if: 'origin:hunt' },
    { t: 'Wil Thatcher is the only one of them who leaves bread by my birch. I think you told him. Don\'t answer.', if: 'origin:hunt' },
  ],
  gods: [
    { t: 'You leave the first cut for Veyra, the way the Thatchers do. Most townsfolk have forgotten. The Green Lady hasn\'t.', if: 'origin:hunt' },
  ],
  caves: [
    { t: 'You know the woods. Then you know that nothing lives near the North Road adits now. Not even crows. Ask yourself why.', if: 'origin:hunt' },
  ],
};

// Aldous: cathedral (delighted)
ORIGIN_LINES.aldous = {
  greet: [
    { t: 'My Highcourt scholar! Come in, come in. Is it still raining there? It was raining when I left. Twenty-five years ago. Probably still is.', if: 'origin:cathedral' },
    { t: '~He holds out a book without looking up. “Page forty. Tell me if the footnote is wrong. You\'ll know, you\'ve been to the school.”', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'I gave you a list when you left. Six books to find, and one not to. Which did you read first?', if: 'origin:cathedral', ask: { opts: [
      { tone: 'joke', l: 'The one I wasn\'t to read. Obviously.', r: 'Obviously! Splendid. Halvard said you would. I owe him a copper.', tr: 1 },
      { tone: 'kind', l: 'All six. I wrote you notes in the margins of my copybook.', r: 'Did you? I should love to see them. Bring them. Bring them slowly.', tr: 1 },
      { tone: 'curious', l: 'Why was there one I wasn\'t to read?', r: '~His spectacles come down out of his hair for once. “Because it named the Wardens\' tithe-roads, and men lose their posts for reading it. Ask me again when you\'re older. Or tomorrow.”', tr: 0, learn: 'Aldous once told the hero not to read a Highcourt book that named the Wardens\' tithe-roads.', min: 2 },
      { tone: 'blunt', l: 'I didn\'t have time for any of them.', r: 'Ah. Well. Nobody does, at that school. They\'re too busy teaching.', tr: 0 },
    ] } },
    { t: 'The south stair in the cathedral library, the one that creaks on the ninth step. Does it still creak? I put my foot through it in my second year.', if: 'origin:cathedral' },
  ],
  work: [
    { t: 'Someone who can read the old hand! Oh, you have no idea. Half my stock is labelled by me, and I can\'t read my own labels.', if: 'origin:cathedral' },
  ],
  halvard: [
    { t: 'Halvard came to me for a letter to the school. He wrote eleven drafts of his own first. All of them said “please”. He thought I wouldn\'t notice.', if: 'origin:cathedral', ask: { opts: [
      { tone: 'kind', l: 'He never told me he asked you.', r: 'No. He wanted you to think you got in on your own. You did, mostly. My letter was very short.', tr: 1 },
      { tone: 'joke', l: 'Eleven? He only ever wrote me one line at a time.', r: 'He saved his words up for the important people. You were one.', tr: 1 },
      { tone: 'curious', l: 'Why did he want me to go?', r: 'He said you should know how to read a record, in case one day you needed to read the right one.', tr: 0 },
    ] } },
    { t: 'He kept every letter you sent from Highcourt. In a box. With my chess notes. We read them aloud on seventh days and argued over your spelling.', if: 'origin:cathedral found' },
  ],
  caves: [
    { t: 'Four kingdoms, a sealed door. You\'ll have seen the Vale maps in the cathedral copies, surely? The old ones, with the little drawings at the edges. No? They were there in my day. Somebody must have borrowed them.', if: 'origin:cathedral' },
  ],
};

// Marta: temple
ORIGIN_LINES.marta = {
  greet: [
    { t: 'There\'s the child who held the blessing bowl! Here, heel of the rye. You still look like you skip breakfast.', if: 'origin:temple' },
  ],
  self: [
    { t: 'Every spring you came with Halvard to bless the ovens. Every spring you stood too close to the dough.', if: 'origin:temple', ask: { opts: [
      { tone: 'joke', l: 'And every spring I tipped the water in the starter.', r: 'Only once! And that was the best bread I ever baked. I still call it the blessed starter. It\'s that crock there.', tr: 1, learn: 'Marta still keeps the “blessed starter”, which the hero, as a child, once accidentally baptised with the blessing water.' },
      { tone: 'pious', l: 'Aurel blesses the bread, not the baker\'s bowl.', r: '~Her eyes go bright. “Halvard said that too. Oh, you sound like him.”', tr: 1 },
      { tone: 'kind', l: 'You always gave me the first loaf afterward.', r: 'Of course I did. You said the words properly. Better than some priests.', tr: 1 },
    ] } },
  ],
  gods: [
    { t: 'You were at every dawn service for fifteen years. Do you know how many of us noticed? All of us. We counted on you.', if: 'origin:temple' },
    { t: 'Will you hold the dawn service? You know the words better than anyone breathing. Please say yes.', if: 'origin:temple !found' },
  ],
  halvard: [
    { t: 'He used to carry you on his shoulders through the market, both of you saying the morning blessing to every stall. You never got the tune right. Neither did he.', if: 'origin:temple' },
    { t: 'You were his. Whatever they decide about the temple, you were his.', if: 'origin:temple found' },
  ],
  gossip: [
    { t: 'Pippa wants to be you, you know. Not a priestess. You. Lamp-lighter, rope-climber, bell-loft hider.', if: 'origin:temple' },
  ],
};

// Pippa: temple
ORIGIN_LINES.pippa = {
  greet: [
    { t: 'You lit the lamps before me! Before ME! Wait, no, I lit them. Did you check? You checked. You always check.', if: 'origin:temple' },
  ],
  self: [
    { t: 'At the Rite of First Light when I was small you gave me a piggyback all the way round and I fell asleep and drooled on your robe. Mum told me. I don\'t remember. I\'m sorry. Am I sorry?', if: 'origin:temple', ask: { opts: [
      { tone: 'kind', l: 'You weren\'t heavy. You still owe me a clean robe.', r: 'I\'ll WASH it! I\'ll wash ALL of them! Can I?', tr: 1 },
      { tone: 'joke', l: 'You snored, too. Like a tiny bellows.', r: 'I did NOT. ...Did I? Don\'t tell Tamsin.', tr: 1 },
      { tone: 'pious', l: 'The First Light comes to sleeping children too.', r: '~She considers this very seriously. “So I was blessed asleep. That counts double.”', tr: 1 },
      { tone: 'blunt', l: 'You were heavy and sticky.', r: 'I was FOUR. Everyone\'s sticky when they\'re four.', tr: 0 },
    ] } },
    { t: 'Is it true you know every creak in the parsonage? Do the step by the larder! I think it says “Pippa”.', if: 'origin:temple' },
  ],
  gods: [
    { t: 'How many prayers do you know? All of them? Teach me the long one, the one Father Halvard said too fast.', if: 'origin:temple' },
  ],
  halvard: [
    { t: 'He said you used to light the lamps on a stool too. He said you fell off twice. I\'ve only fallen off once. So I\'m winning.', if: 'origin:temple !found' },
    { t: 'You grew up with him every day. I only got Tuesdays and lamp days. ...Can you tell me the everyday things? So I have them too?', if: 'origin:temple found' },
  ],
};

// Odessa: cathedral (shared a cart from the Highcourt road)
ORIGIN_LINES.odessa = {
  greet: [
    { t: 'My scholar from the carrier\'s cart! You still hold a book like it might fly off. Come, let me see your hand.', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'We shared the straw on that cart up from the Highcourt road, you coming home, me coming here. You read to me all the way from the crossroads. I don\'t remember the book. I remember your voice going hoarse.', if: 'origin:cathedral', ask: { opts: [
      { tone: 'kind', l: 'You read my palm at the toll bridge and told me I\'d come home to trouble.', r: '~She does not laugh. “I did. I was right too often again.”', tr: 1 },
      { tone: 'joke', l: 'It was a book of tax law. You fell asleep in four pages.', r: 'Three. And I dreamed of tolls. My father would have been proud.', tr: 1 },
      { tone: 'curious', l: 'Why did you come to Brambleford, of all places?', r: 'Teo said it was quiet. He was going to work the road and come to me between seasons. So much for quiet.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'Highcourt jewelers set stones like they\'re burying them. Corvanne sets them to sing. You\'ve seen both, so you can settle my argument with Ilse.', if: 'origin:cathedral' },
  ],
  gossip: [
    { t: 'The clerk looks at you like a starving man at a bakery window. He\'d have given a finger to go to that school.', if: 'origin:cathedral' },
  ],
  gods: [
    { t: 'Did the cathedral teach you a prayer for the taken? Not the official one. The one people actually say. Teach me it, for Teo.', if: 'origin:cathedral', ask: { opts: [
      { tone: 'pious', l: 'Aurel, keep a lamp lit where they are. That\'s all of it.', r: '~She says it back, twice, in your accent and then in her own tongue.', tr: 1 },
      { tone: 'kind', l: 'I\'ll say it with you. Every morning, if you like.', r: 'Then I\'ll be at the temple at dawn. Don\'t look so surprised.', tr: 1 },
      { tone: 'blunt', l: 'They didn\'t teach that one. I learned it from a cook.', r: 'Good. Cooks know more about the gods than bishops.', tr: 0 },
    ] } },
  ],
  caves: [
    { t: 'You read the old books. Do goblins keep prisoners? Don\'t soften it.', if: 'origin:cathedral' },
  ],
};

// Rolf: temple
ORIGIN_LINES.rolf = {
  greet: [
    { t: '“Father says it\'s time.” Ha! That\'s what you used to say, at that back door with the lantern. Sit down. It isn\'t time.', if: 'origin:temple' },
  ],
  self: [
    { t: 'Every seventh night you\'d come to fetch him. He\'d say five more minutes, I\'d pour you a cider, and the five minutes would be an hour. Remember?', if: 'origin:temple', ask: { opts: [
      { tone: 'joke', l: 'It was watered cider. I knew. I always knew.', r: 'Half water! A priest\'s child, drunk in my inn? Halvard would have had my tap.', tr: 1 },
      { tone: 'kind', l: 'I liked those hours. You two laughing.', r: '~He wipes the same spot on the bar for a while. “Aye. So did I.”', tr: 1 },
      { tone: 'curious', l: 'What did you talk about all that time?', r: 'Old days. Young days. The north, once, very late. He shut up quick and so did I.', tr: 0, min: 3 },
      { tone: 'pious', l: 'He said fellowship was a kind of prayer.', r: 'Did he now. Then this inn\'s holier than the temple. I\'ll put up a sign.', tr: 0 },
    ] } },
  ],
  halvard: [
    { t: 'The night you were small and sick he brought you here, wrapped in his cloak, to sit by my fire because the parsonage chimney smoked. He didn\'t sleep. Neither did I.', if: 'origin:temple' },
    { t: 'Your lantern\'s still on the hook by the back door. I never took it down. Can\'t now.', if: 'origin:temple found' },
  ],
  gossip: [
    { t: 'You know the whole town from the temple steps. You don\'t need my gossip. You want it, though. I can tell.', if: 'origin:temple' },
  ],
  news: [
    { t: 'Bran still talks about you at the bellows, when he\'s on his fourth. “Never let the fire drop.” Then he goes quiet about the other boy.', if: 'origin:forge' },
  ],
};

// Mortimer: cathedral (envious, kind)
ORIGIN_LINES.mortimer = {
  greet: [
    { t: 'Oh! The, ah, scholar. Good day. You wouldn\'t happen to remember how they rule a ledger at Highcourt? Two lines or three?', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'I wanted to go, you know. To the school. Father said a clerk learns at the desk. I\'ve been at the desk twenty years. Did they really have a whole room just for maps?', if: 'origin:cathedral', ask: { opts: [
      { tone: 'kind', l: 'Two rooms. I\'ll draw you the shelves from memory.', r: '~He goes pink to the ears. “Would you? I\'d, ah. I\'d frame it.”', tr: 1 },
      { tone: 'joke', l: 'Mostly the maps were of other maps.', r: 'That\'s the best kind! A map of maps! Oh, I\'d have been happy.', tr: 1 },
      { tone: 'blunt', l: 'It\'s not too late to go.', r: 'It is. It is for me. But thank you for saying so.', tr: 0 },
      { tone: 'curious', l: 'What would you have studied?', r: 'Records. Old ones. The ones nobody is allowed to see. ...That came out wrong. Forget I said it.', tr: 0 },
    ] } },
  ],
  news: [
    { t: 'Before you left I gave you my good quill, the grey one, so you wouldn\'t look like a village child. Did it last?', if: 'origin:cathedral', ask: { opts: [
      { tone: 'kind', l: 'It\'s in my satchel now. I never used it for anything but best.', r: '~He has to take his spectacles off and polish them, rather a lot.', tr: 1 },
      { tone: 'joke', l: 'Aldous borrowed it. You know how that ends.', r: 'Oh no. Oh, no. Well. It\'s on his head somewhere.', tr: 1 },
      { tone: 'blunt', l: 'It broke the first week.', r: 'They do, in cold rooms. I should have warned you. I\'m sorry.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'If you ever wanted to look at the old records... no. No, you mustn\'t. I mustn\'t. But you would know how to read them, wouldn\'t you. Properly.', if: 'origin:cathedral', min: 2 },
  ],
  gossip: [
    { t: 'The councilman asked me what books you brought back. I said I didn\'t know. I did know. I said I didn\'t.', if: 'origin:cathedral', min: 2 },
  ],
};

// Voss: cathedral (snide, wary)
ORIGIN_LINES.voss = {
  greet: [
    { t: 'The scholar returns. A year of Highcourt letters, and you came back to light lamps. Such a waste. Or such a choice.', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'I met your carrier at the gate the day you came home. Do you remember? I asked what was in your trunk. You said “books” as though it were an answer.', if: 'origin:cathedral', ask: { opts: [
      { tone: 'blunt', l: 'It was an answer. You didn\'t like it.', r: '~His smile holds. “I like very few answers, Acolyte. Yours fewer than most.”', tr: -1 },
      { tone: 'joke', l: 'Mostly grammar. Terrible for the digestion.', r: 'How droll. Halvard was droll too.', tr: 0 },
      { tone: 'curious', l: 'Why did my books interest you?', r: '~For a moment his face is perfectly still. “A councilman takes an interest in everything that comes through his gate. Good day.”', tr: -1 },
      { tone: 'kind', l: 'You helped carry the trunk in. I thought that was kind.', r: 'It was heavy. I was curious how heavy. Don\'t mistake one for the other.', tr: 0 },
    ] } },
  ],
  gossip: [
    { t: 'Cathedral schools teach children to read archives. Archives are full of old quarrels. Old quarrels are best left to the people who had them.', if: 'origin:cathedral' },
    { t: 'You\'ve been to my clerk\'s office twice this month. A Highcourt habit, I suppose: reading other people\'s papers.', if: 'origin:cathedral', min: 1 },
  ],
  halvard: [
    { t: 'Halvard spent good money sending you south. He must have had reasons. He usually did. One wonders what he hoped you\'d read.', if: 'origin:cathedral !found' },
    { t: 'All that learning, and you still went down the hole after him. Highcourt teaches everything but sense.', if: 'origin:cathedral found' },
  ],
  news: [
    { t: 'I wrote to the cathedral school once, out of curiosity, to ask what you studied. They were most discreet. I admire discretion. In others.', if: 'origin:cathedral', min: 2 },
  ],
  caves: [
    { t: 'I expect you\'ve read some fanciful history about the caves. Kingdoms. Seals. Old reeves keeping peace. Fairy tales for clever children.', if: 'origin:cathedral' },
  ],
};

// Elsbeth: cathedral
ORIGIN_LINES.elsbeth = {
  greet: [
    { t: 'You\'ve the look of someone who has sat in a great library. My father had it. He used to rub his eyes just so.', if: 'origin:cathedral' },
  ],
  self: [
    { t: 'Before you went south I asked you to light a candle for me in the cathedral. You never asked what for. Did you light it?', if: 'origin:cathedral', ask: { opts: [
      { tone: 'kind', l: 'Every seventh day, the whole year. In the side chapel, by the window.', r: '~She has to look at the roses for a long time. “Every seventh day. Oh. Thank you.”', tr: 1, learn: 'Elsbeth asked the hero to light a candle in the cathedral, every week, without saying for whom. It was for the daughter who has no stone.' },
      { tone: 'curious', l: 'I lit it. Who was it for?', r: 'For a little girl who has no stone. Please don\'t say it to Edric. Please.', tr: 0, min: 2, learn: 'Elsbeth\'s cathedral candle was for her daughter, who died in their second winter and has no stone.' },
      { tone: 'pious', l: 'Aurel keeps every lamp lit in our names.', r: 'That\'s what my mother said, about Veyra. I wasn\'t allowed to believe her.', tr: 1 },
      { tone: 'blunt', l: 'I forgot. I\'m sorry.', r: '~She nods, too quickly. “Of course. You were young. It doesn\'t matter.” It does.', tr: -1 },
    ] } },
  ],
  gossip: [
    { t: 'My father kept the Warden archive at Greywatch. He said a good archivist forgets nothing and repeats nothing. I think you learned the first half in Highcourt.', if: 'origin:cathedral', min: 2 },
  ],
  halvard: [
    { t: 'Edric was angry for a week when Halvard sent you south. He wouldn\'t say why. He paced the garden at night, crushing my mint.', if: 'origin:cathedral', min: 3 },
  ],
  gods: [
    { t: 'Did they let you study the green gods at the school, or only Aurel? My mother hung feathers for Veyra. I\'ve never known the words to go with them.', if: 'origin:cathedral' },
  ],
};

// Hobb: hunt and farm
ORIGIN_LINES.hobb = {
  greet: [
    { t: 'There\'s our autumn hand. Greta\'ll want to feed you. She always said you came back from the woods thinner than you went.', if: 'origin:hunt' },
    { t: 'You can still carry a ewe under each arm? Ha. Let\'s not test it.', if: 'origin:farm' },
  ],
  self: [
    { t: 'First autumn we took you out, it rained six days and you snored like a sow. Scared off every deer this side of the stream.', if: 'origin:hunt', ask: { opts: [
      { tone: 'joke', l: 'That was Wil. I was blamed for years.', r: '~He laughs, slow. “Might\'ve been. Wil snores too. Don\'t tell Greta I said.”', tr: 1 },
      { tone: 'kind', l: 'You let me carry the bow home, last day. I\'ve never been so proud.', r: 'You earned it. Went three days without a word of complaint. That\'s more than Wil.', tr: 1 },
      { tone: 'pious', l: 'Veyra sent the rain so I\'d learn to sit still.', r: 'Greta\'d say the same. I\'d say it was autumn.', tr: 0 },
      { tone: 'blunt', l: 'You could have woken me.', r: 'Tried. Tried with a boot.', tr: 0 },
    ] } },
    { t: 'You hauled stone for the east wall, the summer it fell. Every stone. Fenwick Hale swears that wall moved a foot onto his side after. I tell him it was always there.', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'Half a foot. I was being polite.', r: '~A wheezing laugh. “Don\'t you ever tell a Hale that.”', tr: 1 },
      { tone: 'blunt', l: 'I put it back where the old footings were. Exactly.', r: 'Aye. Exactly. That\'s what I tell him.', tr: 1 },
      { tone: 'curious', l: 'What is the quarrel about, anyway?', r: 'Eighty years. Nobody knows. That\'s what makes it worth keeping.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'You did lambing with us three springs. Up at night with a lantern and your arm in a ewe to the elbow. Never flinched. Halvard couldn\'t watch.', if: 'origin:farm' },
    { t: 'You know these sheep by face. That ewe there\'s Bramble. You named her. She\'s still trouble.', if: 'origin:farm' },
    { t: 'Wolves again. You know the Whisperwood edge as well as Wil. Walk the fence with me some dusk.', if: 'origin:hunt !boss:greymaw' },
  ],
  gossip: [
    { t: 'That enchantress. You were out in those woods every autumn. You never saw her do anything... odd?', if: 'origin:hunt !flag:mirela_cleared', ask: { opts: [
      { tone: 'blunt', l: 'I saw her pull me out of a bog. That\'s odd, for a curse-witch.', r: '~He chews on that a long while. “Never told me that.”', tr: 0 },
      { tone: 'kind', l: 'She\'s lonely, Hobb. Not wicked.', r: 'Greta says that. I don\'t know what I think.', tr: 0 },
      { tone: 'curious', l: 'Who told you she cursed the flock?', r: 'Councilman. He\'s educated.', tr: 0 },
    ] } },
  ],
  halvard: [
    { t: 'Halvard blessed the lambs with you holding the lantern. You used to say the words a beat ahead of him. He let you.', if: 'origin:farm' },
    { t: 'He came out to the camp once, at the wood\'s edge, to bring you a warm cloak. Sat by our fire till dawn. Told Wil a story about a fox and a priest. Wil still tells it wrong.', if: 'origin:hunt' },
  ],
  news: [
    { t: 'The grey brute\'s dead. You and Wil, all those autumns. I reckon you were always going to be the ones.', if: 'origin:hunt boss:greymaw' },
  ],
};

// Ned: forge (Dace, Ned and the hero hung round the forge)
ORIGIN_LINES.ned = {
  greet: [
    { t: '~He almost smiles. “Remember when Bran threw all three of us in the quench trough? I still smell it.”', if: 'origin:forge' },
  ],
  self: [
    { t: 'You at the bellows, Dace on the hammer, me holding things wrong. We thought we were smiths.', if: 'origin:forge', ask: { opts: [
      { tone: 'kind', l: 'You held things fine. You just held them close to your face.', r: '~He laughs, then stops. “Dace said that. Exactly that.”', tr: 1 },
      { tone: 'joke', l: 'You held the tongs like a ladle.', r: 'I was going to be a cook, before the gate. Mum\'s idea.', tr: 1 },
      { tone: 'curious', l: 'Where\'s the horseshoe sword?', r: 'Dace kept it. Under his bed. He said we\'d need it someday. Gods.', tr: 0 },
    ] } },
    { t: 'The horseshoe sword. You hammered, Dace bent it, I quenched it in the rain barrel and it cracked in two. Bran put us in the trough, then laughed so hard he had to sit.', if: 'origin:forge', learn: 'As children, the hero, Dace and Ned made a sword from a horseshoe at Bran\'s forge. Dace kept it under his bed.' },
  ],
  gossip: [
    { t: 'Dace used to say you were the only one Bran ever praised. Dace minded. He minded a lot. He never minded you, though.', if: 'origin:forge', min: 2 },
  ],
  halvard: [
    { t: 'Halvard came to fetch you every dusk and fetched us home too. Dace first, then me. Like ducklings, he said.', if: 'origin:forge' },
  ],
  news: [
    { t: 'I told him. Bran. You\'d know how hard. You grew up in that forge with us.', if: 'origin:forge flag:dace_told' },
  ],
};

// Maren: farm (fleece)
ORIGIN_LINES.maren = {
  greet: [
    { t: 'You. Hobb\'s fleece-boy. Fleece-hand. Whatever. You\'ve finally washed your hands, I see.', if: 'origin:farm' },
  ],
  self: [
    { t: 'You carried Hobb\'s clip to my door four summers running. The second summer you dropped a whole fleece in the pond, and fished it out, and tried to tell me it had been washed.', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'It had been washed. Thoroughly. With pond.', r: '~A sound comes out of her that might, on someone else, be a laugh. “Hmph.”', tr: 1 },
      { tone: 'kind', l: 'You showed me how to skirt a fleece after. I still do it right.', r: 'Do you. Show me. ...Acceptable.', tr: 1, learn: 'Maren taught the hero to skirt a fleece, after the hero dropped one of Hobb\'s in the pond.' },
      { tone: 'blunt', l: 'You charged Hobb for it anyway.', r: 'Of course I did. Wet wool weighs more.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'Hobb sells half his clip to that river woman now. You know his sheep. Tell him the river dyes rot good wool.', if: 'origin:farm' },
  ],
  gossip: [
    { t: 'Hobb still asks after you when he brings the clip. Then he tells me you skirted cleaner than that big Thornbury lad. Then he haggles. Every year.', if: 'origin:farm' },
    { t: 'My brother wanted to go to that school in Highcourt, you know. The one Halvard sent you to. Father said no. Mortimer cried in the loom-room.', if: 'origin:cathedral' },
  ],
  halvard: [
    { t: 'He paid me in coppers for a scarf for you, the autumn you went out to the farms. Brown. Practical. I put a green thread in the edge. You never noticed.', if: 'origin:farm' },
  ],
};

// Abel: forge (hoops)
ORIGIN_LINES.abel = {
  greet: [
    { t: 'Brought me any hoops? No, of course not. Old habit. You used to come up the lane with three round your neck.', if: 'origin:forge' },
  ],
  self: [
    { t: 'You rolled one of Bran\'s hoops down the whole high street once, with a stick. Straight through the door of the Fox and under Rolf\'s table.', if: 'origin:forge', ask: { opts: [
      { tone: 'joke', l: 'Rolf gave it a pint. Said anyone who got that far had earned one.', r: '~Abel smiles, slow. “That sounds like Rolf.”', tr: 1 },
      { tone: 'kind', l: 'I said sorry to every stall. Bran made me.', r: 'He did. He came round after and paid for the eggs.', tr: 1 },
      { tone: 'curious', l: 'Did you ever use that hoop?', r: 'On the twins\' toy barrel. It was a finger too small for anything else. You made it a finger too small.', tr: 1, learn: 'The hoop on the Cooper twins\' toy barrel is one the hero made, a finger too small, in Bran\'s forge.' },
    ] } },
  ],
  work: [
    { t: 'Bran never charged me for hoops. You never charged me for carrying them. Between you, I owe the forge a barrel I\'ll never finish paying.', if: 'origin:forge' },
  ],
  gossip: [
    { t: 'Tam wants to know if you really worked at the forge. He thinks it means you can bend iron with your hands. Don\'t correct him. Please.', if: 'origin:forge duty:abel_twins' },
  ],
  halvard: [
    { t: 'Sela says Halvard baptized the twins with forge-black on his sleeves, because he\'d been helping you carry coal. Water all down his front, and soot.', if: 'origin:forge' },
  ],
};

// Gil: hunt
ORIGIN_LINES.gil = {
  greet: [
    { t: '~He nods. After a while: “Still quiet. Good.”', if: 'origin:hunt' },
  ],
  self: [
    { t: 'The Thatchers camped by the river, your second autumn. You came down at dawn and watched me tickle a trout. Didn\'t say a word for an hour.', if: 'origin:hunt', ask: { opts: [
      { tone: 'kind', l: 'Liss brought us smoked eel that night. I remember her laughing at Wil.', r: '~A long silence. Then: “Aye. She liked you. Said you sat still like a heron.”', tr: 1, learn: 'Gil taught the hero to tickle trout on a hunting autumn. Liss liked the hero; she said they sat still like a heron.' },
      { tone: 'joke', l: 'I tried it after. I caught a boot.', r: 'Boots are easy. Trout are honest.', tr: 1 },
      { tone: 'pious', l: 'Nemora\'s water was very still that morning.', r: 'It was. It isn\'t, now. Under the lilies.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'Hands flat. Slow. Under the belly. You remember.', if: 'origin:hunt' },
  ],
  gods: [
    { t: 'Hunters thank Veyra. Fishers thank Nemora. You learned both. Most don\'t bother with one.', if: 'origin:hunt' },
  ],
  caves: [
    { t: 'You read water like Wil reads tracks. Look at the pond, then. Cold from below. That\'s not spring water.', if: 'origin:hunt' },
  ],
};

// Old Berta: temple
ORIGIN_LINES.berta = {
  greet: [
    { t: 'There\'s my little kindling-carrier! Come in, dear. You don\'t have to bring sticks now. Though you may.', if: 'origin:temple' },
  ],
  self: [
    { t: 'Every week for years you trotted behind Halvard with your own bundle of sticks, three or four, very serious. Do you remember the snowy one?', if: 'origin:temple', ask: { opts: [
      { tone: 'kind', l: 'I fell flat in the lane and the sticks went everywhere. You came out in your shawl to help.', r: 'And Halvard laughed so hard he dropped his. Oh, I\'d give a year to hear that laugh.', tr: 1 },
      { tone: 'joke', l: 'I blamed the sticks. They were very slippery sticks.', r: '~She laughs until she coughs, and waves you off when you rise. “Slippery sticks!”', tr: 1 },
      { tone: 'curious', l: 'Why did he come every week, Berta?', r: 'Because he owed me, dear, and he knew it, and he never let me forget he was paying. One day I\'ll tell you why. Not with the window open.', tr: 0, min: 2 },
    ] } },
    { t: 'You know which board in the parsonage floor creaks. Your mother knew every stone in our square the same way. ...Never mind me, dear.', if: 'origin:temple', min: 4, learn: 'Berta let slip that the hero\'s mother knew every stone of a village square, the way the hero knows the parsonage floor.' },
  ],
  gods: [
    { t: 'You say the hearth line in the dawn words. They said it like that where I come from too. Don\'t ask where, dear. Just keep saying it.', if: 'origin:temple' },
  ],
  halvard: [
    { t: 'He used to say you\'d be a better priest than him because you\'d never had to unlearn anything. I said give it time.', if: 'origin:temple !found' },
    { t: 'Eighteen years of firewood, and half of it you carried. I\'ll miss the both of you on my step. Well. One of you.', if: 'origin:temple found' },
  ],
  gossip: [
    { t: 'I gave you a lavender bag for your pillow when you were six. You still smell of it, a little. Or I imagine it.', if: 'origin:temple' },
  ],
};

// Garrick: forge (cleavers) and hunt (bought their first deer)
ORIGIN_LINES.garrick = {
  greet: [
    { t: 'The cleaver-sharpener! I still get compliments on that edge. From the bones, mostly.', if: 'origin:forge' },
    { t: 'Ho! My first hunter! Have you got a deer behind you? No? I\'ll forgive you. This once.', if: 'origin:hunt' },
  ],
  self: [
    { t: 'Bran sent you over with my cleavers every month that summer. One time you put such an edge on the big one I went clean through the block. Through the BLOCK. Rosamund\'s old block. I laughed and then I cried a bit.', if: 'origin:forge', ask: { opts: [
      { tone: 'kind', l: 'I\'m sorry about the block. I didn\'t know it was hers.', r: 'Don\'t be! It was the best thing that happened to it. I keep the two halves by the door.', tr: 1 },
      { tone: 'joke', l: 'You never asked me to sharpen it again.', r: 'Fear, young one. Pure fear. I like my fingers.', tr: 1 },
      { tone: 'curious', l: 'Who sharpens them now?', r: 'Bran\'s new lad. He\'s good. He\'s not you. Don\'t tell him I said.', tr: 0 },
    ] } },
    { t: 'Your first deer! A scrawny yearling, and you asked a gold for it with a face like a magistrate. I paid it. It wasn\'t worth half. Best gold I ever spent.', if: 'origin:hunt', ask: { opts: [
      { tone: 'kind', l: 'I bought Halvard a new lamp with it.', r: '~He goes quiet and very red. “Did you. Did you now. Well.”', tr: 1, learn: 'Garrick overpaid for the hero\'s first deer, and the hero spent the gold on a new lamp for Halvard.' },
      { tone: 'joke', l: 'I\'d have taken ten coppers. You never haggled.', r: 'I never haggle with children or priests! You were both!', tr: 1 },
      { tone: 'blunt', l: 'It was worth a gold. Fine haunches.', r: 'Fine haunches! It had legs like a stool! Ha!', tr: 0 },
    ] } },
  ],
  how: [
    { t: 'Grand, grand! Edges holding. Bran\'s new lad does them now. Good lad. Doesn\'t sing at the wheel like you did, though.', if: 'origin:forge' },
  ],
  news: [
    { t: 'Wil Thatcher brings me venison now. Good cuts. You taught him the hunter\'s cut, he says. He says it like he taught you.', if: 'origin:hunt' },
  ],
  gossip: [
    { t: 'You used to walk the cleavers over from the forge wrapped in a sack, held out in front like a bishop with a relic. Whole market ring cleared a path.', if: 'origin:forge' },
  ],
  work: [
    { t: 'Every hook in my smokehouse, you\'ve handled. Bran forged them, you carried them, I hung them. They\'ll outlast the lot of us.', if: 'origin:forge' },
    { t: 'Still know the hunter\'s cut? Bring me something and do it yourself, and I\'ll pay you the gold rate. For old times.', if: 'origin:hunt' },
  ],
  halvard: [
    { t: 'He came to the yard after your first deer, all blushing, to say thank you for paying too much. Then he stayed and helped me salt it. That\'s how we started talking, him and me. That\'s how the letters started, after.', if: 'origin:hunt' },
  ],
};

// Fenwick: farm (the drovers' ring)
ORIGIN_LINES.fenwick = {
  greet: [
    { t: 'The pen-boy! The gate-minder! Lot one, a fine young acolyte, sound in wind and limb, who do I hear?', if: 'origin:farm' },
  ],
  self: [
    { t: 'You minded the pen gates at the ring two seasons. The day the Highfold bull got loose and came through my rostrum, do you remember who stood in front of it?', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'You did. Singing at it.', r: 'Singing at it! And it STOPPED! Best sale of the year after. Everybody bid out of sheer nerves.', tr: 1 },
      { tone: 'kind', l: 'I only got the rope on him because you held his eye.', r: 'Ah, you\'re generous. You were also hanging off his horn. I saw it.', tr: 1 },
      { tone: 'blunt', l: 'I did. You hid behind the gavel table.', r: '~He clears his throat. “A strategic position. I could see better.”', tr: 0 },
    ] } },
  ],
  gossip: [
    { t: 'You hauled stone for the Thatchers\' wall. Don\'t deny it, I saw you. That wall walked a foot onto Hale land that summer. I\'ve a book that says so.', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'Walls walk. It\'s a known thing with walls.', r: 'Ha! Then it can walk back! I\'ll call the sale!', tr: 1 },
      { tone: 'blunt', l: 'It\'s on the old footings, Fenwick.', r: '~He waves the gavel. “Footings! Footings, he says. Eighty years of footings.”', tr: 0 },
      { tone: 'curious', l: 'Do you even know what the quarrel is?', r: 'Not a notion. Grandfather didn\'t either. That\'s tradition, friend.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'You can still tell a sound beast from a dressed-up one at twenty paces? Good. Stand by me on market day. I like an honest face by the rail.', if: 'origin:farm' },
  ],
  halvard: [
    { t: 'He came down to the ring on market day to watch you work. Never bid. Stood at the rail and hummed while I sang. In tune, too.', if: 'origin:farm' },
  ],
};

// Ewan: hunt and farm (Highfold drives)
ORIGIN_LINES.ewan = {
  greet: [
    { t: '~The dogs reach you before he does, tails going. “They remember the drives. So do I.”', if: 'origin:farm' },
    { t: 'You and the Thatcher boy. Sat up two nights over my herd at the wood\'s edge. I haven\'t forgot.', if: 'origin:hunt' },
  ],
  self: [
    { t: 'Your first drive up to Highfold, you left salt on the cairn by the ring gate and forgot the coin. I made you walk back a mile.', if: 'origin:farm', ask: { opts: [
      { tone: 'pious', l: 'Korrum wants both. Salt for the work, coin for the debt.', r: '~A slow nod. “You did listen. Grandfather built that cairn.”', tr: 1, learn: 'Ewan made the hero walk back a mile on a Highfold drive to leave the forgotten coin on his grandfather\'s cairn.' },
      { tone: 'joke', l: 'A mile uphill. Both ways, somehow.', r: 'That\'s Highfold. Everything\'s uphill both ways.', tr: 1 },
      { tone: 'blunt', l: 'It was a copper. Korrum didn\'t need it.', r: 'Not about need. About remembering.', tr: -1 },
      { tone: 'kind', l: 'You walked back with me. You didn\'t have to.', r: 'Dogs wanted to go. I go where the dogs go.', tr: 1 },
    ] } },
    { t: 'The autumn the wolves took my calf at the wood\'s edge, you and young Wil sat up over the herd two nights in the frost. Second night you put an arrow in the fence post a hand from my best dog.', if: 'origin:hunt', ask: { opts: [
      { tone: 'joke', l: 'It was a warning shot. For the fence post.', r: '~The corner of his mouth goes. “Dog never forgave the post either.”', tr: 1, learn: 'The hero and Wil Thatcher sat up two frosty nights over Ewan\'s herd after wolves took a calf. The hero nearly shot his best dog.' },
      { tone: 'blunt', l: 'Your dog moved like a wolf in the dark.', r: 'Fair. He does. That\'s why I keep him.', tr: 0 },
      { tone: 'kind', l: 'I gave him my supper after, to say sorry.', r: 'He remembers. That\'s why he still runs to you.', tr: 1 },
    ] } },
  ],
  work: [
    { t: 'You can still turn a heifer with a whistle? Show me. ...Close enough. The dogs did it.', if: 'origin:farm' },
    { t: 'Wolves on the drove road again. You know the tracks. I\'d take you over a hired man.', if: 'origin:hunt !boss:greymaw' },
  ],
  caves: [
    { t: 'You\'ve been up the high road past the adits on the drives. Then you\'ve felt it too. The dogs won\'t go near now. Green lights. I said.', if: 'origin:farm', min: 2 },
  ],
  gods: [
    { t: 'Hunters give Veyra the first cut. Up our way we give Korrum the salt. You do both. Good. Don\'t cheat either.', if: 'origin:hunt' },
  ],
  gossip: [
    { t: 'Hobb says you and Wil are why the grey wolf is dead. I believe it. You both sit still. Rare, in the valley.', if: 'origin:hunt boss:greymaw' },
  ],
  halvard: [
    { t: 'He walked up to bless the herds the year you drove with me. Sat by the shieling fire and fell asleep mid-blessing. You finished it for him.', if: 'origin:farm' },
  ],
};

// Wendell: hearsay and town memory
ORIGIN_LINES.wendell = {
  greet: [
    { t: 'The temple\'s child! You used to come in for the lamp oil with the coppers clutched so tight they were warm. I gave you an extra splash. Don\'t tell Marta.', if: 'origin:temple' },
    { t: 'My scholar! Come and tell me if I\'ve spelt “candles” right on the slate. Marta says I haven\'t.', if: 'origin:cathedral' },
  ],
  gossip: [
    { t: 'Bran\'s apprentice! The whole lane heard you two at the anvil. Bang, bang, swear. Bang, bang, swear. Very regular. You could set a clock.', if: 'origin:forge' },
    { t: 'Hobb paid you in mutton and Jory paid you in flour, and you brought both here to trade for rope. Shrewdest farmhand I ever dealt with.', if: 'origin:farm' },
  ],
};

// Ilse: hearsay (one season in town)
ORIGIN_LINES.ilse = {
  gossip: [
    { t: 'Hobb Thatcher says you know his sheep by name. Tell me which give the long staple and I\'ll owe you a bolt of blue.', if: 'origin:farm' },
    { t: 'They tell me you spent a year in Highcourt! Then you know the cathedral cloth merchants are thieves in velvet. Say yes.', if: 'origin:cathedral' },
  ],
  work: [
    { t: 'The weaver says you used to carry Hobb\'s clip to her door. She says it like it makes you hers. Wool doesn\'t belong to anyone till it\'s paid for.', if: 'origin:farm' },
    { t: 'You smell of the forge less than Bran\'s new lad. They say you pumped his bellows once. Know anyone who can mend an axle-iron cheap?', if: 'origin:forge' },
  ],
};

// Hester: temple
ORIGIN_LINES.hester = {
  greet: [
    { t: 'Sit, sit. Don\'t hover. You hovered as a child too. Halvard taught you that.', if: 'origin:temple' },
  ],
  self: [
    { t: 'You came with him at dawn, the spring you were seven, to bless my oven. You ate the blessing loaf before he\'d blessed it. The whole thing. Hot.', if: 'origin:temple', ask: { opts: [
      { tone: 'joke', l: 'It was very good bread. I was being thorough.', r: '~She cackles. “Thorough! That\'s what he said! He blessed the crumbs.”', tr: 1 },
      { tone: 'kind', l: 'You made another one before the sun was up. You didn\'t say a word.', r: 'Of course I didn\'t. You were crying. I don\'t hold with children crying over bread.', tr: 1 },
      { tone: 'pious', l: 'Aurel blesses the hungry first.', r: 'Hmph. That\'s cheek dressed up as scripture. Halvard\'s, exactly.', tr: 0 },
    ] } },
    { t: 'He stole a bun every morning for a year. You stole one every morning for three. I left the best ones by the window for both of you.', if: 'origin:temple', learn: 'Hester left the best bun by the window for Halvard as a boy, and again for the hero.' },
  ],
  halvard: [
    { t: 'The night he brought you home he knocked here first, for warm milk. You took it from a rag. You wouldn\'t stop crying till I sang. Don\'t tell Marta I sing.', if: 'origin:temple', min: 3 },
    { t: 'He used to say you knew the parsonage better than he did. Every creak. He said he couldn\'t sneak a biscuit past you.', if: 'origin:temple !found' },
  ],
  gods: [
    { t: 'You say the dawn words properly. Marta says them prettily. There\'s a difference. Mind you keep it.', if: 'origin:temple' },
  ],
  gossip: [
    { t: 'Pippa wants to be you. I let Marta think it\'s the robes. It\'s not the robes.', if: 'origin:temple' },
  ],
};

// Hedda: farm
ORIGIN_LINES.hedda = {
  greet: [
    { t: 'You. I washed half the east fields out of your shirts, those summers. Thought you\'d never come back clean.', if: 'origin:farm' },
  ],
  self: [
    { t: 'Lambing seasons. Your shirts came to my copper looking like you\'d been born a second time. I kept a special pot of lye just for you.', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'I called it my lambing robe. Very holy.', r: '~Her mouth moves, nearly. “It was holy. Holes all through it.”', tr: 1 },
      { tone: 'kind', l: 'You never charged Halvard for those. I know you didn\'t.', r: 'Mind your own business. ...He paid in prayers for Col. Fair trade.', tr: 1, learn: 'Hedda never charged Halvard for washing the hero\'s farm shirts. He paid in prayers for her husband Col.' },
      { tone: 'blunt', l: 'It was mostly blood and dung.', r: 'I know what it was. I\'m Highfold.', tr: 0 },
    ] } },
    { t: 'You went up to Highfold with Ewan on the drives. Did you drink at the spring by the Stane shieling? My father\'s. Water so cold it hurts your teeth.', if: 'origin:farm', ask: { opts: [
      { tone: 'kind', l: 'I did. There\'s still a cup on a nail there.', r: '~She stops wringing. “His cup. Still there.” She goes back to wringing, harder.', tr: 1 },
      { tone: 'curious', l: 'Do you miss it?', r: 'Every day. I\'d never go back. Both true. That\'s Highfold.', tr: 0 },
      { tone: 'pious', l: 'I left salt on his cairn too.', r: 'Good. Someone ought to.', tr: 1 },
    ] } },
  ],
  work: [
    { t: 'Grass stains want cold water and patience. You never had the patience. I did it for you. You can do your own now.', if: 'origin:farm' },
  ],
  gossip: [
    { t: 'Ned says you worked Bran\'s bellows with him and the Hollin boy. All three of you came home black. I washed that too.', if: 'origin:forge' },
  ],
  halvard: [
    { t: 'His robes came with your farm mud on them as well as his own, those years. He carried you home on his back more than once. Asleep.', if: 'origin:farm' },
  ],
};

// Jory: farm (the mill)
ORIGIN_LINES.jory = {
  greet: [
    { t: 'The sack-hauler! THE SACK-HAULER! Come in, mind the dust. You know about the dust.', if: 'origin:farm' },
  ],
  self: [
    { t: 'Harvest you were twelve you went into the millrace after a sack. After a SACK. I had you out by the collar before the wheel saw you. Remember? Eh?', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'I saved the sack, though.', r: 'You did! You did! Soaked, and you saved it! I paid you for it. Paid you twice!', tr: 1, learn: 'Jory pulled the hero out of his millrace one harvest, the hero still holding the sack they went in after.' },
      { tone: 'kind', l: 'You never told Halvard. Thank you.', r: 'Eh? Never told? Never told him? ...No. I never did. Some things a man keeps.', tr: 1 },
      { tone: 'blunt', l: 'You pushed me in.', r: 'I DID NOT! ...I might have. I might have backed into you. Old men back into things.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'You can still carry a full sack up the ladder? A full SACK? Don\'t. My back hurts watching you think about it.', if: 'origin:farm' },
  ],
  halvard: [
    { t: 'He stood in the race to bless the wheel every spring, and you stood on the bank holding his boots. Every spring! Like a little heron with boots.', if: 'origin:farm' },
  ],
  gossip: [
    { t: 'Hobb pays his hands in mutton. I paid you in flour. Who fed you better? ME. I FED YOU BETTER.', if: 'origin:farm' },
    { t: 'Abel says you pumped Bran\'s bellows. Bellows! Wind and fire! Water\'s better. Water\'s always better.', if: 'origin:forge' },
  ],
};

// Bess: hearsay (arrived after the hero's youth)
ORIGIN_LINES.bess = {
  gossip: [
    { t: 'Uncle Rolf says you used to come to that back door with a lantern for Halvard. He says it like it was yesterday. He says everything about Halvard like it was yesterday.', if: 'origin:temple' },
    { t: 'Bran\'s apprentice, they say. That\'s why he drinks slower when you\'re in. He doesn\'t want you to see him on his fifth.', if: 'origin:forge' },
    { t: 'You\'re the one who ran with the Thatchers? Then you can tell me if Wil really eats nothing but jerky. He orders stew and looks at it like it\'s a trap.', if: 'origin:hunt' },
  ],
};

// Nettie: grew up in town before service
ORIGIN_LINES.nettie = {
  greet: [
    { t: 'You sold Da your first deer. He told me in a letter. It was the only letter he ever sent me, and someone else wrote it.', if: 'origin:hunt' },
    { t: 'You used to bring Da\'s cleavers back from Bran\'s, when I was small. You let me carry the little one. Da nearly died.', if: 'origin:forge' },
  ],
  gossip: [
    { t: 'A year at the cathedral school. I learned my letters in a factor\'s pantry by candle-end. Don\'t mind me. I\'m only a bit jealous. Teach me something?', if: 'origin:cathedral' },
    { t: 'You did harvest at the mill. Jory Miller still tells it. Loud.', if: 'origin:farm' },
  ],
};

// Wil: hunt
ORIGIN_LINES.wil = {
  greet: [
    { t: 'You came back to the woods without me? Rude. Was the grey one still there?', if: 'origin:hunt !boss:greymaw' },
    { t: 'Greymaw\'s dead. I heard it was you. I always said if anyone, you or me. I\'m glad it was you, mostly.', if: 'origin:hunt boss:greymaw' },
  ],
  self: [
    { t: 'The boar. Third autumn. You up the oak, me up the birch, and Da underneath shouting advice and doing nothing. Four hours.', if: 'origin:hunt', ask: { opts: [
      { tone: 'joke', l: 'Your birch was shorter. I had the view.', r: 'You had the acorns! Thrown at me! For four hours!', tr: 1, learn: 'Wil and the hero spent four hours treed by a boar one autumn, the hero up an oak, Wil up a birch, Hobb below.' },
      { tone: 'kind', l: 'You talked the whole time so I wouldn\'t be scared.', r: '~He looks away. “Talked so I wouldn\'t be. Same thing.”', tr: 1 },
      { tone: 'blunt', l: 'You missed it twice before it treed us.', r: 'Once! The second was a warning shot. ...Fine. Twice.', tr: 0 },
      { tone: 'pious', l: 'Veyra kept us up those trees for a reason.', r: 'Aye. To teach Da patience. Didn\'t work.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'Walk on the wet leaves. ...You already do. Good. Most folk forget in a year.', if: 'origin:hunt' },
  ],
  gods: [
    { t: 'You still leave the first cut at the stone? I\'ve seen your knots on the antlers. Nobody else ties a reef that badly.', if: 'origin:hunt' },
  ],
  gossip: [
    { t: 'You never told Da about the fog and the enchantress. I worked it out. I\'ve been leaving bread by her birch since. Don\'t tell him that either.', if: 'origin:hunt' },
  ],
  halvard: [
    { t: 'Halvard came to the camp with a cloak for you and stayed all night telling the fox-and-the-priest. I tell it better, but his was first.', if: 'origin:hunt' },
  ],
  caves: [
    { t: 'You know the north woods. Notice how the deer won\'t cross the old track past the watchtower? Not since spring.', if: 'origin:hunt' },
  ],
};

// Oren: forge (a newcomer; met the hero once at Weyford)
ORIGIN_LINES.oren = {
  greet: [
    { t: 'Fellow bellows-hand! Master Hollin says you never let the fire drop. He says it at me. Pointedly.', if: 'origin:forge' },
  ],
  self: [
    { t: 'I\'ve met you before, you know. Years back. Master Hollin brought a child down to my father\'s forge at Weyford to buy bar iron, and the child got too close to our big hearth and lost both eyebrows.', if: 'origin:forge', ask: { opts: [
      { tone: 'joke', l: 'They grew back. Mostly. The left one has opinions now.', r: 'Ha! It does! I thought that was just your face!', tr: 1 },
      { tone: 'kind', l: 'You gave me a wet rag and didn\'t laugh. I remember that.', r: 'I laughed later. Out the back. For about an hour.', tr: 1, learn: 'Oren met the hero years ago at his father\'s forge in Weyford, the day the hero lost both eyebrows to the hearth.' },
      { tone: 'blunt', l: 'Your hearth was badly banked.', r: 'That\'s what Master Hollin said! My father hasn\'t forgiven him.', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'There are notches cut in the bellows handle. Two rows. Master Hollin says they\'re yours, one for each day you didn\'t let the fire drop. I\'ve started my own row. It\'s shorter.', if: 'origin:forge' },
    { t: 'Show me how you hold the tongs? He won\'t. He just grunts and says “like the other one did”.', if: 'origin:forge' },
  ],
  gossip: [
    { t: 'He leaves me the good bread now. But he set two places at supper last week, without thinking, and stared at the second one. Dace\'s or yours, I don\'t know.', if: 'origin:forge' },
  ],
  halvard: [
    { t: 'Rolf says Halvard used to stand in the forge door watching you work. Bran still glances at it, round dusk. I didn\'t know why till now.', if: 'origin:forge' },
  ],
};

// Tam Cooper: six
ORIGIN_LINES.tam = {
  greet: [
    { t: 'Dad says you worked at the FORGE. So you can bend iron. With your HANDS. Do it. Do it on that.', if: 'origin:forge' },
    { t: 'Is it true you got chased up a tree by a pig? A BIG pig? Wil said. Wil said it had TUSKS.', if: 'origin:hunt' },
  ],
  gossip: [
    { t: 'Dad says the hoop on my barrel is yours. It\'s too small. I like it best.', if: 'origin:forge' },
    { t: 'Grandad says you fell in the millrace. Did you see fish? Did the wheel try to eat you? I\'d have fought it.', if: 'origin:farm' },
  ],
};

// Lark Cooper: six
ORIGIN_LINES.lark = {
  greet: [
    { t: 'Grandad says you carried forty sacks in one day at harvest. I think it was thirty-one. He rounds.', if: 'origin:farm' },
    { t: 'You went to a school with a thousand books. Mum said. Did you count them? Somebody should.', if: 'origin:cathedral' },
  ],
  gossip: [
    { t: 'Hobb has sixty-two sheep. Sixty-three if you count the one in the ditch. Did you know them all when you worked there? Which one is Bramble?', if: 'origin:farm' },
    { t: 'There are nineteen lamps in the temple. You light them in the same order every time. I watched. Left side first.', if: 'origin:temple' },
  ],
};

// Rowan Pell: farm (newcomer from Thornbury)
ORIGIN_LINES.rowan = {
  greet: [
    { t: 'Hobb says you were his best hand before me. I\'ve stopped asking about you. Every answer is “you\'ll never stack a wall like that one”.', if: 'origin:farm' },
  ],
  self: [
    { t: 'Thornbury harvest fair, years back. Hobb brought a Brambleford stripling who tried to beat me at the stone-lift. You didn\'t win. You didn\'t let go, either. Took two men to take the stone off you.', if: 'origin:farm', ask: { opts: [
      { tone: 'joke', l: 'I was holding it for you. Seemed tired.', r: '~He laughs so hard he hits his head on the beam. “Gods. That was you. Ivy! IVY! It was this one!”', tr: 1, learn: 'Rowan Pell beat the hero at the stone-lift at Thornbury harvest fair years ago. The hero would not let go of the stone.' },
      { tone: 'kind', l: 'You bought me a cider after. Thornbury cider.', r: 'Best in the valley. You said it was too sweet. I\'ve thought less of you ever since.', tr: 1 },
      { tone: 'blunt', l: 'You cheated. You lifted with your knees.', r: 'That\'s not cheating! That\'s lifting!', tr: 0 },
    ] } },
  ],
  work: [
    { t: 'Show me the lambing trick Hobb keeps talking about. The arm-in-to-the-elbow one. ...Actually, describe it from over there.', if: 'origin:farm' },
    { t: 'You know where the Hale line runs? Hobb says one thing, Fenwick says another, and I\'ve been told to plough exactly between them.', if: 'origin:farm' },
  ],
  gossip: [
    { t: 'Hobb\'s boy says you hunted with them. Quiet as an owl. I can\'t be quiet. I tried once and a deer laughed at me.', if: 'origin:hunt' },
  ],
  halvard: [
    { t: 'The priest who blessed our Thornbury lambing pen had a child with him, holding the bucket. Sheep went quiet as stones. Was that you? It was, wasn\'t it.', if: 'origin:farm' },
  ],
};

// Ivy Pell: hearsay
ORIGIN_LINES.ivy = {
  gossip: [
    { t: 'Maren says you dropped a fleece in the pond once and tried to pass it off as washed. She told me as a warning. I took it as a recommendation.', if: 'origin:farm' },
    { t: 'You were at Highcourt? Did you see the cathedral hangings? The gold work on the dawn panel? I\'ve only seen a drawing. Tell me every stitch.', if: 'origin:cathedral' },
    { t: 'Maren says you grew up in the temple. Then you know where the old altar cloth is kept. She asks about it. Don\'t say I said.', if: 'origin:temple' },
  ],
};

// Mags Tenney: hearsay
ORIGIN_LINES.mags = {
  gossip: [
    { t: 'Smith says you were his bellows-hand. He\'s making iron tyres for my cart that isn\'t. Tell him he doesn\'t have to. He won\'t listen to me.', if: 'origin:forge' },
    { t: 'Grew up in this temple? Then it\'s your house we\'re sleeping in. I\'ll keep it swept. That\'s a carter\'s promise.', if: 'origin:temple' },
  ],
  work: [
    { t: 'You know the farms. If any of them want a draught-ox handled, I\'m the woman. Don\'t look at me like that. I can still drive one.', if: 'origin:farm' },
  ],
};

// Davy Tenney: hearsay
ORIGIN_LINES.davy = {
  greet: [
    { t: 'Wil says you can walk so quiet the deer don\'t hear. I\'m practising. Did you hear me? You didn\'t. You did. You didn\'t.', if: 'origin:hunt' },
    { t: 'You lived here all your life? In the temple? Then you know where the best hiding place is. I won\'t tell. I\'m a guard.', if: 'origin:temple' },
  ],
  gossip: [
    { t: 'The smith says you were good at bellows. Can you make me a real spear-head? Only small. Mum doesn\'t have to know.', if: 'origin:forge' },
  ],
};

// Linnet Ashby: hearsay
ORIGIN_LINES.linnet = {
  gossip: [
    { t: 'Aunt Berta says you carried her firewood since you could walk. She says it like a grandmother says things. I think you might be family, in the way that counts.', if: 'origin:temple' },
    { t: 'You did the Thornbury harvest fair with Hobb? My grandmother sold honey two stalls down from the stone-lift. She remembers a Brambleford child who wouldn\'t let go of the stone.', if: 'origin:farm' },
    { t: 'A cathedral scholar. Then maybe you can read Aunt Berta\'s old letters for me. The ink\'s gone brown and the hand is small. The last ones frighten me a little.', if: 'origin:cathedral', min: 2 },
  ],
};
