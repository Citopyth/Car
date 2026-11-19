/* Spielfiguren und Objekte. Jede Entität hat x, y, w, h, update(dt, g) und draw(ctx, g). */
'use strict';

(function () {
  const T = ALO.TILE;
  const A = () => ALO.Art;

  /* ---------------- Termi ---------------- */
  class Player {
    constructor(x, y) {
      this.w = 20; this.h = 28;
      this.reset(x, y);
    }

    reset(x, y) {
      this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.facing = 1; this.onGround = false; this.riding = null;
      this.coyote = 0; this.jumpBuf = 0; this.prevBottom = y + this.h;
      this.frost = 0; this.stillT = 0; this.wakelock = 0; this.inv = 0; this.pingCd = 0;
      this.sx = 1; this.sy = 1; this.walkT = 0; this.typing = 0;
      this.inGust = false; this.frozen = false; this.control = true; this.hidden = false;
    }

    update(dt, g) {
      const inp = g.input;
      const canAct = this.control && !this.frozen;
      const dir = canAct ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;

      // von Plattform mitgetragen
      if (this.riding) { this.x += this.riding.dx; this.y += this.riding.dy; }

      // horizontal
      const maxV = this.wakelock > 0 ? 215 : 190;
      if (dir) {
        const turning = Math.sign(this.vx) === -dir;
        const acc = (this.onGround || this.riding ? 1600 : 1100) * (turning ? 1.7 : 1);
        this.vx = ALO.approach(this.vx, dir * maxV, acc * dt);
        this.facing = dir;
      } else {
        this.vx = ALO.approach(this.vx, 0, (this.onGround || this.riding ? 1900 : 450) * dt);
      }

      // Springen mit Puffer und Coyote-Zeit
      if (canAct && inp.jumpPressed) this.jumpBuf = 0.13;
      const grounded = this.onGround || !!this.riding;
      this.coyote = grounded ? 0.1 : this.coyote - dt;
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.vy = -580; this.jumpBuf = 0; this.coyote = 0;
        this.riding = null; this.onGround = false;
        this.sx = 0.72; this.sy = 1.3;
        g.sfx('jump');
        g.dust(this.x + this.w / 2, this.y + this.h, 4);
      }
      this.jumpBuf -= dt;

      // Schwerkraft (kurzer Sprung bei frühem Loslassen) und Kühl-Aufwind
      const holding = canAct && inp.jump;
      let grav = this.vy < 0 ? (holding ? 1500 : 3400) : 1750;
      if (this.inGust) grav -= 2700;
      this.vy += grav * dt;
      if (this.inGust) this.vy = Math.max(this.vy, -290);
      this.vy = Math.min(this.vy, 720);

      const wasGrounded = grounded;
      const vyBefore = this.vy;
      this.prevBottom = this.y + this.h;
      ALO.moveBody(this, dt, g.level);

      // auf bewegliche Plattformen landen
      this.riding = null;
      if (this.vy >= 0) {
        for (const p of g.platforms) {
          if (p.catches(this, this.prevBottom)) {
            this.y = p.y - this.h; this.vy = 0; this.onGround = true; this.riding = p;
            break;
          }
        }
      }
      if (!wasGrounded && (this.onGround || this.riding) && vyBefore > 320) {
        this.sx = 1.28; this.sy = 0.78;
        g.dust(this.x + this.w / 2, this.y + this.h, 5);
        g.sfx('land');
      }

      // Weck-Signal
      this.pingCd -= dt; this.typing -= dt;
      if (canAct && inp.actionPressed && this.pingCd <= 0) {
        this.pingCd = 0.28; this.typing = 0.18;
        const px = this.facing > 0 ? this.x + this.w : this.x - 16;
        g.spawn(new Ping(px, this.y + 7, this.facing));
        g.sfx('ping');
      }

      // Frost: Stillstand friert ein, Bewegung taut auf
      const nowGrounded = this.onGround || !!this.riding;
      const still = canAct && nowGrounded && Math.abs(this.vx) < 15 && dir === 0;
      this.stillT = still ? this.stillT + dt : 0;
      if (g.frostEnabled && !this.frozen) {
        if (this.wakelock > 0) {
          this.frost = Math.max(0, this.frost - 1.2 * dt);
        } else {
          let rate = 0;
          if (this.stillT > 0.45) rate += 0.27;
          if (this.inGust) rate += 0.42;
          if (rate > 0) this.frost += rate * dt;
          else if (!still) this.frost -= 0.32 * dt;
          this.frost = ALO.clamp(this.frost, 0, 1);
          if (this.frost >= 1) g.onPlayerFrozen('idle');
        }
      }

      // Timer, Animation
      this.wakelock = Math.max(0, this.wakelock - dt);
      this.inv = Math.max(0, this.inv - dt);
      this.sx = ALO.lerp(this.sx, 1, Math.min(1, 12 * dt));
      this.sy = ALO.lerp(this.sy, 1, Math.min(1, 12 * dt));
      this.walkT += Math.abs(this.vx) * dt;

      // Gefahren
      if (!this.frozen && g.level.touchesSpikes(this)) g.hurt(1, this.x + this.w / 2 + this.facing, 0.1);
      if (this.y > ALO.LEVEL_H + 48) g.onPlayerFell();
    }

    draw(ctx, g) { if (!this.hidden) A().termi(ctx, this, g.t); }
  }

  /* ---------------- Weck-Signal (Projektil) ---------------- */
  class Ping {
    constructor(x, y, dir) {
      this.x = x; this.y = y; this.w = 16; this.h = 14;
      this.dir = dir; this.vx = dir * 440; this.life = 0.42; this.age = 0;
    }
    update(dt, g) {
      this.x += this.vx * dt; this.life -= dt; this.age += dt;
      if (this.life <= 0) { this.dead = true; return; }
      const cx = Math.floor((this.x + this.w / 2) / T), cy = Math.floor((this.y + this.h / 2) / T);
      if (g.level.isSolid(cx, cy)) { this.dead = true; g.burst(this.x + this.w / 2, this.y + this.h / 2, '#7cffb2', 5); return; }
      for (const e of g.entities) {
        if (e === this || e.dead || !e.onPing || !ALO.overlap(this, e)) continue;
        if (e.onPing(g, this) !== false) { this.dead = true; break; }
      }
    }
    draw(ctx, g) { A().ping(ctx, this, g.t); }
  }

  /* ---------------- Sparbot (Gegner) ---------------- */
  class Sparbot {
    constructor(cx, cy) {
      this.w = 24; this.h = 22;
      this.x = cx * T + 4; this.y = (cy + 1) * T - this.h;
      this.vx = 0; this.vy = 0; this.dir = -1; this.t = Math.random() * 10;
    }
    update(dt, g) {
      this.t += dt;
      this.vx = this.dir * 42;
      this.vy = Math.min(this.vy + 1700 * dt, 700);
      ALO.moveBody(this, dt, g.level);
      if (this.hitWall) this.dir *= -1;
      else if (this.onGround) {
        const ax = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        if (!g.level.groundAt(ax, this.y + this.h + 4)) this.dir *= -1;
      }
      if (this.y > ALO.LEVEL_H + 40) { this.dead = true; return; }

      const p = g.player;
      if (p.frozen || p.hidden || !ALO.overlap(p, this)) return;
      if (p.wakelock > 0) this.kill(g);
      else if (p.prevBottom <= this.y + 9) {
        this.kill(g);
        p.vy = g.input.jump ? -520 : -400; p.sx = 0.8; p.sy = 1.25;
        g.sfx('stomp');
      } else g.hurt(1, this.x + this.w / 2, 0.15);
    }
    onPing(g) { this.kill(g); }
    kill(g) {
      if (this.dead) return;
      this.dead = true;
      g.burst(this.x + this.w / 2, this.y + this.h / 2, '#bfefff', 12);
      g.popText(this.x + this.w / 2, this.y - 4, '+5', '#ffe08a');
      g.stats.score += 5; g.stats.bots++;
      g.sfx('pop');
    }
    draw(ctx, g) { A().sparbot(ctx, this, g.t); }
  }

  /* ---------------- Eiszapfen ---------------- */
  class Icicle {
    constructor(cx, cy) {
      this.w = 14; this.h = 26;
      this.x = cx * T + 9; this.homeY = cy * T; this.y = this.homeY;
      this.state = 'hang'; this.t = 0; this.vy = 0; this.grow = 1;
    }
    shatter(g) {
      this.state = 'gone'; this.t = 3.5;
      g.burst(this.x + this.w / 2, this.y + this.h, '#d8f6ff', 10);
      g.sfx('shatter');
    }
    update(dt, g) {
      const p = g.player;
      const pcx = p.x + p.w / 2, mcx = this.x + this.w / 2;
      if (this.state === 'hang') {
        this.grow = Math.min(1, this.grow + dt * 2);
        if (this.grow >= 1 && Math.abs(pcx - mcx) < 40 && p.y > this.y && !p.hidden) {
          this.state = 'shake'; this.t = 0.45; g.sfx('crack');
        }
      } else if (this.state === 'shake') {
        this.t -= dt;
        if (this.t <= 0) { this.state = 'fall'; this.vy = 0; }
      } else if (this.state === 'fall') {
        this.vy = Math.min(this.vy + 1600 * dt, 800);
        this.y += this.vy * dt;
        if (!p.frozen && !p.hidden && ALO.overlap(this, p)) { g.hurt(1, mcx, 0.2); this.shatter(g); return; }
        if (g.level.isSolid(Math.floor(mcx / T), Math.floor((this.y + this.h) / T))) this.shatter(g);
        else if (this.y > ALO.LEVEL_H) { this.state = 'gone'; this.t = 3.5; }
      } else if (this.state === 'gone') {
        this.t -= dt;
        if (this.t <= 0 && Math.abs(pcx - mcx) > 70) { this.state = 'hang'; this.y = this.homeY; this.grow = 0; }
      }
    }
    draw(ctx, g) { if (this.state !== 'gone') A().icicle(ctx, this, g.t); }
  }

  /* ---------------- Bewegliche Plattform ---------------- */
  class MovingPlatform {
    constructor(kind, cx, cy) {
      this.kind = kind; this.w = 96; this.h = 14;
      this.bx = cx * T; this.by = cy * T; this.x = this.bx; this.y = this.by;
      this.range = 4 * T; this.period = kind === 'h' ? 5.2 : 5.8;
      this.t = 0; this.dx = 0; this.dy = 0;
    }
    update(dt) {
      this.t += dt;
      const k = (1 - Math.cos((this.t * Math.PI * 2) / this.period)) / 2;
      const nx = this.kind === 'h' ? this.bx + k * this.range : this.bx;
      const ny = this.kind === 'e' ? this.by - k * this.range : this.by;
      this.dx = nx - this.x; this.dy = ny - this.y;
      this.x = nx; this.y = ny;
    }
    catches(p, prevBottom) {
      return p.vy >= 0 && p.x + p.w > this.x + 2 && p.x < this.x + this.w - 2 &&
        prevBottom <= this.y + Math.max(0, -this.dy) + 1 && p.y + p.h >= this.y;
    }
    draw(ctx, g) { A().platform(ctx, this, g.t); }
  }

  /* ---------------- Eingefrorene App ---------------- */
  class FrozenApp {
    constructor(cx, cy, type, index) {
      this.w = 28; this.h = 28;
      this.x = cx * T + 2; this.y = (cy + 1) * T - this.h;
      this.type = type; this.index = index; this.info = ALO.APP_TYPES[type];
      this.hp = 3; this.state = 'frozen'; this.t = Math.random() * 5; this.hitFlash = 0; this.jump = 0; this.laugh = 0;
    }
    update(dt, g) {
      this.t += dt; this.hitFlash -= dt;
      if (this.state === 'frozen') {
        if (g.player.wakelock > 0 && ALO.overlap(g.player, this)) this.free(g);
      } else {
        this.jump = Math.max(0, this.jump - dt);
        this.laugh = Math.max(0, this.laugh - dt);
      }
    }
    freeze() { this.state = 'frozen'; this.hp = 3; }
    onPing(g) {
      if (this.state !== 'frozen') return false;
      this.hp--; this.hitFlash = 0.15;
      g.burst(this.x + this.w / 2, this.y + this.h / 2, '#d8f6ff', 6);
      if (this.hp <= 0) this.free(g); else g.sfx('crack');
      return true;
    }
    free(g) {
      this.state = 'free'; this.jump = 0.6;
      g.burst(this.x + this.w / 2, this.y + this.h / 2, '#ffffff', 16);
      g.freeApp(this);
    }
    draw(ctx, g) { A().app(ctx, this, g.t); }
  }

  /* ---------------- Sammelobjekte & Deko ---------------- */
  class Bit {
    constructor(cx, cy) { this.w = 14; this.h = 16; this.x = cx * T + 9; this.y = cy * T + 8; this.t = cx * 0.7; }
    update(dt, g) {
      this.t += dt;
      if (!g.player.hidden && ALO.overlap(this, g.player)) { this.dead = true; g.collectBit(this); }
    }
    draw(ctx, g) { A().bit(ctx, this, g.t); }
  }

  class WakeLock {
    constructor(cx, cy) { this.w = 22; this.h = 26; this.x = cx * T + 5; this.y = cy * T + 2; this.taken = false; }
    update(dt, g) {
      if (!this.taken && !g.player.hidden && ALO.overlap(this, g.player)) { this.taken = true; g.giveWakelock(this); }
    }
    draw(ctx, g) { if (!this.taken) A().wakelock(ctx, this, g.t); }
  }

  class Checkpoint {
    constructor(cx, cy) { this.w = 20; this.h = 54; this.x = cx * T + 6; this.y = (cy + 1) * T - this.h; this.active = false; this.cx = cx; this.cy = cy; }
    update(dt, g) {
      if (!this.active && ALO.overlap(this, g.player)) { this.active = true; g.setCheckpoint(this); }
    }
    draw(ctx, g) { A().checkpoint(ctx, this, g.t); }
  }

  class Sign {
    constructor(cx, cy, text) { this.w = 24; this.h = 30; this.x = cx * T + 4; this.y = (cy + 1) * T - this.h; this.text = text; this.show = 0; }
    update(dt, g) {
      const p = g.player;
      const near = Math.abs(p.x + p.w / 2 - (this.x + this.w / 2)) < 64 && Math.abs(p.y - this.y) < 90;
      this.show = ALO.clamp(this.show + (near ? 4 : -3) * dt, 0, 1);
    }
    draw(ctx, g) { A().sign(ctx, this, g.t); }
  }

  class Goal {
    constructor(cx, cy) { this.w = 48; this.h = 68; this.x = cx * T - 8; this.y = (cy + 1) * T - this.h; }
    update(dt, g) {
      if (g.bossDefeated && g.state === 'play' && ALO.overlap(this, g.player)) g.levelComplete();
    }
    draw(ctx, g) { A().goal(ctx, this, g.t, g.bossDefeated); }
  }

  class Fan {
    constructor(cx, cy, index) {
      this.cx = cx; this.cy = cy;
      this.x = cx * T + 3; this.w = 26; this.y = (cy - 6) * T; this.h = 6 * T;
      this.t = index * 1.1; this.active = false; this.warn = false;
    }
    update(dt) {
      this.t += dt;
      const cyc = this.t % 3.5;
      this.active = cyc < 1.9;
      this.warn = !this.active && cyc > 3.0;
    }
    draw(ctx, g) { A().gust(ctx, this, g.t); }
  }

  /* ---------------- O.L.A.F.s Geschosse ---------------- */
  class Snowflake {
    constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 7; this.life = 6; this.rot = 0; this.w = 14; this.h = 14; }
    update(dt, g) {
      this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 4; this.life -= dt;
      if (this.life <= 0 || this.y > ALO.LEVEL_H + 20) { this.dead = true; return; }
      if (g.level.isSolid(Math.floor(this.x / T), Math.floor(this.y / T))) {
        this.dead = true; g.burst(this.x, this.y, '#d8f6ff', 5); return;
      }
      const p = g.player;
      const hb = { x: this.x - 5, y: this.y - 5, w: 10, h: 10 };
      if (!p.frozen && !p.hidden && ALO.overlap(hb, p)) { this.dead = true; g.frostHit(0.25, this.x); }
    }
    draw(ctx, g) { A().snowflake(ctx, this, g.t); }
  }

  class FrostWave {
    constructor(x, groundY, dir) { this.w = 22; this.h = 18; this.x = x; this.y = groundY - this.h; this.dir = dir; this.t = 0; }
    update(dt, g) {
      this.t += dt;
      this.x += this.dir * 210 * dt;
      const ahead = this.dir > 0 ? this.x + this.w : this.x;
      if (g.level.isSolid(Math.floor(ahead / T), Math.floor((this.y + 4) / T)) || this.t > 6) { this.dead = true; return; }
      if (this.t % 0.08 < dt) g.burst(this.x + this.w / 2, this.y + this.h, '#bfefff', 1);
      const p = g.player;
      if (!p.frozen && !p.hidden && ALO.overlap(this, p)) { this.dead = true; g.frostHit(0.35, this.x); }
    }
    draw(ctx, g) { A().frostWave(ctx, this, g.t); }
  }

  Object.assign(ALO, { Player, Ping, Sparbot, Icicle, MovingPlatform, FrozenApp, Bit, WakeLock, Checkpoint, Sign, Goal, Fan, Snowflake, FrostWave });
})();
