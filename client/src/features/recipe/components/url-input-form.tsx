import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { urlFormSchema, type UrlFormValues } from "../validation/recipe.schema.ts";

interface UrlInputFormProps {
  onSubmit: (youtubeUrl: string) => void;
  isSubmitting: boolean;
  serverError?: string | null;
}

export function UrlInputForm({
  onSubmit,
  isSubmitting,
  serverError,
}: UrlInputFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlFormValues>({
    resolver: zodResolver(urlFormSchema),
    defaultValues: { youtubeUrl: "" },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v.youtubeUrl.trim()))}
      className="rounded-2xl bg-white p-5 shadow-sm"
      noValidate
    >
      <label
        htmlFor="youtubeUrl"
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        ইউটিউব রেসিপির লিংক
      </label>
      <input
        id="youtubeUrl"
        type="url"
        inputMode="url"
        dir="ltr"
        placeholder="https://www.youtube.com/watch?v=…"
        className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base outline-none focus:border-gray-900"
        {...register("youtubeUrl")}
      />
      {errors.youtubeUrl && (
        <p className="mt-2 text-sm text-red-600">{errors.youtubeUrl.message}</p>
      )}
      {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full rounded-lg bg-gray-900 px-5 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {isSubmitting ? "পাঠানো হচ্ছে…" : "রেসিপি বানান"}
      </button>
    </form>
  );
}
