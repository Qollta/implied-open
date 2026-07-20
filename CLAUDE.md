@AGENTS.md

# Implied Open — 24/7 stock-token premium tracker for Robinhood Chain

A dashboard that tracks the live premium or discount between Robinhood's
tokenized stocks (trading 24/7 on Robinhood Chain DEXes) and their official,
market-hours-only closing price (Chainlink). This file is the single source
of truth for a fresh Claude session — read it first, then dive into the code.

---

## 1. The idea

Robinhood Chain is the first chain with **liquid, 24/7-tradable tokenized
stocks** (NVDA, AAPL, TSLA, …) issued by a real broker (Robinhood itself).
The real exchange (NYSE/NASDAQ) is closed nights and weekends, but the token
keeps trading on-chain the whole time. The gap between the two prices is
genuinely new information that didn't exist before this chain:

> **premium % = (live DEX token price − frozen official close) / official close**

A positive premium while the market is closed is the on-chain crowd betting
the stock opens higher on Monday; negative is a bet it opens lower. This is
the entire product — one dashboard, one number per stock, refreshed live.

This was chosen deliberately *because* it's the one thing genuinely unique to
Robinhood Chain — not a clone of a Solana/BSC/Base pattern. See the sibling
project `X:\explorer` (RH Explorer, a Solscan-style block explorer) for
context on the other project; this one is unrelated code but shares the
Robinhood Chain data sources and some conventions.

**Audience:** gap traders, arbitrageurs, and Robinhood's own retail trader
base (who already think in terms of "where does my stock open Monday").
**Growth mechanic:** shareable "the market already priced in the weekend"
cards for X/Twitter — built, see §4 (`opengraph-image.tsx`, `ShareButton`).

## 2. Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (config-less; theme tokens in `src/app/globals.css` via
  `@theme`). Dark theme, Robinhood-green accent (`#00c805`) — deliberately
  visually distinct from RH Explorer's dark-green-different-hue palette so
  the two aren't mistaken for the same product.
- No database, no smart contracts, no wallet. Server components read live
  chain/API data on each request, ISR (`revalidate = 30`) throttles it. The
  one exception is premium history: a GitHub Actions cron commits JSONL
  snapshots straight to the repo (see §3 "Premium history") — deliberately
  not a real database, see §5.

> ⚠️ Per `AGENTS.md`, this Next.js has breaking changes vs. training data.
> Check `node_modules/next/dist/docs/` before using an unfamiliar API.

## 3. Data sources (all read-only, no auth)

Two independent numbers per stock, joined by ticker:

### Official price — Chainlink on Robinhood Chain
- RPC: `https://rpc.mainnet.chain.robinhood.com`
  - **Blocks requests with a plain Python/urllib user-agent (403).** curl and
    `fetch()` (browser or Node) work fine. If a script mysteriously 403s,
    this is why.
- Feed addresses come from Chainlink's own reference-data directory:
  `https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json`
  (there is no `/robinhood` or `/robinhoodchain` slug — it's specifically
  `robinhood-mainnet`). Stock feed names follow the pattern
  `"Robinhood TICKER / USD"` or `"Robinhood TICKER-USD"`.
- Read via `AggregatorV3Interface.latestRoundData()`
  (selector `0xfeaf968c`), decoded manually in `src/lib/chain.ts` (no
  ethers/viem dependency — one selector, not worth the package). Answer is
  8 decimals; `updatedAt` (3rd return value) is what's "frozen" outside
  market hours — that's the timestamp shown as "close updated Xh ago".
- Batched as a single JSON-RPC array (`[{...id:0}, {...id:1}, ...]`) in one
  POST — 34 feeds in one round trip instead of 34.

### Live token price — Blockscout (same API family as RH Explorer)
- `https://robinhoodchain.blockscout.com/api/v2/tokens?q=Robinhood%20Token`
  (paginated). `exchange_rate` on each item is the token's current DEX price.
- **Official tokens only match name `"<Company> • Robinhood Token"`** — the
  chain has dozens of scam clones with names like `"NVIDIA"` or symbol
  `NVDA1000X` that must NOT be trusted. Always filter on the exact
  `" • Robinhood Token"` suffix (see `src/lib/prices.ts` and
  `scripts/gen-registry.mjs`).
- `volume_24h` from the same response is used as a liquidity gate — see §5.

