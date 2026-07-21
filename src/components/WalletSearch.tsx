"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";

export default function WalletSearch({ basePath = "/predict/wallet" }: { basePath?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isAddress(trimmed)) {
      setError(true);
      return;
    }
    setError(false);
    router.push(`${basePath}/${trimmed}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center overflow-hidden rounded-lg border border-border bg-bg-primary focus-within:border-accent">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Look up a wallet (0x…)"
          className="mono w-56 bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="whitespace-nowrap px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          View →
        </button>
      </div>
      {error && <p className="text-xs text-danger">Not a valid address.</p>}
    </form>
  );
}
