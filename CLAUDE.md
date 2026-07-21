@AGENTS.md

# RHAM (RobinHood Assets Market) — formerly "Implied Open"

The site's brand is **RHAM** (header, page title, homepage). "Implied Open"
is kept as the name of the read-only premium-tracking feature specifically
(§1) — think product name within the platform, not a separate site. The
prediction market (§9) is the platform's other half, under "Predict".
Package/directory names, most internal comments, and OG image copy still say
"Implied Open" in places — that's fine, not worth a mechanical rename; treat
"RHAM" as the current source of truth for anything user-facing (header,
`<title>`, homepage copy) and "Implied Open" as accurate everywhere else
unless you're touching that code anyway.

RHAM tracks *and* lets you bet on the live premium or discount between
Robinhood's tokenized stocks (trading 24/7 on Robinhood Chain DEXes) and
their official, market-hours-only closing price (Chainlink). This file is
the single source of truth for a fresh Claude session — read it first, then
dive into the code.

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

The homepage (`src/app/page.tsx`) now states this explicitly to visitors —
a hero explaining the RWA/24-7-vs-market-hours gap, followed by a two-card
"01 · Watch it" (this dashboard) / "02 · Bet on it" (links to `/predict`)
split. If you're rewriting homepage copy, keep that framing — it's the
elevator pitch for the whole platform, not just this page.

## 2. Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (config-less; theme tokens in `src/app/globals.css` via
  `@theme`). Dark theme, Robinhood-green accent (`#00c805`) — deliberately
  visually distinct from RH Explorer's dark-green-different-hue palette so
  the two aren't mistaken for the same product. Background tokens
  (`--bg-primary`, `--bg-secondary`, `--bg-hover`, `--border`) are
  deliberately green-black, not neutral gray, and `body` has a subtle
  fixed radial green glow behind the top of every page — a later pass to
  make the green identity read as more than just the accent color.
- The core premium tracker (everything except `/predict`) is still
  read-only: no database, no smart contracts, no wallet. Server components
  read live chain/API data on each request, ISR (`revalidate = 30`)
  throttles it. The one exception is premium history: a GitHub Actions cron
  commits JSONL snapshots straight to the repo (see §3 "Premium history") —
  deliberately not a real database, see §5.
