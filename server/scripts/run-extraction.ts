// Sub-batch 2.2 gate — backend only, no HTTP. Feeds a YouTube URL through the real
// service pipeline (createJob → async transcribe → extract → Zod-validate → persist),
// polls the job exactly as the client will, and prints the stored Zod-valid Recipe.
//
// Run: npm run extract            (defaults to the chicken-kosha video)
//      npm run extract -- <url>   (any public Bengali cooking video)
import mongoose from "mongoose";
import { config } from "../src/config/index.ts";
import { recipeService } from "../src/modules/recipe/recipe.service.ts";

const DEFAULT_URL = "https://www.youtube.com/watch?v=XmL6giKPcWI"; // chicken-kosha
const url = process.argv[2] ?? DEFAULT_URL;
const POLL_MS = 3000;
const CEILING_MS = 4 * 60 * 1000;

await mongoose.connect(config.MONGODB_URI);
console.log("Connected. Submitting:", url);

const jobId = await recipeService.createJob(url);
console.log("job:", jobId, "— polling…\n");

let job = await recipeService.getJob(jobId);
const started = Date.now();
while (job.status !== "ready" && job.status !== "error") {
  if (Date.now() - started > CEILING_MS) {
    console.log("Poll ceiling hit; giving up.");
    break;
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
  job = await recipeService.getJob(jobId);
  console.log("  status:", job.status);
}

console.log("");
if (job.status === "ready") {
  console.log("RECIPE (Zod-valid, stored):");
  console.dir(job.recipe, { depth: null });
  const r = job.recipe;
  if (r) {
    const withQty = r.ingredients.filter((i) => i.quantity != null).length;
    console.log(
      `\nSUMMARY: ${r.ingredients.length} ingredients (${withQty} with quantity), ${r.steps.length} steps.`,
    );
  }
} else {
  console.log("FAILED:", job.error);
}

await mongoose.disconnect();
