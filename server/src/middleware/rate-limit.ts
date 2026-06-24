import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { sendResponse } from "../utils/send-response.ts";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_JOBS_PER_WINDOW = 10;

/**
 * Resolves the rate-limit key from Cloudflare's authoritative client IP. The tunnel is
 * outbound-only, so an external client cannot forge CF-Connecting-IP; falling back to req.ip
 * only matters in local dev (no Cloudflare). ipKeyGenerator normalizes IPv6 to a /64 subnet.
 */
function clientKey(req: Request): string {
  // WHY cf-connecting-ip FIRST, never req.ip: `trust proxy` is true, so req.ip derives from
  // the client-supplied X-Forwarded-For and is spoofable — keying on it would let one caller
  // mint unlimited buckets and skip the limit. CF-Connecting-IP is set by Cloudflare on the
  // outbound-only tunnel and cannot be forged. Do NOT "simplify" this back to req.ip.
  const cf = req.headers["cf-connecting-ip"];
  const ip = (Array.isArray(cf) ? cf[0] : cf) ?? req.ip ?? "unknown";
  return ipKeyGenerator(ip);
}

/**
 * Per-IP limiter for job creation — the only route that spends Gemini quota. Scoped to
 * POST /jobs ONLY: a global limiter would throttle the client's ~2s status poll and
 * Coolify's 30s health check, flapping the container unhealthy.
 */
export const jobsRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_JOBS_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  // We key on CF-Connecting-IP, not the (spoofable) X-Forwarded-For chain, so silence the
  // permissive-trust-proxy validation warnings — they don't apply to this key.
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: clientKey,
  handler: (_req, res) => {
    sendResponse(res, {
      statusCode: 429,
      success: false,
      message: "একটু পরে আবার চেষ্টা করুন।",
      data: null,
    });
  },
});
