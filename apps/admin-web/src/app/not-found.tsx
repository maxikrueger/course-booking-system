import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-8 py-12">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Kursverwaltung
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
        404
      </h1>
      <h2 className="text-2xl font-semibold text-slate-900">
        Seite nicht gefunden
      </h2>
      <p className="text-slate-600">
        Diese Admin-Seite existiert nicht. Wechsle zurück zum Dashboard, um
        fortzufahren.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
