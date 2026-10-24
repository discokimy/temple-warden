// Buildings in the same hand as the people: a dark ink line round every roof and wall, a few flat cel-shaded
// tones instead of smooth gradients, and the same top-left light the figures get. Applied to the finished
// building art once, as it is cached, so it costs nothing per frame. Options › Display can switch it off.

let BLD_INK = true;
try { BLD_INK = localStorage.getItem('tw-inked') !== '0'; } catch (e) { }
function inkCanvas(src) {
  const W = src.width, H = src.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data, s = new Uint8ClampedArray(d);
  const A = (x, y) => x >= 0 && y >= 0 && x < W && y < H && s[(y * W + x) * 4 + 3] > 40;
  const lum = i => 0.3 * s[i] + 0.59 * s[i + 1] + 0.11 * s[i + 2];
  const INK = [27, 20, 36];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (s[i + 3] <= 40) continue;
    let r = s[i], gg = s[i + 1], b = s[i + 2];
    // 1. the silhouette gets an ink line, tinted a little by what it borders, as the figures' outlines are
    const edge = !A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || (!A(x, y + 1) && y < H - 1);
    if (edge) { d[i] = INK[0] * 0.78 + r * 0.22; d[i + 1] = INK[1] * 0.78 + gg * 0.22; d[i + 2] = INK[2] * 0.78 + b * 0.22; d[i + 3] = 255; continue; }
    // 2. cel tones: lightness snapped into bands, hue kept
    const L = lum(i), band = Math.round(L / 22) * 22, k = L > 1 ? Math.max(0.6, Math.min(1.4, (band + 6) / (L + 6))) : 1;
    r *= k; gg *= k; b *= k;
    // 3. strong edges inside the art (a window frame against the wall, a roof against the sky) deepen into a soft line
    const right = (y * W + x + 1) * 4, below = ((y + 1) * W + x) * 4;
    if (x < W - 1 && y < H - 1 && (Math.abs(lum(i) - lum(right)) > 70 || Math.abs(lum(i) - lum(below)) > 70) && lum(i) < Math.max(lum(right), lum(below))) { r = r * 0.55 + INK[0] * 0.45; gg = gg * 0.55 + INK[1] * 0.45; b = b * 0.55 + INK[2] * 0.45; }
    // 4. the figures' light: a bright rim along the top, a cool shade along the bottom
    else if (!A(x, y - 2)) { r += (255 - r) * 0.16; gg += (244 - gg) * 0.16; b += (214 - b) * 0.16; }
    else if (!A(x, y + 2) && y < H - 2) { r *= 0.82; gg *= 0.8; b = b * 0.88 + 8; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
  return c;
}
if (typeof buildingArt === 'function') {
  const _ba = buildingArt;
  buildingArt = function () { const c = _ba.apply(this, arguments); try { return BLD_INK ? inkCanvas(c) : c; } catch (e) { return c; } };
}
function setInked(on) {
  BLD_INK = !!on; try { localStorage.setItem('tw-inked', on ? '1' : '0'); } catch (e) { }
  if (typeof buildingCache !== 'undefined') buildingCache.clear();
  if (typeof bakeCache !== 'undefined' && bakeCache.clear) bakeCache.clear();
  if (S) render();
}
{
  const _ho = htmlOptions;
  htmlOptions = function () {
    return _ho.apply(this, arguments).replace('<h3>Performance</h3>', `<h3>Buildings</h3>
      <label class="opt"><input type="checkbox" data-inked="1" ${BLD_INK ? 'checked' : ''}><span><b>Inked buildings</b><small>Roofs and walls drawn with the same ink line and flat shading as the people. Turn off for the softer painted look.</small></span></label>
      <h3>Performance</h3>`);
  };
}
document.addEventListener('change', e => { const b = e.target.closest('[data-inked]'); if (b) setInked(b.checked); });
