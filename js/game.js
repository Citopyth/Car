/* Spielkern: Level laden, Spielschleife, Kamera, Partikel, Treffer, Frost, Rendering */
'use strict';

(function () {
  const T = ALO.TILE;
  const Art = () => ALO.Art;
  const Z = (e) =>
    e instanceof ALO.Fan ? 0 :
    e instanceof ALO.Sign || e instanceof ALO.Checkpoint || e instanceof ALO.Goal ? 1 :
    e instanceof ALO.Bit || e instanceof ALO.WakeLock ? 2 :
    e instanceof ALO.FrozenApp || e instanceof ALO.Icicle ? 3 :
    e instanceof ALO.Sparbot ? 4 :
    e instanceof ALO.Olaf ? 6 : 7;

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.input = ALO.Input;
      this.state = 'title'; this.stateT = 0;
      this.t = 0; this.acc = 0; this.last = 0;
      this.viewW = 480; this.viewH = 384; this.offsetY = 0; this.scale = 1; this.dpr = 1;
      this.safe = { left: 0, right: 0, top: 0, bottom: 0 };
      this.cam = { x: 0, y: 0 }; this.look = 0; this.shakeA = 0;
      this.wakelockDur = 8;
      this.introSeen = false;
      this.loadLevel();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
      requestAnimationFrame((n) => this.frame(n));
    }

    /* ---------------- Level ---------------- */
    loadLevel() {
      const def = ALO.LEVEL1;
      const L = (this.level = new ALO.Level(def));
      this.entities = []; this.platforms = []; this.fans = []; this.apps = []; this.wakelocks = [];
      this.particles = []; this.logLines = []; this.timeline = []; this.seqT = 0; this.banner = null;
      this.stats = { bits: 0, apps: 0, score: 0, bots: 0, time: 0, lost: 0 };
      this.totalBits = 0; this.hearts = 3;
      let signI = 0, appI = 0;
      for (const s of L.spawns) {
        switch (s.ch) {
          case 'P': this.start = { x: s.cx * T + 6, y: (s.cy + 1) * T - 28 }; break;
          case 'o': this.spawn(new ALO.Bit(s.cx, s.cy)); this.totalBits++; break;
          case 'W': { const w = new ALO.WakeLock(s.cx, s.cy); this.wakelocks.push(w); this.spawn(w); break; }
          case 'F': { const a = new ALO.FrozenApp(s.cx, s.cy, def.apps[appI], appI); appI++; this.apps.push(a); this.spawn(a); break; }
          case 's': this.spawn(new ALO.Sparbot(s.cx, s.cy)); break;
          case 'I': this.spawn(new ALO.Icicle(s.cx, s.cy)); break;
          case 'h': case 'e': this.platforms.push(new ALO.MovingPlatform(s.ch, s.cx, s.cy)); break;
          case 'C': this.spawn(new ALO.Checkpoint(s.cx, s.cy)); break;
          case '!': {
            const sd = def.signs[signI++] || '';
            this.spawn(new ALO.Sign(s.cx, s.cy, typeof sd === 'string' ? sd : this.input.touchMode ? sd.t : sd.d));
            break;
          }
          case 'G': this.goal = new ALO.Goal(s.cx, s.cy); this.spawn(this.goal); break;
        }
      }
      let fanI = 0;
      for (let cy = 0; cy < L.rows; cy++) for (let cx = 0; cx < L.cols; cx++) {
        if (L.grid[cy][cx] === 'v') { const f = new ALO.Fan(cx, cy, fanI++); this.fans.push(f); }
      }
      this.totalApps = this.apps.length;
      const B = L.markers.B, R = L.markers.R;
      this.arena = { bcx: B.cx, rcx: R.cx, x0: (B.cx + 1) * T, x1: R.cx * T, trigger: (B.cx + 3) * T };
      L.setWall(R.cx, true);
      this.patrolX = L.markers.O ? L.markers.O.cx * T : Infinity;
      this.player = new ALO.Player(this.start.x, this.start.y);
      this.checkpoint = { x: this.start.x, y: this.start.y };
      this.boss = null; this.bossTriggered = false; this.bossFight = false; this.bossDefeated = false;
      this.patrol = null; this.patrolDone = false;
      this.frostEnabled = false; this.camFocus = null; this.brrr = false; this.warnT = 0; this.wlWas = 0;
      this.cam.x = 0;
    }

    spawn(e) {
      e.z = Z(e);
      let i = this.entities.length;
      while (i > 0 && this.entities[i - 1].z > e.z) i--;
      this.entities.splice(i, 0, e);
      return e;
    }

    /* ---------------- Dienste für Entitäten ---------------- */
    sfx(n) { ALO.Audio.play(n); }

    log(text, kind) {
      this.logLines.push({ text, kind: kind || 'termi', age: 0 });
      if (this.logLines.length > 14) this.logLines.shift();
    }

    say(ent, text, dur) {
      ent.bubble = { text, t: dur, dur };
      if (ent instanceof ALO.Olaf) this.sfx('talk');
    }

    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const life = ALO.rand(0.3, 0.75);
        this.particles.push({ x, y, vx: ALO.rand(-130, 130), vy: ALO.rand(-170, 30), life, max: life, color, size: ALO.rand(1.5, 3.4), g: 420 });
      }
      if (this.particles.length > 320) this.particles.splice(0, this.particles.length - 320);
    }

    dust(x, y, n) {
      for (let i = 0; i < n; i++) {
        const life = ALO.rand(0.25, 0.45);
        this.particles.push({ x: x + ALO.rand(-6, 6), y, vx: ALO.rand(-50, 50), vy: ALO.rand(-50, -10), life, max: life, color: 'rgba(220,240,255,0.8)', size: ALO.rand(1.5, 2.6), g: 60 });
      }
    }

    popText(x, y, text, color) {
      this.particles.push({ type: 'text', x, y, vx: 0, vy: -38, life: 1.1, max: 1.1, text, color: color || '#ffffff', g: 0 });
    }

    shake(a) { if (!ALO.reducedMotion) this.shakeA = Math.max(this.shakeA, a); }

    vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* optional */ } }

    hurt(n, srcX, frost) {
      const p = this.player;
      if (this.state !== 'play' || p.inv > 0 || p.frozen || p.wakelock > 0) return;
      this.hearts -= n;
      p.inv = 1.3;
      p.vx = (p.x + p.w / 2 < srcX ? -1 : 1) * 230; p.vy = -300; p.riding = null;
      p.frost = Math.min(0.95, p.frost + (frost || 0));
      this.sfx('hurt'); this.shake(5); this.vibrate(60);
      this.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff8fa3', 8);
      if (this.hearts <= 0) { this.stats.lost++; this.gameOver('hit'); }
      else this.log('termi: Treffer. Noch ' + this.hearts + (this.hearts === 1 ? ' Instanz' : ' Instanzen'), 'warn');
    }

    frostHit(amount, srcX) {
      const p = this.player;
      if (this.state !== 'play' || p.frozen) return;
      if (p.wakelock > 0) { this.burst(p.x + p.w / 2, p.y + 10, '#ffd36e', 6); this.sfx('deny'); return; }
      p.frost = Math.min(1, p.frost + amount);
      p.vx += (p.x + p.w / 2 < srcX ? -1 : 1) * 120;
      this.sfx('frost');
      this.burst(p.x + p.w / 2, p.y + p.h / 2, '#d8f6ff', 8);
      if (p.frost >= 1) this.onPlayerFrozen('olaf');
    }

    onPlayerFrozen(reason) {
      const p = this.player;
      if (p.frozen || this.state !== 'play') return;
      p.frozen = true; p.vx = 0; p.frost = 1;
      this.deathReason = reason;
      this.setState('frozen');
      this.sfx('freeze'); this.vibrate(140); this.shake(3);
      this.log('olaf: freeze pid 1 (termi): ' + (reason === 'olaf' ? 'Sparbefehl' : 'Leerlauf'), 'olaf');
      this.after(0.9, () => this.log('olaf: skip OLAF unfreeze', 'olaf'));
    }

    onPlayerFell() {
      if (this.state !== 'play') return;
      this.player.hidden = true;
      this.deathReason = 'fell';
      this.setState('fell');
      this.sfx('hurt'); this.vibrate(80);
      this.log('termi: Segmentation fault (Abgrund)', 'warn');
    }

    loseLife() {
      this.hearts--; this.stats.lost++;
      if (this.hearts <= 0) { this.gameOver(this.deathReason); return; }
      this.respawn();
    }

    respawn() {
      const p = this.player;
      p.reset(this.checkpoint.x, this.checkpoint.y);
      p.inv = 1.5;
      this.entities = this.entities.filter((e) => !(e instanceof ALO.Snowflake || e instanceof ALO.FrostWave || e instanceof ALO.Ping));
      for (const w of this.wakelocks) w.taken = false;
      if (this.patrol) { this.patrol.dead = true; this.patrol = null; }
      if (this.bossTriggered && !this.bossDefeated) {
        if (this.boss) this.boss.dead = true;
        this.boss = null; this.bossTriggered = false; this.bossFight = false;
        this.level.setWall(this.arena.bcx, false);
        ALO.Audio.tempo = 132;
      }
      this.cam.x = ALO.clamp(p.x - this.viewW * 0.42, 0, this.level.pxW - this.viewW);
      this.log('termi: Neustart vom Speicherpunkt. Noch ' + this.hearts + (this.hearts === 1 ? ' Instanz' : ' Instanzen'));
      this.setState('play');
    }

    collectBit(b) {
      this.stats.bits++; this.stats.score++;
      this.sfx('bit');
      this.burst(b.x + b.w / 2, b.y + b.h / 2, '#ffd36e', 4);
    }

    giveWakelock() {
      const p = this.player;
      p.wakelock = this.wakelockDur;
      this.sfx('wakelock');
      this.popText(p.x + p.w / 2, p.y - 10, 'WAKE-LOCK!', '#ffd36e');
      this.log("kernel: wakelock 'termi' acquired (" + this.wakelockDur + ' s)');
      this.burst(p.x + p.w / 2, p.y + p.h / 2, '#ffd36e', 14);
    }

    freeApp(a) {
      this.stats.apps++; this.stats.score += 20;
      this.sfx('free');
      this.say(a, ALO.choice(['Danke, Termi!', 'Ich laufe wieder!', 'Endlich warm!', 'Prozess fortgesetzt!']), 2.2);
      this.log('termi: SIGCONT -> ' + a.info.name + ' ✓');
      if (this.hearts < 3) { this.hearts++; this.popText(a.x + a.w / 2, a.y - 24, '+1 Instanz', '#ff8fa3'); }
    }

    setCheckpoint(c) {
      this.checkpoint = { x: c.x - 2, y: (c.cy + 1) * T - 28 };
      this.sfx('checkpoint');
      this.popText(c.x + c.w / 2, c.y - 8, 'Gespeichert', '#7cffb2');
      this.log('termi: Zustand gespeichert');
    }

    after(sec, fn) { this.timeline.push({ at: this.seqT + sec, fn }); }

    setState(s) { this.state = s; this.stateT = 0; }

    /* ---------------- Schleife ---------------- */
    frame(now) {
      const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
      this.last = now;
      if (this.state !== 'paused') this.acc += dt;
      let n = 0;
      while (this.acc >= ALO.STEP) {
        this.step(ALO.STEP);
        this.acc -= ALO.STEP;
        if (++n > 5) { this.acc = 0; break; }
      }
      this.render();
      requestAnimationFrame((t) => this.frame(t));
    }

    step(dt) {
      this.t += dt; this.stateT += dt;
      this.input.poll();
      const s = this.state;
      if (s === 'title') {
        for (const p of this.platforms) p.update(dt);
        for (const f of this.fans) f.update(dt);
        this.cam.x = (this.t * 34) % Math.max(1, this.level.pxW - this.viewW);
        this.updateParticles(dt);
        return;
      }
      if (s === 'gameover' || s === 'complete') { this.updateParticles(dt); return; }

      // Zeitleiste (Intro, Sieg, verzögerte Logs)
      this.seqT += dt;
      if (this.timeline.length) {
        const due = this.timeline.filter((e) => e.at <= this.seqT);
        if (due.length) {
          this.timeline = this.timeline.filter((e) => e.at > this.seqT);
          due.forEach((e) => e.fn());
        }
      }
      if (s === 'intro' && this.input.anyPressed && this.stateT > 0.4) this.finishIntro();

      this.updateWorld(dt);

      if (this.state === 'play') {
        this.stats.time += dt;
        this.checkTriggers();
        this.frostWarnings(dt);
      } else if ((this.state === 'frozen' || this.state === 'fell') && this.stateT > 1.9) {
        this.loseLife();
      }
    }

    updateWorld(dt) {
      const p = this.player;
      for (const pl of this.platforms) pl.update(dt);
      p.inGust = false;
      for (const f of this.fans) {
        f.update(dt);
        if (f.active && ALO.overlap(f, p)) p.inGust = true;
      }
      if (!p.hidden) p.update(dt, this);
      const list = this.entities.slice();
      for (const e of list) if (!e.dead) e.update(dt, this);
      this.entities = this.entities.filter((e) => !e.dead);
      for (const e of this.entities) if (e.bubble && e.bubble.t > 0) e.bubble.t -= dt;
      if (p.bubble && p.bubble.t > 0) p.bubble.t -= dt;
      this.updateCamera(dt);
      this.updateParticles(dt);
    }

    updateParticles(dt) {
      for (const q of this.particles) {
        q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt;
      }
      this.particles = this.particles.filter((q) => q.life > 0);
      for (const l of this.logLines) l.age += dt;
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
      this.shakeA = Math.max(0, this.shakeA - dt * 18);
    }

    updateCamera(dt) {
      const p = this.player;
      let tx;
      if (this.camFocus) tx = this.camFocus.x;
      else {
        this.look = ALO.lerp(this.look, p.facing * 38 + p.vx * 0.12, Math.min(1, dt * 2.5));
        tx = p.x + p.w / 2 - this.viewW * 0.42 + this.look;
      }
      let minX = 0, maxX = this.level.pxW - this.viewW;
      if (this.bossTriggered && !this.bossDefeated) {
        minX = this.arena.x0 - T; maxX = this.arena.x1 + T - this.viewW;
        if (maxX < minX) { minX = maxX = (this.arena.x0 + this.arena.x1) / 2 - this.viewW / 2; }
      }
      tx = ALO.clamp(tx, minX, Math.max(minX, maxX));
      this.cam.x = ALO.lerp(this.cam.x, tx, 1 - Math.exp(-dt * (this.camFocus ? 2.2 : 6)));
    }

    frostWarnings(dt) {
      const p = this.player;
      if (p.frost > 0.6 && !this.brrr) { this.brrr = true; this.say(p, ALO.choice(['Brrr… weiter!', 'Mir wird kalt!', 'Bewegen! Bewegen!']), 1.6); }
      if (p.frost < 0.2) this.brrr = false;
      this.warnT -= dt;
      if (p.frost > 0.72 && this.warnT <= 0) { this.warnT = 0.45; this.sfx('warn'); }
      if (this.wlWas > 0 && p.wakelock === 0) this.log("kernel: wakelock 'termi' released");
      this.wlWas = p.wakelock;
    }

    /* ---------------- Rendering ---------------- */
    render() {
      const ctx = this.ctx, k = this.dpr * this.scale;
      const A = Art();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      A.background(ctx, this);

      let sx = 0, sy = 0;
      if (this.shakeA > 0) { sx = ALO.rand(-1, 1) * this.shakeA; sy = ALO.rand(-1, 1) * this.shakeA; }
      const camX = Math.round(this.cam.x * k) / k;
      ctx.translate(-camX + sx, this.offsetY + sy);
      const x0 = camX - 64, x1 = camX + this.viewW + 64;

      for (const f of this.fans) if (f.x + f.w > x0 && f.x < x1) f.draw(ctx, this);
      A.underground(ctx, this.level, x0, x1, this.viewH - this.offsetY - ALO.LEVEL_H + 4);
      A.tiles(ctx, this.level, x0, x1, this.t);
      for (const p of this.platforms) if (p.x + p.w > x0 && p.x < x1) p.draw(ctx, this);
      const vis = (e) => e instanceof ALO.Olaf || (e.x + (e.w || 0) > x0 && e.x < x1);
      for (const e of this.entities) if (e.z < 5 && vis(e)) e.draw(ctx, this);
      if (this.state !== 'title') this.player.draw(ctx, this);
      for (const e of this.entities) if (e.z >= 5 && vis(e)) e.draw(ctx, this);
      this.drawParticles(ctx);
      this.drawBubbles(ctx, camX);

      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (this.state !== 'title') {
        A.frostVignette(ctx, this);
        A.hud(ctx, this);
      }
      if (this.titleCtx && this.state === 'title') this.drawTitleArt();
    }

    drawParticles(ctx) {
      for (const q of this.particles) {
        const a = Math.max(0, Math.min(1, q.life / q.max * 1.5));
        ctx.globalAlpha = a;
        if (q.type === 'text') {
          ctx.font = '700 11px ' + Art().FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,24,50,0.85)'; ctx.strokeText(q.text, q.x, q.y);
          ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
        } else {
          ctx.fillStyle = q.color;
          ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
        }
      }
      ctx.globalAlpha = 1;
    }

    drawBubbles(ctx, camX) {
      const A = Art(), minX = camX, maxX = camX + this.viewW;
      for (const e of this.entities) {
        if (e instanceof ALO.Sign && e.show > 0) A.bubble(ctx, e.x + e.w / 2, e.y - 4, e.text, e.show, 'sign', minX, maxX);
      }
      const all = this.entities.concat([this.player]);
      for (const e of all) {
        const b = e.bubble;
        if (!b || b.t <= 0 || e.hidden) continue;
        const a = Math.min(1, b.t * 4, (b.dur - b.t) * 8 + 0.2);
        const isOlaf = e instanceof ALO.Olaf;
        const top = isOlaf ? e.y - (e.frozen ? 14 : 12) : e.y - (e instanceof ALO.Player ? 10 : 6);
        const hudBottom = this.safe.top + 70 - this.offsetY;
        if (top - 46 < hudBottom) A.bubble(ctx, e.x + e.w / 2, e.y + e.h + (isOlaf ? 8 : 2), b.text, a, isOlaf ? 'olaf' : 'normal', minX, maxX, true);
        else A.bubble(ctx, e.x + e.w / 2, top, b.text, a, isOlaf ? 'olaf' : 'normal', minX, maxX);
      }
    }
  }

  ALO.Game = Game;
})();
