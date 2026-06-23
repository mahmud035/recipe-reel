import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catch-async.ts";
import { sendResponse } from "../../utils/send-response.ts";
import { recipeService } from "./recipe.service.ts";
import type { Recipe } from "./recipe.interface.ts";

/**
 * Recipe controller — the HTTP layer. Never touches the DB; it delegates to
 * recipeService and shapes the response envelope. Inputs are pre-validated by
 * validateRequest, so the casts below are safe.
 */

/**
 * POST /api/recipe/jobs — create an extraction job and return its id to poll.
 */
const createJob = catchAsync(async (req: Request, res: Response) => {
  const { youtubeUrl } = req.body as { youtubeUrl: string };
  const jobId = await recipeService.createJob(youtubeUrl.trim());
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Extraction job created.",
    data: { jobId },
  });
});

/**
 * GET /api/recipe/jobs/:jobId — return the pollable status / result of a job.
 */
const getJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params as { jobId: string };
  const job = await recipeService.getJob(jobId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Job status.",
    data: job,
  });
});

/**
 * POST /api/recipe/pdf — render the edited recipe and stream it as a download.
 */
const buildPdf = catchAsync(async (req: Request, res: Response) => {
  const { recipe } = req.body as { recipe: Recipe };
  const pdf = await recipeService.buildPdf(recipe);
  const filename = `${recipe.title}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="recipe.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.send(pdf);
});

export const recipeController = { createJob, getJob, buildPdf };
