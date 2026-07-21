import Link from "next/link";
import { getLeaderboard } from "@/lib/predictBets";
import { getPlayLeaderboard, currentWeekStart } from "@/lib/playBets";
import LeaderboardTable from "@/components/LeaderboardTable";
import RealPlayTabs from "@/components/RealPlayTabs";
import WalletSearch from "@/components/WalletSearch";
import { formatChips } from "@/lib/predictFormat";

export const revalidate = 30;

export const metadata = {
  title: "Leaderboard — Predict — Implied Open",
  description:
    "Real-money and play-money Predict leaderboards — ranked by ETH (or chips) actually reclaimed vs staked. Testnet.",
};

function weekLabel(): string {
  const start = new Date(currentWeekStart() * 1000);
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function LeaderboardPage() {
  const [realEntries, playEntries] = await Promise.all([
    getLeaderboard().catch(() => []),
    getPlayLeaderboard().catch(() => []),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/predict" className="text-xs text-text-muted hover:text-accent">
        ← All predictions
      </Link>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-text-secondary">
            Every wallet that&apos;s placed a bet on Predict, read straight off
            the contracts&apos; own events — no accounts, no off-chain
            tracking. <span className="text-text-primary">Net</span> is
            actually claimed minus staked; open (unclaimed) positions
            understate a wallet&apos;s true standing.
          </p>
        </div>
        <WalletSearch />
      </section>

      <RealPlayTabs
        real={
          <>
            <p className="text-xs text-text-muted">All-time, real ETH.</p>
            <LeaderboardTable entries={realEntries} emptyText="No real-money bets placed yet." />
          </>
        }
        play={
          <>
            <p className="text-xs text-text-muted">
              This week only (since {weekLabel()} 00:00 UTC) — chip balances
              and this leaderboard both reset on the same weekly cycle
              (Thursdays 00:00 UTC — the contract&apos;s week boundary is
              simply block.timestamp / 7 days from the Unix epoch, which
              happens to land on Thursdays).
            </p>
            <LeaderboardTable
              entries={playEntries}
              emptyText="No play-money bets placed this week yet."
              formatAmount={formatChips}
            />
          </>
        }
      />
    </div>
  );
}
