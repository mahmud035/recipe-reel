import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.ts";
import { sendResponse } from "../utils/send-response.ts";

/** Central error handler — converts any thrown error into the response envelope. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";

  if (statusCode >= 500) {
    console.error(err);
  }

  sendResponse(res, { statusCode, success: false, message, data: null });
}
