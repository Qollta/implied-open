"use client";

import { useState, type ReactNode } from "react";

/**
 * Switches between the real-money (GapMarket) and fETH (off-chain) sections
 * of a ticker's Predict page. Both sections are pre-rendered by the server
 * (data-fetched there) and just passed in as children — this component only
 * toggles which one is visible, no data of its own. Defaults to fETH: it
 * needs no wallet, so it's the tab most first-time visitors can actually use
 * — defaulting to "real" buried the no-wallet-needed option behind an extra
 * click that people were missing entirely.
 */
export default function RealPlayTabs({ real, play }: { real: ReactNode; play: ReactNode }) {
  const [tab, setTab] = useState<"real" | "play">("play");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab("real")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            tab === "real" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          💰 Real money
        </button>
        <button
          type="button"
          onClick={() => setTab("play")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            tab === "play" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          🎮 fETH
        </button>
      </div>

      {/* Unmounted, not just hidden, when inactive — the wagmi hooks inside
          each tab (polling reads, RecentBets' interval) shouldn't run for a
          tab nobody's looking at. */}
      {tab === "real" && <div className="flex flex-col gap-6">{real}</div>}
      {tab === "play" && <div className="flex flex-col gap-6">{play}</div>}
    </div>
  );
}
