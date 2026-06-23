import type { Recipe } from "../recipe.interface.ts";

/**
 * The adapter seam, carried over from the spike. v1 has exactly one implementation
 * (GeminiExtractor). A future free cleanup model (e.g. a Groq Llama pass) can implement
 * this same interface with no caller changes.
 *
 * `extractFromText` and `extractFromVideo` return a Zod-validated Recipe or throw — a
 * malformed extraction never reaches the caller as data.
 */
export interface RecipeExtractor {
  /** Transcribe the spoken Bengali audio from a public YouTube URL. */
  transcribe(youtubeUrl: string): Promise<string>;
  /** v1 path: extract a recipe from transcript text only. */
  extractFromText(transcript: string): Promise<Recipe>;
  /** Deferred Phase-2 fallback: extract from the full video (audio + on-screen text). */
  extractFromVideo(youtubeUrl: string): Promise<Recipe>;
}
