"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProtectedError({
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

  const isAuthError =
    /401|403|Authentication credentials|not authenticated/i.test(
      error.message ?? "",
    );

  return (
    <div className="flex max-w-xl flex-col items-start gap-4 py-8">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {isAuthError ? "Nicht angemeldet" : "Fehler"}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {isAuthError
          ? "Deine Sitzung ist abgelaufen"
          : "Diese Seite konnte nicht geladen werden"}
      </h1>
      <p className="text-slate-600">
        {isAuthError
          ? "Bitte melde dich erneut an, um fortzufahren."
          : "Wir konnten die angeforderten Daten nicht laden. Bitte versuche es erneut."}
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400">Fehler-ID: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        {isAuthError ? (
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Zum Login
          </Link>
        ) : (
          <>
            <Button type="button" onClick={reset}>
              Erneut versuchen
            </Button>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Zum Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
