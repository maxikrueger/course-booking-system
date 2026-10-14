import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { getCategories } from "@/lib/api";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export default async function HomePage() {
  const t = await getTranslations();
  const categories = await getCategories({
    next: { revalidate: 60, tags: ["categories"] },
  }).catch(() => []);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("home.hero_title")}
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          {t("home.hero_lead")}
        </p>
        <Link
          href="/kurse"
          className={cn(buttonVariants({ size: "lg" }), "mt-2")}
        >
          {t("nav.courses")}
        </Link>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t("home.categories_heading")}
          </h2>
          <p className="text-slate-600">{t("home.categories_lead")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/kurse?category=${cat.slug}`}
              className="block transition hover:scale-[1.01]"
            >
              <Card>
                <CardContent className="space-y-1 p-6">
                  <CardTitle>{cat.name}</CardTitle>
                  <CardDescription>{t("home.categories_lead")}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
