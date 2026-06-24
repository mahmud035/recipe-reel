import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";
import type { Recipe } from "../recipe.interface.ts";
import { renderRecipeHtml } from "./recipe-template.ts";

const FONT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "fonts",
  "NotoSansBengali.ttf",
);

let fontBase64: string | null = null;

/** Reads and caches the embedded font as base64 (first PDF request only). */
function getFontBase64(): string {
  if (fontBase64 === null) {
    fontBase64 = readFileSync(FONT_PATH).toString("base64");
  }
  return fontBase64;
}

/**
 * Single-render mutex. Only one Puppeteer render runs at a time; concurrent requests
 * queue behind the previous one. On this memory-tight box two Chrome instances at once
 * would risk an OOM, so serialization is mandatory, not best-effort. The chain swallows
 * each render's rejection so one failed PDF cannot wedge the queue for the next caller.
 */
let renderChain: Promise<unknown> = Promise.resolve();

/**
 * Renders a recipe to a PDF buffer via headless Chrome. Generate-and-stream: the
 * buffer is returned to the controller and sent on the response — nothing is stored.
 * Renders are serialized through the mutex above.
 */
export async function generateRecipePdf(recipe: Recipe): Promise<Buffer> {
  const run = renderChain.then(() => renderPdf(recipe));
  renderChain = run.catch(() => undefined);
  return run;
}

/**
 * The actual render. The browser is launched per request and always closed in `finally`.
 */
async function renderPdf(recipe: Recipe): Promise<Buffer> {
  const html = renderRecipeHtml(recipe, getFontBase64());

  const browser = await puppeteer.launch({
    headless: true,
    // --disable-dev-shm-usage: /dev/shm is tiny in containers; force Chrome to use /tmp
    // or it crashes mid-render. --disable-gpu: no GPU on the box. --no-sandbox: Coolify
    // won't grant SYS_ADMIN, so the sandbox can't initialize.
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Ensure the embedded font is parsed before paint, or glyphs fall back.
    // String form: evaluated in the page, so no Node-side `document` reference.
    await page.evaluate("document.fonts.ready");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
