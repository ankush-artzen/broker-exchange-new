import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      className={cn("animate-spin text-muted", className)}
      aria-hidden
    />
  );
}

export function PageLoader({
  className,
  label = "Loading…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}
    >
      <Spinner />
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

export function ButtonLoader({
  label = "Saving…",
  size = 16,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner size={size} className="text-current" />
      {label}
    </span>
  );
}

export function ListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("grid gap-2.5 lg:grid-cols-2 lg:gap-4", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-[108px] animate-pulse rounded-[14px] bg-surface"
        />
      ))}
    </div>
  );
}

export function PropertyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid gap-2.5 lg:grid-cols-2 lg:gap-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[14px] bg-surface"
        >
          <div className="aspect-[16/10] bg-upcoming" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-3/4 rounded bg-upcoming" />
            <div className="h-3 w-1/2 rounded bg-upcoming" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface px-2 py-3.5 md:flex md:items-center md:gap-3 md:px-4 md:py-4"
      aria-hidden
    >
      <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-upcoming md:mx-0" />
      <div className="md:min-w-0 md:flex-1">
        <div className="mx-auto mt-2 h-7 w-8 animate-pulse rounded bg-upcoming md:mx-0 md:mt-0" />
        <div className="mx-auto mt-2 h-2.5 w-14 animate-pulse rounded bg-upcoming md:mx-0" />
      </div>
    </div>
  );
}
