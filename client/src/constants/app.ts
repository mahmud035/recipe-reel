/**
 * App identity — the single source of truth for the client side.
 *
 * The server has its OWN copy of APP_NAME (server/src/modules/recipe/pdf/recipe-template.ts)
 * because client and server are separate deploys and cannot share a module. If the brand
 * name ever changes, update BOTH. Keep them byte-identical.
 */
export const APP_NAME = 'রাঁধুনি';
export const APP_TAGLINE = 'ইউটিউব ভিডিও থেকে রেসিপি নোট';
