import { notFound } from "next/navigation";

import { TerminStepClient } from "@/components/booking/termin-step";
import { getSession } from "@/lib/api";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TerminStepPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const id = Number(sessionId);
  if (!Number.isFinite(id)) notFound();

  let session;
  try {
    session = await getSession(id, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <TerminStepClient session={session} />;
}
