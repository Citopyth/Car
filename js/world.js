/* Level-Aufbau aus den Abschnitten und Kachel-Kollision */
'use strict';

(function () {
  const T = ALO.TILE;
  const TILE_CHARS = new Set(['#', '=', '-', 'v', '^']);
  const SOLID = new Set(['#', '=', 'v', '|']);

  class Level {
    constructor(def) {
      this.def = def;
      const rows = Array.from({ length: ALO.ROWS }, () => '');
      def.segments.forEach((s) => {
        for (let y = 0; y < ALO.ROWS; y++) rows[y] += (s.rows[y] || '').padEnd(s.width, '.');
      });
      this.cols = rows[0].length;
      this.rows = ALO.ROWS;
      this.pxW = this.cols * T;
      this.grid = [];
      this.spawns = [];
      this.markers = {};
      for (let y = 0; y < this.rows; y++) {
        const line = [];
        for (let x = 0; x < this.cols; x++) {
          const ch = rows[y][x];
          if (TILE_CHARS.has(ch)) line.push(ch);
          else {
            line.push('.');
            if (ch === 'B' || ch === 'R' || ch === 'O' || ch === 'P' || ch === 'G') this.markers[ch] = { cx: x, cy: y };
            if (ch !== '.') this.spawns.push({ ch, cx: x, cy: y });
          }
        }
        this.grid.push(line);
      }
      this.spawns.sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    }

    tile(cx, cy) {
      if (cx < 0 || cx >= this.cols) return '#'; // Levelränder sind Wände
      if (cy < 0 || cy >= this.rows) return '.';
      return this.grid[cy][cx];
    }

    setTile(cx, cy, ch) {
      if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) this.grid[cy][cx] = ch;
    }

    isSolid(cx, cy) {
      return SOLID.has(this.tile(cx, cy));
    }

    isOneWay(cx, cy) {
      return this.tile(cx, cy) === '-';
    }

    /* Wand (Firewall) über eine ganze Spalte, z. B. für die Boss-Arena */
    setWall(cx, on) {
      for (let y = 0; y < this.rows - 2; y++) this.setTile(cx, y, on ? '|' : '.');
    }

    /* Eisstacheln: Trefferzone ist die untere Kachelhälfte */
    touchesSpikes(b) {
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          if (this.tile(cx, cy) !== '^') continue;
          const box = { x: cx * T + 5, y: cy * T + 16, w: T - 10, h: 16 };
          if (ALO.overlap(b, box)) return true;
        }
      }
      return false;
    }

    /* Liegt unter dem Punkt (Fußhöhe) fester Boden? Für Gegner, die an Kanten umdrehen. */
    groundAt(px, py) {
      const cx = Math.floor(px / T), cy = Math.floor(py / T);
      return this.isSolid(cx, cy) || this.isOneWay(cx, cy);
    }
  }

  /* Bewegt einen Körper (x, y, w, h, vx, vy) achsenweise gegen die Kacheln.
     Setzt onGround, hitWall (-1/0/1) und hitHead. */
  function moveBody(b, dt, level) {
    b.hitWall = 0;
    b.hitHead = false;

    // X-Achse
    b.x += b.vx * dt;
    let y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
    if (b.vx > 0) {
      const cx = Math.floor((b.x + b.w - 0.01) / T);
      for (let cy = y0; cy <= y1; cy++) {
        if (level.isSolid(cx, cy)) { b.x = cx * T - b.w; b.vx = 0; b.hitWall = 1; break; }
      }
    } else if (b.vx < 0) {
      const cx = Math.floor(b.x / T);
      for (let cy = y0; cy <= y1; cy++) {
        if (level.isSolid(cx, cy)) { b.x = (cx + 1) * T; b.vx = 0; b.hitWall = -1; break; }
      }
    }

    // Y-Achse
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    b.onGround = false;
    const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
    if (b.vy > 0) {
      const cy = Math.floor((b.y + b.h - 0.01) / T);
      for (let cx = x0; cx <= x1; cx++) {
        const solid = level.isSolid(cx, cy);
        const oneWay = !b.dropThrough && level.isOneWay(cx, cy) && prevBottom <= cy * T + 0.5;
        if (solid || oneWay) { b.y = cy * T - b.h; b.vy = 0; b.onGround = true; break; }
      }
    } else if (b.vy < 0) {
      const cy = Math.floor(b.y / T);
      for (let cx = x0; cx <= x1; cx++) {
        if (level.isSolid(cx, cy)) { b.y = (cy + 1) * T; b.vy = 0; b.hitHead = true; break; }
      }
    }
  }

  ALO.Level = Level;
  ALO.moveBody = moveBody;
})();
