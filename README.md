# রাঁধুনি — Recipe-Note

> Paste a Bengali YouTube cooking link → get a clean, **editable** Bengali recipe → download it as a print-ready PDF.

A single-screen web app that turns Bangla cooking videos into structured recipe notes, built for one
real, non-technical user — a Bengali home cook on a phone — and run end-to-end on a **$0 hosting and
inference budget**.

- **Live app:** https://recipe-note-app.vercel.app
- **Stack:** React 19 · TanStack Query v5 · Tailwind v4 · Express 5 · Mongoose 9 · Zod 4 · Gemini Flash · Puppeteer
- **Status:** v1 (text-only extraction) in production

---

## Table of contents

1. [The problem](#the-problem)
2. [What it does](#what-it-does)
3. [The one decision that gated the whole project](#the-one-decision-that-gated-the-whole-project)
4. [Architecture at a glance](#architecture-at-a-glance)
5. [The contract: one schema, four consumers](#the-contract-one-schema-four-consumers)
6. [Backend deep-dive](#backend-deep-dive)
7. [Frontend deep-dive](#frontend-deep-dive)
8. [Case study: the Bengali quantity formatter](#case-study-the-bengali-quantity-formatter)
9. [The $0 constraint, defended in depth](#the-0-constraint-defended-in-depth)
10. [Deployment topology](#deployment-topology)
11. [Tech stack](#tech-stack)
12. [Repository layout](#repository-layout)
13. [Running it locally](#running-it-locally)
14. [Trade-offs and what's deferred](#trade-offs-and-whats-deferred)
15. [Roadmap](#roadmap)

---

## The problem

A Bengali home cook finds a recipe in a YouTube video. The recipe lives in someone's spoken narration,
scattered across ten minutes, in Bangla. To actually cook from it she has to scrub back and forth,
pause, and try to remember "how much cumin was that again?" — phone in one hand, onion in the other.

The goal was deliberately narrow: **one person, one phone, one job.** Paste a link, get a recipe she
can read, fix, and keep. Not a social platform, not a recipe database — a personal tool that has to feel
trustworthy to someone who does not care that there is software underneath.

Two hard constraints shaped every decision:

- **$0.** No paid inference, no paid hosting. Free Gemini Flash tier, free MongoDB Atlas tier, Vercel
  free tier, and a self-hosted lab box. The architecture has to _survive_ the free tier's rate limits and
  daily quotas, not just call an API.
- **It must not lie.** A recipe with a wrong quantity is worse than no recipe. The model extracts a
  _draft_; the human always reviews and edits before anything is final.

---

## What it does

The entire app is a single screen that moves through four states:

```
  ┌─────────────┐   paste link    ┌─────────────┐   poll ~2.5s    ┌──────────────┐   edit + confirm
  │  INPUT      │ ──────────────► │  WORKING    │ ──────────────► │  DRAFT       │ ─────────────────►  PDF
  │  hero       │                 │  skeleton   │                 │  (editable)  │      download
  └─────────────┘                 └─────────────┘                 └──────────────┘
        │                               │                                │
        │                               ├─► error card (retry)           └─► every field is editable:
        └─ Bengali URL validation       └─► "taking too long" (5-min          title, servings, each
           (youtube.com / youtu.be)         wall-clock ceiling)               ingredient name+quantity,
                                                                              each step
```

1. **Input** — she pastes a public YouTube link. Client- and server-side validation accept only real
   `youtube.com/watch`, `/shorts`, and `youtu.be` links.
2. **Working** — the server transcribes the spoken audio with Gemini, then extracts a structured recipe
   from that transcript. The client polls a job id every 2.5 s, showing calm Bengali status copy
   (`ভিডিও শোনা হচ্ছে…` → `রেসিপি তৈরি হচ্ছে…`) over a skeleton, never a spinner.
3. **Draft** — the recipe comes back as a fully **editable** form: title, servings, every ingredient
   (name + quantity), every step. She can add, remove, and correct anything. This is the trust layer —
   the model proposes, she disposes.
4. **PDF** — on confirm, the server renders the _edited_ recipe to a print-ready A4 PDF with embedded
   Noto Sans Bengali (so Bengali conjuncts shape correctly even on a machine with no Bengali font) and
   streams it back for download.

---

## The one decision that gated the whole project

Before a single line of UI was written, there was a **Phase 0 spike** (`spike/`) to answer the only
question that mattered: _on real Bengali cooking videos, how many ingredient quantities can free Gemini
Flash actually capture — and how much of that depends on reading on-screen text the audio never mentions?_

The spike is a throwaway measurement harness, not the app. For each test video it ran Gemini three ways:

- **transcribe** the spoken audio only,
- **path A** — extract a recipe from the transcript alone (no video access),
- **path B** — extract from the full video (audio **+** on-screen frames), labelling each quantity's
  source as `spoken` / `on_screen` / `inferred`.

Then it scored the quantity-capture rate of A vs B and counted how many amounts came **only** from
on-screen text — the amounts a transcript-only pipeline would silently lose.

**The gate:** build the core loop only if extraction captures most quantities _and the recipes are
actually correct_. Otherwise, stop and rethink — no UI on top of a model that invents amounts.

The spike came back green enough to ship **v1 as a text-only (transcript) pipeline**, with the
multimodal path deferred but already designed for (see below). Crucially, the spike validated the
prompts, the JSON shape, and the `RecipeExtractor` adapter seam — all of which carried into production
**unchanged**. The experiment wasn't thrown away; it became the contract.

---

## Architecture at a glance

```
                         BROWSER (mobile-first)
                                │
                                │  HTTPS, cross-origin, no cookies
                                ▼
        ┌──────────────────────────────────────────────┐
        │  CLIENT — Vercel                               │
        │  React 19 · TanStack Query · Tailwind v4       │
        │  features/recipe mirrors the backend domain    │
        └──────────────────────────────────────────────┘
                                │  VITE_API_BASE_URL → {origin}/api
                                ▼
                    Cloudflare Tunnel → Traefik
                                │
        ┌──────────────────────────────────────────────┐
        │  SERVER — self-hosted lab box (Docker)         │
        │  Express 5 · Mongoose 9 · Zod 4                │
        │                                                │
        │  POST /api/recipe/jobs   ─► async job runner   │
        │  GET  /api/recipe/jobs/:id ─► poll status      │
        │  POST /api/recipe/pdf    ─► Puppeteer render   │
        └──────────────────────────────────────────────┘
              │                    │                  │
              ▼                    ▼                  ▼
        Gemini Flash         MongoDB Atlas      Puppeteer + Chrome
        (transcribe +        (jobs + daily      (embedded Noto
         extract)            budget counter)     Sans Bengali → PDF)
```

The client and server are **separate deploys with no shared module** — a fact that shows up repeatedly
below (the Recipe type, the brand constant, and the quantity formatter each exist as deliberately
byte-identical twins, one per package, cross-referenced in comments).

---

## The contract: one schema, four consumers

The whole system is anchored on a single Zod schema in `server/src/modules/recipe/recipe.validation.ts`:

```ts
export const recipeSchema = z.object({
  title: z.string().min(1),
  servings: z.string().nullable(),
  ingredients: z.array(ingredientSchema).min(1), // { name, quantity: string|null, source }
  steps: z.array(z.string().min(1)).min(1),
});
```

That one shape is the single source of truth for **four** consumers:

1. the **Gemini response schema** (constrains the model's JSON output),
2. the **Mongoose document** (`recipe.model.ts`),
3. the **API envelope** returned to the client,
4. the **client-side type** (mirrored, so a backend change breaks the frontend at _compile_ time, not at
   runtime).

`quantity` is `nullable` **on purpose** — real videos constantly omit amounts, and the honest thing is to
store `null`, not a hallucinated number. `source` (`spoken` / `on_screen` / `inferred`) is provenance,
stamped server-side; in text-only v1 it's `"spoken"` when an amount exists, else `null`.

Every endpoint returns the same response envelope: `{ statusCode, success, message, data }`.

---

## Backend deep-dive

**Express 5 · Mongoose 9 · Zod 4 · TypeScript (ESM, native `.ts` execution on Node 24).**

### Feature module pattern

Each feature is one folder with a strict separation of concerns — routes wire, controllers translate
HTTP, services own all logic and DB access:

```
modules/recipe/
  recipe.route.ts        router + validation wiring only
  recipe.controller.ts   HTTP translation — never touches the DB
  recipe.service.ts      ALL business logic + persistence
  recipe.validation.ts   Zod schemas (THE contract)
  recipe.model.ts        Mongoose schema
  recipe.interface.ts    types derived from the Zod schema
  extractors/            the Gemini adapter, behind an interface
  pdf/                   Puppeteer render + Bengali font + formatter twin
  budget.service.ts      daily quota guard
```

### The async job pipeline

Transcription + extraction takes tens of seconds and can rate-limit — far too long to hold an HTTP
request open. So job creation is **fire-and-forget**:

- `POST /api/recipe/jobs` validates the URL, checks the daily budget, creates a `pending` job, kicks off
  the pipeline **without awaiting it**, and returns the job id immediately.
- The pipeline advances the job's persisted status as it goes: `pending → transcribing → extracting →
ready` (or `error`). The client polls `GET /jobs/:id` to follow along.
- Every failure mode is contained so a bad job can never crash the server:
  - a **wall-clock timeout** (3 min) flips a hung Gemini call to `error`;
  - a **race guard** ensures a timed-out job that completes late can't clobber an already-`ready` one
    (and vice versa) — writes are conditional on the expected current status;
  - internal errors are mapped to **safe, user-facing messages** (the raw error is logged, never leaked);
  - on startup, `sweepOrphanedJobs()` fails any job left in-flight by a previous process — with a single
    in-process runner, an orphaned job would otherwise poll forever.
- Jobs **auto-expire 24 h** after creation via a Mongo TTL index — there's no history feature, so drafts
  shouldn't linger.

### The extractor adapter seam

Gemini lives behind a `RecipeExtractor` interface. `GeminiExtractor` is the only implementation in v1,
but the seam is load-bearing: it's what lets the deferred multimodal path (or a future cleanup model) slot
in without touching the service. The extractor:

- funnels **every** model call through one choke point with **exponential backoff** on 429 /
  rate-limit / transient 5xx errors (the free tier _will_ rate-limit — this is not optional);
- requests **schema-enforced JSON** (`responseSchema`) with a defensive fence-stripping parser as a
  belt-and-suspenders fallback;
- **Zod-validates** every recipe before it can be stored — a malformed recipe throws and is never
  persisted;
- calls an injected `onCall` hook once per real API response, so the budget counter increments without
  coupling the extractor to the persistence layer.

### Quota defense (two independent layers)

The free tier has a hard daily request cap. Blowing through it would lock the family out, so:

1. **Per-IP rate limit** on `POST /jobs` only (10 jobs/hour) — scoped tightly so it never throttles the
   client's 2.5 s status poll or the container's 30 s health check. The limiter keys on Cloudflare's
   authoritative `CF-Connecting-IP` header, **not** the spoofable `X-Forwarded-For` chain, so a malicious
   caller can't mint unlimited buckets.
2. **Persistent daily budget guard** — a Mongo-backed counter bucketed by the _Pacific_ calendar date
   (matching Gemini's midnight-PT reset). A new job is refused **before** any spend if its projected cost
   (2 calls/recipe) would exceed the ceiling. Persisting the counter in Mongo — not in memory — means a
   redeploy can't silently reset the guard mid-day.

### PDF rendering

`POST /api/recipe/pdf` takes the _human-reviewed_ recipe and renders it with Puppeteer. The HTML template
embeds **Noto Sans Bengali as a base64 `@font-face`**, so Chromium's HarfBuzz shaping produces correct
Bengali conjuncts (e.g. the রাঁ in রাঁধুনি) regardless of what fonts the host machine has. The output is a
clean A4 card: brand wordmark, title, servings, ingredients (name ↔ quantity), numbered steps, footer.

---

## Frontend deep-dive

**React 19 · TanStack Query v5 · Tailwind v4 · React-Hook-Form · Zod · Vite.**

### Feature-driven, mirrors the backend 1:1

```
src/
  pages/recipe-page.tsx          orchestrates the four-state flow
  features/recipe/
    api/        recipe.api.ts · recipe.queries.ts   (TanStack Query)
    components/ url-input-form · recipe-states · draft-review · ingredient-row
    validation/ recipe.schema.ts   (form <-> contract mapping)
    types/      recipe.types.ts     (mirror of the backend Recipe)
  constants/app.ts                 brand name + tagline (twin of the server's)
  utils/format-quantity.ts         the Bengali formatter (twin of the server's)
```

Pages orchestrate; feature components execute. **All server state lives in TanStack Query** — local
`useState` is only for UI flow (which job, when it started, whether it timed out). There are no
cross-feature imports; the `features/` boundary is real.

### Polling, without a stale loop

`useJobPolling` drives the working state. Its `refetchInterval` is a function, not a constant: it returns
`2500` while the job is in flight, and `false` the instant the job is `ready`/`error` **or** a 5-minute
wall-clock ceiling is crossed — so a wedged job can never poll forever. A parallel `setTimeout` flips the
UI to a friendly "taking too long" card at the same ceiling.

### Every data view defines all its states

Silence is treated as a bug. Each state is explicit and styled with **semantic Tailwind v4 tokens** (no
raw hex in components): an input hero, a calm skeleton (never a spinner), a comfortable editable draft, an
error card with retry, and the "taking too long" fallback. Bengali microcopy throughout, 44px tap targets,
mobile-first (~380 px first, centered `max-w-md` on desktop).

### The design system

A warm, trustworthy palette defined once in `index.css` via Tailwind v4 `@theme` tokens — deep teal
primary (`#1b4d4a`), warm cream ground (`#faf7f2`), white cards, a single muted terracotta accent
(`#c2703d`) reserved for focus/active. Noto Sans Bengali with a Bengali-friendly 1.7 line-height. The same
teal/cream pair flows into the PWA manifest (`theme_color` / `background_color`) and the PDF card, so the
brand is consistent from browser chrome to printout.

---

## Case study: the Bengali quantity formatter

A small feature that captures the project's whole philosophy: **be helpful, but never corrupt the user's
data.**

Bengali recipe creators routinely write quantities like `৪টে` (four-of-them) jammed together, and
colloquially say `টে` where the standard written classifier is `টি`. The polish goal: display `৪ টে` as a
clean `৪ টি`. The danger: Bengali is full of ordinary words that _contain_ `টে` — প্লেটে (on the plate),
হোটেলে (at the hotel), গেটে (at the gate), প্যাকেটে (in the packet). A naive find-replace would mangle the
recipe text.

The solution is a single **anchored** regex that only ever matches a _whole quantity field_ beginning
with a Bengali digit:

```ts
const QUANTITY = /^([০-৯][০-৯\-–]*)\s*(টে|টি|টা)$/;

export function formatQuantity(quantity: string): string {
  const match = quantity.trim().match(QUANTITY);
  if (!match) return quantity; // not a <number><classifier> → untouched
  const classifier = match[2] === 'টে' ? 'টি' : match[2];
  return `${match[1]} ${classifier}`;
}
```

Because it's anchored (`^…$`) and must **start with a digit**, prose words can never match. It's applied
in exactly two places — at the form-seed boundary on the client (where the editable input's value _is_ the
form state, so display-only formatting is impossible) and again, idempotently, at PDF render as defense
against a value typed after seeding. `name` and `steps` are never fed to it.

The function exists as **two byte-identical copies** — `client/src/utils/format-quantity.ts` and
`server/src/modules/recipe/pdf/format-quantity.ts` — because the two deploys can't share a module. Each
file's header documents the twin and the invariant. This "honest duplication, cross-referenced" pattern is
used wherever a constant must agree across the origin split (also the brand name and the `Recipe` type).

---

## The $0 constraint, defended in depth

| Pressure                                         | Defense                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Free Gemini tier **rate-limits** under load      | Exponential backoff at the single model-call choke point                                                                       |
| Free tier has a **hard daily cap**               | Persistent, Pacific-bucketed budget counter refuses new jobs before spend, with headroom reserved for the family               |
| A stranger could **hammer the public endpoint**  | Per-IP limiter on `POST /jobs`, keyed on un-spoofable `CF-Connecting-IP`                                                       |
| A redeploy could **reset an in-memory guard**    | Budget counter lives in Mongo, not process memory                                                                              |
| YouTube preview API could be **metered/removed** | Extraction sits behind a `RecipeExtractor` adapter; fallback (yt-dlp download → Gemini File API) slots in behind the same seam |
| Host machine may have **no Bengali font**        | Noto Sans Bengali embedded as base64 in the PDF; HarfBuzz shapes the conjuncts                                                 |

---

## Deployment topology

The client and server ship on **completely separate pipelines**, by design.

**Client → Vercel.** Static React build, free tier. Talks to the server cross-origin via
`VITE_API_BASE_URL` (the server origin, no trailing `/api`). No cookies — the axios instance and the
server's CORS policy are both credential-less, so a credentialed cross-origin call can't be browser-blocked.

**Server → self-hosted lab box, via GHCR + Coolify.** The box never builds anything:

```
git push (server/**)  ─►  GitHub Actions  ─►  build image  ─►  push to GHCR  ─►  Coolify pulls & redeploys
```

- A **path-filtered** workflow (`.github/workflows/deploy-server.yml`) only fires on `server/**` changes,
  so a client-only push never rebuilds the image. Concurrency is serialized so two deploys can't race.
- A **multi-stage Dockerfile**: a slim Node 24 stage runs `tsc` (with all Puppeteer browser downloads
  skipped), then the official `ghcr.io/puppeteer/puppeteer` runtime image (Chrome pre-cached, pinned to
  the exact Puppeteer version) runs the compiled output as a non-root user.
- **`tini` as PID 1** reaps zombie Chrome processes from hard render crashes that `browser.close()` can't
  catch.
- A **container health check** hits `127.0.0.1/health` (explicitly IPv4, to avoid `::1` flapping behind
  Traefik) using Node 24's built-in `fetch` — no `curl` in the image.
- The box sits behind a **Cloudflare Tunnel → Traefik**; the tunnel is outbound-only, which is exactly why
  `CF-Connecting-IP` can be trusted as the rate-limit key.
- Successful/failed deploys ping a Discord webhook.

The whole environment **fails loud**: the server validates its env with Zod at boot and `process.exit(1)`s
on a bad config, so misconfiguration surfaces at startup, not mid-request.

---

## Tech stack

| Layer            | Choice                                      | Why                                                          |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **Frontend**     | React 19, TypeScript                        | Mirrors backend domains 1:1; compile-time contract safety    |
| **Server state** | TanStack Query v5                           | Polling, caching, and request lifecycle for the job loop     |
| **Forms**        | React-Hook-Form + Zod                       | The editable draft is the trust layer; validated client-side |
| **Styling**      | Tailwind v4 (`@theme` tokens)               | One semantic palette across app, PWA manifest, and PDF       |
| **Backend**      | Express 5, TypeScript (ESM)                 | Native `.ts` on Node 24, no build step in dev                |
| **Validation**   | Zod 4                                       | One schema → model, API, client type, and AI response shape  |
| **Database**     | MongoDB Atlas (Mongoose 9)                  | Free tier; jobs + budget counter with TTL indexes            |
| **AI**           | Google Gemini Flash (`@google/genai`)       | Free tier; fetches the video on Google's side (no yt-dlp)    |
| **PDF**          | Puppeteer + embedded Noto Sans Bengali      | Correct Bengali conjunct shaping, font-independent output    |
| **Hardening**    | Helmet, express-rate-limit                  | CORS allowlist, per-IP throttle, secure headers              |
| **Deploy**       | Vercel · GHCR · Coolify · Cloudflare Tunnel | Split-origin, $0, push-to-deploy                             |

---

## Repository layout

```
recipe-note/
├── client/                 React 19 SPA (Vercel)
│   ├── public/             favicons, OG banner, web manifest
│   └── src/
│       ├── pages/          orchestration
│       ├── features/recipe/  api · components · validation · types
│       ├── constants/      brand (twin of server)
│       └── utils/          formatter (twin of server)
├── server/                 Express API (self-hosted, Dockerized)
│   ├── Dockerfile          multi-stage; Puppeteer runtime + tini
│   └── src/
│       ├── config/         Zod-validated env (fails loud at boot)
│       ├── middleware/     rate-limit · validate-request · error-handler
│       └── modules/recipe/ route · controller · service · model · validation
│           ├── extractors/   Gemini adapter behind RecipeExtractor
│           └── pdf/          Puppeteer render + Bengali font + formatter twin
├── spike/                  Phase 0 throwaway measurement harness (the bet)
└── .github/workflows/      server-only build → GHCR → Coolify
```

---

## Running it locally

Requires **Node 24+** (the server and spike run `.ts` directly — no build step in dev).

**1. Server**

```bash
cd server
npm install
cp .env.example .env     # fill in MONGODB_URI + GEMINI_API_KEY (free key: aistudio.google.com/apikey)
npm run dev              # http://localhost:5000
```

**2. Client** (in a second terminal)

```bash
cd client
npm install
cp .env.example .env     # LEAVE VITE_API_BASE_URL UNSET locally — Vite proxies /api → :5000
npm run dev              # http://localhost:5173
```

**3. (Optional) Re-run the Phase 0 spike**

```bash
cd spike
npm install
cp .env.example .env             # paste your free Gemini key
cp videos.example.json videos.json   # add 5–10 real Bengali cooking video URLs
npm run spike                    # prints an A-vs-B table, writes results.json
```

Confirm the live free Flash model name in AI Studio for your region and set `GEMINI_MODEL` if it differs
from the default (`gemini-3.1-flash-lite`).

---

## Trade-offs and what's deferred

- **Text-only extraction (v1).** Quantities that appear _only_ on screen (and never spoken) are not
  captured yet. The spike proved the multimodal lift exists; the multimodal prompt and adapter are already
  written, just not wired into the core loop — a Phase 2 toggle behind the same `RecipeExtractor` seam.
- **Single in-process job runner.** No queue/worker — fine for a family-scale tool, and the startup
  orphan-sweep handles restarts. A real queue is the obvious scale-up step.
- **No history / no auth.** Jobs auto-expire after 24 h; the app is intentionally stateless-feeling. No
  accounts means no cookies, which simplifies the cross-origin security model.
- **Honest duplication across the origin split.** The `Recipe` type, the brand constant, and the quantity
  formatter each exist as byte-identical twins (one per package) rather than a shared package — a
  deliberate call for a two-deploy project, documented in-code so the twins can't silently drift.

---

## Roadmap

- **Phase 2:** wire the multimodal extractor (read on-screen amounts), gated behind a feature flag.
- yt-dlp → Gemini File API fallback if Google meters the YouTube preview input.
- Richer PDF layouts and optional recipe history once accounts are justified.

---

<sub>রাঁধুনি — built for one real cook, on a $0 budget, with the model proposing and the human always deciding.</sub>
