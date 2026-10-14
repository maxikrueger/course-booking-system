"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { setUnauthorizedHandler } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Redirect bei finalem 401 nach Refresh-Versuch.
      router.push("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
