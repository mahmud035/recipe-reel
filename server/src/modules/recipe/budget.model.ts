import mongoose, { Schema } from "mongoose";

/**
 * One row per quota day, keyed to Gemini's reset window (midnight Pacific). Persisting the
 * counter in Mongo — not in process memory — means the daily budget survives container
 * restarts, so a redeploy can't silently reset the quota guard mid-day.
 */
export interface DailyBudgetDocument {
  date: string; // YYYY-MM-DD in America/Los_Angeles
  count: number; // real Gemini calls spent today
  createdAt: Date;
  updatedAt: Date;
}

const dailyBudgetSchema = new Schema<DailyBudgetDocument>(
  {
    date: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Old counters are useless once their day passes; expire them a week out to stay tidy.
dailyBudgetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export const DailyBudgetModel = mongoose.model<DailyBudgetDocument>(
  "DailyBudget",
  dailyBudgetSchema,
);
