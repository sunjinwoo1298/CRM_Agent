export function MetricSkeleton() {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="h-3 w-20 rounded-full bg-slate-200" />
      <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200" />
      <div className="mt-2 h-3 w-32 rounded-full bg-slate-100" />
    </article>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 animate-pulse">
      <div className="mb-4 h-6 w-40 rounded-lg bg-slate-200" />
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-24 rounded-full bg-slate-200" />
      <div className="h-10 w-64 rounded-lg bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-3/4 rounded bg-slate-100" />
    </div>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-pulse">
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 animate-pulse">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-3/4 rounded bg-slate-100" />
    </div>
  );
}
