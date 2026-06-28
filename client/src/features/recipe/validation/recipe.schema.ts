import { z } from "zod";
import type { Recipe } from "../types/recipe.types.ts";
import { formatQuantity } from "../../../utils/format-quantity.ts";
import { canonicalizeYoutubeUrl } from "../../../utils/canonicalize-youtube-url.ts";

export const urlFormSchema = z.object({
  youtubeUrl: z
    .string()
    .trim()
    .min(1, "ইউটিউব লিংক দিন।")
    // One validation source: a link that canonicalizes to null is not a real video link.
    .refine((v) => canonicalizeYoutubeUrl(v) !== null, "সঠিক ইউটিউব ভিডিও লিংক দিন।"),
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
    // Normalize the quantity at the form seed so the human reviews "৪ টি" (and can veto
    // it) instead of "৪টে". Cosmetic only — the raw extraction in Mongo is untouched, and
    // fromDraftValues passes whatever the user leaves through unchanged.
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: formatQuantity(i.quantity ?? ""),
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
