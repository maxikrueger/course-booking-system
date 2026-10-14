import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { NoticeToast } from "@/components/booking/toast";

export async function generateMetadata() {
  const t = await getTranslations("wizard");
  return { title: t("title") };
}

export default function BookingWizardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <NoticeToast />
      </Suspense>
      <div className="mx-auto max-w-2xl">{children}</div>
    </>
  );
}
