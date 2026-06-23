// Mirror of the backend recipe contract (server recipe.interface.ts / recipe.validation.ts).
// Kept in lockstep so an API change surfaces as a TypeScript error here.

export type QuantitySource = "spoken" | "on_screen" | "inferred" | null;

export interface Ingredient {
  name: string;
  quantity: string | null;
  source: QuantitySource;
}

export interface Recipe {
  title: string;
  servings: string | null;
  ingredients: Ingredient[];
  steps: string[];
}

export type JobStatus =
  | "pending"
  | "transcribing"
  | "extracting"
  | "ready"
  | "error";

/** GET /api/recipe/jobs/:jobId payload. */
export interface JobState {
  status: JobStatus;
  recipe: Recipe | null;
  error: string | null;
}

/** POST /api/recipe/jobs payload. */
export interface CreateJobResponse {
  jobId: string;
}
