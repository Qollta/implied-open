import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, getAddress } from "viem";
import BetHistoryTable from "@/components/BetHistoryTable";
import { getWalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";

export const revalidate = 30;

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${truncateAddress(address)} — Predict — Implied Open` };
}

export default async function WalletPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw);

  const activity = await getWalletActivity(address).catch(() => null);
  if (!activity) notFound();

  const { bets, stakedWei, claimedWei, netWei } = activity;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/predict/leaderboard" className="text-xs text-text-muted hover:text-accent">
        ← Leaderboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Wallet</p>
          <h1 className="mono text-lg font-bold tracking-tight sm:text-xl">{address}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portfolio/${address}`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            View portfolio →
          </Link>
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            View on Blockscout ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Bets placed" value={String(bets.length)} />
        <Stat label="Staked" value={formatEth(stakedWei)} />
        <Stat label="Claimed" value={formatEth(claimedWei)} />
        <Stat
          label="Net"
          value={`${netWei > 0n ? "+" : ""}${formatEth(netWei)}`}
          tone={netWei > 0n ? "text-accent" : netWei < 0n ? "text-danger" : "text-text-primary"}
        />
      </div>

      <BetHistoryTable bets={bets} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mono mt-1 text-lg font-semibold ${tone ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
