// Prüft die Level-Abschnitte (Zeilenlängen, Zeichen) und gibt die Karte aus.
// Aufruf: node tools/check-level.js
const fs = require('fs');
const path = require('path');
global.window = {};
new Function(['core.js', 'level1.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n'))();
const L = window.ALO.LEVEL1;
const allowed = new Set('.#=-v^oWFsIheC!PGOBR'.split(''));
let ok = true;
const rows = Array.from({ length: 12 }, () => '');
L.segments.forEach((s, i) => {
  if (s.rows.length !== 12) { console.error(`Abschnitt ${i}: ${s.rows.length} Zeilen statt 12`); ok = false; }
  s.rows.forEach((r, y) => {
    if (r.length > s.width) { console.error(`Abschnitt ${i}, Zeile ${y}: Länge ${r.length} > ${s.width}`); ok = false; }
    for (const ch of r) if (!allowed.has(ch)) { console.error(`Abschnitt ${i}, Zeile ${y}: unbekanntes Zeichen '${ch}'`); ok = false; }
    rows[y] += r.padEnd(s.width, '.');
  });
});
const all = rows.join('');
const count = (c) => [...all].filter((x) => x === c).length;
console.log(`Breite: ${rows[0].length} Kacheln`);
console.log(`Bits: ${count('o')}  Apps: ${count('F')} (Namen: ${L.apps.length})  Schilder: ${count('!')} (Texte: ${L.signs.length})`);
console.log(`Sparbots: ${count('s')}  Eiszapfen: ${count('I')}  Wake-Locks: ${count('W')}  Start: ${count('P')}  Ziel: ${count('G')}`);
if (count('F') !== L.apps.length) { console.error('Anzahl Apps passt nicht zu den Namen'); ok = false; }
if (count('!') !== L.signs.length) { console.error('Anzahl Schilder passt nicht zu den Texten'); ok = false; }
if (count('P') !== 1 || count('G') !== 1 || count('B') !== 1 || count('R') !== 1) { console.error('P, G, B und R müssen genau einmal vorkommen'); ok = false; }
const W = 100;
for (let x0 = 0; x0 < rows[0].length; x0 += W) {
  console.log('\nSpalte ' + x0);
  rows.forEach((r, y) => console.log(String(y).padStart(2) + ' ' + r.slice(x0, x0 + W)));
}
process.exit(ok ? 0 : 1);
