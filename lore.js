// A line or two of lore for every item and material in the Encyclopedia. Weapons and armour are described by
// their kind and the metal they're made of; everything else has its own words.

const CLASS_LORE = {
  dagger: 'Short enough to hide in a boot, quick enough to matter. Every traveller carries one, if only for bread.',
  sword: 'The arming sword of the valley militias: a straight blade, a plain cross, and a balance that forgives a tired arm.',
  axe: 'A woodsman’s tool that learned war. It bites deep and is hard to turn aside.',
  mace: 'A flanged head on an iron haft. Armour that turns a blade only dents under it, and bones do worse.',
  spear: 'The oldest weapon there is. Keeps the bite of the thing you are fighting a long way from you.',
  bow: 'A hunter’s bow of yew and horn. In the Whisperwood, the deer hear the string before they hear you.',
  staff: 'A walking staff shod with metal and carved with old signs. It steadies the hand that casts.',
  crossbow: 'Slow to load, terrible when it looses. Highcourt lords forbid them to commoners, which is why commoners own them.',
  warhammer: 'A hammer for breaking helmets, with a spike on the back for whatever is under them.',
  flail: 'A spiked ball on a chain. It goes round shields, and occasionally round its wielder.',
  greatsword: 'Two hands, as long as a man, heavy as a gate bar. It clears a corridor.',
  rapier: 'A slender duelling blade from the cities, all point and wrist. Out of place in the caves, and deadly there.',
  halberd: 'An axe, a spear and a hook on one pole, for a soldier who would rather not choose.',
  robe: 'Plain cloth, worked with sigils in the hem. Spellcasters wear it because nothing gets between them and the weave.',
  leather: 'Boiled and shaped hide. Light enough to run in, and a skilled wearer slips most blows.',
  mail: 'Thousands of riveted rings. It hisses when you walk and turns a cut into a bruise.',
  plate: 'Shaped plates over padding. Little gets through; the price is weight, heat, and spells that fizzle.',
  shieldl: 'A small round shield for the off hand, made to punch and parry as much as block.',
  shieldh: 'A tall shield you can hide behind. It makes your swing clumsy and your enemies frustrated.',
  helm: 'Something hard between your skull and the world.',
  boots: 'Good boots matter more in the caves than any blade. Ask anyone who has walked home in bad ones.',
};
const GRADE_LORE = {
  iron: 'Iron from the valley’s own mines: honest, heavy and quick to rust.',
  steel: 'Folded steel from Bran’s forge, or from Highcourt, if you have money to waste.',
  silver: 'Faced with silver, which the restless dead cannot abide.',
  mithril: 'Mithril: pale, light as wood, harder than steel. It comes from deep under the mountain, and the kingdoms fought over it once.',
  royal: '',
};
const ITEM_LORE = {
  grotsnag_cleaver: 'King Grotsnag hacked his way to the throne of Gnarlhold with this. The edge is notched with the number of chiefs who knelt.',
  vesk_fang: 'Ground from a tooth of Mother Vesk’s first mate, and soaked in what she feeds her favourite children.',
  matriarch_staff: 'The Pale Matriarch’s lantern-staff. Its light has not gone out in four hundred years, and does not intend to.',
  coil_spear: 'The Coiled Hierophant’s spear, its shaft carved as a serpent swallowing its own tail.',
  ringstr: 'A ruby set in red gold. Smiths in Highcourt swear by it; their apprentices swear at it.',
  ringprot: 'A sapphire band warded with a sign older than Aurel’s sun.',
  ringregen: 'An emerald that warms against the skin. Cuts close faster under it.',
  ringvigor: 'A fire opal. Wearing it feels like the first warm day of spring.',
  ringacc: 'A moonstone ring prized by archers, who claim it steadies the eye. Most archers claim a lot of things.',
  amuwis: 'An amethyst on a silver chain, cut by the Arcanum to focus a scholar’s mind.',
  amuward: 'A green stone amulet against poison and sickness, of a kind Tamsin’s grandmother sold.',
  luckycharm: 'A clover sealed in glass. Gamblers at the Sleeping Fox would sell their mothers for one.',
  pheal: 'Tamsin’s healing draught: healroot, honey and something she won’t name. Tastes of all three.',
  pgheal: 'A stronger brew, thick and orange. It closes wounds you can see bone through.',
  pmana: 'Blue as a winter sky and fizzing faintly. Spellcasters drink it the way soldiers drink beer.',
  pantidote: 'Bitter, green and effective. Every caver carries two.',
  pstr: 'A brown, foul-smelling draught favoured by wrestlers and fools.',
  plife: 'Liquid gold, and nearly as costly. Each sip leaves you a little stronger, forever.',
  srecall: 'A blessed scroll that remembers where you came from and takes you back.',
  steleport: 'A scroll of uncertain direction. You will arrive somewhere. Probably.',
  smapping: 'Read it aloud and the shape of the place unrolls in your mind like a map.',
  senchant: 'A rune-scroll that binds a little more of the weave into a blade.',
  arrows: 'Goose-feathered, iron-tipped, ten to a bundle.',
  woodaxe: 'A long-handled axe for felling timber. Not for fighting, though people do.',
  pickaxe: 'A miner’s pick. Breaks ore from veins, and with patience, the mountain itself.',
  sickle: 'A curved blade for harvesting herbs cleanly, so they grow back.',
  rod: 'A hazel rod with a horsehair line. Every pond in the valley has a fish that got away from it.',
  backpack: 'Waxed canvas over a frame. Your back will thank you, eventually.',
  torch: 'Pitch-soaked rag on a stick. It smokes, it gutters, and it is the only thing between you and the dark.',
  lantern: 'A brass lantern with horn panes. Steadier than a torch, and it doesn’t set your hair on fire.',
  oil: 'Lamp oil in a stoppered flask.',
  journal: 'Father Halvard’s journal, its last pages written in a hurried hand.',
  seal_g: 'The Seal of Gnarlhold: a green-gold disc stamped with a crowned goblin skull.',
  seal_r: 'The Seal of the Gnawing Court: grey gold, warm, smelling faintly of rats.',
  seal_h: 'The Seal of the Hollows: pale gold, cold to the touch, worn smooth by blind fingers.',
  seal_s: 'The Seal of Sszarith: green gold coiled round a serpent’s eye.',
  greymawfang: 'A fang as long as your hand, from the old wolf who ran the Whisperwood for twenty winters.',
  wyrmheart: 'Still warm. Still, sometimes, beating.',
  helm_closed: 'A great helm with a visor. The world shrinks to a slit, and so does the enemy’s target.',
  hood_scarf: 'A hunter’s hood and scarf in earth colours. In the woods, you become a shadow among shadows.',
  mask_ritual: 'A carved wooden mask from the old rites at the standing stone, painted with a many-rayed sun.',
  mask_plague: 'A long-beaked leather mask stuffed with herbs, from the winter of the coughing sickness.',
  mask_wolf: 'The skull of a great wolf, cleaned and worn as a mask. Beasts see a predator; people see a madman.',
  edda_relic: 'A gilt reliquary holding a finger-bone of Saint Edda, who founded the temple. The dead remember her.',
  watch_shield: 'A buckler painted with the ford and the bridge of Brambleford, given to sergeants of the Watch.',
  captain_blade: 'The captain’s sword of the Brambleford Watch, silvered against what comes up from the caves.',
  hand_cloak: 'A cloak of shadowhide, cut by ratkin tailors. In it you are a little harder to see, and much harder to hit.',
};
const BOOK_LORE = {
  missile: 'The first spell every apprentice learns: a dart of pure force.',
  heal: 'A prayer-spell older than the Arcanum, from the temple’s own books.',
  phase: 'A little lesson in folding space. Do not read it while standing near a cliff.',
  fireball: 'A dangerous book. Its pages are scorched at the edges from the inside.',
  light: 'A gentle working, taught to children in Highcourt so they are not afraid of the dark.',
  cure: 'A remedy-spell for poisons and fevers, copied from Tamsin’s grandmother’s notes.',
  frost: 'Cold as a winter pond. Its pages frost over in your hands.',
  shield: 'A ward of hardened air. Highcourt guards learn it by rote.',
  sleep: 'A lullaby with teeth. It works on most things that breathe.',
  fear: 'A spell of dread. Even reading it makes the room feel smaller.',
  detect: 'A seeing-spell for what hides and breathes nearby.',
  drain: 'A forbidden book. The binding is skin. You hope it is not human.',
  regen: 'A slow spell of green growth that knits flesh as moss knits stone.',
  lightning: 'Storm-magic. The book crackles if you leave it by the window.',
  poisoncloud: 'A sickly green cloud, from the Gnawing Court’s own grimoires.',
  mapspell: 'A cartographer’s spell, beloved of cavers and lost tourists.',
  invis: 'Its pages are blank until you stop looking at them.',
  haste: 'A spell that makes the world slow and you not.',
  recall: 'A homing spell, the sort a careful priest learns before going underground.',
  meteor: 'The last spell in the oldest book. Fire from the sky. Few who read it should.',
};
const MAT_LORE = {
  wood: 'Good valley timber, oak and ash, for building and the forge.', stone: 'Grey fieldstone and cave rock. Brambleford is built of it.',
  iron: 'Rust-red ore from the cave veins.', silver: 'Bright ore, for silvered blades and the jewellers.', mithril: 'Pale blue-grey ore from deep under the mountain, worth more than its weight in gold.',
  hide: 'Rawhide from beasts of the wood and caves, for leather and bindings.', silk: 'Spider silk, strong as wire and fine as hair.',
  bone: 'Bones of the dead and of beasts. Useful, if you don’t think about it.', gel: 'Slime gel. It wobbles. Alchemists love it.',
  redcap: 'A red-capped mushroom that grows in the dark. Tamsin uses it; goblins eat it raw and see things.', healroot: 'A knobbly root that knits wounds. The base of every healing draught.',
  meat: 'Fresh meat from the hunt. The inn always wants it.', feather: 'Pheasant feathers, for fletching arrows.', antler: 'A deer’s antler. Carvers, alchemists and the temple all have a use for it.',
  pelt: 'A thick grey wolf pelt, warm enough for a Gnawing Court winter.', moonpetal: 'A pale flower that blooms only in the Hollows, where there is no moon.',
  shard: 'A crystal humming with the weave. Spellcasters and enchanters need them.', soulgem: 'A violet crystal that holds something. You try not to think what.',
  egg: 'Eggs from your own hens.', milk: 'Fresh milk from your own cow.', wool: 'Fleece from your own sheep.', wheat: 'Wheat from your own fields.', apple: 'Apples from your own orchard.',
  trout: 'A speckled pond trout.', perch: 'A striped perch from the millpond.', pike: 'A river pike, all teeth and temper.', caveeel: 'An eel that glows faintly blue, from the underground pools.', goldcarp: 'A golden carp. Some say they grant wishes. They do not, but they sell well.',
  roach: 'A small red-finned fish common in the ponds.', tench: 'The doctor fish: old wives say its slime heals.', bream: 'A bronze-sided bream from the slow water.', grayling: 'A grayling with a sail-fin, from the cold streams.',
  char: 'A red-bellied char from the coldest streams.', salmon: 'A silver salmon fighting its way upriver.', blindfish: 'A pale fish without eyes, from the cave pools.', lanternfish: 'A fish with its own little light, from deep water.',
  crayfish: 'A cave crayfish, all claws.', ghostcat: 'A translucent catfish from the deepest pools. You can see its heart beating.', cavepearl: 'A pearl grown in the dark by dripping water, not by any oyster.',
  glowcap: 'A mushroom that glows soft green. Cavers mark their paths with them.', inkcap: 'A mushroom that melts into black ink. Scribes and alchemists both want it.',
  truffle: 'A cave truffle. The inn’s cook would kill for these.', stonemoss: 'A grey moss that grows on cave walls. It stops bleeding.', lichen: 'A red lichen that smoulders faintly. Fire-mages powder it.',
  cavelily: 'A white lily that grows by underground water, against all sense.', rootvine: 'Roots of the surface trees, hanging through the cave roof.',
  quartz: 'Clear quartz from the cave walls.', nitre: 'Nitre scraped from damp walls, for blasting powder. The goblins guard their supply.', amber: 'Amber with something caught inside it.', rocksalt: 'Pink rock salt. Every kitchen in the valley wants it.',
};
function itemLore(key) {
  if (key.startsWith('mat:')) return MAT_LORE[key.slice(4)] || '';
  const t = ITEMS[key]; if (!t) return '';
  if (ITEM_LORE[key]) return ITEM_LORE[key];
  if (t.cat === 'book' && t.spell) return BOOK_LORE[t.spell] || '';
  if (t.cls && CLASS_LORE[t.cls]) return CLASS_LORE[t.cls] + (GRADE_LORE[t.grade] ? ' ' + GRADE_LORE[t.grade] : '');
  return '';
}
// show it in the encyclopedia entry, under the name
{
  const _he = htmlEncyclopedia;
  htmlEncyclopedia = function () {
    let html = _he.apply(this, arguments);
    try {
      if (cxSel && cxSel[0] === 'item' && cxKnown(cxSel[1])) {
        const l = itemLore(cxSel[1]);
        if (l) html = html.replace(/(<div class="cx-detail"><div class="cx-head">[\s\S]*?<\/div><\/div>)/, `$1<p class="cx-lore">${esc(l)}</p>`);
      }
    } catch (e) { }
    return html;
  };
}
