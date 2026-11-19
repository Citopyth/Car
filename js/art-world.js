/* Grafik Teil 1: Hilfsfunktionen, Hintergrund, Kacheln, Sprechblasen, HUD.
   Alles wird prozedural mit Canvas-Pfaden gezeichnet – keine Bilddateien, keine Marken. */
'use strict';

(function () {
  const T = ALO.TILE;
  const Art = (ALO.Art = ALO.Art || {});

  Art.FONT = '"Fredoka", "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif';
  Art.MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

  Art.rr = (ctx, x, y, w, h, r) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };

  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  Art.hash = hash;

  /* ---------------- Hintergrund ---------------- */
  const STRIP_W = 1024;
  let strips = null;
  let stars = [];

  function makeCanvas(w, h, res) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
    const x = c.getContext('2d');
    x.scale(res, res);
    return { c, x };
  }

  function drawFarLayer(x) {
    // ferne Chip-Türme, ein Akku-Hochhaus und am Horizont der Broadcast-Turm
    for (let i = 0; i < 26; i++) {
      const bx = i * 40 + hash(i, 1) * 16;
      const bw = 26 + hash(i, 2) * 30;
      const bh = 70 + hash(i, 3) * 120;
      x.fillStyle = '#1d3a5e';
      Art.rr(x, bx, 330 - bh, bw, bh + 60, 4); x.fill();
      x.fillStyle = 'rgba(126,224,195,0.22)';
      for (let wy = 330 - bh + 8; wy < 320; wy += 12) {
        for (let wx = bx + 5; wx < bx + bw - 6; wx += 8) if (hash(wx | 0, wy | 0) > 0.55) x.fillRect(wx, wy, 3, 4);
      }
    }
    // Broadcast-Turm (Teaser für Welt 4)
    const tx = 700;
    x.strokeStyle = '#27507a'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(tx - 22, 330); x.lineTo(tx, 90); x.lineTo(tx + 22, 330); x.stroke();
    for (let y = 120; y < 330; y += 26) { x.beginPath(); x.moveTo(tx - (y - 90) * 0.09, y); x.lineTo(tx + (y - 90) * 0.09, y); x.stroke(); }
    x.fillStyle = '#ff9a3c'; x.beginPath(); x.arc(tx, 86, 4, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,154,60,0.35)'; x.lineWidth = 2;
    for (const r of [10, 17]) { x.beginPath(); x.arc(tx, 86, r, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(tx, 86, r, Math.PI - 0.9, Math.PI + 0.9); x.stroke(); }
    // Akku-Hochhaus
    const ax = 260;
    x.fillStyle = '#21436b'; Art.rr(x, ax, 150, 54, 200, 8); x.fill();
    x.fillRect(ax + 18, 140, 18, 12);
    x.fillStyle = 'rgba(255,211,110,0.35)';
    for (let k = 0; k < 4; k++) Art.rr(x, ax + 8, 168 + k * 36, 38, 26, 4), x.fill();
  }

  function drawMidLayer(x) {
    // Prozess-Häuser: Fenster-Gebäude mit Titelleiste und PID-Schild
    const colors = ['#2f5f86', '#3a4f8f', '#2b6f74', '#45568f', '#336a8a'];
    let bx = 0, i = 0;
    while (bx < STRIP_W) {
      const bw = 70 + hash(i, 7) * 70;
      const bh = 90 + hash(i, 8) * 110;
      const top = 330 - bh;
      x.fillStyle = colors[i % colors.length];
      Art.rr(x, bx, top, bw, bh + 40, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.18)';
      Art.rr(x, bx, top, bw, 12, 7); x.fill();
      const dots = ['#ff7b8f', '#ffd36e', '#7cffb2'];
      dots.forEach((c, k) => { x.fillStyle = c; x.globalAlpha = 0.7; x.beginPath(); x.arc(bx + 8 + k * 7, top + 6, 2, 0, Math.PI * 2); x.fill(); });
      x.globalAlpha = 1;
      for (let wy = top + 20; wy < 318; wy += 18) {
        for (let wx = bx + 9; wx < bx + bw - 14; wx += 15) {
          const lit = hash(wx | 0, wy | 0);
          x.fillStyle = lit > 0.62 ? '#ffd36e' : lit > 0.4 ? 'rgba(126,224,195,0.55)' : 'rgba(10,20,40,0.35)';
          Art.rr(x, wx, wy, 9, 10, 2); x.fill();
        }
      }
      if (hash(i, 9) > 0.45) {
        x.fillStyle = 'rgba(10,20,40,0.55)';
        Art.rr(x, bx + bw / 2 - 18, top - 13, 36, 11, 3); x.fill();
        x.fillStyle = '#7ee0c3'; x.font = '600 7px ' + Art.MONO; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('PID ' + (100 + Math.floor(hash(i, 4) * 900)), bx + bw / 2, top - 7.5);
      }
      bx += bw + 10 + hash(i, 5) * 26;
      i++;
    }
  }

  Art.buildBackground = (res) => {
    const r = Math.min(2, Math.max(1, res));
    const far = makeCanvas(STRIP_W, ALO.LEVEL_H, r);
    drawFarLayer(far.x);
    const mid = makeCanvas(STRIP_W, ALO.LEVEL_H, r);
    drawMidLayer(mid.x);
    strips = { far: far.c, mid: mid.c };
    stars = Array.from({ length: 70 }, (_, k) => ({ x: hash(k, 11) * STRIP_W, y: hash(k, 12) * 220, s: 0.6 + hash(k, 13) * 1.4, p: hash(k, 14) * 6 }));
  };

  Art.background = (ctx, g) => {
    const vw = g.viewW, vh = g.viewH, oy = g.offsetY;
    const sky = ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, '#0d1934');
    sky.addColorStop(Math.min(0.95, (oy + 240) / vh), '#1f4466');
    sky.addColorStop(Math.min(0.99, (oy + 330) / vh), '#e59a6a');
    sky.addColorStop(1, '#e59a6a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh);
    if (!strips) return;
    // Sterne (leichte Parallaxe)
    const sx = -(g.cam.x * 0.05) % STRIP_W;
    ctx.fillStyle = '#e8f4ff';
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(g.t * 2 + s.p);
      ctx.globalAlpha = 0.35 + tw * 0.5;
      let x = s.x + sx;
      if (x < 0) x += STRIP_W;
      for (let k = x; k < vw; k += STRIP_W) ctx.fillRect(k, s.y + oy - 40, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    // Weicher Bildschirm-Mond (Hintergrundbeleuchtung)
    ctx.fillStyle = 'rgba(255,240,200,0.12)';
    ctx.beginPath(); ctx.arc(vw * 0.78, oy + 70, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.22)';
    ctx.beginPath(); ctx.arc(vw * 0.78, oy + 70, 30, 0, Math.PI * 2); ctx.fill();
    for (const [img, f] of [[strips.far, 0.15], [strips.mid, 0.4]]) {
      let x = -(g.cam.x * f) % STRIP_W;
      if (x > 0) x -= STRIP_W;
      for (; x < vw; x += STRIP_W) ctx.drawImage(img, x, oy, STRIP_W, ALO.LEVEL_H);
    }
  };

  /* Untergrund unterhalb des Levels (Weltkoordinaten): Boden setzt sich fort, Abgründe bleiben dunkel */
  Art.underground = (ctx, level, x0, x1, depth) => {
    if (depth <= 0) return;
    const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(level.cols - 1, Math.floor(x1 / T));
    const y = ALO.LEVEL_H;
    for (let cx = c0; cx <= c1; cx++) {
      const solid = level.grid[level.rows - 1][cx] === '#';
      ctx.fillStyle = solid ? '#174250' : '#08101f';
      ctx.fillRect(cx * T, y, T + 0.6, depth);
      if (solid && hash(cx, 99) > 0.55) {
        ctx.fillStyle = 'rgba(255,211,110,0.25)';
        ctx.fillRect(cx * T + 6, y + 14, T - 12, 2);
      }
    }
  };

  /* ---------------- Kacheln ---------------- */
  function groundTile(ctx, level, cx, cy, x, y) {
    const above = level.tile(cx, cy - 1);
    const capped = above !== '#' && above !== 'v';
    ctx.fillStyle = cy >= 11 || !capped && level.tile(cx, cy - 2) === '#' ? '#1b4c5a' : '#23606e';
    ctx.fillRect(x, y, T + 0.6, T + 0.6);
    // Leiterbahnen
    const h = hash(cx, cy);
    ctx.strokeStyle = 'rgba(255,211,110,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (h < 0.5) { ctx.moveTo(x, y + 20); ctx.lineTo(x + 12, y + 20); ctx.lineTo(x + 18, y + 26); ctx.lineTo(x + T, y + 26); }
    else { ctx.moveTo(x + 8, y + T); ctx.lineTo(x + 8, y + 22); ctx.lineTo(x + 22, y + 14); ctx.lineTo(x + T, y + 14); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,211,110,0.7)';
    ctx.beginPath(); ctx.arc(h < 0.5 ? x + 12 : x + 22, h < 0.5 ? y + 20 : y + 14, 2.2, 0, Math.PI * 2); ctx.fill();
    if (capped) {
      const l = level.tile(cx - 1, cy) !== '#' , r = level.tile(cx + 1, cy) !== '#';
      ctx.fillStyle = '#4fc9a4';
      Art.rr(ctx, x - (l ? 0 : 2), y - 1, T + (l ? 0 : 2) + (r ? 0 : 2), 9, l || r ? 4 : 0); ctx.fill();
      ctx.fillStyle = '#8af0cf';
      ctx.fillRect(x + (l ? 3 : 0), y, T - (l ? 3 : 0) - (r ? 3 : 0), 2.5);
      ctx.fillStyle = '#3aa88a';
      for (let k = 4; k < T; k += 9) { ctx.beginPath(); ctx.arc(x + k + hash(cx, k) * 3, y + 8, 2.2, 0, Math.PI); ctx.fill(); }
    }
  }

  function blockTile(ctx, level, cx, cy, x, y) {
    ctx.fillStyle = '#463a9e';
    Art.rr(ctx, x + 1, y + 1, T - 2, T - 2, 6); ctx.fill();
    ctx.fillStyle = '#6a5ad0';
    Art.rr(ctx, x + 1, y + 1, T - 2, T - 6, 6); ctx.fill();
    ctx.fillStyle = '#8f82f0';
    Art.rr(ctx, x + 4, y + 3, T - 8, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,16,60,0.45)';
    Art.rr(ctx, x + 7, y + 11, T - 14, 11, 3); ctx.fill();
    ctx.fillStyle = hash(cx, cy) > 0.5 ? '#7cffb2' : '#ffd36e';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + 10, y + 14, 4 + hash(cy, cx) * 8, 2);
    ctx.fillRect(x + 10, y + 18, 3 + hash(cx + 1, cy) * 6, 2);
    ctx.globalAlpha = 1;
  }

  function oneWayTile(ctx, level, cx, cy, x, y) {
    const l = level.tile(cx - 1, cy) !== '-', r = level.tile(cx + 1, cy) !== '-';
    ctx.fillStyle = '#b07a2a';
    Art.rr(ctx, x + (l ? 2 : 0), y + 3, T - (l ? 2 : 0) - (r ? 2 : 0), 9, l || r ? 4 : 0); ctx.fill();
    ctx.fillStyle = '#ffcc66';
    Art.rr(ctx, x + (l ? 2 : 0), y, T - (l ? 2 : 0) - (r ? 2 : 0), 8, l || r ? 4 : 0); ctx.fill();
    ctx.fillStyle = '#fff0c2';
    ctx.fillRect(x + (l ? 5 : 0), y + 1.5, T - (l ? 5 : 0) - (r ? 5 : 0), 1.5);
    ctx.fillStyle = '#b07a2a';
    ctx.beginPath(); ctx.arc(x + T / 2, y + 4.5, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  function fanTile(ctx, level, cx, cy, x, y, t) {
    ctx.fillStyle = '#2a3f5c'; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#9fb6d3';
    Art.rr(ctx, x + 1, y, T - 2, 9, 3); ctx.fill();
    ctx.fillStyle = '#1a2a40';
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 5 + k * 6, y + 2, 3, 5);
    ctx.save();
    ctx.translate(x + T / 2, y + 20);
    ctx.rotate(t * 12);
    ctx.fillStyle = '#bfefff';
    for (let k = 0; k < 3; k++) { ctx.rotate((Math.PI * 2) / 3); ctx.beginPath(); ctx.ellipse(5, 0, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#1a2a40'; ctx.beginPath(); ctx.arc(x + T / 2, y + 20, 2, 0, Math.PI * 2); ctx.fill();
  }

  function spikeTile(ctx, x, y) {
    for (let k = 0; k < 3; k++) {
      const bx = x + 3 + k * 9;
      ctx.fillStyle = '#9fdcff';
      ctx.beginPath(); ctx.moveTo(bx, y + T); ctx.lineTo(bx + 4.5, y + 15); ctx.lineTo(bx + 9, y + T); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(bx + 2, y + T); ctx.lineTo(bx + 4.5, y + 18); ctx.lineTo(bx + 4.5, y + T); ctx.closePath(); ctx.fill();
    }
  }

  function wallTile(ctx, x, y, t) {
    ctx.fillStyle = 'rgba(255,107,138,0.18)'; ctx.fillRect(x + 4, y, T - 8, T);
    ctx.fillStyle = 'rgba(255,107,138,0.75)';
    const off = (t * 40) % 12;
    for (let k = -12; k < T; k += 12) ctx.fillRect(x + 10, y + k + off, T - 20, 5);
    ctx.fillStyle = '#ffb3c4'; ctx.fillRect(x + 14, y, 4, T);
  }

  Art.tiles = (ctx, level, x0, x1, t) => {
    const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(level.cols - 1, Math.floor(x1 / T));
    for (let cy = 0; cy < level.rows; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const ch = level.grid[cy][cx];
        if (ch === '.') continue;
        const x = cx * T, y = cy * T;
        if (ch === '#') groundTile(ctx, level, cx, cy, x, y);
        else if (ch === '=') blockTile(ctx, level, cx, cy, x, y);
        else if (ch === '-') oneWayTile(ctx, level, cx, cy, x, y);
        else if (ch === 'v') fanTile(ctx, level, cx, cy, x, y, t);
        else if (ch === '^') spikeTile(ctx, x, y);
        else if (ch === '|') wallTile(ctx, x, y, t);
      }
    }
  };

  /* ---------------- Sprechblasen ---------------- */
  const wrapCache = new Map();
  function wrap(ctx, text, maxW) {
    const key = text + '|' + maxW;
    if (wrapCache.has(key)) return wrapCache.get(key);
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    const res = { lines, width: Math.max(...lines.map((l) => ctx.measureText(l).width)) };
    if (wrapCache.size > 200) wrapCache.clear();
    wrapCache.set(key, res);
    return res;
  }

  /* (x, y) = Spitze des Zeigers. minX/maxX halten die Blase im sichtbaren Bereich. */
  Art.bubble = (ctx, x, y, text, alpha, style, minX, maxX, down) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '500 11px ' + Art.FONT;
    const { lines, width } = wrap(ctx, text, 168);
    const pad = 7, lh = 13;
    const bw = width + pad * 2, bh = lines.length * lh + pad * 2 - 2;
    let bx = x - bw / 2;
    if (minX !== undefined) bx = ALO.clamp(bx, minX + 4, maxX - bw - 4);
    const by = down ? y + 8 : y - 8 - bh;
    const fill = style === 'olaf' ? '#e3f4ff' : style === 'sign' ? '#1b2340' : '#fffaf0';
    const ink = style === 'olaf' ? '#173a66' : style === 'sign' ? '#d9fff0' : '#1d2440';
    const edge = style === 'olaf' ? '#7fb4e6' : style === 'sign' ? '#7ee0c3' : '#c9bfa8';
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    Art.rr(ctx, bx + 1.5, by + 2.5, bw, bh, 8); ctx.fill();
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    Art.rr(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    const tx = ALO.clamp(x, bx + 10, bx + bw - 10);
    const ey = down ? by + 0.5 : by + bh - 0.5;
    ctx.beginPath(); ctx.moveTo(tx - 5, ey); ctx.lineTo(x, y); ctx.lineTo(tx + 5, ey); ctx.closePath();
    ctx.fill();
    const ey2 = down ? by : by + bh;
    ctx.beginPath(); ctx.moveTo(tx - 5, ey2); ctx.lineTo(x, y); ctx.lineTo(tx + 5, ey2); ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lh));
    ctx.restore();
  };

  /* ---------------- HUD ---------------- */
  function heart(ctx, x, y, s, filled) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-7, -3, -4, -9, 0, -5);
    ctx.bezierCurveTo(4, -9, 7, -3, 0, 3);
    ctx.closePath();
    ctx.restore();
    if (filled) { ctx.fillStyle = '#ff6b8a'; ctx.fill(); ctx.strokeStyle = '#7a1f3a'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(20,24,50,0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function pill(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(12,18,40,0.62)';
    Art.rr(ctx, x, y, w, h, h / 2); ctx.fill();
  }

  Art.hud = (ctx, g) => {
    const s = g.safe, p = g.player;
    const left = s.left + 10, top = s.top + 8;
    ctx.textBaseline = 'middle';

    // Herzen, Bits, Apps
    pill(ctx, left, top, 196, 26);
    for (let i = 0; i < 3; i++) heart(ctx, left + 16 + i * 19, top + 14, 1.15, i < g.hearts);
    ctx.font = '600 13px ' + Art.FONT; ctx.textAlign = 'left';
    Art.bitIcon(ctx, left + 82, top + 13, 0.8, g.t);
    ctx.fillStyle = '#fff6d6'; ctx.fillText(String(g.stats.bits), left + 92, top + 14);
    Art.miniApp(ctx, left + 132, top + 13);
    ctx.fillStyle = '#d9fff0'; ctx.fillText(g.stats.apps + '/' + g.totalApps, left + 143, top + 14);

    // Frost-Anzeige
    // Schmale Ansicht (Hochformat): Frost-Leiste in eine zweite Zeile unter die Herzen
    const fw = Math.min(170, g.viewW * 0.3);
    const narrow = g.viewW / 2 - fw / 2 - 22 < left + 206;
    const fx = narrow ? left + 22 : g.viewW / 2 - fw / 2, fy = narrow ? top + 32 : top;
    pill(ctx, fx - 22, fy, fw + 30, 26);
    Art.snowIcon(ctx, fx - 9, fy + 13, 6.5, p.frost > 0.72 && Math.sin(g.t * 18) > 0 ? '#ff8fa3' : '#d8f6ff');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    Art.rr(ctx, fx, fy + 8, fw, 10, 5); ctx.fill();
    if (p.frost > 0.005) {
      const grd = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      grd.addColorStop(0, '#7cc7ff'); grd.addColorStop(0.7, '#d8f6ff'); grd.addColorStop(1, '#ffffff');
      ctx.fillStyle = grd;
      Art.rr(ctx, fx, fy + 8, Math.max(10, fw * p.frost), 10, 5); ctx.fill();
    }
    if (p.frost > 0.72) {
      ctx.strokeStyle = Math.sin(g.t * 18) > 0 ? '#ff8fa3' : 'rgba(255,143,163,0.3)'; ctx.lineWidth = 2;
      Art.rr(ctx, fx - 1, fy + 7, fw + 2, 12, 6); ctx.stroke();
    }
    let by = fy + 30;
    if (p.wakelock > 0) {
      pill(ctx, fx - 22, by, fw + 30, 20);
      Art.lockIcon(ctx, fx - 9, by + 10, 0.55);
      const blink = p.wakelock < 2 && Math.sin(g.t * 20) > 0;
      ctx.fillStyle = blink ? 'rgba(255,211,110,0.4)' : '#ffd36e';
      Art.rr(ctx, fx, by + 6, fw * Math.min(1, p.wakelock / g.wakelockDur), 8, 4); ctx.fill();
      by += 24;
    }
    if (g.boss && g.bossFight) {
      pill(ctx, fx - 22, by, fw + 30, 20);
      ctx.fillStyle = '#e3f4ff'; ctx.font = '600 11px ' + Art.FONT; ctx.textAlign = 'left';
      ctx.fillText('O.L.A.F.', fx - 12, by + 10.5);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < 3 - g.boss.hits ? '#ff9a3c' : 'rgba(255,255,255,0.18)';
        Art.rr(ctx, fx + 48 + i * ((fw - 48) / 3), by + 6, (fw - 48) / 3 - 4, 8, 4); ctx.fill();
      }
      by += 24;
    }

    // System-Log (Terminal)
    const lines = g.logLines.filter((l) => l.age < 7);
    if (lines.length) {
      const lx = left, ly = narrow ? by + 2 : top + 32;
      ctx.font = '500 10px ' + Art.MONO; ctx.textAlign = 'left';
      const shown = lines.slice(-3);
      const maxW = Math.min(g.viewW * 0.46, 300);
      ctx.fillStyle = 'rgba(8,12,28,0.55)';
      Art.rr(ctx, lx, ly, maxW, shown.length * 13 + 8, 6); ctx.fill();
      shown.forEach((l, i) => {
        ctx.globalAlpha = Math.min(1, (7 - l.age) / 1.2);
        ctx.fillStyle = l.kind === 'olaf' ? '#9fd8ff' : l.kind === 'warn' ? '#ffb3a0' : '#7cffb2';
        let txt = '$ ' + l.text;
        while (ctx.measureText(txt).width > maxW - 10 && txt.length > 4) txt = txt.slice(0, -2) + '…';
        ctx.fillText(txt, lx + 6, ly + 10 + i * 13);
      });
      ctx.globalAlpha = 1;
    }

    // Banner (z. B. "Alle lachen über OLAF!")
    if (g.banner && g.banner.t > 0) {
      const b = g.banner;
      const a = Math.min(1, b.t * 2, (b.dur - b.t + 0.01) * 3);
      ctx.globalAlpha = a;
      const cy = b.small ? g.viewH - 26 - g.safe.bottom : g.viewH * 0.36;
      ctx.font = (b.small ? '600 13' : '700 ' + Math.min(34, g.viewW / 14)) + 'px ' + Art.FONT; ctx.textAlign = 'center';
      ctx.lineWidth = 6; ctx.strokeStyle = '#1d2440'; ctx.strokeText(b.text, g.viewW / 2, cy);
      ctx.fillStyle = '#ffd36e'; ctx.fillText(b.text, g.viewW / 2, cy);
      if (b.sub) {
        ctx.font = '600 14px ' + Art.FONT; ctx.lineWidth = 4;
        ctx.strokeText(b.sub, g.viewW / 2, cy + 28); ctx.fillStyle = '#ffffff'; ctx.fillText(b.sub, g.viewW / 2, cy + 28);
      }
      ctx.globalAlpha = 1;
    }
  };

  /* Frost-Rand am Bildschirm */
  Art.frostVignette = (ctx, g) => {
    const f = g.player.frozen ? 1 : g.player.frost;
    if (f < 0.25) return;
    const a = Math.pow((f - 0.25) / 0.75, 1.3) * 0.75;
    const vw = g.viewW, vh = g.viewH;
    const grd = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    grd.addColorStop(0, 'rgba(200,240,255,0)');
    grd.addColorStop(1, 'rgba(215,245,255,' + a.toFixed(3) + ')');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = a;
    for (const [cx, cy, r] of [[0, 0, 0], [vw, 0, Math.PI / 2], [vw, vh, Math.PI], [0, vh, -Math.PI / 2]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(r);
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) {
        const len = 30 + k * 9 + f * 20;
        ctx.save(); ctx.rotate(0.15 + k * 0.3);
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(len, 0); ctx.lineTo(0, 3); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
})();
