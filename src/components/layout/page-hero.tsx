"use client";

import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function PageHero({
  title,
  description,
  actions,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
}: PageHeroProps) {
  return (
    <section className={cn("relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm", className)}>
      <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
      <div
        className={cn(
          "relative",
          actions ? "flex flex-col gap-4 md:flex-row md:items-end md:justify-between" : undefined,
          contentClassName,
        )}
      >
        <div>
          <h1 className={cn("font-heading text-3xl font-semibold tracking-tight text-foreground", titleClassName)}>{title}</h1>
          {description ? (
            <p className={cn("mt-2 max-w-3xl text-sm text-muted-foreground", descriptionClassName)}>{description}</p>
          ) : null}
        </div>
        {actions ? actions : null}
      </div>
    </section>
  );
}
