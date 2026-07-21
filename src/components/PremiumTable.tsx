"use client";

import { useState } from "react";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import PremiumBadge from "./PremiumBadge";
import TimeAgo from "./TimeAgo";
import WatchButton from "./WatchButton";
import MiniSparkline from "./MiniSparkline";
import type { StockPremium } from "@/lib/premium";
import type { SparkPoint } from "@/lib/sparkline";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";

type SortKey = "premium" | "volume" | "price";

export default function PremiumTable({
  rows,
  sparklines,
}: {
  rows: StockPremium[];
  sparklines?: Record<string, SparkPoint[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("premium");

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === "volume") return (b.volume24h ?? 0) - (a.volume24h ?? 0);
    if (sortKey === "price") return b.tokenPrice - a.tokenPrice;
    return Math.abs(b.premiumPct) - Math.abs(a.premiumPct);
  });

  const sortButton = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      className={`cursor-pointer ${
        sortKey === key ? "text-accent" : "hover:text-text-secondary"
      }`}
    >
      {label}
      {sortKey === key ? " ↓" : ""}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="w-8 px-2 py-3" />
            <th className="px-2 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium text-right">
              {sortButton("price", "Token price")}
            </th>
            <th className="px-4 py-3 font-medium text-right">Official close</th>
            <th className="px-4 py-3 font-medium text-right">
              {sortButton("premium", "Premium")}
            </th>
            {sparklines && <th className="px-4 py-3 font-medium text-right">Trend</th>}
            <th className="px-4 py-3 font-medium text-right">
              {sortButton("volume", "24h volume")}
            </th>
            <th className="px-4 py-3 font-medium text-right">Close updated</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.stock.ticker}
              className="border-b border-border last:border-0 hover:bg-bg-hover"
            >
              <td className="px-2 py-3">
                <WatchButton ticker={r.stock.ticker} size={16} />
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/stock/${r.stock.ticker}`}
                    className="flex items-center gap-3"
                  >
                    <TickerIcon ticker={r.stock.ticker} icon={r.stock.icon} />
                    <span className="flex flex-col">
                      <span className="font-semibold">{r.stock.ticker}</span>
                      <span className="max-w-[180px] truncate text-xs text-text-muted">
                        {r.stock.name}
                      </span>
                    </span>
                  </Link>
                  {(PREDICTABLE_TICKERS as readonly string[]).includes(r.stock.ticker) && (
                    <Link
                      href={`/predict/${r.stock.ticker}`}
                      title={`Bet on ${r.stock.ticker}`}
                      className="shrink-0 rounded-full border border-accent/30 px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      Predict
                    </Link>
                  )}
                </div>
              </td>
              <td className="mono px-4 py-3 text-right">
                {formatUsd(r.tokenPrice)}
              </td>
              <td className="mono px-4 py-3 text-right text-text-secondary">
                {formatUsd(r.official)}
              </td>
              <td className="px-4 py-3 text-right">
                <PremiumBadge pct={r.premiumPct} />
              </td>
              {sparklines && (
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <MiniSparkline points={sparklines[r.stock.ticker]} />
                  </div>
                </td>
              )}
              <td className="mono px-4 py-3 text-right text-text-secondary">
                {r.volume24h != null ? formatCompactUsd(r.volume24h) : "–"}
              </td>
              <td className="mono px-4 py-3 text-right text-xs text-text-muted">
                <TimeAgo unixSeconds={r.officialUpdatedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
