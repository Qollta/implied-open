import Link from "next/link";
import { formatEth, truncateAddress } from "@/lib/predictFormat";

export interface LeaderboardRow {
  user: `0x${string}`;
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
  betCount: number;
}

/** Shared table shape for both the real-money and play-money leaderboards — pass `formatChips` for the play one so amounts don't read as real ETH. */
export default function LeaderboardTable({
  entries,
  emptyText,
  formatAmount = formatEth,
}: {
  entries: LeaderboardRow[];
  emptyText: string;
  formatAmount?: (wei: bigint) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Wallet</th>
            <th className="px-4 py-3 font-medium text-right">Bets</th>
            <th className="px-4 py-3 font-medium text-right">Staked</th>
            <th className="px-4 py-3 font-medium text-right">Claimed</th>
            <th className="px-4 py-3 font-medium text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.user} className="border-b border-border last:border-0 hover:bg-bg-hover">
              <td className="px-4 py-3 text-text-muted">{i + 1}</td>
              <td className="px-4 py-3">
                <Link href={`/predict/wallet/${e.user}`} className="mono text-text-primary hover:text-accent">
                  {truncateAddress(e.user)}
                </Link>
              </td>
              <td className="mono px-4 py-3 text-right text-text-secondary">{e.betCount}</td>
              <td className="mono px-4 py-3 text-right text-text-secondary">{formatAmount(e.stakedWei)}</td>
              <td className="mono px-4 py-3 text-right text-text-secondary">{formatAmount(e.claimedWei)}</td>
              <td
                className={`mono px-4 py-3 text-right font-semibold ${
                  e.netWei > 0n ? "text-accent" : e.netWei < 0n ? "text-danger" : "text-text-secondary"
                }`}
              >
                {e.netWei > 0n ? "+" : ""}
                {formatAmount(e.netWei)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
