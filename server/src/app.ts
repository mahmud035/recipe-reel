import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.ts";
import { recipeRouter } from "./modules/recipe/recipe.route.ts";
import { errorHandler } from "./middleware/error-handler.ts";

export const app = express();

// Behind the Cloudflare Tunnel + Traefik, so trust the proxy chain for req.ip / req.protocol.
// This is NOT the rate-limit anchor — the limiter keys on the authoritative CF-Connecting-IP
// header (see middleware/rate-limit.ts), so a spoofed X-Forwarded-For cannot bypass the limit.
app.set("trust proxy", true);

const allowedOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// This is a JSON/PDF API consumed cross-origin (Vercel client → lab server). CORS already
// gates the allowlisted origins; relax CORP to cross-origin so helmet's same-origin default
// can't block the cross-origin PDF/JSON reads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// No cookies in Recipe-Reel, so credentials stay off; only the allowlisted origins may call.
app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ statusCode: 200, success: true, message: "ok", data: null });
});

app.use("/api/recipe", recipeRouter);

app.use(errorHandler);
