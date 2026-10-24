// Accessibility, kept per device: larger text for the panels and windows, a colour-blind-friendly palette
// (orange and blue instead of red and green for danger and safety), calm mode (no screen shake or red hurt
// flash), and keys you can rebind for every action.

const A11Y = { text: 1, cb: false, calm: false, keys: {} };
try { Object.assign(A11Y, JSON.parse(localStorage.getItem('tw-a11y') || '{}')); } catch (e) { }
const a11ySave = () => { try { localStorage.setItem('tw-a11y', JSON.stringify(A11Y)); } catch (e) { } };
function a11yApply() {
  document.documentElement.style.setProperty('--ui-zoom', A11Y.text);
  document.body.classList.toggle('bigtext', A11Y.text > 1);
  document.body.classList.toggle('cb', !!A11Y.cb);
  document.body.classList.toggle('calm', !!A11Y.calm);
  if (S) render();
}
a11yApply();
if (typeof shake === 'function') { const _sh = shake; shake = function () { if (A11Y.calm) return; return _sh.apply(this, arguments); }; }

// ---------- rebinding ----------
// Each action has its default key; you may give it another. Pressing yours sends the default to the game.
const BINDABLE = [
  ['swing', 'Swing / attack', ' '], ['dodge', 'Dodge roll', 'z'], ['block', 'Block (hold)', 'x'], ['get', 'Pick up', 'g'],
  ['rest', 'Rest', 'r'], ['torch', 'Set down a torch', 't'], ['fire', 'Shoot your bow', 'f'], ['sneak', 'Sneak', 'm'],
  ['pray', 'Pray', 'v'], ['inv', 'Inventory', 'i'], ['spells', 'Spells', 'c'], ['char', 'Character', 'p'],
  ['journal', 'Journal', 'q'], ['codex', 'Codex', 'e'], ['options', 'Options', 'o'],
];
const keyLabel = k => k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k;
let bindWaiting = null;
function a11yKeyFor(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  for (const [id, , def] of BINDABLE) { const mine = A11Y.keys[id]; if (mine && mine === k && mine !== def) return def; }
  return null;
}
for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, e => {
    if (e.__a11y || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (bindWaiting && type === 'keydown') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key !== 'Escape') { A11Y.keys[bindWaiting] = e.key.length === 1 ? e.key.toLowerCase() : e.key; a11ySave(); }
      bindWaiting = null; if (typeof refresh === 'function') refresh(); return;
    }
    const def = a11yKeyFor(e); if (!def) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const ev = new KeyboardEvent(type, { key: def, code: def === ' ' ? 'Space' : 'Key' + def.toUpperCase(), bubbles: true, cancelable: true, repeat: e.repeat, shiftKey: e.shiftKey });
    ev.__a11y = 1; (document.activeElement || document.body).dispatchEvent(ev);
  }, true);
}

// ---------- the options ----------
{
  const _ho = htmlOptions;
  htmlOptions = function () {
    const t = A11Y.text;
    return _ho.apply(this, arguments) + `<h3>Accessibility</h3>
      <div class="opt"><span><b>Text size</b><small>Makes the panels, menus and windows larger.</small></span></div>
      <div class="filters">${[[1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger'], [1.45, 'Largest']].map(([v, l]) => `<button class="${t === v ? 'on' : ''}" data-ay="text:${v}">${l}</button>`).join('')}</div>
      <label class="opt"><input type="checkbox" data-ay="cb" ${A11Y.cb ? 'checked' : ''}><span><b>Colour-blind friendly colours</b><small>Danger in orange and safety in blue, instead of red and green: health bars, warnings, the minimap and the flash before a foe strikes.</small></span></label>
      <label class="opt"><input type="checkbox" data-ay="calm" ${A11Y.calm ? 'checked' : ''}><span><b>Calm mode</b><small>No screen shake and no red flash when you’re hurt.</small></span></label>
      <h3>Keys</h3><p class="dim">Tap an action, then press the key you want for it (Esc to cancel). Movement stays on the arrows, WASD and the number pad.</p>
      <div class="keybinds">${BINDABLE.map(([id, label, def]) => `<button class="kb ${bindWaiting === id ? 'wait' : ''}" data-ay="bind:${id}"><span>${label}</span><kbd>${bindWaiting === id ? 'press a key…' : keyLabel(A11Y.keys[id] || def)}</kbd></button>`).join('')}</div>
      <div class="btnrow"><button class="btn ghost" data-ay="resetkeys">Reset all keys</button></div>`;
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ay]'); if (!b) return;
  const [k, v] = b.dataset.ay.split(':');
  if (k === 'text') { A11Y.text = +v; a11ySave(); a11yApply(); }
  else if (k === 'bind') { bindWaiting = v; }
  else if (k === 'resetkeys') { A11Y.keys = {}; a11ySave(); }
  else return;
  if (typeof refresh === 'function') refresh();
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-ay]'); if (!b) return;
  const k = b.dataset.ay; if (k === 'cb' || k === 'calm') { A11Y[k] = b.checked; a11ySave(); a11yApply(); }
});
