import Link from "next/link";
import { getLeaderboard } from "@/lib/predictBets";
import { getLastWeekChampion, getWeeklyLeaderboardView } from "@/lib/offchainWallet";
import LeaderboardTable from "@/components/LeaderboardTable";
import RealPlayTabs from "@/components/RealPlayTabs";
import WalletSearch from "@/components/WalletSearch";
import { formatChips, truncateAddress } from "@/lib/predictFormat";

export const revalidate = 30;

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export const metadata = {
  title: "Leaderboard — Predict — Implied Open",
  description:
    "ETH and fETH Predict leaderboards — ranked by ETH (or fETH) actually reclaimed vs staked. Testnet.",
};

function currentWeekStart(): number {
  return Math.floor(Math.floor(Date.now() / 1000) / WEEK_SECONDS) * WEEK_SECONDS;
}

function weekLabel(): string {
  const start = new Date(currentWeekStart() * 1000);
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function LeaderboardPage() {
  const [realEntries, playEntriesRaw, champion] = await Promise.all([
    getLeaderboard().catch(() => []),
    getWeeklyLeaderboardView().catch(() => []),
    getLastWeekChampion().catch(() => null),
  ]);
  const playEntries = playEntriesRaw.map((e) => ({
    user: e.user as `0x${string}`,
    stakedWei: BigInt(e.stakedWei),
    claimedWei: BigInt(e.claimedWei),
    netWei: BigInt(e.netWei),
    betCount: e.betCount,
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/predict" className="text-xs text-text-muted hover:text-accent">
        ← All predictions
      </Link>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-text-secondary">
            ETH bets are read straight off GapMarket&apos;s own
            on-chain events — no accounts, no off-chain tracking.{" "}
            <span className="text-text-primary">Net</span> is actually
            claimed minus staked; open (unclaimed) positions understate a
            wallet&apos;s true standing. fETH bets use an internal,
            wallet-free balance instead — see{" "}
            <Link href="/how-it-works" className="text-accent hover:underline">
              How it works
            </Link>
            .
          </p>
        </div>
        <WalletSearch />
      </section>

      <RealPlayTabs
        real={
          <>
            <p className="text-xs text-text-muted">All-time, real ETH.</p>
            <LeaderboardTable entries={realEntries} emptyText="No ETH bets placed yet." />
          </>
        }
        play={
          <>
            {champion && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-text-secondary">
                Last week&apos;s champion:{" "}
                <span className="mono text-text-primary">{truncateAddress(champion.address)}</span>{" "}
                (net {formatChips(BigInt(champion.netWei))}) — their next weekly claim includes a bonus.
              </div>
            )}
            <p className="text-xs text-text-muted">
              This week only (since {weekLabel()} 00:00 UTC) — fETH balances
              and this leaderboard both reset every Thursday 00:00 UTC. The
              top net winner each week gets a bonus added to next week&apos;s
              claim — see{" "}
              <Link href="/how-it-works" className="text-accent hover:underline">
                How it works
              </Link>
              .
            </p>
            <LeaderboardTable
              entries={playEntries}
              emptyText="No fETH bets placed this week yet."
              formatAmount={formatChips}
              linkWallets={false}
            />
          </>
        }
      />
    </div>
  );
}