### Premium history (GitHub Actions + committed JSONL)
No DB, no Vercel KV — `.github/workflows/snapshot-premiums.yml` runs every 15
minutes and appends one line to `data/premium-history/<UTC-date>.jsonl`
(one file per day), then commits and pushes. `scripts/snapshot-premiums.mjs`
does the fetching — it **duplicates** the fetch logic in `lib/chain.ts` /
`lib/prices.ts` rather than importing them (plain Node script, no Next
runtime, and those `.ts` files use Next-only `fetch(..., { next: {...} })`
options this script doesn't need). It reads the stock list from
`src/lib/registry.json`, a plain-data mirror `gen-registry.mjs` now writes
alongside `registry.ts` for exactly this reason — **both are regenerated
together, don't hand-edit either.** Old snapshot files (>60 days) are pruned
by the workflow itself before each commit. `src/lib/history.ts` reads these
files back with `node:fs` at request time on the stock detail page — see §5
for the Vercel deployment gotcha this implies.
**This only runs once the repo has a GitHub remote** (see §9) — the workflow
is written and tested locally but not yet live.

### The registry (curated + generated)
`src/lib/registry.ts` is **auto-generated**, not hand-written:
```bash
node scripts/gen-registry.mjs src/lib/registry.ts
```
It cross-references the Blockscout official-token list with the Chainlink
feed list by ticker and keeps only tickers present in **both** (currently
34 of ~180 "official" tokens Blockscout lists — most listed stocks don't
have a Chainlink feed yet, e.g. QCOM, LLY, AVGO, NFLX and the whole `wTICKER`
wrapped-token family are skipped). Re-run this whenever Robinhood lists a new
stock token or ships a new feed. **Do not hand-edit `registry.ts`.**

## 4. Project structure

```
src/
  app/
    page.tsx                   Dashboard: stat tiles + premium table
    opengraph-image.tsx        Dashboard share card (next/og, ImageResponse)
    loading.tsx                Skeleton (Blockscout/RPC calls take a few sec)
    stock/[ticker]/page.tsx    Per-stock detail (big premium, both prices,
                                contract/feed links to Blockscout, history chart)
    stock/[ticker]/opengraph-image.tsx   Per-stock share card
    stock/[ticker]/loading.tsx
    layout.tsx, globals.css    Dark theme, header/footer
  components/
    PremiumTable.tsx           Client component, sortable (premium/volume/price)
    PremiumBadge.tsx           Colored +/-% pill, `size="sm"|"lg"`
    PremiumHistoryChart.tsx    Hand-built SVG line chart w/ hover, client component
    ShareButton.tsx            Opens a prefilled X/Twitter intent window
    TickerIcon.tsx             Robinhood CDN logo w/ fallback badge on error
    AutoRefresh.tsx            router.refresh() every N seconds (client)
  lib/
    registry.ts                AUTO-GENERATED — see §3, don't hand-edit
    registry.json               AUTO-GENERATED plain-data mirror of registry.ts,
                                for scripts/snapshot-premiums.mjs — don't hand-edit
    chain.ts                   Batched Chainlink latestRoundData() over RPC
    prices.ts                  Blockscout token quotes (DEX price + volume)
    market.ts                  NYSE session status (America/New_York, DST-aware)
    premium.ts                 Joins the two price sources into StockPremium[]
                                + liquidity filter (LIQUIDITY_FLOOR_USD);
                                getPremiums() is wrapped in React `cache()`
    history.ts                 Reads data/premium-history/*.jsonl via node:fs
    format.ts                  formatUsd, formatPct, formatCompactUsd, timeAgo
scripts/
  gen-registry.mjs             Regenerates src/lib/registry.{ts,json} from live APIs
  snapshot-premiums.mjs        Appends one premium snapshot line to
                                data/premium-history/<date>.jsonl — run by CI
.github/workflows/
  snapshot-premiums.yml        Cron (every 15 min): runs the script above, prunes
                                snapshots >60 days old, commits + pushes
data/premium-history/
  <YYYY-MM-DD>.jsonl           One JSON object per line per snapshot run
```

## 5. Key decisions worth knowing

- **Liquidity filter is load-bearing.** Early testing found tokens with
  <$1,000 24h volume produce nonsense premiums from one stale trade — e.g.
  COIN showed **+457%** off a single old print. `LIQUIDITY_FLOOR_USD = 1000`
  in `lib/premium.ts` splits rows into `liquid` (shown in the main table,
  counted in the average-premium stat) and everything else (collapsed into a
  `<details>` "low-liquidity" section on the dashboard, with a warning banner
  on the stock detail page). **Don't remove this filter** — it's the
  difference between the product being credible and being obviously broken
  on the first busy weekend.
- **No wallet, no write transactions, no smart contracts anywhere.** This is
  intentionally a read-only info product — keeps it cheap to build and with
  zero custody/security surface. Don't add wallet-connect unless a future
  feature genuinely needs a signed tx.
- **ISR (`revalidate = 30`), not client polling, for the initial page load** —
  `AutoRefresh` (client) then calls `router.refresh()` every 45s to keep it
  live after that. This matches Next 16's fetch-is-uncached-by-default model
  (same gotcha as RH Explorer, see below).
- Dark theme uses its own token names (`--bg-primary`, `--text-accent`, etc.)
  — **not** the same CSS variable names as RH Explorer's `globals.css**,
  and a different accent hue, so the two projects' styling can't be
  copy-pasted 1:1 without renaming.
- **Premium history storage: committed JSONL via GitHub Actions, not
  Vercel KV/Postgres.** Chosen because the project wasn't deployed yet (no
  Vercel project existed) and this needs zero new accounts/infra — a cron
  workflow in a repo that doesn't exist yet can't run either, so this was the
  cheaper way to start. Revisit if snapshot volume ever makes the repo
  unwieldy (60-day retention + daily files should stay small for a while).
