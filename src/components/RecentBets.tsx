"use client";

import { useEffect, useState } from "react";
import { getBetsForMarket, type BetLog, type SerializableBet } from "@/lib/predictBets";
import { formatChips, formatEth, truncateAddress } from "@/lib/predictFormat";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const POLL_SECONDS = 15;

function fromSerializable(b: SerializableBet): BetLog {
  return {
    marketId: BigInt(b.marketId),
    user: b.user,
    up: b.up,
    amount: BigInt(b.amount),
    blockNumber: BigInt(b.blockNumber),
    txHash: b.txHash,
  };
}

/** Plain-serializable shape of an off-chain fETH bet — see offchainWallet.ts's BetView. */
export interface FPlayBetView {
  address: string;
  up: boolean;
  amount: string;
  at: number;
}

interface DisplayBet {
  key: string;
  user: string;
  amount: bigint;
  up: boolean;
  href?: string;
}

/**
 * Live feed of who bet UP/DOWN on this market. `mode="real"` reads GapMarket's
 * BetPlaced events straight off the RPC (no indexer), keyed by `marketId`.
 * `mode="play"` polls the off-chain fETH API by `ticker` instead — there's no
 * on-chain event to read since fETH bets never touch a contract, see
 * lib/offchainWallet.ts. Both poll every 15s since neither has a push
 * subscription yet.
 */
export default function RecentBets({
  marketId,
  ticker,
  initial,
  initialFPlayBets,
  mode = "real",
}: {
  marketId?: string;
  ticker?: string;
  initial?: SerializableBet[];
  initialFPlayBets?: FPlayBetView[];
  mode?: "real" | "play";
}) {
  const [realBets, setRealBets] = useState<BetLog[]>(() => (initial ?? []).map(fromSerializable));
  const [playBets, setPlayBets] = useState<FPlayBetView[]>(initialFPlayBets ?? []);

  useEffect(() => {
    if (mode !== "real" || !marketId) return;
    let cancelled = false;
    const id = BigInt(marketId);
    const poll = () => {
      getBetsForMarket(id)
        .then((fresh) => {
          if (!cancelled) setRealBets(fresh);
        })
        .catch(() => {});
    };
    const interval = setInterval(poll, POLL_SECONDS * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mode, marketId]);

  useEffect(() => {
    if (mode !== "play" || !ticker) return;
    let cancelled = false;
    const poll = () => {
      fetch(`/api/fplay/${ticker}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setPlayBets(data.bets ?? []);
        })
        .catch(() => {});
    };
    const interval = setInterval(poll, POLL_SECONDS * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mode, ticker]);

  const displayBets: DisplayBet[] =
    mode === "play"
      ? playBets.map((b, i) => ({ key: `${b.address}-${b.at}-${i}`, user: b.address, amount: BigInt(b.amount), up: b.up }))
      : realBets.map((b, i) => ({
          key: `${b.txHash}-${i}`,
          user: b.user,
          amount: b.amount,
          up: b.up,
          href: `${EXPLORER}/tx/${b.txHash}`,
        }));

  const formatAmount = mode === "play" ? formatChips : formatEth;

  if (displayBets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-center text-sm text-text-secondary">
        No bets on this market yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">Recent bets ({displayBets.length})</p>
      <div className="flex flex-col gap-2">
        {displayBets.map((b) => {
          const row = (
            <>
              <span className="mono text-text-secondary">{truncateAddress(b.user)}</span>
              <span className="mono text-text-primary">{formatAmount(b.amount)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  b.up ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
                }`}
              >
                {b.up ? "UP" : "DOWN"}
              </span>
            </>
          );
          return b.href ? (
            <a
              key={b.key}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-bg-hover"
            >
              {row}
            </a>
          ) : (
            <div key={b.key} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
