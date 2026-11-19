/* Grafik Teil 2: Figuren und Objekte (Termi, O.L.A.F., Sparbots, Apps, Power-ups) */
'use strict';

(function () {
  const Art = ALO.Art;
  const rr = Art.rr;
  const TAU = Math.PI * 2;

  function iceOverlay(ctx, x, y, w, h, amount, t) {
    if (amount <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, amount * 0.75);
    ctx.fillStyle = '#d6f3ff';
    rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.globalAlpha = Math.min(1, amount * 1.2);
    ctx.fillStyle = '#ffffff';
    const n = Math.floor(amount * 5);
    for (let k = 0; k < n; k++) {
      const px = x + 3 + ((k * 7.3) % (w - 6));
      ctx.beginPath(); ctx.moveTo(px - 2.5, y + 1); ctx.lineTo(px, y - 3 - (k % 2) * 2); ctx.lineTo(px + 2.5, y + 1); ctx.fill();
    }
    if (amount > 0.55) {
      for (let k = 0; k < 3; k++) {
        const px = x + 5 + k * ((w - 10) / 2);
        ctx.beginPath(); ctx.moveTo(px - 2, y + h - 1); ctx.lineTo(px, y + h + 3 + amount * 3); ctx.lineTo(px + 2, y + h - 1); ctx.fill();
      }
    }
    ctx.restore();
  }

  function iceBlock(ctx, x, y, w, h, cracks) {
    ctx.save();
    ctx.fillStyle = 'rgba(190,236,255,0.62)';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 10, y + 4); ctx.lineTo(x + 4, y + h * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillRect(x + w - 7, y + h - 12, 3, 8);
    if (cracks > 0) {
      ctx.strokeStyle = 'rgba(40,90,140,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      const cx = x + w * 0.55, cy = y + h * 0.4;
      const arms = [[-0.6, -0.5], [0.7, -0.3], [0.2, 0.8], [-0.7, 0.6], [0.8, 0.7]];
      for (let k = 0; k < Math.min(arms.length, cracks * 2); k++) {
        ctx.moveTo(cx, cy); ctx.lineTo(cx + arms[k][0] * w * 0.4, cy + arms[k][1] * h * 0.4);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------- Termi ---------------- */
  Art.termi = (ctx, p, t) => {
    if (p.inv > 0 && !p.frozen && Math.floor(t * 14) % 2 === 0) return;
    const fx = p.x + p.w / 2, fy = p.y + p.h;
    ctx.save();
    ctx.translate(fx, fy);
    if (p.frost > 0.55 && !p.frozen) ctx.translate(Math.sin(t * 60) * (p.frost - 0.5) * 2.2, 0);

    if (p.wakelock > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      const grd = ctx.createRadialGradient(0, -15, 4, 0, -15, 28);
      grd.addColorStop(0, 'rgba(255,215,110,' + (0.45 + pulse * 0.2) + ')');
      grd.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, -15, 28, 0, TAU); ctx.fill();
    }

    ctx.scale(p.sx * p.facing, p.sy);
    const walking = Math.abs(p.vx) > 20 && (p.onGround || p.riding);
    const step = walking ? Math.sin(p.walkT * 0.22) : 0;
    const air = !(p.onGround || p.riding);

    // Füße
    ctx.fillStyle = '#2a3358';
    ctx.beginPath(); ctx.ellipse(-5 + step * 2.5, -2.5 - Math.max(0, step) * 2, 4, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 - step * 2.5, -2.5 - Math.max(0, -step) * 2, 4, 2.6, 0, 0, TAU); ctx.fill();

    const bob = walking ? Math.abs(step) * -1.2 : 0;
    ctx.translate(0, bob);

    // Ärmchen
    ctx.strokeStyle = '#3fb594'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const arm = air ? -5 : step * 3;
    ctx.beginPath(); ctx.moveTo(-11, -13); ctx.lineTo(-14, -9 + arm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, -13); ctx.lineTo(p.typing > 0 ? 16 : 14, p.typing > 0 ? -14 : -9 - arm); ctx.stroke();

    // Antenne
    ctx.strokeStyle = '#2a8f75'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(2, -27); ctx.quadraticCurveTo(4, -31, 3, -33); ctx.stroke();
    ctx.fillStyle = p.wakelock > 0 ? '#ffd36e' : '#7cffb2';
    ctx.beginPath(); ctx.arc(3, -33.5, 2, 0, TAU); ctx.fill();

    // Körper (Fenster)
    ctx.fillStyle = '#1d6f63';
    rr(ctx, -12.5, -28.5, 25, 24, 7); ctx.fill();
    ctx.fillStyle = '#6fe0c0';
    rr(ctx, -11.5, -27.5, 23, 22, 6); ctx.fill();
    ctx.fillStyle = '#47c4a3';
    rr(ctx, -11.5, -27.5, 23, 6.5, 6); ctx.fill();
    ctx.fillRect(-11.5, -23.5, 23, 2.5);
    ['#ff7b8f', '#ffd36e', '#7cffb2'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-7.5 + k * 3.6, -24.5, 1.2, 0, TAU); ctx.fill(); });

    // Bildschirm-Gesicht
    ctx.fillStyle = '#1b2340';
    rr(ctx, -9, -20, 18, 13, 3.5); ctx.fill();
    const blink = (t + p.x * 0.001) % 3.4 < 0.12;
    const hurt = p.inv > 0.8;
    ctx.fillStyle = '#ffffff';
    if (hurt) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
      for (const ex of [-4, 4]) { ctx.beginPath(); ctx.moveTo(ex - 2, -16.5); ctx.lineTo(ex + 1.5, -14.5); ctx.lineTo(ex - 2, -12.5); ctx.stroke(); }
    } else {
      for (const ex of [-4, 4]) {
        ctx.beginPath(); ctx.ellipse(ex, -14.5, 2.5, blink ? 0.4 : 3, 0, 0, TAU); ctx.fill();
      }
      if (!blink) {
        ctx.fillStyle = '#0b1022';
        for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(ex + 0.9, -14 + (air ? -0.8 : 0), 1.4, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffffff';
        for (const ex of [-4, 4]) ctx.fillRect(ex + 1.2, -15.6, 0.9, 0.9);
      }
    }
    // Mund: blinkender Cursor, beim Senden ein Prompt, bei Kälte Zittern
    ctx.fillStyle = '#7cffb2';
    if (p.typing > 0) {
      ctx.strokeStyle = '#7cffb2'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-1, -11.5); ctx.lineTo(1.5, -10); ctx.lineTo(-1, -8.5); ctx.stroke();
    } else if (p.frost > 0.5) {
      ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -9.5);
      for (let k = 0; k < 4; k++) ctx.lineTo(-2 + k * 1.6, k % 2 ? -9.5 : -10.8);
      ctx.stroke();
    } else if (Math.floor(t * 2.2) % 2 === 0) {
      ctx.fillRect(-1.5, -10, 4, 1.5);
    }
    // Bäckchen
    ctx.fillStyle = 'rgba(255,155,179,0.55)';
    ctx.beginPath(); ctx.ellipse(-7.3, -10.5, 1.8, 1.1, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7.3, -10.5, 1.8, 1.1, 0, 0, TAU); ctx.fill();

    iceOverlay(ctx, -12.5, -28.5, 25, 24, p.frozen ? 0 : p.frost, t);
    ctx.restore();

    if (p.frozen) iceBlock(ctx, fx - 17, fy - 36, 34, 37, 0);
  };

  /* ---------------- O.L.A.F. ---------------- */
  Art.olaf = (ctx, o, t) => {
    const cx = o.x + o.w / 2, top = o.y;
    ctx.save();
    ctx.translate(cx, top);
    if (o.shakeT > 0) ctx.translate(Math.sin(t * 70) * 2, 0);
    const hover = o.frozen ? 0 : Math.sin(t * 3) * 1.5;
    ctx.translate(0, hover);

    // Freeze-Strahl
    if (o.beam) {
      ctx.save();
      ctx.translate(0, -hover);
      const bx = o.beam.x - cx, by = o.beam.y - top;
      ctx.strokeStyle = 'rgba(191,239,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(o.facing * 22, 36);
      for (let k = 1; k <= 8; k++) {
        const f = k / 8;
        ctx.lineTo(o.facing * 22 + (bx - o.facing * 22) * f + (k % 2 ? 4 : -4), 36 + (by - 36) * f + (k % 2 ? -4 : 4));
      }
      ctx.stroke();
      ctx.restore();
    }

    // Düse mit kalter Flamme
    if (!o.frozen) {
      const fl = 6 + Math.sin(t * 30) * 2;
      ctx.fillStyle = 'rgba(159,232,255,0.8)';
      ctx.beginPath(); ctx.moveTo(-6, 56); ctx.lineTo(0, 56 + fl + 4); ctx.lineTo(6, 56); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-3, 56); ctx.lineTo(0, 56 + fl); ctx.lineTo(3, 56); ctx.fill();
    }
    ctx.fillStyle = '#6f84a8';
    ctx.beginPath(); ctx.moveTo(-10, 50); ctx.lineTo(10, 50); ctx.lineTo(6, 58); ctx.lineTo(-6, 58); ctx.closePath(); ctx.fill();

    ctx.save();
    ctx.scale(o.facing, 1);
    // Arme: einer wedelt mit dem Zeigefinger, einer hält das Klemmbrett
    const talk = o.bubble && o.bubble.t > 0 && !o.frozen;
    ctx.strokeStyle = '#8aa0bf'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const wag = talk ? Math.sin(t * 14) * 4 : 0;
    ctx.beginPath(); ctx.moveTo(19, 32); ctx.lineTo(27, talk ? 20 : 36); ctx.stroke();
    ctx.fillStyle = '#e4edf7';
    ctx.beginPath(); ctx.arc(27 + wag * 0.2, talk ? 18 : 38, 3.2, 0, TAU); ctx.fill();
    if (talk) { ctx.strokeStyle = '#e4edf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(27 + wag * 0.3, 16); ctx.lineTo(27 + wag, 9); ctx.stroke(); }
    ctx.strokeStyle = '#8aa0bf'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-19, 32); ctx.lineTo(-25, 40); ctx.stroke();
    // Klemmbrett
    ctx.save(); ctx.translate(-29, 38); ctx.rotate(-0.2);
    ctx.fillStyle = '#c98f5a'; rr(ctx, -7, -10, 14, 18, 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-5, -7, 10, 13);
    ctx.fillStyle = '#9aa8c0'; ctx.fillRect(-3.5, -4.5, 7, 1); ctx.fillRect(-3.5, -2, 7, 1); ctx.fillRect(-3.5, 0.5, 5, 1);
    ctx.fillStyle = '#ff6b8a'; ctx.fillRect(-3.5, 3, 3, 1.4);
    ctx.fillStyle = '#7b8fb0'; ctx.fillRect(-3, -11.5, 6, 3);
    ctx.restore();

    // Rumpf
    ctx.fillStyle = '#8aa0bf'; rr(ctx, -20, 24, 40, 29, 8); ctx.fill();
    ctx.fillStyle = '#e4edf7'; rr(ctx, -19, 25, 38, 26, 7); ctx.fill();
    // Krawatte
    ctx.fillStyle = '#3b5bdb';
    ctx.beginPath(); ctx.moveTo(-3, 25); ctx.lineTo(3, 25); ctx.lineTo(1.5, 28); ctx.lineTo(3.5, 37); ctx.lineTo(0, 41); ctx.lineTo(-3.5, 37); ctx.lineTo(-1.5, 28); ctx.closePath(); ctx.fill();
    // Akku-Anzeige mit Schneeflocke
    ctx.fillStyle = '#1b2a44'; rr(ctx, 5, 37, 12, 8, 2); ctx.fill();
    ctx.fillRect(17, 39.5, 1.6, 3);
    ctx.fillStyle = '#7ee0c3'; ctx.fillRect(6.5, 38.5, 3, 5);
    ctx.fillStyle = 'rgba(126,224,195,0.3)'; ctx.fillRect(10, 38.5, 3, 5); ctx.fillRect(13.5, 38.5, 2.5, 5);
    ctx.restore();

    // Namensschild (nicht gespiegelt)
    ctx.fillStyle = '#1b2a44'; rr(ctx, -17, 44, 22, 6, 2); ctx.fill();
    ctx.fillStyle = '#9fe8ff'; ctx.font = '700 4.6px ' + Art.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('O.L.A.F.', -6, 47.2);

    // Kopf
    ctx.save();
    ctx.scale(o.facing, 1);
    ctx.strokeStyle = '#8aa0bf'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(6, -8); ctx.stroke();
    const lamp = o.frozen ? 0.3 : 0.55 + 0.45 * Math.sin(t * 4);
    ctx.fillStyle = 'rgba(255,154,60,' + lamp + ')';
    ctx.beginPath(); ctx.arc(6, -10, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8aa0bf'; rr(ctx, -24, 1, 48, 25, 8); ctx.fill();
    ctx.fillStyle = '#f2f6fb'; rr(ctx, -23, 2, 46, 23, 7); ctx.fill();
    ctx.fillStyle = '#c3d2e6';
    ctx.beginPath(); ctx.arc(-24, 13, 3, 0, TAU); ctx.arc(24, 13, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2a44'; rr(ctx, -18, 6, 36, 16, 4); ctx.fill();
    // Augen je nach Laune
    ctx.fillStyle = o.frozen ? '#9fb6d3' : '#6ff3ff';
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.6;
    const e = o.frozen ? 'frozen' : o.expr;
    for (const s of [-1, 1]) {
      const ex = s * 7 + 1;
      if (e === 'frozen') { ctx.fillRect(ex - 3.5, 12.5, 7, 1.6); }
      else if (e === 'shock') { ctx.beginPath(); ctx.arc(ex, 12.5, 3, 0, TAU); ctx.fill(); }
      else {
        ctx.fillRect(ex - 3.5, e === 'smug' ? 12 : 11, 7, e === 'smug' ? 2.6 : 4);
        ctx.beginPath();
        if (e === 'angry') { ctx.moveTo(ex - 4, 8 + (s > 0 ? 0 : 2.5)); ctx.lineTo(ex + 4, 8 + (s > 0 ? 2.5 : 0)); }
        else { ctx.moveTo(ex - 4, s > 0 ? 8.5 : 9.5); ctx.lineTo(ex + 4, s > 0 ? 7.5 : 9.8); }
        ctx.stroke();
      }
    }
    ctx.beginPath();
    if (e === 'shock') { ctx.arc(1, 18.5, 1.8, 0, TAU); ctx.stroke(); }
    else if (e === 'angry') { ctx.moveTo(-3, 19); ctx.lineTo(5, 18); ctx.stroke(); }
    else if (e === 'frozen') { ctx.moveTo(-3, 18.5); ctx.lineTo(-1, 17.6); ctx.lineTo(1, 18.5); ctx.lineTo(3, 17.6); ctx.lineTo(5, 18.5); ctx.stroke(); }
    else { ctx.moveTo(-2, 18.5); ctx.quadraticCurveTo(2, 19.5, 6, 17); ctx.stroke(); }
    ctx.restore();

    ctx.restore();

    if (!o.frozen) iceOverlay(ctx, o.x + 2, o.y + 1 + hover, o.w - 4, o.h - 4, o.frost, t);
    else iceBlock(ctx, o.x - 6, o.y - 12, o.w + 12, o.h + 14, o.state === 'bossIced' ? 3 - o.iceHp : 0);
  };

  /* ---------------- Sparbot ---------------- */
  Art.sparbot = (ctx, e, t) => {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2 + 1;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#2a3358';
    ctx.beginPath(); ctx.arc(-6, 9, 3, 0, TAU); ctx.arc(6, 9, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6f84a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -14); ctx.stroke();
    const sp = Math.sin(t * 25);
    ctx.fillStyle = '#bfefff';
    ctx.beginPath(); ctx.ellipse(0, -14.5, 9 * Math.abs(sp) + 1.5, 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7b8fb0'; rr(ctx, -12, -10, 24, 19, 9); ctx.fill();
    ctx.fillStyle = '#cfe6ff'; rr(ctx, -11, -9, 22, 16, 8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(e.dir * 2, -2, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#21a9d6';
    ctx.beginPath(); ctx.arc(e.dir * 3.5, -1.5, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#33405c'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(e.dir * 2 - 6, -8.5 + (e.dir > 0 ? 0 : 2)); ctx.lineTo(e.dir * 2 + 6, -8.5 + (e.dir > 0 ? 2 : 0)); ctx.stroke();
    Art.snowIcon(ctx, -e.dir * 6, 3, 2.6, '#7cc7ff');
    ctx.restore();
    if (Math.sin(t * 5 + e.x) > 0.96) {
      ctx.fillStyle = 'rgba(220,245,255,0.5)';
      ctx.beginPath(); ctx.arc(cx - e.dir * 14, cy - 12, 2.5, 0, TAU); ctx.fill();
    }
  };

  /* ---------------- Apps ---------------- */
  function appGlyph(ctx, type, ink) {
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    if (type === 'notes') {
      ctx.fillRect(-8, -10, 16, 3);
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(-7, -4 + k * 3.5); ctx.lineTo(7, -4 + k * 3.5); ctx.stroke(); }
    } else if (type === 'calc') {
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, -6); ctx.moveTo(-4, -8); ctx.lineTo(-4, -4); ctx.moveTo(2, -6); ctx.lineTo(6, -6); ctx.stroke();
      ctx.fillRect(-7.5, -2.5, 15, 1.4);
    } else if (type === 'clock') {
      ctx.beginPath(); ctx.arc(0, -5, 5.5, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -8.5); ctx.moveTo(0, -5); ctx.lineTo(2.8, -4); ctx.stroke();
    } else if (type === 'weather') {
      ctx.fillStyle = '#ffd36e'; ctx.beginPath(); ctx.arc(-2, -6, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(2, -3.5, 3.2, 0, TAU); ctx.arc(5.5, -3, 2.5, 0, TAU); ctx.arc(-1, -2.5, 2.3, 0, TAU); ctx.fill();
    } else if (type === 'music') {
      ctx.beginPath(); ctx.arc(-3.5, -2.5, 2.4, 0, TAU); ctx.arc(4, -3.5, 2.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1.3, -2.5); ctx.lineTo(-1.3, -10); ctx.lineTo(6.2, -11); ctx.lineTo(6.2, -3.5); ctx.stroke();
    }
  }

  Art.app = (ctx, a, t) => {
    const free = a.state !== 'frozen';
    const hop = free ? Math.abs(Math.sin(t * (a.laugh > 0 ? 9 : 2.5) + a.index)) * (a.laugh > 0 ? 6 : a.jump > 0 ? 8 : 1.5) : 0;
    const cx = a.x + a.w / 2, by = a.y + a.h - hop;
    ctx.save(); ctx.translate(cx, by);
    if (a.state === 'frozen' && a.hitFlash > 0) ctx.translate(Math.sin(t * 80) * 1.5, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, -13, -27, 28, 28, 7); ctx.fill();
    ctx.fillStyle = a.info.color; rr(ctx, -14, -28, 28, 28, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, -12, -26, 24, 6, 3); ctx.fill();
    ctx.translate(0, -12);
    appGlyph(ctx, a.type, a.info.ink);
    // Gesicht
    ctx.fillStyle = a.info.ink; ctx.strokeStyle = a.info.ink; ctx.lineWidth = 1.3;
    if (!free) {
      ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-2, 5); ctx.moveTo(2, 5); ctx.lineTo(6, 5); ctx.stroke();
    } else if (a.laugh > 0) {
      ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-4, 3); ctx.lineTo(-2, 5); ctx.moveTo(2, 5); ctx.lineTo(4, 3); ctx.lineTo(6, 5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 8, 3, 0, Math.PI); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(-4, 4.5, 1.3, 0, TAU); ctx.arc(4, 4.5, 1.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 7, 2.2, 0.15, Math.PI - 0.15); ctx.stroke();
    }
    ctx.restore();
    if (!free) iceBlock(ctx, a.x - 4, a.y - 4, a.w + 8, a.h + 6, 3 - a.hp);
  };

  /* ---------------- Kleinteile ---------------- */
  Art.bitIcon = (ctx, x, y, s, t) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * Math.max(0.15, Math.abs(Math.cos(t * 3))), s);
    ctx.fillStyle = '#c98f2e'; ctx.beginPath(); ctx.arc(0, 0.8, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd36e'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2bf'; ctx.beginPath(); ctx.arc(-2, -2.5, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a6412'; ctx.font = '700 9px ' + Art.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('1', 0.3, 0.8);
    ctx.restore();
  };
  Art.bit = (ctx, b, t) => Art.bitIcon(ctx, b.x + b.w / 2, b.y + b.h / 2 + Math.sin(t * 3 + b.x) * 2, 1, t + b.t);

  Art.miniApp = (ctx, x, y) => {
    ctx.fillStyle = '#ff8fb7'; rr(ctx, x - 6, y - 6, 12, 12, 3.5); ctx.fill();
    ctx.fillStyle = '#7a1f4a';
    ctx.beginPath(); ctx.arc(x - 2.2, y - 0.5, 1, 0, TAU); ctx.arc(x + 2.2, y - 0.5, 1, 0, TAU); ctx.fill();
  };

  Art.snowIcon = (ctx, x, y, r, color) => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, r * 0.28); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    }
    ctx.restore();
  };

  Art.lockIcon = (ctx, x, y, s) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, -5, 6, Math.PI, 0); ctx.lineTo(6, 0); ctx.moveTo(-6, 0); ctx.lineTo(-6, -5); ctx.stroke();
    ctx.fillStyle = '#ffd36e'; rr(ctx, -10, -2, 20, 15, 4); ctx.fill();
    ctx.fillStyle = '#9a6412';
    ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(-3, 6); ctx.lineTo(0, 6); ctx.lineTo(-1.5, 11); ctx.lineTo(3.5, 4.5); ctx.lineTo(0.5, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  Art.wakelock = (ctx, w, t) => {
    const cx = w.x + w.w / 2, cy = w.y + w.h / 2 + Math.sin(t * 2.5) * 3;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
    grd.addColorStop(0, 'rgba(255,215,110,' + (0.35 + pulse * 0.25) + ')'); grd.addColorStop(1, 'rgba(255,215,110,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, TAU); ctx.fill();
    Art.lockIcon(ctx, cx, cy + 1, 1);
  };

  Art.checkpoint = (ctx, c, t) => {
    const x = c.x + c.w / 2;
    ctx.fillStyle = '#6f84a8'; ctx.fillRect(x - 2, c.y + 16, 4, c.h - 16);
    ctx.fillStyle = '#2a3f5c'; rr(ctx, x - 8, c.y + c.h - 5, 16, 5, 2); ctx.fill();
    ctx.fillStyle = '#8aa0bf'; rr(ctx, x - 13, c.y, 26, 19, 4); ctx.fill();
    ctx.fillStyle = c.active ? '#123d2e' : '#1b2340'; rr(ctx, x - 11, c.y + 2, 22, 15, 3); ctx.fill();
    if (c.active) {
      ctx.strokeStyle = '#7cffb2'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 5, c.y + 9.5); ctx.lineTo(x - 1.5, c.y + 13); ctx.lineTo(x + 5.5, c.y + 5.5); ctx.stroke();
    } else {
      ctx.fillStyle = Math.floor(t * 2) % 2 ? '#9fb6d3' : '#5d6f8f';
      ctx.font = '700 7px ' + Art.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SAVE', x, c.y + 9.5);
    }
  };

  Art.sign = (ctx, s, t) => {
    const x = s.x + s.w / 2;
    ctx.fillStyle = '#6f84a8'; ctx.fillRect(x - 1.5, s.y + 14, 3, s.h - 14);
    ctx.fillStyle = '#8aa0bf'; rr(ctx, x - 12, s.y, 24, 17, 4); ctx.fill();
    ctx.fillStyle = '#1b2340'; rr(ctx, x - 10, s.y + 2, 20, 13, 3); ctx.fill();
    ctx.fillStyle = '#ffd36e'; ctx.font = '700 11px ' + Art.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x, s.y + 9 + Math.sin(t * 4) * 0.8);
  };

  Art.goal = (ctx, gl, t, open) => {
    const cx = gl.x + gl.w / 2, by = gl.y + gl.h;
    ctx.fillStyle = '#463a9e'; rr(ctx, gl.x, gl.y, gl.w, gl.h, 22); ctx.fill();
    ctx.save();
    rr(ctx, gl.x + 6, gl.y + 6, gl.w - 12, gl.h - 6, 17); ctx.clip();
    if (open) {
      const grd = ctx.createLinearGradient(0, gl.y, 0, by);
      grd.addColorStop(0, '#7ee0c3'); grd.addColorStop(1, '#6a5ad0');
      ctx.fillStyle = grd; ctx.fillRect(gl.x, gl.y, gl.w, gl.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const r = ((t * 18 + k * 9) % 36);
        ctx.beginPath(); ctx.ellipse(cx, gl.y + gl.h * 0.55, r * 0.6, r, 0, 0, TAU); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#1b2340'; ctx.fillRect(gl.x, gl.y, gl.w, gl.h);
      Art.lockIcon(ctx, cx, gl.y + gl.h * 0.52, 0.8);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(12,18,40,0.7)'; rr(ctx, cx - 40, gl.y - 18, 80, 14, 4); ctx.fill();
    ctx.fillStyle = open ? '#7cffb2' : '#9fb6d3'; ctx.font = '600 9px ' + Art.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('→ Binder-Tunnel', cx, gl.y - 10.5);
  };

  Art.gust = (ctx, f, t) => {
    if (!f.active && !f.warn) return;
    ctx.save();
    if (f.active) {
      const grd = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
      grd.addColorStop(0, 'rgba(191,239,255,0)'); grd.addColorStop(1, 'rgba(191,239,255,0.28)');
      ctx.fillStyle = grd; ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = 'rgba(235,250,255,0.7)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const yy = f.y + f.h - ((t * 220 + k * 41) % f.h);
        const xx = f.x + 4 + ((k * 7) % (f.w - 8)) + Math.sin(t * 6 + k) * 2;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 12); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(191,239,255,0.6)';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(f.x + 6 + k * 7, f.y + f.h - 4 - ((t * 40 + k * 5) % 14), 1.5, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  };

  Art.platform = (ctx, p, t) => {
    ctx.fillStyle = '#b07a2a'; rr(ctx, p.x, p.y + 3, p.w, p.h - 3, 5); ctx.fill();
    ctx.fillStyle = '#ffcc66'; rr(ctx, p.x, p.y, p.w, p.h - 4, 5); ctx.fill();
    ctx.fillStyle = '#fff0c2'; ctx.fillRect(p.x + 5, p.y + 1.5, p.w - 10, 1.5);
    const on = Math.floor(t * 3) % 3;
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k === on ? '#7cffb2' : '#7a5418';
      ctx.beginPath(); ctx.arc(p.x + p.w / 2 - 12 + k * 12, p.y + 5.5, 2, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(122,84,24,0.9)';
    if (p.kind === 'e') { ctx.fillRect(p.x + p.w / 2 - 1, p.y + p.h, 2, 6); }
  };

  Art.icicle = (ctx, ic, t) => {
    const cx = ic.x + ic.w / 2 + (ic.state === 'shake' ? Math.sin(t * 90) * 1.5 : 0);
    const len = ic.h * ic.grow;
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath(); ctx.moveTo(cx - 7, ic.y); ctx.lineTo(cx + 7, ic.y); ctx.lineTo(cx, ic.y + len); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(cx - 4, ic.y); ctx.lineTo(cx - 1, ic.y); ctx.lineTo(cx - 0.5, ic.y + len * 0.7); ctx.closePath(); ctx.fill();
  };

  Art.snowflake = (ctx, s) => {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.fillStyle = 'rgba(159,220,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    Art.snowIcon(ctx, 0, 0, 7, '#ffffff');
    ctx.restore();
  };

  Art.ping = (ctx, p) => {
    ctx.save();
    const a = Math.min(1, p.life * 4);
    ctx.font = '800 13px ' + Art.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 2; k >= 0; k--) {
      ctx.globalAlpha = a * (k === 0 ? 1 : 0.25 / k);
      ctx.fillStyle = k === 0 ? '#7cffb2' : '#bfffe0';
      ctx.fillText('>_', p.x + p.w / 2 - p.dir * k * 9, p.y + p.h / 2);
    }
    ctx.restore();
  };

  Art.frostWave = (ctx, w, t) => {
    ctx.fillStyle = '#bfefff';
    for (let k = 0; k < 3; k++) {
      const bx = w.x + k * 7, hh = 10 + Math.sin(t * 20 + k) * 4 + (k === 1 ? 4 : 0);
      ctx.beginPath(); ctx.moveTo(bx, w.y + w.h); ctx.lineTo(bx + 4, w.y + w.h - hh); ctx.lineTo(bx + 8, w.y + w.h); ctx.closePath(); ctx.fill();
    }
  };
})();
