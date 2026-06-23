import axios from "axios";

/** Shared axios instance. All feature API calls go through this. */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Extracts the server's envelope message from an error, falling back to `fallback`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
