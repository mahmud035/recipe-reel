import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.ts";
import { jobsRateLimiter } from "../../middleware/rate-limit.ts";
import { recipeController } from "./recipe.controller.ts";
import {
  buildPdfSchema,
  createJobSchema,
  getJobSchema,
} from "./recipe.validation.ts";

/**
 * Recipe routes.
 *   POST /api/recipe/jobs        — create an extraction job
 *   GET  /api/recipe/jobs/:jobId — poll job status / result
 *   POST /api/recipe/pdf         — render + stream the edited recipe PDF
 */
export const recipeRouter = Router();

// jobsRateLimiter runs first so an over-limit caller is rejected before any validation or DB
// work. Scoped here, never globally — GET /jobs polling and /health must stay unthrottled.
recipeRouter.post(
  "/jobs",
  jobsRateLimiter,
  validateRequest(createJobSchema),
  recipeController.createJob,
);

recipeRouter.get(
  "/jobs/:jobId",
  validateRequest(getJobSchema),
  recipeController.getJob,
);

recipeRouter.post(
  "/pdf",
  validateRequest(buildPdfSchema),
  recipeController.buildPdf,
);
