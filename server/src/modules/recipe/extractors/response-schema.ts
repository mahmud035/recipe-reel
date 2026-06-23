import { Type } from "@google/genai";

/**
 * Pinned Gemini structured-output schema. Mirrors the Recipe contract MINUS `source`:
 * text-only v1 cannot distinguish provenance, so the model never labels it and the
 * service stamps it server-side. Verified live against Bengali output (nullable fields
 * and Bengali preservation both confirmed).
 */
export const recipeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    servings: { type: Type.STRING, nullable: true },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING, nullable: true },
        },
        required: ["name", "quantity"],
        propertyOrdering: ["name", "quantity"],
      },
    },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["title", "servings", "ingredients", "steps"],
  propertyOrdering: ["title", "servings", "ingredients", "steps"],
};
