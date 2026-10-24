// The world map: every place you've been, drawn as a chart of the valley and the mountain under it, with
// where you are, and where your tracked task leads. From a safe place (town, temple, homestead or the North
// Road, nothing hostile near) you can travel to anywhere you've already been: by Old Tam's cart along the
// roads, or down to the head of any stair you've already climbed. It takes time, more the farther you go.
// Opened by tapping the minimap, or with the World map button in the journal.

const HOUR_TURNS = Math.round(DAY_TURNS / 17);
// [id, label, x, y, group, hours from town]
const WORLD = [
  ['town', 'Brambleford', 300, 300, 'surface', 0],
  ['temple', 'Temple of the Dawn', 230, 260, 'surface', 0.2],
  ['home', 'Your homestead', 420, 320, 'surface', 0.5],
  ['wilds', 'The North Road', 300, 200, 'surface', 0.6],
  ['f1', null, 150, 160, 'forest', 1.2], ['f2', null, 90, 110, 'forest', 1.8], ['f3', null, 40, 60, 'forest', 2.4],
  ['d1', null, 360, 130, 'cave', 1.2], ['d2', null, 360, 90, 'cave', 1.6], ['d3', null, 360, 50, 'cave', 2.0],
  ['n1', null, 470, 110, 'neutral', 2.0], ['n2', null, 530, 90, 'neutral', 2.4], ['n3', null, 590, 70, 'neutral', 2.8],
  ['g1', null, 230, 20, 'g', 2.6], ['g2', null, 200, -10, 'g', 3.0], ['g3', null, 170, -40, 'g', 3.4], ['g4', null, 140, -70, 'g', 3.8],
  ['r1', null, 310, -10, 'r', 2.6], ['r2', null, 300, -45, 'r', 3.0], ['r3', null, 290, -80, 'r', 3.4], ['r4', null, 280, -115, 'r', 3.8],
  ['h1', null, 420, -10, 'h', 2.6], ['h2', null, 430, -45, 'h', 3.0], ['h3', null, 440, -80, 'h', 3.4], ['h4', null, 450, -115, 'h', 3.8],
  ['s1', null, 500, 20, 's', 2.6], ['s2', null, 530, -10, 's', 3.0], ['s3', null, 560, -40, 's', 3.4], ['s4', null, 590, -70, 's', 3.8],
  ['deep', 'The Deep', 365, -150, 'deep', 4.5],
  ['cat1', null, 200, 300, 'crypt', 0.5], ['cat2', null, 170, 330, 'crypt', 0.8], ['cat3', null, 140, 360, 'crypt', 1.1],
];
const W_COL = { surface: '#8fd16a', forest: '#4f9a4a', cave: '#c9b9a0', neutral: '#d6a85a', g: '#6aa33c', r: '#a0866e', h: '#b8c4dc', s: '#3f8f7a', deep: '#e05a3a', crypt: '#a8b4d0' };
const SAFE_MAPS = new Set(['town', 'temple', 'home', 'wilds', 'parsonage']);
const wVisited = id => !!(S.maps && S.maps[id]) && (id !== 'home' || (S.home && S.home.owned));
const wLabel = id => { const w = WORLD.find(w => w[0] === id); return (w && w[1]) || jName(id); };
function wSafe() {
  const m = curMap(); if (!(SAFE_MAPS.has(S.mapId) || S.mapId.startsWith('in_'))) return false;
  return !m.mons.some(o => (o.hunting > 0 || o.angry) && !o.peace && cheb(o, P()) <= 10);
}
function wHere() { const id = S.mapId; if (id.startsWith('in_') || id === 'parsonage') return 'town'; return id; }
function wHours(to) { const a = WORLD.find(w => w[0] === wHere()), b = WORLD.find(w => w[0] === to); if (!a || !b) return 1; return Math.max(0.3, Math.abs(a[5] - b[5]) + (a[4] !== b[4] && a[4] !== 'surface' && b[4] !== 'surface' ? 1 : 0)); }

