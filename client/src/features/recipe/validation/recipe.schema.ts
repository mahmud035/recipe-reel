import { z } from "zod";
import type { Recipe } from "../types/recipe.types.ts";

/** Mirrors the server's YouTube URL rule so bad links are caught before submit. */
const YOUTUBE_URL =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}(?:[?&#].*)?$/i;

export const urlFormSchema = z.object({
  youtubeUrl: z
    .string()
    .trim()
    .min(1, "ইউটিউব লিংক দিন।")
    .regex(YOUTUBE_URL, "সঠিক ইউটিউব ভিডিও লিংক দিন।"),
});
export type UrlFormValues = z.infer<typeof urlFormSchema>;

/**
 * The editable draft. `quantity` and `servings` may be blank (the human fills the
 * gaps the model left). Steps are wrapped as objects because react-hook-form field
 * arrays need a stable key per row.
 */
export const draftSchema = z.object({
  title: z.string().trim().min(1, "শিরোনাম দিন।"),
  servings: z.string(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "নাম দিন।"),
        quantity: z.string(),
      }),
    )
    .min(1, "অন্তত একটি উপকরণ দিন।"),
  steps: z
    .array(z.object({ value: z.string().trim().min(1, "ধাপ লিখুন।") }))
    .min(1, "অন্তত একটি ধাপ দিন।"),
});
export type DraftValues = z.infer<typeof draftSchema>;

/** Seeds the edit form from a freshly extracted recipe. */
export function toDraftValues(recipe: Recipe): DraftValues {
  return {
    title: recipe.title,
    servings: recipe.servings ?? "",
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? "",
    })),
    steps: recipe.steps.map((s) => ({ value: s })),
  };
}

/** Rebuilds a Recipe from edited form values (blank → null; source re-stamped). */
export function fromDraftValues(values: DraftValues): Recipe {
  return {
    title: values.title.trim(),
    servings: values.servings.trim() === "" ? null : values.servings.trim(),
    ingredients: values.ingredients.map((i) => {
      const quantity = i.quantity.trim() === "" ? null : i.quantity.trim();
      return { name: i.name.trim(), quantity, source: quantity ? "spoken" : null };
    }),
    steps: values.steps.map((s) => s.value.trim()),
  };
}
