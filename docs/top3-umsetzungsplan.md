# Top-3 Umsetzungsplan (Game Feel + Flow)

Ziel: Mit wenig Risiko spürbar mehr Spielspaß und flüssigere Sessions.

## Priorität 1 — Bulk-Kauf + „Bestes Upgrade jetzt"
**Impact:** sehr hoch • **Aufwand:** 6–10h

### Warum zuerst?
- Reduziert Klick-Frust sofort.
- Spieler kommen schneller in den „Entscheidungs-Flow" statt UI-Mikromanagement.

### Betroffene Dateien
- `index.html` (UI-Controls für Kaufmodus + Quick-Buy)
- `js/buildings.js` (Kauf in Mengen + Kostenberechnung)
- `js/ui-buildings.js` (Buttons, Labels, Disabled-State)
- `js/engine.js` (ROI/Heuristik für „bestes Upgrade")
- `js/i18n.js` (Texte für DE/EN)

### Umsetzung (Reihenfolge)
1. Kaufmodus-State (`x1/x10/x50/max`) zentral im Engine-State speichern.
2. Kostenfunktion für Mengenkäufe (`sum(geometric series)`) ergänzen.
3. Gebäude-Buttons auf gewählten Kaufmodus umstellen.
4. „Bestes Upgrade jetzt"-Button in Action-Bar + Heuristik (CPS-Zuwachs / Preis).
5. Tooltip: Warum nicht kaufbar + fehlender Betrag + ETA.

### Akzeptanzkriterien
- Kaufmodus wechselt ohne UI-Glitches.
- „Max" kauft nur so viel wie finanzierbar.
- Quick-Buy kauft reproduzierbar das beste ROI-Ziel.

---

## Priorität 2 — Prestige-Vorschau + Mini-Talentbaum (9 Nodes)
**Impact:** hoch • **Aufwand:** 10–14h

### Warum zweitens?
- Prestige wird verständlich und motivierend.
- Gibt mittelfristige Ziele statt nur Zahlenreset.

### Betroffene Dateien
- `index.html` (Talentbaum-Container im Prestige-Panel)
- `js/ui-prestige.js` (Rendern, Buttons, Zustände)
- `js/engine.js` (Effekte, Unlock-Checks, Punktevergabe)
- `js/save.js` (Persistenz der Talentpunkte + gewählter Talente)
- `data/config.js` / `js/config.js` (optional UI-Präferenzen)
- `js/i18n.js` (Talent-Namen/Beschreibung)

### Umsetzung (Reihenfolge)
1. Datenstruktur für 9 Talente (3 Klick, 3 Idle, 3 Hybrid) anlegen.
2. Punktekosten + Voraussetzungen (z. B. Tier 2 erst nach 2 Punkten) definieren.
3. Vorschau im Prestige-Panel: Gewinn bei Reset + „Aufholzeit".
4. Talente kaufbar machen + sofortige Effektanwendung.
5. Save/Load inkl. Migration für alte Saves.

### Akzeptanzkriterien
- Alte Saves laden ohne Fehler.
- Vorschau zeigt stabile Werte bei gleichem Spielstand.
- Talentkauf ist dauerhaft gespeichert und wirkt korrekt nach Reload.

---

## Priorität 3 — Performance-Pass (rAF + Pooling)
**Impact:** mittel bis hoch • **Aufwand:** 5–8h

### Warum drittens?
- Erhöht wahrgenommene Qualität auf allen Geräten.
- Hilft besonders bei späteren Content-Erweiterungen.

### Betroffene Dateien
- `js/main.js` (Tick/Render-Orchestrierung)
- `js/ui.js` (Update-Frequenzen, teure Re-Renders)
- `css/style.css` (reduzierte Animationen/Low-FX)
- `data/config.js` (Low-FX / Render-Frequenz optional als Setting)

### Umsetzung (Reihenfolge)
1. Visuelle Updates auf `requestAnimationFrame` legen.
2. Teure UI-Bereiche entkoppeln (Stats schnell, Panels langsamer).
3. Click-Effekte per Object Pooling statt ständiger DOM-Neuerzeugung.
4. Optional: Low-FX Preset aktivierbar machen.

### Akzeptanzkriterien
- Keine spürbaren FPS-Einbrüche bei hoher Klickrate.
- Weniger Ruckler bei gleichzeitigen Effekten.
- CPU-Nutzung bei Idle sichtbar reduziert.

---

## Empfohlene Reihenfolge über 2 Wochen

### Woche 1
- P1 komplett (Bulk + Quick-Buy) inkl. Balancing.
- Erste interne Playtests (20–30 min Sessions).

### Woche 2
- P2 Kern (Vorschau + 9 Talente + Save Migration).
- Restzeit: P3 rAF-Umstellung + Pooling.

## Definition of Done (gesamt)
- Keine Save-Breaks bei bestehenden Spielern.
- DE/EN Texte vollständig.
- UI bleibt mit Tastatur bedienbar.
- Tests (`tests/run-tests.mjs`) laufen durch.