let wSel = null;
function openWorldMap() {
  if (!S || dead) return;
  wSel = null;
  const draw = () => {
    const tr = typeof jTracked === 'function' ? jTracked() : null, tgt = tr && tr.target ? tr.target.map : null;
    const known = WORLD.filter(w => wVisited(w[0]) || w[0] === 'town');
    const minY = Math.min(...known.map(w => w[3])) - 40, maxY = Math.max(...known.map(w => w[3])) + 50;
    const lines = known.map(w => { let par; try { par = jParent(w[0]); } catch (e) { } const pw = WORLD.find(x => x[0] === par); return pw && (wVisited(pw[0]) || pw[0] === 'town') ? `<line x1="${pw[2]}" y1="${pw[3]}" x2="${w[2]}" y2="${w[3]}" class="wm-ln ${w[4]}"/>` : ''; }).join('');
    const here = wHere();
    const nodes = known.map(w => {
      const [id, , x, y, grp] = w, r = grp === 'surface' || id === 'deep' ? 11 : 7;
      return `<g class="wm-n ${id === here ? 'here' : ''} ${id === tgt ? 'tgt' : ''} ${id === wSel ? 'sel' : ''}" data-wm="${id}" tabindex="0" role="button" aria-label="${esc(wLabel(id))}">
        <circle cx="${x}" cy="${y}" r="${r + 9}" fill="transparent"/>${id === tgt ? `<circle cx="${x}" cy="${y}" r="${r + 6}" class="wm-tgt"/>` : ''}
        <circle cx="${x}" cy="${y}" r="${r}" fill="${W_COL[grp]}" class="wm-dot"/>${id === here ? `<circle cx="${x}" cy="${y}" r="${r + 3}" class="wm-here"/>` : ''}
        ${grp === 'surface' || id === 'deep' || /1$/.test(id) ? `<text x="${x}" y="${y + r + 14}" text-anchor="middle">${esc(grp === 'surface' || id === 'deep' ? wLabel(id) : wLabel(id).replace(/, level 1$/, ''))}</text>` : ''}</g>`;
    }).join('');
    const sel = wSel || here, safe = wSafe(), hrs = wHours(sel);
    const canGo = sel !== here && wVisited(sel) && safe;
    const p = P(), fare = /^(f|d|n|g|r|h|s|deep|cat)/.test(sel) ? 0 : 3;
    $('#modal-body').innerHTML = `<div class="wm-wrap"><svg viewBox="0 ${minY} 640 ${maxY - minY}" class="wm">
        <rect x="0" y="${Math.min(240, maxY)}" width="640" height="${Math.max(0, maxY - 240)}" class="wm-ground"/>
        <text x="12" y="${Math.min(232, maxY - 8)}" class="wm-cap">Under the mountain</text><text x="12" y="${Math.min(254, maxY)}" class="wm-cap">The valley</text>
        ${lines}${nodes}</svg></div>
      <div class="wm-info"><b>${esc(wLabel(sel))}</b>${sel === here ? ' <span class="dim">· you are here</span>' : ''}${tgt === sel ? ` <span class="wm-tag">${esc(tr.title)}</span>` : ''}
        <div class="btnrow">${sel !== here ? `<button class="btn ${canGo ? 'default' : ''}" data-wm-go="${sel}" ${canGo && p.gold >= fare ? '' : 'disabled'}>Travel there (${hrs < 1 ? Math.round(hrs * 60) + ' min' : hrs.toFixed(1).replace(/\.0$/, '') + ' h'}${fare ? `, ${fare} gold for the cart` : ''})</button>` : ''}</div>
        <p class="dim">${safe ? 'Tap a place you have been to travel there. Old Tam’s cart runs the valley roads; under the mountain you go back down by the ways you know, to the head of the stair.' : 'You can only set out on a long journey from town, the temple, your homestead or the North Road, with nothing hunting you.'}</p></div>`;
  };
  openModal('The Valley and the Mountain', '', { refresh: draw, wide: true }); draw();
}
function wArrive(id) {
  if (id === 'town') return goMap('town', 36, 4);
  if (id === 'wilds') return goMap('wilds', 22, 26);
  if (id === 'home') return goMap('home', HOME_ENTRY[0], HOME_ENTRY[1]);
  if (id === 'temple') return enterTemple(9, TEMPLE_SIZE[1] - 2);
  const m = getMap(id);
  let par; try { par = mapInfo(id).parent; } catch (e) { }
  const k = Object.keys(m.links).find(k => m.links[k] === par) || Object.keys(m.links)[0];
  const [x, y] = k ? k.split(',').map(Number) : [1, 1];
  // step off the stair onto open floor beside it
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (walkable(m, x + dx, y + dy) && !m.links[K(x + dx, y + dy)]) return goMap(id, x + dx, y + dy);
  goMap(id, x, y);
}
document.addEventListener('click', e => {
  const n = e.target.closest('[data-wm]'); if (n && S) { wSel = n.dataset.wm; if (typeof sfx === 'function') sfx('click'); refresh(); return; }
  const g = e.target.closest('[data-wm-go]'); if (!g || !S) return;
  const id = g.dataset.wmGo, p = P(); if (!wSafe() || !wVisited(id)) return;
  const fare = /^(f|d|n|g|r|h|s|deep|cat)/.test(id) ? 0 : 3; if (p.gold < fare) return;
  const hrs = wHours(id); p.gold -= fare;
  S.turn += Math.round(hrs * HOUR_TURNS);
  closeModal(true); wArrive(id); computeFov(); render(); autosave();
  msg(fare ? `Old Tam’s cart rattles you down the valley road to ${wLabel(id)}.` : `You make your way down by the paths you know, to ${wLabel(id)}.`, 'talk');
});
// tap the minimap to open the world map; a button in the journal too
document.addEventListener('click', e => { if (e.target.closest('#minimap') && S && !modalOpen && !dead) openWorldMap(); });
{
  const _oj = openJournal;
  openJournal = function () {
    _oj.apply(this, arguments);
    const add = () => { const b = $('#modal-body'); if (b && !b.querySelector('[data-wm-open]')) b.insertAdjacentHTML('afterbegin', '<div class="btnrow" style="margin-top:0"><button class="btn" data-wm-open="1">World map</button></div>'); };
    const d = modalRefresh; modalRefresh = () => { d(); add(); }; add();
  };
}
document.addEventListener('click', e => { if (e.target.closest('[data-wm-open]')) openWorldMap(); });
try { ACHIEVEMENTS.push(['cart', 'Old Tam’s Cart', 'Travel by the world map.', () => !!(S.story && S.story.travelled), 'explore']); } catch (e) { }
{
  const _wa = wArrive;
  wArrive = function () { S.story.travelled = 1; return _wa.apply(this, arguments); };
}
