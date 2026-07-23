"use client";

import { useEffect, useState } from "react";
import { formatChips, formatCountdown, formatSessionWindow } from "@/lib/predictFormat";
import { WALLET_UPDATED_EVENT, notifyWalletUpdated } from "@/lib/walletEvents";

const STATE_LABEL = ["Open for bets", "Locked — awaiting resolution", "Resolved"] as const;
const STATE_DOT = ["bg-accent", "bg-warning", "bg-text-muted"] as const;
const OUTCOME_LABEL = ["", "UP", "DOWN", "PUSH"] as const;
const OUTCOME_TONE = ["", "text-accent", "text-danger", "text-text-secondary"] as const;

/** Plain-serializable mirror of offchainWallet.ts's MarketView — kept as its own interface here (not imported from the server-only lib), same "Initial*" pattern PredictMarketCard uses for the on-chain Market struct. */
export interface FPlayMarketView {
  id: string;
  ticker: string;
  locksAt: number;
  resolvesAt: number;
  state: 0 | 1 | 2;
  startPrice: number | null;
  endPrice: number | null;
  outcome: 0 | 1 | 2 | 3;
  upPool: string;
  downPool: string;
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatUsdPrice(v: number | null): string {
  return v == null
    ? "–"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PoolBar({ upPool, downPool }: { upPool: string; downPool: string }) {
  const up = BigInt(upPool);
  const down = BigInt(downPool);
  const total = up + down;
  const upShare = total > 0n ? Number((up * 10000n) / total) / 100 : 50;
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-bg-primary">
        <div className="h-full bg-accent" style={{ width: `${upShare}%` }} />
        <div className="h-full bg-danger" style={{ width: `${100 - upShare}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="mono text-accent">{formatChips(up)} UP</span>
        <span className="mono text-danger">{formatChips(down)} DOWN</span>
      </div>
    </div>
  );
}

function CardHeader({ market }: { market: FPlayMarketView }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-secondary">
          Trading session
        </span>
        <p className="mono text-sm text-text-secondary">{formatSessionWindow(market.locksAt, market.resolvesAt)}</p>
      </div>
      <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-secondary">
        <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[market.state]}`} />
        {STATE_LABEL[market.state]}
      </span>
    </div>
  );
}

function PriceRow({ market, now }: { market: FPlayMarketView; now: number }) {
  const isResolved = market.state === 2;
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">{market.state === 0 ? "Locks in" : "Locked at"}</p>
        {/* suppressHydrationWarning: formatCountdown is clock-derived, same class of server/client drift as TimeAgo (CLAUDE.md §7) */}
        <p className="mono text-text-primary" suppressHydrationWarning>
          {market.state === 0 ? formatCountdown(market.locksAt, now) : formatUsdPrice(market.startPrice)}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">{market.state < 2 ? "Resolves in" : "Outcome"}</p>
        <p className={`mono ${isResolved ? OUTCOME_TONE[market.outcome] : "text-text-primary"}`} suppressHydrationWarning>
          {market.state < 2
            ? formatCountdown(market.resolvesAt, now)
            : `${OUTCOME_LABEL[market.outcome]} (${formatUsdPrice(market.endPrice)})`}
        </p>
      </div>
    </div>
  );
}

/**
 * Static, non-interactive summary for a resolved past market — used in the
 * "Past sessions" collapsible list. Doesn't poll: re-fetching there would
 * just return the current live market, not this frozen historical one.
 */
export function ResolvedFPlayMarket({ market }: { market: FPlayMarketView }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5">
      <CardHeader market={market} />
      <PoolBar upPool={market.upPool} downPool={market.downPool} />
      <PriceRow market={market} now={market.resolvesAt} />
    </div>
  );
}

/**
 * Off-chain, wallet-free sibling of PredictMarketCard — bets debit/credit the
 * caller's internal fETH wallet through /api/fplay/[ticker] instead of an
 * on-chain PlayMarket transaction. No wagmi, no ConnectWallet requirement:
 * see lib/offchainWallet.ts and CLAUDE.md's "fETH internal wallet" section.
 */
export default function PlayMarketCard({ ticker, initial }: { ticker: string; initial?: FPlayMarketView }) {
  const now = useNow();
  const [market, setMarket] = useState<FPlayMarketView | undefined>(initial);
  const [myPosition, setMyPosition] = useState<{ up: string; down: string }>({ up: "0", down: "0" });
  const [amount, setAmount] = useState("0.01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/fplay/${ticker}`);
      const data = await res.json();
      setMarket(data.market);
      setMyPosition(data.myPosition);
    } catch {
      // keep showing the last known state
    }
  }

  function refreshBalance() {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((w) => setBalance(w.balance))
      .catch(() => {});
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, same pattern as ClaimChipsButton
    refresh();
    refreshBalance();
    // Claiming happens in a separate component (ClaimChipsButton) with its
    // own balance state — without this listener, this card keeps showing
    // "No fETH left" until its next 10s poll happens to land after the claim.
    window.addEventListener(WALLET_UPDATED_EVENT, refreshBalance);
    const id = setInterval(() => {
      refresh();
      refreshBalance();
    }, 10_000);
    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, refreshBalance);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  if (!market) return null;

  const canBet = market.state === 0 && now < market.locksAt;
  const hasNoFEth = balance !== null && BigInt(balance) === 0n;
  const hasPosition = BigInt(myPosition.up) > 0n || BigInt(myPosition.down) > 0n;

  async function bet(up: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fplay/${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ up, amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not place bet.");
      } else {
        setBalance(data.balance);
        notifyWalletUpdated();
      }
      await refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5">
      <CardHeader market={market} />
      <PoolBar upPool={market.upPool} downPool={market.downPool} />
      <PriceRow market={market} now={now} />

      {balance !== null && (
        <p className="mt-3 text-xs text-text-secondary">
          Your fETH balance: <span className="mono text-text-primary">{formatChips(BigInt(balance))}</span>
        </p>
      )}

      {hasNoFEth && canBet && (
        <p className="mt-2 text-xs text-warning">
          No fETH left — claim this week&apos;s free fETH above to keep playing.
        </p>
      )}

      {canBet && !hasNoFEth && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-border bg-bg-primary">
            <input
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 bg-transparent px-3 py-1.5 text-sm text-text-primary focus:outline-none"
            />
            <span className="px-3 text-xs text-text-muted">fETH</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(true)}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Bet UP
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(false)}
            className="rounded-lg bg-danger px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Bet DOWN
          </button>
        </div>
      )}

      {!canBet && market.state === 0 && (
        <p className="mt-4 text-sm text-text-muted">Betting just closed for this session — locking now.</p>
      )}

      {market.state === 1 && (
        <p className="mt-4 text-sm text-text-muted">
          Locked, awaiting resolution — betting reopens automatically once
          the next session starts.
        </p>
      )}

      {hasPosition && (
        <p className="mt-3 text-xs text-text-secondary">
          Your position: <span className="mono text-accent">{formatChips(BigInt(myPosition.up))} UP</span>
          {" · "}
          <span className="mono text-danger">{formatChips(BigInt(myPosition.down))} DOWN</span>
        </p>
      )}

      {market.state === 2 && hasPosition && (
        <p className="mt-3 text-xs text-text-muted">
          Resolved — any winnings were credited to your internal wallet automatically.
        </p>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </div>
  );
}
