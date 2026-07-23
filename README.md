# RHAM — RobinHood Assets Market

**Live premium tracker + non-custodial prediction markets for Robinhood Chain's tokenized stocks.**

🔗 [rwam.digital](https://rwam.digital) · [X / Twitter](https://x.com/rha_market)

---

## The idea

Robinhood Chain is the first chain with **liquid, 24/7-tradable tokenized stocks** (NVDA, AAPL, TSLA, …) issued by a real broker. The real exchange (NYSE/NASDAQ) is closed nights and weekends — but the on-chain token keeps trading the whole time. The gap between the two prices is genuinely new information:

```
premium % = (live DEX token price − frozen official close) / official close
```

A positive premium while the market is closed is the on-chain crowd betting the stock opens higher next session; negative is a bet it opens lower. **RHAM is one dashboard built entirely around that number** — plus a way to actually bet on it.

## Features

- **Live premium dashboard** — every tracked ticker's DEX price vs. its official Chainlink close, refreshed continuously. Sortable table, sparklines, Top Gainers / Top Losers / Most Liquid highlights, a session-by-session premium breakdown (weekend / pre-market / regular hours), and a ticker × day **heatmap**.
- **Predict** — non-custodial, pari-mutuel UP/DOWN markets on whether a stock's session (or the Friday-close-to-Monday-open weekend gap) resolves higher or lower. Resolved on-chain by reading the same price feed at lock and resolve time — nobody decides the outcome.
  - **ETH** tab — real testnet ETH, needs a wallet (MetaMask, Rabby, …).
  - **fETH** tab — a free, wallet-free practice balance (0.1 fETH/week) backed by an internal cookie-based account, with its own leaderboard and a weekly bonus for the top net winner.
- **Watchlist & Portfolio** — star tickers locally, or look up any wallet's full bet history and standing.
- **Compare** — overlay up to 5 tickers' premium history on one chart.
- **Whale-style wallet tracker** — paste any address, see everything it's bet, no login.
- **Public API + embeddable widget** — open-CORS `/api/premium` endpoints and a bare `<iframe>`-able card per ticker for anyone to build on.

Everything except `/predict` is **read-only** — no accounts, no database, no wallet required to use the core tracker.

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (no component libraries — hand-built SVG charts) |
| On-chain data | [Chainlink](https://chain.link) price feeds on Robinhood Chain (official close), [Blockscout](https://www.blockscout.com/) (live DEX price) |
| Prediction markets | [Solidity](https://soliditylang.org) contracts (Hardhat 3) + [wagmi](https://wagmi.sh) / [viem](https://viem.sh) |
| Off-chain storage | [Upstash Redis](https://upstash.com) for the free-play fETH wallet (falls back to a local JSON file in dev) |
| History | GitHub Actions cron, snapshotting premiums straight into committed JSONL files — no database |

## Getting started

```bash
git clone https://github.com/Qollta/implied-open.git
cd implied-open
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The premium tracker works immediately with zero configuration — it only talks to public Chainlink/Blockscout endpoints.

To use the fETH free-play wallet with persistence across restarts, copy `.env.example` to `.env.local` and fill in an [Upstash Redis](https://console.upstash.com) REST URL + token. Without it, fETH state just falls back to a local JSON file (fine for local dev, not for a serverless deploy).

### Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build — also the type-check gate
npm run lint     # eslint
npm start        # serve the production build

node scripts/gen-registry.mjs src/lib/registry.ts   # refresh the tracked stock list
node scripts/sync-predict-abi.mjs                   # resync ABIs after a contract change
```

## Prediction market contracts

`contracts/` is a separate Hardhat 3 package — `GapMarket.sol` (real testnet ETH) and its free-play sibling `PlayMarket.sol`. Both are simple, non-custodial pari-mutuel pools: anyone can trigger lock/resolve once the time threshold passes, and the contract reads the price feed itself rather than trusting whoever calls it.

```bash
cd contracts
npm install
npm test   # Hardhat test suite
```

> **Testnet only, by design.** Robinhood Chain's mainnet has no real Chainlink stock feeds on testnet, so a mock oracle mirrors real mainnet prices. Betting is play-only (ETH here means testnet ETH) until there's a deliberate, separate decision to go to mainnet with real funds.

## Disclaimer

Prices come from public DEX and oracle data; premiums can be noisy on low-liquidity tickers. Predict markets run on Robinhood Chain **testnet** only — nothing here is investment advice.
