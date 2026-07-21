import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, getAddress } from "viem";
import TickerIcon from "@/components/TickerIcon";
import { getWalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";
import { STOCK_BY_TICKER } from "@/lib/registry";

export const revalidate = 30;

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";

const STATE_LABEL = ["Open for bets", "Locked", "Resolved"] as const;
const OUTCOME_LABEL = ["Undecided", "UP", "DOWN", "Push"] as const;

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${truncateAddress(address)} — Predict — Implied Open` };
}

export default async function WalletPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw);

  const activity = await getWalletActivity(address).catch(() => null);
  if (!activity) notFound();

  const { bets, stakedWei, claimedWei, netWei } = activity;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/predict/leaderboard" className="text-xs text-text-muted hover:text-accent">
        ← Leaderboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Wallet</p>
          <h1 className="mono text-lg font-bold tracking-tight sm:text-xl">{address}</h1>
        </div>
        <a
          href={`${EXPLORER}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          View on Blockscout ↗
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Bets placed" value={String(bets.length)} />
        <Stat label="Staked" value={formatEth(stakedWei)} />
        <Stat label="Claimed" value={formatEth(claimedWei)} />
        <Stat
          label="Net"
          value={`${netWei > 0n ? "+" : ""}${formatEth(netWei)}`}
          tone={netWei > 0n ? "text-accent" : netWei < 0n ? "text-danger" : "text-text-primary"}
        />
      </div>

      {bets.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          This wallet hasn&apos;t placed any bets yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b, i) => {
                const stock = STOCK_BY_TICKER.get(b.ticker);
                const resolved = b.marketState === 2;
                const won =
                  resolved &&
                  ((b.marketOutcome === 1 && b.up) || (b.marketOutcome === 2 && !b.up) || b.marketOutcome === 3);
                return (
                  <tr key={`${b.txHash}-${i}`} className="border-b border-border last:border-0 hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <Link href={`/predict/${b.ticker}`} className="flex items-center gap-2 hover:text-accent">
                        <TickerIcon ticker={b.ticker} icon={stock?.icon ?? null} size={20} />
                        <span className="font-medium">{b.ticker}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          b.up ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
                        }`}
                      >
                        {b.up ? "UP" : "DOWN"}
                      </span>
                    </td>
                    <td className="mono px-4 py-3 text-right text-text-secondary">{formatEth(b.amount)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      {!resolved ? (
                        <span className="text-text-muted">{STATE_LABEL[b.marketState]}</span>
                      ) : b.claimed ? (
                        <span className="text-text-muted">Claimed · {OUTCOME_LABEL[b.marketOutcome]}</span>
                      ) : won ? (
                        <Link href={`/predict/${b.ticker}`} className="font-medium text-accent hover:underline">
                          Unclaimed win →
                        </Link>
                      ) : (
                        <span className="text-text-muted">Lost · {OUTCOME_LABEL[b.marketOutcome]}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mono mt-1 text-lg font-semibold ${tone ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
