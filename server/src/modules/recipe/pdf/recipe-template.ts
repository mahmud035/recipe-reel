import type { Recipe } from "../recipe.interface.ts";

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
      const qty = i.quantity
        ? `<span class="qty">${escapeHtml(i.quantity)}</span>`
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
    color: #111827;
  }
  ul.ingredients { list-style: none; margin: 0; padding: 0; }
  ul.ingredients li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  ul.ingredients .name { flex: 1; }
  ul.ingredients .qty { white-space: nowrap; color: #374151; font-weight: 700; }
  ul.ingredients .qty.muted { color: #9ca3af; font-weight: 400; }
  ol.steps { margin: 0; padding-left: 22px; }
  ol.steps li { padding: 4px 0; }
  footer { margin-top: 28px; color: #9ca3af; font-size: 9pt; text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(recipe.title)}</h1>
  ${servings}
  <h2>উপকরণ</h2>
  <ul class="ingredients">${ingredients}</ul>
  <h2>প্রণালী</h2>
  <ol class="steps">${steps}</ol>
  <footer>রান্না দিয়ে তৈরি</footer>
</body>
</html>`;
}
