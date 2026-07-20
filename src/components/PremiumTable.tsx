"use client";

import { useState } from "react";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import PremiumBadge from "./PremiumBadge";
import TimeAgo from "./TimeAgo";
import type { StockPremium } from "@/lib/premium";
import { formatCompactUsd, formatUsd } from "@/lib/format";

type SortKey = "premium" | "volume" | "price";

export default function PremiumTable({ rows }: { rows: StockPremium[] }) {
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
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium text-right">
              {sortButton("price", "Token price")}
            </th>
            <th className="px-4 py-3 font-medium text-right">Official close</th>
            <th className="px-4 py-3 font-medium text-right">
              {sortButton("premium", "Premium")}
            </th>
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
              <td className="px-4 py-3">
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
