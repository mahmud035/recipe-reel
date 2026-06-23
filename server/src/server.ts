import mongoose from "mongoose";
import { app } from "./app.ts";
import { config } from "./config/index.ts";
import { recipeService } from "./modules/recipe/recipe.service.ts";

/** Connects to MongoDB, sweeps orphaned jobs, then starts the HTTP server. */
async function bootstrap(): Promise<void> {
  await mongoose.connect(config.MONGODB_URI);
  console.log("Connected to MongoDB");

  await recipeService.sweepOrphanedJobs();

  app.listen(config.PORT, () => {
    console.log(`Server listening on http://localhost:${config.PORT}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
