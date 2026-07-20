import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumHistoryChart from "@/components/PremiumHistoryChart";
import ShareButton from "@/components/ShareButton";
import TickerIcon from "@/components/TickerIcon";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { getPremiums } from "@/lib/premium";
import { getPremiumHistory } from "@/lib/history";
import { getMarketStatus } from "@/lib/market";
import { formatCompactUsd, formatPct, formatUsd, timeAgo } from "@/lib/format";

export const revalidate = 30;

const BLOCKSCOUT = "https://robinhoodchain.blockscout.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const stock = STOCK_BY_TICKER.get(ticker.toUpperCase());
  if (!stock) return {};

  const rows = await getPremiums().catch(() => []);
  const row = rows.find((r) => r.stock.ticker === stock.ticker);
  const description = row
    ? `${stock.name} (${stock.ticker}) is trading at ${formatPct(row.premiumPct)} vs its official close on Robinhood Chain — 24/7 tokenized stock prices.`
    : `${stock.name} (${stock.ticker}) tokenized stock price on Robinhood Chain.`;

  return {
    title: `${stock.ticker}${row ? ` ${formatPct(row.premiumPct)}` : ""} — Implied Open`,
    description,
    twitter: { card: "summary_large_image" },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const stock = STOCK_BY_TICKER.get(ticker.toUpperCase());
  if (!stock) notFound();

  const [rows, history] = await Promise.all([
    getPremiums().catch(() => []),
    getPremiumHistory(stock.ticker),
  ]);
  const row = rows.find((r) => r.stock.ticker === stock.ticker);
  const market = getMarketStatus();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <AutoRefresh seconds={45} />

      <Link href="/" className="text-xs text-text-muted hover:text-accent">
        ← All stocks
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <TickerIcon ticker={stock.ticker} icon={stock.icon} size={48} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {stock.ticker}
              <span className="ml-3 text-base font-normal text-text-secondary">
                {stock.name}
              </span>
            </h1>
            <p className="text-xs text-text-muted">
              {market.open
                ? "US market is open — premium should stay near zero"
                : `US market closed (${market.label.toLowerCase()}) — the token is trading ahead of the next open`}
            </p>
          </div>
        </div>
        {row && (
          <ShareButton
            ticker={stock.ticker}
            name={stock.name}
            premiumPct={row.premiumPct}
            marketOpen={market.open}
          />
        )}
      </div>

      {row ? (
        <>
          {!row.liquid && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              Low onchain liquidity — the DEX price (and therefore this
              premium) may be stale or distorted by a single trade.
            </div>
          )}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Premium vs official close
            </p>
            <div className="mt-2">
              <PremiumBadge pct={row.premiumPct} size="lg" />
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              The onchain market is pricing {stock.ticker} at{" "}
              <span className="mono text-text-primary">
                {formatUsd(row.tokenPrice)}
              </span>{" "}
              against an official close of{" "}
              <span className="mono text-text-primary">
                {formatUsd(row.official)}
              </span>
              {" — "}an implied open of{" "}
              <span className="mono font-semibold text-accent">
                {formatUsd(row.tokenPrice)}
              </span>
              .
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Token price (24/7)" value={formatUsd(row.tokenPrice)} />
            <Stat label="Official close" value={formatUsd(row.official)} />
            <Stat
              label="Close updated"
              value={timeAgo(row.officialUpdatedAt)}
            />
            <Stat
              label="24h onchain volume"
              value={
                row.volume24h != null ? formatCompactUsd(row.volume24h) : "–"
              }
            />
          </div>

          <PremiumHistoryChart points={history} />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary p-6 text-sm text-text-secondary">
          No live price data for {stock.ticker} right now.
        </div>
      )}

      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-xs text-text-muted">
        <p>
          Token contract:{" "}
          <a
            className="mono text-accent hover:underline"
            href={`${BLOCKSCOUT}/token/${stock.token}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {stock.token}
          </a>
        </p>
        <p className="mt-1">
          Chainlink feed:{" "}
          <a
            className="mono text-accent hover:underline"
            href={`${BLOCKSCOUT}/address/${stock.feed}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {stock.feed}
          </a>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mono mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
