import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, getAddress } from "viem";
import TickerIcon from "@/components/TickerIcon";
import PremiumBadge from "@/components/PremiumBadge";
import BetHistoryTable from "@/components/BetHistoryTable";
import { getPortfolioHoldings } from "@/lib/portfolio";
import { getWalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";
import { formatUsd } from "@/lib/format";

export const revalidate = 30;

const EXPLORER_MAINNET = "https://robinhoodchain.blockscout.com";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${truncateAddress(address)} — Portfolio — Implied Open` };
}

export default async function PortfolioPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw);

  const [portfolio, activity] = await Promise.all([
    getPortfolioHoldings(address),
    getWalletActivity(address).catch(() => null),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/portfolio" className="text-xs text-text-muted hover:text-accent">
        ← Look up another wallet
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Portfolio</p>
          <h1 className="mono text-lg font-bold tracking-tight sm:text-xl">{address}</h1>
        </div>
        <a
          href={`${EXPLORER_MAINNET}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          View on Blockscout ↗
        </a>
      </div>

      <section className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Tokenized-stock holdings</p>
          <p className="mono mt-1 text-2xl font-semibold">{formatUsd(portfolio.totalValueUsd)}</p>
        </div>

        {portfolio.holdings.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
            No holdings of a tracked Robinhood stock token — or its 24/7 DEX
            balance is currently zero.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium text-right">Premium</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-border last:border-0 hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <Link href={`/stock/${h.ticker}`} className="flex items-center gap-2 hover:text-accent">
                        <TickerIcon ticker={h.ticker} icon={h.icon} size={20} />
                        <span className="font-semibold">{h.ticker}</span>
                      </Link>
                    </td>
                    <td className="mono px-4 py-3 text-right text-text-secondary">
                      {h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </td>
                    <td className="mono px-4 py-3 text-right">{formatUsd(h.price)}</td>
                    <td className="mono px-4 py-3 text-right font-medium">{formatUsd(h.valueUsd)}</td>
                    <td className="px-4 py-3 text-right">
                      <PremiumBadge pct={h.premiumPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-text-muted">Predict bet history (testnet)</p>
        {activity ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Bets placed" value={String(activity.bets.length)} />
              <Stat label="Staked" value={formatEth(activity.stakedWei)} />
              <Stat label="Claimed" value={formatEth(activity.claimedWei)} />
              <Stat
                label="Net"
                value={`${activity.netWei > 0n ? "+" : ""}${formatEth(activity.netWei)}`}
                tone={
                  activity.netWei > 0n ? "text-accent" : activity.netWei < 0n ? "text-danger" : "text-text-primary"
                }
              />
            </div>
            <BetHistoryTable bets={activity.bets} />
          </>
        ) : (
          <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
            Couldn&apos;t load Predict activity right now.
          </div>
        )}
      </section>
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
