import { ImageResponse } from "next/og";
import { getPremiums } from "@/lib/premium";
import { getMarketStatus } from "@/lib/market";
import { formatPct } from "@/lib/format";

export const alt = "Implied Open — 24/7 stock prices on Robinhood Chain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 30;

const BG = "#0b0e11";
const BORDER = "#232b35";
const TEXT_PRIMARY = "#eef2f6";
const TEXT_SECONDARY = "#9aa7b4";
const TEXT_MUTED = "#64707d";
const ACCENT = "#00c805";
const DANGER = "#ff5252";

export default async function Image() {
  const rows = await getPremiums().catch(() => []);
  const market = getMarketStatus();
  const top = rows.filter((r) => r.liquid)[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: ACCENT }}>
          Implied Open
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: TEXT_PRIMARY, maxWidth: 1000 }}>
            Where does the market think stocks open next?
          </div>
          <div style={{ display: "flex", fontSize: 24, color: TEXT_SECONDARY }}>
            {market.open ? "US market is open" : `US market closed · ${market.label}`} — Robinhood stock tokens trade 24/7 on Robinhood Chain.
          </div>
          {top && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", fontSize: 22, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Biggest gap right now
              </div>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: TEXT_PRIMARY }}>
                {top.stock.ticker}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 36,
                  fontWeight: 700,
                  color: top.premiumPct >= 0 ? ACCENT : DANGER,
                }}
              >
                {formatPct(top.premiumPct)}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 24,
            fontSize: 20,
            color: TEXT_MUTED,
          }}
        >
          Live premium vs official close, every listed Robinhood stock token
        </div>
      </div>
    ),
    { ...size },
  );
}
