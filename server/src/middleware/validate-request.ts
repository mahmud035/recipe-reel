import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app-error.ts";

/**
 * Validates `{ body, params, query }` against a Zod schema before the controller
 * runs. On failure it forwards a 400 AppError; the controller never sees bad input.
 */
export function validateRequest(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      next(new AppError(400, message));
      return;
    }
    // Propagate the parsed/transformed body (e.g. the canonicalized YouTube URL) to the
    // controller. Only `body` — Express 5's req.query is a read-only getter; req.params is
    // untouched. Schemas without a `body` key (getJob) leave req.body as-is.
    const data = result.data as { body?: unknown };
    if (data.body !== undefined) req.body = data.body;
    next();
  };
}
