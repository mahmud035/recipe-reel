import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MODEL, PACING_MS } from './config.ts';
import { GeminiExtractor } from './extractor.ts';
import { scoreRecipe, type Score } from './score.ts';
import type { VideoInput } from './types.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const trunc = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + '…' : s;

interface Row {
  video: string;
  a?: Score;
  b?: Score;
  delta?: number;
  error?: string;
}

function loadVideos(): VideoInput[] {
  if (!existsSync('videos.json')) {
    console.error(
      'Missing videos.json.\n' +
        '  cp videos.example.json videos.json\n' +
        '  then add 5–10 real Bengali cooking video URLs your family actually uses.',
    );
    process.exit(1);
  }
  const v = JSON.parse(readFileSync('videos.json', 'utf8'));
  if (!Array.isArray(v) || v.length === 0) {
    console.error(
      'videos.json must be a non-empty JSON array of { url } objects.',
    );
    process.exit(1);
  }
  return v;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      'Missing GEMINI_API_KEY. Put it in spike/.env (see .env.example).',
    );
    console.error('Get a free key at https://aistudio.google.com/apikey');
    process.exit(1);
  }

  const videos = loadVideos();
  const extractor = new GeminiExtractor(apiKey);
  console.log(`Phase 0 spike — ${videos.length} video(s) · model ${MODEL}\n`);

  const rows: Row[] = [];
  const results: any[] = [];

  for (const [i, v] of videos.entries()) {
    const label = v.title || v.id || v.url;
    console.log(`[${i + 1}/${videos.length}] ${label}`);
    const row: Row = { video: label };
    const out: any = { video: v };
    try {
      console.log('  transcribing (audio only)…');
      const transcript = await extractor.transcribe(v.url);
      out.transcript = transcript;
      await sleep(PACING_MS);

      console.log('  path A — extract from transcript (text-only)…');
      const a = await extractor.extractFromText(transcript);
      out.recipe_textOnly = a.recipe;
      out.raw_textOnly = a.raw;
      const sa = scoreRecipe(a.recipe);
      await sleep(PACING_MS);

      console.log('  path B — extract from full video (multimodal)…');
      const b = await extractor.extractFromVideo(v.url);
      out.recipe_multimodal = b.recipe;
      out.raw_multimodal = b.raw;
      const sb = scoreRecipe(b.recipe);
      await sleep(PACING_MS);

      row.a = sa;
      row.b = sb;
      row.delta = sb.rate - sa.rate;
      console.log(
        `  A ${sa.withQty}/${sa.total} (${pct(sa.rate)}) · ` +
          `B ${sb.withQty}/${sb.total} (${pct(sb.rate)}) · ` +
          `on-screen ${sb.onScreen} · lift ${pct(row.delta)}\n`,
      );
    } catch (err: any) {
      row.error = String(err?.message ?? err);
      out.error = row.error;
      console.error(`  ERROR: ${row.error}\n`);
    }
    rows.push(row);
    results.push(out);
  }

  printTable(rows);
  writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log(
    '\nFull recipes + raw model output → spike/results.json. EYEBALL IT before trusting any rate.',
  );
  summarize(rows);
}

function printTable(rows: Row[]) {
  const head = ['Video', 'A qty', 'A%', 'B qty', 'B%', 'on-scr', 'lift'];
  const data = rows.map((r) =>
    r.error || !r.a || !r.b
      ? [trunc(r.video, 30), '—', '—', '—', '—', '—', 'ERR']
      : [
          trunc(r.video, 30),
          `${r.a.withQty}/${r.a.total}`,
          pct(r.a.rate),
          `${r.b.withQty}/${r.b.total}`,
          pct(r.b.rate),
          String(r.b.onScreen),
          pct(r.delta ?? 0),
        ],
  );
  const widths = head.map((h, c) =>
    Math.max(h.length, ...data.map((d) => d[c].length)),
  );
  const line = (cols: string[]) =>
    cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log('\n' + line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const d of data) console.log(line(d));
}

function summarize(rows: Row[]) {
  const ok = rows.filter((r) => r.a && r.b && !r.error);
  if (ok.length === 0) {
    console.log('\nNo successful videos — fix the errors above and re-run.');
    return;
  }
  const avg = (f: (r: Row) => number) =>
    ok.reduce((s, r) => s + f(r), 0) / ok.length;
  const avgA = avg((r) => r.a!.rate);
  const avgB = avg((r) => r.b!.rate);
  const avgLift = avg((r) => r.delta ?? 0);
  const totalOnScreen = ok.reduce((s, r) => s + r.b!.onScreen, 0);

  console.log(`\nAcross ${ok.length} video(s):`);
  console.log(
    `  avg quantity-capture   A (text-only) ${pct(avgA)}   B (multimodal) ${pct(avgB)}   lift ${pct(avgLift)}`,
  );
  console.log(
    `  quantities captured ONLY from on-screen text: ${totalOnScreen}`,
  );
  console.log(
    '\nGate (your judgement, using spike/results.json — do not trust the numbers blind):',
  );
  console.log(
    "  • B's capture is high AND the recipes read correctly  → GREEN: build the core loop.",
  );
  console.log(
    '  • Big on-screen lift                                  → multimodal is justified (the whole point).',
  );
  console.log(
    '  • B still misses most quantities, or invents them     → STOP: rethink before any UI.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
