import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import WalletTrackerDrawer from "@/components/WalletTrackerDrawer";
import GlobalStatsBar from "@/components/GlobalStatsBar";
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
  title: "RHAM — RobinHood Assets Market",
  description:
    "RHAM tracks and lets you bet on real-world stocks tokenized on Robinhood Chain — the live premium while markets are closed, and non-custodial prediction markets on whether a stock opens higher or lower, both across the weekend and during the trading session.",
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
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight text-accent">
                  RHAM
                </span>
                <span className="hidden text-xs text-text-muted sm:inline">
                  RobinHood Assets Market
                </span>
              </Link>
              <Link
                href="/predict"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Predict
              </Link>
              <Link
                href="/predict/leaderboard"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Leaderboard
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                How it works
              </Link>
              <Link
                href="/heatmap"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Heatmap
              </Link>
              <Link
                href="/watchlist"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Watchlist
              </Link>
              <Link
                href="/portfolio"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Portfolio
              </Link>
              <Link
                href="/compare"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Compare
              </Link>
              <Link
                href="/developers"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                Developers
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <WalletTrackerDrawer />
              {/* Twitter/X and $RHAM links go here once they exist. */}
            </div>
          </div>
        </header>
        <GlobalStatsBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-text-muted lg:px-6">
          <p>
            Token prices from Robinhood Chain DEXes (via Blockscout) · official
            prices from Chainlink feeds on Robinhood Chain · Predict markets
            are Robinhood Chain testnet only, play money · not investment
            advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
