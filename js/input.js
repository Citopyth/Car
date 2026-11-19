/* Eingabe: Tastatur und Touch-Tasten. Touch-Finger dürfen zwischen Tasten gleiten (◀ ↔ ▶).
   Tastendrücke werden zwischengespeichert, damit kein Sprung zwischen zwei Physikschritten verloren geht. */
'use strict';

(function () {
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyK: 'jump', KeyZ: 'jump', KeyY: 'jump',
    KeyX: 'action', KeyJ: 'action', KeyL: 'action', KeyC: 'action', ShiftLeft: 'action', ShiftRight: 'action', Enter: 'action',
  };
  const NAMES = ['left', 'right', 'jump', 'action'];

  const Input = {
    left: false, right: false, jump: false, action: false,
    jumpPressed: false, actionPressed: false, anyPressed: false,
    keys: {}, touch: {}, latch: {}, anyLatch: false,
    pointers: new Map(), buttons: [], layer: null,
    onPause: null, onMute: null, touchMode: false,

    init(layer) {
      this.layer = layer;
      this.buttons = Array.from(layer.querySelectorAll('[data-btn]')).map((el) => ({ name: el.dataset.btn, el, rect: null }));

      window.addEventListener('keydown', (e) => {
        if (e.target && e.target.closest && e.target.closest('button, a, input')) return;
        if (e.code === 'Escape' || e.code === 'KeyP') { if (this.onPause) this.onPause(); return; }
        if (e.code === 'KeyM') { if (this.onMute) this.onMute(); return; }
        const n = KEYMAP[e.code];
        if (!n) return;
        e.preventDefault();
        if (!e.repeat && !this.keys[n]) { this.latch[n] = true; this.anyLatch = true; }
        this.keys[n] = true;
      });
      window.addEventListener('keyup', (e) => {
        const n = KEYMAP[e.code];
        if (n) this.keys[n] = false;
      });
      window.addEventListener('blur', () => this.clear());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });

      const onDown = (e) => {
        e.preventDefault();
        if (e.pointerType === 'touch') this.setTouchMode(true);
        this.measure();
        this.anyLatch = true;
        this.pointers.set(e.pointerId, this.hit(e.clientX, e.clientY));
        this.refresh();
      };
      const onMove = (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        e.preventDefault();
        this.pointers.set(e.pointerId, this.hit(e.clientX, e.clientY));
        this.refresh();
      };
      const onUp = (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.delete(e.pointerId);
        this.refresh();
      };
      layer.addEventListener('pointerdown', onDown, { passive: false });
      layer.addEventListener('pointermove', onMove, { passive: false });
      layer.addEventListener('pointerup', onUp);
      layer.addEventListener('pointercancel', onUp);
      layer.addEventListener('lostpointercapture', onUp);
      layer.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('resize', () => this.measure());
      // Desktop: Klick ins Spielfeld zählt als "beliebige Taste" (z. B. Intro überspringen)
      document.addEventListener('pointerdown', (e) => { if (e.target && e.target.id === 'game') this.anyLatch = true; });

      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      this.setTouchMode(coarse || navigator.maxTouchPoints > 0);
    },

    setTouchMode(on) {
      if (this.touchMode === on) return;
      this.touchMode = on;
      document.body.classList.toggle('touch', on);
      this.measure();
      if (this.onTouchMode) this.onTouchMode(on);
    },

    measure() {
      for (const b of this.buttons) b.rect = b.el.getBoundingClientRect();
    },

    /* Welche Taste liegt unter dem Finger? Großzügiger Rand, nächster Mittelpunkt gewinnt. */
    hit(x, y) {
      let best = null, bestD = Infinity;
      for (const b of this.buttons) {
        const r = b.rect;
        if (!r || r.width === 0) continue;
        const m = Math.max(14, r.width * 0.22);
        if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (d < bestD) { bestD = d; best = b.name; }
      }
      return best;
    },

    refresh() {
      const held = {};
      for (const n of this.pointers.values()) if (n) held[n] = true;
      for (const n of NAMES) {
        if (held[n] && !this.touch[n]) this.latch[n] = true;
        this.touch[n] = !!held[n];
      }
      for (const b of this.buttons) b.el.classList.toggle('on', !!held[b.name]);
    },

    clear() {
      this.keys = {}; this.touch = {}; this.latch = {};
      this.pointers.clear();
      for (const b of this.buttons) b.el.classList.remove('on');
    },

    /* Einmal pro Physikschritt aufrufen */
    poll() {
      for (const n of NAMES) this[n] = !!(this.keys[n] || this.touch[n]);
      this.jumpPressed = !!this.latch.jump;
      this.actionPressed = !!this.latch.action;
      this.anyPressed = this.anyLatch;
      this.latch = {}; this.anyLatch = false;
    },
  };

  ALO.Input = Input;
})();
