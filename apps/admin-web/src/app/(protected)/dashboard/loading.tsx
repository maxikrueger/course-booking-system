import {
  ListItemsSkeleton,
  PageHeaderSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/skeletons";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <ListItemsSkeleton rows={4} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <ListItemsSkeleton rows={4} />
        </div>
      </section>
    </div>
  );
}
