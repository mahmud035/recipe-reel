import mongoose from "mongoose";
import { ZodError } from "zod";
import { config } from "../../config/index.ts";
import { AppError } from "../../utils/app-error.ts";
import { JobModel } from "./recipe.model.ts";
import { GeminiExtractor } from "./extractors/gemini-extractor.ts";
import { generateRecipePdf } from "./pdf/pdf.service.ts";
import type { RecipeExtractor } from "./extractors/recipe-extractor.interface.ts";
import type { JobStatus, Recipe } from "./recipe.interface.ts";

/** Hard wall-clock ceiling per job — a hung Gemini call flips the job to error. */
const JOB_TIMEOUT_MS = 3 * 60 * 1000;

/** The only extractor implementation in v1, behind the adapter seam. */
const extractor: RecipeExtractor = new GeminiExtractor(
  config.GEMINI_API_KEY,
  config.GEMINI_MODEL,
);

/** Status values that mean a job is still in flight. */
const IN_FLIGHT: JobStatus[] = ["pending", "transcribing", "extracting"];

class TimeoutError extends Error {}

/** Rejects with TimeoutError if `promise` does not settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError("job exceeded time limit")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Maps an internal error to a safe, user-facing message (full error is logged). */
function toUserMessage(err: unknown): string {
  if (err instanceof TimeoutError) {
    return "Extraction took too long and was stopped. Please try again.";
  }
  if (err instanceof ZodError) {
    return "A recipe could not be read reliably from this video.";
  }
  const text = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(text)) {
    return "The free daily quota is exhausted. Please try again later.";
  }
  return "Could not extract a recipe from this video.";
}

/**
 * Marks a job failed, but never clobbers a job that already reached `ready`
 * (guards the race where a timed-out run completes late).
 */
async function failJob(jobId: string, message: string): Promise<void> {
  await JobModel.findOneAndUpdate(
    { _id: jobId, status: { $ne: "ready" } },
    { status: "error", error: message },
  );
}

/** The actual transcribe → extract pipeline. Each write advances the polled status. */
async function processJob(jobId: string, youtubeUrl: string): Promise<void> {
  await JobModel.findByIdAndUpdate(jobId, { status: "transcribing" });
  const transcript = await extractor.transcribe(youtubeUrl);

  await JobModel.findByIdAndUpdate(jobId, { status: "extracting" });
  const recipe: Recipe = await extractor.extractFromText(transcript);

  // Only complete a job that is still extracting; if a timeout already failed it,
  // this no-ops and the late result is discarded.
  await JobModel.findOneAndUpdate(
    { _id: jobId, status: "extracting" },
    { status: "ready", recipe, error: null },
  );
}

/**
 * Runs a job to completion under a wall-clock timeout. Any failure (extractor throw,
 * Zod failure, timeout) is caught and recorded on the job — it is never rethrown, so a
 * failing job cannot crash the server.
 */
async function runJob(jobId: string, youtubeUrl: string): Promise<void> {
  try {
    await withTimeout(processJob(jobId, youtubeUrl), JOB_TIMEOUT_MS);
  } catch (err) {
    console.error(`[job ${jobId}] failed:`, err);
    await failJob(jobId, toUserMessage(err));
  }
}

/**
 * Creates a job and kicks off the async pipeline WITHOUT awaiting it, so the HTTP
 * request returns immediately. The top-level .catch is the crash backstop for failures
 * that escape runJob's own handling (e.g. the failJob write itself rejecting).
 *
 * @param youtubeUrl validated public YouTube URL
 * @returns the new job id to be polled
 */
async function createJob(youtubeUrl: string): Promise<string> {
  const job = await JobModel.create({ youtubeUrl, status: "pending" });
  const jobId = String(job._id);

  void runJob(jobId, youtubeUrl).catch((err: unknown) => {
    console.error(`[job ${jobId}] unhandled runner failure:`, err);
  });

  return jobId;
}

/**
 * Returns the pollable state of a job.
 *
 * @param jobId job id from createJob
 * @throws AppError 404 if the id is malformed or no such job exists
 */
async function getJob(
  jobId: string,
): Promise<{ status: JobStatus; recipe: Recipe | null; error: string | null }> {
  if (!mongoose.isValidObjectId(jobId)) {
    throw new AppError(404, "Job not found");
  }
  const job = await JobModel.findById(jobId).lean();
  if (!job) {
    throw new AppError(404, "Job not found");
  }
  return { status: job.status, recipe: job.recipe, error: job.error };
}

/**
 * On startup, fails any job left in flight by a previous process. With a single in-process
 * runner, any in-flight job after a restart is orphaned and would otherwise poll forever.
 */
async function sweepOrphanedJobs(): Promise<void> {
  const result = await JobModel.updateMany(
    { status: { $in: IN_FLIGHT } },
    { status: "error", error: "The server restarted while this job was processing." },
  );
  if (result.modifiedCount > 0) {
    console.log(`Swept ${result.modifiedCount} orphaned job(s) to error.`);
  }
}

/**
 * Renders the (edited, validated) recipe to a downloadable PDF buffer.
 *
 * @param recipe the human-reviewed recipe from the draft screen
 */
async function buildPdf(recipe: Recipe): Promise<Buffer> {
  return generateRecipePdf(recipe);
}

export const recipeService = {
  createJob,
  getJob,
  buildPdf,
  sweepOrphanedJobs,
};
