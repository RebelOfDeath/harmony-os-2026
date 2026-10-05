# Building AI Experiences Developers Can Trust and Want to Use

Scrollytelling talk for the HarmonyOS Technology Innovation Summit 2026 (Amsterdam, 9 October).

Open `index.html` in Chrome. Everything (GSAP, fonts, headshot) is vendored locally, so it works offline.

## Presenting

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PgDn` | next beat (works with a presentation clicker) |
| `←` `↑` `PgUp` | previous beat |
| `T` | start or stop the talk timer |
| `F` | fullscreen |
| `Home` / `End` | first / last beat |

Scrolling with a trackpad also works. The URL hash tracks the current beat (e.g. `index.html#d2`), so a reload returns to the same spot.

## Structure

- `index.html`: the stage (wireframe scene, IDE mock, overlays) and the story steps. Each `<section class="step" data-beat="…">` is one beat.
- `main.js`: one GSAP master timeline with a label per beat. `beat("name", t => …)` defines what animates on the way into that beat. Charts are generated from the data arrays at the top (sources: TSE 2025 Table XXIII, FSE 2026 Tables 4 and 5, the personalization audit).
- `style.css`: JetBrains palette; everything is authored on a 1600x900 canvas and scaled to the screen.

Visuals marked "schematic" or "illustrative" on screen (reliability curve shape, dot positions, MDP probabilities) are not measured data.
