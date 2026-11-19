/* Welt 1 – Prozess-Stadt. Das Level wird aus Abschnitten (je 12 Zeilen) zusammengesetzt.
   Legende:
   #  Boden           =  Block            -  Plattform (von unten durchspringbar)
   v  Kühl-Lüfter im Boden (kalter Aufwind)  ^  Eisstacheln
   o  Bit (Sammelobjekt)   W  Wake-Lock (Power-up)   F  eingefrorene App
   s  Sparbot (Gegner)     I  Eiszapfen            h  Plattform horizontal   e  Aufzug vertikal
   C  Speicherpunkt        !  Hinweisschild        P  Start      G  Ausgang
   O  Auslöser O.L.A.F.-Patrouille   B / R  linke / rechte Wand der Boss-Arena (Zeile 0)
   Zeilen kürzer als die Abschnittsbreite werden mit '.' aufgefüllt. */
'use strict';

(function () {
  const seg = (width, rows) => ({ width, rows });

  const segments = [
    // A – Start & Tutorial (34)
    seg(34, [
      '', '', '', '', '', '',
      '....................ooo',
      '...................-----',
      '..........o.o.o...............F',
      '.P...!.....!.........!.....!.==',
      '##################################',
      '##################################',
    ]),
    // B – Dächer mit Lücken (40)
    seg(40, [
      '', '', '', '', '', '',
      '......................ooo',
      '.....................=====',
      '.......ooo.......oo',
      '.............s..........s............W',
      '#######...######....########..##########',
      '#######...######....########..##########',
    ]),
    // C – Aufzug über dem Abgrund (32)
    seg(32, [
      '', '', '', '', '',
      '................ooFoo',
      '................======',
      '.......o.o.o',
      '.....h.................---',
      '.............e',
      '####......................######',
      '####......................######',
    ]),
    // D – Speicherpunkt & Kühl-Lüfter (36)
    seg(36, [
      '', '', '', '',
      '..........o.....o.....o',
      '', '', '', '',
      '...C..!...........s............s',
      '##########v#####v#####v#############',
      '####################################',
    ]),
    // E – O.L.A.F.-Patrouille (40)
    seg(40, [
      '', '', '', '', '', '',
      '.........ooo.................oFo',
      '........=====...............=====',
      '',
      '..O.....................s',
      '################...#####################',
      '################...#####################',
    ]),
    // F – Eiszapfen-Gasse (40)
    seg(40, [
      '..================================',
      '..================================',
      '......I....I.....I.....I....I',
      '', '', '',
      '...................ooo',
      '..................----',
      '',
      '.........F....^^.........s....F',
      '###################################...##',
      '###################################...##',
    ]),
    // G – Boss-Arena (30)
    seg(30, [
      '.B........................R',
      '', '', '', '', '', '',
      '.....----.........----',
      '',
      'C',
      '##############################',
      '##############################',
    ]),
    // H – Ausgang (12)
    seg(12, [
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '...........=',
      '.....G.....=',
      '############',
      '############',
    ]),
  ];

  ALO.LEVEL1 = {
    id: 'w1',
    name: 'Prozess-Stadt',
    world: 1,
    segments,
    // t = Text für Touch-Steuerung, d = Text für Tastatur
    signs: [
      { t: '◀ ▶ laufen · A springen', d: '← → laufen · Leertaste springen' },
      'Stillstand = Frost! Bleib in Bewegung.',
      'Auf der Stelle hüpfen hilft auch.',
      { t: 'Eingefrorene App! B = Weck-Signal, 3× treffen.', d: 'Eingefrorene App! X = Weck-Signal, 3× treffen.' },
      'Kühl-Lüfter: Der Wind hebt dich hoch, friert aber schneller.',
    ],
    apps: ['notes', 'calc', 'clock', 'weather', 'music'],
  };

  ALO.WORLDS = [
    { name: 'Prozess-Stadt', open: true },
    { name: 'Binder-Tunnel', open: false },
    { name: 'Socket-Brücken', open: false },
    { name: 'Broadcast-Turm', open: false },
    { name: 'Kühlraum', open: false },
  ];
})();
