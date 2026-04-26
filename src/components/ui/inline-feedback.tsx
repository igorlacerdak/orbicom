import { cn } from "@/lib/utils";

type InlineFeedbackProps = {
  message: string;
  className?: string;
  compact?: boolean;
};

export function InlineError({ message, className, compact = false }: InlineFeedbackProps) {
  return (
    <p
      className={cn(
        compact
          ? "text-sm text-destructive"
          : "rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function InlineInfo({ message, className, compact = false }: InlineFeedbackProps) {
  return (
    <p
      className={cn(
        compact
          ? "text-sm text-sky-700"
          : "rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function InlineSuccess({ message, className, compact = false }: InlineFeedbackProps) {
  return (
    <p
      className={cn(
        compact
          ? "text-sm text-emerald-700"
          : "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800",
        className,
      )}
    >
      {message}
    </p>
  );
}
