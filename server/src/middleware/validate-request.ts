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
    next();
  };
}
