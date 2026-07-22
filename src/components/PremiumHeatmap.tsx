"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import type { HeatmapCell } from "@/lib/heatmap";
import { formatPct } from "@/lib/format";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";

/** Premium % magnitude that reaches full color saturation. */
const SATURATION_CAP = 6;
const CELL = 30;
const GAP = 4;

type SortMode = "premium" | "alpha";

function cellColor(pct: number): string {
  const intensity = Math.min(1, Math.abs(pct) / SATURATION_CAP);
  const rgb = pct >= 0 ? "0, 113, 227" : "215, 0, 21"; // --accent / --danger
  return `rgba(${rgb}, ${0.1 + intensity * 0.75})`;
}

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface TickerAvg {
  ticker: string;
  name: string;
  icon: string | null;
  avg: number;
  samples: number;
}

interface HoverInfo {
  ticker: string;
  date: string;
  cell: HeatmapCell | undefined;
  x: number;
  y: number;
}

export default function PremiumHeatmap({
  tickers,
  dates,
  cells,
}: {
  tickers: { ticker: string; name: string; icon: string | null }[];
  dates: string[];
  cells: Map<string, HeatmapCell>;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("premium");
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const averages: TickerAvg[] = useMemo(() => {
    return tickers.map(({ ticker, name, icon }) => {
      let total = 0;
      let n = 0;
      for (const date of dates) {
        const c = cells.get(`${ticker}|${date}`);
        if (c) {
          total += c.avgPremiumPct;
          n += 1;
        }
      }
      return { ticker, name, icon, avg: n > 0 ? total / n : 0, samples: n };
    });
  }, [tickers, dates, cells]);

  const sorted = useMemo(() => {
    const copy = [...averages];
    if (sortMode === "alpha") {
      copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
    } else {
      copy.sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));
    }
    return copy;
  }, [averages, sortMode]);

  const withData = averages.filter((a) => a.samples > 0);
  const bullish = withData.length > 0 ? withData.reduce((m, a) => (a.avg > m.avg ? a : m)) : null;
  const bearish = withData.length > 0 ? withData.reduce((m, a) => (a.avg < m.avg ? a : m)) : null;

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        No history yet — the snapshot cron commits one file per day. Check
        back once a few days of history have landed.
      </div>
    );
  }

  const handleEnter = (e: MouseEvent, ticker: string, date: string) => {
    setHover({ ticker, date, cell: cells.get(`${ticker}|${date}`), x: e.clientX, y: e.clientY });
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4 sm:p-5">
      {/* Summary */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Tracking</p>
          <p className="mono mt-1 text-sm text-text-primary">
            {tickers.length} tickers · {dates.length} day{dates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Most bullish avg</p>
          <p className="mono mt-1 text-sm">
            {bullish ? (
              <>
                <span className="text-text-primary">{bullish.ticker}</span>{" "}
                <span className="text-accent">{formatPct(bullish.avg)}</span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Most bearish avg</p>
          <p className="mono mt-1 text-sm">
            {bearish ? (
              <>
                <span className="text-text-primary">{bearish.ticker}</span>{" "}
                <span className="text-danger">{formatPct(bearish.avg)}</span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
      </div>

      {/* Legend + sort */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">-{SATURATION_CAP}%</span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, rgba(215,0,21,0.85), rgba(215,0,21,0.1), var(--bg-hover), rgba(0,113,227,0.1), rgba(0,113,227,0.85))`,
            }}
          />
          <span className="text-xs text-text-muted">+{SATURATION_CAP}%</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
          {(["premium", "alpha"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                sortMode === mode ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {mode === "premium" ? "Sort: biggest gap" : "Sort: A–Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: GAP }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg-secondary" />
              {dates.map((d) => (
                <th
                  key={d}
                  className="whitespace-nowrap px-0.5 text-[10px] font-normal text-text-muted"
                  style={{ width: CELL }}
                >
                  {shortDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ ticker, name, icon }) => (
              <tr key={ticker}>
                <th className="sticky left-0 z-10 bg-bg-secondary pr-2 text-left align-middle font-normal">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/stock/${ticker}`}
                      className="flex items-center gap-1.5 rounded-md py-0.5 hover:text-accent"
                    >
                      <TickerIcon ticker={ticker} icon={icon} size={18} />
                      <span className="text-xs font-medium text-text-secondary">{ticker}</span>
                    </Link>
                    {(PREDICTABLE_TICKERS as readonly string[]).includes(ticker) && (
                      <Link
                        href={`/predict/${ticker}`}
                        title={`Bet on ${ticker}`}
                        className="shrink-0 rounded-full border border-accent/30 px-1.5 py-0.5 text-[9px] font-medium text-accent transition-colors hover:bg-accent/10"
                      >
                        Predict
                      </Link>
                    )}
                  </div>
                  <span className="sr-only">{name}</span>
                </th>
                {dates.map((date) => {
                  const cell = cells.get(`${ticker}|${date}`);
                  const isHovered = hover?.ticker === ticker && hover.date === date;
                  return (
                    <td key={date} className="p-0">
                      <div
                        onMouseEnter={(e) => cell && handleEnter(e, ticker, date)}
                        onMouseMove={(e) => cell && isHovered && handleEnter(e, ticker, date)}
                        onMouseLeave={() => setHover(null)}
                        className={`rounded-md transition-transform ${isHovered ? "scale-110 ring-1 ring-text-primary/40" : ""}`}
                        style={{
                          width: CELL,
                          height: CELL,
                          background: cell ? cellColor(cell.avgPremiumPct) : "var(--bg-hover)",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating tooltip */}
      {hover?.cell && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-semibold text-text-primary">
            {hover.ticker} <span className="font-normal text-text-muted">{shortDate(hover.date)}</span>
          </p>
          <p className={`mono mt-0.5 ${hover.cell.avgPremiumPct >= 0 ? "text-accent" : "text-danger"}`}>
            {formatPct(hover.cell.avgPremiumPct)}
          </p>
          <p className="mt-0.5 text-text-muted">{hover.cell.samples} snapshots</p>
        </div>
      )}
    </div>
  );
}
