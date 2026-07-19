import { formatPct } from "@/lib/format";

export default function PremiumBadge({
  pct,
  size = "sm",
}: {
  pct: number;
  size?: "sm" | "lg";
}) {
  const tone =
    Math.abs(pct) < 0.15
      ? "bg-bg-hover text-text-secondary"
      : pct > 0
        ? "bg-accent/15 text-accent"
        : "bg-danger/15 text-danger";
  const sizing =
    size === "lg" ? "px-4 py-1.5 text-2xl" : "px-2 py-0.5 text-sm";
  return (
    <span
      className={`mono inline-block rounded-md font-semibold ${tone} ${sizing}`}
    >
      {formatPct(pct)}
    </span>
  );
}
