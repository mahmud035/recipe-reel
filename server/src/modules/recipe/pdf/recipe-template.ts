import type { Recipe } from "../recipe.interface.ts";
import { formatQuantity } from "./format-quantity.ts";

// The brand name. Has its OWN copy on the client (client/src/constants/app.ts) because the
// two are separate deploys and cannot share a module — keep them byte-identical.
const APP_NAME = "রাঁধুনি";

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE[c] ?? c);
}

/**
 * Renders the recipe as a self-contained HTML document with Noto Sans Bengali
 * embedded as a base64 @font-face — no dependency on any system font. Chromium's
 * HarfBuzz shaping turns this into correctly-formed Bengali conjuncts in the PDF.
 */
export function renderRecipeHtml(recipe: Recipe, fontBase64: string): string {
  const servings = recipe.servings
    ? `<p class="servings">${escapeHtml(recipe.servings)}</p>`
    : "";

  const ingredients = recipe.ingredients
    .map((i) => {
      // Re-run the formatter at render as defense: catches a quantity typed AFTER the form
      // seed (e.g. the user types ৪টে while editing). Idempotent — ৪ টি stays ৪ টি.
      const qty = i.quantity
        ? `<span class="qty">${escapeHtml(formatQuantity(i.quantity))}</span>`
        : `<span class="qty muted">—</span>`;
      return `<li><span class="name">${escapeHtml(i.name)}</span>${qty}</li>`;
    })
    .join("");

  const steps = recipe.steps
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Noto Sans Bengali";
    src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
    font-weight: 100 900;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans Bengali", sans-serif;
    color: #1f2937;
    font-size: 12pt;
    line-height: 1.7;
  }
  .brandbar {
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #c2703d;
  }
  .brand { font-size: 13pt; font-weight: 700; color: #1b4d4a; }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 4px;
    color: #111827;
  }
  .servings { margin: 0 0 18px; color: #6b7280; font-size: 11pt; }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 22px 0 10px;
    padding-bottom: 4px;
    border-bottom: 2px solid #e5e7eb;
    color: #1b4d4a;
  }
  ul.ingredients { list-style: none; margin: 0; padding: 0; }
  ul.ingredients li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  ul.ingredients .name { flex: 1; }
  ul.ingredients .qty { white-space: nowrap; color: #1b4d4a; font-weight: 700; }
  ul.ingredients .qty.muted { color: #9ca3af; font-weight: 400; }
  ol.steps { margin: 0; padding-left: 22px; }
  ol.steps li { padding: 5px 0; }
  ol.steps li::marker { color: #1b4d4a; font-weight: 700; }
  footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 9pt;
    text-align: center;
  }
</style>
</head>
<body>
  <header class="brandbar">
    <div class="brand">${escapeHtml(APP_NAME)}</div>
  </header>
  <h1>${escapeHtml(recipe.title)}</h1>
  ${servings}
  <h2>উপকরণ</h2>
  <ul class="ingredients">${ingredients}</ul>
  <h2>প্রণালী</h2>
  <ol class="steps">${steps}</ol>
  <footer>${escapeHtml(APP_NAME)} দিয়ে তৈরি</footer>
</body>
</html>`;
}
