"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { PLAY_MARKET_ADDRESS } from "@/lib/predictContracts";
import { PLAYMARKET_ABI } from "@/lib/predictAbi";
import { formatChips } from "@/lib/predictFormat";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

function formatTimeLeft(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/** Claims this week's free 0.1-ETH-equivalent chip allowance on PlayMarket — resets (not adds) each week, see CLAUDE.md. */
export default function ClaimChipsButton() {
  const { address, isConnected } = useAccount();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: chipBalance, refetch: refetchBalance } = useReadContract({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
    functionName: "chipBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: lastClaimedWeek, refetch: refetchLastClaimed } = useReadContract({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
    functionName: "lastClaimedWeek",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    refetchBalance();
    refetchLastClaimed();
  }, [isConfirmed, refetchBalance, refetchLastClaimed]);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
        Connect a wallet to claim this week&apos;s free chips.
      </div>
    );
  }

  const currentWeek = Math.floor(now / WEEK_SECONDS);
  const claimedThisWeek = lastClaimedWeek !== undefined && Number(lastClaimedWeek) === currentWeek;
  const nextReset = (currentWeek + 1) * WEEK_SECONDS;
  const busy = isPending || isConfirming;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">Your chips this week</p>
        <p className="mono mt-1 text-lg font-semibold text-text-primary">{formatChips(chipBalance ?? 0n)}</p>
      </div>
      {claimedThisWeek ? (
        <div className="text-right text-xs text-text-muted">
          <p>Already claimed this week</p>
          <p>Resets in {formatTimeLeft(nextReset - now)}</p>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            writeContract({
              address: PLAY_MARKET_ADDRESS,
              abi: PLAYMARKET_ABI,
              functionName: "claimWeeklyChips",
            })
          }
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Claiming…" : "Claim 0.1 chips"}
        </button>
      )}
      {error && <p className="w-full text-xs text-danger">{error.message.split("\n")[0]}</p>}
    </div>
  );
}
