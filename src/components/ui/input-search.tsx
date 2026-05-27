"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type InputSearchProps<TItem> = {
  value: string;
  onValueChange: (value: string) => void;
  results: TItem[];
  getItemKey: (item: TItem) => string;
  renderItem: (item: TItem) => ReactNode;
  onSelect: (item: TItem) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  searchLabel?: string;
  inputId?: string;
  maxResults?: number;
  className?: string;
  resultsClassName?: string;
  onSearch?: () => void;
};

export function InputSearch<TItem>({
  value,
  onValueChange,
  results,
  getItemKey,
  renderItem,
  onSelect,
  loading = false,
  disabled = false,
  placeholder = "Buscar",
  emptyMessage = "Nenhum resultado encontrado.",
  searchLabel = "Buscar",
  inputId,
  maxResults = 8,
  className,
  resultsClassName,
  onSearch,
}: InputSearchProps<TItem>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const visibleResults = useMemo(
    () => results.slice(0, maxResults),
    [maxResults, results],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || loading}
          onClick={() => {
            setIsOpen(true);
            onSearch?.();
          }}
          aria-label={searchLabel}
        >
          <Search />
        </Button>
      </div>

      {isOpen ? (
        <div
          className={cn(
            "max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md",
            resultsClassName,
          )}
        >
          {loading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`input-search-skeleton-${index}`} className="h-9 w-full" />
              ))}
            </div>
          ) : null}
          {!loading && visibleResults.length > 0
            ? visibleResults.map((item) => (
                <button
                  key={getItemKey(item)}
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  {renderItem(item)}
                </button>
              ))
            : null}
          {!loading && visibleResults.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
