"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, type Theme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/config/wagmi";
import { ToastProvider } from "./TxStatusToast";

/**
 * A quiet, dev-tools-only signature — the seal mark stamps every piece OBRA
 * mints, so this makes that literal for anyone curious enough to open the
 * console. Zero visual footprint, no motion, fires once per load.
 */
function logSignature() {
  const seal = ["   ___", "  / O \\", " |  ~  |", "  \\___/", "    `\\_"].join("\n");
  console.log(
    `%c${seal}\n%cOBRA — Signed by Chu. Paid in CHU.\n%cBuilt by Chu — Jesus "Chuzzo" Bordones`,
    "color: #f5642b; font-family: monospace;",
    "color: #f5642b; font-family: monospace; font-weight: 600;",
    "color: #97b2a5; font-family: monospace;"
  );
}

/** RainbowKit's modal themed to sit inside the OBRA surface/border/accent system. */
const obraRainbowTheme: Theme = {
  ...darkTheme({
    accentColor: "#f5642b",
    accentColorForeground: "#000d06",
    borderRadius: "medium",
    overlayBlur: "small",
  }),
};
obraRainbowTheme.colors = {
  ...obraRainbowTheme.colors,
  modalBackground: "#011c11",
  modalBorder: "#203c30",
  profileForeground: "#011c11",
  generalBorder: "#203c30",
  menuItemBackground: "#0a2b1e",
  actionButtonSecondaryBackground: "#0a2b1e",
};
obraRainbowTheme.fonts = {
  body: "var(--font-body)",
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
          },
        },
      })
  );

  useEffect(() => {
    logSignature();
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={obraRainbowTheme}>
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
