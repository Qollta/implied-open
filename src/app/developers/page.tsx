import type { Metadata } from "next";
import EmbedSnippet from "@/components/EmbedSnippet";

export const metadata: Metadata = {
  title: "Developers — API docs — Implied Open",
  description:
    "Free, unauthenticated JSON API and embeddable widgets for Robinhood Chain tokenized-stock premium data.",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

export default function DevelopersPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developers</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Every number on this site comes from two public endpoints below —
          no API key, no auth, open CORS (<code className="mono">Access-Control-Allow-Origin: *</code>),
          refreshed every 30s. Use it to build your own dashboard, bot, or
          alert, or just embed a live widget with the snippet at the bottom.
        </p>
      </div>

      <Endpoint
        method="GET"
        path="/api/premium"
        description="Every tracked ticker's live premium in one call — this is exactly what powers the homepage table."
        example={`curl ${SITE_URL}/api/premium`}
        response={`{
  "updatedAt": 1753142400,
  "stocks": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA",
      "tokenPrice": 213.96,
      "official": 207.04,
      "officialUpdatedAt": 1753056000,
      "premiumPct": 3.34,
      "volume24h": 3589862.74,
      "liquid": true
    },
    ...
  ]
}`}
      />

      <Endpoint
        method="GET"
        path="/api/premium/{ticker}"
        description={`Same shape as above, scoped to one ticker. Returns 404 with { "error": ... } if the ticker isn't tracked or has no live price right now.`}
        example={`curl ${SITE_URL}/api/premium/NVDA`}
        response={`{
  "ticker": "NVDA",
  "name": "NVIDIA",
  "tokenPrice": 213.96,
  "official": 207.04,
  "officialUpdatedAt": 1753056000,
  "premiumPct": 3.34,
  "volume24h": 3589862.74,
  "liquid": true,
  "updatedAt": 1753142400
}`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Field reference</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Field</th>
                <th className="px-4 py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["tokenPrice", "Live DEX price the token trades at on Robinhood Chain, USD."],
                ["official", "Frozen Chainlink close — only updates during NYSE hours."],
                ["officialUpdatedAt", "Unix seconds the Chainlink feed last updated."],
                ["premiumPct", "(tokenPrice − official) / official × 100."],
                ["volume24h", "24h onchain volume, USD, or null if Blockscout doesn't know it."],
                ["liquid", "false below $1,000 24h volume — the DEX price may be a stale single print, treat premiumPct as unreliable."],
              ].map(([field, meaning]) => (
                <tr key={field} className="border-b border-border last:border-0">
                  <td className="mono px-4 py-2 text-text-primary">{field}</td>
                  <td className="px-4 py-2">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Embeddable widget</h2>
        <p className="text-sm text-text-secondary">
          <code className="mono">/embed/{"{ticker}"}</code> is a bare, iframe-able
          HTML card (no JS required on your end) — same data, refreshed every
          30s client-side. Try it for any of the 34 tracked tickers:
        </p>
        <EmbedSnippet ticker="NVDA" />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-4 text-xs text-text-muted">
        <p>No rate limit is enforced today — be a reasonable citizen (this proxies a public Blockscout/Chainlink pipeline underneath).</p>
        <p>Found a bug or want a field added? There&apos;s no issue tracker yet — reach out however you found this site.</p>
      </section>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  example,
  response,
}: {
  method: string;
  path: string;
  description: string;
  example: string;
  response: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">{method}</span>
        <code className="mono text-sm text-text-primary">{path}</code>
      </div>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-text-muted">Request</p>
        <code className="mono block overflow-x-auto whitespace-pre rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-secondary">
          {example}
        </code>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-text-muted">Response</p>
        <code className="mono block overflow-x-auto whitespace-pre rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-secondary">
          {response}
        </code>
      </div>
    </section>
  );
}
