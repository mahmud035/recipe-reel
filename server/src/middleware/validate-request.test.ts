import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { validateRequest } from "./validate-request.ts";
import { AppError } from "../utils/app-error.ts";
import {
  buildPdfSchema,
  createJobSchema,
  getJobSchema,
} from "../modules/recipe/recipe.validation.ts";

/**
 * Runs the middleware over a mock request and returns the (possibly mutated) request
 * plus whatever was passed to next() — so we can assert both the success body-rewrite
 * and the failure path without booting Express.
 */
function run(
  schema: Parameters<typeof validateRequest>[0],
  req: Partial<Request>,
): { req: Partial<Request>; nextArg: unknown } {
  let nextArg: unknown = "NOT_CALLED";
  const full = { body: undefined, params: {}, query: {}, ...req } as Request;
  validateRequest(schema)(full, {} as Response, (arg?: unknown) => {
    nextArg = arg;
  });
  return { req: full, nextArg };
}

test("createJob: transform rewrites req.body to the canonical URL", () => {
  const { req, nextArg } = run(createJobSchema, {
    body: { youtubeUrl: "https://www.youtube.com/watch?v=fPHxBQzaAzI&list=PLeGWWfn88-VM" },
  });
  assert.equal(nextArg, undefined); // passed validation
  assert.deepEqual(req.body, {
    youtubeUrl: "https://www.youtube.com/watch?v=fPHxBQzaAzI",
  });
});

test("createJob: non-YouTube host is rejected with a 400 AppError, body left intact", () => {
  const original = { youtubeUrl: "https://www.linkedin.com/feed/" };
  const { req, nextArg } = run(createJobSchema, { body: { ...original } });
  assert.ok(nextArg instanceof AppError);
  assert.equal((nextArg as AppError).statusCode, 400);
  assert.deepEqual(req.body, original); // not rewritten on failure
});

test("buildPdf: write-back is a content no-op (recipe round-trips unchanged)", () => {
  const recipe = {
    title: "ডিম ভুনা",
    servings: "৪ জন",
    ingredients: [
      { name: "ডিম", quantity: "৪ টি", source: "spoken" as const },
      { name: "পেঁয়াজ", quantity: null, source: null },
    ],
    steps: ["পেঁয়াজ কুচি করুন।", "ডিম সিদ্ধ করুন।"],
  };
  const { req, nextArg } = run(buildPdfSchema, { body: { recipe } });
  assert.equal(nextArg, undefined);
  // The exact regression guard: req.body.recipe must be byte-for-byte the input.
  assert.deepEqual(req.body, { recipe });
});

test("getJob: schema has no body key, so req.body is left untouched", () => {
  const untouched = { anything: "preserved" };
  const { req, nextArg } = run(getJobSchema, {
    params: { jobId: "507f1f77bcf86cd799439011" },
    body: untouched,
  });
  assert.equal(nextArg, undefined);
  assert.deepEqual(req.body, untouched);
});
