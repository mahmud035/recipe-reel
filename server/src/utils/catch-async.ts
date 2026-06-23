import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Wraps an async controller so rejected promises reach the error handler. */
export function catchAsync(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
