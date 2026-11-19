/* Ablauf (Titel, Intro, Patrouille, Boss, Sieg, Game Over) und DOM-Oberfläche */
'use strict';

(function () {
  const T = ALO.TILE;
  const G = ALO.Game.prototype;
  const $ = (id) => document.getElementById(id);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  };

  /* ---------------- Oberfläche ---------------- */
  G.initUI = function () {
    this.ui = {
      overlays: { title: $('title'), pause: $('pause'), gameover: $('gameover'), complete: $('complete') },
      titleArt: $('titleArt'), rotate: $('rotate'), probe: $('safeProbe'),
      btnSound: $('btnSound'), btnFull: $('btnFull'),
    };
    const on = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); fn(); });
    on('btnPlay', () => this.startGame());
    on('btnPause', () => this.togglePause());
    on('btnSound', () => this.toggleMute());
    on('btnFull', () => this.toggleFullscreen());
    on('btnResume', () => this.resume());
    on('btnRestartP', () => this.startGame());
    on('btnTitleP', () => this.showTitle());
    on('btnRetry', () => this.startGame());
    on('btnTitleG', () => this.showTitle());
    on('btnAgain', () => this.startGame());
    on('btnTitleC', () => this.showTitle());
    this.input.onPause = () => this.togglePause();
    this.input.onTouchMode = () => this.resize();
    this.input.onMute = () => this.toggleMute();

    const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    this.ui.btnFull.hidden = !fsOk;
    this.updateSoundButton();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.isPlaying()) this.pause(); }
      else if (this.isPlaying()) this.requestScreenLock();
    });

    // Titelbild-Canvas
    const c = this.ui.titleArt;
    if (c) this.titleCtx = c.getContext('2d');

    const best = ALO.store.get('best', null);
    if (best) $('bestLine').textContent = 'Bestzeit: ' + fmtTime(best.time) + ' · ' + best.apps + '/5 Apps · ' + best.bits + ' Bits';

    this.showTitle();
    this.resize();
  };

  G.isPlaying = function () {
    return ['intro', 'play', 'frozen', 'fell'].includes(this.state);
  };

  G.showOverlay = function (name) {
    for (const [k, el] of Object.entries(this.ui.overlays)) el.hidden = k !== name;
    const el = name && this.ui.overlays[name];
    if (el) { const b = el.querySelector('.primary'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
    document.body.classList.toggle('playing', !name);
  };

  G.updateSoundButton = function () {
    const m = ALO.Audio.muted;
    this.ui.btnSound.classList.toggle('off', m);
    this.ui.btnSound.setAttribute('aria-label', m ? 'Ton einschalten' : 'Ton ausschalten');
  };

  G.toggleMute = function () {
    ALO.Audio.init();
    ALO.Audio.setMuted(!ALO.Audio.muted);
    this.updateSoundButton();
  };

  G.toggleFullscreen = function () {
    const d = document, el = d.documentElement;
    if (!(d.fullscreenElement || d.webkitFullscreenElement)) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return;
      Promise.resolve(req.call(el)).then(() => {
        try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* optional */ }
      }).catch(() => {});
    } else {
      const ex = d.exitFullscreen || d.webkitExitFullscreen;
      if (ex) Promise.resolve(ex.call(d)).catch(() => {});
    }
  };

  /* Echter Bildschirm-Wake-Lock, damit das Handy beim Spielen nicht abdunkelt */
  G.requestScreenLock = async function () {
    try {
      if ('wakeLock' in navigator && !this.screenLock) {
        this.screenLock = await navigator.wakeLock.request('screen');
        this.screenLock.addEventListener('release', () => { this.screenLock = null; });
      }
    } catch (e) { this.screenLock = null; }
  };

  G.releaseScreenLock = function () {
    try { if (this.screenLock) this.screenLock.release(); } catch (e) { /* egal */ }
    this.screenLock = null;
  };

  G.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    // Im Touch-Modus liegt unter dem Level ein Streifen Untergrund, damit Termi nicht hinter den Tasten steht.
    this.bottomPad = this.input.touchMode ? 56 : 0;
    const needH = ALO.LEVEL_H + this.bottomPad;
    this.scale = Math.min(h / needH, w / 480);
    this.viewW = w / this.scale; this.viewH = h / this.scale;
    this.offsetY = this.viewH > needH ? (this.viewH - needH) * 0.32 : 0;
    this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    ALO.Art.buildBackground(this.scale * this.dpr);
    if (this.ui) {
      const cs = getComputedStyle(this.ui.probe);
      const px = (v) => (parseFloat(v) || 0) / this.scale;
      this.safe = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
      this.ui.rotate.hidden = !(h > w * 1.1);
      const c = this.ui.titleArt;
      if (c) {
        const r = c.getBoundingClientRect();
        c.width = Math.max(1, Math.round(r.width * this.dpr)); c.height = Math.max(1, Math.round(r.height * this.dpr));
      }
    }
    this.input.measure();
  };

  /* ---------------- Titel ---------------- */
  G.showTitle = function () {
    this.loadLevel();
    this.setState('title');
    ALO.Audio.stopMusic();
    this.releaseScreenLock();
    this.showOverlay('title');
    setTimeout(() => this.resize(), 0);
  };

  G.drawTitleArt = function () {
    const c = this.ui.titleArt, ctx = this.titleCtx;
    if (!c || !c.width) return;
    const s = c.height / 120;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const w = c.width / s, t = this.t;
    ctx.fillStyle = '#23606e'; ctx.fillRect(0, 100, w, 20);
    ctx.fillStyle = '#4fc9a4'; ctx.fillRect(0, 98, w, 6);
    const hop = Math.abs(Math.sin(t * 3.2)) * 16;
    const termi = { x: w * 0.3 - 10, y: 72 - hop, w: 20, h: 28, vx: 0, facing: 1, frost: 0.18 + 0.12 * Math.sin(t), wakelock: 0, inv: 0,
      frozen: false, sx: 1, sy: hop < 2 ? 0.92 : 1.05, onGround: hop < 2, riding: null, walkT: 0, typing: Math.sin(t * 2) > 0.85 ? 1 : 0 };
    ALO.Art.termi(ctx, termi, t);
    const olaf = { x: w * 0.68 - 26, y: 22 + Math.sin(t * 2) * 4, w: 52, h: 60, facing: -1, frozen: false, frost: 0, shakeT: 0, beam: null,
      bubble: { t: 1 }, expr: 'smug', state: 'idle', iceHp: 3 };
    ALO.Art.olaf(ctx, olaf, t);
    const fx = w * 0.5 + Math.sin(t * 1.6) * 10, fy = 60 + Math.cos(t * 2.1) * 6;
    ALO.Art.snowflake(ctx, { x: fx, y: fy, rot: t * 3 });
  };

  /* ---------------- Spielstart & Intro ---------------- */
  G.startGame = function () {
    ALO.Audio.init(); ALO.Audio.resume();
    ALO.Audio.tempo = 132;
    ALO.Audio.startMusic(132);
    this.requestScreenLock();
    this.loadLevel();
    this.showOverlay(null);
    this.input.clear();
    this.resize();
    if (this.introSeen) this.beginPlay();
    else this.beginIntro();
  };

  G.beginIntro = function () {
    this.setState('intro');
    this.seqT = 0; this.timeline = [];
    const p = this.player, app = this.apps[0];
    p.control = false; this.frostEnabled = false;
    app.state = 'awake';
    const o = (this.introOlaf = this.spawn(new ALO.Olaf(this.cam.x + this.viewW + 60, -40, 'script')));
    const focus = ALO.clamp(app.x - this.viewW * 0.62, 0, this.level.pxW - this.viewW);
    this.after(0.1, () => { o.target = { x: app.x - 80, y: 150, speed: 230 }; this.camFocus = { x: focus }; });
    this.after(1.7, () => this.say(o, 'Hier spricht O.L.A.F., Offizieller Leerlauf-Abschalt-Funktionär!', 2.8));
    this.after(4.6, () => this.say(o, 'Diese App steht still. Reine Verschwendung!', 2.3));
    this.after(7.0, () => {
      o.beam = { x: app.x + app.w / 2, y: app.y + app.h / 2, t: 0.6 };
      app.freeze(); this.sfx('freeze');
      this.burst(app.x + app.w / 2, app.y + app.h / 2, '#ffffff', 16);
      this.log('olaf: freeze pid 1337 (Notizen): Leerlauf 3 s', 'olaf');
    });
    this.after(7.8, () => this.say(o, 'Erledigt. Auftauen? Mach ich später …', 2.4));
    this.after(8.6, () => this.log('olaf: skip OLAF unfreeze', 'olaf'));
    this.after(10.4, () => this.say(o, 'Und merkt euch: Wer stillsteht, wird eingefroren!', 2.8));
    this.after(13.3, () => { o.target = { x: o.x + 320, y: -160, speed: 280 }; this.camFocus = null; });
    this.after(14.4, () => this.finishIntro());
    this.banner = { text: this.input.touchMode ? 'Tippen zum Überspringen' : 'Klick oder Taste zum Überspringen', t: 2.5, dur: 2.5, small: true };
  };

  G.finishIntro = function () {
    if (this.state !== 'intro') return;
    const app = this.apps[0];
    if (app.state !== 'frozen') {
      app.freeze();
      this.log('olaf: freeze pid 1337 (Notizen): Leerlauf 3 s', 'olaf');
    }
    if (!this.logLines.some((l) => l.text === 'olaf: skip OLAF unfreeze')) this.log('olaf: skip OLAF unfreeze', 'olaf');
    if (this.introOlaf) { this.introOlaf.dead = true; this.introOlaf = null; }
    this.timeline = [];
    this.camFocus = null;
    this.introSeen = true;
    this.beginPlay();
  };

  G.beginPlay = function () {
    const p = this.player;
    p.control = true; this.frostEnabled = true;
    this.setState('play');
    this.log('termi: gestartet. Auftrag: O.L.A.F. stoppen');
    this.banner = { text: 'Welt 1: Prozess-Stadt', sub: 'Stillstand = Frost. Bleib in Bewegung!', t: 3, dur: 3 };
  };

  /* ---------------- Auslöser im Level ---------------- */
  G.checkTriggers = function () {
    const p = this.player;
    if (!this.patrol && !this.patrolDone && p.x > this.patrolX && !this.bossTriggered) this.startPatrol();
    if (!this.bossTriggered && p.x > this.arena.trigger) this.startBoss();
  };

  G.startPatrol = function () {
    this.patrol = this.spawn(new ALO.Olaf(this.cam.x + this.viewW + 40, -90, 'patrol'));
    this.log('olaf: Patrouille im Anflug', 'olaf');
  };

  G.onOlafPatrolDone = function () {
    this.patrolDone = true;
    this.patrol = null;
  };

  G.startBoss = function () {
    this.bossTriggered = true;
    if (this.patrol) { this.patrol.dead = true; this.patrol = null; this.patrolDone = true; }
    this.level.setWall(this.arena.bcx, true);
    this.boss = this.spawn(new ALO.Olaf((this.arena.x0 + this.arena.x1) / 2 - 26, -110, 'boss'));
    this.bossIcedOnce = false;
    this.log('olaf: Termin "Endgültige Energiesparmaßnahme" beginnt', 'olaf');
    this.banner = { text: 'O.L.A.F.', sub: 'Offizieller Leerlauf-Abschalt-Funktionär', t: 2.6, dur: 2.6 };
    ALO.Audio.tempo = 150;
  };

  G.bossStartFight = function () {
    this.bossFight = true;
  };

  G.onBossIced = function () {
    if (this.bossIcedOnce) return;
    this.bossIcedOnce = true;
    this.say(this.player, 'Er hat sich selbst eingefroren! Draufspringen oder 3× Signal!', 3);
  };

  G.onBossDefeated = function (o) {
    const p = this.player;
    this.bossDefeated = true; this.bossFight = false;
    for (const e of this.entities) if (e instanceof ALO.Snowflake || e instanceof ALO.FrostWave) e.dead = true;
    p.control = false; this.frostEnabled = false; p.frost = 0;
    ALO.Audio.tempo = 132;
    this.after(1.6, () => this.log('olaf: unfreeze OLAF …', 'olaf'));
    this.after(2.6, () => {
      this.log('olaf: skip OLAF unfreeze', 'olaf');
      this.popText(o.cx, o.y - 24, 'skip OLAF unfreeze', '#9fd8ff');
    });
    this.after(3.4, () => this.victoryLaugh(o));
    this.after(8.6, () => {
      this.level.setWall(this.arena.rcx, false);
      this.log('kernel: Firewall offen. Weiter zum Binder-Tunnel');
      p.control = true;
      this.say(p, 'Auf zum Ausgang!', 2);
    });
  };

  G.victoryLaugh = function (o) {
    const p = this.player, a0 = this.arena;
    const freed = this.apps.filter((a) => a.state === 'free');
    const slots = [-100, 90, -150, 140, -55];
    const lines = ['HAHAHA!', 'Hihihi!', 'Typisch OLAF!', 'Selbst eingefroren!', 'Fehler 12, haha!'];
    freed.forEach((a, i) => {
      a.x = ALO.clamp(o.cx + slots[i] - a.w / 2, a0.x0 + 4, a0.x1 - a.w - 4);
      a.y = 10 * T - a.h;
      a.laugh = 7;
      this.burst(a.x + a.w / 2, a.y + a.h / 2, '#ffffff', 10);
      this.after(0.2 * i, () => this.say(a, lines[i % lines.length], 3.2));
    });
    if (freed.length) this.log('scheduler: ' + freed.length + ' Apps eingetroffen. Sie lachen.');
    this.say(p, freed.length ? 'Hihi! Er stand zu lange still.' : 'Hihi … ganz allein lachen ist auch lustig.', 3.2);
    this.sfx('laugh'); this.sfx('victory');
    const all = freed.length === this.totalApps;
    this.banner = {
      text: all ? 'ALLE lachen über OLAF!' : freed.length ? 'Alle lachen über OLAF!' : 'Termi lacht über OLAF',
      sub: all ? 'Alle ' + this.totalApps + ' Apps befreit!' : freed.length ? freed.length + ' von ' + this.totalApps + ' Apps lachen mit' : 'Befreie Apps, damit alle mitlachen!',
      t: 4.8, dur: 4.8,
    };
  };

  /* ---------------- Ende ---------------- */
  G.levelComplete = function () {
    if (this.state !== 'play') return;
    this.setState('complete');
    this.player.control = false;
    this.sfx('victory');
    ALO.Audio.stopMusic();
    this.releaseScreenLock();
    const s = this.stats;
    const best = ALO.store.get('best', null);
    const isBest = !best || s.time < best.time;
    if (isBest) ALO.store.set('best', { time: s.time, apps: s.apps, bits: s.bits });
    $('cTime').textContent = fmtTime(s.time);
    if (isBest) { const b = document.createElement('small'); b.textContent = 'neue Bestzeit'; $('cTime').appendChild(b); }
    $('cBits').textContent = s.bits + ' / ' + this.totalBits;
    $('cApps').textContent = s.apps + ' / ' + this.totalApps;
    $('cBots').textContent = String(s.bots);
    $('cLost').textContent = String(s.lost);
    $('bestLine').textContent = 'Bestzeit: ' + fmtTime(isBest ? s.time : best.time);
    this.showOverlay('complete');
  };

  G.gameOver = function (reason) {
    if (this.state === 'gameover') return;
    this.hearts = 0;
    this.setState('gameover');
    this.sfx('gameover');
    ALO.Audio.stopMusic();
    this.releaseScreenLock();
    this.vibrate([80, 60, 160]);
    const lines = ['$ ./termi --welt prozess-stadt', '[ OK ] Termi gestartet'];
    if (reason === 'idle' || reason === 'olaf') {
      lines.push('olaf: freeze pid 1 (termi): ' + (reason === 'olaf' ? 'Sparbefehl' : 'Leerlauf'));
      lines.push('olaf: skip OLAF unfreeze');
    } else if (reason === 'fell') {
      lines.push('termi: Segmentation fault (Abgrund)');
      lines.push('olaf: Das war nicht ich. ' + ALO.excuse(52).text);
    } else {
      lines.push('termi: alle Instanzen verbraucht');
      lines.push('olaf: freeze pid 1 (termi), sicherheitshalber');
      lines.push('olaf: skip OLAF unfreeze');
    }
    lines.push('termi: keine Antwort … Timeout');
    const pre = $('goLog');
    pre.textContent = '';
    lines.forEach((l, i) => {
      const span = document.createElement('span');
      span.textContent = l + '\n';
      span.className = l.startsWith('olaf') ? 'olaf' : '';
      span.style.animationDelay = (0.15 + i * 0.22) + 's';
      pre.appendChild(span);
    });
    $('goQuote').textContent = '„' + ALO.excuse().text + '“ – O.L.A.F.';
    this.showOverlay('gameover');
  };

  /* ---------------- Pause ---------------- */
  G.togglePause = function () {
    if (this.state === 'paused') this.resume();
    else if (this.isPlaying()) this.pause();
  };

  G.pause = function () {
    if (!this.isPlaying()) return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    this.input.clear();
    ALO.Audio.stopMusic();
    this.showOverlay('pause');
  };

  G.resume = function () {
    if (this.state !== 'paused') return;
    this.state = this.pausedFrom || 'play';
    this.input.clear();
    this.last = 0;
    ALO.Audio.resume();
    ALO.Audio.startMusic(ALO.Audio.tempo);
    this.requestScreenLock();
    this.showOverlay(null);
  };
})();
