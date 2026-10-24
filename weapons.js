// The Temple Warden — icons for the newer weapons: crossbow, war hammer, flail, greatsword, rapier and halberd.
// Each is drawn on the diagonal like the older weapon icons, its metal tinted by grade.
'use strict';

const METAL = { iron: ['#5f646a', '#8a8f96', '#b4b9bf'], steel: ['#7a848e', '#c9d1d8', '#eef2f5'], silver: ['#9aa0a8', '#e2e6ee', '#ffffff'], mithril: ['#3b7aa0', '#7fd0f5', '#d8f4ff'] };
const NEW_WEAPON_ART = {
  crossbow: (F, P, M) => { for (let k = 0; k < 20; k++) F(7 + k * 0.9, 24 - k * 0.9, 3, 3, k < 6 ? '#4a2e16' : '#6b4423'); for (let t = -9; t <= 9; t++) { const x = 21 + t * 0.7 + Math.round(t * t / 22), y = 10 + t * 0.7 - Math.round(t * t / 22); F(x, y, 2, 2, M[1]); } F(14, 18, 2, 2, M[2]); for (let t = -7; t <= 7; t++) P(17 + t * 0.7, 14 + t * 0.7, '#e8e1c8'); F(24, 6, 3, 3, M[0]); },
  warhammer: (F, P, M) => { for (let k = 0; k < 20; k++) F(6 + k, 26 - k, 2, 2, k < 4 ? '#3a2410' : '#6b4423'); F(19, 4, 10, 7, M[0]); F(20, 5, 8, 5, M[1]); F(20, 5, 8, 1, M[2]); F(16, 6, 4, 3, M[0]); },
  flail: (F, P, M) => { for (let k = 0; k < 10; k++) F(6 + k, 26 - k, 2, 2, '#6b4423'); for (let k = 0; k < 6; k++) P(17 + k, 15 - k, M[0]); for (let a = 0; a < 6.28; a += 0.2) for (let r = 0; r < 4.5; r += 1) P(Math.round(25 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), r > 3.5 ? M[0] : M[1]); P(23, 6, M[2]); for (const [x, y] of [[25, 2], [31, 8], [25, 14], [19, 8]]) F(x - 1, y - 1, 2, 2, M[0]); },
  greatsword: (F, P, M) => { for (let k = 0; k < 5; k++) F(3 + k, 28 - k, 2, 2, '#3a2410'); F(6, 22, 8, 2, '#c8a03a'); F(9, 19, 2, 8, '#c8a03a'); for (let k = 0; k < 18; k++) { F(10 + k, 21 - k, 3, 3, M[1]); P(10 + k, 21 - k, M[2]); } P(29, 2, M[2]); },
  rapier: (F, P, M) => { for (let k = 0; k < 4; k++) F(4 + k, 27 - k, 2, 2, '#3a2a20'); for (let a = 0; a < 6.28; a += 0.4) P(Math.round(9 + Math.cos(a) * 3), Math.round(22 + Math.sin(a) * 3), '#c8a03a'); for (let k = 0; k < 20; k++) { P(10 + k, 21 - k, M[1]); P(11 + k, 21 - k, M[2]); } },
  halberd: (F, P, M) => { for (let k = 0; k < 26; k++) F(3 + k, 29 - k, 2, 2, k % 7 === 0 ? '#4a2e16' : '#6b4423'); F(23, 4, 7, 8, M[0]); F(24, 5, 5, 6, M[1]); F(24, 5, 5, 1, M[2]); F(28, 1, 2, 4, M[1]); F(19, 9, 4, 3, M[0]); },
};
{
  const cache = {};
  const _ic = itemCanvas;
  itemCanvas = function (id) {
    const t = ITEMS[id];
    if (!t || t.slot !== 'weapon' || !NEW_WEAPON_ART[t.cls]) return _ic(id);
    if (cache[id]) return cache[id];
    const M = METAL[t.grade] || METAL.iron;
    return cache[id] = nativeProp(32, 32, ({ F, P }) => NEW_WEAPON_ART[t.cls]((x, y, w, h, c) => F(x, y, w, h, c), (x, y, c) => P(Math.round(x), Math.round(y), c), M));
  };
}
