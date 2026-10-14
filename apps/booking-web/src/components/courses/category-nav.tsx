import Link from "next/link";

import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
};

export function CategoryNav({ categories }: Props) {
  if (categories.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/kurse?category=${cat.slug}`}
          className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:border-slate-400 hover:text-slate-900"
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
