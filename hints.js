// Tips: a short word the first time you meet each system, so nothing is a mystery and nothing is a lecture.
// Each shows once per hero, as a banner and a line in the log. Options can turn them off.

let TIPS_ON = true; try { TIPS_ON = localStorage.getItem('tw-tips') !== '0'; } catch (e) { }
const tipNear = (m, test, r = 6) => { const p = P(); for (const k in m.decor) { const [x, y] = k.split(',').map(Number); if (Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) <= r && test(m.decor[k], x, y)) return true; } return false; };
const TIPS = [
  ['cave', () => curMap().theme === 'cave' && !curMap().lit, 'Caves are dark. Your torch burns down as you walk; carry spares, or buy a lantern from Wendell. Ore veins glint in the walls.'],
  ['lowhp', () => P().hp < maxHp() * 0.3, 'You’re badly hurt. Drink a healing potion from your hotbar, eat a meal, or rest (R) somewhere safe.'],
  ['shrine', () => tipNear(curMap(), d => /^shrine_/.test(d)), 'A god’s shrine. Walk into it to learn its trial. Each god you earn gives you a once-a-day power.'],
  ['kill', () => P().kills >= 1, 'Everything you meet and kill is written in the Codex (E): what it is, what it’s weak to, what it carries.'],
  ['heavy', () => typeof burden === 'function' && burden() >= 1, 'You’re carrying a lot, and it’s slowing you down. Sell, stash at your homestead, or drop what you don’t need.'],
  ['night', () => typeof dayLight === 'function' && dayLight().night > 0.6 && isOpenAir(curMap()), 'Night has fallen. Shops close, folk go home, and the woods get more dangerous. Rest at the inn or your own bed to see the morning.'],
  ['market', () => S.mapId === 'n1', 'The Midden Market, under truce: no one fights here. Each trader can teach you their kingdom’s tongue, and then that kingdom will talk to you instead of attacking.'],
  ['champion', () => (S.bounties || []).length > 0, 'A champion: a named, tougher creature carrying real loot. Its bounty is on the Market Board, and in your journal.'],
  ['magic', () => [...(P().inv || [])].some(i => i && i.aff), 'You found a magic item. Its properties are listed in your pack; magic gear gets more common the deeper you go.'],
  ['gift', () => P().gift && (typeof giftLeft === 'function') && giftLeft() > 0 && S.day >= 1 && P().kills >= 2, 'Your Gift is on the hotbar. It recharges every time you sleep, so don’t save it forever.'],
  ['meal', () => Object.keys(P().mats || {}).some(id => MATS[id] && MATS[id].cat === 'food' && P().mats[id] > 0), 'Raw food can be cooked into meals that heal and leave you Well Fed: Crafting › Kitchen. A campfire costs one wood.'],
  ['companion', () => S.comp, 'Your companion follows you everywhere and fights at your side. Walk into them to tell them to wait, swap places, or go home.'],
  ['grate', () => S.story && S.story.grateSeen, 'The temple’s restoration is paid for at the alms box: Temple Works. The grate is one of the jobs.'],
  ['town', () => S.mapId === 'town' && S.day >= 2, 'Tap the minimap any time for the world map. From town you can travel anywhere you’ve already been.'],
];
function tipTick() {
  if (!S || dead || modalOpen || !TIPS_ON) return;
  // a hero who has been about a while already knows the basics: don't drown them in tips
  if (!S.tips) { S.tips = {}; if (S.day > 3 || P().level > 3) for (const [id] of TIPS) S.tips[id] = S.day; }
  const seen = S.tips;
  for (const [id, test, text] of TIPS) {
    if (seen[id]) continue; let ok = false; try { ok = !!test(); } catch (e) { }
    if (!ok) continue;
    seen[id] = S.day; msg(`Tip: ${text}`, 'news'); showTip(text);
    return; // one at a time
  }
}
setInterval(() => { try { tipTick(); } catch (e) { } }, 2500);
{
  const _ho = htmlOptions;
  htmlOptions = function () { return _ho.apply(this, arguments).replace('<h3>Performance</h3>', `<h3>Tips</h3><label class="opt"><input type="checkbox" data-tips="1" ${TIPS_ON ? 'checked' : ''}><span><b>Show tips</b><small>A short word the first time you meet each part of the game.</small></span></label><h3>Performance</h3>`); };
}
document.addEventListener('change', e => { const b = e.target.closest('[data-tips]'); if (!b) return; TIPS_ON = b.checked; try { localStorage.setItem('tw-tips', TIPS_ON ? '1' : '0'); } catch (er) { } });

// a small card in the corner, never over the middle of the map: it fades by itself, or tap ✕
let tipTimer = 0;
function showTip(text) {
  let el = document.getElementById('tipcard');
  if (!el) {
    el = document.createElement('div'); el.id = 'tipcard'; el.setAttribute('role', 'status');
    el.addEventListener('click', e => { if (e.target.closest('.tip-x')) hideTip(); });
    (document.querySelector('.game') || document.body).appendChild(el);
  }
  el.innerHTML = `<span class="tip-k">Tip</span><span class="tip-t">${esc(text)}</span><button class="tip-x" aria-label="Dismiss tip">✕</button>`;
  el.classList.add('show'); clearTimeout(tipTimer);
  tipTimer = setTimeout(hideTip, Math.min(12000, 4000 + text.length * 45));
}
function hideTip() { const el = document.getElementById('tipcard'); if (el) el.classList.remove('show'); clearTimeout(tipTimer); }
