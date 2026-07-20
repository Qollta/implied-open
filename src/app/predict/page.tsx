import Link from "next/link";
import TickerIcon from "@/components/TickerIcon";
import { getLatestMarketPerTicker } from "@/lib/predictMarkets";
import { STOCK_BY_TICKER } from "@/lib/registry";

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
  const markets = await getLatestMarketPerTicker().catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Predict: bet on the session, not the weekend</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Non-custodial pari-mutuel markets: put ETH on whether a tokenized
          stock rises or falls during regular market hours. Resolved by
          reading the same on-chain price feed at session start and session
          end — nobody, including us, decides the outcome. Robinhood Chain
          testnet only — play money, not investment advice.
        </p>
      </section>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          No markets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => {
            const stock = STOCK_BY_TICKER.get(m.ticker);
            return (
              <Link
                key={m.ticker}
                href={`/predict/${m.ticker}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-4 transition-colors hover:border-accent"
              >
                <TickerIcon ticker={m.ticker} icon={stock?.icon ?? null} size={36} />
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold text-text-primary">{m.ticker}</span>
                  <span className="truncate text-xs text-text-muted">{stock?.name ?? ""}</span>
                </div>
                <span
                  className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-xs ${STATE_TONE[m.state]}`}
                >
                  {STATE_LABEL[m.state]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
