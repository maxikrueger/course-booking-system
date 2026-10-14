import { Skeleton } from "@/components/ui/skeleton";

export default function KurseLoading() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </header>
      <nav className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </nav>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="mb-2 h-6 w-3/4" />
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="mb-6 h-4 w-2/3" />
            <Skeleton className="mt-auto h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
