import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Fragment_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  // Keep close to default axis values — BRAND.md §4/§7 explicitly warns
  // against enabling WONK or pushing SOFT high (reads playful/handwritten,
  // wrong register for OBRA's quieter gallery voice).
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fragmentMono = Fragment_Mono({
  variable: "--font-fragment-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  // Set via NEXT_PUBLIC_SITE_URL once the Vercel deploy URL is known
  // (Phase 6) — resolves social-share image URLs; localhost is a fine
  // fallback for local dev.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "OBRA — Mint, list, collect — all in CHU.",
  description:
    "OBRA — a 100-piece generative NFT gallery. Mint, list, and collect on the Obra marketplace, paid entirely in CHU (Level 02's token). Signed by Chu. Paid in CHU.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "OBRA — Signed by Chu. Paid in CHU.",
    description: "A 100-piece generative NFT gallery. Mint, list, and collect — all in CHU.",
    images: ["/brand/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000d06",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} ${fragmentMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
