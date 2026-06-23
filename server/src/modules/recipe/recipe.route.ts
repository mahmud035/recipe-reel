import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.ts";
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

recipeRouter.post(
  "/jobs",
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
