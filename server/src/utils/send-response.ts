import type { Response } from "express";

/** The response envelope returned by every JSON endpoint. */
export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

/** Sends the standard response envelope with the matching HTTP status. */
export function sendResponse<T>(res: Response, payload: ApiResponse<T>): void {
  res.status(payload.statusCode).json(payload);
}
