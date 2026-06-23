import { api } from "../../../api/axios.ts";
import type { ApiResponse } from "../../../api/types.ts";
import type {
  CreateJobResponse,
  JobState,
  Recipe,
} from "../types/recipe.types.ts";

/** POST /api/recipe/jobs — start an extraction job. */
export async function createJob(youtubeUrl: string): Promise<CreateJobResponse> {
  const res = await api.post<ApiResponse<CreateJobResponse>>("/recipe/jobs", {
    youtubeUrl,
  });
  return res.data.data;
}

/** GET /api/recipe/jobs/:jobId — poll a job. */
export async function getJob(jobId: string): Promise<JobState> {
  const res = await api.get<ApiResponse<JobState>>(`/recipe/jobs/${jobId}`);
  return res.data.data;
}

/** POST /api/recipe/pdf — render the edited recipe; returns the PDF blob. */
export async function buildRecipePdf(recipe: Recipe): Promise<Blob> {
  const res = await api.post("/recipe/pdf", { recipe }, { responseType: "blob" });
  return res.data as Blob;
}
