import { z } from "zod";

/**
 * Validated, typed environment configuration. The process refuses to boot with
 * an invalid environment so misconfiguration fails loudly at startup, not mid-request.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  // Comma-separated allowlist of browser origins permitted by CORS (Vercel + lab host + dev).
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  // Max recipes per day before NEW jobs are refused — quota defense, leaves family headroom.
  BUDGET_DAILY_MAX: z.coerce.number().int().positive().default(180),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const config = parsed.data;
