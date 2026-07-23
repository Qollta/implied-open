import Link from "next/link";
import TickerIcon from "@/components/TickerIcon";
import PremiumBadge from "@/components/PremiumBadge";
import MiniSparkline from "@/components/MiniSparkline";
import PoolDominanceBars from "@/components/PoolDominanceBars";
import { getLatestMarketPerTicker } from "@/lib/predictMarkets";
import { getPredictOverview } from "@/lib/predictBets";
import { getPremiums } from "@/lib/premium";
import { getSparklines, type SparkPoint } from "@/lib/sparkline";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { formatEth } from "@/lib/predictFormat";

export const revalidate = 15;

const STATE_LABEL = ["Open for bets", "Locked", "Resolved"] as const;
const STATE_TONE = [
  "border-accent/40 text-accent",
  "border-warning/40 text-warning",
  "border-border text-text-muted",
] as const;

export const metadata = {
  title: "Predict — Implied Open",
  description:
    "Bet whether a Robinhood Chain tokenized stock rises or falls during regular market hours. Non-custodial, testnet only.",
};

export default async function PredictIndexPage() {
  const [markets, overview, premiums, sparklines] = await Promise.all([
    getLatestMarketPerTicker().catch(() => []),
    getPredictOverview().catch(() => ({
      totalMarkets: 0,
      activeMarkets: 0,
      activeBettors: 0,
      totalStakedWei: 0n,
      stakedByTicker: [],
    })),
    getPremiums().catch(() => []),
    getSparklines().catch(() => ({}) as Record<string, SparkPoint[]>),
  ]);
  const premiumByTicker = new Map(premiums.map((r) => [r.stock.ticker, r]));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Predict: bet on the session, not the weekend</h1>
          <Link
            href="/predict/leaderboard"
            className="text-sm text-text-secondary transition-colors hover:text-accent"
          >
            Leaderboard →
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">
          Non-custodial pari-mutuel markets: bet on whether a tokenized stock
          rises or falls during regular market hours. Resolved by reading the
          same on-chain price feed at session start and session end — nobody,
          including us, decides the outcome. Robinhood Chain testnet only —
          not investment advice.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">New: free weekly fETH — no wallet needed</p>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Every ticker below now has two tabs — <strong className="text-text-primary">ETH</strong>{" "}
            (needs a wallet) and <strong className="text-text-primary">fETH</strong> (fake ETH, an
            internal site wallet — no MetaMask). fETH resets to 0.1 free every
            week: claim, bet, and climb the weekly leaderboard for a shot at
            the champion&apos;s bonus, with nothing real at risk.
          </p>
        </div>
        <Link
          href="/predict/leaderboard"
          className="shrink-0 rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          See both leaderboards →
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Markets" value={String(overview.activeMarkets)} sub={`${overview.totalMarkets} all-time`} />
        <Stat label="Tickers" value={String(markets.length)} />
        <Stat label="Total staked" value={formatEth(overview.totalStakedWei)} />
        <Stat label="Bettors" value={String(overview.activeBettors)} />
      </section>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          No markets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => {
            const stock = STOCK_BY_TICKER.get(m.ticker);
            const premiumRow = premiumByTicker.get(m.ticker);
            const totalPool = m.upPool + m.downPool;
            const upShare = totalPool > 0n ? Number((m.upPool * 10000n) / totalPool) / 100 : 50;

            return (
              <Link
                key={m.ticker}
                href={`/predict/${m.ticker}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-bg-secondary p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TickerIcon ticker={m.ticker} icon={stock?.icon ?? null} size={32} />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold text-text-primary">{m.ticker}</span>
                      <span className="truncate text-xs text-text-muted">{stock?.name ?? ""}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${STATE_TONE[m.state]}`}
                  >
                    {STATE_LABEL[m.state]}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {premiumRow ? (
                    <PremiumBadge pct={premiumRow.premiumPct} />
                  ) : (
                    <span className="text-xs text-text-muted">–</span>
                  )}
                  <MiniSparkline points={sparklines[m.ticker]} />
                </div>

                <div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-bg-primary">
                    <div className="h-full bg-accent" style={{ width: `${upShare}%` }} />
                    <div className="h-full bg-danger" style={{ width: `${100 - upShare}%` }} />
                  </div>
                  <div className="mono mt-1 flex justify-between text-[10px] text-text-muted">
                    <span>{formatEth(m.upPool)} UP</span>
                    <span>{formatEth(m.downPool)} DOWN</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <PoolDominanceBars rows={overview.stakedByTicker} totalWei={overview.totalStakedWei} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mono mt-1 text-lg font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}
