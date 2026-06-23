import { GoogleGenAI } from '@google/genai';
import { BASE_BACKOFF_MS, MAX_RETRIES, MODEL } from './config.ts';
import {
  EXTRACT_FROM_VIDEO_PROMPT,
  TRANSCRIBE_PROMPT,
  extractFromTextPrompt,
} from './prompts.ts';
import type { ExtractResult, Recipe } from './types.ts';

// The adapter seam, present from line one (per the agreed architecture).
// v1 has exactly one implementation: GeminiExtractor. A future free cleanup model
// (e.g. a Groq Llama pass) can implement this same interface with no caller changes.
export interface RecipeExtractor {
  transcribe(youtubeUrl: string): Promise<string>;
  extractFromText(transcript: string): Promise<ExtractResult>;
  extractFromVideo(youtubeUrl: string): Promise<ExtractResult>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function describe(err: unknown): string {
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  return String(e?.status ?? e?.code ?? e?.message ?? err);
}
function isRateLimit(err: unknown): boolean {
  return /429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(describe(err));
}
function isTransient(err: unknown): boolean {
  return /\b50\d\b|UNAVAILABLE|deadline|timeout|ECONN|fetch failed|network/i.test(
    describe(err),
  );
}

export class GeminiExtractor implements RecipeExtractor {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Single choke point for every Gemini call, with backoff. `contents` is passed
  // straight through to the SDK (a string for text-only, a parts array for video).
  private async generate(contents: unknown, label: string): Promise<string> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await this.ai.models.generateContent({
          model: MODEL,
          // deterministic extraction; we want repeatable scoring
          config: { temperature: 0 },
          contents: contents as never,
        });
        const text = res.text;
        if (!text || !text.trim()) throw new Error('empty response from model');
        return text;
      } catch (err) {
        lastErr = err;
        const retryable = isRateLimit(err) || isTransient(err);
        if (!retryable || attempt === MAX_RETRIES) break;
        const wait = BASE_BACKOFF_MS * 2 ** attempt;
        const why = isRateLimit(err) ? 'rate-limited' : 'transient error';
        console.warn(
          `    [${label}] ${why}; retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`,
        );
        await sleep(wait);
      }
    }
    throw lastErr;
  }

  async transcribe(youtubeUrl: string): Promise<string> {
    const contents = [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: youtubeUrl } },
          { text: TRANSCRIBE_PROMPT },
        ],
      },
    ];
    return (await this.generate(contents, 'transcribe')).trim();
  }

  async extractFromText(transcript: string): Promise<ExtractResult> {
    const raw = await this.generate(
      extractFromTextPrompt(transcript),
      'extract-text',
    );
    return { recipe: parseRecipe(raw), raw };
  }

  async extractFromVideo(youtubeUrl: string): Promise<ExtractResult> {
    const contents = [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: youtubeUrl } },
          { text: EXTRACT_FROM_VIDEO_PROMPT },
        ],
      },
    ];
    const raw = await this.generate(contents, 'extract-video');
    return { recipe: parseRecipe(raw), raw };
  }
}

// --- defensive JSON parsing (no responseSchema dependency) ---

export function parseRecipe(raw: string): Recipe {
  return normalizeRecipe(JSON.parse(extractJsonObject(raw)));
}

function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('no JSON object found in model output');
  }
  return s.slice(start, end + 1);
}

function normalizeRecipe(o: any): Recipe {
  const validSources = ['spoken', 'on_screen', 'inferred'];
  const ingredients: Recipe['ingredients'] = Array.isArray(o?.ingredients)
    ? o.ingredients
        .map((i: any) => {
          const q =
            i?.quantity == null || String(i.quantity).trim() === ''
              ? null
              : String(i.quantity).trim();
          return {
            name: String(i?.name ?? '').trim(),
            quantity: q,
            source: validSources.includes(i?.source) ? i.source : null,
          };
        })
        .filter((i: any) => i.name)
    : [];
  const steps: string[] = Array.isArray(o?.steps)
    ? o.steps.map((s: any) => String(s).trim()).filter(Boolean)
    : [];
  return {
    title: o?.title ? String(o.title).trim() : null,
    servings: o?.servings ? String(o.servings).trim() : null,
    ingredients,
    steps,
  };
}
