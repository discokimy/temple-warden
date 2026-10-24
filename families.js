// The Temple Warden — families: who belongs to whom in Brambleford, where their people came from, and the new
// faces who arrive as the seasons turn. Conversations about all this live in dialogue.js ("Your family…",
// "Where are you from?"); the parish ledger shows what you've learned. The data is at the bottom of this file.
'use strict';

const FAMILY = {}, NEW_FIGS = {}, ARRIVE_NEWS = {};

// the valley and the roads out of it
const REGION = {
  brambleford: { name: 'Brambleford', note: 'founding family', blurb: 'The village on the Bramble, founded about 190 years ago when the King\'s Road was cut along the valley.' },
  thornbury:   { name: 'Thornbury', blurb: 'A day east along the valley: orchards, sheep, cider, and a bigger market than Brambleford will admit.' },
  weyford:     { name: 'Weyford', blurb: 'Half a day south, where the Bramble meets the Silverrun: a ford, a toll bridge and the big watermill.' },
  highfold:    { name: 'Highfold', blurb: 'The high pastures under Korrum\'s peaks: stone shielings, cairns with salt and coin, plain dry people.' },
  ashvale:     { name: 'Ashvale', blurb: 'Three days north over the cliff road. It burned eighteen years ago. Nobody says the name loudly.' },
  greywatch:   { name: 'Greywatch', blurb: 'The Wardens\' grey fortress-town, far to the north.' },
  kettlecross: { name: 'Kettle Cross', blurb: 'A crossroads waystation two days south-west, where the caravans gather and the raiders strike.' },
  highcourt:   { name: 'Highcourt', blurb: 'The cathedral city and the Crown\'s seat, a week south-east. The Arcanum is there.' },
  corvanne:    { name: 'Corvanne', blurb: 'A river city far to the south: bridges, palm-readers and jewelers.' },
  lowmere:     { name: 'Lowmere', blurb: 'A river city of barges and dye-yards, far to the south on the Silverrun.' },
  lethwen:     { name: 'Lethwen', blurb: 'A village of Mirela\'s mother\'s people in the deep Whisperwood, under trees older than Highcourt.' },
  saltmere:    { name: 'Saltmere', blurb: 'A fishing village on the grey coast, far to the south-west.' },
};

// the new townsfolk: where they live, and when they come
//   home: 'kind:<landmark kind>' | 'text:<words on the cottage door>' | 'temple'
//   day: arrives that morning at the latest; alt: a condition (dialogue.js tokens) that brings them sooner;
//   duty: arrives the day after that parish duty is done
const NEWCOMERS = {
  hester: { home: 'text:baker\'s house', day: 1 },
  hedda:  { home: 'text:tidy timber house', day: 1 },
  jory:   { home: 'text:Millers\' house', day: 1 },
  bess:   { home: 'kind:inn', day: 3 },
  nettie: { home: 'kind:butcher', day: 4 },
  wil:    { home: 'text:Thatchers\'', day: 6, alt: 'boss:greymaw' },
  tam:    { home: 'text:Coopers\'', duty: 'abel_twins' },
  lark:   { home: 'text:Coopers\'', duty: 'abel_twins' },
  rowan:  { home: 'kind:barn', day: 8 },
  ivy:    { home: 'kind:inn', day: 8 },
  oren:   { home: 'kind:weapons', day: 11, duty: 'bran_dace' },
  mags:   { home: 'temple', day: 15, alt: 'event:raids day:10' },
  davy:   { home: 'temple', day: 15, alt: 'event:raids day:10' },
  linnet: { home: 'text:Berta\'s', day: 18 },
};

function famState() { if (!S.families) S.families = { arrived: {} }; return S.families; }
const famHere = id => !!(S && S.families && S.families.arrived[id]);
function famDue(id) {
  const c = NEWCOMERS[id], P_ = S.parish;
  if (c.day && S.day >= c.day) return true;
  if (c.alt && typeof dlgCond === 'function' && dlgCond(c.alt)) return true;
  if (c.duty && P_ && P_.duties[c.duty] && P_.duties[c.duty].st === 'done' && S.day > P_.duties[c.duty].day) return true;
  return false;
}

// a home's front door, found by what the building is rather than where it stands (the town gets rearranged)
function famDoor(m, home) {
  for (const l of m.landmarks || []) {
    if (home === 'temple') { if (l.art === 'temple') return [Math.floor(l.x + l.w / 2), Math.ceil(l.y + l.h)]; continue; }
    if (!l.spec || l.spec.door == null) continue;
    const door = [l.x + l.spec.door, l.y + l.h - 1];
    const [how, what] = home.split(/:(.*)/);
    if (how === 'kind' && l.spec.kind === what) return door;
    if (how === 'text') { const tr = m.trig[K(door[0], door[1])]; if (tr && tr.text && tr.text.includes(what)) return door; }
  }
  return null;
}
// somewhere to stand near it: a free, walkable tile a step or two from the door, never in the doorway itself
function famSpot(m, door) {
  const [dx, dy] = door || [Math.floor(m.w / 2), Math.floor(m.h / 2)], cy = dy + 1;
  const taken = (x, y) => m.npcs.some(o => o.x === x && o.y === y) || (S.mapId === m.id && S.player.x === x && S.player.y === y);
  let best = [], bestD = 99;
  for (let y = cy - 9; y <= cy + 9; y++) for (let x = dx - 9; x <= dx + 9; x++) {
    if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1 || (x === dx && y === cy)) continue;
    if (!walkable(m, x, y) || m.trig[K(x, y)] || m.links[K(x, y)] || taken(x, y)) continue;
    const d = Math.max(Math.abs(x - dx), Math.abs(y - cy));
    if (d < bestD) { bestD = d; best = [[x, y]]; } else if (d === bestD) best.push([x, y]);
  }
  return best.length ? best[Math.floor(Math.random() * best.length)] : null;
}
// are they somewhere in town already? (townsfolk keep daily routines, in and out of the buildings: maps 'in_<x>_<y>')
const famFind = id => typeof allTownFolk === 'function' ? allTownFolk().some(([n]) => n.who === id)
  : Object.keys(S.maps).some(k => (k === 'town' || k.startsWith('in_')) && (S.maps[k].npcs || []).some(n => n.who === id));
function famPlace() {
  const m = S.maps && S.maps.town;
  if (!m || !m.npcs) return;
  for (const id of Object.keys(famState().arrived)) {
    if (!PEOPLE[id] || famFind(id)) continue;
    const spot = famSpot(m, famDoor(m, NEWCOMERS[id].home));
    if (!spot) continue;
    m.npcs.push({ spr: 'fam_' + id, who: id, x: spot[0], y: spot[1], home: [spot[0], spot[1]], name: PEOPLE[id].name, lines: [], fam: 1 });
  }
}
// each dawn (and whenever the town is rebuilt or a game is loaded), see who has come
function famTick() {
  if (!S || !S.maps || !S.player) return;
  if (typeof dlgOriginTrust === 'function') dlgOriginTrust();
  const F = famState(), come = [];
  for (const id of Object.keys(NEWCOMERS)) if (!F.arrived[id] && PEOPLE[id] && famDue(id)) { F.arrived[id] = S.day; if (S.day > 1 && ARRIVE_NEWS[id]) come.push(id); }
  if (come.length > 2) msg(`New faces in Brambleford: ${come.map(id => PEOPLE[id].name).join(', ')}.`, 'news');
  else for (const id of come) msg(ARRIVE_NEWS[id], 'news');
  famPlace();
}

// ---- the parish ledger: family, roots, and the households of the town ----
const famKnown = who => ((S.parish || {}).kin || {})[who] || 0;
const famKinName = k => k.id && PEOPLE[k.id] ? PEOPLE[k.id].name : k.name;
function htmlFamilyOf(who) {
  const F = FAMILY[who], P_ = parish(); if (!F) return '';
  const n = famKnown(who), roots = (P_.roots || {})[who];
  const kin = (F.kin || []).filter((k, i) => i < n || (k.id && P_.met[k.id]));
  if (!kin.length && !roots) return '<p class="dim">Ask about their family to learn more.</p>';
  return `<h4>Family</h4>${roots ? `<p class="dim">${esc(F.since)}${REGION[F.from] && F.from !== 'brambleford' ? ` From ${REGION[F.from].name}.` : ''}</p>` : ''}
    ${kin.length ? `<ul class="pfacts">${kin.map(k => `<li><b>${esc(cap(k.rel))}:</b> ${esc(famKinName(k))}${k.dead ? ' †' : ''}${k.note ? ` <span class="dim">· ${esc(k.note)}</span>` : ''}</li>`).join('')}</ul>` : ''}`;
}
// the households of everyone you've met, grouped by family name
function htmlHouseholds() {
  const P_ = parish(), houses = {};
  for (const [id, F] of Object.entries(FAMILY)) if (P_.met[id] && PEOPLE[id] && !PEOPLE[id].hidden) (houses[F.house] = houses[F.house] || { gen: 0, from: F.from, who: [] }).who.push(id), houses[F.house].gen = Math.max(houses[F.house].gen, F.gen || 0);
  const list = Object.entries(houses).sort((a, b) => b[1].gen - a[1].gen);
  if (!list.length) return '';
  const age = h => h.from === 'brambleford' ? `${h.gen} generations · founders` : h.gen >= 2 ? `${h.gen} generations · from ${REGION[h.from] ? REGION[h.from].name : 'away'}` : `newcomers · from ${REGION[h.from] ? REGION[h.from].name : 'away'}`;
  return `<h3>Families of Brambleford</h3><ul class="pfacts">${list.map(([name, h]) => `<li><b>${esc(name)}</b> <span class="dim">· ${age(h)}</span><br>${h.who.map(id => esc(PEOPLE[id].name)).join(', ')}</li>`).join('')}</ul>`;
}

window.addEventListener('load', () => {
  // new faces wear figures from the same wardrobe as everyone else
  if (typeof FIG_SPECS !== 'undefined') for (const id in NEW_FIGS) FIG_SPECS['fam_' + id] = NEW_FIGS[id];
  // relatives come up in everyday talk: each family's extra lines join their dialogue
  for (const [who, F] of Object.entries(FAMILY)) for (const [topic, lines] of Object.entries(F.add || {})) {
    const d = DIALOGUE[who] || (DIALOGUE[who] = {});
    d[topic] = (d[topic] || []).concat(lines);
  }
  if (typeof newDay === 'function') { const _newDay = newDay; newDay = function () { const r = _newDay.apply(this, arguments); famTick(); return r; }; }
  setInterval(famTick, 1500);
});

// =====================================================================
// The families of the townsfolk you already know
// =====================================================================
// FAMILY entries, batch 1: anselm, bran, hilde, tamsin, mirela, aldous, wendell, marta, pippa, odessa, rolf, mortimer

// Brother Anselm
FAMILY.anselm = {
  house: 'Croft',
  gen: 0,
  since: 'A visitor. A barley-farmer\'s son from the hills outside Highcourt, sent by the cathedral to weigh up the temple.',
  from: 'highcourt',
  kin: [
    { rel: 'father', name: 'Hamon Croft', dead: 1, from: 'highcourt', note: 'barley farmer on a hillside that hated barley',
      say: 'My father, Hamon. Grew barley on a hillside that hated barley. He talked to the crop. I suspect that is where I learned to pray.' },
    { rel: 'mother', name: 'Bettris Croft', dead: 1, from: 'highcourt', note: 'salted Korrum\'s cairn before harvest, lit Aurel\'s lamp after',
      say: { t: 'My mother kept the cairn and the lamp both. One god for the hill and one for the kitchen, she said. A very practical theologian.', min: 1 } },
    { rel: 'sister', name: 'Mab Croft', from: 'highcourt', note: 'farms the home hill',
      say: { t: 'Mab farms the home hill now. She writes once a year to report the hail and ask whether I am a bishop yet.', min: 1 } },
    { rel: 'sister', name: 'Cicely Croft', from: 'highcourt', note: 'the younger; farms beside Mab',
      say: { t: 'Cicely is the young one. She married a man with two cows and the patience of a third. They farm beside Mab and quarrel about the boundary every spring.', min: 2 } },
  ],
  origin: [
    'The barley hills, a little outside Highcourt. You can see the cathedral spire from the top field on a clear day. We mostly looked at the clouds.',
    { t: 'I was the third child and the worst ploughman. The parish priest said I had a head for letters. My father said that was a kind way of saying I\'d ruin the furrows.', min: 1 },
    { t: 'I went to the cathedral at fourteen with one shirt and a sack of our barley for the novice-master. He made bread with it. I still think that is how I got in.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'It sounds like your father sent his best crop with you.', r: '~He has to look away. “He did. I never thought of it like that. Thank you.”', tr: 1 },
        { tone: 'joke', l: 'So the cathedral was bought with bread.', r: 'Bribery in barley. The cathedral has never been above it.', tr: 1 },
        { tone: 'curious', l: 'Do you ever go home?', r: 'Twice in twenty years. My sisters made me milk the cows to prove I still could. I couldn\'t.', tr: 1, learn: 'Brother Anselm has two sisters still farming the family barley hill outside Highcourt.' },
        { tone: 'pious', l: 'Aurel called you.', r: 'Something did. It may have been the novice-master\'s stomach.', tr: 0 },
      ] } },
    { t: 'When they buried my father, the cathedral sent me to close a parish instead. I closed it on the day of the funeral. I\'ve never told anyone that.', min: 4 },
  ],
  family: [
    { t: 'My sisters think I have an easy life. Sitting in other people\'s temples, eating other people\'s bread. They are not entirely wrong.', min: 1 },
    { t: 'The farm will go to Mab\'s boys. Good. A friar shouldn\'t own a field. He would only worry about it from a distance, which is what I do anyway.', min: 2 },
  ],
  add: {
    gossip: [
      { t: 'Mistress Tolly asked whether I knew her brother, a baker at the cathedral. Hal Dunning! He makes the feast loaves. I have eaten his bread for twenty years without knowing his sister was up here.', min: 1, if: 'met:marta' },
      { t: 'Old Hester Dunning told me Halvard stole buns off her rack as a boy. “A skinny thing with a gap in his teeth.” I wrote it in the ledger. It is the best line in it.', min: 2 },
    ],
    news: [
      { t: 'A widow from Kettle Cross and her boy are sleeping beside the temple. Mags and Davy. I have written them into the tally as parishioners. Highcourt may argue. Let it.', if: 'here:mags' },
    ],
    how: [
      { t: 'A letter from my sister Mab. The hail missed them this year. I have been in a good mood all morning. Don\'t tell the councilman; he will assume it is about him.', min: 2 },
    ],
  },
};

// Bran Hollin
FAMILY.bran = {
  house: 'Hollin',
  gen: 3,
  since: 'Three generations. His grandfather Osric walked up from Weyford with a hammer, married a Barrow girl and built the forge.',
  from: 'weyford',
  kin: [
    { rel: 'wife', name: 'Ada Hollin', dead: 1, grave: 1, from: 'highfold', note: 'née Fell, Ewan\'s cousin; died of a winter fever six years ago',
      say: '~He looks at the clay shrine in the window. “Ada. Highfold. Walked up there for charcoal. Came down with a wife. Forgot the charcoal.”' },
    { rel: 'son', id: 'dace', say: 'Dace. My boy. Nineteen. Got his mother\'s chin and my temper. Worst of both.' },
    { rel: 'father', name: 'Tam Hollin', dead: 1, note: 'smith before Bran',
      say: { t: 'Da. Tam Hollin. Smith. Said ten words a day and wasted none. I\'m up to twelve.', min: 1 } },
    { rel: 'mother', name: 'Wynn Hollin', dead: 1, note: 'kept the forge books and the peace',
      say: { t: 'Mam. Wynn. Kept the books and kept the peace. Nobody\'s kept either since.', min: 2 } },
    { rel: 'grandfather', name: 'Osric Hollin', dead: 1, from: 'weyford', note: 'journeyman smith from Weyford; built the forge',
      say: 'Grandfather Osric. Walked up from Weyford with a hammer and a bad temper. I kept both.' },
    { rel: 'cousin-in-law', id: 'ewan', say: 'Ewan\'s Ada\'s cousin. Comes down with the cattle and sits in my forge saying nothing. Suits me.' },
    { rel: 'cousin', id: 'rolf', say: { t: 'Rolf\'s kin. Grandmother was a Barrow. He calls me cousin when he\'s drunk. I call him worse when I am.', min: 1 } },
  ],
  origin: [
    'Weyford. Grandfather\'s, not mine. I\'m from here. Born over the forge. Ash in the cradle.',
    { t: 'Osric was journeyman to a Weyford smith. Walked up the King\'s Road looking for a town with no forge. Found one. Found a Barrow girl pouring ale, too.', min: 1,
      learn: 'Bran\'s grandfather Osric Hollin, a Weyford journeyman smith, built the forge and married a Barrow girl.' },
    { t: 'Hill folk thought Ada married down. Valley folk thought I married strange. We thought we did fine.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'You did fine.', r: '~He nods at the anvil. “Aye. We did.”', tr: 1 },
        { tone: 'curious', l: 'What did her people say?', r: 'Her father looked at my hands a long time. Said “He\'ll do.” That\'s a speech, in Highfold.', tr: 1 },
        { tone: 'pious', l: 'Korrum blessed the match.', r: 'Don\'t. ...She\'d say he did, mind.', tr: 0 },
        { tone: 'joke', l: 'Did you at least bring the charcoal back?', r: '~A grunt that is nearly a laugh. “Went back for it the next week. Came home with a goat as well.”', tr: 1 },
      ] } },
    { t: 'Grandfather left Weyford over a fight with his master. Never said who won. Means he lost.', min: 3 },
  ],
  family: [
    'Hollins have shod every horse in this valley for three lives. Not much of a song. Good shoes, though.',
    { t: 'Da taught me. I taught Dace. Dace wanted a spear instead. That\'s the trade, ending.', min: 2 },
    { t: 'Rolf\'s mother fed me when Mam was sick. Barrows look after their own. Even the sooty ones.', min: 2 },
  ],
  add: {
    gossip: [
      { t: 'Ewan brought me a cheese down from the shielings. Ada\'s mother\'s make. Couldn\'t eat it. Ate it.', min: 2 },
      { t: 'Old Hester Dunning stopped by. Told me my da was the worst dancer at harvest supper. Seventy-eight and remembers everything. Worse than Rolf.', min: 1 },
    ],
    news: [
      { t: 'Got a hand now. Oren. Weyford lad, same as Grandfather. Quiet. Hits true. Don\'t tell him I said.', if: 'here:oren' },
    ],
    how: [
      { t: 'Oren\'s doing the horseshoes. Means I sleep. Don\'t like it. Doing it anyway.', if: 'here:oren', min: 2 },
    ],
    greet: [
      { t: 'Lad. Bess at the Fox says Rolf\'s knee\'s worse. Bess talks more than Rolf. Didn\'t think it could be done.', if: 'here:bess', min: 1 },
    ],
  },
};

// Hilde Marsh
FAMILY.hilde = {
  house: 'Marsh',
  gen: 0,
  since: 'Newcomer. Came south alone from the Greywatch country with a kit bag, and set up shop across the street from the forge.',
  from: 'greywatch',
  kin: [
    { rel: 'father', name: 'Gerd Marsh', dead: 1, from: 'greywatch', note: 'a Warden pikeman; died in service',
      say: { t: 'My father was a soldier. Died a soldier. That\'s the whole of it.', min: 1 } },
    { rel: 'mother', name: 'Annick Marsh', dead: 1, from: 'greywatch', note: 'kept the garrison laundry',
      say: { t: 'My mother washed blood out of other people\'s shirts for thirty years. I learned to stitch from her. Shirts first. Then armour.', min: 2 } },
    { rel: 'brother', name: 'Aldo Marsh', from: 'greywatch', note: 'still a Warden sergeant at Greywatch; she has not written in eighteen years',
      say: { t: 'I have a brother. Aldo. Sergeant, still, up north. I haven\'t written. I buy the ink. I don\'t write.', min: 3,
        learn: 'Hilde has a brother, Aldo Marsh, still a Warden sergeant at Greywatch. She has not written to him in eighteen years.' } },
  ],
  origin: [
    'North. I said north. North is a big place. I came from a small piece of it.',
    { t: 'A garrison village under the walls of Greywatch. Mud, drums, grey stone. You grew up a soldier or you married one. I didn\'t marry.', min: 2,
      learn: 'Hilde was born in a garrison village outside Greywatch, a soldier\'s daughter.' },
    { t: 'I came south on foot. Weyford, then up the valley. The forge was the first lit window I saw. I took the shop across from it. Reasons of light.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'Reasons of light. Of course.', r: '~Her mouth twitches. “Don\'t.”', tr: 1 },
        { tone: 'curious', l: 'Why Brambleford, of all places?', r: '~A long pause. “Halvard was here. I\'d heard. Leave it at that.”', tr: 0 },
        { tone: 'kind', l: 'I\'m glad you stopped here.', r: 'So am I. Most days.', tr: 1 },
        { tone: 'blunt', l: 'You were running.', r: 'Everyone south of Greywatch is running from something. I walked. Briskly.', tr: 1 },
      ] } },
    { t: 'They raise soldiers up there the way Hobb raises sheep. For the wool first. Then for the knife.', min: 3 },
  ],
  family: [
    { t: 'Never married. A sergeant asked, once. I said I\'d think about it. Still thinking.', min: 1 },
    'The apprentice was the nearest thing to family I let in. He ran off to the militia. That\'s what I get.',
    { t: 'My father gave me his belt knife when I enlisted. I threw it in the Silverrun on the way south. Lightest I\'ve felt since.', min: 3 },
  ],
  add: {
    gossip: [
      { t: 'Wil Thatcher\'s back with pelts. Good ones. He haggles like a man who\'s been alone in the woods too long. I gave him a fair price and a lecture.', if: 'here:wil' },
      { t: 'Bran\'s got a Weyford boy at the forge now. Oren. He sweeps. Bran never swept. The whole street looks different.', if: 'here:oren', min: 1 },
    ],
    how: [
      { t: 'Old Hester Dunning asked me if I had people. I said no. She gave me a bun anyway. Like a fine.', min: 2 },
    ],
    news: [
      { t: 'A carter\'s widow from Kettle Cross is sleeping by the temple. Mags. Raiders burned her out. I fitted her boy a jerkin. Didn\'t charge. Don\'t spread it.', if: 'here:mags', min: 1 },
    ],
  },
};

// Tamsin Reed
FAMILY.tamsin = {
  house: 'Reed',
  gen: 2,
  since: 'Two generations. Her mother Hanne, a Thornbury midwife, walked over when Brambleford\'s old midwife died, with Tamsin on her hip.',
  from: 'thornbury',
  kin: [
    { rel: 'mother', name: 'Hanne Reed', dead: 1, from: 'thornbury', note: 'midwife; came over from Thornbury when the old midwife died',
      say: 'My mother, Hanne. Midwife. Caught babies for forty years and never dropped one. I\'ve dropped a jar or two.' },
    { rel: 'grandmother', name: 'Old Maud Reed', dead: 1, from: 'thornbury', note: 'herbwife in Thornbury',
      say: { t: 'Grandmother kept herbs in Thornbury. Hung them from every beam. I learned my letters off her labels.', min: 1 } },
    { rel: 'father', name: 'Jem Reed', dead: 1, from: 'thornbury', note: 'a Thornbury carter; died when she was small',
      say: { t: 'My father drove a cart. I remember a smell of horse and a big hand. That\'s all I got of him. Enough to miss.', min: 2 } },
  ],
  origin: [
    'Thornbury, if you go back one step. Here, if you ask me. Sixty years in this valley, fifty-nine of them in this lane.',
    { t: 'The old midwife died in a hard winter and there was nobody to catch the spring babies. Mother heard at Thornbury market, put me on her hip and walked a day up the valley. Never walked back.', min: 1,
      learn: 'Tamsin\'s mother, Hanne Reed, came from Thornbury to be Brambleford\'s midwife when the old one died.' },
    { t: 'Thornbury folk think we\'re hill savages who eat bread without cider. We think they\'re cider-soaked sheep fanciers. Both true.',
      ask: { opts: [
        { tone: 'joke', l: 'Which side are you on?', r: 'Brambleford for bread, Thornbury for cider. I\'m a healer. I take what works.', tr: 1 },
        { tone: 'curious', l: 'Do you still have kin there?', r: 'Cousins. They send apples and ask when I\'m coming home. I tell them I am home. They send more apples.', tr: 1 },
        { tone: 'kind', l: 'You belong here, whatever Thornbury thinks.', r: 'I know where I belong, Acolyte. I\'ve set its bones.', tr: 1 },
        { tone: 'pious', l: 'Aurel keeps both towns.', r: 'He keeps them a day\'s walk apart. Very wise of him.', tr: 0 },
      ] } },
    { t: 'I\'ve caught more of this town than anyone living. Pippa. Ned. Dace Hollin. The Cooper twins, both in one long night. Half the folk who call me a sour old stick, I slapped their first breath into them.', min: 2 },
  ],
  family: [
    'Never married, no children. Unless you count everybody. Which I do, when they\'re ill.',
    { t: 'Mother wanted me to be a midwife. I wanted to be anything else. I became both. That\'s how mothers win.', min: 2 },
    { t: 'Grandmother\'s receipt book came over the hill with us. Half of it\'s nonsense. The other half has kept this town alive. I can still tell you which half by smell.', min: 3 },
  ],
  add: {
    gossip: [
      { t: 'Hedda Harrow brings my linen back whiter than it went. I brought her boy into the world feet first. We\'re square, she says. We\'re not. Hers is the harder job.', min: 1 },
      { t: 'Old Hester Dunning has the best memory in the valley and the worst knees. She tells me my mother\'s jokes. I\'d forgotten my mother told jokes.', min: 2 },
    ],
    news: [
      { t: 'The Cooper twins came in to show me their teeth. All of them. One at a time. I caught those two, you know. Lark first, shouting. Tam after, thinking about it.', if: 'here:tam' },
      { t: 'A Thornbury couple\'s taken the barn loft. Pells. Blight on their tenancy. I knew his grandmother. Everyone in Thornbury knew his grandmother. Loud woman.', if: 'here:rowan' },
    ],
  },
};

// Mirela
FAMILY.mirela = {
  house: 'Ash',
  gen: 0,
  since: 'Newcomer. Came out of the Whisperwood five years ago, after her mother died. Her father was a Thornbury forester; her mother was of Lethwen.',
  from: 'lethwen',
  kin: [
    { rel: 'mother', name: 'Ithrien', dead: 1, from: 'lethwen', note: 'of Lethwen in the deep Whisperwood; carved runes in living bark; died five years ago',
      say: 'My mother, Ithrien. She carved runes in living bark and sang to the cuts so they healed. I carve slate. Slate doesn\'t need singing to.' },
    { rel: 'father', name: 'Corran Ash', dead: 1, from: 'thornbury', note: 'a Thornbury forester; died when she was nine',
      say: { t: 'My father was Corran Ash, a forester out of Thornbury. A beech came down the wrong way in a storm. I was nine.', min: 2 } },
    { rel: 'grandmother', name: 'Saelith', from: 'lethwen', note: 'her mother\'s mother in Lethwen; never forgave the match; never answers',
      say: { t: 'My mother\'s mother is alive, I think. In Lethwen. She never forgave the match. Eleven letters. I\'d know her hand if she ever used it.', min: 3 } },
  ],
  origin: [
    'Out of the Whisperwood. Before that, out of two places that didn\'t want each other.',
    { t: 'We lived in my father\'s forester\'s cottage where the wood meets the Thornbury road. After he died my mother stayed. She couldn\'t go back, and she wouldn\'t go further.', min: 1 },
    { t: 'Lethwen is a village in the deep wood where the trees are older than Highcourt. They don\'t marry out. My mother did.', min: 2,
      learn: 'Mirela\'s mother Ithrien was of Lethwen in the deep Whisperwood; her father Corran Ash was a Thornbury forester.' },
    { t: 'When she died I buried her the Lethwen way, under a young oak, and walked until I found a town with a temple door open. It was this one.', min: 3,
      ask: { opts: [
        { tone: 'kind', l: 'I\'m glad it was open.', r: 'So was he. He said so. He said it as if it were a gift to him, not to me.', tr: 1 },
        { tone: 'curious', l: 'What is the Lethwen way?', r: 'No stone. No name. A tree that grows through you. In a hundred years you\'re shade on a hot day. It isn\'t sad. Mostly.', tr: 1, learn: 'Lethwen folk bury their dead under young trees, with no stone and no name.' },
        { tone: 'pious', l: 'Aurel keeps his door open to everyone.', r: 'Halvard kept it open. I\'ll give Aurel the credit if you like.', tr: 0 },
        { tone: 'blunt', l: 'Why not Thornbury? Your father\'s people are there.', r: 'They\'d have taken me in. And watched me. Brambleford only watches.', tr: 0 },
      ] } },
  ],
  family: [
    { t: 'Ash was my father\'s name. I don\'t use it in town. A half-elf called Ash. People would make jokes about kindling.', min: 1 },
    { t: 'My father\'s kin are foresters around Thornbury somewhere. I\'ve never gone to look. One family that doesn\'t answer is enough.', min: 2 },
    { t: 'My mother taught me runes. My father taught me to whistle through a blade of grass. I use one a great deal more than the other. Pippa has the other now.', min: 2 },
  ],
  add: {
    gossip: [
      { t: 'A Thornbury man came for a warmth-rune. Rowan Pell. He said his grandmother knew a forester called Ash. I said it was a common name. It isn\'t.', if: 'here:rowan', min: 2 },
      { t: 'Old Hester Dunning bought a hearth rune, called me “that elf girl” to my face, and then asked me to tea. I\'m going. I don\'t know what I\'ve agreed to.', min: 1 },
    ],
    news: [
      { t: 'The Thatcher boy is home. Wil. He came to my door to say the deep wood was quiet where I\'d said it would be. Then he bought nothing and left. An odd courtesy. I liked it.', if: 'here:wil' },
    ],
    how: [
      { t: 'Thinking about my mother. It\'s the season she\'d leave the last apple on the tree. I left one on Tamsin\'s. She shouted.', min: 3 },
    ],
  },
};

// Aldous Grey
FAMILY.aldous = {
  house: 'Grey',
  gen: 0,
  since: 'Newcomer. A Highcourt scholar who was invited to retire to the valley twenty-five years ago, and did, with eleven crates of books.',
  from: 'highcourt',
  kin: [
    { rel: 'grandmother', name: 'Hepzibah Grey', dead: 1, from: 'highcourt', note: 'said magic came from onions',
      say: 'My grandmother said magic came from onions. She grew them in a window box over the cathedral close and wept over every one. I assumed that was the magic.' },
    { rel: 'niece', name: 'Philippa Grey', from: 'highcourt', note: 'in Highcourt; writes every midwinter',
      say: { t: 'My niece Philippa writes from Highcourt every midwinter. Four pages, all of them asking whether I\'m eating. I am. Biscuits count.', min: 1,
        learn: 'Aldous has a niece, Philippa, in Highcourt, who writes to him every midwinter.' } },
    { rel: 'brother', name: 'Lucan Grey', dead: 1, from: 'highcourt', note: 'Philippa\'s father; a cathedral copyist',
      say: { t: 'My brother Lucan copied for the cathedral. Beautiful hand. He said I\'d come to a bad end asking questions. He was right, but it\'s been very pleasant.', min: 2 } },
  ],
  origin: [
    'Highcourt, dear boy. Born within earshot of the cathedral bells. I can still hear them, though that may be my ears.',
    { t: 'I arrived with eleven crates of books and a cat in a basket. The carter charged me by the crate. The cat he did for nothing, after she bit him.', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'Was that Footnote?', r: 'It was! Small, essential, constantly underfoot. And bitey. I left that part out before.', tr: 1 },
        { tone: 'curious', l: 'Why did you choose Brambleford?', r: 'A river, a temple, a market and no other scholars. Then I found Halvard played chess, and I unpacked.', tr: 1, learn: 'Aldous chose Brambleford for its river, temple and market, and stayed when he found Halvard played chess.' },
        { tone: 'kind', l: 'The valley\'s lucky you came.', r: '~He beams, and loses his spectacles doing it. “What a lovely thing to say. Now where did I put them?”', tr: 1 },
        { tone: 'blunt', l: 'You mean you were exiled.', r: 'Retired, dear boy. Exile has guards. I had a carter.', tr: 0 },
      ] } },
    { t: 'Thirty years in the Arcanum Library. Then a small paper, a courteous visitor, and the mountain air. I picked this valley off a map because it had a river and no university.', min: 2 },
    { t: 'The Greys were Highcourt clerks and copyists back to the old kings. I\'m the first to be asked to leave. It\'s a distinction.', min: 3 },
  ],
  family: [
    { t: 'Never married. I proposed once, in a footnote. She didn\'t read the footnotes. Very few people do.', min: 1 },
    { t: 'Philippa has a little daughter now. She sends me her drawings. They\'re mostly of me, with a very large hat and no face. That seems to be the consensus.', min: 2 },
    'Pippa Tolly is a Philippa too, I suspect, though she denies it hotly. All Philippas are like that. My niece once bit a bishop.',
  ],
  add: {
    gossip: [
      { t: 'There\'s a young woman from Thornbury staying at Berta\'s. Linnet. She asked me for a map of the old Ashvale track. I gave her one. Then I gave her a better one.', if: 'here:linnet', min: 2 },
      { t: 'Old Hester Dunning says I owe her for a bun from twenty-five years ago. I don\'t remember it. That\'s rather the point, she says.', min: 1 },
    ],
    news: [
      { t: 'Philippa\'s midwinter letter came early. She asks if the valley is safe. I wrote back that it has a very good acolyte. She\'ll think I mean an owl.', min: 1 },
    ],
    greet: [
      { t: 'Ah, {n}! The Cooper twins have been in. They asked if I was a hundred. I said nearly. Lark wanted proof. Tam wanted the owl.', if: 'here:tam' },
    ],
  },
};

// Wendell Tolly
FAMILY.wendell = {
  house: 'Tolly',
  gen: 6,
  since: 'Six generations, founders. The first Tolly sold rope and salt by the ford the year the King\'s Road was cut, and the counter has passed father to son ever since.',
  from: 'brambleford',
  kin: [
    { rel: 'wife', id: 'marta', say: 'Marta. Best baker in the valley. She called me a fool the day we met and has been proving it ever since.' },
    { rel: 'daughter', id: 'pippa', say: 'Pippa! Ten and a half. The half is very important, I\'m told. Takes after her mother. Talks like me.' },
    { rel: 'mother-in-law', id: 'hester', say: 'Hester lives with us. Marta\'s mother. She counts my coppers when I\'m not looking. She\'s usually right. I hate that.' },
    { rel: 'father', name: 'Josiah Tolly', dead: 1, note: 'kept the counter before Wendell',
      say: { t: 'My father, Josiah. Sold a man a bucket for forty years and never once made him feel he needed it. A real gift.', min: 1 } },
    { rel: 'mother', name: 'Rose Tolly', dead: 1, note: 'kept the shop books',
      say: { t: 'Mother kept the books. One ledger. Honest. I\'ve been thinking about her a great deal lately.', min: 2 } },
    { rel: 'cousin', name: 'Rufus Tolly', from: 'weyford', note: 'the cartwright at Weyford',
      say: { t: 'Cousin Rufus. Cartwright, down at Weyford. He\'s the one asking Ilse ten gold for an axle. Family. What can you do. I\'ve written to him twice. In capitals.', min: 1 } },
    { rel: 'distant cousin', id: 'abel', say: 'Abel\'s family too, if you squint back far enough. A Cooper married a Tolly when the road was new. He still won\'t take a discount.' },
  ],
  origin: [
    'Brambleford, born and bred. The Tollys were here before the temple had a roof. We sold the nails for it. At a fair price. Mostly.',
    { t: 'First Tolly sold rope and salt out of a lean-to by the ford, the year they cut the King\'s Road. The ford-keeper had a hut, the Barrows had ale, and we had everything else.', min: 1,
      learn: 'The Tollys have kept the store at Brambleford since the year the King\'s Road was cut.' },
    { t: 'Founders! Folk say it like we did something grand. We stood by a road and waited for people to need things. Still doing it.',
      ask: { opts: [
        { tone: 'joke', l: 'And charging them for it.', r: 'Ha! The founding principle!', tr: 1 },
        { tone: 'curious', l: 'Who were the other founders?', r: 'Tollys, Dunnings, Barrows, Quills and Coopers. Marta\'s a Dunning, so I married well and got founded twice.', tr: 1 },
        { tone: 'kind', l: 'Keeping a town in rope for two hundred years is a grand thing.', r: '~He swells visibly. “It is, isn\'t it? I\'ll tell Marta you said so.”', tr: 1 },
        { tone: 'blunt', l: 'Nobody cares who got here first, Wendell.', r: 'Mortimer cares. He has a list. I\'m on page one.', tr: 0 },
      ] } },
    { t: 'Six Tollys behind this counter. If I\'m the one who loses it, I\'ll have to haunt it. I\'ve picked my spot. By the lamp oil.', min: 2, if: '!duty:wendell_tax' },
  ],
  family: [
    'Tolly men marry bakers or weavers. Something with flour or thread. Keeps us fed and dressed while we talk.',
    { t: 'Pippa won\'t take the counter. I\'ve known since she was four and tried to sell the cat to Aldous. Then she gave him the cat for free. Free! Not a drop of Tolly in her, that day.', min: 1 },
    { t: 'Hester moved in after Wat died. Three of us and a mother-in-law in four rooms. I\'ve never been so well fed or so outnumbered.', min: 2 },
  ],
  add: {
    gossip: [
      { t: 'Rolf\'s niece Bess is behind the Fox bar now. Haggles better than her uncle. I lost to her at dice too. I\'m a very fair loser. Everyone gets a turn.', if: 'here:bess' },
      { t: 'Ivy Pell sews for Maren now. Maren bought six spools of thread off me in one go. Six! The Quills haven\'t bought six of anything since the charter.', if: 'here:ivy' },
    ],
    news: [
      { t: 'Letter from Cousin Rufus at Weyford. He\'s knocked two gold off Ilse\'s axle. I told him she\'s practically family. She isn\'t. Don\'t tell him.', min: 1 },
    ],
    how: [
      { t: 'Hester found the small ledger before Marta did. Didn\'t say a word. Just left it on my pillow with a sun-disc on top. Worst night of my life.', if: '!duty:wendell_tax', min: 3 },
    ],
  },
};

// Marta Tolly
FAMILY.marta = {
  house: 'Tolly',
  gen: 6,
  since: 'Six generations, founders. Born a Dunning: there has been a Dunning oven under a sun-disc since before the council. Married into the Tollys.',
  from: 'brambleford',
  kin: [
    { rel: 'mother', id: 'hester', say: 'My mother. Seventy-eight, and still tells me I under-prove the rye. She\'s right, which is worse.' },
    { rel: 'husband', id: 'wendell', say: 'Wendell. Good heart, soft head. I wouldn\'t trade either.' },
    { rel: 'daughter', id: 'pippa', say: 'Pippa. My girl. My worry. My best plait.' },
    { rel: 'father', name: 'Wat Dunning', dead: 1, from: 'weyford', note: 'a Weyford miller\'s son who married into the oven; no kin to Jory',
      say: { t: 'Father was a miller\'s son from Weyford. Wat. He married into the oven and took our name. Said he knew flour from both ends.', min: 1 } },
    { rel: 'grandmother', name: 'Old Agnes Dunning', dead: 1, note: 'taught Marta the old words',
      say: { t: 'Grandmother Agnes taught me the old words for the dough. Older than the temple, she said. I say them every morning, under my breath.', min: 1,
        learn: 'Marta learned the old blessing words for bread from her grandmother, Old Agnes Dunning.' } },
    { rel: 'brother', name: 'Hal Dunning', from: 'highcourt', note: 'cathedral baker at Highcourt these twenty years; sends a sun-loaf mould every midwinter',
      say: { t: 'My brother Hal went south to bake for the cathedral twenty years ago. Every midwinter a sun-loaf mould comes up the road. I\'ve a shelf of them. I\'ve never written back enough.', min: 2 } },
  ],
  origin: [
    'Here. Always here. The Dunnings baked the first loaf on the King\'s Road, and somebody\'s been hungry for one every morning since.',
    { t: 'The lamp before the house came first, then the oven. Grandmother said the first Dunning baked for the men raising the shrine, so the first offering in Brambleford was a loaf.', min: 1,
      learn: 'Dunning family lore says the first Dunning baked for the men raising Aurel\'s first shrine in Brambleford.' },
    { t: 'Father came up from Weyford with a cart of flour and stayed for a girl at the oven. Mother says he was the only miller\'s son who ever looked at her instead of her bread.', min: 2,
      ask: { opts: [
        { tone: 'pious', l: 'Aurel brings hearths together.', r: '~She smiles, flour on her cheek. “He does. He brought a cart of flour to ours.”', tr: 1 },
        { tone: 'kind', l: 'They sound happy.', r: 'They were. Forty-four years. He went in his sleep, smiling, after a slice of her seed loaf.', tr: 1 },
        { tone: 'curious', l: 'Is Jory the miller kin, then?', r: 'No! Everyone asks. Different mill, different Millers. Jory just grinds for us. Father would have liked him. They\'d have argued about stones.', tr: 1 },
        { tone: 'joke', l: 'So he married for the oven.', r: 'Mother says so when she\'s cross. Then she cries. So, no.', tr: 0 },
      ] } },
    { t: 'Wendell says I married down the lane. I say I married six doors along and that was quite far enough.', min: 1 },
  ],
  family: [
    'Dunning women bake. Dunning men go away or marry in. That\'s the pattern. Pippa\'s breaking it a new way.',
    { t: 'Mother kept the oven till her knees went. Then she handed me the peel without a word and went to sit on the bench outside. She\'s been supervising from that bench for six years.', min: 1 },
    { t: 'Hal was meant to have the oven. He wanted the cathedral. I wanted the temple. He got to go. I got the oven. I don\'t begrudge him. Mostly.', min: 3 },
  ],
  add: {
    gossip: [
      { t: 'Mother remembers Halvard as a skinny boy stealing buns off the cooling rack. She says she let him. She says it every day now.', min: 1 },
      { t: 'I asked the friar if he knew our Hal at the cathedral. He\'s eaten Hal\'s feast loaves for twenty years! I nearly sat down in the dough.', if: 'met:anselm', min: 1 },
    ],
    news: [
      { t: 'Jory says the river\'s high under the south bridge. He says it every spring, and every spring it\'s true. Flour\'s late. Pray for dry roads, love.', min: 1 },
    ],
    how: [
      { t: 'Mother\'s been at me to let Pippa serve. My own mother. The one who fetched me home by the ear. I asked her why now. She said she\'s old enough to be wrong.', min: 3 },
    ],
  },
};

// Pippa Tolly
FAMILY.pippa = {
  house: 'Tolly',
  gen: 7,
  since: 'Seven generations, founders on both sides. Born in the back room of her father\'s shop, between the lamp oil and the rope.',
  from: 'brambleford',
  kin: [
    { rel: 'mother', id: 'marta', say: 'Mum! She\'s got a big spoon and she knows how to use it. On dough. Mostly on dough.' },
    { rel: 'father', id: 'wendell', say: 'Dad sells everything. He sold my old shoes to Aldous. Aldous BOUGHT them. I don\'t know why.' },
    { rel: 'grandmother', id: 'hester', say: 'Granny Hester! She\'s seventy-eight! That\'s more than seven of me! She lets me eat the burnt bits.' },
    { rel: 'uncle', name: 'Hal Dunning', from: 'highcourt', note: 'cathedral baker at Highcourt; she has never met him',
      say: { t: 'I have an uncle in Highcourt who bakes for the CATHEDRAL. I\'ve never met him. He sends a mould every midwinter. I\'m going to visit him when I\'m a priestess.', min: 1 } },
    { rel: 'grandfather', name: 'Wat Dunning', dead: 1, from: 'weyford', note: 'died when she was three',
      say: { t: 'Grandpa Wat died when I was three. I remember his whiskers. They smelled of flour. Everybody in my family smells of flour.', min: 1 } },
    { rel: 'cousin', name: 'Rufus Tolly', from: 'weyford', note: 'her father\'s cousin, the Weyford cartwright',
      say: 'Dad\'s cousin Rufus makes wheels in Weyford. Dad writes him letters in CAPITALS. That means shouting.' },
  ],
  origin: [
    'I\'m from HERE. I was born in the shop. Between the lamp oil and the rope. Dad tells everyone. Dad tells everyone everything.',
    { t: 'Granny Hester says Mum\'s family has been here since the first loaf, and Dad\'s since the first nail. So I\'m made of bread and nails. That\'s why I\'m so strong.', min: 1 },
    { t: 'Tamsin caught me when I was born! She says I came out shouting and haven\'t stopped. That\'s not true. I stop when I\'m asleep. Mostly.', min: 1,
      learn: 'Tamsin delivered Pippa in the back room of Wendell\'s shop.' },
    { t: 'Is everybody from somewhere? Where are YOU from?', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'From here, like you. The temple\'s my home.', r: '~She nods very seriously. “Then we\'re both temple people. And bread people. Well, I am. You can have some bread.”', tr: 1 },
        { tone: 'curious', l: 'Where do you think I\'m from?', r: 'Somewhere far. Father Halvard said he carried you a long way in his arms. That\'s all he said. I asked a LOT.', tr: 1, learn: 'Halvard told Pippa only that he had carried you a long way in his arms.' },
        { tone: 'joke', l: 'I was found under a cabbage.', r: 'You were NOT. ...Were you? Which cabbage?', tr: 1 },
        { tone: 'blunt', l: 'It doesn\'t matter where people come from.', r: 'It does to Granny Hester. She knows where EVERYONE\'S from. Even the cat.', tr: 0 },
      ] } },
  ],
  family: [
    'My brother says... I don\'t have a brother. I made him up. He\'s called Pip and he\'s braver than me and he never gets in trouble because he isn\'t real.',
    { t: 'Mum\'s side bakes and Dad\'s side sells and I\'m going to light lamps. Granny Hester says every family needs one who isn\'t sensible.', min: 1 },
    { t: 'Granny Hester says Mum used to light the temple lamps when she was little. Mum went red and told her to hush. Why would you hush about LAMPS?', min: 2 },
  ],
  add: {
    gossip: [
      { t: 'Tam and Lark are better! Lark beat me at racing and Tam found a beetle and named it after you. It\'s a nice beetle.', if: 'here:tam' },
      { t: 'There\'s a boy at the temple called Davy and he\'s eight and he says he\'s seen goblins. I don\'t believe him. I do a bit.', if: 'here:davy' },
    ],
    news: [
      { t: 'Rolf\'s niece is here! Bess! She can carry six mugs at once. SIX. I tried with cups of water and Mum said never again.', if: 'here:bess' },
    ],
    greet: [
      { t: 'Granny Hester says hello and you\'re too thin! She says that to everyone. She says it to the cat.', min: 1 },
    ],
  },
};

// Odessa Vell
FAMILY.odessa = {
  house: 'Vell',
  gen: 0,
  since: 'Newcomer. Came north from Corvanne two years ago, following her brother Teo, with three trays of silver and a donkey.',
  from: 'corvanne',
  kin: [
    { rel: 'brother', id: 'teo', say: 'Teo. My little brother. Taller than me, cleverer than me, and somewhere under that mountain. I am going to shout at him for a week.' },
    { rel: 'grandmother', name: 'Serafina Vell', dead: 1, from: 'corvanne', note: 'read palms on the bridges',
      say: 'Nonna Serafina read palms on the bridges. She held my hand the day I was born and said one word. “Loud.”' },
    { rel: 'father', name: 'Benedetto Vell', from: 'corvanne', note: 'a bridge-toll keeper in Corvanne',
      say: { t: 'My father keeps a toll on the Fourth Bridge. Benedetto. He knows every face that crosses and charges each one a different price. I get it from him.', min: 1 } },
    { rel: 'mother', name: 'Livia Vell', from: 'corvanne', note: 'in Corvanne; writes every month',
      say: { t: 'My mother, Livia. She writes every month asking when we\'re coming home. I write back about the weather. I haven\'t told her about Teo. How do you write that?', min: 2,
        learn: 'Odessa has not told her mother in Corvanne that Teo was taken.' } },
  ],
  origin: [
    'Corvanne! The river city. Bridges on bridges, a palm-reader on every one, and jewellers underneath. You can buy anything in Corvanne except quiet.',
    { t: 'I grew up in the toll-house on the Fourth Bridge. Every barge on the Silverrun paid my father. I learned arithmetic by counting the coins and lying about the total.', min: 1 },
    { t: 'Teo signed on with a caravan going north. I packed my trays the same night. My mother said I\'d come back married. I haven\'t come back at all.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'I\'m glad you\'re here, Odessa.', r: 'So am I, little priest. Some days. Today, yes.', tr: 1 },
        { tone: 'joke', l: 'Married to Wendell\'s haggling, at least.', r: 'Ha! A terrible husband. He never brings flowers, only rope.', tr: 1 },
        { tone: 'curious', l: 'Will you go back, after?', r: 'With Teo. Only with Teo. Otherwise I stay here and annoy the mountain until it gives him up.', tr: 1, learn: 'Odessa will not go home to Corvanne without Teo.' },
        { tone: 'pious', l: 'Nemora keeps the river cities too.', r: 'She keeps them very wet. Thank you, though.', tr: 0 },
      ] } },
    { t: 'Up here they think Corvanne is a fairy tale. Gold rings on fishwives. Well, yes. But the fishwives earned them.', min: 1 },
  ],
  family: [
    'The Vells are bridge people. We take tolls, we tell fortunes, we set stones. Anything that happens to folk passing by.',
    { t: 'Nonna taught me palms. My mother taught me to laugh at the wrong moment. My father taught me never to give a discount. I ignore him, with you.', min: 1 },
    { t: 'In Corvanne the eldest keeps the younger. That\'s the old way. I\'m the eldest. You see why I can\'t go home without him.', min: 2 },
  ],
  add: {
    news: [
      { t: 'A widow from Kettle Cross came in. Mags. The raiders burned her out on the same stretch of road where they took Teo. We sat and said nothing for a long time. It helped.', if: 'here:mags' },
    ],
    gossip: [
      { t: 'Letter from my mother. She asks if the northern men are handsome. I wrote: one is a very good acolyte. She will start planning a wedding. Ignore her.', min: 2 },
      { t: 'Rolf\'s niece Bess bought a little silver ring for her mother in Weyford. Paid in coppers and counted every one twice. Good girl. Nearly a bridge girl.', if: 'here:bess' },
    ],
    how: [
      { t: 'Davy, the widow\'s boy, asked me to read his palm. I told him he\'ll be taller than his mother. He said “like Teo?” Someone told him about Teo. I had to go and sit down.', if: 'here:davy', min: 1 },
    ],
  },
};

// Rolf Barrow
FAMILY.rolf = {
  house: 'Barrow',
  gen: 6,
  since: 'Six generations, founders. The Barrows sold ale from a hut by the ford when the King\'s Road was cut, and have kept the Sleeping Fox ever since.',
  from: 'brambleford',
  kin: [
    { rel: 'mother', name: 'Nell Barrow', dead: 1, note: 'ran the Fox; the fish stew was her mother\'s',
      say: 'My mother, Nell, ran the Fox. Ran it like a ship in a storm. The fish stew\'s hers. And her mother\'s. I just stir.' },
    { rel: 'father', name: 'Big Danny Barrow', dead: 1, note: 'mostly sat',
      say: 'Father was Big Danny Barrow. He mostly sat. Sat beautifully, mind. Folk came miles to watch him do it.' },
    { rel: 'sister', name: 'Joan', from: 'weyford', note: 'married a Weyford ferryman',
      say: { t: 'My sister Joan married a ferryman at Weyford. Best decision she ever made, she says, because it put a river between her and this inn.', min: 1 } },
    { rel: 'niece', id: 'bess', say: 'Joan\'s girl, Bess. Strong as a pony, quick as a cat, and twice as sensible as her uncle. Which isn\'t hard.' },
    { rel: 'cousin', id: 'bran', say: 'Bran\'s kin, you know. His grandmother was a Barrow. I call him cousin when I\'ve had a few. He calls me something else.' },
    { rel: 'grandmother', name: 'Old Tilda Barrow', dead: 1, note: 'had a word for what sleeps under hills',
      say: { t: 'My grandmother Tilda had a word for what sleeps under hills. She\'d go out in the yard, say it, spit, and come back in. I never learned it. Glad.', min: 2 } },
  ],
  origin: [
    'From here. From this room, more or less. Born upstairs in the second-best bed. The best one was let.',
    { t: 'First Barrow sold ale from a hut by the ford to the men cutting the King\'s Road. The Tollys sold them rope, the Dunnings sold them bread, and we sold them a reason to come back.', min: 1,
      learn: 'The Barrows have kept the alehouse at Brambleford since the King\'s Road was cut, when it was a hut by the ford.' },
    { t: 'Ran off at seventeen. Six summers selling my sword. Came limping home with one good knee and a story for every scar. Mother put me straight to work.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'Did she at least kill the fatted calf?', r: 'She killed a chicken and made me pluck it. That was the welcome.', tr: 1 },
        { tone: 'curious', l: 'Why come home?', r: 'Knee said so. And somebody had to keep the corner table warm till Halvard came back. Took him long enough.', tr: 1 },
        { tone: 'kind', l: 'The Fox was lucky to get you back.', r: 'Mother said “about time.” Coming from her, that was a parade.', tr: 1 },
        { tone: 'blunt', l: 'So you failed as a sellsword.', r: 'Gloriously. Ask the knee.', tr: 1 },
      ] } },
    { t: 'Founders, they call us. Like we planned it. Nobody plans an inn. You put down a barrel, somebody sits on it, and two hundred years later you\'re still sweeping.', min: 1 },
  ],
  family: [
    'Barrows don\'t leave the Fox. We try. Joan managed it. The rest of us get dragged back by the stew.',
    { t: 'Bran\'s grandfather walked in off the Weyford road, ordered an ale and married the girl who poured it. That\'s how we got a smith in the family. Cheaper than buying one.', min: 1 },
    { t: 'I\'m the last Barrow at the Fox. No wife, no young ones. Joan says send for Bess. I say I\'m fine. My knee says send for Bess.', min: 2, if: '!here:bess' },
    { t: 'Bess is learning the stew. I\'ve shown her everything but the green bit. Nobody knows the green bit. I\'ve decided that\'s tradition.', if: 'here:bess' },
  ],
  add: {
    news: [
      { t: 'Bess has rearranged my cellar. I can\'t find anything. Everything\'s exactly where it should be. It\'s very upsetting.', if: 'here:bess' },
    ],
    how: [
      { t: 'Better since Bess came. She does the stairs, I do the talking. Always was the right way round.', if: 'here:bess', min: 1 },
    ],
    gossip: [
      { t: 'Old Hester Dunning used to chase Halvard and me off her cooling racks with a bread peel. She still has the peel. She showed me. Last week.', min: 1 },
      { t: 'Bran got drunk and called me cousin again. I called him cousin back. Then we both got weepy about our grandmothers. Don\'t tell Hilde.', min: 2 },
    ],
  },
};

// Mortimer Quill
FAMILY.mortimer = {
  house: 'Quill',
  gen: 6,
  since: 'Six generations, founders. The Quills wrote Brambleford\'s founding charter; the men have kept the town\'s books, and the women have woven.',
  from: 'brambleford',
  kin: [
    { rel: 'sister', id: 'maren', say: 'Maren. My sister. Older than me, and right a great deal more often. We are... not speaking. I keep count.' },
    { rel: 'father', name: 'Aldric Quill', dead: 1, note: 'town clerk before Mortimer',
      say: 'My father, Aldric, was clerk before me. A pair of hands and no opinions, he said. He had a great many opinions. He wrote them in the margins, very small.' },
    { rel: 'mother', name: 'Ysolde Quill', dead: 1, note: 'weaver; her will began the quarrel',
      say: { t: 'Mother was a weaver. Ysolde. She wove a blue thread into everything for Nemora. Maren still does. I keep a blue stone. It\'s the same prayer, done badly.', min: 1 } },
    { rel: 'forefather', name: 'Silas Quill', dead: 1, note: 'wrote the founding charter',
      say: { t: 'Silas Quill wrote the founding charter. It\'s in the strongroom. His hand shakes on the last line. I like to think he was nervous too.', min: 1 } },
  ],
  origin: [
    'Here. The Quills have been here since there was a here to write down. Literally. We wrote it down.',
    { t: 'The charter names a ford, a store, an alehouse and a lamp before the house. Five families signed it. Ours signed it twice, because we were holding the pen.', min: 1,
      learn: 'The Quills wrote Brambleford\'s founding charter, which names a ford, a store, an alehouse and the lamp before the house.' },
    { t: 'Quill men keep books. Quill women weave. Six generations of it. Maren says that\'s why we\'re both so tightly wound.', min: 2,
      ask: { opts: [
        { tone: 'joke', l: 'Is that a weaving joke?', r: '~He blinks. Then, faintly pleased: “It\'s hers. I\'d never make one. I shall tell her you laughed.”', tr: 1 },
        { tone: 'curious', l: 'Did you ever want to weave?', r: 'I did. Mother let me keep the tally of the threads instead. I was better at counting than crossing.', tr: 1 },
        { tone: 'kind', l: 'You\'re the best clerk this town has had.', r: 'I\'m the only clerk this town has had for twenty years. But thank you. I\'ll... note it.', tr: 1 },
        { tone: 'blunt', l: 'Sounds like a cage, Mortimer.', r: '~He looks at the high counter around him. “Yes. A very orderly one.”', tr: 0 },
      ] } },
    { t: 'I was meant to go to Highcourt. A scholar. Then Father died, and the hall needed a Quill, and Maren had the loom. So.', min: 2 },
  ],
  family: [
    { t: 'Mother left Maren the loom and the house. Then the council decided the house owed rent. I was the one who wrote it up. In my tidiest hand. That\'s the whole quarrel.', min: 1,
      learn: 'The Quill quarrel began when Ysolde left Maren the loom and the house, and Mortimer wrote up the council\'s rent on it.' },
    { t: 'The Quills have argued with the council about that rent for three generations. I\'m the first Quill to argue on the council\'s side. I\'m not proud of the distinction.', min: 2 },
    { t: 'Father and Mother quarrelled every night, about money. Then they\'d sit by the loom, she weaving and he reading aloud. Maren and I have only managed the first part.', min: 3 },
  ],
  add: {
    gossip: [
      { t: 'Maren has taken on a seamstress. Ivy Pell, from Thornbury. I registered her lodging. I may have written Maren\'s name with extra care.', if: 'here:ivy' },
      { t: 'Hester Dunning came in to check her own birth date. She says the register makes her a year older than she is. It doesn\'t. I agreed with her anyway.', min: 1 },
    ],
    news: [
      { t: 'A young woman from Thornbury came asking for any record of Berta Lind\'s family. I found Joss Lind\'s burial line. She cried in the hall. I gave her my best blotter.', if: 'here:linnet', min: 1 },
    ],
    how: [
      { t: 'I walked past Maren\'s door today. Not the long way. The short way. I didn\'t knock. But it\'s a start. Isn\'t it?', min: 2, if: '!flag:maren_mortimer' },
    ],
  },
};

// Family data, batch 2: maren, voss, elsbeth, hobb, ned, ilse, abel, gil, berta, garrick, fenwick, ewan

// Maren Quill
FAMILY.maren = {
  house: 'Quill',
  gen: 6,
  since: 'Six generations, founders. The Quills wrote the town charter, and the Quill women have woven ever since.',
  from: 'brambleford',
  kin: [
    { rel: 'brother', id: 'mortimer', say: 'Mortimer. The clerk. My little brother, which he forgets, and I don\'t.' },
    { rel: 'mother', name: 'Ysolde Quill', dead: 1, note: 'weaver; taught Maren on a frame loom; her will began the quarrel',
      say: 'Mother. Best weaver this valley ever had. I only say so because she isn\'t here to be smug about it.' },
    { rel: 'father', name: 'Aldric Quill', dead: 1, note: 'town clerk before Mortimer',
      say: 'Father kept the hall. A pair of hands and no opinions, he said. He had opinions. He kept them for supper.' },
    { rel: 'forebear', name: 'Tobias Quill', dead: 1, note: 'wrote the founding charter',
      say: { t: 'Tobias Quill wrote the charter, six greats back. The council quotes it at me whenever it raises my rent. I\'d like a word with Tobias.', min: 1 } },
  ],
  origin: [
    'Here. There\'s been a Quill in this valley since the first lamp was lit. We wrote the charter and we\'ve been arguing with it since.',
    { t: 'The founders. Tollys, Dunnings, Barrows, Coopers, and us. Folk say it with their eyes rolled. Let them. Somebody had to know how to spell.',
      learn: 'The Quills are one of Brambleford\'s founding families; they wrote the town charter.' },
    { t: 'Quill men keep the books and Quill women keep the loom. Six generations. Mortimer was meant to break the habit. He broke the wrong thing.', min: 2,
      ask: { opts: [
        { tone: 'curious', l: 'What was he meant to break?', r: 'The habit. He wanted Highcourt, books, a scholar\'s gown. Then Father died and he sat down in Father\'s chair and never got up.', tr: 1 },
        { tone: 'kind', l: 'He still could.', r: 'Hmph. At his age. ...Perhaps. Don\'t tell him I said perhaps.', tr: 1 },
        { tone: 'joke', l: 'And you were meant to keep the books?', r: 'I\'d have kept them better. And louder.', tr: 1 },
        { tone: 'blunt', l: 'Sounds like you both did what was expected.', r: '~Her mouth goes thin. “Yes. Well. That\'s rather the trouble with this family.”', tr: 0 },
      ] } },
    { t: 'Mother\'s frame loom is still by my window. No bigger than a tray. Every Quill girl learned on it. There\'s no Quill girl left to give it to.', min: 3 },
  ],
  family: [
    { t: 'Mother left me the loom and the house to the both of us. Then the council called my weaving room a shop and wanted a shop\'s rent, and my brother wrote it up in his tidy letters.', min: 2,
      learn: 'The Quill quarrel began with Ysolde Quill\'s will and the council\'s rent on Maren\'s weaving room, which Mortimer wrote up.' },
    { t: 'When we were small and had quarrelled, you left a red ribbon on the other one\'s step. Mother\'s idea. Saved her a great deal of shouting.', if: '!flag:maren_mortimer' },
    { t: 'I left the ribbon. Red, like when we were small. He left me a daisy. A grown man, the town clerk, picking daisies. ~She is not quite smiling.', if: 'flag:maren_mortimer' },
    { t: 'No husband. A Thornbury dyer asked, once. He wanted me to weave his colours. I said I had my own.', min: 3 },
  ],
  add: {
    greet: [
      { t: '~There is a red ribbon tied round her wrist today, and she sees you see it. “Don\'t.”', if: 'flag:maren_mortimer' },
    ],
    how: [
      { t: 'Busy. I\'ve taken on Ivy Pell to sew up what I weave. First help at that loom since Mother. Don\'t make a thing of it.', if: 'here:ivy' },
    ],
    news: [
      'Hester Dunning stopped me in the lane to say my mother would be ashamed of my hems. Seventy-eight. I\'ll be lucky to be that rude at seventy-eight.',
    ],
    gossip: [
      { t: 'Ilse found a seamstress at the Fox, Ivy Pell, the Thornbury woman. Good hands. I\'ve stolen her, mostly. Ilse pretends not to mind.', if: 'here:ivy' },
      { t: 'Mortimer\'s eating. Properly. I send a pie up the hall steps on seventh-days. Marta bakes it. I take the credit.', if: 'flag:maren_mortimer' },
    ],
  },
};

// Edric Voss: guarded; says almost nothing of kin
FAMILY.voss = {
  house: 'Voss',
  gen: 0,
  since: 'Eighteen years. Came from the north with a wife and a great deal of silver, and has never said more than that.',
  from: 'greywatch',
  kin: [
    { rel: 'wife', id: 'elsbeth', say: 'My wife. That is all you need to know of my family, Acolyte, and rather more than most are told.' },
    { rel: 'daughter', name: 'a daughter, unnamed', dead: 1, note: 'born and died their second winter in Brambleford; there is no stone',
      say: { t: '~Nothing in his face moves at all. “No. We will not speak of that. Not you. Not anyone.”', min: 3 } },
    { rel: 'father-in-law', name: 'Gerolt Corde', dead: 1, from: 'greywatch', note: 'Elsbeth\'s father, an archivist',
      say: { t: 'My wife\'s father kept records. A meticulous man. He kept everything. I have never cared for men who keep everything.', min: 2 } },
    { rel: 'father', name: 'Voss the elder', dead: 1, note: 'he will not say',
      say: '~He regards you as if you had asked to see his purse. “I had a father. Most men do. Next question.”' },
  ],
  origin: [
    'North. I\'ve said so. It remains true however often you ask.',
    { t: 'Where a man comes from is a debt he pays once. I paid mine. I don\'t carry the receipt about with me.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Greywatch? Your wife grew up there.', r: '~The briefest pause. “My wife grew up in a great many gardens. Leave her geography out of it.”', tr: -1 },
        { tone: 'blunt', l: 'You served the Wardens, didn\'t you.', r: 'I served. Many did. I believe I\'ve said as much. ~He smooths a glove that needs no smoothing.', tr: -1 },
        { tone: 'kind', l: 'Everyone misses somewhere.', r: 'Do they. How restful for them.', tr: 0 },
        { tone: 'pious', l: 'Aurel welcomes every traveller home.', r: 'This is home. I bought it. I have the deed.', tr: 0 },
      ] } },
    { t: 'I came south with money and found a valley that needed it. The rest is the council\'s business, and the council is mine.',
      learn: 'Voss came south to Brambleford eighteen years ago with money, and will say nothing of where he came from.' },
    { t: '~For a moment he looks up the North Road, and his gloved fingers close. “Cold country. Hard winters. One learns order.” He turns back. “That will do.”', min: 3 },
  ],
  family: [
    'I have a wife, a house and a seat on the council. A man needs nothing further, and should ask less.',
    { t: 'My wife has no family living. I am her family. I take that seriously, Acolyte. More seriously than you would like.', min: 2 },
    { t: 'Some men want sons. I have never wanted anyone to inherit what I carry. ~He seems to hear himself, and stops.', min: 4 },
  ],
  add: {
    greet: [
      { t: 'The smith has a journeyman, I hear. A Weyford boy. Good. A forge should keep busy, whatever its master\'s moods.', if: 'here:oren' },
    ],
    how: [
      { t: 'My wife is well. I am well. Our house is well. ~He says it like a man closing a ledger.', min: 1 },
    ],
    news: [
      { t: 'Some old woman\'s grand-niece has come from Thornbury asking about the north. I do hope someone tells her how dangerous the roads are.', if: 'here:linnet' },
    ],
    gossip: [
      'Hedda Harrow takes in my wife\'s washing. The sergeant\'s widow. I pay her well. I like the militia to know I remember its families.',
      { t: 'The innkeeper has sent for his niece from Weyford. Another Barrow behind the bar. The Fox breeds them, I think.', if: 'here:bess' },
      { t: 'Burned-out carters from Kettle Cross sleeping by your temple. Raids are such an unhappy business. I\'ve sent the friar a blanket.', if: 'here:mags' },
    ],
  },
};

// Elsbeth Voss: carries the lost daughter
FAMILY.elsbeth = {
  house: 'Voss',
  gen: 0,
  since: 'Eighteen years. A Greywatch archivist\'s daughter who rode south to join her husband and has kept his garden ever since.',
  from: 'greywatch',
  kin: [
    { rel: 'husband', id: 'voss', say: 'Edric. Twenty years married. He has never once raised his voice to me. I keep saying that. It keeps being true.' },
    { rel: 'daughter', name: 'a daughter, unnamed', dead: 1, note: 'born and died their second winter in Brambleford; no stone; Elsbeth calls her Wren',
      say: { t: '~The shears stop. “My girl. She lived nine days. Edric wouldn\'t let her have a name on a stone, so I gave her one where he can\'t see it. Wren.” She starts pruning again. “Nobody else knows that.”', min: 3,
        learn: 'Elsbeth\'s baby daughter lived nine days. There is no stone; Elsbeth secretly calls her Wren.' } },
    { rel: 'father', name: 'Gerolt Corde', dead: 1, from: 'greywatch', note: 'a Warden archivist',
      say: { t: 'My father kept the Warden archive. Miles of shelves. He said every page was somebody\'s whole life, and you must never burn one.', min: 1 } },
    { rel: 'mother', name: 'Aveline Corde', dead: 1, from: 'greywatch', note: 'hung feathers for Veyra',
      say: { t: 'My mother hung feathers for Veyra in our window, inside all those grey walls. A little green in a grey place. I haven\'t been allowed to, since.', min: 2 } },
  ],
  origin: [
    'Greywatch, in the north. A grey town with grey walls, and I wore grey to match. I still do. I don\'t know how to stop.',
    { t: 'My father\'s house stood against the archive wall. The garden wall was too high to see over. I grew climbing roses up it, to see what the roses saw.', min: 1,
      learn: 'Elsbeth grew up in Greywatch, in a house against the Warden archive wall.' },
    { t: 'Edric rode south first, on duty. I followed with a trunk and my rose cuttings, and I was so frightened on that road. ~She stops. “It was a long road.”', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'You were brave to do it alone.', r: 'Was I? I only remember being cold. ~She smiles a little. “But thank you.”', tr: 1 },
        { tone: 'curious', l: 'What duty took him south?', r: '~She looks toward the house. “He never said. I never asked. That was how we did things, even then.”', tr: 0,
          learn: 'Voss rode south ahead of Elsbeth "on duty"; she followed alone and never asked what the duty was.' },
        { tone: 'pious', l: 'Aurel walks the long roads with us.', r: 'Someone did. I met a priest on that road. ...Another time.', tr: 1 },
        { tone: 'blunt', l: 'Why follow him at all?', r: 'Because I loved him. You\'ll understand that one day, and it won\'t make anything simpler.', tr: 0 },
      ] } },
    { t: 'Edric said we\'d never go north again. I didn\'t argue. By then I had nobody there but a grave I wasn\'t allowed to visit.', min: 3 },
  ],
  family: [
    'No sisters, no brothers. My father said one child was all the quiet his archive could spare.',
    { t: 'When my mother died, ten winters ago, Edric wouldn\'t let me ride north for the burial. He said the roads weren\'t safe. They were perfectly safe. He meant something else.', min: 3 },
    { t: 'Father Halvard buried her by the far wall, with the words and no name, because Edric asked it. Then he whispered her name anyway. The only one who ever said it aloud. I planted the white rose there.', min: 4,
      learn: 'Halvard buried the Voss baby by the far wall of their garden; Elsbeth planted the white rose over her.' },
  ],
  add: {
    greet: [
      { t: '~She is kneeling by the far wall, beside the white rose, and doesn\'t get up at once.', min: 3 },
    ],
    how: [
      { t: 'It\'s a hard week. It always is, this time of winter. Never mind me. ~She doesn\'t explain.', min: 2 },
    ],
    news: [
      { t: 'Old Berta has family come at last. A grand-niece, from Thornbury. I saw them walking arm in arm down the south lane, and I had to go inside.', if: 'here:linnet' },
    ],
    gossip: [
      'Hedda Harrow does our washing. She talks to me as if I were anybody. I give her roses and she puts them in a bucket. I love that.',
      { t: 'There\'s a little boy sleeping by the temple with his mother. Davy. Burned out at Kettle Cross. I sent down a blanket. Edric sent one too. He doesn\'t know I did.', if: 'here:davy' },
    ],
  },
};

// Hobb Thatcher
FAMILY.hobb = {
  house: 'Thatcher',
  gen: 4,
  since: 'Four generations. Great-grandfather Ambrose walked over from Thornbury and cleared the east fields of stone by hand.',
  from: 'thornbury',
  kin: [
    { rel: 'wife', id: 'greta',
      say: 'Greta. A Fern, she was, from out by the Whisperwood edge. Thirty years, and she still hangs Veyra\'s feathers fresh every new moon.' },
    { rel: 'son', id: 'wil', say: 'Wil. My lad. Hunts the Whisperwood. Better at his trade than I ever was at mine. Don\'t tell him.' },
    { rel: 'child', name: 'the Thatcher baby', dead: 1, grave: 1, note: 'two days old; the small THATCHER stone in the churchyard',
      say: { t: '~He is quiet a long time. “There was another. Between Wil and now. Two days. Small stone, says THATCHER. Greta ties a feather on it.” He looks at the hills. “We don\'t talk about it.”', min: 3 } },
    { rel: 'father', name: 'Wilf Thatcher', dead: 1, say: 'My da, Wilf. Never said ten words in a day, and every one of them was about sheep.' },
    { rel: 'mother', name: 'Moll Thatcher', dead: 1, say: 'Mam. Moll. Could shear a ewe faster than any man on the east road, and told them so.' },
    { rel: 'great-grandfather', name: 'Ambrose Thatcher', dead: 1, from: 'thornbury', note: 'cleared the east fields by hand',
      say: 'Great-grandfather Ambrose. Came over from Thornbury with a cart and a ewe. His stones are still in the wall.' },
  ],
  origin: [
    'East fields. Four generations. Before that, Thornbury, but that was a long while back and Thornbury\'s welcome to forget it.',
    { t: 'Ambrose Thatcher, my great-grandfather. Walked over from Thornbury with one ewe in milk and a temper. Cleared the stones off the east fields with his own two hands.',
      learn: 'Hobb\'s great-grandfather Ambrose Thatcher came from Thornbury and cleared the east fields by hand.' },
    { t: 'Thornbury folk say their cider\'s better than our bread. I say they can drink their cider and go hungry.', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'And Thornbury mutton?', r: '~A slow grin. “There isn\'t any. We sold it to them.”', tr: 1 },
        { tone: 'curious', l: 'Do you still have kin there?', r: 'Cousins, somewhere. Thatchers breed like ewes. Never met half of them.', tr: 0 },
        { tone: 'kind', l: 'Brambleford\'s lucky Ambrose walked over.', r: 'Greta says that. Mostly about the wall.', tr: 1 },
        { tone: 'pious', l: 'Aurel blesses both towns.', r: 'He blesses ours first. Dawn comes up our end of the valley.', tr: 1 },
      ] } },
    { t: 'Greta\'s folk were Ferns, out at the forest edge. Feathers on every door. She brought the custom with her, and the temper. I married both.', min: 2 },
  ],
  family: [
    { t: 'The Hales and us don\'t sit together at harvest supper. Something about the wall between our grandfathers\' fields. Eighty years. Nobody remembers why. Nobody moves the bench either.', min: 1,
      learn: 'The Thatchers and the Hales have kept an eighty-year feud over a boundary wall; nobody remembers why.' },
    'Four generations of the one flock. Every ewe out there\'s a granddaughter of a granddaughter of Ambrose\'s first. Garrick says that\'s why they\'re tough.',
    { t: 'Wil was meant to have the flock. He\'d rather the forest. Greta says let him. I say who gets the sheep, then. She says the sheep will manage. She\'s usually right.', min: 2 },
  ],
  add: {
    greet: [
      { t: 'Wil\'s home! Came in with a deer on his back and mud to the eyebrows. Greta\'s not stopped feeding him.', if: 'here:wil' },
    ],
    how: [
      { t: 'Better than middling. Wil\'s home. A house sounds different with a son in it. Louder. Muddier.', if: 'here:wil' },
    ],
    news: [
      { t: '~He looks toward the churchyard. “Greta was out early. New feather on the little stone.” That\'s all he says.', min: 3 },
    ],
    gossip: [
      { t: 'Fenwick Hale called my lambs at the ring and got a fair price. Don\'t tell him I said fair. There\'s a wall between us, and I mean to keep it.', min: 1 },
      { t: 'New hand from Thornbury on the barn farm, Rowan Pell. Knows sheep. Thornbury sheep, mind. I\'m teaching him better.', if: 'here:rowan' },
    ],
  },
};

// Ned Harrow
FAMILY.ned = {
  house: 'Harrow',
  gen: 3,
  since: 'Three generations. His grandfather drove cattle over from Thornbury and stayed; his father was the militia sergeant.',
  from: 'thornbury',
  kin: [
    { rel: 'mother', id: 'hedda', say: 'Ma. Hedda. Takes in washing for half the town. Says the helmet will fit me by thirty and the shirts will fit me by never.' },
    { rel: 'father', name: 'Col Harrow', dead: 1, note: 'militia sergeant; lung fever three winters ago; the helmet was his',
      say: { t: 'Da. Sergeant Col Harrow. Lung fever, three winters back. Coughed for a month and still did his rounds. The helmet\'s his. I\'ll grow into it.', min: 1 } },
    { rel: 'grandfather', name: 'Hew Harrow', dead: 1, from: 'thornbury', note: 'a Thornbury drover who stayed',
      say: 'Grandda Hew drove cattle over from Thornbury and never drove them back. Ma says Harrows stay where they stop. Like gateposts.' },
    { rel: 'grandmother', name: 'Nan Stane', dead: 1, from: 'highfold', note: 'Hedda\'s mother; kept Korrum',
      say: { t: 'Ma\'s ma was a Stane, up at Highfold. Salt on the cairns, coin in the boot. That\'s where I got it from.', min: 2 } },
  ],
  origin: [
    'Here! Born in Brambleford. Never been further than Weyford, and that was to fetch a cart wheel.',
    { t: 'Da\'s side came from Thornbury. Grandda Hew was a drover. Ma\'s side came down from Highfold. So I\'m half cattle and half mountain. Dace said half goat.',
      learn: 'Ned\'s father\'s family were Thornbury drovers; his mother Hedda came down from Highfold.' },
    { t: 'Ma came down from Highfold with the drovers, and Da was on this gate, and he wrote her name in the log. That\'s the story. She tells it differently.', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'Should I check the log for your name too?', r: '~He goes red right up under the helmet. “There\'s nobody in it! Except a goat.”', tr: 1 },
        { tone: 'kind', l: 'That\'s a good story, Ned.', r: 'It is, isn\'t it? I tell it to everybody. I\'ve told it to the goat.', tr: 1 },
        { tone: 'curious', l: 'How does she tell it?', r: 'She says he was asleep at the post and she had to wake him to get in. Da always said that was slander.', tr: 1 },
        { tone: 'blunt', l: 'So you guard a gate because your father did.', r: '~His face falls a bit. “...Yes. And because Dace did. Mostly Dace.”', tr: 0 },
      ] } },
    { t: 'Bran says a Harrow and a Hollin have stood next to each other at every harvest supper since Grandda Hew. I don\'t know if it\'s true. I like that he says it.', min: 2 },
  ],
  family: [
    'It\'s just me and Ma now. She does the shirts and I do the gate. Between us we keep the town clean and counted.',
    { t: 'After Da, Ma took in washing so I wouldn\'t have to join the militia for the pay. Then I joined anyway, because of Dace. She didn\'t speak to me for two days.', min: 2 },
    { t: 'Bran half raised me after Da. Fed me at his table next to Dace. I\'ve got two families, really. One of them\'s missing a son.', min: 3 },
  ],
  add: {
    greet: [
      { t: 'Ma sent you a clean shirt. She says temple boys shouldn\'t look like that. I don\'t know what she means. You look fine.', min: 2 },
    ],
    how: [
      { t: 'Fine. Ma made me eat two breakfasts. She says I\'m wasting away on watch. I\'m not. The helmet\'s just big.', min: 1 },
    ],
    news: [
      { t: 'Ma says a smith\'s come up from Weyford to work for Bran. Oren. I walked past the forge three times to look. Bran threw a rag at me.', if: 'here:oren' },
    ],
    gossip: [
      { t: 'Ma does the Voss washing. She says the councilman\'s shirts smell of smoke, even clean. She doesn\'t say it loud.', min: 2 },
      { t: 'Wil Thatcher\'s back. He used to let me and Dace carry his snares. Said we were too loud to be any use. We were.', if: 'here:wil' },
    ],
  },
};

// Ilse Varga
FAMILY.ilse = {
  house: 'Varga',
  gen: 0,
  since: 'One season, stranded. Born on a Lowmere barge, raised in her mother\'s dye-yard, and married, she says, to the road.',
  from: 'lowmere',
  kin: [
    { rel: 'mother', name: 'Agi Varga', from: 'lowmere', note: 'runs the dye-yard; blue to the wrist',
      say: 'My mother, Agi. Blue to the wrist. She can smell woad on you across a market. She can smell lies further.' },
    { rel: 'father', name: 'Bela Varga', from: 'lowmere', note: 'a bargeman on the Silverrun',
      say: 'My father, Bela. Poles a barge on the Silverrun and sings to it. Can\'t read a word, so my mother writes for both of them and makes him sound politer.' },
    { rel: 'grandmother', name: 'Zsofi Varga', dead: 1, from: 'lowmere', note: 'started the dye-yard',
      say: { t: 'Grandmother Zsofi started the yard with one vat and a stolen recipe for madder. Never said who she stole it from. A great woman.', min: 1 } },
    { rel: 'brother', name: 'Miklos Varga', from: 'lowmere', note: 'works the barge with their father',
      say: { t: 'My little brother Miklos. Quiet. The only quiet Varga. We think somebody left him on the barge.', min: 2 } },
  ],
  origin: [
    'Lowmere! Far down the Silverrun. Barges, dye-yards, and a river that runs three colours on washing day.',
    { t: 'I was born on my father\'s barge, between a load of alum and a load of onions. My mother says that explains everything about me.',
      learn: 'Ilse was born on her father\'s barge at Lowmere and raised in her mother\'s dye-yard.' },
    { t: 'Every Varga girl goes into the vats by twelve. I went in at ten and came out blue to the elbow and shouting. The blue wore off.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Why leave the yard for the road?', r: 'Because the yard was my mother\'s. A woman wants a thing that\'s hers. Mine has wheels. Had wheels.', tr: 1 },
        { tone: 'joke', l: 'So you were born loud.', r: 'Born loud! The midwife asked for extra wages for her ears!', tr: 1 },
        { tone: 'kind', l: 'Your mother must miss you.', r: '~Quieter. “She writes every month. I can\'t send back. She\'ll think I\'m dead in a ditch.” Then, loudly: “I\'m not! I\'m in a very nice inn!”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps the river towns close.', r: 'Nemora keeps her blue very badly. I\'d rather she kept my mother.', tr: 0 },
      ] } },
    { t: 'Lowmere to Highcourt, Highcourt to Kettle Cross, Kettle Cross up the valley. That was the route. Three seasons, same wagons, same guards. Then the raid.', min: 2 },
  ],
  family: [
    'Vargas marry late and argue early. My mother made my father wait six years. He says it was worth it. She says she\'s still deciding.',
    { t: 'No husband, no children. Married to the road, I say, and the road has been a terrible husband. Leaves me stranded. Never writes.', min: 1 },
    { t: 'Grandmother Zsofi made me swear on the vats I\'d never sell bad colour. I\'ve sold cheap colour. Never bad. There\'s a difference, and she\'d know it.', min: 2 },
  ],
  add: {
    greet: [
      { t: 'My mother wrote again! I can\'t answer, so I read it to Odessa instead. She cried. Odessa cries at everything now. So do I.', min: 2 },
    ],
    how: [
      { t: 'Homesick! I dreamed of my mother\'s vats and woke up smelling woad. It was Hobb\'s cart.', min: 1 },
    ],
    news: [
      { t: 'Rolf\'s niece is helping at the Fox. Bess. Weyford girl. Knows a barge-knot when she sees one. We get on like two kettles.', if: 'here:bess' },
    ],
    gossip: [
      { t: 'Maren\'s stolen my seamstress! Ivy Pell. I found her first, at the Fox, and Maren paid her more. I\'d have done exactly the same.', if: 'here:ivy' },
      { t: 'There\'s a carter from Kettle Cross at the temple, Mags. I knew her yard. Burned, she says. I bought her a hot cup and we didn\'t talk about the road.', if: 'here:mags' },
    ],
  },
};

// Abel Cooper
FAMILY.abel = {
  house: 'Cooper',
  gen: 5,
  since: 'Five generations, founders\' blood by marriage: the first Cooper came up with the King\'s Road and married a Tolly.',
  from: 'brambleford',
  kin: [
    { rel: 'wife', name: 'Sela Cooper', from: 'weyford', note: 'née Miller; Jory Miller\'s daughter',
      say: 'Sela. Does the talking. I do the hooping. Jory Miller\'s girl. Married me anyway.' },
    { rel: 'son', id: 'tam', say: 'Tam. Six. The loud one. Breaks staves.' },
    { rel: 'daughter', id: 'lark', say: 'Lark. Six. The clever one. Counts staves. Lets Tam think he\'s the clever one.' },
    { rel: 'father-in-law', id: 'jory', say: 'Jory grinds the valley\'s flour and weighs every word like a sack. We get on. Neither of us talks.' },
    { rel: 'father', name: 'Mattias Cooper', dead: 1, note: 'cooper; same mark on the lids',
      say: 'My father, Mattias. Same mark on the lids. Ring with a line through it. Made true.' },
    { rel: 'grandfather', name: 'Old Pell Cooper', dead: 1, note: 'told the goblin-king stories',
      say: { t: 'Grandfather Pell. Told us a goblin king came up for honey, once. Mother said he made it up. He winked.', min: 1 } },
  ],
  origin: [
    'Here. Coopers have made the town\'s barrels since the road came through.',
    { t: 'First Cooper came up the valley with the road-builders, making water casks. Married the storekeeper\'s daughter. A Tolly. So Wendell\'s my cousin, a long way back. He reminds me at the till.',
      learn: 'The first Cooper came up the valley with the King\'s Road and married a founding Tolly; Abel and Wendell are distant cousins.' },
    { t: 'The mark came with him. Ring with a line through it. Five generations, same mark, same iron to burn it.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Same iron? The actual brand?', r: '~He nods at the wall. An old brand hangs there, black with use. “Handle\'s been replaced four times. The ring never.”', tr: 1 },
        { tone: 'kind', l: 'The twins will burn it one day.', r: 'If they want. Lark\'s already asked. Tam asked if it hurts the barrel.', tr: 1 },
        { tone: 'joke', l: 'And if a Cooper made a crooked barrel?', r: 'Then he burned the lid instead. Grandfather Pell burned three, his first year. We don\'t talk about it.', tr: 1 },
        { tone: 'blunt', l: 'It\'s just a barrel mark.', r: 'It\'s my name. ~Just that.', tr: -1 },
      ] } },
    { t: 'Sela\'s folk came up from Weyford. Millers, down there. Jory took the Bramble mill before she was born. So the twins are half flour, half barrel. They\'ll never starve.', min: 2 },
  ],
  family: [
    'Coopers and Tollys married once, long back. Coopers and Millers once, not so long. Sela says two good marriages in five generations is better than most.',
    { t: 'Father taught me on a half-barrel. Make it hold water, he said, then ale, then your name. I\'m teaching Lark the same way. Tam I\'m teaching to sweep.', min: 1, if: 'duty:abel_twins' },
    { t: 'Bran\'s grandfather made the first iron hoops my great-grandfather ever bought. Hollins and Coopers. We\'ve never once sent each other a bill.', min: 2 },
  ],
  add: {
    greet: [
      { t: 'Twins are out in the lane. Listen. ~You can hear them from here. He looks as if it were music.', if: 'here:tam' },
    ],
    how: [
      { t: 'Holding. Jory comes up from the mill every night and sits by the door. Doesn\'t speak. Helps more than I can say.', if: '!duty:abel_twins' },
    ],
    news: [
      { t: 'Tam and Lark went to the bakery on their own. First time. Came back with flour on their faces and Hester Dunning\'s whole life story.', if: 'here:lark' },
    ],
    gossip: [
      'Jory says the mill wheel\'s squeaking on the upstroke. He says it the way other men say their wife\'s poorly.',
      { t: 'Sela says Hedda Harrow\'s the only woman at the well who doesn\'t gossip. So Sela tells Hedda everything.', min: 1 },
    ],
  },
};

// Gil Brack
FAMILY.gil = {
  house: 'Brack',
  gen: 0,
  since: 'Fifteen years. A Saltmere fisherman\'s son who came inland for the weir-keeper\'s daughter and stayed.',
  from: 'saltmere',
  kin: [
    { rel: 'wife', id: 'liss', dead: 1, grave: 1, say: 'Liss. A Weir, she was. Laughed with her whole face. Two springs gone.' },
    { rel: 'father-in-law', name: 'Aled Weir', dead: 1, note: 'the old weir-keeper on the Bramble',
      say: 'Old Weir. Kept the weir forty years. Didn\'t like me. Liked my knots. Came round.' },
    { rel: 'mother-in-law', name: 'Marrit Weir', dead: 1, note: 'Liss\'s mother',
      say: { t: 'Liss\'s mother. Fed me eel pie the first night and said I was too thin to marry. Then fed me till I wasn\'t.', min: 1 } },
    { rel: 'father', name: 'Corm Brack', from: 'saltmere', note: 'a Saltmere fisherman; no word in ten years',
      say: { t: 'My father fished the grey sea. Might still. No word in ten years. Sea folk don\'t write. Sea doesn\'t either.', min: 2 } },
  ],
  origin: [
    'Saltmere. On the coast. Grey sea, grey sky, grey fish. ~A pause. “I miss it.”',
    { t: 'Saw her once, from a barge, at Weyford market. Went back down to the coast. Came inland the next spring for good.',
      learn: 'Gil saw Liss Weir from a river barge at Weyford, and came inland from the coast the next spring to marry her.' },
    { t: 'Sea\'s never still. Ponds are. Liss said I needed stillness. She was right.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Will you ever go back to the coast?', r: '~He thinks a long time. “No. She\'s here.”', tr: 1 },
        { tone: 'kind', l: 'Brambleford\'s glad you stayed.', r: 'Mm. Some of it.', tr: 1 },
        { tone: 'joke', l: 'Do the pond trout know they\'re facing a sea fisherman?', r: '~A huff. “They\'ve guessed. No respect.”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps the sea as well as the pond.', r: 'No. Sea\'s nobody\'s. That\'s why I left it.', tr: 0 },
      ] } },
    { t: 'Coast folk leave a blue stone on the step before a long voyage. I never knew why. Liss did.', min: 2 },
  ],
  family: [
    'No children. Wanted them. Didn\'t happen. ~He looks at the water. “Liss said the pond was ours.”',
    'Four brothers on the coast, all fishing. I\'m the one that stopped.',
    { t: 'Her father kept the weir. After he died she still walked down to it every morning. Habit. I walked with her. I don\'t now.', min: 3 },
  ],
  add: {
    greet: [
      { t: '~He has a little stack of flat blue stones beside him on the log. One for each moon, maybe. He doesn\'t explain.', min: 2 },
    ],
    how: [
      { t: 'Her name-day\'s near. Pike and dill. I\'ll set the plate. ~He says nothing more.', min: 2, if: '!duty:gil_pike' },
    ],
    news: [
      { t: 'Bess at the Fox asked would I take the trout run again, with Rolf\'s knee bad. Said I\'d think. Thought. Said yes.', if: 'here:bess' },
    ],
    gossip: [
      { t: 'Wil Thatcher\'s back. Brought me a forest trout wrapped in fern. Didn\'t say why. Didn\'t need to.', if: 'here:wil' },
      { t: 'The carter\'s boy, Davy. Sits with me at the pond. Doesn\'t talk. Good lad.', if: 'here:davy' },
    ],
  },
};

// Old Berta (Berta Lind): Ashvale kept quiet until berta_ashvale
FAMILY.berta = {
  house: 'Lind',
  gen: 0,
  since: 'Eighteen years. Came out of the north with her husband Joss and very little else, and does not say from where.',
  from: 'ashvale',
  kin: [
    { rel: 'husband', name: 'Joss Lind', dead: 1, grave: 1, note: 'a roofer; "carried me out of the north"; fell off their own roof, laughing',
      say: 'Joss. Forty years. Mended roofs. Fell off exactly one, and it was ours. His stone says he carried me out of the north. He did, dear. On his back, some of the way.' },
    { rel: 'son', name: 'Rafe Lind', dead: 1, note: 'died in the fire, aged thirty',
      say: { t: '~She puts her cup down very carefully. “I had a son, dear. Rafe. Thirty, and just learning to be sensible. He went back in for the neighbours.” She doesn\'t pick the cup up again.', min: 3,
        learn: 'Berta had a son, Rafe, who died at thirty in the fire that drove her out of the north.' } },
    { rel: 'sister', name: 'Mae Ashby', note: 'married into Thornbury long before the fire; no word since',
      say: { t: 'My sister Mae married a Thornbury man when we were girls. I never wrote, after. She\'d think me dead. Easier for her, I told myself.', min: 2 } },
    { rel: 'grand-niece', id: 'linnet',
      say: { t: 'Linnet. Mae\'s granddaughter. Walked all the way from Thornbury looking for a dead woman, and found me. She has Mae\'s chin. And Mae\'s nerve.', if: 'here:linnet' } },
  ],
  origin: [
    'Up the valley, dear. North. A long way, over a cliff road. Joss carried most of what we had, and some of me.',
    { t: 'We came down the old track with lavender roots wrapped in my shawl. Everything else burned. The roots took. Stubborn things. Like me.', min: 2,
      learn: 'Berta and Joss came down from the north eighteen years ago with nothing but lavender roots; everything else burned.' },
    { t: 'Brambleford took us in. Mostly. Your Halvard found us a cottage, and the council found us a list to be written on. One of those was kinder.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'What list?', r: 'Oh, a list of who came, dear, and from where. Clerks love a list. I hope it\'s kept somewhere dry.', tr: 1 },
        { tone: 'kind', l: 'I\'m glad he found you.', r: 'So am I, child. He carried my wood for eighteen years. He carried rather more than wood.', tr: 1 },
        { tone: 'blunt', l: 'The council should have helped you.', r: 'The council did exactly what it wanted to, dear. That\'s what councils are for.', tr: 0 },
        { tone: 'pious', l: 'Aurel keeps a door open for travellers.', r: 'He kept one open for us. It had a priest standing in it.', tr: 1 },
      ] } },
    { t: 'I can say it in here, now. Ashvale. Joss was born there, and his father. I married in from the next farm over. Three generations of Linds under one roof, till there wasn\'t a roof.', if: 'duty:berta_ashvale' },
  ],
  family: [
    'Joss and I had forty years and one argument. It lasted thirty-nine of them. About the roof.',
    { t: 'Rafe was to marry the miller\'s girl that autumn. I\'d started the shawl. I finished it here and gave it to the temple. Halvard knew who it was for.', min: 4, if: 'duty:berta_ashvale' },
    { t: 'Your grandfather was our neighbour, dear. Aldren. And your mother Wenna stole my plums every summer. I let her. I\'d let you, too.', min: 4, if: 'duty:berta_ashvale' },
  ],
  add: {
    greet: [
      { t: '~There are two cups on the table today, and a young woman in the second chair. Berta glows. “Come and meet my Linnet, dear. My sister\'s girl\'s girl.”', if: 'here:linnet' },
    ],
    how: [
      { t: 'Better than I\'ve been in years, dear. I\'ve family in the house. Did you know I had family? Neither did I.', if: 'here:linnet' },
    ],
    news: [
      { t: 'Hester Dunning came by. We sat and were old together. She remembers Halvard stealing buns. I remember nothing so cheerful.', min: 1 },
    ],
    gossip: [
      'Hedda Harrow brings my sheets back whiter than I sent them and won\'t take a copper. Says her Col liked my seed cake. He did. Ate four.',
      { t: 'Mags Tenney and her boy are sleeping by the temple. Burned out. I took a blanket and sat with her. Burned-out women know each other, dear. We don\'t have to say.', if: 'here:mags' },
    ],
  },
};

// Garrick Sallow
FAMILY.garrick = {
  house: 'Sallow',
  gen: 0,
  since: 'Twenty years. Born in a peddler\'s cart on the river roads; cooked for the Crown\'s levies, then married a Thornbury girl and stopped.',
  from: 'weyford',
  kin: [
    { rel: 'daughter', id: 'nettie', say: 'Nettie. My girl. Nineteen, and cleverer than her da by a cart-length. Got that from her mother.' },
    { rel: 'wife', name: 'Rosamund Sallow', dead: 1, from: 'thornbury', note: 'a Thornbury girl; died ten years ago; buried with her people at Thornbury',
      say: { t: '~The cleaver stops. “Rosamund. Thornbury girl. Laughed louder than me, which takes doing. Ten years gone. Her people took her home to Thornbury to lie. I let them. Some days I wish I hadn\'t.”', min: 2,
        learn: 'Garrick\'s wife Rosamund, a Thornbury girl, died ten years ago and was buried with her people at Thornbury.' } },
    { rel: 'mother', name: 'Dilly Sallow', dead: 1, note: 'a peddler; drove the family cart',
      say: 'Ma drove the cart. Pins, pans, and lies about the pans. Could out-haggle Rolf in her sleep.' },
    { rel: 'father', name: 'Jem Sallow', dead: 1, note: 'a peddler; hung antlers for Veyra',
      say: 'My old dad hung every antler he found over the cart for Veyra. By the end the mule could hardly pull it.' },
  ],
  origin: [
    'Nowhere, lad! Everywhere! Born in a cart between Weyford and Lowmere, on a road with no name, under a tarp that leaked.',
    { t: 'My folk were peddlers. River roads, up and down the Silverrun, pins and pots and ribbons. I learned meat off a drover\'s widow, and then the levies took me on to cook.',
      learn: 'Garrick was born to a peddler family on the river roads and learned butchery before he cooked for the Crown\'s levies.' },
    { t: 'After the wars I came up the valley to sell salt pork at Thornbury market. Met a girl selling cider. Never sold the pork. Married the girl.', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'What happened to the pork?', r: 'Ate it at the wedding! Best pork I ever made, and I was too happy to taste it!', tr: 1 },
        { tone: 'kind', l: 'She sounds wonderful.', r: '~He goes quiet, which is rare. “She was, lad. She was.”', tr: 1 },
        { tone: 'curious', l: 'Why Brambleford and not Thornbury?', r: 'Thornbury had a butcher. Brambleford had a hole where one should be. Rosamund said, fill the hole, Garrick.', tr: 1 },
        { tone: 'pious', l: 'Aurel brought you to her.', r: 'Aurel, a mule, and a broken axle. I thank all three.', tr: 1 },
      ] } },
    { t: 'First roof I ever slept under that didn\'t move was that smokehouse. Lay awake all night waiting for it to go somewhere.', min: 2 },
  ],
  family: [
    'Sallows don\'t settle. That\'s the family saying. I\'m the first to break it. Nettie\'ll be the second, if she takes the smokehouse.',
    { t: 'No brothers, no sisters. Ma said one of me was a whole cartload.', min: 1 },
    { t: 'Rosamund\'s mother sends a cask of Thornbury cider every harvest, with a note. I can\'t read the notes. I keep them all in a box under the counter anyway.', min: 3 },
  ],
  add: {
    greet: [
      { t: 'Nettie\'s home! Look at her at the smokehouse, telling me I\'ve done it wrong for twenty years. She\'s right. Don\'t tell her.', if: 'here:nettie' },
    ],
    how: [
      { t: 'Grand! Truly grand! My girl\'s home. The place smells of smoke and somebody else\'s opinions.', if: 'here:nettie' },
    ],
    news: [
      { t: 'Nettie says the Weyford house she served smoked their hams in two days. Two! She came home to learn it right.', if: 'here:nettie' },
    ],
    gossip: [
      'Hobb and Fenwick still won\'t sit together at harvest supper. Something about a wall. I sit between them and eat both their puddings.',
      { t: 'Wil Thatcher\'s back from the forest with a stag. Paid him fair. Paid him loud. That boy hunts the way his mother argues.', if: 'here:wil' },
    ],
  },
};

// Fenwick Hale
FAMILY.fenwick = {
  house: 'Hale',
  gen: 3,
  since: 'Three generations. His grandfather drove cattle down from Thornbury and stayed; his father Hob called the ring before him.',
  from: 'thornbury',
  kin: [
    { rel: 'father', name: 'Hob Hale', dead: 1, note: 'auctioneer before Fenwick; died ten years ago; the ash gavel was his',
      say: 'My father, Hob Hale! Called this ring before me, voice like a gate in a gale. The gavel\'s his. Ten years gone, and I still hear him correcting my prices.' },
    { rel: 'mother', name: 'Prue Hale', note: 'lives at Thornbury with Fenwick\'s married sister',
      say: 'Mother! Prue Hale! Lives at Thornbury with my sister and writes every month to ask if I\'ve married. I write back: going once, going twice.' },
    { rel: 'sister', name: 'Dorrit', note: 'married at Thornbury',
      say: { t: 'My sister Dorrit married a Thornbury cider-man and talks faster than I do. We\'re not allowed in the same room. The furniture shakes.', min: 1 } },
    { rel: 'grandfather', name: 'Amos Hale', dead: 1, from: 'thornbury', note: 'drove cattle down from Thornbury and stayed',
      say: 'Grandfather Amos drove a herd down from Thornbury, sold it at this very ring, and liked the price so much he stayed. Hales follow the money. Then we sing about it.' },
  ],
  origin: [
    'Thornbury, three generations back! Brambleford ever since! Best of both, worst of neither, going once!',
    { t: 'Grandfather Amos drove cattle down from Thornbury, sold them at this ring, and never went home. Bought a stool and started calling the sales himself. Nobody asked him to.',
      learn: 'Fenwick\'s grandfather Amos Hale drove cattle from Thornbury, stayed, and began calling the market ring sales.' },
    { t: 'Mother went back to Thornbury after Father died. Said Brambleford was too quiet without him. ~He grins. “I said, I\'m still here. She said, that\'s what I mean.”', min: 1,
      ask: { opts: [
        { tone: 'joke', l: 'Too quiet? With you in it?', r: 'That was the joke, friend! She\'s very funny. Hales are all very funny. Ask anyone. Don\'t ask Hobb.', tr: 1 },
        { tone: 'kind', l: 'You must miss her.', r: '~The patter stops. “I do. Every seventh day I mark the best price of the day in the book for her. She\'ll never see it.”', tr: 1 },
        { tone: 'curious', l: 'Why don\'t you go back too?', r: 'And leave the ring? Who\'d call it? Garrick? He\'d sell the cows for a sausage apiece.', tr: 1 },
        { tone: 'pious', l: 'Aurel keeps families close across the miles.', r: 'He keeps the post slow, I know that much.', tr: 0 },
      ] } },
    { t: 'Father took me to Thornbury market once, as a boy. I stammered so badly at the stall I couldn\'t ask for a pie. Halvard fixed the stammer later. Thornbury still owes me a pie.', min: 2 },
  ],
  family: [
    { t: 'Hales and Thatchers don\'t sit together at harvest supper. A boundary wall, eighty years old. Hobb says his great-grandfather built it. My grandfather always said it was in the wrong place.', min: 1 },
    'My father was Hob, one b. The Thatcher is Hobb, two. Two men with nearly the one name, and they never once shared a bench. That\'s Brambleford for you.',
    { t: 'Unmarried! Never found a woman who could get a word in. I keep waiting. I keep talking.', min: 1 },
  ],
  add: {
    greet: [
      { t: 'I sang the dawn hymn for Father this morning. He\'d have said I was flat. I was flat.', if: 'phase:Dawn,Morning', min: 2 },
    ],
    how: [
      { t: 'Splendid! Mother\'s written. My sister\'s had another baby. That\'s five. Thornbury Hales breed like their apples.', min: 1 },
    ],
    news: [
      'Letter from Mother in Thornbury! Cider\'s good, sheep are fat, and have I married. Same letter every month. I keep every one.',
    ],
    gossip: [
      { t: 'A journeyman at the forge, Oren, from Weyford! Bran\'s first hand since the boy. Opening odds on how long he lasts: I say a year. Garrick says a week.', if: 'here:oren' },
      { t: 'Rowan Pell\'s from Thornbury, did you know? Knows my sister\'s husband\'s cousin. Everyone in Thornbury knows everyone\'s cousin.', if: 'here:rowan' },
    ],
  },
};

// Ewan Fell
FAMILY.ewan = {
  house: 'Fell',
  gen: 0,
  since: 'A Highfold man, not a townsman: he comes down with the cattle. His cousin Ada married Bran Hollin, which makes the smith his kin.',
  from: 'highfold',
  kin: [
    { rel: 'cousin', name: 'Ada Hollin', dead: 1, grave: 1, from: 'highfold', note: 'née Fell; Bran\'s wife; died of a winter fever six years ago',
      say: { t: 'Ada. My cousin. Our fathers were brothers. She could outwalk me on any pass. Six years gone. I put salt on her stone when I come down.', min: 1 } },
    { rel: 'cousin-in-law', id: 'bran', say: 'Bran. Came up the hill for charcoal and went down with Ada. Best bargain he ever made, and he knows it.' },
    { rel: 'second cousin', id: 'dace', say: { t: 'Dace. Ada\'s boy. Walked up to Highfold with me the summer he was twelve and wouldn\'t come down. Bran had to fetch him.', min: 1 } },
    { rel: 'grandfather', name: 'Tavish Fell', dead: 1, from: 'highfold', note: 'built the cairn by the ring gate',
      say: 'Grandfather Tavish built the cairn by the ring gate, first year he drove down. Highfold stone, every one. Carried them in his pack.' },
    { rel: 'mother', name: 'Morag Fell', from: 'highfold', note: 'delivered him herself in a shieling',
      say: 'My mother. Delivered me herself and went back to the milking. Still milks. Still doesn\'t hold with fuss.' },
    { rel: 'former wife', name: 'Brenna', from: 'highfold', note: 'amicably parted',
      say: { t: 'Brenna. She wanted a man who came home at night. Married a cheesemaker. I sell him milk. No hard feelings.', min: 3 } },
  ],
  origin: [
    'Highfold. The high pastures under the peaks. Stone shielings, cairns, and goats that look at you like you owe them.',
    { t: 'Fells have run cattle on the high pastures as long as there\'ve been cairns. Longer, maybe. We built some of the cairns.',
      learn: 'Ewan\'s family, the Fells, have kept cattle on the Highfold pastures for generations and built many of the cairns.' },
    { t: 'Grandfather was the first Fell to bring cattle down to this ring. Said valley money spends the same as hill money and smells better than goat.', min: 1,
      ask: { opts: [
        { tone: 'curious', l: 'Do many Highfold folk come down to the valley?', r: 'Some. Ada did. Hedda Harrow did. Hill girls marry down. Hill men walk back up.', tr: 1 },
        { tone: 'joke', l: 'Does it smell better than goat?', r: 'Everything does. Except Fenwick\'s waistcoats.', tr: 1 },
        { tone: 'kind', l: 'The valley\'s glad you come.', r: '~A slow nod. “The dogs are. I\'m getting there.”', tr: 1 },
        { tone: 'pious', l: 'Korrum watches over the cairn here too.', r: 'He does. That\'s why Grandfather built it. A bit of the hill in the valley.', tr: 1 },
      ] } },
    { t: 'Up there you know every name for a day\'s walk, and every name\'s a cousin. Down here nobody\'s kin. Except Bran. I keep forgetting he is.', min: 2 },
  ],
  family: [
    'Fells marry late and part kind. My mother says it\'s the altitude.',
    { t: 'Hill folk count kin out to the fourth cousin. By that reckoning I\'m related to half of Highfold and one smith.', min: 1 },
    { t: 'Ada and I learned to whistle the dogs from the same old drover. She was better. Bran never heard her whistle. Should have.', min: 2 },
  ],
  add: {
    greet: [
      { t: 'Been up the lane to the forge. Bran and I sat an hour. Said four words. Two were about Ada.', min: 2 },
    ],
    how: [
      { t: 'Middling. Sat by Ada\'s stone a while this morning. Salt and a coin. She\'d laugh. Hill folk don\'t hold with stones in the ground.', min: 3 },
    ],
    news: [
      { t: 'Bran\'s taken on a Weyford lad at the forge. Good. A forge with one man in it is a cairn with one stone.', if: 'here:oren' },
    ],
    gossip: [
      'Hedda Harrow\'s a Stane. Highfold folk. We nod at the ring. That\'s a long talk, for hill people.',
      { t: 'Bran says the boy\'s on patrol. I say Dace\'s name to the dogs, plain, so somebody does.', min: 2, if: '!flag:dace_told' },
    ],
  },
};

// =====================================================================
// New faces: who they are, how they look, what they say, and the news when they come
// =====================================================================
// New townsfolk, batch 1: hester, hedda, jory, bess, nettie, wil, oren

// =====================================================================
// Hester Dunning: Marta's mother, 78, retired baker. Tart, unsentimental, sharp-eyed; founder-proud; fed Halvard buns.
// =====================================================================
Object.assign(PEOPLE, { hester: {
  name: 'Hester Dunning', role: 'retired baker, Marta\'s mother', spr: 'fam_hester', where: 'the bench outside the bakery',
  look: 'Seventy-eight, small and bent as a hook, with flour still in the creases of her knuckles. She sits on the bench by the bakery door and tells passers-by their bread is too pale.',
  story: [
    [0, 'She baked under the Dunning sun-disc for fifty years before she gave the oven to Marta. She still gets up at dawn, out of spite.'],
    [2, 'When Marta was twelve and wanted to serve the temple, Hester fetched her home by the ear. Now Pippa wants the same, and Hester is no longer sure she was right.'],
    [4, 'She remembers the night Halvard came home from the north eighteen years ago. He knocked on her door before the temple\'s, for warm milk and a clean cloth. The swaddling smelled of smoke and lavender.'],
  ],
  ties: { marta: 'Her daughter. They bicker over the oven the way other families bicker over land.', pippa: 'Her granddaughter, whom she spoils without apology.', wendell: 'Her son-in-law. She calls him "the grocer" and sits in his best chair.', jory: 'Jory Miller has ground her flour for fifty years. She accuses him of short weight every single time.', berta: 'Sits with Old Berta on warm afternoons. They argue about which of them is older.' },
  talk: ['Too pale. All of it. Folk have forgotten what a crust is.', 'I\'m not retired. I\'m supervising.', 'Sit, if you\'re sitting. Don\'t hover. Halvard hovered.'],
  halvard: '“Skinny little thief. Took a bun off my cooling board every morning for a year and thought I didn\'t see. I left the best one nearest the window.”',
} });
NEW_FIGS.hester = { build: 'slim', skin: 'eab38b', hat: 'kerchief', hatColor: 'efe6d2', hair: 'bun', hairColor: 'e8e8e8', shirt: '6e4a5a', torso: 'dress', apron: 1, wrinkles: 1, jaw: 'soft', held: 'staff' };
DIALOGUE.hester = {
  intro: [
    '~An old woman on the bench by the bakery door looks you up and down as if you were a loaf. “Halvard\'s foundling. You\'ve grown. Not enough. Sit down.”',
  ],
  greet: [
    { t: 'Too thin. Sit.', max: 1 },
    { t: '{n}. Sit where I can see you. My eyes are good. My neck isn\'t.', min: 2 },
    { t: '~She is already on the bench in the grey before sunrise, shawl over her head. “Oven\'s lit. I checked. Marta says I needn\'t check. I check.”', if: 'phase:Dawn' },
    { t: 'Pippa says you let her do the lamps. Sit down. I\'m deciding whether to be cross.', if: 'flag:pippa_serves' },
    { t: 'Feast day. Marta\'s doing the sun-loaves. I\'m doing the shouting.', if: 'event:feast' },
    { t: '~She doesn\'t tell you to sit. She moves her stick so there\'s room, and waits.', if: 'found' },
  ],
  bye: [
    'Go on, then.',
    'Eat something. Bread, preferably. Ours.',
    { t: 'Mind the cave road. I\'m too old to bury anyone else I like.', min: 2 },
  ],
  how: [
    'Old. Next question.',
    { t: 'I sleep four hours and wake listening for the oven. Fifty years. You don\'t stop.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'You\'ve earned your rest, Hester.', r: 'Rest. I\'ll rest in the churchyard, next to Father Edmund. Plenty of room.', tr: 0 },
      { tone: 'joke', l: 'Maybe the oven listens for you too.', r: '~A cackle like a dry hinge. “It does. It sulks when I don\'t come out.”', tr: 1 },
      { tone: 'pious', l: 'Aurel keeps the hearth. Let him watch it.', r: 'Aurel never kept a fire in through a gale. I have. Nice thought, though.', tr: 0 },
      { tone: 'blunt', l: 'You don\'t trust Marta with it.', r: '~She squints at you. “...No. And she\'s better at it than I ever was. Both true. Tell her neither.”', tr: 1, learn: 'Hester admits Marta is a better baker than she was. She will never tell her so.' },
    ] } },
    { t: 'I put my black shawl on this morning, then took it off again. I\'m too old to wear black for boys I fed.', if: 'found' },
  ],
  self: [
    'Hester Dunning. Dunnings were baking here before there was a here. Ask anyone. Ask the oven.',
    { t: 'My mother Agnes taught me the oven words. I taught Marta. Marta taught Pippa, and Pippa\'s teaching the temple lamps. It goes somewhere, I suppose.', min: 2 },
  ],
  workLabel: 'About the bakery',
  work: [
    'Rye first day, wheat third, seed loaves on the seventh. Marta does it now. I watch, and she pretends I\'m not there.',
    'A crust should crack when you squeeze it. If it bends, it\'s a cushion. Folk are eating cushions these days.',
    { t: 'The sun-disc over the oven went up before the council did. Six generations. The nail\'s new. Third nail.', min: 1 },
  ],
  news: [
    { t: 'Rolf\'s knee is bad again and the Fox is short of hands. He\'s too proud to send to Weyford.', if: '!here:bess' },
    { t: 'Rolf\'s niece has come up from Weyford. Joan\'s girl. She\'s got her grandmother Nell\'s mouth on her. Good.', if: 'here:bess' },
    { t: 'The Cooper twins are up. Jory came by to tell me, then cried on my bench and blamed the flour dust.', if: 'duty:abel_twins' },
    { t: 'They say you\'ve got down to where the cave splits four ways. My mother would have sent you with a loaf for each door. For manners.', if: 'junction' },
    { t: 'Ground shook last night. Rattled every tin on Marta\'s shelf. Something under that hill has woken up cross.', if: 'gate' },
  ],
  halvard: [
    'Skinny little thief. A bun off my cooling board every morning for a year. I left the best one nearest the window.',
    { t: 'His mother washed for the lane and his father mended wheels. Poor as mice. Father Edmund took him in hand, and I took him in buns.', min: 1, learn: 'Halvard was a poor boy, son of a wheelwright and a laundress, taken in hand by old Father Edmund Reeve.' },
    { t: 'He\'ll come back. He always came back. Came back once with a baby, didn\'t he? Nothing he does surprises me.', if: '!found' },
    { t: 'The swaddling smelled of smoke. And lavender. Nobody grows lavender in this valley but Berta, and Berta came that same month. I\'m old, not daft.', min: 4, learn: 'Hester says the baby Halvard brought home smelled of smoke and lavender, and Old Berta arrived the same month.',
      ask: { opts: [
        { tone: 'curious', l: 'What do you think it means?', r: 'I think it means you ask Berta, not me. And you ask her gently.', tr: 1 },
        { tone: 'kind', l: 'Thank you for the milk, Hester.', r: '~She snorts and looks away, and her mouth works. “You were very small. You drank like a calf.”', tr: 1 },
        { tone: 'blunt', l: 'You\'ve known all this time and said nothing?', r: 'Known what? That a priest came home with a baby and a cough full of smoke? Nobody asked me. I don\'t gossip. Much.', tr: 0 },
      ] } },
    { t: 'He can have every bun I ever baked. Steal the lot. Just come and steal one more.', if: 'found' },
  ],
  caves: [
    'When I was a girl the carts took salt up the North Road and came back with funny little carvings. Mam called them gifts from the folk below. Nobody says that now.',
    { t: 'Four kingdoms under the hill, the old folk said. Like four bakers on one street. Nobody sleeps.', min: 1 },
    { t: 'Don\'t open that great door just because you can. My mother said what sleeps under hills sleeps for a reason.', if: 'seals:3 !gate' },
  ],
  gods: [
    'Bread keeps people alive and prayers keep them company. I said it to Marta thirty years ago and she\'s never forgiven me. Still true.',
    { t: 'Edmund Reeve lit the lamps every dawn for forty years. Then Halvard. Now my granddaughter. I suppose that\'s a god keeping house.', min: 2, if: 'flag:pippa_serves' },
  ],
  gossip: [
    'Wendell owes half the town and the other half owes Wendell. It balances. That\'s all a grocer is.',
    { t: 'Ysolde Quill left the loom to one child and the house to the other, and both to spite. I was at the reading. She\'d have smiled in her coffin.', min: 1, learn: 'Hester was at the reading of Ysolde Quill\'s will: the Quill quarrel began over the loom and the house.' },
    { t: 'The councilman bought my old pasture when he came. Paid in silver so new it squeaked. Odd mark on it, too. I spent it anyway. Silver\'s silver.', min: 3 },
    { t: 'Hedda Harrow\'s boy stands at that gate all night in his father\'s helmet. She doesn\'t sleep either. Two lamps burning in that house.', min: 1 },
  ],
  about: {
    marta: [
      'My daughter. Better baker than me. Don\'t you dare repeat that.',
      { t: 'I fetched her home from the temple by the ear when she was twelve. She wanted to serve. I wanted her fed. I\'m less sure than I was.', min: 3, learn: 'Hester is the one who stopped Marta serving the temple as a girl, and has come to doubt it.',
        ask: { opts: [
          { tone: 'kind', l: 'You did what you thought was right.', r: 'Everybody does. That\'s the trouble with it.', tr: 1 },
          { tone: 'blunt', l: 'Then tell her so.', r: '~She glares. Then, slowly: “Perhaps. When she\'s not holding a knife.”', tr: 1 },
          { tone: 'pious', l: 'Aurel had other plans for her. Bread is an offering too.', r: 'Hmph. That\'s what I told her. Hearing it back, it sounds like an excuse.', tr: 0 },
        ] } },
    ],
    pippa: [
      'Pippa\'s got her grandfather\'s legs and her great-grandmother\'s mouth. The lamps are lucky to have her.',
      { t: 'If that girl wants the temple, she\'ll have it. I won\'t fetch her by the ear. My arm\'s not what it was, and my mind\'s changed.', min: 2 },
    ],
    wendell: [
      'The grocer. Good heart. Counts like a man falling downstairs.',
      { t: 'He thinks I don\'t know about the second ledger. I know about the second ledger.', min: 3, if: '!duty:wendell_tax' },
    ],
    jory: [
      'Jory Miller. Thumb in the scoop for fifty years. I\'d trust him with my life and not my flour.',
      { t: 'He lost his Maud the same winter I lost Wat. We sat on this bench and didn\'t speak for a month. Best company I ever had.', min: 2 },
    ],
    berta: [
      'Berta says she\'s older. She isn\'t. I\'ve seen her teeth.',
      { t: 'She came into the valley with a coat and Joss and nothing else. I sent bread round. She sent the cloth back with lavender in it. We\'ve been at it eighteen years.', min: 2 },
    ],
  },
};
FAMILY.hester = {
  house: 'Dunning', gen: 5,
  since: 'Founders. A Dunning baked under the first sun-disc in Brambleford, before the road was finished.',
  from: 'brambleford',
  kin: [
    { rel: 'daughter', id: 'marta', say: 'Marta. Runs my oven better than I did. I tell her it\'s too hot.' },
    { rel: 'granddaughter', id: 'pippa', say: 'Pippa. Ten and a half, she\'ll tell you. Every half counts at that age. Every half counts at mine.' },
    { rel: 'son', name: 'Hal Dunning', from: 'brambleford', note: 'cathedral baker at Highcourt these twenty years', say: 'Hal went south to bake for the cathedral. Sends a sun-loaf mould every midwinter. I\'ve nineteen. I\'d trade the lot for one visit.' },
    { rel: 'husband', name: 'Wat Dunning', dead: 1, from: 'weyford', note: 'a Weyford miller\'s son who married into the oven', say: { t: 'Wat. Weyford miller\'s son, carried sacks like kittens. Took my name, not me his. Died with flour in his beard, which is how he\'d have wanted it.', min: 1 } },
    { rel: 'son-in-law', id: 'wendell', say: 'The grocer. He makes Marta laugh and he makes her furious, and both keep her young.' },
    { rel: 'mother', name: 'Agnes Dunning', dead: 1, from: 'brambleford', note: '"Old Agnes"; taught the oven words', say: 'My mother, Old Agnes. Taught me the oven words with a wooden spoon. On the knuckles, when I got one wrong.' },
  ],
  origin: [
    'From here. Where else? The first thing anyone built in Brambleford was a lamp, and the second was our oven.',
    { t: 'The founders. Tollys, Barrows, Quills, Coopers, us. Newer families roll their eyes when we say it. Let them. Their bread\'s ours too.', min: 1 },
    { t: 'Mam said the first Dunning walked up the valley with a crock of starter dough in her shirt to keep it warm. That starter\'s still going. We feed it like a pig.', min: 2, learn: 'The Dunnings\' sourdough starter is said to be as old as Brambleford.' },
    { t: 'And you came down the North Road in Halvard\'s coat. That\'s an origin. Don\'t let anyone tell you otherwise.', min: 2, ask: { opts: [
      { tone: 'curious', l: 'Do you know where he found me?', r: 'North. Smoke. That\'s all he ever said, and he said it to the milk pan, not to me.', tr: 0 },
      { tone: 'kind', l: 'Then I\'m from Brambleford too.', r: '~She pats your knee, hard. “You are. I fed you. That settles it.”', tr: 1 },
      { tone: 'joke', l: 'In his coat? Was it a very big coat?', r: 'You were a very small baby. Hah. The coat was too big for him, too.', tr: 1 },
    ] } },
  ],
  family: [
    'Wat came up from Weyford to carry flour and stayed to carry me. Took the Dunning name. We don\'t give ours up.',
    { t: 'Jory Miller tells everyone he\'s no kin to Wat. Every miller in Weyford is called Miller. I call him cousin just to watch his face.', min: 1 },
    { t: 'Hal should have had the oven. He wanted the cathedral. Marta wanted the temple and got the oven. Nobody in this family gets what they wanted. We get what needs doing.', min: 3 },
  ],
};
GIFT_TASTES.hester = { love: ['wheat', 'wood'], like: ['egg', 'milk', 'apple', 'oil'], dislike: ['cat:monster', 'cat:weapon', 'gel'] };
GIFT_LINES.hester = {
  love: [
    '~She weighs the {item} in both hands and nods once, the highest praise a Dunning gives. “Now that\'s worth having. Don\'t tell Marta, she\'ll take it.”',
    'Good. Proper. Somebody raised you right, and I\'ll take some of the credit.',
  ],
  like: [
    'That\'ll do. That\'ll more than do.',
    '~She tucks the {item} under her shawl as if someone might steal it. “Thank you, pet.”',
  ],
  neutral: [
    'What am I meant to do with that? ...Thank you. I\'ll think of something.',
    '~She peers at the {item}. “Hm. Wendell will sell it to somebody.”',
  ],
  dislike: [
    '~She pokes the {item} with her stick. “Not on my bench.”',
    'Halvard used to bring me frogs. You\'re not much better.',
  ],
  special: {
    wheat: '~She rubs the ear between her palms, blows the chaff and bites a grain. “Hard and dry. Good. Jory\'ll grind this too fine and charge me for the privilege.”',
    wood: 'Oven wood! Split right, too. Fifty years and nobody ever brought me oven wood. They brought me flowers. Flowers don\'t bake.',
  },
};
ARRIVE_NEWS.hester = '';

// =====================================================================
// Hedda Harrow: Ned's mother, Highfold-born widow, washerwoman. Plain, dry, few words, fierce for her son; sees everything in the washing.
// =====================================================================
Object.assign(PEOPLE, { hedda: {
  name: 'Hedda Harrow', role: 'washerwoman, Ned\'s mother', spr: 'fam_hedda', where: 'the drying lines behind the tidy timber house',
  look: 'A tall, rawboned Highfold woman with forearms red from lye and a mouth that rarely bothers to smile. Every shirt in the lane goes through her copper sooner or later.',
  story: [
    [0, 'Widow of Sergeant Col Harrow, who died of lung fever three winters ago. She takes in the town\'s washing and keeps Ned\'s supper warm whatever hour he comes off the gate.'],
    [2, 'She washed Halvard\'s robes every week. His last bundle came back with red cave clay on the hems: he had been up the North Road more than once before he went for good.'],
    [4, 'When the Vosses came to town eighteen years ago, she was hired for their washing. The first thing she was handed was a grey cloak with a badge torn off the shoulder, and she was told to burn it, not wash it. She did.'],
  ],
  ties: { ned: 'Her only son. She wanted him to drive carts.', bran: 'Bran fed Ned through the hungry year after Col died. She has never found a way to thank him that he\'d accept.', ewan: 'Highfold folk both. They nod at the market and speak about once a season.', voss: 'Washes for the council house still, and says nothing about what she finds in the pockets.', tamsin: 'Tamsin sat with Col at the end. Hedda washes her rags for nothing.' },
  talk: ['Lye doesn\'t care who you are. That\'s the best thing about it.', 'Shirts tell you everything. Folk forget that.', 'Mind the line. That sheet\'s the council\'s.'],
  halvard: '“Washed his robes twenty years. He always apologised for the mud. Never once stopped bringing it.”',
} });
NEW_FIGS.hedda = { build: 'adult', skin: 'eab38b', hat: 'kerchief', hatColor: '9aa5b0', hair: 'braid', hairColor: '7a4a22', shirt: '5a6a7a', torso: 'dress', apron: 1, jaw: 'soft', heavyBrow: 1, held: 'basket' };
DIALOGUE.hedda = {
  intro: [
    '~A tall woman wrings out a sheet as if it owes her money, then looks at you over the line. “Acolyte. Ned says you\'re kind to him. Good. Someone ought to be.”',
  ],
  greet: [
    { t: 'Acolyte.', max: 1 },
    { t: '{n}. Hand me those pegs.', min: 2 },
    { t: '~Steam rolls off the copper into the cold. “Early. Good. Nobody bothers me at dawn but the lye.”', if: 'phase:Dawn' },
    { t: 'Ned came home and slept twelve hours. First time since spring. I don\'t know what you said to him. Thank you.', if: 'flag:dace_told' },
    { t: '~She is folding something black, very carefully, and doesn\'t look up straight away.', if: 'found' },
  ],
  bye: [
    'Go on.',
    { t: 'Send Ned home if you see him. He won\'t come for me.', min: 1 },
    { t: 'Salt on the cairn, if you pass one. For me.', min: 2 },
  ],
  how: [
    'Wet to the elbow. Same as always.',
    { t: 'Ned\'s on nights again. I don\'t sleep when he\'s on nights. I wash instead. The lane\'s never been cleaner.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'I\'ll keep an eye on him at the gate.', r: '~Her hands stop in the water. “Would you. ...Aye. Thank you.”', tr: 1 },
      { tone: 'blunt', l: 'He\'s a grown man, Hedda.', r: 'He\'s eighteen in his father\'s helmet. That\'s not grown. That\'s dressed up.', tr: 0 },
      { tone: 'pious', l: 'Korrum keeps those who stand watch.', r: '~She looks at you properly for the first time. “You know the Stone Father? Col said that. At the end.”', tr: 1, learn: 'As he was dying, Col Harrow said Korrum keeps those who stand watch.' },
    ] } },
    { t: 'Folded his robes this morning. Didn\'t know what else to do with them. They\'re clean. He\'d have liked that.', if: 'found' },
  ],
  self: [
    'Hedda Harrow. Stane, I was, up at Highfold. Valley folk can\'t say it right. They make it sound like a mark on a shirt.',
    { t: 'Col came up to Highfold with the militia after cattle thieves. Caught the thieves in a day and spent a week finding reasons to stay.', min: 1 },
    { t: 'I wanted Ned driving carts. He likes horses. Horses don\'t follow orders into caves.', min: 3, if: 'flag:dace_told' },
  ],
  workLabel: 'About the washing',
  work: [
    'Lye, ash, a copper and arms. That\'s the trade.',
    { t: 'The copper belonged to the washerwoman before me. Halvard\'s mother, as it happens. He used to stand and look at it like it might say something.', min: 1, learn: 'Hedda\'s wash-copper once belonged to Halvard\'s mother, the lane\'s laundress.' },
    { t: 'Every shirt in town comes through here. You learn who\'s eating, who\'s sweating, who\'s been somewhere they shouldn\'t.', min: 1 },
    { t: 'The councilman\'s shirts come to me with the cuffs already scrubbed. Who scrubs a shirt before the washing? A man who doesn\'t want the washerwoman looking, that\'s who.', min: 3 },
  ],
  news: [
    'Nothing. Sheets. Ned. Sheets.',
    { t: 'The Fox\'s linen\'s come back folded properly for once. That\'ll be Rolf\'s niece. Weyford girls fold corners.', if: 'here:bess' },
    { t: 'Ned says Bran shook his hand. Bran. I sat down on the step and couldn\'t get up for a while.', if: 'flag:ned_told_bran' },
    { t: 'Bran\'s got a Weyford lad at the forge. Brought me his shirts the first day and said please. Bran\'s never brought me a shirt himself in his life.', if: 'here:oren' },
    { t: 'Ground shook last night. Every peg on the line jumped. Up home we\'d say the Stone Father turned over in his sleep.', if: 'gate' },
  ],
  halvard: [
    'Washed his robes twenty years. He always apologised for the mud. Never once stopped bringing it.',
    { t: 'His last bundle had red clay on the hems. Cave clay, the sticky sort from up the North Road. He\'d been up there more than once before he went for good.', min: 2, learn: 'Halvard\'s last washing had red cave clay on the hems: he had been up the North Road several times before he vanished.' },
    { t: 'He kept a grey shawl. Fine wool, northern weave, too small for a man. I washed it once and he stood over me the whole time as if I might drown it.', min: 3, learn: 'Halvard kept a small grey shawl of fine northern wool, and guarded it.' },
    { t: 'He\'ll walk in with his hems filthy and say sorry. You\'ll see.', if: '!found' },
    { t: 'I\'ll wash him for the burying, if you\'ll let me. I did it for Col. It\'s what my hands are for.', if: 'found', min: 1 },
  ],
  caves: [
    'Ned says three levels down it splits four ways. Ned also said his helmet fitted.',
    { t: 'Highfold folk don\'t go in caves. The mountain is Korrum\'s house. You knock on a man\'s door; you don\'t climb in his window.', min: 1 },
    { t: 'Ewan\'s dogs won\'t go near the old adits. Green lights, he says. Ewan doesn\'t say things. So when he does, you listen.', min: 2 },
    { t: 'You\'ve been where it splits, and come back. Ned\'ll be unbearable. He\'ll want to go.', if: 'junction' },
  ],
  gods: [
    'Korrum. A pinch of salt in the last rinse. Valley folk think it\'s for whiteness. It\'s for him.',
    { t: 'Ada Hollin and I used to walk to the cairn by the ring gate together. Two hill women in a valley full of bread. Now I go alone.', min: 2, learn: 'Hedda and Ada Hollin, both Highfold-born, used to leave salt on the cairn together.' },
  ],
  gossip: [
    'I don\'t gossip. I wash. ...The baker\'s mother has been at the butter again. It\'s all down her apron.',
    { t: 'Bran drinks. Everyone knows. What they don\'t know is he brings his shirts himself, sober, every seventh day, and asks after Ned. Every time.', min: 2 },
    { t: 'I did the Vosses\' washing when they first came. First thing I was handed was a grey cloak. Good wool, a badge torn off the shoulder. I was told to burn it, not wash it. I burned it.', min: 4, learn: 'When the Vosses arrived eighteen years ago, Hedda was told to burn a grey cloak with a badge torn from its shoulder.',
      ask: { opts: [
        { tone: 'curious', l: 'Grey. Like the Wardens wear?', r: '~She takes a long time wringing the sheet. “I didn\'t say that. I said grey. Lots of things are grey.”', tr: 0 },
        { tone: 'kind', l: 'You did what you were told. That\'s not on you.', r: 'I\'ve told myself that eighteen years. It washes out about as well as blood.', tr: 1 },
        { tone: 'blunt', l: 'Why tell me now?', r: 'Because Halvard\'s gone up a cave and my son\'s at the gate, and I\'m tired of being careful.', tr: 1 },
      ] } },
    { t: 'Garrick\'s girl is home. Came off the cart smelling of rosewater from her fine Weyford house. It won\'t last a week. The smoke always wins.', if: 'here:nettie' },
  ],
  about: {
    ned: [
      'My boy. Eats like a horse and sleeps like a dropped sack.',
      { t: 'He ran, in the cave. I know he ran. And I\'m glad. Gods help me, I\'m glad he ran.', min: 3, if: 'flag:dace_told',
        ask: { opts: [
          { tone: 'kind', l: 'Any mother would be.', r: '~She nods at the water. “Bran\'s a father. I can\'t look at him.”', tr: 1 },
          { tone: 'pious', l: 'Korrum asks endurance, not that we die for nothing.', r: 'That\'s Highfold sense. Where did a temple child get Highfold sense?', tr: 1 },
          { tone: 'blunt', l: 'Dace didn\'t.', r: '~She goes very still. “No. He didn\'t. You think I don\'t know that every hour?”', tr: -1 },
        ] } },
    ],
    bran: [
      'Bran fed my boy the year Col died. Bread and stew and never a word about it.',
      { t: 'If Dace doesn\'t come home, I don\'t know what Bran does. I don\'t know what Ned does.', min: 2 },
    ],
    ewan: [
      'Ewan Fell. Highfold. We\'ve said perhaps forty words to each other in twenty years. All of them useful.',
    ],
    voss: [
      { t: 'The councilman pays well and on time. I\'ll say that, because it\'s all I\'ll say.', min: 1 },
      { t: 'He took Col\'s militia and filled it with boys. Col would have stood in front of Ned. Voss stands behind.', min: 3 },
    ],
    tamsin: [
      'Tamsin sat with Col the last three nights. I wash her rags for nothing and she pretends not to notice.',
    ],
  },
};
FAMILY.hedda = {
  house: 'Harrow', gen: 1,
  since: 'Married in from Highfold twenty-three years ago. The Harrows came down from Thornbury two generations back; she came from higher up.',
  from: 'highfold',
  kin: [
    { rel: 'son', id: 'ned', say: 'Ned. My one. On that gate in his father\'s helmet, being brave at the dark.' },
    { rel: 'husband', name: 'Col Harrow', dead: 1, from: 'brambleford', note: 'militia sergeant; lung fever three winters ago', say: { t: 'Col. Sergeant Harrow. Laughed like a door banging. Lung fever took him three winters back, and it took its time.', min: 1 } },
    { rel: 'father', name: 'Orm Stane', dead: 1, from: 'highfold', note: 'goatherd under the peaks; built a cairn every year', say: 'My father kept goats under the peaks and built a cairn every year he lived. Thirty-one cairns. You can count them from the shieling.' },
    { rel: 'brother', name: 'Brannoc Stane', from: 'highfold', note: 'keeps the family shieling at Highfold', say: 'My brother keeps the shieling. Sends a cheese down with Ewan every autumn. Smells like a goat\'s armpit. I eat it all.' },
    { rel: 'father-in-law', name: 'Gaff Harrow', dead: 1, from: 'thornbury', note: 'Thornbury drover; Col\'s father', say: 'Col\'s father drove cattle from Thornbury and stopped here because his feet gave out. Harrows aren\'t settlers. They\'re tired drovers.' },
  ],
  origin: [
    'Highfold. A day and a half up, under the peaks. Stone houses, goats, salt on the cairns. Nobody talks much. I talk too much, by Highfold reckoning.',
    { t: 'Ada Fell came down a couple of years after me to marry the smith. I showed her where the cairn was. She said the valley was all right once you stopped expecting it to be quiet.', min: 1, learn: 'Hedda came down from Highfold a few years before Ada Hollin; the two hill women were friends.' },
    { t: 'Do you know where your own folk came from, Acolyte?', min: 2, ask: { opts: [
      { tone: 'curious', l: 'Do you?', r: '~She looks at you a long moment. “North, Halvard said once. Then he changed the subject to my rinse water. I let him.”', tr: 0 },
      { tone: 'kind', l: 'Brambleford. Halvard\'s house.', r: 'Aye. That\'s an answer a Highfold woman respects. Where you\'re kept, not where you\'re dropped.', tr: 1 },
      { tone: 'joke', l: 'From the bottom of Halvard\'s laundry, by the sound of it.', r: '~An actual laugh. “There was a napkin in there once with a milk tooth in it. Yours, I\'d wager.”', tr: 1 },
    ] } },
  ],
  family: [
    'Col wanted Ned in the militia. I wanted him on a cart. Col died, and Ned joined to be like him. So Col won. He usually did, by being agreeable at me until I gave in.',
    { t: 'Harrows are drovers who sat down. Stanes are goatherds who never did. Ned\'s got both in him: wants to go everywhere, and stands still at a gate.', min: 2 },
  ],
};
GIFT_TASTES.hedda = { love: ['wool', 'meat'], like: ['wood', 'milk', 'stone', 'egg'], dislike: ['gel', 'cat:jewelry', 'redcap'] };
GIFT_LINES.hedda = {
  love: [
    '~She turns the {item} over with her red hands and, for a moment, actually smiles. “That\'s useful. That\'s properly useful. Thank you.”',
    'Ned\'ll eat well tonight. Or I will, if he\'s late.',
  ],
  like: [
    'Aye. That\'ll go somewhere.',
    '~She puts the {item} in the basket with the clean things, which is a compliment.',
  ],
  neutral: [
    '~She looks at the {item}, then at you. “Hm.” She sets it on the step.',
    'Thank you. I\'ll find a use. I always do.',
  ],
  dislike: [
    'Not near the washing. Never near the washing.',
    '~She holds the {item} out at arm\'s length, dripping. “Take it back before it stains something.”',
  ],
  special: {
    wool: '~She pulls a tuft of the wool and rolls it between finger and thumb. “Good staple. Highfold goats can\'t touch it. I\'ll knit Ned something for the gate.”',
    gel: '~She stares at the slime. “On my clean sheets? Out. Out of my yard.”',
    stone: 'A stone. ...For the cairn? Aye. I\'ll take it up on my day. That\'s a hill kindness, that is.',
  },
};
ARRIVE_NEWS.hedda = '';

// =====================================================================
// Jory Miller: the miller, Sela Cooper's father. Big, loud, half-deaf from the stones, repeats himself; jolly, soft about the twins; carries an old guilt.
// =====================================================================
Object.assign(PEOPLE, { jory: {
  name: 'Jory Miller', role: 'the miller, Sela Cooper\'s father', spr: 'fam_jory', where: 'the Millers\' house, white with flour to the eaves',
  look: 'A barrel-chested old man dusted white from cap to boots, slightly deaf from forty years beside the millstones, so he says everything twice and loudly.',
  story: [
    [0, 'He grinds every sack of grain in Brambleford at the mill below the south bridge, and takes his toll by the scoop. His daughter Sela is married to Abel the cooper.'],
    [2, 'Sela won\'t let him near the twins while the fever lasts. He leaves a sack of fine oat-flour at the Coopers\' door every morning and goes away again.'],
    [4, 'In the famine year, eighteen years ago, the council had him grind grain for wagons going north under a grey seal while his own neighbours queued with half-sacks. A few weeks later his millrace ran grey with ash for three days.'],
  ],
  ties: { abel: 'His son-in-law. Too quiet by half, Jory says, and the best thing that ever happened to Sela.', hester: 'He has ground Hester Dunning\'s flour for fifty years, and been accused of short weight every time.', marta: 'Marta bakes everything he grinds. He thinks her rye the best in the valley and tells her it\'s too dark.', gil: 'Knew Liss Brack from a girl; her father kept the weir upstream of the mill.' },
  talk: ['Eh? Speak up. The wheel\'s still turning in my ears.', 'A miller\'s thumb is worth its weight in gold! Old joke. True joke.', 'Water\'s up. Good grinding weather. GOOD grinding weather.'],
  halvard: '“Blessed the wheel every spring, stood in the race up to his knees to do it. Said a mill was a prayer that went round. I said it was a mill.”',
} });
NEW_FIGS.jory = { build: 'stout', skin: 'f6d0ac', hat: 'cap', hatColor: 'efe6d2', hair: 'short', hairColor: 'e8e8e8', beard: 'full', beardColor: 'e8e8e8', shirt: 'd8cfb8', torso: 'apron', under: 'd8cfb8', apronColor: 'efe6d2', pants: 'b8ad98', boots: '9c8a70', wrinkles: 1 };
DIALOGUE.jory = {
  intro: [
    '~A big old man white with flour from head to boots looks up from a sack. “Eh? Oh! The temple lad! THE TEMPLE LAD. Come in, come in, mind the dust. The dust minds nobody.”',
  ],
  greet: [
    { t: 'Eh? Who\'s that? Oh, it\'s you. It\'s YOU.', max: 1 },
    { t: '{n}! Come and stand by the wheel. Can\'t hear a word you say there, but it\'s nice.', min: 2 },
    { t: 'Have you been by the Coopers\'? How are they? How are they really?', if: '!duty:abel_twins' },
    { t: 'Lark called me Grandad Dusty yesterday. To my face! My heart\'s not been the same since.', if: 'duty:abel_twins here:lark' },
    { t: '~The wheel is stopped and the mill is very quiet. Jory sits on a sack with his cap in his hands.', if: 'found' },
  ],
  bye: [
    'Off you go! OFF you go.',
    { t: 'Take a bag of the fine flour to Marta and say it\'s from me. She\'ll weigh it.', min: 1 },
    { t: 'Mind how you go. Mind the race. Mind everything.', min: 2 },
  ],
  how: [
    'Dusty! Always dusty. Never been cleaner, mind.',
    { t: 'Can\'t sleep for thinking of the twins. Sela won\'t let me past the door. Says I\'m too old to catch it. I\'m too old to sit still!', if: '!duty:abel_twins', ask: { opts: [
      { tone: 'kind', l: 'I\'ll go and sit with them, Jory.', r: '~He grabs your hand in both his floury ones. “Would you? Would you. Tell them Grandad\'s grinding them something sweet.”', tr: 1 },
      { tone: 'pious', l: 'Aurel keeps the hearth and the children by it.', r: 'Does he? Then tell him to keep it hotter! Tam always kicks his blanket off.', tr: 1 },
      { tone: 'blunt', l: 'Sela\'s right. You\'d only be in the way.', r: '~He deflates like an empty sack. “Aye. Aye, I would. I know it.”', tr: 0 },
      { tone: 'joke', l: 'You\'re not too old. You\'re too loud. You\'d wake them.', r: 'HA! I WOULD. I would. That\'s fair, that is.', tr: 1 },
    ] } },
    { t: 'Grand! The twins came down to the mill and Tam fell in the flour bin. Came out a ghost. Best day of my life.', if: 'duty:abel_twins here:tam' },
  ],
  self: [
    'Jory Miller, of the Millers! Every miller in Weyford is a Miller too. No kin. NO kin. Whatever Hester says.',
    { t: 'My grandfather built the wheel the year of the great flood. Or caused it. Family argues.', min: 1 },
  ],
  workLabel: 'About the mill',
  work: [
    'Grain in, flour out, a scoop for the miller. That\'s all a mill is. Lovely.',
    { t: 'Stones want dressing every month. Pick them like a mason till you can see your face in the grooves. My Maud said I loved the stones more than her. Not more. Nearly as much.', min: 1 },
    { t: 'Water\'s running cold lately. Cold from underneath, like a spring\'s opened somewhere deep. Gil says the same of his pond. Two of us can\'t both be daft.', min: 2 },
  ],
  news: [
    'Water\'s up! Good grinding! That\'s the news.',
    { t: 'Wil Thatcher\'s back from the woods. Brought me a haunch for flour I owed his mother. Owed! I owed! Thatchers.', if: 'here:wil' },
    { t: 'Caravan through! Grain buyers from Kettle Cross. Paid coin. Real coin, not promises.', if: 'event:caravan' },
    { t: 'The ground jumped last night. Knocked the wheel off its pin! I put it back. In my nightshirt. Don\'t tell Hester.', if: 'gate' },
  ],
  halvard: [
    'Blessed the wheel every spring, stood in the race up to his knees to do it. Said a mill was a prayer that went round. I said it was a mill.',
    { t: 'He came down for flour the week before he went. A little sack of the coarse, the kind that keeps for travelling. I should have asked where to.', min: 1, if: '!found',
      ask: { opts: [
        { tone: 'kind', l: 'You couldn\'t have known.', r: 'No. No, I couldn\'t. Doesn\'t stop me grinding it over.', tr: 1 },
        { tone: 'curious', l: 'How much did he take?', r: 'Enough for a week. A careful man\'s week. He meant to come back, lad. He bought for coming back.', tr: 1, learn: 'Halvard bought a week\'s travelling flour from Jory before he left. He meant to come back.' },
        { tone: 'joke', l: 'Did he pay full weight?', r: '~He laughs, and it cracks halfway. “Overpaid. Always overpaid. Daft old crow.”', tr: 0 },
      ] } },
    { t: 'He baptized the twins in one bowl and soaked his sleeves to the elbow. Then dried them by my stove and ate half my bread. Good man. Good man.', min: 2 },
    { t: 'I stopped the wheel. First time in forty years for a death. The race ran on without it. Seemed wrong.', if: 'found' },
  ],
  caves: [
    'Never been. Not going. A miller wants a river, not a hole.',
    { t: 'Old men used to say the folk below bought flour, once. Paid in salt from the deep. My grandfather swore it was the sweetest salt he ever tasted.', min: 1 },
    { t: 'You\'ve got down where it splits? Mind the water down there. Water goes where it likes, and it remembers. Ask Gil.', if: 'junction' },
  ],
  gods: [
    'A loaf on Aurel\'s table from the first sack of the year. A blue stone in the race for Nemora. A miller keeps both or the wheel sulks.',
    { t: 'My Maud kept Nemora. Said a millpond\'s the only bit of the river that stops to think.', min: 2 },
  ],
  gossip: [
    'Hester Dunning says I\'ve a heavy thumb. I\'ve a heavy everything! I\'m a big man!',
    { t: 'Wendell came asking the price of flour next season. A Tolly asking about next season means a Tolly\'s worried about this one.', min: 1 },
    { t: 'Famine year, eighteen years back. Council had me grind for wagons going north. Grey seal on every sack. Our own folk queued with half-sacks while I filled theirs.', min: 4, learn: 'In the famine year eighteen years ago, Jory ground grain for wagons going north under a grey seal, while Brambleford went short.',
      ask: { opts: [
        { tone: 'curious', l: 'Who were the wagons for?', r: '~He lowers his voice, which for Jory is an ordinary voice. “Never said. Paid in council scrip. The drivers wore grey and wouldn\'t eat our bread.”', tr: 1 },
        { tone: 'kind', l: 'You had no choice, Jory.', r: 'There\'s always a choice. The reeve up at Ashvale refused, they say, and look where... never mind. Never mind me.', tr: 1 },
        { tone: 'blunt', l: 'You took their coin.', r: '~He looks at his big hands. “I did. Bought Sela\'s wedding dress with it. I\'ve never told her.”', tr: 0 },
      ] } },
    { t: 'A few weeks after those wagons, the millrace ran grey. Ash, thick as porridge, three days, all down from the north. Council said a charcoal-burner\'s fire. Some fire.', min: 4, learn: 'Eighteen years ago Jory\'s millrace ran grey with ash for three days, washed down from the north.' },
    { t: 'Bess at the Fox ordered flour by the sack and paid on the nail. Rolf\'s never paid on the nail in his life. I like her.', if: 'here:bess' },
  ],
  about: {
    abel: [
      'Abel. Says four words a day and means every one. Sela picked well. Better than I would have.',
      { t: 'He sat up four nights with the twins and came to the mill at dawn to buy oats as if nothing was wrong. I nearly hit him for it. Then I gave him the oats.', min: 2, if: '!duty:abel_twins' },
    ],
    hester: [
      'Hester! Fifty years she\'s called me a thief. Fifty years I\'ve given her the good flour. Somebody\'s winning and it isn\'t me.',
      { t: 'She sat with me the winter my Maud died. Didn\'t say a word for a month. Brought bread every day. Best friend I\'ve got, and I\'ll deny it.', min: 2 },
    ],
    gil: [
      'Gil Brack. Won\'t come near the river. Fishes the town pond instead, like a man sitting with his back to a door.',
      { t: 'Liss used to run along my race as a girl, daring the wheel. Her father kept the weir. When she drowned I stopped the wheel a day. Gil never asked why. He knew.', min: 3 },
    ],
    marta: [
      'Marta\'s rye is the best in the valley. I tell her it\'s too dark. She tells me my flour\'s too coarse. We\'re both lying. That\'s trade.',
    ],
  },
};
FAMILY.jory = {
  house: 'Miller', gen: 3,
  since: 'Three generations at the mill. His grandfather came up from Weyford with a millwright\'s chisel and built the wheel below the south bridge.',
  from: 'weyford',
  kin: [
    { rel: 'daughter', name: 'Sela Cooper', from: 'brambleford', note: 'married to Abel the cooper; mother of the twins', say: 'Sela. My girl. Married the quietest man in the valley to get some peace from me. Ha! It worked.' },
    { rel: 'son-in-law', id: 'abel', say: 'Abel. Good hands, no words. I talk enough for the both of us.' },
    { rel: 'grandson', id: 'tam', say: 'Tam! Six. Breaks things to see what\'s inside. I was the same. Still am.' },
    { rel: 'granddaughter', id: 'lark', say: 'Lark. Six, and already counts the scoops when I take my toll. That one\'ll have the mill off me.' },
    { rel: 'wife', name: 'Maud Miller', dead: 1, from: 'brambleford', note: 'kept Nemora and the mill books; died the winter Wat Dunning did', say: { t: 'Maud. Kept Nemora, kept the books, kept me. Gone the same winter as Hester\'s Wat. The wheel ran slow all that year. I swear it did.', min: 1 } },
    { rel: 'grandfather', name: 'Corm Miller', dead: 1, from: 'weyford', note: 'millwright; built the wheel', say: 'Grandfather Corm built the wheel. Every spoke. I\'ve replaced every spoke since. Still his wheel.' },
  ],
  origin: [
    'Weyford, three grandfathers back. Down where the Bramble meets the Silverrun. Big mill there. Too big. Grandfather wanted a mill he could hear himself think in.',
    { t: 'Shout "Miller!" in Weyford market and forty heads turn. Hester\'s Wat was one of them. NO kin. None.', min: 1 },
    { t: 'Grandfather Corm walked the Bramble up from Weyford with a stick, testing the fall. Stopped where the water sang right, below the south bridge, and built there.', min: 1, learn: 'Jory\'s grandfather Corm walked up the Bramble from Weyford and built the mill where the water "sang right".' },
    { t: 'You\'ve no grandfather to tell you where you\'re from, have you? Hm.', min: 2, ask: { opts: [
      { tone: 'kind', l: 'Halvard was enough.', r: 'Aye. Aye, he was. Better than mine, and mine built a mill.', tr: 1 },
      { tone: 'curious', l: 'Did you ever hear where he found me?', r: '~He goes quiet and scratches his floury head. “North. The same month the race ran grey. I\'m not saying anything. I\'m saying the month.”', tr: 1 },
      { tone: 'joke', l: 'You could adopt me. I can lift a sack.', r: 'HA! Lift that one, then. ...No. Put it down. You\'ll do your back.', tr: 1 },
    ] } },
  ],
  family: [
    'Sela was to have the mill. Then she met Abel and wanted barrels. Barrels! Now Lark counts my scoops, so there\'s hope.',
    { t: 'Millers and Coopers. Flour goes in barrels; it was always going to happen. And a Cooper married a Tolly long ago, so we\'re all in each other\'s barrels in this town.', min: 1 },
  ],
};
GIFT_TASTES.jory = { love: ['wheat', 'pike'], like: ['apple', 'egg', 'stone', 'wood', 'milk'], dislike: ['gel', 'cat:crystal', 'cat:jewelry'] };
GIFT_LINES.jory = {
  love: [
    '~He lifts the {item} over his head like a prize at the fair. “LOOK at that! Look at it! Sela! ...She\'s not here. LOOK at it anyway!”',
    'For me? For ME? You\'ll have the good flour for life. Don\'t tell Hester.',
  ],
  like: [
    'Very kind! VERY kind. Thank you, lad.',
    '~He tucks the {item} into his apron and leaves a floury handprint on your shoulder by way of thanks.',
  ],
  neutral: [
    'Eh? What is it? Oh. Oh, lovely. What is it?',
    '~He holds the {item} up to the light from the mill door, puzzled but game. “Well! I\'ll put it on the shelf with the other mysteries.”',
  ],
  dislike: [
    '~He sniffs the {item} and sneezes a cloud of flour. “Not in the mill, lad. Gets in the stones.”',
    'Kind thought. Wrong miller.',
  ],
  special: {
    wheat: '~He rubs the ear between his great palms and listens to it like a shell. “Hard red. Good ringing grain. This would sing on the stones.”',
    stone: '~He taps the stone with a fingernail and listens. “Not bad. Not millstone, mind. But not bad.” He keeps it anyway.',
  },
};
ARRIVE_NEWS.jory = '';

// =====================================================================
// Bess Barrow: Rolf's niece from Weyford, twenty. Brisk, loud, cheeky, competent; a ferryman's daughter; bullies her uncle out of love.
// =====================================================================
Object.assign(PEOPLE, { bess: {
  name: 'Bess Barrow', role: 'Rolf\'s niece, helping at the Sleeping Fox', spr: 'fam_bess', where: 'the Sleeping Fox, behind the bar or carrying four tankards',
  look: 'Twenty, broad-shouldered and quick, with river-brown arms and her hair tied up in a red kerchief. She can carry four tankards in one hand and an argument in the other.',
  story: [
    [0, 'Her mother Joan, Rolf\'s sister, sent her up from Weyford when word came that Rolf\'s knee was bad. She was told to help. She has taken over.'],
    [2, 'She grew up on her father\'s ferry on the Silverrun. Every season of her life she has watched grey-cloaked tithe-carts cross going north, and her father has never once been paid for them.'],
    [4, 'Rolf keeps a second cup on the shelf that nobody drinks from: Halvard\'s. She has seen him washing it at night, crying into the suds, and has never let him know.'],
  ],
  ties: { rolf: 'Her uncle. She bullies him for his own good and adores him.', garrick: 'Haggles over mutton with Garrick even harder than Rolf does. Garrick is delighted.', gil: 'Ferry-folk and fisher-folk: she and Gil understand each other without talking.', nettie: 'Nettie Sallow is the only girl her age who isn\'t afraid of her. They are fast friends.' },
  talk: ['Sit anywhere. Not there. That\'s Bran\'s.', 'Uncle Rolf says the stew\'s his mother\'s recipe. It\'s mine now. I put salt in it.', 'Pay first, then I\'ll like you.'],
  halvard: '“Never met him. Uncle Rolf talks about him like the weather: all the time, and as if nobody could do anything about it.”',
} });
NEW_FIGS.bess = { build: 'adult', skin: 'd9a070', hat: 'kerchief', hatColor: 'b9343c', hair: 'curly', hairColor: '6e3f1f', shirt: 'efe6d2', torso: 'dress', apron: 1, jaw: 'soft', lashes: 1, blush: 1 };
DIALOGUE.bess = {
  intro: [
    '~A young woman in a red kerchief, four tankards in one hand, gives you a once-over. “You\'re the acolyte. Uncle Rolf said you\'d be taller. Sit. I\'m Bess, Joan\'s girl. I\'m in charge now.”',
  ],
  greet: [
    { t: 'Sit. Drink? Don\'t answer, I\'ve poured it.', max: 1 },
    { t: '{n}! Sit at the end. I want to talk while I wipe.', min: 2 },
    { t: '~The Fox is loud and she is everywhere in it, a tray on each hip. She jerks her chin at a stool.', if: 'night' },
    { t: 'Uncle Rolf\'s walking without the stick! He\'s unbearable. Thank you. I think.', if: 'duty:rolf_knee' },
    { t: '~She is behind the bar, very still, polishing one cup over and over. Uncle Rolf\'s chair is empty.', if: 'found' },
  ],
  bye: [
    'Go on. Come back hungry.',
    { t: 'Mind the step. Uncle Rolf won\'t fix it. Says it\'s character.', min: 1 },
    { t: 'Don\'t die down there. I\'ve only just got the hang of you.', min: 3 },
  ],
  how: [
    'Run off my feet. Love it. Weyford\'s dull. Don\'t tell Mam I said so.',
    { t: 'Uncle Rolf keeps trying to carry the barrels. With that knee. I\'ve started hiding the barrels.', if: '!duty:rolf_knee', ask: { opts: [
      { tone: 'kind', l: 'I\'ll see what I can do for his knee.', r: 'Would you? Mam said the old priest used to fix it with his hands. I thought she meant with drink.', tr: 1 },
      { tone: 'joke', l: 'Hide the stairs too. Fewer places to fall.', r: '~She laughs, as loud as he does. “Don\'t think I haven\'t thought of it.”', tr: 1 },
      { tone: 'blunt', l: 'He\'s a grown man. Let him limp.', r: 'He\'s a grown man who cried into the stew last week. I\'ll hide what I like.', tr: 0 },
    ] } },
    { t: 'He locked himself in the cellar when they brought Halvard back. I sat on the step outside till he came up. Two hours. He came up and made stew.', if: 'found', min: 1 },
  ],
  self: [
    'Bess Barrow. Weyford born, ferry raised, Fox for now. Da took Mam\'s name when they married. He was a foundling off a barge and never had one of his own.',
    { t: 'I can pole a ferry across the Silverrun in flood. I can\'t sew a button. Mam despairs.', min: 1 },
  ],
  workLabel: 'About the Fox',
  work: [
    'Ale, stew, beds, and Uncle Rolf telling the same story about the troll. I do the first three.',
    { t: 'The books were a midden. He kept the reckoning chalked on the back of the dartboard. I\'ve started a proper ledger. He calls it my little tyrant.', min: 1 },
    { t: 'Seventh-day stew wants trout. Gil brings it when his knee lets him, which is when it doesn\'t rain, which is never.', if: '!duty:rolf_fish' },
    { t: 'Trout in the stew again, thanks to you. Uncle Rolf did a dance. A small one. With the knee.', if: 'duty:rolf_fish' },
  ],
  news: [
    'Weyford news: toll\'s up a copper, the mill\'s flooded, my brothers are idiots. Same as always.',
    { t: 'Grey carts came over on Da\'s ferry the week before I left, going north. Tithe-carts for Greywatch. Da never takes coin from them. Never gets offered any.', min: 1, learn: 'Warden tithe-carts cross the Silverrun at Weyford going north every season, and never pay the ferry.' },
    { t: 'Nettie Sallow\'s back from service. Finally, somebody in this town who doesn\'t say "eh?" after everything.', if: 'here:nettie' },
    { t: 'Two carters in tonight with their wagons burned on the trade road. I fed them free. Don\'t tell Uncle Rolf. He\'d have done the same and made a speech.', if: 'event:raids' },
    { t: 'They say you\'ve a king\'s seal from under the hill. Uncle Rolf\'s telling everyone he taught you to hold a sword. Did he?', if: 'seals:1' },
  ],
  halvard: [
    'Never met him. Uncle Rolf talks about him like the weather: all the time, and as if nobody could do anything about it.',
    { t: 'He came down to Weyford once, Mam says, to marry her and Da. Stood on the ferry in the middle of the river to do it, because Da would only be married on the water.', min: 1, learn: 'Halvard married Joan Barrow to her Weyford ferryman on the ferry, in the middle of the Silverrun.' },
    { t: 'Uncle Rolf keeps a second cup on the shelf. Nobody drinks from it. He washes it every night anyway. I asked whose. He said "a skinny priest\'s" and went to bed.', min: 3,
      ask: { opts: [
        { tone: 'kind', l: 'Leave it there. Don\'t ever move it.', r: 'I wasn\'t going to. I dust round it. Like it\'s asleep.', tr: 1 },
        { tone: 'curious', l: 'How long has it been there?', r: 'Mam says since before I was born. Since he came home with the baby. ...Oh. Since you, then.', tr: 1, learn: 'Rolf has kept a cup for Halvard on the Fox shelf since the night Halvard came home with the baby.' },
        { tone: 'joke', l: 'Maybe it\'s for me. I\'m skinny.', r: '~She snorts. “Try drinking from it. He\'d have you out the door on your ear.”', tr: 0 },
      ] } },
    { t: 'I found Uncle Rolf washing that cup tonight and crying into the suds. I backed out. Don\'t you tell him I saw.', min: 3, if: 'found' },
  ],
  caves: [
    'Caves are for bats and fools. Uncle Rolf was a fool, he says. Proudly.',
    { t: 'Ferry-folk say the Silverrun has a twin that runs underground from the mountains and comes up cold in wells. The Fox well\'s cold enough to hurt your teeth, middle of summer.', min: 1 },
    { t: 'You got to where it splits four ways? Uncle Rolf went white. Then bought everyone a drink. Then charged me for them.', if: 'junction' },
  ],
  gods: [
    'Ferry-folk throw a copper in the river every crossing. The river takes a toll same as the bridge. Nemora, Mam says. Da just says "the river".',
    { t: 'I do the lamp over the Fox door now. Aurel\'s. Uncle Rolf forgets. He says Aurel knows where the Fox is by now.', min: 1 },
  ],
  gossip: [
    'Bran drinks four and goes home. I\'ve cut him to three. He hasn\'t noticed because I pour them bigger.',
    { t: 'Wendell loses at dice to Uncle Rolf every seventh day, and Uncle Rolf slips half of it back to Marta on the quiet. Don\'t tell either of them.', min: 1 },
    { t: 'Hilde comes in one night in autumn, drinks alone and leaves. Uncle Rolf put a bottle out before she came and said "don\'t you dare ask her". So I didn\'t. I\'m asking you.', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Then don\'t ask. Just leave the bottle out.', r: '~She considers you, then nods. “All right. You\'re like him, you know. Uncle Rolf. Soft where it counts.”', tr: 1 },
        { tone: 'curious', l: 'What night is it?', r: 'Same night every year, Uncle Rolf says. Late autumn. When they burn the leaves.', tr: 1 },
        { tone: 'blunt', l: 'It\'s not your business.', r: 'Everything in the Fox is my business. That\'s the job. ...But fine. Fine.', tr: 0 },
      ] } },
    { t: 'Oren the new smith comes in every night and says three words to Bran and two to me. One of them\'s always "please". Weyford manners. I approve.', if: 'here:oren' },
  ],
  about: {
    rolf: [
      'Uncle Rolf. Biggest laugh in the valley and the softest heart behind it. Don\'t tell him I said soft.',
      { t: 'Mam says he ran off adventuring because Gran Nell worked him like a mule. Then he came limping home and works himself worse. Barrows.', min: 2 },
    ],
    nettie: [
      { t: 'Nettie. Smells like smoke, talks like a lady, swears like a ferryman. My kind of person.', if: 'here:nettie' },
    ],
    garrick: [
      'Garrick haggles like it\'s a dance. I step on his toes. He loves it.',
    ],
    gil: [
      'Gil doesn\'t talk. Neither does the river. You learn to listen to both.',
      { t: 'He won\'t go near the river since his wife. I told him the Silverrun took Da\'s first ferry and nearly Da. He nodded. That was a whole conversation.', min: 2 },
    ],
  },
};
FAMILY.bess = {
  house: 'Barrow', gen: 0,
  since: 'Weyford-born, but a Barrow of the Fox on her mother\'s side: Joan Barrow went south to marry a ferryman, and her daughter has come back up.',
  from: 'weyford',
  kin: [
    { rel: 'uncle', id: 'rolf', say: 'Uncle Rolf. Taught me darts and swearing when I was six. Mam\'s never forgiven him.' },
    { rel: 'mother', name: 'Joan Barrow', from: 'brambleford', note: 'Rolf\'s sister; married a Weyford ferryman', say: 'Mam. Joan. Ran away from the Fox to marry a ferryman, and now she runs the ferry. Barrow women run things.' },
    { rel: 'father', name: 'Cobb Barrow', from: 'weyford', note: 'Weyford ferryman; a barge foundling who took his wife\'s name', say: 'Da. Cobb. Found in a basket on a barge, which is why he loves boats and hates baskets. Took Mam\'s name. Says it\'s the only thing he ever got for free.' },
    { rel: 'grandmother', name: 'Nell Barrow', dead: 1, from: 'brambleford', note: 'ran the Fox; the fish stew', say: 'Gran Nell ran the Fox. I\'ve got her stew and, Uncle Rolf says, her mouth.' },
    { rel: 'brothers', name: 'Danny and Kip Barrow', from: 'weyford', note: 'work the ferry', say: 'Two brothers, both on the ferry, both idiots. Danny\'s named for Grandad Big Danny. He mostly sits too.' },
  ],
  origin: [
    'Weyford. Half a day south, where the Bramble falls into the Silverrun. Toll bridge, big mill, and Da\'s ferry for folk too mean for the bridge.',
    { t: 'Barrows are from here, though. Founders. When Mam left the Fox to marry Da, Gran Nell didn\'t speak to her for a year. Then she sent a stew down by carter. That was the apology.', min: 1, learn: 'Joan Barrow left the Fox to marry a Weyford ferryman; her mother Nell apologised with a pot of stew.' },
    { t: 'Mam always said I\'d end up back at the Fox. I said never. Here I am, wiping the same bar she wiped.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'It suits you.', r: '~She flicks you with the rag, pleased. “Don\'t tell Mam. She\'ll be smug for a year.”', tr: 1 },
      { tone: 'joke', l: 'The Fox always wins. Rolf told me.', r: 'He tells everyone. He had it painted on a plate once. I broke it. By accident. Mostly.', tr: 1 },
      { tone: 'curious', l: 'Will you stay?', r: 'Ask me when his knee\'s mended. Ask me when he\'s stopped crying in the stew.', tr: 0 },
    ] } },
  ],
  family: [
    'Da hasn\'t got a side, so all my cousins are Mam\'s side, so they\'re all Barrows, so they\'re all loud.',
    { t: 'Rufus Tolly, the cartwright at Weyford, is Wendell\'s cousin. He told me to remind Wendell he still owes for a wheel from twelve years back. I\'m waiting for a good moment.', min: 1 },
  ],
};
GIFT_TASTES.bess = { love: ['pike', 'trout'], like: ['meat', 'egg', 'apple', 'perch', 'torch'], dislike: ['gel', 'redcap', 'cat:book'] };
GIFT_LINES.bess = {
  love: [
    '~She snatches the {item} and holds it up to the whole Fox. “SEE? Somebody brings me things!” Nobody claps. She doesn\'t care.',
    'Oh, that\'s going in the stew. That\'s going in the stew tonight. You\'re eating free.',
  ],
  like: [
    'Useful. I like useful. Thank you.',
    '~She stows the {item} under the bar in one quick move, like a ferryman pocketing a toll.',
  ],
  neutral: [
    'Ta. I\'ll find a place for it. Probably behind the bar with the lost hats.',
    '~She looks at the {item}, then at you. “Is this a joke? It\'s a joke. Thanks.”',
  ],
  dislike: [
    '~She drops the {item} straight in the slop bucket. “Sorry. Reflex.”',
    'Don\'t bring that into a kitchen. Ever. Ferry rules.',
  ],
  special: {
    redcap: '~She looks at the redcap and goes pink with fury. “Uncle Rolf told you about the goat, didn\'t he. DIDN\'T he.” She bins it.',
    pike: 'A Silverrun fish! Or as good as. Da would kiss you. I won\'t. But I\'ll think about it.',
  },
};
ARRIVE_NEWS.bess = 'A cart from Weyford: Rolf\'s niece Bess has come up to help at the Sleeping Fox, and has already rearranged the bar.';

// =====================================================================
// Nettie Sallow: Garrick's daughter, nineteen, home from service in Weyford. Precise, dry, a touch grand, fiercely loyal to her loud father; teaching him to read.
// =====================================================================
Object.assign(PEOPLE, { nettie: {
  name: 'Nettie Sallow', role: 'Garrick\'s daughter, learning the smokehouse', spr: 'fam_nettie', where: 'the butcher\'s yard by the market ring',
  look: 'Nineteen, neat as a pin in a leather apron that is much too big for her, with her late mother\'s dark eyes and her father\'s red hands. She talks like a Weyford housekeeper and handles a cleaver like a Sallow.',
  story: [
    [0, 'She spent four years in service in a grain factor\'s house at Weyford, and has come home to learn the smokehouse before her father\'s back gives out.'],
    [2, 'She learned her letters in service, and has quietly picked up where Halvard left off: she is teaching her father to read at night, on his old slate. They have got past M.'],
    [4, 'Her old master at Weyford grew rich in the famine year, eighteen years ago, selling grain north. In his cups he toasted "the Wardens, who pay in silver and ask no questions."'],
  ],
  ties: { garrick: 'Her father. She is mortified by his noise and would knife anyone who mocked him.', bess: 'Bess Barrow, Rolf\'s niece, is her first real friend in town.', wil: 'Wil Thatcher brings venison to the yard. She pretends not to notice how often.', fenwick: 'The auctioneer\'s voice comes through the smokehouse wall all market day. She has started answering it.' },
  talk: ['Three days for a ham. I\'m told there are no shortcuts. I\'m looking for them anyway.', 'Da, your apron. Da. DA.', 'In Weyford we had a fork for every course. Here we have a knife and an opinion.'],
  halvard: '“Da cried at the slate. M, he kept saying, we got to M. So I said, then let\'s do N. And he did, and cried at N too.”',
} });
NEW_FIGS.nettie = { build: 'slim', skin: 'eab38b', hair: 'bun', hairColor: '2a1a10', shirt: '23305e', torso: 'apron', under: '23305e', apronColor: '6e4421', pants: '3a3428', jaw: 'soft', lashes: 1 };
DIALOGUE.nettie = {
  intro: [
    '~A young woman in a leather apron much too big for her looks up from a ham and wipes her hands with great dignity. “You\'ll be the acolyte. I\'m Nettie Sallow. Da has told me everything about you, twice, at the top of his voice.”',
  ],
  greet: [
    { t: 'Good day. Mind the hooks. They don\'t mind you.', max: 1 },
    { t: '{n}. Come in out of the smoke. Or into it. It\'s the same thing here.', min: 2 },
    { t: '~She is hanging hams in the blue dawn smoke with a scarf over her nose, and lifts one hand.', if: 'phase:Dawn' },
    { t: 'The grey wolf\'s pelt came through the yard. Da kept stroking it like a cat. I asked him to stop. He didn\'t.', if: 'boss:greymaw' },
    { t: '~The smokehouse is cold. Nettie is sitting on the block with her father\'s slate on her knees.', if: 'found' },
  ],
  bye: [
    'Good day to you.',
    { t: 'Take a bit of the sausage. Da will ask if I gave you some, and I don\'t lie to him.', min: 1 },
    { t: 'Come back. It\'s restful, talking to someone who doesn\'t shout.', min: 2 },
  ],
  how: [
    'Smoked. Like everything here. I washed my hair twice. I still smell of beech.',
    { t: 'Da\'s back is going. He won\'t say so. He lifts a carcass and goes grey and laughs. I\'ve come home to do the lifting.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'He\'s lucky to have you.', r: 'He\'s lucky I\'m stubborn. I left a very good position. A fork for every course.', tr: 1 },
      { tone: 'blunt', l: 'Can you lift a carcass?', r: '~She squares up. “Watch me.” She can. Just.', tr: 1 },
      { tone: 'pious', l: 'Aurel blesses children who come home.', r: 'I came home because Da wrote BACK BAD on a slate in letters a foot high and sent it on the carter. Aurel had nothing to do with it.', tr: 0 },
    ] } },
    { t: 'Da won\'t touch the slate. He sits with it on his knee and doesn\'t write. I sit with him.', if: 'found' },
  ],
  self: [
    'Nettie Sallow. Four years in service at Weyford, in a grain factor\'s house. I can lay a table for twelve and gut a hog. One of those is useful here.',
    { t: 'I can read. Learned in service, from the housekeeper\'s almanac, by candle-end. I\'m teaching Da. Don\'t tell anyone. He\'d die.', min: 2, learn: 'Nettie can read, and is quietly teaching Garrick his letters on Halvard\'s old slate.' },
  ],
  workLabel: 'About the smokehouse',
  work: [
    'Beech for hams, oak for bacon, apple for anything you want to impress. Da taught me that before I could spell beech.',
    { t: 'Three days for a ham, Da says, no shortcuts. I timed him. He takes a shortcut on the second day. Don\'t tell him I know.', min: 1 },
    { t: 'Wil Thatcher brings venison. Very good venison. Very often. I\'m sure it\'s the money.', if: 'here:wil' },
  ],
  news: [
    'Garrick Sallow is selling sausage at the ring today. You\'ll know because you\'ll hear him from the temple.',
    { t: 'Da\'s got past M. N, O, P. He read PORK off the sign at the ring and shouted it. Twice. Then bought everyone a sausage.', min: 2, learn: 'Garrick has learned his letters past M and read his first word aloud.' },
    { t: 'The tannery\'s set up down the road. Da says it smells like money. It smells like a tannery.', if: 'event:tannery' },
    { t: 'Feast day. Da\'s doing the whole pig. I\'ve made a sauce. In Weyford they\'d call it a jus. Here they call it gravy and ask for more.', if: 'event:feast' },
  ],
  halvard: [
    'Da cried at the slate. M, he kept saying, we got to M. So I said, then let\'s do N. And he did, and cried at N too.',
    { t: 'He walked all the way to Thornbury to say the words over Mam, when I was nine. A day there and a day back. Da\'s never forgotten it.', min: 1 },
    { t: 'He\'ll come back and find Da can read a whole word. I want to see his face.', if: '!found' },
    { t: 'Da wants to cut something on the stone himself. I\'m teaching him the letters for it. H, A, L. He presses so hard the chalk breaks.', if: 'found', min: 1 },
  ],
  caves: [
    'I don\'t go in caves. I hang things in a smokehouse. That\'s enough darkness for one girl.',
    { t: 'Da says goblins love smoked meat. The raiders on the trade road always take the hams first. Fussy creatures.', min: 1 },
    { t: 'You\'ve been past where the four roads meet? I\'ve packed you a sausage. Don\'t argue. It keeps a week.', if: 'junction' },
  ],
  gods: [
    'Grandad Sallow hung an antler over the smokehouse door for Veyra. Da still does. I dust it.',
    { t: 'Mam kept Aurel, Thornbury fashion: a loaf on the sill at dawn. I do it on her day. I eat the loaf after. She\'d have wanted that.', min: 2 },
  ],
  gossip: [
    'In service you learn not to gossip. Then you come home and there\'s nothing else to do of an evening.',
    { t: 'My master at Weyford made his money in the famine year, eighteen years back, selling grain north. In his cups he\'d toast "the Wardens, who pay in silver and ask no questions." Then he\'d laugh, and nobody else would.', min: 4, learn: 'Nettie\'s old master, a Weyford grain factor, grew rich selling grain north to the Wardens in the famine year.',
      ask: { opts: [
        { tone: 'curious', l: 'Did he say what the grain was for?', r: 'He said they wanted the north "hungry and grateful". I was fifteen and pouring the wine. I thought it was a joke. I\'ve stopped thinking that.', tr: 1 },
        { tone: 'kind', l: 'You were a girl. You couldn\'t have done anything.', r: 'I could have spilled the wine on him. I think about that more than I should.', tr: 1 },
        { tone: 'blunt', l: 'Why leave service now, really?', r: '~She holds your eye. “Da\'s back. And I didn\'t like the toasts.”', tr: 1 },
      ] } },
    { t: 'Bess says Rolf cries in the stew. I believe it. Da cries in the sausage. He says it\'s the onions. It isn\'t the onions.', if: 'here:bess' },
  ],
  about: {
    garrick: [
      'Da. Loudest man in the valley and the kindest. If you mock him, I\'ll find out.',
      { t: 'He signed my service papers with a cross. The housekeeper laughed. I\'ve never forgiven her, and I\'ve never told him.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'Soon he\'ll sign his own name.', r: '~Her chin comes up. “Garrick Sallow. In full. I\'ll frame it.”', tr: 1 },
          { tone: 'blunt', l: 'Then she was a fool.', r: 'She was. She also made the best pastry in Weyford. People are both things.', tr: 1 },
          { tone: 'joke', l: 'He could sign it with a sausage. Everyone would know.', r: '~She laughs despite herself. “Don\'t give him ideas. He\'d do it.”', tr: 1 },
        ] } },
    ],
    bess: [
      { t: 'Bess is the first girl in this town I can talk to. She talks back. Loudly. It\'s very restful.', if: 'here:bess' },
    ],
    wil: [
      { t: 'Wil Thatcher. Brings venison, stands about, talks about tracks. I know more about deer droppings than any lady should.', if: 'here:wil' },
      { t: 'He walked me home from the Fox and didn\'t say a word the whole way. Then at the door he said "goodnight, Nettie" as if it were a hard word to spell.', if: 'here:wil', min: 3 },
    ],
    fenwick: [
      'The auctioneer sings through our wall all market day. I\'ve started joining in. He\'s started waiting for me.',
    ],
  },
};
FAMILY.nettie = {
  house: 'Sallow', gen: 2,
  since: 'Garrick came off the river roads twenty years ago and married a Thornbury girl; Nettie was born over the smokehouse.',
  from: 'weyford',
  kin: [
    { rel: 'father', id: 'garrick', say: 'Da. Born in a cart, he says, and he\'s been trying to get out of it ever since by shouting.' },
    { rel: 'mother', name: 'Rosamund Sallow', dead: 1, from: 'thornbury', note: 'a Thornbury orchard girl; died ten years ago; buried at Thornbury', say: { t: 'Mam. Rosamund. Thornbury orchards. She smelled of apples even in winter. Ten years. I still put apple wood on the smoke on her day.', min: 1 } },
    { rel: 'grandmother', name: 'Tilda Sallow', dead: 1, from: 'weyford', note: 'peddled pins on the river roads', say: 'Gran Tilda peddled pins from Lowmere to Weyford for forty years. Told Da he\'d never sit still long enough to learn anything.' },
    { rel: 'grandfather', name: 'Oswin Thorne', from: 'thornbury', note: 'orchard-man at Thornbury; Rosamund\'s father', say: 'Grandad Oswin keeps an orchard at Thornbury. Sends a barrel of cider every autumn with a note Da couldn\'t read. I read it to him now. It says "Drink it slowly." It always says that.' },
  ],
  origin: [
    'Here. Born over the smokehouse. But Da\'s from everywhere: born in a cart somewhere between Lowmere and Weyford and raised on the river roads.',
    { t: 'Mam was a Thornbury girl, from the orchard side. Da came to sell her father a pig and stayed for her. Thornbury cider, Brambleford bacon. That\'s me.', min: 1, learn: 'Garrick met his late wife Rosamund while selling her father a pig at Thornbury.' },
    { t: 'I went south to Weyford at fifteen to learn to be a lady\'s maid. Came back at nineteen to learn to be a butcher. Funny old road.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'You can be both.', r: '~She considers it. “A lady butcher. I\'d need a very good apron.”', tr: 1 },
      { tone: 'joke', l: 'Which one swears more?', r: 'Ladies. Under their breath. I learned words in that house Da\'s never heard.', tr: 1 },
      { tone: 'curious', l: 'Why did you go at all?', r: 'Mam wanted it. She left a little money for it. Da sent me because he\'d promised her, and cried at the cart.', tr: 1 },
    ] } },
  ],
  family: [
    'Sallows don\'t stay anywhere. Da was the first to stop. He says the smokehouse is the anchor. I think I\'m the anchor. Don\'t tell him.',
    { t: 'Grandad Oswin wanted me in the orchards. Da wanted me keeping house in some fine family. I want the smokehouse. Nobody asked me until I came home and asked myself.', min: 2 },
  ],
};
GIFT_TASTES.nettie = { love: ['apple', 'moonpetal'], like: ['meat', 'wood', 'silk', 'egg'], dislike: ['gel', 'bone', 'redcap'] };
GIFT_LINES.nettie = {
  love: [
    '~For a moment the Weyford manners slip, and she simply grins. “Oh! Oh, that\'s lovely. Thank you. Truly.”',
    'You have taste. Nobody in this yard has taste. I\'m keeping this somewhere the smoke can\'t get it.',
  ],
  like: [
    'How kind. Thank you, {n}.',
    '~She inclines her head as if accepting a card on a silver tray. “Most thoughtful.” Then she spoils it by winking.',
  ],
  neutral: [
    '~She turns the {item} over. “In Weyford we\'d have known what to do with this. In Weyford I\'d have asked the housekeeper.”',
    'Thank you. I\'m sure Da will find a use. Da finds a use for everything, usually as a doorstop.',
  ],
  dislike: [
    '~She holds the {item} at arm\'s length between finger and thumb. “No. No, thank you. No.”',
    'That goes in Da\'s scrap bucket, not my hands.',
  ],
  special: {
    apple: '~She smells the apples and goes quiet. “Thornbury. Mam\'s. I\'ll put the wood on the smoke and the apples in a tart.”',
    moonpetal: '~She holds the moonpetal as if it might break. “In Weyford the lady of the house had one, pressed in a book. I used to dust round it.” She tucks it into her apron bib.',
  },
};
ARRIVE_NEWS.nettie = 'Garrick Sallow\'s girl Nettie is home from service in Weyford to learn the smokehouse. Garrick has told the whole market ring. Twice.';

// =====================================================================
// Wil Thatcher: Hobb's son, 22, hunter. Restless, woods-quiet, wry, impatient; Veyra's man; has seen what's at the top of the Ashvale track.
// =====================================================================
Object.assign(PEOPLE, { wil: {
  name: 'Wil Thatcher', role: 'hunter, Hobb\'s son', spr: 'fam_wil', where: 'the Thatchers\' yard, or the edge of the Whisperwood',
  look: 'Twenty-two, lean and brown as a hazel switch, with a jay feather in his cap, a bow on his shoulder and the stillness of someone who has spent a month listening to trees.',
  story: [
    [0, 'He hunts the Whisperwood and sells venison to Garrick and pelts to Hilde. He named the great grey wolf Greymaw, and has spent weeks on its trail.'],
    [2, 'He leaves the first cut of every deer on Veyra\'s standing stone in the Deep Whisperwood. He swears he has seen the antlers on it move when there was no wind.'],
    [4, 'Once, against his father\'s word, he followed the old Ashvale track north past the watchtower and over the cliff road. At the top he found a burnt orchard gone wild and a well-house in a square full of nettles. The apples still come.'],
  ],
  ties: { hobb: 'His father. They are too alike to agree about anything.', greta: 'His mother, who hangs the feathers he brings by the door.', mirela: 'He has met Mirela in the deep woods more than once and thinks the town are fools about her.', garrick: 'Sells Garrick his venison and lets the butcher out-shout him on the price.', nettie: 'Brings venison to the butcher\'s yard more often than strictly necessary.' },
  talk: ['Wind\'s from the north. Deer\'ll be in the hollows.', 'Don\'t walk on the dry leaves. Walk on the wet ones. ...Sorry. Habit.', 'Da says I\'m never home. I\'m home now. He\'s still saying it.'],
  halvard: '“He came out to the standing stone once to see what I left there. Didn\'t tell me off. Left a bit of bread beside it. For manners, he said.”',
} });
NEW_FIGS.wil = { build: 'slim', skin: 'd9a070', hat: 'cap', hatColor: '3f6b22', hair: 'short', hairColor: '7a4a22', shirt: '6e8a3a', torso: 'vest', vest: '6e4421', under: '6e8a3a', pants: '5a4a3a', boots: '3a2a1a', stubble: 1, held: 'bow' };
DIALOGUE.wil = {
  intro: [
    '~A lean young man with a jay feather in his cap watches you from the fence for a while before he speaks, as if you were a deer that might bolt. “You\'re Halvard\'s. I\'m Wil. Da\'s told me about you. Mostly good.”',
  ],
  greet: [
    { t: '~He nods. That is the whole greeting.', max: 1 },
    { t: '{n}. Walk soft. There\'s a wren nesting in the gatepost.', min: 2 },
    { t: '~He is sharpening a spear by the fence, slow and even, and doesn\'t stop.', if: '!boss:greymaw' },
    { t: 'Wolf-killer. ...Sorry. I meant it kindly. Gods, I wish I\'d been there.', if: 'boss:greymaw' },
    { t: 'Out after dark? The woods are loud tonight. Something\'s moving that isn\'t a deer.', if: 'night' },
  ],
  bye: [
    'Mind the wet leaves.',
    '~He lifts two fingers from the bowstring, and is somehow already looking at the trees.',
    { t: 'If you\'re going north, keep near the stream. Goblins don\'t like running water.', min: 2 },
  ],
  how: [
    'Itchy. Too many walls in town.',
    { t: 'Da wants me home. Mam wants me home. The grey wolf wants me home. I\'m outvoted.', if: '!boss:greymaw', ask: { opts: [
      { tone: 'kind', l: 'Let me go after him, Wil. Stay with your father.', r: '~He chews on it a long while. “...You\'d need to know where he dens. Deep woods, by the standing stone. Don\'t tell Da I told you.”', tr: 1, learn: 'Wil says Greymaw dens in the Deep Whisperwood, near Veyra\'s standing stone.' },
      { tone: 'blunt', l: 'Your father\'s right. You\'ll get yourself killed.', r: 'Maybe. Da got himself married. Everyone takes a risk.', tr: 0 },
      { tone: 'pious', l: 'Veyra gives the hunt to the patient.', r: '~He looks at you sharply, then nods. “She does. I\'ve been impatient a month. I\'ll wait.”', tr: 1 },
    ] } },
    { t: 'Lighter. Like I\'ve put down a pack I didn\'t know I was carrying. I\'d been after that wolf two months.', if: 'boss:greymaw' },
  ],
  self: [
    'Wil Thatcher. Fifth Thatcher on the east fields and the first who can\'t stand sheep.',
    { t: 'I went into the woods at nine after a lost ewe. Came back three days later with the ewe and a fox kit. Da leathered me. Mam kept the fox.', min: 1 },
    { t: 'There was a little one after me. Lived two days. The small stone with just our name on it. Mam ties a feather fresh every new moon. Da says it\'s for Veyra. It\'s both.', min: 3, learn: 'The small THATCHER stone in the churchyard is Wil\'s infant sibling, who lived two days.' },
  ],
  workLabel: 'About hunting',
  work: [
    'Deer for Garrick, pelts for Hilde, nothing for the Hales. Long story. Eighty years long.',
    { t: 'First cut of every deer goes on the standing stone in the Deep Whisperwood, antlers and all. You don\'t take from the Green Lady without giving.', min: 1 },
    { t: 'The wolves are bold this year because something\'s pushing them. They\'re not denning where they used to. Something up in the hills is moving them on.', min: 2 },
  ],
  news: [
    'Tracks by the east wall. Big ones. Not big enough to be him, but getting there.',
    { t: 'Hunters hear drums under the hills some nights. Deep down. Goblin drums. Faster, lately.', min: 1 },
    { t: 'Wolves are going back to their old dens since the grey one died. The woods feel like they\'ve let out a breath.', if: 'boss:greymaw' },
    { t: 'You\'ve the Green Lady\'s favour. I can tell. The jays don\'t shout when you come near now.', if: 'god:veyra' },
    { t: 'They say you got to the four ways down there. I\'ve tracked a lot of things. Never down. Never that far.', if: 'junction' },
  ],
  halvard: [
    'He came out to the standing stone once to see what I left there. Didn\'t tell me off. Left a bit of bread beside it. For manners, he said.',
    { t: 'I saw him on the North Road the week before he went. Coming back, not going. Mud to the knees, walking fast. He saw me and put a finger to his lips.', min: 2, learn: 'Wil saw Halvard coming back down the North Road, muddy, the week before he vanished. Halvard signed to him to keep quiet.',
      ask: { opts: [
        { tone: 'curious', l: 'Was he carrying anything?', r: 'The satchel. Fatter than when he went up, I\'d say. Like he\'d found something and brought it home to read.', tr: 1 },
        { tone: 'kind', l: 'And you kept quiet. For him.', r: 'Till now. You\'re the one he\'d have told. Seems fair.', tr: 1 },
        { tone: 'blunt', l: 'You should have told someone.', r: 'Who? The councilman? Halvard put his finger to his lips. I know what that means in the woods. It means something\'s listening.', tr: 0 },
      ] } },
    { t: 'If he\'s in the woods, I\'ll find him. If he\'s under them, that\'s yours to do, not mine.', if: '!found' },
    { t: 'I left the first cut of my last deer for him, on the stone. The Green Lady won\'t mind sharing.', if: 'found' },
  ],
  caves: [
    'Caves aren\'t woods. No wind, no birds. You can\'t hear anything coming. I don\'t like it.',
    { t: 'There\'s old mine adits above the North Road. Ewan\'s dogs won\'t go near them. Neither will mine. Neither will I, and I\'m stupider than dogs.', min: 1 },
    { t: 'Something walks up out of the cave at night and back down before dawn. Tracks like a man\'s, but wrong. Toes too long. I\'ve seen them by the watchtower.', min: 2 },
  ],
  gods: [
    'Veyra. The Green Huntress. You thank her, you leave her the first cut, you never take the last of anything.',
    { t: 'Da\'s Aurel\'s, mostly. Blessing the lambs. Mam\'s Veyra\'s. I got Mam\'s god and Da\'s temper.', min: 1 },
  ],
  gossip: [
    'Bran walked into the well-post once and apologised to it. I wasn\'t going to tell anyone. I\'ve told everyone.',
    { t: 'The town says Mirela\'s a witch. I\'ve seen her in the deep woods at dusk, cutting runes in a dead oak so the wolves would leave a fawn alone. Some witch.', min: 1 },
    { t: 'Nettie Sallow\'s back. She talks... very well. She asked me about deer tracks. I talked for an hour and she didn\'t leave. That\'s something, isn\'t it?', if: 'here:nettie' },
    { t: 'I went up the old Ashvale track once. Past the watchtower, over the cliff road, three days. Da said it was bad luck. At the top there\'s a burnt orchard gone wild, and a square with a well-house full of nettles. The apples still come. I brought some back. Old Berta cried when she smelled them.', min: 4, learn: 'Wil once walked the old Ashvale track to its end: a burnt orchard and a well-house in a nettled square. Berta wept at the apples.',
      ask: { opts: [
        { tone: 'curious', l: 'What else was up there?', r: 'Chimneys with no houses round them. A bell in the grass, cracked through. A lot of quiet. I didn\'t stay the night.', tr: 1 },
        { tone: 'kind', l: 'Thank you for telling me, Wil.', r: '~He shrugs, awkward. “Seemed like yours to know. Don\'t ask me why. Berta looked at you when she cried.”', tr: 1 },
        { tone: 'pious', l: 'The gods remember places, even burnt ones.', r: 'The Green Lady does. There were fox kits in the well-house. Something\'s living there again.', tr: 1 },
      ] } },
  ],
  about: {
    hobb: [
      'Da. Slow to talk, slow to change, slow to forgive. Good with sheep. I\'m none of those things.',
      { t: 'He thinks I don\'t know he sat up every night I was in the woods. Mam told me. Mam tells me everything, to annoy him.', min: 2 },
    ],
    greta: [
      'Mam. Cleverer than the pair of us. Hangs the feathers I bring and throws out the crow ones. Crows are for other gods, she says.',
    ],
    mirela: [
      'Mirela knows the woods better than I do. Don\'t tell anyone I said that. Especially not her.',
    ],
    nettie: [
      { t: 'Nettie reads, did you know? Read me the sign on the Hales\' gate. It says "Mind the Step." I always thought it said "Keep Out, Thatchers."', if: 'here:nettie' },
    ],
  },
};
FAMILY.wil = {
  house: 'Thatcher', gen: 5,
  since: 'Five generations on the east fields. Ambrose Thatcher came up from Thornbury and cleared the stones by hand.',
  from: 'thornbury',
  kin: [
    { rel: 'father', id: 'hobb', say: 'Da. Four generations of sheep, and then me. I think he\'s still getting over it.' },
    { rel: 'mother', id: 'greta', say: 'Mam. A Fern, from the Whisperwood edge. She taught me which feathers to keep and which tracks to run from.' },
    { rel: 'sibling', name: 'the Thatcher baby', dead: 1, grave: 1, from: 'brambleford', note: 'lived two days; the small THATCHER stone', say: { t: 'There was a little one, after me. Two days. The small stone with just our name. Mam ties a feather. We don\'t talk about it.', min: 3 } },
    { rel: 'grandfather', name: 'Wilf Thatcher', dead: 1, from: 'brambleford', note: 'Hobb\'s father; Wil is named for him', say: 'Grandad Wilf. I\'m named for him, near enough. He used to say a wolf\'s just a dog that kept bad company.' },
    { rel: 'great-great-grandfather', name: 'Ambrose Thatcher', dead: 1, from: 'thornbury', note: 'cleared the east fields by hand', say: 'Ambrose cleared the east fields by hand. Every stone in the wall. Da touches it like a relic. I climb it.' },
  ],
  origin: [
    'East fields, five generations counting me. Ambrose Thatcher came up from Thornbury and pulled the stones out with his hands. Da will tell you. Da will tell you twice.',
    { t: 'Mam\'s from the Fern hamlet on the Whisperwood edge. Six houses and a lot of feathers. That\'s where I got the woods from.', min: 1, learn: 'Greta Thatcher was born a Fern, in a hamlet on the Whisperwood edge.' },
    { t: 'Thatchers and Hales don\'t sit together at harvest supper. A wall, eighty years back, and nobody knows what about. Want to know what I think?', min: 1, ask: { opts: [
      { tone: 'curious', l: 'Go on.', r: 'I think a Thatcher sheep ate a Hale cabbage, and both sides have been too proud to apologise for a cabbage ever since.', tr: 1 },
      { tone: 'joke', l: 'Let me guess. A sheep.', r: '~He grins. “A sheep. Has to be. It\'s always a sheep.”', tr: 1 },
      { tone: 'kind', l: 'Maybe you could be the one to end it.', r: 'Me? Sit next to Fenwick? He\'d auction me.', tr: 0 },
    ] } },
  ],
  family: [
    'Da wanted me on the fields. I wanted the woods. We met in the middle: I bring home wolves, he loses fewer sheep. That\'s a Thatcher peace.',
    { t: 'Grandad Wilf was the last Thatcher to sit next to a Hale. At a funeral. They didn\'t speak. Then they both went to the Fox and didn\'t speak there either, together.', min: 2 },
  ],
};
GIFT_TASTES.wil = { love: ['feather', 'antler'], like: ['meat', 'pelt', 'apple', 'hide', 'cat:ammo'], dislike: ['cat:jewelry', 'cat:scroll', 'gel'] };
GIFT_LINES.wil = {
  love: [
    '~He goes very still, the way he does when a deer steps out. “...That\'s a good one. That\'s a really good one.” He doesn\'t say thank you. His face does.',
    'The Green Lady\'ll get a share of that. The rest\'s mine. Thank you.',
  ],
  like: [
    'Useful. Ta.',
    '~He weighs the {item} in one hand, nods, and stows it in his game bag without a word.',
  ],
  neutral: [
    '~He looks at the {item} as if it were tracks he can\'t read. “Huh.”',
    'Mam\'ll know what to do with it. Mam always knows.',
  ],
  dislike: [
    'What\'s a hunter want with that? It\'d rattle. Scare the deer.',
    '~He hands the {item} back gently. “Kind. Not for me.”',
  ],
  special: {
    feather: '~He turns the feather against the light. “Jay. No, owl. Owl.” He tucks it into his cap beside the other. “Mam\'ll want it for the door. She can have the next one.”',
    antler: 'A good spread. The standing stone gets one tine, and Garrick gets the rest. Don\'t tell Garrick about the tine.',
  },
};
ARRIVE_NEWS.wil = 'Wil Thatcher is back from the Whisperwood, thin as a rake and smelling of woodsmoke. Greta has hung a fresh feather by the door.';

// =====================================================================
// Oren Vale: journeyman smith from Weyford, 25. Cheerful, chatty, earnest, in awe of Bran; observant about metalwork.
// =====================================================================
Object.assign(PEOPLE, { oren: {
  name: 'Oren Vale', role: 'journeyman smith, Bran\'s new hand', spr: 'fam_oren', where: 'Bran\'s Blades, at the second anvil',
  look: 'Twenty-five, long-armed and sandy-haired, with an old burn on one forearm and a habit of whistling at the bellows until Bran glares.',
  story: [
    [0, 'A journeyman from the Vale forge at Weyford bridge, walking his years before he can call himself master. Rufus Tolly the cartwright told him Bran needed a hand and would never ask for one.'],
    [2, 'He sleeps in Dace\'s room above the forge. Bran won\'t let him move the boots by the door.'],
    [4, 'He has noticed that Hilde folds her rivets the Greywatch way, the garrison pattern his grandfather learned from a Warden farrier. He has said nothing to her, and asks you to say nothing either.'],
  ],
  ties: { bran: 'His master. Bran barely speaks to him, and has started leaving him the good bread.', hilde: 'Carries the rivets across the street to Hilde, and comes back thoughtful.', rolf: 'Eats at the Fox every night. Rolf once called him "young Dace" by mistake and had to go and sit down.', bess: 'Bess Barrow knew him by sight from her father\'s ferry. She bosses him; he lets her.' },
  talk: ['Hot iron, cold water, good morning!', 'Master Hollin says I whistle too much. I\'ve stopped. Mostly. Inside.', 'Weyford\'s bigger, but Brambleford has better water for quenching. Don\'t tell my father.'],
  halvard: '“Never met him. But the whole Fox goes quiet for a bit when his name comes up, and that tells you a lot about a man.”',
} });
NEW_FIGS.oren = { build: 'adult', gloves: '5a3a20', skin: 'eab38b', hair: 'crop', hairColor: 'd4ad55', shirt: 'c9784a', torso: 'apron', under: 'c9784a', apronColor: '6e4421', pants: '3a3428', boots: '3a2a1a', held: 'hammer' };
DIALOGUE.oren = {
  intro: [
    '~A sandy-haired young man straightens from the second anvil and wipes his hand before he offers it. “Oren Vale, journeyman, Weyford. You\'re the acolyte! Master Hollin said you\'d come by. Well. He grunted. I took it to mean that.”',
  ],
  greet: [
    { t: 'Morning! Or whatever it is. In a forge it\'s always noon.', max: 1 },
    { t: '{n}! Pull up a bucket. Not that one. That one\'s quenching oil.', min: 2 },
    { t: '~He is whistling at the bellows. He sees you, glances at Bran, and stops.', if: 'phase:Morning,Midday' },
    { t: 'Iron\'s short. Master Hollin\'s making nails out of old hinges. I\'ve learned more in a week of not enough than a year of plenty.', if: 'event:ironshort' },
    { t: '~He is working quietly. Bran is at the other anvil, not working at all. Oren catches your eye and shakes his head, very slightly.', if: 'flag:dace_told' },
  ],
  bye: [
    'Mind the sparks!',
    { t: 'Come back when you need an edge. I\'ll do it for nothing. Master Hollin will charge you, so come when he\'s at the Fox.', min: 1 },
    { t: 'Go careful, {n}. He\'s lost enough.', min: 3 },
  ],
  how: [
    'Burnt, sore and very happy. That\'s smithing!',
    { t: 'Master Hollin hasn\'t said a whole sentence to me since I came. Yesterday it was four words. "Not like that. Watch." Then he showed me. Best lesson I\'ve ever had.', min: 1, ask: { opts: [
      { tone: 'kind', l: 'He\'s carrying a lot. Give him time.', r: 'I know. Dace. I sleep in his room. I\'ll give him all the time he wants.', tr: 1 },
      { tone: 'joke', l: 'Four words is a speech, from Bran.', r: '~He laughs, then checks over his shoulder. “Don\'t. He hears everything. He heard me think about whistling once.”', tr: 1 },
      { tone: 'blunt', l: 'Why put up with it?', r: 'Because he\'s the best smith I\'ve ever seen, and he doesn\'t know I know it.', tr: 1 },
    ] } },
  ],
  self: [
    'Oren Vale. The Vales have kept the forge at Weyford bridge four generations. I\'m walking my journeyman years. Three forges, three masters, then home.',
    { t: 'Grandad says a Hollin trained at our forge once, a hundred years back, and walked off north for a girl. He says the Vales have been losing smiths to Brambleford girls ever since. I\'ve told him I\'m being very careful.', min: 2, learn: 'Osric Hollin, Bran\'s grandfather, trained at the Vale forge at Weyford before he came north.' },
  ],
  workLabel: 'About the forge',
  work: [
    'Nails, hoops, hinges, the odd blade. Master Hollin does the blades. I\'m not allowed near a blade yet. I\'m allowed near the coal.',
    { t: 'He makes the cooper\'s hoops for nothing and charges the council double. I asked why. He said "Ada." Just that.', min: 1 },
    { t: 'Hilde folds her rivets the Greywatch way. Garrison pattern, double-peened. My grandad learned it from a Warden farrier. Where does an armorer in a valley learn that?', min: 4, learn: 'Oren noticed that Hilde makes her rivets in the Greywatch garrison pattern.',
      ask: { opts: [
        { tone: 'curious', l: 'Have you asked her?', r: 'No. And I won\'t. You don\'t ask a smith where she learned her trade unless you want to know where she learned her trade.', tr: 1 },
        { tone: 'kind', l: 'Whatever she was, she\'s Brambleford\'s now.', r: 'That\'s what I thought. That\'s why I haven\'t said it to anyone but you. Don\'t you either.', tr: 1 },
        { tone: 'blunt', l: 'You think she was a Warden.', r: '~He goes red. “I think she makes good rivets. That\'s all I think. Out loud.”', tr: 0 },
      ] } },
  ],
  news: [
    'Weyford news is old news by the time it walks up here. Mill\'s flooding, toll\'s up. Same as when I left.',
    { t: 'The council\'s ordered thirty spearheads. Master Hollin\'s making them. He hasn\'t said a word since the order came. He hits them very hard.', min: 1, if: '!flag:bran_angry' },
    { t: 'Master Hollin smashed a cup at the Fox, they say. He came in this morning and swept the forge twice. Then he made the spearheads again, better. I don\'t understand him. I like him.', if: 'flag:bran_angry' },
    { t: 'He gave you the steel sword? His best. He sat by the empty rack an hour afterwards. Then he started another.', if: 'flag:seek_dace' },
    { t: 'Bess Barrow\'s at the Fox! From Weyford! I used to pay her da a copper to cross. She says I still owe her one. I probably do.', if: 'here:bess' },
    { t: 'Ground shook last night. Every tool on the wall swung. Master Hollin just put his hand flat on the anvil, like you\'d calm a horse.', if: 'gate' },
  ],
  halvard: [
    'Never met him. But the whole Fox goes quiet for a bit when his name comes up, and that tells you a lot about a man.',
    { t: 'There\'s a horseshoe nailed up by Ada\'s shrine. Master Hollin says Halvard put it there the week after she died, for luck. It\'s crooked. He won\'t straighten it.', min: 2 },
    { t: 'Master Hollin forged the coffin nails himself. Wouldn\'t let me touch them. Then he let me hold the lantern. I think that was an honour.', if: 'found', min: 1 },
  ],
  caves: [
    'Weyford smiths say the goblins under the hill have forges hotter than ours. Fire-god. Don\'t say his name near the bellows.',
    { t: 'If you find goblin steel down there, bring me a bit? I want to see how they fold it. For learning. Not for worshipping anything.', min: 1 },
    { t: 'You killed the goblin king? Did he have a forge? Was it hot? Sorry. You\'re hurt and I\'m asking about forges.', if: 'boss:grotsnag' },
  ],
  gods: [
    'Weyford smiths spit in the fire before the first heat. Grandad says it\'s for luck. Grandad means the Ember. Don\'t tell the temple. ...You\'re the temple. Ah.',
    { t: 'Master Hollin lights Ada\'s little Korrum shrine on her name-day. I\'ve started leaving salt by it when he isn\'t looking. He\'s started not noticing.', min: 2 },
  ],
  gossip: [
    'Weyford gossip is all tolls. Brambleford gossip is all people. I much prefer people.',
    { t: 'Ned Harrow comes by and stands at the door and doesn\'t come in. Master Hollin doesn\'t look up, but he works slower while Ned\'s there. Like he\'s keeping him company.', min: 1 },
    { t: 'The councilman came for the spearheads himself. Counted them twice. Asked Master Hollin if he\'d heard from his son. Master Hollin didn\'t answer. I\'ve never heard a forge so quiet.', min: 2 },
  ],
  about: {
    bran: [
      'Master Hollin. Best smith I\'ve ever seen. Talks less than his anvil.',
      { t: 'I sleep in Dace\'s room. His boots are by the door. Master Hollin won\'t let me move them. I step over them every morning. I\'ve started saying good morning to them.', min: 3, learn: 'Oren sleeps in Dace\'s room; Bran will not let Dace\'s boots by the door be moved.',
        ask: { opts: [
          { tone: 'kind', l: 'Keep saying good morning.', r: '~He nods, serious for once. “I will. Every day till somebody comes home to wear them.”', tr: 1 },
          { tone: 'pious', l: 'Veyra watches lost hunters. Korrum, those who endure.', r: 'Then I\'ll ask both. Master Hollin can\'t stop me asking.', tr: 1 },
          { tone: 'blunt', l: 'Dace may not come back for them.', r: '~His face falls, then sets. “Then they stay there anyway. That\'s his call, not mine.”', tr: 0 },
        ] } },
    ],
    hilde: [
      'Miss Marsh. I take the rivets across. She inspects every one like I might have poisoned it.',
      { t: 'She asked if Master Hollin was eating. Then said "not that it\'s my business" and shut the door on me.', min: 1 },
    ],
    bess: [
      { t: 'Bess threw me in the Silverrun once for whistling at her. I was whistling at a heron. She still doesn\'t believe me.', if: 'here:bess' },
    ],
    abel: [
      'The cooper. Master Hollin\'s favourite person, I think. He does Abel\'s hoops before mine. I\'m not jealous. I\'m a little jealous.',
    ],
  },
};
FAMILY.oren = {
  house: 'Vale', gen: 0,
  since: 'A journeyman from Weyford, walking his years. The Vale forge at Weyford bridge trained Bran\'s grandfather a hundred years ago.',
  from: 'weyford',
  kin: [
    { rel: 'father', name: 'Garth Vale', from: 'weyford', note: 'master smith of the Vale forge, Weyford bridge', say: 'My father, Garth. Master of the Vale forge. Says I hammer like a man swatting wasps. Then says "better than me at your age," quietly, when he thinks I\'ve gone.' },
    { rel: 'mother', name: 'Ilka Vale', from: 'weyford', note: 'keeps the forge books', say: 'Mam keeps the forge books and the forge temper. She packed me eleven pairs of socks. Eleven. For one walk north.' },
    { rel: 'grandfather', name: 'Brock Vale', from: 'weyford', note: 'learned the Greywatch rivet from a Warden farrier', say: 'Grandad Brock. Ninety, and still swings a hammer at the midwinter fair. Learned half his tricks from a Warden farrier who came through when he was a boy.' },
    { rel: 'sisters', name: 'Tess and Rhona Vale', from: 'weyford', note: 'Tess married the toll-keeper\'s son', say: 'Two sisters. Tess married the toll-keeper\'s son, so we cross the bridge free. Rhona works the bellows better than I do. Don\'t tell anyone.' },
  ],
  origin: [
    'Weyford, at the bridge. You hear the toll-keeper shouting and our hammers all day. Here it\'s just the stream and Master Hollin breathing.',
    { t: 'Journeymen walk three forges before they go home masters. My first was Kettle Cross: horseshoes and caravan axles, till the raids burned the farrier\'s yard. Then here.', min: 1, learn: 'Oren worked a forge at Kettle Cross until the goblin raids burned it, then came to Brambleford.' },
    { t: 'My father says walk north and come straight back. My mother says find a nice girl. I\'m doing neither, on purpose.', min: 1, ask: { opts: [
      { tone: 'joke', l: 'Brambleford girls are dangerous to smiths, I hear.', r: 'That\'s what Grandad says! He says it like a warning. Grandma says it like a dare.', tr: 1 },
      { tone: 'kind', l: 'You\'ll be a good master, wherever you settle.', r: '~He goes pink to the ears. “Don\'t say that near Master Hollin. He\'ll make me sweep.”', tr: 1 },
      { tone: 'curious', l: 'Why come here, of all the forges?', r: 'Rufus Tolly said there was a smith in Brambleford who\'d forgotten how to ask for help. I thought I\'d save him the asking.', tr: 1 },
    ] } },
  ],
  family: [
    'The Vales trained half the smiths on the Silverrun. My father says most of them were ungrateful. He includes me.',
    { t: 'Grandad Brock and Master Hollin\'s grandfather Osric stood at the same anvil, near enough, a lifetime apart. I told Master Hollin. He grunted. Then he showed me Osric\'s old tongs.', min: 2 },
  ],
};
GIFT_TASTES.oren = { love: ['iron', 'mithril'], like: ['silver', 'meat', 'wood', 'stone', 'apple'], dislike: ['gel', 'moonpetal', 'cat:scroll'] };
GIFT_LINES.oren = {
  love: [
    '~He turns the {item} over in his hands with the face of a boy at a fair. “Oh, that\'s good. That\'s really good. Can I show Master Hollin? I\'m showing Master Hollin.”',
    'For me? I\'ll make something worth it. Not today. When I\'m good enough.',
  ],
  like: [
    'Thank you! That\'ll go in the corner by my anvil. My corner. I have a corner now.',
    '~He nods, pleased, and sets the {item} where Bran can\'t see it and tidy it away.',
  ],
  neutral: [
    '~He looks at the {item} hopefully, as if it might turn out to be iron. “Thanks! I\'ll... thanks.”',
    'I\'ll find a use for it. Smiths find a use for everything. Usually as a wedge.',
  ],
  dislike: [
    '~He holds the {item} well away from the forge. “That\'ll go up, that will. Or melt. Or worse.”',
    'Kind of you. I\'ll give it to the rag-and-bone cart. Don\'t tell Master Hollin I said no to a gift.',
  ],
  special: {
    iron: '~He weighs the ore, sniffs it, licks it, and grins. “Bog iron, good and red. Master Hollin! MASTER HOLLIN! ...He says “mm.” That\'s very high praise.”',
    mithril: '~He doesn\'t touch it at first. “I\'ve never... Grandad saw a bit once, at Highcourt. He talked about it for forty years.” He takes it as if it were an egg.',
  },
};
ARRIVE_NEWS.oren = 'A journeyman smith from Weyford, Oren Vale, has walked up the south road and taken the second anvil at Bran\'s forge.';

// New townsfolk, batch 2: Tam and Lark Cooper, Rowan and Ivy Pell, Mags and Davy Tenney, Linnet Ashby.

// =====================================================================
// Tam Cooper, six: loud, brave, breaks things, believes everything, the "oldest" twin.
// =====================================================================
Object.assign(PEOPLE, { tam: {
  name: 'Tam Cooper', role: 'the cooper\'s son, six', spr: 'fam_tam', where: 'the north lane, usually up something',
  look: 'A small, loud, freckled boy with his father\'s copper hair sticking up in every direction and a scab on each knee. Just over a fever, and making up for lost time.',
  story: [
    [0, 'He and his twin sister Lark were days in a fever. He is better now, and has eaten everything in the house.'],
    [2, 'He tells everyone the Acolyte is a wizard who chased the fever out with a sun spell. He believes it completely.'],
    [4, 'Since the fever he is frightened of the dark. He sleeps with his mother\'s sun-disc from over the cot under his pillow, and has made Lark promise not to tell.'],
  ],
  ties: { abel: 'His father. Tam wants to be a cooper, mostly for the hammering.', lark: 'His twin. She lets him think he\'s in charge.', jory: 'His grandfather at the mill, who lets him ride the flour sacks.', tamsin: 'He is terrified of Tamsin\'s brown jar.', pippa: 'Thinks Pippa Tolly is the most important person in town, after the wizard.' },
  talk: ['I\'m not tired. I\'m never tired. I\'m six.', 'Dad says I break staves. I don\'t break them. They break when I\'m holding them.', 'Lark counted all the barrels. I jumped on them. That\'s nearly the same.'],
  halvard: '“Father Halvard did the water on me when I was a baby. Dad says I shouted. I don\'t remember. I bet I did, though.”',
} });
NEW_FIGS.tam = { build: 'child', skin: 'f6d0ac', hair: 'curly', hairColor: 'c9784a', shirt: '3b6fc4', torso: 'vest', vest: '8f5d2c', under: '3b6fc4', pants: '5a4a3a', boots: '6e4421', blush: 1 };
DIALOGUE.tam = {
  intro: [
    '~A small boy with copper hair skids to a stop in front of you, looks you up and down, and gasps. “It\'s HIM. Lark! LARK! It\'s the wizard!”',
  ],
  greet: [
    'It\'s the wizard!',
    '~He jumps on the spot three times to show you. “Better. See? Better.”',
    { t: 'Morning! I had two bowls. Two. Lark only had one.', if: 'phase:Dawn,Morning' },
    { t: 'I\'m not allowed out after the lamps. I\'m only a bit out. This is the step. The step\'s not out.', if: 'night' },
    { t: '{n}! Do the sun spell again! Please! Just a small one!', min: 2 },
    { t: '~Tam is sitting on a barrel with his chin on his knees, very quiet. He doesn\'t jump up.', if: 'found' },
    { t: 'Davy says you go in the caves. Do you? Do you hit things?', if: 'here:davy' },
    { t: 'Mum says the fever\'s back in the lanes. I\'m not getting it again. I told it no.', if: 'event:fever' },
  ],
  bye: [
    'Bye! Bye! BYE!',
    'Come back tomorrow. And the day after. Every day.',
    { t: 'Bring me a goblin ear. Lark says don\'t. Bring one anyway.', min: 2 },
    '~He salutes the way Ned does at the gate, with the wrong hand.',
  ],
  how: [
    'Good! I\'m strong now. I lifted a stave. A little one.',
    { t: 'When I was sick it was hot and the ceiling went round. Lark held my hand. Don\'t tell her I said.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'I won\'t tell. She was very brave too.', r: 'She was. She cried, though. I didn\'t. I mostly didn\'t.', tr: 1 },
        { tone: 'joke', l: 'Did the ceiling go round to the left or the right?', r: '~He thinks very hard. “Both.” He seems pleased with this.', tr: 1 },
        { tone: 'pious', l: 'Aurel was watching over you both.', r: 'The morning man! We waved at him. He waved back. Lark says he didn\'t. He did.', tr: 1 },
        { tone: 'blunt', l: 'You were very sick, Tam. You should still rest.', r: '~His lower lip comes out. “That\'s what Tamsin says. You\'re not Tamsin.”', tr: -1 },
      ] } },
    { t: 'Bored. Mum won\'t let us out till the coughing stops. I drew a dragon on the wall. Dad said a word.', if: 'event:fever' },
    { t: '~He kicks the barrel with his heel. “Dad told us Father Halvard isn\'t coming back. I don\'t want him not to.”', if: 'found' },
  ],
  self: [
    'I\'m Tam. I\'m six. I\'m the oldest. By a bit. Mum says by a sneeze.',
    'I\'m going to be a cooper like Dad. And a wizard. And a guard. On different days.',
    { t: 'I\'ve got a scab on this knee from the pond and a scab on this knee from Lark.', min: 1 },
    { t: '~He leans close and whispers. “I don\'t like the dark now. Since the fever. I keep the morning man under my pillow.” He pats his pocket. “It\'s Mum\'s. She doesn\'t know. Lark knows.”', min: 4,
      learn: 'Tam Cooper has been afraid of the dark since the fever, and sleeps with his mother\'s sun-disc under his pillow.',
      ask: { opts: [
        { tone: 'kind', l: 'That\'s a good place for it. Aurel likes to be close.', r: 'Does he? ~He looks enormously relieved. “Then I\'m keeping it.”', tr: 1 },
        { tone: 'pious', l: 'Say this at night: Aurel, keep the dark small.', r: '~He mouths it twice, very seriously. “Keep the dark small. That\'s a good one.”', tr: 1 },
        { tone: 'joke', l: 'The dark\'s more scared of you. You\'re very loud.', r: '~He giggles so hard he has to sit down. “I AM loud.”', tr: 1 },
        { tone: 'blunt', l: 'You should give it back to your mum.', r: '~He clutches his pocket. “No! ...Later. When I\'m seven.”', tr: -1 },
      ] } },
  ],
  workLabel: 'About games',
  work: [
    'We play barrels. You get in a barrel and Lark rolls you. Then you\'re sick. Then it\'s her turn.',
    'Sticks is a good game. You get a stick and you\'re a guard. Ned lets me stand at the gate for one minute. He counts it.',
    'Pippa makes us play temple. She\'s the priest. I\'m the lamp. I just have to stand there. It\'s the worst game.',
    { t: 'Davy plays goblins. He\'s the goblin and I\'m the guard and I win. Then he goes quiet and stops playing. I don\'t know why.', if: 'here:davy', min: 1 },
  ],
  news: [
    'Lark\'s tooth is wobbly. That\'s the news. Mine isn\'t. Yet.',
    { t: 'There\'s a new boy! Davy! He\'s EIGHT. He saw goblins. Real ones. With fire.', if: 'here:davy' },
    { t: 'There\'s a man sleeping in Mr Thatcher\'s barn and he\'s not a tramp, he\'s a farmer, Dad said. He\'s called Rowan. Like the tree!', if: 'here:rowan' },
    { t: 'The big grey wolf is dead! Mr Thatcher said. I\'m going to be a wolf hunter now instead.', if: 'boss:greymaw' },
    { t: 'You found the place where it goes four ways! Dad told us. Lark drew it. I drew the monsters on.', if: 'junction' },
    { t: 'The men at the Fox say there\'s goblins on the road. If they come here I\'ll hit them with Dad\'s mallet.', if: 'event:raids' },
    { t: 'There\'s a cart from the south that smells like sweets. It\'s not sweets. It\'s spices. I licked one. It wasn\'t.', if: 'event:caravan' },
  ],
  halvard: [
    'Father Halvard did the water on us when we were babies. In one bowl. Dad says it went everywhere.',
    { t: 'He gave me a honey cake after dawn service once. And Lark one. He said don\'t tell Mrs Tolly, it\'s not her honey.', min: 1 },
    { t: 'When\'s he coming back? Lark says ask you. You know everything.', if: '!found',
      ask: { opts: [
        { tone: 'kind', l: 'I\'m looking for him, Tam. Every day.', r: 'Good. Find him quick. He owes me a honey cake.', tr: 1 },
        { tone: 'pious', l: 'He\'s in Aurel\'s hands.', r: '~He looks at his own hands, then at yours. “Big hands, then.”', tr: 0 },
        { tone: 'blunt', l: 'I don\'t know if he is.', r: '~His face goes very still. Then he runs off to find Lark.', tr: -1 },
        { tone: 'joke', l: 'When he\'s finished being lost. He\'s very good at it.', r: 'I get lost too! In the mill. Grandad finds me in the flour.', tr: 1 },
      ] } },
    { t: '~He scuffs his boot. “Dad cried. Dads don\'t cry. Dad did.” He looks up at you. “Is Father Halvard with the morning man now?”', if: 'found',
      ask: { opts: [
        { tone: 'pious', l: 'Yes. Right beside him, where it\'s always light.', r: '~He nods hard. “Then he\'s not in the dark. Good. He wouldn\'t like the dark.”', tr: 1 },
        { tone: 'kind', l: 'He\'s somewhere warm, Tam. And he\'d want you to keep being loud.', r: 'I can do that. I\'m good at that.', tr: 1 },
        { tone: 'blunt', l: 'He\'s gone, Tam.', r: '~He stares at you, and his chin wobbles, and he goes inside without a word.', tr: -1 },
      ] } },
  ],
  caves: [
    'There\'s monsters in the caves. Big ones. With teeth. I\'m not scared of them.',
    { t: 'Great-grandad Pell said there was a goblin king who was friends with everyone. Dad tells it at bedtime. Lark says goblins can\'t be friends. I think they can if you give them cake.', min: 1 },
    { t: 'Lark says there\'s a door down there with four locks. I said you can just kick it. Dad laughed.', if: 'seals:1' },
    { t: 'Did you see the goblin king? Did you hit him? Did he cry?', if: 'boss:grotsnag' },
  ],
  gods: [
    'The morning man\'s over our bed. He\'s Aurel. You wave at him in the morning or he gets sad.',
    'Mr Thatcher has feathers on his door for the green lady. I want a feather. Mum says we\'re Aurel\'s house. Lark says we can be both.',
    { t: 'Davy\'s mum doesn\'t wave at any gods. Davy says she stopped. I told him to wave for her. He did. Once.', if: 'here:mags', min: 2 },
  ],
  gossip: [
    'Mr Bran hammers really loud. Louder than me. I want to be that loud.',
    { t: 'Pippa says she\'s going to be a priest like you. I said you\'re a wizard. She hit me. Gently.', min: 1 },
    { t: 'Mrs Voss brought red roses when we were sick. Mum put them in the jug. Mr Voss came and looked in the window after. He didn\'t come in.', min: 2, if: 'duty:abel_twins' },
    { t: 'Davy shouts in the night. By the temple. Lark heard it. I nearly did.', if: 'here:davy', min: 2 },
    { t: 'Rowan can carry a sheep under each arm. I asked. He did it. The sheep didn\'t like it.', if: 'here:rowan' },
  ],
  about: {
    lark: [
      'Lark\'s my sister. She\'s a bit clever. Too clever, Dad says, but he says it nice.',
      { t: 'She held my hand the whole fever. I held hers back. That\'s what twins do.', min: 2 },
    ],
    abel: [
      'Dad makes the barrels. He can roll one with his foot. I\'m learning.',
      { t: 'Dad cried when we got better. And laughed. At the same time. It was weird.', min: 1 },
    ],
    jory: [
      'Grandad Jory has the mill. Everything\'s floury. He sneezes like a donkey.',
      { t: 'Grandad lets me ride the sacks down the chute. Mum doesn\'t know. Now you know.', min: 2 },
    ],
    tamsin: [
      'Tamsin\'s brown jar is medicine. It tastes like a boot. I had nine spoons.',
      { t: 'Tamsin sat with us at night. She sang. Badly. Don\'t tell her I said badly.', min: 2 },
    ],
    davy: [
      { t: 'Davy\'s eight. He\'s got a stick that\'s nearly a spear. He saw real goblins with fire on sticks.', if: 'here:davy' },
      { t: 'Davy doesn\'t cry. Lark says he does, at night. I don\'t think so. Maybe a bit.', if: 'here:davy', min: 2 },
    ],
    pippa: ['Pippa\'s ten. She knows everything. She told me worms can\'t hear. Then she shouted at one.'],
    bran: ['Mr Bran gave me a nail. A whole nail. I keep it in my sock.'],
    ned: ['Ned lets me hold his spear. Only the bottom bit.'],
  },
};
FAMILY.tam = {
  house: 'Cooper', gen: 6,
  since: 'Six generations, counting the boy. The first Cooper married a founding Tolly, and the barrel mark has not changed since.',
  from: 'brambleford',
  kin: [
    { rel: 'father', id: 'abel', say: 'Dad! He makes barrels. He can roll one with his foot.' },
    { rel: 'twin sister', id: 'lark', say: 'Lark. She\'s my twin. I came out first. She says that doesn\'t count. It counts.' },
    { rel: 'mother', name: 'Sela Cooper', note: 'born a Miller, Jory\'s daughter; keeps the sun-disc over the cot', say: 'Mum\'s called Sela. She does the talking in our house. Dad does the nodding.' },
    { rel: 'grandfather', id: 'jory', say: 'Grandad Jory has the mill. When he hugs you, you go floury.' },
    { rel: 'grandfather', name: 'Mattias Cooper', dead: 1, note: 'cooper, Abel\'s father', say: 'Grandad Mattias made barrels too. He died before we were born. Dad says I\'ve got his elbows.' },
    { rel: 'great-grandfather', name: 'Old Pell Cooper', dead: 1, note: 'told the goblin-king stories', say: 'Great-grandad Pell knew about the goblin king. Dad tells it at bedtime. It\'s the best story. There\'s a fight.' },
  ],
  origin: [
    'We\'re from here. Always. Since before the houses, I said. Lark says since the houses.',
    'The first Cooper married a Tolly. So Pippa\'s my cousin, a long way back. I told her. She said everyone\'s her cousin.',
    { t: 'Mum\'s family are the Millers. Grandad says they came up from Weyford ages ago on a barge. Lark says barges can\'t go up a stream. Grandad said this one could.',
      learn: 'Tam\'s mother\'s family, the Millers, came up from Weyford long ago.' },
    { t: 'Where are YOU from?',
      ask: { opts: [
        { tone: 'kind', l: 'Here, Tam. Same as you.', r: 'Good. Then you can\'t go away.', tr: 1 },
        { tone: 'curious', l: 'I don\'t really know.', r: '~He thinks hard. “Then you\'re from the temple. Like a lamp.”', tr: 1 },
        { tone: 'joke', l: 'I hatched out of an egg.', r: '~His eyes go enormous. “LARK! LARK! HE HATCHED!”', tr: 1 },
        { tone: 'blunt', l: 'Somewhere up north.', r: 'North\'s where the wolf lives. Were you friends with it?', tr: 0 },
      ] } },
  ],
  family: [
    'Dad\'s dad was a cooper and his dad and his dad. I\'m going to be one. I already broke a stave. That\'s how you start.',
    'Mum says the mill and the barrels go together, because flour goes in barrels. She says that\'s not why she married Dad. It\'s a bit why.',
    { t: 'Grandad Jory and Dad don\'t talk much. They just nod. Lark says that\'s talking, for them.', min: 1 },
  ],
};
GIFT_TASTES.tam = { love: ['antler', 'bone', 'cat:weapon'], like: ['apple', 'egg', 'feather', 'torch', 'perch'], dislike: ['healroot', 'cat:potion', 'moonpetal'] };
GIFT_LINES.tam = {
  love: [
    '~He grabs the {item} with both hands and runs a full circle round you. “LARK! LOOK! LOOK WHAT THE WIZARD GAVE ME!”',
    'Is it mine? Mine mine? Not share mine? ~He hugs it. “Mine.”',
  ],
  like: [
    'Ooh. Thanks! I\'m putting it in my sock with the nail.',
    '~He sniffs the {item}, licks it, and nods. “Good.”',
  ],
  neutral: [
    'What is it? ...Is it a wizard thing? ~He holds it up hopefully. Nothing happens.',
    'Thanks. I\'ll give it to Lark. She likes boring things.',
  ],
  dislike: [
    '~He backs away from the {item}. “That\'s medicine. I KNOW that\'s medicine.”',
    'No thank you. Mum says say no thank you. No thank you.',
  ],
  special: {
    antler: '~He holds the antler on his head and charges at the nearest barrel. “I\'M A STAG! I\'M THE BIGGEST STAG!” The barrel loses.',
    healroot: '~He goes white under his freckles. “That\'s what was in the brown jar. Take it away. TAKE IT AWAY.”',
  },
};
ARRIVE_NEWS.tam = 'The Cooper twins are out of bed: Tam Cooper has already climbed the cooperage roof and been fetched down.';

// =====================================================================
// Lark Cooper, six: quiet, solemn, counts everything, notices what grown-ups miss.
// =====================================================================
Object.assign(PEOPLE, { lark: {
  name: 'Lark Cooper', role: 'the cooper\'s daughter, six', spr: 'fam_lark', where: 'the step of the cooperage on the north lane, counting',
  look: 'A small serious girl with a copper braid and a fever-pale face. She counts under her breath and watches grown-ups as if they were sums she hasn\'t finished.',
  story: [
    [0, 'She is Tam\'s twin. She asked for porridge the morning the fever broke, and has been asking questions ever since.'],
    [2, 'She counts everything: staves, steps, chimneys, carts. She knows how many of anything there are in the north lane.'],
    [4, 'She has counted the councilman\'s cart going up the north lane at night four times, always toward the North Road, never the market. She hasn\'t told her father, because he would make the face.'],
  ],
  ties: { abel: 'Her father. She counts his staves and tells him when he\'s one short.', tam: 'Her twin. She lets him think he\'s the clever one.', tamsin: 'The only child in town who likes Tamsin\'s brown jar.', elsbeth: 'Mrs Voss brought roses when she was ill. Lark wants to know why Mrs Voss looked so sad.', berta: 'Old Berta tells her stories, and Lark notices where they stop.' },
  talk: ['There are forty-one staves in Dad\'s yard. Forty, if Tam\'s been there.', 'Tam says you\'re a wizard. You\'re not, though. You\'re an acolyte. I asked.', 'I\'m not shy. I\'m thinking.'],
  halvard: '“Father Halvard counted with me once. Up to a hundred. He did all the hard ones in the middle. He had a nice voice for numbers.”',
} });
NEW_FIGS.lark = { build: 'child', skin: 'f6d0ac', hair: 'braid', hairColor: 'c9784a', shirt: 'e0c060', torso: 'dress', apron: 1, jaw: 'soft', lashes: 1, blush: 1 };
DIALOGUE.lark = {
  intro: [
    '~A small girl with a copper braid looks up from the step, where she has laid out pebbles in rows of ten. She studies you seriously. “You\'re the one who came when we were hot. I remember your hands. They were cold. That was nice.”',
  ],
  greet: [
    'Hello. You\'re taller than yesterday. No. Same.',
    '~She holds up a hand: wait. She finishes counting something under her breath. “Forty. Hello.”',
    { t: 'Good morning. I counted the chimneys smoking. Nineteen. Mrs Tolly\'s is first. It always is.', if: 'phase:Dawn,Morning' },
    { t: 'I\'m allowed up till the third star. That\'s the second one.', if: 'night' },
    { t: 'Tam is up the apple tree. I said six branches is too many. He said seven.', min: 1 },
    { t: '{n}. I saved you a pebble. It\'s the roundest one.', min: 2 },
    { t: '~She doesn\'t look up. She has stopped counting her pebbles. She is just moving them about.', if: 'found' },
    { t: 'Mum says the fever\'s in the lanes again. I\'m keeping away from everyone. Except you. You\'re allowed.', if: 'event:fever' },
  ],
  bye: [
    'Goodbye. Mind the third cobble. It wobbles.',
    'Bye. Come back before supper. It\'s soup.',
    { t: 'Aurel keep you. That\'s what Father Halvard said. I\'m saying it now, because somebody should.', min: 2 },
    '~She waves, exactly three times.',
  ],
  how: [
    'I\'m well, thank you. I\'m still wobbly on stairs. There are eleven to our loft. I do them sitting down.',
    { t: 'When I was sick I couldn\'t count. The numbers kept sliding off. That was the scariest bit. Not the hot.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'They came back, though. All of them.', r: '~She nods. “All of them. I checked. Up to a thousand. It took a day.”', tr: 1 },
        { tone: 'curious', l: 'What was the first number you remembered?', r: 'Two. Because there\'s two of us. Then porridge. Porridge isn\'t a number. I was hungry.', tr: 1 },
        { tone: 'pious', l: 'Aurel keeps count when we can\'t.', r: '~She thinks about this for a long time. “That\'s a lot of counting. He must be very good at it.”', tr: 1 },
        { tone: 'joke', l: 'Maybe the numbers had a fever too.', r: 'Numbers don\'t get fevers. ~A pause. “Seven might. Seven looks hot.”', tr: 1 },
      ] } },
    { t: 'Tam\'s cross because I\'m better at stairs. I\'m not better. I\'m slower. Slower is better at stairs.', min: 2 },
    { t: 'I\'m sad today. Dad says it\'s all right to be sad and still eat your soup. So I\'m doing both.', if: 'found' },
  ],
  self: [
    'I\'m Lark. I was born four minutes after Tam. He says that makes me the little one. Four minutes isn\'t little. It\'s four.',
    'I like counting and porridge and when it\'s quiet. Tam likes noise. We share a bed. It\'s difficult.',
    { t: 'When I\'m big I\'m going to count things for the town. Like Mr Quill. But nicer. And I\'d count the right things.', min: 2 },
  ],
  workLabel: 'About counting',
  work: [
    'Dad has forty-one staves. Mum has six jars of plums. Tam has two scabs. I count them so nothing goes missing.',
    'Pippa has thirty-two treasures in her box. One is a snail shell with no snail. I asked where the snail went. She said away. Away isn\'t a number.',
    { t: 'Mr Quill says there are about two hundred people in Brambleford. About isn\'t counting. I\'m doing it properly. There\'s more now, with the new ones.', min: 1, if: 'here:rowan' },
    { t: '~She lowers her voice. “Mr Voss\'s cart goes up our lane at night. Not to the market. Up. Toward the gate. I counted four times. Always when the moon\'s thin.”', min: 3,
      learn: 'Lark Cooper has counted the councilman\'s cart going up the north lane at night four times, toward the North Road, always when the moon is thin.',
      ask: { opts: [
        { tone: 'kind', l: 'Thank you for telling me, Lark. That was clever.', r: 'I know. ~She looks pleased anyway. “I won\'t tell Dad. He makes the face.”', tr: 1 },
        { tone: 'curious', l: 'What was in the cart?', r: 'Barrels. Dad\'s barrels. But without his mark on. I know Dad\'s barrels. They have a shape.', tr: 1 },
        { tone: 'blunt', l: 'You shouldn\'t be up watching carts at night.', r: '~Her face closes. “I wasn\'t watching. I was counting. It\'s different.”', tr: -1 },
        { tone: 'joke', l: 'Maybe he\'s delivering very late soup.', r: 'Soup doesn\'t go in barrels. ~A pause. “Except at the Fox.”', tr: 0 },
      ] } },
  ],
  news: [
    'Mrs Tolly\'s bread was four minutes late today. Something must have happened. I don\'t know what yet.',
    { t: 'There\'s a lady sewing at the Fox now. Ivy. She let me count her pins. Two hundred and eleven. One was bent.', if: 'here:ivy' },
    { t: 'A lady came for Old Berta with a basket of bees. She has Berta\'s nose. I noticed. Nobody else did. Then they cried on the step.', if: 'here:linnet' },
    { t: 'People say goblins at the well. They say it quieter when children come. I can still hear.', if: 'event:raids' },
    { t: 'You got one of the seals from under the hill. Dad said. There are four. So that\'s three left. I drew them on the wall.', if: 'seals:1' },
    { t: 'The big wolf\'s dead. Mr Thatcher counted his sheep after. They were all there. He counted twice. I watched.', if: 'boss:greymaw' },
  ],
  halvard: [
    'Father Halvard counted with me once, up to a hundred. He did the hard ones in the middle.',
    { t: 'He used to stop at Dad\'s yard on his way past and tap every barrel. He said they were saying good morning back.', min: 1 },
    { t: 'Tam thinks he\'ll come back on his own. I think somebody has to go and get him. I think that\'s you.', if: '!found', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'I think so too.', r: 'Good. Take a lantern. Take two. One might go out.', tr: 1 },
        { tone: 'blunt', l: 'It might be too late, Lark.', r: '~She looks at you steadily for a long time. “Then you should still go. So he isn\'t by himself.”', tr: 0 },
        { tone: 'pious', l: 'Aurel will light the way.', r: 'Take a lantern as well. In case Aurel\'s busy.', tr: 1 },
      ] } },
    { t: '~She holds out a pebble, very round. “This is for Father Halvard. For his stone. I don\'t know where his stone is. You put it there.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll put it right on top, where he\'ll see it.', r: '~She nods. “On top. Not the side. He\'d want to see it.”', tr: 1 },
        { tone: 'pious', l: 'We\'ll set it there at dawn. Aurel\'s hour.', r: 'At dawn. I\'ll come. Tam will be asleep. I\'ll wake him.', tr: 1 },
        { tone: 'curious', l: 'Why a pebble?', r: 'Because it\'s the best one. You give the best one.', tr: 1 },
      ] } },
  ],
  caves: [
    'The caves go down. Dad says nobody knows how far. Somebody must. Somebody always knows how far.',
    { t: 'Great-grandad Pell said the goblin king traded with the valley. Tam thinks that means they were friends. Traders aren\'t friends. They\'re traders. Mr Tolly says so.', min: 1 },
    { t: 'Four stairs and one door. Four kings and one key each. That\'s a sum. You have to do the whole sum or it doesn\'t work.', if: 'junction', min: 1 },
    { t: 'You opened the big door. ~She is quiet a moment. “What was behind it? You don\'t have to say. Just nod if it was big.”', if: 'gate' },
  ],
  gods: [
    'We have the morning man over our bed. Tam waves at him. I just nod. He knows I mean it.',
    { t: 'I think there are lots of gods because there are lots of jobs. Aurel does mornings. Korrum does rocks. Nobody does Tuesdays.', min: 1 },
    { t: 'When we were hot I asked Aurel to make it be me and not Tam. I don\'t think that\'s how it works. He made it neither. That\'s better.', min: 3 },
  ],
  gossip: [
    'Mrs Voss brought us roses. She stood at the door a long time. She looked like she wanted to come in and couldn\'t.',
    { t: 'Mr Voss shouts at night. Our house is near. Mum says it\'s bad dreams. Tam says it\'s a bear. It isn\'t a bear.', min: 2 },
    { t: 'Old Berta tells stories about a town with a bell tower. She always stops at the same part, right before the end. I counted. Six times.', min: 2 },
    { t: 'Davy\'s mum looks at the road a lot. Like she\'s waiting for it to do something.', if: 'here:mags', min: 1 },
    { t: 'Mr Rowan sleeps with the sheep and Mrs Ivy sleeps at the Fox. Mum says they\'re saving. I asked saving what. She said a roof.', if: 'here:ivy' },
  ],
  about: {
    tam: [
      'Tam\'s my brother. He\'s louder than me. Everyone\'s louder than me.',
      { t: 'Tam\'s scared of the dark now. He thinks I don\'t know. I let him have the side by the window, so there\'s more moon.', min: 3 },
    ],
    abel: [
      'Dad\'s quiet like me. We sit on the step and don\'t talk. It\'s nice.',
      { t: 'Dad\'s making us each a little barrel with our names on. Mine says LARK. The K is backwards. I\'m not going to tell him.', min: 2, if: 'duty:abel_twins' },
    ],
    jory: ['Grandad Jory\'s mill wheel goes round eleven times a minute. I counted. He said nobody ever counted it before. He gave me a cake.'],
    berta: [
      'Old Berta smells like lavender. She calls me little bird, because of my name.',
      { t: 'She looked at me once and said I had a face like a girl she used to know. Then she stopped talking and gave me a biscuit.', min: 2 },
    ],
    tamsin: [
      'I like Tamsin\'s brown jar. Tam says I\'m mad. It tastes like trees.',
      { t: 'Tamsin holds her jars very close to her nose now. I hold my pebbles close when I\'m tired. Maybe she\'s tired.', min: 3 },
    ],
    elsbeth: [{ t: 'Mrs Voss smells like roses and looks like rain.', min: 1 }],
    davy: [{ t: 'Davy says he saw a goblin as big as a door. Doors are bigger than goblins. I asked Mr Aldous. But Davy saw something. His eyes go far away.', if: 'here:davy', min: 1 }],
    linnet: [{ t: 'The lady at Berta\'s is called Linnet. That\'s a bird too. We\'re both birds. She said I\'m the smaller bird. That\'s true.', if: 'here:linnet' }],
  },
};
FAMILY.lark = {
  house: 'Cooper', gen: 6,
  since: 'Six generations, four minutes behind her brother. The Coopers have burned a ring with a line through it into their lids since the founding.',
  from: 'brambleford',
  kin: [
    { rel: 'father', id: 'abel', say: 'Dad. He makes barrels. I count them. Forty-one in the yard.' },
    { rel: 'twin brother', id: 'tam', say: 'Tam. Four minutes older. He uses all four of them.' },
    { rel: 'mother', name: 'Sela Cooper', note: 'born a Miller, Jory\'s daughter', say: 'Mum. Sela. She sings when she thinks nobody\'s there. I\'m always there.' },
    { rel: 'grandfather', id: 'jory', say: 'Grandad Jory. His wheel goes round eleven times a minute. He didn\'t know that till I told him.' },
    { rel: 'great-grandfather', name: 'Old Pell Cooper', dead: 1, note: 'told the goblin-king stories', say: 'Great-grandad Pell traded with goblins, Dad says. Or his dad did. The story changes. I\'ve counted three ways.' },
    { rel: 'cousin, a long way back', id: 'pippa', say: 'Pippa\'s our cousin from ages ago, because a Cooper married a Tolly. Pippa says it means she\'s in charge of us.' },
  ],
  origin: [
    'We\'re founders. Dad says it like it\'s a small thing. Mr Quill says it like it\'s a big thing. Mrs Tolly says it like it\'s a chore.',
    { t: 'The first Cooper married a Tolly when there was only the store and the inn and the lamp. Our mark is from then. A ring with a line. It means made true.',
      learn: 'The Cooper barrel mark, a ring with a line through it, dates from the founding, when the first Cooper married a Tolly.' },
    'Mum\'s family are Millers. They came from Weyford. Grandad says it like it\'s a long way. It\'s half a day. I asked.',
    { t: 'Where are you from? Old Berta says north. Old Berta always stops when she says north.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'I\'m from here now. That\'s what counts.', r: 'That counts. ~She nods, satisfied, as if writing it down.', tr: 1 },
        { tone: 'curious', l: 'Where does Berta stop, exactly?', r: 'Right after north. Then she says never mind me. Six times. I counted.', tr: 1 },
        { tone: 'blunt', l: 'I don\'t know, Lark.', r: 'That\'s all right. Not knowing is a number too. It\'s nought.', tr: 0 },
        { tone: 'joke', l: 'From the moon. I fell off.', r: 'You\'d be flatter. ~She considers you. “A bit flatter.”', tr: 1 },
      ] } },
  ],
  family: [
    'Dad makes barrels, Grandad makes flour, Mum makes us eat. That\'s our family.',
    { t: 'I\'m going to keep my pebbles in my little barrel. Tam\'s going to keep nothing in his. He\'s going to roll it.', min: 1 },
    { t: 'Mum and Grandad argue about bread. Grandad says flour\'s flour. Mum says Mrs Tolly would disagree. Then they both laugh.', min: 2 },
  ],
};
GIFT_TASTES.lark = { love: ['feather', 'shard', 'goldcarp'], like: ['apple', 'milk', 'stone', 'wood', 'egg'], dislike: ['redcap', 'gel', 'bone'] };
GIFT_LINES.lark = {
  love: [
    '~She holds the {item} in both hands and doesn\'t say anything for a long time. Then, very quietly: “This is the best one. Of anything.”',
    '~She turns the {item} over, counting something only she can see. “I\'m keeping it in my barrel. On top.”',
  ],
  like: [
    'Thank you. That\'s one. I\'ll remember it was you.',
    '~She sets the {item} carefully in a row with her pebbles, at the end. “There. Now it belongs.”',
  ],
  neutral: [
    'Thank you. ~She looks at the {item} as if it were a sum. “I don\'t know what it\'s for yet.”',
    'Tam will want it. I\'ll let him have it if he\'s good. He won\'t be.',
  ],
  dislike: [
    '~She puts her hands behind her back. “Mum says don\'t touch those.”',
    'No, thank you. It\'s not a nice one.',
  ],
  special: {
    feather: '~She strokes the feather flat, then counts the barbs on one side. She gives up at sixty. “For the door. Mum says we\'re Aurel\'s house. I\'ll put it inside the door. That\'s different.”',
    redcap: '~She steps back. “That\'s a red one. Tamsin says red ones make you see things that aren\'t there.” She frowns. “I like seeing things that are there.”',
  },
};
ARRIVE_NEWS.lark = 'Lark Cooper is back on the step of the cooperage, counting the north lane, and has found it one chimney short.';

// =====================================================================
// Rowan Pell: big, easy, sunburned Thornbury farmhand; hopeful, dry, ducks every beam.
// =====================================================================
Object.assign(PEOPLE, { rowan: {
  name: 'Rowan Pell', role: 'farmhand, newcomer from Thornbury', spr: 'fam_rowan', where: 'Hobb Thatcher\'s barn, or the east fields',
  look: 'A big, sunburned young man with straw in his hair and hands like spades, who ducks under every doorway in town whether he needs to or not.',
  story: [
    [0, 'He and his wife Ivy came up from Thornbury when blight took the orchard they rented. He has hired on with Hobb Thatcher for his keep and a corner of the barn.'],
    [2, 'He sleeps in the barn and Ivy at the Fox, because between them they can afford one roof and it isn\'t a shared one yet. He is saving every copper for a cottage.'],
    [4, 'The Thornbury reeve turned them off the week the blight showed, and the land was sold within the month, to a buyer from up the valley who paid in new silver and never came to look at it.'],
  ],
  ties: { ivy: 'His wife. He would carry her across the valley if she\'d let him.', hobb: 'His employer. Hobb pays in mutton and opinions.', fenwick: 'Fenwick\'s mother lives two doors from Rowan\'s in Thornbury and sends messages through him.', garrick: 'Garrick feeds him, on the grounds that a man that size is a public concern.' },
  talk: ['Thornbury cider, Brambleford bread. That\'s the rule. I\'m not saying which is better. It\'s cider.', 'Mind your head. I never do.', 'Sheep are just apples that wander off.'],
  halvard: '“Met him once, at Thornbury market. Our priest was laid up and he blessed the whole lambing pen in one go. Sheep went quiet as stones. I always meant to ask him how.”',
} });
NEW_FIGS.rowan = { build: 'broad', skin: 'd9a070', hat: 'straw', hatColor: 'd4ad55', hair: 'short', hairColor: '6e3f1f', stubble: 1, shirt: 'a07a3a', torso: 'vest', vest: '5a6e3a', under: 'a07a3a', pants: '5a4a3a', boots: '3a3428' };
DIALOGUE.rowan = {
  intro: [
    '~A very large young man straightens up from a hay-fork, cracks his head on a beam, and grins at you as if it happens all the time. It does.',
    'Rowan Pell. Thornbury. Don\'t hold it against me.',
  ],
  greet: [
    'Acolyte! Mind the beam. Learn from me.',
    { t: 'Haying weather. Or it would be, if the sky\'d make up its mind.', min: 1 },
    { t: 'Up with the sheep? They\'re ahead of you. They\'re ahead of me.', if: 'phase:Dawn,Morning' },
    { t: 'Evening. I\'m off to sit outside the Fox and look at Ivy\'s window like a lovesick calf. Don\'t tell Hobb.', if: 'night' },
    { t: '{n}. Good to see a face that isn\'t a sheep\'s.', min: 2 },
    { t: '~He takes off his hat and holds it in both hands, Thornbury fashion, and doesn\'t put it back on.', if: 'found' },
    { t: 'Wolf\'s dead, they say! Hobb\'s singing. Have you heard Hobb sing? Pray you don\'t.', if: 'boss:greymaw' },
    { t: 'Road\'s bad, they say. Goblins. I came up that road with everything we own in one cart. Glad I\'m not on it now.', if: 'event:raids' },
  ],
  bye: [
    'Right. Back to the muck.',
    'Go well. Mind your head.',
    { t: 'If you see Ivy, tell her... no. I\'ll tell her. Tell her I\'m coming by.', min: 1 },
    'Aurel keep you. And the Green Lady keep Hobb\'s fences, because I can\'t.',
  ],
  how: [
    'Sore in the back and easy in the head. That\'s farm work.',
    { t: 'Good, mostly. Miss the trees. You don\'t know how quiet a place is till it hasn\'t got an orchard humming.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'You\'ll have trees again. Brambleford\'s good ground.', r: 'It is. Hobb won\'t sell me any. Yet. I\'m working on him.', tr: 1 },
        { tone: 'curious', l: 'What happened to the orchard?', r: 'Blight. Grey rot in the roots, three springs running. The leaves came out and then gave up. Like they\'d had bad news.', tr: 1 },
        { tone: 'joke', l: 'Hobb\'s sheep hum, if you\'re lonely.', r: '~He laughs, a big one. “They don\'t hum. They complain in tune.”', tr: 1 },
        { tone: 'pious', l: 'Veyra keeps the trees. She\'ll keep yours.', r: 'Hope so. I left her an apple on the way out. The last good one.', tr: 1 },
      ] } },
    { t: 'Tired. Hobb\'s had me up nights watching for the big wolf. Sat in a ditch with a pitchfork and argued with myself. Won.', if: '!boss:greymaw' },
    { t: 'Quiet. The whole town\'s quiet. Even the sheep. Folk loved your priest. You can tell by how a place sounds.', if: 'found' },
  ],
  self: [
    'Rowan Pell. Third of four. Thornbury born, tenant\'s son, tenant myself till spring. Now I\'m Hobb\'s spare pair of hands.',
    'Ivy says I\'m as subtle as a cart. She married me anyway. I asked four times. Thornbury girls make you work.',
    { t: 'Folk keep asking if I\'m kin to the Coopers. Their great-grandad was Old Pell, apparently. I doubt it. Pell\'s as common as mud in Thornbury. The twins have decided I\'m their uncle, though.', min: 1, if: 'here:tam' },
    { t: 'I want a roof. That\'s all. Four walls and a door and Ivy on the same side of it as me. Is that so much, in a valley this size?', min: 2 },
  ],
  workLabel: 'About the farm work',
  work: [
    'Mucking out, mending walls, hauling fleece. Hobb points and I lift. Good arrangement.',
    'Lambing\'s done. Shearing\'s soon. Then I\'ll smell of fleece till harvest. Ivy says I smell of fleece now.',
    { t: 'Hobb told me which wall not to mend. The east one, on the Hales\' side. Eighty years nobody\'s mended it. I said I\'d do it for nothing. He looked at me like I\'d offered to marry his ewe.', min: 1 },
    { t: 'Thornbury reeve turned us off the week the blight showed. Sold the lease within the month. Buyer from up the valley. Paid in silver so new it squeaked. Never came to see the land. Who buys a blighted orchard without looking?', min: 3,
      learn: 'The Thornbury land Rowan Pell rented was sold within a month of the blight to a buyer from up the valley, who paid in new silver and never came to see it.',
      ask: { opts: [
        { tone: 'curious', l: 'Did the reeve say who the buyer was?', r: 'Said it was a council matter. A gentleman with an interest in valley land. Then he shut the door. Reeves like doors.', tr: 1 },
        { tone: 'blunt', l: 'Someone is buying up the valley.', r: '~He chews on that. “Aye. Maybe. Someone with more silver than sense. Or more sense than I\'d like.”', tr: 0 },
        { tone: 'kind', l: 'I\'m sorry. You deserved better from them.', r: 'Water under the bridge. Thornbury bridge, which is better than yours. ~He grins, but it takes a second to arrive.', tr: 1 },
        { tone: 'joke', l: 'Maybe they wanted the blight.', r: 'Ha. Nobody else did. I didn\'t.', tr: 0 },
      ] } },
  ],
  news: [
    'Shearing at Thatchers\' next week. If you hear a scream, it\'s the sheep. Or Hobb.',
    { t: 'Ivy\'s sewing for Maren the weaver. Maren\'s told her off twice and paid her once. Ivy says that\'s high praise.', if: 'here:ivy' },
    { t: 'There\'s a widow from Kettle Cross by the temple with her boy. Burned out. I gave the lad my second-best knife. He held it like the only thing anyone had given him in a month.', if: 'here:mags' },
    { t: 'Everyone\'s buying in the ring today. Hobb sold a ram and bought me a pie. A whole pie. I didn\'t share.', if: 'event:boom' },
    { t: 'Word from Thornbury: blight\'s spread to two more farms. Mum says the reeve\'s gone grey. Good.', min: 2 },
    { t: 'They say you\'ve been down where the tunnels split four ways. Our old ploughman sang about a crossroads under the hill. Never thought it was real.', if: 'junction' },
  ],
  halvard: [
    'Met him once, at Thornbury market. Blessed the whole lambing pen in one go. Sheep went quiet as stones.',
    { t: 'Hobb says he used to bring you round at lambing when you were small, to see the new ones. Says you cried at every lamb. Don\'t worry. So did I, at twenty.', min: 1 },
    { t: 'He\'ll turn up. Men like that don\'t stay lost. They come in at dawn with mud on their boots and a story.', if: '!found' },
    { t: 'I\'m sorry. Truly. I met him the once, but the sheep remembered him. Animals know.', if: 'found' },
  ],
  caves: [
    'Never been down a hole I couldn\'t see the bottom of. Not starting now.',
    { t: 'Hobb\'s dogs won\'t go up the North Road past the watchtower. Lie down and whine. I trust a dog over a reeve, any day.', min: 1 },
    { t: 'Four kingdoms, they say at the Fox. Under our feet. Ivy won\'t think about it. I think about it every time I dig a fencepost.', min: 2 },
    { t: 'You\'ve killed a goblin king? Then I\'m buying you cider. Thornbury cider. Don\'t argue.', if: 'boss:grotsnag' },
  ],
  gods: [
    'Veyra for the trees, Aurel for the bread, and whoever\'s listening for the weather. That\'s Thornbury religion.',
    { t: 'Greta Thatcher ties a feather on the barn door every new moon. She showed me how. I tied one for our old orchard. Felt daft. Felt better.', min: 2 },
    { t: 'I\'ll be at your dawn service when there\'s no lambs to see to. That\'s a promise, not a threat.', min: 1 },
  ],
  gossip: [
    'Hobb and Fenwick Hale don\'t sit together at harvest supper. Eighty years, over a wall. Nobody knows who started it. Both sides know it was the other.',
    { t: 'Fenwick\'s mother lives two doors from mine in Thornbury. She sends word through me that he should marry. I tell him. He calls it like a lot. “What am I bid for this message?”', min: 1 },
    { t: 'Hobb was telling me the enchantress cursed his sheep. Then the wolf turned out to be a wolf. He\'s gone quiet about it. Hobb quiet is a rare thing.', if: 'boss:greymaw' },
    { t: 'Ivy thinks Maren\'s lonely. Maren thinks Ivy talks too much. They\'re both right, which is why it works.', if: 'here:ivy', min: 2 },
    { t: 'The lass at Old Berta\'s is an Ashby. I know the Ashbys. Cider folk, best press in the east valley. Never knew they had kin up here.', if: 'here:linnet' },
  ],
  about: {
    ivy: [
      '~He holds up his own enormous hands. “Ivy. Cleverest hands in Thornbury, and she married these.”',
      { t: 'She sews till the candle\'s gone. For the roof, she says. I tell her the roof can wait. She tells me I can\'t.', min: 2 },
      { t: 'She\'s been off her breakfast. Says it\'s the Fox\'s eggs. Rolf\'s eggs are fine. I\'ve had six.', min: 3 },
    ],
    hobb: [
      'Hobb\'s a good master. Loud. Fair. Thinks a wall is a moral question.',
      { t: 'He talks about his boy Wil like Wil hung the moon. Then tells Wil off to his face. Fathers.', min: 1, if: 'here:wil' },
    ],
    fenwick: ['Fenwick could sell a sheep its own wool back. Good lad. Can\'t sit down.'],
    garrick: ['Garrick feeds me sausage and calls it a public service. I\'m not arguing.'],
    maren: ['Maren looks at my boots like they\'ve insulted her loom. She pays Ivy, though. She can look.'],
    tam: [{ t: 'The Cooper boy climbs me like a tree. I let him. Keeps him off the actual trees.', if: 'here:tam' }],
  },
  extra: {
    roof: { label: 'About the roof', if: 'here:ivy', seq: true, lines: [
      { t: 'Eleven silver in the tin. Twenty buys a year on a cottage. I count it every night. Lark Cooper counted it once and told me I\'d got it wrong. I had.', min: 2 },
      { t: 'Ivy\'s been strange. Quiet at breakfast. Up early. Tamsin keeps giving her a look. Women\'s business, Rolf says, and gives me a look too. Everyone\'s giving looks.', min: 3 },
      { t: '~He sits down hard on a bale. “She told me. A baby. Come the winter.” His face can\'t decide what to do. “I need a roof, Acolyte. I need it before the snow.”', min: 4,
        learn: 'Ivy Pell is expecting a baby in the winter, and Rowan is desperate for a roof before the snow.',
        ask: { opts: [
          { tone: 'kind', l: 'Then the town will help. That\'s what a town is for.', r: '~He wipes his face with a hand like a shovel. “Thornbury never did. Maybe Brambleford\'s different.” He sniffs. “Better bread, anyway.”', tr: 1 },
          { tone: 'pious', l: 'Aurel blesses every hearth. I\'ll bless yours, wherever it is.', r: 'Even if it\'s a barn? ~He laughs, wet. “Ivy\'d like that. Make it a proper one.”', tr: 1 },
          { tone: 'joke', l: 'Congratulations. Now you\'ll hit your head on a cradle too.', r: '~He laughs so loud a sheep bolts. “I will. Every day. And be glad.”', tr: 1 },
          { tone: 'blunt', l: 'Then stop sleeping in a barn and ask the council for a cottage.', r: 'The council. ~His face goes careful. “Last council man I dealt with sold my land out from under me. But aye. Maybe.”', tr: 0 },
        ] } },
    ] },
  },
};
FAMILY.rowan = {
  house: 'Pell', gen: 0,
  since: 'Newcomers. Up from Thornbury this summer, after blight took the orchard the Pells had rented for three generations.',
  from: 'thornbury',
  kin: [
    { rel: 'wife', id: 'ivy', say: 'Ivy. Best thing that ever came out of Thornbury, and Thornbury\'s got cider.' },
    { rel: 'mother', name: 'Bet Pell', from: 'thornbury', note: 'a tenant\'s widow; lives with Rowan\'s elder brother', say: 'Mum\'s in Thornbury with my brother Jem. Sends word every market day. Mostly about my socks.' },
    { rel: 'father', name: 'Huw Pell', dead: 1, from: 'thornbury', note: 'tenant orchardman; died five years ago, before the blight', say: { t: 'Da kept that orchard thirty years. Died before the blight. Some nights I\'m glad he did. That\'s a hard thing to be glad of.', min: 2 } },
    { rel: 'brother', name: 'Jem Pell', from: 'thornbury', note: 'the eldest; hired on at the reeve\'s farm', say: 'Jem\'s the eldest. Hired on with the reeve after we lost the lease. Jem would hire on with a wolf if it paid.' },
    { rel: 'grandfather', name: 'Davin Pell', dead: 1, from: 'thornbury', note: 'first of the family to rent the orchard', say: 'Grandad Davin planted half those trees. Took the blight three springs to kill what he planted in one.' },
  ],
  origin: [
    'Thornbury. A day east, down the valley. Orchards, sheep, a market twice the size of yours and a reeve twice as pleased with himself.',
    'Three generations of Pells rented that orchard. Never owned a stick of it. You don\'t, in Thornbury. You rent from the reeve\'s friends.',
    { t: 'Blight came three springs running. Reeve turned us off the week it showed. We put everything in one cart and came west. Hobb Thatcher needed a back. I\'ve got a big one.',
      learn: 'Rowan and Ivy Pell lost their Thornbury tenancy to blight and came to Brambleford, where Rowan works for Hobb Thatcher.' },
    { t: 'Why Brambleford? Ivy chose. She said, the bread\'s better. I said, the cider\'s worse. She said, then you\'ll drink less.',
      ask: { opts: [
        { tone: 'joke', l: 'She\'s right on both counts.', r: '~He claps you on the back hard enough to rearrange you. “Don\'t tell her. She\'ll be unbearable.”', tr: 1 },
        { tone: 'kind', l: 'I\'m glad you came.', r: 'So am I. Mostly. Ask me again after shearing.', tr: 1 },
        { tone: 'curious', l: 'Did many leave Thornbury after the blight?', r: 'Four families. All tenants. The land went quick. Funny how quick land goes when nobody wants it.', tr: 1 },
        { tone: 'pious', l: 'Aurel guided you here.', r: 'Aurel and a lame cart-horse. Couldn\'t have got much further either way.', tr: 0 },
      ] } },
  ],
  family: [
    { t: 'Four boys, my mum had. Jem, me, and two who didn\'t see a winter. She ties a ribbon on the orchard gate for them every spring. Somebody else\'s gate now.', min: 2 },
    'Ivy\'s mother is Dot Marlow, the Thornbury seamstress. Terrifying woman. Measured me for my wedding shirt and told me where I\'d gone wrong in life.',
    { t: 'Pells and Marlows have been marrying since before the reeve\'s grandad. Ivy\'s my second cousin twice over, or third once. Nobody\'s sure. Thornbury, see.', min: 1 },
  ],
};
GIFT_TASTES.rowan = { love: ['apple', 'wheat', 'meat'], like: ['milk', 'wool', 'wood', 'egg', 'cat:tool', 'cat:food'], dislike: ['cat:jewelry', 'cat:crystal', 'redcap'] };
GIFT_LINES.rowan = {
  love: [
    '~He turns the {item} over in a hand that makes it look small. “Now that\'s proper. That\'s Thornbury proper. Thank you.”',
    'For me? Ha! I\'ll not tell Ivy, she\'ll make me share it.',
  ],
  like: [
    'That\'s kind. Good honest stuff, that.',
    '~He tucks the {item} into his shirt, where it disappears entirely. “Much obliged.”',
  ],
  neutral: [
    'Ah. Well. Thank you. I\'ll find a use. Or Hobb will.',
    '~He looks at the {item}, then at you. “Is it for eating?” Apparently not. “Right.”',
  ],
  dislike: [
    'That\'s... very fancy. I\'d only drop it in the muck.',
    '~He holds the {item} at arm\'s length like a ewe that might kick. “Ivy might want it. Might.”',
  ],
  special: {
    apple: '~He holds the apple up to the light and smells it, eyes shut. When he opens them they\'re wet. “Good tree, that came off. Good tree.”',
    redcap: '~He goes grey. “That\'s what it looked like. In the roots. Grey and red.” He hands it back. “Burn it. Please.”',
  },
};
ARRIVE_NEWS.rowan = 'A cart from Thornbury: Rowan Pell, blighted off his tenancy, has hired on at the Thatchers\' farm.';

// =====================================================================
// Ivy Pell: quick, warm, needle-sharp seamstress; teases her husband; sews for Maren.
// =====================================================================
Object.assign(PEOPLE, { ivy: {
  name: 'Ivy Pell', role: 'seamstress, Rowan\'s wife; works for Maren', spr: 'fam_ivy', where: 'the window seat of the Sleeping Fox, with a lapful of linen',
  look: 'A neat, dark-haired young woman with pins in her mouth and a measuring tape round her neck. Her hands never stop, even while she\'s looking at you.',
  story: [
    [0, 'She came from Thornbury with her husband Rowan after the blight. She sews for Maren Quill, and mends the Fox\'s linen for her room.'],
    [2, 'She buys dyed thread from Ilse on the quiet, and has not told Maren, who would rather go grey than use a river colour.'],
    [4, 'She is expecting a baby in the winter. Tamsin guessed before she did.'],
  ],
  ties: { rowan: 'Her husband, the largest man in two towns.', maren: 'Her employer. Maren is impossible and Ivy is fond of her.', ilse: 'Buys Ilse\'s river thread on the quiet.', rolf: 'Mends the Fox\'s sheets for her room. Rolf says they\'ve never been so tidy.', tamsin: 'Tamsin knows her secret.' },
  talk: ['Hold still. No, not you. The hem.', 'Maren says my stitches are acceptable. I nearly fainted.', 'Rowan\'s torn his shirt on a beam again. That\'s four this month.'],
  halvard: '“I never met him. But Maren showed me the altar cloth she made for him and said he paid double. Maren doesn\'t tell anyone anything. She told me that.”',
} });
NEW_FIGS.ivy = { build: 'slim', skin: 'eab38b', hair: 'bun', hairColor: '2a1a10', shirt: '8a3a5a', torso: 'dress', apron: 1, necklace: 1, jaw: 'soft', lashes: 1, blush: 1, held: 'basket' };
DIALOGUE.ivy = {
  intro: [
    '~A neat dark-haired young woman sits in the Fox\'s window with a lapful of linen and three pins in her mouth. She takes them out to smile at you.',
    'You\'ll be the Acolyte. I\'m Ivy. Pell. The large man in Hobb\'s barn is mine. I apologise for him in advance.',
  ],
  greet: [
    'Acolyte. Mind the thread, it\'s everywhere.',
    '~She bites off a thread and nods at you around it.',
    { t: 'Morning. Best light for close work. Maren\'s already been in to check I\'m awake.', if: 'phase:Dawn,Morning' },
    { t: 'Evening. Last candle. Then Rolf shouts that I\'m burning his profits.', if: 'night' },
    { t: '{n}! Sit. Hold this. You\'re a spool now.', min: 2 },
    { t: '~She has stopped sewing. Her hands lie still in her lap, which you have never seen.', if: 'found' },
    { t: 'Fever in the lanes again. I\'m keeping my window shut and my needle busy.', if: 'event:fever' },
    { t: 'Have you seen the caravan silks? I went and touched them and then had to sit down.', if: 'event:caravan' },
  ],
  bye: [
    'Go on. Mind your hems.',
    'Tell Rowan to wear the blue shirt. The other one\'s more hole than shirt.',
    { t: 'Aurel keep you, {n}. And bring me that left cuff. It\'s frayed.', min: 2 },
    '~She is sewing again before you\'ve turned round.',
  ],
  how: [
    'Busy. That\'s how I like it. Idle hands make Maren cross.',
    { t: 'Fine. Tired. Rowan\'s in a barn and I\'m above a taproom. We say goodnight across the square like a pair of owls.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'You\'ll have your own door soon. I\'m sure of it.', r: 'From your mouth to Aurel\'s ears. And then to the council\'s, which are smaller.', tr: 1 },
        { tone: 'joke', l: 'Owls are very loyal birds.', r: '~She laughs. “And they sleep all day and smell of mice. Yes. That\'s Rowan.”', tr: 1 },
        { tone: 'curious', l: 'Why not take a room together at the Fox?', r: 'Because then we\'d never save a copper. Rolf charges by the elbow, and Rowan\'s got big elbows.', tr: 1 },
        { tone: 'blunt', l: 'It\'s an odd way to be married.', r: '~Her needle stops. “It\'s a poor way. Not an odd one.” It starts again.', tr: -1 },
      ] } },
    { t: 'Queasy in the mornings. It\'s the Fox\'s eggs. I\'ve told Rowan it\'s the eggs.', min: 3 },
    { t: 'Sad, for you. I never knew him. I know you a little, and that\'s enough.', if: 'found' },
  ],
  self: [
    'Ivy Pell, born Marlow. My mother sews in Thornbury and her mother sewed before her. I could hem before I could read.',
    'I married Rowan because he asked four times, and each time he\'d mended something of mine without being asked. You marry a man like that.',
    { t: 'I\'m good. I can say it here; nobody knows me. In Thornbury I was Dot Marlow\'s girl. Here I\'m the woman who fixed Maren Quill\'s selvage. That\'s worth a move.', min: 2 },
  ],
  workLabel: 'About sewing',
  work: [
    'Hems, seams, mending, shirts. Maren weaves the cloth and I make it into things people can wear. She hates that part. I love it.',
    'Rolf\'s sheets were held together with prayer and soup stains. They\'re held together with thread now.',
    { t: '~She lowers her voice and nods at a skein of deep blue thread. “River dye. From Ilse. Don\'t tell Maren. She\'d rather go grey than use a Lowmere colour. But look at it.”', min: 2,
      learn: 'Ivy Pell buys dyed thread from Ilse on the quiet, and has not told Maren.',
      ask: { opts: [
        { tone: 'kind', l: 'It\'s beautiful. Maren might like it more than she\'d say.', r: 'That\'s Maren all over. Likes it more than she\'d say. Likes everyone more than she\'d say.', tr: 1 },
        { tone: 'blunt', l: 'You should tell her.', r: '~She sighs. “I should. On a day she\'s had cake.”', tr: 0 },
        { tone: 'joke', l: 'Your secret\'s safe. Maren never talks to me anyway.', r: 'Maren never talks to anyone. She talks to looms. I\'ve been promoted to loom.', tr: 1 },
        { tone: 'curious', l: 'Why do they dislike each other so much?', r: 'Because they\'re the same woman. Proud, stubborn, frightened for their trade. If they ever sat down together they\'d run the valley.', tr: 1 },
      ] } },
    { t: 'Maren bought Ilse\'s wool! I nearly swallowed my thimble. Now I\'m sewing river blue into a Quill weave in broad daylight and nobody\'s died.', if: 'flag:maren_ilse_peace' },
  ],
  news: [
    'Rolf says the Fox has a new barrel of brown. Rolf says that every week. The barrel is always new and always brown.',
    { t: 'Rolf\'s niece Bess is a marvel. Carries six tankards and a grudge. We\'re friends.', if: 'here:bess' },
    { t: 'A widow\'s come up from Kettle Cross with her boy. I\'m making the lad a jacket out of Maren\'s offcuts. Maren pretended not to see me take them.', if: 'here:mags' },
    { t: 'Old Berta has kin come! Linnet Ashby, from Thornbury. I bought her honey at Thornbury market for years. Never knew she had a great-aunt alive. Neither did she, I think.', if: 'here:linnet' },
    { t: 'Raids on the trade road again. Ilse goes white when it\'s mentioned. So I don\'t mention it.', if: 'event:raids' },
    { t: 'Feast day! I\'ve sewn three new bodices for it and none of them are mine.', if: 'event:feast' },
  ],
  halvard: [
    'I never met him. Maren showed me his altar cloth, and said he paid double. That\'s more than Maren says about anyone.',
    { t: 'Rolf talks about him late, when the taproom\'s empty. Boys stealing buns. A priest who could drink a miller under the table. Rolf\'s eyes go wet and he blames the pipe smoke.', min: 2 },
    { t: 'He\'ll come back. I\'ve decided. Pippa brought me his spare robe to mend. I\'m giving it a new hem. He\'ll want it smart.', if: '!found', min: 1 },
    { t: '~She folds a brown robe in her lap, very carefully. “Pippa brought me this to mend. Before. I finished it.” She swallows. “Would you take it? For the temple?”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'I\'ll keep it. Thank you, Ivy.', r: '~She hands it over. The hem is perfect. You can tell she did it twice.', tr: 1 },
        { tone: 'pious', l: 'We\'ll lay it on the altar at dawn, for Aurel to see.', r: 'Yes. That\'s right. Then Aurel can see the hem.', tr: 1 },
        { tone: 'blunt', l: 'Give it to someone cold. He would have.', r: '~She thinks, then nods slowly. “He would, wouldn\'t he. Then someone warm will wear it. I\'ll see to it.”', tr: 0 },
      ] } },
  ],
  caves: [
    'I don\'t think about the caves. Rowan does. He digs a fencepost and stops and listens. I tell him the ground isn\'t going to answer.',
    { t: 'Spider silk from the deep caves? ~She holds out both hands. “If you ever find any, bring it to me. No. To Maren. No. To me first.”', min: 1 },
    { t: 'Ilse told me once, after Rolf\'s strong brown, that the goblins took a boy because he could read. Who takes a boy for reading? What do they want read?', min: 2 },
    { t: 'You\'ve been where it splits four ways. Rowan\'s not slept since. He keeps saying “under our feet, Ivy”. I put a pillow on his head.', if: 'junction' },
  ],
  gods: [
    'Aurel for the light to sew by. That\'s all I ask of him, and he gives it every morning.',
    { t: 'My mother kept a needle stuck in a blue stone for Nemora, to remember every stitch. I brought it. It\'s on the windowsill at the Fox. Rolf thinks it\'s a pincushion.', min: 2 },
    { t: '~Her hand rests on her middle without seeming to notice. “I say more prayers lately. Little ones. Aurel, keep the hearth. Any hearth. Even a borrowed one.”', min: 3 },
  ],
  gossip: [
    'Maren tells me she has no brother. Then she asks if the clerk looks thin.',
    { t: 'The councilman\'s wife came in for a hem. Grey silk. She held so still while I pinned it I thought she\'d stopped breathing. Like someone used to keeping still.', min: 2 },
    { t: 'Rolf leaves a bottle out one night in autumn and won\'t say who for. I sew late. I\'ve seen who drinks it. I\'m not saying either.', min: 3 },
    { t: 'Mags Tenney won\'t sit near the hearth at the Fox. Takes the bench by the door. Always the door.', if: 'here:mags', min: 1 },
  ],
  about: {
    rowan: [
      'Rowan. My husband. Big, slow, kind. Not in that order.',
      { t: 'He hit his head on every beam in the Fox the first night. Rolf says he\'ll pad them and charge Rowan for the padding.', min: 1 },
      { t: 'I told him about the baby. He sat down on a bale and didn\'t speak for an hour. Then he went and mended the barn door. That\'s Rowan for I love you.', min: 4,
        learn: 'Ivy Pell is expecting a baby in the winter, and has told Rowan.' },
    ],
    maren: [
      'Maren Quill is impossible and I adore her. Don\'t tell her either half.',
      { t: 'She ate lunch with me yesterday. First time. Didn\'t say a word. Pushed half her bread across. That\'s practically a speech, from Maren.', min: 2 },
    ],
    ilse: ['Ilse sells good thread too cheap. Maren hates her for it. I just buy it.'],
    rolf: ['Rolf gives me my room for mending his sheets and calls it robbery. Whose, he won\'t say.'],
    tamsin: [{ t: 'Tamsin took one look at me and handed me a tea for the mornings. Didn\'t ask. Didn\'t say. That woman sees through walls.', min: 3 }],
    lark: [{ t: 'Lark Cooper counted my pins. Two hundred and eleven. Then told me one was bent. It was.', if: 'here:lark' }],
  },
};
FAMILY.ivy = {
  house: 'Pell', gen: 0,
  since: 'Newcomer. A Thornbury seamstress\'s daughter, Marlow born, married to Rowan Pell and come west with him after the blight.',
  from: 'thornbury',
  kin: [
    { rel: 'husband', id: 'rowan', say: 'Rowan. Mind his head. He won\'t.' },
    { rel: 'mother', name: 'Dot Marlow', from: 'thornbury', note: 'seamstress in Thornbury', say: 'Mum sews in Thornbury. Fastest needle in the east valley, and a tongue to match.' },
    { rel: 'father', name: 'Ab Marlow', dead: 1, from: 'thornbury', note: 'a drover; lung fever when she was twelve', say: { t: 'Da drove sheep to Weyford market. Lung fever took him when I was twelve. Mum sewed his shroud herself and wouldn\'t let anyone help.', min: 2 } },
    { rel: 'sister', name: 'Bridie Marlow', from: 'thornbury', note: 'younger sister, apprenticed to their mother', say: 'Bridie\'s sixteen and already better at buttonholes than me. I told her so. I regret it.' },
    { rel: 'grandmother', name: 'Old Gran Marlow', dead: 1, from: 'thornbury', note: 'taught three generations to sew', say: 'Gran Marlow taught me on a sampler that said WASTE NOT. I wasted most of it. She kept it anyway.' },
  ],
  origin: [
    'Thornbury. Born above Mum\'s shop, in a room so full of cloth you couldn\'t hear the rain.',
    { t: 'Rowan\'s family rented the orchard. Mine sewed for the reeve\'s wife. So I knew exactly what the reeve\'s wife thought of orchard tenants. I married one anyway.', min: 1 },
    { t: 'Rowan wanted Weyford, for the mill work. I wanted here. Maren Quill\'s weave sells at Thornbury market for three times anyone else\'s. I wanted to see who made it.',
      learn: 'Ivy Pell chose Brambleford because she admired Maren Quill\'s weaving, which sells at Thornbury market.' },
    { t: 'Do you know where you\'re from, Acolyte? Rolf says you came as a baby, in Father Halvard\'s arms.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'From here. From the temple.', r: 'That\'s a good answer. A seamstress\'s answer. You start where the cloth starts.', tr: 1 },
        { tone: 'curious', l: 'What else does Rolf say?', r: 'Not much, for Rolf. That Halvard came home from the north different. Then Rolf finds something to polish.', tr: 1 },
        { tone: 'blunt', l: 'I\'d rather not talk about it.', r: '~She nods and bends over her work. “Fair. I\'m nosy. Mum says it\'s the needle. Always poking.”', tr: 0 },
        { tone: 'joke', l: 'Rolf says a lot of things.', r: '~She laughs. “He said last night\'s stew had fish in. It had a rumour of fish.”', tr: 1 },
      ] } },
  ],
  family: [
    'The Marlow women sew. The Marlow men marry women who sew and then wear holes in everything. It\'s a system.',
    { t: 'Mum didn\'t want me marrying Rowan. Said a tenant\'s boy would keep me poor. She was right. She made my dress anyway, and cried on every seam.', min: 2 },
    { t: 'If it\'s a girl, Gran\'s sampler goes to her. If it\'s a boy, he gets Rowan\'s head and I get a padded doorframe.', min: 4 },
  ],
};
GIFT_TASTES.ivy = { love: ['silk', 'wool'], like: ['feather', 'moonpetal', 'egg', 'apple', 'milk'], dislike: ['gel', 'bone', 'meat', 'caveeel'] };
GIFT_LINES.ivy = {
  love: [
    '~She runs the {item} between finger and thumb, and her whole face changes. “Oh. Oh, I know exactly what this wants to be.”',
    'You can\'t give me this. I\'m taking it. Don\'t tell Maren. No, do tell Maren. I want to see her face.',
  ],
  like: [
    'That\'s lovely. Thank you. I\'ll find it a home.',
    '~She tucks the {item} into her sewing basket between two spools. “There. Safe.”',
  ],
  neutral: [
    'Thank you. ~She looks at the {item}, then at her needle, as if wondering whether one could be sewn to the other.',
    'That\'s kind. Rowan will want to know what it is. So do I.',
  ],
  dislike: [
    '~She goes slightly green. “Could you... not, just now. My stomach\'s been delicate.”',
    'Thank you. Truly. Could you hold it further away while you say you\'re welcome?',
  ],
  special: {
    silk: '~She holds the spider silk to the window and goes absolutely still. “Finer than anything on the river. Finer than anything in Thornbury.” A whisper. “I\'ll make a christening shawl. Don\'t ask for whom.”',
    meat: '~She turns her face away, swallowing hard. “Sorry. Sorry. It\'s the eggs. It\'s been the eggs all week.”',
  },
};
ARRIVE_NEWS.ivy = 'With the Thornbury cart came Ivy Pell, a seamstress: she has a room at the Sleeping Fox and work at Maren Quill\'s loom.';

// =====================================================================
// Mags Tenney: widow carter from Kettle Cross; gravel-voiced, blunt, watchful, flinches at fire.
// =====================================================================
Object.assign(PEOPLE, { mags: {
  name: 'Mags Tenney', role: 'widow carter from Kettle Cross', spr: 'fam_mags', where: 'the temple step, with her back to the wall',
  look: 'A broad, weathered woman in a carter\'s coat with soot ground into her knuckles that no washing has got out. She sits where she can see the road, and keeps an axe within reach.',
  story: [
    [0, 'She ran a carting yard at Kettle Cross with three wagons and six oxen. The goblin raids burned the yard, the wagons and the barn with the oxen in it.'],
    [2, 'Her husband Abner died three winters ago, under a wagon whose brake failed. She ran the yard alone after, and ran it well, until the night of the fire.'],
    [4, 'The night of the raid she hid Davy in the dry well and stood over it with a lamp and an axe. At the edge of the firelight a hooded rider sat his horse and watched, and the goblins went round him like water round a stone.'],
  ],
  ties: { davy: 'Her son, eight, the only thing she saved.', ilse: 'Knew Ilse\'s caravan from Kettle Cross. They sit together and don\'t talk about the road.', bran: 'Bran is making iron tyres for a cart she hasn\'t got, and calls it credit.', rolf: 'Rolf feeds her and Davy and won\'t take a copper, which she resents.', odessa: 'She knew Teo Vell on the trade road.' },
  talk: ['A wagon\'s a promise with wheels. Mind the wheels.', 'Don\'t stand behind an ox, a horse, or a councilman.', 'I\'m not staying. I\'m stopping. There\'s a difference.'],
  halvard: '“Never met him. But his temple took us in with no questions, and the little girl who lights his lamps brought Davy a blanket. That\'s a priest\'s work done without the priest. He taught them well.”',
} });
NEW_FIGS.mags = { build: 'stout', skin: 'c48862', hat: 'hood', hatColor: '6a5a4a', hair: 'braid', hairColor: '8a8a8a', shirt: '8a6a4a', torso: 'coat', coatColor: '5a4a3a', pants: '3a3428', boots: '2a2018', gloves: '5a3a20', wrinkles: 1, jaw: 'soft', heavyBrow: 1, held: 'staff' };
DIALOGUE.mags = {
  intro: [
    '~A broad, weathered woman sits on the temple step with her back to the wall and her eyes on the road. She looks you over the way a carter looks over an axle.',
    'You\'re the priest\'s lad. Thank you for the roof. I\'ll pay it back. Don\'t know how yet. I will.',
  ],
  greet: [
    'Acolyte.',
    '~She nods without taking her eyes off the road.',
    { t: 'Busy? Good. I hauled three loads on Hobb\'s cart today. Felt like a person.', min: 1 },
    { t: 'Up early. Carter\'s habit. Oxen don\'t lie in. Even when there aren\'t any oxen.', if: 'phase:Dawn,Morning' },
    { t: '~She is sitting up by the temple door in the dark, an axe across her knees. She lowers it when she sees it\'s you.', if: 'night' },
    { t: '{n}. Sit. Not there. There. Where I can see the road past you.', min: 2 },
    { t: '~Her knuckles whiten on the axe handle. “Drovers say they\'re on the trade road again. Where\'s Davy? Have you seen Davy?”', if: 'event:raids' },
    { t: 'They say you killed the goblin king. ~She looks at you a long time. “Good.”', if: 'boss:grotsnag' },
    { t: '~She stands when you come, which she has never done, and puts a rough hand on your arm.', if: 'found' },
  ],
  bye: [
    'Go on.',
    'Watch the road.',
    { t: 'Come back in one piece. Davy counts on it. So do I, rot it.', min: 3 },
    '~She lifts two fingers off the axe handle.',
  ],
  how: [
    'Alive. Davy\'s alive. That\'s the whole tally.',
    { t: 'Don\'t sleep. Not properly. Every cart on the lane at night, I\'m up with the axe. Rolf\'s barrel delivery nearly lost an ear.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'You\'re safe here. I\'ll keep the temple lamps lit all night.', r: '~She looks at the lamps, and something in her shoulders comes down an inch. “Lamps. Aye. Don\'t tell anyone it helps.”', tr: 1 },
        { tone: 'blunt', l: 'Nothing\'s coming this far. Rest, or you\'ll fall over.', r: 'That\'s what we said at Kettle Cross. But. Aye. I\'ll try.', tr: 1 },
        { tone: 'pious', l: 'Aurel watches over the temple. Sleep under his roof.', r: '~Her mouth twists. “Left a coin at the waystone thirty years. Didn\'t stop the fire.” A pause. “No offence to your god. He\'s got a good roof.”', tr: -1 },
        { tone: 'joke', l: 'Rolf can spare an ear. He\'s got two.', r: '~A bark of a laugh she clearly didn\'t expect. “That he has.”', tr: 1 },
      ] } },
    { t: 'Bad day. Someone burned leaves in the square. I smelled it and I was back in the yard. Took an hour to find my hands again.', min: 2 },
    { t: 'You\'ve a roof and a lamp and a town that loves you. Hold on to them. They burn easy.', if: 'found' },
  ],
  self: [
    'Mags Tenney. Carter. Kettle Cross, twenty-two years. Three wagons, six oxen, one son. Now one son.',
    'Married Abner Tenney because he could back a loaded wagon through a gate with an inch either side. That\'s a man who knows himself.',
    { t: 'My da drove mules on the south road. I was born at a waystation and I\'ll likely die at one. This one\'s got a temple. That\'s a step up.', min: 1 },
    { t: 'Abner died three winters back. Brake gave on the hill. I ran the yard alone after. Ran it better, some said. Not to my face.', min: 2 },
  ],
  workLabel: 'About carting',
  work: [
    'Haul what\'s paid, where it\'s paid, when it\'s paid. Grain up, cloth down, salt both ways. Twenty-two years.',
    'That cloth woman\'s axle. Ilse\'s. It\'s oak. Should be ash. Oak\'s strong but it won\'t give, and a road wants things that give. Tell her.',
    { t: 'Bran says he\'ll make me iron tyres for a cart I haven\'t got. On credit. I said I don\'t take charity. He said it isn\'t charity, it\'s a down payment on gossip. Daft man. Good man.', min: 1 },
    { t: 'The new smith, Oren. Weyford man. Knows axles. We argued about grease for an hour. Best hour since the fire.', if: 'here:oren' },
    { t: 'Road\'ll be open again, with the goblin king gone. I could haul for half the valley. If I had a wagon. If I had oxen. If.', if: 'boss:grotsnag' },
  ],
  news: [
    'Road\'s quiet. Nobody\'s hauling south. That means nobody\'s eating in the north come winter.',
    { t: 'They hit the trade road again, the drovers say. Two wagons. Nobody dead this time. This time.', if: 'event:raids' },
    { t: 'Hobb lends me his cart for market days. I haul for the Fox, the bakery, anyone. I\'m slower than I was. The cart\'s slower than me.', min: 1 },
    { t: 'Caravan\'s in. I walked down and looked at the wagons. Just looked. Wheels and axles. Like visiting family.', if: 'event:caravan' },
    { t: 'They say at the Fox you\'ve been where the tunnels cross. Under the hills. That\'s where they come up from, isn\'t it. The ones that burned us.', if: 'junction' },
    { t: 'Ilse came and sat by me. Didn\'t say much. Neither did I. We both know that road.', min: 2 },
  ],
  halvard: [
    'Never met him. His temple took us in, no questions. That\'s his work, done without him.',
    { t: 'The Tolly girl lit a lamp for Davy the first night. Said Father Halvard always lit one for strangers. Davy slept with his eyes on it. First full night since the fire.', min: 1 },
    { t: 'Folk here talk about him like he\'s just gone up the road. I know that voice. I used it for Abner for a month.', if: '!found', min: 2 },
    { t: '~She takes your hand in both of hers, which are hard as harness. “I know. You keep walking. There\'s nothing else. You keep walking and you get the boy fed.”', if: 'found' },
  ],
  caves: [
    'Goblins came up out of the hills. That\'s all the caves are to me.',
    { t: 'Goblins don\'t raid for cloth. What would they want with bolts of Lowmere blue? They took silver and they took people. Somebody wanted both. Somebody\'s paying.', min: 2 },
    { t: '~She keeps her voice low. “The night of the fire there was a rider at the edge of the light. Hood up. Dark cloak. Sat his horse like a man watching a market. The goblins went round him like water round a stone.” She spits. “Nobody believes me. Davy saw him too.”', min: 4,
      learn: 'Mags Tenney saw a hooded rider watching the goblin raid on Kettle Cross. The goblins never touched him.',
      ask: { opts: [
        { tone: 'curious', l: 'Which way did he ride, after?', r: 'North. Up the drove road, toward the hills. Not south with the loot. North, on his own.', tr: 1 },
        { tone: 'kind', l: 'I believe you, Mags.', r: '~She looks at you hard, then away. “Well. That\'s one.”', tr: 1 },
        { tone: 'blunt', l: 'Could you be wrong? It was dark, and there was fire.', r: 'I\'ve read men by firelight at waystations for twenty years. I wasn\'t wrong.', tr: -1 },
        { tone: 'pious', l: 'The gods see what men hide in the dark.', r: 'Then they can come down and tell the reeve. I\'m done waiting on gods.', tr: 0 },
      ] } },
    { t: 'Goblin king\'s dead, they say. ~Her jaw works. “Then whoever was paying him will have to find another dog.”', if: 'boss:grotsnag', min: 2 },
  ],
  gods: [
    'Thirty years I left a coin at the Kettle Cross waystone. For Korrum, for the road. The waystone\'s still there. The yard isn\'t.',
    { t: 'Davy waves at the temple lamps. I let him. Somebody in the family should stay on speaking terms with the gods.', min: 1 },
    { t: 'I sat at the back of your dawn service. Don\'t make anything of it. It was warm.', min: 3 },
  ],
  gossip: [
    'Folk here are kind. Kind and nosy. Same thing, in a village.',
    { t: 'Councilman came by the temple to look at us. Very civil. Asked where we were from, who else got out, and did we see anything. Asked it three ways. I\'ve met customs men less curious.', min: 2,
      learn: 'Councilman Voss questioned Mags Tenney closely about the Kettle Cross raid and what she saw.' },
    { t: 'Ilse\'s caravan came through Kettle Cross the season before the raids. Corvanne lad with them, guarding. Read the waybills out loud for carters who couldn\'t. Never charged.', min: 2 },
    { t: 'Rowan Pell gave Davy a knife. I nearly bit his head off. Then I saw Davy\'s face. Let it go. Big soft lump, that Rowan.', if: 'here:rowan' },
    { t: 'That Linnet girl at Old Berta\'s asked me about the roads north. I told her the old track\'s shut past the watchtower, has been eighteen years. She went pale and didn\'t ask more.', if: 'here:linnet', min: 1 },
  ],
  about: {
    davy: [
      'Davy. My boy. Eight. Braver than he should have to be.',
      { t: 'He doesn\'t cry. Hasn\'t since the fire. Just goes still, like a hare. I\'d give the yard twice over to hear him bawl about nothing.', min: 3,
        ask: { opts: [
          { tone: 'kind', l: 'Let him guard the temple. It gives him something to hold.', r: '~She watches him thump his stick on the step. “Aye. Something to hold. That\'s what I\'ve got the axe for.”', tr: 1 },
          { tone: 'blunt', l: 'He needs to talk about it, Mags. So do you.', r: '~Her jaw sets. Then she lets out a breath. “You first, then. Some night. Not tonight.”', tr: 0 },
          { tone: 'pious', l: 'Bring him to the dawn service. Let him see the light come.', r: 'He waves at the lamps already. ~A pause. “Maybe. If I sit by the door.”', tr: 1 },
          { tone: 'joke', l: 'Give him to Tam Cooper for a day. He\'ll bawl about something.', r: '~A short, surprised laugh. “That boy would make a stone bawl.”', tr: 1 },
        ] } },
    ],
    odessa: [
      { t: '~She goes quiet. “The jeweller. I knew her brother. Teo. Read the waybills for the carters. Taken on our stretch of road.”', min: 1,
        learn: 'Mags Tenney knew Teo Vell at Kettle Cross; he read waybills aloud for carters who couldn\'t read.' },
      { t: 'I told her about the waybills. She laughed and cried at once. Said that was him. That was exactly him.', min: 3 },
    ],
    ilse: [
      'Ilse. River woman. Knows a road. Doesn\'t know axles. I\'ll teach her.',
      { t: 'She saw the raid on her caravan. I saw mine. We don\'t compare. We sit.', min: 2 },
    ],
    bran: ['Bran\'s a good smith and a bad liar. Says the tyres are on credit. There\'s no credit. There\'s just Bran.'],
    rolf: ['Rolf won\'t take a copper. So I haul his barrels for nothing. Now he\'s ordering more barrels to need hauling. War of attrition.'],
    voss: [{ t: 'Civil man. Asks a lot of questions, for a man who answers none.', min: 1 }],
    pippa: ['The Tolly girl lit a lamp for Davy, first night. I\'ll owe that child till I die.'],
  },
};
FAMILY.mags = {
  house: 'Tenney', gen: 0,
  since: 'Newcomer, and says she isn\'t staying. A carter\'s widow from Kettle Cross, burned out by the goblin raids, sheltering by the temple with her boy.',
  from: 'kettlecross',
  kin: [
    { rel: 'son', id: 'davy', say: 'Davy. All I got out. All I needed to.' },
    { rel: 'husband', name: 'Abner Tenney', dead: 1, from: 'kettlecross', note: 'carter; killed when a wagon brake failed three winters ago', say: { t: 'Abner. Could thread a wagon through a needle. Brake gave on the Kettle hill. I sold the wagon that killed him and bought two oxen with it. Felt right.', min: 2 } },
    { rel: 'father-in-law', name: 'Ruck Tenney', dead: 1, from: 'kettlecross', note: 'started the carting yard', say: 'Old Ruck started the yard with one cart and a temper. Forty years it stood. Lasted one night against goblins.' },
    { rel: 'sister', name: 'Ros Pike', from: 'weyford', note: 'married a Weyford tanner', say: 'My sister Ros married a tanner in Weyford. Says come. I would, if I could stand the smell. Or her husband.' },
    { rel: 'father', name: 'Jakob Hurd', dead: 1, note: 'a muleteer on the south road', say: 'My da drove mules on the south road. Never had a house. Said a roof\'s just a lid on your worries.' },
  ],
  origin: [
    'Kettle Cross. Two days south-west. A crossroads, a waystation, a smithy, four carting yards and a well. Three yards now.',
    'Born on the road, married a yard. Twenty-two years at Kettle Cross. Long enough to call it home. Short enough they still called me the muleteer\'s girl.',
    { t: 'The raids came up the trade road all summer. Wagons first, then the waystation. Then one night, us. They came for the strongbox and the oxen and anyone young enough to carry. We lost the barn. I didn\'t lose Davy.', min: 1,
      learn: 'The goblin raiders at Kettle Cross took silver, oxen, and young people strong enough to carry.' },
    { t: 'Why Brambleford? A drover at the Weyford bridge said there was a temple here that takes folk in. Didn\'t think they still made those.',
      ask: { opts: [
        { tone: 'kind', l: 'It does. For as long as you need.', r: 'We\'ll see how long that is. ~But she sits back against the temple wall a little easier.', tr: 1 },
        { tone: 'pious', l: 'Aurel\'s lamp is lit for every stranger.', r: 'So the girl said. Pippa. Lit one for Davy. I\'ll give your god that much. He\'s got good help.', tr: 1 },
        { tone: 'curious', l: 'What else did the drover say?', r: 'Ask for the priest, he said. ~She looks at you. “He didn\'t say the priest was gone.”', tr: 1 },
        { tone: 'blunt', l: 'There\'s no priest now. Just me.', r: 'You\'ll do. You haven\'t asked me for anything yet. That\'s rare.', tr: 1 },
      ] } },
  ],
  family: [
    'Tenneys carted. Hurds drove mules. Davy\'ll do one or the other, or something with a roof. I\'d like a roof for him.',
    { t: 'Ros wants me in Weyford. She\'s got a spare room and a tanner and opinions. I\'d rather sleep by your temple.', min: 1 },
    { t: 'Abner wanted a girl. Said Davy would need a sister to tell him off. ~She looks at the boy on the step. “He\'s got me.”', min: 3 },
  ],
};
GIFT_TASTES.mags = { love: ['wood', 'meat'], like: ['iron', 'hide', 'oil', 'apple', 'cat:food', 'cat:tool'], dislike: ['torch', 'cat:jewelry', 'cat:crystal'] };
GIFT_LINES.mags = {
  love: [
    '~She weighs the {item} in one hand and something in her face unlocks. “Now that\'s useful. That\'s worth a load. Thank you, lad.”',
    'I don\'t take charity. ~She takes it. “This isn\'t charity. This is good sense.”',
  ],
  like: [
    'That\'ll do. That\'ll do nicely.',
    '~She stows the {item} in her coat without comment. Later you see her showing it to Davy.',
  ],
  neutral: [
    'Hm. Thank you. Can\'t haul it, can\'t eat it, can\'t burn it. I\'ll find something.',
    '~She looks at the {item}, then at you. “Folk give odd things in this town.”',
  ],
  dislike: [
    'What would I do with that? Wear it on the cart? Put it away.',
    '~She doesn\'t take it. “No. Thank you. No.”',
  ],
  special: {
    wood: '~She runs her thumb along the grain. “Ash. Straight, no knots. That\'s an axle.” She looks up, and for a moment she looks twenty years younger. “That\'s the start of a wagon.”',
    torch: '~She is on her feet, the axe in her hand, before she knows it. Then she sees it\'s only you. “Put it out,” she says, very quietly. “Please. Put it out.”',
  },
};
ARRIVE_NEWS.mags = 'A drover\'s cart from the south road: Mags Tenney, a carter burned out at Kettle Cross by the raids, is sheltering by the temple.';

// =====================================================================
// Davy Tenney, eight: tries to be a grown carter and a guard; short sentences like his mother; saw the raid.
// =====================================================================
Object.assign(PEOPLE, { davy: {
  name: 'Davy Tenney', role: 'Mags\'s son, eight', spr: 'fam_davy', where: 'the temple door, standing guard with a stick',
  look: 'A thin, dark-haired boy in a jacket too big for him, standing very straight with a long stick he calls a spear. He watches the road the way his mother does.',
  story: [
    [0, 'He came up from Kettle Cross with his mother after the goblin raids burned their carting yard. He has appointed himself guard of the temple door.'],
    [2, 'He can name every ox the family ever had, and does, at night, in order. He does not say what happened to them.'],
    [4, 'He hid in the dry well the night of the raid and looked up through the boards. He saw a man in a dark cloak on a horse, and a goblin with a torch bowed to him.'],
  ],
  ties: { mags: 'His mother. He watches her as closely as she watches the road.', ned: 'Wants to be a gate guard like Ned. Ned lets him hold the spear.', pippa: 'Pippa Tolly lit him a lamp the first night. He would fight a bear for her.', rowan: 'Rowan Pell gave him a real knife.' },
  talk: ['I\'m nearly nine. That\'s nearly ten.', 'This is a spear. It\'s a stick now. It\'s a spear when there\'s trouble.', 'Our oxen were Bramble, Brick, Barley, Bully, Big Joe and Pudding. Pudding was the best.'],
  halvard: '“I never saw him. Pippa says he could light a lamp from across the room. I don\'t think that\'s true. I\'d like it to be.”',
} });
NEW_FIGS.davy = { build: 'child', skin: 'c48862', hair: 'crop', hairColor: '2a1a10', shirt: '8a8f98', torso: 'vest', vest: '3b5f8a', under: '8a8f98', pants: '46506e', boots: '3a3428', held: 'spear' };
DIALOGUE.davy = {
  intro: [
    '~A thin dark-haired boy stands guard at the temple door with a long stick, very straight, chin up. He looks at you, then at the stick, then at you again.',
    'Halt. ...You\'re allowed. You live here. I\'m Davy. I\'m guarding.',
  ],
  greet: [
    'Halt! ...Oh. It\'s you. You can pass.',
    '~He thumps the end of his stick on the step, the way Ned does with his spear.',
    { t: 'I\'ve been up since before the sun. Mum was up first. She\'s always up first.', if: 'phase:Dawn,Morning' },
    { t: 'I\'m not scared of the dark. I just like the lamps on. Pippa says the lamps are for strangers. I\'m not a stranger now. I still like them.', if: 'night' },
    { t: 'Tam wants to play goblins again. I said I\'ll be the guard this time.', if: 'here:tam', min: 1 },
    { t: '{n}! Did you go in the caves? Did you see goblins? Did you hit them?', min: 2 },
    { t: '~He isn\'t guarding. The stick leans against the wall, and he sits under it with his knees drawn up.', if: 'found' },
    { t: '~He is pressed against the temple wall, stick held tight, watching the road. “Mum says they\'re back on the road. Not here. On the road. Not here.”', if: 'event:raids' },
    { t: 'You killed the goblin king! Ned told me. Ned says you\'re the bravest person in the valley. After my mum.', if: 'boss:grotsnag' },
  ],
  bye: [
    'You can go. I\'ll guard.',
    'Bye. Watch out for goblins.',
    { t: 'Come back. Mum\'s better when you\'ve been.', min: 3 },
    '~He salutes with the stick. It nearly takes his eye out.',
  ],
  how: [
    'Good. I had bread. Mrs Tolly gave Mum two loaves and Mum said no and then said yes.',
    { t: 'I had the dream again. The orange one. I\'m not telling you it. I\'m just saying I had it.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'You don\'t have to tell me. But I\'m here if you want to.', r: '~He nods, very fast, and looks at his boots. “Maybe later. When it\'s light.”', tr: 1 },
        { tone: 'pious', l: 'Aurel sends the dawn to chase off bad dreams. Every single morning.', r: 'Every morning? ~He thinks. “He has been. It does go, when it\'s light.”', tr: 1 },
        { tone: 'joke', l: 'Next time, dream you\'re a giant. Then step on it.', r: '~He almost smiles. “I\'d squash it. Like a beetle.”', tr: 1 },
        { tone: 'blunt', l: 'It was only a dream, Davy.', r: 'It wasn\'t only. It was a real thing first. Then it was a dream.', tr: -1 },
      ] } },
    { t: 'Mum smiled today. At Rolf. He fell over a stool. It was a good day.', min: 2 },
    { t: '~He holds his stick very straight. “Pippa\'s crying. She never cries. I\'m guarding her today.”', if: 'found' },
  ],
  self: [
    'Davy Tenney. I\'m eight. I\'m a carter. Nearly. I can yoke an ox. I could. When we had oxen.',
    'My da was Abner Tenney. He could back a wagon through a gate with an inch each side. Mum says I\'ve got his hands.',
    { t: 'When I\'m big I\'m going to be a guard like Ned. Then a carter. Then a guard again if there\'s goblins.', min: 1 },
    { t: '~He lowers his voice. “I can still say all the oxen. Bramble, Brick, Barley, Bully, Big Joe and Pudding. I say them at night. In order. So they don\'t get lost.”', min: 3,
      learn: 'Davy Tenney says the names of his family\'s six dead oxen every night, in order, so they don\'t get lost.' },
  ],
  workLabel: 'About guarding',
  work: [
    'I guard the temple. Somebody has to. You go out a lot.',
    'Ned showed me how to stand. Feet apart. Spear up. Don\'t lock your knees or you fall over. Ned fell over once. He told me not to tell.',
    { t: 'Mum hauls for Mr Hobb now. I ride on the cart and shout at the horse. The horse doesn\'t listen. Oxen listen. Oxen are better.', min: 1 },
    { t: 'I made Tam a guard too. He\'s bad at it. He talks. Lark is better. She doesn\'t talk and she sees everything.', if: 'here:lark' },
  ],
  news: [
    'Mrs Tolly\'s cat had kittens in the temple woodpile. There\'s four. I\'m guarding them as well.',
    { t: 'Mr Rowan gave me a knife! A real one. Mum nearly shouted. Then she didn\'t. I\'m whittling a goblin. To stab.', if: 'here:rowan' },
    { t: 'Miss Ivy\'s making me a jacket. Blue. I said I don\'t need one. Mum said say thank you. I said thank you. It\'s a really good jacket.', if: 'here:ivy' },
    { t: 'The big wolf\'s dead! I saw the pelt at Mr Garrick\'s. It\'s bigger than an ox. Nearly. Bigger than a calf.', if: 'boss:greymaw' },
    { t: 'They say you found where the tunnels go four ways. Is that where the goblins live? Are they coming up?', if: 'junction',
      ask: { opts: [
        { tone: 'kind', l: 'Not here, Davy. I won\'t let them.', r: '~He looks at you for a long time, the way his mother does. Then he nods. “All right. I believe you.”', tr: 1 },
        { tone: 'blunt', l: 'Some live down there. A long, long way down.', r: 'How long? ~He holds his arms out wide. “This long? Longer?” Longer, you tell him. He breathes out.', tr: 1 },
        { tone: 'joke', l: 'They\'re far too scared of you and your spear.', r: 'It\'s a stick. ~A pause. “It\'s a spear when there\'s trouble.”', tr: 0 },
      ] } },
  ],
  halvard: [
    'I never saw him. Pippa says he could light a lamp from across the room.',
    { t: 'Pippa says he was the kindest man in the world. I said my da was. We decided they can both be. In different places.', min: 1 },
    { t: 'Is he lost in the caves? With the goblins? ~He grips his stick. “You should take a spear. A real one.”', if: '!found' },
    { t: '~He holds out his stick to you, quite solemnly, then takes it back. “I was going to give you it. For your guarding. But I need it.” He thinks. “You can have it on Tuesdays.”', if: 'found' },
  ],
  caves: [
    'The goblins came out of the hills. Mum says the hills go all the way to here.',
    { t: '~It comes out all in a rush, eyes on the ground. “There was fire and Mum put me in the well with the boards on and I looked up through the crack and there was a man on a horse and a goblin with a torch bowed to him. Like at a fair. Like he was the lord.” He stops. “Mum says I dreamed it. I didn\'t.”', min: 3,
      learn: 'From his hiding place in a well, Davy Tenney saw a goblin raider bow to a cloaked man on horseback at Kettle Cross.',
      ask: { opts: [
        { tone: 'kind', l: 'I believe you. You were very brave to look.', r: '~His chin wobbles and steadies. “I wasn\'t brave. I couldn\'t not look.”', tr: 1 },
        { tone: 'curious', l: 'Did you see the man\'s face?', r: 'No. His hood was up. He had good boots. Shiny ones. Mum says you can tell a man by his boots.', tr: 1, learn: 'The cloaked rider at Kettle Cross wore good, shiny boots, Davy says.' },
        { tone: 'pious', l: 'Aurel saw it too, Davy. Nothing hides from the dawn.', r: 'Then Aurel should tell Mum. She doesn\'t believe me.', tr: 0 },
        { tone: 'blunt', l: 'Are you sure? It was dark.', r: '~His face shuts like a door. “I knew you\'d say that.” He goes inside.', tr: -1 },
      ] } },
    { t: 'Tam says there\'s a door down there with four locks. I\'d guard it. Nobody\'d get past me.', if: 'seals:1' },
    { t: 'When you killed the goblin king, was the man in the cloak there? Did you see him?', if: 'boss:grotsnag', min: 3 },
  ],
  gods: [
    'I wave at the temple lamps. For Mum too, because she doesn\'t.',
    { t: 'Tam and Lark have a morning man over their bed. I want one. Pippa says I can share Aurel with the whole temple. That\'s not the same.', if: 'here:tam' },
    { t: 'At Kettle Cross there was a stone with coins on, for Korrum. I took one once. Just one. Then the fire came. ~He looks at you, frightened. “That wasn\'t why. Was it?”', min: 3,
      ask: { opts: [
        { tone: 'pious', l: 'No. Korrum doesn\'t punish children for a coin. Put one on the cairn by the ring gate and you\'re square.', r: '~His whole body goes loose. “I will. I\'ll put two.”', tr: 1 },
        { tone: 'kind', l: 'No, Davy. Never. The fire wasn\'t anything you did.', r: '~He nods hard, and wipes his nose on his sleeve, and nods again.', tr: 1 },
        { tone: 'joke', l: 'Korrum has a lot of coins. He wouldn\'t miss one.', r: 'Are you sure? ~He doesn\'t look sure. “I\'m putting one back anyway.”', tr: 0 },
      ] } },
  ],
  gossip: [
    'Pippa says Mr Bran had a son, and he\'s in the caves. Everybody\'s in the caves.',
    { t: 'Mum sits by the door at the Fox. Always the door. I sit by the door now too. You can see who comes in.', min: 1 },
    { t: 'The councilman came and asked Mum lots of questions. Then he looked at me and smiled. I didn\'t like his smile. It didn\'t go all the way up.', min: 2 },
    { t: 'Linnet at Old Berta\'s has bees. She let me hold one. In a jar. It was cross.', if: 'here:linnet' },
  ],
  about: {
    mags: [
      'Mum. She\'s the strongest person in the world. She lifted a wagon wheel on her own.',
      { t: 'Mum doesn\'t sleep. I hear her. I pretend I\'m asleep so she doesn\'t have to pretend too.', min: 3 },
    ],
    ned: ['Ned\'s the best guard. He lets me hold the spear. The bottom bit. Tam only gets the bottom bit too.'],
    pippa: ['Pippa lit a lamp for me the first night. I\'m going to marry her. Not now. When I\'m ten.'],
    rolf: ['Rolf says his soup is his mum\'s fish stew. It\'s got fish in. I don\'t like fish. I ate it all.'],
    tam: [{ t: 'Tam follows me everywhere. He\'s six. He\'s all right. He\'s loud.', if: 'here:tam' }],
    lark: [{ t: 'Lark doesn\'t believe my goblin stories. She\'s right about the big one. Not the others.', if: 'here:lark', min: 1 }],
  },
};
FAMILY.davy = {
  house: 'Tenney', gen: 0,
  since: 'Newcomer, eight years old. A carter\'s son from Kettle Cross who came up the road in a borrowed cart with his mother and nothing else.',
  from: 'kettlecross',
  kin: [
    { rel: 'mother', id: 'mags', say: 'Mum. She can lift a wagon wheel. She hit a goblin with a lamp.' },
    { rel: 'father', name: 'Abner Tenney', dead: 1, from: 'kettlecross', note: 'carter; died three winters ago', say: { t: 'My da died when I was five. A wagon. I remember his hat. It smelled of oxen. Good oxen.', min: 1 } },
    { rel: 'grandfather', name: 'Ruck Tenney', dead: 1, from: 'kettlecross', note: 'started the carting yard', say: { t: 'Grandad Ruck built our yard. I never met him. His name was burned on the gate. It\'s all burned now.', min: 2 } },
    { rel: 'aunt', name: 'Ros Pike', from: 'weyford', note: 'Mags\'s sister, married to a Weyford tanner', say: 'Aunt Ros lives in Weyford with a tanner. Her house smells like dead cows. Mum says don\'t say that. It does.' },
  ],
  origin: [
    'Kettle Cross. It\'s where the roads cross. That\'s why it\'s called that. And there\'s a kettle. On the sign.',
    'We had a yard with three wagons and six oxen and a barn and a dog. The dog ran away. I hope it ran far.',
    { t: 'We came up in a drover\'s cart. Mum didn\'t talk the whole way. I counted milestones. Nineteen. Then there was the temple, and Pippa, and a lamp.',
      learn: 'Mags and Davy Tenney came up from Kettle Cross in a drover\'s cart with nothing.' },
    { t: 'Where are you from? Pippa says you came out of a fire. Did you? Were you scared?', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'I was a baby. Someone carried me out. Like your mum carried you.', r: '~He thinks about this for a long time. “Then we\'re the same. Nearly.”', tr: 1 },
        { tone: 'blunt', l: 'I don\'t remember it, Davy.', r: 'Lucky. ~He says it very quietly.', tr: 0 },
        { tone: 'pious', l: 'Aurel brought me through. He brought you through too.', r: 'Mum brought me through. ~A pause. “Maybe Aurel helped her lift the boards.”', tr: 1 },
        { tone: 'joke', l: 'I hatched out of an egg. Ask Tam.', r: '~He snorts. “Tam believes everything. I don\'t.” He looks at you sideways. “Did you, though?”', tr: 1 },
      ] } },
  ],
  family: [
    'Tenneys are carters. Mum says I can be anything. I\'m going to be a carter. And a guard.',
    { t: 'Mum\'s da drove mules. Mum says mules are cleverer than oxen. I don\'t believe her. She only says it because they were hers.', min: 1 },
  ],
};
GIFT_TASTES.davy = { love: ['cat:weapon', 'antler'], like: ['apple', 'feather', 'bone', 'egg', 'meat', 'cat:food'], dislike: ['torch', 'oil', 'redcap'] };
GIFT_LINES.davy = {
  love: [
    '~He takes the {item} in both hands and stands up very straight. “I\'ll guard with it. Every day. I\'ll show Ned.”',
    'Is this for me? Really for me? ~He doesn\'t say thank you. He just holds it, and holds it, and doesn\'t let go.',
  ],
  like: [
    'Thanks. I\'ll show Mum. She\'ll say where did you get that. I\'ll say the Acolyte.',
    '~He tucks the {item} inside the too-big jacket. “Safe now.”',
  ],
  neutral: [
    'What\'s it for? ...Oh. Thanks.',
    '~He looks at the {item} carefully, the way his mother checks an axle. “Hm. All right.”',
  ],
  dislike: [
    '~He steps back behind his stick. “I don\'t want it. Take it away.”',
    'No. Mum says no to those.',
  ],
  special: {
    torch: '~He goes white and very still, like a hare in a field. He doesn\'t run. He doesn\'t breathe. Then, very small: “Put it out. Please put it out before Mum sees.”',
    antler: '~He holds the antler up to his head and stamps. “I\'m an ox! I\'m Pudding!” Then he stops, and holds it in his lap, and is quiet for a bit. “Pudding had little horns. Like this.”',
  },
};
ARRIVE_NEWS.davy = 'With the widow Tenney came her boy Davy, eight, who has appointed himself guard of the temple door.';

// =====================================================================
// Linnet Ashby: Berta's grand-niece from Thornbury; earnest, warm, curious, gently stubborn; keeps bees.
// =====================================================================
Object.assign(PEOPLE, { linnet: {
  name: 'Linnet Ashby', role: 'Berta\'s grand-niece, from Thornbury', spr: 'fam_linnet', where: 'Old Berta\'s cottage on the south lane, among the lavender and her bee-skeps',
  look: 'A freckled young woman with honey-coloured hair under a yellow kerchief and a bee-sting swelling on one wrist. She has Old Berta\'s nose, and Old Berta\'s way of looking at you one question longer than is comfortable.',
  story: [
    [0, 'She has come up from Thornbury to find her grandmother\'s sister, Berta Lind, whom her family had mourned for eighteen years.'],
    [2, 'Last spring an unsigned letter reached her grandmother Mae in Thornbury: four lines in a careful hand, saying Berta was alive in Brambleford, on the south lane, among the lavender.'],
    [4, 'She has brought the bundle of letters Berta sent Mae before the fire. The last one, from that famine autumn, says the reeve has refused the grey cloaks their tithe, and Berta is afraid.'],
  ],
  ties: { berta: 'Her great-aunt, found again after eighteen years.', tamsin: 'Tamsin is teaching her to make Berta\'s chest tisane properly, loudly.', rowan: 'Knew the Pells by sight at Thornbury market.', ivy: 'Ivy bought her honey at Thornbury market for years.', mags: 'Mags told her the old north track is shut past the watchtower.' },
  talk: ['Aunt Berta says I ask too many questions. Then she answers them all.', 'The bees like the lavender here. They\'ve forgiven me for the cart.', 'Thornbury cider, Brambleford bread. I brought a cask of the cider. To be fair.'],
  halvard: '“I never met him. But somebody sent my grandmother four lines in a careful hand, and Aunt Berta says there was only one man in this town who wrote like that, and only one who knew.”',
} });
NEW_FIGS.linnet = { build: 'slim', skin: 'f6d0ac', hat: 'kerchief', hatColor: 'e0c060', hair: 'long', hairColor: 'b89a6a', shirt: '8a7ab5', torso: 'dress', apron: 1, jaw: 'soft', lashes: 1, blush: 1, held: 'basket' };
DIALOGUE.linnet = {
  intro: [
    '~A young woman in a yellow kerchief is kneeling in Old Berta\'s lavender, settling a straw bee-skep on a flat stone. She stands, brushes off her knees, and holds out a hand.',
    'Linnet Ashby. From Thornbury. I\'m Berta\'s... her sister\'s granddaughter. I\'m still getting used to saying it.',
  ],
  greet: [
    'Hello! Mind the bees. They\'re cross about the journey.',
    '~She waves a smoking twist of rag at the skep, and then at you, by way of hello.',
    { t: 'Morning. Aunt Berta was up before me. She says old women and bakers never sleep. I\'m starting to believe her.', if: 'phase:Dawn,Morning' },
    { t: 'Evening. I\'m just closing up the bees. They go to bed before the lamps. Sensible things.', if: 'night' },
    { t: '{n}! Come in. Aunt Berta\'s told me all about you. Most of it twice.', min: 2 },
    { t: '~She looks past you, up the lane, before she smiles. It is exactly the way Berta does it.', min: 3, if: 'flag:berta_captain' },
    { t: '~She is on the bench outside the cottage, holding Old Berta\'s hand. Neither of them is speaking. She makes room for you on the other side.', if: 'found' },
    { t: 'Fever in the lanes. I\'ve put Aunt Berta to bed with onion broth and honey. She\'s furious. That means she\'s well.', if: 'event:fever' },
  ],
  bye: [
    'Go well. Take a honey cake. Take two.',
    'Mind the wolves. Aunt Berta made me say that. I think it\'s a family saying now.',
    { t: 'Aurel keep you, {n}. And come back. She brightens when you\'ve been.', min: 2 },
    '~She is back among the bees before you reach the gate.',
  ],
  how: [
    'Happy. Is that strange? I\'ve never been anywhere so sad and been so happy.',
    { t: 'Tired. Aunt Berta talks half the night. Names, mostly. People. I write them down so she doesn\'t have to keep them all in her head.', min: 1,
      ask: { opts: [
        { tone: 'kind', l: 'That\'s a beautiful thing to do for her.', r: '~She colours. “Father Halvard did it first, she says. I\'m only copying his homework.”', tr: 1 },
        { tone: 'curious', l: 'Whose names?', r: 'Neighbours. A baker, a girl who sang, a boy who kept geese. Folk from where she lived. ~She stops. “Before here.”', tr: 1 },
        { tone: 'pious', l: 'Nemora keeps the names of the lost. You\'re doing her work.', r: 'Gran keeps a blue stone. I never knew why. I think I\'m starting to.', tr: 1 },
        { tone: 'blunt', l: 'Be careful who sees that list.', r: '~She looks at you a long moment. “Aunt Berta said that. In the same voice.” She puts the paper away.', tr: 0 },
      ] } },
    { t: 'Worried. Her chest rattles at night. I\'ve only just found her.', if: '!duty:berta_cough' },
    { t: 'Better than I was. She slept the night through. I sat and listened to her breathe like it was music.', if: 'duty:berta_cough' },
  ],
  self: [
    'Linnet Ashby. Thornbury born and bred. My father presses cider and my mother argues with him about it. I keep bees, because they argue less.',
    'Gran always said she had a sister in the north. Older. Fierce. Married a roofer. And then, for eighteen years, Gran said had.',
    { t: 'I\'m twenty-four. Gran says at my age she was married with two children. I say at her age I\'ll have forty skeps. We each think the other\'s wasting her life.', min: 1 },
    { t: '~She takes a folded paper from her apron, soft with handling. “This came to Gran last spring. No name. Four lines. Your sister Berta is alive. Brambleford, the south lane. Lavender at the door. She will not write herself; forgive her.” She looks up. “Do you know the hand?”', min: 3,
      learn: 'Last spring an unsigned letter told Mae Ashby in Thornbury that her sister Berta was alive in Brambleford.',
      ask: { opts: [
        { tone: 'curious', l: '~Look closely at the writing.', r: '~A careful upright hand, a long tail on every y. You have seen it on every temple list and every note left on the kitchen table. It is Halvard\'s.', tr: 1,
          learn: 'The unsigned letter that brought Linnet to Brambleford was written by Father Halvard, last spring, before he went into the caves.' },
        { tone: 'kind', l: 'Whoever wrote it loved her very much.', r: 'That\'s what Gran said. She held it and said, someone up there loves my sister. Then she cried for a week and sent me.', tr: 1 },
        { tone: 'pious', l: 'Aurel brings the lost home. Sometimes by letter.', r: '~She smiles. “Then Aurel has very neat handwriting.”', tr: 1 },
        { tone: 'blunt', l: 'Why didn\'t Berta write herself?', r: '~Her smile goes. “I asked her. She said it was safer for Gran to think she was dead. Safer from what, she won\'t say.”', tr: 0 },
      ] } },
  ],
  workLabel: 'About the bees',
  work: [
    'Six skeps. I brought four. Two swarmed on the road and I chased one through a Weyford hedge. The farmer\'s still talking about it, I expect.',
    'Bees want lavender and quiet. Aunt Berta\'s garden is all lavender and no quiet. They\'re managing.',
    { t: 'Garrick wants my honey for his hams. Marta wants it for her buns. Tamsin wants it for her tisanes. I\'m going to need more bees.', min: 1 },
    { t: 'Aunt Berta says, long ago, somebody she knew used to take honey down to the folk under the hill and come back with little carvings. I said, what folk? She said, eat your bread.', min: 2 },
  ],
  news: [
    'Aunt Berta\'s taught me her biscuits. They\'re terrible. She says they always were, and that\'s the recipe.',
    { t: 'Rowan Pell\'s here! From Thornbury! I haven\'t seen him since he tried to carry a calf across the market and the calf won.', if: 'here:rowan' },
    { t: 'Mags Tenney says the old north track is shut past the watchtower. Has been eighteen years. Nobody\'s gone up it since. ~She hesitates. “Since the sickness.”', if: 'here:mags' },
    { t: 'Hilde Marsh came with kindling while I was there. Aunt Berta made us all tea. Hilde couldn\'t look at me. I don\'t know why. I liked her.', if: 'flag:hilde_amends' },
    { t: 'The great wolf\'s dead. Hobb Thatcher came to tell Aunt Berta. He told her twice. She let him.', if: 'boss:greymaw' },
    { t: 'Caravan\'s in. I sold three pots of honey and bought Aunt Berta lavender soap. She already had lavender soap, from Mirela. She has a great deal of soap.', if: 'event:caravan' },
  ],
  halvard: [
    'I never met him. But Aunt Berta talks about him the way Gran talks about Grandad.',
    { t: 'Aunt Berta sits by the window on Thursdays and listens for a cart. I don\'t ask. I sit with her.', if: '!found', min: 1 },
    { t: 'He brought her firewood every week for eighteen years. I keep thinking, somebody could have told us sooner. And then I think: somebody did.', min: 2 },
    { t: '~Her eyes are red. “She isn\'t crying. She says she used it all up, before. But she sits with his last armful of firewood in her lap.” She swallows. “I wish I\'d thanked him. For the letter. For her.”', if: 'found',
      ask: { opts: [
        { tone: 'kind', l: 'You did thank him. You came.', r: '~She presses her lips together and nods, and takes your hand for a moment, quite hard.', tr: 1 },
        { tone: 'pious', l: 'Light a lamp for him at dawn. He\'ll know.', r: 'I will. I\'ll bring Aunt Berta. I\'ll carry her if I have to. Somebody should carry her, for once.', tr: 1 },
        { tone: 'curious', l: 'Do you still have the letter?', r: 'Always. In my apron. Gran said keep it on you. Like a charm.', tr: 0 },
      ] } },
  ],
  caves: [
    'Caves are for bats and bad men, Aunt Berta says. Then she looks at you and stops.',
    { t: 'Gran said the north track goes past the watchtower and over the cliff road. Three days. She walked it down as a girl to marry Grandad. Three days up to where her sister lived, she\'d say. Then she\'d stop.', min: 2 },
    { t: 'You\'ve been where four roads cross under the hill? Aunt Berta held my hand very tight when Hobb said so. She said, his grandfather would have known what to say to them.', if: 'junction' },
    { t: 'Aunt Berta has a mark drawn on the back of an old letter. She showed me, then put it in the fire. Then she pulled it out, scorched, and put it in her tin.', if: 'seals:1', min: 3 },
  ],
  gods: [
    'Aurel for the light, Veyra for the bees. Bees are the Green Lady\'s, they say in Thornbury. You leave her the first comb.',
    { t: 'Gran sets a blue stone in her window one night every autumn. I asked why when I was small. She said, for remembering. Aunt Berta does it too. The same night.', min: 2,
      learn: 'Berta\'s sister Mae, in Thornbury, sets out a blue stone for Nemora on the same autumn night Berta does.' },
    { t: 'I\'ve started coming to the dawn service. Aunt Berta comes on my arm. She says she\'s doing it for me. She isn\'t.', min: 1 },
  ],
  gossip: [
    'Everyone here is kind to Aunt Berta, and nobody says where she\'s from. I asked Wendell Tolly. He talked about turnips for ten minutes.',
    { t: '~She drops her voice. “I said the name in the bakery. Just the name, where Gran\'s from. Marta Tolly dropped a tray. Old Hester took my arm and walked me out and said, kitchens, dear. Not shops.”', min: 2 },
    { t: 'The councilman\'s wife walked past the cottage today, slowly. She looked at the lavender like it hurt. She didn\'t stop.', min: 2 },
    { t: '~She glances at the door. “In Thornbury they say a sickness took the north. Gran believed it eighteen years. When I said it, Aunt Berta laughed. Not a nice laugh. Then she told me never to say it again in her house, and asked if I wanted a biscuit.”', min: 3,
      learn: 'Berta laughed bitterly when Linnet said a sickness took Ashvale, and forbade her to repeat it.' },
    { t: 'Lark Cooper told me I have Berta\'s nose. Nobody else noticed. That child notices everything.', if: 'here:lark' },
  ],
  about: {
    berta: [
      'Aunt Berta. Tiny and fierce. Gran said she would be. She\'s more.',
      { t: 'The first day she held my face in her hands and said, Mae\'s girl\'s girl, over and over, like counting. Then she made tea and burned the biscuits.', min: 1 },
      { t: 'She\'s writing to Gran. Her first letter in eighteen years. She\'s been at it a week. It\'s three lines so far.', min: 3 },
    ],
    tamsin: ['Tamsin shouts at me about the tisane. Then shows me again, slower. I think that\'s how she likes people.'],
    voss: [
      { t: 'The councilman tipped his hat and asked if I was Berta Lind\'s kin, and from where, and how long I\'d stay. Very kind. Very thorough.', min: 1 },
      { t: 'Aunt Berta saw him talking to me. She didn\'t say a thing. She held her cup so tight it cracked.', min: 3 },
    ],
    mirela: ['Mirela gave Aunt Berta lavender soap and then gave me some too, so I wouldn\'t feel left out. I\'ve decided she\'s my friend. She hasn\'t decided yet.'],
    hilde: [{ t: 'The armorer came to the door, and Aunt Berta let her in, and they sat. I don\'t understand it. I don\'t think I\'m meant to.', if: 'flag:hilde_amends' }],
    rowan: [{ t: 'Rowan Pell. Biggest boy in Thornbury and the gentlest. Ivy\'s lucky. She\'d say he is.', if: 'here:rowan' }],
  },
  extra: {
    letters: { label: 'About Berta\'s letters', if: 'met:berta', seq: true, lines: [
      { t: 'Gran kept every letter Aunt Berta ever sent her. Forty years of them, tied with wool. I brought them. Aunt Berta won\'t untie the bundle. She just holds it.', min: 3 },
      { t: 'I read some on the road. I\'m not proud of it. About a well-house. About a reeve who argued with everyone and sang at harvest. About the reeve\'s daughter having a baby.', min: 3 },
      { t: '~She unfolds the last letter from the bottom of the bundle without quite looking at it. “Autumn, the famine year. The reeve has said no to the grey cloaks. They want the tithe and there is no grain to give. Mae, I am afraid. Pray Nemora it comes to nothing.” She folds it. “There\'s nothing after that. Not for eighteen years.”', min: 4,
        learn: 'Berta\'s last letter to her sister before the fire says the reeve refused the grey-cloaked Wardens their tithe in the famine year, and that she was afraid.',
        ask: { opts: [
          { tone: 'kind', l: 'Keep it safe, Linnet. And keep it quiet.', r: '~She nods slowly. “That\'s what you all say here. Keep it quiet. I\'m beginning to understand why.”', tr: 1 },
          { tone: 'curious', l: 'Grey cloaks. Did your gran know who they were?', r: 'The Wardens. They came to Thornbury once for their tithe, and our reeve gave them everything. ~She stops. “Everything.”', tr: 1 },
          { tone: 'pious', l: 'Nemora remembers what was written. So will we.', r: '~She tucks the letter back among the others, very gently. “Then I\'ll keep it for her. And for Nemora. And for you.”', tr: 1 },
          { tone: 'blunt', l: 'That letter could get someone killed.', r: '~She goes white, and then her chin comes up, exactly like Berta\'s. “Then I\'ll keep it where nobody looks. In with the honey.”', tr: 0 },
        ] } },
    ] },
  },
};
FAMILY.linnet = {
  house: 'Ashby', gen: 0,
  since: 'Newcomer. A Thornbury cider-presser\'s daughter, granddaughter of Berta Lind\'s sister Mae, come looking for a great-aunt her family mourned for eighteen years.',
  from: 'thornbury',
  kin: [
    { rel: 'great-aunt', id: 'berta', say: 'Aunt Berta. Gran\'s big sister. Eighteen years we thought she was gone, and she was down the valley growing lavender.' },
    { rel: 'grandmother', name: 'Mae Ashby', from: 'ashvale', note: 'Berta\'s younger sister; married into Thornbury long before the fire', say: 'Gran. Mae. She married into Thornbury at nineteen and never stopped calling the north home. Quietly.' },
    { rel: 'grandfather', name: 'Will Ashby', dead: 1, from: 'thornbury', note: 'built the Ashby cider press', say: 'Grandad Will built the press. Gran says he courted her with a cask of perry, and that\'s the only reason she stayed.' },
    { rel: 'father', name: 'Tom Ashby', from: 'thornbury', note: 'cider-presser, Mae\'s son', say: 'Da runs the press now. He sent a cask of the best for Aunt Berta and a cask of the second-best for whoever asks me too many questions.' },
    { rel: 'great-uncle', name: 'Joss Lind', dead: 1, grave: 1, from: 'ashvale', note: 'Berta\'s husband, a roofer', say: { t: 'Great-uncle Joss. I put lavender on his stone. Aunt Berta said he\'d laugh at me. Then she put some there too.', min: 1 } },
    { rel: 'father\'s cousin', name: 'Rafe Lind', dead: 1, from: 'ashvale', note: 'Berta\'s son; died in the fire at thirty', say: { t: 'Rafe. Aunt Berta\'s boy. Gran had a little wooden bird he carved for her once. I gave it to Aunt Berta. She held it and didn\'t say anything for an hour.', min: 3 } },
  ],
  origin: [
    'Thornbury, a day east. The Ashby press is by the market cross. If you\'ve drunk cider in this valley, you\'ve drunk ours. Probably the second-best.',
    { t: 'Gran grew up in the north. Up the old track past the watchtower, three days. She came down to Thornbury to marry Grandad. Aunt Berta stayed up there and married her roofer.', min: 1 },
    { t: '~She lowers her voice without seeming to know she has. “Eighteen years ago word came that a sickness took the north. The whole village. Gran put a blue stone in the window and wore grey a year. And then, last spring, the letter.”', min: 2,
      learn: 'Berta\'s sister Mae mourned her for eighteen years, believing a sickness had taken Ashvale.' },
    { t: 'Aunt Berta says I\'m not to say the name of where she\'s from out loud. Not in the square. Do you know why, Acolyte?', min: 2,
      ask: { opts: [
        { tone: 'kind', l: 'Because it hurts her. That\'s reason enough.', r: '~She nods slowly. “It is. I\'ll keep it, then. In here.” She taps her chest.', tr: 1 },
        { tone: 'blunt', l: 'Because some people here would rather it was forgotten.', r: '~She goes very still, the way Berta does. “Who?” Then: “No. Don\'t tell me in the lane. Tell me in a kitchen.”', tr: 1 },
        { tone: 'curious', l: 'What has she told you about it?', r: 'A mill. An orchard. A well-house. A bell. Children playing seek. And then she always says, more tea?', tr: 0 },
        { tone: 'pious', l: 'Nemora keeps it. We don\'t have to say it to remember.', r: 'That\'s what Gran\'s blue stone is for. I see it now.', tr: 1 },
      ] } },
  ],
  family: [
    'Ashbys press cider and argue. Gran says the Ashby men are like their apples: sour till October.',
    { t: 'Aunt Berta asked if Gran still bites her thumbnail when she\'s cross. She does. Aunt Berta laughed till she coughed. Eighteen years, and a thumbnail.', min: 1 },
    { t: 'Gran was the little sister. Aunt Berta was the one who climbed the bell tower on a dare and rang it at midnight. Gran told me that last winter, in the kitchen, with the door shut.', min: 2 },
  ],
};
GIFT_TASTES.linnet = { love: ['moonpetal', 'apple'], like: ['milk', 'egg', 'wood', 'feather', 'healroot', 'wool'], dislike: ['cat:weapon', 'bone', 'gel'] };
GIFT_LINES.linnet = {
  love: [
    '~She cups the {item} in both hands as if it might fly off. “Oh, that\'s lovely. Aunt Berta, look! ...She\'s asleep. I\'ll show her later. Twice.”',
    'You\'ve been talking to Aunt Berta about me. Don\'t deny it. Thank you.',
  ],
  like: [
    'Thank you! That\'s kind. Have a honey cake. No, have two.',
    '~She sets the {item} on the windowsill beside Berta\'s blue stone. “There. It looks like it belongs.”',
  ],
  neutral: [
    'Oh. Thank you. ~She turns the {item} over. “I\'ll ask Aunt Berta what it\'s for. She\'ll know. She knows everything and tells half.”',
    'That\'s very thoughtful. The bees won\'t want it, but I might.',
  ],
  dislike: [
    '~She takes a small step back. “I\'d rather not have that in the house. Aunt Berta wouldn\'t like it either.”',
    'Thank you, but... no. Truly. Give it to someone who can use it.',
  ],
  special: {
    apple: '~She smells the apple and laughs. “That\'s a russet. Grandad Will grafted russets.” She bites it. “Not as good as ours. Don\'t tell anyone in Brambleford I said that. Do tell anyone in Thornbury.”',
    healroot: '~She clutches it. “For Aunt Berta\'s chest. Tamsin said healroot, and I couldn\'t find any in the wood. Thank you. Thank you.”',
  },
};
ARRIVE_NEWS.linnet = 'A cart from Thornbury with bee-skeps in the back: Linnet Ashby has come to the south lane, asking at the doors for Old Berta.';
