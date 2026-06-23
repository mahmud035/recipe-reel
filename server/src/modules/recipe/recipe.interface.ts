import type { z } from "zod";
import type {
  quantitySourceSchema,
  ingredientSchema,
  recipeSchema,
} from "./recipe.validation.ts";

export type QuantitySource = z.infer<typeof quantitySourceSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Recipe = z.infer<typeof recipeSchema>;

/** Lifecycle of an extraction job, polled by the client. */
export type JobStatus =
  | "pending"
  | "transcribing"
  | "extracting"
  | "ready"
  | "error";
