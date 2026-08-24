# LiftNex nutrition research

Checked on 24 August 2026. We reviewed active open-source projects rather than copying
their implementation. Their licenses and attribution requirements remain separate from
LiftNex's codebase.

## References selected

- [wger](https://github.com/wger-project/wger) — about 6.7k stars. The strongest full
  fitness reference: workouts, nutrition, weight tracking, food database and a REST API.
- [OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker) — about 2.3k stars.
  Best reference for a privacy-first food diary, macros/micros, recipes, barcode lookup,
  export/import and optional integrations.
- [Waistline](https://github.com/davidhealey/waistline) — about 700 stars. Useful for the
  low-friction diary model, local food database, barcode scanning and Open Food Facts/USDA
  data sources.
- [FoodYou](https://github.com/maksimowiczm/FoodYou) — about 575 stars. Good reference for
  a local-first Material-style experience, nutrient detail and multiple food catalogues.
- [Kcal](https://github.com/kcal-app/kcal) and [NutriTrace](https://github.com/TraceApps/nutritrace)
  — smaller but useful references for configurable meals, self-hosting and no-telemetry
  defaults.

## Features adapted into LiftNex

- A local-first diary grouped by breakfast, lunch, dinner and snack.
- Daily calorie, protein, carbohydrate and fat totals with editable goals.
- Search the broad public Open Food Facts catalogue automatically, with a dependency-free local
  catalogue of common foods and previously logged foods as an offline fallback; barcode lookup
  remains available for exact product matching and manual entry is always available.
- Client-side filters for nutrition grade, maximum sugar, minimum protein and category.
- One-tap re-add for recent foods and an expandable daily fibre, sugar and salt panel.
- Food snapshots stored with each entry, so old diary entries do not change if a catalogue
  record is later edited or disappears.
- Recipe builder with ingredient-level nutrition and one-tap add-to-diary servings.
- Water logging with quick amounts and a configurable daily goal.
- A persistent fasting timer with completed-fast history.
- USDA FoodData Central search through an authenticated server proxy when `USDA_API_KEY`
  is configured.
- An offline local coach plus an explicit-consent, server-side Gemini coach when
  `GEMINI_API_KEY` is configured. The default model is `gemini-3.5-flash-lite`; an
  OpenAI-compatible provider remains available as a fallback through `AI_BASE_URL`,
  `AI_API_KEY` and `AI_MODEL`.
- Existing LiftNex offline storage and account sync now include nutrition entries, while the
  five-item bottom navigation remains unchanged.

## Data and privacy notes

Food text searches use LiftNex's same-origin Open Food Facts proxy first, so the browser never
needs a third-party key and the UI can search a much larger catalogue. If the network is
unavailable, the app falls back to its local catalogue and previously logged foods. The app
stores diary entries locally first and only synchronizes them with a LiftNex account when the
user is signed in. Barcode lookup uses the same proxy for exact product matching. The product
label should remain the source of truth.

USDA FoodData Central remains available as an optional server-side extension, while Open Food
Facts is the default broad search source and does not require a USDA key.

No source code from the projects above was copied into LiftNex. The AI coach is intentionally
text-summary based rather than food-photo based: it is opt-in, transparent, privacy-limited
to a compact diary summary and explicitly marked as non-medical guidance.