- **`getPremiums()` is wrapped in `React.cache()`.** Both `generateMetadata`
  and the page component call it for `stock/[ticker]/page.tsx`; without the
  wrapper each one independently re-hits the Chainlink RPC (which has no
  retry/backoff — see §7), doubling load per pageview.
- **`next.config.ts` sets `outputFileTracingIncludes` for `/stock/*`.**
  `history.ts` reads `data/premium-history/*.jsonl` with `node:fs` at
  request time; Next's build-time file tracing only follows static
  `import`/`require`, so without this the folder would silently be missing
  from the Vercel serverless bundle (empty history, no error).

## 6. Commands

```bash
npm run dev     # dev server on :3000 (or --port 3100, see .claude/launch.json)
npm run build   # production build (also type-checks — this is the gate)
npm run lint    # eslint
npm start       # serve the production build
node scripts/gen-registry.mjs src/lib/registry.ts   # refresh the stock list
```

Always run `npm run lint` and `npm run build` before committing.

## 7. Environment / gotchas

- **Next.js 16 `fetch` is uncached by default** (breaking change vs. older
  Next / vs. training data) — must opt in with `next: { revalidate: N }`.
  `lib/prices.ts` does this (`revalidate: 30`); `lib/chain.ts` uses a plain
  POST (RPC calls aren't cacheable by URL anyway — page-level `revalidate`
  in `page.tsx` is what throttles those).
- **TypeScript target had to be bumped to ES2020** in `tsconfig.json` —
  create-next-app's default `ES2017` fails the build on BigInt literals
  (`0n`), which `lib/chain.ts` needs to decode Chainlink's `int256` answer.
- **RPC 403s on Python/urllib user-agent** — see §3. Not an auth issue, just
  a UA block; curl/fetch are fine.
- **The Chainlink RPC has no retry/backoff anywhere** (`chain.ts` and
  `scripts/snapshot-premiums.mjs` both just throw on a non-200) and it does
  rate-limit under bursty traffic (seen during dev testing: repeated
  page-loads within a minute triggered 429s). The stock page and
  `opengraph-image` routes both `.catch(() => [])`/degrade gracefully; a
  failed CI snapshot just skips that run (the workflow doesn't retry either).
- This project lives **outside** `X:\explorer`'s directory tree
  (`X:\new proj\implied-open`), so Claude Code's `preview_start` with a
  `cwd` in `.claude/launch.json` doesn't work here (cwd must be inside the
  project root that Claude Code was launched from) — start the dev server
  manually via a background Bash command instead:
  `npm run dev -- --port 3100`.
- Windows dev box; primary shell is PowerShell, Bash also available (same as
  RH Explorer).
- No remote git repo yet — local commits only so far (`git log`: "Initial
  commit from Create Next App" → "Implied Open MVP: ...").

## 8. Roadmap / discussed next steps

Done:
- ~~Shareable cards for X/Twitter~~ — `opengraph-image.tsx` (dashboard +
  per-stock) and `ShareButton`. Live once deployed; works today via any
  `og:image`-aware unfurler even pre-deploy (localhost during dev).
- ~~Premium history / charts~~ — snapshot pipeline (§3) + `PremiumHistoryChart`
  on the stock page. **Blocked on §9**: the workflow needs a GitHub remote to
  actually run on a schedule; until then history only accumulates from manual
  `node scripts/snapshot-premiums.mjs` runs.

Not yet built, ordered by logical next priority:

1. **Gap-prediction accuracy stat** — now that history exists: "the premium
   correctly predicted the direction of the next open in X% of cases over
   the last N weekends." Needs a few weeks of real snapshots to be
   meaningful, not just code. Strong, concrete marketing claim if the number
   is good.
2. **Telegram alerts** ("premium on TSLA crossed 3%") — needs a persistent
   worker/poller; the GitHub Actions cron (§3) could plausibly double as
   this instead of standing up a separate always-on process.
3. **Deploy** — Vercel (straightforward, no env secrets needed yet since
   everything hits public APIs) + register a domain + push this repo to
   GitHub (no remote configured yet — also unblocks #Done-item 2 above).

## 9. Repository & collaboration

- Local git repo only, no remote configured yet.
- No collaborators yet (solo project so far, unlike RH Explorer which is
  shared with `bnbhacker`).
- When a remote is added, prefer small frequent commits, same conventions as
  RH Explorer's workflow if this becomes a shared repo too.
