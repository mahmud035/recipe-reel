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
      <div className="flex items-center gap-2">
        <input
          {...register(`ingredients.${index}.name`)}
          placeholder="উপকরণ"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <input
          {...register(`ingredients.${index}.quantity`)}
          placeholder="পরিমাণ"
          dir="auto"
          className="w-28 shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="উপকরণ মুছুন"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-subtle transition hover:bg-error/10 hover:text-error disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-subtle"
        >
          ✕
        </button>
      </div>
      {nameError && <p className="text-xs text-error">{nameError}</p>}
    </div>
  );
}
