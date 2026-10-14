"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-8 py-12">
      <p className="text-xs uppercase tracking-wide text-slate-500">Fehler</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Da ist etwas schiefgelaufen
      </h1>
      <p className="text-slate-600">
        Die Admin-Oberfläche konnte diese Seite nicht laden. Versuche es erneut
        oder lade die Seite neu.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400">Fehler-ID: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" onClick={reset}>
          Erneut versuchen
        </Button>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
