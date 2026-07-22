"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { GAP_MARKET_ADDRESS } from "@/lib/predictContracts";
import { GAPMARKET_ABI } from "@/lib/predictAbi";
import {
  formatCountdown,
  formatEth,
  formatFeedPrice,
  formatSessionWindow,
  isWeekendGapMarket,
} from "@/lib/predictFormat";

const STATE_LABEL = ["Open for bets", "Locked — awaiting resolution", "Resolved"] as const;
const STATE_DOT = ["bg-accent", "bg-warning", "bg-text-muted"] as const;
const OUTCOME_LABEL = ["", "UP", "DOWN", "PUSH"] as const;
const OUTCOME_TONE = ["", "text-accent", "text-danger", "text-text-secondary"] as const;

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Plain-serializable mirror of the on-chain Market struct — bigints as strings, since bigint can't cross the Server→Client Component prop boundary (silently fails to serialize). Produced by predictMarkets.ts. */
export interface InitialMarket {
  locksAt: number;
  resolvesAt: number;
  startPrice: string;
  endPrice: string;
  upPool: string;
  downPool: string;
  state: number;
  outcome: number;
}

interface MarketData {
  locksAt: number;
  resolvesAt: number;
  startPrice: bigint;
  endPrice: bigint;
  upPool: bigint;
  downPool: bigint;
  state: number;
  outcome: number;
}

function fromInitial(m: InitialMarket): MarketData {
  return {
    locksAt: m.locksAt,
    resolvesAt: m.resolvesAt,
    startPrice: BigInt(m.startPrice),
    endPrice: BigInt(m.endPrice),
    upPool: BigInt(m.upPool),
    downPool: BigInt(m.downPool),
    state: m.state,
    outcome: m.outcome,
  };
}

/**
 * `id` is a string, not bigint, for the same cross-boundary reason as `initial`.
 * `initial` (server-fetched) renders immediately; the wagmi read then takes
 * over once it resolves, so the market stays live without a loading flash.
 */
export default function PredictMarketCard({
  id: idStr,
  initial,
}: {
  id: string;
  initial?: InitialMarket;
}) {
  const id = BigInt(idStr);
  const now = useNow();
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("0.01");

  const { data: liveMarket, refetch: refetchMarket } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "markets",
    args: [id],
  });

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "claimableOf",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: myUp, refetch: refetchUp } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "upBets",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: myDown, refetch: refetchDown } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "downBets",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    refetchMarket();
    refetchClaimable();
    refetchUp();
    refetchDown();
  }, [isConfirmed, refetchMarket, refetchClaimable, refetchUp, refetchDown]);

  const market: MarketData | undefined = liveMarket
    ? {
        locksAt: Number(liveMarket[2]),
        resolvesAt: Number(liveMarket[3]),
        startPrice: liveMarket[4],
        endPrice: liveMarket[5],
        upPool: liveMarket[6],
        downPool: liveMarket[7],
        state: liveMarket[8],
        outcome: liveMarket[9],
      }
    : initial
      ? fromInitial(initial)
      : undefined;

  if (!market) return null;

  const { locksAt, resolvesAt, startPrice, endPrice, upPool, downPool, state, outcome } = market;
  const busy = isPending || isConfirming;

  const canBet = state === 0 && now < Number(locksAt);
  const canLock = state === 0 && now >= Number(locksAt);
  const canResolve = state === 1 && now >= Number(resolvesAt);
  const isResolved = state === 2;

  const totalPool = upPool + downPool;
  const upShare = totalPool > 0n ? Number((upPool * 10000n) / totalPool) / 100 : 50;
  const isWeekend = isWeekendGapMarket(locksAt, resolvesAt);

  function bet(up: boolean) {
    writeContract({
      address: GAP_MARKET_ADDRESS,
      abi: GAPMARKET_ABI,
      functionName: "placeBet",
      args: [id, up],
      value: parseEther(amount || "0"),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isWeekend ? "bg-accent/15 text-accent" : "border border-border text-text-secondary"
            }`}
          >
            {isWeekend ? "🌙 Weekend gap" : "Trading session"}
          </span>
          <p className="mono text-sm text-text-secondary">{formatSessionWindow(Number(locksAt), Number(resolvesAt))}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-secondary">
          <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state]}
        </span>
      </div>

      {/* Pool split bar */}
      <div className="mt-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-bg-primary">
          <div className="h-full bg-accent" style={{ width: `${upShare}%` }} />
          <div className="h-full bg-danger" style={{ width: `${100 - upShare}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="mono text-accent">{formatEth(upPool)} UP</span>
          <span className="mono text-danger">{formatEth(downPool)} DOWN</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {state === 0 ? "Locks in" : "Locked at"}
          </p>
          <p className="mono text-text-primary">
            {state === 0 ? formatCountdown(Number(locksAt), now) : formatFeedPrice(startPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {state < 2 ? "Resolves in" : "Outcome"}
          </p>
          <p className={`mono ${isResolved ? OUTCOME_TONE[outcome] : "text-text-primary"}`}>
            {state < 2 ? formatCountdown(Number(resolvesAt), now) : `${OUTCOME_LABEL[outcome]} (${formatFeedPrice(endPrice)})`}
          </p>
        </div>
      </div>

      {!isConnected && (
        <p className="mt-4 text-sm text-text-muted">Connect a wallet above to bet or claim.</p>
      )}

      {isConnected && canBet && (
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
            <span className="px-3 text-xs text-text-muted">ETH</span>
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

      {isConnected && (Boolean(myUp) || Boolean(myDown)) && (
        <p className="mt-3 text-xs text-text-secondary">
          Your position: <span className="mono text-accent">{formatEth(myUp ?? 0n)} UP</span>
          {" · "}
          <span className="mono text-danger">{formatEth(myDown ?? 0n)} DOWN</span>
        </p>
      )}

      {canLock && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "lockMarket", args: [id] })
          }
          className="mt-4 rounded-lg border border-accent px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          Lock market (reads start price)
        </button>
      )}

      {canResolve && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "resolveMarket", args: [id] })
          }
          className="mt-4 rounded-lg border border-accent px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          Resolve market (reads end price)
        </button>
      )}

      {isResolved && isConnected && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={busy || !claimable}
            onClick={() =>
              writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "claim", args: [id] })
            }
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {claimable ? `Claim ${formatEth(claimable)}` : "Nothing to claim"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error.message.split("\n")[0]}</p>}
    </div>
  );
}
