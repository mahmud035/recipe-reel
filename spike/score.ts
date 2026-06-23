import type { Recipe } from './types.ts';

export interface Score {
  total: number; // ingredients found
  withQty: number; // ingredients that have a quantity
  rate: number; // withQty / total  — the quantity-capture rate
  onScreen: number; // quantities sourced ONLY from on-screen text (the multimodal lift)
}

export function scoreRecipe(r: Recipe): Score {
  const total = r.ingredients.length;
  const withQty = r.ingredients.filter((i) => i.quantity != null).length;
  const onScreen = r.ingredients.filter(
    (i) => i.quantity != null && i.source === 'on_screen',
  ).length;
  return { total, withQty, rate: total ? withQty / total : 0, onScreen };
}
