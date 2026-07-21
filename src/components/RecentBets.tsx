"use client";

import { useEffect, useState } from "react";
import { getBetsForMarket, type BetLog, type SerializableBet } from "@/lib/predictBets";
import { getPlayBetsForMarket } from "@/lib/playBets";
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

/**
 * Live feed of who bet UP/DOWN on this market and how much — read straight
 * off BetPlaced events (no indexer). `initial` is server-fetched for the
 * first paint; a client poll picks up other users' bets afterward, since
 * there's no event subscription/subgraph yet (see CLAUDE.md §9 open items).
 * `mode` picks GapMarket ("real", the default) or PlayMarket ("play") — a
 * plain string, not a function reference, because this component is used
 * from a Server Component and functions can't cross that boundary as props
 * (unlike bigint, which just needs .toString()/BigInt(), a function prop
 * fails outright — see CLAUDE.md). The actual fetcher/formatter functions
 * are resolved right here, client-side, never passed in from the server.
 */
export default function RecentBets({
  marketId,
  initial,
  mode = "real",
}: {
  marketId: string;
  initial: SerializableBet[];
  mode?: "real" | "play";
}) {
  const fetchBets = mode === "play" ? getPlayBetsForMarket : getBetsForMarket;
  const formatAmount = mode === "play" ? formatChips : formatEth;
  const [bets, setBets] = useState<BetLog[]>(() => initial.map(fromSerializable));

  useEffect(() => {
    let cancelled = false;
    const id = BigInt(marketId);

    const poll = () => {
      fetchBets(id)
        .then((fresh) => {
          if (!cancelled) setBets(fresh);
        })
        .catch(() => {});
    };

    const interval = setInterval(poll, POLL_SECONDS * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [marketId, fetchBets]);

  if (bets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-center text-sm text-text-secondary">
        No bets on this market yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
        Recent bets ({bets.length})
      </p>
      <div className="flex flex-col gap-2">
        {bets.map((b, i) => (
          <a
            key={`${b.txHash}-${i}`}
            href={`${EXPLORER}/tx/${b.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-bg-hover"
          >
            <span className="mono text-text-secondary">{truncateAddress(b.user)}</span>
            <span className="mono text-text-primary">{formatAmount(b.amount)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                b.up ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
              }`}
            >
              {b.up ? "UP" : "DOWN"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
