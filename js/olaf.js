/* O.L.A.F. – Offizieller Leerlauf-Abschalt-Funktionär.
   Ein übereifriger Energiespar-Roboter, der alles einfriert, was stillsteht. Auch sich selbst.
   Modi: 'script' (Intro, vom Spiel gesteuert), 'patrol' (Zwischenauftritt), 'boss' (Endkampf). */
'use strict';

(function () {
  const T = ALO.TILE;
  const GROUND_Y = 10 * T;

  class Olaf {
    constructor(x, y, mode, opts) {
      this.x = x; this.y = y; this.w = 52; this.h = 60;
      this.mode = mode; this.opts = opts || {};
      this.state = mode === 'boss' ? 'bossEnter' : mode === 'patrol' ? 'enter' : 'idle';
      this.st = 0; this.t = 0; this.vy = 0;
      this.frost = 0; this.frozen = false; this.facing = -1;
      this.expr = 'smug'; this.hits = 0; this.iceHp = 3; this.fireT = 1.2; this.waveT = 2;
      this.target = null; this.beam = null; this.shakeT = 0; this.bubble = null;
    }

    get cx() { return this.x + this.w / 2; }
    setState(s) { this.state = s; this.st = 0; }

    flyTo(tx, ty, speed, dt) {
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d < 2) { this.x = tx; this.y = ty; return true; }
      const s = Math.min(d, speed * dt * Math.min(1, d / 50 + 0.35));
      this.x += (dx / d) * s; this.y += (dy / d) * s;
      return false;
    }

    throwAt(g, tx, ty, speed, spreadDeg) {
      const sx = this.cx, sy = this.y + this.h - 6;
      const a = Math.atan2(ty - sy, tx - sx) + ((spreadDeg || 0) * Math.PI) / 180;
      g.spawn(new ALO.Snowflake(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed));
    }

    aimAtPlayer(g, speed, spread) {
      const p = g.player;
      this.throwAt(g, p.x + p.w / 2 + p.vx * 0.25, p.y + p.h / 2, speed, spread);
      g.sfx('throw');
    }

    /* Selbst-Einfrieren nach zu langem Stillstand (beim Angeben) */
    selfFreeze(g, seconds, dt) {
      this.frost = Math.min(1, this.frost + dt / seconds);
      if (this.frost >= 1) {
        this.frozen = true; this.vy = 0; this.expr = 'frozen';
        g.log('olaf: Leerlauf erkannt bei pid 7 (OLAF)', 'olaf');
        g.log('olaf: freeze OLAF', 'olaf');
        g.sfx('freeze');
        g.burst(this.cx, this.y + this.h / 2, '#ffffff', 14);
        this.setState('fall');
      }
    }

    /* Gemeinsamer Fall als Eisblock */
    updateFall(dt, g) {
      this.vy = Math.min(this.vy + 1500 * dt, 800);
      this.y += this.vy * dt;
      const below = Math.floor((this.y + this.h) / T);
      const hit = g.level.isSolid(Math.floor((this.x + 8) / T), below) || g.level.isSolid(Math.floor((this.x + this.w - 8) / T), below);
      if (hit && this.vy > 0) {
        this.y = below * T - this.h; this.vy = 0;
        g.shake(7); g.sfx('thud');
        g.burst(this.cx, this.y + this.h, '#d8f6ff', 16);
        g.log('olaf: skip OLAF unfreeze', 'olaf');
        this.iceHp = 3;
        this.setState(this.mode === 'boss' ? 'bossIced' : 'iced');
        if (this.mode === 'boss' && g.onBossIced) g.onBossIced(this);
      } else if (this.y > ALO.LEVEL_H + 80) {
        g.log('olaf: Absturz? ' + ALO.excuse(52).text, 'olaf');
        this.dead = true;
        if (g.onOlafPatrolDone) g.onOlafPatrolDone();
      }
    }

    /* Trampolin: auf den gefrorenen O.L.A.F. springen */
    checkStomp(g) {
      const p = g.player;
      if (p.frozen || p.hidden || !ALO.overlap(p, this)) return false;
      if (p.prevBottom <= this.y + 12 && p.vy >= 0) {
        p.y = this.y - p.h; p.vy = -560; p.sx = 0.75; p.sy = 1.3;
        return true;
      }
      return false;
    }

    contactDamage(g) {
      const p = g.player;
      if (!this.frozen && !p.frozen && !p.hidden && ALO.overlap(p, this)) g.hurt(1, this.cx, 0.1);
    }

    onPing(g) {
      if (this.mode === 'script' || this.dead) return false;
      if (!this.frozen) { g.popText(this.cx, this.y - 6, 'Abgelehnt!', '#ffd0a0'); g.sfx('deny'); return true; }
      if (this.state === 'bossIced') {
        this.iceHp--; this.shakeT = 0.15;
        g.burst(this.cx, this.y + 20, '#d8f6ff', 6);
        if (this.iceHp <= 0) this.bossHit(g); else g.sfx('crack');
        return true;
      }
      if (this.state === 'defeated') return false;
      g.popText(this.cx, this.y - 6, 'klonk', '#d8f6ff'); g.sfx('crack');
      return true;
    }

    bossHit(g) {
      this.hits++;
      const ex = ALO.excuse([52, 38, 12][this.hits - 1]);
      g.shake(8); g.sfx('bossHit');
      g.burst(this.cx, this.y + this.h / 2, '#ffffff', 22);
      g.log('olaf: ' + ex.text, 'olaf');
      if (this.hits >= 3) {
        this.expr = 'frozen';
        this.setState('defeated');
        g.say(this, ex.text, 3.6);
        g.onBossDefeated(this);
        return;
      }
      this.frozen = false; this.frost = 0; this.expr = 'angry';
      g.say(this, ex.text, 2.8);
      this.vy = -300;
      this.setState('bossRise');
    }

    update(dt, g) {
      this.t += dt; this.st += dt; this.shakeT -= dt;
      if (this.beam) { this.beam.t -= dt; if (this.beam.t <= 0) this.beam = null; }
      const p = g.player;
      if (!this.frozen && this.state !== 'fall') this.facing = p.x + p.w / 2 < this.cx ? -1 : 1;
      if (this.mode === 'script') return this.updateScript(dt);
      if (this.mode === 'patrol') return this.updatePatrol(dt, g);
      return this.updateBoss(dt, g);
    }

    updateScript(dt) {
      if (this.target) {
        this.facing = this.target.x < this.x ? -1 : 1;
        if (this.flyTo(this.target.x, this.target.y, this.target.speed || 170, dt)) this.target = null;
      } else {
        this.y += Math.sin(this.t * 2.2) * 0.25;
      }
    }

    updatePatrol(dt, g) {
      const p = g.player, cam = g.cam;
      switch (this.state) {
        case 'enter':
          if (this.flyTo(cam.x + g.viewW * 0.62, 70, 230, dt) || this.st > 2.6) {
            g.say(this, 'Leerlauf-Kontrolle! Bitte stillhalten!', 2.6);
            g.log('olaf: Patrouille gestartet. Alle stillhalten!', 'olaf');
            this.setState('attack'); this.fireT = 1.4;
          }
          break;
        case 'attack': {
          const minX = cam.x + 16, maxX = cam.x + g.viewW - this.w - 16;
          const tx = ALO.clamp(p.x + p.w / 2 - this.w / 2 + Math.sin(this.t * 1.3) * 70, minX, maxX);
          this.flyTo(tx, 68 + Math.sin(this.t * 2) * 8, 170, dt);
          this.fireT -= dt;
          if (this.fireT <= 0) { this.fireT = 1.2; this.aimAtPlayer(g, 155, 0); }
          this.contactDamage(g);
          if (this.st > 7.5) {
            g.say(this, 'Kurze Ansprache: ' + ALO.choice(ALO.OLAF_BRAGS), 2.6);
            g.log('olaf: Ansprache läuft. Niemand bewegt sich.', 'olaf');
            this.setState('speech');
          }
          break;
        }
        case 'speech':
          this.contactDamage(g);
          this.selfFreeze(g, 2.2, dt);
          break;
        case 'fall':
          this.updateFall(dt, g);
          break;
        case 'iced':
          if (this.checkStomp(g)) { g.sfx('boing'); g.popText(this.cx, this.y - 8, 'Boing!', '#ffffff'); }
          if (this.st > 6) { this.setState('thaw'); this.shakeT = 0.9; }
          break;
        case 'thaw':
          if (this.st > 0.9) {
            this.frozen = false; this.frost = 0; this.expr = 'shock';
            g.burst(this.cx, this.y + this.h / 2, '#d8f6ff', 18); g.sfx('shatter');
            const ex = ALO.excuse(12);
            g.say(this, ex.text, 3);
            g.log('olaf: unfreeze OLAF (manuell, peinlich)', 'olaf');
            this.setState('leave');
          }
          break;
        case 'leave':
          this.expr = 'smug';
          if (this.st > 1.6) this.flyTo(this.x + 300, -140, 240, dt);
          if (this.y < -120) { this.dead = true; g.onOlafPatrolDone(); }
          break;
      }
    }

    updateBoss(dt, g) {
      const a = g.arena, p = g.player;
      switch (this.state) {
        case 'bossEnter':
          if (this.flyTo((a.x0 + a.x1) / 2 - this.w / 2, 74, 160, dt) && this.st > 1.2) {
            g.say(this, 'Termi! Du verbrauchst zu viel Energie. Ich schalte dich ab!', 3);
            this.setState('bossTaunt');
          }
          break;
        case 'bossTaunt':
          if (this.st > 3) { g.bossStartFight(); this.setState('bossAttack'); this.fireT = 1; }
          break;
        case 'bossAttack': {
          const h = this.hits;
          const span = a.x1 - a.x0 - this.w - 16;
          const tx = a.x0 + 8 + span * (0.5 + 0.5 * Math.sin(this.t * (0.8 + h * 0.25)));
          this.flyTo(tx, 68 + Math.sin(this.t * 2.3) * 10, 210 + h * 40, dt);
          this.fireT -= dt;
          if (this.fireT <= 0) {
            if (h === 1) { for (const s of [-18, 0, 18]) this.aimAtPlayer(g, 150, s); this.fireT = 1.45; }
            else { this.aimAtPlayer(g, 160 + h * 15, 0); this.fireT = h === 2 ? 1.05 : 1.3; }
          }
          if (h === 2) {
            this.waveT -= dt;
            if (this.waveT <= 0) {
              this.waveT = 2.6;
              g.spawn(new ALO.FrostWave(this.cx - 11, GROUND_Y, -1));
              g.spawn(new ALO.FrostWave(this.cx - 11, GROUND_Y, 1));
              g.sfx('wave');
            }
          }
          this.contactDamage(g);
          if (this.st > [6, 5.5, 5][h]) {
            g.say(this, ALO.choice(ALO.OLAF_BRAGS), 2.4);
            this.expr = 'smug';
            this.setState('bossSpeech');
          }
          break;
        }
        case 'bossSpeech':
          this.contactDamage(g);
          this.selfFreeze(g, this.hits === 2 ? 1.6 : 2.0, dt);
          break;
        case 'fall':
          this.updateFall(dt, g);
          break;
        case 'bossIced':
          if (this.checkStomp(g)) { this.bossHit(g); break; }
          if (this.st > [5, 4.5, 4][this.hits]) { this.setState('bossThaw'); this.shakeT = 0.8; }
          break;
        case 'bossThaw':
          if (this.st > 0.8) {
            this.frozen = false; this.frost = 0; this.expr = 'shock';
            g.burst(this.cx, this.y + this.h / 2, '#d8f6ff', 16); g.sfx('shatter');
            g.say(this, 'Das haben Sie nicht gesehen!', 2.2);
            g.log('olaf: unfreeze OLAF (manuell, peinlich)', 'olaf');
            this.vy = -260;
            this.setState('bossRise');
          }
          break;
        case 'bossRise':
          if (this.flyTo(this.x, 68, 230, dt) || this.st > 2) { this.expr = this.hits ? 'angry' : 'smug'; this.setState('bossAttack'); this.fireT = 1; }
          break;
        case 'defeated':
          break;
      }
      if (p.y < -60) p.y = -60; // nicht über die Arena springen
    }

    draw(ctx, g) { ALO.Art.olaf(ctx, this, g.t); }
  }

  ALO.Olaf = Olaf;
})();
