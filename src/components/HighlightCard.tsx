import Link from "next/link";
import TickerIcon from "./TickerIcon";
import type { StockPremium } from "@/lib/premium";
import { formatCompactUsd, formatPct } from "@/lib/format";

/** CoinGecko-style "highlights" box: a short ranked list of tickers with one metric each. */
export default function HighlightCard({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: StockPremium[];
  metric: "premium" | "volume";
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-sm font-semibold text-text-primary">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">Not enough data yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <Link
              key={r.stock.ticker}
              href={`/stock/${r.stock.ticker}`}
              className="flex items-center gap-2 text-sm transition-colors hover:text-accent"
            >
              <TickerIcon ticker={r.stock.ticker} icon={r.stock.icon} size={20} />
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{r.stock.ticker}</span>
              {metric === "premium" ? (
                <span className={`mono shrink-0 text-xs font-semibold ${r.premiumPct >= 0 ? "text-accent" : "text-danger"}`}>
                  {formatPct(r.premiumPct)}
                </span>
              ) : (
                <span className="mono shrink-0 text-xs text-text-secondary">
                  {r.volume24h != null ? formatCompactUsd(r.volume24h) : "–"}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
