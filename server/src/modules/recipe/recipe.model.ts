import mongoose, { Schema } from "mongoose";
import type { Recipe, JobStatus } from "./recipe.interface.ts";

/** Server-side job state. The poll loop and page refreshes need this persisted. */
export interface JobDocument {
  youtubeUrl: string;
  status: JobStatus;
  recipe: Recipe | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSubSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: String, default: null },
    source: {
      type: String,
      enum: ["spoken", "on_screen", "inferred", null],
      default: null,
    },
  },
  { _id: false },
);

const recipeSubSchema = new Schema(
  {
    title: { type: String, required: true },
    servings: { type: String, default: null },
    ingredients: { type: [ingredientSubSchema], default: [] },
    steps: { type: [String], default: [] },
  },
  { _id: false },
);

const jobSchema = new Schema<JobDocument>(
  {
    youtubeUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "transcribing", "extracting", "ready", "error"],
      default: "pending",
    },
    recipe: { type: recipeSubSchema, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

// Assumption #3: no history feature, so drafts auto-expire 24h after creation.
jobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const JobModel = mongoose.model<JobDocument>("Job", jobSchema);
