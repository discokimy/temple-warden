// Friendship's rewards. Trust (the hearts in your parish ledger) already grows by talking, gifts and duties.
// Now it gives something back: at four hearts a close friend presses a keepsake on you, and if they keep a
// shop, they knock a tenth off their prices for you; at five a confidant comes up to the temple on their own,
// and leaves something in the coffer. The ledger page shows where each friendship stands.

const FRIEND_GIFTS = {
  weapons: ['sword_steel', 'A steel sword, from Bran: “Made it for a customer who never came back. It wants a hand.”'],
  armor: ['helm_iron', 'An iron helm from Hilde, polished to a mirror: “Keep your head. I like it where it is.”'],
  alchemist: ['pgheal', 'A potion of greater healing from Tamsin, the cork sealed with her thumbprint in wax.'],
  magic: ['bheal', 'A spellbook from the Arcanum’s own shelf: “Don’t tell the others where you got it.”'],
  general: ['lantern', 'A lantern from Wendell: “You’re down there more than anyone. Take a proper light.”'],
  jeweler: ['ringvigor', 'A fire-opal ring from the jeweller: “It suits you. Don’t argue.”'],
  enchanter: ['senchant', 'A scroll of enchanting, given with a conspiratorial wink.'],
};
const FRIEND_GENERIC = [['pheal', 'a potion of healing, “for the caves”'], ['luckycharm', 'a lucky charm they have carried for years'], ['mat:truffle', 'a cave truffle, wrapped in a cloth'], ['mat:amber', 'a piece of amber with a fly in it, “for luck”'], ['pantidote', 'an antidote, “because you never know”'], ['mat:healroot', 'a bundle of healroot from their garden']];
const friendShop = who => { const pe = PEOPLE[who]; if (pe && pe.shop) return pe.shop; for (const id in SHOPS) if (SHOPS[id].npc === who) return id; return null; };
const fstate = () => { const P_ = parish(); P_.friend = P_.friend || {}; return P_.friend; };
function friendTick() {
  if (!S || !S.parish) return;
  const F = fstate(), P_ = parish();
  for (const who in P_.trust) {
    const t = trustOf(who), pe = PEOPLE[who]; if (!pe) continue;
    if (t >= 4 && !F[who]) {
      F[who] = S.day;
      const shop = friendShop(who), g = shop && FRIEND_GIFTS[shop];
      let line;
      if (g) { if (ITEMS[g[0]]) addItem(makeItem(g[0])); line = g[1]; }
      else { const [id, what] = FRIEND_GENERIC[(who.length * 7 + who.charCodeAt(0)) % FRIEND_GENERIC.length]; if (id.startsWith('mat:')) addMat(id.slice(4), 1); else addItem(makeItem(id)); line = `${pe.name} gives you ${what}.`; }
      msg(`${pe.name} counts you a close friend now. ${line}${shop ? ' Their prices are a tenth lower for you from now on.' : ''}`, 'level');
      if (typeof sfx === 'function') sfx('heal');
    }
  }
}
setInterval(() => { try { friendTick(); } catch (e) { } }, 2500);
// a friend's discount
{
  const _bp = buyPrice;
  buyPrice = function (shopId) {
    const v = _bp.apply(this, arguments);
    try { const who = Object.keys(PEOPLE).find(w => friendShop(w) === shopId); if (who && trustOf(who) >= 4) return Math.max(1, Math.round(v * 0.9)); } catch (e) { }
    return v;
  };
}
// confidants visit the temple and leave something
if (typeof templeDay === 'function') {
  const _td = templeDay;
  templeDay = function () {
    const T = tw(), before = T.lastDay;
    const r = _td.apply(this, arguments);
    try { const days = (T.lastDay || 0) - (before || T.lastDay); const conf = Object.keys(parish().trust || {}).filter(w => trustOf(w) >= 5).length; if (days > 0 && conf) T.coffer += days * conf * 2; } catch (e) { }
    return r;
  };
}
// the ledger shows each friendship
{
  const _hp = htmlParish;
  htmlParish = function () {
    let html = _hp.apply(this, arguments);
    try {
      const who = typeof ledgerSel !== 'undefined' ? ledgerSel : null; if (!who || !PEOPLE[who]) return html;
      const t = trustOf(who), shop = friendShop(who), F = fstate();
      const rows = [
        [4, 'Close friend', `A keepsake${shop ? ', and 10% off in their shop' : ''}.`, !!F[who]],
        [5, 'Confidant', 'They come up to the temple and leave something in the coffer.', t >= 5],
      ];
      const box = `<h4>Friendship</h4><ul class="pfacts fr-steps">${rows.map(([n, name, what, got]) => `<li class="${got ? 'on' : ''}"><b>${'♥'.repeat(n)} ${name}:</b> ${what}</li>`).join('')}</ul><p class="dim">Talking (up to three hearts), gifts they like (up to four) and their own troubles, solved (all five) build trust.</p>`;
      html = html.replace(/(<div class="ledger-page">[\s\S]*?)(<\/div><\/div>\s*$)/, `$1${box}$2`);
      if (!html.includes('fr-steps')) html += box;
    } catch (e) { }
    return html;
  };
}
try {
  ACHIEVEMENTS.push(['friend', 'A Friend in Town', 'Become close friends with someone (four hearts).', () => Object.keys(fstate()).length >= 1, 'life']);
  ACHIEVEMENTS.push(['beloved', 'Beloved of the Parish', 'Have five close friends.', () => Object.keys(fstate()).length >= 5, 'life']);
  ACHIEVEMENTS.push(['confidant', 'Confidant', 'Win someone’s complete trust (five hearts).', () => Object.keys(parish().trust || {}).some(w => trustOf(w) >= 5), 'life']);
} catch (e) { }
