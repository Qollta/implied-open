import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import WalletTrackerDrawer from "@/components/WalletTrackerDrawer";
import RhamTokenButton from "@/components/RhamTokenButton";
import GlobalStatsBar from "@/components/GlobalStatsBar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
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
      className={`${inter.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="no-scrollbar mx-auto flex w-full max-w-6xl flex-nowrap items-center justify-between gap-4 overflow-x-auto px-4 py-3 lg:px-6">
            <Link href="/" className="flex shrink-0 items-baseline gap-2">
              <span className="whitespace-nowrap text-lg font-bold tracking-tight text-text-primary">
                RHAM
              </span>
            </Link>
            <nav className="flex shrink-0 gap-0.5 rounded-full bg-bg-hover p-1 text-sm">
              <Link
                href="/predict"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Predict
              </Link>
              <Link
                href="/predict/leaderboard"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Leaderboard
              </Link>
              <Link
                href="/how-it-works"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                How it works
              </Link>
              <Link
                href="/heatmap"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Heatmap
              </Link>
              <Link
                href="/watchlist"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Watchlist
              </Link>
              <Link
                href="/portfolio"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Portfolio
              </Link>
              <Link
                href="/compare"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Compare
              </Link>
              <Link
                href="/developers"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                Developers
              </Link>
            </nav>
            <div className="flex shrink-0 flex-nowrap items-center gap-2">
              <WalletTrackerDrawer />
              <a
                href="https://x.com/rwam_rh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="RHAM on X"
                className="flex shrink-0 items-center justify-center rounded-full bg-bg-hover p-2 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.6L4.4 22H1.3l8-9.2L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
                </svg>
              </a>
              <RhamTokenButton />
            </div>
          </div>
        </header>
        <GlobalStatsBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
        <footer className="border-t border-border bg-bg-secondary">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-text-muted lg:px-6">
            <p>
              Token prices from Robinhood Chain DEXes (via Blockscout) · official
              prices from Chainlink feeds on Robinhood Chain · Predict markets
              are Robinhood Chain testnet only, play money · not investment
              advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
