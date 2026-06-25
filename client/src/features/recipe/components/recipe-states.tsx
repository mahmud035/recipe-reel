import type { JobStatus } from "../types/recipe.types.ts";

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "অপেক্ষা করছে…",
  transcribing: "ভিডিও শোনা হচ্ছে…",
  extracting: "রেসিপি তৈরি হচ্ছে…",
  ready: "প্রস্তুত",
  error: "সমস্যা হয়েছে",
};

/** Skeleton loader (not a spinner) shown while a job is in flight. */
export function LoadingState({ status }: { status?: JobStatus }) {
  const label = status ? STATUS_LABEL[status] : STATUS_LABEL.pending;
  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <p className="mb-5 text-center text-sm font-medium text-muted">{label}</p>
      <div className="space-y-3" aria-hidden>
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-border" />
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-border" />
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded-lg bg-border/60"
            />
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-subtle">
        একটু সময় লাগতে পারে, পেজ খোলা রাখুন।
      </p>
    </div>
  );
}

/** Terminal error with a retry path back to the start. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-border">
      <p className="text-base font-medium text-error">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        আবার চেষ্টা করুন
      </button>
    </div>
  );
}

/** Shown when the poll ceiling is hit before the job finishes (hardening 3). */
export function TakingTooLong({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      message="অনেক সময় লেগে যাচ্ছে। আবার চেষ্টা করুন।"
      onRetry={onRetry}
    />
  );
}
