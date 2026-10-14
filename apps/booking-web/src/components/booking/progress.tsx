"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STEPS = ["termin", "daten", "bestaetigung"] as const;
export type WizardStepKey = (typeof STEPS)[number];

type Props = {
  current: WizardStepKey | "erfolg";
};

export function WizardProgress({ current }: Props) {
  const t = useTranslations("wizard");
  const labels: Record<WizardStepKey | "erfolg", string> = {
    termin: t("step_termin"),
    daten: t("step_daten"),
    bestaetigung: t("step_bestaetigung"),
    erfolg: t("step_done"),
  };

  const currentIdx = current === "erfolg" ? 3 : STEPS.indexOf(current);

  return (
    <ol
      aria-label="Buchungsfortschritt"
      className="mb-10 flex items-center justify-between gap-2 text-xs sm:text-sm"
    >
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <li
            key={step}
            className="flex flex-1 items-center gap-2"
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isDone && "border-emerald-600 bg-emerald-600 text-white",
                isCurrent && "border-slate-900 bg-slate-900 text-white",
                !isDone &&
                  !isCurrent &&
                  "border-slate-300 bg-white text-slate-500",
              )}
            >
              {idx + 1}
            </span>
            <span
              className={cn(
                "truncate font-medium",
                isCurrent ? "text-slate-900" : "text-slate-500",
              )}
            >
              {labels[step]}
            </span>
            {idx < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "ml-2 hidden h-px flex-1 sm:block",
                  idx < currentIdx ? "bg-emerald-600" : "bg-slate-300",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
