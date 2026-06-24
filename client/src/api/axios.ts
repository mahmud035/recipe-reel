import axios from 'axios';

// Split-origin in production: the Vercel client calls the lab/Render server by absolute origin
// via VITE_API_BASE_URL (the server ORIGIN, no trailing /api). Unset in local dev → fall back to
// the relative "/api" path, which the vite proxy forwards to the local server (vite.config.ts).
const apiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
console.log(apiOrigin);
const baseURL = apiOrigin ? `${apiOrigin}/api` : '/api';

/** Shared axios instance. All feature API calls go through this. */
export const api = axios.create({
  baseURL,
  // No cookies/auth in Recipe-Reel. Must stay false to match the server's credential-less
  // CORS policy — a credentialed request cross-origin (Vercel → lab) would be browser-blocked.
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

/** Extracts the server's envelope message from an error, falling back to `fallback`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)
      ?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
