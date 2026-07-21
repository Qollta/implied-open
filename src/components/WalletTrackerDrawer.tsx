"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { isAddress, getAddress } from "viem";
import TickerIcon from "./TickerIcon";
import { getWalletActivity, type WalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";
import { STOCK_BY_TICKER } from "@/lib/registry";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const RECENTS_KEY = "rham-recent-wallets";
const MAX_RECENTS = 5;
const MAX_ROWS_SHOWN = 8;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(address: string) {
  try {
    const existing = loadRecents().filter((a) => a.toLowerCase() !== address.toLowerCase());
    const next = [address, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode etc.) — not worth failing over
  }
}

export default function WalletTrackerDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [activity, setActivity] = useState<WalletActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    // localStorage/document.body aren't available during SSR — read/portal
    // only after mount, same pattern as TimeAgo's post-mount correction.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadRecents());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function lookup(raw: string) {
    const trimmed = raw.trim();
    if (!isAddress(trimmed)) {
      setError("Not a valid address.");
      return;
    }
    const checksummed = getAddress(trimmed);
    setError(null);
    setLoading(true);
    setAddress(checksummed);
    getWalletActivity(checksummed)
      .then((data) => {
        setActivity(data);
        saveRecent(checksummed);
        setRecents(loadRecents());
      })
      .catch(() => setError("Couldn't load that wallet right now — try again."))
      .finally(() => setLoading(false));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    lookup(input);
  }

  function reset() {
    setAddress(null);
    setActivity(null);
    setError(null);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        <span className="hidden sm:inline">Wallet Tracker</span>
        <span className="sm:hidden">Wallet</span>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
                open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* Panel */}
            <aside
              className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-bg-secondary shadow-2xl transition-transform duration-300 ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">Wallet Tracker</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <div className="flex items-center overflow-hidden rounded-lg border border-border bg-bg-primary focus-within:border-accent">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                placeholder="0x… any Predict wallet"
                className="mono w-full bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="whitespace-nowrap px-3 py-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Track
              </button>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
          </form>

          {recents.length > 0 && !address && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-text-muted">Recently tracked</p>
              <div className="flex flex-wrap gap-1.5">
                {recents.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => lookup(a)}
                    className="mono rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
                  >
                    {truncateAddress(a)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!address && (
            <p className="mt-6 text-center text-xs text-text-muted">
              Paste any wallet address to see every bet it&apos;s placed on
              Predict — read straight from the chain, no login needed.
            </p>
          )}

          {loading && <p className="mt-6 text-center text-sm text-text-muted">Loading…</p>}

          {address && activity && !loading && (
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <p className="mono truncate text-sm text-text-primary">{truncateAddress(address)}</p>
                <button type="button" onClick={reset} className="shrink-0 text-xs text-text-muted hover:text-accent">
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DrawerStat label="Bets" value={String(activity.bets.length)} />
                <DrawerStat
                  label="Net"
                  value={`${activity.netWei > 0n ? "+" : ""}${formatEth(activity.netWei)}`}
                  tone={
                    activity.netWei > 0n ? "text-accent" : activity.netWei < 0n ? "text-danger" : "text-text-primary"
                  }
                />
                <DrawerStat label="Staked" value={formatEth(activity.stakedWei)} />
                <DrawerStat label="Claimed" value={formatEth(activity.claimedWei)} />
              </div>

              {activity.bets.length === 0 ? (
                <p className="rounded-lg border border-border bg-bg-primary p-4 text-center text-xs text-text-secondary">
                  No bets from this wallet yet.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {activity.bets.slice(0, MAX_ROWS_SHOWN).map((b, i) => {
                    const stock = STOCK_BY_TICKER.get(b.ticker);
                    return (
                      <a
                        key={`${b.txHash}-${i}`}
                        href={`${EXPLORER}/tx/${b.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-bg-hover"
                      >
                        <TickerIcon ticker={b.ticker} icon={stock?.icon ?? null} size={20} />
                        <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{b.ticker}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            b.up ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
                          }`}
                        >
                          {b.up ? "UP" : "DOWN"}
                        </span>
                        <span className="mono shrink-0 text-xs text-text-secondary">{formatEth(b.amount)}</span>
                      </a>
                    );
                  })}
                  <p className="px-2 text-[11px] text-text-muted">
                    {activity.bets.length > MAX_ROWS_SHOWN
                      ? `Showing ${MAX_ROWS_SHOWN} of ${activity.bets.length} — `
                      : ""}
                    market status on the{" "}
                    <Link
                      href={`/predict/wallet/${address}`}
                      onClick={() => setOpen(false)}
                      className="text-accent hover:underline"
                    >
                      full page →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
              </div>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}

function DrawerStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mono mt-0.5 text-sm font-semibold ${tone ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
