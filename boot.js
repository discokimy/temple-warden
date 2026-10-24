// Loaded before everything else. The game keeps a couple of dozen small timers (NPC strolling, the combat clock,
// the bestiary's notes, the temple's coffer...). None of them needs to run while the page is hidden: another app
// in front, or the phone locked. Skipping them then saves battery, and nothing is lost; each catches up next tick.
'use strict';
{
  const _si = window.setInterval.bind(window);
  window.setInterval = function (fn, ms, ...args) {
    if (typeof fn !== 'function') return _si(fn, ms, ...args);
    return _si(function () { if (document.hidden) return; return fn.apply(this, args); }, ms);
  };
}
