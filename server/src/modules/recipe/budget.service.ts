import { config } from "../../config/index.ts";
import { AppError } from "../../utils/app-error.ts";
import { DailyBudgetModel } from "./budget.model.ts";

/** Text-only v1 spends two Gemini calls per recipe: transcribe + extract. */
const CALLS_PER_RECIPE = 2;

/**
 * Today's key in Gemini's quota window. RPD resets at midnight Pacific, so the counter is
 * bucketed by the Los Angeles calendar date — en-CA formats it as YYYY-MM-DD.
 */
function quotaDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
}

/**
 * Records one real Gemini API call against today's budget. Atomic upsert so concurrent calls
 * can't lose increments. Best-effort: callers wrap this so a counter write never breaks an
 * in-flight extraction.
 */
export async function recordGeminiCall(): Promise<void> {
  await DailyBudgetModel.findOneAndUpdate(
    { date: quotaDateKey() },
    { $inc: { count: 1 } },
    { upsert: true },
  );
}

/**
 * Refuses a new job if its projected spend would push today past the ceiling. Checked before
 * a job is created — the buffer below the real RPD limit guarantees the family always has
 * headroom even if a stranger hammers the public endpoint.
 *
 * @throws AppError 429 with a user-facing Bengali message when the daily budget is exhausted
 */
export async function assertDailyBudget(): Promise<void> {
  const maxCalls = config.BUDGET_DAILY_MAX * CALLS_PER_RECIPE;
  const doc = await DailyBudgetModel.findOne({ date: quotaDateKey() }).lean();
  const used = doc?.count ?? 0;
  if (used + CALLS_PER_RECIPE > maxCalls) {
    throw new AppError(429, "আজকের সীমা শেষ, কাল আবার চেষ্টা করুন।");
  }
}
