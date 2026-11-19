/* Einstieg */
'use strict';

(function () {
  ALO.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Safari: Pinch-Zoom-Gesten im Spiel unterbinden
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  ALO.Input.init(document.getElementById('touch'));
  const game = new ALO.Game(document.getElementById('game'));
  game.initUI();
  ALO.game = game; // für Tests und Fehlersuche
})();
