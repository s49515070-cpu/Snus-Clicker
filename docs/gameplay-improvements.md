# Gameplay-Verbesserungen für Snus Clicker

Diese Vorschläge fokussieren stark auf **Flow**, **Motivation** und **Performance-Gefühl**, ohne das Kernspiel komplett zu verändern.

## 1) Friction reduzieren (spürbar flüssiger)
- **Hold-to-click / Auto-Click beim gedrückt halten** für Maus + Touch.
- **Bulk-Kauf** (x1/x10/x50/max) direkt an jedem Gebäude.
- **Smart Quick Buy**: ein Button „Bestes Upgrade jetzt“ (ROI-basiert).
- **Cooldown-Timer sichtbar am Button**, damit Powerups klarer lesbar sind.

## 2) Deutlich stärkeres Midgame (längerer Spaß)
- **Synergie-Boni zwischen Gebäuden** (z. B. Farm bufft Fabrik).
- **Set-Boni pro Welt** (wenn 3 bestimmte Gebäude-Stufen erreicht sind).
- **Milestone-Truhen** mit 1x permanentem Bonus statt nur linearer Werte.
- **Mini-Events alle 3–5 Minuten** (kurze Entscheidungsfenster mit Risiko/Reward).

## 3) Prestige emotional aufladen
- **Prestige-Talente als Baum** (3 Pfade: Klick, Idle, Hybrid).
- **Soft-Challenges** für zusätzliche Prestige-Währung (z. B. „nur 3 Gebäudetypen“).
- **Erstes Prestige besser erklären** (voraussichtlicher Gewinn + geschätzte Aufholzeit).

## 4) Session-Flow verbessern (weniger Leerlauf)
- **„Nächster sinnvoller Schritt“-Hinweis** in der Top-Bar.
- **Adaptive Quests**: orientieren sich am Build des Spielers.
- **Streak-System** (kurze aktive Sessions werden belohnt, ohne Zwang).

## 5) Qualitäts-of-Life + Lesbarkeit
- **Damage/Income Breakdown**: Woher kommt CPS genau?
- **„Warum nicht kaufbar?“ Tooltips** (fehlende Ressource + ETA).
- **Bessere Zahlensprünge** (1.2K → 12.4K → 125K klar und ruhig).
- **Optionales „Low-FX“-Preset** für schwächere Geräte.

## 6) Performance & Responsiveness
- UI-Updates **entkoppeln** (Stats häufiger, teure Panels seltener).
- Click-Effekte via **Object Pooling**, um GC-Spikes zu vermeiden.
- **requestAnimationFrame** für visuelle Updates statt fixer Intervalle wo möglich.
- Rechenlast für große Zahlen optimieren (z. B. weniger Reformatting pro Tick).

## 7) Zwei schnelle High-Impact Features (MVP)
1. **Bulk-Kauf + Best-Upgrade-Button**
2. **Prestige-Baum (klein, 9 Talente) + klare Vorschau auf Gewinn**

Diese beiden Punkte verändern das Spielgefühl meistens am stärksten bei relativ überschaubarem Aufwand.
