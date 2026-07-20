// Deployed testnet addresses for the GapMarket prediction market. Redeploying
// (contracts/ignition) produces new addresses that must be copied here by
// hand — there's no address registry.
export const GAP_MARKET_ADDRESS = "0x7c2E182234d65D3eB34ec7a19527908D13bB65b3" as const;
export const MOCK_AGGREGATOR_ADDRESS = "0x3003F158ff30135f0a9B2536D398CBA127E02b01" as const;

// Tickers with a live GapMarket — mirrors contracts/tickers.json (kept in
// sync by hand; see CLAUDE.md §10 for why deploy-mock-feeds.ts / create-markets.ts
// live in the separate contracts/ package instead of this being generated).
export const PREDICTABLE_TICKERS = [
  "NVDA",
  "AAPL",
  "TSLA",
  "AMZN",
  "MSFT",
  "GOOGL",
  "META",
  "AMD",
] as const;
