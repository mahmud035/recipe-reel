import { useEffect, useState } from "react";
import {
  useBuildPdf,
  useCreateJob,
  useJobPolling,
} from "../features/recipe/api/recipe.queries.ts";
import { UrlInputForm } from "../features/recipe/components/url-input-form.tsx";
import { DraftReview } from "../features/recipe/components/draft-review.tsx";
import {
  ErrorState,
  LoadingState,
  TakingTooLong,
} from "../features/recipe/components/recipe-states.tsx";
import {
  fromDraftValues,
  type DraftValues,
} from "../features/recipe/validation/recipe.schema.ts";
import { getApiErrorMessage } from "../api/axios.ts";
import { downloadBlob } from "../utils/download-blob.ts";

const CEILING_MS = 5 * 60 * 1000;

/**
 * Recipe page — orchestrates the single-screen flow:
 * idle → submitting → polling → (ready editable draft | error | timed-out).
 * Pages orchestrate; the feature components execute.
 */
export function RecipePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const createJob = useCreateJob();
  const buildPdf = useBuildPdf();
  const poll = useJobPolling(jobId, startedAt, CEILING_MS);
  const job = poll.data;

  // Drives the "taking too long" UI; the query's refetchInterval stops polling too.
  useEffect(() => {
    if (jobId == null) return;
    const timer = setTimeout(() => setTimedOut(true), CEILING_MS);
    return () => clearTimeout(timer);
  }, [jobId]);

  function start(youtubeUrl: string) {
    setTimedOut(false);
    createJob.mutate(youtubeUrl, {
      onSuccess: (res) => {
        setJobId(res.jobId);
        setStartedAt(Date.now());
      },
    });
  }

  function reset() {
    setJobId(null);
    setStartedAt(null);
    setTimedOut(false);
    createJob.reset();
  }

  function handleConfirm(values: DraftValues) {
    const recipe = fromDraftValues(values);
    buildPdf.mutate(recipe, {
      onSuccess: (blob) => downloadBlob(blob, `${recipe.title}.pdf`),
    });
  }

  let content;
  if (job?.status === "ready" && job.recipe) {
    content = (
      <DraftReview
        recipe={job.recipe}
        onConfirm={handleConfirm}
        onReset={reset}
        isSubmitting={buildPdf.isPending}
        errorMessage={
          buildPdf.isError
            ? getApiErrorMessage(buildPdf.error, "পিডিএফ তৈরি করা যায়নি।")
            : null
        }
      />
    );
  } else if (job?.status === "error") {
    content = (
      <ErrorState
        message={job.error ?? "রেসিপি তৈরি করা যায়নি।"}
        onRetry={reset}
      />
    );
  } else if (timedOut && jobId != null) {
    content = <TakingTooLong onRetry={reset} />;
  } else if (jobId != null) {
    content = <LoadingState status={job?.status} />;
  } else {
    content = (
      <UrlInputForm
        onSubmit={start}
        isSubmitting={createJob.isPending}
        serverError={
          createJob.isError
            ? getApiErrorMessage(createJob.error, "লিংক জমা দেওয়া যায়নি।")
            : null
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">রান্না</h1>
          <p className="mt-1 text-sm text-gray-500">
            ইউটিউব রেসিপি থেকে বাংলা রেসিপি
          </p>
        </header>
        {content}
      </div>
    </main>
  );
}
