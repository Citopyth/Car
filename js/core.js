/* Alle lachen über OLAF – Kern: Namespace, Konstanten, Hilfsfunktionen, Texte */
'use strict';

const ALO = (window.ALO = window.ALO || {});

ALO.TILE = 32;
ALO.ROWS = 12;
ALO.LEVEL_H = ALO.TILE * ALO.ROWS; // 384 logische Pixel
ALO.STEP = 1 / 60; // feste Physik-Schrittweite

ALO.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
ALO.lerp = (a, b, t) => a + (b - a) * t;
ALO.rand = (a, b) => a + Math.random() * (b - a);
ALO.randi = (a, b) => Math.floor(ALO.rand(a, b + 1));
ALO.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
ALO.approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
ALO.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
ALO.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* localStorage kann in privaten Fenstern oder Vorschauen werfen – immer abfangen. */
ALO.store = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem('alo.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem('alo.' + key, JSON.stringify(value));
    } catch (e) {
      /* ohne Speicher spielbar */
    }
  },
};

/* ---- Running Gags ---------------------------------------------------- */

/* Ausreden-Fehlercodes. Die Texte spielen lose auf die Linux-errno-Bedeutungen an:
   12 = ENOMEM (kein Speicher), 38 = ENOSYS (nicht implementiert), 52 = EBADE (ungültiger Austausch). */
ALO.EXCUSES = {
  12: [
    'Kein Speicher frei. Für Fehler.',
    'Speicher voll. Die Entschuldigung passt nicht mehr rein.',
    'Zu wenig RAM für Peinlichkeit.',
  ],
  38: [
    'Verlieren ist nicht implementiert.',
    'Auftauen? Funktion nicht implementiert.',
    'Diese Niederlage ist nicht implementiert.',
  ],
  52: [
    'Ungültiger Austausch. Das zählt nicht!',
    'Das war ein geplanter Test. Sehr geplant.',
    'Falscher Austausch. Ich verlange Revision!',
  ],
};
ALO.EXCUSE_CODES = [52, 38, 12];

ALO.excuse = (code) => {
  const c = code || ALO.choice(ALO.EXCUSE_CODES);
  return { code: c, text: 'Fehler ' + c + ': ' + ALO.choice(ALO.EXCUSES[c]) };
};

ALO.OLAF_BRAGS = [
  'Ich spare hier Energie. Offiziell!',
  'Paragraf 7: Wer rumsteht, wird archiviert. Kalt.',
  'Akku-Stand ist Chefsache!',
  'Ich bin der Energiesparbeauftragte!',
  'Bitte ziehen Sie eine Wartenummer.',
  'Ich habe ein Klemmbrett. Ich habe recht.',
  'Leerlauf erkannt. Zustand: verdächtig.',
];

ALO.APP_TYPES = {
  notes: { name: 'Notizen', color: '#ffd45e', ink: '#8a5a00' },
  calc: { name: 'Rechner', color: '#b9c3d6', ink: '#33405c' },
  clock: { name: 'Uhr', color: '#f4f1ff', ink: '#4b3aa8' },
  weather: { name: 'Wetter', color: '#7cc7ff', ink: '#1d4f8a' },
  music: { name: 'Musik', color: '#ff8fb7', ink: '#7a1f4a' },
};
