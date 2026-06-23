import { useMutation, useQuery } from "@tanstack/react-query";
import { buildRecipePdf, createJob, getJob } from "./recipe.api.ts";
import type { Recipe } from "../types/recipe.types.ts";

const POLL_MS = 2500;

/** Mutation: submit a YouTube URL, get back a jobId. */
export function useCreateJob() {
  return useMutation({
    mutationFn: (youtubeUrl: string) => createJob(youtubeUrl),
  });
}

/** Mutation: render the edited recipe to a downloadable PDF blob. */
export function useBuildPdf() {
  return useMutation({
    mutationFn: (recipe: Recipe) => buildRecipePdf(recipe),
  });
}

/**
 * Polls a job until it reaches `ready`/`error`, or until the wall-clock ceiling
 * (hardening 3) — after which polling stops so a wedged job can't poll forever.
 */
export function useJobPolling(
  jobId: string | null,
  startedAt: number | null,
  ceilingMs: number,
) {
  return useQuery({
    queryKey: ["recipe-job", jobId],
    enabled: jobId != null,
    queryFn: () => getJob(jobId as string),
    gcTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "ready" || status === "error") return false;
      if (startedAt != null && Date.now() - startedAt > ceilingMs) return false;
      return POLL_MS;
    },
  });
}
