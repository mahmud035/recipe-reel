import express from "express";
import cors from "cors";
import { config } from "./config/index.ts";
import { recipeRouter } from "./modules/recipe/recipe.route.ts";
import { errorHandler } from "./middleware/error-handler.ts";

export const app = express();

app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ statusCode: 200, success: true, message: "ok", data: null });
});

app.use("/api/recipe", recipeRouter);

app.use(errorHandler);
