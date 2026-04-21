"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { initNative, onNetworkChange, setStatusBarColor } from "@/lib/native";
import { loadStoredAuthToken } from "@/lib/authToken";

function NativeThemeBridge() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === "light") {
      setStatusBarColor("#ffffff", true).catch(() => {});
    } else {
      setStatusBarColor("#0b0b0d", false).catch(() => {});
    }
  }, [resolvedTheme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
      })
  );
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    loadStoredAuthToken().catch(() => {});
    onNetworkChange((online) => setOffline(!online));
    initNative().catch(() => {});
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NativeThemeBridge />
        <QueryClientProvider client={queryClient}>
          {offline && (
            <div className="fixed inset-x-0 top-0 z-[100] bg-amber-600/90 px-3 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1 text-center text-xs font-medium text-white backdrop-blur">
              Offline — changes will sync when reconnected
            </div>
          )}
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
