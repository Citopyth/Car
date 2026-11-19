// Baut eine einzelne, eigenständige HTML-Datei (CSS und JS eingebettet).
// Aufruf:  node tools/build-single.js <ausgabe.html> [--fragment]
//   --fragment  ohne <!doctype>/<html>/<head>/<body>, ohne Manifest/Icon/Viewport-Meta
//               (für Hosts, die die Seite selbst in ein HTML-Grundgerüst einbetten)
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = process.argv[2];
const fragment = process.argv.includes('--fragment');
if (!out) {
  console.error('Bitte Ausgabedatei angeben: node tools/build-single.js dist/olaf.html [--fragment]');
  process.exit(1);
}

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// CSS einbetten
html = html.replace(/<link rel="stylesheet" href="css\/style\.css">/, () => '<style>\n' + read('css/style.css') + '</style>');

// Skripte einbetten (Reihenfolge aus index.html übernehmen)
const scriptBlock = html.match(/<!-- @@SCRIPTS -->([\s\S]*?)<!-- @@SCRIPTS_END -->/);
if (!scriptBlock) throw new Error('Skript-Markierungen in index.html fehlen');
const files = [...scriptBlock[1].matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = files.map((f) => '/* ---- ' + f + ' ---- */\n' + read(f).replace(/<\/script/gi, '<\\/script')).join('\n');
html = html.replace(scriptBlock[0], () => '<script>\n' + js + '\n</script>');

if (fragment) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const keep = head
    .split('\n')
    .filter((l) => !/name="viewport"|rel="manifest"|rel="icon"|apple-mobile|mobile-web-app|charset=/.test(l))
    .join('\n')
    .replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>');
  html = keep.trim() + '\n' + body.trim() + '\n';
}

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, html);
console.log('geschrieben: ' + out + ' (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' Skripte' + (fragment ? ', Fragment' : '') + ')');
