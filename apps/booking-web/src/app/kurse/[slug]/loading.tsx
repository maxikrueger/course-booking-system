import { Skeleton } from "@/components/ui/skeleton";

export default function CourseDetailLoading() {
  return (
    <article className="space-y-10">
      <Skeleton className="h-4 w-40" />
      <header className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-3/4 max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-4 w-1/2 max-w-md" />
      </header>
      <section className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </section>
      <section className="space-y-4">
        <Skeleton className="h-7 w-56" />
        <ul className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
