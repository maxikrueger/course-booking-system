import { Skeleton } from "@/components/ui/skeleton";

export default function TerminStepLoading() {
  return (
    <section className="space-y-6">
      <Skeleton className="h-2 w-full rounded-full" />
      <header className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-28" />
      </div>
    </section>
  );
}
