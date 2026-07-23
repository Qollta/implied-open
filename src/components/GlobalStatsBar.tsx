import Link from "next/link";
import { getPremiums } from "@/lib/premium";
import { getGlobalFEthWeeklyOverview } from "@/lib/offchainWallet";
import { formatChips } from "@/lib/predictFormat";
import { formatCompactUsd, formatPct } from "@/lib/format";

/**
 * CoinGecko-style thin stats strip under the header nav, on every page —
 * tokens tracked, average premium, 24h volume, and this week's fETH
 * activity, plus a leaderboard quick-link. Deliberately global-market
 * numbers only (getPremiums(), already ISR-cached everywhere; the fETH
 * overview is one cheap Redis/JSON read) — NOT the real-money Predict
 * overview, which scans on-chain event logs and would be too expensive to
 * run on every single page load site-wide (see CLAUDE.md §9's note on
 * getLeaderboard's unfiltered log scan).
 */
export default async function GlobalStatsBar() {
  const [rows, fEthOverview] = await Promise.all([
    getPremiums().catch(() => []),
    getGlobalFEthWeeklyOverview().catch(() => ({ players: 0, stakedWei: "0" })),
  ]);

  const liquid = rows.filter((r) => r.liquid);
  const avgPremium = liquid.length > 0 ? liquid.reduce((s, r) => s + r.premiumPct, 0) / liquid.length : 0;
  const totalVolume = liquid.reduce((s, r) => s + (r.volume24h ?? 0), 0);

  return (
    <div className="border-b border-border bg-bg-primary/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 overflow-x-auto px-4 py-1.5 text-xs text-text-secondary lg:px-6">
        <span className="whitespace-nowrap">
          <strong className="text-text-primary">{rows.length}</strong> tokens tracked
        </span>
        <span className="whitespace-nowrap">
          Avg premium{" "}
          <strong className={avgPremium >= 0 ? "text-accent" : "text-danger"}>{formatPct(avgPremium)}</strong>
        </span>
        <span className="whitespace-nowrap">
          <strong className="text-text-primary">{formatCompactUsd(totalVolume)}</strong> 24h volume
        </span>
        <span className="whitespace-nowrap">
          <strong className="text-text-primary">{fEthOverview.players}</strong> fETH players ·{" "}
          <strong className="text-text-primary">{formatChips(BigInt(fEthOverview.stakedWei))}</strong> staked this week
        </span>
        <Link
          href="/predict/leaderboard"
          className="ml-auto shrink-0 whitespace-nowrap text-accent hover:underline"
        >
          Leaderboard →
        </Link>
      </div>
    </div>
  );
}
