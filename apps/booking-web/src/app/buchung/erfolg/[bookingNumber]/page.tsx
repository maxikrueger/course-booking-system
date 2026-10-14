import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { WizardProgress } from "@/components/booking/progress";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ErfolgPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;
  const t = await getTranslations();

  return (
    <section className="space-y-6">
      <WizardProgress current="erfolg" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {t("erfolg.heading")}
        </h1>
        <p className="text-slate-600">{t("erfolg.lead")}</p>
      </header>

      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="text-sm text-slate-500">
            {t("erfolg.booking_number_label")}
          </p>
          <p
            className="font-mono text-xl font-semibold text-slate-900"
            data-testid="booking-number"
          >
            {decodeURIComponent(bookingNumber)}
          </p>
        </CardContent>
      </Card>

      <Link
        href="/kurse"
        className={cn(buttonVariants({ variant: "default" }))}
      >
        {t("erfolg.more_courses")}
      </Link>
    </section>
  );
}
