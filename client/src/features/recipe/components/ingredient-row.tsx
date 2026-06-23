import type { UseFormRegister } from "react-hook-form";
import type { DraftValues } from "../validation/recipe.schema.ts";

interface IngredientRowProps {
  index: number;
  register: UseFormRegister<DraftValues>;
  nameError?: string;
  onRemove: () => void;
  canRemove: boolean;
}

/** One editable ingredient: name + quantity (quantity may be left blank). */
export function IngredientRow({
  index,
  register,
  nameError,
  onRemove,
  canRemove,
}: IngredientRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          {...register(`ingredients.${index}.name`)}
          placeholder="উপকরণ"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <input
          {...register(`ingredients.${index}.quantity`)}
          placeholder="পরিমাণ"
          dir="auto"
          className="w-28 shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="উপকরণ মুছুন"
          className="shrink-0 rounded-lg px-3 text-gray-400 hover:text-red-600 disabled:opacity-30"
        >
          ✕
        </button>
      </div>
      {nameError && <p className="text-xs text-red-600">{nameError}</p>}
    </div>
  );
}
