import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  draftSchema,
  toDraftValues,
  type DraftValues,
} from "../validation/recipe.schema.ts";
import type { Recipe } from "../types/recipe.types.ts";
import { IngredientRow } from "./ingredient-row.tsx";

interface DraftReviewProps {
  recipe: Recipe;
  onConfirm: (values: DraftValues) => void;
  onReset: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

const SECTION = "rounded-2xl bg-white p-5 shadow-sm";
const ADD_BTN =
  "mt-3 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 hover:border-gray-900 hover:text-gray-900";

/** The mandatory human review screen — every field is editable before PDF. */
export function DraftReview({
  recipe,
  onConfirm,
  onReset,
  isSubmitting,
  errorMessage,
}: DraftReviewProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DraftValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: toDraftValues(recipe),
  });

  const ingredients = useFieldArray({ control, name: "ingredients" });
  const steps = useFieldArray({ control, name: "steps" });

  return (
    <form onSubmit={handleSubmit(onConfirm)} className="space-y-5" noValidate>
      <section className={SECTION}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          রেসিপির নাম
        </label>
        <input
          {...register("title")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold outline-none focus:border-gray-900"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
        <label className="mt-4 mb-1 block text-sm font-medium text-gray-700">
          কত জনের জন্য
        </label>
        <input
          {...register("servings")}
          placeholder="যেমন: ৪ জন"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
      </section>

      <section className={SECTION}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">উপকরণ</h2>
        <div className="space-y-2">
          {ingredients.fields.map((field, index) => (
            <IngredientRow
              key={field.id}
              index={index}
              register={register}
              nameError={errors.ingredients?.[index]?.name?.message}
              onRemove={() => ingredients.remove(index)}
              canRemove={ingredients.fields.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => ingredients.append({ name: "", quantity: "" })}
          className={ADD_BTN}
        >
          + উপকরণ যোগ করুন
        </button>
      </section>

      <section className={SECTION}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">প্রণালী</h2>
        <div className="space-y-2">
          {steps.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <span className="pt-2 text-sm font-medium text-gray-400">
                {index + 1}.
              </span>
              <textarea
                {...register(`steps.${index}.value`)}
                rows={2}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              />
              <button
                type="button"
                onClick={() => steps.remove(index)}
                disabled={steps.fields.length <= 1}
                aria-label="ধাপ মুছুন"
                className="shrink-0 rounded-lg px-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => steps.append({ value: "" })}
          className={ADD_BTN}
        >
          + ধাপ যোগ করুন
        </button>
      </section>

      {errorMessage && (
        <p className="text-center text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-gray-300 px-5 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          নতুন লিংক
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-gray-900 px-5 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-60"
        >
          {isSubmitting ? "তৈরি হচ্ছে…" : "পিডিএফ বানান"}
        </button>
      </div>
    </form>
  );
}
