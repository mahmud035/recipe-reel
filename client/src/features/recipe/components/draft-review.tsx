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

const CARD = "rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border";
const FIELD =
  "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/30";
const ADD_BTN =
  "mt-4 w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition hover:border-accent hover:text-accent";
const REMOVE_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-subtle transition hover:bg-error/10 hover:text-error disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-subtle";

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
      <section className={CARD}>
        <label className="mb-1.5 block text-sm font-medium text-muted">
          রেসিপির নাম
        </label>
        <input {...register("title")} className={`${FIELD} font-semibold`} />
        {errors.title && (
          <p className="mt-1.5 text-xs text-error">{errors.title.message}</p>
        )}
        <label className="mt-4 mb-1.5 block text-sm font-medium text-muted">
          কত জনের জন্য
        </label>
        <input
          {...register("servings")}
          placeholder="যেমন: ৪ জন"
          className={FIELD}
        />
      </section>

      <section className={CARD}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">উপকরণ</h2>
          <span className="text-xs text-subtle">
            {ingredients.fields.length} টি
          </span>
        </div>
        <div className="space-y-2.5">
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

      <section className={CARD}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">প্রণালী</h2>
          <span className="text-xs text-subtle">{steps.fields.length} ধাপ</span>
        </div>
        <div className="space-y-2.5">
          {steps.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2.5">
              <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <textarea
                {...register(`steps.${index}.value`)}
                rows={2}
                className={`${FIELD} min-w-0 flex-1 resize-none leading-relaxed`}
              />
              <button
                type="button"
                onClick={() => steps.remove(index)}
                disabled={steps.fields.length <= 1}
                aria-label="ধাপ মুছুন"
                className={REMOVE_BTN}
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
        <p className="text-center text-sm text-error">{errorMessage}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-border px-5 py-3 text-base font-medium text-muted transition hover:bg-background hover:text-foreground disabled:opacity-60"
        >
          নতুন লিংক
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-primary px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
        >
          {isSubmitting ? "তৈরি হচ্ছে…" : "পিডিএফ বানান"}
        </button>
      </div>
    </form>
  );
}
