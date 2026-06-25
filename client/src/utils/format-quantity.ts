/**
 * Bengali quantity normalizer — cosmetic, quantity-field-only.
 *
 * TWIN: an identical copy lives at server/src/modules/recipe/pdf/format-quantity.ts
 * (client and server are separate deploys, no shared module). Keep them byte-identical.
 *
 * Two rules, applied together, ONLY when the whole quantity is `<bengali-number><classifier>`:
 *   Rule A (spacing):     ৪টে → ৪ টে
 *   Rule B (টে → টি):     ৪টে → ৪ টি   (creators say টে but mean the standard টি; টা stays টা)
 *
 * The regex is anchored (^…$) and must START with a Bengali digit, so real words that
 * contain টে — প্লেটে, হোটেলে, গেটে, প্যাকেটে — can NEVER match. Only ever feed it the
 * `quantity` field, never `name` or `steps`.
 */
const QUANTITY = /^([০-৯][০-৯\-–]*)\s*(টে|টি|টা)$/;

export function formatQuantity(quantity: string): string {
  const match = quantity.trim().match(QUANTITY);
  if (!match) return quantity; // not a `<number><classifier>` quantity → untouched
  const classifier = match[2] === "টে" ? "টি" : match[2];
  return `${match[1]} ${classifier}`;
}
