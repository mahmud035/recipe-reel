// Gemini free-tier config for the Phase 0 spike.
//
// VERIFY these in Google AI Studio for YOUR project/region before trusting them —
// Google revises model names and free-tier limits roughly monthly.
//   Models:  https://ai.google.dev/gemini-api/docs/models
//   Limits:  https://ai.google.dev/gemini-api/docs/rate-limits
//
// As of June 2026 the free multimodal Flash model is `gemini-3.5-flash`.

// NEVER use a Pro model here — Pro is paid-only since 1 Apr 2026. This project is $0.
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';

// Free tier is ~15 requests/min. We pace calls to stay well under it.
export const PACING_MS = Number(process.env.SPIKE_PACING_MS ?? 5000);

// Exponential backoff on 429 / rate-limit / transient (5xx) errors.
// The free tier WILL rate-limit; this is not optional.
export const MAX_RETRIES = 5;
export const BASE_BACKOFF_MS = 2000;
