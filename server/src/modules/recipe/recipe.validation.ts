import { z } from "zod";
import { canonicalizeYoutubeUrl } from "./canonicalize-youtube-url.ts";

/**
 * THE contract. The Recipe schema is the single source of truth: the Gemini
 * responseSchema, the Mongoose document, the API envelope, and the client type
 * all derive from this shape. An API change must break TypeScript at compile time.
 */

/** Internal provenance of a quantity. Populated server-side in v1 (text-only). */
export const quantitySourceSchema = z
  .enum(["spoken", "on_screen", "inferred"])
  .nullable();

export const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().nullable(), // nullable on purpose — real videos omit amounts
  source: quantitySourceSchema,
});

export const recipeSchema = z.object({
  title: z.string().min(1),
  servings: z.string().nullable(),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),
});

/**
 * Accepts standard public YouTube watch / shorts / youtu.be links with an 11-char
 * video id. Rejects non-YouTube hosts and malformed links with a clear message.
 */
const YOUTUBE_URL =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}(?:[?&#].*)?$/i;

/** Single source of truth for the invalid-link message (regex gate + canonical reject). */
const INVALID_YOUTUBE_URL_MESSAGE =
  "Please paste a public YouTube video link (youtube.com/watch?v=… or youtu.be/…).";

/** Request body for POST /api/recipe/jobs. */
export const createJobSchema = z.object({
  body: z.object({
    youtubeUrl: z
      .string()
      .trim()
      .min(1, "A YouTube link is required.")
      .regex(YOUTUBE_URL, INVALID_YOUTUBE_URL_MESSAGE)
      // Cheap regex gate first; then strip playlist/tracking params to a canonical watch
      // URL — this transformed value is what flows to createJob() and Gemini. A shape that
      // canonicalizes to null (no real video id) is rejected with the same message.
      .transform((value, ctx) => {
        const canonical = canonicalizeYoutubeUrl(value);
        if (canonical === null) {
          ctx.addIssue({ code: "custom", message: INVALID_YOUTUBE_URL_MESSAGE });
          return z.NEVER;
        }
        return canonical;
      }),
  }),
});

/** Request params for GET /api/recipe/jobs/:jobId. */
export const getJobSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
  }),
});

/** Request body for POST /api/recipe/pdf — the edited recipe. */
export const buildPdfSchema = z.object({
  body: z.object({
    recipe: recipeSchema,
  }),
});

export const recipeValidation = {
  quantitySourceSchema,
  ingredientSchema,
  recipeSchema,
  createJobSchema,
  getJobSchema,
  buildPdfSchema,
};
