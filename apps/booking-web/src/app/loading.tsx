import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Skeleton className="h-10 w-3/4 max-w-xl sm:h-12" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-5 w-2/3 max-w-xl" />
        <Skeleton className="mt-2 h-11 w-40" />
      </section>
      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