- `/predict` (§9) is the one part of the site that breaks this: it's a
  wallet-connected, smart-contract-backed prediction market, added later and
  scoped to its own route so the rest of the site stays wallet-free.

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
The repo now has a GitHub remote (§10), so this workflow can actually run —
confirm it's registered and firing on schedule rather than assuming.

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
                                contract/feed links to Blockscout, history chart).
                                Shows a "Predict →" button to /predict/[ticker]
                                iff the ticker is in PREDICTABLE_TICKERS — see §9
    stock/[ticker]/opengraph-image.tsx   Per-stock share card
    stock/[ticker]/loading.tsx
    heatmap/page.tsx             Ticker × day premium heatmap — §5 "Heatmap"
    api/premium/route.ts          Public JSON, all tickers, open CORS — §3
    api/premium/[ticker]/route.ts  Public JSON, one ticker, open CORS — §3
    embed/[ticker]/route.ts        Bare iframe-able HTML card, Route Handler
                                (no root layout) — §3 "Embeddable widget"
    predict/page.tsx            Ticker index (server-rendered, no wallet):
                                site-wide stat tiles, one rich card per
                                ticker (premium badge + sparkline + pool bar,
                                not just a bare link), PoolDominanceBars — §9
    predict/[ticker]/page.tsx    One ticker's markets + bet UI + ConnectWallet
                                + RecentBets for the latest market, plus a
                                stat row and PremiumHistoryChart /
                                ImpliedProbabilityChart side by side — §9
    predict/[ticker]/layout.tsx   Wraps children in PredictProviders (scoped wagmi)
    predict/[ticker]/providers.tsx WagmiProvider + QueryClientProvider, client-only
    predict/leaderboard/page.tsx    RealPlayTabs of two LeaderboardTables —
                                all-time real-ETH and this-week-only chips —
                                plus a WalletSearch box — §9
    predict/wallet/[address]/page.tsx  One wallet's full bet history +
                                staked/claimed/net, joined against live
                                market state — §9
    watchlist/page.tsx           Server-fetches the same data as the
                                dashboard, hands it to `WatchlistTable` to
                                filter client-side by localStorage — §5
                                "Watchlist"
    layout.tsx, globals.css    Dark theme, header/footer. Header has **no**
                                "Predict" link (removed deliberately, see §9
                                "Nav flow") but does have "Heatmap"/"Watchlist"
                                links and the global `WalletTrackerDrawer`
                                trigger; no Twitter/$RHAM links yet (real URLs
                                not decided — don't add placeholders)
  components/
    PremiumTable.tsx           Client component, sortable (premium/volume/price).
                                Takes an optional `sparklines` prop (adds a
                                "Trend" column) — pass it from pages that
                                fetched `getSparklines()`, omit it elsewhere
                                (e.g. the low-liquidity `<details>` table) — §5
    WatchButton.tsx              Star toggle (localStorage), same SVG glyph as
                                RH Explorer's — homepage/watchlist table rows
                                and the stock detail page header — §5
    WatchlistTable.tsx            Client, filters server-fetched rows by
                                `useWatchlist()` — §5
    HighlightCard.tsx             Server component, one ranked mini-list
                                (Top Gainers / Top Losers / Most Liquid) — §5
    MiniSparkline.tsx              Tiny non-interactive SVG trend line for a
                                table cell — §5
    PremiumBadge.tsx           Colored +/-% pill, `size="sm"|"lg"`
    PremiumHistoryChart.tsx    Hand-built SVG line chart w/ hover, client component
    PremiumHeatmap.tsx          Client component, ticker×day grid: gradient
                                legend, biggest-gap/A-Z sort toggle, floating
                                cursor tooltip, bullish/bearish summary — §5
    SessionBreakdown.tsx        Server component, avg premium per NYSE session — §5
    ShareButton.tsx            Opens a prefilled X/Twitter intent window
    EmbedSnippet.tsx             Copyable <iframe> snippet for /embed/[ticker] — §3
    TickerIcon.tsx             Robinhood CDN logo w/ fallback badge on error
    TimeAgo.tsx                 Corrects a server-rendered relative time on
                                mount — see §7 "hydration mismatch" gotcha
    AutoRefresh.tsx            router.refresh() every N seconds (client)
    ConnectWallet.tsx           Wallet **picker** (not a single connect button)
                                — see §9 "Wallet & UI"
    PredictMarketCard.tsx        One real-money (GapMarket) prediction market:
                                pools, countdown, bet/lock/resolve/claim,
                                weekend-vs-session badge — §9
    PlayMarketCard.tsx             Chips-only sibling of PredictMarketCard —
                                same UI, `placeBet` takes an explicit `amount`
                                arg instead of `msg.value`, amounts formatted
                                with `formatChips` not `formatEth` — §9
    ClaimChipsButton.tsx           Shows chip balance + "claim this week's
                                chips" button/countdown — §9
    RealPlayTabs.tsx                Client, switches between pre-rendered
                                real/play sections — **unmounts** the
                                inactive one (not just CSS-hidden) so its
                                wagmi polling hooks stop running — §9
    LeaderboardTable.tsx            Shared table for both leaderboards, takes
                                an optional `formatAmount` (defaults
                                `formatEth`; leaderboard page passes
                                `formatChips` for the play tab) — §9
    ImpliedProbabilityChart.tsx   Filled-area SVG: share of the pool on UP
                                over time, from `getPoolHistory()`/
                                `getPlayPoolHistory()` — the pari-mutuel
                                analog of a Polymarket/Kalshi probability
                                line. Same hover/empty-state conventions as
                                `PremiumHistoryChart` — §9
    PoolDominanceBars.tsx          Ranked bar list, % of all-time ETH staked
                                per ticker — CoinGecko-dominance-chart shape,
                                on `/predict` — §9
    RecentBets.tsx                Live BetPlaced feed for one market (wallet,
                                amount, UP/DOWN) — server initial + client
                                poll every 15s, no subgraph. Takes `mode:
                                "real"|"play"` (a plain string, **not** a
                                function prop — see §9 "PlayMarket" for why
                                that specific mistake breaks outright) to
                                pick GapMarket vs PlayMarket's reader/
                                formatter — §9
    WalletSearch.tsx               Client, address input → /predict/wallet/[address]
                                (viem `isAddress` validation) — §9
    MyActivityLink.tsx              Client, `useAccount()`-based "My bets →"
                                link — **only usable under `/predict/[ticker]`**,
                                the one route tree with `PredictProviders`
                                (wagmi) in scope; would throw outside it — §9
    WalletTrackerDrawer.tsx          Client, mounted once in root `layout.tsx`
                                — trigger button + slide-in side panel, usable
                                from every page. Pure address lookup (no
                                wallet connect needed, calls `getWalletActivity`
                                directly), so it does **not** need wagmi —
                                unlike `MyActivityLink` it works site-wide.
                                Remembers up to 5 recent lookups in
                                `localStorage` — §9
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
    heatmap.ts                  Same *.jsonl files, grouped ticker×day instead
                                of one ticker's timeline — §5
    sessionBreakdown.ts          Buckets a ticker's history points by
                                market.ts's session label, averages each — §5
    sparkline.ts                  Same *.jsonl files again, grouped ticker →
                                raw chronological timeline (not averaged like
                                heatmap.ts) for the table's Trend column — §5
    watchlist.ts                  "use client" localStorage store (toggleWatch/
                                useWatchlist/useIsWatched) — ticker-only
                                version of RH Explorer's lib/watchlist.ts — §5
    format.ts                  formatUsd, formatPct, formatCompactUsd, timeAgo
    chains.ts                   viem chain defs for /predict (testnet 46630,
                                mainnet 4663 for later) — §9
    wagmi.ts                     wagmi config, injected() connector only — §9
    predictContracts.ts          Deployed GapMarket address + PREDICTABLE_TICKERS
                                (the 8-ticker allowlist stock pages check before
                                showing a "Predict →" button) — §9
    predictAbi.ts                 AUTO-GENERATED by scripts/sync-predict-abi.mjs — §9
    predictFormat.ts              tickerFromBytes32, formatFeedPrice, formatEth,
                                formatChips (same math as formatEth, labeled
                                "chips" — **never** use formatEth for a
                                PlayMarket amount, see §9), formatCountdown,
                                formatSessionWindow, truncateAddress — §9
    predictMarkets.ts             Server-side (no wallet) reads for both
                                contracts: getAllMarkets/
                                getLatestMarketPerTicker (GapMarket) and
                                getAllPlayMarkets/getLatestPlayMarketPerTicker
                                (PlayMarket, duplicated not parametrized) +
                                toInitialMarket() serializer (shared, same
                                Market struct shape either contract) — §9
    predictBets.ts                 Server- and client-safe GapMarket
                                BetPlaced/Claimed event log reads
                                (getBetsForMarket, getLeaderboard,
                                getWalletActivity, getPredictOverview,
                                getPoolHistory) — no subgraph, see §9
    playBets.ts                    PlayMarket equivalent of predictBets.ts —
                                getPlayBetsForMarket, getPlayWalletActivity,
                                getPlayOverview, getPlayPoolHistory, and
                                getPlayLeaderboard (this-week-only, unlike
                                the all-time real leaderboard — see §9) —
                                also exports currentWeekStart() — §9
scripts/
  gen-registry.mjs             Regenerates src/lib/registry.{ts,json} from live APIs
  snapshot-premiums.mjs        Appends one premium snapshot line to
                                data/premium-history/<date>.jsonl — run by CI
  sync-predict-abi.mjs          Copies contracts/artifacts/**/*.json ABIs
                                (GapMarket, PlayMarket, MockAggregator) into
                                src/lib/predictAbi.ts — §9. Re-run after any
                                Solidity change to either contract.
.github/workflows/
  snapshot-premiums.yml        Cron (every 15 min): runs the script above, prunes
                                snapshots >60 days old, commits + pushes
data/premium-history/
  <YYYY-MM-DD>.jsonl           One JSON object per line per snapshot run
contracts/                     Separate npm package (Hardhat 3) — GapMarket
                                (real ETH) and PlayMarket (free weekly chips)
                                prediction-market contracts. See §9.
  contracts/PlayMarket.sol       Chips-only sibling of GapMarket.sol —
                                claimWeeklyChips() + chip-balance bet/claim
                                instead of msg.value/ETH transfer — §9
  test/PlayMarket.ts              Mirrors test/GapMarket.ts's coverage plus
                                weekly-reset-specific cases (claim resets not
                                adds, can't claim twice same week, can't bet
                                more chips than you hold)
  tickers.json                  Hand-maintained: ticker → mainnet feed / testnet
                                mock / name, read by the scripts below — §9
                                (shared by both GapMarket and PlayMarket
                                scripts — one set of MockAggregators, two
                                separate sets of markets)
  scripts/deploy-mock-feeds.ts   Deploys a MockAggregator per new ticker
  scripts/create-markets.ts       Creates one GapMarket market per ticker
  scripts/create-weekend-markets.ts   Creates one GapMarket weekend-gap market per ticker
  scripts/create-play-markets.ts       PlayMarket equivalent of create-markets.ts
  scripts/create-play-weekend-markets.ts  PlayMarket equivalent of create-weekend-markets.ts
  scripts/push-mock-prices.ts     Mirrors every ticker's real mainnet price
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
- **No wallet, no write transactions, no smart contracts outside `/predict`.**
  The core premium tracker is intentionally read-only — cheap to build, zero
  custody/security surface. `/predict` (§9) is the one deliberate exception,
  scoped to its own route precisely so this principle still holds everywhere
  else. Don't add wallet-connect elsewhere unless a feature genuinely needs
  a signed tx.
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
- **`next.config.ts` sets `outputFileTracingIncludes` for `/`, `/stock/*`,
  `/heatmap`, and `/watchlist`.** `history.ts`, `heatmap.ts`, and
  `sparkline.ts` all read `data/premium-history/*.jsonl` with `node:fs` at
  request time; Next's build-time file tracing only follows static
  `import`/`require`, so without this the folder would silently be missing
  from the Vercel serverless bundle for whichever route reads it (empty
  history/heatmap/sparklines, no error). **Any new route that reads that
  folder needs its own entry added here** — the homepage needed one the
  moment it started calling `getSparklines()`.
- **`next.config.ts` also sets `devIndicators: false`** — Next 16's dev-only
  on-screen route indicator (a small badge, bottom-left by default) has no
  effect on production but is distracting during dev/screenshots; the error/
  compile overlay itself still works with this off, per the Next docs.
- **Heatmap** (`/heatmap`, `lib/heatmap.ts`): reuses the same committed
  snapshot files as the per-stock history chart, just grouped ticker×day
  instead of one ticker's timeline — average premium per ticker per UTC day,
  rendered as a colored grid (green = premium, red = discount, opacity =
  magnitude, capped at ±6%). Degrades the same way the history chart does:
  with only a few days of committed snapshots it's a narrow grid, and fills
  in as the cron keeps running. No new data source.
- **Session breakdown** (`SessionBreakdown` on the stock page,
  `lib/sessionBreakdown.ts`): buckets that ticker's history points by
  `market.ts`'s existing session classifier (Weekend / After hours /
  Pre-market / Regular session) and averages premium within each bucket.
  Fetches a 14-day history window (vs. the chart's default 4d) so there's a
  better chance of hitting a full weekend; renders nothing if fewer than 2
  session types are present yet (not enough variety to be meaningful).
- **CoinGecko-inspired dashboard pass**: `PremiumTable` gained a star column
  (`WatchButton`, `lib/watchlist.ts`) and a "Trend" sparkline column
  (`MiniSparkline`, `lib/sparkline.ts`) — same shape as a CoinGecko coin
  table's watchlist star + 7d sparkline, adapted to our one metric (premium,
  not price). The homepage also gained a `HighlightCard` trio (Top Gainers /
  Top Losers / Most Liquid, top 5 each) above the main table, mirroring
  CoinGecko's homepage "highlights" boxes — all computed from the same
  `getPremiums()` call already on the page, no new fetch. `/watchlist`
  (`WatchlistTable`) reuses `PremiumTable` unmodified, just pre-filtered to
  `useWatchlist()`'s tickers client-side — the page itself still
  server-fetches the full dataset (localStorage isn't readable server-side),
  so there's no separate "watchlist-only" data path to keep in sync.
  Deliberately did **not** chase CoinGecko's category tabs/global-currency
  switcher/rank column — no sector taxonomy exists for these 34 tickers to
  hang categories off, and everything here is already USD, so those specific
  widgets wouldn't map to anything real; the parts that transplanted cleanly
  were the ones keyed to a single per-row metric, which premium already is.
- **Public API + embed widget** (`/api/premium`, `/api/premium/[ticker]`,
  `/embed/[ticker]`): deliberately open CORS (`Access-Control-Allow-Origin:
  *`) — this is the same `getPremiums()` data already shown on the dashboard,
  just exposed for scripting/embedding by anyone, same spirit as
  impliedopen.com's free embeddable widgets. `/embed/[ticker]` is a Route
  Handler, not a page — Route Handlers skip the root layout entirely, which
  is how it avoids inheriting the site header/footer/max-width wrapper
  without needing a second route-group root layout. Styling is hand-inlined
  (Tailwind's compiled CSS isn't available outside the page render pipeline).
- **Leaderboard + recent bets** (`lib/predictBets.ts`): read `BetPlaced`/
  `Claimed` logs straight off the RPC with `getContractEvents` — confirmed
  live that a full `fromBlock: 0n` query against this contract works and is
  cheap at current volume (a few dozen logs total). `getBetsForMarket` filters
  server-side via the indexed `id` topic (`args: { id }`), not a client-side
  scan, since `RecentBets` polls it client-side every 15s. `getLeaderboard`
  genuinely needs the full unfiltered log set (aggregates across every
  wallet/market) — fine today, but if bet volume ever grows enough for
  `fromBlock: 0n` to get slow or hit an RPC range limit, both need a real
  start block (e.g. the contract's deployment block) instead of `0n`. This is
  still not the `useWatchContractEvent`/subgraph setup called out as missing
  in §9 "Open items" — it's polling, not a push subscription — but it does
  replace the "no visibility into other users' bets at all" gap that note
  described.
- **Wallet tracker** (`/predict/wallet/[address]`, `getWalletActivity()` in
  `lib/predictBets.ts`): every bet + claim for one wallet, joined against
  `getAllMarkets()` for ticker/state/outcome so each row can show "Unclaimed
  win →" vs "Lost" vs still-open. Reachable three ways: `WalletSearch` (any
  address, viem `isAddress` validated) on the leaderboard, each leaderboard
  row's wallet link, and `MyActivityLink` ("My bets →") next to
  `ConnectWallet` on `/predict/[ticker]` for the connected wallet. The page
  itself is a plain server component (no wagmi) — `MyActivityLink` is the
  only piece that needs a wallet connection, and it's client-only.
- **Global wallet tracker drawer**: `WalletTrackerDrawer` lives in root
  `layout.tsx`, so its trigger button and the slide-in panel it opens are on
  every page, not just `/predict/*`. It's intentionally read-only and wallet-
  connect-free — you paste any address, it calls the same
  `getWalletActivity()` used by `/predict/wallet/[address]` directly from the
  client (viem `createPublicClient`, no wagmi) — so it doesn't need to be
  inside `PredictProviders` and doesn't expand the "wallet-connect only under
  /predict" boundary from §5. `localStorage` recents are read in a
  post-mount `useEffect` (guarded from SSR, `eslint-disable
  react-hooks/set-state-in-effect` same as `TimeAgo`), not a lazy `useState`
  initializer — the latter would read `localStorage` during the client's
  first render and mismatch the server-rendered (empty) HTML.
- **Predict cross-linking**: `PremiumTable` rows and `PremiumHeatmap` ticker
  labels both show a small "Predict" pill linking to `/predict/[ticker]` when
  the ticker is in `PREDICTABLE_TICKERS`; `/predict/[ticker]` links back to
  `/stock/[ticker]` ("View premium →"). Still gated to the 8 tickers with a
  deployed market — going further means running
  `deploy-mock-feeds.ts`/`create-markets.ts` for the rest of the registry
  (§9 "Adding a ticker"), a deliberate separate decision, not done here.
- **Predict pages redesign — leaned on real (premium) data over empty (bet)
  data.** Both `/predict` and `/predict/[ticker]` got denser: stat tiles,
  premium badges + sparklines on every ticker card, `PremiumHistoryChart`
  and `ImpliedProbabilityChart` side by side on the ticker page,
  `PoolDominanceBars` on the index. As of this writing **zero real bets have
  ever been placed** on the deployed `GapMarket` (confirmed via
  `getContractEvents` — `BetPlaced` count 0), so every bet-derived widget
  (implied-probability chart, pool bars, bettor counts) is currently showing
  its empty state, not a bug. That's why the premium-derived pieces
  (badges/sparklines/history chart — real data, 15-min snapshots since the
  cron started) got priority placement over the bet-derived ones: the page
  needed to look full today, not just once betting volume exists. All the
  empty states are intentional and match the graceful-degradation pattern
  used everywhere else (heatmap, history chart) — they explain what's
  missing rather than hiding the section.
- **`getPoolHistory()` fetches one block timestamp per unique block**
  (`BetPlaced` only carries a block number). Cheap at zero-to-low bet
  volume; if that changes, batch or cache these instead of one `getBlock`
  call per unique block.

## 6. Commands

```bash
npm run dev     # dev server on :3000 (or --port 3100, see .claude/launch.json)
npm run build   # production build (also type-checks — this is the gate)
npm run lint    # eslint
npm start       # serve the production build
node scripts/gen-registry.mjs src/lib/registry.ts   # refresh the stock list
node scripts/sync-predict-abi.mjs                   # refresh src/lib/predictAbi.ts after a Solidity change

cd contracts
npm test                        # 21 Hardhat tests (9 GapMarket + 12 PlayMarket)
npm run push-prices              # mirror every ticker's real mainnet price into its testnet mock
npm run create-markets            # create a new GapMarket trading-session market for every ticker
npm run create-weekend-markets      # create a new GapMarket weekend-gap market for every ticker
npm run create-play-markets          # same, for PlayMarket (chips)
npm run create-play-weekend-markets   # same, for PlayMarket (chips)
npm run deploy:testnet               # redeploy MockAggregator + GapMarket (new address!)
npm run deploy:testnet:play           # redeploy PlayMarket (new address!)
```

Always run `npm run lint` and `npm run build` (root) and `npm test`
(`contracts/`) before committing.

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
  `cwd` in `.claude/launch.json` **cannot** work here — the harness requires
  `cwd` to stay inside the project root Claude Code was launched from
  (`X:\explorer`), and there is no relative path that reaches `..\new
  proj\implied-open` without escaping it. A `launch.json` entry for this was
  added once and then removed after hitting exactly that error — **don't
  re-add one.** Instead: start the dev server manually via a background Bash
  command (`npm run dev -- --port 3100`), then call `preview_start` with
  `{ url: "http://localhost:3100" }` (not `{ name: ... }`) to open the
  Browser pane against it.
- **Hydration mismatch on anything computed from the current time** (seen on
  `PremiumTable`'s "Close updated Xh ago" column) — a value like `timeAgo(x)`
  differs between the server's render instant and the client's hydration
  instant, so React flags a mismatch and re-renders that subtree. Fix
  pattern: a small client component (`TimeAgo.tsx`) that renders the
  server-computed value first (matches SSR), then corrects itself in a
  `useEffect` on mount with `suppressHydrationWarning` on the element. Reuse
  this pattern for any other clock-dependent display text — don't call
  `timeAgo()`/`Date.now()`-derived formatting directly in a component body
  that renders on both server and client.
- Windows dev box; primary shell is PowerShell, Bash also available (same as
  RH Explorer).
- **`contracts/` is excluded from the root tsconfig and eslint** (see §9) —
  if you add another subpackage, remember to exclude it the same way, or
  ESLint/tsc will pick up Hardhat's generated `artifacts/**/*.d.ts` and fail.
- **`contracts/` uses Hardhat 3, not Hardhat 2** — breaking changes from what
  most training data describes (config format, viem instead of ethers,
  `node:test` instead of Mocha). See `AGENTS.md` and §9.

## 8. Roadmap / discussed next steps

Done:
- ~~Shareable cards for X/Twitter~~ — `opengraph-image.tsx` (dashboard +
  per-stock) and `ShareButton`. Live once deployed; works today via any
  `og:image`-aware unfurler even pre-deploy (localhost during dev).
- ~~Premium history / charts~~ — snapshot pipeline (§3) + `PremiumHistoryChart`
  on the stock page. The repo now has a GitHub remote (§10), so the cron can
  actually run — confirm it's registered and firing on schedule.
- ~~Prediction market~~ — `/predict`, see §9. Testnet only, deliberately.
- ~~Weekend-gap markets~~ — the other half of the prediction market: bet on
  Friday-close-to-Monday-open direction, not just intraday session direction.
  Same `GapMarket` contract, see §9 "Two market types, one mechanic". Live
  for all 8 tickers.
- ~~RHAM rebrand~~ — site brand is now **RHAM** (header, `<title>`,
  homepage). "Implied Open" is the premium-dashboard feature's name within
  the platform, not the site name anymore — see the top of this file.
- ~~Premium heatmap~~ — `/heatmap`, ticker×day grid off the same snapshot
  files as the history chart. See §5.
- ~~Predict leaderboard~~ — `/predict/leaderboard`, wallets ranked by ETH
  claimed minus staked, read from contract events, no accounts. See §9.
- ~~Recent bets list~~ — `RecentBets` on `/predict/[ticker]` shows every
  `BetPlaced` for the current market (wallet, ETH amount, UP/DOWN), polling
  every 15s. See §9.
- ~~Public premium API + embeddable widget~~ — `/api/premium(/[ticker])`
  (open CORS) and `/embed/[ticker]` (iframe-able card), with a copyable
  snippet on each stock page. See §5.
- ~~Session-aware premium breakdown~~ — `SessionBreakdown` on the stock page:
  average premium by Weekend / After hours / Pre-market / Regular session.
  See §5.
- ~~Watchlist, inline sparklines, CoinGecko-style dashboard pass~~ — star
  column, "Trend" sparkline column, homepage `HighlightCard` trio. See §5.
- ~~PlayMarket: free weekly chips~~ — a second, parallel prediction-market
  contract with zero financial stakes (weekly-reset 0.1 chip allowance, own
  leaderboard, its own tab on every ticker's Predict page) alongside the
  existing real-ETH GapMarket. See §9 "PlayMarket".

Not yet built, ordered by logical next priority:

1. **Twitter/X and $RHAM header links** — explicitly asked for, but no real
   URLs exist yet (no X account, no $RHAM page/token launched). Don't add
   placeholder or guessed links — wire them in as soon as both exist.
2. **Gap-prediction accuracy stat** — now that history exists: "the premium
   correctly predicted the direction of the next open in X% of cases over
   the last N weekends." Needs a few weeks of real snapshots to be
   meaningful, not just code. Strong, concrete marketing claim if the number
   is good. The weekend-gap markets (above) are a second, independent way to
   eventually validate the same claim with real settled bets instead of just
   passive premium history.
3. **Telegram alerts** ("premium on TSLA crossed 3%") — needs a persistent
   worker/poller; the GitHub Actions cron (§3) could plausibly double as
   this instead of standing up a separate always-on process.
4. **Deploy the site** — Vercel (straightforward, no env secrets needed yet
   since everything hits public APIs) + register a domain. The repo itself
   is already on GitHub (§10); this is specifically about hosting.
5. See §9 "Open items specific to `/predict`" for prediction-market-specific
   items (mainnet decision, automating the oracle push + lock/resolve, a
   market-creation UI).

## 9. Prediction market (`/predict`)

Complementary to the premium tracker: while `implied-open`'s core product
tracks the premium *while the market is closed*, `/predict` is a bet on
direction *during* the regular session — will a stock's price be higher or
lower at session close than at session open. Originally scoped as a separate
project (`gapbet`), then merged into this site per explicit direction so
everything lives on one domain in one visual style — only `contracts/` (a
genuinely separate Hardhat/Solidity toolchain) stays a distinct npm package.

**This is a deliberate scope-down, not the full ask.** "Real money, mainnet,
day one" was on the table; v1 is **testnet-only, play money**, because: (1)
Robinhood Chain testnet has no real Chainlink stock feeds, so a mock oracle
was needed regardless (below); (2) a prediction market handling real funds
deserves security review before going live — correctness bugs mean stolen or
stuck money, not a cosmetic issue; (3) a market on a regulated broker's
tokenized-stock price direction plausibly reads as a gambling/derivatives
product in some jurisdictions — worth a deliberate decision, not a default.
**Do not deploy to mainnet or point this at real funds without a separate,
explicit decision to do so.**

### How it works

Non-custodial pari-mutuel pool, resolved entirely on-chain:
- Bettors put ETH on UP or DOWN before a market's `locksAt`.
- **`lockMarket`/`resolveMarket` are permissionless** — anyone can call them
  once the time threshold passes. The contract reads the price feed itself at
  that moment (not a caller- or admin-supplied number), so *who* calls them
  doesn't matter, only *when*.
- Winners split the losing side's pool pro-rata to their stake. A tie
  (`Push`) or a decisive outcome nobody bet on refunds everyone in full.
- The contract owner's only privileged action is *creating* a market — they
  cannot touch locked funds, resolve early, or influence the outcome.

### The oracle problem

Robinhood Chain **testnet** has no real Chainlink stock feeds — only noise
(copycat tokens like "Tilt NVIDIA", "NVDA 5min YES"). The real 34-ticker set
(§3's registry) is **mainnet only**. Solution: one `MockAggregator.sol` per
ticker (`AggregatorV3Interface`-compatible), kept updated by mirroring that
ticker's *real* mainnet Chainlink price. `GapMarket` reads each through the
same interface a real feed would use — **moving to mainnet later changes
only the feed address passed to `createMarket`, not a line of contract
code.**

- **8 tickers live**, each with its own `MockAggregator`: NVDA, AAPL, TSLA,
  AMZN, MSFT, GOOGL, META, AMD. Mapping lives in `contracts/tickers.json`
  (ticker → mainnet feed address, testnet mock address, company name) —
  **hand-maintained, not regenerated** (unlike `registry.json`).
- `GapMarket.MAX_PRICE_STALENESS = 30 minutes` — lock/resolve revert on a
  `"stale price"` if a mock hasn't been pushed recently enough. Run
  `npm run push-price` (in `contracts/`) if you hit this while testing.
- `contracts/scripts/deploy-mock-feeds.ts` — reads `../src/lib/registry.json`
  for the mainnet feed address + name per ticker, deploys any `MockAggregator`
  missing from `tickers.json`, seeded with that ticker's real current price.
  Idempotent — already-deployed tickers are skipped.
- `contracts/scripts/create-markets.ts` — creates one market per ticker in
  `tickers.json` (1-hour lock + 1-hour session by default; override with
  `LOCK_IN_SECONDS` / `SESSION_LENGTH_SECONDS`). **Awaits each transaction's
  receipt before sending the next** — sending several `writeContract` calls
  back-to-back without waiting causes `nonce too low` errors (hit this once
  creating all 8 markets in one run).
- `contracts/scripts/push-mock-prices.ts` — mirrors every ticker's real price
  in one pass. Same await-before-next-send requirement as above.
- The old singular `push-mock-price.ts` / `create-market.ts` (NVDA-only)
  still exist for quick one-ticker testing; the plural scripts are what you
  actually want for routine use.
- **These all run by hand right now** — no cron yet. `PredictMarketCard`'s
  Lock/Resolve buttons make this possible from the UI too (any connected
  wallet can call them once eligible).

### Two market types, one mechanic

`GapMarket` doesn't know or care what a market "type" is — `createMarket`
just takes two timestamps, and whoever calls it decides what they mean:

- **Trading session** — `locksAt`/`resolvesAt` a few hours apart, inside a
  single NYSE session. Created by `create-markets.ts`.
- **Weekend gap** — `locksAt` = this week's Friday 16:00 ET (close),
  `resolvesAt` = the following Monday 09:30 ET (open). Created by
  `contracts/scripts/create-weekend-markets.ts`, which computes both
  timestamps DST-aware from `America/New_York` wall-clock time. This is the
  literal on-chain version of what the Implied Open dashboard already shows
  passively (§1) — betting on whether the premium's implied direction is
  right.

The frontend infers which is which from the gap's duration —
`isWeekendGapMarket()` in `predictFormat.ts` (>20h = weekend) — purely for
display (the badge on `PredictMarketCard`). There's no on-chain distinction,
so don't rely on this heuristic for anything that needs to be exact.

### Deployed (Robinhood Chain testnet, chain id 46630)

- `GapMarket`: `0x7c2E182234d65D3eB34ec7a19527908D13bB65b3`
- Per-ticker `MockAggregator` addresses: `contracts/tickers.json`

`GAP_MARKET_ADDRESS` is hand-maintained in `src/lib/predictContracts.ts` —
redeploying via `npm run deploy:testnet` (in `contracts/`) produces a new
address that must be copied over by hand. Per-market feed addresses don't
need frontend config at all — each market struct already stores its own
`feed`, read directly off-chain.

### PlayMarket: free weekly chips, no real money

A second, parallel contract — not a mode flag on `GapMarket`. Added so people
can play (and show up on a leaderboard) with zero financial stakes, whether
or not/whenever GapMarket ever goes to mainnet. Structurally almost identical
to `GapMarket.sol` (same `Market` struct, same permissionless lock/resolve,
same pari-mutuel payout math in `claimableOf`) — the only real differences:

- **`claimWeeklyChips()`** — anyone can claim once per week
  (`block.timestamp / 7 days`, which lands on **Thursdays 00:00 UTC**, not
  Mondays — the boundary is just Unix-epoch-aligned, epoch itself was a
  Thursday). Claiming **resets** `chipBalance` to `WEEKLY_CHIPS` (0.1, same
  18-decimal scale as ETH so every existing `formatEth`-style helper works
  unchanged) — it does **not** add to the existing balance. Last week's
  winnings or losses don't carry over, same spirit as a fantasy-football
  weekly reset. This was an explicit user decision, not a default — don't
  "fix" it into an additive/all-time balance.
- **`placeBet(id, up, amount)` takes `amount` as an explicit argument**, not
  `msg.value` — it debits `chipBalance` instead of requiring an ETH transfer.
- **`claim()` credits `chipBalance` instead of sending ETH** — no external
  call happens, so (unlike `GapMarket`) there's no reentrancy surface and no
  `nonReentrant` guard on this contract.
- Chips can never leave the contract — no withdraw, no transfer function.
  They are not, and must never become, a real asset.

Deployed at `0xa10910C5CA5f72FEeF0c9d587dD283CCF15384cD` (testnet), address
hand-maintained in `PLAY_MARKET_ADDRESS` (`predictContracts.ts`), same
pattern/caveat as `GAP_MARKET_ADDRESS`. Uses the **same** `tickers.json`
MockAggregators as GapMarket (no separate oracle deploy) but its own separate
set of markets, created via `contracts/scripts/create-play-markets.ts` /
`create-play-weekend-markets.ts` (`npm run create-play-markets` /
`create-play-weekend-markets`) — mirrors of the GapMarket scripts, just
pointed at `PLAY_MARKET_ADDRESS`. `npm run deploy:testnet:play` redeploys the
contract itself (new address, must be copied by hand, same as GapMarket).

**Two hard-won gotchas from building this:**
1. **Never reuse `formatEth()` for a chip amount.** Early versions did, and
   every chip balance on the leaderboard/market cards read as "0.03 ETH" —
   directly undermining the entire "no real money" premise of the feature.
   `predictFormat.ts` has a dedicated `formatChips()` (identical math, labeled
   "chips") — any component/page that renders both real and play amounts
   (`RecentBets`, `LeaderboardTable`, the ticker page's `MarketStats`) takes
   an explicit formatter/mode so this can't silently regress.
2. **Function props cannot cross the Server→Client Component boundary at
   all** — worse than the bigint gotcha above (which just needs
   `.toString()`/`BigInt()`), passing an actual function reference (e.g.
   `fetchBets={getPlayBetsForMarket}`) from a Server Component into a Client
   Component throws outright at request time ("Functions cannot be passed
   directly to Client Components..."), both server-side and as a browser
   console error. `RecentBets` originally took `fetchBets`/`formatAmount`
   function props to point it at either contract; fixed by taking a plain
   `mode: "real" | "play"` string instead and resolving the actual
   fetcher/formatter **inside** the client component, where those functions
   already live. Any future component reused across GapMarket/PlayMarket
   from a server-rendered page should follow this pattern, not pass functions
   in as props.

Parallel library code: `src/lib/playBets.ts` mirrors `predictBets.ts`
(`getPlayBetsForMarket`, `getPlayWalletActivity`, `getPlayPoolHistory`,
`getPlayOverview`) plus the one genuinely different piece —
`getPlayLeaderboard()` filters `BetPlaced`/`Claimed` logs to the **current
week only** (fetches one block timestamp per unique block, same approach as
`getPoolHistory`) instead of all-time, since an all-time chip leaderboard
would just reward whoever's been claiming longest. `currentWeekStart()` is
the shared week-boundary helper (also exported for the leaderboard page's
"since [date]" copy). `predictMarkets.ts` similarly gained
`getAllPlayMarkets()`/`getLatestPlayMarketPerTicker()` — duplicated rather
than parametrized by contract address/ABI, matching this project's existing
preference for duplication over fighting generic ABI type inference for a
two-contract case (see `scripts/create-play-markets.ts`'s comment).

**Known gap:** the wallet tracker (`/predict/wallet/[address]` and
`WalletTrackerDrawer`) still only shows **real-money** activity
(`getWalletActivity`, GapMarket only) — looking up a wallet there won't show
its chip bets. Extending it to show both wasn't part of the original ask;
do it by giving `getPlayWalletActivity()` (already in `playBets.ts`) the
same treatment `getWalletActivity` gets today, plus a real/play toggle in the
UI.

### Pages & rendering

- `/predict` — server-rendered index, one card per ticker with an active
  market (grid, `TickerIcon` + name + state badge, premium badge, premium
  `MiniSparkline`, real-money pool split bar), linking to `/predict/[ticker]`.
  A banner above the grid explains the two betting modes and links to the
  leaderboard. No wallet, no client JS needed to see it. `PoolDominanceBars`
  below the grid ranks tickers by all-time real-money ETH staked.
- `/predict/[ticker]` — a shared header (premium badge, `PremiumHistoryChart`)
  above `RealPlayTabs`, which switches between a real-money section
  (`PredictMarketCard` + `RecentBets` + `ImpliedProbabilityChart` off
  `getPoolHistory`) and a play-money section (`ClaimChipsButton` +
  `PlayMarketCard` + `RecentBets mode="play"` + its own
  `ImpliedProbabilityChart` off `getPlayPoolHistory`) — **each tab's content
  is only mounted while active**, not just CSS-hidden, so the inactive tab's
  wagmi polling hooks and `RecentBets` interval don't run for nothing. Older
  markets per mode collapse into their own `<details>` "Past sessions" block
  (same pattern as the dashboard's low-liquidity section, §5). `ConnectWallet`
  lives here, not in the root header — see below.
- `app/predict/[ticker]/layout.tsx` scopes `PredictProviders` (wagmi +
  react-query) to just this route, so the rest of the site — including the
  `/predict` index itself — doesn't load that bundle.
- **`PredictMarketCard` renders from server-fetched data first, wagmi second.**
  `src/lib/predictMarkets.ts` reads `GapMarket` with a plain server-side viem
  client (no wallet needed) and the page passes each market in as an
  `initial` prop; the component displays that immediately and lets its own
  `useReadContract` take over once it resolves client-side. This isn't just
  a nicer UX (no loading flash) — **wagmi-only rendering genuinely didn't
  work during development**: the dev sandbox browser has a known issue
  (document stays `hidden`, which stalls React's commit of client-fetched
  data indefinitely — chunks load, no errors, but nothing paints) documented
  elsewhere in this file for other pages. Server-first rendering sidesteps it
  entirely and is more robust for real users too.

### A hard-won gotcha: bigint across the Server→Client boundary

**`bigint` values silently fail to serialize as props from a Server Component
to a Client Component.** `/predict/[ticker]/page.tsx` is a server component
passing market data to the client `PredictMarketCard` — an early version
passed `id: bigint` and `initial` fields as raw bigints, and the component
rendered `null` forever with zero errors anywhere (not in the browser
console, not in the server log) — it just silently never received usable
data. Every bigint that crosses that specific boundary must be
`.toString()`'d on the way out and `BigInt()`'d back on the way in — see
`PredictMarketCard`'s `id` prop and `InitialMarket` interface, and
`predictMarkets.ts`'s `toInitialMarket()`. This does **not** apply to
client-to-client prop passing (e.g. within `PredictMarketCard` itself) or to
values that stay server-side. `predictBets.ts`'s `SerializableBet`/
`toSerializableBet()` follow the identical pattern for `RecentBets`' `initial`
prop — copy that one too if you add another server→client event-log path.

### Nav flow

There is **no "Predict" link in the site header** (deliberately removed).
The intended path is: browse the dashboard or a stock page → click
"Predict →" on that stock's page (only shown for the 8 tickers in
`PREDICTABLE_TICKERS`) → land on `/predict/[ticker]` already scoped to that
stock. `/predict` (the index, listing all predictable tickers) still exists
and is linked from the homepage's "02 · Bet on it" card, but isn't in global
nav — it's a secondary entry point, not the primary one.

### Wallet & UI

- `wagmi` v3 + `viem` v2. **`ConnectWallet` is a picker, not a single
  connect button** — wagmi auto-discovers one connector per installed
  EIP-6963 wallet (MetaMask, Rabby, Phantom, ...) via
  `multiInjectedProviderDiscovery` (on by default). The naive approach —
  grab the generic `"injected"` connector and connect — silently connects to
  *whichever wallet last overwrote `window.ethereum`*, which in testing was
  Phantom even though the user wanted MetaMask/Rabby. Fix: filter out the
  generic `"injected"` id when specific connectors exist, and if more than
  one remains, show a dropdown (name + icon per connector) instead of
  connecting automatically. See `ConnectWallet.tsx`.
- No WalletConnect connector (would need a project ID we don't have) —
  browser-extension wallets only.
- Colors reuse the site's existing tokens: `text-accent`/`bg-accent` for UP
  (same green already used for a positive premium), `text-danger`/`bg-danger`
  for DOWN — no new CSS variables needed. State dots (open/locked/resolved)
  follow the same colored-dot convention as the homepage's market-status
  indicator.
- The deployer key used for testnet operations is a **throwaway dev key**,
  generated locally and stored in `contracts/.env` (gitignored) — not
  connected to any real account. It holds a small amount of testnet ETH from
  the public faucet (`faucet.testnet.chain.robinhood.com`), which has Vercel
  bot protection that blocks scripted requests — request more from a real
  browser session, not a script.
- `hardhat keystore set` needs a real TTY (masked password prompt), so it
  can't be driven non-interactively. `configVariable(name)` in
  `contracts/hardhat.config.ts` falls back to `process.env[name]`, which is
  what's actually used — see `contracts/hardhat.config.ts` +
  `contracts/.env` + `dotenv/config`.

### Open items specific to `/predict`

- Mainnet deployment (see the scope-down note above) — security review,
  jurisdiction decision, real feed addresses per market.
- Automating the push/lock/resolve scripts instead of running by hand —
  natural fit for a GitHub Actions cron, same shape as §3's premium
  snapshotter, once cadence/reliability needs justify it.
- No market-creation UI — only `contracts/scripts/create-markets.ts` (owner
  key required).
- No *push* event indexing — `PredictMarketCard` re-reads after *its own*
  transactions confirm; `RecentBets` now polls `getBetsForMarket` every 15s
  (§5) so other users' bets do show up, just not instantly. Fine for a
  low-traffic testnet demo; would want `useWatchContractEvent` or a subgraph
  for real-time updates and to avoid `getLeaderboard`'s unfiltered log scan
  growing unbounded at real scale.
- Adding a ticker beyond the current 8 means: add it to
  `deploy-mock-feeds.ts`'s `TICKERS` array, run it, then
  `npm run create-markets` (or the singular scripts for just that one) —
  and, separately, `npm run create-play-markets` if PlayMarket should have
  it too (the two contracts' ticker sets aren't required to match, they
  just currently do).
- Wallet tracker (`/predict/wallet/[address]`, `WalletTrackerDrawer`) only
  covers real-money (GapMarket) activity — see "PlayMarket" above for what
  extending it to chips would take.
- No real-yield mechanic yet connecting the leaderboards to anything —
  discussed as a future idea (top real-money leaderboard performers earning
  a share of eventual $RHAM trading fees) but blocked on $RHAM not existing
  and on the mainnet decision above; nothing to build here until both are
  real.

## 10. Repository & collaboration

- **Remote:** `https://github.com/Qollta/implied-open` (private).
- No collaborators yet (solo project so far, unlike RH Explorer which is
  shared with `bnbhacker`).
- Commits so far have no `Co-Authored-By` trailer — keep it that way on this
  repo.
- Prefer small, frequent commits, same conventions as RH Explorer's workflow
  if this becomes a shared repo too.
- **As of this writing, the entire `/predict` feature + RHAM rebrand is
  uncommitted** (everything since the "Add shareable X cards and premium
  history snapshotting" commit — `git log`/`git status` are authoritative,
  this note will go stale). That includes `contracts/` itself, which isn't
  tracked yet either. Worth committing in reviewable chunks rather than one
  giant commit, given the size — check with the user first either way, per
  standing instructions to only commit when asked.
