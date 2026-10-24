// Save safety: a rolling backup of each slot, and export / import of a save as a file you keep yourself.
// Backups live beside the slot (this browser and your account), refreshed at most every 10 minutes of play.

const backupKey = n => 'tw-backup-' + n;
const backupDoc = n => storeDb ? storeDb.doc(storeBase + '/backup' + n) : null;
let lastBackup = 0;
async function readBackup(n) {
  let best = null;
  try { const r = JSON.parse(localStorage.getItem(backupKey(n)) || 'null'); if (r && r.json) best = r; } catch (e) { }
  const doc = backupDoc(n);
  if (doc) { try { const snap = await doc.get(); if (snap.exists) { const d = snap.data(); if (d && d.json && (!best || d.at > best.at)) best = d; } } catch (e) { } }
  return best;
}
async function writeBackup(n, data) {
  try { localStorage.setItem(backupKey(n), JSON.stringify(data)); } catch (e) { }
  const doc = backupDoc(n); if (doc) { try { await doc.set(data); } catch (e) { } }
}
{
  const _sg = saveGame;
  saveGame = async function (loud, slot) {
    // before overwriting the slot, keep what was there as the backup (at most every 10 minutes, or on a manual save)
    const n = slot || saveSlot;
    if (S && !dead && (loud || Date.now() - lastBackup > 10 * 60000)) {
      try { const prev = await readSlot(n); if (prev && prev.json) { lastBackup = Date.now(); await writeBackup(n, Object.assign({}, prev, { slot: n })); } } catch (e) { }
    }
    return _sg.apply(this, arguments);
  };
  // hardcore and ironman: when the hero dies, the backup goes too
  const _es = eraseSave;
  eraseSave = async function () { try { localStorage.removeItem(backupKey(saveSlot)); const d = backupDoc(saveSlot); if (d) await d.set({ json: null, at: Date.now() }); } catch (e) { } return _es.apply(this, arguments); };
}

function saveFileName() {
  const p = P(); return `temple-warden-${(p.name || 'hero').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-day${S.day}.json`;
}
async function exportSave() {
  if (!S) return;
  const data = JSON.stringify(Object.assign({ format: 'temple-warden-save', exported: Date.now(), json: serialize() }, slotSummary()));
  // inside claude.ai the page asks the viewer to save the file; elsewhere, a plain browser download
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { }
  if (dl) {
    try { await dl.save({ filename: saveFileName(), data }); msg('Save exported as a file. Keep it somewhere safe.', 'good'); }
    catch (e) { if (e && e.code === 'declined') msg('Export cancelled.'); else msg('The file could not be saved here. Use "Copy save code" instead.', 'warn'); }
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = saveFileName(); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    msg('Save exported as a file. Keep it somewhere safe.', 'good');
  } catch (e) { msg('This browser would not save the file. Use "Copy save code" instead.', 'warn'); }
}
async function copySave() {
  if (!S) return;
  const data = JSON.stringify(Object.assign({ format: 'temple-warden-save', exported: Date.now(), json: serialize() }, slotSummary()));
  try { await navigator.clipboard.writeText(data); msg('Save code copied. Paste it into a note to keep it.', 'good'); }
  catch (e) { const t = document.getElementById('sv-code'); if (t) { t.value = data; t.select(); } msg('Select the code in the box and copy it yourself.', 'warn'); }
}
function importText(text) {
  let r; try { r = JSON.parse(text.trim()); } catch (e) { msg('That is not a Temple Warden save.', 'warn'); return; }
  if (!r || !r.json) { msg('That is not a Temple Warden save.', 'warn'); return; }
  let s; try { s = migrate(deserialize(r.json)); } catch (e) { msg('That save could not be read.', 'warn'); return; }
  S = s; dead = false; if (typeof hideTitle === 'function') hideTitle(); closeModal(true);
  saveGame(false); msg(`Save imported into slot ${saveSlot}: ${S.player.name}, day ${S.day}.`, 'good'); computeFov(); render(); renderLog();
}
async function restoreBackup() {
  const b = await readBackup(saveSlot); if (!b) { msg('There is no backup for this slot yet.'); return; }
  S = migrate(deserialize(b.json)); dead = false; closeModal(true);
  await writeSlot(saveSlot, Object.assign({}, b, { at: Date.now() }));
  msg(`Restored the backup from ${timeAgo(b.at)}.`, 'good'); computeFov(); render(); renderLog();
}

let backupInfo = null, backupSlot = 0, backupAt = 0;
{
  const _hs = htmlSave;
  htmlSave = function () {
    if (backupInfo === null || backupSlot !== saveSlot || Date.now() - backupAt > 30000) { backupInfo = 'loading'; backupSlot = saveSlot; backupAt = Date.now(); readBackup(saveSlot).then(b => { backupInfo = b ? { at: b.at, day: b.day, name: b.name } : false; if (modalRefresh) modalRefresh(); }); }
    const one = S && (S.hardcore || DIFF().final);
    const bk = backupInfo && backupInfo !== 'loading' ? `Backup from ${timeAgo(backupInfo.at)}${backupInfo.day ? ` (day ${backupInfo.day})` : ''}.` : backupInfo === 'loading' ? 'Looking for a backup…' : 'No backup yet. One is made the next time the game saves.';
    return _hs() + `
      <h3>Backups</h3><p class="dim">Every save goes to this browser and to your claude.ai account. Before a slot is overwritten, the game keeps the old copy as a backup, refreshed every 10 minutes of play or whenever you press Save now.</p>
      <p>${bk}</p>
      ${one ? '<p class="dim">Hardcore and Ironman heroes cannot restore a backup.</p>' : `<div class="btnrow"><button class="btn" data-sv="restore" ${backupInfo && backupInfo !== 'loading' ? '' : 'disabled'}>Restore the backup</button></div>`}
      <h3>Keep a copy yourself</h3><p class="dim">Export a file to keep on your device or in iCloud, or copy the save as text into a note. Import it later to pick up from there, even on another device.</p>
      <div class="btnrow"><button class="btn" data-sv="export">Export save file</button><button class="btn" data-sv="copy">Copy save code</button></div>
      <h3>Import a save</h3><p class="dim">Replaces the game in slot ${saveSlot} with the imported one.</p>
      <div class="btnrow"><label class="btn sv-file">Choose a save file<input type="file" accept=".json,application/json,text/plain" data-sv="file" hidden></label></div>
      <textarea id="sv-code" class="sv-code" placeholder="…or paste a save code here" rows="3"></textarea>
      <div class="btnrow"><button class="btn" data-sv="paste">Import pasted code</button></div>`;
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sv]'); if (!b || b.dataset.sv === 'file') return;
  const v = b.dataset.sv;
  if (v === 'export') exportSave();
  else if (v === 'copy') copySave();
  else if (v === 'restore') { if (confirm('Go back to the backup? Anything since then in this slot will be lost.')) restoreBackup(); }
  else if (v === 'paste') { const t = document.getElementById('sv-code'); if (t && t.value.trim() && confirm(`Replace the game in slot ${saveSlot} with this save?`)) importText(t.value); }
});
document.addEventListener('change', e => {
  const f = e.target.closest('[data-sv="file"]'); if (!f || !f.files || !f.files[0]) return;
  const file = f.files[0]; f.value = '';
  file.text().then(t => { if (confirm(`Replace the game in slot ${saveSlot} with ${file.name}?`)) importText(t); });
});
