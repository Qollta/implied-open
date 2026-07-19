import AutoRefresh from "@/components/AutoRefresh";
import PremiumTable from "@/components/PremiumTable";
import { getPremiums } from "@/lib/premium";
import { getMarketStatus } from "@/lib/market";
import { formatPct } from "@/lib/format";

export const revalidate = 30;

export default async function Home() {
  const [rows, market] = [await getPremiums(), getMarketStatus()];
  const liquid = rows.filter((r) => r.liquid);
  const illiquid = rows.filter((r) => !r.liquid);

  const avg =
    liquid.length > 0
      ? liquid.reduce((s, r) => s + r.premiumPct, 0) / liquid.length
      : 0;
  const top = liquid[0];

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={45} />

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Where does the market think stocks open next?
        </h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Robinhood stock tokens keep trading on Robinhood Chain while the real
          market is closed. The gap between a token&apos;s live onchain price
          and its official Chainlink close is the market&apos;s bet on the next
          open.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            US market
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                market.open ? "bg-accent" : "bg-warning"
              }`}
            />
            {market.open ? "Open" : `Closed · ${market.label}`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Average premium ({liquid.length} stocks)
          </p>
          <p
            className={`mono mt-1 text-lg font-semibold ${
              avg >= 0 ? "text-accent" : "text-danger"
            }`}
          >
            {formatPct(avg)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Biggest gap
          </p>
          <p className="mono mt-1 text-lg font-semibold">
            {top ? (
              <>
                {top.stock.ticker}{" "}
                <span className={top.premiumPct >= 0 ? "text-accent" : "text-danger"}>
                  {formatPct(top.premiumPct)}
                </span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
      </section>

      <PremiumTable rows={liquid} />

      {illiquid.length > 0 && (
        <details className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-3">
          <summary className="cursor-pointer text-sm text-text-secondary">
            Low-liquidity tokens ({illiquid.length}) — DEX prices unreliable
          </summary>
          <p className="mt-2 text-xs text-text-muted">
            Under ${"1,000"} of 24h onchain volume: a single stale pool print
            can show an absurd &quot;premium&quot;, so these are excluded from
            the stats above.
          </p>
          <div className="mt-3">
            <PremiumTable rows={illiquid} />
          </div>
        </details>
      )}

      <p className="text-xs text-text-muted">
        &quot;Official close&quot; is the Chainlink feed on Robinhood Chain —
        it follows market hours, so outside the session it holds the last
        close. Token prices update 24/7. Auto-refreshes every 45s.
      </p>
    </div>
  );
}
