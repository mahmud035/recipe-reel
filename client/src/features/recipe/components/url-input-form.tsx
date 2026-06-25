import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  urlFormSchema,
  type UrlFormValues,
} from '../validation/recipe.schema.ts';

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
    defaultValues: { youtubeUrl: '' },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v.youtubeUrl.trim()))}
      className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border"
      noValidate
    >
      <label
        htmlFor="youtubeUrl"
        className="mb-2 block text-sm font-medium text-foreground"
      >
        ইউটিউব রেসিপির লিংক
      </label>
      <input
        id="youtubeUrl"
        type="url"
        inputMode="url"
        dir="ltr"
        placeholder="https://www.youtube.com/watch?v=…"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/30"
        {...register('youtubeUrl')}
      />
      {errors.youtubeUrl && (
        <p className="mt-2 text-sm text-error">{errors.youtubeUrl.message}</p>
      )}
      {serverError && <p className="mt-2 text-sm text-error">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? 'পাঠানো হচ্ছে…' : 'রেসিপি বানান'}
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        লিংক দিন → আমি ভিডিও শুনে রেসিপি লিখি → আপনি দেখে নিয়ে পিডিএফ বানান।
      </p>
    </form>
  );
}
