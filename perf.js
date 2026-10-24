// Performance: the map is redrawn many times a second for flickering lamps, water and weather. On a phone with
// a 3× screen that is a lot of pixels, so the canvas is capped at 2× density (1× in Battery saver), and the
// redraw slows down when nothing is happening: no input for a while and nothing hostile nearby.
// These are settings for this device, kept in the browser, not in the save.

const PERF = { saver: false, lastInput: performance.now() };
try { PERF.saver = localStorage.getItem('tw-saver') === '1'; } catch (e) { }
{
  const real = window.devicePixelRatio || 1;
  try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => Math.min(real, PERF.saver ? 1 : 2) }); } catch (e) { }
  try { if (typeof resizeCanvas === 'function' && document.readyState !== 'loading') resizeCanvas(); } catch (e) { }
}
for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) window.addEventListener(ev, () => { PERF.lastInput = performance.now(); }, { passive: true, capture: true });
// milliseconds between ambient redraws
function frameBudget() {
  const idle = performance.now() - PERF.lastInput;
  const busy = typeof AC !== 'undefined' && AC.on || typeof anyMoving !== 'undefined' && anyMoving || typeof driving !== 'undefined' && driving;
  if (busy) return PERF.saver ? 50 : 33;
  if (idle > 45000) return PERF.saver ? 250 : 125;   // put the phone down and it barely ticks over
  if (idle > 12000) return PERF.saver ? 100 : 66;
  return PERF.saver ? 66 : 33;
}
function setSaver(on) {
  PERF.saver = !!on; try { localStorage.setItem('tw-saver', on ? '1' : '0'); } catch (e) { }
  try { resizeCanvas(); } catch (e) { } if (S) render();
}
{
  const _ho = htmlOptions;
  htmlOptions = function () {
    return _ho.apply(this, arguments) + `<h3>Performance</h3>
      <label class="opt"><input type="checkbox" data-perf="saver" ${PERF.saver ? 'checked' : ''}><span><b>Battery saver</b><small>Draws the map at a lower resolution and refreshes it less often. Smoother on older phones and easier on the battery. The game always slows its redraw when you leave it idle.</small></span></label>`;
  };
}
document.addEventListener('change', e => { const b = e.target.closest('[data-perf="saver"]'); if (b) setSaver(b.checked); });
