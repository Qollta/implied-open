import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import PremiumTable from "@/components/PremiumTable";
import HighlightCard from "@/components/HighlightCard";
import { getPremiums } from "@/lib/premium";
import { getSparklines } from "@/lib/sparkline";
import { getMarketStatus } from "@/lib/market";
import { formatPct } from "@/lib/format";

export const revalidate = 30;

export default async function Home() {
  const [rows, sparklines] = await Promise.all([getPremiums(), getSparklines()]);
  const market = getMarketStatus();
  const liquid = rows.filter((r) => r.liquid);
  const illiquid = rows.filter((r) => !r.liquid);

  const avg =
    liquid.length > 0
      ? liquid.reduce((s, r) => s + r.premiumPct, 0) / liquid.length
      : 0;
  const top = liquid[0];

  const topGainers = [...liquid].filter((r) => r.premiumPct > 0).sort((a, b) => b.premiumPct - a.premiumPct).slice(0, 5);
  const topLosers = [...liquid].filter((r) => r.premiumPct < 0).sort((a, b) => a.premiumPct - b.premiumPct).slice(0, 5);
  const mostLiquid = [...liquid].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={45} />

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          SAV — StockAssetVault
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Where does the market think stocks open next?
        </h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Robinhood Chain lets real-world stocks (RWA) trade on-chain 24/7,
          but their &quot;official&quot; price only updates while NYSE is
          open. That leaves a live, constantly-moving gap between what a
          token trades at right now and its last official close — a signal
          that simply didn&apos;t exist before tokenized equities. SAV is
          built entirely around that gap, in two ways.{" "}
          <Link href="/how-it-works" className="text-accent hover:underline">
            How it works →
          </Link>
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            01 · Watch it
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            Implied Open
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            The dashboard below — free, no wallet needed. Every tokenized
            stock&apos;s live premium or discount vs. its official close,
            updated continuously. While the market&apos;s shut, it&apos;s the
            on-chain crowd&apos;s running bet on where the stock reopens.
          </p>
        </div>
        <Link
          href="/predict"
          className="group rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-accent"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            02 · Bet on it
          </p>
          <h2 className="mt-1 flex items-center gap-1 text-lg font-semibold text-text-primary">
            Predict
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Non-custodial markets, resolved entirely on-chain, no admin
            deciding the outcome — bet with real ETH, or with{" "}
            <strong className="text-text-primary">free weekly fETH</strong>{" "}
            (fake ETH) from an internal site wallet — no MetaMask needed (0.1
            fETH, reset every week, its own leaderboard). Two kinds of
            market: <strong className="text-text-primary">weekend gap</strong>{" "}
            — will Friday&apos;s close open higher or lower on Monday — and{" "}
            <strong className="text-text-primary">trading session</strong> —
            up or down between the open and close of a single session.
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            US market
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                market.open ? "bg-accent" : "bg-warning"
              }`}
            />
            {market.open ? "Open" : `Closed · ${market.label}`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Average premium ({liquid.length} stocks)
          </p>
          <p
            className={`mono mt-1 text-lg font-semibold ${
              avg >= 0 ? "text-accent" : "text-danger"
            }`}
          >
            {formatPct(avg)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Biggest gap
          </p>
          <p className="mono mt-1 text-lg font-semibold">
            {top ? (
              <>
                {top.stock.ticker}{" "}
                <span className={top.premiumPct >= 0 ? "text-accent" : "text-danger"}>
                  {formatPct(top.premiumPct)}
                </span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HighlightCard title="Top Gainers" rows={topGainers} metric="premium" />
        <HighlightCard title="Top Losers" rows={topLosers} metric="premium" />
        <HighlightCard title="Most Liquid" rows={mostLiquid} metric="volume" />
      </section>

      <PremiumTable rows={liquid} sparklines={sparklines} />

      {illiquid.length > 0 && (
        <details className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-3">
          <summary className="cursor-pointer text-sm text-text-secondary">
            Low-liquidity tokens ({illiquid.length}) — DEX prices unreliable
          </summary>
          <p className="mt-2 text-xs text-text-muted">
            Under ${"1,000"} of 24h onchain volume: a single stale pool print
            can show an absurd &quot;premium&quot;, so these are excluded from
            the stats above.
          </p>
          <div className="mt-3">
            <PremiumTable rows={illiquid} />
          </div>
        </details>
      )}

      <p className="text-xs text-text-muted">
        &quot;Official close&quot; is the Chainlink feed on Robinhood Chain —
        it follows market hours, so outside the session it holds the last
        close. Token prices update 24/7. Auto-refreshes every 45s.
      </p>
    </div>
  );
}
