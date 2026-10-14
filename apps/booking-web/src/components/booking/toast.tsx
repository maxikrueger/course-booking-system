"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Liest den `?notice=` Query-Parameter, zeigt eine kurze Toast-Meldung an
 * und entfernt den Parameter danach aus der URL. So bleibt eine Hinweismeldung
 * über einen Redirect (z.B. Session voll → zurück zur Termin-Auswahl) erhalten.
 */
export function NoticeToast() {
  const t = useTranslations("wizard");
  const params = useSearchParams();
  const router = useRouter();
  const notice = params.get("notice");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      const next = new URLSearchParams(params.toString());
      next.delete("notice");
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice, params, router]);

  if (!notice || !visible) return null;

  let text: string;
  if (notice === "session_full") text = t("session_full_toast");
  else if (notice === "session_unavailable")
    text = t("session_unavailable_toast");
  else return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="wizard-notice-toast"
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-md"
    >
      {text}
    </div>
  );
}
