import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getAdminUser();
  if (!user) {
    redirect("/login");
  }
  redirect("/dashboard");
}
