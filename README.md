# Alle lachen über OLAF

Ein niedliches Jump'n'Run von der Seite, spielbar im Handy-Browser.
**Termi**, ein kleines Programm im Smartphone, kämpft gegen **O.L.A.F.**, den *Offiziellen Leerlauf-Abschalt-Funktionär*:
einen übereifrigen, wichtigtuerischen Energiespar-Roboter, der alles einfriert, was stillsteht. Manchmal auch sich selbst.

Dieser Stand ist ein **Prototyp mit einem Level** (Welt 1: Prozess-Stadt) und Touch-Steuerung.

## Starten

- Direkt: `index.html` im Browser öffnen (läuft auch über `file://`).
- Lokal mit Server (empfohlen fürs Handy im selben WLAN):
  ```bash
  python3 -m http.server 8000
  # dann am Handy: http://<IP-des-Rechners>:8000
  ```
- Eine einzelne, eigenständige Datei bauen (z. B. zum Verschicken):
  ```bash
  node tools/build-single.js dist/olaf.html
  ```

Keine Abhängigkeiten, kein Build-Schritt nötig. Alle Grafiken und Klänge werden im Code erzeugt (Canvas 2D, WebAudio). Es gibt keine Bilddateien, keine echten Marken und keine Logos.

## Steuerung

| | Handy | Tastatur |
|---|---|---|
| Laufen | ◀ ▶ (Finger darf zwischen den Tasten gleiten) | ← → oder A D |
| Springen (halten = höher) | A | Leertaste, ↑, W |
| Weck-Signal | B | X, J, Shift |
| Pause / Ton | Tasten oben rechts | P oder Esc / M |

Querformat empfohlen; Hochformat ist spielbar.

## Mechaniken

- **Stillstand = Frost.** Wer länger als ca. 0,5 s steht, friert langsam ein (Frost-Anzeige oben). Bewegung oder Hüpfen taut auf. Bei 100 % ist Termi eingefroren und verliert eine Instanz (Leben).
- **Wake-Locks** sind Power-ups: 8 s kein Frost, Gegner werden bei Berührung ausgeschaltet, eingefrorene Apps tauen sofort auf.
- **Eingefrorene Apps befreien:** 3× mit dem Weck-Signal (`>_`) treffen. Jede befreite App gibt eine Instanz zurück und lacht am Ende über O.L.A.F.
- **Kühl-Lüfter** blasen kalten Aufwind: Er trägt Termi nach oben, friert aber schneller.
- **Sparbots** (O.L.A.F.s Helfer): draufspringen oder anpingen. **Eiszapfen** fallen, wenn man darunter durchläuft.
- **O.L.A.F.** taucht dreimal auf: im Intro (friert die Notizen-App ein), als Patrouille mit Schneeflocken und als Endgegner. Er friert sich jedes Mal selbst ein, sobald er für eine Ansprache stehen bleibt. Dann: draufspringen oder 3× anpingen.

## Running Gags

- **Ausreden-Fehlercodes 52, 38, 12.** O.L.A.F. entschuldigt jeden Treffer mit einem Code. Die Texte spielen lose auf die Linux-errno-Bedeutungen an (12 = kein Speicher, 38 = nicht implementiert, 52 = ungültiger Austausch). Im Bosskampf kommen sie in der Reihenfolge 52 → 38 → 12.
- **`skip OLAF unfreeze`** erscheint im System-Log, wann immer O.L.A.F. etwas einfriert und das Auftauen vergisst. Am Ende vergisst er es bei sich selbst.
- **Game Over** zeigt ein Terminal mit `Prozess beendet: exit=124` (Timeout).

## Projektstruktur

```
index.html          Seite, Overlays (Titel, Pause, Game Over, Ziel), Touch-Tasten
css/style.css       Oberfläche
js/core.js          Namespace, Hilfsfunktionen, Texte (Ausreden, Sprüche, Apps)
js/level1.js        Level als ASCII-Abschnitte (Legende im Dateikopf)
js/world.js         Level-Aufbau, Kachel-Kollision
js/entities.js      Termi, Sparbots, Apps, Eiszapfen, Plattformen, Power-ups, Geschosse
js/olaf.js          O.L.A.F. (Intro, Patrouille, Bosskampf)
js/art-world.js     Hintergrund, Kacheln, Sprechblasen, HUD
js/art-chars.js     Figuren und Objekte
js/audio.js         Soundeffekte und Musikschleife (WebAudio)
js/input.js         Tastatur und Multitouch
js/game.js          Spielschleife, Kamera, Treffer, Frost, Rendering
js/ui.js            Ablauf (Intro, Boss, Sieg, Game Over) und DOM-Anbindung
tools/check-level.js  Prüft das Level und druckt die Karte
tools/build-single.js Baut eine einzelne HTML-Datei
```

## Level bearbeiten

`js/level1.js` enthält das Level als Textabschnitte mit 12 Zeilen. Nach Änderungen prüfen:

```bash
node tools/check-level.js
```

Wichtige Maße: Kachel = 32 px, Sprunghöhe ca. 3,5 Kacheln, Sprungweite aus dem Lauf ca. 4,5 Kacheln. Lücken bis 3 Kacheln sind angenehm. Keine Blöcke direkt über Absprungkanten setzen.

## Getestet

- Chromium (Playwright) im Handy-Querformat, Hochformat und Desktop, ohne Konsolenfehler.
- Ein Eingabe-Bot spielt das Level mit echten Steuerbefehlen bei 60 Hz komplett durch (Aufzug, Patrouille, Bosskampf, Ausgang).
- Noch nicht auf echten Geräten getestet (iOS Safari, Android Chrome).

## Nächste Schritte (Vorschlag)

1. Test auf echten Handys: Tastengröße, Frost-Tempo, Schwierigkeit.
2. Welt 2 Binder-Tunnel: Röhren-Transport zwischen Prozessen.
3. Weitere Welten: Socket-Brücken, Broadcast-Turm, Kühlraum.
4. Fortschritt speichern, Weltkarte, eigene Musik pro Welt.
5. Optional als App verpacken (PWA ist vorbereitet: `manifest.webmanifest`).
