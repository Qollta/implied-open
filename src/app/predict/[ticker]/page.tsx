import Link from "next/link";
import { notFound } from "next/navigation";
import TickerIcon from "@/components/TickerIcon";
import ConnectWallet from "@/components/ConnectWallet";
import PredictMarketCard from "@/components/PredictMarketCard";
import { getAllMarkets, toInitialMarket } from "@/lib/predictMarkets";
import { STOCK_BY_TICKER } from "@/lib/registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const stock = STOCK_BY_TICKER.get(t);
  return {
    title: `${t} — Predict — Implied Open`,
    description: stock
      ? `Bet whether ${stock.name} (${t}) rises or falls during the trading session on Robinhood Chain — non-custodial, testnet only.`
      : `Bet on ${t} during the trading session on Robinhood Chain.`,
  };
}

export default async function PredictTickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  const stock = STOCK_BY_TICKER.get(ticker);

  const allMarkets = await getAllMarkets().catch(() => []);
  const marketsForTicker = allMarkets
    .filter((m) => m.ticker === ticker)
    .sort((a, b) => Number(b.id - a.id)); // newest first

  if (!stock && marketsForTicker.length === 0) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/predict" className="text-xs text-text-muted hover:text-accent">
        ← All predictions
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TickerIcon ticker={ticker} icon={stock?.icon ?? null} size={40} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{ticker}</h1>
            {stock && <p className="text-sm text-text-secondary">{stock.name}</p>}
          </div>
        </div>
        <ConnectWallet />
      </div>

      {marketsForTicker.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          No markets for {ticker} yet.
        </div>
      ) : (
        <>
          <PredictMarketCard id={marketsForTicker[0].id.toString()} initial={toInitialMarket(marketsForTicker[0])} />

          {marketsForTicker.length > 1 && (
            <details className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-3">
              <summary className="cursor-pointer text-sm text-text-secondary">
                Past sessions ({marketsForTicker.length - 1})
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                {marketsForTicker.slice(1).map((m) => (
                  <PredictMarketCard key={m.id.toString()} id={m.id.toString()} initial={toInitialMarket(m)} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
