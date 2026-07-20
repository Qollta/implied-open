"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { robinhoodTestnet } from "@/lib/chains";

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Wallet picker. wagmi auto-discovers one connector per installed EIP-6963
 * wallet (MetaMask, Rabby, Phantom, ...) — the generic "injected" fallback
 * just points at window.ethereum, which whichever wallet wrote there last
 * "wins" (e.g. Phantom silently taking over a MetaMask+Rabby setup). With
 * more than one real wallet detected, hide that fallback and show a picker
 * instead so the user connects the one they actually want.
 */
export default function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isConnected) {
    const specific = connectors.filter((c) => c.id !== "injected");
    const options = specific.length > 0 ? specific : connectors;

    if (options.length === 0) {
      return (
        <button
          type="button"
          disabled
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black opacity-50"
        >
          No wallet found
        </button>
      );
    }

    if (options.length === 1) {
      return (
        <button
          type="button"
          onClick={() => connect({ connector: options[0] })}
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>
      );
    }

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-bg-secondary shadow-lg">
              {options.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    connect({ connector: c });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-hover"
                >
                  {c.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="h-5 w-5 rounded" />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (chainId !== robinhoodTestnet.id) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
        disabled={isSwitching}
        className="rounded-lg bg-warning px-4 py-1.5 text-sm font-medium text-black transition-colors disabled:opacity-50"
      >
        {isSwitching ? "Switching…" : "Switch to testnet"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      className="mono rounded-lg border border-border bg-bg-secondary px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent"
    >
      {truncate(address!)}
    </button>
  );
}
