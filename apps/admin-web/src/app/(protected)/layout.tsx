import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Sidebar username={user.username} />
      <main className="px-4 py-6 md:py-8 md:pr-8 md:pl-[calc(15rem+2rem)]">
        {children}
      </main>
    </div>
  );
}
