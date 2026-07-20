import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: "Implied Open — 24/7 stock prices on Robinhood Chain",
  description:
    "Robinhood Chain stock tokens trade around the clock. Implied Open tracks the live premium or discount of every token against its official closing price — the market's prediction of where each stock opens next.",
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-bg-secondary/60 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 lg:px-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-accent">
                Implied Open
              </span>
              <span className="hidden text-xs text-text-muted sm:inline">
                stocks never sleep on Robinhood Chain
              </span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-text-muted lg:px-6">
          <p>
            Token prices from Robinhood Chain DEXes (via Blockscout) · official
            prices from Chainlink feeds on Robinhood Chain · not investment
            advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
