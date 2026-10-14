import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 py-12">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {t("site.title")}
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
        404
      </h1>
      <h2 className="text-2xl font-semibold text-slate-900">
        Seite nicht gefunden
      </h2>
      <p className="text-slate-600">
        Diese Seite existiert nicht oder wurde verschoben. Vielleicht findest du
        deinen Kurs auf der Startseite.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Zur Startseite
        </Link>
        <Link
          href="/kurse"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          {t("nav.courses")}
        </Link>
      </div>
    </div>
  );
}
