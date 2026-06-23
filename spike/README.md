# Phase 0 spike — quantity-capture measurement

**Purpose:** answer the one question that decides the whole project before any UI exists —
_on real Bengali cooking videos, how many ingredient quantities can Gemini Flash actually
capture, and how much of that depends on reading on-screen text?_

This is a throwaway measurement harness, **not** the app. It is $0 (free Gemini Flash tier),
uses no yt-dlp, and never touches YouTube from your machine — Gemini fetches the video on
Google's side.

## What it does

For each video it runs Gemini Flash three times:

1. **transcribe** the spoken audio only → transcript text
2. **path A (text-only)** — extract a recipe from that transcript _with no access to the video_
3. **path B (multimodal)** — extract a recipe from the full video (audio **+** on-screen frames),
   labelling each quantity's `source` as `spoken` / `on_screen` / `inferred` / `null`

Then it scores the **quantity-capture rate** of A vs B and counts how many quantities came
**only from on-screen text** (the amounts a transcript-only pipeline would silently lose).

## Run it

```bash
cd spike
npm install

cp .env.example .env          # then paste your free key from https://aistudio.google.com/apikey
cp videos.example.json videos.json   # then add 5–10 real Bengali cooking video URLs

npm run spike
```

Requires Node 24+ (runs `.ts` directly, no build step). Confirm the free Flash model name
in AI Studio for your region and set `GEMINI_MODEL` in `.env` if it differs from the default.

## The gate (this is what you hand back before any core-loop code)

`npm run spike` prints a per-video A-vs-B table and writes full recipes + raw model output
to `results.json`. **Read `results.json` — don't trust the rates blind.** Decide:

- **GREEN** — build the core loop — if path B captures most quantities _and_ the recipes are
  actually correct (right amounts, right steps), so the review screen only fixes the odd field.
- **Multimodal justified** if the on-screen lift is large (it should be — that was the bet).
- **STOP and rethink** if B still misses most quantities or invents them. No UI until this is green.

## Notes

- The extractor sits behind a `RecipeExtractor` interface (`extractor.ts`). `GeminiExtractor`
  is the only implementation; this seam is what lets a free cleanup model slot in later, and
  carries straight into the real app.
- JSON is requested in the prompt and parsed defensively (no `responseSchema` dependency), so
  the harness runs regardless of the exact SDK config field. The production adapter can switch
  to schema-enforced output once that field is confirmed in AI Studio.
- YouTube-URL input is a free **preview** feature ("limits likely to change"). If Google ever
  meters or removes it, the fallback is yt-dlp _download_ → Gemini File API upload, behind the
  same adapter.
