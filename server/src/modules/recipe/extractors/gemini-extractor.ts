import { GoogleGenAI } from "@google/genai";
import { recipeSchema } from "../recipe.validation.ts";
import type { Recipe } from "../recipe.interface.ts";
import type { RecipeExtractor } from "./recipe-extractor.interface.ts";
import {
  EXTRACT_FROM_VIDEO_PROMPT,
  TRANSCRIBE_PROMPT,
  extractFromTextPrompt,
} from "./prompts.ts";
import { recipeResponseSchema } from "./response-schema.ts";

// Exponential backoff on 429 / rate-limit / transient (5xx) errors. The free tier WILL
// rate-limit; this is not optional. Carried over from the spike unchanged.
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  /**
   * Single choke point for every Gemini call, with backoff. When `responseSchema` is
   * provided the call is constrained to JSON of that shape; otherwise it returns free text.
   */
  private async generate(
    contents: unknown,
    label: string,
    responseSchema?: unknown,
  ): Promise<string> {
    const config: Record<string, unknown> = { temperature: 0 };
    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await this.ai.models.generateContent({
          model: this.model,
          config: config as never,
          contents: contents as never,
        });
        const text = res.text;
        if (!text || !text.trim()) throw new Error("empty response from model");
        return text;
      } catch (err) {
        lastErr = err;
        const retryable = isRateLimit(err) || isTransient(err);
        if (!retryable || attempt === MAX_RETRIES) break;
        const wait = BASE_BACKOFF_MS * 2 ** attempt;
        const why = isRateLimit(err) ? "rate-limited" : "transient error";
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
        role: "user",
        parts: [
          { fileData: { fileUri: youtubeUrl } },
          { text: TRANSCRIBE_PROMPT },
        ],
      },
    ];
    return (await this.generate(contents, "transcribe")).trim();
  }

  async extractFromText(transcript: string): Promise<Recipe> {
    const raw = await this.generate(
      extractFromTextPrompt(transcript),
      "extract-text",
      recipeResponseSchema,
    );
    return parseAndValidate(raw);
  }

  async extractFromVideo(youtubeUrl: string): Promise<Recipe> {
    const contents = [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: youtubeUrl } },
          { text: EXTRACT_FROM_VIDEO_PROMPT },
        ],
      },
    ];
    const raw = await this.generate(contents, "extract-video", recipeResponseSchema);
    return parseAndValidate(raw);
  }
}

/**
 * Parse the model output and validate it against the Recipe contract. responseMimeType
 * guarantees clean JSON; the fence-stripper is a belt-and-suspenders fallback. `source`
 * is stamped here (text-only v1: "spoken" when an amount exists, else null), then the
 * whole recipe is Zod-validated — a malformed recipe throws and never gets stored.
 */
function parseAndValidate(raw: string): Recipe {
  const obj = safeJsonParse(raw);
  const ingredients = Array.isArray(obj?.ingredients)
    ? obj.ingredients.map((i: { name?: unknown; quantity?: unknown }) => {
        const quantity =
          i?.quantity == null || String(i.quantity).trim() === ""
            ? null
            : String(i.quantity).trim();
        return {
          name: typeof i?.name === "string" ? i.name.trim() : "",
          quantity,
          source: quantity ? ("spoken" as const) : null,
        };
      })
    : [];

  const candidate = {
    title: typeof obj?.title === "string" ? obj.title.trim() : obj?.title,
    servings:
      obj?.servings == null || String(obj.servings).trim() === ""
        ? null
        : String(obj.servings).trim(),
    ingredients,
    steps: Array.isArray(obj?.steps)
      ? obj.steps.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [],
  };

  return recipeSchema.parse(candidate);
}

function safeJsonParse(raw: string): { [key: string]: unknown } {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(extractJsonObject(raw));
  }
}

function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object found in model output");
  }
  return s.slice(start, end + 1);
}
