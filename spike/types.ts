// Where a captured quantity came from. "on_screen" is the decision-critical one:
// it is the amount that a transcript-only pipeline would silently miss.
export type QuantitySource = 'spoken' | 'on_screen' | 'inferred' | null;

export interface Ingredient {
  name: string;
  quantity: string | null; // exact as given, e.g. "২ চা চামচ" / "250 গ্রাম". null = no amount.
  source?: QuantitySource;
}

export interface Recipe {
  title: string | null;
  servings: string | null;
  ingredients: Ingredient[];
  steps: string[];
}

export interface ExtractResult {
  recipe: Recipe;
  raw: string; // raw model output, kept for eyeballing in results.json
}

export interface VideoInput {
  id?: string;
  title?: string;
  url: string;
}
